// Run with:  node --test tests/*.test.mjs
// Game core + achievements, headless (no DOM).
import test from "node:test";
import assert from "node:assert/strict";

import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { ACHIEVEMENTS } from "../shapes/achievements.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import {
  createGameState, startRun, updateGame, hardDropAndLock, setNextPiece, on, insidePairs, tryMove, tryRotate,
} from "../src/game.js";
import { computeBoardPresence, varietyMultiplier, powerupUsefulness } from "../src/selection.js";
import { createAchievements } from "../src/achievements.js";

const { shapes, powerups } = loadShapes(SHAPES);
const byId = (id) => [...shapes, ...powerups].find(s => s.id === id);
const COLS = CONFIG.board.cols, ROWS = CONFIG.board.rows;

function memoryStorage(initial = null) {
  let data = initial;
  return { load: () => (data ? JSON.parse(JSON.stringify(data)) : null), save: (d) => { data = JSON.parse(JSON.stringify(d)); }, peek: () => data };
}

function newGame(mode = "normal", seed = 1) {
  const state = createGameState(shapes, powerups, { rng: makeRng(seed) });
  const events = [];
  on(state, (type, d) => events.push({ type, d }));
  startRun(state, mode);
  return { state, events };
}

// Put `shape` (rotation rotIdx) in as the active piece at (x, y).
function placeActive(state, id, x, y, rotIdx = 0) {
  state.active = { shape: byId(id), rotIdx, x, y };
}

function settle(state, ms = 3000) {
  for (let t = 0; t < ms; t += 16) updateGame(state, 16);
}

function filler(pid = 999999) {
  return { paint: "#808080", style: { baseColor: "#808080" }, pid };
}

test("every block in main_shapes.js loads (regular + powerups)", () => {
  assert.ok(shapes.length > 50);
  assert.ok(powerups.length >= 8);
  for (const s of [...shapes, ...powerups]) {
    assert.ok(s.rotations.length >= 1, s.id);
    assert.equal(s.cellPaints.length, s.rotations.length, s.id);
  }
  const rawRot = Object.fromEntries(SHAPES.map(s => [s.id, s.rotation?.mode]));
  for (const p of powerups) if (rawRot[p.id] !== "any") assert.equal(p.rotations.length, 1, `${p.id} should not rotate`);
});

test("Extreme mode never serves powerups; Normal does", () => {
  const ext = newGame("extreme", 7);
  for (let i = 0; i < 400 && !ext.state.gameOver; i++) {
    hardDropAndLock(ext.state);
    ext.state.board = ext.state.board.map(r => r.fill(null)); // keep it alive
    settle(ext.state, 50);
  }
  assert.ok(!ext.events.some(e => e.type === "spawn" && e.d.shape.powerup), "no powerups in extreme");

  const nor = newGame("normal", 7);
  let saw = false;
  for (let i = 0; i < 400 && !saw; i++) {
    hardDropAndLock(nor.state);
    nor.state.board = nor.state.board.map(r => r.fill(null));
    settle(nor.state, 1200);
    saw = nor.events.some(e => e.type === "spawn" && e.d.shape.powerup);
  }
  assert.ok(saw, "normal mode serves powerups");
});

test("line clears shift piece instances and emit rowsDestroyed", () => {
  const { state, events } = newGame("normal");
  // bottom row full except column 0; a "lentil" (1x1) drops into column 0
  for (let x = 1; x < COLS; x++) state.board[ROWS - 1][x] = filler();
  // a piece sitting above the full row should drop by one when it clears
  placeActive(state, "lentil", 5, ROWS - 3);
  hardDropAndLock(state); // lands on the filler row at y = ROWS - 2
  const above = [...state.instances.values()].find(i => i.shape.id === "lentil");
  assert.equal(above.y, ROWS - 2);

  placeActive(state, "lentil", 0, 0);
  hardDropAndLock(state);
  assert.ok(events.some(e => e.type === "rowsDestroyed" && e.d.count === 1 && e.d.source === "clear"));
  assert.equal(state.rowsDestroyed, 1);
  assert.equal(above.y, ROWS - 1, "instance moved down with the collapse");
  assert.equal(above.intact, true);
});

