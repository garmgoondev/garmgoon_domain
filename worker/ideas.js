import { CATEGORY_NAMES, KIND_NAMES, KINDS } from "../lib/categories.js";
import { chatJSON, hasLLM } from "./llm.js";
import { collectAll, GROUP_CAPS, PRIVATE_SOURCES, SOURCES } from "./sources.js";
import { fetchText, log, parseJSON, stripHtml, truncate } from "./util.js";

const SCORE_BATCH = 60;
const SUMMARY_BATCH = 5;
const DEFAULT_CAP = 5;

const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

// 사용자의 목적. 채점과 카드 작성 프롬프트가 함께 쓴다.
const GOAL = `사용자는 카드를 보며 현재 트렌드를 파악하고, 남들보다 조금 빨리 새롭고 좋은 비즈니스 아이디어를 찾아 응용하려는 1인 창업가입니다.
특히 관심 있는 것:
1. 규모가 크지 않아도 니치한 분야에서 실제로 수익을 내는 사업 (구체적인 매출·MRR·고객 수가 있으면 더 좋음)
2. 새로운 사업 형태, 새로운 업종, 새로운 판매·수익 방식
3. 아직 사업을 시작하지 않았더라도 아이디어를 검증하려는 글 중 호응(업보트·댓글·점수)이 큰 글, "이런 거 누가 만들어 줬으면" 같은 수요 신호
4. 새로 생기는 수요와 시장 변화의 초기 신호`;

export function dailyCardCount(env) {
  return Number(env.DAILY_CARDS) || 24;
}

function engagement(r) {
  const parts = [];
  if (r.points != null) parts.push(`▲${r.points}`);
  if (r.comments != null) parts.push(`댓글 ${r.comments}`);
  return parts.join(" ");
}

