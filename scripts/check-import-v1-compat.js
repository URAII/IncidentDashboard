const assert = require("node:assert/strict");
const path = require("node:path");

const { ingestCsvFiles } = require("../src");

const NOW = "2026-05-12T12:00:00.000Z";
const FIXTURE_DIR = path.resolve(__dirname, "..", "fixtures", "csv-multifile");
const DEFAULT_MAX_V1_WARNINGS = 1;

function fixture(fileName) {
  return path.resolve(FIXTURE_DIR, fileName);
}

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

function resolveMaxV1Warnings(args) {
  const configured = args["max-v1-warnings"] ?? process.env.IMPORT_MAX_V1_WARNINGS;
  if (configured == null) {
    return DEFAULT_MAX_V1_WARNINGS;
  }

  const parsed = Number(configured);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("max-v1-warnings must be a non-negative integer");
  }

  return parsed;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const maxV1Warnings = resolveMaxV1Warnings(args);
  const result = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.valid.csv"),
      attachmentsFile: fixture("incident_attachments.valid.csv"),
      evidenceFile: fixture("incident_evidence.valid.csv")
    },
    {
      now: NOW,
      strictSchema: true,
      schemaVersion: "v1"
    }
  );

  assert.equal(result.schema_version, "v1");
  assert.equal(result.schema_errors.length, 0);
  assert.equal(result.join_errors.length, 0);
  assert.equal(result.validation_errors.length, 0);
  assert.equal(result.sanitizedBundles.length > 0, true);

  const warningCount = result.schema_warnings.filter(
    (warning) =>
      warning.type === "deprecated_schema_version" && warning.schema_version === "v1"
  ).length;
  assert.equal(warningCount > 0, true);

  const status = warningCount > maxV1Warnings ? "fail" : "pass";
  process.stdout.write(
    `Import gate v1 compatibility summary: schema_version=${result.schema_version}, warning_count=${warningCount}, threshold=${maxV1Warnings}, status=${status}\n`
  );

  if (warningCount > 0) {
    process.stderr.write("Import compatibility warning: schema_version=v1 is deprecated; migrate to v2\n");
  }

  if (warningCount > maxV1Warnings) {
    const thresholdError = new Error(
      `V1_WARNING_THRESHOLD_EXCEEDED warning_count=${warningCount} threshold=${maxV1Warnings}`
    );
    thresholdError.exitCode = 2;
    throw thresholdError;
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`Import gate v1 compatibility failed: ${error.message}\n`);
  process.exitCode = error.exitCode || 1;
}
