// 기본 제공 레벨. 원작 곡은 저작권이 있어 음악은 Web Audio로 직접 합성한다.
import { mod } from "./level";

const turnOf = (from, to) => {
  const d = mod(to - from, 360);
  if (d < 1e-6 || Math.abs(d - 180) < 1e-6) return "S";
  return d < 180 ? "L" : "R";
};

function parseBeats(s) {
  if (s.includes("/")) {
    const [a, b] = s.split("/").map(Number);
    return a / b;
  }
  return Number(s);
}

/**
 * 박자와 꺾는 방향으로 경로를 짓는다.
 * "1" 직진 한 박, ".5L" 반 박 뒤 왼쪽으로, "1.5R" 한 박 반 뒤 오른쪽으로, "1/3L" 셋잇단.
 * 원하는 쪽으로 꺾으려면 회전 방향이 반대여야 하면 그 타일에 소용돌이를 자동으로 넣는다.
 * "@150"은 이 타일부터 BPM 변경, "!"는 체크포인트, "|"는 마디 구분(무시).
 */
export function compose(src) {
  const angles = [];
  const twirls = new Set();
  const speeds = new Map();
  const checkpoints = new Set();
  let dir = 0;
  let cw = true;

  for (const tok of src.trim().split(/\s+/)) {
    const floor = angles.length;
    if (tok === "|") continue;
    if (tok === "!") {
      checkpoints.add(floor);
      continue;
    }
    if (tok.startsWith("@")) {
      speeds.set(floor, { bpm: Number(tok.slice(1)) });
      continue;
    }
    const m = tok.match(/^([\d./]+)([LR]?)$/);
    if (!m) throw new Error(`잘못된 토큰: ${tok}`);
    const rel = parseBeats(m[1]) * 180;
    const want = m[2] || "S";
    const outCw = mod(dir + 180 - rel, 360);
    const outCcw = mod(dir + 180 + rel, 360);
    const mine = cw ? outCw : outCcw;
    const other = cw ? outCcw : outCw;
    if (turnOf(dir, mine) !== want) {
      if (turnOf(dir, other) !== want) throw new Error(`${tok}: 그 방향으로 꺾을 수 없어요`);
      twirls.add(floor);
      cw = !cw;
    }
    dir = cw ? outCw : outCcw;
    angles.push(Math.round(dir * 1000) / 1000);
  }
  return { angles, twirls, speeds, checkpoints };
}

function level({ id, title, desc, bpm, music, path, countdown = 4 }) {
  const beat = 60 / bpm;
  return {
    id,
    title,
    desc,
    bpm,
    // 카운트다운이 끝나는 박에 첫 타일을 밟는다
    offsetMs: countdown * beat * 1000,
    pitch: 1,
    countdown,
    music,
    builtin: true,
    // 첫 타일로 가는 회전은 카운트다운에 쓰이므로 한 박을 앞에 붙여 마디를 음악과 맞춘다
    ...compose(`1 ${path}`),
  };
}

