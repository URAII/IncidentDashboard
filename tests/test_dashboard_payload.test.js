const test = require("node:test");
const assert = require("node:assert/strict");

const { prepareIncidentDataset, buildDashboardPayload } = require("../src");
const { sampleBundles, NOW } = require("./fixtures/sample-data");

test("dashboard payload builds summary cards and aggregates", () => {
  const { validBundles, errors } = prepareIncidentDataset(sampleBundles, { now: NOW });
  const payload = buildDashboardPayload(validBundles, { now: NOW });

  assert.equal(errors.length, 0);
  assert.equal(payload.summary.total_incidents, 4);
  assert.equal(payload.summary.total_findings, 3);
  assert.equal(payload.summary.overdue_sla, 1);
  assert.equal(payload.summary.incidents_with_images, 1);
  assert.equal(payload.summary.image_evidence_items, 1);
  assert.equal(payload.aggregates.by_severity.Critical, 1);
  assert.equal(payload.aggregates.by_status.Closed, 1);
  assert.equal(payload.aggregates.by_workflow_stage.Triage, 1);
  assert.equal(payload.aggregates.by_province["Chiang Mai"], 1);
  assert.equal(payload.aggregates.top_suspicious_paths[0].label.includes("?"), false);
});

test("dashboard payload excludes unsanitized evidence from previews", () => {
  const { validBundles } = prepareIncidentDataset(sampleBundles, { now: NOW });
  const payload = buildDashboardPayload(validBundles, { now: NOW });
  const incident = payload.records.find((record) => record.incident_id === "INC-004");

  assert.equal(incident.sanitized_evidence_count, 0);
  assert.deepEqual(incident.evidence_preview, []);
});
