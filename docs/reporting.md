# Reporting

Supported report types:

- Executive Summary
- SOC Operations Report
- Agency Follow-up Report

Supported formats:

- Markdown
- HTML
- JSON

## Report Safety

- Reports are generated from dashboard payloads only
- Dashboard payloads already exclude unsanitized evidence and attachments
- Report incidents include fallback text when optional details are missing
- HTML output escapes rendered content
