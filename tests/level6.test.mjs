// Run with:  node --test tests/*.test.mjs
// Level 6 groups, the comeback unlock, remixes and the rotation rules for big pieces.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { GROUPS } from "../shapes/groups.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, hardDropAndLock, on, updateGame, tryRotate, tryMove, setNextPiece } from "../src/game.js";
import { normaliseGroups, expandGroup, level6Open, stackRows, startGroup } from "../src/level6.js";
import { remixShape } from "../src/remix.js";

const { shapes, powerups } = loadShapes(SHAPES);
const filler = { paint: "#888888", style: { baseColor: "#888888" }, pid: 1e9 };

// a stack `rows` tall, with one gap per row so nothing clears
function setStack(state, rows) {
  const R = state.board.length, C = state.board[0].length;
  state.board = Array.from({ length: R }, (_, y) => Array.from({ length: C }, (_, x) => (y >= R - rows && x !== (y % C) ? { ...filler } : null)));
  state.instances.clear();
}

function drop(state) {
  hardDropAndLock(state);
  for (let k = 0; k < 400 && state.effect; k++) updateGame(state, 16);
}

// drop a single block (so the stack only grows by one, wherever it lands)
const [dot] = loadShapes([{ id: "dot", name: "dot", grid: ["X"], difficulty: 0 }]).shapes;
function dropDot(state) {
  state.active = { shape: dot, rotIdx: 0, x: 0, y: -1 };
  drop(state);
}

test("groups in the data are complete (every piece exists)", () => {
  const all = normaliseGroups(GROUPS, shapes);
  for (const g of GROUPS) {
    for (const step of g.sequence) {
      const ids = typeof step === "string" ? [step] : step.chain
        ? [...Object.keys(step.chain.start ?? {}), ...Object.values(step.chain.after ?? {}).flatMap(o => Object.keys(o))].filter(id => id !== "stop")
        : step.pick;
      for (const id of ids) assert.ok(shapes.some(s => s.id === id), `${g.id}: missing piece ${id}`);
    }
  }
  assert.equal(all.length, GROUPS.filter(g => (g.frequency ?? 1) > 0).length, "every group is live (but the banished ones)");
  // every level 6 piece belongs to a group
  const inGroups = new Set(GROUPS.flatMap(g => g.sequence.flatMap(st => (typeof st === "string" ? [st] : st.chain
    ? [...Object.keys(st.chain.start ?? {}), ...Object.values(st.chain.after ?? {}).flatMap(o => Object.keys(o))] : st.pick))));
  for (const s of shapes) if (s.echo) inGroups.add(s.echo); // (echoes come back inside their set)
  for (const s of shapes.filter(s => s.difficulty === 6 && (s.frequency ?? 1) > 0)) assert.ok(inGroups.has(s.id), `${s.id} is level 6 but in no group`);
});

test("spam always starts with two spams, then 2-5 remixes", () => {
  const g = normaliseGroups(GROUPS, shapes).find(g => g.id === "spam");
  const rng = makeRng(5);
  for (let i = 0; i < 200; i++) {
    const ids = expandGroup(g, rng).map(s => s.id);
    assert.deepEqual(ids.slice(0, 2), ["spam", "spam"]);
    assert.ok(ids.length >= 4 && ids.length <= 7, ids.join());
    assert.ok(ids.every(id => /spa*m|maps/.test(id)), ids.join());
  }
});

test("level 6 is locked until the comeback: above row 10, then back down to row 5", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(11), groups: GROUPS });
  let unlocks = 0;
  on(state, (t) => { if (t === "level6Unlocked") unlocks++; });
  startRun(state, "normal");
  setStack(state, 8); dropDot(state);
  assert.equal(level6Open(state), false, "a middling stack does nothing");
  setStack(state, 12); dropDot(state);
  assert.equal(level6Open(state), false, "high is not enough");
  assert.equal(state.pieceSel.level6.wasHigh, true);
  setStack(state, 6); dropDot(state);
  assert.equal(level6Open(state), false, "not low enough yet");
  setStack(state, 3); dropDot(state);
  assert.equal(level6Open(state), true, "dug back down: unlocked");
  assert.equal(unlocks, 1);

  // the first group arrives within a few pieces, whole and in order, nothing in between
  const served = [];
  on(state, (t, d) => { if (t === "spawn") served.push(d.shape); });
  for (let i = 0; i < 25 && !state.gameOver; i++) { setStack(state, 2); drop(state); }
  const first = served.findIndex(s => s.difficulty === 6);
  assert.ok(first >= 0 && first <= CONFIG.assist.level6.firstAfter[1] + 2, `first level 6 piece at ${first}`);
  let run = 0;
  while (served[first + run]?.difficulty === 6) run++;
  const ids = served.slice(first, first + run).map(s => s.id);
  assert.ok(GROUPS.some(g => matchesGroup(g, ids)), `a whole group, in order: ${ids.join(" > ")}`);
});

