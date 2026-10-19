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
// (past Classic's first few rows, before which no big pieces come: src/selection.js bigsWait)
const pastFirstRows = (state) => { state.rowsDestroyed = Math.max(state.rowsDestroyed, CONFIG.modes[state.mode]?.bigAfterRows ?? 0); };

function play(mode, seed, pieces, rows = 3) {
  const state = createGameState(shapes, powerups, { rng: makeRng(seed), groups: GROUPS });
  const served = [], intros = [];
  on(state, (t, d) => { if (t === "spawn") { served.push(d.shape); if (d.isNew) intros.push(d.shape.id); } });
  startRun(state, mode);
  pastFirstRows(state);
  for (let i = 0; i < pieces && !state.gameOver; i++) { setStack(state, rows); drop(state); }
  return { state, served, intros };
}

test("god mode: everything is open from the first piece, with no intro screens", () => {
  for (const seed of [7, 8, 9]) {
    const { state, served, intros } = play("god", seed, 60);
    assert.ok(level6Open(state), "level 6 open");
    const ps = state.pieceSel.powerup;
    // (every class that's switched on: CONFIG.assist.powerups.disabledTypes)
    const off = CONFIG.assist.powerups.disabledTypes ?? [];
    for (const cls of ["destroyer", "gravity", "expander", "phantom", "combo"]) assert.equal(ps.classes.includes(cls), !off.includes(cls), cls);
    assert.deepEqual(intros, [], "no intro screens");
    // the first level 6 set soon after the start (CONFIG.godMode.level6.firstAfter; a few
    // pieces later if giants are in the way: a set never comes straight after one)
    const firstSet = served.findIndex(s => s.difficulty === 6);
    assert.ok(firstSet >= 0 && firstSet <= CONFIG.godMode.level6.firstAfter[1] + 6, `first set at piece ${firstSet}`);
    assert.ok(served.slice(0, 40).some(s => s.powerup?.type === "combo"), "a combo in the first 40 pieces");
  }
});

