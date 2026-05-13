# Spreadsheet Adapter (CSV + XLSX)

## Purpose

รองรับการนำเข้า incident จาก CSV และ XLSX แบบ local fixture โดยบังคับผ่าน validation/sanitization เดิมก่อนใช้กับ dashboard/report/export

## Modules

- `src/spreadsheet-adapter.js`
- `src/import-csv.js`
- `src/xlsx-adapter.js`
- `src/import-xlsx.js`

## Supported Modes

### 1) Single-row bundle mode (legacy)

1 แถวสามารถมี incident + child fields แล้ว map เป็น bundle เดียว

### 2) Multi-file join mode (M8)

ใช้ไฟล์แยกแล้ว join ด้วย `incident_id`:

- `incidents.csv` (required)
- `incident_attachments.csv` (optional)
- `incident_evidence.csv` (optional)

### 3) XLSX workbook mode (M16)

ใช้ workbook `.xlsx` ที่มี 3 sheets:

- `incidents` (required)
- `incident_attachments` (required)
- `incident_evidence` (required)

### 4) Real template compatibility mode (M17)

- ใช้ workbook fixture ที่สะท้อน template จริงแบบ sanitized
- validate header/field behavior ตาม `v2` contract ก่อน merge

### 5) Automated template drift mode (M18)

- ใช้ `check:template-drift` เพื่อตรวจ drift ของ header/sheet จาก workbook template
- fail-fast เมื่อพบ drift (`exit code=2`)
- summary/log เป็น sanitized-only เท่านั้น

### 6) Template release governance mode (M19)

- ใช้ owner approval checklist ควบคุมการปล่อย template
- `check:template-drift` จะตรวจ:
  - drift status
  - approval checklist status
- checklist ขั้นต่ำ:
  - `template_owner`
  - `reviewer`
  - `sanitized_sample_workbook`
  - `schema_version=v2`
  - `rollback_plan`
  - `owner_approved=true`
  - `reviewer_approved=true`

### 7) PR template + branch rule mode (M20)

- PR template path: `.github/pull_request_template.md`
- template workbook paths to review/update in PR:
  - `fixtures/xlsx-multifile/template.v2.*.xlsx`
- checklist artifact path to attach/update:
  - `fixtures/xlsx-multifile/template-release.v2.json`
- merge policy:
  - require CI `Readiness Check`
  - require Code Owners review for template paths
  - require owner review + reviewer approval
  - require checklist artifact update
  - block merge if `check:template-drift` fails

### 8) CODEOWNERS governance mode (M21)

- CODEOWNERS file path: `.github/CODEOWNERS`
- required template coverage:
  - `/fixtures/xlsx-multifile/template.v2.*.xlsx`
  - `/fixtures/xlsx-multifile/template-release.v2.json`
- placeholder owner/team is allowed until final org mapping is ready

## Multi-file APIs

- `ingestCsvFiles({ incidentsFile, attachmentsFile, evidenceFile }, options)`
- `ingestCsvRowSets({ incidentsRows, attachmentsRows, evidenceRows }, options)`
- `joinRowsByIncidentId({ incidentsRows, attachmentsRows, evidenceRows }, options)`
- `ingestXlsxWorkbookFile(workbookFile, options)`

## Detection/Reporting

Adapter จะตรวจและรายงาน:

- duplicate `incident_id` ใน incidents (`type=duplicate_incident_id`)
- missing `incident_id` ใน incident/child rows (`type=missing_incident_id`)
- orphan child ที่อ้าง incident ไม่พบ (`type=orphan_child`)

ผลลัพธ์หลัก:

- `schema_errors`
- `join_errors`
- `validation_errors`
- `validBundles`
- `sanitizedBundles`

## Strict Schema Mode (M9)

เปิดใช้ผ่าน options/CLI:

- `strictSchema: true`
- หรือ `--strict-schema`

Strict schema ตรวจตาม entity ต่อไฟล์ (`incident`, `attachment`, `evidence`):

