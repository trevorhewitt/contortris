// ============================================================
// PAUSED — the pieces so far, and the sparkles round the pause menu (DOM)
// ============================================================
// Under the pause menu's buttons (src/ui.js), a gallery of the pieces that have fallen this game,
// each once, where it last fell: the newest in the middle when the menu opens, the ones before it
// off to the left. Swipe or drag them along, tap the one either side, or use the arrows (the ones
// on the screen, or ← → and A D on a keyboard). Each says what it is and how rare (src/rarity.js).
// Behind the menu, sparkles drift up past it in the edge's colours, in chunky pixels like an old
// screen's (toned down, they keep still: settings.js calmFx). The game knows nothing of any of it:
// ui.js hands over each piece as it lands.

import { makeShapePreviewCanvas } from "./render.js";
import { rarity } from "./rarity.js";
import { calmFx } from "./settings.js";

/* =========================
   The gallery
   ========================= */

// In `root` (index.html #pieceGallery). add() each piece as it lands, clear() for a new game,
// open() as the pause menu opens (the newest in the middle again), render() whenever it's shown
// (its size may have changed), and key(e) for the keyboard (true: it was one of the gallery's).
const MOST = 999;              // (turbo zen goes on for ever: the newest this many)
const PIC_W = 112, PIC_H = 84; // the middle piece's picture fits in this (CSS pixels)

