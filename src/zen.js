// ============================================================
// ZEN MODE — the game plays itself, and never ends (no DOM)
// ============================================================
// The autopilot steers each piece, unless the player is steering: it takes back over once
// they've let go for a moment (CONFIG.zen.idleMs). The director decides what comes next, in
// movements: light rain, as it comes, a slow build and its demolition, giants, the well, the
// long fall, and tidying up. Nothing can top it out: if a piece ever locks above the top, the
// board is rescued instead (game.js zenRescue).
//
// The well and the long fall are planned in full before they start, on the board as it is:
// rows built up near the top, complete except for a slot, then exactly the pieces that fill
// the slot, in order, so the whole lot clears. If the player steps in and the board no longer
// matches the plan, the director lets it go and tidies up instead.

import { CONFIG } from "../config.js";
import { tryMove, tryRotate, zenCaption } from "./game.js";
import { selectPiece } from "./selection.js";
import { computeEffect, resolvePowerupArea, phantomLandingY, isPhantomPowerup } from "./powerups.js";
import { expandGroup, roomNeeded, groupUnderWay } from "./level6.js";
import { makeRng, sampleByWeight } from "./util.js";

const LEVEL6 = 6;

// How the autopilot weighs up a placement (higher is better).
//   clear: the usual: keep it low and tidy, clear rows
//   build: build up neatly without clearing anything (for the demolition)
const WEIGHTS = {
  clear: { height: -0.51, lines: 0.76, holes: -0.36, bump: -0.18 },
  build: { height: -0.1, lines: -0.6, holes: -0.9, bump: -0.22 },
};

// How often each movement comes up (never the same twice running).
const MOVEMENT_WEIGHTS = { natural: 3, rain: 1.5, build: 3, giants: 2, well: 2.5, fall: 2.5 };

export function createZen(state) {
  return {
    queue: [],        // what comes next: { shape, weights, target?: {rot, x}, expect?: board after }
    current: null,    // the item being played
    expect: null,     // a planned piece's board once it has landed (to notice the player stepping in)
    movement: null,
    last: null,       // the movement before
    after: null,      // a movement waiting for the board to be tidied first
    inputAt: state.lastInputAt,
    idle: Infinity,   // since the player last pressed anything
    piece: null, target: null, wait: 0, stuck: 0, dropping: false,
    simRng: makeRng(7), // (the autopilot's look-ahead never touches the game's random numbers)
  };
}

// Start `name` at the next piece (for tests and the dev panel).
export function zenStart(state, name) {
  const z = state.zen;
  if (!z) return;
  z.queue = [];
  z.movement = null;
  z.after = name;
  z.expect = null;
}

/* =========================
   The director: what comes next
   ========================= */

// The piece to spawn now (the board has settled). Called by game.js spawnPiece.
export function zenNext(state) {
  const z = state.zen;
  // the player stepped in and the plan no longer fits the board: never mind
  if (z.expect && !sameBoard(occupancy(state.board), z.expect)) {
    z.queue = z.queue.filter(it => !it.expect);
    z.movement = null;
    z.after = null;
    zenCaption(state, "never mind", "abandoned");
  }
  z.expect = null;
  if (!z.queue.length) refill(state);
  const item = z.queue.shift();
  z.current = item;
  z.expect = item.expect ?? null;
  // one more in the queue for the preview, while this movement carries on
  if (!z.queue.length && z.movement && !z.movement.planned && !z.movement.done(state)) z.movement.fill(state);
  return item.shape;
}

// The next piece, for the preview (or null).
export function zenPeek(state) {
  return state.zen?.queue[0]?.shape ?? null;
}

function refill(state) {
  const z = state.zen;
  for (let tries = 0; tries < 5 && !z.queue.length; tries++) {
    if (!z.movement || z.movement.done(state)) begin(state, z.after ?? pickMovement(state));
    z.movement.fill(state);
    if (!z.queue.length) z.movement = null; // nothing came of it (a plan that didn't work out)
  }
  if (!z.queue.length) z.queue.push({ shape: pick(state, smallPool(state)), weights: WEIGHTS.clear });
}

