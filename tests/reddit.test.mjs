import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./db.mjs";
import { parseRedditListing, parseRedditThread, fetchRedditRss, redditContext, discussionFromContext, claimRedditFeed, finishRedditFeed, fetchRedditCandidates } from "../worker/reddit.js";
import { cardFromRow, summarizeIdeas, retryRedditDiscussion, insertItems, collectRedditTop } from "../worker/ideas.js";
import { sourceAvailability } from "../worker/sources.js";

const post = "https://www.reddit.com/r/SideProject/comments/abc123/";
const escape = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const entry = (id, body, url = post) => `<entry><id>${id}</id><title>Project</title><link href="${url}"/><published>2026-09-26T12:00:00Z</published><content type="html">${escape(`<div class="md"><p>${body}</p></div> submitted by /u/person [link] [comments]`)}</content></entry>`;
const feed = (...entries) => `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">${entries.join("")}</feed>`;
const thread = feed(entry("t3_abc123", "A tool for small shops. Revenue claimed by the author: $20."),
  entry("t1_one", "Useful for my shop", post + "title/one/"), entry("t1_two", "Is there a free trial?", post + "title/two/"));

test("feed queue rotates subreddits, prioritizes weekly scans and repeats monthly only after seven days", async (t) => {
  const env = database(); t.after(() => env.sqlite.close());
  const jobs = [];
  for (let i = 0; i < 4; i++) {
    const job = await claimRedditFeed(env, ['A', 'B']);
    jobs.push(`${job.subreddit}:${job.period}`);
    await finishRedditFeed(env, job, 80, 20);
  }
  assert.deepEqual(jobs, ['A:week', 'B:week', 'A:month', 'B:month']);
  assert.equal(await claimRedditFeed(env, ['A', 'B']), null);
  const rows = env.sqlite.prepare('SELECT * FROM reddit_feeds').all();
  for (const row of rows) assert.equal(row.next_at - row.last_success, (row.period === 'week' ? 1 : 7) * 86400000);
  assert.equal(await claimRedditFeed({ ...env, REDDIT_MODE: 'off' }, ['C']), null);
});

test("week and month request Top 100 and preserve older posts within the requested window", async (t) => {
  const env = database(); t.after(() => env.sqlite.close());
  const make = (id, age) => entry(`t3_${id}`, 'Business case', `https://www.reddit.com/r/SideProject/comments/${id}/`)
    .replace('2026-09-26T12:00:00Z', new Date(Date.now() - age * 86400000).toISOString());
  const requested = [];
  t.mock.method(globalThis, 'fetch', async url => {
    requested.push(String(url));
    return new Response(feed(make('five', 5), make('twenty', 20), make('old', 40)));
  });
  assert.equal((await fetchRedditCandidates(env, 'SideProject', 'week')).length, 1);
  env.sqlite.exec("UPDATE state SET value = '0' WHERE key = 'reddit:rss:next-request'");
  assert.equal((await fetchRedditCandidates(env, 'SideProject', 'month')).length, 2);
  assert.ok(requested[0].endsWith('/r/SideProject/top/.rss?t=week&limit=100'));
  assert.ok(requested[1].endsWith('/r/SideProject/top/.rss?t=month&limit=100'));
});

test("post ID ledger deduplicates slug variants and survives content deletion", async (t) => {
  const env = database(); t.after(() => env.sqlite.close());
  const item = { url: post, source: 'reddit', sourceLabel: 'r/SideProject', title: 'Case', snippet: 'body', publishedAt: Date.now(), points: null, comments: null };
  assert.equal(await insertItems(env, [item], () => '2026-09-26'), 1);
  assert.equal(await insertItems(env, [{ ...item, url: post + 'title/' }], () => '2026-09-26'), 0);
  env.sqlite.exec('DELETE FROM items');
  assert.equal(await insertItems(env, [item], () => '2026-09-27'), 0);
  assert.equal(env.sqlite.prepare('SELECT COUNT(*) AS n FROM reddit_seen').get().n, 1);
});

