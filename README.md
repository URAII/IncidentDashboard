# Incident Dashboard Prototype (Sanitized-only)

ต้นแบบระบบ Incident Dashboard / SOC Monitoring สำหรับเหตุการณ์ Cyber/Web Compromise โดยบังคับผลลัพธ์แบบ `sanitized-only`

## Core Flow

```text
Master Data -> Incident Form -> Validation -> Workflow -> SLA -> Dashboard -> Report
```

## Commands

```bash
npm install
npm run check
npm run check:import:v2
npm run check:import:xlsx
npm run check:template-drift
npm run check:import:v1-compat
npm test
npm run ui
```

UI endpoint: `http://127.0.0.1:4173`

## Spreadsheet CSV Import

### Single-row mode (legacy)

ใช้ `src/spreadsheet-adapter.js` กับ CSV ที่ 1 แถวแทน 1 incident bundle

### Multi-file mode (M8)

รองรับไฟล์แยก:

- `incidents.csv` (required)
- `incident_attachments.csv` (optional)
- `incident_evidence.csv` (optional)

ระบบจะ `join` ด้วย `incident_id` และยังส่งผ่าน validation/sanitization เดิมเสมอ

ตรวจจับและรายงาน:

- duplicate `incident_id` ใน incidents
- missing `incident_id` ใน incident/child rows
- orphan child rows

### Strict schema mode (M9)

เพิ่มโหมด strict ผ่าน CLI flag:

- `--strict-schema`: เปิด schema validation ต่อไฟล์ (`incidents`, `attachments`, `evidence`)
- `--fail-on-join-error`: ให้ exit code เป็น non-zero เมื่อมี `join_errors`
- `--fail-on-validation-error`: ให้ exit code เป็น non-zero เมื่อมี `validation_errors`

Strict schema จะตรวจ:

- required headers
- unknown headers
- missing required fields

### Schema versioning mode (M10)

- `--schema-version v1|v2`
- default เป็น `v2` (M13 cutover)
- strict schema จะ validate ตาม version ที่เลือก
- output/error จะมี `schema_version` ระบุชัดเจน

### XLSX adapter mode (M16)

- รองรับ workbook `.xlsx` ที่มี 3 sheets:
  - `incidents`
  - `incident_attachments`
  - `incident_evidence`
- map เข้า schema contract เดียวกับ CSV import flow
- default schema = `v2`
- `import-xlsx` เปิด strict schema เป็น default เพื่อ enforce contract

### Real template compatibility (M17)

- เพิ่ม sanitized real-template workbook fixture สำหรับตรวจ compatibility กับ template จริง
- ทดสอบ import workbook ตาม 3 sheets:
  - `incidents`
  - `incident_attachments`
  - `incident_evidence`
- ยืนยัน header mapping `v2` -> canonical fields เดิม (ไม่ bypass validation/sanitization)
- ครอบคลุม invalid workbook:
  - missing sheet
  - header typo
  - empty child sheets
  - unknown columns
  - date edge case
  - blank rows

### Automated template drift check (M18)

- เพิ่มคำสั่ง `npm run check:template-drift`
- ตรวจ header drift ของ workbook template เทียบ `v2` schema contract โดยตรง
- ตรวจ sheets:
  - `incidents`
  - `incident_attachments`
  - `incident_evidence`
- detect:
  - missing required headers
  - unknown headers
  - duplicate headers
  - wrong sheet name
- fail-fast ด้วย exit code เฉพาะ drift (`2`)
- summary เป็น sanitized-only:
  - `schema_version`
  - `template_id`
  - `drift_status`
  - `approval_checklist_status`
  - `status`

### Template release governance gate (M19)

- `check:template-drift` ตรวจทั้ง drift + owner approval checklist ในรอบเดียว
- checklist สำหรับ release:
  - `template_owner`
  - `reviewer`
  - `sanitized_sample_workbook`
  - `schema_version=v2`
  - `rollback_plan`
  - `owner_approved=true`
  - `reviewer_approved=true`
- fail-fast exit codes:
  - `2` = drift detected
  - `3` = missing workbook/approval fixture
  - `4` = approval checklist incomplete
- upstream เปลี่ยน header ต้อง:
  - update fixture/contract/tests/docs ให้ตรง
  - หรือเปิดแผน schema `v3` อย่างเป็นทางการ

### PR template + branch rule (M20)

- PR template สำหรับ template changes:
  - `.github/pull_request_template.md`
- template paths ที่ต้องอ้างอิงใน PR:
  - `fixtures/xlsx-multifile/template.v2.*.xlsx`
  - `fixtures/xlsx-multifile/template-release.v2.json`
- branch rule guidance (required before merge):
  - CI `Readiness Check` must pass
  - Code Owners review must pass for template paths
  - owner review + reviewer approval must be present
  - checklist artifact must be attached/updated
  - merge blocked when `check:template-drift` fails

### CODEOWNERS for template governance (M21)

