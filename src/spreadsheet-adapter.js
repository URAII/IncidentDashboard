const fs = require("node:fs");
const path = require("node:path");

const { prepareIncidentDataset } = require("./validation");

const BOOLEAN_TRUE_VALUES = new Set(["true", "1", "yes", "y"]);
const BOOLEAN_FALSE_VALUES = new Set(["false", "0", "no", "n"]);
const DEFAULT_SCHEMA_VERSION = "v1";
const CSV_SCHEMA_PROFILES = {
  v1: {
    incidents: {
      requiredHeaders: [
        "incident_id",
        "incident_code",
        "reported_at",
        "organization_id",
        "incident_type",
        "severity",
        "workflow_stage",
        "summary_sanitized",
        "detection_source"
      ],
      allowedHeaders: [
        "incident_id",
        "incident_code",
        "reported_at",
        "detected_at",
        "organization_id",
        "organization_name",
        "health_region",
        "province",
        "agency_type",
        "incident_type",
        "incident_category",
        "severity",
        "priority",
        "status",
        "workflow_stage",
        "assigned_team",
        "assigned_to",
        "summary_sanitized",
        "affected_domain_sanitized",
        "affected_url_sanitized",
        "suspicious_path_sanitized",
        "detection_source",
        "has_image",
        "primary_image_url",
        "primary_image_caption",
        "primary_image_sanitized_note",
        "created_by",
        "created_at",
        "updated_by",
        "updated_at",
        "closed_at"
      ],
      requiredFields: [
        "incident_id",
        "incident_code",
        "reported_at",
        "organization_id",
        "incident_type",
        "severity",
        "workflow_stage",
        "summary_sanitized",
        "detection_source"
      ],
      headerMap: {}
    },
    attachments: {
      requiredHeaders: [
        "attachment_id",
        "incident_id",
        "attachment_type",
        "file_name",
        "file_url",
        "file_mime_type",
        "created_by",
        "created_at"
      ],
      allowedHeaders: [
        "attachment_id",
        "incident_id",
        "attachment_type",
        "file_name",
        "file_url",
        "file_mime_type",
        "file_size",
        "image_caption",
        "image_taken_at",
        "image_source",
        "is_sanitized",
        "sanitized_by",
        "sanitized_at",
        "sanitized_note",
        "created_by",
        "created_at"
      ],
      requiredFields: [
        "attachment_id",
        "incident_id",
        "attachment_type",
        "file_name",
        "file_url",
        "file_mime_type",
        "created_by",
        "created_at"
      ],
      headerMap: {}
    },
    evidence: {
      requiredHeaders: [
        "evidence_id",
        "incident_id",
        "evidence_type",
        "source_type",
        "confidence_score",
        "is_sanitized",
        "created_by",
        "created_at"
      ],
      allowedHeaders: [
        "evidence_id",
        "incident_id",
        "evidence_type",
        "evidence_text_sanitized",
        "evidence_image_url",
        "evidence_image_caption",
        "evidence_url_sanitized",
        "source_type",
        "confidence_score",
        "is_sanitized",
        "sanitized_note",
        "collected_at",
        "created_by",
        "created_at"
      ],
      requiredFields: [
        "evidence_id",
        "incident_id",
        "evidence_type",
        "source_type",
        "confidence_score",
        "is_sanitized",
        "created_by",
        "created_at"
      ],
      headerMap: {}
    }
  },
  v2: {
    incidents: {
      requiredHeaders: [
        "incident_id",
        "incident_code",
        "reported_at",
        "organization_id",
        "incident_type",
        "severity",
        "workflow_stage",
        "summary_text_sanitized",
        "detection_channel"
      ],
      allowedHeaders: [
        "incident_id",
        "incident_code",
        "reported_at",
        "detected_at",
        "organization_id",
        "organization_name",
        "health_region",
        "province",
        "agency_type",
        "incident_type",
        "incident_category",
        "severity",
        "priority",
        "status",
        "workflow_stage",
        "assigned_team",
        "assigned_to",
        "summary_text_sanitized",
        "affected_domain_sanitized",
        "affected_url_sanitized",
        "suspicious_path_sanitized",
        "detection_channel",
        "has_image",
        "primary_image_url",
        "primary_image_caption",
        "primary_image_sanitized_note",
        "created_by",
        "created_at",
        "updated_by",
        "updated_at",
        "closed_at"
      ],
      requiredFields: [
        "incident_id",
        "incident_code",
        "reported_at",
        "organization_id",
        "incident_type",
        "severity",
        "workflow_stage",
        "summary_text_sanitized",
        "detection_channel"
      ],
      headerMap: {
        summary_text_sanitized: "summary_sanitized",
        detection_channel: "detection_source"
      }
    },
    attachments: {
      requiredHeaders: [
        "attachment_id",
        "incident_id",
        "attachment_type",
        "file_name",
        "file_url_sanitized",
        "file_mime_type",
        "created_by",
        "created_at"
      ],
      allowedHeaders: [
        "attachment_id",
        "incident_id",
        "attachment_type",
        "file_name",
        "file_url_sanitized",
        "file_mime_type",
        "file_size",
        "image_caption",
        "image_taken_at",
        "image_source",
        "is_sanitized",
        "sanitized_by",
        "sanitized_at",
        "sanitized_note",
        "created_by",
        "created_at"
      ],
      requiredFields: [
        "attachment_id",
        "incident_id",
        "attachment_type",
        "file_name",
        "file_url_sanitized",
        "file_mime_type",
        "created_by",
        "created_at"
      ],
      headerMap: {
        file_url_sanitized: "file_url"
      }
    },
    evidence: {
      requiredHeaders: [
        "evidence_id",
        "incident_id",
        "evidence_type",
        "source_type",
        "confidence_score",
        "is_sanitized",
        "created_by",
        "created_at"
      ],
      allowedHeaders: [
        "evidence_id",
        "incident_id",
        "evidence_type",
        "evidence_text_note_sanitized",
        "evidence_image_url",
        "evidence_image_caption",
        "evidence_url_link_sanitized",
        "source_type",
        "confidence_score",
        "is_sanitized",
        "sanitized_note",
        "collected_at",
        "created_by",
        "created_at"
      ],
      requiredFields: [
        "evidence_id",
        "incident_id",
        "evidence_type",
        "source_type",
        "confidence_score",
        "is_sanitized",
        "created_by",
        "created_at"
      ],
      headerMap: {
        evidence_text_note_sanitized: "evidence_text_sanitized",
        evidence_url_link_sanitized: "evidence_url_sanitized"
      }
    }
  }
};
const MULTIFILE_SCHEMA = CSV_SCHEMA_PROFILES[DEFAULT_SCHEMA_VERSION];

