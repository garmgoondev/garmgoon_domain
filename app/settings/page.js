"use client";

import { useEffect, useRef, useState } from "react";
import { api, resetMe, useApi } from "../../lib/api";
import { timeAgo } from "../../lib/format";

const TICK_MINUTES = 10;
const IDLE = "지금 처리할 작업이 없어요.";
const MAX_AUTO_STEPS = 200;
const BATCH_CARDS = 8;

function collectHours(data) {
  const hours = [];
  for (let h = data.collectHour; hours.length < 24 / data.collectInterval; h = (h + data.collectInterval) % 24) hours.push(h);
  return hours.sort((a, b) => a - b);
}
const KEY_NAMES = { reddit: "REDDIT_CLIENT_ID · REDDIT_CLIENT_SECRET" };
const TZ_LABELS = { "America/Denver": "유타 시간", "Asia/Seoul": "한국 시간" };

function eta(ticks) {
  const min = ticks * TICK_MINUTES;
  return min >= 60 ? `약 ${Math.floor(min / 60)}시간 ${min % 60 ? `${min % 60}분` : ""}`.trim() : `약 ${min}분`;
}

// 오늘 카드뉴스가 수집 → 채점 → 선정 → 카드 생성 중 어디까지 왔는지 계산한다
function cardProgress(data) {
  const n = (k) => data.items[k] || 0;
  const total = Object.values(data.items).reduce((a, b) => a + b, 0);
  const [fresh, scored, selected, published] = [n("new"), n("scored"), n("selected"), n("published")];
  const batches = (count, size) => Math.ceil(count / size);
  const next = `다음 업데이트: ${TZ_LABELS[data.timeZone] || data.timeZone} ${data.nextCollectHour}시`;
  const perBatch = Math.min(BATCH_CARDS, data.dailyCards);

  if (!data.collectedAt && !total) return { step: 0, pct: 0, label: "수집 대기 중", sub: next };
  if (fresh) {
    const done = total - fresh;
    return {
      step: 1,
      pct: 10 + (40 * done) / total,
      label: `AI 채점 ${done} / ${total}건`,
      ticks: batches(fresh, 60) + 1 + batches(perBatch, 5),
    };
  }
  if (scored) return { step: 2, pct: 50, label: "새 카드 선정 대기", ticks: 1 + batches(Math.min(scored, perBatch), 5) };
  if (selected) {
    const cards = published + selected;
    return { step: 3, pct: 60 + (40 * published) / cards, label: `카드뉴스 ${published} / ${cards}장 완성`, ticks: batches(selected, 5) };
  }
  if (published) return { step: 4, pct: 100, label: `오늘 카드 ${published} / 최대 ${data.dailyCards}장 ✓`, sub: next };
  return { step: 4, pct: 100, label: "오늘은 아직 새 카드가 없어요", sub: next };
}

const CARD_STEPS = ["수집", "AI 채점", "카드 선정", "카드 생성"];

function Progress({ label, pct, sub, steps, step }) {
  return (
    <div className="progressBlock">
      <div className="progressHead">
        <b>{label}</b>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="progressTrack" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label}>
        <div className={`progressFill${pct >= 100 ? " done" : ""}`} style={{ width: `${pct}%` }} />
      </div>
      {steps ? (
        <div className="progressSteps">
          {steps.map((s, i) => (
            <span key={s} className={i < step ? "done" : i === step ? "active" : ""}>
              {i < step ? "✓ " : ""}
              {s}
            </span>
          ))}
        </div>
      ) : null}
      {sub ? <p className="progressSub">{sub}</p> : null}
    </div>
  );
}

