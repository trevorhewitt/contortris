// ============================================================
// PIECE PICKER (no DOM)
// ============================================================
// Order of precedence for each drop:
//   0. a level 6 group that is under way carries on (src/level6.js)
//   1. linked shapes (prev.nextShapes / nextShapeProbs) — "back to back" pieces
//   2. a level 6 group may start (once unlocked)
//   3. powerup scheduler (Normal mode only)
//   4. regular level mix: (a) choose a difficulty level, (b) choose a shape in that
//      level by frequency × variety (recently served / already on the board)
// Level 6 pieces (difficulty 6) only ever come in their groups.

import { CONFIG } from "../config.js";
import { clamp01, lerp, sampleByWeight } from "./util.js";
import { analyseBoard, resolvePowerupArea, computeEffect, phantomLandingY, isPhantomPowerup } from "./powerups.js";
import { LEVEL6, initLevel6, nextGroupPiece, maybeStartGroup, groupUnderWay } from "./level6.js";
import { initEndGame, endGameOn, endGameLevelWeights } from "./endgame.js";
import { isGodMode, godConfig, gravityColumns } from "./godmode.js";
import { pickThread, threadWeight } from "./threads.js";
import { warmth, lateness, alwaysWarm } from "./pacing.js";

const DEBUG_LINK = false; // verbose console logging for linked shapes

export function initPieceSelectionState(state) {
  state.pieceSel = {
    mode: state.mode,
    dropIndex: 0,
    lastLevel: null,
    lastWasHard: false,
    lastShapeId: null,

    // last few selected shape IDs (for the soft non-repetition bias)
    recentShapeIds: [],
    // how many times each shape has been served this game
    servedCounts: new Map(),
    // ids that opened the last few games (set by the UI from browser storage)
    openingMemory: state.openingMemory ?? null,
    // how many times each piece had been seen in this browser before this game, and since the
    // page was loaded (the UI keeps them)
    seenEver: state.seenEver ? new Map(state.seenEver) : null,
    shownThisLoad: state.shownThisLoad ? new Map(state.shownThisLoad) : null,

    // counts by level (0–5, and 6 for the group pieces)
    levelCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },

    // shared urge/cooldown for hard (4/5)
    urge: { hard: 0.0 },
    cooldown: { hard: 0 },

    // whether we already produced the first hard drop in this run
    hasDroppedFirstHard: false,

    // powerup scheduler (Normal mode)
    powerup: {
      chance: powerupCfg(state.mode).baseChance,
      cooldown: 0,
      count: 0,
      lastChance: 0, // for the debug panel
      // progression (introduce powerups class by class)
      classes: [],             // powerup classes unlocked so far, in order
      shown: new Set(),        // ids that have turned up this game
      shownClasses: new Set(), // classes whose intro has been shown
      // "learning" classes: until a powerup of the class has been used successfully, and
      // again after one is wasted (did nothing), only usable ones of that class are served
      usedOk: new Set(),       // classes used successfully at least once
      relearn: new Set(),      // classes whose last powerup did nothing
      lastIntroDrop: null,     // dropIndex of the last powerup that brought up an intro
      pendingIntro: new Set(), // classes picked for their intro, not spawned yet
      sinceClass: 0,           // powerups served since the last new class
      classAtDrop: 0,          // dropIndex when the last class came in
    },

    // how much the player is struggling, 0..1 (see CONFIG.assist.powerups.struggle)
    struggle: 0,
    lastRows: 0,
    dropsSinceRow: 0,

    // the first giant (level 5) arrives at this piece number (null = no forced giant)
    giantDueAt: pickGiantDue(state),
    hadGiant: false,

    // board presence, recomputed once per selection: shapeId -> copies on the board
    presence: new Map(),
  };
  // level 6 groups: unlock tracking and the group being served (src/level6.js)
  state.pieceSel.level6 = initLevel6(state);
  // the end game (src/endgame.js)
  state.pieceSel.endGame = initEndGame();
  // God mode: every powerup class and the combos are in from the first piece (counted as met,
  // so there are no intro screens)
  if (isGodMode(state.mode)) {
    const ps = state.pieceSel.powerup;
    ps.classes = [...new Set((state.powerups ?? []).map(p => p.powerup.cls))];
    for (const c of ps.classes) ps.shownClasses.add(c);
    if (ps.classes.includes("combo")) ps.comboOpenedAt = 0;
  }
}

// The settings for the giants and the powerups in this mode (God mode changes a few).
const hardCfg = (mode) => godConfig(mode, "hard", CONFIG.assist.pieceMix.hard);
const powerupCfg = (mode) => godConfig(mode, "powerups", CONFIG.assist.powerups);

function pickGiantDue(state) {
  const range = hardCfg(state.mode).firstGiantBetween;
  const mode = CONFIG.modes[state.mode];
  if (!range || mode?.giants === false) return null;
  const [a, b] = range;
  return a + Math.floor((state.rng ?? Math.random)() * (b - a + 1));
}

/* =========================
   Struggle tally
   =========================
   Blends stack danger, air pockets and how long it's been since a row was destroyed,
   smoothed over a few drops. 0 = cruising, 1 = in real trouble.
*/
export function updateStruggle(state, danger01) {
  const sel = state.pieceSel;
  const cfg = CONFIG.assist.powerups.struggle ?? {};
  if (state.rowsDestroyed > sel.lastRows) { sel.lastRows = state.rowsDestroyed; sel.dropsSinceRow = 0; }
  else sel.dropsSinceRow++;
  const holes01 = clamp01(analyseBoard(state.board).holes / Math.max(1, CONFIG.assist.powerups.holesForMax ?? 18));
  const drought01 = clamp01(sel.dropsSinceRow / Math.max(1, cfg.rowDroughtDrops ?? 18));
  const target = clamp01(0.5 * danger01 + 0.3 * holes01 + 0.2 * drought01 + 0.4 * danger01 * holes01);
  sel.struggle = lerp(sel.struggle, target, cfg.smoothing ?? 0.3);
  return sel.struggle;
}

/* =========================
   Danger estimation
   =========================
   Returns a value in [0, 1]:
   - 0 means the highest locked block is well below the “diff2” band
   - 1 means the highest locked block is at/above the very top row (i.e., game-over territory)
*/
export function computeStackDanger01(state) {
  const rows = CONFIG.board.rows;

  const highest = highestLockedRowIndex(state);
  if (highest === null) return 0; // empty board

  // Convert “highest occupied row” into “rows from top that are currently penetrated”.
  const topPenetration = (rows - highest); // bigger = closer to top / worse

  const diff2Band = CONFIG.assist.topRowsForDiff2Only;
  const diff1Band = CONFIG.assist.topRowsForDiff1Only;

  // Soft ramp: map penetration within [rows - diff2Band, rows] -> [0, 1].
  const startPenetration = rows - diff2Band;
  const endPenetration = rows; // top

  const t = (topPenetration - startPenetration) / (endPenetration - startPenetration);
  const dangerRaw = clamp01(t);

  // Extra curvature so the “diff1” band feels meaningfully more urgent.
  const diff1StartPenetration = rows - diff1Band;
  const diff1T = clamp01((topPenetration - diff1StartPenetration) / (endPenetration - diff1StartPenetration));

  return clamp01(0.65 * dangerRaw + 0.35 * diff1T);
}

