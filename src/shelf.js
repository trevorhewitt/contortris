// ============================================================
// THE POWERUP SHELF — powerups kept by, to use when you choose (no DOM)
// ============================================================
// In place of the next piece, the player has a bay of Extra Shiny Pieces (CONFIG.shelf): one
// strong one of each of the three classes (Destroyerz, Gravitizerz, Expanderz; never a combo) in
// every game, the same ones every time, each to use once. The bay on the page (src/shelfui.js)
// shows how many can be used now, and a tap on it opens its menu, to pick one: the falling piece
// goes and that one falls in its place (game.js useShelf). In Classic a class's piece only comes
// into the bay once the class has been unlocked: the first of its class is down on the board (its
// intro first), so nothing in it is a surprise, and using it never brings anything in sooner (the
// combos come once two classes have been met: a piece from the bay is never the one that meets
// one). (Later the bay will be the player's own, bought, kept from game to game: `left` is how many
// of each are in it.)

import { CONFIG } from "../config.js";
import { classOf, resolvePowerupArea } from "./powerups.js";

// The shelf for a new game: { slots: [{ cls, shape, left }], pending: null } (pending: a powerup
// taken off it while nothing was falling, to come next), or null in a mode without one.
// (`demo`: the tutorial's page about it, in any mode)
export function createShelf(state, { demo = false } = {}) {
  const cfg = CONFIG.shelf, mode = CONFIG.modes[state.mode] ?? {};
  if (!cfg || (!demo && (!mode.shelf || !mode.powerups))) return null;
  const slots = [];
  for (const cls of cfg.classes.filter((c, i, all) => BAY_CLASSES.includes(c) && all.indexOf(c) === i)) {
    // (only a piece of the slot's own class: never a combo, unless the developer tools put one
    // with the class in it there)
    const shape = state.powerups.find(p => p.id === cfg.pieces[cls]);
    if (!shape || !(shape.powerup.cls === cls || shape.powerup.parts?.some(q => classOf(q.type) === cls))) continue; // (a class that's switched off, or its piece gone)
    slots.push({ cls, shape, left: Math.max(1, cfg.perGame ?? 1) });
  }
  return slots.length ? { slots, pending: null } : null;
}

// The bay's classes: one slot each, whatever CONFIG.shelf.classes says beyond these.
const BAY_CLASSES = ["destroyer", "expander", "gravity"];

// Can this slot be used now? (It has one left, and its class has been unlocked in this game.)
export function shelfReady(state, slot) {
  if (!slot || slot.left <= 0 || !state.running || state.gameOver) return false;
  if (CONFIG.modes[state.mode]?.everything || state.tutorial) return true;
  // (a combo in it, from the developer tools: once the combos have come too)
  return unlocked(state, slot.cls) && unlocked(state, slot.shape.powerup.cls);
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

// How much of the board a Shiny Piece reaches, put down in the middle of an empty one (0 to 1):
// what the bay's pieces are chosen by (close to the best of their class, not the best), and the
// order the developer tools list them in to choose from. (On the usual board: Turbo zen's whole
// window makes CONFIG.board bigger while it's showing.)
const USUAL_BOARD = { cols: CONFIG.board.cols, rows: CONFIG.board.rows };
export function pieceReach(shape) {
  const { cols, rows } = USUAL_BOARD, m = shape.rotations[0];
  const area = resolvePowerupArea(shape.powerup, 0, Math.floor((cols - m[0].length) / 2), Math.floor(rows / 2) - m.length, cols, rows);
  return area.flags.reduce((n, f) => n + (f ? 1 : 0), 0) / (cols * rows);
}

// (game.js spawnPiece) The powerup taken off the shelf while nothing was falling, if there is
// one: it comes now, before the next piece.
export function takeShelfPending(state) {
  const s = state.shelf?.pending ?? null;
  if (state.shelf) state.shelf.pending = null;
  return s;
}
