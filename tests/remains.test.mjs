// Run with:  node --test tests/*.test.mjs
// What destroyed blocks leave behind (src/remains.js), headless (no DOM).
import test from "node:test";
import assert from "node:assert/strict";

import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, updateGame, hardDropAndLock, on, zenRescue, timeScaleOf } from "../src/game.js";
import { leaveRemains, ageRemains, remainsAt, remainsKey, liveLift, liftColour } from "../src/remains.js";

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

// Every cell with remains: "x,y" -> the paint of the front one
function allRemains(state) {
  const out = {};
  const rows = state.board.length, cols = state.board[0].length;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const r = remainsAt(state, x, y);
    if (r.length) out[`${x},${y}`] = r[0].paint;
  }
  return out;
}
const paintsAt = (state, x, y) => remainsAt(state, x, y).map(r => r.paint);
const depthsAt = (state, x, y) => remainsAt(state, x, y).map(r => r.depth);

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
  assert.deepEqual(paintsAt(state, 5, ROWS - 1), [paints[5]]);
  assert.deepEqual(remainsAt(state, 5, ROWS - 2), [], "where it came down from: nothing (it wasn't destroyed)");
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
  for (let y = ROWS - keep; y < ROWS; y++) assert.deepEqual(remainsAt(state, 0, y), [], "the rows it kept: none");
});

test("a block destroyed where one was before goes in front of it, in a newer layer; the older one stays behind", () => {
  withRemains({ forever: false, fadeAwaySec: 60, layers: 8, layerSec: 4 }, () => {
    const state = boardOnly();
    // (fading away over 60 s in no more than 8 layers: a new one every 7.5 s at most)
    leaveRemains(state, [{ x: 1, y: 3, cell: block("#aa0000") }, { x: 2, y: 3, cell: block("#00aa00") }]);
    ageRemains(state, 8000);
    leaveRemains(state, [{ x: 1, y: 3, cell: block("#0000aa") }]);
    assert.deepEqual(paintsAt(state, 1, 3), ["#0000aa", "#aa0000"], "the newer in front");
    assert.deepEqual(depthsAt(state, 1, 3), [0, 1]);
    assert.deepEqual(paintsAt(state, 2, 3), ["#00aa00"]);
    assert.deepEqual(depthsAt(state, 2, 3), [1], "a layer back");
    const [front, back] = remainsAt(state, 1, 3);
    assert.deepEqual(front.style, { baseColor: "#0000aa" });
    assert.ok(front.age < back.age && front.alpha > back.alpha && front.blur < back.blur, "the one behind older, fainter and blurrier");

    // (in the same layer, the last destroyed there takes the place of the one before)
    ageRemains(state, 1000);
    leaveRemains(state, [{ x: 1, y: 3, cell: block("#aaaa00") }]);
    assert.deepEqual(paintsAt(state, 1, 3), ["#aaaa00", "#aa0000"]);
  });
});

test("no more than `layers` layers: there for good, the oldest go into the one after them; fading away, a layer goes as one", () => {
  withRemains({ forever: true, fadeAwaySec: 12, layers: 3, layerSec: 4 }, () => {
    const state = boardOnly();
    leaveRemains(state, [{ x: 1, y: 2, cell: block("#aa0000") }]);
    for (let x = 0; x < 5; x++) {
      ageRemains(state, 5000); // (a new layer each time)
      leaveRemains(state, [{ x, y: 3, cell: block(`#00000${x}`) }]);
      if (x === 1) leaveRemains(state, [{ x: 1, y: 2, cell: block("#00aa00") }]);
    }
    assert.deepEqual([0, 1, 2, 3, 4].map(x => depthsAt(state, x, 3)), [[2], [2], [2], [1], [0]]);
    assert.deepEqual(paintsAt(state, 1, 2), ["#00aa00"], "gone into one: the newer one there, in place of the older");
  });
  // (fading away, a new layer no more often than fadeAwaySec / layers, so there are never more
  // than that, and the oldest has gone before another comes)
  withRemains({ forever: false, fadeAwaySec: 60, layers: 3, layerSec: 4 }, () => {
    const state = boardOnly();
    for (let x = 0; x < 5; x++) {
      leaveRemains(state, [{ x, y: 3, cell: block(`#00000${x}`) }]);
      ageRemains(state, 5000);
    }
    assert.deepEqual([0, 1, 2, 3, 4].map(x => depthsAt(state, x, 3)), [[1], [1], [1], [1], [0]]);
    ageRemains(state, 34000); // (59 s since the first)
    assert.equal(Object.keys(allRemains(state)).length, 5);
    ageRemains(state, 1000);
    assert.deepEqual(Object.keys(allRemains(state)), ["4,3"], "the first layer's gone, all of it at once");
  });
});