- required headers (`missing_required_header`)
- unknown headers (`unknown_header`)
- missing required fields (`missing_required_field`)

หมายเหตุ:

- โหมด strict ไม่เปลี่ยน validation/sanitization เดิม แต่เพิ่ม schema gate ก่อนสรุปผล
- ถ้าไม่เปิด strict จะยังคง flexible mode แบบเดิม (backward compatible)

## Schema Versioning (M10)

- รองรับ schema profiles: `v1`, `v2`
- default: `v2` (M13 cutover)
- ใช้ผ่าน `options.schemaVersion` หรือ CLI `--schema-version`
- ถ้า version ไม่รองรับ จะ fail ทันทีด้วย `unsupported schema version`

Version-specific behavior:

- `v1`: ใช้ header เดิมจาก M8/M9
- `v2`: ใช้ header ชุดใหม่และ map กลับ canonical fields ภายใน adapter โดยไม่ bypass validation เดิม
- `schema_errors` จะมี `schema_version` ทุก entry

## Migration + Deprecation Policy (M11)

- current schema version: `v2`
- deprecated schema version: `v1`
- default ถูก cutover เป็น `v2`
- เมื่อใช้ deprecated version จะได้ `schema_warnings` และ CLI warning (sanitized-only)
- รายละเอียด migration และ field mapping ดู [schema-migration.md](/Users/mmdx/Incident%20Dashboard/IncidentDashboard/docs/schema-migration.md)

## CI Schema Gates (M12)

- `check:import:v2`:
  - strict import gate สำหรับ `v2` (required readiness gate)
  - ต้องไม่มี `schema_warnings`, `schema_errors`, `join_errors`, `validation_errors`
- `check:import:xlsx`:
  - strict workbook gate สำหรับ `.xlsx` บน `v2` contract
  - ต้องไม่มี `schema_warnings`, `schema_errors`, `join_errors`, `validation_errors`
- `check:template-drift`:
  - template governance gate สำหรับ workbook template บน `v2`
  - ต้องไม่มี missing/unknown/duplicate header และ wrong sheet name
  - approval checklist ต้องครบ
- `check:import:v1-compat`:
  - compatibility gate สำหรับ `v1`
  - ต้องผ่าน validation/import และต้องมี deprecated warning
- `npm run check` เรียกทั้ง 4 gates ก่อนรัน full tests

## Deprecation Timeline + Monitoring (M14)

- `v1` อยู่ใน compatibility window และต้องใช้ explicit `--schema-version v1`
- report/CLI ต้องแสดง `schema_version` ที่ใช้งานทุกครั้ง
- `v1` ต้องมี `deprecated_schema_version` warning
- `v2` ต้องไม่มี deprecation warning
- monitoring อ้างอิงผลจาก:
  - `check:import:v2`
  - `check:import:v1-compat`

## v1 Warning Threshold (M15)

- v1 compatibility gate รองรับ threshold config:
  - CLI flag: `--max-v1-warnings <number>`
  - env var: `IMPORT_MAX_V1_WARNINGS`
- หาก `warning_count` ของ `deprecated_schema_version` มากกว่า threshold:
  - gate จะ fail
  - exit code ชัดเจน (threshold breach)
- summary ที่ output ทุกครั้ง:
  - `schema_version`
  - `warning_count`
  - `threshold`
  - `status`

## CLI

```bash
node src/import-csv.js \
  --incidents <file> \
  --attachments <file> \
  --evidence <file> \
  --out <file>
```

```bash
node src/import-xlsx.js \
  --workbook <file.xlsx> \
  --out <file.json>
```

Flags เพิ่มเติม:

- `--schema-version <v1|v2>`
- `--strict-schema`
- `--fail-on-join-error`
- `--fail-on-validation-error`
- `--now <iso-date>`

XLSX notes:

