const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { validateXlsxBinaryWorkbook } = require("../src/xlsx-binary-parser");

const ROOT = path.resolve(__dirname, "..");
const FIXTURE_VALID = path.resolve(
  ROOT,
  "tests",
  "fixtures",
  "xlsx-binary",
  "template.v2.binary.valid.xlsx"
);

const WORKBOOK_TEMPLATE = {
  sheets: [
    { name: "incidents", file: "sheet1.xml", relId: "rId1" },
    { name: "incident_attachments", file: "sheet2.xml", relId: "rId2" },
    { name: "incident_evidence", file: "sheet3.xml", relId: "rId3" }
  ],
  sheetXml: {
    "sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n  <sheetData>\n    <row r="1">\n      <c r="A1" t="inlineStr"><is><t>incident_id</t></is></c>\n      <c r="B1" t="inlineStr"><is><t>incident_code</t></is></c>\n      <c r="C1" t="inlineStr"><is><t>reported_at</t></is></c>\n      <c r="D1" t="inlineStr"><is><t>organization_id</t></is></c>\n      <c r="E1" t="inlineStr"><is><t>incident_type</t></is></c>\n      <c r="F1" t="inlineStr"><is><t>severity</t></is></c>\n      <c r="G1" t="inlineStr"><is><t>workflow_stage</t></is></c>\n      <c r="H1" t="inlineStr"><is><t>summary_text_sanitized</t></is></c>\n      <c r="I1" t="inlineStr"><is><t>detection_channel</t></is></c>\n      <c r="J1" t="inlineStr"><is><t>affected_url_sanitized</t></is></c>\n      <c r="K1" t="inlineStr"><is><t>created_by</t></is></c>\n      <c r="L1" t="inlineStr"><is><t>created_at</t></is></c>\n    </row>\n    <row r="2">\n      <c r="A2" t="inlineStr"><is><t>INC-XLSX-001</t></is></c>\n      <c r="B2" t="inlineStr"><is><t>IR-2026-0001</t></is></c>\n      <c r="C2" t="n"><v>46010</v></c>\n      <c r="D2" t="inlineStr"><is><t>ORG-001</t></is></c>\n      <c r="E2" t="inlineStr"><is><t>Web Defacement</t></is></c>\n      <c r="F2" t="inlineStr"><is><t>Critical</t></is></c>\n      <c r="G2" t="inlineStr"><is><t>Triage</t></is></c>\n      <c r="H2" t="inlineStr"><is><t>Homepage defacement detected</t></is></c>\n      <c r="I2" t="inlineStr"><is><t>SOC Monitoring</t></is></c>\n      <c r="J2" t="inlineStr"><is><t>https://chiangmaihealth.example/index.html</t></is></c>\n      <c r="K2" t="inlineStr"><is><t>xlsx.import</t></is></c>\n      <c r="L2" t="inlineStr"><is><t>2026-05-12T08:00:00Z</t></is></c>\n    </row>\n  </sheetData>\n</worksheet>`,
    "sheet2.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n  <sheetData>\n    <row r="1">\n      <c r="A1" t="inlineStr"><is><t>attachment_id</t></is></c>\n      <c r="B1" t="inlineStr"><is><t>incident_id</t></is></c>\n      <c r="C1" t="inlineStr"><is><t>attachment_type</t></is></c>\n      <c r="D1" t="inlineStr"><is><t>file_name</t></is></c>\n      <c r="E1" t="inlineStr"><is><t>file_url_sanitized</t></is></c>\n      <c r="F1" t="inlineStr"><is><t>file_mime_type</t></is></c>\n      <c r="G1" t="inlineStr"><is><t>created_by</t></is></c>\n      <c r="H1" t="inlineStr"><is><t>created_at</t></is></c>\n    </row>\n    <row r="2">\n      <c r="A2" t="inlineStr"><is><t>ATT-XLSX-001</t></is></c>\n      <c r="B2" t="inlineStr"><is><t>INC-XLSX-001</t></is></c>\n      <c r="C2" t="inlineStr"><is><t>image</t></is></c>\n      <c r="D2" t="inlineStr"><is><t>defacement.png</t></is></c>\n      <c r="E2" t="inlineStr"><is><t>https://chiangmaihealth.example/images/defacement.png</t></is></c>\n      <c r="F2" t="inlineStr"><is><t>image/png</t></is></c>\n      <c r="G2" t="inlineStr"><is><t>xlsx.import</t></is></c>\n      <c r="H2" t="inlineStr"><is><t>2026-05-12T08:03:00Z</t></is></c>\n    </row>\n  </sheetData>\n</worksheet>`,
    "sheet3.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n  <sheetData>\n    <row r="1">\n      <c r="A1" t="inlineStr"><is><t>evidence_id</t></is></c>\n      <c r="B1" t="inlineStr"><is><t>incident_id</t></is></c>\n      <c r="C1" t="inlineStr"><is><t>evidence_type</t></is></c>\n      <c r="D1" t="inlineStr"><is><t>evidence_text_note_sanitized</t></is></c>\n      <c r="E1" t="inlineStr"><is><t>source_type</t></is></c>\n      <c r="F1" t="inlineStr"><is><t>confidence_score</t></is></c>\n      <c r="G1" t="inlineStr"><is><t>is_sanitized</t></is></c>\n      <c r="H1" t="inlineStr"><is><t>created_by</t></is></c>\n      <c r="I1" t="inlineStr"><is><t>created_at</t></is></c>\n    </row>\n    <row r="2">\n      <c r="A2" t="inlineStr"><is><t>EVD-XLSX-001</t></is></c>\n      <c r="B2" t="inlineStr"><is><t>INC-XLSX-001</t></is></c>\n      <c r="C2" t="inlineStr"><is><t>text</t></is></c>\n      <c r="D2" t="inlineStr"><is><t>Defacement marker observed on homepage</t></is></c>\n      <c r="E2" t="inlineStr"><is><t>sensor</t></is></c>\n      <c r="F2" t="inlineStr"><is><t>0.9</t></is></c>\n      <c r="G2" t="inlineStr"><is><t>true</t></is></c>\n      <c r="H2" t="inlineStr"><is><t>xlsx.import</t></is></c>\n      <c r="I2" t="inlineStr"><is><t>2026-05-12T08:04:00Z</t></is></c>\n    </row>\n  </sheetData>\n</worksheet>`
  }
};

