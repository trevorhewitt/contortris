// ============================================================
// PACING — how far into a game we are (no DOM)
// ============================================================
// A game (in a mode with `warmup`, CONFIG.modes) starts gently: for the first few pieces the
// picker leans towards pieces that fit the board well (CONFIG.assist.warmup), so it plays
// easily, and that fades away. Later on it gets harder (src/difficulty.js).

import { CONFIG } from "../config.js";
import { clamp01 } from "./util.js";

const paced = (state) => CONFIG.modes[state.mode]?.warmup === true;
const drops = (state) => state.pieceSel?.dropIndex ?? 0;
// (Zen, the easy version of the game: pieces that fit all the way through, warmup "always")
export const alwaysWarm = (state) => CONFIG.modes[state.mode]?.warmup === "always";

// 1 at the start of a game, fading to 0 as the warm-up ends (0 in modes without one; 1 all
// the way through in a mode that's always like that).
export function warmth(state) {
  const w = CONFIG.assist.warmup;
  if (w && alwaysWarm(state)) return 1;
  if (!w || !paced(state)) return 0;
  const d = drops(state), full = w.fullUntil ?? 25, gone = w.goneBy ?? 90;
  return d <= full ? 1 : clamp01(1 - (d - full) / Math.max(1, gone - full));
}

// (later on, the game gets harder: src/difficulty.js)
