"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { DATE_KINDS, WEEKDAY_LABELS, addDays, countLabel, dDayLabel, mondayOf, repeatLabel, weekdayOf } from "../../../lib/family";
import { todayLocal } from "../../../lib/format";
import Avatar from "../Avatar";
import TaskForm from "./TaskForm";

const KIND_ICON = Object.fromEntries(DATE_KINDS.map(([id, icon]) => [id, icon]));

function shortDate(day) {
  const [, m, d] = day.split("-").map(Number);
  return `${m}/${d}`;
}

function TaskRow({ occ, task, byId, me, onToggle, onEdit, showDay }) {
  const assignee = task.assigneeId ? byId.get(task.assigneeId) : null;
  const doneBy = occ.done ? byId.get(occ.done.memberId) : null;
  return (
    <div className={`boardTask${occ.done ? " done" : ""}`}>
      <button type="button" className="boardCheck" onClick={() => onToggle(occ, task)} aria-pressed={Boolean(occ.done)} aria-label={`${task.title} ${occ.done ? "완료 취소" : "완료"}`}>
        {occ.done ? "✓" : ""}
      </button>
      <button type="button" className="boardTaskMain" onClick={() => onEdit(task)}>
        <span className="boardTaskTitle">
          {showDay ? <span className="boardTaskDay">{shortDate(occ.day)}</span> : null}
          {task.title}
        </span>
        <span className="boardTaskMeta">
          {task.visibility === "private" ? "🔒 나만" : assignee ? `${assignee.emoji} ${assignee.name}` : "👨‍👩‍👧 모두"}
          {task.repeat !== "none" ? ` · 🔁 ${repeatLabel(task)}` : ""}
          {doneBy ? ` · ${doneBy.name} 완료` : ""}
          {task.note ? ` · ${task.note}` : ""}
        </span>
      </button>
      {assignee && task.visibility === "family" ? <Avatar member={assignee} size={26} /> : null}
    </div>
  );
}

export default function WeekTasks({ me, members }) {
  const today = todayLocal();
  const [start, setStart] = useState(() => mondayOf(today));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [version, setVersion] = useState(0);
  const byId = new Map(members.map((m) => [m.id, m]));

  useEffect(() => {
    let alive = true;
    api(`/api/family/board/week?start=${start}&today=${today}`)
      .then((d) => alive && (setData(d), setError("")))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [start, version]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 420 }} />;

  const tasks = new Map(data.tasks.map((t) => [t.id, t]));
  const show = (occ) => {
    const t = tasks.get(occ.taskId);
    if (filter === "mine") return t.visibility === "private" || t.assigneeId === null || t.assigneeId === me.id;
    if (filter === "private") return t.visibility === "private";
    return true;
  };

  async function toggle(occ, task) {
    const done = !occ.done;
    const res = await api(`/api/family/board/tasks/${task.id}/done`, { method: "PUT", body: { day: occ.day, done } });
    const flip = (o) => (o.taskId === occ.taskId && o.day === occ.day ? { ...o, done: res.done } : o);
    setData((d) => ({
      ...d,
      days: d.days.map((x) => ({ ...x, items: x.items.map(flip) })),
      overdue: done ? d.overdue.filter((o) => !(o.taskId === occ.taskId && o.day === occ.day)) : d.overdue,
    }));
  }

  const reload = () => {
    setEditing(null);
    setVersion((v) => v + 1);
  };

  if (editing) {
    return (
      <TaskForm
        task={editing.task}
        day={editing.day}
        me={me}
        members={members}
        onSaved={reload}
        onDeleted={reload}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const overdue = data.overdue.filter(show);
  const thisWeek = start === mondayOf(today);

  return (
    <div className="boardWeek">
      {data.upcoming.length ? (
        <div className="boardUpcoming">
          {data.upcoming.map((d) => (
            <span key={d.id} className={`boardDday${d.dDay <= 3 ? " soon" : ""}`}>
              {KIND_ICON[d.kind]} {d.title} <b>{dDayLabel(d.dDay)}</b>
            </span>
          ))}
        </div>
      ) : null}

      <div className="boardWeekHead">
        <div className="boardWeekNav">
          <button type="button" className="iconBtn" onClick={() => setStart(addDays(start, -7))} aria-label="지난주">
            ‹
          </button>
          <b>
            {shortDate(start)} ~ {shortDate(addDays(start, 6))}
          </b>
          <button type="button" className="iconBtn" onClick={() => setStart(addDays(start, 7))} aria-label="다음 주">
            ›
          </button>
          {!thisWeek ? (
            <button type="button" className="btn small ghost" onClick={() => setStart(mondayOf(today))}>
              이번 주
            </button>
          ) : null}
        </div>
        <button type="button" className="btn small brand" onClick={() => setEditing({ day: thisWeek ? today : start })}>
          + 할 일
        </button>
      </div>

      <div className="chips boardFilter">
        {[
          ["all", "전체"],
          ["mine", "내 할 일"],
          ["private", "🔒 나만 보기"],
        ].map(([id, label]) => (
          <button key={id} type="button" className={`chip${filter === id ? " on" : ""}`} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>

      {overdue.length ? (
        <section className="boardDay overdue">
          <header>
            <b>⏰ 밀린 일</b>
            <span className="muted">지난 7일 동안 못 한 일</span>
          </header>
          {overdue.map((o) => (
            <TaskRow key={`${o.taskId}:${o.day}`} occ={o} task={tasks.get(o.taskId)} byId={byId} me={me} onToggle={toggle} onEdit={(task) => setEditing({ task, day: o.day })} showDay />
          ))}
        </section>
      ) : null}

      {data.days.map(({ day, items, dates }) => {
        const list = items.filter(show);
        const isToday = day === today;
        return (
          <section key={day} className={`boardDay${isToday ? " today" : ""}${day < today ? " past" : ""}`}>
            <header>
              <b>
                {WEEKDAY_LABELS[weekdayOf(day)]} {shortDate(day)}
              </b>
              {isToday ? <span className="famNew">오늘</span> : null}
              <span className="famSpacer" />
              <button type="button" className="boardAdd" onClick={() => setEditing({ day })} aria-label={`${shortDate(day)}에 할 일 추가`}>
                +
              </button>
            </header>
            {dates.map((d) => (
              <div key={`d${d.id}`} className="boardDateRow">
                {KIND_ICON[d.kind]} <b>{d.title}</b>
                <span className="muted">
                  {d.calendar === "lunar" ? ` 음력 ${d.month}월 ${d.day}일` : ""}
                  {countLabel(d.kind, d.count) ? ` · ${countLabel(d.kind, d.count)}` : ""}
                </span>
              </div>
            ))}
            {list.map((o) => (
              <TaskRow key={o.taskId} occ={o} task={tasks.get(o.taskId)} byId={byId} me={me} onToggle={toggle} onEdit={(task) => setEditing({ task, day })} />
            ))}
            {!list.length && !dates.length ? <p className="boardEmpty">할 일 없음</p> : null}
          </section>
        );
      })}
    </div>
  );
}
