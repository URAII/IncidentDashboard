import {
  fallback,
  sanitizeDisplayUrl,
  formatDateTime,
  buildMetricCards,
  buildOverviewCards,
  buildHighlightGroups,
  normalizeRecord
} from "./app-core.mjs";

const state = {
  activeView: "executive",
  payload: null,
  selectedIncidentId: null
};

const metricGrid = document.querySelector("#metricGrid");
const overviewGrid = document.querySelector("#overviewGrid");
const viewHighlights = document.querySelector("#viewHighlights");
const recordList = document.querySelector("#recordList");
const recordDetail = document.querySelector("#recordDetail");
const recordCount = document.querySelector("#recordCount");
const generatedAt = document.querySelector("#generatedAt");
const rejectedRecords = document.querySelector("#rejectedRecords");
const activeViewLabel = document.querySelector("#activeViewLabel");
const filtersForm = document.querySelector("#filtersForm");
const resetFiltersButton = document.querySelector("#resetFilters");

document.querySelector("#viewTabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) {
    return;
  }

  state.activeView = button.dataset.view;
  syncTabState();
  render();
});

filtersForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadPayload();
});

resetFiltersButton.addEventListener("click", async () => {
  filtersForm.reset();
  await loadPayload();
});

await loadPayload();

async function loadPayload() {
  const search = new URLSearchParams();
  const formData = new FormData(filtersForm);
  for (const [key, value] of formData.entries()) {
    if (value) {
      search.set(key, value);
    }
  }

  const response = await fetch(`/api/dashboard?${search.toString()}`);
  state.payload = await response.json();
  if (!state.selectedIncidentId && state.payload.records.length > 0) {
    state.selectedIncidentId = state.payload.records[0].incident_id;
  }
  if (
    state.selectedIncidentId &&
    !state.payload.records.some((record) => record.incident_id === state.selectedIncidentId)
  ) {
    state.selectedIncidentId = state.payload.records[0]?.incident_id || null;
  }

  populateFilterOptions();
  render();
}

function populateFilterOptions() {
  const filterOptions = state.payload.filter_options;

  fillSelect(
    document.querySelector("#organizationFilter"),
    filterOptions.organizations.map((organization) => ({
      value: organization.organization_id,
      label: organization.organization_name
    })),
    "All organizations"
  );
  fillSelect(document.querySelector("#regionFilter"), filterOptions.health_regions, "All regions");
  fillSelect(document.querySelector("#provinceFilter"), filterOptions.provinces, "All provinces");
  fillSelect(document.querySelector("#agencyTypeFilter"), filterOptions.agency_types, "All agency types");
  fillSelect(document.querySelector("#incidentTypeFilter"), filterOptions.incident_types, "All incident types");
  fillSelect(document.querySelector("#severityFilter"), filterOptions.severities, "All severities");
  fillSelect(document.querySelector("#statusFilter"), filterOptions.statuses, "All statuses");
  fillSelect(document.querySelector("#workflowFilter"), filterOptions.workflow_stages, "All workflow stages");
  fillSelect(document.querySelector("#slaFilter"), filterOptions.sla_statuses, "All SLA states");
}

function fillSelect(select, options, emptyLabel) {
  const selectedValue = select.value;
  const normalizedOptions = Array.isArray(options)
    ? options.map((option) =>
        typeof option === "string" ? { value: option, label: option } : option
      )
    : [];

  select.replaceChildren(
    optionElement("", emptyLabel),
    ...normalizedOptions.map((option) => optionElement(option.value, option.label))
  );

  if (normalizedOptions.some((option) => option.value === selectedValue) || selectedValue === "") {
    select.value = selectedValue;
  }
}

function optionElement(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function render() {
  if (!state.payload) {
    return;
  }

  generatedAt.textContent = formatDateTime(state.payload.generated_at);
  rejectedRecords.textContent = String(state.payload.validation?.rejected_records ?? 0);
  activeViewLabel.textContent = labelForView(state.activeView);
  recordCount.textContent = `${state.payload.records.length} records`;

  renderMetricCards();
  renderOverview();
  renderHighlights();
  renderRecordList();
  renderRecordDetail();
}

function renderMetricCards() {
  metricGrid.replaceChildren(
    ...buildMetricCards(state.payload).map((card) => {
      const article = document.createElement("article");
      article.className = `metric-card metric-card--${card.tone}`;

      const label = document.createElement("span");
      label.className = "metric-card__label";
      label.textContent = card.label;

      const value = document.createElement("strong");
      value.className = "metric-card__value";
      value.textContent = String(card.value);

      article.append(label, value);
      return article;
    })
  );
}

function renderOverview() {
  overviewGrid.replaceChildren(
    ...buildOverviewCards(state.payload, state.activeView).map((group) => {
      const section = document.createElement("section");
      section.className = "overview-card";

      const title = document.createElement("h3");
      title.textContent = group.title;
      section.append(title, distributionList(group.items));

      return section;
    })
  );
}

function renderHighlights() {
  viewHighlights.replaceChildren(
    ...buildHighlightGroups(state.payload, state.activeView).map((group) => {
      const section = document.createElement("section");
      section.className = "highlight-group";

      const title = document.createElement("h3");
      title.textContent = group.title;

      const body = document.createElement("div");
      body.className = "stack-list";

      const items = Array.isArray(group.items) ? group.items : [];
      if (items.length === 0) {
        body.append(simpleFallback());
      } else {
        items.forEach((item) => body.append(highlightItem(item)));
      }
      section.append(title, body);

      return section;
    })
  );
}

function renderRecordList() {
  const records = state.payload.records.map((record) => normalizeRecord(record));
  if (records.length === 0) {
    recordList.replaceChildren(simpleFallback("No incidents match the current filters."));
    return;
  }

  recordList.replaceChildren(
    ...records.map((record) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `record-card${record.incident_id === state.selectedIncidentId ? " is-selected" : ""}`;
      button.addEventListener("click", () => {
        state.selectedIncidentId = record.incident_id;
        renderRecordList();
        renderRecordDetail();
      });

      const heading = document.createElement("div");
      heading.className = "record-card__heading";
      heading.append(
        badge(record.severity, "severity"),
        badge(record.sla_status, "sla"),
        badge(record.workflow_stage, "workflow")
      );

      const title = document.createElement("h3");
      title.textContent = `${record.incident_code} · ${record.organization_name}`;

      const meta = document.createElement("p");
      meta.className = "record-card__meta";
      meta.textContent = `${record.incident_type} · ${record.province} · ${formatDateTime(record.reported_at)}`;

      const summary = document.createElement("p");
      summary.className = "record-card__summary";
      summary.textContent = record.summary_sanitized;

      button.append(heading, title, meta, summary);
      return button;
    })
  );
}

