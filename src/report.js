const { buildDashboardPayload } = require("./dashboard");
const { escapeHtml } = require("./sanitization");

function generateReport({ type = "executive", format = "markdown", payload, bundles, filters, now }) {
  const resolvedPayload = payload || buildDashboardPayload(bundles || [], { filters, now });

  switch (format) {
    case "json":
      return JSON.stringify(buildReportObject(type, resolvedPayload), null, 2);
    case "html":
      return toHtmlReport(type, buildReportObject(type, resolvedPayload));
    case "markdown":
    default:
      return toMarkdownReport(type, buildReportObject(type, resolvedPayload));
  }
}

function buildReportObject(type, payload) {
  switch (type) {
    case "soc":
      return buildSocReport(payload);
    case "agency":
      return buildAgencyReport(payload);
    case "executive":
    default:
      return buildExecutiveReport(payload);
  }
}

function buildExecutiveReport(payload) {
  return {
    type: "Executive Summary",
    generated_at: payload.generated_at,
    summary: payload.summary,
    highlights: payload.views.executive,
    incidents: payload.records.slice(0, 5).map(toReportIncident)
  };
}

function buildSocReport(payload) {
  return {
    type: "SOC Operations Report",
    generated_at: payload.generated_at,
    queue: payload.views.soc_operations.queue_by_workflow,
    overdue_incidents: payload.views.soc_operations.overdue_incidents.map(toReportIncident),
    triage_candidates: payload.views.soc_operations.triage_candidates.map(toReportIncident)
  };
}

function buildAgencyReport(payload) {
  return {
    type: "Agency Follow-up Report",
    generated_at: payload.generated_at,
    waiting_for_agency_count: payload.views.agency_follow_up.waiting_for_agency_count,
    by_organization: payload.views.agency_follow_up.by_organization,
    incidents: payload.views.agency_follow_up.waiting_for_agency_records.map(toReportIncident)
  };
}

function toReportIncident(record) {
  return {
    incident_code: record.incident_code,
    organization_name: record.organization_name,
    incident_type: record.incident_type,
    severity: record.severity,
    status: record.status,
    workflow_stage: record.workflow_stage,
    sla_status: record.sla_status,
    summary_sanitized: record.summary_sanitized,
    suspicious_path_sanitized:
      record.suspicious_path_sanitized || "No suspicious path provided",
    evidence_preview:
      record.evidence_preview.length > 0
        ? record.evidence_preview
        : ["No sanitized evidence available."],
    primary_image_sanitized_note:
      record.primary_image_sanitized_note || "No primary image note provided."
  };
}

function toMarkdownReport(type, report) {
  switch (type) {
    case "soc":
      return [
        "# SOC Operations Report",
        "",
        `Generated at: ${report.generated_at}`,
        "",
        "## Queue by Workflow",
        ...Object.entries(report.queue).map(([stage, count]) => `- ${stage}: ${count}`),
        "",
        "## Overdue Incidents",
        ...(report.overdue_incidents.length
          ? report.overdue_incidents.map(formatMarkdownIncident)
          : ["- No overdue incidents."]),
        "",
        "## Triage Candidates",
        ...(report.triage_candidates.length
          ? report.triage_candidates.map(formatMarkdownIncident)
          : ["- No triage candidates."])
      ].join("\n");
    case "agency":
      return [
        "# Agency Follow-up Report",
        "",
        `Generated at: ${report.generated_at}`,
        "",
        `Waiting for agency: ${report.waiting_for_agency_count}`,
        "",
        "## By Organization",
        ...report.by_organization.map((item) => `- ${item.label}: ${item.count}`),
        "",
        "## Incidents",
        ...(report.incidents.length
          ? report.incidents.map(formatMarkdownIncident)
          : ["- No agency follow-up incidents."])
      ].join("\n");
    case "executive":
    default:
      return [
        "# Executive Summary",
        "",
        `Generated at: ${report.generated_at}`,
        "",
        "## Summary",
        ...Object.entries(report.summary).map(([key, value]) => `- ${key}: ${value}`),
        "",
        "## Regional Hotspots",
        ...report.highlights.regional_hotspots.map((item) => `- ${item.label}: ${item.count}`),
        "",
        "## Top Incident Types",
        ...report.highlights.top_incident_types.map((item) => `- ${item.label}: ${item.count}`),
        "",
        "## Notable Incidents",
        ...(report.incidents.length
          ? report.incidents.map(formatMarkdownIncident)
          : ["- No incidents available."])
      ].join("\n");
  }
}

function toHtmlReport(type, report) {
  const markdown = toMarkdownReport(type, report)
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) {
        return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      }
      if (line.startsWith("## ")) {
        return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      }
      if (line.startsWith("- ")) {
        return `<li>${escapeHtml(line.slice(2))}</li>`;
      }
      if (!line) {
        return "";
      }
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(report.type)}</title>
</head>
<body>
${markdown}
</body>
</html>`;
}

function formatMarkdownIncident(incident) {
  return `- ${incident.incident_code} | ${incident.organization_name} | ${incident.incident_type} | ${incident.severity} | ${incident.sla_status} | ${incident.summary_sanitized}`;
}

module.exports = {
  generateReport
};
