const assert = require("node:assert/strict");
const path = require("node:path");

const { ingestXlsxWorkbookFile } = require("../src");

const NOW = "2026-05-12T12:00:00.000Z";
const FIXTURE_DIR = path.resolve(__dirname, "..", "fixtures", "xlsx-multifile");

function fixture(fileName) {
  return path.resolve(FIXTURE_DIR, fileName);
}

function main() {
  const result = ingestXlsxWorkbookFile(fixture("template.v2.real-sanitized.xlsx"), {
    now: NOW,
    strictSchema: true,
    schemaVersion: "v2"
  });

  assert.equal(result.schema_version, "v2");
  assert.equal(result.schema_warnings.length, 0);
  assert.equal(result.schema_errors.length, 0);
  assert.equal(result.join_errors.length, 0);
  assert.equal(result.validation_errors.length, 0);
  assert.equal(result.sanitizedBundles.length > 0, true);

  const warningCount = result.schema_warnings.length;
  const threshold = 0;
  const status = warningCount > threshold ? "fail" : "pass";

  process.stdout.write(
    `Import gate xlsx summary: schema_version=${result.schema_version}, warning_count=${warningCount}, threshold=${threshold}, status=${status}, bundles=${result.sanitizedBundles.length}\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`Import gate xlsx failed: ${error.message}\n`);
  process.exitCode = 1;
}
