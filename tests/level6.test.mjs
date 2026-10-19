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
import { normaliseGroups, expandGroup, lastVersion, noteVersion, level6Open, stackRows, startGroup, groupPlayable, maybeStartGroup } from "../src/level6.js";
import { selectPiece } from "../src/selection.js";
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

// A group's sequences: each of its versions, or its one sequence.
const sequencesOf = (g) => g.versions ?? [g.sequence];

test("groups in the data are complete (every piece exists)", () => {
  const all = normaliseGroups(GROUPS, [...shapes, ...powerups]);
  for (const g of GROUPS) {
    for (const step of sequencesOf(g).flat()) {
      const ids = typeof step === "string" ? [step] : step.variant ?? step.repeat ?? (step.chain
        ? [...Object.keys(step.chain.start ?? {}), ...Object.values(step.chain.after ?? {}).flatMap(o => Object.keys(o))].filter(id => id !== "stop")
        : step.pick);
      for (const id of ids) assert.ok(shapes.some(s => s.id === id) || powerups.some(p => p.id === id), `${g.id}: missing piece ${id}`);
    }
  }
  assert.equal(all.length, GROUPS.filter(g => (g.frequency ?? 1) > 0).length, "every group is live (but the banished ones)");
  // every level 6 piece belongs to a group
  const inGroups = new Set(GROUPS.flatMap(g => sequencesOf(g).flat().flatMap(st => (typeof st === "string" ? [st] : st.variant ?? st.repeat ?? (st.chain
    ? [...Object.keys(st.chain.start ?? {}), ...Object.values(st.chain.after ?? {}).flatMap(o => Object.keys(o))] : st.pick)))));
  for (const s of shapes) if (s.echo) inGroups.add(s.echo); // (echoes come back inside their set)
  for (const s of shapes.filter(s => s.difficulty === 6 && (s.frequency ?? 1) > 0)) assert.ok(inGroups.has(s.id), `${s.id} is level 6 but in no group`);
});

