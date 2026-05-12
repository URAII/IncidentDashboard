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

- Spreadsheet/AppSheet ingestion adapters

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

Add spreadsheet/AppSheet-safe ingestion or persistence behind the existing sanitized validation flow, while keeping `buildDashboardPayload` as the single dashboard data source.

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
