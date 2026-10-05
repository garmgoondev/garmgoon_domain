import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./db.mjs";
import worker from "../worker/index.js";
import { checkPassword, clearCookie, isAuthed, sessionCookie } from "../worker/auth.js";

function setup(t, vars = {}) {
  const env = { ...database(), ADMIN_PASSWORD: "localtest", ...vars };
  t.after(() => env.sqlite.close());
  return env;
}

test("checkPassword tolerates trailing whitespace/newlines from secrets or input", async (t) => {
  const env = setup(t);

  // 정확히 일치
  assert.equal(await checkPassword(env, "localtest"), true);

  // 사용자가 앞뒤 공백을 입력한 경우
  assert.equal(await checkPassword(env, "  localtest  "), true);

  // Cloudflare secret이나 터미널 파이프에서 줄바꿈이 딸려 들어간 경우
  const envWithNewline = { ...env, ADMIN_PASSWORD: "localtest\r\n" };
  assert.equal(await checkPassword(envWithNewline, "localtest"), true);
  assert.equal(await checkPassword(envWithNewline, "localtest "), true);

  // 틀린 비밀번호
  assert.equal(await checkPassword(env, "wrongpw"), false);
  assert.equal(await checkPassword(env, ""), false);
  assert.equal(await checkPassword({ ...env, ADMIN_PASSWORD: "" }, "localtest"), false);
});

test("isAuthed validates valid session and rejects expired or tampered session", async (t) => {
  const env = setup(t);

  const cookieStr = await sessionCookie(env, false);
  const req = new Request("https://garmgoon.test/api/me", {
    headers: { cookie: cookieStr.split(";")[0] },
  });
  assert.equal(await isAuthed(req, env), true);

  // 쿠키 변조 시 거절
  const tamperedReq = new Request("https://garmgoon.test/api/me", {
    headers: { cookie: "gg_session=9999999999.invalid_signature" },
  });
  assert.equal(await isAuthed(tamperedReq, env), false);

  // 쿠키 없음
  const emptyReq = new Request("https://garmgoon.test/api/me");
  assert.equal(await isAuthed(emptyReq, env), false);
});

test("login and logout API flows", async (t) => {
  const env = setup(t);

  // /api/me 미로그인
  const meRes = await worker.fetch(new Request("https://garmgoon.test/api/me"), env);
  const meData = await meRes.json();
  assert.equal(meData.authed, false);
  assert.equal(meData.hasAdminPassword, true);

  // 잘못된 비밀번호로 로그인 실패
  const badLogin = await worker.fetch(
    new Request("https://garmgoon.test/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    }),
    env
  );
  assert.equal(badLogin.status, 401);

  // 올바른 비밀번호로 로그인 성공
  const goodLogin = await worker.fetch(
    new Request("https://garmgoon.test/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "localtest" }),
    }),
    env
  );
  assert.equal(goodLogin.status, 200);
  const setCookie = goodLogin.headers.get("set-cookie");
  assert.ok(setCookie && setCookie.includes("gg_session="));

  // 로그인 상태에서 /api/me
  const authedMeRes = await worker.fetch(
    new Request("https://garmgoon.test/api/me", {
      headers: { cookie: setCookie.split(";")[0] },
    }),
    env
  );
  assert.equal((await authedMeRes.json()).authed, true);

  // POST /api/logout 호출 시 쿠키 삭제
  const logoutRes = await worker.fetch(
    new Request("https://garmgoon.test/api/logout", {
      method: "POST",
    }),
    env
  );
  assert.equal(logoutRes.status, 200);
  const logoutCookie = logoutRes.headers.get("set-cookie");
  assert.ok(logoutCookie.includes("Max-Age=0"));

  // GET /api/logout 호출 시 쿠키 삭제 및 302 리다이렉트
  const getLogoutRes = await worker.fetch(new Request("https://garmgoon.test/api/logout"), env);
  assert.equal(getLogoutRes.status, 302);
  assert.equal(getLogoutRes.headers.get("location"), "https://garmgoon.test/");
  assert.ok(getLogoutRes.headers.get("set-cookie").includes("Max-Age=0"));
});

test("private pages redirect to login when unauthenticated", async (t) => {
  const env = setup(t, {
    ASSETS: { fetch: async () => new Response("ok") },
  });

  const toolsRes = await worker.fetch(new Request("https://garmgoon.test/tools"), env);
  assert.equal(toolsRes.status, 302);
  assert.equal(toolsRes.headers.get("location"), "https://garmgoon.test/login?next=%2Ftools");

  const scrapRes = await worker.fetch(new Request("https://garmgoon.test/scrap"), env);
  assert.equal(scrapRes.status, 302);
  assert.equal(scrapRes.headers.get("location"), "https://garmgoon.test/login?next=%2Fscrap");

  const automationsRes = await worker.fetch(new Request("https://garmgoon.test/automations"), env);
  assert.equal(automationsRes.status, 302);
  assert.equal(automationsRes.headers.get("location"), "https://garmgoon.test/login?next=%2Fautomations");
});
