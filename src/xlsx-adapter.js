const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const {
  ingestCsvRowSets,
  CSV_SCHEMA_PROFILES,
  DEFAULT_SCHEMA_VERSION
} = require("./spreadsheet-adapter");

const REQUIRED_SHEETS = ["incidents", "incident_attachments", "incident_evidence"];

function ingestXlsxWorkbookFile(workbookFile, options = {}) {
  if (!workbookFile) {
    throw new Error("workbook file is required");
  }

  const resolvedPath = path.resolve(workbookFile);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`workbook file not found: ${path.basename(resolvedPath)}`);
  }

  const schemaVersion = resolveSchemaVersion(options.schemaVersion);
  const schemaProfile = CSV_SCHEMA_PROFILES[schemaVersion];
  const workbookData = parseXlsxWorkbook(resolvedPath);

  for (const sheetName of REQUIRED_SHEETS) {
    if (!workbookData.sheetsByName[sheetName]) {
      throw new Error(`missing required sheet: ${sheetName}`);
    }
  }

  const incidentsSheet = workbookData.sheetsByName.incidents;
  const attachmentsSheet = workbookData.sheetsByName.incident_attachments;
  const evidenceSheet = workbookData.sheetsByName.incident_evidence;

  const result = ingestCsvRowSets(
    {
      incidentsSchemaRows: incidentsSheet.rows,
      incidentsRows: remapRowHeaders(incidentsSheet.rows, schemaProfile.incidents.headerMap),
      incidentsHeaders: incidentsSheet.headers,
      attachmentsSchemaRows: attachmentsSheet.rows,
      attachmentsRows: remapRowHeaders(attachmentsSheet.rows, schemaProfile.attachments.headerMap),
      attachmentsHeaders: attachmentsSheet.headers,
      evidenceSchemaRows: evidenceSheet.rows,
      evidenceRows: remapRowHeaders(evidenceSheet.rows, schemaProfile.evidence.headerMap),
      evidenceHeaders: evidenceSheet.headers,
      hasAttachmentsFile: true,
      hasEvidenceFile: true
    },
    {
      ...options,
      schemaVersion
    }
  );

  return {
    schema_version: schemaVersion,
    source_files: {
      workbook: resolvedPath
    },
    source_sheets: {
      incidents: "incidents",
      attachments: "incident_attachments",
      evidence: "incident_evidence"
    },
    ...result
  };
}

function parseXlsxWorkbook(workbookFile) {
  const entries = listZipEntries(workbookFile);
  const entrySet = new Set(entries);

  ensureZipEntryExists(entrySet, "xl/workbook.xml", "workbook.xml is missing");
  ensureZipEntryExists(entrySet, "xl/_rels/workbook.xml.rels", "workbook relationships are missing");

  const workbookXml = readZipEntryText(workbookFile, "xl/workbook.xml");
  const workbookRelsXml = readZipEntryText(workbookFile, "xl/_rels/workbook.xml.rels");

  const relationshipsById = parseRelationships(workbookRelsXml);
  const sheets = parseWorkbookSheets(workbookXml)
    .map((sheet) => {
      const relationship = relationshipsById[sheet.relationshipId];
      if (!relationship) {
        throw new Error(`sheet relationship missing: ${sheet.name}`);
      }

      const targetEntry = resolveWorkbookTargetPath("xl", relationship.target);
      if (!entrySet.has(targetEntry)) {
        throw new Error(`worksheet entry missing: ${sheet.name}`);
      }

      return {
        ...sheet,
        targetEntry
      };
    })
    .filter((sheet) => sheet.kind === "worksheet");

  const sharedStrings = entrySet.has("xl/sharedStrings.xml")
    ? parseSharedStrings(readZipEntryText(workbookFile, "xl/sharedStrings.xml"))
    : [];

  const sheetsByName = {};
  for (const sheet of sheets) {
    const parsedSheet = parseWorksheet(
      readZipEntryText(workbookFile, sheet.targetEntry),
      sharedStrings
    );

    const normalizedName = normalizeSheetName(sheet.name);
    sheetsByName[normalizedName] = {
      name: sheet.name,
      headers: parsedSheet.headers,
      rows: parsedSheet.rows
    };
  }

  return {
    file_path: workbookFile,
    sheetsByName
  };
}

