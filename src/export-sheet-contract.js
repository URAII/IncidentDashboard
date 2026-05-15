#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { prepareIncidentDataset } = require("./validation");
const { buildSheetExportContract } = require("./sheet-export-contract");

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
    "Usage: node src/export-sheet-contract.js --in <bundles.json> --out <contract.json> [--now <iso-date>]\n"
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    printUsage();
    return;
  }

  if (!args.in || !args.out) {
    printUsage();
    throw new Error("--in and --out are required");
  }

  const inputPath = path.resolve(args.in);
  const raw = fs.readFileSync(inputPath, "utf8");
  const sourceBundles = JSON.parse(raw);

  if (!Array.isArray(sourceBundles)) {
    throw new Error("input file must be a JSON array of bundles");
  }

  const validation = prepareIncidentDataset(sourceBundles, { now: args.now });

  if (validation.errors.length > 0) {
    throw new Error(`input validation failed: ${validation.errors.length} record(s) rejected`);
  }

  const contract = buildSheetExportContract({
    bundles: validation.validBundles,
    now: args.now
  });

  const outputPath = path.resolve(args.out);
  fs.writeFileSync(outputPath, JSON.stringify(contract, null, 2));

  process.stdout.write(
    `Sheet export contract generated: incidents=${contract.summary.incidents}, attachments=${contract.summary.incident_attachments}, evidence=${contract.summary.incident_evidence}\n`
  );
  process.stdout.write(`Output written: ${path.basename(outputPath)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`Sheet export failed: ${error.message}\n`);
  process.exitCode = 1;
}
