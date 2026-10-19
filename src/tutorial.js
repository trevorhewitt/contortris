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
// will have played something like it, then the Shiny Pieces: their three classes side by side,
// each doing its thing, and then a page for each class that's switched on, a clear-cut example
// on a board made to show it off and then more of the same class until the board is nearly
// gone; then where to put which (a board with a place for each), the bay, how the game goes on,
// and last of all a page for each mode, what it is, with a board playing the way it does behind
// it and a button to go and play it.
//
// game.js asks it for each piece (tutorialNext), lets it steer every frame (tutorialTick) and
// tells it when the board has filled up (tutorialTopOut).

import { CONFIG } from "../config.js";
import { on, tryMove, tryRotate, beginLockIfNeeded, hardDropAndLock, collides, markBoardDirty, isPowerupEnabled, useShelf } from "./game.js";
import { createShelf } from "./shelf.js";
import { reachableTurns, bestPlacement, tryPowerup } from "./zen.js";
import { inGame } from "./selection.js";
import { hash01 } from "./util.js";
import { getShapePaint } from "./shapes.js";

// The filler on a page's board: wherever one of the game's own pieces has a block's exact
// outline, that piece (so the board looks like the game's); otherwise plain blocks in the powerup
// demos' colours (src/demo.js).
const FILLER = ["#f4f4f6", "#c9c9ce", "#9c9ca3", "#e2e2e7", "#b3b3b9", "#85858c", "#d6d6db", "#a8a8ae"]; // (shades of white: the game's own colours are its pieces' art, and red, green and blue for the powerups)