test("binary xlsx parser validates a real workbook fixture", () => {
  const result = validateXlsxBinaryWorkbook(FIXTURE_VALID, {
    strictSchema: true,
    schemaVersion: "v2",
    now: "2026-05-12T12:00:00.000Z"
  });

  assert.equal(result.status, "pass");
  assert.equal(result.schema_errors.length, 0);
  assert.equal(result.join_errors.length, 0);
  assert.equal(result.validation_errors.length, 0);
  assert.equal(result.workbook_errors.length, 0);
  assert.equal(result.schema_version, "v2");
  assert.equal(result.rows_count.incidents, 1);
});

test("binary xlsx parser fails on corrupted workbook", () => {
  const filePath = path.resolve(os.tmpdir(), `incident-dashboard-corrupted-${Date.now()}.xlsx`);
  fs.writeFileSync(filePath, "NOT_A_ZIP");

  assert.throws(
    () => validateXlsxBinaryWorkbook(filePath, { strictSchema: true, schemaVersion: "v2" }),
    /corrupted_workbook/
  );

  fs.unlinkSync(filePath);
});

test("binary xlsx parser reports missing required sheet", () => {
  const workbookPath = createWorkbook((template) => {
    template.sheets = template.sheets.filter((sheet) => sheet.name !== "incident_evidence");
    delete template.sheetXml["sheet3.xml"];
  });

  const result = validateXlsxBinaryWorkbook(workbookPath, {
    strictSchema: true,
    schemaVersion: "v2",
    now: "2026-05-12T12:00:00.000Z"
  });

  assert.equal(result.status, "fail");
  assert.ok(result.workbook_errors.some((error) => error.type === "missing_sheet"));
});

test("binary xlsx parser reports wrong headers and schema mismatch", () => {
  const workbookPath = createWorkbook((template) => {
    template.sheetXml["sheet1.xml"] = template.sheetXml["sheet1.xml"].replace(
      "summary_text_sanitized",
      "summary_sanitized"
    );
  });

  const result = validateXlsxBinaryWorkbook(workbookPath, {
    strictSchema: true,
    schemaVersion: "v2",
    now: "2026-05-12T12:00:00.000Z"
  });

  assert.equal(result.status, "fail");
  assert.ok(result.schema_errors.some((error) => error.type === "missing_required_header"));
  assert.ok(result.schema_errors.some((error) => error.type === "unknown_header"));
});

test("binary xlsx parser ignores blank rows and keeps pass status", () => {
  const workbookPath = createWorkbook((template) => {
    template.sheetXml["sheet1.xml"] = template.sheetXml["sheet1.xml"].replace(
      "</sheetData>",
      "<row r=\"3\"><c r=\"A3\" t=\"inlineStr\"><is><t> </t></is></c></row></sheetData>"
    );
  });

  const result = validateXlsxBinaryWorkbook(workbookPath, {
    strictSchema: true,
    schemaVersion: "v2",
    now: "2026-05-12T12:00:00.000Z"
  });

  assert.equal(result.status, "pass");
  assert.equal(result.sheet_summaries.incidents.blank_rows, 1);
});

