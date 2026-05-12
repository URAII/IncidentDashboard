const test = require("node:test");
const assert = require("node:assert/strict");

const { transitionWorkflow } = require("../src");
const { sampleBundles, NOW } = require("./fixtures/sample-data");
const { validateIncidentBundle } = require("../src");

test("workflow transition updates status and timestamps", () => {
  const bundle = validateIncidentBundle(sampleBundles[1], { now: NOW }).value;
  const transitioned = transitionWorkflow(bundle.incident, "Resolved", NOW);

  assert.equal(transitioned.workflow_stage, "Resolved");
  assert.equal(transitioned.status, "Resolved");
  assert.equal(transitioned.updated_at, NOW);
});

test("workflow transition to closed sets closed_at", () => {
  const bundle = validateIncidentBundle(sampleBundles[0], { now: NOW }).value;
  const transitioned = transitionWorkflow(bundle.incident, "Closed", NOW);

  assert.equal(transitioned.status, "Closed");
  assert.equal(transitioned.closed_at, NOW);
});

test("invalid workflow transition throws", () => {
  const bundle = validateIncidentBundle(sampleBundles[0], { now: NOW }).value;

  assert.throws(() => transitionWorkflow(bundle.incident, "New", NOW), /Invalid workflow transition/);
});