test("zones: food dropped into the mouth is detected (and unlocks Om Nom Nom)", () => {
  const storage = memoryStorage();
  const unlocked = [];
  const ach = createAchievements(ACHIEVEMENTS, { storage, onUnlock: (d) => unlocked.push(d.id) });
  const state = createGameState(shapes, powerups, { rng: makeRng(3) });
  on(state, (t, d, st) => ach.handle(t, d, st));
  startRun(state, "normal");

  // "another mouth to feed" = ["XXX","X..","XXX"], rotated 3 times it opens upward:
  // rotation 3 of a 3x3 C opening right -> U opening up
  const mouth = byId("another");
  const rot = mouth.rotations.findIndex(m => !m[0][1] && m[2].every(Boolean));
  assert.ok(rot >= 0, "found an upward-opening rotation");
  placeActive(state, "another", 4, 0, rot);
  hardDropAndLock(state);
  settle(state, 100);
  const m = [...state.instances.values()].find(i => i.shape.id === "another");
  assert.ok(m && m.intact);

  // drop a pea into the gap: the gap is the middle column of the U
  placeActive(state, "pea", m.x + 1, 0);
  hardDropAndLock(state);
  assert.ok(unlocked.includes("food_mouth"), `unlocked: ${unlocked}`);
  assert.ok(unlocked.includes("pea_mouth"));
});

test("insidePairs works in both orders (container placed last)", () => {
  const { state } = newGame("normal");
  const mouth = byId("another");
  // the mouth opening DOWNWARDS (∩): it can come down over something already on the floor
  const rot = mouth.rotations.findIndex(m => m[0].every(Boolean) && !m[1][1] && !m[2][1]);
  assert.ok(rot >= 0, "found a downward-opening rotation");
  // pea first, on the floor at x=5; then the mouth comes down around it (legs at x=4 and x=6)
  placeActive(state, "pea", 5, 0);
  hardDropAndLock(state);
  const peaPid = [...state.instances.entries()].find(([, i]) => i.shape.id === "pea")[0];
  placeActive(state, "another", 4, 0, rot);
  hardDropAndLock(state);
  const mouthPid = [...state.instances.entries()].find(([, i]) => i.shape.id === "another")[0];
  const pairs = insidePairs(state, mouthPid);
  assert.ok(pairs.some(p => p.inner.id === "pea" && p.container.id === "another"), JSON.stringify(pairs.map(p => [p.inner.id, p.container.id])));
  assert.ok(peaPid);
});

test("variety: a shape on the board is less likely to be picked again", () => {
  const { state } = newGame("normal");
  placeActive(state, "lentil", 0, 0);
  hardDropAndLock(state);
  const presence = computeBoardPresence(state);
  assert.ok(Math.abs((presence.get("lentil") ?? 0) - 1) < 1e-9);
  state.pieceSel.presence = presence;
  state.pieceSel.recentShapeIds = [];
  const m = varietyMultiplier(state.pieceSel, byId("lentil"));
  assert.ok(m < 1 && m >= CONFIG.assist.variety.onBoard.minMultiplier, `multiplier ${m}`);
  assert.equal(varietyMultiplier(state.pieceSel, byId("pea")), 1);
});

test("a destroyer powerup fires through the real game loop", () => {
  const { state, events } = newGame("normal");
  for (let y = ROWS - 4; y < ROWS; y++) for (let x = 0; x < COLS - 1; x++) state.board[y][x] = filler();
  placeActive(state, "small_black_hole", 6, 0);
  hardDropAndLock(state);
  assert.ok(state.effect, "effect running");
  settle(state, 1500);
  assert.equal(state.effect, null);
  const fire = events.find(e => e.type === "powerupFire");
  assert.ok(fire && fire.d.affected > 0, "destroyed something");
  assert.ok(state.blocksDestroyed >= fire.d.affected);
  assert.ok(state.active, "next piece spawned");
  assert.ok(![...state.instances.values()].some(i => i.shape.id === "small_black_hole"), "consumed");
});

