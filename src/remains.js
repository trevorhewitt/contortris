// ============================================================
// REMAINS — what destroyed blocks leave behind (no DOM, but for drawRemains)
// ============================================================
// A block destroyed (its row cleared, a Destroyerz going off, zen dissolving the top of the
// board) leaves its art where it was (CONFIG.remains), under everything still on the board: a
// little blurred, and clearly darker, greyer and fainter than the blocks still in play. They come
// in layers, a new one every so often, the newest in front and the older ones behind it (in the
// same cell too: a newer one goes in front of an older one, it doesn't take its place). As a
// layer gets older it gets blurrier, darker and further back, until it has faded into the dark
// (or, there for good, it stops getting older three quarters of the way there), so as a game goes
// on the board fills with a dark glow of coloured light, the newest art in front of it. When the
// board shakes, each layer moves a little less than the board does, the older the less
// (parallax). The blocks still in play are drawn a little lighter (liveLift), to stand out.
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

// On, in this mode? (not in the tutorial: CONFIG.remains.notIn)
export const remainsOn = (state) => !!cfg().enabled && !(cfg().notIn ?? []).includes(state.mode);
// (for good, or fading away)
const lasting = () => !!cfg().forever || !(cfg().fadeAwaySec > 0);
const layerCount = () => Math.max(1, cfg().layers ?? 8);
// (there for good, a layer stops getting older this far on, as a dim glow)
const HOLD = 0.75;

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

// Blocks destroyed, [{ x, y, cell }] (where each one was): each leaves its art there, in the
// newest layer, in front of anything left there before.
export function leaveRemains(state, gone) {
  if (!gone?.length || !remainsOn(state)) return;
  const r = remainsOf(state, true);
  const left = gone.filter(({ x, y, cell }) => cell && x >= 0 && y >= 0 && x < r.cols && y < r.rows);
  if (!left.length) return;
  // (a new layer every layerSec at most, and no more often than fadeAwaySec / layers, so there are
  // never many more than `layers` of them, and all of a layer is near enough the same age)
  const c = cfg(), max = layerCount();
  const every = 1000 * Math.max(c.layerSec ?? 0, (c.fadeAwaySec ?? 0) / max);
  let layer = r.layers[0];
  if (!layer || r.clock - layer.born >= every) r.layers.unshift(layer = { born: r.clock, cells: new Map(), version: 0 });
  for (const { x, y, cell } of left) layer.cells.set(y * r.cols + x, { paint: cell.paint, style: cell.style });
  layer.version++;
  // more than that: the oldest goes (fading away, it has all but gone already), or, there for
  // good, goes into the one after it (as old as the older of the two; the newer's own in front)
  while (r.layers.length > max) {
    const old = r.layers.pop(), into = lasting() ? r.layers[r.layers.length - 1] : null;
    if (!into) continue;
    for (const [i, e] of old.cells) if (!into.cells.has(i)) into.cells.set(i, e);
    into.born = Math.min(into.born, old.born);
    into.version++;
  }
  r.version = ++versions;
}

// The game going on, `dt` ms of it (as you see it): fading away, a layer goes once it's
// fadeAwaySec old.
export function ageRemains(state, dt) {
  const r = remainsOf(state);
  if (!r?.layers.length) return;
  r.clock += dt;
  if (lasting()) return;
  const life = cfg().fadeAwaySec * 1000, n = r.layers.length;
  r.layers = r.layers.filter(l => r.clock - l.born < life);
  if (r.layers.length !== n) r.version = ++versions;
}

const smooth01 = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };

// How a layer looks, as old as it is: { age (0 new, 1 gone), alpha (how strongly it shows), blur
// (in cells), depth (0 at the front, 1 at the back: when the board shakes, it goes 1 - parallax ×
// depth of the way with it) }. As it gets older it's darker (darkerWithAge: over the board's dark
// background, darker is fainter), blurrier (blurWithAge) and further back; fading away, the last
// of it goes in the last fifth of its time.
function look(r, layer) {
  const c = cfg(), fading = !lasting();
  const t = clamp01((r.clock - layer.born) / Math.max(1, (c.fadeAwaySec ?? 0) * 1000));
  const u = fading ? t : Math.min(t, HOLD);
  return {
    age: u,
    alpha: (1 - clamp01(c.faded ?? 0)) * (1 - clamp01(c.darkerWithAge ?? 0) * u) * (fading ? 1 - smooth01((u - 0.8) / 0.2) : 1),
    blur: Math.max(0, c.blur ?? 0) + Math.max(0, c.blurWithAge ?? 0) * u,
    depth: 0.25 + 0.75 * u,
  };
}

