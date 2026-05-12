const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const { prepareIncidentDataset, buildDashboardPayload } = require("../src");
const { sampleBundles, NOW } = require("./fixtures/sample-data");

async function loadUiCore() {
  return import(pathToFileURL(path.resolve(__dirname, "../ui/app-core.mjs")).href);
}

test("UI core strips query strings from any display URL defensively", async () => {
  const { sanitizeDisplayUrl } = await loadUiCore();

  assert.equal(
    sanitizeDisplayUrl("https://example.moph.go.th/path?token=abc123&x=1"),
    "https://example.moph.go.th/path"
  );
  assert.equal(sanitizeDisplayUrl("/suspicious/path.php?token=abc123"), "/suspicious/path.php");
});

test("UI core builds metric cards from sanitized payload summary", async () => {
  const { buildMetricCards, buildOverviewCards } = await loadUiCore();
  const { validBundles } = prepareIncidentDataset(sampleBundles, { now: NOW });
  const payload = buildDashboardPayload(validBundles, { now: NOW });

  const metricCards = buildMetricCards(payload);
  const overviewCards = buildOverviewCards(payload, "agency");

  assert.equal(metricCards[0].label, "Total Incidents");
  assert.equal(metricCards[1].value, 3);
  assert.equal(metricCards[5].value, 1);
  assert.equal(overviewCards[0].title, "Workflow Queue");
});

test("UI core provides readable fallbacks for missing optional fields", async () => {
  const { normalizeRecord } = await loadUiCore();

  const record = normalizeRecord({
    incident_id: "INC-X",
    summary_sanitized: "",
    affected_url_sanitized: "https://demo.example/path?token=hidden",
    suspicious_path_sanitized: null,
    primary_image_caption: null,
    primary_image_sanitized_note: null,
    evidence_preview: []
  });

  assert.equal(record.summary_sanitized, "No sanitized data provided.");
  assert.equal(record.affected_url_sanitized, "https://demo.example/path");
  assert.equal(record.suspicious_path_sanitized, "No suspicious path provided.");
  assert.deepEqual(record.evidence_preview, ["No sanitized evidence available."]);
});
