/**
 * Zero-Asset Procedural Web Audio Synthesizer ("The Genius: Death Match Arena")
 * Synthesizes iconic TV-broadcast tension drone + heartbeat, faceted garnet crystal clinks,
 * poker chip stacks, laser zaps, VS clash impacts, victory fanfares, and elimination gongs.
 */

const MUTE_KEY = 'tgm_sfx_muted';
const AMB_KEY = 'tgm_sfx_ambience';

let ctx = null;
let muted = false;
let ambienceOn = false;
let ambienceNodes = null;
let heartbeatTimer = null;

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

function pulseSubHeartbeat(ac) {
  if (muted || !ambienceOn) return;
  const now = ac.currentTime;
  [0, 0.22].forEach((offset, idx) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    const t0 = now + offset;
    osc.frequency.setValueAtTime(idx === 0 ? 64 : 52, t0);
    osc.frequency.exponentialRampToValueAtTime(34, t0 + 0.14);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(idx === 0 ? 0.085 : 0.055, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  });
}

function startAmbienceGraph() {
  if (ambienceNodes || muted) return;
  const ac = ensureContext();
  if (!ac) return;
  const now = ac.currentTime;

  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.048, now + 2.0);

  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(175, now);
  filter.Q.setValueAtTime(3.0, now);

  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.setValueAtTime(0.14, now);
  lfoGain.gain.setValueAtTime(60, now);
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  // Dark D-minor Death Match tension drone (D1 + A1 + F2)
  const osc1 = ac.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(73.42, now);

  const osc2 = ac.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(110.0, now);

  const osc3 = ac.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(174.61, now);

  const g1 = ac.createGain();
  g1.gain.value = 0.45;
  const g2 = ac.createGain();
  g2.gain.value = 0.35;
  const g3 = ac.createGain();
  g3.gain.value = 0.16;

  osc1.connect(g1).connect(filter);
  osc2.connect(g2).connect(filter);
  osc3.connect(g3).connect(filter);
  filter.connect(master).connect(ac.destination);

  osc1.start(now);
  osc2.start(now);
  osc3.start(now);
  lfo.start(now);

  ambienceNodes = { master, osc1, osc2, osc3, lfo };

  clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (ctx && ambienceOn && !muted) pulseSubHeartbeat(ctx);
  }, 1600);
}