function begin(state, name) {
  const z = state.zen;
  if (z.after === name) z.after = null;
  z.movement = MOVEMENTS[name](state);
  z.movement.name = name;
  z.last = name;
  zenCaption(state, z.movement.caption, name);
}

function pickMovement(state) {
  const z = state.zen;
  const { cols, rows } = CONFIG.board;
  const occ = occupancy(state.board);
  const h = heightOf(occ, cols, rows);
  if (h > rows - CONFIG.zen.headroom - 6) return "tidy"; // getting high: tidy up first
  const options = Object.entries(MOVEMENT_WEIGHTS).filter(([k]) => k !== z.last && !(h > 8 && (k === "natural" || k === "giants")));
  const name = sampleByWeight(options, ([, w]) => w, state.rng)[0];
  // the well and the long fall need a tidy, low board to build on
  if ((name === "well" || name === "fall") && (!solid(occ, cols, rows) || h > 3)) { z.after = name; return "tidy"; }
  return name;
}

const int = (state, a, b) => a + Math.floor(state.rng() * (b - a + 1));
const pick = (state, list) => sampleByWeight(list, s => s.frequency ?? 1, state.rng);

const regularPool = (state) => state.shapes.filter(s => !s.powerup && (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) !== LEVEL6);
const smallPool = (state) => regularPool(state).filter(s => (s.difficulty ?? 1) <= 1 && blocks(s) <= 4);
const giantPool = (state) => regularPool(state).filter(s => (s.difficulty ?? 1) >= 4);
const powerupPool = (state) => state.powerups.filter(p => (p.frequency ?? 1) > 0);
const blocks = (s) => s.rotations[0].reduce((n, r) => n + r.filter(Boolean).length, 0);

// The game's own choice of piece (links, sets, powerups and all), passing over any that would
// stand too tall on the stack as it is (Big Ben only stands upright). A set always carries on.
function naturalPiece(state) {
  let s = null;
  for (let i = 0; i < 5; i++) {
    s = selectPiece(state);
    if (s.difficulty === LEVEL6 || fitsUnder(state, s)) return s;
  }
  return s.difficulty === LEVEL6 ? s : pick(state, smallPool(state));
}

// Would this piece, turned its flattest way, still keep clear of the top?
function fitsUnder(state, shape) {
  const { cols, rows } = CONFIG.board;
  let low = Infinity;
  for (let r = 0; r < reachableTurns(shape); r++) low = Math.min(low, shape.rotations[r].length);
  return heightOf(occupancy(state.board), cols, rows) + low <= rows - CONFIG.zen.headroom + 2;
}

// For a slow build: ordinary pieces, now and then a giant while the stack is still low.
function buildPiece(state) {
  const { cols, rows } = CONFIG.board;
  const low = heightOf(occupancy(state.board), cols, rows) <= 6;
  if (low && state.rng() < 0.15) { const g = giantPool(state).filter(s => fitsUnder(state, s)); if (g.length) return pick(state, g); }
  return pick(state, regularPool(state).filter(s => (s.difficulty ?? 1) <= 3));
}

