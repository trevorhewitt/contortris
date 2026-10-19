// ============================================================
// REMAINS — what destroyed blocks leave behind (no DOM, but for drawRemains)
// ============================================================
// A block destroyed (its row cleared, a Destroyerz going off, zen dissolving the top of the
// board) leaves its art where it was, darker, faded and greyer (CONFIG.remains), under everything
// still on the board, so the board fills up with art as a game goes on. The last block destroyed
// in a cell is the one that shows there. They fade away, or last for good. They're in layers, a
// new one every so often, newest on top: when the board shakes, each moves a little less than the
// board does, the older the less (parallax).
//
// It's on to try out, and it's all in here, so it's easy to take out: this file, CONFIG.remains,
// its section of the developer tools (src/devtools.js), and the hooks, each marked
// "src/remains.js": in src/game.js, leaveRemains where blocks are destroyed (clearFullLines,
// firePowerupEffect, zenRescue) and ageRemains (updateGame); in src/render.js, drawUnderBlocks
// and drawBoard (drawRemains, remainsKey, remainsShaken; remainsView, remainsCache and
// blocksCache for them) and quakeTransform's `k`.

import { CONFIG } from "../config.js";
import { clamp01 } from "./util.js";

const cfg = () => CONFIG.remains ?? {};

// On, in this mode? (not in the tutorial: CONFIG.remains.notIn)
export const remainsOn = (state) => !!cfg().enabled && !(cfg().notIn ?? []).includes(state.mode);
// (for good, or fading away)
const lasting = () => !!cfg().forever || !(cfg().fadeAwaySec > 0);
const layerCount = () => Math.max(1, cfg().layers ?? 4);

// The remains on the board: { board, cols, rows, cells, layers, clock, version }
//   cells: one for each cell (y * cols + x): the last block destroyed there, { paint, style,
//          layer }, or null
//   layers: newest first: { born (clock), n (how many cells it has), version (changes with them) }
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
  return (state.remains = { board: state.board, cols, rows, cells: Array(cols * rows).fill(null), layers: [], clock: 0, version: ++versions });
}

// Blocks destroyed, [{ x, y, cell }] (where each one was): each leaves its art there, in place of
// whatever was left there before.
export function leaveRemains(state, gone) {
  if (!gone?.length || !remainsOn(state)) return;
  const r = remainsOf(state, true);
  const left = gone.filter(({ x, y, cell }) => cell && x >= 0 && y >= 0 && x < r.cols && y < r.rows);
  if (!left.length) return;
  // (a new layer every layerSec at most; fading away, no more often than fadeAwaySec / layers, so
  // all of a layer is near enough the same age to fade as one)
  const c = cfg(), max = layerCount();
  const every = 1000 * Math.max(c.layerSec ?? 0, lasting() ? 0 : c.fadeAwaySec / max);
  let layer = r.layers[0];
  if (!layer || r.clock - layer.born >= every) r.layers.unshift(layer = { born: r.clock, n: 0, version: 0 });
  for (const { x, y, cell } of left) {
    const i = y * r.cols + x, was = r.cells[i];
    if (was) { was.layer.n--; was.layer.version++; }
    r.cells[i] = { paint: cell.paint, style: cell.style, layer };
    layer.n++;
  }
  layer.version++;
  // more layers than that: the oldest goes into the one after it (or, fading away, it has all but
  // gone already, so it goes)
  while (r.layers.length > max) {
    const old = r.layers.pop(), into = lasting() ? r.layers[r.layers.length - 1] : null;
    r.cells.forEach((e, i) => {
      if (e?.layer !== old) return;
      if (into) { e.layer = into; into.n++; } else r.cells[i] = null;
    });
    if (into) into.version++;
  }
  r.layers = r.layers.filter(l => l.n > 0);
  r.version = ++versions;
}

// The game going on, `dt` ms of it (as you see it): fading away, a layer goes once it's
// fadeAwaySec old.
export function ageRemains(state, dt) {
  const r = remainsOf(state);
  if (!r?.layers.length) return;
  r.clock += dt;
  if (lasting()) return;
  const life = cfg().fadeAwaySec * 1000;
  if (!r.layers.some(l => r.clock - l.born >= life)) return;
  r.cells.forEach((e, i) => { if (e && r.clock - e.layer.born >= life) r.cells[i] = null; });
  r.layers = r.layers.filter(l => r.clock - l.born < life);
  r.version = ++versions;
}

// How strongly a layer shows: 1 - faded, and fading away as it gets older (slowly at first, then
// faster), unless they last for good.
function strength(r, layer) {
  const c = cfg(), a = 1 - clamp01(c.faded ?? 0);
  if (lasting()) return a;
  const u = clamp01((r.clock - layer.born) / (c.fadeAwaySec * 1000));
  return a * (1 - u * u);
}