test("easy mode never unlocks level 6; dev override forces it either way", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(3), groups: GROUPS });
  startRun(state, "easy");
  setStack(state, 12); dropDot(state);
  setStack(state, 2); dropDot(state);
  assert.equal(level6Open(state), false);
  state.devLevel6 = "on";
  assert.equal(level6Open(state), true);
  state.devLevel6 = "off";
  startRun(state, "normal");
  setStack(state, 12); dropDot(state);
  setStack(state, 2); dropDot(state);
  assert.equal(level6Open(state), false, "forced off");
});

// How many pieces of `ids` (from `at`) make one whole pass through group `g`: its fixed pieces
// exactly, each pick step a number of its pieces within the count, each chain step up to `max`
// of its pieces, and an echo (déjà vu) of an earlier piece anywhere after it. -1 if they don't.
const echoOf = new Map(shapes.filter(s => s.echo).map(s => [s.echo, s.id]));
function matchGroupAt(g, ids, at = 0) {
  let i = at, echoed = false;
  const skipEcho = () => {
    if (!echoed && i < ids.length && echoOf.has(ids[i]) && ids.slice(at, i).includes(echoOf.get(ids[i]))) { i++; echoed = true; }
  };
  for (const st of g.sequence) {
    skipEcho();
    if (typeof st === "string") { if (ids[i] !== st) return -1; i++; continue; }
    if (st.chain) {
      const set = new Set([...Object.keys(st.chain.start ?? {}), ...Object.values(st.chain.after ?? {}).flatMap(o => Object.keys(o))]);
      let n = 0;
      while (i < ids.length && set.has(ids[i]) && n < (st.chain.max ?? 4)) { i++; n++; skipEcho(); }
      if (n < 1) return -1;
      continue;
    }
    const [lo, hi] = Array.isArray(st.count) ? st.count : [st.count ?? 1, st.count ?? 1];
    let n = 0;
    while (i < ids.length && st.pick.includes(ids[i]) && n < hi) { i++; n++; skipEcho(); }
    if (n < lo) return -1;
  }
  skipEcho();
  return i - at;
}
const matchesGroup = (g, ids) => matchGroupAt(g, ids, 0) === ids.length;

test("level 6 pieces never turn up outside a group", () => {
  const firstIds = new Map(GROUPS.filter(g => typeof g.sequence[0] === "string").map(g => [g.sequence[0], g]));
  for (const seed of [1, 2, 3, 4]) {
    const state = createGameState(shapes, powerups, { rng: makeRng(seed * 17), groups: GROUPS });
    state.devLevel6 = "on";
    const served = [];
    on(state, (t, d) => { if (t === "spawn") served.push(d.shape); });
    startRun(state, "normal");
    for (let i = 0; i < 400 && !state.gameOver; i++) { setStack(state, 2); drop(state); }
    // walk the served pieces: every group whole and in order, and no level 6 piece anywhere
    // else (the last group can be cut short by the end of the loop)
    const ids = served.map(s => s.id);
    let i = 0, groups = 0;
    while (i < ids.length) {
      const g = firstIds.get(ids[i]);
      if (g && served[i].difficulty === 6) {
        const n = matchGroupAt(g, ids, i);
        if (n < 0 && ids.length - i < 40) break;
        assert.ok(n > 0, `seed ${seed}: broken ${g.id} run: ${ids.slice(i, i + 16).join(">")}`);
        i += n; groups++;
        continue;
      }
      assert.notEqual(served[i].difficulty, 6, `seed ${seed}: ${ids[i]} outside a group (${ids.slice(Math.max(0, i - 3), i + 3).join(">")})`);
      i++;
    }
    assert.ok(groups >= 3, `seed ${seed}: ${groups} groups`);
  }
});

