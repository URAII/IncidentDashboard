const { buildDashboardPayload, filterIncidentBundles } = require("./dashboard");
const {
  sanitizeUrl,
  sanitizePath,
  sanitizeDomain,
  sanitizeText,
  containsBlockedSecret
} = require("./sanitization");

const INCIDENT_SHEET_COLUMNS = [
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
  "sla_status",
  "sla_due_at",
  "sla_elapsed_hours",
  "sla_target_hours",
  "summary_sanitized",
  "affected_domain_sanitized",
  "affected_url_sanitized",
  "suspicious_path_sanitized",
  "detection_source",
  "has_image",
  "primary_image_url",
  "primary_image_caption",
  "primary_image_sanitized_note",
  "sanitized_attachment_count",
  "sanitized_evidence_count",
  "created_by",
  "created_at",
  "updated_by",
  "updated_at",
  "closed_at"
];

const ATTACHMENT_SHEET_COLUMNS = [
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
];

const EVIDENCE_SHEET_COLUMNS = [
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
];

const SUMMARY_SHEET_COLUMNS = ["metric", "value"];

const URL_FIELDS = new Set([
  "affected_url_sanitized",
  "suspicious_path_sanitized",
  "primary_image_url",
  "file_url_sanitized",
  "evidence_image_url",
  "evidence_url_sanitized"
]);

function buildSheetExportContract({ bundles = [], payload = null, filters = {}, now } = {}) {
  if (!Array.isArray(bundles)) {
    throw new Error("bundles must be an array");
  }

  const generatedAt = normalizeGeneratedAt(now);
  const filteredBundles = filterIncidentBundles(bundles, filters || {});
  const resolvedPayload =
    payload || buildDashboardPayload(bundles, { now: generatedAt, filters: filters || {} });

  const incidentRows = filteredBundles.map(toIncidentSheetRow);
  const attachmentRows = filteredBundles.flatMap((bundle) =>
    (bundle.attachments || [])
      .filter((attachment) => attachment && attachment.is_sanitized)
      .map((attachment) => toAttachmentSheetRow(attachment))
  );
  const evidenceRows = filteredBundles.flatMap((bundle) =>
    (bundle.evidence || [])
      .filter((evidence) => evidence && evidence.is_sanitized)
      .map((evidence) => toEvidenceSheetRow(evidence))
  );

  const summaryRows = Object.entries(resolvedPayload.summary || {}).map(([metric, value]) => ({
    metric,
    value
  }));

  const incidents = incidentRows.map((row) => shapeRow(row, INCIDENT_SHEET_COLUMNS));
  const attachments = attachmentRows.map((row) => shapeRow(row, ATTACHMENT_SHEET_COLUMNS));
  const evidence = evidenceRows.map((row) => shapeRow(row, EVIDENCE_SHEET_COLUMNS));
  const dashboardSummary = summaryRows.map((row) => shapeRow(row, SUMMARY_SHEET_COLUMNS));

  assertRowsSanitized(incidents, "incidents");
  assertRowsSanitized(attachments, "incident_attachments");
  assertRowsSanitized(evidence, "incident_evidence");

  return {
    contract_version: "m24.appsheet_google_sheet.v1",
    platform_targets: ["appsheet", "google_sheets"],
    generated_at: generatedAt,
    filters_applied: filters || {},
    sheets: {
      incidents: {
        columns: [...INCIDENT_SHEET_COLUMNS],
        rows: incidents
      },
      incident_attachments: {
        columns: [...ATTACHMENT_SHEET_COLUMNS],
        rows: attachments
      },
      incident_evidence: {
        columns: [...EVIDENCE_SHEET_COLUMNS],
        rows: evidence
      },
      dashboard_summary: {
        columns: [...SUMMARY_SHEET_COLUMNS],
        rows: dashboardSummary
      }
    },
    summary: {
      incidents: incidents.length,
      incident_attachments: attachments.length,
      incident_evidence: evidence.length,
      dashboard_summary_rows: dashboardSummary.length
    }
  };
}

function normalizeGeneratedAt(now) {
  if (!now) {
    return new Date().toISOString();
  }

  const date = new Date(now);
  if (Number.isNaN(date.getTime())) {
    throw new Error("now must be a valid ISO date");
  }

  return date.toISOString();
}

