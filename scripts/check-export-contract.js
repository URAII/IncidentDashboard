const assert = require("node:assert/strict");

const fixtureBundles = require("../fixtures/sample-incident-bundles.json");
const { prepareIncidentDataset } = require("../src/validation");
const { buildSheetExportContract } = require("../src/sheet-export-contract");

const NOW = "2026-05-12T12:00:00.000Z";

function assertNoQueryOrFragment(value, fieldName) {
  if (value == null || value === "") {
    return;
  }

  assert.equal(/[?#]/.test(value), false, `${fieldName} must not contain query/fragment`);
}

function main() {
  const { validBundles, errors } = prepareIncidentDataset(fixtureBundles, { now: NOW });
  assert.equal(errors.length, 0, "fixture bundles must validate before export contract generation");

  const contract = buildSheetExportContract({ bundles: validBundles, now: NOW });

  assert.equal(contract.summary.incidents, validBundles.length);

  for (const row of contract.sheets.incidents.rows) {
    assertNoQueryOrFragment(row.affected_url_sanitized, "incidents.affected_url_sanitized");
    assertNoQueryOrFragment(row.suspicious_path_sanitized, "incidents.suspicious_path_sanitized");
    assertNoQueryOrFragment(row.primary_image_url, "incidents.primary_image_url");
  }

  for (const row of contract.sheets.incident_attachments.rows) {
    assertNoQueryOrFragment(row.file_url_sanitized, "incident_attachments.file_url_sanitized");
    assert.equal(row.is_sanitized, true);
  }

  for (const row of contract.sheets.incident_evidence.rows) {
    assertNoQueryOrFragment(row.evidence_image_url, "incident_evidence.evidence_image_url");
    assertNoQueryOrFragment(row.evidence_url_sanitized, "incident_evidence.evidence_url_sanitized");
    assert.equal(row.is_sanitized, true);
  }

  process.stdout.write(
    `Export contract check passed: incidents=${contract.summary.incidents}, attachments=${contract.summary.incident_attachments}, evidence=${contract.summary.incident_evidence}\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`Export contract check failed: ${error.message}\n`);
  process.exitCode = 1;
}
