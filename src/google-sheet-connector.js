const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const { toGoogleSheetValueRanges } = require("./sheet-export-contract");
const { checkAppSheetCompatibility, getDefaultAppSheetSchemaProfile } = require("./appsheet-schema-check");

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function loadContractFromFile(filePath) {
  const resolved = path.resolve(filePath);
  const text = fs.readFileSync(resolved, "utf8");
  const contract = JSON.parse(text);

  if (!contract || typeof contract !== "object" || !contract.sheets) {
    throw new Error("input must be a sheet export contract with sheets object");
  }

  return { contract, filePath: resolved };
}

function loadSchemaProfile(filePath) {
  if (!filePath) {
    return getDefaultAppSheetSchemaProfile();
  }

  const resolved = path.resolve(filePath);
  const text = fs.readFileSync(resolved, "utf8");
  return JSON.parse(text);
}

function buildGoogleSheetsBatchUpdateRequest(contract) {
  const ranges = toGoogleSheetValueRanges(contract);
  const data = Object.entries(ranges).map(([sheetName, values]) => ({
    range: `${sheetName}!A1`,
    values
  }));

  return {
    valueInputOption: "RAW",
    data
  };
}

async function exportContractToGoogleSheet({
  contract,
  schemaProfile,
  mode = "dry-run",
  env = process.env,
  tokenProvider,
  sheetsApiClient,
  fetchImpl
} = {}) {
  if (!contract || typeof contract !== "object" || !contract.sheets) {
    throw new Error("contract is required");
  }

  const compatibility = checkAppSheetCompatibility({
    contract,
    schemaProfile: schemaProfile || getDefaultAppSheetSchemaProfile()
  });

  const request = buildGoogleSheetsBatchUpdateRequest(contract);

  if (mode !== "staging") {
    return {
      mode: "dry-run",
      status: compatibility.compatible ? "pass" : "fail",
      compatibility,
      request_summary: summarizeRequest(request)
    };
  }

  if (!compatibility.compatible) {
    throw new Error(
      `appsheet schema check failed: errors=${compatibility.summary.error_count}, warnings=${compatibility.summary.warning_count}`
    );
  }

  const spreadsheetId = sanitizeEnvValue(env.GOOGLE_SHEETS_STAGING_SPREADSHEET_ID);
  const credentialsPath = sanitizeEnvValue(env.GOOGLE_APPLICATION_CREDENTIALS);

  if (!spreadsheetId) {
    throw new Error("missing required env: GOOGLE_SHEETS_STAGING_SPREADSHEET_ID");
  }

  if (!credentialsPath) {
    throw new Error("missing required env: GOOGLE_APPLICATION_CREDENTIALS");
  }

  const resolvedCredentialsPath = path.resolve(credentialsPath);
  if (!fs.existsSync(resolvedCredentialsPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS file not found");
  }

  const getToken =
    tokenProvider ||
    ((options) =>
      createServiceAccountAccessToken({
        credentialsPath: resolvedCredentialsPath,
        scope: SHEETS_SCOPE,
        fetchImpl: options.fetchImpl
      }));
  const accessToken = await getToken({ fetchImpl: fetchImpl || fetch });

  const callSheets = sheetsApiClient || defaultSheetsApiClient;
  const result = await callSheets({
    spreadsheetId,
    accessToken,
    request,
    fetchImpl: fetchImpl || fetch
  });

  return {
    mode: "staging",
    status: "pass",
    compatibility,
    request_summary: summarizeRequest(request),
    target: {
      spreadsheet_id: maskId(spreadsheetId)
    },
    api_result: sanitizeApiResult(result)
  };
}

function summarizeRequest(request) {
  return {
    range_count: request.data.length,
    row_count: request.data.reduce((count, entry) => count + Math.max((entry.values || []).length - 1, 0), 0),
    sheet_names: request.data.map((entry) => entry.range.replace(/!A1$/, ""))
  };
}

function sanitizeApiResult(result) {
  if (!result || typeof result !== "object") {
    return { status: "unknown" };
  }

  return {
    totalUpdatedRows: result.totalUpdatedRows ?? null,
    totalUpdatedColumns: result.totalUpdatedColumns ?? null,
    totalUpdatedCells: result.totalUpdatedCells ?? null,
    totalUpdatedSheets: result.totalUpdatedSheets ?? null
  };
}

async function createServiceAccountAccessToken({ credentialsPath, scope, fetchImpl }) {
  const credentialText = fs.readFileSync(path.resolve(credentialsPath), "utf8");
  const credentials = JSON.parse(credentialText);

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("invalid GOOGLE_APPLICATION_CREDENTIALS: missing client_email/private_key");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;

  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const payload = {
    iss: credentials.client_email,
    scope,
    aud: credentials.token_uri || TOKEN_ENDPOINT,
    exp: expiresAt,
    iat: issuedAt
  };

  const unsignedToken = `${toBase64Url(header)}.${toBase64Url(payload)}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsignedToken)
    .end()
    .sign(credentials.private_key, "base64url");
  const assertion = `${unsignedToken}.${signature}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });

  const response = await fetchImpl(credentials.token_uri || TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`token request failed: status=${response.status}`);
  }

  const parsed = JSON.parse(responseText);
  if (!parsed.access_token) {
    throw new Error("token response missing access_token");
  }

  return parsed.access_token;
}

async function defaultSheetsApiClient({ spreadsheetId, accessToken, request, fetchImpl }) {
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values:batchUpdate`;

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(request)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`google sheets update failed: status=${response.status}`);
  }

  return text ? JSON.parse(text) : {};
}

function toBase64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sanitizeEnvValue(value) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function maskId(value) {
  const normalized = String(value || "");
  if (normalized.length <= 8) {
    return "[REDACTED_ID]";
  }

  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

module.exports = {
  loadContractFromFile,
  loadSchemaProfile,
  buildGoogleSheetsBatchUpdateRequest,
  exportContractToGoogleSheet,
  createServiceAccountAccessToken,
  defaultSheetsApiClient,
  maskId
};
