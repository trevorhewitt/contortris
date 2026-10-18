// Run with:  node --test tests/*.test.mjs
// The tutorial: a page at a time, each with a board set up for it and a piece or two that an
// autopilot plays; the player can take over at any moment; it goes round again, and can't be lost.
import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../config.js";
import { SHAPES } from "../shapes/main_shapes.js";
import { loadShapes } from "../src/shapes.js";
import { makeRng } from "../src/util.js";
import { createGameState, startRun, updateGame, on, isPowerupEnabled } from "../src/game.js";
import { PAGES, tutorialPages, tutorialText, tutorialGoTo, tutorialTakeOver } from "../src/tutorial.js";

const { shapes, powerups } = loadShapes(SHAPES);
const { rows, cols } = CONFIG.board;

function tutorial(seed = 1) {
  const state = createGameState(shapes, powerups, { rng: makeRng(seed) });
  const log = { rows: 0, fired: 0, over: 0, locks: 0 };
  on(state, (t, d) => {
    if (t === "rowsDestroyed") log.rows += d.count;
    if (t === "powerupFire" && d.affected > 0) log.fired++;
    if (t === "gameOver") log.over++;
    if (t === "lock") log.locks++;
  });
  startRun(state, "tutorial");
  return { state, log, t: state.tutorial };
}
const run = (state, ms, until = () => false) => {
  for (let t = 0; t < ms && !until(); t += 16) updateGame(state, 16);
};
const occupied = (state) => state.board.map(r => r.map(c => (c ? "#" : ".")).join("")).join("\n");

// Everything a page puts in front of the player, as text: its words (either way), its title and
// the line under it, and what the Shiny Pieces' page says about each class.
const words = (p) => [tutorialText(p, "touch"), tutorialText(p, "keys")].flatMap(w => [w.title, w.say, w.more])
  .concat((p.classes ?? []).map(c => c.say)).filter(Boolean).join(" ");

test("tutorial: every page is set up right, and each powerup class that's on has one", () => {
  const all = new Map([...shapes, ...powerups].map(s => [s.id, s]));
  for (const p of PAGES) {
    assert.ok(tutorialText(p, "touch").say && tutorialText(p, "keys").say, `${p.id}: something to say`);
    // (they're Shiny Pieces to the player, never "powerups")
    assert.doesNotMatch(words(p), /power ?ups?/i, `${p.id}: "Shiny Pieces", not "powerups"`);
    assert.ok((p.board ?? []).length < rows - 6, `${p.id}: room above its board`);
    for (const line of p.board ?? []) assert.equal(line.length, cols, `${p.id}: "${line}" is ${cols} wide`);
    for (const q of p.pieces ?? []) {
      const s = all.get(q.id);
      assert.ok(s, `${p.id}: ${q.id} is a real piece`);
      if (p.cls) assert.equal(s.powerup?.cls ?? s.powerup?.type, p.cls, `${p.id}: ${q.id} is one of its class`);
    }
  }
  // (no row of a page's board starts out full: it would just go at the first lock)
  for (const p of PAGES) for (const line of p.board ?? []) assert.ok(line.includes("."), `${p.id}: "${line}" has a gap`);
  const { t } = tutorial();
  const on = new Set(powerups.filter(p => isPowerupEnabled(p) && (p.frequency ?? 1) > 0 && !p.powerup.setOnly).map(p => p.powerup.cls));
  const pages = t.pages.map(p => p.id);
  for (const cls of ["destroyer", "gravity", "expander", "combo"]) {
    if (on.has(cls)) assert.ok(pages.includes(cls), `a page for ${cls}`);
  }
  assert.deepEqual(pages.slice(0, 4), ["move", "turn", "down", "rows"], "the basics first");
  // then the Shiny Pieces: their three classes side by side, each with a piece of its own that
  // can turn up, and then a page for each class
  assert.equal(pages[4], "shiny", "the classes, before any class's page");
  const shiny = t.pages[4];
  assert.ok(shiny.still && !shiny.pieces, "nothing falls on it");
  assert.deepEqual(shiny.classes.map(c => c.cls).sort(), ["destroyer", "expander", "gravity"].filter(c => on.has(c)).sort());
  for (const c of shiny.classes) assert.equal(all.get(c.id)?.powerup?.cls, c.cls, `${c.id} is a ${c.cls}`);
  assert.ok(pages.indexOf("destroyer") > 4, "and then each class's page");
  // after the classes, where to put them and the shelf, how it goes on, and then a page for each
  // mode there is to play, each with a title, in the order they're on the home screen
  const modes = [["classic", "normal"], ["godmode", "god"], ["zen", "zen"], ["turbo", "turbo"], ["extreme", "extreme"]]
    .filter(([, m]) => CONFIG.modes[m] && !CONFIG.modes[m].hidden);
  assert.ok(modes.length >= 4, "the modes are there");
  assert.deepEqual(pages.slice(-(modes.length + 3)), ["plan", "shelf", "giants", ...modes.map(([id]) => id)]);
  for (const [id, m] of modes) {
    const p = t.pages.find(q => q.id === id);
    assert.equal(p.mode, m, `${id}: plays ${m}`);
    assert.ok(p.title && p.free, `${id}: a title, and a board playing the way the mode does`);
  }
  // (with a keyboard, only the arrows: the bar says WASD works too)
  for (const p of PAGES) assert.doesNotMatch(tutorialText(p, "keys").say, /\[[WASD]\]/, `${p.id}: arrows only`);
  assert.match(tutorialText(PAGES.find(p => p.id === "down"), "keys").say, /double press/);
  assert.doesNotMatch(tutorialText(PAGES.find(p => p.id === "rows"), "keys").say, /the more at once/);
});

