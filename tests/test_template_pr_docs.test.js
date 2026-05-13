const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.resolve(ROOT, relativePath), "utf8");
}

test("PR template for template workbook changes contains required checklist items", () => {
  const content = read(".github/pull_request_template.md");

  assert.match(content, /template_owner/i);
  assert.match(content, /reviewer/i);
  assert.match(content, /sanitized_sample_workbook/i);
  assert.match(content, /schema_version.*v2/i);
  assert.match(content, /check:template-drift/i);
  assert.match(content, /check:import:xlsx/i);
  assert.match(content, /rollback_plan/i);
  assert.match(content, /No raw URL query\/token\/secret\/PII/i);
});

test("docs mention required checks and branch rule guidance for template changes", () => {
  const testingDoc = read("TESTING.md");
  const adapterDoc = read("docs/spreadsheet-adapter.md");

  assert.match(testingDoc, /Readiness Check/);
  assert.match(testingDoc, /check:template-drift/);
  assert.match(testingDoc, /check:import:xlsx/);
  assert.match(testingDoc, /Code Owners review/i);
  assert.match(testingDoc, /owner review/i);
  assert.match(testingDoc, /reviewer approval/i);
  assert.match(testingDoc, /block merge.*drift/i);

  assert.match(adapterDoc, /\.github\/pull_request_template\.md/);
  assert.match(adapterDoc, /Code Owners review/i);
  assert.match(adapterDoc, /fixtures\/xlsx-multifile\/template\.v2\.\*\.xlsx/);
  assert.match(adapterDoc, /fixtures\/xlsx-multifile\/template-release\.v2\.json/);
});

test("CODEOWNERS covers template workbook governance paths", () => {
  const codeowners = read(".github/CODEOWNERS");

  assert.match(
    codeowners,
    /\/fixtures\/xlsx-multifile\/template\.v2\.\*\.xlsx\s+@your-org\/template-owners/
  );
  assert.match(
    codeowners,
    /\/fixtures\/xlsx-multifile\/template-release\.v2\.json\s+@your-org\/template-owners/
  );
});

test("PR template and template governance logs do not leak sensitive data", () => {
  const template = read(".github/pull_request_template.md");

  assert.equal(/\?token=/i.test(template), false);
  assert.equal(/token=abc123/i.test(template), false);
  assert.equal(/password=/i.test(template), false);
  assert.equal(/Bearer\s+[A-Za-z0-9._-]+/i.test(template), false);

  const run = spawnSync(process.execPath, [path.resolve(ROOT, "scripts", "check-template-drift.js")], {
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);

  const logText = `${run.stdout}\n${run.stderr}`;
  assert.equal(/\?token=/i.test(logText), false);
  assert.equal(/token=abc123/i.test(logText), false);
  assert.equal(/password=/i.test(logText), false);
  assert.equal(/Bearer\s+[A-Za-z0-9._-]+/i.test(logText), false);
});
