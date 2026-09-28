import { lunarAnniversary, solarToLunar } from "./lunar.js";
import { addDays, httpError, json, parseJSON } from "./util.js";

// 우리집 보드: 이번 주 할 일(반복 포함), 기억할 정보, 기념일(음력 포함).
// 'family' 항목은 가족 누구나 고치고, 'private' 항목은 만든 사람만 보고 고친다.

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const VISIBLE = "(visibility = 'family' OR owner_id = ?)";
export const NOTE_CATEGORIES = ["contact", "school", "home", "health", "rules", "etc"];
const DATE_KINDS = ["birthday", "anniversary", "memorial", "other"];
const OVERDUE_DAYS = 7;
const UPCOMING_DAYS = 60;
const NOTE_HISTORY = 10;

function weekdayOf(day) {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

function mondayOf(day) {
  return addDays(day, -((weekdayOf(day) + 6) % 7));
}

function lastDayOfMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// 할 일이 그날 있는지. 격주는 시작일이 있는 주(월요일 기준)부터 두 주마다, 매월 31일은 짧은 달엔 말일.
export function occursOn(task, day) {
  if (day < task.start_day || (task.end_day && day > task.end_day)) return false;
  if (task.repeat === "none") return day === task.start_day;
  if (task.repeat === "monthly") {
    const [y, m, d] = day.split("-").map(Number);
    return d === Math.min(task.month_day, lastDayOfMonth(y, m));
  }
  if (!parseJSON(task.weekdays, []).includes(weekdayOf(day))) return false;
  return task.repeat === "weekly" || (daysBetween(mondayOf(task.start_day), mondayOf(day)) / 7) % 2 === 0;
}

// 기념일이 from 이후(당일 포함) 처음 돌아오는 양력 날짜
export function nextOccurrence(rec, from) {
  const y = Number(from.slice(0, 4));
  const candidates = [y - 1, y, y + 1].map((year) => {
    if (rec.calendar === "lunar") return lunarAnniversary(year, rec.month, rec.day);
    // 2월 29일 기념일은 평년엔 2월 28일
    const day = Math.min(rec.day, lastDayOfMonth(year, rec.month));
    return `${year}-${String(rec.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
  return candidates.filter((d) => d && d >= from).sort()[0] || null;
}

function dateFromRow(r, from, me) {
  const next = nextOccurrence(r, from);
  const yearOfNext = next && (r.calendar === "lunar" ? solarToLunar(next).year : Number(next.slice(0, 4)));
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    calendar: r.calendar,
    month: r.month,
    day: r.day,
    year: r.year,
    visibility: r.visibility,
    mine: r.owner_id === me.id,
    next,
    dDay: next ? daysBetween(from, next) : null,
    // 몇 번째 생일·주년·기일인지 (처음 해를 알 때만)
    count: next && r.year ? yearOfNext - r.year : null,
  };
}

function taskFromRow(r, me) {
  return {
    id: r.id,
    title: r.title,
    note: r.note,
    visibility: r.visibility,
    mine: r.owner_id === me.id,
    assigneeId: r.assignee_id,
    repeat: r.repeat,
    weekdays: parseJSON(r.weekdays, []),
    monthDay: r.month_day,
    startDay: r.start_day,
    endDay: r.end_day,
  };
}

function noteFromRow(r, me) {
  return {
    id: r.id,
    category: r.category,
    title: r.title,
    body: r.body,
    pinned: Boolean(r.pinned),
    visibility: r.visibility,
    mine: r.owner_id === me.id,
    updatedBy: r.updated_by,
    updatedAt: r.updated_at,
  };
}

function readVisibility(v, current) {
  const visibility = v ?? current;
  return ["private", "family"].includes(visibility) ? visibility : null;
}

// ---------- 할 일 ----------

async function visibleTasks(env, me) {
  const { results } = await env.DB.prepare(`SELECT * FROM family_tasks WHERE ${VISIBLE} ORDER BY created_at`).bind(me.id).all();
  return results;
}

// 그 기간에 있는 할 일 목록 [{ taskId, day, done }]
async function occurrences(env, tasks, from, to) {
  if (!tasks.length || from > to) return [];
  const ids = tasks.map((t) => t.id);
  const { results } = await env.DB.prepare(
    `SELECT * FROM family_task_done WHERE day BETWEEN ? AND ? AND task_id IN (${ids.map(() => "?").join(",")})`,
  )
    .bind(from, to, ...ids)
    .all();
  const done = new Map(results.map((d) => [`${d.task_id}:${d.day}`, d]));
  const list = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    for (const t of tasks) {
      if (!occursOn(t, day)) continue;
      const d = done.get(`${t.id}:${day}`);
      list.push({ taskId: t.id, day, done: d ? { memberId: d.member_id, at: d.done_at } : null });
    }
  }
  return list;
}

async function visibleDates(env, me) {
  const { results } = await env.DB.prepare(`SELECT * FROM family_dates WHERE ${VISIBLE} ORDER BY month, day`).bind(me.id).all();
  return results;
}

// 한 주(월~일) 보기: 날짜별 할 일과 기념일, 오늘 기준 밀린 일, 다가오는 기념일
async function weekView(env, me, url) {
  const today = url.searchParams.get("today");
  const start = url.searchParams.get("start");
  if (!DAY_RE.test(today || "") || !DAY_RE.test(start || "")) return httpError(400, "날짜 형식이 잘못됐어요.");
  const end = addDays(start, 6);
  const [tasks, dates] = await Promise.all([visibleTasks(env, me), visibleDates(env, me)]);
  const [week, overdue] = await Promise.all([
    occurrences(env, tasks, start, end),
    occurrences(env, tasks, addDays(today, -OVERDUE_DAYS), addDays(today, -1)),
  ]);
  const inWeek = dates.map((r) => dateFromRow(r, start, me)).filter((d) => d.next && d.next <= end);
  const upcoming = dates
    .map((r) => dateFromRow(r, today, me))
    .filter((d) => d.next && d.dDay <= UPCOMING_DAYS)
    .sort((a, b) => a.dDay - b.dDay);
  return json({
    start,
    today,
    tasks: tasks.map((t) => taskFromRow(t, me)),
    days: Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, i);
      return { day, items: week.filter((o) => o.day === day), dates: inWeek.filter((d) => d.next === day) };
    }),
    overdue: overdue.filter((o) => !o.done),
    upcoming,
  });
}

async function readTask(env, me, b, current) {
  const title = String(b.title ?? current?.title ?? "").trim();
  if (!title || title.length > 100) return { error: "할 일은 1~100자로 적어 주세요." };
  const note = String(b.note ?? current?.note ?? "").trim().slice(0, 1000);
  const visibility = readVisibility(b.visibility, current?.visibility);
  if (!visibility) return { error: "공개 범위가 잘못됐어요." };
  const repeat = b.repeat ?? current?.repeat;
  if (!["none", "weekly", "biweekly", "monthly"].includes(repeat)) return { error: "반복 방식이 잘못됐어요." };
  const startDay = b.startDay ?? current?.start_day;
  if (!DAY_RE.test(startDay || "")) return { error: "날짜를 골라 주세요." };
  const endDay = b.endDay !== undefined ? b.endDay || null : current?.end_day ?? null;
  if (endDay && (!DAY_RE.test(endDay) || endDay < startDay)) return { error: "끝나는 날이 시작일보다 빨라요." };
  const weekdays = [...new Set((b.weekdays ?? parseJSON(current?.weekdays, [])).map(Number))].filter((d) => d >= 0 && d <= 6).sort();
  if ((repeat === "weekly" || repeat === "biweekly") && !weekdays.length) return { error: "반복할 요일을 골라 주세요." };
  const monthDay = repeat === "monthly" ? Math.min(Math.max(Number(b.monthDay ?? current?.month_day ?? startDay.slice(8)) || 1, 1), 31) : null;
  // 나만 보는 할 일은 내 담당. 가족 할 일은 '모두'(NULL)이거나 구성원 한 명.
  let assignee = visibility === "private" ? me.id : b.assigneeId !== undefined ? b.assigneeId : current?.assignee_id ?? null;
  if (visibility === "family" && assignee !== null) {
    const exists = await env.DB.prepare("SELECT id FROM family_members WHERE id = ?").bind(Number(assignee)).first();
    if (!exists) return { error: "담당자를 찾을 수 없어요." };
    assignee = exists.id;
  }
  return { title, note, visibility, repeat, startDay, endDay, weekdays: repeat === "weekly" || repeat === "biweekly" ? weekdays : [], monthDay, assignee };
}

async function tasksApi(env, me, request, id, child) {
  const now = Date.now();
  if (request.method === "POST" && !id) {
    const t = await readTask(env, me, await request.json());
    if (t.error) return httpError(400, t.error);
    const row = await env.DB.prepare(
      `INSERT INTO family_tasks (owner_id, visibility, title, note, assignee_id, repeat, weekdays, month_day, start_day, end_day, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    )
      .bind(me.id, t.visibility, t.title, t.note, t.assignee, t.repeat, JSON.stringify(t.weekdays), t.monthDay, t.startDay, t.endDay, now, now)
      .first();
    return json({ task: taskFromRow(row, me) });
  }
  const current = id && (await env.DB.prepare(`SELECT * FROM family_tasks WHERE id = ? AND ${VISIBLE}`).bind(Number(id), me.id).first());
  if (!current) return httpError(404, "할 일을 찾을 수 없어요.");
  // 완료 표시: 그날 할 일인지 확인하고 누가 했는지 남긴다
  if (child === "done" && request.method === "PUT") {
    const { day, done } = await request.json();
    if (!DAY_RE.test(day || "") || !occursOn(current, day)) return httpError(400, "그날은 이 할 일이 없어요.");
    if (done) {
      await env.DB.prepare("INSERT OR REPLACE INTO family_task_done (task_id, day, member_id, done_at) VALUES (?, ?, ?, ?)").bind(current.id, day, me.id, now).run();
    } else {
      await env.DB.prepare("DELETE FROM family_task_done WHERE task_id = ? AND day = ?").bind(current.id, day).run();
    }
    return json({ done: done ? { memberId: me.id, at: now } : null });
  }
  if (child) return httpError(404, "없는 API");
  if (request.method === "PATCH") {
    const t = await readTask(env, me, await request.json(), current);
    if (t.error) return httpError(400, t.error);
    // 나만 보기는 만든 사람만 바꿀 수 있다 (가족 할 일을 남이 비공개로 가져가지 못하게)
    if (t.visibility !== current.visibility && current.owner_id !== me.id) return httpError(403, "만든 사람만 공개 범위를 바꿀 수 있어요.");
    const row = await env.DB.prepare(
      `UPDATE family_tasks SET visibility = ?, title = ?, note = ?, assignee_id = ?, repeat = ?, weekdays = ?, month_day = ?, start_day = ?, end_day = ?, updated_at = ?
       WHERE id = ? RETURNING *`,
    )
      .bind(t.visibility, t.title, t.note, t.assignee, t.repeat, JSON.stringify(t.weekdays), t.monthDay, t.startDay, t.endDay, now, current.id)
      .first();
    return json({ task: taskFromRow(row, me) });
  }
  if (request.method === "DELETE") {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM family_task_done WHERE task_id = ?").bind(current.id),
      env.DB.prepare("DELETE FROM family_tasks WHERE id = ?").bind(current.id),
    ]);
    return json({ ok: true });
  }
  return httpError(405, "허용되지 않는 요청");
}

