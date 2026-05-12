# Data Model

## Incident

The `incident` record stores sanitized incident metadata only. It does not store binary image content.

Required core fields:

- `incident_id`
- `incident_code`
- `reported_at`
- `detected_at`
- `organization_id`
- `organization_name`
- `health_region`
- `province`
- `agency_type`
- `incident_type`
- `incident_category`
- `severity`
- `priority`
- `status`
- `workflow_stage`
- `sla_status`
- `assigned_team`
- `assigned_to`
- `summary_sanitized`
- `affected_domain_sanitized`
- `affected_url_sanitized`
- `suspicious_path_sanitized`
- `detection_source`
- `has_image`
- `primary_image_url`
- `primary_image_caption`
- `primary_image_sanitized_note`
- `created_by`
- `created_at`
- `updated_by`
- `updated_at`
- `closed_at`

## incident_attachment

Child collection for sanitized file metadata and image references:

- `attachment_id`
- `incident_id`
- `attachment_type`
- `file_name`
- `file_url`
- `file_mime_type`
- `file_size`
- `image_caption`
- `image_taken_at`
- `image_source`
- `is_sanitized`
- `sanitized_by`
- `sanitized_at`
- `sanitized_note`
- `created_by`
- `created_at`

## incident_evidence

Child collection for sanitized evidence:

- `evidence_id`
- `incident_id`
- `evidence_type`
- `evidence_text_sanitized`
- `evidence_image_url`
- `evidence_image_caption`
- `evidence_url_sanitized`
- `source_type`
- `confidence_score`
- `is_sanitized`
- `sanitized_note`
- `collected_at`
- `created_by`
- `created_at`

## Prototype Notes

- `organization_name`, `health_region`, `province`, and `agency_type` are resolved from master data when not supplied explicitly.
- `has_image` is validated against `primary_image_url` and child evidence/attachment image references.
- `sla_status`, `sla_due_at`, `sla_elapsed_hours`, and `sla_target_hours` are derived fields used by dashboard payloads and reports.
