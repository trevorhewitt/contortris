// ============================================================
// PIECE PICKER (no DOM)
// ============================================================
// Order of precedence for each drop:
//   1. linked shapes (prev.nextShapes / nextShapeProbs) — "back to back" pieces
//   2. powerup scheduler (Normal mode only)
//   3. regular level mix: (a) choose a difficulty level, (b) choose a shape in that
//      level by frequency × variety (recently served / already on the board)

import { CONFIG } from "../config.js";
import { clamp01, lerp, sampleByWeight } from "./util.js";
import { analyseBoard, resolvePowerupArea, computeEffect, phantomLandingY, isPhantomPowerup } from "./powerups.js";

const DEBUG_LINK = false; // verbose console logging for linked shapes

export function initPieceSelectionState(state) {
  state.pieceSel = {
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

    // counts by level (0–5)
    levelCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },

    // shared urge/cooldown for hard (4/5)
    urge: { hard: 0.0 },
    cooldown: { hard: 0 },

    // whether we already produced the first hard drop in this run
    hasDroppedFirstHard: false,

    // powerup scheduler (Normal mode)
    powerup: {
      chance: CONFIG.assist.powerups.baseChance,
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
}

function pickGiantDue(state) {
  const range = CONFIG.assist.pieceMix.hard.firstGiantBetween;
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
  const cand = [];
  for (let i = 0; i < ids.length; i++) {
    const shape = idToShape.get(ids[i]);
    const x = Number(ps[i]);
    const p = Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
    if (shape && p > 0) cand.push({ shape, p });
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

  const mixCfg = CONFIG.assist.pieceMix;
  const danger01 = computeStackDanger01(state);
  const danger = clamp01(danger01 * (mixCfg.dangerBiasStrength ?? 1.0));

  // Cooldowns tick down.
  if (sel.cooldown.hard > 0) sel.cooldown.hard -= 1;
  if (sel.powerup.cooldown > 0) sel.powerup.cooldown -= 1;

  const idToShape = state.idToShape;
  const prevShape = sel.lastShapeId ? idToShape.get(sel.lastShapeId) : null;
  updateStruggle(state, danger01);

  // The first giant: always somewhere in CONFIG...hard.firstGiantBetween (unless it would
  // land on an already dangerous stack, then as soon as things calm down a bit).
  if (sel.giantDueAt != null && !sel.hadGiant && sel.dropIndex >= sel.giantDueAt && !sel.lastWasHard && danger01 < 0.55) {
    const giants = state.shapes.filter(s => (s.difficulty ?? 1) === 5 && (s.frequency ?? 1) > 0);
    if (giants.length) {
      const g = sampleByWeight(giants, s => (s.frequency ?? 1) * varietyMultiplier(sel, s), state.rng);
      commitSelectedShape(sel, g);
      noteHardDropped(sel);
      return g;
    }
  }

  const linked = tryLinkedNextShape(state, prevShape, idToShape, DEBUG_LINK);

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

  // 1) Opening blend -> base.
  const baseW = normaliseWeights({ ...mixCfg.baseLevelWeight });
  const openingW = normaliseWeights({ ...mixCfg.openingLevelWeight });

  const openingDrops = Math.max(0, mixCfg.openingDrops | 0);
  const openingT = openingDrops > 0 ? clamp01(1 - (sel.dropIndex - 1) / openingDrops) : 0;

  let levelW = {};
  for (const k of LEVELS) levelW[k] = lerp(baseW[k] ?? 0, openingW[k] ?? 0, openingT);

  // 2) Danger blend towards assistance mix (never allocates to 4/5 directly).
  const dangerTarget = normaliseWeights({ ...mixCfg.dangerTargetMix });
  for (const k of LEVELS) levelW[k] = lerp(levelW[k] ?? 0, dangerTarget[k] ?? 0, danger);

  // 3) Hard scheduler (4/5 share the same urge/cooldown).
  const hardCfg = mixCfg.hard;

  const pastMinHard = sel.dropIndex > (hardCfg.minDropIndex ?? 5);
  const dangerAllowsHard = danger01 <= (hardCfg.hardMaxDanger ?? 0.32);
  const cooldownAllowsHard = (sel.cooldown.hard ?? 0) <= 0 && !sel.lastWasHard;

  const modeHasGiants = CONFIG.modes[state.mode]?.giants !== false;
  const allowHard = modeHasGiants && pastMinHard && dangerAllowsHard && cooldownAllowsHard;

  // Update shared hard urge every call.
  const inWindow =
    sel.dropIndex >= (hardCfg.softWindowStart ?? 6) &&
    sel.dropIndex <= (hardCfg.softWindowEnd ?? 25);

  const recharge = (hardCfg.rechargePerDrop ?? 0.005) * (inWindow ? 1.4 : 0.8);
  sel.urge.hard = clamp01(Math.min(hardCfg.maxUrge ?? 0.95, (sel.urge.hard ?? 0) + recharge));

  const addHardWeight = allowHard ? (sel.urge.hard ?? 0) : 0;

  // Inject hard weight by allocating it to 4/5 (not to the whole distribution).
  // This keeps baseline/danger behaviour intact while allowing periodic “hard surprises”.
  if (addHardWeight > 0) {
    // Compute probability of choosing a 5 vs 4, with 5 suppressed as danger rises.
    let p5 = hardCfg.baseProbLevel5WhenHard ?? 0.55;

    const dFull = hardCfg.level5FullAllowedDanger ?? 0.12;
    const dNever = hardCfg.level5AlmostNeverDanger ?? 0.28;

    // Suppression factor: 1 below dFull, ~0 above dNever, smooth in between.
    const t = clamp01((danger01 - dFull) / Math.max(1e-6, (dNever - dFull)));
    const suppression = 1 - t;
    p5 = p5 * suppression;

    // First hard preference: try to make the first hard a 5 if possible (and not heavily suppressed).
    if ((hardCfg.preferLevel5ForFirstHard ?? true) && !sel.hasDroppedFirstHard) {
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

  // Choose a level.
  const chosenLevel = sampleDiscrete(levelW, state.rng);

  // Candidate shapes in that level (frequency>0).
  let candidates = state.shapes.filter(s =>
    (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) === chosenLevel
  );

  // Fallback: if no shapes exist for that level, broaden to any frequency>0.
  if (candidates.length === 0) {
    candidates = state.shapes.filter(s => (s.frequency ?? 1) > 0);
  }
  if (candidates.length === 0) {
    return state.shapes[Math.floor(state.rng() * state.shapes.length)];
  }

  const chosenShape = sampleByWeight(
    candidates,
    (s) => (s.frequency ?? 1) * varietyMultiplier(sel, s),
    state.rng
  );

  commitSelectedShape(sel, chosenShape);

  // If we dropped a hard shape, reset shared urge and start shared cooldown.
  const lvl = (chosenShape.difficulty ?? 1);
  if (lvl === 4 || lvl === 5) noteHardDropped(sel, lvl);

  return chosenShape;
}

function noteHardDropped(sel, lvl = 5) {
  sel.urge.hard = 0.0;
  sel.cooldown.hard = Math.max(sel.cooldown.hard ?? 0, CONFIG.assist.pieceMix.hard.cooldownDrops ?? 9);
  sel.hasDroppedFirstHard = true;
  if (lvl === 5) sel.hadGiant = true;
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
   Powerup scheduler (Normal mode)
   =========================================
   Decides IF a powerup is due (an accumulating chance, boosted by danger and
   air pockets) and THEN WHICH one (frequency × tier-for-danger × class-need ×
   variety).
*/
function maybeSelectPowerup(state, danger01) {
  const cfg = CONFIG.assist.powerups;
  const sel = state.pieceSel;
  const ps = sel.powerup;

  if (sel.dropIndex <= (cfg.minDropIndex ?? 0)) return null;
  if (ps.cooldown > 0) return null;

  const stats = analyseBoard(state.board);
  const holes01 = clamp01(stats.holes / Math.max(1, cfg.holesForMax ?? 18));

  const boost = (1 + (cfg.dangerBoost ?? 0) * danger01 + (cfg.holesBoost ?? 0) * holes01)
    * (1 + (cfg.struggle?.chanceBoost ?? 0) * sel.struggle);
  const rate = state.devPowerups?.rate ?? 1; // dev mode frequency override
  const chance = clamp01(ps.chance * boost * rate);
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
  const useful = new Map();
  if (use.enabled !== false) for (const p of candidates) useful.set(p.id, powerupUsefulnessCached(state, p) >= (use.minUseful ?? 1));
  ps.lastUsable = useful.size ? [...useful.values()].filter(Boolean).length + "/" + useful.size : "–";
  // hard rule: a class still being learned only ever serves usable pieces
  if (useful.size) {
    const learning = (cls) => !ps.usedOk.has(cls) || ps.relearn.has(cls);
    candidates = candidates.filter(p => !learning(p.powerup.cls) || useful.get(p.id));
    if (!candidates.length) return null;
  }

  const need = cfg.need ?? {};
  const st = cfg.struggle ?? {};
  // help preference: from slightly favouring gentle ones (calm) to strongly helpful (struggling)
  const lucky = state.rng() < (st.luckyChance ?? 0);
  const power = lucky ? (st.helpPower ?? 2) : lerp(st.calmHelpPower ?? 0, st.helpPower ?? 2, sel.struggle);

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
    const usableW = useful.size && !useful.get(p.id) ? (use.unusableWeight ?? 0.1) : 1;
    const sideways = p.powerup.type === "gravity" && (p.powerup.direction === "left" || p.powerup.direction === "right");
    const n = (sideways ? need.gravitySideways : null) ?? need[p.powerup.type] ?? { base: 1 };
    const needW = (n.base ?? 1) + (n.holes ?? 0) * holes01 + (n.danger ?? 0) * danger01;
    const helpW = Math.pow((p.powerup.help ?? 3) / 3, power);
    const comboW = p.powerup.type === "combo" ? (firstComboDue ? (combos.firstBoost ?? 1) : (combos.weight ?? 1)) : 1;
    // a class's pieces share its weight, so big classes don't crowd out small ones
    const classSize = candidates.filter(c => c.powerup.cls === p.powerup.cls).length;
    return (p.frequency ?? 1) * needW * helpW * comboW * usableW * varietyMultiplier(sel, p) * (6 / (classSize + 5));
  }, state.rng);
  if (chosen && introducing(chosen)) { ps.lastIntroDrop = sel.dropIndex; ps.pendingIntro.add(chosen.powerup.cls); }
  return chosen;
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
  const cfg = CONFIG.assist.powerups;
  sel.powerup.chance = cfg.baseChance ?? 0.05;
  sel.powerup.cooldown = cfg.cooldownDrops ?? 5;
  sel.powerup.count++;
}

function commitSelectedShape(sel, shape) {
  sel.lastShapeId = (typeof shape.id === "string") ? shape.id : null;

  if (shape.powerup) {
    // Powerups sit outside the 0–5 difficulty levels.
    sel.lastWasHard = false;
  } else {
    const lvl = (shape.difficulty ?? 1);
    sel.lastLevel = lvl;
    sel.lastWasHard = (lvl === 4 || lvl === 5);
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
