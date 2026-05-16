# Production Runbook (M29 Release Candidate Readiness)

## Purpose

คู่มือ readiness ก่อน release สำหรับ Incident Dashboard โดยบังคับ `sanitized-only` ตลอด flow

## End-to-End Flow

```text
AppSheet / Google Sheet / XLSX / CSV
-> adapter (CSV multi-file + XLSX binary/template drift)
-> validation + sanitization
-> dashboard payload
-> report/export contract
```

## Required Gates

ต้องผ่านทั้งหมดก่อน release:

1. `npm test`
2. `npm run check`
3. `npm run check:import:v2`
4. `npm run check:import:xlsx`
5. `npm run check:import:xlsx:binary`
6. `npm run check:template-drift`

## Optional Gates

ใช้เสริมตามสถานะ migration/staging:

1. `npm run check:import:v1-compat`
2. `npm run smoke:google-sheet:staging`

## GitHub Operations (M30)

1. Repository secrets required for protected staging write (WIF):
   - `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`
   - `GCP_SERVICE_ACCOUNT_EMAIL`
2. Protected smoke auth model:
   - `google-github-actions/auth@v3`
   - `permissions`: `contents: read`, `id-token: write`
   - keyless auth via Workload Identity Federation
2. Branch protection on `main` must require:
   - status check `Readiness Check`
3. CI readiness job must verify `unzip` availability before gates run

## Release Checklist

1. Sanitize policy: output ต้องเป็น `sanitized-only`
2. Security policy: ไม่มี raw URL query/token/secret/credential/PII ใน log/output/report/export
3. Schema default: default import profile = `v2`
4. v1 window: หากยังต้องรองรับ v1 ให้รัน `check:import:v1-compat`
5. Template drift: `check:template-drift` ต้องผ่าน
6. Binary parser: `check:import:xlsx:binary` ต้องผ่าน
7. Staging readiness: ถ้า secrets พร้อม ให้รัน `smoke:google-sheet:staging`
8. Rollback plan: มี commit/rollback step ชัดเจนก่อน merge/release
9. Branch protection verify: `Readiness Check` ยังเป็น required check บน `main`
10. Secrets verify: protected staging smoke จะ success-write ได้เมื่อ secrets พร้อม

## v1 Support Timeline

1. v1 support status: compatibility-only
2. v1 end-of-support date: `2026-09-30`
3. removal window start: `2026-10-01`
4. detailed plan: [docs/schema-migration.md](/Users/mmdx/Incident%20Dashboard/IncidentDashboard/docs/schema-migration.md)

## Rollback Procedure

1. rollback code ไป commit ล่าสุดที่ gate ผ่าน
2. รันซ้ำ:

```bash
npm run check
npm test
```

3. ยืนยัน required gates ผ่านอีกครั้ง
4. บันทึกเหตุการณ์ rollback + root cause ใน `HANDOFF.md`

## Troubleshooting

### 1) `unzip` not found

อาการ: binary/template gate fail ทันที

แก้:

```bash
which unzip
brew install unzip
```

### 2) Wrong header / wrong sheet name

อาการ: `check:template-drift` หรือ `check:import:xlsx:binary` ขึ้น `missing_required_header`, `unknown_header`, `missing_sheet`

แก้:

1. ตรวจ workbook template ให้ตรง `v2`
2. อัปเดตเฉพาะ sanitized fixture/template
3. รัน `npm run check:template-drift` ซ้ำ

### 3) Corrupted `.xlsx`

อาการ: `corrupted_workbook`

แก้:

1. สร้างไฟล์ใหม่จาก template ที่ถูกต้อง
2. ห้ามใช้ไฟล์ที่มีข้อมูลจริง/PII
3. รัน `npm run check:import:xlsx:binary` ซ้ำ

### 4) Missing staging secrets

อาการ: staging smoke skip หรือ fail ตาม mode

แก้:

1. ตั้ง secrets:
   - `GOOGLE_SHEETS_STAGING_SPREADSHEET_ID`
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`
   - `GCP_SERVICE_ACCOUNT_EMAIL`
2. รัน workflow protected smoke ซ้ำ
3. ยืนยัน log summary เป็น `status=pass` สำหรับ write-path (ไม่ใช่ `status=skip`)

หมายเหตุ policy:
- org policy `iam.disableServiceAccountKeyCreation` ทำให้ key JSON ไม่ใช่วิธีหลักใน protected CI

### 5) UI server bind skip in sandbox

อาการ: test UI ขึ้น skip เพราะ bind `127.0.0.1` ไม่ได้

แนวทาง:

1. ถือเป็น expected ใน restricted sandbox
2. ตรวจ core logic จาก test suite อื่นต่อ
3. ถ้าต้อง verify UI bind จริง ให้รันใน env ที่เปิด localhost bind

## Operational Notes

- ห้าม hardcode credential/token/secret
- ห้ามเพิ่ม non-sanitized output path
- ใช้ sanitized fixture/workbook เท่านั้น
- บน docs/handoff ให้ใช้ masked evidence เท่านั้นเมื่อรายงานผล CI/GitHub
