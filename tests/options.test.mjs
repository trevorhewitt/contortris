// Run with:  node --test tests/*.test.mjs
// The options: kept in this browser, and the favourite piece comes a little more often.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { loadShapes } from "../src/shapes.js";
import { getOption, setOption, favourite } from "../src/settings.js";
import { favouritePool } from "../src/optionsui.js";
import { varietyMultiplier } from "../src/selection.js";

const { shapes } = loadShapes(SHAPES);

test("options: a favourite to start with, from the pieces that turn up early, kept once chosen", () => {
  const pool = favouritePool(shapes);
  assert.ok(pool.length > 50 && pool.every(s => !s.powerup && (s.difficulty ?? 1) <= 3), `${pool.length}`);
  const first = favourite(pool);
  assert.ok(pool.some(s => s.id === first), "one of them, at random");
  assert.equal(favourite(pool), first, "and the same one after that");
  setOption("favourite", pool[3].id);
  assert.equal(favourite(pool), pool[3].id);
  setOption("favourite", "no_such_piece");
  assert.ok(pool.some(s => s.id === favourite(pool)), "a piece that's gone: another");
  assert.equal(getOption("turboWhole"), true, "turbo zen fills the screen to start with");
});

test("options: the favourite piece is weighted up", () => {
  const s = shapes.find(x => (x.difficulty ?? 1) === 1);
  const sel = { recentShapeIds: [], servedCounts: new Map(), presence: new Map(), dropIndex: 50 };
  const plain = varietyMultiplier(sel, s);
  sel.favourite = s.id;
  assert.equal(varietyMultiplier(sel, s), plain * CONFIG.assist.variety.favourite);
});
