// ============================================================
// ZEN MODE — the game plays itself, and never ends (no DOM)
// ============================================================
// Zen is for playing, slowly. Each piece comes down at an easy pace, and the computer turns it
// and moves it over to where it would put it, a step at a time; it's in the computer's hands
// until the player touches it, and then it's theirs (the game never moves it back) until the
// next piece. Left alone a while, it carries on by itself, a little quicker. It keeps the board
// low and tidy and never builds anything up; now and then a little run of something (a few
// bees, a red patch, the same piece twice), and when the player leaves it high or full of gaps,
// a little help (CONFIG.zen.calm).
//
// Turbo zen is for watching. Each piece arrives already turned and over the place it's going,
// and falls quickly into it, sliding in under an overhang at the bottom if it has to. The
// director decides what comes next, in movements, and mostly it builds the board right up to
// the brink and then brings it all down: rows built around a slot and then the one piece that
// fills it (the tallest pieces fill a slot the whole height of the board), perfect beds for
// awkward giants one on top of another, a crack running through every row that a run of
// phantoms seals, a mess that powerups demolish, a board full of nothing but spam... with
// quieter interludes between. Small and repetitive things come down faster; the big moments
// take their time (CONFIG.zen.pace).
//
// Nothing can top either out. If the player builds it up into danger, a big powerup comes
// ("steady"), and if a piece ever does lock above the top, the board is rescued instead
// (game.js zenRescue). If the player steps in during a planned movement and the board no longer
// matches the plan, the director says "never mind" and tidies up.

import { CONFIG } from "../config.js";
import { tryMove, tryRotate, zenCaption } from "./game.js";
import { selectPiece, destroyerCells } from "./selection.js";
import { gravityColumns } from "./godmode.js";
import { computeEffect, resolvePowerupArea, phantomLandingY, isPhantomPowerup } from "./powerups.js";
import { expandGroup, roomNeeded, groupUnderWay } from "./level6.js";
import { makeRng, sampleByWeight } from "./util.js";
import { colourFamily } from "./threads.js";

const LEVEL6 = 6;

// How the autopilot weighs up a placement (higher is better).
//   clear: the usual: keep it low and tidy, clear rows
//   build: build up neatly without clearing anything (for the demolition)
//   holey: build up evenly, leaving gaps (for the gravitizers and phantoms to sort out)
//   grow:  (for expanders) the more blocks the better, nothing cleared
// headroom: rows it keeps clear at the top (CONFIG.zen.headroom if not given)
const WEIGHTS = {
  clear: { height: -0.51, lines: 0.76, holes: -0.36, bump: -0.18 },
  build: { height: -0.1, lines: -0.6, holes: -0.9, bump: -0.22, headroom: 3 },
  holey: { height: -0.2, lines: -1.6, holes: 0.35, bump: -0.32, headroom: 4 },
  grow: { height: 0.08, lines: -2, holes: -0.4, bump: -0.15, headroom: 3 },
};

// How often each movement comes up (never the same twice running), in zen and in turbo zen.
// (Zen keeps it low and easy: mostly the game as it comes, with a little run of something now
// and then. Turbo zen leans hard on the ones that fill the screen, and above all the ones made
// of one family of pieces; the ones that just fill it at random come up less, so it stays lively.)
const MOVEMENT_WEIGHTS = {
  zen: { natural: 5, rain: 1, family: 1.6, colours: 1, twos: 0.7 },
  turbo: { natural: 0.25, rain: 0.15, build: 0.5, giants: 0.3, column: 2.5, beds: 2, crack: 2, mess: 0.9, fall: 0.3, well: 0.3, chorus: 1.2,
    mono: 5, small: 0.8, big: 0.8, standing: 2, colour: 2.5, squares: 1.6, waves: 2, blackholes: 1, expanders: 1 },
};
// (the ones that need a low, tidy board to build on)
const PLANNED = new Set(["column", "beds", "crack", "fall", "well", "mess", "standing", "colour", "squares"]);
// (the ones happy to carry on from whatever the last one left behind)
const BLENDS = new Set(["build", "chorus", "mono", "small", "big", "waves", "expanders", "blackholes"]);

const zenSet = (state) => (CONFIG.modes[state.mode]?.zenMovements === "turbo" ? "turbo" : "zen");
// (zen itself, slow and easy, as opposed to turbo zen)
const isCalm = (state) => !!CONFIG.modes[state.mode]?.calm;
// Left alone long enough, zen carries on by itself, a little quicker.
const dozing = (state) => { const z = state.zen; return isCalm(state) && z.clock - z.inputClock >= CONFIG.zen.calm.idleMs; };

