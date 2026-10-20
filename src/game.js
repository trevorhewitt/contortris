// ============================================================
// GAME CORE (no DOM — runs in the browser and in Node tests)
// ============================================================
// Talks to the outside world through events: on(state, fn) receives (type, data).
//   "start"          { mode }
//   "reset"          {}
//   "spawn"          { shape, next, set }       a new piece is falling (set: its level 6 set's id)
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
import { createShelf, shelfReady, shelfQueue, takeShelfPending } from "./shelf.js";
import { gravityColumns } from "./godmode.js";
import { resolveArea, resolvePowerupArea, collapseRows, computeEffect, phantomLandingY, isPhantomPowerup, rollScatter, classOf, comesDown } from "./powerups.js";
import { normaliseGroups, trackLevel6, cutGroup, LEVEL6 } from "./level6.js";
import { trackEndGame, endGameOn, spawnJitter, noteLanding } from "./endgame.js";
import { remixShape } from "./remix.js";
import { createZen, zenNext, zenPeek, zenTick, zenSpawned, zenSpeed, zenSteps, zenLockMs, zenDramatic, reachableTurns } from "./zen.js";
import { buildThreads } from "./threads.js";
import { rampCfg, rampDropMs } from "./difficulty.js";
import { createTutorial, tutorialNext, tutorialTick, tutorialTopOut } from "./tutorial.js";
import { keepParticle, particleLot, alive } from "./particles.js";
import { leaveRemains, ageRemains } from "./remains.js";

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

    // Level 6 groups (shapes/groups.js, src/level6.js): powerups can be in them too
    groups: normaliseGroups(groups, [...shapes, ...powerups]),
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
    flock: [], // turbo zen: pieces falling with the active one (zen.js formFlock)
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
      ace: null,       // an Extra Shiny Piece coming in: rays of light behind it (CONFIG.fx.ace)
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
  // switched-off powerup types (and combos using them) never turn up, and nor do the ones that
  // only ever come in their level 6 set (setOnly: they come with it)
  state.powerups = mode.powerups ? state.allPowerups.filter(p => isPowerupEnabled(p) && !p.powerup.setOnly) : [];
  state.idToShape = new Map();
  for (const s of [...state.shapes, ...state.powerups]) state.idToShape.set(s.id, s);
}

// The pieces that can appear in the current mode (level 6 pieces only come once unlocked, so
// they're left out).
export function currentPool(state) {
  return [...state.shapes, ...state.powerups].filter(s => (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) !== LEVEL6);
}

// A piece as it actually arrives: remixes are rebuilt and scatters re-rolled every time, and
// one that comes straight after itself goes by its `nameAgain` ("another raindrop"). One with
// other names (`names`) goes by one of them now and then; in a level 6 set, by the same one of
// each all the way through the run (they're written to go together: the dog's, the museum's).
function prepareShape(state, shape) {
  let out = rollScatter(remixShape(shape, state.allById, state.rng), state.rng);
  const recent = state.pieceSel?.recentShapeIds ?? [];
  if (out?.nameAgain && recent.length >= 2 && recent[recent.length - 2] === out.id && recent[recent.length - 1] === out.id) {
    out = { ...out, name: out.nameAgain };
  } else if (out?.names?.length) {
    const all = [out.name, ...out.names];
    // (only what it's called: not the game's dice)
    const i = (out.difficulty ?? 1) === LEVEL6 ? state.pieceSel?.level6?.nameIndex ?? 0 : Math.floor(Math.random() * all.length);
    if (all[i % all.length] !== out.name) out = { ...out, name: all[i % all.length] };
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
// (numbered across every board, so a board swapped in for another is never taken for it: the
// home screen has two)
let boardVersions = 0;
export function markBoardDirty(state) {
  state.boardVersion = ++boardVersions;
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
  state.flock = [];
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
  state.tutorial = null;
  state.shelf = null;
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
  fx.ace = null;
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
  // (a fresh board, too, if the board size has changed since: turbo zen filling the window)
  const resized = state.board.length !== CONFIG.board.rows || state.board[0]?.length !== CONFIG.board.cols;
  if (state.running || state.gameOver || state.active || state.drops || resized) resetGame(state);
  configureMode(state, mode);
  initPieceSelectionState(state);
  // Zen mode: the computer plays, or steps in (src/zen.js), and it never ends
  state.zen = CONFIG.modes[state.mode]?.zen ? createZen(state) : null;
  if (state.zen) state.dropMs = CONFIG.zen.dropMs;
  // The tutorial: a page at a time, each with its own board and pieces (src/tutorial.js)
  state.tutorial = CONFIG.modes[state.mode]?.tutorial ? createTutorial(state) : null;
  // The powerup shelf (src/shelf.js): one strong powerup of each class, to use when you choose
  state.shelf = createShelf(state);
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
  const T = CONFIG.timing;
  let delay = recentTouch ? T.lockDelayMsTouch : T.lockDelayMsKeyboard;
  // (the faster they fall, the longer: there's less time to set a piece right on its way down)
  const fast = recentTouch ? T.lockFastMsTouch : T.lockFastMsKeyboard;
  if (fast > delay && T.lockFastAtMs) delay = lerp(delay, fast, clamp01(Math.log(T.baseDropMs / fallMs(state)) / Math.log(T.baseDropMs / T.lockFastAtMs)));
  // (slid or turned along the ground: a little longer, so it can be slid again, up to a point)
  const a = state.active;
  if (a?.groundMoved && !groundSpent(state)) delay = Math.max(delay, T.slideLockMs ?? 0);
  // (on its last chance, while it would still top out: whatever's left of it)
  const lc = a?.lastChance;
  return lc && endsGame(state) ? Math.max(delay, lc.durationMs - lc.elapsedMs) : delay;
}

// Would the falling piece, locked where it is now (or `y`), stick out above the top?
function topsOut(state, y = state.active.y) {
  const mat = getActiveMatrix(state);
  for (let j = 0; j < mat.length; j++) if (y + j < 0 && mat[j].some(Boolean)) return true;
  return false;
}

// ...and would that be game over? Not for a powerup that vanishes when it goes off, nor for one
// that comes down when it does (comesDown) far enough to fit: tried out on a copy of the board.
function endsGame(state, y = state.active.y) {
  if (!topsOut(state, y)) return false;
  const pu = state.active.shape.powerup;
  if (pu?.consume) return false;
  if (!comesDown(pu)) return true;
  const { shape, rotIdx, x } = state.active, mat = shape.rotations[rotIdx];
  const { cols, rows } = CONFIG.board, me = { pid: -1 };
  const board = state.board.map(r => r.slice()), placed = [], above = [];
  for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
    if (!mat[j][i]) continue;
    if (y + j < 0) above.push({ x: x + i, y: y + j, cell: me });
    else { board[y + j][x + i] = me; placed.push({ x: x + i, y: y + j }); }
  }
  const fx = computeEffect(board, pu, {
    area: resolvePowerupArea(pu, rotIdx, x, y, cols, rows), placed, above, pid: -1, cols, rows,
    centre: { x: x + (mat[0].length - 1) / 2, y: y + (mat.length - 1) / 2 }, rng: () => 0.5, makeFill: () => ({ pid: -2 }),
  });
  return fx.overTop.length > 0;
}

// ...or where it would land, dropped straight down from here? (Not: it's safe now, on its way down
// to somewhere with room. Its last chance stops flashing.)
function landsOverTop(state) {
  return endsGame(state, Math.max(state.active.y, getGhostDropY(state) ?? state.active.y));
}

// About to lock where it would end the game, sticking out above the top? Once per piece, it gets
// another moment (CONFIG.timing.lastChanceMs): it flashes red, the board warns, and it can still be moved.
function lastChance(state) {
  const a = state.active, ms = CONFIG.timing.lastChanceMs ?? 0;
  if (!ms || state.zen || a.lastChance || !endsGame(state)) return false;
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
// (active.unkickedX). A big piece that won't turn gets more chances (turnBig), so one that's just
// been turned can always be turned back.
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
    return turned(state, nextIdx, nx, a.y, pushed ? baseX : null);
  }
  const R = CONFIG.rotation;
  if (phantom || Math.max(w, nextMat.length) < (R?.bigFrom ?? Infinity)) return false;
  return turnBig(state, 1) || turnBig(state, -1);
}

