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
  assert.equal(data.totals.totalSites >= 10, true);
  assert.ok(Array.isArray(data.sites));
  assert.equal(data.sites.length >= 10, true);

  // garmgoon.com and seo.garmgoon.com must be excluded
  assert.equal(data.sites.some((s) => s.id === "garmgoon"), false);
  assert.equal(data.sites.some((s) => s.id === "seohub"), false);

  // EverydayTutor checks
  const everydaytutor = data.sites.find((s) => s.id === "everydaytutor");
  assert.ok(everydaytutor);
  assert.equal(everydaytutor.domain, "everydaytutor.net");
  assert.ok(everydaytutor.overview);
  assert.ok(Array.isArray(everydaytutor.topQueries));
  assert.ok(Array.isArray(everydaytutor.history?.["7d"]));

  // Newly added sites checks
  const mine98 = data.sites.find((s) => s.id === "mine98");
  assert.ok(mine98);
  assert.equal(mine98.domain, "mine98.com");
  assert.equal(mine98.dataStatus, "new");
  assert.equal(mine98.overview.clicks28d, 0);

  const kimedit = data.sites.find((s) => s.id === "kimedit");
  assert.ok(kimedit);
  assert.equal(kimedit.domain, "vfeed.vercel.app");

  const cartuner = data.sites.find((s) => s.id === "cartuner");
  assert.ok(cartuner);
  assert.equal(cartuner.domain, "car-tuner.garmgoon-domain.workers.dev");

  const mmb = data.sites.find((s) => s.id === "mmb");
  assert.ok(mmb);
  assert.equal(mmb.domain, "modern-mountain-builders-demo.vercel.app");

  const gagebase = data.sites.find((s) => s.id === "gagebase");
  assert.ok(gagebase);
  assert.equal(gagebase.domain, "gagebase.pages.dev");

  // Test ?period=7d and ?period=90d
  const res7d = await worker.fetch(new Request("https://garmgoon.test/api/stats/summary?period=7d"), env);
  const data7d = await res7d.json();
  assert.equal(data7d.selectedPeriod, "7d");
  assert.ok(data7d.periodTotals);
  assert.ok(data7d.periodTotals["7d"]);
  assert.ok(data7d.periodTotals["90d"]);
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
