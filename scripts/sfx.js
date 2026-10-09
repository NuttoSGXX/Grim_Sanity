// Grim Sanity: sound effects, made with the Web Audio API at the moment they play.
// No audio files ship with the module. Every sound is a short recipe of noise and tones,
// written against a plain BaseAudioContext so it can also be rendered offline for testing.

let noiseBuf = null;
function noise(ctx) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (noiseBuf = b);
}

/** A gain node shaped as attack / hold / release, wired to `out`. */
function env(ctx, out, t, { a = 0.005, h = 0, r = 0.2, peak = 1 }) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.setValueAtTime(Math.max(0.0002, peak), t + a + h);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + h + r);
  g.connect(out);
  return g;
}

function tone(ctx, out, t, { f = 440, f2 = null, type = "sine", detune = 0, ...e }) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  const len = (e.a ?? 0.005) + (e.h ?? 0) + (e.r ?? 0.2);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len);
  o.connect(env(ctx, out, t, e)); o.start(t); o.stop(t + len + 0.05);
}

function hiss(ctx, out, t, { filter = "bandpass", f = 1000, f2 = null, q = 1, ...e }) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx); s.loop = true;
  const len = (e.a ?? 0.005) + (e.h ?? 0) + (e.r ?? 0.2);
  const bi = ctx.createBiquadFilter(); bi.type = filter; bi.frequency.setValueAtTime(f, t); bi.Q.value = q;
  if (f2) bi.frequency.exponentialRampToValueAtTime(f2, t + len);
  s.connect(bi); bi.connect(env(ctx, out, t, e)); s.start(t, Math.random()); s.stop(t + len + 0.05);
}

