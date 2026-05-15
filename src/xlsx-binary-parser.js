const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { ingestCsvRowSets, CSV_SCHEMA_PROFILES } = require("./spreadsheet-adapter");
const { containsBlockedSecret } = require("./sanitization");

const REQUIRED_SHEETS = ["incidents", "incident_attachments", "incident_evidence"];
const DEFAULT_SCHEMA_VERSION = "v2";

const DATE_FIELDS = {
  incidents: ["reported_at", "detected_at", "created_at", "updated_at", "closed_at"],
  incident_attachments: ["image_taken_at", "sanitized_at", "created_at"],
  incident_evidence: ["collected_at", "created_at"]
};

function validateXlsxBinaryWorkbook(filePath, options = {}) {
  const resolvedPath = path.resolve(filePath);
  const schemaVersion = options.schemaVersion || DEFAULT_SCHEMA_VERSION;
  const strictSchema = options.strictSchema !== false;

  if (!Object.prototype.hasOwnProperty.call(CSV_SCHEMA_PROFILES, schemaVersion)) {
    throw new Error(`unsupported schema version: ${schemaVersion}`);
  }

  if (!fs.existsSync(resolvedPath)) {
    throw new Error("xlsx file not found");
  }

  const workbookId = sanitizeWorkbookId(resolvedPath);
  const entries = listZipEntries(resolvedPath);
  if (!entries.includes("xl/workbook.xml") || !entries.includes("xl/_rels/workbook.xml.rels")) {
    throw new Error("corrupted_workbook: missing workbook metadata entries");
  }

  const workbookXml = readZipEntryAsText(resolvedPath, "xl/workbook.xml");
  const workbookRelsXml = readZipEntryAsText(resolvedPath, "xl/_rels/workbook.xml.rels");
  const sharedStringsXml = entries.includes("xl/sharedStrings.xml")
    ? readZipEntryAsText(resolvedPath, "xl/sharedStrings.xml")
    : null;

  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const workbookSheets = parseWorkbookSheets(workbookXml);
  const workbookRelationships = parseWorkbookRelationships(workbookRelsXml);

  const sheetErrors = [];
  const sheetRows = {
    incidents: [],
    incident_attachments: [],
    incident_evidence: []
  };
  const sheetHeaders = {
    incidents: [],
    incident_attachments: [],
    incident_evidence: []
  };
  const sheetSummaries = {};

  for (const requiredSheet of REQUIRED_SHEETS) {
    const sheetMeta = workbookSheets.get(requiredSheet);
    if (!sheetMeta) {
      sheetErrors.push({ type: "missing_sheet", sheet_name: requiredSheet, workbook_id: workbookId });
      continue;
    }

    const relTarget = workbookRelationships.get(sheetMeta.relId);
    if (!relTarget) {
      sheetErrors.push({
        type: "missing_sheet_relationship",
        sheet_name: requiredSheet,
        workbook_id: workbookId
      });
      continue;
    }

    const sheetPath = normalizeWorkbookTarget(relTarget);
    if (!entries.includes(sheetPath)) {
      sheetErrors.push({
        type: "missing_sheet_xml",
        sheet_name: requiredSheet,
        workbook_id: workbookId
      });
      continue;
    }

    const sheetXml = readZipEntryAsText(resolvedPath, sheetPath);
    const parsedSheet = parseSheetRows(sheetXml, sharedStrings);
    const extracted = extractSheetRecords(requiredSheet, parsedSheet.rows, workbookId);

    sheetErrors.push(...extracted.errors);
    sheetRows[requiredSheet] = extracted.rows;
    sheetHeaders[requiredSheet] = extracted.headers;
    sheetSummaries[requiredSheet] = {
      data_rows: extracted.rows.length,
      blank_rows: extracted.blankRows,
      headers: extracted.headers.length,
      duplicate_headers: extracted.duplicateHeaders
    };
  }

  const parsedRowSets = {
    incidentsRows: sheetRows.incidents,
    attachmentsRows: sheetRows.incident_attachments,
    evidenceRows: sheetRows.incident_evidence,
    incidentsHeaders: sheetHeaders.incidents,
    attachmentsHeaders: sheetHeaders.incident_attachments,
    evidenceHeaders: sheetHeaders.incident_evidence,
    incidentsSchemaRows: sheetRows.incidents,
    attachmentsSchemaRows: sheetRows.incident_attachments,
    evidenceSchemaRows: sheetRows.incident_evidence,
    hasAttachmentsFile: true,
    hasEvidenceFile: true
  };
  const schemaProfile = CSV_SCHEMA_PROFILES[schemaVersion];
  parsedRowSets.incidentsRows = remapRowHeaders(
    parsedRowSets.incidentsRows,
    schemaProfile.incidents.headerMap
  );
  parsedRowSets.attachmentsRows = remapRowHeaders(
    parsedRowSets.attachmentsRows,
    schemaProfile.attachments.headerMap
  );
  parsedRowSets.evidenceRows = remapRowHeaders(
    parsedRowSets.evidenceRows,
    schemaProfile.evidence.headerMap
  );

  const ingestResult = ingestCsvRowSets(parsedRowSets, {
    now: options.now,
    strictSchema,
    schemaVersion
  });

  const errors = [...sheetErrors, ...ingestResult.schema_errors, ...ingestResult.join_errors];

  return {
    workbook_id: workbookId,
    workbook_path: resolvedPath,
    schema_version: ingestResult.schema_version,
    required_sheets: REQUIRED_SHEETS,
    sheet_summaries: sheetSummaries,
    rows_count: ingestResult.rows_count,
    bundles_count: ingestResult.bundles_count,
    valid_bundles_count: ingestResult.validBundles.length,
    sanitized_bundles_count: ingestResult.sanitizedBundles.length,
    schema_errors: ingestResult.schema_errors,
    join_errors: ingestResult.join_errors,
    validation_errors: ingestResult.validation_errors,
    workbook_errors: sheetErrors,
    errors,
    status: errors.length === 0 && ingestResult.validation_errors.length === 0 ? "pass" : "fail"
  };
}

