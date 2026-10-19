// Run with:  node --test tests/*.test.mjs
// What destroyed blocks leave behind (src/remains.js), headless (no DOM).
import test from "node:test";
import assert from "node:assert/strict";

import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { loadShapes, getShapePaint } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, updateGame, hardDropAndLock, on, zenRescue, timeScaleOf } from "../src/game.js";
import { leaveRemains, ageRemains, remainsAt, remainsKey, liveLift, liftColour, seedRemains } from "../src/remains.js";

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

test("a block destroyed where one was before takes its place, in a newer layer (being light, they'd add up); the rest of the older one stays behind", () => {
  withRemains({ forever: false, layerSec: 4 }, () => {
    const state = boardOnly();
    leaveRemains(state, [{ x: 1, y: 3, cell: block("#aa0000") }, { x: 2, y: 3, cell: block("#00aa00") }]);
    ageRemains(state, 5000); // (a new layer every 4 s)
    leaveRemains(state, [{ x: 1, y: 3, cell: block("#0000aa") }]);
    assert.deepEqual(paintsAt(state, 1, 3), ["#0000aa"], "the newer, only");
    assert.deepEqual(depthsAt(state, 1, 3), [0]);
    assert.deepEqual(paintsAt(state, 2, 3), ["#00aa00"]);
    assert.deepEqual(depthsAt(state, 2, 3), [1], "a layer back");
    const [front] = remainsAt(state, 1, 3), [back] = remainsAt(state, 2, 3);
    assert.deepEqual(front.style, { baseColor: "#0000aa" });
    assert.ok(front.age < back.age && front.sharp > back.sharp, "the one behind older, its sharp art fainter");

    // (in the same layer, the last destroyed there takes the place of the one before)
    ageRemains(state, 1000);
    leaveRemains(state, [{ x: 1, y: 3, cell: block("#aaaa00") }]);
    assert.deepEqual(paintsAt(state, 1, 3), ["#aaaa00"]);
    // (and a layer left with nothing goes)
    ageRemains(state, 5000);
    leaveRemains(state, [{ x: 2, y: 3, cell: block("#00aaaa") }]);
    assert.equal(state.remains.layers.length, 2);
  });
});

test("no more than `layers` layers: the two nearest in age (for the look of them) go into one", () => {
  for (const forever of [false, true]) withRemains({ forever, sharpSec: 20, softSec: 60, fadeAwaySec: 160, layers: 3, layerSec: 4 }, () => {
    const state = boardOnly();
    // (new layers 0, 5, 50 and 55 s in: 55 s on, 50 and 55 s old are nearer than 0 and 5)
    for (const [t, x] of [[0, 0], [5000, 1], [45000, 2], [5000, 3]]) {
      ageRemains(state, t);
      leaveRemains(state, [{ x, y: 3, cell: block(`#00000${x}`) }]);
      if (x < 2) leaveRemains(state, [{ x: 5, y: 2, cell: block(x ? "#00aa00" : "#aa0000") }]);
    }
    assert.deepEqual([0, 1, 2, 3].map(x => depthsAt(state, x, 3)), [[2], [2], [1], [0]], `forever: ${forever}`);
    assert.deepEqual(paintsAt(state, 5, 2), ["#00aa00"], "gone into one: the newer one there, in place of the older");
    assert.equal(remainsAt(state, 1, 3)[0].age, remainsAt(state, 0, 3)[0].age, "all of it the same age");
    if (forever) return;
    // (fading away, the two of them on average: one cell 55 s old (the other: covered), two 50 s; and it goes as one)
    assert.ok(Math.abs(remainsAt(state, 0, 3)[0].age - 155 / 3 / 160) < 1e-9);
    ageRemains(state, 108000); // (163 s since the first)
    assert.equal(Object.keys(allRemains(state)).length, 5);
    ageRemains(state, 1000);
    assert.deepEqual(Object.keys(allRemains(state)), ["2,3", "3,3"], "the oldest layer's gone, all of it at once");
  });
});

