// ============================================================
// TUTORIAL — the controls and each kind of piece, a page at a time (no DOM)
// ============================================================
// A mode of its own (CONFIG.modes.tutorial), played on the real board by the real engine. Each
// page has a sentence (src/tutorialui.js shows it, and the way from page to page), a board set up
// for it and a piece or two, and an autopilot that plays them at a pace you can follow, saying
// what it presses as it presses it (the UI shows a finger tapping the board, or the keys lighting
// up). The player can take over at any moment just by playing (tutorialTakeOver): the autopilot
// lets go until they've left it alone a while (CONFIG.tutorial.idleMs). Once the page's pieces
// have all landed and everything has settled, the board is set up again and round it goes, the
// autopilot showing it again or the player having another go. Nothing is scored and it can't be
// lost: a board that fills up just starts the page again.
//
// It starts quickly with the basics (moving, turning, coming down, rows going), as most people
// will have played something like it, then takes more time over each class of powerup that's
// switched on, one clear-cut example each on a board made to show it off, then the giants, and
// last of all a board to play on for as long as you like.
//
// game.js asks it for each piece (tutorialNext), lets it steer every frame (tutorialTick) and
// tells it when the board has filled up (tutorialTopOut).

import { CONFIG } from "../config.js";
import { on, tryMove, tryRotate, beginLockIfNeeded, hardDropAndLock, collides, markBoardDirty, isPowerupEnabled } from "./game.js";
import { reachableTurns } from "./zen.js";
import { inGame } from "./selection.js";
import { hash01 } from "./util.js";

// The filler on a page's board: plain blocks in the powerup demos' colours (src/demo.js), so the
// real pieces, in their own art, stand out against them.
const FILLER = ["#e8794a", "#5fb0e8", "#9ad45b", "#e85fa8", "#e8d35f", "#9a7be8", "#5fd4c4", "#d45f5f"];