function listZipEntries(filePath) {
  try {
    const output = execFileSync("unzip", ["-Z1", filePath], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
      stdio: ["ignore", "pipe", "ignore"]
    });
    return output
      .split(/\r?\n/u)
      .map((entry) => entry.trim())
      .filter(Boolean);
  } catch (error) {
    throw new Error("corrupted_workbook: unreadable zip container");
  }
}

function readZipEntryAsText(filePath, entryPath) {
  try {
    return execFileSync("unzip", ["-p", filePath, entryPath], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20,
      stdio: ["ignore", "pipe", "ignore"]
    });
  } catch (error) {
    throw new Error("corrupted_workbook: required xml entry is unreadable");
  }
}

function parseWorkbookSheets(workbookXml) {
  const sheets = new Map();
  const tagRegex = /<sheet\b([^>]*)\/?>/g;

  for (const match of workbookXml.matchAll(tagRegex)) {
    const attrs = parseAttributes(match[1]);
    const name = normalizeSheetName(attrs.name);
    if (!name || !attrs["r:id"]) {
      continue;
    }
    sheets.set(name, { relId: attrs["r:id"] });
  }

  return sheets;
}

function parseWorkbookRelationships(relXml) {
  const relMap = new Map();
  const relRegex = /<Relationship\b([^>]*)\/?>/g;

  for (const match of relXml.matchAll(relRegex)) {
    const attrs = parseAttributes(match[1]);
    if (!attrs.Id || !attrs.Target) {
      continue;
    }
    relMap.set(attrs.Id, attrs.Target);
  }

  return relMap;
}

function parseSharedStrings(sharedStringsXml) {
  if (!sharedStringsXml) {
    return [];
  }

  const values = [];
  const stringRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g;

  for (const match of sharedStringsXml.matchAll(stringRegex)) {
    const segment = match[1];
    const textParts = [];
    const textRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    for (const textMatch of segment.matchAll(textRegex)) {
      textParts.push(xmlDecode(textMatch[1]));
    }

    values.push(textParts.join(""));
  }

  return values;
}

