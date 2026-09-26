"use client";

import { useEffect, useRef, useState } from "react";
import { volleyAudio } from "../../../lib/volley/audio";
import { CHARACTERS, charById } from "../../../lib/volley/draw";
import { VOLLEY_TEXT } from "../../../lib/volley/i18n";
import { Controls } from "../../../lib/volley/input";
import { VolleyMatch } from "../../../lib/volley/match";
import { Lockstep, VolleyNet, makeRoomCode } from "../../../lib/volley/net";
import { VolleyRenderer } from "../../../lib/volley/render";
import { CharPicker, CharPreview, Chips, PhotoEditor, TouchPad, loadPhoto } from "./parts";

const PROFILES_KEY = "volley_profiles";
const OPTS_KEY = "volley_opts";
const SETTINGS_KEY = "volley_settings";
const DEFAULT_PROFILES = [
  { char: "mochi", photo: null, name: "" },
  { char: "nabi", photo: null, name: "" },
];
const DEFAULT_OPTS = { winningScore: 15, speed: "normal", difficulty: "normal", cpuChar: "potato" };
const DEFAULT_SETTINGS = { music: 0.5, sfx: 0.8, shake: true, classicWall: false };
const SPEEDS = { slow: 20, normal: 25, fast: 30 };
const SCORES = [5, 10, 15];
const MAX_STEPS = 8;
const NET_IDLE = { status: "idle", role: null, code: "", peer: null, error: null, rtt: 0, meAgain: false, peerAgain: false, hostOpts: null };

function readJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(fallback)) return Array.isArray(v) && v.length === fallback.length ? fallback.map((f, i) => ({ ...f, ...v[i] })) : fallback;
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

const cleanName = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 12);
const validChar = (id) => (CHARACTERS.some((c) => c.id === id) ? id : CHARACTERS[0].id);
const validPhoto = (p) => (typeof p === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(p) && p.length < 80000 ? p : null);
const isTyping = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