function listZipEntries(filePath) {
  try {
    const output = execFileSync("unzip", ["-Z1", filePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    throw new Error("cannot read workbook archive entries");
  }
}

function readZipEntryText(filePath, entryPath) {
  try {
    return execFileSync("unzip", ["-p", filePath, entryPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    throw new Error(`cannot read workbook entry: ${entryPath}`);
  }
}

function ensureZipEntryExists(entrySet, entryPath, message) {
  if (!entrySet.has(entryPath)) {
    throw new Error(message);
  }
}

function parseWorkbookSheets(workbookXml) {
  const sheets = [];
  const sheetTagRegex = /<sheet\b[^>]*\/?>(?:<\/sheet>)?/g;
  let match;

  while ((match = sheetTagRegex.exec(workbookXml))) {
    const attrs = parseXmlAttributes(match[0]);
    if (!attrs.name || !attrs["r:id"]) {
      continue;
    }

    sheets.push({
      name: attrs.name,
      relationshipId: attrs["r:id"],
      kind: "worksheet"
    });
  }

  return sheets;
}

function parseRelationships(xmlText) {
  const relations = {};
  const relRegex = /<Relationship\b[^>]*\/?>(?:<\/Relationship>)?/g;
  let match;

  while ((match = relRegex.exec(xmlText))) {
    const attrs = parseXmlAttributes(match[0]);
    if (!attrs.Id || !attrs.Target) {
      continue;
    }

    relations[attrs.Id] = {
      target: attrs.Target,
      type: attrs.Type || ""
    };
  }

  return relations;
}

function parseWorksheet(xmlText, sharedStrings) {
  const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  const rows = [];
  let rowMatch;

  while ((rowMatch = rowRegex.exec(xmlText))) {
    const rowAttrs = parseXmlAttributes(rowMatch[1] || "");
    const rowNumber = Number.parseInt(rowAttrs.r || String(rows.length + 1), 10);
    const cellValuesByIndex = parseRowCells(rowMatch[2], sharedStrings);

    const maxIndex = Math.max(...cellValuesByIndex.keys(), -1);
    const dense = [];
    for (let index = 0; index <= maxIndex; index += 1) {
      dense[index] = cellValuesByIndex.get(index) ?? null;
    }

    if (dense.some((value) => normalizeValue(value) !== null)) {
      rows.push({ rowNumber, values: dense });
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].values.map((header) => normalizeHeader(header));
  const records = rows.slice(1).map((row) => {
    const record = { __row_number: row.rowNumber };

    headers.forEach((header, columnIndex) => {
      if (!header) {
        return;
      }
      record[header] = normalizeValue(row.values[columnIndex]);
    });

    return record;
  });

  return { headers, rows: records };
}

function parseRowCells(rowXml, sharedStrings) {
  const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
  const values = new Map();
  let nextColumnIndex = 0;
  let cellMatch;

  while ((cellMatch = cellRegex.exec(rowXml))) {
    const attrs = parseXmlAttributes(cellMatch[1] || "");
    const explicitColumn = getColumnIndexFromCellRef(attrs.r);
    const columnIndex = explicitColumn != null ? explicitColumn : nextColumnIndex;
    const cellType = attrs.t || "";
    const rawValue = extractCellValue(cellMatch[2], cellType, sharedStrings);

    values.set(columnIndex, rawValue);
    nextColumnIndex = columnIndex + 1;
  }

  return values;
}

function extractCellValue(cellXml, cellType, sharedStrings) {
  if (cellType === "inlineStr") {
    const textParts = [];
    const textRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let textMatch;
    while ((textMatch = textRegex.exec(cellXml))) {
      textParts.push(decodeXmlEntities(textMatch[1]));
    }
    return textParts.join("");
  }

  const valueMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
  if (!valueMatch) {
    return null;
  }

  const value = decodeXmlEntities(valueMatch[1]);

  if (cellType === "s") {
    const index = Number.parseInt(value, 10);
    if (!Number.isInteger(index) || index < 0 || index >= sharedStrings.length) {
      return null;
    }
    return sharedStrings[index];
  }

  if (cellType === "b") {
    return value === "1" ? "true" : "false";
  }

  return value;
}

function parseSharedStrings(xmlText) {
  const items = [];
  const itemRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match;

  while ((match = itemRegex.exec(xmlText))) {
    const textParts = [];
    const textRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let textMatch;

    while ((textMatch = textRegex.exec(match[1]))) {
      textParts.push(decodeXmlEntities(textMatch[1]));
    }

    items.push(textParts.join(""));
  }

  return items;
}

function parseXmlAttributes(source) {
  const attrs = {};
  const attrRegex = /([A-Za-z_:][A-Za-z0-9_.:-]*)="([^"]*)"/g;
  let match;

  while ((match = attrRegex.exec(source))) {
    attrs[match[1]] = decodeXmlEntities(match[2]);
  }

  return attrs;
}

function decodeXmlEntities(text) {
  return String(text || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function resolveWorkbookTargetPath(baseDir, target) {
  const normalizedTarget = String(target || "").replace(/^\/+/, "");
  if (normalizedTarget.startsWith("xl/")) {
    return normalizedTarget;
  }

  const resolved = path.posix.normalize(path.posix.join(baseDir, normalizedTarget));
  return resolved;
}

function normalizeSheetName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function normalizeValue(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === "" ? null : normalized;
}

function getColumnIndexFromCellRef(cellRef) {
  if (!cellRef) {
    return null;
  }

  const refMatch = String(cellRef).match(/^([A-Za-z]+)\d+$/);
  if (!refMatch) {
    return null;
  }

  const columnLabel = refMatch[1].toUpperCase();
  let index = 0;
  for (let i = 0; i < columnLabel.length; i += 1) {
    index = index * 26 + (columnLabel.charCodeAt(i) - 64);
  }

  return index - 1;
}

function resolveSchemaVersion(schemaVersion) {
  if (!schemaVersion) {
    return DEFAULT_SCHEMA_VERSION;
  }

  const normalized = String(schemaVersion).trim().toLowerCase();
  if (!CSV_SCHEMA_PROFILES[normalized]) {
    throw new Error(`unsupported schema version: ${normalized}`);
  }

  return normalized;
}

function remapRowHeaders(rows, headerMap = {}) {
  if (!headerMap || Object.keys(headerMap).length === 0) {
    return rows || [];
  }

  return (rows || []).map((row) => {
    const mapped = {};

    for (const [key, value] of Object.entries(row)) {
      if (key === "__row_number") {
        mapped.__row_number = value;
        continue;
      }

      const targetKey = headerMap[key] || key;
      mapped[targetKey] = value;
    }

    return mapped;
  });
}

module.exports = {
  ingestXlsxWorkbookFile,
  parseXlsxWorkbook,
  REQUIRED_SHEETS
};
