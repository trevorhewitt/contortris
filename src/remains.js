// ============================================================
// REMAINS — what destroyed blocks leave behind (no DOM, but for drawRemains and paintRemains)
// ============================================================
// A block destroyed (its row cleared, a Destroyerz going off, zen dissolving the top of the
// board) leaves its art where it was (CONFIG.remains), under everything still on the board, as
// light rather than paint: three of it, added together, each fading at its own rate. The art
// itself, sharp, much darker than the blocks in play, goes first; a soft blur of it goes next;
// and a wide glow of it, rising as the sharp art goes, lingers longest, a faint colour spread
// across the board long after the shapes in it can be made out. As it gets older its red and blue
// drift apart (an old screen's colour fringes), and dark scanlines run through all of it (so many
// a cell, not a screen's pixels: it looks the same on every screen, phone or desktop). A block
// destroyed where one was before takes its place. And a block that moves away (rows coming down
// after a clear, a Gravitizerz) leaves its art in the cell it left, as if destroyed there, so each
// cell shows the last art that was in it (CONFIG.remains.moved). They come in layers, a new one
// every few seconds; when the board shakes, each layer moves a little less than the board does,
// the older the less (parallax). The blocks still in play are drawn a little lighter (liveLift),
// to stand out. (seedRemains makes up layers of it, as if a game had been going a while: the
// home screen's boards start with some.)
//
// It's on to try out, and it's all in here, so it's easy to take out: this file, CONFIG.remains,
// its section of the developer tools (src/devtools.js), and the hooks, each marked
// "src/remains.js": in src/game.js, leaveRemains where blocks are destroyed (clearFullLines,
// firePowerupEffect, zenRescue) and ageRemains (updateGame: and what moved away, by the board as
// it was and is); in src/render.js, drawUnderBlocks
// and drawBoard (drawRemains, remainsKey, remainsShaken; remainsView, remainsCache and
// blocksCache for them), quakeTransform's `k`, and liveLift and liftColour (styleKey, getSprite
// and renderSprite, drawPixelArtDevice's `tone`), and remainsView's `calm`; in src/home.js,
// seedRemains (startBackground, startIdleTurbo) and paintRemains (remainsUnder, for newMosaic and
// calmMosaic); and src/mosaic.js paintMosaic's `under`.

import { CONFIG } from "../config.js";
import { clamp01 } from "./util.js";
import { getShapePaint } from "./shapes.js";

const cfg = () => CONFIG.remains ?? {};
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);

// On, in this mode? (not in the tutorial: CONFIG.remains.notIn)
export const remainsOn = (state) => !!cfg().enabled && !(cfg().notIn ?? []).includes(state.mode);
// (for good, or fading away)
const lasting = () => !!cfg().forever || !(cfg().fadeAwaySec > 0);
const layerCount = () => Math.max(1, num(cfg().layers, 12));
// How long, in ms, the sharp art and the soft blur take to fade, and the glow (all of it)
const sharpMs = () => Math.max(100, num(cfg().sharpSec, 45) * 1000);
const softMs = () => Math.max(100, num(cfg().softSec, 60) * 1000);
const lifeMs = () => Math.max(sharpMs(), softMs(), num(cfg().fadeAwaySec, 0) * 1000);

// How much lighter the blocks still in play are drawn, while this is on: a gamma (1: as they are).
export const liveLift = () => (cfg().enabled ? Math.max(0.1, cfg().liveLift ?? 1) : 1);

// A block's colour as the blocks still in play are drawn (src/render.js getSprite): each of its
// red, green and blue lifted by that gamma, the darker ones the more. (#rgb or #rrggbb; anything
// else as it is.)
const lifted = new Map(); // colour -> lifted, for the gamma liftedBy
let liftedBy = 1;
export function liftColour(colour) {
  const gamma = liveLift();
  if (gamma === 1 || typeof colour !== "string") return colour;
  if (gamma !== liftedBy) { lifted.clear(); liftedBy = gamma; }
  let out = lifted.get(colour);
  if (out) return out;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(colour.trim());
  if (!m) return colour;
  const hex = m[1].length === 3 ? [...m[1]].map(ch => ch + ch).join("") : m[1];
  out = "#" + [0, 2, 4].map(k => Math.round(255 * Math.pow(parseInt(hex.slice(k, k + 2), 16) / 255, 1 / gamma)).toString(16).padStart(2, "0")).join("");
  lifted.set(colour, out);
  return out;
}