// The pages, in order. Each one:
//   text:   what it says ({ touch, keys }: on a touch screen, or with a keyboard; or the same for
//           both). [x] is a key or button, {name} the powerup class's name, in its colours.
//   more:   (a powerup page) a second sentence, left off on the first of them, which says what
//           powerups are instead
//   cls:    (a powerup page) its class; the page is only there if its piece can turn up in a game
//   board:  the rows at the bottom of the board, top to bottom ("." empty; each run of one letter
//           is a block of filler, joined up as one piece)
//   pieces: what comes, in order: { id, rot, x: where it starts (the middle at the top), to: {
//           rot, x }: where the autopilot takes it, then: what it does once it's there ("hold":
//           holds it down a moment, "drop": the double tap that drops it straight down; nothing,
//           and it just falls) }
//   dropMs: how fast its pieces fall, if not the usual (CONFIG.tutorial.dropMs)
//   free:   no script: one friendly piece after another, for as long as you like, the autopilot
//           putting each somewhere sensible
export const PAGES = [
  {
    id: "move",
    text: { touch: "Tap the left or right side of the board to move the piece.", keys: "Press [←] [→] or [A] [D] to move the piece." },
    board: [
      "....dd..ee....",
      "...aabbbccc...",
    ],
    pieces: [{ id: "cat_loaf", to: { x: 0 } }, { id: "lost_ufo", to: { x: 11 } }],
  },
  {
    id: "turn",
    text: { touch: "Tap the top of the board to turn it.", keys: "Press [↑] or [W] to turn it." },
    board: [
      "aaabbbcc...ddd",
      "eeffggghh.iijj",
    ],
    pieces: [{ id: "lost_ufo", to: { rot: 2, x: 8 } }],
  },
  {
    id: "down",
    text: {
      touch: "Hold the bottom middle to bring it down faster; double tap there to drop it straight down.",
      keys: "Hold [↓] or [S] to bring it down faster; press it twice quickly to drop it straight down.",
    },
    dropMs: 420, // (slower, so you can see it speed up)
    board: [
      "aabbbc.dddeeff",
      "agggbc.hhdiiff",
      "agjjkk.hhlllmm",
      "nnjjkk.ooolppm",
    ],
    pieces: [{ id: "banana", to: { x: 6 }, then: ["hold", "drop"] }],
  },
  {
    id: "rows",
    text: "Fill a row all the way across and it disappears: the more at once, the better.",
    board: [
      "aa..bbb.cc.dd.",
      "ee..gghhiijjkk",
      "ef.lggmmnnoopp",
      "ff.llqqrrsstuu",
    ],
    pieces: [{ id: "candy_cane", to: { x: 2 }, then: ["drop"] }],
  },
  {
    // (a messy heap, most of it inside the toadstool's round highlight)
    id: "destroyer", cls: "destroyer",
    text: "{name} destroy every block in their highlight when they land.",
    more: "Steer one over a mess to clear it away.",
    board: [
      "......aab.....",
      ".....caabdd...",
      "....cc.ebd.f..",
      "....g.eeb.ff..",
      "...ggh.ij.kf..",
      "..l.hhiij.kkm.",
      "..ll.n.jjo.mm.",
      "pqqr.nnsoo.ttu",
      "pqrrvv.swwxx.u",
      "yy.zvAAsBBxCCu",
    ],
    pieces: [{ id: "toadstool", to: { x: 7 }, then: ["drop"] }],
  },
  {
    // (overhangs and holes in the anvil's five columns, just enough in each of them to fill the
    // bottom four rows once it all comes down)
    id: "gravity", cls: "gravity",
    text: "{name} drop the blocks in their highlight as far as they'll go, filling the holes under them.",
    more: "Good for holes you can't get at.",
    board: [
      ".......a......",
      ".......ab.....",
      "......c.bd....",
      "......c.b.e...",
      "ffgggh...iejjj",
      "flggmh.n..ejop",
      "llqqmrsn.t.oop",
      "uuvvwrs.xtyyzz",
    ],
    pieces: [{ id: "anvil", to: { x: 7 }, then: ["drop"] }],
  },
  {
    // (a pile full of gaps, some of them covered over, all inside the foam's highlight)
    id: "expander", cls: "expander",
    text: "{name} fill every empty cell in their highlight with new blocks.",
    more: "Drop one on a pile full of gaps.",
    board: [
      "jjb..cc.dkkllm",
      "jnbe..c.dkolmm",
      "pn.ee..ffqoorr",
      "ppg.eh..fqsstr",
      "uugg.hhi.vsttw",
    ],
    pieces: [{ id: "expanding_foam", to: { x: 5 }, then: ["drop"] }],
  },
  {
    // (junk along the row it lands in, and gaps under it)
    id: "combo", cls: "combo",
    text: "{name} do two things at once, each in its own colours.",
    more: "This one burns away its row and fills in the gaps below.",
    board: [
      "aa.b.....cc.dd",
      "oppe.ff.g.qqrr",
      "ospe..fhggtqur",
      "ssv.ii.h.jtuuw",
      "xvvki.ll.jyyzw",
      "xxAkkm.ln.BBzz",
    ],
    pieces: [{ id: "jelly_mould", to: { x: 5 }, then: ["drop"] }],
  },
  {
    id: "giants",
    text: "Later on, big awkward pieces turn up too: find them somewhere flat to land.",
    board: [
      "a.............",
      "abb...........",
      "accd..........",
      "eccdd.........",
    ],
    pieces: [{ id: "pyramid", to: { x: 5 }, then: ["drop"] }],
  },
  {
    id: "end", free: true,
    text: { touch: "That's it! Pause any time with [❚❚]; play on here, or start a game.", keys: "That's it! Press [Space] to pause any time; play on here, or start a game." },
    board: [
      "a.....bb...cc.",
      "aadd..beeffcg.",
      "hhdii.jeekfggl",
    ],
  },
];

// The pages for this game: a powerup page only if its piece can turn up (its class is switched
// on: CONFIG.assist.powerups.disabledTypes), and any page whose pieces have gone missing left out.
export function tutorialPages(state) {
  const live = (id) => {
    const s = state.allById.get(id);
    return !!s && (!s.powerup || (isPowerupEnabled(s) && (s.frequency ?? 1) > 0 && !s.powerup.setOnly));
  };
  const pages = PAGES.filter(p => (p.pieces ?? []).every(q => live(q.id)));
  const first = pages.find(p => p.cls);
  return pages.map(p => ({ ...p, first: p === first }));
}

