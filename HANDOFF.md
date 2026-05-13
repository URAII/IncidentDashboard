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

## M11 Schema Migration + Deprecation Policy (2026-05-13)

### Scope

ต่อจาก M10 schema version (`v1`/`v2`) โดยเพิ่ม migration guide, deprecation policy และ warning behavior สำหรับ deprecated schema version

### Changed Files

- `src/spreadsheet-adapter.js`
- `src/import-csv.js`
- `src/index.js`
- `tests/test_spreadsheet_multifile.test.js`
- `tests/test_import_csv_cli.test.js`
- `docs/schema-migration.md`
- `docs/spreadsheet-adapter.md`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `HANDOFF.md`

### Behavior Added

- schema policy metadata:
  - supported versions: `v1`, `v2`
  - current version: `v2`
  - default version: `v1`
  - deprecated version: `v1`
  - removal criteria (documented)
- deprecated schema warning (`schema_warnings`) ใน import result/report
- CLI warning เมื่อใช้ deprecated version (sanitized-only)
- current version (`v2`) ไม่มี deprecation warning
- เพิ่ม migration guide ใหม่:
  - header mapping `v1 -> v2`
  - required/optional fields แยกตาม version
  - breaking changes / backward compatibility / fallback behavior
  - CI recommendation สำหรับช่วง deprecation

### Commands Run (Sanitized)

```bash
npm test
npm run check
```

### Verification Results

- `npm test`: pass (`58 pass`, `0 fail`, `2 skipped`)
- `npm run check`: pass
- deprecated version warning: pass (API + CLI tests)
- current version no warning: pass (API + CLI tests)
- `--schema-version` invalid: fail ตามคาด (`unsupported schema version`)
- strict mode wrong headers per version: fail ตามคาด

### Sanitization Notes

- warning/log/report ใช้ metadata เท่านั้น (`schema_version`, `current_version`, `type`)
- ไม่แสดง raw URL/token/secret/PII
- CLI output path แสดงเฉพาะ basename

### Risks / Remaining Limits

1. default version ยังเป็น `v1` เพื่อ compatibility ทำให้มี deprecation warning ใน flow default
2. ยังต้องวางแผน cutover default ไป `v2` ใน release ถัดไป
3. direct `.xlsx` ingestion ยังไม่รองรับ

### Next Recommended Task

1. เปลี่ยน default schema ไป `v2` หลังจบ deprecation window และสื่อสาร release note
2. เพิ่ม CI jobs แยก `v2 required gate` + `v1 compatibility gate`
3. เริ่มพัฒนา `.xlsx` adapter ที่ map เข้า schema contract เดียวกัน

## M12 CI Schema Gates + Default v2 Cutover Plan (2026-05-13)

### Scope

เพิ่ม CI/npm import gates สำหรับ schema versions และเอกสาร cutover plan จาก default `v1` ไป `v2`

### Changed Files