// The remains on the board: { board, cols, rows, layers, clock, version, seen }
//   layers: newest first: { born (clock), cells (Map: y * cols + x -> { paint, style }), version
//           (changes with its cells) }
//   clock: ms of play since the first (as you see it: turbo zen's fade no quicker)
//   version: changes with them (never the same twice, on any board: the renderer's caches)
//   seen: what was on the board, for what moved away (leftBehind): { version (the board's), cells }
// They belong to the board they were left on: a new board (a new game, a fresh start in the
// tutorial, the developer tools' clear) has none.
let versions = 0;
function remainsOf(state, make = false) {
  const r = state.remains;
  if (r?.board === state.board) return r;
  if (!make) return null;
  const rows = state.board.length, cols = state.board[0]?.length ?? 0;
  return (state.remains = { board: state.board, cols, rows, layers: [], clock: 0, version: ++versions });
}

// No more than `layers` of them: two next to each other, the two nearest in age (for the look of
// them: 50 s and 55 s nearer than 5 s and 10 s), go into one, the newer's cells in front, as old
// as the two of them were, on average, cell by cell (or there for good, the older). Never the
// newest (it may still be filling).
function fold(r) {
  const c = Math.max(1000, num(cfg().layerSec, 4) * 1000);
  const age = (l) => (lasting() ? Math.min(r.clock - l.born, sharpMs()) : r.clock - l.born);
  while (r.layers.length > Math.max(2, layerCount())) {
    let best = -1, gap = Infinity;
    for (let i = r.layers.length - 2; i >= 1; i--) {
      const g = Math.log((age(r.layers[i + 1]) + c) / (age(r.layers[i]) + c));
      if (g < gap) { gap = g; best = i; }
    }
    const [newer] = r.layers.splice(best, 1), into = r.layers[best];
    const n = into.cells.size, m = newer.cells.size;
    if (!lasting() && n + m) into.born = (into.born * n + newer.born * m) / (n + m);
    for (const [i, e] of newer.cells) into.cells.set(i, e);
    into.version++;
  }
}

// Blocks destroyed, [{ x, y, cell }] (where each one was): each leaves its art there, in the
// newest layer (a new one every layerSec, so all of a layer is near enough the same age).
export function leaveRemains(state, gone) {
  if (!gone?.length || !remainsOn(state)) return;
  const r = remainsOf(state, true);
  const left = gone.filter(({ x, y, cell }) => cell && x >= 0 && y >= 0 && x < r.cols && y < r.rows);
  if (!left.length) return;
  const every = 1000 * Math.max(0, num(cfg().layerSec, 4));
  let layer = r.layers[0];
  if (!layer || r.clock - layer.born >= every) r.layers.unshift(layer = { born: r.clock, cells: new Map(), version: 0 });
  for (const { x, y, cell } of left) layer.cells.set(y * r.cols + x, { paint: cell.paint, style: cell.style });
  layer.version++;
  cover(r);
  fold(r);
  r.version = ++versions;
}

// Where a newer layer has something, the older ones have nothing (being light, they'd add up,
// brighter and brighter where blocks are destroyed again and again: the bottom rows); a layer left
// with nothing goes.
function cover(r) {
  const seen = new Set();
  for (const layer of r.layers) {
    let gone = false;
    for (const i of layer.cells.keys()) {
      if (seen.has(i)) { layer.cells.delete(i); gone = true; } else seen.add(i);
    }
    if (gone) layer.version++;
  }
  r.layers = r.layers.filter(l => l.cells.size);
}

// Blocks that moved away (rows coming down after a clear, a Gravitizerz, anything that moves
// them), CONFIG.remains.moved: a cell a block has left, empty now, shows that block's art, as if
// it had been destroyed there, so each cell shows the last art that was in it. (What was where,
// cell by cell, as the board was last time: r.seen; set again whenever the board changes. A cell
// a block has left that another's come into is that one's, and shows its art when it goes.)
function leftBehind(state) {
  if (!cfg().moved || !remainsOn(state)) {
    const r = remainsOf(state);
    if (r) r.seen = null; // (switched on again, as the board is then, not as it was)
    return;
  }
  const r = remainsOf(state, true);
  if (r.seen?.version === state.boardVersion) return;
  const was = r.seen?.cells, now = new Array(r.rows * r.cols), left = [];
  for (let y = 0; y < r.rows; y++) {
    const row = state.board[y];
    for (let x = 0; x < r.cols; x++) {
      const i = y * r.cols + x, cell = (now[i] = row?.[x] ?? null);
      if (!cell && was?.[i]) left.push({ x, y, cell: was[i] });
    }
  }
  r.seen = { version: state.boardVersion, cells: now };
  leaveRemains(state, left);
}

// The game going on, `dt` ms of it (as you see it): fading away, a layer goes once its glow has;
// and what blocks that moved away left behind (leftBehind).
export function ageRemains(state, dt) {
  leftBehind(state);
  const r = remainsOf(state);
  if (!r?.layers.length) return;
  r.clock += dt;
  if (lasting()) return;
  const life = lifeMs(), n = r.layers.length;
  r.layers = r.layers.filter(l => r.clock - l.born < life);
  if (r.layers.length !== n) r.version = ++versions;
}

