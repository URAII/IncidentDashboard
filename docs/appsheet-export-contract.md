# AppSheet / Google Sheet Export Contract (M24)

## Purpose

กำหนด output contract กลางสำหรับส่งข้อมูล incident แบบ sanitized-only ไปยัง AppSheet หรือ Google Sheet โดยไม่ต่อ connector production โดยตรง

## Modules

- `src/sheet-export-contract.js`
- `src/export-sheet-contract.js`

## Contract Overview

`buildSheetExportContract({ bundles, now, filters })` คืนค่า JSON ดังนี้:

- `contract_version`: `m24.appsheet_google_sheet.v1`
- `platform_targets`: `appsheet`, `google_sheets`
- `generated_at`
- `filters_applied`
- `sheets`
  - `incidents`
  - `incident_attachments`
  - `incident_evidence`
  - `dashboard_summary`
- `summary`

## Sheet Contracts

### `incidents`

- 1 row ต่อ 1 incident ที่ผ่าน validation แล้ว
- มี fields สำคัญเช่น `incident_id`, `incident_code`, `severity`, `workflow_stage`, `sla_status`, `summary_sanitized`
- นับ `sanitized_attachment_count` และ `sanitized_evidence_count` สำหรับ consumer ฝั่ง sheet

### `incident_attachments`

- export เฉพาะ child ที่ `is_sanitized=true`
- URL field ใช้ชื่อ `file_url_sanitized`

### `incident_evidence`

- export เฉพาะ child ที่ `is_sanitized=true`
- รองรับ `evidence_text_sanitized`, `evidence_image_url`, `evidence_url_sanitized`

### `dashboard_summary`

- แปลง metrics จาก dashboard summary เป็น key/value rows
- columns: `metric`, `value`

## Sanitization / Policy Rules

- ห้าม bypass `prepareIncidentDataset`
- URL/path ถูก sanitize ซ้ำก่อน export
- reject ถ้ามี blocked secret-like pattern ใน output row
- reject ถ้า URL field ยังมี query string/fragment
- ไม่ dump raw sensitive payload ใน log

## CLI

```bash
node src/export-sheet-contract.js \
  --in fixtures/sample-incident-bundles.json \
  --out /private/tmp/sheet-export-contract.json \
  --now 2026-05-12T12:00:00.000Z
```

stdout summary (sanitized-only):

- incident row count
- sanitized attachment row count
- sanitized evidence row count
- output filename only

## Google Sheets Value Ranges Helper

`toGoogleSheetValueRanges(contract)` ช่วยแปลง contract เป็นรูปแบบ 2D array ต่อ sheet:

- row แรก = headers
- row ถัดไป = values

เหมาะกับการนำไปใช้กับ Google Sheets API layer ต่อไป
