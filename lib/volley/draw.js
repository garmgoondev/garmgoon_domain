// 말랑 배구 그림: 캐릭터, 공. 이미지 파일 없이 캔버스 도형으로만 그린다.
// 캐릭터는 원작 선수 크기(64×64) 상자의 가운데를 원점으로, 오른쪽을 보는 모습으로 그린다.

import { DIVING, JUMPING, LOST, LYING, NORMAL, POWER_HIT, WIN } from "./physics.js";

export const CHARACTERS = [
  {
    id: "mochi",
    kind: "hamster",
    ko: "쫀떡",
    en: "Mochi",
    koDesc: "볼이 빵빵한 햄스터",
    enDesc: "A chubby-cheeked hamster",
    body: "#ffc46b",
    belly: "#fff1d6",
    line: "#6b4221",
    cheek: "#ff8a9b",
    inner: "#ffb3bf",
    foot: "#ffb0a0",
    color: "#ff9d2e",
  },
  {
    id: "potato",
    kind: "potato",
    ko: "감자",
    en: "Spud",
    koDesc: "싹이 난 포슬포슬 감자",
    enDesc: "A fluffy potato with a sprout",
    body: "#d9a766",
    belly: "#e6bd86",
    line: "#5a3a1c",
    cheek: "#f0877a",
    spot: "#b8864a",
    leaf: "#5cc26a",
    foot: "#c28f52",
    color: "#c68a3e",
  },
  {
    id: "nabi",
    kind: "cat",
    ko: "나비",
    en: "Nabi",
    koDesc: "줄무늬 회색 고양이",
    enDesc: "A striped gray cat",
    body: "#a6b8dc",
    belly: "#f1f5fc",
    line: "#34405a",
    cheek: "#ff9eb6",
    inner: "#ffc4d3",
    stripe: "#8195c0",
    foot: "#f1f5fc",
    color: "#6f8fd6",
  },
  {
    id: "gaegul",
    kind: "frog",
    ko: "개굴",
    en: "Ribbit",
    koDesc: "점프가 자신 있는 개구리",
    enDesc: "A frog who loves jumping",
    body: "#7ed47a",
    belly: "#e9f8cf",
    line: "#2d582b",
    cheek: "#ff9a96",
    foot: "#6cc268",
    color: "#3fb24a",
  },
  {
    id: "bbiyak",
    kind: "chick",
    ko: "삐약",
    en: "Peep",
    koDesc: "겁 없는 병아리",
    enDesc: "A fearless little chick",
    body: "#ffe15a",
    belly: "#fff6c4",
    line: "#6a5210",
    cheek: "#ffa07a",
    beak: "#ff9c2a",
    foot: "#ff9c2a",
    color: "#f2bf00",
  },
];

export const charById = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];

const INK = "#2b2230";
const TAU = Math.PI * 2;

// 선수 상태 → 몸짓
function poseOf(p) {
  const { state, frame = 0, t = 0, moving = false, walk = 0, vy = 0, blink = false } = p;
  const L = { rot: 0, sx: 1, sy: 1, dy: 0, back: 0.3, front: 0.2, face: blink ? "blink" : "normal", feet: [0, 0], swoosh: 0 };
  switch (state) {
    case JUMPING:
      if (vy < 0) {
        L.sx = 0.94;
        L.sy = 1.07;
      } else {
        L.sx = 1.02;
        L.sy = 0.98;
      }
      L.back = 2.2 + frame * 0.15;
      L.front = 2.5 - frame * 0.15;
      L.face = "jump";
      L.feet = [-4, -4];
      break;
    case POWER_HIT: {
      const arc = [3.5, 3.0, 1.9, 1.0, 0.6];
      L.front = arc[Math.min(frame, 4)];
      L.back = 2.0;
      L.rot = frame >= 2 ? 0.14 : -0.12;
      L.face = "effort";
      L.feet = [-4, -3];
      L.swoosh = frame === 2 || frame === 3 ? frame - 1 : 0;
      break;
    }
    case DIVING:
      L.rot = Math.PI / 2 - 0.2;
      L.front = Math.PI;
      L.back = Math.PI - 0.3;
      L.face = "effort";
      break;
    case LYING:
      L.rot = Math.PI / 2;
      L.front = 2.6;
      L.back = 2.9;
      L.face = "dizzy";
      break;
    case WIN:
      L.back = 2.7 + Math.sin(t * 11) * 0.35;
      L.front = 2.7 - Math.sin(t * 11) * 0.35;
      L.dy = -Math.abs(Math.sin(t * 6)) * 9;
      L.face = "happy";
      break;
    case LOST:
      L.sx = 1.05;
      L.sy = 0.92;
      L.back = 0.05;
      L.front = 0.05;
      L.face = "sad";
      break;
    default: {
      L.back = 0.35 - frame * 0.08;
      L.front = -0.2 + frame * 0.08;
      if (moving) {
        L.dy = -Math.abs(Math.sin(walk)) * 2.5;
        L.feet = [-Math.max(0, Math.sin(walk)) * 4, -Math.max(0, -Math.sin(walk)) * 4];
      }
    }
  }
  if (p.face) L.face = p.face;
  return L;
}