function parseSheetRows(sheetXml, sharedStrings) {
  const rows = [];
  const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;

  for (const match of sheetXml.matchAll(rowRegex)) {
    const rowAttrs = parseAttributes(match[1]);
    const rowNumber = Number(rowAttrs.r || 0);
    const rowBody = match[2];
    const cells = new Map();

    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
    for (const cellMatch of rowBody.matchAll(cellRegex)) {
      const attrsText = cellMatch[1] || cellMatch[3] || "";
      const attrs = parseAttributes(attrsText);
      const ref = attrs.r || "";
      const column = getColumnIndex(ref);
      if (column < 0) {
        continue;
      }

      const rawBody = cellMatch[2] || "";
      const value = getCellValue(attrs, rawBody, sharedStrings);
      cells.set(column, value);
    }

    rows.push({ rowNumber, cells });
  }

  return { rows };
}

function getCellValue(attrs, body, sharedStrings) {
  const type = attrs.t || "n";
  const valueMatch = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
  const inlineMatch = body.match(/<is\b[^>]*>([\s\S]*?)<\/is>/);

  if (type === "inlineStr" && inlineMatch) {
    const textParts = [];
    for (const textMatch of inlineMatch[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) {
      textParts.push(xmlDecode(textMatch[1]));
    }
    return textParts.join("");
  }

  if (!valueMatch) {
    return null;
  }

  const raw = xmlDecode(valueMatch[1]);

  if (type === "s") {
    const index = Number(raw);
    return Number.isInteger(index) && index >= 0 && index < sharedStrings.length
      ? sharedStrings[index]
      : null;
  }

  if (type === "b") {
    return raw === "1" ? "true" : "false";
  }

  if (type === "d") {
    return raw;
  }

  if (type === "n") {
    return raw;
  }

  return raw;
}

function extractSheetRecords(sheetName, rows, workbookId) {
  const errors = [];
  const allRows = rows || [];
  const headerRow = allRows.find((row) => hasRowData(row.cells));

  if (!headerRow) {
    errors.push({
      type: "missing_header_row",
      sheet_name: sheetName,
      workbook_id: workbookId
    });
    return { headers: [], rows: [], errors, blankRows: 0, duplicateHeaders: 0 };
  }

  const sortedColumns = [...headerRow.cells.keys()].sort((a, b) => a - b);
  const headers = sortedColumns.map((columnIndex) => normalizeHeader(headerRow.cells.get(columnIndex)));

  const duplicateHeaders = countDuplicateHeaders(headers);
  if (duplicateHeaders > 0) {
    errors.push({
      type: "duplicate_header",
      sheet_name: sheetName,
      workbook_id: workbookId,
      count: duplicateHeaders
    });
  }

  const rowsOut = [];
  let blankRows = 0;

  const dataRows = allRows.filter((row) => {
    if (!row || row === headerRow) {
      return false;
    }

    if (row.rowNumber && headerRow.rowNumber) {
      return row.rowNumber > headerRow.rowNumber;
    }

    return true;
  });

  for (const row of dataRows) {
    const record = { __row_number: row.rowNumber || null };

    for (let index = 0; index < sortedColumns.length; index += 1) {
      const header = headers[index];
      if (!header) {
        continue;
      }
      const value = normalizeValue(row.cells.get(sortedColumns[index]));
      record[header] = value;
    }

    if (!hasRecordData(record)) {
      blankRows += 1;
      continue;
    }

    const dateErrors = validateDateFields(sheetName, record, workbookId);
    errors.push(...dateErrors);

    const unsafeError = detectUnsafeRow(sheetName, record, workbookId);
    if (unsafeError) {
      errors.push(unsafeError);
    }

    rowsOut.push(record);
  }

  return { headers, rows: rowsOut, errors, blankRows, duplicateHeaders };
}

function validateDateFields(sheetName, record, workbookId) {
  const errors = [];
  const fields = DATE_FIELDS[sheetName] || [];

  for (const field of fields) {
    const value = normalizeValue(record[field]);
    if (!value) {
      continue;
    }

    const normalizedDate = normalizeDateValue(value);
    if (!normalizedDate) {
      errors.push({
        type: "invalid_date_format",
        sheet_name: sheetName,
        field,
        row_number: record.__row_number,
        workbook_id: workbookId
      });
      continue;
    }

    record[field] = normalizedDate;
  }

  return errors;
}

function normalizeDateValue(value) {
  const text = String(value).trim();
  if (!text) {
    return null;
  }

  if (/^\d+(?:\.\d+)?$/u.test(text)) {
    const serial = Number(text);
    if (!Number.isFinite(serial) || serial <= 0) {
      return null;
    }

    return excelSerialToIso(serial);
  }

  if (!/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z?)?$/u.test(text)) {
    return null;
  }

  const normalized = text.includes("T") ? text : text.replace(" ", "T");
  const withZone = /Z$/u.test(normalized) ? normalized : `${normalized}Z`;
  const parsed = Date.parse(withZone);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/u.test(text)) {
    return text;
  }

  return new Date(parsed).toISOString();
}

