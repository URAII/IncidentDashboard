# Spreadsheet CSV Adapter

## Purpose

รองรับการนำเข้า incident จาก CSV แบบ local fixture โดยบังคับผ่าน validation/sanitization เดิมก่อนใช้กับ dashboard/report/export

## Modules

- `src/spreadsheet-adapter.js`
- `src/import-csv.js`

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
