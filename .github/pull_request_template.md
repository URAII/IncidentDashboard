## Summary

Describe template-related changes in sanitized terms only.

## Scope

- [ ] Template workbook path updated/checked: `fixtures/xlsx-multifile/template.v2.*.xlsx`
- [ ] Template release checklist artifact attached/updated: `fixtures/xlsx-multifile/template-release.v2.json`

## Required Governance Checklist

- [ ] `template_owner` identified in checklist artifact
- [ ] `reviewer` identified in checklist artifact
- [ ] `sanitized_sample_workbook` set in checklist artifact
- [ ] `schema_version` is `v2`
- [ ] `rollback_plan` documented in checklist artifact
- [ ] `owner_approved=true`
- [ ] `reviewer_approved=true`

## Required Checks

- [ ] `npm run check:template-drift` passed
- [ ] `npm run check:import:xlsx` passed
- [ ] `npm run check` passed

## Security / Sanitization

- [ ] No raw URL query/token/secret/PII included in PR description, logs, or examples
- [ ] No production credentials/cookies/secrets included

## Branch Rule Acknowledgement

- [ ] I understand merge must be blocked if template drift gate fails
- [ ] I understand Code Owners review is required for template workbook paths
- [ ] I understand CI + owner review + reviewer approval are required before merge
