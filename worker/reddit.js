import { feedTag, parseFeed } from "./feed.js";
import { decodeEntities, getState, HOUR, DAY, setState, stripHtml } from "./util.js";

const GATE = "reddit:rss:next-request";
const UA = "garmgoon-dashboard/1.0 (+https://garmgoon.com; public RSS reader)";
const MAX_COMMENTS = 30;
// 요청 사이 최소 간격. 크론은 10분마다 한 단계만 돌지만 수동 실행이 겹칠 때를 대비한다.
const MIN_GAP = 2 * 60_000;

// Reddit이 알려 주는 남은 요청 수와 초기화까지 남은 초. 남은 요청이 없으면 초기화 뒤로 미룬다.
export function rateLimitFrom(headers, now = Date.now()) {
  const remaining = Number.parseFloat(headers.get("x-ratelimit-remaining"));
  const reset = Number.parseFloat(headers.get("x-ratelimit-reset"));
  const used = Number.parseFloat(headers.get("x-ratelimit-used"));
  if (!Number.isFinite(remaining) || !Number.isFinite(reset)) return null;
  return { remaining, reset, used: Number.isFinite(used) ? used : null,
    waitUntil: remaining < 1 ? now + Math.min(reset, 3600) * 1000 + 1000 : null };
}

export function redditMode(env) {
  return env.REDDIT_MODE || (env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET ? "api" : "rss");
}

export function redditPostUrl(value) {
  try {
    const url = new URL(value);
    if (!/^(www\.|old\.)?reddit\.com$/i.test(url.hostname)) return null;
    const match = url.pathname.match(/^\/r\/([a-z0-9_]+)\/comments\/([a-z0-9]+)(?:\/|$)/i);
    if (!match) return null;
    return { url: `https://www.reddit.com/r/${match[1]}/comments/${match[2]}/`, sub: match[1], id: match[2].toLowerCase() };
  } catch { return null; }
}