test("rotation: a wide piece by the wall is pushed in, and snaps back on the next turn", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(1) });
  startRun(state, "extreme");
  state.board = state.board.map(r => r.fill(null));
  const [bar] = loadShapes([{ id: "bar6", name: "bar", grid: ["XXXXXX"], difficulty: 3, rotation: { mode: "any" } }]).shapes;
  state.active = { shape: bar, rotIdx: 0, x: 4, y: 5 };
  // turn upright: big pieces turn about their centre
  assert.ok(tryRotate(state));
  assert.equal(state.active.rotIdx, 1);
  // move the upright bar to the right wall, then turn it flat: it must be pushed back in
  while (tryMove(state, 1, 0));
  const wallX = state.active.x;
  assert.equal(wallX, 13);
  assert.ok(tryRotate(state), "turns even at the wall");
  assert.ok(state.active.x + 6 <= 14, "not cropped");
  // turn again without moving: back where it was
  assert.ok(tryRotate(state));
  assert.equal(state.active.x, wallX, "snapped back");
  // but once moved sideways, it stays where the player put it
  assert.ok(tryRotate(state));
  const flatX = state.active.x;
  assert.ok(tryMove(state, -1, 0));
  assert.ok(tryRotate(state));
  assert.notEqual(state.active.x, wallX);
  assert.ok(flatX >= 0);
});

test("rotation: a board-wide piece can turn and turn back; turning never walks it anywhere", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(1) });
  startRun(state, "extreme");
  state.board = state.board.map(r => r.fill(null));
  const [wide] = loadShapes([{ id: "wide14", name: "wide", grid: ["XXXXXXXXXXXXXX", "XXXXXXXXXXXXXX"], difficulty: 6, rotation: { mode: "any" } }]).shapes;
  state.active = { shape: wide, rotIdx: 0, x: 0, y: 4 };
  const start = { x: state.active.x, y: state.active.y };
  for (let i = 0; i < 4; i++) assert.ok(tryRotate(state), `turn ${i + 1}`);
  assert.deepEqual({ x: state.active.x, y: state.active.y }, start, "four turns: back to the start");
  // small pieces still turn about their top-left corner (unchanged feel)
  const [ell] = loadShapes([{ id: "ell", name: "ell", grid: ["X.", "X.", "XX"], difficulty: 1 }]).shapes;
  state.active = { shape: ell, rotIdx: 0, x: 5, y: 5 };
  assert.ok(tryRotate(state));
  assert.deepEqual({ x: state.active.x, y: state.active.y }, { x: 5, y: 5 });
});

test("remixes: a new random blend each time, keeping the piece's id and level", () => {
  const byId = new Map(shapes.map(s => [s.id, s]));
  const scr = byId.get("scrambled_spam");
  const rng = makeRng(9);
  const a = remixShape(scr, byId, rng), b = remixShape(scr, byId, rng);
  assert.equal(a.id, "scrambled_spam");
  assert.equal(a.difficulty, 6);
  assert.notEqual(JSON.stringify(a.cellPaints[0]), JSON.stringify(b.cellPaints[0]), "scrambled differently");
  assert.deepEqual(a.rotations[0], scr.rotations[0], "same outline");
  const mix = byId.get("schnerzgerberz");
  if (mix) {
    const m1 = remixShape(mix, byId, rng), m2 = remixShape(mix, byId, rng);
    assert.equal(m1.name, mix.name);
    assert.ok(m1.rotations[0].flat().filter(Boolean).length >= 20, "a big blend");
    assert.notEqual(JSON.stringify(m1.cellPaints[0]), JSON.stringify(m2.cellPaints[0]));
  }
  // and a remix piece arrives remixed
  const state = createGameState(shapes, powerups, { rng: makeRng(2), groups: GROUPS });
  startRun(state, "normal");
  setNextPiece(state, scr);
  assert.equal(state.next.id, "scrambled_spam");
  assert.notEqual(state.next, scr);
});

test("stackRows counts from the bottom", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(1) });
  setStack(state, 7);
  assert.equal(stackRows(state), 7);
  state.board = state.board.map(r => r.fill(null));
  assert.equal(stackRows(state), 0);
});

// ---------- end game (src/endgame.js) ----------
import { pileRows, endGameOn } from "../src/endgame.js";

