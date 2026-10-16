import { CONFIG } from "../config.js";
// Run with:  node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { touchArea, applyBlast, applyGoo, phantomLandingY, resolveArea, normalisePowerup, resolvePowerupArea, computeEffect } from "../src/powerups.js";
import { loadShapes } from "../src/shapes.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, hardDropAndLock, on, updateGame, tryRotate, tryMove } from "../src/game.js";

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

// Is there a combo (not banished) made of only these two classes?
const pairHasCombo = (powerups, a, b) => powerups.some(p => p.powerup.type === "combo" && (p.frequency ?? 1) > 0 && (p.powerup.parts ?? []).every(e => e.type === a || e.type === b));

test("progression: classes open one at a time, starting with a simple one", () => {
  const { shapes, powerups } = loadShapes(SHAPES);
  const firsts = new Set();
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const state = createGameState(shapes, powerups, { rng: makeRng(seed) });
    const news = [];
    const seen = [];
    const at = [];
    on(state, (t, d) => {
      if (t !== "spawn") return;
      if (!d.shape.powerup) return;
      seen.push(d.shape.powerup.cls);
      at.push(state.pieceSel.dropIndex);
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
    // the second class only opens after newClassEvery powerups of the first, or once
    // newClassAfterDrops pieces have gone by (or sooner, when the first class had nothing that
    // would help and a powerup was swapped for one of the next class's: stillUseful)
    const prog = CONFIG.assist.powerups.progression;
    const second = seen.findIndex(t => t !== news[0]);
    if (second >= 0 && !state.pieceSel.powerup.openedBySwap?.has(seen[second])) {
      assert.ok(second >= prog.newClassEvery || at[second] - at[0] >= prog.newClassAfterDrops - 2,
        `second class too soon: ${seen.slice(0, second + 1).join()} at ${at.slice(0, second + 1).join()}`);
    }
    // combos only once two classes are in
    const firstCombo = seen.indexOf("combo");
    if (firstCombo >= 0) assert.ok(new Set(seen.slice(0, firstCombo)).size >= 2, "combo before two classes");
    // the gravitizers are always one of the first two, and the third class waits for the combos
    // of the first two (CONFIG.assist.powerups.progression: early, combosBeforeThird)
    const classes = news.filter(c => c !== "combo");
    if (classes.length >= 2) assert.ok(classes.slice(0, 2).includes(prog.early), `${prog.early} in the first two: ${news.join(" > ")}`);
    // (where there's a combo of just those two, that is: none is left of the Expanderz and the
    // gravitizers, say, if they're all banished)
    if (classes.length >= 3 && pairHasCombo(powerups, classes[0], classes[1])) assert.ok(news.indexOf("combo") >= 0 && news.indexOf("combo") < news.indexOf(classes[2]), `combos before the third class: ${news.join(" > ")}`);
    assert.ok(!seen.includes("blast") && !seen.includes("goo"), "switched-off classes never turn up");
  }
  assert.ok(firsts.size >= 2, "the first class varies between games");
});

test("easy mode has no giants; normal gets one early", () => {
  const { shapes, powerups } = loadShapes(SHAPES);
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    for (const mode of ["easy", "normal", "extreme"]) {
      const state = createGameState(shapes, powerups, { rng: makeRng(seed * 31) });
      const lv = [], ids = [];
      on(state, (t, d) => { if (t === "spawn") { lv.push(d.shape.powerup ? -1 : d.shape.difficulty); ids.push(d.shape.id); } });
      startRun(state, mode);
      for (let i = 0; i < 60 && !state.gameOver; i++) {
        hardDropAndLock(state);
        for (let k = 0; k < 120 && state.effect; k++) updateGame(state, 16);
        state.board = state.board.map(r => r.fill(null));
      }
      // (except a chain: a giant that always follows the one before, like nothing -> everything)
      const chained = (a, b) => { const s = SHAPES.find(x => x.id === a); const i = s?.nextShapes?.indexOf(b) ?? -1; return i >= 0 && s.nextShapeProbs[i] >= 1; };
      for (let i = 1; i < lv.length; i++) assert.ok(!(lv[i] >= 4 && lv[i - 1] >= 4) || chained(ids[i - 1], ids[i]), `no two giants in a row: ${ids[i - 1]}, ${ids[i]}`);
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

test("phantoms rotate inside the stack, but never move up", () => {
  const { shapes, powerups } = loadShapes(SHAPES);
  const state = createGameState(shapes, powerups, { rng: makeRng(3) });
  startRun(state, "normal");
  const worm = powerups.find(p => p.id === "ghost_worm");
  if (!worm) return; // (the phantoms are out of the game for now)
  assert.ok(worm.rotations.length > 1, "ghost_worm has rotations");
  const R = state.board.length, C = state.board[0].length;
  // the lower half full, with a 4x4 cavity at the bottom: the worm fits there either way round
  const fill = (hole) => { for (let y = 10; y < R; y++) for (let x = 0; x < C; x++) state.board[y][x] = hole(x, y) ? null : { pid: 999 }; };
  fill((x, y) => x >= 4 && x <= 7 && y >= R - 4);
  state.active = { shape: worm, rotIdx: 0, x: 5, y: 12 };
  assert.ok(tryRotate(state), "rotated inside the stack");
  assert.equal(state.active.rotIdx, 1);
  assert.equal(state.active.y, 12, "no jump");
  // a one-wide slot only fits it upright: turning it flat would mean going back up, so no
  fill((x, y) => x === 5 && y >= R - 4);
  state.active = { shape: worm, rotIdx: 0, x: 5, y: 14 };
  assert.equal(tryRotate(state), false, "can't turn: it would have to go up");
  assert.equal(state.active.y, 14);
  // and it can't slide sideways into a column whose landing spot is above it
  assert.equal(tryMove(state, 2, 0), false, "no sideways move upwards");
  assert.equal(state.active.y, 14);
});

test("rotation: small pieces never hop over blocks, and never move up", () => {
  const { shapes, powerups } = loadShapes(SHAPES);
  const state = createGameState(shapes, powerups, { rng: makeRng(5) });
  startRun(state, "extreme");
  const [bar] = loadShapes([{ id: "bar3", name: "bar", grid: ["X", "X", "X"], difficulty: 1 }]).shapes;
  const R = state.board.length;
  // a one-wide well at x = 3, walls of blocks either side, open board beyond them
  state.board = state.board.map((row, y) => row.map((_, x) => (y >= R - 6 && x !== 3 && x !== 7 && x !== 8) ? { pid: 999 } : null));
  state.active = { shape: bar, rotIdx: 0, x: 3, y: R - 4 };
  assert.equal(tryRotate(state), false, "no room to turn in the well, and no hopping out of it");
  assert.equal(state.active.x, 3);
  assert.equal(state.active.y, R - 4, "not lifted out either");
});

test("combos actually turn up, and soon after two classes are in", () => {
  const { shapes, powerups } = loadShapes(SHAPES);
  let games = 0, withCombo = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const state = createGameState(shapes, powerups, { rng: makeRng(seed * 97) });
    let first = null, i = 0;
    on(state, (t, d) => { if (t === "spawn") { i++; if (d.shape.powerup?.type === "combo" && first == null) first = i; } });
    startRun(state, "normal");
    // (each drop onto a low stack with a gap in every row, so there's something for a combo to do)
    const filler = { paint: "#888888", style: { baseColor: "#888888" }, pid: 1e9 };
    for (let k = 0; k < 120 && !state.gameOver; k++) {
      const R = state.board.length, C = state.board[0].length;
      state.board = Array.from({ length: R }, (_, y) => Array.from({ length: C }, (_, x) => (y >= R - 3 && x !== (y % C) ? { ...filler } : null)));
      state.instances.clear();
      hardDropAndLock(state);
      for (let j = 0; j < 200 && state.effect; j++) updateGame(state, 16);
    }
    // (only the games whose first two classes have a combo of their own: pairHasCombo)
    const [a, b] = state.pieceSel.powerup.classes.filter(c => c !== "combo");
    if (b && !pairHasCombo(powerups, a, b)) continue;
    games++;
    if (first != null && first <= 100) withCombo++;
  }
  assert.ok(withCombo >= games - 1, `combo within 100 pieces in ${withCombo}/${games} games`);
});

test("powerup effects never rotate with the piece", () => {
  const raw = [{ id: "rot_test", name: "t", grid: ["XXX"], color: "#ff0000", frequency: 1, rotation: { mode: "any" },
    powerup: { type: "destroyer", tier: 1, area: { origin: [0, 0], grid: ["...", "###"] } } }];
  const { powerups } = loadShapes(raw);
  const p = powerups[0];
  assert.ok(p.rotations.length > 1);
  // rotation 0: the three cells under a 3x1 piece. Rotation 1 (1x3 upright): still three cells side
  // by side (a row, not a column), centred on the piece the same way (and where it lay before it
  // turned goes with them: a row too).
  const rowsOf = (a, own) => new Set(a.cells.filter(c => !!c.own === own).map(c => c.dy)).size;
  for (const a of p.powerup.areaRotations) assert.ok(rowsOf(a, false) === 1 && rowsOf(a, true) <= 1, JSON.stringify(a.cells));
  assert.equal(p.powerup.areaRotations[1].cells.filter(c => c.own).length, 2, "the two cells beside it where it lay");
});

test("a powerup's intro comes just before it falls, and until then the next-piece preview shows it as a plain piece", async () => {
  const { introduced } = await import("../src/game.js");
  const { shapes, powerups } = loadShapes(SHAPES);
  for (const seed of [1, 2, 3, 4, 5]) {
    const state = createGameState(shapes, powerups, { rng: makeRng(seed) });
    const intros = [];
    let plainBefore = 0;
    on(state, (t, d) => {
      if (t !== "spawn") return;
      if (d.isNew) intros.push(d.shape.powerup.cls);
      // (the next piece, shown in the preview: a class not yet introduced isn't given away)
      if (d.next?.powerup && !state.pieceSel.powerup.shownClasses.has(d.next.powerup.cls)) {
        assert.equal(introduced(state, d.next), false);
        plainBefore++;
      }
    });
    startRun(state, "normal");
    for (let i = 0; i < 200; i++) {
      hardDropAndLock(state);
      for (let k = 0; k < 120 && state.effect; k++) updateGame(state, 16);
      state.board = state.board.map(r => r.fill(null));
      if (state.gameOver) break;
    }
    assert.ok(intros.length >= 2, `intros ${intros.join()}`);
    assert.ok(plainBefore >= 1, "a new class's first powerup was shown plain in the preview first");
  }
});
