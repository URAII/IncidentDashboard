const fs = require("node:fs");
const path = require("node:path");

const { checkTemplateWorkbookDrift } = require("./template-drift");

const REQUIRED_CHECKLIST_KEYS = [
  "template_owner",
  "reviewer",
  "sanitized_sample_workbook",
  "schema_version",
  "rollback_plan"
];

function checkTemplateReleaseGovernance({ workbookFile, approvalFile, schemaVersion = "v2" }) {
  ensureFileExists(workbookFile, "workbook");
  ensureFileExists(approvalFile, "approval");

  const templateId = sanitizeTemplateId(workbookFile);
  const approval = readApprovalFile(approvalFile);
  const driftResult = checkTemplateWorkbookDrift(workbookFile, { schemaVersion });
  const checklist = evaluateApprovalChecklist({ approval, schemaVersion, templateId });

  const approvalChecklistStatus = checklist.missing_items.length === 0 ? "pass" : "fail";
  const driftStatus = driftResult.status;
  const status = driftStatus === "pass" && approvalChecklistStatus === "pass" ? "pass" : "fail";

  return {
    schema_version: schemaVersion,
    template_id: templateId,
    drift_status: driftStatus,
    approval_checklist_status: approvalChecklistStatus,
    status,
    drift_count: driftResult.drift_count,
    drifts: driftResult.drifts,
    approval_checklist: checklist
  };
}

function evaluateApprovalChecklist({ approval, schemaVersion, templateId }) {
  const missingItems = [];

  for (const key of REQUIRED_CHECKLIST_KEYS) {
    const value = normalizeString(approval[key]);
    if (!value) {
      missingItems.push(key);
    }
  }

  const schemaVersionValue = normalizeString(approval.schema_version);
  const approvedSchemaVersion = schemaVersionValue === schemaVersion ? "pass" : "fail";
  if (approvedSchemaVersion === "fail") {
    missingItems.push("schema_version_match");
  }

  const ownerApproved = approval.owner_approved === true ? "pass" : "fail";
  if (ownerApproved === "fail") {
    missingItems.push("owner_approved");
  }

  const reviewerApproved = approval.reviewer_approved === true ? "pass" : "fail";
  if (reviewerApproved === "fail") {
    missingItems.push("reviewer_approved");
  }

  return {
    template_owner: normalizeString(approval.template_owner) ? "pass" : "fail",
    reviewer: normalizeString(approval.reviewer) ? "pass" : "fail",
    sanitized_sample_workbook: normalizeString(approval.sanitized_sample_workbook)
      ? "pass"
      : "fail",
    schema_version: normalizeString(approval.schema_version) ? "pass" : "fail",
    rollback_plan: normalizeString(approval.rollback_plan) ? "pass" : "fail",
    schema_version_match: approvedSchemaVersion,
    owner_approved: ownerApproved,
    reviewer_approved: reviewerApproved,
    missing_items: [...new Set(missingItems)]
  };
}

function readApprovalFile(filePath) {
  try {
    const content = fs.readFileSync(path.resolve(filePath), "utf8");
    return JSON.parse(content);
  } catch {
    const error = new Error("cannot parse approval checklist file");
    error.exitCode = 1;
    throw error;
  }
}

function ensureFileExists(filePath, kind) {
  const resolved = path.resolve(filePath || "");
  if (fs.existsSync(resolved)) {
    return;
  }

  const error = new Error(`TEMPLATE_FIXTURE_MISSING kind=${kind} file=${sanitizeTemplateId(filePath)}`);
  error.exitCode = 3;
  throw error;
}

function sanitizeTemplateId(filePath) {
  const base = path.basename(String(filePath || ""));
  return base.replace(/[^a-zA-Z0-9._-]/g, "_") || "unknown_template";
}

function normalizeString(value) {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

module.exports = {
  checkTemplateReleaseGovernance
};
