// Run with:  node --test tests/*.test.mjs
// God mode, the back-to-back links of the newer pieces, and the level 6 room check.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { GROUPS } from "../shapes/groups.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, hardDropAndLock, on, updateGame } from "../src/game.js";
import { selectPiece, destroyerCells } from "../src/selection.js";
import { normaliseGroups, expandGroup, level6Open, bestPile, roomNeeded } from "../src/level6.js";
import { gravityColumns } from "../src/godmode.js";

const { shapes, powerups } = loadShapes(SHAPES);
const filler = { paint: "#888888", style: { baseColor: "#888888" }, pid: 1e9 };

// a stack `rows` tall, with one gap per row so nothing clears (and gravity has gaps to fill)
function setStack(state, rows) {
  const R = state.board.length, C = state.board[0].length;
  state.board = Array.from({ length: R }, (_, y) => Array.from({ length: C }, (_, x) => (y >= R - rows && x !== (y % C) ? { ...filler } : null)));
  state.instances.clear();
}

function drop(state) {
  hardDropAndLock(state);
  for (let k = 0; k < 400 && state.effect; k++) updateGame(state, 16);
}

// `pieces` pieces of a game, the stack reset to `rows` rows before each one
function play(mode, seed, pieces, rows = 3) {
  const state = createGameState(shapes, powerups, { rng: makeRng(seed), groups: GROUPS });
  const served = [], intros = [];
  on(state, (t, d) => { if (t === "spawn") { served.push(d.shape); if (d.isNew) intros.push(d.shape.id); } });
  startRun(state, mode);
  for (let i = 0; i < pieces && !state.gameOver; i++) { setStack(state, rows); drop(state); }
  return { state, served, intros };
}

test("god mode: everything is open from the first piece, with no intro screens", () => {
  for (const seed of [7, 8, 9]) {
    const { state, served, intros } = play("god", seed, 60);
    assert.ok(level6Open(state), "level 6 open");
    const ps = state.pieceSel.powerup;
    for (const cls of ["destroyer", "gravity", "expander", "phantom", "combo"]) assert.ok(ps.classes.includes(cls), cls);
    assert.deepEqual(intros, [], "no intro screens");
    // the first level 6 set soon after the start (CONFIG.godMode.level6.firstAfter; a few
    // pieces later if giants are in the way: a set never comes straight after one)
    const firstSet = served.findIndex(s => s.difficulty === 6);
    assert.ok(firstSet >= 0 && firstSet <= CONFIG.godMode.level6.firstAfter[1] + 6, `first set at piece ${firstSet}`);
    assert.ok(served.slice(0, 40).some(s => s.powerup?.type === "combo"), "a combo in the first 40 pieces");
  }
});

test("god mode: more big pieces (above all level 6 sets) and more powerups, and the wide gravitizers above all", () => {
  const count = (mode) => {
    let giants = 0, sets = 0, pus = 0, wide = 0, n = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      for (const s of play(mode, seed * 101, 150).served) {
        n++;
        if (s.powerup) { pus++; if (gravityColumns(s) >= CONFIG.godMode.wideGravity.minCols) wide++; }
        else if (s.difficulty === 4 || s.difficulty === 5) giants++;
        else if (s.difficulty === 6) sets++;
      }
    }
    return { giants: giants / n, sets: sets / n, pus: pus / n, wide: wide / Math.max(1, pus) };
  };
  const god = count("god"), normal = count("normal");
  const big = (m) => m.giants + m.sets;
  assert.ok(big(god) > big(normal) * 1.5, `big pieces ${big(god).toFixed(3)} vs ${big(normal).toFixed(3)}`);
  assert.ok(god.sets > god.giants, `level 6 ${god.sets.toFixed(3)}, giants ${god.giants.toFixed(3)}`);
  assert.ok(god.pus > normal.pus, `powerups ${god.pus.toFixed(3)} vs ${normal.pus.toFixed(3)}`);
  // (a good deal more of them, though not so many that they're all there is: about 1.75×)
  assert.ok(god.wide > normal.wide * 1.4, `wide gravitizers ${god.wide.toFixed(3)} vs ${normal.wide.toFixed(3)}`);
});

// what selectPiece serves straight after `prev` (recent = the pieces before it, oldest first)
function after(prev, recent = [], n = 300, mode = "normal") {
  const state = createGameState(shapes, powerups, { rng: makeRng(11), groups: GROUPS });
  startRun(state, mode);
  const out = new Map();
  for (let i = 0; i < n; i++) {
    setStack(state, 1);
    const sel = state.pieceSel;
    sel.hadGiant = true; sel.lastWasHard = false; sel.cooldown.hard = 0;
    sel.lastShapeId = prev; sel.recentShapeIds = [...recent, prev];
    const s = selectPiece(state);
    out.set(s.id, (out.get(s.id) ?? 0) + 1);
  }
  return out;
}

test("links: a pound of feathers and a pound of steel tend to follow each other, but not round and round", () => {
  assert.ok((after("steel").get("feathers_container") ?? 0) > 90, "feathers after steel");
  assert.ok((after("feathers_container").get("steel") ?? 0) > 90, "steel after feathers");
  assert.equal(after("steel", ["feathers_container"]).get("feathers_container") ?? 0, 0, "not straight back to the feathers");
});

