# AGENTS.md

## Project Role

คุณคือ Codex Agent สำหรับโปรเจกต์ Incident Dashboard / SOC Monitoring ของหน่วยงานในสังกัดกระทรวงสาธารณสุข

เป้าหมายหลักคือสร้างระบบต้นแบบที่ใช้งานง่าย คล่องตัว และปลอดภัย สำหรับบันทึก ติดตาม วิเคราะห์ และรายงานเหตุการณ์ด้าน Cyber / Web Compromise โดยเน้นข้อมูลแบบ sanitized-only

ระบบต้องรองรับ flow หลัก:

```text
Master Data → Incident Form → Validation → Workflow → SLA → Dashboard → Report
```

---

## Read First Rule

ก่อนเริ่มงานทุกครั้ง ต้องอ่านไฟล์ต่อไปนี้ก่อนเสมอ:

1. `AGENTS.md`
2. `ROADMAP.md`
3. `HANDOFF.md`
4. `TESTING.md`

หากไฟล์ใดไม่มีอยู่ ให้สร้างหรืออัปเดตให้เหมาะสมก่อนเริ่ม implement

---

## Thai Token Saving Rule

Use concise Thai for explanations.

Preserve exactly:
- commands
- code
- file paths
- URLs when explicitly required
- config keys
- API names
- versions
- error text
- security constraints
- test commands
- rollback steps
- acceptance criteria

Avoid:
- repeated background
- long politeness
- restating unchanged context
- verbose summaries

Default response format:
1. Done
2. Changed files
3. Tests
4. Risks
5. Next step

## Core Safety Rules

ห้ามสร้างระบบที่เก็บหรือแสดงข้อมูลอ่อนไหวโดยตรง

ห้ามเก็บหรือแสดง:

- credential
- password
- cookie
- session token
- API key
- secret
- raw access token
- PII
- URL ที่มี query/token sensitive
- raw evidence ที่ยังไม่ sanitize

ทุก output สำหรับ Dashboard / Report / Export ต้องเป็น sanitized-only

---

## Sanitized Data Policy

ข้อมูลที่นำไปใช้ต่อได้ต้องผ่านการ sanitize แล้วเท่านั้น เช่น:

- `summary_sanitized`
- `affected_domain_sanitized`
- `affected_url_sanitized`
- `suspicious_path_sanitized`
- `evidence_text_sanitized`
- `evidence_url_sanitized`
- `primary_image_sanitized_note`

URL ต้องตัด query string และ token-sensitive parameters ออกก่อนแสดงผล

ตัวอย่างที่ต้อง sanitize:

```text
https://example.moph.go.th/path?token=abc123
```

ควรเหลือเป็น:

```text
https://example.moph.go.th/path
```

---

## System Scope

ระบบต้นแบบควรมีขนาดไม่ใหญ่เกินจำเป็น และเน้นความคล่องตัว

ขอบเขตหลัก:

1. Master Data
2. Incident Form
3. Validation
4. Workflow
5. SLA
6. Dashboard-ready payload
7. Report / Export
8. Unit tests / Regression tests
9. Documentation

---

## Data Model Rule

ไม่เก็บรูปภาพโดยตรงในตาราง `incident`

ให้ใช้ child tables แทน:

- `incident_attachment`
- `incident_evidence`

ตาราง `incident` เก็บเฉพาะ metadata หรือ primary image reference เช่น:

- `has_image`
- `primary_image_url`
- `primary_image_caption`
- `primary_image_sanitized_note`

---

## Main Tables

### incident

ตารางหลักสำหรับบันทึกเหตุการณ์

ควรรองรับ fields สำคัญ:

- incident_id
- incident_code
- reported_at
- detected_at
- organization_id
- organization_name
- health_region
- province
- agency_type
- incident_type
- incident_category
- severity
- priority
- status
- workflow_stage
- sla_status
- assigned_team
- assigned_to
- summary_sanitized
- affected_domain_sanitized
- affected_url_sanitized
- suspicious_path_sanitized
- detection_source
- has_image
- primary_image_url
- primary_image_caption
- primary_image_sanitized_note
- created_by
- created_at
- updated_by
- updated_at
- closed_at

### incident_attachment

ตารางลูกสำหรับไฟล์แนบและรูปภาพ