/**
 * pose: { state, frame, facing(1|-1), t(초), moving, walk, vy, blink, face(표정 강제) }
 * photo: 불러온 얼굴 사진 (HTMLImageElement) — 있으면 얼굴 자리에 둥글게 붙인다
 */
export function drawCharacter(ctx, ch, pose, photo = null) {
  const L = poseOf(pose);
  const facing = pose.facing || 1;
  ctx.save();
  ctx.scale(facing, 1);
  ctx.translate(0, L.dy);
  if (L.rot) {
    ctx.translate(0, 6);
    ctx.rotate(L.rot);
    ctx.translate(0, -6);
  }
  ctx.translate(0, 30);
  ctx.scale(L.sx, L.sy);
  ctx.translate(0, -30);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = ch.line;

  if (ch.kind === "cat") drawCatTail(ctx, ch, pose.t || 0);
  drawArm(ctx, ch, -19, 8, L.back);
  drawFeet(ctx, ch, L.feet);
  drawEars(ctx, ch);
  drawBody(ctx, ch);
  if (photo && photo.complete && photo.naturalWidth) drawPhotoFace(ctx, ch, photo, L.face, facing);
  else drawFace(ctx, ch, L.face, pose.t || 0);
  drawArm(ctx, ch, 21, 9, L.front);
  if (L.swoosh) drawSwoosh(ctx, L.swoosh);
  ctx.restore();
}

function blob(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
}