function toIncidentSheetRow(bundle) {
  const incident = bundle.incident || {};
  const sanitizedAttachments = (bundle.attachments || []).filter((item) => item && item.is_sanitized);
  const sanitizedEvidence = (bundle.evidence || []).filter((item) => item && item.is_sanitized);

  return {
    incident_id: incident.incident_id || null,
    incident_code: incident.incident_code || null,
    reported_at: incident.reported_at || null,
    detected_at: incident.detected_at || null,
    organization_id: incident.organization_id || null,
    organization_name: sanitizeText(incident.organization_name),
    health_region: sanitizeText(incident.health_region),
    province: sanitizeText(incident.province),
    agency_type: sanitizeText(incident.agency_type),
    incident_type: sanitizeText(incident.incident_type),
    incident_category: sanitizeText(incident.incident_category),
    severity: sanitizeText(incident.severity),
    priority: sanitizeText(incident.priority),
    status: sanitizeText(incident.status),
    workflow_stage: sanitizeText(incident.workflow_stage),
    sla_status: sanitizeText(incident.sla_status),
    sla_due_at: incident.sla_due_at || null,
    sla_elapsed_hours: incident.sla_elapsed_hours ?? null,
    sla_target_hours: incident.sla_target_hours ?? null,
    summary_sanitized: sanitizeText(incident.summary_sanitized),
    affected_domain_sanitized: sanitizeDomain(incident.affected_domain_sanitized),
    affected_url_sanitized: sanitizeUrl(incident.affected_url_sanitized),
    suspicious_path_sanitized: sanitizePath(incident.suspicious_path_sanitized),
    detection_source: sanitizeText(incident.detection_source),
    has_image: incident.has_image ?? false,
    primary_image_url: sanitizeUrl(incident.primary_image_url),
    primary_image_caption: sanitizeText(incident.primary_image_caption),
    primary_image_sanitized_note: sanitizeText(incident.primary_image_sanitized_note),
    sanitized_attachment_count: sanitizedAttachments.length,
    sanitized_evidence_count: sanitizedEvidence.length,
    created_by: sanitizeText(incident.created_by),
    created_at: incident.created_at || null,
    updated_by: sanitizeText(incident.updated_by),
    updated_at: incident.updated_at || null,
    closed_at: incident.closed_at || null
  };
}

function toAttachmentSheetRow(attachment) {
  return {
    attachment_id: attachment.attachment_id || null,
    incident_id: attachment.incident_id || null,
    attachment_type: sanitizeText(attachment.attachment_type),
    file_name: sanitizeText(attachment.file_name),
    file_url_sanitized: sanitizeUrl(attachment.file_url),
    file_mime_type: sanitizeText(attachment.file_mime_type),
    file_size: attachment.file_size ?? null,
    image_caption: sanitizeText(attachment.image_caption),
    image_taken_at: attachment.image_taken_at || null,
    image_source: sanitizeText(attachment.image_source),
    is_sanitized: true,
    sanitized_by: sanitizeText(attachment.sanitized_by),
    sanitized_at: attachment.sanitized_at || null,
    sanitized_note: sanitizeText(attachment.sanitized_note),
    created_by: sanitizeText(attachment.created_by),
    created_at: attachment.created_at || null
  };
}

function toEvidenceSheetRow(evidence) {
  return {
    evidence_id: evidence.evidence_id || null,
    incident_id: evidence.incident_id || null,
    evidence_type: sanitizeText(evidence.evidence_type),
    evidence_text_sanitized: sanitizeText(evidence.evidence_text_sanitized),
    evidence_image_url: sanitizeUrl(evidence.evidence_image_url),
    evidence_image_caption: sanitizeText(evidence.evidence_image_caption),
    evidence_url_sanitized: sanitizeUrl(evidence.evidence_url_sanitized),
    source_type: sanitizeText(evidence.source_type),
    confidence_score: evidence.confidence_score ?? null,
    is_sanitized: true,
    sanitized_note: sanitizeText(evidence.sanitized_note),
    collected_at: evidence.collected_at || null,
    created_by: sanitizeText(evidence.created_by),
    created_at: evidence.created_at || null
  };
}

function shapeRow(row, columns) {
  const shaped = {};

  for (const column of columns) {
    shaped[column] = row[column] ?? null;
  }

  return shaped;
}

function assertRowsSanitized(rows, sheetName) {
  for (const row of rows) {
    for (const [field, value] of Object.entries(row)) {
      if (value == null) {
        continue;
      }

      if (typeof value === "string") {
        if (containsBlockedSecret(value)) {
          throw new Error(`${sheetName}.${field} contains blocked secret-like content`);
        }

        if (URL_FIELDS.has(field) && /[?#]/.test(value)) {
          throw new Error(`${sheetName}.${field} must not contain query strings or fragments`);
        }
      }
    }
  }
}

function toGoogleSheetValueRanges(contract) {
  const ranges = {};

  for (const [sheetName, sheetData] of Object.entries(contract.sheets || {})) {
    const header = sheetData.columns || [];
    const values = [header];

    for (const row of sheetData.rows || []) {
      values.push(header.map((column) => row[column] ?? null));
    }

    ranges[sheetName] = values;
  }

  return ranges;
}

module.exports = {
  buildSheetExportContract,
  toGoogleSheetValueRanges,
  INCIDENT_SHEET_COLUMNS,
  ATTACHMENT_SHEET_COLUMNS,
  EVIDENCE_SHEET_COLUMNS,
  SUMMARY_SHEET_COLUMNS
};