export function highestLockedRowIndex(state) {
  // Returns smallest y (closest to top) that contains ANY locked block, or null.
  for (let y = 0; y < CONFIG.board.rows; y++) {
    const row = state.board[y];
    for (let x = 0; x < CONFIG.board.cols; x++) {
      if (row[x]) return y;
    }
  }
  return null;
}

function isStackInTopRows(state, topRows) {
  const y = highestLockedRowIndex(state);
  if (y === null) return false;
  return y < topRows;
}

export function getDifficultyZone(state) {
  const inDiff1Zone = isStackInTopRows(state, CONFIG.assist.topRowsForDiff1Only);
  const inDiff2Zone = !inDiff1Zone && isStackInTopRows(state, CONFIG.assist.topRowsForDiff2Only);

  if (inDiff1Zone) return { zone: "assist: difficulty ≤ 1 (strict)", cap: 1 };
  if (inDiff2Zone) return { zone: "assist: difficulty ≤ 2 (sometimes >2)", cap: 2 };
  return { zone: "normal", cap: Infinity };
}

/* =========================
   Variety
   ========================= */

function getRecencyMultiplier(shapeId, recentIds, lastK, penaltyStrength, minMultiplier) {
  // If the same ID occurred d drops ago (1..K), apply a multiplier that increases with distance.
  // d=1 => strongest penalty; d=K => light penalty; not in window => 1.
  for (let i = recentIds.length - 1, d = 1; i >= 0 && d <= lastK; i--, d++) {
    if (recentIds[i] === shapeId) {
      const t = (lastK - d + 1) / lastK; // closer => larger t
      const mult = 1 - penaltyStrength * t;
      return Math.max(minMultiplier, mult);
    }
  }
  return 1.0;
}

// How many copies of each shape are on the board: shapeId -> sum over its pieces of
// (blocks left / blocks it had). Needs state.instances (pid -> {shape, total}).
export function computeBoardPresence(state) {
  const counts = new Map(); // pid -> blocks on board
  for (const row of state.board) {
    for (const c of row) {
      if (c && c.pid) counts.set(c.pid, (counts.get(c.pid) ?? 0) + 1);
    }
  }
  const presence = new Map();
  for (const [pid, n] of counts) {
    const inst = state.instances?.get(pid);
    if (!inst?.shape) continue; // e.g. cells filled by an expander
    const id = inst.shape.id;
    presence.set(id, (presence.get(id) ?? 0) + n / Math.max(1, inst.total));
  }
  return presence;
}

// God mode: a piece in CONFIG.godMode.newest is newBoost times likelier until it has turned up
// newUntilShown times since the page was loaded (counting this game), one of firstPieces
// firstBoost times until it has turned up once; anything never seen in this browser,
// unseenBoost times. (state.seenEver and state.shownThisLoad are kept by the UI.)
function noveltyMultiplier(sel, shape) {
  if (!isGodMode(sel.mode) || CONFIG.modes[sel.mode]?.calm || !sel.seenEver) return 1; // (zen is as it comes)
  const n = CONFIG.godMode.novelty ?? {};
  const served = sel.servedCounts.get(shape.id) ?? 0;
  const shown = (sel.shownThisLoad?.get(shape.id) ?? 0) + served;
  // (once the opening set has come; turbo zen has its own opening)
  if (!CONFIG.modes[sel.mode]?.zen && (CONFIG.godMode.firstPieces ?? []).includes(shape.id) && !shown && sel.level6?.seen?.size) return n.firstBoost ?? 1000;
  if ((CONFIG.godMode.newest?.pieces ?? []).includes(shape.id) && shown < (n.newUntilShown ?? 1)) return n.newBoost ?? 6;
  return (sel.seenEver.get(shape.id) ?? 0) + served ? 1 : (n.unseenBoost ?? 2.5);
}

export function varietyMultiplier(sel, shape) {
  const v = CONFIG.assist.variety ?? {};
  if (typeof shape.id !== "string") return 1.0;

  const r = v.recent ?? {};
  let mult = getRecencyMultiplier(
    shape.id,
    sel.recentShapeIds,
    r.lastK ?? 5,
    r.penaltyStrength ?? 0.75,
    r.minMultiplier ?? 0.15
  );

  // hard rule: never the same piece twice within `noRepeatWithin` pieces (only a linked
  // "back to back" piece, like the fish, can break it). Near-zero rather than zero, so a
  // pool with nothing else left still picks something.
  const within = v.noRepeatWithin ?? 0;
  if (within > 0 && sel.recentShapeIds.slice(-within).includes(shape.id)) mult *= 1e-9;
  // ...and never straight after one it mustn't follow (shape.notAfter)
  if (shape.notAfter?.includes(sel.lastShapeId)) mult *= 1e-9;

  // God mode: the newest things first, and anything never seen in this browser more often
  mult *= noveltyMultiplier(sel, shape);

  // pieces that opened recent games (state.openingMemory, filled in by the UI)
  const ag = v.acrossGames;
  if (ag && sel.openingMemory?.has(shape.id) && sel.dropIndex <= (ag.drops ?? 20)) mult *= ag.penalty ?? 1;

  const lvl = shape.powerup ? 0 : (shape.difficulty ?? 1);
  const served = sel.servedCounts?.get(shape.id) ?? 0;
  if (lvl >= 4 && served > 0) mult *= Math.pow(v.giants?.repeatPenalty ?? 1, served);

  const b = v.onBoard ?? {};
  const copies = sel.presence?.get(shape.id) ?? 0;
  if (copies > 0 && (b.penaltyPerCopy ?? 0) > 0) {
    const onBoard = Math.pow(1 - clamp01(b.penaltyPerCopy), copies);
    mult *= Math.max(b.minMultiplier ?? 0.1, onBoard);
  }
  return mult;
}

/* =========================
   Linked ("back to back") shapes
   ========================= */