test("the sharp art goes first, then the soft blur; the glow rises as the sharp art goes and lingers longest; red and blue drift apart", () => {
  withRemains({ forever: false, darker: 0.6, faded: 0.5, sharpSec: 10, softSec: 30, softStrength: 0.3, glowStrength: 0.5, fadeAwaySec: 100, rgbShift: 0.2 }, () => {
    const state = boardOnly();
    leaveRemains(state, [{ x: 0, y: 3, cell: block("#aa0000") }]);
    const looks = [];
    for (let s = 0; s < 100; s++) {
      looks.push(remainsAt(state, 0, 3)[0]);
      ageRemains(state, 1000);
    }
    const near = (a, b) => Math.abs(a - b) < 1e-9;
    assert.ok(near(looks[0].sharp, 0.4 * 0.5), `new: the sharp art (1 - darker) × (1 - faded): ${looks[0].sharp}`);
    assert.ok(near(looks[0].soft, 0.3) && near(looks[0].glow, 0.5 * 0.3), "the soft blur at softStrength, the glow a little of glowStrength");
    assert.equal(looks[0].shift, 0, "and red and blue together");
    for (let s = 1; s < 10; s++) {
      assert.ok(looks[s].sharp < looks[s - 1].sharp, `${s} s: the sharp art fainter`);
      assert.ok(looks[s].glow > looks[s - 1].glow, `${s} s: the glow stronger`);
    }
    assert.ok(looks[10].sharp < 1e-9 && looks[10].soft > 0.1, "10 s: the sharp art gone, the soft blur not yet");
    for (let s = 1; s < 30; s++) assert.ok(looks[s].soft < looks[s - 1].soft, `${s} s: the soft blur fainter`);
    for (let s = 1; s < 10; s++) assert.ok(looks[s].shift > looks[s - 1].shift, `${s} s: red and blue further apart`);
    assert.ok(looks[30].soft < 1e-9 && looks[30].glow > 0.3, `30 s: the soft blur gone, the glow still strong: ${looks[30].glow}`);
    assert.ok(near(looks[60].shift, 0.2), "red and blue rgbShift apart");
    for (let s = 11; s < 100; s++) assert.ok(looks[s].glow < looks[s - 1].glow, `${s} s: the glow fading`);
    assert.ok(looks[80].glow > 0.02, `80 s: a little of it still: ${looks[80].glow}`);
    assert.ok(looks[99].glow < 0.001, `nearly gone: ${looks[99].glow}`);
    assert.deepEqual(remainsAt(state, 0, 3), [], "gone after fadeAwaySec");
  });
});

test("there for good, a layer stops getting older once its sharp art has gone, and its glow stays", () => {
  withRemains({ forever: true, sharpSec: 10 }, () => {
    const state = boardOnly(), then = boardOnly();
    leaveRemains(state, [{ x: 0, y: 3, cell: block("#aa0000") }]);
    leaveRemains(then, [{ x: 0, y: 3, cell: block("#aa0000") }]);
    ageRemains(state, 3600 * 1000);
    ageRemains(then, 10000);
    const now = remainsAt(state, 0, 3)[0], was = remainsAt(then, 0, 3)[0];
    assert.deepEqual(now, was, "an hour on, as it was 10 s in");
    assert.ok(now.glow > 0.1, `still there to see: ${now.glow}`);
  });
});