const smooth01 = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };

// How a layer looks, as old as it is: { age (0 new, 1 gone), sharp, soft, glow (how strongly each
// of the three shows: 0 not at all, 1 as bright as the art in play), shift (cells red and blue
// are apart), depth (0 at the front, 1 at the back: when the board shakes, it goes 1 - parallax ×
// depth of the way with it) }. There for good, it stops getting older once the sharp art has gone.
function look(r, layer) {
  const c = cfg(), life = lifeMs();
  const age = lasting() ? Math.min(r.clock - layer.born, sharpMs()) : r.clock - layer.born;
  const u = clamp01(age / life);
  return {
    age: u,
    sharp: (1 - clamp01(num(c.darker, 0.8))) * (1 - clamp01(num(c.faded, 0.3))) * (1 - smooth01(age / sharpMs())),
    soft: clamp01(num(c.softStrength, 0.04)) * (1 - smooth01(age / softMs())),
    // (rising as the sharp art goes, then the long, slow tail)
    glow: clamp01(num(c.glowStrength, 0.25)) * (0.3 + 0.7 * smooth01(age / sharpMs())) * (1 - smooth01(u)),
    shift: Math.max(0, num(c.rgbShift, 0)) * clamp01(age / sharpMs()),
    depth: 0.25 + 0.75 * u,
  };
}

// What's left in a cell (no more than one: a newer takes the place of an older): [{ paint, style,
// depth (its layer: 0 the newest), age, sharp, soft, glow, shift }] (none: empty).
export function remainsAt(state, x, y) {
  const r = remainsOf(state);
  if (!r) return [];
  const i = y * r.cols + x;
  return r.layers.flatMap((layer, depth) => {
    const e = layer.cells.get(i);
    if (!e) return [];
    const { age, sharp, soft, glow, shift } = look(r, layer);
    return [{ paint: e.paint, style: e.style, depth, age, sharp, soft, glow, shift }];
  });
}

// What they look like now, for the renderer's cache of them (drawn again when this changes): what's
// left where, the look, and while any of them are still getting older, how far on it is (a
// fortieth of the time the youngest one's sharp art, or soft blur, takes to go, or a sixtieth of
// the glow's: too little at a time to see).
export function remainsKey(state) {
  const r = remainsOf(state);
  if (!r?.layers.length || !remainsOn(state)) return "";
  const c = cfg(), youngest = r.clock - r.layers[0].born;
  const ageing = !lasting() || youngest < sharpMs();
  const step = youngest < sharpMs() ? sharpMs() / 40 : youngest < softMs() ? softMs() / 40 : lifeMs() / 60;
  return [r.version, c.darker, c.faded, c.saturation, c.sharpSec, c.softBlur, c.softStrength, c.softSec, c.glowBlur,
    c.glowStrength, c.fadeAwaySec, c.forever, c.rgbShift, c.scanlines, c.scanlinesPerCell,
    ageing ? Math.floor(r.clock / Math.max(100, step)) : ""].join("|");
}

// Is the board shaking enough for the layers to be seen to move apart? (Then the renderer draws
// them every frame, each where it is, under the blocks, rather than from its cache.)
export function remainsShaken(state) {
  const t = state.fx?.quake?.trauma ?? 0;
  if (t * t * (CONFIG.fx.quake.maxOffsetPx ?? 0) * clamp01(cfg().parallax ?? 0) < 0.2) return false;
  return !!remainsOf(state)?.layers.length && remainsOn(state);
}

/* =========================
   Made up: as if a game had been going a while
   ========================= */

