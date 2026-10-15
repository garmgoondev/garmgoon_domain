import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./db.mjs";
import worker from "../worker/index.js";
import { sessionCookie } from "../worker/auth.js";

function setup(t, vars = {}) {
  const env = { ...database(), ADMIN_PASSWORD: "pw", ...vars };
  t.after(() => env.sqlite.close());
  return env;
}

async function authedFetch(env, url, init = {}) {
  const cookie = (await sessionCookie(env, false)).split(";")[0];
  return worker.fetch(
    new Request(url, {
      ...init,
      headers: { ...(init.headers || {}), cookie },
    }),
    env
  );
}

test("GET /api/stats/summary returns aggregated totals and site metrics", async (t) => {
  const env = setup(t);
  const res = await authedFetch(env, "https://garmgoon.test/api/stats/summary");
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
  assert.ok(["new", "real"].includes(mine98.dataStatus));

  const kimedit = data.sites.find((s) => s.id === "kimedit");
  assert.ok(kimedit);
  assert.equal(kimedit.domain, "vfeed.vercel.app");

  // Every site must include 3 concrete action plan items and syncMeta must be present
  assert.ok(data.syncMeta);
  for (const s of data.sites) {
    assert.ok(Array.isArray(s.actionItems), `${s.id} must have actionItems array`);
    assert.equal(s.actionItems.length, 3, `${s.id} should have 3 action items`);
  }

  // Test ?period=7d and ?period=90d
  const res7d = await authedFetch(env, "https://garmgoon.test/api/stats/summary?period=7d");
  const data7d = await res7d.json();
  assert.equal(data7d.selectedPeriod, "7d");
  assert.ok(data7d.periodTotals);
  assert.ok(data7d.periodTotals["7d"]);
  assert.ok(data7d.periodTotals["90d"]);
});

test("POST /api/stats/sync updates seo_hub:stats_snapshot in D1 and reflects in summary", async (t) => {
  const env = setup(t);
  const initialRes = await authedFetch(env, "https://garmgoon.test/api/stats/summary");
  const initial = await initialRes.json();

  const updatedSites = JSON.parse(JSON.stringify(initial.sites));
  updatedSites[0].actionItems = [
    "주간 리포트 자동 동기화 테스트 과제 1",
    "주간 리포트 자동 동기화 테스트 과제 2",
    "주간 리포트 자동 동기화 테스트 과제 3",
  ];

  const syncRes = await authedFetch(env, "https://garmgoon.test/api/stats/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      syncMeta: { latestReportDate: "2026-10-13", latestReportFile: "2026-10-13-all-sites-summary.md" },
      sites: updatedSites,
    }),
  });
  assert.equal(syncRes.status, 200);
  const syncData = await syncRes.json();
  assert.equal(syncData.ok, true);
  assert.equal(syncData.syncedSites, 7);

  const afterRes = await authedFetch(env, "https://garmgoon.test/api/stats/summary");
  const after = await afterRes.json();
  assert.equal(after.syncMeta.latestReportDate, "2026-10-13");
  assert.deepEqual(after.sites[0].actionItems, [
    "주간 리포트 자동 동기화 테스트 과제 1",
    "주간 리포트 자동 동기화 테스트 과제 2",
    "주간 리포트 자동 동기화 테스트 과제 3",
  ]);
});

test("GET /api/stats/ping validates domain parameter and security check", async (t) => {
  const env = setup(t);

  // Missing domain param
  const resNoParam = await authedFetch(env, "https://garmgoon.test/api/stats/ping");
  assert.equal(resNoParam.status, 400);

  // Disallowed / foreign domain
  const resInvalid = await authedFetch(env, "https://garmgoon.test/api/stats/ping?domain=evil.com");
  assert.equal(resInvalid.status, 400);

  // Excluded domains must now be rejected
  const resExcluded = await authedFetch(
    env,
    "https://garmgoon.test/api/stats/ping?domain=car-tuner.garmgoon-domain.workers.dev"
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

  // 3. Post telemetry beacon from kimedit
  const beaconRes = await worker.fetch(
    new Request("https://garmgoon.test/api/telemetry", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.195",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({ site: "kimedit", path: "/" }),
    }),
    env
  );
  assert.equal(beaconRes.status, 200);
  const beaconData = await beaconRes.json();
  assert.equal(beaconData.ok, true);
  assert.equal(beaconData.site, "kimedit");

  // 4. Verify in stats summary
  const summaryRes = await authedFetch(env, "https://garmgoon.test/api/stats/summary");
  const summary = await summaryRes.json();
  assert.equal(summary.ok, true);

  const kimedit = summary.sites.find((s) => s.id === "kimedit");
  assert.ok(kimedit);
  assert.ok(kimedit.overview.users28d >= 1);
  assert.ok(kimedit.overview.periods["28d"].users >= 1);
  assert.equal(kimedit.dataStatus, "real");
  assert.equal(kimedit.telemetrySource, "D1 엣지 실측 비콘 (1st-Party)");
});