test("spam always starts with two spams (the first the can that also turns up on its own), then a long run more; Sp is usually followed by am!", () => {
  const g = normaliseGroups(GROUPS, shapes).find(g => g.id === "spam");
  const rng = makeRng(5);
  let sp = 0, spAm = 0;
  for (let i = 0; i < 400; i++) {
    const ids = expandGroup(g, rng).map(s => s.id);
    assert.deepEqual(ids.slice(0, 2), ["spam_can", "spam"]);
    // (almost annoyingly long: two runs of it, with one of its own powerups in between, not here)
    assert.ok(ids.length >= 12 && ids.length <= 22, ids.join());
    assert.ok(ids.every(id => /spa*m|maps|^sp|^am$|spergegam/.test(id)), ids.join());
    ids.forEach((id, k) => { if (id === "sp" && k + 1 < ids.length) { sp++; if (ids[k + 1] === "am") spAm++; } });
  }
  assert.ok(sp > 10 && spAm / sp > 0.6, `am! after ${spAm} of ${sp} Sp`);
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

  // (once the warm-up at the start of a game is over: in it, the sets hardly ever start)
  state.pieceSel.dropIndex = Math.max(state.pieceSel.dropIndex, CONFIG.assist.warmup.goneBy);
  const served = [];
  on(state, (t, d) => { if (t === "spawn") served.push(d.shape); });
  // not before two classes have been met (CONFIG.assist.level6.afterClass)...
  const ps = state.pieceSel.powerup, after = CONFIG.assist.level6.afterClass;
  ps.classes = ps.classes.slice(0, 1); ps.shownClasses = new Set(ps.classes);
  ps.cooldown = 1e9; // (no powerups in the meantime, so they aren't met yet)
  for (let i = 0; i < 12 && !state.gameOver; i++) { setStack(state, 2); drop(state); }
  ps.cooldown = 0;
  assert.ok(!served.some(s => s.difficulty === 6), `not before the ${after} class: ${served.map(s => s.id)}`);
  // ...and then the first group arrives within a few pieces, whole and in order, nothing in between
  for (const c of ["destroyer", "gravity", "expander"]) if (ps.shownClasses.size < after) ps.shownClasses.add(c);
  served.length = 0;
  for (let i = 0; i < 25 && !state.gameOver; i++) { setStack(state, 2); drop(state); }
  const first = served.findIndex(s => s.difficulty === 6);
  assert.ok(first >= 0 && first <= CONFIG.assist.level6.firstAfter[1] + 2, `first level 6 piece at ${first}`);
  // (the run of level 6 pieces, and any of the set's own pieces either side of it: a set of
  // beans opens with an ordinary can of beans)
  const whole = (g) => {
    const members = new Set(JSON.stringify(g.versions ?? g.sequence).match(/[a-z0-9_]+/g));
    let a = first, b = first;
    while (a > 0 && members.has(served[a - 1].id)) a--;
    while (b < served.length && (served[b].difficulty === 6 || members.has(served[b].id))) b++;
    return served.slice(a, b).map(s => s.id);
  };
  assert.ok(GROUPS.some(g => matchesGroup(g, whole(g))), `a whole group, in order: ${served.slice(first, first + 8).map(s => s.id).join(" > ")}`);
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
// (`cut`: or as much of one as there was before `ids` ran out)
const echoOf = new Map(shapes.filter(s => s.echo).map(s => [s.echo, s.id]));
function matchGroupAt(g, ids, at = 0, cut = false) {
  // (a set with versions: whichever of them it is)
  return Math.max(...sequencesOf(g).map(seq => matchSequenceAt(seq, ids, at, cut)));
}
function matchSequenceAt(sequence, ids, at, cut) {
  // every way of sharing the pieces out between the steps (a step's count can vary), the most
  // pieces first; an echo can turn up anywhere after its original
  const steps = sequence.map(st => {
    if (typeof st === "string") return { members: new Set([st]), lo: 1, hi: 1 };
    if (st.variant) return { members: new Set(st.variant), lo: 1, hi: 1 };
    // (a chain's powerups can be left out where they can't come yet: all of it, even, when it was
    // all powerups, Noah's storm clouds before the Expanderz have been met)
    if (st.chain) return { members: new Set([...Object.keys(st.chain.start ?? {}), ...Object.values(st.chain.after ?? {}).flatMap(o => Object.keys(o))]), lo: 0, hi: st.chain.max ?? 4 };
    // (now and then one of them over and over, as itself or its echo)
    if (st.repeat) return { members: new Set([...st.repeat, ...st.repeat.map(id => shapes.find(s => s.id === id)?.echo).filter(Boolean)]), lo: 0, hi: [].concat(st.times).at(-1) };
    let [lo, hi] = Array.isArray(st.count) ? st.count : [st.count ?? 1, st.count ?? 1];
    // (banished pieces are left out of a pick, as the game does: a unique pick of two with one
    // banished is one)
    const live = st.pick.filter(id => shapes.some(s => s.id === id && (s.frequency ?? 1) > 0));
    if (st.unique && live.length) { lo = Math.min(lo, live.length); hi = Math.min(hi, live.length); }
    // (a step that only happens now and then, or of powerups that can't come yet: maybe none)
    const optional = st.chance != null || st.pick.every(id => !shapes.some(s => s.id === id));
    return { members: new Set(st.pick), lo: optional ? 0 : lo, hi };
  });
  let best = -1;
  const go = (si, i, n, echoed) => {
    if (!echoed && i < ids.length && echoOf.has(ids[i]) && ids.slice(at, i).includes(echoOf.get(ids[i])) && go(si, i + 1, n, true)) return true;
    if (si === steps.length || (cut && i === ids.length && i > at)) { best = i - at; return true; }
    const st = steps[si];
    if (n < st.hi && i < ids.length && st.members.has(ids[i]) && go(si, i + 1, n + 1, echoed)) return true;
    return n >= st.lo && go(si + 1, i, 0, echoed);
  };
  go(0, at, 0, false);
  return best;
}
const matchesGroup = (g, ids) => matchGroupAt(g, ids, 0) === ids.length;

test("level 6 pieces never turn up outside a group", () => {
  // (several sets can open with the same piece: the small piece of the sky)
  const firstIds = new Map();
  const add = (id, g) => { if (!firstIds.has(id)) firstIds.set(id, []); firstIds.get(id).push(g); };
  for (const g of GROUPS) {
    for (const seq of sequencesOf(g)) {
      const st = seq[0];
      if (typeof st === "string") add(st, g);
      for (const id of [...(st?.variant ?? []), ...(st?.pick ?? []), ...Object.keys(st?.chain?.start ?? {})]) add(id, g);
    }
  }
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
      const gs = firstIds.get(ids[i]) ?? [];
      // (a set can open with an ordinary piece, like the small piece of the sky; and sets can
      // share an opening, like the emotions charts: the one that matches the most of it)
      // (the last one can be cut short by the end of the loop)
      const best = gs.map(g => [g, matchGroupAt(g, ids, i, true)]).sort((a, b) => b[1] - a[1])[0];
      const g = best && best[1] > 0 ? best[0] : gs[0];
      const m = best && best[1] > 0 ? best[1] : g ? matchGroupAt(g, ids, i, true) : -1;
      if (g && (served[i].difficulty === 6 || m > 0)) {
        const n = m;
        if (n < 0 && ids.length - i < 40) break;
        assert.ok(n > 0, `seed ${seed}: broken ${g.id} run: ${ids.slice(i, i + 16).join(">")}`);
        i += n; groups++;
        continue;
      }
      // (the last few: the tail of a set the end of the loop cut short, that matched a shorter one)
      if (ids.length - i < 12 && served[i - 1]?.difficulty === 6) break;
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
  // turn upright (about its corner, like every piece that fits that way)
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

test("rotation: a giant turned upright beside a high stack can still be turned back, but never climbs", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(1) });
  startRun(state, "extreme");
  // a high stack on the right, a low one on the left
  state.board = state.board.map((row, y) => row.map((_, x) => ((x >= 9 && y >= 10) || (x < 9 && y >= 18) ? { ...filler } : null)));
  const octopus = shapes.find(s => s.id === "invader_octopus_arcade");
  const mid = () => state.active.y + (octopus.rotations[state.active.rotIdx].length - 1) / 2;
  state.active = { shape: octopus, rotIdx: 0, x: 1, y: -2 };
  const start = mid();
  assert.ok(tryRotate(state), "turned upright");
  while (tryMove(state, 0, 1));
  const upright = { ...state.active };
  // sideways again, its corner where it is: in the high stack. So it rises to turn
  assert.ok(tryRotate(state), "turned back");
  assert.equal(octopus.rotations[state.active.rotIdx][0].length, 12, "sideways again");
  assert.ok(state.active.y < upright.y, "it rose to turn");
  // and turning over and over never takes it above where it was before it first turned
  let highest = mid();
  for (let i = 0; i < 16; i++) { tryRotate(state); while (tryMove(state, 0, 1)); highest = Math.min(highest, mid()); }
  assert.ok(highest >= start, `its middle up to row ${highest}, from ${start}`);
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

test("end game while they're still steering: faster and worse, but never a giant", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(21), groups: GROUPS });
  startRun(state, "normal");
  state.devEndGame = "on";
  setStack(state, 17); dropSteered(state);
  assert.equal(endGameOn(state), true);
  const served = [];
  on(state, (t, d) => { if (t === "spawn") served.push(d.shape); });
  for (let i = 0; i < 30; i++) { setStack(state, 17); dropSteered(state); }
  assert.equal(served.filter(s => !s.powerup && s.difficulty >= 4).length, 0, served.map(s => s.id).join());
});

