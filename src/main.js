// ============================================================
// EXTRIS — boot: load the blocks + achievements, wire everything up, run the loop
// ============================================================

import { CONFIG } from "../config.js";
import { SHAPES as RAW_SHAPES } from "../shapes/main_shapes.js";
import { ACHIEVEMENTS } from "../shapes/achievements.js";
import { loadShapes } from "./shapes.js";
import { createGameState, on, updateGame, hardDropAndLock, setNextPiece } from "./game.js";
import { createRenderer } from "./render.js";
import { createAchievements } from "./achievements.js";
import { createSound } from "./sound.js";
import { bindUI } from "./ui.js";

const { shapes, powerups } = loadShapes(RAW_SHAPES);
const state = createGameState(shapes, powerups);

// the page layout sizes the board from these (index.html fit script)
document.documentElement.style.setProperty("--cols", String(CONFIG.board.cols));
document.documentElement.style.setProperty("--rows", String(CONFIG.board.rows));
window.__fitBoard?.();

const renderer = createRenderer(document.getElementById("boardCanvas"), document.getElementById("nextCanvas"));
const sound = createSound(CONFIG.sound);

// Achievements listen first, so the game-over screen can show what was unlocked.
let ui = null;
const achievements = createAchievements(ACHIEVEMENTS, { onUnlock: (def) => ui?.toast(def) });
if (CONFIG.achievements.enabled) on(state, (type, data, st) => achievements.handle(type, data, st));

ui = bindUI({ state, renderer, sound, achievements });

// Handy for testing in the browser console: open index.html?debug
if (new URLSearchParams(location.search).has("debug")) {
  window.__extris = {
    state, CONFIG, shapes, powerups, renderer, achievements, ui, sound,
    step: (dt = 16) => updateGame(state, dt),           // advance without waiting for frames
    drop: () => hardDropAndLock(state),                  // drop + lock the current piece now
    setNext: (id) => setNextPiece(state, state.idToShape.get(id) ?? [...shapes, ...powerups].find(s => s.id === id)),
  };
}

let last = performance.now();

function tick(now) {
  const dt = Math.min(50, now - last);
  last = now;

  updateGame(state, dt);
  renderer.draw(state, now);
  ui.frame();

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
