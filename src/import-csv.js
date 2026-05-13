#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { ingestCsvFiles } = require("./spreadsheet-adapter");

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
    "Usage: node src/import-csv.js --incidents <file> [--attachments <file>] [--evidence <file>] --out <file> [--now <iso-date>] [--schema-version <v1|v2>] [--strict-schema] [--fail-on-join-error] [--fail-on-validation-error]\n"
  );
}

function parseBooleanFlag(value) {
  return value === true || value === "true" || value === "1";
}

function buildFailureReasons(args, result) {
  const reasons = [];

  if (parseBooleanFlag(args["strict-schema"]) && result.schema_errors.length > 0) {
    reasons.push("strict_schema_error");
  }

  if (parseBooleanFlag(args["fail-on-join-error"]) && result.join_errors.length > 0) {
    reasons.push("join_error");
  }

  if (
    parseBooleanFlag(args["fail-on-validation-error"]) &&
    result.validation_errors.length > 0
  ) {
    reasons.push("validation_error");
  }

  return reasons;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    printUsage();
    return;
  }

  if (!args.incidents || !args.out) {
    printUsage();
    throw new Error("--incidents and --out are required");
  }

  const result = ingestCsvFiles(
    {
      incidentsFile: args.incidents,
      attachmentsFile: args.attachments,
      evidenceFile: args.evidence
    },
    {
      now: args.now,
      strictSchema: parseBooleanFlag(args["strict-schema"]),
      schemaVersion: args["schema-version"]
    }
  );

  const output = {
    generated_at: new Date().toISOString(),
    schema_version: result.schema_version,
    source_files: result.source_files,
    rows_count: result.rows_count,
    bundles_count: result.bundles_count,
    valid_bundles_count: result.validBundles.length,
    sanitized_bundles_count: result.sanitizedBundles.length,
    schema_errors: result.schema_errors,
    join_errors: result.join_errors,
    validation_errors: result.validation_errors,
    bundles: result.sanitizedBundles
  };

  const outputPath = path.resolve(args.out);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  process.stdout.write(
    `Import completed: schema_version=${output.schema_version}, bundles=${output.bundles_count}, valid=${output.valid_bundles_count}, sanitized=${output.sanitized_bundles_count}, schema_errors=${output.schema_errors.length}, join_errors=${output.join_errors.length}, validation_errors=${output.validation_errors.length}\n`
  );
  process.stdout.write(`Output written: ${path.basename(outputPath)}\n`);

  const failureReasons = buildFailureReasons(args, result);
  if (failureReasons.length > 0) {
    throw new Error(`import failed by policy: ${failureReasons.join(",")}`);
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`CSV import failed: ${error.message}\n`);
  process.exitCode = 1;
}
