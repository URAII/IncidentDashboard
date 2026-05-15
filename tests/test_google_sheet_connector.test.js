const test = require("node:test");
const assert = require("node:assert/strict");

const { prepareIncidentDataset } = require("../src/validation");
const { buildSheetExportContract } = require("../src/sheet-export-contract");
const { exportContractToGoogleSheet } = require("../src/google-sheet-connector");
const { sampleBundles, NOW } = require("./fixtures/sample-data");

function buildContract() {
  const { validBundles, errors } = prepareIncidentDataset(sampleBundles, { now: NOW });
  assert.equal(errors.length, 0);
  return buildSheetExportContract({ bundles: validBundles, now: NOW });
}

test("google sheet connector dry-run never calls API client", async () => {
  const contract = buildContract();
  let called = false;

  const result = await exportContractToGoogleSheet({
    contract,
    mode: "dry-run",
    sheetsApiClient: async () => {
      called = true;
      throw new Error("should not call api client in dry-run");
    }
  });

  assert.equal(called, false);
  assert.equal(result.mode, "dry-run");
  assert.equal(result.status, "pass");
});

test("google sheet connector staging requires explicit env vars", async () => {
  const contract = buildContract();

  await assert.rejects(
    () =>
      exportContractToGoogleSheet({
        contract,
        mode: "staging",
        env: {}
      }),
    /GOOGLE_SHEETS_STAGING_SPREADSHEET_ID/
  );
});

test("google sheet connector staging succeeds with mocked token/api clients", async () => {
  const contract = buildContract();

  const result = await exportContractToGoogleSheet({
    contract,
    mode: "staging",
    env: {
      GOOGLE_SHEETS_STAGING_SPREADSHEET_ID: "sheet-1234567890",
      GOOGLE_APPLICATION_CREDENTIALS: __filename
    },
    tokenProvider: async () => "mock-token",
    sheetsApiClient: async ({ request }) => ({
      totalUpdatedRows: request.data.reduce(
        (count, item) => count + Math.max(item.values.length - 1, 0),
        0
      ),
      totalUpdatedColumns: 10,
      totalUpdatedCells: 100,
      totalUpdatedSheets: request.data.length
    })
  });

  assert.equal(result.mode, "staging");
  assert.equal(result.status, "pass");
  assert.equal(result.target.spreadsheet_id.includes("..."), true);
  assert.equal(result.api_result.totalUpdatedSheets > 0, true);
});

test("google sheet connector error text does not leak token strings", async () => {
  const contract = buildContract();

  await assert.rejects(
    () =>
      exportContractToGoogleSheet({
        contract,
        mode: "staging",
        env: {
          GOOGLE_SHEETS_STAGING_SPREADSHEET_ID: "sheet-1234567890",
          GOOGLE_APPLICATION_CREDENTIALS: __filename
        },
        tokenProvider: async () => "token=abc123",
        sheetsApiClient: async () => {
          throw new Error("google sheets update failed: status=401");
        }
      }),
    (error) => {
      assert.equal(String(error.message).includes("token=abc123"), false);
      return true;
    }
  );
});