- `package.json`
- `scripts/check-import-v2.js`
- `scripts/check-import-v1-compat.js`
- `tests/test_import_schema_gates.test.js`
- `tests/test_import_csv_cli.test.js`
- `tests/test_spreadsheet_multifile.test.js`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/schema-migration.md`
- `docs/spreadsheet-adapter.md`
- `HANDOFF.md`

### Behavior Added

- npm scripts:
  - `npm run check:import:v2`
  - `npm run check:import:v1-compat`
- `npm run check` ถูกผูกให้รัน import gates ทั้ง 2 ตัวก่อน test suite
- `v2` เป็น required import readiness gate
- `v1` เป็น compatibility gate และต้องมี deprecated warning
- เพิ่ม cutover plan documentation:
  - current default: `v1`
  - target default: `v2`
  - cutover criteria
  - checklist
  - rollback plan

### Commands Run (Sanitized)

```bash
npm run check:import:v2
npm run check:import:v1-compat
npm test
npm run check
```

### Verification Results

- `npm run check:import:v2`: pass
- `npm run check:import:v1-compat`: pass + deprecated warning
- `npm test`: pass (`62 pass`, `0 fail`, `2 skipped`)
- `npm run check`: pass
- explicit `v2` pass: verified
- explicit `v1` pass + warning: verified
- bad `v2` schema fail in strict mode: verified
- `v1` compatibility pass: verified

### Sanitization Notes

- warning/log/output แสดงเฉพาะ metadata ที่ sanitized แล้ว (schema version/status)
- ไม่พิมพ์ raw URL/token/secret/PII
- ไม่ bypass validation/sanitization flow เดิม

### Risks / Remaining Limits

1. default schema ยังเป็น `v1` จนกว่าจะ execute cutover criteria ครบ
2. มี UI bind tests ที่อาจ skip ใน sandbox restricted environment (`127.0.0.1` bind blocked)
3. direct `.xlsx` ingestion ยังไม่รองรับ

### Next Recommended Task

1. execute cutover checklist เพื่อเปลี่ยน default schema ไป `v2`
2. เพิ่ม CI matrix/branch policy ให้ monitor import gates แยก (`v2 required`, `v1 compat`) ต่อเนื่อง
3. เพิ่ม `.xlsx` adapter ที่ map เข้า versioned schema contract

## M13 Default Schema Cutover to v2 (2026-05-13)

### Scope

execute cutover checklist จาก `docs/schema-migration.md` และสลับ default schema จาก `v1` ไป `v2` โดยคง explicit `v1` compatibility path ไว้

### Changed Files

- `src/spreadsheet-adapter.js`
- `tests/test_import_csv_cli.test.js`
- `tests/test_spreadsheet_multifile.test.js`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/schema-migration.md`
- `docs/spreadsheet-adapter.md`
- `HANDOFF.md`

### Cutover Execution

- เปลี่ยน `DEFAULT_SCHEMA_VERSION` เป็น `v2`
- default flow (`--schema-version` ไม่ระบุ) ใช้ `v2` และไม่มี deprecation warning
- explicit `--schema-version v1` ยังคงผ่าน และมี deprecated warning
- explicit `--schema-version v2` ผ่านตามปกติ
- คง import gates เดิม:
  - `npm run check:import:v2`
  - `npm run check:import:v1-compat`

### Commands Run (Sanitized)

```bash
npm run check:import:v2
npm run check:import:v1-compat
npm test
npm run check
```

### Verification Results

- `npm run check:import:v2`: pass
- `npm run check:import:v1-compat`: pass + deprecated warning
- `npm test`: pass (`62 pass`, `0 fail`, `2 skipped`)
- `npm run check`: pass
- default schema เป็น `v2` จริง (verified by CLI + adapter tests)

### Sanitization Notes

- warning/log/output ใช้เฉพาะ sanitized metadata (`schema_version`, `warning type`, gate status)
- ไม่มี raw URL query/token/secret/PII ในผลลัพธ์/ข้อความเตือน
- validation/sanitization flow เดิมยังไม่ถูก bypass

### Risks / Remaining Limits

1. แม้ cutover แล้ว ยังต้อง monitor downstream ที่อาจยังส่งไฟล์ `v1`
2. `v1` ยังอยู่ในช่วง compatibility/deprecation window
3. UI bind tests อาจ skip ใน sandbox environment ที่ bind `127.0.0.1` ไม่ได้

### Next Recommended Task

1. ประกาศ deprecation timeline ของ `v1` ให้ผู้ใช้ integration ทราบ
2. monitor CI import gates ต่อเนื่องและเก็บสถิติ `v1` usage
3. เตรียม removal plan ของ `v1` เมื่อครบ removal criteria

## M14 v1 Deprecation Timeline + Usage Monitoring (2026-05-13)

### Scope

ต่อจาก M13 (default schema = `v2`) โดยเพิ่ม deprecation timeline/compatibility window/usage monitoring policy และเพิ่ม tests สำหรับ warning/schema_version + log sanitization

### Changed Files

