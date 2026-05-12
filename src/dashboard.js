const { MASTER_DATA } = require("./master-data");

function filterIncidentBundles(bundles, filters = {}) {
  return (bundles || []).filter((bundle) => matchesFilters(bundle, filters));
}

function buildDashboardPayload(bundles, options = {}) {
  const now = options.now || new Date().toISOString();
  const filters = options.filters || {};
  const masterData = options.masterData || MASTER_DATA;
  const filtered = filterIncidentBundles(bundles, filters);
  const sanitizedAttachmentItems = filtered.reduce(
    (count, bundle) => count + bundle.attachments.filter((attachment) => attachment.is_sanitized).length,
    0
  );
  const sanitizedEvidenceItems = filtered.reduce(
    (count, bundle) => count + bundle.evidence.filter((evidence) => evidence.is_sanitized).length,
    0
  );
  const imageEvidenceItems = filtered.reduce(
    (count, bundle) =>
      count +
      bundle.attachments.filter(
        (attachment) => attachment.is_sanitized && attachment.attachment_type === "image"
      ).length +
      bundle.evidence.filter(
        (evidence) => evidence.is_sanitized && evidence.evidence_type === "image"
      ).length,
    0
  );

  const summary = {
    total_incidents: filtered.length,
    total_findings: sanitizedEvidenceItems,
    open_incidents: filtered.filter((bundle) => bundle.incident.status !== "Closed").length,
    critical_incidents: filtered.filter((bundle) => bundle.incident.severity === "Critical").length,
    high_incidents: filtered.filter((bundle) => bundle.incident.severity === "High").length,
    overdue_sla: filtered.filter((bundle) => bundle.incident.sla_status === "overdue").length,
    incidents_with_images: filtered.filter((bundle) => bundle.incident.has_image).length,
    image_evidence_items: imageEvidenceItems,
    sanitized_attachment_items: sanitizedAttachmentItems,
    sanitized_evidence_items: sanitizedEvidenceItems,
    affected_organizations: new Set(filtered.map((bundle) => bundle.incident.organization_id)).size,
    affected_health_regions: new Set(filtered.map((bundle) => bundle.incident.health_region)).size,
    latest_incident_time:
      filtered
        .map((bundle) => bundle.incident.reported_at)
        .sort()
        .at(-1) || null
  };

  const records = filtered.map((bundle) => toDashboardRecord(bundle));

  return {
    generated_at: now,
    filters_applied: filters,
    summary,
    aggregates: {
      by_severity: countBy(filtered, (bundle) => bundle.incident.severity),
      by_status: countBy(filtered, (bundle) => bundle.incident.status),
      by_workflow_stage: countBy(filtered, (bundle) => bundle.incident.workflow_stage),
      by_health_region: countBy(filtered, (bundle) => bundle.incident.health_region),
      by_province: countBy(filtered, (bundle) => bundle.incident.province),
      by_agency_type: countBy(filtered, (bundle) => bundle.incident.agency_type),
      by_incident_type: countBy(filtered, (bundle) => bundle.incident.incident_type),
      by_sla_status: countBy(filtered, (bundle) => bundle.incident.sla_status),
      incident_trend_by_date: countBy(filtered, (bundle) => bundle.incident.reported_at.slice(0, 10)),
      top_affected_organizations: topCounts(filtered, (bundle) => bundle.incident.organization_name),
      top_suspicious_paths: topCounts(
        filtered.filter((bundle) => bundle.incident.suspicious_path_sanitized),
        (bundle) => bundle.incident.suspicious_path_sanitized
      )
    },
    filter_options: buildFilterOptions(masterData),
    views: {
      executive: buildExecutiveView(filtered, summary),
      soc_operations: buildSocView(filtered),
      agency_follow_up: buildAgencyView(filtered)
    },
    records
  };
}

function buildFilterOptions(masterData) {
  return {
    organizations: masterData.organizations.map((organization) => ({
      organization_id: organization.organization_id,
      organization_name: organization.organization_name
    })),
    health_regions: masterData.health_regions.map((region) => region.name),
    provinces: [...masterData.provinces],
    agency_types: [...masterData.agency_types],
    incident_types: [...masterData.incident_types],
    severities: [...masterData.severities],
    statuses: [...masterData.statuses],
    workflow_stages: [...masterData.workflow_stages],
    sla_statuses: ["within_sla", "near_due", "overdue", "closed"]
  };
}

function buildExecutiveView(filtered, summary) {
  return {
    summary,
    top_organizations: topCounts(filtered, (bundle) => bundle.incident.organization_name),
    top_incident_types: topCounts(filtered, (bundle) => bundle.incident.incident_type),
    regional_hotspots: topCounts(filtered, (bundle) => bundle.incident.health_region)
  };
}

