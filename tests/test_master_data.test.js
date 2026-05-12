const test = require("node:test");
const assert = require("node:assert/strict");

const { MASTER_DATA, validateIncidentBundle } = require("../src");
const { sampleBundles, NOW } = require("./fixtures/sample-data");

test("master data exposes required source-of-truth collections", () => {
  assert.ok(MASTER_DATA.organizations.length >= 4);
  assert.ok(MASTER_DATA.health_regions.length >= 3);
  assert.ok(MASTER_DATA.sla_policy.Critical.target_hours === 4);
});

test("incident bundle fails when organization_id is missing from master data", () => {
  const bundle = structuredClone(sampleBundles[0]);
  bundle.incident.organization_id = "ORG-999";

  const result = validateIncidentBundle(bundle, { now: NOW });

  assert.equal(result.isValid, false);
  assert.match(result.errors[0].message, /does not exist in master data/i);
});

test("incident bundle fails when incident_type is not allowed", () => {
  const bundle = structuredClone(sampleBundles[0]);
  bundle.incident.incident_type = "Unknown Incident Type";

  const result = validateIncidentBundle(bundle, { now: NOW });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === "incident_type"));
});
