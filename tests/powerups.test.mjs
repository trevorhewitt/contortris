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
} from "../powerups.js";
import { POWERUPS } from "../shapes/powerup_shapes.js";

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
    assert.ok(a.cells.length + a.rows.length + a.cols.length > 0, `${p.id} has an area`);
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

test("katana area covers its whole row", () => {
  const katana = POWERUPS.find(p => p.id === "katana");
  const pu = normalisePowerup(katana.powerup, [[[true, true, true, true, true]]]);
  const r = resolveArea(pu.areaRotations[0], 4, 10, 14, 28);
  assert.deepEqual(r.fullRows, [10]);
  assert.equal(r.indices.length, 14);
  assert.equal(pu.collapse, true);
});