- file: `.github/CODEOWNERS`
- covered paths:
  - `fixtures/xlsx-multifile/template.v2.*.xlsx`
  - `fixtures/xlsx-multifile/template-release.v2.json`
- placeholder owner allowed until real team mapping is ready:
  - `@your-org/template-owners`

### Migration + Deprecation policy (M11)

- current version: `v2`
- deprecated version: `v1`
- default flow (`v2`) ไม่มี deprecation warning
- เมื่อใช้ explicit `v1` จะมี warning ใน `schema_warnings` และ CLI warning (sanitized-only)
- migration detail: [docs/schema-migration.md](/Users/mmdx/Incident%20Dashboard/IncidentDashboard/docs/schema-migration.md)

### CI schema gates (M12)

- `npm run check:import:v2` = required import readiness gate (strict `v2`)
- `npm run check:import:xlsx` = required workbook readiness gate (strict `v2`)
- `npm run check:template-drift` = required template release governance gate (`v2`)
- `npm run check:import:v1-compat` = compatibility gate (`v1` pass + deprecated warning)
- `npm run check` จะรวม gates ข้างต้น + test readiness ทั้งชุด

### Deprecation timeline + monitoring (M14)

- `v1` อยู่ใน compatibility window ตาม [docs/schema-migration.md](/Users/mmdx/Incident%20Dashboard/IncidentDashboard/docs/schema-migration.md)
- ใช้ explicit `--schema-version v1` แล้วต้องมี deprecated warning เสมอ
- monitoring ใช้ผลจาก gates:
  - `check:import:v2` (required)
  - `check:import:v1-compat` (usage/warning tracking)

### Warning threshold (M15)

- `check:import:v1-compat` รองรับ threshold:
  - flag: `--max-v1-warnings <number>`
  - env: `IMPORT_MAX_V1_WARNINGS=<number>`
- เมื่อ `warning_count > threshold` gate จะ fail ด้วย exit code ชัดเจน
- summary output มี:
  - `schema_version`
  - `warning_count`
  - `threshold`
  - `status`

## CLI Import

```bash
node src/import-csv.js \
  --incidents fixtures/csv-multifile/incidents.valid.csv \
  --attachments fixtures/csv-multifile/incident_attachments.valid.csv \
  --evidence fixtures/csv-multifile/incident_evidence.valid.csv \
  --out /private/tmp/incident-import-output.json \
  --now 2026-05-12T12:00:00.000Z
```

Strict + fail-fast ตัวอย่าง:

```bash
node src/import-csv.js \
  --incidents fixtures/csv-multifile/incidents.valid.csv \
  --attachments fixtures/csv-multifile/incident_attachments.valid.csv \
  --evidence fixtures/csv-multifile/incident_evidence.valid.csv \
  --out /private/tmp/incident-import-output.json \
  --schema-version v1 \
  --strict-schema \
  --fail-on-join-error \
  --fail-on-validation-error
```

ตัวอย่าง `v2`:

```bash
node src/import-csv.js \
  --incidents fixtures/csv-multifile/incidents.v2.valid.csv \
  --attachments fixtures/csv-multifile/incident_attachments.v2.valid.csv \
  --evidence fixtures/csv-multifile/incident_evidence.v2.valid.csv \
  --out /private/tmp/incident-import-output-v2.json \
  --schema-version v2 \
  --strict-schema
```

ผลลัพธ์ไฟล์ JSON จะมี `bundles` ที่เป็น sanitized-only (child ที่ `is_sanitized=false` จะไม่ถูกส่งออก)

## CLI Import (.xlsx)

```bash
node src/import-xlsx.js \
  --workbook fixtures/xlsx-multifile/incidents.v2.valid.xlsx \
  --out /private/tmp/incident-import-output-xlsx.json \
  --schema-version v2 \
  --strict-schema \
  --fail-on-join-error \
  --fail-on-validation-error
```

XLSX errors ที่ report ได้:

- missing required sheet
- wrong header / missing required header
- missing `incident_id`
- duplicate `incident_id`
- orphan child
- unsafe data (ผ่าน validation เดิม)
- date edge case (validation error)
- unknown columns (strict schema error)

## Security Constraints

- ห้ามเก็บหรือแสดง credentials/tokens/secrets/PII
- ห้ามปล่อย URL query string/fragment ใน output dashboard/report
- ห้าม bypass validation/sanitization flow เดิม
- แถวที่ไม่ผ่าน validation ต้องถูก reject

## Key Files

- `src/spreadsheet-adapter.js`
- `src/import-csv.js`
- `src/import-xlsx.js`
- `src/xlsx-adapter.js`
- `src/validation.js`
- `src/sanitization.js`
- `src/dashboard.js`
- `fixtures/csv-multifile/*`
- `fixtures/xlsx-multifile/*`
- `tests/test_spreadsheet_multifile.test.js`
- `tests/test_import_csv_cli.test.js`
- `tests/test_xlsx_adapter.test.js`
- `tests/test_import_xlsx_cli.test.js`
