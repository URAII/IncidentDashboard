const test = require("node:test");
const assert = require("node:assert/strict");

const { ingestCsvText, buildDashboardPayload } = require("../src");

const NOW = "2026-05-12T12:00:00.000Z";

test("CSV adapter ingests local rows and reuses sanitization/validation flow", () => {
  const csv = [
    "incident_id,incident_code,reported_at,detected_at,organization_id,incident_type,severity,workflow_stage,summary_sanitized,affected_domain_sanitized,affected_url_sanitized,suspicious_path_sanitized,detection_source,created_by,created_at,evidence_id,evidence_type,evidence_url_sanitized,evidence_is_sanitized,evidence_created_by,evidence_created_at",
    "INC-CSV-001,MOPH-CSV-0001,2026-05-12T07:00:00.000Z,2026-05-12T07:10:00.000Z,ORG-001,Web Defacement,Critical,Investigating,Homepage defacement reported,chiangmaihealth.example,https://chiangmaihealth.example/index.html?token=abc123,https://chiangmaihealth.example/wp-content/shell.php?auth=1,SOC Monitoring,sheet.importer,2026-05-12T07:05:00.000Z,EVD-CSV-001,url,https://chiangmaihealth.example/index.html?token=abc123,true,sheet.importer,2026-05-12T07:05:00.000Z"
  ].join("\n");

  const result = ingestCsvText(csv, { now: NOW });

  assert.equal(result.rows_count, 1);
  assert.equal(result.errors.length, 0);
  assert.equal(result.validBundles.length, 1);
  assert.equal(
    result.validBundles[0].incident.affected_url_sanitized,
    "https://chiangmaihealth.example/index.html"
  );
  assert.equal(
    result.validBundles[0].incident.suspicious_path_sanitized,
    "/wp-content/shell.php"
  );
  assert.equal(
    result.validBundles[0].evidence[0].evidence_url_sanitized,
    "https://chiangmaihealth.example/index.html"
  );
});

test("CSV adapter reports validation errors when sanitized narrative still contains secret-like pattern", () => {
  const csv = [
    "incident_id,incident_code,reported_at,organization_id,incident_type,severity,workflow_stage,summary_sanitized,detection_source,created_by,created_at",
    "INC-CSV-002,MOPH-CSV-0002,2026-05-12T08:00:00.000Z,ORG-002,Suspicious Redirect,High,Triage,password=SHOULD_NOT_PASS,Agency Report,sheet.importer,2026-05-12T08:01:00.000Z"
  ].join("\n");

  const result = ingestCsvText(csv, { now: NOW });

  assert.equal(result.validBundles.length, 0);
  assert.equal(result.errors.length, 1);
  assert.ok(result.errors[0].errors.some((error) => error.field === "summary_sanitized"));
});

test("CSV adapter keeps unsanitized evidence out of dashboard preview", () => {
  const csv = [
    "incident_id,incident_code,reported_at,organization_id,incident_type,severity,workflow_stage,summary_sanitized,detection_source,created_by,created_at,evidence_type,evidence_text_sanitized,evidence_is_sanitized,evidence_created_at",
    "INC-CSV-003,MOPH-CSV-0003,2026-05-12T09:00:00.000Z,ORG-004,Phishing,Low,Triage,Phishing lure reported,Agency Report,sheet.importer,2026-05-12T09:01:00.000Z,text,Suspicious lure shared by caller,false,2026-05-12T09:01:00.000Z"
  ].join("\n");

  const result = ingestCsvText(csv, { now: NOW });
  assert.equal(result.errors.length, 0);
  assert.equal(result.validBundles.length, 1);

  const payload = buildDashboardPayload(result.validBundles, { now: NOW });
  const record = payload.records[0];

  assert.equal(record.sanitized_evidence_count, 0);
  assert.deepEqual(record.evidence_preview, []);
});
