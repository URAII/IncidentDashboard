const { MASTER_DATA, findOrganizationById, isAllowedValue } = require("./master-data");
const {
  sanitizeUrl,
  sanitizePath,
  sanitizeDomain,
  sanitizeText,
  containsBlockedSecret,
  normalizeWhitespace
} = require("./sanitization");
const { calculateSlaStatus } = require("./sla");
const { getStatusForWorkflowStage } = require("./workflow");

const ALLOWED_ATTACHMENT_TYPES = ["image", "document", "log", "other"];
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/json"
];
const ALLOWED_EVIDENCE_TYPES = ["text", "url", "image", "log"];

function createError(field, message) {
  return { field, message };
}

function toIsoDate(value, field, errors, { required = false } = {}) {
  if (value == null || value === "") {
    if (required) {
      errors.push(createError(field, `${field} is required`));
    }
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push(createError(field, `${field} must be a valid date`));
    return null;
  }

  return date.toISOString();
}

function validateRequiredString(value, field, errors) {
  if (value == null || normalizeWhitespace(value) === "") {
    errors.push(createError(field, `${field} is required`));
    return null;
  }

  return normalizeWhitespace(value);
}

function validateSanitizedNarrative(value, field, errors, { required = false } = {}) {
  if (value == null || value === "") {
    if (required) {
      errors.push(createError(field, `${field} is required`));
    }
    return null;
  }

  if (containsBlockedSecret(value)) {
    errors.push(
      createError(field, `${field} contains blocked secret-like content and must be sanitized first`)
    );
    return null;
  }

  const sanitized = sanitizeText(value);
  if (!sanitized) {
    if (required) {
      errors.push(createError(field, `${field} is required`));
    }
    return null;
  }

  return sanitized;
}

function validateUrlField(value, field, errors, { required = false } = {}) {
  if (value == null || value === "") {
    if (required) {
      errors.push(createError(field, `${field} is required`));
    }
    return null;
  }

  const sanitized = sanitizeUrl(value);
  if (!sanitized) {
    errors.push(createError(field, `${field} must be a valid URL or safe path`));
    return null;
  }

  return sanitized;
}

