// ============================================================
// MODE DEMOS — a little looping game of each mode, for How to play
// ============================================================
// A tiny board where a few real pieces come down the way they do in that mode: Classic's
// friendly pieces with a powerup now and then, Extreme's awkward ones and nothing to help,
// God mode's giants and powerups one after another, Zen's slow pieces gliding to their places,
// Turbo zen's quick fill to the brink and the big powerup that brings it all down. It places
// them itself (a simple autopilot) and runs the real powerup effects (computeEffect).

import { resolvePowerupArea, computeEffect } from "./powerups.js";
import { getShapePaint } from "./shapes.js";
import { drawBlockWithPaintStatic, drawPowerupMark } from "./render.js";
import { makeRng, clamp01 } from "./util.js";

const COLS = 9, ROWS = 12;

// How each mode goes: the levels its pieces come from, how often a powerup, how fast a piece
// moves over and falls (ms a step), and turbo zen's fill to the brink.
const MODES = {
  normal: { levels: [1, 1, 2], powerupEvery: [4, 6], puKind: "helpful", moveMs: 110, fallMs: 70 },
  extreme: { levels: [2, 3, 3, 4], powerupEvery: null, moveMs: 80, fallMs: 50 },
  god: { levels: [3, 4, 5], powerupEvery: [1, 2], puKind: "big", moveMs: 90, fallMs: 60 },
  zen: { levels: [0, 1, 1], powerupEvery: [7, 10], puKind: "helpful", moveMs: 200, fallMs: 150, glide: true },
  turbo: { levels: [1, 2, 2, 3], powerupEvery: null, moveMs: 0, fallMs: 14, buildTo: ROWS - 3, puKind: "big" },
};

const fits = (s) => s.rotations.every(m => m[0].length <= COLS - 1 && m.length <= 5);
const blocksOf = (s) => s.rotations[0].flat().filter(Boolean).length;