test("late in a game, giants only with the stack low, and a set under way waits while it's high (then gives up)", () => {
  const D = CONFIG.difficulty.normal, end = D.start + D.length, cfg = CONFIG.assist.level6;
  const giantsWith = (rows) => {
    let n = 0;
    for (const seed of [41, 42, 43]) {
      const state = createGameState(shapes, powerups, { rng: makeRng(seed), groups: GROUPS });
      startRun(state, "normal");
      state.devEndGame = "off";
      for (let i = 0; i < 150; i++) {
        setStack(state, rows);
        state.pieceSel.dropIndex = end;
        const s = selectPiece(state);
        if (!s.powerup && (s.difficulty ?? 1) >= 4) n++;
      }
    }
    return n;
  };
  assert.equal(giantsWith(13), 0, "none on a stack 13 rows tall");
  assert.ok(giantsWith(4) > 0, "but they still come on a low one");

  const state = createGameState(shapes, powerups, { rng: makeRng(44), groups: GROUPS });
  startRun(state, "normal");
  state.devLevel6 = "on";
  state.devEndGame = "off";
  startGroup(state, normaliseGroups(GROUPS, shapes).find(g => g.id === "townhouses"));
  const left = state.pieceSel.level6.queue.length;
  assert.ok(left > 0);
  for (let i = 0; i < cfg.waitPieces; i++) {
    setStack(state, 17);
    state.pieceSel.dropIndex = end;
    const s = selectPiece(state);
    assert.ok((s.difficulty ?? 1) < 4 || s.powerup, `${s.id} on a stack 17 rows tall`);
    assert.equal(state.pieceSel.level6.queue.length, left, "the set waits");
  }
  setStack(state, 17);
  selectPiece(state);
  assert.equal(state.pieceSel.level6.queue.length, 0, "and in the end gives up");
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
    // (every powerup class met from the start, so every set can come: a set with Destroyerz in
    // it waits for them, and which class comes first is down to the dice)
    for (const c of ["destroyer", "gravity", "expander", "combo"]) state.pieceSel.powerup.shownClasses.add(c);
    const order = [];
    for (let i = 0; i < 1200 && !state.gameOver; i++) {
      const l6 = state.pieceSel.level6, n0 = l6.starts ?? 0;
      setStack(state, 1); dropDot(state);
      if ((state.pieceSel.level6.starts ?? 0) > n0) order.push(state.pieceSel.level6.lastGroup);
    }
    return order;
  };
  // (versions of one set, an emotions chart and the very British one, count as one set:
  // CONFIG.assist.level6.same)
  const kindOf = new Map();
  for (const list of CONFIG.assist.level6.same ?? []) for (const id of list) kindOf.set(id, list[0]);
  const kind = (id) => kindOf.get(id) ?? id;
  const live = new Set(normaliseGroups(GROUPS, shapes).filter(g => g.frequency > 0).map(g => kind(g.id))).size;
  const a = runGame();
  assert.ok(a.length >= live + 1, `groups in game 1: ${a.join()}`);
  // the first `live` sets are all different, versions and all, and no set follows itself
  assert.equal(new Set(a.slice(0, live).map(kind)).size, live, a.join());
  for (let i = 1; i < a.length; i++) assert.notEqual(kind(a[i]), kind(a[i - 1]));
  const b = runGame();
  assert.notEqual(kind(b[0]), kind(a[a.length - 1]), "the next game doesn't open with the last set");
});

