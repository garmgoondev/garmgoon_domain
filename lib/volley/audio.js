// 말랑 배구 소리: 효과음과 배경음악을 Web Audio로 합성한다 (음원 파일 없음)

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

// 배경음악: C–Am–F–G 8마디, 8분음표 단위 멜로디 (null은 쉼표)
const BPM = 132;
const PROG = [48, 45, 41, 43, 48, 45, 41, 43]; // 마디별 베이스 근음
const CHORD = { 48: [0, 4, 7], 45: [0, 3, 7], 41: [0, 4, 7], 43: [0, 4, 7] };
const MELODY = [
  [72, 76, 79, 76, 77, 76, 74, null],
  [72, null, 69, 72, 76, null, 74, 72],
  [69, 72, 77, 76, 74, 72, 74, null],
  [71, 74, 79, 77, 76, 74, 71, 74],
  [76, 79, 84, 79, 81, 79, 76, null],
  [72, 76, 81, 79, 76, null, 72, 74],
  [77, 76, 74, 72, 69, 72, 74, 77],
  [79, null, 74, null, 71, 74, 79, null],
];

class VolleyAudio {
  constructor() {
    this.ctx = null;
    this.vol = { music: 0.5, sfx: 0.8 };
    this.musicOn = false;
    this.timer = null;
    this.nextStep = 0;
    this.stepAt = 0;
  }

  // 사용자 입력 중에 불러야 소리가 난다
  ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC({ latencyHint: "interactive" });
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
      this.applyVolume();
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  setVolume({ music, sfx }) {
    if (music !== undefined) this.vol.music = music;
    if (sfx !== undefined) this.vol.sfx = sfx;
    this.applyVolume();
  }

  applyVolume() {
    if (!this.ctx) return;
    this.sfxGain.gain.value = this.vol.sfx * 0.9;
    this.musicGain.gain.value = this.vol.music * 0.32;
  }

  // ---------- 합성 도구 ----------

