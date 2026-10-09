import { SITES_METRICS, getAggregatedStats, getAllPeriodTotals, PERIODS } from "../lib/stats-data.js";
import { json, httpError } from "./util.js";

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
 * 통계 요약 및 사이트별 지표 데이터를 반환한다. (7d, 28d, 90d 기간 지원)
 * D1 엣지 실측 텔레메트리 테이블(telemetry_visitors)을 조회하여
 * mine98, webomok, pwstudio, kimedit, everydaytutor의 실시간 실측 방문자수를 합산 반환한다.
 */
export async function getStatsSummaryApi(env, url) {
  const period = (url.searchParams.get("period") || "28d").toLowerCase();
  const validPeriod = ["7d", "28d", "90d"].includes(period) ? period : "28d";

  // 깊은 복사본 생성하여 런타임 변조 격리
  const sites = JSON.parse(JSON.stringify(SITES_METRICS));

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
                 COUNT(*) as events_28d,
                 COUNT(CASE WHEN day >= ? THEN 1 END) as events_7d,
                 COUNT(CASE WHEN day >= ? THEN 1 END) as events_90d
          FROM telemetry_events
          WHERE day >= ?
          GROUP BY site_id
        `).bind(day7, day90, day90).all().catch(() => ({ results: [] })),
      ]);

      const visitorMap = new Map((visitorsRes?.results || []).map((r) => [r.site_id, r]));
      const eventMap = new Map((eventsRes?.results || []).map((r) => [r.site_id, r]));

      for (const s of sites) {
        const v = visitorMap.get(s.id);
        const ev = eventMap.get(s.id);

        if (s.id === "utahsays") {
          // Utah Says는 자체 D1 실측 88명 베이스 + 중앙 비콘 실측치
          const extra7 = v ? v.uv_7d : 0;
          const extra28 = v ? v.uv_28d : 0;
          const extra90 = v ? v.uv_90d : 0;
          if (s.overview?.periods) {
            s.overview.periods["7d"].users = Math.max(s.overview.periods["7d"].users || 0, extra7);
            s.overview.periods["28d"].users = Math.max(s.overview.periods["28d"].users || 88, 88 + extra28);
            s.overview.periods["90d"].users = Math.max(s.overview.periods["90d"].users || 88, 88 + extra90);
            s.overview.users28d = s.overview.periods["28d"].users;
          }
          s.telemetrySource = "D1 엣지 실측 비콘 (1st-Party)";
        } else if (s.id === "everydaytutor") {
          // EverydayTutor는 GA4 28일 실측 2명 베이스 + D1 실측 비콘 합산
          const uv7 = v ? v.uv_7d : 0;
          const uv28 = v ? v.uv_28d : 0;
          const uv90 = v ? v.uv_90d : 0;
          if (s.overview?.periods) {
            s.overview.periods["7d"].users = uv7;
            s.overview.periods["28d"].users = Math.max(2, uv28);
            s.overview.periods["90d"].users = Math.max(2, uv90);
            s.overview.users28d = s.overview.periods["28d"].users;
          }
          s.dataStatus = "real";
          s.telemetrySource = "D1 엣지 실측 비콘 + GSC/GA4";
        } else if (["mine98", "webomok", "pwstudio", "kimedit"].includes(s.id)) {
          const uv7 = v ? v.uv_7d : 0;
          const uv28 = v ? v.uv_28d : 0;
          const uv90 = v ? v.uv_90d : 0;

          if (s.overview?.periods) {
            s.overview.periods["7d"].users = uv7;
            s.overview.periods["28d"].users = uv28;
            s.overview.periods["90d"].users = uv90;
            s.overview.users28d = uv28;
          }

          if (ev && ev.events_28d > 0 && s.overview?.periods) {
            s.overview.periods["7d"].conversions = ev.events_7d;
            s.overview.periods["28d"].conversions = ev.events_28d;
            s.overview.periods["90d"].conversions = ev.events_90d;
          }

          if (uv28 > 0) {
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
