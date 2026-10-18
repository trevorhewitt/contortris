// Run with:  node --test tests/*.test.mjs
// The powerup shelf: one strong powerup of each class each game, which takes the falling piece's
// place when it's used; in Classic a class's slot opens with the class.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, updateGame, useShelf, on } from "../src/game.js";
import { shelfReady } from "../src/shelf.js";

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

test("Classic: a slot opens only once its class has", () => {
  const state = game("normal");
  const opened = state.pieceSel.powerup.classes;
  for (const [i, slot] of state.shelf.slots.entries()) {
    assert.equal(shelfReady(state, slot), opened.includes(slot.cls));
    if (!opened.includes(slot.cls)) assert.equal(useShelf(state, i), false);
  }
  opened.push(...state.shelf.slots.map(s => s.cls));
  assert.ok(useShelf(state, 1));
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