export function createGallery({ state, root }) {
  const q = (sel) => root.querySelector(sel);
  const stage = q(".pgStage"), track = q(".pgTrack"), prev = q(".pgPrev"), next = q(".pgNext");
  const nameEl = q(".pgName"), rareEl = q(".pgRare");
  const fallen = [];
  // (five places on the strip, the middle one and two either side, each with its own picture:
  // the pieces move through them)
  const slots = [-2, -1, 0, 1, 2].map(k => {
    const el = document.createElement("div");
    el.className = "pgSlot";
    const c = el.appendChild(document.createElement("canvas"));
    track.appendChild(el);
    return { k, el, c, shape: null };
  });
  // index: the piece in the middle; offset: how far along from it the strip is (dragged, or
  // gliding home), in pieces, towards the newer end; spacing: from one place to the next
  let index = 0, offset = 0, spacing = 100;

  // Each piece's picture, made once, as sharp as the screen's pixels. (Keyed by the piece as it
  // came: one that comes back changed, a remix or under another name, has a picture of its own.)
  const pics = new WeakMap();
  function picture(shape) {
    let p = pics.get(shape);
    if (!p) {
      const dpr = Math.max(1, Math.min(3, Math.round(window.devicePixelRatio || 1)));
      const mat = shape.rotations[0];
      const cell = Math.max(2, Math.min(32, Math.floor(Math.min(PIC_W / mat[0].length, PIC_H / mat.length))));
      p = { c: makeShapePreviewCanvas(shape, cell * dpr, 0), dpr };
      pics.set(shape, p);
    }
    return p;
  }
  function fill(s) {
    const shape = fallen[index + s.k] ?? null;
    if (shape === s.shape) return;
    s.shape = shape;
    s.el.hidden = !shape;
    if (!shape) return;
    const { c, dpr } = picture(shape);
    s.c.width = c.width;
    s.c.height = c.height;
    s.c.style.width = `${c.width / dpr}px`;
    s.c.style.height = `${c.height / dpr}px`;
    s.c.getContext("2d").drawImage(c, 0, 0);
  }

  // What the piece in the middle is: its name (a Shiny Piece's in its class's colours, as it
  // falls) and how rare it is
  const rare = new WeakMap();
  function rareWords(shape) {
    if (!rare.has(shape)) rare.set(shape, rarity(state, shape).words);
    return rare.get(shape);
  }
  function info() {
    const n = fallen.length, shape = fallen[index];
    root.classList.toggle("empty", !n);
    prev.disabled = index <= 0;
    next.disabled = index >= n - 1;
    if (!shape) return;
    nameEl.textContent = shape.name;
    nameEl.className = "pgName" + (shape.powerup ? ` shiny cls-${shape.powerup.cls ?? "combo"}` : "");
    rareEl.textContent = rareWords(shape);
  }

  // Where each place on the strip goes, `offset` along: the middle one big and bright, the ones
  // either side smaller and dimmer, and further out, fading away
  function place() {
    for (const s of slots) {
      const p = s.k - offset, a = Math.abs(p);
      const size = a < 1 ? 1 - 0.5 * a : Math.max(0.2, 0.5 - 0.2 * (a - 1));
      const alpha = a < 1 ? 1 - 0.42 * a : Math.max(0, 0.58 * (2 - a));
      s.el.style.transform = `translate(-50%, -50%) translateX(${(p * spacing).toFixed(1)}px) scale(${size.toFixed(3)})`;
      s.el.style.opacity = alpha.toFixed(3);
      s.el.classList.toggle("mid", a < 0.5);
    }
  }

  // The piece `t` along is the one in the middle now, with everything left where it is on the
  // screen (so it can glide home from there)
  function recentre(t) {
    index += t;
    offset -= t;
    for (const s of slots) fill(s);
    info();
  }
  // ...and home it glides. (Toned down, the glide is over at once: index.html)
  let homeTimer = 0;
  function glideHome() {
    track.classList.remove("glide");
    place();
    void track.offsetWidth;
    track.classList.add("glide");
    offset = 0;
    place();
    clearTimeout(homeTimer);
    homeTimer = setTimeout(() => track.classList.remove("glide"), 300);
  }
  // One along, newer (1) or older (-1); at either end, a little bump
  function step(dir) {
    if (!fallen.length) return;
    track.classList.remove("glide");
    offset = 0; // (one still gliding: home already)
    const to = Math.max(0, Math.min(fallen.length - 1, index + dir));
    if (to === index) offset = dir * 0.14;
    else recentre(to - index);
    glideHome();
  }

  /* ---------- swiping ---------- */

  // A finger or the mouse drags the strip along (as far as it likes: it's recentred on the way),
  // a quick flick goes on to the next one, and a tap on the piece either side goes to that one.
  // (A drag that's more up and down than across isn't the gallery's.)
  const drag = { id: null, x: 0, y: 0, from: 0, scale: 1, moved: false, trail: [] };
  stage.addEventListener("pointerdown", (e) => {
    if (!fallen.length || drag.id !== null || e.button > 0 || e.target.closest?.(".pgArrow")) return;
    track.classList.remove("glide");
    place();
    // (the menu may be scaled down to fit: ui.js fitPanel)
    drag.scale = track.getBoundingClientRect().width / Math.max(1, track.offsetWidth) || 1;
    Object.assign(drag, { id: e.pointerId, x: e.clientX, y: e.clientY, from: offset, moved: false, trail: [{ x: e.clientX, t: e.timeStamp }] });
    try { stage.setPointerCapture(e.pointerId); } catch { /* (not everywhere) */ }
  });
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
      drag.moved = true;
      stage.classList.add("dragging");
    }
    let o = drag.from - dx / (spacing * drag.scale);
    while (o > 0.5 && index < fallen.length - 1) { recentre(1); drag.from -= 1; o -= 1; }
    while (o < -0.5 && index > 0) { recentre(-1); drag.from += 1; o += 1; }
    // (past either end it gives, but only a little)
    offset = (o < 0 && index === 0) || (o > 0 && index === fallen.length - 1) ? o * 0.3 : o;
    place();
    drag.trail.push({ x: e.clientX, t: e.timeStamp });
    if (drag.trail.length > 6) drag.trail.shift();
  });
  const letGo = (e) => {
    if (e.pointerId !== drag.id) return;
    drag.id = null;
    stage.classList.remove("dragging");
    if (!drag.moved) {
      if (e.type !== "pointerup") return;
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".pgSlot");
      const s = slots.find(x => x.el === hit);
      if (s?.k) step(Math.sign(s.k));
      return;
    }
    // (how fast it was going as it let go, in pixels a millisecond: left is newer)
    const a = drag.trail[0], b = drag.trail[drag.trail.length - 1];
    const v = e.type === "pointerup" ? (b.x - a.x) / Math.max(1, b.t - a.t) : 0;
    let t = 0;
    if (offset > 0.3 || (v < -0.3 && offset > 0.02)) t = 1;
    else if (offset < -0.3 || (v > 0.3 && offset < -0.02)) t = -1;
    t = Math.max(0, Math.min(fallen.length - 1, index + t)) - index;
    if (t) recentre(t);
    glideHome();
  };
  stage.addEventListener("pointerup", letGo);
  stage.addEventListener("pointercancel", letGo);
  // (a trackpad's sideways swipe, or a sideways wheel: a piece at a time)
  let wheel = 0, wheelAt = 0;
  stage.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (e.timeStamp - wheelAt > 250) wheel = 0;
    wheelAt = e.timeStamp;
    wheel += e.deltaX;
    if (Math.abs(wheel) >= 60) { step(Math.sign(wheel)); wheel = 0; }
  }, { passive: false });
  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));

  return {
    // (each piece once, where it last fell: one that comes again moves up to the newest, under
    // the name and in the colours it came in this time)
    add(shape) {
      if (!shape) return;
      const was = fallen.findIndex(s => s.id === shape.id);
      if (was >= 0) fallen.splice(was, 1);
      fallen.push(shape);
      if (fallen.length > MOST) fallen.shift();
    },
    clear() { fallen.length = 0; index = 0; },
    open() { index = fallen.length - 1; },
    render() {
      index = Math.max(0, Math.min(fallen.length - 1, index));
      spacing = Math.round(Math.max(70, track.clientWidth * 0.38));
      track.classList.remove("glide");
      offset = 0;
      for (const s of slots) fill(s);
      place();
      info();
    },
    // (paused, ← → and A D are the gallery's, nothing else's)
    key(e) {
      const dir = e.code === "ArrowLeft" || e.code === "KeyA" ? -1 : e.code === "ArrowRight" || e.code === "KeyD" ? 1 : 0;
      if (dir) step(dir);
      return !!dir;
    },
  };
}