test("gravity powerup keeps a piece that slides as one block intact", () => {
  const { state } = newGame("normal");
  // a 1x1 lentil floating at the top of column 7 with a gap below; sand lands next to it
  state.board[ROWS - 1][7] = filler();
  placeActive(state, "lentil", 7, 0);
  // freeze the lentil mid-air by placing a support, then removing it
  state.board[10][7] = filler(123456);
  hardDropAndLock(state);
  state.board[10][7] = null;
  const inst = [...state.instances.values()].find(i => i.shape.id === "lentil");
  const y0 = inst.y;
  placeActive(state, "infectious_sand", 8, 0); // its area covers columns 7..9
  hardDropAndLock(state);
  settle(state, 2000);
  assert.ok(inst.y > y0, "lentil fell");
  assert.equal(inst.intact, true);
});

test("achievements: sequences, multi-row, lifetime rows persist, mode filter", () => {
  const storage = memoryStorage();
  const got = [];
  const ach = createAchievements(ACHIEVEMENTS, { storage, onUnlock: (d) => got.push(d.id) });
  const spam = byId("spam");
  ach.handle("start", { mode: "extreme" }, null);
  ach.handle("spawn", { shape: spam });
  assert.ok(got.includes("spam"));
  ach.handle("spawn", { shape: spam });
  assert.ok(!got.includes("spam_3"));
  ach.handle("spawn", { shape: spam });
  assert.ok(got.includes("spam_3"));

  ach.handle("rowsDestroyed", { count: 4, source: "clear" });
  assert.ok(got.includes("multi_4") && got.includes("multi_2") && got.includes("rows_1"));
  assert.ok(!got.includes("multi_5"));

  // powerup achievements are Normal-only
  ach.handle("powerupFire", { shape: byId("katana"), type: "destroyer", affected: 30 });
  assert.ok(!got.includes("katana") && !got.includes("overkill"));

  // lifetime rows survive a reload
  const ach2 = createAchievements(ACHIEVEMENTS, { storage, onUnlock: (d) => got.push(d.id) });
  assert.equal(ach2.stats.rowsDestroyed, 4);
  assert.ok(ach2.isUnlocked("spam"));
  ach2.handle("start", { mode: "normal" }, null);
  ach2.handle("powerupFire", { shape: byId("katana"), type: "destroyer", affected: 30 });
  assert.ok(got.includes("katana") && got.includes("overkill") && got.includes("powerup_1"));
});

test("achievements: game over triggers", () => {
  const got = [];
  const ach = createAchievements(ACHIEVEMENTS, { storage: memoryStorage(), onUnlock: (d) => got.push(d.id) });
  ach.handle("start", { mode: "normal" }, null);
  ach.handle("gameOver", { killer: byId("david"), drops: 40 });
  assert.ok(got.includes("death_by_art"));
  assert.ok(!got.includes("quick_death"));
  ach.handle("start", { mode: "normal" }, null);
  ach.handle("gameOver", { killer: byId("pea"), drops: 9 });
  assert.ok(got.includes("quick_death"));
});

test("every achievement trigger in the data file is a known type", () => {
  const KNOWN = ["together", "blocksDestroyed", "rowWith", "rowsDestroyed", "multiRow", "pieceServed", "pieceSequence", "pieceInside", "seenAll",
    "powerupUsed", "powerupBlocks", "score", "level", "drops", "boardCleared", "gameOver", "level6", "endGameEscaped",
    "keptAlive", "killed", "killedQuickly", "aliveAtEnd"];
  const ids = new Set();
  for (const a of ACHIEVEMENTS) {
    assert.ok(KNOWN.includes(a.trigger.type), `${a.id}: ${a.trigger.type}`);
    assert.ok(!ids.has(a.id), `duplicate id ${a.id}`);
    ids.add(a.id);
  }
});

