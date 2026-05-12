const test = require("node:test");
const assert = require("node:assert/strict");

const {
  sanitizeUrl,
  sanitizePath,
  sanitizeDomain,
  sanitizeText,
  containsBlockedSecret
} = require("../src");

test("sanitizeUrl removes query strings and fragments", () => {
  assert.equal(
    sanitizeUrl("https://example.moph.go.th/path/index.php?token=abc123#frag"),
    "https://example.moph.go.th/path/index.php"
  );
});

test("sanitizePath strips query strings from suspicious paths", () => {
  assert.equal(
    sanitizePath("https://example.moph.go.th/path/index.php?token=abc123"),
    "/path/index.php"
  );
});

test("sanitizeDomain extracts lowercase hostnames", () => {
  assert.equal(
    sanitizeDomain("https://Example.MOPH.go.th/portal?x=1"),
    "example.moph.go.th"
  );
});

test("sanitizeText redacts PII and sanitizes embedded URLs", () => {
  const output = sanitizeText(
    "Contact admin@example.moph.go.th or 0812345678 via https://portal.example/path?token=abc"
  );

  assert.equal(
    output,
    "Contact [REDACTED_EMAIL] or [REDACTED_PHONE] via https://portal.example/path"
  );
});

test("containsBlockedSecret catches unsafe secret patterns outside URLs", () => {
  assert.equal(containsBlockedSecret("password=TEST_PASSWORD"), true);
  assert.equal(containsBlockedSecret("cookie=sessionid=abc123"), true);
  assert.equal(
    containsBlockedSecret("Reference URL https://example/path?token=abc123 is sanitized later"),
    false
  );
});
