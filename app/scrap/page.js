"use client";

import { useCallback, useEffect, useState } from "react";
import { cardVars } from "../../components/IdeaCard";
import { api, useApi } from "../../lib/api";
import { timeAgo } from "../../lib/format";

const STATUSES = [
  { id: "idea", label: "💡 아이디어" },
  { id: "review", label: "🔍 검토 중" },
  { id: "doing", label: "🚀 실행 중" },
  { id: "hold", label: "💤 보류" },
];

function ScrapItem({ s, onDelete, onNote }) {
  const [note, setNote] = useState(s.note);
  const [savedNote, setSavedNote] = useState(s.note);
  const [saved, setSaved] = useState("");
  const item = s.item;
  const video = s.video;

  async function save() {
    if (note === savedNote) return;
    await api(`/api/p/scraps/${s.id}`, { method: "PATCH", body: { note } });
    setSavedNote(note);
    setSaved("저장됨");
    setTimeout(() => setSaved(""), 1500);
  }

  const title = item?.headline || video?.title || "삭제된 항목";
  const href = item?.url || (video ? `https://www.youtube.com/watch?v=${video.id}` : null);
  const excerpt = item ? item.summary[0] : video?.oneLiner || video?.summary?.[0];

  return (
    <div className="scrapItem">
      {video ? (
        <a className="scrapThumb video" href={href} target="_blank" rel="noreferrer">
          <img src={video.thumbnail} alt="" loading="lazy" />
        </a>
      ) : (
        <a className="scrapThumb ncard" style={cardVars(item?.category)} href={href || undefined} target="_blank" rel="noreferrer">
          <span className="catChip">{item?.category || "기타"}</span>
          <span>{item?.sourceLabel}</span>
        </a>
      )}
      <div className="scrapMain">
        <div className="meta">
          {video ? `📺 ${video.channelTitle}` : `🗞️ ${item?.sourceLabel || ""}`} · {timeAgo(s.createdAt)} 스크랩
        </div>
        <h3>{href ? <a href={href} target="_blank" rel="noreferrer">{title}</a> : title}</h3>
        {excerpt ? <p className="excerpt">{excerpt}</p> : null}
        <textarea className="textarea" placeholder="내 생각을 메모해 두세요 (자동 저장)" value={note} onChange={(e) => setNote(e.target.value)} onBlur={save} rows={2} />
        <div className="row">
          <button type="button" className="btn small ghost" onClick={() => onNote({ title, body: [excerpt, note].filter(Boolean).join("\n\n"), link: href, tags: item?.tags || [] })}>
            ✎ 아이디어 노트로
          </button>
          <button type="button" className="btn small danger" onClick={() => onDelete(s.id)}>
            삭제
          </button>
          <span className="saveHint">{saved}</span>
        </div>
      </div>
    </div>
  );
}

