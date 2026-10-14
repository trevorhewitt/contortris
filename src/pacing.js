// ============================================================
// PACING — how far into a game we are (no DOM)
// ============================================================
// A game (in a mode with `warmup`, CONFIG.modes) starts gently: for the first few pieces the
// picker leans towards pieces that fit the board well (CONFIG.assist.warmup), so it plays not
// much harder than Tetris, and that fades away. Later on the mix opens up, a little at a time,
// towards something like God mode's: more of the awkward pieces, the giants and the level 6
// sets more often (CONFIG.assist.later).

import { CONFIG } from "../config.js";
import { clamp01 } from "./util.js";

const paced = (state) => !!CONFIG.modes[state.mode]?.warmup;
const drops = (state) => state.pieceSel?.dropIndex ?? 0;

// 1 at the start of a game, fading to 0 as the warm-up ends (0 in modes without one).
export function warmth(state) {
  const w = CONFIG.assist.warmup;
  if (!w || !paced(state)) return 0;
  const d = drops(state), full = w.fullUntil ?? 25, gone = w.goneBy ?? 90;
  return d <= full ? 1 : clamp01(1 - (d - full) / Math.max(1, gone - full));
}

// 0 until the mix starts opening up, 1 once it's as open as it gets (0 in modes without it).
export function lateness(state) {
  const l = CONFIG.assist.later;
  if (!l || !paced(state)) return 0;
  return clamp01((drops(state) - (l.from ?? 80)) / Math.max(1, (l.by ?? 300) - (l.from ?? 80)));
}
