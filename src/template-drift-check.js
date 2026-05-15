const fs = require("node:fs");
const path = require("node:path");

const { validateXlsxBinaryWorkbook } = require("./xlsx-binary-parser");

const DEFAULT_MANIFEST_PATH = path.resolve(
  __dirname,
  "..",
  "fixtures",
  "xlsx-multifile",
  "template-release.v2.json"
);

function runTemplateDriftCheck(options = {}) {
  const manifestPath = path.resolve(options.manifestPath || DEFAULT_MANIFEST_PATH);

  if (!fs.existsSync(manifestPath)) {
    return buildMissingFixtureResult({
      manifestPath,
      reason: "missing_manifest"
    });
  }

  const manifest = readManifest(manifestPath);
  const workbookPath = resolveWorkbookPath(manifestPath, manifest.workbook_file);

  if (!workbookPath || !fs.existsSync(workbookPath)) {
    return buildMissingFixtureResult({
      manifestPath,
      manifest,
      reason: "missing_workbook"
    });
  }

  const schemaVersion = normalizeSchemaVersion(manifest.schema_version || options.schemaVersion || "v2");
  let validationResult;

  try {
    validationResult = validateXlsxBinaryWorkbook(workbookPath, {
      strictSchema: true,
      schemaVersion,
      now: options.now
    });
  } catch (error) {
    return {
      status: "fail",
      drift_status: "fail",
      schema_version: schemaVersion,
      template_id: sanitizeTemplateId(manifest.template_id),
      workbook_id: path.basename(workbookPath).replace(/[^A-Za-z0-9._-]/g, "_"),
      counts: {
        missing_required_headers: 0,
        unknown_headers: 0,
        duplicate_headers: 0,
        wrong_sheet_names: 0,
        missing_fixture: 0,
        corrupted_workbook: 1
      },
      errors: [
        {
          type: "corrupted_workbook",
          template_id: sanitizeTemplateId(manifest.template_id),
          workbook_id: path.basename(workbookPath).replace(/[^A-Za-z0-9._-]/g, "_")
        }
      ]
    };
  }

  const driftErrors = [];
  driftErrors.push(
    ...validationResult.workbook_errors.filter(
      (entry) => entry.type === "missing_sheet" || entry.type === "duplicate_header"
    )
  );
  driftErrors.push(
    ...validationResult.schema_errors.filter(
      (entry) =>
        entry.type === "missing_required_header" || entry.type === "unknown_header"
    )
  );

  const counts = {
    missing_required_headers: driftErrors.filter(
      (entry) => entry.type === "missing_required_header"
    ).length,
    unknown_headers: driftErrors.filter((entry) => entry.type === "unknown_header").length,
    duplicate_headers: driftErrors.filter((entry) => entry.type === "duplicate_header").length,
    wrong_sheet_names: driftErrors.filter((entry) => entry.type === "missing_sheet").length,
    missing_fixture: 0,
    corrupted_workbook: 0
  };

  return {
    status: driftErrors.length === 0 ? "pass" : "fail",
    drift_status: driftErrors.length === 0 ? "pass" : "fail",
    schema_version: schemaVersion,
    template_id: sanitizeTemplateId(manifest.template_id),
    workbook_id: validationResult.workbook_id,
    manifest_id: path.basename(manifestPath).replace(/[^A-Za-z0-9._-]/g, "_"),
    counts,
    errors: driftErrors,
    validation_status: {
      workbook_errors: validationResult.workbook_errors.length,
      schema_errors: validationResult.schema_errors.length,
      join_errors: validationResult.join_errors.length,
      validation_errors: validationResult.validation_errors.length
    }
  };
}

function buildMissingFixtureResult({ manifestPath, manifest, reason }) {
  const templateId = sanitizeTemplateId(manifest?.template_id);

  return {
    status: "fail",
    drift_status: "fail",
    schema_version: normalizeSchemaVersion(manifest?.schema_version || "v2"),
    template_id: templateId,
    workbook_id: "unavailable",
    manifest_id: path.basename(manifestPath).replace(/[^A-Za-z0-9._-]/g, "_"),
    counts: {
      missing_required_headers: 0,
      unknown_headers: 0,
      duplicate_headers: 0,
      wrong_sheet_names: 0,
      missing_fixture: 1,
      corrupted_workbook: 0
    },
    errors: [
      {
        type: reason,
        template_id: templateId,
        manifest_id: path.basename(manifestPath).replace(/[^A-Za-z0-9._-]/g, "_")
      }
    ]
  };
}

function readManifest(manifestPath) {
  const raw = fs.readFileSync(manifestPath, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid_manifest");
  }

  return parsed;
}

function resolveWorkbookPath(manifestPath, workbookFile) {
  if (!workbookFile) {
    return null;
  }

  return path.resolve(path.dirname(manifestPath), workbookFile);
}

function sanitizeTemplateId(value) {
  return String(value || "template_v2")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 80);
}

function normalizeSchemaVersion(value) {
  const normalized = String(value || "v2").toLowerCase().trim();
  return normalized === "v1" ? "v1" : "v2";
}

module.exports = {
  DEFAULT_MANIFEST_PATH,
  runTemplateDriftCheck
};