const MOVEMENTS = {
  // the game as it comes, played well
  natural: (state) => ({
    caption: "as it comes", left: int(state, 20, 35),
    fill(state) { state.zen.queue.push({ shape: naturalPiece(state), weights: WEIGHTS.clear }); this.left--; },
    done(state) { return this.left <= 0 && !groupUnderWay(state); }, // (a set always finishes)
  }),

  // small things, one after another, rows clearing as they go
  rain: (state) => ({
    caption: "light rain", left: int(state, 14, 24),
    fill(state) { state.zen.queue.push({ shape: pick(state, smallPool(state)), weights: WEIGHTS.clear }); this.left--; },
    done() { return this.left <= 0; },
  }),

  // build up a good way without clearing anything, then knock it all down with powerups
  build: (state) => ({
    caption: "a slow build", phase: "build", target: int(state, 10, 14), blasts: 0,
    fill(state) {
      const { cols, rows } = CONFIG.board;
      const h = heightOf(occupancy(state.board), cols, rows);
      if (this.phase === "build" && h >= Math.min(this.target, rows - CONFIG.zen.headroom - 2)) {
        this.phase = "blast";
        zenCaption(state, "demolition", "demolition");
      }
      if (this.phase === "build") state.zen.queue.push({ shape: buildPiece(state), weights: WEIGHTS.build });
      else { state.zen.queue.push({ shape: bestPowerup(state), weights: WEIGHTS.clear }); this.blasts++; }
    },
    done(state) {
      if (this.phase !== "blast") return false;
      const { cols, rows } = CONFIG.board;
      return this.blasts >= 6 || heightOf(occupancy(state.board), cols, rows) <= 4;
    },
  }),

  // the giants: a level 6 set if one fits, or a few giant pieces
  giants: (state) => ({
    caption: "giants", pushed: false,
    fill(state) {
      this.pushed = true;
      const { rows } = CONFIG.board;
      const room = rows - (CONFIG.zen.level6?.headroom ?? 7) - heightOf(occupancy(state.board), CONFIG.board.cols, rows);
      const sets = (state.groups ?? []).filter(g => g.frequency > 0);
      for (let i = 0; i < 4 && sets.length; i++) {
        const g = sampleByWeight(sets, g => g.frequency, state.rng);
        const pieces = expandGroup(g, state.rng, state.pieceSel?.level6?.variants);
        if ((g.room || roomNeeded(pieces)) <= room) {
          for (const s of pieces) state.zen.queue.push({ shape: s, weights: WEIGHTS.clear });
          return;
        }
      }
      const giants = giantPool(state).filter(s => fitsUnder(state, s));
      for (let i = int(state, 2, 3); i > 0 && giants.length; i--) state.zen.queue.push({ shape: pick(state, giants), weights: WEIGHTS.clear });
    },
    done() { return this.pushed; },
  }),

  // rows built up near the top around a narrow well, then the pieces that fill the well
  well: () => ({
    caption: "the well", planned: true, pushed: false,
    fill(state) { this.pushed = true; const items = planWell(state); if (items) state.zen.queue.push(...items); },
    done() { return this.pushed; },
  }),

  // rows built up around the exact outline of one tall piece, and then the piece
  fall: () => ({
    caption: "the long fall", planned: true, pushed: false,
    fill(state) { this.pushed = true; const items = planFall(state); if (items) state.zen.queue.push(...items); },
    done() { return this.pushed; },
  }),

  // powerups until the board is low with no gaps
  tidy: () => ({
    caption: "tidying up", used: 0,
    fill(state) { state.zen.queue.push({ shape: bestPowerup(state), weights: WEIGHTS.clear }); this.used++; },
    done(state) {
      const { cols, rows } = CONFIG.board;
      const occ = occupancy(state.board);
      return this.used >= 6 || (solid(occ, cols, rows) && heightOf(occ, cols, rows) <= 2);
    },
  }),
};

// The powerup (of a handful, at random) that would do the most good on this board.
function bestPowerup(state) {
  const pool = powerupPool(state);
  if (!pool.length) return pick(state, smallPool(state));
  let best = null;
  for (let i = 0; i < CONFIG.zen.powerupChoices; i++) {
    const p = pool[Math.floor(state.rng() * pool.length)];
    const place = bestPlacement(state, p, WEIGHTS.clear, 2);
    if (place && (!best || place.s > best.s)) best = { p, s: place.s };
  }
  return best?.p ?? pool[0];
}

/* =========================
   The autopilot
   ========================= */

