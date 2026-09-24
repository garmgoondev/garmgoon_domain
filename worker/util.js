const KST_OFFSET = 9 * 60 * 60 * 1000;
const UA = "Mozilla/5.0 (compatible; garmgoon-bot/1.0; +https://garmgoon.com)";

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

// KST 기준 날짜 문자열 (YYYY-MM-DD)
export function kstDay(ms = Date.now()) {
  return new Date(ms + KST_OFFSET).toISOString().slice(0, 10);
}

export function kstParts(ms = Date.now()) {
  const d = new Date(ms + KST_OFFSET);
  return { hour: d.getUTCHours(), weekday: d.getUTCDay() };
}

// 해당 시각이 속한 주의 월요일 (KST, YYYY-MM-DD)
export function kstWeekStart(ms = Date.now()) {
  const { weekday } = kstParts(ms);
  return kstDay(ms - ((weekday + 6) % 7) * DAY);
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...init.headers },
  });
}

export function httpError(status, message) {
  return json({ error: message }, { status });
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", middot: "·", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—" };

export function decodeEntities(s = "") {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function stripHtml(html = "") {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>/gi, "\n")
      // 속성값 안에 '>'가 들어 있는 태그도 통째로 제거한다
      .replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export function truncate(s = "", n) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export async function fetchText(url, { timeout = 10000, maxBytes = 1_500_000, headers = {}, ...init } = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { "user-agent": UA, "accept-language": "ko,en;q=0.8", ...headers },
    signal: AbortSignal.timeout(timeout),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  // 큰 페이지는 앞부분만 읽는다 (CPU/메모리 절약)
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (size < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => {});
  const buf = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(buf);
}

export function parseJSON(s, fallback = null) {
  try {
    return s == null ? fallback : JSON.parse(s);
  } catch {
    return fallback;
  }
}

export async function getState(env, key) {
  const row = await env.DB.prepare("SELECT value FROM state WHERE key = ?").bind(key).first();
  return row ? row.value : null;
}

export async function setState(env, key, value) {
  await env.DB.prepare(
    "INSERT INTO state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  )
    .bind(key, String(value), Date.now())
    .run();
}

export async function log(env, level, message) {
  console[level === "error" ? "error" : "log"](`[${level}] ${message}`);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO logs (at, level, message) VALUES (?, ?, ?)").bind(Date.now(), level, truncate(message, 500)),
    env.DB.prepare("DELETE FROM logs WHERE id <= (SELECT MAX(id) - 300 FROM logs)"),
  ]);
}
