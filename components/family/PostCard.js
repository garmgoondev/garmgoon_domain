"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import { REACTIONS } from "../../lib/family";
import { formatDay, timeAgo } from "../../lib/format";
import Avatar from "./Avatar";
import Composer from "./Composer";
import Media from "./Media";

function Reactions({ post, onChange }) {
  const [picking, setPicking] = useState(false);
  async function toggle(emoji) {
    setPicking(false);
    const res = await api(`/api/family/posts/${post.id}/reactions`, { method: "PUT", body: { emoji } });
    onChange({ ...post, reactions: res.reactions });
  }
  return (
    <div className="famReactions">
      {post.reactions.map((r) => (
        <button key={r.emoji} type="button" className={`famReaction${r.mine ? " mine" : ""}`} onClick={() => toggle(r.emoji)} title={r.who.join(", ")}>
          {r.emoji} <b>{r.count}</b>
        </button>
      ))}
      <span className="famReactPick">
        <button type="button" className="famReaction add" onClick={() => setPicking((v) => !v)} aria-label="반응 남기기" aria-expanded={picking}>
          😀+
        </button>
        {picking ? (
          <span className="famReactMenu">
            {REACTIONS.map((e) => (
              <button key={e} type="button" onClick={() => toggle(e)}>
                {e}
              </button>
            ))}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function Comment({ c, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.body);
  async function save() {
    if (!draft.trim()) return;
    const res = await api(`/api/family/comments/${c.id}`, { method: "PATCH", body: { body: draft } });
    onChange(res.comment);
    setEditing(false);
  }
  async function remove() {
    if (!confirm("댓글을 지울까요?")) return;
    await api(`/api/family/comments/${c.id}`, { method: "DELETE" });
    onDelete(c.id);
  }
  return (
    <div className="famComment">
      <Avatar member={c.author} size={28} />
      <div className="famCommentMain">
        <div className="famCommentHead">
          <b>{c.author?.name || "알 수 없음"}</b>
          <span className="muted">
            {timeAgo(c.createdAt)}
            {c.editedAt ? " · 수정됨" : ""}
          </span>
          {c.isNew ? <span className="famNew">NEW</span> : null}
          {c.mine && !editing ? (
            <span className="famCommentActions">
              <button type="button" onClick={() => setEditing(true)}>
                고치기
              </button>
              <button type="button" onClick={remove}>
                지우기
              </button>
            </span>
          ) : null}
        </div>
        {editing ? (
          <div className="famCommentEdit">
            <textarea className="textarea" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            <div className="row">
              <button type="button" className="btn small brand" onClick={save}>
                저장
              </button>
              <button type="button" className="btn small ghost" onClick={() => (setEditing(false), setDraft(c.body))}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <p>{c.body}</p>
        )}
      </div>
    </div>
  );
}

function Comments({ post, onChange }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await api(`/api/family/posts/${post.id}/comments`, { method: "POST", body: { body: draft } });
      onChange({ ...post, comments: [...post.comments, res.comment] });
      setDraft("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="famComments">
      {post.comments.map((c) => (
        <Comment
          key={c.id}
          c={c}
          onChange={(nc) => onChange({ ...post, comments: post.comments.map((x) => (x.id === nc.id ? nc : x)) })}
          onDelete={(id) => onChange({ ...post, comments: post.comments.filter((x) => x.id !== id) })}
        />
      ))}
      <form className="famCommentForm" onSubmit={submit}>
        <input className="input" placeholder="댓글 달기" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} />
        <button className="btn small" disabled={busy || !draft.trim()}>
          등록
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}

export default function PostCard({ post, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Composer
        post={post}
        defaults={post}
        onSaved={(p) => {
          onChange(p);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  async function remove() {
    if (!confirm("이 글을 지울까요? 댓글과 첨부 파일도 함께 지워져요.")) return;
    await api(`/api/family/posts/${post.id}`, { method: "DELETE" });
    onDelete(post.id);
  }

  return (
    <article className={`panel famPost${post.kind === "diary" ? " diary" : ""}`} style={{ "--m": post.author?.color }}>
      <header className="famPostHead">
        <Avatar member={post.author} />
        <div className="famPostWho">
          <b>{post.author?.name || "알 수 없음"}</b>
          <span className="muted">
            {timeAgo(post.createdAt)}
            {post.editedAt ? " · 수정됨" : ""}
          </span>
        </div>
        <div className="famPostTags">
          {post.isNew ? <span className="famNew">NEW</span> : null}
          {post.visibility === "private" ? <span className="famTag">🔒 나만 보기</span> : null}
          <span className="famTag">{post.kind === "diary" ? "📔 일기" : "💬 메시지"}</span>
        </div>
      </header>

      {post.kind === "diary" ? (
        <div className="famDiaryHead">
          {post.mood ? <span className="famMood">{post.mood}</span> : null}
          <b>{formatDay(post.diaryDay)}</b>
        </div>
      ) : null}

      {post.body ? <p className="famBody">{post.body}</p> : null}
      {post.files.length ? <Media files={post.files} author={post.author} /> : null}

      <Reactions post={post} onChange={onChange} />
      {post.mine ? (
        <div className="famPostActions">
          <button type="button" onClick={() => setEditing(true)}>
            고치기
          </button>
          <button type="button" onClick={remove}>
            지우기
          </button>
        </div>
      ) : null}
      <Comments post={post} onChange={onChange} />
    </article>
  );
}
