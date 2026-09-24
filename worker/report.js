import { chatJSON, hasLLM } from "./llm.js";
import { addDays, dayStartMs, log, parseJSON, timeZone } from "./util.js";

// weekStart(월요일, 설정한 시간대 기준)부터 7일 동안의 카드와 영상으로 주간 트렌드 리포트를 만든다.
export async function buildWeeklyReport(env, weekStart) {
  const start = weekStart;
  const end = addDays(weekStart, 6);
  const startMs = dayStartMs(timeZone(env), start);
  const endMs = dayStartMs(timeZone(env), addDays(weekStart, 7));

  const [{ results: items }, { results: videos }] = await Promise.all([
    env.DB.prepare("SELECT headline, category, tags, source_label FROM items WHERE status = 'published' AND day BETWEEN ? AND ? ORDER BY score DESC LIMIT 200")
      .bind(start, end)
      .all(),
    env.DB.prepare(
      "SELECT v.title, v.one_liner, v.tags, c.title AS channel FROM videos v JOIN channels c ON c.id = v.channel_id WHERE v.status = 'done' AND v.published_at >= ? AND v.published_at < ? LIMIT 60",
    )
      .bind(startMs, endMs)
      .all(),
  ]);
  if (!items.length && !videos.length) return null;

  const categories = {};
  const keywordCount = {};
  for (const it of items) {
    categories[it.category] = (categories[it.category] || 0) + 1;
    for (const t of parseJSON(it.tags, [])) keywordCount[t] = (keywordCount[t] || 0) + 1;
  }
  for (const v of videos) for (const t of parseJSON(v.tags, [])) keywordCount[t] = (keywordCount[t] || 0) + 1;
  const keywords = Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  let narrative = { title: `${start} 주간 리포트`, summary: "", hot: [], watch: [] };
  if (hasLLM(env)) {
    const lines = [
      ...items.map((it) => `- [${it.category}] ${it.headline} (${it.source_label})`),
      ...videos.map((v) => `- [영상/${v.channel}] ${v.title}: ${v.one_liner}`),
    ].join("\n");
    const out = await chatJSON(env, {
      system: "당신은 1인 창업가를 위한 주간 트렌드 애널리스트입니다. 주어진 목록에서만 근거를 찾아 한국어로 간결하게 정리하세요.",
      user: `이번 주(${start} ~ ${end}) 수집된 비즈니스 카드와 영상 목록입니다.\n많이 나온 키워드: ${keywords.map((k) => `${k.word}(${k.count})`).join(", ")}\n\n${lines}\n\nJSON으로만 답하세요.
{
  "title": "이번 주를 요약하는 제목 (25자 이내)",
  "summary": "이번 주 흐름을 3문장으로",
  "hot": [{"area": "유망 분야", "why": "왜 주목할 만한지 한 문장", "idea": "바로 시도해볼 만한 작은 사업 아이디어 한 문장"}],
  "watch": ["다음 주에 지켜볼 것 (3개)"]
}
hot은 3개로 작성하세요.`,
      maxTokens: 1500,
    });
    narrative = {
      title: String(out.title || narrative.title),
      summary: String(out.summary || ""),
      hot: (Array.isArray(out.hot) ? out.hot : []).slice(0, 3),
      watch: (Array.isArray(out.watch) ? out.watch : []).slice(0, 5).map(String),
    };
  }

  const content = { start, end, itemCount: items.length, videoCount: videos.length, categories, keywords, ...narrative };
  await env.DB.prepare("INSERT INTO reports (week, content, created_at) VALUES (?, ?, ?) ON CONFLICT(week) DO UPDATE SET content = excluded.content, created_at = excluded.created_at")
    .bind(weekStart, JSON.stringify(content), Date.now())
    .run();
  await log(env, "info", `주간 리포트 생성: ${start} ~ ${end} (카드 ${items.length}, 영상 ${videos.length})`);
  return content;
}
