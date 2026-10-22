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
import { createGameState, startRun, updateGame, useShelf, undoShelf, canUndoShelf, tryMove, tryRotate, on } from "../src/game.js";
import { shelfReady, shelfCount, shelfQueue, moveShelf, pieceReach } from "../src/shelf.js";
import { pieceIcon } from "../src/shelfui.js";
import { resetParticles } from "../src/particles.js";

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

test("the queue can be put in another order (the pause menu), and a tap on the bay goes by it", () => {
  const state = game("god");
  const order = (st = state) => shelfQueue(st).map(s => s.cls);
  assert.deepEqual(order(), ["destroyer", "expander", "gravity"]);
  assert.ok(moveShelf(state, 1, 2), "a swap");
  assert.deepEqual(order(), ["destroyer", "gravity", "expander"]);
  assert.ok(moveShelf(state, 2, 0), "the last to the front");
  assert.deepEqual(order(), ["expander", "destroyer", "gravity"]);
  assert.equal(moveShelf(state, 0, 3), false, "nowhere to go");
  assert.equal(moveShelf(state, 1, 1), false);
  assert.ok(useShelf(state));
  assert.equal(state.active.shape.id, CONFIG.shelf.pieces.expander);
  assert.deepEqual(order(), ["destroyer", "gravity"]);
  // (Classic: one that comes after still goes on the end)
  const classic = game("normal");
  const met = classic.pieceSel.powerup.shownClasses;
  met.add("destroyer"); met.add("gravity");
  assert.ok(moveShelf(classic, 0, 1));
  assert.deepEqual(order(classic), ["gravity", "destroyer"]);
  met.add("expander");
  assert.deepEqual(order(classic), ["gravity", "destroyer", "expander"]);
});

