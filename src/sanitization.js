const URL_REGEX = /https?:\/\/[^\s]+/gi;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /\b(?:\+?66|0)\d{8,9}\b/g;
const BLOCKED_SECRET_REGEX =
  /\b(?:password|passwd|pwd|api[_-]?key|secret|authorization|bearer|cookie|session(?:id)?|access[_-]?token|refresh[_-]?token)\b\s*[:=]/i;
const PRIVATE_KEY_REGEX = /-----BEGIN [A-Z ]*PRIVATE KEY-----/i;

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeUrl(value) {
  if (value == null || value === "") {
    return null;
  }

  const input = String(value).trim();

  try {
    const url = new URL(input);
    return `${url.origin}${url.pathname}`;
  } catch (error) {
    if (/^\/[^\s?#]*([?#].*)?$/u.test(input)) {
      return input.split(/[?#]/u)[0];
    }

    return null;
  }
}

function sanitizePath(value) {
  if (value == null || value === "") {
    return null;
  }

  const input = String(value).trim();
  const sanitizedUrl = sanitizeUrl(input);

  if (sanitizedUrl && /^https?:\/\//i.test(input)) {
    return new URL(sanitizedUrl).pathname || "/";
  }

  return input.split(/[?#]/u)[0];
}

function sanitizeDomain(value) {
  if (value == null || value === "") {
    return null;
  }

  const input = String(value).trim();

  try {
    return new URL(input).hostname.toLowerCase();
  } catch (error) {
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input)) {
      return input.toLowerCase();
    }

    return null;
  }
}

function stripUrls(text) {
  return String(text ?? "").replace(URL_REGEX, " ");
}

function containsBlockedSecret(value) {
  const withoutUrls = stripUrls(value);
  return BLOCKED_SECRET_REGEX.test(withoutUrls) || PRIVATE_KEY_REGEX.test(withoutUrls);
}

function sanitizeText(value) {
  if (value == null || value === "") {
    return null;
  }

  const sanitizedUrls = String(value).replace(URL_REGEX, (match) => {
    const sanitized = sanitizeUrl(match);
    return sanitized ?? "[INVALID_URL]";
  });

  return normalizeWhitespace(
    sanitizedUrls
      .replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
      .replace(PHONE_REGEX, "[REDACTED_PHONE]")
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = {
  sanitizeUrl,
  sanitizePath,
  sanitizeDomain,
  sanitizeText,
  containsBlockedSecret,
  normalizeWhitespace,
  escapeHtml
};
