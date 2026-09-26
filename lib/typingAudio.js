// Procedural Web Audio API sound synthesizer for typing game
let audioCtx = null;
let isMutedState = false;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isMuted() {
  if (typeof window === "undefined") return false;
  return isMutedState || localStorage.getItem("typing_sound_muted") === "true";
}

export function toggleMute() {
  if (typeof window === "undefined") return false;
  const current = isMuted();
  const next = !current;
  isMutedState = next;
  localStorage.setItem("typing_sound_muted", String(next));
  return next;
}

/**
 * Mechanical keyboard click simulation
 * Combines a bandpassed noise transient burst with an acoustic housing resonance ping
 */
export function playKeyClick() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Noise burst (tactile click contact)
  const bufferSize = Math.floor(ctx.sampleRate * 0.007); // ~7ms
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  // Random jitter between 2400Hz and 3600Hz for organic variation
  noiseFilter.frequency.setValueAtTime(2800 + (Math.random() - 0.5) * 800, now);
  noiseFilter.Q.setValueAtTime(3.5, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.28, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

  whiteNoise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  whiteNoise.start(now);
  whiteNoise.stop(now + 0.015);

  // 2. Body resonance (keycap & spring thud)
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();

  const baseFreq = 580 + (Math.random() - 0.5) * 120;
  osc.type = "triangle";
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.035);

  oscGain.gain.setValueAtTime(0.18, now);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.04);
}

/**
 * Dull error sound for typo
 */
export function playErrorSound() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.09);
}

/**
 * Countdown beeps
 * @param {boolean} isGo - True if it's the final 'GO!' signal
 */
export function playCountdownBeep(isGo = false) {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  if (isGo) {
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046.5, now); // C6
    osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.15); // E6
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  } else {
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now); // C5
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }
}

/**
 * Victory fanfare chord progression when race is finished
 */
export function playVictoryFanfare() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [
    { freq: 523.25, time: 0.0, dur: 0.12 },  // C5
    { freq: 659.25, time: 0.1, dur: 0.12 },  // E5
    { freq: 783.99, time: 0.2, dur: 0.14 },  // G5
    { freq: 1046.5, time: 0.32, dur: 0.45 }, // C6
  ];

  const now = ctx.currentTime;
  notes.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0, now + time);
    gain.gain.linearRampToValueAtTime(0.3, now + time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur + 0.02);
  });
}

/**
 * Fighting Sound: Swift Jab / Punch hit
 */
export function playPunchHit() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.09);
}

/**
 * Fighting Sound: Heavy Smash / Crushing impact
 */
export function playHeavyHit() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Low sub boom
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

  gain.gain.setValueAtTime(0.6, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.26);

  // 2. Mid crunch noise
  const bufferSize = Math.floor(ctx.sampleRate * 0.04);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.4, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  noise.connect(nGain);
  nGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.06);
}

/**
 * Fighting Sound: Shield Guard / Metallic Parry
 */
export function playBlockSound() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(1600, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.16);
}

/**
 * Fighting Sound: Focus & Heal chime
 */
export function playHealSound() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = now + idx * 0.06;

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  });
}

/**
 * Fighting Sound: Ultimate Dragon Blast Explosion
 */
export function playUltimateSound() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Rising charge siren
  const riseOsc = ctx.createOscillator();
  const riseGain = ctx.createGain();
  riseOsc.type = "sawtooth";
  riseOsc.frequency.setValueAtTime(200, now);
  riseOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

  riseGain.gain.setValueAtTime(0.15, now);
  riseGain.gain.linearRampToValueAtTime(0.4, now + 0.3);
  riseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

  riseOsc.connect(riseGain);
  riseGain.connect(ctx.destination);
  riseOsc.start(now);
  riseOsc.stop(now + 0.75);

  // Massive explosion boom at 0.3s
  const boomOsc = ctx.createOscillator();
  const boomGain = ctx.createGain();
  boomOsc.type = "triangle";
  boomOsc.frequency.setValueAtTime(120, now + 0.3);
  boomOsc.frequency.exponentialRampToValueAtTime(25, now + 0.8);

  boomGain.gain.setValueAtTime(0.8, now + 0.3);
  boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

  boomOsc.connect(boomGain);
  boomGain.connect(ctx.destination);
  boomOsc.start(now + 0.3);
  boomOsc.stop(now + 0.9);
}

/**
 * Fighting Sound: Classic K.O. gong & fanfare
 */
export function playKoSound() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.9);

  gain.gain.setValueAtTime(0.65, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 1.0);
}