test("they get older only as the game goes on (not while it's paused), and in turbo zen no quicker", () => {
  withRemains({ forever: false, sharpSec: 2, softSec: 5, fadeAwaySec: 10 }, () => {
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

test("the renderer draws them again when they change, and as they get older, often while the sharp art goes, less often after", () => {
  withRemains({ forever: false, sharpSec: 20, softSec: 60, fadeAwaySec: 160 }, () => {
    const state = boardOnly();
    assert.equal(remainsKey(state), "", "none: nothing to draw");
    leaveRemains(state, [{ x: 0, y: 3, cell: block("#aa0000") }]);
    const first = remainsKey(state);
    assert.notEqual(first, "");
    leaveRemains(state, [{ x: 1, y: 3, cell: block("#aa0000") }]);
    const second = remainsKey(state);
    assert.notEqual(second, first, "more of them");
    // (three seconds at a time: new, 30 s on, 70 s on)
    for (const [from, times] of [[0, 6], [30000, 2], [70000, 1]]) {
      ageRemains(state, from - Math.round(state.remains.clock / 1000) * 1000);
      const keys = new Set([remainsKey(state)]);
      for (let t = 0; t < 3000; t += 16) { ageRemains(state, 16); keys.add(remainsKey(state)); }
      assert.equal(keys.size, times + 1, `${from / 1000} s in, three seconds on: ${times} times`);
    }
  });
  withRemains({ forever: true, sharpSec: 10 }, () => {
    const state = boardOnly();
    leaveRemains(state, [{ x: 0, y: 3, cell: block("#aa0000") }]);
    ageRemains(state, 10000);
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

test("made up, as if a game had been going a while: layers of every age, from the pieces' own art; none in the tutorial or switched off", () => {
  withRemains({ forever: false, layers: 12 }, () => {
    const state = boardOnly(10, 20);
    seedRemains(state, shapes, { rng: makeRng(3) });
    const r = state.remains;
    assert.ok(r.layers.length >= 6 && r.layers.length <= 12, `${r.layers.length} layers (some covered over by newer ones)`);
    const paints = new Set(shapes.flatMap(s => s.rotations.flatMap((_, k) => s.rotations[k].flatMap((row, y) => row.map((v, x) => v ? getShapePaint(s, k, x, y) : null)))));
    const ages = new Set();
    let cells = 0;
    for (let y = 0; y < 20; y++) for (let x = 0; x < 10; x++) for (const e of remainsAt(state, x, y)) {
      cells++;
      ages.add(e.age);
      assert.ok(paints.has(e.paint), `${x},${y}: a piece's own art`);
      assert.ok(e.age > 0 && e.age < 1, `${x},${y}: neither new nor gone`);
    }
    assert.ok(cells > 50, `plenty of them: ${cells}`);
    assert.equal(ages.size, r.layers.length, "each layer its own age");
    // (and they go on from there, as any would)
    leaveRemains(state, [{ x: 0, y: 19, cell: block("#aa0000") }]);
    assert.equal(remainsAt(state, 0, 19)[0].paint, "#aa0000");
    assert.equal(remainsAt(state, 0, 19)[0].age, 0);
  });
  for (const [mode, changes] of [["tutorial", {}], ["normal", { enabled: false }]]) withRemains(changes, () => {
    const state = { ...boardOnly(10, 20), mode };
    seedRemains(state, shapes, { rng: makeRng(3) });
    assert.equal(state.remains, undefined, mode);
  });
});

test("made up for a picture that repeats: what goes off one side comes round on the other", () => {
  const wrap = 3, W = 12, H = 8, state = boardOnly(W + 2 * wrap, H + 2 * wrap);
  seedRemains(state, shapes, { rng: makeRng(5), wrap, newest: [{ x: 11, y: 7, cell: block("#aa0000") }] });
  const at = (x, y) => remainsAt(state, x, y).map(e => `${e.paint}@${e.depth}`).join(" ");
  let some = 0;
  for (let y = 0; y < H + 2 * wrap; y++) for (let x = 0; x < wrap; x++) {
    assert.equal(at(x, y), at(x + W, y), `${x},${y}: as the other side`);
    assert.equal(at(x + W + wrap, y), at(x + wrap, y), `${x + W + wrap},${y}`);
    if (at(x, y)) some++;
  }
  for (let x = 0; x < W + 2 * wrap; x++) for (let y = 0; y < wrap; y++) assert.equal(at(x, y), at(x, y + H), `${x},${y}: as the bottom`);
  assert.ok(some > 0, "some came round");
  assert.equal(remainsAt(state, 11 + wrap, 7 + wrap)[0].paint, "#aa0000", "the newest in front");
  assert.equal(remainsAt(state, 11 + wrap - W, 7 + wrap - H)[0].paint, "#aa0000", "and round at the far corner");
});
