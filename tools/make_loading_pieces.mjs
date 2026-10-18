// Makes src/loadingdata.js: the pieces the loading screen's bar fills up with (src/loading.js).
//   node tools/make_loading_pieces.mjs
// The bar is a small sideways board, ROWS tall and COLS long, its pieces falling to the left. The
// loading screen runs before the game's pieces have loaded, so it can't pick them itself: this
// tries a great many ways of filling the bar from the game's ordinary pieces (a beam search, a
// different shuffle each time), keeps the best few (fewest gaps), and writes them out with each
// piece's art and a line to show under the bar while it falls (CAPTIONS, below: a piece with no
// line of its own is never used). No piece of four blocks: those look too much like another game's. It also prints which pieces fill the bar best, most first.
import { writeFileSync } from "node:fs";
import { SHAPES } from "../shapes/main_shapes.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { inGame } from "../src/selection.js";

const ROWS = 4, COLS = 20, RUNS = 300, KEEP = 8, BEAM = 40, ART_K = 5;

// What it says under the bar while each piece falls (only these pieces are used)
import { CAPTIONS } from "./loading_captions.mjs";

const { shapes } = loadShapes(SHAPES);
const pool = shapes.filter(s => {
  const n = s.rotations[0].flat().filter(Boolean).length;
  return !s.powerup && inGame(s) && (s.difficulty ?? 1) <= 2 && (s.frequency ?? 1) > 0 && !s.remix && !s.seam
    && n >= 3 && n <= 9 && n !== 4 && CAPTIONS[s.id] && s.rotations.some(m => m.length <= ROWS && m[0].length <= 5);
});

// Every way a piece can lie in the bar: { rot, mat } (each turn no taller than the bar)
const ways = new Map(pool.map(s => [s.id, s.rotations.map((mat, rot) => ({ rot, mat })).filter(w => w.mat.length <= ROWS && w.mat[0].length <= 5)]));

// Slide a piece in from the right along rows y.., as far left as it goes. Its x, or -1.
function slide(grid, mat, y) {
  const h = mat.length, w = mat[0].length;
  const hits = (x) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (mat[j][i] && (x + i < 0 || grid[y + j][x + i])) return true; return false; };
  let x = COLS - w;
  if (hits(x)) return -1;
  while (!hits(x - 1)) x--;
  return x;
}
function place(grid, mat, x, y) {
  const g = grid.map(r => r.slice());
  mat.forEach((row, j) => row.forEach((c, i) => { if (c) g[y + j][x + i] = 1; }));
  return g;
}
// (a gap: an empty cell with something to the right of it in its row; and how ragged the right edge is)
function judge(grid) {
  let gaps = 0, filled = 0;
  const front = grid.map(r => { let f = 0; r.forEach((c, x) => { if (c) f = x + 1; }); return f; });
  grid.forEach((r, y) => r.forEach((c, x) => { if (c) filled++; else if (x < front[y]) gaps++; }));
  const ragged = Math.max(...front) - Math.min(...front);
  return { gaps, filled, ragged, score: filled - gaps * 6 - ragged * 0.7 };
}

function fill(rng) {
  const order = pool.map(s => s.id).sort(() => rng() - 0.5);
  let beam = [{ grid: Array.from({ length: ROWS }, () => Array(COLS).fill(0)), used: new Set(), steps: [], s: judge(Array.from({ length: ROWS }, () => Array(COLS).fill(0))) }];
  for (let step = 0; step < 30; step++) {
    const next = [];
    for (const b of beam) {
      // (a few pieces to try at each step, different ones each run)
      const tries = order.filter(id => !b.used.has(id)).slice(0, 14 + step);
      for (const id of tries) for (const { rot, mat } of ways.get(id)) for (let y = 0; y + mat.length <= ROWS; y++) {
        const x = slide(b.grid, mat, y);
        if (x < 0) continue;
        const grid = place(b.grid, mat, x, y), s = judge(grid);
        if (s.gaps > b.s.gaps + 1) continue;
        next.push({ grid, used: new Set([...b.used, id]), steps: [...b.steps, { id, rot, x, y }], s });
      }
    }
    if (!next.length) break;
    next.sort((a, c) => c.s.score - a.s.score + (rng() - 0.5) * 0.5);
    beam = next.slice(0, BEAM);
  }
  return beam.sort((a, c) => c.s.score - a.s.score)[0];
}

const runs = [];
for (let r = 0; r < RUNS; r++) runs.push(fill(makeRng(1000 + r)));
runs.sort((a, b) => b.s.score - a.s.score);
const kept = [];
for (const r of runs) {
  if (kept.length >= KEEP) break;
  const key = r.steps.map(s => s.id).sort().join();
  if (kept.some(k => k.key === key)) continue;
  kept.push({ ...r, key });
}

// Which pieces fill the bar best: how often each turns up in the best runs
const count = new Map();
for (const r of runs.slice(0, 60)) for (const s of r.steps) count.set(s.id, (count.get(s.id) ?? 0) + 1);
console.log("best at filling the bar:", [...count].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([id, n]) => `${id} ${n}`).join(", "));
for (const r of kept) console.log(`${r.s.filled}/${ROWS * COLS} filled, ${r.s.gaps} gaps: ${r.steps.map(s => s.id).join(" ")}`);

// Each piece's art, cell by cell, ART_K pixels a side (sampled from its own), as indices into one
// palette, two base-36 characters a pixel (it's much smaller than the colours written out)
const palette = [], seen = new Map();
const colour = (c, base) => {
  const h = typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : base.toLowerCase();
  if (!seen.has(h)) { seen.set(h, palette.length); palette.push(h); }
  return seen.get(h).toString(36).padStart(2, "0");
};
function art(shape, rot) {
  const base = shape.style?.baseColor ?? "#888888";
  return shape.cellPaints[rot].map(row => row.map(p => {
    if (!p) return null;
    if (typeof p === "string") return colour(p, base).repeat(ART_K * ART_K);
    const k = p.k;
    return Array.from({ length: ART_K }, (_, j) => Array.from({ length: ART_K }, (_, i) => colour(p.pixels[Math.floor((j + 0.5) * k / ART_K)]?.[Math.floor((i + 0.5) * k / ART_K)], base)).join("")).join("");
  }));
}
const used = new Map();
for (const r of kept) for (const s of r.steps) {
  const shape = shapes.find(x => x.id === s.id);
  const p = used.get(s.id) ?? { name: shape.name, say: CAPTIONS[s.id], rots: {} };
  p.rots[s.rot] ??= { mat: shape.rotations[s.rot].map(row => row.map(c => (c ? 1 : 0)).join("")), art: art(shape, s.rot) };
  used.set(s.id, p);
}
const out = {
  rows: ROWS, cols: COLS, k: ART_K, palette,
  pieces: Object.fromEntries(used),
  runs: kept.map(r => r.steps),
};
writeFileSync(new URL("../src/loadingdata.js", import.meta.url),
  "// Made by tools/make_loading_pieces.mjs (run it again after changing the pieces or the captions).\n" +
  "// The loading screen's bar (src/loading.js): ways of filling it, and the pieces' art and lines.\n" +
  "window.LOADING_DATA = " + JSON.stringify(out) + ";\n");
console.log("wrote src/loadingdata.js,", JSON.stringify(out).length, "bytes,", used.size, "pieces");
