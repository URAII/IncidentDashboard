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
  DEFAULT_SCHEMA_VERSION
} = require("./spreadsheet-adapter");
const {
  buildSheetExportContract,
  toGoogleSheetValueRanges
} = require("./sheet-export-contract");
const {
  getDefaultAppSheetSchemaProfile,
  checkAppSheetCompatibility
} = require("./appsheet-schema-check");
const {
  loadContractFromFile,
  loadSchemaProfile,
  buildGoogleSheetsBatchUpdateRequest,
  exportContractToGoogleSheet
} = require("./google-sheet-connector");
const {
  validateXlsxBinaryWorkbook,
  REQUIRED_SHEETS: XLSX_BINARY_REQUIRED_SHEETS,
  DEFAULT_SCHEMA_VERSION: XLSX_BINARY_DEFAULT_SCHEMA_VERSION
} = require("./xlsx-binary-parser");
const {
  runTemplateDriftCheck,
  DEFAULT_MANIFEST_PATH: TEMPLATE_DRIFT_DEFAULT_MANIFEST_PATH
} = require("./template-drift-check");

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
  buildSheetExportContract,
  toGoogleSheetValueRanges,
  getDefaultAppSheetSchemaProfile,
  checkAppSheetCompatibility,
  loadContractFromFile,
  loadSchemaProfile,
  buildGoogleSheetsBatchUpdateRequest,
  exportContractToGoogleSheet,
  validateXlsxBinaryWorkbook,
  XLSX_BINARY_REQUIRED_SHEETS,
  XLSX_BINARY_DEFAULT_SCHEMA_VERSION,
  runTemplateDriftCheck,
  TEMPLATE_DRIFT_DEFAULT_MANIFEST_PATH
};