// Called every frame (game.js updateGame): steer the falling piece to where it should go.
export function zenTick(state, dt) {
  const z = state.zen;
  if (state.lastInputAt !== z.inputAt) { z.inputAt = state.lastInputAt; z.idle = 0; }
  else z.idle += dt;
  const a = state.active;
  if (!a || state.effect) return;
  if (a !== z.piece) {
    z.piece = a; z.target = null; z.stuck = 0;
    z.wait = CONFIG.zen.firstStepMs;
    if (z.dropping) { state.softDropping = false; z.dropping = false; }
  }
  if (z.idle < CONFIG.zen.idleMs) { z.target = null; return; } // the player has it
  if ((z.wait -= dt) > 0) return;
  z.wait = CONFIG.zen.stepMs;
  if (!z.target) z.target = targetFor(state);
  const t = z.target;
  const stuck = () => { if (++z.stuck >= 3) z.target = { rot: a.rotIdx, x: a.x }; };
  if (t && a.rotIdx !== t.rot) { if (!tryRotate(state)) stuck(); return; }
  if (t && a.x !== t.x) { if (!tryMove(state, Math.sign(t.x - a.x), 0)) stuck(); return; }
  if (!state.softDropping) { state.softDropping = true; z.dropping = true; }
}

function targetFor(state) {
  const z = state.zen, a = state.active;
  const item = z.current;
  if (item?.target && item.shape.id === a.shape.id) return item.target;
  // (with the next piece in mind, if it's known: the moon goes where the earth can stand beside it)
  const best = bestPlacement(state, a.shape, item?.weights ?? WEIGHTS.clear, 4, z.queue[0]?.shape ?? null);
  return best ? { rot: best.rot, x: best.x } : null;
}

// The best place for `shape` (every turn and column, dropped straight down), or null.
// Powerups are tried out on a copy of the board. `maxTurns` limits the turns tried. With `next`
// (an ordinary piece), each place is judged by the best the next piece could do after it.
export function bestPlacement(state, shape, weights = WEIGHTS.clear, maxTurns = 4, next = null) {
  const { cols, rows } = CONFIG.board;
  const occ0 = occupancy(state.board);
  const pu = shape.powerup;
  const phantom = pu && isPhantomPowerup(pu);
  let best = null;
  const turns = Math.min(maxTurns, reachableTurns(shape));
  for (let r = 0; r < turns; r++) {
    const mat = shape.rotations[r], w = mat[0].length;
    for (let x = 0; x + w <= cols; x++) {
      const y = phantom ? phantomLandingY(state.board, x, mat) : dropY(occ0, mat, x, cols, rows);
      if (y == null) continue;
      let occ, lines, bonus = 0;
      if (pu) {
        const res = tryPowerup(state, shape, r, x, y);
        occ = res.occ; lines = res.lines; bonus = res.affected * 0.06;
      } else {
        occ = occ0.slice();
        lines = placeAndClear(occ, mat, x, y, cols, rows);
      }
      const over = mat.some((row, j) => y + j < 0 && row.some(Boolean)) ? 1000 : 0; // it would top out
      let s = score(occ, lines, weights, cols, rows) + bonus - over + z01(state) * 0.01;
      if (next && !next.powerup && !pu && !over) s = Math.max(s - 50, lookAhead(occ, next, weights, cols, rows, lines));
      if (!best || s > best.s) best = { rot: r, x, y, s };
    }
  }
  return best;
}
const z01 = (state) => state.zen?.simRng() ?? 0;

// The best score after the next piece too, on a board `occ` (with `lines` cleared so far).
function lookAhead(occ, shape, weights, cols, rows, lines) {
  let best = -Infinity;
  const turns = reachableTurns(shape);
  for (let r = 0; r < turns; r++) {
    const mat = shape.rotations[r], w = mat[0].length;
    for (let x = 0; x + w <= cols; x++) {
      const y = dropY(occ, mat, x, cols, rows);
      if (y == null || mat.some((row, j) => y + j < 0 && row.some(Boolean))) continue;
      const o = occ.slice();
      const n = placeAndClear(o, mat, x, y, cols, rows);
      best = Math.max(best, score(o, lines + n, weights, cols, rows));
    }
  }
  return best;
}