- `tests/test_import_csv_cli.test.js`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/schema-migration.md`
- `docs/spreadsheet-adapter.md`
- `HANDOFF.md`

### Behavior / Policy Updates

- `docs/schema-migration.md` เพิ่ม:
  - v1 deprecation timeline (start date, compatibility window, freeze point, removal candidate window)
  - compatibility window behavior
  - usage monitoring targets
  - rollback criteria เพิ่มเติม
- CLI/report ยังคงแสดง `schema_version` ทุกครั้ง
- warning behavior:
  - explicit `v1` -> deprecated warning
  - `v2` -> no deprecation warning
- logs/output ยังคง sanitized-only

### Commands Run (Sanitized)

```bash
npm run check:import:v2
npm run check:import:v1-compat
npm test
npm run check
```

### Verification Results

- `npm run check:import:v2`: pass
- `npm run check:import:v1-compat`: pass + deprecated warning
- `npm test`: pass (`63 pass`, `0 fail`, `2 skipped`)
- `npm run check`: pass
- tests added/updated cover:
  - `v1` warning + `schema_version`
  - `v2` no-warning + `schema_version`
  - log sanitization assertions (no token/query/secret leakage)

### Sanitization Notes

- ตรวจ stdout/stderr ไม่พบ `?token=`, `token=abc123`, `password=` หรือ query-bearing URL
- warning/report ใช้ metadata เท่านั้น
- ไม่มี raw URL/token/secret/PII ในข้อความใหม่

### Risks / Remaining Limits

1. compatibility window ของ `v1` ยังต้อง monitor จริงผ่าน CI trend ต่อเนื่อง
2. การถอด `v1` ต้องอาศัยข้อมูล usage และ rollback signals จาก downstream
3. UI bind tests ยังอาจ skip ใน sandbox ที่ bind `127.0.0.1` ไม่ได้

### Next Recommended Task

1. ตั้ง threshold/alert สำหรับ `v1` warning count ใน CI เพื่อกำหนดวัน remove ที่ชัดเจน
2. เริ่มเตรียม change set สำหรับถอด `v1` เมื่อครบ removal criteria
3. เดินหน้าทำ `.xlsx` adapter บน default `v2` schema contract

## M15 CI v1 Warning Threshold + Removal Prep (2026-05-13)

### Scope

ต่อจาก M14 เพิ่ม threshold enforcement สำหรับ v1 deprecated warnings ใน import compatibility gate และเตรียมเอกสาร removal change set

### Changed Files

- `scripts/check-import-v1-compat.js`
- `scripts/check-import-v2.js`
- `tests/test_import_schema_gates.test.js`
- `tests/test_import_csv_cli.test.js`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/schema-migration.md`
- `docs/spreadsheet-adapter.md`
- `HANDOFF.md`

### Behavior Added

- นับ `deprecated_schema_version` warnings ใน `check:import:v1-compat`
- threshold config รองรับ:
  - `--max-v1-warnings`
  - `IMPORT_MAX_V1_WARNINGS`
- ถ้า warning เกิน threshold -> gate fail และคืน exit code ชัดเจน (`2`)
- summary output มาตรฐาน:
  - `schema_version`
  - `warning_count`
  - `threshold`
  - `status`
- `check:import:v2` summary ปรับให้อยู่รูปแบบเดียวกันเพื่อ monitoring

### Removal Prep Documentation

- `docs/schema-migration.md` เพิ่ม:
  - warning threshold enforcement policy
  - usage monitoring targets
  - v1 removal change set prep (files/functions/tests ที่ต้องแก้)
  - communication checklist ก่อน remove
  - rollback plan + rollback criteria

### Commands Run (Sanitized)

```bash
npm run check:import:v2
npm run check:import:v1-compat
npm test
npm run check
```

### Verification Results

- `npm run check:import:v2`: pass
- `npm run check:import:v1-compat`: pass (`warning_count=1`, `threshold=1`, `status=pass`)
- `npm test`: pass (`65 pass`, `0 fail`, `2 skipped`)
- `npm run check`: pass
- tests ใหม่ยืนยัน:
  - below threshold pass
  - over threshold fail
  - v2 no warning pass
  - log ไม่รั่ว sensitive data

