// ============================================================
// RENDERER — draws the board, pieces, powerup highlights and effects
// ============================================================

import { CONFIG } from "../config.js";
import { clamp01, clampN, frac, hash01, easeOutBack, hsla, rgba, isHexColour } from "./util.js";
import { getShapePaint } from "./shapes.js";
import { getActiveMatrix, getGhostDropY } from "./game.js";
import { resolveArea } from "./powerups.js";

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
export function makeShapePreviewCanvas(shape, cellPx = 18, pad = 6) {
  if (!shape) return null;
  const mat = shape.rotations[0];
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
      drawBlockWithPaintStatic(ctx, pad + x * cellPx, pad + y * cellPx, cellPx, getShapePaint(shape, 0, x, y), shape.style ?? {});
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
export function drawPowerupMark(ctx, { type, direction }, px, py, cell, now, x, y, dist, effective, intensity = 1) {
  const o = CONFIG.fx.powerup.overlay;
  const cycle = now / o.periodMs;
  const hue = (now * o.hueDegPerMs + (x + y) * o.hueStepPerCell) % 360;
  const fillA = clamp01((effective ? o.fillAlpha : o.idleFillAlpha) * intensity);
  const markA = clamp01((effective ? o.markAlpha : o.idleMarkAlpha) * intensity);

  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = hsla(hue, 100, 60, fillA);
  ctx.fillRect(px, py, cell, cell);

  // marks glow additively so they stay visible over bright pixel art
  ctx.globalCompositeOperation = "lighter";
  const mark = hsla(hue, 100, 62, markA);
  ctx.strokeStyle = mark;
  ctx.fillStyle = mark;

  if (type === "gravity") {
    drawGravityMark(ctx, px, py, cell, direction, frac(cycle + hash01(x * 7 + y * 13) * 0.35));
  } else if (type === "destroyer") {
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

function boardEdgeMask(board, x, y, pid) {
  const rows = board.length, cols = board[0].length;
  let m = 0;
  if (y === 0 || board[y - 1][x]?.pid !== pid) m |= EDGE_T;
  if (x === cols - 1 || board[y][x + 1]?.pid !== pid) m |= EDGE_R;
  if (y === rows - 1 || board[y + 1][x]?.pid !== pid) m |= EDGE_B;
  if (x === 0 || board[y][x - 1]?.pid !== pid) m |= EDGE_L;
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
  const cols = CONFIG.board.cols;
  const rows = CONFIG.board.rows;
  const bw = cols * cell;
  const bh = rows * cell;

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

  // --- next-piece canvas ---
  const ndpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const nextRect = nextCanvas.getBoundingClientRect();
  const nextW = Math.max(1, Math.round(nextRect.width));
  const nextH = Math.max(1, Math.round(nextRect.height));

  nextCanvas.width = nextW * ndpr;
  nextCanvas.height = nextH * ndpr;

  const nctx = nextCanvas.getContext("2d");
  nctx.setTransform(1, 0, 0, 1, 0, 0);
  nctx.scale(ndpr, ndpr);

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

    const t = clamp01(rf.elapsedMs / rf.durationMs);
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
        if (b.s < 1) continue;
        ctx.rect(b.px + so, b.py + so, cell, cell);
      }
      ctx.fill();
    }

    for (const b of list) {
      const spr = getSprite(b.paint, b.style);
      if (b.s >= 1) {
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

        if (animated) {
          const idx = y * cols + x;
          if (mv.active) {
            const m = mv.byIndex.get(idx);
            if (m) {
              const t = clamp01(mv.elapsedMs / m.dur);
              const k = 1 - t * t; // accelerate like falling
              px += m.ox * cell * k;
              py += m.oy * cell * k;
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
          px, py, s,
          paint: c.paint,
          style: c.style,
          mask: enhanced ? boardEdgeMask(board, x, y, c.pid) : 0,
        });
      }
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
    const animating = fx.rowFall.active || fx.moveAnim.active || fx.growAnim.active;
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

  function drawActivePiece(state) {
    const { shape, rotIdx } = state.active;
    const mat = getActiveMatrix(state);
    const enhanced = isEnhanced();
    const list = [];

    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[0].length; x++) {
        if (!mat[y][x]) continue;
        const by = state.active.y + y;
        if (by < 0) continue;
        list.push({
          px: (state.active.x + x) * cell,
          py: by * cell,
          s: 1,
          paint: getShapePaint(shape, rotIdx, x, y),
          style: shape.style,
          mask: enhanced ? matrixEdgeMask(mat, x, y) : 0,
        });
      }
    }
    drawBlockList(bctx, list);
  }

  // Animated rainbow outline around a powerup piece (falling, or charging).
  function drawPowerupShimmer(cells, now, boost = 0) {
    // cells: [{x, y, mask}] in board coords
    const alpha = clamp01(CONFIG.fx.powerup.shimmerAlpha + boost * 0.1);
    bctx.save();
    bctx.lineWidth = 1.5;
    for (const { x, y, mask } of cells) {
      const px = x * cell, py = y * cell;
      const hue = (now * 0.25 + (x + y) * 40) % 360;
      bctx.strokeStyle = hsla(hue, 100, 65, alpha);
      bctx.beginPath();
      if (mask & EDGE_T) { bctx.moveTo(px, py + 0.75); bctx.lineTo(px + cell, py + 0.75); }
      if (mask & EDGE_B) { bctx.moveTo(px, py + cell - 0.75); bctx.lineTo(px + cell, py + cell - 0.75); }
      if (mask & EDGE_L) { bctx.moveTo(px + 0.75, py); bctx.lineTo(px + 0.75, py + cell); }
      if (mask & EDGE_R) { bctx.moveTo(px + cell - 0.75, py); bctx.lineTo(px + cell - 0.75, py + cell); }
      bctx.stroke();
      if (boost > 0) {
        bctx.fillStyle = hsla(hue, 100, 70, 0.25 * boost);
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
        overlayCache.area = resolveArea(pu.areaRotations[a.rotIdx], a.x, ghostY, cols, rows);
      }
      area = overlayCache.area;

      const mat = getActiveMatrix(state);
      pieceCells = new Set();
      for (let y = 0; y < mat.length; y++) {
        for (let x = 0; x < mat[0].length; x++) {
          if (mat[y][x] && ghostY + y >= 0) pieceCells.add((ghostY + y) * cols + a.x + x);
        }
      }
      centre = { x: a.x + (mat[0].length - 1) / 2, y: ghostY + (mat.length - 1) / 2 };
    } else {
      return;
    }

    const board = state.board;
    bctx.save();
    for (const i of area.indices) {
      const x = i % cols, y = (i / cols) | 0;
      const isPiece = pieceCells.has(i);
      const filled = !!board[y][x] && !isPiece;
      const effective = pu.type === "expander" ? (!filled && !isPiece) : filled;
      const dist = Math.hypot(x - centre.x, y - centre.y);
      drawPowerupMark(bctx, pu, x * cell, y * cell, cell, now, x, y, dist, effective, intensity);
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

  // Floating text: "DOUBLE!", "+24".
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
      const size = Math.max(1, (c.big ? 15 : 11) * pop);
      const text = c.text.toUpperCase();
      bctx.font = `${size.toFixed(1)}px PressStart2P, ui-monospace, monospace`;
      const half = bctx.measureText(text).width / 2 + 4;
      const x = clampN(c.x * cell, half, bw - half);
      const y = clampN(c.y * cell - t * cell * 1.6, size, bh - size);
      bctx.globalAlpha = alpha;
      bctx.lineWidth = 4;
      bctx.strokeStyle = "rgba(0,0,0,0.85)";
      bctx.strokeText(text, x, y);
      bctx.fillStyle = c.big ? hsla((now * 0.3) % 360, 100, 68, 1) : "#ffffff";
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

  function drawParticles(state) {
    const parts = state.fx.particles;
    if (!parts.length) return;

    bctx.save();
    for (const p of parts) {
      bctx.globalAlpha = clamp01(p.lifeMs / p.maxLifeMs);
      bctx.fillStyle = p.color;
      bctx.fillRect(p.x, p.y, p.size, p.size);
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

    const hide = state.paused && CONFIG.pause.hideShapes;

    if (hide) {
      drawBackground(bctx);
    } else {
      drawBoard(bctx, state);

      const ghostY = state.active ? getGhostDropY(state) : null;
      const ghostBehind = CONFIG.render.ghost?.drawBehindActive ?? true;

      if (state.active && ghostBehind) drawGhostPiece(state, ghostY);
      if (state.active) drawActivePiece(state);
      if (state.active && !ghostBehind) drawGhostPiece(state, ghostY);

      drawPowerupOverlay(state, ghostY, now);

      if (state.active?.shape.powerup) {
        drawPowerupShimmer(activeShimmerCells(state), now);
      } else if (state.effect?.phase === "charge") {
        const e = state.effect;
        const cells = e.placed
          .filter(({ x, y }) => state.board[y][x]?.pid === e.pid)
          .map(({ x, y }) => ({ x, y, mask: boardEdgeMask(state.board, x, y, e.pid) }));
        drawPowerupShimmer(cells, now, clamp01(e.elapsedMs / e.durationMs));
      }

      drawFlash(state);
    }

    drawParticles(state);
    if (!hide) drawCallouts(state, now);
    bctx.drawImage(enhanced ? layers.screen : layers.classicTop, 0, 0, bw, bh);

    bctx.restore();
  }

  function drawNextSilhouette(shape) {
    const rect = nextCanvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));

    nctx.clearRect(0, 0, w, h);
    if (!shape) return;

    const mat = shape.rotations[0];
    const ph = mat.length;
    const pw = mat[0].length;

    const pad = 18;
    const availW = Math.max(1, w - pad * 2);
    const availH = Math.max(1, h - pad * 2);
    const pcell = Math.max(6, Math.floor(Math.min(availW / pw, availH / ph)));

    const drawW = pw * pcell;
    const drawH = ph * pcell;
    const ox = Math.floor((w - drawW) / 2);
    const oy = Math.floor((h - drawH) / 2);

    nctx.save();
    nctx.globalAlpha = 1;
    if (shape.powerup) {
      // Powerups get a rainbow silhouette so you can see one coming.
      const grad = nctx.createLinearGradient(ox, oy, ox + drawW, oy + drawH);
      ["#ff4d6d", "#ffb84d", "#f9ff4d", "#4dff88", "#4dc3ff", "#b44dff"].forEach((c, i, arr) =>
        grad.addColorStop(i / (arr.length - 1), c));
      nctx.fillStyle = grad;
    } else {
      nctx.fillStyle = "#a83deb";
    }

    nctx.beginPath();
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        if (!mat[y][x]) continue;
        nctx.rect(ox + x * pcell, oy + y * pcell, pcell, pcell);
      }
    }
    nctx.fill();
    nctx.restore();
  }

  return { draw, drawNextSilhouette };
}
