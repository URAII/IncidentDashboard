const assert = require("node:assert/strict");

const fixtureBundles = require("../fixtures/sample-incident-bundles.json");
const { prepareIncidentDataset, buildDashboardPayload } = require("../src");

const NOW = "2026-05-12T12:00:00.000Z";

function assertNoQueryOrFragment(value, fieldName) {
  if (value == null || value === "") {
    return;
  }

  assert.equal(
    /[?#]/.test(value),
    false,
    `${fieldName} must not contain query strings or fragments in readiness output`
  );
}

function main() {
  const { validBundles, errors } = prepareIncidentDataset(fixtureBundles, { now: NOW });

  assert.equal(Array.isArray(fixtureBundles), true, "fixture bundle set must be an array");
  assert.equal(validBundles.length > 0, true, "fixture bundle set must produce valid bundles");
  assert.equal(errors.length, 0, "fixture bundle set must validate without rejected records");

  const payload = buildDashboardPayload(validBundles, { now: NOW });

  assert.equal(
    payload.summary.total_incidents,
    validBundles.length,
    "dashboard summary must match validated bundle count"
  );
  assert.equal(Array.isArray(payload.records), true, "dashboard payload must expose records");
  assert.equal(
    payload.records.length,
    validBundles.length,
    "dashboard records must match validated bundle count"
  );

  for (const record of payload.records) {
    assertNoQueryOrFragment(record.affected_url_sanitized, "affected_url_sanitized");
    assertNoQueryOrFragment(record.suspicious_path_sanitized, "suspicious_path_sanitized");
    assertNoQueryOrFragment(record.primary_image_url, "primary_image_url");

    for (const previewItem of record.evidence_preview || []) {
      assertNoQueryOrFragment(previewItem, "evidence_preview");
    }
  }

  const unsanitizedIncident = payload.records.find((record) => record.incident_id === "INC-004");
  assert.ok(unsanitizedIncident, "fixture incident INC-004 must be present");
  assert.equal(
    unsanitizedIncident.sanitized_evidence_count,
    0,
    "unsanitized evidence must be excluded from dashboard preview counts"
  );
  assert.deepEqual(
    unsanitizedIncident.evidence_preview,
    [],
    "unsanitized evidence must not appear in dashboard preview output"
  );

  process.stdout.write(
    `Readiness check passed: ${payload.summary.total_incidents} incidents, ${payload.summary.sanitized_evidence_items} sanitized evidence items\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`Readiness check failed: ${error.message}\n`);
  process.exitCode = 1;
}