// What a page says, with a keyboard ("keys") or on a touch screen ("touch").
export function tutorialText(page, view = "touch") {
  const say = typeof page.text === "string" ? page.text : page.text?.[view] ?? page.text?.touch ?? "";
  if (!page.cls) return say;
  // (the first powerup page says what powerups are, in place of its second sentence)
  return page.first ? `Shiny pieces are powerups. ${say}` : `${say} ${page.more ?? ""}`.trim();
}

/* =========================
   A run of it
   ========================= */

export function createTutorial(state, { page = 0 } = {}) {
  watch(state);
  const t = {
    pages: tutorialPages(state),
    page: 0,
    queue: [],          // the page's pieces still to come
    spec: null,         // the one that came last, as the page has it (with its shape)
    fresh: false,       // (it has come, and the autopilot hasn't taken it in hand yet)
    active: null,       // the piece the autopilot is playing
    goals: [],          // where the autopilot is taking it, and then what it does there
    then: [],
    stuck: 0,
    wait: 0,            // until its next press
    holding: 0,         // (holding it down: for how much longer)
    player: false,      // the player has taken over (until they leave it alone a while)
    idleMs: 0,
    restMs: 0,
    pending: null,      // a page to set up at the next tick (this one again, to go round again)
    started: false,
    round: newRound(),  // this time round the page (newRound)
    cheer: 0,           // times the player has done what a page shows (the UI cheers)
    resets: 0,          // times a page has been set up (the UI fades the board in)
    seq: 0,
    // what the UI shows: the key it's about to press (the finger goes there), the last press, and
    // whether it's holding the piece down
    hint: { aim: null, press: null, held: false },
    recent: [],
  };
  setUpPage(state, t, Math.max(0, Math.min(t.pages.length - 1, page)));
  return t;
}

// This time round the page: whether the player had the last piece as it landed, and whether
// they've been cheered for it.
function newRound() { return { byPlayer: false, cheered: false }; }

// The player did what the page shows (their piece took rows away, or their powerup did
// something): a cheer, there and then (the UI's). One listener for each game state, whichever
// run of the tutorial it's on.
const watched = new WeakSet();
function watch(state) {
  if (watched.has(state)) return;
  watched.add(state);
  on(state, (type, d) => {
    const t = state.tutorial;
    if (!t) return;
    if (type === "lock") t.round.byPlayer = t.player;
    const did = type === "rowsDestroyed" || (type === "powerupFire" && d.affected > 0);
    if (did && t.round.byPlayer && !t.round.cheered && !t.pages[t.page].free) { t.round.cheered = true; t.cheer++; }
  });
}

// Off to another page (Back and Next): at the next tick, so it all happens in step with the game.
export function tutorialGoTo(state, i) {
  const t = state.tutorial;
  if (!t) return;
  t.pending = Math.max(0, Math.min(t.pages.length - 1, i));
  if (t.holding > 0) state.softDropping = false;
  t.holding = 0;
}

// The player pressed something (a key that moves the piece, a tap on the board): the piece is
// theirs, and the hints go, until they leave it alone for a while (CONFIG.tutorial.idleMs).
// (`down`: what they pressed brings it down, so a hold of the autopilot's becomes theirs)
export function tutorialTakeOver(state, { down = false } = {}) {
  const t = state.tutorial;
  if (!t) return;
  if (!t.player && t.holding > 0 && !down) state.softDropping = false; // (the autopilot's, not theirs)
  t.player = true;
  t.idleMs = 0;
  t.holding = 0;
  t.hint.aim = null;
  t.hint.held = false;
}

// The board filled up (game.js, in place of game over): the page starts again.
export function tutorialTopOut(state) {
  const t = state.tutorial;
  if (t && t.pending == null) t.pending = t.page;
}

