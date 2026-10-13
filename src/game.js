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
//   "level6Unlocked" {}                         the comeback: the level 6 groups open up
//   "endGame"        { on, escaped }            the (hidden) end game starts or is escaped

import { CONFIG } from "../config.js";
import { clamp01, lerp } from "./util.js";
import { getShapePaint } from "./shapes.js";
import { initPieceSelectionState, selectPiece, destroyerCells, stillUseful } from "./selection.js";
import { gravityColumns } from "./godmode.js";
import { resolveArea, resolvePowerupArea, collapseRows, computeEffect, phantomLandingY, isPhantomPowerup, rollScatter } from "./powerups.js";
import { normaliseGroups, trackLevel6, LEVEL6 } from "./level6.js";
import { trackEndGame, endGameOn, spawnJitter, noteLanding } from "./endgame.js";
import { remixShape } from "./remix.js";
import { createZen, zenNext, zenPeek, zenTick, zenSpawned, zenSpeed, zenSteps, zenLockMs, zenDramatic, reachableTurns } from "./zen.js";
import { buildThreads } from "./threads.js";

/* =========================
   State
   ========================= */

export function createEmptyBoard(cols, rows) {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

export function createGameState(shapes, powerups, { rng = Math.random, groups = [], threads = null } = {}) {
  const state = {
    allShapes: shapes,
    allPowerups: powerups,
    allById: new Map([...shapes, ...powerups].map(s => [s.id, s])),

    // Level 6 groups (shapes/groups.js, src/level6.js)
    groups: normaliseGroups(groups, shapes),
    // Threads (shapes/threads.js, src/threads.js): the loose themes pieces share
    threads: threads ? buildThreads([...shapes, ...powerups], threads.threads, threads.sets) : null,
    devLevel6: "auto",         // dev mode override: "auto", "on" or "off"
    devEndGame: "auto",        // dev mode override for the end game (src/endgame.js)
    endGameMs: null,           // the end game's fall speed (ms per row), null when it's off
    level6Remembered: false,   // unlocked before in this browser (only used if level6.persist)

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
      shockwaves: [],  // expanding rings (blasts, and the powerup shows)
      rowClears: [],   // the light sweeping along rows as they go (CONFIG.fx.rowClear)
      show: null,      // the powerup show playing now (planShow; render.js drawShow)
      admire: null,    // the dramatic pause: the board glowing and sparkling (CONFIG.fx.admire)
      ghosts: null,    // a combo's blocks, still there until they crumble, bottom up (rowClearShow)
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

// The pieces that can appear in the current mode (level 6 pieces only come once unlocked, so
// they're left out).
export function currentPool(state) {
  return [...state.shapes, ...state.powerups].filter(s => (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) !== LEVEL6);
}

// A piece as it actually arrives: remixes are rebuilt and scatters re-rolled every time, and
// one that comes straight after itself goes by its `nameAgain` ("another raindrop").
function prepareShape(state, shape) {
  let out = rollScatter(remixShape(shape, state.allById, state.rng), state.rng);
  const recent = state.pieceSel?.recentShapeIds ?? [];
  if (out?.nameAgain && recent.length >= 2 && recent[recent.length - 2] === out.id && recent[recent.length - 1] === out.id) {
    out = { ...out, name: out.nameAgain };
  }
  return out;
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
  state.nextChosen = false;
  state.effect = null;
  state.hold = null;
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
  state.endGameMs = null;
  state.dropAccum = 0;
  state.softDropping = false;
  cancelLock(state);

  state.zen = null;
  state.lastLockedShape = null;
  state.gameOverInfo.pieceName = "";
  state.gameOverInfo.shape = null;

  const fx = state.fx;
  fx.particles.length = 0;
  fx.callouts.length = 0;
  fx.shockwaves.length = 0;
  fx.rowClears.length = 0;
  fx.show = null;
  fx.admire = null;
  fx.ghosts = null;
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
  // Zen mode: it plays itself (src/zen.js), and never ends
  state.zen = CONFIG.modes[state.mode]?.zen ? createZen(state) : null;
  if (state.zen) state.dropMs = CONFIG.zen.dropMs;
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

// How fast the game runs in this mode, times the speed setting (turbo zen's pause menu).
export function timeScaleOf(state) {
  return (CONFIG.modes[state.mode]?.timeScale ?? 1) * (state.speed ?? 1);
}

export function markInput(state, type) {
  state.lastInputType = type;
  state.lastInputAt = performance.now();
}

function currentLockDelayMs(state) {
  // (zen: the autopilot's pieces lock at their own pace)
  const zen = state.zen ? zenLockMs(state) : null;
  if (zen != null) return zen;
  // treat as touch if touch input occurred recently
  const now = performance.now();
  const recentTouch = (state.lastInputType === "touch") && (now - state.lastInputAt < 1200);
  let delay = recentTouch ? CONFIG.timing.lockDelayMsTouch : CONFIG.timing.lockDelayMsKeyboard;
  // (slid or turned along the ground: a little longer, so it can be slid again, up to a point)
  const a = state.active, T = CONFIG.timing;
  if (a?.groundMoved && !groundSpent(state)) delay = Math.max(delay, T.slideLockMs ?? 0);
  // (on its last chance, while it would still top out: whatever's left of it)
  const lc = a?.lastChance;
  return lc && topsOut(state) ? Math.max(delay, lc.durationMs - lc.elapsedMs) : delay;
}

// Would the falling piece, locked where it is now, stick out above the top (game over)?
function topsOut(state) {
  const a = state.active, mat = getActiveMatrix(state);
  for (let y = 0; y < mat.length; y++) if (a.y + y < 0 && mat[y].some(Boolean)) return true;
  return false;
}

// About to lock sticking out above the top? Once per piece, it gets another moment
// (CONFIG.timing.lastChanceMs): it flashes red, the board warns, and it can still be moved.
function lastChance(state) {
  const a = state.active, ms = CONFIG.timing.lastChanceMs ?? 0;
  if (!ms || state.zen || a.lastChance || a.shape.powerup?.consume || !topsOut(state)) return false;
  a.lastChance = { elapsedMs: 0, durationMs: ms };
  state.lockElapsed = 0;
  emit(state, "lastChance", { shape: a.shape });
  return true;
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
  // (never upwards: no moving into a column whose landing spot is above where it already is)
  if (target === null || target < state.active.y) return false;
  const ny = state.active.y + dy;
  if (dy > 0 && ny > target) return false;
  if (dx !== 0 && state.locking) state.active.groundMoved = true;
  if ((dx !== 0 || dy !== 0) && !groundSpent(state)) cancelLock(state);
  if (dx !== 0) { state.active.unkickedX = null; state.active.steered = true; }
  state.active.x = nx;
  state.active.y = ny;
  return true;
}

// Has the piece had its time on the ground (CONFIG.timing.slideMaxMs)? Then moving it no
// longer puts off the lock.
function groundSpent(state) {
  return (state.active?.groundMs ?? 0) >= (CONFIG.timing.slideMaxMs ?? Infinity);
}

export function tryMove(state, dx, dy) {
  if (!state.active) return false;
  if (isPhantom(state)) return tryMovePhantom(state, dx, dy);
  const mat = getActiveMatrix(state);
  const nx = state.active.x + dx;
  const ny = state.active.y + dy;
  if (!collides(state, nx, ny, mat)) {
    // If player nudges a piece while it's in lock grace, reset the timer (and slid along the
    // ground, it waits a little longer: CONFIG.timing.slideLockMs), until its time on the
    // ground is up.
    if (dx !== 0 && state.locking) state.active.groundMoved = true;
    if ((dx !== 0 || dy !== 0) && !groundSpent(state)) cancelLock(state);
    if (dx !== 0) { state.active.unkickedX = null; state.active.steered = true; } // (no snapping back any more)
    state.active.x = nx;
    state.active.y = ny;
    return true;
  }
  return false;
}

// Turning a piece. It turns about its top-left corner, and if it doesn't fit there it may shift a
// column or two sideways, but only to a spot it could have slid to (never through blocks) and
// never upwards. Only when the turned piece would stick out past a wall (a very long piece near
// an edge, like the giant hot dog) is it pushed back inside, however far that takes; the next
// turn then puts it back where it was, as long as the player hasn't moved it sideways in between
// (active.unkickedX).
export function tryRotate(state) {
  const a = state.active;
  if (!a) return false;
  const shape = a.shape;
  if (shape.rotations.length <= 1) return false;

  const nextIdx = (a.rotIdx + 1) % shape.rotations.length;
  const curMat = shape.rotations[a.rotIdx];
  const nextMat = shape.rotations[nextIdx];
  const cols = CONFIG.board.cols;
  const w = nextMat[0].length;
  const phantom = isPhantom(state);

  const baseX = a.unkickedX ?? a.x;                    // (back where it was before a push)
  const inX = Math.max(0, Math.min(cols - w, baseX)); // pushed inside only if a wall would crop it
  const pushed = inX !== baseX;

  const insideWalls = (nx, mat) => {
    for (let y = 0; y < mat.length; y++) for (let x = 0; x < mat[0].length; x++) {
      if (mat[y][x] && (nx + x < 0 || nx + x >= cols)) return false;
    }
    return true;
  };
  // could the piece, as it is now, slide sideways from where it is to column nx?
  const canSlide = (nx) => {
    const step = Math.sign(nx - a.x);
    for (let x = a.x + step; step !== 0 && x !== nx + step; x += step) {
      if (phantom ? !insideWalls(x, curMat) : collides(state, x, a.y, curMat)) return false;
    }
    return true;
  };

  for (const k of pushed ? [0] : [0, -1, 1, -2, 2]) {
    const nx = inX + k;
    if (phantom) {
      if (!insideWalls(nx, nextMat)) continue;
      const target = phantomLandingY(state.board, nx, nextMat);
      if (target === null || target < a.y) continue; // it would have to go up
    } else if (collides(state, nx, a.y, nextMat)) {
      continue;
    }
    if (k !== 0 && !canSlide(nx)) continue;
    a.rotIdx = nextIdx;
    a.x = nx;
    a.unkickedX = pushed ? baseX : null;
    a.steered = true;
    if (state.locking) a.groundMoved = true;
    if (!groundSpent(state)) cancelLock(state);
    return true;
  }
  return false;
}

/* =========================
   Spawning and locking
   ========================= */

function spawnPiece(state) {
  // the board has settled: did the player just dig back down far enough to open level 6?
  if (state.pieceSel && trackLevel6(state)) emit(state, "level6Unlocked", {});
  // ...or reach two thirds of the board (the end game), or dig their way out of it?
  if (state.pieceSel && !state.zen) updateEndGame(state, trackEndGame(state));
  let shape, rotIdx = 0;
  if (state.zen) {
    // zen: the director picks each piece as it's needed, on the board as it is now
    shape = prepareShape(state, zenNext(state));
    state.next = zenPeek(state);
  } else {
    if (!state.next) state.next = prepareShape(state, selectPiece(state));
    shape = notDeadly(state, state.next);
    // (a powerup the last piece left with nothing to do: one of the same outline that can,
    // unless it was asked for by name)
    const swap = state.nextChosen ? { shape } : stillUseful(state, shape);
    if (swap.shape !== shape) { shape = prepareShape(state, swap.shape); rotIdx = swap.rot; }
    state.nextChosen = false;
    state.next = prepareShape(state, selectPiece(state));
  }

  const mat = shape.rotations[rotIdx];
  const w = mat[0].length;

  // a little off-centre, at random (mostly near the middle), so dropping without moving
  // builds a pile instead of one central tower
  const J = Math.min(spawnJitter(state), Math.floor((CONFIG.board.cols - w) / 2));
  const off = J > 0 ? Math.round((state.rng() + state.rng() - 1) * J) : 0;
  state.active = {
    shape,
    rotIdx,
    x: Math.max(0, Math.min(CONFIG.board.cols - w, Math.floor((CONFIG.board.cols - w) / 2) + off)),
    // Start fully above the board so entry is row-by-row, even for tall pieces
    y: -mat.length,
  };
  // (zen: it starts out already turned, over the place it's going)
  if (state.zen) zenSpawned(state);
  const pauseFirst = state.zen?.pauseFirst ?? 0;

  const ok = isPhantomPowerup(shape.powerup) || !collides(state, state.active.x, state.active.y, getActiveMatrix(state));
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
    // (zen can say something else in place of the name: "Oops, all bagpipes!")
    emit(state, "spawn", { shape, next: state.next, isNew, label: state.zen?.current?.label ?? null });
    // (turbo zen: a powerup that's about to take most of the board waits up there a moment first)
    if (pauseFirst > 0) dramaticPause(state, pauseFirst, null);
  }
  return ok;
}

// A giant, or a level 6 set's piece, that couldn't go anywhere without sticking out over the top
// (an instant game over) waits: a set's piece goes back to the front of its set, and something to
// make room comes first (a big destroyer, or a small piece without powerups). After a few goes,
// the set gives up.
function notDeadly(state, shape) {
  if (shape.powerup || (shape.difficulty ?? 1) < 4) return shape;
  const l6 = state.pieceSel?.level6, set = (shape.difficulty ?? 1) === LEVEL6 && l6;
  if (fitsSomewhere(state, shape)) { if (set) l6.waited = 0; return shape; }
  if (set) {
    if ((l6.waited = (l6.waited ?? 0) + 1) <= 3) l6.queue.unshift(shape);
    else { l6.queue = []; l6.group = null; l6.lastEnd = state.pieceSel.dropIndex; l6.waited = 0; }
  }
  emit(state, "deferred", { shape });
  return prepareShape(state, roomMaker(state));
}

function roomMaker(state) {
  const big = state.powerups.filter(p => isPowerupEnabled(p) && !p.powerup.bad && (destroyerCells(p) >= 40 || gravityColumns(p) >= 8));
  if (big.length && CONFIG.modes[state.mode]?.powerups !== false) return big[Math.floor(state.rng() * big.length)];
  const small = state.shapes.filter(s => (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) <= 1);
  return small[Math.floor(state.rng() * small.length)] ?? state.shapes[0];
}

// Could the piece go anywhere (any turn it can reach, any column) without sticking out over the top?
function fitsSomewhere(state, shape) {
  const cols = CONFIG.board.cols;
  for (let r = 0; r < reachableTurns(shape); r++) {
    const mat = shape.rotations[r], w = mat[0].length;
    for (let x = 0; x + w <= cols; x++) {
      let y = -mat.length;
      while (!collides(state, x, y + 1, mat)) y++;
      if (!mat.some((row, j) => y + j < 0 && row.some(Boolean))) return true;
    }
  }
  return false;
}

// Debug helper: make `shape` the next piece.
export function setNextPiece(state, shape) {
  state.next = prepareShape(state, shape);
  state.nextChosen = true;
  emit(state, "next", { next: shape });
}

// Does this piece shake the board when it lands? Big giants do (CONFIG.fx.largePieceLock);
// small pieces don't, unless marked `shake` (a small boulder), and nor do ones marked noShake
// (like a swarm of bees).
export function shakesOnLanding(shape) {
  const big = CONFIG.fx.largePieceLock;
  if (!shape || shape.powerup || shape.noShake) return false;
  if (shape.shake) return true;
  return (shape.difficulty ?? 0) >= (big.minDifficulty ?? 4) && blockCount(shape) >= (big.minBlocks ?? 0);
}
const blockCount = (shape) => shape.rotations[0].reduce((n, row) => n + row.filter(Boolean).length, 0);

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

      state.board[by][bx] = { paint: getShapePaint(shape, rotIdx, x, y), style: shape.style, pid, ...(shape.seam ? { seam: shape.seam } : {}) };
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
  noteLanding(state, state.active.steered); // (the end game watches for a player who stopped trying)

  if (shakesOnLanding(shape) && CONFIG.fx.quake.enabled) {
    addQuakeFromBlocks(state, placed.length);
    // a proper thud, bigger for bigger pieces
    const big = CONFIG.fx.largePieceLock, t = big.trauma ?? {};
    const min = big.minBlocks ?? 0, n = blockCount(shape);
    const f = Math.max(0, Math.min(1, (n - min) / Math.max(1, (t.bigBlocks ?? 60) - min)));
    const floor = (t.small ?? 0.25) + ((t.big ?? 0.5) - (t.small ?? 0.25)) * f;
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
    if (state.zen) zenRescue(state); // zen never ends
    else setGameOver(state, shape);
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

// `alsoRows`: rows to destroy too even if no longer full (the rows a vanishing powerup completed)
function clearFullLines(state, alsoRows = null) {
  const rows = CONFIG.board.rows;
  const cols = CONFIG.board.cols;

  const fullRows = [];
  for (let y = 0; y < rows; y++) {
    const row = state.board[y];
    if (row.every((c) => c !== null) || (alsoRows?.has(y) && row.some(c => c))) fullRows.push(y);
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

  startRowFall(state, dropDistances, rowClearShow(state, fullRows, removed, dropDistances));

  state.lines += cleared;
  state.rowsDestroyed += cleared;
  state.blocksDestroyed += removed.reduce((n, r) => n + r.cells.filter(Boolean).length, 0);

  const base = CONFIG.scoring.lineClear[cleared] ?? (cleared * 100);
  state.score += (base + cleared * cols * (CONFIG.scoring.blockDestroyed ?? 0)) * state.level;

  const newLevel = 1 + Math.floor(state.lines / CONFIG.timing.levelEveryLines);
  if (newLevel !== state.level) {
    state.level = newLevel;
    recomputeSpeed(state);
    emit(state, "levelUp", { level: newLevel });
  }

  addQuakeFromBlocks(state, fallingBlocks);

  const names = CONFIG.fx.callouts.multiRow;
  const word = names[Math.min(cleared, Math.max(...Object.keys(names).map(Number)))];
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

// The rows left come down into the space (`delays`: when each one starts, by its row now; all at
// once without).
function startRowFall(state, dropDistances, delays = null) {
  const rf = state.fx.rowFall;
  rf.active = dropDistances.some(d => d > 0) || !!delays;
  rf.elapsedMs = 0;
  rf.fallMs = CONFIG.fx.lineClear.boardFallAnimMs;
  rf.rowDelays = delays;
  rf.durationMs = rf.fallMs + (delays ? Math.max(0, ...delays) : 0);
  rf.rowDropDistances = dropDistances;
}

function recomputeSpeed(state) {
  if (state.zen) { zenSpeed(state); return; } // (zen: it never speeds up)
  const mult = Math.pow(CONFIG.timing.speedMultiplierPerLevel, state.level - 1);
  state.dropMs = Math.max(CONFIG.timing.minDropMs, Math.floor(CONFIG.timing.baseDropMs * mult));
  if (state.endGameMs != null) state.dropMs = Math.min(state.dropMs, state.endGameMs);
}

// The end game starts ("enter"), is escaped ("exit"), or carries on (null): every piece in it
// falls a bit faster than the last (CONFIG.endGame.speedPerPiece).
function updateEndGame(state, change) {
  const cfg = CONFIG.endGame ?? {};
  // (no callouts, no sounds: the end game is never announced)
  if (change === "enter") {
    state.endGameMs = state.dropMs;
    emit(state, "endGame", { on: true });
  } else if (change === "exit") {
    state.endGameMs = null;
    recomputeSpeed(state);
    emit(state, "endGame", { on: false, escaped: true });
    return;
  }
  if (endGameOn(state) && state.endGameMs != null) {
    state.endGameMs = Math.max(cfg.minDropMs ?? 60, Math.floor(state.endGameMs * (cfg.speedPerPiece ?? 0.92)));
    recomputeSpeed(state);
  }
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
  if (e.keepRows?.size) consumeLeftovers(state, e.pid, e.keepRows);
  state.effect = null;
  finishTurn(state, e.keepRows);
}

// The blocks a vanishing powerup kept (in the rows it completed) go with those rows; any the
// effect threw or dropped somewhere else vanish now.
function consumeLeftovers(state, pid, keepRows) {
  const gone = [];
  state.board.forEach((row, y) => {
    if (keepRows.has(y)) return;
    row.forEach((c, x) => { if (c?.pid === pid) { gone.push({ x, y, cell: c }); row[x] = null; } });
  });
  if (!gone.length) return;
  instancesAfterRemoval(state, gone);
  spawnCellParticles(state, gone, 0.6);
  markBoardDirty(state);
}

// Applies the effect to the board. Returns how long to wait before continuing.
function firePowerupEffect(state, e) {
  const cfg = CONFIG.fx.powerup;
  const cols = CONFIG.board.cols;
  const rows = CONFIG.board.rows;
  const pu = e.pu;

  const fillPid = state.nextPid++;
  const blasts = pu.type === "blast" || pu.parts?.some(p => p.type === "blast");
  const reach = blasts ? Math.max(2, ...e.area.indices.map(i => Math.hypot(i % cols - e.centre.x, ((i / cols) | 0) - e.centre.y))) : 0;
  // A powerup that vanishes when it fires keeps its blocks in any row it completed, and that
  // row is destroyed once the effect has played out, as if the piece had stayed.
  const keepRows = new Set(pu.consume ? e.placed.map(c => c.y).filter(y => state.board[y]?.every(c => c !== null)) : []);
  const fx = computeEffect(state.board, pu, {
    area: e.area, placed: e.placed, pid: e.pid, centre: e.centre, cols, rows, rng: state.rng, keepRows,
    makeFill: () => ({ paint: pu.fillPaint, style: pu.fillStyle, pid: fillPid }),
  });
  // (rows the effect itself collapsed are gone already; the ones above them moved down)
  const gone = new Set(fx.collapsed?.rows ?? []);
  e.keepRows = new Set([...keepRows].filter(y => !gone.has(y)).map(y => y + [...gone].filter(r => r > y).length));

  if (fx.consumed.length) {
    const inst = state.instances.get(e.pid);
    if (keepRows.size && inst) {
      inst.cells = inst.cells.filter(c => keepRows.has(c.y));
      inst.intact = false;
    } else state.instances.delete(e.pid);
  }

  if (fx.destroyed.length) {
    instancesAfterRemoval(state, fx.destroyed);
    state.blocksDestroyed += fx.destroyed.length;
    state.score += fx.destroyed.length * ((CONFIG.scoring.powerupDestroyPerBlock ?? 0) + (CONFIG.scoring.blockDestroyed ?? 0)) * state.level;
  }

  if (fx.collapsed) {
    instancesAfterCollapse(state, fx.collapsed.rows);
    startRowFall(state, fx.collapsed.dropDistances);
    state.rowsDestroyed += fx.collapsed.rows.length;
    state.score += (CONFIG.scoring.lineClear[fx.collapsed.rows.length] ?? fx.collapsed.rows.length * 100) * state.level;
    emit(state, "rowsDestroyed", { count: fx.collapsed.rows.length, source: "powerup" });
  }

  // blocks moved or filled by a powerup score a little too
  state.score += (fx.moves.length + fx.filled.length) * (CONFIG.scoring.powerupMovePerBlock ?? 0) * state.level;
  if (fx.moves.length) instancesAfterMoves(state, fx.moves);

  let affected = fx.destroyed.length + fx.moves.length + fx.filled.length;
  if (pu.type === "phantom") {
    // how many of its blocks ended up under something (= gaps it plugged)
    affected = e.placed.filter(({ x, y }) => {
      for (let yy = y - 1; yy >= 0; yy--) if (state.board[yy][x] && state.board[yy][x].pid !== e.pid) return true;
      return false;
    }).length;
  }

  // the show (render.js draws it): each class has its own, bigger the more it changes
  const show = planShow(state, e, fx, affected, blasts ? reach : 0);

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
  emit(state, "powerupFire", { shape: e.shape, type: pu.type, affected, show });
  if (isBoardEmpty(state) && state.drops > 1) emit(state, "boardCleared");

  return show.settleMs;
}

/* =========================
   The powerup show
   ========================= */

// Which part of the show each kind of powerup plays.
const SHOW_PHASE = { destroyer: "destroy", acid: "destroy", gravity: "move", blast: "move", goo: "move", expander: "fill", phantom: "phantom" };

// A steady jitter from a cell's position, 0-1 (the show never touches the game's random numbers).
function wobble(x, y, k = 0) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

// Plans the show for a powerup that has just fired, and starts its block animations. Each
// class has its own: destroyers pull everything into a core that bursts, gravity trembles and
// drops with a thud, expanders sprout outwards from a pulse, phantoms flicker into being, and
// combos play their parts one after another and finish in a rainbow. The more blocks it
// changes, the bigger the show: big ones freeze for a moment, punch the board, play a little
// slower and leave a moment to take it in (CONFIG.fx.powerup.show).
function planShow(state, e, fx, affected, reach) {
  const S = CONFIG.fx.powerup.show;
  const pu = e.pu;
  const power = clamp01((affected - S.bigFrom) / Math.max(1, S.bigAt - S.bigFrom));
  const hold = Math.round(S.holdMs * power);
  const slow = 1 + S.slowdown * power;
  const kinds = [];
  for (const p of pu.parts ?? [pu]) {
    const k = SHOW_PHASE[p.type];
    if (k && !kinds.includes(k)) kinds.push(k);
  }
  const show = {
    cls: pu.type === "combo" ? "combo" : pu.cls, power, n: affected, holdMs: hold, punch: S.punch * power,
    centre: { x: e.centre.x + 0.5, y: e.centre.y + 0.5 }, area: e.area.indices,
    blocks: [],   // blocks no longer on the board that it still draws (pulled in, fading away)
    pull: null, ghost: null, fills: null, trails: false, tremble: 0, land: null,
    phases: [], quakes: [], finaleAt: null,
    elapsedMs: 0, durationMs: 0, settleMs: 0,
  };
  // (goo flows from where the piece melted to where it settles)
  const gooMoves = fx.filled.filter(f => f.fromX != null).map(f => ({ fromX: f.fromX, fromY: f.fromY, toX: f.x, toY: f.y }));
  const sprouts = fx.filled.filter(f => f.fromX == null);
  const moves = fx.moves.length ? fx.moves : gooMoves;

  let prev = null, end = hold;
  for (const kind of kinds) {
    // each part starts when the one before is most of the way through (a phantom just
    // flickers alongside whatever comes next)
    const start = !prev ? hold : prev.kind === "phantom" ? prev.start : lerp(prev.start, prev.end, S.comboOverlap);
    let stop = null;
    if (kind === "destroy" && (fx.destroyed.length || fx.consumed.length)) stop = planPull(state, show, fx, start, slow);
    else if (kind === "move" && moves.length) stop = startMoveAnim(state, moves, { start, power, slow, show });
    else if (kind === "fill" && sprouts.length) stop = startGrowAnim(state, sprouts, e.centre, { start, show });
    else if (kind === "phantom") stop = planGhost(state, show, e, start, slow);
    if (stop == null) continue;
    const ph = { kind, start, end: stop };
    show.phases.push(ph);
    prev = ph;
    end = Math.max(end, stop);
  }
  // the powerup itself, if it vanished and nothing swallowed it, fades away after the freeze
  if (!show.pull && fx.consumed.length) {
    for (const { x, y, cell } of fx.consumed) show.blocks.push({ x, y, paint: cell.paint, style: cell.style, delay: hold, dur: S.fadeMs, fade: true });
    spawnCellParticles(state, fx.consumed, 0.6, hold);
  }
  if (reach) state.fx.shockwaves.push({ kind: "blast", x: show.centre.x, y: show.centre.y, radius: reach + 1, elapsedMs: -hold, durationMs: 420 * slow });
  if (show.cls === "combo") {
    // the finale: a rainbow ring and a burst of confetti
    const at = Math.max(hold, end - S.finaleLead);
    show.finaleAt = at;
    state.fx.shockwaves.push({ kind: "rainbow", x: show.centre.x, y: show.centre.y, radius: 2.5 + 5 * power + Math.sqrt(affected) * 0.35, elapsedMs: -at, durationMs: 560 * slow });
    confetti(state, show.centre, Math.round(16 + 60 * power), at);
    end = Math.max(end, at + 240);
  }
  show.settleMs = Math.round(Math.max(S.minSettleMs, end) + S.extraMs * power);
  show.durationMs = show.settleMs + S.tailMs;
  state.fx.show = show;
  return show;
}

// Destroyers: every block in the area is pulled into the middle, faster and faster and glowing
// hotter as it goes, and the core bursts when the last one is in. Returns when it's over.
function planPull(state, show, fx, start, slow) {
  const D = CONFIG.fx.powerup.show.destroy;
  const { x: cx, y: cy } = show.centre;
  let last = start;
  const add = (list, own) => {
    for (const { x, y, cell } of list) {
      if (!cell) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const delay = start + (own ? 0 : wobble(x, y) * D.jitterMs);
      const dur = (own ? D.pullMs * 0.6 : D.pullMs + D.msPerSqrtCell * Math.sqrt(d)) * slow;
      show.blocks.push({ x, y, paint: cell.paint, style: cell.style, delay, dur, spin: (wobble(x, y, 1) * 2 - 1) * Math.PI * (0.6 + show.power) });
      last = Math.max(last, delay + dur);
    }
  };
  add(fx.consumed, true); // (the powerup itself goes first)
  add(fx.destroyed, false);
  const popMs = D.popMs * slow, n = fx.destroyed.length;
  show.pull = { start, popAt: last, popMs, r: 0.55 + Math.sqrt(n) * 0.2 + 1.1 * show.power };
  state.fx.shockwaves.push({ kind: "fire", x: cx, y: cy, radius: 1.5 + 2.5 * show.power + Math.sqrt(n) * 0.35, elapsedMs: -last, durationMs: popMs * 1.6 });
  embers(state, show.centre, fx.destroyed, last, show.power);
  show.quakes.push({ at: last, blocks: n * (CONFIG.fx.powerup.destroyQuakePerBlock ?? 1) });
  return last + popMs * 0.5;
}

// Phantoms: the piece flickers into being where it came to rest, wisps rising off it.
function planGhost(state, show, e, start, slow) {
  const ms = CONFIG.fx.powerup.show.phantom.ms * slow;
  show.ghost = { cells: e.placed.filter(c => c.y >= 0), start, ms };
  wisps(state, show.ghost.cells, start, show.power);
  state.fx.shockwaves.push({ kind: "ghost", x: show.centre.x, y: show.centre.y, radius: 2 + 2.5 * show.power, elapsedMs: -start, durationMs: ms * 1.3 });
  return start + ms;
}

// Gravity (and blasts and goo): blocks slide from old to new positions. In a show, a big drop
// trembles first, and blocks squash a little as they land, kicking up dust. Returns when it's over.
function startMoveAnim(state, moves, { start = 0, power = 0, slow = 1, show = null } = {}) {
  const cfg = CONFIG.fx.powerup;
  const G = cfg.show.gravity;
  const cols = CONFIG.board.cols;
  const anim = state.fx.moveAnim;
  anim.byIndex.clear();
  anim.elapsedMs = 0;
  const shake = show && moves.length >= G.trembleFrom ? Math.max(0.35, power) : 0;
  const tremble = shake ? G.trembleMs * shake : 0;
  const go = start + tremble;
  let longest = go, landSum = 0, landN = 0;
  const landings = new Map(); // the lowest block landing in each column

  for (const m of moves) {
    const ox = m.fromX - m.toX;
    const oy = m.fromY - m.toY;
    if (m.path) {
      // a block thrown by a blast: follow its flight path (slowed a little so you can see it)
      const dur = m.flight * 1000 * (cfg.blastTimeScale ?? 1) * slow;
      anim.byIndex.set(m.toY * cols + m.toX, { ox, oy, dur, delay: go, path: m.path, flight: m.flight, spin: m.spin, toX: m.toX, toY: m.toY });
      longest = Math.max(longest, go + dur);
      continue;
    }
    const hasVia = m.viaX != null && (m.viaX !== m.toX || m.viaY !== m.toY);
    const dist = Math.abs(ox) + Math.abs(oy) + (hasVia ? Math.abs(m.viaY - m.toY) : 0);
    const dur = Math.min(cfg.gravityMaxMs * (hasVia ? 1.6 : 1), cfg.gravityBaseMs + cfg.gravityMsPerSqrtCell * Math.sqrt(dist)) * slow;
    const item = { ox, oy, dur, delay: go, tremble: shake, trembleMs: tremble, squash: show && oy < 0 ? Math.min(1, 0.4 - oy / 6) : 0 };
    if (hasVia) { item.vx = m.viaX - m.toX; item.vy = m.viaY - m.toY; }
    anim.byIndex.set(m.toY * cols + m.toX, item);
    longest = Math.max(longest, go + dur);
    if (oy < 0) {
      landSum += go + dur; landN++;
      const l = landings.get(m.toX);
      if (!l || m.toY > l.y) landings.set(m.toX, { x: m.toX, y: m.toY, at: go + dur });
    }
  }

  const squashMs = show ? G.squashMs * slow : 0;
  anim.squashMs = squashMs;
  anim.durationMs = longest + squashMs;
  anim.active = moves.length > 0;
  if (show) {
    show.trails = true;
    show.tremble = tremble;
    show.land = landN ? landSum / landN : longest;
    for (const l of landings.values()) dust(state, l.x, l.y, l.at, 0.6 + power);
    show.quakes.push({ at: show.land, blocks: moves.length * (cfg.gravityQuakePerBlock ?? 1) });
  }
  return longest + squashMs * 0.6;
}

// Expanders: new blocks pop in, in rings outward from the powerup. In a show, a pulse goes out
// first and each block sprouts with a glow and a few sparkles. Returns when it's over.
function startGrowAnim(state, filled, centre, { start = 0, show = null } = {}) {
  const cfg = CONFIG.fx.powerup;
  const cols = CONFIG.board.cols;
  const anim = state.fx.growAnim;
  anim.byIndex.clear();
  anim.elapsedMs = 0;
  anim.growMs = cfg.expandGrowMs;
  let maxDelay = 0, reach = 1;

  for (const { x, y } of filled) {
    const d = Math.hypot(x - centre.x, y - centre.y);
    const delay = start + d * cfg.expandStaggerMsPerCell;
    anim.byIndex.set(y * cols + x, delay);
    maxDelay = Math.max(maxDelay, delay);
    reach = Math.max(reach, d);
  }

  anim.durationMs = filled.length ? maxDelay + cfg.expandGrowMs : 0;
  anim.active = filled.length > 0;
  if (show) {
    show.fills = filled.map(({ x, y }) => ({ x, y, at: anim.byIndex.get(y * cols + x) + cfg.expandGrowMs * 0.6 }));
    const rings = 1 + Math.round(2 * show.power);
    for (let k = 0; k < rings; k++) {
      state.fx.shockwaves.push({ kind: "sonar", x: show.centre.x, y: show.centre.y, radius: reach + 1, elapsedMs: -(start + k * 150), durationMs: 360 + reach * 30 });
    }
    sparkles(state, show.fills, show.power);
  }
  return anim.durationMs;
}

/* --- the show's particles (visual only: their randomness never touches the game's) --- */

// The dramatic pause: sparkles twinkling up out of the board, each the colour of a pixel of the
// piece it comes from (CONFIG.fx.admire; a steady number a second however fast the game runs).
function admire(state, dt) {
  const ad = state.fx.admire, A = CONFIG.fx.admire;
  ad.elapsedMs += dt;
  if (ad.elapsedMs >= ad.durationMs) { state.fx.admire = null; return; }
  const ts = timeScaleOf(state), cellPx = CONFIG.render.cellPx;
  const { cols, rows } = CONFIG.board;
  for (ad.due += A.perSec * dt / ts / 1000; ad.due >= 1; ad.due--) {
    let x = 0, y = 0, cell = null;
    for (let k = 0; k < 8 && !cell; k++) { x = (Math.random() * cols) | 0; y = (Math.random() * rows) | 0; cell = state.board[y][x]; }
    if (!cell) continue;
    const px = cell.paint?.pixels, i = Math.random(), j = Math.random();
    const row = px?.[(j * px.length) | 0];
    const color = (row && typeof row[(i * row.length) | 0] === "string") ? row[(i * row.length) | 0] : paintColour(cell);
    const life = (A.lifeMs[0] + Math.random() * (A.lifeMs[1] - A.lifeMs[0])) * ts;
    addParticle(state, {
      // (drifting up, as slowly in turbo zen as anywhere)
      x: (x + i) * cellPx, y: (y + j) * cellPx, vx: (Math.random() - 0.5) * 14 / ts, vy: -(8 + Math.random() * 22) / ts,
      lifeMs: life, color, glow: true, g: -6 / (ts * ts), drag: 0.6 / ts, shape: "plus", twinkle: true,
      size: A.size[0] + Math.random() * (A.size[1] - A.size[0]),
    });
  }
}

function addParticle(state, p) {
  state.fx.particles.push({ size: CONFIG.fx.lineClear.particleSizePx, ...p, maxLifeMs: p.lifeMs });
}
const hsl = (h, s, l) => `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)`;

// One colour from a block's paint.
function paintColour(cell) {
  const p = cell?.paint;
  if (typeof p === "string") return p;
  const px = p?.pixels;
  if (!px) return cell?.style?.baseColor ?? "#ffffff";
  const mid = px[(px.length / 2) | 0];
  return mid?.find(c => typeof c === "string") ?? px.flat().find(c => typeof c === "string") ?? "#ffffff";
}

// Destroyers: a burst of embers (and bits of what it swallowed) when the core goes.
function embers(state, centre, destroyed, at, power) {
  const cellPx = CONFIG.render.cellPx;
  const own = destroyed.map(d => paintColour(d.cell));
  const n = Math.min(CONFIG.fx.powerup.show.destroy.maxEmbers, Math.round(12 + destroyed.length * (1.2 + power)));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (50 + Math.random() * 220) * (1 + power * 0.8);
    const hot = Math.random() < 0.6 || !own.length;
    addParticle(state, {
      x: centre.x * cellPx, y: centre.y * cellPx, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      lifeMs: 280 + Math.random() * (420 + 500 * power), delayMs: at,
      color: hot ? hsl((350 + Math.random() * 55) % 360, 100, 55 + Math.random() * 25) : own[(Math.random() * own.length) | 0],
      glow: hot, g: hot ? -50 : 320, drag: hot ? 2.6 : 1.6, size: hot ? 2 : 3,
    });
  }
}

// Gravity: a puff of dust where each column lands.
function dust(state, x, y, at, amount) {
  const cellPx = CONFIG.render.cellPx;
  for (let i = 0, n = Math.round(3 + 4 * amount); i < n; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    addParticle(state, {
      x: (x + 0.5 + side * 0.4) * cellPx, y: (y + 1) * cellPx - 1,
      vx: side * (30 + Math.random() * 70), vy: -(10 + Math.random() * 40),
      lifeMs: 240 + Math.random() * 260, delayMs: at,
      color: hsl(240 + Math.random() * 30, 25, 62 + Math.random() * 18), g: 160, drag: 4,
    });
  }
}

// Expanders: a few sparkles as each new block sprouts.
function sparkles(state, fills, power) {
  const cellPx = CONFIG.render.cellPx;
  const each = fills.length > 70 ? 1 : 2;
  for (const f of fills.slice(0, 160)) {
    for (let i = 0; i < each; i++) {
      addParticle(state, {
        x: (f.x + 0.2 + Math.random() * 0.6) * cellPx, y: (f.y + 0.2 + Math.random() * 0.6) * cellPx,
        vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 50 * (1 + power),
        lifeMs: 300 + Math.random() * 380, delayMs: f.at,
        color: hsl(80 + Math.random() * 85, 90, 68 + Math.random() * 14), glow: true, shape: "plus", g: -15, drag: 2,
      });
    }
  }
}

// Phantoms: pale wisps rising off it as it settles.
function wisps(state, cells, at, power) {
  const cellPx = CONFIG.render.cellPx;
  for (const c of cells) {
    for (let i = 0, n = 2 + Math.round(power * 2); i < n; i++) {
      addParticle(state, {
        x: (c.x + Math.random()) * cellPx, y: (c.y + Math.random()) * cellPx,
        vx: (Math.random() - 0.5) * 20, vy: -(25 + Math.random() * 45),
        lifeMs: 500 + Math.random() * 500, delayMs: at + Math.random() * 120,
        color: hsl(175 + Math.random() * 115, 55, 82 + Math.random() * 10), glow: true, g: -25, drag: 1,
      });
    }
  }
}

// Combos: confetti in every colour.
function confetti(state, centre, n, at) {
  const cellPx = CONFIG.render.cellPx;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 200;
    addParticle(state, {
      x: centre.x * cellPx, y: centre.y * cellPx, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      lifeMs: 700 + Math.random() * 600, delayMs: at,
      color: hsl(Math.random() * 360, 95, 62), g: 260, drag: 1.3, size: 2 + (Math.random() < 0.4 ? 1 : 0),
    });
  }
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
function addCallout(state, text, x, y, { big = false, color = null, durationMs = null } = {}) {
  if (!CONFIG.fx.callouts.enabled) return;
  state.fx.callouts.push({ text, x, y, big, color, elapsedMs: 0, durationMs: durationMs ?? CONFIG.fx.callouts.durationMs });
}

// Particles burst from cells [{x, y, cell}] (board coords). `mult` scales the count.
// The row-clear show: a band of light sweeps along each row that goes, and the row scatters as
// it passes, the same every time but more of it the more rows go at once (CONFIG.fx.rowClear's
// tiers): one row's quick sweep, two or three from the middle out, then glow, ripples and sparks,
// rainbow bands weaving back and forth, and for most of the board a cascade from the bottom up
// under a rainbow wash. (Only the look: the board has already collapsed underneath.)
// Returns, for a combo, when each row left starts to come down (by its row now), or null.
function rowClearShow(state, fullRows, removed, dropDistances) {
  const R = CONFIG.fx.rowClear;
  const n = fullRows.length;
  if (!R?.tiers?.length) { spawnCellParticles(state, rowsToCells(removed)); return null; }
  let tier = 0;
  R.tiers.forEach((t, i) => { if (n >= t.rows) tier = i; });
  const T = R.tiers[tier], cols = CONFIG.board.cols;
  const vr = Math.random; // (the look only: the game's own random numbers are left alone)
  const pattern = T.patterns[Math.floor(vr() * T.patterns.length)];
  const order = [...fullRows].sort((a, b) => b - a); // (bottom up)
  const rowAt = new Map(order.map((y, i) => [y, i]));
  const mid = (cols - 1) / 2;
  const colDelay = (x, i) => {
    const f = pattern === "ltr" ? x / (cols - 1) : pattern === "rtl" ? 1 - x / (cols - 1)
      : pattern === "weave" ? (i % 2 ? 1 - x / (cols - 1) : x / (cols - 1))
      : pattern === "edges" ? 1 - Math.abs(x - mid) / mid
      : Math.abs(x - mid) / mid; // ("centre": from the middle out)
    return f * T.sweepMs;
  };
  const rowDelay = (i) => i * (T.rowStaggerMs ?? 0);
  const delayOf = (x, y) => rowDelay(rowAt.get(y) ?? 0) + colDelay(x, rowAt.get(y) ?? 0);
  state.fx.rowClears.push({
    rows: order, tier, n, pattern, elapsedMs: 0, hue: vr() * 360,
    sweepMs: T.sweepMs, rowStaggerMs: T.rowStaggerMs ?? 0, fadeMs: T.fadeMs,
    durationMs: rowDelay(order.length - 1) + T.sweepMs + T.fadeMs + (T.rippleMs ?? 0),
  });
  spawnCellParticles(state, rowsToCells(removed), 1, 0, { delayOf, speed: T.speed ?? 1 });
  // sparks at the head of each sweep
  if (T.sparks) {
    const cellPx = CONFIG.render.cellPx;
    for (const y of order) for (let x = 0; x < cols; x++) for (let k = 0; k < T.sparks; k++) {
      const a = vr() * Math.PI * 2, sp = 60 + vr() * 160 * (T.speed ?? 1), life = 260 + vr() * 380;
      state.fx.particles.push({
        x: (x + vr()) * cellPx, y: (y + vr()) * cellPx, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
        lifeMs: life, maxLifeMs: life, delayMs: delayOf(x, y), size: 2,
        color: T.rainbow ? `hsl(${(vr() * 360) | 0}, 100%, 72%)` : vr() < 0.5 ? "#ffffff" : "#fff4b0",
      });
    }
  }
  if (T.trauma) state.fx.quake.trauma = Math.max(state.fx.quake.trauma ?? 0, T.trauma);
  if (n < 2) return null;
  // A combo goes from the bottom up: each block stays where it was until its moment comes, and
  // then it crumbles (its particles go then too, delayOf); and each row left comes down once the
  // cleared row nearest under where it was has gone.
  const ghosts = [];
  for (const r of removed) r.cells.forEach((c, x) => { if (c) ghosts.push({ x, y: r.y, cell: c, at: delayOf(x, r.y) }); });
  state.fx.ghosts = { cells: ghosts, elapsedMs: 0, durationMs: Math.max(0, ...ghosts.map(g => g.at)) + 1 };
  const gone = (y) => rowDelay(rowAt.get(y)) + T.sweepMs; // (when cleared row y has all gone)
  return dropDistances.map((d, y) => {
    if (!d) return 0;
    const was = y - d;
    let under = Infinity;
    for (const r of fullRows) if (r > was && r < under) under = r;
    return Number.isFinite(under) ? gone(under) : 0;
  });
}

// `opts`: { delayOf(x, y): when each cell goes (ms), speed: how hard it scatters }
function spawnCellParticles(state, cells, mult = 1, delayMs = 0, opts = {}) {
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

    const at = delayMs + (opts.delayOf?.(x, y) ?? 0);
    for (let i = 0; i < targetCount; i++) {
      const angle = state.rng() * Math.PI * 2;
      const speed = lerp(cfg.speedMin, cfg.speedMax, state.rng()) * (opts.speed ?? 1);
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
        delayMs: at,
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
      if (p.delayMs > 0) { p.delayMs -= dt; parts[n++] = p; continue; } // (not yet)
      p.lifeMs -= dt;
      if (p.lifeMs <= 0) continue;

      const k = p.drag != null ? Math.max(0, 1 - p.drag * dtSec) : drag;
      p.vx *= k;
      p.vy = p.vy * k + (p.g ?? cfg.gravityPxPerSec2) * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;

      parts[n++] = p;
    }
    parts.length = n; // compact in place (no per-frame allocation)
  }

  if (state.fx.admire) admire(state, dt);
  const gh = state.fx.ghosts;
  if (gh && (gh.elapsedMs += dt) >= gh.durationMs) state.fx.ghosts = null;

  const sh = state.fx.show;
  if (sh) {
    sh.elapsedMs += dt;
    for (const q of sh.quakes) if (!q.done && sh.elapsedMs >= q.at) { q.done = true; addQuakeFromBlocks(state, q.blocks); }
    if (sh.elapsedMs >= sh.durationMs) state.fx.show = null;
  }

  const rc = state.fx.rowClears;
  if (rc.length) {
    let n = 0;
    for (const c of rc) { c.elapsedMs += dt; if (c.elapsedMs < c.durationMs) rc[n++] = c; }
    rc.length = n;
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

  // (turbo zen: it has landed and the whole board is about to go, so first a dramatic pause,
  // the board all aglow; updateGame carries on when it's over)
  const pause = state.zen ? zenDramatic(state, lockInfo) : 0;
  if (pause > 0) {
    state.active = null;
    dramaticPause(state, pause, lockInfo);
    return;
  }
  afterLock(state, lockInfo);
}

// Everything waits a moment (`ms` of game time), the board all aglow: after a piece has landed
// (`lockInfo`: then it carries on from there) or before one falls (null).
function dramaticPause(state, ms, lockInfo) {
  state.hold = { lockInfo, elapsedMs: 0, durationMs: ms };
  state.fx.admire = { elapsedMs: 0, durationMs: ms, due: 0 };
  emit(state, "dramaticPause", { on: true });
}

function afterLock(state, lockInfo) {
  if (lockInfo.shape.powerup) {
    // The next piece spawns once the effect has played out (finishTurn).
    state.active = null;
    beginPowerupEffect(state, lockInfo);
    return;
  }

  finishTurn(state);
}

function finishTurn(state, alsoRows = null) {
  clearFullLines(state, alsoRows);

  let ok = spawnPiece(state);
  if (!ok && state.zen) { zenRescue(state); ok = spawnPiece(state); }
  if (!ok) setGameOver(state, state.lastLockedShape);
}

// Zen mode never ends: if anything tops out, all but the bottom few rows dissolve.
export function zenRescue(state) {
  const rows = CONFIG.board.rows, cols = CONFIG.board.cols;
  const keep = CONFIG.zen.rescueKeepRows ?? 5;
  const gone = [];
  for (let y = 0; y < rows - keep; y++) for (let x = 0; x < cols; x++) {
    const c = state.board[y][x];
    if (c) { gone.push({ x, y, cell: c }); state.board[y][x] = null; }
  }
  if (!gone.length) return;
  instancesAfterRemoval(state, gone);
  spawnCellParticles(state, gone, 0.5);
  addQuakeFromBlocks(state, gone.length);
  markBoardDirty(state);
  state.blocksDestroyed += gone.length;
  addCallout(state, "phew", cols / 2, rows / 2, { big: true });
  if (state.zen) { state.zen.queue = []; state.zen.movement = null; state.zen.expect = null; }
  emit(state, "zenRescue", { blocks: gone.length });
}

// Zen mode: the name of what it's doing now, drifting up over the board. (`quiet`: just the
// words, not a new movement.)
export function zenCaption(state, text, name = text, { quiet = false, row = null } = {}) {
  const z = CONFIG.zen;
  if (text) addCallout(state, text, CONFIG.board.cols / 2, row ?? z.captionRow ?? 3, { color: z.captionColour, durationMs: z.captionMs });
  if (!quiet) emit(state, "zenMovement", { name, caption: text });
}

export function updateGame(state, dt) {
  updateFX(state, dt);

  if (!state.running || state.gameOver) return;
  if (state.paused) return;

  if (state.zen) zenTick(state, dt); // zen: the autopilot steers (unless the player is)
  if (state.active?.lastChance) state.active.lastChance.elapsedMs += dt;

  // (a dramatic pause: everything waits but the sparkles)
  if (state.hold) {
    const h = state.hold;
    if ((h.elapsedMs += dt) < h.durationMs) return;
    state.hold = null;
    emit(state, "dramaticPause", { on: false, shape: h.lockInfo ? null : state.active?.shape });
    if (h.lockInfo) afterLock(state, h.lockInfo);
    return;
  }

  if (state.effect) {
    updatePowerupEffect(state, dt);
    return;
  }
  if (!state.active) return;

  const baseDropMs = state.dropMs;
  const effectiveDropMs = state.softDropping
    ? Math.max(16, Math.floor(baseDropMs * CONFIG.timing.softDropFactor))
    : baseDropMs;

  // (zen: the autopilot's pieces can fall a few rows a frame)
  const zenMax = state.zen ? zenSteps(state) : null;
  state.dropAccum += dt;
  const maxBacklog = effectiveDropMs * (zenMax ?? CONFIG.timing.maxAccumulatedSteps ?? 2);
  if (state.dropAccum > maxBacklog) state.dropAccum = maxBacklog;

  const maxSteps = zenMax ?? CONFIG.timing.maxFallStepsPerFrame ?? 1;
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

  // (all the time it spends resting on something counts towards its time on the ground)
  if (state.active && !canFall(state)) state.active.groundMs = (state.active.groundMs ?? 0) + dt;

  if (state.locking && state.active && !state.gameOver) {
    state.lockElapsed += dt;

    if (canFall(state)) {
      cancelLock(state);
    } else {
      const delay = currentLockDelayMs(state);
      if (state.lockElapsed >= delay && !lastChance(state)) {
        stepLockAndSpawn(state);
        cancelLock(state);
      }
    }
  }
}

// Drop the active piece straight down and lock it now (the triple tap; and for tests). With
// `lastChance` (the player's own drop), a piece that would top out gets its last chance first.
export function hardDropAndLock(state, { lastChance: allowLastChance = false } = {}) {
  if (!state.active || state.effect || state.hold || state.gameOver) return false;
  while (tryMove(state, 0, 1)) state.score += CONFIG.scoring.hardDropPerCell ?? 0;
  if (allowLastChance && lastChance(state)) { beginLockIfNeeded(state); return false; }
  stepLockAndSpawn(state);
  cancelLock(state);
  return true;
}
