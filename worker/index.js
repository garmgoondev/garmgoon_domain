import { checkPassword, clearCookie, isAuthed, sessionCookie } from "./auth.js";
import { backfillIdeas, cardFromRow, dailyCardCount } from "./ideas.js";
import { hasLLM, modelName } from "./llm.js";
import { collectHourOf, collectIntervalOf, collectSlot, tick } from "./pipeline.js";
import { buildWeeklyReport } from "./report.js";
import { SOURCES, sourceAvailability } from "./sources.js";
import { DAY, getState, httpError, json, localDay, localParts, localWeekStart, parseJSON, timeZone } from "./util.js";
import { addChannel, videoFromRow } from "./youtube.js";

const PRIVATE_PAGES = /^\/(tools|scrap|settings)(\/|\.html|\.txt|$)/;
const NOTE_STATUSES = ["idea", "review", "doing", "hold"];

async function readBody(request) {
  if (!(request.headers.get("content-type") || "").includes("application/json")) throw new Error("JSON 요청만 받습니다.");
  return request.json();
}

// ---------- 공개 API ----------

async function getIdeas(env, url, authed) {
  const { results: days } = await env.DB.prepare(
    "SELECT day, COUNT(*) AS count FROM items WHERE status = 'published' GROUP BY day ORDER BY day DESC LIMIT 30",
  ).all();
  const day = url.searchParams.get("day") || days[0]?.day || localDay(timeZone(env));
  const [{ results }, pending] = await Promise.all([
    // 가장 최근 수집분이 위로 오고, 같은 수집분 안에서는 점수 순서
    env.DB.prepare("SELECT * FROM items WHERE day = ? AND status = 'published' ORDER BY collected_at DESC, rank").bind(day).all(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM items WHERE day = ? AND status IN ('new', 'scored', 'selected')").bind(day).first(),
  ]);
  const cards = results.map(cardFromRow);
  let scrapped = [];
  if (authed && cards.length) {
    const { results: s } = await env.DB.prepare(`SELECT ref_id FROM scraps WHERE kind = 'item' AND ref_id IN (${cards.map(() => "?").join(",")})`)
      .bind(...cards.map((c) => String(c.id)))
      .all();
    scrapped = s.map((r) => Number(r.ref_id));
  }
  return json({ day, days, cards, pending: pending.n, scrapped });
}

async function getVideos(env, url, authed) {
  const channel = url.searchParams.get("channel");
  const before = Number(url.searchParams.get("before")) || Date.now() + DAY;
  const limit = 24;
  const [{ results: channels }, { results }] = await Promise.all([
    env.DB.prepare(
      "SELECT c.id, c.title, c.handle, c.thumbnail, (SELECT COUNT(*) FROM videos v WHERE v.channel_id = c.id AND v.status = 'done') AS count FROM channels c ORDER BY c.title",
    ).all(),
    env.DB.prepare(
      `SELECT v.*, c.title AS channel_title, c.thumbnail AS channel_thumbnail FROM videos v JOIN channels c ON c.id = v.channel_id
       WHERE v.status = 'done' AND v.published_at < ? ${channel ? "AND v.channel_id = ?" : ""} ORDER BY v.published_at DESC LIMIT ?`,
    )
      .bind(...(channel ? [before, channel, limit] : [before, limit]))
      .all(),
  ]);
  const videos = results.map(videoFromRow);
  const pending = await env.DB.prepare("SELECT COUNT(*) AS n FROM videos WHERE status = 'new'").first();
  let scrapped = [];
  if (authed && videos.length) {
    const { results: s } = await env.DB.prepare(`SELECT ref_id FROM scraps WHERE kind = 'video' AND ref_id IN (${videos.map(() => "?").join(",")})`)
      .bind(...videos.map((v) => v.id))
      .all();
    scrapped = s.map((r) => r.ref_id);
  }
  return json({
    channels,
    videos,
    pending: pending.n,
    scrapped,
    nextBefore: videos.length === limit ? videos[videos.length - 1].publishedAt : null,
  });
}

async function getReports(env) {
  const { results } = await env.DB.prepare("SELECT week, content FROM reports ORDER BY week DESC LIMIT 12").all();
  return json({ reports: results.map((r) => ({ week: r.week, ...parseJSON(r.content, {}) })) });
}

async function getTypingLeaderboard(env, url) {
  const period = url.searchParams.get("period") || "all";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 30, 100);
  const currentWeek = localWeekStart(timeZone(env));

  let query = "SELECT id, nickname, wpm, accuracy, time_seconds, text_length, mode, created_at FROM typing_scores ";
  let params = [];
  if (period === "week") {
    query += "WHERE week = ? ";
    params.push(currentWeek);
  }
  query += "ORDER BY wpm DESC, accuracy DESC LIMIT ?";
  params.push(limit);

  const [scoresRes, statsRes] = await Promise.all([
    env.DB.prepare(query).bind(...params).all(),
    env.DB.prepare("SELECT COUNT(*) AS total_runs, MAX(wpm) AS max_wpm FROM typing_scores").first(),
  ]);

  return json({
    period,
    currentWeek,
    scores: scoresRes.results || [],
    stats: {
      totalRuns: statsRes?.total_runs || 0,
      maxWpm: statsRes?.max_wpm ? Math.round(statsRes.max_wpm) : 0,
    },
  });
}

