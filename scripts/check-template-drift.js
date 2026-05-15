const { runTemplateDriftCheck } = require("../src/template-drift-check");

function main() {
  const result = runTemplateDriftCheck({
    now: "2026-05-12T12:00:00.000Z"
  });

  process.stdout.write(
    `Template drift summary: schema_version=${result.schema_version}, template_id=${result.template_id}, workbook_id=${result.workbook_id}, drift_status=${result.drift_status}, missing_required_headers=${result.counts.missing_required_headers}, unknown_headers=${result.counts.unknown_headers}, duplicate_headers=${result.counts.duplicate_headers}, wrong_sheet_names=${result.counts.wrong_sheet_names}, status=${result.status}\n`
  );

  if (result.status !== "pass") {
    throw new Error("template drift detected");
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`Template drift check failed: ${error.message}\n`);
  process.exitCode = 1;
}