/* =========================
   The sparkles
   ========================= */

// On `canvas`, behind the pause menu (`panel`) while `showing()`: tiny pixel stars, white with the
// edge's colours split off them (pink and orange one way, cyan and violet the other, gold over
// and violet under), born round the menu's edge and drifting up and away from it as they twinkle
// out; and specks of light rising slowly all over, like dust in the glow. frame(now) every frame
// (src/ui.js).
const COLOURS = { pink: "255,61,139", orange: "255,140,56", gold: "255,214,90", cyan: "86,224,255", violet: "168,108,255", white: "255,255,255" };
const SPECKS = [COLOURS.white, COLOURS.white, COLOURS.pink, COLOURS.orange, COLOURS.gold, COLOURS.cyan, COLOURS.violet];
const PX = 2; // (CSS pixels to one of theirs: chunky, like the board's)

export function createSparkles({ canvas, panel, showing }) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, last = 0, live = false, still = false, clock = 0;
  const stars = [], specks = [];
  const rnd = (lo, hi) => lo + Math.random() * (hi - lo);

  // the menu, in the sparkles' pixels
  function box() {
    const r = panel.getBoundingClientRect(), o = canvas.getBoundingClientRect();
    return { x: (r.left - o.left) / PX, y: (r.top - o.top) / PX, w: r.width / PX, h: r.height / PX };
  }
  // A star somewhere round the menu's edge, just outside it, heading out and up
  function newStar(b, age = 0) {
    const per = 2 * (b.w + b.h);
    let d = Math.random() * per, x, y, nx = 0, ny = 0;
    if (d < b.w) { x = b.x + d; y = b.y; ny = -1; }
    else if ((d -= b.w) < b.h) { x = b.x + b.w; y = b.y + d; nx = 1; }
    else if ((d -= b.h) < b.w) { x = b.x + b.w - d; y = b.y + b.h; ny = 1; }
    else { x = b.x; y = b.y + b.h - (d - b.w); nx = -1; }
    const out = rnd(1, 7), life = rnd(1.4, 3.4);
    return { x: x + nx * out, y: y + ny * out, vx: nx * rnd(2, 7) + rnd(-1.5, 1.5), vy: ny * rnd(2, 6) - rnd(3, 9), age: age * life, life, phase: rnd(0, 7), big: Math.random() < 0.2 };
  }
  // A speck anywhere, rising
  function newSpeck(age = 0) {
    const life = rnd(4, 10);
    return { x: rnd(0, w), y: rnd(h * 0.15, h), vy: -rnd(2, 7), sway: rnd(0.4, 1.6), phase: rnd(0, 7), age: age * life, life, rgb: SPECKS[(Math.random() * SPECKS.length) | 0], a: rnd(0.25, 0.7) };
  }
  const starCount = (b) => Math.round(Math.max(14, Math.min(40, (b.w + b.h) / 9)));
  const speckCount = () => Math.round(Math.max(24, Math.min(110, w * h / 2600)));
  function seed() {
    const b = box();
    stars.length = 0;
    specks.length = 0;
    for (let i = starCount(b); i > 0; i--) stars.push(newStar(b, Math.random()));
    for (let i = speckCount(); i > 0; i--) specks.push(newSpeck(Math.random()));
  }

  function update(dt) {
    clock += dt;
    const b = box();
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.age >= s.life) stars.splice(i, 1);
    }
    for (let i = starCount(b) - stars.length; i > 0; i--) stars.push(newStar(b));
    for (let i = 0; i < specks.length; i++) {
      const p = specks[i];
      p.age += dt;
      p.y += p.vy * dt;
      p.x += Math.sin(clock * p.sway + p.phase) * 1.2 * dt;
      if (p.age >= p.life || p.y < -2) specks[i] = newSpeck();
    }
  }

  const dot = (x, y, rgb, a) => {
    if (a <= 0.02) return;
    ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`;
    ctx.fillRect(x, y, 1, 1);
  };
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const p of specks) {
      const t = p.age / p.life, fade = Math.min(1, t * 5, (1 - t) * 4);
      dot(Math.round(p.x), Math.round(p.y), p.rgb, p.a * fade * (0.7 + 0.3 * Math.sin(clock * 5 + p.phase)));
    }
    // (a star swells and shrinks as it lives, twinkling: its arms one pixel long, then two, and
    // for the odd big one, three)
    for (const s of stars) {
      const life = Math.sin(Math.PI * Math.min(1, s.age / s.life));
      const a = life * (0.75 + 0.25 * Math.sin(clock * 13 + s.phase));
      const x = Math.round(s.x), y = Math.round(s.y);
      dot(x, y, COLOURS.white, a);
      if (life < 0.35) continue;
      dot(x - 1, y, COLOURS.pink, a * 0.9);
      dot(x + 1, y, COLOURS.cyan, a * 0.9);
      dot(x, y - 1, COLOURS.gold, a * 0.75);
      dot(x, y + 1, COLOURS.violet, a * 0.75);
      if (life < 0.8) continue;
      dot(x - 2, y, COLOURS.orange, a * 0.5);
      dot(x + 2, y, COLOURS.violet, a * 0.5);
      dot(x, y - 2, COLOURS.white, a * 0.35);
      dot(x, y + 2, COLOURS.white, a * 0.35);
      if (!s.big || life < 0.92) continue;
      dot(x - 3, y, COLOURS.gold, a * 0.3);
      dot(x + 3, y, COLOURS.cyan, a * 0.3);
      dot(x, y - 3, COLOURS.white, a * 0.2);
      dot(x, y + 3, COLOURS.white, a * 0.2);
    }
  }

  return {
    frame(now) {
      if (!showing()) {
        if (live) { ctx.clearRect(0, 0, w, h); live = false; }
        return;
      }
      const cw = Math.ceil(canvas.clientWidth / PX), ch = Math.ceil(canvas.clientHeight / PX);
      if (!cw || !ch) return;
      const resized = cw !== w || ch !== h;
      if (resized) { canvas.width = w = cw; canvas.height = h = ch; }
      const calm = calmFx();
      if (!live || resized) { live = true; still = false; last = now; seed(); }
      if (calm && still) return; // (toned down: one still picture of them)
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (!calm) update(dt);
      draw();
      still = calm;
    },
  };
}
