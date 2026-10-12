// Run with:  node --test tests/*.test.mjs
// Threads: pieces share loose themes, and often the next one follows a thread.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { GROUPS } from "../shapes/groups.js";
import { THREADS, SET_THREADS } from "../shapes/threads.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, hardDropAndLock, on, updateGame } from "../src/game.js";
import { colourFamily, shapeFamily } from "../src/threads.js";

const { shapes, powerups } = loadShapes(SHAPES);
const all = [...shapes, ...powerups];
const filler = { paint: "#888888", style: { baseColor: "#888888" }, pid: 1e9 };
function setStack(state, rows) {
  const R = state.board.length, C = state.board[0].length;
  state.board = Array.from({ length: R }, (_, y) => Array.from({ length: C }, (_, x) => (y >= R - rows && x !== (y % C) ? { ...filler } : null)));
  state.instances.clear();
}

// pieces served in `mode` over a few games, and how often each follows on from the one before
function play(mode, enabled, seeds = [1, 2, 3, 4]) {
  const was = CONFIG.assist.threads.enabled;
  CONFIG.assist.threads.enabled = enabled;
  const out = { pu: [0, 0], reg: [0, 0], runs: [], games: [] };
  try {
    for (const seed of seeds) {
      const state = createGameState(shapes, powerups, { rng: makeRng(seed * 13), groups: GROUPS, threads: { threads: THREADS, sets: SET_THREADS } });
      const served = [];
      on(state, (t, d) => { if (t === "spawn") served.push(d.shape); });
      startRun(state, mode);
      for (let i = 0; i < 150 && !state.gameOver; i++) { setStack(state, 3); hardDropAndLock(state); for (let k = 0; k < 400 && state.effect; k++) updateGame(state, 16); }
      const themes = (id) => (state.threads.of.get(id) ?? []).filter(n => !n.includes(":"));
      let run = 0;
      for (let i = 1; i < served.length; i++) {
        const s = served[i];
        if (s.difficulty === 6) { run = 0; continue; } // (the sets are themed anyway)
        const prev = new Set(themes(served[i - 1].id)), k = s.powerup ? "pu" : "reg";
        const on = themes(s.id).some(n => prev.has(n));
        out[k][1]++;
        if (on) { out[k][0]++; run++; } else { out.runs.push(run); run = 0; }
      }
      out.games.push(served);
    }
  } finally {
    CONFIG.assist.threads.enabled = was;
  }
  out.reg = out.reg[0] / out.reg[1];
  out.pu = out.pu[0] / Math.max(1, out.pu[1]);
  return out;
}

test("threads: every id is a piece, every live piece is on a theme, and every set has threads", () => {
  const ids = new Set(all.map(s => s.id));
  for (const [name, list] of Object.entries(THREADS)) {
    assert.ok(list.length >= 6, `${name} has ${list.length}`);
    for (const id of list) assert.ok(ids.has(id), `${name}: no piece ${id}`);
  }
  const on = new Set(Object.values(THREADS).flat());
  const missing = all.filter(s => (s.frequency ?? 1) > 0 && !on.has(s.id)).map(s => s.id);
  assert.ok(missing.length <= 25, `not on any theme: ${missing.join(", ")}`);
  for (const g of GROUPS) if ((g.frequency ?? 1) > 0) assert.ok(SET_THREADS[g.id]?.length, `set ${g.id}`);
  // and the colour and shape threads come from the art
  assert.equal(colourFamily(shapes.find(s => s.id === "poppy")) === "red", false, "the poppy is white now");
  assert.equal(shapeFamily(shapes.find(s => s.id === "rapunzels")), "long");
});

test("threads: pieces (and powerups) follow on from each other far more often, with plenty of randomness still", () => {
  for (const mode of ["normal", "god"]) {
    const off = play(mode, false), on = play(mode, true);
    assert.ok(on.reg > off.reg * 1.6, `${mode}: ordinary pieces ${(on.reg * 100).toFixed(0)}% vs ${(off.reg * 100).toFixed(0)}%`);
    assert.ok(on.reg < 0.75, `${mode}: but not always (${(on.reg * 100).toFixed(0)}%)`);
    if (mode === "god") assert.ok(on.pu > off.pu * 2, `powerups ${(on.pu * 100).toFixed(0)}% vs ${(off.pu * 100).toFixed(0)}%`);
    // no theme takes over: runs stay short, and the pieces stay varied
    assert.ok(Math.max(...on.runs) <= 14, `${mode}: a run of ${Math.max(...on.runs)}`);
    for (const game of on.games) {
      const regular = game.filter(s => !s.powerup && s.difficulty !== 6);
      assert.ok(new Set(regular.map(s => s.id)).size > regular.length * 0.65, `${mode}: ${new Set(regular.map(s => s.id)).size} different of ${regular.length} in a game`);
    }
  }
});
