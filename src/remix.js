// ============================================================
// REMIXES — pieces rebuilt at random each time they arrive (no DOM)
// ============================================================
// A piece with `remix` in its data gets fresh art (and sometimes a fresh outline) every time
// it turns up:
//   remix: { mix: ["townhouses", "schnauzers"] }
//       a random blend of two pieces drawn on the same grid: clumps of blocks from one next
//       to clumps from the other, with their outlines blended too
//   remix: { scramble: "spam" }
//       the blocks of another piece shuffled (and some turned round) into this piece's shape
// The piece's own grid and colours in the data are what the designer and the lists show.

import { loadAndNormaliseShapes } from "./shapes.js";
import { valueNoise } from "./util.js";

// A fresh random version of `shape` (or `shape` itself if it has no remix, or its sources are
// missing). `byId` finds the source pieces.
export function remixShape(shape, byId, rng = Math.random) {
  const r = shape?.remix;
  if (!r) return shape;
  let built = null;
  if (r.mix) {
    const a = byId.get(r.mix[0]), b = byId.get(r.mix[1]);
    if (a && b) built = mixTiles(shape, tilesOf(a), tilesOf(b), rng);
  } else if (r.scramble) {
    const src = byId.get(r.scramble);
    if (src) built = scrambleTiles(shape, tilesOf(src), rng);
  }
  if (!built) return shape;
  return toShape(shape, built.cells, built.k) ?? shape;
}

/* ---------- tiles ---------- */

// The blocks of a piece as drawn (rotation 0): { w, h, k, at(x, y) -> k×k pixels | null }
function tilesOf(shape) {
  const mat = shape.rotations[0];
  const paints = shape.cellPaints[0];
  const k = shape.pixelK > 1 ? shape.pixelK : 1;
  return {
    w: mat[0].length, h: mat.length, k,
    at(x, y) {
      if (y < 0 || y >= mat.length || x < 0 || x >= mat[0].length || !mat[y][x]) return null;
      const p = paints[y][x];
      if (p && typeof p === "object") return p.pixels;
      const c = typeof p === "string" ? p : shape.style?.baseColor ?? "#888888";
      return Array.from({ length: k }, () => Array(k).fill(c));
    },
  };
}

// k×k pixels resized (nearest neighbour) to n×n
function resize(pix, n) {
  const k = pix.length;
  if (k === n) return pix.map(row => row.slice());
  return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => pix[Math.floor(y * k / n)][Math.floor(x * k / n)]));
}

// a quarter turn clockwise, `turns` times
function turn(pix, turns) {
  let out = pix;
  for (let t = 0; t < (turns & 3); t++) {
    const k = out.length;
    out = Array.from({ length: k }, (_, y) => Array.from({ length: k }, (_, x) => out[k - 1 - x][y]));
  }
  return out;
}

/* ---------- the two kinds of remix ---------- */

function mixTiles(shape, A, B, rng) {
  const W = Math.max(A.w, B.w), H = Math.max(A.h, B.h);
  const k = Math.max(A.k, B.k);
  // both sit on the same floor, centred
  const offA = { x: Math.floor((W - A.w) / 2), y: H - A.h };
  const offB = { x: Math.floor((W - B.w) / 2), y: H - B.h };
  const which = valueNoise(rng, 1.6 + rng() * 1.2); // clumps of one or the other
  const keep = valueNoise(rng, 1.3);                // which of the odd bits of outline stay
  const bias = 0.35 + rng() * 0.3;                  // some mixes lean one way, some the other
  const cells = new Map();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ta = A.at(x - offA.x, y - offA.y), tb = B.at(x - offB.x, y - offB.y);
    if (!ta && !tb) continue;
    let tile;
    if (ta && tb) tile = which(x, y) < bias ? ta : tb;
    else {
      if (keep(x, y) < 0.42) continue; // only one of them has a block here: keep it about half the time
      tile = ta ?? tb;
    }
    cells.set(`${x},${y}`, { x, y, pixels: resize(tile, k) });
  }
  return { cells: largestPart([...cells.values()]), k };
}

function scrambleTiles(shape, S, rng) {
  const tiles = [];
  for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) {
    const t = S.at(x, y);
    if (t) tiles.push(t);
  }
  if (!tiles.length) return null;
  // shuffle
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  const mat = shape.rotations[0];
  const k = S.k;
  const cells = [];
  let n = 0;
  for (let y = 0; y < mat.length; y++) for (let x = 0; x < mat[0].length; x++) {
    if (!mat[y][x]) continue;
    const t = tiles[n++ % tiles.length];
    cells.push({ x, y, pixels: turn(resize(t, k), rng() < 0.45 ? 1 + Math.floor(rng() * 3) : 0) });
  }
  return { cells, k };
}

// Keep the biggest connected lump (a random blend can leave a stray block floating about).
function largestPart(cells) {
  const key = (c) => `${c.x},${c.y}`;
  const byKey = new Map(cells.map(c => [key(c), c]));
  const seen = new Set();
  let best = [];
  for (const c of cells) {
    if (seen.has(key(c))) continue;
    const part = [], todo = [c];
    seen.add(key(c));
    while (todo.length) {
      const cur = todo.pop();
      part.push(cur);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = `${cur.x + dx},${cur.y + dy}`;
        if (byKey.has(nk) && !seen.has(nk)) { seen.add(nk); todo.push(byKey.get(nk)); }
      }
    }
    if (part.length > best.length) best = part;
  }
  return best;
}

// Cells -> a playable shape with the base piece's id, name, level, tags...
function toShape(base, cells, k) {
  if (!cells.length) return null;
  const minX = Math.min(...cells.map(c => c.x)), minY = Math.min(...cells.map(c => c.y));
  const W = Math.max(...cells.map(c => c.x)) - minX + 1, H = Math.max(...cells.map(c => c.y)) - minY + 1;
  const grid = Array.from({ length: H }, () => Array(W).fill("."));
  const color = Array.from({ length: H * k }, () => Array(W * k).fill(""));
  for (const c of cells) {
    const bx = c.x - minX, by = c.y - minY;
    grid[by][bx] = "X";
    for (let py = 0; py < k; py++) for (let px = 0; px < k; px++) color[by * k + py][bx * k + px] = c.pixels[py][px];
  }
  const [shape] = loadAndNormaliseShapes([{
    id: base.id, name: base.name, grid: grid.map(r => r.join("")), color,
    difficulty: base.difficulty, frequency: base.frequency, tags: base.tags,
    noShake: base.noShake, rotation: base.rotationSpec ?? undefined,
  }]);
  return shape;
}
