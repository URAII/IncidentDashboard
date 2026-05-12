const test = require("node:test");
const assert = require("node:assert/strict");

const { validateIncidentBundle } = require("../src");
const { sampleBundles, NOW } = require("./fixtures/sample-data");

test("valid incident bundle normalizes organization context and sanitized URLs", () => {
  const result = validateIncidentBundle(sampleBundles[0], { now: NOW });

  assert.equal(result.isValid, true);
  assert.equal(result.value.incident.organization_name, "Chiang Mai Provincial Public Health Office");
  assert.equal(
    result.value.incident.affected_url_sanitized,
    "https://chiangmaihealth.example/index.html"
  );
  assert.equal(result.value.incident.suspicious_path_sanitized, "/wp-content/uploads/shell.php");
  assert.equal(result.value.incident.primary_image_url, "https://cdn.example.moph.go.th/evidence/defacement.png");
});

test("incident bundle fails when has_image is true without any image reference", () => {
  const bundle = structuredClone(sampleBundles[1]);
  bundle.incident.has_image = true;

  const result = validateIncidentBundle(bundle, { now: NOW });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === "has_image"));
});

test("incident bundle rejects blocked secret content in sanitized summary", () => {
  const bundle = structuredClone(sampleBundles[0]);
  bundle.incident.summary_sanitized = "password=TEST_PASSWORD_SHOULD_BE_REDACTED";

  const result = validateIncidentBundle(bundle, { now: NOW });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === "summary_sanitized"));
});
