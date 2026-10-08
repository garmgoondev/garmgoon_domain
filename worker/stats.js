import { SITES_METRICS, getAggregatedStats } from "../lib/stats-data.js";
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
  "garmgoon.com",
  "www.garmgoon.com",
  "seo.garmgoon.com",
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
 * 통계 요약 및 사이트별 지표 데이터를 반환한다.
 */
export async function getStatsSummaryApi(env, url) {
  const totals = getAggregatedStats(SITES_METRICS);
  return json({
    ok: true,
    generatedAt: new Date().toISOString(),
    totals,
    sites: SITES_METRICS,
  }, {
    headers: {
      "cache-control": "private, max-age=60",
    },
  });
}