function validateIncident(incidentInput, options = {}) {
  const errors = [];
  const masterData = options.masterData || MASTER_DATA;
  const incident = incidentInput || {};
  const attachments = options.attachments || [];
  const evidence = options.evidence || [];

  const incidentId = validateRequiredString(incident.incident_id, "incident_id", errors);
  const incidentCode = validateRequiredString(incident.incident_code, "incident_code", errors);
  const reportedAt = toIsoDate(incident.reported_at, "reported_at", errors, { required: true });
  const detectedAt = toIsoDate(incident.detected_at, "detected_at", errors);
  const createdAt = toIsoDate(incident.created_at, "created_at", errors, { required: true });
  const updatedAt = toIsoDate(incident.updated_at, "updated_at", errors) || createdAt;
  const closedAt = toIsoDate(incident.closed_at, "closed_at", errors);
  const createdBy = validateRequiredString(incident.created_by, "created_by", errors);
  const updatedBy = incident.updated_by ? normalizeWhitespace(incident.updated_by) : createdBy;
  const organizationId = validateRequiredString(incident.organization_id, "organization_id", errors);
  const organization = findOrganizationById(organizationId, masterData);

  if (!organization) {
    errors.push(createError("organization_id", "organization_id does not exist in master data"));
  }

  const incidentType = validateRequiredString(incident.incident_type, "incident_type", errors);
  const severity = validateRequiredString(incident.severity, "severity", errors);
  const workflowStage = validateRequiredString(
    incident.workflow_stage,
    "workflow_stage",
    errors
  );
  const detectionSource = validateRequiredString(
    incident.detection_source,
    "detection_source",
    errors
  );

  if (incidentType && !isAllowedValue("incident_types", incidentType, masterData)) {
    errors.push(createError("incident_type", "incident_type is not allowed"));
  }

  if (severity && !isAllowedValue("severities", severity, masterData)) {
    errors.push(createError("severity", "severity is not allowed"));
  }

  if (workflowStage && !isAllowedValue("workflow_stages", workflowStage, masterData)) {
    errors.push(createError("workflow_stage", "workflow_stage is not allowed"));
  }

  if (detectionSource && !isAllowedValue("detection_sources", detectionSource, masterData)) {
    errors.push(createError("detection_source", "detection_source is not allowed"));
  }

  const resolvedOrganizationName =
    incident.organization_name || organization?.organization_name || null;
  const resolvedHealthRegion = incident.health_region || organization?.health_region || null;
  const resolvedProvince = incident.province || organization?.province || null;
  const resolvedAgencyType = incident.agency_type || organization?.agency_type || null;

  if (
    resolvedHealthRegion &&
    !masterData.health_regions.some((item) => item.name === resolvedHealthRegion)
  ) {
    errors.push(createError("health_region", "health_region is not allowed"));
  }

  if (resolvedProvince && !isAllowedValue("provinces", resolvedProvince, masterData)) {
    errors.push(createError("province", "province is not allowed"));
  }

  if (resolvedAgencyType && !isAllowedValue("agency_types", resolvedAgencyType, masterData)) {
    errors.push(createError("agency_type", "agency_type is not allowed"));
  }

  const summarySanitized = validateSanitizedNarrative(
    incident.summary_sanitized,
    "summary_sanitized",
    errors,
    { required: true }
  );
  const incidentCategory = incident.incident_category
    ? validateSanitizedNarrative(incident.incident_category, "incident_category", errors)
    : "General";
  const assignedTeam = incident.assigned_team
    ? validateSanitizedNarrative(incident.assigned_team, "assigned_team", errors)
    : "SOC Team";
  const assignedTo = incident.assigned_to
    ? validateSanitizedNarrative(incident.assigned_to, "assigned_to", errors)
    : "Unassigned";

  const affectedDomainSanitized = incident.affected_domain_sanitized
    ? sanitizeDomain(incident.affected_domain_sanitized)
    : null;
  if (incident.affected_domain_sanitized && !affectedDomainSanitized) {
    errors.push(
      createError("affected_domain_sanitized", "affected_domain_sanitized must be a valid domain")
    );
  }

  const affectedUrlSanitized = incident.affected_url_sanitized
    ? validateUrlField(incident.affected_url_sanitized, "affected_url_sanitized", errors)
    : null;
  const suspiciousPathSanitized = incident.suspicious_path_sanitized
    ? sanitizePath(incident.suspicious_path_sanitized)
    : null;

  const status = incident.status
    ? validateRequiredString(incident.status, "status", errors)
    : getStatusForWorkflowStage(workflowStage);

  if (status && !isAllowedValue("statuses", status, masterData)) {
    errors.push(createError("status", "status is not allowed"));
  }

  const priority = incident.priority || severityToPriority(severity);
  const primaryImageUrl = incident.primary_image_url
    ? validateUrlField(incident.primary_image_url, "primary_image_url", errors)
    : null;
  const primaryImageCaption = incident.primary_image_caption
    ? validateSanitizedNarrative(incident.primary_image_caption, "primary_image_caption", errors)
    : null;
  const primaryImageSanitizedNote = incident.primary_image_sanitized_note
    ? validateSanitizedNarrative(
        incident.primary_image_sanitized_note,
        "primary_image_sanitized_note",
        errors
      )
    : "Sanitized primary image reference only";

  const bundleHasImage =
    Boolean(primaryImageUrl) ||
    attachments.some((attachment) => attachment.attachment_type === "image") ||
    evidence.some((item) => item.evidence_type === "image" && item.evidence_image_url);
  const hasImage = incident.has_image == null ? bundleHasImage : Boolean(incident.has_image);

  if (hasImage && !bundleHasImage) {
    errors.push(
      createError(
        "has_image",
        "has_image is true but no primary image reference or image child record is available"
      )
    );
  }

  const normalizedIncident = {
    incident_id: incidentId,
    incident_code: incidentCode,
    reported_at: reportedAt,
    detected_at: detectedAt || reportedAt,
    organization_id: organizationId,
    organization_name: resolvedOrganizationName,
    health_region: resolvedHealthRegion,
    province: resolvedProvince,
    agency_type: resolvedAgencyType,
    incident_type: incidentType,
    incident_category: incidentCategory,
    severity,
    priority,
    status,
    workflow_stage: workflowStage,
    assigned_team: assignedTeam,
    assigned_to: assignedTo,
    summary_sanitized: summarySanitized,
    affected_domain_sanitized: affectedDomainSanitized,
    affected_url_sanitized: affectedUrlSanitized,
    suspicious_path_sanitized: suspiciousPathSanitized,
    detection_source: detectionSource,
    has_image: hasImage,
    primary_image_url: primaryImageUrl,
    primary_image_caption: primaryImageCaption,
    primary_image_sanitized_note: primaryImageSanitizedNote,
    created_by: createdBy,
    created_at: createdAt,
    updated_by: updatedBy,
    updated_at: updatedAt,
    closed_at: workflowStage === "Closed" ? closedAt || updatedAt || createdAt : closedAt
  };

  const sla = calculateSlaStatus(normalizedIncident, {
    masterData,
    now: options.now
  });

  normalizedIncident.sla_status = sla.sla_status;
  normalizedIncident.sla_due_at = sla.due_at;
  normalizedIncident.sla_elapsed_hours = sla.elapsed_hours;
  normalizedIncident.sla_target_hours = sla.target_hours;

  return {
    isValid: errors.length === 0,
    errors,
    value: errors.length === 0 ? normalizedIncident : null
  };
}