// The falling piece turns to rotation idx, at (x, y). (Its middle just before, for turnBig.)
function turned(state, idx, x, y, unkickedX) {
  const a = state.active;
  a.turnMid = a.y + (getActiveMatrix(state).length - 1) / 2;
  a.rotIdx = idx;
  a.x = x;
  a.y = y;
  a.unkickedX = unkickedX;
  a.steered = true;
  if (state.locking) a.groundMoved = true;
  if (!groundSpent(state)) cancelLock(state);
  return true;
}

// A big piece (CONFIG.rotation.bigFrom cells long or more) that won't turn the usual way: the
// nearest spot it will turn in, about its corner or its middle, after a move it could make as it
// is (a column or two sideways where it could slide, then straight down, or up through nothing).
// It may rise, but its middle never ends up higher than it was just before it last turned (or
// than it is now, if it hasn't turned yet), so turning can't make it climb. dir: 1 the usual way
// round, -1 back the way it came.
function turnBig(state, dir) {
  const a = state.active, rots = a.shape.rotations, R = CONFIG.rotation;
  const idx = (a.rotIdx + dir + rots.length) % rots.length;
  const cur = rots[a.rotIdx], next = rots[idx];
  const W = cur[0].length, H = cur.length, w = next[0].length, h = next.length;
  const highest = a.turnMid ?? a.y + (H - 1) / 2;
  const base = a.unkickedX ?? a.x; // (back where it was before a push)
  const pivots = [[0, 0], [Math.trunc((W - w) / 2), Math.trunc((H - h) / 2)]];
  // could the piece as it is move by (dx, 0), then by (0, dy), one cell at a time?
  const path = (dx, dy) => {
    for (let s = Math.sign(dx), x = s; x !== dx + s; x += s) if (collides(state, a.x + x, a.y, cur)) return false;
    for (let s = Math.sign(dy), y = s; y !== dy + s; y += s) if (collides(state, a.x + dx, a.y + y, cur)) return false;
    return true;
  };
  for (const [dx, dy] of bigMoves(R)) {
    if (!path(dx, dy)) continue;
    for (const [px, py] of pivots) {
      const free = base + dx + px, x = Math.max(0, Math.min(CONFIG.board.cols - w, free)), y = a.y + dy + py;
      if (y + (h - 1) / 2 < highest || collides(state, x, y, next)) continue;
      return turned(state, idx, x, y, x !== free ? free : null);
    }
  }
  return false;
}

// The moves turnBig tries, nearest first (then down before up, and less sideways before more).
const bigMovesMemo = new Map();
function bigMoves(R) {
  const key = `${R.bigShift},${R.bigDrop},${R.bigLift}`;
  if (bigMovesMemo.has(key)) return bigMovesMemo.get(key);
  const list = [];
  for (let dy = -R.bigLift; dy <= R.bigDrop; dy++) for (let dx = -R.bigShift; dx <= R.bigShift; dx++) list.push([dx, dy]);
  const rank = (dy) => (dy > 0 ? 2 * dy - 1 : -2 * dy);
  list.sort((p, q) => Math.abs(p[0]) + Math.abs(p[1]) - Math.abs(q[0]) - Math.abs(q[1]) || rank(p[1]) - rank(q[1]) || Math.abs(p[0]) - Math.abs(q[0]) || p[0] - q[0]);
  bigMovesMemo.set(key, list);
  return list;
}

/* =========================
   Spawning and locking
   ========================= */

