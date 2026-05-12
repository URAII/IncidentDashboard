const MASTER_DATA = Object.freeze({
  health_regions: [
    { code: "HR-01", name: "Health Region 1" },
    { code: "HR-04", name: "Health Region 4" },
    { code: "HR-07", name: "Health Region 7" }
  ],
  provinces: ["Chiang Mai", "Khon Kaen", "Nonthaburi", "Ubon Ratchathani"],
  agency_types: [
    "Provincial Public Health Office",
    "Hospital",
    "Ministry Department",
    "Regional Health Office"
  ],
  incident_types: [
    "Web Defacement",
    "Suspicious Redirect",
    "Malware Infection",
    "Data Exposure",
    "Phishing"
  ],
  severities: ["Critical", "High", "Medium", "Low"],
  statuses: ["Open", "Monitoring", "Resolved", "Closed"],
  workflow_stages: [
    "New",
    "Triage",
    "Investigating",
    "Waiting for Agency",
    "Contained",
    "Resolved",
    "Closed"
  ],
  detection_sources: [
    "SOC Monitoring",
    "Agency Report",
    "External Notification",
    "Web Application Scan"
  ],
  organizations: [
    {
      organization_id: "ORG-001",
      organization_name: "Chiang Mai Provincial Public Health Office",
      health_region: "Health Region 1",
      province: "Chiang Mai",
      agency_type: "Provincial Public Health Office"
    },
    {
      organization_id: "ORG-002",
      organization_name: "Khon Kaen Hospital",
      health_region: "Health Region 7",
      province: "Khon Kaen",
      agency_type: "Hospital"
    },
    {
      organization_id: "ORG-003",
      organization_name: "Digital Health Security Division",
      health_region: "Health Region 4",
      province: "Nonthaburi",
      agency_type: "Ministry Department"
    },
    {
      organization_id: "ORG-004",
      organization_name: "Ubon Ratchathani Regional Health Office",
      health_region: "Health Region 7",
      province: "Ubon Ratchathani",
      agency_type: "Regional Health Office"
    }
  ],
  sla_policy: {
    Critical: { target_hours: 4, near_due_ratio: 0.75 },
    High: { target_hours: 8, near_due_ratio: 0.75 },
    Medium: { target_hours: 24, near_due_ratio: 0.75 },
    Low: { target_hours: 72, near_due_ratio: 0.75 }
  }
});

function listAllowedValues(key, masterData = MASTER_DATA) {
  const values = masterData[key];
  return Array.isArray(values) ? [...values] : values ? { ...values } : [];
}

function findOrganizationById(organizationId, masterData = MASTER_DATA) {
  return masterData.organizations.find(
    (organization) => organization.organization_id === organizationId
  );
}

function getSlaPolicy(severity, masterData = MASTER_DATA) {
  return masterData.sla_policy[severity];
}

function isAllowedValue(collectionKey, value, masterData = MASTER_DATA) {
  return Array.isArray(masterData[collectionKey]) &&
    masterData[collectionKey].includes(value);
}

module.exports = {
  MASTER_DATA,
  listAllowedValues,
  findOrganizationById,
  getSlaPolicy,
  isAllowedValue
};
