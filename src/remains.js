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
// the older the less (parallax: on the fullest look tier, CONFIG.fx.quality's remainsDepth; on
// the others they shake with it, and their picture's drawn again less often, remainsEvery, and on
// the lightest with less in it, remainsLite). The blocks still in play are drawn a little lighter
// (liveLift), to stand out. (seedRemains makes up layers of it, as if a game had been going a
// while: the home screen's boards start with some.)
//
// It's on to try out, and it's all in here, so it's easy to take out: this file, CONFIG.remains,
// remainsDepth, remainsEvery and remainsLite in CONFIG.fx.quality's tiers, its section of the
// developer tools (src/devtools.js), and the hooks, each marked "src/remains.js": in src/game.js,
// leaveRemains where blocks are destroyed (clearFullLines, firePowerupEffect, zenRescue) and
// ageRemains (updateGame: and what moved away, by the board as it was and is); in src/render.js,
// drawUnderBlocks, drawResting and drawBoard (drawRemains, remainsPainter, remainsKey,
// remainsShaken; remainsView, remainsAtRest, restingChange, remainsCache and blocksCache for
// them), quakeTransform's `k`, and liveLift and liftColour (styleKey, getSprite
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
// the glow's: too little at a time to see; or `every` so many of those, for less to draw).
export function remainsKey(state, every = 1) {
  const r = remainsOf(state);
  if (!r?.layers.length || !remainsOn(state)) return "";
  const c = cfg(), youngest = r.clock - r.layers[0].born;
  const ageing = !lasting() || youngest < sharpMs();
  const step = youngest < sharpMs() ? sharpMs() / 40 : youngest < softMs() ? softMs() / 40 : lifeMs() / 60;
  return [r.version, c.darker, c.faded, c.saturation, c.sharpSec, c.softBlur, c.softStrength, c.softSec, c.glowBlur,
    c.glowStrength, c.fadeAwaySec, c.forever, c.rgbShift, c.scanlines, c.scanlinesPerCell, c.scanlineGlow,
    ageing ? Math.floor(r.clock / (Math.max(100, step) * Math.max(1, every))) : ""].join("|");
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
// them to draw on a phone), the lines are cut from that (a faint glow of the art left in them), and
// it goes onto the board, each pixel as it is, crisp. Each layer's art is drawn onto a canvas of
// its own (its cells, and room round them for the glow to spread into), greyer, only where what's
// in it changes, at the board's size while its sharp art still shows and smaller after. Blurred,
// it's that made smaller and smaller, halving each time, smoothed, and drawn back up to size,
// smoothed (so it works in every browser: no canvas filters), each size made when it's first
// needed, and again (on the same canvas) only when the art has changed; a blur between two sizes
// is the two, one faded into the other. Red and blue apart: the sharp art split into its red, its
// green and its blue, each drawn where it goes (the blurs as they are: a fifth of a cell apart, in
// a blur cells wide, makes no difference to see). None of it is ever read back out of a canvas
// (that would hold the drawing up). At rest, it's a picture made a little at a time
// (remainsPainter), so a big change doesn't hold up a frame.
const drawn = new WeakMap(); // layer -> { key, px, levels (0 the full one, each after half the one before), fresh (how many of them, from the full one, are as the art is now), up (n -> as it's drawn), upFresh (those of them that are), ch ([r, g, b] of the full one), chFresh, cells, version, done (false: it's still being drawn, a little at a time), x0, y0, x1, y1 (its canvas's cells), tight (just its own), bw, bh }
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

// The canvases a drawing of them goes through (drawRemains has its own; a painter, two, a picture
// made in one while the other's on show): { front (with scanlines, or for a picture, all of it,
// at the board's own pixels), used (the part of front drawn on: [x, y, w, h], board pixels),
// smaller (the blurs), blurred (what's on it: { key, x0, y0, x1, y1 (the cells they're over),
// depth }), glow (front, smaller, for the glow in the scanlines), until (performance.now() to stop
// by, for a step at a time) }
const kit = () => ({ front: null, used: null, smaller: null, blurred: null, glow: null, until: Infinity });
const own = kit();

// The remains, onto ctx (in board pixels), the oldest first, all at once. view: { cell (board
// pixels), scale (device pixels a board pixel), look (the renderer's look: the sprites are its
// own), sprite(paint, style) (a block's art, cell × scale pixels, as it is: not the lighter one),
// place(ctx, k, s) (puts ctx, s pixels a board pixel, where the board is, its shake k of the way;
// none for the board at rest), calm (calmer animations: src/settings.js), every (a picture of
// them, remainsPainter's: drawn again for every so many of the steps their look takes, remainsKey),
// lite (less to draw: red and blue never apart, no glow in the scanlines) }
export function drawRemains(ctx, state, view) {
  own.until = Infinity;
  const steps = drawing(ctx, state, view, own);
  while (!steps.next().done);
}

// drawRemains's work, a step at a time (after each layer, and each stage after them): onto ctx;
// or, ctx null, just onto k.front, at the board's own pixels (scanlines or not), for a picture of
// them, k.used saying where it's been drawn on (none: nowhere).
function* drawing(ctx, state, view, k) {
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
  if (scan > 0.01 || !ctx) {
    out = (k.front = canvas(k.front, r.cols * view.cell, r.rows * view.cell)).getContext("2d");
    out.setTransform(1, 0, 0, 1, 0, 0);
    if (k.used) out.clearRect(...k.used);
    k.used = [0, 0, k.front.width, k.front.height]; // (until it's known where: anywhere, if it's stopped part way)
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
  const blurs = k.blurred?.key !== key;
  const smaller = (k.smaller = canvas(k.smaller, r.cols * px, r.rows * px)), g = smaller.getContext("2d");
  if (blurs) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, smaller.width, smaller.height);
    k.blurred = { key, x0: r.cols, y0: r.rows, x1: -1, y1: -1 }; // (and the cells they're drawn over, in all)
  }
  const blurred = k.blurred;
  let deep = 0, weight = 0; // (how far back they are, on average)
  for (const layer of [...r.layers].reverse()) {
    const lk = look(r, layer);
    const sharp = lk.sharp >= FAINT || layer === r.layers[0]; // (the newest may still be filling)
    if (lk.sharp < FAINT && lk.soft < FAINT && lk.glow < FAINT) continue;
    if (!blurs && lk.sharp < FAINT) continue;
    // (its art, as much of it as there's time for at once, the rest a step at a time)
    let d = layerArt(r, layer, view, sharp ? sharpPx : px, k.until);
    while (d && !d.done) { yield; d = layerArt(r, layer, view, sharp ? sharpPx : px, k.until); }
    if (!d) continue;
    // the soft blur and the glow, each at its size (each half the one before), or between two
    if (blurs) for (const [blur, strength] of [[num(c.softBlur, 0.15), lk.soft], [num(c.glowBlur, 2.5), lk.glow]]) {
      if (strength < FAINT) continue;
      const a = Math.log2(Math.max(1, blur * d.px)), lo = Math.floor(a), f = a - lo;
      const sizes = f < 0.1 ? [[lo, 1]] : f > 0.9 ? [[lo + 1, 1]] : [[lo, 1 - f], [lo + 1, f]];
      g.save();
      g.setTransform(px / view.cell, 0, 0, px / view.cell, 0, 0);
      g.globalCompositeOperation = "lighter";
      g.imageSmoothingEnabled = true;
      for (const [n, w] of sizes) put(g, d, view, n, strength * w * dim);
      g.restore();
      blurred.x0 = Math.min(blurred.x0, d.x0); blurred.y0 = Math.min(blurred.y0, d.y0);
      blurred.x1 = Math.max(blurred.x1, d.x1); blurred.y1 = Math.max(blurred.y1, d.y1);
      deep += lk.depth * strength; weight += strength;
    }
    // the sharp art (the board shaking, the older, the further back: it goes 1 - parallax × depth
    // of the way with it)
    if (lk.sharp >= FAINT) {
      out.save();
      if (shaking) view.place(out, 1 - par * lk.depth, os); else out.setTransform(os, 0, 0, os, 0, 0);
      out.globalCompositeOperation = "lighter";
      out.imageSmoothingEnabled = false;
      put(out, d, view, 0, lk.sharp * dim, shaking || view.lite ? 0 : lk.shift); // (shaking, drawn every frame: red and blue together)
      out.restore();
      drew(...d.tight);
    }
    yield;
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
  if (X1 < X0 || Y1 < Y0) { k.used = null; return; }
  const sx = X0 * view.cell, sy = Y0 * view.cell, sw = (X1 - X0 + 1) * view.cell, sh = (Y1 - Y0 + 1) * view.cell;
  const front = k.front;
  k.used = [sx, sy, sw, sh];
  if (scan > 0.01) {
    yield;
    const pitch = Math.max(2, Math.round(view.cell / Math.max(1, num(c.scanlinesPerCell, 9))));
    // (and a faint glow in the dark lines, scanlineGlow strong, as an old screen's lit lines glow
    // into the dark between them: all of it, before they're taken out, made a quarter the size,
    // smoothed, so each of its pixels is a little of the art round it, and drawn back up, smoothed,
    // into just the dark lines, in the art's own colours)
    const bloom = view.lite ? 0 : clamp01(num(c.scanlineGlow, 0));
    if (bloom > 0.01) {
      k.glow = canvas(k.glow, Math.max(1, Math.round(sw / 4)), Math.max(1, Math.round(sh / 4)));
      const b = k.glow.getContext("2d");
      b.globalCompositeOperation = "copy";
      b.imageSmoothingEnabled = true;
      b.drawImage(front, sx, sy, sw, sh, 0, 0, k.glow.width, k.glow.height);
    }
    out.save();
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.globalCompositeOperation = "destination-out";
    out.globalAlpha = scan;
    out.fillStyle = scanPattern(out, pitch);
    out.fillRect(sx, sy, sw, sh);
    if (bloom > 0.01) {
      out.clip(scanPath(pitch, front.width, front.height));
      out.globalCompositeOperation = "lighter";
      out.globalAlpha = bloom;
      out.imageSmoothingEnabled = true;
      out.drawImage(k.glow, 0, 0, k.glow.width, k.glow.height, sx, sy, sw, sh);
    }
    out.restore();
  }
  if (!ctx) return;
  ctx.save();
  ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(front, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.restore();
}

// A picture of the remains at rest, for the board (src/render.js drawBoard): drawn a little at a
// time, no more than CONFIG.remains.paintMs of work a frame, on a canvas of its own while the last
// one stays on show, so a big change (a new board's made-up layers, all their art to draw; or
// all of it, older) doesn't hold up a frame. Returns paint(state, view): call it every frame; it
// does that frame's work and says what's on show: { key (what it's a picture of: "" for none),
// cv (it, at the board's own pixels: null for nothing to see), x, y, w, h (the part of it drawn
// on, board pixels) }. (Not for calmer animations on a sharp screen: the sharp art at the screen's
// own pixels there, drawRemains.) Each picture is of what's left as it was when it was begun (its
// layers' cells copied), so it's never half what was and half what is, and what changes meanwhile
// goes into the next one, not this one begun again.
export function remainsPainter() {
  const kits = [kit(), kit()], shown = { key: "", r: null, cv: null, x: 0, y: 0, w: 0, h: 0 };
  let next = 0, job = null;
  const start = (state, view, key, r) => {
    const as = { mode: state.mode, board: state.board, remains: { ...r, layers: r.layers.map(l => ({ ...l, cells: new Map(l.cells), real: l })) } };
    return { key, r, k: kits[next], steps: drawing(null, as, view, kits[next]) };
  };
  return (state, view) => {
    const r = remainsOf(state), now = remainsKey(state, view.every);
    if (!now) { job = null; return Object.assign(shown, { key: "", r: null, cv: null }); }
    const key = `${now}|${view.cell}|${view.scale}|${view.look}|${view.calm}|${!!view.lite}`;
    // (another board's, as a new game starts: off at once, not on this one)
    if (shown.r !== r) Object.assign(shown, { key: "", r: null, cv: null });
    if (job && job.r !== r) job = null;
    // (finished last frame: on show from this one, so no frame both finishes it and has the board
    // drawn again with it)
    if (job?.done) {
      const u = job.k.used;
      Object.assign(shown, { key: job.key, r, cv: u ? job.k.front : null, x: u?.[0] ?? 0, y: u?.[1] ?? 0, w: u?.[2] ?? 0, h: u?.[3] ?? 0 });
      next = 1 - next;
      job = null;
      return shown;
    }
    if (!job && key !== shown.key) job = start(state, view, key, r);
    if (!job) return shown;
    job.k.until = performance.now() + Math.max(0, num(cfg().paintMs, 4));
    let step;
    do step = job.steps.next(); while (!step.done && performance.now() < job.k.until);
    job.done = step.done;
    return shown;
  };
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

// (the same lines, as a shape over the whole board, w by h: to draw into just them)
let scanShape = null;
function scanPath(pitch, w, h) {
  if (scanShape?.pitch !== pitch || scanShape.w !== w || scanShape.h !== h) {
    const path = new Path2D(), thick = Math.max(1, pitch >> 1);
    for (let y = 0; y < h; y += pitch) path.rect(0, y + pitch - thick, w, thick);
    scanShape = { pitch, w, h, path };
  }
  return scanShape.path;
}

// A layer's art at size n onto g, `alpha` strong; the sharp art's (n 0) red and blue `shift`
// cells apart, if that's a board pixel or more.
function put(g, d, view, n, alpha, shift = 0) {
  const img = drawable(d, n), X = d.x0 * view.cell, Y = d.y0 * view.cell;
  const s = shift * view.cell / 2;
  g.globalAlpha = Math.min(1, alpha);
  const art = n || shift * view.cell < 1 ? [[img, 0]] : channels(d, img).map((ch, k) => [ch, (1 - k) * s]);
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
// it's drawn, smoother so than once), when it's first wanted, and again when the art has changed.
function drawable(d, n) {
  const img = level(d, n);
  if (n < 2) return img;
  if (!d.upFresh.has(n)) {
    const up = canvas(d.up.get(n), img.width * 2, img.height * 2), g = up.getContext("2d");
    g.globalAlpha = 1;
    g.clearRect(0, 0, up.width, up.height);
    g.imageSmoothingEnabled = true;
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.25;
    for (const [ox, oy] of TAPS) g.drawImage(img, 2 * ox, 2 * oy, up.width, up.height);
    d.up.set(n, up);
    d.upFresh.add(n);
  }
  return d.up.get(n);
}

// A layer's art at full size (its cells, px pixels each, greyer), drawn again only where it's
// changed (the blurred sizes made again from it), unless its cells have spread beyond its canvas,
// it's to be another size, or the look has changed: then all of it. A little at a time, if need
// be: as many of its cells as there's time for, until performance.now() is past `until` (`done`
// says whether that was all of them). (`layer`: a copy of it, as it was, for a picture: its art
// the same layer's, `real`.)
function layerArt(r, layer, view, px, until = Infinity) {
  const c = cfg(), real = layer.real ?? layer;
  const key = `${px}|${view.cell}|${view.look}|${c.saturation}|${c.glowBlur}|${c.softBlur}`;
  let d = drawn.get(real);
  if (d && d.version === layer.version && d.key === key && d.done) return d;
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
  if (!d) drawn.set(real, d = {});
  if (d.key !== key || x0 < d.x0 || y0 < d.y0 || x1 > d.x1 || y1 > d.y1) {
    const unit = 2 ** halvings, cv = document.createElement("canvas");
    cv.width = Math.ceil((x1 - x0 + 1) * px / unit) * unit;
    cv.height = Math.ceil((y1 - y0 + 1) * px / unit) * unit;
    Object.assign(d, { key, px, levels: [cv], fresh: 1, up: new Map(), upFresh: new Set(), ch: null, chFresh: false, cells: new Map(), x0, y0, x1, y1, bw: cv.width * view.cell / px, bh: cv.height * view.cell / px });
  }
  const g = d.levels[0].getContext("2d"), added = new Path2D();
  let changed = false, any = false, n = 0;
  d.done = true;
  g.imageSmoothingEnabled = px < view.cell; // (the art made smaller than the board's own pixels: smoothed; at them, each as it is)
  for (const i of d.cells.keys()) {
    if (layer.cells.has(i)) continue;
    // (gone from it: a newer layer has something there)
    g.clearRect((i % r.cols - d.x0) * px, (((i / r.cols) | 0) - d.y0) * px, px, px);
    d.cells.delete(i);
    changed = true;
  }
  for (const [i, e] of layer.cells) {
    if (d.cells.get(i) === e) continue;
    if (++n % 8 === 0 && performance.now() > until) { d.done = false; break; } // (the rest next time)
    const X = (i % r.cols - d.x0) * px, Y = (((i / r.cols) | 0) - d.y0) * px;
    g.clearRect(X, Y, px, px);
    const spr = view.sprite(e.paint, e.style);
    if (spr.img) g.drawImage(spr.img, spr.sx, spr.sy, spr.s, spr.s, X, Y, px, px); // (on a sheet: render.js spriteSheets)
    else g.drawImage(spr, X, Y, px, px);
    added.rect(X, Y, px, px);
    d.cells.set(i, e);
    any = true;
  }
  if (any) tint(g, added, c);
  if (changed || any) { d.fresh = 1; d.upFresh.clear(); d.chFresh = false; }
  d.tight = tight;
  if (d.done) d.version = layer.version;
  return d;
}

// A layer's art at size n (0 full size, each one after half the one before), made from the one
// before it when it's first wanted, and again (on the same canvas) when the art has changed.
function level(d, n) {
  while (d.fresh <= n) {
    const j = d.fresh, prev = d.levels[j - 1];
    const cv = (d.levels[j] = canvas(d.levels[j], Math.max(1, prev.width >> 1), Math.max(1, prev.height >> 1))), g = cv.getContext("2d");
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, cv.width, cv.height);
    g.imageSmoothingEnabled = true;
    // (past the first halving, four times, half a pixel apart each way, a quarter as strong each,
    // added: smoother than once)
    if (j < 2) g.drawImage(prev, 0, 0, cv.width, cv.height);
    else {
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.25;
      for (const [ox, oy] of TAPS) g.drawImage(prev, ox, oy, cv.width, cv.height);
    }
    d.fresh = j + 1;
  }
  return d.levels[n];
}

// The sharp art (src: at full size, as it's drawn) split into its red, its green and its blue
// (when they're first wanted, and again when the art has changed): its pixels solid or not there
// at all, each the art multiplied by the colour, then cut back to its shape.
function channels(d, src) {
  if (d.chFresh) return d.ch;
  const w = src.width, h = src.height;
  d.ch = ["#ff0000", "#00ff00", "#0000ff"].map((colour, k) => {
    const cv = canvas(d.ch?.[k], w, h), g = cv.getContext("2d");
    g.globalAlpha = 1;
    g.globalCompositeOperation = "copy";
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = "multiply";
    g.fillStyle = colour;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = "source-over";
    return cv;
  });
  d.chFresh = true;
  return d.ch;
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
// paint(ctx, until): a step at a time (a layer's art, a layer's blurs, each stage after: it's a lot
// to draw, and all at once would hold up a frame), until performance.now() is past `until`, and
// once it's all drawn, onto ctx; true when it has.
export function paintRemains({ cols, rows, cell, pieces, gone = [], sprite, rng = Math.random, calm = false }) {
  if (!cfg().enabled) return () => true;
  const m = Math.ceil(Math.max(num(cfg().glowBlur, 2.5), num(cfg().softBlur, 0.15))) + 2;
  const board = Array.from({ length: rows + 2 * m }, () => Array(cols + 2 * m).fill(null));
  const state = { mode: "home", board };
  seedRemains(state, pieces, { rng, wrap: m, newest: gone });
  const k = kit(), steps = drawing(null, state, { cell, scale: 1, look: "picture", sprite, calm }, k);
  let done = false;
  return (ctx, until = Infinity) => {
    k.until = until;
    while (!done) {
      done = !!steps.next().done;
      if (performance.now() >= until) return false; // (finished, out of time: onto ctx next time, a step of its own)
    }
    // (the middle of it, the rest being the far side of it come round)
    if (k.used) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(k.front, m * cell, m * cell, cols * cell, rows * cell, 0, 0, cols * cell, rows * cell);
      ctx.restore();
    }
    for (const cv of [k.front, k.smaller, k.glow]) if (cv) cv.width = cv.height = 0;
    k.front = k.smaller = k.glow = k.used = null;
    return true;
  };
}
