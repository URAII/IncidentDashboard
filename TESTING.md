# TESTING.md

## Testing Guide

The repository uses the built-in Node.js test runner and ships unit plus regression coverage for the prototype modules.

## Main Command

```bash
node --test
```

## Readiness Command

ใช้คำสั่งเดียวนี้หลังย้ายเครื่องหรือก่อนส่งมอบ:

```bash
npm run check
```

คำสั่งนี้จะรันตามลำดับ:

```text
1. npm run lint
2. npm run check:readiness
3. npm run check:import:v2
4. npm run check:import:xlsx
5. npm run check:export-contract
6. npm test
```

โดยมีหน้าที่ดังนี้:

- `npm run lint`: ตรวจ JavaScript syntax ของ `src`, `tests`, `ui`, และ `scripts`
- `npm run check:readiness`: ตรวจว่า fixture โหลดได้, dataset validation ผ่าน, dashboard payload สร้างได้, ไม่มี query string/fragment หลุดใน sanitized output fields, และ unsanitized evidence ไม่หลุดเข้า preview
- `npm run check:import:v2`: ตรวจ strict import gate ของ schema `v2` จาก multi-file CSV fixtures
- `npm run check:import:xlsx`: ตรวจ sheet-tab compatibility (`incidents`, `incident_attachments`, `incident_evidence`) สำหรับ workbook-style contract (ไม่ใช่ binary `.xlsx` parser โดยตรง)
- `npm run check:export-contract`: ตรวจ AppSheet/Google Sheet export contract ว่า sanitized-only และไม่มี query/fragment ใน URL fields
- `npm test`: รัน unit/regression tests ทั้งชุด

### Latest Mac Verification (2026-05-13)

ยืนยันรอบล่าสุดบน Mac:

```bash
npm run check
npm test
```

ผลที่ต้องผ่าน:

- `npm run check` ผ่านครบทุก stage
- `npm test` ผ่าน (`78 pass`, `0 fail`, `0 skipped`) ใน environment นี้

## CI Verification

GitHub Actions workflow:

- `.github/workflows/ci.yml`
- Trigger: `push` และ `pull_request`
- Runtime: `ubuntu-latest` + Node.js `22`
- Dependency install: `npm ci` (with npm cache via `actions/setup-node`)
- Gate command: `npm run check`

## AppSheet/Google Sheet Contract Checks (M24)

- module tests:
  - `tests/test_sheet_export_contract.test.js`
  - `tests/test_export_sheet_contract_cli.test.js`
- `buildSheetExportContract` ต้อง:
  - export เฉพาะ sanitized child rows
  - sanitize URL/path ซ้ำก่อนส่งออก
  - fail เมื่อพบ blocked secret-like content ใน output row
- CLI `src/export-sheet-contract.js` ต้อง:
  - fail เมื่อ input ไม่ใช่ array bundles
  - write contract JSON สำเร็จเมื่อ input ผ่าน validation
  - stdout/stderr ใช้ sanitized summary เท่านั้น

## Staging Google Sheet Connector + AppSheet Schema Checks (M25)

- module tests:
  - `tests/test_appsheet_schema_check.test.js`
  - `tests/test_google_sheet_connector.test.js`
  - `tests/test_export_google_sheet_cli.test.js`
- `export-google-sheet` CLI behavior:
  - default `dry-run` ต้องไม่ยิง API write
  - `--staging` ต้องมี env:
    - `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`
    - `GOOGLE_APPLICATION_CREDENTIALS`
  - ถ้า env ไม่ครบต้อง fail-fast
- AppSheet compatibility check coverage:
  - sheet/table names
  - missing/extra columns
  - key column presence
  - key type/format
- leak prevention:
  - logs/errors ต้องไม่มี raw token/secret/credential/PII

## Staging Smoke + Protected CI (M26)

- smoke command:
  - `npm run smoke:google-sheet:staging`
- smoke behavior:
  - default connector mode ยังคง dry-run หากไม่ใส่ `--staging`
  - smoke command ใช้ `--staging` + `--allow-skip-missing-env`
  - env ไม่ครบ => skip แบบชัดเจนและ exit success
  - env ครบ => attempt staging write จริง
- protected CI behavior:
  - workflow job `Google Sheet Staging Smoke (Protected)` รันหลัง `Readiness Check`
  - ถ้า secret ไม่มี จะ skip โดยไม่ fail PR ทั่วไป
  - ถ้า secret พร้อม จะรัน staging smoke ด้วย credential file ชั่วคราว
- leak prevention:
  - mask spreadsheet id
  - ไม่แสดง credential/service account/token/secret/raw URL/PII ใน log

## Branch Protection Requirement

Required status check before merge:

- `Readiness Check`

Prerequisites before applying protection:

- Homebrew + GitHub CLI installed: `brew install gh`
- GitHub CLI authenticated: `gh auth login`
- Local project is connected to a real GitHub remote repository
- A workflow run has already produced status check `Readiness Check` at least once

Recommended GitHub UI steps:

1. Go to `Settings` -> `Branches` -> `Add branch protection rule`
2. Set branch pattern (for example `main` or `develop`)
3. Enable `Require status checks to pass before merging`
4. Select required check: `Readiness Check`
5. Save rule

Optional `gh` CLI template:

