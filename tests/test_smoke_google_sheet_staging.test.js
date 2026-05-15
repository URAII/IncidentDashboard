const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");

function runSmoke(args, env) {
  return spawnSync(
    process.execPath,
    [path.resolve(ROOT, "scripts", "smoke-google-sheet-staging.js"), ...args],
    {
      encoding: "utf8",
      env: env || process.env
    }
  );
}

test("smoke script defaults to dry-run and does not require staging env", () => {
  const run = runSmoke([], {});

  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /mode=dry-run/);
  assert.match(run.stdout, /dry-run complete/i);
});

test("smoke script staging mode skips clearly when env is missing and skip flag is enabled", () => {
  const run = runSmoke(["--staging", "--allow-skip-missing-env"], {});

  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.match(run.stdout, /status=skip/);
  assert.match(run.stdout, /missing required env/);
});

test("smoke script staging mode fails when env is missing and skip flag is not enabled", () => {
  const run = runSmoke(["--staging"], {});

  assert.equal(run.status, 1);
  assert.match(run.stderr, /GOOGLE_SHEETS_STAGING_SPREADSHEET_ID/);
});

test("smoke script logs remain sanitized", () => {
  const run = runSmoke([], {});

  assert.equal(run.status, 0, run.stderr || run.stdout);
  const text = `${run.stdout}\n${run.stderr}`;
  assert.equal(text.includes("token="), false);
  assert.equal(text.includes("password="), false);
  assert.equal(text.includes("Bearer "), false);
});
