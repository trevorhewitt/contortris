// ============================================================
// HOME — the home screen (DOM)
// ============================================================
// Behind the menu, turbo zen plays itself (mode "home": no words anywhere in it) on a board a
// little wider than usual, seen through a camera that works in shots, like a film: a steady pan
// along the stack, or a push in, or a pull back, and then a cut to the next. Over it, effects
// drift by, a different kind every so often. In front of it, the logo and the modes. Left alone a
// while (CONFIG.home.idleMs), all of that fades away into plain turbo zen filling the window, with
// a small button to play (a fresh one whenever the window changes size); any touch, click, key or
// move of the mouse brings the home screen back. (The same from the achievements, and from the
// game over: anywhere but How to play, and anywhere a game is still going on.) And choosing a mode: the screen breaks
// into squares that shoot away from the button, white hot, split into the warm rainbow, and the
// game switches on out of the dark like an old screen.
//
// The board behind the menu is the game's own (state, drawn by the renderer onto the board
// canvas as usual); the home screen only shows it through the camera, on a canvas of its own.
// There are two of them, in fact: the camera cuts between the two boards, mostly, rather than
// around each, so nearly every cut is to somewhere else altogether, as if to another game, not
// just the same board from another angle. Only the one on screen plays (main.js asks
// liveState()); the other waits where it was, which costs nothing. And often a cut is to a mosaic
// instead (src/mosaic.js): a screen packed full of pieces, repeating in every direction, swept
// across at a steady speed, turning and zooming, then back to the boards.

import { CONFIG } from "../config.js";
import { startRun, resetGame, updateGame, getGhostDropY, collides, createGameState, markBoardDirty } from "./game.js";
import { resolvePowerupArea } from "./powerups.js";
import { buildMosaic, paintMosaic } from "./mosaic.js";
import { calmFx } from "./settings.js";
import { drawChromaSquare, drawBlockWithPaintStatic, rainbowRound } from "./render.js";
import { seedRemains, paintRemains } from "./remains.js";
import { getShapePaint } from "./shapes.js";
import { ombre, ombreRGB } from "./util.js";
import { particleBudget, particleLot, alive, fxTier, onFxTier } from "./particles.js";
const H = () => CONFIG.home ?? {};
const rand = (a, b) => a + Math.random() * (b - a);
const pickIn = ([a, b]) => rand(a, b);

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

// How alike two views are, a and b ({ x, y, S }: the middle, in cells, and screen pixels a cell)
// on a screen w × h: the area both take in over the area either does (1 the same view, 0 nothing
// in common; a turn makes no odds).
export function viewOverlap(a, b, w, h) {
  const edges = (v) => [v.x - w / (2 * v.S), v.x + w / (2 * v.S), v.y - h / (2 * v.S), v.y + h / (2 * v.S)];
  const [ax0, ax1, ay0, ay1] = edges(a), [bx0, bx1, by0, by1] = edges(b);
  const both = Math.max(0, Math.min(ax1, bx1) - Math.max(ax0, bx0)) * Math.max(0, Math.min(ay1, by1) - Math.max(ay0, by0));
  return both / ((ax1 - ax0) * (ay1 - ay0) + (bx1 - bx0) * (by1 - by0) - both);
}

// Where the camera is, u (0 to 1) of the way through a shot of a mosaic, s: { a, b }, where it
// starts and where it ends ({ x, y, z, rot }). Steady all the way, from the first frame to the
// last: turning at a steady rate, zooming at a steady rate (as much closer each moment as the
// moment before), and moving across the screen at a steady speed however close it is (across the
// mosaic, then, the closer the slower).
export function mosaicSweep(s, u) {
  const { a, b } = s, r = b.z / a.z;
  const g = Math.abs(r - 1) < 1e-9 ? u : (1 - r ** -u) / (1 - 1 / r);
  return { x: a.x + (b.x - a.x) * g, y: a.y + (b.y - a.y) * g, z: a.z * r ** u, rot: a.rot + (b.rot - a.rot) * u };
}

