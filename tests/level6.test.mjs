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
import { normaliseGroups, expandGroup, level6Open, stackRows } from "../src/level6.js";
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
      const ids = typeof step === "string" ? [step] : step.pick;
      for (const id of ids) assert.ok(shapes.some(s => s.id === id), `${g.id}: missing piece ${id}`);
    }
  }
  assert.equal(all.length, GROUPS.length, "every group is live");
  // every level 6 piece belongs to a group
  const inGroups = new Set(GROUPS.flatMap(g => g.sequence.flatMap(st => (typeof st === "string" ? [st] : st.pick))));
  for (const s of shapes.filter(s => s.difficulty === 6)) assert.ok(inGroups.has(s.id), `${s.id} is level 6 but in no group`);
});

test("spam always starts with two spams, then 2-5 remixes", () => {
  const g = normaliseGroups(GROUPS, shapes).find(g => g.id === "spam");
  const rng = makeRng(5);
  for (let i = 0; i < 200; i++) {
    const ids = expandGroup(g, rng).map(s => s.id);
    assert.deepEqual(ids.slice(0, 2), ["spam", "spam"]);
    assert.ok(ids.length >= 4 && ids.length <= 7, ids.join());
    assert.ok(ids.every(id => /spam|spm/.test(id)), ids.join());
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
  const g = GROUPS.find(g => (typeof g.sequence[0] === "string" ? g.sequence[0] : null) === ids[0]);
  assert.ok(g, `run starts a group: ${ids.join(" > ")}`);
  const fixed = g.sequence.filter(st => typeof st === "string");
  assert.deepEqual(ids.slice(0, fixed.length), fixed, `in order: ${ids.join(" > ")}`);
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

test("level 6 pieces never turn up outside a group", () => {
  for (const seed of [1, 2, 3, 4]) {
    const state = createGameState(shapes, powerups, { rng: makeRng(seed * 17), groups: GROUPS });
    state.devLevel6 = "on";
    const served = [];
    on(state, (t, d) => { if (t === "spawn") served.push(d.shape.id); });
    startRun(state, "normal");
    for (let i = 0; i < 400 && !state.gameOver; i++) { setStack(state, 2); drop(state); }
    // split into runs of level 6 pieces; each must be a whole group
    const d6 = new Set(shapes.filter(s => s.difficulty === 6).map(s => s.id));
    const runs = [];
    let cur = null;
    for (const id of served) {
      if (d6.has(id)) { if (!cur) runs.push(cur = []); cur.push(id); } else cur = null;
    }
    assert.ok(runs.length >= 3, `seed ${seed}: ${runs.length} groups`);
    // (the last run can be cut short by the end of this loop)
    if (d6.has(served[served.length - 1])) runs.pop();
    for (const r of runs) {
      const g = GROUPS.find(g => g.sequence[0] === r[0]);
      assert.ok(g, `run ${r.join(">")}`);
      const fixed = g.sequence.filter(st => typeof st === "string");
      assert.deepEqual(r.slice(0, fixed.length), fixed);
    }
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

test("end game: starts at two thirds full, serves giants faster and faster, can be escaped", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(21), groups: GROUPS });
  const events = [];
  on(state, (t, d) => { if (t === "endGame") events.push(d); });
  startRun(state, "normal");
  setStack(state, 12); dropDot(state);
  assert.equal(endGameOn(state), false, "12 rows: not yet");
  setStack(state, 17); dropDot(state);
  assert.equal(endGameOn(state), true, "17 rows: end game");
  assert.deepEqual(events[0], { on: true });
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
