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
  assert.equal(data.totals.totalSites, 7);
  assert.ok(Array.isArray(data.sites));
  assert.equal(data.sites.length, 7);

  // garmgoon.com, seo.garmgoon.com, cartuner, mmb, gagebase must be excluded
  assert.equal(data.sites.some((s) => s.id === "garmgoon"), false);
  assert.equal(data.sites.some((s) => s.id === "seohub"), false);
  assert.equal(data.sites.some((s) => s.id === "cartuner"), false);
  assert.equal(data.sites.some((s) => s.id === "mmb"), false);
  assert.equal(data.sites.some((s) => s.id === "gagebase"), false);

  // Active sites checks
  const everydaytutor = data.sites.find((s) => s.id === "everydaytutor");
  assert.ok(everydaytutor);
  assert.equal(everydaytutor.domain, "everydaytutor.net");
  assert.ok(everydaytutor.overview);
  assert.ok(Array.isArray(everydaytutor.topQueries));
  assert.ok(Array.isArray(everydaytutor.history?.["7d"]));

  const mine98 = data.sites.find((s) => s.id === "mine98");
  assert.ok(mine98);
  assert.equal(mine98.domain, "mine98.com");
  assert.equal(mine98.dataStatus, "new");
  assert.equal(mine98.overview.clicks28d, 0);

  const kimedit = data.sites.find((s) => s.id === "kimedit");
  assert.ok(kimedit);
  assert.equal(kimedit.domain, "vfeed.vercel.app");

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

  // Excluded domains must now be rejected
  const resExcluded = await worker.fetch(
    new Request("https://garmgoon.test/api/stats/ping?domain=car-tuner.garmgoon-domain.workers.dev"),
    env
  );
  assert.equal(resExcluded.status, 400);
});

test("POST /api/telemetry records empirical visitors and integrates into stats summary", async (t) => {
  const env = setup(t);

  // 1. Script serving
  const scriptRes = await worker.fetch(new Request("https://garmgoon.test/telemetry.js"), env);
  assert.equal(scriptRes.status, 200);
  assert.ok(scriptRes.headers.get("content-type").includes("javascript"));

  // 2. CORS Preflight
  const preflightRes = await worker.fetch(new Request("https://garmgoon.test/api/telemetry", { method: "OPTIONS" }), env);
  assert.equal(preflightRes.status, 204);
  assert.equal(preflightRes.headers.get("access-control-allow-origin"), "*");

  // 3. Post telemetry beacon from mine98
  const beaconRes = await worker.fetch(
    new Request("https://garmgoon.test/api/telemetry", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.195",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ site: "mine98", path: "/" }),
    }),
    env
  );
  assert.equal(beaconRes.status, 200);
  const beaconData = await beaconRes.json();
  assert.equal(beaconData.ok, true);
  assert.equal(beaconData.site, "mine98");

  // 4. Verify in stats summary
  const summaryRes = await worker.fetch(new Request("https://garmgoon.test/api/stats/summary"), env);
  const summary = await summaryRes.json();
  assert.equal(summary.ok, true);

  const mine98 = summary.sites.find((s) => s.id === "mine98");
  assert.ok(mine98);
  assert.equal(mine98.overview.users28d, 1);
  assert.equal(mine98.overview.periods["28d"].users, 1);
  assert.equal(mine98.dataStatus, "real");
  assert.equal(mine98.telemetrySource, "D1 엣지 실측 비콘 (1st-Party)");
});

