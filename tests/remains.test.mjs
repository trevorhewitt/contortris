// Run with:  node --test tests/*.test.mjs
// What destroyed blocks leave behind (src/remains.js), headless (no DOM).
import test from "node:test";
import assert from "node:assert/strict";

import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, updateGame, hardDropAndLock, on, zenRescue, timeScaleOf } from "../src/game.js";
import { leaveRemains, ageRemains, remainsAt } from "../src/remains.js";

const { shapes, powerups } = loadShapes(SHAPES);
const byId = (id) => [...shapes, ...powerups].find(s => s.id === id);
const COLS = CONFIG.board.cols, ROWS = CONFIG.board.rows;

function newGame(mode = "normal", seed = 1) {
  const state = createGameState(shapes, powerups, { rng: makeRng(seed) });
  const events = [];
  on(state, (type, d) => events.push({ type, d }));
  startRun(state, mode);
  return { state, events };
}

function placeActive(state, id, x, y, rotIdx = 0) {
  state.active = { shape: byId(id), rotIdx, x, y };
}

const block = (paint) => ({ paint, style: { baseColor: paint }, pid: 999999 });
// (just a board, for remains.js on its own)
const boardOnly = (cols = 8, rows = 4) => ({ mode: "normal", board: Array.from({ length: rows }, () => Array(cols).fill(null)) });

// CONFIG.remains changed (and put back after)
function withRemains(changes, fn) {
  const was = { ...CONFIG.remains };
  Object.assign(CONFIG.remains, changes);
  try { fn(); } finally { Object.assign(CONFIG.remains, was); }
}

// Every cell with remains: "x,y" -> its paint
function allRemains(state) {
  const out = {};
  const rows = state.board.length, cols = state.board[0].length;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const r = remainsAt(state, x, y);
    if (r) out[`${x},${y}`] = r.paint;
  }
  return out;
}

test("a row cleared leaves each block's art where it was, under whatever comes down there; what came down leaves none", () => {
  const { state } = newGame("normal");
  // the bottom row full but for column 0, each block its own colour, and a lentil (1x1) on it
  const paints = Array.from({ length: COLS }, (_, x) => `#80${(16 + x).toString(16)}40`);
  for (let x = 1; x < COLS; x++) state.board[ROWS - 1][x] = block(paints[x]);
  placeActive(state, "lentil", 5, ROWS - 3);
  hardDropAndLock(state); // (on the row, at y = ROWS - 2)
  const lentil = state.board[ROWS - 2][5];
  assert.ok(lentil);
  assert.deepEqual(allRemains(state), {}, "nothing destroyed yet");

  placeActive(state, "lentil", 0, 0);
  hardDropAndLock(state); // (into column 0: the row's full, and goes)
  const left = allRemains(state);
  assert.equal(Object.keys(left).length, COLS, "one for each block in the row, and none anywhere else");
  for (let x = 1; x < COLS; x++) assert.equal(left[`${x},${ROWS - 1}`], paints[x], `column ${x}`);
  assert.ok(left[`0,${ROWS - 1}`], "the lentil that finished the row too");
  // (the lentil on it came down into the row: it's there now, over what the row left)
  assert.equal(state.board[ROWS - 1][5], lentil);
  assert.equal(remainsAt(state, 5, ROWS - 1).paint, paints[5]);
  assert.equal(remainsAt(state, 5, ROWS - 2), null, "where it came down from: nothing (it wasn't destroyed)");
});

test("a Destroyerz leaves the art of the blocks it destroyed, and its own, as it goes with them", () => {
  const { state, events } = newGame("normal");
  for (let y = ROWS - 4; y < ROWS; y++) for (let x = 0; x < COLS - 1; x++) state.board[y][x] = block("#808080");
  placeActive(state, "small_black_hole", 6, 0);
  const own = state.active.shape.rotations[0].flat().filter(Boolean).length;
  hardDropAndLock(state);
  for (let t = 0; t < 1500; t += 16) updateGame(state, 16);
  const fire = events.find(e => e.type === "powerupFire");
  assert.ok(fire && fire.d.affected > 0, "it destroyed something");
  const left = allRemains(state);
  const theirs = Object.values(left).filter(paint => paint === "#808080").length;
  assert.equal(theirs, fire.d.affected, "one for each block it destroyed");
  assert.equal(Object.keys(left).length - theirs, own, "and one for each of its own");
  for (const at of Object.keys(left)) {
    const [x, y] = at.split(",").map(Number);
    assert.equal(state.board[y][x], null, `${at}: where it was is empty now`);
  }
});

test("zen dissolving the top of the board leaves what it dissolved there", () => {
  const { state } = newGame("zen");
  const keep = CONFIG.zen.rescueKeepRows ?? 5;
  for (let y = ROWS - keep - 3; y < ROWS; y++) for (let x = 0; x < COLS - 1; x++) state.board[y][x] = block(`#40${(16 + y).toString(16)}80`);
  zenRescue(state);
  const left = allRemains(state);
  assert.equal(Object.keys(left).length, 3 * (COLS - 1), "the three rows that went");
  for (let y = ROWS - keep - 3; y < ROWS - keep; y++) assert.equal(left[`0,${y}`], `#40${(16 + y).toString(16)}80`);
  for (let y = ROWS - keep; y < ROWS; y++) assert.equal(remainsAt(state, 0, y), null, "the rows it kept: none");
});

