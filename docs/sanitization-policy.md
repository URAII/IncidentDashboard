# Sanitization Policy

## Mandatory Rule

Dashboard, report, and export outputs must use sanitized-only content.

## Blocked Content

The prototype rejects or strips content that looks like:

- `password=`
- `api_key=`
- `secret=`
- `authorization:`
- `bearer`
- `cookie=`
- `session=`
- `access_token=`
- `refresh_token=`
- private key blocks

## URL Handling

- Remove query strings and fragments from URLs before storage/output
- Keep only origin plus path for full URLs
- Keep only path for suspicious path indicators

Example:

```text
https://example.moph.go.th/path?token=abc123
```

becomes:

```text
https://example.moph.go.th/path
```

## PII Handling

- Email addresses are replaced with `[REDACTED_EMAIL]`
- Phone numbers are replaced with `[REDACTED_PHONE]`

## Export Gate

- Incident fields must already be sanitized to pass validation
- Unsanitized attachments/evidence can exist in storage flow but are excluded from dashboard/report payloads
- Spreadsheet CSV ingestion must pass through `prepareIncidentDataset` and may not bypass validation/sanitization
