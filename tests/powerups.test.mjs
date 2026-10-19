// Run with:  node --test tests/
import test from "node:test";
import assert from "node:assert/strict";

import {
  parseArea,
  rotateArea90CW,
  normalisePowerup,
  resolveArea,
  applyDestroy,
  applyGravity,
  applyExpand,
  collapseRows,
  analyseBoard,
} from "../src/powerups.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { loadShapes } from "../src/shapes.js";
import { CONFIG } from "../config.js";
const POWERUPS = SHAPES.filter(s => s.powerup);

// Board helpers: rows of "#" (block) and "." (empty).
function makeBoard(lines) {
  return lines.map((line, y) => [...line].map((ch, x) => (ch === "." ? null : { id: `${x},${y}`, ch })));
}
function show(board) {
  return board.map(row => row.map(c => (c ? c.ch : ".")).join(""));
}
const cols = (b) => b[0].length;

test("parseArea: cells, rows and columns relative to the piece", () => {
  const a = parseArea({ origin: [1, 1], grid: ["#.|", ".-.", "+.."] });
  assert.deepEqual(a.cells, [{ dx: -1, dy: -1 }]);
  assert.deepEqual(a.rows, [0, 1]);
  assert.deepEqual(a.cols, [-1, 1]);
});

test("parseArea honours trimmed piece grids", () => {
  // piece grid ".X" trims 1 col off the left, so the origin shifts by -1
  const a = parseArea({ origin: [0, 0], grid: [".#"] }, { top: 0, left: 1 });
  assert.deepEqual(a.cells, [{ dx: 0, dy: 0 }]);
});

test("rotateArea90CW follows the piece rotation (rows become columns)", () => {
  // piece 1 wide x 2 tall; area: cell above it, whole row of its top block
  const a = { cells: [{ dx: 0, dy: -1 }], rows: [0], cols: [] };
  const r = rotateArea90CW(a, 2);
  // after rotating CW the piece is 2 wide x 1 tall; "above" becomes "right"
  assert.deepEqual(r.cells, [{ dx: 2, dy: 0 }]);
  assert.deepEqual(r.rows, []);
  assert.deepEqual(r.cols, [1]);
});

test("every bundled powerup normalises with a non-empty area", () => {
  for (const p of POWERUPS) {
    const rotations = [[[true]]]; // only rotation 0 is used by area normalisation here
    const pu = normalisePowerup(p.powerup, rotations, { top: 0, left: 0 }, p.id);
    assert.ok(pu, `${p.id} normalises`);
    const a = pu.areaRotations[0];
    if (pu.type !== "goo" && pu.type !== "phantom") {
      assert.ok(a.cells.length + a.rows.length + a.cols.length + a.downs.length > 0, `${p.id} has an area`);
    }
    assert.ok(pu.description.length > 0);
  }
});

test("default consume: destroyer/gravity vanish, expander stays", () => {
  const rot = [[[true]]];
  assert.equal(normalisePowerup({ type: "destroyer", area: { grid: ["#"] } }, rot).consume, true);
  assert.equal(normalisePowerup({ type: "gravity", area: { grid: ["#"] } }, rot).consume, true);
  assert.equal(normalisePowerup({ type: "expander", area: { grid: ["#"] } }, rot).consume, false);
  assert.equal(normalisePowerup({ type: "expander", consume: true, area: { grid: ["#"] } }, rot).consume, true);
  assert.equal(normalisePowerup({ type: "nope", area: { grid: ["#"] } }, rot), null);
});

test("resolveArea clips to the board and reports full rows", () => {
  const areaRot = parseArea({ origin: [1, 1], grid: ["###", "-##", "###"] });
  const r = resolveArea(areaRot, 0, 0, 4, 3); // piece at the top-left corner
  // whole row 0 + cells (0..1, 0..1) clipped
  assert.deepEqual(r.fullRows, [0]);
  const set = new Set(r.indices);
  for (let x = 0; x < 4; x++) assert.ok(set.has(x), "row 0 fully covered");
  assert.ok(set.has(1 * 4 + 0) && set.has(1 * 4 + 1));
  assert.ok(!set.has(2 * 4 + 0), "row 2 is outside the area");
});

test("destroyer empties affected blocks only", () => {
  const b = makeBoard([
    "####",
    "####",
    "####",
  ]);
  const area = resolveArea(parseArea({ origin: [1, 1], grid: [".#.", "###", ".#."] }), 1, 1, 4, 3);
  const destroyed = applyDestroy(b, area, cols(b));
  assert.equal(destroyed.length, 5);
  assert.deepEqual(show(b), [
    "#.##",
    "...#",
    "#.##",
  ]);
});

