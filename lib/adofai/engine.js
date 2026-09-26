// 얼음과 불의 춤 캔버스 엔진: 행성 궤도, 판정, 카메라, 그리기
import { orbitAngle } from "./level";

export const JUDGES = {
  tooEarly: { label: "Too Early!", short: "Too Early", color: "#ff4d57", acc: 0.2 },
  early: { label: "Early!", short: "Early", color: "#ff9a3c", acc: 0.4 },
  ePerfect: { label: "EPerfect!", short: "EP", color: "#e5f24a", acc: 0.75 },
  perfect: { label: "Perfect!", short: "Perfect", color: "#5cf05a", acc: 1 },
  lPerfect: { label: "LPerfect!", short: "LP", color: "#e5f24a", acc: 0.75 },
  late: { label: "Late!", short: "Late", color: "#ff9a3c", acc: 0.4 },
  miss: { label: "Miss!", short: "Miss", color: "#ff4d57", acc: 0 },
};
export const JUDGE_ORDER = ["tooEarly", "early", "ePerfect", "perfect", "lPerfect", "late"];

// 판정 범위(초). p = Perfect, ep = E/L Perfect, e = Early/Late (이보다 늦으면 실패)
export const DIFFICULTIES = {
  lenient: { name: "느슨", p: 0.06, ep: 0.1, e: 0.15 },
  normal: { name: "보통", p: 0.045, ep: 0.08, e: 0.12 },
  strict: { name: "엄격", p: 0.03, ep: 0.055, e: 0.09 },
};

const FIRE = { core: "#ff4d2e", glow: "#ff8a3d" };
const ICE = { core: "#2f8dff", glow: "#5fc0ff" };
const rad = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;

export const emptyCounts = () => Object.fromEntries(JUDGE_ORDER.map((k) => [k, 0]));

export function xAccuracy(counts) {
  let num = 0;
  let den = 0;
  for (const k of JUDGE_ORDER) {
    num += counts[k] * JUDGES[k].acc;
    den += counts[k];
  }
  return den ? (num / den) * 100 : 100;
}

export class AdofaiEngine {
  constructor(canvas, handlers = {}) {
    this.canvas = canvas;
    this.g = canvas.getContext("2d");
    this.h = handlers;
    this.w = 1;
    this.hgt = 1;
    this.dpr = 1;
    this.mode = "idle";
    this.tl = null;
    this.stars = Array.from({ length: 110 }, () => ({
      u: Math.random(),
      v: Math.random(),
      r: Math.random() * 1.3 + 0.3,
      ph: Math.random() * TAU,
      depth: Math.random() * 0.35 + 0.08,
    }));
    this.cam = { x: 0, y: 0 };
    this.lastPerf = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  resize(w, h, dpr) {
    this.w = Math.max(1, w);
    this.hgt = Math.max(1, h);
    this.dpr = dpr;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.hgt * dpr);
  }

  unit() {
    return Math.max(42, Math.min(96, Math.min(this.w, this.hgt) / (this.w < 600 ? 7 : 6)));
  }

  reset(level, tl, startFloor) {
    this.level = level;
    this.tl = tl;
    this.pivot = startFloor;
    this.startFloor = startFloor;
    this.counts = emptyCounts();
    this.hitAt = new Map();
    this.fx = [];
    this.errs = [];
    this.trails = [[], []];
    this.lastT = -Infinity;
    this.lastCd = null;
    const f = tl.floors[startFloor];
    this.cam = { x: f.x, y: f.y };
  }

  // 곡을 이 시각부터 틀면 카운트다운이 딱 맞게 들어간다
  sessionFrom() {
    const F = this.tl.floors;
    const s = this.startFloor;
    const x = F[s + 1].time - (this.tl.countdown + 1) * (60 / F[s].bpm);
    return s === 0 ? Math.min(0, x) : x;
  }

  // 메뉴 배경: 소리 없이 자동 플레이 미리보기
  preview(level, tl) {
    this.mode = "preview";
    this.autoplay = true;
    this.reset(level, tl, 0);
    const from = tl.floors[1].time - 1.2;
    const p0 = performance.now();
    this.clock = () => from + (performance.now() - p0) / 1000;
    this.phase = "playing";
  }

