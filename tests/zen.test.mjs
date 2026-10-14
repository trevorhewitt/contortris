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
import { zenStart, zenIgnoreInput, pluralName, planTiles, oopsName, zenKeys } from "../src/zen.js";

const { shapes, powerups } = loadShapes(SHAPES);
const { rows, cols } = CONFIG.board;
const height = (state) => { const y = state.board.findIndex(r => r.some(Boolean)); return y < 0 ? 0 : rows - y; };

function zen(seed, mode = "zen") {
  const state = createGameState(shapes, powerups, { rng: makeRng(seed), groups: GROUPS, threads: { threads: THREADS, sets: SET_THREADS } });
  const log = { movements: [], rescues: 0, over: false, maxHeight: 0, clears: [], helped: [], callouts: [], high: 0, frames: 0 };
  let lastLock = null;
  on(state, (t, d) => {
    if (t === "lock") lastLock = d.shape;
    if (t === "zenMovement") log.movements.push({ name: d.name, caption: d.caption, drops: state.drops, lines: state.lines, height: height(state) });
    if (t === "zenRescue") log.rescues++;
    if (t === "gameOver") log.over = true;
    // (the stack: a powerup that vanishes when it fires sits on top only for a moment)
    if (t === "lock" && !d.shape.powerup?.consume) log.maxHeight = Math.max(log.maxHeight, height(state));
    // (rows a powerup filled in, apart: a big filler on a gappy stack can bring a lot down at once)
    if (t === "rowsDestroyed" && d.source === "clear") { (lastLock?.powerup ? log.helped : log.clears).push(d.count); log.callouts.push(...state.fx.callouts.map(c => c.text)); }
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
  assert.ok(Math.max(0, ...log.helped) <= 12, `a powerup's help, ${Math.max(0, ...log.helped)} rows at once`);
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

test("turbo zen: a piece still out of sight when the player takes it comes straight to the top of the board", () => {
  const { state } = zen(3, "turbo");
  let found = false;
  for (let t = 0; t < 120000 && !found; t += 16) {
    updateGame(state, 16);
    const a = state.active;
    if (!a || state.effect || state.hold || state.zen.userHas || a !== state.zen.piece) continue;
    const h = a.shape.rotations[a.rotIdx].length;
    if (a.y >= -h - 2) continue; // (one well out of sight)
    found = true;
    markInput(state, "keyboard");
    updateGame(state, 16);
    assert.equal(state.zen.userHas, true);
    assert.ok(a.y >= -h - 1, `${a.shape.id} still ${-a.y - h} rows out of sight`);
  }
  assert.ok(found, "no piece came from out of sight");
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
    const j = log.movements.findIndex((m, k) => k > i && !seals.has(m.name) && m.name !== "demolition");
    assert.ok(i >= 0 && j > i, `${end}: never finished: ${log.movements.map(m => m.name)}`);
    const a = log.movements[i], b = log.movements[j];
    assert.ok(peak >= 18, `${end}: built ${peak} rows`);
    // (the pacmen and taps: a few of them eating rows, and then the rest in big bites, while that's
    // worth it)
    if (end === "powered") assert.ok(log.movements.slice(i + 1, j + 1).some(m => m.name === "demolition") && b.height <= peak - 10, `${end}: left ${b.height} rows of ${peak}: ${log.movements.map(m => m.name)}`);
    else assert.ok(b.height <= 3, `${end}: left ${b.height} rows`);
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
  assert.ok(labels.length >= 4, `${labels.length} of them`); // (the bigger the thing, the fewer it takes)
  assert.equal(shapes.size, 1, `only one thing: ${[...shapes]}`);
  assert.equal(new Set(labels).size, 1, "said the same all the way up");
  assert.ok(labels[0] === null || /^(Oops, all .+!|(.+) \2 \2!!|(.+) \3 and more \3|the strategic reserve of .+)$/.test(labels[0]), labels[0]);
  assert.ok(peak >= 14, `up to ${peak} rows`);
  const i = log.movements.findIndex(m => m.name === "oops");
  // (by the demolition, or the tidying up after it; or, if that left some of it to build on, the
  // next one after that)
  const after = log.movements.slice(i + 1).filter(m => !["demolition", "tidy", "settle", "sweep"].includes(m.name)).slice(0, 2);
  assert.ok(after.some(m => m.height <= 8), `and then down it came (${log.movements.slice(i, i + 6).map(m => `${m.name}@${m.height}`).join(" ")})`);
});

test("a board full of one thing has a name for it, now and then just its own", () => {
  const state = { rng: makeRng(3) };
  const said = (kind) => oopsName(state, "a bagpipe", kind);
  assert.equal(said("plain"), null);
  assert.equal(said("oops"), "Oops, all bagpipes!");
  assert.equal(said("thrice"), "bagpipe bagpipe bagpipe!!");
  assert.equal(said("more"), "bagpipes bagpipes and more bagpipes");
  assert.equal(said("reserve"), "the strategic reserve of bagpipes");
  const kinds = new Set(Array.from({ length: 200 }, () => String(oopsName(state, "a bagpipe"))));
  assert.equal(kinds.size, 5, [...kinds].join(" / "));
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

test("turbo zen: tiles in patterns, built up and then all brought down at once", () => {
  for (const kind of ["floor", "bricks", "pinwheels", "waves", "lizards"]) {
    const { state, log } = zen(3, "turbo");
    state.active = null;
    const res = planTiles(state, kind);
    assert.ok(res, `${kind}: no plan`);
    const tiles = res.items.filter(it => it.shape.tags?.includes("tiles"));
    assert.ok(tiles.length >= 20, `${kind}: ${tiles.length} tiles`);
    // (the last of them, one of the tallest pieces, takes nearly all of it at once)
    const last = res.items[res.items.length - 1];
    assert.ok(last.key && last.dramatic, `${kind}: ends with ${last.shape.id}`);
    assert.ok(res.items.slice(0, -1).every(it => !it.expect.some((v, k) => k < cols * 3 && v)), `${kind}: keeps clear of the top`);
  }
  // and in the game
  const { state, log } = zen(3, "turbo");
  zenStart(state, "tiles");
  log.movements.length = 0;
  run(state, log, 3 * 60000);
  const i = log.movements.findIndex(m => m.name === "tiles");
  assert.ok(i >= 0 && log.movements[i + 1], `never finished: ${log.movements.map(m => m.name)}`);
  assert.ok(log.clears.some(n => n >= 18), `${log.clears}`);
});

test("turbo zen: now and then a strange piece or two is built into a tiling, the tiles round it grouted", () => {
  const was = CONFIG.zen.tileGuests;
  CONFIG.zen.tileGuests = { ...was, counts: [0, 0, 1, 0] }; // (two, always)
  try {
    let seen = 0;
    for (const kind of ["floor", "bricks", "pinwheels", "waves", "lizards"]) for (const seed of [3, 4]) {
      const { state } = zen(seed, "turbo");
      state.active = null;
      const res = planTiles(state, kind);
      assert.ok(res, `${kind}: no plan`);
      const guests = res.items.filter(it => !it.key && !it.shape.tags?.includes("tiles"));
      assert.ok(guests.length <= 2, `${kind}: ${guests.map(g => g.shape.id)}`);
      if (!guests.length) continue;
      seen++;
      for (const g of guests) assert.ok(res.caption.includes(g.shape.name), `${kind}: "${res.caption}"`);
      // (still the whole thing, every cell of it filled, and then the tallest piece takes it all)
      const last = res.items[res.items.length - 1];
      assert.ok(last.key && last.dramatic, `${kind}: ends with ${last.shape.id}`);
      const before = res.items[res.items.length - 2].expect;
      const rowsFull = [...Array(rows).keys()].filter(y => [...Array(cols - 1).keys()].every(x => before[y * cols + x])).length;
      assert.ok(rowsFull >= 18, `${kind}: ${rowsFull} rows ready`);
    }
    assert.ok(seen >= 6, `guests in ${seen} of 10`);
  } finally { CONFIG.zen.tileGuests = was; }
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
  let pauses = 0, big = 0, at = null, before = 0;
  on(t.state, (e, d) => {
    // (a powerup's pause is before it falls: it waits up above the board)
    if (e === "dramaticPause" && d.on && t.state.active) { before++; assert.ok(t.state.active.shape.powerup && t.state.active.y < 0, `${t.state.active.shape.id} at ${t.state.active.y}`); }
    if (e === "dramaticPause" && d.on) at = blocksOn(t.state);
    // (judged when the next piece comes: one still going at the end doesn't count)
    if (e === "spawn" && at != null) { pauses++; if (at - blocksOn(t.state) >= Math.min(D.minBlocks, D.minRows * cols) * 0.9) big++; at = null; }
  });
  run(t.state, t.log, 12 * 60000);
  assert.ok(pauses >= 3, `${pauses} pauses`);
  assert.equal(big, pauses, `${big} of ${pauses} pauses before a big one`);
  console.log(`${pauses} pauses, ${before} of them before a powerup fell`);
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

test("turbo zen on a big board: often a few pieces fall at once, each in columns of its own, and plans still work out", () => {
  const usual = { cols: CONFIG.board.cols, rows: CONFIG.board.rows };
  CONFIG.board.cols = 44; CONFIG.board.rows = 30;
  try {
    for (const start of ["column", "tiles", "mono", "standing"]) {
      const { state, log } = zen(3, "turbo");
      zenStart(state, start);
      // (counting the first piece's flock, already falling)
      let spawns = 0, flocks = 0, extra = state.flock.length, landed = 0, apart = true;
      on(state, (t, d) => {
        if (t === "lock" && d.flock) landed++;
        if (t !== "spawn") return;
        spawns++;
        if (!state.flock.length) return;
        flocks++; extra += state.flock.length;
        assert.ok(state.flock.every(f => !f.shape.powerup), "never a powerup");
        const spans = [state.active, ...state.flock].map(p => [p.x, p.x + p.shape.rotations[p.rotIdx][0].length]).sort((a, b) => a[0] - b[0]);
        for (let i = 1; i < spans.length; i++) if (spans[i][0] < spans[i - 1][1]) apart = false;
      });
      run(state, log, 3 * 60000);
      assert.ok(flocks >= spawns * 0.25, `${start}: ${flocks} flocks in ${spawns} spawns`);
      assert.ok(apart, `${start}: each in columns of its own`);
      assert.equal(landed + state.flock.length, extra, `${start}: ${landed} of ${extra} landed (and ${state.flock.length} still falling)`);
      assert.equal(log.rescues, 0, `${start}: never needed rescuing`);
      assert.ok(!log.movements.some(m => m.name === "abandoned"), `${start}: the plans came out as planned`);
    }
  } finally {
    CONFIG.board.cols = usual.cols; CONFIG.board.rows = usual.rows;
  }
  // (and on the usual board, one at a time)
  const { state, log } = zen(3, "turbo");
  let flocks = 0;
  on(state, (t) => { if (t === "spawn" && state.flock.length) flocks++; });
  run(state, log, 60000);
  assert.equal(flocks, 0);
});

test("turbo zen can open with something in particular, the first time since the page was loaded", () => {
  const was = CONFIG.zen.opening;
  CONFIG.zen.opening = { turbo: { movement: "squares" } };
  try {
    const state = createGameState(shapes, powerups, { rng: makeRng(9), groups: GROUPS, threads: { threads: THREADS, sets: SET_THREADS } });
    state.zenOpenings = new Set(); // (as the UI keeps it)
    startRun(state, "turbo");
    assert.equal(state.zen.movement?.name, "squares");
    // (and the next game doesn't)
    startRun(state, "turbo");
    assert.notEqual(state.zen.after, "squares");
  } finally { CONFIG.zen.opening = was; }
});

test("turbo zen on a board of another height: the tallest pieces as tall as it is, the ends as they were", () => {
  const usual = { ...CONFIG.board };
  try {
    for (const h of [26, 37]) {
      CONFIG.board.rows = h; CONFIG.board.cols = 17;
      const state = createGameState(shapes, powerups, { rng: makeRng(3) });
      const keys = zenKeys(state);
      assert.equal(keys.length, 5, `${h}: ${keys.map(k => k.id)}`);
      for (const k of keys) {
        const base = shapes.find(s => k.id === `${s.id}_${h}`);
        assert.ok(base, k.id);
        assert.equal(k.rotations[0].length, h, k.id);
        assert.ok(k.rotations[0].every(r => r.every(Boolean)), `${k.id}: solid`);
        // (the top and the bottom of the picture as they were)
        assert.deepEqual(k.cellPaints[0][0], base.cellPaints[0][0], `${k.id}: the top`);
        assert.deepEqual(k.cellPaints[0][h - 1], base.cellPaints[0][23], `${k.id}: the bottom`);
      }
      assert.equal(zenKeys(state), keys, "(made once)");
    }
  } finally { Object.assign(CONFIG.board, usual); }
});

test("row clears have names all the way up to the whole board", () => {
  const names = CONFIG.fx.callouts.multiRow;
  for (let n = 2; n <= rows; n++) assert.ok(names[n], `no name for ${n}`);
  assert.equal(new Set(Object.values(names)).size, Object.keys(names).length);
  assert.match(names[rows], /^quattuorvigintuple/);
});
