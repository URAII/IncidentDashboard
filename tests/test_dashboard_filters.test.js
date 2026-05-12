const test = require("node:test");
const assert = require("node:assert/strict");

const { prepareIncidentDataset, filterIncidentBundles, buildDashboardPayload } = require("../src");
const { sampleBundles, NOW } = require("./fixtures/sample-data");

test("dashboard filters support region, severity, and image flags", () => {
  const { validBundles } = prepareIncidentDataset(sampleBundles, { now: NOW });
  const filtered = filterIncidentBundles(validBundles, {
    health_region: "Health Region 1",
    severity: "Critical",
    has_image: true
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].incident.incident_id, "INC-001");
});

test("dashboard filters support date ranges and empty results", () => {
  const { validBundles } = prepareIncidentDataset(sampleBundles, { now: NOW });
  const payload = buildDashboardPayload(validBundles, {
    now: NOW,
    filters: {
      date_from: "2026-05-12",
      date_to: "2026-05-12",
      province: "Khon Kaen"
    }
  });

  assert.equal(payload.summary.total_incidents, 1);
  assert.equal(payload.records[0].incident_id, "INC-002");

  const emptyPayload = buildDashboardPayload(validBundles, {
    now: NOW,
    filters: { province: "Phuket" }
  });

  assert.equal(emptyPayload.summary.total_incidents, 0);
});

test("dashboard filters support workflow stage", () => {
  const { validBundles } = prepareIncidentDataset(sampleBundles, { now: NOW });
  const payload = buildDashboardPayload(validBundles, {
    now: NOW,
    filters: { workflow_stage: "Waiting for Agency" }
  });

  assert.equal(payload.summary.total_incidents, 1);
  assert.equal(payload.records[0].incident_id, "INC-002");
});
