#!/usr/bin/env node

const path = require("node:path");

const {
  loadContractFromFile,
  loadSchemaProfile,
  exportContractToGoogleSheet
} = require("./google-sheet-connector");

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

function printUsage() {
  process.stdout.write(
    "Usage: node src/export-google-sheet.js --input <contract.json> [--schema <schema.json>] [--dry-run|--staging]\n"
  );
}

function resolveMode(args) {
  if (args.staging) {
    return "staging";
  }

  return "dry-run";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    printUsage();
    return;
  }

  if (!args.input) {
    printUsage();
    throw new Error("--input is required");
  }

  const { contract } = loadContractFromFile(args.input);
  const schemaProfile = loadSchemaProfile(args.schema);
  const mode = resolveMode(args);

  const result = await exportContractToGoogleSheet({
    contract,
    schemaProfile,
    mode,
    env: process.env
  });

  process.stdout.write(
    `Google Sheet export mode=${result.mode}, schema_status=${result.compatibility.summary.status}, errors=${result.compatibility.summary.error_count}, warnings=${result.compatibility.summary.warning_count}, ranges=${result.request_summary.range_count}, rows=${result.request_summary.row_count}\n`
  );

  if (mode === "dry-run") {
    process.stdout.write("Dry-run completed: no write operation sent to Google Sheets\n");
  } else {
    process.stdout.write("Staging export completed\n");
  }
}

main().catch((error) => {
  const message = error && error.message ? error.message : "unknown error";
  process.stderr.write(`Google Sheet export failed: ${message}\n`);
  process.exitCode = 1;
});
