const path = require("node:path");

const { parseXlsxWorkbook, REQUIRED_SHEETS } = require("./xlsx-adapter");
const { CSV_SCHEMA_PROFILES, DEFAULT_SCHEMA_VERSION } = require("./spreadsheet-adapter");

const SHEET_TO_SCHEMA_ENTITY = {
  incidents: "incidents",
  incident_attachments: "attachments",
  incident_evidence: "evidence"
};

function checkTemplateWorkbookDrift(workbookFile, options = {}) {
  const schemaVersion = resolveSchemaVersion(options.schemaVersion);
  const workbookId = sanitizeWorkbookId(workbookFile);
  const workbook = parseXlsxWorkbook(workbookFile);
  const sheetNames = Object.keys(workbook.sheetsByName || {});
  const drifts = [];

  for (const expectedSheet of REQUIRED_SHEETS) {
    if (!sheetNames.includes(expectedSheet)) {
      drifts.push(
        createDriftEntry({
          schemaVersion,
          workbookId,
          sheetName: expectedSheet,
          driftType: "missing_sheet",
          counts: {
            required_headers: 0,
            present_headers: 0,
            missing_required_headers: 0,
            unknown_headers: 0,
            duplicate_headers: 0
          }
        })
      );
    }
  }

  for (const sheetName of sheetNames) {
    if (REQUIRED_SHEETS.includes(sheetName)) {
      continue;
    }

    drifts.push(
      createDriftEntry({
        schemaVersion,
        workbookId,
        sheetName,
        driftType: "wrong_sheet_name",
        counts: {
          required_headers: 0,
          present_headers: 0,
          missing_required_headers: 0,
          unknown_headers: 0,
          duplicate_headers: 0
        }
      })
    );
  }

  for (const sheetName of REQUIRED_SHEETS) {
    const sheetData = workbook.sheetsByName[sheetName];
    if (!sheetData) {
      continue;
    }

    const schemaEntity = SHEET_TO_SCHEMA_ENTITY[sheetName];
    const schema = CSV_SCHEMA_PROFILES[schemaVersion][schemaEntity];
    const expectedRequired = schema.requiredHeaders;
    const expectedAllowed = schema.allowedHeaders;

    const presentHeaders = (sheetData.headers || []).filter(Boolean);
    const presentHeaderSet = new Set(presentHeaders);
    const requiredHeaderSet = new Set(expectedRequired);
    const allowedHeaderSet = new Set(expectedAllowed);

    const missingRequired = expectedRequired.filter((header) => !presentHeaderSet.has(header));
    const unknownHeaders = [...presentHeaderSet].filter((header) => !allowedHeaderSet.has(header));
    const duplicateHeaders = getDuplicateHeaders(presentHeaders);

    const counts = {
      required_headers: requiredHeaderSet.size,
      present_headers: presentHeaderSet.size,
      missing_required_headers: missingRequired.length,
      unknown_headers: unknownHeaders.length,
      duplicate_headers: duplicateHeaders.length
    };

    for (const header of missingRequired) {
      drifts.push(
        createDriftEntry({
          schemaVersion,
          workbookId,
          sheetName,
          driftType: "missing_required_header",
          header,
          counts
        })
      );
    }

    for (const header of unknownHeaders) {
      drifts.push(
        createDriftEntry({
          schemaVersion,
          workbookId,
          sheetName,
          driftType: "unknown_header",
          header,
          counts
        })
      );
    }

    for (const header of duplicateHeaders) {
      drifts.push(
        createDriftEntry({
          schemaVersion,
          workbookId,
          sheetName,
          driftType: "duplicate_header",
          header,
          counts
        })
      );
    }
  }

  return {
    schema_version: schemaVersion,
    workbook_id: workbookId,
    drift_count: drifts.length,
    status: drifts.length > 0 ? "fail" : "pass",
    drifts
  };
}

function createDriftEntry({ schemaVersion, workbookId, sheetName, driftType, counts, header }) {
  const entry = {
    schema_version: schemaVersion,
    workbook_id: workbookId,
    sheet_name: sheetName,
    drift_type: driftType,
    counts,
    status: "fail"
  };

  if (header) {
    entry.header = header;
  }

  return entry;
}

function getDuplicateHeaders(headers) {
  const countsByHeader = new Map();

  for (const header of headers || []) {
    if (!header) {
      continue;
    }

    countsByHeader.set(header, (countsByHeader.get(header) || 0) + 1);
  }

  return [...countsByHeader.entries()]
    .filter(([, count]) => count > 1)
    .map(([header]) => header);
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

function sanitizeWorkbookId(workbookFile) {
  const base = path.basename(String(workbookFile || ""));
  return base.replace(/[^a-zA-Z0-9._-]/g, "_") || "unknown_workbook";
}

module.exports = {
  checkTemplateWorkbookDrift
};
