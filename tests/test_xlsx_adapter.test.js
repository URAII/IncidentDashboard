const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { ingestXlsxWorkbookFile } = require("../src");

const NOW = "2026-05-12T12:00:00.000Z";
const FIXTURE_DIR = path.resolve(__dirname, "..", "fixtures", "xlsx-multifile");

function fixture(fileName) {
  return path.resolve(FIXTURE_DIR, fileName);
}

test("xlsx import maps v2 workbook through existing sanitized dataset contract", () => {
  const result = ingestXlsxWorkbookFile(fixture("incidents.v2.valid.xlsx"), {
    now: NOW,
    strictSchema: true
  });

  assert.equal(result.schema_version, "v2");
  assert.equal(result.schema_errors.length, 0);
  assert.equal(result.join_errors.length, 0);
  assert.equal(result.validation_errors.length, 0);
  assert.equal(result.validBundles.length, 2);

  const first = result.validBundles.find((bundle) => bundle.incident.incident_id === "INC-M10-001");
  assert.ok(first);
  assert.equal(first.incident.summary_sanitized.includes("defacement"), true);
  assert.equal(first.incident.affected_url_sanitized, "https://chiangmaihealth.example/index.html");
  assert.equal(first.attachments[0].file_url.includes("?"), false);
  assert.equal(first.evidence[0].evidence_url_sanitized, "https://chiangmaihealth.example/index.html");
});

test("xlsx real-template workbook imports with v2 header mapping and sanitized-only output", () => {
  const result = ingestXlsxWorkbookFile(fixture("template.v2.real-sanitized.xlsx"), {
    now: NOW,
    strictSchema: true,
    schemaVersion: "v2"
  });

  assert.equal(result.schema_version, "v2");
  assert.equal(result.schema_warnings.length, 0);
  assert.equal(result.schema_errors.length, 0);
  assert.equal(result.join_errors.length, 0);
  assert.equal(result.validation_errors.length, 0);
  assert.equal(result.validBundles.length, 1);
  assert.equal(result.sanitizedBundles.length, 1);

  const bundle = result.validBundles[0];
  assert.equal(bundle.incident.summary_sanitized, "Homepage incident sanitized summary");
  assert.equal(bundle.incident.detection_source, "SOC Monitoring");
  assert.equal(bundle.attachments[0].file_url, "https://cdn.example.moph.go.th/evidence/hero.png");
  assert.equal(bundle.evidence[0].evidence_text_sanitized, "Sanitized analyst note");
  assert.equal(bundle.evidence[0].evidence_url_sanitized, "https://chiangmaihealth.example/index.html");
});

test("xlsx import fails when required sheet is missing", () => {
  assert.throws(
    () => ingestXlsxWorkbookFile(fixture("incidents.v2.missing-sheet.xlsx"), { now: NOW }),
    /missing required sheet: incident_evidence/
  );
});

test("xlsx import strict schema reports wrong header for v2 contract", () => {
  const result = ingestXlsxWorkbookFile(fixture("incidents.v2.wrong-header.xlsx"), {
    now: NOW,
    strictSchema: true,
    schemaVersion: "v2"
  });

  assert.ok(
    result.schema_errors.some(
      (error) =>
        error.type === "missing_required_header" &&
        error.entity === "incident" &&
        error.header === "summary_text_sanitized"
    )
  );
  assert.ok(
    result.schema_errors.some(
      (error) =>
        error.type === "unknown_header" &&
        error.entity === "incident" &&
        error.header === "summary_text_raw"
    )
  );
});

test("xlsx import reports missing incident_id from incident rows", () => {
  const result = ingestXlsxWorkbookFile(fixture("incidents.v2.missing-incident-id.xlsx"), {
    now: NOW,
    strictSchema: true,
    schemaVersion: "v2"
  });

  assert.ok(
    result.join_errors.some(
      (error) => error.type === "missing_incident_id" && error.entity === "incident"
    )
  );
});

test("xlsx import reports duplicate incident_id", () => {
  const result = ingestXlsxWorkbookFile(fixture("incidents.v2.duplicate-incident-id.xlsx"), {
    now: NOW,
    strictSchema: true,
    schemaVersion: "v2"
  });

  assert.ok(result.join_errors.some((error) => error.type === "duplicate_incident_id"));
});