/** name -> (ctx, out, t). Each recipe schedules its nodes starting at time t. */
export const SOUNDS = {
  // the screen darkens: a low swell and a far boom
  open(ctx, out, t) {
    tone(ctx, out, t, { f: 46, f2: 38, a: 0.6, h: 0.5, r: 1.6, peak: 0.36 });
    tone(ctx, out, t, { f: 69, f2: 58, type: "triangle", a: 0.8, h: 0.3, r: 1.5, peak: 0.16 });
    hiss(ctx, out, t, { filter: "lowpass", f: 180, f2: 700, a: 0.9, h: 0.1, r: 1.3, peak: 0.2 });
    tone(ctx, out, t + 0.95, { f: 90, f2: 30, a: 0.01, r: 1.3, peak: 0.42 });
  },
  // the card turns over
  card(ctx, out, t) {
    hiss(ctx, out, t, { f: 500, f2: 3200, q: 0.8, a: 0.12, r: 0.3, peak: 0.3 });
    tone(ctx, out, t + 0.3, { f: 196, type: "triangle", a: 0.01, r: 0.9, peak: 0.16 });
    tone(ctx, out, t + 0.3, { f: 277, type: "triangle", a: 0.01, r: 0.9, peak: 0.1 });
  },
  // bone dice rattling, then settling
  roll(ctx, out, t) {
    for (let i = 0; i < 11; i++) {
      const at = t + i * 0.085 + Math.random() * 0.03, soft = 1 - i / 14;
      hiss(ctx, out, at, { filter: "bandpass", f: 1800 + Math.random() * 1800, q: 3, a: 0.002, r: 0.045, peak: 0.42 * soft });
      tone(ctx, out, at, { f: 520 + Math.random() * 380, type: "triangle", a: 0.002, r: 0.04, peak: 0.12 * soft });
    }
    tone(ctx, out, t + 1.0, { f: 150, f2: 80, a: 0.004, r: 0.18, peak: 0.3 });
  },
  // the Trauma Dice: heavier, with something wrong underneath
  trauma(ctx, out, t) {
    for (let i = 0; i < 9; i++) {
      const at = t + i * 0.11 + Math.random() * 0.03;
      hiss(ctx, out, at, { filter: "bandpass", f: 500 + Math.random() * 500, q: 2.5, a: 0.003, r: 0.07, peak: 0.45 * (1 - i / 12) });
    }
    tone(ctx, out, t, { f: 55, a: 0.3, h: 0.6, r: 0.8, peak: 0.34 });
    tone(ctx, out, t, { f: 58.3, a: 0.3, h: 0.6, r: 0.8, peak: 0.26 });
    tone(ctx, out, t + 1.05, { f: 110, f2: 36, a: 0.005, r: 0.9, peak: 0.6 });
  },
  // a pair won: a small clear bell
  win(ctx, out, t) {
    tone(ctx, out, t, { f: 1318, a: 0.004, r: 0.7, peak: 0.2 });
    tone(ctx, out, t, { f: 1976, a: 0.004, r: 0.5, peak: 0.1 });
    tone(ctx, out, t + 0.06, { f: 2637, a: 0.004, r: 0.4, peak: 0.06 });
  },
  // a pair lost: the die cracks
  crack(ctx, out, t) {
    hiss(ctx, out, t, { filter: "highpass", f: 2400, a: 0.001, r: 0.09, peak: 0.36 });
    hiss(ctx, out, t + 0.03, { filter: "bandpass", f: 900, q: 1.2, a: 0.002, r: 0.22, peak: 0.34 });
    tone(ctx, out, t, { f: 170, f2: 48, a: 0.003, r: 0.34, peak: 0.34 });
    for (let i = 0; i < 4; i++) hiss(ctx, out, t + 0.1 + i * 0.05 + Math.random() * 0.03, { filter: "bandpass", f: 3000 + Math.random() * 2500, q: 6, a: 0.001, r: 0.03, peak: 0.16 });
  },
  // every pair won
  unshaken(ctx, out, t) {
    [523, 659, 784, 1047].forEach((f, i) => tone(ctx, out, t + i * 0.09, { f, type: "triangle", a: 0.01, r: 1.1, peak: 0.15 }));
    hiss(ctx, out, t, { filter: "highpass", f: 5000, a: 0.3, r: 1.1, peak: 0.04 });
  },
  // three pairs lost
  broken(ctx, out, t) {
    tone(ctx, out, t, { f: 82, f2: 34, a: 0.005, r: 1.4, peak: 0.65 });
    tone(ctx, out, t, { f: 87, f2: 37, type: "sawtooth", a: 0.01, r: 1.0, peak: 0.1 });
    hiss(ctx, out, t, { filter: "lowpass", f: 900, f2: 120, a: 0.005, r: 1.0, peak: 0.3 });
  },
  // the last die goes: a rising, detuned swell with whispering on top
  unhinged(ctx, out, t) {
    [0, 14, -19, 33].forEach((detune, i) => tone(ctx, out, t, { f: 110 * (i < 2 ? 1 : 2), f2: 220 * (i < 2 ? 1 : 2), type: "sawtooth", detune, a: 1.1, h: 0.1, r: 0.9, peak: 0.07 }));
    for (let i = 0; i < 7; i++) hiss(ctx, out, t + 0.2 + i * 0.22, { f: 1500 + Math.random() * 2500, q: 5, a: 0.08, r: 0.16, peak: 0.13 });
    tone(ctx, out, t + 1.25, { f: 62, f2: 28, a: 0.005, r: 1.5, peak: 0.6 });
  },
  // a madness takes hold: a sour cluster
  madness(ctx, out, t) {
    [233, 247, 311, 329].forEach((f, i) => tone(ctx, out, t + i * 0.04, { f, type: "triangle", a: 0.2, h: 0.5, r: 1.6, peak: 0.1 }));
    tone(ctx, out, t, { f: 49, a: 0.2, h: 0.6, r: 1.5, peak: 0.4 });
    hiss(ctx, out, t, { f: 2600, f2: 700, q: 4, a: 0.3, h: 0.2, r: 1.4, peak: 0.08 });
  },
  // the Light rerolls a die
  shine(ctx, out, t) {
    [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(ctx, out, t + i * 0.055, { f, a: 0.005, r: 0.8, peak: 0.12 }));
    hiss(ctx, out, t, { filter: "highpass", f: 6000, a: 0.02, r: 0.9, peak: 0.05 });
  },
  // the Light grants a boon
  boon(ctx, out, t) {
    [261.6, 329.6, 392, 523.3].forEach((f) => tone(ctx, out, t, { f, type: "triangle", a: 0.5, h: 0.7, r: 2.2, peak: 0.1 }));
    [1047, 1319, 1568].forEach((f, i) => tone(ctx, out, t + 0.5 + i * 0.16, { f, a: 0.005, r: 1.2, peak: 0.08 }));
  },
  // results are sealed
  seal(ctx, out, t) {
    tone(ctx, out, t, { f: 98, f2: 49, a: 0.005, r: 0.9, peak: 0.5 });
    hiss(ctx, out, t, { filter: "bandpass", f: 300, q: 1, a: 0.005, r: 0.5, peak: 0.24 });
  }
};

let live = null, master = null;
/** Play a sound by name. `volume` is 0..1. Safe to call before any user gesture: it just stays silent. */
export function play(name, volume = 0.7) {
  const recipe = SOUNDS[name]; if (!recipe || !(volume > 0)) return;
  try {
    const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext; if (!AC) return;
    if (!live) {
      live = new AC();
      const comp = live.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;   // keeps stacked sounds from clipping
      master = live.createGain(); master.connect(comp); comp.connect(live.destination);
    }
    if (live.state === "suspended") live.resume().catch(() => {});
    master.gain.value = Math.min(1, volume);
    recipe(live, master, live.currentTime + 0.02);
  } catch (e) { /* sound is never worth breaking the game for */ }
}