function excelSerialToIso(serial) {
  const whole = Math.floor(serial);
  const fraction = serial - whole;

  // Excel 1900 date system with leap-year compatibility behavior.
  const base = Date.UTC(1899, 11, 31);
  const adjustedDays = whole > 59 ? whole - 1 : whole;
  const millis = base + adjustedDays * 86400000 + Math.round(fraction * 86400000);

  return new Date(millis).toISOString();
}

function detectUnsafeRow(sheetName, record, workbookId) {
  const suspiciousFields = Object.keys(record).filter((key) => key.endsWith("_sanitized"));
  for (const field of suspiciousFields) {
    const value = record[field];
    if (!value) {
      continue;
    }

    if (containsBlockedSecret(value)) {
      return {
        type: "unsafe_data",
        sheet_name: sheetName,
        field,
        row_number: record.__row_number,
        workbook_id: workbookId
      };
    }
  }

  return null;
}

function hasRowData(cellMap) {
  for (const value of cellMap.values()) {
    if (normalizeValue(value)) {
      return true;
    }
  }
  return false;
}

function hasRecordData(record) {
  return Object.entries(record).some(([key, value]) => key !== "__row_number" && normalizeValue(value));
}

function getColumnIndex(cellRef) {
  const match = String(cellRef || "").match(/^([A-Z]+)\d+$/i);
  if (!match) {
    return -1;
  }

  const letters = match[1].toUpperCase();
  let index = 0;
  for (let i = 0; i < letters.length; i += 1) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }

  return index - 1;
}

function parseAttributes(attributeText) {
  const attributes = {};
  const regex = /([A-Za-z_][A-Za-z0-9:._-]*)="([^"]*)"/g;
  for (const match of attributeText.matchAll(regex)) {
    attributes[match[1]] = xmlDecode(match[2]);
  }
  return attributes;
}

function normalizeWorkbookTarget(target) {
  const trimmed = String(target || "").replace(/^\/+/u, "");
  if (trimmed.startsWith("xl/")) {
    return trimmed;
  }

  const withoutParent = trimmed.replace(/^\.\.\//u, "");
  return `xl/${withoutParent}`;
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function remapRowHeaders(rows, headerMap) {
  if (!headerMap || Object.keys(headerMap).length === 0) {
    return rows || [];
  }

  return (rows || []).map((row) => {
    const mapped = {};
    for (const [key, value] of Object.entries(row || {})) {
      if (key === "__row_number") {
        mapped.__row_number = value;
        continue;
      }

      const nextKey = headerMap[key] || key;
      mapped[nextKey] = value;
    }
    return mapped;
  });
}

function normalizeValue(value) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text === "" ? null : text;
}

function countDuplicateHeaders(headers) {
  const counts = new Map();
  for (const header of headers) {
    if (!header) {
      continue;
    }
    counts.set(header, (counts.get(header) || 0) + 1);
  }

  let duplicates = 0;
  for (const count of counts.values()) {
    if (count > 1) {
      duplicates += 1;
    }
  }

  return duplicates;
}

function normalizeSheetName(name) {
  return String(name || "").trim().toLowerCase();
}

function sanitizeWorkbookId(filePath) {
  return path.basename(filePath).replace(/[^A-Za-z0-9._-]/g, "_");
}

function xmlDecode(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

module.exports = {
  validateXlsxBinaryWorkbook,
  REQUIRED_SHEETS,
  DEFAULT_SCHEMA_VERSION
};
