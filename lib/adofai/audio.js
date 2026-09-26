// 얼음과 불의 춤 오디오: Web Audio 합성 음악, 타격음, 오디오 시계
// 모든 판정은 AudioContext 시계를 기준으로 해서 화면 프레임과 무관하게 박자가 맞는다.

const NOTE = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

function chord(name) {
  const m = String(name).match(/^([A-G][#b]?)(m?)$/);
  const pc = m ? NOTE[m[1]] : 0;
  return { pc, third: m && m[2] ? 3 : 4 };
}

// 커스텀 레벨에 음악 파일이 없을 때 쓰는 기본 반주
export const METRONOME = { style: "calm", prog: ["C", "G", "Am", "F"] };
const ARP = [0, 1, 2, 3, 2, 1];

/**
 * 한 번의 플레이(세션)에 필요한 소리 일정. 시간은 곡 기준 초.
 * music: 합성 반주 설정 (없으면 카운트다운과 자동 플레이 타격음만)
 */
export function buildSessionEvents(tl, { music, from, startFloor = 0, autoplay = false, hitsound = "kick", guide = true }) {
  const F = tl.floors;
  const M = F.length;
  const ev = [];

  // 카운트다운 틱
  const target = F[startFloor + 1].time;
  const cdBeat = 60 / F[startFloor].bpm;
  for (let k = tl.countdown; k >= 1; k--) ev.push({ t: target - k * cdBeat, kind: "tick", hi: k === 1 });

  if (autoplay && hitsound !== "off") {
    for (let i = startFloor + 1; i < M; i++) ev.push({ t: F[i].time, kind: "hit", type: hitsound });
  }

  if (music) {
    const prog = music.prog.map(chord);
    const style = music.style;
    // 박 격자: 첫 타일을 0박으로 두고, BPM이 바뀌는 타일에서 다시 맞춘다
    const beats = [];
    const anchors = [1];
    for (let i = 2; i < M; i++) if (F[i].speed !== undefined) anchors.push(i);
    const tailEnd = F[M - 1].time + 0.01;
    let n = 0;
    anchors.forEach((a, k) => {
      const bpm = F[a].bpm;
      const until = k + 1 < anchors.length ? F[anchors[k + 1]].time - 1e-4 : tailEnd;
      for (let t = F[a].time; t < until; t += 60 / bpm) beats.push({ t, n: n++, bpm });
    });

    const chordAt = (nBeat) => prog[mod(Math.floor(nBeat / 4), prog.length)];
    for (const b of beats) {
      if (b.t < from - 0.05) continue;
      const beat = 60 / b.bpm;
      const c = chordAt(b.n);
      const pos = mod(b.n, 4);
      const drive = style !== "calm";
      if (drive || pos === 0 || pos === 2) ev.push({ t: b.t, kind: "kick" });
      if (pos === 1 || pos === 3) ev.push({ t: b.t, kind: "snare", soft: !drive });
      ev.push({ t: b.t, kind: "hat", open: false, vol: 0.5 });
      ev.push({ t: b.t + beat / 2, kind: "hat", open: drive, vol: drive ? 0.9 : 0.6 });
      if (style === "boss") {
        ev.push({ t: b.t + beat / 4, kind: "hat", open: false, vol: 0.35 });
        ev.push({ t: b.t + (beat * 3) / 4, kind: "hat", open: false, vol: 0.35 });
      }
      const root = 36 + c.pc;
      if (drive) {
        ev.push({ t: b.t, kind: "bass", midi: root, dur: beat * 0.45, boss: style === "boss" });
        ev.push({ t: b.t + beat / 2, kind: "bass", midi: root + 12, dur: beat * 0.4, boss: style === "boss" });
      } else if (pos === 0 || pos === 2) {
        ev.push({ t: b.t, kind: "bass", midi: root, dur: beat * 1.8 });
      }
      if (pos === 0) ev.push({ t: b.t, kind: "pad", notes: [0, c.third, 7].map((x) => 60 + c.pc + x), dur: beat * 4 });
    }
    // 마지막 타일: 마무리 화음
    const last = F[M - 1].time;
    if (last >= from) {
      const c = chordAt(beats.length ? beats[beats.length - 1].n : 0);
      ev.push({ t: last, kind: "kick" });
      ev.push({ t: last, kind: "crash" });
      ev.push({ t: last, kind: "pad", notes: [0, c.third, 7, 12].map((x) => 60 + c.pc + x), dur: 2.5 });
      ev.push({ t: last, kind: "bass", midi: 36 + c.pc, dur: 2 });
    }

    // 가이드 멜로디: 타일마다 한 음, 화음 구성음을 오르내린다
    if (guide) {
      let bi = 0;
      for (let i = Math.max(1, startFloor + 1); i < M; i++) {
        const t = F[i].time;
        while (bi + 1 < beats.length && beats[bi + 1].t <= t + 1e-4) bi++;
        const c = chordAt(beats[bi]?.n ?? 0);
        const tones = [0, c.third, 7, 12];
        ev.push({ t, kind: "pluck", midi: 72 + c.pc + tones[ARP[i % ARP.length]] - 12 });
      }
    }
  }

  ev.sort((a, b) => a.t - b.t);
  return ev;
}

const mod = (a, n) => ((a % n) + n) % n;

class AdofaiAudio {
  constructor() {
    this.ctx = null;
    this.t0 = null;
    this.session = null;
    this.timer = null;
    this.vol = { music: 0.8, hit: 0.8 };
  }

  // 사용자 입력 중에 불러야 소리가 난다
  ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.hitBus = this.ctx.createGain();
      this.hitBus.gain.value = this.vol.hit;
      this.hitBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  setVolume({ music, hit }) {
    if (music !== undefined) this.vol.music = music;
    if (hit !== undefined) this.vol.hit = hit;
    if (this.hitBus) this.hitBus.gain.value = this.vol.hit;
    if (this.session) {
      this.session.music.gain.value = this.vol.music;
      this.session.sfx.gain.value = this.vol.hit;
    }
  }

  /** 곡 시간 from부터 재생을 시작한다. buffer가 있으면 음원을 함께 튼다. */
  startSession({ events, from, buffer = null, rate = 1, volume = 1 }) {
    const c = this.ensure();
    if (!c) return;
    this.stopSession();
    const out = c.createGain();
    out.connect(this.master);
    const music = c.createGain();
    music.gain.value = this.vol.music;
    music.connect(out);
    const sfx = c.createGain();
    sfx.gain.value = this.vol.hit;
    sfx.connect(out);

    this.t0 = c.currentTime + 0.15 - from;
    const s = { out, music, sfx, events, i: 0, sources: [] };
    if (buffer) {
      const src = c.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      const g = c.createGain();
      g.gain.value = volume;
      src.connect(g).connect(music);
      const at = Math.max(from, 0);
      src.start(this.t0 + at, at * rate);
      s.sources.push(src);
    }
    this.session = s;
    this.pump();
    this.timer = setInterval(() => this.pump(), 25);
  }

  pump() {
    const s = this.session;
    const c = this.ctx;
    if (!s || !c || c.state !== "running") return;
    const horizon = c.currentTime + 0.2;
    while (s.i < s.events.length && this.t0 + s.events[s.i].t < horizon) {
      const e = s.events[s.i++];
      const when = this.t0 + e.t;
      if (when < c.currentTime - 0.03) continue;
      this.voice(e, Math.max(when, c.currentTime), e.kind === "hit" || e.kind === "tick" ? s.sfx : s.music);
    }
  }

  stopSession(fade = 0) {
    clearInterval(this.timer);
    this.timer = null;
    const s = this.session;
    this.session = null;
    if (!s) return;
    const c = this.ctx;
    if (fade > 0 && c.state === "running") {
      s.out.gain.setValueAtTime(s.out.gain.value, c.currentTime);
      s.out.gain.linearRampToValueAtTime(0, c.currentTime + fade);
      setTimeout(() => this.teardown(s), fade * 1000 + 50);
    } else {
      this.teardown(s);
    }
  }

  teardown(s) {
    for (const src of s.sources) {
      try {
        src.stop();
      } catch {}
    }
    s.out.disconnect();
  }

  suspend() {
    return this.ctx?.suspend();
  }

  resume() {
    return this.ctx?.resume();
  }

  /**
   * 성능 시계(performance.now 기준) 시각에 스피커로 나오던 곡 시간.
   * getOutputTimestamp가 출력 지연까지 반영해 준다. 없으면 outputLatency로 보정한다.
   */
  songTime(perf = performance.now()) {
    const c = this.ctx;
    if (!c || this.t0 === null) return 0;
    let ct;
    const ts = c.getOutputTimestamp ? c.getOutputTimestamp() : null;
    if (ts && ts.contextTime > 0 && ts.performanceTime > 0) {
      ct = ts.contextTime + (perf - ts.performanceTime) / 1000;
    } else {
      ct = c.currentTime - (c.outputLatency || c.baseLatency || 0) + (perf - performance.now()) / 1000;
    }
    return Math.min(ct, c.currentTime) - this.t0;
  }

  // 플레이어가 타일을 밟는 순간의 타격음
  playHit(type = "kick") {
    const c = this.ctx;
    if (!c || type === "off") return;
    this.voice({ kind: "hit", type }, c.currentTime, this.hitBus);
  }

  // 오프셋 보정용 클릭 트랙. 반환값은 박 시각(곡 기준 초) 목록
  startClickTrack(bpm, count) {
    const beat = 60 / bpm;
    const times = Array.from({ length: count }, (_, i) => i * beat);
    this.startSession({ events: times.map((t, i) => ({ t, kind: "tick", hi: i % 4 === 0 })), from: -0.6 });
    return times;
  }

  env(g, when, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  }

  noiseSrc(when, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.start(when, Math.random() * 0.5, dur + 0.05);
    return src;
  }

  voice(e, when, dest) {
    const c = this.ctx;
    const osc = (type, f) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, when);
      return o;
    };
    const gain = () => c.createGain();
    const stopAt = (node, t) => {
      node.start(when);
      node.stop(t);
    };

    switch (e.kind) {
      case "kick": {
        const o = osc("sine", 150);
        o.frequency.exponentialRampToValueAtTime(42, when + 0.12);
        const g = gain();
        this.env(g, when, 0.9, 0.003, 0.28);
        o.connect(g).connect(dest);
        stopAt(o, when + 0.35);
        break;
      }
      case "snare": {
        const n = this.noiseSrc(when, 0.2);
        const f = c.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = e.soft ? 2600 : 1800;
        f.Q.value = 0.8;
        const g = gain();
        this.env(g, when, e.soft ? 0.18 : 0.45, 0.002, e.soft ? 0.08 : 0.16);
        n.connect(f).connect(g).connect(dest);
        if (!e.soft) {
          const o = osc("triangle", 190);
          const g2 = gain();
          this.env(g2, when, 0.25, 0.002, 0.08);
          o.connect(g2).connect(dest);
          stopAt(o, when + 0.12);
        }
        break;
      }
      case "hat": {
        const n = this.noiseSrc(when, 0.15);
        const f = c.createBiquadFilter();
        f.type = "highpass";
        f.frequency.value = 7500;
        const g = gain();
        this.env(g, when, 0.12 * (e.vol ?? 1), 0.001, e.open ? 0.11 : 0.035);
        n.connect(f).connect(g).connect(dest);
        break;
      }
      case "crash": {
        const n = this.noiseSrc(when, 1.6);
        const f = c.createBiquadFilter();
        f.type = "highpass";
        f.frequency.value = 4000;
        const g = gain();
        this.env(g, when, 0.22, 0.002, 1.4);
        n.connect(f).connect(g).connect(dest);
        break;
      }
      case "bass": {
        const o = osc(e.boss ? "sawtooth" : "triangle", freq(e.midi));
        const f = c.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.setValueAtTime(e.boss ? 900 : 500, when);
        f.frequency.exponentialRampToValueAtTime(180, when + e.dur);
        const g = gain();
        this.env(g, when, e.boss ? 0.28 : 0.4, 0.005, e.dur);
        o.connect(f).connect(g).connect(dest);
        stopAt(o, when + e.dur + 0.05);
        break;
      }
      case "pad": {
        const f = c.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 1400;
        const g = gain();
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.05, when + 0.12);
        g.gain.setValueAtTime(0.05, when + e.dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, when + e.dur);
        f.connect(g).connect(dest);
        for (const m of e.notes) {
          for (const det of [-7, 7]) {
            const o = osc("sawtooth", freq(m));
            o.detune.value = det;
            o.connect(f);
            stopAt(o, when + e.dur + 0.05);
          }
        }
        break;
      }
      case "pluck": {
        const g = gain();
        this.env(g, when, 0.16, 0.003, 0.32);
        g.connect(dest);
        const o1 = osc("triangle", freq(e.midi));
        const o2 = osc("sine", freq(e.midi + 12));
        const g2 = gain();
        g2.gain.value = 0.35;
        o1.connect(g);
        o2.connect(g2).connect(g);
        stopAt(o1, when + 0.4);
        stopAt(o2, when + 0.4);
        break;
      }
      case "tick": {
        const o = osc("sine", e.hi ? 1760 : 1320);
        const g = gain();
        this.env(g, when, 0.35, 0.001, 0.06);
        o.connect(g).connect(dest);
        stopAt(o, when + 0.1);
        break;
      }
      case "hit": {
        const type = e.type || "kick";
        if (type === "clap") {
          const n = this.noiseSrc(when, 0.12);
          const f = c.createBiquadFilter();
          f.type = "bandpass";
          f.frequency.value = 1500;
          f.Q.value = 1.2;
          const g = gain();
          g.gain.setValueAtTime(0.0001, when);
          for (const [dt, v] of [[0, 0.8], [0.012, 0.6], [0.024, 0.7]]) {
            g.gain.setValueAtTime(v, when + dt);
            g.gain.exponentialRampToValueAtTime(0.05, when + dt + 0.01);
          }
          g.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
          n.connect(f).connect(g).connect(dest);
        } else if (type === "tick") {
          const o = osc("square", 2200);
          const f = c.createBiquadFilter();
          f.type = "bandpass";
          f.frequency.value = 2400;
          const g = gain();
          this.env(g, when, 0.4, 0.001, 0.035);
          o.connect(f).connect(g).connect(dest);
          stopAt(o, when + 0.06);
        } else {
          const o = osc("sine", 190);
          o.frequency.exponentialRampToValueAtTime(55, when + 0.07);
          const g = gain();
          this.env(g, when, 1, 0.001, 0.16);
          o.connect(g).connect(dest);
          stopAt(o, when + 0.2);
          const n = this.noiseSrc(when, 0.02);
          const g2 = gain();
          this.env(g2, when, 0.3, 0.001, 0.012);
          n.connect(g2).connect(dest);
        }
        break;
      }
      default:
    }
  }
}

export const adofaiAudio = new AdofaiAudio();