// ---------- 기억할 정보 ----------

async function notesApi(env, me, request, id, child) {
  const now = Date.now();
  if (request.method === "GET" && !id) {
    const { results } = await env.DB.prepare(`SELECT * FROM family_notes WHERE ${VISIBLE} ORDER BY pinned DESC, updated_at DESC`).bind(me.id).all();
    return json({ notes: results.map((r) => noteFromRow(r, me)) });
  }
  const read = (b, current) => {
    const title = String(b.title ?? current?.title ?? "").trim();
    if (!title || title.length > 100) return { error: "제목은 1~100자로 적어 주세요." };
    const body = String(b.body ?? current?.body ?? "").slice(0, 5000);
    const category = NOTE_CATEGORIES.includes(b.category) ? b.category : current?.category || "etc";
    const visibility = readVisibility(b.visibility, current?.visibility);
    if (!visibility) return { error: "공개 범위가 잘못됐어요." };
    const pinned = b.pinned !== undefined ? (b.pinned ? 1 : 0) : current?.pinned ?? 0;
    return { title, body, category, visibility, pinned };
  };
  if (request.method === "POST" && !id) {
    const n = read(await request.json());
    if (n.error) return httpError(400, n.error);
    const row = await env.DB.prepare(
      "INSERT INTO family_notes (owner_id, visibility, category, title, body, pinned, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
    )
      .bind(me.id, n.visibility, n.category, n.title, n.body, n.pinned, me.id, now, now)
      .first();
    return json({ note: noteFromRow(row, me) });
  }
  const current = id && (await env.DB.prepare(`SELECT * FROM family_notes WHERE id = ? AND ${VISIBLE}`).bind(Number(id), me.id).first());
  if (!current) return httpError(404, "정보를 찾을 수 없어요.");
  if (child === "history" && request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM family_note_history WHERE note_id = ? ORDER BY id DESC").bind(current.id).all();
    return json({ history: results.map((h) => ({ id: h.id, title: h.title, body: h.body, updatedBy: h.updated_by, updatedAt: h.updated_at })) });
  }
  if (child) return httpError(404, "없는 API");
  if (request.method === "PATCH") {
    const n = read(await request.json(), current);
    if (n.error) return httpError(400, n.error);
    if (n.visibility !== current.visibility && current.owner_id !== me.id) return httpError(403, "만든 사람만 공개 범위를 바꿀 수 있어요.");
    const changed = n.title !== current.title || n.body !== current.body;
    // 내용이 바뀔 때만 이전 내용을 남긴다 (고정·분류만 바꿀 때는 남기지 않음)
    const statements = changed
      ? [
          env.DB.prepare("INSERT INTO family_note_history (note_id, title, body, updated_by, updated_at) VALUES (?, ?, ?, ?, ?)").bind(
            current.id,
            current.title,
            current.body,
            current.updated_by,
            current.updated_at,
          ),
          env.DB.prepare(
            `DELETE FROM family_note_history WHERE note_id = ? AND id NOT IN (SELECT id FROM family_note_history WHERE note_id = ? ORDER BY id DESC LIMIT ${NOTE_HISTORY})`,
          ).bind(current.id, current.id),
        ]
      : [];
    await env.DB.batch([
      ...statements,
      env.DB.prepare("UPDATE family_notes SET visibility = ?, category = ?, title = ?, body = ?, pinned = ?, updated_by = ?, updated_at = ? WHERE id = ?").bind(
        n.visibility,
        n.category,
        n.title,
        n.body,
        n.pinned,
        changed ? me.id : current.updated_by,
        changed ? now : current.updated_at,
        current.id,
      ),
    ]);
    const row = await env.DB.prepare("SELECT * FROM family_notes WHERE id = ?").bind(current.id).first();
    return json({ note: noteFromRow(row, me) });
  }
  if (request.method === "DELETE") {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM family_note_history WHERE note_id = ?").bind(current.id),
      env.DB.prepare("DELETE FROM family_notes WHERE id = ?").bind(current.id),
    ]);
    return json({ ok: true });
  }
  return httpError(405, "허용되지 않는 요청");
}

