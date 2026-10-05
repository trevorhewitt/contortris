// Run with:  node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { touchArea, applyBlast, applyGoo, phantomLandingY, resolveArea, normalisePowerup } from "../src/powerups.js";
import { loadShapes } from "../src/shapes.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, hardDropAndLock, on, updateGame } from "../src/game.js";

const mk = (lines) => lines.map(l => [...l].map(ch => (ch === "." ? null : { ch })));
const show = (b) => b.map(r => r.map(c => (c ? c.ch : ".")).join(""));

test("acid touch area = orthogonal neighbours at reach 1", () => {
  const t = touchArea([[true]], 1);
  assert.equal(t.cells.length, 4);
  const pu = normalisePowerup({ type: "acid", reach: 2 }, [[[true]], [[true]], [[true]], [[true]]]);
  assert.equal(pu.areaRotations[0].cells.length, 12); // diamond of radius 2 minus centre
  assert.equal(pu.consume, true);
});

test("blast throws blocks outward and they fall", () => {
  const b = mk([
    "......",
    "......",
    "..#...",
    ".###..",
  ]);
  const area = resolveArea({ cells: [{ dx: 0, dy: 0 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 }], rows: [], cols: [] }, 2, 2, 6, 4);
  const moves = applyBlast(b, area, 6, 4, { x: 2, y: 2 }, 2, makeRng(1));
  const count = show(b).join("").split("#").length - 1;
  assert.equal(count, 4, "no blocks lost");
  assert.ok(moves.length >= 3, `moves ${moves.length}`);
  for (const m of moves) assert.ok(m.toY === 3 || b[m.toY + 1][m.toX], "landed on something");
});

test("goo fills the lowest reachable gaps first, limited by volume", () => {
  const b = mk([
    "......",
    "##..##",
    "##.###",
    "##.###",
  ]);
  const filled = applyGoo(b, [{ x: 2, y: 0 }, { x: 3, y: 0 }], 3, 6, 4, () => ({ ch: "g" }));
  assert.equal(filled.length, 3);
  assert.deepEqual(show(b), ["......", "##g.##", "##g###", "##g###"]);
});

test("phantom lands in the deepest gap it fits", () => {
  const b = mk([
    "....",
    "####",
    "#.##",
    "####",
  ]);
  assert.equal(phantomLandingY(b, 1, [[true]]), 2);
  assert.equal(phantomLandingY(b, 0, [[true]]), 0);
});

test("progression: first powerup is a destroyer, classes open one at a time", () => {
  const { shapes, powerups } = loadShapes(SHAPES);
  const state = createGameState(shapes, powerups, { rng: makeRng(5) });
  const news = [];
  on(state, (t, d) => { if (t === "spawn" && d.isNew) news.push(d.shape.powerup.type); });
  startRun(state, "normal");
  for (let i = 0; i < 300; i++) {
    hardDropAndLock(state);
    for (let k = 0; k < 120 && state.effect; k++) updateGame(state, 16);
    state.board = state.board.map(r => r.fill(null));
    if (state.gameOver) break;
  }
  assert.ok(news.length >= 4, `introduced ${news.length}`);
  assert.equal(news[0], "destroyer");
  const order = [...new Set(news)];
  assert.ok(order.length >= 2, "more than one class introduced");
});
