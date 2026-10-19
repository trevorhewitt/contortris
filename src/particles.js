// ============================================================
// PARTICLES — fewer of them when the frames can't keep up (no DOM)
// ============================================================
// Every effect made of particles (the warp from the home screen into a game, the effects drifting
// over the home screen, the bits and sparks off the board, the pause menu's sparkles) makes as
// many as it asks for while the frames keep up, and fewer when they lag. main.js says how long
// each frame took (noteFrame); while they're slow, two or more in a row, the share of particles
// goes down, a little more with each slow frame (the slower, the more); once they keep up again,
// it comes back up, slowly (CONFIG.fx.particles). Slow is slow for this device: a screen that only
// ever goes at 30 frames a second isn't forever behind.
//
// Each effect makes the share of them it would have (particleShare), or asks whether to make each
// one (keepParticle), and gives each one it makes a lot (particleLot); those already going live
// only while their lot is under the share (alive), so as it goes down, they thin out with it.

import { CONFIG } from "../config.js";

const P = () => CONFIG.fx?.particles ?? {};
let share = 1, last = 0, best = Infinity, seen = 0;

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
}

// The share of particles to make, now (CONFIG.fx.particles.least to 1).
export function particleShare() { return share; }

// Whether to make this one, of a lot made one at a time: the share of them, on average.
export function keepParticle() { return share >= 1 || Math.random() < share; }

// The lot for a particle made now (at random, under the share): it lives as long as the share
// stays above it.
export function particleLot() { return Math.random() * share; }

// Whether a particle already going is still to be: its lot still under the share, so as the share
// goes down, about that many fewer of them (one without a lot always is). Those that aren't, the
// effect drops, so none come back as it comes back up.
export function alive(p) { return !(p.lot >= share); }

// (back to the start, all of them and nothing measured yet: for the tests)
export function resetParticles() { share = 1; last = 0; best = Infinity; seen = 0; }