- attachment_id
- incident_id
- attachment_type
- file_name
- file_url
- file_mime_type
- file_size
- image_caption
- image_taken_at
- image_source
- is_sanitized
- sanitized_by
- sanitized_at
- sanitized_note
- created_by
- created_at

### incident_evidence

ตารางลูกสำหรับหลักฐานเหตุการณ์

- evidence_id
- incident_id
- evidence_type
- evidence_text_sanitized
- evidence_image_url
- evidence_image_caption
- evidence_url_sanitized
- source_type
- confidence_score
- is_sanitized
- sanitized_note
- collected_at
- created_by
- created_at

---

## Master Data

ควรมี master data สำหรับ:

- organization
- health_region
- province
- agency_type
- incident_type
- severity
- status
- workflow_stage
- sla_policy
- detection_source

Master Data ควรใช้เป็น source of truth สำหรับ validation และ filter

---

## Dashboard Principles

Dashboard ต้องเหมาะกับบริบทกระทรวงสาธารณสุข

ต้อง filter ได้อย่างน้อยตาม:

- หน่วยงาน
- เขตสุขภาพ
- จังหวัด
- ประเภทหน่วยงาน
- ประเภทเหตุการณ์
- severity
- status
- SLA
- ช่วงเวลา
- มีรูปภาพหรือไม่

มุมมองหลัก:

1. Executive View
2. SOC Operations View
3. Agency Follow-up View

---

## Workflow Stages

ค่า workflow เบื้องต้น:

- New
- Triage
- Investigating
- Waiting for Agency
- Contained
- Resolved
- Closed

---

## SLA Status

ค่า SLA เบื้องต้น:

- within_sla
- near_due
- overdue
- closed

การคำนวณ SLA ต้องสัมพันธ์กับ severity และ status

---

## Testing Rule

ทุก logic สำคัญต้องมี tests:

- model validation
- sanitization
- URL sanitization
- secret rejection
- attachment validation
- evidence validation
- SLA calculation
- workflow transition
- dashboard aggregation
- report sanitized-only
- missing optional field fallback

---

## Documentation Rule

เมื่อแก้ไขระบบ ต้องอัปเดตเอกสารที่เกี่ยวข้องเสมอ:

- README.md
- ROADMAP.md
- HANDOFF.md
- TESTING.md
- docs/data-model.md
- docs/dashboard-contract.md
- docs/sanitization-policy.md

---

## Definition of Done

งานจะถือว่าเสร็จเมื่อ:

- data model ใช้งานได้
- validation ผ่าน
- sanitization ครอบคลุม
- dashboard-ready payload สร้างได้
- report/export ใช้ sanitized-only
- tests ผ่าน
- docs อัปเดต
- HANDOFF.md ระบุสถานะล่าสุดและ next task

---
## App / External Connector Rules

- Do not connect to production Google Sheets, Drive, Gmail, or Calendar unless explicitly approved.
- Use local fixtures first.
- Use sanitized evidence only.
- Never store credentials, cookies, tokens, secrets, or PII.
- Never output raw URLs with query strings or tokens.
- All external data must pass validation before use.
- All dashboard payloads must be generated from sanitized findings, sanitized evidence, and scored findings only.
- If connector data is missing, use safe fallback values.
- Add regression tests for redaction and sanitized-only output.

---
## RTK Token-Saving Workflow

This project may use `rtk-ai/rtk` as an optional command-output compression/proxy layer to reduce token usage when Codex runs terminal commands.

Reference:

- https://github.com/rtk-ai/rtk.git

### Purpose

Use RTK to reduce noisy terminal output from common project commands such as tests, diffs, status checks, and file listings.

RTK is only a token-saving helper. It is not a security control, test oracle, sanitizer, or replacement for project validation.

### Core Rules

- Always read this `AGENTS.md` before starting work.
- Preserve all project security and sanitization rules.
- Use sanitized-only evidence, sanitized findings, and sanitized report output.
- Do not expose secrets, tokens, cookies, credentials, raw sensitive URLs, query strings, or PII.
- Do not use RTK to hide failing tests, skipped checks, warnings, or incomplete work.
- If RTK is unavailable, use normal commands with concise output.
- Do not install RTK or new dependencies automatically unless the user explicitly asks.

### Check RTK Availability

Before using RTK, check whether it is available:

```bash
rtk --version
rtk gain