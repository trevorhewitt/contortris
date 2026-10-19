// Run with:  node --test tests/*.test.mjs
// The powerup shelf: one strong powerup of each class each game, the same ones every game, which
// takes the falling piece's place when it's used (a tap on the bay: the next in its queue, the
// order they came in); in Classic a class's slot opens the moment the class unlocks.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { classOf } from "../src/powerups.js";
import { createGameState, startRun, updateGame, useShelf, on } from "../src/game.js";
import { shelfReady, shelfCount, shelfQueue, pieceReach } from "../src/shelf.js";

const { shapes, powerups } = loadShapes(SHAPES);
const game = (mode, seed = 3) => {
  const state = createGameState(shapes, powerups, { rng: makeRng(seed) });
  startRun(state, mode);
  return state;
};

test("every shelf piece is a powerup of its slot's class", () => {
  for (const [cls, id] of Object.entries(CONFIG.shelf.pieces)) {
    const p = powerups.find(s => s.id === id);
    assert.ok(p, `${id} exists`);
    assert.equal(p.powerup.cls, cls, `${id} is a ${cls}`);
  }
});

test("the bay has the same pieces every game", () => {
  const ids = (state) => state.shelf.slots.map(s => s.shape.id);
  const first = ids(game("god", 1));
  for (let seed = 2; seed <= 6; seed++) assert.deepEqual(ids(game("god", seed)), first);
  assert.deepEqual(first, CONFIG.shelf.classes.map(cls => CONFIG.shelf.pieces[cls]));
});

test("each of the bay's pieces is close to the best of its class, but not the best", () => {
  // (by how much of the board it reaches, put down in the middle of it)
  const state = game("normal");
  for (const [cls, id] of Object.entries(CONFIG.shelf.pieces)) {
    const mine = pieceReach(state.powerups.find(p => p.id === id));
    const all = state.powerups.filter(p => p.powerup.cls === cls && (p.frequency ?? 1) > 0).map(pieceReach);
    const better = all.filter(n => n > mine).length;
    assert.ok(better >= 1, `${id}: not the best ${cls}`);
    assert.ok(better < all.length / 4, `${id}: in the top quarter of the ${all.length} ${cls}s (${better} reach further)`);
  }
});

test("a combo chosen for a slot (the developer tools) is in it, and in Classic comes once the combos have too", () => {
  const usual = CONFIG.shelf.pieces.destroyer;
  const combo = powerups.find(p => p.powerup.parts?.some(q => classOf(q.type) === "destroyer") && !p.powerup.setOnly);
  CONFIG.shelf.pieces.destroyer = combo.id;
  try {
    const state = game("normal");
    const slot = state.shelf.slots.find(s => s.cls === "destroyer");
    assert.equal(slot?.shape.id, combo.id);
    const met = state.pieceSel.powerup.shownClasses;
    met.add("destroyer");
    assert.equal(shelfReady(state, slot), false, "not before the combos");
    met.add("combo");
    assert.equal(shelfReady(state, slot), true);
  } finally {
    CONFIG.shelf.pieces.destroyer = usual;
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

test("a tap on the bay uses the next one: they go in the order they came", () => {
  // (God mode: all at once, in the order of CONFIG.shelf.classes)
  const god = game("god");
  assert.deepEqual(shelfQueue(god).map(s => s.cls), CONFIG.shelf.classes);
  // (Classic: in the order the classes unlock)
  const state = game("normal");
  const met = state.pieceSel.powerup.shownClasses;
  const order = ["gravity", "destroyer", "expander"];
  order.forEach((cls, i) => {
    met.add(cls);
    assert.deepEqual(shelfQueue(state).map(s => s.cls), order.slice(0, i + 1));
  });
  for (const cls of order) {
    const piece = state.shelf.slots.find(s => s.cls === cls).shape;
    assert.ok(useShelf(state), `${cls}: used`);
    assert.equal(state.active.shape.id, piece.id, `${cls}'s piece came`);
  }
  assert.deepEqual(shelfQueue(state), []);
  assert.equal(useShelf(state), false, "none left");
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