export function createZen(state) {
  return {
    queue: [],        // what comes next: { shape, weights, target?: {rot, x}, expect?: board after, pace?, key? }
    current: null,    // the item being played
    expect: null,     // a planned piece's board once it has landed (to notice the player stepping in)
    movement: null,
    last: null,       // the movement before
    after: zenSet(state) === "zen" ? "natural" : null, // a movement waiting for the board to be tidied first (zen starts as the game would)
    inputAt: state.lastInputAt,
    piece: null,      // the falling piece the computer is placing
    target: null,     // where it's going
    userHas: false,   // the player has taken this piece over
    userAt: null,     // (the last time they did: state.drops)
    clock: 0, inputClock: 0, // (game time, and when the player last pressed anything: zen dozes off without them)
    helpedAt: -99,    // (zen: the last little help, state.drops)
    pace: 1, lastId: null, fall: 24, rest: 0, blocks: null,
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
  const { cols, rows } = CONFIG.board;
  const occ = occupancy(state.board);
  // the player stepped in and the plan no longer fits the board: never mind
  if (z.expect && !sameBoard(occ, z.expect)) {
    z.queue = z.queue.filter(it => !it.expect);
    z.movement = null;
    z.after = null;
    zenCaption(state, "never mind", "abandoned");
  }
  z.expect = null;
  if (!z.queue.length) refill(state);
  // in danger, and not on purpose: a big powerup first. The fills and plans go right up to the
  // brink on purpose; the player building it up is another matter, and so is a piece with
  // nowhere to go.
  if (!z.queue[0].expect && inDanger(state, occ, z.queue[0])) {
    z.queue.unshift({ shape: bigPowerup(state), weights: WEIGHTS.clear, emergency: true });
    zenCaption(state, "steady", "steady");
  } else if (isCalm(state) && !z.queue[0].shape.powerup && needsHelp(state, occ)) {
    // zen: left high or full of gaps, a little help (now and then)
    const g = gaps(state);
    z.queue.unshift({ shape: g > 6 ? consolidator(state) : bestPowerup(state), weights: WEIGHTS.clear });
    z.helpedAt = state.drops;
    zenCaption(state, "a little help", "help");
  }
  const item = z.queue.shift();
  // (after a big clearance, a breath before the next piece)
  const n = occ.reduce((a, b) => a + b, 0);
  const gone = z.blocks != null ? z.blocks - n : 0;
  z.rest = gone >= 30 ? Math.min(CONFIG.zen.restMs, gone * 10) : 0;
  z.blocks = n + blocks(item.shape);
  z.current = item;
  z.expect = item.expect ?? null;
  // one more in the queue for the preview, while this movement carries on
  if (!z.queue.length && z.movement && !z.movement.planned && !z.movement.done(state)) z.movement.fill(state);
  return item.shape;
}

// Too close to the top: the player has been playing and built it up (CONFIG.zen.dangerRows from
// the top), or the next piece has nowhere to go that doesn't stick out over the top.
function inDanger(state, occ, item) {
  const z = state.zen, { cols, rows } = CONFIG.board;
  const h = heightOf(occ, cols, rows);
  const danger = isCalm(state) ? CONFIG.zen.calm.dangerRows : CONFIG.zen.dangerRows;
  if (z.userAt != null && state.drops - z.userAt <= 8 && h >= rows - danger) return true;
  if (h < rows - CONFIG.zen.brinkRows || item.shape.powerup) return false;
  const best = bestPlacement(state, item.shape, item.weights ?? WEIGHTS.clear, 4);
  return !best || best.s < -500;
}

// Zen: high (CONFIG.zen.calm.helpHeight of the board) or full of gaps, and no help for a while.
function needsHelp(state, occ) {
  const C = CONFIG.zen.calm, { cols, rows } = CONFIG.board;
  if (state.drops - state.zen.helpedAt < C.helpEvery) return false;
  return heightOf(occ, cols, rows) > rows * C.helpHeight || gaps(state) > C.helpGaps;
}

// The next piece, for the preview (or null).
export function zenPeek(state) {
  return state.zen?.queue[0]?.shape ?? null;
}

function refill(state) {
  const z = state.zen;
  for (let tries = 0; tries < 6 && !z.queue.length; tries++) {
    if (!z.movement || z.movement.done(state)) begin(state, pickMovement(state));
    z.movement.fill(state);
    if (!z.queue.length) z.movement = null; // nothing came of it (a plan that didn't work out)
  }
  if (!z.queue.length) z.queue.push({ shape: pick(state, smallPool(state)), weights: WEIGHTS.clear });
}

function begin(state, name) {
  const z = state.zen;
  if (z.after === name) { z.after = null; z.waited = 0; }
  z.movement = MOVEMENTS[name](state);
  z.movement.name = name;
  z.last = name;
  // (a planned one says what it is once it knows it can be done)
  if (z.movement.caption && !z.movement.planned) zenCaption(state, z.movement.caption, name);
}

// The next movement: the one waiting (`z.after`), or one at random (never the same twice running).
function pickMovement(state) {
  const z = state.zen;
  const { cols, rows } = CONFIG.board;
  const occ = occupancy(state.board);
  const h = heightOf(occ, cols, rows);
  if (z.after && !PLANNED.has(z.after)) return z.after;
  // (zen: never building anything up, so no waiting for a tidy board)
  if (isCalm(state)) return sampleByWeight(Object.entries(MOVEMENT_WEIGHTS.zen).filter(([k]) => k !== z.last), ([, w]) => w, state.rng)[0];
  if (!z.after) {
    let options = Object.entries(MOVEMENT_WEIGHTS[zenSet(state)]).filter(([k]) => k !== z.last);
    // left high: tidy up first, or now and then just carry on building on what's there
    if (h > 9) {
      if (h > CONFIG.board.rows - 8 || state.rng() < 0.5) return "tidy";
      options = options.filter(([k]) => BLENDS.has(k));
    }
    z.after = sampleByWeight(options, ([, w]) => w, state.rng)[0];
    z.waited = 0;
  }
  // the planned ones need a low, tidy board to build on (and if it won't tidy, never mind)
  if (PLANNED.has(z.after) && (!solid(occ, cols, rows) || h > 2)) {
    if ((z.waited = (z.waited ?? 0) + 1) <= 2) return "tidy";
    z.after = null;
    return pickMovement(state);
  }
  return z.after;
}

const int = (state, a, b) => a + Math.floor(state.rng() * (b - a + 1));
const pick = (state, list) => sampleByWeight(list, s => s.frequency ?? 1, state.rng);
const stackHeight = (state) => heightOf(occupancy(state.board), CONFIG.board.cols, CONFIG.board.rows);

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
function fitsUnder(state, shape, headroom = CONFIG.zen.headroom - 2) {
  const { rows } = CONFIG.board;
  let low = Infinity;
  for (let r = 0; r < reachableTurns(shape); r++) low = Math.min(low, shape.rotations[r].length);
  return stackHeight(state) + low <= rows - headroom;
}

// Ordinary pieces, now and then a giant while the stack is still low enough for one.
function buildPiece(state) {
  if (state.rng() < 0.15) { const g = giantPool(state).filter(s => fitsUnder(state, s, 4)); if (g.length) return pick(state, g); }
  return pick(state, regularPool(state).filter(s => (s.difficulty ?? 1) <= 3));
}

function giantPiece(state) {
  const g = giantPool(state).filter(s => fitsUnder(state, s, 4));
  return g.length ? pick(state, g) : buildPiece(state);
}

// Build up to `target` rows with next() pieces (placed with `weights`), keeping one column clear
// all the way down so nothing clears on the way up, then bring it all down: sometimes one of
// the tallest pieces drops into that column (`keyChance`), or else the powerups, the biggest first.
function fillThenBlast(caption, next, { target, weights = WEIGHTS.build, pace = 1, maxPieces = 70, keyChance = 0.5, blastWith = null, blasts = 7 } = {}) {
  return {
    caption, pace, phase: "fill", target, blasts: 0, pieces: 0, weights: null, leave: 3,
    fill(state) {
      const { cols, rows } = CONFIG.board;
      if (!this.weights) {
        this.weights = { ...weights, well: Math.floor(state.rng() * cols) };
        // (on top of whatever's there; and now and then it leaves some behind for the next)
        this.target = Math.min(rows - 3, Math.max(this.target, stackHeight(state) + 5));
        if (state.rng() < 0.3) this.leave = int(state, 5, 8);
      }
      if (this.phase === "fill" && (stackHeight(state) >= this.target || this.pieces >= maxPieces)) {
        this.phase = "blast";
        this.pace = 1;
        const wx = this.weights.well, keys = zenKeys(state).filter(k => k.rotations[0][0].length === 1);
        const occ = occupancy(state.board);
        // (only if the column is still clear, and most of the rows would go)
        if (keys.length && state.rng() < keyChance && colTop(occ, wx, cols, rows) === rows && rowsReady(occ, wx, cols, rows) >= 0.7 * heightOf(occ, cols, rows)) {
          const ready = rowsReady(occ, wx, cols, rows);
          state.zen.queue.push({ shape: keys[Math.floor(state.rng() * keys.length)], target: { rot: 0, x: wx }, weights: WEIGHTS.clear, key: true, dramatic: ready >= (CONFIG.zen.dramatic?.minRows ?? 12) });
          return;
        }
        zenCaption(state, "demolition", "demolition");
      }
      if (this.phase === "fill") {
        let shape = next(state);
        if (!fitsUnder(state, shape, 2)) shape = pick(state, smallPool(state)); // (nearly there: nothing too big)
        state.zen.queue.push({ shape, weights: this.weights });
        this.pieces++;
      } else {
        const full = this.blasts === 0 && stackHeight(state) >= rows - 6 && state.rng() < (CONFIG.zen.dramatic?.demolitionChance ?? 0);
        state.zen.queue.push({ shape: blastWith ? blastWith(state, this.blasts) : this.blasts < 2 ? bigPowerup(state) : bestPowerup(state), weights: WEIGHTS.clear, dramatic: full });
        this.blasts++;
      }
    },
    done(state) { return this.phase === "blast" && (this.blasts >= blasts || stackHeight(state) <= this.leave); },
  };
}

// Comings and goings: built up full of gaps, then the gravitizers and phantoms sort the gaps out,
// then up again, higher, and again, until at last it all comes down.
function waves(state) {
  const { rows } = CONFIG.board;
  return {
    caption: "comings and goings", phase: "fill", round: 0, rounds: int(state, 2, 3), target: int(state, 11, 14), pieces: 0, fixes: 0, blasts: 0, weights: null,
    fill(state) {
      const z = state.zen, h = stackHeight(state);
      if (!this.weights) { this.weights = { ...WEIGHTS.holey }; this.target = Math.max(this.target, h + 4); }
      if (this.phase === "fill" && (h >= this.target || this.pieces >= 40)) {
        this.round++;
        if (this.round > this.rounds) { this.phase = "blast"; zenCaption(state, "and down it all comes", "demolition"); }
        else { this.phase = "fix"; this.fixes = 0; }
      }
      if (this.phase === "fix") {
        if (this.fixes < 4 && gaps(state) > 4) {
          z.queue.push({ shape: consolidator(state), weights: WEIGHTS.clear });
          this.fixes++;
          return;
        }
        // (and up again, higher)
        this.phase = "fill";
        this.pieces = 0;
        this.target = Math.min(rows - 3, Math.max(stackHeight(state) + 5, this.target + int(state, 2, 4)));
      }
      if (this.phase === "fill") {
        let shape = buildPiece(state);
        if (!fitsUnder(state, shape, 3)) shape = pick(state, smallPool(state));
        z.queue.push({ shape, weights: this.weights });
        this.pieces++;
        return;
      }
      z.queue.push({ shape: this.blasts < 2 ? bigPowerup(state) : bestPowerup(state), weights: WEIGHTS.clear });
      this.blasts++;
    },
    done(state) { return this.phase === "blast" && (this.blasts >= 6 || stackHeight(state) <= 3); },
  };
}

// The gaps under blocks on the board.
function gaps(state) {
  const { cols, rows } = CONFIG.board;
  const occ = occupancy(state.board);
  let n = 0;
  for (let x = 0; x < cols; x++) for (let y = 0, seen = false; y < rows; y++) { if (occ[y * cols + x]) seen = true; else if (seen) n++; }
  return n;
}

// The gravitizer or phantom (of a handful) that would close the most gaps.
function consolidator(state) {
  const pool = powerupPool(state).filter(p => ["gravity", "phantom"].includes(p.powerup.type) && !p.powerup.bad);
  return bestPowerup(state, pool.length ? pool : powerupPool(state));
}

// A planned movement: the whole run of pieces is worked out at the start (plan(state) returns
// the queue items, or { items, caption }, or null if it can't be done on this board). `then`:
// the movement after it.
function planned(caption, plan, then = null) {
  return {
    caption, planned: true, pushed: false,
    fill(state) {
      this.pushed = true;
      const res = plan(state, this);
      const items = Array.isArray(res) ? res : res?.items;
      if (!items?.length) return;
      state.zen.queue.push(...items);
      const text = res.caption ?? caption;
      if (text) zenCaption(state, text, this.name);
      // (what comes after, unless one of the tallest pieces brings it all down anyway)
      if (then && !items.some(it => it.key)) state.zen.after = then;
    },
    done() { return this.pushed; },
  };
}

// A short run of next() pieces, played to keep it low (zen).
const run = (caption, next, left) => ({
  caption, left,
  fill(state) { state.zen.queue.push({ shape: next(state), weights: WEIGHTS.clear }); this.left--; },
  done() { return this.left <= 0; },
});
// (any of `list` that sits well under the top, or else something small)
const easyOf = (state, list) => { const fits = list.filter(s => fitsUnder(state, s, 6)); return fits.length ? pick(state, fits) : pick(state, smallPool(state)); };
const easyPool = (state) => regularPool(state).filter(s => (s.difficulty ?? 1) <= 3 && blocks(s) <= 16);

const MOVEMENTS = {
  // the game as it comes, played well (in zen, without saying so, and not for so long)
  natural: (state) => ({
    caption: isCalm(state) ? null : "as it comes", left: isCalm(state) ? int(state, 12, 22) : int(state, 20, 35),
    fill(state) { state.zen.queue.push({ shape: naturalPiece(state), weights: WEIGHTS.clear }); this.left--; },
    done(state) { return this.left <= 0 && !groupUnderWay(state); }, // (a set always finishes)
  }),

  // small things, one after another, rows clearing as they go
  rain: (state) => ({
    caption: "light rain", left: int(state, 14, 24), pace: 0.8,
    fill(state) { state.zen.queue.push({ shape: pick(state, smallPool(state)), weights: WEIGHTS.clear }); this.left--; },
    done() { return this.left <= 0; },
  }),

  // build up near the top without clearing anything, then knock it all down
  build: (state) => fillThenBlast("a slow build", buildPiece, { target: int(state, 18, 21), pace: 0.9 }),

  // up near the top again, full of awkward gaps, and then the powerups have at it
  mess: () => planned("a mess", (state) => planMess(state), "demolition"),

  // the same piece two, three or four times in a row
  chorus: (state) => {
    let left = 0, cur = null;
    return fillThenBlast("in twos and threes", (st) => {
      if (left <= 0 || !fitsUnder(st, cur, 4)) { cur = pick(st, regularPool(st).filter(s => (s.difficulty ?? 1) <= 3)); left = int(st, 2, 4); }
      left--;
      return cur;
    }, { target: int(state, 17, 20), pace: 0.8 });
  },

  // the board full of one thing: spam, the animals, Big Bens...
  mono: (state) => {
    const fam = pickFamily(state);
    return fillThenBlast(fam.caption, (st) => {
      const fits = fam.pieces.filter(s => fitsUnder(st, s, 4));
      return fits.length ? pick(st, fits) : pick(st, smallPool(st));
    }, { target: int(state, 17, 20), pace: 0.75 });
  },

  // small things, lots of them, quickly
  small: (state) => fillThenBlast("small things", (st) => pick(st, smallPool(st)), { target: int(state, 18, 21), pace: 0.6, maxPieces: 110 }),

  // big things
  big: (state) => fillThenBlast("big things", giantPiece, { target: int(state, 16, 19), pace: 1.1 }),

  // the giants: a level 6 set if one fits, or a few giant pieces
  giants: (state) => ({
    caption: "giants", pushed: false,
    fill(state) {
      this.pushed = true;
      const { rows } = CONFIG.board;
      const room = rows - (CONFIG.zen.level6?.headroom ?? 7) - stackHeight(state);
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

  // rows built up around a narrow well, then the pieces that fill the well
  well: () => planned("the well", (state) => planWell(state)),

  // rows built up around the exact outline of one tall piece, and then the piece
  fall: () => planned("the long fall", (state) => planFall(state)),

  // the whole board, all but a slot the full height of it, and then the piece that fills it
  column: () => planned("all of it", (state) => planColumn(state) ?? planWell(state, { deep: true })),

  // perfect beds for awkward giants, one on another, to the top
  beds: () => planned(null, (state) => {
    const res = planBeds(state);
    return res && { items: res.items, caption: `a bed for ${res.first.name}` };
  }),

  // a gap in every row, in a pattern, then a run of phantoms seals them all
  crack: () => planned(null, (state) => planCrack(state)),

  // the biggest powerups, then the most useful, until it's nearly all gone
  demolition: () => ({
    caption: "demolition", used: 0,
    fill(state) {
      const full = this.used === 0 && stackHeight(state) >= CONFIG.board.rows - 6 && state.rng() < (CONFIG.zen.dramatic?.demolitionChance ?? 0);
      state.zen.queue.push({ shape: this.used < 2 ? bigPowerup(state) : bestPowerup(state), weights: WEIGHTS.clear, dramatic: full });
      this.used++;
    },
    done(state) { return this.used >= 7 || stackHeight(state) <= 3; },
  }),

  // the board full of board-height pieces side by side (or of long sticks standing on end), the
  // last one completing every row at once
  standing: () => planned("standing up", (state) => planStanding(state)),

  // the board built up in bands of colour, a rainbow, then down it all comes
  colour: () => planned(null, (state) => planColour(state), "demolition"),

  // squares of colour in a pattern, a checkerboard or diagonal stripes, then down it comes
  squares: () => planned(null, (state) => planSquares(state), "demolition"),

  // up and down and up again
  waves: (state) => waves(state),

  // built up, then one black hole after another
  blackholes: (state) => fillThenBlast("a series of black holes", buildPiece, {
    target: int(state, 15, 19), pace: 0.8, blasts: 8,
    blastWith: (st, n) => { const holes = powerupPool(st).filter(p => /black hole/i.test(p.name)); return holes.length && n % 3 !== 2 ? bestPowerup(st, holes) : bigPowerup(st); },
  }),

  // the board filled by expanding pieces, then the powerups
  expanders: (state) => ({
    caption: "expanding", used: 0, target: int(state, 16, 20), phase: "grow", blasts: 0,
    fill(state) {
      const pool = powerupPool(state).filter(p => p.powerup.type === "expander" && !p.powerup.bad);
      if (this.phase === "grow" && (stackHeight(state) >= this.target || this.used >= 16 || !pool.length)) { this.phase = "blast"; zenCaption(state, "demolition", "demolition"); }
      if (this.phase === "grow") {
        state.zen.queue.push({ shape: bestPowerup(state, pool, CONFIG.zen.powerupChoices, WEIGHTS.grow), weights: WEIGHTS.grow });
        this.used++;
        return;
      }
      state.zen.queue.push({ shape: this.blasts < 2 ? bigPowerup(state) : bestPowerup(state), weights: WEIGHTS.clear });
      this.blasts++;
    },
    done(state) { return this.phase === "blast" && (this.blasts >= 7 || stackHeight(state) <= 3); },
  }),

  // zen: a few of one family of pieces (a few bees, some florgnorfepuses)
  family: (state) => {
    const fam = pickFamily(state, { calm: true });
    return run(fam.caption, (st) => easyOf(st, fam.pieces), int(state, 6, 10));
  },

  // zen: a patch of one colour
  colours: (state) => {
    const by = new Map();
    for (const s of easyPool(state)) {
      const c = colourOf(s);
      if (!c || c === "black") continue;
      if (!by.has(c)) by.set(c, []);
      by.get(c).push(s);
    }
    const options = [...by].filter(([, list]) => list.length >= 4);
    if (!options.length) return MOVEMENTS.rain(state);
    const [c, list] = options[Math.floor(state.rng() * options.length)];
    return run(c === "many" ? "a riot of colour" : `a ${c} patch`, (st) => easyOf(st, list), int(state, 7, 11));
  },

  // zen: the same piece two or three times in a row
  twos: (state) => {
    let left = 0, cur = null;
    return run("in twos and threes", (st) => {
      if (left <= 0 || !fitsUnder(st, cur, 6)) { cur = pick(st, regularPool(st).filter(s => (s.difficulty ?? 1) <= 2)); left = int(st, 2, 3); }
      left--;
      return cur;
    }, int(state, 8, 12));
  },

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

// One kind of thing to fill the board with: a set's pieces, Big Bens, or everything on a thread
// (the sets and the Bens more often than any one thread). With `calm` (zen), only the easier
// pieces of each, and said more quietly.
function pickFamily(state, { calm = false } = {}) {
  const byId = (id) => state.allById?.get(id);
  const fams = [];
  const add = (caption, quiet, pieces, w) => {
    if (calm) pieces = pieces.filter(s => (s.difficulty ?? 1) <= 3 && blocks(s) <= 16);
    if (pieces.length >= (calm ? 3 : 1)) fams.push({ caption: calm ? quiet : caption, pieces, w });
  };
  const named = { spam: ["nothing but spam", "a little spam"], noahs_ark: ["two by two", "two by two"], emotions: ["a wall of feelings", "some feelings"] };
  for (const g of state.groups ?? []) {
    if (!named[g.id]) continue;
    const pieces = [...new Set(g.steps.flatMap(st => st.shapes ?? st.variant ?? []))].filter(s => blocks(s) <= 30);
    if (pieces.length >= 3) add(...named[g.id], pieces, 5);
  }
  const bens = ["big_ben", "little_ben"].map(byId).filter(Boolean);
  if (bens.length) add("Big Bens", "a Ben or two", bens, 5);
  const rain = ["raindrop", "big_raindrop", "drizzle"].map(byId).filter(Boolean);
  if (rain.length) add("a lot of rain", "a shower", rain, 3);
  const live = (ids) => ids.map(byId).filter(s => s && !s.powerup && (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) !== LEVEL6);
  const bees = live(["bees", "forgotten_bee", "piano_full_of_bees", "a_bee", "two_bees", "bee_line", "queen_bee", "honeycomb", "bees_knees", "bee_bigger_bee", "bee_in_a_bonnet", "cloud_of_bees"]);
  if (bees.length >= 2) add("bees", "a few bees", bees, 5);
  const florg = live(["florgenorflepus", "florgnorfepus_egg", "snorfwiggle", "plorbs", "grumblesac", "schlopwort", "squonch", "blibbets", "mumblethorpe"]);
  if (florg.length >= 3) add("florgnorfepuses, mostly", "some florgnorfepuses", florg, 5);
  const surreal = live([...(state.threads?.members?.get("surreal") ?? [])]);
  if (surreal.length >= 8) add("nothing but the surreal", "something surreal", surreal, 5);
  for (const [name, ids] of state.threads?.members ?? []) {
    if (name.includes(":")) continue;
    const pieces = [...ids].map(byId).filter(s => s && !s.powerup && (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) !== LEVEL6);
    if (pieces.length >= 8) add(`a lot of ${name}`, `a little ${name}`, pieces, 1);
  }
  return fams.length ? sampleByWeight(fams, f => f.w, state.rng) : { caption: "small things", pieces: smallPool(state) };
}

// The powerup (of a handful, at random) that would do the most good on this board.
function bestPowerup(state, pool = powerupPool(state), tries = CONFIG.zen.powerupChoices, weights = WEIGHTS.clear) {
  if (!pool.length) return pick(state, smallPool(state));
  let best = null;
  for (let i = 0; i < tries; i++) {
    const p = pool[Math.floor(state.rng() * pool.length)];
    const place = bestPlacement(state, p, weights, 2);
    if (place && (!best || place.s > best.s)) best = { p, s: place.s };
  }
  return best?.p ?? pool[0];
}

// ...of the biggest ones (black holes, earthquakes), for the big moments and for emergencies.
function bigPowerup(state) {
  const pool = powerupPool(state).filter(p => destroyerCells(p) >= 40 || gravityColumns(p) >= 8);
  return bestPowerup(state, pool.length ? pool : powerupPool(state));
}

/* =========================
   The autopilot
   ========================= */

// A new piece has spawned (game.js spawnPiece): put it straight over where it's going, already
// turned, and let it fall at its pace. (Zen: it comes in as usual, and is turned and moved over
// a step at a time, in zenTick.)
export function zenSpawned(state) {
  const z = state.zen, a = state.active;
  z.piece = a;
  z.userHas = false;
  // (anything pressed since the last piece came was the player playing that one, not this one)
  if (state.lastInputAt !== z.inputAt) { z.userAt = state.drops; z.inputClock = z.clock; }
  z.inputAt = state.lastInputAt;
  z.target = targetFor(state);
  z.glideMs = 0;
  const t = z.target;
  if (t) {
    const mat = a.shape.rotations[t.rot];
    if (mat && t.x >= 0 && t.x + mat[0].length <= CONFIG.board.cols) {
      if (isCalm(state)) t.glide = true;
      else {
        a.rotIdx = t.rot;
        a.x = t.x;
        a.y = -mat.length;
        a.unkickedX = null;
      }
    }
  }
  z.pace = paceFor(state, z.current, a.shape);
  z.lastId = a.shape.id;
  // how far it has to fall (a short way, near the top, it takes its time)
  const mat = a.shape.rotations[a.rotIdx];
  const { cols, rows } = CONFIG.board;
  const land = isPhantomPowerup(a.shape.powerup) ? phantomLandingY(state.board, a.x, mat) : dropY(occupancy(state.board), mat, a.x, cols, rows);
  z.fall = Math.max(1, (land ?? 0) - a.y);
  // a dramatic pause, a couple of rows above where it lands
  z.dramatic = z.current?.dramatic && land != null ? { at: land - 2, done: false } : null;
  z.holdMs = 0;
  zenSpeed(state);
  // (and after a big clearance it starts a little further up, out of sight)
  if (z.rest > 0) a.y -= Math.round(z.rest / state.dropMs);
}

// How fast the piece falls: the autopilot's quickly (but each takes a moment at least), the
// player's at the usual pace; in zen, easily either way, unless it's dozing (game.js asks)...
export function zenSpeed(state) {
  const z = state.zen, Z = CONFIG.zen;
  if (isCalm(state)) state.dropMs = !z.userHas && dozing(state) ? Z.calm.idleDropMs : Z.calm.dropMs;
  else state.dropMs = z.userHas ? Z.dropMs : Math.max(8, Z.fallMs * z.pace, Z.pieceMs * z.pace / (z.fall ?? 24));
}
const autopilot = (state) => { const z = state.zen; return !!z && !z.userHas && !!state.active && z.piece === state.active; };
// ...how many rows it can fall in one frame (null: as usual)...
export function zenSteps(state) {
  return autopilot(state) && !isCalm(state) ? CONFIG.zen.maxStepsPerFrame : null;
}
// ...and how long it waits before it locks (null: as usual). Never before its slide, or before
// it has got where it's going.
export function zenLockMs(state) {
  if (!autopilot(state)) return null;
  const t = state.zen.target;
  if ((t?.slide && !t.slid) || (t?.glide && !t.glided)) return Infinity;
  return isCalm(state) && !dozing(state) ? null : CONFIG.zen.lockMs * state.zen.pace;
}

// Small and repetitive things come down faster, and so does the long build up from the bottom;
// near the top it takes its time, and the big moments take longer.
function paceFor(state, item, shape) {
  const z = state.zen, P = CONFIG.zen.pace;
  if (item?.key) return P.key;
  let p = (item?.pace ?? 1) * (z.movement?.pace ?? 1);
  if (blocks(shape) <= 3) p *= P.small;
  if (z.lastId === shape.id) p *= P.repeat;
  p *= P.low + (P.high - P.low) * (stackHeight(state) / CONFIG.board.rows) ** 1.5;
  return Math.max(P.fastest, p);
}

// Called every frame (game.js updateGame).
export function zenTick(state, dt) {
  const z = state.zen;
  const a = state.active;
  z.clock += dt;
  // the player pressed something: this piece is theirs (until the next one comes)
  if (state.lastInputAt !== z.inputAt) {
    z.inputAt = state.lastInputAt;
    z.inputClock = z.clock;
    if (a && !z.userHas) {
      z.userHas = true;
      z.userAt = state.drops;
      zenSpeed(state);
    }
  }
  if (!a || state.effect || z.userHas || a !== z.piece) return;
  // zen: turned and moved over to its place, a step at a time (and if it can't get there, it
  // lands where it is)
  const g = z.target;
  if (g?.glide && !g.glided) {
    const every = CONFIG.zen.calm.glideMs * (dozing(state) ? 0.5 : 1);
    for (z.glideMs += dt; z.glideMs >= every && !g.glided; z.glideMs -= every) {
      if (a.rotIdx !== g.rot) { if (!tryRotate(state)) g.glided = true; }
      else if (a.x !== g.x) { if (!tryMove(state, Math.sign(g.x - a.x), 0)) g.glided = true; }
      if (a.rotIdx === g.rot && a.x === g.x) g.glided = true;
    }
  }
  // (a dramatic pause: it hangs there a moment, and says so)
  if (z.dramatic && !z.dramatic.done && a.y >= z.dramatic.at) {
    z.dramatic.done = true;
    z.holdMs = (CONFIG.zen.dramatic.pauseMs ?? 1200) * (CONFIG.modes[state.mode]?.timeScale ?? 1);
    zenCaption(state, "(dramatic pause)", "dramaticPause", { quiet: true, row: Math.max(1, a.y - 2) });
  }
  if (z.holdMs > 0) { z.holdMs -= dt; state.dropAccum = 0; return; }
  // down at the right depth: slide in under the overhang (or, if it came to rest anywhere
  // else, never mind the slide)
  const t = z.target;
  if (t?.slide && !t.slid && (a.y >= t.slide.at || state.locking)) {
    t.slid = true;
    if (a.y >= t.slide.at) while (a.x !== t.slide.to && tryMove(state, Math.sign(t.slide.to - a.x), 0)) { /* step by step */ }
  }
}

// The player let go of the game (paused and came back, say): that's not taking the piece over
// (but they're back, so zen wakes up).
export function zenIgnoreInput(state) {
  if (state.zen) { state.zen.inputAt = state.lastInputAt; state.zen.inputClock = state.zen.clock; }
}

function targetFor(state) {
  const z = state.zen, a = state.active;
  const item = z.current;
  if (item?.target && item.shape.id === a.shape.id) return { ...item.target };
  // (with the next piece in mind, if it's known: the moon goes where the earth can stand beside it)
  const best = bestPlacement(state, a.shape, item?.weights ?? WEIGHTS.clear, 4, z.queue[0]?.shape ?? null);
  return best ? { rot: best.rot, x: best.x, slide: best.slide ?? null } : null;
}

// The best place for `shape`: every turn and column, dropped straight down, and for ordinary
// pieces slid in sideways at the bottom too. Powerups are tried out on a copy of the board.
// `maxTurns` limits the turns tried. With `next` (an ordinary piece), each place is judged by
// the best the next piece could do after it.
export function bestPlacement(state, shape, weights = WEIGHTS.clear, maxTurns = 4, next = null) {
  const { cols, rows } = CONFIG.board;
  const occ0 = occupancy(state.board);
  const pu = shape.powerup;
  const phantom = pu && isPhantomPowerup(pu);
  let best = null;
  const consider = (r, x, y, slide = null) => {
    const mat = shape.rotations[r];
    let occ, lines, bonus = 0;
    if (pu) {
      const res = tryPowerup(state, shape, r, x, y);
      occ = res.occ; lines = res.lines; bonus = res.affected * 0.06;
    } else {
      occ = occ0.slice();
      lines = placeAndClear(occ, mat, x, y, cols, rows);
    }
    const over = mat.some((row, j) => y + j < 0 && row.some(Boolean)) ? 1000 : 0; // it would top out
    // (and the column kept clear stays clear, even for a row or two cleared)
    const inWell = !pu && intoWell(mat, x, weights) ? 12 : 0;
    let s = score(occ, lines, weights, cols, rows);
    if (next && !next.powerup && !pu && !over) s = Math.max(s - 50, lookAhead(occ, next, weights, cols, rows, lines));
    s += bonus - over - inWell + z01(state) * 0.01 - (slide ? 0.05 : 0);
    if (!best || s > best.s) best = { rot: r, x: slide ? slide.from : x, y, s, slide: slide ? { at: slide.at, to: x } : null };
  };
  const turns = Math.min(maxTurns, reachableTurns(shape));
  for (let r = 0; r < turns; r++) {
    const mat = shape.rotations[r], w = mat[0].length;
    for (let x = 0; x + w <= cols; x++) {
      const y = phantom ? phantomLandingY(state.board, x, mat) : dropY(occ0, mat, x, cols, rows);
      if (y == null) continue;
      consider(r, x, y);
      if (pu) continue;
      // ...and slid along at the bottom, in under anything that overhangs
      for (const dir of [-1, 1]) {
        for (let xs = x + dir; xs >= 0 && xs + w <= cols && fitsAt(occ0, mat, xs, y, cols, rows); xs += dir) {
          const y2 = dropFrom(occ0, mat, xs, y, cols, rows);
          if (y2 !== dropY(occ0, mat, xs, cols, rows)) consider(r, xs, y2, { from: x, at: y });
        }
      }
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
      best = Math.max(best, score(o, lines + n, weights, cols, rows) - (intoWell(mat, x, weights) ? 12 : 0));
    }
  }
  return best;
}

// Would it go into the column being kept clear (weights.well)?
function intoWell(mat, x, weights) {
  const i = weights.well - x;
  return weights.well != null && i >= 0 && i < mat[0].length && mat.some(row => row[i]);
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
   The planned movements
   ========================= */

// Rows built up around a well 1 or 2 columns wide, then the pieces that fill the well, bottom
// up: each one clears the rows it completes. (`deep`: nearly the whole board.)
export function planWell(state, { deep = false } = {}) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  if (!solid(occ, cols, rows)) return null;
  const h0 = heightOf(occ, cols, rows);
  const H = Math.min(rows - 2, Math.max(h0 + 6, deep ? int(state, 20, 22) : int(state, 12, 19)));
  const w = rng() < 0.6 ? 1 : 2;
  const wx = freeSlot(occ, w, rng, cols, rows);
  if (wx == null) return null;
  const need = new Uint8Array(cols * rows), slot = new Uint8Array(cols * rows);
  for (let y = rows - H; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (x >= wx && x < wx + w) slot[y * cols + x] = 1; else need[y * cols + x] = 1;
  }
  const work = occ.slice();
  const fillers = tile(work, need, fillerCandidates(state), rng, cols, rows);
  if (!fillers) return null;
  const keys = tile(work, slot, keyCandidates(state, w, H), rng, cols, rows, 2);
  if (!keys) return null;
  return toItems(occ, [...asFillers(fillers), ...keys.map(k => ({ ...k, pace: 1.3 }))], cols, rows);
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
      if (rot >= turns || h < 5 || w > cols - 2 || h > rows - 3) return;
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
    const items = toItems(occ, [...asFillers(fillers), { shape: k.shape, rot: k.rot, mat: k.mat, x: kx, key: true }], cols, rows);
    if (items) return items;
  }
  return null;
}

// The whole board filled but for a slot the full height of it, then one of the tallest pieces
// (tagged "zen": a piece of string, the space elevator...) drops in and all of it goes at once.
export function planColumn(state) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  if (!solid(occ, cols, rows) || heightOf(occ, cols, rows) > 2) return null;
  const keys = zenKeys(state);
  if (!keys.length) return null;
  const k = keys[Math.floor(rng() * keys.length)];
  const mat = k.rotations[0], w = mat[0].length;
  const kx = freeSlot(occ, w, rng, cols, rows);
  if (kx == null) return null;
  const need = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (x < kx || x >= kx + w) need[y * cols + x] = 1;
  const work = occ.slice();
  const fillers = tile(work, need, fillerCandidates(state), rng, cols, rows);
  if (!fillers) return null;
  return toItems(occ, [...asFillers(fillers), { shape: k, rot: 0, mat, x: kx, key: true }], cols, rows);
}

// Perfect beds for awkward giants (the Great Wall of China, say): the pieces under and around
// each one fill exactly to its outline, so it lands with no gaps, then the next one on top...
// up to the top of the board, a slot kept clear all the way so no row completes. Then the slot
// is filled, by one of the tallest pieces if there's one (all of it goes at once), or from the
// bottom up. Returns { items, first } or null.
export function planBeds(state) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  if (!solid(occ, cols, rows) || heightOf(occ, cols, rows) > 2) return null;
  const keys = zenKeys(state);
  const key = keys.length ? keys[Math.floor(rng() * keys.length)] : null;
  const kw = key ? key.rotations[0][0].length : 1;
  const kx = freeSlot(occ, kw, rng, cols, rows);
  if (kx == null) return null;
  const inSlot = (x) => x >= kx && x < kx + kw;
  const fill = fillerCandidates(state);
  const awk = awkwardCandidates(state, cols - kw - 1);
  if (!awk.length) return null;
  const work = occ.slice();
  const steps = [];
  let first = null;
  for (let n = 0; n < 7; n++) {
    let placed = false;
    for (let t = 0; t < 14 && !placed; t++) {
      const g = sampleByWeight(awk, c => c.awk, rng);
      const xs = [];
      for (let x = 0; x + g.w <= cols; x++) {
        let ok = true;
        for (let i = 0; i < g.w && ok; i++) if (inSlot(x + i)) ok = false;
        if (ok) xs.push(x);
      }
      if (!xs.length) continue;
      const x = xs[Math.floor(rng() * xs.length)];
      // as low as it can sit, above what's there
      let y = Infinity;
      for (let i = 0; i < g.w; i++) y = Math.min(y, colTop(work, x + i, cols, rows) - 1 - g.bottom[i]);
      if (y < 2) continue; // (no room for it under the top)
      // it needs its outline (and the column above its top in each column) kept clear to drop in
      const keep = new Uint8Array(cols * rows);
      for (let i = 0; i < g.w; i++) for (let j = 0; j <= g.bottom[i]; j++) keep[(y + j) * cols + x + i] = 1;
      const need = new Uint8Array(cols * rows);
      for (let yy = y; yy < rows; yy++) for (let xx = 0; xx < cols; xx++) {
        const k = yy * cols + xx;
        if (!work[k] && !keep[k] && !inSlot(xx)) need[k] = 1;
      }
      const w2 = work.slice();
      const bed = tile(w2, need, fill, rng, cols, rows);
      if (!bed) continue;
      for (const [i, j] of g.cells) w2[(y + j) * cols + x + i] = 1;
      work.set(w2);
      steps.push(...asFillers(bed), { shape: g.shape, rot: g.rot, mat: g.mat, x, y, pace: 1.3 });
      first ??= g.shape;
      placed = true;
    }
    if (!placed) break;
  }
  if (!first) return null;
  // the rest of the way to the top
  const need = new Uint8Array(cols * rows);
  for (let k = 0; k < need.length; k++) if (!work[k] && !inSlot(k % cols)) need[k] = 1;
  const rest = tile(work, need, fill, rng, cols, rows);
  if (!rest) return null;
  steps.push(...asFillers(rest));
  if (key) steps.push({ shape: key, rot: 0, mat: key.rotations[0], x: kx, key: true });
  else {
    const slot = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) slot[y * cols + kx] = 1;
    const keys2 = tile(work, slot, keyCandidates(state, 1, rows), rng, cols, rows, 2);
    if (!keys2) return null;
    steps.push(...keys2.map(k => ({ ...k, pace: 1.3 })));
  }
  const items = toItems(occ, steps, cols, rows);
  return items ? { items, first } : null;
}

// A gap in every row, in a pattern (a diagonal, a zigzag, a cross), the board built up around
// them nearly to the top, then a run of phantoms (the friendly ghost) seals them one by one and
// every row goes. Returns { items, caption } or null.
export function planCrack(state) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  if (!solid(occ, cols, rows) || heightOf(occ, cols, rows) > 2) return null;
  // (only phantom, one block of it, so it just fills the gap: the friendly ghost if it's here)
  const ghosts = state.powerups.filter(p => p.powerup.type === "phantom" && blocks(p) === 1);
  const ghost = ghosts.find(p => p.id === "friendly_ghost") ?? ghosts[0];
  if (!ghost) return null;
  const H = int(state, 18, rows - 1), top = rows - H;
  // One gap a row (or two), wandering up from the floor but never into the end columns: a gap
  // against the wall would leave the cells over it with nothing to stand on, all the way up.
  // `moves(d)` lists the steps to try next, best first; the walk turns back at its edges (and
  // goes round anything already there).
  const walk = (lo, hi, moves) => (r, prev, free) => {
    if (r === 0) {
      const xs = [];
      for (let x = lo; x <= hi; x++) if (free(x)) xs.push(x);
      return xs.length ? [xs[Math.floor(rng() * xs.length)], rng() < 0.5 ? 1 : -1] : null;
    }
    const { x } = prev;
    const d = x + prev.d < lo || x + prev.d > hi ? -prev.d : prev.d;
    for (const m of moves(d)) if (x + m >= lo && x + m <= hi && free(x + m)) return [x + m, Math.sign(m) || d];
    return free(x) ? [x, -d] : null;
  };
  const wander = (d) => { const u = rng(); return u < 0.6 ? [d, 0, -d] : u < 0.85 ? [0, d, -d] : [-d, 0, d]; };
  const bolt = (d) => (rng() < 0.75 ? [2 * d, d, -2 * d, -d] : [0, 2 * d, -2 * d]);
  const half = (cols >> 1) - 1;
  const kinds = [
    { caption: "a crack running through it", lines: [walk(1, cols - 2, wander)] },
    { caption: "a zigzag", lines: [walk(1, cols - 2, (d) => [d, -d])] },
    { caption: "lightning, more or less", lines: [walk(1, cols - 2, bolt)] },
    { caption: "two cracks, not touching", lines: [walk(1, half - 1, wander), walk(half + 2, cols - 2, wander)] },
  ];
  for (let tries = 0; tries < 12; tries++) {
    const kind = kinds[Math.floor(rng() * kinds.length)];
    const holes = new Uint8Array(cols * rows), list = [];
    let ok = true;
    for (const line of kind.lines) {
      let prev = null;
      for (let r = 0; r < H && ok; r++) {
        const y = rows - 1 - r;
        const step = line(r, prev, (x) => !occ[y * cols + x] && !holes[y * cols + x]);
        if (!step) { ok = false; break; } // (no way up through what's already there)
        const [x, d] = step;
        holes[y * cols + x] = 1;
        list.push({ x, y });
        prev = { x, d };
      }
    }
    if (!ok) continue;
    const before = list.length;
    closeOff(holes, occ, top, cols, rows, list);
    if (list.length > before + 4) continue; // (a crack, not a cave)
    const need = new Uint8Array(cols * rows);
    for (let y = top; y < rows; y++) for (let x = 0; x < cols; x++) if (!occ[y * cols + x] && !holes[y * cols + x]) need[y * cols + x] = 1;
    let work = occ.slice();
    let fillers = tile(work, need, fillerCandidates(state), rng, cols, rows, 3, holes);
    if (!fillers && tries >= 2) { work = occ.slice(); fillers = tileFlat(work, need, flatCandidates(state), rng, cols, rows); }
    if (!fillers) continue;
    // then the ghosts, from the bottom up, each into the deepest gap in its column
    list.sort((a, b) => b.y - a.y);
    const seal = list.map(h => ({ shape: ghost, rot: 0, mat: ghost.rotations[0], x: h.x, phantom: true, pace: CONFIG.zen.pace.phantom }));
    const items = toItems(occ, [...asFillers(fillers), ...seal], cols, rows);
    if (items) return { items, caption: kind.caption };
  }
  return null;
}

