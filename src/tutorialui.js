// ============================================================
// TUTORIAL, ON THE PAGE — its bar under the board, the finger and the keys
// ============================================================
// src/tutorial.js plays each page; this shows it. The page's sentence goes over the top of the
// board, where a game shows the pieces' names, with an X beside it to go home. The bar takes the
// bottom bar's place: Back and Next, Touch or Keys (which it shows), the pages as a row of dots,
// and a pause button; on the bay's page, the bay. On the last page the modes cover the board,
// each with a button to play it. And whatever the autopilot presses, as it presses it: on a
// touch screen a finger tapping the part of the board that does it (the zones are ui.js
// getZone's, each lit faintly in its own colour as the finger gets there); with a keyboard, a
// little picture of the arrow keys in the bar, the key lighting up; and the bay, which has no
// keys, the finger either way, tapping it and then the piece in its menu. It starts with
// whichever the device looks like it has, goes with whatever the player actually uses, and
// Touch and Keys switch it by hand.
// Playing at all (a tap on the board, a key that moves the piece) takes the piece over
// (tutorialTakeOver), and the hints go until the autopilot carries on.

import { CONFIG } from "../config.js";
import { on } from "./game.js";
import { tutorialGoTo, tutorialTakeOver, tutorialText, shelfSlot } from "./tutorial.js";
import { bindShelf } from "./shelfui.js";
import { CLASS_INFO } from "./powerups.js";
import { escapeHtml } from "./util.js";

// The finger: a pixel hand pointing up, its fingertip at the top (TIP), in a white sleeve.
const HAND = [
  "......##........",
  ".....#ww#.......",
  ".....#ww#.......",
  ".....#ww#.......",
  ".....#ww#.......",
  ".....#ww###.....",
  ".....#ww#ww#....",
  ".....#ww#ww###..",
  "..##.#ww#ww#ww#.",
  ".#ww##ww#ww#ws#.",
  ".#www#wwwwwwws#.",
  "..#wwwwwwwwwws#.",
  "..#wwwwwwwwwws#.",
  "...#wwwwwwwwss#.",
  "...#wwwwwwwwws#.",
  "....#wwwwwwws#..",
  "....#cccccccd#..",
  "....#cccccccd#..",
  "....##########..",
];
const HAND_COLOURS = { "#": "#1a1428", w: "#fff4e6", s: "#e0c9b8", c: "#ffffff", d: "#a9a9b4" };
const PX = 3.5;           // (screen pixels to a pixel of it)
const TIP = { x: 7, y: 0.4 };

// What each press is: the zone of the board that does it (or the bay, and the piece in its
// menu), and the arrow key.
const ZONE_OF = { left: "left", right: "right", turn: "top", down: "bottom", hold: "bottom", drop: "bottom", bay: "bay", shelf: "shelf" };
const KEYS_OF = { left: ["left"], right: ["right"], turn: ["up"], down: ["down"], hold: ["down"], drop: ["down"] };
// (where in each zone the finger taps, as shares of the board across and down)
const TIP_AT = { left: [0.25, 0.47], right: [0.75, 0.47], top: [0.5, 0.11], bottom: [0.5, 0.86] };
// (the keys that move the piece: pressing one takes it over)
const CONTROL_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS"]);

function handSvg() {
  const rects = [];
  HAND.forEach((row, y) => [...row].forEach((ch, x) => {
    if (HAND_COLOURS[ch]) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${HAND_COLOURS[ch]}"/>`);
  }));
  const w = HAND[0].length, h = HAND.length;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w * PX}" height="${h * PX}" shape-rendering="crispEdges" aria-hidden="true">${rects.join("")}</svg>`;
}

// A page's words: [x] a key or a button, {name} the powerup class's name in its colours (and
// {gravity} and so on, that class's).
function markup(text, page) {
  const name = (cls) => `<b class="tutName cls-${cls}">${escapeHtml(CLASS_INFO[cls]?.name ?? cls)}</b>`;
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]/g, "<kbd>$1</kbd>")
    .replace(/\{name\}/g, () => name(page.cls))
    .replace(/\{(destroyer|gravity|expander|combo)\}/g, (_, cls) => name(cls));
}

