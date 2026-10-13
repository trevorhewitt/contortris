// Run with:  node --test tests/*.test.mjs
// Zen mode: slow and easy, and it can't be lost. Turbo zen: it plays itself, fills the board to the
// brink and brings it all down, and never ends.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { GROUPS } from "../shapes/groups.js";
import { THREADS, SET_THREADS } from "../shapes/threads.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, updateGame, hardDropAndLock, markInput, tryMove, on } from "../src/game.js";
import { zenStart, zenIgnoreInput, pluralName } from "../src/zen.js";

const { shapes, powerups } = loadShapes(SHAPES);
const { rows, cols } = CONFIG.board;
const height = (state) => { const y = state.board.findIndex(r => r.some(Boolean)); return y < 0 ? 0 : rows - y; };

function zen(seed, mode = "zen") {
  const state = createGameState(shapes, powerups, { rng: makeRng(seed), groups: GROUPS, threads: { threads: THREADS, sets: SET_THREADS } });
  const log = { movements: [], rescues: 0, over: false, maxHeight: 0, clears: [], callouts: [], high: 0, frames: 0 };
  on(state, (t, d) => {
    if (t === "zenMovement") log.movements.push({ name: d.name, caption: d.caption, drops: state.drops, lines: state.lines, height: height(state) });
    if (t === "zenRescue") log.rescues++;
    if (t === "gameOver") log.over = true;
    if (t === "lock") log.maxHeight = Math.max(log.maxHeight, height(state));
    if (t === "rowsDestroyed" && d.source === "clear") { log.clears.push(d.count); log.callouts.push(...state.fx.callouts.map(c => c.text)); }
  });
  startRun(state, mode);
  return { state, log };
}

const run = (state, log, ms, each = null) => {
  for (let t = 0; t < ms; t += 32) {
    each?.();
    updateGame(state, 32);
    if (log) { log.frames++; if (height(state) >= rows - 6) log.high++; }
  }
};

test("zen: slow and easy — it plays itself, keeps the board low, and never ends", () => {
  const { state, log } = zen(1);
  let low = 0;
  run(state, log, 30 * 60000, () => { if (height(state) <= 12) low++; });
  assert.equal(log.over, false);
  assert.equal(log.rescues, 0, "never needed rescuing");
  // (at an easy pace: a piece every few seconds, even left to itself)
  assert.ok(state.drops > 300 && state.drops < 1000, `${state.drops} pieces`);
  assert.ok(low / log.frames > 0.9, `low ${(low / log.frames * 100).toFixed(0)}% of the time`);
  assert.ok(log.maxHeight <= rows - 6, `up to ${log.maxHeight} rows`);
  assert.ok(Math.max(...log.clears) <= 6, `never anything built up to bring down: ${Math.max(...log.clears)} rows at once`);
  const kinds = new Set(log.movements.map(m => m.name));
  for (const k of ["column", "beds", "crack", "mess", "build", "demolition", "mono", "waves"]) assert.ok(!kinds.has(k), `${k} in zen`);
  assert.ok(["family", "colours", "twos", "rain"].filter(k => kinds.has(k)).length >= 3, `${[...kinds]}`);
});

test("zen: each piece comes in as usual, and is turned and moved over to its place a step at a time", () => {
  const { state } = zen(2);
  let checked = 0, moved = 0, piece = null, want = null, path = [];
  on(state, (t) => {
    if (t === "spawn") {
      const a = state.active;
      piece = a; want = state.zen.target; path = [];
      if (!want?.glide) return;
      assert.equal(a.rotIdx, 0, `${a.shape.id} comes in unturned`);
      checked++;
    }
    if (t === "lock" && want?.glide) {
      assert.equal(piece.rotIdx, want.rot, `${piece.shape.id} turned`);
      assert.ok(piece.x === want.x || piece.x === want.slide?.to, `${piece.shape.id} over its place`);
      // (one column at a time, never jumping)
      for (let i = 1; i < path.length; i++) assert.ok(Math.abs(path[i] - path[i - 1]) <= 2, `${piece.shape.id}: ${path}`);
      if (new Set(path).size > 1) moved++;
    }
  });
  run(state, null, 3 * 60000, () => { if (piece && state.active === piece && path[path.length - 1] !== piece.x) path.push(piece.x); });
  assert.ok(checked > 30 && moved > 15, `${checked} pieces, ${moved} moved over`);
});