function drawBody(ctx, ch) {
  if (ch.kind === "potato") {
    ctx.beginPath();
    const N = 28;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU;
      const k = 1 + 0.045 * Math.sin(a * 3 + 1) + 0.035 * Math.sin(a * 5 + 2);
      const x = Math.cos(a) * 26 * k;
      const y = 4 + Math.sin(a) * 26 * k;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else if (ch.kind === "frog") {
    blob(ctx, 0, 6, 26, 24);
  } else {
    blob(ctx, 0, 4, 25, 26);
  }
  ctx.fillStyle = ch.body;
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.clip();
  // 배
  ctx.fillStyle = ch.belly;
  blob(ctx, 4, 20, 17, 13);
  ctx.fill();
  if (ch.kind === "potato") {
    ctx.fillStyle = ch.spot;
    for (const [x, y, r] of [[-13, -8, 2.6], [-17, 10, 2], [8, -15, 1.8], [18, 14, 2.2]]) {
      blob(ctx, x, y, r, r * 0.8);
      ctx.fill();
    }
  }
  if (ch.kind === "cat") {
    ctx.strokeStyle = ch.stripe;
    ctx.lineWidth = 2.6;
    for (const dx of [-2, 4, 10]) {
      ctx.beginPath();
      ctx.moveTo(dx, -22);
      ctx.lineTo(dx + 1, -15);
      ctx.stroke();
    }
    for (const y of [4, 11]) {
      ctx.beginPath();
      ctx.moveTo(-26, y);
      ctx.lineTo(-17, y + 1);
      ctx.stroke();
    }
  }
  // 은은한 입체감
  const g = ctx.createRadialGradient(-8, -10, 4, 0, 4, 30);
  g.addColorStop(0, "rgba(255,255,255,0.35)");
  g.addColorStop(0.5, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = g;
  ctx.fillRect(-30, -26, 60, 60);
  ctx.restore();

  if (ch.kind === "frog") {
    // 눈 올라가는 봉우리
    for (const x of [-4, 13]) {
      blob(ctx, x, -17, 9.5, 9);
      ctx.fillStyle = ch.body;
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawEars(ctx, ch) {
  if (ch.kind === "hamster") {
    for (const [x, y] of [[-14, -19], [10, -21]]) {
      blob(ctx, x, y, 7.5, 7);
      ctx.fillStyle = ch.body;
      ctx.fill();
      ctx.stroke();
      blob(ctx, x, y + 0.5, 4, 3.8);
      ctx.fillStyle = ch.inner;
      ctx.fill();
    }
  } else if (ch.kind === "cat") {
    for (const pts of [
      [[-21, -10], [-17, -31], [-4, -20]],
      [[3, -21], [14, -32], [20, -12]],
    ]) {
      ctx.beginPath();
      ctx.moveTo(...pts[0]);
      ctx.lineTo(...pts[1]);
      ctx.lineTo(...pts[2]);
      ctx.closePath();
      ctx.fillStyle = ch.body;
      ctx.fill();
      ctx.stroke();
      const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3;
      const cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const x = cx + (pts[i][0] - cx) * 0.5;
        const y = cy + (pts[i][1] - cy) * 0.5 + 1;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = ch.inner;
      ctx.fill();
    }
  } else if (ch.kind === "potato") {
    // 새싹
    ctx.save();
    ctx.fillStyle = ch.leaf;
    ctx.strokeStyle = "#2f7a3a";
    ctx.beginPath();
    ctx.moveTo(1, -21);
    ctx.quadraticCurveTo(-1, -27, 1, -30);
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(1 + s * 5, -31, 6, 3.2, s * -0.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  } else if (ch.kind === "chick") {
    ctx.fillStyle = ch.body;
    for (const [x, a] of [[-2, -0.5], [3, 0], [8, 0.5]]) {
      ctx.save();
      ctx.translate(x, -20);
      ctx.rotate(a);
      blob(ctx, 0, -5, 3, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawCatTail(ctx, ch, t) {
  const wag = Math.sin(t * 3) * 3;
  ctx.save();
  ctx.lineWidth = 7;
  ctx.strokeStyle = ch.line;
  ctx.beginPath();
  ctx.moveTo(-18, 22);
  ctx.quadraticCurveTo(-36, 18, -32 + wag, 0);
  ctx.stroke();
  ctx.lineWidth = 4.2;
  ctx.strokeStyle = ch.body;
  ctx.stroke();
  ctx.restore();
}

function drawArm(ctx, ch, sx, sy, theta) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-theta);
  blob(ctx, 0, 6.5, 5.5, 9);
  ctx.fillStyle = ch.body;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFeet(ctx, ch, lift) {
  const pos = [-10, 11];
  for (let i = 0; i < 2; i++) {
    blob(ctx, pos[i], 29 + lift[i], 8, 4.6);
    ctx.fillStyle = ch.foot;
    ctx.fill();
    ctx.stroke();
  }
}

function drawSwoosh(ctx, k) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(12, 0, 24 + i * 5, -1.5 + k * 0.3, -0.3 + k * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

function eyePos(ch) {
  return ch.kind === "frog" ? [[-4, -17], [13, -17]] : [[-5, -4], [12, -4]];
}

function drawFace(ctx, ch, face, t) {
  const [e1, e2] = eyePos(ch);
  const big = ch.kind === "frog";
  ctx.save();
  ctx.lineWidth = 1.8;

  // 볼터치
  if (face !== "sad") {
    ctx.fillStyle = ch.cheek;
    ctx.globalAlpha = ch.kind === "hamster" ? 0.8 : 0.6;
    const r = ch.kind === "hamster" ? 5.5 : 4.2;
    blob(ctx, -11, 6, r, r * 0.7);
    ctx.fill();
    blob(ctx, 19, 6, r * 0.8, r * 0.65);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (big && (face === "normal" || face === "jump" || face === "blink")) {
    for (const [x, y] of [e1, e2]) {
      blob(ctx, x, y, 6.2, 6.2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = ch.line;
      ctx.stroke();
    }
  }

  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  for (let i = 0; i < 2; i++) {
    const [x, y] = i === 0 ? e1 : e2;
    drawEye(ctx, x, y, face, i, big);
  }

  // 입
  const mx = 4;
  const my = big ? 5 : 6;
  if (ch.kind === "chick") drawBeak(ctx, ch, mx, my - 1, face);
  else drawMouth(ctx, ch, mx, my, face);

  if (face === "sad") {
    // 눈물
    const k = (t * 1.4) % 1;
    ctx.fillStyle = "#6cc3ff";
    ctx.globalAlpha = 1 - k;
    blob(ctx, e2[0] + 1, e2[1] + 6 + k * 10, 1.8, 2.6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawEye(ctx, x, y, face, i, big) {
  switch (face) {
    case "blink":
      ctx.beginPath();
      ctx.moveTo(x - 3, y + 1);
      ctx.quadraticCurveTo(x, y + 3, x + 3, y + 1);
      ctx.stroke();
      return;
    case "effort": {
      const d = i === 0 ? 1 : -1; // 뒤쪽 눈은 >, 앞쪽 눈은 <
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x - 3 * d, y - 3.5);
      ctx.lineTo(x + 3 * d, y);
      ctx.lineTo(x - 3 * d, y + 3.5);
      ctx.stroke();
      return;
    }
    case "dizzy":
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 3);
      ctx.lineTo(x + 3, y + 3);
      ctx.moveTo(x + 3, y - 3);
      ctx.lineTo(x - 3, y + 3);
      ctx.stroke();
      return;
    case "happy":
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(x, y + 2, 3.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      return;
    case "sad":
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - 1, 3.5, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      // 처진 눈썹
      ctx.beginPath();
      const d = i === 0 ? -1 : 1;
      ctx.moveTo(x - 3.5, y - 7 + (d > 0 ? 2 : 0));
      ctx.lineTo(x + 3.5, y - 7 + (d > 0 ? 0 : 2));
      ctx.stroke();
      return;
    default: {
      const s = big ? 0.85 : 1;
      blob(ctx, x + (big ? 1 : 0), y, 3.1 * s, (face === "jump" ? 4.6 : 4.2) * s);
      ctx.fill();
      ctx.fillStyle = "#fff";
      blob(ctx, x + 1 + (big ? 1 : 0), y - 1.6, 1.2, 1.2);
      ctx.fill();
      ctx.fillStyle = INK;
    }
  }
}

function drawMouth(ctx, ch, x, y, face) {
  ctx.lineWidth = 1.7;
  switch (face) {
    case "jump":
      blob(ctx, x, y + 1, 2.4, 2.8);
      ctx.fill();
      return;
    case "effort":
    case "happy": {
      ctx.beginPath();
      if (face === "happy") {
        ctx.moveTo(x - 5, y - 1);
        ctx.quadraticCurveTo(x, y + 9, x + 5, y - 1);
        ctx.closePath();
      } else {
        ctx.ellipse(x, y + 1.5, 3.8, 3.4, 0, 0, TAU);
      }
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "#ff6f7d";
      blob(ctx, x, y + 5, 3.5, 2.6);
      ctx.fill();
      ctx.restore();
      return;
    }
    case "dizzy":
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 1);
      ctx.quadraticCurveTo(x - 2, y - 1, x, y + 1);
      ctx.quadraticCurveTo(x + 2, y + 3, x + 4, y + 1);
      ctx.stroke();
      return;
    case "sad":
      ctx.beginPath();
      ctx.arc(x, y + 5, 3.5, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      return;
    default:
      if (ch.kind === "hamster" || ch.kind === "cat") {
        // ω
        ctx.beginPath();
        ctx.arc(x - 2, y, 2, 0.1 * Math.PI, 0.95 * Math.PI);
        ctx.moveTo(x + 4, y);
        ctx.arc(x + 2, y, 2, 0.05 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
        if (ch.kind === "cat") {
          ctx.save();
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          for (const s of [-1, 1]) {
            ctx.moveTo(x + 13, y - 1 + s * 2);
            ctx.lineTo(x + 20, y - 2 + s * 4);
            ctx.moveTo(x - 13, y - 1 + s * 2);
            ctx.lineTo(x - 20, y - 2 + s * 4);
          }
          ctx.stroke();
          ctx.restore();
        }
      } else {
        const w = ch.kind === "frog" ? 7 : 4;
        ctx.beginPath();
        ctx.moveTo(x - w, y);
        ctx.quadraticCurveTo(x, y + (ch.kind === "frog" ? 5 : 4), x + w, y);
        ctx.stroke();
      }
  }
}

function drawBeak(ctx, ch, x, y, face) {
  const open = face === "effort" || face === "happy" || face === "jump";
  ctx.save();
  ctx.fillStyle = ch.beak;
  ctx.strokeStyle = ch.line;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 1);
  ctx.lineTo(x + 7, y + (open ? -2 : 1));
  ctx.lineTo(x - 2, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 3, y + 2);
  ctx.lineTo(x + 5, y + (open ? 6 : 2.5));
  ctx.lineTo(x - 2, y + (open ? 6 : 4));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// 사진 얼굴: 얼굴 자리에 둥글게 붙이고, 표정은 작은 기호로 덧붙인다
function drawPhotoFace(ctx, ch, img, face, facing) {
  const cx = 3;
  const cy = ch.kind === "frog" ? -2 : -1;
  const r = 17;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.save();
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.scale(facing, 1); // 사진은 좌우를 뒤집지 않는다
  ctx.drawImage(img, -r, -r, r * 2, r * 2);
  if (face === "sad") {
    ctx.fillStyle = "rgba(60,90,180,0.28)";
    ctx.fillRect(-r, -r, r * 2, r);
  }
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = ch.body;
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = ch.line;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 1.5, 0, TAU);
  ctx.stroke();

  if (face === "effort") {
    // 힘주는 표시 (💢)
    ctx.strokeStyle = "#ff4d5e";
    ctx.lineWidth = 2;
    const ax = cx + 15;
    const ay = cy - 15;
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(ax + dx * 1.5, ay + dy * 4.5);
      ctx.quadraticCurveTo(ax + dx * 1.5, ay + dy * 1.5, ax + dx * 4.5, ay + dy * 1.5);
      ctx.stroke();
    }
  } else if (face === "happy") {
    ctx.fillStyle = "#ffd23f";
    for (const [x, y, s] of [[cx + 18, cy - 14, 4], [cx - 18, cy - 12, 3]]) drawSparkle(ctx, x, y, s);
  }
  ctx.restore();
}

export function drawSparkle(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

export function drawStar(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// 배구공. angle은 라디안
export function drawBall(ctx, x, y, angle, { glow = null } = {}) {
  const R = 20;
  ctx.save();
  ctx.translate(x, y);
  if (glow) {
    const g = ctx.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 1.9);
    g.addColorStop(0, glow);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.9, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fillStyle = "#fffaf0";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.rotate(angle);
  ctx.fillStyle = "#ffd23f";
  ctx.beginPath();
  ctx.ellipse(-3, -17, 26, 11, 0.45, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#5ab4ff";
  ctx.beginPath();
  ctx.ellipse(4, 17, 26, 10, 0.45, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(90,70,40,0.45)";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(-30, 6, 30, -0.9, 0.7);
  ctx.moveTo(40, -2);
  ctx.arc(30, -6, 10, 0, 0.1);
  ctx.moveTo(0, -20);
  ctx.quadraticCurveTo(6, 0, 0, 20);
  ctx.stroke();
  ctx.restore();
  const shade = ctx.createRadialGradient(-7, -8, 2, 0, 0, R);
  shade.addColorStop(0, "rgba(255,255,255,0.55)");
  shade.addColorStop(0.55, "rgba(255,255,255,0)");
  shade.addColorStop(1, "rgba(60,40,20,0.22)");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#4a3b2a";
  ctx.lineWidth = 1.7;
  ctx.stroke();
  ctx.restore();
}

// 메뉴 카드용 미리보기: 작은 캔버스에 캐릭터 한 명
export function drawPreview(canvas, ch, photo, { face = null, t = 0 } = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = canvas.clientWidth || 72;
  if (canvas.width !== Math.round(size * dpr)) {
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = (size * dpr) / 80;
  ctx.setTransform(s, 0, 0, s, 40 * s, 42 * s);
  drawCharacter(ctx, ch, { state: NORMAL, frame: 2, facing: 1, t, face }, photo);
}
