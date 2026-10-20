// ============================================================
// RENDERER — draws the board, pieces, powerup highlights and effects
// ============================================================

import { calmFx, highContrast } from "./settings.js";
import { CONFIG } from "../config.js";
import { clamp01, clampN, frac, hash01, easeOutBack, hsla, rgba, isHexColour, ombre, OMBRE } from "./util.js";
import { getShapePaint } from "./shapes.js";
import { getActiveMatrix, getGhostDropY } from "./game.js";
import { resolvePowerupArea, computeEffect, isPhantomPowerup, classOf, comesDown } from "./powerups.js";
import { drawRemains, remainsPainter, remainsKey, remainsShaken, liveLift, liftColour } from "./remains.js";
import { fxTier, onFxTier } from "./particles.js";

const DEFAULT_STYLE = {};

// An element's size as laid out, in CSS pixels: not as it's drawn this moment (getBoundingClientRect),
// which takes in any transform it's under. The board switching on (index.html .crtOn) starts as a
// sliver and the next piece popping in (.pop) at 0.6 of its size, and a canvas sized from that
// stayed that coarse. (Whole pixels from offsetWidth, a fraction from the computed width when it
// agrees; nothing while it isn't laid out at all.)
function layoutSize(el) {
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return { w, h };
  const cs = getComputedStyle(el), cw = parseFloat(cs.width), ch = parseFloat(cs.height);
  return { w: Math.abs(cw - w) < 1 ? cw : w, h: Math.abs(ch - h) < 1 ? ch : h };
}

/* =========================
   Block drawing (shared by the renderer and previews)
   ========================= */