test("as a layer gets older it gets fainter, darker and blurrier, and after fadeAwaySec it's gone", () => {
  withRemains({ forever: false, fadeAwaySec: 10, faded: 0.5, darkerWithAge: 0.7, blur: 0.1, blurWithAge: 1 }, () => {
    const state = boardOnly();
    leaveRemains(state, [{ x: 0, y: 3, cell: block("#aa0000") }]);
    const looks = [];
    for (let s = 0; s < 10; s++) {
      looks.push(remainsAt(state, 0, 3)[0]);
      ageRemains(state, 1000);
    }
    assert.equal(looks[0].alpha, 0.5, "new: as faded as `faded`");
    assert.equal(looks[0].blur, 0.1, "and as blurry as `blur`");
    for (let s = 1; s < 10; s++) {
      assert.ok(looks[s].alpha < looks[s - 1].alpha, `${s} s: fainter`);
      assert.ok(looks[s].blur > looks[s - 1].blur, `${s} s: blurrier`);
    }
    assert.ok(Math.abs(looks[5].alpha - 0.5 * (1 - 0.7 * 0.5)) < 1e-9, `halfway, darker by half of darkerWithAge: ${looks[5].alpha}`);
    assert.ok(Math.abs(looks[5].blur - 0.6) < 1e-9, `and blurrier by half of blurWithAge: ${looks[5].blur}`);
    assert.ok(looks[9].alpha < 0.1, `nearly gone: ${looks[9].alpha}`);
    assert.deepEqual(remainsAt(state, 0, 3), [], "gone");
  });
});

test("there for good, a layer stops getting older three quarters of the way, and stays", () => {
  withRemains({ forever: true, fadeAwaySec: 10, faded: 0.5, darkerWithAge: 0.7, blur: 0.1, blurWithAge: 1 }, () => {
    const state = boardOnly(), then = boardOnly();
    leaveRemains(state, [{ x: 0, y: 3, cell: block("#aa0000") }]);
    leaveRemains(then, [{ x: 0, y: 3, cell: block("#aa0000") }]);
    ageRemains(state, 3600 * 1000);
    ageRemains(then, 7500);
    const now = remainsAt(state, 0, 3)[0], was = remainsAt(then, 0, 3)[0];
    assert.equal(now.age, 0.75);
    assert.deepEqual(now, was, "an hour on, as it was 7.5 s in");
    assert.ok(now.alpha > 0.2, `still there to see: ${now.alpha}`);
  });
});

test("they get older only as the game goes on (not while it's paused), and in turbo zen no quicker", () => {
  withRemains({ forever: false, fadeAwaySec: 10 }, () => {
    for (const mode of ["normal", "turbo"]) {
      const { state } = newGame(mode);
      leaveRemains(state, [{ x: 0, y: 0, cell: block("#aa0000") }]);
      state.paused = true;
      for (let t = 0; t < 20000; t += 16) updateGame(state, 16);
      assert.equal(remainsAt(state, 0, 0)[0]?.age, 0, `${mode}: paused for 20 s, as new`);
      state.paused = false;
      // (as main.js runs it: timeScaleOf × the time that passed, turbo zen quicker)
      const step = 16 * timeScaleOf(state);
      for (let t = 0; t < 9000; t += 16) updateGame(state, step);
      assert.equal(remainsAt(state, 0, 0).length, 1, `${mode}: 9 s on, still there`);
      for (let t = 0; t < 1500; t += 16) updateGame(state, step);
      assert.deepEqual(remainsAt(state, 0, 0), [], `${mode}: 10.5 s on, gone`);
    }
  });
});