function tryLinkedNextShape(state, prevShape, idToShape, debug = false) {
  if (!prevShape) return null;

  const ids = prevShape.nextShapes;
  const ps = prevShape.nextShapeProbs;

  if (!Array.isArray(ids) || !Array.isArray(ps)) return null;

  if (ids.length === 0 || ids.length !== ps.length) {
    if (debug) console.log("[LINK] invalid arrays", { id: prevShape.id, ids, ps });
    return null;
  }

  // Only consider targets that exist in this mode's pool (e.g. powerup links
  // are ignored in Extreme mode), so a missing target never "uses up" the roll.
  // A linked giant (4/5) follows the same safety rules as any giant: not straight after
  // another one, and not on a dangerous stack. Level 6 pieces only come in their groups.
  // (in the end game, anything goes)
  // A linked giant also never comes back while it's still fresh (the pound of feathers and
  // the pound of steel follow each other, but not round and round). A sure link (probability
  // 1) is a chain: its giant may come straight after another giant (nothing, then everything).
  const dangerOk = computeStackDanger01(state) <= (hardCfg(state.mode).hardMaxDanger ?? 0.32);
  const hardOk = endGameOn(state) || (!state.pieceSel?.lastWasHard && dangerOk);
  const chainOk = endGameOn(state) || dangerOk;
  const fresh = (state.pieceSel?.recentShapeIds ?? []).slice(-(CONFIG.assist.variety?.noRepeatWithin ?? 5));
  const cand = [];
  for (let i = 0; i < ids.length; i++) {
    const shape = idToShape.get(ids[i]);
    const x = Number(ps[i]);
    const p = Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
    const lvl = shape?.powerup ? 0 : (shape?.difficulty ?? 1);
    if (shape && p > 0 && lvl !== LEVEL6 && (lvl < 4 || ((p >= 1 ? chainOk : hardOk) && !fresh.includes(shape.id)))) cand.push({ shape, p });
    else if (!shape && debug) console.log("[LINK] id not in this mode's pool", ids[i]);
  }
  if (!cand.length) return null;

  let sumP = 0;
  for (const c of cand) sumP += c.p;
  sumP = Math.min(1, sumP);

  const gate = state.rng();
  if (debug) console.log("[LINK] gate roll", { from: prevShape.id, gate, sumP, triggered: gate < sumP });
  if (gate >= sumP) return null;

  // Sample among linked targets using their probs (normalised within sumP mass).
  return sampleByWeight(cand, c => c.p, state.rng).shape;
}

/* =========================
   Main entry point
   ========================= */

export function selectPiece(state) {
  if (!state.pieceSel) initPieceSelectionState(state);

  const sel = state.pieceSel;
  sel.dropIndex += 1;
  sel.presence = computeBoardPresence(state);

  const mixCfg = godConfig(state.mode, "pieceMix", CONFIG.assist.pieceMix); // (zen leans to the easy ones)
  const danger01 = computeStackDanger01(state);
  const danger = clamp01(danger01 * (mixCfg.dangerBiasStrength ?? 1.0));

  // Cooldowns tick down.
  if (sel.cooldown.hard > 0) sel.cooldown.hard -= 1;
  if (sel.powerup.cooldown > 0) sel.powerup.cooldown -= 1;

  const idToShape = state.idToShape;
  const prevShape = sel.lastShapeId ? idToShape.get(sel.lastShapeId) : null;
  updateStruggle(state, danger01);

  const endGame = endGameOn(state);
  if (endGame) sel.endGame.pieces++;

  // Threads (src/threads.js): this piece may follow a loose theme from the last one or two
  // (and so may a powerup, or a level 6 set starting now)
  const thread = pickThread(state);
  sel.currentThread = thread;

  // A level 6 group that has started carries on, piece after piece, whatever else is going on.
  const grouped = nextGroupPiece(state);
  if (grouped) {
    commitSelectedShape(sel, grouped);
    if (!groupUnderWay(state)) { noteHardDropped(sel, LEVEL6); beginCalm(state, "afterSet"); } // the group is over: rest a while
    return grouped;
  }
  const calm = inCalm(state);

  // The first giant: always somewhere in CONFIG...hard.firstGiantBetween (unless it would
  // land on an already dangerous stack, then as soon as things calm down a bit).
  if (sel.giantDueAt != null && !sel.hadGiant && sel.dropIndex >= sel.giantDueAt && !sel.lastWasHard && danger01 < 0.55) {
    const giants = state.shapes.filter(s => (s.difficulty ?? 1) === 5 && (s.frequency ?? 1) > 0);
    if (giants.length) {
      // (one that sits well on the board as it is: the first one's a laugh, not a disaster)
      const g = pickFitting(state, giants, s => (s.frequency ?? 1) * varietyMultiplier(sel, s));
      commitSelectedShape(sel, g);
      noteHardDropped(sel);
      return g;
    }
  }

  let linked = tryLinkedNextShape(state, prevShape, idToShape, DEBUG_LINK);
  if (calm && linked && !linked.powerup && (linked.difficulty ?? 1) >= 4) linked = null; // (not in a calm spell)

  if (linked) {
    commitSelectedShape(sel, linked);

    if (linked.powerup) {
      notePowerupDropped(sel);
    } else {
      const lvl = (linked.difficulty ?? 1);
      if (lvl === 4 || lvl === 5) noteHardDropped(sel, lvl);
    }
    return linked;
  }

  // Level 6: maybe a group starts here.
  const groupStart = maybeStartGroup(state);
  if (groupStart) {
    commitSelectedShape(sel, groupStart);
    if (!groupUnderWay(state)) noteHardDropped(sel, LEVEL6);
    return groupStart;
  }

  // Powerups (Normal mode).
  if (state.powerups.length) {
    const pu = maybeSelectPowerup(state, danger01);
    if (pu) {
      commitSelectedShape(sel, pu);
      notePowerupDropped(sel);
      return pu;
    }
  }

  // Keys for level weights (0–5).
  const LEVELS = [0, 1, 2, 3, 4, 5];

  // End game: no more help. Big, worse pieces (more giants the longer it lasts), back to back.
  if (endGame) {
    const w = normaliseWeights(endGameLevelWeights(state, CONFIG.modes[state.mode]?.giants !== false));
    const lvl = sampleDiscrete(w, state.rng);
    let pool = state.shapes.filter(s => (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) === lvl);
    if (!pool.length) pool = state.shapes.filter(s => (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) !== LEVEL6);
    const shape = sampleByWeight(pool, s => (s.frequency ?? 1) * varietyMultiplier(sel, s), state.rng);
    commitSelectedShape(sel, shape);
    if ((shape.difficulty ?? 1) >= 4) noteHardDropped(sel, shape.difficulty);
    return shape;
  }

  // 1) Opening blend -> base.
  const baseW = normaliseWeights({ ...mixCfg.baseLevelWeight });
  const openingW = normaliseWeights({ ...mixCfg.openingLevelWeight });

  const openingDrops = Math.max(0, mixCfg.openingDrops | 0);
  const openingT = openingDrops > 0 ? clamp01(1 - (sel.dropIndex - 1) / openingDrops) : 0;

  let levelW = {};
  for (const k of LEVELS) levelW[k] = lerp(baseW[k] ?? 0, openingW[k] ?? 0, openingT);
  // (the start of a game leans to the easy levels, fading; later the mix opens up: src/pacing.js)
  const warm = warmth(state), late = lateness(state);
  if (late > 0) {
    const lateW = normaliseWeights({ ...CONFIG.assist.later.levelWeight });
    for (const k of LEVELS) levelW[k] = lerp(levelW[k] ?? 0, lateW[k] ?? 0, late);
  }
  if (warm > 0 && !alwaysWarm(state)) { // (Zen keeps its own easy mix: CONFIG.zen.calm.pieceMix)
    const warmW = normaliseWeights({ ...CONFIG.assist.warmup.levelWeight });
    for (const k of LEVELS) levelW[k] = lerp(levelW[k] ?? 0, warmW[k] ?? 0, warm);
  }

  // 2) Danger blend towards assistance mix (never allocates to 4/5 directly).
  const dangerTarget = normaliseWeights({ ...mixCfg.dangerTargetMix });
  for (const k of LEVELS) levelW[k] = lerp(levelW[k] ?? 0, dangerTarget[k] ?? 0, danger);

  // 3) Hard scheduler (4/5 share the same urge/cooldown).
  const hard = hardCfg(state.mode);

  const pastMinHard = sel.dropIndex > (hard.minDropIndex ?? 5);
  const dangerAllowsHard = danger01 <= (hard.hardMaxDanger ?? 0.32);
  const cooldownAllowsHard = (sel.cooldown.hard ?? 0) <= 0 && !sel.lastWasHard;

  const modeHasGiants = CONFIG.modes[state.mode]?.giants !== false;
  const allowHard = modeHasGiants && pastMinHard && dangerAllowsHard && cooldownAllowsHard && !calm;

  // Update shared hard urge every call.
  const inWindow =
    sel.dropIndex >= (hard.softWindowStart ?? 6) &&
    sel.dropIndex <= (hard.softWindowEnd ?? 25);

  const recharge = (hard.rechargePerDrop ?? 0.005) * (inWindow ? 1.4 : 0.8) * lerp(1, CONFIG.assist.later?.hardRate ?? 1, late);
  sel.urge.hard = clamp01(Math.min(hard.maxUrge ?? 0.95, (sel.urge.hard ?? 0) + recharge));

  const addHardWeight = allowHard ? (sel.urge.hard ?? 0) : 0;

  // Inject hard weight by allocating it to 4/5 (not to the whole distribution).
  // This keeps baseline/danger behaviour intact while allowing periodic “hard surprises”.
  if (addHardWeight > 0) {
    // Compute probability of choosing a 5 vs 4, with 5 suppressed as danger rises.
    let p5 = hard.baseProbLevel5WhenHard ?? 0.55;

    const dFull = hard.level5FullAllowedDanger ?? 0.12;
    const dNever = hard.level5AlmostNeverDanger ?? 0.28;

    // Suppression factor: 1 below dFull, ~0 above dNever, smooth in between.
    const t = clamp01((danger01 - dFull) / Math.max(1e-6, (dNever - dFull)));
    const suppression = 1 - t;
    p5 = p5 * suppression;

    // First hard preference: try to make the first hard a 5 if possible (and not heavily suppressed).
    if ((hard.preferLevel5ForFirstHard ?? true) && !sel.hasDroppedFirstHard) {
      const anyLevel5Exists = state.shapes.some(s => (s.difficulty ?? 1) === 5 && (s.frequency ?? 1) >= 0);
      if (anyLevel5Exists && suppression > 0.25) p5 = Math.max(p5, 0.80);
    }

    levelW[4] = (levelW[4] ?? 0) + addHardWeight * (1 - p5);
    levelW[5] = (levelW[5] ?? 0) + addHardWeight * p5;
  } else {
    levelW[4] = 0;
    levelW[5] = 0;
  }

  // Softly suppress level 3 in danger to prevent “still awkward at the top”.
  levelW[3] *= (1 - 0.65 * danger);

  // Hard-ban level 0 for the first few drops.
  if (sel.dropIndex <= (CONFIG.assist.openingNoLevel0UntilDrop ?? 0)) {
    levelW[0] = 0;
  }

  levelW = normaliseWeights(levelW);

  // Following a thread: one pick across the levels, each level keeping its share but the
  // thread's pieces far likelier within it
  const along = thread ? pickAlongThread(state, levelW, thread) : null;
  if (along) {
    commitSelectedShape(sel, along);
    const al = (along.difficulty ?? 1);
    if (al === 4 || al === 5) noteHardDropped(sel, al);
    return along;
  }

  // Choose a level.
  const chosenLevel = sampleDiscrete(levelW, state.rng);

  // Candidate shapes in that level (frequency>0).
  let candidates = state.shapes.filter(s =>
    (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) === chosenLevel
  );

  // Fallback: if no shapes exist for that level, broaden to any frequency>0 (never level 6).
  if (candidates.length === 0) {
    candidates = state.shapes.filter(s => (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) !== LEVEL6);
  }
  if (candidates.length === 0) {
    const any = state.shapes.filter(s => (s.difficulty ?? 1) !== LEVEL6);
    return any[Math.floor(state.rng() * any.length)] ?? state.shapes[0];
  }

  const chosenShape = pickFitting(state, candidates, (s) => (s.frequency ?? 1) * varietyMultiplier(sel, s));

  commitSelectedShape(sel, chosenShape);

  // If we dropped a hard shape, reset shared urge and start shared cooldown.
  const lvl = (chosenShape.difficulty ?? 1);
  if (lvl === 4 || lvl === 5) noteHardDropped(sel, lvl);

  return chosenShape;
}