async function submitTypingScore(env, request) {
  const body = await readBody(request);
  const nickname = String(body.nickname || "익명 레이서").trim().slice(0, 20) || "익명 레이서";
  const wpm = Number(body.wpm);
  const accuracy = Number(body.accuracy);
  const timeSeconds = Number(body.timeSeconds);
  const textLength = Number(body.textLength);
  const mode = String(body.mode || "race").slice(0, 20);

  if (isNaN(wpm) || wpm < 1 || wpm > 350) return httpError(400, "유효하지 않은 WPM 기록입니다.");
  if (isNaN(accuracy) || accuracy < 0 || accuracy > 100) return httpError(400, "유효하지 않은 정확도입니다.");
  if (isNaN(timeSeconds) || timeSeconds <= 0) return httpError(400, "유효하지 않은 시간입니다.");

  const week = localWeekStart(timeZone(env));
  const now = Date.now();

  const insertRes = await env.DB.prepare(
    "INSERT INTO typing_scores (nickname, wpm, accuracy, time_seconds, text_length, mode, week, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
  )
    .bind(nickname, Math.round(wpm * 10) / 10, Math.round(accuracy * 10) / 10, Math.round(timeSeconds * 10) / 10, textLength, mode, week, now)
    .first();

  const rankRes = await env.DB.prepare(
    "SELECT COUNT(*) + 1 AS rank FROM typing_scores WHERE wpm > ?",
  ).bind(wpm).first();

  return json({
    ok: true,
    id: insertRes?.id,
    rank: rankRes?.rank || 1,
  });
}

// ---------- 비공개 API ----------

