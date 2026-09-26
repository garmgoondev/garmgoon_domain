// 얼음과 불의 춤(ADOFAI) 레벨 해석과 타이밍 계산
// 각도는 수학 좌표계(0° = 오른쪽, 90° = 위) 기준의 도(degree) 단위다.

// 공식 pathData 문자 → 진행 방향
export const PATH_CHARS = {
  R: 0, p: 15, J: 30, E: 45, T: 60, o: 75, U: 90, q: 105, G: 120, Q: 135, H: 150, W: 165,
  L: 180, x: 195, N: 210, Z: 225, F: 240, V: 255, D: 270, Y: 285, B: 300, C: 315, M: 330, A: 345,
  "!": 999,
};

const MIDSPIN = 999;

export const mod = (a, n) => ((a % n) + n) % n;

// 화면에서 언어에 맞게 옮길 수 있도록 오류는 코드로 던진다
export class LevelError extends Error {
  constructor(code, arg) {
    super(code);
    this.code = code;
    this.arg = arg;
  }
}

// 공식 .adofai 파일은 끝에 붙은 쉼표나 빠진 쉼표가 흔한 느슨한 JSON이다
export function parseLooseJson(text) {
  const src = text.replace(/^﻿/, "");
  try {
    return JSON.parse(src);
  } catch {
    const fixed = src
      .replace(/,(\s*[}\]])/g, "$1")
      .replace(/}(\s*){/g, "},$1{")
      .replace(/](\s*)"/g, "],$1\"");
    return JSON.parse(fixed);
  }
}

const stripTags = (s) => String(s ?? "").replace(/<[^>]*>/g, "").trim();

