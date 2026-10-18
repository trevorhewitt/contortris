// ============================================================
// THE POWERUP SHELF ON THE PAGE — in the bottom bar, where the next piece was (DOM)
// ============================================================
// A slot for each powerup on the shelf (src/shelf.js): the piece's own art in a frame in its
// class's colour, and how many are left. A tap (or the key 1, 2 or 3) uses it: the falling
// piece goes and the powerup comes down in its place (game.js useShelf). A slot whose class
// hasn't opened yet in the game shows dim and locked; a used one, empty.

import { useShelf } from "./game.js";
import { shelfReady } from "./shelf.js";
import { makeShapePreviewCanvas } from "./render.js";
import { CLASS_INFO } from "./powerups.js";

export function bindShelf({ state, root, onUse = () => {} }) {
  const slotsEl = root.querySelector(".shelfSlots");
  let built = null; // (the shelf the slots were made for)
  let buttons = [];

  function build() {
    built = state.shelf;
    slotsEl.innerHTML = "";
    buttons = (state.shelf?.slots ?? []).map((slot, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `shelfSlot cls-${slot.cls}`;
      const art = makeShapePreviewCanvas(slot.shape, 12, 2);
      art.removeAttribute("style");
      art.className = "shelfArt";
      const count = document.createElement("span");
      count.className = "shelfCount";
      const key = document.createElement("span");
      key.className = "shelfKey";
      key.textContent = String(i + 1);
      b.append(art, count, key);
      b.addEventListener("pointerdown", (e) => e.stopPropagation());
      b.addEventListener("click", (e) => { e.preventDefault(); use(i); });
      slotsEl.appendChild(b);
      return b;
    });
    root.hidden = !state.shelf;
    refresh();
  }

  function refresh() {
    if (built !== state.shelf) { build(); return; }
    (state.shelf?.slots ?? []).forEach((slot, i) => {
      const b = buttons[i], ready = shelfReady(state, slot);
      b.classList.toggle("ready", ready);
      b.classList.toggle("used", slot.left <= 0);
      b.classList.toggle("locked", slot.left > 0 && !ready);
      b.disabled = !ready;
      b.querySelector(".shelfCount").textContent = slot.left > 0 ? `×${slot.left}` : "";
      const what = CLASS_INFO[slot.cls]?.name ?? slot.cls;
      b.title = slot.left <= 0 ? `${what}: used` : ready ? `${slot.shape.name} (${what}): use it now` : `${what}: not yet`;
      b.setAttribute("aria-label", b.title);
    });
  }

  function use(i) {
    if (!useShelf(state, i)) return false;
    const b = buttons[i];
    b?.classList.remove("pop"); void b?.offsetWidth; b?.classList.add("pop");
    refresh();
    onUse(i);
    return true;
  }

  build();
  return { refresh, use };
}