// A piece from any level that has a share now (levelW), the thread's pieces far likelier.
function pickAlongThread(state, levelW, thread) {
  const sel = state.pieceSel;
  const byLevel = new Map();
  for (const s of state.shapes) {
    const L = s.difficulty ?? 1;
    if ((s.frequency ?? 1) <= 0 || L === LEVEL6 || !(levelW[L] > 0)) continue;
    const w = (s.frequency ?? 1) * varietyMultiplier(sel, s);
    if (!(w > 0)) continue;
    if (!byLevel.has(L)) byLevel.set(L, { mass: 0, list: [] });
    const b = byLevel.get(L);
    b.mass += w;
    b.list.push([s, w]);
  }
  const cand = [];
  for (const [L, b] of byLevel) for (const [s, w] of b.list) cand.push({ s, w: (levelW[L] * w / b.mass) * threadWeight(thread, s, sel.servedCounts.get(s.id) ?? 0) });
  if (!cand.length) return null;
  const weightOf = new Map(cand.map(c => [c.s, c.w]));
  return pickFitting(state, cand.map(c => c.s), s => weightOf.get(s));
}

/* =========================================
   The warm-up: pieces that fit
   =========================================
   For the first while (src/pacing.js warmth), a piece is picked the usual way a few times
   over (CONFIG.assist.warmup.draws), and then one of those that would sit best on the board
   as it is: one that leaves no gaps under itself, or finishes a row, rather than one that
   leaves a gap nothing will fill. With no warm-up left it's just the usual pick.
*/
export function pickFitting(state, list, weightFn) {
  const cfg = CONFIG.assist.warmup ?? {};
  const p = warmth(state) * (cfg.strength ?? 2);
  const first = sampleByWeight(list, weightFn, state.rng);
  if (!(p > 0) || list.length < 2 || !first) return first;
  // (the others from the same level as the first: each level keeps its share, so the big ones
  // still come, only the ones that fit)
  const L = first.difficulty ?? 1;
  const same = list.filter(s => (s.difficulty ?? 1) === L);
  const drawn = [first];
  for (let i = 1; i < (cfg.draws ?? 8); i++) drawn.push(sampleByWeight(same, weightFn, state.rng));
  const bad = new Map();
  for (const s of drawn) if (!bad.has(s)) bad.set(s, fitBadness(state.board, s));
  // (no gaps left: as likely as ever; each gap it can't help leaving: much less likely; a row
  // finished: a little more likely. And one of the last few again much less likely: something
  // that fits anywhere, a square, mustn't come round and round)
  const recent = new Set((state.pieceSel?.recentShapeIds?.slice(-3) ?? []).map(id => state.idToShape?.get(id)).filter(Boolean).map(outlineKey));
  return sampleByWeight(drawn, s => {
    const b = bad.get(s), fit = b <= 0 ? 1 + 0.4 * Math.min(2, -b) : Math.pow(1 + b, -p);
    return fit * (recent.has(outlineKey(s)) ? 0.15 : 1);
  }, state.rng);
}

