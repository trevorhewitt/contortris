// ============================================================
// THE BAY ON THE PAGE — the Extra Shiny Pieces, in the bottom bar where the next piece was (DOM)
// ============================================================
// The bay (src/shelf.js) says how many Extra Shiny Pieces can be used now: a Shiny Piece, ×, and
// the number (×0 when there are none), which hops up whenever one comes (in Classic, the moment
// each class unlocks). It's there in every mode, with some in it or none (`always`; the
// tutorial's only on its page). A tap on it opens its menu, over the bottom of the board: each of
// them, bigger, with its name and its class. A tap on one there uses it (the falling piece goes,
// and it comes down in its place: game.js useShelf); a tap anywhere else, or Escape, closes it.
// While it's open the game runs slow (CONFIG.shelf.bayTimeScale), to choose in. No keys for it.

import { useShelf } from "./game.js";
import { shelfReady, shelfCount } from "./shelf.js";
import { makeShapePreviewCanvas } from "./render.js";
import { CLASS_INFO } from "./powerups.js";

export function bindShelf({ state, root, onUse = () => {}, always = false }) {
  const btn = root.querySelector(".bayBtn"), num = root.querySelector(".bayN"), tally = root.querySelector(".bayTally");
  // (the menu goes over the board: the bar it's in cuts off anything that sticks out of it)
  const host = document.getElementById("boardShell") ?? root;
  const menu = document.createElement("div");
  menu.className = "bayMenu edge";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Extra Shiny Pieces");
  menu.innerHTML = `<div class="bayTitle">Extra Shiny Pieces</div><div class="bayItems"></div>`;
  const items = menu.querySelector(".bayItems");
  host.appendChild(menu);

  // (each piece's picture in the menu, made once)
  const arts = new Map();
  function art(shape) {
    if (!arts.has(shape.id)) {
      const c = makeShapePreviewCanvas(shape, 10, 2);
      c.removeAttribute("style");
      c.className = "bayArt";
      arts.set(shape.id, c);
    }
    return arts.get(shape.id);
  }
  const ready = () => (state.shelf?.slots ?? []).map((slot, i) => ({ slot, i })).filter(({ slot }) => shelfReady(state, slot));
  const live = () => !!state.shelf && state.running && !state.gameOver && !state.paused;
  let shown = null, menuShown = null, count = 0, open = false;

  // (every frame: src/ui.js. Nothing's touched unless something's changed)
  function refresh() {
    const now = ready(), n = shelfCount(state), on = live();
    const pieces = now.map(({ slot, i }) => `${i}:${slot.shape.id}:${slot.left}`).join(",");
    const key = `${!!state.shelf}|${on}|${n}|${pieces}`;
    if (key === shown) return;
    shown = key;
    root.hidden = !always && !state.shelf;
    num.textContent = String(n);
    const what = now.map(({ slot }) => slot.shape.name).join(", ");
    btn.setAttribute("aria-label", n ? `Extra Shiny Pieces: ${n} (${what})` : "Extra Shiny Pieces: none");
    btn.title = n ? "Use one of your Extra Shiny Pieces" : "Extra Shiny Pieces you get land here";
    // (one more than there was: the number hops up)
    if (n > count) { tally.classList.remove("bump"); void tally.offsetWidth; tally.classList.add("bump"); }
    count = n;
    btn.disabled = !n;
    root.classList.toggle("empty", !n);
    if (open && (!n || !on)) setOpen(false);
    else if (open && pieces !== menuShown) drawMenu(now, pieces);
  }

  // (made again only when what's in it changes: a click on one that's just been made again
  // would come to nothing)
  function drawMenu(now = ready(), pieces = now.map(({ slot, i }) => `${i}:${slot.shape.id}:${slot.left}`).join(",")) {
    menuShown = pieces;
    items.replaceChildren(...now.map(({ slot, i }) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "bayItem";
      b.setAttribute("role", "menuitem");
      b.dataset.slot = String(i);
      const name = document.createElement("span");
      name.className = "bayName";
      name.textContent = slot.shape.name;
      const cls = document.createElement("span");
      cls.className = "bayClass";
      cls.textContent = CLASS_INFO[slot.cls]?.name ?? slot.cls;
      b.append(art(slot.shape), name, cls);
      if (slot.left > 1) {
        const n = document.createElement("span");
        n.className = "bayLeft";
        n.textContent = `×${slot.left}`;
        b.appendChild(n);
      }
      b.addEventListener("pointerdown", (e) => e.stopPropagation());
      b.addEventListener("click", (e) => { e.preventDefault(); b.blur(); use(i); });
      return b;
    }));
  }

  function setOpen(want) {
    want = !!want && live() && ready().length > 0;
    if (want === open) return;
    open = want;
    state.bayOpen = want;
    menu.hidden = !want;
    root.classList.toggle("open", want);
    btn.setAttribute("aria-expanded", String(want));
    if (want) drawMenu();
  }

  btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  // (no focus left on it: a space bar meant for the piece would open it)
  btn.addEventListener("click", (e) => { e.preventDefault(); btn.blur(); setOpen(!open); });
  // (open, a tap anywhere else only closes it; so does Escape, in place of the pause menu)
  window.addEventListener("pointerdown", (e) => {
    if (!open || root.contains(e.target) || menu.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
  }, { capture: true });
  window.addEventListener("keydown", (e) => {
    if (!open || e.code !== "Escape") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    setOpen(false);
  }, { capture: true });

  function use(i) {
    if (!useShelf(state, i)) return false;
    setOpen(false);
    refresh();
    onUse(i);
    return true;
  }

  refresh();
  return {
    refresh, use,
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen: () => open,
    // (where they are on the screen, for the tutorial's finger)
    button: btn,
    item: (i) => items.querySelector(`[data-slot="${i}"]`),
  };
}
