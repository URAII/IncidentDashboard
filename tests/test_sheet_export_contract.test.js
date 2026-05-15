const test = require("node:test");
const assert = require("node:assert/strict");

const {
  prepareIncidentDataset,
  buildSheetExportContract,
  toGoogleSheetValueRanges
} = require("../src");
const { sampleBundles, NOW } = require("./fixtures/sample-data");

function collectUrlFields(contract) {
  const urls = [];

  for (const row of contract.sheets.incidents.rows) {
    urls.push(row.affected_url_sanitized, row.suspicious_path_sanitized, row.primary_image_url);
  }

  for (const row of contract.sheets.incident_attachments.rows) {
    urls.push(row.file_url_sanitized);
  }

  for (const row of contract.sheets.incident_evidence.rows) {
    urls.push(row.evidence_image_url, row.evidence_url_sanitized);
  }

  return urls.filter(Boolean);
}

test("sheet export contract builds AppSheet/Google Sheet tabs from sanitized dataset", () => {
  const { validBundles, errors } = prepareIncidentDataset(sampleBundles, { now: NOW });
  assert.equal(errors.length, 0);

  const contract = buildSheetExportContract({ bundles: validBundles, now: NOW });

  assert.equal(contract.contract_version, "m24.appsheet_google_sheet.v1");
  assert.deepEqual(contract.platform_targets, ["appsheet", "google_sheets"]);
  assert.equal(contract.summary.incidents, 4);
  assert.equal(contract.summary.incident_attachments, 1);
  assert.equal(contract.summary.incident_evidence, 3);

  const incident4 = contract.sheets.incidents.rows.find((row) => row.incident_id === "INC-004");
  assert.ok(incident4);
  assert.equal(incident4.sanitized_evidence_count, 0);

  for (const url of collectUrlFields(contract)) {
    assert.equal(/[?#]/.test(url), false, `unexpected query/fragment in url field: ${url}`);
  }
});

test("sheet export contract supports filtered export and preserves sheet columns", () => {
  const { validBundles } = prepareIncidentDataset(sampleBundles, { now: NOW });

  const contract = buildSheetExportContract({
    bundles: validBundles,
    now: NOW,
    filters: { organization_id: "ORG-001" }
  });

  assert.equal(contract.summary.incidents, 1);
  assert.equal(contract.sheets.incidents.rows.length, 1);
  assert.equal(contract.sheets.incidents.columns.includes("summary_sanitized"), true);
  assert.equal(contract.sheets.incident_attachments.columns.includes("file_url_sanitized"), true);
  assert.equal(contract.sheets.incident_evidence.columns.includes("evidence_url_sanitized"), true);
});

test("sheet export contract exposes Google Sheet-ready value ranges", () => {
  const { validBundles } = prepareIncidentDataset(sampleBundles, { now: NOW });
  const contract = buildSheetExportContract({ bundles: validBundles, now: NOW });
  const ranges = toGoogleSheetValueRanges(contract);

  assert.ok(Array.isArray(ranges.incidents));
  assert.deepEqual(ranges.incidents[0], contract.sheets.incidents.columns);
  assert.equal(ranges.incidents.length, contract.sheets.incidents.rows.length + 1);

  const flattened = JSON.stringify(ranges);
  assert.equal(flattened.includes("token="), false);
  assert.equal(flattened.includes("password="), false);
});
