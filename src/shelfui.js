// ============================================================
// THE BAY ON THE PAGE — the Extra Shiny Pieces, in the bottom bar where the next piece was (DOM)
// ============================================================
// The bay (src/shelf.js) says how many Extra Shiny Pieces can be used now: a Shiny Piece, ×, and
// the number (×0 when there are none), which hops up whenever one comes (in Classic, the moment
// each class unlocks). It's there in every mode, with some in it or none (`always`; the
// tutorial's only on its page). Along its bottom, a little icon for each one in it, in the order
// they'll come, the next on the left: its class's (pieceIcon). A tap on it uses the next one in
// its queue (shelf.js shelfQueue): the falling piece goes, and that one comes down in its place
// (game.js useShelf). Space does the same (ui.js). And in the pause menu, the queue to put in
// another order (bindShelfQueue).

import { useShelf } from "./game.js";
import { shelfCount, shelfQueue, moveShelf } from "./shelf.js";
import { classOf } from "./powerups.js";
import { makeShapePreviewCanvas } from "./render.js";

// The classes' icons, made from the marks their pieces put on the board (src/render.js
// drawMarkShape): the Destroyerz' squares closing in, the Expanderz' star bursting out, the
// Gravitizerz' arrow falling. 9 by 9, "X" a pixel.
const GLYPHS = {
  destroyer: ["XXXXXXXXX", "X.......X", "X.XXXXX.X", "X.X...X.X", "X.X...X.X", "X.X...X.X", "X.XXXXX.X", "X.......X", "XXXXXXXXX"],
  expander: ["X...X...X", ".X..X..X.", "..X.X.X..", "...XXX...", "XXXXXXXXX", "...XXX...", "..X.X.X..", ".X..X..X.", "X...X...X"],
  gravity: ["....X....", "....X....", "....X....", "....X....", "X...X...X", ".X..X..X.", "..X.X.X..", "...XXX...", "....X...."],
};
// (each as one SVG path, a run of pixels along a row at a time)
const GLYPH_PATHS = Object.fromEntries(Object.entries(GLYPHS).map(([cls, rows]) => [cls,
  rows.map((row, y) => [...row.matchAll(/X+/g)].map(m => `M${m.index} ${y}h${m[0].length}v1h-${m[0].length}z`).join("")).join("")]));

// A piece's icon (an SVG, as text): its class's; a combo's, each of its classes' side by side, in
// the order they go off, close together on a faint plate of their own. (Coloured by the page:
// .bayGlyph and the class)
export function pieceIcon(shape) {
  const pu = shape.powerup;
  const classes = [...new Set((pu.parts ?? [pu]).map(p => classOf(p.type)))].filter(c => GLYPH_PATHS[c]);
  const combo = classes.length > 1, w = classes.length * 10 - 1;
  const glyphs = classes.map((c, i) => `<path class="bayGlyph cls-${c}" transform="translate(${i * 10} 0)" d="${GLYPH_PATHS[c]}"/>`).join("");
  return combo
    ? `<svg viewBox="-1 0 ${w + 2} 9" shape-rendering="crispEdges"><rect class="bayPlate" x="-1" width="${w + 2}" height="9"/>${glyphs}</svg>`
    : `<svg viewBox="0 0 ${w} 9" shape-rendering="crispEdges">${glyphs}</svg>`;
}