function stopAmbienceGraph() {
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
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
    osc.frequency.setValueAtTime(1260, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.032);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.038);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.042);
  },

  cardFlip(ac, now) {
    const src = ac.createBufferSource();
    src.buffer = createNoiseBuffer(ac, 0.095);
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(980, now + 0.085);
    filter.Q.value = 1.7;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start(now);
  },

  tilePlace(ac, now) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.09);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    const clickOsc = ac.createOscillator();
    const clickGain = ac.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(960, now);
    clickOsc.frequency.exponentialRampToValueAtTime(320, now + 0.025);
    clickGain.gain.setValueAtTime(0.12, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    clickOsc.connect(clickGain).connect(ac.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.035);
  },

  garnetClink(ac, now) {
    // Crystalline ruby/garnet harmonic shimmer
    const freqs = [1760, 2637.02, 3520, 4186.01];
    freqs.forEach((f, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      const t0 = now + idx * 0.028;
      osc.frequency.setValueAtTime(f, t0);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.095 / (idx + 1), t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.48);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.52);
    });
  },

  pieceGain(ac, now) {
    CUES.garnetClink(ac, now);
  },

  chipStack(ac, now) {
    // Crisp ceramic casino chip cascade (3 rapid clinks)
    [0, 0.042, 0.088].forEach((offset, idx) => {
      const t0 = now + offset;
      const osc = ac.createOscillator();
      const osc2 = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(2100 + idx * 180, t0);
      osc2.frequency.setValueAtTime(3400 + idx * 240, t0);
      g.gain.setValueAtTime(0.09, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.075);
      osc.connect(g);
      osc2.connect(g);
      g.connect(ac.destination);
      osc.start(t0);
      osc2.start(t0);
      osc.stop(t0 + 0.085);
      osc2.stop(t0 + 0.085);
    });
  },

  bid(ac, now) {
    const osc = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.setValueAtTime(1480, now);
    osc2.frequency.setValueAtTime(2240, now);
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

  laserZap(ac, now) {
    // Electric cyan laser beam discharge for Laser Chess & sci-fi effects
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.value = 3.5;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1920, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.24);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(filter).connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  },

  heartbeat(ac, now) {
    [0, 0.2].forEach((offset, idx) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      const t0 = now + offset;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 78 : 62, t0);
      osc.frequency.exponentialRampToValueAtTime(36, t0 + 0.15);
      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(idx === 0 ? 0.24 : 0.16, t0 + 0.018);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
      osc.connect(g).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    });
  },

  tick(ac, now) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1920, now);
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
    sub.frequency.setValueAtTime(96, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.14);
    sg.gain.setValueAtTime(0.24, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    sub.connect(sg).connect(ac.destination);
    sub.start(now);
    sub.stop(now + 0.18);
  },

  clash(ac, now) {
    // Dramatic "DEATH MATCH" VS broadcast slam!
    const sub = ac.createOscillator();
    const sg = ac.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(135, now);
    sub.frequency.exponentialRampToValueAtTime(36, now + 0.55);
    sg.gain.setValueAtTime(0.32, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    sub.connect(sg).connect(ac.destination);
    sub.start(now);
    sub.stop(now + 0.7);

    // Metallic blade/garnet impact burst
    const src = ac.createBufferSource();
    src.buffer = createNoiseBuffer(ac, 0.32);
    const hp = ac.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(1600, now);
    hp.frequency.exponentialRampToValueAtTime(520, now + 0.28);
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.2, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    src.connect(hp).connect(ng).connect(ac.destination);
    src.start(now);

    // Dramatic D-minor fifth sting
    [146.83, 220.0, 293.66].forEach((f) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sawtooth';
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1800, now);
      lp.frequency.exponentialRampToValueAtTime(340, now + 0.9);
      osc.frequency.setValueAtTime(f, now);
      g.gain.setValueAtTime(0.07, now);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.95);
      osc.connect(lp).connect(g).connect(ac.destination);
      osc.start(now);
      osc.stop(now + 1.0);
    });
  },

  reveal(ac, now) {
    const notes = [220, 329.63, 440, 659.25];
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + 0.45);
    filter.connect(ac.destination);
    notes.forEach((f, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = i < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.16);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.95);
      osc.connect(gain).connect(filter);
      osc.start(now);
      osc.stop(now + 1.0);
    });
  },

  combo(ac, now) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      const t0 = now + idx * 0.055;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(0.1, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);
      osc.connect(g).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.35);
    });
  },

  eliminate(ac, now) {
    // Deep crimson broadcast elimination gong
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 1.6);
    filter.connect(ac.destination);

    [61.74, 63.1, 92.5, 123.47, 185.0].forEach((f, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = i < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.91, now + 1.65);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(i < 2 ? 0.13 : 0.055, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.7);
      osc.connect(gain).connect(filter);
      osc.start(now);
      osc.stop(now + 1.75);
    });
  },

  victory(ac, now) {
    // Grand Final championship brass & crystal resolution chord
    const chord = [293.66, 369.99, 440.0, 587.33, 739.99, 880.0];
    chord.forEach((f, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const t0 = now + idx * 0.065;
      osc.type = idx < 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t0);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.085, t0 + 0.055);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 1.45);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 1.5);
    });
  },

  error(ac, now) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.setValueAtTime(140, now + 0.08);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  },

  // Intuitive cue aliases for game builders
  laser(ac, now) { CUES.laserZap(ac, now); },
  tile(ac, now) { CUES.tilePlace(ac, now); },
  move(ac, now) { CUES.tilePlace(ac, now); },
  capture(ac, now) { CUES.clash(ac, now); },
  deal(ac, now) { CUES.cardFlip(ac, now); },
  flip(ac, now) { CUES.cardFlip(ac, now); },
  bet(ac, now) { CUES.bid(ac, now); },
  chip(ac, now) { CUES.chipStack(ac, now); },
  chips(ac, now) { CUES.chipStack(ac, now); },
  match(ac, now) { CUES.combo(ac, now); },
  win(ac, now) { CUES.victory(ac, now); },
  lose(ac, now) { CUES.eliminate(ac, now); },
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