// The page's next piece, turned and where it starts ({ shape, rot, x }), or null: no more this
// time round (game.js spawnPiece).
export function tutorialNext(state) {
  const t = state.tutorial;
  if (!t || t.pending != null) return null;
  const page = t.pages[t.page];
  const spec = page.free ? freePiece(state, t) : t.queue.shift();
  const shape = spec && (spec.shape ?? state.allById.get(spec.id));
  if (!shape) return null;
  const rot = Math.min(spec.rot ?? 0, shape.rotations.length - 1);
  const w = shape.rotations[rot][0].length;
  t.spec = { ...spec, shape };
  t.fresh = true;
  t.active = null;
  return { shape, rot, x: spec.x ?? Math.floor((CONFIG.board.cols - w) / 2) };
}

// Every frame (game.js updateGame): the autopilot, and the page going round. True when a page
// has just been set up and its first piece should come now.
export function tutorialTick(state, dt) {
  const t = state.tutorial, T = CONFIG.tutorial;
  if (t.pending != null) { setUpPage(state, t, t.pending); return true; }
  const page = t.pages[t.page];
  // (left alone long enough, the autopilot carries on with whatever is falling)
  if (t.player && (t.idleMs += dt) >= T.idleMs) {
    t.player = false;
    t.wait = T.firstMs;
    if (state.active === t.active && state.active) t.hint.aim = nextKey(state, t);
  }
  state.dropMs = t.player ? T.playerDropMs : page.dropMs ?? T.dropMs;
  const a = state.active;
  if (t.fresh && a) begin(state, t, a);
  if (!a) {
    // all landed and settled: a moment to take it in, and round it goes again
    if (!page.free && !t.queue.length && !t.fresh && settled(state) && (t.restMs += dt) >= T.restMs) {
      setUpPage(state, t, t.page);
      return true;
    }
    return false;
  }
  if (a === t.active && !t.player) steer(state, t, dt);
  return false;
}

function settled(state) {
  const fx = state.fx;
  return !state.effect && !state.hold && !fx.rowFall.active && !fx.moveAnim.active && !fx.growAnim.active && !fx.show && !fx.rowClears.length;
}

/* =========================
   The board
   ========================= */

function setUpPage(state, t, i) {
  const fresh = !t.started || i !== t.page;
  t.started = true;
  t.page = i;
  t.pending = null;
  const page = t.pages[i];
  // (a new page: the autopilot shows it; the same one again: whoever was playing carries on)
  if (fresh) { t.player = false; t.idleMs = 0; }
  t.round = newRound();
  clearBoard(state);
  buildBoard(state, page.board ?? []);
  t.queue = (page.pieces ?? []).map(p => ({ ...p }));
  t.spec = null;
  t.fresh = false;
  t.active = null;
  t.goals = [];
  t.then = [];
  t.wait = CONFIG.tutorial.firstMs;
  t.holding = 0;
  t.restMs = 0;
  t.hint.aim = null;
  t.hint.held = false;
  t.resets++;
  state.dropMs = page.dropMs ?? CONFIG.tutorial.dropMs;
}

// Everything off the board, and whatever it was in the middle of (as resetGame, but the game
// carries on).
function clearBoard(state) {
  const { cols, rows } = CONFIG.board;
  state.board = Array.from({ length: rows }, () => Array(cols).fill(null));
  state.instances.clear();
  state.active = null;
  state.flock = [];
  state.effect = null;
  state.hold = null;
  state.locking = false;
  state.lockElapsed = 0;
  state.softDropping = false;
  const fx = state.fx;
  fx.particles.length = 0;
  fx.callouts.length = 0;
  fx.shockwaves.length = 0;
  fx.rowClears.length = 0;
  fx.show = null;
  fx.admire = null;
  fx.ghosts = null;
  fx.rowFall.active = false;
  fx.rowFall.elapsedMs = 0;
  fx.rowFall.rowDropDistances = Array(rows).fill(0);
  fx.moveAnim.active = false;
  fx.growAnim.active = false;
  fx.flash.active = false;
  fx.quake.trauma = 0;
  markBoardDirty(state);
}