test("Noah's ark: the ark, 3-4 different pairs, one last creature, a few raindrops (or storm clouds), then forty days and forty nights of rain", () => {
  // (the storm clouds are Expanderz: the groups are made from every piece, as in the game)
  const g = normaliseGroups(GROUPS, [...shapes, ...powerups]).find(g => g.id === "noahs_ark");
  const last = new Set(["just_one_unicorn", "just_one_dinosaur", "just_one_dodo", "just_one_mammoth", "just_one_griffin", "dragons_both_dudes"]);
  const drops = new Set(["raindrop", "big_raindrop", "drizzle"]), storms = new Set(["storm_cloud", "big_storm_cloud", "rumbling_storm_cloud"]);
  const rng = makeRng(9);
  const starts = new Set(), ends = new Set();
  for (let i = 0; i < 300; i++) {
    const ids = expandGroup(g, rng).map(s => s.id);
    assert.equal(ids[0], "noahs_ark");
    const pairs = ids.filter(id => id.startsWith("two_"));
    assert.ok(pairs.length >= 3 && pairs.length <= 4, ids.join());
    assert.equal(new Set(pairs).size, pairs.length, `the same pair twice: ${ids.join()}`);
    assert.deepEqual(ids.slice(1, 1 + pairs.length), pairs, ids.join());
    assert.ok(last.has(ids[1 + pairs.length]), `one creature after the pairs: ${ids.join()}`);
    const rain = ids.slice(2 + pairs.length, -1);
    // (all rain, or all storm clouds)
    assert.ok(rain.length >= 1 && rain.length <= 4 && (rain.every(id => drops.has(id)) || rain.every(id => storms.has(id))), ids.join());
    assert.match(ids[ids.length - 1], /^forty_days_of_rain/);
    starts.add(rain[0]);
    ends.add(ids[ids.length - 1]);
    // (the rain reacts to itself: a big raindrop never comes straight after drizzle)
    rain.forEach((id, k) => { if (id === "big_raindrop") assert.ok(k > 0 && rain[k - 1] !== "drizzle", rain.join()); });
  }
  assert.ok(starts.has("drizzle") && starts.has("raindrop") && starts.has("storm_cloud"), "the rain starts in different ways");
  assert.equal(ends.size, 3, "and the downpour comes three ways");
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

test("emotions: two to four ordinary ones, then on to the strange, mostly ending on the absurd, now and then on déjà vu over and over", () => {
  const g = normaliseGroups(GROUPS, shapes).find(g => g.id === "emotions");
  const rng = makeRng(12);
  const firsts = new Set(), lasts = new Map();
  const ordinary = new Set(["happiness", "sadness", "anger", "fear", "surprise", "boredom", "calm", "jealousy"].map(n => "emotion_" + n));
  const again = (id) => /^emotion_(deja_vu|memory_loss)(_2)?$/.test(id);
  const opens = new Set();
  let overAndOver = 0;
  for (let i = 0; i < 400; i++) {
    let ids = expandGroup(g, rng).map(s => s.id);
    // (two to four ordinary ones first)
    let n = 0;
    while (n < ids.length && ordinary.has(ids[n])) n++;
    assert.ok(n >= 2, `opens on ${n} ordinary: ${ids.join()}`);
    opens.add(Math.min(n, 4));
    // now and then it ends on déjà vu (or memory loss) again, and again, and again
    let tail = 0;
    while (tail < ids.length && again(ids[ids.length - 1 - tail]) && ids[ids.length - 1 - tail].replace(/_2$/, "") === ids[ids.length - 1].replace(/_2$/, "")) tail++;
    if (tail >= 3) { overAndOver++; ids = ids.slice(0, ids.length - tail); }
    assert.ok(ids.length >= 4 && ids.length <= 11, ids.join());
    // otherwise no card twice, but for the one that comes back (déjà vu), and that never last
    const plain = ids.filter(id => !/_2$/.test(id));
    assert.equal(new Set(plain).size, plain.length, `twice: ${ids.join()}`);
    assert.ok(!/_2$/.test(ids[ids.length - 1]), `ends on a repeat: ${ids.join()}`);
    firsts.add(ids[0]);
    const last = ids[ids.length - 1];
    lasts.set(last, (lasts.get(last) ?? 0) + 1);
  }
  assert.ok(firsts.size >= 8, `opens ${firsts.size} ways`);
  assert.deepEqual([...opens].sort(), [2, 3, 4], "with two, three or four of them");
  assert.ok(overAndOver > 400 * 0.2 && overAndOver < 400 * 0.4, `over and over ${overAndOver} of 400`);
  const absurd = ["existential_dread", "winning_estrix", "inner_emptiness", "being_a_piece", "playing_estrix", "long_piece", "row_grief", "fear_of_ceiling", "utter_euphoria"].map(n => "emotion_" + n);
  const plainEnds = ["happiness", "sadness", "anger", "fear", "surprise", "boredom", "calm", "jealousy"].map(n => "emotion_" + n);
  const count = (list) => list.reduce((n, id) => n + (lasts.get(id) ?? 0), 0);
  assert.ok(count(absurd) > 400 * 0.6, `ends on the absurd ${count(absurd)} of 400 (before any déjà vu)`);
  assert.ok(count(plainEnds) > 0, "and now and then on a plain one");
});

test("beans and Spaghetti-Os: a can (that also turns up on its own), then more and more of it, never the same run twice", () => {
  const all = normaliseGroups(GROUPS, shapes);
  for (const [id, can] of [["beans", "beans"], ["spaghetti_os", "spaghetti_os"]]) {
    const g = all.find(g => g.id === id);
    assert.ok(g, id);
    const tin = shapes.find(s => s.id === can);
    assert.ok((tin.difficulty ?? 1) < 6 && (tin.frequency ?? 1) > 0, `${can} is an ordinary piece too`);
    const rng = makeRng(9), runs = new Set();
    for (let i = 0; i < 200; i++) {
      const ids = expandGroup(g, rng).map(s => s.id);
      assert.equal(ids[0], can, ids.join());
      assert.ok(ids.length >= 12 && ids.length <= 22, ids.join()); // (almost annoyingly long)
      runs.add(ids.join());
    }
    assert.ok(runs.size > 150, `${id}: ${runs.size} different runs of 200`);
  }
});

test("the emotions chart's other endings: very British (a nice cup of tea), online (touching grass); for business (stonks), banished for now", () => {
  const all = normaliseGroups(GROUPS, shapes);
  const raw = (id) => GROUPS.find(g => g.id === id);
  assert.ok(!all.some(g => g.id === "emotions_business"), "the business chart is banished");
  for (const [id, usual, now] of [["emotions_british", "emotion_cup_of_tea", "emotion_sorry"], ["emotions_online", "emotion_touching_grass", "emotion_off_and_on_again"]]) {
    const g = all.find(g => g.id === id);
    assert.ok(g, id);
    assert.deepEqual(raw(id).sequence.slice(0, 4), raw("emotions").sequence.slice(0, 4), `${id}: the usual opening`);
    const rng = makeRng(5), ends = new Map();
    for (let i = 0; i < 200; i++) {
      const ids = expandGroup(g, rng).map(s => s.id).filter(x => !/deja_vu|memory_loss|spooky/.test(x));
      assert.equal(new Set(ids).size, ids.length, `${id}: no card twice: ${ids.join()}`);
      ends.set(ids.at(-1), (ends.get(ids.at(-1)) ?? 0) + 1);
    }
    // (unless the usual ending has been banished: then never on it)
    if (!((shapes.find(s => s.id === usual)?.frequency ?? 1) > 0)) { assert.ok(!ends.has(usual), `${id}: never on the banished ${usual}`); continue; }
    assert.ok((ends.get(usual) ?? 0) > 200 * 0.7, `${id}: ends on ${usual} ${ends.get(usual)} of 200`);
    assert.ok((ends.get(now) ?? 0) > 0, `${id}: and now and then on ${now}`);
  }
});

test("a set with versions comes as a different one each time", () => {
  const raw = ["a", "b", "c", "d", "e", "f"].map(id => ({ id: "v_" + id, name: id, grid: ["XX"], difficulty: 6 }));
  const { shapes: vs } = loadShapes(raw);
  const [g] = normaliseGroups([{ id: "vset", name: "vset", versions: [["v_a", "v_b"], ["v_c", "v_d"], ["v_e", { pick: ["v_f", "v_a"], count: 1 }]] }], vs);
  assert.equal(g.versions.length, 3);
  const rng = makeRng(4);
  const state = { setVersions: new Map() };
  let last = null;
  const seen = new Set();
  for (let i = 0; i < 60; i++) {
    const run = expandGroup(g, rng, null, lastVersion(state, g));
    assert.notEqual(run.version, last, "never the same version twice running");
    assert.ok([["v_a", "v_b"], ["v_c", "v_d"]].some(v => v.join() === run.map(s => s.id).join()) || run[0].id === "v_e", run.map(s => s.id).join());
    noteVersion(state, g, run.version);
    last = run.version;
    seen.add(run.version);
  }
  assert.equal(seen.size, 3, "all of them");
});

test("dinosaur bones: one dinosaur's bones in order, then its head; all four dinosaurs turn up", () => {
  const g = normaliseGroups(GROUPS, shapes).find(g => g.id === "dinosaur_bones");
  const rng = makeRng(3), seen = new Set();
  for (let i = 0; i < 200; i++) {
    const ids = expandGroup(g, rng).map(s => s.id);
    const d = ids[0].split("_")[1];
    assert.deepEqual(ids, [1, 2, 3, "head"].map(k => `bones_${d}_${k}`), ids.join());
    seen.add(d);
  }
  assert.equal(seen.size, 4);
});

test("existence: a thing at each stage, from the physical to the end of everything, in any of its shapes", () => {
  const g = normaliseGroups(GROUPS, shapes).find(g => g.id === "existence");
  const stages = [["universe", "reality", "observable"], ["multiverse", "time", "concept"], ["abstract", "consciousness", "soul"],
    ["knowledge", "ignorance"], ["questions", "doubt"], ["life", "choices", "wisdom"], ["death", "void", "nothingness", "terror"]];
  const concept = (id) => id.replace(/^existence_/, "").replace(/_(a|b|\d)$/, "");
  const stageOf = (id) => stages.findIndex(st => st.includes(concept(id)));
  const rng = makeRng(4), seen = new Set(), versions = new Map();
  let sometimes = 0;
  for (let i = 0; i < 400; i++) {
    const ids = expandGroup(g, rng).map(s => s.id);
    const at = ids.map(stageOf);
    assert.ok(!at.includes(-1), ids.join());
    // one of each stage, in order, but the questions only sometimes
    assert.deepEqual(at.filter(k => k !== 4), [0, 1, 2, 3, 5, 6], ids.join());
    assert.ok(at.join() === [...at].sort((a, b) => a - b).join(), `in order: ${ids.join()}`);
    if (at.includes(4)) sometimes++;
    for (const id of ids) { seen.add(concept(id)); if (!versions.has(concept(id))) versions.set(concept(id), new Set()); versions.get(concept(id)).add(id); }
  }
  assert.equal(seen.size, stages.flat().length, `every one turns up: ${[...seen]}`);
  // (every version that isn't banished turns up)
  const liveVersions = (c) => shapes.filter(s => s.id.startsWith("existence_") && concept(s.id) === c && (s.frequency ?? 1) > 0 && s.difficulty === 6).length;
  for (const [c, v] of versions) assert.ok(v.size >= Math.min(2, liveVersions(c)), `${c} in ${v.size} versions of ${liveVersions(c)}`);
  assert.ok(sometimes > 120 && sometimes < 280, `questions or doubt in ${sometimes} of 400`);
});

test("a set can have powerups in it: ones that only ever come in it, once their class is met, and only where there are powerups", () => {
  // (a made-up set: two ordinary level 6 pieces, then a powerup that's only for it)
  const big = shapes.filter(s => s.difficulty === 6).slice(0, 2);
  const raw = SHAPES.find(s => s.powerup?.type === "destroyer" && (s.frequency ?? 1) > 0);
  const own = loadShapes([{ ...raw, id: "t_set_only", powerup: { ...raw.powerup, setOnly: true } }]).powerups[0];
  const groups = [{ id: "t_with_powerup", name: "test", frequency: 1, sequence: [big[0].id, big[1].id, "t_set_only"] }];
  const make = (mode) => {
    const state = createGameState(shapes, [...powerups, own], { rng: makeRng(5), groups });
    startRun(state, mode);
    return state;
  };
  const g = make("normal").groups.find(x => x.id === "t_with_powerup");
  assert.ok(g, "the set, with its powerup");
  assert.deepEqual(g.powerupClasses, ["destroyer"]);
  // never outside its set
  const state = make("normal");
  assert.ok(!state.powerups.some(p => p.id === "t_set_only"), "not one of the mode's powerups");
  // where it can come: not where there are no powerups; in Classic once Destroyerz are met
  assert.equal(groupPlayable(make("extreme"), g), false, "Extreme has no powerups");
  const n = make("normal");
  assert.equal(groupPlayable(n, g), false, "not before the Destroyerz have been met");
  n.pieceSel.powerup.shownClasses.add("destroyer");
  assert.equal(groupPlayable(n, g), true);
  assert.equal(groupPlayable(make("god"), g), true, "God mode: everything from the start");
  // and it comes in order, the powerup last, as it is
  n.devLevel6 = "on";
  const served = [startGroup(n, g, expandGroup(g, n.rng)).id]; // (starting it hands out its first piece)
  for (let i = 0; i < 2; i++) served.push(selectPiece(n).id);
  assert.deepEqual(served, [big[0].id, big[1].id, "t_set_only"]);
});

test("the tins: after spam, beans or spaghetti-os, the other two are unlikely for a while", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(41), groups: GROUPS });
  startRun(state, "normal");
  state.devLevel6 = "on";
  for (const c of ["destroyer", "gravity", "expander", "combo"]) state.pieceSel.powerup.shownClasses.add(c);
  assert.ok(CONFIG.assist.level6.families.some(f => ["spam", "beans", "spaghetti_os"].every(id => f.includes(id))));
  // how often the next set is spam or spaghetti-os, straight after these sets (latest first)
  const share = (before) => {
    let n = 0, tinned = 0;
    for (let i = 0; i < 800; i++) {
      const sel = state.pieceSel, l6 = sel.level6;
      Object.assign(l6, { queue: [], group: null, seen: new Map(), lastEnd: -1000, firstDueAt: 0 });
      Object.assign(sel, { lastWasHard: false, calmUntil: null, dropIndex: 500 });
      state.level6Recent = [...before];
      if (!maybeStartGroup(state)) continue;
      n++;
      if (l6.lastGroup === "spam" || l6.lastGroup === "spaghetti_os") tinned++;
    }
    return tinned / Math.max(1, n);
  };
  const usual = share(["tower_of_babel"]), afterBeans = share(["beans"]);
  const threeAgo = share(["noahs_ark", "trees", "beans"]), fourAgo = share(["noahs_ark", "trees", "everest", "beans"]);
  assert.ok(usual > 0.04, `as usual ${usual.toFixed(3)}`);
  assert.ok(afterBeans < usual * 0.25, `straight after beans ${afterBeans.toFixed(3)} vs ${usual.toFixed(3)}`);
  assert.ok(threeAgo < usual * 0.25, `beans three sets ago ${threeAgo.toFixed(3)} vs ${usual.toFixed(3)}`);
  assert.ok(fourAgo > usual * 0.6, `beans four sets ago: as usual again ${fourAgo.toFixed(3)} vs ${usual.toFixed(3)}`);
  // (and the game remembers enough sets for it)
  assert.ok(Math.max(CONFIG.assist.level6.rememberRecent, CONFIG.assist.level6.familyGap) >= 3);
});

