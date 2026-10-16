import { getPrefs } from './prefs.js';

// All sound is synthesised with the Web Audio API. There are no audio files.
// Nothing starts until the first user gesture, and the Sound setting is always respected.

const MAX_MASTER = 0.4; // keeps everything quiet even at 100%
let ctx = null;
let master = null;
let fxIn = null;
let gestured = false;

function masterLevel() {
  const p = getPrefs();
  return p.soundOn ? (p.volume / 100) * MAX_MASTER : 0;
}

function ensureContext() {
  if (!gestured) return null;
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = masterLevel();
    master.connect(ctx.destination);
    // A soft echo gives chimes a little space.
    fxIn = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.21;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2400;
    fxIn.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Call from a click or key handler. Safe to call many times. */
export function unlockAudio() {
  gestured = true;
  return ensureContext();
}

export function initSound() {
  const onGesture = () => {
    gestured = true;
    ensureContext();
  };
  for (const type of ['pointerdown', 'keydown', 'touchstart']) {
    document.addEventListener(type, onGesture, { once: true, passive: true });
  }
  document.addEventListener('prefschange', () => {
    if (master && ctx) master.gain.setTargetAtTime(masterLevel(), ctx.currentTime, 0.05);
    if (!getPrefs().soundOn) stopAmbient();
  });
  // A tiny tick whenever a switch is toggled.
  document.addEventListener('change', (event) => {
    if (event.target instanceof Element && event.target.matches('input.switch')) play('tick');
  });
}

function tone(c, { freq, start = 0, dur = 0.6, type = 'sine', gain = 0.3, attack = 0.012, sweepTo = null, lowpass = null, wet = 0.4 }) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let out = osc;
  if (lowpass) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    osc.connect(f);
    out = f;
  }
  out.connect(g);
  g.connect(master);
  if (wet > 0) {
    const w = c.createGain();
    w.gain.value = wet;
    g.connect(w);
    w.connect(fxIn);
  }
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const SOUNDS = {
  // Gentle chime for a completed task.
  chime: (c) => [784, 988, 1175].forEach((freq, i) => tone(c, { freq, start: i * 0.1, dur: 1.1, gain: 0.22 })),
  // A little rising phrase when everything is done.
  chimeAll: (c) => [523, 659, 784, 988, 1319].forEach((freq, i) => tone(c, { freq, start: i * 0.12, dur: 1.5, gain: 0.2 })),
  // Warm low tone for a saved mood.
  warm: (c) => {
    tone(c, { freq: 261.6, dur: 1.6, gain: 0.3, attack: 0.1, lowpass: 900 });
    tone(c, { freq: 392, dur: 1.6, gain: 0.16, attack: 0.14, type: 'triangle', lowpass: 800 });
  },
  // Soft pop for an incoming chat message.
  pop: (c) => tone(c, { freq: 540, sweepTo: 280, dur: 0.11, gain: 0.22, attack: 0.004, wet: 0.1 }),
  // Tiny tick for toggles.
  tick: (c) => tone(c, { freq: 1500, sweepTo: 1100, dur: 0.035, gain: 0.1, attack: 0.002, wet: 0 }),
  // A soft bell marking a guidance step.
  step: (c) => {
    tone(c, { freq: 660, dur: 2, gain: 0.16, attack: 0.02 });
    tone(c, { freq: 1320, dur: 1.2, gain: 0.04, attack: 0.02 });
  },
};

/** Plays a named UI sound. Returns true if it was started. */
export function play(name) {
  if (!getPrefs().soundOn) return false;
  const c = ensureContext();
  if (!c || !SOUNDS[name]) return false;
  try {
    SOUNDS[name](c);
    return true;
  } catch {
    return false;
  }
}

/* ---------- Meditation soundscapes ---------- */

let ambient = null;

function noiseSource(c) {
  const len = c.sampleRate * 3;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

function lfo(c, rate, depth, target) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = rate;
  g.gain.value = depth;
  o.connect(g);
  g.connect(target);
  o.start();
  return o;
}

