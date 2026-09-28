import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./db.mjs";
import worker from "../worker/index.js";
import { sessionCookie } from "../worker/auth.js";
import { nextOccurrence, occursOn } from "../worker/board.js";
import { lunarAnniversary, lunarToSolar, solarToLunar } from "../worker/lunar.js";
import { b64u, fromB64u, sendDigests } from "../worker/push.js";
import { localParts } from "../worker/util.js";

const ORIGIN = "https://garmgoon.test";
const enc = new TextEncoder();

// 테스트용 VAPID 키 (scripts/vapid-keys.mjs와 같은 방식)
async function vapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return {
    VAPID_PUBLIC_KEY: b64u(await crypto.subtle.exportKey("raw", pair.publicKey)),
    VAPID_PRIVATE_KEY: (await crypto.subtle.exportKey("jwk", pair.privateKey)).d,
  };
}

async function setup(t) {
  const env = { ...database(), ADMIN_PASSWORD: "adminpw", ...(await vapidKeys()) };
  // 푸시 서버로 나가는 요청을 가로채 기록한다
  const realFetch = globalThis.fetch;
  env.pushed = [];
  env.pushStatus = 201;
  globalThis.fetch = async (url, init) => {
    env.pushed.push({ url: String(url), init });
    return new Response(null, { status: env.pushStatus });
  };
  t.after(() => {
    globalThis.fetch = realFetch;
    env.sqlite.close();
  });
  return env;
}