// The board full of board-height pieces side by side, in a random order (the last one completes
// every row at once); or, without them (or with something already there), every column filled
// with long sticks standing on end but for a slot, then the slot's key.
export function planStanding(state) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  if (!solid(occ, cols, rows) || heightOf(occ, cols, rows) > 2) return null;
  const keys = zenKeys(state);
  if (keys.length && heightOf(occ, cols, rows) === 0) {
    const order = [];
    for (let x = 0; x < cols;) {
      const fit = keys.filter(k => k.rotations[0][0].length <= cols - x);
      if (!fit.length) break;
      const k = fit[Math.floor(rng() * fit.length)];
      order.push({ shape: k, rot: 0, mat: k.rotations[0], x, pace: 1.2 });
      x += k.rotations[0][0].length;
    }
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    order[order.length - 1].key = true;
    const items = toItems(occ, order, cols, rows);
    if (items) return { items, caption: "standing up" };
  }
  // sticks: each column on its own, sticks whose lengths add up exactly to its height
  const sticks = candidates(plannable(state, 4), 1, rows, 99).filter(c => c.w === 1 && c.h >= 2);
  const byLen = new Map();
  for (const c of sticks) { if (!byLen.has(c.h)) byLen.set(c.h, []); byLen.get(c.h).push(c); }
  if (!byLen.has(2) || byLen.size < 3) return null;
  const kx = freeSlot(occ, 1, rng, cols, rows);
  if (kx == null) return null;
  const placed = [];
  for (let x = 0; x < cols; x++) {
    if (x === kx) continue;
    let y = colTop(occ, x, cols, rows); // (the first row filled already, or the floor)
    let left = y - 1;                     // (up to row 1: the top row stays clear)
    while (left > 0) {
      const lens = [...byLen.keys()].filter(h => h <= left && left - h !== 1);
      if (!lens.length) return null;
      const h = lens[Math.floor(rng() * lens.length)];
      const list = byLen.get(h), c = list[Math.floor(rng() * list.length)];
      y -= h;
      placed.push({ shape: c.shape, rot: c.rot, mat: c.mat, x, y });
      left -= h;
    }
  }
  // (dropped bottom up, across the board)
  placed.sort((a, b) => (b.y + b.mat.length) - (a.y + a.mat.length) || a.x - b.x);
  const work = occ.slice();
  for (const p of placed) for (let j = 0; j < p.mat.length; j++) work[(p.y + j) * cols + p.x] = 1;
  const key = zenKeys(state).find(k => k.rotations[0][0].length === 1);
  const steps = [...placed.map(p => ({ ...p, pace: 0.6 }))];
  if (key) steps.push({ shape: key, rot: 0, mat: key.rotations[0], x: kx, key: true });
  else {
    const slot = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) slot[y * cols + kx] = 1;
    const keys2 = tile(work, slot, keyCandidates(state, 1, rows), rng, cols, rows, 2);
    if (!keys2) return null;
    steps.push(...keys2.map(k => ({ ...k, pace: 1.3 })));
  }
  const items = toItems(occ, steps, cols, rows);
  return items && { items, caption: "sticks, standing up" };
}