test("a set doesn't come round again until most of the others have been since (the emotions charts: all their versions as one)", () => {
  const cfg = CONFIG.assist.level6;
  const kindOf = (id) => (cfg.same.find(l => l.includes(id)) ?? [id])[0];
  const kinds = new Set(GROUPS.filter(g => (g.frequency ?? 1) > 0).map(g => kindOf(g.id))).size;
  const need = Math.ceil(cfg.restShare * (kinds - 1));
  let emotions = 0, sets = 0, fewest = Infinity;
  for (const seed of [1, 2, 3]) {
    const state = createGameState(shapes, powerups, { rng: makeRng(seed * 31), groups: GROUPS });
    state.level6Recent = [];
    const served = [];
    let starts = 0;
    on(state, (t) => { const l6 = state.pieceSel.level6; if (t === "spawn" && (l6.starts ?? 0) !== starts) { starts = l6.starts; served.push(kindOf(l6.lastGroup)); } });
    startRun(state, "god");
    for (let i = 0; i < 320 && !state.gameOver; i++) {
      hardDropAndLock(state);
      for (let k = 0; k < 400 && (state.effect || state.hold); k++) updateGame(state, 16);
      const R = state.board.length; state.board = state.board.map((r, y) => (y < R - 3 ? r.fill(null) : r)); // (low, so sets keep coming)
    }
    served.forEach((k, i) => { const j = served.indexOf(k, i + 1); if (j > 0) fewest = Math.min(fewest, j - i - 1); });
    sets += served.length; emotions += served.filter(k => k === "emotions").length;
  }
  console.log(`${sets} sets, ${emotions} emotions charts; fewest between two of a kind ${fewest} (of ${kinds} kinds)`);
  assert.ok(sets >= 40, `${sets} sets`);
  assert.ok(fewest >= need, `two of a kind with only ${fewest} others between them`);
  assert.ok(emotions / sets < 0.1, `emotions ${emotions} of ${sets}`);
});