test("the renderer draws them again when they change, and as they get older, a sixtieth of fadeAwaySec at a time", () => {
  for (const [secs, times] of [[60, 3], [120, 1]]) withRemains({ forever: false, fadeAwaySec: secs }, () => {
    const state = boardOnly();
    assert.equal(remainsKey(state), "", "none: nothing to draw");
    leaveRemains(state, [{ x: 0, y: 3, cell: block("#aa0000") }]);
    const first = remainsKey(state);
    assert.notEqual(first, "");
    leaveRemains(state, [{ x: 1, y: 3, cell: block("#aa0000") }]);
    const second = remainsKey(state);
    assert.notEqual(second, first, "more of them");
    const keys = new Set([second]);
    for (let t = 0; t < 3000; t += 16) { ageRemains(state, 16); keys.add(remainsKey(state)); }
    assert.equal(keys.size, times + 1, `fading away over ${secs} s, three seconds on: ${times} times`);
  });
  withRemains({ forever: true, fadeAwaySec: 10 }, () => {
    const state = boardOnly();
    leaveRemains(state, [{ x: 0, y: 3, cell: block("#aa0000") }]);
    ageRemains(state, 7500);
    const held = remainsKey(state);
    ageRemains(state, 60000);
    assert.equal(remainsKey(state), held, "there for good, once they've stopped getting older: never");
  });
});

test("none on a new board (a new game), in the tutorial, or switched off", () => {
  const { state } = newGame("normal");
  leaveRemains(state, [{ x: 0, y: ROWS - 1, cell: block("#aa0000") }]);
  assert.equal(remainsAt(state, 0, ROWS - 1).length, 1);
  startRun(state, "normal");
  assert.deepEqual(remainsAt(state, 0, ROWS - 1), [], "a new game");

  const tutorial = newGame("tutorial").state;
  leaveRemains(tutorial, [{ x: 0, y: 0, cell: block("#aa0000") }]);
  assert.deepEqual(remainsAt(tutorial, 0, 0), [], "the tutorial");

  withRemains({ enabled: false }, () => {
    const off = newGame("normal").state;
    leaveRemains(off, [{ x: 0, y: 0, cell: block("#aa0000") }]);
    assert.deepEqual(remainsAt(off, 0, 0), [], "switched off");
  });
});

test("the blocks in play a little lighter: each colour by the gamma liveLift, the darker the more; none of that switched off", () => {
  const channels = (hex) => [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16));
  withRemains({ enabled: true, liveLift: 1.15 }, () => {
    assert.equal(liveLift(), 1.15);
    assert.equal(liftColour("#808080"), "#8c8c8c", "255 × (128 / 255) ^ (1 / 1.15)");
    assert.equal(liftColour("#000000"), "#000000", "black as it is");
    assert.equal(liftColour("#ffffff"), "#ffffff", "and white");
    assert.equal(liftColour("#abc"), liftColour("#aabbcc"), "#rgb as #rrggbb");
    const [r, g, b] = channels(liftColour("#204080"));
    assert.ok(r / 0x20 > g / 0x40 && g / 0x40 > b / 0x80 && b > 0x80, `the darker the more: ${[r, g, b]}`);
    assert.equal(liftColour("rgb(1, 2, 3)"), "rgb(1, 2, 3)", "anything else as it is");
  });
  withRemains({ enabled: true, liveLift: 1 }, () => assert.equal(liftColour("#808080"), "#808080", "gamma 1: as they are"));
  withRemains({ enabled: false, liveLift: 1.5 }, () => {
    assert.equal(liveLift(), 1);
    assert.equal(liftColour("#808080"), "#808080", "switched off: as they are");
  });
});