// The colour a piece mostly is (pink counts as purple: there are few purple things).
const colours = new WeakMap();
function colourOf(shape) {
  if (!colours.has(shape)) colours.set(shape, colourFamily(shape));
  const c = colours.get(shape);
  return c === "pink" ? "purple" : c;
}

// The board built up in bands of colour, a rainbow from the bottom up (or upside down, or from
// left to right), with a slot left for one of the tallest pieces if there is one; then down it
// comes. Returns { items, caption } or null.
export function planColour(state) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  if (!solid(occ, cols, rows) || heightOf(occ, cols, rows) > 2) return null;
  const keys = zenKeys(state).filter(k => k.rotations[0][0].length === 1);
  const key = keys.length ? keys[Math.floor(rng() * keys.length)] : null;
  const H = key ? rows : rows - 3;
  const kx = freeSlot(occ, 1, rng, cols, rows);
  if (kx == null) return null;
  const flip = rng() < 0.25, across = rng() < 0.35;
  const order = flip ? ["purple", "blue", "green", "yellow", "orange", "red"] : ["red", "orange", "yellow", "green", "blue", "purple"];
  const all = fillerCandidates(state);
  const of = (c) => all.filter(k => colourOf(k.shape) === c);
  const work = occ.slice(), steps = [];
  const n = order.length, top = rows - H;
  const xs = [...Array(cols).keys()].filter(x => x !== kx);
  for (let i = 0; i < n; i++) {
    const need = new Uint8Array(cols * rows);
    if (across) {
      // stripes of columns, left to right
      const a = Math.round(xs.length * i / n), b = Math.round(xs.length * (i + 1) / n);
      for (const x of xs.slice(a, b)) for (let y = top; y < rows; y++) if (!work[y * cols + x]) need[y * cols + x] = 1;
    } else {
      // bands of rows, from the bottom up
      const y0 = rows - Math.round(H * (i + 1) / n), y1 = rows - Math.round(H * i / n);
      for (let y = y0; y < y1; y++) for (const x of xs) if (!work[y * cols + x]) need[y * cols + x] = 1;
    }
    const placed = tile(work, need, of(order[i]), rng, cols, rows, 4, null, 3000) ?? tile(work, need, all, rng, cols, rows);
    if (!placed) return null;
    steps.push(...asFillers(placed));
  }
  if (key) steps.push({ shape: key, rot: 0, mat: key.rotations[0], x: kx, key: true });
  const items = toItems(occ, steps, cols, rows, { mustClear: !!key });
  return items && { items, caption: across ? "a rainbow, sideways" : flip ? "a rainbow, upside down" : "a rainbow" };
}

