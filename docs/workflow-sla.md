# Workflow and SLA

## Workflow Stages

- `New`
- `Triage`
- `Investigating`
- `Waiting for Agency`
- `Contained`
- `Resolved`
- `Closed`

## Status Mapping

- `New`, `Triage`, `Investigating` -> `Open`
- `Waiting for Agency`, `Contained` -> `Monitoring`
- `Resolved` -> `Resolved`
- `Closed` -> `Closed`

## SLA Status

- `within_sla`
- `near_due`
- `overdue`
- `closed`

## Default SLA Policy

- `Critical` -> 4 hours
- `High` -> 8 hours
- `Medium` -> 24 hours
- `Low` -> 72 hours

Near-due threshold is `75%` of the target window.
