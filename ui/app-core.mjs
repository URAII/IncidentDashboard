export function fallback(value, text = "No sanitized data provided.") {
  if (value == null) {
    return text;
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? text : value;
  }

  if (typeof value === "string" && value.trim() === "") {
    return text;
  }

  return value;
}

export function sanitizeDisplayUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch (error) {
    return String(value).split(/[?#]/u)[0] || null;
  }
}

export function formatDateTime(value) {
  if (!value) {
    return "No timestamp available.";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No timestamp available.";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(date);
}

export function countEntries(map, fallbackLabel = "No data") {
  const source = map || {};
  const entries = Object.entries(source).map(([label, count]) => ({ label, count }));
  if (entries.length === 0) {
    return [{ label: fallbackLabel, count: 0 }];
  }

  return entries.sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function buildMetricCards(payload) {
  const summary = payload.summary || {};
  return [
    { label: "Total Incidents", value: summary.total_incidents ?? 0, tone: "slate" },
    { label: "Sanitized Findings", value: summary.total_findings ?? 0, tone: "teal" },
    { label: "Overdue SLA", value: summary.overdue_sla ?? 0, tone: "coral" },
    { label: "Affected Organizations", value: summary.affected_organizations ?? 0, tone: "gold" },
    { label: "Incidents with Images", value: summary.incidents_with_images ?? 0, tone: "mint" },
    { label: "Image Evidence Items", value: summary.image_evidence_items ?? 0, tone: "sky" }
  ];
}

export function buildOverviewCards(payload, view) {
  const aggregates = payload.aggregates || {};
  const variants = {
    executive: [
      { title: "Severity Count", items: countEntries(aggregates.by_severity) },
      { title: "SLA Status", items: countEntries(aggregates.by_sla_status) },
      { title: "Health Regions", items: countEntries(aggregates.by_health_region) },
      { title: "Provinces", items: countEntries(aggregates.by_province) }
    ],
    soc: [
      { title: "Workflow Queue", items: countEntries(aggregates.by_workflow_stage) },
      { title: "Severity Count", items: countEntries(aggregates.by_severity) },
      { title: "SLA Status", items: countEntries(aggregates.by_sla_status) },
      { title: "Incident Type", items: countEntries(aggregates.by_incident_type) }
    ],
    agency: [
      { title: "Workflow Queue", items: countEntries(aggregates.by_workflow_stage) },
      { title: "Affected Organizations", items: fallback(payload.views?.agency_follow_up?.by_organization, []) },
      { title: "Health Regions", items: countEntries(aggregates.by_health_region) },
      { title: "Provinces", items: countEntries(aggregates.by_province) }
    ]
  };

  return variants[view] || variants.executive;
}

export function buildHighlightGroups(payload, view) {
  const groups = {
    executive: [
      {
        title: "Regional Hotspots",
        items: fallback(payload.views?.executive?.regional_hotspots, [])
      },
      {
        title: "Top Incident Types",
        items: fallback(payload.views?.executive?.top_incident_types, [])
      },
      {
        title: "Top Organizations",
        items: fallback(payload.views?.executive?.top_organizations, [])
      }
    ],
    soc: [
      {
        title: "Queue by Workflow",
        items: countEntries(payload.views?.soc_operations?.queue_by_workflow)
      },
      {
        title: "Overdue Incidents",
        items: fallback(payload.views?.soc_operations?.overdue_incidents, [])
      },
      {
        title: "Triage Candidates",
        items: fallback(payload.views?.soc_operations?.triage_candidates, [])
      }
    ],
    agency: [
      {
        title: "Waiting for Agency",
        items: fallback(payload.views?.agency_follow_up?.waiting_for_agency_records, [])
      },
      {
        title: "By Organization",
        items: fallback(payload.views?.agency_follow_up?.by_organization, [])
      }
    ]
  };

  return groups[view] || groups.executive;
}

export function normalizeRecord(record) {
  return {
    ...record,
    summary_sanitized: fallback(record.summary_sanitized),
    affected_url_sanitized: sanitizeDisplayUrl(record.affected_url_sanitized),
    suspicious_path_sanitized: fallback(record.suspicious_path_sanitized, "No suspicious path provided."),
    primary_image_caption: fallback(record.primary_image_caption, "No image caption provided."),
    primary_image_sanitized_note: fallback(
      record.primary_image_sanitized_note,
      "No sanitized image note provided."
    ),
    evidence_preview: fallback(record.evidence_preview, ["No sanitized evidence available."])
  };
}
