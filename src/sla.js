const { getSlaPolicy } = require("./master-data");

function toDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hoursBetween(start, end) {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

function calculateSlaStatus(incident, options = {}) {
  const now = toDate(options.now || new Date());
  const policy = options.policy || getSlaPolicy(incident.severity, options.masterData);

  if (!policy) {
    return {
      sla_status: "within_sla",
      due_at: null,
      elapsed_hours: 0,
      target_hours: null
    };
  }

  if (
    incident.status === "Closed" ||
    incident.workflow_stage === "Closed" ||
    incident.closed_at
  ) {
    return {
      sla_status: "closed",
      due_at: incident.closed_at || null,
      elapsed_hours: 0,
      target_hours: policy.target_hours
    };
  }

  const referenceDate = toDate(incident.detected_at) || toDate(incident.reported_at);

  if (!referenceDate || !now) {
    return {
      sla_status: "within_sla",
      due_at: null,
      elapsed_hours: 0,
      target_hours: policy.target_hours
    };
  }

  const elapsedHours = hoursBetween(referenceDate, now);
  const dueAt = new Date(referenceDate.getTime() + policy.target_hours * 60 * 60 * 1000);
  const nearDueThreshold = policy.target_hours * (policy.near_due_ratio ?? 0.75);

  let slaStatus = "within_sla";
  if (elapsedHours >= policy.target_hours) {
    slaStatus = "overdue";
  } else if (elapsedHours >= nearDueThreshold) {
    slaStatus = "near_due";
  }

  return {
    sla_status: slaStatus,
    due_at: dueAt.toISOString(),
    elapsed_hours: Number(elapsedHours.toFixed(2)),
    target_hours: policy.target_hours
  };
}

module.exports = {
  calculateSlaStatus
};
