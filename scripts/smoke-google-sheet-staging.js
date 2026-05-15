const path = require("node:path");

const fixtureBundles = require("../fixtures/sample-incident-bundles.json");
const { prepareIncidentDataset } = require("../src/validation");
const { buildSheetExportContract } = require("../src/sheet-export-contract");
const { loadSchemaProfile, exportContractToGoogleSheet } = require("../src/google-sheet-connector");

const NOW = "2026-05-12T12:00:00.000Z";
const REQUIRED_STAGING_ENVS = [
  "GOOGLE_SHEETS_STAGING_SPREADSHEET_ID",
  "GOOGLE_APPLICATION_CREDENTIALS"
];

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

function resolveMode(args) {
  if (args.staging) {
    return "staging";
  }

  return "dry-run";
}

function hasEnvValue(value) {
  return value != null && String(value).trim() !== "";
}

function collectMissingStagingEnvs(env) {
  return REQUIRED_STAGING_ENVS.filter((key) => !hasEnvValue(env[key]));
}

function buildSanitizedSampleContract() {
  const validation = prepareIncidentDataset(fixtureBundles, { now: NOW });
  if (validation.errors.length > 0) {
    throw new Error(`sample fixture validation failed: ${validation.errors.length} rejected bundle(s)`);
  }

  return buildSheetExportContract({
    bundles: validation.validBundles,
    now: NOW
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = resolveMode(args);
  const skipWhenMissingEnv = args["allow-skip-missing-env"] === true;
  const schemaProfile = loadSchemaProfile(args.schema ? path.resolve(args.schema) : undefined);
  const contract = buildSanitizedSampleContract();

  if (mode === "staging") {
    const missingEnvs = collectMissingStagingEnvs(process.env);
    if (missingEnvs.length > 0 && skipWhenMissingEnv) {
      process.stdout.write(
        `Google Sheet staging smoke skipped: missing required env(s)=${missingEnvs.join(",")}, status=skip\n`
      );
      return;
    }
  }

  const result = await exportContractToGoogleSheet({
    contract,
    schemaProfile,
    mode,
    env: process.env
  });

  process.stdout.write(
    `Google Sheet smoke mode=${result.mode}, schema_status=${result.compatibility.summary.status}, errors=${result.compatibility.summary.error_count}, warnings=${result.compatibility.summary.warning_count}, ranges=${result.request_summary.range_count}, rows=${result.request_summary.row_count}, status=${result.status}\n`
  );

  if (result.mode === "dry-run") {
    process.stdout.write("Google Sheet staging smoke dry-run complete (no API write)\n");
  } else {
    process.stdout.write("Google Sheet staging smoke write complete\n");
  }
}

main().catch((error) => {
  const message = error && error.message ? error.message : "unknown error";
  process.stderr.write(`Google Sheet staging smoke failed: ${message}\n`);
  process.exitCode = 1;
});