// Layers of remains of every age, made up from `pieces` (shapes: their own art, piece by piece):
// rows cleared, Destroyerz gone off, the top of a stack dissolved, mostly low on the board. `wrap`
// (cells): the board's that many cells all round are the far side of the rest of it come round
// (for a picture that repeats: paintRemains). `newest`: [{ x, y, cell }] as well, just destroyed.
export function seedRemains(state, pieces, { rng = Math.random, wrap = 0, newest = [] } = {}) {
  if (!remainsOn(state) || !pieces?.length) return;
  const r = remainsOf(state, true);
  const W = r.cols - 2 * wrap, Hh = r.rows - 2 * wrap;
  if (W < 2 || Hh < 2) return;
  const life = lasting() ? sharpMs() * 4 : lifeMs(), n = layerCount();
  r.clock = Math.max(r.clock, life);
  const put = (cells, x, y, cell) => {
    x = ((x % W) + W) % W; y = ((y % Hh) + Hh) % Hh;
    for (const dx of wrap ? [-W, 0, W] : [0]) for (const dy of wrap ? [-Hh, 0, Hh] : [0]) {
      const X = x + wrap + dx, Y = y + wrap + dy;
      if (X >= 0 && Y >= 0 && X < r.cols && Y < r.rows) cells.set(Y * r.cols + X, cell);
    }
  };
  // (a piece's own cells where it was put, those that `keep`)
  const stamp = (cells, keep) => {
    const p = pieces[Math.floor(rng() * pieces.length)], rot = Math.floor(rng() * p.rotations.length), mat = p.rotations[rot];
    const x0 = Math.floor(rng() * W) - (mat[0].length >> 1), y0 = keep.y0 + Math.floor(rng() * keep.h) - (mat.length >> 1);
    for (let y = 0; y < mat.length; y++) for (let x = 0; x < mat[0].length; x++) {
      if (mat[y][x] && keep.has(x0 + x, y0 + y)) put(cells, x0 + x, y0 + y, { paint: getShapePaint(p, rot, x, y), style: p.style });
    }
  };
  const layers = [];
  for (let k = 0; k < n; k++) {
    const cells = new Map();
    for (let e = 1 + Math.floor(rng() * 2); e > 0; e--) {
      const kind = rng();
      // (low on the board, mostly)
      const low = (h) => Math.min(Hh - h, Math.floor(Hh * (0.3 + 0.7 * Math.sqrt(rng())) - h / 2));
      let keep;
      if (kind < 0.5) { const h = 1 + Math.floor(rng() * (kind < 0.15 ? 4 : 2)), y0 = Math.max(0, low(h)); keep = { y0, h, has: (x, y) => !wrap ? x >= 0 && x < W && y >= y0 && y < y0 + h : y >= y0 && y < y0 + h }; }
      else { const rad = 1.5 + rng() * 2.5, cx = Math.floor(rng() * W), cy = Math.max(0, low(0)); keep = { y0: Math.round(cy - rad), h: Math.ceil(2 * rad), has: (x, y) => (wrap || (x >= 0 && x < W && y >= 0 && y < Hh)) && (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad }; }
      for (let tries = 0; tries < 60; tries++) stamp(cells, keep);
    }
    // (older and older, the newest a few seconds old)
    layers.push({ born: r.clock - life * (k + 0.15 + 0.7 * rng()) / n, cells, version: 1 });
  }
  if (newest.length) {
    const cells = new Map();
    for (const { x, y, cell } of newest) put(cells, x, y, { paint: cell.paint, style: cell.style });
    layers.unshift({ born: r.clock - 1500, cells, version: 1 });
  }
  r.layers = [...r.layers, ...layers].sort((a, b) => b.born - a.born);
  cover(r);
  fold(r);
  r.version = ++versions;
}

/* =========================
   Drawing (src/render.js drawUnderBlocks)
   ========================= */

// All three are light: each is added to what's under it (the board, and the older ones), not laid
// over it. The sharp art is drawn at the board's own size, just over its cells; the soft blur and
// the glow smaller (a pixel no wider than the soft blur, as many to a cell on every screen), onto a
// canvas of their own, drawn again only when they change, and that onto the board, smoothed: far
// less to draw. (The board shaking, they move together, as far back as they are on average, and
// only the sharp art moves layer by layer.) With scanlines, all of it goes onto a canvas of the
// board's own pixels (18 a cell, not the screen's: the same pixels on every screen, and fewer of
// them to draw on a phone), the lines are cut from that, and it goes onto the board, each pixel as
// it is, crisp. Each layer's art is drawn onto a canvas of its own (its
// cells, and room round them for the glow to spread into), greyer, only when what's in it changes,
// at the board's size while its sharp art still shows and smaller after. Blurred, it's that made
// smaller and smaller, halving each time, smoothed, and drawn back up to size, smoothed (so it works
// in every browser: no canvas filters), each size made once, when it's first needed; a blur
// between two sizes is the two, one faded into the other. Red and blue apart: the size split into
// its red, its green and its blue, each drawn where it goes.
const drawn = new WeakMap(); // layer -> { px, levels (0 the full one), lowest, up (n -> as it's drawn), ch (n -> [r, g, b]), cells, version, key, x0, y0, x1, y1 (its canvas's cells), tight (just its own), bw, bh }
let smaller = null; // (the canvas the blurs are drawn onto, smaller than the board)
let blurred = null; // (what's on it: { key, x0, y0, x1, y1 (the cells they're over), depth })
let front = null; // (with scanlines, the canvas they're all drawn onto first)
let frontUsed = null; // (the part of it drawn on last time: [x, y, w, h])
const FAINT = 0.004;
const TAPS = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]];

// How many pixels a cell the blurs are drawn at: a cell's board pixels (px: not the screen's, so
// they're the same on every screen), halved for as long as its pixels stay no wider than the soft
// blur.
function blurPixels(px) {
  const halvings = Math.floor(Math.log2(Math.max(1, Math.max(0.05, num(cfg().softBlur, 0.15)) * px)));
  return halvings ? Math.max(1, Math.round(px / 2 ** halvings)) : px;
}