// ---------- 기념일 ----------

async function datesApi(env, me, request, id, url) {
  const now = Date.now();
  const today = url.searchParams.get("today");
  const from = DAY_RE.test(today || "") ? today : new Date().toISOString().slice(0, 10);
  if (request.method === "GET" && !id) {
    const list = (await visibleDates(env, me)).map((r) => dateFromRow(r, from, me)).sort((a, b) => (a.dDay ?? 9999) - (b.dDay ?? 9999));
    return json({ dates: list });
  }
  const read = (b, current) => {
    const title = String(b.title ?? current?.title ?? "").trim();
    if (!title || title.length > 60) return { error: "이름은 1~60자로 적어 주세요." };
    const kind = DATE_KINDS.includes(b.kind) ? b.kind : current?.kind || "other";
    const calendar = ["solar", "lunar"].includes(b.calendar) ? b.calendar : current?.calendar || "solar";
    const month = Number(b.month ?? current?.month);
    const day = Number(b.day ?? current?.day);
    const maxDay = calendar === "lunar" ? 30 : lastDayOfMonth(2024, month);
    if (!(month >= 1 && month <= 12) || !(day >= 1 && day <= maxDay)) return { error: "날짜가 잘못됐어요." };
    const yearRaw = b.year !== undefined ? b.year : current?.year;
    const year = yearRaw ? Number(yearRaw) : null;
    if (year !== null && !(year >= 1850 && year <= 2200)) return { error: "처음 해가 잘못됐어요." };
    const visibility = readVisibility(b.visibility, current?.visibility);
    if (!visibility) return { error: "공개 범위가 잘못됐어요." };
    return { title, kind, calendar, month, day, year, visibility };
  };
  if (request.method === "POST" && !id) {
    const d = read(await request.json());
    if (d.error) return httpError(400, d.error);
    const row = await env.DB.prepare(
      "INSERT INTO family_dates (owner_id, visibility, kind, title, calendar, month, day, year, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
    )
      .bind(me.id, d.visibility, d.kind, d.title, d.calendar, d.month, d.day, d.year, now, now)
      .first();
    return json({ date: dateFromRow(row, from, me) });
  }
  const current = id && (await env.DB.prepare(`SELECT * FROM family_dates WHERE id = ? AND ${VISIBLE}`).bind(Number(id), me.id).first());
  if (!current) return httpError(404, "기념일을 찾을 수 없어요.");
  if (request.method === "PATCH") {
    const d = read(await request.json(), current);
    if (d.error) return httpError(400, d.error);
    if (d.visibility !== current.visibility && current.owner_id !== me.id) return httpError(403, "만든 사람만 공개 범위를 바꿀 수 있어요.");
    const row = await env.DB.prepare(
      "UPDATE family_dates SET visibility = ?, kind = ?, title = ?, calendar = ?, month = ?, day = ?, year = ?, updated_at = ? WHERE id = ? RETURNING *",
    )
      .bind(d.visibility, d.kind, d.title, d.calendar, d.month, d.day, d.year, now, current.id)
      .first();
    return json({ date: dateFromRow(row, from, me) });
  }
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM family_dates WHERE id = ?").bind(current.id).run();
    return json({ ok: true });
  }
  return httpError(405, "허용되지 않는 요청");
}