function renderRecordDetail() {
  const record = state.payload.records
    .map((item) => normalizeRecord(item))
    .find((item) => item.incident_id === state.selectedIncidentId);

  if (!record) {
    recordDetail.replaceChildren(simpleFallback("Select an incident to inspect sanitized details."));
    return;
  }

  const sections = [
    detailGroup("Summary", [
      lineItem("Incident", record.incident_code),
      lineItem("Organization", record.organization_name),
      lineItem("Region / Province", `${record.health_region} / ${record.province}`),
      lineItem("Status", `${record.status} / ${record.workflow_stage}`),
      lineItem("Summary", record.summary_sanitized)
    ]),
    detailGroup("Exposure Surface", [
      lineItem("Affected Domain", fallback(record.affected_domain_sanitized)),
      lineItem("Affected URL", fallback(sanitizeDisplayUrl(record.affected_url_sanitized))),
      lineItem("Suspicious Path", record.suspicious_path_sanitized)
    ]),
    detailGroup("Evidence", [
      lineItem("Sanitized Evidence Count", String(record.sanitized_evidence_count)),
      lineItem("Sanitized Attachment Count", String(record.sanitized_attachment_count)),
      lineItem(
        "Evidence Preview",
        Array.isArray(record.evidence_preview)
          ? record.evidence_preview.map((item) => sanitizeDisplayUrl(item) || item).join(" | ")
          : fallback(record.evidence_preview)
      )
    ]),
    detailGroup("Image Handling", [
      lineItem("Has Image", record.has_image ? "Yes" : "No"),
      lineItem("Primary Image Caption", record.primary_image_caption),
      lineItem("Primary Image Note", record.primary_image_sanitized_note)
    ])
  ];

  recordDetail.replaceChildren(...sections);
}

function distributionList(items) {
  const container = document.createElement("div");
  container.className = "distribution-list";

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "distribution-row";

    const header = document.createElement("div");
    header.className = "distribution-row__header";

    const label = document.createElement("span");
    label.textContent = item.label || item.incident_code || "Unknown";

    const count = document.createElement("strong");
    count.textContent = String(item.count ?? item.sla_status ?? item.status ?? 0);

    const bar = document.createElement("div");
    bar.className = "distribution-row__bar";
    const fill = document.createElement("span");
    fill.style.width = `${Math.max(8, Number(item.count || 1) * 18)}px`;
    bar.append(fill);

    header.append(label, count);
    row.append(header, bar);
    container.append(row);
  });

  return container;
}

function highlightItem(item) {
  if (item.incident_code) {
    const article = document.createElement("article");
    article.className = "highlight-card";

    const title = document.createElement("strong");
    title.textContent = `${item.incident_code} · ${item.organization_name}`;

    const meta = document.createElement("p");
    meta.textContent = `${item.incident_type} · ${item.severity} · ${item.sla_status}`;

    const summary = document.createElement("p");
    summary.textContent = fallback(item.summary_sanitized, "No sanitized summary provided.");

    article.append(title, meta, summary);
    return article;
  }

  const line = document.createElement("div");
  line.className = "highlight-line";
  line.append(
    badge(item.label || "Unknown", "neutral"),
    textBlock(`${item.count ?? 0}`)
  );
  return line;
}

function detailGroup(titleText, lines) {
  const section = document.createElement("section");
  section.className = "detail-group";

  const title = document.createElement("h3");
  title.textContent = titleText;

  section.append(title, ...lines);
  return section;
}

function lineItem(labelText, valueText) {
  const row = document.createElement("div");
  row.className = "detail-line";

  const label = document.createElement("span");
  label.className = "detail-line__label";
  label.textContent = labelText;

  const value = document.createElement("strong");
  value.className = "detail-line__value";
  value.textContent = fallback(valueText);

  row.append(label, value);
  return row;
}

function badge(text, tone) {
  const element = document.createElement("span");
  element.className = `badge badge--${tone}`;
  element.textContent = text;
  return element;
}

function textBlock(text) {
  const element = document.createElement("strong");
  element.textContent = text;
  return element;
}

function simpleFallback(message = "No sanitized data provided.") {
  const paragraph = document.createElement("p");
  paragraph.className = "empty-state";
  paragraph.textContent = message;
  return paragraph;
}

function syncTabState() {
  document.querySelectorAll(".view-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.activeView);
  });
}

function labelForView(view) {
  switch (view) {
    case "soc":
      return "SOC Operations";
    case "agency":
      return "Agency Follow-up";
    case "executive":
    default:
      return "Executive";
  }
}
