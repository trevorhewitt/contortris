// ============================================================
// GAME CORE (no DOM — runs in the browser and in Node tests)
// ============================================================
// Talks to the outside world through events: on(state, fn) receives (type, data).
//   "start"          { mode }
//   "reset"          {}
//   "spawn"          { shape, next }            a new piece is falling
//   "next"           { next }                   the preview changed (debug)
//   "lock"           { shape, pid, cells, drops, inside(zone) }
//   "rowsDestroyed"  { count, source }          source "clear" (line clear) or "powerup"
//   "boardCleared"   {}
//   "levelUp"        { level }
//   "powerupCharge"  { shape }
//   "powerupFire"    { shape, type, affected }  affected = blocks destroyed/moved/filled
//   "gameOver"       { killer, drops, score }

import { CONFIG } from "../config.js";
import { clamp01, lerp } from "./util.js";
import { getShapePaint } from "./shapes.js";
import { initPieceSelectionState, selectPiece } from "./selection.js";
import { resolveArea, resolvePowerupArea, collapseRows, computeEffect, phantomLandingY, isPhantomPowerup, rollScatter } from "./powerups.js";

/* =========================
   State
   ========================= */

export function createEmptyBoard(cols, rows) {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

export function createGameState(shapes, powerups, { rng = Math.random } = {}) {
  const state = {
    allShapes: shapes,
    allPowerups: powerups,

    // Pools for the current mode (see configureMode)
    mode: CONFIG.defaultMode,
    shapes,
    powerups: [],
    idToShape: new Map(),

    rng,
    listeners: [],

    board: createEmptyBoard(CONFIG.board.cols, CONFIG.board.rows),
    boardVersion: 0,
    nextPid: 1, // piece-instance id stored on each locked cell
    // pid -> { shape, rotIdx, x, y, cells: [{x, y}], total, intact }
    // "intact" = the piece hasn't been cut, shifted apart or slid out of shape,
    // so its zones (e.g. the inside of a mouth) are still where they should be.
    instances: new Map(),

    active: null,
    next: null,
    running: false,
    paused: false,
    gameOver: false,

    score: 0,
    lines: 0,            // rows cleared by filling them (drives the level)
    rowsDestroyed: 0,    // rows cleared + rows collapsed by powerups
    blocksDestroyed: 0,
    // dev mode overrides for the powerup scheduler: ids that never turn up, chance multiplier
    devPowerups: { disabled: new Set(), rate: 1 },
    drops: 0,            // pieces locked
    level: 1,

    dropMs: CONFIG.timing.baseDropMs,
    dropAccum: 0,

    softDropping: false,

    debug: false,
    touch: { zone: null },

    locking: false,
    lockElapsed: 0,

    lastInputType: "keyboard",
    lastInputAt: 0,

    tapRepeatTimer: null,
    tapRepeatInterval: null,

    // A powerup that has locked and is playing its effect (no active piece meanwhile)
    effect: null,

    lastLockedShape: null,
    gameOverInfo: {
      pieceName: "",
      shape: null,
    },

    fx: {
      particles: [],
      rowFall: {
        active: false,
        elapsedMs: 0,
        durationMs: CONFIG.fx.lineClear.boardFallAnimMs,
        rowDropDistances: Array(CONFIG.board.rows).fill(0),
      },
      // Gravity powerup: blocks slide from old to new positions
      moveAnim: { active: false, elapsedMs: 0, durationMs: 0, byIndex: new Map() },
      // Expander powerup: filled cells pop in
      growAnim: { active: false, elapsedMs: 0, durationMs: 0, growMs: 0, byIndex: new Map() },
      // Destroyer powerup: white flash where blocks were
      flash: { active: false, elapsedMs: 0, durationMs: 0, cells: [] },
      // Floating text ("DOUBLE!", "+24")
      callouts: [],
      shockwaves: [],  // expanding rings where a blast went off
      quake: {
        trauma: 0,
        seed: Math.random() * 1000,
      },
      gameOverBackdrop: {
        cut: 0,          // the renderer re-snapshots the board whenever this changes
        elapsedMs: 0,
        currentAngle: 0,
        dirX: 1,
        dirY: 0.3,
        offsetX: 0,
        offsetY: 0,
      },
    },
  };
  configureMode(state, CONFIG.defaultMode);
  initPieceSelectionState(state);
  return state;
}

// False for powerups whose type is switched off (CONFIG.assist.powerups.disabledTypes),
// including combos with a part of that type.
export function isPowerupEnabled(p) {
  const off = CONFIG.assist.powerups.disabledTypes ?? [];
  return !off.includes(p.powerup.type) && !(p.powerup.parts ?? []).some(part => off.includes(part.type));
}

export function configureMode(state, modeId) {
  state.mode = CONFIG.modes[modeId] ? modeId : CONFIG.defaultMode;
  const mode = CONFIG.modes[state.mode];
  // Easy mode: no giant (difficulty 4/5) pieces
  state.shapes = mode.giants === false ? state.allShapes.filter(s => (s.difficulty ?? 1) < 4) : state.allShapes;
  // switched-off powerup types (and combos using them) never turn up
  state.powerups = mode.powerups ? state.allPowerups.filter(isPowerupEnabled) : [];
  state.idToShape = new Map();
  for (const s of [...state.shapes, ...state.powerups]) state.idToShape.set(s.id, s);
}

// The pieces that can appear in the current mode.
export function currentPool(state) {
  return [...state.shapes, ...state.powerups].filter(s => (s.frequency ?? 1) > 0);
}

/* =========================
   Events
   ========================= */

export function on(state, fn) {
  state.listeners.push(fn);
  return () => { state.listeners = state.listeners.filter(f => f !== fn); };
}

function emit(state, type, data = {}) {
  for (const fn of state.listeners) {
    try { fn(type, data, state); } catch (e) { console.error(`[event ${type}]`, e); }
  }
}

// Every change to state.board must call this (the renderer caches the board).
export function markBoardDirty(state) {
  state.boardVersion++;
}

/* =========================
   Runs
   ========================= */

// Clears everything back to a fresh, not-yet-started board.
export function resetGame(state) {
  state.board = createEmptyBoard(CONFIG.board.cols, CONFIG.board.rows);
  markBoardDirty(state);
  state.instances.clear();
  state.active = null;
  state.next = null;
  state.effect = null;
  state.running = false;
  state.paused = false;
  state.gameOver = false;
  state.score = 0;
  state.lines = 0;
  state.rowsDestroyed = 0;
  state.blocksDestroyed = 0;
  state.drops = 0;
  state.level = 1;
  state.dropMs = CONFIG.timing.baseDropMs;
  state.dropAccum = 0;
  state.softDropping = false;
  cancelLock(state);

  state.lastLockedShape = null;
  state.gameOverInfo.pieceName = "";
  state.gameOverInfo.shape = null;

  const fx = state.fx;
  fx.particles.length = 0;
  fx.callouts.length = 0;
  fx.shockwaves.length = 0;
  fx.rowFall.active = false;
  fx.rowFall.elapsedMs = 0;
  fx.rowFall.rowDropDistances = Array(CONFIG.board.rows).fill(0);
  fx.moveAnim.active = false;
  fx.growAnim.active = false;
  fx.flash.active = false;
  fx.quake.trauma = 0;
  fx.gameOverBackdrop.elapsedMs = 0;
  fx.gameOverBackdrop.offsetX = 0;
  fx.gameOverBackdrop.offsetY = 0;

  initPieceSelectionState(state);
  emit(state, "reset");
}

// Starts a new run in `mode` (resetting first if needed).
export function startRun(state, mode) {
  if (state.running || state.gameOver || state.active || state.drops) resetGame(state);
  configureMode(state, mode);
  initPieceSelectionState(state);
  state.running = true;
  state.paused = false;
  emit(state, "start", { mode: state.mode });
  spawnPiece(state);
}

/* =========================
   Movement
   ========================= */

export function getActiveMatrix(state) {
  return state.active.shape.rotations[state.active.rotIdx];
}

export function getGhostDropY(state) {
  if (!state.active) return null;

  const mat = getActiveMatrix(state);
  if (isPhantom(state)) return phantomLandingY(state.board, state.active.x, mat);
  let ghostY = state.active.y;

  while (!collides(state, state.active.x, ghostY + 1, mat)) {
    ghostY += 1;
  }

  return ghostY;
}

export function collides(state, px, py, mat) {
  for (let y = 0; y < mat.length; y++) {
    for (let x = 0; x < mat[0].length; x++) {
      if (!mat[y][x]) continue;
      const bx = px + x;
      const by = py + y;
      if (bx < 0 || bx >= CONFIG.board.cols) return true;
      if (by >= CONFIG.board.rows) return true;
      if (by >= 0 && state.board[by][bx]) return true;
    }
  }
  return false;
}

export function markInput(state, type) {
  state.lastInputType = type;
  state.lastInputAt = performance.now();
}

function currentLockDelayMs(state) {
  // treat as touch if touch input occurred recently
  const now = performance.now();
  const recentTouch = (state.lastInputType === "touch") && (now - state.lastInputAt < 1200);
  return recentTouch ? CONFIG.timing.lockDelayMsTouch : CONFIG.timing.lockDelayMsKeyboard;
}

export function beginLockIfNeeded(state) {
  if (!state.locking) {
    state.locking = true;
    state.lockElapsed = 0;
  }
}

function cancelLock(state) {
  state.locking = false;
  state.lockElapsed = 0;
}

// Phantom powerups pass through blocks: only walls stop them, and they land in the
// deepest spot their columns have room for.
export function isPhantom(state) {
  return isPhantomPowerup(state.active?.shape.powerup);
}

function canFall(state) {
  const mat = getActiveMatrix(state);
  if (isPhantom(state)) {
    const target = phantomLandingY(state.board, state.active.x, mat);
    return target !== null && state.active.y < target;
  }
  return !collides(state, state.active.x, state.active.y + 1, mat);
}

function tryMovePhantom(state, dx, dy) {
  const mat = getActiveMatrix(state);
  const nx = state.active.x + dx;
  for (let y = 0; y < mat.length; y++) for (let x = 0; x < mat[0].length; x++) {
    if (mat[y][x] && (nx + x < 0 || nx + x >= CONFIG.board.cols)) return false;
  }
  const target = phantomLandingY(state.board, nx, mat);
  if (target === null) return false;
  const ny = state.active.y + dy;
  if (dy > 0 && ny > target) return false;
  if (dx !== 0 || dy !== 0) cancelLock(state);
  state.active.x = nx;
  state.active.y = Math.min(ny, target);
  return true;
}

export function tryMove(state, dx, dy) {
  if (!state.active) return false;
  if (isPhantom(state)) return tryMovePhantom(state, dx, dy);
  const mat = getActiveMatrix(state);
  const nx = state.active.x + dx;
  const ny = state.active.y + dy;
  if (!collides(state, nx, ny, mat)) {
    // If player nudges a piece while it's in lock grace, reset the timer.
    if (dx !== 0 || dy !== 0) cancelLock(state);
    state.active.x = nx;
    state.active.y = ny;
    return true;
  }
  return false;
}

export function tryRotate(state) {
  if (!state.active) return false;
  const shape = state.active.shape;
  if (shape.rotations.length <= 1) return false;

  const nextIdx = (state.active.rotIdx + 1) % shape.rotations.length;
  const nextMat = shape.rotations[nextIdx];

  const kicks = [
    { x: 0, y: 0 }, { x: -1, y: 0 }, { x: +1, y: 0 },
    { x: -2, y: 0 }, { x: +2, y: 0 }, { x: 0, y: -1 },
  ];

  if (isPhantom(state)) {
    // phantoms only care about the walls, and must still have somewhere to land
    for (const k of kicks) {
      const nx = state.active.x + k.x;
      let inside = true;
      for (let y = 0; y < nextMat.length && inside; y++) for (let x = 0; x < nextMat[0].length; x++) {
        if (nextMat[y][x] && (nx + x < 0 || nx + x >= CONFIG.board.cols)) { inside = false; break; }
      }
      const target = inside ? phantomLandingY(state.board, nx, nextMat) : null;
      if (target === null) continue;
      state.active.rotIdx = nextIdx;
      state.active.x = nx;
      state.active.y = Math.min(state.active.y + k.y, target);
      cancelLock(state);
      return true;
    }
    return false;
  }

  for (const k of kicks) {
    const nx = state.active.x + k.x;
    const ny = state.active.y + k.y;
    if (!collides(state, nx, ny, nextMat)) {
      state.active.rotIdx = nextIdx;
      state.active.x = nx;
      state.active.y = ny;
      cancelLock(state);
      return true;
    }
  }
  return false;
}

/* =========================
   Spawning and locking
   ========================= */

function spawnPiece(state) {
  if (!state.next) state.next = rollScatter(selectPiece(state));
  const shape = state.next;
  state.next = rollScatter(selectPiece(state));

  const rotIdx = 0;
  const mat = shape.rotations[rotIdx];
  const w = mat[0].length;

  state.active = {
    shape,
    rotIdx,
    x: Math.floor((CONFIG.board.cols - w) / 2),
    // Start fully above the board so entry is row-by-row, even for tall pieces
    y: -mat.length,
  };

  const ok = isPhantomPowerup(shape.powerup) || !collides(state, state.active.x, state.active.y, mat);
  if (ok) {
    // First powerup of a class in this game: the UI shows that class's intro screen.
    const ps = state.pieceSel.powerup;
    const type = shape.powerup?.cls;
    const isNew = !!type && !ps.shownClasses.has(type);
    if (type) {
      ps.shown.add(shape.id);
      ps.shownClasses.add(type);
      if (!ps.classes.includes(type)) ps.classes.push(type); // e.g. picked in dev mode
    }
    emit(state, "spawn", { shape, next: state.next, isNew });
  }
  return ok;
}

// Debug helper: make `shape` the next piece.
export function setNextPiece(state, shape) {
  state.next = rollScatter(shape);
  emit(state, "next", { next: shape });
}

// Locks the active piece into the board. Returns info about the placement.
function lockPiece(state) {
  const { shape, rotIdx } = state.active;
  const mat = getActiveMatrix(state);
  const pid = state.nextPid++;

  let lockedAboveTop = false;
  const placed = [];

  for (let y = 0; y < mat.length; y++) {
    for (let x = 0; x < mat[0].length; x++) {
      if (!mat[y][x]) continue;

      const bx = state.active.x + x;
      const by = state.active.y + y;

      if (by < 0) {
        lockedAboveTop = true;
        continue;
      }

      state.board[by][bx] = { paint: getShapePaint(shape, rotIdx, x, y), style: shape.style, pid };
      placed.push({ x: bx, y: by });
    }
  }
  markBoardDirty(state);

  state.instances.set(pid, {
    shape, rotIdx,
    x: state.active.x, y: state.active.y,
    cells: placed.map(c => ({ ...c })),
    total: Math.max(1, placed.length),
    intact: !lockedAboveTop,
  });

  state.lastLockedShape = shape;
  state.drops++;

  const big = CONFIG.fx.largePieceLock;
  // (pieces marked noShake, like a swarm of bees, land without a thud)
  if ((shape.difficulty ?? 0) >= (big.minDifficulty ?? 5) && !shape.powerup && !shape.noShake && CONFIG.fx.quake.enabled) {
    addQuakeFromBlocks(state, placed.length);
    // every big piece lands with a proper thud, whatever its size
    const floor = big.minTraumaByDifficulty?.[shape.difficulty] ?? 0;
    state.fx.quake.trauma = Math.max(state.fx.quake.trauma ?? 0, floor);
  }

  const info = { shape, rotIdx, x: state.active.x, y: state.active.y, pid, placed };

  state.score += placed.length * (CONFIG.scoring.placePerBlock ?? 0) * state.level;
  emit(state, "lock", {
    shape, pid, cells: placed, drops: state.drops,
    inside: (zone = "inside") => insidePairs(state, pid, zone),
    onBoard: () => [...state.instances.values()].filter(i => i.cells.length && i.shape).map(i => i.shape),
  });

  // A powerup that vanishes when it fires can't top you out.
  const consumed = !!shape.powerup?.consume;
  if (lockedAboveTop && !consumed) {
    setGameOver(state, shape);
  }

  return info;
}

function setGameOver(state, shape) {
  if (state.gameOver) return;
  state.gameOver = true;
  state.running = false;
  state.effect = null;
  state.active = null;
  state.gameOverInfo.pieceName = shape?.name ?? "";
  state.gameOverInfo.shape = shape ?? null;
  state.fx.gameOverBackdrop.cut++;
  state.fx.gameOverBackdrop.elapsedMs = 0;
  emit(state, "gameOver", { killer: shape ?? null, drops: state.drops, score: state.score });
}

/* =========================
   Piece instances (for zones and variety)
   ========================= */

// Pairs {inner, container} where the piece `pid` is inside another piece's zone,
// or another piece is inside the zone of `pid`.
export function insidePairs(state, pid, zoneName = "inside") {
  const cols = CONFIG.board.cols, rows = CONFIG.board.rows;
  const a = state.instances.get(pid);
  if (!a) return [];
  const pairs = [];

  const zoneOf = (inst) => {
    const z = inst.intact && inst.shape?.zones?.[zoneName];
    return z ? resolveArea(z[inst.rotIdx], inst.x, inst.y, cols, rows) : null;
  };
  const isIn = (cells, zone) => cells.some(c => zone.flags[c.y * cols + c.x]);

  const zoneA = zoneOf(a);
  for (const [opid, b] of state.instances) {
    if (opid === pid || !b.cells.length) continue;
    const zoneB = zoneOf(b);
    if (zoneB && isIn(a.cells, zoneB)) pairs.push({ inner: a.shape, container: b.shape });
    if (zoneA && isIn(b.cells, zoneA)) pairs.push({ inner: b.shape, container: a.shape });
  }
  return pairs;
}

function instancesAfterCollapse(state, removedRows) {
  const removed = new Set(removedRows);
  const sorted = [...removed].sort((p, q) => p - q);
  const below = (y) => { let n = 0; for (const r of sorted) if (r > y) n++; return n; };

  for (const [pid, inst] of state.instances) {
    const shifts = new Set();
    let lost = false;
    const cells = [];
    for (const c of inst.cells) {
      if (removed.has(c.y)) { lost = true; continue; }
      const d = below(c.y);
      shifts.add(d);
      cells.push({ x: c.x, y: c.y + d });
    }
    inst.cells = cells;
    if (!cells.length) { state.instances.delete(pid); continue; }
    if (lost || shifts.size > 1) inst.intact = false;
    else inst.y += [...shifts][0] ?? 0;
  }
}

function instancesAfterRemoval(state, removedCells) {
  for (const { x, y, cell } of removedCells) {
    const inst = state.instances.get(cell?.pid);
    if (!inst) continue;
    inst.cells = inst.cells.filter(c => c.x !== x || c.y !== y);
    inst.intact = false;
    if (!inst.cells.length) state.instances.delete(cell.pid);
  }
}

function instancesAfterMoves(state, moves) {
  const byPid = new Map();
  for (const m of moves) {
    const pid = m.cell?.pid;
    if (!state.instances.has(pid)) continue;
    if (!byPid.has(pid)) byPid.set(pid, []);
    byPid.get(pid).push(m);
  }
  for (const [pid, list] of byPid) {
    const inst = state.instances.get(pid);
    const deltas = new Set(list.map(m => `${m.toX - m.fromX},${m.toY - m.fromY}`));
    const from = new Map(list.map(m => [`${m.fromX},${m.fromY}`, m]));
    inst.cells = inst.cells.map(c => {
      const m = from.get(`${c.x},${c.y}`);
      return m ? { x: m.toX, y: m.toY } : c;
    });
    // Still in one piece only if every block moved by the same amount.
    if (list.length === inst.cells.length && deltas.size === 1) {
      inst.x += list[0].toX - list[0].fromX;
      inst.y += list[0].toY - list[0].fromY;
    } else {
      inst.intact = false;
    }
  }
}

/* =========================
   Line clears
   ========================= */

function clearFullLines(state) {
  const rows = CONFIG.board.rows;
  const cols = CONFIG.board.cols;

  const fullRows = [];
  for (let y = 0; y < rows; y++) {
    if (state.board[y].every((c) => c !== null)) fullRows.push(y);
  }

  const cleared = fullRows.length;
  if (cleared === 0) return 0;

  const fullRowsSet = new Set(fullRows);
  const fallingBlocks = countFallingBlocksAfterClear(state.board, fullRowsSet);
  // which pieces had blocks in the destroyed rows (for achievements)
  const hitShapes = new Set();
  for (const y of fullRows) for (const c of state.board[y]) {
    const sh = c?.pid ? state.instances.get(c.pid)?.shape : null;
    if (sh) hitShapes.add(sh);
  }

  const { removed, dropDistances } = collapseRows(state.board, fullRows, cols);
  markBoardDirty(state);
  instancesAfterCollapse(state, fullRows);

  spawnCellParticles(state, rowsToCells(removed));
  startRowFall(state, dropDistances);

  state.lines += cleared;
  state.rowsDestroyed += cleared;
  state.blocksDestroyed += cleared * cols;

  const base = CONFIG.scoring.lineClear[cleared] ?? (cleared * 100);
  state.score += (base + cleared * cols * (CONFIG.scoring.blockDestroyed ?? 0)) * state.level;

  const newLevel = 1 + Math.floor(state.lines / CONFIG.timing.levelEveryLines);
  if (newLevel !== state.level) {
    state.level = newLevel;
    recomputeSpeed(state);
    emit(state, "levelUp", { level: newLevel });
  }

  addQuakeFromBlocks(state, fallingBlocks);

  const word = CONFIG.fx.callouts.multiRow[Math.min(cleared, 6)];
  if (cleared >= 2 && word) {
    const midY = fullRows.reduce((a, b) => a + b, 0) / cleared;
    addCallout(state, word, cols / 2, midY, { big: true });
  }

  emit(state, "rowsDestroyed", { count: cleared, source: "clear", shapes: [...hitShapes] });
  if (isBoardEmpty(state)) emit(state, "boardCleared");

  return cleared;
}

function isBoardEmpty(state) {
  return state.board.every(row => row.every(c => c === null));
}

function rowsToCells(removedRows) {
  const out = [];
  for (const { y, cells } of removedRows) {
    for (let x = 0; x < cells.length; x++) {
      if (cells[x]) out.push({ x, y, cell: cells[x] });
    }
  }
  return out;
}

function startRowFall(state, dropDistances) {
  const rf = state.fx.rowFall;
  rf.active = dropDistances.some(d => d > 0);
  rf.elapsedMs = 0;
  rf.durationMs = CONFIG.fx.lineClear.boardFallAnimMs;
  rf.rowDropDistances = dropDistances;
}

function recomputeSpeed(state) {
  const mult = Math.pow(CONFIG.timing.speedMultiplierPerLevel, state.level - 1);
  state.dropMs = Math.max(CONFIG.timing.minDropMs, Math.floor(CONFIG.timing.baseDropMs * mult));
}

function countFallingBlocksAfterClear(oldBoard, fullRowsSet) {
  const rows = CONFIG.board.rows;
  const cols = CONFIG.board.cols;
  let fallingBlocks = 0;
  let clearedBelow = 0;

  // Walk bottom-up so "rows cleared below" is a running count.
  for (let y = rows - 1; y >= 0; y--) {
    if (fullRowsSet.has(y)) { clearedBelow++; continue; }
    if (clearedBelow <= 0) continue; // this row doesn't drop

    for (let x = 0; x < cols; x++) {
      if (oldBoard[y][x] !== null) fallingBlocks++;
    }
  }

  return fallingBlocks;
}

/* =========================
   Powerup effects
   =========================
   Sequence after a powerup locks:
     "charge" (piece + highlighted cells glow)  ->  fire the effect
     "settle" (blocks fly / slide / grow)       ->  line clears, next piece
*/

function beginPowerupEffect(state, lockInfo) {
  const { shape, rotIdx, x, y } = lockInfo;
  const pu = shape.powerup;
  const mat = shape.rotations[rotIdx];

  state.effect = {
    ...lockInfo,
    pu,
    area: resolvePowerupArea(pu, rotIdx, x, y, CONFIG.board.cols, CONFIG.board.rows),
    centre: { x: x + (mat[0].length - 1) / 2, y: y + (mat.length - 1) / 2 },
    phase: "charge",
    elapsedMs: 0,
    durationMs: CONFIG.fx.powerup.chargeMs,
    quakeOnSettle: 0,
  };
  emit(state, "powerupCharge", { shape });
}

function updatePowerupEffect(state, dt) {
  const e = state.effect;
  e.elapsedMs += dt;
  if (e.elapsedMs < e.durationMs) return;

  if (e.phase === "charge") {
    e.durationMs = firePowerupEffect(state, e);
    e.phase = "settle";
    e.elapsedMs = 0;
    return;
  }

  // settle finished
  if (e.quakeOnSettle > 0) addQuakeFromBlocks(state, e.quakeOnSettle);
  state.effect = null;
  finishTurn(state);
}

// Applies the effect to the board. Returns how long to wait before continuing.
function firePowerupEffect(state, e) {
  const cfg = CONFIG.fx.powerup;
  const cols = CONFIG.board.cols;
  const rows = CONFIG.board.rows;
  const pu = e.pu;
  let settleMs = 0;

  const fillPid = state.nextPid++;
  const blasts = pu.type === "blast" || pu.parts?.some(p => p.type === "blast");
  if (blasts) {
    const reach = Math.max(2, ...e.area.indices.map(i => Math.hypot(i % cols - e.centre.x, ((i / cols) | 0) - e.centre.y)));
    state.fx.shockwaves.push({ x: e.centre.x + 0.5, y: e.centre.y + 0.5, radius: reach + 1, elapsedMs: 0, durationMs: 420 });
  }
  const fx = computeEffect(state.board, pu, {
    area: e.area, placed: e.placed, pid: e.pid, centre: e.centre, cols, rows, rng: state.rng,
    makeFill: () => ({ paint: pu.fillPaint, style: pu.fillStyle, pid: fillPid }),
  });

  if (fx.consumed.length) {
    spawnCellParticles(state, fx.consumed, 0.6);
    state.instances.delete(e.pid);
  }

  if (fx.destroyed.length) {
    instancesAfterRemoval(state, fx.destroyed);
    spawnCellParticles(state, fx.destroyed);
    startFlash(state, fx.destroyed, cfg.destroyFlashMs);
    state.blocksDestroyed += fx.destroyed.length;
    state.score += fx.destroyed.length * ((CONFIG.scoring.powerupDestroyPerBlock ?? 0) + (CONFIG.scoring.blockDestroyed ?? 0)) * state.level;
    addQuakeFromBlocks(state, fx.destroyed.length * (cfg.destroyQuakePerBlock ?? 1));
    settleMs = cfg.destroySettleMs;
  }

  if (fx.collapsed) {
    instancesAfterCollapse(state, fx.collapsed.rows);
    startRowFall(state, fx.collapsed.dropDistances);
    settleMs = Math.max(settleMs, CONFIG.fx.lineClear.boardFallAnimMs);
    state.rowsDestroyed += fx.collapsed.rows.length;
    state.score += (CONFIG.scoring.lineClear[fx.collapsed.rows.length] ?? fx.collapsed.rows.length * 100) * state.level;
    emit(state, "rowsDestroyed", { count: fx.collapsed.rows.length, source: "powerup" });
  }

  // blocks moved or filled by a powerup score a little too
  state.score += (fx.moves.length + fx.filled.length) * (CONFIG.scoring.powerupMovePerBlock ?? 0) * state.level;

  if (fx.moves.length) {
    instancesAfterMoves(state, fx.moves);
    settleMs = Math.max(settleMs, startMoveAnim(state, fx.moves));
    e.quakeOnSettle = fx.moves.length * (cfg.gravityQuakePerBlock ?? 1);
  }

  if (fx.filled.length) {
    if (pu.type === "goo") {
      // goo flows from where the piece melted to where it settles
      settleMs = Math.max(settleMs, startMoveAnim(state, fx.filled.map(f => ({
        fromX: f.fromX, fromY: f.fromY, toX: f.x, toY: f.y,
      }))));
    } else {
      settleMs = Math.max(settleMs, startGrowAnim(state, fx.filled, e.centre));
    }
  }

  let affected = fx.destroyed.length + fx.moves.length + fx.filled.length;
  if (pu.type === "phantom") {
    // how many of its blocks ended up under something (= gaps it plugged)
    affected = e.placed.filter(({ x, y }) => {
      for (let yy = y - 1; yy >= 0; yy--) if (state.board[yy][x] && state.board[yy][x].pid !== e.pid) return true;
      return false;
    }).length;
    settleMs = 120;
  }

  markBoardDirty(state);

  if (affected >= (CONFIG.fx.callouts.powerupBlocksMin ?? 8)) {
    addCallout(state, `+${affected}`, e.centre.x + 0.5, e.centre.y, {});
  }
  // learning: a class counts as understood once a powerup of it does something; wasting
  // one (it did nothing) puts the class back to only serving usable pieces
  const psel = state.pieceSel?.powerup;
  if (psel) {
    if (affected > 0) { psel.usedOk.add(pu.cls); psel.relearn.delete(pu.cls); }
    else psel.relearn.add(pu.cls);
  }
  emit(state, "powerupFire", { shape: e.shape, type: pu.type, affected });
  if (isBoardEmpty(state) && state.drops > 1) emit(state, "boardCleared");

  return settleMs;
}

function startMoveAnim(state, moves) {
  const cfg = CONFIG.fx.powerup;
  const cols = CONFIG.board.cols;
  const anim = state.fx.moveAnim;
  anim.byIndex.clear();
  anim.elapsedMs = 0;
  let longest = 0;

  for (const m of moves) {
    const ox = m.fromX - m.toX;
    const oy = m.fromY - m.toY;
    if (m.path) {
      // a block thrown by a blast: follow its flight path (slowed a little so you can see it)
      const scale = cfg.blastTimeScale ?? 1;
      const dur = m.flight * 1000 * scale;
      anim.byIndex.set(m.toY * cols + m.toX, { ox, oy, dur, path: m.path, flight: m.flight, spin: m.spin, toX: m.toX, toY: m.toY });
      longest = Math.max(longest, dur);
      continue;
    }
    const hasVia = m.viaX != null && (m.viaX !== m.toX || m.viaY !== m.toY);
    const dist = Math.abs(ox) + Math.abs(oy) + (hasVia ? Math.abs(m.viaY - m.toY) : 0);
    const dur = Math.min(cfg.gravityMaxMs * (hasVia ? 1.6 : 1), cfg.gravityBaseMs + cfg.gravityMsPerSqrtCell * Math.sqrt(dist));
    const item = { ox, oy, dur };
    if (hasVia) { item.vx = m.viaX - m.toX; item.vy = m.viaY - m.toY; }
    anim.byIndex.set(m.toY * cols + m.toX, item);
    longest = Math.max(longest, dur);
  }

  anim.durationMs = longest;
  anim.active = moves.length > 0;
  return longest;
}

function startGrowAnim(state, filled, centre) {
  const cfg = CONFIG.fx.powerup;
  const cols = CONFIG.board.cols;
  const anim = state.fx.growAnim;
  anim.byIndex.clear();
  anim.elapsedMs = 0;
  anim.growMs = cfg.expandGrowMs;
  let maxDelay = 0;

  for (const { x, y } of filled) {
    const delay = Math.hypot(x - centre.x, y - centre.y) * cfg.expandStaggerMsPerCell;
    anim.byIndex.set(y * cols + x, delay);
    maxDelay = Math.max(maxDelay, delay);
  }

  anim.durationMs = filled.length ? maxDelay + cfg.expandGrowMs : 0;
  anim.active = filled.length > 0;
  return anim.durationMs;
}

function startFlash(state, cells, durationMs) {
  const f = state.fx.flash;
  f.cells = cells.map(({ x, y }) => ({ x, y }));
  f.elapsedMs = 0;
  f.durationMs = durationMs;
  f.active = cells.length > 0;
}

/* =========================
   FX helpers
   ========================= */

export function addQuakeFromBlocks(state, blockCount) {
  const cfg = CONFIG.fx.quake;
  if (!cfg.enabled) return;

  const n = Math.max(0, Number(blockCount) || 0);
  if (n <= 0) return;

  const t = clamp01(n / Math.max(1, cfg.blocksForMax ?? 28));
  const scaled = Math.pow(t, cfg.blockScalePower ?? 0.85);
  const trauma = lerp(cfg.minTrauma ?? 0.10, cfg.maxTrauma ?? 0.38, scaled);

  // Use the stronger of the current quake and the new trigger,
  // rather than stacking to disruptive levels.
  state.fx.quake.trauma = Math.max(state.fx.quake.trauma ?? 0, trauma);
}

// x, y in board cells (centre of the text).
function addCallout(state, text, x, y, { big = false } = {}) {
  if (!CONFIG.fx.callouts.enabled) return;
  state.fx.callouts.push({ text, x, y, big, elapsedMs: 0, durationMs: CONFIG.fx.callouts.durationMs });
}

// Particles burst from cells [{x, y, cell}] (board coords). `mult` scales the count.
function spawnCellParticles(state, cells, mult = 1) {
  if (!CONFIG.fx.lineClear.enabled) return;

  const cfg = CONFIG.fx.lineClear;
  const cellPx = CONFIG.render.cellPx;

  for (const { x, y, cell: cellObj } of cells) {
    if (!cellObj) continue;

    const paint = cellObj.paint;
    const px = x * cellPx;
    const py = y * cellPx;

    let colours = [];
    if (typeof paint === "string") {
      colours = [paint];
    } else if (paint?.pixels) {
      for (const row of paint.pixels) {
        for (const c of row) {
          if (typeof c === "string") colours.push(c);
        }
      }
    }
    if (colours.length === 0) colours = [cellObj.style?.baseColor ?? "#FFFFFF"];

    const targetCount = Math.round(mult * Math.min(
      cfg.maxParticlesPerCell,
      Math.max(6, Math.round(colours.length * (cfg.particlesPerPixel ?? 0.35)))
    ));

    for (let i = 0; i < targetCount; i++) {
      const angle = state.rng() * Math.PI * 2;
      const speed = lerp(cfg.speedMin, cfg.speedMax, state.rng());
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - speed * (cfg.upwardBias ?? 0.18);
      const lifeMs = lerp(cfg.lifeMinMs, cfg.lifeMaxMs, state.rng());

      state.fx.particles.push({
        x: px + state.rng() * cellPx,
        y: py + state.rng() * cellPx,
        vx,
        vy,
        lifeMs,
        maxLifeMs: lifeMs,
        size: cfg.particleSizePx,
        color: colours[Math.floor(state.rng() * colours.length)],
      });
    }
  }
}

function updateFX(state, dt) {
  const dtSec = dt / 1000;

  const parts = state.fx.particles;
  if (parts.length) {
    const cfg = CONFIG.fx.lineClear;
    const drag = Math.max(0, 1 - cfg.dragPerSecond * dtSec);
    let n = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.lifeMs -= dt;
      if (p.lifeMs <= 0) continue;

      p.vx *= drag;
      p.vy = p.vy * drag + cfg.gravityPxPerSec2 * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;

      parts[n++] = p;
    }
    parts.length = n; // compact in place (no per-frame allocation)
  }

  const sw = state.fx.shockwaves;
  if (sw.length) {
    let n = 0;
    for (const w of sw) { w.elapsedMs += dt; if (w.elapsedMs < w.durationMs) sw[n++] = w; }
    sw.length = n;
  }

  const co = state.fx.callouts;
  if (co.length) {
    let n = 0;
    for (const c of co) {
      c.elapsedMs += dt;
      if (c.elapsedMs < c.durationMs) co[n++] = c;
    }
    co.length = n;
  }

  const rf = state.fx.rowFall;
  if (rf.active) {
    rf.elapsedMs += dt;
    if (rf.elapsedMs >= rf.durationMs) {
      rf.active = false;
      rf.elapsedMs = 0;
      rf.rowDropDistances.fill(0);
    }
  }

  for (const anim of [state.fx.moveAnim, state.fx.growAnim, state.fx.flash]) {
    if (!anim.active) continue;
    anim.elapsedMs += dt;
    if (anim.elapsedMs >= anim.durationMs) anim.active = false;
  }

  const q = state.fx.quake;
  q.trauma = Math.max(0, q.trauma - CONFIG.fx.quake.traumaDecayPerSecond * dtSec);
  q.seed += dtSec * 11.7;

  if (state.gameOver) {
    const bg = state.fx.gameOverBackdrop;
    bg.elapsedMs += dt;

    if (bg.elapsedMs >= CONFIG.fx.gameOverBackdrop.cutEveryMs) {
      bg.cut++;
      bg.elapsedMs = 0;
      bg.currentAngle = (state.rng() * 2 - 1) * CONFIG.fx.gameOverBackdrop.rotationDeg;
      const a = state.rng() * Math.PI * 2;
      bg.dirX = Math.cos(a);
      bg.dirY = Math.sin(a);
      bg.offsetX = 0;
      bg.offsetY = 0;
    }

    const speed = CONFIG.fx.gameOverBackdrop.movePxPerSec;
    bg.offsetX += bg.dirX * speed * dtSec;
    bg.offsetY += bg.dirY * speed * dtSec;
  }
}