test("god mode: more big pieces (above all level 6 sets) and more powerups, and the wide gravitizers above all", () => {
  // (the pieces it picks, one after another, for the same 3-row stack: what it picks, not how
  // they'd play, so a good many of them, quickly)
  const count = (mode) => {
    let giants = 0, sets = 0, pus = 0, wide = 0, n = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const state = createGameState(shapes, powerups, { rng: makeRng(seed * 101), groups: GROUPS });
      startRun(state, mode);
      pastFirstRows(state);
      setStack(state, 3);
      for (let i = 0; i < 300; i++) {
        const s = selectPiece(state);
        n++;
        if (s.powerup?.setOnly) continue; // (part of its set's story, not the powerups' mix)
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
  // (a good deal more of them, though not so many that they're all there is: about twice as many)
  assert.ok(god.wide > normal.wide * 1.4, `wide gravitizers ${god.wide.toFixed(3)} vs ${normal.wide.toFixed(3)}`);
});

// what selectPiece serves straight after `prev` (recent = the pieces before it, oldest first)
function after(prev, recent = [], n = 300, mode = "normal") {
  const state = createGameState(shapes, powerups, { rng: makeRng(11), groups: GROUPS });
  startRun(state, mode);
  pastFirstRows(state);
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
  // (just the room: not how much lower the stack has to be as it gets harder, CONFIG.difficulty.hard)
  const hard = CONFIG.difficulty.hard, was = hard.setMaxStackRows;
  hard.setMaxStackRows = null;
  try { for (const rows of [4, 8, 10]) {
    const room = CONFIG.board.rows - (CONFIG.assist.level6.headroom ?? 3) - rows;
    const state = createGameState(shapes, powerups, { rng: makeRng(rows), groups: GROUPS });
    state.devLevel6 = "on";
    startRun(state, "normal");
    pastFirstRows(state);
    // (every class of powerup met: a set with powerups in it can come)
    for (const c of ["destroyer", "gravity", "expander", "combo"]) state.pieceSel.powerup.shownClasses.add(c);
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
    // (and the sets that do fit still come: one of its versions, for a set with versions,
    // CONFIG.assist.level6.same)
    const kindOf = new Map();
    for (const list of CONFIG.assist.level6.same ?? []) for (const id of list) kindOf.set(id, list[0]);
    const kind = (id) => kindOf.get(id) ?? id, came = new Set([...started].map(kind));
    const fit = groups.filter(g => (g.room || roomNeeded(expandGroup(g, makeRng(5)))) <= room - 1).map(g => g.id);
    for (const id of fit) assert.ok(came.has(kind(id)), `${id} never came on a ${rows}-row stack (${[...started]})`);
  } } finally { hard.setMaxStackRows = was; }
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

test("developer mode: the newest things come first, once each since the page was loaded, then as usual (and God mode is as it comes)", () => {
  // (the very latest, the last batch's, are the newest of all)
  const d = CONFIG.devMode, newest = new Set([...d.newest.pieces, ...(d.latest?.pieces ?? [])]), newSets = new Set([...d.newest.sets, ...(d.latest?.sets ?? [])]);
  const share = ({ seenEver = new Map(), seenSetsEver = new Map(), shown = new Map(), setsShown = new Map(), mode = "dev", games: count = 12 }) => {
    let fresh = 0, n = 0, firstNew = 0, games = 0;
    // (a dozen games each: a share of a hundred pieces or so is at the mercy of a few)
    for (let seed = 1; seed <= count; seed++) {
      const state = createGameState(shapes, powerups, { rng: makeRng(seed * 7), groups: GROUPS });
      state.seenEver = seenEver; state.seenSetsEver = seenSetsEver;
      state.shownThisLoad = shown; state.setsShownThisLoad = setsShown;
      const served = [];
      on(state, (t, d) => { if (t === "spawn") served.push(d.shape); });
      startRun(state, mode);
      for (let i = 0; i < 40 && !state.gameOver; i++) { setStack(state, 3); drop(state); }
      const regular = served.filter(s => !s.powerup && s.difficulty !== 6);
      fresh += regular.filter(s => newest.has(s.id)).length; n += regular.length;
      games++; if (newSets.has(state.pieceSel.level6.lastGroup ? [...state.pieceSel.level6.seen.keys()][0] : "")) firstNew++;
    }
    return { fresh: fresh / n, firstNew: firstNew / games };
  };
  const all = new Map(shapes.map(s => [s.id, 9])), allSets = new Map(GROUPS.map(g => [g.id, 9]));
  const once = new Map(shapes.map(s => [s.id, 1])), setsOnce = new Map(GROUPS.map(g => [g.id, 1]));
  // a fresh page: the newest first, even if this browser has seen them all plenty before...
  const blank = share({});
  const reload = share({ seenEver: all, seenSetsEver: allSets });
  // ...and once each has turned up since the page was loaded, as usual
  // (these two three dozen games each: they're compared with each other, and a dozen games' share
  // swings by 10 points or so either way)
  const after = share({ seenEver: all, seenSetsEver: allSets, shown: once, setsShown: setsOnce, games: 36 });
  // ...and God mode, on a fresh page: as it comes
  const god = share({ seenEver: all, seenSetsEver: allSets, mode: "god", games: 36 });
  console.log(`newest: ${(blank.fresh * 100).toFixed(0)}% of pieces on a new browser, ${(reload.fresh * 100).toFixed(0)}% after a reload, ${(after.fresh * 100).toFixed(0)}% once shown (God mode ${(god.fresh * 100).toFixed(0)}%); first set new in ${(blank.firstNew * 100).toFixed(0)}% / ${(reload.firstNew * 100).toFixed(0)}% / ${(after.firstNew * 100).toFixed(0)}%`);
  // (by a clear margin: the newest list keeps growing, and some of it comes in linked runs anyway)
  for (const [k, r] of Object.entries({ blank, reload })) {
    assert.ok(r.fresh - after.fresh >= 0.15, `${k}: newest ${(r.fresh * 100).toFixed(0)}% vs ${(after.fresh * 100).toFixed(0)}%`);
    assert.ok(r.fresh - god.fresh >= 0.15, `${k}: newest ${(r.fresh * 100).toFixed(0)}% vs God mode's ${(god.fresh * 100).toFixed(0)}%`);
    assert.ok(r.firstNew >= 0.5, `${k}: the first set was a new one in ${(r.firstNew * 100).toFixed(0)}% of games`);
  }
  assert.ok(Math.abs(god.fresh - after.fresh) < 0.1, `God mode ${(god.fresh * 100).toFixed(0)}% of the newest, as it comes ${(after.fresh * 100).toFixed(0)}%`);
});

test("god mode: after a set, and after a few giants close together, a calm spell of ordinary pieces", () => {
  const [lo] = CONFIG.godMode.calm.afterSet;
  // which sets each piece can be part of
  const sets = new Map();
  for (const g of normaliseGroups(GROUPS, [...shapes, ...powerups])) {
    const all = g.steps.flatMap(st => [...(st.shapes ?? []), ...(st.variant ?? []), ...(st.chain ? [...st.chain.start, ...Object.values(st.chain.after).flat()].map(it => it.s).filter(Boolean) : [])]);
    for (const sh of [...all, ...(g.echoes?.values() ?? [])]) {
      if (!sets.has(sh.id)) sets.set(sh.id, new Set());
      sets.get(sh.id).add(g.id);
    }
  }
  let ends = 0;
  for (const seed of [1, 2, 3, 4]) {
    const { served } = play("god", seed * 7, 220);
    for (let i = 0; i < served.length; i++) {
      if (served[i].difficulty !== 6) continue;
      // the whole run of this set's pieces, one after another (a set can have small pieces in it:
      // Noah's raindrops)
      const gs = sets.get(served[i].id), ofSet = (k) => [...(sets.get(served[k].id) ?? [])].some(g => gs.has(g));
      let j = i;
      for (let k = i + 1; k < served.length && k <= j + 1; k++) if (ofSet(k)) j = k;
      const after = served.slice(j + 1, j + lo); // (one short, in case an ordinary raindrop ran on)
      i = j;
      if (after.length < lo - 1) continue;
      ends++;
      const big = after.filter(s => !s.powerup && (s.difficulty ?? 1) >= 4);
      assert.equal(big.length, 0, `seed ${seed}: ${big.map(s => s.id)} straight after ${served[j].id}`);
    }
  }
  assert.ok(ends >= 4, `${ends} sets`);
});

test("developer mode can open with a particular set (the emotions chart's ascent into the pseudo-spiritual, say)", () => {
  const was = CONFIG.devMode.firstSet;
  CONFIG.devMode.firstSet = ["emotions_ascent", "emotions_british"];
  try {
    for (const mode of ["dev", "god"]) {
      const state = createGameState(shapes, powerups, { rng: makeRng(3), groups: GROUPS });
      const sets = [];
      on(state, (t, d) => { if (t === "spawn" && state.pieceSel.level6.group && sets.at(-1) !== state.pieceSel.level6.group) sets.push(state.pieceSel.level6.group); });
      startRun(state, mode);
      for (let i = 0; i < 80 && sets.length < 2 && !state.gameOver; i++) {
        hardDropAndLock(state);
        for (let k = 0; k < 120 && (state.effect || state.hold); k++) updateGame(state, 16);
        state.board = state.board.map(r => r.fill(null));
      }
      // (the first of them never seen in this browser: here, nothing has been; God mode, as it comes)
      if (mode === "dev") assert.equal(sets[0], CONFIG.devMode.firstSet[0], `the first set: ${sets.join(", ")}`);
      else assert.ok(sets.length, "God mode has its sets too");
    }
  } finally { CONFIG.devMode.firstSet = was; }
  const ascent = normaliseGroups(GROUPS, [...shapes, ...powerups]).find(g => g.id === "emotions_ascent");
  const rng = makeRng(7);
  for (let i = 0; i < 50; i++) {
    const ids = expandGroup(ascent, rng).map(s => s.id);
    assert.ok(["emotion_heat_death", "emotion_void_looking_back", "emotion_solving_some_things"].includes(ids.at(-1)), ids.join());
    assert.ok(ids.some(id => id === "emotion_mother_earth" || id === "emotion_enlightenment"), ids.join());
  }
});

test("developer mode can bring particular pieces soon after its opening set, the first time since the page was loaded", () => {
  const d = CONFIG.devMode, was = d.firstPieces, newest = d.newest.pieces, latest = d.latest.pieces, first = d.firstSet;
  d.firstPieces = ["portrait_of_a_potato"];
  d.firstSet = ["emotions_ascent"];
  d.newest.pieces = d.latest.pieces = []; // (the newest things come first too: not what this is about)
  try {
    const state = createGameState(shapes, powerups, { rng: makeRng(4), groups: GROUPS });
    state.seenEver = new Map(); state.shownThisLoad = new Map(); // (as the UI keeps them)
    const served = [];
    on(state, (t, d) => { if (t === "spawn") served.push({ id: d.shape.id, set: !!state.pieceSel.level6.group, ordinary: !d.shape.powerup && (d.shape.difficulty ?? 1) < 4 }); });
    startRun(state, "dev");
    for (let i = 0; i < 120 && !served.some(s => s.id === d.firstPieces[0]) && !state.gameOver; i++) {
      hardDropAndLock(state);
      for (let k = 0; k < 120 && (state.effect || state.hold); k++) updateGame(state, 16);
      state.board = state.board.map(r => r.fill(null));
    }
    const at = served.findIndex(s => s.id === d.firstPieces[0]);
    const setEnds = served.findIndex((s, i) => i > 0 && served[i - 1].set && !s.set);
    assert.ok(at >= 0, `never came: ${served.map(s => s.id).slice(0, 40).join(" ")}`);
    // (soon after: the powerups and giants God mode serves meanwhile can come first, so among the
    // ordinary pieces)
    const nth = served.slice(setEnds, at + 1).filter(s => s.ordinary && !s.set).length;
    assert.ok(setEnds >= 0 && at >= setEnds - 1 && nth <= 5, `ordinary piece ${nth} after the opening set (at piece ${at}, the set over at ${setEnds})`);
  } finally { d.firstPieces = was; d.newest.pieces = newest; d.latest.pieces = latest; d.firstSet = first; }
});

test("developer mode: left alone it never ends nor speeds up, and with the stack high a black hole or the like comes", () => {
  const minCells = CONFIG.devMode.rescue.minCells;
  for (const seed of [1, 2, 3]) {
    const state = createGameState(shapes, powerups, { rng: makeRng(seed * 13), groups: GROUPS });
    const served = [];
    let dissolved = 0;
    on(state, (t, d) => { if (t === "spawn") served.push(d.shape); if (t === "zenRescue") dissolved++; });
    startRun(state, "dev");
    const dropMs = state.dropMs;
    // (nobody steering: every piece straight down where it comes in)
    for (let i = 0; i < 250 && !state.gameOver; i++) {
      hardDropAndLock(state);
      for (let k = 0; k < 400 && (state.effect || state.hold); k++) updateGame(state, 16);
    }
    const big = served.filter(s => s.powerup && !s.powerup.setOnly && destroyerCells(s) >= minCells).length;
    console.log(`seed ${seed}: ${served.length} pieces, ${big} big destroyers, dissolved ${dissolved} times`);
    assert.ok(!state.gameOver, `seed ${seed}: game over after ${served.length} pieces`);
    assert.equal(state.dropMs, dropMs, "the same pace all the way");
    assert.equal(state.pieceSel.endGame.times, 0, "no end game");
    assert.ok(big >= 5, `seed ${seed}: ${big} big destroyers`);
    assert.ok(dissolved <= 3, `seed ${seed}: the board dissolved ${dissolved} times (the black holes should do it)`);
  }
});
