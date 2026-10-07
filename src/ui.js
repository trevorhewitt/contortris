// ============================================================
// UI — menus, How to play, achievements page, toasts, HUD, input
// ============================================================

import { CONFIG } from "../config.js";
import { escapeHtml, store } from "./util.js";
import { getDifficultyZone } from "./selection.js";
import {
  on, startRun, resetGame, tryMove, tryRotate, beginLockIfNeeded, markInput, setNextPiece, markBoardDirty, isPowerupEnabled, hardDropAndLock,
} from "./game.js";
import { makeShapePreviewCanvas, drawIcon } from "./render.js";
import { createDemo, runDemos } from "./demo.js";
import { CLASS_INFO, analyseBoard } from "./powerups.js";
import { introduceAllPowerups, computeStackDanger01 } from "./selection.js";

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
  let currentEl = null;

  function clear() {
    if (currentEl) {
      currentEl.remove();
      currentEl = null;
    }
    nameLayerEl.innerHTML = "";
  }

  // `effect`: optional line shown under the name (powerups).
  function setName(name, effect = "") {
    if (!name) {
      clear();
      return;
    }

    const nextEl = document.createElement("div");
    nextEl.className = "nameText enterFromRight" + (effect ? " powerup" : "");

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

  function setShape(shape) {
    if (!shape) { clear(); return; }
    setName(shape.name, shape.powerup?.description ?? "");
  }

  return { setName, setShape, clear };
}

// ============================================================
// Best scores + preferences (saved in this browser)
// ============================================================

const bestScores = {
  key: (mode) => `extris.best.${mode}`,
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
  const m = store.get("extris.mode", CONFIG.defaultMode);
  if (m === "hard") return "extreme";
  return CONFIG.modes[m] ? m : CONFIG.defaultMode;
}

// ============================================================
// bindUI
// ============================================================