// A piece's outline, whichever way it's turned (the same for all the 2x2 tiles, say).
const outlineKeys = new WeakMap();
function outlineKey(shape) {
  let k = outlineKeys.get(shape);
  if (k === undefined) { k = shape.rotations.map(m => m.map(r => r.map(c => (c ? 1 : 0)).join("")).join("/")).sort().join("|"); outlineKeys.set(shape, k); }
  return k;
}

// How badly a piece fits the board at its best: the gaps it would leave under itself (and
// inside itself) in its best place, dropped straight down as a player would, less the rows it
// would finish there. 0: it sits flat; the more, the worse; 99: it doesn't fit at all.
export function fitBadness(board, shape) {
  const rows = board.length, cols = board[0].length;
  // the top of each column (the first block down), and how full each row is
  const top = new Array(cols).fill(rows), fill = new Array(rows).fill(0);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (board[y][x]) { fill[y]++; if (top[x] === rows) top[x] = y; }
  let best = Infinity;
  for (const mat of shape.rotations) {
    const h = mat.length, w = mat[0].length;
    // each of its columns: its lowest block, and the gaps inside it (a block above an empty cell)
    const low = [], inner = [], per = [];
    for (let c = 0; c < w; c++) {
      let lo = -1, seen = false, gaps = 0, run = 0;
      for (let r = 0; r < h; r++) {
        if (mat[r][c]) { if (seen) gaps += run; seen = true; run = 0; lo = r; } else if (seen) run++;
      }
      low.push(lo); inner.push(gaps);
    }
    for (let r = 0; r < h; r++) { let n = 0; for (let c = 0; c < w; c++) if (mat[r][c]) n++; per.push(n); }
    for (let x = 0; x + w <= cols; x++) {
      let y = rows;
      for (let c = 0; c < w; c++) if (low[c] >= 0) y = Math.min(y, top[x + c] - 1 - low[c]);
      if (y < 0) continue; // (it would stick out of the top)
      let holes = 0, lines = 0;
      for (let c = 0; c < w; c++) if (low[c] >= 0) holes += top[x + c] - 1 - (y + low[c]) + inner[c];
      for (let r = 0; r < h; r++) if (per[r] && fill[y + r] + per[r] === cols) lines++;
      const b = holes - 1.2 * lines;
      if (b < best) best = b;
    }
  }
  return best === Infinity ? 99 : best;
}

function noteHardDropped(sel, lvl = 5) {
  sel.urge.hard = 0.0;
  sel.cooldown.hard = Math.max(sel.cooldown.hard ?? 0, hardCfg(sel.mode).cooldownDrops ?? 9);
  sel.hasDroppedFirstHard = true;
  if (lvl === 5) sel.hadGiant = true;
  if (lvl === 4 || lvl === 5) (sel.giantsAt ??= []).push(sel.dropIndex);
}

// God mode's calm spells (CONFIG.godMode.calm): after a level 6 set, or a few giants close
// together, a stretch of ordinary pieces (no giants, no sets) to catch your breath.
export function inCalm(state) {
  const sel = state.pieceSel;
  if (!isGodMode(state.mode) || !CONFIG.godMode.calm) return false;
  const c = CONFIG.godMode.calm, g = sel.giantsAt ?? [];
  // (a few giants close together start one)
  if (g.length >= (c.giants ?? 2) && sel.dropIndex - g[g.length - (c.giants ?? 2)] <= (c.within ?? 8) && (sel.calmFrom ?? -1) < g[g.length - 1]) beginCalm(state, "afterGiants");
  return sel.calmUntil != null && sel.dropIndex < sel.calmUntil;
}
function beginCalm(state, why) {
  const sel = state.pieceSel, c = CONFIG.godMode.calm;
  if (!isGodMode(state.mode) || !c?.[why]) return;
  const [a, b] = c[why];
  sel.calmFrom = sel.dropIndex;
  sel.calmUntil = Math.max(sel.calmUntil ?? 0, sel.dropIndex + 1 + a + Math.floor(state.rng() * (b - a + 1)));
}

/* =========================================
   Usability: could this powerup do anything useful on the board right now?
   =========================================
   Tries every rotation and column (dropped straight down, like a player would) and
   runs the real effect on a copy of the board. Phantoms only count if some spot lets
   them sink below where a normal piece would land (into a gap they fit).
   Returns the best "blocks helped" count (0 = useless right now).
*/
const usefulCache = { version: -1, board: null, map: new Map() };
export function powerupUsefulnessCached(state, shape) {
  if (usefulCache.version !== state.boardVersion || usefulCache.board !== state.board) {
    usefulCache.version = state.boardVersion; usefulCache.board = state.board; usefulCache.map.clear();
  }
  let v = usefulCache.map.get(shape.id);
  if (v === undefined) { v = powerupUsefulness(state.board, shape); usefulCache.map.set(shape.id, v); }
  return v;
}