// Squares in a pattern across the board: a checkerboard, diagonal stripes or rings of colour,
// with a slot left for one of the tallest pieces if one fits it; then down it comes. Returns
// { items, caption } or null.
export function planSquares(state) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  if (!solid(occ, cols, rows) || heightOf(occ, cols, rows) > 2) return null;
  const sq = 2;
  const pieces = plannable(state, 3).filter(s => { const m = s.rotations[0]; return m.length === sq && m[0].length === sq && m.flat().every(Boolean); });
  const byCol = new Map();
  for (const p of pieces) { const c = colourOf(p); if (c && c !== "black") { if (!byCol.has(c)) byCol.set(c, []); byCol.get(c).push(p); } }
  const palette = [...byCol.keys()];
  if (palette.length < 3) return null;
  for (let i = palette.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [palette[i], palette[j]] = [palette[j], palette[i]]; }
  let key = zenKeys(state).find(k => k.rotations[0][0].length === sq);
  const nx = Math.floor(cols / sq), ny = Math.floor(rows / sq);
  // a slot for one of the tallest pieces, if there's a clear one; or else a square left out of
  // each row, on a diagonal, so no row completes
  const slots = [...Array(nx).keys()].filter(i => { for (let x = i * sq; x < (i + 1) * sq; x++) if (colTop(occ, x, cols, rows) < rows) return false; return true; });
  const slot = slots.length ? slots[Math.floor(rng() * slots.length)] : null;
  const gapAt = (j) => (slot != null ? slot : (j * 2 + 1) % nx);
  const kinds = [
    { caption: "a checkerboard", colour: (i, j) => palette[(i + j) % 2] },
    { caption: "diagonal stripes", colour: (i, j) => palette[(i + j) % Math.min(4, palette.length)] },
    { caption: "the other diagonal", colour: (i, j) => palette[((i - j) % 3 + 3) % 3] },
    { caption: "rings", colour: (i, j) => palette[(Math.max(Math.abs(i - (nx - 1) / 2), Math.abs(j - (ny - 1) / 2)) | 0) % palette.length] },
  ];
  const kind = kinds[Math.floor(rng() * kinds.length)];
  const steps = [];
  // (anything low that's there already is levelled off first, and the grid goes on top)
  const base = heightOf(occ, cols, rows), work = occ.slice();
  if (base) {
    const need = new Uint8Array(cols * rows);
    for (let y = rows - base; y < rows; y++) for (let x = 0; x < cols; x++) if (!occ[y * cols + x] && (slot == null || x < slot * sq || x >= (slot + 1) * sq)) need[y * cols + x] = 1;
    const level = tile(work, need, fillerCandidates(state), rng, cols, rows);
    if (!level) return null;
    steps.push(...asFillers(level));
  }
  const gy = Math.floor((rows - base) / sq);
  if (slot == null) key = null;
  for (let j = gy - 1; j >= 0; j--) for (let i = 0; i < nx; i++) {
    if (i === gapAt(j)) continue;
    const list = byCol.get(kind.colour(i, j)) ?? pieces;
    const p = list[Math.floor(rng() * list.length)];
    steps.push({ shape: p, rot: 0, mat: p.rotations[0], x: i * sq, y: rows - base - (gy - j) * sq, pace: 0.7 });
  }
  if (key) steps.push({ shape: key, rot: 0, mat: key.rotations[0], x: slot * sq, key: true });
  const items = toItems(occ, steps, cols, rows, { mustClear: !!key });
  return items && { items, caption: kind.caption };
}