test("the Tower of Babel stands up in every version: each section sits on the one below with nothing hanging over a gap", () => {
  const g = GROUPS.find(g => g.id === "tower_of_babel");
  const byId = new Map(shapes.map(s => [s.id, s]));
  for (const seq of sequencesOf(g)) {
    for (let k = 1; k < seq.length; k++) {
      const lo = byId.get(seq[k - 1]).rotations[0], hi = byId.get(seq[k]).rotations[0];
      // (centred one on the other, as they're built)
      const off = Math.floor((lo[0].length - hi[0].length) / 2);
      const top = lo[0], bottom = hi[hi.length - 1];
      const over = bottom.map((c, x) => c && !top[x + off] ? x : -1).filter(x => x >= 0);
      assert.deepEqual(over, [], `${seq[k]} on ${seq[k - 1]}: hanging over a gap at ${over}`);
    }
  }
});

test("the bad omens: two or three signs first, then the great and terrible things; and half the time a silly ending, the same things by sillier names", () => {
  const g = normaliseGroups(GROUPS, [...shapes, ...powerups]).find(g => g.id === "great_and_terrible");
  const signs = new Set(["an_omen", "a_bad_sign", "omen_of_great_things", "prophecy_of_great_things", "a_red_sky_in_the_morning", "an_eclipse", "a_howling_dog", "a_broken_clock"]);
  const silly = new Set(["a_no_good_very_very_bad_thing", "a_thing_whos_been_a_very_bad_boy", "bad_thing_very_bad_thing", "a_thing_that_knows_what_it_did", "a_thing_that_should_be_ashamed_of_itself"]);
  const rng = makeRng(3);
  let sillyEnds = 0, newSigns = 0;
  for (let i = 0; i < 300; i++) {
    const ids = expandGroup(g, rng).map(s => s.id);
    const first = ids.findIndex(id => /^great_and_terrible_things/.test(id));
    assert.ok(first >= 2 && ids.slice(0, first).every(id => signs.has(id)), ids.join());
    if (ids.slice(0, first).some(id => ["a_red_sky_in_the_morning", "an_eclipse", "a_howling_dog", "a_broken_clock"].includes(id))) newSigns++;
    const tail = ids.filter(id => silly.has(id));
    if (tail.length) { sillyEnds++; assert.deepEqual(ids.slice(-tail.length), tail, `the silly ones at the end: ${ids.join()}`); }
  }
  assert.ok(sillyEnds > 300 * 0.4 && sillyEnds < 300 * 0.6, `a silly ending in ${sillyEnds} of 300`);
  assert.ok(newSigns > 100, `the new signs in ${newSigns} of 300`);
  // (the same art and the same effect as the serious ones)
  const byId = new Map(powerups.map(p => [p.id, p]));
  for (const [s, from] of [["a_no_good_very_very_bad_thing", "a_terrible_thing"], ["a_thing_whos_been_a_very_bad_boy", "a_horrible_thing"], ["bad_thing_very_bad_thing", "a_great_terrible_thing"], ["a_thing_that_knows_what_it_did", "an_unspeakably_terrible_thing"]]) {
    const a = SHAPES.find(x => x.id === s), b = SHAPES.find(x => x.id === from);
    assert.deepEqual(a.color, b.color, `${s}: ${from}'s art`);
    assert.deepEqual(byId.get(s).powerup.areaRotations[0].cells, byId.get(from).powerup.areaRotations[0].cells, `${s}: ${from}'s effect`);
  }
});

