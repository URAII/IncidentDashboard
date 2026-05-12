const test = require("node:test");
const assert = require("node:assert/strict");

const { validateAttachment } = require("../src");
const { sampleBundles } = require("./fixtures/sample-data");

test("attachment validation sanitizes file URLs", () => {
  const result = validateAttachment(sampleBundles[0].attachments[0]);

  assert.equal(result.isValid, true);
  assert.equal(result.value.file_url, "https://cdn.example.moph.go.th/evidence/defacement.png");
});

test("attachment validation rejects disallowed mime types", () => {
  const attachment = structuredClone(sampleBundles[0].attachments[0]);
  attachment.file_mime_type = "application/zip";

  const result = validateAttachment(attachment);

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === "file_mime_type"));
});

test("attachment validation rejects blocked secrets in captions", () => {
  const attachment = structuredClone(sampleBundles[0].attachments[0]);
  attachment.image_caption = "api_key=TEST_API_KEY";

  const result = validateAttachment(attachment);

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === "image_caption"));
});