// The board built up nearly to the top, full of awkward gaps (little clusters of cells nothing
// fills, at least one in every row so nothing clears), for the demolition to follow.
export function planMess(state) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  if (!solid(occ, cols, rows) || heightOf(occ, cols, rows) > 3) return null;
  const H = int(state, 19, 22), top = rows - H;
  for (let tries = 0; tries < 12; tries++) {
    const holes = new Uint8Array(cols * rows);
    const gap = (x, y) => { if (x >= 0 && x < cols && y > top && y < rows && !occ[y * cols + x]) holes[y * cols + x] = 1; };
    for (let n = Math.round(H * (0.7 + rng() * 0.5)); n > 0; n--) {
      const x = Math.floor(rng() * cols), y = top + 1 + Math.floor(rng() * (H - 1));
      gap(x, y);
      // (a cluster: a cell or two more, beside or under it)
      for (let k = Math.floor(rng() * 3); k > 0; k--) gap(x + (rng() < 0.5 ? -1 : 1) * (rng() < 0.6 ? 1 : 0), y + (rng() < 0.5 ? 1 : 0));
    }
    for (let y = top + 1; y < rows; y++) {
      const free = [];
      for (let x = 0; x < cols; x++) if (!occ[y * cols + x]) free.push(x);
      if (!free.some(x => holes[y * cols + x])) gap(free[Math.floor(rng() * free.length)], y);
    }
    closeOff(holes, occ, top, cols, rows);
    const need = new Uint8Array(cols * rows);
    for (let y = top; y < rows; y++) for (let x = 0; x < cols; x++) if (!occ[y * cols + x] && !holes[y * cols + x]) need[y * cols + x] = 1;
    // (the top row needs a gap too, so it doesn't clear when it's finished)
    need[top * cols + Math.floor(rng() * cols)] = 0;
    let work = occ.slice();
    let fillers = tile(work, need, fillerCandidates(state), rng, cols, rows, 3, holes);
    if (!fillers && tries >= 2) { work = occ.slice(); fillers = tileFlat(work, need, flatCandidates(state), rng, cols, rows); }
    if (!fillers) continue;
    const items = toItems(occ, asFillers(fillers), cols, rows, { mustClear: false });
    if (items && items.length) return items;
  }
  return null;
}