export default function VolleyGame({ lang = "ko" }) {
  const t = VOLLEY_TEXT[lang] || VOLLEY_TEXT.ko;
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const matchRef = useRef(null);
  const controlsRef = useRef(null);
  const netRef = useRef(null);
  const lockRef = useRef(null);
  const runRef = useRef({ demo: true, mode: "cpu", localSlot: 0, tickMs: 40 });

  const [screen, setScreen] = useState("menu"); // menu | setup | online | play
  const [mode, setMode] = useState("cpu"); // cpu | duo | online
  const [profiles, setProfiles] = useState(DEFAULT_PROFILES);
  const [opts, setOpts] = useState(DEFAULT_OPTS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [panel, setPanel] = useState(null); // "settings" | { photo: slot, src }
  const [phase, setPhase] = useState("playing"); // playing | paused | result
  const [result, setResult] = useState(null);
  const [stalled, setStalled] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [net, setNet] = useState(NET_IDLE);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  // 이벤트 핸들러가 항상 최신 상태를 보도록
  const live = useRef({});
  live.current = { screen, mode, profiles, opts, settings, phase, net, t, panel, isTouch };

  // ---------- 준비 ----------

  useEffect(() => {
    setProfiles(readJson(PROFILES_KEY, DEFAULT_PROFILES));
    setOpts(readJson(OPTS_KEY, DEFAULT_OPTS));
    const s = readJson(SETTINGS_KEY, DEFAULT_SETTINGS);
    setSettings(s);
    volleyAudio.setVolume({ music: s.music, sfx: s.sfx });
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) {
      setJoinCode(room.toUpperCase().slice(0, 5));
      setMode("online");
      setScreen("online");
    }

    const renderer = new VolleyRenderer(canvasRef.current);
    rendererRef.current = renderer;
    controlsRef.current = new Controls();
    const frame = frameRef.current;
    const fit = () => {
      const r = frame.getBoundingClientRect();
      renderer.resize(r.width, r.height, Math.min(window.devicePixelRatio || 1, 2));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    startDemo();

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let stallSince = 0;
    let stallShown = false;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const m = matchRef.current;
      const run = runRef.current;
      const paused = !run.demo && live.current.phase === "paused";
      if (m && !paused) {
        acc += Math.min(250, now - last);
        let n = 0;
        let waiting = false;
        while (acc >= run.tickMs && n < MAX_STEPS) {
          let inputs;
          const lock = lockRef.current;
          if (!run.demo && run.mode === "online") {
            const nt = netRef.current;
            lock.pump(() => controlsRef.current.read(run.localSlot));
            lock.flush((msg) => nt?.send(msg));
            if (!lock.ready()) {
              waiting = true;
              break;
            }
            inputs = lock.take();
          } else if (run.demo) {
            inputs = [null, null];
          } else {
            inputs = [controlsRef.current.read(0), controlsRef.current.read(1)];
          }
          m.tick(inputs);
          renderer.afterTick(now);
          const ev = m.drainEvents();
          renderer.events(ev, now);
          if (!run.demo) onGameEvents(ev);
          if (!run.demo && run.mode === "online" && lock.frame % 50 === 0) {
            lock.recordSum(lock.frame, m.checksum(), (msg) => netRef.current?.send(msg));
            if (lock.desync) {
              onDesync();
              break;
            }
          }
          acc -= run.tickMs;
          n++;
        }
        if (waiting) {
          acc = Math.min(acc, run.tickMs);
          if (!stallSince) stallSince = now;
        } else {
          stallSince = 0;
        }
        const st = !!stallSince && now - stallSince > 400;
        if (st !== stallShown) {
          stallShown = st;
          setStalled(st);
        }
        if (n === MAX_STEPS) acc = 0;
      }
      last = now;
      renderer.draw(now);
    };
    raf = requestAnimationFrame(loop);

    const onFs = () => setFullscreen(document.fullscreenElement === frame);
    document.addEventListener("fullscreenchange", onFs);
    const onVis = () => {
      const L = live.current;
      if (document.hidden && L.screen === "play" && L.mode !== "online" && L.phase === "playing") pauseGame();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("visibilitychange", onVis);
      volleyAudio.stopMusic();
      netRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.labels = { ready: t.ready, go: t.go };
    r.shakeOn = settings.shake && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, [t, settings.shake]);

  // ---------- 키보드 ----------

  useEffect(() => {
    const onDown = (e) => {
      const L = live.current;
      if (L.screen !== "play" || L.panel || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.code === "Escape" || e.code === "KeyP") && L.mode !== "online") {
        e.preventDefault();
        if (L.phase === "playing") pauseGame();
        else if (L.phase === "paused") resumeGame();
        return;
      }
      if (L.phase !== "playing") return;
      if (controlsRef.current.keydown(e.code, e.repeat)) {
        e.preventDefault();
        volleyAudio.ensure();
      }
    };
    const onUp = (e) => controlsRef.current?.keyup(e.code);
    const onBlur = () => controlsRef.current?.clear();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 저장 ----------

  const updateProfile = (slot, patch) => {
    setProfiles((ps) => {
      const next = ps.map((p, i) => (i === slot ? { ...p, ...patch } : p));
      writeJson(PROFILES_KEY, next);
      return next;
    });
  };

  const updateOpts = (patch) => {
    setOpts((o) => {
      const next = { ...o, ...patch };
      writeJson(OPTS_KEY, next);
      return next;
    });
  };

  const updateSettings = (patch) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      writeJson(SETTINGS_KEY, next);
      volleyAudio.setVolume({ music: next.music, sfx: next.sfx });
      return next;
    });
  };

  // ---------- 경기 ----------

  function startDemo() {
    const ids = CHARACTERS.map((c) => c.id).sort(() => Math.random() - 0.5);
    const match = new VolleyMatch({ seed: (Math.random() * 2 ** 32) >>> 0, winningScore: 99, cpu: [true, true] });
    runRef.current = { demo: true, mode: "demo", localSlot: 0, tickMs: 1000 / SPEEDS.normal };
    lockRef.current = null;
    matchRef.current = match;
    const r = rendererRef.current;
    r.setSlots([
      { ch: charById(ids[0]), photo: null, name: "" },
      { ch: charById(ids[1]), photo: null, name: "" },
    ]);
    r.attach(match, runRef.current.tickMs);
  }

  const slotOf = (profile, name) => ({ ch: charById(profile.char), photo: loadPhoto(profile.photo), name });

  function beginMatch({ mode: m, seed, winningScore, fps, difficulty = "normal", classicWall, slots, localSlot = 0, delay = 0 }) {
    const match = new VolleyMatch({ seed, winningScore, cpu: m === "cpu" ? [false, true] : [false, false], difficulty, classicWall });
    const tickMs = 1000 / fps;
    runRef.current = { demo: false, mode: m, localSlot, tickMs };
    lockRef.current = m === "online" ? new Lockstep(localSlot, delay, seed) : null;
    controlsRef.current.setMode(m === "duo" ? "duo" : "solo", localSlot);
    matchRef.current = match;
    const r = rendererRef.current;
    r.setSlots(slots);
    r.attach(match, tickMs);
    setResult(null);
    setPhase("playing");
    setStalled(false);
    setScreen("play");
    volleyAudio.ensure();
    volleyAudio.startMusic();
    const f = frameRef.current.getBoundingClientRect();
    if (live.current.isTouch && !document.fullscreenElement && frameRef.current.requestFullscreen) {
      frameRef.current
        .requestFullscreen()
        .then(() => window.screen.orientation?.lock?.("landscape"))
        .catch(() => {});
    } else if (!document.fullscreenElement && (f.top < 0 || f.bottom > window.innerHeight)) {
      frameRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  const startLocal = () => {
    const L = live.current;
    const P = L.profiles;
    const tt = L.t;
    const slots =
      L.mode === "cpu"
        ? [slotOf(P[0], cleanName(P[0].name) || tt.me), { ch: charById(L.opts.cpuChar), photo: null, name: tt.cpu }]
        : [slotOf(P[0], tt.p1), slotOf(P[1], tt.p2)];
    beginMatch({
      mode: L.mode,
      seed: (Math.random() * 2 ** 32) >>> 0,
      winningScore: L.opts.winningScore,
      fps: SPEEDS[L.opts.speed] || 25,
      difficulty: L.opts.difficulty,
      classicWall: L.settings.classicWall,
      slots,
    });
  };

  function onGameEvents(list) {
    for (const e of list) {
      switch (e.type) {
        case "jump":
          volleyAudio.play("jump");
          break;
        case "dive":
          volleyAudio.play("dive");
          break;
        case "swing":
          volleyAudio.play("swing");
          break;
        case "hit":
          volleyAudio.play(e.power ? "smash" : "hit");
          break;
        case "net":
          volleyAudio.play("net");
          break;
        case "ground":
          volleyAudio.play("ground");
          break;
        case "land":
        case "slide":
          volleyAudio.play("land");
          break;
        case "score":
          volleyAudio.play("score");
          break;
        case "go":
          volleyAudio.play("whistle");
          break;
        case "result": {
          const run = runRef.current;
          const mine = run.mode === "duo" ? true : e.winner === run.localSlot;
          volleyAudio.stopMusic();
          volleyAudio.play(mine ? "win" : "lose");
          setResult({ winner: e.winner, scores: [...matchRef.current.scores] });
          setPhase("result");
          setNet((n) => ({ ...n, meAgain: false, peerAgain: false }));
          break;
        }
        default:
      }
    }
  }

  function pauseGame() {
    if (runRef.current.demo || runRef.current.mode === "online") return;
    setPhase("paused");
    controlsRef.current.clear();
    volleyAudio.stopMusic();
  }

  function resumeGame() {
    setPhase("playing");
    volleyAudio.startMusic();
  }

  const toMenu = () => {
    volleyAudio.stopMusic();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    if (live.current.mode === "online") {
      leaveRoom();
      setScreen("online");
    } else {
      setScreen("setup");
    }
    startDemo();
  };

  // ---------- 온라인 ----------

  const myHello = () => {
    const me = live.current.profiles[0];
    return { t: "hello", name: cleanName(me.name) || live.current.t.defaultName, char: me.char, photo: me.photo || null };
  };

  const netHandlers = {
    onOpen: () => {
      netRef.current.send(myHello());
      if (live.current.net.role === "host") netRef.current.send({ t: "opts", opts: hostOptsNow() });
    },
    onMessage: (msg) => onNetMessage(msg),
    onClose: () => onPeerLeft(),
    onError: (code) => {
      if (code === "full") {
        netRef.current?.close();
        netRef.current = null;
        setNet({ ...NET_IDLE, error: "full" });
      }
    },
  };

  const hostOptsNow = () => {
    const L = live.current;
    return { winningScore: L.opts.winningScore, speed: L.opts.speed, classicWall: L.settings.classicWall };
  };

  function onNetMessage(msg) {
    if (!msg || typeof msg !== "object") return;
    const role = live.current.net.role;
    switch (msg.t) {
      case "hello":
        setNet((n) => ({ ...n, error: null, peer:{ name: cleanName(msg.name) || live.current.t.defaultName, char: validChar(msg.char), photo: validPhoto(msg.photo) } }));
        break;
      case "opts":
        if (role === "guest" && msg.opts) setNet((n) => ({ ...n, hostOpts: msg.opts }));
        break;
      case "ping":
        netRef.current?.send({ t: "pong", at: msg.at });
        break;
      case "pong": {
        const rtt = Math.max(0, performance.now() - msg.at);
        setNet((n) => ({ ...n, rtt: n.rtt ? Math.round(n.rtt * 0.7 + rtt * 0.3) : Math.round(rtt) }));
        break;
      }
      case "start":
        if (role === "guest") startOnline(msg);
        break;
      // 지난 경기에서 늦게 도착한 입력은 버린다
      case "in":
        if (lockRef.current?.id === msg.g && Array.isArray(msg.v)) lockRef.current.receive(msg.f, msg.v);
        break;
      case "cs":
        if (lockRef.current?.id === msg.g) lockRef.current.receiveSum(msg.f, msg.h);
        break;
      case "again":
        setNet((n) => ({ ...n, peerAgain: true }));
        if (role === "host" && live.current.net.meAgain) hostStart();
        break;
      case "lobby":
        backToRoom();
        break;
      default:
    }
  }

  // 대기실에서 지연 시간을 잰다
  useEffect(() => {
    if (net.status !== "room" || !net.peer) return;
    const id = setInterval(() => netRef.current?.send({ t: "ping", at: performance.now() }), 1000);
    netRef.current?.send({ t: "ping", at: performance.now() });
    return () => clearInterval(id);
  }, [net.status, net.peer]);

  // 대기실에서 내 캐릭터나 옵션을 바꾸면 상대에게 알린다
  useEffect(() => {
    if (net.status !== "room" || !netRef.current?.connected) return;
    netRef.current.send(myHello());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles[0].char, profiles[0].photo, profiles[0].name, net.status]);

  useEffect(() => {
    if (net.status !== "room" || net.role !== "host" || !netRef.current?.connected) return;
    netRef.current.send({ t: "opts", opts: hostOptsNow() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.winningScore, opts.speed, settings.classicWall, net.status, net.peer]);

  const createRoom = async () => {
    volleyAudio.ensure();
    netRef.current?.close();
    setNet({ ...NET_IDLE, status: "busy", role: "host" });
    for (let tries = 0; tries < 3; tries++) {
      const code = makeRoomCode();
      const nt = new VolleyNet(netHandlers);
      try {
        await nt.host(code);
        netRef.current = nt;
        setNet({ ...NET_IDLE, status: "room", role: "host", code });
        return;
      } catch (why) {
        nt.close();
        if (why !== "taken") {
          setNet({ ...NET_IDLE, error: why });
          return;
        }
      }
    }
    setNet({ ...NET_IDLE, error: "taken" });
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    volleyAudio.ensure();
    netRef.current?.close();
    setNet({ ...NET_IDLE, status: "busy", role: "guest", code });
    const nt = new VolleyNet(netHandlers);
    netRef.current = nt;
    try {
      await nt.join(code);
      setNet((n) => (n.status === "busy" ? { ...n, status: "room" } : n));
    } catch (why) {
      nt.close();
      if (netRef.current === nt) netRef.current = null;
      setNet({ ...NET_IDLE, error: why });
    }
  };

  function leaveRoom() {
    netRef.current?.close();
    netRef.current = null;
    lockRef.current = null;
    setNet(NET_IDLE);
  }

  function onPeerLeft() {
    const L = live.current;
    lockRef.current = null;
    if (L.screen === "play") {
      volleyAudio.stopMusic();
      startDemo();
      setScreen("online");
    }
    if (L.net.role === "host") {
      setNet((n) => ({ ...n, peer: null, error: "left", rtt: 0, hostOpts: null }));
    } else {
      netRef.current?.close();
      netRef.current = null;
      setNet({ ...NET_IDLE, error: "left" });
    }
  }

  function onDesync() {
    volleyAudio.stopMusic();
    lockRef.current = null;
    startDemo();
    setScreen("online");
    setNet((n) => ({ ...n, error: "desync" }));
  }

  function backToRoom() {
    volleyAudio.stopMusic();
    lockRef.current = null;
    startDemo();
    setScreen("online");
    setNet((n) => ({ ...n, meAgain: false, peerAgain: false }));
  }

  function hostStart() {
    const L = live.current;
    const o = hostOptsNow();
    const fps = SPEEDS[o.speed] || 25;
    const tickMs = 1000 / fps;
    const delay = Math.max(2, Math.min(8, Math.ceil((L.net.rtt / 2 + 15) / tickMs) + 1));
    const cfg = { t: "start", seed: (Math.random() * 2 ** 32) >>> 0, winningScore: o.winningScore, fps, classicWall: o.classicWall, delay };
    netRef.current?.send(cfg);
    startOnline(cfg);
  }

  function startOnline(cfg) {
    const L = live.current;
    const me = L.profiles[0];
    const peer = L.net.peer || { name: L.t.defaultName, char: "nabi", photo: null };
    const mine = slotOf(me, cleanName(me.name) || L.t.defaultName);
    const theirs = slotOf(peer, peer.name);
    const host = L.net.role === "host";
    beginMatch({
      mode: "online",
      seed: cfg.seed >>> 0,
      winningScore: SCORES.includes(cfg.winningScore) ? cfg.winningScore : 15,
      fps: Object.values(SPEEDS).includes(cfg.fps) ? cfg.fps : 25,
      classicWall: !!cfg.classicWall,
      slots: host ? [mine, theirs] : [theirs, mine],
      localSlot: host ? 0 : 1,
      delay: Math.max(1, Math.min(10, cfg.delay | 0)),
    });
    setNet((n) => ({ ...n, error: null, meAgain: false, peerAgain: false }));
  }

  const askAgain = () => {
    volleyAudio.ensure();
    netRef.current?.send({ t: "again" });
    setNet((n) => ({ ...n, meAgain: true }));
    const n = live.current.net;
    if (n.role === "host" && n.peerAgain) hostStart();
  };

  const copyInvite = () => {
    const url = `${window.location.origin}/games/volley?room=${net.code}`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      },
      () => {},
    );
  };

  // ---------- 기타 ----------

  const toggleFullscreen = async () => {
    const f = frameRef.current;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await f.requestFullscreen();
        await window.screen.orientation?.lock?.("landscape").catch(() => {});
      }
    } catch {}
  };

  const pickPhoto = (slot, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPanel({ photo: slot, src: reader.result });
    reader.readAsDataURL(file);
  };

  const goMode = (m) => {
    volleyAudio.ensure();
    volleyAudio.play("click");
    setMode(m);
    setScreen(m === "online" ? "online" : "setup");
  };

  // ---------- 화면 ----------

  const nameOf = (c) => c[lang] || c.ko;
  const descOf = (c) => (lang === "en" ? c.enDesc : c.koDesc);
  const scoreOptions = SCORES.map((s) => [s, String(s)]);
  const speedOptions = Object.keys(SPEEDS).map((k) => [k, t.speeds[k]]);
  const help = isTouch && mode !== "duo" ? t.help.touch : mode === "duo" ? t.help.duo : t.help.solo;

  const playerCard = ({ label, profile, slot, editable = true, extra = null, nameInput = false }) => {
    const ch = charById(profile.char);
    return (
      <div className="vbCard" style={{ "--c": ch.color }}>
        <div className="vbCardLabel">{label}</div>
        <CharPreview ch={ch} photo={profile.photo} size={92} animate />
        <div className="vbCardName">{profile.displayName || nameOf(ch)}</div>
        <div className="vbCardDesc">{profile.displayName ? nameOf(ch) : descOf(ch)}</div>
        {nameInput && (
          <input
            className="vbInput"
            value={profile.name}
            maxLength={12}
            placeholder={t.nicknamePh}
            aria-label={t.nickname}
            onChange={(e) => updateProfile(slot, { name: e.target.value })}
          />
        )}
        {editable && (
          <>
            <CharPicker value={profile.char} lang={lang} onChange={(id) => (slot === "cpu" ? updateOpts({ cpuChar: id }) : updateProfile(slot, { char: id }))} />
            {slot !== "cpu" && (
              <div className="vbRow tight">
                <label className="vbBtn small">
                  {profile.photo ? t.photoChange : t.photo}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      pickPhoto(slot, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {profile.photo && (
                  <button type="button" className="vbBtn small ghost" onClick={() => updateProfile(slot, { photo: null })}>
                    {t.photoRemove}
                  </button>
                )}
              </div>
            )}
          </>
        )}
        {extra}
      </div>
    );
  };

  const renderMenu = () => (
    <div className="vbOverlay">
      <div className="vbPanel menu">
        <h2 className="vbLogo">{t.pageTitle}</h2>
        <p className="vbTagline">{t.tagline}</p>
        <div className="vbModes">
          <button type="button" className="vbMode" onClick={() => goMode("cpu")}>
            <span className="vbModeIcon">🤖</span>
            <b>{t.modeCpu}</b>
            <small>{t.modeCpuDesc}</small>
          </button>
          <button type="button" className="vbMode" onClick={() => goMode("duo")}>
            <span className="vbModeIcon">⌨️</span>
            <b>{t.modeDuo}</b>
            <small>{isTouch ? t.duoTouchNote : t.modeDuoDesc}</small>
          </button>
          <button type="button" className="vbMode" onClick={() => goMode("online")}>
            <span className="vbModeIcon">🌐</span>
            <b>{t.modeOnline}</b>
            <small>{t.modeOnlineDesc}</small>
          </button>
        </div>
        <button type="button" className="vbBtn ghost" onClick={() => setPanel("settings")}>
          ⚙️ {t.settings}
        </button>
      </div>
    </div>
  );

  const renderSetup = () => (
    <div className="vbOverlay">
      <div className="vbPanel">
        <h2>{mode === "cpu" ? t.modeCpu : t.modeDuo}</h2>
        <div className="vbVs">
          {playerCard({ label: mode === "cpu" ? t.me : t.p1, profile: profiles[0], slot: 0 })}
          <div className="vbVsMark">VS</div>
          {mode === "cpu"
            ? playerCard({
                label: t.cpu,
                profile: { char: opts.cpuChar, photo: null },
                slot: "cpu",
                extra: (
                  <div className="vbOpt">
                    <span>{t.difficulty}</span>
                    <Chips value={opts.difficulty} options={Object.entries(t.difficulties)} onChange={(v) => updateOpts({ difficulty: v })} />
                  </div>
                ),
              })
            : playerCard({ label: t.p2, profile: profiles[1], slot: 1 })}
        </div>
        <div className="vbOpts">
          <div className="vbOpt">
            <span>{t.targetScore}</span>
            <Chips value={opts.winningScore} options={scoreOptions} onChange={(v) => updateOpts({ winningScore: v })} />
          </div>
          <div className="vbOpt">
            <span>{t.speed}</span>
            <Chips value={opts.speed} options={speedOptions} onChange={(v) => updateOpts({ speed: v })} />
          </div>
        </div>
        <div className="vbRow">
          <button type="button" className="vbBtn" onClick={() => setScreen("menu")}>
            {t.back}
          </button>
          <button type="button" className="vbBtn primary big" onClick={startLocal}>
            ▶ {t.start}
          </button>
        </div>
      </div>
    </div>
  );

  const renderOnline = () => {
    const inRoom = net.status === "room";
    const host = net.role === "host";
    const me = { ...profiles[0], displayName: cleanName(profiles[0].name) || t.defaultName };
    const peer = net.peer ? { ...net.peer, displayName: net.peer.name } : null;
    const shown = host ? hostOptsNow() : net.hostOpts;
    const waitCard = (
      <div className="vbCard waiting">
        <div className="vbCardLabel">{host ? t.guest : t.host}</div>
        <div className="vbWaitDot" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="vbCardDesc">{t.waitingGuest}</div>
      </div>
    );
    const meCard = playerCard({ label: `${t.me}${inRoom ? ` · ${host ? t.host : t.guest}` : ""}`, profile: me, slot: 0, nameInput: true });
    const peerCard = peer ? playerCard({ label: host ? t.guest : t.host, profile: peer, slot: -1, editable: false }) : waitCard;
    return (
      <div className="vbOverlay">
        <div className="vbPanel">
          <h2>{t.modeOnline}</h2>
          {net.error && <p className="vbError">{t.errors[net.error] || t.errors.network}</p>}
          {!inRoom ? (
            <div className="vbVs">
              {meCard}
              <div className="vbJoin">
                <button type="button" className="vbBtn primary big" disabled={net.status === "busy"} onClick={createRoom}>
                  {t.createRoom}
                </button>
                <div className="vbOr">{t.or}</div>
                <form
                  className="vbJoinRow"
                  onSubmit={(e) => {
                    e.preventDefault();
                    joinRoom();
                  }}
                >
                  <input
                    className="vbInput code"
                    value={joinCode}
                    maxLength={5}
                    placeholder={t.codePh}
                    aria-label={t.codePh}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  />
                  <button type="submit" className="vbBtn" disabled={net.status === "busy" || joinCode.length < 4}>
                    {t.joinRoom}
                  </button>
                </form>
                {net.status === "busy" && <p className="vbMuted">{host ? t.creating : t.joining}</p>}
              </div>
            </div>
          ) : (
            <>
              <div className="vbRoomHead">
                <span>{t.roomCode}</span>
                <b className="vbCode">{net.code}</b>
                <button type="button" className="vbBtn small" onClick={copyInvite}>
                  {copied ? t.copied : t.copyLink}
                </button>
                {net.peer && net.rtt > 0 && <span className="vbPing">{t.ping(net.rtt)}</span>}
              </div>
              <div className="vbVs">
                {host ? meCard : peerCard}
                <div className="vbVsMark">VS</div>
                {host ? peerCard : meCard}
              </div>
              {shown && (
                <div className="vbOpts">
                  <div className="vbOpt">
                    <span>{t.targetScore}</span>
                    <Chips value={shown.winningScore} options={scoreOptions} disabled={!host} onChange={(v) => updateOpts({ winningScore: v })} />
                  </div>
                  <div className="vbOpt">
                    <span>{t.speed}</span>
                    <Chips value={shown.speed} options={speedOptions} disabled={!host} onChange={(v) => updateOpts({ speed: v })} />
                  </div>
                  <div className="vbOpt">
                    <span>{t.classicWall}</span>
                    <Chips
                      value={!!shown.classicWall}
                      options={[
                        [true, t.on],
                        [false, t.off],
                      ]}
                      disabled={!host}
                      onChange={(v) => updateSettings({ classicWall: v })}
                    />
                  </div>
                </div>
              )}
            </>
          )}
          <div className="vbRow">
            <button
              type="button"
              className="vbBtn"
              onClick={() => {
                if (inRoom || net.status === "busy") leaveRoom();
                else setScreen("menu");
              }}
            >
              {inRoom ? t.leave : t.back}
            </button>
            {inRoom &&
              (host ? (
                <button type="button" className="vbBtn primary big" disabled={!net.peer} onClick={hostStart}>
                  ▶ {t.start}
                </button>
              ) : (
                <span className="vbMuted">{t.hostStarts}</span>
              ))}
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    const run = runRef.current;
    const slots = rendererRef.current?.slots || [];
    const w = slots[result.winner];
    const title =
      run.mode === "duo" ? t.winsOf(result.winner === 0 ? t.p1 : t.p2) : result.winner === run.localSlot ? t.win : t.lose;
    return (
      <div className="vbOverlay dim">
        <div className="vbPanel result">
          {w && <CharPreview ch={w.ch} photo={w.photo?.src || null} face="happy" size={110} animate />}
          <h2 className="vbResultTitle">{title}</h2>
          {w?.name && run.mode !== "duo" && <p className="vbMuted">{t.winsOf(w.name)}</p>}
          <div className="vbFinal">
            <span style={{ color: slots[0]?.ch.color }}>{result.scores[0]}</span>
            <i>:</i>
            <span style={{ color: slots[1]?.ch.color }}>{result.scores[1]}</span>
          </div>
          {run.mode === "online" ? (
            <>
              {net.peerAgain && !net.meAgain && <p className="vbMuted">{t.peerWantsAgain}</p>}
              <div className="vbRow">
                <button
                  type="button"
                  className="vbBtn"
                  onClick={() => {
                    netRef.current?.send({ t: "lobby" });
                    backToRoom();
                  }}
                >
                  {t.toRoom}
                </button>
                <button type="button" className="vbBtn primary big" disabled={net.meAgain} onClick={askAgain}>
                  {net.meAgain ? t.waitingAgain : t.again}
                </button>
              </div>
            </>
          ) : (
            <div className="vbRow">
              <button type="button" className="vbBtn" onClick={toMenu}>
                {t.toMenu}
              </button>
              <button type="button" className="vbBtn primary big" onClick={startLocal}>
                {t.again}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPause = () => (
    <div className="vbOverlay dim">
      <div className="vbPanel small">
        <h2>{t.paused}</h2>
        <div className="vbCol">
          <button type="button" className="vbBtn primary big" onClick={resumeGame}>
            ▶ {t.resume}
          </button>
          <button type="button" className="vbBtn" onClick={startLocal}>
            {t.restart}
          </button>
          <button type="button" className="vbBtn" onClick={toMenu}>
            {t.toMenu}
          </button>
          <button type="button" className="vbBtn ghost" onClick={() => setPanel("settings")}>
            ⚙️ {t.settings}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="vbModal" role="dialog" aria-modal="true" aria-label={t.settings}>
      <div className="vbModalBox">
        <h3>{t.settings}</h3>
        <label className="vbSlider">
          <span>{t.musicVol}</span>
          <input type="range" min="0" max="1" step="0.05" value={settings.music} onChange={(e) => updateSettings({ music: Number(e.target.value) })} />
        </label>
        <label className="vbSlider">
          <span>{t.sfxVol}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.sfx}
            onChange={(e) => updateSettings({ sfx: Number(e.target.value) })}
            onPointerUp={() => {
              volleyAudio.ensure();
              volleyAudio.play("hit");
            }}
          />
        </label>
        <div className="vbOpt">
          <span>{t.shake}</span>
          <Chips
            value={settings.shake}
            options={[
              [true, t.on],
              [false, t.off],
            ]}
            onChange={(v) => updateSettings({ shake: v })}
          />
        </div>
        <div className="vbOpt">
          <span>{t.classicWall}</span>
          <Chips
            value={settings.classicWall}
            options={[
              [true, t.on],
              [false, t.off],
            ]}
            onChange={(v) => updateSettings({ classicWall: v })}
          />
        </div>
        <p className="vbMuted small">{t.classicWallDesc}</p>
        <div className="vbRow">
          <button type="button" className="vbBtn primary" onClick={() => setPanel(null)}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );

  const playing = screen === "play";
  const online = runRef.current.mode === "online";

  return (
    <>
      <div ref={frameRef} className={`vb${playing ? " isPlay" : ""}${fullscreen ? " isFull" : ""}`}>
        <canvas ref={canvasRef} className="vbCanvas" />

        {playing && (
          <div className="vbHudBtns">
            {online ? (
              <button
                type="button"
                className="vbIcon"
                aria-label={t.leave}
                title={t.leave}
                onClick={() => {
                  if (window.confirm(t.leaveConfirm)) {
                    leaveRoom();
                    volleyAudio.stopMusic();
                    startDemo();
                    setScreen("online");
                  }
                }}
              >
                ✕
              </button>
            ) : (
              <button type="button" className="vbIcon" aria-label={t.pause} title={t.pause} onClick={() => (phase === "paused" ? resumeGame() : pauseGame())}>
                ❚❚
              </button>
            )}
            <button type="button" className="vbIcon" aria-label={t.fullscreen} title={t.fullscreen} onClick={toggleFullscreen}>
              ⛶
            </button>
          </div>
        )}

        {playing && isTouch && mode !== "duo" && phase === "playing" && <TouchPad controls={controlsRef.current} t={t} />}
        {playing && online && stalled && phase === "playing" && <div className="vbToast">{t.stalled}</div>}

        {screen === "menu" && renderMenu()}
        {screen === "setup" && renderSetup()}
        {screen === "online" && renderOnline()}
        {playing && phase === "paused" && renderPause()}
        {playing && phase === "result" && result && renderResult()}

        {panel === "settings" && renderSettings()}
        {panel && panel.photo !== undefined && (
          <PhotoEditor
            src={panel.src}
            t={t}
            onCancel={() => setPanel(null)}
            onApply={(url) => {
              updateProfile(panel.photo, { photo: url });
              setPanel(null);
            }}
          />
        )}
      </div>

      <section className="vbHelp">
        <h2>{t.helpTitle}</h2>
        <dl>
          {help.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
