import { collectIdeas, scoreIdeas, selectIdeas, summarizeIdeas } from "./ideas.js";
import { buildWeeklyReport } from "./report.js";
import { DAY, getState, localParts, localWeekStart, log, setState, timeZone } from "./util.js";
import { checkChannels, summarizeVideos } from "./youtube.js";

export function collectHourOf(env) {
  return Number(env.COLLECT_HOUR ?? 6);
}

// 크론이 10분마다 호출한다. 한 번에 한 단계만 처리해서 Worker 실행 한도(CPU, 하위 요청 수) 안에 머문다.
// 반환값은 처리한 내용 설명, 할 일이 없으면 null.
export async function tick(env, { forceCollect = false } = {}) {
  const now = Date.now();
  const tz = timeZone(env);
  const { day: today, hour, weekday } = localParts(tz, now);
  const collectHour = collectHourOf(env);

  const steps = [
    async () => {
      if (!forceCollect && hour < collectHour) return null;
      if (!forceCollect && (await getState(env, `collected:${today}`))) return null;
      await setState(env, `collected:${today}`, now);
      return `아이디어 수집: 새 글 ${await collectIdeas(env, today)}건`;
    },
    async () => {
      const row = await env.DB.prepare("SELECT day FROM items WHERE status = 'new' ORDER BY day LIMIT 1").first();
      return row ? `AI 채점: ${await scoreIdeas(env, row.day)}건` : null;
    },
    async () => {
      const row = await env.DB.prepare("SELECT day FROM items WHERE status = 'scored' ORDER BY day LIMIT 1").first();
      return row ? `오늘의 카드 선정: ${await selectIdeas(env, row.day)}건` : null;
    },
    async () => {
      const row = await env.DB.prepare("SELECT day FROM items WHERE status = 'selected' ORDER BY day DESC LIMIT 1").first();
      return row ? `카드뉴스 생성: ${await summarizeIdeas(env, row.day)}건` : null;
    },
    async () => ((await checkChannels(env)) ? "유튜브 새 영상 확인" : null),
    async () => {
      const n = await summarizeVideos(env);
      return n ? `유튜브 요약: ${n}건` : null;
    },
    async () => {
      // 일요일 18시 이후엔 이번 주, 그 외엔 지난주 리포트가 없으면 만든다
      const week = weekday === 0 && hour >= 18 ? localWeekStart(tz, now) : localWeekStart(tz, now - 7 * DAY);
      if (await getState(env, `report:${week}`)) return null;
      await setState(env, `report:${week}`, now);
      const report = await buildWeeklyReport(env, week);
      return report ? `주간 리포트 생성: ${week}` : null;
    },
  ];

  for (const step of steps) {
    try {
      const done = await step();
      if (done) return done;
    } catch (e) {
      await log(env, "error", `파이프라인 오류: ${e.message}`);
      return `오류: ${e.message}`;
    }
  }
  return null;
}
