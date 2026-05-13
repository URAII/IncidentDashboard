# Incident Dashboard Prototype

Lightweight Node.js prototype for a Ministry of Public Health incident dashboard focused on sanitized-only cyber/web compromise records.

## Scope

The prototype covers the full flow:

```text
Master Data -> Incident Form -> Validation -> Workflow -> SLA -> Dashboard -> Report
```

## Safety Principles

- Store and expose sanitized-only findings, evidence, and report content
- Never store or render credentials, cookies, tokens, secrets, raw query strings, or PII
- Keep image binaries outside the `incident` record and use child collections instead
- Exclude unsanitized attachments/evidence from dashboard and report payloads

## Project Structure

```text
src/
  master-data.js
  sanitization.js
  validation.js
  workflow.js
  sla.js
  dashboard.js
  report.js
  index.js
tests/
  *.test.js
  fixtures/sample-data.js
fixtures/
  sample-incident-bundles.json
docs/
  data-model.md
  dashboard-contract.md
  sanitization-policy.md
  master-data.md
  workflow-sla.md
  reporting.md
```

## Run Tests

```bash
node --test
```

## Run Lightweight Dashboard UI

```bash
node src/ui-server.js
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Main Capabilities

- Master data source of truth for organizations, regions, provinces, agency types, incident types, workflow stages, status, and SLA policy
- Incident, attachment, and evidence validation with sanitization-aware normalization
- Workflow transition rules and SLA status calculation by severity
- Dashboard-ready aggregate payload with MOPH-oriented filters
- Lightweight dashboard UI with Executive, SOC, and Agency views backed by the same dashboard payload
- Executive, SOC operations, and agency follow-up reports in Markdown, HTML, or JSON

## Example Usage

```js
const {
  prepareIncidentDataset,
  buildDashboardPayload,
  generateReport
} = require("./src");

const bundles = require("./fixtures/sample-incident-bundles.json");
const { validBundles, errors } = prepareIncidentDataset(bundles, {
  now: "2026-05-12T12:00:00.000Z"
});

if (errors.length) {
  console.error(errors);
}

const payload = buildDashboardPayload(validBundles, {
  filters: { health_region: "Health Region 1", has_image: true },
  now: "2026-05-12T12:00:00.000Z"
});

const report = generateReport({
  type: "executive",
  format: "markdown",
  payload
});

console.log(report);
```
