const { MASTER_DATA } = require("./master-data");
const {
  validateIncident,
  validateAttachment,
  validateEvidence,
  validateIncidentBundle,
  prepareIncidentDataset
} = require("./validation");
const { buildDashboardPayload, filterIncidentBundles } = require("./dashboard");
const { generateReport } = require("./report");
const { createUiServer } = require("./ui-server");
const { calculateSlaStatus } = require("./sla");
const {
  WORKFLOW_TRANSITIONS,
  canTransitionWorkflow,
  transitionWorkflow
} = require("./workflow");
const {
  sanitizeUrl,
  sanitizePath,
  sanitizeDomain,
  sanitizeText,
  containsBlockedSecret
} = require("./sanitization");
const {
  parseCsvText,
  parseCsvFile,
  mapIncidentRowToBundle,
  buildBundlesFromRows,
  ingestCsvRows,
  ingestCsvText,
  ingestCsvFile,
  ingestCsvRowSets,
  joinRowsByIncidentId,
  ingestCsvFiles,
  CSV_SCHEMA_PROFILES,
  DEFAULT_SCHEMA_VERSION,
  SCHEMA_POLICY
} = require("./spreadsheet-adapter");
const { ingestXlsxWorkbookFile, parseXlsxWorkbook, REQUIRED_SHEETS } = require("./xlsx-adapter");
const { checkTemplateWorkbookDrift } = require("./template-drift");
const { checkTemplateReleaseGovernance } = require("./template-release-governance");

module.exports = {
  MASTER_DATA,
  validateIncident,
  validateAttachment,
  validateEvidence,
  validateIncidentBundle,
  prepareIncidentDataset,
  buildDashboardPayload,
  filterIncidentBundles,
  generateReport,
  createUiServer,
  calculateSlaStatus,
  WORKFLOW_TRANSITIONS,
  canTransitionWorkflow,
  transitionWorkflow,
  sanitizeUrl,
  sanitizePath,
  sanitizeDomain,
  sanitizeText,
  containsBlockedSecret,
  parseCsvText,
  parseCsvFile,
  mapIncidentRowToBundle,
  buildBundlesFromRows,
  ingestCsvRows,
  ingestCsvText,
  ingestCsvFile,
  ingestCsvRowSets,
  joinRowsByIncidentId,
  ingestCsvFiles,
  CSV_SCHEMA_PROFILES,
  DEFAULT_SCHEMA_VERSION,
  SCHEMA_POLICY,
  ingestXlsxWorkbookFile,
  parseXlsxWorkbook,
  REQUIRED_SHEETS,
  checkTemplateWorkbookDrift,
  checkTemplateReleaseGovernance
};
