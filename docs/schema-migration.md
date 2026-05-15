# Schema Migration Policy (M30)

## Scope

กำหนดนโยบาย migration ระหว่าง schema import `v1` และ `v2` สำหรับ CSV/XLSX adapter flow โดยยึด `sanitized-only` policy

## Current State

- default schema: `v2`
- compatibility schema: `v1` (optional gate)
- required readiness gates ใช้ `v2`

## v1 End-of-Support (EOL)

- announce date: 2026-05-15
- end-of-support date: 2026-09-30
- planned removal window: 2026-10-01 เป็นต้นไป

## Removal Plan

### Phase 1: Freeze (ก่อน EOL)

1. ไม่เพิ่ม feature ใหม่ใน `v1`
2. keep เฉพาะ compatibility checks ที่จำเป็น
3. monitor `npm run check:import:v1-compat` usage ใน CI/report

### Phase 2: EOL Cutoff (2026-09-30)

1. แจ้งผู้ใช้งานทุก integration ให้ย้ายไป `v2`
2. freeze template/fixture ใหม่ทั้งหมดบน `v2`
3. keep warning ใน docs/runbook ว่า `v1` ใกล้ถอด

### Phase 3: Removal (หลัง 2026-10-01)

1. ถอด script `check:import:v1-compat`
2. ถอด `v1` schema profile ใน adapter
3. ถอด warning/branch logic ที่เกี่ยวกับ deprecated `v1`
4. ถอด fixtures/tests/docs ที่อ้าง `v1`
5. ปรับ runbook/testing/handoff ให้เหลือ `v2` only

## Target Change Set (for v1 removal)

- `package.json`: remove `check:import:v1-compat`
- `scripts/check-import-v1-compat.js`: remove file
- `src/spreadsheet-adapter.js`: remove `v1` profile + `v1` fallback paths
- `tests/test_spreadsheet_multifile.test.js`: remove/update v1 compatibility cases
- `tests/test_import_csv_cli.test.js`: remove/update v1 compatibility assertions
- `fixtures/csv-multifile/*.valid.csv` (v1 legacy set): remove or archive
- `README.md`, `TESTING.md`, `HANDOFF.md`, `docs/production-runbook.md`: update to `v2` only

## Rollback Plan

ถ้า removal ทำให้ ingestion regression:

1. revert commit ชุดถอด `v1`
2. restore `check:import:v1-compat`
3. รันยืนยัน:

```bash
npm run check
npm test
npm run check:import:v2
npm run check:import:xlsx
npm run check:import:xlsx:binary
npm run check:template-drift
```

4. บันทึก root cause + rollback detail ลง `HANDOFF.md`

## Policy Notes

- ห้าม output/raw logs ที่มี credential/token/secret/PII
- migration evidence ใช้ sanitized summary เท่านั้น
