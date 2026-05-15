# HANDOFF.md

## Project Handoff

Project: Incident Dashboard for MOPH Cyber / Web Compromise Monitoring

## Latest Status

### Completed

- Built Node.js prototype covering master data, validation, workflow, SLA, dashboard payload, and report generation
- Added lightweight dashboard UI with Executive, SOC, and Agency views backed by `/api/dashboard`
- Added `incident` metadata support for:
  - `has_image`
  - `primary_image_url`
  - `primary_image_caption`
  - `primary_image_sanitized_note`
- Kept images out of the `incident` record body and modeled them through:
  - `incident_attachment`
  - `incident_evidence`
- Added sanitized-only URL/text handling with secret rejection and PII redaction
- Added dashboard filters for organization, region, province, agency type, incident type, severity, status, SLA, date range, image presence, and workflow stage
- Added executive, SOC, and agency report generators
- Added unit and regression tests using `node --test`
- Added Mac readiness gate scripts: `npm run lint`, `npm run check:readiness`, and `npm run check`
- Added GitHub Actions CI on push/pull_request to run `npm run check` with Node.js `22` and npm cache
- Added local UI server and static frontend assets for browser-based review
- Updated README and `docs/*`

### Not Started

- Direct AppSheet/Google connector integration (production connector still disabled by policy)

## Important Technical Decisions

1. Validation normalizes records against master data and derives `sla_status`
2. Unsanitized child records may exist in storage flow but are excluded from dashboard/report payloads
3. URL query strings and fragments are removed before output
4. Narrative fields that still contain secret-like content are rejected

## Files to Know

- `src/master-data.js`
- `src/validation.js`
- `src/sanitization.js`
- `src/workflow.js`
- `src/sla.js`
- `src/dashboard.js`
- `src/report.js`
- `src/ui-server.js`
- `fixtures/sample-incident-bundles.json`
- `ui/*`
- `tests/*.test.js`

## Test Command

```bash
node --test
```

## Readiness Command

```bash
npm run check
```

## Rollback Notes

If a future change breaks behavior:

1. Revert the affected `src/*.js` module and related tests/docs
2. Re-run `node --test`
3. Confirm no report or dashboard output contains query strings, tokens, secrets, or PII
4. Update this handoff with the rollback reason

## Known Risks

- There is no persistence/database layer yet; current prototype is in-memory/module based
- There is no CI runner yet to enforce regression checks automatically
- UI is currently fixture-backed and does not persist filter state across reloads

## Next Recommended Task

Add strict schema enforcement and connector-safe ingestion flow on top of the current multi-file CSV adapter, while keeping `buildDashboardPayload` as the single dashboard data source.

## Mac Readiness Check (2026-05-12)

### Environment Status on Mac

- Path: `/Users/mmdx/Incident Dashboard`
- Runtime: Node.js `v25.9.0`, npm `11.12.1`
- Package state: no external dependency in `package.json`; `npm install` completed and generated `package-lock.json`
- Layer check: central layer files found except `~/Desktop/.md/skill/skills.md` (missing, non-blocking for this task)
- Readiness summary: prototype is runnable on Mac for test/UI workflows

### Commands Run

```bash
pwd && ls -la
ls -la "/Users/mmdx/Incident Dashboard"
sed -n '1,220p' AGENTS.md
sed -n '1,220p' ROADMAP.md
sed -n '1,220p' HANDOFF.md
sed -n '1,240p' TESTING.md
for f in ~/Desktop/.md/codex/AGENTS.md ~/Desktop/.md/skill/skills.md ~/Desktop/.md/codex/hooks.md ~/Desktop/.md/subagents.md ~/Desktop/.md/plugins.md ~/Desktop/.md/codex/repo-map.md; do if [ -f "$f" ]; then echo "FOUND $f"; else echo "MISSING $f"; fi; done
sed -n '1,240p' ~/Desktop/.md/codex/AGENTS.md
sed -n '1,240p' ~/Desktop/.md/codex/hooks.md
sed -n '1,240p' ~/Desktop/.md/subagents.md
sed -n '1,240p' ~/Desktop/.md/plugins.md
sed -n '1,240p' ~/Desktop/.md/codex/repo-map.md
cat package.json
node -v && npm -v
npm install
npm run
npm test
```

### Test/Build Result

- `npm test`: pass `36/36` (after rerun with non-sandbox permission because UI tests require localhost bind)
- Build script: not present in `package.json` (`npm run build` is not available), so no build execution in this prototype

