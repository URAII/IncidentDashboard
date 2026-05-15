const assert = require("node:assert/strict");

const fixtureBundles = require("../fixtures/sample-incident-bundles.json");
const { prepareIncidentDataset } = require("../src/validation");
const { buildSheetExportContract } = require("../src/sheet-export-contract");

const NOW = "2026-05-12T12:00:00.000Z";
const REQUIRED_SHEETS = ["incidents", "incident_attachments", "incident_evidence"];

function main() {
  const { validBundles, errors } = prepareIncidentDataset(fixtureBundles, { now: NOW });
  assert.equal(errors.length, 0, "fixture bundles must validate before sheet-tab compatibility check");

  const contract = buildSheetExportContract({ bundles: validBundles, now: NOW });

  for (const sheetName of REQUIRED_SHEETS) {
    assert.ok(contract.sheets[sheetName], `missing required sheet-compatible tab: ${sheetName}`);
    assert.equal(Array.isArray(contract.sheets[sheetName].columns), true);
    assert.equal(Array.isArray(contract.sheets[sheetName].rows), true);
  }

  process.stdout.write(
    `Import gate xlsx summary: required_sheets=${REQUIRED_SHEETS.length}, incidents=${contract.summary.incidents}, attachments=${contract.summary.incident_attachments}, evidence=${contract.summary.incident_evidence}, status=pass\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`Import gate xlsx failed: ${error.message}\n`);
  process.exitCode = 1;
}
