"use client";

import { useState } from "react";
import { api } from "../../../lib/api";
import { REPEATS, WEEK_ORDER, WEEKDAY_LABELS, weekdayOf } from "../../../lib/family";

// 할 일 추가·고치기. 반복이면 요일(매주·격주) 또는 날짜(매월)를 고른다.
export default function TaskForm({ task, day, me, members, onSaved, onDeleted, onCancel }) {
  const [title, setTitle] = useState(task?.title || "");
  const [note, setNote] = useState(task?.note || "");
  const [visibility, setVisibility] = useState(task?.visibility || "family");
  const [assigneeId, setAssigneeId] = useState(task ? task.assigneeId : null);
  const [repeat, setRepeat] = useState(task?.repeat || "none");
  const [startDay, setStartDay] = useState(task?.startDay || day);
  const [weekdays, setWeekdays] = useState(task?.weekdays?.length ? task.weekdays : [weekdayOf(day)]);
  const [monthDay, setMonthDay] = useState(task?.monthDay || Number(day.slice(8)));
  const [endDay, setEndDay] = useState(task?.endDay || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { title, note, visibility, assigneeId, repeat, startDay, weekdays, monthDay, endDay: repeat === "none" ? null : endDay || null };
      const res = task ? await api(`/api/family/board/tasks/${task.id}`, { method: "PATCH", body }) : await api("/api/family/board/tasks", { method: "POST", body });
      onSaved(res.task);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(task.repeat === "none" ? "이 할 일을 지울까요?" : "반복 할 일 전체를 지울까요? 지난 완료 기록도 함께 지워져요.")) return;
    await api(`/api/family/board/tasks/${task.id}`, { method: "DELETE" });
    onDeleted(task.id);
  }

  const toggleDay = (d) => setWeekdays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]));

  return (
    <form className="panel stack boardForm" onSubmit={submit}>
      <h3 className="panelTitle">{task ? "할 일 고치기" : "할 일 추가"}</h3>
      <input className="input" placeholder="할 일 (예: 분리수거)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} autoFocus />
      <input className="input" placeholder="메모 (선택)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />

      <div className="boardFormRow">
        <span className="boardLabel">공개</span>
        <div className="famSeg">
          <button type="button" className={visibility === "family" ? "on" : ""} onClick={() => setVisibility("family")}>
            👨‍👩‍👧 가족 할 일
          </button>
          <button type="button" className={visibility === "private" ? "on" : ""} onClick={() => setVisibility("private")} disabled={task && !task.mine}>
            🔒 나만 보기
          </button>
        </div>
      </div>

      {visibility === "family" ? (
        <div className="boardFormRow">
          <span className="boardLabel">담당</span>
          <div className="chips">
            <button type="button" className={`chip${assigneeId === null ? " on" : ""}`} onClick={() => setAssigneeId(null)}>
              모두
            </button>
            {members.map((m) => (
              <button key={m.id} type="button" className={`chip${assigneeId === m.id ? " on" : ""}`} onClick={() => setAssigneeId(m.id)}>
                {m.emoji} {m.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="boardFormRow">
        <span className="boardLabel">반복</span>
        <div className="famSeg">
          {REPEATS.map(([id, label]) => (
            <button key={id} type="button" className={repeat === id ? "on" : ""} onClick={() => setRepeat(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {repeat === "weekly" || repeat === "biweekly" ? (
        <div className="boardFormRow">
          <span className="boardLabel">요일</span>
          <div className="boardWeekdays">
            {WEEK_ORDER.map((d) => (
              <button key={d} type="button" className={weekdays.includes(d) ? "on" : ""} onClick={() => toggleDay(d)} aria-pressed={weekdays.includes(d)}>
                {WEEKDAY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {repeat === "monthly" ? (
        <div className="boardFormRow">
          <span className="boardLabel">날짜</span>
          <label className="row">
            매월
            <input className="input boardNum" type="number" min={1} max={31} value={monthDay} onChange={(e) => setMonthDay(e.target.value)} />일
          </label>
        </div>
      ) : null}

      <div className="boardFormRow">
        <span className="boardLabel">{repeat === "none" ? "날짜" : "시작"}</span>
        <input className="input boardDate" type="date" value={startDay} onChange={(e) => setStartDay(e.target.value)} required />
        {repeat !== "none" ? (
          <>
            <span className="muted">~</span>
            <input className="input boardDate" type="date" value={endDay} min={startDay} onChange={(e) => setEndDay(e.target.value)} aria-label="끝나는 날 (선택)" />
          </>
        ) : null}
      </div>
      {repeat === "biweekly" ? <p className="muted boardHint">시작일이 있는 주부터 두 주마다 반복해요.</p> : null}

      {error ? <p className="error">{error}</p> : null}
      <div className="row">
        <button className="btn small brand" disabled={busy || !title.trim()}>
          {task ? "저장" : "추가"}
        </button>
        <button type="button" className="btn small ghost" onClick={onCancel}>
          취소
        </button>
        <span className="famSpacer" />
        {task ? (
          <button type="button" className="btn small danger" onClick={remove}>
            지우기
          </button>
        ) : null}
      </div>
    </form>
  );
}