// A powerup's effect, tried on a copy of the board: { occ, lines, affected }.
function tryPowerup(state, shape, rot, x, y) {
  const { cols, rows } = CONFIG.board;
  const board = state.board.map(r => r.slice());
  const mat = shape.rotations[rot], me = { pid: -1 }, placed = [];
  for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
    if (!mat[j][i] || y + j < 0) continue;
    board[y + j][x + i] = me;
    placed.push({ x: x + i, y: y + j });
  }
  const pu = shape.powerup;
  const keepRows = pu.consume ? new Set(placed.map(c => c.y).filter(yy => board[yy].every(Boolean))) : null;
  const fx = computeEffect(board, pu, {
    area: resolvePowerupArea(pu, rot, x, y, cols, rows), placed, pid: -1,
    centre: { x: x + (mat[0].length - 1) / 2, y: y + (mat.length - 1) / 2 }, cols, rows,
    rng: state.zen?.simRng ?? Math.random, keepRows, makeFill: () => ({ pid: -2 }),
  });
  const occ = occupancy(board);
  return { occ, lines: clearFull(occ, cols, rows), affected: fx.destroyed.length + fx.moves.length + fx.filled.length };
}

// The turns a piece can actually get to: it only turns one way, a quarter at a time, so a turn
// it has to pass through that's wider than the board (Big Ben on its side) is as far as it goes.
export function reachableTurns(shape) {
  const cols = CONFIG.board.cols;
  let n = 1;
  while (n < shape.rotations.length && shape.rotations[n][0].length <= cols) n++;
  return n;
}

/* =========================
   Planning the well and the long fall
   ========================= */

// Rows built up near the top, complete except for a well 1 or 2 columns wide, then the pieces
// that fill the well, bottom up: each one clears the rows it completes.
export function planWell(state) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  if (!solid(occ, cols, rows)) return null;
  const h0 = heightOf(occ, cols, rows);
  const most = rows - CONFIG.zen.headroom - 1;
  const H = Math.min(most, Math.max(h0 + 6, int(state, 10, 16)));
  const w = rng() < 0.6 ? 1 : 2;
  const free = [];
  for (let x = 0; x + w <= cols; x++) {
    let ok = true;
    for (let i = 0; i < w && ok; i++) for (let y = 0; y < rows; y++) if (occ[y * cols + x + i]) { ok = false; break; }
    if (ok) free.push(x);
  }
  if (!free.length) return null;
  const wx = free[Math.floor(rng() * free.length)];
  const need = new Uint8Array(cols * rows), slot = new Uint8Array(cols * rows);
  for (let y = rows - H; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (x >= wx && x < wx + w) slot[y * cols + x] = 1; else need[y * cols + x] = 1;
  }
  const work = occ.slice();
  const fillers = tile(work, need, fillerCandidates(state), rng, cols, rows);
  if (!fillers) return null;
  const keys = tile(work, slot, keyCandidates(state, w, H), rng, cols, rows, 2);
  if (!keys) return null;
  return toItems(occ, [...fillers, ...keys], cols, rows);
}

// Rows built up around the exact outline of one tall piece with a flat top (turned however it
// has to be: Big Ben upside down, say), and then the piece: every row clears at once.
export function planFall(state) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  if (!solid(occ, cols, rows) || heightOf(occ, cols, rows) > 3) return null;
  const keys = [];
  for (const s of plannable(state, 5)) {
    const turns = reachableTurns(s);
    s.rotations.forEach((mat, rot) => {
      const h = mat.length, w = mat[0].length;
      if (rot >= turns || h < 5 || w > cols - 2 || h > rows - CONFIG.zen.headroom - 1) return;
      if (flatTopSolidColumns(mat)) keys.push({ shape: s, rot, mat, h, w });
    });
  }
  for (let tries = 0; tries < 6 && keys.length; tries++) {
    const k = sampleByWeight(keys, c => c.h * c.h, rng);
    const top = rows - k.h;
    const xs = [];
    for (let x = 0; x + k.w <= cols; x++) if (!overlaps(occ, k.mat, x, top, cols)) xs.push(x);
    if (!xs.length) continue;
    const kx = xs[Math.floor(rng() * xs.length)];
    const need = new Uint8Array(cols * rows);
    for (let y = top; y < rows; y++) for (let x = 0; x < cols; x++) need[y * cols + x] = 1;
    for (let j = 0; j < k.h; j++) for (let i = 0; i < k.w; i++) if (k.mat[j][i]) need[(top + j) * cols + kx + i] = 0;
    const work = occ.slice();
    const fillers = tile(work, need, fillerCandidates(state), rng, cols, rows);
    if (!fillers) continue;
    const items = toItems(occ, [...fillers, { shape: k.shape, rot: k.rot, mat: k.mat, x: kx }], cols, rows);
    if (items) return items;
  }
  return null;
}