  tone({ type = "sine", f0, f1 = f0, t = 0, dur = 0.1, vol = 0.3, attack = 0.005, out = this.sfxGain, curve = "exp" }) {
    const c = this.ctx;
    const at = c.currentTime + t;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) {
      if (curve === "exp") o.frequency.exponentialRampToValueAtTime(f1, at + dur);
      else o.frequency.linearRampToValueAtTime(f1, at + dur);
    }
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + dur + 0.02);
    return o;
  }

  hiss({ t = 0, dur = 0.1, vol = 0.3, type = "bandpass", f0 = 1200, f1 = f0, q = 1, out = this.sfxGain }) {
    const c = this.ctx;
    const at = c.currentTime + t;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) fl.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(fl).connect(g).connect(out);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.02);
  }

  // ---------- 효과음 ----------

  play(name) {
    if (!this.ctx || this.ctx.state !== "running" || this.vol.sfx <= 0) return;
    switch (name) {
      case "jump":
        this.tone({ type: "sine", f0: 300, f1: 760, dur: 0.14, vol: 0.28 });
        this.tone({ type: "triangle", f0: 600, f1: 1200, dur: 0.1, vol: 0.08 });
        break;
      case "dive":
        this.hiss({ f0: 2400, f1: 500, dur: 0.22, vol: 0.28, q: 2 });
        this.tone({ type: "sine", f0: 500, f1: 220, dur: 0.16, vol: 0.12 });
        break;
      case "swing":
        // 기합 소리 대신 짧은 "뿅"
        this.tone({ type: "square", f0: 880, f1: 1320, dur: 0.07, vol: 0.06 });
        this.hiss({ type: "highpass", f0: 3000, dur: 0.08, vol: 0.12 });
        break;
      case "hit":
        this.tone({ type: "sine", f0: 620, f1: 280, dur: 0.09, vol: 0.4 });
        this.hiss({ type: "bandpass", f0: 2500, dur: 0.03, vol: 0.25, q: 0.8 });
        break;
      case "smash":
        this.hiss({ type: "lowpass", f0: 2600, f1: 600, dur: 0.18, vol: 0.55 });
        this.tone({ type: "sine", f0: 220, f1: 55, dur: 0.22, vol: 0.6 });
        this.tone({ type: "square", f0: 1400, f1: 700, dur: 0.06, vol: 0.07 });
        break;
      case "net":
        this.tone({ type: "triangle", f0: 1500, f1: 1300, dur: 0.12, vol: 0.18 });
        break;
      case "ground":
        this.tone({ type: "sine", f0: 150, f1: 55, dur: 0.18, vol: 0.45 });
        this.hiss({ type: "lowpass", f0: 900, dur: 0.12, vol: 0.2 });
        break;
      case "land":
        this.hiss({ type: "lowpass", f0: 700, dur: 0.06, vol: 0.12 });
        break;
      case "score":
        [79, 84, 88].forEach((n, i) => this.tone({ type: "triangle", f0: freq(n), t: i * 0.075, dur: 0.22, vol: 0.2 }));
        break;
      case "whistle": {
        const o = this.tone({ type: "sine", f0: 2300, dur: 0.32, vol: 0.14, attack: 0.02 });
        const lfo = this.ctx.createOscillator();
        const lg = this.ctx.createGain();
        lfo.frequency.value = 28;
        lg.gain.value = 90;
        lfo.connect(lg).connect(o.frequency);
        lfo.start();
        lfo.stop(this.ctx.currentTime + 0.35);
        break;
      }
      case "win":
        [72, 76, 79, 84].forEach((n, i) => {
          this.tone({ type: "square", f0: freq(n), t: i * 0.13, dur: i === 3 ? 0.7 : 0.16, vol: 0.09 });
          this.tone({ type: "triangle", f0: freq(n - 12), t: i * 0.13, dur: i === 3 ? 0.7 : 0.16, vol: 0.14 });
        });
        break;
      case "lose":
        [67, 66, 65, 64].forEach((n, i) => this.tone({ type: "triangle", f0: freq(n), t: i * 0.2, dur: i === 3 ? 0.6 : 0.2, vol: 0.18 }));
        break;
      case "click":
        this.tone({ type: "sine", f0: 900, f1: 1200, dur: 0.05, vol: 0.12 });
        break;
      default:
    }
  }

  // ---------- 배경음악 ----------

  startMusic() {
    if (!this.ensure() || this.musicOn) return;
    this.musicOn = true;
    this.nextStep = 0;
    this.stepAt = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 60);
    this.schedule();
  }

  stopMusic() {
    this.musicOn = false;
    clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    const c = this.ctx;
    if (!this.musicOn || !c) return;
    const eighth = 60 / BPM / 2;
    // 탭이 멈췄다 돌아오면 밀린 음을 몰아서 내지 않는다
    if (this.stepAt < c.currentTime - 0.2) this.stepAt = c.currentTime + 0.05;
    while (this.stepAt < c.currentTime + 0.25) {
      this.note(this.nextStep % 64, this.stepAt - c.currentTime, eighth);
      this.nextStep++;
      this.stepAt += eighth;
    }
  }

  note(step, t, eighth) {
    if (this.vol.music <= 0) return;
    const out = this.musicGain;
    const bar = step >> 3;
    const pos = step & 7;
    const root = PROG[bar];
    const m = MELODY[bar][pos];
    if (m) this.tone({ type: "square", f0: freq(m), t, dur: eighth * 0.9, vol: 0.09, out });
    // 베이스: 한 박에 두 번 튀는 느낌
    if (pos % 2 === 0) this.tone({ type: "triangle", f0: freq(root - 12 + (pos === 4 ? 7 : 0)), t, dur: eighth * 1.6, vol: 0.32, out });
    // 반주 화음: 뒷박
    if (pos % 2 === 1) {
      for (const iv of CHORD[root]) this.tone({ type: "triangle", f0: freq(root + 12 + iv), t, dur: eighth * 0.6, vol: 0.05, out });
    }
    // 드럼
    if (pos === 0 || pos === 4) {
      this.tone({ type: "sine", f0: 130, f1: 45, t, dur: 0.14, vol: 0.5, out });
    }
    if (pos === 2 || pos === 6) this.hiss({ type: "bandpass", f0: 1800, t, dur: 0.1, vol: 0.18, q: 0.7, out });
    this.hiss({ type: "highpass", f0: 7000, t, dur: 0.03, vol: pos % 2 ? 0.08 : 0.05, out });
  }

  suspend() {
    if (this.ctx && this.ctx.state === "running") this.ctx.suspend().catch(() => {});
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  }
}

export const volleyAudio = new VolleyAudio();
