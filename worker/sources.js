import { parseFeed } from "./feed.js";
import { fetchText, getState, HOUR, parseJSON, setState, stripHtml } from "./util.js";

// 비즈니스 아이디어 수집 출처.
// - cap: 하루 카드 중 이 출처가 차지할 수 있는 최대 장수
// - group "news": 투자·스타트업 뉴스는 트렌드 신호로 하루 몇 장만 남긴다
// - needs: 해당 API 키가 있을 때만 수집한다
export const SOURCES = [
  { id: "reddit", label: "Reddit", type: "reddit", needs: "reddit", cap: 10 },
  { id: "showhn", label: "Show HN", type: "hn", tag: "show_hn", minPoints: 15, limit: 25, cap: 6 },
  { id: "askhn", label: "Ask HN", type: "hn", tag: "ask_hn", minPoints: 20, limit: 15, cap: 4 },
  { id: "producthunt", label: "Product Hunt", type: "rss", url: "https://www.producthunt.com/feed", limit: 15, cap: 4 },
  { id: "acquire", label: "Acquire", type: "rss", url: "https://blog.acquire.com/feed/", limit: 5, cap: 3, browserUA: true },
  { id: "trendsvc", label: "Trends.vc", type: "rss", url: "https://trends.vc/feed/", limit: 5, cap: 3 },
  { id: "geeknews", label: "GeekNews", type: "rss", url: "https://news.hada.io/rss/news", limit: 20, cap: 4 },
  { id: "techcrunch", label: "TechCrunch", type: "rss", url: "https://techcrunch.com/category/startups/feed/", limit: 8, group: "news" },
  { id: "platum", label: "플래텀", type: "rss", url: "https://platum.kr/feed", limit: 8, group: "news" },
  { id: "venturesquare", label: "벤처스퀘어", type: "rss", url: "https://www.venturesquare.net/feed", limit: 8, group: "news" },
];

export const GROUP_CAPS = { news: 3 };

// 아이디어 검증, 니치 수익 사례, 수요 신호가 많이 올라오는 서브레딧
export const REDDIT_SUBS = [
  "Entrepreneur",
  "EntrepreneurRideAlong",
  "SideProject",
  "SaaS",
  "microsaas",
  "indiehackers",
  "smallbusiness",
  "sweatystartup",
  "SomebodyMakeThis",
  "startups",
];

const MAX_AGE = 48 * HOUR;
const REDDIT_UA = "web:garmgoon-dashboard:1.0 (personal idea feed)";
// 봇 User-Agent를 막는 사이트용
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export function sourceAvailability(env) {
  return {
    reddit: Boolean(env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET),
  };
}

// 같은 글이 추적 파라미터 때문에 중복 저장되지 않도록 정리한다
function cleanUrl(url) {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) if (/^(utm_|ref$|fbclid)/.test(key)) u.searchParams.delete(key);
    return u.toString();
  } catch {
    return url;
  }
}

function cleanSnippet(source, text) {
  let s = text;
  if (source === "producthunt") s = s.replace(/Discussion\s*\|\s*Link\s*$/, "");
  return s.trim().slice(0, 1500);
}

async function fetchRss(src) {
  const xml = await fetchText(src.url, {
    headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml", ...(src.browserUA ? { "user-agent": BROWSER_UA } : {}) },
  });
  return parseFeed(xml).map((e) => ({ ...e, snippet: cleanSnippet(src.id, e.snippet) }));
}

// 호응(점수)이 일정 이상인 Show HN / Ask HN. 링크는 토론 페이지로 건다 (댓글이 곧 검증 신호).
async function fetchHN(src) {
  const since = Math.floor((Date.now() - MAX_AGE) / 1000);
  const text = await fetchText(
    `https://hn.algolia.com/api/v1/search?tags=${src.tag}&numericFilters=created_at_i>${since},points>=${src.minPoints}&hitsPerPage=${src.limit}`,
  );
  return JSON.parse(text).hits.map((h) => ({
    title: h.title.replace(/^(Show|Ask) HN:\s*/i, ""),
    url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    snippet: [stripHtml(h.story_text || ""), h.url ? `제품 링크: ${h.url}` : ""].filter(Boolean).join("\n").slice(0, 1500),
    publishedAt: h.created_at_i * 1000,
    points: h.points ?? 0,
    comments: h.num_comments ?? 0,
  }));
}

async function redditToken(env) {
  const cached = parseJSON(await getState(env, "reddit:token"));
  if (cached?.token && cached.exp > Date.now() + 60_000) return cached.token;
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`)}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": REDDIT_UA,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`토큰 발급 실패 ${res.status} ${data.error || data.message || ""}`.trim());
  await setState(env, "reddit:token", JSON.stringify({ token: data.access_token, exp: Date.now() + data.expires_in * 1000 }));
  return data.access_token;
}

// 공식 API(OAuth)로 서브레딧별 오늘의 인기 글을 가져온다
async function fetchReddit(env) {
  const token = await redditToken(env);
  const results = await Promise.allSettled(
    REDDIT_SUBS.map(async (sub) => {
      const text = await fetchText(`https://oauth.reddit.com/r/${sub}/top?t=day&limit=10&raw_json=1`, {
        headers: { authorization: `Bearer ${token}`, "user-agent": REDDIT_UA },
      });
      return JSON.parse(text)
        .data.children.map((c) => c.data)
        .filter((p) => !p.stickied && !p.over_18 && p.score >= 3)
        .map((p) => ({
          title: p.title,
          url: `https://www.reddit.com${p.permalink}`,
          snippet: [p.selftext, !p.is_self && p.url ? `링크: ${p.url}` : ""].filter(Boolean).join("\n").slice(0, 1500),
          publishedAt: p.created_utc * 1000,
          points: p.score,
          comments: p.num_comments,
          label: `r/${sub}`,
        }));
    }),
  );
  const failed = results.map((r, i) => (r.status === "rejected" ? `r/${REDDIT_SUBS[i]}` : null)).filter(Boolean);
  if (failed.length === results.length) throw new Error(`모든 서브레딧 실패 (${results[0].reason?.message})`);
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

function fetchSource(env, src) {
  if (src.type === "hn") return fetchHN(src);
  if (src.type === "reddit") return fetchReddit(env);
  return fetchRss(src);
}

// 모든 출처를 병렬로 가져온다. 일부 출처가 실패해도 나머지는 계속 진행한다.
export async function collectAll(env) {
  const now = Date.now();
  const available = sourceAvailability(env);
  const active = SOURCES.filter((s) => !s.needs || available[s.needs]);
  const results = await Promise.allSettled(active.map((s) => fetchSource(env, s)));
  const items = [];
  const errors = [];
  results.forEach((r, i) => {
    const src = active[i];
    if (r.status === "rejected") {
      errors.push(`${src.label}: ${r.reason?.message || r.reason}`);
      return;
    }
    r.value
      .filter((e) => e.title && /^https?:\/\//.test(e.url))
      .filter((e) => !e.publishedAt || now - e.publishedAt < MAX_AGE)
      .slice(0, src.limit ?? Infinity)
      .forEach((e) =>
        items.push({
          ...e,
          url: cleanUrl(e.url),
          source: src.id,
          sourceLabel: e.label || src.label,
          points: e.points ?? null,
          comments: e.comments ?? null,
        }),
      );
  });
  return { items, errors };
}
