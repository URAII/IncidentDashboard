const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { checkTemplateWorkbookDrift, checkTemplateReleaseGovernance } = require("../src");

const ROOT = path.resolve(__dirname, "..");
const FIXTURE_DIR = path.resolve(ROOT, "fixtures", "xlsx-multifile");

function fixture(fileName) {
  return path.resolve(FIXTURE_DIR, fileName);
}

test("template drift check passes for valid sanitized real-template workbook", () => {
  const result = checkTemplateWorkbookDrift(fixture("template.v2.real-sanitized.xlsx"), {
    schemaVersion: "v2"
  });

  assert.equal(result.schema_version, "v2");
  assert.equal(result.workbook_id, "template.v2.real-sanitized.xlsx");
  assert.equal(result.status, "pass");
  assert.equal(result.drift_count, 0);
  assert.equal(result.drifts.length, 0);
});

test("template drift check reports missing required header", () => {
  const result = checkTemplateWorkbookDrift(fixture("template.v2.header-typo.xlsx"), {
    schemaVersion: "v2"
  });

  assert.equal(result.status, "fail");
  assert.ok(
    result.drifts.some(
      (drift) =>
        drift.sheet_name === "incidents" &&
        drift.drift_type === "missing_required_header" &&
        drift.header === "summary_text_sanitized"
    )
  );
});

test("template drift check reports unknown headers", () => {
  const result = checkTemplateWorkbookDrift(fixture("template.v2.unknown-columns.xlsx"), {
    schemaVersion: "v2"
  });

  assert.equal(result.status, "fail");
  assert.ok(
    result.drifts.some(
      (drift) => drift.sheet_name === "incidents" && drift.drift_type === "unknown_header"
    )
  );
  assert.ok(
    result.drifts.some(
      (drift) =>
        drift.sheet_name === "incident_attachments" && drift.drift_type === "unknown_header"
    )
  );
  assert.ok(
    result.drifts.some(
      (drift) => drift.sheet_name === "incident_evidence" && drift.drift_type === "unknown_header"
    )
  );
});

test("template drift check reports duplicate headers", () => {
  const result = checkTemplateWorkbookDrift(fixture("template.v2.duplicate-headers.xlsx"), {
    schemaVersion: "v2"
  });

  assert.equal(result.status, "fail");
  assert.ok(
    result.drifts.some(
      (drift) =>
        drift.sheet_name === "incidents" &&
        drift.drift_type === "duplicate_header" &&
        drift.header === "summary_text_sanitized"
    )
  );
});

test("template drift check reports wrong sheet names", () => {
  const result = checkTemplateWorkbookDrift(fixture("template.v2.wrong-sheet.xlsx"), {
    schemaVersion: "v2"
  });

  assert.equal(result.status, "fail");
  assert.ok(
    result.drifts.some(
      (drift) => drift.sheet_name === "incidents" && drift.drift_type === "missing_sheet"
    )
  );
  assert.ok(
    result.drifts.some(
      (drift) => drift.sheet_name === "incidentz" && drift.drift_type === "wrong_sheet_name"
    )
  );
});

test("template drift script fail-fast exits with code 2 and sanitized summary", () => {
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "scripts", "check-template-drift.js"),
      "--workbook",
      fixture("template.v2.unknown-columns.xlsx")
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 2);
  assert.match(run.stderr, /TEMPLATE_DRIFT_DETECTED/);
  assert.match(run.stdout, /Template release readiness summary: schema_version=v2/);
  assert.match(run.stdout, /template_id=template.v2.unknown-columns.xlsx/);
  assert.match(run.stdout, /drift_status=fail/);
  assert.match(run.stdout, /approval_checklist_status=pass/);
  assert.match(run.stdout, /schema_version=v2/);
  assert.match(run.stdout, /template_id=template.v2.unknown-columns.xlsx/);
  assert.match(run.stdout, /sheet_name=incidents/);
  assert.match(run.stdout, /drift_type=unknown_header/);
  assert.match(run.stdout, /status=fail/);
});

test("template release governance passes with valid checklist and no drift", () => {
  const result = checkTemplateReleaseGovernance({
    workbookFile: fixture("template.v2.real-sanitized.xlsx"),
    approvalFile: fixture("template-release.v2.json"),
    schemaVersion: "v2"
  });

  assert.equal(result.schema_version, "v2");
  assert.equal(result.template_id, "template.v2.real-sanitized.xlsx");
  assert.equal(result.drift_status, "pass");
  assert.equal(result.approval_checklist_status, "pass");
  assert.equal(result.status, "pass");
});

test("template drift script fails when workbook fixture is missing", () => {
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "scripts", "check-template-drift.js"),
      "--workbook",
      fixture("template.v2.missing-workbook.xlsx")
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 3);
  assert.match(run.stderr, /TEMPLATE_FIXTURE_MISSING/);
});

test("template drift script fails when approval checklist fixture is missing", () => {
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "scripts", "check-template-drift.js"),
      "--approval-file",
      fixture("template-release.v2.missing.json")
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 3);
  assert.match(run.stderr, /TEMPLATE_FIXTURE_MISSING/);
});

test("template drift script logs do not leak raw token/query/secret data", () => {
  const run = spawnSync(
    process.execPath,
    [
      path.resolve(ROOT, "scripts", "check-template-drift.js"),
      "--workbook",
      fixture("incidents.v2.valid.xlsx")
    ],
    { encoding: "utf8" }
  );

  assert.equal(run.status, 0, run.stderr || run.stdout);

  const logText = `${run.stdout}\n${run.stderr}`;
  assert.equal(/\?token=/i.test(logText), false);
  assert.equal(/token=abc123/i.test(logText), false);
  assert.equal(/password=/i.test(logText), false);
  assert.equal(/https:\/\/.*\?/i.test(logText), false);
});