async function scrapsApi(env, request, id) {
  const now = Date.now();
  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT s.*, i.url, i.source, i.source_label, i.title, i.headline, i.summary, i.point, i.category, i.tags, i.rank, i.day, i.published_at,
              v.title AS v_title, v.thumbnail AS v_thumbnail, v.one_liner AS v_one_liner, v.summary AS v_summary, v.published_at AS v_published_at, c.title AS v_channel
       FROM scraps s
       LEFT JOIN items i ON s.kind = 'item' AND i.id = CAST(s.ref_id AS INTEGER)
       LEFT JOIN videos v ON s.kind = 'video' AND v.id = s.ref_id
       LEFT JOIN channels c ON c.id = v.channel_id
       ORDER BY s.created_at DESC`,
    ).all();
    return json({
      scraps: results.map((r) => ({
        id: r.id,
        kind: r.kind,
        refId: r.ref_id,
        note: r.note,
        createdAt: r.created_at,
        item: r.kind === "item" && r.title ? cardFromRow({ ...r, id: Number(r.ref_id) }) : null,
        video:
          r.kind === "video" && r.v_title
            ? { id: r.ref_id, title: r.v_title, thumbnail: r.v_thumbnail, oneLiner: r.v_one_liner, summary: parseJSON(r.v_summary, []), channelTitle: r.v_channel, publishedAt: r.v_published_at }
            : null,
      })),
    });
  }
  if (request.method === "POST") {
    const { kind, refId } = await readBody(request);
    if (!["item", "video"].includes(kind) || !refId) return httpError(400, "잘못된 스크랩 요청");
    const row = await env.DB.prepare(
      "INSERT INTO scraps (kind, ref_id, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(kind, ref_id) DO UPDATE SET updated_at = excluded.updated_at RETURNING id",
    )
      .bind(kind, String(refId), now, now)
      .first();
    return json({ id: row.id });
  }
  if (request.method === "PATCH" && id) {
    const { note } = await readBody(request);
    await env.DB.prepare("UPDATE scraps SET note = ?, updated_at = ? WHERE id = ?").bind(String(note ?? ""), now, id).run();
    return json({ ok: true });
  }
  if (request.method === "DELETE") {
    const url = new URL(request.url);
    if (id) await env.DB.prepare("DELETE FROM scraps WHERE id = ?").bind(id).run();
    else await env.DB.prepare("DELETE FROM scraps WHERE kind = ? AND ref_id = ?").bind(url.searchParams.get("kind"), url.searchParams.get("ref")).run();
    return json({ ok: true });
  }
  return httpError(405, "허용되지 않는 요청");
}

function noteFromRow(r) {
  return { id: r.id, title: r.title, body: r.body, status: r.status, tags: parseJSON(r.tags, []), link: r.link, createdAt: r.created_at, updatedAt: r.updated_at };
}

async function notesApi(env, request, id) {
  const now = Date.now();
  if (request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM notes ORDER BY updated_at DESC").all();
    return json({ notes: results.map(noteFromRow) });
  }
  if (request.method === "POST" || (request.method === "PATCH" && id)) {
    const b = await readBody(request);
    const title = String(b.title ?? "").trim();
    if (request.method === "POST" && !title) return httpError(400, "제목을 입력해 주세요.");
    const status = NOTE_STATUSES.includes(b.status) ? b.status : "idea";
    const tags = JSON.stringify((Array.isArray(b.tags) ? b.tags : []).map(String).slice(0, 10));
    if (request.method === "POST") {
      const row = await env.DB.prepare("INSERT INTO notes (title, body, status, tags, link, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *")
        .bind(title, String(b.body ?? ""), status, tags, b.link || null, now, now)
        .first();
      return json({ note: noteFromRow(row) });
    }
    const current = await env.DB.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first();
    if (!current) return httpError(404, "노트를 찾을 수 없어요.");
    const row = await env.DB.prepare("UPDATE notes SET title = ?, body = ?, status = ?, tags = ?, link = ?, updated_at = ? WHERE id = ? RETURNING *")
      .bind(
        title || current.title,
        b.body !== undefined ? String(b.body) : current.body,
        b.status !== undefined ? status : current.status,
        b.tags !== undefined ? tags : current.tags,
        b.link !== undefined ? b.link || null : current.link,
        now,
        id,
      )
      .first();
    return json({ note: noteFromRow(row) });
  }
  if (request.method === "DELETE" && id) {
    await env.DB.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  return httpError(405, "허용되지 않는 요청");
}

async function channelsApi(env, request, id) {
  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM videos v WHERE v.channel_id = c.id AND v.status = 'done') AS done,
              (SELECT COUNT(*) FROM videos v WHERE v.channel_id = c.id AND v.status = 'new') AS pending
       FROM channels c ORDER BY c.added_at DESC`,
    ).all();
    return json({ channels: results });
  }
  if (request.method === "POST") {
    const { input } = await readBody(request);
    if (!input?.trim()) return httpError(400, "채널 주소를 입력해 주세요.");
    try {
      return json({ channel: await addChannel(env, input) });
    } catch (e) {
      return httpError(400, e.message);
    }
  }
  if (request.method === "DELETE" && id) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM scraps WHERE kind = 'video' AND ref_id IN (SELECT id FROM videos WHERE channel_id = ?)").bind(id),
      env.DB.prepare("DELETE FROM videos WHERE channel_id = ?").bind(id),
      env.DB.prepare("DELETE FROM channels WHERE id = ?").bind(id),
    ]);
    return json({ ok: true });
  }
  return httpError(405, "허용되지 않는 요청");
}