test("tutorial: the Shiny Pieces' page just stays as it is", () => {
  const { state, log, t } = tutorial(7);
  tutorialGoTo(state, t.pages.findIndex(p => p.id === "shiny"));
  updateGame(state, 16);
  const start = occupied(state), resets = t.resets;
  run(state, 20000);
  assert.equal(state.active, null, "nothing falls");
  assert.equal(log.locks, 0);
  assert.equal(t.resets, resets, "and it isn't set up again");
  assert.equal(occupied(state), start);
});

test("tutorial: left to itself, each page does what it shows, and goes round again", () => {
  const { state, log, t } = tutorial(2);
  let shelved = 0;
  on(state, (type) => { if (type === "shelf") shelved++; });
  const blocks = () => state.board.flat().filter(Boolean).length;
  for (let i = 0; i < t.pages.length; i++) {
    const page = t.pages[i];
    if (page.free || page.still) continue;
    tutorialGoTo(state, i);
    updateGame(state, 16);
    const start = occupied(state), resets = t.resets, before = { ...log, shelved }, full = blocks();
    let presses = 0, seq = t.seq, least = full;
    run(state, 90000, () => {
      if (t.seq !== seq) { presses++; seq = t.seq; }
      if (t.resets === resets && !state.active && !state.effect) least = Math.min(least, blocks());
      return t.resets !== resets;
    });
    assert.equal(t.resets, resets + 1, `${page.id}: it went round again`);
    assert.equal(t.page, i, `${page.id}: on the same page`);
    assert.equal(occupied(state), start, `${page.id}: its board set up again as it was`);
    assert.ok(presses >= 1, `${page.id}: the autopilot pressed something (${presses})`);
    // (all its pieces came down; on the shelf's page the first goes, and the shelf's comes instead;
    // a powerup page carries on with more of its class)
    if (page.again) assert.ok(log.locks - before.locks >= page.pieces.length + 1, `${page.id}: more of its class came (${log.locks - before.locks})`);
    else assert.equal(log.locks - before.locks, page.pieces.length, `${page.id}: all its pieces came down`);
    // what it shows: rows going (and for a powerup, the powerup doing something)
    if (page.cls || page.powers) assert.ok(log.fired > before.fired, `${page.id}: the powerup did something`);
    else assert.ok(log.rows > before.rows, `${page.id}: rows went`);
    // (a powerup page: until the board is nearly gone)
    if (page.again) assert.ok(least <= 12, `${page.id}: the board nearly gone (${least} of ${full} left)`);
    if (page.id === "plan") assert.ok(log.rows - before.rows >= 4 && least <= 12, `${page.id}: the two together take the rows away (${least} left)`);
    if (page.shelf) assert.equal(shelved - before.shelved, 1, `${page.id}: it used the shelf`);
  }
  assert.equal(log.over, 0, "never game over");
  assert.equal(state.gameOver, false);
});

