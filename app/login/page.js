"use client";

import { useState } from "react";
import { api, resetMe } from "../../lib/api";

export default function LoginPage() {
  const [password, setPassword] = useState("");
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

  return (
    <form className="panel loginBox stack" onSubmit={submit}>
      <span className="brandMark">G</span>
      <h1 className="panelTitle" style={{ fontSize: 22 }}>
        나만의 공간이에요
      </h1>
      <p className="panelDesc">SaaS 도구, 스크랩, 설정은 로그인해야 볼 수 있어요.</p>
      <input className="input" type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
      <button className="btn brand" disabled={busy || !password}>
        {busy ? "확인 중…" : "로그인"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