test("movement and rotation respect walls", () => {
  const { state } = newGame("normal");
  placeActive(state, "lentil", 0, 5);
  assert.equal(tryMove(state, -1, 0), false);
  assert.equal(tryMove(state, 1, 0), true);
  placeActive(state, "katana", 3, 5);
  const before = state.active.shape.powerup.areaRotations[0];
  assert.equal(tryRotate(state), true, "every powerup turns");
  // ...but its effect doesn't: still its own rows (its own and the two under it)
  const after = state.active.shape.powerup.areaRotations[state.active.rotIdx];
  assert.equal(after.rows.length, 3);
  assert.equal(after.cols.length, 0);
  assert.equal(before.rows.length, 3);
  setNextPiece(state, byId("pea"));
  assert.equal(state.next.id, "pea");
});

test("achievements: together (groups and count)", () => {
  const got = [];
  const ach = createAchievements(ACHIEVEMENTS, { storage: memoryStorage(), onUnlock: (d) => got.push(d.id) });
  ach.handle("start", { mode: "normal" }, null);
  ach.handle("lock", { drops: 1, onBoard: () => [byId("david")] });
  assert.ok(!got.includes("art_gallery"));
  ach.handle("lock", { drops: 2, onBoard: () => [byId("david"), byId("lisa")] });
  assert.ok(got.includes("art_gallery"));
  ach.handle("lock", { drops: 3, onBoard: () => [byId("eyeball"), byId("seeyou1"), byId("eyeball")] });
  assert.ok(!got.includes("being_watched"), "needs 3 different eyes");
  ach.handle("lock", { drops: 4, onBoard: () => [byId("eyeball"), byId("seeyou1"), byId("seeyou3")] });
  assert.ok(got.includes("being_watched"));
});

test("only big pieces shake the board: not two kangaroos, nor anything marked noShake", async () => {
  const { shakesOnLanding } = await import("../src/game.js");
  const { shapes } = loadShapes(SHAPES);
  const get = (id) => shapes.find(s => s.id === id);
  for (const id of ["two_kangaroos", "two_penguins", "iceberg_tip", "nagging_doubt", "emotion_happiness", "crisps_mostly_air", "very_long_cat"]) assert.equal(shakesOnLanding(get(id)), false, id);
  for (const id of ["everest", "pyramid", "iceberg_rest", "earth", "moai", "boulder"]) assert.equal(shakesOnLanding(get(id)), true, id);
  assert.equal(shakesOnLanding(get("bees")), false, "bees are noShake");
  // nothing small shakes, unless it's marked `shake` (a small boulder)
  for (const s of shapes) if (!s.shake && s.rotations[0].flat().filter(Boolean).length < CONFIG.fx.largePieceLock.minBlocks) assert.equal(shakesOnLanding(s), false, s.id);
  // and the thud of a big one is plain to see (the board moves maxOffsetPx × trauma²)
  const { state } = newGame("normal");
  placeActive(state, "moai", 4, 0);
  hardDropAndLock(state);
  assert.ok(CONFIG.fx.quake.maxOffsetPx * state.fx.quake.trauma ** 2 >= 3, `trauma ${state.fx.quake.trauma}`);
});

test("a powerup that vanishes when it fires still clears the rows it completed", () => {
  for (const id of ["infectious_sand", "small_black_hole"]) {
    const { state } = newGame("normal");
    const p = byId(id), mat = p.rotations[0], H = mat.length, x0 = 4;
    assert.ok(p.powerup.consume, `${id} vanishes`);
    // the bottom row is full except under the piece's bottom row; it lands and fills the gaps
    for (let x = 0; x < COLS; x++) if (!mat[H - 1][x - x0]) state.board[ROWS - 1][x] = filler();
    placeActive(state, id, x0, 0);
    hardDropAndLock(state);
    settle(state, 2500);
    assert.equal(state.lines, 1, `${id}: the row cleared`);
    assert.ok(state.board.every(row => row.every(c => !c)), `${id}: nothing left behind`);
  }
});

