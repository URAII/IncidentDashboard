# ROADMAP.md

## Project Roadmap

This repository now contains a working Node.js prototype for sanitized-only incident tracking and dashboard/report generation for MOPH cyber and web compromise monitoring.

## Core Flow

```text
Master Data -> Incident Form -> Validation -> Workflow -> SLA -> Dashboard -> Report
```

## Current Implementation Status

### Completed in this prototype

- Milestone 1: Project foundation and governance documents
- Milestone 2: Master data source of truth with sample MOPH-oriented fixtures
- Milestone 3: Incident, attachment, and evidence data model validation
- Milestone 4: Sanitization and secret rejection logic
- Milestone 5: Incident form normalization and validation helpers
- Milestone 6: Workflow transition rules and SLA calculation
- Milestone 7: Dashboard-ready aggregate payload and filters
- Milestone 8: Lightweight dashboard UI
- Milestone 9: Executive, SOC, and agency report generation
- Milestone 10: Unit and regression tests plus updated docs/handoff
- Milestone 11: Local spreadsheet CSV ingestion adapter that maps rows to sanitized incident bundles
- Milestone 12 (M8): Multi-file CSV ingestion (`incidents`, `incident_attachments`, `incident_evidence`) + CLI import flow
- Milestone 13 (M9): Strict CSV schema validation per file + CI-safe CLI fail flags (`--strict-schema`, `--fail-on-join-error`, `--fail-on-validation-error`)
- Milestone 14 (M10): CSV schema profile versioning (`v1`, `v2`) + CLI `--schema-version` + version-aware strict validation

### Deferred

- CI pipeline and packaging for deployment
- Direct AppSheet/Google connector integration (production connector still disabled by policy)

## Delivered Assets

- `src/master-data.js`
- `src/sanitization.js`
- `src/validation.js`
- `src/workflow.js`
- `src/sla.js`
- `src/dashboard.js`
- `src/report.js`
- `src/spreadsheet-adapter.js`
- `src/import-csv.js`
- `src/ui-server.js`
- `fixtures/sample-incident-bundles.json`
- `fixtures/sample-incident-import.csv`
- `fixtures/csv-multifile/*`
- `ui/index.html`
- `ui/app.js`
- `ui/app-core.mjs`
- `ui/styles.css`
- `tests/*.test.js`
- `docs/data-model.md`
- `docs/dashboard-contract.md`
- `docs/dashboard-ui.md`
- `docs/sanitization-policy.md`
- `docs/master-data.md`
- `docs/workflow-sla.md`
- `docs/reporting.md`

## Recommended Next Path

1. Add typed `.xlsx` ingestion wrapper that maps to the same versioned schema contract (`v1`/`v2`)
2. Define deprecation policy/timeline for old schema versions and migration guide
3. Decide whether the next step is a persistent data store or AppSheet-safe connector wrapper

## Non-goals for this prototype

- Production authentication and authorization
- Live SIEM or ticketing integrations
- Binary image storage service
- Complex frontend framework before payload consumers are agreed
