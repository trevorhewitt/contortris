// ============================================================
// UI — menus, How to play, achievements page, toasts, HUD, input
// ============================================================

import { CONFIG } from "../config.js";
import { escapeHtml, store } from "./util.js";
import { getDifficultyZone } from "./selection.js";
import {
  on, startRun, resetGame, tryMove, tryRotate, beginLockIfNeeded, markInput, setNextPiece, markBoardDirty, isPowerupEnabled, hardDropAndLock, introduced, getActiveMatrix,
} from "./game.js";
import { makeShapePreviewCanvas, drawIcon } from "./render.js";
import { createDemo, runDemos } from "./demo.js";
import { createModeDemo } from "./modedemo.js";
import { CLASS_INFO, analyseBoard } from "./powerups.js";
import { introduceAllPowerups, computeStackDanger01 } from "./selection.js";
import { level6Status, startGroup, scheduleFirstGroup } from "./level6.js";
import { endGameStatus } from "./endgame.js";
import { waveStatus } from "./waves.js";
import { zenIgnoreInput, zenMovementChoices, zenStart } from "./zen.js";
import { rarity } from "./rarity.js";
import { createHome } from "./home.js";
import { buildDevTools, devToolsOn, setDevTools } from "./devtools.js";
import { bindShelf, bindShelfQueue } from "./shelfui.js";
import { difficultyStatus, classWeight } from "./difficulty.js";
import { classOrder } from "./selection.js";
import { bindTutorial } from "./tutorialui.js";
import { bindOptions, favouritePool } from "./optionsui.js";
import { getOption, setOption, applyOptions, favourite } from "./settings.js";
import { createGallery, createSparkles, somePieces } from "./pausemenu.js";