function content(entry) {
  const html = decodeEntities(feedTag(entry.block, "content"));
  const body = html.match(/<div\b[^>]*class=["'][^"']*\bmd\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
  const text = stripHtml(body ?? html)
    .replace(/\s*submitted by\s[\s\S]*$/i, "")
    .replace(/\s*\[link\]\s*\[comments\]\s*$/i, "").trim();
  return /^\[(?:removed|deleted)\]$/i.test(text) ? "" : text;
}

export function parseRedditListing(xml, allowedSubs) {
  const allowed = new Set(allowedSubs.map((s) => s.toLowerCase()));
  const seen = new Set();
  return parseFeed(xml).flatMap((entry) => {
    const post = redditPostUrl(entry.url);
    const id = feedTag(entry.block, "id").trim();
    if (!post || !allowed.has(post.sub.toLowerCase()) || id !== `t3_${post.id}` || seen.has(post.id)) return [];
    seen.add(post.id);
    return [{ title: entry.title, url: post.url, snippet: content(entry).slice(0, 6000),
      publishedAt: entry.publishedAt, points: null, comments: null, label: `r/${post.sub}` }];
  });
}

export function parseRedditThread(xml, postUrl) {
  const post = redditPostUrl(postUrl);
  if (!post) throw new Error("Invalid Reddit post URL");
  const entries = parseFeed(xml);
  const root = entries.find((entry) => feedTag(entry.block, "id").trim() === `t3_${post.id}`);
  if (!root) throw new Error("Reddit RSS did not contain the requested post");
  const seen = new Set();
  const comments = [];
  for (const entry of entries) {
    const id = feedTag(entry.block, "id").trim();
    if (!/^t1_[a-z0-9]+$/i.test(id) || seen.has(id) || redditPostUrl(entry.url)?.id !== post.id) continue;
    seen.add(id);
    const text = content(entry);
    if (text && comments.length < MAX_COMMENTS) comments.push({ text: text.slice(0, 1200), url: entry.url });
  }
  return { body: content(root).slice(0, 12000), comments };
}

function unavailable(status, retryAt, httpStatus = null) {
  return Object.assign(new Error(`Reddit RSS: ${status}`), { status, retryAt, httpStatus });
}

// Atomic request gate shared by cron and manual runs. Never change IPs/hosts on a block.
export async function fetchRedditRss(env, url) {
  const now = Date.now();
  const next = now + MIN_GAP;
  const claimed = await env.DB.prepare(
    "INSERT INTO state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at WHERE CAST(state.value AS INTEGER) <= ? RETURNING value",
  ).bind(GATE, String(next), now, now).first();
  if (!claimed) throw unavailable("cooldown", Number(await getState(env, GATE)) || next);
  let httpStatus = null;
  let contentType = null;
  let limit = null;
  let phase = "fetch";
  try {
    const response = await fetch(url, { headers: { "user-agent": UA, accept: "application/atom+xml, application/rss+xml" },
      // workerd rejects redirect:"error" before making any network request.
      // Manual mode exposes 3xx as failures without following another host.
      redirect: "manual", signal: AbortSignal.timeout(12000) });
    httpStatus = response.status;
    contentType = response.headers.get("content-type");
    limit = rateLimitFrom(response.headers, now);
    // Leave the gate closed until Reddit's own window resets, before a 429 happens.
    if (limit?.waitUntil > next) await setState(env, GATE, limit.waitUntil);
    if (!response.ok) {
      const retry = response.headers.get("retry-after");
      const retryMs = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - now) : 0;
      const pause = Math.max(response.status === 429 || response.status === 403 ? HOUR : 10 * 60_000, Number.isFinite(retryMs) ? retryMs : 0,
        limit?.waitUntil ? limit.waitUntil - now : 0);
      const retryAt = now + pause;
      await setState(env, GATE, retryAt);
      await setState(env, "reddit:rss:last-result", JSON.stringify({ status: response.status === 429 ? "rate_limited" : response.status === 403 ? "blocked" : "unavailable", httpStatus, contentType, limit, phase: "http", reason: `HTTP ${httpStatus}`, checkedAt: now, retryAt }));
      response.body?.cancel().catch(() => {});
      throw unavailable(response.status === 429 ? "rate_limited" : response.status === 403 ? "blocked" : "unavailable", retryAt, response.status);
    }
    phase = "body";
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1_500_000) throw new Error("RSS too large");
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const xml = new TextDecoder().decode(bytes);
    phase = "validate";
    if (!/<feed[\s>]/i.test(xml.slice(0, 2000)) || !/<\/feed>\s*$/i.test(xml)) throw new Error("Invalid RSS response");
    await setState(env, "reddit:rss:last-result", JSON.stringify({ status: "ok", httpStatus, contentType, limit, checkedAt: now }));
    return xml;
  } catch (error) {
    if (error.status) throw error;
    const retryAt = Math.max(now + 10 * 60_000, limit?.waitUntil || 0);
    await setState(env, GATE, retryAt);
    await setState(env, "reddit:rss:last-result", JSON.stringify({ status: "unavailable", httpStatus, contentType, limit, phase,
      reason: String(error.message || error).slice(0, 300), checkedAt: now, retryAt }));
    throw unavailable("unavailable", retryAt);
  }
}

export async function fetchRedditCandidates(env, subreddit, period) {
  if (!['week', 'month'].includes(period) || !/^[a-z0-9_]+$/i.test(subreddit)) throw new Error("Invalid Reddit feed");
  const xml = await fetchRedditRss(env, `https://www.reddit.com/r/${subreddit}/top/.rss?t=${period}&limit=100`);
  const items = parseRedditListing(xml, [subreddit]).slice(0, 100)
    .filter(item => !item.publishedAt || Date.now() - item.publishedAt <= (period === 'week' ? 7 : 32) * DAY);
  await setState(env, "reddit:rss:last-success", Date.now());
  await setState(env, "reddit:rss:last-count", items.length);
  return items;
}

