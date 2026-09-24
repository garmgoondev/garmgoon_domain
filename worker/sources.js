import { parseFeed } from "./feed.js";
import { fetchText, stripHtml, HOUR } from "./util.js";

// 비즈니스 아이디어 수집 출처. 새 RSS를 추가하려면 여기에 한 줄만 넣으면 된다.
export const SOURCES = [
  { id: "producthunt", label: "Product Hunt", type: "rss", url: "https://www.producthunt.com/feed", limit: 25 },
  { id: "showhn", label: "Show HN", type: "hn", limit: 25 },
  { id: "reddit", label: "r/Entrepreneur", type: "rss", url: "https://www.reddit.com/r/Entrepreneur/top/.rss?t=day", limit: 10 },
  { id: "reddit", label: "r/SaaS", type: "rss", url: "https://www.reddit.com/r/SaaS/top/.rss?t=day", limit: 10 },
  { id: "reddit", label: "r/SideProject", type: "rss", url: "https://www.reddit.com/r/SideProject/top/.rss?t=day", limit: 10 },
  { id: "reddit", label: "r/startups", type: "rss", url: "https://www.reddit.com/r/startups/top/.rss?t=day", limit: 10 },
  { id: "geeknews", label: "GeekNews", type: "rss", url: "https://news.hada.io/rss/news", limit: 25 },
  { id: "yozm", label: "요즘IT", type: "rss", url: "https://yozm.wishket.com/magazine/feed/", limit: 15 },
  { id: "platum", label: "플래텀", type: "rss", url: "https://platum.kr/feed", limit: 15 },
  { id: "venturesquare", label: "벤처스퀘어", type: "rss", url: "https://www.venturesquare.net/feed", limit: 15 },
  { id: "techcrunch", label: "TechCrunch", type: "rss", url: "https://techcrunch.com/category/startups/feed/", limit: 15 },
];

const MAX_AGE = 48 * HOUR;

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
  if (source === "reddit") s = s.replace(/submitted by\s+\/u\/[\s\S]*$/, "");
  return s.trim().slice(0, 1500);
}

async function fetchRss(src) {
  const xml = await fetchText(src.url, { headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } });
  return parseFeed(xml).map((e) => ({ ...e, snippet: cleanSnippet(src.id, e.snippet) }));
}

async function fetchShowHN() {
  const since = Math.floor((Date.now() - MAX_AGE) / 1000);
  const text = await fetchText(
    `https://hn.algolia.com/api/v1/search?tags=show_hn&numericFilters=created_at_i>${since}&hitsPerPage=40`,
  );
  return JSON.parse(text).hits.map((h) => ({
    title: h.title.replace(/^Show HN:\s*/i, ""),
    url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    snippet: `${stripHtml(h.story_text || "")}\n(HN ${h.points ?? 0}점, 댓글 ${h.num_comments ?? 0}개)`.trim().slice(0, 1500),
    publishedAt: h.created_at_i * 1000,
  }));
}

// 모든 출처를 병렬로 가져온다. 일부 출처가 실패해도 나머지는 계속 진행한다.
export async function collectAll() {
  const now = Date.now();
  const results = await Promise.allSettled(SOURCES.map((s) => (s.type === "hn" ? fetchShowHN() : fetchRss(s))));
  const items = [];
  const errors = [];
  results.forEach((r, i) => {
    const src = SOURCES[i];
    if (r.status === "rejected") {
      errors.push(`${src.label}: ${r.reason?.message || r.reason}`);
      return;
    }
    r.value
      .filter((e) => e.title && /^https?:\/\//.test(e.url))
      .filter((e) => !e.publishedAt || now - e.publishedAt < MAX_AGE)
      .slice(0, src.limit)
      .forEach((e) => items.push({ ...e, url: cleanUrl(e.url), source: src.id, sourceLabel: src.label }));
  });
  return { items, errors };
}
