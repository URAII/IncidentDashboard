const path = require("node:path");

const { checkTemplateReleaseGovernance } = require("../src");

const DEFAULT_WORKBOOK = path.resolve(
  __dirname,
  "..",
  "fixtures",
  "xlsx-multifile",
  "template.v2.real-sanitized.xlsx"
);
const DEFAULT_APPROVAL_FILE = path.resolve(
  __dirname,
  "..",
  "fixtures",
  "xlsx-multifile",
  "template-release.v2.json"
);

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function formatCounts(counts) {
  return `required_headers=${counts.required_headers},present_headers=${counts.present_headers},missing_required_headers=${counts.missing_required_headers},unknown_headers=${counts.unknown_headers},duplicate_headers=${counts.duplicate_headers}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const workbook = args.workbook ? path.resolve(args.workbook) : DEFAULT_WORKBOOK;
  const approvalFile = args["approval-file"]
    ? path.resolve(args["approval-file"])
    : DEFAULT_APPROVAL_FILE;
  const schemaVersion = args["schema-version"] || "v2";

  const result = checkTemplateReleaseGovernance({
    workbookFile: workbook,
    approvalFile,
    schemaVersion
  });

  process.stdout.write(
    `Template release readiness summary: schema_version=${result.schema_version}, template_id=${result.template_id}, drift_status=${result.drift_status}, approval_checklist_status=${result.approval_checklist_status}, status=${result.status}\n`
  );

  for (const drift of result.drifts || []) {
    process.stdout.write(
      `Template drift summary: schema_version=${drift.schema_version}, template_id=${drift.workbook_id}, sheet_name=${drift.sheet_name}, drift_type=${drift.drift_type}, counts=${formatCounts(drift.counts)}, status=${drift.status}\n`
    );
  }

  if (result.drift_status === "fail") {
    const error = new Error(`TEMPLATE_DRIFT_DETECTED drift_count=${result.drift_count}`);
    error.exitCode = 2;
    throw error;
  }

  if (result.approval_checklist_status === "fail") {
    const error = new Error(
      `TEMPLATE_APPROVAL_CHECKLIST_INCOMPLETE missing_items=${result.approval_checklist.missing_items.length}`
    );
    error.exitCode = 4;
    throw error;
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`Template drift check failed: ${error.message}\n`);
  process.exitCode = error.exitCode || 1;
}