test("gravity (down) on whole columns removes air pockets", () => {
  const b = makeBoard([
    "a...",
    "....",
    "b..c",
    "....",
    "d.#.",
  ]);
  const area = resolveArea(parseArea({ origin: [0, 0], grid: ["|"] }), 0, 0, 4, 5);
  const moves = applyGravity(b, area, cols(b), b.length, "down");
  assert.deepEqual(show(b), [
    "....",
    "....",
    "a..c",
    "b...",
    "d.#.",
  ]);
  assert.equal(moves.length, 2); // a and b moved, d was already down
});

test("gravity leaves unaffected blocks in place as obstacles", () => {
  const b = makeBoard([
    "a.",
    "..",
    "x.", // x is not in the area (only row 0 is affected)
    "..",
  ]);
  const area = resolveArea(parseArea({ origin: [0, 0], grid: ["-"] }), 0, 0, 2, 4);
  applyGravity(b, area, 2, 4, "down");
  assert.deepEqual(show(b), [
    "..",
    "a.",
    "x.",
    "..",
  ]);
});

test("gravity (left/right) slides whole rows", () => {
  const rowsArea = (b) => resolveArea(parseArea({ origin: [0, 0], grid: ["-", "-"] }), 0, 0, cols(b), b.length);

  const left = makeBoard([".a.b", "c..d"]);
  applyGravity(left, rowsArea(left), 4, 2, "left");
  assert.deepEqual(show(left), ["ab..", "cd.."]);

  const right = makeBoard(["a.b.", "c..d"]);
  applyGravity(right, rowsArea(right), 4, 2, "right");
  assert.deepEqual(show(right), ["..ab", "..cd"]);
});

test("expander fills only empty affected cells", () => {
  const b = makeBoard([
    "#..",
    "...",
    "..#",
  ]);
  const area = resolveArea(parseArea({ origin: [0, 0], grid: ["##", "##"] }), 0, 0, 3, 3);
  const filled = applyExpand(b, area, 3, () => ({ ch: "f" }));
  assert.equal(filled.length, 3);
  assert.deepEqual(show(b), [
    "#f.",
    "ff.",
    "..#",
  ]);
});

test("Expanderz: only a fill down to the floor is kept narrow; one along a row, or in a shape, is as drawn", () => {
  const ids = ["lost_marbles", "tipped_honey_jar", "beans_tin_on_its_side", "spam_tin_opened", "liquid_cat", "squat_volcano", "chequered_marble"];
  const { powerups } = loadShapes(SHAPES.filter(s => ids.includes(s.id)));
  const area = Object.fromEntries(powerups.map(s => [s.id, s.powerup.areaRotations[0]]));
  const wide = (xs) => Math.max(...xs) - Math.min(...xs) + 1;
  // (along their own row, wall to wall)
  for (const id of ["lost_marbles", "tipped_honey_jar", "beans_tin_on_its_side"]) assert.deepEqual(area[id].rows, [0], id);
  // (a slab of spam, six wide)
  assert.equal(wide(area.spam_tin_opened.cells.map(q => q.dx)), 6);
  // (down to the floor: no wider than the cap, though drawn wider)
  assert.ok(wide(parseArea(SHAPES.find(s => s.id === "liquid_cat").powerup.area).downs.map(q => q.dx)) > CONFIG.assist.powerups.expanderMaxCols);
  assert.ok(wide(area.liquid_cat.downs.map(q => q.dx)) <= CONFIG.assist.powerups.expanderMaxCols);
  // (unless the piece is allowed more, its own maxCols: the volcano as drawn, the marble floor six wide)
  assert.equal(wide(area.squat_volcano.downs.map(q => q.dx)), 9);
  assert.equal(wide(area.chequered_marble.downs.map(q => q.dx)), 6);
});

test("collapseRows removes rows and drops everything above", () => {
  const b = makeBoard([
    "a.",
    "##",
    "b.",
    "##",
    "c.",
  ]);
  const { removed, dropDistances } = collapseRows(b, [1, 3], 2);
  assert.equal(removed.length, 2);
  assert.deepEqual(show(b), [
    "..",
    "..",
    "a.",
    "b.",
    "c.",
  ]);
  assert.deepEqual(dropDistances, [0, 0, 2, 1, 0]);
});