const canvas = (cv, w, h) => {
  cv ??= document.createElement("canvas");
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  return cv;
};

// The remains, onto ctx (in board pixels), the oldest first. view: { cell (board pixels), scale
// (device pixels a board pixel), look (the renderer's look: the sprites are its own),
// sprite(paint, style) (a block's art, cell × scale pixels, as it is: not the lighter one),
// place(ctx, k, s) (puts ctx, s pixels a board pixel, where the board is, its shake k of the way;
// none for the board at rest), calm (calmer animations: src/settings.js) }
export function drawRemains(ctx, state, view) {
  const r = remainsOf(state);
  if (!r?.layers.length || !remainsOn(state)) return;
  const c = cfg(), par = clamp01(c.parallax ?? 0), full = view.cell * view.scale, px = blurPixels(view.cell);
  // (calmer animations: no scanlines, as anywhere; all of it dimmer instead, as dark on the whole)
  const scan = view.calm ? 0 : clamp01(num(c.scanlines, 0));
  const dim = view.calm ? 1 - clamp01(num(c.scanlines, 0)) / 2 : 1;
  const shaking = !!view.place;
  // where the sharp art goes, and the blurs: with scanlines, a canvas of their own first, at the
  // board's own pixels (just what was drawn on it last time cleared), so they're the same pixels
  // on every screen, and that onto the board, each of its pixels as it is; without, the board, at
  // its full size. (os: out's pixels a board pixel; sharpPx: a cell's, the sharp art's)
  let out = ctx, os = view.scale, sharpPx = full;
  if (scan > 0.01) {
    out = (front = canvas(front, r.cols * view.cell, r.rows * view.cell)).getContext("2d");
    out.setTransform(1, 0, 0, 1, 0, 0);
    if (frontUsed) out.clearRect(...frontUsed);
    os = 1;
    sharpPx = view.cell;
  }
  // (the cells drawn over, all told: with scanlines, the only part of that canvas to cut them from
  // and put onto the board; a cell more each way for red and blue apart, and the board shaking, two)
  const box = [r.cols, r.rows, -1, -1], pad = shaking ? 2 : 1;
  const drew = (x0, y0, x1, y1) => {
    box[0] = Math.min(box[0], x0 - pad); box[1] = Math.min(box[1], y0 - pad);
    box[2] = Math.max(box[2], x1 + pad); box[3] = Math.max(box[3], y1 + pad);
  };
  // (the blurs drawn again only when they've changed: not for every frame of the board shaking)
  const key = `${remainsKey(state)}|${view.cell}|${view.scale}|${view.look}|${px}|${sharpPx}|${dim}`;
  const blurs = blurred?.key !== key;
  const g = (smaller = canvas(smaller, r.cols * px, r.rows * px)).getContext("2d");
  if (blurs) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, smaller.width, smaller.height);
    blurred = { key, x0: r.cols, y0: r.rows, x1: -1, y1: -1 }; // (and the cells they're drawn over, in all)
  }
  let deep = 0, weight = 0; // (how far back they are, on average)
  for (let i = r.layers.length - 1; i >= 0; i--) {
    const layer = r.layers[i], lk = look(r, layer);
    const sharp = lk.sharp >= FAINT || i === 0; // (the newest may still be filling)
    if (lk.sharp < FAINT && lk.soft < FAINT && lk.glow < FAINT) continue;
    if (!blurs && lk.sharp < FAINT) continue;
    const d = layerArt(r, layer, view, sharp ? sharpPx : px);
    if (!d) continue;
    // the soft blur and the glow, each at its size (each half the one before), or between two
    let need = sharp ? 0 : Infinity;
    if (blurs) for (const [blur, strength] of [[num(c.softBlur, 0.15), lk.soft], [num(c.glowBlur, 2.5), lk.glow]]) {
      if (strength < FAINT) continue;
      const a = Math.log2(Math.max(1, blur * d.px)), lo = Math.floor(a), f = a - lo;
      need = Math.min(need, lo);
      const sizes = f < 0.1 ? [[lo, 1]] : f > 0.9 ? [[lo + 1, 1]] : [[lo, 1 - f], [lo + 1, f]];
      g.save();
      g.setTransform(px / view.cell, 0, 0, px / view.cell, 0, 0);
      g.globalCompositeOperation = "lighter";
      g.imageSmoothingEnabled = true;
      for (const [n, w] of sizes) put(g, r, layer, d, view, n, strength * w * dim, lk.shift);
      g.restore();
      const b = blurred;
      b.x0 = Math.min(b.x0, d.x0); b.y0 = Math.min(b.y0, d.y0); b.x1 = Math.max(b.x1, d.x1); b.y1 = Math.max(b.y1, d.y1);
      deep += lk.depth * strength; weight += strength;
    }
    // the sharp art (the board shaking, the older, the further back: it goes 1 - parallax × depth
    // of the way with it)
    if (lk.sharp >= FAINT) {
      out.save();
      if (shaking) view.place(out, 1 - par * lk.depth, os); else out.setTransform(os, 0, 0, os, 0, 0);
      out.globalCompositeOperation = "lighter";
      out.imageSmoothingEnabled = false;
      put(out, r, layer, d, view, 0, lk.sharp * dim, shaking ? 0 : lk.shift); // (shaking, drawn every frame: red and blue together)
      out.restore();
      drew(...d.tight);
    } else if (i > 0 && blurs) letGo(d, need); // (only ever blurrier from now on: the sharper sizes can go)
  }
  if (blurs) blurred.depth = weight ? deep / weight : 0.5;
  // the blurs onto the board (or the scanlines' canvas): the cells they were drawn over (shaking,
  // all together, as far back as they are on average)
  const { x0, y0, x1, y1 } = blurred;
  if (x1 >= x0) {
    out.save();
    if (shaking) view.place(out, 1 - par * blurred.depth, os); else out.setTransform(os, 0, 0, os, 0, 0);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    out.globalCompositeOperation = "lighter";
    out.imageSmoothingEnabled = true;
    out.drawImage(smaller, x0 * px, y0 * px, w * px, h * px, x0 * view.cell, y0 * view.cell, w * view.cell, h * view.cell);
    out.restore();
    drew(x0, y0, x1, y1);
  }
  if (out === ctx) return;
  // scanlines: every few of the board's pixels a line of them taken out (so many a cell, on every
  // screen), then all of it onto the board, each pixel as it is
  const X0 = Math.max(0, box[0]), Y0 = Math.max(0, box[1]), X1 = Math.min(r.cols - 1, box[2]), Y1 = Math.min(r.rows - 1, box[3]);
  frontUsed = null;
  if (X1 < X0 || Y1 < Y0) return;
  const sx = X0 * view.cell, sy = Y0 * view.cell, sw = (X1 - X0 + 1) * view.cell, sh = (Y1 - Y0 + 1) * view.cell;
  frontUsed = [sx, sy, sw, sh];
  out.save();
  out.setTransform(1, 0, 0, 1, 0, 0);
  out.globalCompositeOperation = "destination-out";
  out.globalAlpha = scan;
  out.fillStyle = scanPattern(out, Math.max(2, Math.round(view.cell / Math.max(1, num(c.scanlinesPerCell, 9)))));
  out.fillRect(sx, sy, sw, sh);
  out.restore();
  ctx.save();
  ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(front, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.restore();
}

