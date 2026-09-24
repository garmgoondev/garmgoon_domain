const COOKIE = "gg_session";
const MAX_AGE = 30 * 24 * 60 * 60;
const enc = new TextEncoder();

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 비밀번호가 바뀌면 기존 세션도 모두 무효가 된다
function secret(env) {
  return `${env.ADMIN_PASSWORD}:${env.SESSION_SECRET || "garmgoon"}`;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isAuthed(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const cookie = request.headers.get("cookie") || "";
  const value = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))?.[1];
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return timingSafeEqual(sig, await hmac(secret(env), exp));
}

export async function checkPassword(env, password) {
  if (!env.ADMIN_PASSWORD || typeof password !== "string") return false;
  // 길이 차이로 인한 타이밍 노출을 막기 위해 해시끼리 비교한다
  const [a, b] = await Promise.all([hmac("pw", password), hmac("pw", env.ADMIN_PASSWORD)]);
  return timingSafeEqual(a, b);
}

export async function sessionCookie(env, secure) {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  const value = `${exp}.${await hmac(secret(env), exp)}`;
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure ? "; Secure" : ""}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
