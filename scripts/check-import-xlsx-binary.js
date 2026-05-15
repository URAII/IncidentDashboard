const path = require("node:path");
const assert = require("node:assert/strict");

const { validateXlsxBinaryWorkbook } = require("../src/xlsx-binary-parser");

const FIXTURE_WORKBOOK = path.resolve(
  __dirname,
  "..",
  "tests",
  "fixtures",
  "xlsx-binary",
  "template.v2.binary.valid.xlsx"
);

function main() {
  const result = validateXlsxBinaryWorkbook(FIXTURE_WORKBOOK, {
    strictSchema: true,
    schemaVersion: "v2",
    now: "2026-05-12T12:00:00.000Z"
  });

  assert.equal(result.status, "pass", "binary xlsx gate must pass with valid fixture workbook");
  assert.equal(result.schema_errors.length, 0);
  assert.equal(result.join_errors.length, 0);
  assert.equal(result.validation_errors.length, 0);
  assert.equal(result.workbook_errors.length, 0);

  process.stdout.write(
    `Import gate xlsx binary summary: schema_version=${result.schema_version}, workbook_id=${result.workbook_id}, incidents=${result.rows_count.incidents}, attachments=${result.rows_count.attachments}, evidence=${result.rows_count.evidence}, status=${result.status}\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`Import gate xlsx binary failed: ${error.message}\n`);
  process.exitCode = 1;
}
