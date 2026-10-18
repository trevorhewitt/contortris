// Run with:  node --test tests/
// The home screen's sums (src/home.js): the board behind it, and the camera.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { homeBoardSize, coverScale, viewOverlap } from "../src/home.js";

test("the board behind the home screen is the window's shape, within limits", () => {
  const H = CONFIG.home;
  const wide = homeBoardSize(1920, 1080), tall = homeBoardSize(390, 844), square = homeBoardSize(1000, 1000);
  for (const b of [wide, tall, square]) {
    assert.equal(b.rows, H.rows);
    assert.ok(b.cols >= H.minCols && b.cols <= H.maxCols, `${b.cols} columns`);
  }
  assert.ok(wide.cols > square.cols && square.cols > tall.cols - 1, `${wide.cols} > ${square.cols} >= ${tall.cols}`);
});

test("the camera never shows anything beyond the board, turned or not", () => {
  const cols = 30, rows = 24, W = 1920, Hh = 1080;
  for (const deg of [0, 4, 9, -9]) {
    const rot = deg * Math.PI / 180, S = coverScale(W, Hh, rot, cols, rows);
    const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
    // the screen's corners, in cells, from the middle: within the board's half-size
    assert.ok((W * c + Hh * s) / S <= cols + 1e-9 && (W * s + Hh * c) / S <= rows + 1e-9, `${deg} degrees`);
    // and only just: one way or the other it fills the board exactly
    assert.ok(Math.abs((W * c + Hh * s) / S - cols) < 1e-6 || Math.abs((W * s + Hh * c) / S - rows) < 1e-6);
  }
});

test("how alike two views are, for the cuts: the same view 1, nothing in common 0", () => {
  const W = 1600, Hh = 900, v = { x: 10, y: 8, S: 80 }; // (20 cells across, 11.25 down)
  assert.equal(viewOverlap(v, v, W, Hh), 1);
  assert.equal(viewOverlap(v, { ...v, x: 31 }, W, Hh), 0);
  // half of it along: a third of the two between them; twice as close, in the middle: a quarter
  assert.ok(Math.abs(viewOverlap(v, { ...v, x: 20 }, W, Hh) - 1 / 3) < 1e-9);
  assert.ok(Math.abs(viewOverlap(v, { ...v, S: 160 }, W, Hh) - 1 / 4) < 1e-9);
  assert.equal(viewOverlap(v, { ...v, x: 14, y: 3 }, W, Hh), viewOverlap({ ...v, x: 14, y: 3 }, v, W, Hh));
});