// A page's rows, at the bottom of the board. Each run of one letter (across and down) is a block
// of filler of its own, in a colour none of the blocks touching it has.
function buildBoard(state, lines) {
  const { cols, rows } = CONFIG.board;
  const top = rows - lines.length;
  const at = (x, y) => (y >= top && y < rows ? lines[y - top]?.[x] ?? "." : ".");
  const region = new Map(); // "x,y" -> its block of filler
  const blocks = [];
  for (let y = Math.max(0, top); y < rows; y++) for (let x = 0; x < cols; x++) {
    const ch = at(x, y);
    if (ch === "." || region.has(`${x},${y}`)) continue;
    const b = { cells: [], colour: null };
    const todo = [[x, y]];
    region.set(`${x},${y}`, b);
    while (todo.length) {
      const [cx, cy] = todo.pop();
      b.cells.push({ x: cx, y: cy });
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (nx < 0 || nx >= cols || at(nx, ny) !== ch || region.has(`${nx},${ny}`)) continue;
        region.set(`${nx},${ny}`, b);
        todo.push([nx, ny]);
      }
    }
    blocks.push(b);
  }
  blocks.forEach((b, i) => {
    const near = new Set();
    for (const { x, y } of b.cells) for (const k of [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`]) {
      const o = region.get(k);
      if (o && o !== b && o.colour) near.add(o.colour);
    }
    b.colour = FILLER.map((_, k) => FILLER[(i * 3 + k) % FILLER.length]).find(c => !near.has(c)) ?? FILLER[i % FILLER.length];
    const pid = state.nextPid++, style = { baseColor: b.colour };
    const mine = (x, y) => region.get(`${x},${y}`) === b;
    for (const { x, y } of b.cells) state.board[y][x] = { paint: fillerPaint(b.colour, x, y, mine), style, pid };
    state.instances.set(pid, { shape: null, rotIdx: 0, x: b.cells[0].x, y: b.cells[0].y, cells: b.cells.map(c => ({ ...c })), total: b.cells.length, intact: false });
  });
  markBoardDirty(state);
}

// A block of filler's look, cell by cell: its colour with a little grain in it, lighter along
// its top and left edges and darker along its bottom and right (where it meets something else),
// so it reads as one chunky piece, as the real ones do. (`mine(x, y)`: is that cell part of it?)
const GRAIN = 6;
function fillerPaint(hex, x, y, mine) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const up = !mine(x, y - 1), down = !mine(x, y + 1), left = !mine(x - 1, y), right = !mine(x + 1, y);
  const pixels = [];
  for (let py = 0; py < GRAIN; py++) {
    const row = [];
    for (let px = 0; px < GRAIN; px++) {
      let f = (hash01(x * 131 + y * 977 + px * 13 + py * 7) - 0.5) * 0.08;
      if (up && py === 0) f += 0.22;
      else if (left && px === 0) f += 0.12;
      if (down && py === GRAIN - 1) f -= 0.24;
      else if (right && px === GRAIN - 1) f -= 0.14;
      row.push("#" + rgb.map(v => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)).toString(16).padStart(2, "0")).join(""));
    }
    pixels.push(row);
  }
  return { k: GRAIN, pixels };
}

/* =========================
   The autopilot
   ========================= */

// A piece has come: where it's going, and what it does there.
function begin(state, t, a) {
  t.fresh = false;
  t.active = a;
  t.stuck = 0;
  t.holding = 0;
  t.wait = CONFIG.tutorial.firstMs;
  const spec = t.spec;
  const to = spec.free ? bestSpot(state, a.shape, a.x) : spec.to;
  t.goals = [...(spec.via ?? []), { rot: to?.rot ?? a.rotIdx, x: to?.x ?? a.x }].map(g => ({ rot: g.rot ?? a.rotIdx, x: g.x ?? a.x }));
  // ("drop" is however many taps it takes: CONFIG.timing.multiTaps, the last one the drop)
  const taps = Math.max(1, CONFIG.timing.multiTaps ?? 2);
  t.then = (spec.then ?? []).flatMap(s => (s === "drop" ? [...Array(taps - 1).fill("down"), "drop"] : [s]));
  t.hint.aim = nextKey(state, t);
  t.hint.held = false;
}

// The next thing to press: turn it, move it over, and then whatever the page says; or nothing.
// (A turn or a move that gets nowhere twice, it gives up on and gets on with the rest.)
function nextKey(state, t) {
  const a = state.active;
  if (!a) return null;
  while (t.goals.length) {
    const g = t.goals[0];
    if (t.stuck < 2) {
      if (a.rotIdx !== g.rot) return "turn";
      if (a.x < g.x) return "right";
      if (a.x > g.x) return "left";
    }
    t.goals.shift();
    t.stuck = 0;
  }
  return t.then[0] ?? null;
}

function steer(state, t, dt) {
  const T = CONFIG.tutorial;
  if (t.holding > 0) {
    state.softDropping = true;
    if ((t.holding -= dt) > 0) return;
    state.softDropping = false;
    t.hint.held = false;
    t.wait = T.stepMs;
    t.hint.aim = nextKey(state, t);
    return;
  }
  if ((t.wait -= dt) > 0) return;
  const key = nextKey(state, t);
  if (!key) { t.hint.aim = null; return; }
  const a = state.active, was = `${a.rotIdx},${a.x}`;
  const placing = !!t.goals.length;
  if (!placing) t.then.shift();
  press(state, t, key);
  if (placing && state.active === a && `${a.rotIdx},${a.x}` === was) t.stuck++;
  if (state.active !== t.active) { t.hint.aim = null; return; } // (dropped: it has landed)
  t.hint.aim = nextKey(state, t);
  t.wait = t.hint.aim === "drop" || (key === "down" && t.hint.aim === "down") ? T.tapGapMs : T.stepMs;
}

// Presses it, just as the player's own key or tap would (src/ui.js).
function press(state, t, key) {
  t.hint.press = { key, seq: ++t.seq };
  switch (key) {
    case "left": tryMove(state, -1, 0); break;
    case "right": tryMove(state, 1, 0); break;
    case "turn": tryRotate(state); break;
    case "down": if (!tryMove(state, 0, 1)) beginLockIfNeeded(state); break;
    case "hold": t.holding = CONFIG.tutorial.holdMs; t.hint.held = true; state.softDropping = true; break;
    case "drop": state.softDropping = false; hardDropAndLock(state, { lastChance: true }); break;
  }
}

/* =========================
   The last page: one friendly piece after another
   ========================= */

function freePiece(state, t) {
  t.freePool ??= state.allShapes.filter(s => {
    const m = s.rotations[0], n = m.flat().filter(Boolean).length;
    return (s.difficulty ?? 1) === 1 && (s.frequency ?? 1) >= 0.5 && inGame(s) && !s.powerup && n >= 3 && n <= 6 && m.length <= 4 && m[0].length <= 4;
  });
  const pool = t.freePool;
  if (!pool.length) return null;
  let s = pool[0];
  for (let k = 0; k < 8; k++) {
    s = pool[Math.floor(state.rng() * pool.length)];
    if (!t.recent.includes(s.id)) break;
  }
  t.recent = [...t.recent.slice(-4), s.id];
  return { id: s.id, shape: s, free: true, then: ["drop"] };
}

// Somewhere sensible for it, as a person might choose: rows it finishes, few gaps left under it,
// and low down. ({ rot, x }, or null.)
function bestSpot(state, shape, fromX) {
  const { cols, rows } = CONFIG.board;
  let best = null;
  for (let r = 0; r < reachableTurns(shape); r++) {
    const mat = shape.rotations[r], w = mat[0].length, h = mat.length;
    for (let x = 0; x + w <= cols; x++) {
      let y = -h;
      while (!collides(state, x, y + 1, mat)) y++;
      if (mat.some((row, j) => y + j < 0 && row.some(Boolean))) continue; // (it would stick out)
      let lines = 0, gaps = 0;
      for (let j = 0; j < h; j++) {
        const by = y + j;
        if (state.board[by].every((c, bx) => c || (bx >= x && bx < x + w && mat[j][bx - x]))) lines++;
      }
      for (let i = 0; i < w; i++) {
        let low = -1;
        for (let j = h - 1; j >= 0 && low < 0; j--) if (mat[j][i]) low = j;
        for (let by = y + low + 1; low >= 0 && by < rows && !state.board[by][x + i]; by++) gaps++;
      }
      const s = lines * 8 - gaps * 4 + (y + h) * 0.6 - Math.abs(x - fromX) * 0.02 - r * 0.05;
      if (!best || s > best.s) best = { rot: r, x, s };
    }
  }
  return best;
}
