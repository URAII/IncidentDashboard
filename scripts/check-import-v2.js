const assert = require("node:assert/strict");
const path = require("node:path");

const { ingestCsvFiles } = require("../src/spreadsheet-adapter");

const NOW = "2026-05-12T12:00:00.000Z";
const FIXTURE_DIR = path.resolve(__dirname, "..", "fixtures", "csv-multifile");

function fixture(fileName) {
  return path.resolve(FIXTURE_DIR, fileName);
}

function main() {
  const result = ingestCsvFiles(
    {
      incidentsFile: fixture("incidents.v2.valid.csv"),
      attachmentsFile: fixture("incident_attachments.v2.valid.csv"),
      evidenceFile: fixture("incident_evidence.v2.valid.csv")
    },
    {
      now: NOW,
      strictSchema: true,
      schemaVersion: "v2"
    }
  );

  assert.equal(result.schema_version, "v2");
  assert.equal(result.schema_errors.length, 0);
  assert.equal(result.join_errors.length, 0);
  assert.equal(result.validation_errors.length, 0);
  assert.equal(result.validBundles.length > 0, true);

  process.stdout.write(
    `Import gate v2 summary: schema_version=${result.schema_version}, bundles=${result.bundles_count}, valid=${result.validBundles.length}, schema_errors=${result.schema_errors.length}, join_errors=${result.join_errors.length}, validation_errors=${result.validation_errors.length}\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`Import gate v2 failed: ${error.message}\n`);
  process.exitCode = 1;
}
