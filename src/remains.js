// ============================================================
// REMAINS — what destroyed blocks leave behind (no DOM, but for drawRemains)
// ============================================================
// A block destroyed (its row cleared, a Destroyerz going off, zen dissolving the top of the
// board) leaves its art where it was (CONFIG.remains), under everything still on the board, as
// light rather than paint: three of it, added together, each fading at its own rate. The art
// itself, sharp, darker and greyer than the blocks in play, goes first; a soft blur of it goes
// next; and a wide glow of it, rising as the sharp art goes, lingers longest, a faint colour
// spread across the board long after the shapes in it can be made out. A block destroyed where one
// was before takes its place. They come in layers, a new one every few seconds; when the board
// shakes, each layer moves a little less than the board does, the older the less (parallax). The
// blocks still in play are drawn a little lighter (liveLift), to stand out.
//
// It's on to try out, and it's all in here, so it's easy to take out: this file, CONFIG.remains,
// its section of the developer tools (src/devtools.js), and the hooks, each marked
// "src/remains.js": in src/game.js, leaveRemains where blocks are destroyed (clearFullLines,
// firePowerupEffect, zenRescue) and ageRemains (updateGame); in src/render.js, drawUnderBlocks
// and drawBoard (drawRemains, remainsKey, remainsShaken; remainsView, remainsCache and
// blocksCache for them), quakeTransform's `k`, and liveLift and liftColour (styleKey, getSprite
// and renderSprite, drawPixelArtDevice's `tone`).

import { CONFIG } from "../config.js";
import { clamp01 } from "./util.js";

const cfg = () => CONFIG.remains ?? {};
const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);

// On, in this mode? (not in the tutorial: CONFIG.remains.notIn)
export const remainsOn = (state) => !!cfg().enabled && !(cfg().notIn ?? []).includes(state.mode);
// (for good, or fading away)
const lasting = () => !!cfg().forever || !(cfg().fadeAwaySec > 0);
const layerCount = () => Math.max(1, num(cfg().layers, 12));
// How long, in ms, the sharp art and the soft blur take to fade, and the glow (all of it)
const sharpMs = () => Math.max(100, num(cfg().sharpSec, 20) * 1000);
const softMs = () => Math.max(100, num(cfg().softSec, 40) * 1000);
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

// The remains on the board: { board, cols, rows, layers, clock, version }
//   layers: newest first: { born (clock), cells (Map: y * cols + x -> { paint, style }), version
//           (changes with its cells) }
//   clock: ms of play since the first (as you see it: turbo zen's fade no quicker)
//   version: changes with them (never the same twice, on any board: the renderer's caches)
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

