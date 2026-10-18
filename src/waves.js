// ============================================================
// WAVES — the board gets tense, then a big Gravitizer brings it down (no DOM)
// ============================================================
// Classic and God mode (CONFIG.waves, a section for each). Now and then the piece picker leans to
// the awkward pieces for a stretch (levels 3 and 4) and holds the Shiny Pieces back: the board
// gets messy, holes and overhangs and all. When the stretch is over, or sooner if the stack gets
// dangerously high, the next piece is a big Gravitizer, timed for when there's plenty for it to
// bring down (not one wasted on a tidy board), and the whole mess drops into its holes. The
// further into the game it is, the closer together the waves come and the longer they last. None
// in the end game, during a level 6 set or a calm spell, or (in Classic) before the Gravitizerz
// have been met: the first of a class is always one of its starters.

import { CONFIG } from "../config.js";
import { lerp } from "./util.js";
import { hardness } from "./difficulty.js";
import { endGameOn } from "./endgame.js";
import { groupUnderWay } from "./level6.js";
import { gravityColumns } from "./godmode.js";

const cfgOf = (state) => CONFIG.waves?.[state.mode] ?? null;
const inRange = (state, [a, b]) => a + Math.floor(state.rng() * (b - a + 1));
const along = (state, [a, b]) => Math.round(lerp(a, b, hardness(state)));

// A new game's waves: { at: the piece the next stretch starts on (picked once the game's under
// way), phase: null, "tense" or "relief", until, n: how many so far, last: the last big
// Gravitizer }, or null in a mode without them.
export function initWaves(state) {
  return cfgOf(state) ? { at: null, phase: null, until: 0, n: 0, last: null } : null;
}

// In the middle of a stretch: the awkward pieces, and hardly any Shiny Pieces.
export function waveTense(state) {
  return state.pieceSel?.waves?.phase === "tense";
}

// While a stretch lasts, the level mix leans its way (`levelW`, changed in place): its giants
// (levels 4 and 5) only where one could come anyway (`giants`: not in a calm spell, nor straight
// after another, nor on a stack too high for one), and the awkward ones in their place.
export function waveLevels(state, levelW, giants = true) {
  const c = cfgOf(state);
  if (!c || !waveTense(state)) return;
  const want = [0, 1, 2, 3, 4, 5].map(k => (giants || k < 4 ? c.levels[k] ?? 0 : 0));
  const sum = want.reduce((a, b) => a + b, 0) || 1;
  for (const k of [0, 1, 2, 3, 4, 5]) levelW[k] = lerp(levelW[k] ?? 0, want[k] / sum, c.mix ?? 1);
}

// Every piece the picker chooses (src/selection.js): the waves move on, and when one is due, the
// big Gravitizer that ends it (else null). `useful(shape)`: how many blocks it would bring down,
// at best, on the board as it is.
export function waveStep(state, danger01, calm, useful) {
  const c = cfgOf(state), sel = state.pieceSel, w = sel?.waves;
  if (!c || !w) return null;
  const d = sel.dropIndex;
  w.at ??= inRange(state, c.first);
  const gravity = reliefPool(state, c);
  if (w.phase === null) {
    // (only once there's a Gravitizer to end it with, and nothing else going on)
    if (d < w.at || !gravity.length || calm || endGameOn(state) || groupUnderWay(state)) return null;
    w.phase = "tense";
    w.until = d + along(state, c.pieces);
    w.n++;
    return null;
  }
  if (w.phase === "tense") {
    if (d < w.until && danger01 < (c.endAt ?? 1) && !endGameOn(state)) return null;
    w.phase = "relief";
    w.until = d + (c.relief?.wait ?? 0);
  }
  // relief: the big Gravitizer, once one would bring plenty down (the one that brings the most
  // down the likeliest); or, waited long enough for that, the wave's over without one
  const r = c.relief ?? {};
  const moved = new Map(gravity.map(p => [p, useful(p)]));
  const ready = gravity.filter(p => moved.get(p) >= (r.minMoved ?? 1));
  if (!ready.length && d < w.until) return null;
  w.phase = null;
  w.at = d + 1 + along(state, c.every);
  if (!ready.length) return null;
  let total = 0;
  for (const p of ready) total += Math.pow(moved.get(p), 2) * (p.frequency ?? 1);
  let x = state.rng() * total;
  const pick = ready.find(p => (x -= Math.pow(moved.get(p), 2) * (p.frequency ?? 1)) <= 0) ?? ready[ready.length - 1];
  w.last = { id: pick.id, at: d, moved: moved.get(pick) };
  return pick;
}

// For the developer tools' numbers: where the waves are.
export function waveStatus(state) {
  const w = state.pieceSel?.waves, d = state.pieceSel?.dropIndex ?? 0;
  if (!w) return "none in this mode";
  const last = w.last ? ` · last: ${w.last.id} at ${w.last.at} (${w.last.moved} down)` : "";
  if (w.phase === "tense") return `#${w.n} tense, ${Math.max(0, w.until - d)} to go${last}`;
  if (w.phase === "relief") return `#${w.n} waiting for its Gravitizer${last}`;
  return `${w.at == null ? "first" : `next at piece ${w.at}`}${last}`;
}

// The big Gravitizerz a wave can end with: tier 3, straight down across at least `minCols`
// columns, ones that help (not the bad ones), that turn up in this game, and (in Classic) only
// once the Gravitizerz have been met.
function reliefPool(state, c) {
  const ps = state.pieceSel.powerup, dev = state.devPowerups;
  if (!ps.shownClasses.has("gravity")) return [];
  const min = c.relief?.minCols ?? 1;
  return state.powerups.filter(p => p.powerup.type === "gravity" && p.powerup.tier >= 3 && !p.powerup.bad
    && (p.powerup.help ?? 3) >= 3 && (p.frequency ?? 1) > 0 && !p.powerup.setOnly && !dev?.disabled?.has(p.id)
    && gravityColumns(p) >= min);
}
