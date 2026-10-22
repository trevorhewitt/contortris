// Run with:  node --test tests/
// The home screen's sums (src/home.js): the board behind it, and the camera.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { homeBoardSize, coverScale, viewOverlap, mosaicSweep } from "../src/home.js";

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

test("a shot of a mosaic is steady from its first frame to the cut: one speed across the screen, one rate of zoom, one of turn (and past it, waiting on the next, the same way at the same speed)", () => {
  const shots = [
    { a: { x: 3, y: 4, z: 1.2, rot: -0.3 }, b: { x: 40, y: -9, z: 3.1, rot: 0.4 } }, // (a sweep, zooming in)
    { a: { x: 50, y: 20, z: 3, rot: 0.2 }, b: { x: 20, y: 30, z: 1.25, rot: 0.2 } }, // (zooming out)
    { a: { x: 0, y: 0, z: 2, rot: 0 }, b: { x: 30, y: 10, z: 2, rot: -0.5 } }, // (turning, no zoom)
  ];
  for (const s of shots) {
    // (frame by frame: how far the middle of the view moves across the screen, at 25 screen
    // pixels a cell times z, how much closer it gets, and how far it turns)
    const n = 60, speed = [], zoom = [], turn = [];
    for (let i = 0; i < n; i++) {
      const p = mosaicSweep(s, i / n), q = mosaicSweep(s, (i + 1) / n);
      speed.push(Math.hypot(q.x - p.x, q.y - p.y) * 25 * Math.sqrt(p.z * q.z));
      zoom.push(Math.log(q.z / p.z));
      turn.push(q.rot - p.rot);
    }
    const steady = (a) => Math.max(...a) - Math.min(...a) <= 1e-6 * Math.max(1, ...a.map(Math.abs));
    assert.ok(steady(speed), `speed ${Math.min(...speed).toFixed(3)} to ${Math.max(...speed).toFixed(3)}`);
    assert.ok(steady(zoom) && steady(turn));
    // (and from just where it starts to just where it ends)
    for (const [u, at] of [[0, s.a], [1, s.b]]) for (const k of ["x", "y", "z", "rot"]) assert.ok(Math.abs(mosaicSweep(s, u)[k] - at[k]) < 1e-9, `${k} at ${u}`);
    // (past its end, as it waits on the next mosaic: on the same way at the same speed, no longer
    // turning or zooming)
    for (let i = 0; i < 30; i++) {
      const p = mosaicSweep(s, 1 + i / n), q = mosaicSweep(s, 1 + (i + 1) / n);
      const v = Math.hypot(q.x - p.x, q.y - p.y) * 25 * q.z, along = ((q.x - p.x) * (s.b.x - s.a.x) + (q.y - p.y) * (s.b.y - s.a.y)) / Math.hypot(q.x - p.x, q.y - p.y) / Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
      assert.ok(Math.abs(v - speed[0]) <= 1e-3 * speed[0], `speed past the end ${v.toFixed(3)}, before ${speed[0].toFixed(3)}`);
      assert.ok(along > 1 - 1e-9, "the same way");
      assert.ok(Math.abs(q.z - s.b.z) < 1e-9 && Math.abs(q.rot - s.b.rot) < 1e-9);
    }
  }
});
