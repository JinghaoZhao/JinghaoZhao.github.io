/**
 * Zero-Asset Procedural Web Audio Synthesizer ("The Devil's Plan: Dead Again")
 * Lazy AudioContext initialization on first user gesture.
 */

const MUTE_KEY = 'dp3_sfx_muted';
const AMB_KEY = 'dp3_sfx_ambience';

let ctx = null;
let muted = false;
let ambienceOn = false;
let ambienceNodes = null;

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
  ambienceOn = localStorage.getItem(AMB_KEY) === '1';
} catch (_) {}

function ensureContext() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function createNoiseBuffer(audioCtx, durationSec) {
  const length = Math.max(1, Math.floor(audioCtx.sampleRate * durationSec));
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function startAmbienceGraph() {
  if (ambienceNodes || muted) return;
  const ac = ensureContext();
  if (!ac) return;
  const now = ac.currentTime;

  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.055, now + 2.2);

  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(190, now);
  filter.Q.setValueAtTime(2.5, now);

  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.setValueAtTime(0.11, now);
  lfoGain.gain.setValueAtTime(55, now);
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const osc1 = ac.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(55, now); // A1 obsidian sub

  const osc2 = ac.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(82.41, now); // E2 fifth

  const osc3 = ac.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(110.5, now); // slightly detuned A2 tension

  const g1 = ac.createGain();
  g1.gain.value = 0.45;
  const g2 = ac.createGain();
  g2.gain.value = 0.35;
  const g3 = ac.createGain();
  g3.gain.value = 0.2;

  osc1.connect(g1).connect(filter);
  osc2.connect(g2).connect(filter);
  osc3.connect(g3).connect(filter);
  filter.connect(master).connect(ac.destination);

  osc1.start(now);
  osc2.start(now);
  osc3.start(now);
  lfo.start(now);

  ambienceNodes = { master, osc1, osc2, osc3, lfo };
}

function stopAmbienceGraph() {
  if (!ambienceNodes || !ctx) return;
  const nodes = ambienceNodes;
  ambienceNodes = null;
  const now = ctx.currentTime;
  try {
    nodes.master.gain.cancelScheduledValues(now);
    nodes.master.gain.setTargetAtTime(0.0001, now, 0.25);
    setTimeout(() => {
      try {
        nodes.osc1.stop();
        nodes.osc2.stop();
        nodes.osc3.stop();
        nodes.lfo.stop();
        nodes.master.disconnect();
      } catch (_) {}
    }, 900);
  } catch (_) {}
}

// Auto-unlock audio on first user pointer/key gesture
if (typeof window !== 'undefined') {
  const unlock = () => {
    const ac = ensureContext();
    if (ac && ambienceOn && !muted) startAmbienceGraph();
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
}

const CUES = {
  click(ac, now) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.032);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.038);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.042);
  },

  cardFlip(ac, now) {
    const src = ac.createBufferSource();
    src.buffer = createNoiseBuffer(ac, 0.09);
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(950, now + 0.08);
    filter.Q.value = 1.6;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start(now);
  },

  tilePlace(ac, now) {
    // Low stone thud + crisp ceramic click
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.09);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    const clickOsc = ac.createOscillator();
    const clickGain = ac.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(920, now);
    clickOsc.frequency.exponentialRampToValueAtTime(300, now + 0.025);
    clickGain.gain.setValueAtTime(0.12, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    clickOsc.connect(clickGain).connect(ac.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.035);
  },

  pieceGain(ac, now) {
    // Metallic Devil's Plan brass piece chime
    const freqs = [1046.5, 1567.98, 2093.0];
    freqs.forEach((f, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      const t0 = now + idx * 0.045;
      osc.frequency.setValueAtTime(f, t0);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.12 / (idx + 1), t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.42);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.45);
    });
  },

  bid(ac, now) {
    // Crisp brass chip/gavel clink
    const osc = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(1420, now);
    osc2.frequency.setValueAtTime(2180, now);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.18);
    osc2.stop(now + 0.18);
  },

  tick(ac, now) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850, now);
    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.032);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.038);
  },

  tickUrgent(ac, now) {
    CUES.tick(ac, now);
    const sub = ac.createOscillator();
    const sg = ac.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(92, now);
    sub.frequency.exponentialRampToValueAtTime(44, now + 0.14);
    sg.gain.setValueAtTime(0.22, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    sub.connect(sg).connect(ac.destination);
    sub.start(now);
    sub.stop(now + 0.18);
  },

  reveal(ac, now) {
    const notes = [220, 329.63, 440, 659.25];
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.45);
    filter.connect(ac.destination);
    notes.forEach((f, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = i < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.95);
      osc.connect(gain).connect(filter);
      osc.start(now);
      osc.stop(now + 1.0);
    });
  },

  eliminate(ac, now) {
    // Deep crimson broadcast gong + sub drop
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now);
    filter.frequency.exponentialRampToValueAtTime(110, now + 1.4);
    filter.connect(ac.destination);

    [65.41, 66.8, 98.0, 130.81].forEach((f, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = i < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.92, now + 1.45);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(i < 2 ? 0.13 : 0.06, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.5);
      osc.connect(gain).connect(filter);
      osc.start(now);
      osc.stop(now + 1.55);
    });
  },

  victory(ac, now) {
    // Minor-to-major cinematic brass fanfare
    const chord = [261.63, 329.63, 392.0, 523.25, 659.25];
    chord.forEach((f, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const t0 = now + idx * 0.07;
      osc.type = idx < 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t0);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.09, t0 + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 1.35);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 1.4);
    });
  },

  error(ac, now) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.setValueAtTime(145, now + 0.08);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  },
};

export const SFX = {
  play(name) {
    if (muted) return;
    const fn = CUES[name];
    if (!fn) return;
    const ac = ensureContext();
    if (!ac) return;
    try {
      fn(ac, ac.currentTime);
    } catch (_) {}
  },

  isMuted() {
    return muted;
  },

  setMuted(val) {
    muted = Boolean(val);
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch (_) {}
    if (muted) {
      stopAmbienceGraph();
    } else if (ambienceOn) {
      startAmbienceGraph();
    }
  },

  toggleMute() {
    this.setMuted(!muted);
    return muted;
  },

  isAmbienceOn() {
    return ambienceOn;
  },

  setAmbience(val) {
    ambienceOn = Boolean(val);
    try {
      localStorage.setItem(AMB_KEY, ambienceOn ? '1' : '0');
    } catch (_) {}
    if (ambienceOn && !muted) {
      startAmbienceGraph();
    } else {
      stopAmbienceGraph();
    }
  },

  toggleAmbience() {
    this.setAmbience(!ambienceOn);
    return ambienceOn;
  },
};