export function createModeDemo(canvas, mode, { shapes, powerups, cell = 12, seed = 1 } = {}) {
  const cfg = MODES[mode] ?? MODES.normal;
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  canvas.width = COLS * cell * dpr;
  canvas.height = ROWS * cell * dpr;
  canvas.style.width = `${COLS * cell}px`;
  canvas.style.height = `${ROWS * cell}px`;
  const ctx = canvas.getContext("2d");
  const rng = makeRng(seed * 7919 + mode.length);
  const pick = (list) => list[Math.floor(rng() * list.length)];

  // the pieces it can use: small enough for the little board
  const byLevel = new Map();
  for (const s of shapes) {
    const L = s.difficulty ?? 1;
    if ((s.frequency ?? 1) <= 0 || L >= 6 || !fits(s) || s.remix) continue;
    if (!byLevel.has(L)) byLevel.set(L, []);
    byLevel.get(L).push(s);
  }
  const live = powerups.filter(p => (p.frequency ?? 1) > 0 && !p.powerup.bad && !p.powerup.setOnly && fits(p)
    && ["destroyer", "gravity", "expander"].includes(p.powerup.type));
  const helpful = live.filter(p => (p.powerup.help ?? 0) >= 4);
  const big = live.filter(p => blocksOf(p) <= 4 && ((p.powerup.help ?? 0) >= 5));
  const puPool = cfg.puKind === "big" && big.length ? big : helpful.length ? helpful : live;

  let board, cur, untilPowerup, flash, burst, clearing, topped;
  function reset() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    cur = null; flash = []; burst = null; clearing = null; topped = 0;
    untilPowerup = cfg.powerupEvery ? Math.round(cfg.powerupEvery[0] + rng() * (cfg.powerupEvery[1] - cfg.powerupEvery[0])) : Infinity;
  }
  reset();

  const collides = (mat, x, y) => {
    for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
      if (!mat[j][i]) continue;
      const bx = x + i, by = y + j;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
    return false;
  };
  const dropY = (mat, x) => { let y = -mat.length; if (collides(mat, x, y)) return null; while (!collides(mat, x, y + 1)) y++; return y; };
  const stackTop = () => { for (let y = 0; y < ROWS; y++) if (board[y].some(Boolean)) return y; return ROWS; };

  // where the autopilot puts it: low and tidy, rows finished (a powerup: where it does the most)
  function bestPlace(shape) {
    let best = null;
    for (let r = 0; r < shape.rotations.length; r++) {
      const mat = shape.rotations[r];
      for (let x = 0; x + mat[0].length <= COLS; x++) {
        const y = dropY(mat, x);
        if (y == null || y < 0) continue;
        const b = board.map(row => row.map(Boolean));
        for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) if (mat[j][i]) b[y + j][x + i] = true;
        let score;
        if (shape.powerup) {
          const area = resolvePowerupArea(shape.powerup, r, x, y, COLS, ROWS);
          let hit = 0;
          for (const k of area.indices) { const yy = (k / COLS) | 0, xx = k % COLS; if (shape.powerup.type === "expander" ? !b[yy][xx] && yy > y : b[yy][xx]) hit++; }
          score = hit + y * 0.2;
        } else {
          let lines = 0, holes = 0, agg = 0;
          for (let yy = 0; yy < ROWS; yy++) if (b[yy].every(Boolean)) lines++;
          for (let xx = 0; xx < COLS; xx++) { let seen = false; for (let yy = 0; yy < ROWS; yy++) { if (b[yy][xx]) { if (!seen) agg += ROWS - yy; seen = true; } else if (seen) holes++; } }
          score = lines * 3 - holes * 2.2 - agg * 0.3 + rng() * 0.6;
        }
        if (!best || score > best.score) best = { r, x, y, score };
      }
    }
    return best;
  }

  function nextShape() {
    // turbo zen: built up to the brink, the big one that brings it down
    if (cfg.buildTo && ROWS - stackTop() >= cfg.buildTo && puPool.length) return pick(puPool);
    if (--untilPowerup <= 0 && puPool.length) {
      untilPowerup = Math.round(cfg.powerupEvery[0] + rng() * (cfg.powerupEvery[1] - cfg.powerupEvery[0]));
      return pick(puPool);
    }
    for (let tries = 0; tries < 6; tries++) {
      const list = byLevel.get(pick(cfg.levels));
      if (list?.length) return pick(list);
    }
    return pick(byLevel.get(1) ?? [...byLevel.values()][0]);
  }

  function spawn(now) {
    const shape = nextShape();
    const place = bestPlace(shape);
    if (!place) { topped = now; return; }
    const mat0 = shape.rotations[0];
    const startX = cfg.moveMs ? Math.max(0, Math.min(COLS - mat0[0].length, Math.floor((COLS - mat0[0].length) / 2))) : place.x;
    cur = { shape, place, rot: cfg.moveMs ? 0 : place.r, x: startX, y: -shape.rotations[place.r].length, t: now, phase: cfg.moveMs ? "move" : "fall" };
  }

  function land(now) {
    const { shape, place } = cur, mat = shape.rotations[place.r];
    const placed = [];
    for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
      if (!mat[j][i] || place.y + j < 0) continue;
      board[place.y + j][place.x + i] = { paint: getShapePaint(shape, place.r, i, j), style: shape.style };
      placed.push({ x: place.x + i, y: place.y + j });
    }
    if (shape.powerup) {
      const pu = shape.powerup;
      const area = resolvePowerupArea(pu, place.r, place.x, place.y, COLS, ROWS);
      const fx = computeEffect(board, pu, {
        area, placed, pid: null, centre: { x: place.x + (mat[0].length - 1) / 2, y: place.y + (mat.length - 1) / 2 },
        cols: COLS, rows: ROWS, rng, makeFill: () => ({ paint: pu.fillPaint, style: pu.fillStyle }), at: { rot: place.r, x: place.x, y: place.y },
      });
      burst = { at: now, cls: pu.cls, cells: [...fx.destroyed, ...fx.filled].map(c => ({ x: c.x, y: c.y })) };
    }
    cur = null;
    const full = [];
    for (let y = 0; y < ROWS; y++) if (board[y].every(Boolean)) full.push(y);
    if (full.length) clearing = { at: now, rows: full };
  }

  function step(now) {
    if (topped) {
      if (now - topped > 650) reset();
      return;
    }
    if (clearing) {
      if (now - clearing.at < 260) return;
      for (const y of clearing.rows) { board.splice(y, 1); board.unshift(Array(COLS).fill(null)); }
      clearing = null;
    }
    if (burst && now - burst.at < 380) return; // (the powerup's moment)
    if (!cur) {
      if (stackTop() <= 1) { topped = now; return; }
      spawn(now);
      return;
    }
    if (cur.phase === "move") {
      // turned, then over a column at a time (Zen glides there, slowly)
      if (now - cur.t < cfg.moveMs) return;
      cur.t = now;
      if (cur.rot !== cur.place.r) cur.rot = cur.place.r;
      else if (cur.x !== cur.place.x) cur.x += Math.sign(cur.place.x - cur.x);
      else cur.phase = "fall";
      if (!cfg.glide && cur.phase === "move" && cur.rot === cur.place.r && cur.x === cur.place.x) cur.phase = "fall";
      if (cur.y < -1) cur.y++; // (it comes into view as it goes)
      return;
    }
    // falling, a row at a time, until it's there
    while (now - cur.t >= cfg.fallMs) {
      cur.t += cfg.fallMs;
      if (cur.y < cur.place.y) cur.y++;
      else { land(now); return; }
    }
  }

  function draw(now) {
    step(now);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#05050c";
    ctx.fillRect(0, 0, COLS * cell, ROWS * cell);
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = board[y][x];
      if (c) drawBlockWithPaintStatic(ctx, x * cell, y * cell, cell, c.paint, c.style ?? {});
    }
    // the falling piece, and a powerup's highlight where it will land
    if (cur) {
      const { shape } = cur, mat = shape.rotations[cur.rot];
      if (shape.powerup && cur.rot === cur.place.r && cur.x === cur.place.x) {
        const area = resolvePowerupArea(shape.powerup, cur.place.r, cur.place.x, cur.place.y, COLS, ROWS);
        const centre = { x: cur.place.x + (mat[0].length - 1) / 2, y: cur.place.y + (mat.length - 1) / 2 };
        for (const i of area.indices) {
          const x = i % COLS, y = (i / COLS) | 0, filled = !!board[y][x];
          const eff = shape.powerup.type === "expander" ? !filled : filled;
          drawPowerupMark(ctx, shape.powerup, x * cell, y * cell, cell, now, x, y, Math.hypot(x - centre.x, y - centre.y), eff, 1, centre);
        }
      }
      for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
        if (!mat[j][i] || cur.y + j < 0) continue;
        drawBlockWithPaintStatic(ctx, (cur.x + i) * cell, (cur.y + j) * cell, cell, getShapePaint(shape, cur.rot, i, j), shape.style);
      }
    }
    // rows going, a powerup going off, the top reached
    if (clearing) {
      const a = 0.85 * (1 - clamp01((now - clearing.at) / 260));
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      for (const y of clearing.rows) ctx.fillRect(0, y * cell, COLS * cell, cell);
    }
    if (burst) {
      const t = clamp01((now - burst.at) / 380);
      if (t < 1) {
        ctx.fillStyle = burst.cls === "expander" ? `rgba(120,255,180,${(0.6 * (1 - t)).toFixed(3)})` : `rgba(255,255,255,${(0.75 * (1 - t)).toFixed(3)})`;
        for (const c of burst.cells) ctx.fillRect(c.x * cell, c.y * cell, cell, cell);
      } else burst = null;
    }
    if (topped) {
      ctx.fillStyle = `rgba(255,60,90,${(0.45 * (1 - clamp01((now - topped) / 650))).toFixed(3)})`;
      ctx.fillRect(0, 0, COLS * cell, ROWS * cell);
    }
  }

  return { draw };
}