// (lines `pitch` of the board's pixels apart, half as thick)
let scanned = null;
function scanPattern(g, pitch) {
  if (scanned?.pitch !== pitch) {
    const cv = canvas(null, 1, pitch), x = cv.getContext("2d");
    x.fillStyle = "#000";
    x.fillRect(0, pitch - Math.max(1, pitch >> 1), 1, Math.max(1, pitch >> 1));
    scanned = { pitch, cv, pattern: null };
  }
  return (scanned.pattern ??= g.createPattern(scanned.cv, "repeat"));
}

// A layer's art at size n onto g, `alpha` strong; red and blue `shift` cells apart, if that's a
// board pixel or more.
function put(g, r, layer, d, view, n, alpha, shift = 0) {
  const img = drawable(r, layer, d, view, n), X = d.x0 * view.cell, Y = d.y0 * view.cell;
  const s = shift * view.cell / 2;
  g.globalAlpha = Math.min(1, alpha);
  const art = shift * view.cell < 1 ? [[img, 0]] : channels(d, n, img).map((ch, k) => [ch, (1 - k) * s]);
  if (n === 0) {
    // (full size, just its cells, not the room round them)
    const [x0, y0, x1, y1] = d.tight, sx = (x0 - d.x0) * d.px, sy = (y0 - d.y0) * d.px, w = x1 - x0 + 1, h = y1 - y0 + 1;
    for (const [im, dx] of art) g.drawImage(im, sx, sy, w * d.px, h * d.px, x0 * view.cell + dx, y0 * view.cell, w * view.cell, h * view.cell);
    return;
  }
  for (const [im, dx] of art) g.drawImage(im, X + dx, Y, d.bw, d.bh);
}