export const LEVELS = [
  level({
    id: "1-1",
    title: "첫 걸음",
    desc: "직선과 모서리. 행성이 타일에 닿을 때 아무 키나 누르세요.",
    bpm: 100,
    music: { style: "calm", prog: ["C", "G", "Am", "F"] },
    path: `
      1 1 1 1 | 1 1 1 1 | 1 1 1 1 | 1 1 1 1 |
      1 1 .5L 1.5R | 1 1 .5L 1.5R | 1 1 1.5R .5L | 1 1 1.5R .5L | !
      1 .5L 1.5R 1 | 1 .5L 1.5R 1 | 1 1.5R .5L 1 | 1 1.5R .5L 1 |
      .5L 1.5R .5L 1.5R | 1.5R .5L 1.5R .5L | 1 1 1 1 | 1 1 1 1`,
  }),
  level({
    id: "1-2",
    title: "모서리",
    desc: "엇박과 45° 꺾임. 밟기 전에 다음 타일의 각도를 보세요.",
    bpm: 115,
    music: { style: "drive", prog: ["Am", "F", "C", "G"] },
    path: `
      1 1 1 1 | 1 1 1 1 |
      .5L 1.5R 1 1 | .5L 1.5R 1 1 | 1.5R .5L 1 1 | 1.5R .5L 1 1 |
      1 .5L 1 1.5R | 1 1.5R 1 .5L | 1 .5L 1 1.5R | 1 1.5R 1 .5L | !
      .75L 1.25R 1 1 | .75L 1.25R 1 1 | 1.25R .75L 1 1 | 1.25R .75L 1 1 |
      1.5R .5L 1.5R .5L | 1 1 1 1 | .5L 1.5R .5L 1.5R | 1 1 1 1 | !
      .75L 1.25R .75L 1.25R | 1.25R .75L 1.25R .75L | 1 .5L 1 1.5R | 1 1 1 1`,
  }),
  level({
    id: "1-3",
    title: "소용돌이",
    desc: "빨간 소용돌이 타일을 밟으면 회전 방향이 뒤집혀요.",
    bpm: 125,
    music: { style: "drive", prog: ["F", "G", "Em", "Am"] },
    path: `
      1 1 1 1 | 1 1 1 1 |
      .5L .5R 1 1 1 | .5L .5R 1 1 1 | .5R .5L 1 1 1 | .5R .5L 1 1 1 | !
      .5L .5R .5L .5R 1 1 | .5R .5L .5R .5L 1 1 | .5L .5R .5L .5R .5L .5R 1 | 1 1 1 1 | !
      1.5L .5R 1.5L .5R | 1.5R .5L 1.5R .5L | .5L .5R .5L .5R .5L .5R .5L .5R | 1 1 1 1 |
      .5R .5L .5R .5L .5R .5L .5R .5L | 1.5L .5R 1 1 | 1 1 1 1`,
  }),
  level({
    id: "1-4",
    title: "가속",
    desc: "토끼는 빨라지고 달팽이는 느려져요.",
    bpm: 100,
    music: { style: "drive", prog: ["C", "Am", "F", "G"] },
    path: `
      1 1 1 1 | 1 1 1 1 | .5L 1.5R 1 1 | 1.5R .5L 1 1 |
      @130 1 1 1 1 | 1 1 1 1 | .5L 1.5R 1 1 | 1.5R .5L 1 1 | !
      @160 1 1 1 1 | .5L 1.5R .5L 1.5R | 1 1 1 1 | 1.5R .5L 1.5R .5L | !
      @200 1 1 1 1 | 1 1 1 1 | .5L 1.5R 1 1 | 1 1 1 1 | 1.5R .5L 1 1 | 1 1 1 1 | !
      @100 1 1 1 1 | .5L 1.5R 1 1 | 1 1 1 1 | 1 1 1 1`,
  }),
  level({
    id: "1-5",
    title: "셋잇단",
    desc: "60°·120° 꺾임은 셋잇단 리듬이에요.",
    bpm: 96,
    music: { style: "calm", prog: ["Dm", "A#", "F", "C"] },
    path: `
      1 1 1 1 | 1 1 1 1 |
      2/3L 4/3R 1 1 | 2/3L 4/3R 1 1 | 4/3R 2/3L 1 1 | 4/3R 2/3L 1 1 | !
      1/3L 1/3R 1/3L 1 1 1 | 1/3R 1/3L 1/3R 1 1 1 | 2/3L 4/3R 2/3L 4/3R | 1 1 1 1 | !
      1/3L 1/3R 1/3L 1/3R 1/3L 1/3R 1 1 | 4/3R 2/3L 4/3R 2/3L | 1/3R 1/3L 1/3R 1 1 1 | 1 1 1 1`,
  }),
  level({
    id: "1-X",
    title: "얼음과 불",
    desc: "지금까지 배운 모든 것. 체크포인트를 잘 활용하세요.",
    bpm: 150,
    music: { style: "boss", prog: ["Am", "F", "C", "G"] },
    path: `
      1 1 1 1 | 1 1 1 1 | .5L 1.5R 1 1 | 1.5R .5L 1 1 |
      .5L .5R 1 .5L .5R 1 | .5R .5L 1 .5R .5L 1 | 1.5R .5L 1.5R .5L | 1 1 1 1 | !
      .75L 1.25R .75L 1.25R | 1.25R .75L 1.25R .75L | .5L .5R .5L .5R .5L .5R 1 | 1 1 1 1 | !
      @180 1 1 1 1 | .5L 1.5R 1 1 | 1.5R .5L 1 1 | .5L .5R .5L .5R 1 1 |
      .5R .5L .5R .5L 1 1 | 1/3L 1/3R 1/3L 1 1 1 | 1/3R 1/3L 1/3R 1 1 1 | 1 1 1 1 | !
      @90 1 1 1 1 | .5L 1.5R 1 1 | @150 1 1 1 1 | .5L .5R .5L .5R .5L .5R .5L .5R |
      .5R .5L .5R .5L .5R .5L .5R .5L | 1 1 1 1 | 1 1 1 1`,
  }),
];
