# Google Sheet Staging Connector (M25)

## Purpose

เชื่อมต่อ export contract (`m24.appsheet_google_sheet.v1`) ไปยัง Google Sheet staging แบบปลอดภัย โดย default เป็น `dry-run`

## Modules

- `src/google-sheet-connector.js`
- `src/export-google-sheet.js`
- `src/appsheet-schema-check.js`

## Safety Defaults

- mode เริ่มต้น: `dry-run`
- จะไม่เขียน Google Sheet จริงจนกว่าจะใส่ `--staging`
- ห้าม hardcode credential/token/spreadsheet secret ในโค้ด

## Required Env (staging only)

- `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`
- `GOOGLE_APPLICATION_CREDENTIALS`

## CLI

```bash
node src/export-google-sheet.js \
  --input /private/tmp/sheet-export-contract.json \
  --dry-run
```

```bash
node src/export-google-sheet.js \
  --input /private/tmp/sheet-export-contract.json \
  --schema fixtures/appsheet-schema.m25.sample.json \
  --staging
```

Smoke command:

```bash
npm run smoke:google-sheet:staging
```

- command นี้พยายามรัน `--staging` แต่จะ `skip` แบบชัดเจนถ้า env ที่จำเป็นยังไม่พร้อม

## AppSheet Compatibility Check

ก่อน staging write จะตรวจ schema เสมอ:

- sheet/table names
- required columns
- missing/extra columns
- key column presence
- key type (`text`) และ key format (regex)

หาก schema fail จะ block ก่อนยิง API

## Sanitization Rules

- logs/error ใช้ summary เท่านั้น
- ไม่พิมพ์ token/secret/credential/PII
- แสดง spreadsheet id แบบ masked (`xxxx...yyyy`)
- output contract ใช้ sanitized-only rows

## Protected CI Smoke (M26)

- workflow: `.github/workflows/ci.yml`
- job: `Google Sheet Staging Smoke (Protected)`
- behavior:
  - ถ้า `GOOGLE_APPLICATION_CREDENTIALS_JSON` secret พร้อม จะสร้าง credential file ชั่วคราวและรัน staging smoke
  - ถ้า secret ไม่พร้อม จะ skip โดยไม่ทำให้ PR ทั่วไป fail
  - ใช้ `npm run smoke:google-sheet:staging` เป็น single entrypoint
- required secret names:
  - `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON`

## Notes

- ตัว connector รองรับ service account JWT flow เพื่อขอ access token แล้วเรียก `spreadsheets.values.batchUpdate`
- แนะนำใช้ staging spreadsheet เฉพาะสำหรับทดสอบ contract
- หมายเหตุ: `check:import:xlsx` ปัจจุบันเป็น sheet-tab compatibility gate ไม่ใช่ binary `.xlsx` parser โดยตรง