// a piece the player moved (still trying), dropped
function dropSteered(state) {
  state.active = { shape: dot, rotIdx: 0, x: 1, y: -1 };
  tryMove(state, -1, 0);
  drop(state);
}

test("end game: only once they've given up (stuck high, no rows), sooner if they stop steering", () => {
  const cfg = CONFIG.endGame;
  // stopped steering: pieces dropped where they appear
  let state = createGameState(shapes, powerups, { rng: makeRng(21), groups: GROUPS });
  startRun(state, "normal");
  for (let i = 1; i < cfg.idleStuckPieces; i++) { setStack(state, 17); dropDot(state); }
  assert.equal(endGameOn(state), false, "a few pieces high is not giving up");
  setStack(state, 17); dropDot(state);
  assert.equal(endGameOn(state), true, `idle and stuck for ${cfg.idleStuckPieces} pieces`);

  // still steering: it takes a good while longer
  state = createGameState(shapes, powerups, { rng: makeRng(22), groups: GROUPS });
  startRun(state, "normal");
  for (let i = 1; i < cfg.stuckPieces; i++) { setStack(state, 17); dropSteered(state); }
  assert.equal(endGameOn(state), false, "still trying");
  setStack(state, 17); dropSteered(state);
  assert.equal(endGameOn(state), true, `stuck for ${cfg.stuckPieces} pieces`);

  // destroying rows now and then means they're still fighting: never
  state = createGameState(shapes, powerups, { rng: makeRng(23), groups: GROUPS });
  startRun(state, "normal");
  for (let i = 0; i < 40; i++) {
    setStack(state, 17);
    if (i % 2 === 1) state.rowsDestroyed++; // (as if a row had gone, every other piece)
    dropDot(state);
  }
  assert.equal(endGameOn(state), false, "rows keep going");
});

test("end game: a level 6 group (and the pieces just after it) never set it off", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(24), groups: GROUPS });
  startRun(state, "normal");
  state.devLevel6 = "on";
  setNextPiece(state, startGroup(state, normaliseGroups(GROUPS, shapes).find(g => g.id === "townhouses")));
  const grace = CONFIG.endGame.graceAfterGroup;
  for (let i = 0; i < 3 + grace - 1; i++) { setStack(state, 17); dropDot(state); }
  assert.equal(endGameOn(state), false, "the group and its grace don't count");
});

test("end game: big pieces faster and faster, and it can be escaped (all unannounced)", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(21), groups: GROUPS });
  const events = [];
  on(state, (t, d) => { if (t === "endGame") events.push(d); });
  startRun(state, "normal");
  state.devEndGame = "on";
  setStack(state, 17); dropDot(state);
  state.devEndGame = "auto";
  assert.equal(endGameOn(state), true);
  assert.equal(state.fx.callouts.length, 0, "no callout");
  // pieces now are mostly big, and each falls faster than the last
  const served = [], speeds = [];
  on(state, (t, d) => { if (t === "spawn") { served.push(d.shape); speeds.push(state.dropMs); } });
  for (let i = 0; i < 20; i++) { setStack(state, 17); dropDot(state); }
  const giants = served.filter(s => !s.powerup && s.difficulty >= 4).length;
  assert.ok(giants >= 8, `giants ${giants}/20`);
  assert.ok(speeds[speeds.length - 1] < speeds[0], `speed ${speeds[0]} -> ${speeds[speeds.length - 1]}`);
  assert.ok(speeds[speeds.length - 1] >= CONFIG.endGame.minDropMs);
  // dig out: back to normal speed
  setStack(state, 6); dropDot(state);
  assert.equal(endGameOn(state), false, "escaped");
  assert.deepEqual(events[events.length - 1], { on: false, escaped: true });
  assert.ok(state.dropMs >= CONFIG.timing.minDropMs);
});

test("end game: a single tall giant on its end doesn't count as a full board", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(4) });
  const R = state.board.length;
  state.board = state.board.map((r, y) => r.map((_, x) => (x >= 5 && x <= 7 && y >= R - 18) || y >= R - 3 ? { ...filler } : null));
  assert.equal(pileRows(state), 3, "three tall columns only");
});

