import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker.mjs";

const assetResponse = new Response("site", {
  status: 200,
  headers: { "content-type": "text/html" },
});
const env = { ASSETS: { fetch: async () => assetResponse.clone() } };

test("HTTP requests redirect permanently to HTTPS", async () => {
  const response = await worker.fetch(new Request("http://siliconforecast.com/about/?source=test"), env);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://siliconforecast.com/about/?source=test");
});

test("HTTPS assets receive baseline security headers", async () => {
  const response = await worker.fetch(new Request("https://siliconforecast.com/"), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
});