- `import-xlsx` เปิด strict schema เป็น default
- ถ้า workbook ขาด sheet ที่จำเป็น จะ fail ทันที (`missing required sheet`)
- policy summary ใน gate output ต้องมี `schema_version`, `warning_count`, `threshold`, `status`
- template drift summary ต้องมี `schema_version`, `workbook_id`, `sheet_name`, `drift_type`, `counts`, `status`
- template release readiness summary ต้องมี `schema_version`, `template_id`, `drift_status`, `approval_checklist_status`, `status`
- exit code policy:
  - `2`: drift detected
  - `3`: missing workbook/approval fixture
  - `4`: approval checklist incomplete

Exit behavior:

- `--schema-version` ไม่รองรับ -> exit non-zero
- strict mode + `schema_errors` -> exit non-zero
- `--fail-on-join-error` + `join_errors` -> exit non-zero
- `--fail-on-validation-error` + `validation_errors` -> exit non-zero
- deprecated version (`v1`) -> ไม่ fail ทันที แต่มี `schema_warnings`

## Security Behavior

- ห้าม bypass `prepareIncidentDataset`
- URL/path ถูก sanitize (ตัด query/fragment)
- secret-like content ใน sanitized narrative จะถูก reject
- output จาก CLI ใช้ `sanitizedBundles` (child ที่ `is_sanitized=false` จะไม่ถูกส่งออก)
- log/error text ใช้ข้อมูลเชิงโครงสร้างเท่านั้น (entity/header/field/row) ไม่ dump raw sensitive payload

## Fixtures

- `fixtures/sample-incident-import.csv`
- `fixtures/csv-multifile/incidents.valid.csv`
- `fixtures/csv-multifile/incident_attachments.valid.csv`
- `fixtures/csv-multifile/incident_evidence.valid.csv`
- `fixtures/csv-multifile/incidents.duplicate.csv`
- `fixtures/csv-multifile/incidents.missing-id.csv`
- `fixtures/csv-multifile/incident_attachments.orphan.csv`
- `fixtures/csv-multifile/incident_evidence.missing-id.csv`
- `fixtures/csv-multifile/incidents.unknown-header.csv`
- `fixtures/csv-multifile/incidents.missing-required-header.csv`
- `fixtures/csv-multifile/incidents.missing-required-field.csv`
- `fixtures/csv-multifile/incidents.validation-error.csv`
- `fixtures/csv-multifile/incident_attachments.missing-required-field.csv`
- `fixtures/csv-multifile/incident_evidence.unknown-header.csv`
- `fixtures/csv-multifile/incidents.v2.valid.csv`
- `fixtures/csv-multifile/incident_attachments.v2.valid.csv`
- `fixtures/csv-multifile/incident_evidence.v2.valid.csv`
- `fixtures/xlsx-multifile/incidents.v2.valid.xlsx`
- `fixtures/xlsx-multifile/incidents.v2.missing-sheet.xlsx`
- `fixtures/xlsx-multifile/incidents.v2.wrong-header.xlsx`
- `fixtures/xlsx-multifile/incidents.v2.missing-incident-id.xlsx`
- `fixtures/xlsx-multifile/incidents.v2.duplicate-incident-id.xlsx`
- `fixtures/xlsx-multifile/incidents.v2.orphan-child.xlsx`
- `fixtures/xlsx-multifile/incidents.v2.unsafe-data.xlsx`
- `fixtures/xlsx-multifile/template.v2.real-sanitized.xlsx`
- `fixtures/xlsx-multifile/template.v2.empty-child-sheets.xlsx`
- `fixtures/xlsx-multifile/template.v2.header-typo.xlsx`
- `fixtures/xlsx-multifile/template.v2.unknown-columns.xlsx`
- `fixtures/xlsx-multifile/template.v2.date-edge.xlsx`
- `fixtures/xlsx-multifile/template.v2.blank-rows.xlsx`
- `fixtures/xlsx-multifile/template.v2.duplicate-headers.xlsx`
- `fixtures/xlsx-multifile/template.v2.wrong-sheet.xlsx`
- `fixtures/xlsx-multifile/template-release.v2.json`
