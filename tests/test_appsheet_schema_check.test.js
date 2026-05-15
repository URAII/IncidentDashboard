const test = require("node:test");
const assert = require("node:assert/strict");

const { prepareIncidentDataset } = require("../src/validation");
const { buildSheetExportContract } = require("../src/sheet-export-contract");
const { checkAppSheetCompatibility } = require("../src/appsheet-schema-check");
const { sampleBundles, NOW } = require("./fixtures/sample-data");

test("AppSheet schema check passes with default M25 profile", () => {
  const { validBundles, errors } = prepareIncidentDataset(sampleBundles, { now: NOW });
  assert.equal(errors.length, 0);

  const contract = buildSheetExportContract({ bundles: validBundles, now: NOW });
  const result = checkAppSheetCompatibility({ contract });

  assert.equal(result.compatible, true);
  assert.equal(result.summary.status, "pass");
  assert.equal(result.errors.length, 0);
});

test("AppSheet schema check reports missing columns and key-format mismatch", () => {
  const { validBundles } = prepareIncidentDataset(sampleBundles, { now: NOW });
  const contract = buildSheetExportContract({ bundles: validBundles, now: NOW });

  contract.sheets.incidents.columns = contract.sheets.incidents.columns.filter(
    (column) => column !== "incident_id"
  );
  contract.sheets.incidents.rows[0].incident_id = "INVALID-ID";

  const result = checkAppSheetCompatibility({ contract });

  assert.equal(result.compatible, false);
  assert.ok(result.errors.some((error) => error.type === "missing_column"));
  assert.ok(
    result.errors.some(
      (error) => error.type === "missing_key_column" || error.type === "key_format_mismatch"
    )
  );
});

test("AppSheet schema check output is sanitized-only summary", () => {
  const { validBundles } = prepareIncidentDataset(sampleBundles, { now: NOW });
  const contract = buildSheetExportContract({ bundles: validBundles, now: NOW });
  const result = checkAppSheetCompatibility({ contract });

  const text = JSON.stringify(result);
  assert.equal(text.includes("token="), false);
  assert.equal(text.includes("password="), false);
});
