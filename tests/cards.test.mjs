import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./db.mjs";
import worker from "../worker/index.js";
import { sessionCookie } from "../worker/auth.js";
import { isTransientError, selectIdeas, summarizeIdeas } from "../worker/ideas.js";
import { loadPreferences, preferenceBoost, preferencePrompt } from "../worker/prefs.js";
import { fetchRedditRss, rateLimitFrom } from "../worker/reddit.js";
import { localDay, timeZone } from "../worker/util.js";

const DAY = "2026-09-26";

function setup(t, vars = {}) {
  const env = { ...database(), ADMIN_PASSWORD: "pw", FEED_CARDS: "3", ...vars };
  t.after(() => env.sqlite.close());
  return env;
}

let seq = 0;
function addItem(env, { status = "published", score = 6, pick = score, source = "showhn", label = "Show HN", category = "SaaS", kind = null, day = DAY } = {}) {
  const id = ++seq;
  env.sqlite.prepare(`INSERT INTO items (id, url, source, source_label, title, day, collected_at, status, score, pick_score, rank, headline, category, kind, summary, tags)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, '[]', '[]')`)
    .run(id, `https://example.com/${id}`, source, label, `Title ${id}`, day, status, score, status === "scored" ? null : pick, id, `카드 ${id}`, category, kind);
  return id;
}

