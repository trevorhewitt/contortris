// Run with:  node --test tests/*.test.mjs
// Zen mode: it plays itself, fills the board to the brink and brings it all down, and never ends.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { GROUPS } from "../shapes/groups.js";
import { THREADS, SET_THREADS } from "../shapes/threads.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, updateGame, hardDropAndLock, markInput, tryMove, on } from "../src/game.js";
import { zenStart, zenIgnoreInput } from "../src/zen.js";

const { shapes, powerups } = loadShapes(SHAPES);
const { rows, cols } = CONFIG.board;
const height = (state) => { const y = state.board.findIndex(r => r.some(Boolean)); return y < 0 ? 0 : rows - y; };

function zen(seed, mode = "zen") {
  const state = createGameState(shapes, powerups, { rng: makeRng(seed), groups: GROUPS, threads: { threads: THREADS, sets: SET_THREADS } });
  const log = { movements: [], rescues: 0, over: false, maxHeight: 0, clears: [], callouts: [], high: 0, frames: 0 };
  on(state, (t, d) => {
    if (t === "zenMovement") log.movements.push({ name: d.name, caption: d.caption, drops: state.drops, lines: state.lines, height: height(state) });
    if (t === "zenRescue") log.rescues++;
    if (t === "gameOver") log.over = true;
    if (t === "lock") log.maxHeight = Math.max(log.maxHeight, height(state));
    if (t === "rowsDestroyed" && d.source === "clear") { log.clears.push(d.count); log.callouts.push(...state.fx.callouts.map(c => c.text)); }
  });
  startRun(state, mode);
  return { state, log };
}

const run = (state, log, ms, each = null) => {
  for (let t = 0; t < ms; t += 32) {
    each?.();
    updateGame(state, 32);
    if (log) { log.frames++; if (height(state) >= rows - 6) log.high++; }
  }
};

test("zen: plays itself for half an hour, filling the board to the brink and bringing it all down", () => {
  const { state, log } = zen(1);
  run(state, log, 30 * 60000);
  assert.equal(log.over, false);
  assert.equal(log.rescues, 0, "never needed rescuing");
  assert.ok(state.drops > 1000, `${state.drops} pieces`);
  // it spends a good while near the top...
  assert.ok(log.high / log.frames > 0.15, `near the top ${(log.high / log.frames * 100).toFixed(0)}% of the time`);
  // ...and often the whole board goes at once (the tallest pieces drop into the last column)
  assert.ok(log.clears.filter(n => n === rows).length >= 3, `whole-board clears: ${log.clears.filter(n => n === rows).length}`);
  assert.ok(log.callouts.some(c => /quattuorvigintuple/.test(c)), "and it has a name");
  const kinds = new Set(log.movements.map(m => m.name));
  for (const k of ["natural", "build", "demolition", "column", "beds", "crack", "mess"]) assert.ok(kinds.has(k), `no ${k} in ${[...kinds]}`);
});

test("zen: every piece starts out over the place it's going, already turned", () => {
  const { state, log } = zen(2);
  let checked = 0, planned = 0;
  on(state, (t) => {
    if (t !== "spawn") return;
    const z = state.zen, a = state.active, want = z.current?.target ?? z.target;
    if (!want) return;
    assert.equal(a.rotIdx, want.rot, `${a.shape.id} turned`);
    assert.equal(a.x, want.x, `${a.shape.id} over its place`);
    checked++;
    if (z.current?.target) planned++;
  });
  zenStart(state, "column");
  run(state, log, 3 * 60000);
  assert.ok(checked > 100 && planned > 30, `${checked} pieces, ${planned} of them planned`);
});

test("zen: once the player touches a piece it's theirs, and the next one is the computer's again", () => {
  const { state } = zen(3);
  run(state, null, 4000);
  while (!state.active || state.effect || state.active.y < 0) updateGame(state, 16);
  const piece = state.active;
  // the player nudges it, as far left as it goes
  markInput(state, "keyboard");
  while (tryMove(state, -1, 0)) { /* all the way */ }
  const x = piece.x, rot = piece.rotIdx;
  updateGame(state, 16);
  assert.equal(state.zen.userHas, true);
  assert.equal(state.dropMs, CONFIG.zen.dropMs, "it falls at the player's pace now");
  for (let t = 0; t < 60000 && state.active === piece; t += 16) {
    updateGame(state, 16);
    if (state.active !== piece) break;
    assert.equal(piece.x, x, "the game never moves it back");
    assert.equal(piece.rotIdx, rot);
  }
  assert.notEqual(state.active, piece, "it landed");
  assert.equal(state.zen.userHas, false, "the next piece is the computer's");
  assert.ok(state.dropMs < CONFIG.zen.dropMs);
  // (and coming back from a pause isn't taking it over)
  markInput(state, "touch");
  zenIgnoreInput(state);
  updateGame(state, 16);
  assert.equal(state.zen.userHas, false);
});