// Plain block: pixel art (or a solid colour) with no extras.
export function drawBlockWithPaintStatic(ctx, px, py, cellSize, paint, style = {}) {
  if (typeof paint === "string") {
    ctx.fillStyle = paint;
    ctx.fillRect(px, py, cellSize, cellSize);
  } else if (paint && typeof paint === "object" && paint.pixels && paint.k) {
    const k = paint.k;
    const xb = new Array(k + 1);
    const yb = new Array(k + 1);
    for (let i = 0; i <= k; i++) {
      xb[i] = px + Math.round((i * cellSize) / k);
      yb[i] = py + Math.round((i * cellSize) / k);
    }
    for (let sy = 0; sy < k; sy++) {
      for (let sx = 0; sx < k; sx++) {
        const x0 = xb[sx], x1 = xb[sx + 1];
        const y0 = yb[sy], y1 = yb[sy + 1];
        const c = paint.pixels?.[sy]?.[sx];
        ctx.fillStyle = (typeof c === "string" && isHexColour(c)) ? c : (style.baseColor ?? "#FFFFFF");
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
  } else {
    ctx.fillStyle = style.baseColor ?? "#FFFFFF";
    ctx.fillRect(px, py, cellSize, cellSize);
  }
}

// The classic block look: pixel art + optional shading + thin per-cell outline.
function drawBlockWithPaint(ctx, px, py, cellSize, paint, style = {}) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const shadeWidthRatio = style.shadeWidthRatio ?? 0.14;
  const shadeWidthMinPx = style.shadeWidthMinPx ?? 1;
  const shadeWidthMaxPx = style.shadeWidthMaxPx ?? 10;

  const w = clamp(
    Math.round(cellSize * shadeWidthRatio),
    shadeWidthMinPx,
    Math.min(shadeWidthMaxPx, Math.floor(cellSize / 2) - 1)
  );

  const darkAlpha = clamp(style.shadeDarkAlpha ?? 0.0, 0, 1);
  const lightAlpha = clamp(style.shadeLightAlpha ?? 0.0, 0, 1);

  const darkRGB = style.shadeDarkRGB ?? [0, 0, 0];
  const lightRGB = style.shadeLightRGB ?? [255, 255, 255];

  const darkComposite = style.shadeDarkComposite ?? "multiply";
  const lightComposite = style.shadeLightComposite ?? "screen";

  const tintWarmAlpha = clamp(style.shadeWarmTintAlpha ?? 0.0, 0, 1);
  const tintCoolAlpha = clamp(style.shadeCoolTintAlpha ?? 0.0, 0, 1);
  const warmRGB = style.shadeWarmTintRGB ?? [255, 230, 120];
  const coolRGB = style.shadeCoolTintRGB ?? [70, 120, 255];

  const outlineAlpha = clamp(style.outlineAlpha ?? 0.55, 0, 1);
  const outlineWidth = style.outlineWidth ?? 0.5;
  const outlineRGB = style.outlineRGB ?? [0, 0, 0];

  const cornerMode = style.cornerMode ?? "single";
  const shadeBottomLeftCorner = style.shadeBottomLeftCorner ?? true;
  const shadeTopRightCorner = style.shadeTopRightCorner ?? true;

  drawBlockWithPaintStatic(ctx, px, py, cellSize, paint, style);

  if (w > 0 && (darkAlpha > 0 || lightAlpha > 0 || tintWarmAlpha > 0 || tintCoolAlpha > 0)) {
    ctx.save();

    if (darkAlpha > 0 || tintCoolAlpha > 0) {
      ctx.globalCompositeOperation = darkComposite;

      if (darkAlpha > 0) {
        ctx.fillStyle = `rgba(${darkRGB[0]},${darkRGB[1]},${darkRGB[2]},${darkAlpha})`;
        ctx.fillRect(px + w, py + cellSize - w, cellSize - w, w);
        ctx.fillRect(px, py, w, cellSize - w);
      }

      if (tintCoolAlpha > 0) {
        ctx.fillStyle = `rgba(${coolRGB[0]},${coolRGB[1]},${coolRGB[2]},${tintCoolAlpha})`;
        ctx.fillRect(px + w, py + cellSize - w, cellSize - w, w);
        ctx.fillRect(px, py, w, cellSize - w);
      }

      if (cornerMode === "single" && shadeBottomLeftCorner) {
        if (darkAlpha > 0) {
          ctx.fillStyle = `rgba(${darkRGB[0]},${darkRGB[1]},${darkRGB[2]},${darkAlpha})`;
          ctx.fillRect(px, py + cellSize - w, w, w);
        }
        if (tintCoolAlpha > 0) {
          ctx.fillStyle = `rgba(${coolRGB[0]},${coolRGB[1]},${coolRGB[2]},${tintCoolAlpha})`;
          ctx.fillRect(px, py + cellSize - w, w, w);
        }
      }
    }

    if (lightAlpha > 0 || tintWarmAlpha > 0) {
      ctx.globalCompositeOperation = lightComposite;

      if (lightAlpha > 0) {
        ctx.fillStyle = `rgba(${lightRGB[0]},${lightRGB[1]},${lightRGB[2]},${lightAlpha})`;
        ctx.fillRect(px, py, cellSize - w, w);
        ctx.fillRect(px + cellSize - w, py + w, w, cellSize - w);
      }

      if (tintWarmAlpha > 0) {
        ctx.fillStyle = `rgba(${warmRGB[0]},${warmRGB[1]},${warmRGB[2]},${tintWarmAlpha})`;
        ctx.fillRect(px, py, cellSize - w, w);
        ctx.fillRect(px + cellSize - w, py + w, w, cellSize - w);
      }

      if (cornerMode === "single" && shadeTopRightCorner) {
        if (lightAlpha > 0) {
          ctx.fillStyle = `rgba(${lightRGB[0]},${lightRGB[1]},${lightRGB[2]},${lightAlpha})`;
          ctx.fillRect(px + cellSize - w, py, w, w);
        }
        if (tintWarmAlpha > 0) {
          ctx.fillStyle = `rgba(${warmRGB[0]},${warmRGB[1]},${warmRGB[2]},${tintWarmAlpha})`;
          ctx.fillRect(px + cellSize - w, py, w, w);
        }
      }
    }

    ctx.restore();
  }

  if (outlineAlpha > 0 && outlineWidth > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgba(${outlineRGB[0]},${outlineRGB[1]},${outlineRGB[2]},${outlineAlpha})`;
    ctx.lineWidth = outlineWidth;
    const half = (outlineWidth % 2) ? 0.5 : 0;
    ctx.strokeRect(px + half, py + half, cellSize - outlineWidth, cellSize - outlineWidth);
    ctx.restore();
  }
}

// Enhanced look: pixel art laid out on the device-pixel grid (even pixel
// sizes at any scale), no per-cell outline — edges are drawn per piece.
// (tone: each colour through it first, if given: the blocks in play a little lighter, src/remains.js)
function drawPixelArtDevice(ctx, sizePx, paint, baseColor, tone = null) {
  const t = tone ?? ((c) => c);
  if (paint && typeof paint === "object" && paint.pixels && paint.k) {
    const k = paint.k;
    const b = new Array(k + 1);
    for (let i = 0; i <= k; i++) b[i] = Math.round((i * sizePx) / k);
    for (let sy = 0; sy < k; sy++) {
      for (let sx = 0; sx < k; sx++) {
        const c = paint.pixels[sy][sx];
        ctx.fillStyle = t((typeof c === "string" && isHexColour(c)) ? c : baseColor);
        ctx.fillRect(b[sx], b[sy], b[sx + 1] - b[sx], b[sy + 1] - b[sy]);
      }
    }
  } else {
    ctx.fillStyle = t((typeof paint === "string") ? paint : baseColor);
    ctx.fillRect(0, 0, sizePx, sizePx);
  }
}

// A whole shape (rotation 0) on its own canvas, e.g. for menus.
export function makeShapePreviewCanvas(shape, cellPx = 18, pad = 6, rot = 0) {
  if (!shape) return null;
  if (!shape.rotations[rot]) rot = 0;
  const mat = shape.rotations[rot];
  const w = mat[0].length * cellPx + pad * 2;
  const h = mat.length * cellPx + pad * 2;

  const cvs = document.createElement("canvas");
  cvs.width = w;
  cvs.height = h;
  cvs.style.width = `${w}px`;
  cvs.style.height = `${h}px`;
  cvs.style.imageRendering = "pixelated";

  const ctx = cvs.getContext("2d");
  for (let y = 0; y < mat.length; y++) {
    for (let x = 0; x < mat[0].length; x++) {
      if (!mat[y][x]) continue;
      drawBlockWithPaintStatic(ctx, pad + x * cellPx, pad + y * cellPx, cellPx, getShapePaint(shape, rot, x, y), shape.style ?? {});
    }
  }
  return cvs;
}

// Achievement icon: a square grid of hex colours ("" = transparent).
export function drawIcon(ctx, grid, x, y, sizePx) {
  if (!Array.isArray(grid) || !grid.length) return false;
  const n = grid.length;
  const b = [];
  for (let i = 0; i <= n; i++) b.push(Math.round((i * sizePx) / n));
  for (let gy = 0; gy < n; gy++) {
    const row = grid[gy];
    if (!Array.isArray(row)) continue;
    for (let gx = 0; gx < row.length; gx++) {
      const c = row[gx];
      if (!c || !isHexColour(c)) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x + b[gx], y + b[gy], b[gx + 1] - b[gx], b[gy + 1] - b[gy]);
    }
  }
  return true;
}

/* =========================
   Powerup highlight marks (also used by the How to play demos)
   ========================= */

// One highlighted cell at (px, py): translucent rainbow fill + the class animation.
//   type: destroyer (squares shrink) | expander (squares grow) | gravity (lines travel)
//   x, y: board cell coords (for the rainbow); dist: distance from the powerup (ripple)
//   effective: does the effect change this cell (strong) or not (faint)
// Which animation each class uses for its highlighted cells.
// Each class has a mark you can tell apart in a single frame:
//   shrink (Destroyerz): squares closing in; line (Gravitizerz): falling streaks;
//   burst (Expanderz): + and x rays shooting out of each cell's centre;
//   ghost (Phantomz): faint diagonal stripes drifting past, flickering in and out.
const MARK_STYLE = { destroyer: "shrink", acid: "shrink", expander: "burst", goo: "burst", phantom: "ghost", gravity: "line", blast: "out" };

// The warm split (an old screen's colours pulled out of true, in the game's warm rainbow): copies
// of a thing fanned out to each side of it, pink, orange and gold one way, cyan and violet the
// other, fading the further out they are. [how far out (in steps, + one way, - the other), colour, strength]
const rgbOf = ([r, g, b]) => `rgb(${r},${g},${b})`;
const [PINK, ORANGE, GOLD, CYAN, VIOLET] = OMBRE.map(rgbOf);
export const WARM_SPLIT = [[2.4, GOLD, 0.35], [1.7, ORANGE, 0.55], [1, PINK, 0.85], [-1, CYAN, 0.85], [-1.8, VIOLET, 0.5]];
// The warm rainbow all the way round (cx, cy), from `turn` (radians, clockwise from the right),
// at alpha a: for a ring of it, drawn as one stroke.
export function rainbowRound(ctx, cx, cy, turn, a, lift = 0, steps = 30) {
  const g = ctx.createConicGradient(turn, cx, cy);
  for (let k = 0; k <= steps; k++) g.addColorStop(k / steps, ombre(k / steps, a, lift));
  return g;
}

// (the copies a tier fans out: all five, or the `split` strongest, the nearest in, of them)
const SPLITS = new Map();
function splitCopies() {
  const n = Math.max(0, Math.min(WARM_SPLIT.length, fxTier().split ?? WARM_SPLIT.length));
  let list = SPLITS.get(n);
  if (!list) SPLITS.set(n, list = n >= WARM_SPLIT.length ? WARM_SPLIT : [...WARM_SPLIT].sort((a, b) => Math.abs(a[0]) - Math.abs(b[0])).slice(0, n));
  return list;
}
// The warm rainbow's hues (for colours given as hue, saturation and lightness)
const OMBRE_HUES = [336, 25, 45, 191, 264];

// A white square z across centred on (x, y), split into the warm rainbow along the way it's
// going (ux, uy: which way, of length 1; o: how far apart each step): pink, orange and gold
// trailing behind it, cyan and violet ahead. Drawn "lighter" (where the copies overlap: white),
// at strength a; glow adds a faint warm halo round it.
export function drawChromaSquare(ctx, x, y, z, ux, uy, o, a = 1, glow = 0) {
  const h = z / 2;
  if (glow > 0) {
    ctx.globalAlpha = a * glow;
    ctx.fillStyle = ORANGE;
    ctx.fillRect(x - z * 1.5, y - z * 1.5, z * 3, z * 3);
  }
  for (const [k, colour, strength] of WARM_SPLIT) {
    ctx.globalAlpha = a * strength;
    ctx.fillStyle = colour;
    ctx.fillRect(x - h - ux * o * k, y - h - uy * o * k, z, z);
  }
  ctx.globalAlpha = a;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - h, y - h, z, z);
}

// The colour of a highlighted cell: its class's gradient (CONFIG.fx.powerup.classColours),
// shimmering back and forth across the cells; the warm rainbow for anything without one.
export function markColour(type, now, x, y) {
  const o = CONFIG.fx.powerup.overlay;
  const pal = CONFIG.fx.powerup.classColours?.[classOf(type)];
  const t = now * o.hueDegPerMs + (x + y) * o.hueStepPerCell;
  // (no colours of its own: the warm rainbow's in turn)
  if (!pal) return { h: OMBRE_HUES[Math.floor(((t % 360) + 360) % 360 / 72)], s: 100, l: 62 };
  const [h0, h1] = pal.hues;
  const span = ((h1 - h0) % 360 + 360) % 360 || 360;
  const tri = 1 - Math.abs(((t / span) % 2) - 1); // 0 -> 1 -> 0 ...
  return { h: (h0 + span * tri) % 360, s: pal.sat ?? 100, l: pal.light ?? 60 };
}

export function drawPowerupMark(ctx, { type, direction }, px, py, cell, now, x, y, dist, effective, intensity = 1, centre = null) {
  const o = CONFIG.fx.powerup.overlay;
  const c = markColour(type, now, x, y);
  const fillA = clamp01((effective ? o.fillAlpha : o.idleFillAlpha) * intensity);
  const markA = clamp01((effective ? o.markAlpha : o.idleMarkAlpha) * intensity);

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = hsla(c.h, c.s, c.l, fillA);
  ctx.fillRect(px, py, cell, cell);

  // marks glow additively so they stay visible over bright pixel art
  ctx.globalCompositeOperation = "lighter";
  const mark = hsla(c.h, c.s, Math.min(92, c.l + 2), markA);
  // The mark, split into the warm rainbow like an old screen pulled out of true (WARM_SPLIT):
  // fading copies of it fanned out to each side, as far as the cell's own little glitch has them
  // (now and then they tear further apart for a moment), then the mark itself in its class's
  // colour over them.
  // (the lighter tiers fan out fewer of the copies, the nearest first: CONFIG.fx.quality)
  const split = o.rgbSplit ?? 0, copies = splitCopies();
  if (split > 0 && copies.length) {
    const tick = Math.floor(now / 90), g = hash01(tick * 31 + x * 7 + y * 13);
    const d = cell * split * (g > 0.93 ? 3.2 : g > 0.8 ? 1.8 : 1);
    const dy = g > 0.93 ? cell * split * (hash01(tick + x) - 0.5) * 2 : 0;
    const a = markA * (o.rgbSplitAlpha ?? 0.6);
    for (const [k, colour, strength] of copies) {
      ctx.save();
      ctx.globalAlpha *= a * strength;
      ctx.translate(-d * k, k > 0 ? -dy : dy);
      ctx.strokeStyle = colour;
      ctx.fillStyle = colour;
      drawMarkShape(ctx, type, direction, px, py, cell, now, x, y, dist, centre);
      ctx.restore();
    }
  }
  ctx.strokeStyle = mark;
  ctx.fillStyle = mark;
  drawMarkShape(ctx, type, direction, px, py, cell, now, x, y, dist, centre);
  ctx.globalCompositeOperation = "source-over";
}

// The shape of a powerup's mark in one cell (in whatever colour is set): squares, lines, rays...
function drawMarkShape(ctx, type, direction, px, py, cell, now, x, y, dist, centre) {
  const o = CONFIG.fx.powerup.overlay;
  const cycle = now / o.periodMs;
  const style = MARK_STYLE[type] ?? "shrink";
  if (style === "line") {
    drawGravityMark(ctx, px, py, cell, direction, frac(cycle + hash01(x * 7 + y * 13) * 0.35));
  } else if (style === "out") {
    // little streaks flying away from the blast centre
    let vx = centre ? x - centre.x : 0, vy = centre ? y - centre.y : -1;
    const len = Math.hypot(vx, vy) || 1;
    vx /= len; vy /= len;
    const p = frac(cycle - dist * 0.15);
    const cxp = px + cell / 2 + vx * (p - 0.5) * cell * 0.9;
    const cyp = py + cell / 2 + vy * (p - 0.5) * cell * 0.9;
    const w = Math.max(1, cell / 8);
    ctx.globalAlpha *= p > 0.8 ? (1 - p) / 0.2 : 1;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(cxp - vx * cell * 0.25, cyp - vy * cell * 0.25);
    ctx.lineTo(cxp + vx * cell * 0.15, cyp + vy * cell * 0.15);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (style === "burst") {
    // 8 rays (+ and x) growing out from the centre of the cell, rippling out from the powerup
    const p = frac(cycle - dist * o.ripplePerCell);
    const cx = px + cell / 2, cy = py + cell / 2;
    // rays are always at least a third of the cell long, so a single frame reads as a star
    const r0 = cell * 0.1, r1 = cell * (0.3 + 0.22 * p);
    ctx.globalAlpha *= p > 0.8 ? 0.4 + 0.6 * (1 - p) / 0.2 : 1;
    ctx.lineWidth = Math.max(1.5, cell / 7);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      const diag = k % 2 ? 0.8 : 1; // diagonals a touch shorter so they stay inside the cell
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1 * diag, cy + Math.sin(a) * r1 * diag);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (style === "ghost") {
    // faint diagonal stripes drifting through the cell, the whole thing flickering like
    // it's only half there
    const flicker = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now / 260 + hash01(x * 5 + y * 11) * 6.28));
    const gap = cell / 3;
    const off = frac(cycle * 1.5) * gap;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, cell, cell);
    ctx.clip();
    ctx.globalAlpha *= flicker;
    ctx.lineWidth = Math.max(1, cell / 10);
    ctx.beginPath();
    for (let d = -cell + off; d < cell * 2; d += gap) {
      ctx.moveTo(px + d, py + cell);
      ctx.lineTo(px + d + cell, py);
    }
    ctx.stroke();
    ctx.restore();
  } else if (style === "shrink") {
    // squares shrink, rippling in towards the powerup
    const p = frac(cycle + dist * o.ripplePerCell);
    drawSquareMark(ctx, px, py, cell, 1 - p, p < 0.15 ? p / 0.15 : 1);
  } else {
    // squares grow, rippling out from the powerup
    const p = frac(cycle - dist * o.ripplePerCell);
    drawSquareMark(ctx, px, py, cell, p, p > 0.85 ? (1 - p) / 0.15 : 1);
  }
}

function drawSquareMark(ctx, px, py, cell, sizeFrac, alphaMul) {
  const s = (cell - 3) * sizeFrac;
  if (s <= 0.5) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * clamp01(alphaMul);
  ctx.lineWidth = Math.max(1, cell / 9);
  ctx.strokeRect(px + (cell - s) / 2, py + (cell - s) / 2, s, s);
  ctx.globalAlpha = prev;
}

// A short line travelling through the cell in the gravity direction.
function drawGravityMark(ctx, px, py, cell, direction, p) {
  const len = cell * 0.5;
  const head = p * (cell + len); // distance travelled along the axis
  let a = clampN(head - len, 0, cell);
  let b = clampN(head, 0, cell);
  if (b - a < 0.5) return;
  const w = Math.max(1, cell / 9);
  const mid = (cell - w) / 2;
  const reverse = direction === "up" || direction === "left";
  if (reverse) { const ra = cell - b, rb = cell - a; a = ra; b = rb; }

  if (direction === "down" || direction === "up") {
    ctx.fillRect(px + mid, py + a, w, b - a);
    const hy = reverse ? a : b - w;
    if (head <= cell) ctx.fillRect(px + mid - w / 2, py + hy, w * 2, w);
  } else {
    ctx.fillRect(px + a, py + mid, b - a, w);
    const hx = reverse ? a : b - w;
    if (head <= cell) ctx.fillRect(px + hx, py + mid - w / 2, w, w * 2);
  }
}

/* =========================
   Edges between pieces
   ========================= */

// Edge mask bits: which sides of a block border a different piece / empty space.
const EDGE_T = 1, EDGE_R = 2, EDGE_B = 4, EDGE_L = 8;

// (two pieces with the same `seam`, drawn to join up, like the tip and the rest of the
// iceberg, show no edge between them)
function boardEdgeMask(board, x, y, pid) {
  const rows = board.length, cols = board[0].length;
  const seam = board[y][x]?.seam;
  const other = (c) => !c || (c.pid !== pid && !(seam && c.seam === seam));
  let m = 0;
  if (y === 0 || other(board[y - 1][x])) m |= EDGE_T;
  if (x === cols - 1 || other(board[y][x + 1])) m |= EDGE_R;
  if (y === rows - 1 || other(board[y + 1][x])) m |= EDGE_B;
  if (x === 0 || other(board[y][x - 1])) m |= EDGE_L;
  return m;
}

function matrixEdgeMask(mat, x, y) {
  let m = 0;
  if (!mat[y - 1]?.[x]) m |= EDGE_T;
  if (!mat[y][x + 1]) m |= EDGE_R;
  if (!mat[y + 1]?.[x]) m |= EDGE_B;
  if (!mat[y][x - 1]) m |= EDGE_L;
  return m;
}

/* =========================
   The renderer
   ========================= */

export function createRenderer(boardCanvas, nextCanvas) {
  const cell = CONFIG.render.cellPx;
  // (the board's size can change: turbo zen can fill the whole window, resize())
  let cols = CONFIG.board.cols;
  let rows = CONFIG.board.rows;
  let bw = cols * cell;
  let bh = rows * cell;

  const bctx = boardCanvas.getContext("2d");
  let scale = 1;

  // --- caches (all rebuilt when the backing scale or cell style changes) ---
  let spriteObjCache = new WeakMap(); // paint object -> canvas
  let spriteStrCache = new WeakMap(); // style object -> Map(colour -> canvas)
  // (the same, a little lighter, for the blocks in play: src/remains.js liveLift)
  let liftObjCache = new WeakMap();
  let liftStrCache = new WeakMap();
  const boardCache = { canvas: document.createElement("canvas"), version: -1, styleKey: "" };
  // (what destroyed blocks left behind, src/remains.js: on the background, and the blocks on their
  // own, for over it while the board shakes)
  const remainsCache = { canvas: document.createElement("canvas"), base: "" };
  const paintRemainsAtRest = remainsPainter(); // (a picture of them at rest, drawn a little at a time)
  const blocksCache = { canvas: document.createElement("canvas"), version: -1, styleKey: "" };
  let staticLayers = null; // { bg, classicTop } pre-rendered layers
  let lastStyleKey = styleKey();
  const overlayCache = { key: "", area: null };
  const backdrop = { cut: -1, canvas: null };

  const isEnhanced = () => CONFIG.render.cellStyle !== "classic";
  function styleKey() { return `${CONFIG.render.cellStyle}|${CONFIG.render.enhanced.edgeStrength}|${highContrast() ? "hc" : ""}|${liveLift()}`; }

  // The board's backing scale: a whole number of the canvas's pixels for each board pixel, so cells
  // land on whole pixels and the browser only ever scales it up a little (image-rendering:
  // pixelated), never down. As many as the screen has for it (the board's size as laid out: see
  // layoutSize), but no more than render.maxScale, the tier's boardScale, or keeps the board within
  // the tier's boardPixels (a board as big as the window on a sharp screen: CONFIG.fx.quality).
  // The same for the same window and tier, however the board was measured.
  function computeScale() {
    const dpr = window.devicePixelRatio || 1, T = fxTier();
    const cssW = layoutSize(boardCanvas).w || bw;
    const fits = Math.floor((cssW * dpr) / bw + 0.001);
    const budget = Math.floor(Math.sqrt((T.boardPixels ?? Infinity) / (bw * bh)));
    return Math.max(1, Math.min(CONFIG.render.maxScale ?? 4, T.boardScale ?? Infinity, budget, fits));
  }

  function invalidateCaches() {
    spriteObjCache = new WeakMap();
    spriteStrCache = new WeakMap();
    liftObjCache = new WeakMap();
    liftStrCache = new WeakMap();
    boardCache.version = -1;
    staticLayers = null;
    overlayCache.key = "";
  }

  function applyScale(s) {
    scale = s;
    boardCanvas.width = bw * s;
    boardCanvas.height = bh * s;
    boardCache.canvas.width = bw * s;
    boardCache.canvas.height = bh * s;
    invalidateCaches();
  }

  applyScale(computeScale());
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      const s = computeScale();
      if (s !== scale) applyScale(s);
    }).observe(boardCanvas);
  }
  // (a lighter tier draws it with fewer pixels, a fuller one with more: CONFIG.fx.quality)
  onFxTier(() => { const s = computeScale(); if (s !== scale) applyScale(s); });

  // --- next-piece canvas (sized to fit wherever it is, each time it's drawn: drawNext) ---
  const nctx = nextCanvas.getContext("2d");

  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  // One cached canvas per distinct block paint. (The blocks in play are a little lighter, while
  // what destroyed blocks leave behind is on: src/remains.js liveLift; `plain`, as they are, for
  // what's left.)
  function getSprite(paint, style, plain = false) {
    const enhanced = isEnhanced();
    const lift = !plain && enhanced && liveLift() !== 1;
    const objCache = lift ? liftObjCache : spriteObjCache, strCache = lift ? liftStrCache : spriteStrCache;
    if (paint && typeof paint === "object") {
      let spr = objCache.get(paint);
      if (!spr) {
        spr = renderSprite(paint, style, enhanced, lift);
        objCache.set(paint, spr);
      }
      return spr;
    }
    const st = style ?? DEFAULT_STYLE;
    let byColour = strCache.get(st);
    if (!byColour) { byColour = new Map(); strCache.set(st, byColour); }
    let spr = byColour.get(paint);
    if (!spr) {
      spr = renderSprite(paint, st, enhanced, lift);
      byColour.set(paint, spr);
    }
    return spr;
  }

  function renderSprite(paint, style, enhanced, lift = false) {
    const size = cell * scale;
    const c = makeCanvas(size, size);
    const g = c.getContext("2d");
    if (enhanced) {
      drawPixelArtDevice(g, size, paint, style?.baseColor ?? "#FFFFFF", lift ? liftColour : null);
    } else {
      g.scale(scale, scale);
      drawBlockWithPaint(g, 0, 0, cell, paint, style ?? {});
    }
    return c;
  }

  // A faint warm edge just inside the board (both looks). No scan lines: the pieces stay crisp.
  // (Two lines: drawn straight onto the board each frame, they cost less than laying a whole
  // board's worth of canvas over it.)
  function drawScreenFX(g) {
    g.save();
    g.globalCompositeOperation = "source-over";
    g.lineWidth = 1;
    g.globalAlpha = 0.06;
    g.strokeStyle = PINK;
    g.strokeRect(1.5, 1.5, bw - 3, bh - 3);
    g.globalAlpha = 0.05;
    g.strokeStyle = CYAN;
    g.strokeRect(3.5, 2.5, bw - 6, bh - 6);
    g.restore();
  }

  function getStaticLayers() {
    if (staticLayers) return staticLayers;
    const W = bw * scale, H = bh * scale;

    // Enhanced background: gradient + a faint tile in every cell.
    const bg = makeCanvas(W, H);
    {
      const g = bg.getContext("2d");
      g.scale(scale, scale);
      const e = CONFIG.render.enhanced;
      const grad = g.createLinearGradient(0, 0, 0, bh);
      grad.addColorStop(0, e.bgTop);
      grad.addColorStop(1, e.bgBottom);
      g.fillStyle = grad;
      g.fillRect(0, 0, bw, bh);
      g.fillStyle = e.emptyCellFill;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) g.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      }
      g.fillStyle = e.emptyCellDot;
      for (let y = 1; y < rows; y++) {
        for (let x = 1; x < cols; x++) g.fillRect(x * cell - 0.5, y * cell - 0.5, 1, 1);
      }
    }

    // Classic grid lines (drawn over everything in the classic look).
    function drawGridLines(g) {
      g.save();
      g.globalAlpha = CONFIG.render.gridLineAlpha;
      g.strokeStyle = "rgba(220,220,235,0.45)";
      g.lineWidth = 1;
      g.beginPath();
      for (let x = 0; x <= bw; x += cell) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, bh); }
      for (let y = 0; y <= bh; y += cell) { g.moveTo(0, y + 0.5); g.lineTo(bw, y + 0.5); }
      g.stroke();
      g.restore();
    }

    // Grid + screen FX merged, so the classic look costs one composite, not two.
    const classicTop = makeCanvas(W, H);
    {
      const g = classicTop.getContext("2d");
      g.scale(scale, scale);
      drawGridLines(g);
      drawScreenFX(g);
    }

    staticLayers = { bg, classicTop };
    return staticLayers;
  }

  function rowFallOffsetForRow(state, y) {
    const rf = state.fx.rowFall;
    if (!rf.active) return 0;
    const dist = rf.rowDropDistances?.[y] ?? 0;
    if (!dist) return 0;

    // (a combo: each row waits until what was under it has gone, rowDelays)
    const t = clamp01((rf.elapsedMs - (rf.rowDelays?.[y] ?? 0)) / (rf.fallMs ?? rf.durationMs));
    const eased = 1 - Math.pow(1 - t, 3);
    const startOffset = dist * (CONFIG.fx.lineClear.boardFallPxPerRow ?? 18);
    return startOffset * (1 - eased);
  }

  // (k: this much of the shake, for what's further back: src/remains.js)
  function quakeTransform(ctx, state, k = 1) {
    const q = state.fx?.quake;
    if (!q || q.trauma <= 0.0001) return;

    if (calmFx()) return; // (calmer animations: the board never shakes)
    const trauma2 = q.trauma * q.trauma * k;
    const maxOffset = CONFIG.fx.quake.maxOffsetPx * trauma2;
    const maxRot = (CONFIG.fx.quake.rotationalDegrees * Math.PI / 180) * trauma2;

    const sx = Math.sin(q.seed * 2.31);
    const sy = Math.sin(q.seed * 3.77 + 1.7);
    const sr = Math.sin(q.seed * 2.91 + 4.2);

    ctx.translate(bw / 2, bh / 2);
    ctx.rotate(sr * maxRot);
    ctx.translate(-bw / 2 + sx * maxOffset, -bh / 2 + sy * maxOffset);
  }

  // --- enhanced piece edges (outline + bevel), batched into 3 paths ---
  const edgeStrength = () => clamp01(CONFIG.render.enhanced.edgeStrength ?? 0.3);

  function addEdgeRects(paths, px, py, mask) {
    const t = 1;
    const { out, light, dark } = paths;
    if (mask & EDGE_T) { out.rect(px, py, cell, t); light.rect(px, py + t, cell, t); }
    if (mask & EDGE_L) { out.rect(px, py, t, cell); light.rect(px + t, py, t, cell); }
    if (mask & EDGE_B) { out.rect(px, py + cell - t, cell, t); dark.rect(px, py + cell - 2 * t, cell, t); }
    if (mask & EDGE_R) { out.rect(px + cell - t, py, t, cell); dark.rect(px + cell - 2 * t, py, t, cell); }
  }

  function fillEdgePaths(ctx, paths) {
    const e = CONFIG.render.enhanced;
    const k = edgeStrength();
    ctx.fillStyle = rgba(e.bevelLight, k); ctx.fill(paths.light);
    ctx.fillStyle = rgba(e.bevelDark, k); ctx.fill(paths.dark);
    ctx.fillStyle = rgba(e.outline, k); ctx.fill(paths.out);
  }

  // Draw a list of blocks [{px, py, s, paint, style, mask}] in board pixels.
  function drawBlockList(ctx, list) {
    if (!list.length) return;
    const enhanced = isEnhanced();
    const k = enhanced ? edgeStrength() : 0;

    if (k > 0) {
      const e = CONFIG.render.enhanced;
      const so = e.shadowOffsetPx;
      ctx.fillStyle = rgba(e.shadow, k);
      ctx.beginPath();
      for (const b of list) {
        if (b.s < 1 || b.rot || b.sq) continue;
        ctx.rect(b.px + so, b.py + so, cell, cell);
      }
      ctx.fill();
    }

    for (const b of list) {
      const spr = getSprite(b.paint, b.style);
      if (b.rot) {
        ctx.save();
        ctx.translate(b.px + cell / 2, b.py + cell / 2);
        ctx.rotate(b.rot);
        ctx.drawImage(spr, -cell / 2, -cell / 2, cell, cell);
        ctx.restore();
      } else if (b.sq) {
        // squashed: wider and lower, standing on the same floor
        const w = cell * (1 + b.sq), h = cell * (1 - b.sq);
        ctx.drawImage(spr, b.px - (w - cell) / 2, b.py + cell - h, w, h);
      } else if (b.s >= 1) {
        ctx.drawImage(spr, b.px, b.py, cell, cell);
      } else if (b.s > 0) {
        const d = cell * b.s;
        ctx.drawImage(spr, b.px + (cell - d) / 2, b.py + (cell - d) / 2, d, d);
      }
    }

    if (k > 0) {
      const paths = { out: new Path2D(), light: new Path2D(), dark: new Path2D() };
      for (const b of list) {
        if (b.s >= 1 && b.mask) addEdgeRects(paths, b.px, b.py, b.mask);
      }
      fillEdgePaths(ctx, paths);
    }
  }

  // Position along a blast flight path at time t (seconds).
  function pathPoint(path, t) {
    if (t <= path[0].t) return path[0];
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      if (t <= b.t) {
        const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      }
    }
    return path[path.length - 1];
  }

  function collectBoardBlocks(state, animated) {
    const board = state.board;
    const enhanced = isEnhanced();
    const list = [];
    const mv = state.fx.moveAnim;
    const gr = state.fx.growAnim;

    for (let y = 0; y < rows; y++) {
      const rowOffset = animated ? rowFallOffsetForRow(state, y) : 0;
      const row = board[y];
      for (let x = 0; x < cols; x++) {
        const c = row[x];
        if (!c) continue;

        let px = x * cell;
        let py = y * cell - rowOffset;
        let s = 1;
        let rot = 0;
        let sq = 0;

        if (animated) {
          const idx = y * cols + x;
          if (mv.active) {
            const m = mv.byIndex.get(idx);
            if (m) {
              const local = mv.elapsedMs - (m.delay ?? 0);
              const t = clamp01(local / m.dur);
              if (local < 0 && m.tremble && -local <= m.trembleMs) {
                // a big drop trembles before it goes
                const amp = cell * 0.08 * m.tremble;
                px += Math.sin(mv.elapsedMs * 0.13 + idx * 1.7) * amp;
                py += Math.sin(mv.elapsedMs * 0.17 + idx * 2.3) * amp * 0.6;
              }
              if (m.path) {
                const at = pathPoint(m.path, t * m.flight);
                px += (at.x - m.toX) * cell;
                py += (at.y - m.toY) * cell;
                rot = t < 1 ? m.spin * t : 0;
              } else if (m.vx !== undefined) {
                // thrown out to (vx, vy), then falls to its resting place
                const split = 0.4;
                if (t < split) {
                  const u = 1 - Math.pow(1 - t / split, 2);
                  px += (m.ox + (m.vx - m.ox) * u) * cell;
                  py += (m.oy + (m.vy - m.oy) * u) * cell;
                } else {
                  const u = (t - split) / (1 - split);
                  px += m.vx * (1 - u * u) * cell;
                  py += m.vy * (1 - u * u) * cell;
                }
              } else {
                const k = 1 - t * t; // accelerate like falling
                px += m.ox * cell * k;
                py += m.oy * cell * k;
                // ...and squash a little as it lands
                if (m.squash && local > m.dur && mv.squashMs) {
                  const u = (local - m.dur) / mv.squashMs;
                  if (u < 1) sq = Math.sin(u * Math.PI) * 0.24 * m.squash;
                }
              }
            }
          }
          if (gr.active) {
            const delay = gr.byIndex.get(idx);
            if (delay !== undefined) {
              const t = clamp01((gr.elapsedMs - delay) / gr.growMs);
              if (t <= 0) continue;
              s = t >= 1 ? 1 : easeOutBack(t);
            }
          }
        }

        list.push({
          px, py, s, rot, sq,
          paint: c.paint,
          style: c.style,
          // flying (or squashing) blocks lose their joined-up edges until they settle
          mask: enhanced && !rot && !sq ? boardEdgeMask(board, x, y, c.pid) : 0,
        });
      }
    }
    // a combo's blocks, still there where they were until each one's moment, shrinking a little
    // just before it crumbles
    const gh = animated ? state.fx.ghosts : null;
    if (gh) for (const g of gh.cells) {
      const left = g.at - gh.elapsedMs;
      if (left <= 0) continue;
      const s = left < 50 ? 0.82 + 0.18 * (left / 50) : 1;
      list.push({ px: g.x * cell, py: g.y * cell, s, rot: 0, sq: 0, paint: g.cell.paint, style: g.cell.style, mask: 0 });
    }
    return list;
  }

  function drawBackground(ctx) {
    if (isEnhanced()) {
      ctx.drawImage(getStaticLayers().bg, 0, 0, bw, bh);
    } else {
      ctx.fillStyle = CONFIG.render.bg;
      ctx.fillRect(0, 0, bw, bh);
    }
  }

  // What destroyed blocks left behind, for src/remains.js to draw as the board's blocks are drawn,
  // and (place) the board with its shake k of the way, for each layer of it, s pixels a board pixel
  // (none: at rest).
  function remainsView(state) {
    return {
      cell, scale, look: styleKey(), calm: calmFx(), sprite: (paint, style) => getSprite(paint, style, true),
      every: fxTier().remainsEvery ?? 1, lite: fxTier().remainsLite === true, // (the look tier's: CONFIG.fx.quality)
      place: state && ((ctx, k, s = scale) => { ctx.setTransform(s, 0, 0, s, 0, 0); quakeTransform(ctx, state, k); punchTransform(ctx, state); }),
    };
  }

  // High contrast (src/settings.js): every cell's border, clear, over the background and what
  // destroyed blocks left, under the blocks.
  function drawCellBorders(ctx) {
    if (!highContrast()) return;
    ctx.save();
    ctx.strokeStyle = CONFIG.render.highContrastGrid ?? "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= bw; x += cell) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, bh); }
    for (let y = 0; y <= bh; y += cell) { ctx.moveTo(0, y + 0.5); ctx.lineTo(bw, y + 0.5); }
    ctx.stroke();
    ctx.restore();
  }

  // What destroyed blocks left behind, at rest, as it's on show: src/remains.js remainsPainter's
  // picture of it, drawn a little each frame, so a big change doesn't hold one up ({ key, cv, x, y,
  // w, h }); with calmer animations, as it is (the sharp art at the screen's own pixels, all at
  // once: drawRemains), { key, direct }.
  function remainsAtRest(state) {
    if (calmFx()) {
      const key = remainsKey(state);
      return { key: key && `${key}|${fxTier().remainsLite === true}`, direct: true };
    }
    return paintRemainsAtRest(state, remainsView(null));
  }

  // What of a cache with what destroyed blocks left behind at rest under what's on it (held: { under,
  // rect }, the key of the picture of them it has, and where on the board that is) has to be drawn
  // again for the one on show now (shown: remainsAtRest): where the picture it has was, and where the
  // new one is ([x, y, w, h], board pixels: the background, opaque, covers whatever was there);
  // false, none of it; null, all of it.
  function restingChange(held, shown) {
    if (held.under === shown.key) return false;
    if (shown.direct) return null;
    const rect = pictureRect(shown), was = held.rect;
    return was && rect ? unionRect(was, rect) : was ?? rect ?? false;
  }
  const pictureRect = shown => (shown.cv ? [shown.x, shown.y, shown.w, shown.h] : null);
  const unionRect = ([ax, ay, aw, ah], [bx, by, bw2, bh2]) => {
    const x = Math.min(ax, bx), y = Math.min(ay, by);
    return [x, y, Math.max(ax + aw, bx + bw2) - x, Math.max(ay + ah, by + bh2) - y];
  };
  // (g: drawn on just within area, if there is one, board pixels)
  function clipTo(g, area) {
    if (!area) return;
    g.beginPath();
    g.rect(...area);
    g.clip();
  }

  // Under the blocks: the background, and what destroyed blocks left behind on it (src/remains.js),
  // cached together for every frame of an animation, and drawn again only when what's on show of it
  // changes (shown: remainsAtRest), and then just round where it has (restingChange). (`shaken`: the
  // board's shaking enough for its layers to be seen to move apart, so they're drawn each where it
  // is.)
  function drawUnderBlocks(ctx, state, shaken, shown) {
    if (shaken || !shown.key) {
      drawBackground(ctx);
      if (shaken) drawRemains(ctx, state, remainsView(state));
      drawCellBorders(ctx);
      return;
    }
    const c = remainsCache.canvas, base = `${styleKey()}|${calmFx()}`; // (calmer animations: no scanlines on them)
    if (c.width !== bw * scale || c.height !== bh * scale) {
      c.width = bw * scale;
      c.height = bh * scale;
      remainsCache.base = "";
    }
    const area = remainsCache.base === base ? restingChange(remainsCache, shown) : null;
    if (area !== false) {
      const g = c.getContext("2d");
      g.save();
      g.setTransform(scale, 0, 0, scale, 0, 0);
      g.imageSmoothingEnabled = false;
      clipTo(g, area);
      drawResting(g, state, shown);
      g.restore();
      Object.assign(remainsCache, { base, under: shown.key, rect: pictureRect(shown) });
    }
    ctx.drawImage(c, 0, 0, bw, bh);
  }

  // (the same at rest, as it is: the background, then the picture of what destroyed blocks left,
  // each of its pixels as it is, added; with calmer animations, them)
  function drawResting(g, state, shown) {
    drawBackground(g);
    if (shown.direct) drawRemains(g, state, remainsView(null));
    else if (shown.cv) {
      g.globalCompositeOperation = "lighter";
      g.drawImage(shown.cv, shown.x, shown.y, shown.w, shown.h, shown.x, shown.y, shown.w, shown.h);
      g.globalCompositeOperation = "source-over";
    }
    drawCellBorders(g);
  }

  // Background + locked blocks. Cached as one opaque layer while nothing moves.
  // (Under the blocks, what destroyed blocks left behind, src/remains.js: when the board shakes it
  // moves a little less than the board does, so then the blocks come from a cache of their own;
  // when it's all that's changed, the cache is drawn again just round where it has.)
  function drawBoard(ctx, state) {
    const fx = state.fx;
    // (calmer animations: the board never shakes; a lighter tier, CONFIG.fx.quality: they shake with it)
    const shaken = !calmFx() && fxTier().remainsDepth !== false && remainsShaken(state);
    const shown = remainsAtRest(state); // (every frame: its picture drawn a little more, if it's being drawn)
    const animating = fx.rowFall.active || fx.moveAnim.active || fx.growAnim.active || !!fx.ghosts;
    if (animating) {
      drawUnderBlocks(ctx, state, shaken, shown);
      drawBlockList(ctx, collectBoardBlocks(state, true));
      return;
    }

    const cache = shaken ? blocksCache : boardCache;
    const base = `${styleKey()}|${calmFx()}`, key = shaken ? styleKey() : `${base}|${shown.key}`;
    if (cache.canvas.width !== bw * scale || cache.canvas.height !== bh * scale) {
      cache.canvas.width = bw * scale;
      cache.canvas.height = bh * scale;
      cache.version = -1;
    }
    if (cache.version !== state.boardVersion || cache.styleKey !== key) {
      // (the same blocks, the same look: only what's under them has changed)
      const area = !shaken && cache.version === state.boardVersion && cache.base === base ? restingChange(cache, shown) : null;
      if (area !== false) {
        const g = cache.canvas.getContext("2d");
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        if (shaken) g.clearRect(0, 0, cache.canvas.width, cache.canvas.height); // (at rest, what's under the blocks covers it all)
        g.setTransform(scale, 0, 0, scale, 0, 0);
        g.imageSmoothingEnabled = false;
        clipTo(g, area);
        // (under the blocks, the picture straight on: a step fewer than through its cache; with calmer
        // animations, from that, as all of them are drawn at once there)
        if (!shaken && shown.direct) drawUnderBlocks(g, state, false, shown);
        else if (!shaken) drawResting(g, state, shown);
        // (just round there, just the blocks within a cell or two of it: the rest can't reach it)
        const blocks = collectBoardBlocks(state, false), [ax, ay, aw, ah] = area || [];
        drawBlockList(g, area ? blocks.filter(b => b.px > ax - 2 * cell && b.px < ax + aw + cell && b.py > ay - 2 * cell && b.py < ay + ah + cell) : blocks);
        g.restore();
      }
      Object.assign(cache, { version: state.boardVersion, styleKey: key, base, under: shaken ? null : shown.key, rect: shaken ? null : pictureRect(shown) });
    }
    if (shaken) drawUnderBlocks(ctx, state, true, shown);
    ctx.drawImage(cache.canvas, 0, 0, bw, bh);
  }

  // The landing preview's glow (CONFIG.render.ghost): light along the inside of its edges, fading
  // in towards its middle, with a copy of it pulled a little one way in pink and another the other
  // way in cyan (an old screen's colours out of true; high contrast: just the light), so it reads
  // on a busy board. Made once for each shape it takes (and the board's scale): { cv, pad (board
  // pixels round it), w, h (board pixels) }; none, glow 0.
  const ghostGlows = new Map();
  function ghostGlow(mat) {
    const g = CONFIG.render.ghost ?? {}, strength = clamp01(g.glow ?? 0);
    if (strength <= 0) return null;
    const hc = highContrast(), split = hc ? 0 : Math.max(0, g.splitPx ?? 1), depth = Math.max(1, (g.glowCells ?? 0.45) * cell);
    const key = `${mat.map(r => r.map(v => (v ? 1 : 0)).join("")).join("/")}|${scale}|${strength}|${depth}|${split}`;
    let out = ghostGlows.get(key);
    if (out) return out;
    if (ghostGlows.size >= 64) ghostGlows.clear();
    const pad = Math.ceil(split) + 1, w = mat[0].length * cell + 2 * pad, h = mat.length * cell + 2 * pad;
    const light = makeCanvas(w * scale, h * scale), lg = light.getContext("2d");
    lg.scale(scale, scale);
    lg.globalCompositeOperation = "lighter"; // (two edges meeting at a corner: brighter there)
    // (from the edge at x0, y0, as strong as it is, to nothing at x1, y1, over the rectangle r)
    const edge = (x0, y0, x1, y1, ...r) => {
      const grad = lg.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, `rgba(255,255,255,${strength})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      lg.fillStyle = grad;
      lg.fillRect(...r);
    };
    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[0].length; x++) {
        if (!mat[y][x]) continue;
        const m = matrixEdgeMask(mat, x, y), px = pad + x * cell, py = pad + y * cell;
        if (m & EDGE_T) edge(px, py, px, py + depth, px, py, cell, depth);
        if (m & EDGE_B) edge(px, py + cell, px, py + cell - depth, px, py + cell - depth, cell, depth);
        if (m & EDGE_L) edge(px, py, px + depth, py, px, py, depth, cell);
        if (m & EDGE_R) edge(px + cell, py, px + cell - depth, py, px + cell - depth, py, depth, cell);
      }
    }
    out = { cv: light, pad, w, h };
    if (split > 0) {
      // (half of it as it is, and half in pink, pulled one way, and half in cyan, the other)
      const cv = makeCanvas(w * scale, h * scale), cg = cv.getContext("2d");
      cg.globalCompositeOperation = "lighter";
      cg.globalAlpha = 0.5;
      cg.drawImage(light, 0, 0);
      for (const [colour, dx] of [[PINK, -split], [CYAN, split]]) {
        const t = makeCanvas(w * scale, h * scale), tg = t.getContext("2d");
        tg.drawImage(light, 0, 0);
        tg.globalCompositeOperation = "source-in";
        tg.fillStyle = colour;
        tg.fillRect(0, 0, t.width, t.height);
        cg.drawImage(t, dx * scale, 0);
      }
      out.cv = cv;
    }
    ghostGlows.set(key, out);
    return out;
  }

  function drawGhostPiece(state, ghostY) {
    if (!CONFIG.render.ghost?.enabled) return;
    if (!state.active || state.gameOver) return;
    if (ghostY == null || ghostY === state.active.y) return;

    const mat = getActiveMatrix(state);

    // (its glow first, added to what's under it: light)
    const glow = ghostGlow(mat);
    if (glow) {
      bctx.save();
      bctx.globalCompositeOperation = "lighter";
      bctx.drawImage(glow.cv, state.active.x * cell - glow.pad, ghostY * cell - glow.pad, glow.w, glow.h);
      bctx.restore();
    }

    if (isEnhanced()) {
      const e = CONFIG.render.enhanced;
      const fill = new Path2D();
      const edge = new Path2D();
      for (let y = 0; y < mat.length; y++) {
        for (let x = 0; x < mat[0].length; x++) {
          if (!mat[y][x]) continue;
          const by = ghostY + y;
          if (by < 0) continue;
          const px = (state.active.x + x) * cell;
          const py = by * cell;
          fill.rect(px, py, cell, cell);
          const m = matrixEdgeMask(mat, x, y);
          if (m & EDGE_T) edge.rect(px, py, cell, 1);
          if (m & EDGE_B) edge.rect(px, py + cell - 1, cell, 1);
          if (m & EDGE_L) edge.rect(px, py, 1, cell);
          if (m & EDGE_R) edge.rect(px + cell - 1, py, 1, cell);
        }
      }
      bctx.fillStyle = e.ghostFill;
      bctx.fill(fill);
      bctx.fillStyle = e.ghostStroke;
      bctx.fill(edge);
      return;
    }

    const g = CONFIG.render.ghost;
    const inset = g.insetPx ?? 1.5;

    bctx.save();
    bctx.fillStyle = g.fill ?? "rgba(255,255,255,0.07)";
    bctx.strokeStyle = g.stroke ?? "rgba(255,255,255,0.40)";
    bctx.lineWidth = g.lineWidth ?? 2;

    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[0].length; x++) {
        if (!mat[y][x]) continue;

        const bx = state.active.x + x;
        const by = ghostY + y;
        if (by < 0) continue;

        const px = bx * cell;
        const py = by * cell;

        bctx.fillRect(px + inset, py + inset, cell - inset * 2, cell - inset * 2);
        bctx.strokeRect(px + inset, py + inset, cell - inset * 2, cell - inset * 2);
      }
    }

    bctx.restore();
  }

  // The falling piece (or one of turbo zen's flock falling with it: { shape, rotIdx, x, y }).
  function drawActivePiece(state, piece = state.active) {
    const { shape, rotIdx } = piece;
    const mat = shape.rotations[rotIdx];
    const enhanced = isEnhanced();
    const list = [];

    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[0].length; x++) {
        if (!mat[y][x]) continue;
        const by = piece.y + y;
        if (by < 0) continue;
        list.push({
          px: (piece.x + x) * cell,
          py: by * cell,
          s: 1,
          paint: getShapePaint(shape, rotIdx, x, y),
          style: shape.style,
          mask: enhanced ? matrixEdgeMask(mat, x, y) : 0,
        });
      }
    }
    const phantom = isPhantomPowerup(shape.powerup);
    if (phantom) bctx.globalAlpha = 0.7;
    drawBlockList(bctx, list);
    bctx.globalAlpha = 1;
    // on its last chance (about to top out): it flashes red, until it's on its way somewhere safe
    const lc = piece.lastChance;
    if (lc && !lc.safe && lc.elapsedMs < lc.durationMs) {
      const a = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(lc.elapsedMs * 0.022));
      bctx.fillStyle = `rgba(255,40,40,${a.toFixed(3)})`;
      for (const b of list) bctx.fillRect(b.px, b.py, cell, cell);
    }
  }

  // An Extra Shiny Piece coming in, the ace up the sleeve (CONFIG.fx.ace, game.js useShelf): rays
  // of light fanning out from behind it, turning slowly as they fade, each white at its heart with
  // the warm rainbow either side of it (WARM_SPLIT), and glitching like an old screen now and then:
  // a ray torn further apart, jumping aside, or gone for a moment. (Toned down: half as many,
  // fainter, still, and no glitching)
  function drawAce(state, now) {
    const a = state.fx.ace, A = CONFIG.fx.ace;
    if (!a) return;
    const calm = calmFx(), t = clamp01(a.elapsedMs / A.ms);
    const fade = Math.min(1, a.elapsedMs / 80) * Math.pow(1 - t, 1.5) * (calm ? 0.4 : 1);
    if (fade < 0.004) return;
    const cx = a.x * cell, cy = a.y * cell, n = calm ? Math.ceil(A.rays / 2) : A.rays;
    const turn = a.seed + (calm ? 0 : A.spin * 2 * Math.PI * a.elapsedMs / 1000);
    const grow = 0.5 + 0.5 * Math.min(1, a.elapsedMs / 260); // (shooting out at first)
    const tick = Math.floor(now / A.glitchMs);
    bctx.save();
    bctx.globalCompositeOperation = "lighter";
    // (a soft light round it)
    const R = cell * 3.5, halo = bctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    halo.addColorStop(0, `rgba(255,255,255,${(0.4 * fade).toFixed(3)})`);
    halo.addColorStop(1, "rgba(255,255,255,0)");
    bctx.fillStyle = halo;
    bctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    for (let k = 0; k < n; k++) {
      const g = calm ? 0.5 : hash01(tick * 131 + k * 17 + a.seed);
      if (g < 0.07) continue; // (gone for a moment)
      const ang = turn + k * 2 * Math.PI / n;
      const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
      const len = (A.reach[0] + (A.reach[1] - A.reach[0]) * hash01(k * 7 + a.seed)) * cell * grow;
      const w = A.width * cell * (0.5 + 0.5 * hash01(k * 3 + a.seed));
      // (torn further apart, or jumping aside)
      const o = cell * A.split * (g > 0.88 ? 3 : 1), jump = g > 0.95 ? (hash01(tick + k) - 0.5) * cell * 1.4 : 0;
      const ray = (off, colour, alpha) => {
        const bx = cx + px * (off + jump), by = cy + py * (off + jump), ex = bx + ux * len, ey = by + uy * len;
        const fall = bctx.createLinearGradient(bx, by, ex, ey);
        fall.addColorStop(0, colour);
        fall.addColorStop(1, "rgba(0,0,0,0)");
        bctx.globalAlpha = alpha;
        bctx.fillStyle = fall;
        bctx.beginPath();
        bctx.moveTo(bx, by);
        bctx.lineTo(ex + px * w / 2, ey + py * w / 2);
        bctx.lineTo(ex - px * w / 2, ey - py * w / 2);
        bctx.closePath();
        bctx.fill();
      };
      for (const [step, colour, strength] of WARM_SPLIT) ray(step * o, colour, fade * strength * 0.7);
      ray(0, "#ffffff", fade * 0.55);
    }
    bctx.restore();
  }

  // ...and the piece itself, lit up white as it comes, fading to its own look.
  function drawAceGlow(state) {
    const a = state.fx.ace, A = CONFIG.fx.ace, p = state.active;
    if (!a || !p || p !== a.piece || a.elapsedMs >= A.glowMs) return;
    const mat = p.shape.rotations[p.rotIdx];
    bctx.save();
    bctx.globalCompositeOperation = "lighter";
    bctx.globalAlpha = A.glow * (1 - a.elapsedMs / A.glowMs) * (calmFx() ? 0.5 : 1);
    bctx.fillStyle = "#ffffff";
    for (let y = 0; y < mat.length; y++) for (let x = 0; x < mat[y].length; x++) {
      if (mat[y][x] && p.y + y >= 0) bctx.fillRect((p.x + x) * cell, (p.y + y) * cell, cell, cell);
    }
    bctx.restore();
  }

  // Danger: a piece on its last chance. A soft red glow along the top of the board.
  function drawDanger(state) {
    const lc = state.active?.lastChance;
    if (!lc || lc.safe || lc.elapsedMs >= lc.durationMs) return;
    const pulse = 0.5 + 0.5 * Math.sin(lc.elapsedMs * 0.012);
    const g = bctx.createLinearGradient(0, 0, 0, cell * 3);
    g.addColorStop(0, `rgba(255,40,40,${(0.2 + 0.14 * pulse).toFixed(3)})`);
    g.addColorStop(1, "rgba(255,40,40,0)");
    bctx.fillStyle = g;
    bctx.fillRect(0, 0, bw, cell * 3);
    bctx.fillStyle = `rgba(255,70,70,${(0.45 + 0.3 * pulse).toFixed(3)})`;
    bctx.fillRect(0, 0, bw, 2);
  }

  // Animated outline around a powerup piece (falling, or charging), in its class's colours
  // (rainbow for combos).
  function drawPowerupShimmer(cells, now, boost = 0, type = "combo") {
    // cells: [{x, y, mask}] in board coords
    const alpha = clamp01(CONFIG.fx.powerup.shimmerAlpha + boost * 0.1);
    bctx.save();
    bctx.lineWidth = 1.5;
    for (const { x, y, mask } of cells) {
      const px = x * cell, py = y * cell;
      const c = markColour(type, now * 2, x * 2, y * 2);
      bctx.strokeStyle = hsla(c.h, c.s, Math.max(c.l, 62), alpha);
      bctx.beginPath();
      if (mask & EDGE_T) { bctx.moveTo(px, py + 0.75); bctx.lineTo(px + cell, py + 0.75); }
      if (mask & EDGE_B) { bctx.moveTo(px, py + cell - 0.75); bctx.lineTo(px + cell, py + cell - 0.75); }
      if (mask & EDGE_L) { bctx.moveTo(px + 0.75, py); bctx.lineTo(px + 0.75, py + cell); }
      if (mask & EDGE_R) { bctx.moveTo(px + cell - 0.75, py); bctx.lineTo(px + cell - 0.75, py + cell); }
      bctx.stroke();
      if (boost > 0) {
        bctx.fillStyle = hsla(c.h, c.s, Math.max(c.l, 68), 0.25 * boost);
        bctx.fillRect(px, py, cell, cell);
      }
    }
    bctx.restore();
  }

  function activeShimmerCells(state) {
    const mat = getActiveMatrix(state);
    const out = [];
    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[0].length; x++) {
        if (!mat[y][x] || state.active.y + y < 0) continue;
        out.push({ x: state.active.x + x, y: state.active.y + y, mask: matrixEdgeMask(mat, x, y) });
      }
    }
    return out;
  }

  // Goo and phantoms don't have an area: highlight where the goo will settle /
  // where the phantom will land instead.
  function previewArea(state, pu, area, placed, centre) {
    if (pu.type === "phantom") {
      return { indices: placed.map(p => p.y * cols + p.x), flags: null, fullRows: [] };
    }
    if (pu.type === "goo") {
      const copy = state.board.map(r => r.slice());
      const fx = computeEffect(copy, { ...pu, consume: false }, {
        area, placed, pid: null, centre, cols, rows, makeFill: () => ({ goo: true }),
      });
      return { indices: fx.filled.map(f => f.y * cols + f.x), flags: null, fullRows: [] };
    }
    return area;
  }

  // What a Shiny Piece will do, played out simply in its highlighted cells on a short loop,
  // behind its marks (CONFIG.fx.powerup.action): a Destroyerz's blocks shrink into nothing, an
  // Expanderz's empty cells fill up (drawAction); a Gravitizerz's blocks fall into the gaps
  // under them (drawFallAction). Plain squares in the class's colour, no particles.
  const easeIn = (t) => t * t;
  function actionPhase(at, dist) {
    const A = CONFIG.fx.powerup.action;
    return frac(at / A.periodMs + (dist ?? 0) * (A.ripplePerCell ?? 0));
  }
  function actionSquare(type, x, y, px, py, size, a) {
    if (size <= 0.5 || a <= 0) return;
    const c = markColour(type, 0, x, y), A = CONFIG.fx.powerup.action;
    bctx.fillStyle = hsla(c.h, c.s, c.l, clamp01(A.alpha * a));
    bctx.fillRect(px + (cell - size) / 2, py + (cell - size) / 2, size, size);
  }
  function drawAction(type, x, y, dist, at) {
    const A = CONFIG.fx.powerup.action, cls = classOf(type);
    if (!A?.enabled || (cls !== "destroyer" && cls !== "expander")) return;
    const t = actionPhase(at, cls === "destroyer" ? -dist : dist);
    const full = cell - 2;
    // destroyer: whole, shrinking to nothing, then gone a moment; expander: nothing, filling up,
    // then full a moment, fading for the next go
    const size = cls === "destroyer"
      ? (t < 0.15 ? 1 : t < 0.7 ? 1 - easeIn((t - 0.15) / 0.55) : 0)
      : (t < 0.15 ? 0 : t < 0.6 ? 1 - Math.pow(1 - (t - 0.15) / 0.45, 2) : 1);
    const a = cls === "expander" && t > 0.85 ? (1 - t) / 0.15 : 1;
    bctx.globalCompositeOperation = "source-over";
    // (a destroyer's block darkens away with its square, so it reads as going)
    if (cls === "destroyer" && size < 1) {
      bctx.fillStyle = `rgba(6,6,10,${(A.hide * (1 - size)).toFixed(3)})`;
      bctx.fillRect(x * cell, y * cell, cell, cell);
    }
    actionSquare(type, x, y, x * cell, y * cell, full * size, a);
  }
  // (where each block in a Gravitizerz's area ends up, column by column: packed down onto the
  // lowest of the area's cells in its column, in order; worked out once for each area)
  const fallMoves = new WeakMap();
  function drawFallAction(board, lp, la, pieceCells, ownDown, at) {
    const A = CONFIG.fx.powerup.action;
    if (!A?.enabled || (lp.direction && lp.direction !== "down")) return;
    let moves = fallMoves.get(la);
    if (!moves) {
      const byCol = new Map();
      for (const i of la.indices) {
        const x = i % cols, y = (i / cols) | 0;
        (byCol.get(x) ?? byCol.set(x, []).get(x)).push(y);
      }
      moves = [];
      for (const [x, ys] of byCol) {
        ys.sort((p, q) => q - p);
        let slot = 0;
        for (const y of ys) {
          const isPiece = pieceCells.has(y * cols + x);
          if (!(isPiece ? ownDown : !!board[y]?.[x])) continue;
          const to = ys[slot++];
          if (to !== y) moves.push({ x, y, to });
        }
      }
      fallMoves.set(la, moves);
    }
    if (!moves.length) return;
    const t = actionPhase(at, 0);
    const k = t < 0.15 ? 0 : t < 0.7 ? easeIn((t - 0.15) / 0.55) : 1;
    const a = t > 0.88 ? (1 - t) / 0.12 : 1;
    bctx.globalCompositeOperation = "source-over";
    for (const m of moves) actionSquare(lp.type, m.x, m.y, m.x * cell, (m.y + (m.to - m.y) * k) * cell, cell - 2, a);
  }

  // The highlighted ("affected") cells of the falling powerup (at its landing
  // spot) or of a locked powerup that is charging up.
  function drawPowerupOverlay(state, ghostY, now) {
    let pu, area, pieceCells, centre, intensity = 1, chargeT = 0;

    const e = state.effect;
    if (e && e.phase === "charge") {
      pu = e.pu;
      area = e.area;
      pieceCells = new Set(e.placed.map(({ x, y }) => y * cols + x));
      centre = e.centre;
      chargeT = clamp01(e.elapsedMs / e.durationMs);
      intensity = 1 + 0.9 * chargeT + (calmFx() ? 0 : 0.35 * Math.sin(chargeT * Math.PI * 6));
    } else if (state.active?.shape.powerup && ghostY != null) {
      const a = state.active;
      pu = a.shape.powerup;
      const key = `${a.shape.id}|${a.rotIdx}|${a.x}|${ghostY}|${state.boardVersion}`;
      if (overlayCache.key !== key) {
        overlayCache.key = key;
        overlayCache.area = resolvePowerupArea(pu, a.rotIdx, a.x, ghostY, cols, rows);
      }
      const mat = getActiveMatrix(state);
      pieceCells = new Set();
      const placed = [];
      for (let y = 0; y < mat.length; y++) {
        for (let x = 0; x < mat[0].length; x++) {
          if (mat[y][x] && ghostY + y >= 0) {
            pieceCells.add((ghostY + y) * cols + a.x + x);
            placed.push({ x: a.x + x, y: ghostY + y });
          }
        }
      }
      centre = { x: a.x + (mat[0].length - 1) / 2, y: ghostY + (mat.length - 1) / 2 };

      if (overlayCache.area && overlayCache.preview !== key) {
        overlayCache.preview = key;
        overlayCache.area = previewArea(state, pu, overlayCache.area, placed, centre);
      }
      area = overlayCache.area;
    } else {
      return;
    }

    const board = state.board;
    const at = calmFx() ? 0 : now; // (calmer animations: the highlight holds still)
    bctx.save();
    // combos: each part draws its own kind of highlight over its own area
    const layers = pu.parts && area.parts
      ? pu.parts.map((p, k) => [p, p.type === "phantom" ? { indices: [...pieceCells] } : area.parts[k]])
      : [[pu, area]];
    for (const [lp, la] of layers) {
      // (behind the marks, what it will really do, simply, on a loop: drawAction)
      if (lp.type === "gravity") drawFallAction(board, lp, la, pieceCells, comesDown(pu), at);
      for (const i of la.indices) {
        const x = i % cols, y = (i / cols) | 0;
        const isPiece = pieceCells.has(i);
        if (isPiece && lp.type === "expander") continue; // (a fill down to the floor passes through it: nothing to mark)
        const filled = !!board[y][x] && !isPiece;
        // (a Destroyerz's own blocks are in its area, and go with everything else there; a
        // Gravitizerz's come down with everything there)
        const effective = (lp.type === "goo" || lp.type === "phantom") ? true
          : lp.type === "expander" ? (!filled && !isPiece) : filled || (isPiece && (classOf(lp.type) === "destroyer" || (lp.type === "gravity" && comesDown(pu))));
        const dist = Math.hypot(x - centre.x, y - centre.y);
        if (effective) drawAction(lp.type, x, y, dist, at);
        drawPowerupMark(bctx, lp, x * cell, y * cell, cell, at, x, y, dist, effective, intensity, centre);
      }
    }

    // White-hot flash right before the effect fires.
    if (chargeT > 0.6) {
      bctx.fillStyle = `rgba(255,255,255,${(0.45 * Math.pow((chargeT - 0.6) / 0.4, 2)).toFixed(3)})`;
      for (const i of area.indices) bctx.fillRect((i % cols) * cell, ((i / cols) | 0) * cell, cell, cell);
    }
    bctx.restore();
  }

  function drawFlash(state) {
    const f = state.fx.flash;
    if (!f.active) return;
    const a = (calmFx() ? 0.3 : 0.85) * (1 - clamp01(f.elapsedMs / f.durationMs));
    bctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    for (const { x, y } of f.cells) bctx.fillRect(x * cell, y * cell, cell, cell);
  }

  // Rings racing out from the centre: a blast's shockwave (and a quick flash), a destroyer's
  // fiery burst, an expander's pulse, a phantom's ripple, a combo's rainbow.
  function drawShockwaves(state, now) {
    const list = state.fx.shockwaves;
    if (!list.length || calmFx()) return; // (calmer animations: no rings)
    bctx.save();
    for (const w of list) {
      if (w.elapsedMs < 0) continue; // (not yet)
      const t = clamp01(w.elapsedMs / w.durationMs);
      const r = (0.3 + w.radius * (1 - Math.pow(1 - t, 3))) * cell;
      const cx = w.x * cell, cy = w.y * cell;
      if (w.kind && w.kind !== "blast") { drawRing(w, t, r, cx, cy, now); continue; }
      if (t < 0.25) {
        bctx.fillStyle = `rgba(255,240,200,${(0.5 * (1 - t / 0.25)).toFixed(3)})`;
        bctx.beginPath(); bctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2); bctx.fill();
      }
      bctx.lineWidth = Math.max(2, cell * 0.45 * (1 - t));
      bctx.strokeStyle = `rgba(255,${(200 - 120 * t) | 0},90,${(0.9 * (1 - t)).toFixed(3)})`;
      bctx.beginPath(); bctx.arc(cx, cy, r, 0, Math.PI * 2); bctx.stroke();
      bctx.lineWidth = Math.max(1, cell * 0.15 * (1 - t));
      bctx.strokeStyle = `rgba(255,255,255,${(0.8 * (1 - t)).toFixed(3)})`;
      bctx.beginPath(); bctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2); bctx.stroke();
    }
    bctx.restore();
  }

  function drawRing(w, t, r, cx, cy, now) {
    const fade = 1 - t;
    bctx.globalCompositeOperation = "lighter";
    if (w.kind === "fire") {
      bctx.lineWidth = Math.max(2, cell * 0.55 * fade);
      bctx.strokeStyle = `rgba(255,${(150 - 100 * t) | 0},40,${(0.85 * fade).toFixed(3)})`;
      bctx.beginPath(); bctx.arc(cx, cy, r, 0, Math.PI * 2); bctx.stroke();
      bctx.lineWidth = Math.max(1, cell * 0.18 * fade);
      bctx.strokeStyle = `rgba(255,240,200,${(0.9 * fade).toFixed(3)})`;
      bctx.beginPath(); bctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2); bctx.stroke();
    } else if (w.kind === "sonar") {
      const c = markColour("expander", now, 0, 0);
      bctx.lineWidth = Math.max(1.5, cell * 0.22 * fade);
      bctx.strokeStyle = hsla(c.h, c.s, 66, 0.75 * fade);
      bctx.beginPath(); bctx.arc(cx, cy, r, 0, Math.PI * 2); bctx.stroke();
      bctx.fillStyle = hsla(c.h, c.s, 60, 0.08 * fade);
      bctx.beginPath(); bctx.arc(cx, cy, r, 0, Math.PI * 2); bctx.fill();
    } else if (w.kind === "ghost") {
      bctx.lineWidth = Math.max(1, cell * 0.12);
      bctx.setLineDash([cell * 0.35, cell * 0.25]);
      bctx.lineDashOffset = -now * 0.02;
      bctx.strokeStyle = `rgba(225,215,255,${(0.6 * fade).toFixed(3)})`;
      bctx.beginPath(); bctx.arc(cx, cy, r, 0, Math.PI * 2); bctx.stroke();
      bctx.setLineDash([]);
    } else if (w.kind === "rainbow") {
      // a ring of the warm rainbow, turning as it spreads, with a soft glow of it round it (each
      // a single stroke of a gradient round it, where the browser has them)
      const segs = 30;
      for (const [width, alpha, lift] of [[cell * 1.1, 0.22, 0], [cell * 0.4, 0.85, 0.15]]) {
        bctx.lineWidth = Math.max(2, width * fade);
        if (bctx.createConicGradient) {
          bctx.strokeStyle = rainbowRound(bctx, cx, cy, now * 0.003, alpha * fade, lift);
          bctx.beginPath(); bctx.arc(cx, cy, r, 0, Math.PI * 2); bctx.stroke();
          continue;
        }
        for (let k = 0; k < segs; k++) {
          const a0 = (k / segs) * Math.PI * 2 + now * 0.003, a1 = a0 + Math.PI * 2 / segs + 0.02;
          bctx.strokeStyle = ombre(k / segs, alpha * fade, lift);
          bctx.beginPath(); bctx.arc(cx, cy, r, a0, a1); bctx.stroke();
        }
      }
    }
    bctx.globalCompositeOperation = "source-over";
  }

  /* --- the powerup show (game.js planShow): what each class does when it goes --- */

  function drawShow(state, now) {
    const sh = state.fx.show;
    if (!sh) return;
    const t = sh.elapsedMs;
    const cx = sh.centre.x * cell, cy = sh.centre.y * cell;
    bctx.save();

    // the freeze: everything it touches glows white-hot for a moment
    if (sh.holdMs > 0 && t < sh.holdMs && sh.area) {
      bctx.fillStyle = `rgba(255,255,255,${(0.5 * (1 - t / sh.holdMs)).toFixed(3)})`;
      for (const i of sh.area) bctx.fillRect((i % cols) * cell, ((i / cols) | 0) * cell, cell, cell);
    }

    // gravity: streaks of light behind the falling blocks
    if (sh.trails && !calmFx()) drawTrails(state, now);

    // expanders: each new block glows as it sprouts
    if (sh.fills) {
      bctx.globalCompositeOperation = "lighter";
      for (const f of sh.fills) {
        const u = (t - f.at) / 320;
        if (u < -0.6 || u >= 1) continue;
        const c = markColour("expander", now, f.x, f.y);
        if (u < 0) { // a seed of light just before it pops
          const d = cell * 0.35 * (1 + u);
          bctx.fillStyle = hsla(c.h, c.s, 82, 0.7);
          bctx.fillRect(f.x * cell + (cell - d) / 2, f.y * cell + (cell - d) / 2, d, d);
          continue;
        }
        const g = cell * 0.4 * u;
        bctx.fillStyle = hsla(c.h, c.s, 70, 0.45 * (1 - u));
        bctx.fillRect(f.x * cell - g, f.y * cell - g, cell + g * 2, cell + g * 2);
      }
      bctx.globalCompositeOperation = "source-over";
    }

    // phantoms: it flickers into being, a ghostly trail above where it came through
    if (sh.ghost) {
      const g = sh.ghost, u = (t - g.start) / g.ms;
      if (u >= 0 && u < 1) {
        const flick = 0.55 + 0.45 * Math.sin(u * 38);
        bctx.globalCompositeOperation = "lighter";
        const tops = new Map();
        for (const c of g.cells) {
          const col = markColour("phantom", now, c.x, c.y);
          bctx.fillStyle = hsla(col.h, col.s, 86, 0.5 * (1 - u) * flick);
          bctx.fillRect(c.x * cell, c.y * cell, cell, cell);
          if (!tops.has(c.x) || c.y < tops.get(c.x)) tops.set(c.x, c.y);
        }
        for (const [x, y] of tops) {
          const h = cell * (2 + 3 * sh.power) * (1 - u * 0.5);
          const gr = bctx.createLinearGradient(0, y * cell - h, 0, y * cell);
          gr.addColorStop(0, "rgba(220,210,255,0)");
          gr.addColorStop(1, `rgba(220,210,255,${(0.35 * (1 - u)).toFixed(3)})`);
          bctx.fillStyle = gr;
          bctx.fillRect(x * cell + cell * 0.1, y * cell - h, cell * 0.8, h);
        }
        bctx.globalCompositeOperation = "source-over";
      }
    }

    // combos: the rainbow running out along every part of it, cell by cell, each cell in its
    // part's own colours with a white square split into the warm rainbow over it
    if (sh.sweep) {
      bctx.globalCompositeOperation = "lighter";
      for (const c of sh.sweep.cells) {
        const u = (t - c.at) / sh.sweep.ms;
        if (u < 0 || u >= 1) continue;
        const a = Math.sin(u * Math.PI), px = c.x * cell, py = c.y * cell;
        const col = markColour(c.type, now, c.x, c.y);
        bctx.fillStyle = hsla(col.h, col.s, Math.max(col.l, 62), 0.5 * a);
        bctx.fillRect(px, py, cell, cell);
        let ux = c.x + 0.5 - sh.centre.x, uy = c.y + 0.5 - sh.centre.y;
        const len = Math.hypot(ux, uy) || 1;
        ux /= len; uy /= len;
        drawChromaSquare(bctx, px + cell / 2, py + cell / 2, cell * (0.28 + 0.34 * (1 - u)), ux, uy, 1 + cell * 0.14 * a, a, 0.12);
      }
      bctx.globalAlpha = 1;
      bctx.globalCompositeOperation = "source-over";
    }

    // blocks that have left the board: pulled into the core, or fading away
    for (const b of sh.blocks) drawGone(b, t, cx, cy, now);

    // destroyers: the core that swallows them, and bursts
    if (sh.pull && !calmFx()) drawCore(sh, t, cx, cy, now); // (calmer animations: no core)
    bctx.restore();
  }

  function drawGone(b, t, cx, cy, now) {
    const local = t - b.delay;
    if (local >= b.dur) return;
    const spr = getSprite(b.paint, b.style);
    const px = b.x * cell, py = b.y * cell;
    if (b.fade || calmFx()) { // (calmer animations: every one just fades where it was)
      const u = clamp01(local / b.dur), d = cell * (1 - 0.6 * u);
      bctx.globalAlpha = 1 - u;
      bctx.drawImage(spr, px + (cell - d) / 2, py + (cell - d) / 2, d, d);
      bctx.globalAlpha = 1;
      return;
    }
    const heat = markColour("destroyer", now, b.x, b.y);
    if (local < 0) {
      // waiting its turn, glowing hot where it is
      bctx.drawImage(spr, px, py, cell, cell);
      bctx.fillStyle = hsla(heat.h, 100, 70, 0.22 + 0.14 * Math.sin(now * 0.03 + b.x + b.y));
      bctx.fillRect(px, py, cell, cell);
      return;
    }
    // pulled in: faster and faster, smaller and hotter, spinning
    const u = local / b.dur, e = u * u * u;
    const x = px + cell / 2 + (cx - px - cell / 2) * e, y = py + cell / 2 + (cy - py - cell / 2) * e;
    const d = cell * (1 - 0.85 * u);
    bctx.save();
    bctx.translate(x, y);
    bctx.rotate(b.spin * u);
    bctx.drawImage(spr, -d / 2, -d / 2, d, d);
    bctx.globalCompositeOperation = "lighter";
    bctx.fillStyle = hsla(heat.h, 100, 60, 0.15 + 0.6 * u);
    bctx.fillRect(-d / 2, -d / 2, d, d);
    bctx.restore();
  }

  function drawCore(sh, t, cx, cy, now) {
    const p = sh.pull;
    if (t < p.start) return;
    const R = p.r * cell;
    if (t < p.popAt) {
      // swelling as it swallows: a dark core with a fiery, turning rim
      const u = clamp01((t - p.start) / Math.max(1, p.popAt - p.start));
      const r = R * (0.35 + 0.65 * Math.sqrt(u));
      bctx.fillStyle = "rgba(8,2,12,0.92)";
      bctx.beginPath(); bctx.arc(cx, cy, r, 0, Math.PI * 2); bctx.fill();
      bctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 3; k++) {
        const c = markColour("destroyer", now + k * 300, k, 0);
        bctx.strokeStyle = hsla(c.h, 100, 60, 0.6 - k * 0.14);
        bctx.lineWidth = Math.max(1.5, cell * (0.24 - k * 0.05));
        const a0 = now * (0.006 + k * 0.003) + k * 2;
        bctx.beginPath(); bctx.arc(cx, cy, r * (1 + k * 0.18), a0, a0 + Math.PI * (1.2 + 0.3 * k)); bctx.stroke();
      }
      bctx.globalCompositeOperation = "source-over";
      return;
    }
    // the burst: a white-hot flash, going orange as it spreads
    const v = (t - p.popAt) / p.popMs;
    if (v >= 1) return;
    const fr = Math.max(1, R * (0.5 + 2.4 * Math.sqrt(v)) * (1 + sh.power));
    const g = bctx.createRadialGradient(cx, cy, 0, cx, cy, fr);
    g.addColorStop(0, `rgba(255,255,240,${(0.95 * (1 - v)).toFixed(3)})`);
    g.addColorStop(0.35, `rgba(255,170,60,${(0.6 * (1 - v)).toFixed(3)})`);
    g.addColorStop(1, "rgba(255,60,20,0)");
    bctx.globalCompositeOperation = "lighter";
    bctx.fillStyle = g;
    bctx.beginPath(); bctx.arc(cx, cy, fr, 0, Math.PI * 2); bctx.fill();
    bctx.globalCompositeOperation = "source-over";
  }

  function drawTrails(state, now) {
    const mv = state.fx.moveAnim;
    if (!mv.active) return;
    bctx.save();
    bctx.globalCompositeOperation = "lighter";
    for (const [idx, m] of mv.byIndex) {
      if (m.path || m.vx !== undefined || m.oy >= 0) continue;
      const local = mv.elapsedMs - (m.delay ?? 0);
      if (local <= 0 || local >= m.dur + 140) continue;
      const tt = clamp01(local / m.dur);
      const x = idx % cols, y = (idx / cols) | 0;
      const top = (y + m.oy) * cell;                  // where it started
      const cur = (y + m.oy * (1 - tt * tt)) * cell;   // where it is now
      const fade = local > m.dur ? 1 - (local - m.dur) / 140 : 1;
      const tail = Math.max(top, cur - cell * 3);
      const c = markColour("gravity", now, x, y);
      const g = bctx.createLinearGradient(0, tail, 0, cur + cell * 0.5);
      g.addColorStop(0, hsla(c.h, c.s, c.l, 0));
      g.addColorStop(1, hsla(c.h, c.s, c.l, 0.45 * fade));
      bctx.fillStyle = g;
      bctx.fillRect(x * cell + cell * 0.15, tail, cell * 0.7, cur + cell * 0.5 - tail);
    }
    bctx.restore();
  }

  // The board leans in a little for a big one.
  function punchTransform(ctx, state) {
    const sh = state.fx.show;
    if (!sh || !sh.punch || calmFx()) return; // (calmer animations: no lurch)
    const t = sh.elapsedMs, h = Math.max(1, sh.holdMs);
    const env = t < h ? Math.sin((t / h) * Math.PI / 2) : Math.exp(-(t - h) / 240);
    const z = 1 + sh.punch * env;
    if (z <= 1.0005) return;
    const px = clampN(sh.centre.x * cell, bw * 0.3, bw * 0.7), py = clampN(sh.centre.y * cell, bh * 0.3, bh * 0.7);
    ctx.translate(px, py);
    ctx.scale(z, z);
    ctx.translate(-px, -py);
  }

  function drawCallouts(state, now) {
    const list = state.fx.callouts;
    if (!list.length) return;
    bctx.save();
    bctx.textAlign = "center";
    bctx.textBaseline = "middle";
    bctx.lineJoin = "round";
    for (const c of list) {
      const t = clamp01(c.elapsedMs / c.durationMs);
      const pop = t < 0.14 ? easeOutBack(t / 0.14) : 1;
      const alpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      let size = Math.max(1, (c.big ? 15 : 11) * pop);
      const text = c.text.toUpperCase();
      bctx.font = `${size.toFixed(1)}px PressStart2P, ui-monospace, monospace`;
      // (a long one, say QUATTUORVIGINTUPLE, shrinks to fit across the board)
      const wide = bctx.measureText(text).width;
      if (wide > bw - 8) {
        size *= (bw - 8) / wide;
        bctx.font = `${size.toFixed(1)}px PressStart2P, ui-monospace, monospace`;
      }
      const half = Math.min(bw / 2, bctx.measureText(text).width / 2 + 4);
      const x = clampN(c.x * cell, half, bw - half);
      const y = clampN(c.y * cell - t * cell * 1.6, size, bh - size);
      bctx.globalAlpha = alpha;
      bctx.lineWidth = 4;
      bctx.strokeStyle = "rgba(0,0,0,0.85)";
      bctx.strokeText(text, x, y);
      bctx.fillStyle = c.color ?? (c.big ? ombre(now * 0.0008, 1, 0.2) : "#ffffff");
      bctx.fillText(text, x, y);
    }
    bctx.restore();
  }

  function makeBoardSnapshotCanvas(state) {
    const cvs = makeCanvas(bw, bh);
    const ctx = cvs.getContext("2d");
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = state.board[y][x];
        if (c) drawBlockWithPaintStatic(ctx, x * cell, y * cell, cell, c.paint, c.style);
      }
    }
    return cvs;
  }

  function drawGameOverBackdrop(state) {
    const bg = state.fx.gameOverBackdrop;
    if (!state.gameOver || !CONFIG.fx.gameOverBackdrop.enabled) return;
    if (backdrop.cut !== bg.cut || !backdrop.canvas) {
      backdrop.cut = bg.cut;
      backdrop.canvas = makeBoardSnapshotCanvas(state);
    }

    bctx.save();
    bctx.beginPath();
    bctx.rect(0, 0, bw, bh);
    bctx.clip();

    bctx.globalAlpha = CONFIG.fx.gameOverBackdrop.alpha ?? 0.95;

    const patternCanvas = backdrop.canvas;
    const scaleG = CONFIG.fx.gameOverBackdrop.scale ?? 1.9;
    const scaledW = patternCanvas.width * scaleG;
    const scaledH = patternCanvas.height * scaleG;
    const angle = bg.currentAngle * Math.PI / 180;

    bctx.translate(bw / 2, bh / 2);
    bctx.rotate(angle);
    bctx.translate(-bw / 2, -bh / 2);

    for (let yy = -scaledH * 2; yy < bh + scaledH * 2; yy += scaledH) {
      for (let xx = -scaledW * 2; xx < bw + scaledW * 2; xx += scaledW) {
        bctx.drawImage(patternCanvas, xx + bg.offsetX, yy + bg.offsetY, scaledW, scaledH);
      }
    }

    bctx.restore();
  }

  // The glow round the head of the light along a clearing row (a rowClear tier's `glow`): what
  // a shadow blur that wide round the head and its warm split would be, drawn once for each size,
  // way and colour (the warm rainbow's to the nearest 48th of the way round) and kept, at no more
  // pixels than a blur that soft needs. (A blur that wide drawn each frame, for every row and
  // every copy of the split, was more than even a quick computer could keep up with.) The head
  // and its split themselves are drawn at (0, 0): the head's middle, the top of the band.
  const rowGlows = new Map();
  const GLOW_HUES = 48;
  function rowGlow(glow, h, ahead, chroma, colour) {
    const key = `${glow}|${h}|${ahead}|${colour}|${scale}`;
    let spr = rowGlows.get(key);
    if (spr) return spr;
    if (rowGlows.size > 200) rowGlows.clear();
    const r = Math.min(scale, Math.max(1, 8 / glow)); // (its pixels a board pixel)
    const reach = glow * 1.6 + 1; // (how far out the blur goes: past three of its sigma, glow / 2)
    const ox = 7.5 + reach, oy = 1 + reach, w = ox * 2, hh = h + oy * 2;
    const c = makeCanvas(Math.ceil(w * r), Math.ceil(hh * r)), g = c.getContext("2d");
    // (just the shadow: what casts it is off to the left of the canvas, the shadow pushed back on)
    const far = c.width + 16;
    g.setTransform(r, 0, 0, r, ox * r - far, oy * r);
    g.shadowOffsetX = far;
    g.shadowColor = colour;
    g.shadowBlur = glow * r;
    g.globalCompositeOperation = "lighter";
    if (chroma) for (const [k, fringe, strength] of WARM_SPLIT) {
      g.globalAlpha = 0.6 * strength;
      g.fillStyle = fringe;
      g.fillRect(-1.5 - ahead * k * 2.5, -1, 3, h + 2);
    }
    g.globalAlpha = 1;
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.fillRect(-1.5, 0, 3, h);
    spr = { canvas: c, ox, oy, w: c.width / r, h: c.height / r };
    rowGlows.set(key, spr);
    return spr;
  }

  // The light sweeping along rows as they go (game.js rowClearShow, CONFIG.fx.rowClear): a band
  // brightest at its head, fading behind it, with more to it the more rows go at once.
  function drawRowClears(state, now) {
    const list = state.fx.rowClears;
    if (!list?.length) return;
    const tiers = CONFIG.fx.rowClear.tiers;
    // (the glows: not in high contrast, nor on a tier without them, CONFIG.fx.quality)
    const glows = !highContrast() && fxTier().glow !== false;
    bctx.save();
    bctx.imageSmoothingEnabled = true; // (the glows: soft, drawn at fewer pixels than the board)
    bctx.globalCompositeOperation = "lighter";
    for (const c of list) {
      const T = tiers[c.tier] ?? tiers[0], t = c.elapsedMs, mid = bw / 2;
      const colour = (x, a, lift = 0.2) => T.rainbow ? ombre((c.hue + (x / bw) * 300 + t * 0.25) / 360, a, lift) : `rgba(255,255,255,${a})`;
      // a soft wash of the warm rainbow over the whole board, rising from the bottom
      if (T.wash) {
        const p = Math.min(1, t / (c.durationMs * 0.75)), yc = bh * (1.15 - 1.3 * p), half = bh * 0.22;
        const a = 0.24 * Math.sin(Math.PI * p);
        const g = bctx.createLinearGradient(0, yc - half, 0, yc + half);
        for (let k = 0; k <= 6; k++) g.addColorStop(k / 6, ombre((c.hue + k * 50) / 360, a * Math.sin(Math.PI * k / 6)));
        bctx.fillStyle = g;
        bctx.fillRect(0, yc - half, bw, half * 2);
      }
      c.rows.forEach((y, i) => {
        const t0 = t - i * c.rowStaggerMs;
        if (t0 < 0) return;
        const s = Math.min(1, t0 / c.sweepMs);
        const fade = t0 > c.sweepMs ? 1 - Math.min(1, (t0 - c.sweepMs) / c.fadeMs) : 1;
        if (fade <= 0) return;
        const h = cell * (T.band ?? 0.6), top = y * cell + (cell - h) / 2;
        const dir = c.pattern === "weave" ? (i % 2 ? "rtl" : "ltr") : c.pattern;
        // [from, head] stretches: the lit part of the row, its head where the light is now
        const spans = dir === "ltr" ? [[0, s * bw]] : dir === "rtl" ? [[bw, bw - s * bw]]
          : dir === "edges" ? [[0, s * mid], [bw, bw - s * mid]] : [[mid, mid - s * mid], [mid, mid + s * mid]];
        for (const [from, head] of spans) {
          const lo = Math.min(from, head), w = Math.abs(head - from);
          if (w < 0.5) continue;
          const g = bctx.createLinearGradient(from, 0, head, 0);
          g.addColorStop(0, colour(from, (0.12 * fade).toFixed(3)));
          g.addColorStop(0.75, colour((from + head) / 2, (0.35 * fade).toFixed(3)));
          g.addColorStop(1, colour(head, (0.75 * fade).toFixed(3), 0.5));
          bctx.fillStyle = g;
          bctx.fillRect(lo, top, w, h);
          // the head itself, while it's still moving: white hot, with a glow and fringes
          if (s < 1) {
            const ahead = head >= from ? 1 : -1;
            if (T.glow && glows) { // (the glow round it all: rowGlow)
              const q = T.rainbow ? Math.round(frac((c.hue + (head / bw) * 300 + t * 0.25) / 360) * GLOW_HUES) % GLOW_HUES : -1;
              const spr = rowGlow(T.glow, h, T.chroma ? ahead : 0, !!T.chroma, q < 0 ? "rgba(180,240,255,1)" : ombre(q / GLOW_HUES, 1, 0.2));
              bctx.globalAlpha = fade;
              bctx.drawImage(spr.canvas, head - spr.ox, top - spr.oy, spr.w, spr.h);
              bctx.globalAlpha = 1;
            }
            if (T.chroma) { // (the warm split either side of it)
              for (const [k, fringe, strength] of WARM_SPLIT) {
                bctx.globalAlpha = 0.6 * strength * fade;
                bctx.fillStyle = fringe;
                bctx.fillRect(head - 1.5 - ahead * k * 2.5, top - 1, 3, h + 2);
              }
              bctx.globalAlpha = 1;
            }
            bctx.fillStyle = `rgba(255,255,255,${(0.95 * fade).toFixed(3)})`;
            bctx.fillRect(head - 1.5, top, 3, h);
          }
        }
      });
      // lines running up and down the board from the rows that went
      if (T.ripples) {
        const yc = (c.rows.reduce((a, b) => a + b, 0) / c.rows.length + 0.5) * cell;
        for (let k = 0; k < T.ripples; k++) {
          const tr = t - k * 90;
          if (tr < 0 || tr > T.rippleMs) continue;
          const p = tr / T.rippleMs, d = p * bh * 0.55, a = 0.5 * (1 - p);
          for (const yy of [yc - d, yc + d]) {
            if (yy < 0 || yy > bh) continue;
            bctx.fillStyle = T.rainbow ? ombre((c.hue + k * 70 + p * 120) / 360, a, 0.25) : `rgba(200,245,255,${a.toFixed(3)})`;
            bctx.fillRect(0, yy - 1, bw, 2);
          }
        }
      }
    }
    bctx.restore();
  }

  // The dramatic pause (CONFIG.fx.admire): the whole board aglow in its own colours, a slow wave
  // of light rolling across it. (Each block's colour: the average of its pixels.)
  const glowOf = new WeakMap();
  function cellGlow(c) {
    let out = glowOf.get(c);
    if (out) return out;
    let r = 0, g = 0, b = 0, n = 0;
    const add = (hex) => {
      if (typeof hex !== "string" || hex[0] !== "#" || hex.length < 7) return;
      r += parseInt(hex.slice(1, 3), 16); g += parseInt(hex.slice(3, 5), 16); b += parseInt(hex.slice(5, 7), 16); n++;
    };
    if (typeof c.paint === "string") add(c.paint);
    else for (const row of c.paint?.pixels ?? []) for (const hex of row) add(hex);
    if (!n) add(c.style?.baseColor);
    out = n ? `rgb(${(r / n) | 0},${(g / n) | 0},${(b / n) | 0})` : "#ffffff";
    glowOf.set(c, out);
    return out;
  }
  function drawAdmire(state, now) {
    const ad = state.fx.admire;
    if (!ad) return;
    const p = ad.elapsedMs / ad.durationMs;
    const env = Math.min(1, p / 0.25) * Math.min(1, (1 - p) / 0.15); // (in, a while, and out)
    if (env <= 0) return;
    bctx.save();
    bctx.globalCompositeOperation = "lighter";
    state.board.forEach((row, y) => row.forEach((c, x) => {
      if (!c) return;
      bctx.globalAlpha = CONFIG.fx.admire.glow * env * (0.55 + 0.45 * Math.sin(now / 260 - (x + y) * 0.45));
      bctx.fillStyle = cellGlow(c);
      bctx.fillRect(x * cell, y * cell, cell, cell);
    }));
    bctx.restore();
  }

  function drawParticles(state) {
    const parts = state.fx.particles;
    if (!parts.length || calmFx()) return; // (calmer animations: no bits flying)

    bctx.save();
    for (const glow of [false, true]) {
      bctx.globalCompositeOperation = glow ? "lighter" : "source-over";
      for (const p of parts) {
        if (p.delayMs > 0 || !!p.glow !== glow) continue;
        // (a twinkle comes and goes; the rest fade out)
        const life = clamp01(p.lifeMs / p.maxLifeMs);
        bctx.globalAlpha = p.twinkle ? Math.sin(Math.PI * life) : life;
        if (p.chroma) { // white, split into the warm rainbow along the way it's going
          const sp = Math.hypot(p.vx, p.vy), s = p.size;
          drawChromaSquare(bctx, p.x + s / 2, p.y + s / 2, s, sp ? p.vx / sp : 0, sp ? p.vy / sp : 1, Math.min(s, 0.5 + sp * 0.005), bctx.globalAlpha, 0.14);
          continue;
        }
        bctx.fillStyle = p.color;
        if (p.shape === "plus") { // a little twinkle
          const s = p.size, k = Math.max(1, s / 2);
          bctx.fillRect(p.x - s, p.y - k / 2, s * 2, k);
          bctx.fillRect(p.x - k / 2, p.y - s, k, s * 2);
        } else bctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }
    bctx.restore();
  }

  function draw(state, now = performance.now()) {
    if (nextLayout?.colours.flow) paintNext(now); // (the next piece, a powerup: its colours flow)
    const key = styleKey();
    if (key !== lastStyleKey) {
      lastStyleKey = key;
      invalidateCaches();
    }
    const layers = getStaticLayers();
    const enhanced = isEnhanced();

    bctx.setTransform(scale, 0, 0, scale, 0, 0);
    bctx.imageSmoothingEnabled = false;

    // Solid fill behind everything: only needed when the shake exposes the
    // edges (otherwise the opaque board layer covers the whole canvas).
    if (state.gameOver || state.fx.quake.trauma > 0.0001) {
      bctx.fillStyle = enhanced ? CONFIG.render.enhanced.bgBottom : CONFIG.render.bg;
      bctx.fillRect(0, 0, bw, bh);
    }

    if (state.gameOver) {
      drawBackground(bctx);
      drawGameOverBackdrop(state);
      drawScreenFX(bctx);
      return;
    }

    bctx.save();
    quakeTransform(bctx, state);
    punchTransform(bctx, state);

    const hide = state.paused && CONFIG.pause.hideShapes && !state.zen; // (zen: pausing still shows it all)

    if (hide) {
      drawBackground(bctx);
    } else {
      drawBoard(bctx, state);

      const ghostY = state.active ? getGhostDropY(state) : null;
      const ghostBehind = CONFIG.render.ghost?.drawBehindActive ?? true;

      if (state.active && ghostBehind) drawGhostPiece(state, ghostY);
      drawAce(state, now); // (behind the piece coming in)
      for (const f of state.flock ?? []) drawActivePiece(state, f);
      if (state.active) drawActivePiece(state);
      drawAceGlow(state);
      if (state.active && !ghostBehind) drawGhostPiece(state, ghostY);

      drawPowerupOverlay(state, ghostY, now);

      if (state.active?.shape.powerup) {
        drawPowerupShimmer(activeShimmerCells(state), now, 0, state.active.shape.powerup.type);
      } else if (state.effect?.phase === "charge") {
        const e = state.effect;
        const cells = e.placed
          .filter(({ x, y }) => state.board[y][x]?.pid === e.pid)
          .map(({ x, y }) => ({ x, y, mask: boardEdgeMask(state.board, x, y, e.pid) }));
        drawPowerupShimmer(cells, now, clamp01(e.elapsedMs / e.durationMs), e.pu?.type);
      }

      drawShow(state, now);
      drawFlash(state);
      drawAdmire(state, now);
      drawDanger(state);
    }

    if (!hide) drawRowClears(state, now);
    drawParticles(state);
    if (!hide) drawShockwaves(state, now);
    if (!hide) drawCallouts(state, now);
    if (enhanced) drawScreenFX(bctx);
    else bctx.drawImage(layers.classicTop, 0, 0, bw, bh);

    bctx.restore();
  }

  // The next piece, as a silhouette: one smooth shape, no cells marked, glowing a little in its
  // own colours. A cool gradient for an ordinary piece; a powerup in its class's colours, always
  // on the move (a combo's flowing from one class's colours into the next: all three, a rainbow).
  // Behind it, a soft glow in the colours of its own art, as a hint of what's coming (not in a mode
  // without hints: `glow: false`). A powerup's shell goes rainbow too (index.html,
  // .nextMiniShell.power). CONFIG.render.next has the numbers.
  let nextShape = null, nextGlowOn = true, nextPlain = false, nextLayout = null;
  const nextGlow = new WeakMap();
  function averageColour(shape) {
    if (nextGlow.has(shape)) return nextGlow.get(shape);
    let r = 0, g = 0, b = 0, n = 0;
    const add = (c) => {
      if (typeof c !== "string" || !isHexColour(c)) return;
      const h = c.trim().replace("#", ""), f = h.length === 3 ? h.split("").map(x => x + x).join("") : h.slice(0, 6);
      r += parseInt(f.slice(0, 2), 16); g += parseInt(f.slice(2, 4), 16); b += parseInt(f.slice(4, 6), 16); n++;
    };
    for (const row of shape.cellPaints?.[0] ?? []) for (const p of row) {
      if (!p) continue;
      if (typeof p === "string") add(p);
      else for (const line of p.pixels ?? []) for (const c of line) add(c);
    }
    const out = n ? [r / n, g / n, b / n].map(Math.round) : [168, 61, 235];
    nextGlow.set(shape, out);
    return out;
  }
  // Its colours: two ends of a still gradient, or (a powerup) a loop of colours to flow through:
  // its class's two, or for a combo all of its classes' colours. In order round the colour wheel:
  // all the way round if they leave no big gap (all three classes: a rainbow), or else there and
  // back, so it keeps to its own colours.
  function silhouetteColours(shape) {
    const pu = shape?.powerup;
    if (!pu) return { still: ["#c9d3ff", "#7a5cff"] };
    const pals = [...new Set((pu.parts ?? [pu]).map(p => classOf(p.type)))].map(c => CONFIG.fx.powerup.classColours?.[c]).filter(Boolean);
    if (!pals.length) return { flow: [0, 60, 120, 180, 240, 300].map(h => ({ h, s: 100, l: 60 })) };
    const stops = pals.flatMap(p => p.hues.map(h => ({ h: ((h % 360) + 360) % 360, s: p.sat ?? 100, l: p.light ?? 60 }))).sort((a, b) => a.h - b.h);
    let gap = -1, at = 0;
    stops.forEach((st, i) => { const g = ((stops[(i + 1) % stops.length].h - st.h + 360) % 360) || 360; if (g > gap) { gap = g; at = (i + 1) % stops.length; } });
    const arc = [...stops.slice(at), ...stops.slice(0, at)]; // (from just past the biggest gap, round)
    return { flow: gap <= 90 ? arc : [...arc, ...arc.slice(1, -1).reverse()], combo: pals.length > 1 };
  }
  // (a colour part of the way round the loop, the hue going the short way)
  function flowColour(stops, t, alpha = 1) {
    const n = stops.length, u = (((t % 1) + 1) % 1) * n, i = Math.floor(u), f = u - i;
    const a = stops[i % n], b = stops[(i + 1) % n];
    let dh = b.h - a.h;
    if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
    const h = (a.h + dh * f + 360) % 360, sat = a.s + (b.s - a.s) * f, l = a.l + (b.l - a.l) * f;
    return `hsla(${h.toFixed(1)},${sat.toFixed(1)}%,${l.toFixed(1)}%,${alpha})`;
  }
  function drawNext(shape = nextShape, pop = false, opts = null) {
    if (pop && shape && shape !== nextShape) { nextCanvas.classList.remove("pop"); void nextCanvas.offsetWidth; nextCanvas.classList.add("pop"); }
    nextShape = shape;
    if (opts && "glow" in opts) nextGlowOn = !!opts.glow;
    if (opts && "plain" in opts) nextPlain = !!opts.plain;
    nextCanvas.parentElement?.classList.toggle("power", !!shape?.powerup && !nextPlain);
    // (its size as laid out: it's popping in, scaled down, this moment)
    const box = layoutSize(nextCanvas), dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const W = Math.max(1, Math.round(box.w * dpr)), Hh = Math.max(1, Math.round(box.h * dpr));
    if (nextCanvas.width !== W || nextCanvas.height !== Hh) { nextCanvas.width = W; nextCanvas.height = Hh; }
    nextLayout = null;
    if (shape) {
      const mat = shape.rotations[0], ph = mat.length, pw = mat[0].length;
      const pad = Math.round(6 * dpr); // (room for the glow)
      const c = Math.max(1, Math.floor(Math.min((W - pad * 2) / pw, (Hh - pad * 2) / ph, 22 * dpr)));
      const dw = pw * c, dh = ph * c, ox = Math.floor((W - dw) / 2), oy = Math.floor((Hh - dh) / 2);
      // (the outline as one path: whole cells, on whole pixels, so no seams between them)
      const path = new Path2D();
      for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) if (mat[y][x]) path.rect(ox + x * c, oy + y * c, c, c);
      nextLayout = { W, Hh, dpr, c, ox, oy, dw, dh, path, colours: silhouetteColours(nextPlain ? null : shape), hint: nextGlowOn ? averageColour(shape) : null };
    }
    paintNext(performance.now());
  }
  // The silhouette's glow in `colour`: what a shadow blurred `blur` pixels round it would be. The
  // blur is made once for the piece (white), and only coloured each time: its colours flow, so
  // it's painted every frame, and a blur that size each frame was a good share of one.
  function nextGlowIn(L, blur, colour) {
    let G = L.glow;
    if (!G || G.blur !== blur) {
      const mask = makeCanvas(L.W, L.Hh), g = mask.getContext("2d"), far = L.W + 16;
      g.setTransform(1, 0, 0, 1, -far, 0); // (the shape off the canvas, its shadow back on it)
      g.shadowOffsetX = far;
      g.shadowColor = "#fff";
      g.shadowBlur = blur;
      g.fillStyle = "#fff";
      g.fill(L.path);
      G = L.glow = { blur, mask, tint: makeCanvas(L.W, L.Hh), colour: null };
    }
    if (G.colour !== colour) {
      const t = G.tint.getContext("2d");
      t.globalCompositeOperation = "copy";
      t.drawImage(G.mask, 0, 0);
      t.globalCompositeOperation = "source-in";
      t.fillStyle = colour;
      t.fillRect(0, 0, L.W, L.Hh);
      G.colour = colour;
    }
    return G.tint;
  }
  function paintNext(now) {
    const L = nextLayout;
    nctx.setTransform(1, 0, 0, 1, 0, 0);
    nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!L) return;
    const cfg = CONFIG.render.next ?? {};
    const { W, Hh, dpr, c, ox, oy, dw, dh, path, colours } = L;
    const cx = ox + dw / 2, cy = oy + dh / 2, rad = Math.max(dw, dh) * 0.8 + 6 * dpr;
    // the glow behind it, in the colours of its art
    if (L.hint) {
      const [r, g, b] = L.hint;
      const glow = nctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      glow.addColorStop(0, `rgba(${r},${g},${b},0.42)`);
      glow.addColorStop(0.55, `rgba(${r},${g},${b},0.16)`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      nctx.fillStyle = glow;
      nctx.fillRect(0, 0, W, Hh);
    }
    // the silhouette: still, or flowing along its diagonal (one loop of its colours across it,
    // moving on by one loop every periodMs)
    let fill, glowColour;
    if (colours.flow) {
      const period = (colours.combo ? cfg.comboPeriodMs : cfg.periodMs) ?? 2600;
      const phase = (now / period) % 1, n = colours.flow.length;
      // (a loop's a good deal longer than the piece, so it's more a colour on the move than bands of them)
      const len = Math.max(dw, dh, 4 * c) * (cfg.loopPieces ?? 2.2), ux = 0.6, uy = 0.8; // (down and a little across)
      const x0 = ox - ux * len * phase, y0 = oy - uy * len * phase;
      fill = nctx.createLinearGradient(x0, y0, x0 + ux * len * 2, y0 + uy * len * 2);
      // two loops end to end, each colour with a step or two between it and the next (the hue the short way round)
      const per = n * 3;
      for (let k = 0; k <= per * 2; k++) fill.addColorStop(k / (per * 2), flowColour(colours.flow, k / per));
      // (the glow: the colour it is in the middle)
      glowColour = flowColour(colours.flow, phase + (dw / 2 * ux + dh / 2 * uy) / len, cfg.glowAlpha ?? 0.85);
    } else {
      fill = nctx.createLinearGradient(ox, oy, ox + dw * 0.4, oy + dh);
      fill.addColorStop(0, colours.still[0]); fill.addColorStop(1, colours.still[1]);
      glowColour = cfg.glow ?? "rgba(150,135,255,0.8)";
    }
    // (its glow: the shadow of it, blurred; high contrast, or a tier without glows, none)
    const blur = highContrast() || fxTier().glow === false ? 0 : Math.max(2, c * (cfg.glowCells ?? 0.55));
    if (blur > 0) nctx.drawImage(nextGlowIn(L, blur, glowColour), 0, 0);
    nctx.fillStyle = fill;
    nctx.fill(path);
    // (a soft sheen from the top, for a little depth: no lines)
    const sheen = nctx.createLinearGradient(0, oy, 0, oy + dh);
    sheen.addColorStop(0, "rgba(255,255,255,0.22)"); sheen.addColorStop(0.5, "rgba(255,255,255,0.04)"); sheen.addColorStop(1, "rgba(0,0,0,0.12)");
    nctx.fillStyle = sheen;
    nctx.fill(path);
  }
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => drawNext()).observe(nextCanvas);

  // The board is a different size now (CONFIG.board): everything drawn for the old one goes.
  function resize() {
    cols = CONFIG.board.cols;
    rows = CONFIG.board.rows;
    bw = cols * cell;
    bh = rows * cell;
    backdrop.cut = -1;
    applyScale(computeScale());
  }

  return { draw, drawNext, resize };
}