// A layer's art at size n as it's drawn: past the second halving, made twice the size again,
// four times, half its pixel apart each way, a quarter as strong each, added (much smaller than
// it's drawn, smoother so than once), the first time it's wanted.
function drawable(r, layer, d, view, n) {
  const img = level(r, layer, d, view, n);
  if (n < 2) return img;
  let up = d.up.get(n);
  if (!up) {
    up = canvas(null, img.width * 2, img.height * 2);
    const g = up.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.25;
    for (const [ox, oy] of TAPS) g.drawImage(img, 2 * ox, 2 * oy, up.width, up.height);
    d.up.set(n, up);
  }
  return up;
}

// A layer's art at full size (its cells, px pixels each, greyer), drawn again only where it has
// new cells (the blurred sizes made again from it), unless they've spread beyond its canvas, it
// has let it go, it's to be another size, or the look has changed: then all of it.
function layerArt(r, layer, view, px) {
  const c = cfg();
  const key = `${px}|${view.cell}|${view.look}|${c.saturation}|${c.glowBlur}|${c.softBlur}`;
  let d = drawn.get(layer);
  if (d && d.version === layer.version && d.key === key) return d;
  if (!layer.cells.size) return null;
  // (room round its cells for the glow, in a canvas whose sides halve evenly as many times as
  // that takes)
  const most = Math.max(num(c.glowBlur, 2.5), num(c.softBlur, 0.15), 0);
  const halvings = Math.ceil(Math.log2(Math.max(1, most * px))) + 1, room = Math.ceil(most) + 1;
  let x0 = r.cols, y0 = r.rows, x1 = -1, y1 = -1;
  for (const i of layer.cells.keys()) {
    const x = i % r.cols, y = (i / r.cols) | 0;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const tight = [x0, y0, x1, y1]; // (just its cells: where the sharp art is)
  x0 = Math.max(0, x0 - room); y0 = Math.max(0, y0 - room);
  x1 = Math.min(r.cols - 1, x1 + room); y1 = Math.min(r.rows - 1, y1 + room);
  if (!d) drawn.set(layer, d = {});
  if (d.key !== key || !d.levels?.[0] || x0 < d.x0 || y0 < d.y0 || x1 > d.x1 || y1 > d.y1) {
    const unit = 2 ** halvings, cv = document.createElement("canvas");
    cv.width = Math.ceil((x1 - x0 + 1) * px / unit) * unit;
    cv.height = Math.ceil((y1 - y0 + 1) * px / unit) * unit;
    Object.assign(d, { px, levels: [cv], lowest: 0, up: new Map(), ch: new Map(), cells: new Map(), x0, y0, x1, y1, bw: cv.width * view.cell / px, bh: cv.height * view.cell / px });
  } else { d.levels.length = 1; d.up = new Map(); d.ch = new Map(); }
  const g = d.levels[0].getContext("2d"), added = new Path2D();
  let any = false;
  g.imageSmoothingEnabled = px < view.cell; // (the art made smaller than the board's own pixels: smoothed; at them, each as it is)
  for (const i of d.cells.keys()) {
    if (layer.cells.has(i)) continue;
    // (gone from it: a newer layer has something there)
    g.clearRect((i % r.cols - d.x0) * px, (((i / r.cols) | 0) - d.y0) * px, px, px);
    d.cells.delete(i);
  }
  for (const [i, e] of layer.cells) {
    if (d.cells.get(i) === e) continue;
    const X = (i % r.cols - d.x0) * px, Y = (((i / r.cols) | 0) - d.y0) * px;
    g.clearRect(X, Y, px, px);
    g.drawImage(view.sprite(e.paint, e.style), X, Y, px, px);
    added.rect(X, Y, px, px);
    d.cells.set(i, e);
    any = true;
  }
  if (any) tint(g, added, c);
  d.tight = tight;
  d.version = layer.version;
  d.key = key;
  return d;
}

// A layer's art at size n (0 full size, each one after half the one before), made from the one
// before it the first time it's wanted.
function level(r, layer, d, view, n) {
  if (n < d.lowest) { d.key = null; layerArt(r, layer, view, d.px); } // (one it had let go: all of it again)
  while (d.levels.length <= n) {
    const prev = d.levels[d.levels.length - 1], cv = document.createElement("canvas");
    cv.width = Math.max(1, prev.width >> 1);
    cv.height = Math.max(1, prev.height >> 1);
    const g = cv.getContext("2d");
    g.imageSmoothingEnabled = true;
    // (past the first halving, four times, half a pixel apart each way, a quarter as strong each,
    // added: smoother than once)
    if (d.levels.length < 2) g.drawImage(prev, 0, 0, cv.width, cv.height);
    else {
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.25;
      for (const [ox, oy] of TAPS) g.drawImage(prev, ox, oy, cv.width, cv.height);
    }
    d.levels.push(cv);
  }
  return d.levels[n];
}

// Size n (src: as it's drawn) split into its red, its green and its blue (made the first time
// they're wanted).
function channels(d, n, src) {
  let ch = d.ch.get(n);
  if (ch) return ch;
  const w = src.width, h = src.height;
  if (n === 0) {
    // (full size, its pixels solid or not there at all: each the art multiplied by the colour,
    // then cut back to its shape; quicker than reading every pixel of something that big)
    ch = ["#ff0000", "#00ff00", "#0000ff"].map(colour => {
      const cv = canvas(null, w, h), g = cv.getContext("2d");
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = "multiply";
      g.fillStyle = colour;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = "destination-in";
      g.drawImage(src, 0, 0);
      return cv;
    });
    d.ch.set(n, ch);
    return ch;
  }
  const data = src.getContext("2d").getImageData(0, 0, w, h);
  ch = [0, 1, 2].map(k => {
    const img = new ImageData(new Uint8ClampedArray(data.data), w, h), p = img.data;
    for (let j = 0; j < p.length; j += 4) for (let q = 0; q < 3; q++) if (q !== k) p[j + q] = 0;
    const cv = canvas(null, w, h);
    cv.getContext("2d").putImageData(img, 0, 0);
    return cv;
  });
  d.ch.set(n, ch);
  return ch;
}

// The sizes below n let go (all but the smallest made so far, which the rest are made from).
function letGo(d, n) {
  const upTo = Math.min(n, d.levels.length - 1);
  for (let j = d.lowest; j < upTo; j++) {
    if (d.levels[j]) d.levels[j].width = d.levels[j].height = 0;
    d.levels[j] = null;
    d.up.delete(j);
    d.ch.delete(j);
  }
  d.lowest = Math.max(d.lowest, upTo);
}

// Greyer (or, past 1, stronger: each colour's saturation pulled towards none, or full).
function tint(g, cells, c) {
  const sat = Math.max(0, num(c.saturation, 1));
  if (sat !== 1) {
    g.globalCompositeOperation = "saturation";
    g.globalAlpha = Math.min(1, Math.abs(1 - sat));
    g.fillStyle = sat < 1 ? "#808080" : "#ff0000"; // (only how saturated it is counts)
    g.fill(cells);
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
}

/* =========================
   A picture's (src/home.js: its tiled boards)
   ========================= */

// Made-up remains (seedRemains) for a picture `cols` × `rows` cells of `cell` pixels that repeats
// in every direction (so they come round at its edges), behind `gone` ([{ x, y, cell }]: the
// newest). sprite(paint, style): a block's art, `cell` pixels; calm: calmer animations. Returns
// paint(ctx, until): a layer at a time (it's a lot to draw: all at once would hold up a frame),
// until performance.now() is past `until`, and once they're all ready, onto ctx; true when it has.
export function paintRemains({ cols, rows, cell, pieces, gone = [], sprite, rng = Math.random, calm = false }) {
  if (!cfg().enabled) return () => true;
  const m = Math.ceil(Math.max(num(cfg().glowBlur, 2.5), num(cfg().softBlur, 0.15))) + 2;
  const board = Array.from({ length: rows + 2 * m }, () => Array(cols + 2 * m).fill(null));
  const state = { mode: "home", board };
  seedRemains(state, pieces, { rng, wrap: m, newest: gone });
  const r = remainsOf(state), view = { cell, scale: 1, look: "picture", sprite, calm };
  const todo = [...(r?.layers ?? [])];
  return (ctx, until = Infinity) => {
    while (todo.length) {
      ready(r, todo.pop(), view);
      if (performance.now() >= until) return false;
    }
    if (!r) return true;
    const cv = canvas(null, (cols + 2 * m) * cell, (rows + 2 * m) * cell), g = cv.getContext("2d");
    g.fillStyle = "#000";
    g.fillRect(0, 0, cv.width, cv.height);
    drawRemains(g, state, view);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(cv, m * cell, m * cell, cols * cell, rows * cell, 0, 0, cols * cell, rows * cell);
    ctx.restore();
    cv.width = cv.height = 0;
    return true;
  };
}

// A layer's art made ready to draw, every size of it drawRemains will want (as drawRemains decides).
function ready(r, layer, view) {
  const c = cfg(), lk = look(r, layer), full = view.cell * view.scale;
  const d = layerArt(r, layer, view, lk.sharp >= FAINT || layer === r.layers[0] ? full : blurPixels(view.cell));
  if (!d) return;
  const split = lk.shift * view.cell >= 1;
  for (const [blur, strength] of [[num(c.softBlur, 0.15), lk.soft], [num(c.glowBlur, 2.5), lk.glow]]) {
    if (strength < FAINT) continue;
    const lo = Math.floor(Math.log2(Math.max(1, blur * d.px)));
    for (const n of [lo, lo + 1]) { const img = drawable(r, layer, d, view, n); if (split) channels(d, n, img); }
  }
  if (lk.sharp >= FAINT && split) channels(d, 0, drawable(r, layer, d, view, 0));
}