test("zen: left alone it dozes off and carries on a little quicker, and a touch wakes it", () => {
  const C = CONFIG.zen.calm;
  const { state } = zen(3);
  run(state, null, 3000);
  assert.equal(state.dropMs, C.dropMs, "an easy pace to start with");
  run(state, null, C.idleMs + 8000);
  assert.equal(state.dropMs, C.idleDropMs, "dozing");
  while (!state.active || state.effect || state.active.y < 0) updateGame(state, 16);
  markInput(state, "keyboard");
  tryMove(state, 1, 0);
  updateGame(state, 16);
  assert.equal(state.zen.userHas, true);
  assert.equal(state.dropMs, C.dropMs, "awake, and it's the player's");
  const piece = state.active;
  while (state.active === piece) updateGame(state, 16);
  while (!state.active) updateGame(state, 16);
  assert.equal(state.zen.userHas, false, "the next piece is the computer's");
  assert.equal(state.dropMs, C.dropMs, "still awake");
});

test("zen: once the player touches a piece it's theirs, and the next one is the computer's again", () => {
  const { state } = zen(3);
  run(state, null, 4000);
  while (!state.active || state.effect || state.active.y < 0) updateGame(state, 16);
  const piece = state.active;
  // the player nudges it, as far left as it goes
  markInput(state, "keyboard");
  while (tryMove(state, -1, 0)) { /* all the way */ }
  const x = piece.x, rot = piece.rotIdx;
  updateGame(state, 16);
  assert.equal(state.zen.userHas, true);
  assert.equal(state.dropMs, CONFIG.zen.calm.dropMs, "it falls at the player's pace");
  for (let t = 0; t < 60000 && state.active === piece; t += 16) {
    updateGame(state, 16);
    if (state.active !== piece) break;
    assert.equal(piece.x, x, "the game never moves it back");
    assert.equal(piece.rotIdx, rot);
  }
  assert.notEqual(state.active, piece, "it landed");
  assert.equal(state.zen.userHas, false, "the next piece is the computer's");
  // (and coming back from a pause isn't taking it over)
  markInput(state, "touch");
  zenIgnoreInput(state);
  updateGame(state, 16);
  assert.equal(state.zen.userHas, false);
});

test("zen: nothing the player does can end it, and a little help comes when it's left in a mess", () => {
  for (const mode of ["zen", "turbo"]) {
    const { state, log } = zen(4, mode);
    // the worst player: every piece shoved against a wall and dropped
    let side = -1;
    run(state, log, 10 * 60000, () => {
      if (!state.active || state.effect || state.active.shape.powerup) return;
      markInput(state, "keyboard");
      while (tryMove(state, side, 0)) { /* to the wall */ }
      side = -side;
      hardDropAndLock(state);
    });
    assert.equal(log.over, false, mode);
    assert.equal(state.gameOver, false, mode);
    assert.ok(log.movements.some(m => m.name === "steady" || (mode === "zen" && m.name === "help")), `${mode}: help came`);
    assert.ok(state.drops > (mode === "zen" ? 100 : 300), `${mode}: ${state.drops}`); // (zen's own pieces take their time)
  }
});

test("turbo zen: plays itself for half an hour, filling the board to the brink and bringing it all down", () => {
  const { state, log } = zen(1, "turbo");
  run(state, log, 30 * 60000);
  assert.equal(log.over, false);
  assert.equal(log.rescues, 0, "never needed rescuing");
  assert.ok(state.drops > 1000, `${state.drops} pieces`);
  // it spends a good while near the top...
  assert.ok(log.high / log.frames > 0.15, `near the top ${(log.high / log.frames * 100).toFixed(0)}% of the time`);
  // ...and often the whole board goes at once (the tallest pieces drop into the last column)
  assert.ok(log.clears.filter(n => n === rows).length >= 3, `whole-board clears: ${log.clears.filter(n => n === rows).length}`);
  assert.ok(log.callouts.some(c => /quattuorvigintuple/.test(c)), "and it has a name");
  const kinds = new Set(log.movements.map(m => m.name));
  for (const k of ["demolition", "column", "crack", "mono"]) assert.ok(kinds.has(k), `no ${k} in ${[...kinds]}`);
  assert.ok(kinds.size >= 10, `${[...kinds]}`);
});

test("turbo zen: every piece starts out over the place it's going, already turned", () => {
  const { state, log } = zen(2, "turbo");
  let checked = 0, planned = 0;
  on(state, (t) => {
    if (t !== "spawn") return;
    const z = state.zen, a = state.active, want = z.current?.target ?? z.target;
    if (!want) return;
    assert.equal(a.rotIdx, want.rot, `${a.shape.id} turned`);
    assert.equal(a.x, want.x, `${a.shape.id} over its place`);
    checked++;
    if (z.current?.target) planned++;
  });
  zenStart(state, "column");
  run(state, log, 3 * 60000);
  assert.ok(checked > 100 && planned > 30, `${checked} pieces, ${planned} of them planned`);
});

