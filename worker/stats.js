import { SITES_METRICS, SEO_SYNC_META, getAggregatedStats, getAllPeriodTotals, PERIODS } from "../lib/stats-data.js";
import { json, httpError, getState, setState, parseJSON } from "./util.js";

const ALLOWED_DOMAINS = new Set([
  "everydaytutor.net",
  "www.everydaytutor.net",
  "pwstudio.kr",
  "www.pwstudio.kr",
  "utahsays.com",
  "www.utahsays.com",
  "new.ecocarpetutah.com",
  "ecocarpetutah.com",
  "webomok.com",
  "www.webomok.com",
  "mine98.com",
  "www.mine98.com",
  "mine98.pages.dev",
  "vfeed.vercel.app",
  "garmgoon.com",
  "www.garmgoon.com",
]);

/**
 * 특정 도메인에 실시간 핑(HEAD 요청)을 전송하여 응답 속도와 HTTP 상태를 측정한다.
 */
export async function pingDomainApi(env, url) {
  const domainParam = (url.searchParams.get("domain") || "").trim();
  if (!domainParam) return httpError(400, "domain 파라미터가 필요합니다.");

  const clean = domainParam
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

  if (!ALLOWED_DOMAINS.has(clean)) {
    return httpError(400, `허용되지 않은 모니터링 대상 도메인입니다: ${clean}`);
  }

  const targetUrl = `https://${clean}`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(targetUrl, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Garmgoon-Domain-Monitor/1.0",
        "Cache-Control": "no-cache",
      },
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    return json({
      ok: true,
      domain: clean,
      status: res.status,
      statusText: res.statusText || (res.status === 200 ? "OK" : ""),
      latencyMs,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const isTimeout = err.name === "AbortError";
    return json({
      ok: false,
      domain: clean,
      status: 0,
      statusText: isTimeout ? "Timeout (6s)" : (err.message || "연결 실패"),
      latencyMs,
      checkedAt: new Date().toISOString(),
    });
  }
}

/**
 * 모든 관리 대상 사이트에 대해 동시 실시간 핑을 실행한다.
 */
export async function pingAllDomainsApi(env) {
  const pingPromises = SITES_METRICS.map(async (site) => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(site.url, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": "Garmgoon-Domain-Monitor/1.0" },
      });
      clearTimeout(timeout);
      return {
        id: site.id,
        domain: site.domain,
        ok: res.ok,
        status: res.status,
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
      };
    } catch (e) {
      return {
        id: site.id,
        domain: site.domain,
        ok: false,
        status: 0,
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
      };
    }
  });

  const results = await Promise.all(pingPromises);
  const healthMap = Object.fromEntries(results.map((r) => [r.id, r]));

  return json({
    ok: true,
    checkedAt: new Date().toISOString(),
    health: healthMap,
  });
}

/**
 * SEO Hub 주간 리포트 발행 시 최신 통계 및 사이트별 Action Plan 스냅샷을 D1 state에 동기화한다.
 */
export async function syncStatsSnapshotApi(env, request) {
  if (!env || !env.DB) return httpError(500, "DB 바인딩이 없습니다.");
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.sites) || body.sites.length === 0) {
    return httpError(400, "유효한 sites 배열이 필요합니다.");
  }
  const syncMeta = {
    lastSyncedAt: new Date().toISOString(),
    ...(body.syncMeta || {}),
  };
  await setState(env, "seo_hub:stats_snapshot", JSON.stringify({ syncMeta, sites: body.sites }));
  return json({
    ok: true,
    syncedSites: body.sites.length,
    syncMeta,
  });
}

/**
 * 통계 요약 및 사이트별 지표 데이터를 반환한다. (7d, 28d, 90d 기간 지원)
 * D1 state(seo_hub:stats_snapshot)와 실시간 D1 텔레메트리(telemetry_visitors, telemetry_events)를 병합 반환한다.
 */