test("pieces spawn a little off-centre, mostly near the middle", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(8) });
  startRun(state, "extreme");
  const xs = new Map();
  for (let i = 0; i < 300; i++) {
    const a = state.active, w = a.shape.rotations[0][0].length;
    const off = a.x - Math.floor((14 - w) / 2);
    xs.set(off, (xs.get(off) ?? 0) + 1);
    assert.ok(a.x >= 0 && a.x + w <= 14);
    state.board = state.board.map(r => r.fill(null));
    dropDot(state);
  }
  assert.ok(xs.size >= 3, `offsets ${[...xs.keys()].join()}`);
  assert.ok((xs.get(0) ?? 0) > (xs.get(2) ?? 0), "the middle is the most common");
  assert.ok([...xs.keys()].every(o => Math.abs(o) <= CONFIG.spawn.jitter));
});

test("level 6: no set comes round again until every other one has, even into the next game", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(31), groups: GROUPS });
  const firsts = [];
  const runGame = () => {
    const seq = [];
    on(state, (t, d) => { if (t === "spawn" && d.shape.difficulty === 6 && state.pieceSel.level6.group && state.pieceSel.level6.queue.length >= 0) seq.push(d.shape.id); });
    startRun(state, "normal");
    state.devLevel6 = "on";
    const order = [];
    for (let i = 0; i < 1200 && !state.gameOver; i++) {
      const before = state.pieceSel.level6.seen.size + [...state.pieceSel.level6.seen.values()].reduce((a, b) => a + b, 0);
      setStack(state, 1); dropDot(state);
      const g = state.pieceSel.level6.group;
      if (g && order[order.length - 1] !== g) order.push(g);
    }
    return order;
  };
  const live = normaliseGroups(GROUPS, shapes).length;
  const a = runGame();
  assert.ok(a.length >= live + 1, `groups in game 1: ${a.join()}`);
  // the first `live` groups are all different, and no group follows itself
  assert.equal(new Set(a.slice(0, live)).size, live, a.join());
  for (let i = 1; i < a.length; i++) assert.notEqual(a[i], a[i - 1]);
  const b = runGame();
  assert.notEqual(b[0], a[a.length - 1], "the next game doesn't open with the last set");
});

test("Noah's ark: the ark, 3-4 different pairs, one last creature, a few raindrops, then forty days and forty nights of rain", () => {
  const g = normaliseGroups(GROUPS, shapes).find(g => g.id === "noahs_ark");
  const last = new Set(["just_one_unicorn", "just_one_dinosaur", "just_one_dodo", "just_one_mammoth", "just_one_griffin", "dragons_both_dudes"]);
  const drops = new Set(["raindrop", "big_raindrop", "drizzle"]);
  const rng = makeRng(9);
  const starts = new Set();
  for (let i = 0; i < 300; i++) {
    const ids = expandGroup(g, rng).map(s => s.id);
    assert.equal(ids[0], "noahs_ark");
    const pairs = ids.filter(id => id.startsWith("two_"));
    assert.ok(pairs.length >= 3 && pairs.length <= 4, ids.join());
    assert.equal(new Set(pairs).size, pairs.length, `the same pair twice: ${ids.join()}`);
    assert.deepEqual(ids.slice(1, 1 + pairs.length), pairs, ids.join());
    assert.ok(last.has(ids[1 + pairs.length]), `one creature after the pairs: ${ids.join()}`);
    const rain = ids.slice(2 + pairs.length, -1);
    assert.ok(rain.length >= 1 && rain.length <= 4 && rain.every(id => drops.has(id)), ids.join());
    assert.equal(ids[ids.length - 1], "forty_days_of_rain");
    starts.add(rain[0]);
    // (the rain reacts to itself: a big raindrop never comes straight after drizzle)
    rain.forEach((id, k) => { if (id === "big_raindrop") assert.ok(k > 0 && rain[k - 1] !== "drizzle", rain.join()); });
  }
  assert.ok(starts.has("drizzle") && starts.has("raindrop"), "the rain starts in different ways");
});

test("a raindrop straight after a raindrop is another raindrop", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(4), groups: GROUPS });
  startRun(state, "normal");
  const rain = shapes.find(s => s.id === "raindrop");
  const names = [];
  on(state, (t, d) => { if (t === "spawn") names.push(d.shape.name); });
  // (setNextPiece prepares the piece; the history says what came before it)
  for (let i = 0; i < 3; i++) { state.pieceSel.recentShapeIds.push("raindrop", "raindrop"); setNextPiece(state, rain); drop(state); }
  assert.ok(names.includes("another raindrop"), names.join(" | "));
});