// ---------- 아침 요약 ----------

// 그날 내가 할 일(내 담당이거나 '모두')과 곧 다가오는 기념일(당일·1·3·7일 전)
export async function digestFor(env, me, today) {
  const [tasks, dates] = await Promise.all([visibleTasks(env, me), visibleDates(env, me)]);
  const mineTasks = tasks.filter((t) => t.assignee_id === null || t.assignee_id === me.id);
  const todo = (await occurrences(env, mineTasks, today, today)).filter((o) => !o.done);
  const byId = new Map(mineTasks.map((t) => [t.id, t]));
  return {
    tasks: todo.map((o) => byId.get(o.taskId).title),
    dates: dates
      .map((r) => dateFromRow(r, today, me))
      .filter((d) => [0, 1, 3, 7].includes(d.dDay))
      .sort((a, b) => a.dDay - b.dDay)
      .map((d) => ({ title: d.title, dDay: d.dDay, kind: d.kind })),
  };
}

// /api/family/board/...
export async function handleBoard(env, me, request, url, sub) {
  if (sub === "/week" && request.method === "GET") return weekView(env, me, url);
  const m = sub.match(/^\/(tasks|notes|dates)(?:\/(\d+))?(?:\/(done|history))?$/);
  if (!m) return httpError(404, "없는 API");
  const [, resource, id, child] = m;
  if (resource === "tasks") return tasksApi(env, me, request, id, child);
  if (resource === "notes") return notesApi(env, me, request, id, child);
  if (child) return httpError(404, "없는 API");
  return datesApi(env, me, request, id, url);
}

// 구성원을 지울 때 그 사람의 비공개 항목과 알림 구독을 지우고, 가족 항목의 담당은 '모두'로 돌린다
export function boardCleanupStatements(env, memberId) {
  return [
    env.DB.prepare("DELETE FROM family_task_done WHERE task_id IN (SELECT id FROM family_tasks WHERE owner_id = ? AND visibility = 'private')").bind(memberId),
    env.DB.prepare("DELETE FROM family_tasks WHERE owner_id = ? AND visibility = 'private'").bind(memberId),
    env.DB.prepare("UPDATE family_tasks SET assignee_id = NULL WHERE assignee_id = ?").bind(memberId),
    env.DB.prepare("DELETE FROM family_note_history WHERE note_id IN (SELECT id FROM family_notes WHERE owner_id = ? AND visibility = 'private')").bind(memberId),
    env.DB.prepare("DELETE FROM family_notes WHERE owner_id = ? AND visibility = 'private'").bind(memberId),
    env.DB.prepare("DELETE FROM family_dates WHERE owner_id = ? AND visibility = 'private'").bind(memberId),
    env.DB.prepare("DELETE FROM family_push WHERE member_id = ?").bind(memberId),
  ];
}
