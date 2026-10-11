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
import { selectPiece } from "../src/selection.js";
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
    // the first level 6 set soon after the start (CONFIG.godMode.level6.firstAfter)
    const firstSet = served.findIndex(s => s.difficulty === 6);
    assert.ok(firstSet >= 0 && firstSet <= CONFIG.godMode.level6.firstAfter[1] + 2, `first set at piece ${firstSet}`);
    assert.ok(served.slice(0, 40).some(s => s.powerup?.type === "combo"), "a combo in the first 40 pieces");
  }
});

test("god mode: more giants and more powerups, and the wide gravitizers above all", () => {
  const count = (mode) => {
    let giants = 0, pus = 0, wide = 0, n = 0;
    for (const seed of [1, 2, 3]) {
      for (const s of play(mode, seed * 101, 150).served) {
        n++;
        if (s.powerup) { pus++; if (gravityColumns(s) >= CONFIG.godMode.wideGravity.minCols) wide++; }
        else if (s.difficulty === 4 || s.difficulty === 5) giants++;
      }
    }
    return { giants: giants / n, pus: pus / n, wide: wide / Math.max(1, pus) };
  };
  const god = count("god"), normal = count("normal");
  assert.ok(god.giants > normal.giants * 1.5, `giants ${god.giants.toFixed(3)} vs ${normal.giants.toFixed(3)}`);
  assert.ok(god.pus > normal.pus, `powerups ${god.pus.toFixed(3)} vs ${normal.pus.toFixed(3)}`);
  assert.ok(god.wide > normal.wide * 2, `wide gravitizers ${god.wide.toFixed(3)} vs ${normal.wide.toFixed(3)}`);
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
      const s = selectPiece(state);
      if (l6.group) {
        started.add(l6.group);
        assert.ok(roomNeeded([s, ...l6.queue]) <= room, `${l6.group} started with ${room} rows of room`);
      }
    }
    // (and the sets that do fit still come)
    const fit = groups.filter(g => roomNeeded(expandGroup(g, makeRng(5))) <= room - 1).map(g => g.id);
    for (const id of fit) assert.ok(started.has(id), `${id} never came on a ${rows}-row stack (${[...started]})`);
  }
});
