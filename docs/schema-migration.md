# CSV Schema Migration Guide (v1 -> v2)

## Purpose

เอกสารนี้ระบุการ migrate schema สำหรับ CSV import จาก `v1` ไป `v2` โดยคง sanitized-only contract เดิม

## Supported Versions Policy

- supported versions: `v1`, `v2`
- current version: `v2`
- default version: `v2` (M13 cutover applied)
- deprecated version: `v1`

## v1 Deprecation Timeline (M14)

Planned timeline (policy):

- `2026-05-13`: start deprecation announcement for `v1` and switch default to `v2`
- `2026-05-13` to `2026-08-31`: compatibility window (`v1` still accepted via explicit `--schema-version v1`)
- `2026-09-01`: freeze point for new `v1` template onboarding (existing integrations still allowed)
- `2026-10-01` or later: removal candidate window, only if removal criteria are fully met

Compatibility window notes:

- CI keeps both gates active:
  - `npm run check:import:v2` (required gate)
  - `npm run check:import:v1-compat` (usage/compatibility monitoring gate)
- `v1` usage must emit deprecated warning in CLI/report for monitoring

## CLI Usage

```bash
node src/import-csv.js --incidents <file> --out <file> --schema-version v1
node src/import-csv.js --incidents <file> --out <file> --schema-version v2
node src/import-xlsx.js --workbook <file.xlsx> --out <file> --schema-version v1
node src/import-xlsx.js --workbook <file.xlsx> --out <file> --schema-version v2
```

ถ้าไม่ส่ง `--schema-version` จะใช้ default (`v2`)

หมายเหตุ `.xlsx`:

- workbook ต้องมี sheets: `incidents`, `incident_attachments`, `incident_evidence`
- parser `.xlsx` map เข้า schema contract เดียวกับ CSV ก่อนผ่าน validation/sanitization เดิม

## Header Mapping (v1 -> v2)

### Incidents

- `summary_sanitized` -> `summary_text_sanitized`
- `detection_source` -> `detection_channel`

### Attachments

- `file_url` -> `file_url_sanitized`

### Evidence

- `evidence_text_sanitized` -> `evidence_text_note_sanitized`
- `evidence_url_sanitized` -> `evidence_url_link_sanitized`

## Required vs Optional Fields

### incidents

Required (`v1`):
- `incident_id`
- `incident_code`
- `reported_at`
- `organization_id`
- `incident_type`
- `severity`
- `workflow_stage`
- `summary_sanitized`
- `detection_source`

Required (`v2`):
- `incident_id`
- `incident_code`
- `reported_at`
- `organization_id`
- `incident_type`
- `severity`
- `workflow_stage`
- `summary_text_sanitized`
- `detection_channel`

Optional (both versions):
- `detected_at`
- `organization_name`
- `health_region`
- `province`
- `agency_type`
- `incident_category`
- `priority`
- `status`
- `assigned_team`
- `assigned_to`
- `affected_domain_sanitized`
- `affected_url_sanitized`
- `suspicious_path_sanitized`
- `has_image`
- `primary_image_url`
- `primary_image_caption`
- `primary_image_sanitized_note`
- `created_by`
- `created_at`
- `updated_by`
- `updated_at`
- `closed_at`

### attachments

Required (`v1`):
- `attachment_id`
- `incident_id`
- `attachment_type`
- `file_name`
- `file_url`
- `file_mime_type`
- `created_by`
- `created_at`

Required (`v2`):
- `attachment_id`
- `incident_id`
- `attachment_type`
- `file_name`
- `file_url_sanitized`
- `file_mime_type`
- `created_by`
- `created_at`

Optional (both versions):
- `file_size`
- `image_caption`
- `image_taken_at`
- `image_source`
- `is_sanitized`
- `sanitized_by`
- `sanitized_at`
- `sanitized_note`

### evidence

Required (`v1`/`v2`):
- `evidence_id`
- `incident_id`
- `evidence_type`
- `source_type`
- `confidence_score`
- `is_sanitized`
- `created_by`
- `created_at`

Optional (`v1`):
- `evidence_text_sanitized`
- `evidence_url_sanitized`

Optional (`v2`):
- `evidence_text_note_sanitized`
- `evidence_url_link_sanitized`

Optional (both versions):
- `evidence_image_url`
- `evidence_image_caption`
- `sanitized_note`
- `collected_at`

## Breaking Changes and Backward Compatibility

Breaking changes in `v2`:
- เปลี่ยนชื่อบาง header (ตาม mapping ด้านบน)

Backward compatibility behavior:
- parser ยังรองรับ `v1` ผ่าน `--schema-version v1`
- default เปลี่ยนเป็น `v2` แล้ว; `v1` ใช้ผ่าน explicit flag เท่านั้น
- validation/sanitization pipeline หลัง map ยังคง logic เดิม
- behavior เดียวกันทั้ง `import-csv` และ `import-xlsx`

Fallback behavior:
- ถ้าเลือก version ไม่ถูกต้อง (`v3` เป็นต้น) จะ fail ทันทีด้วย `unsupported schema version`
- ถ้า header ไม่ตรง version ที่เลือกและเปิด strict mode จะรายงาน `schema_errors`