export function bindTutorial({ state, togglePause, resumeGame, goToMenu, play }) {
  const $ = (id) => document.getElementById(id);
  const bar = $("tutorialBar"), shell = $("boardShell"), canvas = $("boardCanvas");
  if (!bar || !shell) return;
  const textEl = $("tutTop"), keysEl = $("tutKeys"), dotsEl = $("tutDots"), cheerEl = $("tutCheer"), modesEl = $("tutModes");
  const backBtn = $("tutBack"), nextBtn = $("tutNext"), pauseBtn = $("tutPause"), xBtn = $("tutX");
  const viewBtns = { touch: $("tutViewTouch"), keys: $("tutViewKeys") };
  const shelfRoot = $("tutShelf");
  const shelf = bindShelf({ state, root: shelfRoot });

  // the zones, faintly, over the board (under the panels)
  const zonesEl = document.createElement("div");
  zonesEl.className = "tutZones";
  zonesEl.setAttribute("aria-hidden", "true");
  const zones = {};
  for (const z of ["left", "right", "top", "bottom"]) {
    const el = document.createElement("div");
    el.className = "tutZone";
    el.dataset.zone = z;
    zonesEl.appendChild(el);
    zones[z] = el;
  }
  shell.insertBefore(zonesEl, $("overlay"));

  // the finger, over everything (it goes where the board is on the screen)
  const finger = document.createElement("div");
  finger.className = "tutFinger";
  finger.innerHTML = `<div class="tutHand">${handSvg()}</div>`;
  document.body.appendChild(finger);
  const hand = finger.firstElementChild;

  const keyEls = new Map([...bar.querySelectorAll("[data-k]")].map(el => [el.dataset.k, el]));

  // Touch or keyboard: what the device looks like it has, until the player shows otherwise.
  let view = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ? "keys" : "touch";
  const setView = (v) => { view = v; };
  for (const [v, b] of Object.entries(viewBtns)) b.addEventListener("click", () => setView(v));

  let running = false, raf = 0;
  const shown = { page: -1, view: null, seq: 0, cheer: 0, resets: 0, zone: null, fingerOn: false, paused: null, count: 0 };
  let lastPress = { at: -1e9, zone: null };
  const litUntil = new Map();

  function setOn(onNow) {
    if (onNow === running) return;
    running = onNow;
    document.body.classList.toggle("tutorial", onNow);
    bar.hidden = !onNow;
    textEl.hidden = !onNow;
    xBtn.hidden = !onNow;
    if (!onNow) { modesEl.hidden = true; shell.classList.remove("tutPaused"); }
    shown.page = -1;
    shown.paused = null;
    shown.cheer = state.tutorial?.cheer ?? 0;
    window.__fitBoard?.(); // (the bar is taller than the usual one: the board makes room)
    cancelAnimationFrame(raf);
    if (onNow) raf = requestAnimationFrame(frame);
    else hideHints();
  }
  on(state, (type, d) => {
    if (type === "start") setOn(!!CONFIG.modes[d.mode]?.tutorial);
    else if (type === "reset") setOn(false);
    else if (type === "shelf" && running) shelf.refresh();
  });

  /* ---------- the bar ---------- */

  function renderPage(t) {
    const newPage = shown.page !== t.page;
    shown.page = t.page;
    shown.view = view;
    const page = t.pages[t.page], last = t.page === t.pages.length - 1;
    textEl.innerHTML = markup(tutorialText(page, view), page);
    if (newPage) { textEl.classList.remove("enter"); void textEl.offsetWidth; textEl.classList.add("enter"); }
    keysEl.hidden = view !== "keys";
    for (const [v, b] of Object.entries(viewBtns)) b.setAttribute("aria-pressed", String(v === view));
    shelf.refresh();
    if (newPage) {
      modesEl.hidden = !page.modes;
      [...modesEl.children].forEach((b, i) => b.style.setProperty("--n", i));
    }
    if (shown.count !== t.pages.length) {
      shown.count = t.pages.length;
      dotsEl.innerHTML = t.pages.map(() => "<i></i>").join("");
    }
    [...dotsEl.children].forEach((d, i) => { d.classList.toggle("on", i === t.page); d.classList.toggle("done", i < t.page); });
    dotsEl.setAttribute("aria-label", `page ${t.page + 1} of ${t.pages.length}`);
    backBtn.disabled = t.page === 0;
    nextBtn.hidden = last;
    nextBtn.classList.remove("nudge");
    cheerEl.classList.remove("on");
  }

  // (the player did what the page shows: a cheer, and Next glows)
  function cheer() {
    cheerEl.classList.remove("on");
    void cheerEl.offsetWidth;
    cheerEl.classList.add("on");
    nextBtn.classList.add("nudge");
  }

  // (from the page it's on its way to, when a click has only just asked for one: two quick
  // clicks, two pages)
  const go = (d) => {
    const t = state.tutorial;
    if (!t) return;
    if (state.paused) resumeGame();
    tutorialGoTo(state, (t.pending ?? t.page) + d);
  };
  backBtn.addEventListener("click", () => go(-1));
  nextBtn.addEventListener("click", () => go(1));
  pauseBtn.addEventListener("click", (e) => { e.preventDefault(); togglePause(); });
  // (paused, the pause menu has its own X; this one is the tutorial's, out of it)
  xBtn.addEventListener("click", () => { if (state.paused) resumeGame(); else goToMenu(); });
  xBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  // (a press on a button keeps the pointer until it's let go: one that slides a little off the
  // button before it's let go still counts as a click on it)
  for (const b of [...bar.querySelectorAll("button"), xBtn]) b.addEventListener("pointerdown", (e) => {
    if (e.button === 0) try { b.setPointerCapture(e.pointerId); } catch { /* (not everywhere) */ }
  });
  for (const b of modesEl.querySelectorAll("[data-mode]")) {
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", () => play(b.dataset.mode, { from: b }));
  }
  // (a tap on the bar is for the bar, not the board: ui.js would take it for the bottom of it)
  bar.addEventListener("pointerdown", (e) => e.stopPropagation());

  /* ---------- the player playing ---------- */

  const playing = () => running && !!state.tutorial && state.running && !state.paused;
  window.addEventListener("keydown", (e) => {
    if (!playing()) return;
    if (CONTROL_KEYS.has(e.code)) { setView("keys"); tutorialTakeOver(state, { down: e.code === "ArrowDown" || e.code === "KeyS" }); }
    else if (e.code === "Space" || e.code === "Escape") setView("keys");
  });
  document.body.addEventListener("pointerdown", (e) => {
    if (!playing() || !e.isPrimary || e.target.closest?.("button, .tutorialBar, .overlay.show")) return;
    setView("touch");
    tutorialTakeOver(state);
  });

  /* ---------- the hints ---------- */

  function hideHints() {
    finger.classList.remove("on");
    shown.fingerOn = false;
    for (const z of Object.values(zones)) z.classList.remove("on");
    for (const el of keyEls.values()) el.classList.remove("lit");
    shelfRoot.classList.remove("aim");
    shelf.item(shelfSlot(state))?.classList.remove("aim");
    litUntil.clear();
  }

  // (the bay, or the piece in its menu the autopilot is going for)
  const aimAt = (zone) => (zone === "bay" ? shelf.button : zone === "shelf" ? shelf.item(shelfSlot(state)) : null);

  // A press: the finger taps (a ripple where it touched, the edge of the board lights as it does
  // for the player's own taps), or the keys light up.
  function pressed(key, now) {
    const zone = ZONE_OF[key];
    lastPress = { at: now, zone };
    // (the bay: its menu opens; the piece in it: taken, and the menu goes)
    if (key === "bay") shelf.open();
    if (key === "shelf") shelf.close();
    if (view === "touch" || zone === "bay" || zone === "shelf") {
      hand.classList.remove("tap");
      void hand.offsetWidth;
      hand.classList.add("tap");
      const ring = document.createElement("div");
      ring.className = "tutRipple";
      finger.appendChild(ring);
      ring.addEventListener("animationend", () => ring.remove(), { once: true });
      setTimeout(() => ring.remove(), 900);
      const z = zones[zone];
      if (z) {
        shell.classList.add(`glow-${zone}`);
        setTimeout(() => shell.classList.remove(`glow-${zone}`), 170);
        z.classList.remove("hit");
        void z.offsetWidth;
        z.classList.add("hit");
      }
    }
    for (const k of KEYS_OF[key] ?? []) litUntil.set(k, now + 190);
  }

  function placeFinger(zone) {
    // (the bay, or a piece in its menu: the middle of it)
    const slot = aimAt(zone);
    // (the bay's menu not open yet: the bay)
    const at = slot ?? (zone === "shelf" ? shelf.button : null);
    const r = (at ?? shell).getBoundingClientRect(), [fx, fy] = at ? [0.5, 0.5] : TIP_AT[zone] ?? [0.5, 0.86];
    const x = r.left + r.width * fx - TIP.x * PX, y = r.top + r.height * fy - TIP.y * PX;
    // (coming into view, it appears where it's going rather than flying in from wherever it was)
    if (!shown.fingerOn) {
      finger.style.transition = "none";
      finger.style.transform = `translate(${x}px, ${y + 14}px)`;
      void finger.offsetWidth;
      finger.style.transition = "";
    }
    finger.style.transform = `translate(${x}px, ${y}px)`;
  }

  function showHints(t, now) {
    const live = state.running && !state.paused && !t.player && !document.hidden;
    const press = t.hint.press;
    if (press && press.seq !== shown.seq) {
      shown.seq = press.seq;
      if (live) pressed(press.key, now);
    }
    const aim = live && t.hint.aim ? ZONE_OF[t.hint.aim] : null;
    // (the finger stays a moment after its last tap, even with the piece gone: a drop)
    const zone = aim ?? (live && now - lastPress.at < 420 ? lastPress.zone : null);
    // (the bay has no keys: the finger goes to it whichever it shows)
    const fingerOn = !!zone && (view === "touch" || zone === "bay" || zone === "shelf");
    if (fingerOn) placeFinger(zone);
    if (fingerOn !== shown.fingerOn) { finger.classList.toggle("on", fingerOn); shown.fingerOn = fingerOn; }
    hand.classList.toggle("hold", fingerOn && t.hint.held);
    for (const [z, el] of Object.entries(zones)) el.classList.toggle("on", view === "touch" && z === zone);
    shelfRoot.classList.toggle("aim", aim === "bay" && !shelfRoot.hidden);
    shelf.item(shelfSlot(state))?.classList.toggle("aim", aim === "shelf");
    const held = live && t.hint.held ? KEYS_OF.hold : [];
    for (const [k, el] of keyEls) el.classList.toggle("lit", live && (held.includes(k) || (litUntil.get(k) ?? 0) > now));
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const t = state.tutorial;
    if (!t) return;
    if (t.page !== shown.page || view !== shown.view) renderPage(t);
    // (a page set up, or going round again: the board fades in)
    if (t.resets !== shown.resets) {
      shown.resets = t.resets;
      shelf.refresh();
      canvas.classList.remove("tutFade");
      void canvas.offsetWidth;
      canvas.classList.add("tutFade");
    }
    if (t.cheer !== shown.cheer) { shown.cheer = t.cheer; cheer(); }
    if (state.paused !== shown.paused) {
      shown.paused = state.paused;
      pauseBtn.textContent = state.paused ? "▶" : "❚❚";
      pauseBtn.setAttribute("aria-label", state.paused ? "Resume" : "Pause");
      // (the pause menu over the board: the page's words and the X out of the way of its own,
      // and the bay's menu closed)
      shell.classList.toggle("tutPaused", !!state.paused);
      if (state.paused) shelf.close();
    }
    showHints(t, now);
  }
}