### Sanitization Notes

- log assertions ยืนยันไม่พบ `?token=`, `token=abc123`, `password=` หรือ query-bearing URL
- warning/report ใช้ metadata เท่านั้น
- ไม่มี raw URL/token/secret/PII ใน output ใหม่

### Risks / Remaining Limits

1. threshold default ปัจจุบัน (`1`) ยังต้องปรับตาม environment policy จริง
2. warning trend ต้อง monitor ต่อเนื่องก่อนตัดสินใจ remove `v1`
3. UI bind tests ยังอาจ skip ใน sandbox ที่ bind `127.0.0.1` ไม่ได้

### Next Recommended Task

1. กำหนดค่า `IMPORT_MAX_V1_WARNINGS` แยก dev/stage/release และตั้ง alert เมื่อเกิน threshold
2. ทำ dry-run removal branch โดยใช้ change set ใน `docs/schema-migration.md`
3. เดินหน้า `.xlsx` adapter ให้รองรับ monitoring policy บน `v2` default flow

## M16 Update: XLSX Adapter to v2 Schema Contract (2026-05-13)

### Done

- Added `.xlsx` ingestion adapter that reads workbook sheets:
  - `incidents`
  - `incident_attachments`
  - `incident_evidence`
- Mapped `.xlsx` rows into the same schema/validation pipeline as CSV (`ingestCsvRowSets`)
- Kept default schema as `v2`
- Added CLI import command:
  - `node src/import-xlsx.js --workbook <file> --out <file>`
- Added `.xlsx` readiness gate script and wired into `npm run check`
- Added `.xlsx` fixtures and tests for valid/invalid/leak-prevention paths

### Changed Files

- `package.json`
- `src/index.js`
- `src/xlsx-adapter.js`
- `src/import-xlsx.js`
- `scripts/check-import-xlsx.js`
- `fixtures/xlsx-multifile/incidents.v2.valid.xlsx`
- `fixtures/xlsx-multifile/incidents.v2.missing-sheet.xlsx`
- `fixtures/xlsx-multifile/incidents.v2.wrong-header.xlsx`
- `fixtures/xlsx-multifile/incidents.v2.missing-incident-id.xlsx`
- `fixtures/xlsx-multifile/incidents.v2.duplicate-incident-id.xlsx`
- `fixtures/xlsx-multifile/incidents.v2.orphan-child.xlsx`
- `fixtures/xlsx-multifile/incidents.v2.unsafe-data.xlsx`
- `tests/test_xlsx_adapter.test.js`
- `tests/test_import_xlsx_cli.test.js`
- `tests/test_import_schema_gates.test.js`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/spreadsheet-adapter.md`
- `docs/schema-migration.md`

### Commands Run

```bash
npm run lint
node --test tests/test_xlsx_adapter.test.js
node --test tests/test_import_xlsx_cli.test.js
node --test tests/test_import_schema_gates.test.js
npm run check:import:v2
npm run check:import:xlsx
npm run check:import:v1-compat
npm test
npm run check
```

### Verification Results

- `npm run check:import:v2`: pass (`schema_version=v2`, `status=pass`)
- `npm run check:import:xlsx`: pass (`schema_version=v2`, `status=pass`)
- `npm run check:import:v1-compat`: pass (`schema_version=v1`, `warning_count=1`, `threshold=1`, `status=pass`)
- `npm test`: pass (`81/81`, `0 fail`)
- `npm run check`: pass (lint + readiness + import gates + full tests)

### Error Coverage Added (.xlsx)

- missing required sheet
- wrong header / missing required header
- missing `incident_id`
- duplicate `incident_id`
- orphan child
- unsafe data via existing validation path

### Sanitization Notes

- `.xlsx` flow does not bypass existing validation/sanitization policy
- output bundle uses `sanitizedBundles` only
- logs/errors report structural metadata only (no raw sensitive payload dump)
- no raw token/query/secret/PII was added in docs, logs, or CLI output contracts

### Risks / Limits

- `.xlsx` parser uses local `unzip` command; environment running import must have `unzip` available
- compatibility with unusual workbook formats (very custom XML styles) is not targeted in this prototype

### Next Recommended Task

- Add smoke fixtures for real-world workbook templates from upstream source teams (sanitized sample only) to further harden `.xlsx` parser compatibility before connector integration.

## M17 Update: Real Template Workbook Compatibility Test (2026-05-13)

### Done

- Added sanitized real-template workbook fixtures for `.xlsx` compatibility validation on `v2` contract
- Extended XLSX adapter/CLI tests to cover template import + invalid workbook scenarios
- Updated `check:import:xlsx` to validate `template.v2.real-sanitized.xlsx`
- Kept existing gates unchanged:
  - `check:import:v2`
  - `check:import:v1-compat`
  - `check:import:xlsx`

### Changed Files

- `fixtures/xlsx-multifile/template.v2.real-sanitized.xlsx`
- `fixtures/xlsx-multifile/template.v2.empty-child-sheets.xlsx`
- `fixtures/xlsx-multifile/template.v2.header-typo.xlsx`
- `fixtures/xlsx-multifile/template.v2.unknown-columns.xlsx`
- `fixtures/xlsx-multifile/template.v2.date-edge.xlsx`
- `fixtures/xlsx-multifile/template.v2.blank-rows.xlsx`
- `scripts/check-import-xlsx.js`
- `tests/test_xlsx_adapter.test.js`
- `tests/test_import_xlsx_cli.test.js`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/spreadsheet-adapter.md`
- `HANDOFF.md`

