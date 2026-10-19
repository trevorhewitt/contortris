// ============================================================
// THE POWERUP SHELF — powerups kept by, to use when you choose (no DOM)
// ============================================================
// In place of the next piece, the player has a bay of Extra Shiny Pieces (CONFIG.shelf): one
// middling one of each of the three classes (Destroyerz, Gravitizerz, Expanderz; never a combo) in
// every game, picked from a short list, each to use once. The bay on the page (src/shelfui.js)
// shows how many can be used now, and a tap on it opens its menu, to pick one: the falling piece
// goes and that one falls in its place (game.js useShelf). In Classic a class's piece only comes
// into the bay once the class has been unlocked: the first of its class is down on the board (its
// intro first), so nothing in it is a surprise, and using it never brings anything in sooner (the
// combos come once two classes have been met: a piece from the bay is never the one that meets
// one). (Later the bay will be the player's own, bought, kept from game to game: `left` is how many
// of each are in it.)

import { CONFIG } from "../config.js";

// The shelf for a new game: { slots: [{ cls, shape, left }], pending: null } (pending: a powerup
// taken off it while nothing was falling, to come next), or null in a mode without one.
// (`demo`: the tutorial's page about it, in any mode, the first of each class's list every time)
export function createShelf(state, { demo = false } = {}) {
  const cfg = CONFIG.shelf, mode = CONFIG.modes[state.mode] ?? {};
  if (!cfg || (!demo && (!mode.shelf || !mode.powerups))) return null;
  const slots = [];
  for (const cls of cfg.classes.filter((c, i, all) => BAY_CLASSES.includes(c) && all.indexOf(c) === i)) {
    // (only a piece of the slot's own class, and never a combo)
    const options = (cfg.pieces[cls] ?? []).map(id => state.powerups.find(p => p.id === id))
      .filter(p => p && p.powerup.cls === cls && !p.powerup.parts);
    if (!options.length) continue; // (a class that's switched off, or whose pieces are all gone)
    // (not the game's own dice: which one it is changes nothing about the pieces that come)
    slots.push({ cls, shape: options[demo ? 0 : Math.floor(Math.random() * options.length)], left: Math.max(1, cfg.perGame ?? 1) });
  }
  return slots.length ? { slots, pending: null } : null;
}

// The bay's classes: one slot each, whatever CONFIG.shelf.classes says beyond these.
const BAY_CLASSES = ["destroyer", "expander", "gravity"];

// Can this slot be used now? (It has one left, and its class has been unlocked in this game.)
export function shelfReady(state, slot) {
  if (!slot || slot.left <= 0 || !state.running || state.gameOver) return false;
  if (CONFIG.modes[state.mode]?.everything || state.tutorial) return true;
  return unlocked(state, slot.cls);
}

// How many Extra Shiny Pieces can be used now (0 in a mode without a bay).
export function shelfCount(state) {
  return (state.shelf?.slots ?? []).reduce((n, slot) => n + (shelfReady(state, slot) ? slot.left : 0), 0);
}

// Has this class been unlocked? One of its class has come (game.js introduce), and isn't still
// on its way in: the first of a class (game.js spawnPiece marks it) starts out above the board,
// with its intro showing, and the class's piece comes into the bay the moment it's down on the
// board (or it's landed, dropped straight down).
function unlocked(state, cls) {
  if (!state.pieceSel?.powerup?.shownClasses?.has(cls)) return false;
  const a = state.active;
  return !(a && a.firstOfClass === cls && a.y + (a.shape.rotations[a.rotIdx]?.length ?? 0) <= 0);
}

// (game.js spawnPiece) The powerup taken off the shelf while nothing was falling, if there is
// one: it comes now, before the next piece.
export function takeShelfPending(state) {
  const s = state.shelf?.pending ?? null;
  if (state.shelf) state.shelf.pending = null;
  return s;
}