// Pieces the planner can build with: ones that always arrive the same shape.
function plannable(state, maxDifficulty) {
  return regularPool(state).filter(s => (s.difficulty ?? 1) <= maxDifficulty && !s.remix && !s.powerup);
}

function fillerCandidates(state) {
  return candidates(plannable(state, 3), 5, 5, 9);
}

function keyCandidates(state, w, H) {
  return candidates(plannable(state, 5), w, H, 99);
}

// Every distinct turn of each piece, with the cell the planner lines it up by: the leftmost
// cell of its bottom row.
function candidates(shapes, maxW, maxH, maxCells) {
  const out = [];
  for (const s of shapes) {
    const seen = new Set(), turns = reachableTurns(s);
    s.rotations.forEach((mat, rot) => {
      const h = mat.length, w = mat[0].length;
      if (rot >= turns || w > maxW || h > maxH) return;
      const key = mat.map(r => r.map(Number).join("")).join("/");
      if (seen.has(key)) return;
      seen.add(key);
      const cells = [];
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (mat[j][i]) cells.push([i, j]);
      if (cells.length > maxCells) return;
      out.push({ shape: s, rot, mat, w, h, cells, ax: mat[h - 1].findIndex(Boolean), ay: h - 1, has: new Set(cells.map(([i, j]) => j * 64 + i)) });
    });
  }
  return out;
}

// Fill every `need` cell (that isn't filled yet) with pieces, bottom up and left to right, each
// one dropped straight in and resting on what's below (no overhangs: they'd leave gaps nothing
// could reach). Changes `occ`. Returns the placements in order, or null.
function tile(occ, need, cands, rng, cols, rows, maxUses = 3) {
  const order = cands.map(c => ({ c, k: c.cells.length + rng() * 4 })).sort((a, b) => b.k - a.k).map(o => o.c);
  const uses = new Map(), plan = [];
  const fits = (c, x0, y0) => {
    for (const [i, j] of c.cells) {
      const x = x0 + i, y = y0 + j;
      if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
      const k = y * cols + x;
      if (!need[k] || occ[k]) return false;
    }
    for (const [i, j] of c.cells) {
      const x = x0 + i, y = y0 + j;
      if (y + 1 < rows && !occ[(y + 1) * cols + x] && !c.has.has((j + 1) * 64 + i)) return false; // resting on something
      if (!c.has.has((j - 1) * 64 + i)) for (let yy = y - 1; yy >= 0; yy--) if (occ[yy * cols + x]) return false; // a way in
    }
    return true;
  };
  for (let guard = 0; guard < cols * rows; guard++) {
    let a = -1;
    for (let y = rows - 1; y >= 0 && a < 0; y--) for (let x = 0; x < cols; x++) if (need[y * cols + x] && !occ[y * cols + x]) { a = y * cols + x; break; }
    if (a < 0) return plan;
    const ax = a % cols, ay = (a / cols) | 0;
    let chosen = null;
    for (const pass of [0, 1]) { // (a second pass if every piece that fits has been used enough)
      for (const c of order) {
        if (!pass && (uses.get(c.shape.id) ?? 0) >= maxUses) continue;
        const x0 = ax - c.ax, y0 = ay - c.ay;
        if (fits(c, x0, y0)) { chosen = { c, x0, y0 }; break; }
      }
      if (chosen) break;
    }
    if (!chosen) return null;
    const { c, x0, y0 } = chosen;
    for (const [i, j] of c.cells) occ[(y0 + j) * cols + x0 + i] = 1;
    uses.set(c.shape.id, (uses.get(c.shape.id) ?? 0) + 1);
    plan.push({ shape: c.shape, rot: c.rot, mat: c.mat, x: x0, y: y0 });
  }
  return null;
}