// What's left in a cell: { paint, style, depth (its layer: 0 the newest), strength }, or null.
export function remainsAt(state, x, y) {
  const r = remainsOf(state), e = r?.cells[y * r.cols + x];
  return e ? { paint: e.paint, style: e.style, depth: r.layers.indexOf(e.layer), strength: strength(r, e.layer) } : null;
}

/* =========================
   Drawing (src/render.js drawUnderBlocks)
   ========================= */

// Each layer is drawn onto a canvas of its own, just big enough for it, and only when what's in it
// changes, its colours changed there (greyer, darker); the board puts the background, the layers
// (each at its strength) and its blocks together.
const drawn = new WeakMap(); // layer -> { canvas, version, key, x0, y0, w, h }

// The remains, onto ctx (in board pixels). view: { cell (board pixels), scale (device pixels a
// board pixel), look (the renderer's look: the sprites are its own), sprite(paint, style) (a block's
// art, cell × scale pixels), place(ctx, k) (puts ctx where the board is, its shake k of the way;
// none for the board at rest) }
export function drawRemains(ctx, state, view) {
  const r = remainsOf(state);
  if (!r?.layers.length || !remainsOn(state)) return;
  const c = cfg(), n = layerCount(), cell = view.cell;
  r.layers.forEach((layer, i) => {
    const a = strength(r, layer);
    if (a < 0.01) return;
    const d = layerCanvas(r, layer, view);
    if (!d) return;
    ctx.save();
    // (the older, the further back: when the board shakes, it goes this much of the way with it)
    view.place?.(ctx, 1 - clamp01(c.parallax ?? 0) * (i + 1) / n);
    ctx.globalAlpha = a;
    ctx.drawImage(d.canvas, d.x0 * cell, d.y0 * cell, d.w * cell, d.h * cell);
    ctx.restore();
  });
}

// What they look like now, for the renderer's cached board (drawn again when this changes): what's
// left where, and how strongly each layer shows (in 64ths: fading, a few times a second at most).
export function remainsKey(state) {
  const r = remainsOf(state);
  if (!r?.layers.length || !remainsOn(state)) return "";
  const c = cfg();
  return `${r.version}|${c.darker}|${c.saturation}|${r.layers.map(l => Math.round(strength(r, l) * 64)).join(",")}`;
}

// Is the board shaking enough for the layers to be seen to move apart? (Then the renderer draws
// them every frame, each where it is, under the blocks, rather than from its cache.)
export function remainsShaken(state) {
  const t = state.fx?.quake?.trauma ?? 0;
  if (t * t * (CONFIG.fx.quake.maxOffsetPx ?? 0) * clamp01(cfg().parallax ?? 0) < 0.2) return false;
  return !!remainsOf(state)?.layers.length && remainsOn(state);
}

// A layer's canvas: its cells in the blocks' own art, greyer and darker. Only the cells that have
// changed since it was last drawn are drawn again (the ones that have gone from it are cleared),
// unless it has spread beyond its canvas or the look has changed: then all of it.
function layerCanvas(r, layer, view) {
  const c = cfg(), key = `${view.scale}|${view.look}|${c.darker}|${c.saturation}`;
  let d = drawn.get(layer);
  if (d && d.version === layer.version && d.key === key) return d;
  // what's in it now, and the box round it
  const now = new Map();
  let x0 = r.cols, y0 = r.rows, x1 = -1, y1 = -1;
  r.cells.forEach((e, i) => {
    if (e?.layer !== layer) return;
    now.set(i, e);
    const x = i % r.cols, y = (i / r.cols) | 0;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  });
  if (!now.size) return null;
  const px = view.cell * view.scale;
  if (!d) drawn.set(layer, d = { canvas: document.createElement("canvas"), cells: new Map() });
  const cv = d.canvas, g = cv.getContext("2d");
  if (d.key !== key || x0 < d.x0 || y0 < d.y0 || x1 >= d.x0 + d.w || y1 >= d.y0 + d.h) {
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (cv.width !== w * px || cv.height !== h * px) { cv.width = w * px; cv.height = h * px; }
    else g.clearRect(0, 0, cv.width, cv.height);
    Object.assign(d, { x0, y0, w, h, cells: new Map() });
  }
  const at = (i) => [(i % r.cols - d.x0) * px, (((i / r.cols) | 0) - d.y0) * px];
  for (const [i, e] of d.cells) {
    if (now.get(i) === e) continue;
    const [X, Y] = at(i);
    g.clearRect(X, Y, px, px);
    d.cells.delete(i);
  }
  const added = new Path2D();
  let any = false;
  g.imageSmoothingEnabled = false;
  for (const [i, e] of now) {
    if (d.cells.get(i) === e) continue;
    const [X, Y] = at(i);
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