async function keywordsApi(env, request, id) {
  if (request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT id, word FROM keywords ORDER BY created_at").all();
    return json({ keywords: results });
  }
  if (request.method === "POST") {
    const word = String((await readBody(request)).word ?? "").trim();
    if (!word || word.length > 40) return httpError(400, "키워드는 1~40자로 입력해 주세요.");
    await env.DB.prepare("INSERT OR IGNORE INTO keywords (word, created_at) VALUES (?, ?)").bind(word, Date.now()).run();
    return keywordsApi(env, new Request(request.url));
  }
  if (request.method === "DELETE" && id) {
    await env.DB.prepare("DELETE FROM keywords WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  return httpError(405, "허용되지 않는 요청");
}

async function statusApi(env) {
  const { day: today, hour } = localParts(timeZone(env));
  const [items, videos, logs, collected] = await Promise.all([
    env.DB.prepare("SELECT status, COUNT(*) AS n FROM items WHERE day = ? GROUP BY status").bind(today).all(),
    env.DB.prepare("SELECT status, COUNT(*) AS n FROM videos GROUP BY status").all(),
    env.DB.prepare("SELECT at, level, message FROM logs ORDER BY id DESC LIMIT 40").all(),
    getState(env, "collected:last"),
  ]);
  const toMap = (rows) => Object.fromEntries(rows.results.map((r) => [r.status, r.n]));
  return json({
    today,
    hasKey: hasLLM(env),
    hasPassword: Boolean(env.ADMIN_PASSWORD),
    model: modelName(env),
    dailyCards: dailyCardCount(env),
    collectHour: collectHourOf(env),
    collectInterval: collectIntervalOf(env),
    nextCollectHour: collectSlot(env, today, hour).nextHour,
    timeZone: timeZone(env),
    collectedAt: collected ? Number(collected) : null,
    sources: SOURCES.map((s) => ({ label: s.label, needs: s.needs || null })),
    integrations: sourceAvailability(env),
    items: toMap(items),
    videos: toMap(videos),
    logs: logs.results,
  });
}

async function runApi(env, request) {
  const { job } = await readBody(request);
  if (job === "report") {
    // 수동 실행은 이번 주 월요일부터 지금까지를 정리한다
    const week = localWeekStart(timeZone(env));
    const report = await buildWeeklyReport(env, week);
    return json({ result: report ? `주간 리포트 생성: ${week}` : "리포트를 만들 데이터가 아직 없어요." });
  }
  if (job === "backfill") {
    const { found, inserted } = await backfillIdeas(env, 7);
    return json({ result: `지난 7일치 ${found}건 수집, 새 글 ${inserted}건 저장` });
  }
  const result = await tick(env, { forceCollect: job === "collect" });
  return json({ result: result || "지금 처리할 작업이 없어요." });
}

async function handleApi(request, env, url) {
  const path = url.pathname.replace(/\/+$/, "");
  const authed = await isAuthed(request, env);

  if (path === "/api/me") return json({ authed });
  if (path === "/api/login" && request.method === "POST") {
    const { password } = await readBody(request);
    if (!(await checkPassword(env, password))) {
      await new Promise((r) => setTimeout(r, 800));
      return httpError(401, env.ADMIN_PASSWORD ? "비밀번호가 맞지 않아요." : "ADMIN_PASSWORD가 설정되지 않았어요.");
    }
    return json({ ok: true }, { headers: { "set-cookie": await sessionCookie(env, url.protocol === "https:") } });
  }
  if (path === "/api/logout" && request.method === "POST") return json({ ok: true }, { headers: { "set-cookie": clearCookie() } });
  if (path === "/api/ideas") return getIdeas(env, url, authed);
  if (path === "/api/videos") return getVideos(env, url, authed);
  if (path === "/api/reports") return getReports(env);
  if (path === "/api/typing/leaderboard") return getTypingLeaderboard(env, url);
  if (path === "/api/typing/scores" && request.method === "POST") return submitTypingScore(env, request);

  const m = path.match(/^\/api\/p\/([a-z]+)(?:\/([^/]+))?$/);
  if (!m) return httpError(404, "없는 API");
  if (!authed) return httpError(401, "로그인이 필요해요.");
  const [, resource, id] = m;
  if (resource === "scraps") return scrapsApi(env, request, id);
  if (resource === "notes") return notesApi(env, request, id);
  if (resource === "channels") return channelsApi(env, request, id);
  if (resource === "keywords") return keywordsApi(env, request, id);
  if (resource === "status") return statusApi(env);
  if (resource === "run" && request.method === "POST") return runApi(env, request);
  return httpError(404, "없는 API");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        console.error(e);
        return httpError(500, e.message || "서버 오류");
      }
    }
    if (PRIVATE_PAGES.test(url.pathname) && !(await isAuthed(request, env))) {
      const next = encodeURIComponent(url.pathname.replace(/\.(html|txt)$/, ""));
      return Response.redirect(`${url.origin}/login?next=${next}`, 302);
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(tick(env));
  },
};
