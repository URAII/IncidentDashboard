const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const FIXTURE_FILE = path.resolve(ROOT, "fixtures", "sample-incident-bundles.json");

test("export-sheet-contract CLI writes sanitized AppSheet/Google Sheet contract", () => {
  const outputPath = path.resolve(os.tmpdir(), `incident-sheet-contract-${Date.now()}.json`);

  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "export-sheet-contract.js"),
      "--in",
      FIXTURE_FILE,
      "--out",
      outputPath,
      "--now",
      "2026-05-12T12:00:00.000Z"
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.equal(fs.existsSync(outputPath), true);
  assert.match(run.stdout, /Sheet export contract generated:/);
  assert.match(run.stdout, /Output written: incident-sheet-contract-/);

  const contract = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(contract.contract_version, "m24.appsheet_google_sheet.v1");
  assert.equal(contract.summary.incidents, 4);
  assert.equal(contract.summary.incident_evidence, 3);

  const flattened = JSON.stringify(contract);
  assert.equal(flattened.includes("token="), false);
  assert.equal(flattened.includes("password="), false);

  fs.unlinkSync(outputPath);
});

test("export-sheet-contract CLI fails on invalid input bundle payload", () => {
  const invalidInputPath = path.resolve(
    os.tmpdir(),
    `incident-sheet-contract-invalid-${Date.now()}.json`
  );
  const outputPath = path.resolve(
    os.tmpdir(),
    `incident-sheet-contract-invalid-output-${Date.now()}.json`
  );

  fs.writeFileSync(invalidInputPath, JSON.stringify({ not: "array" }));

  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "export-sheet-contract.js"),
      "--in",
      invalidInputPath,
      "--out",
      outputPath
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 1);
  assert.match(run.stderr, /input file must be a JSON array of bundles/);
  assert.equal(fs.existsSync(outputPath), false);

  fs.unlinkSync(invalidInputPath);
});