### Commands Run

```bash
node --test tests/test_xlsx_adapter.test.js
node --test tests/test_import_xlsx_cli.test.js
node --test tests/test_import_schema_gates.test.js
npm test
npm run check:import:v2
npm run check:import:v1-compat
npm run check:import:xlsx
npm run check
```

### Verification Results

- `template.v2.real-sanitized.xlsx` import: pass (`schema_version=v2`)
- invalid workbook coverage:
  - missing sheet: fail as expected
  - header typo: fail as expected (strict schema)
  - empty child sheets: pass as expected
  - unknown columns: fail as expected (strict schema)
  - date edge case: fail as expected (validation path)
  - blank rows: pass as expected (rows ignored)

### Sanitization Notes

- XLSX output still uses `sanitizedBundles` only
- No raw URL/token/secret/PII added in CLI summary/log/error contracts
- Gate summary remains sanitized and includes:
  - `schema_version`
  - `warning_count`
  - `threshold`
  - `status`

### Risks

- Template compatibility currently validated against sanitized fixtures; future upstream template drift still requires periodic fixture refresh
- XLSX parser depends on `unzip` availability in runtime/CI image

### Next Recommended Task

- Add a template drift detector test that compares workbook headers from upstream producer templates against `v2` contract and fails fast when new/renamed columns appear.

## M18 Update: Automated Template Drift Check (2026-05-13)

### Done

- Added automated drift check for `.xlsx` template headers against `v2` schema contract
- Coverage includes sheets:
  - `incidents`
  - `incident_attachments`
  - `incident_evidence`
- Drift detection implemented:
  - missing required headers
  - unknown headers
  - duplicate headers
  - wrong sheet name
- Added npm script:
  - `npm run check:template-drift`
- Added fail-fast behavior:
  - drift detected => exit code `2`
  - runtime error => exit code `1`
- Added sanitized summary output fields:
  - `schema_version`
  - `workbook_id`
  - `sheet_name`
  - `drift_type`
  - `counts`
  - `status`

### Changed Files