test("analyseBoard counts holes under blocks", () => {
  const b = makeBoard([
    "....",
    ".#..",
    "....",
    "##.#",
  ]);
  const s = analyseBoard(b);
  assert.equal(s.highest, 1);
  assert.equal(s.holes, 1); // the cell under the floating block
  assert.equal(s.filled, 4);
});

test("katana area covers its whole row, and the two under it", () => {
  const katana = POWERUPS.find(p => p.id === "katana");
  const pu = normalisePowerup(katana.powerup, [[[true, true, true, true, true]]]);
  const r = resolveArea(pu.areaRotations[0], 4, 10, 14, 28);
  assert.deepEqual(r.fullRows, [10, 11, 12]);
  assert.equal(r.indices.length, 14 * 3);
  assert.equal(pu.collapse, true);
});

test("a powerup that sprays at random, once rolled, keeps its spray (what zen's director judged it by)", async () => {
  const { rollScatter } = await import("../src/powerups.js");
  const { loadShapes } = await import("../src/shapes.js");
  const { SHAPES } = await import("../shapes/main_shapes.js");
  const { makeRng } = await import("../src/util.js");
  const p = loadShapes(SHAPES).powerups.find(q => q.powerup.scatter);
  assert.ok(p, "a powerup that sprays");
  const rng = makeRng(5);
  const once = rollScatter(p, rng);
  assert.notEqual(once, p, "rolled: a copy");
  assert.equal(rollScatter(once, rng), once, "and not rolled again");
  assert.notEqual(rollScatter(p, rng), p, "the original rolls afresh");
});


test("v: a cell and every cell under it, down to the floor (through anything in the way)", () => {
  const a = parseArea({ origin: [1, 0], grid: [".", "v"] });
  assert.deepEqual(a.downs, [{ dx: -1, dy: 1 }]);
  const board = makeBoard([
    "....",
    "....",
    "##..",
    ".#..",
    "##..",
  ]);
  // (the piece at x=1, y=0: its cell under-left is x=0, y=1, and down from there)
  const area = resolveArea(a, 1, 0, 4, 5);
  assert.deepEqual(area.indices, [4, 8, 12, 16]);
  applyExpand(board, area, 4, () => ({ ch: "+" }));
  assert.deepEqual(show(board), ["....", "+...", "##..", "+#..", "##.."]);
  // a powerup's area stays put when the piece turns, down included
  const pu = normalisePowerup({ type: "expander", area: { origin: [0, 0], grid: [".", "v"] } }, [[[1]]], { top: 0, left: 0 }, "t");
  assert.equal(pu.areaRotations[0].downs.length, 1);
});

test("a picture fill is drawn over the whole of the area: its edges as drawn, the middle repeated to fit", async () => {
  const { computeEffect, resolvePowerupArea } = await import("../src/powerups.js");
  const C = ["#ff0000", "#00ff00", "#0000ff", "#ffff00"];
  // three blocks wide, four tall (k = 1): red on top, green and blue in the middle, yellow at the bottom
  const picture = [0, 1, 2, 3].map(i => [C[i], C[i], C[i]]);
  const { powerups: pus } = loadShapes([{ id: "picture_test", name: "a test", grid: ["X"], color: "#888888", rotation: { mode: "any" },
    powerup: { type: "expander", tier: 2, area: { origin: [1, 0], grid: ["...", "vvv"] }, fill: { picture, k: 1, slice: { top: 1, bottom: 1 } } } }]);
  const pu = pus[0].powerup;
  assert.ok(pu.fillPicture && pu.fillPicture.W === 3 && pu.fillPicture.H === 4);
  const cols = 7, rows = 12, at = { rot: 0, x: 3, y: 2 };
  const board = Array.from({ length: rows }, () => Array(cols).fill(null));
  board[2][3] = { paint: "#888888", pid: 1 };
  const area = resolvePowerupArea(pu, 0, at.x, at.y, cols, rows);
  computeEffect(board, pu, { area, placed: [{ x: 3, y: 2 }], pid: 1, centre: { x: 3, y: 2 }, cols, rows, makeFill: () => ({ paint: pu.fillPaint, pid: 9 }), at });
  const col = (y) => board[y].slice(2, 5).map(c => c?.paint);
  assert.deepEqual(col(3), [C[0], C[0], C[0]], "the top as drawn");
  assert.deepEqual(col(rows - 1), [C[3], C[3], C[3]], "the bottom on the floor");
  for (let y = 4; y < rows - 1; y++) assert.deepEqual(col(y), Array(3).fill(C[1 + ((y - 4) % 2)]), `the middle repeated (row ${y})`);
});