## Deprecation Warning Behavior

เมื่อใช้ deprecated version (`v1`):
- report จะมี `schema_warnings`
- CLI จะพิมพ์ warning แบบ sanitized-only โดยไม่แสดงข้อมูล sensitive

เมื่อใช้ current version (`v2`):
- ไม่มี deprecation warning

## Deprecation / Removal Criteria

- คง support `v1` ระหว่าง migration window
- พิจารณาถอด `v1` เมื่อเข้าเงื่อนไข:
  - มีอย่างน้อย 2 stable releases ต่อเนื่องที่ pipeline/CI รันบน `v2` เท่านั้น
  - ไม่มี rollback request กลับ `v1`
  - migration tests สำหรับ `v2` ผ่านต่อเนื่อง

## Usage Monitoring (M14)

Monitoring targets:

- count of `deprecated_schema_version` warnings in CI/test logs
- pass/fail trend for:
  - `check:import:v2` (required)
  - `check:import:v1-compat` (compatibility)
- ratio of imports by schema version (`v2` vs explicit `v1`)

Recommended operational rule:

- keep `v1` compatibility while warning count is still active
- begin removal execution only after warning count trends to zero for a sustained period

## Warning Threshold Enforcement (M15)

Threshold inputs:

- flag: `--max-v1-warnings <number>`
- environment: `IMPORT_MAX_V1_WARNINGS=<number>`

Threshold behavior:

- evaluate `warning_count` from `deprecated_schema_version` warnings in v1 compatibility gate
- if `warning_count > threshold`:
  - gate fails with explicit threshold-breach exit code
  - summary status = `fail`

Summary contract (for monitoring/CI logs):

- `schema_version`
- `warning_count`
- `threshold`
- `status`

## CI Recommendation

แนะนำ CI ให้รันทั้ง:

```bash
npm run check:import:v2
npm run check:import:v1-compat
```

`check:import:v2` เป็น required gate และ `check:import:v1-compat` เป็น compatibility gate ระหว่าง deprecation window

## Default v2 Cutover Plan (M12)

### Current -> Target

- current default: `v2`
- target default: `v2` (completed)

### Cutover Criteria

ต้องครบทั้งหมด:

1. `npm run check:import:v2` ผ่านต่อเนื่องใน CI release branch
2. `npm run check:import:v1-compat` ผ่านต่อเนื่องโดย warning เสถียร
3. ไม่มี rollback request ที่ต้องย้อนมาใช้ `v1`
4. downstream import templates อัปเดต header เป็น `v2` แล้ว

### Cutover Checklist

1. [x] เปลี่ยน default schema ในโค้ดจาก `v1` เป็น `v2`
2. [x] อัปเดต docs/README/TESTING/HANDOFF ให้ตรง default ใหม่
3. [x] ยืนยัน `npm test`, `npm run check`, `npm run check:import:v2`, `npm run check:import:v1-compat`
4. [ ] ประกาศ deprecation timeline สำหรับ `v1`
5. [ ] monitor CI warnings หลัง deploy

### Rollback Plan

ถ้า cutover มีปัญหา:

1. revert commit ที่เปลี่ยน default กลับ `v1`
2. รัน `npm run check` และ 2 import gates ซ้ำ
3. เก็บ `v2` เป็น explicit opt-in ผ่าน `--schema-version v2` ชั่วคราว
4. บันทึกเหตุผล rollback ใน HANDOFF พร้อม issue reference (sanitized-only)

### Rollback Criteria (M14)

ให้พิจารณา rollback default จาก `v2` กลับ `v1` เฉพาะเมื่อเกิดอย่างน้อยหนึ่งข้อ:

1. `check:import:v2` fail ต่อเนื่องใน release branch และกระทบ production readiness
2. พบ regression เชิง business-critical ใน `v2` mapping/validation ที่ยังไม่มี hotfix
3. downstream integrations ส่วนใหญ่ยังไม่พร้อม `v2` และมี incident จาก import failures

Rollback execution must keep:

- sanitized-only logs/warnings
- explicit post-rollback verification (`npm test`, `npm run check`, import gates)

## v1 Removal Change Set Preparation (M15)

Planned code/files for v1 removal:

- `src/spreadsheet-adapter.js`:
  - remove `v1` profile from `CSV_SCHEMA_PROFILES`
  - update `SCHEMA_POLICY.supported_versions` and deprecation metadata
- `src/import-csv.js`:
  - update CLI help text to remove `v1` from schema-version options
- `scripts/check-import-v1-compat.js`:
  - remove/retire compatibility gate when timeline reaches removal execution
- `package.json`:
  - remove `check:import:v1-compat` from readiness chain once policy allows
- `tests/*`:
  - drop `v1` compatibility tests
  - keep regression coverage for `v2` strict paths and invalid-version paths

Functions/areas to review during removal:

- `resolveSchemaVersion()`
- `getSchemaWarnings()`
- compatibility warning checks in CLI/script tests

Communication checklist before removal:

1. announce final removal date for `v1`
2. publish migration reminder with `v1 -> v2` header mapping
3. confirm downstream owners acknowledged change
4. share rollback contact path and issue template (sanitized-only)