export function powerupUsefulness(board, shape) {
  const rows = board.length, cols = board[0].length;
  const pu = shape.powerup;
  const occupied = board.map(r => r.map(Boolean));
  const collides = (mat, px, py) => {
    for (let y = 0; y < mat.length; y++) for (let x = 0; x < mat[0].length; x++) {
      if (!mat[y][x]) continue;
      const bx = px + x, by = py + y;
      if (bx < 0 || bx >= cols || by >= rows) return true;
      if (by >= 0 && occupied[by][bx]) return true;
    }
    return false;
  };
  let best = 0;
  for (let r = 0; r < shape.rotations.length; r++) {
    const mat = shape.rotations[r];
    for (let x = -mat[0].length + 1; x < cols; x++) {
      let y = -mat.length;
      if (collides(mat, x, y)) continue;
      while (!collides(mat, x, y + 1)) y++;
      if (pu.type === "phantom") {
        const deep = phantomLandingY(board, x, mat);
        if (deep != null && deep > y) best = Math.max(best, deep - y);
        if (best >= 4) return best;
        continue;
      }
      if (isPhantomPowerup(pu)) { // a combo with a phantom part lands in the deepest gap, then fires
        const deep = phantomLandingY(board, x, mat);
        if (deep == null) continue;
        y = deep;
      }
      const copy = board.map(row => row.slice());
      const placed = [];
      for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
        if (!mat[j][i] || y + j < 0) continue;
        copy[y + j][x + i] = { pid: -7 };
        placed.push({ x: x + i, y: y + j });
      }
      const area = resolvePowerupArea(pu, r, x, y, cols, rows);
      if (pu.type === "destroyer" || pu.type === "acid" || pu.type === "blast" || pu.type === "combo") {
        // these always do something if their area has blocks in it (cheap: no physics)
        let hit = 0;
        for (const i of area.indices) { const c = copy[(i / cols) | 0][i % cols]; if (c && c.pid !== -7) hit++; }
        best = Math.max(best, hit);
        if (best >= 4) return best;
        continue;
      }
      const fx = computeEffect(copy, pu, {
        area, placed, pid: -7, centre: { x: x + (mat[0].length - 1) / 2, y: y + (mat.length - 1) / 2 },
        cols, rows, rng: () => 0.5, makeFill: () => ({ pid: -8 }),
      });
      // filling only helps in a gap: a cell under a block, or walled in on two sides
      // (a pit or a notch); filling open air just adds height
      let filledGaps = 0;
      const solid = (xx, yy) => xx < 0 || xx >= cols || yy >= rows || (yy >= 0 && !!copy[yy][xx] && copy[yy][xx].pid !== -8);
      for (const f of fx.filled) {
        let covered = false;
        for (let yy = f.y - 1; yy >= 0 && !covered; yy--) covered = solid(f.x, yy) && copy[yy][f.x]?.pid !== -7;
        const walls = solid(f.x - 1, f.y) + solid(f.x + 1, f.y) + solid(f.x, f.y + 1);
        if (covered || walls >= 3) filledGaps++;
      }
      const moved = fx.moves.filter(m => m.toY > m.fromY || m.toX !== m.fromX).length;
      const score = fx.destroyed.length + moved + filledGaps + (fx.collapsed ? fx.collapsed.rows.length * cols : 0);
      best = Math.max(best, score);
      if (best >= 4) return best; // plenty: no need to look further
    }
  }
  return best;
}

/* =========================================
   A powerup made useless by the piece before it
   =========================================
   The next piece is picked a turn ahead, on the board as it was then, so the piece in
   between can leave a powerup with nothing to do (it filled the gap a phantom was going
   to sink into, say). At spawn, one like that is swapped for a powerup of the same
   outline that does still help, turned to match the preview, so whatever was planned for
   it still fits. Returns { shape, rot } (rot: the turn to spawn in).
*/
const outlineOf = (mat) => mat.map(r => r.map(c => (c ? 1 : 0)).join("")).join("/");
const turnsOf = (shape) => shape.rotations.map(outlineOf).sort().join("|");
export function stillUseful(state, shape) {
  const same = { shape, rot: 0 };
  const cfg = powerupCfg(state.mode), use = cfg.usability ?? {};
  if (!shape?.powerup || use.enabled === false || !state.pieceSel) return same;
  const min = use.minUseful ?? 1;
  if (powerupUsefulnessCached(state, shape) >= min) return same;
  const sel = state.pieceSel, ps = sel.powerup;
  const want = outlineOf(shape.rotations[0]), turns = turnsOf(shape);
  const live = state.powerups.filter(p => (p.frequency ?? 1) > 0 && !state.devPowerups?.disabled?.has(p.id));
  const twinsFrom = (classOk) => {
    const out = [];
    for (const p of live) {
      if (p.id === shape.id || !classOk(p) || (p.powerup.bad && !shape.powerup.bad)) continue;
      if (p.rotations.length !== shape.rotations.length || turnsOf(p) !== turns) continue;
      const rot = p.rotations.findIndex(m => outlineOf(m) === want);
      const helped = rot < 0 ? 0 : powerupUsefulnessCached(state, p);
      if (helped >= min) out.push({ shape: p, rot, helped });
    }
    return out;
  };
  // from the classes already met (no intro screens out of nowhere)...
  const met = (cls) => cls === shape.powerup.cls || ps.shownClasses.has(cls);
  let twins = twinsFrom(p => met(p.powerup.cls) && (!p.powerup.parts || p.powerup.parts.every(part => met(part.cls))));
  // ...or, early on, when the one class in so far has nothing that would help (gravity on a
  // tidy board), the next class can open a little early, with one of its starters
  // (a useless powerup is worse than an intro a little sooner than usual: half the usual gap;
  // and if this one was itself going to introduce its class, another class's intro takes its place)
  const prog = cfg.progression, introGap = (prog?.minDropsBetweenIntros ?? 0) / 2;
  const intro = !ps.shownClasses.has(shape.powerup.cls);
  let opens = false;
  if (!twins.length && prog?.enabled && (intro || ps.lastIntroDrop == null || sel.dropIndex - ps.lastIntroDrop >= introGap)) {
    const starters = new Set(live.filter(p => p.powerup.starter).map(p => p.powerup.cls));
    const first = ps.shownClasses.size ? null : prog.firstClassPool;
    twins = twinsFrom(p => p.powerup.cls !== "combo" && !met(p.powerup.cls) && !p.powerup.bad
      && (p.powerup.starter || !starters.has(p.powerup.cls)) && (!first || first.includes(p.powerup.cls)));
    opens = twins.length > 0;
  }
  if (!twins.length) return same;
  const god = isGodMode(state.mode);
  const pick = sampleByWeight(twins, (t) => (t.shape.frequency ?? 1) * Math.min(t.helped, 4)
    * (t.shape.powerup.cls === shape.powerup.cls ? 3 : 1) * (god ? CONFIG.godMode?.rarer?.[t.shape.id] ?? 1 : 1), state.rng);
  const cls = pick.shape.powerup.cls;
  if (opens) {
    if (!ps.classes.includes(cls)) { ps.classes.push(cls); ps.sinceClass = 0; ps.classAtDrop = sel.dropIndex; }
    ps.lastIntroDrop = sel.dropIndex;
    (ps.openedBySwap ??= new Set()).add(cls);
  }
  // (the books were written for the one it replaces)
  if (sel.lastShapeId === shape.id) {
    sel.lastShapeId = pick.shape.id;
    if (sel.recentShapeIds.at(-1) === shape.id) sel.recentShapeIds[sel.recentShapeIds.length - 1] = pick.shape.id;
    sel.servedCounts.set(shape.id, Math.max(0, (sel.servedCounts.get(shape.id) ?? 1) - 1));
    sel.servedCounts.set(pick.shape.id, (sel.servedCounts.get(pick.shape.id) ?? 0) + 1);
    if (ps.recentClasses?.length) ps.recentClasses[ps.recentClasses.length - 1] = cls;
  }
  // (an intro that won't happen now: the class is introduced properly later)
  if (cls !== shape.powerup.cls && !ps.shownClasses.has(shape.powerup.cls)) ps.pendingIntro.delete(shape.powerup.cls);
  ps.swapped = (ps.swapped ?? 0) + 1;
  return { shape: pick.shape, rot: pick.rot };
}

