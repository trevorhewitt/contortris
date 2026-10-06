import { CONFIG } from "../config.js";
// Run with:  node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { touchArea, applyBlast, applyGoo, phantomLandingY, resolveArea, normalisePowerup, resolvePowerupArea, computeEffect } from "../src/powerups.js";
import { loadShapes } from "../src/shapes.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, hardDropAndLock, on, updateGame, tryRotate } from "../src/game.js";

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

test("progression: classes open one at a time, starting with a simple one", () => {
  const { shapes, powerups } = loadShapes(SHAPES);
  const firsts = new Set();
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const state = createGameState(shapes, powerups, { rng: makeRng(seed) });
    const news = [];
    const seen = [];
    on(state, (t, d) => {
      if (t !== "spawn" || !d.shape.powerup) return;
      seen.push(d.shape.powerup.cls);
      if (d.isNew) news.push(d.shape.powerup.cls);
    });
    startRun(state, "normal");
    for (let i = 0; i < 300; i++) {
      hardDropAndLock(state);
      for (let k = 0; k < 120 && state.effect; k++) updateGame(state, 16);
      state.board = state.board.map(r => r.fill(null));
      if (state.gameOver) break;
    }
    assert.equal(new Set(news).size, news.length, "each class's intro shows once");
    // (the board is cleared every drop, so phantoms, useless on an empty board, are rare here)
    assert.ok(news.length >= 3, `classes introduced ${news.length}`);
    assert.ok(CONFIG.assist.powerups.progression.firstClassPool.includes(news[0]));
    firsts.add(news[0]);
    // the first few powerups all belong to the first class, and there's variety inside it
    const opening = seen.slice(0, 4);
    assert.ok(opening.every(t => t === news[0]), opening.join());
    // combos only once two classes are in
    const firstCombo = seen.indexOf("combo");
    if (firstCombo >= 0) assert.ok(new Set(seen.slice(0, firstCombo)).size >= 2, "combo before two classes");
    assert.ok(!seen.includes("blast") && !seen.includes("goo"), "switched-off classes never turn up");
  }
  assert.ok(firsts.size >= 2, "the first class varies between games");
});

test("easy mode has no giants; normal gets one early", () => {
  const { shapes, powerups } = loadShapes(SHAPES);
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    for (const mode of ["easy", "normal", "extreme"]) {
      const state = createGameState(shapes, powerups, { rng: makeRng(seed * 31) });
      const lv = [];
      on(state, (t, d) => { if (t === "spawn") lv.push(d.shape.powerup ? -1 : d.shape.difficulty); });
      startRun(state, mode);
      for (let i = 0; i < 60 && !state.gameOver; i++) {
        hardDropAndLock(state);
        for (let k = 0; k < 120 && state.effect; k++) updateGame(state, 16);
        state.board = state.board.map(r => r.fill(null));
      }
      for (let i = 1; i < lv.length; i++) assert.ok(!(lv[i] >= 4 && lv[i - 1] >= 4), "no two giants in a row");
      if (mode === "easy") assert.ok(!lv.some(l => l >= 4), "easy has no giants");
      else {
        const first = lv.indexOf(5) + 1;
        const [a, b] = CONFIG.assist.pieceMix.hard.firstGiantBetween;
        assert.ok(first >= a && first <= b, `${mode} first giant at ${first}`);
      }
    }
  }
});

test("combo: destroys a row, then its column falls", () => {
  const raw = [{
    id: "test_combo", name: "a pile driver", grid: ["X"], color: "#ff0000", frequency: 1, rotation: { mode: "none" },
    powerup: {
      type: "combo", tier: 2,
      parts: [
        // listed gravity first on purpose: destroyers always fire first
        { type: "gravity", direction: "down", area: { origin: [0, 0], grid: ["|"] } },
        { type: "destroyer", area: { origin: [0, 0], grid: [".", "-"] } },
      ],
    },
  }];
  const { powerups } = loadShapes(raw);
  const pu = powerups[0].powerup;
  assert.deepEqual(pu.parts.map(p => p.type), ["destroyer", "gravity"]);
  const b = mk([
    ".....",
    "..X..", // the combo lands here (x=2, y=1)
    "#####", // destroyed
    "#.#.#",
    "##.##", // the hole under the column
  ]);
  const area = resolvePowerupArea(pu, 0, 2, 1, 5, 5);
  const fx = computeEffect(b, pu, { area, placed: [{ x: 2, y: 1 }], pid: null, centre: { x: 2, y: 1 }, cols: 5, rows: 5 });
  assert.equal(fx.destroyed.length, 5);
  assert.deepEqual(show(b), [".....", ".....", ".....", "#...#", "#####"]);
  assert.equal(fx.moves.length, 1, "the block in its column fell into the hole");
});

test("phantoms rotate, even while overlapping blocks", () => {
  const { shapes, powerups } = loadShapes(SHAPES);
  const state = createGameState(shapes, powerups, { rng: makeRng(3) });
  startRun(state, "normal");
  const worm = powerups.find(p => p.id === "ghost_worm");
  assert.ok(worm.rotations.length > 1, "ghost_worm has rotations");
  // fill the board's lower half so the phantom sits inside blocks
  for (let y = 10; y < state.board.length; y++) for (let x = 0; x < state.board[0].length; x++) state.board[y][x] = (x === 5 && y > 20) ? null : { pid: 999 };
  state.active = { shape: worm, rotIdx: 0, x: 5, y: 12 };
  assert.ok(tryRotate(state), "rotated inside the stack");
  assert.equal(state.active.rotIdx, 1);
});

test("combos actually turn up, and soon after two classes are in", () => {
  const { shapes, powerups } = loadShapes(SHAPES);
  let games = 0, withCombo = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const state = createGameState(shapes, powerups, { rng: makeRng(seed * 97) });
    let first = null, i = 0;
    on(state, (t, d) => { if (t === "spawn") { i++; if (d.shape.powerup?.type === "combo" && first == null) first = i; } });
    startRun(state, "normal");
    for (let k = 0; k < 120 && !state.gameOver; k++) {
      hardDropAndLock(state);
      for (let j = 0; j < 200 && state.effect; j++) updateGame(state, 16);
      state.board = state.board.map(r => r.fill(null));
    }
    games++;
    if (first != null && first <= 80) withCombo++;
  }
  assert.ok(withCombo >= games - 1, `combo within 80 pieces in ${withCombo}/${games} games`);
});