### Issues Found

1. Sandbox-only issue during test in restricted mode: `listen EPERM 127.0.0.1` in `tests/test_ui_server.test.js`; resolved by running test with elevated permission.
2. Fixture file `fixtures/sample-incident-bundles.json` contains sample URL fields with query strings in input data; however, `src/validation.js` + `src/sanitization.js` sanitize URLs before dashboard output, and test assertions for sanitized-only output pass.
3. Project is not a git repo in current folder (`git status` unavailable), so git-based change tracking is not available in this location.

### Scope Verification Notes

- Checked files: `src/dashboard.js`, `src/ui-server.js`, `fixtures/sample-incident-bundles.json`
- No core logic changes were made.
- No non-sanitized output path was introduced.
- No raw sensitive query/token URL was included in this handoff.

### Next Recommended Task

Add a CI-ready command set for Mac (`npm test` in environment that allows localhost binding) and optionally add a lightweight `build`/`check` script (for example lint/type/smoke packaging) so readiness can be validated in one standard pipeline command.

## Mac Verification Refresh (2026-05-12)

### Mac Environment Status

- Working directory: `/Users/mmdx/Incident Dashboard`
- Node.js: `v25.9.0`
- npm: `11.12.1`
- Git status command: `git status --short` returns `fatal: not a git repository`
- Shared layer files:
  - found: `~/Desktop/.md/codex/AGENTS.md`
  - found: `~/Desktop/.md/codex/hooks.md`
  - found: `~/Desktop/.md/subagents.md`
  - found: `~/Desktop/.md/plugins.md`
  - found: `~/Desktop/.md/codex/repo-map.md`
  - missing: `~/Desktop/.md/skill/skills.md`

