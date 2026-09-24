const UA = "Mozilla/5.0 (compatible; garmgoon-bot/1.0; +https://garmgoon.com)";

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

// 날짜 경계와 수집 시각의 기준 시간대. 서머타임은 Intl이 알아서 처리한다.
export function timeZone(env) {
  return env.TIMEZONE || "America/Denver";
}

const formatters = new Map();

// 해당 시간대의 { day: "YYYY-MM-DD", hour, weekday(0=일) }
export function localParts(tz, ms = Date.now()) {
  if (!formatters.has(tz)) {
    formatters.set(
      tz,
      new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" }),
    );
  }
  const p = Object.fromEntries(formatters.get(tz).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday),
  };
}

export function localDay(tz, ms = Date.now()) {
  return localParts(tz, ms).day;
}

// "YYYY-MM-DD" 문자열에 n일을 더한다 (시간대와 무관한 달력 계산)
export function addDays(day, n) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// 해당 시각이 속한 주의 월요일 (YYYY-MM-DD)
export function localWeekStart(tz, ms = Date.now()) {
  const { day, weekday } = localParts(tz, ms);
  return addDays(day, -((weekday + 6) % 7));
}

// 해당 시간대에서 그 날짜가 시작되는 순간(자정)의 epoch ms
export function dayStartMs(tz, day) {
  const [y, m, d] = day.split("-").map(Number);
  let guess = Date.UTC(y, m - 1, d);
  for (let i = 0; i < 2; i++) {
    const p = localParts(tz, guess);
    const [py, pm, pd] = p.day.split("-").map(Number);
    const shownAsUtc = Date.UTC(py, pm - 1, pd, p.hour);
    guess -= shownAsUtc - Date.UTC(y, m - 1, d);
  }
  return guess;
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