test("a piece about to top out gets a last chance: it can still be moved out of trouble", () => {
  const setup = () => {
    const { state, events } = newGame("extreme", 3);
    // every column full to the top, but for a deep, empty well at the right
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS - 2; x++) state.board[y][x] = filler();
    placeActive(state, "pea", 3, -1); // (one block, sitting on top of the stack)
    return { state, events };
  };
  // left alone: a moment's grace (it flashes red), then game over
  {
    const { state, events } = setup();
    const landed = CONFIG.timing.baseDropMs + CONFIG.timing.lockDelayMsKeyboard + 300; // (it lands, then the lock delay)
    settle(state, landed);
    assert.equal(state.gameOver, false, "not yet");
    assert.ok(state.active?.lastChance, "on its last chance");
    assert.ok(events.some(e => e.type === "lastChance"));
    settle(state, CONFIG.timing.lastChanceMs + 400);
    assert.equal(state.gameOver, true, "then it's over");
  }
  // moved across to the well in time: saved
  {
    const { state } = setup();
    settle(state, CONFIG.timing.baseDropMs + CONFIG.timing.lockDelayMsKeyboard + 300);
    assert.ok(state.active?.lastChance);
    while (tryMove(state, 1, 0)) { /* over to the well */ }
    settle(state, 3000);
    assert.equal(state.gameOver, false, "saved");
  }
});

test("a piece slid along the ground waits a little longer, so it can be slid again (up to a point)", () => {
  const fresh = () => {
    const { state } = newGame("extreme", 5);
    placeActive(state, "square", 2, ROWS - 2); // (resting on the floor)
    for (let t = 0; t < 2000 && !state.locking; t += 16) updateGame(state, 16); // (until it starts to lock)
    assert.ok(state.locking);
    return state;
  };
  // left alone, it locks at the usual pace
  {
    const state = fresh(), piece = state.active;
    settle(state, CONFIG.timing.lockDelayMsKeyboard + 50);
    assert.notEqual(state.active, piece, "locked");
  }
  // slid every 400ms, it's still sliding; let go, and it locks
  {
    const state = fresh(), piece = state.active;
    for (let i = 0; i < 4; i++) { assert.ok(tryMove(state, 1, 0)); settle(state, 400); assert.equal(state.active, piece, `still there after slide ${i + 1}`); }
    settle(state, CONFIG.timing.slideLockMs + 50);
    assert.notEqual(state.active, piece, "then it locks");
  }
  // but not for ever
  {
    const state = fresh(), piece = state.active;
    let dir = 1;
    for (let t = 0; t < CONFIG.timing.slideMaxMs + 1500 && state.active === piece; t += 300) { if (!tryMove(state, dir, 0)) { dir = -dir; tryMove(state, dir, 0); } settle(state, 300); }
    assert.notEqual(state.active, piece, "it locks in the end");
  }
});

