const COOKIE = "gg_session";
const MAX_AGE = 30 * 24 * 60 * 60;
const enc = new TextEncoder();

export async function hmac(secret, message) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 비밀번호가 바뀌면 기존 세션도 모두 무효가 된다
function secret(env) {
  return `${(env.ADMIN_PASSWORD || "").trim()}:${env.SESSION_SECRET || "garmgoon"}`;
}

export function timingSafeEqual(a, b) {
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
  const secTrimmed = secret(env);
  const secRaw = `${env.ADMIN_PASSWORD}:${env.SESSION_SECRET || "garmgoon"}`;
  const [sigTrimmed, sigRaw] = await Promise.all([hmac(secTrimmed, exp), hmac(secRaw, exp)]);
  return timingSafeEqual(sig, sigTrimmed) || timingSafeEqual(sig, sigRaw);
}

export async function checkPassword(env, password) {
  if (!env.ADMIN_PASSWORD || typeof password !== "string") return false;
  // 앞뒤 공백이나 줄바꿈(\r, \n 등 secret 주입 시 포함될 수 있는 문자) 차이 허용
  const expectedRaw = env.ADMIN_PASSWORD;
  const expectedTrimmed = expectedRaw.trim();
  const inputRaw = password;
  const inputTrimmed = password.trim();

  const [aRaw, bRaw, aTrim, bTrim] = await Promise.all([
    hmac("pw", inputRaw),
    hmac("pw", expectedRaw),
    hmac("pw", inputTrimmed),
    hmac("pw", expectedTrimmed),
  ]);
  return timingSafeEqual(aRaw, bRaw) || timingSafeEqual(aTrim, bTrim);
}

export async function sessionCookie(env, secure) {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  const value = `${exp}.${await hmac(secret(env), exp)}`;
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure ? "; Secure" : ""}`;
}

export function clearCookie(secure = false) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure ? "; Secure" : ""}`;
}