  play(level, tl, { startFloor = 0, autoplay = false, difficulty = "normal", offsetMs = 0 }) {
    this.mode = "play";
    this.autoplay = autoplay;
    this.win = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    this.offset = offsetMs / 1000;
    this.reset(level, tl, startFloor);
    this.phase = "ready";
    this.frozenT = this.sessionFrom();
    this.clock = null;
  }

  begin(clock) {
    this.clock = clock;
    this.phase = "playing";
  }

  pause() {
    if (this.phase !== "playing") return;
    this.frozenT = this.lastT;
    this.phase = "paused";
  }

  resume() {
    if (this.phase === "paused") this.phase = "playing";
  }

  idle() {
    this.mode = "idle";
    this.tl = null;
  }

  lastCheckpoint() {
    let cp = 0;
    for (const c of this.tl.checkpoints) if (c <= this.pivot) cp = c;
    return cp;
  }

  progress() {
    return (this.pivot / (this.tl.floors.length - 1)) * 100;
  }

  // 판정 범위를 이웃 타일 간격에 맞춰 줄인다 (빠른 연타에서 두 타일이 겹치지 않게)
  earlyWindow(i) {
    const F = this.tl.floors;
    return Math.min(this.win.e, Math.max(this.win.p, 0.6 * (F[i].time - F[i - 1].time)));
  }

  lateWindow(i) {
    const F = this.tl.floors;
    const gap = i + 1 < F.length ? F[i + 1].time - F[i].time : Infinity;
    return Math.min(this.win.e, Math.max(this.win.p, 0.6 * gap));
  }

  /** 키 입력. perf는 이벤트의 performance 시각 */
  press(perf) {
    if (this.mode !== "play" || this.phase !== "playing" || this.autoplay) return;
    const F = this.tl.floors;
    const next = this.pivot + 1;
    if (next >= F.length) return;
    const t = this.clock(Math.min(perf, performance.now())) - this.offset;
    const err = t - F[next].time;
    if (err < -this.earlyWindow(next)) {
      this.counts.tooEarly++;
      this.addJudge("tooEarly", next, err);
      this.h.onHit?.(this.stats(), false);
      return;
    }
    const a = Math.abs(err);
    const kind = a <= this.win.p ? "perfect" : a <= this.win.ep ? (err < 0 ? "ePerfect" : "lPerfect") : err < 0 ? "early" : "late";
    this.hit(next, kind, err);
  }

  hit(i, kind, err) {
    this.pivot = i;
    this.counts[kind]++;
    this.hitAt.set(i, performance.now());
    this.addJudge(kind, i, err);
    if (this.mode === "play") this.h.onHit?.(this.stats(), true);
    if (i === this.tl.floors.length - 1 && this.mode === "play") {
      this.phase = "cleared";
      this.h.onClear?.(this.stats());
    }
  }

  addJudge(kind, i, err) {
    const f = this.tl.floors[i];
    const now = performance.now();
    this.fx.push({ kind, x: f.x, y: f.y, born: now });
    if (this.fx.length > 14) this.fx.shift();
    if (this.mode === "play" && err !== null) {
      this.errs.push({ err, kind, born: now });
      if (this.errs.length > 40) this.errs.shift();
    }
  }

  stats() {
    return {
      counts: { ...this.counts },
      xacc: xAccuracy(this.counts),
      progress: this.progress(),
      pivot: this.pivot,
      startFloor: this.startFloor,
    };
  }

  fail(t) {
    this.phase = "failed";
    this.frozenT = t;
    const next = this.tl.floors[this.pivot + 1];
    this.fx.push({ kind: "miss", x: next.x, y: next.y, born: performance.now() });
    this.h.onFail?.({ ...this.stats(), checkpoint: this.lastCheckpoint() });
  }

  currentTime() {
    if (this.phase === "ready" || this.phase === "paused" || this.phase === "failed") return this.frozenT;
    const t = this.clock();
    // 오디오 시계가 되돌아가도 화면은 앞으로만 간다
    this.lastT = Math.max(this.lastT, t);
    return this.lastT;
  }

