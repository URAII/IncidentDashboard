const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { ingestCsvFiles } = require("../src");

const NOW = "2026-05-12T12:00:00.000Z";
const FIXTURE_DIR = path.resolve(__dirname, "..", "fixtures", "csv-multifile");

function fixture(fileName) {
  return path.resolve(FIXTURE_DIR, fileName);
}

test("multi-file CSV join builds valid bundles and sanitizes unsafe URL tokens", () => {
  const result = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.valid.csv"),
      attachmentsFile: fixture("incident_attachments.valid.csv"),
      evidenceFile: fixture("incident_evidence.valid.csv")
    },
    { now: NOW }
  );

  assert.equal(result.join_errors.length, 0);
  assert.equal(result.validation_errors.length, 0);
  assert.equal(result.validBundles.length, 2);

  const first = result.validBundles.find((bundle) => bundle.incident.incident_id === "INC-M8-001");
  assert.ok(first);
  assert.equal(first.incident.affected_url_sanitized, "https://chiangmaihealth.example/index.html");
  assert.equal(first.incident.suspicious_path_sanitized, "/wp-content/shell.php");
  assert.equal(first.attachments[0].file_url.includes("?"), false);
  assert.equal(first.evidence[0].evidence_url_sanitized, "https://chiangmaihealth.example/index.html");

  const secondSanitized = result.sanitizedBundles.find(
    (bundle) => bundle.incident.incident_id === "INC-M8-002"
  );
  assert.ok(secondSanitized);
  assert.equal(secondSanitized.evidence.length, 0);
});

test("multi-file CSV reports duplicate incident_id in incidents file", () => {
  const result = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.duplicate.csv")
    },
    { now: NOW }
  );

  assert.ok(result.join_errors.some((error) => error.type === "duplicate_incident_id"));
  assert.equal(result.validBundles.length, 0);
});

test("multi-file CSV reports missing incident_id in incidents and child files", () => {
  const fromIncidents = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.missing-id.csv")
    },
    { now: NOW }
  );

  assert.ok(
    fromIncidents.join_errors.some(
      (error) => error.type === "missing_incident_id" && error.entity === "incident"
    )
  );

  const fromEvidence = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.valid.csv"),
      evidenceFile: fixture("incident_evidence.missing-id.csv")
    },
    { now: NOW }
  );

  assert.ok(
    fromEvidence.join_errors.some(
      (error) => error.type === "missing_incident_id" && error.entity === "evidence"
    )
  );
});

test("multi-file CSV reports orphan child rows", () => {
  const result = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.valid.csv"),
      attachmentsFile: fixture("incident_attachments.orphan.csv")
    },
    { now: NOW }
  );

  assert.ok(
    result.join_errors.some(
      (error) =>
        error.type === "orphan_child" &&
        error.entity === "attachment" &&
        error.incident_id === "INC-M8-UNKNOWN"
    )
  );
});

test("multi-file CSV import allows missing optional child files", () => {
  const result = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.valid.csv")
    },
    { now: NOW }
  );

  assert.equal(result.join_errors.length, 0);
  assert.equal(result.validation_errors.length, 0);
  assert.equal(result.validBundles.length, 2);
  assert.equal(result.validBundles.every((bundle) => bundle.attachments.length === 0), true);
  assert.equal(result.validBundles.every((bundle) => bundle.evidence.length === 0), true);
});

test("multi-file CSV strict schema reports unknown and missing required headers", () => {
  const result = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.unknown-header.csv"),
      evidenceFile: fixture("incident_evidence.unknown-header.csv")
    },
    { now: NOW, strictSchema: true }
  );

  assert.ok(
    result.schema_errors.some(
      (error) => error.type === "unknown_header" && error.entity === "incident"
    )
  );
  assert.ok(
    result.schema_errors.some(
      (error) => error.type === "unknown_header" && error.entity === "evidence"
    )
  );
});

test("multi-file CSV strict schema reports missing required header and field", () => {
  const missingHeader = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.missing-required-header.csv")
    },
    { now: NOW, strictSchema: true }
  );

  assert.ok(
    missingHeader.schema_errors.some(
      (error) => error.type === "missing_required_header" && error.entity === "incident"
    )
  );

  const missingField = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.valid.csv"),
      attachmentsFile: fixture("incident_attachments.missing-required-field.csv")
    },
    { now: NOW, strictSchema: true }
  );

  assert.ok(
    missingField.schema_errors.some(
      (error) =>
        error.type === "missing_required_field" &&
        error.entity === "attachment" &&
        error.field === "file_url"
    )
  );
});

test("multi-file CSV default schema version stays backward compatible (v1)", () => {
  const result = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.valid.csv"),
      attachmentsFile: fixture("incident_attachments.valid.csv"),
      evidenceFile: fixture("incident_evidence.valid.csv")
    },
    { now: NOW, strictSchema: true }
  );

  assert.equal(result.schema_version, "v1");
  assert.equal(result.schema_errors.length, 0);
  assert.equal(result.validBundles.length, 2);
});

test("multi-file CSV strict schema supports explicit v1 and v2", () => {
  const v1 = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.valid.csv"),
      attachmentsFile: fixture("incident_attachments.valid.csv"),
      evidenceFile: fixture("incident_evidence.valid.csv")
    },
    { now: NOW, strictSchema: true, schemaVersion: "v1" }
  );

  assert.equal(v1.schema_version, "v1");
  assert.equal(v1.schema_errors.length, 0);

  const v2 = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.v2.valid.csv"),
      attachmentsFile: fixture("incident_attachments.v2.valid.csv"),
      evidenceFile: fixture("incident_evidence.v2.valid.csv")
    },
    { now: NOW, strictSchema: true, schemaVersion: "v2" }
  );

  assert.equal(v2.schema_version, "v2");
  assert.equal(v2.schema_errors.length, 0);
  assert.equal(v2.validBundles.length, 2);
});

test("multi-file CSV fails on invalid schema version", () => {
  assert.throws(
    () =>
      ingestCsvFiles(
        {
          incidentsFile: fixture("incidents.valid.csv")
        },
        { now: NOW, strictSchema: true, schemaVersion: "v3" }
      ),
    /unsupported schema version/
  );
});

test("multi-file CSV strict schema rejects wrong headers for selected version", () => {
  const v2AgainstV1Files = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.valid.csv"),
      attachmentsFile: fixture("incident_attachments.valid.csv"),
      evidenceFile: fixture("incident_evidence.valid.csv")
    },
    { now: NOW, strictSchema: true, schemaVersion: "v2" }
  );

  assert.ok(
    v2AgainstV1Files.schema_errors.some(
      (error) => error.type === "missing_required_header" && error.schema_version === "v2"
    )
  );

  const v1AgainstV2Files = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.v2.valid.csv"),
      attachmentsFile: fixture("incident_attachments.v2.valid.csv"),
      evidenceFile: fixture("incident_evidence.v2.valid.csv")
    },
    { now: NOW, strictSchema: true, schemaVersion: "v1" }
  );

  assert.ok(
    v1AgainstV2Files.schema_errors.some(
      (error) => error.type === "unknown_header" && error.schema_version === "v1"
    )
  );
});
