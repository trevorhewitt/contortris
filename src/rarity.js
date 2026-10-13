// ============================================================
// RARITY — how rare a piece is, in words, for the card on the pause screen (no DOM)
// ============================================================
// A rough estimate of the chance that a piece in an ordinary game is this one: its level's
// share of the pieces (CONFIG.assist.pieceMix.baseLevelWeight, with the giants and the powerups
// taking their own shares, CONFIG.rarity.share), times its share of that level by frequency.
// CONFIG.rarity.words turns that into words. Level 6 pieces only come in their sets, and some
// pieces only ever come after another one.

import { CONFIG } from "../config.js";

// { words: "very rare", set?: "the Tower of Babel", after?: ["a camel"] }
export function rarity(state, shape) {
  const f = shape.frequency ?? 1;
  if (!shape.powerup && f <= 0 && shape.tags?.includes("zen")) return { words: "only in zen mode" };
  if (!shape.powerup && (shape.difficulty ?? 1) === 6) {
    const set = (state.groups ?? []).find(g => groupPieces(g).includes(shape.id));
    return { words: "only ever in a set", set: set?.name };
  }
  if (f <= 0) {
    const after = allOf(state).filter(s => s.nextShapes?.includes(shape.id) && (s.nextShapeProbs?.[s.nextShapes.indexOf(shape.id)] ?? 1) > 0);
    return after.length ? { words: "only ever after something else", after: after.slice(0, 2).map(s => s.name) } : { words: "almost never" };
  }
  const p = chance(state, shape);
  const words = CONFIG.rarity.words;
  return { words: (words.find(([min]) => p >= min) ?? words[words.length - 1])[1] };
}

// The rough chance that any one piece is this one.
export function chance(state, shape) {
  const S = CONFIG.rarity.share;
  const live = (list) => list.filter(s => (s.frequency ?? 1) > 0);
  const total = (list) => list.reduce((n, s) => n + (s.frequency ?? 1), 0) || 1;
  const f = shape.frequency ?? 1;
  if (shape.powerup) return S.powerups * f / total(live(allOf(state).filter(s => s.powerup)));
  const d = shape.difficulty ?? 1;
  const same = live(allOf(state).filter(s => !s.powerup && (s.difficulty ?? 1) === d));
  const w = CONFIG.assist.pieceMix.baseLevelWeight;
  const sum = [0, 1, 2, 3].reduce((n, k) => n + (w[k] ?? 0), 0) || 1;
  const share = d >= 4 ? S.giants / 2 : (1 - S.giants - S.powerups) * (w[d] ?? 0) / sum;
  return share * f / total(same);
}

const allOf = (state) => [...(state.allShapes ?? state.shapes ?? []), ...(state.allPowerups ?? state.powerups ?? [])];

function groupPieces(g) {
  const ids = [];
  for (const st of g.steps ?? []) {
    for (const s of [...(st.shapes ?? []), ...(st.variant ?? [])]) ids.push(s.id);
    if (st.chain) for (const it of [...st.chain.start, ...Object.values(st.chain.after).flat()]) if (it.s) ids.push(it.s.id);
  }
  for (const s of g.echoes?.values() ?? []) ids.push(s.id);
  return ids;
}