  update(t) {
    const F = this.tl.floors;
    const M = F.length;
    if (this.phase !== "playing") return;

    if (this.autoplay) {
      while (this.pivot + 1 < M && t >= F[this.pivot + 1].time) this.hit(this.pivot + 1, "perfect", 0);
    } else if (this.pivot + 1 < M) {
      const next = this.pivot + 1;
      if (t - this.offset > F[next].time + this.lateWindow(next)) {
        this.fail(t);
        return;
      }
    }

    if (this.mode === "preview" && t > this.tl.end + 1.5) {
      this.preview(this.level, this.tl);
      return;
    }

    if (this.mode === "play") {
      const s = this.startFloor;
      const target = F[s + 1].time;
      const beat = 60 / F[s].bpm;
      const k = Math.ceil((target - t) / beat - 1e-6);
      const cd = k >= 1 && k <= this.tl.countdown ? k : t >= target - 0.02 && t < target + beat ? 0 : null;
      if (cd !== this.lastCd) {
        this.lastCd = cd;
        this.h.onCountdown?.(cd);
      }
    }
  }

  loop(perf) {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (perf - this.lastPerf) / 1000);
    this.lastPerf = perf;
    let t = 0;
    if (this.tl && this.clock !== undefined) {
      t = this.currentTime();
      this.update(t);
      if (this.tl) t = this.currentTime();
    }
    this.draw(t, dt, perf);
  }

  // ---------- 그리기 ----------

  draw(t, dt, perf) {
    const g = this.g;
    const W = this.w;
    const H = this.hgt;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const bg = this.level?.bgColor || "#0d0f17";
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(40,48,90,0.22)");
    vg.addColorStop(1, "rgba(0,0,0,0.45)");
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);

    const U = this.unit();
    this.drawStars(U, perf);
    if (!this.tl) return;

    const F = this.tl.floors;
    const M = F.length;
    const piv = F[this.pivot];
    const ang = rad(orbitAngle(F, this.pivot, t));
    const ox = piv.x + Math.cos(ang);
    const oy = piv.y + Math.sin(ang);

    // 카메라는 축 행성을 부드럽게 따라가되 다가올 타일 쪽으로 앞서 본다
    let ax = 0;
    let ay = 0;
    let n = 0;
    for (let j = 1; j <= 3 && this.pivot + j < M; j++, n++) {
      ax += F[this.pivot + j].x;
      ay += F[this.pivot + j].y;
    }
    const lx = n ? (ax / n - piv.x) * 0.4 : 0;
    const ly = n ? (ay / n - piv.y) * 0.4 : 0;
    const k = 1 - Math.exp(-dt * 4.5);
    this.cam.x += (piv.x + lx + (ox - piv.x) * 0.12 - this.cam.x) * k;
    this.cam.y += (piv.y + ly + (oy - piv.y) * 0.12 - this.cam.y) * k;
    const sx = (x) => W / 2 + (x - this.cam.x) * U;
    const sy = (y) => H / 2 - (y - this.cam.y) * U;

    this.drawTrack(F, M, U, sx, sy, perf);

    // 궤도
    g.strokeStyle = "rgba(255,255,255,0.08)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(sx(piv.x), sy(piv.y), U, 0, TAU);
    g.stroke();

    const fireIsPivot = this.pivot % 2 === 0;
    const pos = [
      fireIsPivot ? [piv.x, piv.y] : [ox, oy],
      fireIsPivot ? [ox, oy] : [piv.x, piv.y],
    ];
    const pr = U * 0.2;
    const failed = this.phase === "failed";
    [FIRE, ICE].forEach((c, n) => {
      const trail = this.trails[n];
      trail.push({ x: pos[n][0], y: pos[n][1], at: perf });
      while (trail.length && perf - trail[0].at > 140) trail.shift();
      trail.forEach((p) => {
        const life = 1 - (perf - p.at) / 140;
        g.globalAlpha = life * 0.28;
        g.fillStyle = c.glow;
        g.beginPath();
        g.arc(sx(p.x), sy(p.y), pr * (0.35 + life * 0.55), 0, TAU);
        g.fill();
      });
      g.globalAlpha = 1;
      const orbiting = fireIsPivot ? n === 1 : n === 0;
      if (failed && orbiting) return;
      this.drawPlanet(sx(pos[n][0]), sy(pos[n][1]), pr, c);
    });

    this.drawFx(U, sx, sy, perf);
    if (this.mode === "play" && !this.autoplay) this.drawErrorMeter(W, H, perf);
  }

  drawStars(U, perf) {
    const g = this.g;
    const W = this.w;
    const H = this.hgt;
    for (const s of this.stars) {
      const x = (((s.u * W - this.cam.x * U * s.depth) % W) + W) % W;
      const y = (((s.v * H + this.cam.y * U * s.depth) % H) + H) % H;
      g.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(perf / 900 + s.ph));
      g.fillStyle = "#cfd8ff";
      g.fillRect(x, y, s.r, s.r);
    }
    g.globalAlpha = 1;
  }

  drawTrack(F, M, U, sx, sy, perf) {
    const g = this.g;
    const W = this.w;
    const H = this.hgt;
    const L = 0.47;
    const tw = U * 0.54;
    const color = this.level?.trackColor || "#debb7b";
    const vis = [];
    for (let i = 0; i < M; i++) {
      const X = sx(F[i].x);
      const Y = sy(F[i].y);
      if (X < -U || X > W + U || Y < -U || Y > H + U) continue;
      vis.push(i);
    }
    const shape = (i) => {
      const f = F[i];
      const b = rad(f.drawBack);
      const o = rad(i < M - 1 ? F[i + 1].inDir : f.inDir);
      g.beginPath();
      g.moveTo(sx(f.x + Math.cos(b) * L), sy(f.y + Math.sin(b) * L));
      g.lineTo(sx(f.x), sy(f.y));
      g.lineTo(sx(f.x + Math.cos(o) * L), sy(f.y + Math.sin(o) * L));
    };
    g.lineJoin = "round";
    g.lineCap = "butt";

    // 테두리를 먼저 모두 그려야 이웃 타일의 면을 덮지 않는다
    g.strokeStyle = "rgba(12,8,4,0.85)";
    g.lineWidth = tw + 4;
    for (const i of vis) {
      shape(i);
      g.stroke();
    }
    for (const i of vis) {
      const passed = i <= this.pivot && this.mode === "play";
      g.globalAlpha = passed ? 0.6 : 1;
      g.strokeStyle = color;
      g.lineWidth = tw;
      shape(i);
      g.stroke();
      const at = this.hitAt.get(i);
      if (at !== undefined && perf - at < 260) {
        g.globalAlpha = 0.7 * (1 - (perf - at) / 260);
        g.strokeStyle = "#ffffff";
        shape(i);
        g.stroke();
      }
    }
    g.globalAlpha = 1;

    for (const i of vis) {
      const f = F[i];
      const X = sx(f.x);
      const Y = sy(f.y);
      if (f.twirl) this.drawTwirl(X, Y, U, f.cw);
      if (f.speed) this.drawSpeed(X, Y, U, f.speed > 0, i < M - 1 ? F[i + 1].inDir : f.inDir);
      if (f.checkpoint) {
        // 다른 아이콘과 같은 타일이면 바깥 고리로만 표시한다
        const shared = f.twirl || f.speed;
        g.strokeStyle = "#58e0ff";
        g.lineWidth = U * (shared ? 0.025 : 0.04);
        g.beginPath();
        g.arc(X, Y, U * (shared ? 0.23 : 0.12), 0, TAU);
        g.stroke();
        if (!shared) {
          g.fillStyle = "#58e0ff";
          g.beginPath();
          g.arc(X, Y, U * 0.045, 0, TAU);
          g.fill();
        }
      }
      if (i === M - 1) {
        const pulse = 0.5 + 0.5 * Math.sin(perf / 260);
        g.save();
        g.shadowColor = "#fff6d8";
        g.shadowBlur = U * 0.3;
        g.strokeStyle = `rgba(255,250,230,${0.6 + pulse * 0.4})`;
        g.lineWidth = U * 0.05;
        g.beginPath();
        g.arc(X, Y, U * (0.14 + pulse * 0.03), 0, TAU);
        g.stroke();
        g.restore();
      }
    }
  }

  drawTwirl(X, Y, U, cw) {
    const g = this.g;
    const r = U * 0.14;
    g.strokeStyle = "#ff3347";
    g.fillStyle = "#ff3347";
    g.lineWidth = U * 0.045;
    g.beginPath();
    const a0 = -Math.PI * 0.35;
    const a1 = a0 + Math.PI * 1.5;
    g.arc(X, Y, r, a0, a1);
    g.stroke();
    // 새 회전 방향을 가리키는 화살촉 (캔버스는 y축이 아래로)
    const tip = cw ? a1 : a0;
    const dir = cw ? 1 : -1;
    const tx = X + Math.cos(tip) * r;
    const ty = Y + Math.sin(tip) * r;
    const hx = -Math.sin(tip) * dir;
    const hy = Math.cos(tip) * dir;
    const s = U * 0.08;
    g.beginPath();
    g.moveTo(tx + hx * s, ty + hy * s);
    g.lineTo(tx - Math.cos(tip) * s * 0.7, ty - Math.sin(tip) * s * 0.7);
    g.lineTo(tx + Math.cos(tip) * s * 0.7, ty + Math.sin(tip) * s * 0.7);
    g.closePath();
    g.fill();
  }

  drawSpeed(X, Y, U, up, outDir) {
    const g = this.g;
    const a = -rad(up ? outDir : outDir + 180);
    g.save();
    g.translate(X, Y);
    g.rotate(a);
    g.strokeStyle = up ? "#ff3b3b" : "#3b8bff";
    g.lineWidth = U * 0.055;
    g.lineCap = "round";
    g.lineJoin = "round";
    const s = U * 0.08;
    for (const dx of [-s * 0.7, s * 0.7]) {
      g.beginPath();
      g.moveTo(dx - s * 0.6, -s);
      g.lineTo(dx + s * 0.6, 0);
      g.lineTo(dx - s * 0.6, s);
      g.stroke();
    }
    g.restore();
  }

  drawPlanet(X, Y, r, c) {
    const g = this.g;
    g.save();
    g.shadowColor = c.glow;
    g.shadowBlur = r * 1.8;
    g.fillStyle = c.core;
    g.beginPath();
    g.arc(X, Y, r, 0, TAU);
    g.fill();
    g.restore();
    const hl = g.createRadialGradient(X - r * 0.35, Y - r * 0.35, 0, X, Y, r);
    hl.addColorStop(0, "rgba(255,255,255,0.55)");
    hl.addColorStop(0.5, "rgba(255,255,255,0.08)");
    hl.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hl;
    g.beginPath();
    g.arc(X, Y, r, 0, TAU);
    g.fill();
  }

  drawFx(U, sx, sy, perf) {
    const g = this.g;
    const size = Math.max(13, U * 0.23);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `800 ${size}px "Pretendard Variable", Pretendard, system-ui, sans-serif`;
    this.fx = this.fx.filter((f) => perf - f.born < 700);
    for (const f of this.fx) {
      const life = (perf - f.born) / 700;
      const j = JUDGES[f.kind];
      g.globalAlpha = 1 - life * life;
      g.lineWidth = 4;
      g.strokeStyle = "rgba(0,0,0,0.55)";
      const X = sx(f.x);
      const Y = sy(f.y + 0.5 + life * 0.3);
      g.strokeText(j.label, X, Y);
      g.fillStyle = j.color;
      g.fillText(j.label, X, Y);
    }
    g.globalAlpha = 1;
  }

  // 원작의 판정 오차 막대: 최근 입력이 얼마나 빠르고 늦었는지
  drawErrorMeter(W, H, perf) {
    const g = this.g;
    const half = Math.min(150, W * 0.3);
    const cx = W / 2;
    const y = H - 26;
    const zones = [
      [this.win.e, "rgba(255,154,60,0.55)"],
      [this.win.ep, "rgba(229,242,74,0.6)"],
      [this.win.p, "rgba(92,240,90,0.7)"],
    ];
    for (const [w, c] of zones) {
      const x = (w / this.win.e) * half;
      g.fillStyle = c;
      g.fillRect(cx - x, y - 3, x * 2, 6);
    }
    g.fillStyle = "#fff";
    g.fillRect(cx - 1, y - 9, 2, 18);
    this.errs = this.errs.filter((e) => perf - e.born < 3000);
    for (const e of this.errs) {
      const life = 1 - (perf - e.born) / 3000;
      const x = Math.max(-half - 6, Math.min(half + 6, (e.err / this.win.e) * half));
      g.globalAlpha = life;
      g.fillStyle = JUDGES[e.kind].color;
      g.fillRect(cx + x - 1.5, y - 11, 3, 22);
    }
    g.globalAlpha = 1;
  }
}
