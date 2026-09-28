import { digestFor } from "./board.js";
import { httpError, json, localParts } from "./util.js";

// 웹 푸시 (RFC 8030/8291/8292). 라이브러리 없이 WebCrypto로 VAPID 서명과 aes128gcm 암호화를 한다.
// 필요한 secret: VAPID_PUBLIC_KEY(비압축 공개키 base64url), VAPID_PRIVATE_KEY(개인키 d base64url)
// 키 만들기: node scripts/vapid-keys.mjs

const enc = new TextEncoder();
// 알려진 브라우저 푸시 서버로만 보낸다 (임의 주소로 요청을 보내지 않게)
const PUSH_HOSTS = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;

export function b64u(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64u(s) {
  return Uint8Array.from(atob(String(s).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

export function pushEnabled(env) {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

let signingKey = null;

async function vapidKey(env) {
  if (signingKey?.pub === env.VAPID_PUBLIC_KEY) return signingKey.key;
  const pub = fromB64u(env.VAPID_PUBLIC_KEY);
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: env.VAPID_PRIVATE_KEY },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  signingKey = { pub: env.VAPID_PUBLIC_KEY, key };
  return key;
}

// 푸시 서버에 "이 사이트가 보냈다"는 것을 증명하는 ES256 JWT
export async function vapidJwt(env, audience) {
  const part = (o) => b64u(enc.encode(JSON.stringify(o)));
  const unsigned = `${part({ typ: "JWT", alg: "ES256" })}.${part({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "https://garmgoon.com" })}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, await vapidKey(env), enc.encode(unsigned));
  return `${unsigned}.${b64u(sig)}`;
}

async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

// 받는 브라우저만 풀 수 있게 내용을 암호화한다 (RFC 8291, 레코드 하나)
export async function encryptPayload(p256dh, auth, text) {
  const uaPublic = fromB64u(p256dh);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(fromB64u(auth), shared, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 끝에 붙는 0x02는 '마지막 레코드' 표시
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(enc.encode(text), new Uint8Array([2]))));
  const header = new Uint8Array(21);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

// 알림 하나를 보낸다. 브라우저가 구독을 끊었으면(404/410) 구독을 지운다.
export async function sendPush(env, sub, payload) {
  const body = await encryptPayload(sub.p256dh, sub.auth, JSON.stringify(payload));
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      authorization: `vapid t=${await vapidJwt(env, new URL(sub.endpoint).origin)}, k=${env.VAPID_PUBLIC_KEY}`,
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      ttl: "86400",
      urgency: "normal",
    },
    body,
  });
  if (res.status === 404 || res.status === 410) await env.DB.prepare("DELETE FROM family_push WHERE endpoint = ?").bind(sub.endpoint).run();
  return res.status;
}

// 새 글·댓글 알림: 받는 사람 중 알림을 켠 사람의 모든 기기로 보낸다
export async function notifyMembers(env, memberIds, payload) {
  if (!pushEnabled(env) || !memberIds.length) return 0;
  const { results } = await env.DB.prepare(
    `SELECT p.* FROM family_push p JOIN family_members m ON m.id = p.member_id WHERE m.notify_posts = 1 AND p.member_id IN (${memberIds.map(() => "?").join(",")})`,
  )
    .bind(...memberIds)
    .all();
  const sent = await Promise.allSettled(results.map((s) => sendPush(env, s, payload)));
  return sent.filter((r) => r.status === "fulfilled" && r.value < 300).length;
}

function digestPayload(d) {
  const lines = [];
  if (d.tasks.length) lines.push(`✅ 할 일 ${d.tasks.length}개: ${d.tasks.slice(0, 4).join(", ")}${d.tasks.length > 4 ? " …" : ""}`);
  const icon = { birthday: "🎂", anniversary: "💍", memorial: "🕯️", other: "📅" };
  for (const x of d.dates) lines.push(`${icon[x.kind]} ${x.title} ${x.dDay ? `D-${x.dDay}` : "오늘!"}`);
  return { title: "📌 오늘 우리집", body: lines.join("\n"), url: "/family?tab=board", tag: "digest" };
}

// 크론(10분마다): 각 기기의 시간대로 아침 요약 시각이 지났고 오늘 아직 안 보냈으면 보낸다
export async function sendDigests(env) {
  if (!pushEnabled(env)) return 0;
  const { results } = await env.DB.prepare(
    "SELECT p.*, m.notify_hour FROM family_push p JOIN family_members m ON m.id = p.member_id WHERE m.notify_hour IS NOT NULL",
  ).all();
  const digests = new Map();
  let sent = 0;
  for (const s of results) {
    const { day, hour } = localParts(s.tz);
    if (hour < s.notify_hour || s.last_day === day) continue;
    await env.DB.prepare("UPDATE family_push SET last_day = ? WHERE endpoint = ?").bind(day, s.endpoint).run();
    const key = `${s.member_id}:${day}`;
    if (!digests.has(key)) {
      const member = await env.DB.prepare("SELECT * FROM family_members WHERE id = ?").bind(s.member_id).first();
      digests.set(key, await digestFor(env, member, day));
    }
    const d = digests.get(key);
    // 할 일도 기념일도 없는 날은 조용히 넘어간다
    if (!d.tasks.length && !d.dates.length) continue;
    try {
      if ((await sendPush(env, s, digestPayload(d))) < 300) sent++;
    } catch (e) {
      console.error(e);
    }
  }
  return sent;
}

function validTimeZone(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// /api/family/push/...
export async function handlePush(env, me, request, sub) {
  if (sub === "" && request.method === "GET") {
    const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM family_push WHERE member_id = ?").bind(me.id).first();
    return json({ enabled: pushEnabled(env), publicKey: env.VAPID_PUBLIC_KEY || null, notifyHour: me.notify_hour, notifyPosts: Boolean(me.notify_posts), devices: n });
  }
  if (sub === "/settings" && request.method === "PATCH") {
    const b = await request.json();
    const hour = b.notifyHour === null ? null : Number(b.notifyHour ?? me.notify_hour);
    if (hour !== null && !(Number.isInteger(hour) && hour >= 0 && hour <= 23)) return httpError(400, "알림 시각이 잘못됐어요.");
    const posts = b.notifyPosts !== undefined ? (b.notifyPosts ? 1 : 0) : me.notify_posts;
    await env.DB.prepare("UPDATE family_members SET notify_hour = ?, notify_posts = ? WHERE id = ?").bind(hour, posts, me.id).run();
    return json({ notifyHour: hour, notifyPosts: Boolean(posts) });
  }
  if (!pushEnabled(env)) return httpError(503, "알림 키(VAPID)가 설정되지 않았어요.");
  if (sub === "/subscribe" && request.method === "POST") {
    const { endpoint, keys, tz } = await request.json();
    if (!PUSH_HOSTS.test(endpoint || "")) return httpError(400, "지원하지 않는 알림 서버예요.");
    if (!keys?.p256dh || !keys?.auth || fromB64u(keys.p256dh).length !== 65) return httpError(400, "알림 구독 정보가 잘못됐어요.");
    const zone = validTimeZone(tz) ? tz : "Asia/Seoul";
    // 오늘 요약 시각이 이미 지났으면 오늘 치는 보낸 것으로 친다 (구독하자마자 요약이 오지 않게)
    const { day, hour } = localParts(zone);
    const lastDay = me.notify_hour !== null && hour >= me.notify_hour ? day : null;
    await env.DB.prepare("INSERT OR REPLACE INTO family_push (endpoint, member_id, p256dh, auth, tz, last_day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(endpoint, me.id, keys.p256dh, keys.auth, zone, lastDay, Date.now())
      .run();
    return json({ ok: true });
  }
  if (sub === "/unsubscribe" && request.method === "POST") {
    const { endpoint } = await request.json();
    await env.DB.prepare("DELETE FROM family_push WHERE endpoint = ? AND member_id = ?").bind(String(endpoint || ""), me.id).run();
    return json({ ok: true });
  }
  if (sub === "/test" && request.method === "POST") {
    const { results } = await env.DB.prepare("SELECT * FROM family_push WHERE member_id = ?").bind(me.id).all();
    if (!results.length) return httpError(400, "알림을 켠 기기가 없어요.");
    const statuses = await Promise.allSettled(
      results.map((s) => sendPush(env, s, { title: "🔔 알림 테스트", body: `${me.emoji} ${me.name}의 기기로 알림이 잘 와요!`, url: "/family?tab=board", tag: "test" })),
    );
    const sent = statuses.filter((r) => r.status === "fulfilled" && r.value < 300).length;
    return json({ sent, total: results.length });
  }
  return httpError(404, "없는 API");
}