function parseCsvText(csvText, options = {}) {
  const text = String(csvText ?? "");
  const rows = [];

  if (!text.trim()) {
    return options.withMetadata ? { headers: [], rows } : rows;
  }

  let currentField = "";
  let currentRow = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        currentField += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      currentRow.push(currentField);
      if (currentRow.some((value) => String(value).trim() !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += char;
  }

  currentRow.push(currentField);
  if (currentRow.some((value) => String(value).trim() !== "")) {
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return options.withMetadata ? { headers: [], rows: [] } : [];
  }

  const headers = rows[0].map((header) => normalizeHeader(header));
  const records = rows.slice(1).map((row, rowIndex) => {
    const record = { __row_number: rowIndex + 2 };

    headers.forEach((header, columnIndex) => {
      if (!header) {
        return;
      }

      record[header] = normalizeValue(row[columnIndex]);
    });

    return record;
  });

  if (options.withMetadata) {
    return { headers, rows: records };
  }

  return records;
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

function parseBoolean(value, fallback = undefined) {
  if (value == null) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (BOOLEAN_TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (BOOLEAN_FALSE_VALUES.has(normalized)) {
    return false;
  }

  return fallback;
}

function parseNumber(value, fallback = undefined) {
  if (value == null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstValue(row, keys, fallback = null) {
  for (const key of keys) {
    if (row[key] != null) {
      return row[key];
    }
  }

  return fallback;
}

function mapIncidentRecord(row, options = {}) {
  const createdBy = row.created_by || options.defaultCreatedBy || "spreadsheet.import";
  const createdAt = row.created_at || options.defaultCreatedAt || new Date().toISOString();

  return {
    incident_id: row.incident_id,
    incident_code: row.incident_code,
    reported_at: row.reported_at,
    detected_at: row.detected_at,
    organization_id: row.organization_id,
    organization_name: row.organization_name,
    health_region: row.health_region,
    province: row.province,
    agency_type: row.agency_type,
    incident_type: row.incident_type,
    incident_category: row.incident_category,
    severity: row.severity,
    priority: row.priority,
    status: row.status,
    workflow_stage: row.workflow_stage || "New",
    assigned_team: row.assigned_team,
    assigned_to: row.assigned_to,
    summary_sanitized: row.summary_sanitized,
    affected_domain_sanitized: row.affected_domain_sanitized,
    affected_url_sanitized: row.affected_url_sanitized,
    suspicious_path_sanitized: row.suspicious_path_sanitized,
    detection_source: row.detection_source || "Agency Report",
    has_image: parseBoolean(row.has_image),
    primary_image_url: row.primary_image_url,
    primary_image_caption: row.primary_image_caption,
    primary_image_sanitized_note: row.primary_image_sanitized_note,
    created_by: createdBy,
    created_at: createdAt,
    updated_by: row.updated_by,
    updated_at: row.updated_at,
    closed_at: row.closed_at
  };
}

function mapAttachmentRow(row, context) {
  return {
    attachment_id: row.attachment_id || `ATT-${context.incident.incident_id || row.__row_number}`,
    incident_id: context.incident.incident_id,
    attachment_type: row.attachment_type || "other",
    file_name: row.file_name || `${context.incident.incident_code || "incident"}-attachment`,
    file_url: row.file_url,
    file_mime_type: row.file_mime_type,
    file_size: parseNumber(row.file_size, 0),
    image_caption: row.image_caption,
    image_taken_at: row.image_taken_at,
    image_source: row.image_source,
    is_sanitized: parseBoolean(firstValue(row, ["attachment_is_sanitized", "is_sanitized"]), true),
    sanitized_by: firstValue(row, ["attachment_sanitized_by", "sanitized_by"]),
    sanitized_at: firstValue(row, ["attachment_sanitized_at", "sanitized_at"]),
    sanitized_note: firstValue(row, ["attachment_sanitized_note", "sanitized_note"]),
    created_by: firstValue(row, ["attachment_created_by", "created_by"], context.createdBy),
    created_at: firstValue(row, ["attachment_created_at", "created_at"], context.createdAt)
  };
}

function mapEvidenceRow(row, context) {
  return {
    evidence_id: row.evidence_id || `EVD-${context.incident.incident_id || row.__row_number}`,
    incident_id: context.incident.incident_id,
    evidence_type: row.evidence_type || inferEvidenceType(row),
    evidence_text_sanitized: row.evidence_text_sanitized,
    evidence_image_url: row.evidence_image_url,
    evidence_image_caption: row.evidence_image_caption,
    evidence_url_sanitized: row.evidence_url_sanitized,
    source_type: row.source_type || "spreadsheet",
    confidence_score: parseNumber(row.confidence_score, 0),
    is_sanitized: parseBoolean(firstValue(row, ["evidence_is_sanitized", "is_sanitized"]), true),
    sanitized_note: firstValue(row, ["evidence_sanitized_note", "sanitized_note"]),
    collected_at: row.collected_at,
    created_by: firstValue(row, ["evidence_created_by", "created_by"], context.createdBy),
    created_at: firstValue(row, ["evidence_created_at", "created_at"], context.createdAt)
  };
}

function mapIncidentRowToBundle(row, options = {}) {
  const incident = mapIncidentRecord(row, options);
  const context = {
    incident,
    createdBy: incident.created_by,
    createdAt: incident.created_at
  };

  return {
    incident,
    attachments: mapAttachmentFromRow(row, context),
    evidence: mapEvidenceFromRow(row, context)
  };
}

function mapAttachmentFromRow(row, context) {
  const hasAttachmentData =
    row.attachment_id ||
    row.attachment_type ||
    row.file_url ||
    row.file_name ||
    row.file_mime_type;

  if (!hasAttachmentData) {
    return [];
  }

  return [mapAttachmentRow(row, context)];
}

function mapEvidenceFromRow(row, context) {
  const hasEvidenceData =
    row.evidence_id ||
    row.evidence_type ||
    row.evidence_text_sanitized ||
    row.evidence_url_sanitized ||
    row.evidence_image_url;

  if (!hasEvidenceData) {
    return [];
  }

  return [mapEvidenceRow(row, context)];
}

function inferEvidenceType(row) {
  if (row.evidence_image_url) {
    return "image";
  }

  if (row.evidence_url_sanitized) {
    return "url";
  }

  return "text";
}

function buildBundlesFromRows(rows, options = {}) {
  return (rows || []).map((row) => mapIncidentRowToBundle(row, options));
}

function sanitizeBundlesForOutput(validBundles) {
  return (validBundles || []).map((bundle) => ({
    incident: { ...bundle.incident },
    attachments: bundle.attachments.filter((attachment) => attachment.is_sanitized),
    evidence: bundle.evidence.filter((item) => item.is_sanitized)
  }));
}

function shapeValidationErrors(validationErrors) {
  return (validationErrors || []).map((entry) => ({
    type: "validation_error",
    incident_id: entry.incident_id,
    errors: entry.errors
  }));
}

function ingestCsvRows(rows, options = {}) {
  const bundles = buildBundlesFromRows(rows, options);
  const validation = prepareIncidentDataset(bundles, options);

  return {
    rows_count: rows.length,
    bundles_count: bundles.length,
    bundles,
    validBundles: validation.validBundles,
    sanitizedBundles: sanitizeBundlesForOutput(validation.validBundles),
    schema_errors: [],
    join_errors: [],
    validation_errors: validation.errors,
    errors: validation.errors
  };
}

function ingestCsvText(csvText, options = {}) {
  const rows = parseCsvText(csvText);
  return ingestCsvRows(rows, options);
}

function ingestCsvFile(filePath, options = {}) {
  const resolvedPath = path.resolve(filePath);
  const csvText = fs.readFileSync(resolvedPath, "utf8");

  return {
    file_path: resolvedPath,
    ...ingestCsvText(csvText, options)
  };
}

function ingestCsvRowSets(rowSets, options = {}) {
  const schemaVersion = resolveSchemaVersion(options.schemaVersion);
  const schemaProfile = getSchemaProfile(schemaVersion);
  const incidentsSchemaRows = rowSets.incidentsSchemaRows || rowSets.incidentsRows || [];
  const attachmentsSchemaRows = rowSets.attachmentsSchemaRows || rowSets.attachmentsRows || [];
  const evidenceSchemaRows = rowSets.evidenceSchemaRows || rowSets.evidenceRows || [];
  const incidentsRows = rowSets.incidentsRows || [];
  const attachmentsRows = rowSets.attachmentsRows || [];
  const evidenceRows = rowSets.evidenceRows || [];
  const incidentsHeaders = rowSets.incidentsHeaders || [];
  const attachmentsHeaders = rowSets.attachmentsHeaders || [];
  const evidenceHeaders = rowSets.evidenceHeaders || [];
  const schemaErrors = options.strictSchema
    ? validateMultiFileSchema({
        schemaVersion,
        schemaProfile,
        incidentsRows: incidentsSchemaRows,
        attachmentsRows: attachmentsSchemaRows,
        evidenceRows: evidenceSchemaRows,
        incidentsHeaders,
        attachmentsHeaders,
        evidenceHeaders,
        hasAttachmentsFile: rowSets.hasAttachmentsFile,
        hasEvidenceFile: rowSets.hasEvidenceFile
      })
    : [];

  const joinResult = joinRowsByIncidentId({ incidentsRows, attachmentsRows, evidenceRows }, options);
  const validation = prepareIncidentDataset(joinResult.bundles, options);

  return {
    rows_count: {
      incidents: incidentsRows.length,
      attachments: attachmentsRows.length,
      evidence: evidenceRows.length
    },
    bundles_count: joinResult.bundles.length,
    bundles: joinResult.bundles,
    validBundles: validation.validBundles,
    sanitizedBundles: sanitizeBundlesForOutput(validation.validBundles),
    schema_version: schemaVersion,
    schema_errors: schemaErrors,
    join_errors: joinResult.errors,
    validation_errors: validation.errors,
    errors: [...schemaErrors, ...joinResult.errors, ...shapeValidationErrors(validation.errors)]
  };
}

function validateMultiFileSchema({
  schemaVersion,
  schemaProfile,
  incidentsRows,
  attachmentsRows,
  evidenceRows,
  incidentsHeaders,
  attachmentsHeaders,
  evidenceHeaders,
  hasAttachmentsFile,
  hasEvidenceFile
}) {
  const errors = [];

  errors.push(
    ...validateEntitySchema({
      entity: "incident",
      schema: schemaProfile.incidents,
      schemaVersion,
      headers: incidentsHeaders,
      rows: incidentsRows
    })
  );

  if (hasAttachmentsFile) {
    errors.push(
      ...validateEntitySchema({
        entity: "attachment",
        schema: schemaProfile.attachments,
        schemaVersion,
        headers: attachmentsHeaders,
        rows: attachmentsRows
      })
    );
  }

  if (hasEvidenceFile) {
    errors.push(
      ...validateEntitySchema({
        entity: "evidence",
        schema: schemaProfile.evidence,
        schemaVersion,
        headers: evidenceHeaders,
        rows: evidenceRows
      })
    );
  }

  return errors;
}

function validateEntitySchema({ entity, schema, schemaVersion, headers, rows }) {
  const errors = [];
  const normalizedHeaders = new Set((headers || []).filter(Boolean));
  const allowedHeaders = new Set(schema.allowedHeaders);

  for (const requiredHeader of schema.requiredHeaders) {
    if (!normalizedHeaders.has(requiredHeader)) {
      errors.push({
        type: "missing_required_header",
        schema_version: schemaVersion,
        entity,
        header: requiredHeader
      });
    }
  }

  for (const header of normalizedHeaders) {
    if (!allowedHeaders.has(header)) {
      errors.push({
        type: "unknown_header",
        schema_version: schemaVersion,
        entity,
        header
      });
    }
  }

  for (const row of rows || []) {
    for (const field of schema.requiredFields) {
      if (normalizeValue(row[field])) {
        continue;
      }

      errors.push({
        type: "missing_required_field",
        schema_version: schemaVersion,
        entity,
        field,
        row_number: row.__row_number || null
      });
    }
  }

  return errors;
}

function joinRowsByIncidentId(rowSets, options = {}) {
  const incidentsRows = rowSets.incidentsRows || [];
  const attachmentsRows = rowSets.attachmentsRows || [];
  const evidenceRows = rowSets.evidenceRows || [];
  const errors = [];

  const incidentRowsById = new Map();
  const duplicateIncidentIds = new Set();

  for (const row of incidentsRows) {
    const incidentId = normalizeValue(row.incident_id);

    if (!incidentId) {
      errors.push({
        type: "missing_incident_id",
        entity: "incident",
        row_number: row.__row_number || null
      });
      continue;
    }

    if (incidentRowsById.has(incidentId)) {
      duplicateIncidentIds.add(incidentId);
      continue;
    }

    incidentRowsById.set(incidentId, row);
  }

  for (const duplicateId of duplicateIncidentIds) {
    const rowNumbers = incidentsRows
      .filter((row) => normalizeValue(row.incident_id) === duplicateId)
      .map((row) => row.__row_number || null);

    errors.push({
      type: "duplicate_incident_id",
      incident_id: duplicateId,
      row_numbers: rowNumbers
    });

    incidentRowsById.delete(duplicateId);
  }

  const attachmentRowsByIncidentId = groupChildRowsByIncidentId({
    childRows: attachmentsRows,
    entity: "attachment",
    validIncidentIds: incidentRowsById,
    errors
  });

  const evidenceRowsByIncidentId = groupChildRowsByIncidentId({
    childRows: evidenceRows,
    entity: "evidence",
    validIncidentIds: incidentRowsById,
    errors
  });

  const bundles = [];

  for (const [incidentId, incidentRow] of incidentRowsById.entries()) {
    const incident = mapIncidentRecord(incidentRow, options);
    const context = {
      incident,
      createdBy: incident.created_by,
      createdAt: incident.created_at
    };

    const attachments = (attachmentRowsByIncidentId.get(incidentId) || []).map((row) =>
      mapAttachmentRow(row, context)
    );
    const evidence = (evidenceRowsByIncidentId.get(incidentId) || []).map((row) =>
      mapEvidenceRow(row, context)
    );

    bundles.push({ incident, attachments, evidence });
  }

  return { bundles, errors };
}

function groupChildRowsByIncidentId({ childRows, entity, validIncidentIds, errors }) {
  const grouped = new Map();

  for (const row of childRows || []) {
    const incidentId = normalizeValue(row.incident_id);

    if (!incidentId) {
      errors.push({
        type: "missing_incident_id",
        entity,
        row_number: row.__row_number || null
      });
      continue;
    }

    if (!validIncidentIds.has(incidentId)) {
      errors.push({
        type: "orphan_child",
        entity,
        incident_id: incidentId,
        row_number: row.__row_number || null
      });
      continue;
    }

    if (!grouped.has(incidentId)) {
      grouped.set(incidentId, []);
    }

    grouped.get(incidentId).push(row);
  }

  return grouped;
}

function parseCsvFile(filePath) {
  const resolvedPath = path.resolve(filePath);
  const csvText = fs.readFileSync(resolvedPath, "utf8");
  const parsed = parseCsvText(csvText, { withMetadata: true });

  return {
    file_path: resolvedPath,
    headers: parsed.headers,
    rows: parsed.rows
  };
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

function getSchemaProfile(schemaVersion) {
  const profile = CSV_SCHEMA_PROFILES[schemaVersion];
  if (!profile) {
    throw new Error(`schema profile not found: ${schemaVersion}`);
  }

  return profile;
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

function ingestCsvFiles(files, options = {}) {
  if (!files || !files.incidentsFile) {
    throw new Error("incidentsFile is required for multi-file CSV import");
  }

  const schemaVersion = resolveSchemaVersion(options.schemaVersion);
  const schemaProfile = getSchemaProfile(schemaVersion);
  const incidents = parseCsvFile(files.incidentsFile);
  const attachments = files.attachmentsFile ? parseCsvFile(files.attachmentsFile) : null;
  const evidence = files.evidenceFile ? parseCsvFile(files.evidenceFile) : null;

  const result = ingestCsvRowSets(
    {
      incidentsSchemaRows: incidents.rows,
      incidentsRows: remapRowHeaders(incidents.rows, schemaProfile.incidents.headerMap),
      incidentsHeaders: incidents.headers,
      attachmentsSchemaRows: attachments?.rows || [],
      attachmentsRows: remapRowHeaders(
        attachments?.rows || [],
        schemaProfile.attachments.headerMap
      ),
      attachmentsHeaders: attachments?.headers || [],
      evidenceSchemaRows: evidence?.rows || [],
      evidenceRows: remapRowHeaders(evidence?.rows || [], schemaProfile.evidence.headerMap),
      evidenceHeaders: evidence?.headers || [],
      hasAttachmentsFile: Boolean(attachments),
      hasEvidenceFile: Boolean(evidence)
    },
    {
      ...options,
      schemaVersion
    }
  );

  return {
    schema_version: schemaVersion,
    source_files: {
      incidents: incidents.file_path,
      attachments: attachments?.file_path || null,
      evidence: evidence?.file_path || null
    },
    ...result
  };
}

module.exports = {
  parseCsvText,
  parseCsvFile,
  mapIncidentRowToBundle,
  buildBundlesFromRows,
  ingestCsvRows,
  ingestCsvText,
  ingestCsvFile,
  ingestCsvRowSets,
  joinRowsByIncidentId,
  ingestCsvFiles,
  MULTIFILE_SCHEMA,
  CSV_SCHEMA_PROFILES,
  DEFAULT_SCHEMA_VERSION
};
