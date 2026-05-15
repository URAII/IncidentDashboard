const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const CONTRACT_INPUT = path.resolve(os.tmpdir(), `sheet-contract-cli-${Date.now()}.json`);

function prepareContractFile() {
  const source = path.resolve(ROOT, "fixtures", "sample-incident-bundles.json");
  const output = CONTRACT_INPUT;

  const run = spawnSync(
    process.execPath,
    [path.resolve(ROOT, "src", "export-sheet-contract.js"), "--in", source, "--out", output],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  return output;
}

test.after(() => {
  if (fs.existsSync(CONTRACT_INPUT)) {
    fs.unlinkSync(CONTRACT_INPUT);
  }
});

test("export-google-sheet CLI dry-run mode is default and does not require env", () => {
  const input = prepareContractFile();

  const run = spawnSync(
    process.execPath,
    [path.resolve(ROOT, "src", "export-google-sheet.js"), "--input", input],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /mode=dry-run/);
  assert.match(run.stdout, /Dry-run completed/);
});

test("export-google-sheet CLI requires explicit --staging flag to attempt staging write", () => {
  const input = prepareContractFile();

  const run = spawnSync(
    process.execPath,
    [path.resolve(ROOT, "src", "export-google-sheet.js"), "--input", input],
    {
      encoding: "utf8",
      env: {
        GOOGLE_SHEETS_STAGING_SPREADSHEET_ID: "sheet-test",
        GOOGLE_APPLICATION_CREDENTIALS: "/tmp/non-existent-service-account.json"
      }
    }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /mode=dry-run/);
  assert.equal(run.stdout.includes("missing required env"), false);
});

test("export-google-sheet CLI staging mode fails when required env is missing", () => {
  const input = prepareContractFile();

  const run = spawnSync(
    process.execPath,
    [path.resolve(ROOT, "src", "export-google-sheet.js"), "--input", input, "--staging"],
    {
      encoding: "utf8",
      env: {}
    }
  );

  assert.equal(run.status, 1);
  assert.match(run.stderr, /GOOGLE_SHEETS_STAGING_SPREADSHEET_ID/);
});

test("export-google-sheet CLI logs remain sanitized", () => {
  const input = prepareContractFile();

  const run = spawnSync(
    process.execPath,
    [path.resolve(ROOT, "src", "export-google-sheet.js"), "--input", input],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);
  const logText = `${run.stdout}\n${run.stderr}`;
  assert.equal(logText.includes("token="), false);
  assert.equal(logText.includes("password="), false);
  assert.equal(logText.includes("Bearer "), false);
});