test("the last block destroyed in a cell is the one that shows there, in the newest layer", () => {
  withRemains({ forever: true, layers: 4, layerSec: 4 }, () => {
    const state = boardOnly();
    leaveRemains(state, [{ x: 1, y: 3, cell: block("#aa0000") }, { x: 2, y: 3, cell: block("#00aa00") }]);
    ageRemains(state, 5000);
    leaveRemains(state, [{ x: 1, y: 3, cell: block("#0000aa") }]);
    assert.deepEqual(remainsAt(state, 1, 3), { paint: "#0000aa", style: { baseColor: "#0000aa" }, depth: 0, strength: 1 - CONFIG.remains.faded });
    assert.equal(remainsAt(state, 2, 3).paint, "#00aa00");
    assert.equal(remainsAt(state, 2, 3).depth, 1, "a layer further back");
  });
});

test("no more than `layers` layers: the oldest go into the one after them", () => {
  withRemains({ forever: true, layers: 3, layerSec: 4 }, () => {
    const state = boardOnly();
    for (let x = 0; x < 5; x++) {
      leaveRemains(state, [{ x, y: 3, cell: block(`#00000${x}`) }]);
      ageRemains(state, 5000); // (a new layer each time)
    }
    assert.deepEqual([0, 1, 2, 3, 4].map(x => remainsAt(state, x, 3).depth), [2, 2, 2, 1, 0]);
  });
  // (fading away, a new layer no more often than fadeAwaySec / layers, so a layer fades as one)
  withRemains({ forever: false, fadeAwaySec: 60, layers: 3, layerSec: 4 }, () => {
    const state = boardOnly();
    for (let x = 0; x < 5; x++) {
      leaveRemains(state, [{ x, y: 3, cell: block(`#00000${x}`) }]);
      ageRemains(state, 5000);
    }
    assert.deepEqual([0, 1, 2, 3, 4].map(x => remainsAt(state, x, 3).depth), [1, 1, 1, 1, 0]);
  });
});

test("fading away: fainter as they get older, and gone after fadeAwaySec; or there for good", () => {
  withRemains({ forever: false, fadeAwaySec: 10, faded: 0.5 }, () => {
    const state = boardOnly();
    leaveRemains(state, [{ x: 0, y: 3, cell: block("#aa0000") }]);
    assert.equal(remainsAt(state, 0, 3).strength, 0.5);
    ageRemains(state, 5000);
    const half = remainsAt(state, 0, 3).strength;
    assert.ok(half > 0 && half < 0.5, `halfway: ${half}`);
    ageRemains(state, 5000);
    assert.equal(remainsAt(state, 0, 3), null, "gone");
  });
  withRemains({ forever: true, fadeAwaySec: 10, faded: 0.5 }, () => {
    const state = boardOnly();
    leaveRemains(state, [{ x: 0, y: 3, cell: block("#aa0000") }]);
    ageRemains(state, 3600 * 1000);
    assert.equal(remainsAt(state, 0, 3).strength, 0.5, "an hour on, as they were");
  });
});

test("they fade only as the game goes on (not while it's paused), and in turbo zen no quicker", () => {
  withRemains({ forever: false, fadeAwaySec: 10 }, () => {
    for (const mode of ["normal", "turbo"]) {
      const { state } = newGame(mode);
      leaveRemains(state, [{ x: 0, y: 0, cell: block("#aa0000") }]);
      state.paused = true;
      for (let t = 0; t < 20000; t += 16) updateGame(state, 16);
      assert.ok(remainsAt(state, 0, 0), `${mode}: paused for 20 s, still there`);
      state.paused = false;
      // (as main.js runs it: timeScaleOf × the time that passed, turbo zen quicker)
      const step = 16 * timeScaleOf(state);
      for (let t = 0; t < 9000; t += 16) updateGame(state, step);
      assert.ok(remainsAt(state, 0, 0), `${mode}: 9 s on, still there`);
      for (let t = 0; t < 1500; t += 16) updateGame(state, step);
      assert.equal(remainsAt(state, 0, 0), null, `${mode}: 10.5 s on, gone`);
    }
  });
});

test("none on a new board (a new game), in the tutorial, or switched off", () => {
  const { state } = newGame("normal");
  leaveRemains(state, [{ x: 0, y: ROWS - 1, cell: block("#aa0000") }]);
  assert.ok(remainsAt(state, 0, ROWS - 1));
  startRun(state, "normal");
  assert.equal(remainsAt(state, 0, ROWS - 1), null, "a new game");

  const tutorial = newGame("tutorial").state;
  leaveRemains(tutorial, [{ x: 0, y: 0, cell: block("#aa0000") }]);
  assert.equal(remainsAt(tutorial, 0, 0), null, "the tutorial");

  withRemains({ enabled: false }, () => {
    const off = newGame("normal").state;
    leaveRemains(off, [{ x: 0, y: 0, cell: block("#aa0000") }]);
    assert.equal(remainsAt(off, 0, 0), null, "switched off");
  });
});