function PipelineProgress({ data }) {
  const card = cardProgress(data);
  const pending = data.videos.new || 0;
  const done = data.videos.done || 0;
  const failed = data.videos.failed || 0;
  const cardsBusy = card.step > 0 && card.step < 4;
  return (
    <div className="progressGroup">
      <Progress
        label={card.label}
        pct={card.pct}
        steps={CARD_STEPS}
        step={card.step}
        sub={card.sub || (card.ticks ? `자동 진행 시 ${eta(card.ticks)} 남음 · '다음 단계 실행'으로 바로 진행할 수 있어요` : null)}
      />
      {pending + done + failed ? (
        <Progress
          label={pending ? `영상 요약 ${done} / ${done + pending}개` : `영상 ${done}개 요약 완료 ✓`}
          pct={(100 * done) / Math.max(1, done + pending)}
          sub={
            pending
              ? `대기 ${pending}개 · ${cardsBusy ? "카드 작업이 끝나면 시작해요" : `자동 진행 시 ${eta(Math.ceil(pending / 2))} 남음`}${failed ? ` · 실패 ${failed}개` : ""}`
              : failed
                ? `실패 ${failed}개`
                : null
          }
        />
      ) : null}
    </div>
  );
}

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

  // 크론이 진행하는 상황을 보여주기 위해 30초마다 새로고침한다
  useEffect(() => {
    const t = setInterval(reload, 30000);
    return () => clearInterval(t);
  }, [reload]);
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

  // 크론(10분에 한 단계)을 기다리지 않고, 할 일이 없을 때까지 한 단계씩 연달아 실행한다.
  // 요청마다 Worker 실행 한도가 따로 적용되므로 한 번에 몰아서 처리하는 것보다 안전하다.
  const stopRef = useRef(false);
  async function runAll(firstJob) {
    stopRef.current = false;
    setRunning("auto");
    let steps = 0;
    let errors = 0;
    try {
      if (firstJob) {
        const res = await api("/api/p/run", { method: "POST", body: { job: firstJob } });
        setResult(res.result);
      }
      while (!stopRef.current && steps < MAX_AUTO_STEPS) {
        const res = await api("/api/p/run", { method: "POST", body: { job: "tick" } });
        steps++;
        reload();
        if (res.result === IDLE) break;
        errors = res.result.startsWith("오류") ? errors + 1 : 0;
        if (errors >= 5) throw new Error(`오류가 계속돼서 멈췄어요: ${res.result}`);
        setResult(`자동 처리 중 (${steps}단계): ${res.result}`);
      }
      setResult(stopRef.current ? `중지했어요 (${steps}단계 처리)` : `모두 처리했어요 (${steps}단계)`);
    } catch (err) {
      setResult(err.message);
    } finally {
      setRunning("");
      reload();
    }
  }

  if (error) return <p className="error">{error.message}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <section className="panel">
      <h2 className="panelTitle">⚙️ 수집 상태</h2>
      <p className="panelDesc">
        {TZ_LABELS[data.timeZone] || data.timeZone} 기준 {collectHours(data).join("·")}시, {data.collectInterval}시간마다 새 글을 모아 좋은 글만
        카드로 추가해요 (한 번에 최대 {BATCH_CARDS}장, 하루 최대 {data.dailyCards}장). 처리는 10분마다 한 단계씩 진행돼요.
      </p>
      <div className="sourceChips">
        {data.sources.map((s) => {
          const off = s.needs && !data.integrations[s.needs];
          return (
            <span key={s.label} className={off ? "off" : ""} title={off ? `${KEY_NAMES[s.needs]} 필요` : "수집 중"}>
              {off ? "🔑" : "●"} {s.label}
              {off ? " · 키 필요" : ""}
            </span>
          );
        })}
      </div>
      {!data.hasKey ? <div className="banner">⚠️ OPENROUTER_API_KEY가 없어서 AI 요약 없이 원문만 보여줘요.</div> : null}
      <div className="statGrid">
        <div className="stat">
          <small>AI 모델</small>
          <b style={{ fontSize: 13 }}>{data.model}</b>
        </div>
        <div className="stat">
          <small>마지막 수집</small>
          <b style={{ fontSize: 14 }}>{data.collectedAt ? timeAgo(data.collectedAt) : "아직"}</b>
        </div>
      </div>
      <PipelineProgress data={data} />
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
        {running === "auto" ? (
          <button type="button" className="btn small brand" onClick={() => (stopRef.current = true)}>
            ■ 자동 처리 중지
          </button>
        ) : (
          <>
            <button type="button" className="btn small ghost" onClick={() => runAll(null)} disabled={!!running}>
              ⏩ 끝날 때까지 자동 처리
            </button>
            <button type="button" className="btn small ghost" onClick={() => runAll("backfill")} disabled={!!running}>
              📅 최근 7일 수집
            </button>
          </>
        )}
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
