// ============================================================
// THE BAY ON THE PAGE — the shiny pieces kept by, in the bottom bar where the next piece was (DOM)
// ============================================================
// The bay (src/shelf.js) shows only the shiny pieces in it that can be used now: one of a class
// once that class has opened in the game (its intro comes first), and none once it's used. A tap
// on the bay opens its menu, over the bottom of the board: each of them, bigger, with its name
// and its class. A tap on one there uses it (the falling piece goes, and it comes down in its
// place: game.js useShelf); a tap anywhere else, or Escape, closes it. While it's open the game
// runs slow (CONFIG.shelf.bayTimeScale), to choose in. No keys for it.

import { useShelf } from "./game.js";
import { shelfReady } from "./shelf.js";
import { makeShapePreviewCanvas } from "./render.js";
import { CLASS_INFO } from "./powerups.js";

export function bindShelf({ state, root, onUse = () => {} }) {
  const btn = root.querySelector(".bayBtn"), peek = root.querySelector(".bayPeek");
  // (the menu goes over the board: the bar it's in cuts off anything that sticks out of it)
  const host = document.getElementById("boardShell") ?? root;
  const menu = document.createElement("div");
  menu.className = "bayMenu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Shiny Pieces");
  menu.innerHTML = `<div class="bayTitle">Shiny Pieces</div><div class="bayItems"></div>`;
  const items = menu.querySelector(".bayItems");
  host.appendChild(menu);

  // (each piece's picture, made once: small in the bay, big in its menu)
  const arts = new Map();
  function art(shape, big) {
    const key = `${shape.id}:${big ? "big" : "small"}`;
    if (!arts.has(key)) {
      const c = makeShapePreviewCanvas(shape, big ? 10 : 5, big ? 2 : 1);
      c.removeAttribute("style");
      c.className = "bayArt";
      arts.set(key, c);
    }
    return arts.get(key);
  }
  const ready = () => (state.shelf?.slots ?? []).map((slot, i) => ({ slot, i })).filter(({ slot }) => shelfReady(state, slot));
  const live = () => !!state.shelf && state.running && !state.gameOver && !state.paused;
  let shown = null, menuShown = null, count = 0, open = false;

  function refresh() {
    root.hidden = !state.shelf;
    const now = ready();
    const key = now.map(({ slot, i }) => `${i}:${slot.shape.id}:${slot.left}`).join(",");
    if (key !== shown) {
      shown = key;
      peek.replaceChildren(...now.map(({ slot }) => art(slot.shape, false)));
      const what = now.map(({ slot }) => slot.shape.name).join(", ");
      btn.setAttribute("aria-label", now.length ? `Bay: ${what}` : "Bay: empty");
      btn.title = now.length ? "Open the bay" : "Shiny Pieces land here once they've turned up in the game";
      // (one more than there was: the bay hops)
      if (now.length > count && state.shelf) { root.classList.remove("pop"); void root.offsetWidth; root.classList.add("pop"); }
      count = now.length;
    }
    btn.disabled = !now.length;
    root.classList.toggle("empty", !now.length);
    if (open && (!now.length || !live())) setOpen(false);
    else if (open && key !== menuShown) drawMenu(now, key);
  }

  // (made again only when what's in it changes: a click on one that's just been made again
  // would come to nothing)
  function drawMenu(now = ready(), key = shown) {
    menuShown = key;
    items.replaceChildren(...now.map(({ slot, i }) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `bayItem cls-${slot.cls}`;
      b.setAttribute("role", "menuitem");
      b.dataset.slot = String(i);
      const name = document.createElement("span");
      name.className = "bayName";
      name.textContent = slot.shape.name;
      const cls = document.createElement("span");
      cls.className = "bayClass";
      cls.textContent = CLASS_INFO[slot.cls]?.name ?? slot.cls;
      b.append(art(slot.shape, true), name, cls);
      if (slot.left > 1) {
        const n = document.createElement("span");
        n.className = "bayCount";
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
