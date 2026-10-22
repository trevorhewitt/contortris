// Run with:  node --test tests/
// The start of a game plays nicely (CONFIG.assist.warmup): the pieces lean to the ones that fit
// the board, the level 6 sets mostly wait, and it all fades out; later it gets harder
// (CONFIG.difficulty).
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { GROUPS } from "../shapes/groups.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, fallMs } from "../src/game.js";
import { selectPiece, fitBadness } from "../src/selection.js";
import { warmth } from "../src/pacing.js";
import { hardness, rampDropMs } from "../src/difficulty.js";

const { shapes, powerups } = loadShapes(SHAPES);
const { cols, rows } = CONFIG.board;
const byId = (id) => shapes.find(s => s.id === id);

// A bumpy stack, the same every time: a gap here and there for the right piece.
function bumpy(state) {
  const tops = [3, 1, 2, 4, 2, 0, 3, 3, 1, 2, 4, 1, 2, 3];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) state.board[y][x] = rows - y <= tops[x % tops.length] + 2 ? { pid: 1 } : null;
}

test("fitBadness: what a piece leaves under itself at its best", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(1) });
  for (const row of state.board) row.fill(null);
  // a flat floor: a straight piece sits flat
  assert.equal(fitBadness(state.board, byId("lentil") ?? shapes.find(s => s.rotations[0].flat().filter(Boolean).length === 1)), 0);
  // a floor with one notch of a single cell: a single block finishes the row
  for (let x = 1; x < cols; x++) state.board[rows - 1][x] = { pid: 1 };
  const one = shapes.find(s => s.rotations.length && s.rotations[0].length === 1 && s.rotations[0][0].length === 1);
  assert.ok(fitBadness(state.board, one) < 0, "finishes a row");
  // a piece that can't help leaving gaps, whichever way it goes, comes out worse than one that sits flat
  const ring = shapes.find(s => s.rotations.every(m => m.length >= 3 && m[0].length >= 3 && !m[m.length - 1].every(Boolean) && !m[0].every(Boolean)));
  if (ring) assert.ok(fitBadness(state.board, ring) > 0, `${ring.id} leaves gaps`);
});

test("the warm-up: the pieces fit better at the start of a game than without it, and it fades", () => {
  const run = (on) => {
    const was = CONFIG.modes.normal.warmup;
    CONFIG.modes.normal.warmup = on;
    let bad = 0, n = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const state = createGameState(shapes, powerups, { rng: makeRng(seed), groups: GROUPS });
      startRun(state, "normal");
      bumpy(state);
      for (let i = 0; i < 20; i++) {
        const s = selectPiece(state);
        if (s.powerup || (s.difficulty ?? 1) >= 4) continue;
        bad += Math.max(0, fitBadness(state.board, s)); n++;
      }
    }
    CONFIG.modes.normal.warmup = was;
    return bad / n;
  };
  const warm = run(true), cold = run(false);
  assert.ok(warm < cold * 0.6, `gaps left: ${warm.toFixed(2)} a piece in the warm-up, ${cold.toFixed(2)} without`);
  const state = { mode: "normal", pieceSel: { dropIndex: 1 } };
  assert.equal(warmth(state), 1);
  state.pieceSel.dropIndex = CONFIG.assist.warmup.goneBy;
  assert.equal(warmth(state), 0);
  assert.equal(warmth({ mode: "extreme", pieceSel: { dropIndex: 1 } }), 0, "not in extreme: the original");
  assert.equal(warmth({ mode: "god", pieceSel: { dropIndex: 1 } }), 0, "not in God mode: everything, right away");
});

test("later on the mix opens up: more of the awkward levels", () => {
  const share = (drop) => {
    let hard = 0, n = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const state = createGameState(shapes, powerups, { rng: makeRng(seed) });
      startRun(state, "normal");
      for (const row of state.board) row.fill(null);
      state.pieceSel.dropIndex = drop;
      for (let i = 0; i < 20; i++) {
        state.pieceSel.dropIndex = drop;
        const s = selectPiece(state);
        if (s.powerup || (s.difficulty ?? 1) >= 6) continue;
        n++; if ((s.difficulty ?? 1) >= 3) hard++;
      }
    }
    return hard / n;
  };
  const D = CONFIG.difficulty.normal, end = D.start + D.length;
  assert.equal(hardness({ mode: "normal", pieceSel: { dropIndex: end } }), D.hardest);
  const early = share(CONFIG.assist.warmup.goneBy), late = share(end);
  assert.ok(late > early * 1.4, `level 3 and up: ${(early * 100).toFixed(0)}% after the warm-up, ${(late * 100).toFixed(0)}% later on`);
});

test("the speed goes by how far into the game it is, felt all the way: a bit faster with every piece", () => {
  const D = CONFIG.difficulty.normal, end = D.start + D.length, s = D.speed;
  const at = (n) => rampDropMs({ mode: "normal", pieceSel: { dropIndex: n } }, 9999);
  assert.equal(at(0), s.fromMs, "the start");
  assert.equal(at(end), s.toMs, "the end of the climb");
  // (the same few per cent faster every stretch of the climb, not all at the start)
  const steps = [0, 1, 2, 3].map(k => at(Math.round(end * (k + 1) / 4)) / at(Math.round(end * k / 4)));
  for (const r of steps) assert.ok(Math.abs(r - steps[0]) < 0.03, `each quarter ${steps.map(x => x.toFixed(2)).join(" ")}`);
  assert.ok(at(end + 50) < at(end), "and faster after it");
  assert.equal(at(end + 5000), s.minMs, "down to the fastest");
  assert.equal(rampDropMs({ mode: "extreme", pieceSel: { dropIndex: 300 } }, 123), 123, "Extreme: by the rows, as ever");
});

test("the biggest level 6 pieces fall a little slower, for the sense of scale (not the small ones)", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(5), groups: GROUPS });
  startRun(state, "normal");
  state.dropMs = 100;
  const big = shapes.find(s => s.difficulty === 6 && s.rotations[0].flat().filter(Boolean).length >= 60);
  const small = shapes.find(s => s.difficulty === 6 && s.rotations[0].flat().filter(Boolean).length <= 4 && s.rotations[0].length * s.rotations[0][0].length <= 8);
  const giant = shapes.find(s => s.difficulty === 5);
  const fall = (shape) => { state.active = { shape, rotIdx: 0, x: 0, y: -shape.rotations[0].length }; return fallMs(state); };
  const most = CONFIG.difficulty.normal.slowBig.most;
  assert.equal(fall(big), Math.round(100 * most), `${big.id}: the slowest`);
  assert.equal(fall(small), 100, `${small.id}: as fast as anything`);
  assert.equal(fall(giant), 100, "a giant that isn't in a set: as fast as anything");
  state.dropMs = CONFIG.difficulty.normal.speed.fromMs;
  assert.equal(fall(big), state.dropMs, "never slower than at the start");
});