/* =========================================
   Powerup scheduler (Normal mode)
   =========================================
   Decides IF a powerup is due (an accumulating chance, boosted by danger and
   air pockets) and THEN WHICH one (frequency × tier-for-danger × class-need ×
   variety).
*/
function maybeSelectPowerup(state, danger01) {
  const cfg = powerupCfg(state.mode);
  const sel = state.pieceSel;
  const ps = sel.powerup;

  if (sel.dropIndex <= (cfg.minDropIndex ?? 0)) return null;
  if (ps.cooldown > 0) return null;

  const stats = analyseBoard(state.board);
  const holes01 = clamp01(stats.holes / Math.max(1, cfg.holesForMax ?? 18));

  // (in the end game there's no more help: powerups get rarer, and struggling doesn't matter)
  const endGame = endGameOn(state);
  const struggle = endGame ? 0 : sel.struggle;
  const boost = endGame ? (CONFIG.endGame?.powerupRate ?? 0.3)
    : (1 + (cfg.dangerBoost ?? 0) * danger01 + (cfg.holesBoost ?? 0) * holes01) * (1 + (cfg.struggle?.chanceBoost ?? 0) * struggle);
  const rate = state.devPowerups?.rate ?? 1; // dev mode frequency override
  // just after a level 6 set: a powerup is very likely (a big destroyer, see below)
  const after = cfg.afterSet ?? {};
  const l6 = sel.level6;
  const sinceSet = l6?.seen?.size && !l6.queue.length ? sel.dropIndex - l6.lastEnd : Infinity;
  const afterSet = !endGame && sinceSet >= 1 && sinceSet <= (after.pieces ?? 0);
  const chance = clamp01(Math.max(ps.chance * boost * rate, afterSet ? (after.chance ?? 0) : 0));
  ps.lastChance = chance;

  if (state.rng() >= chance) {
    ps.chance = Math.min(cfg.maxChance ?? 0.6, ps.chance + (cfg.chancePerDrop ?? 0.03));
    return null;
  }

  const dev = state.devPowerups;
  let candidates = state.powerups.filter(p => (p.frequency ?? 1) > 0 && !dev?.disabled?.has(p.id));
  if (!candidates.length) return null;

  // Progression: classes come in one at a time; every powerup of an unlocked class can turn up.
  const prog = cfg.progression;
  if (prog?.enabled) {
    const due = !ps.classes.length
      || ps.sinceClass >= (prog.newClassEvery ?? 5)
      || sel.dropIndex - ps.classAtDrop >= (prog.newClassAfterDrops ?? Infinity);
    if (due) unlockNextClass(state, candidates);
    // (combos are let through here and checked below: they open on their own)
    candidates = candidates.filter(p => p.powerup.cls === "combo" || ps.classes.includes(p.powerup.cls));
  }

  // Combos: mid-to-late game, and only built from classes that are already in.
  const combos = cfg.combos ?? {};
  // (counted from classes the player has actually met, not just unlocked)
  const met = [...ps.shownClasses].filter(c => c !== "combo");
  const combosOpen = sel.dropIndex >= (combos.minDrop ?? 0) &&
    (!prog?.enabled || met.length >= (combos.minClasses ?? 2));
  candidates = candidates.filter(p => p.powerup.type !== "combo" ||
    (combosOpen && (!prog?.enabled || p.powerup.parts.every(part => ps.shownClasses.has(part.cls)))));
  if (prog?.enabled && combosOpen && !ps.classes.includes("combo") && candidates.some(p => p.powerup.type === "combo")) {
    ps.classes.push("combo");
    ps.comboOpenedAt = ps.count;
  }
  if (!candidates.length) return null;

  // usable-now check (CONFIG...usability)
  const use = cfg.usability ?? {};
  const useful = new Map(), helped = new Map();
  if (use.enabled !== false) for (const p of candidates) {
    const n = powerupUsefulnessCached(state, p);
    helped.set(p.id, n);
    useful.set(p.id, n >= (use.minUseful ?? 1));
  }
  ps.lastUsable = useful.size ? [...useful.values()].filter(Boolean).length + "/" + useful.size : "–";
  // hard rule: a class still being learned only ever serves usable pieces
  if (useful.size) {
    const learning = (cls) => !ps.usedOk.has(cls) || ps.relearn.has(cls);
    candidates = candidates.filter(p => !learning(p.powerup.cls) || useful.get(p.id));
    if (!candidates.length) return null;
  }

  // "bad" powerups (the existential ones): rare, never early, never while a class is new
  const bad = cfg.bad ?? {};
  candidates = candidates.filter(p => !p.powerup.bad ||
    (sel.dropIndex >= (bad.minDrop ?? 0) && ps.usedOk.has(p.powerup.cls) && !ps.relearn.has(p.powerup.cls)));
  if (!candidates.length) return null;

  const need = cfg.need ?? {};
  const st = cfg.struggle ?? {};
  // help preference: from slightly favouring gentle ones (calm) to strongly helpful (struggling)
  const lucky = !endGame && state.rng() < (st.luckyChance ?? 0);
  let power = endGame ? 0 : lucky ? (st.helpPower ?? 2) : lerp(st.calmHelpPower ?? 0, st.helpPower ?? 2, sel.struggle);
  // God mode: always the more helpful ones, and above all the wide gravitizers
  const god = isGodMode(state.mode) && !endGame;
  if (god) power = Math.max(power, CONFIG.godMode?.helpPower ?? 0);
  const wide = CONFIG.godMode?.wideGravity ?? {};
  const wideW = (p) => god && gravityColumns(p) >= (wide.minCols ?? 6) ? (wide.weight ?? 1) : 1;
  // (...but not always the very biggest: CONFIG.godMode.rarer)
  const rarerW = (p) => (god ? CONFIG.godMode?.rarer?.[p.id] ?? 1 : 1);
  // ...and just after a level 6 set, the big destroyers
  const big = after.bigDestroyer ?? {};
  const bigW = (p) => afterSet && !p.powerup.bad && destroyerCells(p) >= (big.minCells ?? Infinity) ? (big.weight ?? 1) : 1;

  // Intros: a powerup of a class not met yet brings up its intro screen. Keep those spaced
  // out (they interrupt the game), and always introduce a class with a starter piece.
  const minGap = prog?.minDropsBetweenIntros ?? 0;
  const introducing = (p) => !ps.shownClasses.has(p.powerup.cls) && !ps.pendingIntro.has(p.powerup.cls);
  if (ps.lastIntroDrop != null && sel.dropIndex - ps.lastIntroDrop < minGap) {
    candidates = candidates.filter(p => !introducing(p));
  }
  // (strict: a class that has starters waits until one of them is usable)
  // (combo starters only count once every class they're built from has been met)
  const hasStarter = new Set(state.powerups.filter(p => p.powerup.starter && (p.frequency ?? 1) > 0 && !dev?.disabled?.has(p.id)
    && (!p.powerup.parts || p.powerup.parts.every(part => ps.shownClasses.has(part.cls)))).map(p => p.powerup.cls));
  candidates = candidates.filter(p => !introducing(p) || p.powerup.starter || !hasStarter.has(p.powerup.cls));
  if (!candidates.length) return null;

  // the first combo comes soon after they open, so everyone gets to see one
  const firstComboDue = !ps.shownClasses.has("combo") && ps.comboOpenedAt != null;

  ps.sinceClass++;
  const chosen = sampleByWeight(candidates, (p) => {
    // (useless: rare; a little use: less likely; a lot of use: full weight)
    const little = use.littleWeight ?? 1, good = Math.max(1, use.goodUseful ?? 1);
    const usableW = !useful.size ? 1 : !useful.get(p.id) ? (use.unusableWeight ?? 0.1)
      : little + (1 - little) * Math.min(1, (helped.get(p.id) - 1) / Math.max(1, good - 1));
    // (variety: not a third of one class in a row)
    const cv = cfg.classVariety ?? {};
    const runW = Math.pow(cv.weight ?? 1, (ps.recentClasses ?? []).slice(-(cv.last ?? 0)).filter(c => c === p.powerup.cls).length);
    const sideways = p.powerup.type === "gravity" && (p.powerup.direction === "left" || p.powerup.direction === "right");
    const n = (sideways ? need.gravitySideways : null) ?? need[p.powerup.type] ?? { base: 1 };
    const needW = (n.base ?? 1) + (n.holes ?? 0) * holes01 + (n.danger ?? 0) * danger01;
    const helpW = Math.pow((p.powerup.help ?? 3) / 3, power);
    const comboW = p.powerup.type === "combo" ? (firstComboDue ? (combos.firstBoost ?? 1) : (combos.weight ?? 1)) : 1;
    // a class's pieces share its weight, so big classes don't crowd out small ones
    const classSize = candidates.filter(c => c.powerup.cls === p.powerup.cls).length;
    const threadW = CONFIG.assist.threads?.powerups ? threadWeight(sel.currentThread, p, sel.servedCounts.get(p.id) ?? 0) : 1;
    return (p.frequency ?? 1) * needW * helpW * comboW * usableW * runW * wideW(p) * bigW(p) * rarerW(p) * varietyMultiplier(sel, p) * threadW * (6 / (classSize + 5));
  }, state.rng);
  if (chosen && introducing(chosen)) { ps.lastIntroDrop = sel.dropIndex; ps.pendingIntro.add(chosen.powerup.cls); }
  return chosen;
}

