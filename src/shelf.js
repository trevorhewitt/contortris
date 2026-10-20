// ============================================================
// THE POWERUP SHELF — powerups kept by, to use when you choose (no DOM)
// ============================================================
// In place of the next piece, the player has a bay of Extra Shiny Pieces (CONFIG.shelf): one
// strong one of each of the three classes (Destroyerz, Gravitizerz, Expanderz; never a combo) in
// every game, the same ones every time, each to use once. The bay on the page (src/shelfui.js)
// shows how many can be used now, and a tap on it uses the next in its queue (shelfQueue; the
// pause menu puts them in another order: moveShelf): the falling piece goes and that one falls in
// its place (game.js useShelf). In Classic a class's piece only comes into the bay once the class
// has been unlocked: the first of its class is down on the board (its intro first), so nothing in
// it is a surprise, and using it never brings anything in sooner (the combos come once two
// classes have been met: a piece from the bay is never the one that meets one). In God mode and
// Zen, with every class in from the first piece, all three are there from the start; Extreme has
// no bay. (Later the bay will be the player's own, bought, kept from game to game: `left` is how
// many of each are in it.)

import { CONFIG } from "../config.js";
import { classOf, resolvePowerupArea } from "./powerups.js";

// The shelf for a new game: { slots: [{ cls, shape, left }], order: [], pending: null, undo: null }
// (order: the queue, the slots' numbers in the order they're used, shelfQueue; pending: a powerup
// taken off it while nothing was falling, to come next; undo: the one just taken, while it can
// still be sent back, and the piece it replaced, game.js undoShelf), or null in a mode without one.
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
  return slots.length ? { slots, order: [], pending: null, undo: null } : null;
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

// The queue: the slots that can be used now, in the order a tap on the bay uses them: the order
// they came into the bay in (in Classic, the order their classes unlocked; all at once, the order
// of CONFIG.shelf.classes), or whatever order the player has put them in since (moveShelf).
export function shelfQueue(state) {
  const sh = state.shelf;
  if (!sh) return [];
  // (one that's just come goes on the end)
  sh.slots.forEach((slot, i) => { if (!sh.order.includes(i) && shelfReady(state, slot)) sh.order.push(i); });
  return sh.order.map(i => sh.slots[i]).filter(slot => shelfReady(state, slot));
}

// The player puts the queue in another order (the pause menu): the one at `from` in it goes to
// `to`, the others keeping theirs (one that comes after still goes on the end). True if it moved.
export function moveShelf(state, from, to) {
  const sh = state.shelf, q = shelfQueue(state).map(slot => sh.slots.indexOf(slot));
  if (from === to || !(from >= 0 && from < q.length) || !(to >= 0 && to < q.length)) return false;
  q.splice(to, 0, q.splice(from, 1)[0]);
  sh.order = [...q, ...sh.order.filter(i => !q.includes(i))];
  return true;
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