test("turbo zen: each planned movement builds right up and then clears what it built", () => {
  // (rows cleared at least, and the board left nearly empty)
  const want = { column: rows, beds: rows, well: 10, fall: 5 };
  for (const [name, least] of Object.entries(want)) {
    for (const seed of [2, 5]) {
      const { state, log } = zen(seed, "turbo");
      zenStart(state, name);
      log.movements.length = 0; // (only from here on)
      run(state, log, 5 * 60000);
      const i = log.movements.findIndex(m => m.name === name);
      assert.ok(i >= 0 && log.movements[i + 1], `${name} (seed ${seed}) never finished: ${log.movements.map(m => m.name)}`);
      const a = log.movements[i], b = log.movements[i + 1];
      assert.ok(b.lines - a.lines >= least, `${name} (seed ${seed}) cleared ${b.lines - a.lines} rows`);
      assert.ok(b.height <= 3, `${name} (seed ${seed}) left ${b.height} rows`);
      if (least === rows) assert.ok(log.clears.includes(rows), `${name}: all ${rows} rows at once`);
      assert.ok(!log.movements.some(m => m.name === "abandoned"), "nobody stepped in");
    }
  }
});

test("turbo zen: a crack through every row, built nearly to the top, then sealed every which way", () => {
  const seals = new Set(["pacmen", "taps", "pacmenAndTaps"]);
  for (const end of ["up", "down", "shaker", "middle", "random", "powered", "columns"]) {
    const { state, log } = zen(2, "turbo");
    let peak = 0;
    on(state, (t) => { if (t === "lock") peak = Math.max(peak, height(state)); });
    zenStart(state, "crack", { end });
    log.movements.length = 0;
    run(state, log, 3 * 60000);
    const i = log.movements.findIndex(m => m.name === "crack");
    const j = log.movements.findIndex((m, k) => k > i && !seals.has(m.name));
    assert.ok(i >= 0 && j > i, `${end}: never finished: ${log.movements.map(m => m.name)}`);
    const a = log.movements[i], b = log.movements[j];
    assert.ok(peak >= 18, `${end}: built ${peak} rows`);
    assert.ok(b.height <= 3, `${end}: left ${b.height} rows`);
    // (the rows go as rows, but for the columns, eaten away, and the pacmen, which eat them)
    if (end !== "columns" && end !== "powered") assert.ok(b.lines - a.lines >= 18, `${end}: cleared ${b.lines - a.lines} rows`);
    assert.ok(!log.movements.some(m => m.name === "abandoned"), `${end}: nobody stepped in`);
  }
});

test("turbo zen: oops, all one awkward thing, said all the way up, and then down it comes", () => {
  const { state, log } = zen(6, "turbo");
  const labels = [], shapes = new Set();
  let phase = "before", peak = 0;
  on(state, (t, d) => {
    if (t === "zenMovement") phase = phase === "before" && d.name === "oops" ? "fill" : phase === "fill" ? "after" : phase; // (the first one)
    if (t === "spawn" && phase === "fill" && !d.shape.powerup && !d.shape.tags?.includes("zen")) { labels.push(d.label); shapes.add(d.shape.id); }
    if (t === "lock" && phase === "fill") peak = Math.max(peak, height(state));
  });
  zenStart(state, "oops");
  run(state, log, 4 * 60000);
  assert.ok(labels.length >= 8, `${labels.length} of them`);
  assert.equal(shapes.size, 1, `only one thing: ${[...shapes]}`);
  assert.equal(new Set(labels).size, 1, "said the same all the way up");
  assert.match(labels[0], /^Oops, all .+!$/);
  assert.ok(peak >= 14, `up to ${peak} rows`);
  const i = log.movements.findIndex(m => m.name === "oops");
  const end = log.movements.slice(i + 1).find(m => m.name !== "demolition");
  assert.ok(end && end.height <= 8, "and then down it came");
});

test("names for lots of something", () => {
  const cases = {
    "a bagpipe": "bagpipes", "a cactus that wants a hug": "cacti that want a hug", "Santa stuck in a chimney": "Santas stuck in a chimney",
    "a garden gnome who doesn't even know how to garden": "garden gnomes who don't even know how to garden", "a smooth, smooth saxophone": "smooth, smooth saxophones",
    "a trail of footprints, going nowhere": "trails of footprints, going nowhere", "Big Ben": "Big Bens", "a swarm of bees": "swarms of bees",
    "a gingerbread man": "gingerbread men", "the tip of the iceberg": "tips of the iceberg", "a tornado with a cow in it": "tornadoes with a cow in it",
  };
  for (const [one, many] of Object.entries(cases)) assert.equal(pluralName(one), many);
});