### Commands Run

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,220p' ROADMAP.md
sed -n '1,260p' HANDOFF.md
sed -n '1,260p' TESTING.md
for f in ~/Desktop/.md/codex/AGENTS.md ~/Desktop/.md/skill/skills.md ~/Desktop/.md/codex/hooks.md ~/Desktop/.md/subagents.md ~/Desktop/.md/plugins.md ~/Desktop/.md/codex/repo-map.md; do if [ -f "$f" ]; then echo "FOUND $f"; else echo "MISSING $f"; fi; done
pwd
node -v
npm -v
git status --short
cat package.json
npm run
npm install
npm test
sed -n '1,260p' src/dashboard.js
sed -n '1,280p' src/ui-server.js
sed -n '1,260p' fixtures/sample-incident-bundles.json
```

### Dependency Status

- `package.json` has no external dependencies section.
- Scripts defined: `test`, `ui`
- `build`/`lint` scripts are not defined.
- `node_modules` was missing before install in this refresh; `npm install` completed successfully.

### Test/Build Results

- `npm test`: pass (`36/36`)
- `npm run build`: not run (script not defined)
- `npm run lint`: not run (script not defined)

### Files Inspected

- `src/dashboard.js`
- `src/ui-server.js`
- `fixtures/sample-incident-bundles.json`

### Sanitization Notes

- Dashboard output is built from validated bundles and sanitized fields only.
- URL/path sanitization is enforced before output through validation/sanitization flow.
- Unsanitized child evidence is excluded from dashboard evidence preview path.
- This handoff uses sanitized technical summary and does not include raw sensitive URL/query/token values.

### Issues Found

1. Current folder is not a git repository, so `git status --short` cannot track local diffs.
2. `build` and `lint` scripts are not available, limiting readiness checks to test coverage only.
3. One shared layer reference file (`~/Desktop/.md/skill/skills.md`) is missing.

### Remaining Limits

- No CI pipeline to enforce readiness checks automatically.
- No persistent data layer; fixture/in-memory flow only.
- No standardized build/lint gate in npm scripts yet.

### Next Recommended Task

Define `build` and `lint` scripts (or equivalent check scripts) and add CI execution for `npm test` plus those scripts to make Mac readiness validation repeatable in one pipeline.

## Readiness Gate Update (2026-05-12)

### What Changed

- Added `lint` script for syntax validation with `node --check`
- Added `check:readiness` script to validate fixture loading, bundle normalization, sanitized dashboard payload generation, and exclusion of unsanitized evidence from previews
- Added `check` script as the single Mac readiness command

### Commands Run

```bash
cat package.json
sed -n '1,220p' AGENTS.md
sed -n '1,220p' ROADMAP.md
sed -n '1,260p' TESTING.md
sed -n '1,260p' HANDOFF.md
sed -n '1,220p' src/index.js
sed -n '1,260p' src/validation.js
sed -n '1,220p' tests/test_ui_server.test.js
rg --files src tests ui fixtures
npm run lint
npm run check:readiness
npm test
npm run check
```

### Files Updated

- `package.json`
- `scripts/check-readiness.js`
- `TESTING.md`
- `HANDOFF.md`

### Verification Results

- `npm run lint`: pass
- `npm run check:readiness`: pass
- `npm test`: pass (`36/36`)
- `npm run check`: pass

### Sanitization Notes

- Readiness gate checks sanitized output fields only.
- Query strings and fragments are blocked in dashboard readiness output fields.
- Unsanitized evidence remains excluded from preview/count validation path.
- No non-sanitized output path was added.

### Remaining Limits

- No dedicated formatter/style linter; current `lint` is syntax-only by design
- No CI workflow file exists yet to run `npm run check` automatically after future moves or changes

### Next Recommended Task

Add CI automation that runs `npm run check` on every change so Mac readiness and sanitized-output safety stay enforced in one pipeline.

## Mac Readiness Re-Verification (2026-05-12)

### Environment

- Path: `/Users/mmdx/Incident Dashboard`
- Node.js: `v25.9.0`
- npm: `11.12.1`

### Scripts in Use

- `lint`: `node --check src/*.js tests/*.js ui/app.js ui/app-core.mjs scripts/*.js`
- `check:readiness`: `node scripts/check-readiness.js`
- `check`: `npm run lint && npm run check:readiness && npm test`
- `test`: `node --test`

### Commands Run

```bash
pwd
node -v
npm -v
cat package.json
npm run check
npm test
```

### Verification Results

- `npm run check`: pass
- `npm test`: pass (`36/36`)

### Scope & Safety Notes

- No data model changes.
- No dashboard core logic changes.
- No fixture changes.
- No non-sanitized output path was added.

### Risks

- `lint` is syntax-only (no style/static rule set beyond parser checks).
- CI workflow is still not added yet, so enforcement remains manual unless automation is added.

### Next Recommended Task

Add CI workflow execution for `npm run check` so readiness and sanitized-output safety are enforced automatically on each change.

## CI Enablement (2026-05-12)

### What Changed

- Added `.github/workflows/ci.yml`
- CI trigger covers `push` and `pull_request`
- CI runs `npm ci` and `npm run check`
- Node runtime pinned to `22` with npm cache enabled

### Local Verification

```bash
npm run check
npm test
```

- `npm run check`: pass
- `npm test`: pass (`36/36`)

### Workflow Validation

YAML parse validation executed successfully for:

- `.github/workflows/ci.yml`

### Branch Protection Requirement

Required check to enforce before merge:

- `Readiness Check`

Prerequisites:

- Install GitHub CLI: `brew install gh`
- Authenticate CLI: `gh auth login`
- Ensure repository has a valid GitHub remote (`origin`) before using `gh api`
- Ensure CI has emitted check name `Readiness Check` at least one run

GitHub UI setup:

1. Open repository `Settings`
2. Go to `Branches`
3. Add or edit branch protection rule for target branch (`main`/`develop`)
4. Enable `Require status checks to pass before merging`
5. Select `Readiness Check`
6. Save

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

### Next Recommended Task

Add branch protection to require the `Readiness Check` CI job before merge.

## Branch Protection Verification Attempt (2026-05-12)

### Scope

- Validate git remote and GitHub auth from real environment
- Confirm required CI check name
- Verify readiness gate and workflow parse
- Attempt branch protection + PR verification only if prerequisites are met

### Environment Findings

- Working path: `/Users/mmdx/Incident Dashboard`
- `git rev-parse --is-inside-work-tree`: fail (not a git repository)
- `git remote -v`: unavailable in current folder
- `gh --version`: available (`2.92.0`)
- `gh auth status`: fail (active token invalid)

### Verification Results

- Required check name in workflow: `Readiness Check` (confirmed from `.github/workflows/ci.yml`)
- `npm run check`: pass
- `npm test`: pass (`36/36`) via `npm run check`
- `.github/workflows/ci.yml` parse: pass

### Blockers

1. No `.git` repository in current folder, so no real `origin` remote to target.
2. GitHub CLI authentication is invalid, so protected-branch API operations cannot be executed.

### Outcome

- End-to-end verification of branch protection behavior (block before check pass / unblock after pass) is not executable in this environment yet.
- No dashboard/data model/business logic changes were made.

### Next Recommended Task

Prepare a real git repository + valid GitHub authentication, then run branch protection apply and PR block/unblock verification flow using required check `Readiness Check`.

## Current Branch Protection Verification Status (2026-05-12)

### Scope Executed

- Verified GitHub auth and real remote repository state
- Pushed Incident Dashboard codebase + CI workflow to `origin/main`
- Verified GitHub Actions check name `Readiness Check` exists and runs
- Attempted to enforce branch protection on `main`
- Created one verification PR and tested merge behavior

### Commands Run (Sanitized)

```bash
gh auth status
git remote -v
git ls-remote --heads origin
npm run check
git add <project-files> && git commit -m "chore: import incident dashboard codebase and readiness workflow"
git push origin main
gh run list --workflow ci.yml --limit 5 --json databaseId,displayTitle,event,headBranch,status,conclusion,url
gh run view <run-id> --json jobs,url,displayTitle,conclusion,status
gh api repos/<owner>/<repo>/branches/main/protection
gh api -X PUT repos/<owner>/<repo>/branches/main/protection ...
gh api repos/<owner>/<repo>/rulesets
git checkout -b test/pr-protection-verification
git add TESTING.md && git commit -m "docs: add branch protection verification marker"
git push -u origin test/pr-protection-verification
gh pr create --base main --head test/pr-protection-verification --title "docs: branch protection verification PR" --body "<sanitized>"
gh pr view 1 --json number,state,mergeStateStatus,mergeable,statusCheckRollup,url
gh pr checks 1
gh pr merge 1 --squash --delete-branch
```

### Verified Results

- `gh auth status`: pass (logged in)
- Remote repository is reachable and has branch `main`
- `npm run check`: pass
- GitHub Actions workflow `CI` ran successfully on push/PR
- Required check/job name confirmed on GitHub: `Readiness Check`

### Protection Enforcement Result

- Reading and updating branch protection returned `HTTP 403`
- Reading repository rulesets returned `HTTP 403`
- GitHub message indicates branch protection/ruleset feature is unavailable for current repository plan unless repository is public or plan is upgraded

### PR Verification Result

- Test PR was created and merged successfully
- Merge was **not blocked** while check enforcement was not active
- This confirms `Readiness Check` exists, but branch protection requirement is still not enforced at repository settings level

### Remaining Limits

- Cannot complete end-to-end block/unblock verification until repository plan/settings allow branch protection or rulesets

### Next Recommended Task

1. Upgrade repository plan support or make repository public (per policy)
2. Enforce branch protection on `main` with required status check `Readiness Check`
3. Run one new PR verification cycle:
   - expected blocked while required check is pending/failing
   - expected unblocked after `Readiness Check` passes

## Spreadsheet Adapter Update (2026-05-13)

### What Changed

- Added local CSV ingestion adapter: `src/spreadsheet-adapter.js`
- Added adapter exports in `src/index.js`
- Added local CSV fixture: `fixtures/sample-incident-import.csv`
- Added adapter regression tests: `tests/test_spreadsheet_adapter.test.js`
- Updated docs and roadmap for spreadsheet ingestion progress

### Behavior Summary

- CSV rows are mapped to `{ incident, attachments, evidence }` bundles
- All mapped bundles are validated using existing `prepareIncidentDataset` flow
- URL/path fields are sanitized by existing sanitization logic before dashboard/report usage
- Secret-like content in sanitized narrative fields is rejected
- Unsanitized evidence from CSV (`evidence_is_sanitized=false`) is excluded from dashboard preview

### Commands Run

```bash
npm test
npm run check
```

### Verification Result

- `npm test`: pass (`39/39`)
- `npm run check`: pass (lint + readiness + tests)

### Next Recommended Task

Add multi-file spreadsheet ingestion mode (separate incident/attachment/evidence sheets) with key-based join and regression tests for join integrity.

## M8 Multi-file CSV Import + CLI Update (2026-05-13)

### Scope

ต่อยอดจาก single-row CSV adapter เดิมเป็น multi-file join mode พร้อม CLI import

### Changed Files

- `src/spreadsheet-adapter.js`
- `src/import-csv.js`
- `src/index.js`
- `fixtures/csv-multifile/incidents.valid.csv`
- `fixtures/csv-multifile/incident_attachments.valid.csv`
- `fixtures/csv-multifile/incident_evidence.valid.csv`
- `fixtures/csv-multifile/incidents.duplicate.csv`
- `fixtures/csv-multifile/incidents.missing-id.csv`
- `fixtures/csv-multifile/incident_attachments.orphan.csv`
- `fixtures/csv-multifile/incident_evidence.missing-id.csv`
- `tests/test_spreadsheet_multifile.test.js`
- `tests/test_import_csv_cli.test.js`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/spreadsheet-adapter.md`

### Behavior Added

- import `incidents.csv`, `incident_attachments.csv`, `incident_evidence.csv`
- join ด้วย `incident_id`
- รองรับกรณี child files หายได้ (`attachments`/`evidence` optional)
- ตรวจจับ/รายงาน:
  - duplicate incident id
  - missing incident id
  - orphan child
- บังคับผ่าน validation/sanitization เดิม (ไม่ bypass)
- CLI export ใช้ `sanitizedBundles` (child ที่ยังไม่ sanitized จะไม่ถูกส่งออก)

### Tests

คำสั่งที่รัน:

```bash
npm test
npm run check
node src/import-csv.js --incidents fixtures/csv-multifile/incidents.valid.csv --attachments fixtures/csv-multifile/incident_attachments.valid.csv --evidence fixtures/csv-multifile/incident_evidence.valid.csv --out /private/tmp/incident-import-output.json --now 2026-05-12T12:00:00.000Z
```

ผลลัพธ์:

- `npm test`: pass (`45/45`)
- `npm run check`: pass
- CLI: pass, output file generated successfully

### Risks

- CSV schema ยังเป็น flexible mode; หาก header สะกดผิดแต่ไม่ชน required fields บางกรณีจะไป fail ตอน validation แทน fail-fast ตอน parse
- ยังไม่รองรับไฟล์ `.xlsx` ตรง ต้องแปลงเป็น CSV ก่อน

### Next Step

1. เพิ่ม strict schema profile สำหรับ multi-file CSV (กำหนด required columns ต่อไฟล์)
2. เพิ่ม CLI option `--fail-on-join-error` และ `--fail-on-validation-error` สำหรับ pipeline
3. พิจารณา adapter ชั้นต่อไปสำหรับ AppSheet-safe sync โดยยังคง sanitized-only contract

## M9 Strict CSV Schema + CI-safe Flags Update (2026-05-13)

### Scope

ต่อจาก M8 multi-file CSV import + CLI โดยเพิ่ม readiness/check gate สำหรับ schema และ exit behavior แบบ pipeline-safe

### Changed Files

- `src/spreadsheet-adapter.js`
- `src/import-csv.js`
- `tests/test_spreadsheet_multifile.test.js`
- `tests/test_import_csv_cli.test.js`
- `fixtures/csv-multifile/incidents.unknown-header.csv`
- `fixtures/csv-multifile/incidents.missing-required-header.csv`
- `fixtures/csv-multifile/incidents.missing-required-field.csv`
- `fixtures/csv-multifile/incidents.validation-error.csv`
- `fixtures/csv-multifile/incident_attachments.missing-required-field.csv`
- `fixtures/csv-multifile/incident_evidence.unknown-header.csv`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/spreadsheet-adapter.md`
- `HANDOFF.md`

### Behavior Added

- strict schema validation ต่อไฟล์ (`incidents`, `attachments`, `evidence`):
  - `missing_required_header`
  - `unknown_header`
  - `missing_required_field`
- เพิ่ม `schema_errors` ในผลลัพธ์ import
- เพิ่ม CLI flags:
  - `--strict-schema`
  - `--fail-on-join-error`
  - `--fail-on-validation-error`
- strict mode จะ fail (exit non-zero) เมื่อมี `schema_errors`
- fail flags จะ fail ตาม policy ที่ตั้ง
- flexible mode เดิมยังใช้งานได้เมื่อไม่เปิด fail flags

### Commands Run (Sanitized)

```bash
npm test
npm run check
```

### Verification Results

- `npm test`: pass (`51/51`)
- `npm run check`: pass (lint + readiness + tests)
- strict mode fail/exit code: pass (via CLI test)
- flexible mode backward compatibility: pass (via CLI test)

### Sanitization Notes

- schema/join/validation errors รายงานเฉพาะ `entity/header/field/row_number`
- ไม่ dump raw row payload หรือค่า token/secret/PII
- output bundle ยังคงใช้ `sanitizedBundles` เท่านั้น

### Risks / Remaining Limits

1. Strict schema เป็น profile ปัจจุบันแบบ fixed ในโค้ด ยังไม่รองรับ schema versioning
2. `.xlsx` direct ingestion ยังไม่มี ต้องแปลงเป็น CSV ก่อน
3. Local sandbox ที่บล็อก localhost bind อาจทำให้ UI server tests fail; ต้องรันใน environment ที่ bind ได้

### Next Recommended Task

1. เพิ่ม schema profile version (`v1`/`v2`) เพื่อรองรับการเปลี่ยนคอลัมน์ในอนาคต
2. เพิ่ม adapter ชั้น `.xlsx -> strict CSV contract` เพื่อให้ผู้ใช้ไม่ต้องแปลงไฟล์เอง
3. เพิ่ม CI matrix อย่างน้อย 2 Node versions เพื่อยืนยัน readiness gate ข้าม runtime

## M10 CSV Schema Versioning Update (2026-05-13)

### Scope

เพิ่ม schema profile version (`v1`, `v2`) สำหรับ multi-file CSV import โดยคง default backward compatibility เดิม และเพิ่ม CLI `--schema-version`

### Changed Files

- `src/spreadsheet-adapter.js`
- `src/import-csv.js`
- `src/index.js`
- `tests/test_spreadsheet_multifile.test.js`
- `tests/test_import_csv_cli.test.js`
- `tests/test_ui_server.test.js`
- `fixtures/csv-multifile/incidents.v2.valid.csv`
- `fixtures/csv-multifile/incident_attachments.v2.valid.csv`
- `fixtures/csv-multifile/incident_evidence.v2.valid.csv`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/spreadsheet-adapter.md`
- `HANDOFF.md`

### Behavior Added

- schema version profiles:
  - `v1` (default, backward compatible)
  - `v2` (header profile ใหม่ + internal header mapping กลับ canonical fields)
- CLI flag:
  - `--schema-version v1|v2`
- strict schema validation ผูกกับ version ที่เลือก
- `schema_errors` และ output report ระบุ `schema_version`
- invalid schema version จะ fail ทันที (`unsupported schema version`)
- ยังบังคับ flow เดิม: join -> validation -> sanitization โดยไม่ bypass

### UI Test Guard

- เพิ่ม guard ใน `tests/test_ui_server.test.js`:
  - ถ้า bind `127.0.0.1` ไม่ได้ใน sandbox (`EPERM`/`EACCES`) ให้ skip เฉพาะ UI bind tests
  - ไม่ลด coverage core logic ส่วน validation/sanitization/import/report

### Commands Run (Sanitized)

```bash
npm test
npm run check
```

### Verification Results

- `npm test`: pass (`56 pass`, `0 fail`, `2 skipped`)
- `npm run check`: pass (lint + readiness + tests)
- CLI `--schema-version v1|v2`: pass
- invalid `--schema-version`: fail ตามคาด
- wrong headers per version: fail ตามคาดใน strict mode
- default version (`v1`) ยังใช้งานกับ fixtures เดิมได้

### Sanitization Notes

- error/report แสดงเฉพาะข้อมูลโครงสร้าง (`type`, `schema_version`, `entity`, `header`, `field`, `row_number`)
- ไม่ dump raw sensitive URL query/token/secret/PII
- log output path ใน CLI แสดงเฉพาะ `basename` ไม่พิมพ์ absolute path

### Risks / Remaining Limits

1. ยังไม่มี policy deprecation สำหรับ schema version เก่า
2. ยังไม่มี auto-migration helper ระหว่าง `v1` -> `v2`
3. direct `.xlsx` ingestion ยังไม่รองรับ (ต้องแปลงเป็น CSV ก่อน)

### Next Recommended Task

1. เพิ่มเอกสาร migration guide `v1 -> v2` พร้อมตัวอย่าง mapping
2. เพิ่ม deprecation policy + compatibility window ของ schema versions
3. เพิ่ม `.xlsx` adapter ที่ map เข้าสู่ versioned CSV contract เดียวกัน

## M24 AppSheet / Google Sheet Export Contract Update (2026-05-13)

### Done

- Added sanitized-only export contract builder for AppSheet/Google Sheet consumers:
  - `src/sheet-export-contract.js`
- Added CLI for contract generation from local bundle JSON:
  - `src/export-sheet-contract.js`
- Added readiness gate script:
  - `scripts/check-export-contract.js`
- Wired API exports via `src/index.js`:
  - `buildSheetExportContract`
  - `toGoogleSheetValueRanges`
- Extended readiness pipeline in `package.json`:
  - `npm run check:export-contract`
  - `npm run check` now runs lint + readiness + export-contract + test

### Contract Summary

- contract version: `m24.appsheet_google_sheet.v1`
- target tabs:
  - `incidents`
  - `incident_attachments`
  - `incident_evidence`
  - `dashboard_summary`
- policy constraints:
  - export only child rows where `is_sanitized=true`
  - sanitize URL/path fields again before output
  - fail-fast if blocked secret-like patterns remain in output rows
  - reject URL fields that still contain query string or fragment

### Changed Files

- `src/sheet-export-contract.js`
- `src/export-sheet-contract.js`
- `scripts/check-export-contract.js`
- `src/index.js`
- `package.json`
- `tests/test_sheet_export_contract.test.js`
- `tests/test_export_sheet_contract_cli.test.js`
- `docs/appsheet-export-contract.md`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/spreadsheet-adapter.md`
- `HANDOFF.md`

### Commands Run (Sanitized)

```bash
npm test
npm run check
```

### Verification Results

- `npm test`: pass (`63/63`)
- `npm run check`: pass
  - `npm run lint`: pass
  - `npm run check:readiness`: pass
  - `npm run check:export-contract`: pass
  - `npm test`: pass

### Sanitization Notes

- Output contract and CLI logs are sanitized-only.
- CLI output path is logged as filename (`basename`) only.
- Tests assert no raw `token=` or `password=` leakage in contract/CLI output.

### Risks / Remaining Limits

1. M24 delivers contract + CLI only; no direct production connector push to Google APIs yet.
2. Consumer mapping on real AppSheet columns must keep exact field names from contract docs.
3. If future source schema changes, contract columns and consumer mapping must be versioned together.

### Next Recommended Task

1. Add staging connector wrapper that uploads `toGoogleSheetValueRanges(contract)` output to a test spreadsheet.
2. Add schema compatibility check between contract columns and AppSheet table definitions before publish.
3. Add CI job that validates a sample contract artifact against docs column lists.

## M25 Staging Google Sheet Connector + AppSheet Schema Check Update (2026-05-13)

### Done

- Added staging connector wrapper for Google Sheets based on export contract value ranges:
  - `src/google-sheet-connector.js`
- Added AppSheet compatibility checker:
  - `src/appsheet-schema-check.js`
- Added CLI for staging/dry-run export:
  - `src/export-google-sheet.js --input <file> --dry-run|--staging`
- Added sample AppSheet schema profile fixture:
  - `fixtures/appsheet-schema.m25.sample.json`
- Added readiness/import gates:
  - `npm run check:import:v2`
  - `npm run check:import:xlsx`
- Updated `npm run check` pipeline to include new gates before tests.

### Safety/Policy Behaviors

- default mode is `dry-run` (no Google Sheets write)
- staging write requires explicit `--staging`
- staging write requires env:
  - `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`
  - `GOOGLE_APPLICATION_CREDENTIALS`
- no hardcoded credential/token/spreadsheet secret
- logs/output/error are sanitized-only:
  - no raw token/secret/credential/PII
  - spreadsheet id displayed as masked format
- AppSheet compatibility check covers:
  - sheet/table names
  - missing/extra columns
  - key column presence
  - key type/format

### Changed Files

- `src/appsheet-schema-check.js`
- `src/google-sheet-connector.js`
- `src/export-google-sheet.js`
- `src/index.js`
- `scripts/check-import-v2.js`
- `scripts/check-import-xlsx.js`
- `fixtures/appsheet-schema.m25.sample.json`
- `tests/test_appsheet_schema_check.test.js`
- `tests/test_google_sheet_connector.test.js`
- `tests/test_export_google_sheet_cli.test.js`
- `package.json`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/spreadsheet-adapter.md`
- `docs/google-sheet-connector.md`
- `HANDOFF.md`

### Commands Run (Sanitized)

```bash
npm run check:import:v2
npm run check:import:xlsx
npm test
npm run check
```

### Verification Results

- `npm run check:import:v2`: pass
- `npm run check:import:xlsx`: pass
- `npm test`: pass (`73/73`)
- `npm run check`: pass
  - lint: pass
  - readiness: pass
  - import v2 gate: pass
  - import xlsx gate: pass
  - export contract gate: pass
  - tests: pass

### Risks / Remaining Limits

1. Staging connector requires valid Google service account credentials and spreadsheet id at runtime; current tests use dry-run/mock path only.
2. `check:import:xlsx` in this branch validates workbook-style sheet-tab contract compatibility (not direct binary `.xlsx` file parser).
3. Before production-like use, service account sharing/permissions on staging spreadsheet must be configured externally.

### Next Recommended Task

1. Add integration smoke (manual/CI-secured) that runs `export-google-sheet --staging` against a dedicated staging spreadsheet with masked audit output.
2. Add optional drift check between `fixtures/appsheet-schema.m25.sample.json` and real AppSheet table metadata export.
3. Add release policy that blocks staging write when AppSheet schema warnings exceed threshold.

## M26 Staging Google Sheet Smoke + Protected CI Update (2026-05-14)

### Done

- Added staging smoke script:
  - `scripts/smoke-google-sheet-staging.js`
- Added npm command:
  - `npm run smoke:google-sheet:staging`
- Added protected CI smoke job in `.github/workflows/ci.yml`:
  - job name: `Google Sheet Staging Smoke (Protected)`
  - runs after `Readiness Check`
  - prepares credentials only when secret exists
  - skips safely when secrets are not available
- Added M26 tests:
  - `tests/test_smoke_google_sheet_staging.test.js`
  - updated `tests/test_export_google_sheet_cli.test.js` for explicit staging flag behavior

### Changed Files

- `.github/workflows/ci.yml`
- `scripts/smoke-google-sheet-staging.js`
- `package.json`
- `tests/test_smoke_google_sheet_staging.test.js`
- `tests/test_export_google_sheet_cli.test.js`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/google-sheet-connector.md`
- `HANDOFF.md`

### Staging Smoke Behavior

- default connector behavior remains `dry-run`
- staging write requires explicit `--staging`
- staging requires env:
  - `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`
  - `GOOGLE_APPLICATION_CREDENTIALS`
- smoke command uses:
  - `--staging --allow-skip-missing-env`
  - if env missing => prints `status=skip` and exits success

### Protected CI Behavior

- secret-aware setup step writes credential file only when `GOOGLE_APPLICATION_CREDENTIALS_JSON` exists
- exports env via `GITHUB_ENV` without printing secret values
- when secrets are absent, smoke script skip path keeps job green and avoids failing generic PRs

### Environment Verification (Current Machine)

- `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`: `UNSET`
- `GOOGLE_APPLICATION_CREDENTIALS`: `UNSET`
- result: real staging write cannot be executed from this machine now; smoke skip path verified

### Commands Run (Sanitized)

```bash
node --test tests/test_smoke_google_sheet_staging.test.js
node --test tests/test_export_google_sheet_cli.test.js
npm run smoke:google-sheet:staging
node src/export-sheet-contract.js --in fixtures/sample-incident-bundles.json --out /private/tmp/m26-sheet-contract.json --now 2026-05-12T12:00:00.000Z
node src/export-google-sheet.js --input /private/tmp/m26-sheet-contract.json --schema fixtures/appsheet-schema.m25.sample.json --dry-run
node src/export-google-sheet.js --input /private/tmp/m26-sheet-contract.json --schema fixtures/appsheet-schema.m25.sample.json --staging
npm run check:import:v2
npm run check:import:xlsx
npm test
npm run check
```

### Verification Results

- `npm run check:import:v2`: pass
- `npm run check:import:xlsx`: pass
- `npm test`: pass (`78/78`)
- `npm run check`: pass
- `npm run smoke:google-sheet:staging`: skip path pass (env missing)
- dry-run contract export: pass, no Google write
- explicit `--staging` without env: fail-fast as expected

### Sanitization Notes

- logs are summary-only and masked where needed
- no raw credential/token/service-account/secret/PII in output
- spreadsheet id is masked in staging result payload

### Risks / Remaining Limits

1. Real staging write end-to-end remains contingent on runtime env + valid service account permissions.
2. `check:import:xlsx` is still sheet-tab compatibility gate, not direct binary `.xlsx` parser.
3. CI smoke depends on secure secret provisioning and periodic credential rotation policy.

### Next Recommended Task

1. Provision staging secrets in GitHub Actions and run one protected workflow to validate real staging write success path.
2. Add binary `.xlsx` parsing gate if required by upcoming ingestion roadmap.
3. Add credential rotation/audit checklist for service account and staging spreadsheet access.