function hexColor(v) {
  const m = String(v ?? "").match(/^#?([0-9a-f]{6})/i);
  return m ? `#${m[1]}` : null;
}

// .adofai 텍스트 → 공통 레벨 형식
export function parseAdofaiFile(text) {
  let data;
  try {
    data = parseLooseJson(text);
  } catch {
    throw new LevelError("badFormat");
  }
  const s = data.settings || {};

  let angles;
  if (Array.isArray(data.angleData)) {
    angles = data.angleData.map(Number);
  } else if (typeof data.pathData === "string") {
    angles = [...data.pathData].map((ch) => {
      const a = PATH_CHARS[ch];
      if (a === undefined) throw new LevelError("badChar", ch);
      return a;
    });
  } else {
    throw new LevelError("noPath");
  }
  if (angles.length < 1) throw new LevelError("tooFew");

  const twirls = new Set();
  const speeds = new Map();
  const pauses = new Map();
  const checkpoints = new Set();
  const warnings = new Set();
  const UNSUPPORTED = { Hold: "hold", FreeRoam: "freeRoam", MultiPlanet: "multiPlanet" };

  for (const a of data.actions || []) {
    const f = Number(a.floor);
    if (!Number.isFinite(f)) continue;
    switch (a.eventType) {
      case "Twirl":
        if (twirls.has(f)) twirls.delete(f);
        else twirls.add(f);
        break;
      case "SetSpeed":
        if (a.speedType === "Multiplier") speeds.set(f, { mult: Number(a.bpmMultiplier) || 1 });
        else if (Number(a.beatsPerMinute) > 0) speeds.set(f, { bpm: Number(a.beatsPerMinute) });
        break;
      case "Pause":
        pauses.set(f, (pauses.get(f) || 0) + (Number(a.duration) || 0));
        break;
      case "Checkpoint":
        checkpoints.add(f);
        break;
      default:
        if (UNSUPPORTED[a.eventType]) warnings.add(UNSUPPORTED[a.eventType]);
    }
  }
  if (angles.some((a) => a === MIDSPIN)) warnings.add("midspin");

  return {
    title: stripTags(s.song),
    artist: stripTags(s.artist),
    author: stripTags(s.author),
    bpm: Number(s.bpm) || 100,
    offsetMs: Number(s.offset) || 0,
    pitch: (Number(s.pitch) || 100) / 100,
    countdown: Number.isFinite(Number(s.countdownTicks)) ? Number(s.countdownTicks) : 4,
    songFilename: String(s.songFilename || ""),
    volume: Number.isFinite(Number(s.volume)) ? Number(s.volume) / 100 : 1,
    trackColor: hexColor(s.trackColor),
    bgColor: hexColor(s.backgroundColor),
    angles,
    twirls,
    speeds,
    pauses,
    checkpoints,
    warnings: [...warnings],
  };
}

/**
 * 레벨 → 타일 좌표와 타이밍
 * 타일 i에 선 행성을 축으로 다른 행성이 한 박에 180°씩 돌아 타일 i+1에 닿는다.
 * 기본은 시계 방향, 소용돌이(Twirl)를 밟을 때마다 방향이 뒤집힌다.
 * 반환하는 시간은 모두 실제 재생 초(피치 반영) 기준이다.
 */
export function buildTimeline(level) {
  const rate = level.pitch || 1;
  const floors = [{ x: 0, y: 0, inDir: 0, back: 180, drawBack: 180 }];
  const origToIdx = [0];

  level.angles.forEach((a, k) => {
    const last = floors[floors.length - 1];
    if (Math.abs(a - MIDSPIN) < 1e-6) {
      // 미드스핀: 같은 자리에서 회전 기준만 뒤집는다 (간이 처리)
      last.back = mod(last.back + 180, 360);
      last.midspin = true;
      origToIdx[k + 1] = floors.length - 1;
      return;
    }
    const r = (a * Math.PI) / 180;
    const dir = mod(a, 360);
    floors.push({
      x: last.x + Math.cos(r),
      y: last.y + Math.sin(r),
      inDir: dir,
      back: mod(dir + 180, 360),
      drawBack: mod(dir + 180, 360),
    });
    origToIdx[k + 1] = floors.length - 1;
  });

  const at = (map) => {
    const out = new Map();
    for (const [f, v] of map) {
      const i = origToIdx[f];
      if (i !== undefined) out.set(i, v);
    }
    return out;
  };
  const twirlAt = new Map();
  for (const f of level.twirls || []) {
    const i = origToIdx[f];
    if (i !== undefined) twirlAt.set(i, !twirlAt.get(i));
  }
  const speedAt = at(level.speeds || new Map());
  const pauseAt = at(level.pauses || new Map());

  const M = floors.length;
  if (M < 2) throw new LevelError("tooFew");

  let bpm = level.bpm;
  let cw = true;
  for (let i = 0; i < M; i++) {
    const f = floors[i];
    const sp = speedAt.get(i);
    if (sp) {
      const next = sp.bpm ?? bpm * sp.mult;
      f.speed = next > bpm + 1e-6 ? 1 : next < bpm - 1e-6 ? -1 : 0;
      bpm = next;
    }
    if (twirlAt.get(i)) {
      cw = !cw;
      f.twirl = true;
    }
    f.bpm = bpm * rate;
    f.cw = cw;
    if (i < M - 1) {
      const out = floors[i + 1].inDir;
      let rel = cw ? mod(f.back - out, 360) : mod(out - f.back, 360);
      if (rel < 1e-6) rel = 360;
      rel += (pauseAt.get(i) || 0) * 180;
      f.rel = rel;
      f.dur = (rel / 180) * (60 / f.bpm);
    }
  }

  floors[1].time = level.offsetMs / 1000 / rate;
  floors[0].time = floors[1].time - floors[0].dur;
  for (let i = 1; i < M - 1; i++) floors[i + 1].time = floors[i].time + floors[i].dur;

  const checkpoints = [...new Set([...(level.checkpoints || [])].map((f) => origToIdx[f]))]
    .filter((i) => i > 0 && i < M - 1)
    .sort((a, b) => a - b);
  for (const i of checkpoints) floors[i].checkpoint = true;

  return {
    floors,
    checkpoints,
    firstHit: floors[1].time,
    end: floors[M - 1].time,
    countdown: level.countdown ?? 4,
  };
}

// 타일 i를 축으로 돌 때 t초의 회전 행성 각도(도)
export function orbitAngle(floors, i, t) {
  const f = floors[i];
  const w = (180 * f.bpm) / 60;
  const next = floors[i + 1];
  if (next) {
    const remain = next.time - t;
    return f.cw ? next.inDir + remain * w : next.inDir - remain * w;
  }
  const passed = t - f.time;
  return f.cw ? f.back - passed * w : f.back + passed * w;
}

// 시각 t의 BPM (마지막으로 지난 타일 기준)
export function bpmAt(floors, t) {
  let lo = 0;
  let hi = floors.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (floors[mid].time <= t) lo = mid;
    else hi = mid - 1;
  }
  return floors[lo].bpm;
}
