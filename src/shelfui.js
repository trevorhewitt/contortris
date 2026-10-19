// ============================================================
// THE BAY ON THE PAGE — the Extra Shiny Pieces, in the bottom bar where the next piece was (DOM)
// ============================================================
// The bay (src/shelf.js) says how many Extra Shiny Pieces can be used now: a Shiny Piece, ×, and
// the number (×0 when there are none), which hops up whenever one comes (in Classic, the moment
// each class unlocks). It's there in every mode, with some in it or none (`always`; the
// tutorial's only on its page). A tap on it uses the next one in its queue (shelf.js shelfQueue):
// the falling piece goes, and that one comes down in its place (game.js useShelf). No keys for it.

import { useShelf } from "./game.js";
import { shelfCount, shelfQueue } from "./shelf.js";

export function bindShelf({ state, root, onUse = () => {}, always = false }) {
  const btn = root.querySelector(".bayBtn"), num = root.querySelector(".bayN"), tally = root.querySelector(".bayTally");
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
    const next = queue[0]?.shape.name;
    btn.setAttribute("aria-label", n ? `Extra Shiny Pieces: ${n}. Use the next one, ${next}` : "Extra Shiny Pieces: none");
    btn.title = n ? `Use the next Extra Shiny Piece (${next})` : "Extra Shiny Pieces you get land here";
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