test("queued collection stores older candidates once and does not complete failed feeds", async (t) => {
  const env = database(); t.after(() => env.sqlite.close());
  let fail = false;
  t.mock.method(globalThis, 'fetch', async () => fail ? new Response('limited', { status: 429 }) : new Response(feed(
    entry('t3_newpost', 'Business', 'https://www.reddit.com/r/Entrepreneur/comments/newpost/')
      .replace('2026-09-26T12:00:00Z', new Date(Date.now() - 5 * 86400000).toISOString())
  )));
  assert.match(await collectRedditTop(env, '2026-09-26'), /신규 1건/);
  const row = env.sqlite.prepare("SELECT * FROM items WHERE source='reddit'").get();
  assert.equal(row.day, '2026-09-26');
  assert.equal(row.reddit_post_id, 'newpost');
  assert.equal(await collectRedditTop(env, '2026-09-26'), null);
  env.sqlite.exec("UPDATE state SET value = '0' WHERE key = 'reddit:rss:next-request'");
  fail = true;
  await assert.rejects(collectRedditTop(env, '2026-09-26'), { status: 'rate_limited' });
  assert.equal(env.sqlite.prepare('SELECT COUNT(*) AS n FROM reddit_feeds WHERE last_success IS NOT NULL').get().n, 1);
  assert.equal(await collectRedditTop(env, '2026-09-26'), null);
});

test("RSS mode works without API keys; explicit API mode still needs credentials", () => {
  assert.equal(sourceAvailability({}).reddit, true);
  assert.equal(sourceAvailability({ REDDIT_MODE: "off" }).reddit, false);
  assert.equal(sourceAvailability({ REDDIT_MODE: "api" }).reddit, false);
});

test("listing accepts only approved subreddits and post entries, preserves unknown counts", () => {
  const items = parseRedditListing(feed(entry("t3_abc123", "The actual body"), entry("t3_abc123", "duplicate"),
    entry("t1_comment", "comment"), entry("t3_other", "wrong community", "https://www.reddit.com/r/other/comments/other/")), ["SideProject"]);
  assert.equal(items.length, 1);
  assert.equal(items[0].snippet, "The actual body");
  assert.equal(items[0].url, post);
  assert.equal(items[0].points, null); assert.equal(items[0].comments, null);
});

test("thread separates body and comments, skips deleted/foreign/duplicate comments, caps samples", () => {
  const parsed = parseRedditThread(feed(entry("t3_abc123", "post body"), entry("t1_del", "[deleted]"),
    entry("t1_other", "foreign", "https://www.reddit.com/r/SideProject/comments/other/title/c/"),
    ...Array.from({ length: 40 }, (_, i) => entry(`t1_c${i}`, "comment")), entry("t1_c0", "duplicate")), post);
  assert.equal(parsed.body, "post body"); assert.equal(parsed.comments.length, 30);
  assert.throws(() => parseRedditThread(feed(entry("t3_other", "other")), post));
});

test("429 persists Retry-After, prevents immediate and concurrent followup requests", async (t) => {
  const env = database(); t.after(() => env.sqlite.close()); let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return new Response("limited", { status: 429, headers: { "retry-after": "7200" } }); });
  await assert.rejects(fetchRedditRss(env, post + ".rss"), { status: "rate_limited" });
  await assert.rejects(fetchRedditRss(env, post + ".rss"), { status: "cooldown" });
  assert.equal(calls, 1);
  const next = Number(env.sqlite.prepare("SELECT value FROM state WHERE key = 'reddit:rss:next-request'").get().value);
  assert.ok(next > Date.now() + 7_100_000);
});

test("blocked details retain candidate body and never manufacture comment reactions", async (t) => {
  const env = database(); t.after(() => env.sqlite.close());
  t.mock.method(globalThis, "fetch", async () => new Response("blocked", { status: 403 }));
  const context = await redditContext(env, { id: 1, url: post, snippet: "candidate body" });
  assert.equal(context.status, "blocked"); assert.equal(context.body, "candidate body");
  const publicData = discussionFromContext(context, { positive: ["everyone loves it"] });
  assert.equal(publicData.summary, null); assert.equal(publicData.sampledCount, 0);
  assert.equal("body" in publicData, false);
});

