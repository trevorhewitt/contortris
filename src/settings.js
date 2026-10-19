// ============================================================
// OPTIONS — the player's settings, kept in this browser (no DOM but the body's classes)
// ============================================================
// What the Options page (src/optionsui.js) changes:
//   skipIntros: no intro screen when a class of powerup first turns up
//   favourite:  a piece that comes a little more often in a game (CONFIG.assist.variety.favourite);
//               one at random to start with, kept from then on
//   calmFx:     toned-down animations: no scan lines or glitching, gentler shakes and flashes,
//               and the home screen's camera keeps still (also on when the device asks for less
//               motion)
//   contrast:   a high contrast filter over the game
//   turboWhole: turbo zen fills the window (or plays on the usual board)

import { store } from "./util.js";

const KEY = "eztrix.options";
const DEFAULTS = { skipIntros: false, favourite: null, calmFx: false, contrast: false, turboWhole: true };
let options = null;

function load() {
  if (options) return options;
  options = { ...DEFAULTS, ...store.getJSON(KEY, {}) };
  return options;
}

export function getOption(name) { return load()[name]; }

export function setOption(name, value) {
  load()[name] = value;
  store.setJSON(KEY, options);
  applyOptions();
}

// (toned down: asked for here, or by the device)
export function calmFx() {
  const device = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  return device || !!load().calmFx;
}

// (high contrast: clearer cell borders on the board, and no glow)
export function highContrast() {
  return !!load().contrast;
}

// The favourite piece: the one chosen, while it's still one that can be; or else one of `pool` at
// random, kept from then on.
export function favourite(pool) {
  const o = load();
  if (pool?.length && !pool.some(s => s.id === o.favourite)) setOption("favourite", pool[Math.floor(Math.random() * pool.length)].id);
  return o.favourite;
}

// The body's classes for the options that change the look (index.html).
export function applyOptions() {
  const body = globalThis.document?.body;
  if (!body) return;
  body.classList.toggle("calmFx", calmFx());
  body.classList.toggle("highContrast", !!load().contrast);
}