export function bindShelf({ state, root, onUse = () => {}, always = false }) {
  const btn = root.querySelector(".bayBtn"), num = root.querySelector(".bayN"), tally = root.querySelector(".bayTally");
  const icons = root.querySelector(".bayNext");
  const live = () => !!state.shelf && state.running && !state.gameOver && !state.paused;
  let shown = null, count = 0;

  // (every frame: src/ui.js. Nothing's touched unless something's changed)
  function refresh() {
    const queue = shelfQueue(state), n = shelfCount(state), on = live();
    const pieces = queue.map(slot => `${slot.shape.id}:${slot.left}`).join(",");
    const key = `${!!state.shelf}|${on}|${n}|${pieces}`;
    if (key === shown) return;
    shown = key;
    root.hidden = !always && !state.shelf;
    num.textContent = String(n);
    if (icons) icons.innerHTML = queue.map(slot => pieceIcon(slot.shape)).join("");
    const next = queue[0]?.shape.name, then = queue.slice(1).map(slot => slot.shape.name).join(", ");
    btn.setAttribute("aria-label", n ? `Extra Shiny Pieces: ${n}. Use the next one, ${next}${then ? ` (then ${then})` : ""}` : "Extra Shiny Pieces: none");
    btn.title = n ? `Use the next Extra Shiny Piece, ${next} (Space)` : "Extra Shiny Pieces you get land here";
    // (one more than there was: the number hops up)
    if (n > count) { tally.classList.remove("bump"); void tally.offsetWidth; tally.classList.add("bump"); }
    count = n;
    btn.disabled = !n;
    root.classList.toggle("empty", !n);
  }

  btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  // (no focus left on it: a key meant for the piece would press it again)
  btn.addEventListener("click", (e) => { e.preventDefault(); btn.blur(); if (live()) use(); });

  // (`i`: the slot; left out, the next in the queue)
  function use(i) {
    if (!useShelf(state, i)) return false;
    refresh();
    onUse(i);
    return true;
  }

  refresh();
  return {
    refresh, use,
    // (it used to open a menu to pick from: there's nothing to open now)
    open() {}, close() {}, isOpen: () => false, item: () => null,
    // (where it is on the screen, for the tutorial's finger)
    button: btn,
  };
}

// (the swap button's icon: two arrows, one over the other)
const SWAP_ICON = `<svg viewBox="0 0 9 11" aria-hidden="true" shape-rendering="crispEdges"><path d="M5 0h1v1H5zM6 1h1v1H6zM0 2h8v1H0zM6 3h1v1H6zM5 4h1v1H5zM3 6h1v1H3zM2 7h1v1H2zM1 8h8v1H1zM2 9h1v1H2zM3 10h1v1H3z"/></svg>`;

// The queue in the pause menu (`root`: #bayQueue, index.html): the Extra Shiny Pieces in the bay,
// in the order they'll come, the next on the left, each a card with its icon, its picture and its
// name; between two, a button that swaps them (a tap, a click, or Tab to it and Enter). Hidden
// with nothing in the bay. (ui.js refreshes it as the game pauses)
export function bindShelfQueue({ state, root }) {
  const list = root.querySelector(".bqList");
  // (each piece's picture, made once)
  const arts = new Map();
  function art(shape) {
    if (!arts.has(shape.id)) {
      const c = makeShapePreviewCanvas(shape, 12, 1);
      c.removeAttribute("style");
      c.className = "bqArt";
      arts.set(shape.id, c);
    }
    return arts.get(shape.id);
  }
  const el = (tag, cls, text) => { const e = document.createElement(tag); e.className = cls; if (text != null) e.textContent = text; return e; };

  // (`swapped`: the swap button just pressed, the k-th: the two either side of it slide into
  // their places, and it keeps the focus)
  function refresh(swapped = -1) {
    const queue = shelfQueue(state);
    root.hidden = !queue.length;
    list.replaceChildren(...queue.flatMap((slot, i) => {
      const card = el("div", `bqCard${i ? "" : " next"}`);
      if (!i) card.appendChild(el("span", "bqTag", "next"));
      const icon = el("span", "bqIcon");
      icon.innerHTML = pieceIcon(slot.shape);
      card.append(icon, art(slot.shape), el("span", "bqName", slot.shape.name));
      if (swapped >= 0 && (i === swapped || i === swapped + 1)) card.classList.add(i === swapped ? "fromRight" : "fromLeft");
      if (!i) return [card];
      const swap = el("button", "bqSwap secondary");
      swap.type = "button";
      swap.innerHTML = SWAP_ICON;
      const what = `Swap ${queue[i - 1].shape.name} and ${slot.shape.name}`;
      swap.setAttribute("aria-label", what);
      swap.title = what;
      swap.addEventListener("click", () => { if (moveShelf(state, i - 1, i)) refresh(i - 1); });
      return [swap, card];
    }));
    if (swapped >= 0) list.querySelectorAll(".bqSwap")[swapped]?.focus({ preventScroll: true });
  }

  return { refresh: () => refresh() };
}

