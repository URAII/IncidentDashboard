const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { createUiServer } = require("../src");

function request(server, route) {
  const address = server.address();

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path: route,
        method: "GET"
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body
          });
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

test("UI server returns sanitized dashboard payload with workflow filtering", async (t) => {
  const server = createUiServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const response = await request(
    server,
    "/api/dashboard?workflow_stage=Waiting%20for%20Agency&has_image=false"
  );
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.summary.total_incidents, 1);
  assert.equal(payload.records[0].incident_id, "INC-002");
  assert.equal(payload.records[0].affected_url_sanitized.includes("?"), false);
  assert.equal(payload.records[0].evidence_preview.some((item) => item.includes("?")), false);
});

test("UI server serves the lightweight dashboard shell", async (t) => {
  const server = createUiServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const response = await request(server, "/");

  assert.equal(response.statusCode, 200);
  assert.match(response.headers["content-type"], /text\/html/);
  assert.match(response.body, /MOPH Incident Dashboard/);
  assert.match(response.body, /Sanitized-only Cyber Monitoring/);
});