```bash
gh api \
  -X PUT \
  repos/<OWNER>/<REPO>/branches/<BRANCH>/protection \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks.strict=true \
  -f enforce_admins=false \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -f restrictions= \
  -F required_status_checks.contexts[]="Readiness Check"
```

### Branch Protection Verification Status (2026-05-12)

Verification from current environment:

- Required check name in workflow confirmed: `Readiness Check`
- `npm run check`: pass
- `ci.yml` YAML parse: pass
- `git remote -v`: cannot verify (current folder is not a git repository)
- `gh auth status`: failed (invalid token in active account)

Conclusion:

- Branch protection and PR block/unblock behavior cannot be verified end-to-end from this environment until git remote and valid `gh` authentication are available.

## Covered Areas

### 1. Sanitization

- URL query and fragment removal
- suspicious path sanitization
- domain extraction
- PII redaction for email and phone values
- blocked secret detection

### 2. Master Data Validation

- organization lookup
- allowed incident type enforcement
- SLA policy availability

### 3. Incident Model Validation

- required fields
- master data resolution
- `has_image` enforcement
- secret rejection in sanitized narrative fields
- URL and path normalization

### 4. Attachment and Evidence Validation

- allowed attachment/evidence types
- allowed MIME types
- confidence score range
- child record URL sanitization
- secret rejection in captions/notes
- unsanitized child record handling for export exclusion

### 5. Workflow and SLA

- valid transitions
- invalid transitions
- `closed_at` handling
- `within_sla`, `near_due`, `overdue`, and `closed`

### 6. Dashboard Payload

- summary card counts
- aggregate groups
- sanitized top suspicious paths
- exclusion of unsanitized evidence from previews
- filter behavior across region, severity, date range, and image flags

### 7. Reporting

- executive markdown output
- SOC HTML output
- agency follow-up output
- sanitized-only assertions for report content

### 8. Lightweight UI

- dashboard UI helper fallback behavior
- defensive URL sanitization before display
- local UI server API filtering
- static HTML shell serving

### 9. Spreadsheet CSV Adapter

- local CSV parsing with quoted field handling
- row mapping to incident/attachment/evidence bundle structure
- validation + sanitization enforcement through existing dataset flow
- secret-like content rejection for sanitized narrative fields
- unsanitized evidence exclusion from dashboard preview after CSV ingestion

### 10. Multi-file CSV Join + CLI

- join incidents/attachments/evidence by `incident_id`
- duplicate `incident_id` detection in incidents file
- missing `incident_id` detection in incident and child rows
- orphan child detection for non-existing incident references
- optional child file handling when attachment/evidence files are omitted
- CLI export verification for sanitized-only bundle output

### 11. Strict CSV Schema + CI-safe Fail Flags (M9)

- strict schema per file (`incidents`, `attachments`, `evidence`)
- required header checks
- unknown header checks
- missing required field checks
- CLI policy flags:
  - `--strict-schema`
  - `--fail-on-join-error`
  - `--fail-on-validation-error`
- strict mode non-zero exit verification
- flexible mode backward-compatibility verification (no fail flags)

### 12. CSV Schema Versioning (M10)

- default schema version = `v1` (backward compatible)
- explicit `schemaVersion: "v1"` และ CLI `--schema-version v1`
- explicit `schemaVersion: "v2"` และ CLI `--schema-version v2`
- invalid schema version fail (`unsupported schema version`)
- wrong headers per selected version fail ใน strict mode
- CLI report includes `schema_version`
- schema errors include `schema_version`
- UI server tests มี guard skip เฉพาะ environment ที่ bind `127.0.0.1` ไม่ได้ (คง coverage core logic เดิม)

## Test Files

```text
tests/
  test_sanitization.test.js
  test_master_data.test.js
  test_incident_model.test.js
  test_attachment_model.test.js
  test_evidence_model.test.js
  test_workflow.test.js
  test_sla.test.js
  test_dashboard_payload.test.js
  test_dashboard_filters.test.js
  test_report_export.test.js
  test_dashboard_ui_core.test.js
  test_ui_server.test.js
  test_spreadsheet_adapter.test.js
  test_spreadsheet_multifile.test.js
  test_import_csv_cli.test.js
  test_sheet_export_contract.test.js
  test_export_sheet_contract_cli.test.js
  test_appsheet_schema_check.test.js
  test_google_sheet_connector.test.js
  test_export_google_sheet_cli.test.js
  test_smoke_google_sheet_staging.test.js
  fixtures/sample-data.js
```

## Regression Checklist

- No raw query strings in dashboard/report output
- No password, cookie, bearer token, API key, or private key output
- No raw PII output
- Unsanitized child records excluded from dashboard/report previews
- Dashboard aggregates match filtered dataset
- Report generation still succeeds when optional fields are missing
- UI server only exposes sanitized dashboard payloads
- `npm run check` passes on the target Mac environment
- strict schema violations produce `schema_errors` without exposing raw sensitive payload
- CLI fail flags return non-zero exit codes when configured policy conditions are met
- schema version mismatch fails with clear, version-aware error

## Test Data Policy

- Use sanitized sample domains and organization IDs only
- Use dummy secret markers such as `password=TEST_PASSWORD_SHOULD_BE_REDACTED`
- Never use real credentials, tokens, cookies, or PII

- PR verification marker: 2026-05-12 branch protection test (no logic change)
