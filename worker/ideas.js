import { CATEGORY_NAMES } from "../lib/categories.js";
import { chatJSON, hasLLM } from "./llm.js";
import { collectAll } from "./sources.js";
import { fetchText, log, parseJSON, stripHtml, truncate } from "./util.js";

const SCORE_BATCH = 60;
const SUMMARY_BATCH = 5;
const MAX_PER_SOURCE = 7;

export function dailyCardCount(env) {
  return Number(env.DAILY_CARDS) || 24;
}

export async function collectIdeas(env, day) {
  const { items, errors } = await collectAll();
  const now = Date.now();
  const stmts = items.map((it) =>
    env.DB.prepare(
      "INSERT OR IGNORE INTO items (url, source, source_label, title, snippet, published_at, collected_at, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(it.url, it.source, it.sourceLabel, truncate(it.title, 300), it.snippet, it.publishedAt, now, day),
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

// 사업 아이디어로서의 가치를 0~10점으로 매긴다. 한 번에 SCORE_BATCH개씩.
export async function scoreIdeas(env, day) {
  const { results } = await env.DB.prepare("SELECT id, source_label, title, snippet, attempts FROM items WHERE day = ? AND status = 'new' LIMIT ?")
    .bind(day, SCORE_BATCH)
    .all();
  if (!results.length) return 0;

  let scores = {};
  let out = null;
  if (hasLLM(env)) {
    const list = results.map((r) => `${r.id} | ${r.source_label} | ${r.title} | ${truncate((r.snippet || "").replace(/\s+/g, " "), 160)}`).join("\n");
    out = await chatJSON(env, {
      system:
        "당신은 1인 창업가를 돕는 비즈니스 리서처입니다. 각 글이 '사업 아이디어·수익 모델·시장 기회·창업 사례' 관점에서 얼마나 가치 있는지 0~10점으로 평가하세요. 새로운 제품/서비스, 돈을 버는 구체적 방법, 사람들이 겪는 불편(문제), 성장 사례는 높게, 단순 기술 뉴스·정치·연예·광고성 글은 낮게 주세요.",
      user: `다음 글들을 평가하세요. 형식: id | 출처 | 제목 | 내용\n\n${list}\n\nJSON으로만 답하세요: {"scores":[{"id":숫자,"s":점수}]}`,
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
    results.map((r) => env.DB.prepare("UPDATE items SET status = 'scored', score = ?, attempts = 0 WHERE id = ?").bind(Number.isFinite(scores[r.id]) ? scores[r.id] : 0, r.id)),
  );
  return results.length;
}

// 점수 + 관심 키워드 가산점으로 오늘의 카드를 고른다. 한 출처가 도배하지 않도록 출처별 상한을 둔다.
export async function selectIdeas(env, day) {
  const [{ results: items }, { results: kws }] = await Promise.all([
    env.DB.prepare("SELECT id, source, title, snippet, score FROM items WHERE day = ? AND status = 'scored'").bind(day).all(),
    env.DB.prepare("SELECT word FROM keywords").all(),
  ]);
  const words = kws.map((k) => k.word.toLowerCase());
  const ranked = items
    .map((it) => {
      const text = `${it.title} ${it.snippet || ""}`.toLowerCase();
      return { ...it, total: (it.score || 0) + (words.some((w) => text.includes(w)) ? 3 : 0) };
    })
    .sort((a, b) => b.total - a.total);

  const limit = dailyCardCount(env);
  const perSource = {};
  const chosen = [];
  for (const it of ranked) {
    if (chosen.length >= limit) break;
    if ((perSource[it.source] || 0) >= MAX_PER_SOURCE) continue;
    perSource[it.source] = (perSource[it.source] || 0) + 1;
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
  if ((item.snippet || "").length >= 500 || item.url.includes("news.ycombinator.com")) return item.snippet || "";
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
    system: `당신은 한국 스타트업 뉴스레터의 카드뉴스 에디터입니다. 영어 글도 자연스러운 한국어로 옮기고, 1인 창업가가 바로 써먹을 수 있는 관점으로 정리합니다. 과장하거나 글에 없는 사실을 지어내지 마세요.`,
    user: `출처: ${item.source_label}
제목: ${item.title}
링크: ${item.url}
본문:
${text || "(본문 없음, 제목으로 판단)"}

아래 JSON 형식으로만 답하세요.
{
  "headline": "카드 표지 제목. 한국어 28자 이내, 호기심을 끄는 한 문장",
  "summary": ["핵심 요약 1", "핵심 요약 2", "핵심 요약 3"],
  "point": "사업 포인트: 이 글에서 얻을 수 있는 사업 기회나 한국 시장 적용 아이디어를 2문장으로",
  "category": "${CATEGORY_NAMES.join(" | ")} 중 하나",
  "tags": ["키워드1", "키워드2", "키워드3"]
}`,
    maxTokens: 1500,
  });
  return {
    headline: truncate(String(out.headline || item.title), 60),
    summary: (Array.isArray(out.summary) ? out.summary : [String(out.summary || "")]).slice(0, 3).map(String),
    point: String(out.point || ""),
    category: CATEGORY_NAMES.includes(out.category) ? out.category : "기타",
    tags: (Array.isArray(out.tags) ? out.tags : []).slice(0, 4).map((t) => String(t).replace(/^#/, "")),
  };
}

function plainCard(item) {
  return {
    headline: truncate(item.title, 60),
    summary: [truncate(item.snippet || "요약이 없습니다. 원문을 확인해 주세요.", 280)],
    point: "",
    category: "기타",
    tags: [],
  };
}

// 선정된 글을 SUMMARY_BATCH개씩 카드뉴스로 만든다.
export async function summarizeIdeas(env, day) {
  const { results } = await env.DB.prepare("SELECT * FROM items WHERE day = ? AND status = 'selected' ORDER BY rank LIMIT ?")
    .bind(day, SUMMARY_BATCH)
    .all();
  if (!results.length) return 0;

  const cards = await Promise.allSettled(results.map((it) => (hasLLM(env) ? makeCard(env, it) : plainCard(it))));
  const stmts = [];
  for (const [i, r] of cards.entries()) {
    const it = results[i];
    if (r.status === "fulfilled") {
      const c = r.value;
      stmts.push(
        env.DB.prepare("UPDATE items SET status = 'published', headline = ?, summary = ?, point = ?, category = ?, tags = ? WHERE id = ?").bind(
          c.headline, JSON.stringify(c.summary), c.point, c.category, JSON.stringify(c.tags), it.id,
        ),
      );
    } else {
      await log(env, "warn", `카드 생성 실패 (${it.title}): ${r.reason?.message}`);
      // 세 번 실패하면 원문 그대로 카드로 만든다
      const fallback = it.attempts >= 2 ? plainCard(it) : null;
      stmts.push(
        fallback
          ? env.DB.prepare("UPDATE items SET status = 'published', headline = ?, summary = ?, category = ?, tags = '[]', attempts = attempts + 1 WHERE id = ?").bind(
              fallback.headline, JSON.stringify(fallback.summary), fallback.category, it.id,
            )
          : env.DB.prepare("UPDATE items SET attempts = attempts + 1 WHERE id = ?").bind(it.id),
      );
    }
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
    title: r.title,
    headline: r.headline || r.title,
    summary: parseJSON(r.summary, []),
    point: r.point || "",
    category: r.category || "기타",
    tags: parseJSON(r.tags, []),
    rank: r.rank,
    day: r.day,
    publishedAt: r.published_at,
  };
}