test("tutorial: the player takes over, and left alone the autopilot carries on", () => {
  const { state, t } = tutorial(3);
  run(state, 1200);
  assert.ok(t.seq > 0, "the autopilot is pressing");
  tutorialTakeOver(state);
  const seq = t.seq, a = state.active;
  assert.equal(t.hint.aim, null, "the hint goes");
  run(state, CONFIG.tutorial.idleMs - 200);
  assert.equal(t.seq, seq, "it leaves the piece alone");
  assert.equal(state.dropMs, CONFIG.tutorial.playerDropMs, "at the player's pace");
  run(state, 400 + CONFIG.tutorial.firstMs + CONFIG.tutorial.stepMs * 2);
  assert.equal(t.player, false, "left alone, the autopilot has it again");
  assert.ok(t.seq > seq || state.active !== a, "and carries on");
  // a new page: the autopilot shows it
  tutorialTakeOver(state);
  tutorialGoTo(state, 2);
  updateGame(state, 16);
  assert.equal(t.page, 2);
  assert.equal(t.player, false);
  // the player does what the page shows (the straight banana, down into its well): a cheer, and
  // they have another go
  let cheers = t.cheer, resets = t.resets, ms = 0;
  run(state, 30000, () => { if (ms % 2000 === 0) tutorialTakeOver(state); ms += 16; return t.resets !== resets; });
  assert.equal(t.cheer, cheers + 1, "a cheer");
  assert.equal(t.player, true, "and it's still theirs");
  // ...but not for one the autopilot took back and finished
  cheers = t.cheer; resets = t.resets;
  run(state, 30000, () => t.resets !== resets);
  assert.equal(t.cheer, cheers, "no cheer for the autopilot's");
});

test("tutorial: it can't be lost: a board that fills up starts the page again", () => {
  const { state, log, t } = tutorial(4);
  const last = t.pages.length - 1;
  tutorialGoTo(state, last);
  updateGame(state, 16);
  const start = occupied(state), resets = t.resets;
  // the player takes over and leaves every piece to fall where it comes, nearly to the top
  for (let y = 4; y < rows; y++) for (let x = 0; x < cols; x++) if ((x + y) % cols !== 0) state.board[y][x] = { paint: "#888", style: {}, pid: 1e9 };
  tutorialTakeOver(state);
  for (let k = 0; k < 2000 && t.resets === resets; k++) { tutorialTakeOver(state); updateGame(state, 50); }
  assert.ok(t.resets > resets, "the page started again");
  assert.equal(occupied(state), start, "on its own board");
  assert.equal(log.over, 0, "not game over");
  assert.equal(state.gameOver, false);
  assert.ok(state.running, "still going");
});

test("tutorial: the modes' pages play on, one piece after another, each the way its mode does", () => {
  const { state, log, t } = tutorial(5);
  let fired = 0;
  on(state, (type) => { if (type === "powerupFire") fired++; });
  const seen = {};
  for (let i = 0; i < t.pages.length; i++) {
    const page = t.pages[i];
    if (!page.mode) continue;
    tutorialGoTo(state, i);
    updateGame(state, 16);
    const resets = t.resets, before = { ...log, fired };
    let high = 0;
    run(state, 90000, () => { const y = state.board.findIndex(r => r.some(Boolean)); if (y >= 0) high = Math.max(high, rows - y); });
    const got = { locks: log.locks - before.locks, rows: log.rows - before.rows, shiny: fired - before.fired, high };
    seen[page.id] = got;
    assert.ok(got.locks >= 12, `${page.id}: ${got.locks} pieces`);
    assert.ok(got.rows >= 2, `${page.id}: ${got.rows} rows`);
    assert.equal(t.resets, resets, `${page.id}: it never needed starting again`);
    assert.ok(high <= 20, `${page.id}: never near the top (${high} rows)`);
    if (page.free.shiny) assert.ok(got.shiny >= 1, `${page.id}: Shiny Pieces turn up (${got.shiny})`);
    else assert.equal(got.shiny, 0, `${page.id}: no Shiny Pieces`);
  }
  // (Classic and Zen gently, kept low; Turbo zen far quicker than Zen; God mode Shiny Pieces all
  // the time)
  assert.ok(seen.classic.high <= 13 && seen.zen.high <= 10, JSON.stringify(seen));
  assert.ok(seen.turbo.locks >= seen.zen.locks * 3, `turbo ${seen.turbo.locks}, zen ${seen.zen.locks}`);
  assert.ok(seen.godmode.shiny > seen.classic.shiny, `god ${seen.godmode.shiny}, classic ${seen.classic.shiny}`);
  assert.equal(log.over, 0, "never game over");
});

test("tutorial: a powerup class that's switched off has no page", () => {
  const off = CONFIG.assist.powerups.disabledTypes;
  CONFIG.assist.powerups.disabledTypes = [...off, "gravity"];
  try {
    const state = createGameState(shapes, powerups, { rng: makeRng(6) });
    const pages = tutorialPages(state).map(p => p.id);
    assert.ok(!pages.includes("gravity"), "no gravitizer page");
    assert.ok(pages.includes("destroyer") && pages.includes("expander"), pages.join(", "));
  } finally {
    CONFIG.assist.powerups.disabledTypes = off;
  }
});
