const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const { prepareIncidentDataset } = require("./validation");
const { buildDashboardPayload } = require("./dashboard");

const DEFAULT_NOW = "2026-05-12T12:00:00.000Z";
const DEFAULT_PORT = Number(process.env.PORT || 4173);
const STATIC_DIR = path.resolve(__dirname, "..", "ui");
const FIXTURE_PATH = path.resolve(__dirname, "..", "fixtures", "sample-incident-bundles.json");
const DEFAULT_BUNDLES = require(FIXTURE_PATH);

function loadDataset(options = {}) {
  const bundles = options.bundles || DEFAULT_BUNDLES;
  const now = options.now || DEFAULT_NOW;
  const { validBundles, errors } = prepareIncidentDataset(bundles, { now });

  return {
    bundles: validBundles,
    errors,
    now
  };
}

function parseFilters(searchParams) {
  const filters = {};

  copyString(searchParams, filters, "organization_id");
  copyString(searchParams, filters, "organization");
  copyString(searchParams, filters, "health_region");
  copyString(searchParams, filters, "province");
  copyString(searchParams, filters, "agency_type");
  copyString(searchParams, filters, "incident_type");
  copyString(searchParams, filters, "severity");
  copyString(searchParams, filters, "status");
  copyString(searchParams, filters, "workflow_stage");
  copyString(searchParams, filters, "sla_status");
  copyString(searchParams, filters, "date_from");
  copyString(searchParams, filters, "date_to");

  const hasImage = searchParams.get("has_image");
  if (hasImage === "true") {
    filters.has_image = true;
  } else if (hasImage === "false") {
    filters.has_image = false;
  }

  return filters;
}

function copyString(searchParams, target, key) {
  const value = searchParams.get(key);
  if (value) {
    target[key] = value;
  }
}

function createUiServer(options = {}) {
  const dataset = loadDataset(options);

  return http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");

    if (requestUrl.pathname === "/api/dashboard") {
      const payload = buildDashboardPayload(dataset.bundles, {
        now: dataset.now,
        filters: parseFilters(requestUrl.searchParams)
      });

      return json(response, 200, {
        ...payload,
        validation: {
          rejected_records: dataset.errors.length
        }
      });
    }

    if (requestUrl.pathname === "/api/health") {
      return json(response, 200, {
        ok: true,
        generated_at: dataset.now
      });
    }

    const filePath = resolveStaticPath(requestUrl.pathname);
    if (!filePath) {
      return json(response, 404, { error: "Not found" });
    }

    return serveFile(filePath, response);
  });
}

function resolveStaticPath(pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(safePath).replace(/^(\.\.[/\\])+/, "");
  const resolved = path.resolve(STATIC_DIR, `.${normalized}`);

  if (!resolved.startsWith(STATIC_DIR)) {
    return null;
  }

  return resolved;
}

function serveFile(filePath, response) {
  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      json(response, 404, { error: "Static asset not found" });
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypeFor(filePath),
      "Cache-Control": "no-store"
    });
    response.end(buffer);
  });
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }

  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }

  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }

  if (filePath.endsWith(".mjs")) {
    return "text/javascript; charset=utf-8";
  }

  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }

  return "text/plain; charset=utf-8";
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

if (require.main === module) {
  const server = createUiServer();
  server.listen(DEFAULT_PORT, "127.0.0.1", () => {
    process.stdout.write(`Incident Dashboard UI running at http://127.0.0.1:${DEFAULT_PORT}\n`);
  });
}

module.exports = {
  createUiServer,
  parseFilters,
  loadDataset
};
