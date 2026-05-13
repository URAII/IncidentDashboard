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

test("import gate script v2 passes as required schema readiness gate", () => {
  const run = spawnSync(process.execPath, [path.resolve(ROOT, "scripts", "check-import-v2.js")], {
    encoding: "utf8"
  });

  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /schema_version=v2/);
  assert.match(run.stdout, /warning_count=0/);
  assert.match(run.stdout, /threshold=0/);
  assert.match(run.stdout, /status=pass/);
  assert.equal(run.stderr, "");
});

test("import gate script xlsx passes as v2 workbook readiness gate", () => {
  const run = spawnSync(
    process.execPath,
    [path.resolve(ROOT, "scripts", "check-import-xlsx.js")],
    {
      encoding: "utf8"
    }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /schema_version=v2/);
  assert.match(run.stdout, /warning_count=0/);
  assert.match(run.stdout, /threshold=0/);
  assert.match(run.stdout, /status=pass/);
  assert.equal(run.stderr, "");
});

test("import gate script v1 compatibility passes below warning threshold", () => {
  const run = spawnSync(
    process.execPath,
    [path.resolve(ROOT, "scripts", "check-import-v1-compat.js"), "--max-v1-warnings", "1"],
    {
      encoding: "utf8"
    }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /schema_version=v1/);
  assert.match(run.stdout, /warning_count=1/);
  assert.match(run.stdout, /threshold=1/);
  assert.match(run.stdout, /status=pass/);
  assert.match(run.stderr, /deprecated/);
});

test("import gate script v1 compatibility fails over warning threshold", () => {
  const run = spawnSync(
    process.execPath,
    [path.resolve(ROOT, "scripts", "check-import-v1-compat.js"), "--max-v1-warnings", "0"],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 2);
  assert.match(run.stdout, /schema_version=v1/);
  assert.match(run.stdout, /warning_count=1/);
  assert.match(run.stdout, /threshold=0/);
  assert.match(run.stdout, /status=fail/);
  assert.match(run.stderr, /V1_WARNING_THRESHOLD_EXCEEDED/);
});

test("bad v2 schema fails in strict mode", () => {
  const outputPath = path.resolve(os.tmpdir(), `incident-dashboard-import-${Date.now()}-bad-v2.json`);
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
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }
});

test("explicit v1 compatibility strict import passes with warning", () => {
  const outputPath = path.resolve(os.tmpdir(), `incident-dashboard-import-${Date.now()}-v1-compat.json`);
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
      "--schema-version",
      "v1",
      "--strict-schema"
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stderr, /deprecated/);

  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(report.schema_version, "v1");
  assert.ok(
    report.schema_warnings.some(
      (warning) =>
        warning.type === "deprecated_schema_version" && warning.schema_version === "v1"
    )
  );

  fs.unlinkSync(outputPath);
});

test("import gate logs do not leak sensitive token or secret patterns", () => {
  const run = spawnSync(
    process.execPath,
    [path.resolve(ROOT, "scripts", "check-import-v1-compat.js"), "--max-v1-warnings", "1"],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);

  const logText = `${run.stdout}\n${run.stderr}`;
  assert.equal(/\?token=/i.test(logText), false);
  assert.equal(/token=abc123/i.test(logText), false);
  assert.equal(/password=/i.test(logText), false);
  assert.equal(/https:\/\/.*\?/i.test(logText), false);
});