test("turbo zen: a mess is built nearly to the top, full of gaps, and then demolished", () => {
  const { state, log } = zen(6, "turbo");
  let top = null, gaps = 0;
  on(state, (t, d) => {
    if (t === "zenMovement" && d.name === "demolition" && top == null) { // (the mess's own)
      top = height(state);
      for (let x = 0; x < cols; x++) for (let y = rows - top, seen = false; y < rows; y++) { if (state.board[y][x]) seen = true; else if (seen) gaps++; }
    }
  });
  zenStart(state, "mess");
  log.movements.length = 0;
  run(state, log, 4 * 60000);
  const i = log.movements.findIndex(m => m.name === "demolition");
  assert.ok(i >= 0 && log.movements[i + 1], `never finished: ${log.movements.map(m => m.name)}`);
  assert.ok(top >= rows - 6, `built ${top} rows`);
  assert.ok(gaps >= 10, `${gaps} gaps`);
  assert.ok(log.movements[i + 1].height <= 8, `left ${log.movements[i + 1].height} rows`);
});

test("turbo zen: the piece that brings the board down lands, then a dramatic pause with it all aglow, then down it comes", () => {
  const D = CONFIG.zen.dramatic;
  const blocksOn = (state) => state.board.reduce((n, r) => n + r.filter(Boolean).length, 0);
  // (a whole board's worth: the tallest piece drops into the last column)
  const { state, log } = zen(2, "turbo");
  const events = [];
  on(state, (t, d) => {
    if (t === "dramaticPause") events.push({ t: d.on ? "on" : "off", at: state.zen.clock, full: state.board.filter(r => r.every(Boolean)).length, active: !!state.active, glow: !!state.fx.admire });
    if (t === "rowsDestroyed") events.push({ t: "gone", n: d.count });
  });
  zenStart(state, "column");
  run(state, log, 3 * 60000);
  const i = events.findIndex(e => e.t === "on");
  assert.ok(i >= 0, "a dramatic pause");
  const [pause, over, gone] = events.slice(i, i + 3);
  assert.equal(pause.active, false, "it had landed");
  assert.ok(pause.full >= D.minRows, `${pause.full} full rows waiting`);
  assert.ok(pause.glow, "all aglow");
  assert.equal(over.t, "off");
  assert.ok(over.at - pause.at >= D.pauseMs * CONFIG.modes.turbo.timeScale - 40, `paused ${over.at - pause.at}`);
  assert.equal(gone.t, "gone");
  assert.ok(gone.n >= D.minRows, `then ${gone.n} rows went`);
  // and only ever before the big ones: most of the board gone by the next piece
  const t = zen(8, "turbo");
  let pauses = 0, big = 0, at = null;
  on(t.state, (e, d) => {
    if (e === "dramaticPause" && d.on) at = blocksOn(t.state);
    // (judged when the next piece comes: one still going at the end doesn't count)
    if (e === "spawn" && at != null) { pauses++; if (at - blocksOn(t.state) >= Math.min(D.minBlocks, D.minRows * cols) * 0.9) big++; at = null; }
  });
  run(t.state, t.log, 12 * 60000);
  assert.ok(pauses >= 3, `${pauses} pauses`);
  assert.equal(big, pauses, `${big} of ${pauses} pauses before a big one`);
});

test("turbo zen: faster, with movements of its own", () => {
  assert.ok(CONFIG.modes.turbo.zen && CONFIG.modes.turbo.timeScale > 1);
  const { state, log } = zen(8, "turbo");
  run(state, log, 12 * 60000);
  assert.equal(log.over, false);
  assert.ok(state.drops > 600, `${state.drops} pieces`);
  const kinds = new Set(log.movements.map(m => m.name));
  assert.ok(["mono", "small", "big", "chorus", "oops", "standing", "colour", "squares", "waves", "blackholes", "expanders"].filter(k => kinds.has(k)).length >= 4, `${[...kinds]}`);
});

test("row clears have names all the way up to the whole board", () => {
  const names = CONFIG.fx.callouts.multiRow;
  for (let n = 2; n <= rows; n++) assert.ok(names[n], `no name for ${n}`);
  assert.equal(new Set(Object.values(names)).size, Object.keys(names).length);
  assert.match(names[rows], /^quattuorvigintuple/);
});
