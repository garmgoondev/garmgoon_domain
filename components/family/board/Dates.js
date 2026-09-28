"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { DATE_KINDS, countLabel, dDayLabel } from "../../../lib/family";
import { formatDay, todayLocal } from "../../../lib/format";

const KIND = Object.fromEntries(DATE_KINDS.map(([id, icon, label]) => [id, { icon, label }]));

function DateForm({ date, onSaved, onDeleted, onCancel }) {
  const [title, setTitle] = useState(date?.title || "");
  const [kind, setKind] = useState(date?.kind || "birthday");
  const [calendar, setCalendar] = useState(date?.calendar || "solar");
  const [month, setMonth] = useState(date?.month || 1);
  const [day, setDay] = useState(date?.day || 1);
  const [year, setYear] = useState(date?.year || "");
  const [visibility, setVisibility] = useState(date?.visibility || "family");
  const [error, setError] = useState("");
  const maxDay = calendar === "lunar" ? 30 : new Date(Date.UTC(2024, month, 0)).getUTCDate();

  async function submit(e) {
    e.preventDefault();
    try {
      const body = { title, kind, calendar, month, day: Math.min(day, maxDay), year: year || null, visibility };
      const res = date
        ? await api(`/api/family/board/dates/${date.id}?today=${todayLocal()}`, { method: "PATCH", body })
        : await api(`/api/family/board/dates?today=${todayLocal()}`, { method: "POST", body });
      onSaved(res.date);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove() {
    if (!confirm(`'${date.title}'을(를) 지울까요?`)) return;
    await api(`/api/family/board/dates/${date.id}`, { method: "DELETE" });
    onDeleted(date.id);
  }

  return (
    <form className="panel stack boardForm" onSubmit={submit}>
      <h3 className="panelTitle">{date ? "기념일 고치기" : "기념일 추가"}</h3>
      <div className="famSeg">
        {DATE_KINDS.map(([id, icon, label]) => (
          <button key={id} type="button" className={kind === id ? "on" : ""} onClick={() => setKind(id)}>
            {icon} {label}
          </button>
        ))}
      </div>
      <input className="input" placeholder="이름 (예: 할머니 생신)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} autoFocus />
      <div className="boardFormRow">
        <div className="famSeg">
          <button type="button" className={calendar === "solar" ? "on" : ""} onClick={() => setCalendar("solar")}>
            ☀️ 양력
          </button>
          <button type="button" className={calendar === "lunar" ? "on" : ""} onClick={() => setCalendar("lunar")}>
            🌙 음력
          </button>
        </div>
        <select className="select boardSelect" value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="월">
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}월
            </option>
          ))}
        </select>
        <select className="select boardSelect" value={Math.min(day, maxDay)} onChange={(e) => setDay(Number(e.target.value))} aria-label="일">
          {Array.from({ length: maxDay }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}일
            </option>
          ))}
        </select>
      </div>
      {calendar === "lunar" ? <p className="muted boardHint">매년 음력 날짜를 양력으로 바꿔 알려 줘요. 윤달이 있는 해에도 평달 기준이고, 30일이 없는 해는 29일로 지내요.</p> : null}
      <input
        className="input"
        type="number"
        inputMode="numeric"
        placeholder={kind === "birthday" ? "태어난 해 (선택, 예: 1955)" : "처음 해 (선택, 몇 주년인지 계산)"}
        value={year}
        onChange={(e) => setYear(e.target.value)}
      />
      <div className="famSeg">
        <button type="button" className={visibility === "family" ? "on" : ""} onClick={() => setVisibility("family")}>
          👨‍👩‍👧 가족 공개
        </button>
        <button type="button" className={visibility === "private" ? "on" : ""} onClick={() => setVisibility("private")} disabled={date && !date.mine}>
          🔒 나만 보기
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="row">
        <button className="btn small brand" disabled={!title.trim()}>
          저장
        </button>
        <button type="button" className="btn small ghost" onClick={onCancel}>
          취소
        </button>
        <span className="famSpacer" />
        {date ? (
          <button type="button" className="btn small danger" onClick={remove}>
            지우기
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default function Dates() {
  const [dates, setDates] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api(`/api/family/board/dates?today=${todayLocal()}`)
      .then((d) => setDates(d.dates))
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  if (!dates) return error ? <p className="error">{error}</p> : <div className="skeleton" style={{ height: 300 }} />;
  if (editing) {
    const done = () => {
      setEditing(null);
      load();
    };
    return <DateForm date={editing === "new" ? null : editing} onSaved={done} onDeleted={done} onCancel={() => setEditing(null)} />;
  }

  return (
    <div className="boardSection">
      <div className="boardBar">
        <b className="boardBarTitle">
          다가오는 기념일 <span className="muted">{dates.length}</span>
        </b>
        <button type="button" className="boardAddBtn" onClick={() => setEditing("new")}>
          + 기념일
        </button>
      </div>
      {dates.length ? (
        <div className="boardDay">
          {dates.map((d) => (
            <button key={d.id} type="button" className="boardDateItem" onClick={() => setEditing(d)}>
              <span className="boardDateIcon">{KIND[d.kind].icon}</span>
              <span className="boardTaskMain static">
                <span className="boardTaskTitle">
                  {d.title}
                  {d.visibility === "private" ? " 🔒" : ""}
                </span>
                <span className="boardTaskMeta">
                  {d.calendar === "lunar" ? `음력 ${d.month}월 ${d.day}일 → ` : ""}
                  {d.next ? formatDay(d.next) : "날짜 계산 불가"}
                  {countLabel(d.kind, d.count) ? ` · ${countLabel(d.kind, d.count)}` : ""}
                </span>
              </span>
              {d.dDay !== null ? <span className={`boardDday${d.dDay <= 7 ? " soon" : ""}`}>{dDayLabel(d.dDay)}</span> : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="empty">
          <span className="emoji">🎂</span>
          <b>등록한 기념일이 없어요</b>
          <span>생일, 결혼기념일, 제사를 음력으로도 등록할 수 있어요.</span>
        </div>
      )}
    </div>
  );
}