test("links: little Ben sometimes after Big Ben, the macrochip sometimes after a microchip, and never otherwise", () => {
  assert.ok((after("big_ben").get("little_ben") ?? 0) > 40, "little Ben after Big Ben");
  assert.ok((after("microchip").get("macrochip") ?? 0) > 50, "the macrochip after a microchip");
  for (const mode of ["normal", "god"]) for (const seed of [1, 2, 3]) {
    const { served } = play(mode, seed * 13, 250);
    served.forEach((s, i) => {
      if (s.id === "macrochip") assert.equal(served[i - 1]?.id, "microchip", `${mode}: a macrochip after ${served[i - 1]?.id}`);
      if (s.id === "little_ben") assert.equal(served[i - 1]?.id, "big_ben", `${mode}: little Ben after ${served[i - 1]?.id}`);
    });
  }
});

test("level 6: every set fits the board; the moon stands beside the earth", () => {
  const groups = normaliseGroups(GROUPS, shapes);
  const most = CONFIG.board.rows - (CONFIG.assist.level6.headroom ?? 3);
  for (const g of groups) {
    const need = roomNeeded(expandGroup(g, makeRng(5)));
    assert.ok(need <= most, `${g.id} needs ${need} rows`);
  }
  const space = groups.find(g => g.id === "space");
  assert.ok(bestPile(expandGroup(space, makeRng(1))) <= 15, "the space set piles up 15 rows at most");
});

test("level 6: a set only starts if it has room", () => {
  const groups = normaliseGroups(GROUPS, shapes);
  for (const rows of [4, 8, 10]) {
    const room = CONFIG.board.rows - (CONFIG.assist.level6.headroom ?? 3) - rows;
    const state = createGameState(shapes, powerups, { rng: makeRng(rows), groups: GROUPS });
    state.devLevel6 = "on";
    startRun(state, "normal");
    setStack(state, rows);
    const started = new Set();
    for (let i = 0; i < 400; i++) {
      const sel = state.pieceSel, l6 = sel.level6;
      l6.queue = []; l6.group = null; l6.lastEnd = -1000; sel.lastWasHard = false;
      const n0 = l6.starts ?? 0;
      const s = selectPiece(state);
      if ((l6.starts ?? 0) > n0) {
        started.add(l6.lastGroup);
        const g = groups.find(g => g.id === l6.lastGroup);
        assert.ok((g.room || roomNeeded([s, ...l6.queue])) <= room, `${l6.lastGroup} started with ${room} rows of room`);
      }
    }
    // (and the sets that do fit still come)
    const fit = groups.filter(g => (g.room || roomNeeded(expandGroup(g, makeRng(5)))) <= room - 1).map(g => g.id);
    for (const id of fit) assert.ok(started.has(id), `${id} never came on a ${rows}-row stack (${[...started]})`);
  }
});

test("after a level 6 set: a big destroyer comes soon", () => {
  const big = CONFIG.assist.powerups.afterSet.bigDestroyer.minCells;
  let sets = 0, soon = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const state = createGameState(shapes, powerups, { rng: makeRng(seed * 19), groups: GROUPS });
    const served = [];
    on(state, (t, d) => { if (t === "spawn") served.push(d.shape); });
    startRun(state, "god");
    for (let i = 0; i < 200 && !state.gameOver; i++) { setStack(state, 3); drop(state); }
    for (let i = 1; i + 4 < served.length; i++) {
      if (served[i - 1].difficulty !== 6 || served[i].difficulty === 6) continue;
      sets++;
      if (served.slice(i, i + 4).some(s => !s.powerup?.bad && destroyerCells(s) >= big)) soon++;
    }
  }
  assert.ok(sets >= 6, `${sets} sets`);
  assert.ok(soon / sets >= 0.6, `a big destroyer within 4 pieces after ${soon} of ${sets} sets`);
});

test("god mode: the newest things come first, and things never seen before come up more", () => {
  const newest = new Set(CONFIG.godMode.newest.pieces), newSets = new Set(CONFIG.godMode.newest.sets);
  const share = (seenEver, seenSetsEver) => {
    let fresh = 0, n = 0, firstNew = 0, games = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const state = createGameState(shapes, powerups, { rng: makeRng(seed * 7), groups: GROUPS });
      state.seenEver = seenEver; state.seenSetsEver = seenSetsEver;
      const served = [];
      on(state, (t, d) => { if (t === "spawn") served.push(d.shape); });
      startRun(state, "god");
      for (let i = 0; i < 40 && !state.gameOver; i++) { setStack(state, 3); drop(state); }
      const regular = served.filter(s => !s.powerup && s.difficulty !== 6);
      fresh += regular.filter(s => newest.has(s.id)).length; n += regular.length;
      games++; if (newSets.has(state.pieceSel.level6.lastGroup ? [...state.pieceSel.level6.seen.keys()][0] : "")) firstNew++;
    }
    return { fresh: fresh / n, firstNew: firstNew / games };
  };
  // never seen anything: the newest pieces turn up far more often than once they've all been
  // seen plenty, and the first set is usually a new one
  const blank = share(new Map(), new Map());
  const all = new Map(shapes.map(s => [s.id, 9])), allSets = new Map(GROUPS.map(g => [g.id, 9]));
  const seen = share(all, allSets);
  console.log(`newest: ${(blank.fresh * 100).toFixed(0)}% of pieces when new, ${(seen.fresh * 100).toFixed(0)}% once seen; first set new in ${(blank.firstNew * 100).toFixed(0)}% / ${(seen.firstNew * 100).toFixed(0)}%`);
  // (by a clear margin: the newest list keeps growing, and some of it comes in linked runs anyway)
  assert.ok(blank.fresh - seen.fresh >= 0.08, `newest ${(blank.fresh * 100).toFixed(0)}% vs ${(seen.fresh * 100).toFixed(0)}%`);
  assert.ok(blank.firstNew >= 0.5, `the first set was a new one in ${(blank.firstNew * 100).toFixed(0)}% of games`);
});