test("fill art: painted to fit what it fills, at any size; with cover the piece is part of it, with join no edge between them", async () => {
  const { computeEffect, resolvePowerupArea } = await import("../src/powerups.js");
  const make = (fill, consume) => loadShapes([{ id: "art_test", name: "a test", grid: ["XX"], color: "#884422", rotation: { mode: "any" },
    powerup: { type: "expander", tier: 2, ...(consume ? { consume: true } : {}), area: { origin: [1, 0], grid: ["vvvv"] }, fill } }]).powerups[0].powerup;
  const fire = (pu, cols = 10, rows = 12) => {
    const board = Array.from({ length: rows }, () => Array(cols).fill(null));
    const at = { rot: 0, x: 3, y: 2 }, placed = [{ x: 3, y: 2 }, { x: 4, y: 2 }];
    for (const p of placed) board[p.y][p.x] = { paint: "#884422", pid: 1 };
    const area = resolvePowerupArea(pu, 0, at.x, at.y, cols, rows);
    const fx = computeEffect(board, pu, { area, placed, pid: 1, centre: { x: 4, y: 2.5 }, cols, rows, makeFill: () => ({ paint: pu.fillPaint, pid: 9 }), at });
    return { board, fx };
  };
  const hex = /^#[0-9a-f]{6}$/;
  for (const gen of ["noise", "strata", "streaks", "rays", "rings", "blob", "bubbles", "tiles", "gradient"]) {
    const pu = make({ gen, k: 5, palette: ["#102030", "#405060", "#8090a0", "#d0e0f0"] });
    assert.ok(pu.fillArt, `${gen}: fill art`);
    const { fx } = fire(pu);
    assert.ok(fx.filled.length >= 30, `${gen}: filled ${fx.filled.length}`);
    for (const f of fx.filled) {
      assert.equal(f.cell.paint.k, 5);
      assert.ok(f.cell.paint.pixels.flat().every(c => hex.test(c)), `${gen}: every pixel a colour`);
    }
  }
  // cover: the piece's own cells repainted as part of it (and the same seam), or, where the piece
  // vanished, filled in
  const kept = fire(make({ gen: "noise", k: 4, palette: ["#000000", "#ffffff"], cover: true }));
  const seam = kept.fx.filled[0].cell.seam;
  assert.ok(seam && kept.fx.filled.every(f => f.cell.seam === seam), "the fill shares one seam");
  assert.equal(kept.board[2][3].pid, 1, "the piece is still the piece");
  assert.equal(kept.board[2][3].seam, seam, "...and joined to its fill");
  assert.equal(kept.board[2][3].paint.k, 4, "...painted as part of it");
  const gone = fire(make({ gen: "noise", k: 4, palette: ["#000000", "#ffffff"], cover: true }, true));
  assert.ok(gone.board[2][3] && gone.board[2][3].pid === 9, "a piece that vanished: its cells filled in");
  // join without cover: the piece keeps its own look, with no edge between it and its fill
  const joined = fire(make({ gen: "solid", palette: ["#336699"], join: true }));
  assert.equal(joined.board[2][3].paint, "#884422");
  assert.equal(joined.board[2][3].seam, joined.fx.filled[0].cell.seam);
  // a hand-drawn texture runs on from cell to cell, lined up with the board
  const tex = [["#ff0000", "#00ff00", "#0000ff", "#ffff00"]];
  const t = fire(make({ gen: "texture", k: 1, texture: [tex[0], tex[0], tex[0], tex[0]], tk: 1, shade: false }));
  for (const f of t.fx.filled) assert.equal(f.cell.paint, tex[0][f.x % 4], "the texture's own pixel, by where it is");
});

