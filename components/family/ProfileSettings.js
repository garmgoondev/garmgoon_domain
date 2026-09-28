"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import { PROFILE_COLORS, PROFILE_EMOJIS } from "../../lib/family";
import Avatar from "./Avatar";

export function ProfilePicker({ emoji, color, onEmoji, onColor }) {
  return (
    <>
      <div className="famPickRow" role="group" aria-label="아바타">
        {PROFILE_EMOJIS.map((e) => (
          <button key={e} type="button" className={emoji === e ? "on" : ""} onClick={() => onEmoji(e)} aria-pressed={emoji === e}>
            {e}
          </button>
        ))}
      </div>
      <div className="famPickRow colors" role="group" aria-label="색상">
        {PROFILE_COLORS.map((c) => (
          <button key={c} type="button" className={color === c ? "on" : ""} style={{ background: c }} onClick={() => onColor(c)} aria-label={c} aria-pressed={color === c} />
        ))}
      </div>
    </>
  );
}

// 구성원이 자기 아바타·색상·비밀번호를 바꾼다 (이름은 관리자만 바꾼다)
export default function ProfileSettings({ member, onSaved, onClose }) {
  const [emoji, setEmoji] = useState(member.emoji);
  const [color, setColor] = useState(member.color);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (next && next !== confirmPw) return setError("새 비밀번호가 서로 달라요.");
    setBusy(true);
    try {
      const res = await api("/api/family/me", { method: "PATCH", body: { emoji, color, ...(next ? { currentPassword: current, newPassword: next } : {}) } });
      onSaved(res.member);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel stack famSettings" onSubmit={submit}>
      <div className="row">
        <Avatar member={{ emoji, color }} size={44} />
        <h2 className="panelTitle" style={{ margin: 0 }}>
          {member.name}의 프로필
        </h2>
      </div>
      <ProfilePicker emoji={emoji} color={color} onEmoji={setEmoji} onColor={setColor} />
      <b style={{ marginTop: 8 }}>비밀번호 바꾸기</b>
      <input className="input" type="password" autoComplete="current-password" placeholder="지금 비밀번호" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <input className="input" type="password" autoComplete="new-password" placeholder="새 비밀번호 (4자 이상)" value={next} onChange={(e) => setNext(e.target.value)} />
      <input className="input" type="password" autoComplete="new-password" placeholder="새 비밀번호 확인" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
      {error ? <p className="error">{error}</p> : null}
      <div className="row">
        <button className="btn brand" disabled={busy}>
          {busy ? "저장 중…" : "저장"}
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>
          닫기
        </button>
      </div>
    </form>
  );
}
