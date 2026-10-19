// ============================================================
// MOSAIC — a screen packed full of pieces, for the home screen's camera (DOM: a canvas)
// ============================================================
// Now and then the home screen (src/home.js) cuts away from its turbo zen boards to one of these:
// a big grid packed with pieces, the biggest put down first wherever they fit and then smaller
// and smaller ones in the gaps (a few gaps left is fine, as long as it looks full), all of them
// on a theme: anything at all, one kind of thing (food, space...), the powerups, the giants, or
// just a few pieces over and over. It repeats in every direction, and is packed that way, a piece
// over one edge coming round on the other, so the repeats meet with no seam; the camera sweeps
// across it, turning and zooming, and never comes to an edge.
//
// buildMosaic packs it (no DOM: a list of pieces where they go); paintMosaic paints it onto a
// canvas the camera shows, a little each frame.

import { CONFIG } from "../config.js";
import { getShapePaint } from "./shapes.js";
import { drawBlockWithPaintStatic } from "./render.js";

const blocksOf = (s) => s.rotations[0].flat().filter(Boolean).length;

// The themes, each a pool of pieces to pack with (or null if there aren't enough of them).
// (Never the four-block pieces: the falling-block game everyone knows is made of those.)
function themes(shapes, powerups, rng) {
  const M = CONFIG.home.mosaic ?? {};
  const ok = (s) => blocksOf(s) !== 4 && (s.frequency ?? 1) > 0 && !s.remix && !s.seam;
  const plain = shapes.filter(ok);
  const out = { everything: plain };
  for (const tag of M.tags ?? []) {
    const list = plain.filter(s => s.tags?.includes(tag));
    if (list.length >= 6) out[tag] = list;
  }
  out.powerups = powerups.filter(ok);
  // (the giants, and little ones to fill in round them)
  out.giants = plain.filter(s => blocksOf(s) >= 21 || blocksOf(s) <= 3);
  // (a handful of pieces, over and over: one big, a couple of middling, a couple of small)
  const pick = (list, n) => { const a = [...list], r = []; while (a.length && r.length < n) r.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return r; };
  out.few = [...pick(plain.filter(s => blocksOf(s) >= 12), 1), ...pick(plain.filter(s => blocksOf(s) >= 5 && blocksOf(s) < 12), 2), ...pick(plain.filter(s => blocksOf(s) <= 3), 2)];
  for (const [k, v] of Object.entries(out)) if (!v.length) delete out[k];
  return out;
}

// Pack a grid `cols` × `rows`: { cols, rows, theme, pieces: [{ shape, rot, x, y }] }. (A piece
// can go over the right or bottom edge: what's over it comes round on the left, or at the top.)
export function buildMosaic(shapes, powerups, { cols, rows, rng = Math.random, theme = null } = {}) {
  const pools = themes(shapes, powerups, rng);
  const names = Object.keys(pools);
  const weights = CONFIG.home.mosaic?.themes ?? {};
  if (!theme || !pools[theme]) {
    let total = 0;
    for (const n of names) total += weights[n] ?? 1;
    let r = rng() * total;
    theme = names.find(n => (r -= weights[n] ?? 1) < 0) ?? names[0];
  }
  const pool = pools[theme];
  // (a theme with hardly any little pieces of its own fills its gaps with anybody's)
  const little = (list) => list.filter(s => blocksOf(s) <= 3);
  const fillers = little(pool).length >= 3 ? little(pool) : little(pools.everything);
  const occ = new Uint8Array(cols * rows);
  const pieces = [];
  const at = (x, y) => (((y % rows) + rows) % rows) * cols + (((x % cols) + cols) % cols);
  const fits = (mat, x, y) => {
    if (mat[0].length > cols || mat.length > rows) return false;
    for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
      if (mat[j][i] && occ[at(x + i, y + j)]) return false;
    }
    return true;
  };
  const put = (shape, rot, x, y) => {
    const mat = shape.rotations[rot];
    x = ((x % cols) + cols) % cols; y = ((y % rows) + rows) % rows;
    for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) if (mat[j][i]) occ[at(x + i, y + j)] = 1;
    pieces.push({ shape, rot, x, y });
  };
  const any = (list) => list[Math.floor(rng() * list.length)];
  const turnOf = (s) => Math.floor(rng() * s.rotations.length);
  // the biggest first, wherever they land, then smaller and smaller into what's left
  const bands = [[21, Infinity, 0.5], [10, 20, 0.6], [5, 9, 0.8], [1, 3, 1]];
  for (const [lo, hi, share] of bands) {
    const band = lo <= 3 ? fillers : pool.filter(s => { const n = blocksOf(s); return n >= lo && n <= hi; });
    if (!band.length) continue;
    if (lo > 3) {
      // (random spots: as many tries as it would take to cover `share` of the grid)
      const tries = Math.round((cols * rows * share) / ((lo + Math.min(hi, lo * 2)) / 2)) * 3;
      for (let t = 0; t < tries; t++) {
        const s = any(band), rot = turnOf(s), mat = s.rotations[rot];
        const x = Math.floor(rng() * cols), y = Math.floor(rng() * rows);
        if (fits(mat, x, y)) put(s, rot, x, y);
      }
    } else {
      // (the smallest: into every gap they'll go in, tried cell by cell)
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (occ[y * cols + x]) continue;
        for (let t = 0; t < 6; t++) {
          const s = any(band), rot = turnOf(s), mat = s.rotations[rot];
          // (lined up so that its first block is on this cell)
          let fx = 0;
          while (fx < mat[0].length && !mat[0][fx]) fx++;
          if (fx < mat[0].length && fits(mat, x - fx, y)) { put(s, rot, x - fx, y); break; }
        }
      }
    }
  }
  return { cols, rows, theme, pieces, filled: occ.reduce((a, b) => a + b, 0) / (cols * rows) };
}

// Paint it onto a canvas, `cellPx` a cell, a few pieces at a time (it's a lot of little squares:
// all at once would hold up a frame): { canvas, step(ms) }, step painting for about that long and
// saying whether it's all there yet. under(ctx, until): paints what goes under the pieces, if
// anything, until performance.now() is past `until`, saying whether it's done.
export function paintMosaic(m, cellPx, canvas = document.createElement("canvas"), under = null) {
  canvas.width = m.cols * cellPx;
  canvas.height = m.rows * cellPx;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let i = 0;
  const step = (ms = 4) => {
    const until = performance.now() + ms;
    // (what's under the pieces, if anything, first, a little at a time too: src/remains.js)
    if (under) { if (under(ctx, until)) under = null; return false; }
    while (i < m.pieces.length) {
      const p = m.pieces[i++], mat = p.shape.rotations[p.rot];
      // (what's over the right or bottom edge, round on the left or at the top)
      for (let j = 0; j < mat.length; j++) for (let k = 0; k < mat[0].length; k++) {
        if (mat[j][k]) drawBlockWithPaintStatic(ctx, ((p.x + k) % m.cols) * cellPx, ((p.y + j) % m.rows) * cellPx, cellPx, getShapePaint(p.shape, p.rot, k, j), p.shape.style ?? {});
      }
      if (performance.now() >= until) break;
    }
    return i >= m.pieces.length;
  };
  return { canvas, step, mosaic: m };
}