export async function collectIdeas(env, day) {
  const { items, errors } = await collectAll(env);
  const now = Date.now();
  const stmts = items.map((it) =>
    env.DB.prepare(
      "INSERT OR IGNORE INTO items (url, source, source_label, title, snippet, published_at, collected_at, day, points, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(it.url, it.source, it.sourceLabel, truncate(it.title, 300), it.snippet, it.publishedAt, now, day, it.points, it.comments),
  );
  let inserted = 0;
  for (let i = 0; i < stmts.length; i += 50) {
    const res = await env.DB.batch(stmts.slice(i, i + 50));
    inserted += res.reduce((n, r) => n + (r.meta.changes || 0), 0);
  }
  if (errors.length) await log(env, "warn", `수집 실패 출처: ${errors.join(" / ")}`);
  await log(env, "info", `[${day}] 아이디어 ${items.length}건 수집, 새 글 ${inserted}건 저장`);
  return inserted;
}

// 사용자 목적에 비춘 가치를 0~10점으로 매긴다. 한 번에 SCORE_BATCH개씩.
export async function scoreIdeas(env, day) {
  const { results } = await env.DB.prepare(
    "SELECT id, source_label, title, snippet, points, comments, attempts FROM items WHERE day = ? AND status = 'new' LIMIT ?",
  )
    .bind(day, SCORE_BATCH)
    .all();
  if (!results.length) return 0;

  let scores = {};
  let out = null;
  if (hasLLM(env)) {
    const list = results
      .map((r) => `${r.id} | ${r.source_label} | ${engagement(r) || "-"} | ${r.title} | ${truncate((r.snippet || "").replace(/\s+/g, " "), 200)}`)
      .join("\n");
    out = await chatJSON(env, {
      system: `당신은 새로운 비즈니스 기회를 발굴하는 리서처입니다.
${GOAL}

각 글이 이 사용자에게 얼마나 가치 있는지 0~10점으로 평가하세요.
- 9~10: 구체적인 수익 수치가 있는 니치 사업 사례, 호응이 큰 아이디어 검증·수요 글, 처음 보는 사업 형태
- 6~8: 응용할 만한 새 제품·서비스, 의미 있는 시장 변화 신호, 창업자의 실전 경험담
- 3~5: 참고 정도의 일반 스타트업 소식
- 0~2: 대기업·빅테크 소식, 대형 투자 유치 뉴스, 사업 관점이 없는 기술·개발 도구 이야기, 정치·사건, 광고·프랜차이즈 홍보, 잡담
호응 수치(▲점수, 댓글)가 크면 같은 조건에서 더 높게 주세요.`,
      user: `다음 글들을 평가하세요. 형식: id | 출처 | 호응 | 제목 | 내용\n\n${list}\n\nJSON으로만 답하세요: {"scores":[{"id":숫자,"s":점수}]}`,
      // 60건 × {"id":..,"s":..} 는 약 1,500토큰. 여유를 둔다.
      maxTokens: 4000,
      temperature: 0.1,
    }).catch(async (e) => {
      // 세 번까지는 다음 실행에서 다시 시도하고, 그 뒤로는 기본 점수로 넘어간다
      if (results[0].attempts < 2) {
        await env.DB.batch(results.map((r) => env.DB.prepare("UPDATE items SET attempts = attempts + 1 WHERE id = ?").bind(r.id)));
        throw e;
      }
      await log(env, "warn", `AI 채점 3회 실패, 기본 점수 사용: ${e.message}`);
      return null;
    });
    for (const s of out?.scores || []) scores[s.id] = Number(s.s);
  }
  if (!out) {
    // AI를 쓸 수 없으면 본문 길이로 대략 정렬한다
    for (const r of results) scores[r.id] = Math.min(10, (r.snippet || "").length / 100);
  }

  await env.DB.batch(
    results.map((r) =>
      env.DB.prepare("UPDATE items SET status = 'scored', score = ?, attempts = 0 WHERE id = ?").bind(Number.isFinite(scores[r.id]) ? scores[r.id] : 0, r.id),
    ),
  );
  return results.length;
}

// 점수 + 호응 가산점 + 관심 키워드 가산점으로 오늘의 카드를 고른다.
// 한 출처가 도배하지 않도록 출처별 상한을 두고, 투자 뉴스는 그룹 상한으로 몇 장만 남긴다.
export async function selectIdeas(env, day) {
  const [{ results: items }, { results: kws }] = await Promise.all([
    env.DB.prepare("SELECT id, source, title, snippet, score, points, comments FROM items WHERE day = ? AND status = 'scored'").bind(day).all(),
    env.DB.prepare("SELECT word FROM keywords").all(),
  ]);
  const words = kws.map((k) => k.word.toLowerCase());
  const ranked = items
    .map((it) => {
      const text = `${it.title} ${it.snippet || ""}`.toLowerCase();
      // 호응 가산점: 점수+댓글이 10이면 +0.7, 100이면 +1.3, 1000이면 +2 (최대 2)
      const reactions = (it.points || 0) + (it.comments || 0);
      const buzz = reactions > 0 ? Math.min(2, Math.log10(reactions + 1) * 0.67) : 0;
      return { ...it, total: (it.score || 0) + buzz + (words.some((w) => text.includes(w)) ? 3 : 0) };
    })
    .sort((a, b) => b.total - a.total);

  const limit = dailyCardCount(env);
  const perSource = {};
  const perGroup = {};
  const chosen = [];
  for (const it of ranked) {
    if (chosen.length >= limit) break;
    const src = SOURCE_BY_ID[it.source] || {};
    if ((perSource[it.source] || 0) >= (src.cap ?? DEFAULT_CAP)) continue;
    if (src.group && (perGroup[src.group] || 0) >= (GROUP_CAPS[src.group] ?? Infinity)) continue;
    perSource[it.source] = (perSource[it.source] || 0) + 1;
    if (src.group) perGroup[src.group] = (perGroup[src.group] || 0) + 1;
    chosen.push(it);
  }
  const chosenIds = new Set(chosen.map((c) => c.id));
  await env.DB.batch([
    ...chosen.map((c, i) => env.DB.prepare("UPDATE items SET status = 'selected', rank = ? WHERE id = ?").bind(i + 1, c.id)),
    ...items.filter((it) => !chosenIds.has(it.id)).map((it) => env.DB.prepare("UPDATE items SET status = 'skipped' WHERE id = ?").bind(it.id)),
  ]);
  await log(env, "info", `[${day}] ${items.length}건 중 ${chosen.length}건을 카드로 선정`);
  return chosen.length;
}

async function articleText(item) {
  // 커뮤니티 글은 수집할 때 본문을 이미 받았다
  const collected = /news\.ycombinator\.com|reddit\.com/.test(item.url);
  if ((item.snippet || "").length >= 500 || collected) return item.snippet || "";
  try {
    const html = await fetchText(item.url, { timeout: 8000, maxBytes: 400_000 });
    const body = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || html.match(/<main[\s\S]*?<\/main>/i)?.[0] || html;
    const text = stripHtml(body);
    return `${item.snippet || ""}\n\n${text}`.slice(0, 6000);
  } catch {
    return item.snippet || "";
  }
}

async function makeCard(env, item) {
  const text = await articleText(item);
  const out = await chatJSON(env, {
    system: `당신은 새로운 비즈니스 기회를 정리하는 에디터입니다.
${GOAL}

영어 글도 자연스러운 한국어로 옮기고, 이 사용자가 아이디어를 응용할 수 있는 관점으로 정리하세요.
글에 없는 숫자나 사실은 절대 지어내지 마세요. 모르면 비워 두세요.`,
    user: `출처: ${item.source_label}
호응: ${engagement(item) || "정보 없음"}
제목: ${item.title}
링크: ${item.url}
본문:
${text || "(본문 없음, 제목으로 판단)"}

아래 JSON 형식으로만 답하세요.
{
  "kind": "다음 중 하나의 이름만: ${KIND_NAMES.map((k) => `${k}(${KINDS[k].desc})`).join(" / ")}",
  "headline": "어떤 사업·아이디어인지 바로 알 수 있는 한국어 제목, 30자 이내",
  "summary": ["누가 어떤 문제를 겪는지", "무엇을 어떻게 해결하거나 판매하는지", "결과나 반응 (수익, 고객, 호응)"],
  "signal": "검증·수익 신호 한 줄. 글에 있는 숫자만 사용 (예: 'MRR $17k', '사전 신청 300명'). 없으면 빈 문자열",
  "point": "응용 아이디어: 이 아이디어를 한국 시장이나 1인 창업자가 응용할 구체적인 방법 2문장",
  "category": "${CATEGORY_NAMES.join(" | ")} 중 하나",
  "tags": ["키워드1", "키워드2", "키워드3"]
}`,
    maxTokens: 1500,
  });
  return {
    kind: KIND_NAMES.find((k) => String(out.kind || "").includes(k)) || null,
    signal: truncate(String(out.signal || "").trim(), 80),
    headline: truncate(String(out.headline || item.title), 60),
    summary: (Array.isArray(out.summary) ? out.summary : [String(out.summary || "")]).slice(0, 3).map(String),
    point: String(out.point || ""),
    category: CATEGORY_NAMES.includes(out.category) ? out.category : "기타",
    tags: (Array.isArray(out.tags) ? out.tags : []).slice(0, 4).map((t) => String(t).replace(/^#/, "")),
  };
}

function plainCard(item) {
  return {
    kind: null,
    signal: "",
    headline: truncate(item.title, 60),
    summary: [truncate(item.snippet || "요약이 없습니다. 원문을 확인해 주세요.", 280)],
    point: "",
    category: "기타",
    tags: [],
  };
}

// 선정된 글을 SUMMARY_BATCH개씩 카드로 만든다.
export async function summarizeIdeas(env, day) {
  const { results } = await env.DB.prepare("SELECT * FROM items WHERE day = ? AND status = 'selected' ORDER BY rank LIMIT ?")
    .bind(day, SUMMARY_BATCH)
    .all();
  if (!results.length) return 0;

  const cards = await Promise.allSettled(results.map((it) => (hasLLM(env) ? makeCard(env, it) : plainCard(it))));
  const stmts = [];
  for (const [i, r] of cards.entries()) {
    const it = results[i];
    // 세 번 실패하면 원문 그대로 카드로 만든다
    const c = r.status === "fulfilled" ? r.value : it.attempts >= 2 ? plainCard(it) : null;
    if (r.status === "rejected") await log(env, "warn", `카드 생성 실패 (${it.title}): ${r.reason?.message}`);
    stmts.push(
      c
        ? env.DB.prepare(
            "UPDATE items SET status = 'published', kind = ?, signal = ?, headline = ?, summary = ?, point = ?, category = ?, tags = ?, attempts = attempts + ? WHERE id = ?",
          ).bind(c.kind, c.signal, c.headline, JSON.stringify(c.summary), c.point, c.category, JSON.stringify(c.tags), r.status === "fulfilled" ? 0 : 1, it.id)
        : env.DB.prepare("UPDATE items SET attempts = attempts + 1 WHERE id = ?").bind(it.id),
    );
  }
  await env.DB.batch(stmts);
  return results.length;
}

export function cardFromRow(r) {
  return {
    id: r.id,
    url: r.url,
    source: r.source,
    sourceLabel: r.source_label,
    private: PRIVATE_SOURCES.includes(r.source),
    title: r.title,
    headline: r.headline || r.title,
    summary: parseJSON(r.summary, []),
    point: r.point || "",
    kind: r.kind || null,
    signal: r.signal || "",
    points: r.points ?? null,
    comments: r.comments ?? null,
    category: r.category || "기타",
    tags: parseJSON(r.tags, []),
    rank: r.rank,
    day: r.day,
    publishedAt: r.published_at,
  };
}