function validateAttachment(attachmentInput, options = {}) {
  const errors = [];
  const attachment = attachmentInput || {};
  const attachmentId = validateRequiredString(
    attachment.attachment_id,
    "attachment_id",
    errors
  );
  const incidentId = validateRequiredString(attachment.incident_id, "incident_id", errors);
  const attachmentType = validateRequiredString(
    attachment.attachment_type,
    "attachment_type",
    errors
  );
  const fileName = validateRequiredString(attachment.file_name, "file_name", errors);
  const fileUrl = validateUrlField(attachment.file_url, "file_url", errors, { required: true });
  const createdBy = validateRequiredString(attachment.created_by, "created_by", errors);
  const createdAt = toIsoDate(attachment.created_at, "created_at", errors, { required: true });

  if (attachmentType && !ALLOWED_ATTACHMENT_TYPES.includes(attachmentType)) {
    errors.push(createError("attachment_type", "attachment_type is not allowed"));
  }

  if (
    attachment.file_mime_type &&
    !ALLOWED_MIME_TYPES.includes(attachment.file_mime_type)
  ) {
    errors.push(createError("file_mime_type", "file_mime_type is not allowed"));
  }

  if (
    attachment.file_size != null &&
    (!Number.isFinite(attachment.file_size) || attachment.file_size < 0)
  ) {
    errors.push(createError("file_size", "file_size must be a non-negative number"));
  }

  if (typeof attachment.is_sanitized !== "boolean") {
    errors.push(createError("is_sanitized", "is_sanitized must be true or false"));
  }

  const imageCaption = attachment.image_caption
    ? validateSanitizedNarrative(attachment.image_caption, "image_caption", errors)
    : null;
  const sanitizedNote = attachment.sanitized_note
    ? validateSanitizedNarrative(attachment.sanitized_note, "sanitized_note", errors)
    : attachment.is_sanitized
      ? "Sanitized attachment ready for export"
      : "Attachment pending sanitization review";

  const normalizedAttachment = {
    attachment_id: attachmentId,
    incident_id: incidentId,
    attachment_type: attachmentType,
    file_name: fileName,
    file_url: fileUrl,
    file_mime_type: attachment.file_mime_type || "application/octet-stream",
    file_size: attachment.file_size ?? 0,
    image_caption: imageCaption,
    image_taken_at: toIsoDate(attachment.image_taken_at, "image_taken_at", errors),
    image_source: attachment.image_source ? normalizeWhitespace(attachment.image_source) : null,
    is_sanitized: attachment.is_sanitized,
    sanitized_by: attachment.sanitized_by ? normalizeWhitespace(attachment.sanitized_by) : null,
    sanitized_at: toIsoDate(attachment.sanitized_at, "sanitized_at", errors),
    sanitized_note: sanitizedNote,
    created_by: createdBy,
    created_at: createdAt
  };

  return {
    isValid: errors.length === 0,
    errors,
    value: errors.length === 0 ? normalizedAttachment : null
  };
}

