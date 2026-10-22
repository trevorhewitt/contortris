// Run with:  node --test tests/*.test.mjs
// Fewer particles when the frames lag (src/particles.js), in every effect made of them.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, hardDropAndLock } from "../src/game.js";
import { noteFrame, particleShare, particleBudget, keepParticle, particleLot, alive, resetParticles, fxTier, fxTierReady, onFxTier, forceFxTier, resetFxTier } from "../src/particles.js";

const C = CONFIG.fx.particles;
const frames = (ms, n) => { for (let i = 0; i < n; i++) noteFrame(ms); };
const near = (a, b, d) => Math.abs(a - b) <= d;

test("particles: all of them while the frames keep up, at 60 frames a second or 120", () => {
  for (const ms of [1000 / 60, 1000 / 120]) {
    resetParticles();
    frames(ms, 600);
    assert.equal(particleShare(), 1);
    assert.ok(keepParticle());
  }
});

test("particles: frames that lag cut them, the slower the more, down to the least; quick frames bring them back, slowly", () => {
  resetParticles();
  frames(1000 / 60, 120);
  // twice as slow as slowMs: down from the second slow frame, and on down to the least while it lags
  frames(2 * C.slowMs, 2);
  const early = particleShare();
  assert.ok(early < 0.9 && early > C.least, `after 2 slow frames ${early.toFixed(2)}`);
  frames(2 * C.slowMs, 40);
  assert.equal(particleShare(), C.least);
  // (how many of a lot made one at a time, now: about the least of them)
  let kept = 0;
  for (let i = 0; i < 4000; i++) kept += keepParticle();
  assert.ok(near(kept / 4000, C.least, 0.03), `${kept} of 4000 kept`);
  // a little slow, a little less cut than very slow
  resetParticles();
  frames(1000 / 60, 120);
  frames(1.2 * C.slowMs, 8);
  const mild = particleShare();
  resetParticles();
  frames(1000 / 60, 120);
  frames(3 * C.slowMs, 8);
  assert.ok(mild > particleShare(), `${mild.toFixed(2)} a little slow, ${particleShare().toFixed(2)} very slow`);
  // quick again: back up by `recover` a second, to all of them
  frames(1000 / 60, 120);
  const after2s = particleShare();
  assert.ok(after2s > C.least && after2s <= C.least + 2 * C.recover + 0.05, `two seconds on ${after2s.toFixed(2)}`);
  frames(1000 / 60, 60 * Math.ceil(1 / C.recover + 1));
  assert.equal(particleShare(), 1);
});

test("particles: one long frame on its own hardly changes how many, only a few slow frames together", () => {
  resetParticles();
  frames(1000 / 60, 120);
  noteFrame(300);
  frames(1000 / 60, 3);
  assert.ok(particleShare() > 0.9, `${particleShare().toFixed(2)} after one frame of 300ms`);
  frames(300, 4);
  assert.ok(particleShare() < 0.5, `${particleShare().toFixed(2)} after four more`);
});

test("particles: a screen that only ever goes at 30 frames a second isn't behind, nor is the page hidden for a while", () => {
  resetParticles();
  frames(1000 / 30, 600);
  assert.equal(particleShare(), 1);
  // (slower than it usually goes, though, is)
  frames(1000 / 12, 20);
  assert.ok(particleShare() < 0.5);
  resetParticles();
  frames(1000 / 60, 120);
  noteFrame(20000);
  frames(1000 / 60, 3);
  assert.equal(particleShare(), 1);
});

test("particles: those already going thin out as the share goes down, in proportion to how many were made, and none come back", () => {
  resetParticles();
  frames(1000 / 60, 60);
  // (an effect's own loop, dropping those no longer to be)
  let list = Array.from({ length: 4000 }, () => ({ lot: particleLot() }));
  const live = () => (list = list.filter(alive)).length;
  assert.equal(live(), 4000);
  frames(3 * C.slowMs, 60);
  assert.equal(particleShare(), C.least);
  assert.ok(near(live(), 4000 * C.least, 120), `${list.length} left`);
  assert.ok(alive({}), "one without a lot is always to be");
  const n = list.length;
  frames(1000 / 60, 600);
  assert.equal(particleShare(), 1);
  assert.equal(live(), n, "none back as it comes back up");
  // made at a share already down a little, a fall to the least thins them by as much again
  resetParticles();
  frames(1000 / 60, 120);
  frames(1.2 * C.slowMs, 6);
  const made = particleShare();
  assert.ok(made < 0.95 && made > 2 * C.least, `made at ${made.toFixed(2)}`);
  list = Array.from({ length: 4000 }, () => ({ lot: particleLot() }));
  frames(3 * C.slowMs, 60);
  assert.ok(near(live(), 4000 * C.least / made, 150), `${list.length} of 4000 made at ${made.toFixed(2)}`);
});