test("binary xlsx parser reports invalid date format", () => {
  const workbookPath = createWorkbook((template) => {
    template.sheetXml["sheet1.xml"] = template.sheetXml["sheet1.xml"].replace(
      '<c r="L2" t="inlineStr"><is><t>2026-05-12T08:00:00Z</t></is></c>',
      '<c r="L2" t="inlineStr"><is><t>12/05/2026 08:00</t></is></c>'
    );
  });

  const result = validateXlsxBinaryWorkbook(workbookPath, {
    strictSchema: true,
    schemaVersion: "v2",
    now: "2026-05-12T12:00:00.000Z"
  });

  assert.equal(result.status, "fail");
  assert.ok(result.workbook_errors.some((error) => error.type === "invalid_date_format"));
});

test("binary xlsx parser reports unsafe data without leaking sensitive text", () => {
  const workbookPath = createWorkbook((template) => {
    template.sheetXml["sheet1.xml"] = template.sheetXml["sheet1.xml"].replace(
      "Homepage defacement detected",
      "api_key=LEAK_TEST_TOKEN"
    );
  });

  const result = validateXlsxBinaryWorkbook(workbookPath, {
    strictSchema: true,
    schemaVersion: "v2",
    now: "2026-05-12T12:00:00.000Z"
  });

  assert.equal(result.status, "fail");
  assert.ok(result.workbook_errors.some((error) => error.type === "unsafe_data"));

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("LEAK_TEST_TOKEN"), false);
});

function createWorkbook(mutator) {
  const root = fs.mkdtempSync(path.resolve(os.tmpdir(), "incident-dashboard-xlsx-"));
  const buildDir = path.join(root, "build");
  fs.mkdirSync(path.join(buildDir, "_rels"), { recursive: true });
  fs.mkdirSync(path.join(buildDir, "xl", "_rels"), { recursive: true });
  fs.mkdirSync(path.join(buildDir, "xl", "worksheets"), { recursive: true });

  const template = {
    sheets: WORKBOOK_TEMPLATE.sheets.map((sheet) => ({ ...sheet })),
    sheetXml: {
      "sheet1.xml": WORKBOOK_TEMPLATE.sheetXml["sheet1.xml"],
      "sheet2.xml": WORKBOOK_TEMPLATE.sheetXml["sheet2.xml"],
      "sheet3.xml": WORKBOOK_TEMPLATE.sheetXml["sheet3.xml"]
    }
  };

  if (mutator) {
    mutator(template);
  }

  fs.writeFileSync(path.join(buildDir, "[Content_Types].xml"), buildContentTypes(template));
  fs.writeFileSync(path.join(buildDir, "_rels", ".rels"), buildRootRels());
  fs.writeFileSync(path.join(buildDir, "xl", "workbook.xml"), buildWorkbookXml(template));
  fs.writeFileSync(
    path.join(buildDir, "xl", "_rels", "workbook.xml.rels"),
    buildWorkbookRels(template)
  );

  for (const sheet of template.sheets) {
    const xml = template.sheetXml[sheet.file];
    fs.writeFileSync(path.join(buildDir, "xl", "worksheets", sheet.file), xml);
  }

  const outPath = path.join(root, "workbook.xlsx");
  const zipResult = spawnSync("zip", ["-qr", outPath, "."], {
    cwd: buildDir,
    encoding: "utf8"
  });

  if (zipResult.status !== 0) {
    throw new Error(`zip failed: ${(zipResult.stderr || zipResult.stdout || "").trim()}`);
  }

  return outPath;
}

function buildContentTypes(template) {
  const overrides = template.sheets
    .map(
      (sheet) =>
        `  <Override PartName="/xl/worksheets/${sheet.file}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n  <Default Extension="xml" ContentType="application/xml"/>\n  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n${overrides}\n</Types>`;
}

function buildRootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n</Relationships>`;
}

function buildWorkbookXml(template) {
  const sheetEntries = template.sheets
    .map(
      (sheet, index) =>
        `    <sheet name="${sheet.name}" sheetId="${index + 1}" r:id="${sheet.relId}"/>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n  <sheets>\n${sheetEntries}\n  </sheets>\n</workbook>`;
}

function buildWorkbookRels(template) {
  const relEntries = template.sheets
    .map(
      (sheet) =>
        `  <Relationship Id="${sheet.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/${sheet.file}"/>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n${relEntries}\n</Relationships>`;
}
