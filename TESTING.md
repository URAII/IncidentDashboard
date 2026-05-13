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
5. npm run check:template-drift
6. npm run check:import:v1-compat
7. npm test
```

โดยมีหน้าที่ดังนี้:

- `npm run lint`: ตรวจ JavaScript syntax ของ `src`, `tests`, `ui`, และ `scripts`
- `npm run check:readiness`: ตรวจว่า fixture โหลดได้, dataset validation ผ่าน, dashboard payload สร้างได้, ไม่มี query string/fragment หลุดใน sanitized output fields, และ unsanitized evidence ไม่หลุดเข้า preview
- `npm run check:import:v2`: required import readiness gate สำหรับ `v2` strict schema
- `npm run check:import:xlsx`: required workbook readiness gate สำหรับ `.xlsx` strict schema บน `v2`
- `npm run check:template-drift`: required drift gate สำหรับ workbook template (`v2`)
- `npm run check:import:v1-compat`: compatibility gate สำหรับ `v1` พร้อม deprecated warning และ threshold check
- `npm test`: รัน unit/regression tests ทั้งชุด

### Latest Mac Verification (2026-05-13)

ยืนยันรอบล่าสุดบน Mac:

```bash
npm run check
npm test
```

ผลที่ต้องผ่าน:

- `npm run check` ผ่านครบทุก stage
- `npm test` ผ่าน (`105 pass`, `0 fail`, `0 skipped`) ใน environment นี้

## CI Verification

GitHub Actions workflow:

- `.github/workflows/ci.yml`
- Trigger: `push` และ `pull_request`
- Runtime: `ubuntu-latest` + Node.js `22`
- Dependency install: `npm ci` (with npm cache via `actions/setup-node`)
- Gate command: `npm run check`
- Included import gates in check:
  - `npm run check:import:v2` (required)
  - `npm run check:import:xlsx` (required)
  - `npm run check:template-drift` (required)
  - `npm run check:import:v1-compat` (compatibility)
- CI has explicit required step: `Run Template Drift Governance Gate (Required)`

## Branch Protection Requirement

Required status check before merge:

- `Readiness Check`
- `Run Template Drift Governance Gate (Required)` (step in CI workflow)

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

Template branch rule guidance (for template workbook changes):

1. Require Code Owners review (from `.github/CODEOWNERS`) before merge
2. Require owner review and reviewer approval before merge
3. Require PR checklist artifact update: `fixtures/xlsx-multifile/template-release.v2.json`
4. Require template workbook path review: `fixtures/xlsx-multifile/template.v2.*.xlsx`
5. Block merge if `check:template-drift` fails

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

### Branch Protection Verification Status (2026-05-13)

Verification from real GitHub-connected environment:

- `git remote -v`: `origin` set to `URAII/IncidentDashboard`
- `gh auth status`: pass (active account `URAII`)
- Main branch protection active:
  - required check: `Readiness Check`
  - `require_code_owner_reviews=true`
  - `required_approving_review_count=1`
  - `enforce_admins=true`
- Test PR: `#2` (`test/template-governance` -> `main`)
  - PR template checklist present in PR body
  - controlled fail phase:
    - run `25801850343`: `Run Template Drift Governance Gate (Required)=failure`
    - `Readiness Check` failed and PR merge state `BLOCKED`
  - fix/unblock phase:
    - run `25802028168`: governance gate `success`, readiness gate `success`
    - required check turned green; PR still `BLOCKED` with `REVIEW_REQUIRED` (Code Owners review policy)
  - self-approve attempt blocked by GitHub policy:
    - `Review Can not approve your own pull request`

Conclusion:

- End-to-end branch protection behavior is verified:
  - merge is blocked when required check fails
  - required check can be unblocked after fix
  - final merge remains blocked until Code Owners review requirement is satisfied

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

- default schema version = `v2` (M13 cutover)
- explicit `schemaVersion: "v1"` และ CLI `--schema-version v1`
- explicit `schemaVersion: "v2"` และ CLI `--schema-version v2`
- invalid schema version fail (`unsupported schema version`)
- wrong headers per selected version fail ใน strict mode
- CLI report includes `schema_version`
- schema errors include `schema_version`
- UI server tests มี guard skip เฉพาะ environment ที่ bind `127.0.0.1` ไม่ได้ (คง coverage core logic เดิม)

### 13. Schema Migration + Deprecation Policy (M11)

- deprecated version (`v1`) returns `schema_warnings`
- current version (`v2`) has no deprecation warning
- CLI emits warning when deprecated schema version is selected
- migration mapping docs covered in `docs/schema-migration.md`

### 14. CI Schema Gates + Default v2 Cutover Plan (M12)

- `check:import:v2` ต้องผ่านแบบไม่มี warning/errors
- `check:import:v1-compat` ต้องผ่านและมี deprecated warning
- bad `v2` schema ต้อง fail ใน strict mode
- cutover plan (`current=v2`, `target=v2`, criteria/checklist/rollback) documented

