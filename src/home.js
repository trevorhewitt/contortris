// ============================================================
// HOME — the home screen (DOM)
// ============================================================
// Behind the menu, turbo zen plays itself (mode "home": no words anywhere in it) on a board a
// little wider than usual, seen through a slow camera that drifts, turns and zooms, and keeps
// the top of the stack in view; over it, effects drift by, a different kind every so often. In
// front of it, the logo and the modes. Left alone a while (CONFIG.home.idleMs), all of that fades
// away into plain turbo zen filling the window, with a small button to play (a fresh one whenever
// the window changes size); any touch, click, key or move of the mouse brings the home screen
// back. And choosing a mode: everything on the screen bursts into pieces, a few words to start it
// off (CONFIG.home.startTexts), and the game begins.
//
// The board behind the menu is the game's own (state, drawn by the renderer onto the board
// canvas as usual); the home screen only shows it through the camera, on a canvas of its own.

import { CONFIG } from "../config.js";
import { startRun, resetGame, updateGame, timeScaleOf } from "./game.js";
import { sampleByWeight } from "./util.js";

const H = () => CONFIG.home ?? {};
const rand = (a, b) => a + Math.random() * (b - a);
const pickIn = ([a, b]) => rand(a, b);
const smooth = (t) => t * t * (3 - 2 * t);
const RAINBOW = ["#ff4d6d", "#ffb84d", "#f9ff4d", "#4dff88", "#4dc3ff", "#b44dff"];

// The size of the board behind the menu, for a window this shape.
export function homeBoardSize(w, h) {
  const c = H(), rows = c.rows ?? 24;
  const cols = Math.round(rows * (w / Math.max(1, h)) * (c.widthShare ?? 0.85));
  return { cols: Math.max(c.minCols ?? 14, Math.min(c.maxCols ?? 30, cols)), rows };
}

// How many screen pixels a cell must be (at the least) for the screen, turned `rot`, to be all
// board, nothing outside it.
export function coverScale(w, h, rot, cols, rows) {
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
  return Math.max((w * c + h * s) / cols, (w * s + h * c) / rows);
}

// One of the start texts (as likely as its weight), not the same as last time if it can help it.
export function pickStartText(rng = Math.random, last = null) {
  const list = (H().startTexts ?? []).filter(t => t?.text && (t.weight ?? 1) > 0);
  if (!list.length) return "Ready, set, go!";
  const pool = list.length > 1 ? list.filter(t => t.text !== last) : list;
  return sampleByWeight(pool, t => t.weight ?? 1, rng).text;
}

// The parts it's said in: a part at a time, at each comma (the comma stays with its part).
export function startTextParts(text) {
  return String(text).split(/(?<=,)\s+/).map(s => s.trim()).filter(Boolean);
}

