// ============================================================
// THE POWERUP SHELF — powerups kept by, to use when you choose (no DOM)
// ============================================================
// In place of the next piece, the player has a shelf of powerups (CONFIG.shelf): for now one
// strong one of each class (Dissolverz, Gravitizerz, Expanderz) in every game, picked from a short
// list. Tapping one takes the falling piece away and the powerup falls in its place (game.js
// useShelf). In Classic a class's slot only opens once that class has opened in the game (its
// intro comes first), so nothing on the shelf is a surprise. (Later the shelf will be the
// player's own, bought, kept from game to game: `left` is how many of each are on it.)

import { CONFIG } from "../config.js";

// The shelf for a new game: { slots: [{ cls, shape, left }], pending: null } (pending: a powerup
// taken off it while nothing was falling, to come next), or null in a mode without one.
export function createShelf(state) {
  const cfg = CONFIG.shelf, mode = CONFIG.modes[state.mode] ?? {};
  if (!cfg || !mode.shelf || !mode.powerups) return null;
  const slots = [];
  for (const cls of cfg.classes) {
    const options = (cfg.pieces[cls] ?? []).map(id => state.powerups.find(p => p.id === id)).filter(Boolean);
    if (!options.length) continue; // (a class that's switched off, or whose pieces are all gone)
    // (not the game's own dice: which one it is changes nothing about the pieces that come)
    slots.push({ cls, shape: options[Math.floor(Math.random() * options.length)], left: cfg.perGame ?? 1 });
  }
  return slots.length ? { slots, pending: null } : null;
}

// Can this slot be used now? (It has one left, and its class has opened in this game.)
export function shelfReady(state, slot) {
  if (!slot || slot.left <= 0 || !state.running || state.gameOver) return false;
  if (CONFIG.modes[state.mode]?.everything || state.tutorial) return true;
  return !!state.pieceSel?.powerup?.classes?.includes(slot.cls);
}

// (game.js spawnPiece) The powerup taken off the shelf while nothing was falling, if there is
// one: it comes now, before the next piece.
export function takeShelfPending(state) {
  const s = state.shelf?.pending ?? null;
  if (state.shelf) state.shelf.pending = null;
  return s;
}