test("the bay's icons: each class its own, and a combo's each of its classes', in the order they go off", () => {
  const classesIn = (svg) => [...svg.matchAll(/bayGlyph cls-(\w+)/g)].map(m => m[1]);
  for (const cls of ["destroyer", "expander", "gravity"]) {
    const p = powerups.find(s => s.powerup.cls === cls && !s.powerup.parts);
    assert.deepEqual(classesIn(pieceIcon(p)), [cls]);
    assert.ok(!pieceIcon(p).includes("bayPlate"), "no plate of its own");
  }
  const all = powerups.find(s => new Set((s.powerup.parts ?? []).map(q => classOf(q.type))).size === 3);
  assert.deepEqual(classesIn(pieceIcon(all)), ["destroyer", "gravity", "expander"]);
  assert.ok(pieceIcon(all).includes("bayPlate"), "on a plate together");
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

test("Used, the falling piece bursts into bits, and the Extra Shiny Piece is put at the top of the board in rays of light", () => {
  resetParticles();
  const state = game("god");
  state.active.y = 6; // (well onto the board)
  const bits = state.fx.particles.length;
  assert.ok(useShelf(state));
  assert.ok(state.fx.particles.length > bits, "the bits of the piece it took the place of");
  assert.equal(state.active.y, 0, "at the top of the board");
  assert.equal(state.fx.ace?.piece, state.active, "rays of light behind it");
  for (let t = 0; t < 5000 && state.fx.ace; t += 16) updateGame(state, 16);
  assert.equal(state.fx.ace, null, "for a moment");
  // (with no room for it at the top, it comes in from above the board, as any piece does)
  const full = game("god");
  const { cols } = CONFIG.board;
  for (let y = 0; y < 4; y++) for (let x = 1; x < cols; x++) full.board[y][x] = { pid: 1 };
  assert.ok(useShelf(full));
  assert.ok(full.active.y < 0, "above the board");
  assert.equal(full.fx.ace?.piece, full.active);
});

// (the game for the undo: God mode, a full bay; its first piece turned and moved over, and
// fallen for a moment)
const undoGame = (seed = 4) => {
  const state = game("god", seed);
  tryRotate(state, 1);
  tryMove(state, 1, 0);
  for (let t = 0; t < 400; t += 16) updateGame(state, 16);
  return state;
};
const run = (state, ms) => { for (let t = 0; t < ms; t += 16) updateGame(state, 16); };

test("A second tap while the Extra Shiny Piece is still falling undoes it: the piece it replaced comes back, and it goes back to the front of the bay", () => {
  const state = undoGame();
  const was = { shape: state.active.shape, rotIdx: state.active.rotIdx, x: state.active.x };
  const queue = shelfQueue(state).map(s => s.cls), count = shelfCount(state);
  assert.ok(moveShelf(state, 2, 0), "the last one to the front, to use");
  const used = shelfQueue(state)[0];
  assert.ok(useShelf(state));
  assert.equal(state.active.shape, used.shape);
  run(state, 300);
  assert.ok(canUndoShelf(state), "still falling");
  const bits = state.fx.particles.length;
  assert.ok(undoShelf(state));
  assert.equal(state.active.shape, was.shape, "the same piece");
  assert.equal(state.active.rotIdx, was.rotIdx, "turned the same way");
  assert.equal(state.active.x, was.x, "in the same column");
  assert.equal(state.fx.ace, null, "no rays of light for it");
  assert.ok(state.fx.particles.length > bits, "a little light to show it");
  assert.equal(shelfCount(state), count, "the bay as full as it was");
  assert.equal(used.left, 1);
  assert.equal(shelfQueue(state)[0], used, "back at the front of the queue");
  assert.deepEqual(shelfQueue(state).slice(1).map(s => s.cls), queue.filter(c => c !== used.cls));
  assert.equal(undoShelf(state), false, "once");
  // (and it can be used again, like any other)
  assert.ok(useShelf(state));
  assert.equal(state.active.shape, used.shape);
});

test("Undone, the piece comes back as far down as it would have fallen by now: no time is gained", () => {
  for (const ms of [200, 1500, 4000, 60000]) {
    // the same game, left alone
    const plain = undoGame();
    const piece = plain.active.shape;
    run(plain, ms);
    // and with an Extra Shiny Piece taken, and sent back
    const state = undoGame();
    assert.ok(useShelf(state));
    let t = 0;
    for (; t < ms && canUndoShelf(state); t += 16) updateGame(state, 16);
    if (!undoShelf(state)) { assert.ok(t > 1000, `${ms}ms: only once it has landed can it not be sent back`); continue; }
    run(state, ms - t);
    if (plain.active?.shape === piece) {
      assert.equal(state.active?.shape, piece, `${ms}ms: still falling, as it would be`);
      assert.ok(state.active.y >= plain.active.y, `${ms}ms: at row ${state.active.y}, at least as far down as row ${plain.active.y}`);
    } else {
      // (it would have landed by now: it has)
      assert.notEqual(state.active?.shape, piece, `${ms}ms: it has landed, as it would have`);
    }
  }
  // on the ground already when it was replaced: its time there goes on, and it locks no later than
  // it would have
  const landed = (st) => { for (let t = 0; t < 60000 && !st.locking; t += 16) updateGame(st, 16); };
  const until = (st, piece) => { let t = 0; for (; t < 60000 && st.active?.shape === piece; t += 16) updateGame(st, 16); return t; };
  const plain = undoGame(), piece = plain.active.shape;
  landed(plain);
  const left = until(plain, piece);
  const state = undoGame();
  landed(state);
  assert.ok(useShelf(state));
  run(state, 96);
  assert.ok(undoShelf(state), "the Extra Shiny Piece still falling");
  assert.equal(state.active.shape, piece);
  assert.ok(state.locking && state.lockElapsed >= 96, "still on the ground, its time there going on");
  assert.ok(96 + until(state, piece) <= left + 16, "locked no later than it would have");
});

test("Once the Extra Shiny Piece has landed, there's no undoing it", () => {
  const state = undoGame();
  const used = shelfQueue(state)[0];
  assert.ok(useShelf(state));
  const ace = state.active;
  for (let t = 0; t < 60000 && !state.locking && state.active === ace; t += 16) updateGame(state, 16);
  assert.equal(state.active, ace, "landed, not yet locked");
  assert.equal(canUndoShelf(state), false);
  assert.equal(undoShelf(state), false);
  // (not even if it's moved off an edge and falls again)
  updateGame(state, 16);
  assert.equal(state.shelf.undo, null, "for good");
  assert.equal(used.left, 0);
  // (nor with nothing falling when it was taken: there's nothing to go back to)
  const between = game("god", 5);
  const falling = between.active;
  between.active = null;
  assert.ok(useShelf(between, 0));
  between.active = falling;
  run(between, 2000);
  assert.equal(undoShelf(between), false);
});

test("No shelf in Extreme", () => {
  assert.equal(game("extreme").shelf, null);
});

test("Zen: the bay as in Classic, with all three in it from the start; one from it is the player's, and the computer leaves it to them", () => {
  const state = game("zen");
  while (!state.active) updateGame(state, 16);
  assert.deepEqual(state.shelf.slots.map(s => s.cls).sort(), ["destroyer", "expander", "gravity"]);
  assert.equal(shelfCount(state), 3, "all three from the first piece");
  assert.deepEqual(shelfQueue(state).map(s => s.cls), CONFIG.shelf.classes);
  const slot = shelfQueue(state)[0];
  assert.ok(useShelf(state));
  const a = state.active;
  assert.equal(a.shape.id, slot.shape.id);
  assert.equal(slot.left, 0);
  assert.equal(shelfCount(state), 2);
  assert.ok(state.zen.userHas && !state.zen.mine && !state.zen.target, "theirs: it isn't aimed, nor taken over");
  // (left alone, it's still theirs: it falls where it is)
  const x = a.x, rot = a.rotIdx;
  for (let t = 0; t < 30000 && state.active === a; t += 16) {
    updateGame(state, 16);
    if (state.active === a) assert.ok(a.x === x && a.rotIdx === rot && !state.zen.mine);
  }
  assert.notEqual(state.active, a, "it landed");
  // (and the rest are used one after another, then it's empty, as in Classic)
  while (!state.active || state.effect) updateGame(state, 16);
  assert.ok(useShelf(state));
  while (!state.active || state.effect) updateGame(state, 16);
  assert.ok(useShelf(state));
  assert.equal(shelfCount(state), 0);
  while (!state.active || state.effect) updateGame(state, 16);
  assert.equal(useShelf(state), false);
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
