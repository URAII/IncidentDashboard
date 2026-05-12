# Master Data

The prototype keeps master data as the source of truth for:

- organizations
- health regions
- provinces
- agency types
- incident types
- severities
- statuses
- workflow stages
- detection sources
- SLA policy

## Organizations

Sample organizations included:

- `ORG-001` Chiang Mai Provincial Public Health Office
- `ORG-002` Khon Kaen Hospital
- `ORG-003` Digital Health Security Division
- `ORG-004` Ubon Ratchathani Regional Health Office

## Validation Use

Master data is used to:

- resolve organization context into incident records
- validate filter values
- validate workflow/status/severity/source references
- drive SLA policy lookup