// What's left in a cell, the front one first: [{ paint, style, depth (its layer: 0 the newest),
// age, alpha, blur }] (none: empty).
export function remainsAt(state, x, y) {
  const r = remainsOf(state);
  if (!r) return [];
  const i = y * r.cols + x;
  return r.layers.flatMap((layer, depth) => {
    const e = layer.cells.get(i);
    if (!e) return [];
    const { age, alpha, blur } = look(r, layer);
    return [{ paint: e.paint, style: e.style, depth, age, alpha, blur }];
  });
}

// What they look like now, for the renderer's cache of them (drawn again when this changes): what's
// left where, the look, and while any of them are still getting older, how far on it is (they get
// older a sixtieth of fadeAwaySec at a time: too little at a time to see).
export function remainsKey(state) {
  const r = remainsOf(state);
  if (!r?.layers.length || !remainsOn(state)) return "";
  const c = cfg(), life = (c.fadeAwaySec ?? 0) * 1000;
  const ageing = !lasting() || r.layers.some(l => r.clock - l.born < HOLD * life);
  return [r.version, c.darker, c.saturation, c.faded, c.blur, c.blurWithAge, c.darkerWithAge, c.fadeAwaySec, c.forever,
    ageing ? Math.floor(r.clock / Math.max(100, life / 60)) : ""].join("|");
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

// They're all blurred, so (as far as the newest one's blur allows) they're drawn smaller than the
// board is, onto a canvas of their own, and that onto the board, smoothed: far less to draw, and
// to keep. Each layer's art is drawn onto a canvas of its own (its cells, and room round them for
// the blur to spread into), greyer and darker, only when what's in it changes. Blurred, it's that
// made smaller and smaller, halving each time, smoothed, and drawn back up to size, smoothed (so
// it works in every browser: no canvas filters): each size made once, when it's first needed, and
// let go once the layer's too blurry for it. A blur between two sizes is the two, one faded into
// the other.
const drawn = new WeakMap(); // layer -> { levels (sizes: 0 the full one), lowest, cells, version, key, x0, y0, x1, y1, bw, bh }
let smaller = null; // (the canvas they're drawn onto, smaller than the board)

// How many pixels a cell they're drawn at: the board's own (view.cell × view.scale), halved for as
// long as its pixels stay no wider than the newest one's blur (on a phone, a quarter of the size).
function cellPixels(view) {
  const px = view.cell * view.scale;
  const halvings = Math.floor(Math.log2(Math.max(1, Math.max(0, cfg().blur ?? 0) * px)));
  return halvings ? Math.max(1, Math.round(px / 2 ** halvings)) : px;
}

// The remains, onto ctx (in board pixels), the oldest first. view: { cell (board pixels), scale
// (device pixels a board pixel), look (the renderer's look: the sprites are its own),
// sprite(paint, style) (a block's art, cell × scale pixels, as it is: not the lighter one),
// place(ctx, k, s) (puts ctx, s pixels a board pixel, where the board is, its shake k of the way;
// none for the board at rest) }
export function drawRemains(ctx, state, view) {
  const r = remainsOf(state);
  if (!r?.layers.length || !remainsOn(state)) return;
  const par = clamp01(cfg().parallax ?? 0), px = cellPixels(view), s = px / view.cell;
  // (smaller than the board: onto a canvas of their own first)
  let g = ctx;
  if (px < view.cell * view.scale) {
    smaller ??= document.createElement("canvas");
    if (smaller.width !== r.cols * px || smaller.height !== r.rows * px) {
      smaller.width = r.cols * px;
      smaller.height = r.rows * px;
    }
    g = smaller.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, smaller.width, smaller.height);
  }
  let x0 = r.cols, y0 = r.rows, x1 = -1, y1 = -1; // (the cells they're drawn over, in all)
  for (let i = r.layers.length - 1; i >= 0; i--) {
    const layer = r.layers[i], lk = look(r, layer);
    if (lk.alpha < 0.01) continue;
    const d = layerArt(r, layer, view, px);
    if (!d) continue;
    // its blur: which size (each half the one before), or which two
    const at = Math.log2(Math.max(1, lk.blur * px)), lo = Math.floor(at), f = at - lo;
    // (only ever blurrier from now on: the sharper sizes can go, unless it's the newest, still filling)
    if (i > 0) letGo(d, lo);
    // (the board shaking, drawn every frame: just the nearer one)
    const sizes = view.place ? [[Math.round(at), 1]] : f < 0.1 ? [[lo, 1]] : f > 0.9 ? [[lo + 1, 1]] : [[lo, 1 - f], [lo + 1, f]];
    g.save();
    // (the older, the further back: when the board shakes, it goes this much of the way with it)
    if (view.place) view.place(g, 1 - par * lk.depth, s);
    else g.setTransform(s, 0, 0, s, 0, 0);
    g.imageSmoothingEnabled = true;
    for (const [n, w] of sizes) {
      g.globalAlpha = lk.alpha * w;
      g.drawImage(level(r, layer, d, view, px, n), d.x0 * view.cell, d.y0 * view.cell, d.bw, d.bh);
    }
    g.restore();
    x0 = Math.min(x0, d.x0); y0 = Math.min(y0, d.y0); x1 = Math.max(x1, d.x1); y1 = Math.max(y1, d.y1);
  }
  if (g === ctx || x1 < x0) return;
  // (each layer where it is, shaking or not, so onto the board as it is at rest: the cells they
  // were drawn over, and one more all round for the blur, or shaking, all of it)
  if (view.place) { x0 = y0 = 0; x1 = r.cols - 1; y1 = r.rows - 1; }
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1);
  const w = Math.min(r.cols, x1 + 2) - x0, h = Math.min(r.rows, y1 + 2) - y0;
  ctx.save();
  ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(smaller, x0 * px, y0 * px, w * px, h * px, x0 * view.cell, y0 * view.cell, w * view.cell, h * view.cell);
  ctx.restore();
}