export async function getStatsSummaryApi(env, url) {
  const period = (url.searchParams.get("period") || "28d").toLowerCase();
  const validPeriod = ["7d", "28d", "90d"].includes(period) ? period : "28d";

  let baseSites = SITES_METRICS;
  let syncMeta = SEO_SYNC_META;

  if (env && env.DB) {
    try {
      const rawSnap = await getState(env, "seo_hub:stats_snapshot");
      const snap = parseJSON(rawSnap, null);
      if (snap && Array.isArray(snap.sites) && snap.sites.length > 0) {
        baseSites = snap.sites;
        if (snap.syncMeta) syncMeta = snap.syncMeta;
      }
    } catch (e) {
      console.error("Failed to read seo_hub:stats_snapshot:", e);
    }
  }

  // 깊은 복사본 생성하여 런타임 변조 격리
  const sites = JSON.parse(JSON.stringify(baseSites));

  if (env && env.DB) {
    try {
      const now = new Date();
      const getDayStr = (daysAgo) => {
        const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        return d.toISOString().slice(0, 10);
      };
      const day7 = getDayStr(7);
      const day28 = getDayStr(28);
      const day90 = getDayStr(90);

      const [visitorsRes, eventsRes] = await Promise.all([
        env.DB.prepare(`
          SELECT site_id,
                 COUNT(DISTINCT CASE WHEN day >= ? THEN visitor_hash END) as uv_7d,
                 COUNT(DISTINCT CASE WHEN day >= ? THEN visitor_hash END) as uv_28d,
                 COUNT(DISTINCT CASE WHEN day >= ? THEN visitor_hash END) as uv_90d,
                 SUM(CASE WHEN day >= ? THEN hits ELSE 0 END) as hits_28d
          FROM telemetry_visitors
          GROUP BY site_id
        `).bind(day7, day28, day90, day28).all(),
        env.DB.prepare(`
          SELECT site_id,
                 COUNT(CASE WHEN day >= ? THEN 1 END) as events_7d,
                 COUNT(CASE WHEN day >= ? THEN 1 END) as events_28d,
                 COUNT(CASE WHEN day >= ? THEN 1 END) as events_90d
          FROM telemetry_events
          WHERE day >= ?
          GROUP BY site_id
        `).bind(day7, day28, day90, day90).all().catch(() => ({ results: [] })),
      ]);

      const visitorMap = new Map((visitorsRes?.results || []).map((r) => [r.site_id, r]));
      const eventMap = new Map((eventsRes?.results || []).map((r) => [r.site_id, r]));

      for (const s of sites) {
        const v = visitorMap.get(s.id);
        const ev = eventMap.get(s.id);

        if (s.id === "utahsays") {
          const uv7 = v ? v.uv_7d : 0;
          const uv28 = v ? v.uv_28d : 0;
          const uv90 = v ? v.uv_90d : 0;
          if (s.overview?.periods) {
            s.overview.periods["7d"].users = Math.max(s.overview.periods["7d"].users || 0, uv7);
            s.overview.periods["28d"].users = Math.max(s.overview.periods["28d"].users || 0, uv28);
            s.overview.periods["90d"].users = Math.max(s.overview.periods["90d"].users || 0, uv90);
            s.overview.users28d = s.overview.periods["28d"].users;
          }
          if (ev && ev.events_90d > 0 && s.overview?.periods) {
            s.overview.periods["7d"].conversions = Math.max(s.overview.periods["7d"].conversions || 0, ev.events_7d);
            s.overview.periods["28d"].conversions = Math.max(s.overview.periods["28d"].conversions || 0, ev.events_28d);
            s.overview.periods["90d"].conversions = Math.max(s.overview.periods["90d"].conversions || 0, ev.events_90d);
          }
          s.telemetrySource = "D1 엣지 실측 비콘 (1st-Party)";
        } else if (s.id === "everydaytutor" || s.id === "pwstudio") {
          const uv7 = v ? v.uv_7d : 0;
          const uv28 = v ? v.uv_28d : 0;
          const uv90 = v ? v.uv_90d : 0;
          if (s.overview?.periods) {
            s.overview.periods["7d"].users = Math.max(s.overview.periods["7d"].users || 0, uv7);
            s.overview.periods["28d"].users = Math.max(s.overview.periods["28d"].users || 0, uv28);
            s.overview.periods["90d"].users = Math.max(s.overview.periods["90d"].users || 0, uv90);
            s.overview.users28d = s.overview.periods["28d"].users;
          }
          s.dataStatus = "real";
          s.telemetrySource = "D1 엣지 실측 비콘 + GSC/GA4";
        } else if (["mine98", "webomok", "kimedit"].includes(s.id)) {
          const uv7 = v ? v.uv_7d : 0;
          const uv28 = v ? v.uv_28d : 0;
          const uv90 = v ? v.uv_90d : 0;

          if (s.overview?.periods) {
            s.overview.periods["7d"].users = Math.max(s.overview.periods["7d"].users || 0, uv7);
            s.overview.periods["28d"].users = Math.max(s.overview.periods["28d"].users || 0, uv28);
            s.overview.periods["90d"].users = Math.max(s.overview.periods["90d"].users || 0, uv90);
            s.overview.users28d = s.overview.periods["28d"].users;
          }

          if (ev && ev.events_90d > 0 && s.overview?.periods) {
            s.overview.periods["7d"].conversions = Math.max(s.overview.periods["7d"].conversions || 0, ev.events_7d);
            s.overview.periods["28d"].conversions = Math.max(s.overview.periods["28d"].conversions || 0, ev.events_28d);
            s.overview.periods["90d"].conversions = Math.max(s.overview.periods["90d"].conversions || 0, ev.events_90d);
          }

          if (uv28 > 0 || uv90 > 0) {
            s.dataStatus = "real";
          }
          s.telemetrySource = "D1 엣지 실측 비콘 (1st-Party)";
        }
      }
    } catch (e) {
      console.error("Telemetry query failed in stats summary:", e);
    }
  }

  const totals = getAggregatedStats(sites, validPeriod);
  const periodTotals = getAllPeriodTotals(sites);

  return json({
    ok: true,
    generatedAt: new Date().toISOString(),
    syncMeta,
    selectedPeriod: validPeriod,
    periods: PERIODS,
    totals,
    periodTotals,
    sites,
  }, {
    headers: {
      "cache-control": "no-cache, no-store, must-revalidate",
    },
  });
}

