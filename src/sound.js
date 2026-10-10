// ============================================================
// SOUND — tiny synthesised retro sound effects (WebAudio, no files)
// ============================================================

import { store } from "./util.js";

const PREF_KEY = "extris.sound";

export function createSound(cfg) {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let enabled = store.get(PREF_KEY, cfg.enabled ? "on" : "off") === "on";

  function ensure() {
    if (ctx) return ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = cfg.volume ?? 0.45;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(ctx.destination);

    // one second of white noise, reused by every noisy effect
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  // Browsers only allow audio after a user gesture: call this from input handlers.
  function unlock() {
    if (!enabled) return;
    const c = ensure();
    if (c && c.state === "suspended") c.resume().catch(() => {});
  }

  function tone({ freq = 440, to = null, type = "square", dur = 0.08, vol = 0.2, delay = 0, attack = 0.003, filter = null }) {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filter;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.2, vol = 0.2, delay = 0, type = "lowpass", from = 3000, to = 200, q = 0.8 }) {
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5]; // C major-ish

  const SFX = {
    move() { if (cfg.moveClicks) tone({ freq: 210, dur: 0.025, vol: 0.035, type: "square", filter: 1800 }); },
    rotate() { if (cfg.moveClicks) tone({ freq: 480, to: 640, dur: 0.045, vol: 0.05, type: "triangle" }); },
    lock() {
      tone({ freq: 150, to: 60, dur: 0.11, vol: 0.22, type: "sine" });
      noise({ dur: 0.04, vol: 0.05, from: 2500, to: 600 });
    },
    clear(n = 1) {
      const count = Math.min(6, Math.max(1, n)) + 1;
      for (let i = 0; i < count; i++) {
        tone({ freq: NOTES[i], dur: 0.12, vol: 0.12, type: "square", delay: i * 0.055, filter: 3500 });
      }
      noise({ dur: 0.25, vol: 0.06, type: "highpass", from: 3000, to: 6000 });
    },
    powerupSpawn() {
      [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone({ freq: f, dur: 0.07, vol: 0.05, type: "triangle", delay: i * 0.045 }));
    },
    charge(ms = 260) {
      const dur = ms / 1000;
      tone({ freq: 160, to: 900, dur, vol: 0.09, type: "sawtooth", filter: 1400, attack: 0.02 });
    },
    destroyer() {
      noise({ dur: 0.45, vol: 0.32, from: 3200, to: 120 });
      tone({ freq: 110, to: 38, dur: 0.4, vol: 0.28, type: "sine" });
    },
    gravity() {
      noise({ dur: 0.38, vol: 0.18, type: "bandpass", from: 1600, to: 180, q: 1.4 });
      tone({ freq: 320, to: 70, dur: 0.34, vol: 0.1, type: "triangle" });
    },
    expander() {
      for (let i = 0; i < 6; i++) {
        tone({ freq: 300 + Math.random() * 500, to: 700 + Math.random() * 600, dur: 0.06, vol: 0.07, type: "sine", delay: i * 0.04 });
      }
    },
    levelUp() {
      [659.25, 880, 1318.5].forEach((f, i) => tone({ freq: f, dur: 0.09, vol: 0.07, type: "square", delay: i * 0.06, filter: 3000 }));
    },
    achievement() {
      [783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => {
        tone({ freq: f, dur: 0.16, vol: 0.09, type: "square", delay: i * 0.08, filter: 3200 });
        tone({ freq: f / 2, dur: 0.16, vol: 0.05, type: "triangle", delay: i * 0.08 });
      });
    },
    // the end game starts: a two-tone alarm, falling
    endGame() {
      [0, 0.22, 0.44].forEach((d, i) => {
        tone({ freq: 740 - i * 60, to: 520 - i * 60, dur: 0.18, vol: 0.09, type: "sawtooth", delay: d, filter: 2200 });
      });
      tone({ freq: 90, to: 55, dur: 0.7, vol: 0.12, type: "sine" });
    },
    // ...and is escaped: up and away
    endGameEscape() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone({ freq: f, dur: 0.1, vol: 0.08, type: "square", delay: i * 0.05, filter: 3500 }));
    },
        gameOver() {
      [392, 329.63, 261.63, 196].forEach((f, i) => tone({ freq: f, to: f * 0.97, dur: 0.22, vol: 0.12, type: "square", delay: i * 0.18, filter: 1600 }));
    },
  };

  function play(name, ...args) {
    if (!enabled) return;
    const c = ensure();
    if (!c || c.state !== "running") return;
    try { SFX[name]?.(...args); } catch { /* audio is best-effort */ }
  }

  return {
    play,
    unlock,
    isEnabled: () => enabled,
    setEnabled(on) {
      enabled = !!on;
      store.set(PREF_KEY, enabled ? "on" : "off");
      if (enabled) unlock();
    },
  };
}
