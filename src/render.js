// ============================================================
// RENDERER — draws the board, pieces, powerup highlights and effects
// ============================================================

import { CONFIG } from "../config.js";
import { clamp01, clampN, frac, hash01, easeOutBack, hsla, rgba, isHexColour } from "./util.js";
import { getShapePaint } from "./shapes.js";
import { getActiveMatrix, getGhostDropY } from "./game.js";
import { resolvePowerupArea, computeEffect, isPhantomPowerup, classOf } from "./powerups.js";

const DEFAULT_STYLE = {};

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
function drawPixelArtDevice(ctx, sizePx, paint, baseColor) {
  if (paint && typeof paint === "object" && paint.pixels && paint.k) {
    const k = paint.k;
    const b = new Array(k + 1);
    for (let i = 0; i <= k; i++) b[i] = Math.round((i * sizePx) / k);
    for (let sy = 0; sy < k; sy++) {
      for (let sx = 0; sx < k; sx++) {
        const c = paint.pixels[sy][sx];
        ctx.fillStyle = (typeof c === "string" && isHexColour(c)) ? c : baseColor;
        ctx.fillRect(b[sx], b[sy], b[sx + 1] - b[sx], b[sy + 1] - b[sy]);
      }
    }
  } else {
    ctx.fillStyle = (typeof paint === "string") ? paint : baseColor;
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
//   shrink (Dissolverz): squares closing in; line (Gravitizerz): falling streaks;
//   burst (Expanderz): + and x rays shooting out of each cell's centre;
//   ghost (Phantomz): faint diagonal stripes drifting past, flickering in and out.
const MARK_STYLE = { destroyer: "shrink", acid: "shrink", expander: "burst", goo: "burst", phantom: "ghost", gravity: "line", blast: "out" };

// The colour of a highlighted cell: its class's gradient (CONFIG.fx.powerup.classColours),
// shimmering back and forth across the cells; full rainbow for anything without one.
export function markColour(type, now, x, y) {
  const o = CONFIG.fx.powerup.overlay;
  const pal = CONFIG.fx.powerup.classColours?.[classOf(type)];
  const t = now * o.hueDegPerMs + (x + y) * o.hueStepPerCell;
  if (!pal) return { h: t % 360, s: 100, l: 60 };
  const [h0, h1] = pal.hues;
  const span = ((h1 - h0) % 360 + 360) % 360 || 360;
  const tri = 1 - Math.abs(((t / span) % 2) - 1); // 0 -> 1 -> 0 ...
  return { h: (h0 + span * tri) % 360, s: pal.sat ?? 100, l: pal.light ?? 60 };
}

export function drawPowerupMark(ctx, { type, direction }, px, py, cell, now, x, y, dist, effective, intensity = 1, centre = null) {
  const o = CONFIG.fx.powerup.overlay;
  const cycle = now / o.periodMs;
  const c = markColour(type, now, x, y);
  const fillA = clamp01((effective ? o.fillAlpha : o.idleFillAlpha) * intensity);
  const markA = clamp01((effective ? o.markAlpha : o.idleMarkAlpha) * intensity);

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = hsla(c.h, c.s, c.l, fillA);
  ctx.fillRect(px, py, cell, cell);

  // marks glow additively so they stay visible over bright pixel art
  ctx.globalCompositeOperation = "lighter";
  const mark = hsla(c.h, c.s, Math.min(92, c.l + 2), markA);
  ctx.strokeStyle = mark;
  ctx.fillStyle = mark;

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
  ctx.globalCompositeOperation = "source-over";
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
  const boardCache = { canvas: document.createElement("canvas"), version: -1, styleKey: "" };
  let staticLayers = null; // { bg, screen, classicTop } pre-rendered layers
  let lastStyleKey = styleKey();
  const overlayCache = { key: "", area: null };
  const backdrop = { cut: -1, canvas: null };

  const isEnhanced = () => CONFIG.render.cellStyle !== "classic";
  function styleKey() { return `${CONFIG.render.cellStyle}|${CONFIG.render.enhanced.edgeStrength}`; }

  function computeScale() {
    // Integer backing scale so cells land on whole device pixels; the browser
    // only ever scales UP a little (image-rendering: pixelated), never down.
    const dpr = window.devicePixelRatio || 1;
    const cssW = boardCanvas.getBoundingClientRect().width || bw;
    return Math.max(1, Math.min(CONFIG.render.maxScale ?? 4, Math.floor((cssW * dpr) / bw + 0.001)));
  }

  function invalidateCaches() {
    spriteObjCache = new WeakMap();
    spriteStrCache = new WeakMap();
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

  // --- next-piece canvas (sized to fit wherever it is, each time it's drawn: drawNext) ---
  const nctx = nextCanvas.getContext("2d");

  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  // One cached canvas per distinct block paint.
  function getSprite(paint, style) {
    const enhanced = isEnhanced();
    if (paint && typeof paint === "object") {
      let spr = spriteObjCache.get(paint);
      if (!spr) {
        spr = renderSprite(paint, style, enhanced);
        spriteObjCache.set(paint, spr);
      }
      return spr;
    }
    const st = style ?? DEFAULT_STYLE;
    let byColour = spriteStrCache.get(st);
    if (!byColour) { byColour = new Map(); spriteStrCache.set(st, byColour); }
    let spr = byColour.get(paint);
    if (!spr) {
      spr = renderSprite(paint, st, enhanced);
      byColour.set(paint, spr);
    }
    return spr;
  }

  function renderSprite(paint, style, enhanced) {
    const size = cell * scale;
    const c = makeCanvas(size, size);
    const g = c.getContext("2d");
    if (enhanced) {
      drawPixelArtDevice(g, size, paint, style?.baseColor ?? "#FFFFFF");
    } else {
      g.scale(scale, scale);
      drawBlockWithPaint(g, 0, 0, cell, paint, style ?? {});
    }
    return c;
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

    // Scanlines + chromatic border (both looks).
    function drawScreenFX(g) {
      g.save();
      g.globalAlpha = 0.08;
      g.fillStyle = "rgba(255,255,255,0.06)";
      for (let y = 0; y < bh; y += 4) g.fillRect(0, y, bw, 1);
      g.globalAlpha = 0.05;
      g.strokeStyle = "rgba(255,0,140,0.55)";
      g.strokeRect(1.5, 1.5, bw - 3, bh - 3);
      g.globalAlpha = 0.04;
      g.strokeStyle = "rgba(0,255,255,0.55)";
      g.strokeRect(3.5, 2.5, bw - 6, bh - 6);
      g.restore();
    }

    const screen = makeCanvas(W, H);
    {
      const g = screen.getContext("2d");
      g.scale(scale, scale);
      drawScreenFX(g);
    }

    // Grid + screen FX merged, so the classic look costs one composite, not two.
    const classicTop = makeCanvas(W, H);
    {
      const g = classicTop.getContext("2d");
      g.scale(scale, scale);
      drawGridLines(g);
      drawScreenFX(g);
    }

    staticLayers = { bg, screen, classicTop };
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

  function quakeTransform(ctx, state) {
    const q = state.fx?.quake;
    if (!q || q.trauma <= 0.0001) return;

    const trauma2 = q.trauma * q.trauma;
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

  // Background + locked blocks. Cached as one opaque layer while nothing moves.
  function drawBoard(ctx, state) {
    const fx = state.fx;
    const animating = fx.rowFall.active || fx.moveAnim.active || fx.growAnim.active || !!fx.ghosts;
    if (animating) {
      drawBackground(ctx);
      drawBlockList(ctx, collectBoardBlocks(state, true));
      return;
    }

    const key = styleKey();
    if (boardCache.version !== state.boardVersion || boardCache.styleKey !== key) {
      const g = boardCache.canvas.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, boardCache.canvas.width, boardCache.canvas.height);
      g.setTransform(scale, 0, 0, scale, 0, 0);
      g.imageSmoothingEnabled = false;
      drawBackground(g);
      drawBlockList(g, collectBoardBlocks(state, false));
      boardCache.version = state.boardVersion;
      boardCache.styleKey = key;
    }
    ctx.drawImage(boardCache.canvas, 0, 0, bw, bh);
  }

  function drawGhostPiece(state, ghostY) {
    if (!CONFIG.render.ghost?.enabled) return;
    if (!state.active || state.gameOver) return;
    if (ghostY == null || ghostY === state.active.y) return;

    const mat = getActiveMatrix(state);

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
    // on its last chance (about to top out): it flashes red
    const lc = piece.lastChance;
    if (lc && lc.elapsedMs < lc.durationMs) {
      const a = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(lc.elapsedMs * 0.022));
      bctx.fillStyle = `rgba(255,40,40,${a.toFixed(3)})`;
      for (const b of list) bctx.fillRect(b.px, b.py, cell, cell);
    }
  }

  // Danger: a piece on its last chance. A soft red glow along the top of the board.
  function drawDanger(state) {
    const lc = state.active?.lastChance;
    if (!lc || lc.elapsedMs >= lc.durationMs) return;
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

  // The highlighted ("effected") cells of the falling powerup (at its landing
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
      intensity = 1 + 0.9 * chargeT + 0.35 * Math.sin(chargeT * Math.PI * 6);
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
    bctx.save();
    // combos: each part draws its own kind of highlight over its own area
    const layers = pu.parts && area.parts
      ? pu.parts.map((p, k) => [p, p.type === "phantom" ? { indices: [...pieceCells] } : area.parts[k]])
      : [[pu, area]];
    for (const [lp, la] of layers) {
      for (const i of la.indices) {
        const x = i % cols, y = (i / cols) | 0;
        const isPiece = pieceCells.has(i);
        if (isPiece && lp.type === "expander") continue; // (a fill down to the floor passes through it: nothing to mark)
        const filled = !!board[y][x] && !isPiece;
        const effective = (lp.type === "goo" || lp.type === "phantom") ? true
          : lp.type === "expander" ? (!filled && !isPiece) : filled;
        const dist = Math.hypot(x - centre.x, y - centre.y);
        drawPowerupMark(bctx, lp, x * cell, y * cell, cell, now, x, y, dist, effective, intensity, centre);
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
    const a = 0.85 * (1 - clamp01(f.elapsedMs / f.durationMs));
    bctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    for (const { x, y } of f.cells) bctx.fillRect(x * cell, y * cell, cell, cell);
  }

  // Rings racing out from the centre: a blast's shockwave (and a quick flash), a destroyer's
  // fiery burst, an expander's pulse, a phantom's ripple, a combo's rainbow.
  function drawShockwaves(state, now) {
    const list = state.fx.shockwaves;
    if (!list.length) return;
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
      // a ring of every colour, turning as it spreads
      const segs = 24;
      bctx.lineWidth = Math.max(2, cell * 0.4 * fade);
      for (let k = 0; k < segs; k++) {
        const a0 = (k / segs) * Math.PI * 2 + now * 0.003, a1 = a0 + Math.PI * 2 / segs + 0.02;
        bctx.strokeStyle = hsla((k / segs) * 360, 100, 62, 0.85 * fade);
        bctx.beginPath(); bctx.arc(cx, cy, r, a0, a1); bctx.stroke();
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
    if (sh.trails) drawTrails(state, now);

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

    // blocks that have left the board: pulled into the core, or fading away
    for (const b of sh.blocks) drawGone(b, t, cx, cy, now);

    // destroyers: the core that swallows them, and bursts
    if (sh.pull) drawCore(sh, t, cx, cy, now);
    bctx.restore();
  }

  function drawGone(b, t, cx, cy, now) {
    const local = t - b.delay;
    if (local >= b.dur) return;
    const spr = getSprite(b.paint, b.style);
    const px = b.x * cell, py = b.y * cell;
    if (b.fade) {
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
    if (!sh || !sh.punch) return;
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
      bctx.fillStyle = c.color ?? (c.big ? hsla((now * 0.3) % 360, 100, 68, 1) : "#ffffff");
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

  // The light sweeping along rows as they go (game.js rowClearShow, CONFIG.fx.rowClear): a band
  // brightest at its head, fading behind it, with more to it the more rows go at once.
  function drawRowClears(state, now) {
    const list = state.fx.rowClears;
    if (!list?.length) return;
    const tiers = CONFIG.fx.rowClear.tiers;
    bctx.save();
    bctx.globalCompositeOperation = "lighter";
    for (const c of list) {
      const T = tiers[c.tier] ?? tiers[0], t = c.elapsedMs, mid = bw / 2;
      const colour = (x, a, l = 70) => T.rainbow ? `hsla(${(c.hue + (x / bw) * 300 + t * 0.25) % 360}, 100%, ${l}%, ${a})` : `rgba(255,255,255,${a})`;
      // a soft rainbow over the whole board, rising from the bottom
      if (T.wash) {
        const p = Math.min(1, t / (c.durationMs * 0.75)), yc = bh * (1.15 - 1.3 * p), half = bh * 0.22;
        const a = 0.22 * Math.sin(Math.PI * p);
        const g = bctx.createLinearGradient(0, yc - half, 0, yc + half);
        for (let k = 0; k <= 6; k++) g.addColorStop(k / 6, `hsla(${(c.hue + k * 50) % 360}, 100%, 60%, ${(a * Math.sin(Math.PI * k / 6)).toFixed(3)})`);
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
          g.addColorStop(1, colour(head, (0.75 * fade).toFixed(3), 80));
          bctx.fillStyle = g;
          bctx.fillRect(lo, top, w, h);
          // the head itself, while it's still moving: white hot, with a glow and fringes
          if (s < 1) {
            if (T.glow) { bctx.shadowColor = T.rainbow ? colour(head, 1) : "rgba(180,240,255,1)"; bctx.shadowBlur = T.glow * scale; }
            if (T.chroma) {
              bctx.fillStyle = "rgba(0,255,255,0.45)"; bctx.fillRect(head - 3, top - 1, 3, h + 2);
              bctx.fillStyle = "rgba(255,0,170,0.45)"; bctx.fillRect(head, top - 1, 3, h + 2);
            }
            bctx.fillStyle = `rgba(255,255,255,${(0.95 * fade).toFixed(3)})`;
            bctx.fillRect(head - 1.5, top, 3, h);
            bctx.shadowBlur = 0;
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
            bctx.fillStyle = T.rainbow ? `hsla(${(c.hue + k * 70 + p * 120) % 360}, 100%, 70%, ${a.toFixed(3)})` : `rgba(200,245,255,${a.toFixed(3)})`;
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
    if (!parts.length) return;

    bctx.save();
    for (const glow of [false, true]) {
      bctx.globalCompositeOperation = glow ? "lighter" : "source-over";
      for (const p of parts) {
        if (p.delayMs > 0 || !!p.glow !== glow) continue;
        // (a twinkle comes and goes; the rest fade out)
        const life = clamp01(p.lifeMs / p.maxLifeMs);
        bctx.globalAlpha = p.twinkle ? Math.sin(Math.PI * life) : life;
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
      bctx.drawImage(layers.screen, 0, 0, bw, bh);
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
      for (const f of state.flock ?? []) drawActivePiece(state, f);
      if (state.active) drawActivePiece(state);
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
    bctx.drawImage(enhanced ? layers.screen : layers.classicTop, 0, 0, bw, bh);

    bctx.restore();
  }

  // The next piece, as a silhouette: a cool gradient for an ordinary piece, a powerup in its
  // class's colours (a combo in stripes of each of its parts'), with a bevel round its edges and
  // its cells faintly marked, on a little patch of board; and a soft glow behind it in the colours
  // of its own art, as a hint of what's coming (not in a mode without hints: `glow: false`). A
  // powerup's shell goes rainbow too (index.html, .nextMiniShell.power).
  let nextShape = null, nextGlowOn = true;
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
  // (the colours to fill it with: two ends of a gradient, or stripes)
  function silhouetteFill(shape) {
    const pu = shape.powerup;
    const cls = (t) => CONFIG.fx.powerup.classColours?.[classOf(t)];
    const ends = (pal) => [`hsl(${pal.hues[0]},${pal.sat ?? 100}%,${pal.light ?? 60}%)`, `hsl(${pal.hues[1]},${pal.sat ?? 100}%,${Math.max(30, (pal.light ?? 60) - 8)}%)`];
    if (!pu) return { ends: ["#c9d3ff", "#7a5cff"] };
    const parts = (pu.parts ?? [pu]).map(p => cls(p.type)).filter(Boolean);
    if (parts.length > 1) return { stripes: parts.map(p => ends(p)[0]) };
    if (parts.length === 1) return { ends: ends(parts[0]) };
    return { ends: ["#ff4d6d", "#4dc3ff"] };
  }
  function drawNext(shape = nextShape, pop = false, opts = null) {
    if (pop && shape && shape !== nextShape) { nextCanvas.classList.remove("pop"); void nextCanvas.offsetWidth; nextCanvas.classList.add("pop"); }
    nextShape = shape;
    if (opts && "glow" in opts) nextGlowOn = !!opts.glow;
    nextCanvas.parentElement?.classList.toggle("power", !!shape?.powerup);
    const rect = nextCanvas.getBoundingClientRect(), dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const W = Math.max(1, Math.round(rect.width * dpr)), Hh = Math.max(1, Math.round(rect.height * dpr));
    if (nextCanvas.width !== W || nextCanvas.height !== Hh) { nextCanvas.width = W; nextCanvas.height = Hh; }
    nctx.setTransform(1, 0, 0, 1, 0, 0);
    nctx.clearRect(0, 0, W, Hh);
    if (!shape) return;
    const mat = shape.rotations[0], ph = mat.length, pw = mat[0].length;
    const pad = Math.round(3 * dpr);
    const c = Math.max(1, Math.floor(Math.min((W - pad * 2) / pw, (Hh - pad * 2) / ph, 22 * dpr)));
    const dw = pw * c, dh = ph * c, ox = Math.floor((W - dw) / 2), oy = Math.floor((Hh - dh) / 2);
    const cx = ox + dw / 2, cy = oy + dh / 2, rad = Math.max(dw, dh) * 0.8 + 6 * dpr;
    const line = Math.max(1, Math.round(dpr / 2));
    // a faint grid, lined up with the piece's cells, fading away from it
    nctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let x = ((ox % c) + c) % c; x < W; x += c) nctx.fillRect(x, 0, line, Hh);
    for (let y = ((oy % c) + c) % c; y < Hh; y += c) nctx.fillRect(0, y, W, line);
    const fade = nctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, Hh) * 0.55);
    fade.addColorStop(0, "rgba(0,0,0,1)"); fade.addColorStop(1, "rgba(0,0,0,0)");
    nctx.globalCompositeOperation = "destination-in";
    nctx.fillStyle = fade;
    nctx.fillRect(0, 0, W, Hh);
    nctx.globalCompositeOperation = "source-over";
    // the glow behind it, in its own colours
    if (nextGlowOn) {
      const [r, g, b] = averageColour(shape);
      const glow = nctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      glow.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
      glow.addColorStop(0.55, `rgba(${r},${g},${b},0.22)`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      nctx.fillStyle = glow;
      nctx.fillRect(0, 0, W, Hh);
    }
    const filled = (x, y) => x >= 0 && y >= 0 && x < pw && y < ph && !!mat[y][x];
    // its shadow
    const drop = Math.max(1, Math.round(c * 0.12));
    nctx.fillStyle = "rgba(0,0,0,0.5)";
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) if (mat[y][x]) nctx.fillRect(ox + x * c + drop, oy + y * c + drop, c, c);
    // the silhouette, filled
    const f = silhouetteFill(shape);
    if (f.stripes) {
      // (diagonal stripes, each part's colour in turn, cut to the piece's outline)
      const off = document.createElement("canvas");
      off.width = dw; off.height = dh;
      const o = off.getContext("2d");
      const n = f.stripes.length, band = Math.max(3, Math.round(c * 0.45));
      for (let k = -dh, i = 0; k < dw + dh; k += band, i++) {
        o.fillStyle = f.stripes[i % n];
        o.beginPath(); o.moveTo(k, 0); o.lineTo(k + band, 0); o.lineTo(k + band - dh, dh); o.lineTo(k - dh, dh); o.closePath(); o.fill();
      }
      // (the outline as one path, cut out in one go: cell by cell, each would wipe out the rest)
      o.globalCompositeOperation = "destination-in";
      o.fillStyle = "#fff";
      o.beginPath();
      for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) if (mat[y][x]) o.rect(x * c, y * c, c, c);
      o.fill();
      nctx.drawImage(off, ox, oy);
    } else {
      const grad = nctx.createLinearGradient(ox, oy, ox + dw * 0.4, oy + dh);
      grad.addColorStop(0, f.ends[0]); grad.addColorStop(1, f.ends[1]);
      nctx.fillStyle = grad;
      for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) if (mat[y][x]) nctx.fillRect(ox + x * c, oy + y * c, c, c);
    }
    // its cells, faintly; and a bevel round its edges: light on top and left, dark under and right
    const bev = Math.max(1, Math.round(c * 0.1));
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      if (!mat[y][x]) continue;
      const x0 = ox + x * c, y0 = oy + y * c;
      nctx.fillStyle = "rgba(255,255,255,0.14)";
      if (filled(x + 1, y)) nctx.fillRect(x0 + c - line, y0, line, c);
      if (filled(x, y + 1)) nctx.fillRect(x0, y0 + c - line, c, line);
      nctx.fillStyle = "rgba(255,255,255,0.55)";
      if (!filled(x, y - 1)) nctx.fillRect(x0, y0, c, bev);
      if (!filled(x - 1, y)) nctx.fillRect(x0, y0, bev, c);
      nctx.fillStyle = "rgba(0,0,0,0.35)";
      if (!filled(x, y + 1)) nctx.fillRect(x0, y0 + c - bev, c, bev);
      if (!filled(x + 1, y)) nctx.fillRect(x0 + c - bev, y0, bev, c);
    }
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
