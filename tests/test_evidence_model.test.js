const test = require("node:test");
const assert = require("node:assert/strict");

const { validateEvidence } = require("../src");
const { sampleBundles } = require("./fixtures/sample-data");

test("evidence validation sanitizes URLs and keeps sanitized text", () => {
  const result = validateEvidence(sampleBundles[0].evidence[0]);

  assert.equal(result.isValid, true);
  assert.equal(result.value.evidence_url_sanitized, "https://chiangmaihealth.example/index.html");
  assert.equal(result.value.evidence_text_sanitized.includes("token="), false);
});

test("evidence validation rejects confidence_score outside accepted range", () => {
  const evidence = structuredClone(sampleBundles[0].evidence[0]);
  evidence.confidence_score = 1.5;

  const result = validateEvidence(evidence);

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === "confidence_score"));
});

test("text evidence requires sanitized narrative content", () => {
  const evidence = structuredClone(sampleBundles[0].evidence[0]);
  evidence.evidence_text_sanitized = "";

  const result = validateEvidence(evidence);

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === "evidence_text_sanitized"));
});