async function call(env, path, { method = "GET", body, authed = false } = {}) {
  const headers = {};
  if (body) headers["content-type"] = "application/json";
  if (authed) headers.cookie = (await sessionCookie(env, false)).split(";")[0];
  const res = await worker.fetch(new Request(`https://garmgoon.test${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: res.status, data: await res.json() };
}

test("feedback API stores a snapshot, toggles, cancels and rejects bad input", async (t) => {
  const env = setup(t);
  const id = addItem(env, { category: "커머스", kind: "수익 사례" });
  const draft = addItem(env, { status: "scored" });

  assert.equal((await call(env, `/api/p/feedback/${id}`, { method: "PUT", body: { value: 1 } })).status, 401);
  assert.equal((await call(env, `/api/p/feedback/${id}`, { method: "PUT", body: { value: 1 }, authed: true })).status, 200);
  const row = env.sqlite.prepare("SELECT * FROM card_feedback WHERE item_id = ?").get(id);
  assert.equal(row.value, 1);
  assert.equal(row.headline, `카드 ${id}`);
  assert.equal(row.category, "커머스");

  await call(env, `/api/p/feedback/${id}`, { method: "PUT", body: { value: -1 }, authed: true });
  assert.equal(env.sqlite.prepare("SELECT value FROM card_feedback WHERE item_id = ?").get(id).value, -1);

  // 원문 글이 보관 기간 뒤 지워져도 평가 기록은 남는다
  env.sqlite.prepare("DELETE FROM items WHERE id = ?").run(id);
  assert.equal((await loadPreferences(env)).dislikes.length, 1);

  const cancel = addItem(env);
  await call(env, `/api/p/feedback/${cancel}`, { method: "PUT", body: { value: 1 }, authed: true });
  await call(env, `/api/p/feedback/${cancel}`, { method: "PUT", body: { value: 0 }, authed: true });
  assert.equal(env.sqlite.prepare("SELECT COUNT(*) AS n FROM card_feedback WHERE item_id = ?").get(cancel).n, 0);

  assert.equal((await call(env, `/api/p/feedback/${draft}`, { method: "PUT", body: { value: 1 }, authed: true })).status, 404);
  assert.equal((await call(env, `/api/p/feedback/${cancel}`, { method: "PUT", body: { value: 2 }, authed: true })).status, 400);
  assert.equal((await call(env, "/api/p/feedback/abc", { method: "PUT", body: { value: 1 }, authed: true })).status, 405);
});

test("feed shows only the top cards without dislikes; the all view keeps every card", async (t) => {
  const env = setup(t);
  const ids = [9, 8, 7, 6, 5].map((pick) => addItem(env, { pick }));
  env.sqlite.prepare("INSERT INTO card_feedback (item_id, value, source, source_label, headline, created_at, updated_at) VALUES (?, -1, 'showhn', 'Show HN', 'x', 1, 1)").run(ids[0]);

  const feed = await call(env, `/api/ideas?day=${DAY}`);
  assert.equal(feed.data.view, "feed");
  assert.deepEqual(feed.data.cards.map((c) => c.id).sort(), [ids[1], ids[2], ids[3]].sort());
  assert.equal(feed.data.total, 5);
  assert.deepEqual(feed.data.votes, {});
  assert.equal(feed.data.prefs, null);

  const everything = await call(env, `/api/ideas?day=${DAY}&view=all`, { authed: true });
  assert.equal(everything.data.cards.length, 5);
  assert.equal(everything.data.votes[ids[0]], -1);
  assert.equal(everything.data.prefs.dislikes, 1);
});

test("preferences need a few votes, then boost liked sources and categories within bounds", async (t) => {
  const env = setup(t);
  const vote = (value, label, category) => env.sqlite.prepare(
    "INSERT INTO card_feedback (item_id, value, source, source_label, category, headline, created_at, updated_at) VALUES (?, ?, 'reddit', ?, ?, ?, 1, ?)",
  ).run(++seq, value, label, category, `평가 ${seq}`, seq);

  vote(1, "r/SaaS", "SaaS");
  vote(1, "r/SaaS", "SaaS");
  assert.equal(preferenceBoost(await loadPreferences(env), { source_label: "r/SaaS" }), 0);
  assert.equal(preferencePrompt(await loadPreferences(env)), "");

  vote(-1, "GeekNews", "개발");
  const prefs = await loadPreferences(env);
  assert.ok(preferenceBoost(prefs, { source_label: "r/SaaS", category: "SaaS" }) > 0);
  assert.ok(preferenceBoost(prefs, { source_label: "GeekNews", category: "개발" }) < 0);
  assert.equal(preferenceBoost(prefs, { source_label: "Product Hunt" }), 0);
  assert.match(preferencePrompt(prefs), /좋아요:\n- \[SaaS\] 평가/);

  for (let i = 0; i < 200; i++) vote(1, "r/SaaS", "SaaS");
  assert.ok(preferenceBoost(await loadPreferences(env), { source_label: "r/SaaS", category: "SaaS", kind: undefined }) <= 2);
});

test("selection ranks liked sources higher but stores the score without preferences", async (t) => {
  const env = setup(t, { MIN_CARD_SCORE: "5" });
  const day = localDay(timeZone(env));
  for (let i = 0; i < 4; i++) {
    env.sqlite.prepare("INSERT INTO card_feedback (item_id, value, source, source_label, headline, created_at, updated_at) VALUES (?, 1, 'reddit', 'r/SaaS', 'x', 1, 1)").run(1000 + i);
  }
  const plain = addItem(env, { status: "scored", score: 5.5, source: "showhn", label: "Show HN", day });
  const liked = addItem(env, { status: "scored", score: 5.2, source: "reddit", label: "r/SaaS", day });
  const low = addItem(env, { status: "scored", score: 4, source: "showhn", label: "Show HN", day });

  assert.equal(await selectIdeas(env, day), 2);
  const rows = Object.fromEntries(env.sqlite.prepare("SELECT id, status, rank, pick_score FROM items WHERE day = ?").all(day).map((r) => [r.id, r]));
  assert.ok(rows[liked].rank < rows[plain].rank);
  assert.equal(rows[liked].pick_score, 5.2);
  assert.equal(rows[low].status, "skipped");
});

test("Reddit rate-limit headers keep the request gate closed until the window resets", async (t) => {
  const env = setup(t);
  const headers = (remaining, reset) => new Headers({ "x-ratelimit-remaining": remaining, "x-ratelimit-reset": reset, "x-ratelimit-used": "1" });
  assert.equal(rateLimitFrom(new Headers()), null);
  assert.equal(rateLimitFrom(headers("5", "300"), 0).waitUntil, null);
  assert.equal(rateLimitFrom(headers("0.0", "300"), 0).waitUntil, 301_000);

  const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>`;
  t.mock.method(globalThis, "fetch", async () => new Response(xml, { headers: headers("0.0", "900") }));
  const before = Date.now();
  await fetchRedditRss(env, "https://www.reddit.com/r/SaaS/top/.rss?t=week");
  const gate = Number(env.sqlite.prepare("SELECT value FROM state WHERE key = 'reddit:rss:next-request'").get().value);
  assert.ok(gate >= before + 900_000);
  const last = JSON.parse(env.sqlite.prepare("SELECT value FROM state WHERE key = 'reddit:rss:last-result'").get().value);
  assert.equal(last.limit.remaining, 0);
});

test("transient LLM errors are distinguished from content errors", () => {
  assert.equal(isTransientError(Object.assign(new Error("timed out"), { name: "TimeoutError" })), true);
  assert.equal(isTransientError(new TypeError("fetch failed")), true);
  assert.equal(isTransientError(new Error("OpenRouter 429: rate limited")), true);
  assert.equal(isTransientError(new Error("OpenRouter 503: unavailable")), true);
  assert.equal(isTransientError(new Error("OpenRouter 빈 응답 (finish_reason: length)")), true);
  assert.equal(isTransientError(new Error("OpenRouter 400: bad request")), false);
  assert.equal(isTransientError(new Error("JSON 파싱 실패: nope")), false);
  assert.equal(isTransientError(new Error("카드 생성 불완전: 필수 항목 누락")), false);
});

test("card generation keeps retrying through outages but skips repeated content failures", async (t) => {
  const env = setup(t, { OPENROUTER_API_KEY: "test-key" });
  const select = (attempts) => {
    const id = addItem(env, { status: "selected" });
    env.sqlite.prepare("UPDATE items SET attempts = ?, summary = NULL WHERE id = ?").run(attempts, id);
    return id;
  };
  const row = (id) => ({ ...env.sqlite.prepare("SELECT status, attempts FROM items WHERE id = ?").get(id) });
  const outages = (id) => env.sqlite.prepare("SELECT value FROM state WHERE key = ?").get(`card:transient:${id}`)?.value ?? null;
  const respond = (fn) => t.mock.method(globalThis, "fetch", fn);
  const outage = async () => new Response("unavailable", { status: 503 });
  const empty = async () => Response.json({ choices: [{ message: { content: JSON.stringify({ headline: "x", summary: [] }) } }] });
  const ok = async () => Response.json({ choices: [{ message: { content: JSON.stringify({ headline: "카드", summary: ["요약"] }) } }] });

  // Outages are counted apart from content attempts and give up on the eighth one.
  respond(outage);
  const early = select(2);
  await summarizeIdeas(env, DAY);
  assert.deepEqual(row(early), { status: "selected", attempts: 2 });
  assert.equal(outages(early), "1");
  env.sqlite.prepare("INSERT INTO state (key, value, updated_at) VALUES (?, '7', 0) ON CONFLICT(key) DO UPDATE SET value = '7'").run(`card:transient:${early}`);
  await summarizeIdeas(env, DAY);
  assert.deepEqual(row(early), { status: "skipped", attempts: 2 });
  assert.equal(outages(early), null);

  // Two outages, then one content failure, then success: the card is still published.
  const mixed = select(0);
  respond(outage); await summarizeIdeas(env, DAY); await summarizeIdeas(env, DAY);
  respond(empty); await summarizeIdeas(env, DAY);
  assert.deepEqual(row(mixed), { status: "selected", attempts: 1 });
  respond(ok); await summarizeIdeas(env, DAY);
  assert.equal(row(mixed).status, "published");
  assert.equal(outages(mixed), null);

  // Content failures alone are still skipped on the third attempt.
  respond(empty);
  const content = select(2);
  await summarizeIdeas(env, DAY);
  assert.deepEqual(row(content), { status: "skipped", attempts: 3 });
});

test("a stored summary that is not an array is never published", async (t) => {
  const env = setup(t, { OPENROUTER_API_KEY: "test-key" });
  const id = addItem(env, { status: "selected" });
  env.sqlite.prepare("UPDATE items SET attempts = 0, summary = ? WHERE id = ?").run(JSON.stringify({ not: "an array" }), id);
  t.mock.method(globalThis, "fetch", async () => Response.json({ choices: [{ message: { content: JSON.stringify({ headline: "x", summary: [] }) } }] }));
  await summarizeIdeas(env, DAY);
  const stored = env.sqlite.prepare("SELECT status, attempts FROM items WHERE id = ?").get(id);
  assert.deepEqual({ ...stored }, { status: "selected", attempts: 1 });
});
