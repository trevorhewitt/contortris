// ============================================================
// EXTRIS — boot: load the blocks + achievements, wire everything up, run the loop
// ============================================================

import { CONFIG } from "../config.js";
import { SHAPES as RAW_SHAPES } from "../shapes/main_shapes.js";
import { ACHIEVEMENTS } from "../shapes/achievements.js";
import { GROUPS } from "../shapes/groups.js";
import { THREADS, SET_THREADS } from "../shapes/threads.js";
import { loadShapes } from "./shapes.js";
import { createGameState, on, updateGame, hardDropAndLock, setNextPiece, timeScaleOf } from "./game.js";
import { createRenderer } from "./render.js";
import { createAchievements } from "./achievements.js";
import { createSound } from "./sound.js";
import { bindUI } from "./ui.js";

const { shapes, powerups } = loadShapes(RAW_SHAPES);
const state = createGameState(shapes, powerups, { groups: GROUPS, threads: { threads: THREADS, sets: SET_THREADS } });

// the page layout sizes the board from these (index.html fit script)
document.documentElement.style.setProperty("--cols", String(CONFIG.board.cols));
document.documentElement.style.setProperty("--rows", String(CONFIG.board.rows));
window.__fitBoard?.();

const renderer = createRenderer(document.getElementById("boardCanvas"), document.getElementById("nextCanvas"));
const sound = createSound(CONFIG.sound);

// Achievements listen first, so the game-over screen can show what was unlocked.
let ui = null;
const achievements = createAchievements(ACHIEVEMENTS, { onUnlock: (def) => ui?.toast(def) });
// (not in zen mode: it plays itself)
if (CONFIG.achievements.enabled) on(state, (type, data, st) => { if (!CONFIG.modes[st.mode]?.zen) achievements.handle(type, data, st); });

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

// A mode that carries on when the page is hidden (turbo zen: pauseWhenHidden false). Browsers
// stop drawing a hidden page, and run its timers only now and then (once a second, or once a
// minute after a while), so a timer moves the game on by however long it's really been.
let hiddenTimer = null;
document.addEventListener("visibilitychange", () => {
  if (document.hidden && CONFIG.modes[state.mode]?.pauseWhenHidden === false) {
    let then = performance.now();
    hiddenTimer = setInterval(() => {
      const now = performance.now();
      let left = Math.min(70000, now - then);
      then = now;
      if (!state.running || state.paused) return;
      for (; left > 0; left -= 50) updateGame(state, Math.min(50, left) * timeScaleOf(state));
    }, 250);
  } else if (!document.hidden && hiddenTimer) {
    clearInterval(hiddenTimer);
    hiddenTimer = null;
    last = performance.now(); // (and the frames carry on from now)
  }
});

function tick(now) {
  const dt = Math.min(50, now - last);
  last = now;

  updateGame(state, dt * timeScaleOf(state)); // (turbo zen runs faster)
  renderer.draw(state, now);
  ui.frame();

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