// The pages, in order. Each one:
//   text:   what it says ({ touch, keys }: on a touch screen, or with a keyboard; or the same for
//           both). [x] is a key or button, {name} the Shiny Piece class's name, in its colours (and
//           {destroyer}, {gravity}, {expander}: that class's).
//   more:   a second, smaller line under it (as a piece's name has what it does under it)
//   title:  a big first line over it instead, as a piece's name (the modes' pages)
//   cls:    (a class's page) its class; the page is only there if its piece can turn up in a game
//   classes: (the Shiny Pieces' page) the classes side by side, each { cls, id: the piece that
//           shows it off, say: what it does, in a few words }, those that can turn up in a game
//   still:  nothing falls: the page just stays as it is
//   board:  the rows at the bottom of the board, top to bottom ("." empty; each run of one letter
//           is a block of filler, joined up as one piece)
//   pieces: what comes, in order: { id, rot, x: where it starts (the middle at the top), firstMs:
//           how long before the autopilot's first press, if not the usual, to: {
//           rot, x } where the autopilot takes it, or "power": wherever it leaves the least on the
//           board, then: what it does once it's there ("hold": holds it down a moment, "drop":
//           the double tap that drops it straight down, "shelf": a tap on the bay, and the
//           shiny piece of the page's `shelf` class comes in its place; nothing, and it just falls) }
//   again:  (a powerup page) more pieces of its class to come after those, each put where it does
//           the most, for as long as there are more than `until` blocks left on the board
//   powers: its pieces are Shiny Pieces, though it isn't a class's page (where to put them, the bay)
//   shelf:  the class of the bay's Shiny Piece it shows (the page has a bay of its own)
//   mode:   (a mode's page) the mode, to go and play it (src/tutorialui.js)
//   dropMs: how fast its pieces fall, if not the usual (CONFIG.tutorial.dropMs)
//   pace:   the autopilot's presses this many times as far apart as usual
//   free:   no script: one piece after another, for as long as you like, the autopilot putting
//           each somewhere sensible. { levels: the pieces' levels (difficulty), big: giants too,
//           shiny: how often a Shiny Piece instead (each put where it leaves the least) }
export const PAGES = [
  {
    // (a ledge each side, halfway up a pile: the two of them finish the row between them)
    id: "move",
    text: { touch: "Tap the left or right side of the board to move the piece.", keys: "Press [←] or [→] to move the piece." },
    board: [
      "......aa......",
      ".....bcaa.....",
      "....bbcddef...",
      "....gbcddef...",
      "hhhi.jcklef.mm",
      "nno.jjkklefmm.",
      "nn.pjqqkr.sstt",
      "u.pppqq.rrvsst",
    ],
    pieces: [{ id: "cat_loaf", to: { x: 0 } }, { id: "lost_ufo", to: { x: 11 } }],
  },
  {
    // (a slot halfway down that it only fits upside down: two rows go)
    id: "turn",
    text: { touch: "Tap the top of the board to turn it.", keys: "Press [↑] to turn it." },
    board: [
      ".aa.........b.",
      "cdaa.e.....fb.",
      "ccghee.....fbi",
      "jcggekkl...fbi",
      "jmgnnnkko.pfqi",
      "jm.rnssooopqq.",
      "jmrr.sstt.puqv",
      ".mwrxxtt.ypuuv",
    ],
    pieces: [{ id: "lost_ufo", to: { rot: 2, x: 8 } }],
  },
  {
    id: "down",
    text: {
      touch: "Hold the bottom middle to bring it down faster; double tap there to drop it straight down.",
      keys: "Hold [↓] to bring it down faster; double press it to drop it straight down.",
    },
    dropMs: 420, // (slower, so you can see it speed up)
    // (a fat piece into a gap two wide, halfway up the pile: three rows go)
    board: [
      ".a..........b.",
      "aa..........bc",
      "dae........fbc",
      "ddeggh..ijffbc",
      "dkelhh..ijjfmc",
      "kkelhn..iojpmm",
      "kqq.rnnsioopmt",
      "u.qqrrn.vwoptt",
      "uuxx.ryyvw.ptz",
    ],
    pieces: [{ id: "message", rot: 1, x: 6, to: { rot: 1, x: 6 }, then: ["hold", "drop"] }],
  },
  {
    // (a gap one wide, halfway up the pile: three rows go, and everything over them comes down)
    id: "rows",
    text: "Fill a row all the way across and it disappears.",
    board: [
      "..........aa..",
      "b......c..daa.",
      "be..fff.gddhi.",
      "be.jkflggdhhii",
      "be.jjmlgnnnhio",
      "pe.qjmlrsnttoo",
      "ppqq.mlrru.vow",
      ".pqxym.zruuvvw",
      "AABxxC.zzDuE.F",
    ],
    pieces: [{ id: "candy_cane", to: { x: 2 }, then: ["drop"] }],
  },
  {
    // (the three classes side by side, each doing its thing: src/tutorialui.js, src/demo.js)
    id: "shiny", still: true,
    text: "Shiny Pieces come in three classes, each with its own colours and its own trick.",
    classes: [
      { cls: "destroyer", id: "toadstool", say: "destroy what's in their highlight" },
      { cls: "gravity", id: "anvil", say: "drop it down into the holes under it" },
      { cls: "expander", id: "expanding_foam", say: "fill the gaps in it with new blocks" },
    ],
    board: [
      "aa.b.....cde..",
      "fabb.gh.icddj.",
      "ffb.gghhickjjl",
      "mfnngo.hickkjl",
    ],
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
      "..ll.n.Djo.mm.",
      "pqqr.nnsoo.ttu",
      "pqrrvv.swwxx.u",
      "yy.zvAAsBBxCCu",
    ],
    pieces: [{ id: "toadstool", to: { x: 7 }, then: ["drop"] }],
    again: ["one_ring", "eye_of_sauron", "small_asteroid", "katana", "stomach"],
  },
  {
    // (holes all through it, five blocks in every column: once it has all come down, five rows go)
    id: "gravity", cls: "gravity",
    text: "{name} drop the blocks in their highlight as far as they'll go, filling the holes under them.",
    more: "Good for holes you can't get at.",
    board: [
      "abcc.dde.fggg.",
      "hhhhi..e.jgkk.",
      "....l..mmj..kk",
      "nop..qq.r.s.tt",
      "..p.uuqqrr..tt",
      "vw.xx.y.zrAA.B",
      "v.xxCD....AA..",
      ".E.F.DGGH..I.J",
    ],
    pieces: [{ id: "anvil", to: { x: 7 }, then: ["drop"] }],
    again: ["hippo_bellyflop", "sumo_wrestler", "steamroller"],
  },
  {
    // (a pile full of gaps down the middle, some of them covered over: filled in, five rows go;
    // the gaps left under them are for the next ones)
    id: "expander", cls: "expander",
    text: "{name} fill every empty cell in their highlight with new blocks.",
    more: "Drop one on a pile full of gaps.",
    board: [
      ".a..........bc",
      "daa........bbc",
      "daeff...gghibc",
      "deeff.j..hhhkc",
      "delm.n.o.pqkkr",
      "sllm..oo.ppkrr",
      "stlmu.o.vvpwrx",
      "s.ym.zAA.vBwxx",
      "sC.Dzz.A.BBwEE",
      ".CCDDz.FFBGGEE",
    ],
    pieces: [{ id: "expanding_foam", to: { x: 6 }, then: ["drop"] }],
    again: ["packing_peanuts", "microwave_popcorn", "spilled_paint", "storm_cloud"],
  },
  {
    // (a row of junk halfway up a pile full of gaps: it burns that row away and fills the gaps
    // under it, and four rows go; then a pile driver on what's left on the right burns away the
    // row under it and drops what's over the holes into them. Every part of each one does
    // something you can see)
    id: "combo", cls: "combo",
    text: "{name} do two things at once, each in its own colours.",
    more: "This one burns away its row and fills in the gaps below.",
    board: [
      ".ab......ccccd",
      ".aa........ef.",
      "gah......iiee.",
      "gghhj...kiielm",
      "gnho.p..kkqllm",
      "rnoo.pp.skqtlm",
      "rruo.p.v.wqttm",
      "ruuxy.z..wqtAA",
      "BBux.CzD..EEAA",
      "BBFFCC.DGG..HH",
    ],
    pieces: [{ id: "jelly_mould", to: { x: 5 }, then: ["drop"] }],
    again: ["pile_driver", "jelly_mould"],
  },
  {
    // (overhangs on the left, enough to fill it to halfway once they come down; gaps on the right;
    // and the middle, where neither reaches, solid but for a hole in each of the bottom two rows:
    // the two together take the four rows over those away)
    id: "plan", powers: true,
    text: "Think about where each one goes: a {gravity} on the left drops those overhangs into their holes, and an {expander} on the right fills the gaps.",
    board: [
      ".a.b..........",
      "aaab..........",
      "c.dbee.f......",
      "cc..geef......",
      ".ch.g.ifj.k.l.",
      "m.hh.iifjn.ll.",
      ".o..ppiqj.rl.s",
      "t..u.ppqjrr.vs",
      "..wuu.x.yr.vvs",
      "zww.uA.ByCCv.s",
    ],
    pieces: [{ id: "hippo_bellyflop", to: { x: 0 }, then: ["drop"] }, { id: "storm_cloud", to: { x: 10 }, then: ["drop"] }],
  },
  {
    // (an awkward piece over a hill: the bay's Destroyerz goes in its place, and blasts a round
    // hole in the top of the hill)
    id: "shelf", powers: true, shelf: "destroyer",
    text: {
      touch: "Every game you get an Extra Shiny Piece of each class to keep for when you need it: tap Extra Shiny Pieces and the next one takes the falling piece's place.",
      keys: "Every game you get an Extra Shiny Piece of each class to keep for when you need it: press [Space] (or click Extra Shiny Pieces) and the next one takes the falling piece's place.",
    },
    dropMs: 420,
    board: [
      "......aa......",
      ".....bcaa.....",
      "....bbc.dd....",
      "...efbcddgg...",
      "..eeff.hhhh...",
      ".iejfkllmmmn..",
      ".iojjk.llmpnn.",
      "qiojrksttppun.",
      "qio.rkssttpuuv",
      "qwoxry.szzAuvv",
    ],
    pieces: [{ id: "pyramid", firstMs: 1800, then: ["shelf"] }], // (a moment to see the finger go to the bay)
  },
  {
    id: "giants",
    text: "As the game goes on, the pieces get bigger and fall faster, but the Shiny Pieces get better too.",
    board: [
      "a.............",
      "abb...........",
      "accd..........",
      "eccdd.........",
    ],
    pieces: [{ id: "pyramid", to: { x: 5 }, then: ["drop"] }],
  },
  // The modes, a page each: what it is, over a board playing the way it does, and a button to go
  // and play it.
  {
    id: "classic", mode: "normal", title: "Classic",
    text: "That's everything! Classic is the full game.",
    more: "It starts easy, then the pieces get bigger, faster and stranger, and Shiny Pieces turn up to help.",
    free: { levels: [1, 2], shiny: 0.16 },
    dropMs: 380, // (gently: time for the autopilot, or the player, to get each one where it goes)
    board: [
      "a.....bb...cc.",
      "aadd..beeffcg.",
      "hhdii.jeekfggl",
    ],
  },
  {
    id: "godmode", mode: "god", title: "God mode",
    text: "Every Shiny Piece and every giant, right from the start.",
    more: "Total chaos.",
    free: { levels: [3, 4], big: true, shiny: 0.45 },
    dropMs: 300,
    board: [
      "..aa.....bbb..",
      "c.aadd..eeb.ff",
      "ccgdd.hheei.ff",
    ],
  },
  {
    id: "zen", mode: "zen", title: "Zen",
    text: "Slow and easy: it plays itself.",
    more: "Take a piece over whenever you like, and leave it be again.",
    free: { levels: [1], shiny: 0.08 },
    dropMs: 700, pace: 1.5,
    board: [
      "a............b",
      "aa..cc...dd.bb",
    ],
  },
  {
    id: "turbo", mode: "turbo", title: "Turbo zen",
    text: "It plays itself, fast, and never stops.",
    more: "Jump in any time.",
    free: { levels: [1, 2], shiny: 0.12 },
    dropMs: 110, pace: 0.25,
    board: [
      "a..bb..cc..dd.",
      "aeebff.gchhdii",
    ],
  },
  {
    id: "extreme", mode: "extreme", title: "Extreme",
    text: "No Shiny Pieces. No help.",
    more: "Just you and the pieces.",
    free: { levels: [1, 2, 3] },
    dropMs: 250,
    board: [
      "a...bb....cc..",
      "aad.beef.gccc.",
      "hhddiief.ggjj.",
    ],
  },
];