test("a giant or a set's piece that couldn't go anywhere without ending the game waits", () => {
  const { state, events } = newGame("normal", 6);
  // the board full nearly to the top, but for a narrow gap
  for (let y = 3; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (x !== y % COLS) state.board[y][x] = filler();
  placeActive(state, "pea", 0, -1); // (it lands on top, in the board)
  state.pieceSel.level6.queue = [byId("everest_trash")];
  setNextPiece(state, byId("everest")); // (a level 6 piece, far too big for what's left)
  hardDropAndLock(state);
  assert.equal(state.gameOver, false);
  assert.ok(state.active, "something came");
  assert.notEqual(state.active.shape.id, "everest", "not the mountain");
  assert.ok(state.active.shape.powerup, "something to make room");
  assert.ok(events.some(e => e.type === "deferred"));
  assert.equal(state.next.id, "everest", "it comes after that");
  assert.equal(state.pieceSel.level6.queue[0].id, "everest_trash", "and then the rest of its set");
});

test("a piece's card says how rare it is, in words", async () => {
  const { rarity } = await import("../src/rarity.js");
  const { GROUPS } = await import("../shapes/groups.js");
  const state = createGameState(shapes, powerups, { rng: makeRng(2), groups: GROUPS });
  const words = new Set(CONFIG.rarity.words.map(w => w[1]));
  const seen = new Set();
  for (const s of [...shapes, ...powerups]) {
    if ((s.frequency ?? 1) <= 0 || s.difficulty === 6 || s.powerup?.setOnly) continue;
    const r = rarity(state, s);
    assert.ok(words.has(r.words), `${s.id}: ${r.words}`);
    seen.add(r.words);
  }
  assert.equal(seen.size, words.size, `all the words get used: ${[...seen]}`);
  assert.deepEqual(rarity(state, byId("everest")), { words: "only ever in a set", set: "Mt Everest" });
  assert.deepEqual(rarity(state, powerups.find(p => p.id === "a_horrible_thing")), { words: "only ever in a set", set: "great and terrible things" }, "a powerup that only comes in its set");
  assert.equal(rarity(state, byId("last_straw")).words, "only ever after something else");
  assert.equal(rarity(state, byId("piece_of_string")).words, "only in zen mode");
});

test("a powerup the piece before it left with nothing to do is swapped for one of the same outline", () => {
  const outline = (m) => m.map(r => r.map(c => (c ? 1 : 0)).join("")).join("/");
  // a tidy board: four full-but-one rows, no gaps for a phantom to sink into
  const tidy = (state) => { for (let y = ROWS - 4; y < ROWS; y++) for (let x = 0; x < COLS - 1; x++) state.board[y][x] = filler(); };
  {
    const { state } = newGame("god", 4);
    tidy(state);
    placeActive(state, "pea", 0, -1);
    state.next = byId("friendly_ghost"); // (as if picked a turn ago, when it had a gap to go into)
    hardDropAndLock(state);
    const a = state.active;
    assert.ok(a.shape.powerup, "still a powerup");
    assert.notEqual(a.shape.id, "friendly_ghost", "swapped");
    assert.equal(outline(a.shape.rotations[a.rotIdx]), "1", "the same outline as the preview");
    assert.ok(powerupUsefulness(state.board, a.shape) >= 1, "and it does something");
  }
  {
    // ...turned to match the preview when its own first turn is the other way up
    const { state } = newGame("god", 4);
    state.powerups = state.powerups.filter(p => ["ghost_eel", "time_machine"].includes(p.id));
    tidy(state);
    placeActive(state, "pea", 0, -1);
    state.next = byId("ghost_eel");
    hardDropAndLock(state);
    assert.equal(state.active.shape.id, "time_machine");
    assert.equal(outline(state.active.shape.rotations[state.active.rotIdx]), "1111");
  }
  {
    // one asked for by name (dev mode, tests) stays as it is
    const { state } = newGame("god", 4);
    tidy(state);
    placeActive(state, "pea", 0, -1);
    setNextPiece(state, byId("friendly_ghost"));
    hardDropAndLock(state);
    assert.equal(state.active.shape.id, "friendly_ghost");
  }
});

test("a run on a board of another size starts on a board that size (turbo zen filling the window, first thing)", () => {
  const state = createGameState(shapes, powerups, { rng: makeRng(2) });
  const usual = { cols: CONFIG.board.cols, rows: CONFIG.board.rows };
  CONFIG.board.cols = 39; CONFIG.board.rows = 27;
  try {
    startRun(state, "turbo");
    assert.equal(state.board.length, 27);
    assert.ok(state.board.every(r => r.length === 39));
    for (let t = 0; t < 20000; t += 37) updateGame(state, 37);
    assert.ok(state.drops > 5, `${state.drops} pieces`);
    assert.ok(state.board.length === 27 && state.board.every(r => r.length === 39), "and stays that size");
  } finally {
    CONFIG.board.cols = usual.cols; CONFIG.board.rows = usual.rows;
  }
});

test("achievements that watch a piece's life: destroyed straight away, kept alive, alive at the end; and its last words", () => {
  const [cute] = loadShapes([{ id: "fragile", name: "a fragile thing", grid: ["XXX", ".X."], difficulty: 1, tags: ["cute"], onDeath: "goodbye" }]).shapes;
  const defs = [
    { id: "quick", name: "q", description: "", trigger: { type: "killedQuickly", match: { tags: ["cute"] }, drops: 2 } },
    { id: "dead", name: "d", description: "", trigger: { type: "killed", match: { tags: ["cute"] } } },
    { id: "alive5", name: "a", description: "", trigger: { type: "keptAlive", match: { tags: ["cute"] }, drops: 5 } },
    { id: "end", name: "e", description: "", trigger: { type: "aliveAtEnd", match: { tags: ["cute"] } } },
  ];
  const play = () => {
    const state = createGameState(shapes, powerups, { rng: makeRng(3) });
    const got = [];
    const ach = createAchievements(defs, { storage: memoryStorage(), onUnlock: (d) => got.push(d.id) });
    on(state, (t, d, st) => ach.handle(t, d, st));
    startRun(state, "extreme");
    return { state, got, ach };
  };
  {
    // it lands where it completes two rows: gone at once, with a word
    const { state, got } = play();
    for (let x = 0; x < COLS; x++) { if (x !== 1) state.board[ROWS - 1][x] = filler(); if (x > 2) state.board[ROWS - 2][x] = filler(); }
    state.active = { shape: cute, rotIdx: 0, x: 0, y: ROWS - 4 };
    hardDropAndLock(state);
    assert.ok(state.fx.callouts.some(c => c.text === "goodbye"), "its last words");
    assert.deepEqual(got.sort(), ["dead", "quick"]);
  }
  {
    // kept alive five pieces on, and still there at the end
    const { state, got, ach } = play();
    state.active = { shape: cute, rotIdx: 0, x: 0, y: ROWS - 4 };
    hardDropAndLock(state);
    for (let i = 0; i < 5; i++) { placeActive(state, "pea", COLS - 1, 0); hardDropAndLock(state); }
    assert.ok(got.includes("alive5"), got.join());
    ach.handle("gameOver", {}, state);
    assert.ok(got.includes("end") && !got.includes("dead"), got.join());
  }
  {
    // locked entirely above the top: it never lived, so it isn't still there at the end
    const { state, got } = play();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) state.board[y][x] = filler();
    state.active = { shape: cute, rotIdx: 0, x: 0, y: -2 };
    hardDropAndLock(state);
    assert.ok(state.gameOver, "it topped out");
    assert.ok(!got.includes("end") && !got.includes("dead"), got.join());
  }
});

