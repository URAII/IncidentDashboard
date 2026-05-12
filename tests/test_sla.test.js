const test = require("node:test");
const assert = require("node:assert/strict");

const { calculateSlaStatus } = require("../src");

test("critical incident becomes overdue after target hours", () => {
  const result = calculateSlaStatus(
    {
      severity: "Critical",
      status: "Open",
      workflow_stage: "Investigating",
      detected_at: "2026-05-12T06:00:00.000Z",
      reported_at: "2026-05-12T05:50:00.000Z"
    },
    { now: "2026-05-12T12:00:00.000Z" }
  );

  assert.equal(result.sla_status, "overdue");
});

test("high severity incident becomes near_due before target", () => {
  const result = calculateSlaStatus(
    {
      severity: "High",
      status: "Monitoring",
      workflow_stage: "Waiting for Agency",
      detected_at: "2026-05-12T05:45:00.000Z",
      reported_at: "2026-05-12T05:40:00.000Z"
    },
    { now: "2026-05-12T12:00:00.000Z" }
  );

  assert.equal(result.sla_status, "near_due");
});

test("closed incidents always report closed SLA status", () => {
  const result = calculateSlaStatus(
    {
      severity: "Medium",
      status: "Closed",
      workflow_stage: "Closed",
      detected_at: "2026-05-11T20:00:00.000Z",
      closed_at: "2026-05-12T04:00:00.000Z"
    },
    { now: "2026-05-12T12:00:00.000Z" }
  );

  assert.equal(result.sla_status, "closed");
});