export function createHome({ state, boardCanvas, setBoardSize, restoreBoard, setWholeWindow, onPlay, onShowMenu, menuShowing, idleFrom = () => (menuShowing() ? "menu" : null), lastMode, hideOverlay }) {
  const $ = (id) => document.getElementById(id);
  // (the effects are drawn over the board on the same canvas: one layer for the browser to put
  // together with the menu, not two)
  const bg = $("homeBg"), fxc = bg, burstc = $("homeBurst"), dark = $("homeDark"), logo = $("homeLogo");
  // (the background's always drawn all over, black first: no see-through, so the browser needn't
  // draw what's under it)
  const bgx = bg.getContext("2d", { alpha: false }), fx = bgx, bx = burstc.getContext("2d");
  const body = document.body;
  // (toned down, by the device or the options: src/settings.js)
  let reduced = calmFx();

  let phase = "off"; // off | home | idle | starting
  let idleAt = 0, warmLeft = 0, resizeTimer = null, last = performance.now(), guardUntil = 0;
  // (idle from where (the home screen, or "off": the game over), and the page to wake up to)
  let fadeFrom = "home", wakeTo = "menu";
  let saved = null; // (what the background mustn't change for the next real game)
  // The second board behind the menu (a game state of its own), whether it's the one on screen,
  // and how much of its quick start it still has to have (game ms, a little each frame)
  let other = null, onOther = false, otherWarm = 0;
  const shown = () => (onOther && other && (phase === "home" || phase === "fading") ? other : state);
  const view = { w: 0, h: 0, dpr: 1, fx: 1, burst: 1 };

  /* ---------- sizes ---------- */

  // (the board behind is pixel art made bigger, and the effects are soft: neither needs every
  // pixel of a big screen, so each is drawn at a resolution that keeps it cheap, and the browser
  // scales it up: how many pixels, the tier's, CONFIG.fx.quality homePixels, homeDpr, burstPixels)
  function sizeCanvases() {
    const vv = window.visualViewport, T = fxTier();
    view.w = Math.max(1, Math.round(vv?.width ?? window.innerWidth));
    view.h = Math.max(1, Math.round(vv?.height ?? window.innerHeight));
    const area = view.w * view.h, dpr = window.devicePixelRatio || 1;
    view.dpr = Math.min(dpr, T.homeDpr ?? 1.5, Math.sqrt((T.homePixels ?? 1.1e6) / area));
    view.fx = view.dpr;
    view.burst = Math.min(dpr, 1.25, Math.sqrt((T.burstPixels ?? 1.2e6) / area));
    const fit = (c, s) => {
      const w = Math.max(1, Math.round(view.w * s)), h = Math.max(1, Math.round(view.h * s));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    };
    fit(bg, view.dpr); fit(burstc, view.burst);
    shade = null;
  }
  // (a new tier: the background at its number of pixels, from the next frame; not in the middle
  // of the warp, which is drawn at the size it started at)
  onFxTier(() => { if (phase === "home" || phase === "fading") sizeCanvases(); });

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
    seedRemains(state, state.allShapes ?? state.shapes); // (layers of it there already: src/remains.js)
    warmLeft = 26000; // (game time: it comes on with something on the board already)
    // (the other board: the same pieces, sets and themes, a game of its own, warmed up a little
    // each frame behind the scenes before the camera ever cuts to it)
    other = createGameState(state.allShapes, state.allPowerups);
    other.groups = state.groups;
    other.threads = state.threads;
    // (and what's been shown, so the two boards don't show the same things: src/main.js)
    other.zenUses = (state.zenUses ??= new Map());
    other.zenPast = state.zenPast;
    other.backdrop = true;
    startRun(other, "home");
    seedRemains(other, other.allShapes ?? other.shapes); // (src/remains.js)
    onOther = false;
    otherWarm = 26000;
    camera.reset();
    newMosaic();
    mosaicAt = performance.now() + pickIn(H().mosaic?.firstMs ?? [4000, 7000]);
  }

  // The next mosaic, packed now and painted a little each frame until it's ready (`mosaic.ready`);
  // whether the camera is on it, and for how many more shots; and when it's next time for one.
  let mosaic = null, onMosaic = 0, mosaicAt = 0;
  function newMosaic() {
    const M = H().mosaic;
    if (!M || reduced) { mosaic = null; return; }
    const m = buildMosaic(state.allShapes ?? state.shapes, state.allPowerups ?? state.powerups, { cols: M.cols ?? 56, rows: M.rows ?? 34 });
    mosaic = { ...paintMosaic(m, M.cellPx ?? 20, undefined, remainsUnder(m, M.cellPx ?? 20)), ready: false };
  }

  function stopBackground() {
    if (state.mode === "home") resetGame(state);
    other = null;
    onOther = false;
    onMosaic = 0;
    window.__homeShellPx = null;
  }

  // (at a cut, most of the time, to the other board (with calmer animations, now and then): once
  // it has something on it, and never in the middle of a powerup going off on this one (unless
  // the camera's on a mosaic, not watching it), nor after only a moment on it; true if it did)
  let boardSince = 0;
  const justSwitched = (now) => now - boardSince < (H().otherBoardAfterMs ?? 1500);
  function maybeSwitchBoards(now, chance = reduced ? H().calmOtherBoard ?? 0.5 : H().otherBoard ?? 0.9) {
    if (!other || otherWarm > 0 || (shown().effect && !camera.shot?.mosaic) || justSwitched(now)) return false;
    if (Math.random() >= chance) return false;
    onOther = !onOther;
    boardSince = now;
    markBoardDirty(shown());
    return true;
  }

  // (of a few goes at make(), the first that looks clearly different from the view `from`, no
  // more of it the same than CONFIG.home.cutOverlap, or else the least like it: [it, whether it
  // is different enough]; seen(it) is its view, { x, y, S })
  function unlike(from, make, seen) {
    const most = H().cutOverlap ?? 0.35;
    let best = null, same = Infinity;
    for (let i = 0; i < 16 && same > most; i++) {
      const it = make(), o = from ? viewOverlap(from, seen(it), view.w, view.h) : 0;
      if (o < same) { best = it; same = o; }
    }
    return [best, same <= most];
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

  // Where the action is, in board cells ({ x0, y0, x1, y1 }, the far edges exclusive): the piece
  // coming down, from a little above where it lands (and with a powerup, all it will reach), the
  // others falling with it, a powerup going off; or null if nothing is.
  function actionBox(must = false) {
    const { cols, rows } = CONFIG.board;
    let box = null;
    const add = (x0, y0, x1, y1) => {
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(cols, x1); y1 = Math.min(rows, y1);
      if (x1 <= x0 || y1 <= y0) return;
      box = box ? { x0: Math.min(box.x0, x0), y0: Math.min(box.y0, y0), x1: Math.max(box.x1, x1), y1: Math.max(box.y1, y1) } : { x0, y0, x1, y1 };
    };
    const addArea = (area) => {
      if (!area?.indices?.length) return;
      let x0 = cols, y0 = rows, x1 = 0, y1 = 0;
      for (const k of area.indices) {
        const x = k % cols, y = (k / cols) | 0;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1);
      }
      add(x0, y0, x1, y1);
    };
    const piece = (p, land) => {
      const mat = p.shape.rotations[p.rotIdx] ?? p.shape.rotations[0];
      add(p.x, land - (must ? 0 : 3), p.x + mat[0].length, land + mat.length); // (and a little of the way down)
      if (p.shape.powerup && !must) addArea(resolvePowerupArea(p.shape.powerup, p.rotIdx, p.x, land, cols, rows));
    };
    // (`must`: just where things land and go off, which the shot has to see; otherwise all a
    // powerup will reach, which it should see as much of as it can)
    const B = shown();
    if (B.effect?.area) { if (must) { const c = B.effect.centre; add(Math.floor(c.x) - 1, Math.floor(c.y) - 1, Math.floor(c.x) + 2, Math.floor(c.y) + 2); } else addArea(B.effect.area); }
    const a = B.active;
    if (a) piece(a, Math.max(0, getGhostDropY(B) ?? a.y));
    for (const f of B.flock ?? []) {
      if (!f?.shape) continue;
      let land = f.land;
      if (land == null) { const mat = f.shape.rotations[f.rotIdx] ?? f.shape.rotations[0]; land = Math.max(0, f.y ?? 0); while (!collides(B, f.x, land + 1, mat)) land++; }
      piece(f, land);
    }
    return box;
  }
  // ...and where the next piece or two will land, if the director has planned it already
  function nextBox() {
    const { cols, rows } = CONFIG.board;
    let box = null;
    const B = shown();
    for (const it of (B.zen?.queue ?? []).slice(0, 2)) {
      const t = it?.target, mat = it?.shape?.rotations?.[t?.rot ?? 0];
      if (!t || !mat || t.x == null) continue;
      const w = mat[0].length, h = mat.length;
      let top = rows;
      for (let x = Math.max(0, t.x); x < Math.min(cols, t.x + w); x++) for (let y = 0; y < top; y++) if (B.board[y]?.[x]) { top = y; break; }
      const b = { x0: Math.max(0, t.x), y0: Math.max(0, top - h - 2), x1: Math.min(cols, t.x + w), y1: Math.min(rows, top + 1) };
      box = box ? { x0: Math.min(box.x0, b.x0), y0: Math.min(box.y0, b.y0), x1: Math.max(box.x1, b.x1), y1: Math.max(box.y1, b.y1) } : b;
    }
    return box;
  }
  const union = (a, b) => (!a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
  // ...or else the top of the stack, somewhere
  function stackBox() {
    const { cols, rows } = CONFIG.board;
    let top = rows;
    const B = shown();
    for (let y = 0; y < rows; y++) if (B.board[y]?.some(Boolean)) { top = y; break; }
    const x = Math.floor(Math.random() * Math.max(1, cols - 8));
    return { x0: x, y0: Math.max(0, top - 4), x1: Math.min(cols, x + 8), y1: Math.min(rows, top + 4) };
  }

  // In shots: each a steady, straight move for a few seconds (CONFIG.home.shotMs) framed on where
  // the action is: a pan past it, or a push in on it, or a pull back from it, now and then at a
  // slight tilt; never quite still. Then a cut to the next. And the moment the action is
  // somewhere the shot can't see (the next piece lands further along, a powerup's about to go
  // off out of frame), a cut to it, so little happens out of sight. Every cut is to something
  // clearly different, as if to another game: the other board, mostly, or a mosaic, and only now
  // and then somewhere else on this board, never much the same view from another angle
  // (CONFIG.home.cutOverlap); with nowhere like that to go, no cut, and the shot goes on from
  // where it is.
  const SHOTS = ["pan", "pan", "pan", "push", "pull"];
  const camera = {
    shot: null, x: 0, y: 0, z: 1, rot: 0, S: 1,
    reset() { this.shot = null; },
    half(z, rot = this.rot, cover = this.shot?.cover ?? 1) {
      const S = cover * z, ca = Math.abs(Math.cos(rot)), sa = Math.abs(Math.sin(rot));
      return { hw: (view.w * ca + view.h * sa) / (2 * S), hh: (view.w * sa + view.h * ca) / (2 * S) };
    },
    // (does the view at the moment take in all of this box, with `m` cells to spare?)
    sees(b, m = 0.5) {
      const { hw, hh } = this.half(this.z), { cols, rows } = CONFIG.board, e = 0.01;
      // (the room to spare only where there's board: a piece on the floor is seen with none under it)
      return Math.max(0, b.x0 - m) >= this.x - hw - e && Math.min(cols, b.x1 + m) <= this.x + hw + e
        && Math.max(0, b.y0 - m) >= this.y - hh - e && Math.min(rows, b.y1 + m) <= this.y + hh + e;
    },
    // Frames the next shot, on the board on screen: given `from`, the view on screen just before a
    // cut, the least like it of a few goes (unlike), and with `strict`, none at all if even that
    // is much the same view (false). `keep`: no cut, the shot going on from just where the view is.
    frame(now, { from = null, strict = false, keep = false } = {}) {
      const must = actionBox(true), next = nextBox();
      const boxes = { must, wants: [union(actionBox(), next), union(must, next), must], stack: stackBox() };
      const [shot, ok] = unlike(from, () => this.plan(now, boxes, keep), (s) => ({ x: s.a.x, y: s.a.y, S: s.cover * s.z0 }));
      if (strict && !ok) return false;
      this.shot = shot;
      return true;
    },
    // (a go at the next shot, around where the action is: `boxes`, from frame)
    plan(now, { must, wants, stack }, keep) {
      const c = H(), { cols, rows } = CONFIG.board, m = 1.2;
      const turn = (c.maxTurn ?? 5) * Math.PI / 180;
      const rot = keep ? this.rot : reduced || Math.random() > (c.tiltChance ?? 0.3) ? 0 : rand(-turn, turn);
      const cover = coverScale(view.w, view.h, rot, cols, rows), zMax = c.zoom ?? 2.6;
      const half = (z) => this.half(z, rot, cover);
      // what to frame: all of the action and the next landings; or, if that's more than the view
      // can take in, the landings without all a powerup will reach; or just where things land
      const fits = (f) => { const h = half(1); return f && Math.min(cols, f.x1 + m) - Math.max(0, f.x0 - m) <= 2 * h.hw && Math.min(rows, f.y1 + m) - Math.max(0, f.y0 - m) <= 2 * h.hh; };
      const focus = wants.find(fits) ?? must ?? stack;
      // the closest it can be with all of the action in view, with room to spare (but never so
      // close that the next piece is likely to land out of sight: at least CONFIG.home.minView
      // cells across and down, or the whole board where that's smaller)
      const bw = Math.min(cols, focus.x1 + m) - Math.max(0, focus.x0 - m), bh = Math.min(rows, focus.y1 + m) - Math.max(0, focus.y0 - m);
      const [vx, vy] = c.minView ?? [10, 9];
      const h1 = half(1);
      const zCap = Math.max(1, Math.min(zMax, (2 * h1.hw) / Math.min(cols, vx), (2 * h1.hh) / Math.min(rows, vy)));
      const zTight = Math.max(1, Math.min(zCap, (2 * h1.hw) / bw, (2 * h1.hh) / bh));
      // the centres the view can have with the box in it, at zoom z (and never past the board's edge)
      const range = (z) => {
        const { hw, hh } = half(z);
        const lims = (a0, a1, h, n) => {
          const lo = Math.max(h, Math.min(n, a1 + m) - h), hi = Math.min(n - h, Math.max(0, a0 - m) + h);
          return lo <= hi ? [lo, hi] : Array(2).fill(Math.max(h, Math.min(n - h, (a0 + a1) / 2)));
        };
        return { x: lims(focus.x0, focus.x1, hw, cols), y: lims(focus.y0, focus.y1, hh, rows) };
      };
      const mid = (r) => (r[0] + r[1]) / 2, at = (r) => ({ x: mid(r.x), y: mid(r.y) });
      let z = Math.max(1, zTight * rand(0.6, 0.85));
      let kind = reduced ? "still" : SHOTS[Math.floor(Math.random() * SHOTS.length)];
      let z0 = z, z1 = z, a, b;
      // a pan: from one end to the other of where the view can be with it all in sight, the
      // longer way; it needs a good few cells of room, or else it's a push or a pull
      const pan = () => {
        const r = range(z), dx = r.x[1] - r.x[0], dy = r.y[1] - r.y[0];
        if (Math.max(dx, dy) < Math.max(2.5, 0.25 * 2 * half(z).hw)) return false;
        const ends = dx >= dy ? [{ x: r.x[0], y: mid(r.y) }, { x: r.x[1], y: mid(r.y) }] : [{ x: mid(r.x), y: r.y[0] }, { x: mid(r.x), y: r.y[1] }];
        [a, b] = Math.random() < 0.5 ? ends : [ends[1], ends[0]];
        return true;
      };
      // a push in (or a pull back): between a wide view and the closest that still has it all
      const zoom = (inward) => {
        const close = Math.max(1, Math.min(zTight, z * rand(1.1, 1.3))), wide = Math.max(1, close / rand(1.35, 1.7));
        if (close / wide < 1.08) return false;
        [z0, z1] = inward ? [wide, close] : [close, wide];
        a = at(range(z0)); b = at(range(z1));
        return true;
      };
      if (kind === "pan") { if (!pan() && !zoom(Math.random() < 0.5)) kind = "still"; }
      else if (kind === "push" || kind === "pull") { if (!zoom(kind === "push") && !pan()) kind = "still"; }
      if (kind === "still") {
        // (never quite still, though: a slow drift in)
        z0 = z; z1 = Math.min(zMax, z * 1.05);
        a = at(range(z0)); b = at(range(z1));
      }
      if (keep) { a = { x: this.x, y: this.y }; z0 = this.z; }
      const [m0, m1] = c.shotMs ?? [2600, 4200];
      return { start: now, end: now + rand(m0, m1), a, b, z0, z1, rot, cover, kind, focus };
    },
    // A cut from the boards: to the mosaic when it's time for one (but not in the middle of a
    // powerup going off, nor straight after another cut); most of the time to the other board; or
    // else to somewhere on this one clearly different from what's on screen, or failing that, to
    // the other board after all. False if there's nowhere to go. `wait`: a cut that can wait (at
    // the end of a shot, or to where the next piece lands, when it isn't a powerup), which only
    // just after a cut to this board, or with a powerup going off on it, waits until it can be to
    // the other, rather than be to this one again (false).
    cut(now, wait = false) {
      const M = H().mosaic;
      if (mosaic?.ready && !reduced && now >= mosaicAt && !shown().effect && now - this.shot.start > (H().minShotMs ?? 600)) {
        const [a, b] = M.shots ?? [1, 1];
        onMosaic = a + Math.floor(Math.random() * (b - a + 1));
        mosaicAt = now + pickIn(M.everyMs ?? [8000, 13000]);
        this.mosaicShot(now);
        return true;
      }
      const from = { x: this.x, y: this.y, S: this.S };
      if (maybeSwitchBoards(now)) return this.frame(now, { from });
      if (wait && (justSwitched(now) || shown().effect)) return false;
      return this.frame(now, { from, strict: true }) || (maybeSwitchBoards(now, 1) && this.frame(now, { from }));
    },
    step(dt, now) {
      const s0 = this.shot, was = shown(), last = { x: this.x, y: this.y, rot: this.rot, S: this.S, tiles: s0?.mosaic ? mosaic : null };
      if (mosaic && !mosaic.ready) mosaic.ready = mosaic.step(3);
      if (!s0) this.frame(now);
      else if (now >= s0.end) {
        // a cut: to the next shot of a mosaic, or back from it (to the other board, mostly, as at
        // any cut); or from the boards, wherever cut() says, and with nowhere clearly different to
        // go (or a cut that waits), no cut: on from just here
        if (onMosaic > 0 && --onMosaic > 0) this.mosaicShot(now, true);
        else if (s0.mosaic) { newMosaic(); maybeSwitchBoards(now); markBoardDirty(shown()); this.frame(now); } // (and a fresh one for next time)
        else if (!this.cut(now, !reduced)) this.frame(now, { keep: true });
      } else if (!s0.mosaic && !reduced) {
        // the next thing to land, or go off, somewhere this shot can't see: cut to it (a new
        // piece the moment it comes, so you see it come down, and a powerup the moment it goes
        // off; otherwise never two cuts within minShotMs)
        const B = shown(), b = actionBox(true), piece = B.active?.shape ?? null;
        const fresh = piece !== this.piece, fired = !!B.effect && B.effect !== this.effect;
        this.piece = piece;
        this.effect = B.effect;
        if (b && !this.sees(b, 0.2) && (fresh || fired || now - s0.start > (H().minShotMs ?? 600))) {
          if (now - s0.start > (H().minShotMs ?? 600) || fired || piece?.powerup) this.cut(now, !fired && !piece?.powerup);
        }
      }
      // (a cut to the other board: until the next frame the board canvas still has the one it's
      // leaving on it, so this frame keeps the view it had, of that board or of the mosaic, not
      // that board from the new angle; and the piece coming down on the other isn't a new one just
      // because it's new to the camera)
      this.hold = shown() !== was ? last : null;
      if (this.hold) this.piece = shown().active?.shape ?? null;
      if (this.shot.mosaic) return this.stepMosaic(now);
      const s = this.shot, u = Math.min(1, (now - s.start) / (s.end - s.start));
      this.rot = s.rot;
      this.z = s.z0 + (s.z1 - s.z0) * u;
      this.S = s.cover * this.z;
      const { hw, hh } = this.half(this.z), { cols, rows } = CONFIG.board;
      // (straight and steady; and never so far that anything beyond the board shows)
      this.x = Math.max(hw, Math.min(cols - hw, s.a.x + (s.b.x - s.a.x) * u));
      this.y = Math.max(hh, Math.min(rows - hh, s.a.y + (s.b.y - s.a.y) * u));
    },
    // A shot of the mosaic: a sweep across it in a straight line, turning and zooming as it goes
    // (CONFIG.home.mosaic), at a steady speed from the first frame to the cut (mosaicSweep). The
    // mosaic repeats in every direction, so a sweep can go anywhere and never comes to an edge.
    // `after` another shot of it: from somewhere clearly different from where that one ended
    // (unlike, by whichever of its repeats is nearest).
    mosaicShot(now, after = false) {
      const M = H().mosaic, m = mosaic.mosaic, turn = (M.maxTurn ?? 30) * Math.PI / 180;
      const [zl, zh] = M.zoom ?? [1.15, 3.4], [m0, m1] = M.shotMs ?? [1000, 1700];
      // (a sweep, mostly, off in any direction at `speed` screens a second, the screen's longer
      // side; or a turn and a zoom about one spot, in, or out from close enough that it ends up
      // no wider than the mosaic filling the screen)
      const zooming = Math.random() < 0.3, outward = zooming && Math.random() < 0.5;
      const spot = (z = rand(zl, zh)) => ({ x: rand(0, m.cols), y: rand(0, m.rows), z, rot: rand(-turn, turn) });
      const from = after && { x: this.x, y: this.y, S: this.S };
      const near = (p, n, f) => f + ((((p - f) % n) + 1.5 * n) % n) - n / 2;
      const seen = (p) => ({ x: from ? near(p.x, m.cols, from.x) : p.x, y: from ? near(p.y, m.rows, from.y) : p.y, S: coverScale(view.w, view.h, p.rot, m.cols, m.rows) * p.z });
      const [a] = unlike(from, () => spot(outward ? rand(Math.min(2, zh), zh) : undefined), seen);
      const T = rand(m0, m1), b = spot(zooming ? a.z * (outward ? 0.5 : 1.8) : undefined);
      const v = (zooming ? 0.08 : pickIn(M.speed ?? [0.35, 0.9])) * Math.max(view.w, view.h);
      // (as close as filling the screen with the mosaic at the shot's most turned, times z: so
      // the screen never takes in more than one of its repeats, nor any piece twice)
      const base = coverScale(view.w, view.h, Math.max(Math.abs(a.rot), Math.abs(b.rot)), m.cols, m.rows);
      // (how far it goes, in cells, for that speed across the screen: mosaicSweep)
      const r = b.z / a.z, S0 = base * a.z, way = rand(0, 2 * Math.PI);
      const far = Math.abs(r - 1) < 1e-9 ? v * T / 1000 / S0 : v * T / 1000 * (1 - 1 / r) / (S0 * Math.log(r));
      b.x = a.x + Math.cos(way) * far;
      b.y = a.y + Math.sin(way) * far;
      this.shot = { mosaic: true, start: now, end: now + T, a, b, base };
    },
    stepMosaic(now) {
      const s = this.shot, p = mosaicSweep(s, Math.min(1, (now - s.start) / (s.end - s.start)));
      Object.assign(this, p, { S: s.base * p.z });
    },
    draw() {
      const h = this.hold;
      if (h?.tiles) return this.drawImage(h.tiles.canvas, h.tiles.mosaic.cols, h, h.tiles);
      if (this.shot?.mosaic && mosaic) return this.drawImage(mosaic.canvas, mosaic.mosaic.cols, this, mosaic);
      this.drawImage(boardCanvas, CONFIG.board.cols, h ?? this);
    },
    // (`tiled`: the mosaic, repeated in every direction, as much of it as the screen takes in)
    drawImage(img, cols, v = this, tiled = null) {
      const pc = img.width / cols, d = view.dpr;
      bgx.setTransform(1, 0, 0, 1, 0, 0);
      bgx.fillStyle = "#000";
      bgx.fillRect(0, 0, bg.width, bg.height);
      bgx.imageSmoothingEnabled = false;
      bgx.translate(bg.width / 2, bg.height / 2);
      bgx.rotate(v.rot);
      const k = v.S * d / pc;
      bgx.scale(k, k);
      bgx.translate(-v.x * pc, -v.y * pc);
      if (!tiled) { bgx.drawImage(img, 0, 0); return; }
      const ca = Math.abs(Math.cos(v.rot)), sa = Math.abs(Math.sin(v.rot));
      const hw = (view.w * ca + view.h * sa) / (2 * v.S) + 1, hh = (view.w * sa + view.h * ca) / (2 * v.S) + 1;
      bgx.fillStyle = tiled.pattern ??= bgx.createPattern(img, "repeat");
      bgx.fillRect((v.x - hw) * pc, (v.y - hh) * pc, 2 * hw * pc, 2 * hh * pc);
    },
  };

  /* ---------- calmer animations: tiled boards, fading ---------- */

  // With calmer animations (src/settings.js): no board playing behind it and no camera moving,
  // just a mosaic, still and straight, and every so often a new one fading in over it, slowly
  // (CONFIG.home.calm).
  const calm = { cur: null, next: null, since: 0, fadeFrom: null };
  function calmMosaic() {
    const M = H().mosaic ?? {};
    const m = buildMosaic(state.allShapes ?? state.shapes, state.allPowerups ?? state.powerups, { cols: M.cols ?? 56, rows: M.rows ?? 34 });
    return { ...paintMosaic(m, M.cellPx ?? 20, undefined, remainsUnder(m, M.cellPx ?? 20)), ready: false, x: rand(0, m.cols), y: rand(0, m.rows) };
  }

  // A mosaic with layers of what destroyed blocks leave behind under it, as the boards have
  // (src/remains.js): some of its pieces gone (CONFIG.home.mosaic.goneShare), the newest of them,
  // and made-up ones of its own pieces behind those. (Painted first: paintMosaic's `under`.)
  function remainsUnder(m, cellPx) {
    if (!CONFIG.remains?.enabled) return null;
    const share = H().mosaic?.goneShare ?? 0.3, gone = [];
    const pieces = [...new Set(m.pieces.map(p => p.shape))];
    m.pieces = m.pieces.filter(p => {
      if (Math.random() >= share) return true;
      const mat = p.shape.rotations[p.rot];
      for (let j = 0; j < mat.length; j++) for (let k = 0; k < mat[0].length; k++) {
        if (mat[j][k]) gone.push({ x: p.x + k, y: p.y + j, cell: { paint: getShapePaint(p.shape, p.rot, k, j), style: p.shape.style ?? {} } });
      }
      return false;
    });
    const sprites = new Map();
    const sprite = (paint, style) => {
      let cv = sprites.get(paint);
      if (!cv) {
        cv = document.createElement("canvas");
        cv.width = cv.height = cellPx;
        drawBlockWithPaintStatic(cv.getContext("2d"), 0, 0, cellPx, paint, style);
        sprites.set(paint, cv);
      }
      return cv;
    };
    return paintRemains({ cols: m.cols, rows: m.rows, cell: cellPx, pieces, gone, sprite, calm: calmFx() });
  }
  function drawCalm(now) {
    const C = H().calm ?? {}, hold = C.holdMs ?? 9000, fade = C.fadeMs ?? 3000;
    if (!calm.cur) {
      calm.cur = calmMosaic();
      while (!calm.cur.ready) calm.cur.ready = calm.cur.step(50);
      calm.since = now;
    }
    // (the next one packed and painted a little each frame, well before it's due)
    if (!calm.next && now - calm.since > hold / 2) calm.next = calmMosaic();
    if (calm.next && !calm.next.ready) calm.next.ready = calm.next.step(3);
    if (calm.next?.ready && calm.fadeFrom == null && now - calm.since >= hold) calm.fadeFrom = now;
    const u = calm.fadeFrom == null ? 0 : Math.min(1, (now - calm.fadeFrom) / fade);
    drawTiles(calm.cur, 1, C.zoom ?? 1.6, true);
    if (u > 0) drawTiles(calm.next, u * u * (3 - 2 * u), C.zoom ?? 1.6, false);
    if (u >= 1) { calm.cur = calm.next; calm.next = null; calm.fadeFrom = null; calm.since = now; }
  }
  // (a mosaic filling the screen, repeated in every direction, at `alpha`; `clear`: on black)
  function drawTiles(t, alpha, z, clear) {
    const m = t.mosaic, pc = t.canvas.width / m.cols, S = coverScale(view.w, view.h, 0, m.cols, m.rows) * z;
    bgx.setTransform(1, 0, 0, 1, 0, 0);
    if (clear) { bgx.fillStyle = "#000"; bgx.fillRect(0, 0, bg.width, bg.height); }
    bgx.globalAlpha = alpha;
    bgx.imageSmoothingEnabled = false;
    bgx.translate(bg.width / 2, bg.height / 2);
    const k = S * view.dpr / pc;
    bgx.scale(k, k);
    bgx.translate(-t.x * pc, -t.y * pc);
    const hw = view.w / (2 * S) + 1, hh = view.h / (2 * S) + 1;
    bgx.fillStyle = t.pattern ??= bgx.createPattern(t.canvas, "repeat");
    bgx.fillRect((t.x - hw) * pc, (t.y - hh) * pc, 2 * hw * pc, 2 * hh * pc);
    bgx.globalAlpha = 1;
  }

  /* ---------- the logo ---------- */

  // A different move every few seconds, passed from letter to letter along the word: a spin on
  // one axis or another, a grow, a shrink, a hop, a wave; or the whole word at once (index.html,
  // .homeLogo.fx-...)
  const LOGO_FX = ["spin", "flip", "tumble", "twist", "grow", "shrink", "hop", "wave", "spinAll", "growAll"];
  let logoFx = null, logoAt = 0;
  function stepLogo(now) {
    if (!logo || reduced || now < logoAt) return;
    logoAt = now + (H().logoEvery ?? 2800);
    const next = LOGO_FX.filter(f => f !== logoFx)[Math.floor(Math.random() * (LOGO_FX.length - 1))];
    if (logoFx) logo.classList.remove(`fx-${logoFx}`);
    void logo.offsetWidth; // (so the same move can start again)
    logo.classList.add(`fx-${next}`);
    logoFx = next;
  }

  /* ---------- the effects over it ---------- */

  const MOODS = ["embers", "sparkles", "confetti", "comets", "snow"];
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
    tint.addColorStop(0, ombre(0, 0.08)); tint.addColorStop(0.5, ombre(0.25, 0.05)); tint.addColorStop(1, ombre(0.8, 0.08));
    c.fillStyle = tint; c.fillRect(0, 0, w, h);
    const v = c.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.55)");
    c.fillStyle = v; c.fillRect(0, 0, w, h);
    return shade;
  }
  // (a soft glow in one of the warm rainbow's colours, t of the way round it: made once each)
  const glows = new Map();
  function glow(t) {
    const key = Math.round((((t % 1) + 1) % 1) * 20) % 20;
    let g = glows.get(key);
    if (!g) {
      g = document.createElement("canvas");
      g.width = g.height = 64;
      const c = g.getContext("2d"), grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, ombre(key / 20, 1, 0.6));
      grad.addColorStop(0.25, ombre(key / 20, 0.55, 0.1));
      grad.addColorStop(1, ombre(key / 20, 0));
      c.fillStyle = grad;
      c.fillRect(0, 0, 64, 64);
      glows.set(key, g);
    }
    return g;
  }
  // (each of them white, split into the warm rainbow, and glowing one of its colours: t)
  function spawnMote(kind, W, Hh, now) {
    const m = { kind, t: Math.random(), age: 0, rot: rand(0, 6.28), vr: rand(-2, 2), lot: particleLot() };
    if (kind === "embers") Object.assign(m, { x: rand(0, W), y: Hh + 10, vx: rand(-12, 12), vy: rand(-70, -30), size: rand(6, 16), life: rand(5, 9), t: rand(0, 0.45) });
    else if (kind === "sparkles") Object.assign(m, { x: rand(0, W), y: rand(0, Hh), vx: 0, vy: 0, size: rand(8, 22), life: rand(1.2, 2.4) });
    else if (kind === "confetti") Object.assign(m, { x: rand(0, W), y: -10, vx: rand(-25, 25), vy: rand(30, 80), size: rand(4, 9), life: rand(7, 12) });
    else if (kind === "comets") { const fromLeft = Math.random() < 0.5; Object.assign(m, { x: fromLeft ? -40 : W + 40, y: rand(-0.1, 0.6) * Hh, vx: (fromLeft ? 1 : -1) * rand(380, 620), vy: rand(80, 200), size: rand(3, 6), life: 3 }); }
    else Object.assign(m, { x: rand(0, W), y: -10, vx: rand(-10, 10), vy: rand(15, 40), size: rand(2, 5), life: rand(10, 16), phase: rand(0, 6.28), t: rand(0.58, 0.7) }); // snow
    return m;
  }
  const RATE = { embers: 9, sparkles: 7, confetti: 10, comets: 0.7, snow: 16 }; // (a second, on a 1000×700 screen)
  function stepFx(dt, now) {
    const W = view.w, Hh = view.h, d = view.fx, s = dt / 1000;
    if (now >= moodUntil) {
      const others = MOODS.filter(m => m !== mood);
      mood = others[Math.floor(Math.random() * others.length)];
      moodUntil = now + pickIn(H().fxEvery ?? [14000, 22000]);
    }
    // (fewer of them while the frames lag, and those going thin out; and no more at once than
    // the tier has: src/particles.js)
    const area = (W * Hh) / 700000, most = fxTier().motes ?? 260;
    spawnAcc += (RATE[mood] ?? 6) * area * s * (reduced ? 0.3 : 1) * particleBudget();
    while (spawnAcc >= 1 && motes.length < most) { spawnAcc--; motes.push(spawnMote(mood, W, Hh, now)); }
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.imageSmoothingEnabled = true;
    fx.drawImage(shading(), 0, 0, fxc.width, fxc.height);
    fx.globalCompositeOperation = "lighter";
    let n = 0;
    for (const m of motes) {
      m.age += s;
      if (m.age >= m.life || !alive(m)) continue;
      motes[n++] = m;
      const t = m.age / m.life, fade = Math.min(1, t * 5, (1 - t) * 3);
      if (m.kind === "snow") m.x += Math.sin(m.age * 2 + m.phase) * 18 * s;
      m.x += m.vx * s; m.y += m.vy * s; m.rot += m.vr * s;
      const x = m.x * d, y = m.y * d, z = m.size * d, a = fade * (m.kind === "snow" ? 0.6 : 0.85);
      const sp = Math.hypot(m.vx, m.vy), ux = sp ? m.vx / sp : 0, uy = sp ? m.vy / sp : 1;
      fx.globalAlpha = a;
      if (m.kind === "confetti") {
        // (a white square tumbling down, its split opening and closing as it turns)
        const w = z * (0.55 + 0.45 * Math.abs(Math.cos(m.rot)));
        drawChromaSquare(fx, x, y, w, Math.cos(m.rot), Math.sin(m.rot), d * 1.6, a);
      } else if (m.kind === "sparkles") {
        const p = Math.sin(t * Math.PI), r = z * p;
        fx.drawImage(glow(m.t), x - r, y - r, r * 2, r * 2);
        fx.fillStyle = "#fff";
        fx.fillRect(x - r, y - d * 0.75, r * 2, d * 1.5);
        fx.fillRect(x - d * 0.75, y - r, d * 1.5, r * 2);
      } else if (m.kind === "comets") {
        // (a tail through the warm rainbow, a white hot head)
        const tail = fx.createLinearGradient(x, y, x - m.vx * 0.16 * d, y - m.vy * 0.16 * d);
        tail.addColorStop(0, ombre(m.t, 0.9, 0.3)); tail.addColorStop(0.5, ombre(m.t + 0.2, 0.5)); tail.addColorStop(1, ombre(m.t + 0.4, 0));
        fx.strokeStyle = tail;
        fx.lineWidth = z * 0.7;
        fx.beginPath(); fx.moveTo(x, y); fx.lineTo(x - m.vx * 0.16 * d, y - m.vy * 0.16 * d); fx.stroke();
        fx.drawImage(glow(m.t), x - z * 3, y - z * 3, z * 6, z * 6);
        drawChromaSquare(fx, x, y, z * 0.9, ux, uy, d * 2.2, a);
      } else if (m.kind === "embers") {
        fx.drawImage(glow(m.t), x - z, y - z, z * 2, z * 2);
        drawChromaSquare(fx, x, y, Math.max(d * 2, z * 0.28), ux, uy, d * 1.2, a);
      } else {
        fx.drawImage(glow(m.t), x - z, y - z, z * 2, z * 2);
        fx.fillStyle = "#fff";
        fx.fillRect(x - z * 0.3, y - z * 0.3, z * 0.6, z * 0.6);
      }
    }
    motes.length = n;
    fx.globalAlpha = 1;
    fx.globalCompositeOperation = "source-over";
  }

  /* ---------- left alone: plain turbo zen ---------- */

  function noteInput() { idleAt = performance.now() + (H().idleMs ?? 30000); }

  function goIdle() {
    if (phase !== "home" && phase !== "off") return;
    fadeFrom = phase;
    wakeTo = idleFrom() ?? "menu";
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
    }, 1000);
  }

  function startIdleTurbo() {
    restoreBoard();
    setWholeWindow(false);
    setWholeWindow(true);
    resetGame(state);
    startRun(state, "turbo");
    seedRemains(state, state.allShapes ?? state.shapes); // (src/remains.js)
    state.backdrop = true;
    state.speed = 1;
  }

  function leaveIdle() {
    if (phase !== "idle" && phase !== "fading") return;
    const fading = phase === "fading";
    if (fading) body.classList.remove("homeFade");
    if (!fading) {
      resetGame(state);
      setWholeWindow(false);
    }
    // (caught while it was still fading: back to just where it was)
    phase = fading ? fadeFrom : "off";
    noteInput();
    // (the tap that woke it isn't also a tap on whatever button comes up under it)
    guardUntil = performance.now() + 500;
    if (!fading) onShowMenu(wakeTo);
  }

  /* ---------- the way into a game ---------- */

  // Choosing a mode: the screen breaks into squares, in a wave going out from the button, and as
  // the wave reaches each one it heats up white and shoots away from the button, faster and
  // faster, out past the edges of the screen: split into the warm rainbow (pink, orange and gold
  // trailing, cyan and violet ahead), leaving a glowing trail in the rainbow's colour for the way
  // it's going (all of them together: a wheel of it). A ring of the rainbow and a flash of light
  // go out from the button with the wave. Then dark, and the board switches on out of it like an
  // old screen (finishStart: index.html .crtOn).
  const TRAILS = 24; // (the trails' colours, a slice of the wheel each: drawn a slice at a time)
  const trails = Array.from({ length: TRAILS }, () => []);
  const bits = [];
  let startAt = 0, endAt = 0, playMode = null, darkTimer = null, warp = null;

  function burstFrom(cx, cy) {
    const W = view.w, Hh = view.h;
    bits.length = 0;
    const far = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, Hh - cy), Math.hypot(W - cx, Hh - cy));
    // (the wave gets to the furthest corner in waveS seconds; what it's reached speeds up by
    // accel, in screen sizes a second each second)
    // (a tier that says so has it simpler from the start: CONFIG.fx.quality warpLite)
    const T = fxTier();
    warp = { cx, cy, far, speed: far / (H().warp?.waveS ?? 0.34), accel: Math.hypot(W, Hh) * (H().warp?.accel ?? 5), slow: T.warpLite ? 3 : 0 };
    // (fewer of them, and bigger, while the frames lag, and on a lighter tier: src/particles.js)
    const squares = Math.min(H().warp?.squares ?? 1800, T.warpSquares ?? Infinity) * particleBudget();
    const g = Math.max(7, Math.round(Math.sqrt(W * Hh / squares)));
    // the board behind, a square at a time
    const sw = Math.ceil(W / g), sh = Math.ceil(Hh / g);
    const small = document.createElement("canvas");
    small.width = sw; small.height = sh;
    const sx = small.getContext("2d", { willReadFrequently: true });
    sx.drawImage(bg, 0, 0, sw, sh);
    let px = null;
    try { px = sx.getImageData(0, 0, sw, sh).data; } catch { px = null; }
    // (each square off the way it's facing from the button, give or take a little: straight out,
    // the rows and columns either side of the button would open up into dark lines)
    const add = (x, y, size, [r, gg, b], kick = 1) => {
      const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy) || 1;
      const way = Math.atan2(dy, dx) + rand(-0.07, 0.07);
      const turn = (way / (Math.PI * 2) + 1 + rand(-0.02, 0.02)) % 1;
      bits.push({
        x, y, size, fill: `rgb(${r},${gg},${b})`, ux: Math.cos(way), uy: Math.sin(way), trail: Math.floor(turn * TRAILS) % TRAILS,
        v: rand(160, 460) * kick, at: dist / warp.speed + rand(0, 0.04), lot: particleLot(), i: bits.length, gone: false,
      });
    };
    if (px) for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
      const k = (j * sw + i) * 4, r = px[k], gg = px[k + 1], b = px[k + 2];
      if (r + gg + b < 40 && Math.random() < 0.75) continue; // (most of the dark: the gaps between)
      add((i + 0.5) * g, (j + 0.5) * g, g, [r, gg, b], 0.8);
    }
    // ...and the logo, in its own colours, and the buttons, in the warm rainbow
    const pieces = document.querySelectorAll("#homeLogo span, #panelMenu button, #panelMenu .skipBox");
    const f = Math.max(5, Math.round(g * 0.6));
    for (const el of pieces) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const own = el.tagName === "SPAN" ? (getComputedStyle(el).color.match(/[\d.]+/g) ?? [255, 255, 255]).slice(0, 3).map(Number) : null;
      for (let y = r.top; y < r.bottom; y += f) for (let x = r.left; x < r.right; x += f) {
        add(x + f / 2, y + f / 2, f, own ?? ombreRGB(x / W + performance.now() / 4000, 0.1), 1.2);
      }
    }
    burstc.hidden = false;
    bx.setTransform(1, 0, 0, 1, 0, 0);
    bx.clearRect(0, 0, burstc.width, burstc.height);
    paintStill();
  }

  // The squares the wave hasn't got to yet, the screen as it was: painted once, all of them, on a
  // canvas of their own (`still`), laid over each frame in one go; as the wave gets to each, it's
  // taken off that (and whatever else, still to go, was under it, put back, in order). The same
  // as drawing each of them every frame, for far less.
  let still = null;
  const stillAt = new Map(); // (which squares are where: a grid of `stillCell` device pixels)
  let stillCell = 1;
  const stillKey = (i, j) => i * 65536 + j;
  function paintStill() {
    const d = view.burst;
    still ??= document.createElement("canvas");
    still.width = burstc.width; still.height = burstc.height;
    const g = still.getContext("2d");
    stillAt.clear();
    let most = 1;
    for (const b of bits) most = Math.max(most, b.size);
    stillCell = Math.max(8, most * d);
    for (const b of bits) {
      // (where it is, in whole pixels: what's taken off when it goes)
      const x0 = (b.x - b.size / 2) * d, y0 = (b.y - b.size / 2) * d, z = b.size * d;
      b.from = [x0, y0, z, Math.floor(x0), Math.floor(y0), Math.ceil(x0 + z), Math.ceil(y0 + z)];
      g.fillStyle = b.fill;
      g.fillRect(x0, y0, z, z);
      for (let j = Math.floor(b.from[4] / stillCell); j <= Math.floor(b.from[6] / stillCell); j++) {
        for (let i = Math.floor(b.from[3] / stillCell); i <= Math.floor(b.from[5] / stillCell); i++) {
          const k = stillKey(i, j);
          let list = stillAt.get(k);
          if (!list) stillAt.set(k, list = []);
          list.push(b);
        }
      }
    }
  }
  // (the squares the wave has just got to: off the still screen)
  function takeOffStill(t) {
    const g = still.getContext("2d");
    for (const b of bits) {
      if (b.gone || t < b.at) continue;
      b.gone = true;
      const [, , , l, tp, r, bt] = b.from;
      // (what else, still to go, overlaps where it was, in the order they were painted)
      const under = new Set();
      for (let j = Math.floor(tp / stillCell); j <= Math.floor(bt / stillCell); j++) {
        for (let i = Math.floor(l / stillCell); i <= Math.floor(r / stillCell); i++) {
          for (const o of stillAt.get(stillKey(i, j)) ?? []) {
            if (o.gone || t >= o.at || o.from[3] >= r || o.from[5] <= l || o.from[4] >= bt || o.from[6] <= tp) continue;
            under.add(o);
          }
        }
      }
      g.clearRect(l, tp, r - l, bt - tp);
      if (!under.size) continue;
      g.save();
      g.beginPath(); g.rect(l, tp, r - l, bt - tp); g.clip();
      for (const o of [...under].sort((a, c) => a.i - c.i)) { g.fillStyle = o.fill; g.fillRect(o.from[0], o.from[1], o.from[2], o.from[2]); }
      g.restore();
    }
  }

  function drawBurst(dt) {
    const d = view.burst, s = dt / 1000, t = (performance.now() - startAt) / 1000, w = warp;
    const W = view.w, Hh = view.h;
    bx.setTransform(1, 0, 0, 1, 0, 0);
    // (last frame fades out rather than going: whatever moves leaves a trail)
    bx.globalAlpha = 1;
    bx.globalCompositeOperation = "destination-out";
    bx.fillStyle = `rgba(0,0,0,${(1 - Math.pow(0.58, dt / 16.7)).toFixed(3)})`;
    bx.fillRect(0, 0, burstc.width, burstc.height);
    // the squares the wave hasn't got to yet: the screen as it was (paintStill)
    bx.globalCompositeOperation = "source-over";
    takeOffStill(t);
    bx.drawImage(still, 0, 0);
    bx.globalCompositeOperation = "lighter";
    // the flash at the button, and the ring of the rainbow going out with the wave
    const R = t * w.speed;
    if (t < 0.32) {
      const k = 1 - t / 0.32, rr = (40 + t * 1500) * d;
      const fl = bx.createRadialGradient(w.cx * d, w.cy * d, 0, w.cx * d, w.cy * d, rr);
      fl.addColorStop(0, `rgba(255,255,255,${(0.5 * k).toFixed(3)})`);
      fl.addColorStop(0.3, ombre(0.3, 0.32 * k));
      fl.addColorStop(1, ombre(0, 0));
      bx.fillStyle = fl;
      bx.fillRect(w.cx * d - rr, w.cy * d - rr, rr * 2, rr * 2);
    }
    if (R < w.far * 1.15) {
      const k = 1 - R / (w.far * 1.15), segs = 36;
      for (const [width, alpha, lift] of [[26, 0.16, 0], [7, 0.75, 0.25]]) {
        bx.lineWidth = Math.max(1, width * d * (0.4 + 0.6 * k));
        if (bx.createConicGradient) { // (one stroke of the rainbow all the way round, where the browser can)
          bx.strokeStyle = rainbowRound(bx, w.cx * d, w.cy * d, -t * 2.2, alpha * k, lift, segs);
          bx.beginPath(); bx.arc(w.cx * d, w.cy * d, R * d, 0, Math.PI * 2); bx.stroke();
          continue;
        }
        for (let i = 0; i < segs; i++) {
          const a0 = (i / segs) * Math.PI * 2 - t * 2.2;
          bx.strokeStyle = ombre(i / segs, alpha * k, lift);
          bx.beginPath(); bx.arc(w.cx * d, w.cy * d, R * d, a0, a0 + Math.PI * 2 / segs + 0.02); bx.stroke();
        }
      }
    }
    // the squares it's reached: white hot, shooting away, split into the rainbow, over the trails
    // they leave (only white, and no trails, on a device that's falling behind: a few frames
    // slower than slowMs; and fewer of them, while the frames lag: src/particles.js)
    if (dt > (H().warp?.slowMs ?? 30)) w.slow++;
    const lite = w.slow >= 3;
    let n = 0;
    for (const b of bits) {
      bits[n++] = b;
      const age = t - b.at;
      if (age < 0) continue;
      if (!alive(b)) { n--; continue; }
      const x0 = b.x, y0 = b.y;
      b.v += w.accel * s;
      b.x += b.ux * b.v * s; b.y += b.uy * b.v * s;
      if (age > 0.04 && !lite) trails[b.trail].push(x0 * d, y0 * d, b.x * d, b.y * d);
      const m = b.size; // (gone off the screen: done with, once its trail's drawn)
      if (b.x < -m || b.y < -m || b.x > W + m || b.y > Hh + m) n--;
    }
    bits.length = n;
    // (the trails, a slice of the wheel at a time)
    bx.globalAlpha = 1;
    bx.lineCap = "butt";
    bx.lineWidth = Math.max(1.5, 6 * d);
    for (let i = 0; i < TRAILS; i++) {
      const line = trails[i];
      if (!line.length) continue;
      bx.strokeStyle = ombre(i / TRAILS, 0.75, 0.12);
      bx.beginPath();
      for (let k = 0; k < line.length; k += 4) { bx.moveTo(line[k], line[k + 1]); bx.lineTo(line[k + 2], line[k + 3]); }
      bx.stroke();
      line.length = 0;
    }
    for (const b of bits) {
      const age = t - b.at;
      if (age < 0) continue;
      const heat = Math.min(1, age / 0.12), z = b.size * (1 - 0.5 * heat) * d;
      if (heat < 1) {
        bx.globalAlpha = 1 - heat;
        bx.fillStyle = b.fill;
        bx.fillRect(b.x * d - z / 2, b.y * d - z / 2, z, z);
      }
      if (lite) {
        bx.globalAlpha = heat;
        bx.fillStyle = "#fff";
        bx.fillRect(b.x * d - z / 2, b.y * d - z / 2, z, z);
      } else drawChromaSquare(bx, b.x * d, b.y * d, z, b.ux, b.uy, Math.min(z * 1.5, b.v * 0.0035 * d), heat);
    }
    bx.globalAlpha = 1;
    bx.globalCompositeOperation = "source-over";
  }

  // Starting a mode from the home screen: the screen breaks up and shoots away (above) and fades
  // to dark (CONFIG.home.burstMs in all, the last fadeMs of it the fade; from How to play, just
  // the fade), and the game comes up out of the dark. From anywhere else, straight in.
  function play(mode, { from = null, burst = true } = {}) {
    if (phase === "starting") return;
    if (phase !== "home") { onPlay(mode); return; }
    const now = performance.now(), c = H(), fade = c.fadeMs ?? 240;
    const bursting = burst && !reduced;
    playMode = mode;
    phase = "starting";
    startAt = now;
    sizeCanvases();
    if (bursting) {
      const r = from?.getBoundingClientRect?.();
      burstFrom(r ? r.left + r.width / 2 : view.w / 2, r ? r.top + r.height / 2 : view.h / 2);
      body.classList.add("starting"); // (all of it gone at once: what's left is its pieces, flying)
    }
    stopBackground();
    restore();
    const total = bursting ? Math.max(fade, c.burstMs ?? 600) : fade;
    endAt = now + total;
    dark.style.transitionDuration = `${fade}ms`;
    clearTimeout(darkTimer);
    darkTimer = setTimeout(() => { if (phase === "starting") dark.classList.add("on"); }, total - fade);
  }

  function finishStart() {
    if (phase !== "starting") return;
    phase = "off";
    clearTimeout(darkTimer);
    body.classList.remove("home", "starting", "homeFade");
    const warped = !!warp;
    bits.length = 0;
    warp = null;
    if (still) { still.width = still.height = 0; stillAt.clear(); }
    burstc.hidden = true;
    restoreBoard();
    state.backdrop = false;
    onPlay(playMode);
    // (and up it comes, out of the dark: after the warp, switching on like an old screen)
    dark.classList.add("on");
    void dark.offsetWidth;
    dark.classList.remove("on");
    if (warped) for (const el of [$("boardShell"), $("boardFrame")]) {
      el?.classList.remove("crtOn");
      void el?.offsetWidth;
      el?.classList.add("crtOn");
    }
  }

  /* ---------- in and out ---------- */

  function enter() {
    if (phase === "home" || phase === "starting") return;
    if (phase === "idle" || phase === "fading") { leaveIdle(); return; }
    phase = "home";
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
    if (phase === "home" || phase === "off") noteInput();
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
  // (back from another tab: the time away doesn't count as being left alone)
  document.addEventListener("visibilitychange", () => { if (!document.hidden && (phase === "home" || phase === "off")) noteInput(); });
  window.addEventListener("click", (e) => {
    if (performance.now() < guardUntil) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, { capture: true });

  /* ---------- every frame ---------- */

  function frame(now) {
    const dt = Math.min(50, now - last);
    last = now;
    reduced = calmFx();
    if (phase === "home" || phase === "fading") {
      // (it comes on with something on the board already: a fast start, a little each frame)
      for (let i = 0; warmLeft > 0 && i < 8; i++) { updateGame(state, 50); warmLeft -= 50; }
      // (and the other board's, a little at a time, once the first has had its own: two steps a
      // frame, or just the one when that one took a while, so a slow device doesn't fall behind
      // for it; the camera only cuts to it once it's done)
      if (warmLeft <= 0 && other && otherWarm > 0) {
        const t0 = performance.now();
        for (let i = 0; otherWarm > 0 && i < 2 && (i === 0 || performance.now() - t0 < 4); i++) { updateGame(other, 50); otherWarm -= 50; }
      }
      if (reduced) drawCalm(now); // (calmer animations: tiled boards, fading)
      else { camera.step(dt, now); camera.draw(); }
      stepFx(dt, now);
      stepLogo(now);
      if (phase === "home" && now >= idleAt && !document.hidden && idleFrom()) goIdle();
    } else if (phase === "off") {
      // (the game over, left alone: no game going on behind it any more)
      if (now >= idleAt && !document.hidden && idleFrom()) goIdle();
    } else if (phase === "starting") {
      if (warp) drawBurst(dt);
      if (now >= endAt) finishStart();
    }
  }

  return {
    enter, play, frame, finish: finishStart,
    // (a new page: the time spent on the last one doesn't count as being left alone on this one)
    noteInput,
    active: () => phase === "home" || phase === "fading",
    // (the board on screen: main.js plays and draws this one)
    liveState: shown,
    // (still giving the board behind its quick start)
    warming: () => phase === "home" && warmLeft > 0,
    phase: () => phase,
    // (for looking at in dev mode: what the camera can see, and where the action is)
    debug: () => ({ boards: { other: !!other, onOther, otherWarm, warmLeft }, x: camera.x, y: camera.y, z: camera.z, S: camera.S, rot: camera.rot, ...camera.half(camera.z), action: actionBox(true), reach: actionBox(), shot: camera.shot, sees: (b) => camera.sees(b, 0) }),
  };
}
