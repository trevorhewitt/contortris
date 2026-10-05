// ============================================================
// POWERUP DEMOS — a little looping animation of a powerup doing its thing,
// used by the intro screens, the pause-menu help and How to play.
// Runs the real effect code (computeEffect) on a tiny board.
// ============================================================

import { clamp01, easeOutBack, makeRng } from "./util.js";
import { resolvePowerupArea, computeEffect, phantomLandingY } from "./powerups.js";
import { getShapePaint } from "./shapes.js";
import { drawBlockWithPaintStatic, drawPowerupMark } from "./render.js";

const COLS = 9, ROWS = 8;
const PALETTE = ["#e8794a", "#5fb0e8", "#9ad45b", "#e85fa8", "#e8d35f", "#9a7be8", "#5fd4c4", "#d45f5f"];
const T_FALL = 1000, T_CHARGE = 300, T_EFFECT = 850, T_HOLD = 1300;
const LOOP = T_FALL + T_CHARGE + T_EFFECT + T_HOLD;

function filler(seed) {
  const c = PALETTE[seed % PALETTE.length];
  return { paint: c, style: { baseColor: c } };
}

// A messy little stack that shows the class off.
function makeBoard(shape, rng) {
  const b = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const type = shape.powerup.type;
  for (let y = ROWS - 4; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const depth = ROWS - y; // 1 = bottom row
      let p = depth <= 2 ? 0.85 : 0.55;
      if (type === "goo" && x >= 3 && x <= 5 && depth >= 2) p = 0.05; // a valley to pour into
      if (rng() < p) b[y][x] = filler(x * 3 + y * 5);
    }
  }
  // floating lumps with air pockets under them (gravity / goo / phantoms love these)
  const gravityish = type === "gravity" || (type === "combo" && shape.powerup.parts?.some(p => p.type === "gravity"));
  if (gravityish || type === "phantom" || type === "goo") {
    for (const x of [1, 2, 6, 7]) { b[ROWS - 4][x] = filler(x + 11); b[ROWS - 3][x] = null; }
  }
  if (type === "phantom") {
    // a sealed gap shaped exactly like the phantom, under a solid lid
    const mat = shape.rotations[0];
    const gx = Math.max(0, Math.floor((COLS - mat[0].length) / 2));
    for (let y = ROWS - 4; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!b[y][x]) b[y][x] = filler(x + y);
    for (let y = 0; y < mat.length; y++) for (let x = 0; x < mat[0].length; x++) {
      if (mat[y][x]) b[ROWS - 1 - (mat.length - 1) + y][gx + x] = null;
    }
  }
  return b;
}

function landingY(board, shape, x) {
  const mat = shape.rotations[0];
  if (shape.powerup.type === "phantom") return phantomLandingY(board, x, mat);
  let y = -mat.length;
  const hits = (yy) => {
    for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
      if (!mat[j][i]) continue;
      const bx = x + i, by = yy + j;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
    return false;
  };
  if (hits(y)) return null;
  while (!hits(y + 1)) y++;
  return y;
}

// Simulate the powerup landing at column x; returns everything needed to animate it.
function simulate(board, shape, x) {
  const pu = shape.powerup;
  const mat = shape.rotations[0];
  const y = landingY(board, shape, x);
  if (y === null) return null;
  const placed = [];
  const after = board.map(r => r.slice());
  for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
    if (!mat[j][i] || y + j < 0) continue;
    placed.push({ x: x + i, y: y + j });
    after[y + j][x + i] = { paint: getShapePaint(shape, 0, i, j), style: shape.style, pid: -1 };
  }
  const centre = { x: x + (mat[0].length - 1) / 2, y: y + (mat.length - 1) / 2 };
  const area = resolvePowerupArea(pu, 0, x, y, COLS, ROWS);
  const fx = computeEffect(after, pu, {
    area, placed, pid: -1, centre, cols: COLS, rows: ROWS, rng: makeRng(7),
    makeFill: () => ({ paint: pu.fillPaint, style: pu.fillStyle }),
  });
  let preview = area.indices;
  const layers = pu.parts && area.parts ? pu.parts.map((p, k) => [p, area.parts[k].indices]) : null;
  if (pu.type === "goo") preview = fx.filled.map(f => f.y * COLS + f.x);
  if (pu.type === "phantom") preview = placed.map(p => p.y * COLS + p.x);
  const score = fx.destroyed.length * 2 + fx.moves.length + fx.filled.length + (pu.type === "phantom" ? y : 0);
  return { x, y, placed, centre, fx, after, preview, layers, score };
}