- `src/template-drift.js`
- `src/index.js`
- `scripts/check-template-drift.js`
- `package.json`
- `tests/test_template_drift_check.test.js`
- `fixtures/xlsx-multifile/template.v2.duplicate-headers.xlsx`
- `fixtures/xlsx-multifile/template.v2.wrong-sheet.xlsx`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/spreadsheet-adapter.md`
- `HANDOFF.md`

### Commands Run

```bash
npm run lint
node --test tests/test_template_drift_check.test.js
node scripts/check-template-drift.js
npm run check:template-drift
npm run check:import:v2
npm run check:import:v1-compat
npm run check:import:xlsx
npm test
npm run check
```

### Verification Results

- `npm run check:template-drift`: pass
- `npm run check:import:v2`: pass
- `npm run check:import:v1-compat`: pass
- `npm run check:import:xlsx`: pass
- `npm test`: pass (`98/98`)
- `npm run check`: pass

### Test Coverage Added

- valid no drift
- missing required header drift
- unknown header drift
- duplicate header drift
- wrong sheet name drift
- script fail-fast exit code behavior
- leak prevention (no raw token/query/secret output in logs)

### Sanitization Notes

- Drift check operates on workbook metadata/header only (no raw row dump)
- Logs/summaries avoid raw URL/token/query/secret/PII output
- Output uses sanitized workbook id (basename-safe) only

### Risks

- Drift contract currently tied to `v2`; future schema cutover requires synchronized update of drift checker profile
- Runtime depends on `unzip` availability for workbook parsing

### Next Recommended Task

- Integrate template drift check into upstream template publishing workflow (owner approval + CI gate) to block template releases that break contract.

## M19 Update: Template Release Governance Gate (2026-05-13)

### Done

- Bound `check:template-drift` as template release governance gate in readiness and CI
- Added owner approval checklist validation for template release metadata
- Added sanitized release readiness summary:
  - `schema_version`
  - `template_id`
  - `drift_status`
  - `approval_checklist_status`
  - `status`
- Added explicit CI step: `Run Template Drift Governance Gate (Required)`
- Added release checklist fixture and fail-fast exit code behavior

### Changed Files

- `.github/workflows/ci.yml`
- `src/template-release-governance.js`
- `src/index.js`
- `scripts/check-template-drift.js`
- `fixtures/xlsx-multifile/template-release.v2.json`
- `tests/test_template_drift_check.test.js`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/spreadsheet-adapter.md`
- `HANDOFF.md`

### Commands Run

```bash
npm run lint
node --test tests/test_template_drift_check.test.js
npm run check:template-drift
npm run check:import:v2
npm run check:import:v1-compat
npm run check:import:xlsx
npm test
npm run check
```

### Verification Results

- `npm run check:template-drift`: pass
- `npm run check:import:v2`: pass
- `npm run check:import:v1-compat`: pass
- `npm run check:import:xlsx`: pass
- `npm test`: pass (`101/101`)
- `npm run check`: pass

### Governance Checklist (M19)

Required fields/process for template release:

- `template_owner`
- `reviewer`
- `sanitized_sample_workbook`
- `schema_version=v2`
- `rollback_plan`
- `owner_approved=true`
- `reviewer_approved=true`

### Fail-Fast Exit Codes

- `2`: template drift detected
- `3`: missing workbook/approval fixture
- `4`: approval checklist incomplete

### Upstream Header Change Policy

If upstream template headers change:

1. update fixture/contract/tests/docs to match, or
2. initiate schema `v3` plan before release

### Sanitization Notes

- Governance gate logs only sanitized metadata and counts
- No raw row payload, raw URL query, token, secret, or PII is logged

### Risks

- Governance checklist is metadata-based; operational approvals still depend on process discipline outside code
- Runtime still depends on `unzip` for workbook parsing

### Next Recommended Task

- Add PR template section requiring template owner/reviewer sign-off and link to checklist artifact before merge of template changes.

## M20 Update: PR Template + Branch Rule for Template Changes (2026-05-13)

### Done

- Added PR template for template workbook changes:
  - `.github/pull_request_template.md`
- Checklist now requires:
  - owner
  - reviewer
  - sanitized sample workbook
  - `schema_version=v2`
  - `check:template-drift`
  - `check:import:xlsx`
  - no sensitive data
  - rollback plan
- Added branch rule guidance in docs:
  - require CI `Readiness Check`
  - require owner review + reviewer approval
  - require checklist artifact update
  - block merge when drift gate fails