// A layer's art at full size (its cells, px pixels each, greyer and darker), drawn again only where
// it has new cells (the blurred sizes made again from it), unless they've spread beyond its
// canvas, it has let it go, or the look has changed: then all of it.
function layerArt(r, layer, view, px) {
  const c = cfg();
  const key = `${px}|${view.look}|${c.darker}|${c.saturation}|${c.blur}|${c.blurWithAge}|${c.fadeAwaySec}|${c.forever}`;
  let d = drawn.get(layer);
  if (d && d.version === layer.version && d.key === key) return d;
  if (!layer.cells.size) return null;
  // (room round its cells for the most blur it will have, in a canvas whose sides halve evenly as
  // many times as that takes)
  const most = Math.max(0, c.blur ?? 0) + Math.max(0, c.blurWithAge ?? 0);
  const halvings = Math.ceil(Math.log2(Math.max(1, most * px))) + 1, room = Math.ceil(most);
  let x0 = r.cols, y0 = r.rows, x1 = -1, y1 = -1;
  for (const i of layer.cells.keys()) {
    const x = i % r.cols, y = (i / r.cols) | 0;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  x0 = Math.max(0, x0 - room); y0 = Math.max(0, y0 - room);
  x1 = Math.min(r.cols - 1, x1 + room); y1 = Math.min(r.rows - 1, y1 + room);
  if (!d) drawn.set(layer, d = {});
  if (d.key !== key || !d.levels?.[0] || x0 < d.x0 || y0 < d.y0 || x1 > d.x1 || y1 > d.y1) {
    const unit = 2 ** halvings, cv = document.createElement("canvas");
    cv.width = Math.ceil((x1 - x0 + 1) * px / unit) * unit;
    cv.height = Math.ceil((y1 - y0 + 1) * px / unit) * unit;
    Object.assign(d, { levels: [cv], lowest: 0, cells: new Map(), x0, y0, x1, y1, bw: cv.width * view.cell / px, bh: cv.height * view.cell / px });
  } else d.levels.length = 1;
  const g = d.levels[0].getContext("2d"), added = new Path2D();
  let any = false;
  g.imageSmoothingEnabled = true; // (the art made smaller, if it is: smoothed)
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
  d.version = layer.version;
  d.key = key;
  return d;
}

// A layer's art at size n (0 full size, each one after half the one before), made from the one
// before it the first time it's wanted.
function level(r, layer, d, view, px, n) {
  if (n < d.lowest) { d.key = null; d = layerArt(r, layer, view, px); } // (one it had let go: all of it again)
  while (d.levels.length <= n) {
    const prev = d.levels[d.levels.length - 1], cv = document.createElement("canvas");
    cv.width = Math.max(1, prev.width >> 1);
    cv.height = Math.max(1, prev.height >> 1);
    const g = cv.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.drawImage(prev, 0, 0, cv.width, cv.height);
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

// Greyer (or, past 1, stronger: each colour's saturation pulled towards none, or full), and darker.
function tint(g, cells, c) {
  const sat = Math.max(0, c.saturation ?? 1);
  if (sat !== 1) {
    g.globalCompositeOperation = "saturation";
    g.globalAlpha = Math.min(1, Math.abs(1 - sat));
    g.fillStyle = sat < 1 ? "#808080" : "#ff0000"; // (only how saturated it is counts)
    g.fill(cells);
  }
  if (c.darker > 0) {
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = clamp01(c.darker);
    g.fillStyle = "#000000";
    g.fill(cells);
  }
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
}
