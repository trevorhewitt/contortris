// ============================================================
// OPTIONS, ON THE PAGE — the Options page's switches and the favourite piece (DOM)
// ============================================================
// Each switch is a checkbox marked data-opt with the option it changes (src/settings.js). The
// favourite piece shows as its own picture; tapping it opens a grid of every piece it could be,
// to pick another.

import { getOption, setOption, favourite } from "./settings.js";
import { makeShapePreviewCanvas } from "./render.js";
import { inGame } from "./selection.js";

// The pieces that can be a favourite: the ordinary ones that turn up early on in a game.
export function favouritePool(shapes) {
  return shapes.filter(s => !s.powerup && (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) >= 1 && (s.difficulty ?? 1) <= 3 && inGame(s));
}

export function bindOptions({ state, onChange = () => {} }) {
  const $ = (id) => document.getElementById(id);
  const panel = $("panelOptions");
  if (!panel) return { refresh() {} };
  const grid = $("favGrid"), art = $("favArt"), nameEl = $("favName");
  const pool = () => favouritePool(state.shapes ?? []).sort((a, b) => a.name.localeCompare(b.name));

  for (const box of panel.querySelectorAll("[data-opt]")) {
    box.addEventListener("change", () => {
      setOption(box.dataset.opt, box.checked);
      // (the same switch elsewhere: the intro screen's)
      for (const b of document.querySelectorAll(`.skipIntros`)) if (box.dataset.opt === "skipIntros") b.checked = box.checked;
      onChange(box.dataset.opt, box.checked);
    });
  }

  function showFavourite() {
    const id = favourite(pool()), s = state.allById?.get(id) ?? state.shapes.find(x => x.id === id);
    art.innerHTML = "";
    if (s) {
      const c = makeShapePreviewCanvas(s, 14, 2);
      c.removeAttribute("style");
      art.appendChild(c);
    }
    nameEl.textContent = s?.name ?? "";
  }

  // (the grid: made the first time it's opened)
  let built = false;
  function buildGrid() {
    built = true;
    grid.innerHTML = "";
    for (const s of pool()) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.id = s.id;
      b.title = s.name;
      b.setAttribute("aria-label", s.name);
      const c = makeShapePreviewCanvas(s, 8, 1);
      c.removeAttribute("style");
      b.appendChild(c);
      b.addEventListener("click", () => {
        setOption("favourite", s.id);
        showFavourite();
        markChosen();
        grid.hidden = true;
      });
      grid.appendChild(b);
    }
  }
  const markChosen = () => { for (const b of grid.children) b.classList.toggle("on", b.dataset.id === getOption("favourite")); };
  $("btnFavPick").addEventListener("click", () => {
    if (!built) buildGrid();
    grid.hidden = !grid.hidden;
    markChosen();
    if (!grid.hidden) grid.querySelector(".on")?.scrollIntoView({ block: "nearest" });
  });

  function refresh() {
    for (const box of panel.querySelectorAll("[data-opt]")) box.checked = !!getOption(box.dataset.opt);
    grid.hidden = true;
    showFavourite();
  }
  return { refresh };
}