// The Shiny Pieces that can turn up in a game: switched on (CONFIG.assist.powerups.disabledTypes),
// and not only ever part of a set.
const liveShiny = (s) => !!s?.powerup && isPowerupEnabled(s) && (s.frequency ?? 1) > 0 && !s.powerup.setOnly;

// The pages for this game: a class's page only if its piece can turn up (its class is switched
// on), the Shiny Pieces' page with the classes that can, a mode's page only if the mode is there
// to play, and any page whose pieces have gone missing left out.
export function tutorialPages(state) {
  const live = (id) => {
    const s = state.allById.get(id);
    return !!s && (!s.powerup || liveShiny(s));
  };
  return PAGES.map(p => (p.classes ? { ...p, classes: p.classes.filter(c => live(c.id)) } : p))
    .filter(p => (p.pieces ?? []).every(q => live(q.id))
      && (!p.shelf || state.allById.has(CONFIG.shelf?.pieces?.[p.shelf]))
      && (!p.classes || p.classes.length > 0)
      && (!p.mode || (CONFIG.modes[p.mode] && !CONFIG.modes[p.mode].hidden)));
}

// What a page says, with a keyboard ("keys") or on a touch screen ("touch"): its sentence, and
// the line under it.
export function tutorialText(page, view = "touch") {
  const say = typeof page.text === "string" ? page.text : page.text?.[view] ?? page.text?.touch ?? "";
  return { title: page.title ?? null, say, more: page.more ?? null };
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
    again: [],          // and more of its class, while there's plenty left on the board (`again`)
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
  let spec = page.free ? freePiece(state, t) : t.queue.shift();
  // (a powerup page: more of its class, while the board has plenty left on it)
  while (!spec && t.again.length && blocksLeft(state) > (page.until ?? 10)) {
    const id = t.again.shift();
    if (state.allById.get(id)) spec = { id, to: "power", then: ["drop"] };
  }
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
  // (one it didn't hand out: off the shelf, in place of the one that was falling. Wherever it
  // does the most.)
  else if (a && a !== t.active) { t.spec = { shape: a.shape, to: "power", then: ["drop"] }; begin(state, t, a); }
  if (!a) {
    // all landed and settled: a moment to take it in, and round it goes again
    if (!page.free && !page.still && !t.queue.length && !t.fresh && settled(state) && (t.restMs += dt) >= T.restMs) {
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
  t.again = [...(page.again ?? [])];
  // (the shelf's page has a shelf, full again each time round; no other page has one)
  state.shelf = page.shelf ? createShelf(state, { demo: true }) : null;
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
  const lib = fillerPieces(state);
  blocks.forEach((b, i) => {
    // (one of the game's pieces, if one has its outline: a different one each time it can)
    const x0 = Math.min(...b.cells.map(c => c.x)), y0 = Math.min(...b.cells.map(c => c.y));
    const w = Math.max(...b.cells.map(c => c.x)) - x0 + 1, h = Math.max(...b.cells.map(c => c.y)) - y0 + 1;
    const key = Array.from({ length: h }, (_, j) => Array.from({ length: w }, (_, k) => (b.cells.some(c => c.x === x0 + k && c.y === y0 + j) ? 1 : 0)).join("")).join("/");
    const options = lib.get(key);
    if (options?.length) {
      const { shape, rot } = options[(i * 7 + b.cells.length) % options.length];
      const pid = state.nextPid++;
      for (const { x, y } of b.cells) state.board[y][x] = { paint: getShapePaint(shape, rot, x - x0, y - y0), style: shape.style, pid };
      state.instances.set(pid, { shape, rotIdx: rot, x: x0, y: y0, cells: b.cells.map(c => ({ ...c })), total: b.cells.length, intact: true });
      b.colour = shape.style?.baseColor ?? "#888888";
      return;
    }
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

// The game's ordinary pieces by outline, every turn they can take: { "1100/0111": [{ shape, rot }] }
function fillerPieces(state) {
  const out = new Map();
  for (const s of state.allShapes ?? state.shapes) {
    if (s.powerup || (s.difficulty ?? 1) > 3 || !((s.frequency ?? 1) > 0) || !inGame(s) || s.remix || s.seam) continue;
    for (let r = 0; r < reachableTurns(s); r++) {
      const key = s.rotations[r].map(row => row.map(c => (c ? 1 : 0)).join("")).join("/");
      (out.get(key) ?? out.set(key, []).get(key)).push({ shape: s, rot: r });
    }
  }
  return out;
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
  const spec = t.spec;
  t.wait = (spec.firstMs ?? CONFIG.tutorial.firstMs) * pace(t);
  // (a mode's page: where zen's autopilot would put it, playing as a person would, never in
  // under an overhang; or else somewhere sensible)
  // (with the piece after it in mind, as a person would: t.freeNext)
  const calm = spec.free ? bestPlacement({ board: state.board, mode: "zen" }, a.shape, undefined, 4, t.freeNext?.shape?.powerup ? null : t.freeNext?.shape ?? null) : null;
  const to = spec.free ? (calm && !calm.slide ? { rot: calm.rot, x: calm.x } : bestSpot(state, a.shape, a.x))
    : spec.to === "power" ? powerSpot(state, a.shape) ?? bestSpot(state, a.shape, a.x)
    : spec.to;
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
    t.wait = T.stepMs * pace(t);
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
  t.wait = (t.hint.aim === "drop" || (key === "down" && t.hint.aim === "down") ? T.tapGapMs : T.stepMs) * pace(t);
}

// (how far apart the autopilot's presses are on this page: its `pace`)
const pace = (t) => t.pages[t.page]?.pace ?? 1;

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
    case "shelf": useShelf(state, shelfSlot(state, t)); break;
  }
}

// The slot of the shelf the page shows (its `shelf` class), or the first.
export function shelfSlot(state, t = state.tutorial) {
  const cls = t?.pages[t.page]?.shelf;
  return Math.max(0, state.shelf?.slots.findIndex(s => s.cls === cls) ?? 0);
}

/* =========================
   The modes' pages: one piece after another, the way each mode has them
   ========================= */

// The pieces a mode's page plays with (its `free`): of its levels, and not too big for the board
// (giants only if it says so); and its Shiny Pieces (of the three classes, small ones unless it
// has giants). Made once a page.
function freePools(state, t, page) {
  t.freePools ??= new Map();
  if (t.freePools.has(page.id)) return t.freePools.get(page.id);
  const F = page.free === true ? {} : page.free, levels = F.levels ?? [1], big = !!F.big;
  const fits = (s) => {
    const m = s.rotations[0], n = m.flat().filter(Boolean).length;
    return n >= 3 && (big ? m.length <= 6 && m[0].length <= 8 && n <= 24 : n <= 6 && m.length <= 4 && m[0].length <= 4);
  };
  const pieces = state.allShapes.filter(s => levels.includes(s.difficulty ?? 1) && (s.frequency ?? 1) >= 0.3 && inGame(s) && !s.powerup && !s.remix && !s.seam && fits(s));
  const shiny = F.shiny ? (state.allPowerups ?? state.powerups).filter(s => liveShiny(s) && ["destroyer", "gravity", "expander"].includes(s.powerup.cls) && !s.powerup.bad && fits(s)) : [];
  const out = { pieces, shiny, chance: shiny.length ? F.shiny : 0 };
  t.freePools.set(page.id, out);
  return out;
}

function freePiece(state, t) {
  const page = t.pages[t.page], { pieces, shiny, chance } = freePools(state, t, page);
  if (!pieces.length) return null;
  // (one ahead, so the autopilot can play this one with the next in mind)
  const draw = () => {
    if (chance && state.rng() < chance) {
      const s = shiny[Math.floor(state.rng() * shiny.length)];
      return { id: s.id, shape: s, to: "power", then: ["drop"] };
    }
    let s = pieces[0];
    for (let k = 0; k < 8; k++) {
      s = pieces[Math.floor(state.rng() * pieces.length)];
      if (!t.recent.includes(s.id)) break;
    }
    t.recent = [...t.recent.slice(-4), s.id];
    return { id: s.id, shape: s, free: true, then: ["drop"] };
  };
  // (a new page: what was drawn ahead for the last one isn't this one's)
  if (t.freeFor !== page.id) { t.freeFor = page.id; t.freeNext = null; }
  const now = t.freeNext ?? draw();
  t.freeNext = draw();
  return now;
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

// Where a powerup leaves the least on the board, once it has gone off and any rows it finishes
// have gone (zen's own trial run of it), and then where it does the most. ({ rot, x }, or null.)
function powerSpot(state, shape) {
  if (!shape.powerup) return null;
  const { rows } = CONFIG.board;
  let best = null;
  for (let r = 0; r < reachableTurns(shape); r++) {
    const mat = shape.rotations[r], w = mat[0].length, h = mat.length;
    for (let x = 0; x + w <= CONFIG.board.cols; x++) {
      let y = -h;
      while (y + h <= rows && !collides(state, x, y + 1, mat)) y++;
      if (mat.some((row, j) => y + j < 0 && row.some(Boolean))) continue;
      const res = tryPowerup(state, shape, r, x, y);
      let left = 0;
      for (const v of res.occ) left += v;
      const s = -left + res.affected * 0.05 - r * 0.01;
      if (!best || s > best.s) best = { rot: r, x, s };
    }
  }
  return best;
}

function blocksLeft(state) {
  let n = 0;
  for (const row of state.board) for (const c of row) if (c) n++;
  return n;
}