// Roughly how many cells a destroyer (or a combo's destroying part) wipes on a full board.
export function destroyerCells(shape) {
  const pu = shape?.powerup;
  if (!pu) return 0;
  let n = 0;
  for (const p of pu.type === "combo" ? (pu.parts ?? []) : [pu]) {
    if (p.type !== "destroyer" && p.type !== "acid") continue;
    const a = p.areaRotations?.[0];
    if (a) n += a.cells.length + a.rows.length * CONFIG.board.cols + a.cols.length * CONFIG.board.rows + (a.downs?.length ?? 0) * CONFIG.board.rows / 2;
  }
  return n;
}

// Open the next powerup class: the first is random from progression.firstClassPool,
// after that any class not in yet (combos open on their own, see CONFIG...combos).
function unlockNextClass(state, pool) {
  const prog = CONFIG.assist.powerups.progression;
  const ps = state.pieceSel.powerup;
  let remaining = [...new Set(pool.map(p => p.powerup.cls))].filter(t => t !== "combo" && !ps.classes.includes(t));
  if (!remaining.length) return null;
  if (!ps.classes.length) {
    const simple = remaining.filter(t => (prog.firstClassPool ?? remaining).includes(t));
    if (simple.length) remaining = simple;
  }
  // prefer a class that has something usable on the board right now
  const use = CONFIG.assist.powerups.usability ?? {};
  // the first piece of a new class must be usable: only open a class that has a usable
  // piece on the board right now (otherwise wait and try again next time)
  if (use.enabled !== false) {
    remaining = remaining.filter(t => pool.some(p => p.powerup.cls === t && powerupUsefulnessCached(state, p) >= (use.minUseful ?? 1)));
    if (!remaining.length) return null;
  }
  const next = remaining[Math.floor(state.rng() * remaining.length)];
  ps.classes.push(next);
  ps.sinceClass = 0;
  ps.classAtDrop = state.pieceSel.dropIndex;
  return next;
}

// Dev / testing: unlock every class and powerup right away.
export function introduceAllPowerups(state) {
  const ps = state.pieceSel.powerup;
  for (const p of state.powerups) {
    if (!ps.classes.includes(p.powerup.cls)) ps.classes.push(p.powerup.cls);
  }
}

function notePowerupDropped(sel) {
  const cfg = powerupCfg(sel.mode);
  sel.powerup.chance = cfg.baseChance ?? 0.05;
  sel.powerup.cooldown = cfg.cooldownDrops ?? 5;
  sel.powerup.count++;
}

function commitSelectedShape(sel, shape) {
  sel.lastShapeId = (typeof shape.id === "string") ? shape.id : null;

  if (shape.powerup) {
    // Powerups sit outside the 0–5 difficulty levels.
    sel.lastWasHard = false;
    sel.powerup.recentClasses = [...(sel.powerup.recentClasses ?? []), shape.powerup.cls].slice(-4);
  } else {
    const lvl = (shape.difficulty ?? 1);
    sel.lastLevel = lvl;
    sel.lastWasHard = lvl >= 4; // the giants (4, 5) and the level 6 group pieces
    sel.levelCounts[lvl] = (sel.levelCounts[lvl] ?? 0) + 1;
  }

  if (sel.lastShapeId) {
    sel.servedCounts.set(sel.lastShapeId, (sel.servedCounts.get(sel.lastShapeId) ?? 0) + 1);
    sel.recentShapeIds.push(sel.lastShapeId);

    // Keep a modest history buffer.
    if (sel.recentShapeIds.length > 32) sel.recentShapeIds.splice(0, sel.recentShapeIds.length - 32);
  }
}

/* =========================
   Sampling helpers
   ========================= */

function normaliseWeights(w) {
  let total = 0;
  for (const k of Object.keys(w)) total += Math.max(0, w[k] ?? 0);
  if (total <= 0) {
    // Safe fallback: uniform over 0–3 (never 4) if everything went to zero.
    return { 0: 0.25, 1: 0.25, 2: 0.25, 3: 0.25, 4: 0.0, 5: 0.0 };
  }
  const out = {};
  for (const k of Object.keys(w)) out[k] = Math.max(0, w[k] ?? 0) / total;
  for (const k of [0, 1, 2, 3, 4, 5]) out[k] = out[k] ?? 0;
  return out;
}

function sampleDiscrete(probByKey, rng) {
  let total = 0;
  for (const k of Object.keys(probByKey)) total += Math.max(0, probByKey[k] ?? 0);
  if (total <= 0) return 1;

  let r = rng() * total;
  const keys = Object.keys(probByKey).map(k => Number(k)).sort((a, b) => a - b);
  for (const k of keys) {
    r -= Math.max(0, probByKey[k] ?? 0);
    if (r <= 0) return k;
  }
  return keys[keys.length - 1];
}
