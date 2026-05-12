const test = require("node:test");
const assert = require("node:assert/strict");

const { prepareIncidentDataset, buildDashboardPayload, generateReport } = require("../src");
const { sampleBundles, NOW } = require("./fixtures/sample-data");

test("executive markdown report stays sanitized-only", () => {
  const { validBundles } = prepareIncidentDataset(sampleBundles, { now: NOW });
  const payload = buildDashboardPayload(validBundles, { now: NOW });
  const report = generateReport({ type: "executive", format: "markdown", payload });

  assert.equal(report.includes("token="), false);
  assert.equal(report.includes("cookie="), false);
  assert.equal(report.includes("?"), false);
  assert.match(report, /Executive Summary/);
});

test("soc html report escapes content and excludes unsanitized evidence", () => {
  const { validBundles } = prepareIncidentDataset(sampleBundles, { now: NOW });
  const payload = buildDashboardPayload(validBundles, { now: NOW });
  const report = generateReport({ type: "soc", format: "html", payload });

  assert.match(report, /<!doctype html>/i);
  assert.equal(report.includes("Reporter shared a suspicious lure screenshot for review."), false);
});

test("agency markdown report uses fallback text when optional fields are missing", () => {
  const { validBundles } = prepareIncidentDataset(sampleBundles, { now: NOW });
  const payload = buildDashboardPayload(validBundles, {
    now: NOW,
    filters: { workflow_stage: "Waiting for Agency" }
  });
  const report = generateReport({ type: "agency", format: "markdown", payload });

  assert.match(report, /Agency Follow-up Report/);
  assert.equal(report.includes("No sanitized evidence available."), false);
});