test("where a powerup was before it turned goes with its area: no blank there, and nothing filled in out on its own", async () => {
  const { computeEffect, resolvePowerupArea } = await import("../src/powerups.js");
  const load = (grid, powerup) => loadShapes([{ id: "own_test", name: "a test", grid, color: "#884422", rotation: { mode: "any" }, powerup }]).powerups[0].powerup;
  const own = (a) => a.cells.filter(c => c.own).map(c => `${c.dx},${c.dy}`);
  // two blocks side by side, filling a ring round themselves
  const pu = load(["XX"], { type: "expander", tier: 2, area: { origin: [1, 1], grid: ["####", "#..#", "####"] } });
  assert.deepEqual(own(pu.areaRotations[0]), [], "as drawn, the way it comes");
  const cols = 8, rows = 8, board = Array.from({ length: rows }, () => Array(cols).fill(null));
  // turned upright at (3, 2): where its left block was, (2, 2), is filled in with the rest
  const placed = [{ x: 3, y: 2 }, { x: 3, y: 3 }];
  for (const p of placed) board[p.y][p.x] = { pid: 1 };
  const area = resolvePowerupArea(pu, 1, 3, 2, cols, rows);
  computeEffect(board, pu, { area, placed, pid: 1, centre: { x: 3, y: 2.5 }, cols, rows, makeFill: () => ({ pid: 9 }) });
  assert.equal(board[2][2]?.pid, 9, "no blank where it was");
  assert.equal(board[2][3]?.pid, 1, "the piece itself stays");
  // a tube filling down either side of its lower end: laid flat, the cell above where it lay isn't filled
  const tube = load(["X", "X"], { type: "expander", tier: 2, area: { origin: [1, 0], grid: ["...", "v.v", ".v."] } });
  for (const a of tube.areaRotations) assert.deepEqual(own(a), [], "nothing on its own above it");
  // a combo: each to the nearest part (here the ring it destroys, not the fill under it)
  const combo = load(["XX"], { type: "combo", tier: 3, parts: [
    { type: "destroyer", area: { origin: [1, 1], grid: ["####", "#..#", "####"] } },
    { type: "expander", area: { origin: [1, 0], grid: ["....", "....", "....", "vvvv"] } },
  ] });
  const [ring, fill] = combo.parts;
  // (and its top block where it is now, in the ring's hole: a Destroyerz is always in its own area)
  assert.deepEqual(own(ring.areaRotations[1]), ["-1,0", "0,0"]);
  assert.deepEqual(own(fill.areaRotations[1]), []);
  assert.deepEqual(own(combo.areaRotations[1]), ["-1,0", "0,0"], "and the combo's whole area");
});

test("every Destroyer is in its own area, however it's turned: it goes with everything else there", async () => {
  const { resolvePowerupArea, rollScatter, classOf, computeEffect } = await import("../src/powerups.js");
  const { makeRng } = await import("../src/util.js");
  const { powerups } = loadShapes(SHAPES);
  const cols = 40, rows = 40, at = 15;
  let n = 0;
  for (const s of powerups) {
    const destroys = (p) => classOf(p.type) === "destroyer";
    if (!(s.powerup.parts ?? [s.powerup]).some(destroys)) continue;
    n++;
    // (a spray at random: however it's rolled)
    const rolls = s.powerup.scatter ? Array.from({ length: 25 }, (_, i) => rollScatter(s, makeRng(i + 1))) : [s];
    for (const shape of rolls) shape.rotations.forEach((mat, k) => {
      const area = resolvePowerupArea(shape.powerup, k, at, at, cols, rows);
      const layers = shape.powerup.parts ? shape.powerup.parts.map((p, i) => [p, area.parts[i]]) : [[shape.powerup, area]];
      const hit = new Set(layers.filter(([p]) => destroys(p)).flatMap(([, a]) => a.indices));
      mat.forEach((row, y) => row.forEach((on, x) => {
        if (on) assert.ok(hit.has((at + y) * cols + at + x), `${s.id}, turned ${k}: its block (${x}, ${y}) is in its area`);
      }));
    });
  }
  assert.ok(n > 50, `${n} of them`);
  // one drawn only round itself (a ring, its own cells left out) goes too, with what's round it
  const { powerups: [ring] } = loadShapes([{ id: "ring_test", name: "a test", grid: ["XX"], color: "#884422", rotation: { mode: "any" },
    powerup: { type: "destroyer", tier: 2, consume: false, area: { origin: [1, 1], grid: ["####", "#..#", "####"] } } }]);
  const board = Array.from({ length: 6 }, () => Array(6).fill(null));
  for (let y = 1; y <= 3; y++) for (let x = 1; x <= 4; x++) board[y][x] = { pid: y === 2 && (x === 2 || x === 3) ? 1 : 2 };
  const fx = computeEffect(board, ring.powerup, { area: resolvePowerupArea(ring.powerup, 0, 2, 2, 6, 6), placed: [{ x: 2, y: 2 }, { x: 3, y: 2 }], pid: 1, centre: { x: 2.5, y: 2 }, cols: 6, rows: 6 });
  assert.equal(fx.destroyed.length, 12, "the ring round it and the piece itself");
  assert.ok(board.every(row => row.every(c => !c)), "nothing left");
});
