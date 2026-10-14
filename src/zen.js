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
// single blocks seals, a mess that powerups demolish, a board full of nothing but spam... with
// quieter interludes between. Small and repetitive things come down faster; the big moments
// take their time (CONFIG.zen.pace).
//
// Nothing can top either out. If the player builds it up into danger, a big powerup comes
// ("steady"), and if a piece ever does lock above the top, the board is rescued instead
// (game.js zenRescue). If the player steps in during a planned movement and the board no longer
// matches the plan, the director says "never mind" and tidies up.

import { CONFIG } from "../config.js";
import { tryMove, tryRotate, zenCaption, timeScaleOf, settleFlock } from "./game.js";
import { selectPiece, destroyerCells, pickFitting } from "./selection.js";
import { gravityColumns } from "./godmode.js";
import { computeEffect, resolvePowerupArea, phantomLandingY, isPhantomPowerup, rollScatter } from "./powerups.js";
import { expandGroup, roomNeeded, groupUnderWay, lastVersion, noteVersion, groupPlayable, playableRun } from "./level6.js";
import { makeRng, sampleByWeight } from "./util.js";
import { loadShapes } from "./shapes.js";
import { colourFamily } from "./threads.js";

const LEVEL6 = 6;

// How the autopilot weighs up a placement (higher is better).
//   clear: the usual: keep it low and tidy, clear rows
//   build: build up neatly without clearing anything (for the demolition)
//   holey: build up evenly, leaving gaps (for the gravitizers to sort out)
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
    mono: 5, small: 0.8, big: 0.8, standing: 2, colour: 2.5, squares: 1.6, waves: 2, blackholes: 1, expanders: 1, oops: 2.5, tiles: 2 },
};
// (the ones that need a low, tidy board to build on)
const PLANNED = new Set(["column", "beds", "crack", "fall", "well", "mess", "standing", "colour", "squares", "tiles"]);
// (the ones happy to carry on from whatever the last one left behind)
const BLENDS = new Set(["build", "chorus", "mono", "small", "big", "waves", "expanders", "blackholes", "oops"]);

const zenSet = (state) => (CONFIG.modes[state.mode]?.zenMovements === "turbo" ? "turbo" : "zen");
// (zen itself, slow and easy, as opposed to turbo zen)
const isCalm = (state) => !!CONFIG.modes[state.mode]?.calm;
// Left alone long enough, zen carries on by itself, a little quicker.
const dozing = (state) => { const z = state.zen; return isCalm(state) && z.clock - z.inputClock >= CONFIG.zen.calm.idleMs; };

