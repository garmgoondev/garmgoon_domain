"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "../../components/family/Avatar";
import Board from "../../components/family/board/Board";
import DiaryTracker from "../../components/family/DiaryTracker";
import FamilyPulse from "../../components/family/FamilyPulse";
import Feed from "../../components/family/Feed";
import InstallHint from "../../components/family/InstallHint";
import MemberAdmin from "../../components/family/MemberAdmin";
import PhotoGrid from "../../components/family/PhotoGrid";
import ProfileSettings from "../../components/family/ProfileSettings";
import { api, resetMe } from "../../lib/api";
import "./family.css";

function FamilyLogin({ members, onLogin, onCancel }) {
  const [picked, setPicked] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/family/login", { method: "POST", body: { memberId: picked.id, password } });
      onLogin();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!members.length) {
    return (
      <div className="empty">
        <span className="emoji">🏠</span>
        <b>아직 가족 구성원이 없어요</b>
        <span>관리자로 로그인하면 아래에서 구성원을 추가할 수 있어요.</span>
      </div>
    );
  }

  return (
    <div className="panel famLogin">
      <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
        <h2 className="panelTitle" style={{ margin: 0 }}>누구세요?</h2>
        {onCancel ? (
          <button type="button" className="btn small ghost" onClick={onCancel}>
            닫기
          </button>
        ) : null}
      </div>
      <p className="panelDesc">내 프로필을 누르고 비밀번호를 입력해 주세요.</p>
      <div className="famWho">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`famWhoItem${picked?.id === m.id ? " on" : ""}`}
            style={{ "--m": m.color }}
            onClick={() => {
              setPicked(m);
              setPassword("");
              setError("");
            }}
          >
            <Avatar member={m} size={64} />
            <b>{m.name}</b>
          </button>
        ))}
      </div>
      {picked ? (
        <form className="famLoginForm" onSubmit={submit}>
          <input type="text" name="username" value={`family-${picked.name}`} autoComplete="username" readOnly hidden />
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder={`${picked.name}의 비밀번호`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button className="btn brand" disabled={busy || !password}>
            {busy ? "확인 중…" : "들어가기"}
          </button>
        </form>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}

const TABS = [
  ["family", "🏠 가족"],
  ["mine", "📔 내 공간"],
  ["board", "📌 우리집"],
  ["photos", "🖼️ 사진"],
];

export default function FamilyPage() {
  const [session, setSession] = useState(null);
  const [members, setMembers] = useState(null);
  const [tab, setTab] = useState("family");
  const [author, setAuthor] = useState(0);
  const [familyKind, setFamilyKind] = useState("message");
  const [familyVisibility, setFamilyVisibility] = useState("");
  const [kind, setKind] = useState("");
  const [searchText, setSearchText] = useState("");
  const [diaryRefresh, setDiaryRefresh] = useState(0);
  const [settings, setSettings] = useState(false);
  const [switchingProfile, setSwitchingProfile] = useState(false);
  const seen = useRef(false);

  const loadSession = useCallback(() => {
    resetMe();
    return api("/api/me")
      .then(setSession)
      .catch(() => setSession({ authed: false, family: null }));
  }, []);
  const loadMembers = useCallback(() => api("/api/family/members").then((d) => setMembers(d.members)).catch(() => setMembers([])), []);

  useEffect(() => {
    loadSession();
    loadMembers();
    // 알림을 눌러 들어오면 (?tab=board) 그 탭을 연다
    const t = new URLSearchParams(location.search).get("tab");
    if (TABS.some(([id]) => id === t)) setTab(t);
  }, []);

  // 첫 목록을 받은 뒤에 '봤음'으로 기록해야 이번 방문에서 NEW 표시가 보인다
  const markSeen = useCallback(() => {
    if (seen.current) return;
    seen.current = true;
    api("/api/family/seen", { method: "POST" }).catch(() => {});
  }, []);

  async function logout() {
    await api("/api/family/logout", { method: "POST" }).catch(() => {});
    seen.current = false;
    setSettings(false);
    setSwitchingProfile(true);
    loadSession();
  }

  if (!session || !members) return <div className="skeleton" style={{ height: 360 }} />;
  const me = session.family;
  const qParam = searchText.trim() ? `&q=${encodeURIComponent(searchText.trim())}` : "";
  const famKindParam = `&kind=${familyKind || "message"}`;
  const famVisParam = me?.isAdmin && familyKind === "diary" && familyVisibility ? `&visibility=${familyVisibility}` : "";

  return (
    <div className="famPage">
      <div className="pageHead">
        <div>
          <div className="eyebrow">
            👨‍👩‍👧‍👦 우리 가족 {me?.isAdmin ? <span className="famAdminBadge">👑 관리자 계정</span> : null}
          </div>
          <h1 className="pageTitle">{me ? `${me.name}, 반가워요 ${me.emoji}` : "가족 공간"}</h1>
          <p className="pageDesc">
            {me
              ? "일기와 메시지를 남기고, 매일 누가 일기를 썼는지 함께 확인해요."
              : "가족끼리만 보는 일기장과 게시판이에요."}
          </p>
        </div>
        {me ? (
          <div className="row">
            {!me.isVirtualAdmin ? (
              <button type="button" className="btn small ghost" onClick={() => setSettings((v) => !v)}>
                <Avatar member={me} size={22} /> 내 프로필
              </button>
            ) : null}
            <button type="button" className="btn small ghost" onClick={() => setSwitchingProfile((v) => !v)}>
              프로필 전환
            </button>
            {!session.authed ? (
              <button type="button" className="btn small ghost" onClick={logout}>
                로그아웃
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {switchingProfile && me ? (
        <FamilyLogin
          members={members}
          onCancel={() => setSwitchingProfile(false)}
          onLogin={() => {
            seen.current = false;
            setSwitchingProfile(false);
            loadSession();
          }}
        />
      ) : null}

      {me ? (
        <>
          <InstallHint />
          {settings && !me.isVirtualAdmin ? (
            <ProfileSettings
              member={me}
              onClose={() => setSettings(false)}
              onSaved={() => {
                setSettings(false);
                loadSession();
                loadMembers();
              }}
            />
          ) : null}
          <div className="tabs famTabs">
            {TABS.map(([id, label]) => (
              <button key={id} type="button" className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === "family" ? (
            <Feed
              key="family"
              query={`scope=family${author ? `&member=${author}` : ""}${famKindParam}${famVisParam}${qParam}`}
              defaults={{ kind: familyKind === "diary" ? "diary" : "message", visibility: familyKind === "diary" ? "private" : "family" }}
              canCompose={!me.isVirtualAdmin}
              canInteract={!me.isVirtualAdmin}
              onPostsChanged={() => setDiaryRefresh((n) => n + 1)}
              header={
                <>
                  <FamilyPulse onOpenBoard={() => setTab("board")} />
                  <DiaryTracker
                    me={me}
                    refreshKey={diaryRefresh}
                    onWriteToday={() => setTab("mine")}
                  />
                </>
              }
              accept={(p) =>
                familyKind === "diary"
                  ? p.kind === "diary"
                  : p.visibility === "family" && p.kind === "message"
              }
              onFirstLoad={markSeen}
              filters={
                <div className="famFilterBar">
                  <div className="chips famFilter">
                    <button type="button" className={`chip${!author ? " on" : ""}`} onClick={() => setAuthor(0)}>
                      모두
                    </button>
                    {members.map((m) => (
                      <button key={m.id} type="button" className={`chip${author === m.id ? " on" : ""}`} onClick={() => setAuthor(m.id)}>
                        {m.emoji} {m.name}
                      </button>
                    ))}
                  </div>
                  <div className="famSubFilterRow">
                    <div className="chips famFilter">
                      {[
                        ["message", "💬 메시지"],
                        ["diary", "📔 일기"],
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          className={`chip${familyKind === id ? " on" : ""}`}
                          onClick={() => {
                            setFamilyKind(id);
                            if (id !== "diary") setFamilyVisibility("");
                          }}
                        >
                          {label}
                        </button>
                      ))}
                      {me.isAdmin && familyKind === "diary" ? (
                        <button
                          type="button"
                          className={`chip${familyVisibility === "private" ? " on" : ""}`}
                          onClick={() => setFamilyVisibility((v) => (v === "private" ? "" : "private"))}
                        >
                          🔒 비공개 일기만
                        </button>
                      ) : null}
                    </div>
                    <div className="famSearchWrap">
                      <input
                        type="search"
                        className="input famSearchInput"
                        placeholder="🔍 지난 이야기 검색…"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        aria-label="가족 이야기 검색"
                      />
                    </div>
                  </div>
                </div>
              }
              empty={
                <div className="empty">
                  <span className="emoji">{searchText.trim() ? "🔍" : familyKind === "diary" ? "📔" : "💌"}</span>
                  <b>{searchText.trim() ? `"${searchText.trim()}" 검색 결과가 없어요` : familyKind === "diary" ? "아직 작성된 일기가 없어요" : "아직 가족 공개 메시지가 없어요"}</b>
                  <span>{searchText.trim() ? "다른 검색어로 찾아보세요." : "첫 이야기를 남겨 보세요."}</span>
                </div>
              }
            />
          ) : tab === "mine" ? (
            <Feed
              key="mine"
              query={`scope=mine${kind ? `&kind=${kind}` : ""}${qParam}`}
              defaults={{ kind: "diary", visibility: "private" }}
              canCompose={!me.isVirtualAdmin}
              canInteract={!me.isVirtualAdmin}
              onPostsChanged={() => setDiaryRefresh((n) => n + 1)}
              header={
                <DiaryTracker
                  me={me}
                  refreshKey={diaryRefresh}
                />
              }
              onFirstLoad={markSeen}
              filters={
                <div className="famFilterBar">
                  <div className="chips famFilter">
                    {[
                      ["", "전체"],
                      ["diary", "📔 일기"],
                      ["message", "💬 메시지"],
                    ].map(([id, label]) => (
                      <button key={id} type="button" className={`chip${kind === id ? " on" : ""}`} onClick={() => setKind(id)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="famSearchWrap">
                    <input
                      type="search"
                      className="input famSearchInput"
                      placeholder="🔍 내 일기·글 검색…"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      aria-label="내 글 검색"
                    />
                  </div>
                </div>
              }
              empty={
                <div className="empty">
                  <span className="emoji">{searchText.trim() ? "🔍" : "📔"}</span>
                  <b>{searchText.trim() ? `"${searchText.trim()}" 검색 결과가 없어요` : "내 공간이 비어 있어요"}</b>
                  <span>{searchText.trim() ? "다른 단어로 검색해 보세요." : "'나만 보기'로 쓴 일기는 본인과 관리자만 내용을 볼 수 있고, 다른 가족에게는 일기 작성 여부만 표시돼요."}</span>
                </div>
              }
            />
          ) : tab === "board" ? (
            <Board me={me} members={members} />
          ) : (
            <PhotoGrid />
          )}
        </>
      ) : (
        <FamilyLogin
          members={members}
          onLogin={() => {
            seen.current = false;
            loadSession();
          }}
        />
      )}

      {session.authed ? (
        <div className="section">
          <MemberAdmin onChanged={loadMembers} />
        </div>
      ) : null}
    </div>
  );
}