function Scraps({ onNote }) {
  const { data, loading, error, setData } = useApi("/api/p/scraps");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  if (loading && !data) return <div className="skeleton" style={{ height: 300 }} />;
  if (error) return <p className="error">{error.message}</p>;
  const term = query.trim().toLowerCase();
  const list = data.scraps.filter((s) => {
    if (filter !== "all" && s.kind !== filter) return false;
    if (!term) return true;
    const text = [
      s.note,
      s.item?.headline,
      s.item?.title,
      ...(s.item?.summary || []),
      ...(s.item?.tags || []),
      s.item?.category,
      s.video?.title,
      s.video?.oneLiner,
      s.video?.channelTitle,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return text.includes(term);
  });

  async function remove(id) {
    if (!confirm("스크랩을 삭제할까요?")) return;
    await api(`/api/p/scraps/${id}`, { method: "DELETE" });
    setData((d) => ({ ...d, scraps: d.scraps.filter((s) => s.id !== id) }));
  }

  return (
    <>
      <div className="row" style={{ flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 }}>
        <div className="chips">
          {[
            ["all", "전체"],
            ["item", "🗞️ 카드"],
            ["video", "📺 영상"],
          ].map(([id, label]) => (
            <button key={id} type="button" className={`chip${filter === id ? " on" : ""}`} onClick={() => setFilter(id)}>
              {label} <span className="count">{id === "all" ? data.scraps.length : data.scraps.filter((s) => s.kind === id).length}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          className="input"
          style={{ maxWidth: 260, height: 36 }}
          placeholder="🔍 스크랩·메모 검색…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="스크랩 검색"
        />
      </div>
      {list.length ? (
        <div className="scrapList">
          {list.map((s) => (
            <ScrapItem key={s.id} s={s} onDelete={remove} onNote={onNote} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <span className="emoji">{term ? "🔍" : "☆"}</span>
          <b>{term ? `"${query.trim()}" 검색 결과가 없어요` : "스크랩한 카드가 없어요"}</b>
          <span>{term ? "다른 검색어를 입력해 보세요." : "카드뉴스의 마지막 장이나 영상 카드에서 ☆를 눌러 보관하세요."}</span>
        </div>
      )}
    </>
  );
}

function NoteCard({ note, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);

  async function update(patch) {
    const res = await api(`/api/p/notes/${note.id}`, { method: "PATCH", body: patch });
    onChange(res.note);
  }

  if (editing) {
    return (
      <div className="note stack" data-status={note.status}>
        <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <textarea className="textarea" rows={6} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        <div className="row">
          <button
            type="button"
            className="btn small"
            onClick={async () => {
              await update({ title: draft.title, body: draft.body });
              setEditing(false);
            }}
          >
            저장
          </button>
          <button type="button" className="btn small ghost" onClick={() => setEditing(false)}>
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="note" data-status={note.status}>
      <h3>{note.title}</h3>
      <p>{note.body}</p>
      {note.link ? (
        <a href={note.link} target="_blank" rel="noreferrer">
          참고 링크 ↗
        </a>
      ) : null}
      {note.tags.length ? <div className="noteFoot">{note.tags.map((t) => `#${t}`).join(" ")}</div> : null}
      <div className="noteFoot">
        <select value={note.status} onChange={(e) => update({ status: e.target.value })} aria-label="상태">
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <span>{timeAgo(note.updatedAt)}</span>
        <span>
          <button
            type="button"
            className="iconBtn"
            onClick={() => {
              setDraft(note);
              setEditing(true);
            }}
            aria-label="편집"
          >
            ✎
          </button>
          <button type="button" className="iconBtn" onClick={() => onDelete(note.id)} aria-label="삭제">
            🗑
          </button>
        </span>
      </div>
    </div>
  );
}

function Notes({ prefill, onPrefillUsed }) {
  const { data, loading, error, setData } = useApi("/api/p/notes");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ title: "", body: "", tags: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!prefill) return;
    setForm({ title: prefill.title, body: prefill.body, tags: prefill.tags.join(", "), link: prefill.link });
    onPrefillUsed();
  }, [prefill, onPrefillUsed]);
  if (loading && !data) return <div className="skeleton" style={{ height: 300 }} />;
  if (error) return <p className="error">{error.message}</p>;

  async function add(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await api("/api/p/notes", {
        method: "POST",
        body: { title: form.title, body: form.body, link: form.link, tags: form.tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean) },
      });
      setData((d) => ({ ...d, notes: [res.note, ...d.notes] }));
      setForm({ title: "", body: "", tags: "" });
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm("노트를 삭제할까요?")) return;
    await api(`/api/p/notes/${id}`, { method: "DELETE" });
    setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
  }

  const term = query.trim().toLowerCase();
  const notes = data.notes.filter((n) => {
    if (filter !== "all" && n.status !== filter) return false;
    if (!term) return true;
    return [n.title, n.body, ...(n.tags || []), n.link].filter(Boolean).join(" ").toLowerCase().includes(term);
  });

  return (
    <>
      <form className="panel composer stack" onSubmit={add}>
        <input className="input" placeholder="떠오른 아이디어 한 줄" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="textarea" placeholder="누구의 어떤 문제를, 어떻게 풀까? 수익은?" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <div className="row">
          <input className="input" placeholder="태그 (쉼표로 구분)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <button className="btn brand" disabled={busy || !form.title.trim()}>
            노트 추가
          </button>
        </div>
        {form.link ? <span className="muted">🔗 {form.link}</span> : null}
        {msg ? <p className="error">{msg}</p> : null}
      </form>

      <div className="row" style={{ flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 }}>
        <div className="chips">
          <button type="button" className={`chip${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>
            전체 <span className="count">{data.notes.length}</span>
          </button>
          {STATUSES.map((s) => (
            <button key={s.id} type="button" className={`chip${filter === s.id ? " on" : ""}`} onClick={() => setFilter(s.id)}>
              {s.label} <span className="count">{data.notes.filter((n) => n.status === s.id).length}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          className="input"
          style={{ maxWidth: 260, height: 36 }}
          placeholder="🔍 아이디어 노트 검색…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="아이디어 노트 검색"
        />
      </div>

      {notes.length ? (
        <div className="noteGrid">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onChange={(updated) => setData((d) => ({ ...d, notes: d.notes.map((x) => (x.id === updated.id ? updated : x)) }))}
              onDelete={remove}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <span className="emoji">{term ? "🔍" : "💡"}</span>
          <b>{term ? `"${query.trim()}" 검색 결과가 없어요` : "아직 노트가 없어요"}</b>
          <span>{term ? "다른 단어로 검색해 보세요." : "떠오른 아이디어를 적어 두고, 검토 → 실행으로 옮겨 보세요."}</span>
        </div>
      )}
    </>
  );
}

export default function ScrapPage() {
  const [tab, setTab] = useState("scraps");
  const [prefill, setPrefill] = useState(null);
  const clearPrefill = useCallback(() => setPrefill(null), []);

  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">📌 MY ARCHIVE &amp; NOTES</div>
          <h1 className="pageTitle">스크랩 · 아이디어 노트 보관함</h1>
          <p className="pageDesc">
            비즈니스 아이디어 카드뉴스와 유튜브 핵심 요약에서 영감을 얻은 콘텐츠를 북마크하고, 이를 발전시킬 나만의 개인 메모와 실행 계획 노트를 체계적으로 기록하고 관리하는 공간입니다.
          </p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "scraps"} className={tab === "scraps" ? "on" : ""} onClick={() => setTab("scraps")}>
          스크랩
        </button>
        <button type="button" role="tab" aria-selected={tab === "notes"} className={tab === "notes" ? "on" : ""} onClick={() => setTab("notes")}>
          아이디어 노트
        </button>
      </div>
      {tab === "scraps" ? (
        <Scraps
          onNote={(p) => {
            setPrefill(p);
            setTab("notes");
          }}
        />
      ) : (
        <Notes prefill={prefill} onPrefillUsed={clearPrefill} />
      )}
    </>
  );
}
