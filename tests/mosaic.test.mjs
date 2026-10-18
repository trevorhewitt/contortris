// Run with:  node --test tests/*.test.mjs
// The home screen's mosaics: a grid packed full of pieces on a theme, biggest first.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { buildMosaic } from "../src/mosaic.js";

const { shapes, powerups } = loadShapes(SHAPES);

test("mosaic: every theme packs the grid full, nothing overlapping or off the edge, and no four-block pieces", () => {
  const { cols, rows } = CONFIG.home.mosaic;
  const themes = new Set();
  for (const theme of [null, ...Object.keys(CONFIG.home.mosaic.themes)]) {
    const m = buildMosaic(shapes, powerups, { cols, rows, rng: makeRng(themes.size + 1), theme });
    themes.add(m.theme);
    const seen = new Uint8Array(cols * rows);
    for (const p of m.pieces) {
      const mat = p.shape.rotations[p.rot];
      assert.notEqual(mat.flat().filter(Boolean).length, 4, `${m.theme}: ${p.shape.id}`);
      for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
        if (!mat[j][i]) continue;
        const x = p.x + i, y = p.y + j;
        assert.ok(x >= 0 && y >= 0 && x < cols && y < rows, `${m.theme}: ${p.shape.id} off the edge`);
        assert.equal(seen[y * cols + x], 0, `${m.theme}: overlap at ${x},${y}`);
        seen[y * cols + x] = 1;
      }
    }
    assert.ok(m.filled >= 0.85, `${m.theme}: ${(m.filled * 100).toFixed(0)}% full`);
    // (the biggest first: the first piece down is one of the biggest it has)
    if (m.theme === "giants") assert.ok(m.pieces[0].shape.rotations[0].flat().filter(Boolean).length >= 21);
  }
  assert.ok(themes.size >= 6, [...themes].join(", "));
});