- Explicitly documented template paths/artifact paths to attach/update:
  - `fixtures/xlsx-multifile/template.v2.*.xlsx`
  - `fixtures/xlsx-multifile/template-release.v2.json`

### Changed Files

- `.github/pull_request_template.md`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/spreadsheet-adapter.md`
- `tests/test_template_pr_docs.test.js`
- `HANDOFF.md`

### Commands Run

```bash
npm run lint
node --test tests/test_template_pr_docs.test.js
npm run check:import:v2
npm run check:import:v1-compat
npm run check:import:xlsx
npm run check:template-drift
npm test
npm run check
```

### Verification Results

- `npm run check:import:v2`: pass
- `npm run check:import:v1-compat`: pass
- `npm run check:import:xlsx`: pass
- `npm run check:template-drift`: pass
- `npm test`: pass (`104/104`)
- `npm run check`: pass

### Test Coverage Added

- PR template contains required checklist items
- docs mention required checks and branch rule guidance
- PR template and template governance logs do not leak raw token/query/secret/PII

### Risks

- Branch rule enforcement still depends on GitHub repository settings being applied consistently in target repo
- PR checklist quality still depends on accurate human input

### Next Recommended Task

- Add repository-level CODEOWNERS mapping for template paths to auto-request template owner + reviewer on template PRs.

## M21 Update: CODEOWNERS for Template Governance (2026-05-13)

### Done

- Added `.github/CODEOWNERS` for template governance paths:
  - `/fixtures/xlsx-multifile/template.v2.*.xlsx`
  - `/fixtures/xlsx-multifile/template-release.v2.json`
- Used placeholder owner mapping (allowed by scope):
  - `@your-org/template-owners`
- Updated docs to require Code Owners review + required template checks/artifact for template PRs
- Added/updated tests to verify:
  - CODEOWNERS path coverage
  - docs mention Code Owners requirement
  - template-related examples/logs remain sanitized-only

### Changed Files

- `.github/CODEOWNERS`
- `.github/pull_request_template.md`
- `README.md`
- `ROADMAP.md`
- `TESTING.md`
- `docs/spreadsheet-adapter.md`
- `tests/test_template_pr_docs.test.js`
- `HANDOFF.md`

### Commands Run

```bash
cat .github/CODEOWNERS
sed -n '1,240p' tests/test_template_pr_docs.test.js
sed -n '1,220p' .github/pull_request_template.md
npm run check
```

### Verification Results

- `npm run check`: pass
- Included gates inside `npm run check`:
  - `npm run check:import:v2`: pass
  - `npm run check:import:v1-compat`: pass
  - `npm run check:import:xlsx`: pass
  - `npm run check:template-drift`: pass
- `npm test`: pass (`105/105`)

### Risks

- Owner mapping is still placeholder (`@your-org/template-owners`) and must be replaced with real team/user handles before production enforcement.
- Branch-level protection still depends on GitHub repository settings being applied in target remote.

### Next Recommended Task

- Replace placeholder CODEOWNERS handles with real owner/reviewer teams in GitHub and enable branch protection that requires Code Owners review + `Readiness Check`.

## M22 Update: GitHub Enforcement Validation (2026-05-13)

### Done

- Updated `.github/CODEOWNERS` from placeholder to real GitHub owner mapping:
  - `/fixtures/xlsx-multifile/template.v2.*.xlsx @URAII`
  - `/fixtures/xlsx-multifile/template-release.v2.json @URAII`
- Verified owner/access on real repo environment:
  - `git remote -v` points to `URAII/IncidentDashboard`
  - `gh auth status` is active for account `URAII`
  - `gh repo view` shows `viewerPermission=ADMIN` on `URAII/IncidentDashboard`
- Enabled main branch protection with GitHub API:
  - require status check: `Readiness Check`
  - require Code Owners review: `true`
  - require PR reviews (`required_approving_review_count=1`)
  - enforce admins: `true`
- Created test branch: `test/template-governance`
- Opened test PR: `#2` (`test/template-governance` -> `main`)
- Verified PR template checklist is present in PR body
- Verified block/unblock behavior with controlled template release checklist change:
  - fail phase: `owner_approved=false` -> `Run Template Drift Governance Gate (Required)=failure` -> required check fail -> PR blocked
  - fix phase: restore `owner_approved=true` -> required checks pass
