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
- default เป็น `v1` (backward compatible กับ fixtures เดิม)
- strict schema จะ validate ตาม version ที่เลือก
- output/error จะมี `schema_version` ระบุชัดเจน

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

## Security Constraints

- ห้ามเก็บหรือแสดง credentials/tokens/secrets/PII
- ห้ามปล่อย URL query string/fragment ใน output dashboard/report
- ห้าม bypass validation/sanitization flow เดิม
- แถวที่ไม่ผ่าน validation ต้องถูก reject

## Key Files

- `src/spreadsheet-adapter.js`
- `src/import-csv.js`
- `src/validation.js`
- `src/sanitization.js`
- `src/dashboard.js`
- `fixtures/csv-multifile/*`
- `tests/test_spreadsheet_multifile.test.js`
- `tests/test_import_csv_cli.test.js`
