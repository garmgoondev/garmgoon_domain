"use client";

import { useEffect, useRef, useState } from "react";
import { LEVELS } from "../../../lib/adofai/levels";
import { buildTimeline, parseAdofaiFile } from "../../../lib/adofai/level";
import { AdofaiEngine, DIFFICULTIES, JUDGES, JUDGE_ORDER, emptyCounts } from "../../../lib/adofai/engine";
import { METRONOME, adofaiAudio, buildSessionEvents } from "../../../lib/adofai/audio";

const SETTINGS_KEY = "adofai_settings";
const RECORDS_KEY = "adofai_records";
const DEFAULT_SETTINGS = { difficulty: "normal", offsetMs: 0, musicVol: 0.8, hitVol: 0.8, hitsound: "kick" };
const HITSOUNDS = [
  ["kick", "킥"],
  ["clap", "클랩"],
  ["tick", "틱"],
  ["off", "끄기"],
];
const AUDIO_EXT = /\.(ogg|mp3|wav|m4a|aac|flac|opus|webm)$/i;
const CALIB_BPM = 100;
const CALIB_LEAD = 4;
const CALIB_TAPS = 16;

function readJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v && typeof v === "object" ? { ...fallback, ...v } : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// 키가 판정 입력으로 쓰일 수 있는지 (브라우저 단축키와 기능 키는 제외)
function isPlayKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  if (["Tab", "Meta", "Alt", "Control", "OS", "ContextMenu", "Escape"].includes(e.key)) return false;
  return !/^F\d+$/.test(e.key);
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export default function AdofaiGame() {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const tlCache = useRef(new Map());

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [records, setRecords] = useState({});
  const [custom, setCustom] = useState(null);
  const [sel, setSel] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [screen, setScreen] = useState("menu");
  const [phase, setPhase] = useState("ready");
  const [hud, setHud] = useState({ counts: emptyCounts(), xacc: 100, progress: 0 });
  const [countdown, setCountdown] = useState(null);
  const [result, setResult] = useState(null);
  const [panel, setPanel] = useState(null);
  const [resumeIn, setResumeIn] = useState(0);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customError, setCustomError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [calib, setCalib] = useState({ state: "idle", taps: [], result: null });

  const levels = custom ? [...LEVELS, custom] : LEVELS;
  const level = levels[Math.min(sel, levels.length - 1)];

  // 핸들러가 항상 최신 상태를 보도록 매 렌더마다 갱신한다
  const live = useRef({});
  const phaseAt = useRef(0);
  const run = useRef({ level: null, startFloor: 0, autoplay: false });
  const calibRef = useRef({ times: [], taps: [] });

  const timeline = (L) => {
    if (!tlCache.current.has(L)) tlCache.current.set(L, buildTimeline(L));
    return tlCache.current.get(L);
  };

  const setPhaseNow = (p) => {
    phaseAt.current = performance.now();
    setPhase(p);
  };

  useEffect(() => {
    setSettings(readJson(SETTINGS_KEY, DEFAULT_SETTINGS));
    setRecords(readJson(RECORDS_KEY, {}));

    const engine = new AdofaiEngine(canvasRef.current, {
      onHit: (s, landed) => {
        if (landed && !run.current.autoplay) adofaiAudio.playHit(live.current.settings.hitsound);
        setHud(s);
      },
      onCountdown: (n) => setCountdown(n),
      onFail: (s) => {
        adofaiAudio.stopSession(0.25);
        setResult({ type: "fail", ...s });
        setPhaseNow("failed");
      },
      onClear: (s) => live.current.onClear(s),
    });
    engineRef.current = engine;

    const frame = frameRef.current;
    const fit = () => {
      const r = frame.getBoundingClientRect();
      engine.resize(r.width, r.height, Math.min(window.devicePixelRatio || 1, 2));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    const onFs = () => setFullscreen(document.fullscreenElement === frame);
    document.addEventListener("fullscreenchange", onFs);

    return () => {
      ro.disconnect();
      document.removeEventListener("fullscreenchange", onFs);
      engine.destroy();
      adofaiAudio.stopSession();
    };
  }, []);

  useEffect(() => {
    adofaiAudio.setVolume({ music: settings.musicVol, hit: settings.hitVol });
  }, [settings.musicVol, settings.hitVol]);

  // 메뉴에서는 고른 레벨을 소리 없이 자동 플레이로 보여 준다
  useEffect(() => {
    if (screen !== "menu" || !engineRef.current) return;
    try {
      engineRef.current.preview(level, timeline(level));
    } catch {
      engineRef.current.idle();
    }
  }, [screen, level]);

  const updateSettings = (patch) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      writeJson(SETTINGS_KEY, next);
      return next;
    });
  };

  // ---------- 플레이 흐름 ----------

  const enterLevel = (L, { startFloor = 0, go = false } = {}) => {
    const engine = engineRef.current;
    const tl = timeline(L);
    adofaiAudio.ensure();
    adofaiAudio.stopSession();
    run.current = { level: L, startFloor, autoplay };
    engine.play(L, tl, { startFloor, autoplay, difficulty: settings.difficulty, offsetMs: settings.offsetMs });
    setHud(engine.stats());
    setCountdown(null);
    setResult(null);
    setScreen("play");
    setPhaseNow("ready");
    const r = frameRef.current.getBoundingClientRect();
    if (!document.fullscreenElement && (r.top < 0 || r.bottom > window.innerHeight)) {
      frameRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    if (go) begin();
  };

  const begin = () => {
    const engine = engineRef.current;
    const { level: L, startFloor, autoplay: auto } = run.current;
    const tl = timeline(L);
    const from = engine.sessionFrom();
    const music = L.buffer ? null : L.music || METRONOME;
    adofaiAudio.startSession({
      events: buildSessionEvents(tl, { music, from, startFloor, autoplay: auto, hitsound: live.current.settings.hitsound }),
      from,
      buffer: L.buffer || null,
      rate: L.pitch || 1,
      volume: L.volume ?? 1,
    });
    engine.begin((perf) => adofaiAudio.songTime(perf));
    setPhaseNow("playing");
  };

  const retry = (fromCheckpoint) => {
    const cp = fromCheckpoint && result?.checkpoint ? result.checkpoint : 0;
    enterLevel(run.current.level, { startFloor: cp, go: true });
  };

  const toMenu = () => {
    adofaiAudio.stopSession();
    adofaiAudio.resume();
    setResumeIn(0);
    setCountdown(null);
    setPhaseNow("ready");
    setScreen("menu");
  };

  const pause = () => {
    if (live.current.phase !== "playing") return;
    engineRef.current.pause();
    adofaiAudio.suspend();
    setPhaseNow("paused");
  };

  // 멈춘 곳에서 바로 이어 가면 놓치기 쉬워 짧게 세고 다시 튼다
  const resume = () => {
    if (live.current.phase !== "paused" || live.current.resumeIn) return;
    let n = 3;
    setResumeIn(n);
    const step = () => {
      if (live.current.phase !== "paused" || live.current.screen !== "play") return;
      n -= 1;
      if (n > 0) {
        setResumeIn(n);
        setTimeout(step, 400);
        return;
      }
      setResumeIn(0);
      adofaiAudio.resume();
      engineRef.current.resume();
      setPhaseNow("playing");
    };
    setTimeout(step, 400);
  };

  const onClear = (s) => {
    const { level: L, startFloor, autoplay: auto } = run.current;
    const perfect = s.counts.perfect > 0 && JUDGE_ORDER.every((k) => k === "perfect" || s.counts[k] === 0);
    const full = startFloor === 0;
    const prev = live.current.records[L.id] || {};
    const newBest = !auto && full && !(prev.best >= s.xacc);
    if (!auto) {
      const next = {
        ...live.current.records,
        [L.id]: {
          cleared: true,
          best: full ? Math.max(prev.best || 0, s.xacc) : prev.best,
          perfect: prev.perfect || (full && perfect),
        },
      };
      setRecords(next);
      // 커스텀 레벨 기록은 이번 방문 동안만 보여 준다
      writeJson(RECORDS_KEY, Object.fromEntries(Object.entries(next).filter(([k]) => !k.startsWith("custom:"))));
    }
    setTimeout(() => {
      setResult({ type: "clear", ...s, perfect, newBest, usedCheckpoint: !full, auto });
      setPhaseNow("cleared");
    }, 900);
  };

  // ---------- 오프셋 보정 ----------

  const startCalib = () => {
    adofaiAudio.ensure();
    const times = adofaiAudio.startClickTrack(CALIB_BPM, CALIB_LEAD + CALIB_TAPS);
    calibRef.current = { times, taps: [] };
    setCalib({ state: "running", taps: [], result: null });
    const total = (times[times.length - 1] + 1.2) * 1000;
    setTimeout(() => {
      if (live.current.calib.state !== "running") return;
      adofaiAudio.stopSession();
      const taps = calibRef.current.taps;
      setCalib({ state: "done", taps, result: taps.length >= 6 ? Math.round(median(taps)) : null });
    }, total);
  };

  const calibTap = (perf) => {
    const { times, taps } = calibRef.current;
    const t = adofaiAudio.songTime(perf);
    const beat = 60 / CALIB_BPM;
    const idx = Math.round(t / beat);
    if (idx < CALIB_LEAD || idx >= times.length) return;
    taps.push((t - times[idx]) * 1000);
    setCalib((c) => ({ ...c, taps: [...taps] }));
  };

  const stopCalib = () => {
    adofaiAudio.stopSession();
    setCalib({ state: "idle", taps: [], result: null });
  };

  // ---------- 커스텀 레벨 ----------

  const loadCustom = async (fileList) => {
    const files = [...(fileList || [])];
    if (!files.length) return;
    setCustomError("");
    setLoadingCustom(true);
    try {
      const levelFile = files.find((f) => /\.adofai$/i.test(f.name));
      if (!levelFile) throw new Error(".adofai 파일을 함께 골라 주세요");
      const parsed = parseAdofaiFile(await levelFile.text());
      const audios = files.filter((f) => AUDIO_EXT.test(f.name) || f.type.startsWith("audio/"));
      const want = parsed.songFilename.toLowerCase();
      const audioFile = audios.find((f) => f.name.toLowerCase() === want) || audios[0];
      let buffer = null;
      if (audioFile) {
        const ctx = adofaiAudio.ensure();
        try {
          buffer = await ctx.decodeAudioData(await audioFile.arrayBuffer());
        } catch {
          throw new Error(`${audioFile.name}을(를) 이 브라우저에서 재생할 수 없어요. mp3나 wav로 바꿔 보세요`);
        }
      }
      const L = { ...parsed, id: `custom:${parsed.title}:${parsed.angles.length}`, custom: true, buffer, audioName: audioFile?.name || "" };
      const tl = buildTimeline(L);
      tlCache.current.set(L, tl);
      setCustom(L);
      setSel(LEVELS.length);
      setPanel(null);
    } catch (err) {
      setCustomError(err.message || "레벨을 읽지 못했어요");
    } finally {
      setLoadingCustom(false);
    }
  };

  // ---------- 입력 ----------

  const onKey = (e) => {
    const L = live.current;
    if (e.repeat) return;
    if (e.target.closest?.("input, textarea, select")) return;

    if (L.panel === "calib" && L.calib.state === "running") {
      if (e.key === "Escape") return stopCalib();
      if (isPlayKey(e)) {
        e.preventDefault();
        calibTap(e.timeStamp);
      }
      return;
    }
    if (L.panel) {
      if (e.key === "Escape") setPanel(null);
      return;
    }

    if (L.screen === "menu") {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const d = e.key === "ArrowDown" ? 1 : -1;
        setSel((s) => (s + d + L.levels.length) % L.levels.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        enterLevel(L.level);
      }
      return;
    }

    const since = performance.now() - phaseAt.current;
    switch (L.phase) {
      case "ready":
        if (e.key === "Escape") toMenu();
        else if (isPlayKey(e)) {
          e.preventDefault();
          begin();
        }
        break;
      case "playing":
        if (e.key === "Escape") pause();
        else if (isPlayKey(e)) {
          e.preventDefault();
          engineRef.current.press(e.timeStamp);
        }
        break;
      case "paused":
        if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
          e.preventDefault();
          resume();
        }
        break;
      case "failed":
        if (since < 350) break;
        if (e.key === "Escape") toMenu();
        else if (e.key === "r" || e.key === "R") retry(false);
        else if (isPlayKey(e)) {
          e.preventDefault();
          retry(true);
        }
        break;
      case "cleared":
        if (since < 500) break;
        if (e.key === "Escape") toMenu();
        else if (e.key === "r" || e.key === "R" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          retry(false);
        }
        break;
      default:
    }
  };

  const onStagePointer = (e) => {
    if (e.button > 0 || e.target.closest("button, input, label, select, a")) return;
    const L = live.current;
    if (L.panel === "calib" && L.calib.state === "running") return calibTap(e.timeStamp);
    if (L.panel || L.screen !== "play") return;
    if (L.phase === "ready") begin();
    else if (L.phase === "playing") engineRef.current.press(e.timeStamp);
    else if (L.phase === "failed" && performance.now() - phaseAt.current > 350) retry(true);
  };

  live.current = { settings, records, phase, screen, panel, calib, levels, level, resumeIn, onClear, onKey };

  useEffect(() => {
    const key = (e) => live.current.onKey(e);
    const vis = () => {
      if (document.hidden && live.current.phase === "playing" && live.current.screen === "play") pause();
    };
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  const toggleFullscreen = () => {
    const el = frameRef.current;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.().catch(() => {});
  };

  // ---------- 화면 ----------

  const tlOf = (L) => {
    try {
      return timeline(L);
    } catch {
      return null;
    }
  };
  const selTl = tlOf(level);
  const rec = records[level.id];
  const playing = screen === "play";

  return (
    <div
      ref={frameRef}
      className={`adf${playing ? " isPlay" : ""}${fullscreen ? " isFull" : ""}`}
      onPointerDown={onStagePointer}
    >
      <canvas ref={canvasRef} className="adfCanvas" />

      {screen === "menu" ? (
        <div className="adfMenu">
          <div className="adfPanel">
            <h2 className="adfLogo">
              <span className="ice">얼음</span>과 <span className="fire">불</span>의 춤
            </h2>
            <p className="adfTag">A Dance of Fire and Ice · 웹 에디션</p>
            <ol className="adfLevels">
              {levels.map((L, i) => {
                const r = records[L.id];
                const t = tlOf(L);
                return (
                  <li key={L.id}>
                    <button
                      className={`adfLv${i === sel ? " on" : ""}`}
                      onClick={() => setSel(i)}
                      onDoubleClick={() => enterLevel(L)}
                    >
                      <span className="adfLvId">{L.custom ? "★" : L.id}</span>
                      <span className="adfLvBody">
                        <b>{L.title}</b>
                        <small>
                          {Math.round(L.bpm)} BPM{t ? ` · ${fmtTime(t.end - t.firstHit)}` : ""}
                        </small>
                      </span>
                      {r?.cleared ? (
                        <span className={`adfLvRec${r.perfect ? " pure" : ""}`}>
                          {r.best ? `${r.best.toFixed(1)}%` : "클리어"}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
              <li>
                <button className="adfLv adfLvAdd" onClick={() => setPanel("custom")}>
                  <span className="adfLvId">＋</span>
                  <span className="adfLvBody">
                    <b>커스텀 레벨 불러오기</b>
                    <small>.adofai + 음악 파일</small>
                  </span>
                </button>
              </li>
            </ol>
          </div>

          <div className="adfDetail">
            <div className="adfDetailHead">
              <span className="adfDetailId">{level.custom ? "커스텀" : level.id}</span>
              <h3>{level.title}</h3>
              {level.custom ? (
                <p>
                  {[level.artist, level.author && `제작 ${level.author}`].filter(Boolean).join(" · ") || "작자 미상"}
                  <br />
                  {level.audioName ? `🎵 ${level.audioName}` : "음악 파일 없이 메트로놈으로 플레이"}
                  {level.warnings.length ? <><br />⚠️ 일부 기능 미지원: {level.warnings.join(", ")}</> : null}
                </p>
              ) : (
                <p>{level.desc}</p>
              )}
              <div className="adfStats">
                <span>{Math.round(level.bpm)} BPM</span>
                {selTl ? <span>타일 {selTl.floors.length - 1}개</span> : null}
                {selTl?.checkpoints.length ? <span>체크포인트 {selTl.checkpoints.length}</span> : null}
                {rec?.best ? <span>최고 {rec.best.toFixed(2)}%{rec.perfect ? " · 완벽" : ""}</span> : null}
              </div>
            </div>
            <div className="adfActions">
              <button className="adfBtn primary" onClick={() => enterLevel(level)} disabled={!selTl}>
                ▶ 시작
              </button>
              <button className={`adfBtn${autoplay ? " on" : ""}`} onClick={() => setAutoplay((a) => !a)}>
                🤖 자동 플레이 {autoplay ? "켜짐" : "꺼짐"}
              </button>
            </div>
          </div>

          <div className="adfTopBar">
            <button className="adfIcon" onClick={() => setPanel("settings")} aria-label="설정">
              ⚙️
            </button>
            <button className="adfIcon" onClick={toggleFullscreen} aria-label="전체 화면">
              {fullscreen ? "🗗" : "⛶"}
            </button>
          </div>
          <p className="adfKeys">↑↓ 선택 · Enter 시작 · 두 번 클릭해도 시작</p>
        </div>
      ) : (
        <div className="adfHud">
          <div className="adfProgress">
            <i style={{ width: `${hud.progress}%` }} />
          </div>
          <div className="adfHudTop">
            <span className="adfHudTitle">
              {run.current.level?.custom ? "" : `${run.current.level?.id} `}
              {run.current.level?.title}
              {run.current.autoplay ? <em>자동</em> : null}
              {run.current.startFloor > 0 ? <em>체크포인트</em> : null}
            </span>
            <span className="adfHudRight">
              <b>{hud.xacc.toFixed(2)}%</b>
              <button className="adfIcon" onClick={phase === "playing" ? pause : toMenu} aria-label="일시 정지">
                {phase === "playing" ? "⏸" : "✕"}
              </button>
            </span>
          </div>

          {countdown ? <div className="adfCount" key={countdown}>{countdown}</div> : null}

          {phase === "ready" ? (
            <div className="adfOverlay soft">
              <p className="adfBig">아무 키나 눌러 시작</p>
              <p className="adfHint">
                행성이 다음 타일에 닿는 순간 아무 키(또는 화면 터치)를 누르세요.
                <br />
                Esc로 나가기 · 판정 {DIFFICULTIES[settings.difficulty].name} · 오프셋 {settings.offsetMs}ms
              </p>
            </div>
          ) : null}

          {phase === "paused" ? (
            <div className="adfOverlay">
              {resumeIn ? (
                <p className="adfBig">{resumeIn}</p>
              ) : (
                <>
                  <p className="adfBig">일시 정지</p>
                  <div className="adfRow">
                    <button className="adfBtn primary" onClick={resume}>계속하기</button>
                    <button className="adfBtn" onClick={() => retry(false)}>처음부터</button>
                    <button className="adfBtn" onClick={toMenu}>레벨 선택</button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {phase === "failed" && result ? (
            <div className="adfOverlay">
              <p className="adfFail">실패!</p>
              <p className="adfPercent">{Math.floor(result.progress)}%</p>
              <div className="adfRow">
                <button className="adfBtn primary" onClick={() => retry(true)}>
                  {result.checkpoint ? "체크포인트부터" : "다시 하기"}
                </button>
                {result.checkpoint ? (
                  <button className="adfBtn" onClick={() => retry(false)}>처음부터 (R)</button>
                ) : null}
                <button className="adfBtn" onClick={toMenu}>레벨 선택 (Esc)</button>
              </div>
              <p className="adfHint">아무 키나 누르면 바로 다시 시작해요</p>
            </div>
          ) : null}

          {phase === "cleared" && result ? (
            <div className="adfOverlay">
              <p className="adfClear">{result.perfect && !result.usedCheckpoint && !result.auto ? "완벽한 플레이!" : "클리어!"}</p>
              <p className="adfPercent">{result.xacc.toFixed(2)}%</p>
              <div className="adfJudges">
                {JUDGE_ORDER.map((k) => (
                  <span key={k} style={{ color: JUDGES[k].color }}>
                    <small>{JUDGES[k].short}</small>
                    {result.counts[k]}
                  </span>
                ))}
              </div>
              <p className="adfHint">
                {result.auto
                  ? "자동 플레이는 기록되지 않아요"
                  : result.usedCheckpoint
                    ? "체크포인트를 써서 정확도 기록은 남지 않아요"
                    : result.newBest
                      ? "🎉 최고 기록!"
                      : ""}
              </p>
              <div className="adfRow">
                <button className="adfBtn primary" onClick={() => retry(false)}>다시 하기 (R)</button>
                {!run.current.level?.custom && sel + 1 < LEVELS.length ? (
                  <button
                    className="adfBtn"
                    onClick={() => {
                      setSel(sel + 1);
                      enterLevel(LEVELS[sel + 1]);
                    }}
                  >
                    다음 레벨 →
                  </button>
                ) : null}
                <button className="adfBtn" onClick={toMenu}>레벨 선택 (Esc)</button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {panel === "settings" ? (
        <div className="adfModal">
          <div className="adfSheet">
            <h3>설정</h3>
            <label className="adfField">
              <span>판정 난이도</span>
              <div className="adfSeg">
                {Object.entries(DIFFICULTIES).map(([k, d]) => (
                  <button key={k} className={settings.difficulty === k ? "on" : ""} onClick={() => updateSettings({ difficulty: k })}>
                    {d.name}
                  </button>
                ))}
              </div>
            </label>
            <div className="adfField">
              <span>
                입력 오프셋 <b>{settings.offsetMs > 0 ? "+" : ""}{settings.offsetMs}ms</b>
              </span>
              <input
                type="range"
                min={-200}
                max={200}
                step={1}
                value={settings.offsetMs}
                onChange={(e) => updateSettings({ offsetMs: Number(e.target.value) })}
              />
              <small>
                판정이 계속 Late로 나오면 +, Early로 나오면 −. 블루투스 이어폰은 지연이 커서 보정이 꼭 필요해요.
              </small>
              <button className="adfBtn small" onClick={() => setPanel("calib")}>🎧 박자 맞춰 자동 보정</button>
            </div>
            <label className="adfField">
              <span>음악 볼륨 {Math.round(settings.musicVol * 100)}%</span>
              <input type="range" min={0} max={1} step={0.05} value={settings.musicVol} onChange={(e) => updateSettings({ musicVol: Number(e.target.value) })} />
            </label>
            <label className="adfField">
              <span>타격음 볼륨 {Math.round(settings.hitVol * 100)}%</span>
              <input type="range" min={0} max={1} step={0.05} value={settings.hitVol} onChange={(e) => updateSettings({ hitVol: Number(e.target.value) })} />
            </label>
            <div className="adfField">
              <span>타격음</span>
              <div className="adfSeg">
                {HITSOUNDS.map(([k, name]) => (
                  <button
                    key={k}
                    className={settings.hitsound === k ? "on" : ""}
                    onClick={() => {
                      updateSettings({ hitsound: k });
                      adofaiAudio.ensure();
                      adofaiAudio.playHit(k);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <div className="adfRow end">
              <button className="adfBtn primary" onClick={() => setPanel(null)}>닫기</button>
            </div>
          </div>
        </div>
      ) : null}

      {panel === "calib" ? (
        <div className="adfModal">
          <div className="adfSheet">
            <h3>입력 오프셋 보정</h3>
            {calib.state === "idle" ? (
              <>
                <p className="adfSheetDesc">
                  딸깍 소리가 {CALIB_LEAD}번 난 뒤부터 {CALIB_TAPS}번, 소리에 맞춰 아무 키(또는 화면 터치)를 누르세요. 화면 말고 소리에만 집중하세요.
                </p>
                <div className="adfRow end">
                  <button className="adfBtn" onClick={() => setPanel("settings")}>뒤로</button>
                  <button className="adfBtn primary" onClick={startCalib}>시작</button>
                </div>
              </>
            ) : null}
            {calib.state === "running" ? (
              <>
                <div className="adfCalibDots">
                  {Array.from({ length: CALIB_TAPS }, (_, i) => (
                    <i key={i} className={i < calib.taps.length ? "on" : ""} />
                  ))}
                </div>
                <p className="adfSheetDesc">
                  {calib.taps.length ? `지금까지 평균 ${Math.round(median(calib.taps))}ms` : "소리에 맞춰 누르세요…"}
                </p>
                <div className="adfRow end">
                  <button className="adfBtn" onClick={stopCalib}>그만하기</button>
                </div>
              </>
            ) : null}
            {calib.state === "done" ? (
              <>
                {calib.result === null ? (
                  <p className="adfSheetDesc">입력이 너무 적어요. 다시 해 주세요.</p>
                ) : (
                  <p className="adfSheetDesc">
                    측정값 <b>{calib.result > 0 ? "+" : ""}{calib.result}ms</b> (현재 {settings.offsetMs}ms)
                  </p>
                )}
                <div className="adfRow end">
                  <button className="adfBtn" onClick={startCalib}>다시 측정</button>
                  {calib.result !== null ? (
                    <button
                      className="adfBtn primary"
                      onClick={() => {
                        updateSettings({ offsetMs: calib.result });
                        stopCalib();
                        setPanel("settings");
                      }}
                    >
                      적용
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {panel === "custom" ? (
        <div className="adfModal">
          <div
            className="adfSheet"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              loadCustom(e.dataTransfer.files);
            }}
          >
            <h3>커스텀 레벨 불러오기</h3>
            <p className="adfSheetDesc">
              원작용 <b>.adofai</b> 파일과 음악 파일(mp3·ogg·wav)을 함께 고르거나 여기로 끌어다 놓으세요. 압축 파일은 먼저 풀어 주세요.
              파일은 이 브라우저 안에서만 쓰이고 서버로 올라가지 않아요.
            </p>
            <div className="adfRow">
              <label className="adfBtn primary">
                파일 고르기
                <input type="file" multiple accept=".adofai,audio/*,.ogg,.mp3,.wav" hidden onChange={(e) => loadCustom(e.target.files)} />
              </label>
              <label className="adfBtn">
                폴더 고르기
                <input type="file" webkitdirectory="" directory="" hidden onChange={(e) => loadCustom(e.target.files)} />
              </label>
            </div>
            <p className="adfSheetNote">
              지원: 경로, 소용돌이, 속도 변경, 일시정지, 체크포인트, 트랙·배경 색. 장식·카메라·필터 효과와 홀드·자유 이동은 무시돼요.
            </p>
            {loadingCustom ? <p className="adfSheetDesc">불러오는 중…</p> : null}
            {customError ? <p className="adfError">{customError}</p> : null}
            <div className="adfRow end">
              <button className="adfBtn" onClick={() => setPanel(null)}>닫기</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
