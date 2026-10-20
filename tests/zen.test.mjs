// Run with:  node --test tests/*.test.mjs
// Zen mode: the player plays, at an easy pace, and the computer only steps in to save them: it
// can't be lost. Turbo zen: it plays itself, fills the board to the brink and brings it all down,
// and never ends.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { GROUPS } from "../shapes/groups.js";
import { THREADS, SET_THREADS } from "../shapes/threads.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, updateGame, hardDropAndLock, markInput, tryMove, tryRotate, on } from "../src/game.js";
import { zenStart, zenIgnoreInput, zenLockMs, pluralName, planTiles, oopsName, zenKeys, zenCombos, planPile, planSquares, palettePick, reachableTurns, upright } from "../src/zen.js";
import { COMBOS } from "../shapes/combos.js";

const { shapes, powerups } = loadShapes(SHAPES);
const { rows, cols } = CONFIG.board;
const height = (state) => { const y = state.board.findIndex(r => r.some(Boolean)); return y < 0 ? 0 : rows - y; };
const blocksOn = (state) => state.board.reduce((n, r) => n + r.filter(Boolean).length, 0);
// (a piece's outline, whichever way it's turned)
const outline = (s) => s.rotations.slice(0, reachableTurns(s)).map(m => m.map(r => r.map(c => (c ? 1 : 0)).join("")).join("/")).sort()[0];

