import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./db.mjs";
import worker from "../worker/index.js";

function setup(t, vars = {}) {
  const env = { ...database(), ADMIN_PASSWORD: "pw", ...vars };
  t.after(() => env.sqlite.close());
  return env;
}

test("GET /api/stats/summary returns aggregated totals and site metrics", async (t) => {
  const env = setup(t);
  const res = await worker.fetch(new Request("https://garmgoon.test/api/stats/summary"), env);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.ok, true);
  assert.ok(data.totals);
  assert.equal(data.totals.totalSites >= 7, true);
  assert.ok(Array.isArray(data.sites));
  assert.equal(data.sites.length >= 7, true);

  const everydaytutor = data.sites.find((s) => s.id === "everydaytutor");
  assert.ok(everydaytutor);
  assert.equal(everydaytutor.domain, "everydaytutor.net");
  assert.ok(everydaytutor.overview);
  assert.ok(Array.isArray(everydaytutor.topQueries));
  assert.ok(Array.isArray(everydaytutor.history7d));
});

test("GET /api/stats/ping validates domain parameter and security check", async (t) => {
  const env = setup(t);

  // Missing domain param
  const resNoParam = await worker.fetch(new Request("https://garmgoon.test/api/stats/ping"), env);
  assert.equal(resNoParam.status, 400);

  // Disallowed / foreign domain
  const resInvalid = await worker.fetch(new Request("https://garmgoon.test/api/stats/ping?domain=evil.com"), env);
  assert.equal(resInvalid.status, 400);
});
