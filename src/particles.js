// ============================================================
// PARTICLES AND TIERS — the effects lighter when the frames can't keep up (no DOM)
// ============================================================
// Every effect made of particles (the warp from the home screen into a game, the effects drifting
// over the home screen, the bits and sparks off the board, the pause menu's sparkles) makes as
// many as it asks for while the frames keep up, and fewer when they lag. main.js says how long
// each frame took (noteFrame); while they're slow, two or more in a row, the share of particles
// goes down, a little more with each slow frame (the slower, the more); once they keep up again,
// it comes back up, slowly (CONFIG.fx.particles). Slow is slow for this device: a screen that only
// ever goes at 30 frames a second isn't forever behind.
//
// Each effect makes the share of them it would have (particleBudget), or asks whether to make each
// one (keepParticle), and gives each one it makes a lot (particleLot); those already going live
// only while their lot is under the share (alive), so as it goes down, they thin out with it.
//
// That's quick, frame by frame. Slower, and steadier, the whole look comes in tiers
// (CONFIG.fx.quality: from the lightest to the fullest): fewer particles at most, the warm
// rainbow's split and the glows, how many pixels the boards and the home screen are drawn at,
// and the page's own effects (index.html .fx-low, .fx-medium, .fx-high). It starts on the tier
// this device settled on last time, or else a guess from the device; once the game is up
// (fxTierReady), a good share of slow frames over the last second or so takes it down one, and a
// good while with hardly any brings it up one; a rise that doesn't hold makes the next one wait
// longer, so it doesn't go up and down and up.

import { CONFIG } from "../config.js";
import { store } from "./util.js";

const P = () => CONFIG.fx?.particles ?? {};
const Q = () => CONFIG.fx?.quality ?? {};
const FULL = { name: "high", particles: 1, split: 5, glow: true };
const tiers = () => (Q().tiers?.length ? Q().tiers : [FULL]);
let share = 1, last = 0, best = Infinity, seen = 0;

// The tier (an index into the tiers, the lightest 0; null: not chosen yet), and whether it's held
// at one (`forced`: ?quality=, or the developer tools); whether the frames count towards it yet
// (fxTierReady); and what they've been like: ms of them counted (clock), when it last changed,
// and the share of them slow, over the last second or so (soon) and the last few (long); how long
// it's been steady (ms), how long it waits to go up (ms), and whether a rise has yet to hold.
let tier = null, forced = null, ready = false, clock = 0, changedAt = -Infinity, roseAt = -Infinity;
let soon = 0, long = 0, steadyFor = 0, upWait = 0, trying = false;
const listeners = new Set();

// How long the frame took (ms since the one before): every frame, from main.js.
export function noteFrame(ms) {
  const c = P();
  // (a long gap is the page hidden, or the browser busy with something else: not a frame)
  if (!(ms > 0) || ms > (c.gapMs ?? 1000)) return;
  // (this frame and the one before: slow only if both were, so one hiccup on its own doesn't
  // count; and the quickest this device goes, once the first few frames have settled, by the
  // slower of them, so one quick one on its own doesn't either; until then, nothing is slow)
  const both = Math.min(ms, last), steady = Math.max(ms, last);
  last = ms;
  if (++seen > 8) best = Math.min(best, steady);
  const slow = Math.max(c.slowMs ?? 25, best * (c.behind ?? 1.5));
  if (both > slow) share = Math.max(c.least ?? 0.15, share * slow / both);
  else share = Math.min(1, share + (c.recover ?? 0.3) * ms / 1000);
  noteTier(ms, ms > slow);
}

// The share of particles the frames allow, now (CONFIG.fx.particles.least to 1).
export function particleShare() { return share; }

// How many of the particles the effects ask for are made at all, whatever the frames
// (CONFIG.fx.particles.amount: half, to keep it light).
export function particleAmount() { return P().amount ?? 1; }

// The share of particles to make, now: the frames' share, and no more than the tier's.
export function particleBudget() { return Math.min(share, fxTier().particles ?? 1); }

// Whether to make this one, of a lot made one at a time: the share of them, on average.
export function keepParticle() { const s = particleBudget(); return s >= 1 || Math.random() < s; }

// The lot for a particle made now (at random, under the share): it lives as long as the share
// stays above it.
export function particleLot() { return Math.random() * particleBudget(); }

// Whether a particle already going is still to be: its lot still under the share, so as the share
// goes down, about that many fewer of them (one without a lot always is). Those that aren't, the
// effect drops, so none come back as it comes back up.
export function alive(p) { return !(p.lot >= particleBudget()); }

// (back to the start, all of them and nothing measured yet: for the tests)
export function resetParticles() { share = 1; last = 0; best = Infinity; seen = 0; }

/* =========================
   The tiers
   ========================= */