test("diagnostics distinguish network failures from invalid successful responses", async (t) => {
  const env = database(); t.after(() => env.sqlite.close());
  let networkFailure = true;
  t.mock.method(globalThis, "fetch", async () => {
    if (networkFailure) throw new TypeError("network request failed");
    return new Response("<html>Not an Atom feed</html>", { headers: { "content-type": "text/html" } });
  });
  await assert.rejects(fetchRedditRss(env, post + ".rss"), { status: "unavailable" });
  const latest = () => JSON.parse(env.sqlite.prepare("SELECT value FROM state WHERE key = 'reddit:rss:last-result'").get().value);
  assert.equal(latest().phase, "fetch");
  assert.equal(latest().reason, "network request failed");
  assert.equal(latest().httpStatus, null);
  env.sqlite.exec("UPDATE state SET value = '0' WHERE key = 'reddit:rss:next-request'");
  networkFailure = false;
  await assert.rejects(fetchRedditRss(env, post + ".rss"), { status: "unavailable" });
  assert.equal(latest().phase, "validate");
  assert.equal(latest().httpStatus, 200);
  assert.equal(latest().contentType, "text/html");
  assert.equal(latest().reason, "Invalid RSS response");
});

test("cached snapshot is reused for AI retries without another Reddit request", async (t) => {
  t.mock.method(globalThis, "fetch", () => { throw new Error("must not fetch"); });
  const snapshot = { body: "body", comments: [], status: "empty" };
  assert.deepEqual(await redditContext({}, { reddit_context: JSON.stringify(snapshot) }), snapshot);
});

function publishedFailure(env) {
  const context = { body: "candidate", comments: [], status: "blocked", retryAt: 1, bodyBasis: "listing" };
  env.sqlite.prepare(`INSERT INTO items(url, source, source_label, title, snippet, collected_at, day, status, headline, summary, reddit_context, discussion)
    VALUES (?, 'reddit', 'r/SideProject', 'Original', 'candidate', ?, '2026-09-26', 'published', 'Keep headline', '["Keep summary"]', ?, ?)`)
    .run(post, Date.now(), JSON.stringify(context), JSON.stringify(discussionFromContext(context)));
}

test("failed cache waits until retryAt then retries", async (t) => {
  const env = database(); t.after(() => env.sqlite.close());
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return new Response(thread); });
  const cached = { body: "candidate", comments: [], status: "blocked", retryAt: Date.now() + 60_000 };
  const item = { id: 1, url: post, snippet: "candidate", reddit_context: JSON.stringify(cached) };
  assert.equal((await redditContext(env, item)).status, "blocked");
  assert.equal(calls, 0);
  item.reddit_context = JSON.stringify({ ...cached, retryAt: 1 });
  assert.equal((await redditContext(env, item)).status, "sampled");
  assert.equal(calls, 1);
});

test("published repair preserves original card and stops on success", async (t) => {
  const env = database(); t.after(() => env.sqlite.close()); publishedFailure(env);
  t.mock.method(globalThis, "fetch", async () => new Response(thread));
  assert.equal(await retryRedditDiscussion(env), 1);
  const row = env.sqlite.prepare("SELECT * FROM items").get();
  assert.equal(row.status, "published");
  assert.equal(row.headline, "Keep headline");
  assert.deepEqual(JSON.parse(row.summary), ["Keep summary"]);
  assert.equal(JSON.parse(row.discussion).sampledCount, 2);
  assert.equal(await retryRedditDiscussion(env), 0);
});

test("repair honors off mode, shared gate and three-attempt limit", async (t) => {
  const env = database(); t.after(() => env.sqlite.close()); publishedFailure(env);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return new Response("blocked", { status: 403 }); });
  env.REDDIT_MODE = "off";
  assert.equal(await retryRedditDiscussion(env), 0);
  env.REDDIT_MODE = "rss";
  env.sqlite.prepare("INSERT INTO state(key, value, updated_at) VALUES ('reddit:rss:next-request', ?, ?)").run(String(Date.now() + 60_000), Date.now());
  assert.equal(await retryRedditDiscussion(env), 0);
  assert.equal(calls, 0);
  env.sqlite.exec("UPDATE state SET value = '0'");
  for (let i = 0; i < 3; i++) {
    assert.equal(await retryRedditDiscussion(env), 1);
    assert.equal(await retryRedditDiscussion(env), 0);
    env.sqlite.exec(`UPDATE state SET value = '0' WHERE key = 'reddit:rss:next-request';
      UPDATE items SET discussion = json_set(discussion, '$.retryAt', 1), reddit_context = json_set(reddit_context, '$.retryAt', 1)`);
  }
  assert.equal(await retryRedditDiscussion(env), 0);
  assert.equal(calls, 3);
});

