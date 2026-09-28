"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { NOTE_CATEGORIES } from "../../../lib/family";
import { timeAgo } from "../../../lib/format";

const LABEL = Object.fromEntries(NOTE_CATEGORIES);
// 전화번호와 링크는 눌러서 바로 걸거나 열 수 있게 한다
const LINKS = /(https?:\/\/[^\s]+|0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}|\+\d[\d\s-]{7,}\d)/g;

function Linkify({ text }) {
  return text.split(LINKS).map((part, i) => {
    if (i % 2 === 0) return part;
    const href = part.startsWith("http") ? part : `tel:${part.replace(/[^\d+]/g, "")}`;
    return (
      <a key={i} href={href} target={part.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
        {part}
      </a>
    );
  });
}

function NoteForm({ note, category, onSaved, onCancel }) {
  const [title, setTitle] = useState(note?.title || "");
  const [body, setBody] = useState(note?.body || "");
  const [cat, setCat] = useState(note?.category || (category !== "all" ? category : "contact"));
  const [visibility, setVisibility] = useState(note?.visibility || "family");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const payload = { title, body, category: cat, visibility };
      const res = note ? await api(`/api/family/board/notes/${note.id}`, { method: "PATCH", body: payload }) : await api("/api/family/board/notes", { method: "POST", body: payload });
      onSaved(res.note);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="panel stack boardForm" onSubmit={submit}>
      <div className="chips">
        {NOTE_CATEGORIES.map(([id, label]) => (
          <button key={id} type="button" className={`chip${cat === id ? " on" : ""}`} onClick={() => setCat(id)}>
            {label}
          </button>
        ))}
      </div>
      <input className="input" placeholder="제목 (예: 소아과)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} autoFocus />
      <textarea className="textarea" rows={5} placeholder="전화번호, 주소, 진료 시간, 메모 등" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />
      <div className="famSeg">
        <button type="button" className={visibility === "family" ? "on" : ""} onClick={() => setVisibility("family")}>
          👨‍👩‍👧 가족 공개
        </button>
        <button type="button" className={visibility === "private" ? "on" : ""} onClick={() => setVisibility("private")} disabled={note && !note.mine}>
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
      </div>
    </form>
  );
}

function History({ note, byId, onRestore, onClose }) {
  const [list, setList] = useState(null);
  useEffect(() => {
    api(`/api/family/board/notes/${note.id}/history`).then((d) => setList(d.history));
  }, [note.id]);
  return (
    <div className="panel stack boardForm">
      <h3 className="panelTitle">'{note.title}' 이전 내용</h3>
      {!list ? <div className="skeleton" style={{ height: 120 }} /> : null}
      {list?.length === 0 ? <p className="muted">아직 고친 기록이 없어요.</p> : null}
      {list?.map((h) => (
        <div key={h.id} className="boardHistory">
          <div className="muted">
            {byId.get(h.updatedBy)?.name || "알 수 없음"} · {timeAgo(h.updatedAt)}
          </div>
          <b>{h.title}</b>
          <p>{h.body}</p>
          <button type="button" className="btn small ghost" onClick={() => onRestore(h)}>
            이 내용으로 되돌리기
          </button>
        </div>
      ))}
      <button type="button" className="btn small ghost" onClick={onClose}>
        닫기
      </button>
    </div>
  );
}

export default function Notes({ members }) {
  const [notes, setNotes] = useState(null);
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const byId = new Map(members.map((m) => [m.id, m]));

  const load = () =>
    api("/api/family/board/notes")
      .then((d) => setNotes(d.notes))
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  if (!notes) return error ? <p className="error">{error}</p> : <div className="skeleton" style={{ height: 300 }} />;

  if (editing) {
    return (
      <NoteForm
        note={editing === "new" ? null : editing}
        category={category}
        onSaved={() => {
          setEditing(null);
          load();
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }
  if (history) {
    return (
      <History
        note={history}
        byId={byId}
        onClose={() => setHistory(null)}
        onRestore={async (h) => {
          await api(`/api/family/board/notes/${history.id}`, { method: "PATCH", body: { title: h.title, body: h.body } });
          setHistory(null);
          load();
        }}
      />
    );
  }

  async function pin(n) {
    const res = await api(`/api/family/board/notes/${n.id}`, { method: "PATCH", body: { pinned: !n.pinned } });
    setNotes((list) => list.map((x) => (x.id === n.id ? res.note : x)).sort((a, b) => b.pinned - a.pinned || b.updatedAt - a.updatedAt));
  }

  async function remove(n) {
    if (!confirm(`'${n.title}'을(를) 지울까요?`)) return;
    await api(`/api/family/board/notes/${n.id}`, { method: "DELETE" });
    setNotes((list) => list.filter((x) => x.id !== n.id));
  }

  const shown = notes.filter((n) => category === "all" || n.category === category);

  return (
    <div className="boardSection">
      <div className="boardBar">
        <div className="chips">
          <button type="button" className={`chip${category === "all" ? " on" : ""}`} onClick={() => setCategory("all")}>
            전체 <span className="count">{notes.length}</span>
          </button>
          {NOTE_CATEGORIES.map(([id, label]) => {
            const n = notes.filter((x) => x.category === id).length;
            return n || category === id ? (
              <button key={id} type="button" className={`chip${category === id ? " on" : ""}`} onClick={() => setCategory(id)}>
                {label} <span className="count">{n}</span>
              </button>
            ) : null;
          })}
        </div>
        <button type="button" className="boardAddBtn" onClick={() => setEditing("new")}>
          + 정보
        </button>
      </div>
      <p className="boardWarn">⚠️ 주민번호, 통장·카드 비밀번호 같은 민감한 정보는 적지 마세요.</p>
      {shown.length ? (
        <div className="boardNotes">
          {shown.map((n) => (
            <article key={n.id} className={`boardNote${n.pinned ? " pinned" : ""}`}>
              <header>
                <span className="boardNoteCat">{LABEL[n.category]}</span>
                {n.visibility === "private" ? <span className="famTag">🔒 나만</span> : null}
                <span className="famSpacer" />
                <button type="button" className={`boardPin${n.pinned ? " on" : ""}`} onClick={() => pin(n)} aria-label={n.pinned ? "고정 풀기" : "위에 고정"} aria-pressed={n.pinned}>
                  📌
                </button>
              </header>
              <h3>{n.title}</h3>
              {n.body ? (
                <p>
                  <Linkify text={n.body} />
                </p>
              ) : null}
              <footer>
                <span className="muted">
                  {byId.get(n.updatedBy)?.name || "알 수 없음"} · {timeAgo(n.updatedAt)}
                </span>
                <span className="famSpacer" />
                <button type="button" onClick={() => setEditing(n)}>
                  고치기
                </button>
                <button type="button" onClick={() => setHistory(n)}>
                  기록
                </button>
                <button type="button" onClick={() => remove(n)}>
                  지우기
                </button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <span className="emoji">📒</span>
          <b>아직 적어 둔 정보가 없어요</b>
          <span>병원 전화번호, 학교 일정, 와이파이, 가족 규칙 등을 모아 두세요.</span>
        </div>
      )}
    </div>
  );
}