// The tier now: { name, particles, split, glow, ... } (CONFIG.fx.quality.tiers)
export function fxTier() {
  if (tier == null) tier = startTier();
  const list = tiers();
  return list[Math.max(0, Math.min(list.length - 1, tier))];
}

// For the developer tools: the tier, whether it's held there, and how the frames are doing.
export function fxTierInfo() {
  const t = fxTier();
  return { name: t.name, level: tier, forced: forced != null, counting: ready, slow: soon, slowLong: long, upInMs: Math.max(0, upWait - steadyFor), best: Number.isFinite(best) ? best : null };
}

// Called with the tier whenever it changes (and once now).
export function onFxTier(fn) { listeners.add(fn); fn(fxTier()); return () => listeners.delete(fn); }

// The frames count towards the tier from now on (the page is up: the loading screen's own work,
// warming the home screen's boards, would make any device look slow).
export function fxTierReady() {
  if (ready) return;
  ready = true;
  fxTier();
  changedAt = -Infinity; // (the first step down can come straight away: a quick look at the device)
  upWait = Q().up?.afterMs ?? 5000;
}

// Hold it at a tier (by name), or let it go by the frames again (null).
export function forceFxTier(name) {
  const i = tiers().findIndex(t => t.name === name);
  forced = i >= 0 ? i : null;
  if (forced != null) setTier(forced, false);
}

// (back to the start for the tests: the fullest tier, nothing counted, not counting)
export function resetFxTier({ start = tiers().length - 1 } = {}) {
  tier = start; forced = null; ready = false; clock = 0; changedAt = -Infinity; roseAt = -Infinity;
  soon = 0; long = 0; steadyFor = 0; upWait = 0; trying = false;
}

function setTier(i, remember = true) {
  i = Math.max(0, Math.min(tiers().length - 1, i));
  const was = tier;
  tier = i;
  changedAt = clock;
  if (remember && Q().remember) store.set(Q().remember, tiers()[i].name);
  if (was !== i) for (const fn of listeners) fn(tiers()[i]);
}

// Where it starts: held at one (?quality=low, say); or the one this device settled on last time;
// or else a guess from the device (the first of CONFIG.fx.quality.start it has no more cores, or
// memory, than); or the fullest. (Not in the browser: the fullest.)
function startTier() {
  const list = tiers(), top = list.length - 1, at = (name) => list.findIndex(t => t.name === name);
  if (!globalThis.document) return top;
  let asked = null;
  try { asked = new URLSearchParams(globalThis.location?.search ?? "").get("quality"); } catch { asked = null; }
  if (asked && at(asked) >= 0) { forced = at(asked); return forced; }
  const kept = Q().remember ? store.get(Q().remember) : null;
  if (kept && at(kept) >= 0) return at(kept);
  const nav = globalThis.navigator ?? {}, cores = nav.hardwareConcurrency ?? Infinity, mem = nav.deviceMemory ?? Infinity;
  for (const s of Q().start ?? []) if ((cores <= (s.cores ?? 0) || mem <= (s.memoryGB ?? 0)) && at(s.tier) >= 0) return at(s.tier);
  return top;
}

// Each frame, once the frames count: the shares of them slow, soon and long (each frame counting
// for its time, but no more than down.capMs, so one long hitch is one frame, not a slow second);
// down a tier when too many have been slow lately, up one after a long enough while with hardly
// any slow, and the wait for that longer each time a rise hasn't held.
function noteTier(ms, slow) {
  if (!ready) return;
  const q = Q(), d = q.down ?? {}, u = q.up ?? {};
  const w = Math.min(ms, d.capMs ?? 100) / 1000, s = slow ? 1 : 0;
  clock += ms;
  soon += (s - soon) * (1 - Math.exp(-w / (d.overSec ?? 1)));
  long += (s - long) * (1 - Math.exp(-w / (u.overSec ?? 3)));
  if (trying && clock - roseAt > (u.failWithinMs ?? 10000)) { trying = false; upWait = Math.max(u.afterMs ?? 5000, upWait / 2); } // (it held)
  if (forced != null) return;
  if (soon > (d.slowShare ?? 0.25) && tier > 0 && clock - changedAt >= (d.holdMs ?? 1500)) {
    if (trying) { trying = false; upWait = Math.min(u.maxMs ?? 60000, upWait * 2); } // (a rise that didn't hold)
    steadyFor = 0;
    setTier(tier - 1);
    return;
  }
  steadyFor = long < (u.slowShare ?? 0.04) ? steadyFor + ms : 0;
  if (tier < tiers().length - 1 && steadyFor >= upWait && clock - changedAt >= upWait) {
    steadyFor = 0;
    roseAt = clock;
    trying = true;
    setTier(tier + 1);
  }
}