const BUILDERS = {
  // Warm slow pad: stacked soft oscillators through a low-pass, slowly swelling.
  drone(c, out, own) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    lp.connect(out);
    const swell = c.createGain();
    swell.gain.value = 0.7;
    swell.connect(lp);
    own.push(lfo(c, 0.06, 0.25, swell.gain), lfo(c, 0.04, 120, lp.frequency));
    for (const [freq, type, g] of [[110, 'sine', 0.5], [164.8, 'sine', 0.3], [220.4, 'triangle', 0.2], [329.4, 'sine', 0.08]]) {
      const o = c.createOscillator();
      const og = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      og.gain.value = g;
      o.connect(og);
      og.connect(swell);
      o.start();
      own.push(o);
    }
  },
  // Soft singing bowls struck now and then.
  bowls(c, out, own, timers) {
    const notes = [220, 261.6, 329.6, 392, 440];
    const strike = () => {
      const f = notes[Math.floor(Math.random() * notes.length)];
      const t0 = c.currentTime;
      [[1, 0.5, 9], [2.76, 0.18, 6], [5.4, 0.06, 3.5]].forEach(([mult, gain, dur]) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.value = f * mult;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(gain, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g);
        g.connect(out);
        o.start(t0);
        o.stop(t0 + dur + 0.1);
      });
    };
    strike();
    const schedule = () => {
      timers.push(
        globalThis.setTimeout(() => {
          if (ambient) {
            strike();
            schedule();
          }
        }, 5000 + Math.random() * 4000),
      );
    };
    schedule();
  },
  // Rain-like hiss: filtered noise.
  rain(c, out, own) {
    const n = noiseSource(c);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 700;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5500;
    const g = c.createGain();
    g.gain.value = 0.32;
    n.connect(hp);
    hp.connect(lp);
    lp.connect(g);
    g.connect(out);
    own.push(lfo(c, 0.13, 0.04, g.gain));
    n.start();
    own.push(n);
  },
  // Ocean swell: low-passed noise whose level and brightness rise and fall slowly.
  ocean(c, out, own) {
    const n = noiseSource(c);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 650;
    const swell = c.createGain();
    swell.gain.value = 0.45;
    n.connect(lp);
    lp.connect(swell);
    swell.connect(out);
    own.push(lfo(c, 0.085, 0.35, swell.gain), lfo(c, 0.085, 380, lp.frequency));
    n.start();
    own.push(n);
  },
};

/**
 * Starts a soundscape (needs a prior user gesture and Sound on). Returns true on success.
 * The scene begins silent; drive it with setAmbientLevel(0..1).
 */
export function startAmbient(kind) {
  stopAmbient(true);
  if (!BUILDERS[kind] || !getPrefs().soundOn) return false;
  const c = ensureContext();
  if (!c) return false;
  const bus = c.createGain();
  bus.gain.value = 0;
  bus.connect(master);
  const own = [];
  const timers = [];
  ambient = { bus, own, timers, kind };
  try {
    BUILDERS[kind](c, bus, own, timers);
  } catch {
    stopAmbient(true);
    return false;
  }
  return true;
}

export function setAmbientLevel(level) {
  if (!ambient || !ctx) return;
  const v = Math.max(0, Math.min(1, level));
  ambient.bus.gain.setTargetAtTime(v, ctx.currentTime, 0.4);
}

export function isAmbientPlaying() {
  return ambient !== null;
}

/** Fades out and disconnects everything. */
export function stopAmbient(immediate = false) {
  if (!ambient || !ctx) {
    ambient = null;
    return;
  }
  const { bus, own, timers } = ambient;
  ambient = null;
  timers.forEach((t) => globalThis.clearTimeout(t));
  const c = ctx;
  const secs = immediate ? 0.05 : 1.2;
  bus.gain.cancelScheduledValues(c.currentTime);
  bus.gain.setTargetAtTime(0, c.currentTime, secs / 4);
  globalThis.setTimeout(() => {
    for (const node of own) {
      try {
        node.stop();
      } catch {
        // already stopped
      }
    }
    try {
      bus.disconnect();
    } catch {
      // ignore
    }
  }, secs * 1000 + 100);
}
