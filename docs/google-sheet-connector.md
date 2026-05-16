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
- ใช้ keyless auth สำหรับ CI protected smoke (WIF/OIDC) เป็นวิธีหลัก

## Required Env (staging only)

- `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`
- `GOOGLE_APPLICATION_CREDENTIALS`

## Protected CI Auth Model (M30 WIF Switch)

- org policy: `iam.disableServiceAccountKeyCreation`
- ดังนั้น protected workflow ไม่พึ่ง `GOOGLE_APPLICATION_CREDENTIALS_JSON` เป็นวิธีหลัก
- ใช้ `google-github-actions/auth@v3` + Workload Identity Federation เพื่อสร้าง credential file ชั่วคราวและ export `GOOGLE_APPLICATION_CREDENTIALS` ให้ runtime

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
  - workflow ตรวจ WIF config ก่อน (`GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`)
  - ถ้า WIF config ไม่ครบ จะ skip พร้อม diagnostic `status=skip` โดยไม่ทำให้ PR ทั่วไป fail
  - ถ้า WIF config ครบ จะ auth ผ่าน OIDC และ export `GOOGLE_APPLICATION_CREDENTIALS` ให้ smoke runtime
  - ใช้ `npm run smoke:google-sheet:staging` เป็น single entrypoint
- required secret names:
  - `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_SERVICE_ACCOUNT_EMAIL`

## M27 Verification Status

- protected workflow parse issue was fixed by removing parse-time secret expression branching and using runtime shell guards
- verified run (masked evidence):
  - workflow run ids: `25922859625`, `25922970895`
  - `Readiness Check`: success
  - `Google Sheet Staging Smoke (Protected)`: success with skip-path when secrets are absent
- if secrets are absent:
  - smoke reports `status=skip`
  - CI stays green for generic PR/push flows
- to verify real staging write success path:
  - configure both secrets in repository settings
  - rerun workflow and confirm smoke output shows staging write completion (no skip)

## M30 Operational Closure Notes

- required secrets for write-path (WIF):
  - `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_SERVICE_ACCOUNT_EMAIL`
- if secrets are missing:
  - protected smoke must skip clearly without failing generic PR flows
- if secrets are present:
  - protected smoke should report write-path success (not `status=skip`)
- evidence policy:
  - record only masked/sanitized run evidence in docs/handoff

## Notes

- ตัว connector รองรับ service account JWT flow เพื่อขอ access token แล้วเรียก `spreadsheets.values.batchUpdate`
- protected CI แนะนำ WIF/OIDC แทน service account key JSON ตาม policy องค์กร
- แนะนำใช้ staging spreadsheet เฉพาะสำหรับทดสอบ contract
- หมายเหตุ: `check:import:xlsx` ปัจจุบันเป็น sheet-tab compatibility gate ไม่ใช่ binary `.xlsx` parser โดยตรง