export function createDemo(canvas, shape, { cell = 16 } = {}) {
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  canvas.width = COLS * cell * dpr;
  canvas.height = ROWS * cell * dpr;
  canvas.style.width = `${COLS * cell}px`;
  canvas.style.height = `${ROWS * cell}px`;
  const ctx = canvas.getContext("2d");

  const rng = makeRng(shape.id.length * 31 + 7);
  const board = makeBoard(shape, rng);
  let best = null;
  for (let x = -2; x < COLS; x++) {
    const sim = simulate(board, shape, x);
    if (sim && (!best || sim.score > best.score)) best = sim;
  }
  const destroyedSet = new Set(best ? best.fx.destroyed.map(d => d.y * COLS + d.x) : []);
  const movedTo = new Map(best ? best.fx.moves.map(m => [m.toY * COLS + m.toX, m]) : []);
  const filledAt = new Map(best ? best.fx.filled.map(f => [f.y * COLS + f.x, f]) : []);
  const consumed = !!shape.powerup.consume;
  const mat = shape.rotations[0];

  function cellAt(b, x, y) { return b[y]?.[x] ?? null; }

  function drawCell(c, px, py, s = 1) {
    if (!c) return;
    const d = cell * s;
    drawBlockWithPaintStatic(ctx, px + (cell - d) / 2, py + (cell - d) / 2, d, c.paint, c.style ?? {});
  }

  function drawPiece(y, alpha = 1) {
    ctx.globalAlpha = alpha;
    for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
      if (!mat[j][i]) continue;
      drawBlockWithPaintStatic(ctx, (best.x + i) * cell, (y + j) * cell, cell, getShapePaint(shape, 0, i, j), shape.style);
    }
    ctx.globalAlpha = 1;
  }

  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#05050c";
    ctx.fillRect(0, 0, COLS * cell, ROWS * cell);
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    if (!best) return;

    const t = now % LOOP;
    const pu = shape.powerup;
    const phantom = pu.type === "phantom";

    if (t < T_FALL + T_CHARGE) {
      // before: the board as it was, the piece falling, the highlight at its landing spot
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawCell(board[y][x], x * cell, y * cell);
      const charge = t > T_FALL ? (t - T_FALL) / T_CHARGE : 0;
      ctx.save();
      for (const [lp, idx] of best.layers ?? [[pu, best.preview]]) {
        for (const i of idx) {
          const x = i % COLS, y = (i / COLS) | 0;
          const filled = !!board[y][x];
          const eff = (lp.type === "goo" || lp.type === "phantom") ? true : lp.type === "expander" ? !filled : filled;
          drawPowerupMark(ctx, lp, x * cell, y * cell, cell, now, x, y, Math.hypot(x - best.centre.x, y - best.centre.y), eff, 1 + charge, best.centre);
        }
      }
      ctx.restore();
      const fy = t < T_FALL ? -mat.length + (best.y + mat.length) * (t / T_FALL) : best.y;
      drawPiece(fy, phantom ? 0.75 : 1);
      if (charge > 0) {
        ctx.fillStyle = `rgba(255,255,255,${(0.5 * charge * charge).toFixed(3)})`;
        for (const p of best.placed) ctx.fillRect(p.x * cell, p.y * cell, cell, cell);
      }
      return;
    }

    // after: animate into the result board
    const u = clamp01((t - T_FALL - T_CHARGE) / T_EFFECT);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      if (destroyedSet.has(i) && u < 1) {
        // destroyed: flash and shrink away
        const c = cellAt(board, x, y);
        drawCell(c, x * cell, y * cell, 1 - u);
        ctx.fillStyle = `rgba(255,255,255,${(0.8 * (1 - u)).toFixed(3)})`;
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
      const c = best.after[y][x];
      if (!c) continue;
      const m = movedTo.get(i);
      const f = filledAt.get(i);
      if (m) {
        let ox, oy;
        if (m.viaX != null && (m.viaX !== m.toX || m.viaY !== m.toY)) {
          if (u < 0.4) { const k = 1 - Math.pow(1 - u / 0.4, 2); ox = m.fromX + (m.viaX - m.fromX) * k; oy = m.fromY + (m.viaY - m.fromY) * k; }
          else { const k = (u - 0.4) / 0.6; ox = m.viaX; oy = m.viaY + (m.toY - m.viaY) * k * k; }
        } else {
          const k = u * u; ox = m.fromX + (m.toX - m.fromX) * k; oy = m.fromY + (m.toY - m.fromY) * k;
        }
        drawCell(c, ox * cell, oy * cell);
      } else if (f && pu.type === "goo") {
        const k = u * u;
        drawCell(c, (f.fromX + (f.x - f.fromX) * k) * cell, (f.fromY + (f.y - f.fromY) * k) * cell);
      } else if (f) {
        const d = Math.hypot(x - best.centre.x, y - best.centre.y);
        const s = clamp01((u - d * 0.08) / 0.5);
        if (s > 0) drawCell(c, x * cell, y * cell, s >= 1 ? 1 : easeOutBack(s));
      } else {
        drawCell(c, x * cell, y * cell);
      }
    }
    if (consumed && u < 0.3) {
      ctx.fillStyle = `rgba(255,255,255,${(0.7 * (1 - u / 0.3)).toFixed(3)})`;
      for (const p of best.placed) ctx.fillRect(p.x * cell, p.y * cell, cell, cell);
    }
  }

  return { draw };
}

// Animate a set of demos while `isActive()` is true.
export function runDemos(demos, isActive) {
  let raf = 0;
  const loop = (now) => {
    if (!isActive()) return;
    for (const d of demos) d.draw(now);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}
