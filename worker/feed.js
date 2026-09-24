import { decodeEntities, stripHtml } from "./util.js";

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  if (!m) return "";
  const cdata = m[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return cdata ? cdata[1] : m[1];
}

function attr(block, tagName, attrName, rel = "") {
  for (const t of block.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) || []) {
    if (rel && !new RegExp(`\\brel=["']${rel}["']`, "i").test(t)) continue;
    const m = t.match(new RegExp(`\\b${attrName}=(?:"([^"]*)"|'([^']*)')`, "i"));
    if (m) return decodeEntities(m[1] ?? m[2]);
  }
  return "";
}

function toText(raw) {
  // RSS 본문은 이스케이프된 HTML인 경우가 많아 한 번 디코딩한 뒤 태그를 제거한다
  const once = /&lt;[a-z/]/i.test(raw) ? decodeEntities(raw) : raw;
  return stripHtml(once);
}

// RSS 2.0 / Atom 공통 파서. [{ title, url, snippet, publishedAt, extra }]
export function parseFeed(xml) {
  const isAtom = /<feed[\s>]/i.test(xml.slice(0, 2000));
  const blocks = xml.match(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) || [];
  return blocks.map((b) => {
    const title = toText(tag(b, "title"));
    const url = isAtom
      ? attr(b, "link", "href", "alternate") || attr(b, "link", "href")
      : decodeEntities(tag(b, "link").trim()) || tag(b, "guid").trim();
    const body = tag(b, "content:encoded") || tag(b, "content") || tag(b, "description") || tag(b, "summary") || tag(b, "media:description");
    const date = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date");
    const ts = Date.parse(date.trim());
    return {
      title,
      url,
      snippet: toText(body),
      publishedAt: Number.isFinite(ts) ? ts : null,
      block: b,
    };
  });
}

export { tag as feedTag, attr as feedAttr };
