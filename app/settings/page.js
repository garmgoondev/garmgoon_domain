"use client";

import { useState } from "react";
import { api, resetMe, useApi } from "../../lib/api";
import { timeAgo } from "../../lib/format";

const ITEM_STATUS = { new: "수집됨", scored: "채점됨", selected: "선정됨", published: "카드 완료", skipped: "제외", failed: "실패" };
const VIDEO_STATUS = { new: "요약 대기", done: "요약 완료", failed: "실패" };

function Channels() {
  const { data, error, reload } = useApi("/api/p/channels");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const res = await api("/api/p/channels", { method: "POST", body: { input } });
      setInput("");
      setMsg(`✓ ${res.channel.title} 채널을 추가했어요. 최근 영상 3개를 곧 요약해요.`);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c) {
    if (!confirm(`${c.title} 채널과 요약된 영상을 모두 삭제할까요?`)) return;
    await api(`/api/p/channels/${c.id}`, { method: "DELETE" });
    reload();
  }

  return (
    <section className="panel">
      <h2 className="panelTitle">📺 유튜브 채널</h2>
      <p className="panelDesc">채널 주소, @핸들, 채널 ID 중 아무거나 넣으면 돼요. 3시간마다 새 영상을 확인해요.</p>
      <form className="row" onSubmit={add}>
        <input className="input" placeholder="https://www.youtube.com/@channel 또는 @channel" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn brand" disabled={busy || !input.trim()}>
          {busy ? "찾는 중…" : "추가"}
        </button>
      </form>
      {msg ? <p className={msg.startsWith("✓") ? "saveHint" : "error"}>{msg}</p> : null}
      {error ? <p className="error">{error.message}</p> : null}
      <div className="listRows">
        {data?.channels.map((c) => (
          <div key={c.id} className="listRow">
            {c.thumbnail ? <img src={c.thumbnail} alt="" /> : null}
            <div className="grow">
              <b>{c.title}</b>
              <small>
                {c.handle ? `@${c.handle} · ` : ""}요약 {c.done}개{c.pending ? ` · 대기 ${c.pending}개` : ""}
              </small>
            </div>
            <button type="button" className="btn small danger" onClick={() => remove(c)}>
              삭제
            </button>
          </div>
        ))}
        {data && !data.channels.length ? <p className="muted">아직 추가한 채널이 없어요.</p> : null}
      </div>
    </section>
  );
}

function Keywords() {
  const { data, error, reload, setData } = useApi("/api/p/keywords");
  const [word, setWord] = useState("");
  const [msg, setMsg] = useState("");

  async function add(e) {
    e.preventDefault();
    setMsg("");
    try {
      const res = await api("/api/p/keywords", { method: "POST", body: { word } });
      setData(() => res);
      setWord("");
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function remove(id) {
    await api(`/api/p/keywords/${id}`, { method: "DELETE" });
    reload();
  }

  return (
    <section className="panel">
      <h2 className="panelTitle">🔔 관심 키워드</h2>
      <p className="panelDesc">키워드가 들어간 글은 오늘의 카드로 뽑힐 때 가산점을 받고, 메인 상단에 따로 표시돼요.</p>
      <form className="row" onSubmit={add}>
        <input className="input" placeholder="예: AI 에이전트, B2B, 구독" value={word} onChange={(e) => setWord(e.target.value)} />
        <button className="btn" disabled={!word.trim()}>
          추가
        </button>
      </form>
      {msg || error ? <p className="error">{msg || error.message}</p> : null}
      <div className="row" style={{ flexWrap: "wrap", marginTop: 14 }}>
        {data?.keywords.map((k) => (
          <span key={k.id} className="kwChip">
            {k.word}
            <button type="button" onClick={() => remove(k.id)} aria-label={`${k.word} 삭제`}>
              ✕
            </button>
          </span>
        ))}
        {data && !data.keywords.length ? <span className="muted">등록된 키워드가 없어요.</span> : null}
      </div>
    </section>
  );
}

function Status() {
  const { data, error, reload } = useApi("/api/p/status");
  const [running, setRunning] = useState("");
  const [result, setResult] = useState("");

  async function run(job) {
    setRunning(job);
    setResult("");
    try {
      const res = await api("/api/p/run", { method: "POST", body: { job } });
      setResult(res.result);
      reload();
    } catch (err) {
      setResult(err.message);
    } finally {
      setRunning("");
    }
  }

  if (error) return <p className="error">{error.message}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <section className="panel">
      <h2 className="panelTitle">⚙️ 수집 상태</h2>
      <p className="panelDesc">
        매일 오전 {data.collectHour}시(KST)에 수집을 시작하고, 10분마다 한 단계씩 처리해요. 출처: {data.sources.join(", ")}
      </p>
      {!data.hasKey ? <div className="banner">⚠️ OPENROUTER_API_KEY가 없어서 AI 요약 없이 원문만 보여줘요.</div> : null}
      <div className="statGrid">
        <div className="stat">
          <small>AI 모델</small>
          <b style={{ fontSize: 13 }}>{data.model}</b>
        </div>
        <div className="stat">
          <small>오늘 수집</small>
          <b style={{ fontSize: 14 }}>{data.collectedAt ? timeAgo(data.collectedAt) : "아직"}</b>
        </div>
        {Object.entries(data.items).map(([k, v]) => (
          <div key={k} className="stat">
            <small>오늘 · {ITEM_STATUS[k] || k}</small>
            <b>{v}</b>
          </div>
        ))}
        {Object.entries(data.videos).map(([k, v]) => (
          <div key={k} className="stat">
            <small>영상 · {VIDEO_STATUS[k] || k}</small>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <div className="row" style={{ flexWrap: "wrap", marginTop: 16 }}>
        <button type="button" className="btn small" onClick={() => run("tick")} disabled={!!running}>
          {running === "tick" ? "처리 중…" : "▶ 다음 단계 실행"}
        </button>
        <button type="button" className="btn small ghost" onClick={() => run("collect")} disabled={!!running}>
          {running === "collect" ? "수집 중…" : "지금 새로 수집"}
        </button>
        <button type="button" className="btn small ghost" onClick={() => run("report")} disabled={!!running}>
          {running === "report" ? "생성 중…" : "주간 리포트 생성"}
        </button>
      </div>
      {result ? <p className="saveHint">{result}</p> : null}
      <ul className="logList">
        {data.logs.map((l, i) => (
          <li key={i}>
            <span className="t">{timeAgo(l.at)}</span>
            <span className={l.level}>{l.message}</span>
          </li>
        ))}
        {!data.logs.length ? <li className="muted">기록이 없어요.</li> : null}
      </ul>
    </section>
  );
}

export default function SettingsPage() {
  async function logout() {
    await api("/api/logout", { method: "POST" });
    resetMe();
    location.href = "/";
  }

  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">⚙️ SETTINGS</div>
          <h1 className="pageTitle">설정</h1>
          <p className="pageDesc">채널과 키워드를 관리하고, 수집 상태를 확인해요.</p>
        </div>
        <button type="button" className="btn ghost small" onClick={logout}>
          로그아웃
        </button>
      </div>
      <Channels />
      <Keywords />
      <Status />
    </>
  );
}
