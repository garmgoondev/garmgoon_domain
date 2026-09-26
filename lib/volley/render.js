// 말랑 배구 화면: 배경, 선수, 공, 이펙트, 점수판.
// 물리는 초당 20~30번만 돌기 때문에, 화면은 직전 두 물리 프레임 사이를 보간해서 부드럽게 그린다.

import { charById, drawBall, drawCharacter, drawStar } from "./draw.js";
import { DIVING, GROUND_WIDTH, LYING, NET_PILLAR_TOP_BOTTOM_Y, NET_PILLAR_TOP_TOP_Y, NORMAL, SCREEN_HEIGHT } from "./physics.js";

const W = GROUND_WIDTH;
const H = SCREEN_HEIGHT;
const HORIZON = 198;
const SHORE = 246;
const FLOOR = 277; // 선수 발바닥
const FONT = '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rnd = (a, b) => a + Math.random() * (b - a);

function snap(match) {
  const { players, ball } = match.physics;
  return {
    players: players.map((p) => ({
      x: p.x,
      y: p.y,
      state: p.state,
      frame: p.frameNumber,
      dive: p.divingDirection,
    })),
    ball: { x: ball.x, y: ball.y, rot: ball.fineRotation, power: ball.isPowerHit },
  };
}

export class VolleyRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = 1;
    this.cw = 1;
    this.ch = 1;
    this.slots = [
      { ch: charById("mochi"), photo: null, name: "" },
      { ch: charById("nabi"), photo: null, name: "" },
    ];
    this.labels = { ready: "READY", go: "GO!" };
    this.shakeOn = true;
    this.match = null;
    this.tickMs = 40;
    this.reset();
  }

  reset() {
    this.parts = [];
    this.rings = [];
    this.texts = [];
    this.marks = [];
    this.trail = [];
    this.shake = { amp: 0, until: 0, dur: 1 };
    this.hudPop = [0, 0];
    this.lastHitter = 0;
    this.lastDraw = 0;
    this.goAt = 0;
    this.dizzy = [0, 0];
  }

  resize(w, h, dpr) {
    this.dpr = dpr;
    this.cw = Math.max(1, Math.round(w * dpr));
    this.ch = Math.max(1, Math.round(h * dpr));
    this.canvas.width = this.cw;
    this.canvas.height = this.ch;
    this.bg = null;
  }

  // slots: [{ ch, photo(HTMLImageElement|null), name }]
  setSlots(slots) {
    this.slots = slots;
  }

  attach(match, tickMs, now = performance.now()) {
    this.match = match;
    this.tickMs = tickMs;
    this.cur = snap(match);
    this.prev = this.cur;
    this.steps = match.physicsSteps;
    this.stepAt = now;
    this.stepDur = tickMs;
    this.reset();
  }

  // 틱을 돌린 뒤 부른다. 물리가 한 번 돌았으면 보간 기준을 옮긴다
  afterTick(now) {
    const m = this.match;
    if (!m || m.physicsSteps === this.steps) return;
    this.prev = this.cur;
    this.cur = snap(m);
    this.steps = m.physicsSteps;
    this.stepAt = now;
    this.stepDur = this.tickMs * (m.lastStepSlow ? 5 : 1);
    if (m.phase === "ready") {
      // 새 라운드: 순간이동이라 보간하지 않는다
      this.prev = this.cur;
      this.trail = [];
      this.marks = [];
    }
  }

  // ---------- 이펙트 ----------

  events(list, now) {
    for (const e of list) {
      const col = e.player !== undefined ? this.slots[e.player].ch.color : "#fff";
      switch (e.type) {
        case "jump":
        case "land":
          this.dust(e.x, FLOOR, e.type === "jump" ? 5 : 4, 0);
          break;
        case "dive":
          this.dust(e.x, FLOOR, 6, -e.dir);
          break;
        case "slide":
          this.dust(e.x, FLOOR, 8, 0);
          this.dizzy[e.player] = now;
          break;
        case "hit":
          this.lastHitter = e.player;
          if (e.power) {
            this.ring(e.x, e.y, 8, 40, col, 320, 4);
            this.ring(e.x, e.y, 4, 26, "#fff", 220, 3);
            this.burst(e.x, e.y, 14, col, 3.4, "star");
            this.kick(3.5, 200, now);
          } else {
            this.ring(e.x, e.y, 6, 24, "rgba(255,255,255,0.9)", 200, 2.5);
            this.burst(e.x, e.y, 5, "#fff", 2, "dot");
          }
          break;
        case "net":
          this.ring(e.x, e.y, 4, 16, "#fff", 160, 2);
          break;
        case "ground":
          this.dust(e.x, 272, e.power ? 12 : 6, 0);
          break;
        case "score": {
          this.marks.push({ x: e.x, at: now });
          this.dust(e.x, 272, 14, 0);
          this.kick(e.final ? 6 : 4, 260, now);
          this.hudPop[e.scorer] = now;
          const hx = e.scorer === 0 ? 70 : W - 70;
          this.burst(hx, 30, 16, this.slots[e.scorer].ch.color, 2.6, "confetti");
          this.text("+1", hx + (e.scorer === 0 ? 30 : -30), 44, this.slots[e.scorer].ch.color, 18, 900);
          break;
        }
        case "go":
          this.goAt = now;
          break;
        case "gameEnd": {
          const c = this.slots[e.winner].ch.color;
          for (let i = 0; i < 70; i++) {
            this.parts.push({
              kind: "confetti",
              x: rnd(0, W),
              y: rnd(-60, -5),
              vx: rnd(-0.4, 0.4),
              vy: rnd(0.6, 1.8),
              g: 0.02,
              life: 0,
              max: rnd(2600, 3800),
              size: rnd(2.5, 4),
              color: i % 3 === 0 ? c : ["#ff6b8b", "#ffd23f", "#5ab4ff", "#7ed47a"][i % 4],
              rot: rnd(0, TAU),
              vr: rnd(-0.15, 0.15),
            });
          }
          break;
        }
        default:
      }
    }
  }

  kick(amp, dur, now) {
    if (!this.shakeOn) return;
    if (amp >= this.shake.amp * clamp01((this.shake.until - now) / this.shake.dur)) {
      this.shake = { amp, until: now + dur, dur };
    }
  }

  dust(x, y, n, dir) {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        kind: "dust",
        x: x + rnd(-10, 10),
        y: y - rnd(0, 3),
        vx: rnd(-1.2, 1.2) + dir * 1.2,
        vy: rnd(-1.6, -0.3),
        g: 0.05,
        life: 0,
        max: rnd(350, 600),
        size: rnd(3, 6.5),
        color: "#f3d7a0",
      });
    }
  }

  burst(x, y, n, color, speed, kind) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU);
      const v = rnd(speed * 0.5, speed);
      this.parts.push({
        kind,
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - (kind === "confetti" ? 1 : 0),
        g: kind === "confetti" ? 0.06 : 0.02,
        life: 0,
        max: kind === "confetti" ? rnd(700, 1100) : rnd(280, 480),
        size: kind === "star" ? rnd(3, 5) : rnd(1.8, 3.2),
        color: kind === "star" && i % 3 === 0 ? "#fff" : color,
        rot: rnd(0, TAU),
        vr: rnd(-0.2, 0.2),
      });
    }
  }

  ring(x, y, r0, r1, color, max, width) {
    this.rings.push({ x, y, r0, r1, color, max, width, life: 0 });
  }

  text(str, x, y, color, size, max) {
    this.texts.push({ str, x, y, color, size, max, life: 0 });
  }

  // ---------- 그리기 ----------

  draw(now) {
    const { ctx, cw, ch } = this;
    const dt = this.lastDraw ? Math.min(50, now - this.lastDraw) : 16;
    this.lastDraw = now;
    const m = this.match;
    const slow = m && m.isSlowMotion ? 0.3 : 1;
    const s = Math.min(cw / W, ch / H);
    const ox = (cw - W * s) / 2;
    const oy = (ch - H * s) * 0.3; // 남는 세로 공간은 주로 모래 쪽으로 (터치 버튼 자리)
    const view = { x0: -ox / s, x1: (cw - ox) / s, y0: -oy / s, y1: (ch - oy) / s };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!this.bg || this.bgKey !== `${cw}x${ch}`) this.buildBackground(s, ox, oy, view);
    ctx.drawImage(this.bg, 0, 0);

    let sx = 0;
    let sy = 0;
    if (now < this.shake.until) {
      const k = (this.shake.until - now) / this.shake.dur;
      sx = rnd(-1, 1) * this.shake.amp * k;
      sy = rnd(-1, 1) * this.shake.amp * k;
    }
    ctx.setTransform(s, 0, 0, s, ox + sx * s, oy + sy * s);
    const t = now / 1000;
    this.drawSky(ctx, view, t);
    this.drawMarks(ctx, now);

    if (m) {
      const a = clamp01((now - this.stepAt) / this.stepDur);
      const P = this.prev.players;
      const C = this.cur.players;
      const bx = lerp(this.prev.ball.x, this.cur.ball.x, a);
      const by = lerp(this.prev.ball.y, this.cur.ball.y, a);

      // 그림자
      ctx.fillStyle = "rgba(120,80,30,0.22)";
      for (let i = 0; i < 2; i++) {
        const px = lerp(P[i].x, C[i].x, a);
        const py = lerp(P[i].y, C[i].y, a);
        const k = 1 - Math.min(0.6, (244 - py) / 200);
        ctx.beginPath();
        ctx.ellipse(px, FLOOR + 1, 24 * k, 5 * k, 0, 0, TAU);
        ctx.fill();
      }
      {
        const k = 1 - Math.min(0.7, (252 - by) / 300);
        ctx.beginPath();
        ctx.ellipse(bx, FLOOR, 15 * k, 3.5 * k, 0, 0, TAU);
        ctx.fill();
      }

      this.drawNet(ctx);

      for (let i = 0; i < 2; i++) {
        const p0 = P[i];
        const p1 = C[i];
        const px = lerp(p0.x, p1.x, a);
        const py = lerp(p0.y, p1.y, a);
        const moving = p1.state === NORMAL && Math.abs(p1.x - p0.x) > 0.5;
        const facing = p1.state === DIVING || p1.state === LYING ? p1.dive || (i === 0 ? 1 : -1) : i === 0 ? 1 : -1;
        const slot = this.slots[i];
        ctx.save();
        ctx.translate(px, py);
        drawCharacter(
          ctx,
          slot.ch,
          {
            state: p1.state,
            frame: p1.frame,
            facing,
            t: t + i * 0.37,
            moving,
            walk: px * 0.22,
            vy: p1.y - p0.y,
            blink: p1.state === NORMAL && (t + i * 1.3) % 3.4 < 0.12,
          },
          slot.photo,
        );
        ctx.restore();
        if (p1.state === LYING || now - this.dizzy[i] < 500) this.drawDizzy(ctx, px, py - 20, t);
      }

      // 공 궤적
      const speed = Math.hypot(this.cur.ball.x - this.prev.ball.x, this.cur.ball.y - this.prev.ball.y);
      const power = this.cur.ball.power;
      if (power || speed > 15) this.trail.push({ x: bx, y: by, at: now });
      const keep = power ? 170 : 110;
      this.trail = this.trail.filter((p) => now - p.at < keep / slow);
      if (this.trail.length) {
        const col = power ? this.slots[this.lastHitter].ch.color : "#ffffff";
        ctx.save();
        for (const p of this.trail) {
          const k = 1 - (now - p.at) / (keep / slow);
          ctx.globalAlpha = k * (power ? 0.42 : 0.28);
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 20 * (0.45 + 0.55 * k), 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }

      const rot = lerpAngle(this.prev.ball.rot, this.cur.ball.rot, a);
      drawBall(ctx, bx, by, (rot / 50) * TAU, { glow: power ? hexA(this.slots[this.lastHitter].ch.color, 0.55) : null });
    }

    this.drawFx(ctx, dt * slow);
    if (m) {
      this.drawHud(ctx, now, t);
      const fade = m.fade;
      if (fade > 0) {
        ctx.fillStyle = `rgba(28,36,72,${fade * 0.82})`;
        ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
      }
      this.drawBanner(ctx, now);
    }
  }

  buildBackground(s, ox, oy, view) {
    const c = document.createElement("canvas");
    c.width = this.cw;
    c.height = this.ch;
    const g = c.getContext("2d");
    g.setTransform(s, 0, 0, s, ox, oy);
    const x0 = view.x0 - 2;
    const w = view.x1 - view.x0 + 4;

    const sky = g.createLinearGradient(0, view.y0, 0, HORIZON);
    sky.addColorStop(0, "#6ec3ff");
    sky.addColorStop(1, "#d4f1ff");
    g.fillStyle = sky;
    g.fillRect(x0, view.y0 - 2, w, HORIZON - view.y0 + 3);

    // 해
    const sun = g.createRadialGradient(300, 58, 8, 300, 58, 60);
    sun.addColorStop(0, "rgba(255,248,200,0.9)");
    sun.addColorStop(1, "rgba(255,248,200,0)");
    g.fillStyle = sun;
    g.fillRect(230, 0, 140, 130);
    g.fillStyle = "#fff4b0";
    g.beginPath();
    g.arc(300, 58, 19, 0, TAU);
    g.fill();

    // 먼 섬
    g.fillStyle = "#9fd8a8";
    g.beginPath();
    g.ellipse(70, HORIZON + 2, 60, 12, 0, Math.PI, TAU);
    g.fill();
    g.fillStyle = "#b5e3b8";
    g.beginPath();
    g.ellipse(395, HORIZON + 2, 44, 8, 0, Math.PI, TAU);
    g.fill();
    // 야자수
    g.strokeStyle = "#9a7a55";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(84, HORIZON - 6);
    g.quadraticCurveTo(80, HORIZON - 24, 90, HORIZON - 36);
    g.stroke();
    g.fillStyle = "#63b86f";
    for (const a of [-2.6, -1.9, -1.2, -0.5, 0.2]) {
      g.beginPath();
      g.ellipse(90 + Math.cos(a) * 9, HORIZON - 36 + Math.sin(a) * 5, 11, 3.2, a, 0, TAU);
      g.fill();
    }

    const sea = g.createLinearGradient(0, HORIZON, 0, SHORE);
    sea.addColorStop(0, "#3fa9e6");
    sea.addColorStop(1, "#86dcf6");
    g.fillStyle = sea;
    g.fillRect(x0, HORIZON, w, SHORE - HORIZON);

    const sand = g.createLinearGradient(0, SHORE, 0, view.y1);
    sand.addColorStop(0, "#ffe6b0");
    sand.addColorStop(1, "#f2c77e");
    g.fillStyle = sand;
    g.fillRect(x0, SHORE, w, view.y1 - SHORE + 2);

    // 코트 바닥선
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.fillRect(x0, FLOOR + 8, w, 2.5);
    // 모래 알갱이 (고정 무늬)
    g.fillStyle = "rgba(190,140,70,0.25)";
    const hash = (n) => {
      const v = Math.sin(n) * 43758.5453;
      return v - Math.floor(v);
    };
    const sandH = Math.max(10, view.y1 - SHORE - 8);
    const count = Math.round((w * sandH) / 90);
    for (let i = 0; i < count; i++) {
      g.fillRect(x0 + hash(i * 12.9898) * w, SHORE + 6 + hash(i * 78.233) * sandH, 1.6, 1.2);
    }
    this.bg = c;
    this.bgKey = `${this.cw}x${this.ch}`;
  }

  drawSky(ctx, view, t) {
    // 구름
    const span = view.x1 - view.x0 + 160;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    for (const [bx, y, k, v] of [[30, 38, 1, 4], [190, 70, 0.8, 6], [300, 120, 0.65, 3], [120, 150, 0.55, 5]]) {
      const x = view.x0 - 80 + ((((bx - view.x0 + 80 + t * v) % span) + span) % span);
      cloud(ctx, x, y, k);
    }
    // 물결
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.4;
    for (const [y, sp, ph] of [[210, 9, 0], [224, 13, 40], [236, 17, 80]]) {
      ctx.beginPath();
      for (let x = Math.floor(view.x0 / 40) * 40 - 40; x < view.x1 + 40; x += 40) {
        const xx = x + ((t * sp + ph) % 40);
        ctx.moveTo(xx, y);
        ctx.quadraticCurveTo(xx + 6, y - 2.5, xx + 12, y);
      }
      ctx.stroke();
    }
    // 파도 거품
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.moveTo(view.x0 - 2, SHORE + 2);
    for (let x = Math.floor(view.x0 / 24) * 24 - 24; x <= view.x1 + 24; x += 12) {
      ctx.lineTo(x, SHORE + Math.sin(x * 0.25 + t * 2.2) * 1.8);
    }
    ctx.lineTo(view.x1 + 24, SHORE + 4);
    ctx.lineTo(view.x0 - 2, SHORE + 4);
    ctx.fill();
  }

  drawNet(ctx) {
    const x = W / 2;
    ctx.save();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#5a4636";
    // 기둥
    ctx.fillStyle = "#fffaf2";
    roundRect(ctx, x - 3.5, NET_PILLAR_TOP_BOTTOM_Y - 2, 7, FLOOR + 6 - NET_PILLAR_TOP_BOTTOM_Y, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ff7a7a";
    for (let y = NET_PILLAR_TOP_BOTTOM_Y + 8; y < FLOOR; y += 16) {
      ctx.fillRect(x - 2.7, y, 5.4, 7);
    }
    // 꼭대기 (공이 튕기는 부분)
    ctx.fillStyle = "#ffcf3f";
    roundRect(ctx, x - 9, NET_PILLAR_TOP_TOP_Y, 18, NET_PILLAR_TOP_BOTTOM_Y - NET_PILLAR_TOP_TOP_Y, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    roundRect(ctx, x - 6, NET_PILLAR_TOP_TOP_Y + 3, 5, 5, 2.5);
    ctx.fill();
    // 바닥 받침
    ctx.fillStyle = "#e2b872";
    ctx.beginPath();
    ctx.ellipse(x, FLOOR + 6, 12, 3.5, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawMarks(ctx, now) {
    this.marks = this.marks.filter((mk) => now - mk.at < 4000);
    for (const mk of this.marks) {
      const k = 1 - (now - mk.at) / 4000;
      ctx.fillStyle = `rgba(150,100,40,${0.28 * k})`;
      ctx.beginPath();
      ctx.ellipse(mk.x, FLOOR + 2, 22, 5, 0, 0, TAU);
      ctx.fill();
    }
  }

  drawDizzy(ctx, x, y, t) {
    ctx.save();
    ctx.fillStyle = "#ffd23f";
    ctx.strokeStyle = "#8a6a00";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + (i * TAU) / 3;
      drawStar(ctx, x + Math.cos(a) * 14, y + Math.sin(a) * 4, 4, a);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFx(ctx, dt) {
    const k = dt / 16.7;
    this.parts = this.parts.filter((p) => (p.life += dt) < p.max);
    for (const p of this.parts) {
      p.vy += p.g * k;
      p.x += p.vx * k;
      p.y += p.vy * k;
      if (p.vr) p.rot += p.vr * k;
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = p.kind === "dust" ? a * 0.8 : Math.min(1, a * 1.5);
      ctx.fillStyle = p.color;
      if (p.kind === "star") {
        drawStar(ctx, p.x, p.y, p.size, p.rot);
      } else if (p.kind === "confetti") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.kind === "dust" ? p.size * (0.6 + 0.6 * (1 - a)) : p.size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    this.rings = this.rings.filter((r) => (r.life += dt) < r.max);
    for (const r of this.rings) {
      const q = r.life / r.max;
      const e = 1 - (1 - q) * (1 - q);
      ctx.globalAlpha = 1 - q;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - q * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, lerp(r.r0, r.r1, e), 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    this.texts = this.texts.filter((tx) => (tx.life += dt) < tx.max);
    for (const tx of this.texts) {
      const q = tx.life / tx.max;
      ctx.globalAlpha = 1 - q * q;
      outlinedText(ctx, tx.str, tx.x, tx.y - q * 16, tx.size, tx.color);
    }
    ctx.globalAlpha = 1;
  }

  drawHud(ctx, now, t) {
    const m = this.match;
    for (let i = 0; i < 2; i++) {
      const slot = this.slots[i];
      const left = i === 0;
      const bx = left ? 10 : W - 10 - 96;
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.strokeStyle = hexA(slot.ch.color, 0.9);
      ctx.lineWidth = 2;
      roundRect(ctx, bx, 8, 96, 38, 19);
      ctx.fill();
      ctx.stroke();
      // 얼굴
      const ax = left ? bx + 19 : bx + 96 - 19;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax, 27, 15, 0, TAU);
      ctx.fillStyle = hexA(slot.ch.color, 0.25);
      ctx.fill();
      ctx.clip();
      ctx.translate(ax, 33);
      ctx.scale(0.62, 0.62);
      drawCharacter(ctx, slot.ch, { state: NORMAL, frame: 2, facing: left ? 1 : -1, t, face: m.winner === i ? "happy" : m.winner === 1 - i ? "sad" : null }, slot.photo);
      ctx.restore();
      // 점수
      const pop = clamp01(1 - (now - this.hudPop[i]) / 420);
      const sc = 1 + pop * 0.5;
      ctx.translate(left ? bx + 64 : bx + 32, 28);
      ctx.scale(sc, sc);
      outlinedText(ctx, String(m.scores[i]), 0, 0, 24, slot.ch.color);
      ctx.restore();
      if (slot.name) {
        ctx.save();
        ctx.font = `700 9px ${FONT}`;
        ctx.textAlign = left ? "left" : "right";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(40,50,80,0.75)";
        ctx.fillText(slot.name, left ? bx + 6 : bx + 90, 50);
        ctx.restore();
      }
    }
  }

  drawBanner(ctx, now) {
    const m = this.match;
    if (m.phase === "ready" && m.phaseTick >= 6) {
      const k = clamp01((m.phaseTick - 6) / 5);
      const bounce = 1 + Math.sin(k * Math.PI) * 0.25;
      ctx.save();
      ctx.translate(W / 2, 118);
      ctx.scale(k * bounce, k * bounce);
      outlinedText(ctx, this.labels.ready, 0, 0, 34, "#ffd23f");
      ctx.restore();
    }
    const g = now - this.goAt;
    if (this.goAt && g < 650) {
      const q = g / 650;
      ctx.save();
      ctx.globalAlpha = 1 - q * q;
      ctx.translate(W / 2, 118);
      const sc = 0.8 + q * 0.6;
      ctx.scale(sc, sc);
      outlinedText(ctx, this.labels.go, 0, 0, 36, "#ff6b8b");
      ctx.restore();
    }
  }
}

function lerpAngle(a, b, k) {
  let d = b - a;
  if (d > 25) d -= 50;
  else if (d < -25) d += 50;
  return a + d * k;
}

function cloud(ctx, x, y, k) {
  ctx.beginPath();
  ctx.arc(x, y, 14 * k, 0, TAU);
  ctx.arc(x + 16 * k, y - 7 * k, 17 * k, 0, TAU);
  ctx.arc(x + 34 * k, y, 13 * k, 0, TAU);
  ctx.arc(x + 17 * k, y + 5 * k, 14 * k, 0, TAU);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function outlinedText(ctx, str, x, y, size, color) {
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.22;
  ctx.strokeStyle = "#2b2745";
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

