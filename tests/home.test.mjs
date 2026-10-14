// Run with:  node --test tests/
// The home screen's sums (src/home.js): the board behind it, the camera, the start texts.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { homeBoardSize, coverScale, pickStartText, startTextParts } from "../src/home.js";
import { makeRng } from "../src/util.js";

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

test("the start texts: as likely as their weights, not the same twice running, said a part at a time", () => {
  const rng = makeRng(3), counts = new Map();
  let last = null, repeats = 0;
  for (let i = 0; i < 3000; i++) {
    const t = pickStartText(rng, last);
    if (t === last) repeats++;
    counts.set(t, (counts.get(t) ?? 0) + 1);
    last = t;
  }
  assert.equal(repeats, 0, "never the same twice running");
  const list = CONFIG.home.startTexts;
  for (const { text } of list) assert.ok(counts.get(text) > 0, `${text} came`);
  const heaviest = list.reduce((a, b) => (b.weight > a.weight ? b : a)), lightest = list.reduce((a, b) => (b.weight < a.weight ? b : a));
  assert.ok(counts.get(heaviest.text) > counts.get(lightest.text) * 2, "the weights count");
  assert.deepEqual(startTextParts("Ready, set, go!"), ["Ready,", "set,", "go!"]);
  assert.deepEqual(startTextParts("It's Extris time"), ["It's Extris time"]);
});