test("particles: a row clearing makes fewer of them when the frames lag, and the game's own random numbers go on just the same", () => {
  const { shapes, powerups } = loadShapes(SHAPES);
  const { cols, rows } = CONFIG.board;
  const clear = () => {
    const state = createGameState(shapes, powerups, { rng: makeRng(4) });
    startRun(state, "normal");
    state.fx.particles.length = 0;
    // four rows full but for the left column, and a long thin piece down it
    for (let y = rows - 4; y < rows; y++) for (let x = 1; x < cols; x++) state.board[y][x] = { paint: "#808080", style: { baseColor: "#808080" }, pid: 99999 };
    const tall = shapes.find(s => s.rotations.some(m => m[0].length === 1 && m.length === 4));
    state.active = { shape: tall, rotIdx: tall.rotations.findIndex(m => m[0].length === 1 && m.length === 4), x: 0, y: 0 };
    hardDropAndLock(state);
    return { n: state.fx.particles.length, next: state.rng() };
  };
  resetParticles();
  frames(1000 / 60, 60);
  const all = clear();
  assert.ok(all.n > 300 * (C.amount ?? 1), `${all.n} particles`);
  frames(3 * C.slowMs, 60);
  const few = clear();
  resetParticles();
  assert.ok(near(few.n / all.n, C.least, 0.08), `${few.n} of ${all.n}`);
  assert.equal(few.next, all.next);
});

/* ---------- the look's tiers (CONFIG.fx.quality) ---------- */

const Q = CONFIG.fx.quality;
const names = Q.tiers.map(t => t.name);
const top = names.length - 1;
// (ms of frames, each `ms` long)
const run = (ms, total) => frames(ms, Math.ceil(total / ms));
const fresh = (start = top) => { resetParticles(); resetFxTier({ start }); };

test("tiers: the fullest to start with, out of the browser; and nothing counts towards it till the game's up", () => {
  fresh();
  assert.equal(fxTier().name, names[top]);
  run(80, 20000);
  assert.equal(fxTier().name, names[top], "the loading screen's own slow frames don't take it down");
  fresh();
});

test("tiers: a good share of slow frames takes it down one at a time, no sooner than holdMs apart, and no further than the lightest", () => {
  fresh();
  fxTierReady();
  const seen = [];
  const off = onFxTier((t) => seen.push(t.name));
  run(1000 / 60, 2000);
  assert.equal(fxTier().name, names[top], "quick frames: where it was");
  // slow frames: down one straight away (well within a second)...
  run(60, 600);
  assert.equal(fxTier().name, names[top - 1]);
  // ...and the next, only once holdMs has gone by
  run(60, Q.down.holdMs - 700);
  assert.equal(fxTier().name, names[top - 1], "not again so soon");
  run(60, 1000);
  assert.equal(fxTier().name, names[Math.max(0, top - 2)]);
  run(60, 20000);
  assert.equal(fxTier().name, names[0], "the lightest, and no further");
  assert.deepEqual(seen, names.slice().reverse(), "told of each change, once");
  off();
  fresh();
});

test("tiers: one hitch now and then, or a 30 frames a second screen, doesn't take it down", () => {
  fresh();
  fxTierReady();
  for (let i = 0; i < 20; i++) { run(1000 / 60, 1500); noteFrame(400); }
  assert.equal(fxTier().name, names[top]);
  fresh();
  fxTierReady();
  run(1000 / 30, 30000);
  assert.equal(fxTier().name, names[top]);
  fresh();
});

test("tiers: steady frames bring it back up a tier at a time; a rise that doesn't hold makes the next wait twice as long", () => {
  fresh(0);
  fxTierReady();
  run(1000 / 60, 1000);
  // (from the lightest, quick frames from the start: up one after afterMs)
  let t = 0;
  while (fxTier().name === names[0] && t < 60000) { run(1000 / 60, 100); t += 100; }
  assert.equal(fxTier().name, names[1]);
  assert.ok(t >= Q.up.afterMs - 1100 && t <= Q.up.afterMs + 1000, `up after ${t} ms`);
  // ...and it doesn't hold: slow again straight away, back down (once holdMs has gone by)
  run(60, Q.down.holdMs + 1000);
  assert.equal(fxTier().name, names[0]);
  // quick again: this time the rise waits longer (once the slow frames are well behind it)
  t = 0;
  while (fxTier().name === names[0] && t < 120000) { run(1000 / 60, 100); t += 100; }
  assert.equal(fxTier().name, names[1]);
  assert.ok(t >= 2 * Q.up.afterMs, `the next rise after ${t} ms`);
  fresh();
});

test("tiers: the tier's share of particles is the most there are, whatever the frames; held at one, it stays there", () => {
  fresh();
  forceFxTier(names[0]);
  const most = Q.tiers[0].particles;
  run(1000 / 60, 2000);
  assert.equal(particleShare(), 1, "the frames keep up");
  assert.equal(particleBudget(), most);
  let kept = 0;
  for (let i = 0; i < 4000; i++) kept += keepParticle();
  assert.ok(near(kept / 4000, most, 0.03), `${kept} of 4000 kept`);
  const list = Array.from({ length: 2000 }, () => ({ lot: particleLot() }));
  assert.ok(list.every(alive), "all those made at the tier's share live on at it");
  // held there: quick frames for a long while don't bring it up
  fxTierReady();
  run(1000 / 60, 60000);
  assert.equal(fxTier().name, names[0]);
  forceFxTier(null);
  fresh();
});
