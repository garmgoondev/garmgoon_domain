"use client";

import Link from "next/link";
import { useState } from "react";
import { api, logout, resetMe, useMe } from "../../lib/api";

export default function LoginPage() {
  const me = useMe();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/login", { method: "POST", body: { password } });
      resetMe();
      const next = new URLSearchParams(location.search).get("next");
      // 같은 사이트 안의 경로로만 이동한다
      location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  // 이미 로그인된 상태인 경우
  if (me?.authed) {
    const next = typeof window !== "undefined" ? new URLSearchParams(location.search).get("next") : null;
    const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    return (
      <div className="panel loginBox stack">
        <span className="brandMark">G</span>
        <h1 className="panelTitle" style={{ fontSize: 22 }}>
          이미 로그인되어 있어요
        </h1>
        <p className="panelDesc">SaaS 도구, 스크랩, 설정 등을 모두 이용하실 수 있습니다.</p>
        <div style={{ display: "flex", gap: "8px", marginTop: "12px", width: "100%" }}>
          <Link href={dest} className="btn brand" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
            계속 진행하기
          </Link>
          <button type="button" className="btn ghost" style={{ flex: 1 }} onClick={() => logout("/")}>
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="panel loginBox stack" onSubmit={submit}>
      <span className="brandMark">G</span>
      <h1 className="panelTitle" style={{ fontSize: 22 }}>
        나만의 공간이에요
      </h1>
      <p className="panelDesc">SaaS 도구, 스크랩, 설정은 로그인해야 볼 수 있어요.</p>

      {/* 브라우저 비밀번호 관리자를 위한 사용자 이름 필드 (숨김) */}
      <input type="text" name="username" defaultValue="admin" autoComplete="username" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" />

      <div className="passwordField">
        <input
          id="password"
          name="password"
          className="input"
          type={showPassword ? "text" : "password"}
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
        />
        <button
          type="button"
          className="passwordToggle"
          onClick={() => setShowPassword((v) => !v)}
          title={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
          aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
        >
          {showPassword ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>

      <button className="btn brand" disabled={busy || !password}>
        {busy ? "확인 중…" : "로그인"}
      </button>

      {error ? (
        <div>
          <p className="error">{error}</p>
          <div className="loginNoticeBox">
            <div>💡 <b>비밀번호 확인 팁:</b></div>
            <ul style={{ paddingLeft: "18px", marginTop: "6px", display: "grid", gap: "4px" }}>
              <li>눈 모양 아이콘(👁️)을 눌러 브라우저 자동 완성 비밀번호를 확인해 보세요.</li>
              <li>로컬 개발: <code>.dev.vars</code>의 <code>ADMIN_PASSWORD</code></li>
              <li>배포 사이트: <code>npx wrangler secret put ADMIN_PASSWORD</code>로 재설정 가능</li>
            </ul>
          </div>
        </div>
      ) : null}
    </form>
  );
}