test("AI repair retry reuses the RSS snapshot", async (t) => {
  const env = database(); env.OPENROUTER_API_KEY = "test-key";
  t.after(() => env.sqlite.close()); publishedFailure(env);
  let rssCalls = 0; let aiFails = true;
  t.mock.method(globalThis, "fetch", async (url) => {
    if (String(url).includes("reddit.com")) { rssCalls++; return new Response(thread); }
    if (aiFails) throw new Error("AI temporarily unavailable");
    return Response.json({ choices: [{ message: { content: JSON.stringify({ reactions: { positive: ["Useful"], concerns: [], questions: [] } }) } }] });
  });
  assert.equal(await retryRedditDiscussion(env), 1);
  env.sqlite.exec(`UPDATE state SET value = '0' WHERE key = 'reddit:rss:next-request';
    UPDATE items SET discussion = json_set(discussion, '$.retryAt', 1)`);
  aiFails = false;
  assert.equal(await retryRedditDiscussion(env), 1);
  assert.equal(rssCalls, 1);
  const row = env.sqlite.prepare("SELECT * FROM items").get();
  assert.deepEqual(JSON.parse(row.discussion).summary.positive, ["Useful"]);
  assert.equal(JSON.parse(row.reddit_context).repairAttempts, 2);
});

test("pipeline requests details for one Reddit item, queues the rest for repair and keeps raw text private", async (t) => {
  const env = database(); env.OPENROUTER_API_KEY = "test-key"; t.after(() => env.sqlite.close());
  const insert = env.sqlite.prepare("INSERT INTO items(url,source,source_label,title,snippet,collected_at,day,status,rank) VALUES(?,?,?,?,?,?,'2026-09-26','selected',?)");
  insert.run(post, "reddit", "r/SideProject", "First", "candidate", Date.now(), 1);
  insert.run("https://www.reddit.com/r/SideProject/comments/second/", "reddit", "r/SideProject", "Second", "candidate", Date.now(), 2);
  let redditCalls = 0;
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (String(url).includes("reddit.com")) { redditCalls++; return new Response(thread); }
    const request = JSON.parse(init.body);
    if (request.messages[1].content.includes("제목: Second")) {
      assert.match(request.messages[1].content, /댓글 수집 상태: queued/);
      return Response.json({ choices: [{ message: { content: JSON.stringify({ headline: "Second", summary: ["Listing summary"] }) } }] });
    }
    assert.match(request.messages[1].content, /Useful for my shop/);
    assert.match(request.messages[1].content, /A tool for small shops/);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ headline: "Test", summary: ["Body summary"],
      reactions: { positive: ["Useful"], concerns: [], questions: ["Free trial?"] } }) } }] });
  });
  assert.equal(await summarizeIdeas(env, "2026-09-26"), 2); assert.equal(redditCalls, 1);
  const rows = env.sqlite.prepare("SELECT * FROM items ORDER BY rank").all();
  assert.equal(rows[0].status, "published"); assert.equal(rows[1].status, "published");
  const queued = cardFromRow(rows[1]).discussion;
  assert.equal(queued.status, "queued"); assert.equal(queued.summary, null); assert.ok(queued.retryAt <= Date.now());

  // The queued card is repaired later through the shared request gate.
  env.sqlite.prepare("DELETE FROM state WHERE key = 'reddit:rss:next-request'").run();
  assert.equal(await retryRedditDiscussion(env), 1); assert.equal(redditCalls, 2);
  const card = cardFromRow(rows[0]);
  assert.equal(card.discussion.sampledCount, 2);
  assert.deepEqual(card.discussion.summary.questions, ["Free trial?"]);
  assert.equal(card.comments, null);
  assert.equal("reddit_context" in card, false);
  assert.equal(JSON.stringify(card).includes("Useful for my shop"), false);
});
