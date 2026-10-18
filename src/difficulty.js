// ============================================================
// DIFFICULTY — how hard the game has got (no DOM)
// ============================================================
// Classic and God mode start easy and get harder as the game goes on (CONFIG.difficulty, one
// section per mode; Extreme and the zen modes don't change). For the first `start` pieces it's
// as easy as it gets; over the next `length` pieces it climbs to `hardest`. Hard means the game
// stops holding your hand: a high stack no longer turns the pieces into tiny ones, the giants
// keep coming when you're in trouble (as long as they'd fit), the level 6 sets come more often,
// and the powerups come less often, but still more often the worse it looks, so they're a real
// relief. Never unfair: nothing comes that couldn't fit on the board as it is. Once the climb
// is over, everything is in, and from then on it only gets faster.

import { CONFIG } from "../config.js";
import { clamp01, lerp } from "./util.js";

// This mode's settings, or null (a mode that doesn't get harder)
export const rampCfg = (state) => CONFIG.difficulty?.[state.mode] ?? null;
const drops = (state) => state.pieceSel?.dropIndex ?? 0;

// How far along the climb, 0 to 1 (before any `hardest`)
export function rampProgress(state) {
  const c = rampCfg(state);
  if (!c) return 0;
  return clamp01((drops(state) - (c.start ?? 0)) / Math.max(1, c.length ?? 1));
}

// How hard it is now: 0 at the start, `hardest` at the end of the climb (eased in and out)
export function hardness(state) {
  const c = rampCfg(state);
  if (!c) return 0;
  const t = rampProgress(state);
  return (c.hardest ?? 1) * t * t * (3 - 2 * t);
}

// The climb is over: everything's in, and from here on it gets faster
export const rampDone = (state) => !!rampCfg(state) && drops(state) >= (rampCfg(state).start ?? 0) + (rampCfg(state).length ?? 0);

// One of the numbers that change as it gets harder: `usual` at the start, and what
// CONFIG.difficulty.hard says for `key` at hardness 1 (and further along the same line beyond
// it). Unchanged in a mode that doesn't get harder.
export function eased(state, key, usual) {
  const h = hardness(state), at1 = CONFIG.difficulty?.hard?.[key];
  return at1 == null || !h ? usual : usual + (at1 - usual) * h;
}

// How often a powerup class comes at this stage of the game (CONFIG.difficulty.classes: a weight
// per class at the start, in the middle and at the end of the climb, blended in between). 1 in a
// mode that doesn't get harder.
export function classWeight(state, cls) {
  const C = CONFIG.difficulty?.classes, c = rampCfg(state);
  if (!C || !c) return 1;
  const p = clamp01(drops(state) / Math.max(1, (c.start ?? 0) + (c.length ?? 1)));
  const w = (stage) => C[stage]?.[cls] ?? 1;
  return p < 0.5 ? lerp(w("early"), w("middle"), p * 2) : lerp(w("middle"), w("late"), (p - 0.5) * 2);
}

// How fast it falls (ms a row), given the usual speed for the rows cleared so far. It gets
// faster from the very first piece: a little with every piece, from fromMs at the start down to
// capEndMs at the end of the climb, or faster still if the rows cleared say so; but during the
// climb never quicker than a limit that comes down from capStartMs to capEndMs. After the climb,
// quicker with every piece (perPiece), down to minMs.
export function rampDropMs(state, ms) {
  const s = rampCfg(state)?.speed;
  if (!s) return ms;
  const c = rampCfg(state), end = (c.start ?? 0) + (c.length ?? 0);
  const cap = lerp(s.capStartMs ?? ms, s.capEndMs ?? ms, rampProgress(state));
  if (!rampDone(state)) {
    const byPieces = lerp(s.fromMs ?? ms, s.capEndMs ?? ms, clamp01(drops(state) / Math.max(1, end)));
    return Math.max(Math.round(cap), Math.round(Math.min(ms, byPieces)));
  }
  const past = drops(state) - end;
  return Math.max(s.minMs ?? 60, Math.round(Math.min(ms, cap) * Math.pow(s.perPiece ?? 1, past)));
}

// For the dev panel: where the game is
export function difficultyStatus(state) {
  const c = rampCfg(state);
  if (!c) return "doesn't change";
  const d = drops(state), end = (c.start ?? 0) + (c.length ?? 0);
  const where = d < (c.start ?? 0) ? `easy start (${(c.start ?? 0) - d} to go)` : d < end ? `climbing (${end - d} to go)` : `all in, speeding up (${d - end} past)`;
  return `${hardness(state).toFixed(2)} of ${(c.hardest ?? 1).toFixed(2)} · ${where}`;
}