- Verified Code Owners review enforcement remains active after checks pass:
  - PR state still `BLOCKED` with `REVIEW_REQUIRED`
  - self-approval attempt rejected: `Review Can not approve your own pull request`

### Changed Files

- `.github/CODEOWNERS`
- `fixtures/xlsx-multifile/template-release.v2.json`
- `tests/test_template_pr_docs.test.js`
- `README.md`
- `docs/spreadsheet-adapter.md`
- `TESTING.md`
- `HANDOFF.md`

### Commands Run (M22)

```bash
# baseline checks
sed -n '1,220p' AGENTS.md
sed -n '1,260p' ROADMAP.md
sed -n '1,260p' HANDOFF.md
sed -n '1,260p' TESTING.md
git remote -v
gh auth status
gh repo view URAII/IncidentDashboard --json viewerPermission,defaultBranchRef,nameWithOwner

# codeowners + protection
cat > .github/CODEOWNERS ...
git add .github/CODEOWNERS
git commit -m "chore: set real codeowner mapping for template governance" -- .github/CODEOWNERS
git push origin main
gh api -X PUT repos/URAII/IncidentDashboard/branches/main/protection --input /tmp/branch-protection.json
gh api repos/URAII/IncidentDashboard/branches/main/protection --jq '{...}'

# PR enforcement validation
git switch -c test/template-governance
git add -A && git commit -m "feat: add schema/template governance gates with failing template release for enforcement test"
git push -u origin test/template-governance
gh pr create --base main --head test/template-governance --title "test: template governance enforcement validation" ...
gh pr edit 2 --body-file /tmp/pr2-body.md
gh run view 25801850343 --json conclusion,jobs --jq '{...}'

# unblock fix
git add tests/test_template_pr_docs.test.js README.md docs/spreadsheet-adapter.md TESTING.md fixtures/xlsx-multifile/template-release.v2.json
git commit -m "fix: restore template approval and align docs/tests with real codeowner"
git push origin test/template-governance
gh run view 25802028168 --json conclusion,jobs --jq '{...}'
gh pr view 2 --json mergeStateStatus,reviewDecision,statusCheckRollup
gh pr review 2 --approve --body "Codeowners policy verification approval."

# local validation
npm run check
npm test
npm run check:import:v2
npm run check:import:v1-compat
npm run check:import:xlsx
npm run check:template-drift
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/ci.yml"); puts "ci.yml parse ok"'
```

### Verification Results

- `npm run check`: pass
- `npm test`: pass (`105/105`)
- `npm run check:import:v2`: pass
- `npm run check:import:v1-compat`: pass (with expected deprecated warning)
- `npm run check:import:xlsx`: pass
- `npm run check:template-drift`: pass
- `ci.yml` parse: pass (`ci.yml parse ok`)
- Branch protection query confirms:
  - required check `Readiness Check`
  - Code Owners review required
  - PR reviews required
- PR #2 fail phase:
  - run `25801850343`: `gate_step=failure`, `run_conclusion=failure`
- PR #2 unblock phase:
  - run `25802028168`: `gate_step=success`, `readiness_step=success`, `run_conclusion=success`
  - required checks are green
- Merge policy state after green checks:
  - PR still `BLOCKED` with `REVIEW_REQUIRED` until Code Owners review condition is met

### Sanitization Notes

- All evidence/log summaries in this update use sanitized-only text.
- No raw token/query/credential/cookie/PII was added to code, fixtures, docs, or PR body.

### Risks

- PR #2 cannot be fully merged by the same author account because GitHub blocks self-approval under current review policy.
- To complete final merge/unblock in practice, a second eligible reviewer (Code Owner) must approve.

### Next Recommended Task

- Assign at least one additional real Code Owner reviewer account/team and complete one final approval on PR #2 to verify end-to-end merge completion after checks pass.
