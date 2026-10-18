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

test("mosaic: every theme packs the grid full, nothing overlapping (a piece over one edge comes round on the other), and no four-block pieces", () => {
  const { cols, rows } = CONFIG.home.mosaic;
  const themes = new Set();
  let wraps = 0, edgeLittle = 0, midLittle = 0, runs = 0;
  for (const theme of [null, ...Object.keys(CONFIG.home.mosaic.themes)]) {
    const m = buildMosaic(shapes, powerups, { cols, rows, rng: makeRng(themes.size + 1), theme });
    themes.add(m.theme);
    const seen = new Uint16Array(cols * rows); // (each cell: how many blocks its piece has)
    for (const p of m.pieces) {
      const mat = p.shape.rotations[p.rot], n = mat.flat().filter(Boolean).length;
      assert.notEqual(n, 4, `${m.theme}: ${p.shape.id}`);
      assert.ok(p.x >= 0 && p.y >= 0 && p.x < cols && p.y < rows, `${m.theme}: ${p.shape.id} at ${p.x},${p.y}`);
      if (p.x + mat[0].length > cols || p.y + mat.length > rows) wraps++;
      for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
        if (!mat[j][i]) continue;
        const x = (p.x + i) % cols, y = (p.y + j) % rows;
        assert.equal(seen[y * cols + x], 0, `${m.theme}: overlap at ${x},${y}`);
        seen[y * cols + x] = n;
      }
    }
    assert.ok(m.filled >= 0.85, `${m.theme}: ${(m.filled * 100).toFixed(0)}% full`);
    // (how much of the edge, and of the middle, is little pieces)
    let e = 0, en = 0, c = 0, cn = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const little = seen[y * cols + x] > 0 && seen[y * cols + x] <= 3;
      if (x < 2 || y < 2 || x >= cols - 2 || y >= rows - 2) { en++; e += little; } else { cn++; c += little; }
    }
    edgeLittle += e / en; midLittle += c / cn; runs++;
    // (the biggest first: the first piece down is one of the biggest it has)
    if (m.theme === "giants") assert.ok(m.pieces[0].shape.rotations[0].flat().filter(Boolean).length >= 21);
  }
  assert.ok(themes.size >= 6, [...themes].join(", "));
  // It repeats in every direction, packed that way: pieces go over the edges, and where its
  // repeats meet is the same as anywhere else, not a band of little pieces filling in along the
  // edge (packed edge to edge, the edges were about 20 points more little pieces than the middle).
  assert.ok(wraps > 20, `${wraps} pieces over an edge`);
  assert.ok(Math.abs(edgeLittle - midLittle) / runs < 0.08, `edges ${(100 * edgeLittle / runs).toFixed(0)}% little pieces, the middle ${(100 * midLittle / runs).toFixed(0)}%`);
});
