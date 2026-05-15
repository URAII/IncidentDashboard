const {
  INCIDENT_SHEET_COLUMNS,
  ATTACHMENT_SHEET_COLUMNS,
  EVIDENCE_SHEET_COLUMNS,
  SUMMARY_SHEET_COLUMNS
} = require("./sheet-export-contract");

const DEFAULT_KEY_FORMATS = Object.freeze({
  incidents: /^INC-[A-Z0-9-]+$/,
  incident_attachments: /^ATT-[A-Z0-9-]+$/,
  incident_evidence: /^EVD-[A-Z0-9-]+$/,
  dashboard_summary: /^[a-z0-9_]+$/
});

function getDefaultAppSheetSchemaProfile() {
  return {
    schema_version: "m25.appsheet_schema.v1",
    tables: {
      incidents: {
        sheet_name: "incidents",
        key_column: "incident_id",
        key_type: "text",
        key_format: DEFAULT_KEY_FORMATS.incidents.source,
        columns: [...INCIDENT_SHEET_COLUMNS]
      },
      incident_attachments: {
        sheet_name: "incident_attachments",
        key_column: "attachment_id",
        key_type: "text",
        key_format: DEFAULT_KEY_FORMATS.incident_attachments.source,
        columns: [...ATTACHMENT_SHEET_COLUMNS]
      },
      incident_evidence: {
        sheet_name: "incident_evidence",
        key_column: "evidence_id",
        key_type: "text",
        key_format: DEFAULT_KEY_FORMATS.incident_evidence.source,
        columns: [...EVIDENCE_SHEET_COLUMNS]
      },
      dashboard_summary: {
        sheet_name: "dashboard_summary",
        key_column: "metric",
        key_type: "text",
        key_format: DEFAULT_KEY_FORMATS.dashboard_summary.source,
        columns: [...SUMMARY_SHEET_COLUMNS]
      }
    }
  };
}

function checkAppSheetCompatibility({ contract, schemaProfile } = {}) {
  if (!contract || typeof contract !== "object" || !contract.sheets) {
    throw new Error("contract must include sheets object");
  }

  const profile = normalizeSchemaProfile(schemaProfile || getDefaultAppSheetSchemaProfile());
  const errors = [];
  const warnings = [];

  const schemaTableNames = Object.keys(profile.tables);
  const contractSheetNames = Object.keys(contract.sheets || {});

  for (const tableName of schemaTableNames) {
    if (!contract.sheets[tableName]) {
      errors.push({
        type: "missing_sheet",
        table: tableName,
        expected_sheet_name: tableName
      });
      continue;
    }

    const tableSchema = profile.tables[tableName];
    const sheet = contract.sheets[tableName];
    const schemaColumns = tableSchema.columns;
    const contractColumns = Array.isArray(sheet.columns) ? sheet.columns : [];

    const contractColumnSet = new Set(contractColumns);
    const schemaColumnSet = new Set(schemaColumns);

    for (const column of schemaColumns) {
      if (!contractColumnSet.has(column)) {
        errors.push({
          type: "missing_column",
          table: tableName,
          column
        });
      }
    }

    for (const column of contractColumns) {
      if (!schemaColumnSet.has(column)) {
        warnings.push({
          type: "extra_column",
          table: tableName,
          column
        });
      }
    }

    const missingKeyColumn = !contractColumnSet.has(tableSchema.key_column);
    if (missingKeyColumn) {
      errors.push({
        type: "missing_key_column",
        table: tableName,
        key_column: tableSchema.key_column
      });
      continue;
    }

    const keyRegex = new RegExp(tableSchema.key_format);
    const rows = Array.isArray(sheet.rows) ? sheet.rows : [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] || {};
      const keyValue = row[tableSchema.key_column];

      if (keyValue == null || keyValue === "") {
        errors.push({
          type: "missing_key_value",
          table: tableName,
          key_column: tableSchema.key_column,
          row_number: index + 2
        });
        continue;
      }

      if (inferType(keyValue) !== tableSchema.key_type) {
        errors.push({
          type: "key_type_mismatch",
          table: tableName,
          key_column: tableSchema.key_column,
          expected_type: tableSchema.key_type,
          actual_type: inferType(keyValue),
          row_number: index + 2
        });
        continue;
      }

      if (!keyRegex.test(String(keyValue))) {
        errors.push({
          type: "key_format_mismatch",
          table: tableName,
          key_column: tableSchema.key_column,
          expected_format: tableSchema.key_format,
          row_number: index + 2
        });
      }
    }
  }

  for (const sheetName of contractSheetNames) {
    if (!profile.tables[sheetName]) {
      warnings.push({
        type: "extra_sheet",
        table: sheetName
      });
    }
  }

  return {
    schema_version: profile.schema_version,
    compatible: errors.length === 0,
    errors,
    warnings,
    summary: {
      tables_checked: schemaTableNames.length,
      contract_sheets: contractSheetNames.length,
      error_count: errors.length,
      warning_count: warnings.length,
      status: errors.length === 0 ? "pass" : "fail"
    }
  };
}

function normalizeSchemaProfile(schemaProfile) {
  const profile = schemaProfile || {};
  const tables = profile.tables || {};

  return {
    schema_version: profile.schema_version || "m25.appsheet_schema.v1",
    tables: Object.fromEntries(
      Object.entries(tables).map(([tableName, table]) => [
        tableName,
        {
          sheet_name: table.sheet_name || tableName,
          key_column: table.key_column,
          key_type: table.key_type || "text",
          key_format: table.key_format || DEFAULT_KEY_FORMATS[tableName]?.source || "^.+$",
          columns: Array.isArray(table.columns) ? table.columns : []
        }
      ])
    )
  };
}

function inferType(value) {
  if (typeof value === "boolean") {
    return "boolean";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (typeof value === "string") {
    return "text";
  }

  return "unknown";
}

module.exports = {
  getDefaultAppSheetSchemaProfile,
  checkAppSheetCompatibility
};
