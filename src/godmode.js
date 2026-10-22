// ============================================================
// GOD MODE — everything from the first piece (no DOM)
// ============================================================
// CONFIG.modes.god has `everything: true`; CONFIG.godMode holds the numbers it changes.

import { CONFIG } from "../config.js";

export function isGodMode(mode) {
  return CONFIG.modes[mode]?.everything === true;
}

// `base` (a section of CONFIG.assist) with God mode's numbers for `key` on top, in God mode;
// just `base` in every other mode. (Zen, a calm mode, has its own on top of those:
// CONFIG.zen.calm.)
export function godConfig(mode, key, base) {
  const over = isGodMode(mode) ? CONFIG.godMode?.[key] : null;
  const out = over ? merge(base ?? {}, over) : base;
  const calm = CONFIG.modes[mode]?.calm ? CONFIG.zen?.calm?.[key] : null;
  return calm ? merge(out ?? {}, calm) : out;
}

function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object"
      ? merge(base[k], v) : v;
  }
  return out;
}

// How many columns a gravitizer (or a combo's gravity part) collapses; 0 for anything else.
export function gravityColumns(shape) {
  const pu = shape?.powerup;
  if (!pu) return 0;
  const g = pu.type === "gravity" ? pu : pu.parts?.find(p => p.type === "gravity");
  if (!g || (g.direction && g.direction !== "down")) return 0;
  return new Set(g.areaRotations?.[0]?.cols ?? []).size;
}
