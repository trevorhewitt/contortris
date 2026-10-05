// ============================================================
// UI — menus, How to play, achievements page, toasts, HUD, input
// ============================================================

import { CONFIG } from "../config.js";
import { escapeHtml, store } from "./util.js";
import { getDifficultyZone } from "./selection.js";
import {
  on, startRun, resetGame, tryMove, tryRotate, beginLockIfNeeded, markInput, setNextPiece,
} from "./game.js";
import { makeShapePreviewCanvas, drawIcon, drawPowerupMark, drawBlockWithPaintStatic } from "./render.js";
import { getShapePaint } from "./shapes.js";

// Fallback icons (12×12) for achievements without one, and for locked / secret ones.
const _ = "", K = "#1a1428", G = "#ffcf3f", g = "#c98d1d", W = "#fff6c8", S = "#9a9ab8", s = "#5c5c78", P = "#b77dff", p = "#7a4fd1";
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
  [_, _, _, _, K, K, K, K, _, _, _, _],
  [_, _, _, K, S, S, S, S, K, _, _, _],
  [_, _, K, S, K, K, K, K, S, K, _, _],
  [_, _, K, S, K, _, _, K, S, K, _, _],
  [_, _, K, S, K, _, _, K, S, K, _, _],
  [_, K, K, K, K, K, K, K, K, K, K, _],
  [_, K, S, S, S, S, S, S, S, S, K, _],
  [_, K, S, S, S, K, K, S, S, s, K, _],
  [_, K, S, S, S, K, K, S, S, s, K, _],
  [_, K, S, S, S, S, S, S, s, s, K, _],
  [_, K, s, s, s, s, s, s, s, s, K, _],
  [_, K, K, K, K, K, K, K, K, K, K, _],
];
const ICON_SECRET = [
  [_, _, _, K, K, K, K, K, K, _, _, _],
  [_, _, K, P, P, P, P, P, P, K, _, _],
  [_, K, P, P, K, K, K, K, P, p, K, _],
  [_, K, P, K, _, _, _, K, P, p, K, _],
  [_, _, K, _, _, _, K, P, P, K, _, _],
  [_, _, _, _, _, K, P, P, K, _, _, _],
  [_, _, _, _, K, P, P, K, _, _, _, _],
  [_, _, _, _, K, P, p, K, _, _, _, _],
  [_, _, _, _, _, K, K, _, _, _, _, _],
  [_, _, _, _, K, K, K, K, _, _, _, _],
  [_, _, _, _, K, P, p, K, _, _, _, _],
  [_, _, _, _, K, K, K, K, _, _, _, _],
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
    for (const [key, el] of Object.entries(panels)) el.hidden = key !== name;
    if (name === "menu") renderMenu();
    if (name === "achievements") renderAchievements();
    if (name === "howto") startDemos();
    else stopDemos();
    if (name) {
      const scroller = panels[name];
      if (scroller) scroller.scrollTop = 0;
      // focus the main button for keyboard players
      panels[name]?.querySelector("button")?.focus({ preventScroll: true });
    }
  }

  const overlayShowing = () => !!currentPanel;

  function renderMenu() {
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
    $("pauseMode").textContent = `${modeLabel(state.mode)} mode · level ${state.level}`;
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

  on(state, (type, d) => {
    switch (type) {
      case "spawn":
        nameLayer.setShape(d.shape);
        renderer.drawNextSilhouette(d.next);
        if (d.shape.powerup) sound.play("powerupSpawn");
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
        nameLayer.clear();
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
    if (state.blocksDestroyed !== hudBlocks) { hudBlocks = state.blocksDestroyed; linesText.textContent = String(state.blocksDestroyed); }
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

  function toast(def) {
    if (!CONFIG.achievements.enabled) return;
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
      setTimeout(() => el.remove(), 400);
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
      const name = hidden ? "???" : def.name;
      const desc = hidden ? "A secret achievement." : (def.description ?? "");
      let meta = "";
      if (unlocked) {
        const at = achievements.unlockedAt(def.id);
        meta = at ? `Unlocked ${new Date(at).toLocaleDateString()}` : "Unlocked";
      } else {
        const pr = achievements.progressOf(def);
        if (pr && !hidden) meta = `${pr.best ? "Best" : "Progress"}: ${Math.min(pr.value, pr.target)} / ${pr.target}`;
        if (def.mode && def.mode !== "any") meta += `${meta ? " · " : ""}${modeLabel(def.mode)} mode`;
      }
      txt.innerHTML =
        `<div class="achName">${escapeHtml(name)}</div>` +
        `<div class="achDesc">${escapeHtml(desc)}</div>` +
        (meta ? `<div class="achMeta">${escapeHtml(meta)}</div>` : "");
      card.appendChild(txt);
      grid.appendChild(card);
    }
  }

  /* ---------- How to play demos ---------- */

  let demoRaf = 0;
  const demos = [];

  function setupDemos() {
    const pick = (id, type) =>
      state.allPowerups.find(p => p.id === id) ?? state.allPowerups.find(p => p.powerup.type === type) ?? null;

    // Tiny 6×4 boards: "#" block, "." empty, "P" the powerup, area = cells marked in `area`.
    const DEMOS = {
      destroyer: {
        piece: pick("small_black_hole", "destroyer"),
        board: ["......", "..P...", "#.###.", "######"],
        area: [".###..", ".###..", ".###..", "......"],
      },
      gravity: {
        piece: pick("infectious_sand", "gravity"),
        board: ["..P...", ".##...", "......", "#.#.##"],
        area: [".|||..", ".|||..", ".|||..", ".|||.."],
        direction: "down",
      },
      expander: {
        piece: pick("expanding_foam", "expander"),
        board: ["......", "...P..", "#.#..#", "##.###"],
        area: ["..###.", ".#####", ".#####", "..###."],
      },
    };

    const palette = ["#e8794a", "#5fb0e8", "#9ad45b", "#e85fa8", "#e8d35f", "#9a7be8"];
    for (const canvas of document.querySelectorAll("canvas.demo")) {
      const type = canvas.dataset.type;
      const spec = DEMOS[type];
      if (!spec) continue;
      const cell = 18;
      const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
      canvas.width = 6 * cell * dpr;
      canvas.height = 4 * cell * dpr;
      canvas.style.width = `${6 * cell}px`;
      canvas.style.height = `${4 * cell}px`;
      demos.push({ canvas, ctx: canvas.getContext("2d"), spec, cell, dpr, type, palette });
    }
  }

  function drawDemo(d, now) {
    const { ctx, spec, cell, dpr, type, palette } = d;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#05050c";
    ctx.fillRect(0, 0, 6 * cell, 4 * cell);
    let px0 = 0, py0 = 0;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 6; x++) {
        ctx.fillStyle = "rgba(255,255,255,0.035)";
        ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
        const ch = spec.board[y][x];
        if (ch === "#") {
          ctx.fillStyle = palette[(x * 3 + y * 5) % palette.length];
          ctx.fillRect(x * cell, y * cell, cell, cell);
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(x * cell, y * cell + cell - 2, cell, 2);
        } else if (ch === "P") {
          px0 = x; py0 = y;
        }
      }
    }
    // the powerup piece itself (its top-left block at the "P")
    if (spec.piece) {
      const mat = spec.piece.rotations[0];
      for (let y = 0; y < mat.length; y++) {
        for (let x = 0; x < mat[0].length; x++) {
          if (!mat[y][x]) continue;
          drawBlockWithPaintStatic(ctx, (px0 + x) * cell, (py0 + y) * cell, cell,
            getShapePaint(spec.piece, 0, x, y), spec.piece.style);
        }
      }
    }
    const pu = { type, direction: spec.direction ?? "down" };
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 6; x++) {
        if (spec.area[y][x] === ".") continue;
        const filled = spec.board[y][x] === "#";
        const isPiece = spec.board[y][x] === "P";
        if (isPiece) continue;
        const effective = type === "expander" ? !filled : filled;
        drawPowerupMark(ctx, pu, x * cell, y * cell, cell, now, x, y, Math.hypot(x - px0, y - py0), effective);
      }
    }
  }

  function startDemos() {
    if (!demos.length) setupDemos();
    cancelAnimationFrame(demoRaf);
    const loop = (now) => {
      for (const d of demos) drawDemo(d, now);
      demoRaf = requestAnimationFrame(loop);
    };
    demoRaf = requestAnimationFrame(loop);
  }

  function stopDemos() {
    cancelAnimationFrame(demoRaf);
    demoRaf = 0;
  }

  /* ---------- buttons ---------- */

  $("btnNormal").addEventListener("click", () => startGame("normal"));
  $("btnExtreme").addEventListener("click", () => startGame("extreme"));
  $("btnHowTo").addEventListener("click", () => { panelBack = "menu"; showPanel("howto"); });
  $("btnAchievements").addEventListener("click", () => { panelBack = "menu"; showPanel("achievements"); });
  $("btnResume").addEventListener("click", () => resumeGame());
  $("btnQuit").addEventListener("click", () => goToMenu());
  $("btnPauseHowTo").addEventListener("click", () => { panelBack = "pause"; showPanel("howto"); });
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
      if (currentPanel === "howto" || currentPanel === "achievements") showPanel(panelBack);
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
        state.softDropping = true;
        break;
    }
  });

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
