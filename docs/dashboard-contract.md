# Dashboard Contract

## Filters

Supported dashboard filters:

- `organization_id`
- `organization`
- `health_region`
- `province`
- `agency_type`
- `incident_type`
- `severity`
- `status`
- `sla_status`
- `date_from`
- `date_to`
- `has_image`

## Summary Cards

- `total_incidents`
- `open_incidents`
- `critical_incidents`
- `high_incidents`
- `overdue_sla`
- `incidents_with_images`
- `affected_organizations`
- `affected_health_regions`
- `latest_incident_time`

## Aggregate Sections

- `by_severity`
- `by_status`
- `by_workflow_stage`
- `by_health_region`
- `by_province`
- `by_agency_type`
- `by_incident_type`
- `by_sla_status`
- `incident_trend_by_date`
- `top_affected_organizations`
- `top_suspicious_paths`

## View Payloads

- `views.executive`
- `views.soc_operations`
- `views.agency_follow_up`

## Record-Level Output

Each dashboard record is sanitized-only and includes:

- sanitized incident metadata
- `sanitized_attachment_count`
- `sanitized_evidence_count`
- `evidence_preview` from sanitized evidence only

Unsanitized child records stay out of payload previews and report output.

## UI Data Notes

- `summary.total_findings` reflects sanitized evidence items only
- `summary.image_evidence_items` reflects sanitized image-type child evidence or attachments
- `filter_options.workflow_stages` is included for lightweight UI filter rendering