test("xlsx import reports orphan child rows", () => {
  const result = ingestXlsxWorkbookFile(fixture("incidents.v2.orphan-child.xlsx"), {
    now: NOW,
    strictSchema: true,
    schemaVersion: "v2"
  });

  assert.ok(
    result.join_errors.some(
      (error) =>
        error.type === "orphan_child" &&
        error.entity === "attachment" &&
        error.incident_id === "INC-M10-UNKNOWN"
    )
  );
});

test("xlsx import reports unsafe data via existing validation path", () => {
  const result = ingestXlsxWorkbookFile(fixture("incidents.v2.unsafe-data.xlsx"), {
    now: NOW,
    strictSchema: true,
    schemaVersion: "v2"
  });

  assert.equal(result.validation_errors.length > 0, true);
  assert.ok(
    result.validation_errors.some((entry) =>
      entry.errors.some((error) => /blocked secret-like content/i.test(error.message))
    )
  );
});

test("xlsx import accepts empty optional child sheet rows", () => {
  const result = ingestXlsxWorkbookFile(fixture("template.v2.empty-child-sheets.xlsx"), {
    now: NOW,
    strictSchema: true,
    schemaVersion: "v2"
  });

  assert.equal(result.schema_errors.length, 0);
  assert.equal(result.join_errors.length, 0);
  assert.equal(result.validation_errors.length, 0);
  assert.equal(result.validBundles.length, 1);
  assert.equal(result.validBundles[0].attachments.length, 0);
  assert.equal(result.validBundles[0].evidence.length, 0);
});

test("xlsx import strict schema reports header typo in template workbook", () => {
  const result = ingestXlsxWorkbookFile(fixture("template.v2.header-typo.xlsx"), {
    now: NOW,
    strictSchema: true,
    schemaVersion: "v2"
  });

  assert.ok(
    result.schema_errors.some(
      (error) =>
        error.type === "missing_required_header" &&
        error.entity === "incident" &&
        error.header === "summary_text_sanitized"
    )
  );
  assert.ok(
    result.schema_errors.some(
      (error) =>
        error.type === "unknown_header" &&
        error.entity === "incident" &&
        error.header === "summary_text_sanitized_typo"
    )
  );
});

test("xlsx import strict schema reports unknown columns", () => {
  const result = ingestXlsxWorkbookFile(fixture("template.v2.unknown-columns.xlsx"), {
    now: NOW,
    strictSchema: true,
    schemaVersion: "v2"
  });

  assert.ok(
    result.schema_errors.some(
      (error) => error.type === "unknown_header" && error.entity === "incident"
    )
  );
  assert.ok(
    result.schema_errors.some(
      (error) => error.type === "unknown_header" && error.entity === "attachment"
    )
  );
  assert.ok(
    result.schema_errors.some(
      (error) => error.type === "unknown_header" && error.entity === "evidence"
    )
  );
});

test("xlsx import reports date edge case through validation errors", () => {
  const result = ingestXlsxWorkbookFile(fixture("template.v2.date-edge.xlsx"), {
    now: NOW,
    strictSchema: true,
    schemaVersion: "v2"
  });

  assert.equal(result.validation_errors.length > 0, true);
  assert.ok(
    result.validation_errors.some((entry) =>
      entry.errors.some(
        (error) => error.field === "reported_at" && /must be a valid date/i.test(error.message)
      )
    )
  );
});

test("xlsx import ignores blank rows in template workbook", () => {
  const result = ingestXlsxWorkbookFile(fixture("template.v2.blank-rows.xlsx"), {
    now: NOW,
    strictSchema: true,
    schemaVersion: "v2"
  });

  assert.equal(result.schema_errors.length, 0);
  assert.equal(result.join_errors.length, 0);
  assert.equal(result.validation_errors.length, 0);
  assert.equal(result.validBundles.length, 1);
  assert.equal(result.rows_count.incidents, 1);
  assert.equal(result.rows_count.attachments, 1);
  assert.equal(result.rows_count.evidence, 1);
});
