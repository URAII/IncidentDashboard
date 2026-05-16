const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workflowPath = path.resolve(__dirname, "..", ".github", "workflows", "ci.yml");
const workflowText = fs.readFileSync(workflowPath, "utf8");

test("protected smoke workflow uses WIF/OIDC auth path", () => {
  assert.match(workflowText, /name:\s+Google Sheet Staging Smoke \(Protected\)/);
  assert.match(workflowText, /permissions:\s*\n\s+contents:\s+read\s*\n\s+id-token:\s+write/);
  assert.match(workflowText, /uses:\s+google-github-actions\/auth@v3/);
  assert.match(workflowText, /workload_identity_provider:\s+\${{\s*secrets\.GCP_WORKLOAD_IDENTITY_PROVIDER\s*}}/);
  assert.match(workflowText, /service_account:\s+\${{\s*secrets\.GCP_SERVICE_ACCOUNT_EMAIL\s*}}/);
  assert.match(workflowText, /create_credentials_file:\s+true/);
  assert.match(workflowText, /export_environment_variables:\s+true/);
});

test("protected smoke workflow does not require key JSON secret and has masked skip diagnostic", () => {
  assert.doesNotMatch(workflowText, /GOOGLE_APPLICATION_CREDENTIALS_JSON/);
  assert.match(workflowText, /GCP_WORKLOAD_IDENTITY_PROVIDER/);
  assert.match(workflowText, /GCP_SERVICE_ACCOUNT_EMAIL/);
  assert.match(workflowText, /GOOGLE_SHEETS_STAGING_SPREADSHEET_ID/);
  assert.match(workflowText, /missing required secret\(s\)=/);
  assert.match(workflowText, /status=skip/);
});
