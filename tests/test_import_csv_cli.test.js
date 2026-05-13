const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const FIXTURE_DIR = path.resolve(ROOT, "fixtures", "csv-multifile");

function fixture(fileName) {
  return path.resolve(FIXTURE_DIR, fileName);
}

test("import-csv CLI runs with fixture files and writes sanitized-only bundle output", () => {
  const outputPath = path.resolve(os.tmpdir(), `incident-dashboard-import-${Date.now()}.json`);

  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-csv.js"),
      "--incidents",
      fixture("incidents.valid.csv"),
      "--attachments",
      fixture("incident_attachments.valid.csv"),
      "--evidence",
      fixture("incident_evidence.valid.csv"),
      "--out",
      outputPath,
      "--now",
      "2026-05-12T12:00:00.000Z"
    ],
    {
      encoding: "utf8"
    }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.equal(fs.existsSync(outputPath), true);

  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(report.schema_version, "v1");
  assert.equal(report.join_errors.length, 0);
  assert.equal(report.validation_errors.length, 0);
  assert.equal(report.sanitized_bundles_count, 2);

  const record = report.bundles.find((bundle) => bundle.incident.incident_id === "INC-M8-002");
  assert.ok(record);
  assert.equal(record.evidence.length, 0);

  fs.unlinkSync(outputPath);
});

test("import-csv CLI strict schema fails with non-zero exit code on schema errors", () => {
  const outputPath = path.resolve(os.tmpdir(), `incident-dashboard-import-${Date.now()}-strict.json`);
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-csv.js"),
      "--incidents",
      fixture("incidents.unknown-header.csv"),
      "--out",
      outputPath,
      "--strict-schema"
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 1);
  assert.match(run.stderr, /strict_schema_error/);
  assert.equal(fs.existsSync(outputPath), true);

  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(report.schema_errors.length > 0, true);
  assert.equal(report.schema_version, "v1");
  fs.unlinkSync(outputPath);
});

test("import-csv CLI --fail-on-join-error fails when join errors exist", () => {
  const outputPath = path.resolve(
    os.tmpdir(),
    `incident-dashboard-import-${Date.now()}-join-error.json`
  );
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-csv.js"),
      "--incidents",
      fixture("incidents.duplicate.csv"),
      "--out",
      outputPath,
      "--fail-on-join-error"
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 1);
  assert.match(run.stderr, /join_error/);
  fs.unlinkSync(outputPath);
});

test("import-csv CLI --fail-on-validation-error fails when validation errors exist", () => {
  const outputPath = path.resolve(
    os.tmpdir(),
    `incident-dashboard-import-${Date.now()}-validation-error.json`
  );
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-csv.js"),
      "--incidents",
      fixture("incidents.validation-error.csv"),
      "--out",
      outputPath,
      "--fail-on-validation-error"
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 1);
  assert.match(run.stderr, /validation_error/);
  fs.unlinkSync(outputPath);
});

test("import-csv CLI keeps flexible mode backward compatible without fail flags", () => {
  const outputPath = path.resolve(
    os.tmpdir(),
    `incident-dashboard-import-${Date.now()}-flexible.json`
  );
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-csv.js"),
      "--incidents",
      fixture("incidents.duplicate.csv"),
      "--out",
      outputPath
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(report.schema_version, "v1");
  assert.equal(report.join_errors.length > 0, true);
  fs.unlinkSync(outputPath);
});

test("import-csv CLI supports --schema-version v2", () => {
  const outputPath = path.resolve(os.tmpdir(), `incident-dashboard-import-${Date.now()}-v2.json`);
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-csv.js"),
      "--incidents",
      fixture("incidents.v2.valid.csv"),
      "--attachments",
      fixture("incident_attachments.v2.valid.csv"),
      "--evidence",
      fixture("incident_evidence.v2.valid.csv"),
      "--out",
      outputPath,
      "--schema-version",
      "v2",
      "--strict-schema"
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(report.schema_version, "v2");
  assert.equal(report.schema_errors.length, 0);
  assert.equal(report.sanitized_bundles_count, 2);
  fs.unlinkSync(outputPath);
});

test("import-csv CLI fails on invalid --schema-version", () => {
  const outputPath = path.resolve(
    os.tmpdir(),
    `incident-dashboard-import-${Date.now()}-invalid-version.json`
  );
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-csv.js"),
      "--incidents",
      fixture("incidents.valid.csv"),
      "--out",
      outputPath,
      "--schema-version",
      "v3"
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 1);
  assert.match(run.stderr, /unsupported schema version/);
  assert.equal(fs.existsSync(outputPath), false);
});

test("import-csv CLI strict schema fails when headers mismatch selected version", () => {
  const outputPath = path.resolve(
    os.tmpdir(),
    `incident-dashboard-import-${Date.now()}-wrong-version-headers.json`
  );
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-csv.js"),
      "--incidents",
      fixture("incidents.valid.csv"),
      "--out",
      outputPath,
      "--schema-version",
      "v2",
      "--strict-schema"
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 1);
  assert.match(run.stderr, /strict_schema_error/);
  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(report.schema_version, "v2");
  assert.ok(
    report.schema_errors.some(
      (error) =>
        error.type === "missing_required_header" && error.schema_version === "v2"
    )
  );
  fs.unlinkSync(outputPath);
});
