"use client";

import { useState } from "react";
import { api, useApi } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import Avatar from "./Avatar";
import { ProfilePicker } from "./ProfileSettings";

function MemberForm({ member, onDone, onCancel }) {
  const [name, setName] = useState(member?.name || "");
  const [emoji, setEmoji] = useState(member?.emoji || "🙂");
  const [color, setColor] = useState(member?.color || "#ff5a36");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const body = { name, emoji, color, ...(password ? { password } : {}) };
      if (member) await api(`/api/p/family/${member.id}`, { method: "PATCH", body });
      else await api("/api/p/family", { method: "POST", body });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="famMemberForm stack" onSubmit={submit}>
      <input className="input" placeholder="이름 (예: 엄마)" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
      <ProfilePicker emoji={emoji} color={color} onEmoji={setEmoji} onColor={setColor} />
      <input
        className="input"
        type="text"
        autoComplete="off"
        placeholder={member ? "새 비밀번호 (비우면 그대로)" : "비밀번호 (4자 이상)"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p className="error">{error}</p> : null}
      <div className="row">
        <button className="btn small brand">{member ? "저장" : "추가"}</button>
        {onCancel ? (
          <button type="button" className="btn small ghost" onClick={onCancel}>
            취소
          </button>
        ) : null}
      </div>
    </form>
  );
}

// 관리자로 로그인했을 때만 보인다. 구성원 추가·수정·비밀번호 재설정·삭제.
export default function MemberAdmin({ onChanged }) {
  const { data, error, reload } = useApi("/api/p/family");
  const [editing, setEditing] = useState(null);

  const done = () => {
    setEditing(null);
    reload();
    onChanged?.();
  };

  async function remove(m) {
    const typed = prompt(`'${m.name}' 님이 쓴 글·댓글·파일이 모두 지워져요. 지우려면 이름을 입력해 주세요.`);
    if (typed !== m.name) return;
    await api(`/api/p/family/${m.id}`, { method: "DELETE" });
    done();
  }

  return (
    <section className="panel famAdmin">
      <h2 className="panelTitle">🛠️ 가족 구성원 관리</h2>
      <p className="panelDesc">관리자에게만 보여요. 비밀번호를 잊은 구성원은 여기서 새로 정해 주세요. 재설정하면 잠금이 풀리고 기존 로그인은 끊겨요.</p>
      {data && !data.storage ? <p className="error">R2 파일 저장소(FILES)가 연결되지 않아 첨부 파일을 올릴 수 없어요.</p> : null}
      {error ? <p className="error">{error.message}</p> : null}
      <div className="famMemberList">
        {data?.members.map((m) =>
          editing === m.id ? (
            <MemberForm key={m.id} member={m} onDone={done} onCancel={() => setEditing(null)} />
          ) : (
            <div key={m.id} className="famMemberRow">
              <Avatar member={m} />
              <div className="famMemberInfo">
                <b>{m.name}</b>
                <span className="muted">
                  글 {m.posts}개 · {m.lastSeenAt ? `${timeAgo(m.lastSeenAt)} 방문` : "아직 방문 전"}
                  {m.locked ? " · 🔒 잠김" : ""}
                </span>
              </div>
              <button type="button" className="btn small ghost" onClick={() => setEditing(m.id)}>
                수정
              </button>
              <button type="button" className="btn small danger" onClick={() => remove(m)}>
                삭제
              </button>
            </div>
          ),
        )}
      </div>
      {editing === "new" ? (
        <MemberForm onDone={done} onCancel={() => setEditing(null)} />
      ) : (
        <button type="button" className="btn small" onClick={() => setEditing("new")}>
          + 구성원 추가
        </button>
      )}
    </section>
  );
}
