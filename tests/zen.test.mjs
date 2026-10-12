// Run with:  node --test tests/*.test.mjs
// Zen mode: it plays itself, and never ends.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { GROUPS } from "../shapes/groups.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, updateGame, hardDropAndLock, markInput, on } from "../src/game.js";
import { zenStart } from "../src/zen.js";

const { shapes, powerups } = loadShapes(SHAPES);
const height = (state) => { const y = state.board.findIndex(r => r.some(Boolean)); return y < 0 ? 0 : state.board.length - y; };

function zen(seed, mode = "zen") {
  const state = createGameState(shapes, powerups, { rng: makeRng(seed), groups: GROUPS });
  const log = { movements: [], rescues: 0, over: false, maxHeight: 0 };
  on(state, (t, d) => {
    if (t === "zenMovement") log.movements.push({ name: d.name, drops: state.drops, lines: state.lines, height: height(state) });
    if (t === "zenRescue") log.rescues++;
    if (t === "gameOver") log.over = true;
    if (t === "lock") log.maxHeight = Math.max(log.maxHeight, height(state));
  });
  startRun(state, mode);
  return { state, log };
}

const run = (state, ms, each = null) => { for (let t = 0; t < ms; t += 32) { each?.(); updateGame(state, 32); } };

test("zen: plays itself for half an hour and never gets near the top", () => {
  const { state, log } = zen(1);
  run(state, 30 * 60000);
  assert.equal(log.over, false);
  assert.equal(log.rescues, 0, "never needed rescuing");
  assert.ok(log.maxHeight <= CONFIG.board.rows - 3, `highest stack ${log.maxHeight}`);
  assert.ok(state.drops > 500 && state.lines > 120, `${state.drops} pieces, ${state.lines} rows`);
  const kinds = new Set(log.movements.map(m => m.name));
  for (const k of ["natural", "rain", "build", "demolition", "giants", "well", "fall"]) assert.ok(kinds.has(k), `no ${k} in ${[...kinds]}`);
});

test("zen: nothing the player does can end it", () => {
  const { state, log } = zen(4);
  // the worst player: every piece straight down, wherever it is
  run(state, 10 * 60000, () => { if (state.active && !state.effect) { markInput(state, "keyboard"); hardDropAndLock(state); } });
  assert.equal(log.over, false);
  assert.equal(state.gameOver, false);
  assert.ok(log.rescues > 0, "it had to be rescued");
  assert.ok(state.drops > 300);
});

test("zen: the well and the long fall clear everything they built", () => {
  for (const name of ["well", "fall"]) {
    for (const seed of [2, 3, 5]) {
      const { state, log } = zen(seed);
      zenStart(state, name);
      run(state, 6 * 60000);
      const i = log.movements.findIndex(m => m.name === name);
      assert.ok(i >= 0 && log.movements[i + 1], `${name} (seed ${seed}) never finished: ${log.movements.map(m => m.name)}`);
      const a = log.movements[i], b = log.movements[i + 1];
      // (the well is 10-16 rows deep; the long fall's piece is at least 5 tall)
      assert.ok(b.lines - a.lines >= (name === "well" ? 10 : 5), `${name} (seed ${seed}) cleared ${b.lines - a.lines} rows`);
      assert.ok(b.height <= 2, `${name} (seed ${seed}) left ${b.height} rows`);
      assert.ok(!log.movements.some(m => m.name === "abandoned"), "nobody stepped in");
    }
  }
});

test("zen: the autopilot lets the player steer, and takes back over when they let go", () => {
  const { state } = zen(6);
  run(state, 5000);
  // the player presses something: the piece is theirs until they've let go for a moment
  markInput(state, "keyboard");
  const piece = state.active, x = piece.x, rot = piece.rotIdx;
  for (let t = 0; t < CONFIG.zen.idleMs - 200; t += 32) {
    updateGame(state, 32);
    if (state.active !== piece) break;
    assert.equal(state.active.x, x, "the autopilot keeps its hands off");
    assert.equal(state.active.rotIdx, rot);
  }
  run(state, 60000);
  assert.ok(state.drops > 20, "and then it carries on by itself");
});

test("turbo zen: the same, faster", () => {
  assert.ok(CONFIG.modes.turbo.zen && CONFIG.modes.turbo.timeScale > 1);
  const { state, log } = zen(8, "turbo");
  run(state, 5 * 60000);
  assert.equal(log.over, false);
  assert.ok(state.drops > 80);
});