export function createHome({ state, boardCanvas, setBoardSize, restoreBoard, setWholeWindow, onPlay, onShowMenu, menuShowing, lastMode, hideOverlay }) {
  const $ = (id) => document.getElementById(id);
  // (the effects are drawn over the board on the same canvas: one layer for the browser to put
  // together with the menu, not two)
  const bg = $("homeBg"), fxc = bg, burstc = $("homeBurst"), textEl = $("startText"), idleBtn = $("idlePlay");
  const bgx = bg.getContext("2d"), fx = bgx, bx = burstc.getContext("2d");
  const body = document.body;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  let phase = "off"; // off | home | idle | starting
  let idleAt = 0, warmLeft = 0, lastText = null, resizeTimer = null, last = performance.now(), guardUntil = 0;
  let saved = null; // (what the background mustn't change for the next real game)
  const view = { w: 0, h: 0, dpr: 1, fx: 1, burst: 1 };

  /* ---------- sizes ---------- */

  // (the board behind is pixel art made bigger, and the effects are soft: neither needs every
  // pixel of a big screen, so each is drawn at a resolution that keeps it cheap, and the browser
  // scales it up)
  function sizeCanvases() {
    const vv = window.visualViewport;
    view.w = Math.max(1, Math.round(vv?.width ?? window.innerWidth));
    view.h = Math.max(1, Math.round(vv?.height ?? window.innerHeight));
    const area = view.w * view.h, dpr = window.devicePixelRatio || 1;
    view.dpr = Math.min(dpr, 1.5, Math.sqrt(1.1e6 / area));
    view.fx = view.dpr;
    view.burst = Math.min(dpr, 1.25, Math.sqrt(1.2e6 / area));
    const fit = (c, s) => {
      const w = Math.max(1, Math.round(view.w * s)), h = Math.max(1, Math.round(view.h * s));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    };
    fit(bg, view.dpr); fit(burstc, view.burst);
    shade = null;
  }

  /* ---------- the board behind it ---------- */

  function startBackground() {
    sizeCanvases();
    const { cols, rows } = homeBoardSize(view.w, view.h);
    // (drawn at its natural size, then shown bigger through the camera)
    const px = CONFIG.render.cellPx / (window.devicePixelRatio || 1);
    window.__homeShellPx = { w: cols * px, h: rows * px };
    setBoardSize(cols, rows);
    resetGame(state);
    state.backdrop = true;
    startRun(state, "home");
    warmLeft = 26000; // (game time: it comes on with something on the board already)
    camera.reset();
  }

  function stopBackground() {
    if (state.mode === "home") resetGame(state);
    window.__homeShellPx = null;
  }

  // (sets served and their versions: the next real game shouldn't care what went by back here)
  function remember() { saved = { recent: state.level6Recent, versions: new Map(state.setVersions ?? []) }; }
  function restore() {
    if (!saved) return;
    state.level6Recent = saved.recent;
    state.setVersions = saved.versions;
    saved = null;
  }

  /* ---------- the camera ---------- */

  const camera = {
    x: 0, y: 0, z: 1.2, rot: 0, tx: 0, tz: 1.2, trot: 0, nextMove: 0, ready: false,
    reset() { this.ready = false; this.nextMove = 0; },
    step(dt, now) {
      const c = H(), { cols, rows } = CONFIG.board, W = view.w, Hh = view.h;
      if (now >= this.nextMove) {
        this.nextMove = now + pickIn(c.moveEvery ?? [6000, 11000]);
        const turn = (c.maxTurn ?? 9) * Math.PI / 180;
        this.trot = reduced ? 0 : rand(-turn, turn);
        this.tz = reduced ? 1 : rand(0.8, 1.15); // (how much of the stack it takes in, roughly: below)
        this.tx = Math.random();
      }
      // (the top of the stack, a little above the middle of the view)
      let top = rows;
      for (let y = 0; y < rows; y++) if (state.board[y]?.some(Boolean)) { top = y; break; }
      const k = this.ready ? 1 - Math.exp(-dt / (c.ease ?? 2600)) : 1;
      this.rot += (this.trot - this.rot) * k;
      // (zoomed in so that what it shows is mostly stack, with a little air over it: the lower
      // the stack, the closer in; never so far out that anything beyond the board shows)
      const cover = coverScale(W, Hh, this.rot, cols, rows);
      const wantRows = Math.max(7, Math.min(rows, (rows - top) * 1.45 + 4)) * this.tz;
      const z = Math.max(1, Math.min(c.zoom ?? 1.9, Hh / (cover * wantRows)));
      this.z += (z - this.z) * (this.ready ? 1 - Math.exp(-dt / 1800) : 1);
      const S = cover * this.z;
      const ca = Math.abs(Math.cos(this.rot)), sa = Math.abs(Math.sin(this.rot));
      const hw = (W * ca + Hh * sa) / (2 * S), hh = (W * sa + Hh * ca) / (2 * S);
      const want = { x: hw + this.tx * Math.max(0, cols - 2 * hw), y: top + 0.25 * hh };
      want.y = Math.max(hh, Math.min(rows - hh, want.y));
      this.x += (want.x - this.x) * k;
      this.y += (want.y - this.y) * (this.ready ? 1 - Math.exp(-dt / 1400) : 1);
      this.x = Math.max(hw, Math.min(cols - hw, this.x));
      this.y = Math.max(hh, Math.min(rows - hh, this.y));
      this.ready = true;
      this.S = S;
    },
    draw() {
      const { cols } = CONFIG.board, pc = boardCanvas.width / cols, d = view.dpr;
      bgx.setTransform(1, 0, 0, 1, 0, 0);
      bgx.fillStyle = "#000";
      bgx.fillRect(0, 0, bg.width, bg.height);
      bgx.imageSmoothingEnabled = false;
      bgx.translate(bg.width / 2, bg.height / 2);
      bgx.rotate(this.rot);
      const k = this.S * d / pc;
      bgx.scale(k, k);
      bgx.translate(-this.x * pc, -this.y * pc);
      bgx.drawImage(boardCanvas, 0, 0);
    },
  };

  /* ---------- the effects over it ---------- */

  const MOODS = ["embers", "sparkles", "confetti", "bubbles", "comets", "snow"];
  const motes = [];
  let mood = MOODS[Math.floor(Math.random() * MOODS.length)], moodUntil = 0, spawnAcc = 0, shade = null;
  // (the edges a little darker, so the menu reads, and a tint of colour: made once, small, and
  // laid over the whole screen each frame)
  function shading() {
    if (shade) return shade;
    shade = document.createElement("canvas");
    shade.width = 160; shade.height = Math.max(40, Math.round(160 * view.h / view.w));
    const c = shade.getContext("2d"), w = shade.width, h = shade.height;
    const tint = c.createLinearGradient(0, 0, w, h);
    tint.addColorStop(0, "rgba(255,77,160,0.08)"); tint.addColorStop(0.5, "rgba(77,195,255,0.06)"); tint.addColorStop(1, "rgba(180,77,255,0.08)");
    c.fillStyle = tint; c.fillRect(0, 0, w, h);
    const v = c.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.55)");
    c.fillStyle = v; c.fillRect(0, 0, w, h);
    return shade;
  }
  const glows = new Map();
  function glow(hue) {
    const key = Math.round(((hue % 360) + 360) % 360 / 15) * 15;
    let g = glows.get(key);
    if (!g) {
      g = document.createElement("canvas");
      g.width = g.height = 64;
      const c = g.getContext("2d"), grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, `hsla(${key},100%,85%,1)`);
      grad.addColorStop(0.25, `hsla(${key},100%,65%,0.55)`);
      grad.addColorStop(1, `hsla(${key},100%,50%,0)`);
      c.fillStyle = grad;
      c.fillRect(0, 0, 64, 64);
      glows.set(key, g);
    }
    return g;
  }
  function spawnMote(kind, W, Hh, now) {
    const hue = (now * 0.02 + rand(0, 120)) % 360;
    const m = { kind, hue, age: 0, rot: rand(0, 6.28), vr: rand(-2, 2) };
    if (kind === "embers") Object.assign(m, { x: rand(0, W), y: Hh + 10, vx: rand(-12, 12), vy: rand(-70, -30), size: rand(6, 16), life: rand(5, 9) });
    else if (kind === "sparkles") Object.assign(m, { x: rand(0, W), y: rand(0, Hh), vx: 0, vy: 0, size: rand(8, 22), life: rand(1.2, 2.4) });
    else if (kind === "confetti") Object.assign(m, { x: rand(0, W), y: -10, vx: rand(-25, 25), vy: rand(30, 80), size: rand(4, 9), life: rand(7, 12), hue: rand(0, 360) });
    else if (kind === "bubbles") Object.assign(m, { x: rand(0, W), y: Hh + 20, vx: 0, vy: rand(-55, -25), size: rand(6, 20), life: rand(6, 11), phase: rand(0, 6.28) });
    else if (kind === "comets") { const fromLeft = Math.random() < 0.5; Object.assign(m, { x: fromLeft ? -40 : W + 40, y: rand(-0.1, 0.6) * Hh, vx: (fromLeft ? 1 : -1) * rand(380, 620), vy: rand(80, 200), size: rand(3, 6), life: 3 }); }
    else Object.assign(m, { x: rand(0, W), y: -10, vx: rand(-10, 10), vy: rand(15, 40), size: rand(2, 5), life: rand(10, 16), phase: rand(0, 6.28), hue: 210 }); // snow
    return m;
  }
  const RATE = { embers: 9, sparkles: 7, confetti: 10, bubbles: 5, comets: 0.7, snow: 16 }; // (a second, on a 1000×700 screen)
  function stepFx(dt, now) {
    const W = view.w, Hh = view.h, d = view.fx, s = dt / 1000;
    if (now >= moodUntil) {
      const others = MOODS.filter(m => m !== mood);
      mood = others[Math.floor(Math.random() * others.length)];
      moodUntil = now + pickIn(H().fxEvery ?? [14000, 22000]);
    }
    const area = (W * Hh) / 700000;
    spawnAcc += (RATE[mood] ?? 6) * area * s * (reduced ? 0.3 : 1);
    while (spawnAcc >= 1 && motes.length < 260) { spawnAcc--; motes.push(spawnMote(mood, W, Hh, now)); }
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.imageSmoothingEnabled = true;
    fx.drawImage(shading(), 0, 0, fxc.width, fxc.height);
    fx.globalCompositeOperation = "lighter";
    let n = 0;
    for (const m of motes) {
      m.age += s;
      if (m.age >= m.life) continue;
      motes[n++] = m;
      const t = m.age / m.life, fade = Math.min(1, t * 5, (1 - t) * 3);
      if (m.kind === "bubbles" || m.kind === "snow") m.x += Math.sin(m.age * 2 + m.phase) * 18 * s;
      m.x += m.vx * s; m.y += m.vy * s; m.rot += m.vr * s;
      const x = m.x * d, y = m.y * d, z = m.size * d;
      fx.globalAlpha = fade * (m.kind === "snow" ? 0.6 : 0.85);
      if (m.kind === "confetti") {
        fx.fillStyle = `hsl(${m.hue},95%,62%)`;
        const w = z * (0.5 + 0.5 * Math.abs(Math.cos(m.rot)));
        fx.fillRect(x - w / 2, y - z / 2, w, z);
      } else if (m.kind === "bubbles") {
        fx.strokeStyle = `hsla(${m.hue},100%,75%,0.9)`;
        fx.lineWidth = Math.max(1, d * 1.5);
        fx.beginPath(); fx.arc(x, y, z, 0, Math.PI * 2); fx.stroke();
        fx.drawImage(glow(m.hue), x - z * 0.6, y - z * 0.9, z * 0.6, z * 0.6);
      } else if (m.kind === "sparkles") {
        const p = Math.sin(t * Math.PI), r = z * p;
        fx.drawImage(glow(m.hue), x - r, y - r, r * 2, r * 2);
        fx.fillStyle = "#fff";
        fx.fillRect(x - r, y - d * 0.75, r * 2, d * 1.5);
        fx.fillRect(x - d * 0.75, y - r, d * 1.5, r * 2);
      } else if (m.kind === "comets") {
        fx.strokeStyle = `hsla(${m.hue},100%,70%,0.8)`;
        fx.lineWidth = z * 0.6;
        fx.beginPath(); fx.moveTo(x, y); fx.lineTo(x - m.vx * 0.12 * d, y - m.vy * 0.12 * d); fx.stroke();
        fx.drawImage(glow(m.hue), x - z * 3, y - z * 3, z * 6, z * 6);
      } else {
        fx.drawImage(glow(m.kind === "snow" ? 210 : m.hue), x - z, y - z, z * 2, z * 2);
      }
    }
    motes.length = n;
    fx.globalAlpha = 1;
    fx.globalCompositeOperation = "source-over";
  }

  /* ---------- left alone: plain turbo zen ---------- */

  function noteInput() { idleAt = performance.now() + (H().idleMs ?? 30000); }

  function goIdle() {
    if (phase !== "home") return;
    phase = "fading";
    body.classList.add("homeFade");
    setTimeout(() => {
      if (phase !== "fading") return;
      body.classList.remove("home", "homeFade");
      stopBackground();
      restore();
      hideOverlay();
      startIdleTurbo();
      phase = "idle";
      idleBtn.hidden = false;
    }, 1000);
  }

  function startIdleTurbo() {
    restoreBoard();
    setWholeWindow(false);
    setWholeWindow(true);
    resetGame(state);
    startRun(state, "turbo");
    state.backdrop = true;
    state.speed = 1;
  }

  function leaveIdle() {
    if (phase !== "idle" && phase !== "fading") return;
    if (phase === "fading") body.classList.remove("homeFade");
    idleBtn.hidden = true;
    if (phase === "idle") {
      resetGame(state);
      setWholeWindow(false);
    }
    phase = phase === "fading" ? "home" : "off";
    noteInput();
    // (the tap that woke it isn't also a tap on whatever button comes up under it)
    guardUntil = performance.now() + 500;
    if (phase === "off") onShowMenu();
  }

  /* ---------- the way into a game ---------- */

  const bits = [];
  let startAt = 0, textAt = 0, endAt = 0, playMode = null, textShown = false;

  function burstFrom(cx, cy) {
    const W = view.w, Hh = view.h;
    bits.length = 0;
    const g = Math.max(7, Math.round(Math.sqrt(W * Hh / 2600)));
    // the board behind, a square at a time
    const sw = Math.ceil(W / g), sh = Math.ceil(Hh / g);
    const small = document.createElement("canvas");
    small.width = sw; small.height = sh;
    const sx = small.getContext("2d", { willReadFrequently: true });
    sx.drawImage(bg, 0, 0, sw, sh);
    let px = null;
    try { px = sx.getImageData(0, 0, sw, sh).data; } catch { px = null; }
    const add = (x, y, size, colour, kick = 1) => {
      const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy) || 1;
      const sp = rand(260, 900) * kick * (0.45 + 0.55 * Math.exp(-dist / 600));
      bits.push({ x, y, size, colour, vx: dx / dist * sp + rand(-80, 80), vy: dy / dist * sp - rand(120, 380), life: rand(0.7, 1.25), age: 0 });
    };
    if (px) for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
      const k = (j * sw + i) * 4, r = px[k], gg = px[k + 1], b = px[k + 2];
      if (r + gg + b < 40 && Math.random() < 0.75) continue; // (most of the dark: the gaps between)
      add((i + 0.5) * g, (j + 0.5) * g, g, `rgb(${r},${gg},${b})`, 0.8);
    }
    // ...and the logo and the buttons, in their colours
    const pieces = document.querySelectorAll("#homeLogo span, #panelMenu button, #panelMenu .skipBox");
    const f = Math.max(4, Math.round(g / 2));
    for (const el of pieces) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const own = getComputedStyle(el).color;
      for (let y = r.top; y < r.bottom; y += f) for (let x = r.left; x < r.right; x += f) {
        const colour = el.tagName === "SPAN" ? own : RAINBOW[Math.floor(((x / W) * RAINBOW.length + performance.now() / 900) % RAINBOW.length)];
        add(x + f / 2, y + f / 2, f, colour, 1.2);
      }
    }
    burstc.hidden = false;
  }

  function drawBurst(dt) {
    const d = view.burst, s = dt / 1000;
    bx.setTransform(1, 0, 0, 1, 0, 0);
    bx.clearRect(0, 0, burstc.width, burstc.height);
    let n = 0;
    for (const b of bits) {
      b.age += s;
      if (b.age >= b.life) continue;
      bits[n++] = b;
      b.vy += 1100 * s; b.vx *= 1 - 0.8 * s;
      b.x += b.vx * s; b.y += b.vy * s;
      const t = b.age / b.life, z = b.size * (1 - 0.6 * t) * d;
      bx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      bx.fillStyle = b.colour;
      bx.fillRect(b.x * d - z / 2, b.y * d - z / 2, z, z);
    }
    bits.length = n;
    bx.globalAlpha = 1;
  }

  function showText(text) {
    textEl.innerHTML = "";
    const parts = startTextParts(text), each = (H().startTextMs ?? 1900) * 0.62 / Math.max(1, parts.length);
    parts.forEach((p, i) => {
      const span = document.createElement("span");
      span.className = "startPart";
      span.textContent = p;
      span.style.animationDelay = `${Math.round(i * each)}ms`;
      span.style.setProperty("--hue", String((i * 70 + Math.random() * 60) % 360));
      textEl.appendChild(span);
    });
    textEl.hidden = false;
    textEl.classList.remove("out");
    textShown = true;
  }

  // Starting a mode: from the home screen with the burst, or (from, say, game over) the words alone.
  function play(mode, { from = null, burst = phase === "home" } = {}) {
    if (phase === "starting") return;
    const now = performance.now();
    const wasHome = phase === "home";
    playMode = mode;
    phase = "starting";
    sizeCanvases();
    if (burst && wasHome) {
      const r = from?.getBoundingClientRect?.();
      burstFrom(r ? r.left + r.width / 2 : view.w / 2, r ? r.top + r.height / 2 : view.h / 2);
    }
    body.classList.add("starting");
    if (wasHome) { stopBackground(); restore(); }
    lastText = pickStartText(Math.random, lastText);
    startAt = now;
    textAt = now + (burst && wasHome ? (H().burstMs ?? 1000) * 0.4 : 0);
    endAt = textAt + (H().startTextMs ?? 1900);
    textShown = false;
  }

  function finishStart() {
    if (phase !== "starting") return;
    phase = "off";
    bits.length = 0;
    burstc.hidden = true;
    textEl.hidden = true;
    textEl.innerHTML = "";
    body.classList.remove("home", "starting", "homeFade");
    restoreBoard();
    state.backdrop = false;
    onPlay(playMode);
  }

  /* ---------- in and out ---------- */

  function enter() {
    if (phase === "home" || phase === "starting") return;
    if (phase === "idle" || phase === "fading") { leaveIdle(); return; }
    phase = "home";
    idleBtn.hidden = true;
    remember();
    body.classList.add("home");
    body.classList.remove("homeFade", "starting");
    startBackground();
    noteInput();
  }

  // (the window changed size: the board behind is made again for its new shape, and plain turbo
  // zen starts over to fill it)
  function resized() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (phase === "idle") startIdleTurbo();
      else if (phase === "home") {
        sizeCanvases();
        const want = homeBoardSize(view.w, view.h);
        if (Math.abs(want.cols - CONFIG.board.cols) >= 2) startBackground();
      } else sizeCanvases();
    }, 350);
  }
  window.addEventListener("resize", resized, { passive: true });
  window.visualViewport?.addEventListener("resize", resized, { passive: true });

  // Input: left alone it goes idle, and anything at all brings it back. (Captured before the
  // game's own handlers: nothing reaches the game behind the home screen or while it's idle.)
  const wake = (e) => {
    if (phase === "idle" || phase === "fading") {
      if (e.type !== "pointermove") { e.preventDefault?.(); e.stopImmediatePropagation(); }
      leaveIdle();
      return;
    }
    if (phase === "home") noteInput();
    if (phase === "starting" && e.type !== "pointermove" && performance.now() - startAt > 350) {
      e.preventDefault?.(); e.stopImmediatePropagation();
      finishStart(); // (a tap or a key: straight in)
    }
  };
  let lastMove = null;
  window.addEventListener("pointermove", (e) => {
    // (a real move, not the twitch a touch screen sends)
    if (lastMove && Math.hypot(e.clientX - lastMove.x, e.clientY - lastMove.y) < 3) return;
    lastMove = { x: e.clientX, y: e.clientY };
    wake(e);
  }, { capture: true, passive: true });
  for (const type of ["pointerdown", "wheel", "touchstart"]) window.addEventListener(type, wake, { capture: true, passive: false });
  window.addEventListener("keydown", (e) => {
    wake(e);
    if (phase !== "home") return;
    // (the game behind isn't to be played: Escape still goes back from How to play)
    if (e.code === "Escape" && !menuShowing()) return;
    if (e.code === "Enter" && menuShowing() && document.activeElement?.tagName !== "BUTTON") { e.preventDefault(); play(lastMode()); }
    e.stopImmediatePropagation();
  }, { capture: true });
  idleBtn.addEventListener("click", (e) => { e.preventDefault(); leaveIdle(); });
  window.addEventListener("click", (e) => {
    if (performance.now() < guardUntil) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, { capture: true });

  /* ---------- every frame ---------- */

  function frame(now) {
    const dt = Math.min(50, now - last);
    last = now;
    if (phase === "home" || phase === "fading") {
      // (it comes on with something on the board already: a fast start, a little each frame)
      for (let i = 0; warmLeft > 0 && i < 8; i++) { updateGame(state, 50); warmLeft -= 50 / Math.max(0.01, timeScaleOf(state)); }
      camera.step(dt, now);
      camera.draw();
      stepFx(dt, now);
      if (phase === "home" && menuShowing() && now >= idleAt && !document.hidden) goIdle();
    } else if (phase === "starting") {
      drawBurst(dt);
      if (!textShown && now >= textAt) showText(lastText);
      if (textShown && now >= endAt - 280) textEl.classList.add("out");
      if (now >= endAt) finishStart();
    }
  }

  return {
    enter, play, frame, finish: finishStart,
    active: () => phase === "home" || phase === "fading",
    phase: () => phase,
  };
}
