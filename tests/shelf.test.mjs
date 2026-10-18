// Run with:  node --test tests/*.test.mjs
// The powerup shelf: one middling powerup of each class each game, which takes the falling piece's
// place when it's used; in Classic a class's slot opens the moment the class unlocks.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, updateGame, useShelf, on } from "../src/game.js";
import { shelfReady, shelfCount } from "../src/shelf.js";

const { shapes, powerups } = loadShapes(SHAPES);
const game = (mode, seed = 3) => {
  const state = createGameState(shapes, powerups, { rng: makeRng(seed) });
  startRun(state, mode);
  return state;
};

test("every shelf piece is a powerup of its slot's class", () => {
  for (const [cls, ids] of Object.entries(CONFIG.shelf.pieces)) for (const id of ids) {
    const p = powerups.find(s => s.id === id);
    assert.ok(p, `${id} exists`);
    assert.equal(p.powerup.cls, cls, `${id} is a ${cls}`);
  }
});

test("God mode: a full shelf, and using a slot swaps the falling piece for its powerup", () => {
  const state = game("god");
  assert.equal(state.shelf.slots.length, CONFIG.shelf.classes.length);
  const before = state.active.shape;
  const slot = state.shelf.slots[0];
  assert.ok(useShelf(state, 0));
  assert.equal(state.active.shape.id, slot.shape.id);
  assert.notEqual(state.active.shape, before);
  assert.equal(slot.left, 0);
  assert.equal(useShelf(state, 0), false, "only one of each");
});

test("Classic: a slot opens only once one of its class has come (so the bay never meets a class, or opens the combos)", () => {
  const state = game("normal");
  const ps = state.pieceSel.powerup, met = ps.shownClasses;
  // (a class that's in, but none of it has come yet: still shut)
  ps.classes.push(state.shelf.slots[0].cls);
  for (const [i, slot] of state.shelf.slots.entries()) {
    assert.equal(shelfReady(state, slot), met.has(slot.cls));
    if (!met.has(slot.cls)) assert.equal(useShelf(state, i), false);
  }
  for (const s of state.shelf.slots) met.add(s.cls);
  const before = new Set(met);
  assert.ok(useShelf(state, 1));
  assert.deepEqual(met, before, "nothing new met");
});

test("the bay: one of each of the three classes, never a combo, once each", () => {
  const state = game("god");
  assert.deepEqual(state.shelf.slots.map(s => s.cls).sort(), ["destroyer", "expander", "gravity"]);
  for (const s of state.shelf.slots) {
    assert.equal(s.shape.powerup.cls, s.cls);
    assert.ok(!s.shape.powerup.parts, `${s.shape.id}: not a combo`);
    assert.equal(s.left, 1);
  }
});

test("Taken while nothing is falling, it comes next", () => {
  const state = game("god", 5);
  const slot = state.shelf.slots[2];
  const falling = state.active;
  state.active = null; // (as between pieces)
  assert.ok(useShelf(state, 2));
  assert.equal(state.shelf.pending, slot.shape);
  state.active = falling;
  let spawned = null;
  on(state, (t, d) => { if (t === "spawn") spawned ??= d.shape; });
  for (let t = 0; t < 60000 && !spawned; t += 16) updateGame(state, 16);
  assert.equal(spawned?.id, slot.shape.id);
  assert.equal(state.shelf.pending, null);
});

test("No shelf in Extreme or zen", () => {
  assert.equal(game("extreme").shelf, null);
  assert.equal(game("zen").shelf, null);
});

test("Classic: a class's piece comes into the bay the moment the class unlocks: its first piece down on the board, not before", () => {
  let checked = 0;
  for (let seed = 1; seed <= 30 && checked < 3; seed++) {
    const state = game("normal", seed);
    let first = null;
    on(state, (t, d) => { if (t === "spawn" && d.isNew && !first) first = d.shape; });
    // (pieces dropped straight down, until the first Shiny Piece comes)
    for (let i = 0; i < 400 && !first && !state.gameOver; i++) {
      if (state.active) state.active.y = Math.max(state.active.y, 0);
      for (let t = 0; t < 4000 && state.active && !first; t += 16) { state.softDropping = true; updateGame(state, 16); }
      for (let t = 0; t < 2000 && !state.active && !first; t += 16) updateGame(state, 16);
    }
    if (!first) continue; // (a tower of pieces dropped straight down can end the game first)
    const cls = first.powerup.cls, slot = state.shelf.slots.find(s => s.cls === cls);
    if (!slot) continue; // (a class the bay doesn't have: the combos)
    // (its intro: it's still above the board)
    assert.ok(state.active.y + state.active.shape.rotations[state.active.rotIdx].length <= 0);
    assert.equal(shelfReady(state, slot), false, `seed ${seed}: not in the bay yet`);
    assert.equal(shelfCount(state), 0);
    // (it comes down onto the board)
    state.softDropping = false;
    let steps = 0;
    while (state.active?.firstOfClass === cls && state.active.y + state.active.shape.rotations[state.active.rotIdx].length <= 0 && steps++ < 400) {
      assert.equal(shelfReady(state, slot), false);
      updateGame(state, 16);
    }
    assert.equal(shelfReady(state, slot), true, `seed ${seed}: in the bay once it's on the board`);
    assert.equal(shelfCount(state), 1);
    checked++;
  }
  assert.equal(checked, 3);
});
