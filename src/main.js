// ============================================================
// EZTRIX — boot: load the blocks + achievements, wire everything up, run the loop
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
import { bindUI } from "./ui.js";
import { applySavedDevSettings } from "./devtools.js";
import { store } from "./util.js";

// (the developer tools' settings, if they're on: src/devtools.js)
applySavedDevSettings();
const { shapes, powerups } = loadShapes(RAW_SHAPES);
const state = createGameState(shapes, powerups, { groups: GROUPS, threads: { threads: THREADS, sets: SET_THREADS } });

// What turbo zen has shown, remembered from one visit to the next, fading each visit
// (CONFIG.zen.memory), so a visit doesn't open with the same few pieces as the last one did.
// (state.zenUses: this visit; state.zenPast: the ones before. src/zen.js counts both.)
{
  const M = CONFIG.zen.memory;
  state.zenUses = new Map();
  if (M) {
    const saved = store.getJSON(M.key, null);
    state.zenPast = new Map(Array.isArray(saved) ? saved.filter(e => Array.isArray(e) && typeof e[1] === "number").map(([k, n]) => [k, n * M.fade]).filter(([, n]) => n >= 0.05) : []);
    const save = () => {
      const all = new Map(state.zenPast);
      for (const [k, n] of state.zenUses) all.set(k, (all.get(k) ?? 0) + n);
      store.set(M.key, JSON.stringify([...all].map(([k, n]) => [k, Math.round(n * 100) / 100])));
    };
    setInterval(save, M.saveMs ?? 20000);
    addEventListener("pagehide", save);
  }
}

// the page layout sizes the board from these (index.html fit script)
document.documentElement.style.setProperty("--cols", String(CONFIG.board.cols));
document.documentElement.style.setProperty("--rows", String(CONFIG.board.rows));
window.__fitBoard?.();

const renderer = createRenderer(document.getElementById("boardCanvas"), document.getElementById("nextCanvas"));

// Achievements listen first, so the game-over screen can show what was unlocked.
let ui = null;
const achievements = createAchievements(ACHIEVEMENTS, { onUnlock: (def) => ui?.toast(def) });
// (not in zen mode: it plays itself; nor in a mode that says so: the tutorial)
if (CONFIG.achievements.enabled) on(state, (type, data, st) => { if (!CONFIG.modes[st.mode]?.zen && CONFIG.modes[st.mode]?.achievements !== false) achievements.handle(type, data, st); });

ui = bindUI({ state, renderer, achievements });

// Handy for testing in the browser console: open index.html?debug
if (new URLSearchParams(location.search).has("debug")) {
  window.__eztrix = {
    state, CONFIG, shapes, powerups, renderer, achievements, ui,
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
  // (not the home screen's, nor the tutorial's: they just wait)
  const m = CONFIG.modes[state.mode];
  if (document.hidden && m?.pauseWhenHidden === false && !m.home && !m.tutorial) {
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

  // (the board on screen: the game's own, or behind the home screen, either of its two boards)
  const live = ui.liveState?.() ?? state;
  updateGame(live, dt * timeScaleOf(live)); // (turbo zen runs faster)
  renderer.draw(live, now);
  ui.frame(now);

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