test("spam, beans and Spaghetti-Os bring their own powerups now and then (and the giant spaghetti-o), and never need them", () => {
  const all = normaliseGroups(GROUPS, [...shapes, ...powerups]);
  const own = { spam: ["exploding_spam", "very_heavy_spam"], beans: ["nuclear_beans", "tonne_of_beans"], spaghetti_os: ["radioactive_spaghetti_os", "settled_spaghetti_os"] };
  for (const [id, pus] of Object.entries(own)) {
    const g = all.find(g => g.id === id);
    // (so Extreme, with no powerups, still has them: groupPlayable)
    assert.deepEqual(g.powerupClasses, [], `${id} needs no powerup class`);
    const rng = makeRng(8);
    let with1 = 0, giant = 0;
    for (let i = 0; i < 200; i++) {
      const ids = expandGroup(g, rng).map(s => s.id);
      if (ids.some(x => pus.includes(x))) with1++;
      if (ids.includes("giant_spaghetti_o")) giant++;
    }
    assert.ok(with1 > 200 * 0.8, `${id}: its own powerups in ${with1} of 200 runs`);
    if (id === "spaghetti_os") assert.ok(giant > 20, `the giant spaghetti-o in ${giant} of 200`);
  }
  // ...and in Extreme they're left out, the rest of the run as it was
  const state = createGameState(shapes, powerups, { rng: makeRng(2), groups: GROUPS });
  startRun(state, "extreme");
  const spam = state.groups.find(g => g.id === "spam");
  assert.ok(groupPlayable(state, spam), "spam in Extreme");
});