const mod = (a, n) => ((a % n) + n) % n;

// A stretch of a row that nothing could rest on (gaps under all of it, and a gap or a wall at each
// end) becomes part of the gaps too, from the bottom up. (`list`: where to note each new gap.)
function closeOff(holes, occ, top, cols, rows, list = null) {
  for (let y = rows - 1; y >= top; y--) {
    for (let x = 0; x < cols;) {
      if (holes[y * cols + x] || occ[y * cols + x]) { x++; continue; }
      let end = x;
      while (end < cols && !holes[y * cols + end] && !occ[y * cols + end]) end++;
      let held = false;
      for (let i = x; i < end && !held; i++) if (y + 1 >= rows || !holes[(y + 1) * cols + i]) held = true;
      if (!held) for (let i = x; i < end; i++) { holes[y * cols + i] = 1; list?.push({ x: i, y }); }
      x = end;
    }
  }
}
const asFillers = (list) => list.map(f => ({ ...f, pace: CONFIG.zen.pace.filler }));

// The tallest pieces: the whole height of the board, only for zen (tagged "zen").
function zenKeys(state) {
  const rows = CONFIG.board.rows;
  return (state.allShapes ?? state.shapes).filter(s => !s.powerup && s.tags?.includes("zen") && s.rotations[0].length === rows);
}

// Where a slot `w` columns wide can go, with nothing in it yet (null if nowhere).
function freeSlot(occ, w, rng, cols, rows) {
  const free = [];
  for (let x = 0; x + w <= cols; x++) {
    let ok = true;
    for (let i = 0; i < w && ok; i++) for (let y = 0; y < rows; y++) if (occ[y * cols + x + i]) { ok = false; break; }
    if (ok) free.push(x);
  }
  return free.length ? free[Math.floor(rng() * free.length)] : null;
}

// The rows that are full but for column wx.
function rowsReady(occ, wx, cols, rows) {
  let n = 0;
  for (let y = 0; y < rows; y++) {
    let full = true;
    for (let x = 0; x < cols && full; x++) if (x !== wx && !occ[y * cols + x]) full = false;
    if (full) n++;
  }
  return n;
}

// The first filled row in column x (rows if it's empty).
function colTop(occ, x, cols, rows) {
  for (let y = 0; y < rows; y++) if (occ[y * cols + x]) return y;
  return rows;
}

// Pieces the planner can build with: ones that always arrive the same shape.
function plannable(state, maxDifficulty) {
  return regularPool(state).filter(s => (s.difficulty ?? 1) <= maxDifficulty && !s.remix && !s.powerup);
}

function fillerCandidates(state) {
  return candidates(plannable(state, 3), 5, 5, 9);
}

// Flat pieces, one block tall (lying down), for laying rows like bricks.
function flatCandidates(state) {
  return candidates(plannable(state, 3), 8, 1, 99);
}

function keyCandidates(state, w, H) {
  return candidates(plannable(state, 5), w, H, 99);
}

// Awkward giants to make beds for: big, irregular, each column of it solid (so it can drop
// into its bed), no wider than `maxW`. Each with how awkward it is (`awk`), and the lowest cell
// of it in each column (`bottom`).
function awkwardCandidates(state, maxW) {
  const out = [];
  for (const s of plannable(state, 5)) {
    if (blocks(s) < 8) continue;
    const turns = reachableTurns(s), seen = new Set();
    s.rotations.forEach((mat, rot) => {
      const h = mat.length, w = mat[0].length;
      if (rot >= turns || w > maxW || h > 9 || !solidColumns(mat)) return;
      const key = mat.map(r => r.map(Number).join("")).join("/");
      if (seen.has(key)) return;
      seen.add(key);
      const cells = [];
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (mat[j][i]) cells.push([i, j]);
      const fill = cells.length / (w * h);
      const bottom = [...Array(w).keys()].map(i => { for (let j = h - 1; j >= 0; j--) if (mat[j][i]) return j; return -1; });
      const heights = new Set(bottom).size + new Set([...Array(w).keys()].map(i => mat.findIndex(r => r[i]))).size;
      const awk = (0.3 + (1 - fill) * 2 + heights * 0.15) * ((s.difficulty ?? 1) >= 4 ? 1.5 : 1) * (s.id === "great_wall" ? 4 : 1);
      out.push({ shape: s, rot, mat, w, h, cells, bottom, awk });
    });
  }
  return out;
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
      // (for the planner, flat: its cells, and again from the bottom row up, which rule a place
      // out soonest; and which cells it has)
      const near = [...cells].sort((p, q) => q[1] - p[1] || p[0] - q[0]);
      const mask = new Uint8Array(w * h);
      for (const [i, j] of cells) mask[j * w + i] = 1;
      out.push({ shape: s, rot, mat, w, h, cells, ax: mat[h - 1].findIndex(Boolean), ay: h - 1, mask,
        cellsF: Int8Array.from(cells.flat()), nearF: Int8Array.from(near.flat()) });
    });
  }
  return out;
}