/* =========================
   Loop
   ========================= */

function stepLockAndSpawn(state) {
  const lockInfo = lockPiece(state);
  if (state.gameOver) return;

  if (lockInfo.shape.powerup) {
    // The next piece spawns once the effect has played out (finishTurn).
    state.active = null;
    beginPowerupEffect(state, lockInfo);
    return;
  }

  finishTurn(state);
}

function finishTurn(state) {
  clearFullLines(state);

  const ok = spawnPiece(state);
  if (!ok) setGameOver(state, state.lastLockedShape);
}

export function updateGame(state, dt) {
  updateFX(state, dt);

  if (!state.running || state.gameOver) return;
  if (state.paused) return;

  if (state.effect) {
    updatePowerupEffect(state, dt);
    return;
  }
  if (!state.active) return;

  const baseDropMs = state.dropMs;
  const effectiveDropMs = state.softDropping
    ? Math.max(16, Math.floor(baseDropMs * CONFIG.timing.softDropFactor))
    : baseDropMs;

  state.dropAccum += dt;
  const maxBacklog = effectiveDropMs * (CONFIG.timing.maxAccumulatedSteps ?? 2);
  if (state.dropAccum > maxBacklog) state.dropAccum = maxBacklog;

  const maxSteps = CONFIG.timing.maxFallStepsPerFrame ?? 1;
  let steps = 0;

  while (state.dropAccum >= effectiveDropMs && steps < maxSteps) {
    state.dropAccum -= effectiveDropMs;

    if (state.locking) break;

    const moved = tryMove(state, 0, 1);
    if (moved) {
      if (state.softDropping && (CONFIG.scoring?.softDropPerCell ?? 0) > 0) {
        state.score += CONFIG.scoring.softDropPerCell;
      }
    } else {
      beginLockIfNeeded(state);
      break;
    }

    steps++;
  }

  if (state.locking && state.active && !state.gameOver) {
    state.lockElapsed += dt;

    if (canFall(state)) {
      cancelLock(state);
    } else {
      const delay = currentLockDelayMs(state);
      if (state.lockElapsed >= delay) {
        stepLockAndSpawn(state);
        cancelLock(state);
      }
    }
  }
}

// Test/debug helper: drop the active piece straight down and lock it now.
export function hardDropAndLock(state) {
  if (!state.active || state.effect || state.gameOver) return false;
  while (tryMove(state, 0, 1)) state.score += CONFIG.scoring.hardDropPerCell ?? 0;
  stepLockAndSpawn(state);
  cancelLock(state);
  return true;
}
