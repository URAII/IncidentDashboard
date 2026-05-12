const WORKFLOW_TRANSITIONS = Object.freeze({
  New: ["Triage", "Closed"],
  Triage: ["Investigating", "Waiting for Agency", "Contained", "Closed"],
  Investigating: ["Waiting for Agency", "Contained", "Resolved", "Closed"],
  "Waiting for Agency": ["Investigating", "Contained", "Resolved", "Closed"],
  Contained: ["Resolved", "Closed"],
  Resolved: ["Closed"],
  Closed: []
});

const STAGE_STATUS_MAP = Object.freeze({
  New: "Open",
  Triage: "Open",
  Investigating: "Open",
  "Waiting for Agency": "Monitoring",
  Contained: "Monitoring",
  Resolved: "Resolved",
  Closed: "Closed"
});

function getStatusForWorkflowStage(stage) {
  return STAGE_STATUS_MAP[stage] || "Open";
}

function canTransitionWorkflow(fromStage, toStage) {
  return (WORKFLOW_TRANSITIONS[fromStage] || []).includes(toStage);
}

function transitionWorkflow(incident, nextStage, at = new Date()) {
  if (!canTransitionWorkflow(incident.workflow_stage, nextStage)) {
    throw new Error(
      `Invalid workflow transition from ${incident.workflow_stage} to ${nextStage}`
    );
  }

  const timestamp = new Date(at).toISOString();
  return {
    ...incident,
    workflow_stage: nextStage,
    status: getStatusForWorkflowStage(nextStage),
    updated_at: timestamp,
    closed_at: nextStage === "Closed" ? incident.closed_at || timestamp : incident.closed_at || null
  };
}

module.exports = {
  WORKFLOW_TRANSITIONS,
  getStatusForWorkflowStage,
  canTransitionWorkflow,
  transitionWorkflow
};
