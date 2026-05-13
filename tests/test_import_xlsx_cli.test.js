const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const FIXTURE_DIR = path.resolve(ROOT, "fixtures", "xlsx-multifile");

function fixture(fileName) {
  return path.resolve(FIXTURE_DIR, fileName);
}

test("import-xlsx CLI default schema is v2 and strict by default", () => {
  const outputPath = path.resolve(os.tmpdir(), `incident-dashboard-xlsx-import-${Date.now()}.json`);
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-xlsx.js"),
      "--workbook",
      fixture("incidents.v2.valid.xlsx"),
      "--out",
      outputPath,
      "--now",
      "2026-05-12T12:00:00.000Z"
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.equal(/deprecated/i.test(run.stderr), false);

  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(report.schema_version, "v2");
  assert.equal(report.schema_errors.length, 0);
  assert.equal(report.join_errors.length, 0);
  assert.equal(report.validation_errors.length, 0);
  assert.equal(report.sanitized_bundles_count, 2);

  fs.unlinkSync(outputPath);
});

test("import-xlsx CLI fails on strict schema mismatch", () => {
  const outputPath = path.resolve(
    os.tmpdir(),
    `incident-dashboard-xlsx-import-${Date.now()}-wrong-header.json`
  );
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-xlsx.js"),
      "--workbook",
      fixture("incidents.v2.wrong-header.xlsx"),
      "--out",
      outputPath
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 1);
  assert.match(run.stderr, /strict_schema_error/);

  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(report.schema_version, "v2");
  assert.equal(report.schema_errors.length > 0, true);
  fs.unlinkSync(outputPath);
});

test("import-xlsx CLI --fail-on-join-error fails when join errors exist", () => {
  const outputPath = path.resolve(os.tmpdir(), `incident-dashboard-xlsx-import-${Date.now()}-join.json`);
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-xlsx.js"),
      "--workbook",
      fixture("incidents.v2.duplicate-incident-id.xlsx"),
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

test("import-xlsx CLI --fail-on-validation-error fails when unsafe data exists", () => {
  const outputPath = path.resolve(os.tmpdir(), `incident-dashboard-xlsx-import-${Date.now()}-validation.json`);
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-xlsx.js"),
      "--workbook",
      fixture("incidents.v2.unsafe-data.xlsx"),
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

test("import-xlsx CLI fails when required sheet is missing", () => {
  const outputPath = path.resolve(os.tmpdir(), `incident-dashboard-xlsx-import-${Date.now()}-sheet.json`);
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-xlsx.js"),
      "--workbook",
      fixture("incidents.v2.missing-sheet.xlsx"),
      "--out",
      outputPath
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 1);
  assert.match(run.stderr, /missing required sheet: incident_evidence/);
  assert.equal(fs.existsSync(outputPath), false);
});

test("import-xlsx CLI logs remain sanitized", () => {
  const outputPath = path.resolve(os.tmpdir(), `incident-dashboard-xlsx-import-${Date.now()}-sanitized.json`);

  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-xlsx.js"),
      "--workbook",
      fixture("incidents.v2.valid.xlsx"),
      "--out",
      outputPath
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);

  const logText = `${run.stdout}\n${run.stderr}`;
  assert.equal(/\?token=/i.test(logText), false);
  assert.equal(/token=abc123/i.test(logText), false);
  assert.equal(/password=/i.test(logText), false);
  assert.equal(/https:\/\/.*\?/i.test(logText), false);

  fs.unlinkSync(outputPath);
});

test("import-xlsx CLI imports sanitized real-template workbook", () => {
  const outputPath = path.resolve(
    os.tmpdir(),
    `incident-dashboard-xlsx-import-${Date.now()}-template.json`
  );
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-xlsx.js"),
      "--workbook",
      fixture("template.v2.real-sanitized.xlsx"),
      "--out",
      outputPath,
      "--schema-version",
      "v2"
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(report.schema_version, "v2");
  assert.equal(report.schema_warnings.length, 0);
  assert.equal(report.schema_errors.length, 0);
  assert.equal(report.join_errors.length, 0);
  assert.equal(report.validation_errors.length, 0);
  assert.equal(report.sanitized_bundles_count, 1);
  assert.equal(report.bundles[0].incident.summary_sanitized, "Homepage incident sanitized summary");

  fs.unlinkSync(outputPath);
});

test("import-xlsx CLI allows empty optional child sheets", () => {
  const outputPath = path.resolve(
    os.tmpdir(),
    `incident-dashboard-xlsx-import-${Date.now()}-empty-child.json`
  );
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-xlsx.js"),
      "--workbook",
      fixture("template.v2.empty-child-sheets.xlsx"),
      "--out",
      outputPath
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(report.bundles[0].attachments.length, 0);
  assert.equal(report.bundles[0].evidence.length, 0);

  fs.unlinkSync(outputPath);
});

test("import-xlsx CLI fails on unknown columns in strict schema", () => {
  const outputPath = path.resolve(
    os.tmpdir(),
    `incident-dashboard-xlsx-import-${Date.now()}-unknown-columns.json`
  );
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-xlsx.js"),
      "--workbook",
      fixture("template.v2.unknown-columns.xlsx"),
      "--out",
      outputPath
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 1);
  assert.match(run.stderr, /strict_schema_error/);

  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.ok(report.schema_errors.some((error) => error.type === "unknown_header"));

  fs.unlinkSync(outputPath);
});

test("import-xlsx CLI date edge case fails with validation policy flag", () => {
  const outputPath = path.resolve(
    os.tmpdir(),
    `incident-dashboard-xlsx-import-${Date.now()}-date-edge.json`
  );
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "src", "import-xlsx.js"),
      "--workbook",
      fixture("template.v2.date-edge.xlsx"),
      "--out",
      outputPath,
      "--fail-on-validation-error"
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 1);
  assert.match(run.stderr, /validation_error/);

  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.ok(report.validation_errors.some((entry) => entry.errors.some((error) => error.field === "reported_at")));

  fs.unlinkSync(outputPath);
});
