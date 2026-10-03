import { collectIdeas, collectRedditTop, scoreIdeas, selectIdeas, summarizeIdeas, retryRedditDiscussion } from "./ideas.js";
import { buildWeeklyReport } from "./report.js";
import { RETENTION_DAYS, SHORT_RETENTION_SOURCES } from "./sources.js";
import { addDays, DAY, getState, localParts, localWeekStart, log, setState, timeZone } from "./util.js";
import { checkChannels, summarizeVideos } from "./youtube.js";

export function collectHourOf(env) {
  return Number(env.COLLECT_HOUR ?? 6);
}

export function collectIntervalOf(env) {
  return Number(env.COLLECT_INTERVAL_HOURS ?? 4);
}

// 수집 시각(COLLECT_HOUR)을 기준으로 interval 시간마다 나뉜 수집 구간. 예: 6시 기준 4시간 → 2·6·10·14·18·22시
export function collectSlot(env, day, hour) {
  const start = collectHourOf(env);
  const interval = collectIntervalOf(env);
  const slotHour = (start + Math.floor(((hour - start + 24) % 24) / interval) * interval) % 24;
  // 자정을 넘긴 직후(예: 0시)의 구간은 전날 22시에 시작한 구간이다
  const slotDay = slotHour > hour ? addDays(day, -1) : day;
  const nextHour = (slotHour + interval) % 24;
  return { key: `collected:${slotDay}@${String(slotHour).padStart(2, "0")}`, slotHour, nextHour };
}

// 크론이 10분마다 호출한다. 한 번에 한 단계만 처리해서 Worker 실행 한도(CPU, 하위 요청 수) 안에 머문다.
// 반환값은 처리한 내용 설명, 할 일이 없으면 null.
export async function tick(env, { forceCollect = false } = {}) {
  const now = Date.now();
  const tz = timeZone(env);
  const { day: today, hour, weekday } = localParts(tz, now);

  const steps = [
    async () => {
      const slot = collectSlot(env, today, hour);
      if (!forceCollect && (await getState(env, slot.key))) return null;
      await setState(env, slot.key, now);
      await setState(env, "collected:last", now);
      return `아이디어 수집: 새 글 ${await collectIdeas(env, today)}건`;
    },
    async () => {
      const row = await env.DB.prepare("SELECT day FROM items WHERE status = 'new' ORDER BY day LIMIT 1").first();
      return row ? `AI 채점: ${await scoreIdeas(env, row.day)}건` : null;
    },
    async () => {
      const row = await env.DB.prepare("SELECT day FROM items WHERE status = 'scored' ORDER BY day LIMIT 1").first();
      return row ? `새 카드 선정: ${await selectIdeas(env, row.day)}건` : null;
    },
    async () => {
      const row = await env.DB.prepare("SELECT day FROM items WHERE status = 'selected' ORDER BY day DESC LIMIT 1").first();
      return row ? `카드 생성: ${await summarizeIdeas(env, row.day)}건` : null;
    },
    async () => collectRedditTop(env, today),
    async () => (await retryRedditDiscussion(env)) ? "Reddit 댓글 재확인: 1건" : null,
    async () => ((await checkChannels(env)) ? "유튜브 새 영상 확인" : null),
    async () => {
      const n = await summarizeVideos(env);
      return n ? `유튜브 요약: ${n}건` : null;
    },
    async () => {
      // 하루 한 번, 탈락한 글과 보관 기간이 지난 글을 지운다. 스크랩한 글은 남긴다.
      if (await getState(env, `cleanup:${today}`)) return null;
      await setState(env, `cleanup:${today}`, now);

      // 1) 카드 선정에서 탈락(skipped)한 글은 3일 뒤 자동 삭제 (중복 수집 방지 기간 경과 후 정리)
      const skippedRes = await env.DB.prepare(
        "DELETE FROM items WHERE status = 'skipped' AND collected_at < ?"
      ).bind(now - 3 * DAY).run();

      // 2) 보관 기간이 지난 미스크랩 글 삭제
      const oldRes = await env.DB.prepare(
        `DELETE FROM items WHERE collected_at < ?
         AND CAST(id AS TEXT) NOT IN (SELECT ref_id FROM scraps WHERE kind = 'item')`,
      ).bind(now - RETENTION_DAYS * DAY).run();

      const totalDeleted = (skippedRes.meta.changes || 0) + (oldRes.meta.changes || 0);
      return totalDeleted ? `데이터 정리: 탈락 글 ${skippedRes.meta.changes || 0}건, 만료 글 ${oldRes.meta.changes || 0}건 삭제` : null;
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
