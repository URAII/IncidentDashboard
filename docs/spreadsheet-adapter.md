# Spreadsheet CSV Adapter

## Purpose

รองรับการนำเข้า incident จาก CSV แบบ local fixture โดยบังคับผ่าน validation/sanitization เดิมก่อนใช้กับ dashboard/report/export

## Modules

- `src/spreadsheet-adapter.js`
- `src/import-csv.js`
- `src/sheet-export-contract.js` (M24 export contract)
- `src/export-sheet-contract.js` (M24 CLI)

## Supported Modes

### 1) Single-row bundle mode (legacy)

1 แถวสามารถมี incident + child fields แล้ว map เป็น bundle เดียว

### 2) Multi-file join mode (M8)

ใช้ไฟล์แยกแล้ว join ด้วย `incident_id`:

- `incidents.csv` (required)
- `incident_attachments.csv` (optional)
- `incident_evidence.csv` (optional)

## Multi-file APIs

- `ingestCsvFiles({ incidentsFile, attachmentsFile, evidenceFile }, options)`
- `ingestCsvRowSets({ incidentsRows, attachmentsRows, evidenceRows }, options)`
- `joinRowsByIncidentId({ incidentsRows, attachmentsRows, evidenceRows }, options)`

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
- default: `v1`
- ใช้ผ่าน `options.schemaVersion` หรือ CLI `--schema-version`
- ถ้า version ไม่รองรับ จะ fail ทันทีด้วย `unsupported schema version`

Version-specific behavior:

- `v1`: ใช้ header เดิมจาก M8/M9
- `v2`: ใช้ header ชุดใหม่และ map กลับ canonical fields ภายใน adapter โดยไม่ bypass validation เดิม
- `schema_errors` จะมี `schema_version` ทุก entry

## CLI

```bash
node src/import-csv.js \
  --incidents <file> \
  --attachments <file> \
  --evidence <file> \
  --out <file>
```

Flags เพิ่มเติม:

- `--schema-version <v1|v2>`
- `--strict-schema`
- `--fail-on-join-error`
- `--fail-on-validation-error`
- `--now <iso-date>`

Exit behavior:

- `--schema-version` ไม่รองรับ -> exit non-zero
- strict mode + `schema_errors` -> exit non-zero
- `--fail-on-join-error` + `join_errors` -> exit non-zero
- `--fail-on-validation-error` + `validation_errors` -> exit non-zero

## Security Behavior

- ห้าม bypass `prepareIncidentDataset`
- URL/path ถูก sanitize (ตัด query/fragment)
- secret-like content ใน sanitized narrative จะถูก reject
- output จาก CLI ใช้ `sanitizedBundles` (child ที่ `is_sanitized=false` จะไม่ถูกส่งออก)
- log/error text ใช้ข้อมูลเชิงโครงสร้างเท่านั้น (entity/header/field/row) ไม่ dump raw sensitive payload

## AppSheet / Google Sheet Export Contract (M24)

- contract version: `m24.appsheet_google_sheet.v1`
- CLI: `node src/export-sheet-contract.js --in <bundles.json> --out <contract.json>`
- output sheets:
  - `incidents`
  - `incident_attachments`
  - `incident_evidence`
  - `dashboard_summary`
- child rows export เฉพาะ `is_sanitized=true`
- URL fields (`*_url_sanitized`) ต้องไม่มี query/fragment เสมอ
- helper: `toGoogleSheetValueRanges(contract)` สำหรับแปลงเป็น 2D arrays ต่อ sheet

รายละเอียด schema เพิ่มเติม: [docs/appsheet-export-contract.md](/Users/mmdx/Incident%20Dashboard/IncidentDashboard/docs/appsheet-export-contract.md)

## Google Sheet Staging Connector + AppSheet Schema Check (M25)

- staging wrapper CLI:
  - `node src/export-google-sheet.js --input <contract.json> --dry-run`
  - `node src/export-google-sheet.js --input <contract.json> --staging`
- default mode เป็น `dry-run`
- staging write จะเกิดขึ้นเฉพาะเมื่อ:
  - ใช้ `--staging`
  - มี env `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`
  - มี env `GOOGLE_APPLICATION_CREDENTIALS`
  - AppSheet compatibility check ผ่าน
- compatibility check ครอบคลุม:
  - sheet/table names
  - missing/extra columns
  - key column presence
  - key type/format

รายละเอียดเพิ่ม: [docs/google-sheet-connector.md](/Users/mmdx/Incident%20Dashboard/IncidentDashboard/docs/google-sheet-connector.md)

## Binary XLSX Parser Gate (M28)

- parser module: `src/xlsx-binary-parser.js`
- gate script: `scripts/check-import-xlsx-binary.js`
- readiness command: `npm run check:import:xlsx:binary`

สิ่งที่ตรวจจากไฟล์ `.xlsx` จริง:

- zip/workbook integrity (corrupted workbook detection)
- required sheets: `incidents`, `incident_attachments`, `incident_evidence`
- strict headers/required fields ตาม `schema_version=v2`
- duplicate headers, blank rows, invalid date format, unsafe sanitized fields
- join/schema/validation flow เดิมผ่าน `ingestCsvRowSets` (ไม่ bypass policy เดิม)

ผลลัพธ์เป็น sanitized summary เท่านั้น:

- `schema_version`
- `workbook_id` (basename-sanitized)
- rows counts / status / error counts

## Template Drift Governance Gate (M29)

- drift module: `src/template-drift-check.js`
- gate script: `scripts/check-template-drift.js`
- command: `npm run check:template-drift`

ตรวจ template release fixture:

- manifest: `fixtures/xlsx-multifile/template-release.v2.json`
- workbook: `fixtures/xlsx-multifile/template.v2.sanitized.xlsx`

drift detection:

- missing required headers
- unknown headers
- duplicate headers
- wrong/missing required sheet names

summary output เป็น sanitized-only:

- `schema_version`
- `template_id`
- `workbook_id`
- drift counts + status

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
