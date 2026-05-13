#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { ingestXlsxWorkbookFile } = require("./xlsx-adapter");

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
    "Usage: node src/import-xlsx.js --workbook <file> --out <file> [--now <iso-date>] [--schema-version <v1|v2>] [--strict-schema] [--fail-on-join-error] [--fail-on-validation-error]\n"
  );
}

function parseBooleanFlag(value) {
  return value === true || value === "true" || value === "1";
}

function buildFailureReasons(args, result, strictSchema) {
  const reasons = [];

  if (strictSchema && result.schema_errors.length > 0) {
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

  if (!args.workbook || !args.out) {
    printUsage();
    throw new Error("--workbook and --out are required");
  }

  const strictSchema =
    args["strict-schema"] == null ? true : parseBooleanFlag(args["strict-schema"]);
  const result = ingestXlsxWorkbookFile(args.workbook, {
    now: args.now,
    strictSchema,
    schemaVersion: args["schema-version"]
  });

  const output = {
    generated_at: new Date().toISOString(),
    schema_version: result.schema_version,
    schema_warnings: result.schema_warnings || [],
    source_files: result.source_files,
    source_sheets: result.source_sheets,
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
    `XLSX import completed: schema_version=${output.schema_version}, warnings=${output.schema_warnings.length}, bundles=${output.bundles_count}, valid=${output.valid_bundles_count}, sanitized=${output.sanitized_bundles_count}, schema_errors=${output.schema_errors.length}, join_errors=${output.join_errors.length}, validation_errors=${output.validation_errors.length}\n`
  );
  process.stdout.write(`Output written: ${path.basename(outputPath)}\n`);

  for (const warning of output.schema_warnings) {
    if (warning.type !== "deprecated_schema_version") {
      continue;
    }
    process.stderr.write(
      `XLSX import warning: schema_version=${warning.schema_version} is deprecated; migrate to ${warning.current_version}\n`
    );
  }

  const failureReasons = buildFailureReasons(args, result, strictSchema);
  if (failureReasons.length > 0) {
    throw new Error(`import failed by policy: ${failureReasons.join(",")}`);
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`XLSX import failed: ${error.message}\n`);
  process.exitCode = 1;
}