function buildSocView(filtered) {
  return {
    queue_by_workflow: countBy(filtered, (bundle) => bundle.incident.workflow_stage),
    overdue_incidents: filtered
      .filter((bundle) => bundle.incident.sla_status === "overdue")
      .map((bundle) => toDashboardRecord(bundle)),
    triage_candidates: filtered
      .filter((bundle) =>
        ["New", "Triage", "Investigating"].includes(bundle.incident.workflow_stage)
      )
      .map((bundle) => toDashboardRecord(bundle))
  };
}

function buildAgencyView(filtered) {
  const waitingForAgency = filtered.filter(
    (bundle) => bundle.incident.workflow_stage === "Waiting for Agency"
  );

  return {
    waiting_for_agency_count: waitingForAgency.length,
    waiting_for_agency_records: waitingForAgency.map((bundle) => toDashboardRecord(bundle)),
    by_organization: topCounts(filtered, (bundle) => bundle.incident.organization_name)
  };
}

function toDashboardRecord(bundle) {
  const sanitizedAttachments = bundle.attachments.filter((attachment) => attachment.is_sanitized);
  const sanitizedEvidence = bundle.evidence.filter((evidence) => evidence.is_sanitized);

  return {
    incident_id: bundle.incident.incident_id,
    incident_code: bundle.incident.incident_code,
    reported_at: bundle.incident.reported_at,
    detected_at: bundle.incident.detected_at,
    organization_id: bundle.incident.organization_id,
    organization_name: bundle.incident.organization_name,
    health_region: bundle.incident.health_region,
    province: bundle.incident.province,
    agency_type: bundle.incident.agency_type,
    incident_type: bundle.incident.incident_type,
    severity: bundle.incident.severity,
    priority: bundle.incident.priority,
    status: bundle.incident.status,
    workflow_stage: bundle.incident.workflow_stage,
    sla_status: bundle.incident.sla_status,
    summary_sanitized: bundle.incident.summary_sanitized,
    affected_domain_sanitized: bundle.incident.affected_domain_sanitized,
    affected_url_sanitized: bundle.incident.affected_url_sanitized,
    suspicious_path_sanitized: bundle.incident.suspicious_path_sanitized,
    has_image: bundle.incident.has_image,
    primary_image_url: bundle.incident.primary_image_url,
    primary_image_caption: bundle.incident.primary_image_caption,
    primary_image_sanitized_note: bundle.incident.primary_image_sanitized_note,
    sanitized_attachment_count: sanitizedAttachments.length,
    sanitized_evidence_count: sanitizedEvidence.length,
    evidence_preview: sanitizedEvidence
      .map((item) => item.evidence_text_sanitized || item.evidence_url_sanitized)
      .filter(Boolean)
      .slice(0, 3)
  };
}

function matchesFilters(bundle, filters) {
  const incident = bundle.incident;

  if (filters.organization_id && incident.organization_id !== filters.organization_id) {
    return false;
  }

  if (
    filters.organization &&
    ![incident.organization_name, incident.organization_id].includes(filters.organization)
  ) {
    return false;
  }

  if (filters.health_region && incident.health_region !== filters.health_region) {
    return false;
  }

  if (filters.province && incident.province !== filters.province) {
    return false;
  }

  if (filters.agency_type && incident.agency_type !== filters.agency_type) {
    return false;
  }

  if (filters.incident_type && incident.incident_type !== filters.incident_type) {
    return false;
  }

  if (filters.severity && incident.severity !== filters.severity) {
    return false;
  }

  if (filters.status && incident.status !== filters.status) {
    return false;
  }

  if (filters.workflow_stage && incident.workflow_stage !== filters.workflow_stage) {
    return false;
  }

  if (filters.sla_status && incident.sla_status !== filters.sla_status) {
    return false;
  }

  if (typeof filters.has_image === "boolean" && incident.has_image !== filters.has_image) {
    return false;
  }

  if (filters.date_from && incident.reported_at < `${filters.date_from}T00:00:00.000Z`) {
    return false;
  }

  if (filters.date_to && incident.reported_at > `${filters.date_to}T23:59:59.999Z`) {
    return false;
  }

  return true;
}

function countBy(items, keySelector) {
  return items.reduce((counts, item) => {
    const key = keySelector(item) || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function topCounts(items, keySelector, limit = 5) {
  return Object.entries(countBy(items, keySelector))
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit);
}

module.exports = {
  buildDashboardPayload,
  filterIncidentBundles
};