function spawnPiece(state) {
  // the board has settled: did the player just dig back down far enough to open level 6?
  if (state.pieceSel && trackLevel6(state)) emit(state, "level6Unlocked", {});
  // ...or reach two thirds of the board (the end game), or dig their way out of it?
  if (state.pieceSel && !state.zen) updateEndGame(state, trackEndGame(state));
  // (the speed goes with how far into the game it is, as well as the rows: src/difficulty.js)
  if (rampCfg(state)?.speed && !state.zen) recomputeSpeed(state);
  let shape, rotIdx = 0, at = null;
  const shelved = takeShelfPending(state);
  if (shelved) {
    // a powerup off the shelf (useShelf, below), taken while nothing was falling: it comes now
    // (and one waiting its turn, asked for by name, still waits)
    shape = prepareShape(state, shelved);
  } else if (state.tutorial) {
    // the tutorial: the page says what comes, turned and where (src/tutorial.js); with nothing
    // more to come, the board waits for the page to go round again
    const t = tutorialNext(state);
    if (!t) { state.active = null; return true; }
    ({ shape, rot: rotIdx, x: at } = t);
    state.next = null;
  } else if (state.zen) {
    // zen: the director picks each piece as it's needed, on the board as it is now
    shape = prepareShape(state, zenNext(state));
    state.next = zenPeek(state);
  } else {
    // Picked now, on the board as it is: nothing shows what's coming, so nothing's picked ahead.
    // (Unless one's waiting its turn: asked for by name, in dev mode and the tests.)
    const waiting = state.next;
    state.next = null;
    shape = notDeadly(state, waiting ?? prepareShape(state, selectPiece(state)));
    // (a powerup with nothing to do here, one asked for ahead of time: one of the same outline
    // that can, unless it was asked for by name)
    const swap = state.nextChosen ? { shape } : stillUseful(state, shape);
    if (swap.shape !== shape) { shape = prepareShape(state, swap.shape); rotIdx = swap.rot; }
    state.nextChosen = false;
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
  // (zen: it starts out already turned, over the place it's going, if the computer has it)
  if (state.zen) zenSpawned(state, { bay: !!shelved });
  if (at != null) state.active.x = at; // (the tutorial's pieces start where the page says)
  // (with no room for any of it to come onto the board there, under a stack right up to the top,
  // it comes down somewhere it can: the piece that ends a game is one the player sees)
  else if (!state.zen && !isPhantomPowerup(shape.powerup)) state.active.x = roomToEnter(state, mat, state.active.x);
  // (an Extra Shiny Piece is put straight onto the top of the board, if there's room for it there)
  if (shelved && !collides(state, state.active.x, 0, mat)) state.active.y = 0;
  const pauseFirst = state.zen?.pauseFirst ?? 0;

  const ok = isPhantomPowerup(shape.powerup) || !collides(state, state.active.x, state.active.y, getActiveMatrix(state));
  if (ok) {
    // (an Extra Shiny Piece: it comes in with rays of light behind it. render.js drawAce)
    if (shelved) state.fx.ace = { piece: state.active, elapsedMs: 0, seed: Math.random() * 1000, ...pieceCentre(state.active) };
    // First powerup of a class in this game: the UI shows that class's intro screen now, just
    // before it falls.
    const isNew = introduce(state, shape);
    // (the first of its class: its piece in the bay waits until it's down on the board. shelf.js)
    if (isNew) state.active.firstOfClass = shape.powerup.cls;
    // (zen can say something else in place of the name: "Oops, all bagpipes!")
    // (set: the level 6 set it's one of, if it is)
    const set = !shelved && state.pieceSel?.fromSet ? state.pieceSel.level6?.lastGroup ?? null : null;
    emit(state, "spawn", { shape, next: state.next, isNew, label: state.zen?.current?.label ?? null, set });
    // (turbo zen: a powerup that's about to take most of the board waits up there a moment first)
    if (pauseFirst > 0) dramaticPause(state, pauseFirst, null);
  }
  return ok;
}

// Where a piece can come down onto the board from, starting at column x0: x0, if any of it would
// get onto the board there, dropped straight down; or else the nearest column where it would land
// without sticking out over the top, and failing that, where the most of it would get on. (Nowhere
// at all: x0.)
function roomToEnter(state, mat, x0) {
  const cols = CONFIG.board.cols, w = mat[0].length;
  const onBoard = (x) => {
    let y = -mat.length;
    while (!collides(state, x, y + 1, mat)) y++;
    return mat.reduce((n, row, j) => n + (y + j >= 0 ? row.filter(Boolean).length : 0), 0);
  };
  if (onBoard(x0) > 0) return x0;
  const all = mat.reduce((n, row) => n + row.filter(Boolean).length, 0);
  let best = x0, most = 0;
  for (let d = 1; d < cols; d++) for (const x of [x0 - d, x0 + d]) {
    if (x < 0 || x + w > cols) continue;
    const n = onBoard(x);
    if (n === all) return x;
    if (n > most) { best = x; most = n; }
  }
  return best;
}

// Has this powerup's class been introduced yet in this game? (Before it has, a next-piece
// preview, where there is one, shows it as a plain piece.)
export function introduced(state, shape) {
  const cls = shape?.powerup?.cls;
  return !cls || !!state.zen || !!state.pieceSel?.powerup?.shownClasses?.has(cls);
}

// A powerup has been seen: its class counts as met from now on. True if that's the first of
// its class this game (time for its intro screen).
function introduce(state, shape) {
  const ps = state.pieceSel?.powerup, type = shape?.powerup?.cls;
  if (!ps || !type) return false;
  const isNew = !ps.shownClasses.has(type);
  ps.shown.add(shape.id);
  ps.shownClasses.add(type);
  if (!ps.classes.includes(type)) ps.classes.push(type); // (e.g. picked in dev mode)
  return isNew;
}

// A giant, or a level 6 set's piece, that couldn't go anywhere without sticking out over the top
// (an instant game over) doesn't come: something to make room comes instead (a big destroyer, or
// a small piece without powerups). A set ends there, and doesn't come back.
function notDeadly(state, shape) {
  if (shape.powerup || (shape.difficulty ?? 1) < 4) return shape;
  if (fitsSomewhere(state, shape)) return shape;
  if ((shape.difficulty ?? 1) === LEVEL6 && state.pieceSel?.level6) cutGroup(state);
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

// The player takes a powerup off the shelf (src/shelf.js): the falling piece bursts into bits, and
// the powerup comes in at the top in its place (or, with nothing falling just now, as the next
// thing to come).
// `i`: the slot; left out, the next in the bay's queue (shelfQueue). True if it was taken.
export function useShelf(state, i) {
  const slot = i == null ? shelfQueue(state)[0] : state.shelf?.slots[i];
  if (!shelfReady(state, slot) || state.paused || state.shelf.pending) return false;
  slot.left--;
  state.shelf.pending = slot.shape;
  state.shelf.undo = null;
  emit(state, "shelf", { slot, cls: slot.cls });
  if (state.active && !state.effect && !state.hold) {
    // (the piece it takes the place of, as it was, for a second tap to bring back: undoShelf)
    const was = { piece: { ...state.active }, dropAccum: state.dropAccum, locking: state.locking, lockElapsed: state.lockElapsed };
    cancelLock(state);
    state.softDropping = false;
    shatter(state, state.active); // (it bursts into bits: the show only)
    state.active = null;
    if (!spawnPiece(state)) setGameOver(state, slot.shape);
    else state.shelf.undo = { slot, ...was, ace: state.active, ms: 0 };
  }
  return true;
}

// Can the Extra Shiny Piece just taken off the shelf still be sent back (undoShelf)? Only while
// it's falling: not once it has landed (it never can again), or locked, or gone off.
export function canUndoShelf(state) {
  const u = state.shelf?.undo, a = state.active;
  return !!u && !!a && a === u.ace && state.running && !state.gameOver && !state.paused && !state.effect && !state.hold
    && !state.locking && !a.lastChance && canFall(state);
}

// A second tap on the bay (or Shift) while the Extra Shiny Piece it sent is still falling: it goes
// back to the front of the bay's queue, and the piece it took the place of comes back as it was
// (the same piece, turned the same way, in the same column). But no time is gained: it comes back
// as far down as it would have fallen by now had it kept falling (on the ground, its time there
// counting on), so this undoes a tap by mistake and is never a way to step back. True if it did.
export function undoShelf(state) {
  if (!canUndoShelf(state)) return false;
  const sh = state.shelf, u = sh.undo, ace = state.active;
  sh.undo = null;
  u.slot.left++;
  const i = sh.slots.indexOf(u.slot);
  sh.order = [i, ...sh.order.filter(j => j !== i)];
  if (state.fx.ace?.piece === ace) state.fx.ace = null;
  const piece = state.active = { ...u.piece };
  if (piece.lastChance) piece.lastChance = { ...piece.lastChance, elapsedMs: piece.lastChance.elapsedMs + u.ms };
  // (nothing has changed under it while the other one fell: where it was still fits; if not, the
  // nearest place up from there that does)
  while (piece.y > -getActiveMatrix(state).length && collides(state, piece.x, piece.y, getActiveMatrix(state))) piece.y--;
  // the rows it would have fallen in the time, at its own pace (not the player's soft drop), and
  // once on the ground, the time it would have spent there
  const fall = fallMs(state);
  let t = u.dropAccum + u.ms, locking = u.locking, lockElapsed = u.locking ? u.lockElapsed + u.ms : 0, ground = u.locking ? u.ms : 0;
  while (!locking && t >= fall) {
    t -= fall;
    if (canFall(state)) piece.y++;
    else { locking = true; lockElapsed = t; ground = t; }
  }
  state.dropAccum = locking ? 0 : t;
  state.locking = locking;
  state.lockElapsed = locking ? lockElapsed : 0;
  if (ground) piece.groundMs = (piece.groundMs ?? 0) + ground;
  state.softDropping = false;
  sendBack(state, ace, piece);
  emit(state, "shelfUndo", { slot: u.slot, cls: u.slot.cls });
  return true;
}

// Debug helper: make `shape` the next piece (it waits its turn: spawnPiece).
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

// Writes a piece ({ shape, rotIdx, x, y }) into the board, as a new piece instance.
function placePiece(state, piece) {
  const { shape, rotIdx } = piece;
  const mat = shape.rotations[rotIdx];
  const pid = state.nextPid++;

  let lockedAboveTop = false;
  const placed = [], above = [];

  for (let y = 0; y < mat.length; y++) {
    for (let x = 0; x < mat[0].length; x++) {
      if (!mat[y][x]) continue;

      const bx = piece.x + x;
      const by = piece.y + y;
      const cell = { paint: getShapePaint(shape, rotIdx, x, y), style: shape.style, pid, ...(shape.seam ? { seam: shape.seam } : {}) };

      // (above the top: not on the board, but a powerup that comes down can bring it with it)
      if (by < 0) {
        lockedAboveTop = true;
        above.push({ x: bx, y: by, cell });
        continue;
      }

      state.board[by][bx] = cell;
      placed.push({ x: bx, y: by });
    }
  }
  markBoardDirty(state);

  state.instances.set(pid, {
    shape, rotIdx,
    x: piece.x, y: piece.y,
    cells: placed.map(c => ({ ...c })),
    total: Math.max(1, placed.length),
    intact: !lockedAboveTop,
  });
  return { pid, placed, above, lockedAboveTop };
}

// Locks the active piece into the board. Returns info about the placement.
function lockPiece(state) {
  const { shape, rotIdx } = state.active;
  // (turbo zen: anything still falling with it lands first; its rows clear with this one's. But
  // what a powerup brought along carries on coming down while it goes off: updateGame)
  if (state.flock.length && !shape.powerup) settleFlock(state);
  const { pid, placed, above, lockedAboveTop } = placePiece(state, state.active);

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

  // A powerup that vanishes when it fires can't top you out, and one that comes down when it fires
  // only does if it still sticks out once it has (updatePowerupEffect).
  const consumed = !!shape.powerup?.consume;
  if (lockedAboveTop && comesDown(shape.powerup)) info.above = above;
  else if (lockedAboveTop && !consumed) toppedOut(state, shape);

  return info;
}

// Locked sticking out above the top: game over (zen never ends, nor developer mode).
function toppedOut(state, shape) {
  if (neverEnds(state)) zenRescue(state);
  else setGameOver(state, shape);
}

// Turbo zen's flock (zen.js formFlock): pieces falling with the active one, each in columns of
// its own. Each falls at its own pace and locks the moment it lands, clearing nothing: the
// active piece waits for them all (zenLockMs), and its lock clears every full row.
function updateFlock(state, dt) {
  const steps = CONFIG.zen.maxStepsPerFrame ?? 3;
  for (const f of state.flock) {
    if (f.landed) continue;
    const mat = f.shape.rotations[f.rotIdx];
    f.accum = Math.min(f.accum + dt, f.dropMs * steps);
    while (f.accum >= f.dropMs && !f.landed) {
      f.accum -= f.dropMs;
      if (!collides(state, f.x, f.y + 1, mat)) f.y++;
      else landFlock(state, f);
    }
  }
  state.flock = state.flock.filter(f => !f.landed);
}

// ...all of them, straight down, now (the player took over, or the active piece locked).
export function settleFlock(state) {
  for (const f of state.flock) {
    if (f.landed) continue;
    const mat = f.shape.rotations[f.rotIdx];
    while (!collides(state, f.x, f.y + 1, mat)) f.y++;
    landFlock(state, f);
  }
  state.flock = [];
}

function landFlock(state, f) {
  f.landed = true;
  const { pid, placed, lockedAboveTop } = placePiece(state, f);
  state.drops++;
  if (shakesOnLanding(f.shape) && CONFIG.fx.quake.enabled) addQuakeFromBlocks(state, placed.length);
  state.score += placed.length * (CONFIG.scoring.placePerBlock ?? 0) * state.level;
  emit(state, "lock", {
    shape: f.shape, pid, cells: placed, drops: state.drops, flock: true,
    inside: (zone = "inside") => insidePairs(state, pid, zone),
    onBoard: () => [...state.instances.values()].filter(i => i.cells.length && i.shape).map(i => i.shape),
  });
  if (lockedAboveTop) zenRescue(state); // (zen never ends)
}

function setGameOver(state, shape) {
  if (state.gameOver) return;
  if (state.tutorial) { tutorialTopOut(state); return; } // (the tutorial can't be lost: the page starts again)
  state.gameOver = true;
  state.running = false;
  state.effect = null;
  state.active = null;
  state.flock = [];
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

// A piece's last block has gone: the game says so, and the piece can have last words
// (shape.onDeath).
function pieceGone(state, pid, inst, at = null) {
  const words = inst.shape?.onDeath;
  // (a little above where it was, clear of the name of any rows that went with it, and lingering)
  const C = CONFIG.fx.callouts ?? {}, cols = CONFIG.board.cols;
  if (words && at) addCallout(state, words, Math.max(3, Math.min(cols - 3, at.x + 0.5)), Math.max(1, at.y - 2), { color: C.mournColour ?? "#ffc4d6", durationMs: (C.durationMs ?? 1200) * 1.6 });
  emit(state, "pieceGone", { pid, shape: inst.shape, drops: state.drops });
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
    const last = inst.cells[inst.cells.length - 1];
    inst.cells = cells;
    if (!cells.length) { state.instances.delete(pid); pieceGone(state, pid, inst, last); continue; }
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
    if (!inst.cells.length) { state.instances.delete(cell.pid); pieceGone(state, cell.pid, inst, { x, y }); }
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
  leaveRemains(state, rowsToCells(removed)); // (their art stays where they were: src/remains.js)
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
  if (state.zen) { zenSpeed(state); return; } // (zen: its own pace, src/zen.js)
  // (nor developer mode: CONFIG.modes.dev.steady)
  const mult = Math.pow(CONFIG.timing.speedMultiplierPerLevel, CONFIG.modes[state.mode]?.steady ? 0 : state.level - 1);
  // (Classic and God mode: limited during the climb, and quicker every piece after it:
  // src/difficulty.js)
  state.dropMs = rampDropMs(state, Math.max(CONFIG.timing.minDropMs, Math.floor(CONFIG.timing.baseDropMs * mult)));
  if (state.endGameMs != null) state.dropMs = Math.min(state.dropMs, state.endGameMs);
}

// The end game starts ("enter"), is escaped ("exit"), or carries on (null): every piece in it
// falls a bit faster than the last (CONFIG.endGame.speedPerPiece).
function updateEndGame(state, change) {
  const cfg = CONFIG.endGame ?? {};
  // (no callouts: the end game is never announced)
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
   (both at the show's speed: showSpeed)
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
    speed: showSpeed(state),
    quakeOnSettle: 0,
  };
  emit(state, "powerupCharge", { shape });
}

function updatePowerupEffect(state, dt) {
  const e = state.effect;
  e.elapsedMs += dt * e.speed;
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
  // (it locked sticking out above the top, came down, and still does: it tops out after all)
  if (e.overTop?.length) {
    toppedOut(state, e.shape);
    if (state.gameOver) return;
  }
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
    area: e.area, placed: e.placed, above: e.above, pid: e.pid, centre: e.centre, cols, rows, rng: state.rng, keepRows,
    makeFill: () => ({ paint: pu.fillPaint, style: pu.fillStyle, pid: fillPid }), at: { rot: e.rotIdx, x: e.x, y: e.y },
  });
  // (the art of the blocks it destroyed stays where they were, a Destroyerz's own too, as it goes
  // with everything else in its area: src/remains.js)
  const ownGone = [pu, ...(pu.parts ?? [])].some(p => classOf(p.type) === "destroyer") ? fx.consumed : [];
  leaveRemains(state, [...ownGone, ...fx.destroyed, ...rowsToCells(fx.collapsed?.removed ?? [])]);
  e.overTop = fx.overTop;
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
  // (its blocks that were above the top are part of it again, where they came down to; any still
  // up there aren't)
  const inst = e.above?.length ? state.instances.get(e.pid) : null;
  if (inst) { inst.cells.push(...e.above.map(({ x, y }) => ({ x, y }))); inst.intact = true; }
  if (fx.moves.length) instancesAfterMoves(state, fx.moves);
  if (inst) {
    inst.cells = inst.cells.filter(c => c.y >= 0);
    inst.total = Math.max(1, inst.cells.length);
    if (fx.overTop.length) inst.intact = false;
  }

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

// How fast it all plays (CONFIG.fx.powerup.speed): its timings this many times as fast, and as
// the game gets faster, faster in step with the fall (the speed now against the speed it started
// at: CONFIG.difficulty's in Classic and God mode, CONFIG.timing's in the others), up to maxSpeed.
// The zen modes keep their own pace (turbo zen's is timed round its shows), and the tutorial,
// its pages each falling at a pace of their own, plays it as at the start of a game.
export function showSpeed(state) {
  const P = CONFIG.fx.powerup;
  if (state.zen) return 1;
  const start = rampCfg(state)?.speed?.fromMs ?? CONFIG.timing.baseDropMs;
  const faster = state.tutorial ? 1 : Math.max(1, start / state.dropMs);
  return Math.min(P.maxSpeed ?? Infinity, (P.speed ?? 1) * faster);
}

// Plans the show for a powerup that has just fired, and starts its block animations. Each
// class has its own: destroyers pull everything into a core that bursts, gravity trembles and
// drops with a thud, expanders sprout outwards from a pulse, phantoms flicker into being, and
// combos play their parts one after another and finish in a rainbow. The more blocks it
// changes, the bigger the show: big ones freeze for a moment, punch the board, play a little
// slower and leave a moment to take it in (CONFIG.fx.powerup.show). All of it plays at the
// effect's speed (showSpeed).
function planShow(state, e, fx, affected, reach) {
  const S = CONFIG.fx.powerup.show;
  const pu = e.pu;
  const { particles, shockwaves } = state.fx, had = [particles.length, shockwaves.length];
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
    elapsedMs: 0, durationMs: 0, settleMs: 0, speed: e.speed,
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
    else if (kind === "fill" && sprouts.length) stop = startGrowAnim(state, sprouts, e.centre, { start, show, from: e.placed });
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
    // the finale: the rainbow running out from the middle along every part of it, every cell it
    // touched (a long one lights up all the way along), sparks flying off all along it, a
    // rainbow ring and a burst of confetti
    const at = Math.max(hold, end - S.finaleLead);
    show.finaleAt = at;
    show.sweep = comboSweep(e, show.centre, at, slow);
    sparksAlong(state, show.sweep);
    state.fx.shockwaves.push({ kind: "rainbow", x: show.centre.x, y: show.centre.y, radius: 2.5 + 5 * power + Math.sqrt(affected) * 0.35, elapsedMs: -at, durationMs: 560 * slow });
    confetti(state, show.centre, Math.round(10 + 40 * power), at);
    end = Math.max(end, at + 240, show.sweep.last + show.sweep.ms * 0.6);
  }
  // (the particles and rings it set going play at its speed too: updateFX)
  for (let i = had[0]; i < particles.length; i++) particles[i].speed = show.speed;
  for (let i = had[1]; i < shockwaves.length; i++) shockwaves[i].speed = show.speed;
  show.settleMs = Math.round(Math.max(S.minSettleMs, end) + S.extraMs * power);
  show.durationMs = show.settleMs + S.tailMs;
  state.fx.show = show;
  return show;
}

// A combo's rainbow, cell by cell: every cell of each part's area, and the piece itself, each lit
// in turn the further it is from the middle ({ cells: [{ x, y, type, at }], ms, last }).
function comboSweep(e, centre, at, slow) {
  const C = CONFIG.fx.powerup.show.comboSweep ?? {}, cols = CONFIG.board.cols;
  const types = new Map();
  (e.pu.parts ?? []).forEach((p, k) => { for (const i of e.area.parts?.[k]?.indices ?? []) if (!types.has(i)) types.set(i, p.type); });
  for (const { x, y } of e.placed) if (y >= 0 && !types.has(y * cols + x)) types.set(y * cols + x, "combo");
  const cells = [];
  let last = at;
  for (const [i, type] of types) {
    const x = i % cols, y = (i / cols) | 0;
    const t = at + Math.hypot(x + 0.5 - centre.x, y + 0.5 - centre.y) * (C.msPerCell ?? 30) * slow;
    cells.push({ x, y, type, at: t });
    last = Math.max(last, t);
  }
  return { cells, ms: (C.ms ?? 460) * slow, last };
}

// ...and sparks flying off it all along, each as its cell lights up.
function sparksAlong(state, sweep) {
  const cellPx = CONFIG.render.cellPx, share = CONFIG.fx.powerup.show.comboSweep?.sparks ?? 0.3;
  for (const c of sweep.cells) {
    if (Math.random() >= share) continue;
    const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 120;
    addParticle(state, {
      x: (c.x + 0.5) * cellPx, y: (c.y + 0.5) * cellPx, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
      lifeMs: 500 + Math.random() * 500, delayMs: c.at,
      color: "#ffffff", chroma: true, glow: true, g: 240, drag: 1.4, size: 2 + (Math.random() < 0.3 ? 1 : 0),
    });
  }
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
  anim.speed = show?.speed ?? 1;
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
function startGrowAnim(state, filled, centre, { start = 0, show = null, from = null } = {}) {
  const cfg = CONFIG.fx.powerup;
  const cols = CONFIG.board.cols;
  const anim = state.fx.growAnim;
  anim.byIndex.clear();
  anim.elapsedMs = 0;
  anim.speed = show?.speed ?? 1;
  anim.growMs = cfg.expandGrowMs;
  let maxDelay = 0, reach = 1;

  // (it flows out of the piece through what it fills: down the columns, round what's in the way;
  // a part it can't reach that way, say the far side of a block, as the crow flies)
  const steps = new Map();
  if (from?.length) {
    const inFill = new Set(filled.map(({ x, y }) => y * cols + x)), queue = [];
    for (const p of from) { const k = p.y * cols + p.x; if (p.y >= 0 && !steps.has(k)) { steps.set(k, 0); queue.push(p); } }
    for (let i = 0; i < queue.length; i++) {
      const { x, y } = queue[i], d = steps.get(y * cols + x);
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const k = ny * cols + nx;
        if (nx < 0 || nx >= cols || ny < 0 || !inFill.has(k) || steps.has(k)) continue;
        steps.set(k, d + 1);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  for (const { x, y } of filled) {
    const d = steps.get(y * cols + x) ?? Math.hypot(x - centre.x, y - centre.y);
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

// (fewer of them while the frames lag: src/particles.js)
function addParticle(state, p) {
  if (!keepParticle()) return;
  state.fx.particles.push({ size: CONFIG.fx.lineClear.particleSizePx, ...p, maxLifeMs: p.lifeMs, lot: particleLot() });
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

// The falling piece an Extra Shiny Piece takes the place of (useShelf): it bursts into bits, each
// block's own colours flying out from the middle of it, and sparks (CONFIG.fx.ace).
function shatter(state, piece) {
  const A = CONFIG.fx.ace, cellPx = CONFIG.render.cellPx;
  const { shape, rotIdx } = piece, mat = shape.rotations[rotIdx];
  const { x: cx, y: cy } = pieceCentre(piece);
  const blocks = mat.flat().filter(Boolean).length;
  const each = Math.max(1, Math.min(A.bits, Math.round(A.maxBits / Math.max(1, blocks))));
  const r = (lo, hi) => lo + Math.random() * (hi - lo);
  for (let y = 0; y < mat.length; y++) for (let x = 0; x < mat[y].length; x++) {
    if (!mat[y][x]) continue;
    const paint = getShapePaint(shape, rotIdx, x, y);
    const own = typeof paint === "string" ? [paint] : (paint?.pixels ?? []).flat().filter(c => typeof c === "string");
    for (let i = 0; i < each + A.sparks; i++) {
      const bx = piece.x + x + Math.random(), by = piece.y + y + Math.random();
      const d = Math.hypot(bx - cx, by - cy) || 1, sp = r(A.speed[0], A.speed[1]);
      const spark = i >= each; // (the last ones: sparks)
      addParticle(state, {
        x: bx * cellPx, y: by * cellPx,
        vx: (bx - cx) / d * sp + r(-40, 40), vy: (by - cy) / d * sp - r(40, 120),
        lifeMs: r(A.lifeMs[0], A.lifeMs[1]),
        ...(spark ? { color: "#ffffff", chroma: true, glow: true, g: 220, drag: 1.5, size: 2 }
          : { color: own.length ? own[(Math.random() * own.length) | 0] : shape.style?.baseColor ?? "#ffffff", g: 380, drag: 1.3, size: Math.random() < 0.4 ? 4 : 3 }),
      });
    }
  }
}

// An Extra Shiny Piece sent back (undoShelf): the arrival the other way round, and light. A few
// sparks go up off it, and a few bits of the piece it took the place of, in its own colours, fly
// back in to it from round about.
function sendBack(state, ace, piece) {
  const cellPx = CONFIG.render.cellPx, r = (lo, hi) => lo + Math.random() * (hi - lo);
  const cells = (p) => p.shape.rotations[p.rotIdx].flatMap((row, y) => row.flatMap((on, x) => (on ? [{ x: p.x + x, y: p.y + y }] : [])));
  for (const c of cells(ace)) {
    addParticle(state, {
      x: (c.x + Math.random()) * cellPx, y: (c.y + Math.random()) * cellPx, vx: r(-20, 20), vy: -r(60, 160),
      lifeMs: r(300, 550), color: "#ffffff", chroma: true, glow: true, g: 0, drag: 1.5, size: 2,
    });
  }
  const { x: cx, y: cy } = pieceCentre(piece);
  for (const c of cells(piece)) {
    const paint = getShapePaint(piece.shape, piece.rotIdx, c.x - piece.x, c.y - piece.y);
    const own = typeof paint === "string" ? [paint] : (paint?.pixels ?? []).flat().filter(k => typeof k === "string");
    for (let i = 0; i < 2; i++) {
      const tx = c.x + Math.random(), ty = c.y + Math.random(), d = Math.hypot(tx - cx, ty - cy) || 1, out = r(1.5, 3), ms = r(220, 320);
      const sx = tx + (tx - cx) / d * out, sy = ty + (ty - cy) / d * out;
      addParticle(state, {
        x: sx * cellPx, y: sy * cellPx, vx: (tx - sx) * cellPx / (ms / 1000), vy: (ty - sy) * cellPx / (ms / 1000),
        lifeMs: ms, color: own.length ? own[(Math.random() * own.length) | 0] : piece.shape.style?.baseColor ?? "#ffffff", g: 0, drag: 0, size: 3,
      });
    }
  }
}

// The middle of a piece, in cells (as it's turned now)
function pieceCentre(piece) {
  const mat = piece.shape.rotations[piece.rotIdx];
  return { x: piece.x + mat[0].length / 2, y: piece.y + mat.length / 2 };
}

// Combos: confetti, white squares split into the warm rainbow (render.js drawChromaSquare).
function confetti(state, centre, n, at) {
  const cellPx = CONFIG.render.cellPx;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 200;
    addParticle(state, {
      x: centre.x * cellPx, y: centre.y * cellPx, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      lifeMs: 700 + Math.random() * 600, delayMs: at,
      color: "#ffffff", chroma: true, glow: true, g: 260, drag: 1.3, size: 2 + (Math.random() < 0.4 ? 1 : 0),
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
  if (!CONFIG.fx.callouts.enabled || CONFIG.modes[state.mode]?.callouts === false) return; // (the home screen's: no words)
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
  // sparks at the head of each sweep (white squares split into the warm rainbow: render.js)
  if (T.sparks) {
    const cellPx = CONFIG.render.cellPx;
    for (const y of order) for (let x = 0; x < cols; x++) for (let k = 0; k < T.sparks; k++) {
      if (!keepParticle()) continue; // (fewer while the frames lag: src/particles.js)
      const a = vr() * Math.PI * 2, sp = 60 + vr() * 160 * (T.speed ?? 1), life = 260 + vr() * 380;
      state.fx.particles.push({
        x: (x + vr()) * cellPx, y: (y + vr()) * cellPx, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50,
        lifeMs: life, maxLifeMs: life, delayMs: delayOf(x, y), size: T.rainbow && vr() < 0.35 ? 3 : 2,
        color: "#ffffff", chroma: true, glow: true, lot: particleLot(),
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
      const x0 = px + state.rng() * cellPx, y0 = py + state.rng() * cellPx;
      const color = colours[Math.floor(state.rng() * colours.length)];
      // (fewer while the frames lag, src/particles.js; but the game's own random numbers drawn
      // for every one all the same, so the game goes on just as it would have)
      if (!keepParticle()) continue;

      state.fx.particles.push({
        x: x0,
        y: y0,
        vx,
        vy,
        lifeMs,
        maxLifeMs: lifeMs,
        delayMs: at,
        size: cfg.particleSizePx,
        color,
        lot: particleLot(),
      });
    }
  }
}

function updateFX(state, dt) {
  const dtSec = dt / 1000;

  const parts = state.fx.particles;
  if (parts.length) {
    const cfg = CONFIG.fx.lineClear;
    let n = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!alive(p)) continue; // (thinning out while the frames lag: src/particles.js)
      const t = dt * (p.speed ?? 1), sec = t / 1000; // (a show's, at its speed: planShow)
      if (p.delayMs > 0) { p.delayMs -= t; parts[n++] = p; continue; } // (not yet)
      p.lifeMs -= t;
      if (p.lifeMs <= 0) continue;

      const k = Math.max(0, 1 - (p.drag ?? cfg.dragPerSecond) * sec);
      p.vx *= k;
      p.vy = p.vy * k + (p.g ?? cfg.gravityPxPerSec2) * sec;
      p.x += p.vx * sec;
      p.y += p.vy * sec;

      parts[n++] = p;
    }
    parts.length = n; // compact in place (no per-frame allocation)
  }

  if (state.fx.admire) admire(state, dt);
  // (an Extra Shiny Piece coming in: its rays go with it while it falls, and stay where it landed)
  const ace = state.fx.ace;
  if (ace && (ace.elapsedMs += dt) >= CONFIG.fx.ace.ms) state.fx.ace = null;
  else if (ace && state.active === ace.piece) Object.assign(ace, pieceCentre(state.active));
  const gh = state.fx.ghosts;
  if (gh && (gh.elapsedMs += dt) >= gh.durationMs) state.fx.ghosts = null;

  const sh = state.fx.show;
  if (sh) {
    sh.elapsedMs += dt * sh.speed;
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
    for (const w of sw) { w.elapsedMs += dt * (w.speed ?? 1); if (w.elapsedMs < w.durationMs) sw[n++] = w; }
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
    anim.elapsedMs += dt * (anim.speed ?? 1);
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
  // (any a powerup brought along that haven't landed yet land now, before the rows go)
  if (state.flock.length) settleFlock(state);
  clearFullLines(state, alsoRows);

  let ok = spawnPiece(state);
  if (!ok && neverEnds(state)) { zenRescue(state); ok = spawnPiece(state); }
  if (!ok) setGameOver(state, state.lastLockedShape);
}

// (zen, and developer mode: CONFIG.modes.dev.rescue)
const neverEnds = (state) => !!state.zen || CONFIG.modes[state.mode]?.rescue === true;

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
  leaveRemains(state, gone); // (their art stays where they were: src/remains.js)
  instancesAfterRemoval(state, gone);
  spawnCellParticles(state, gone, 0.5);
  addQuakeFromBlocks(state, gone.length);
  markBoardDirty(state);
  state.blocksDestroyed += gone.length;
  if (CONFIG.modes[state.mode]?.captions !== false) addCallout(state, "phew", cols / 2, rows / 2, { big: true });
  if (state.zen) { state.zen.queue = []; state.zen.movement = null; state.zen.expect = null; }
  for (const f of state.flock) f.landed = true;
  state.flock = [];
  emit(state, "zenRescue", { blocks: gone.length });
}

// Zen mode: the name of what it's doing now, drifting up over the board. (`quiet`: just the
// words, not a new movement.)
export function zenCaption(state, text, name = text, { quiet = false, row = null } = {}) {
  const z = CONFIG.zen;
  // (a mode can do without the words: turbo zen, CONFIG.modes.turbo.captions)
  if (text && CONFIG.modes[state.mode]?.captions !== false) addCallout(state, text, CONFIG.board.cols / 2, row ?? z.captionRow ?? 3, { color: z.captionColour, durationMs: z.captionMs });
  if (!quiet) emit(state, "zenMovement", { name, caption: text });
  else emit(state, "zenAside", { name, caption: text }); // (a bed or a patch on the way up)
}

export function updateGame(state, dt) {
  updateFX(state, dt);

  if (!state.running || state.gameOver) return;
  if (state.paused) return;
  ageRemains(state, dt / timeScaleOf(state)); // (what destroyed blocks left fades away: src/remains.js)
  // (an Extra Shiny Piece that can still be sent back: how long it's been falling, undoShelf; once
  // it has landed, it never can be)
  if (state.shelf?.undo) { if (canUndoShelf(state)) state.shelf.undo.ms += dt; else state.shelf.undo = null; }

  if (state.zen) zenTick(state, dt); // zen: the autopilot steers (unless the player is)
  // (the tutorial: its autopilot shows the moves, and when a page starts or goes round again,
  // its first piece comes now)
  if (state.tutorial && tutorialTick(state, dt)) spawnPiece(state);
  if (state.active?.lastChance) {
    const lc = state.active.lastChance;
    lc.elapsedMs += dt;
    lc.safe = !landsOverTop(state);
  }

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
    // (turbo zen: the pieces a powerup brought along are still coming down while it goes off)
    if (state.flock.length) updateFlock(state, dt);
    if (state.effect) updatePowerupEffect(state, dt);
    return;
  }
  if (state.flock.length) updateFlock(state, dt);
  if (!state.active) return;

  const baseDropMs = fallMs(state);
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

// How long the falling piece takes to fall a row: the game's speed, but the biggest level 6
// pieces a little slower, the bigger the slower, for the sense of scale (CONFIG.difficulty[mode]
// .slowBig; not the small ones in a set). Never slower than the game was at the start.
export function fallMs(state) {
  const a = state.active, big = rampCfg(state)?.slowBig;
  if (!a || !big || state.zen || (a.shape.difficulty ?? 1) !== LEVEL6) return state.dropMs;
  const size = bigness(a.shape);
  if (size < (big.size ?? Infinity)) return state.dropMs;
  const t = clamp01((size - big.size) / Math.max(1, (big.full ?? big.size) - big.size));
  const slow = lerp(big.least ?? 1, big.most ?? 1, t);
  return Math.max(state.dropMs, Math.round(Math.min(state.dropMs * slow, rampCfg(state).speed?.fromMs ?? Infinity)));
}
// (its blocks, or half its width × height if that's more: a big sprawling one counts as big)
const bigness = (shape) => { const m = shape.rotations[0]; return Math.max(blockCount(shape), 0.5 * m.length * m[0].length); };

// Drop the active piece straight down and lock it now (the double tap; and for tests). With
// `lastChance` (the player's own drop), a piece that would top out gets its last chance first.
export function hardDropAndLock(state, { lastChance: allowLastChance = false } = {}) {
  if (!state.active || state.effect || state.hold || state.gameOver) return false;
  while (tryMove(state, 0, 1)) state.score += CONFIG.scoring.hardDropPerCell ?? 0;
  if (allowLastChance && lastChance(state)) { beginLockIfNeeded(state); return false; }
  stepLockAndSpawn(state);
  cancelLock(state);
  return true;
}