test("zen: nothing the player does can end it", () => {
  const { state, log } = zen(4);
  // the worst player: every piece shoved against a wall and dropped
  let side = -1;
  run(state, log, 10 * 60000, () => {
    if (!state.active || state.effect || state.active.shape.powerup) return;
    markInput(state, "keyboard");
    while (tryMove(state, side, 0)) { /* to the wall */ }
    side = -side;
    hardDropAndLock(state);
  });
  assert.equal(log.over, false);
  assert.equal(state.gameOver, false);
  assert.ok(log.movements.some(m => m.name === "steady"), "a big powerup came to steady it");
  assert.ok(state.drops > 300);
});

test("zen: each planned movement builds right up and then clears what it built", () => {
  // (rows cleared at least, and the board left nearly empty)
  const want = { column: rows, beds: rows, crack: 14, well: 10, fall: 5 };
  for (const [name, least] of Object.entries(want)) {
    for (const seed of [2, 5]) {
      const { state, log } = zen(seed);
      zenStart(state, name);
      log.movements.length = 0; // (only from here on)
      run(state, log, 5 * 60000);
      const i = log.movements.findIndex(m => m.name === name);
      assert.ok(i >= 0 && log.movements[i + 1], `${name} (seed ${seed}) never finished: ${log.movements.map(m => m.name)}`);
      const a = log.movements[i], b = log.movements[i + 1];
      assert.ok(b.lines - a.lines >= least, `${name} (seed ${seed}) cleared ${b.lines - a.lines} rows`);
      assert.ok(b.height <= 3, `${name} (seed ${seed}) left ${b.height} rows`);
      if (least === rows) assert.ok(log.clears.includes(rows), `${name}: all ${rows} rows at once`);
      assert.ok(!log.movements.some(m => m.name === "abandoned"), "nobody stepped in");
    }
  }
});

test("zen: a mess is built nearly to the top, full of gaps, and then demolished", () => {
  const { state, log } = zen(6);
  let top = 0, gaps = 0;
  on(state, (t, d) => {
    if (t === "zenMovement" && d.name === "demolition") {
      top = height(state);
      for (let x = 0; x < cols; x++) for (let y = rows - top, seen = false; y < rows; y++) { if (state.board[y][x]) seen = true; else if (seen) gaps++; }
    }
  });
  zenStart(state, "mess");
  log.movements.length = 0;
  run(state, log, 4 * 60000);
  const i = log.movements.findIndex(m => m.name === "demolition");
  assert.ok(i >= 0 && log.movements[i + 1], `never finished: ${log.movements.map(m => m.name)}`);
  assert.ok(top >= rows - 6, `built ${top} rows`);
  assert.ok(gaps >= 10, `${gaps} gaps`);
  assert.ok(log.movements[i + 1].height <= 8, `left ${log.movements[i + 1].height} rows`);
});

test("turbo zen: faster, with movements of its own", () => {
  assert.ok(CONFIG.modes.turbo.zen && CONFIG.modes.turbo.timeScale > 1);
  const { state, log } = zen(8, "turbo");
  run(state, log, 12 * 60000);
  assert.equal(log.over, false);
  assert.ok(state.drops > 600, `${state.drops} pieces`);
  const kinds = new Set(log.movements.map(m => m.name));
  assert.ok(["mono", "small", "big", "chorus"].filter(k => kinds.has(k)).length >= 2, `${[...kinds]}`);
});

test("row clears have names all the way up to the whole board", () => {
  const names = CONFIG.fx.callouts.multiRow;
  for (let n = 2; n <= rows; n++) assert.ok(names[n], `no name for ${n}`);
  assert.equal(new Set(Object.values(names)).size, Object.keys(names).length);
  assert.match(names[rows], /^quattuorvigintuple/);
});