// The plan as queue items, played out on a copy of the board to check that every piece lands
// where it should, with the board each one leaves behind.
function toItems(occ0, steps, cols, rows) {
  const occ = occ0.slice();
  let cleared = 0;
  const items = [];
  for (const st of steps) {
    const y = dropY(occ, st.mat, st.x, cols, rows);
    if (y == null) return null;
    if (!cleared && st.y != null && y !== st.y) return null; // (before anything clears it lands exactly as planned)
    cleared += placeAndClear(occ, st.mat, st.x, y, cols, rows);
    items.push({ shape: st.shape, target: { rot: st.rot, x: st.x }, expect: occ.slice(), weights: WEIGHTS.clear });
  }
  return cleared ? items : null;
}

function flatTopSolidColumns(mat) {
  const h = mat.length, w = mat[0].length;
  for (let x = 0; x < w; x++) {
    if (!mat[0][x]) return false;
    let gap = false;
    for (let y = 1; y < h; y++) {
      if (!mat[y][x]) gap = true;
      else if (gap) return false;
    }
  }
  return true;
}

function overlaps(occ, mat, x0, y0, cols) {
  for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) if (mat[j][i] && occ[(y0 + j) * cols + x0 + i]) return true;
  return false;
}

/* =========================
   Boards as 0/1 per cell
   ========================= */

function occupancy(board) {
  const rows = board.length, cols = board[0].length;
  const occ = new Uint8Array(rows * cols);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (board[y][x]) occ[y * cols + x] = 1;
  return occ;
}

function sameBoard(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function heightOf(occ, cols, rows) {
  for (let i = 0; i < occ.length; i++) if (occ[i]) return rows - ((i / cols) | 0);
  return 0;
}

// No gaps under anything: every column solid from the floor up to its top.
function solid(occ, cols, rows) {
  for (let x = 0; x < cols; x++) {
    let seen = false;
    for (let y = 0; y < rows; y++) {
      if (occ[y * cols + x]) seen = true;
      else if (seen) return false;
    }
  }
  return true;
}

// Where a piece comes to rest dropped straight down from above the board in column x.
function dropY(occ, mat, x, cols, rows) {
  const h = mat.length, w = mat[0].length;
  if (x < 0 || x + w > cols) return null;
  const fits = (y) => {
    for (let j = 0; j < h; j++) {
      const by = y + j;
      if (by < 0) continue;
      if (by >= rows) return false;
      const row = mat[j];
      for (let i = 0; i < w; i++) if (row[i] && occ[by * cols + x + i]) return false;
    }
    return true;
  };
  let y = -h;
  if (!fits(y)) return null;
  while (fits(y + 1)) y++;
  return y;
}

function placeAndClear(occ, mat, x, y, cols, rows) {
  for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
    if (mat[j][i] && y + j >= 0) occ[(y + j) * cols + x + i] = 1;
  }
  return clearFull(occ, cols, rows);
}

function clearFull(occ, cols, rows) {
  let cleared = 0;
  for (let y = rows - 1; y >= 0; y--) {
    let full = true;
    for (let x = 0; x < cols; x++) if (!occ[y * cols + x]) { full = false; break; }
    if (!full) continue;
    occ.copyWithin(cols, 0, y * cols); // everything above drops a row
    occ.fill(0, 0, cols);
    cleared++;
    y++; // (look at this row again)
  }
  return cleared;
}

function score(occ, lines, w, cols, rows) {
  let agg = 0, holes = 0, bump = 0, maxH = 0, prev = -1;
  for (let x = 0; x < cols; x++) {
    let h = 0;
    for (let y = 0; y < rows; y++) {
      if (occ[y * cols + x]) { if (!h) h = rows - y; }
      else if (h) holes++;
    }
    agg += h;
    if (h > maxH) maxH = h;
    if (prev >= 0) bump += Math.abs(h - prev);
    prev = h;
  }
  const over = Math.max(0, maxH - (rows - CONFIG.zen.headroom));
  return w.height * agg + w.lines * lines + w.holes * holes + w.bump * bump - 4 * over * over;
}