async function call(env, path, { method = "GET", body, cookie } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const pending = [];
  const res = await worker.fetch(
    new Request(`${ORIGIN}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }),
    env,
    { waitUntil: (p) => pending.push(p) },
  );
  await Promise.all(pending);
  return { res, status: res.status, data: await res.json().catch(() => null) };
}

async function members(env, ...names) {
  const admin = (await sessionCookie(env, false)).split(";")[0];
  const out = [];
  for (const name of names) {
    const { data } = await call(env, "/api/p/family", { method: "POST", cookie: admin, body: { name, password: "1234" } });
    const login = await call(env, "/api/family/login", { method: "POST", body: { memberId: data.member.id, password: "1234" } });
    out.push({ ...data.member, cookie: login.res.headers.get("set-cookie").split(";")[0] });
  }
  return out;
}

// 브라우저 쪽에서 받은 푸시를 푸는 과정 (RFC 8291)
async function browserSubscription() {
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const hkdf = async (salt, ikm, info, len) =>
    new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), len * 8));
  return {
    json: (endpoint) => ({ endpoint, keys: { p256dh: b64u(pub), auth: b64u(auth) } }),
    async decrypt(body) {
      const bytes = new Uint8Array(body);
      const salt = bytes.slice(0, 16);
      const asPublic = bytes.slice(21, 21 + bytes[20]);
      const asKey = await crypto.subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
      const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, pair.privateKey, 256));
      const info = new Uint8Array([...enc.encode("WebPush: info\0"), ...pub, ...asPublic]);
      const ikm = await hkdf(auth, shared, info, 32);
      const key = await crypto.subtle.importKey("raw", await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16), "AES-GCM", false, ["decrypt"]);
      const iv = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
      const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, bytes.slice(21 + bytes[20])));
      assert.equal(plain[plain.length - 1], 2);
      return JSON.parse(new TextDecoder().decode(plain.slice(0, -1)));
    },
  };
}

test("repeat rules: weekly, biweekly, monthly (short months use the last day)", () => {
  const weekly = { repeat: "weekly", weekdays: "[1,4]", start_day: "2026-09-28", end_day: "2026-10-31" };
  assert.equal(occursOn(weekly, "2026-09-28"), true); // 월
  assert.equal(occursOn(weekly, "2026-10-01"), true); // 목
  assert.equal(occursOn(weekly, "2026-09-29"), false);
  assert.equal(occursOn(weekly, "2026-09-24"), false); // 시작 전
  assert.equal(occursOn(weekly, "2026-11-02"), false); // 끝난 뒤

  const biweekly = { repeat: "biweekly", weekdays: "[6]", start_day: "2026-09-30" };
  assert.equal(occursOn(biweekly, "2026-10-03"), true);
  assert.equal(occursOn(biweekly, "2026-10-10"), false);
  assert.equal(occursOn(biweekly, "2026-10-17"), true);

  const monthly = { repeat: "monthly", month_day: 31, start_day: "2026-01-31" };
  assert.equal(occursOn(monthly, "2026-02-28"), true);
  assert.equal(occursOn(monthly, "2026-04-30"), true);
  assert.equal(occursOn(monthly, "2026-05-31"), true);
  assert.equal(occursOn(monthly, "2026-05-30"), false);

  assert.equal(occursOn({ repeat: "none", start_day: "2026-10-05" }, "2026-10-05"), true);
});

test("Korean lunar calendar conversions", () => {
  assert.equal(lunarToSolar(2026, 1, 1), "2026-02-17"); // 설날
  assert.equal(lunarToSolar(2026, 8, 15), "2026-09-25"); // 추석
  assert.equal(lunarToSolar(2027, 1, 1), "2027-02-07"); // 중국(2/6)과 다른 해
  assert.equal(lunarToSolar(2025, 6, 1, true), "2025-07-25"); // 윤6월
  assert.deepEqual(solarToLunar("2023-03-22"), { year: 2023, month: 2, day: 1, leap: true });
  // 음력 30일이 없는 달은 29일로 지낸다
  const noThirtieth = [2026, 2027, 2028].flatMap((y) => [...Array(12)].map((_, i) => [y, i + 1])).find(([y, m]) => !lunarToSolar(y, m, 30));
  assert.equal(lunarAnniversary(noThirtieth[0], noThirtieth[1], 30), lunarToSolar(noThirtieth[0], noThirtieth[1], 29));

  const chuseok = { calendar: "lunar", month: 8, day: 15 };
  assert.equal(nextOccurrence(chuseok, "2026-09-01"), "2026-09-25");
  assert.equal(nextOccurrence(chuseok, "2026-09-26"), "2027-09-15");
  // 양력 2월 29일은 평년에 2월 28일
  assert.equal(nextOccurrence({ calendar: "solar", month: 2, day: 29 }, "2027-01-01"), "2027-02-28");
  // 음력 12월 기념일은 이듬해 양력 1~2월에 온다
  assert.equal(nextOccurrence({ calendar: "lunar", month: 12, day: 1 }, "2026-10-01"), lunarToSolar(2026, 12, 1));
});

test("week view: family and private tasks, done marks, overdue, lunar birthday", async (t) => {
  const env = await setup(t);
  const [mom, dad] = await members(env, "엄마", "아빠");

  const trash = await call(env, "/api/family/board/tasks", {
    method: "POST",
    cookie: mom.cookie,
    body: { title: "분리수거", visibility: "family", assigneeId: dad.id, repeat: "weekly", weekdays: [1, 4], startDay: "2026-09-01" },
  });
  assert.equal(trash.status, 200, JSON.stringify(trash.data));
  await call(env, "/api/family/board/tasks", { method: "POST", cookie: mom.cookie, body: { title: "비밀 선물 사기", visibility: "private", repeat: "none", startDay: "2026-09-30" } });
  const noDays = await call(env, "/api/family/board/tasks", { method: "POST", cookie: mom.cookie, body: { title: "x", visibility: "family", repeat: "weekly", weekdays: [], startDay: "2026-09-01" } });
  assert.equal(noDays.status, 400);

  await call(env, "/api/family/board/dates", {
    method: "POST",
    cookie: mom.cookie,
    body: { title: "할머니 생신", kind: "birthday", calendar: "lunar", month: 8, day: 20, year: 1950, visibility: "family" },
  });

  const week = (cookie) => call(env, "/api/family/board/week?start=2026-09-28&today=2026-10-01", { cookie });
  const dadWeek = await week(dad.cookie);
  assert.deepEqual(dadWeek.data.tasks.map((x) => x.title), ["분리수거"]);
  assert.deepEqual(dadWeek.data.days.filter((d) => d.items.length).map((d) => d.day), ["2026-09-28", "2026-10-01"]);
  // 음력 8월 20일 = 2026-09-30, 1950년생이라 76번째 생일
  const bday = dadWeek.data.days.find((d) => d.dates.length);
  assert.equal(bday.day, "2026-09-30");
  assert.equal(bday.dates[0].count, 76);
  // 오늘(10/1) 기준 지난 7일 중 못 한 분리수거: 9/24, 9/28
  assert.deepEqual(dadWeek.data.overdue.map((o) => o.day), ["2026-09-24", "2026-09-28"]);

  const momWeek = await week(mom.cookie);
  assert.equal(momWeek.data.tasks.length, 2);

  // 완료 표시는 그날 할 일일 때만
  const id = trash.data.task.id;
  assert.equal((await call(env, `/api/family/board/tasks/${id}/done`, { method: "PUT", cookie: dad.cookie, body: { day: "2026-09-29", done: true } })).status, 400);
  await call(env, `/api/family/board/tasks/${id}/done`, { method: "PUT", cookie: dad.cookie, body: { day: "2026-09-28", done: true } });
  const after = await week(mom.cookie);
  assert.equal(after.data.days[0].items[0].done.memberId, dad.id);
  // 엄마에게는 엄마의 비공개 할 일(9/30)도 밀린 일로 보인다
  assert.deepEqual(after.data.overdue.map((o) => o.day), ["2026-09-24", "2026-09-30"]);

  // 다른 사람이 가족 할 일을 비공개로 가져갈 수 없다
  const steal = await call(env, `/api/family/board/tasks/${id}`, { method: "PATCH", cookie: dad.cookie, body: { visibility: "private" } });
  assert.equal(steal.status, 403);
  const edit = await call(env, `/api/family/board/tasks/${id}`, { method: "PATCH", cookie: dad.cookie, body: { title: "분리수거·음식물" } });
  assert.equal(edit.data.task.title, "분리수거·음식물");
});

test("notes keep history; private notes stay private", async (t) => {
  const env = await setup(t);
  const [mom, dad] = await members(env, "엄마", "아빠");
  const note = await call(env, "/api/family/board/notes", { method: "POST", cookie: mom.cookie, body: { title: "소아과", body: "02-123-4567", category: "contact", visibility: "family" } });
  await call(env, "/api/family/board/notes", { method: "POST", cookie: mom.cookie, body: { title: "비밀 메모", body: "", category: "etc", visibility: "private" } });
  const id = note.data.note.id;

  await call(env, `/api/family/board/notes/${id}`, { method: "PATCH", cookie: dad.cookie, body: { body: "02-123-9999 (진료 9시~)" } });
  await call(env, `/api/family/board/notes/${id}`, { method: "PATCH", cookie: dad.cookie, body: { pinned: true } });
  const list = await call(env, "/api/family/board/notes", { cookie: dad.cookie });
  assert.deepEqual(list.data.notes.map((n) => [n.title, n.pinned, n.updatedBy]), [["소아과", true, dad.id]]);
  const history = await call(env, `/api/family/board/notes/${id}/history`, { cookie: mom.cookie });
  // 고정만 바꾼 것은 기록하지 않는다
  assert.deepEqual(history.data.history.map((h) => h.body), ["02-123-4567"]);

  for (let i = 0; i < 12; i++) await call(env, `/api/family/board/notes/${id}`, { method: "PATCH", cookie: mom.cookie, body: { body: `v${i}` } });
  assert.equal((await call(env, `/api/family/board/notes/${id}/history`, { cookie: mom.cookie })).data.history.length, 10);
});

test("web push: encrypted payloads, VAPID signature, post and comment alerts", async (t) => {
  const env = await setup(t);
  const [mom, dad] = await members(env, "엄마", "아빠");
  const dadDevice = await browserSubscription();
  const momDevice = await browserSubscription();

  const evil = await call(env, "/api/family/push/subscribe", { method: "POST", cookie: dad.cookie, body: { ...dadDevice.json("https://evil.example/push"), tz: "Asia/Seoul" } });
  assert.equal(evil.status, 400);
  await call(env, "/api/family/push/subscribe", { method: "POST", cookie: dad.cookie, body: { ...dadDevice.json("https://fcm.googleapis.com/fcm/send/dad"), tz: "Asia/Seoul" } });
  await call(env, "/api/family/push/subscribe", { method: "POST", cookie: mom.cookie, body: { ...momDevice.json("https://web.push.apple.com/mom"), tz: "America/Denver" } });

  const testPush = await call(env, "/api/family/push/test", { method: "POST", cookie: dad.cookie });
  assert.deepEqual(testPush.data, { sent: 1, total: 1 });
  const req = env.pushed.pop();
  assert.equal(req.url, "https://fcm.googleapis.com/fcm/send/dad");
  assert.equal(req.init.headers["content-encoding"], "aes128gcm");
  assert.equal((await dadDevice.decrypt(req.init.body)).title, "🔔 알림 테스트");

  // VAPID JWT: 푸시 서버 주소가 aud이고, 공개키로 서명이 확인된다
  const [, jwt, k] = req.init.headers.authorization.match(/^vapid t=([^,]+), k=(.+)$/);
  const [h, p, s] = jwt.split(".");
  assert.equal(JSON.parse(new TextDecoder().decode(fromB64u(p))).aud, "https://fcm.googleapis.com");
  const pub = await crypto.subtle.importKey("raw", fromB64u(k), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  assert.equal(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, fromB64u(s), enc.encode(`${h}.${p}`)), true);

  // 엄마가 가족 글을 쓰면 아빠에게만, 비공개 글은 아무에게도 가지 않는다
  const post = await call(env, "/api/family/posts", { method: "POST", cookie: mom.cookie, body: { kind: "message", visibility: "family", body: "오늘 저녁은 김치찌개" } });
  assert.equal(env.pushed.length, 1);
  const alert = await dadDevice.decrypt(env.pushed.pop().init.body);
  assert.equal(alert.body, "오늘 저녁은 김치찌개");
  assert.match(alert.title, /엄마 · 새 메시지/);
  await call(env, "/api/family/posts", { method: "POST", cookie: mom.cookie, body: { kind: "diary", visibility: "private", diaryDay: "2026-09-28", body: "비밀" } });
  assert.equal(env.pushed.length, 0);

  // 아빠 댓글 → 엄마에게
  await call(env, `/api/family/posts/${post.data.post.id}/comments`, { method: "POST", cookie: dad.cookie, body: { body: "좋아!" } });
  const commentAlert = env.pushed.pop();
  assert.equal(commentAlert.url, "https://web.push.apple.com/mom");
  assert.equal((await momDevice.decrypt(commentAlert.init.body)).body, "좋아!");

  // 새 글 알림을 끄면 오지 않는다
  await call(env, "/api/family/push/settings", { method: "PATCH", cookie: dad.cookie, body: { notifyPosts: false } });
  await call(env, "/api/family/posts", { method: "POST", cookie: mom.cookie, body: { kind: "message", visibility: "family", body: "또 글" } });
  assert.equal(env.pushed.length, 0);

  // 브라우저가 구독을 끊었으면(410) 지운다
  env.pushStatus = 410;
  await call(env, "/api/family/push/test", { method: "POST", cookie: mom.cookie });
  assert.equal(env.sqlite.prepare("SELECT COUNT(*) AS n FROM family_push WHERE member_id = ?").get(mom.id).n, 0);
});

test("morning digest goes out once a day with today's tasks and upcoming dates", async (t) => {
  const env = await setup(t);
  const [mom] = await members(env, "엄마");
  const device = await browserSubscription();
  const { day, hour } = localParts("UTC");
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  await call(env, "/api/family/push/settings", { method: "PATCH", cookie: mom.cookie, body: { notifyHour: hour } });
  await call(env, "/api/family/push/subscribe", { method: "POST", cookie: mom.cookie, body: { ...device.json("https://fcm.googleapis.com/fcm/send/mom"), tz: "UTC" } });
  // 구독한 시각이 이미 요약 시각이면 오늘 치는 건너뛴다
  assert.equal(await sendDigests(env), 0);
  env.sqlite.prepare("UPDATE family_push SET last_day = NULL").run();

  // 할 일도 기념일도 없으면 보내지 않는다
  assert.equal(await sendDigests(env), 0);
  env.sqlite.prepare("UPDATE family_push SET last_day = NULL").run();

  await call(env, "/api/family/board/tasks", { method: "POST", cookie: mom.cookie, body: { title: "약 먹기", visibility: "private", repeat: "weekly", weekdays: [weekday], startDay: day } });
  const [, m, d] = day.split("-").map(Number);
  await call(env, "/api/family/board/dates", { method: "POST", cookie: mom.cookie, body: { title: "결혼기념일", kind: "anniversary", calendar: "solar", month: m, day: d, visibility: "family" } });
  assert.equal(await sendDigests(env), 1);
  const payload = await device.decrypt(env.pushed.pop().init.body);
  assert.equal(payload.title, "📌 오늘 우리집");
  assert.match(payload.body, /할 일 1개: 약 먹기/);
  assert.match(payload.body, /💍 결혼기념일 오늘!/);
  assert.equal(await sendDigests(env), 0);
});

test("deleting a member removes their private board items and devices", async (t) => {
  const env = await setup(t);
  const [mom, dad] = await members(env, "엄마", "아빠");
  await call(env, "/api/family/board/tasks", { method: "POST", cookie: dad.cookie, body: { title: "비밀", visibility: "private", repeat: "none", startDay: "2026-10-01" } });
  await call(env, "/api/family/board/tasks", { method: "POST", cookie: mom.cookie, body: { title: "청소", visibility: "family", assigneeId: dad.id, repeat: "none", startDay: "2026-10-01" } });
  const admin = (await sessionCookie(env, false)).split(";")[0];
  await call(env, `/api/p/family/${dad.id}`, { method: "DELETE", cookie: admin });
  const rows = env.sqlite.prepare("SELECT title, assignee_id FROM family_tasks").all();
  assert.deepEqual(rows.map((r) => [r.title, r.assignee_id]), [["청소", null]]);
});