test("a piece marked once only ever turns up once a game (a sock with no match)", async () => {
  const { selectPiece } = await import("../src/selection.js");
  const lone = { id: "lone_sock_test", name: "a sock with no match", grid: ["X", "X", "XX"], color: "#aa3344", difficulty: 1, frequency: 50, once: true, rotation: { mode: "any" } };
  const { shapes: S, powerups: P } = loadShapes([...SHAPES, lone]);
  assert.equal(S.find(s => s.id === lone.id).once, true);
  const state = createGameState(S, P, { rng: makeRng(3) });
  startRun(state, "extreme");
  let seen = 0;
  for (let i = 0; i < 400; i++) {
    const s = selectPiece(state);
    if (s.id === lone.id) seen++;
  }
  assert.equal(seen, 1, "once, and only once");
});

test("tiles never come in a game (only turbo zen builds with them)", async () => {
  const { selectPiece } = await import("../src/selection.js");
  const tagged = (s) => s.tags?.some(t => CONFIG.assist.turboOnlyTags.includes(t));
  assert.ok(shapes.some(tagged), "there are tiles");
  for (const mode of ["normal", "extreme", "god"]) {
    const state = createGameState(shapes, powerups, { rng: makeRng(5) });
    startRun(state, mode);
    for (let i = 0; i < 600; i++) {
      const s = selectPiece(state);
      assert.ok(!tagged(s), `${mode}: ${s.id}`);
    }
  }
});