// One due feed per pipeline tick. Successful weekly feeds repeat daily;
// monthly feeds repeat every seven days. Failures never count as completed scans.
export async function claimRedditFeed(env, subs) {
  if (redditMode(env) !== 'rss' || !subs.length) return null;
  const now = Date.now();
  if (Number(await getState(env, GATE)) > now) return null;
  await env.DB.batch(subs.flatMap(sub => ['week', 'month'].map(period =>
    env.DB.prepare('INSERT OR IGNORE INTO reddit_feeds(subreddit, period) VALUES (?, ?)').bind(sub, period))));
  const slots = subs.map(() => '?').join(',');
  return env.DB.prepare(`UPDATE reddit_feeds SET next_at = ? WHERE (subreddit, period) = (
    SELECT subreddit, period FROM reddit_feeds WHERE next_at <= ? AND subreddit IN (${slots})
    ORDER BY next_at, CASE period WHEN 'week' THEN 0 ELSE 1 END, subreddit LIMIT 1
  ) RETURNING subreddit, period`).bind(now + 10 * 60_000, now, ...subs).first();
}

export async function finishRedditFeed(env, job, received, inserted) {
  const now = Date.now();
  await env.DB.prepare('UPDATE reddit_feeds SET next_at = ?, last_success = ?, received = ?, inserted = ? WHERE subreddit = ? AND period = ?')
    .bind(now + (job.period === 'week' ? DAY : 7 * DAY), now, received, inserted, job.subreddit, job.period).run();
  await setState(env, 'reddit:rss:last-feed', JSON.stringify({ ...job, received, inserted, checkedAt: now }));
}

// 한 틱에 댓글 요청은 하나만 보낸다. 나머지 Reddit 카드는 후보 피드 내용으로 먼저 만들고,
// 댓글은 retryRedditDiscussion이 요청 간격을 지키며 하나씩 채운다.
export function queuedContext(item, now = Date.now()) {
  return { body: item.snippet || "", comments: [], status: "queued", fetchedAt: null, retryAt: now,
    bodyBasis: item.snippet ? "listing" : "title" };
}

export async function redditContext(env, item) {
  if (item.reddit_context) {
    try {
      const cached = JSON.parse(item.reddit_context);
      if (cached && (["sampled", "empty"].includes(cached.status) || cached.retryAt > Date.now())) return cached;
    } catch {}
  }
  let context;
  const fetchedAt = Date.now();
  try {
    const post = redditPostUrl(item.url);
    if (!post) throw unavailable("unavailable", null);
    const thread = parseRedditThread(await fetchRedditRss(env, `${post.url}.rss?limit=50`), post.url);
    context = { ...thread, status: thread.comments.length ? "sampled" : "empty", fetchedAt,
      bodyBasis: thread.body ? "thread" : item.snippet ? "listing" : "title" };
    if (!context.body) context.body = item.snippet || "";
  } catch (error) {
    context = { body: item.snippet || "", comments: [], status: error.status || "unavailable", fetchedAt,
      retryAt: error.retryAt || fetchedAt + 10 * 60_000, bodyBasis: item.snippet ? "listing" : "title" };
  }
  // Reuse this snapshot if AI summarization retries. Raw text stays out of the public API.
  await env.DB.prepare("UPDATE items SET reddit_context = ? WHERE id = ?").bind(JSON.stringify(context), item.id).run();
  return context;
}

export function discussionFromContext(context, reaction = null) {
  const lines = (value) => Array.isArray(value) ? value.filter((s) => typeof s === "string").slice(0, 2).map((s) => s.slice(0, 240)) : [];
  const available = context.status === "sampled" && context.comments.length > 0;
  const summary = available && reaction ? {
    positive: lines(reaction.positive), concerns: lines(reaction.concerns), questions: lines(reaction.questions),
  } : null;
  return { status: context.status, fetchedAt: context.fetchedAt, retryAt: context.retryAt || null,
    bodyBasis: context.bodyBasis, sampledCount: context.comments.length,
    summary: summary && Object.values(summary).some((arr) => arr.length) ? summary : null };
}