### 15. Default Schema Cutover to v2 (M13)

- default flow resolves to `schema_version=v2`
- default flow has no deprecated warning
- explicit `v1` still passes with deprecated warning
- explicit `v2` passes with no warning

### 16. v1 Deprecation Timeline + Usage Monitoring (M14)

- migration docs include timeline + compatibility window + removal/rollback criteria
- v1 warnings include `schema_version` for monitoring
- v2 flow includes `schema_version` and no deprecation warning
- CLI logs are asserted sanitized-only (no raw token/query/secret leaks)

### 17. v1 Warning Threshold + Removal Prep (M15)

- threshold config:
  - `--max-v1-warnings`
  - `IMPORT_MAX_V1_WARNINGS`
- below threshold -> pass
- over threshold -> fail (explicit threshold-breach behavior)
- summary ต้องมี `schema_version`, `warning_count`, `threshold`, `status`
- docs include v1 removal change set preparation

### 18. XLSX Adapter to v2 Schema Contract (M16)

- workbook `.xlsx` ต้องมี sheets:
  - `incidents`
  - `incident_attachments`
  - `incident_evidence`
- `.xlsx` map เข้า `v2` schema contract เดียวกับ CSV flow
- strict schema/header checks ใช้ profile เดียวกับ CSV
- join/validation errors coverage:
  - missing required sheet
  - wrong header
  - missing `incident_id`
  - duplicate `incident_id`
  - orphan child
  - unsafe data
- CLI `import-xlsx` logs/assertions เป็น sanitized-only

### 19. Real Template Workbook Compatibility (M17)

- sanitized real-template workbook fixture import pass บน `schema_version=v2`
- policy summary ของ xlsx gate ต้องมี:
  - `schema_version`
  - `warning_count`
  - `threshold`
  - `status`
- invalid workbook coverage:
  - missing required sheet
  - header typo
  - empty optional child sheets
  - unknown columns
  - date edge case
  - blank rows
- ทั้ง adapter/CLI tests ยืนยันว่า output/log/error คง sanitized-only

### 20. Automated Template Drift Check (M18)

- compare headers จาก `.xlsx` template กับ `v2` schema contract
- sheet coverage:
  - `incidents`
  - `incident_attachments`
  - `incident_evidence`
- drift coverage:
  - missing required header
  - unknown header
  - duplicate header
  - wrong sheet name
- drift script behavior:
  - no drift => pass
  - drift => fail-fast exit code `2`
  - runtime error => exit code `1`
- drift summary contract:
  - `schema_version`
  - `template_id`
  - `drift_status`
  - `approval_checklist_status`
  - `status`

### 21. Template Release Governance Gate (M19)

- owner approval process required for template release
- checklist must include:
  - `template_owner`
  - `reviewer`
  - `sanitized_sample_workbook`
  - `schema_version=v2`
  - `rollback_plan`
  - `owner_approved=true`
  - `reviewer_approved=true`
- script/exit behavior:
  - valid release => pass
  - drift => fail (`exit=2`)
  - missing fixture => fail (`exit=3`)
  - approval checklist incomplete => fail (`exit=4`)
- logs must remain sanitized-only (no raw URL/token/secret/PII)

### 22. PR Template + Branch Rule for Template Changes (M20)

- PR template path:
  - `.github/pull_request_template.md`
- required checklist items in PR template:
  - owner
  - reviewer
  - sanitized sample workbook
  - `schema_version=v2`
  - `check:template-drift`
  - `check:import:xlsx`
  - no sensitive data
  - rollback plan
- docs must mention branch rule:
  - CI required
  - Code Owners review required
  - owner review + reviewer approval required
  - checklist artifact required
  - block merge on drift fail

### 23. CODEOWNERS for Template Governance (M21)

- `.github/CODEOWNERS` must cover:
  - `fixtures/xlsx-multifile/template.v2.*.xlsx`
  - `fixtures/xlsx-multifile/template-release.v2.json`
- current owner mapping uses real GitHub account: `@URAII`
- docs must mention `Code Owners review` as required for template path changes

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
  test_import_schema_gates.test.js
  test_xlsx_adapter.test.js
  test_import_xlsx_cli.test.js
  test_template_drift_check.test.js
  test_template_pr_docs.test.js
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
- deprecated schema warning contains only sanitized metadata (no raw sensitive payload)
- CI import gates enforce `v2` required + `v1` compatibility during deprecation window
- XLSX gate enforces workbook readiness on `v2` contract
- template drift gate enforces workbook/header contract on `v2`
- CLI stdout/stderr for import flows must not leak raw token/query/secret values
- real-template workbook compatibility must pass before merge

## Test Data Policy

- Use sanitized sample domains and organization IDs only
- Use dummy secret markers such as `password=TEST_PASSWORD_SHOULD_BE_REDACTED`
- Never use real credentials, tokens, cookies, or PII

- PR verification marker: 2026-05-12 branch protection test (no logic change)