function validateEvidence(evidenceInput) {
  const errors = [];
  const evidence = evidenceInput || {};
  const evidenceId = validateRequiredString(evidence.evidence_id, "evidence_id", errors);
  const incidentId = validateRequiredString(evidence.incident_id, "incident_id", errors);
  const evidenceType = validateRequiredString(evidence.evidence_type, "evidence_type", errors);
  const createdBy = validateRequiredString(evidence.created_by, "created_by", errors);
  const createdAt = toIsoDate(evidence.created_at, "created_at", errors, { required: true });

  if (evidenceType && !ALLOWED_EVIDENCE_TYPES.includes(evidenceType)) {
    errors.push(createError("evidence_type", "evidence_type is not allowed"));
  }

  if (typeof evidence.is_sanitized !== "boolean") {
    errors.push(createError("is_sanitized", "is_sanitized must be true or false"));
  }

  if (
    evidence.confidence_score != null &&
    (!Number.isFinite(evidence.confidence_score) ||
      evidence.confidence_score < 0 ||
      evidence.confidence_score > 1)
  ) {
    errors.push(
      createError("confidence_score", "confidence_score must be a number between 0 and 1")
    );
  }

  const evidenceTextSanitized = evidence.evidence_text_sanitized
    ? validateSanitizedNarrative(
        evidence.evidence_text_sanitized,
        "evidence_text_sanitized",
        errors,
        { required: evidenceType === "text" }
      )
    : evidenceType === "text"
      ? validateSanitizedNarrative(null, "evidence_text_sanitized", errors, { required: true })
      : null;

  const evidenceImageCaption = evidence.evidence_image_caption
    ? validateSanitizedNarrative(
        evidence.evidence_image_caption,
        "evidence_image_caption",
        errors
      )
    : null;
  const evidenceUrlSanitized = evidence.evidence_url_sanitized
    ? validateUrlField(evidence.evidence_url_sanitized, "evidence_url_sanitized", errors)
    : null;
  const evidenceImageUrl = evidence.evidence_image_url
    ? validateUrlField(evidence.evidence_image_url, "evidence_image_url", errors)
    : null;
  const sanitizedNote = evidence.sanitized_note
    ? validateSanitizedNarrative(evidence.sanitized_note, "sanitized_note", errors)
    : evidence.is_sanitized
      ? "Sanitized evidence approved for use"
      : "Evidence pending sanitization review";

  const normalizedEvidence = {
    evidence_id: evidenceId,
    incident_id: incidentId,
    evidence_type: evidenceType,
    evidence_text_sanitized: evidenceTextSanitized,
    evidence_image_url: evidenceImageUrl,
    evidence_image_caption: evidenceImageCaption,
    evidence_url_sanitized: evidenceUrlSanitized,
    source_type: evidence.source_type ? normalizeWhitespace(evidence.source_type) : "internal",
    confidence_score: evidence.confidence_score ?? 0,
    is_sanitized: evidence.is_sanitized,
    sanitized_note: sanitizedNote,
    collected_at: toIsoDate(evidence.collected_at, "collected_at", errors) || createdAt,
    created_by: createdBy,
    created_at: createdAt
  };

  return {
    isValid: errors.length === 0,
    errors,
    value: errors.length === 0 ? normalizedEvidence : null
  };
}

function validateIncidentBundle(bundleInput, options = {}) {
  const bundle = bundleInput || {};
  const attachmentResults = (bundle.attachments || []).map((attachment) =>
    validateAttachment(attachment, options)
  );
  const evidenceResults = (bundle.evidence || []).map((evidence) =>
    validateEvidence(evidence, options)
  );

  const errors = [
    ...attachmentResults.flatMap((result, index) =>
      result.errors.map((error) => ({
        ...error,
        field: `attachments[${index}].${error.field}`
      }))
    ),
    ...evidenceResults.flatMap((result, index) =>
      result.errors.map((error) => ({
        ...error,
        field: `evidence[${index}].${error.field}`
      }))
    )
  ];

  const attachments = attachmentResults.filter((result) => result.value).map((result) => result.value);
  const evidence = evidenceResults.filter((result) => result.value).map((result) => result.value);

  const incidentResult = validateIncident(bundle.incident, {
    ...options,
    attachments,
    evidence
  });

  errors.push(...incidentResult.errors);

  return {
    isValid: errors.length === 0,
    errors,
    value:
      errors.length === 0
        ? {
            incident: incidentResult.value,
            attachments,
            evidence
          }
        : null
  };
}

function prepareIncidentDataset(bundles, options = {}) {
  const validBundles = [];
  const errors = [];

  for (const bundle of bundles || []) {
    const result = validateIncidentBundle(bundle, options);
    if (result.isValid && result.value) {
      validBundles.push(result.value);
    } else {
      errors.push({
        incident_id: bundle?.incident?.incident_id || null,
        errors: result.errors
      });
    }
  }

  return { validBundles, errors };
}

function severityToPriority(severity) {
  switch (severity) {
    case "Critical":
      return "P1";
    case "High":
      return "P2";
    case "Medium":
      return "P3";
    case "Low":
      return "P4";
    default:
      return "P4";
  }
}

module.exports = {
  ALLOWED_ATTACHMENT_TYPES,
  ALLOWED_MIME_TYPES,
  ALLOWED_EVIDENCE_TYPES,
  validateIncident,
  validateAttachment,
  validateEvidence,
  validateIncidentBundle,
  prepareIncidentDataset
};