function zen(seed, mode = "zen") {
  const state = createGameState(shapes, powerups, { rng: makeRng(seed), groups: GROUPS, threads: { threads: THREADS, sets: SET_THREADS } });
  const log = { movements: [], rescues: 0, over: false, maxHeight: 0, clears: [], helped: [], callouts: [], high: 0, frames: 0 };
  let lastLock = null;
  on(state, (t, d) => {
    if (t === "lock") lastLock = d.shape;
    if (t === "zenMovement") log.movements.push({ name: d.name, caption: d.caption, drops: state.drops, lines: state.lines, height: height(state) });
    if (t === "zenRescue") log.rescues++;
    if (t === "gameOver") log.over = true;
    // (the stack: a powerup that vanishes when it fires sits on top only for a moment; a
    // Gravitizerz, which stays, as it is once it has gone off and things have come down)
    if (t === "lock" && !d.shape.powerup?.consume && d.shape.powerup?.type !== "gravity") log.maxHeight = Math.max(log.maxHeight, height(state));
    if (t === "powerupFire" && d.type === "gravity") log.maxHeight = Math.max(log.maxHeight, height(state));
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

test("zen: left to itself it plays on, keeps the board low, and never ends", () => {
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
  assert.ok(["family", "colours", "rain"].filter(k => kinds.has(k)).length >= 2, `${[...kinds]}`);
});

test("zen: left alone, each piece comes in already turned and over its place, as a person would play it (never in under an overhang), now and then leaving a hole", () => {
  const { state } = zen(2);
  let checked = 0, slips = 0, piece = null, want = null;
  const holes = () => { let n = 0; for (let x = 0; x < cols; x++) for (let y = 0, seen = false; y < rows; y++) { if (state.board[y][x]) seen = true; else if (seen) n++; } return n; };
  let before = 0, slipHoles = 0;
  on(state, (t) => {
    if (t === "spawn") {
      const a = state.active;
      piece = a; want = state.zen.target; before = holes();
      if (!want) return;
      assert.equal(a.rotIdx, want.rot, `${a.shape.id} comes in turned`);
      assert.equal(a.x, want.x, `${a.shape.id} comes in over its place`);
      assert.ok(!want.slide, `${a.shape.id}: never slid in under an overhang`);
      checked++;
      if (want.slip) slips++;
    }
    if (t === "lock" && want?.slip && piece.x === want.x && holes() > before) slipHoles++;
  });
  // (a good while: it only slips while the board has few holes, and its own play, not too perfect,
  // leaves a few now and then anyway)
  run(state, null, 15 * 60000, () => {
    // (and it stays where it came in: nothing moves it over on the way down)
    if (piece && state.active === piece && want && !state.zen.userHas) assert.ok(piece.x === want.x && piece.rotIdx === want.rot, piece.shape.id);
  });
  assert.ok(checked > 150, `${checked} pieces`);
  assert.ok(slips >= 2 && slipHoles >= 1, `${slips} slips, ${slipHoles} of them left a hole`);
});

test("zen: it gets back down to a hole by clearing the rows above it", () => {
  const { state } = zen(5);
  run(state, null, 2000);
  // a hole, buried under two rows with a gap in each
  for (const row of state.board) row.fill(null);
  const b = state.board, at = 4;
  for (let y = rows - 3; y < rows; y++) for (let x = 0; x < cols; x++) b[y][x] = { pid: 900 + y };
  b[rows - 1][at] = null;                                   // the hole
  b[rows - 2][cols - 1] = null; b[rows - 3][cols - 2] = null; // (the gaps in the rows over it)
  const buried = () => b[rows - 1][at] === null && [rows - 2, rows - 3].some(y => b[y][at]);
  assert.ok(buried());
  let freed = false;
  for (let t = 0; t < 4 * 60000 && !freed; t += 32) { updateGame(state, 32); freed = !buried(); }
  assert.ok(freed, "the rows over the hole cleared, or the hole filled, within four minutes");
});

test("zen: left alone it dozes off and carries on a little quicker, and a touch wakes it", () => {
  const C = CONFIG.zen.calm;
  const { state } = zen(3);
  // (an easy pace: dropMs, a little quicker with each piece)
  const easy = () => state.dropMs <= C.dropMs && state.dropMs > C.dropMs * 0.97;
  run(state, null, 3000);
  assert.ok(easy(), `an easy pace to start with: ${state.dropMs}`);
  run(state, null, C.idleMs + 8000);
  assert.equal(state.dropMs, C.idleDropMs, "dozing");
  while (!state.active || state.effect || state.active.y < 0) updateGame(state, 16);
  markInput(state, "keyboard");
  tryMove(state, 1, 0);
  updateGame(state, 16);
  assert.equal(state.zen.userHas, true);
  assert.ok(easy(), `awake, and it's the player's: ${state.dropMs}`);
  const piece = state.active;
  while (state.active === piece) updateGame(state, 16);
  while (!state.active) updateGame(state, 16);
  assert.ok(!state.zen.mine && !state.zen.target, "the next piece is theirs, coming in at the top as in Classic");
  assert.ok(easy(), `still awake: ${state.dropMs}`);
});

test("zen: a little quicker with every piece, but never fast", () => {
  const C = CONFIG.zen.calm, S = C.speedUp;
  const { state } = zen(5);
  const paces = [];
  on(state, (t) => { if (t === "spawn") paces.push({ drops: state.drops, ms: state.dropMs }); });
  // the player drops every piece where it comes (so it never dozes off)
  for (let t = 0; t < 60 * 60000 && state.drops <= S.pieces + 40; t += 32) {
    if (state.active && !state.effect) { markInput(state, "keyboard"); hardDropAndLock(state); }
    updateGame(state, 32);
  }
  assert.ok(state.drops > S.pieces + 40, `${state.drops} pieces`);
  assert.ok(paces[0].drops <= 1 && paces[0].ms >= C.dropMs - 1, `the first at dropMs: ${paces[0].ms}`);
  for (let i = 1; i < paces.length; i++) assert.ok(paces[i].ms <= paces[i - 1].ms, `slower again after ${paces[i].drops} pieces`);
  const half = paces.find(p => p.drops >= S.pieces / 2);
  assert.ok(half.ms < C.dropMs - 30 && half.ms > S.toMs + 30, `half way: ${half.ms}`);
  assert.ok(paces.every(p => p.ms >= S.toMs), "never quicker than toMs");
  assert.ok(paces.filter(p => p.drops >= S.pieces).every(p => p.ms === S.toMs), `toMs from ${S.pieces} pieces on`);
});

test("zen: the player plays each piece as in Classic; one they leave alone, the computer takes over a move at a time, and the next ones too, until they touch something", () => {
  const H = CONFIG.zen.calm.hand;
  const { state } = zen(3);
  const next = () => { while (!state.active || state.effect || state.hold) updateGame(state, 16); return state.active; };
  // each piece comes in at the top as in Classic: the way it was drawn, about the middle, theirs
  for (let i = 0; i < 6; i++) {
    const a = next(), w = a.shape.rotations[0][0].length;
    assert.ok(!state.zen.mine && !state.zen.target, `${a.shape.id}: not the computer's`);
    assert.equal(a.rotIdx, 0);
    assert.ok(Math.abs(a.x - (cols - w) / 2) <= 3, `${a.shape.id} at ${a.x}`);
    markInput(state, "keyboard");
    hardDropAndLock(state);
  }
  // then they stop. The piece is left alone, and afterMs (not before) after it first shows on the
  // board, the computer takes it
  const a = next();
  const shows = () => a.shape.rotations[a.rotIdx].some((row, j) => a.y + j >= 0 && row.some(Boolean));
  while (!shows()) updateGame(state, 16);
  let t = 0;
  while (!state.zen.mine && state.active === a) { updateGame(state, 16); t += 16; }
  assert.ok(Math.abs(t - H.afterMs) <= 48, `taken over after ${t}ms`);
  const target = { ...state.zen.target };
  assert.ok(target.x != null, "it knows where it's taking it");
  // a turn or a column at a time, stepMs apart, and then it falls in where it was taking it
  let last = { x: a.x, rot: a.rotIdx, at: -Infinity }, moves = 0;
  for (t = 0; state.active === a; t += 16) {
    updateGame(state, 16);
    if (state.active !== a || (a.x === last.x && a.rotIdx === last.rot)) continue;
    assert.ok(a.rotIdx !== last.rot || Math.abs(a.x - last.x) === 1, `one move at a time: ${last.x}/${last.rot} to ${a.x}/${a.rotIdx}`);
    assert.ok(t - last.at >= H.stepMs - 16, `${t - last.at}ms apart`);
    last = { x: a.x, rot: a.rotIdx, at: t };
    moves++;
  }
  assert.ok(a.x === target.x && a.rotIdx === target.rot, `${a.shape.id} where it was taking it, in ${moves} moves`);
  // the next ones come already in place, until the player touches something
  for (let i = 0; i < 3; i++) {
    const b = next(), z = state.zen;
    assert.ok(z.mine && z.target && b.x === z.target.x && b.rotIdx === z.target.rot, `${b.shape.id} already in place`);
    while (state.active === b) updateGame(state, 16);
  }
  const b = next();
  markInput(state, "keyboard");
  while (tryMove(state, -1, 0)) { /* all the way left */ }
  const x = b.x, rot = b.rotIdx;
  updateGame(state, 16);
  assert.equal(state.zen.userHas, true, "theirs");
  assert.ok(state.dropMs <= CONFIG.zen.calm.dropMs && state.dropMs > CONFIG.zen.calm.dropMs * 0.97, `it falls at the player's pace: ${state.dropMs}`);
  while (state.active === b) {
    updateGame(state, 16);
    if (state.active === b) assert.ok(b.x === x && b.rotIdx === rot, "the game never moves it back");
  }
  const c = next();
  assert.ok(!state.zen.mine && !state.zen.target && c.rotIdx === 0, "and the next is theirs");
  // (and coming back from a pause isn't taking it over, but it's coming back)
  for (let t = 0; t < 20000 && !state.zen.away; t += 16) updateGame(state, 16);
  assert.equal(state.zen.away, true, "stepped back");
  markInput(state, "touch");
  zenIgnoreInput(state);
  updateGame(state, 16);
  assert.ok(!state.zen.away && !state.zen.userHas);
});

test("zen: each piece is a new shape, and comes in somewhere other than the last few", () => {
  const N = CONFIG.zen.calm.newShapes;
  const { state, log } = zen(2);
  const shapes = [], pieces = [];
  let repeats = 0, checked = 0;
  on(state, (t, d) => {
    if (t === "rowsDestroyed" && d.source === "clear" && pieces.length) pieces[pieces.length - 1].cleared = true;
    if (t !== "spawn") return;
    const a = state.active, s = a.shape;
    pieces.push({ from: a.x, to: a.x + s.rotations[a.rotIdx][0].length, cleared: false, powerup: !!s.powerup });
    if (s.powerup) return;
    // (a level 6 set is a set: its pieces can all be of a kind; and a giant is never swapped for
    // another, calmPiece: the one-block "nothing", say, that brings "everything" after it)
    if ((s.difficulty ?? 1) < 4) { checked++; if (shapes.slice(-N).includes(outline(s))) repeats++; }
    shapes.push(outline(s));
  });
  run(state, log, 15 * 60000);
  assert.ok(checked > 150, `${checked} pieces`);
  assert.equal(repeats, 0, `${repeats} of ${checked} the shape of one of the last ${N}`);
  // (of the ones that clear nothing, only a few come in over the columns of any of the last three:
  // a row it can clear, it clears wherever it is)
  let near = 0, n = 0;
  for (let i = 3; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.cleared || p.powerup) continue;
    n++;
    if (pieces.slice(i - 3, i).some(q => q.from < p.to && p.from < q.to)) near++;
  }
  assert.ok(n > 100 && near / n < 0.35, `${near} of ${n} over the columns of one of the last three`);
});

test("zen: it doesn't push: where the player has just moved one of its pieces away from, it aims somewhere else for the next two, and comes back to it with another shape", () => {
  const P = CONFIG.zen.calm.pushed;
  let pushes = 0;
  for (const seed of [3, 4]) {
    const { state } = zen(seed);
    run(state, null, 3000);
    // a row it would love to finish: the bottom two full but for one column, open all the way up
    const gap = 9;
    for (const row of state.board) row.fill(null);
    for (let y = rows - 2; y < rows; y++) for (let x = 0; x < cols; x++) if (x !== gap) state.board[y][x] = { pid: 900 + y };
    // (where the computer takes each piece: as it comes in, or once it has been left alone)
    const came = [];
    on(state, (t) => {
      if (t === "spawn") came.push({ piece: state.active, shape: outline(state.active.shape), aimed: false, steady: !!state.zen.current?.emergency, pushed: false });
    });
    const aim = () => {
      const c = came.at(-1), t = state.zen.target;
      if (!c || c.target || c.piece !== state.active || !t || !state.zen.mine) return;
      c.target = t;
      c.aimed = t.x <= gap && gap < t.x + c.piece.shape.rotations[t.rot][0].length;
    };
    // the player's left it to the computer, but doesn't want anything there: each piece it takes
    // over there, they move over to the left wall and drop (and then leave it again)
    const done = new Set();
    run(state, null, 8 * 60000, () => {
      aim();
      const a = state.active;
      if (!a || done.has(a) || state.effect || state.hold || came.length > 40 || came.at(-1)?.piece !== a || !came.at(-1).target) return;
      done.add(a);
      if (!came.at(-1).aimed || a.shape.powerup || state.board[rows - 1][gap]) return;
      came.at(-1).pushed = true;
      markInput(state, "keyboard");
      while (tryMove(state, -1, 0)) { /* to the wall */ }
      hardDropAndLock(state);
    });
    came.forEach((c, i) => {
      if (!c.pushed) return;
      pushes++;
      // the next two go somewhere else (unless it's a big powerup to steady it)...
      for (const d of came.slice(i + 1, i + 1 + P.pieces)) assert.ok(!d.aimed || d.steady, `seed ${seed}: aimed there again straight after: ${came.map(e => (e.aimed ? "A" : ".") + (e.pushed ? "!" : "")).join("")}`);
      // ...and when it comes back to it, it's with another shape
      for (const d of came.slice(i + 1, i + P.shape)) assert.ok(!d.aimed || d.steady || d.shape !== c.shape, `seed ${seed}: the same shape again`);
    });
  }
  assert.ok(pushes >= 6, `it kept coming back to it, with something else: ${pushes} times moved away`);
});

test("zen: Shiny Pieces of its own about as often as at the start of a game of Classic, in its little runs too", () => {
  const { state, log } = zen(6);
  let pieces = 0, own = 0, inRuns = 0;
  on(state, (t) => {
    if (t !== "spawn") return;
    pieces++;
    const z = state.zen;
    if (!state.active.shape.powerup || z.current?.help || z.current?.emergency) return;
    own++;
    if (["rain", "family", "colours"].includes(z.movement?.name)) inRuns++;
  });
  run(state, log, 20 * 60000);
  assert.ok(pieces > 200, `${pieces} pieces`);
  assert.ok(own / pieces > 0.12 && own / pieces < 0.3, `${own} of ${pieces}`);
  assert.ok(inRuns >= 5, `${inRuns} of them in a run`);
});

test("zen: the player can build it right up and fill most of the board: a little help only near the top, and never a powerup of its own that takes much of it", () => {
  const H = CONFIG.zen.calm.help, B = CONFIG.zen.calm.bite;
  const { state, log } = zen(1);
  // (what each of the game's own powerups took, not the help or the steadying ones)
  const bites = [];
  let pu = null, said = null;
  on(state, (t, d) => {
    if (t === "zenMovement") said = d.name;
    if (t !== "spawn") return;
    if (pu) bites.push(pu.before - blocksOn(state));
    pu = state.active.shape.powerup && said !== "help" && said !== "steady" ? { before: blocksOn(state) } : null;
    said = null;
  });
  // the builder: every piece stacked on the left, as low as it will go, never in the three
  // columns on the right, so nothing ever clears (the Shiny Pieces they leave to the computer)
  let above = 0, frames = 0;
  run(state, log, 15 * 60000, () => {
    const a = state.active;
    frames++;
    if (height(state) > rows / 2) above++;
    if (!a || state.effect || state.hold || a.shape.powerup || a.y < 0 || a.built) return;
    a.built = true;
    markInput(state, "keyboard");
    const w = a.shape.rotations[a.rotIdx][0].length;
    let best = null;
    for (let x = 0; x + w <= cols - 3; x++) {
      let top = rows;
      for (let i = 0; i < w; i++) for (let y = 0; y < rows; y++) if (state.board[y][x + i]) { top = Math.min(top, y); break; }
      if (!best || top > best.top) best = { x, top };
    }
    while (best && a.x > best.x && tryMove(state, -1, 0)) { /* left */ }
    while (best && a.x < best.x && tryMove(state, 1, 0)) { /* right */ }
    hardDropAndLock(state);
  });
  assert.equal(log.over, false);
  assert.ok(log.maxHeight >= rows * 0.8, `built up to ${log.maxHeight} rows`);
  assert.ok(above / frames > 0.5, `more than half way up ${(above / frames * 100).toFixed(0)}% of the time`);
  const helps = log.movements.filter(m => m.name === "help"), steadies = log.movements.filter(m => m.name === "steady");
  assert.ok(helps.length > 0 && helps.every(m => m.height > rows * H.height), `help only near the top: ${helps.map(m => m.height)}`);
  assert.ok(steadies.every(m => m.height >= rows - CONFIG.zen.calm.dangerRows), `steadied only at the top: ${steadies.map(m => m.height)}`);
  assert.ok(bites.length >= 5, `${bites.length} powerups of its own`);
  assert.ok(bites.every(n => n <= B.most), `its own powerups took ${bites.filter(n => n > B.most).join(", ")} blocks`);
});

test("zen: piled up near the top, each piece comes in already turned and over a good place, for the player to drop there or take elsewhere, until it's back down", () => {
  const H = CONFIG.zen.calm.hand;
  let ups = 0;
  for (const seed of [4, 7]) {
    const { state } = zen(seed);
    const next = () => { while (!state.active || state.effect || state.hold) updateGame(state, 16); return state.active; };
    next();
    // a stack well past `high`, a gap in each row, all in one column but for a few
    for (const row of state.board) row.fill(null);
    const top = rows - Math.ceil(rows * H.high) - 1;
    for (let y = top; y < rows; y++) for (let x = 0; x < cols; x++) if (x !== (y % 5 ? 6 : 2)) state.board[y][x] = { pid: 900 + y };
    markInput(state, "keyboard");
    hardDropAndLock(state); // (the one that came in before)
    // the player drops each piece where it comes in (and moves it over now and then)
    const seen = [];
    let piled = true;
    for (let i = 0; i < 80; i++) {
      const a = next(), z = state.zen, h = height(state);
      const aimed = !!z.target && a.x === z.target.x && a.rotIdx === z.target.rot;
      seen.push({ h, aimed });
      if (h > rows * H.high) piled = true;
      else if (h <= rows * H.low) piled = false;
      if (piled) assert.ok(aimed, `seed ${seed}: ${a.shape.id} at ${h} rows high comes already in place`);
      else if (!z.current?.help && !z.current?.emergency) assert.ok(!aimed && !z.mine, `seed ${seed}: back down to ${h} rows, ${a.shape.id} is theirs`);
      markInput(state, "keyboard");
      if (i % 4 === 3) tryMove(state, 1, 0);
      hardDropAndLock(state);
    }
    assert.ok(seen.some(s => s.h <= rows * H.low), `seed ${seed}: it came back down: ${seen.map(s => s.h)}`);
    ups += seen.filter(s => s.h > rows * H.high).length;
  }
  assert.ok(ups >= 2, `${ups} pieces piled up`);
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
  // (all sorts go by, these among them: some come round only a few times an hour, and a game can
  // go half an hour without one, so it plays on a while longer for the last of them)
  const want = ["demolition", "column", "crack", "mono"];
  let kinds = new Set(log.movements.map(m => m.name));
  for (let k = 0; k < 4 && want.some(w => !kinds.has(w)); k++) {
    run(state, log, 5 * 60000);
    kinds = new Set(log.movements.map(m => m.name));
  }
  for (const k of want) assert.ok(kinds.has(k), `no ${k} in ${[...kinds]}`);
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

test("turbo zen: the computer never moves or turns a piece on the board, nor slides one in under an overhang, whoever's playing", () => {
  for (const [mode, seed, mins] of [["turbo", 2, 8], ["turbo", 5, 8], ["home", 3, 4]]) {
    const { state, log } = zen(seed, mode);
    // (every so often the player steps in for a few seconds, turning the piece and pressing this way and that)
    let pieces = 0, burst = 0, last = null;
    run(state, log, mins * 60000, () => {
      const a = state.active;
      // (from the player's last press to now, the piece has only fallen)
      if (a && last?.a === a) {
        assert.equal(a.x, last.x, `${mode}: ${a.shape.id} moved by the computer`);
        assert.equal(a.rotIdx, last.rot, `${mode}: ${a.shape.id} turned by the computer`);
      } else if (a) pieces++;
      assert.ok(!state.zen.target?.slide, `${mode}: no slides`);
      if (mode === "turbo" && state.zen.clock % 40000 < 32) burst = 5000;
      if (a && !state.effect && !state.hold && (burst -= 32) > 0 && burst % 320 < 32 && a.y >= 0) {
        markInput(state, "keyboard");
        if (burst % 960 < 320) tryRotate(state); else tryMove(state, burst % 1920 < 960 ? 1 : -1, 0);
      }
      last = a && { a, x: a.x, rot: a.rotIdx };
    });
    assert.ok(pieces > 300, `${mode}: ${pieces} pieces`);
    assert.equal(log.over, false, mode);
  }
});

test("turbo zen: the player plays a few pieces, and the computer keeps its hands off the next ones: already in place, but one at a time, in at the top and at their pace; left alone, it takes back over gently, and then a few at once", () => {
  const Z = CONFIG.zen, ts = CONFIG.modes.turbo.timeScale;
  const usual = { cols: CONFIG.board.cols, rows: CONFIG.board.rows };
  CONFIG.board.cols = 44; CONFIG.board.rows = 30; // (a big board, where it often drops a few at once)
  try {
    const { state } = zen(3, "turbo");
    run(state, null, 4000);
    const ready = () => state.active && !state.effect && !state.hold && state.active.y >= 0 && !state.active.shape.powerup && !state.flock.length;
    while (!ready()) updateGame(state, 16);
    // the player takes one over: it's theirs, falling at their pace, and nothing moves it but them
    const piece = state.active;
    markInput(state, "keyboard");
    while (tryMove(state, -1, 0)) { /* to the wall */ }
    updateGame(state, 16);
    assert.equal(state.zen.userHas, true);
    assert.equal(state.dropMs, Z.dropMs, "the player's own piece falls at their pace");
    const x = piece.x, rot = piece.rotIdx;
    let landed = null, gap = null;
    on(state, (t) => { if (t === "spawn" && landed != null && gap == null) gap = state.zen.clock - landed; });
    // (every piece from here on, as it comes)
    const seen = [];
    let lockedAt = null, busy = false;
    on(state, (t, d) => {
      if (t === "lock" && !d.flock) { lockedAt = state.zen.clock; busy = false; }
      if (t === "rowsDestroyed" || t === "powerupFire") busy = true;
      if (t !== "spawn") return;
      const a = state.active, want = state.zen.target, z = state.zen;
      seen.push({ hand: z.hand, inPlace: !!want && a.x === want.x && a.rotIdx === want.rot,
        flock: state.flock.length, dropMs: state.dropMs, quick: Math.max(8, Z.fallMs * z.pace), top: a.y >= -a.shape.rotations[a.rotIdx].length,
        lock: zenLockMs(state), ownLock: Z.lockMs * z.pace, gap: lockedAt == null || busy ? null : z.clock - lockedAt, played: false });
    });
    while (state.active === piece) {
      if (state.locking && landed == null) landed = state.zen.clock;
      updateGame(state, 16);
      if (state.active === piece) assert.ok(piece.x === x && piece.rotIdx === rot, "nothing moves it but the player");
    }
    // ...and once it has landed, it waits a moment, as in the other modes (in real time), and
    // then the next comes promptly
    const grace = CONFIG.timing.lockDelayMsKeyboard * ts;
    assert.ok(gap != null && gap >= grace - 32 && gap <= grace + 32, `the next came ${gap}ms after it landed`);
    // (and they play on, a few more, each moved over a column as it comes and dropped)
    for (let n = 0; n < 3; n++) {
      while (!ready()) updateGame(state, 16);
      seen[seen.length - 1].played = true;
      markInput(state, "keyboard");
      tryMove(state, 1, 0);
      hardDropAndLock(state);
    }
    // the ones that came while they played, and the next ones, with nobody touching anything:
    // already in place as they come; while the player's still about (they had the last one, or
    // touched it in the last playMs), one at a time, in at the top, at their pace, each as soon as
    // the last has locked (unless rows were clearing, or a powerup going off), and waiting a
    // moment on the ground; then the computer takes back over gently, over takeBack pieces, still
    // one at a time, each falling a little quicker than the last and locking a little sooner; and
    // after that, quicker again, and often a few at once
    // (60 of them once it's all the computer's again: a plan can go a while without a few at once)
    for (let t = 0; t < 60000 && seen.filter(p => p.hand >= 1).length < 60; t += 16) updateGame(state, 16);
    const last = seen.findLastIndex(p => p.played);
    const playing = seen.filter(p => p.hand === 0), taking = seen.filter(p => p.hand > 0 && p.hand < 1), back = seen.filter(p => p.hand >= 1);
    assert.ok(last >= 2 && back.length >= 30, `${last + 1} pieces played, ${back.length} after`);
    assert.ok(seen.slice(0, last + 2).every(p => p.hand === 0), "hands off all the while they played, and the one after their last");
    assert.ok(seen.every(p => p.inPlace), "every one already in place");
    assert.ok(playing.every(p => p.flock === 0 && p.dropMs === Z.dropMs && p.top), "one at a time, at the top, at their pace");
    assert.ok(playing.every(p => p.gap === 0 || p.gap == null), "each straight after the last one locked");
    assert.ok(playing.every(p => p.lock === grace), "each waiting a moment on the ground");
    // (taking back over, in order: how far each has come, from the player's pace to the computer's
    // own, and from the moment on the ground to its own quick lock)
    const way = (p, from, to) => Math.log(from / p) / Math.log(from / to);
    assert.equal(taking.length, Z.takeBack - 1, `back over ${Z.takeBack} pieces`);
    assert.ok(seen.slice(last + 1).every((p, i, rest) => i === 0 || p.hand >= rest[i - 1].hand), "a little more each piece");
    assert.ok(taking.every((p, i) => p.flock === 0 && p.dropMs < Z.dropMs && p.dropMs > p.quick && p.lock < grace && p.lock > p.ownLock
      && (i === 0 || (way(p.dropMs, Z.dropMs, p.quick) > way(taking[i - 1].dropMs, Z.dropMs, taking[i - 1].quick)
        && way(p.lock, grace, p.ownLock) > way(taking[i - 1].lock, grace, taking[i - 1].ownLock)))),
      `one at a time, a little quicker each piece: ${taking.map(p => way(p.dropMs, Z.dropMs, p.quick).toFixed(2))}`);
    assert.ok(back.every(p => p.dropMs === p.quick && (p.flock > 0 || p.lock === p.ownLock)), "quicker again");
    assert.ok(back.filter(p => p.flock > 0).length >= back.length * 0.25, `${back.filter(p => p.flock > 0).length} of ${back.length} a few at once`);
  } finally {
    CONFIG.board.cols = usual.cols; CONFIG.board.rows = usual.rows;
  }
});

test("turbo zen: the piece after the player's is left to them too, however long ago they last touched anything", () => {
  const Z = CONFIG.zen, was = Z.playMs;
  Z.playMs = 1; // (so it's only that they had the last one)
  try {
    const { state } = zen(4, "turbo");
    run(state, null, 4000);
    while (!(state.active && !state.effect && !state.hold && state.active.y >= 0 && !state.active.shape.powerup && !state.flock.length)) updateGame(state, 16);
    // (they take one and let it fall where it was going: by the time it lands, they're long gone)
    markInput(state, "keyboard");
    const seen = [];
    on(state, (t) => {
      if (t !== "spawn") return;
      const a = state.active;
      seen.push({ dropMs: state.dropMs, quick: Math.max(8, Z.fallMs * state.zen.pace), top: a.y >= -a.shape.rotations[a.rotIdx].length, flock: state.flock.length });
    });
    while (seen.length < 3) updateGame(state, 16);
    assert.ok(seen[0].dropMs === Z.dropMs && seen[0].top && seen[0].flock === 0, "the one after theirs: in at the top, at their pace");
    assert.ok(seen[1].dropMs < Z.dropMs && seen[1].dropMs > seen[1].quick, "and then the computer starts taking back over");
  } finally {
    Z.playMs = was;
  }
});

test("turbo zen: with the player playing, a piece that lands waits a moment before it locks, as in the other modes, and longer once slid or turned along the ground", () => {
  const T = CONFIG.timing, ts = CONFIG.modes.turbo.timeScale;
  const { state } = zen(5, "turbo");
  run(state, null, 4000);
  const ready = () => { while (!(state.active && !state.effect && !state.hold && state.active.y >= 0 && !state.active.shape.powerup)) updateGame(state, 4); };
  // (how long the falling piece waits on the ground before it locks, game time, from the moment
  // it lands; `then`: what the player does to it as it lands)
  const wait = (then = null) => {
    const piece = state.active;
    while (state.active === piece && !state.locking) updateGame(state, 4);
    assert.equal(state.active, piece, `${piece.shape.id} locked as it landed`);
    let t = 4;
    then?.(piece);
    while (state.active === piece) { updateGame(state, 4); t += 4; }
    return t;
  };
  const near = (t, ms, what) => assert.ok(t >= ms && t < ms + 8, `${what}: waited ${t}ms, not ${ms.toFixed(0)}`);
  // the player takes one and lets it land: it waits as long as a piece would in the other modes,
  // in real time
  ready();
  markInput(state, "keyboard");
  near(wait(), T.lockDelayMsKeyboard * ts, "theirs");
  // ...and so does the next, the computer's, while they're playing
  assert.equal(state.zen.userHas, false);
  near(wait(), T.lockDelayMsKeyboard * ts, "the next");
  // (by touch, a little longer)
  ready();
  markInput(state, "touch");
  near(wait(), T.lockDelayMsTouch * ts, "by touch");
  // slid or turned along the ground as it lands, it waits longer again, to be slid again (the
  // first piece that has room to be)
  let moved = false, t = 0;
  for (let k = 0; k < 6 && !moved; k++) {
    ready();
    markInput(state, "keyboard");
    t = wait(() => { markInput(state, "keyboard"); moved = tryMove(state, 1, 0) || tryMove(state, -1, 0) || tryRotate(state); });
  }
  assert.ok(moved, "it could be slid or turned");
  assert.ok(t >= T.slideLockMs * ts, `slid, it waited ${t}ms`);
  // left alone until it has taken all the way back over, the computer's own lock almost as soon as
  // they land again
  run(state, null, 30000);
  ready();
  assert.equal(state.zen.hand, 1);
  assert.ok(wait() < T.lockDelayMsKeyboard * ts / 2, "its own lock almost at once");
});

test("turbo zen: a plan the player steps into carries on while its pieces still land where it put them, then gives way to something new", () => {
  let gaveWay = 0, carried = 0;
  for (const seed of [2, 5, 7]) {
    const { state, log } = zen(seed, "turbo");
    zenStart(state, "crack");
    log.movements.length = 0;
    // (once it has got going, the player drops one of its pieces against a wall)
    let stepped = false, after = 0, wrong = 0;
    on(state, (t) => {
      if (t !== "spawn" || !stepped) return;
      const z = state.zen, want = z.current?.target;
      // (each of the plan's that comes: just where the plan put it, on the board as it is)
      if (z.current?.adrift) { after++; if (!want || state.active.x !== want.x || state.active.rotIdx !== want.rot) wrong++; }
    });
    run(state, log, 3 * 60000, () => {
      const z = state.zen, a = state.active;
      if (stepped || !a || state.effect || state.hold || !z.expect || state.drops < 12 || a !== z.piece || a.y < 0) return;
      stepped = true;
      markInput(state, "keyboard");
      const dir = a.x < cols / 2 ? 1 : -1;
      while (tryMove(state, dir, 0)) { /* to the far wall */ }
      hardDropAndLock(state);
    });
    assert.ok(stepped, `seed ${seed}: the player stepped in`);
    const names = log.movements.map(m => m.name);
    const i = names.indexOf("adrift");
    assert.ok(i >= 0, `seed ${seed}: the board no longer matched the plan: ${names}`);
    assert.ok(names.slice(0, i).includes("crack") || i === 0, `seed ${seed}: ${names}`);
    assert.equal(wrong, 0, `seed ${seed}: ${wrong} of the plan's ${after} pieces somewhere else`);
    if (after) carried++;
    const j = names.indexOf("abandoned");
    if (j >= 0) {
      gaveWay++;
      assert.ok(j > i && names.slice(j + 1).some(n => !["adrift", "abandoned"].includes(n)), `seed ${seed}: something new after it: ${names}`);
    }
    assert.equal(log.over, false);
  }
  assert.ok(carried >= 1 && gaveWay >= 1, `${carried} carried on, ${gaveWay} gave way`);
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

test("zen: a piece that fits just the same upside down comes the way it was drawn; in turbo zen only now and then, and the ESTRIX piece mostly", () => {
  const key = (m) => m.map(r => r.map(c => (c ? 1 : 0)).join("")).join("/");
  // (the turns of a piece with the same outline as the way it was drawn: two, or four for a square)
  const asDrawn = (s) => s.rotations.map((m, r) => r).filter(r => key(s.rotations[r]) === key(s.rotations[0]));
  const count = (mode, seed, minutes) => {
    const { state } = zen(seed, mode);
    const n = { 2: 0, 4: 0, planned: 0 }, turned = { 2: 0, 4: 0, planned: 0 };
    on(state, (t) => {
      if (t !== "spawn") return;
      const a = state.active, same = asDrawn(a.shape);
      if (same.length < 2 || !same.includes(a.rotIdx) || a.shape.id === "estrix") return;
      const k = state.zen.current?.target ? "planned" : same.length;
      n[k]++;
      if (a.rotIdx !== 0) turned[k]++;
    });
    run(state, null, minutes * 60000);
    return { n, turned };
  };
  const calm = count("zen", 2, 12);
  const all = (o) => o[2] + o[4] + o.planned;
  assert.ok(all(calm.n) > 50, `${all(calm.n)} pieces`);
  assert.equal(all(calm.turned), 0, "zen: none upside down (or a square on its side)");
  // (by chance, half of them would come upside down, and three in four squares turned)
  const turbo = count("turbo", 1, 12);
  const two = turbo.turned[2] / turbo.n[2], four = turbo.turned[4] / turbo.n[4];
  assert.ok(turbo.n[2] > 60 && two > 0.15 && two < 0.42, `turbo zen: ${turbo.turned[2]} of ${turbo.n[2]} upside down`);
  assert.ok(turbo.n[4] > 60 && four > 0.3 && four < 0.62, `turbo zen: ${turbo.turned[4]} of ${turbo.n[4]} squares turned`);
  assert.equal(turbo.turned.planned, 0, `turbo zen: a planned piece is never turned for nothing (${turbo.n.planned} of them)`);
  // (and one at a time: in zen always the way it was drawn, in turbo zen `share` of the time, ESTRIX more)
  const U = CONFIG.zen.upright;
  const estrix = shapes.find(s => s.id === "estrix");
  const plain = shapes.find(s => !s.powerup && s !== estrix && asDrawn(s).length === 2);
  const square = shapes.find(s => !s.powerup && asDrawn(s).length === 4);
  const odd = shapes.find(s => !s.powerup && asDrawn(s).length === 1);
  const zenState = zen(9).state, turboState = zen(9, "turbo").state;
  for (const s of [estrix, plain, square]) assert.equal(upright(zenState, s, { rot: 2, x: 3 }).rot, 0, s.id);
  for (const rot of [1, 3]) assert.equal(upright(zenState, square, { rot, x: 3 }).rot, 0, `${square.id} on its side`);
  assert.equal(upright(zenState, estrix, { rot: 1, x: 3 }).rot, 1, "standing on end is another outline");
  assert.equal(upright(zenState, odd, { rot: 2, x: 3 }).rot, 2, `${odd.id} upside down is another outline`);
  assert.equal(upright(zenState, plain, null), null);
  const share = (s) => { let k = 0; for (let i = 0; i < 2000; i++) if (upright(turboState, s, { rot: 2, x: 3 }).rot === 0) k++; return k / 2000; };
  assert.ok(Math.abs(share(plain) - U.share) < 0.05, `${plain.id}: ${share(plain)}`);
  assert.ok(Math.abs(share(estrix) - U.pieces.estrix) < 0.04, `estrix: ${share(estrix)}`);
  assert.equal(share(odd), 0);
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
      assert.ok(!log.movements.some(m => m.name === "adrift"), "nobody stepped in");
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
    // worth it; unless they ate it all)
    if (end === "powered") assert.ok((log.movements.slice(i + 1, j + 1).some(m => m.name === "demolition") || b.height <= 3) && b.height <= peak - 10, `${end}: left ${b.height} rows of ${peak}: ${log.movements.map(m => m.name)}`);
    else assert.ok(b.height <= 3, `${end}: left ${b.height} rows`);
    // (the rows go as rows, but for the columns, eaten away, and the pacmen, which eat them)
    if (end !== "columns" && end !== "powered") assert.ok(b.lines - a.lines >= 18, `${end}: cleared ${b.lines - a.lines} rows`);
    assert.ok(!log.movements.some(m => m.name === "adrift"), `${end}: nobody stepped in`);
  }
});

test("turbo zen: oops, all one awkward thing, said all the way up, and then down it comes", () => {
  // (down it comes most times: turbo zen leaves a board standing now and then rather than clear it
  // up tediously, so a few games, most of them coming down)
  let down = 0;
  for (const seed of [6, 8, 9]) down += oopsGame(seed) ? 1 : 0;
  assert.ok(down >= 2, `down it came in ${down} of 3`);
});
function oopsGame(seed) {
  const { state, log } = zen(seed, "turbo");
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
  // (one of the names for lots of one thing, or one of the piece's own lines)
  const own = SHAPES.find(x => x.id === [...shapes][0])?.oops?.lines ?? [];
  assert.ok(labels[0] === null || own.includes(labels[0]) || /^(Oops, all .+!|(.+) \2 \2!!|(.+) \3 and more \3|the strategic reserve of .+)$/.test(labels[0]), labels[0]);
  assert.ok(peak >= 14, `up to ${peak} rows`);
  const i = log.movements.findIndex(m => m.name === "oops");
  // (by the demolition, or the tidying up after it; or, if that left some of it to build on, the
  // next one after that)
  const after = log.movements.slice(i + 1).filter(m => !["demolition", "tidy", "settle", "sweep"].includes(m.name)).slice(0, 2);
  return after.some(m => m.height <= 8);
}

test("turbo zen: the combinations in shapes/combos.js are all there, and each fills the board with its own pieces", () => {
  const combos = zenCombos(zen(1, "turbo").state);
  const ids = new Set(SHAPES.map(s => s.id));
  for (const c of COMBOS) {
    const listed = (c.stages ? [...c.stages.flat(), ...[].concat(c.top ?? [])] : [].concat(c.pieces ?? [])).flatMap(it => (typeof it === "string" ? [it] : Object.keys(it)));
    for (const id of listed) assert.ok(ids.has(id), `${c.id}: there's no piece ${id}`);
    assert.ok(combos.some(g => g.id === c.id), `${c.id}: at least two of its pieces can turn up`);
  }
  for (const id of ["portraits", "flowers", "tins", "fish", "feelings_strange"]) {
    const { state, log } = zen(8, "turbo");
    const c = combos.find(g => g.id === id);
    const seen = [];
    let phase = "before", peak = 0;
    on(state, (t, d) => {
      if (t === "zenMovement") phase = phase === "before" && d.name === "combo" ? "fill" : phase === "fill" ? "after" : phase; // (the first one)
      if (t === "spawn" && phase === "fill" && !d.shape.powerup && !d.shape.tags?.includes("zen")) seen.push(d.shape);
      if (t === "lock" && phase === "fill") peak = Math.max(peak, height(state));
    });
    zenStart(state, "combo", { id });
    run(state, log, 3 * 60000);
    const own = seen.filter(s => c.pieces.some(it => it.s.id === s.id));
    assert.ok(seen.length >= 3 && own.length >= 0.85 * seen.length, `${id}: ${own.length} of ${seen.length} its own (${seen.filter(s => !own.includes(s)).map(s => s.id)})`);
    assert.ok(new Set(own.map(s => s.id)).size >= Math.min(3, c.pieces.length), `${id}: a mix of them`);
    assert.ok(peak >= 14, `${id}: up to ${peak} rows`);
  }
});

test("turbo zen: an emotions chart that gets stranger on the way up, with the one at the very top last", () => {
  const { state, log } = zen(9, "turbo");
  const c = zenCombos(state).find(g => g.id === "feelings_ascending");
  const stageOf = (s) => c.stages.findIndex(l => l.some(it => it.s.id === s.id));
  const seen = [];
  let phase = "before";
  on(state, (t, d) => {
    if (t === "zenMovement" && phase === "before" && d.name === "combo") phase = "fill";
    // (until the first of the blasts that bring it down: the last of the fill comes just after
    // the demolition begins)
    if (t === "spawn" && phase === "fill" && (d.shape.powerup || d.shape.tags?.includes("zen"))) phase = "after";
    if (t === "spawn" && phase === "fill" && c.pieces.some(it => it.s.id === d.shape.id)) seen.push(d.shape);
  });
  zenStart(state, "combo", { id: "feelings_ascending" });
  run(state, log, 3 * 60000);
  assert.ok(seen.length >= 10, `${seen.length} cards`);
  assert.equal(seen.at(-1).id, "emotion_heat_death", "the heat death of the universe on top");
  assert.equal(seen.filter(s => s.id === "emotion_heat_death").length, 1, "only the once");
  const stages = seen.slice(0, -1).map(stageOf);
  // (never back down, but for one from the stage before now and then)
  stages.forEach((k, i) => assert.ok(k >= Math.max(0, ...stages.slice(0, i)) - 1, `in order: ${stages.join(" ")}`));
  assert.equal(stages[0], 0, "plain feelings first");
  assert.ok(Math.max(...stages) === c.stages.length - 1, `all the way up: ${stages.join(" ")}`);
});

test("turbo zen: a pile, poured in the middle or against a wall, grows up towards the top of the screen, then all of it goes", () => {
  for (const from of ["middle", "left", "right"]) {
    for (const seed of [2, 3]) {
      const state = createGameState(shapes, powerups, { rng: makeRng(seed), groups: GROUPS, threads: { threads: THREADS, sets: SET_THREADS } });
      startRun(state, "turbo");
      for (const row of state.board) row.fill(null);
      const res = planPile(state, from);
      assert.ok(res, `${from}: a pile`);
      assert.ok(res.items.cleared >= rows - 6, `${from}: ${res.items.cleared} rows went`);
      // (part way up, it's a pile: higher where it was poured than at the far wall)
      const mid = res.items[Math.floor(res.items.length / 4)].expect;
      const h = (x) => { for (let y = 0; y < rows; y++) if (mid[y * cols + x]) return rows - y; return 0; };
      const at = from === "middle" ? cols >> 1 : from === "left" ? 0 : cols - 1, far = from === "right" ? 0 : cols - 1;
      assert.ok(h(at) > h(far), `${from}: ${h(at)} where it's poured, ${h(far)} at the far wall`);
      // (and at the end, hardly anything left)
      const end = res.items[res.items.length - 1].expect;
      assert.ok(end.reduce((a, b) => a + b, 0) <= cols * 3, `${from}: ${end.reduce((a, b) => a + b, 0)} blocks left`);
    }
  }
});

test("turbo zen: now and then a fill hands over part way up to another, which carries on on top of it", () => {
  // (now and then: a dozen in twenty minutes of one game, none in another, so it plays game after
  // game until it has seen a few)
  let relays = 0, built = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    if (relays >= 3 && built >= 2) break;
    const { state, log } = zen(seed, "turbo");
    let prev = null, at = 0;
    run(state, log, 20 * 60000, () => {
      const m = state.zen.movement;
      if (m !== prev) {
        if (prev?.phase === "relayed") {
          relays++;
          at = height(state);
          // (the next one builds on it: nothing cleared away in between but what a powerup or two took)
          assert.ok(at >= prev.relay.at - 6, `${prev.name} handed over at ${prev.relay.at}, ${at} left for ${m?.name}`);
          if (m && m.phase === "fill") built++;
        }
        prev = m;
      }
    });
  }
  assert.ok(relays >= 3, `${relays} hand-overs`);
  assert.ok(built >= 2, `${built} of them built on`);
});

test("turbo zen: comings and goings, higher each time, the last right up towards the top, then the gravitizers bring it down", () => {
  // (the big Gravitizer goes first, unless from where it can go it wouldn't bring anything down,
  // and then something else does: so in most games, not every one)
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8], firsts = [];
  for (const seed of seeds) {
    const { state, log } = zen(seed, "turbo");
    run(state, log, 3000);
    zenStart(state, "waves");
    let started = false, peak = 0, firstBlast = null;
    on(state, (t, d) => { if (t === "spawn" && state.zen.movement?.name === "waves" && state.zen.movement.phase === "blast" && d.shape.powerup && !firstBlast) firstBlast = d.shape; });
    for (let t = 0; t < 10 * 60000; t += 32) {
      updateGame(state, 32);
      const m = state.zen.movement;
      if (m?.name === "waves") { started = true; peak = Math.max(peak, height(state)); }
      else if (started) break;
    }
    assert.ok(started, `seed ${seed}: it came`);
    assert.ok(peak >= rows - 7, `seed ${seed}: up to ${peak} of ${rows} rows`);
    firsts.push(firstBlast);
  }
  const gravity = firsts.filter(p => p?.powerup.type === "gravity").length;
  assert.ok(gravity > seeds.length / 2, `the first to bring it down: ${firsts.map(p => p?.id).join(", ")}`);
});

test("a board full of one thing has a name for it, now and then just its own", () => {
  const state = { rng: makeRng(3) };
  const said = (kind) => oopsName(state, "a bagpipe", kind);
  assert.equal(said("plain"), null);
  assert.equal(said("oops"), "Oops, all bagpipes!");
  assert.equal(said("thrice"), "bagpipes bagpipes bagpipes!!"); // (as "gnomes gnomes gnomes!")
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

test("turbo zen: never a pattern of tiles and nothing else (nor squares, nor a palette), and no grout", () => {
  const isTile = (s) => !!s.tags?.some(t => t === "tiles" || t === "lego_tiles");
  let plans = 0, squares = 0, palettes = 0;
  for (const kind of ["floor", "bricks", "pinwheels", "waves", "lizards", "lego", "freeform"]) for (const seed of [3, 4, 5]) {
    const { state } = zen(seed, "turbo");
    state.active = null;
    const res = planTiles(state, kind);
    if (!res) continue;
    plans++;
    assert.ok(res.items.some(it => !it.key && !isTile(it.shape)), `${kind}: only tiles`);
    assert.ok(!res.items.some(it => /^tile_(half|strip)$/.test(it.shape.id)), `${kind}: grout`);
  }
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const { state } = zen(seed, "turbo");
    state.active = null;
    const res = planSquares(state);
    if (res) { squares++; assert.ok(res.items.some(it => !it.key && !isTile(it.shape)), `squares of only tiles: ${res.caption}`); }
    for (let i = 0; i < 40; i++) {
      const pal = palettePick(state, state.shapes.filter(s => !s.powerup && (s.difficulty ?? 1) <= 3 && (s.frequency ?? 1) > 0));
      if (!pal) continue;
      palettes++;
      assert.ok(pal.pieces.filter(isTile).length * 2 <= pal.pieces.length, `a palette mostly tiles: ${pal.pieces.map(p => p.id)}`);
    }
  }
  assert.ok(plans >= 15 && squares >= 3 && palettes >= 100, `${plans} tilings, ${squares} squares, ${palettes} palettes`);
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
      assert.ok(!log.movements.some(m => m.name === "adrift"), `${start}: the plans came out as planned`);
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
      assert.equal(keys.length, shapes.filter(s => s.tags?.includes("zen") && s.rotations[0].length === 24).length, `${h}: ${keys.map(k => k.id)}`);
      assert.ok(keys.length >= 15, `${h}: ${keys.length} of them`);
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

test("oops-all names: plain plurals, a short form for the ones said over and over, no lines of their own", async () => {
  const { oopsName, pluralName, shortPlural } = await import("../src/zen.js");
  const { SHAPES } = await import("../shapes/main_shapes.js");
  const { makeRng } = await import("../src/util.js");
  assert.ok(SHAPES.every(s => !s.oops?.lines), "no lines of their own");
  const gnome = SHAPES.find(s => s.id === "garden_gnome");
  const state = { rng: makeRng(3) };
  assert.equal(oopsName(state, gnome, "oops"), "Oops, all garden gnomes!");
  assert.equal(oopsName(state, gnome, "thrice"), "gnomes gnomes gnomes!!");
  assert.equal(oopsName(state, gnome, "more"), "gnomes gnomes and more gnomes");
  assert.equal(oopsName(state, gnome, "reserve"), "the strategic reserve of garden gnomes");
  // worked out from the name, where a piece has nothing of its own
  assert.equal(pluralName("a beans, beans and beans"), "beans, beans and beans");
  assert.equal(pluralName("a microscope. it has a few questions about you."), "microscopes");
  assert.equal(pluralName("a smooth, smooth saxophone"), "smooth, smooth saxophones");
  assert.equal(shortPlural("Santa stuck in a chimney"), "Santas");
  assert.equal(shortPlural("a maraca, shaking with excitement"), "maracas");
  assert.equal(oopsName(state, "a mysterious flask of goo", "thrice"), "flasks flasks flasks!!");
});

test("turbo zen: each movement has a cast of its own, so no two look alike, and the beds are for all sorts", () => {
  const { state } = zen(4, "turbo");
  const mvs = [];
  let cur = null;
  const beds = [];
  on(state, (t, d) => {
    if (t === "zenMovement") { cur = { name: d.name, ids: new Set() }; mvs.push(cur); }
    if ((t === "zenMovement" || t === "zenAside") && /^a bed for/.test(d.caption ?? "")) beds.push(d.caption);
    if (t === "lock" && cur && !d.shape.powerup) cur.ids.add(d.shape.id);
  });
  run(state, null, 45 * 60000);
  // (how much of one movement's pieces another of the same kind shares, on average)
  const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
  let sum = 0, n = 0;
  for (const kind of ["column", "crack", "beds", "pile", "mess", "fall", "well", "standing"]) {
    const list = mvs.filter(m => m.name === kind && m.ids.size >= 6);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { sum += jac(list[i].ids, list[j].ids); n++; }
  }
  assert.ok(n >= 4, `${n} pairs`);
  assert.ok(sum / n < 0.12, `planned movements share ${(sum / n * 100).toFixed(0)}% of their pieces`);
  assert.ok(beds.length >= 6 && new Set(beds).size >= beds.length * 0.6, `beds: ${beds.join(" | ")}`);
});
