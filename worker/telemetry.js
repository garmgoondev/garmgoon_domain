import { localDay, timeZone } from "./util.js";

const VALID_SITES = new Set([
  "mine98",
  "webomok",
  "pwstudio",
  "kimedit",
  "everydaytutor",
  "utahsays",
  "ecocarpet",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

// 봇/크롤러 필터링 (순수 사용자 방문자만 측정)
const BOT_REGEX = /bot|spider|crawl|slurp|facebookexternalhit|lighthouse|headless|inspect|curl|wget/i;

/**
 * 방문자 IP와 UA를 비가역적 익명 해시로 변환 (개인정보 보호 & GDPR 준수)
 */
async function hashVisitor(ip, ua, site) {
  const encoder = new TextEncoder();
  const raw = `${ip}::${ua}::${site}::salt_garmgoon_telemetry_2026`;
  const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/**
 * OPTIONS 프리플라이트 요청 처리
 */
export function handleTelemetryOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * 모든 자사 웹사이트에 삽입 가능한 경량 텔레메트리 스크립트 서빙 (/telemetry.js)
 * 외부 추적기가 아니므로 애드블록에 차단되지 않음
 */
export function handleTelemetryScript() {
  const scriptContent = `(function(){
  try {
    if (typeof window === "undefined") return;
    var d = document;
    var s = d.currentScript || d.querySelector("script[data-site]");
    var site = s ? s.getAttribute("data-site") : (window.__TELEMETRY_SITE__ || null);
    if (!site) return;
    var payload = JSON.stringify({
      site: site,
      path: window.location.pathname || "/",
      ref: d.referrer || ""
    });
    var url = "https://garmgoon.com/api/telemetry";
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: "text/plain" }));
    } else {
      fetch(url, {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "text/plain" },
        keepalive: true,
        mode: "cors"
      }).catch(function(){});
    }
  } catch(e){}
})();`;

  return new Response(scriptContent, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      ...CORS_HEADERS,
    },
  });
}

/**
 * 1st-Party 엣지 실측 텔레메트리 비콘 수신 (/api/telemetry)
 */
export async function handleTelemetry(request, env, url) {
  if (request.method === "OPTIONS") {
    return handleTelemetryOptions();
  }

  let body = {};
  if (request.method === "POST") {
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }
  } else if (request.method === "GET") {
    body = {
      site: url.searchParams.get("site"),
      path: url.searchParams.get("path"),
      ref: url.searchParams.get("ref"),
      event: url.searchParams.get("event"),
    };
  }

  const siteId = String(body.site || "").toLowerCase().trim();
  if (!VALID_SITES.has(siteId)) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_site" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const ua = request.headers.get("user-agent") || "";
  if (BOT_REGEX.test(ua)) {
    // 봇은 통계 오염 방지를 위해 집계에서 제외하고 성공 반환
    return new Response(JSON.stringify({ ok: true, ignored: "bot" }), {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const visitorHash = await hashVisitor(ip, ua, siteId);
  const now = Date.now();
  const day = localDay(timeZone(env), now);

  try {
    // D1 원자적 업서트: 오늘 해당 사이트에 처음 온 방문자면 INSERT, 재방문이면 hits 증가 및 last_seen 갱신
    await env.DB.prepare(`
      INSERT INTO telemetry_visitors (site_id, day, visitor_hash, first_seen_at, last_seen_at, hits)
      VALUES (?, ?, ?, ?, ?, 1)
      ON CONFLICT(site_id, day, visitor_hash) DO UPDATE SET
        last_seen_at = excluded.last_seen_at,
        hits = telemetry_visitors.hits + 1
    `).bind(siteId, day, visitorHash, now, now).run();

    // 커스텀 이벤트(전환/게임완료/투표 등) 기록
    const eventName = body.event || body.event_name;
    if (eventName && typeof eventName === "string") {
      const cleanEvent = eventName.trim().slice(0, 64);
      const meta = body.meta ? JSON.stringify(body.meta).slice(0, 500) : null;
      await env.DB.prepare(`
        INSERT INTO telemetry_events (site_id, event_name, day, visitor_hash, meta, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(siteId, cleanEvent, day, visitorHash, meta, now).run();
    }

    return new Response(JSON.stringify({ ok: true, site: siteId, day }), {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
}