// The game going on, `dt` ms of it (as you see it): fading away, a layer goes once its glow has.
export function ageRemains(state, dt) {
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
// of the three shows: 0 not at all, 1 as bright as the art in play), depth (0 at the front, 1 at
// the back: when the board shakes, it goes 1 - parallax × depth of the way with it) }. There for
// good, it stops getting older once the sharp art has gone.
function look(r, layer) {
  const c = cfg(), life = lifeMs();
  const age = lasting() ? Math.min(r.clock - layer.born, sharpMs()) : r.clock - layer.born;
  const u = clamp01(age / life);
  return {
    age: u,
    sharp: (1 - clamp01(num(c.darker, 0.7))) * (1 - clamp01(num(c.faded, 0.5))) * (1 - smooth01(age / sharpMs())),
    soft: clamp01(num(c.softStrength, 0.1)) * (1 - smooth01(age / softMs())),
    // (rising as the sharp art goes, then the long, slow tail)
    glow: clamp01(num(c.glowStrength, 0.2)) * (0.3 + 0.7 * smooth01(age / sharpMs())) * (1 - smooth01(u)),
    depth: 0.25 + 0.75 * u,
  };
}

// What's left in a cell (no more than one: a newer takes the place of an older): [{ paint, style,
// depth (its layer: 0 the newest), age, sharp, soft, glow }] (none: empty).
export function remainsAt(state, x, y) {
  const r = remainsOf(state);
  if (!r) return [];
  const i = y * r.cols + x;
  return r.layers.flatMap((layer, depth) => {
    const e = layer.cells.get(i);
    if (!e) return [];
    const { age, sharp, soft, glow } = look(r, layer);
    return [{ paint: e.paint, style: e.style, depth, age, sharp, soft, glow }];
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
    c.glowStrength, c.fadeAwaySec, c.forever,
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
   Drawing (src/render.js drawUnderBlocks)
   ========================= */

// All three are light: each is added to what's under it (the board, and the older ones), not laid
// over it. The sharp art is drawn at the board's own size, just over its cells; the soft blur and
// the glow smaller (a pixel no wider than the soft blur: on a phone, an eighth of the size), onto a
// canvas of their own, drawn again only when they change, and that onto the board, smoothed: far
// less to draw. (The board shaking, they move together, as far back as they are on average, and
// only the sharp art moves layer by layer.) Each layer's art is drawn onto a canvas of its own (its
// cells, and room round them for the glow to spread into), greyer, only when what's in it changes,
// at the board's size while its sharp art still shows and smaller after. Blurred, it's that made
// smaller and smaller, halving each time, smoothed, and drawn back up to size, smoothed (so it works
// in every browser: no canvas filters), each size made once, when it's first needed; a blur
// between two sizes is the two, one faded into the other.
const drawn = new WeakMap(); // layer -> { px, levels (0 the full one), lowest, cells, version, key, x0, y0, x1, y1 (its canvas's cells), tight (just its own), bw, bh }
let smaller = null; // (the canvas the blurs are drawn onto, smaller than the board)
let blurred = null; // (what's on it: { key, x0, y0, x1, y1 (the cells they're over), depth })
const FAINT = 0.004;
const TAPS = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]];

// How many pixels a cell the blurs are drawn at: the board's own (px), halved for as long as its
// pixels stay no wider than the soft blur.
function blurPixels(px) {
  const halvings = Math.floor(Math.log2(Math.max(1, Math.max(0.05, num(cfg().softBlur, 0.2)) * px)));
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
// none for the board at rest) }
export function drawRemains(ctx, state, view) {
  const r = remainsOf(state);
  if (!r?.layers.length || !remainsOn(state)) return;
  const c = cfg(), par = clamp01(c.parallax ?? 0), full = view.cell * view.scale, px = blurPixels(full);
  const shaking = !!view.place;
  const out = ctx;
  // (the blurs drawn again only when they've changed: not for every frame of the board shaking)
  const key = `${remainsKey(state)}|${view.cell}|${view.scale}|${view.look}|${px}`;
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
    const d = layerArt(r, layer, view, sharp ? full : px);
    if (!d) continue;
    // the soft blur and the glow, each at its size (each half the one before), or between two
    let need = sharp ? 0 : Infinity;
    if (blurs) for (const [blur, strength] of [[num(c.softBlur, 0.2), lk.soft], [num(c.glowBlur, 2.5), lk.glow]]) {
      if (strength < FAINT) continue;
      const a = Math.log2(Math.max(1, blur * d.px)), lo = Math.floor(a), f = a - lo;
      need = Math.min(need, lo);
      const sizes = f < 0.1 ? [[lo, 1]] : f > 0.9 ? [[lo + 1, 1]] : [[lo, 1 - f], [lo + 1, f]];
      g.save();
      g.setTransform(px / view.cell, 0, 0, px / view.cell, 0, 0);
      g.globalCompositeOperation = "lighter";
      g.imageSmoothingEnabled = true;
      for (const [n, w] of sizes) put(g, r, layer, d, view, n, strength * w);
      g.restore();
      const b = blurred;
      b.x0 = Math.min(b.x0, d.x0); b.y0 = Math.min(b.y0, d.y0); b.x1 = Math.max(b.x1, d.x1); b.y1 = Math.max(b.y1, d.y1);
      deep += lk.depth * strength; weight += strength;
    }
    // the sharp art, at the board's own size (the board shaking, the older, the further back: it
    // goes 1 - parallax × depth of the way with it)
    if (lk.sharp >= FAINT) {
      out.save();
      if (shaking) view.place(out, 1 - par * lk.depth, view.scale); else out.setTransform(view.scale, 0, 0, view.scale, 0, 0);
      out.globalCompositeOperation = "lighter";
      out.imageSmoothingEnabled = false;
      put(out, r, layer, d, view, 0, lk.sharp);
      out.restore();
    } else if (i > 0 && blurs) letGo(d, need); // (only ever blurrier from now on: the sharper sizes can go)
  }
  if (blurs) blurred.depth = weight ? deep / weight : 0.5;
  // the blurs onto the board: the cells they were drawn over (shaking, all together, as far back
  // as they are on average)
  const { x0, y0, x1, y1 } = blurred;
  if (x1 >= x0) {
    out.save();
    if (shaking) view.place(out, 1 - par * blurred.depth, view.scale); else out.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    out.globalCompositeOperation = "lighter";
    out.imageSmoothingEnabled = true;
    out.drawImage(smaller, x0 * px, y0 * px, w * px, h * px, x0 * view.cell, y0 * view.cell, w * view.cell, h * view.cell);
    out.restore();
  }
}

// A layer's art at size n onto g, `alpha` strong.
function put(g, r, layer, d, view, n, alpha) {
  const img = level(r, layer, d, view, n), X = d.x0 * view.cell, Y = d.y0 * view.cell;
  // (much smaller than it's drawn, four times, half its pixel apart each way, a quarter as strong
  // each: smoother than once)
  const half = n >= 2 ? d.bw / img.width / 2 : 0;
  const taps = half ? TAPS : [[0, 0]];
  g.globalAlpha = Math.min(1, alpha) / taps.length;
  if (n === 0) {
    // (full size, just its cells, not the room round them)
    const [x0, y0, x1, y1] = d.tight, sx = (x0 - d.x0) * d.px, sy = (y0 - d.y0) * d.px, w = x1 - x0 + 1, h = y1 - y0 + 1;
    g.drawImage(img, sx, sy, w * d.px, h * d.px, x0 * view.cell, y0 * view.cell, w * view.cell, h * view.cell);
    return;
  }
  for (const [ox, oy] of taps) g.drawImage(img, X + ox * half * 2, Y + oy * half * 2, d.bw, d.bh);
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
  const most = Math.max(num(c.glowBlur, 2.5), num(c.softBlur, 0.2), 0);
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
    Object.assign(d, { px, levels: [cv], lowest: 0, cells: new Map(), x0, y0, x1, y1, bw: cv.width * view.cell / px, bh: cv.height * view.cell / px });
  } else d.levels.length = 1;
  const g = d.levels[0].getContext("2d"), added = new Path2D();
  let any = false;
  g.imageSmoothingEnabled = true; // (the art made smaller, if it is: smoothed)
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

// The sizes below n let go (all but the smallest made so far, which the rest are made from).
function letGo(d, n) {
  const upTo = Math.min(n, d.levels.length - 1);
  for (let j = d.lowest; j < upTo; j++) {
    if (d.levels[j]) d.levels[j].width = d.levels[j].height = 0;
    d.levels[j] = null;
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
