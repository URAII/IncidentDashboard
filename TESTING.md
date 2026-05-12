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
3. npm test
```

โดยมีหน้าที่ดังนี้:

- `npm run lint`: ตรวจ JavaScript syntax ของ `src`, `tests`, `ui`, และ `scripts`
- `npm run check:readiness`: ตรวจว่า fixture โหลดได้, dataset validation ผ่าน, dashboard payload สร้างได้, ไม่มี query string/fragment หลุดใน sanitized output fields, และ unsanitized evidence ไม่หลุดเข้า preview
- `npm test`: รัน unit/regression tests ทั้งชุด

### Latest Mac Verification (2026-05-12)

ยืนยันรอบล่าสุดบน Mac:

```bash
npm run check
npm test
```

ผลที่ต้องผ่าน:

- `npm run check` ผ่านครบทุก stage
- `npm test` ผ่าน `36/36`

## CI Verification

GitHub Actions workflow:

- `.github/workflows/ci.yml`
- Trigger: `push` และ `pull_request`
- Runtime: `ubuntu-latest` + Node.js `22`
- Dependency install: `npm ci` (with npm cache via `actions/setup-node`)
- Gate command: `npm run check`

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

## Test Data Policy

- Use sanitized sample domains and organization IDs only
- Use dummy secret markers such as `password=TEST_PASSWORD_SHOULD_BE_REDACTED`
- Never use real credentials, tokens, cookies, or PII