// Fallback icons (12×12) for achievements without one, and for locked / secret ones.
const _ = "", K = "#1a1428", G = "#ffcf3f", g = "#c98d1d", W = "#fff6c8";
const ICON_TROPHY = [
  [_, _, K, K, K, K, K, K, K, K, _, _],
  [_, K, G, G, W, G, G, G, G, g, K, _],
  [K, K, G, W, G, G, G, G, G, g, K, K],
  [K, G, K, G, G, G, G, G, g, K, G, K],
  [K, G, K, G, G, G, G, G, g, K, G, K],
  [_, K, K, K, G, G, G, g, K, K, K, _],
  [_, _, _, _, K, G, g, K, _, _, _, _],
  [_, _, _, _, _, K, K, _, _, _, _, _],
  [_, _, _, _, K, G, g, K, _, _, _, _],
  [_, _, _, K, G, G, g, g, K, _, _, _],
  [_, _, K, g, g, g, g, g, g, K, _, _],
  [_, _, K, K, K, K, K, K, K, K, _, _],
];
const ICON_LOCKED = [
  ["", "", "", "", "#181425", "#181425", "#181425", "#181425", "", "", "", ""],
  ["", "", "", "#181425", "#c0cbdc", "#c0cbdc", "#c0cbdc", "#c0cbdc", "#181425", "", "", ""],
  ["", "", "#181425", "#c0cbdc", "#181425", "#181425", "#181425", "#181425", "#c0cbdc", "#181425", "", ""],
  ["", "", "#181425", "#c0cbdc", "#181425", "", "", "#181425", "#c0cbdc", "#181425", "", ""],
  ["", "", "#181425", "#c0cbdc", "#181425", "", "", "#181425", "#c0cbdc", "#181425", "", ""],
  ["", "#181425", "#181425", "#181425", "#181425", "#181425", "#181425", "#181425", "#181425", "#181425", "#181425", ""],
  ["", "#181425", "#c0cbdc", "#c0cbdc", "#c0cbdc", "#c0cbdc", "#c0cbdc", "#c0cbdc", "#c0cbdc", "#c0cbdc", "#181425", ""],
  ["", "#181425", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#181425", "#181425", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#181425", ""],
  ["", "#181425", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#181425", "#181425", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#181425", ""],
  ["", "#181425", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#181425", ""],
  ["", "#181425", "#5a6988", "#5a6988", "#5a6988", "#5a6988", "#5a6988", "#5a6988", "#5a6988", "#5a6988", "#181425", ""],
  ["", "#181425", "#181425", "#181425", "#181425", "#181425", "#181425", "#181425", "#181425", "#181425", "#181425", ""],
];
const ICON_SECRET = [
  ["", "", "", "#181425", "#181425", "#181425", "#181425", "#181425", "#181425", "", "", ""],
  ["", "", "#181425", "#d4cbf2", "#d4cbf2", "#d4cbf2", "#d4cbf2", "#d4cbf2", "#d4cbf2", "#181425", "", ""],
  ["", "#181425", "#d4cbf2", "#a99ad6", "#181425", "#181425", "#181425", "#181425", "#a99ad6", "#d4cbf2", "#181425", ""],
  ["", "#181425", "#a99ad6", "#a99ad6", "#181425", "", "", "#181425", "#a99ad6", "#a99ad6", "#181425", ""],
  ["", "", "#181425", "#181425", "", "", "#181425", "#a99ad6", "#a99ad6", "#a99ad6", "#181425", ""],
  ["", "", "", "", "", "#181425", "#a99ad6", "#a99ad6", "#a99ad6", "#181425", "", ""],
  ["", "", "", "", "#181425", "#a99ad6", "#a99ad6", "#181425", "#181425", "", "", ""],
  ["", "", "", "", "#181425", "#a99ad6", "#a99ad6", "#181425", "", "", "", ""],
  ["", "", "", "", "", "#181425", "#181425", "", "", "", "", ""],
  ["", "", "", "", "#181425", "#a99ad6", "#a99ad6", "#181425", "", "", "", ""],
  ["", "", "", "", "#181425", "#a99ad6", "#a99ad6", "#181425", "", "", "", ""],
  ["", "", "", "", "", "#181425", "#181425", "", "", "", "", ""],
];

// ============================================================
// Name layer (piece names over the board)
// ============================================================

function createNameLayer(nameLayerEl) {
  let currentEl = null, shown = null;

  function clear() {
    if (currentEl) {
      currentEl.remove();
      currentEl = null;
    }
    shown = null;
    nameLayerEl.innerHTML = "";
  }

  // `effect`: optional line shown under the name (powerups); `cls`: its class (for its colours).
  // `instant`: no sliding in and out, the name just appears in place of the last (turbo zen).
  function setName(name, effect = "", cls = "", instant = false) {
    if (!name) {
      clear();
      return;
    }
    if (instant) clear();
    shown = name;

    const nextEl = document.createElement("div");
    nextEl.className = "nameText " + (instant ? "enterToCenter instant" : "enterFromRight") + (effect || cls ? ` powerup cls-${cls || "combo"}` : "");

    const main = document.createElement("span");
    main.className = "nameMain";
    main.textContent = name;
    nextEl.appendChild(main);

    if (effect) {
      const sub = document.createElement("span");
      sub.className = "nameEffect";
      sub.textContent = effect;
      nextEl.appendChild(sub);
    }

    nameLayerEl.appendChild(nextEl);
    if (instant) { currentEl = nextEl; return; }
    nextEl.getBoundingClientRect();

    if (currentEl) {
      currentEl.classList.add("exitToLeft");
      const old = currentEl;
      old.addEventListener("transitionend", () => old.remove(), { once: true });
    }

    nextEl.classList.remove("enterFromRight");
    nextEl.classList.add("enterToCenter");
    currentEl = nextEl;
  }

  // (`label`: said in place of the name, and left as it is while it stays the same. In turbo
  // zen, `instant`, a powerup's name comes in its colours but without what it does under it:
  // there's no time to read it)
  function setShape(shape, instant = false, label = null) {
    if (!shape) { clear(); return; }
    if (label) { if (label !== shown) setName(label, "", "", instant); return; }
    setName(shape.name, instant ? "" : shape.powerup?.description ?? "", shape.powerup ? shape.powerup.cls ?? "combo" : "", instant);
  }

  // The rows of the board the words cover, [top, bottom], or null with none showing.
  function rows(count) {
    const h = nameLayerEl.clientHeight;
    if (!currentEl || !h) return null;
    return [Math.floor(currentEl.offsetTop / h * count), Math.ceil((currentEl.offsetTop + currentEl.offsetHeight) / h * count) - 1];
  }
  // (faded: the falling piece among the stack under the words. CONFIG.render.names)
  let busy = false;
  function setBusy(on) {
    if (on === busy) return;
    busy = on;
    nameLayerEl.style.opacity = on ? String(CONFIG.render.names?.busyOpacity ?? 0.2) : "";
  }

  return { setName, setShape, clear, rows, setBusy };
}

// ============================================================
// Best scores + preferences (saved in this browser)
// ============================================================

const bestScores = {
  key: (mode) => `eztrix.best.${mode}`,
  get(mode) {
    const v = Number(store.get(this.key(mode), 0)) || 0;
    // Extreme mode used to be called Hard.
    if (mode === "extreme" && !v) return Number(store.get(this.key("hard"), 0)) || 0;
    return v;
  },
  submit(mode, score) {
    if (score <= this.get(mode)) return false;
    store.set(this.key(mode), String(score));
    return true;
  },
};

function loadLastMode() {
  const m = store.get("eztrix.mode", CONFIG.defaultMode);
  if (m === "hard") return "extreme";
  return CONFIG.modes[m] && !CONFIG.modes[m].hidden ? m : CONFIG.defaultMode;
}

// The game's name (CONFIG.name) wherever the page shows it: the title, the two logos (a letter
// each, in the logo's colours, which go round again for a longer name) and the footer.
function showGameName() {
  const name = CONFIG.name;
  document.title = name;
  for (const logo of document.querySelectorAll("#homeLogo, .hudLogo")) {
    const hues = [...logo.children].map(s => s.style.getPropertyValue("--h"));
    if (!hues.length || logo.textContent.trim() === name.toUpperCase()) continue;
    const big = logo.id === "homeLogo";
    logo.innerHTML = "";
    [...name.toUpperCase()].forEach((ch, i) => {
      const s = document.createElement("span");
      if (big) s.style.setProperty("--i", String(i));
      s.style.setProperty("--h", hues[i % hues.length]);
      if (big) s.appendChild(document.createElement("b")).textContent = ch; else s.textContent = ch;
      logo.appendChild(s);
    });
    if (big) logo.setAttribute("aria-label", name);
  }
  for (const el of document.querySelectorAll(".gameName")) el.textContent = name;
}

// ============================================================
// bindUI
// ============================================================

export function bindUI({ state, renderer, achievements }) {
  const $ = (id) => document.getElementById(id);
  showGameName();

  const scoreText = $("scoreText");
  const overlay = $("overlay");
  const toastsEl = $("toasts");
  const pauseBtn = $("pauseBtn");
  const debugPanel = $("debugPanel");
  const boardShellEl = $("boardShell");
  const nameLayer = createNameLayer($("nameLayer"));

  const panels = {
    menu: $("panelMenu"),
    howto: $("panelHowTo"),
    achievements: $("panelAchievements"),
    pause: $("panelPause"),
    gameover: $("panelGameOver"),
    intro: $("panelIntro"),
    powerups: $("panelPowerups"),
    devtools: $("panelDevTools"),
    options: $("panelOptions"),
  };
  // The developer tools (src/devtools.js): on in this browser, or for this visit (?devmode=1)
  const devUrl = new URLSearchParams(location.search).get("devmode") === "1";
  let devmode = devUrl || devToolsOn();
  // (the options: src/settings.js, and their page, src/optionsui.js)
  applyOptions();
  const options = bindOptions({ state });
  const skipIntros = () => !!getOption("skipIntros");
  const setSkipIntros = (on) => {
    setOption("skipIntros", on);
    for (const b of document.querySelectorAll(".skipIntros")) b.checked = on;
  };

  let home = null; // (the home screen: below, src/home.js)
  let lastMode = loadLastMode();
  let newBest = false;
  let currentPanel = null;
  let panelBack = "menu"; // where "Back" goes from How to play / Achievements

  const modeLabel = (mode) => CONFIG.modes[mode]?.label ?? mode;

  // The pause menu's gallery of the pieces so far, and its sparkles (src/pausemenu.js). (Only
  // while the menu's there: not while the board's being looked at, "looking at the board" below.)
  const pauseMenuUp = () => currentPanel === "pause" && !overlay.classList.contains("peek") && !overlay.classList.contains("zoomed");
  const gallery = createGallery({ state, root: $("pieceGallery") });
  const sparkles = createSparkles({ canvas: $("pauseFx"), panel: panels.pause, showing: pauseMenuUp });
  // (and the game over page's: the piece that ended it, bigger, and some of the ones before it)
  const overGallery = createGallery({ state, root: $("gameOverGallery"), picW: 260, picH: 200, cellMax: 40, spread: 0.44 });

  /* ---------- panels ---------- */

  function showPanel(name) {
    currentPanel = name;
    home?.noteInput();
    overlay.classList.toggle("show", !!name);
    overlay.classList.toggle("intro", name === "intro"); // slides over the board, no fade
    // paused: the menu over the whole screen (and in zen, the board behind it to look at: see
    // "looking at the board")
    overlay.classList.toggle("boardPause", name === "pause");
    overlay.classList.remove("peek");
    if (name !== "pause") resetLook();
    for (const [key, el] of Object.entries(panels)) el.hidden = key !== name;
    if (name === "menu") { renderMenu(); home?.enter(); }
    if (name === "achievements") renderAchievements();
    stopDemos();
    if (name === "howto") { startHowToDemos(); $("btnHowDemo").parentElement.hidden = panelBack !== "menu"; }
    if (name === "powerups") renderPowerupHelp();
    if (name === "options") options.refresh();
    if (name === "pause") $("btnPowerupHelp").hidden = !state.pieceSel?.powerup.shown.size;
    if (name) {
      const scroller = panels[name];
      if (scroller) scroller.scrollTop = 0;
      fitPanel(name);
      // focus the main button for keyboard players
      panels[name]?.querySelector("button:not(.panelX)")?.focus({ preventScroll: true });
    }
  }

  // The menu, pause and game over panels always fit on the board: if there isn't room, they're
  // scaled down rather than scrolled. (How to play and the lists scroll as usual.)
  const FIT_PANELS = new Set(["pause", "gameover", "intro"]); // (the menu is the home screen: it fits itself)
  function fitPanel(name = currentPanel) {
    const el = panels[name];
    if (!el || !FIT_PANELS.has(name)) return;
    el.style.transform = "";
    el.style.removeProperty("--fit");
    el.classList.add("fit");
    // (in developer mode the developer tools, under the rest of the pause menu, make it long: it's
    // as big as it always is, the rest of it fitting as usual, and it scrolls on down to them)
    const dev = name === "pause" && !$("devTools").hidden;
    el.classList.toggle("scrolls", dev);
    if (name === "pause") gallery.render(); // (its strip is laid out to the menu's width)
    if (name === "gameover") overGallery.render();
    // (paused, the dark is over the whole screen, but the menu's where the board is, the same size,
    // inside its edge: index.html)
    const pause = name === "pause", on = pause ? boardShellEl : overlay, margin = pause ? 0 : 16;
    const room = on.clientHeight - margin, roomW = on.clientWidth - margin;
    const tall = dev ? $("devTools").offsetTop : el.scrollHeight;
    const s = Math.min(1, room / Math.max(1, tall), roomW / Math.max(1, el.scrollWidth));
    if (s >= 0.995) return;
    el.style.transform = `scale(${s.toFixed(3)})`;
    // (scaled down, the pause menu's made as much bigger, so it's still the board's size, and its
    // strip is laid out again to its new width)
    if (pause) {
      el.style.setProperty("--fit", s.toFixed(3));
      gallery.render();
    }
  }
  window.addEventListener("resize", () => fitPanel());
  document.fonts?.ready?.then(() => fitPanel());

  const overlayShowing = () => !!currentPanel;

  function renderMenu() {
    // (each mode's button says what it is, from CONFIG.modes; all alike, none picked out)
    if (document.activeElement?.classList?.contains("modeBtn")) document.activeElement.blur();
    for (const b of document.querySelectorAll(".modeBtn")) {
      const m = b.dataset.mode;
      const tag = b.querySelector(".modeTag");
      if (tag) tag.textContent = CONFIG.modes[m]?.tagline ?? "";
    }
    $("achCount").textContent = `${achievements.unlockedCount()}/${achievements.defs.length}`;
  }

  /* ---------- turbo zen: the whole window ---------- */

  // The board as big as the window, the bottom bar gone: square cells, a little smaller than
  // usual on a small screen, and on a big one as big as it takes to keep to about
  // CONFIG.zen.wholeWindowCells of them (a big screen full of tiny cells is slow, and the same
  // thing over and over), but never fewer than the usual rows. The size is taken from the window
  // as it is when it's asked for and kept (a window resized afterwards just scales it). The usual
  // board again for anything else.
  const usualBoard = { cols: CONFIG.board.cols, rows: CONFIG.board.rows };
  let wholeWindow = false;
  function setBoardSize(cols, rows) {
    CONFIG.board.cols = cols;
    CONFIG.board.rows = rows;
    document.documentElement.style.setProperty("--cols", String(cols));
    document.documentElement.style.setProperty("--rows", String(rows));
    window.__fitBoard?.();
    renderer.resize();
  }
  function setWholeWindow(on) {
    if (on === wholeWindow) return;
    wholeWindow = on;
    if (on) {
      const vw = (window.visualViewport?.width ?? window.innerWidth) - 16, vh = (window.visualViewport?.height ?? window.innerHeight) - 16;
      const small = $("boardShell").getBoundingClientRect().width / CONFIG.board.cols * (CONFIG.zen.wholeWindowCell ?? 0.8);
      let cell = Math.max(8, small, Math.sqrt(vw * vh / (CONFIG.zen.wholeWindowCells ?? Infinity)));
      if (vh / cell < usualBoard.rows) cell = vh / usualBoard.rows; // (the usual rows at least: the tallest pieces fill them)
      document.body.classList.add("wholeWindow");
      setBoardSize(Math.max(usualBoard.cols, Math.floor(vw / cell)), Math.max(usualBoard.rows, Math.floor(vh / cell)));
    } else {
      document.body.classList.remove("wholeWindow");
      setBoardSize(usualBoard.cols, usualBoard.rows);
    }
  }

  // A mode's speed setting (CONFIG.modes[mode].speeds: turbo zen), remembered in this browser.
  const speedKey = (mode) => `eztrix.speed.${mode}`;
  function savedSpeed(mode) {
    const v = Number(store.get(speedKey(mode), 1));
    return CONFIG.modes[mode]?.speeds?.includes(v) ? v : 1;
  }
  const speedText = () => `Speed: ${String(state.speed ?? 1)}×`;

  /* ---------- game flow ---------- */

  // (turbo zen fills the window unless the player has switched back to the usual board, in the
  // pause menu or the options)
  function startGame(mode = lastMode) {
    markInput(state, "touch");
    lastMode = CONFIG.modes[mode] ? mode : CONFIG.defaultMode;
    store.set("eztrix.mode", lastMode);
    newBest = false;
    state.backdrop = false;
    hideBoard(false);
    setWholeWindow(lastMode === "turbo" && !!getOption("turboWhole"));
    startRun(state, lastMode);
    state.speed = savedSpeed(lastMode);
    showPanel(null);
  }

  function resumeGame() {
    markInput(state, "touch");
    zenIgnoreInput(state); // (zen: coming back isn't taking the piece over)
    if (state.gameOver) return;
    state.paused = false;
    hideBoard(false);
    showPanel(null);
  }

  // (paused in a mode that hides the board: CONFIG.modes[mode].hideOnPause)
  const boardHidden = () => document.body.classList.contains("boardHidden");
  function hideBoard(on) { document.body.classList.toggle("boardHidden", !!on); }

  function pauseGame() {
    if (state.gameOver || !state.running) return;
    state.paused = true;
    state.softDropping = false;
    $("pauseMode").textContent = `${modeLabel(state.mode)} mode`;
    $("btnWholeWindow").hidden = state.mode !== "turbo";
    $("btnWholeWindow").textContent = wholeWindow ? "Back to the usual board" : "Fill the window";
    $("btnSpeed").hidden = !CONFIG.modes[state.mode]?.speeds;
    $("btnSpeed").textContent = speedText();
    hideBoard(CONFIG.modes[state.mode]?.hideOnPause);
    $("btnLookBoard").hidden = boardHidden();
    bayQueue.refresh();
    gallery.open(); // (the newest piece in the middle)
    showPanel("pause");
  }

  function togglePause() {
    if (!state.running || state.gameOver) return;
    if (state.paused) resumeGame();
    else pauseGame();
  }

  function goToMenu() {
    hideBoard(false);
    setWholeWindow(false);
    resetGame(state);
    showPanel("menu");
  }

  /* ---------- the home screen (src/home.js) ---------- */

  home = createHome({
    state, boardCanvas: $("boardCanvas"),
    setBoardSize, setWholeWindow,
    restoreBoard: () => setBoardSize(usualBoard.cols, usualBoard.rows),
    onPlay: (mode) => startGame(mode),
    // (back from idle: to the page it went idle from, the home screen behind it)
    onShowMenu: (panel = "menu") => { showPanel("menu"); if (panel !== "menu" && panels[panel]) showPanel(panel); },
    menuShowing: () => currentPanel === "menu",
    // Where it can go idle, and where it wakes up to: the home screen, the achievements from it,
    // and the game over (to the home screen: that game's gone by then). Not How to play, nor
    // anywhere a game is still going on (paused, an intro).
    idleFrom: () => (currentPanel === "menu" ? "menu"
      : currentPanel === "achievements" && panelBack === "menu" ? "achievements"
      : currentPanel === "gameover" ? "menu" : null),
    lastMode: () => lastMode,
    hideOverlay: () => showPanel(null),
  });

  function showGameOver() {
    newBest = bestScores.submit(state.mode, state.score);
    const killer = state.gameOverInfo.shape;
    const unlocked = achievements.unlockedThisGame;

    $("gameOverStats").innerHTML =
      `<div>${escapeHtml(modeLabel(state.mode))} mode</div>` +
      `<div class="goScore">Final score: ${state.score}${newBest ? " — new best!" : ""}</div>`;

    // The piece that killed you, in the middle, and some of the pieces before it, each once, where
    // it last fell, as in the pause menu (CONFIG.gameOver). (It may never have landed: it had no
    // room to come in.)
    const fell = gallery.pieces().filter(s => s.id !== killer?.id);
    if (killer) fell.push(killer);
    overGallery.set(somePieces(fell, CONFIG.gameOver));
    $("gameOverLast").hidden = !killer;

    $("gameOverAch").textContent = unlocked.length
      ? `${unlocked.length} achievement${unlocked.length > 1 ? "s" : ""} unlocked this game!`
      : "";
    showPanel("gameover");
  }

  /* ---------- game events ---------- */

  // Remember which pieces opened the last few games, so the next opening is different
  // (CONFIG.assist.variety.acrossGames).
  // Level 6: remember that it has unlocked in this browser (only used if level6.persist)
  const LEVEL6_KEY = "eztrix.level6.v1";
  state.level6Remembered = store.get(LEVEL6_KEY) === "1";
  // the last level 6 sets served, so the next game doesn't open with the same one
  const LEVEL6_RECENT_KEY = "eztrix.level6.recent.v1";
  state.level6Recent = store.getJSON(LEVEL6_RECENT_KEY, []);
  let savedRecent = state.level6Recent;

  // Developer mode puts the newest things first, and anything never seen in this browser comes up
  // more (CONFIG.devMode.novelty): what has been seen here, and how often
  const SEEN_KEY = "eztrix.seen.v1", SEEN_SETS_KEY = "eztrix.seenSets.v1";
  state.seenEver = new Map(Object.entries(store.getJSON(SEEN_KEY, {})));
  state.seenSetsEver = new Map(Object.entries(store.getJSON(SEEN_SETS_KEY, {})));
  // (and which version of each set came last, so the next one is another)
  const SET_VERSIONS_KEY = "eztrix.setVersions.v1";
  state.setVersions = new Map(Object.entries(store.getJSON(SET_VERSIONS_KEY, {})));
  // (and since the page was loaded: developer mode shows the newest things once each, then carries on as usual)
  state.shownThisLoad = new Map();
  state.setsShownThisLoad = new Map();
  state.zenOpenings = new Set(); // (turbo zen's opening, once: CONFIG.zen.opening)
  let seenUnsaved = 0, setStarts = 0;
  function saveSeen() {
    if (!seenUnsaved) return;
    store.setJSON(SEEN_KEY, Object.fromEntries(state.seenEver));
    store.setJSON(SEEN_SETS_KEY, Object.fromEntries(state.seenSetsEver));
    store.setJSON(SET_VERSIONS_KEY, Object.fromEntries(state.setVersions));
    seenUnsaved = 0;
  }
  function noteSeen(shape) {
    state.seenEver.set(shape.id, (state.seenEver.get(shape.id) ?? 0) + 1);
    state.shownThisLoad.set(shape.id, (state.shownThisLoad.get(shape.id) ?? 0) + 1);
    const l6 = state.pieceSel?.level6;
    if (l6 && (l6.starts ?? 0) !== setStarts) {
      setStarts = l6.starts ?? 0;
      if (l6.lastGroup) {
        state.seenSetsEver.set(l6.lastGroup, (state.seenSetsEver.get(l6.lastGroup) ?? 0) + 1);
        state.setsShownThisLoad.set(l6.lastGroup, (state.setsShownThisLoad.get(l6.lastGroup) ?? 0) + 1);
      }
    }
    if (++seenUnsaved >= 10) saveSeen();
  }
  window.addEventListener("pagehide", saveSeen);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveSeen(); });

  const OPENINGS_KEY = "eztrix.openings.v1";
  let opening = [];
  const agCfg = CONFIG.assist.variety.acrossGames;
  function saveOpening() {
    if (!agCfg || !opening.length) return;
    const past = store.getJSON(OPENINGS_KEY, []);
    past.unshift(opening);
    store.setJSON(OPENINGS_KEY, past.slice(0, agCfg.games ?? 3));
    opening = [];
  }

  // The bay, where the next piece was: the Extra Shiny Pieces, in every mode (src/shelfui.js;
  // it keeps up every frame: updateHUD)
  const shelf = bindShelf({ state, root: $("shelf"), always: true });
  // (and in the pause menu, their order, to change)
  const bayQueue = bindShelfQueue({ state, root: $("bayQueue") });

  on(state, (type, d) => {
    switch (type) {
      case "start":
        setStarts = 0;
        gallery.clear();
        // (the player's favourite piece comes a little more often: src/settings.js)
        if (state.pieceSel) state.pieceSel.favourite = favourite(favouritePool(state.shapes));
        if (agCfg) {
          state.pieceSel.openingMemory = new Set(store.getJSON(OPENINGS_KEY, []).flat());
          opening = [];
        }
        break;
      case "spawn":
        // (the tutorial: no names, its page's words go there; nothing counts as seen, and no
        // intro screens: its pages say what each powerup does)
        if (state.tutorial) { nameLayer.clear(); break; }
        // (the turbo zen behind the home screen, or filling in for it: nobody's playing, so
        // nothing counts as seen, and there are no names to read)
        if (state.backdrop) { if (CONFIG.modes[state.mode]?.names !== false) nameLayer.setShape(d.shape, !!CONFIG.modes[state.mode]?.flashNames, d.label); break; }
        if (agCfg && opening && !d.shape.powerup && state.pieceSel.dropIndex <= (agCfg.drops ?? 20) + 1) {
          opening.push(d.shape.id);
          if (opening.length >= (agCfg.drops ?? 20)) saveOpening();
        }
        if (state.level6Recent !== savedRecent) { savedRecent = state.level6Recent; store.setJSON(LEVEL6_RECENT_KEY, savedRecent); }
        noteSeen(d.shape);
        nameLayer.setShape(d.shape, !!CONFIG.modes[state.mode]?.flashNames, d.label); // (turbo zen: no time to slide)
        renderer.drawNext(d.next, true, nextLook(d.next));
        if (!skipIntros() && d.isNew) showIntro(d.shape);
        break;
      case "next":
        renderer.drawNext(d.next, true, nextLook(d.next));
        break;
      case "lock":
        // (every piece that lands, for the pause menu's gallery: not the home screen's turbo zen's)
        if (!state.backdrop) gallery.add(d.shape);
        break;
      case "dramaticPause": // (turbo zen: in place of the piece's name while the board glows)
        if (d.on) nameLayer.setName("(dramatic pause)", "", "", !!CONFIG.modes[state.mode]?.flashNames);
        else if (d.shape) nameLayer.setShape(d.shape, !!CONFIG.modes[state.mode]?.flashNames); // (and then the one that waited)
        break;
      case "level6Unlocked":
        store.set(LEVEL6_KEY, "1");
        state.level6Remembered = true;
        break;
      case "gameOver":
        saveOpening();
        saveSeen();
        nameLayer.clear();
        renderer.drawNext(null);
        // let the last achievement toasts show before the panel covers them
        setTimeout(showGameOver, 350);
        break;
      case "reset":
        nameLayer.clear();
        renderer.drawNext(null);
        gallery.clear();
        break;
    }
  });

  /* ---------- HUD ---------- */

  let hudScore = null;
  function updateHUD() {
    if (state.score !== hudScore) { hudScore = state.score; scoreText.textContent = String(state.score); }
    shelf.refresh();
    if (devmode) updateDevPanel();
    pauseBtn.textContent = (state.running && !state.paused) ? "❚❚" : "▶";

    if (state.debug) {
      const z = getDifficultyZone(state);
      $("dbgMode").textContent = `${state.mode} · look ${CONFIG.render.cellStyle} (V) · edges ${CONFIG.render.enhanced.edgeStrength} (E)`;
      $("dbgZone").textContent = z.zone;
      $("dbgPieceDiff").textContent = state.active
        ? (state.active.shape.powerup ? `powerup tier ${state.active.shape.powerup.tier}` : String(state.active.shape.difficulty ?? 1))
        : "–";
      $("dbgBaseSpeed").textContent = `${state.dropMs} ms/row (level ${state.level})`;
      const ps = state.pieceSel?.powerup;
      $("dbgPowerup").textContent = state.powerups.length && ps
        ? `${(ps.lastChance * 100).toFixed(0)}% · cooldown ${ps.cooldown} · served ${ps.count} (P = next)`
        : "off";
    }
  }

  /* ---------- toasts ---------- */

  function iconCanvas(grid, cssPx, locked = false) {
    const icon = Array.isArray(grid) && grid.length ? grid : ICON_TROPHY;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const c = document.createElement("canvas");
    c.width = c.height = cssPx * dpr;
    c.style.width = c.style.height = `${cssPx}px`;
    c.className = "pixelIcon" + (locked ? " locked" : "");
    const ctx = c.getContext("2d");
    drawIcon(ctx, icon, 0, 0, cssPx * dpr);
    return c;
  }

  // Unlock toasts queue up so a big moment doesn't bury the board in them.
  const toastQueue = [];
  let toastsShowing = 0;

  function toast(def) {
    if (!CONFIG.achievements.enabled) return;
    // past the cap they still unlock (see the achievements page), just without a toast
    if (toastsShowing + toastQueue.length >= (CONFIG.achievements.maxToastsQueued ?? Infinity)) return;
    toastQueue.push(def);
    pumpToasts();
  }

  function pumpToasts() {
    while (toastsShowing < (CONFIG.achievements.maxToastsAtOnce ?? 2) && toastQueue.length) {
      showToast(toastQueue.shift());
    }
  }

  function showToast(def) {
    toastsShowing++;
    const el = document.createElement("div");
    el.className = "toast";
    el.appendChild(iconCanvas(def.icon, 36));
    const text = document.createElement("div");
    text.className = "toastText";
    text.innerHTML =
      `<div class="toastLabel">Achievement unlocked</div>` +
      `<div class="toastName">${escapeHtml(def.name)}</div>` +
      `<div class="toastDesc">${escapeHtml(def.description ?? "")}</div>`;
    el.appendChild(text);
    toastsEl.appendChild(el);
    requestAnimationFrame(() => el.classList.add("in"));
    setTimeout(() => {
      el.classList.remove("in");
      el.classList.add("out");
      setTimeout(() => {
        el.remove();
        toastsShowing--;
        pumpToasts();
      }, 400);
    }, CONFIG.achievements.toastMs);
  }

  /* ---------- achievements page ---------- */

  function renderAchievements() {
    const grid = $("achGrid");
    grid.innerHTML = "";
    const defs = achievements.defs;
    $("achSummary").textContent = `${achievements.unlockedCount()} of ${defs.length} unlocked`;

    for (const def of defs) {
      const unlocked = achievements.isUnlocked(def.id);
      const hidden = !unlocked && def.secret;
      const card = document.createElement("div");
      card.className = "achCard" + (unlocked ? " unlocked" : " locked");
      card.appendChild(iconCanvas(hidden ? ICON_SECRET : (def.icon ?? ICON_TROPHY), 36, !unlocked && !hidden));

      const txt = document.createElement("div");
      txt.className = "achText";
      const shown = achievements.display(def);
      const name = hidden ? "???" : shown.name;
      const desc = hidden ? "A secret achievement." : shown.description;
      let meta = "";
      if (unlocked) {
        const at = achievements.unlockedAt(def.id);
        meta = at ? `Unlocked ${new Date(at).toLocaleDateString()}` : "Unlocked";
      } else {
        const pr = achievements.progressOf(def);
        if (pr && !hidden) meta = `${pr.best ? "Best" : "Progress"}: ${Math.min(pr.value, pr.target)} / ${pr.target}`;
        if (def.mode && def.mode !== "any") meta += `${meta ? " · " : ""}${def.mode === "powerups" ? `${modeLabel("normal")} or ${modeLabel("god")}` : modeLabel(def.mode)} mode`;
      }
      txt.innerHTML =
        `<div class="achName">${escapeHtml(name)}</div>` +
        `<div class="achDesc">${escapeHtml(desc)}</div>` +
        (meta ? `<div class="achMeta">${escapeHtml(meta)}</div>` : "");
      card.appendChild(txt);
      grid.appendChild(card);
    }
  }

  /* ---------- powerup demos (How to play, intro, help) ---------- */

  let stopDemoLoop = null;
  function stopDemos() { stopDemoLoop?.(); stopDemoLoop = null; }
  function playDemos(demos) {
    stopDemos();
    const panelName = currentPanel;
    stopDemoLoop = runDemos(demos, () => currentPanel === panelName);
  }

  // Powerups that can turn up at all (not switched off), and the classes they make.
  const livePowerups = () => state.allPowerups.filter(p => isPowerupEnabled(p) && (p.frequency ?? 1) > 0 && !p.powerup.setOnly);
  const liveClasses = () => Object.keys(CLASS_INFO).filter(c => livePowerups().some(p => p.powerup.cls === c));
  const ofClass = (cls) => livePowerups().filter(p => p.powerup.cls === cls);

  // The gentlest powerup of a class, to show it off.
  const exampleOf = (cls) => ofClass(cls)
    .sort((a, b) => a.powerup.tier - b.powerup.tier || (b.powerup.help ?? 0) - (a.powerup.help ?? 0))[0];

  function demoCard(shape, { cell = 14, title = null, text = "" } = {}) {
    const row = document.createElement("div");
    row.className = "demoRow";
    const cvs = document.createElement("canvas");
    cvs.className = "demo";
    row.appendChild(cvs);
    const txt = document.createElement("div");
    txt.innerHTML = `<div class="demoName cls-${shape.powerup?.cls ?? "combo"}">${escapeHtml(title ?? shape.name)}</div>${text}`;
    row.appendChild(txt);
    return { row, demo: createDemo(cvs, shape, { cell }) };
  }

  // How to play: each powerup class (its demo, its name, what it does), and each mode (a little
  // game of it, what it is, and a button to go and play it)
  const HOWTO_MODES = [
    ["normal", "The full game: weird pieces, giants, and Shiny Pieces to help you out."],
    ["extreme", "The original. No Shiny Pieces. No mercy."],
    ["god", "Everything at once: the biggest pieces in the game, and Shiny Pieces from the start."],
    ["zen", "Endless play. It places each piece for you; take one over whenever you like."],
    ["turbo", "It plays itself, quickly, and never stops. Sit back and watch."],
  ];
  let howToBuilt = null;
  function startHowToDemos() {
    if (!howToBuilt) {
      howToBuilt = [];
      const box = $("howtoClasses");
      box.innerHTML = "";
      for (const type of liveClasses()) {
        const ex = exampleOf(type);
        if (!ex) continue;
        const info = CLASS_INFO[type];
        const card = demoCard(ex, { title: info.name, text: escapeHtml(info.text) });
        box.appendChild(card.row);
        howToBuilt.push(card.demo);
      }
      const modes = $("howtoModes");
      modes.innerHTML = "";
      HOWTO_MODES.forEach(([mode, text], i) => {
        if (!CONFIG.modes[mode] || CONFIG.modes[mode].hidden) return;
        const row = document.createElement("div");
        row.className = "demoRow modeRow";
        const cvs = document.createElement("canvas");
        cvs.className = "demo";
        row.appendChild(cvs);
        const txt = document.createElement("div");
        txt.innerHTML = `<div class="demoName">${escapeHtml(modeLabel(mode))}</div><div class="modeText">${escapeHtml(text)}</div>`;
        const go = document.createElement("button");
        go.className = "small";
        go.textContent = `\u25B6 Play ${modeLabel(mode)}`;
        go.addEventListener("click", () => home.play(mode, { burst: false }));
        txt.appendChild(go);
        row.appendChild(txt);
        modes.appendChild(row);
        howToBuilt.push(createModeDemo(cvs, mode, { shapes: state.allShapes, powerups: state.allPowerups.filter(p => isPowerupEnabled(p)), cell: 11, seed: i + 1 }));
      });
    }
    playDemos(howToBuilt);
  }

  // Intro screen for a powerup class the player hasn't seen yet this game,
  // shown with the piece that just turned up as the example.
  // (`next`: it's the next piece, not this one: introduced before it comes)
  // (the next piece: a glow in its colours, unless the mode gives no hints; and a powerup whose
  // class hasn't been introduced yet looks like any other piece until its intro)
  const nextLook = (next) => ({ glow: CONFIG.modes[state.mode]?.hints !== false, plain: !introduced(state, next) });

  function showIntro(shape) {
    state.paused = true;
    state.softDropping = false;
    const pu = shape.powerup;
    const info = CLASS_INFO[pu.cls];
    const inClass = state.powerups.filter(p => p.powerup.cls === pu.cls && !state.devPowerups?.disabled?.has(p.id)).length;
    void inClass;
    $("introKicker").textContent = "Shiny Piece!";
    $("introName").textContent = info.name;
    $("introName").className = `introName cls-${pu.cls}`;
    $("introPiece").textContent = shape.name;
    $("introClass").textContent = info.text;
    const cvs = $("introDemo");
    const demo = createDemo(cvs, shape, { cell: 22 });
    panels.intro.classList.remove("slideIn");
    void panels.intro.offsetWidth;
    panels.intro.classList.add("slideIn");
    showPanel("intro");
    playDemos([demo]);
  }

  // Pause-menu help: one card per powerup class met so far this game (not every piece),
  // with a demo of a piece from that class you've actually seen.
  function renderPowerupHelp() {
    const list = $("powerupList");
    list.innerHTML = "";
    const demos = [];
    const ps = state.pieceSel.powerup;
    const shown = [...ps.shown].map(id => state.idToShape.get(id)).filter(Boolean);
    for (const cls of Object.keys(CLASS_INFO)) {
      if (!ps.shownClasses.has(cls)) continue;
      const seen = shown.filter(s => s.powerup.cls === cls);
      const ex = seen[seen.length - 1] ?? exampleOf(cls);
      if (!ex) continue;
      const total = state.powerups.filter(p => p.powerup.cls === cls).length;
      const info = CLASS_INFO[cls];
      const text = `${escapeHtml(info.text)}<div class="demoEg">${seen.length} of ${total} found so far</div>`;
      const card = demoCard(ex, { cell: 12, title: info.name, text });
      list.appendChild(card.row);
      demos.push(card.demo);
    }
    if (!demos.length) list.textContent = "No Shiny Pieces yet this game.";
    playDemos(demos);
  }

  /* ---------- dev mode (?devmode=1) ---------- */

  const devPanel = $("devPanel");
  let devSetUp = false;
  function setupDevMode() {
    if (!devmode) return;
    $("devRow").hidden = false;
    if (devSetUp) { devPanel.hidden = false; $("devTools").hidden = false; document.body.classList.add("devmode"); return; }
    devSetUp = true;
    document.body.classList.add("devmode");
    devPanel.hidden = false;
    // on narrow screens the panel would cover the board, so it starts folded: tap to open
    if (window.innerWidth < 760) devPanel.classList.add("folded");
    devPanel.addEventListener("click", () => devPanel.classList.toggle("folded"));
    $("devTools").hidden = false;
    const sel = $("devNextPiece");
    const add = (label, items) => {
      const g = document.createElement("optgroup");
      g.label = label;
      for (const s of items) {
        const o = document.createElement("option");
        o.value = s.id;
        o.textContent = `${s.name} [${s.id}]`;
        g.appendChild(o);
      }
      sel.appendChild(g);
    };
    for (const type of liveClasses()) {
      add(`Shiny Pieces: ${CLASS_INFO[type].name}`, ofClass(type));
    }
    for (let d = 0; d <= 5; d++) add(`Difficulty ${d}`, state.allShapes.filter(s => s.difficulty === d));
    add("Level 6 (groups only)", state.allShapes.filter(s => s.difficulty === 6));
    $("btnDevNext").addEventListener("click", () => {
      const shape = state.idToShape.get(sel.value) ?? [...state.allShapes, ...state.allPowerups].find(s => s.id === sel.value);
      if (shape) setNextPiece(state, shape);
      $("devNextStatus").textContent = `next: ${shape?.name ?? "?"}`;
    });
    $("btnDevClear").addEventListener("click", () => {
      state.board = state.board.map(r => r.fill(null));
      state.instances.clear();
      markBoardDirty(state);
    });
    $("btnDevMessy").addEventListener("click", () => {
      const pool = state.allShapes;
      for (let y = 16; y < state.board.length; y++) for (let x = 0; x < state.board[0].length; x++) {
        if (Math.random() < 0.65) {
          const sh = pool[(Math.random() * pool.length) | 0];
          const paint = sh.cellPaints[0].flat().find(Boolean);
          state.board[y][x] = { paint, style: sh.style, pid: 1e9 + y * 100 + x };
        } else state.board[y][x] = null;
      }
      markBoardDirty(state);
    });
    $("btnDevUnlockAll").addEventListener("click", () => {
      introduceAllPowerups(state);
      $("devNextStatus").textContent = "all Shiny Piece classes unlocked";
    });

    // which powerups can turn up, and how often (remembered for this browser session)
    const dev = state.devPowerups;
    try {
      const saved = JSON.parse(sessionStorage.getItem("eztrix.dev") ?? "null");
      if (saved) {
        dev.disabled = new Set(saved.disabled ?? []);
        dev.rate = Number(saved.rate ?? 1);
        if (["auto", "on", "off"].includes(saved.level6)) state.devLevel6 = saved.level6;
        if (["auto", "on", "off"].includes(saved.endGame)) state.devEndGame = saved.endGame;
      }
    } catch { /* ignore */ }
    const saveDev = () => {
      try { sessionStorage.setItem("eztrix.dev", JSON.stringify({ disabled: [...dev.disabled], rate: dev.rate, level6: state.devLevel6, endGame: state.devEndGame })); } catch { /* ignore */ }
    };

    // level 6: force it on or off, or start a group as the next piece
    const l6 = $("devLevel6");
    l6.value = state.devLevel6;
    l6.addEventListener("change", () => {
      state.devLevel6 = l6.value;
      saveDev();
      // forced on mid-game: the first group comes soon, as after a real unlock
      const st = state.pieceSel?.level6;
      if (state.devLevel6 === "on" && st && !st.seen.size && st.firstDueAt == null) scheduleFirstGroup(state);
    });
    const eg = $("devEndGame");
    eg.value = state.devEndGame;
    eg.addEventListener("change", () => { state.devEndGame = eg.value; saveDev(); });
    const gsel = $("devGroup");
    for (const g of state.groups) {
      const o = document.createElement("option");
      o.value = g.id;
      o.textContent = g.name;
      gsel.appendChild(o);
    }
    if (!state.groups.length) gsel.appendChild(new Option("(no groups: pieces missing)", ""));
    $("btnDevGroup").addEventListener("click", () => {
      const g = state.groups.find(x => x.id === gsel.value);
      const first = g && state.pieceSel ? startGroup(state, g) : null;
      if (first) setNextPiece(state, first);
      $("devNextStatus").textContent = first ? `next: ${g.name} (${1 + state.pieceSel.level6.queue.length} pieces)` : "no group";
    });
    // zen: start a movement (or one way of it) next
    const zsel = $("devZenMovement"), choices = zenMovementChoices();
    choices.forEach((c, i) => zsel.appendChild(new Option(c.label, String(i))));
    $("btnDevZen").addEventListener("click", () => {
      const c = choices[Number(zsel.value)];
      if (!state.zen || !c) { $("devNextStatus").textContent = "zen modes only"; return; }
      zenStart(state, c.name, c.opts);
      $("devNextStatus").textContent = `next: ${c.label} (on a clean board, if it needs one)`;
    });
    const rate = $("devRate");
    const rateLabel = () => { $("devRateValue").textContent = dev.rate === 0 ? "off" : `×${dev.rate}`; };
    rate.value = String(dev.rate);
    rateLabel();
    rate.addEventListener("input", () => { dev.rate = Number(rate.value); rateLabel(); saveDev(); });
    const box = $("devEnabled");
    box.innerHTML = "";
    for (const type of liveClasses()) {
      const items = ofClass(type);
      if (!items.length) continue;
      const det = document.createElement("details");
      const sum = document.createElement("summary");
      const all = document.createElement("input");
      all.type = "checkbox";
      sum.appendChild(all);
      sum.appendChild(document.createTextNode(` ${CLASS_INFO[type].name} (${items.length})`));
      det.appendChild(sum);
      const boxes = [];
      for (const p of items) {
        const lab = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = !dev.disabled.has(p.id);
        cb.addEventListener("change", () => {
          if (cb.checked) dev.disabled.delete(p.id); else dev.disabled.add(p.id);
          syncAll(); saveDev();
        });
        boxes.push(cb);
        lab.appendChild(cb);
        lab.appendChild(document.createTextNode(` ${p.name} (help ${p.powerup.help})`));
        det.appendChild(lab);
      }
      const syncAll = () => {
        const on = boxes.filter(b => b.checked).length;
        all.checked = on === boxes.length;
        all.indeterminate = on > 0 && on < boxes.length;
      };
      all.addEventListener("click", (e) => e.stopPropagation());
      all.addEventListener("change", () => {
        items.forEach((p, i) => {
          boxes[i].checked = all.checked;
          if (all.checked) dev.disabled.delete(p.id); else dev.disabled.add(p.id);
        });
        syncAll(); saveDev();
      });
      syncAll();
      box.appendChild(det);
    }
  }

  let devLast = 0;
  function updateDevPanel() {
    const now = performance.now();
    if (now - devLast < 200) return;
    devLast = now;
    const ps = state.pieceSel?.powerup;
    const a = state.active?.shape;
    const stats = analyseBoard(state.board);
    const z = getDifficultyZone(state);
    const lines = [
      ["mode", `${state.mode}${state.running ? "" : " (not running)"}${state.paused ? " · paused" : ""}`],
      ["piece", a ? `${a.id} (${a.powerup ? `${a.powerup.type} t${a.powerup.tier}` : `d${a.difficulty}`})` : "–"],
      ["next", state.next ? state.next.id : "–"],
      ["level / speed", `${state.level} · ${state.dropMs} ms/row`],
      ["drops / rows", `${state.drops} · ${state.rowsDestroyed}`],
      ["danger", `${computeStackDanger01(state).toFixed(2)} · ${z.zone}`],
      ["stack / holes", `${stats.stackHeight} · ${stats.holes}`],
      ["shiny chance", ps && state.powerups.length ? `${(ps.lastChance * 100).toFixed(0)}% · cd ${ps.cooldown} · rate ×${state.devPowerups.rate}` : "off"],
      ["struggle", (state.pieceSel?.struggle ?? 0).toFixed(2)],
      ["usable shiny", ps?.lastUsable ?? "–"],
      ["first giant", state.pieceSel?.giantDueAt == null ? "none (easy)" : state.pieceSel.hadGiant ? "done" : `due at piece ${state.pieceSel.giantDueAt}`],
      ["difficulty", difficultyStatus(state)],
      ["classes now", ["destroyer", "gravity", "expander", "combo"].map(c => `${c.slice(0, 4)} ×${classWeight(state, c).toFixed(1)}`).join(" ")],
      ["class order", classOrder()?.join(" › ") ?? "usual"],
      ["level 6", level6Status(state)],
      ["end game", endGameStatus(state)],
      ["waves", waveStatus(state)],
      ["classes", ps ? (ps.classes.join(", ") || "none yet") : "–"],
      ["shiny seen", ps ? `${ps.shown.size}/${state.powerups.length} · ${state.devPowerups.disabled.size} disabled` : "–"],
      ["pieces on board", String(state.instances.size)],
      ["look", `${CONFIG.render.cellStyle} · edges ${CONFIG.render.enhanced.edgeStrength}`],
    ];
    devPanel.innerHTML = `<div class="devTitle">dev mode</div>` +
      lines.map(([k, v]) => `<div><span class="k">${k}</span> <span class="v">${escapeHtml(v)}</span></div>`).join("") +
      `<div class="devHint">pause menu: pick the next piece · backquote, then V E P keys</div>`;
  }

  /* ---------- buttons ---------- */

  // (from the home screen: it all bursts into pieces, a few words, and off it goes)
  // Developer mode (CONFIG.modes.dev): Extreme and God mode held down together for
  // CONFIG.devMode.holdMs, or a shift-click on God mode. (Once both are down, neither one's own
  // click counts until they're both let go.)
  const chordBtns = [$("btnGod"), $("btnExtreme")];
  const chord = { down: new Map(), timer: 0, swallow: false };
  const bothDown = () => chordBtns.every(b => [...chord.down.values()].includes(b));
  const chordOff = () => { clearTimeout(chord.timer); chord.timer = 0; for (const b of chordBtns) b.classList.remove("chord"); };
  for (const b of chordBtns) b.addEventListener("pointerdown", (e) => {
    chord.down.set(e.pointerId, b);
    if (!bothDown() || chord.timer) return;
    chord.swallow = true;
    for (const c of chordBtns) c.classList.add("chord");
    chord.timer = setTimeout(() => { const go = bothDown(); chordOff(); if (go) openDevTools(); }, CONFIG.devMode?.holdMs ?? 500);
  });
  const chordUp = (e) => {
    if (!chord.down.delete(e.pointerId)) return;
    if (!bothDown()) chordOff();
    if (!chord.down.size && chord.swallow) setTimeout(() => { if (!chord.down.size) chord.swallow = false; }, 400);
  };
  window.addEventListener("pointerup", chordUp, true);
  window.addEventListener("pointercancel", chordUp, true);
  for (const b of document.querySelectorAll(".modeBtn")) b.addEventListener("click", (e) => {
    if (chord.swallow) return;
    if (e.shiftKey && b === chordBtns[0]) { openDevTools(); return; }
    home.play(b.dataset.mode, { from: b });
  });
  // The developer tools switched on (both held down, or a shift-click on God mode), and their
  // page: a developer game (new things first), Turbo zen (on the menu no more), and the settings
  // (src/devtools.js)
  function openDevTools() {
    if (!devmode) { setDevTools(true); devmode = true; }
    setupDevMode();
    buildDevTools($("devToolsBody"), {
      onPlayDev: () => home.play("dev", { from: chordBtns[0] }),
      onPlayTurbo: (b) => home.play("turbo", { from: b }),
      onClose: () => {
        devmode = devUrl;
        if (!devmode) { $("devRow").hidden = true; devPanel.hidden = true; $("devTools").hidden = true; document.body.classList.remove("devmode"); }
        showPanel("menu");
      },
    }, state.allPowerups);
    panelBack = "menu";
    showPanel("devtools");
  }
  $("btnDevTools").addEventListener("click", () => openDevTools());
  $("btnHowTo").addEventListener("click", () => { panelBack = "menu"; showPanel("howto"); });
  $("btnAchievements").addEventListener("click", () => { panelBack = "menu"; showPanel("achievements"); });
  $("btnOptions").addEventListener("click", () => { panelBack = "menu"; showPanel("options"); });
  $("btnPauseOptions").addEventListener("click", () => { panelBack = "pause"; showPanel("options"); });
  $("btnResume").addEventListener("click", () => resumeGame());
  $("btnPauseX").addEventListener("click", () => resumeGame()); // (the pause menu's X: back to the game)
  $("btnQuit").addEventListener("click", () => goToMenu());
  $("btnPauseHowTo").addEventListener("click", () => { panelBack = "pause"; showPanel("howto"); });
  $("btnPowerupHelp").addEventListener("click", () => { panelBack = "pause"; showPanel("powerups"); });
  $("btnIntroContinue").addEventListener("click", () => resumeGame());
  /* ---------- paused: looking at the board ---------- */
  // Where the board stays in view (zen): "Look at the board", or a tap anywhere outside the menu,
  // puts the menu away (the overlay's "peek"). Tap a piece (or the falling one) for its card; tap
  // an empty spot, or Done, to bring the menu back. Pinch, double tap or the wheel to zoom in,
  // drag to look around.

  const boardCanvas = $("boardCanvas"), boardShell = $("boardShell"), pieceCard = $("pieceCard");
  const look = { zoom: 1, tx: 0, ty: 0, pointers: new Map(), pinch: null, start: null, moved: false, lastTap: 0, lastX: 0, lastY: 0, peeked: false };
  const looking = () => currentPanel === "pause" && !boardHidden();
  $("btnLookBoard").addEventListener("click", () => overlay.classList.add("peek"));
  $("btnLookDone").addEventListener("click", () => {
    resetLook();
    overlay.classList.remove("peek");
    $("btnResume").focus({ preventScroll: true });
  });

  function applyLook() {
    const W = boardShell.clientWidth, H = boardShell.clientHeight, z = look.zoom;
    // (never so far that the board leaves its frame)
    look.tx = Math.min(0, Math.max(W - W * z, look.tx));
    look.ty = Math.min(0, Math.max(H - H * z, look.ty));
    boardCanvas.style.transformOrigin = "0 0";
    boardCanvas.style.transform = z === 1 ? "" : `translate(${look.tx}px, ${look.ty}px) scale(${z})`;
    $("nameLayer").style.visibility = z === 1 ? "" : "hidden";
    overlay.classList.toggle("zoomed", z > 1);
  }
  // zoom to z, keeping the point (cx, cy) on the screen where it is
  function zoomAt(z, cx, cy) {
    const r = boardShell.getBoundingClientRect();
    const px = cx - r.left, py = cy - r.top, z0 = look.zoom;
    const z1 = Math.max(1, Math.min(CONFIG.pause.maxZoom ?? 5, z));
    look.tx = px - (px - look.tx) * (z1 / z0);
    look.ty = py - (py - look.ty) * (z1 / z0);
    look.zoom = z1;
    applyLook();
  }
  function resetLook() {
    look.zoom = 1; look.tx = 0; look.ty = 0;
    look.pointers.clear(); look.pinch = null; look.start = null;
    applyLook();
    hideCard();
    look.peeked = false;
  }

  function cellAt(cx, cy) {
    const r = boardCanvas.getBoundingClientRect(); // (zoom and all)
    const { cols, rows } = CONFIG.board;
    const x = Math.floor((cx - r.left) / r.width * cols), y = Math.floor((cy - r.top) / r.height * rows);
    return x >= 0 && x < cols && y >= 0 && y < rows ? { x, y } : null;
  }
  function pieceAt({ x, y }) {
    const a = state.active;
    if (a) {
      const mat = a.shape.rotations[a.rotIdx], i = x - a.x, j = y - a.y;
      if (j >= 0 && j < mat.length && i >= 0 && i < mat[0].length && mat[j][i]) return { shape: a.shape, rot: a.rotIdx };
    }
    const c = state.board[y]?.[x];
    const inst = c && state.instances.get(c.pid);
    return inst?.shape ? { shape: inst.shape, rot: inst.rotIdx ?? 0 } : null;
  }

  // The card: the piece as it landed, its name, how rare it is, and what a powerup does. (The menu
  // goes while it's up, and comes back after it unless the board was being looked at already.)
  function showCard(shape, rot, at) {
    const line = (cls, text) => { const d = document.createElement("div"); d.className = cls; d.textContent = text; return d; };
    if (pieceCard.hidden) look.peeked = overlay.classList.contains("peek");
    pieceCard.innerHTML = "";
    const mat = shape.rotations[rot] ?? shape.rotations[0];
    const maxW = boardShell.clientWidth - 64, maxH = boardShell.clientHeight * 0.3;
    const cell = Math.max(3, Math.min(28, Math.floor(Math.min(maxW / mat[0].length, maxH / mat.length))));
    const pic = line("pcPic", "");
    pic.appendChild(makeShapePreviewCanvas(shape, cell, 4, rot));
    const r = rarity(state, shape);
    pieceCard.append(pic, line("pcName", shape.name), line("pcRarity", `rarity level: ${r.words}`));
    if (r.set) pieceCard.append(line("pcNote", `part of a set: ${r.set}`));
    if (r.after?.length) pieceCard.append(line("pcNote", `it comes after ${r.after.join(", or ")}`));
    const pu = shape.powerup;
    if (pu) {
      const parts = (pu.parts ?? []).map(p => CLASS_INFO[p.type]?.name).filter(Boolean);
      const info = CLASS_INFO[pu.cls] ?? CLASS_INFO[pu.type];
      pieceCard.append(line(`pcPower cls-${pu.cls ?? pu.type}`, info?.name + (parts.length ? `: ${parts.join(" + ")}` : "")));
      pieceCard.append(line("pcNote", pu.intro || info?.text || ""));
    }
    pieceCard.hidden = false;
    pieceCard.classList.toggle("top", at.y >= CONFIG.board.rows * 0.55); // (the other end of the board from it)
    overlay.classList.add("peek");
  }
  function hideCard() {
    if (pieceCard.hidden) return;
    pieceCard.hidden = true;
    if (!look.peeked) overlay.classList.remove("peek");
  }
  pieceCard.addEventListener("click", hideCard);

  function tapAt(cx, cy) {
    const now = performance.now();
    // a double tap zooms in there, or back out
    if (now - look.lastTap < 320 && Math.hypot(cx - look.lastX, cy - look.lastY) < 30) {
      look.lastTap = 0;
      zoomAt(look.zoom > 1.3 ? 1 : 2.5, cx, cy);
      return;
    }
    look.lastTap = now; look.lastX = cx; look.lastY = cy;
    const at = cellAt(cx, cy), hit = at && pieceAt(at);
    if (hit) showCard(hit.shape, hit.rot, at);
    else if (!pieceCard.hidden) hideCard();
    else overlay.classList.toggle("peek"); // (an empty spot: the panel goes, or comes back)
  }

  overlay.addEventListener("pointerdown", (e) => {
    if (!looking() || e.target.closest?.(".msg, .pieceCard, .pauseLook")) return;
    e.preventDefault();
    look.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { overlay.setPointerCapture(e.pointerId); } catch { /* (not everywhere) */ }
    if (look.pointers.size === 2) {
      const [a, b] = [...look.pointers.values()];
      look.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: look.zoom };
      look.moved = true;
    } else if (look.pointers.size === 1) {
      look.start = { x: e.clientX, y: e.clientY, tx: look.tx, ty: look.ty };
      look.moved = false;
    }
  });
  overlay.addEventListener("pointermove", (e) => {
    if (!looking() || !look.pointers.has(e.pointerId)) return;
    look.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (look.pinch && look.pointers.size >= 2) {
      const [a, b] = [...look.pointers.values()];
      zoomAt(look.pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, look.pinch.d), (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    const s = look.start;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!look.moved && Math.hypot(dx, dy) > 8) look.moved = true;
    if (look.moved && look.zoom > 1) { look.tx = s.tx + dx; look.ty = s.ty + dy; applyLook(); }
  });
  const lift = (e) => {
    if (!look.pointers.has(e.pointerId)) return;
    look.pointers.delete(e.pointerId);
    if (look.pointers.size < 2) look.pinch = null;
    if (look.pointers.size === 1) { const [p] = look.pointers.values(); look.start = { x: p.x, y: p.y, tx: look.tx, ty: look.ty }; }
    if (!look.pointers.size) {
      if (!look.moved && e.type === "pointerup" && looking()) tapAt(e.clientX, e.clientY);
      look.start = null;
    }
  };
  overlay.addEventListener("pointerup", lift);
  overlay.addEventListener("pointercancel", lift);
  overlay.addEventListener("wheel", (e) => {
    if (!looking() || e.target.closest?.(".msg")) return; // (over the menu, it's the menu's)
    e.preventDefault();
    zoomAt(look.zoom * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  }, { passive: false });
  for (const b of document.querySelectorAll(".skipIntros")) {
    b.checked = skipIntros();
    b.addEventListener("change", () => setSkipIntros(b.checked));
  }
  setupDevMode();

  // No text selection / long-press menus (CSS covers most browsers; this catches the rest).
  const editable = (t) => t instanceof Element && t.closest("input, textarea, select");
  document.addEventListener("selectstart", (e) => { if (!editable(e.target)) e.preventDefault(); });
  document.addEventListener("contextmenu", (e) => { if (!editable(e.target)) e.preventDefault(); });
  $("btnAgain").addEventListener("click", () => startGame(state.mode));
  $("btnGameOverMenu").addEventListener("click", () => goToMenu());
  $("btnResetAch").addEventListener("click", () => {
    if (window.confirm("Reset all achievements and lifetime stats in this browser?")) {
      achievements.resetAll();
      renderAchievements();
    }
  });
  for (const b of document.querySelectorAll("[data-back]")) {
    b.addEventListener("click", () => showPanel(panelBack));
  }
  // How to play: a tap anywhere outside it goes back too, and from the home screen it can start
  // the tutorial (from a game's pause menu there's a game going on, so that button isn't there)
  document.addEventListener("click", (e) => {
    if (currentPanel !== "howto" || e.target.closest?.("#panelHowTo, button, a, input, label")) return;
    showPanel(panelBack);
  });
  $("btnHowDemo").addEventListener("click", (e) => home.play("tutorial", { from: e.currentTarget }));

  pauseBtn.addEventListener("click", (e) => {
    e.preventDefault();
    togglePause();
  });
  $("floatPause").addEventListener("click", (e) => {
    e.preventDefault();
    togglePause();
  });
  // (the next speed along, round again after the fastest)
  $("btnSpeed").addEventListener("click", () => {
    const list = CONFIG.modes[state.mode]?.speeds;
    if (!list) return;
    state.speed = list[(list.indexOf(state.speed ?? 1) + 1) % list.length];
    store.set(speedKey(state.mode), String(state.speed));
    $("btnSpeed").textContent = speedText();
  });
  // (a fresh run on the new board: the old one's pieces don't fit it)
  $("btnWholeWindow").addEventListener("click", () => {
    setOption("turboWhole", !wholeWindow);
    startGame("turbo");
  });

  // (a mode can say otherwise: turbo zen carries on until someone stops it)
  document.addEventListener("visibilitychange", () => {
    if (!(CONFIG.modes[state.mode]?.pauseWhenHidden ?? CONFIG.pause.pauseWhenHidden)) return;
    if (document.hidden && state.running && !state.paused) pauseGame();
  });

  /* ---------- keyboard ---------- */

  // Debug: force the next piece to be a powerup (cycles through them all).
  let debugPowerupIdx = 0;
  let spacePaused = false; // (a Space pressed to pause, not let go yet)
  const EDGE_STEPS = [0, 0.15, 0.3, 0.5, 1];

  window.addEventListener("keydown", (e) => {
    // (the backquote key, by Escape: D moves the piece)
    if (e.code === "Backquote" && !e.repeat) {
      state.debug = !state.debug;
      debugPanel.style.display = state.debug ? "block" : "none";
      return;
    }
    if (state.debug && e.code === "KeyV") {
      CONFIG.render.cellStyle = CONFIG.render.cellStyle === "classic" ? "enhanced" : "classic";
      return;
    }
    if (state.debug && e.code === "KeyE") {
      const i = EDGE_STEPS.indexOf(CONFIG.render.enhanced.edgeStrength);
      CONFIG.render.enhanced.edgeStrength = EDGE_STEPS[(i + 1) % EDGE_STEPS.length];
      return;
    }
    if (state.debug && e.code === "KeyP") {
      const list = state.allPowerups;
      if (list.length && state.running) setNextPiece(state, list[debugPowerupIdx++ % list.length]);
      return;
    }

    if (e.code === "Escape") {
      if (currentPanel === "howto" || currentPanel === "achievements" || currentPanel === "powerups" || currentPanel === "devtools" || currentPanel === "options") showPanel(panelBack);
      else if (currentPanel === "intro") resumeGame();
      else togglePause();
      return;
    }
    // (Shift: the next Extra Shiny Piece, while playing: src/shelfui.js)
    if (e.key === "Shift") {
      if (state.running && !state.gameOver && !state.paused && !currentPanel && !e.repeat) { markInput(state, "keyboard"); shelf.use(); }
      return;
    }
    // (Space: pauses, while playing. Anywhere else it's Space as usual, pressing the button with
    // the focus: in the pause menu, Resume, or one of the swaps. But not on the game over page: a
    // Space meant for the last piece doesn't start the next game)
    if (e.code === "Space") {
      if (state.running && !state.gameOver && !state.paused && !currentPanel) {
        e.preventDefault();
        if (!e.repeat) { spacePaused = true; togglePause(); }
      } else if (currentPanel === "gameover" || e.repeat) e.preventDefault();
      return;
    }
    if (e.code === "Enter") {
      if (currentPanel === "menu") { e.preventDefault(); home.play(lastMode); }
      else if (currentPanel === "gameover") { e.preventDefault(); startGame(state.mode); }
      else if (currentPanel === "intro") { e.preventDefault(); resumeGame(); }
      return;
    }
    // (paused, the arrows and A / D go through the pieces so far: src/pausemenu.js. Not in the
    // developer tools' lists and sliders, which have their own uses for them. And on the game over
    // page, through the pieces there)
    if (pauseMenuUp() && !editable(e.target) && gallery.key(e)) { e.preventDefault(); return; }
    if (currentPanel === "gameover" && overGallery.key(e)) { e.preventDefault(); return; }

    if (!state.running || state.gameOver || state.paused) return;

    markInput(state, "keyboard");

    // (the arrow keys, or W A S D)
    switch (e.code) {
      case "ArrowLeft": case "KeyA":
        e.preventDefault();
        downTaps.n = 0;
        tryMove(state, -1, 0);
        break;
      case "ArrowRight": case "KeyD":
        e.preventDefault();
        downTaps.n = 0;
        tryMove(state, +1, 0);
        break;
      case "ArrowUp": case "KeyW":
        e.preventDefault();
        tryRotate(state);
        break;
      case "ArrowDown": case "KeyS":
        e.preventDefault();
        if (!e.repeat && isMultiTap(CONFIG.timing.multiPressMs)) { teleportDown(); break; }
        state.softDropping = true;
        break;
    }
  });

  // Double tap / double press down (CONFIG.timing.multiTaps): drops the piece straight to where
  // it will land. (The first tap moves it down as usual; a move to the side starts the count
  // again. `ms`: how close together they count, the key's own for the keyboard.) The taps must
  // all be on the one piece, and one that's been on the board long enough to have been seen
  // (CONFIG.timing.unseenMs): never the next one, just come in, when they were meant for the
  // one that's just landed.
  const downTaps = { n: 0, at: 0, piece: null };
  function isMultiTap(ms = CONFIG.timing.multiTapMs ?? 300) {
    const now = performance.now(), t = downTaps, a = state.active;
    if (!a || a.seenAt == null || now - a.seenAt < (CONFIG.timing.unseenMs ?? 0)) { t.n = 0; return false; }
    t.n = now - t.at < ms && t.piece === a ? t.n + 1 : 1;
    t.at = now;
    t.piece = a;
    if (t.n < (CONFIG.timing.multiTaps ?? 2)) return false;
    t.n = 0;
    return true;
  }
  // (when the falling piece first showed on the board: it comes in from above it)
  function noteShown(now) {
    const a = state.active;
    if (!a || a.seenAt != null) return;
    const mat = a.shape.rotations[a.rotIdx];
    if (mat.some((row, j) => a.y + j >= 0 && row.some(Boolean))) a.seenAt = now;
  }
  function teleportDown() {
    if (!canAct()) return;
    state.softDropping = false;
    stopRepeat();
    hardDropAndLock(state, { lastChance: true });
  }

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowDown" || e.code === "KeyS") state.softDropping = false;
    // (the Space that paused doesn't go on to press Resume as it's let go)
    if (e.code === "Space" && spacePaused) { spacePaused = false; e.preventDefault(); }
  });

  /* ---------- touch / mouse zones ---------- */

  function clearGlows() {
    boardShellEl.classList.remove("glow-left", "glow-right", "glow-top", "glow-bottom");
  }

  function applyGlow(zone) {
    clearGlows();
    if (zone) boardShellEl.classList.add(`glow-${zone}`);
  }

  function getZone(x, y) {
    const r = boardShellEl.getBoundingClientRect();

    const relX = x - r.left;
    const relY = y - r.top;

    if (relX < 0) return "left";
    if (relX > r.width) return "right";
    if (relY < 0) return "top";
    if (relY > r.height) return "bottom";

    const topBand = r.height * 0.22;
    const bottomBand = r.height * 0.28;
    const bottomCenterWidthFrac = 0.50;

    if (relY <= topBand) return "top";

    if (relY >= r.height - bottomBand) {
      const leftBound = r.width * (0.5 - bottomCenterWidthFrac / 2);
      const rightBound = r.width * (0.5 + bottomCenterWidthFrac / 2);

      if (relX >= leftBound && relX <= rightBound) return "bottom";
      return (relX < r.width * 0.5) ? "left" : "right";
    }

    return (relX <= r.width * 0.5) ? "left" : "right";
  }

  function canAct() {
    return state.running && !state.gameOver && !state.paused && state.active;
  }

  function doAction(zone) {
    if (!canAct()) return;
    markInput(state, "touch");

    if (zone === "left") { tryMove(state, -1, 0); }
    else if (zone === "right") { tryMove(state, +1, 0); }
    else if (zone === "top") { tryRotate(state); }
    else if (zone === "bottom") {
      const moved = tryMove(state, 0, 1);
      if (!moved) beginLockIfNeeded(state);
    }
  }

  function stopRepeat() {
    if (state.tapRepeatTimer) clearTimeout(state.tapRepeatTimer);
    if (state.tapRepeatInterval) clearInterval(state.tapRepeatInterval);
    state.tapRepeatTimer = null;
    state.tapRepeatInterval = null;
  }

  function startRepeat(zone) {
    doAction(zone);
    state.tapRepeatTimer = setTimeout(() => {
      state.tapRepeatInterval = setInterval(() => doAction(zone), CONFIG.timing.tapRepeatEveryMs);
    }, CONFIG.timing.tapRepeatStartMs);
  }

  document.body.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary) return;
    // Menus, buttons and scrolling panels handle their own input.
    if (overlayShowing() || e.target.closest?.("button, .overlay, .toast, .hudLogo")) return;
    e.preventDefault();

    const zone = getZone(e.clientX, e.clientY);
    state.touch.zone = zone;

    if (zone === "bottom" && isMultiTap()) {
      applyGlow(zone);
      teleportDown();
      return;
    }
    if (zone === "left" || zone === "right") downTaps.n = 0;
    if (zone) {
      applyGlow(zone);
      stopRepeat();
      startRepeat(zone);
    }
  });

  document.body.addEventListener("pointerup", (e) => {
    if (!e.isPrimary) return;
    stopRepeat();
    clearGlows();
  });

  document.body.addEventListener("pointercancel", (e) => {
    if (!e.isPrimary) return;
    stopRepeat();
    clearGlows();
  });

  /* ---------- the tutorial (src/tutorialui.js: its bar, the finger and the keys) ---------- */

  bindTutorial({ state, togglePause, resumeGame, goToMenu, play: (mode, opts) => home.play(mode, opts) });

  /* ---------- boot ---------- */

  // The page opens on the loading screen alone (src/loading.js, body.booting). The home screen
  // comes up behind it, and once the board behind the menu has had its quick start and the logo's
  // font is in (or it has waited long enough), the loading screen finishes and fades away.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      showPanel("menu");
      const t0 = performance.now();
      let fontIn = !document.fonts?.load;
      document.fonts?.load?.("16px PressStart2P").then(() => { fontIn = true; }, () => { fontIn = true; });
      const reveal = () => {
        if ((fontIn && !home.warming()) || performance.now() - t0 > (CONFIG.home.bootMaxMs ?? 2500)) {
          // (the loading screen fills its bar the rest of the way, then goes: src/loading.js)
          const show = () => document.body.classList.remove("booting");
          if (window.__loading) window.__loading.done(show); else show();
        } else requestAnimationFrame(reveal);
      };
      requestAnimationFrame(reveal);
    });
  });

  // The falling piece's name fades while the piece is among the stack under the words: the
  // piece in the rows they cover, and something already landed in those rows too. (Just
  // falling past empty rows, it's left as it is.)
  function fadeName() {
    const a = state.active, r = a && state.running && !state.backdrop ? nameLayer.rows(CONFIG.board.rows) : null;
    let busy = false;
    if (r) {
      const [top, bottom] = r, mat = getActiveMatrix(state);
      const inRows = (y) => y >= top && y <= bottom;
      const piece = mat.some((row, j) => inRows(a.y + j) && row.some(Boolean));
      busy = piece && state.board.some((row, y) => inRows(y) && row.some(Boolean));
    }
    nameLayer.setBusy(busy);
  }

  return {
    frame(now = performance.now()) { noteShown(now); updateHUD(); fadeName(); home.frame(now); sparkles.frame(now); },
    home: () => home,
    liveState: () => home.liveState(),
    toast,
    showPanel,
    startGame,
    nameLayer,
  };
}