// Fill every `need` cell (that isn't filled yet) with pieces, bottom up and left to right, each
// one dropped straight in and resting on what's below: no overhangs (they'd leave gaps nothing
// could reach), except over `holes`, gaps left on purpose (a piece over one rests on something
// else). The bigger pieces first; if it gets stuck it backs up and tries the next. Changes
// `occ`. Returns the placements in order, or null. (A tiling that works is found quickly, so
// it gives up after `budget` steps and the plan tries again another way.)
function tile(occ, need, cands, rng, cols, rows, maxUses = 3, holes = null, budget = 1200) {
  const order = cands.map(c => ({ c, k: c.cells.length + rng() * 4 })).sort((a, b) => b.k - a.k).map(o => o.c);
  const ids = new Map(), plan = [];
  const sid = order.map(c => { if (!ids.has(c.shape.id)) ids.set(c.shape.id, ids.size); return ids.get(c.shape.id); });
  const uses = new Int16Array(ids.size);
  // the top filled row of each column
  const tops = new Int16Array(cols);
  const topOf = (x) => { tops[x] = colTop(occ, x, cols, rows); };
  for (let x = 0; x < cols; x++) topOf(x);
  const fits = (c, x0, y0) => {
    const nf = c.nearF;
    for (let n = 0; n < nf.length; n += 2) {
      const x = x0 + nf[n], y = y0 + nf[n + 1];
      if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
      const k = y * cols + x;
      if (!need[k] || occ[k]) return false;
    }
    let supported = false;
    const cf = c.cellsF, m = c.mask, w = c.w;
    for (let n = 0; n < cf.length; n += 2) {
      const i = cf[n], j = cf[n + 1], x = x0 + i, y = y0 + j, below = (y + 1) * cols + x;
      if (!(j > 0 && m[(j - 1) * w + i]) && tops[x] < y) return false; // a way in
      if (y + 1 >= rows || occ[below]) { supported = true; continue; }
      if ((j + 1 < c.h && m[(j + 1) * w + i]) || holes?.[below]) continue; // (its own block, or a gap on purpose)
      return false; // it would leave a gap under it that nothing could reach
    }
    return supported;
  };
  // the lowest, then leftmost, cell still to fill (everything before `from` is filled already)
  const anchor = (from = rows * cols - cols) => {
    let y = (from / cols) | 0, x = from % cols;
    for (; y >= 0; y--, x = 0) for (; x < cols; x++) if (need[y * cols + x] && !occ[y * cols + x]) return y * cols + x;
    return -1;
  };
  const put = (p, v) => {
    for (const [i, j] of p.c.cells) {
      const x = p.x0 + i, y = p.y0 + j;
      occ[y * cols + x] = v;
      if (v && y < tops[x]) tops[x] = y;
    }
    if (!v) for (let i = 0; i < p.c.w; i++) topOf(p.x0 + i);
    uses[p.s] += v ? 1 : -1;
  };
  const first = anchor();
  if (first < 0) return plan;
  const stack = [{ a: first, ci: 0, pass: 0, placed: null }];
  let steps = 0;
  while (stack.length) {
    if (++steps > budget) return null;
    const top = stack[stack.length - 1];
    if (top.placed) { put(top.placed, 0); top.placed = null; plan.pop(); }
    const ax = top.a % cols, ay = (top.a / cols) | 0;
    let found = null;
    // (a second pass for pieces already used enough)
    while (top.pass < 2 && !found) {
      for (; top.ci < order.length && !found; top.ci++) {
        const c = order[top.ci], used = uses[sid[top.ci]] >= maxUses;
        if (used !== (top.pass === 1)) continue;
        const x0 = ax - c.ax, y0 = ay - c.ay;
        if (fits(c, x0, y0)) found = { c, x0, y0, s: sid[top.ci] };
      }
      if (!found) { top.pass++; top.ci = 0; }
    }
    if (!found) { stack.pop(); continue; } // stuck: back up
    put(found, 1);
    top.placed = found;
    plan.push({ shape: found.c.shape, rot: found.c.rot, mat: found.c.mat, x: found.x0, y: found.y0 });
    const next = anchor(top.a);
    if (next < 0) return plan;
    stack.push({ a: next, ci: 0, pass: 0, placed: null });
  }
  return null;
}

// The same, the simple way, when that fails around awkward gaps: row by row from the bottom, each
// stretch of a row between the gaps laid with flat pieces (like bricks), each one resting on
// something. Changes `occ`. Returns the placements, or null.
function tileFlat(occ, need, cands, rng, cols, rows) {
  const flat = new Map();
  for (const c of cands) if (c.h === 1) { if (!flat.has(c.w)) flat.set(c.w, []); flat.get(c.w).push(c); }
  if (!flat.has(1)) return null;
  const lens = [...flat.keys()];
  const plan = [];
  for (let y = rows - 1; y >= 0; y--) {
    for (let x = 0; x < cols;) {
      if (!need[y * cols + x] || occ[y * cols + x]) { x++; continue; }
      let end = x;
      while (end < cols && need[y * cols + end] && !occ[y * cols + end]) end++;
      // [x, end): split into flat pieces, each with something under at least one of its blocks
      const held = (i) => y + 1 >= rows || occ[(y + 1) * cols + i];
      const parts = [];
      let at = x, ok = true;
      while (at < end && ok) {
        const fits = lens.filter(L => at + L <= end && [...Array(L).keys()].some(i => held(at + i)));
        if (!fits.length) { ok = false; break; }
        // (rather not leave a lone block over a gap at the end)
        const good = fits.filter(L => at + L === end || end - (at + L) > 1 || held(at + L));
        const L = (good.length ? good : fits)[Math.floor(rng() * (good.length || fits.length))];
        parts.push([at, L]);
        at += L;
      }
      if (!ok) return null;
      for (const [px, L] of parts) {
        const list = flat.get(L), c = list[Math.floor(rng() * list.length)];
        for (let i = 0; i < L; i++) occ[y * cols + px + i] = 1;
        plan.push({ shape: c.shape, rot: c.rot, mat: c.mat, x: px, y });
      }
      x = end;
    }
  }
  return plan;
}

// The plan as queue items, played out on a copy of the board to check that every piece lands
// where it should (and inside the board), with the board each one leaves behind. Unless
// `mustClear` is false, something has to clear.
function toItems(occ0, steps, cols, rows, { mustClear = true } = {}) {
  const occ = occ0.slice();
  let cleared = 0;
  const items = [];
  for (const st of steps) {
    const y = st.phantom ? phantomDropY(occ, st.mat, st.x, cols, rows) : dropY(occ, st.mat, st.x, cols, rows);
    if (y == null) return null;
    if (!cleared && st.y != null && y !== st.y) return null; // (before anything clears it lands exactly as planned)
    if (st.mat.some((row, j) => y + j < 0 && row.some(Boolean))) return null; // (it would top out)
    const n = placeAndClear(occ, st.mat, st.x, y, cols, rows);
    cleared += n;
    // (the one that brings most of it down waits a moment first)
    const dramatic = n >= (CONFIG.zen.dramatic?.minRows ?? 12);
    items.push({ shape: st.shape, target: { rot: st.rot, x: st.x }, expect: occ.slice(), weights: WEIGHTS.clear, pace: st.pace, key: st.key, dramatic });
  }
  return cleared || !mustClear ? items : null;
}

// Where a phantom ends up: the deepest place it fits in its column, through anything.
function phantomDropY(occ, mat, x, cols, rows) {
  for (let y = rows - mat.length; y >= -mat.length; y--) if (fitsAt(occ, mat, x, y, cols, rows)) return y;
  return null;
}

function flatTopSolidColumns(mat) {
  for (let x = 0; x < mat[0].length; x++) if (!mat[0][x]) return false;
  return solidColumns(mat);
}

// Each column of it in one piece, with no gap between blocks.
function solidColumns(mat) {
  const h = mat.length, w = mat[0].length;
  for (let x = 0; x < w; x++) {
    let state = 0; // 0: none yet, 1: in it, 2: past it
    for (let y = 0; y < h; y++) {
      if (mat[y][x]) { if (state === 2) return false; state = 1; } else if (state === 1) state = 2;
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

// Does the piece fit with its top-left at (x, y)? (Above the board is free.)
function fitsAt(occ, mat, x, y, cols, rows) {
  const h = mat.length, w = mat[0].length;
  if (x < 0 || x + w > cols) return false;
  for (let j = 0; j < h; j++) {
    const by = y + j;
    if (by < 0) continue;
    if (by >= rows) return false;
    const row = mat[j];
    for (let i = 0; i < w; i++) if (row[i] && occ[by * cols + x + i]) return false;
  }
  return true;
}

// Where a piece comes to rest dropped straight down from above the board in column x.
function dropY(occ, mat, x, cols, rows) {
  if (!fitsAt(occ, mat, x, -mat.length, cols, rows)) return null;
  return dropFrom(occ, mat, x, -mat.length, cols, rows);
}

// ...or dropped from (x, y).
function dropFrom(occ, mat, x, y, cols, rows) {
  while (fitsAt(occ, mat, x, y + 1, cols, rows)) y++;
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

// (w.well: a column to keep clear, all the way down)
function score(occ, lines, w, cols, rows) {
  let agg = 0, holes = 0, bump = 0, maxH = 0, prev = -1, inWell = 0;
  for (let x = 0; x < cols; x++) {
    let h = 0;
    for (let y = 0; y < rows; y++) {
      if (occ[y * cols + x]) { if (!h) h = rows - y; }
      else if (h) holes++;
    }
    if (x === w.well) { inWell = h; continue; }
    agg += h;
    if (h > maxH) maxH = h;
    if (prev >= 0) bump += Math.abs(h - prev);
    prev = h;
  }
  const over = Math.max(0, Math.max(maxH, inWell) - (rows - (w.headroom ?? CONFIG.zen.headroom)));
  return w.height * agg + w.lines * lines + w.holes * holes + w.bump * bump - 4 * over * over - 3 * inWell;
}
