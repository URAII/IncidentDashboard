const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { runTemplateDriftCheck } = require("../src/template-drift-check");

const MANIFEST = path.resolve(
  __dirname,
  "..",
  "fixtures",
  "xlsx-multifile",
  "template-release.v2.json"
);

test("template drift check passes with current sanitized v2 fixture", () => {
  const result = runTemplateDriftCheck({ manifestPath: MANIFEST });

  assert.equal(result.status, "pass");
  assert.equal(result.schema_version, "v2");
  assert.equal(result.counts.missing_required_headers, 0);
  assert.equal(result.counts.unknown_headers, 0);
  assert.equal(result.counts.duplicate_headers, 0);
  assert.equal(result.counts.wrong_sheet_names, 0);
});

test("template drift check fails with missing fixture manifest", () => {
  const missingPath = path.resolve(os.tmpdir(), `missing-template-${Date.now()}.json`);
  const result = runTemplateDriftCheck({ manifestPath: missingPath });

  assert.equal(result.status, "fail");
  assert.equal(result.counts.missing_fixture, 1);
  assert.ok(result.errors.some((entry) => entry.type === "missing_manifest"));
});

test("template drift output stays sanitized", () => {
  const workDir = fs.mkdtempSync(path.resolve(os.tmpdir(), "incident-dashboard-drift-"));
  const manifestPath = path.resolve(workDir, "template-release.v2.json");

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        template_id: "template_v2_sensitive",
        schema_version: "v2",
        workbook_file: "missing-secret-file-token=abc123.xlsx"
      },
      null,
      2
    )
  );

  const result = runTemplateDriftCheck({ manifestPath });
  const serialized = JSON.stringify(result);

  assert.equal(result.status, "fail");
  assert.equal(result.counts.missing_fixture, 1);
  assert.equal(serialized.includes("token=abc123"), false);
});