export function bindUI({ state, renderer, sound, achievements }) {
  const $ = (id) => document.getElementById(id);

  const scoreText = $("scoreText");
  const linesText = $("linesText");
  const overlay = $("overlay");
  const toastsEl = $("toasts");
  const pauseBtn = $("pauseBtn");
  const debugPanel = $("debugPanel");
  const boardShellEl = $("boardShell");
  const nameLayer = createNameLayer($("nameLayer"));

  const panels = {
    loading: $("panelLoading"),
    menu: $("panelMenu"),
    howto: $("panelHowTo"),
    achievements: $("panelAchievements"),
    pause: $("panelPause"),
    gameover: $("panelGameOver"),
    intro: $("panelIntro"),
    powerups: $("panelPowerups"),
  };
  const devmode = new URLSearchParams(location.search).get("devmode") === "1";
  const SKIP_KEY = "extris.skipIntros";
  const skipIntros = () => { try { return sessionStorage.getItem(SKIP_KEY) === "1"; } catch { return false; } };
  const setSkipIntros = (on) => {
    try { sessionStorage.setItem(SKIP_KEY, on ? "1" : "0"); } catch { /* ignore */ }
    for (const b of document.querySelectorAll(".skipIntros")) b.checked = on;
  };

  let lastMode = loadLastMode();
  let newBest = false;
  let currentPanel = "loading";
  let panelBack = "menu"; // where "Back" goes from How to play / Achievements

  const modeLabel = (mode) => CONFIG.modes[mode]?.label ?? mode;

  /* ---------- panels ---------- */

  function showPanel(name) {
    currentPanel = name;
    overlay.classList.toggle("show", !!name);
    overlay.classList.toggle("intro", name === "intro"); // slides over the board, no fade
    for (const [key, el] of Object.entries(panels)) el.hidden = key !== name;
    if (name === "menu") renderMenu();
    if (name === "achievements") renderAchievements();
    stopDemos();
    if (name === "howto") startHowToDemos();
    if (name === "powerups") renderPowerupHelp();
    if (name === "pause") $("btnPowerupHelp").hidden = !state.pieceSel?.powerup.shown.size;
    if (name) {
      const scroller = panels[name];
      if (scroller) scroller.scrollTop = 0;
      // focus the main button for keyboard players
      panels[name]?.querySelector("button")?.focus({ preventScroll: true });
    }
  }

  const overlayShowing = () => !!currentPanel;

  function renderMenu() {
    $("btnEasy").classList.toggle("secondary", lastMode !== "easy");
    $("btnNormal").classList.toggle("secondary", lastMode !== "normal");
    $("btnExtreme").classList.toggle("secondary", lastMode !== "extreme");
    $("bestLine").textContent = Object.keys(CONFIG.modes)
      .map(m => `${modeLabel(m)} best: ${bestScores.get(m)}`)
      .join(" · ");
    $("achCount").textContent = `${achievements.unlockedCount()}/${achievements.defs.length}`;
    syncSoundButtons();
  }

  function syncSoundButtons() {
    for (const b of document.querySelectorAll(".soundToggle")) {
      b.textContent = `Sound: ${sound.isEnabled() ? "on" : "off"}`;
    }
  }

  /* ---------- game flow ---------- */

  function startGame(mode = lastMode) {
    sound.unlock();
    markInput(state, "touch");
    lastMode = CONFIG.modes[mode] ? mode : CONFIG.defaultMode;
    store.set("extris.mode", lastMode);
    newBest = false;
    startRun(state, lastMode);
    showPanel(null);
  }

  function resumeGame() {
    sound.unlock();
    markInput(state, "touch");
    if (state.gameOver) return;
    state.paused = false;
    showPanel(null);
  }

  function pauseGame() {
    if (state.gameOver || !state.running) return;
    state.paused = true;
    state.softDropping = false;
    $("pauseMode").textContent = `${modeLabel(state.mode)} mode`;
    showPanel("pause");
  }

  function togglePause() {
    if (!state.running || state.gameOver) return;
    if (state.paused) resumeGame();
    else pauseGame();
  }

  function goToMenu() {
    resetGame(state);
    showPanel("menu");
  }

  function showGameOver() {
    newBest = bestScores.submit(state.mode, state.score);
    const killer = state.gameOverInfo.shape;
    const killerName = state.gameOverInfo.pieceName || "Unknown";
    const unlocked = achievements.unlockedThisGame;

    $("gameOverStats").innerHTML =
      `${escapeHtml(modeLabel(state.mode))} mode<br>` +
      `Final score: ${state.score}${newBest ? " — new best!" : ""}<br>` +
      `Rows destroyed: ${state.rowsDestroyed}<br>` +
      `Blocks destroyed: ${state.blocksDestroyed}<br>` +
      `The piece that killed you: ${escapeHtml(killerName)}`;

    const pieceWrap = $("gameOverPiece");
    pieceWrap.innerHTML = "";
    const cvs = makeShapePreviewCanvas(killer);
    if (cvs) pieceWrap.appendChild(cvs);

    $("gameOverAch").textContent = unlocked.length
      ? `${unlocked.length} achievement${unlocked.length > 1 ? "s" : ""} unlocked this game!`
      : "";
    showPanel("gameover");
  }

  /* ---------- game events ---------- */

  // Remember which pieces opened the last few games, so the next opening is different
  // (CONFIG.assist.variety.acrossGames).
  const OPENINGS_KEY = "extris.openings.v1";
  let opening = [];
  const agCfg = CONFIG.assist.variety.acrossGames;
  function saveOpening() {
    if (!agCfg || !opening.length) return;
    const past = store.getJSON(OPENINGS_KEY, []);
    past.unshift(opening);
    store.setJSON(OPENINGS_KEY, past.slice(0, agCfg.games ?? 3));
    opening = [];
  }

  on(state, (type, d) => {
    switch (type) {
      case "start":
        if (agCfg) {
          state.pieceSel.openingMemory = new Set(store.getJSON(OPENINGS_KEY, []).flat());
          opening = [];
        }
        break;
      case "spawn":
        if (agCfg && opening && !d.shape.powerup && state.pieceSel.dropIndex <= (agCfg.drops ?? 20) + 1) {
          opening.push(d.shape.id);
          if (opening.length >= (agCfg.drops ?? 20)) saveOpening();
        }
        nameLayer.setShape(d.shape);
        renderer.drawNextSilhouette(d.next);
        if (d.shape.powerup) sound.play("powerupSpawn");
        if (d.isNew && !skipIntros()) showIntro(d.shape);
        break;
      case "next":
        renderer.drawNextSilhouette(d.next);
        break;
      case "lock":
        sound.play("lock");
        break;
      case "rowsDestroyed":
        if (d.source === "clear") sound.play("clear", d.count);
        break;
      case "levelUp":
        sound.play("levelUp");
        break;
      case "powerupCharge":
        sound.play("charge", CONFIG.fx.powerup.chargeMs);
        break;
      case "powerupFire":
        sound.play(d.type);
        break;
      case "gameOver":
        saveOpening();
        nameLayer.clear();
        renderer.drawNextSilhouette(null);
        sound.play("gameOver");
        // let the last achievement toasts show before the panel covers them
        setTimeout(showGameOver, 350);
        break;
      case "reset":
        nameLayer.clear();
        renderer.drawNextSilhouette(null);
        break;
    }
  });

  /* ---------- HUD ---------- */

  let hudScore = null, hudBlocks = null;
  function updateHUD() {
    if (state.score !== hudScore) { hudScore = state.score; scoreText.textContent = String(state.score); }
    const rb = String(state.blocksDestroyed);
    if (rb !== hudBlocks) { hudBlocks = rb; linesText.textContent = rb; }
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
    sound.play("achievement");
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
        if (def.mode && def.mode !== "any") meta += `${meta ? " · " : ""}${def.mode === "powerups" ? "Easy or Normal" : modeLabel(def.mode)} mode`;
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
  const livePowerups = () => state.allPowerups.filter(p => isPowerupEnabled(p) && (p.frequency ?? 1) > 0);
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
    txt.innerHTML = `<div class="demoName">${escapeHtml(title ?? shape.name)}</div>${text}`;
    row.appendChild(txt);
    return { row, demo: createDemo(cvs, shape, { cell }) };
  }

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
        const card = demoCard(ex, { title: info.name, text: `${escapeHtml(info.text)}<div class="demoEg">e.g. ${escapeHtml(ex.name)}</div>` });
        box.appendChild(card.row);
        howToBuilt.push(card.demo);
      }
    }
    playDemos(howToBuilt);
  }

  // Intro screen for a powerup class the player hasn't seen yet this game,
  // shown with the piece that just turned up as the example.
  function showIntro(shape) {
    state.paused = true;
    state.softDropping = false;
    const pu = shape.powerup;
    const info = CLASS_INFO[pu.cls];
    const inClass = state.powerups.filter(p => p.powerup.cls === pu.cls && !state.devPowerups?.disabled?.has(p.id)).length;
    void inClass;
    $("introKicker").textContent = "Shiny Piece!";
    $("introName").textContent = info.name;
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
    if (!demos.length) list.textContent = "No powerups yet this game.";
    playDemos(demos);
  }

  /* ---------- dev mode (?devmode=1) ---------- */

  const devPanel = $("devPanel");
  function setupDevMode() {
    if (!devmode) return;
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
      add(`Powerups: ${CLASS_INFO[type].name}`, ofClass(type));
    }
    for (let d = 0; d <= 5; d++) add(`Difficulty ${d}`, state.allShapes.filter(s => s.difficulty === d));
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
      $("devNextStatus").textContent = "all powerup classes unlocked";
    });

    // which powerups can turn up, and how often (remembered for this browser session)
    const dev = state.devPowerups;
    try {
      const saved = JSON.parse(sessionStorage.getItem("extris.dev") ?? "null");
      if (saved) { dev.disabled = new Set(saved.disabled ?? []); dev.rate = Number(saved.rate ?? 1); }
    } catch { /* ignore */ }
    const saveDev = () => {
      try { sessionStorage.setItem("extris.dev", JSON.stringify({ disabled: [...dev.disabled], rate: dev.rate })); } catch { /* ignore */ }
    };
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
      ["powerup chance", ps && state.powerups.length ? `${(ps.lastChance * 100).toFixed(0)}% · cd ${ps.cooldown} · rate ×${state.devPowerups.rate}` : "off"],
      ["struggle", (state.pieceSel?.struggle ?? 0).toFixed(2)],
      ["usable powerups", ps?.lastUsable ?? "–"],
      ["first giant", state.pieceSel?.giantDueAt == null ? "none (easy)" : state.pieceSel.hadGiant ? "done" : `due at piece ${state.pieceSel.giantDueAt}`],
      ["classes", ps ? (ps.classes.join(", ") || "none yet") : "–"],
      ["powerups seen", ps ? `${ps.shown.size}/${state.powerups.length} · ${state.devPowerups.disabled.size} disabled` : "–"],
      ["pieces on board", String(state.instances.size)],
      ["look", `${CONFIG.render.cellStyle} · edges ${CONFIG.render.enhanced.edgeStrength}`],
    ];
    devPanel.innerHTML = `<div class="devTitle">dev mode</div>` +
      lines.map(([k, v]) => `<div><span class="k">${k}</span> <span class="v">${escapeHtml(v)}</span></div>`).join("") +
      `<div class="devHint">pause menu: pick the next piece · D V E P keys</div>`;
  }

  /* ---------- buttons ---------- */

  $("btnEasy").addEventListener("click", () => startGame("easy"));
  $("btnNormal").addEventListener("click", () => startGame("normal"));
  $("btnExtreme").addEventListener("click", () => startGame("extreme"));
  $("btnHowTo").addEventListener("click", () => { panelBack = "menu"; showPanel("howto"); });
  $("btnAchievements").addEventListener("click", () => { panelBack = "menu"; showPanel("achievements"); });
  $("btnResume").addEventListener("click", () => resumeGame());
  $("btnQuit").addEventListener("click", () => goToMenu());
  $("btnPauseHowTo").addEventListener("click", () => { panelBack = "pause"; showPanel("howto"); });
  $("btnPowerupHelp").addEventListener("click", () => { panelBack = "pause"; showPanel("powerups"); });
  $("btnIntroContinue").addEventListener("click", () => resumeGame());
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
  for (const b of document.querySelectorAll(".soundToggle")) {
    b.addEventListener("click", () => {
      sound.setEnabled(!sound.isEnabled());
      syncSoundButtons();
    });
  }

  pauseBtn.addEventListener("click", (e) => {
    e.preventDefault();
    togglePause();
  });

  if (CONFIG.pause.pauseWhenHidden) {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.running && !state.paused) pauseGame();
    });
  }

  /* ---------- keyboard ---------- */

  // Debug: force the next piece to be a powerup (cycles through them all).
  let debugPowerupIdx = 0;
  const EDGE_STEPS = [0, 0.15, 0.3, 0.5, 1];

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyD" && !e.repeat) {
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
      if (currentPanel === "howto" || currentPanel === "achievements" || currentPanel === "powerups") showPanel(panelBack);
      else if (currentPanel === "intro") resumeGame();
      else togglePause();
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      togglePause();
      return;
    }
    if (e.code === "Enter") {
      if (currentPanel === "menu") { e.preventDefault(); startGame(); }
      else if (currentPanel === "gameover") { e.preventDefault(); startGame(state.mode); }
      else if (currentPanel === "intro") { e.preventDefault(); resumeGame(); }
      return;
    }

    if (!state.running || state.gameOver || state.paused) return;

    markInput(state, "keyboard");
    sound.unlock();

    switch (e.code) {
      case "ArrowLeft":
        e.preventDefault();
        if (tryMove(state, -1, 0)) sound.play("move");
        break;
      case "ArrowRight":
        e.preventDefault();
        if (tryMove(state, +1, 0)) sound.play("move");
        break;
      case "ArrowUp":
        e.preventDefault();
        if (tryRotate(state)) sound.play("rotate");
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!e.repeat && isDoubleDown()) { teleportDown(); break; }
        state.softDropping = true;
        break;
    }
  });

  // Double tap / double press down: the piece drops straight to where it will land.
  let lastDownAt = 0;
  function isDoubleDown() {
    const now = performance.now();
    const double = now - lastDownAt < (CONFIG.timing.doubleTapMs ?? 300);
    lastDownAt = double ? 0 : now;
    return double;
  }
  function teleportDown() {
    if (!canAct()) return;
    state.softDropping = false;
    stopRepeat();
    if (hardDropAndLock(state)) sound.play("lock");
  }

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowDown") state.softDropping = false;
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

    if (zone === "left") { if (tryMove(state, -1, 0)) sound.play("move"); }
    else if (zone === "right") { if (tryMove(state, +1, 0)) sound.play("move"); }
    else if (zone === "top") { if (tryRotate(state)) sound.play("rotate"); }
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
    sound.unlock();
    // Menus, buttons and scrolling panels handle their own input.
    if (overlayShowing() || e.target.closest?.("button, .overlay, .toast")) return;
    e.preventDefault();

    const zone = getZone(e.clientX, e.clientY);
    state.touch.zone = zone;

    if (zone === "bottom" && isDoubleDown()) { applyGlow(zone); teleportDown(); return; }
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

  /* ---------- boot ---------- */

  showPanel("loading");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelector(".app")?.classList.add("ready");
      showPanel("menu");
    });
  });

  return {
    frame() { updateHUD(); },
    toast,
    showPanel,
    startGame,
    nameLayer,
  };
}