export function createZen(state) {
  // (turbo zen opens with something new, the first time since the page was loaded:
  // CONFIG.zen.opening; the UI keeps state.zenOpenings)
  const open = CONFIG.zen.opening?.[zenSet(state)];
  const opening = open && state.zenOpenings && !state.zenOpenings.has(open.movement) ? open : null;
  if (opening) state.zenOpenings.add(opening.movement);
  return {
    queue: [],        // what comes next: { shape, weights, target?: {rot, x}, expect?: board after, pace?, key? }
    current: null,    // the item being played
    expect: null,     // a planned piece's board once it has landed (to notice the player stepping in)
    movement: null,
    last: null,       // the movement before
    after: opening?.movement ?? (zenSet(state) === "zen" ? "natural" : null), // a movement waiting for the board to be tidied first (zen starts as the game would)
    asked: opening?.movement ?? null, opts: opening?.opts ?? null,
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

// Start `name` at the next piece (for tests and the dev panel). `opts`: how it goes, if it has a
// choice (a crack's `end`).
// For the dev panel: every movement there is, by name, and the ways some of them can go.
export function zenMovementChoices() {
  const ghosts = !(CONFIG.assist.powerups.disabledTypes ?? []).includes("phantom");
  const ways = { crack: { end: Object.keys(CRACK_ENDS).filter(k => ghosts || !GHOSTLY.has(k)) }, tiles: { kind: ["floor", "bricks", "pinwheels", "waves", "lizards"] } };
  const out = [];
  for (const name of Object.keys(MOVEMENTS)) {
    if (["pacmen", "taps", "pacmenAndTaps", "settle", "sweep"].includes(name)) continue; // (they only come after others)
    out.push({ name, label: name, opts: null });
    for (const [key, values] of Object.entries(ways[name] ?? {})) for (const v of values) out.push({ name, label: `${name}: ${v}`, opts: { [key]: v } });
  }
  return out;
}

export function zenStart(state, name, opts = null) {
  const z = state.zen;
  if (!z) return;
  z.queue = [];
  z.movement = null;
  z.after = name;
  z.asked = name; // (asked for by name: worth tidying up for, if it needs a clean board)
  z.expect = null;
  z.opts = opts;
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
  // (a fill can put something in first, now that the board has settled: a bed for one big or
  // strange piece, a patch of tiles; and some movements decide each piece only now)
  if (z.movement?.interject && !z.queue.some(it => it.expect)) {
    const extra = z.movement.interject(state);
    // (and what was waiting, picked for the board as it was, is picked again afterwards: it
    // might not fit any more)
    if (extra?.length) z.queue = [...extra];
  }
  // (the next blast of a demolition, picked for the board as it was: only if it still takes a
  // big bite of the board as it is now, or another would; or else that's enough of that, and
  // what's left stays for the next movement to build on: CONFIG.zen.demolish. And the same for
  // one that's only just been picked, if the movement had nothing waiting.)
  for (let tries = 0; tries < 3; tries++) {
    if (!z.queue.length) refill(state);
    let blast = z.queue[0];
    if (!(blast?.blast != null && !blast.expect && !isCalm(state))) break;
    // (one that sprays at random is rolled now, and judged by the spray it will have)
    if (blast.shape.powerup?.scatter && !blast.shape.powerup.rolled) z.queue[0] = blast = { ...blast, shape: rollScatter(blast.shape, state.rng) };
    const need = biteNeeded(state, blast.blast);
    if (biteOf(state, blast.shape) >= need) break;
    const p = blast.keep ? null : biggestBite(state, need);
    if (p) { z.queue[0] = { ...blast, shape: p }; break; }
    z.queue = [];
    if (z.movement) z.movement.over = true;
  }
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
  let item = z.queue.shift();
  // (a big piece picked a turn or two ago, for the board as it was then, that won't go in now:
  // something small instead)
  if (!item.expect && !item.key && !item.shape.powerup && blocks(item.shape) >= 10 && !fitsUnder(state, item.shape, 2)) {
    item = { ...item, shape: pick(state, smallPool(state)), label: null };
  }
  if (item.caption) zenCaption(state, item.caption, "finale", { quiet: true }); // (what happens next, as it starts)
  // (after a big clearance, a breath before the next piece)
  const n = occ.reduce((a, b) => a + b, 0);
  const gone = z.blocks != null ? z.blocks - n : 0;
  z.rest = gone >= 30 && CONFIG.modes[state.mode]?.rest !== false ? Math.min(CONFIG.zen.restMs, gone * 10) : 0;
  z.blocks = n + blocks(item.shape);
  z.current = item;
  z.expect = item.expect ?? null;
  // one more in the queue for the preview, while this movement carries on
  if (!z.queue.length && z.movement && !z.movement.planned && !finished(state)) z.movement.fill(state);
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

// (a movement is over when it says so, or when the director has called it off)
const finished = (state) => { const m = state.zen.movement; return !m || !!m.over || m.done(state); };

function refill(state) {
  const z = state.zen;
  for (let tries = 0; tries < 6 && !z.queue.length; tries++) {
    if (finished(state)) begin(state, pickMovement(state));
    z.movement.fill(state);
    if (!z.queue.length) z.movement = null; // nothing came of it (a plan that didn't work out)
  }
  if (!z.queue.length) z.queue.push({ shape: pick(state, smallPool(state)), weights: WEIGHTS.clear });
}

// (the ones that only clear up after the others: what came before them still counts as the last)
const HOUSEKEEPING = new Set(["tidy", "settle", "sweep", "demolition"]);

function begin(state, name) {
  const z = state.zen;
  if (z.after === name) { z.after = null; z.waited = 0; z.asked = null; }
  z.movement = MOVEMENTS[name](state);
  z.movement.name = name;
  z.movement.careful = z.simRng() < (CONFIG.zen.pace.carefulChance ?? 1); // (slows down near the top)
  z.last = name;
  if (!HOUSEKEEPING.has(name)) z.lastShow = name;
  // (a planned one says what it is once it knows it can be done; one with nothing to say still
  // lets the game know)
  if (!z.movement.planned) zenCaption(state, z.movement.caption ?? null, name);
}

// The next movement: the one waiting (`z.after`), or one at random (never the same twice running).
function pickMovement(state) {
  const z = state.zen;
  const { cols, rows } = CONFIG.board;
  const occ = occupancy(state.board);
  const h = heightOf(occ, cols, rows);
  if (z.after && !PLANNED.has(z.after)) return z.after;
  // (zen: never building anything up, so no waiting for a tidy board)
  if (isCalm(state)) return sampleByWeight(Object.entries(MOVEMENT_WEIGHTS.zen).filter(([k]) => k !== z.last && k !== z.lastShow), ([, w]) => w, state.rng)[0];
  if (!z.after) {
    let options = Object.entries(MOVEMENT_WEIGHTS[zenSet(state)]).filter(([k]) => k !== z.last && k !== z.lastShow);
    // left high: carry on building on what's there (only near the top, a quick tidy first)
    if (h > up(9)) {
      if (h > CONFIG.board.rows - 8) return "tidy";
      options = options.filter(([k]) => BLENDS.has(k));
    }
    z.after = sampleByWeight(options, ([, w]) => w, state.rng)[0];
    z.waited = 0;
  }
  // the planned ones need a low, tidy board to build on: if it isn't one, it waits, and something
  // that builds on what's there goes first (nobody wants to watch every last piece being cleared
  // away; the planned one has its turn after the next big clearance)
  if (PLANNED.has(z.after) && (!solid(occ, cols, rows) || h > 2)) {
    // (only a few stragglers, floating where the last blasts left them: brought down first; or
    // if one of the biggest can take most of what's there at once, down it all comes)
    if (occ.reduce((a, b) => a + b, 0) <= Math.max(4, cols / 3) && z.last !== "settle") return "settle";
    if (z.last !== "sweep" && z.last !== "settle" && (z.sweepWith = sweeper(state))) return "sweep";
    if (z.asked === z.after) {
      if ((z.waited = (z.waited ?? 0) + 1) <= 2) return "tidy";
      z.after = z.asked = null;
      return pickMovement(state);
    }
    if ((z.waited = (z.waited ?? 0) + 1) > 3) z.after = null;
    const blends = Object.entries(MOVEMENT_WEIGHTS[zenSet(state)]).filter(([k]) => BLENDS.has(k) && k !== z.last && k !== z.lastShow);
    return sampleByWeight(blends, ([, w]) => w, state.rng)[0];
  }
  return z.after;
}

const int = (state, a, b) => a + Math.floor(state.rng() * (b - a + 1));
// A height in rows as it would be on the usual board (24 rows), on this one: as far from the top
// (turbo zen can fill the whole window).
const up = (n) => n + CONFIG.board.rows - 24;
// (zen, the easy one: of what it could pick, one that fits the board as it is, mostly)
const pick = (state, list) => (isCalm(state) ? pickFitting(state, list, s => s.frequency ?? 1) : sampleByWeight(list, s => s.frequency ?? 1, state.rng));
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

/* =========================
   Palettes: a few kinds of piece that go together
   =========================
   The best-looking fills (turbo zen) are a few kinds of piece intermingling: two to five of
   them, now and then more (up to fifteen), that share a colour, an idea (a theme), both, or a
   shape (CONFIG.zen.palette). A fill picks its palette from the pieces it would otherwise use
   (`pool`), gives each kind its own share, and draws from those (and now and then, something
   else altogether). Or now and then no palette at all: anything goes, as before.
*/
const outlineKey = (mat) => mat.map(r => r.map(c => (c ? 1 : 0)).join("")).join("/");
const shapeKey = (s) => s.rotations.slice(0, reachableTurns(s)).map(outlineKey).sort()[0];
function shapeCaption(s) {
  const n = blocks(s), m = s.rotations[0], w = m[0].length, h = m.length;
  if (n === 1) return "specks";
  if (n === 2) return "pairs of things";
  if (Math.min(w, h) === 1) return "sticks";
  if (n === w * h && w === h) return "squares";
  if (n === w * h) return "blocks";
  return "things of a certain shape";
}
export function palettePick(state, pool) {
  const P = CONFIG.zen.palette;
  if (!P || isCalm(state) || pool.length < 3 || state.rng() < (P.none ?? 0)) return null;
  const rng = state.rng, groups = [];
  const add = (caption, list, w, kind = "theme") => { if (list.length >= 2 && w > 0) groups.push({ caption, list, w, kind }); };
  const byColour = new Map(), byShape = new Map();
  for (const s of pool) {
    const c = colourOf(s);
    if (c && c !== "black" && c !== "many") (byColour.get(c) ?? byColour.set(c, []).get(c)).push(s);
    const k = shapeKey(s);
    (byShape.get(k) ?? byShape.set(k, []).get(k)).push(s);
  }
  const colours = [...byColour].filter(([, l]) => l.length >= 2);
  for (const [c, list] of colours) add(`${c} things`, list, (P.colour ?? 1) / colours.length);
  const themes = [...(state.threads?.members ?? [])].filter(([name]) => !name.includes(":"))
    .map(([name, ids]) => [name, pool.filter(s => ids.has(s.id))]).filter(([, l]) => l.length >= 2);
  const both = [];
  for (const [name, list] of themes) {
    add(name, list, (P.theme ?? 1) / themes.length);
    for (const [c] of colours) { const l = list.filter(s => colourOf(s) === c); if (l.length >= 2) both.push([`${c} ${name}`, l]); }
  }
  for (const [caption, list] of both) add(caption, list, (P.colourTheme ?? 0.5) / both.length);
  const shapes = [...byShape].filter(([, l]) => l.length >= 2);
  for (const [, list] of shapes) add(shapeCaption(list[0]), list, (P.shape ?? 0.6) / shapes.length, "shape");
  if (!groups.length) return null;
  const g = sampleByWeight(groups, x => x.w, rng);
  // how many kinds: mostly two to five, now and then up to fifteen
  const want = sampleByWeight((P.kinds ?? [1]).map((w, i) => ({ n: i + 2, w })), x => x.w, rng).n;
  const left = g.list.slice(), pieces = [];
  while (pieces.length < want && left.length) { const one = pickFresh(state, left); pieces.push(one); left.splice(left.indexOf(one), 1); }
  return { pieces, share: new Map(pieces.map(p => [p, 0.4 + 1.2 * rng()])), caption: g.caption, kind: g.kind, pool };
}
// A piece from a fill's palette that still fits (or something small); now and then something
// else altogether, from the fill's whole pool.
function fromPalette(state, pal, pool, headroom = 4) {
  const P = CONFIG.zen.palette ?? {};
  const odd = !pal || state.rng() < (P.odd ?? 0);
  const list = (odd ? pool : pal.pieces).filter(s => fitsUnder(state, s, headroom));
  if (!list.length) return pickFresh(state, smallPool(state));
  return odd ? pickFresh(state, list) : sampleByWeight(list, s => pal.share.get(s) ?? 1, state.rng);
}
// The mood for doing things in batches (the same piece a few times running, to read its name):
// it wanders up and down as it goes, and now and then jumps (CONFIG.zen.batches).
function sameness(state) {
  const z = state.zen, B = CONFIG.zen.batches ?? {};
  z.same = Math.max(0, Math.min(1, (z.same ?? 0.3) + (state.rng() - 0.5) * (B.wander ?? 0.2)));
  if (state.rng() < (B.jump ?? 0)) z.same = state.rng();
  return z.same;
}

// Now and then something else altogether (turbo zen): one of the pieces it hardly ever uses, the
// least used the likeliest (state.zenUses, since the page was loaded), for the rest to work
// round, awkward or not (CONFIG.zen.strays). `chance`: how likely, this piece.
function stray(state, chance = CONFIG.zen.strays?.chance ?? 0) {
  const S = CONFIG.zen.strays;
  if (!S || isCalm(state) || state.rng() >= chance) return null;
  const uses = state.zenUses ?? new Map();
  const pool = regularPool(state).filter(s => (s.difficulty ?? 1) <= (S.maxDifficulty ?? 5) && fitsUnder(state, s, S.headroom ?? 4));
  if (!pool.length) return null;
  return sampleByWeight(pool, s => 1 / (1 + (uses.get(s.id) ?? 0)) ** (S.power ?? 1.5), state.rng);
}
const noteUse = (state, shape) => { const u = (state.zenUses ??= new Map()); u.set(shape.id, (u.get(shape.id) ?? 0) + 1); };
// How fresh a piece is (turbo zen): 1 if it hasn't come up since the page was loaded, less the
// more it has (to the power `power`), so whatever the director picks from, it spreads itself
// over all of it. (Zen as it comes: always 1.)
const fresh = (state, s, power = CONFIG.zen.strays?.freshness ?? 0.5) => (isCalm(state) ? 1 : 1 / (1 + (state.zenUses?.get(s.id) ?? 0)) ** power);
const pickFresh = (state, list) => sampleByWeight(list, s => (s.frequency ?? 1) * fresh(state, s), state.rng);

function giantPiece(state) {
  const g = giantPool(state).filter(s => fitsUnder(state, s, 4));
  return g.length ? pick(state, g) : buildPiece(state);
}

// Bringing the board down only goes on while it's spectacular (turbo zen): after the first big
// blasts (CONFIG.zen.demolish.free), another only if the last one took a good bite (minBlocks,
// or minShare of what was there); otherwise what's left stays, and the next movement builds on
// it. `mv` keeps the count from one piece to the next; `n` is how many have gone off so far.
function stillWorthIt(mv, state, n) {
  const D = CONFIG.zen.demolish ?? {};
  const now = occupancy(state.board).reduce((a, b) => a + b, 0);
  if (mv.countAt !== state.drops) { mv.before = mv.count; mv.count = now; mv.countAt = state.drops; }
  if (isCalm(state) || n < (D.free ?? 1) || mv.before == null) return true;
  return mv.before - mv.count >= Math.max(bigBite(), (D.minShare ?? 0.2) * mv.before);
}
// (minBlocks, for the size of this board)
const bigBite = () => { const D = CONFIG.zen.demolish ?? {}; return (D.minBlocks ?? 16) * Math.max(1, CONFIG.board.cols * CONFIG.board.rows / 336) ** (D.grow ?? 1); };

// ...and before each blast (zenNext), on the board as it is by then: how big a bite it has to
// take (`n`: how many have gone off so far), how big a bite a powerup would take, put where the
// autopilot would put it, and the one of a good handful that takes the biggest, if it's at
// least `need`.
function biteNeeded(state, n) {
  const D = CONFIG.zen.demolish ?? {};
  if (n < (D.free ?? 1)) return 1;
  const there = occupancy(state.board).reduce((a, b) => a + b, 0);
  return Math.max(bigBite(), (D.minShare ?? 0.2) * there);
}
function biteOf(state, shape) {
  if (!shape.powerup) return 0;
  const place = bestPlacement(state, shape, WEIGHTS.clear, 2);
  if (!place) return 0;
  const before = occupancy(state.board).reduce((a, b) => a + b, 0);
  return before - tryPowerup(state, shape, place.rot, place.x, place.y).occ.reduce((a, b) => a + b, 0);
}
function biggestBite(state, need) {
  const pool = powerupPool(state).filter(p => !p.powerup.bad), tried = new Set();
  let best = null;
  for (let i = 0; i < CONFIG.zen.powerupChoices * 2 && pool.length; i++) {
    const p = pool[Math.floor(state.rng() * pool.length)];
    const rare = CONFIG.godMode?.rarer?.[p.id];
    if (tried.has(p) || (rare != null && pool.length > 1 && z01(state) >= rare)) continue;
    tried.add(p);
    if (tried.size > CONFIG.zen.powerupChoices) break;
    const q = rollScatter(p, state.rng); // (judged by the spray it will have)
    const bite = biteOf(state, q);
    if (bite >= need && (!best || bite > best.bite)) best = { p: q, bite };
  }
  return best?.p ?? null;
}

// One of the biggest (CONFIG.zen.sweep: that destroy `size` cells at least) that would take
// `most` of what's there at once, or null.
function sweeper(state) {
  const S = CONFIG.zen.sweep ?? {};
  const there = occupancy(state.board).reduce((a, b) => a + b, 0);
  let best = null;
  for (const p of powerupPool(state).filter(p => !p.powerup.bad && destroyerCells(p) >= (S.size ?? 90))) {
    const rare = CONFIG.godMode?.rarer?.[p.id];
    if (rare != null && z01(state) >= rare) continue;
    const q = rollScatter(p, state.rng); // (judged by the spray it will have)
    const bite = biteOf(state, q);
    if (bite >= (S.most ?? 0.6) * there && (!best || bite > best.bite)) best = { p: q, bite };
  }
  return best?.p ?? null;
}

// Build up to `target` rows with next() pieces (placed with `weights`), keeping one column clear
// all the way down so nothing clears on the way up, then bring it all down: sometimes one of
// the tallest pieces drops into that column (`keyChance`), or else the powerups, the biggest first.
// (`only`: nothing but next()'s pieces, so when the next won't fit, that's as high as it goes;
// `label`: what the name says for each of them, the same all the way up.)
function fillThenBlast(caption, next, { target, weights = WEIGHTS.build, pace = 1, maxPieces = 70 * CONFIG.board.cols * CONFIG.board.rows / 336, keyChance = 0.5, blastWith = null, blasts = 7, only = false, label = null, streaks = 0, strays = CONFIG.zen.strays?.chance ?? 0 } = {}) {
  // (`streaks`: how often a piece, when it's going quickly, comes two to four times running, so
  // there's time to read its name; `strays`: how often something else altogether)
  const again = { shape: null, left: 0 };
  const nextOne = (state) => {
    if (again.left > 0 && fitsUnder(state, again.shape, 2)) { again.left--; return again.shape; }
    const odd = only ? null : stray(state, strays);
    if (odd) { again.stray = true; return odd; }
    const s = next(state);
    // (batches: as the mood takes it, likelier and longer when it's going quickly)
    const B = CONFIG.zen.batches ?? {}, same = isCalm(state) ? 0 : sameness(state), fast = pace <= (B.fastPace ?? 0.85);
    const chance = Math.min(0.95, streaks + (B.base ?? 0) + same * (fast ? B.fast ?? 0 : B.slow ?? 0));
    if (s && state.rng() < chance) { again.shape = s; again.left = int(state, 1, 1 + Math.round(same * (fast ? B.longFast ?? 3 : B.longSlow ?? 2))); } else again.left = 0;
    return s;
  };
  return {
    caption, pace, phase: "fill", target, blasts: 0, pieces: 0, weights: null, leave: 3, extras: null,
    // (now and then, on the way up, a bed for one big or strange piece, or a patch of tiles)
    interject(state) {
      // (not if the player had the last one: it might not be where it was going)
      if (state.zen.userHas || this.phase !== "fill" || !this.extras?.length || only) return null;
      if (stackHeight(state) < this.extras[0].at) return null;
      const { kind } = this.extras.shift();
      const res = kind === "bed" ? planNest(state, { weights: this.weights }) : planPatch(state, { weights: this.weights });
      if (!res) return null;
      if (res.caption) zenCaption(state, res.caption, kind, { quiet: true });
      return res.items;
    },
    fill(state) {
      const { cols, rows } = CONFIG.board;
      if (!this.weights) {
        this.extras = extrasFor(state, stackHeight(state), this.target);
        // (the column kept clear: one that's clear all the way down already, if there is one, so
        // one of the tallest pieces can bring it all down at the end)
        const occ = occupancy(state.board), clear = [...Array(cols).keys()].filter(x => colTop(occ, x, cols, rows) === rows);
        this.weights = { ...weights, well: clear.length ? clear[Math.floor(state.rng() * clear.length)] : Math.floor(state.rng() * cols) };
        // (on top of whatever's there; and now and then it leaves some behind for the next)
        this.target = Math.min(rows - 3, Math.max(this.target, stackHeight(state) + 5));
        if (state.rng() < 0.3) this.leave = int(state, 5, 8);
        // (behind the home screen it leaves plenty: CONFIG.modes.home.keep)
        const keep = CONFIG.modes[state.mode]?.keep;
        if (keep) this.leave = int(state, keep[0], keep[1]);
      }
      let shape = this.phase === "fill" ? nextOne(state) : null;
      if (shape && !fitsUnder(state, shape, 2)) shape = only ? null : pick(state, smallPool(state)); // (nearly there: nothing too big)
      if (this.phase === "fill" && (!shape || stackHeight(state) >= this.target || this.pieces >= maxPieces)) {
        this.phase = "blast";
        this.pace = 1;
        const wx = this.weights.well, keys = zenKeys(state).filter(k => k.rotations[0][0].length === 1);
        const occ = occupancy(state.board);
        // (only if the column is still clear, and most of the rows would go; and all the likelier
        // when something that wants a clean board is waiting)
        const chance = PLANNED.has(state.zen.after) ? Math.max(keyChance, CONFIG.zen.keyWhenWaiting ?? 0) : keyChance;
        if (keys.length && state.rng() < chance && colTop(occ, wx, cols, rows) === rows && rowsReady(occ, wx, cols, rows) >= 0.7 * heightOf(occ, cols, rows)) {
          const ready = rowsReady(occ, wx, cols, rows);
          state.zen.queue.push({ shape: keys[Math.floor(state.rng() * keys.length)], target: { rot: 0, x: wx }, weights: WEIGHTS.clear, key: true, dramatic: ready >= (CONFIG.zen.dramatic?.minRows ?? 12) * Math.max(1, rows / 24) });
          return;
        }
        zenCaption(state, "demolition", "demolition");
      }
      if (this.phase === "fill") {
        state.zen.queue.push({ shape, weights: this.weights, label, ...(again.stray ? { stray: true } : {}) });
        again.stray = false;
        this.pieces++;
      } else {
        const full = this.blasts === 0 && stackHeight(state) >= rows - 6 && state.rng() < (CONFIG.zen.dramatic?.demolitionChance ?? 0);
        state.zen.queue.push({ shape: blastWith ? blastWith(state, this.blasts) : this.blasts < 2 ? bigPowerup(state) : bestPowerup(state), weights: WEIGHTS.clear, dramatic: full, blast: this.blasts, keep: !!blastWith });
        this.blasts++;
      }
    },
    done(state) { return this.phase === "blast" && (this.blasts >= blasts || stackHeight(state) <= this.leave || !stillWorthIt(this, state, this.blasts)); },
  };
}

// Comings and goings: built up full of gaps, then the gravitizers sort the gaps out,
// then up again, higher, and again, until at last it all comes down.
function waves(state) {
  const { rows } = CONFIG.board;
  const pool = regularPool(state).filter(s => (s.difficulty ?? 1) <= 3), pal = palettePick(state, pool);
  return {
    caption: "comings and goings", phase: "fill", round: 0, rounds: int(state, 2, 3), target: up(int(state, 11, 14)), pieces: 0, fixes: 0, blasts: 0, weights: null,
    fill(state) {
      const z = state.zen, h = stackHeight(state);
      if (!this.weights) { this.weights = { ...WEIGHTS.holey }; this.target = Math.max(this.target, h + 4); }
      if (this.phase === "fill" && (h >= this.target || this.pieces >= 40 * CONFIG.board.cols * CONFIG.board.rows / 336)) {
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
        let shape = stray(state) ?? (state.rng() < 0.12 ? buildPiece(state) : fromPalette(state, pal, pool, 3));
        if (!fitsUnder(state, shape, 3)) shape = pick(state, smallPool(state));
        z.queue.push({ shape, weights: this.weights });
        this.pieces++;
        return;
      }
      z.queue.push({ shape: this.blasts < 2 ? bigPowerup(state) : bestPowerup(state), weights: WEIGHTS.clear, blast: this.blasts });
      this.blasts++;
    },
    done(state) { return this.phase === "blast" && (this.blasts >= 6 || stackHeight(state) <= 3 || !stillWorthIt(this, state, this.blasts)); },
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

// The gravitizer (or phantom, while there are any) of a handful that would close the most gaps.
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
      // (what comes after, unless one of the tallest pieces brings it all down anyway; the plan
      // can say)
      const after = res.then ?? then;
      if (after && !items.some(it => it.key)) state.zen.after = after;
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
  rain: (state) => {
    const pool = smallPool(state), pal = palettePick(state, pool);
    return {
      caption: "light rain", left: int(state, 14, 24), pace: 0.8,
      fill(state) { state.zen.queue.push({ shape: isCalm(state) ? pick(state, pool) : fromPalette(state, pal, pool), weights: WEIGHTS.clear }); this.left--; },
      done() { return this.left <= 0; },
    };
  },

  // build up near the top without clearing anything, then knock it all down (with a palette:
  // a few kinds of thing that go together)
  build: (state) => {
    const pool = regularPool(state).filter(s => (s.difficulty ?? 1) <= 3), pal = palettePick(state, pool);
    return fillThenBlast(pal?.caption ?? "a slow build", (st) => (st.rng() < 0.12 ? buildPiece(st) : fromPalette(st, pal, pool)), { target: up(int(state, 18, 21)), pace: 0.9, streaks: 0.2 });
  },

  // up near the top again, full of awkward gaps, and then the powerups have at it
  mess: () => planned("a mess", (state) => planMess(state), "demolition"),

  // the same piece two, three or four times in a row
  chorus: (state) => {
    let left = 0, cur = null;
    const pool = regularPool(state).filter(s => (s.difficulty ?? 1) <= 3), pal = palettePick(state, pool);
    return fillThenBlast("in twos and threes", (st) => {
      if (left <= 0 || !fitsUnder(st, cur, 4)) { cur = fromPalette(st, pal, pool); left = int(st, 2, 4); }
      left--;
      return cur;
    }, { target: up(int(state, 17, 20)), pace: 0.8 });
  },

  // the board full of one thing: spam, the animals, Big Bens...
  mono: (state) => {
    const fam = pickFamily(state);
    return fillThenBlast(fam.caption, (st) => {
      const fits = fam.pieces.filter(s => fitsUnder(st, s, 4));
      return fits.length ? pickFresh(st, fits) : pickFresh(st, smallPool(st));
    }, { target: up(int(state, 17, 20)), pace: 0.75, streaks: 0.3, strays: (CONFIG.zen.strays?.chance ?? 0) / 2 });
  },

  // the board full of one awkward thing, and the name says so all the way up: "Oops, all bagpipes!"
  oops: (state) => {
    const s = awkwardOne(state);
    if (!s) return MOVEMENTS.mono(state);
    return fillThenBlast(null, () => s, { target: up(int(state, 17, 20)), pace: 0.75, only: true, keyChance: 0.3, label: oopsName(state, s.name) });
  },

  // small things, lots of them, quickly
  small: (state) => {
    const pool = smallPool(state), pal = palettePick(state, pool);
    return fillThenBlast(pal ? (pal.kind === "shape" ? pal.caption : `small ${pal.caption}`) : "small things", (st) => fromPalette(st, pal, pool), { target: up(int(state, 18, 21)), pace: 0.6, maxPieces: 110 * CONFIG.board.cols / 14, streaks: 0.4 });
  },

  // big things
  big: (state) => {
    const pool = giantPool(state), pal = palettePick(state, pool);
    return fillThenBlast(pal ? `big ${pal.caption}` : "big things", (st) => (pal ? fromPalette(st, pal, pool) : giantPiece(st)), { target: up(int(state, 16, 19)), pace: 1.1 });
  },

  // the giants: a level 6 set if one fits, or a few giant pieces
  giants: (state) => ({
    caption: "giants", pushed: false,
    fill(state) {
      this.pushed = true;
      const { rows } = CONFIG.board;
      const room = rows - (CONFIG.zen.level6?.headroom ?? 7) - stackHeight(state);
      const sets = (state.groups ?? []).filter(g => groupPlayable(state, g));
      for (let i = 0; i < 4 && sets.length; i++) {
        const g = sampleByWeight(sets, g => g.frequency, state.rng);
        const pieces = playableRun(state, expandGroup(g, state.rng, state.pieceSel?.level6?.variants, lastVersion(state, g)));
        if ((g.room || roomNeeded(pieces)) <= room) {
          noteVersion(state, g, pieces.version);
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

  // a gap in every row, in a pattern, then it's sealed one of several ways (CRACK_ENDS)
  crack: () => planned(null, (state) => { const end = state.zen.opts?.end; state.zen.opts = null; return planCrack(state, end); }),

  // (after a crack: powerups that take the rows away a row or two at a time)
  pacmen: (state) => sealWith(state, ["pacman"], "pacmen"),
  taps: (state) => sealWith(state, ["leaky_tap"], "leaky taps"),
  pacmenAndTaps: (state) => sealWith(state, ["pacman", "leaky_tap"], "pacmen and leaky taps"),

  // the biggest powerups, then the most useful, until it's nearly all gone
  demolition: () => ({
    caption: "demolition", used: 0,
    fill(state) {
      const full = this.used === 0 && stackHeight(state) >= CONFIG.board.rows - 6 && state.rng() < (CONFIG.zen.dramatic?.demolitionChance ?? 0);
      state.zen.queue.push({ shape: this.used < 2 ? bigPowerup(state) : bestPowerup(state), weights: WEIGHTS.clear, dramatic: full, blast: this.used });
      this.used++;
    },
    done(state) { return this.used >= 7 || stackHeight(state) <= 3 || !stillWorthIt(this, state, this.used); },
  }),

  // the board full of board-height pieces side by side (or of long sticks standing on end), the
  // last one completing every row at once
  standing: () => planned("standing up", (state) => planStanding(state)),

  // the board built up in bands of colour, a rainbow, then down it all comes
  colour: () => planned(null, (state) => planColour(state), "demolition"),

  // squares of colour in a pattern, a checkerboard or diagonal stripes, then down it comes
  squares: () => planned(null, (state) => planSquares(state), "demolition"),

  // tiles in a pattern: a tiled floor, brickwork, pinwheels, waves (only if there are tiles)
  tiles: () => planned(null, (state) => { const kind = state.zen.opts?.kind; state.zen.opts = null; return planTiles(state, kind); }, "demolition"),

  // up and down and up again
  waves: (state) => waves(state),

  // built up, then one black hole after another
  blackholes: (state) => fillThenBlast("a series of black holes", ((pool, pal) => (st) => (st.rng() < 0.12 ? buildPiece(st) : fromPalette(st, pal, pool)))(regularPool(state).filter(s => (s.difficulty ?? 1) <= 3), palettePick(state, regularPool(state).filter(s => (s.difficulty ?? 1) <= 3))), {
    target: up(int(state, 15, 19)), pace: 0.8, blasts: 8, streaks: 0.25,
    blastWith: (st, n) => { const holes = powerupPool(st).filter(p => /black hole/i.test(p.name)); return holes.length && n % 3 !== 2 ? bestPowerup(st, holes) : bigPowerup(st); },
  }),

  // the board filled by expanding pieces, then the powerups
  expanders: (state) => ({
    caption: "expanding", used: 0, target: up(int(state, 16, 20)), phase: "grow", blasts: 0,
    fill(state) {
      const pool = powerupPool(state).filter(p => p.powerup.type === "expander" && !p.powerup.bad);
      if (this.phase === "grow" && (stackHeight(state) >= this.target || this.used >= 16 * CONFIG.board.cols / 14 || !pool.length)) { this.phase = "blast"; zenCaption(state, "demolition", "demolition"); }
      if (this.phase === "grow") {
        state.zen.queue.push({ shape: bestPowerup(state, pool, CONFIG.zen.powerupChoices, WEIGHTS.grow), weights: WEIGHTS.grow });
        this.used++;
        return;
      }
      state.zen.queue.push({ shape: this.blasts < 2 ? bigPowerup(state) : bestPowerup(state), weights: WEIGHTS.clear, blast: this.blasts });
      this.blasts++;
    },
    done(state) { return this.phase === "blast" && (this.blasts >= 7 || stackHeight(state) <= 3 || !stillWorthIt(this, state, this.blasts)); },
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

  // (most of what's there, at once, so that something that needs a clean board can go ahead)
  sweep: () => ({
    caption: null, pushed: false,
    fill(state) {
      this.pushed = true;
      const p = state.zen.sweepWith ?? sweeper(state);
      state.zen.sweepWith = null;
      if (p) state.zen.queue.push({ shape: p, weights: WEIGHTS.clear, dramatic: true });
    },
    done() { return this.pushed; },
  }),

  // (a few stragglers left floating where the last blasts left them: brought down, a gravitizer
  // or two, so that something that needs a clean board can go ahead)
  settle: () => ({
    caption: null, used: 0,
    fill(state) { state.zen.queue.push({ shape: consolidator(state), weights: WEIGHTS.clear }); this.used++; },
    done(state) { const { cols, rows } = CONFIG.board, occ = occupancy(state.board); return this.used >= 3 || (solid(occ, cols, rows) && heightOf(occ, cols, rows) <= 2); },
  }),

  // powerups until the board is low with no gaps
  // (turbo zen: only to bring a board that's near the top down a way, not to clean up every last
  // piece: what's left, the next movement builds on)
  tidy: () => ({
    caption: "tidying up", used: 0,
    // (turbo zen: in big bites, while there are any, unless it's for something asked for by name,
    // which needs the board clean; zen: as useful as can be)
    fill(state) {
      const z = state.zen, asked = z.asked && PLANNED.has(z.asked);
      z.queue.push({ shape: isCalm(state) || asked ? bestPowerup(state) : bigPowerup(state), weights: WEIGHTS.clear, blast: asked ? null : this.used });
      this.used++;
    },
    done(state) {
      const { cols, rows } = CONFIG.board;
      const occ = occupancy(state.board);
      // (zen, and for a planned movement asked for by name: right down to a clean board)
      if (isCalm(state) || (state.zen.asked && PLANNED.has(state.zen.asked))) return this.used >= 6 || (solid(occ, cols, rows) && heightOf(occ, cols, rows) <= 2);
      return this.used >= 3 || heightOf(occ, cols, rows) <= rows - 10 || !stillWorthIt(this, state, this.used);
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
  const invaders = live(["invader_squid_arcade", "invader_crab_arcade", "invader_octopus_arcade", "invader_squid_neon", "invader_crab_neon", "invader_octopus_neon",
    "invader_squid_sticky_notes", "invader_crab_sticky_notes", "invader_octopus_sticky_notes", "mystery_ship", "space_invader", "space_invader_2", "space_invader_3", "space_invader_4"]);
  if (invaders.length >= 3) add("an invasion", "a few invaders", invaders, 3);
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

// One after another of `ids` (in turn), each put wherever it does the most good, until the board
// is nearly empty.
function sealWith(state, ids, caption) {
  const pool = ids.map(id => state.powerups.find(p => p.id === id)).filter(Boolean);
  const most = CONFIG.zen.sealWith ?? 6;
  return {
    caption, used: 0,
    fill(state) {
      state.zen.queue.push({ shape: pool.length ? pool[this.used % pool.length] : bestPowerup(state), weights: WEIGHTS.clear });
      // (a few of them, and then the rest comes down in big bites, while it's worth it)
      if (++this.used >= most) state.zen.after = "demolition";
    },
    done(state) { return this.used >= most || stackHeight(state) <= 1; },
  };
}

// One awkwardly shaped piece, small enough to fill the board with (the more awkward the likelier).
function awkwardOne(state) {
  const list = regularPool(state).filter(s => {
    const m = s.rotations[0], n = blocks(s), h = m.length, w = m[0].length;
    return [2, 3, 4].includes(s.difficulty ?? 1) && !s.remix && n >= 5 && n <= 22 && w <= 7 && h <= 7 && n / (w * h) <= 0.78;
  });
  return list.length ? sampleByWeight(list, s => { const m = s.rotations[0]; return 1.2 - blocks(s) / (m.length * m[0].length); }, state.rng) : null;
}

// A piece's name for lots of them: "a bagpipe" is "bagpipes", "a sock full of night" "socks full
// of night", "a cactus that wants a hug" "cacti that want a hug", "Big Ben" "Big Bens".
// What the name says, all the way up, for a board full of one awkward thing: now its own name,
// now one of these (CONFIG.zen.oopsNames: weights).
const OOPS = {
  plain: () => null,
  oops: (one, many) => `Oops, all ${many}!`,
  thrice: (one) => `${one} ${one} ${one}!!`,
  more: (one, many) => `${many} ${many} and more ${many}`,
  reserve: (one, many) => `the strategic reserve of ${many}`,
};
export function oopsName(state, name, kind = null) {
  const w = CONFIG.zen.oopsNames ?? { oops: 1 };
  kind ??= sampleByWeight(Object.keys(OOPS).filter(k => w[k] > 0), k => w[k], state.rng);
  const one = name.trim().replace(/^(?:just |only )?(?:a|an|the|some|one|another)\s+/i, "");
  return OOPS[kind](one, pluralName(name));
}

export function pluralName(name) {
  const s = name.trim().replace(/^(?:just |only )?(?:a|an|the|some|one|another)\s+/i, "");
  const m = s.match(/^(.*?)(\s+(?:full of|made of|of|with|on|in|for|from|that|who|which|under|over|without|at|by|to|and|holding|wearing|inside|called)\s.*|,\s+\w+ing\b.*|\s+\(.*)$/i);
  let head = m ? m[1] : s, tail = m ? m[2] : "";
  const words = head.split(/\s+/);
  // (the thing itself, not what's been done to it: Santas stuck in a chimney)
  const k = words.length > 1 && /^(stuck|lost|left|gone|trapped|frozen|\w+ed)$/i.test(words[words.length - 1]) ? words.length - 2 : words.length - 1;
  words[k] = pluralWord(words[k]);
  // (and what they do, for more than one: "that want", "who don't")
  tail = tail.replace(/^(\s+(?:that|who|which)\s+)(\w+)('t)?/i, (all, lead, verb, nt) => {
    const v = verb.toLowerCase();
    if (nt && v === "doesn") return lead + "don't";
    if (nt && v === "isn") return lead + "aren't";
    if (nt && v === "wasn") return lead + "weren't";
    if (nt) return all;
    const to = { is: "are", was: "were", has: "have", does: "do" }[v] ?? (/(ches|shes|sses|xes)$/.test(v) ? verb.slice(0, -2) : /[^s]s$/.test(v) ? verb.slice(0, -1) : verb);
    return lead + to;
  });
  return words.join(" ") + tail;
}
const PLURAL = { man: "men", woman: "women", mouse: "mice", goose: "geese", foot: "feet", tooth: "teeth", person: "people", child: "children", ox: "oxen", die: "dice", cactus: "cacti", fungus: "fungi", louse: "lice", leaf: "leaves", loaf: "loaves", knife: "knives", life: "lives", wife: "wives", wolf: "wolves", half: "halves", shelf: "shelves", calf: "calves", elf: "elves", thief: "thieves", scarf: "scarves", potato: "potatoes", tomato: "tomatoes", tomatoe: "tomatoes", hero: "heroes", echo: "echoes", volcano: "volcanoes", tornado: "tornadoes", torpedo: "torpedoes", raviolo: "ravioli", octopus: "octopuses", platypus: "platypuses", bus: "buses", walrus: "walruses" };
const UNCOUNTED = new Set(["sheep", "fish", "deer", "moose", "series", "species", "bison", "salmon", "aircraft", "spam", "sushi", "fog", "darkness", "nothing", "everything", "music", "furniture", "rice", "bread", "cheese", "jelly", "lego", "pasta", "toast", "trash", "rubbish", "steel", "gold", "silver", "ice", "snow", "rain", "smoke", "ennui", "existence", "time", "reality", "consciousness", "knowledge", "ignorance", "wisdom", "death", "soup", "poetry", "news", "pyjamas", "trousers", "scissors", "glasses", "sunglasses"]);
function pluralWord(w) {
  const lower = w.toLowerCase();
  const asIs = (p) => (w[0] !== w[0].toLowerCase() ? p[0].toUpperCase() + p.slice(1) : p);
  if (UNCOUNTED.has(lower)) return w;
  if (PLURAL[lower]) return asIs(PLURAL[lower]);
  if (/[^s]s$/.test(lower) && !/(us|is)$/.test(lower)) return w; // (more than one already: bagpipes, bees)
  if (/(s|x|z|ch|sh)$/.test(lower)) return w + "es";
  if (/[^aeiou]y$/.test(lower)) return w.slice(0, -1) + "ies";
  return w + "s";
}

// The powerup (of a handful, at random) that would do the most good on this board.
function bestPowerup(state, pool = powerupPool(state), tries = CONFIG.zen.powerupChoices, weights = WEIGHTS.clear) {
  if (!pool.length) return pick(state, smallPool(state));
  let best = null;
  for (let i = 0; i < tries; i++) {
    const p = pool[Math.floor(state.rng() * pool.length)];
    // (the biggest of all not every time it comes up: CONFIG.godMode.rarer)
    const rare = CONFIG.godMode?.rarer?.[p.id];
    if (rare != null && pool.length > 1 && z01(state) >= rare) continue;
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
  noteUse(state, a.shape);
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
  // (a powerup about to bring most of the board down: the dramatic pause comes before it falls;
  // game.js holds everything for it)
  z.pauseFirst = a.shape.powerup && land != null && bigMoment(state, a.shape, a.rotIdx, a.x, land) ? CONFIG.zen.dramatic.pauseMs * timeScaleOf(state) : 0;
  zenSpeed(state);
  // (each takes a moment at least, however short the way down, but it falls at the same speed
  // all the way: a short way down, it starts a little further up, out of sight)
  if (!isCalm(state) && !z.userHas) {
    const lead = Math.ceil(CONFIG.zen.pieceMs * z.pace / state.dropMs) - z.fall;
    if (lead > 0) a.y -= lead;
  }
  // (and after a big clearance it starts further up still)
  if (z.rest > 0) a.y -= Math.round(z.rest / state.dropMs);
  // (on a big board, a few more of them might come down with it)
  formFlock(state, land);
}

/* =========================
   A flock: on a big board, a few at once
   =========================
   Turbo zen on a big board (the whole window): now and then a few of the pieces still to come
   fall together with this one, each over columns of its own (CONFIG.zen.flock). They land on
   the board as it is, and the rows they fill clear when this one locks (game.js waits for
   them), which comes to the same as one after the other, so a plan still works out as planned
   (and it's checked: if it wouldn't, they come one at a time). In a run of pieces, the next few
   of the run; in a plan, any further on that are clear of everything they'd jump ahead of.
   Never a powerup or a level 6 piece, and nothing jumps ahead of a powerup.
*/
function formFlock(state, land) {
  const z = state.zen, F = CONFIG.zen.flock, a = state.active, t = z.target;
  const { cols, rows } = CONFIG.board;
  state.flock = [];
  if (!F || isCalm(state) || z.userHas || a.shape.powerup || t?.slide || land == null || cols < F.minCols) return;
  // (the tiniest pieces come down in a shower: lots of them at once)
  const tiny = F.tiny && blocks(a.shape) <= 2 ? F.tiny : null;
  const room = Math.min(tiny?.most ?? F.most, Math.floor(cols / (tiny?.colsEach ?? F.colsEach))) - 1;
  if (room < 1 || z.simRng() >= (tiny?.chance ?? F.chance)) return;
  const want = tiny ? Math.ceil(room * (0.5 + 0.5 * z.simRng())) : 1 + Math.floor(z.simRng() * room);
  const planned = !!z.expect;
  const mat = a.shape.rotations[a.rotIdx];
  // the columns taken (a margin either side), and those of the plan's pieces jumped ahead of
  const taken = [[a.x - F.margin, a.x + mat[0].length + F.margin]], passed = [];
  const apart = (x0, x1, spans) => spans.every(([l, r]) => x1 <= l || x0 >= r);
  const occ = occupancy(state.board);
  lay(occ, mat, a.x, land, cols);
  const before = z.queue.slice(), expects = before.map(it => it.expect);
  const members = [], pulled = new Set();
  for (let i = 0; members.length < want && i < (planned ? 60 + 4 * want : want + 2); i++) {
    if (!planned && i >= z.queue.length && z.movement && !z.movement.planned && !finished(state)) z.movement.fill(state);
    const item = z.queue[i];
    if (!item || item.shape.powerup || !!item.expect !== planned || (planned && !item.target)) break;
    let spot = null;
    if (!item.key && !item.dramatic && !item.emergency && !item.target?.slide && item.shape.difficulty !== LEVEL6) {
      spot = item.target ? { rot: item.target.rot, x: item.target.x }
        : flockSpot(occ, item.shape, item.weights ?? WEIGHTS.clear, (x0, x1) => apart(x0, x1, taken), cols, rows, F.headroom, z.simRng);
    }
    const m = spot && item.shape.rotations[spot.rot];
    const fits = m && apart(spot.x, spot.x + m[0].length, taken) && apart(spot.x, spot.x + m[0].length, passed);
    const y = fits ? dropY(occ, m, spot.x, cols, rows) : null;
    if (y == null || y < (planned ? 0 : F.headroom)) {
      if (!planned) break; // (a run keeps its order)
      // (one of the plan's that stays where it is: nothing in its columns can jump ahead of it)
      const it = item.target, w = item.shape.rotations[it.rot]?.[0].length ?? cols;
      passed.push([Math.min(it.x, it.slide?.to ?? it.x), Math.max(it.x, it.slide?.to ?? it.x) + w]);
      continue;
    }
    lay(occ, m, spot.x, y, cols);
    taken.push([spot.x - F.margin, spot.x + m[0].length + F.margin]);
    pulled.add(item);
    noteUse(state, item.shape);
    members.push({ shape: item.shape, rotIdx: spot.rot, x: spot.x, land: y, at: i });
  }
  if (!members.length) return;
  z.queue = z.queue.filter(it => !pulled.has(it));
  if (planned) {
    // what the board will be after each of the plan's pieces that were jumped ahead of; the last
    // of them must leave it as the plan said it would be after the last of the flock
    const after = occ.slice();
    clearFull(after, cols, rows);
    const last = members[members.length - 1].at;
    let ok = true, board = after;
    const skipped = before.slice(0, last).filter(it => !pulled.has(it));
    for (const it of skipped) {
      const m = it.shape.rotations[it.target.rot], y = dropY(board, m, it.target.x, cols, rows);
      if (y == null) { ok = false; break; }
      board = board.slice();
      placeAndClear(board, m, it.target.x, y, cols, rows);
      it.expect = board;
    }
    if (!ok || !sameBoard(board, expects[last])) {
      // (it doesn't come out the same: one at a time after all)
      z.queue = before;
      before.forEach((it, k) => { it.expect = expects[k]; });
      return;
    }
    z.expect = after;
  }
  // they all fall at the same speed as this one, and start as far above where they're going as
  // the one with furthest to go, so they all land at about the same time (give or take: they
  // start a little apart, not in a line); if that's further than this one has to go, this one
  // starts further up too
  const far = Math.max(land - a.y, ...members.map(f => f.land + f.shape.rotations[f.rotIdx].length));
  a.y = Math.min(a.y, land - far);
  for (const f of members) {
    f.dropMs = state.dropMs;
    f.y = f.land - far - Math.floor(z.simRng() * (F.stagger ?? 0));
    f.accum = 0;
    z.blocks = (z.blocks ?? 0) + blocks(f.shape);
  }
  state.flock = members;
}

// Where a flock's piece goes: the best place in the columns still free (`free(x0, x1)`), dropped
// straight down onto `occ`, at least `headroom` rows below the top, and never in the column a
// fill keeps clear: a flock's piece can always stay behind and come on its own.
function flockSpot(occ, shape, weights, free, cols, rows, headroom, rng) {
  let best = null;
  for (let r = 0; r < reachableTurns(shape); r++) {
    const mat = shape.rotations[r], w = mat[0].length;
    for (let x = 0; x + w <= cols; x++) {
      if (!free(x, x + w) || intoWell(mat, x, weights)) continue;
      const y = dropY(occ, mat, x, cols, rows);
      if (y == null || y < headroom) continue;
      const o = occ.slice(), lines = placeAndClear(o, mat, x, y, cols, rows);
      const s = score(o, lines, weights, cols, rows) + rng() * 0.01;
      if (!best || s > best.s) best = { rot: r, x, s };
    }
  }
  return best;
}

// How fast the piece falls: the autopilot's quickly (but each takes a moment at least), the
// player's at the usual pace; in zen, easily either way, unless it's dozing (game.js asks)...
export function zenSpeed(state) {
  const z = state.zen, Z = CONFIG.zen;
  if (isCalm(state)) state.dropMs = !z.userHas && dozing(state) ? Z.calm.idleDropMs : Z.calm.dropMs;
  else state.dropMs = z.userHas ? Z.dropMs : Math.max(8, Z.fallMs * z.pace);
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
  // (nor before the rest of a flock has landed: it clears their rows with its own)
  if ((t?.slide && !t.slid) || (t?.glide && !t.glided) || state.flock.length) return Infinity;
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
  p *= P.low + ((z.movement?.careful ? P.high : P.top ?? P.high) - P.low) * (stackHeight(state) / CONFIG.board.rows) ** 1.5;
  return Math.max(P.fastest, p);
}

// Called every frame (game.js updateGame).
export function zenTick(state, dt) {
  const z = state.zen;
  const a = state.active;
  z.clock += dt;
  // (zen dozes off, or wakes up, there and then: the piece already falling goes at the new pace)
  if (isCalm(state)) {
    const d = dozing(state);
    if (d !== !!z.dozing) { z.dozing = d; zenSpeed(state); }
  }
  // the player pressed something: this piece is theirs (until the next one comes)
  if (state.lastInputAt !== z.inputAt) {
    z.inputAt = state.lastInputAt;
    z.inputClock = z.clock;
    if (a && !z.userHas) {
      z.userHas = true;
      z.userAt = state.drops;
      zenSpeed(state);
      // (one still out of sight, up where it started a short way down or after a big clearance,
      // comes straight to the top of the board: at the player's pace it would take an age)
      const h = a.shape.rotations[a.rotIdx].length;
      if (a.y < -h) a.y = -h;
      if (state.flock.length) settleFlock(state); // (the rest of the flock lands, out of their way)
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
  // down at the right depth: slide in under the overhang (or, if it came to rest anywhere
  // else, never mind the slide)
  const t = z.target;
  if (t?.slide && !t.slid && (a.y >= t.slide.at || state.locking)) {
    t.slid = true;
    if (a.y >= t.slide.at) while (a.x !== t.slide.to && tryMove(state, Math.sign(t.slide.to - a.x), 0)) { /* step by step */ }
  }
}

// The piece the director marked to bring the whole board down has landed (game.js
// stepLockAndSpawn). If most of the board really is going (CONFIG.zen.dramatic: minRows full
// rows), a dramatic pause first: how long (game time), or 0. (A powerup's pause comes before it
// falls instead: zenSpawned.)
export function zenDramatic(state, info) {
  const z = state.zen, D = CONFIG.zen.dramatic;
  if (!D || CONFIG.modes[state.mode]?.dramatic === false || !z?.current?.dramatic || z.userHas || isCalm(state) || info.shape.powerup) return 0;
  const rows = CONFIG.board.rows; // (the numbers are for the usual board: as much of a bigger one)
  return state.board.filter(row => row.every(Boolean)).length >= D.minRows * Math.max(1, rows / 24) ? D.pauseMs * timeScaleOf(state) : 0;
}
// ...and the director's powerup, at (rot, x, y): would it take most of the board (minBlocks)?
function bigMoment(state, shape, rot, x, y) {
  const z = state.zen, D = CONFIG.zen.dramatic, { cols, rows } = CONFIG.board;
  if (!D || CONFIG.modes[state.mode]?.dramatic === false || !z.current?.dramatic || isCalm(state)) return false;
  const before = occupancy(state.board).reduce((a, b) => a + b, 0);
  const after = tryPowerup(state, shape, rot, x, y).occ.reduce((a, b) => a + b, 0);
  return before - after >= D.minBlocks * Math.max(1, cols * rows / 336);
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
// `maxTurns` limits the turns tried. With `next` (an ordinary piece), the best few places
// (LOOK_AHEAD of them) are judged again by the best the next piece could do after each.
const LOOK_AHEAD = 10;
export function bestPlacement(state, shape, weights = WEIGHTS.clear, maxTurns = 4, next = null) {
  const { cols, rows } = CONFIG.board;
  const occ0 = occupancy(state.board);
  const pu = shape.powerup;
  const phantom = pu && isPhantomPowerup(pu);
  const ahead = next && !next.powerup && !pu ? [] : null;
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
    const base = score(occ, lines, weights, cols, rows);
    const extra = bonus - over - inWell + z01(state) * 0.01 - (slide ? 0.05 : 0);
    const c = { rot: r, x: slide ? slide.from : x, y, s: base + extra, slide: slide ? { at: slide.at, to: x } : null };
    if (!best || c.s > best.s) best = c;
    if (ahead && !over) ahead.push({ c, at: x, base, extra });
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
  // (with the next piece in mind: the best few again, after the best it could do)
  if (ahead?.length) {
    ahead.sort((a, b) => b.c.s - a.c.s);
    let top = null;
    for (const a of ahead.slice(0, LOOK_AHEAD)) {
      const occ = occ0.slice(), lines = placeAndClear(occ, shape.rotations[a.c.rot], a.at, a.c.y, cols, rows);
      const s = Math.max(a.base - 50, lookAhead(occ, next, weights, cols, rows, lines)) + a.extra;
      if (!top || s > top.s) top = { ...a.c, s };
    }
    best = top;
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
  const H = Math.min(rows - 2, Math.max(h0 + 6, up(deep ? int(state, 20, 22) : int(state, 12, 19))));
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
// On the way up (a fill), how many beds and patches of tiles, and at what heights: now none
// at all, now one or two, now more (CONFIG.zen.extras).
function extrasFor(state, from, to) {
  const X = CONFIG.zen.extras;
  if (!X || isCalm(state) || CONFIG.board.cols < (X.minCols ?? 0)) return [];
  const out = [];
  const lo = from + 2, hi = to - (X.belowTop ?? 6);
  if (hi <= lo) return out;
  for (const [kind, counts] of [["bed", X.beds], ["patch", X.patches]]) {
    const n = sampleByWeight(counts.map((w, i) => ({ i, w })), c => c.w, state.rng).i;
    for (let k = 0; k < n; k++) out.push({ kind, at: lo + Math.floor(state.rng() * (hi - lo)) });
  }
  return out.sort((a, b) => a.at - b.at);
}

// The big and strange ones a fill can make a bed for: giants, awkward pieces, and now and then a
// level 6 piece on its own, out of its set; each turn it can take, and the row its underside
// reaches in each column (bottom).
function nestCandidates(state, maxW, maxH) {
  const out = [];
  const pool = state.shapes.filter(s => !s.powerup && !s.remix && (s.frequency ?? 1) > 0 && blocks(s) >= (CONFIG.zen.extras?.minBlocks ?? 10));
  for (const s of pool) {
    const lvl = s.difficulty ?? 1, big = lvl >= 4;
    const turns = reachableTurns(s), seen = new Set();
    s.rotations.forEach((mat, rot) => {
      const h = mat.length, w = mat[0].length;
      if (rot >= turns || w > maxW || h > maxH) return;
      const key = mat.map(r => r.map(Number).join("")).join("/");
      if (seen.has(key)) return;
      seen.add(key);
      const bottom = [...Array(w).keys()].map(i => { for (let j = h - 1; j >= 0; j--) if (mat[j][i]) return j; return -1; });
      if (bottom.some(b => b < 0)) return;
      const cells = mat.flat().filter(Boolean).length;
      const odd = new Set(bottom).size; // (the more uneven its underside, the better a bed shows it off)
      const w8 = (lvl === LEVEL6 ? 0.5 : big ? 1.4 : 0.7 + (1 - cells / (w * h))) * (0.6 + 0.2 * odd) * fresh(state, s, 1);
      out.push({ shape: s, rot, mat, w, h, bottom, w8 });
    });
  }
  return out;
}

// A bed for one big or strange piece, partway through a fill (turbo zen): under where it will
// go, the stack is built up to fit its underside exactly, with pieces of its colour where they
// can do it (or else anything small), and then it drops in. Not over the column the fill keeps
// clear. Returns { items, caption } or null.
export function planNest(state, { weights = null } = {}) {
  const { cols, rows } = CONFIG.board, rng = state.rng;
  const occ = occupancy(state.board);
  const well = weights?.well;
  const top = CONFIG.zen.extras?.headroom ?? 4;
  const big = nestCandidates(state, cols - 2, Math.min(10, rows - 8));
  if (!big.length) return null;
  const all = fillerCandidates(state);
  for (let tries = 0; tries < 10; tries++) {
    const g = sampleByWeight(big, c => c.w8, rng);
    const xs = [];
    for (let x = 0; x + g.w <= cols; x++) if (well == null || well < x || well >= x + g.w) xs.push(x);
    if (!xs.length) continue;
    const x = xs[Math.floor(rng() * xs.length)];
    // as low as it can sit, above what's there; and room above it
    let y = Infinity;
    for (let i = 0; i < g.w; i++) y = Math.min(y, colTop(occ, x + i, cols, rows) - 1 - g.bottom[i]);
    if (y < top) continue;
    const need = new Uint8Array(cols * rows);
    let n = 0;
    for (let i = 0; i < g.w; i++) for (let yy = y + g.bottom[i] + 1; yy < colTop(occ, x + i, cols, rows); yy++) { need[yy * cols + x + i] = 1; n++; }
    // (one that would sit on top as it is anyway isn't much of a bed)
    if (n < 3) continue;
    const colour = colourOf(g.shape);
    const suits = colour && colour !== "many" ? all.filter(c => colourOf(c.shape) === colour) : [];
    let bed = null;
    for (const cands of [suits, all]) {
      if (!cands.length) continue;
      const work = occ.slice();
      bed = tile(work, need, cands, rng, cols, rows);
      if (bed) break;
    }
    if (!bed) continue;
    const items = toItems(occ, [...asFillers(bed), { shape: g.shape, rot: g.rot, mat: g.mat, x, y, pace: 1.2 }], cols, rows, { mustClear: false });
    if (items) return { items, caption: `a bed for ${g.shape.name}` };
  }
  return null;
}

// A patch of tiles partway through a fill (turbo zen): over a stretch of columns the dips in the
// top of the stack filled up to a level, so the patch takes whatever shape the pieces around it
// leave: little tiles in a pattern of glazes, or one kind of tile with little ones round it. Not
// over the column the fill keeps clear. Returns { items, caption } or null.
export function planPatch(state, { weights = null } = {}) {
  const { cols, rows } = CONFIG.board, rng = state.rng;
  const occ = occupancy(state.board);
  const well = weights?.well;
  const top = CONFIG.zen.extras?.headroom ?? 4;
  const ones = tileSet(state, ["X"], false).filter(o => !/half|strip/.test(o.shape.id));
  const glazes = shuffle(groupByColour(ones), rng);
  if (glazes.length < 2) return null;
  for (let tries = 0; tries < 6; tries++) {
    const w = int(state, 4, Math.max(5, Math.min(12, Math.floor(cols / 4))));
    const x0 = Math.floor(rng() * (cols - w + 1));
    if (well != null && well >= x0 && well < x0 + w) continue;
    const tops = [...Array(w).keys()].map(i => colTop(occ, x0 + i, cols, rows));
    const level = Math.min(...tops) - int(state, 1, 2); // (the patch's top row: a row or two over the highest piece)
    if (level < top) continue;
    const need = new Uint8Array(cols * rows);
    let n = 0;
    for (let i = 0; i < w; i++) for (let y = level; y < tops[i]; y++) { need[y * cols + x0 + i] = 1; n++; }
    if (n < 8) continue;
    let steps = null, caption = null;
    // now and then Lego, and only Lego, where it'll fit (the pieces tagged "lego_tiles")
    const lego = rng() < 0.25 ? candidates((state.allShapes ?? state.shapes).filter(sh => sh.tags?.includes("lego_tiles")), 4, 4, 16) : [];
    if (lego.length) {
      steps = tile(occ.slice(), need, lego, rng, cols, rows, 99);
      if (steps) caption = "a patch of Lego";
    }
    if (!steps && rng() < 0.5) {
      // one kind of tile, fitted in where it goes, little ones round it
      const kinds = [["XX", "XX"], ["X.", "XX"], ["XXX", ".X."], [".XX", "XX."], [".X..", "XXX.", ".XXX", "..X."]];
      const kind = kinds[Math.floor(rng() * kinds.length)];
      const some = tileSet(state, kind, false);
      if (some.length) {
        const cands = candidates([...new Set([...some, ...ones].map(o => o.shape))], 4, 4, 9);
        const work = occ.slice();
        steps = tile(work, need, cands, rng, cols, rows, 99);
        caption = "a patch of tiles";
      }
    }
    if (!steps) {
      // little tiles in a pattern of glazes
      const pat = [(i, j) => (i + j) % 2, (i, j) => (i + j) % Math.min(3, glazes.length), (i, j) => (i >> 1) % 2, (i, j) => (j % 2)][Math.floor(rng() * 4)];
      const out = [];
      for (let i = 0; i < w; i++) for (let y = tops[i] - 1; y >= level; y--) {
        const g = glazes[pat(x0 + i, y) % glazes.length];
        const o = g[Math.floor(rng() * g.length)];
        out.push({ shape: o.shape, rot: o.rot, mat: o.shape.rotations[o.rot], x: x0 + i, y, pace: 0.6 });
      }
      steps = dropOrder(out, cols);
      caption = "a little tiling";
    }
    if (!steps?.length) continue;
    const items = toItems(occ, steps.map(st => ({ ...st, pace: st.pace ?? 0.6 })), cols, rows, { mustClear: false });
    if (items) return { items, caption };
  }
  return null;
}

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

// The ways a crack can be sealed, and how often:
//   up: phantoms (the friendly ghost), each into the deepest gap in its column, from the bottom up
//   down: from the top down, with whatever single block comes to hand (a pea, a lentil...)
//   shaker: the bottom and the top in turn, phantoms below and blocks above
//   middle: phantoms, from the middle out; random: phantoms, a row at a time in no order
//   (but a phantom can only ever go to the deepest gap in its column, so each column's gaps go
//   from the bottom up whatever the order says, and the order bends round them)
//   powered: pacmen, or leaky taps, or both, taking the rows away a row or two at a time
//   columns: not the rows at all but the columns, eaten away left to right, right to left, from
//   both sides or from the middle out (termite queens, Zeus's lightning, existential horror)
// (the ones with phantoms in, GHOSTLY, only while there are phantoms: CONFIG.assist.powerups)
const CRACK_ENDS = { up: 2, down: 1.4, shaker: 1.2, middle: 1.2, random: 1, powered: 0.4, columns: 1.6 };
const GHOSTLY = new Set(["up", "shaker", "middle", "random"]);

// The friendly ghost, if phantoms are about (one block of phantom, so it just fills a gap), or
// any other phantom of one block, or null.
function ghostOf(state) {
  const ghosts = (state?.powerups ?? []).filter(p => p.powerup.type === "phantom" && blocks(p) === 1);
  return ghosts.find(p => p.id === "friendly_ghost") ?? ghosts[0] ?? null;
}

// A gap in every row (or two), wandering up the board, the board built up around them nearly to
// the top, and then sealed (`end`, one of CRACK_ENDS, or one at random). Returns { items, caption,
// then? } or null.
export function planCrack(state, end = null) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  if (!solid(occ, cols, rows) || heightOf(occ, cols, rows) > 2) return null;
  const ghost = ghostOf(state);
  const singles = regularPool(state).filter(s => blocks(s) === 1 && (s.difficulty ?? 1) <= 1);
  end ??= sampleByWeight(Object.entries(CRACK_ENDS).filter(([k]) => (ghost || !GHOSTLY.has(k)) && (singles.length || (k !== "down" && k !== "shaker"))), ([, w]) => w, rng)[0];
  // (a way with phantoms in it, asked for by name with none about: the nearest without)
  if (!ghost && GHOSTLY.has(end)) end = singles.length ? "down" : "powered";
  const H = int(state, up(18), rows - 1), top = rows - H;
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
    const res = crackEnd(state, end, list, { ghost, singles, top });
    if (res.steps) {
      const items = toItems(occ, [...asFillers(fillers), ...res.steps], cols, rows);
      if (!items || items.cleared < new Set(list.map(g => g.y)).size) continue; // (every row of it goes)
      items[fillers.length].caption = res.caption;
      return { items, caption: kind.caption };
    }
    const items = toItems(occ, asFillers(fillers), cols, rows, { mustClear: false });
    if (!items) continue;
    if (res.extra) { res.extra[0].caption = res.caption; items.push(...res.extra); }
    return { items, caption: kind.caption, then: res.then };
  }
  return null;
}

// How the crack (gaps `list`) is sealed: { steps, caption } (planned pieces), or { extra, caption }
// (powerups, put where they're meant to go), or { then } (the movement that does it).
function crackEnd(state, end, list, { ghost, singles, top }) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng, pace = CONFIG.zen.pace.phantom;
  const ghostAt = (g) => ({ shape: ghost, rot: 0, mat: ghost.rotations[0], x: g.x, phantom: true, pace });
  const blockAt = (g) => { const s = singles[Math.floor(rng() * singles.length)]; return { shape: s, rot: 0, mat: s.rotations[0], x: g.x, pace }; };
  const byRow = [...new Set(list.map(g => g.y))].sort((a, b) => b - a); // (bottom up)
  // (a block dropped in lands in the highest gap of its column: from the top, it's the top row's)
  const down = () => ({ steps: [...list].sort((a, b) => a.y - b.y).map(blockAt), caption: "filled in from the top, with whatever was to hand" });
  if (end === "down") return down();
  if (end === "shaker") {
    // the bottom row, the top row, the next row up, the next row down...
    const steps = [];
    for (let lo = 0, hi = byRow.length - 1, bottom = true; lo <= hi; bottom = !bottom) {
      const y = bottom ? byRow[lo++] : byRow[hi--];
      for (const g of list) if (g.y === y) steps.push(bottom ? ghostAt(g) : blockAt(g));
    }
    return { steps, caption: "from both ends, back and forth" };
  }
  if (end === "middle") { const mid = (top + rows - 1) / 2; return { steps: sealOrder(list, g => Math.abs(g.y - mid)).map(ghostAt), caption: "from the middle out" }; }
  if (end === "random") { const rank = new Map(byRow.map(y => [y, rng()])); return { steps: sealOrder(list, g => rank.get(g.y)).map(ghostAt), caption: "a row at a time, in no particular order" }; }
  if (end === "powered") return { then: ["pacmen", "taps", "pacmenAndTaps"][Math.floor(rng() * 3)] };
  if (end === "columns") {
    const sweep = columnSweep(state);
    if (sweep) return sweep;
  }
  if (!ghost) return singles.length ? down() : { then: "pacmen" };
  return { steps: sealOrder(list, g => -g.y).map(ghostAt), caption: "sealed from the bottom up" };
}

// The order the gaps are filled in: by `rank` (lowest first; the lower gap of two the same), but
// each column's gaps from the bottom up, as a phantom only ever goes to the deepest one.
function sealOrder(gaps, rank) {
  const left = gaps.slice(), out = [];
  while (left.length) {
    let best = -1;
    for (let i = 0; i < left.length; i++) {
      const g = left[i];
      if (left.some(o => o.x === g.x && o.y > g.y)) continue; // (one under it goes first)
      const d = best < 0 ? -1 : rank(g) - rank(left[best]);
      if (d < 0 || (d === 0 && g.y > left[best].y)) best = i;
    }
    out.push(left.splice(best, 1)[0]);
  }
  return out;
}

// The board eaten away column by column, by powerups that destroy whole columns: { extra,
// caption }, or null if there are none.
function columnSweep(state) {
  const { cols } = CONFIG.board;
  const rng = state.rng;
  const kinds = [
    { id: "termite_queen", say: "termite queens", w: 3, reach: 3 },      // (the column it lands on, and one either side)
    { id: "zeus_bolt", say: "lightning from Zeus", w: 2, reach: 2 },     // (its two columns)
    { id: "existential_horror", say: "existential horror", w: 1, reach: 1 },
  ].map(k => ({ ...k, shape: state.powerups.find(p => p.id === k.id) })).filter(k => k.shape);
  if (!kinds.length) return null;
  const k = sampleByWeight(kinds, k => k.w, rng);
  const w = k.shape.rotations[0][0].length;
  // one for each strip of `reach` columns, landing in the middle of it
  const xs = [];
  for (let x = 0; x < cols; x += k.reach) xs.push(Math.min(cols - w, x + (k.reach === 3 ? 1 : 0)));
  const orders = [
    ["left to right", xs],
    ["right to left", [...xs].reverse()],
    ["from both sides", xs.map((_, i) => xs[i % 2 ? xs.length - 1 - (i >> 1) : i >> 1])],
    ["from the middle out", [...xs].sort((a, b) => Math.abs(a - (cols - w) / 2) - Math.abs(b - (cols - w) / 2))],
  ];
  const [how, order] = orders[Math.floor(rng() * orders.length)];
  return { extra: order.map(x => ({ shape: k.shape, target: { rot: 0, x }, weights: WEIGHTS.clear, pace: 0.9 })), caption: `${k.say}, ${how}` };
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
  // (now and then little ones, 1 x 1, on a big board: a mosaic, coming down in showers)
  const sq = cols >= (CONFIG.zen.flock?.minCols ?? 22) && rng() < (CONFIG.zen.mosaicChance ?? 0) ? 1 : 2;
  let pieces = plannable(state, 3).filter(s => { const m = s.rotations[0]; return m.length === sq && m[0].length === sq && m.flat().every(Boolean); });
  // (the big tiles, if there are enough colours of them)
  const glaze = glazeOf;
  const tiles = pieces.filter(s => s.tags?.includes("tiles") && !/half|strip/.test(s.id)); // (not the grout)
  const useTiles = new Set(tiles.map(glaze)).size >= 3;
  if (useTiles) pieces = tiles;
  const byCol = new Map();
  for (const p of pieces) { const c = useTiles ? glaze(p) : colourOf(p); if (c && c !== "black") { if (!byCol.has(c)) byCol.set(c, []); byCol.get(c).push(p); } }
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
  const fine = sq === 1;
  const kinds = [
    { caption: fine ? "a fine checkerboard" : "a checkerboard", colour: (i, j) => palette[(i + j) % 2] },
    { caption: fine ? "fine diagonal stripes" : "diagonal stripes", colour: (i, j) => palette[(i + j) % Math.min(4, palette.length)] },
    { caption: fine ? "the other diagonal, finely" : "the other diagonal", colour: (i, j) => palette[((i - j) % 3 + 3) % 3] },
    { caption: fine ? "fine rings" : "rings", colour: (i, j) => palette[(Math.max(Math.abs(i - (nx - 1) / 2), Math.abs(j - (ny - 1) / 2)) | 0) % palette.length] },
    ...(fine ? [{ caption: "a mosaic of squares", colour: (i, j) => palette[(((i >> 2) + (j >> 2)) % 2) * 2 % palette.length + ((i + j) % 2)] }] : []),
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

// Tiles laid in a pattern across the board, from the bottom up: a tiled floor of little tiles,
// L-shaped tiles in pairs (each pair a 3 x 2 brick), T-shaped tiles in fours (each four a 4 x 4
// pinwheel), wavy tiles in strips. Each in its glazes (the tiles: tagged "tiles", one shape in
// several colours), in a pattern of them, with the odd half tile to finish an edge. One column
// is left empty all the way up so no row completes; then one of the tallest pieces drops into it
// and it all goes at once (or, without one, down it comes). (`any`: any pieces of the right
// shapes will do, for when there are no tiles.) Returns { items, caption } or null.
export function planTiles(state, kind = null, { any = false } = {}) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  const base = heightOf(occ, cols, rows);
  if (!solid(occ, cols, rows) || base > 2 || colTop(occ, cols - 1, cols, rows) < rows) return null;
  // (anything low that's there already is levelled off first, but for the last column, and the
  // pattern goes on top)
  const work = occ.slice();
  let level = [];
  if (base) {
    const need = new Uint8Array(cols * rows);
    for (let y = rows - base; y < rows; y++) for (let x = 0; x < cols - 1; x++) if (!occ[y * cols + x]) need[y * cols + x] = 1;
    level = tile(work, need, fillerCandidates(state), rng, cols, rows);
    if (!level) return null;
  }
  const bottom = rows - 1 - base; // (the pattern's lowest row)
  const glazes = (pattern) => tileSet(state, pattern, any);
  const ones = glazes(["X"]);
  // (the half tiles are for the edges; the little tiles for a floor of them)
  const half = ones.filter(o => /half/.test(o.shape.id)).length ? ones.filter(o => /half/.test(o.shape.id)) : ones;
  const little = ones.filter(o => !/half/.test(o.shape.id));
  const strips = tileSet(state, ["X", "X", "X"], false).filter(o => /strip/.test(o.shape.id));
  if (!half.length) return null;
  const kinds = {
    // little tiles, in a pattern of glazes: a checkerboard, diagonals, a check of checks, rings
    floor: () => {
      const g = shuffle(groupByColour(little), rng);
      if (g.length < 2) return null;
      const pat = [(i, j) => (i + j) % 2, (i, j) => (i + j) % Math.min(4, g.length), (i, j) => ((i >> 1) + (j >> 1)) % 2 * 2 + ((i + j) % 2), (i, j) => Math.max(Math.abs(i - cols / 2), Math.abs(j - rows / 2)) | 0][Math.floor(rng() * 4)];
      const out = [];
      for (let y = bottom; y >= 3; y--) for (let i = 0; i < cols - 1; i++) out.push({ g: g[pat(i, y) % g.length], mat: ["X"], x: i, y });
      return { caption: "a tiled floor", out };
    },
    // L-shaped tiles, two to a panel (2 wide, 3 tall: one turned over the other), the panels in
    // rows, every other row a step along like brickwork; grout at the ends
    bricks: () => {
      const L = shuffle(groupByColour(glazes(["XX", ".X"]), glazes(["X.", "XX"])), rng);
      if (!L.length) return null;
      const out = [];
      for (let j = 0, y = bottom - 2; y >= 3; j++, y -= 3) for (let u = 0, x = j % 2; x + 2 <= cols - 1; u++, x += 2) {
        const c = L[(u + j) % L.length];
        out.push({ g: c, mat: ["XX", ".X"], x, y }, { g: c, mat: ["X.", "XX"], x, y: y + 1 });
      }
      return fillGaps(out, "brickwork", half, bottom, strips);
    },
    // T-shaped tiles, four to a 4 x 4 panel, each turned its own way: pinwheels (the four in their
    // glazes, the same in every panel, or each panel its own)
    pinwheels: () => {
      const glaze = shuffle(groupByColour(glazes(["XXX", ".X."])), rng);
      if (!glaze.length) return null;
      const four = [{ mat: [".X.", "XXX"], dx: 0, dy: 2 }, { mat: [".X", "XX", ".X"], dx: 2, dy: 1 }, { mat: ["X.", "XX", "X."], dx: 0, dy: 0 }, { mat: ["XXX", ".X."], dx: 1, dy: 0 }];
      const each = rng() < 0.5, out = [];
      for (let j = 0, y = bottom - 3; y >= 3; j++, y -= 4) for (let u = 0, x = 0; x + 4 <= cols - 1; u++, x += 4) {
        four.forEach((t, k) => out.push({ g: glaze[(each ? u + j : k) % glaze.length], mat: t.mat, x: x + t.dx, y: y + t.dy }));
      }
      return fillGaps(out, "pinwheels", half, bottom, strips);
    },
    // wavy tiles side by side in strips, a glaze to a strip: waves
    waves: () => {
      const S = shuffle(groupByColour(glazes([".XX", "XX."])), rng);
      if (!S.length) return null;
      const out = [];
      for (let j = 0, y = bottom - 1; y >= 3; j++, y -= 2) for (let x = 0; x + 3 <= cols - 1; x += 2) out.push({ g: S[j % S.length], mat: [".XX", "XX."], x, y });
      return fillGaps(out, "waves", half, bottom, strips);
    },
    // tessellating lizards, never turned, each in the next one's lap (offsets 2 along and 1 up,
    // and 4 up), in glazes so no two side by side are the same; grout round the edges
    lizards: () => {
      const Z = shuffle(groupByColour(glazes([".X..", "XXX.", ".XXX", "..X."])), rng);
      if (!Z.length) return null;
      const out = [];
      // (lizard a along, b up: x = 2a, its top row bottom - 3 - a - 4b; the whole of it on the board)
      for (let a = 0; 2 * a + 4 <= cols - 1; a++) for (let b = -Math.ceil(a / 4); ; b++) {
        const y = bottom - 3 - a - 4 * b;
        if (y < 3) break;
        if (y + 3 > bottom) continue;
        out.push({ g: Z[(((a + 2 * b) % Z.length) + Z.length) % Z.length], mat: [".X..", "XXX.", ".XXX", "..X."], x: 2 * a, y });
      }
      return fillGaps(out, "lizards", half, bottom, strips);
    },
  };
  // a wall of Lego (the pieces tagged "lego_tiles", and never the other Lego or Duplo): courses
  // of bricks two, three or four high, laid like brickwork, each course's joints clear of the
  // ones under it where it can be, all the way up but for a row or so
  kinds.lego = () => {
    const bricks = (pattern) => tileSet(state, pattern, false, "lego_tiles");
    const W = cols - 1;
    // (each course height: the units it's laid in, a unit a brick or two stacked one on another)
    const units = {
      2: [[["XX", "XX"]], [["XXXX", "XXXX"]], [["XXX", "XXX"]]],
      3: [[["XXX", "XXX", "XXX"]], [["XX", "XX", "XX"]]],
      4: [[["XXXX", "XXXX", "XXXX", "XXXX"]], [["XX", "XX", "XX", "XX"]], [["XX", "XX"], ["XX", "XX"]], [["XXX", "XXX"], ["XXX", "XXX"]], [["XXXX", "XXXX"], ["XXXX", "XXXX"]]],
    };
    const have = new Map();
    const opts = (mat) => { const k = mat.join("/"); if (!have.has(k)) have.set(k, bricks(mat)); return have.get(k); };
    for (const h of [2, 3, 4]) units[h] = units[h].filter(u => u.every(m => opts(m).length));
    const out = [];
    let y = bottom, joints = new Set(), courses = 0;
    while (y - 1 >= 3) {
      const room = y - 3 + 1;
      const hs = [2, 3, 4].filter(h => h <= room && units[h].length && (W % 2 === 0 || units[h].some(u => u[0][0].length % 2)));
      const h = hs.length ? sampleByWeight(hs.map(v => ({ v, w: { 2: 3, 3: 4, 4: 2 }[v] })), o => o.w, rng).v : null;
      if (!h) break;
      // (the widths: a few tries, the one whose joints line up least with the course under it)
      let best = null;
      for (let t = 0; t < 24; t++) {
        const row = [];
        let x = 0;
        while (x < W) {
          const fit = units[h].filter(u => { const w = u[0][0].length; return x + w === W || x + w <= W - 2; });
          if (!fit.length) break;
          const u = fit[Math.floor(rng() * fit.length)];
          row.push({ u, x });
          x += u[0][0].length;
        }
        if (x !== W) continue;
        const bad = row.slice(1).filter(r => joints.has(r.x)).length;
        if (!best || bad < best.bad) best = { row, bad };
        if (!bad) break;
      }
      if (!best) break;
      for (const { u, x } of best.row) {
        let top = y - h + 1;
        for (const mat of u) { out.push({ g: opts(mat), mat, x, y: top }); top += mat.length; }
      }
      joints = new Set(best.row.slice(1).map(r => r.x));
      y -= h;
      courses++;
    }
    return courses >= 3 ? { caption: "a wall of Lego", out, lego: true } : null;
  };
  const names = Object.keys(kinds);
  // (the column left empty is the last one; one of the tallest pieces, a column wide, fills it)
  const key = zenKeys(state).find(k => k.rotations[0][0].length === 1);
  for (let tries = 0; tries < 4; tries++) {
    const res = kinds[kind ?? names[Math.floor(rng() * names.length)]]();
    if (!res) continue;
    // each into its piece: the glaze's piece, turned to the shape wanted
    const steps = [];
    for (const p of res.out) {
      const opts = p.g.filter(o => o.key === p.mat.join("/"));
      const o = opts.length ? opts[Math.floor(rng() * opts.length)] : null;
      if (!o) { steps.length = 0; break; }
      steps.push({ shape: o.shape, rot: o.rot, mat: o.shape.rotations[o.rot], x: p.x, y: p.y, pace: 0.6 });
    }
    // (now and then a guest or two built into it; never in the Lego)
    const guests = steps.length && !res.lego ? withGuests(state, steps, half) : null;
    const order = steps.length && dropOrder(guests?.steps ?? steps, cols);
    if (!order) continue;
    if (key) order.push({ shape: key, rot: 0, mat: key.rotations[0], x: cols - 1, key: true });
    const items = toItems(occ, [...asFillers(level), ...order], cols, rows, { mustClear: !!key });
    if (items) return { items, caption: guests ? guestCaption(res.caption, guests.names) : res.caption };
  }
  return null;
}

// Guests in a tiling (turbo zen): now and then one strange piece or two, or now and then a few,
// built into the pattern where they happen to fall (CONFIG.zen.tileGuests: how likely none, one,
// two, or a few, up to `most`). The tiles in a guest's way come out, and the cells they leave
// round it are grouted with little tiles. `steps`: the pattern's pieces; returns { steps, names }
// (the pattern with its guests) or null.
function withGuests(state, steps, half) {
  const G = CONFIG.zen.tileGuests, rng = state.rng, { cols } = CONFIG.board;
  if (!G || isCalm(state) || !half.length) return null;
  const k = sampleByWeight((G.counts ?? [1]).map((w, i) => ({ i, w })), c => c.w, rng).i;
  const want = k < 3 ? k : int(state, 3, G.most ?? 5);
  if (!want) return null;
  // (which of the pattern's pieces covers each cell)
  const cellsOf = (p) => { const out = []; p.mat.forEach((row, j) => row.forEach((c, i) => { if (c) out.push((p.y + j) * cols + p.x + i); })); return out; };
  const at = new Map();
  steps.forEach((p, n) => { for (const c of cellsOf(p)) at.set(c, n); });
  const ys = [...at.keys()].map(c => Math.floor(c / cols));
  const top = Math.min(...ys), bottom = Math.max(...ys);
  const cands = nestCandidates(state, Math.min(G.maxSize ?? 8, cols - 3), Math.min(G.maxSize ?? 8, bottom - top + 1))
    .filter(c => !c.shape.tags?.includes("tiles") && (c.shape.difficulty ?? 1) !== LEVEL6);
  if (!cands.length) return null;
  const grout = groupByColour(half)[0];
  let cur = steps, gone = new Set(), near = new Set();
  const guests = [];
  for (let tries = 0; guests.length < want && tries < want * 15; tries++) {
    const g = sampleByWeight(cands, c => c.w8, rng);
    const x = Math.floor(rng() * (cols - g.w)), y = top + Math.floor(rng() * (bottom - top + 2 - g.h));
    const me = cellsOf({ mat: g.mat, x, y });
    // (all of it inside the pattern, but for the last column, and clear of the other guests)
    if (x + g.w > cols - 1 || y < top || me.some(c => !at.has(c) || near.has(c))) continue;
    const out = new Set(gone);
    for (const c of me) out.add(at.get(c));
    const mine = new Set(me), taken = new Set(guests.flatMap(gg => gg.cells));
    const next = steps.filter((_, n) => !out.has(n));
    for (const gg of guests) next.push(gg.step);
    const step = { shape: g.shape, rot: g.rot, mat: g.mat, x, y, pace: 1.1 };
    next.push(step);
    for (const n of out) for (const c of cellsOf(steps[n])) {
      if (mine.has(c) || taken.has(c)) continue;
      const o = grout[Math.floor(rng() * grout.length)];
      next.push({ shape: o.shape, rot: o.rot, mat: o.shape.rotations[o.rot], x: c % cols, y: Math.floor(c / cols), pace: 0.5 });
    }
    // (only if it can still all be dropped in, each where it goes)
    if (!dropOrder(next, cols)) continue;
    guests.push({ step, cells: me, name: g.shape.name });
    gone = out;
    cur = next;
    for (const c of me) for (const d of [0, 1, -1, cols, -cols]) near.add(c + d);
  }
  return guests.length ? { steps: cur, names: guests.map(gg => gg.name) } : null;
}
// "brickwork, and a bull" (and the rest)
function guestCaption(caption, names) {
  if (names.length === 1) return `${caption}, and ${names[0]}`;
  if (names.length === 2) return `${caption}, ${names[0]} and ${names[1]}`;
  return `${caption}, and some other things`;
}

// The order to drop pieces in so each lands where it's meant to: in every column, the lower
// piece first (one above would be in its way, or it holds that one up); otherwise the lowest
// first, then from the left. Null if there's no such order (pieces that hook under each other).
function dropOrder(ps, cols) {
  const at = new Map();
  ps.forEach((p, k) => p.mat.forEach((row, j) => row.forEach((c, i) => { if (c) at.set((p.y + j) * cols + p.x + i, k); })));
  const ups = ps.map(() => new Set()), downs = ps.map(() => 0);
  const xs = new Set([...at.keys()].map(c => c % cols));
  for (const x of xs) {
    const cells = [...at.entries()].filter(([c]) => c % cols === x).sort((a, b) => b[0] - a[0]);
    for (let n = 1; n < cells.length; n++) {
      const lo = cells[n - 1][1], hi = cells[n][1];
      if (lo !== hi && !ups[lo].has(hi)) { ups[lo].add(hi); downs[hi]++; }
    }
  }
  const bottom = (p) => p.y + p.mat.length;
  const ready = ps.map((_, k) => k).filter(k => !downs[k]), out = [];
  while (ready.length) {
    ready.sort((a, b) => bottom(ps[b]) - bottom(ps[a]) || ps[a].x - ps[b].x);
    const k = ready.shift();
    out.push(ps[k]);
    for (const u of ups[k]) if (!--downs[u]) ready.push(u);
  }
  return out.length === ps.length ? out : null;
}

// A pattern's left-over cells (anything in its rows, from `bottom` up, not covered) in grout:
// strips of it (`strips`, 1 x 3, standing up) where three free cells are one over another, and
// half tiles for the rest; but for the last column (so nothing clears on the way up). Returns
// { caption, out }, or null if the pattern fills a row.
function fillGaps(out, caption, half, bottom, strips = []) {
  const { cols, rows } = CONFIG.board;
  const have = new Set();
  let top = rows;
  for (const p of out) p.mat.forEach((r, j) => [...r].forEach((c, i) => { if (c === "X") { have.add((p.y + j) * cols + p.x + i); top = Math.min(top, p.y + j); } }));
  const grout = groupByColour(half)[0], strip = strips.length ? groupByColour(strips)[0] : null;
  const extra = [];
  for (let y = bottom; y >= top; y--) if (![...Array(cols - 1).keys()].some(x => !have.has(y * cols + x)) && have.has(y * cols + cols - 1)) return null; // (a full row)
  for (let x = 0; x < cols - 1; x++) {
    for (let y = bottom; y >= top; y--) {
      if (have.has(y * cols + x)) continue;
      // (three free one over another: a strip, from its top cell)
      if (strip && y - 2 >= top && !have.has((y - 1) * cols + x) && !have.has((y - 2) * cols + x)) {
        extra.push({ g: strip, mat: ["X", "X", "X"], x, y: y - 2 });
        have.add(y * cols + x); have.add((y - 1) * cols + x); have.add((y - 2) * cols + x);
        y -= 2;
        continue;
      }
      extra.push({ g: grout, mat: ["X"], x, y });
      have.add(y * cols + x);
    }
  }
  return { caption, out: [...out, ...extra] };
}

// The pieces in the shape `pattern` (a matrix as strings, in any turn they can reach): tagged
// "tiles" (or, with `any`, any regular piece of that shape), each { shape, rot, key, colour }.
// A tile's colour is its glaze (most of them are white tiles with colour on: the blue one is blue).
function glazeOf(s) {
  return s.id.match(/^tile_.*_(blue|green|terracotta|gold)$/)?.[1] ?? colourOf(s);
}

function tileSet(state, pattern, any, tag = "tiles") {
  const want = new Set();
  // (the pattern turned every way, as the keys to look for)
  let m = pattern.map(r => [...r].map(c => c === "X"));
  for (let k = 0; k < 4; k++) { want.add(m.map(r => r.map(c => (c ? "X" : ".")).join("")).join("/")); m = m[0].map((_, i) => m.map(r => r[i]).reverse()); }
  const out = [];
  for (const s of (state.allShapes ?? state.shapes)) {
    if (s.powerup || s.remix || (s.difficulty ?? 1) === LEVEL6) continue;
    if (!(s.tags?.includes(tag) || (any && (s.frequency ?? 1) > 0))) continue;
    const turns = reachableTurns(s), seen = new Set();
    for (let r = 0; r < turns; r++) {
      const key = s.rotations[r].map(row => row.map(c => (c ? "X" : ".")).join("")).join("/");
      // (the first turn of each outline: one turned all the way round looks the same in outline,
      // but its picture is upside down)
      if (want.has(key) && !seen.has(key)) out.push({ shape: s, rot: r, key, colour: glazeOf(s) });
      seen.add(key);
    }
  }
  return out;
}
// ...grouped by glaze (and by piece, when they're all the same colour): [[{...}, ...], ...]
function groupByColour(...lists) {
  const by = new Map();
  for (const o of lists.flat()) {
    const k = o.shape.tags?.includes("tiles") ? (o.colour ?? o.shape.id) : o.shape.id;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(o);
  }
  return [...by.values()];
}
function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

// The board built up nearly to the top, full of awkward gaps (little clusters of cells nothing
// fills, at least one in every row so nothing clears), for the demolition to follow.
export function planMess(state) {
  const { cols, rows } = CONFIG.board;
  const rng = state.rng;
  const occ = occupancy(state.board);
  if (!solid(occ, cols, rows) || heightOf(occ, cols, rows) > 3) return null;
  const H = up(int(state, 19, 22)), top = rows - H;
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

// The tallest pieces: the whole height of the board, only for zen (tagged "zen"). On a board of
// another height (turbo zen filling the window), the same ones as tall as it is (stretchKey).
export function zenKeys(state) {
  const rows = CONFIG.board.rows;
  const all = (state.allShapes ?? state.shapes).filter(s => !s.powerup && s.tags?.includes("zen"));
  const keys = all.filter(s => s.rotations[0].length === rows);
  if (keys.length) return keys;
  const made = (state.stretchedKeys ??= new Map());
  if (!made.has(rows)) made.set(rows, all.map(s => stretchKey(s, rows)).filter(Boolean));
  return made.get(rows);
}
// One of the tallest pieces, `rows` tall: the top and bottom quarter of it as they are, and the
// middle of it repeated (or cut short) in between, a cell at a time: a piece of string exactly
// as long as it needs to be.
function stretchKey(s, rows) {
  const mat = s.rotations[0], H = mat.length, k = s.pixelK ?? 1;
  if (!Array.isArray(s.color) || s.color.length !== H * k || rows < 4) return null;
  const cap = Math.min(Math.floor(H / 4), Math.floor((rows - 1) / 2)), mid = H - 2 * cap;
  const cells = (from, n) => s.color.slice(from * k, (from + n) * k);
  const color = [...cells(0, cap)], grid = mat.slice(0, cap);
  for (let c = 0; c < rows - 2 * cap; c++) { color.push(...cells(cap + (c % mid), 1)); grid.push(mat[cap + (c % mid)]); }
  color.push(...cells(H - cap, cap));
  grid.push(...mat.slice(H - cap));
  const raw = { id: `${s.id}_${rows}`, name: s.name, grid: grid.map(r => r.map(c => (c ? "X" : ".")).join("")), color, tags: s.tags, difficulty: s.difficulty, frequency: 0, rotation: s.rotationSpec ?? { mode: "any" } };
  return loadShapes([raw]).shapes[0] ?? null;
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
  const all = candidates(plannable(state, 3), 5, 5, 9);
  for (const c of all) c.fresh = fresh(state, c.shape);
  return [...strayCandidates(state), ...all];
}
// ...and now and then (turbo zen: CONFIG.zen.strays.planChance), a few of the pieces it hardly
// uses (the least used the likeliest), any shape, each to go in once wherever it happens to fit,
// for the rest to fill in round.
function strayCandidates(state) {
  const S = CONFIG.zen.strays;
  if (!S || isCalm(state) || state.rng() >= (S.planChance ?? 0)) return [];
  const uses = state.zenUses ?? new Map(), out = [];
  const pool = regularPool(state).filter(s => (s.difficulty ?? 1) <= (S.maxDifficulty ?? 5) && !s.tags?.includes("tiles"));
  for (let i = 0; i < (S.perPlan ?? 3) && pool.length; i++) {
    const one = sampleByWeight(pool, s => 1 / (1 + (uses.get(s.id) ?? 0)) ** (S.power ?? 1.5), state.rng);
    pool.splice(pool.indexOf(one), 1);
    out.push(...candidates([one], 8, 8, 30).map(c => ({ ...c, stray: true })));
  }
  return out;
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
function tile(occ, need, cands, rng, cols, rows, maxUses = 3, holes = null, budget = 1200 * Math.max(1, cols * rows / 336)) {
  // (any strays first, each once, now and then where they fit: strayCandidates)
  const order = [...cands.filter(c => c.stray), ...cands.filter(c => !c.stray).map(c => ({ c, k: c.cells.length + rng() * 4 + (c.fresh ?? 0) * 3 })).sort((a, b) => b.k - a.k).map(o => o.c)];
  const strayHere = CONFIG.zen.strays?.perAnchor ?? 0;
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
        if (c.stray && (top.pass === 1 || uses[sid[top.ci]] >= 1 || !(top.strayOk ??= rng() < strayHere))) continue;
        if (used !== (top.pass === 1)) continue;
        const x0 = ax - c.ax, y0 = ay - c.ay;
        if (fits(c, x0, y0)) found = { c, x0, y0, s: sid[top.ci] };
      }
      if (!found) { top.pass++; top.ci = 0; }
    }
    if (!found) { stack.pop(); continue; } // stuck: back up
    put(found, 1);
    top.placed = found;
    plan.push({ shape: found.c.shape, rot: found.c.rot, mat: found.c.mat, x: found.x0, y: found.y0, ...(found.c.stray ? { stray: true } : {}) });
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
    const dramatic = n >= (CONFIG.zen.dramatic?.minRows ?? 12) * Math.max(1, rows / 24);
    items.push({ shape: st.shape, target: { rot: st.rot, x: st.x }, expect: occ.slice(), weights: WEIGHTS.clear, pace: st.pace, key: st.key, dramatic, ...(st.stray ? { stray: true } : {}) });
  }
  items.cleared = cleared;
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

// (placed, nothing cleared)
function lay(occ, mat, x, y, cols) {
  for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
    if (mat[j][i] && y + j >= 0) occ[(y + j) * cols + x + i] = 1;
  }
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
