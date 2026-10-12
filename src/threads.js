// ============================================================
// THREADS — loose themes the pieces share, so they come in drifting sequences (no DOM)
// ============================================================
// shapes/threads.js names the themes and the pieces (and powerups, and level 6 sets) on each.
// The colour and shape threads ("everything red", "long things") are worked out from the art.
//
// Often (CONFIG.assist.threads.follow) the next piece follows a thread from the last piece or
// the one before: a piece on that thread is far likelier. The thread drifts: it tends to stay
// the same a while, then wanders off along another of the latest piece's threads, so a run goes
// a cloud, a raindrop, an umbrella for a fish, a whale, a lighthouse, a tall thing, a taller
// thing... And just as often the next piece is anything at all.

import { CONFIG } from "../config.js";

// Index the threads: { members: thread -> Set(ids), of: id -> [threads], sets: set id -> [threads] }.
export function buildThreads(shapes, data = {}, setData = {}) {
  const members = new Map(), of = new Map();
  const add = (name, id) => {
    if (!members.has(name)) members.set(name, new Set());
    members.get(name).add(id);
    if (!of.has(id)) of.set(id, []);
    if (!of.get(id).includes(name)) of.get(id).push(name);
  };
  const known = new Set(shapes.map(s => s.id));
  for (const [name, ids] of Object.entries(data ?? {})) for (const id of ids) if (known.has(id)) add(name, id);
  // the formal threads, from the art itself: its colour, and for some, its shape
  for (const s of shapes) {
    const c = colourFamily(s);
    if (c) add(`colour:${c}`, s.id);
    const f = shapeFamily(s);
    if (f) add(`shape:${f}`, s.id);
  }
  return { members, of, sets: new Map(Object.entries(setData ?? {})) };
}

// The thread this pick might follow, or null (a moment of plain randomness).
export function pickThread(state) {
  const T = CONFIG.assist.threads, th = state.threads, sel = state.pieceSel;
  if (!T?.enabled || !th || !sel) return null;
  const rng = state.rng, recent = sel.recentShapeIds;
  if (!recent.length || rng() >= T.follow) { sel.thread = null; return null; }
  // mostly from the last piece, sometimes from the one before
  const from = recent.length > 1 && rng() < T.lookBack ? recent[recent.length - 2] : recent[recent.length - 1];
  const names = th.of.get(from);
  if (!names?.length) { sel.thread = null; return null; }
  let name;
  if (sel.thread && names.includes(sel.thread) && rng() < T.stay) name = sel.thread; // stay on it a while
  else {
    // or wander off along another (the themes more often than the colours and shapes)
    let total = 0;
    const w = names.map(n => (total += n.includes(":") ? T.formalChance : 1));
    const r = rng() * total;
    name = names[w.findIndex(c => r < c)] ?? names[0];
  }
  sel.thread = name;
  return { name, members: th.members.get(name), formal: name.includes(":") };
}

// How much likelier `shape` is, given the thread being followed. A very big thread, like
// "blue things", pulls less hard on each of its pieces (a run along it would hardly show), and
// a thread pulls less on pieces it has already brought this game (`served`), so it finds new ones.
export function threadWeight(thread, shape, served = 0) {
  if (!thread?.members?.has(shape.id)) return 1;
  const T = CONFIG.assist.threads;
  // (a powerup's weight is mostly how much it would help, so the thread pulls it harder)
  const w = thread.formal ? T.formalWeight : shape.powerup ? (T.powerupWeight ?? T.weight) : T.weight;
  return 1 + (w - 1) * Math.min(1, (T.bigThread ?? 40) / thread.members.size) / (1 + (T.fatigue ?? 0) * served);
}

// ...and a level 6 set, if the thread being followed is one of its own.
export function setThreadWeight(state, thread, group) {
  if (!thread) return 1;
  return state.threads?.sets.get(group.id)?.includes(thread.name) ? CONFIG.assist.threads.setWeight : 1;
}

/* --- the formal threads --- */

function hsl(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function family([h, s, l]) {
  if (l < 0.16) return "black";
  if (s < 0.16) return l > 0.72 ? "white" : "grey";
  if (l > 0.86) return "white";
  if (h >= 15 && h < 45 && l < 0.42) return "brown";
  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 68) return "yellow";
  if (h < 165) return "green";
  if (h < 255) return "blue";
  if (h < 295) return "purple";
  return "pink";
}

// The colour a piece mostly is (or "many" for a riot of colour, or null).
export function colourFamily(shape) {
  const count = new Map();
  let total = 0;
  const addColour = (c) => {
    if (typeof c !== "string" || c[0] !== "#" || c.length < 7) return;
    const f = family(hsl(c));
    count.set(f, (count.get(f) ?? 0) + 1);
    total++;
  };
  for (const row of shape.cellPaints?.[0] ?? []) for (const p of row) {
    if (!p) continue;
    if (typeof p === "string") { for (let i = 0; i < 16; i++) addColour(p); continue; }
    for (const pr of p.pixels ?? []) for (const c of pr) addColour(c);
  }
  if (!total) return null;
  const [top, n] = [...count].sort((a, b) => b[1] - a[1])[0];
  if (n / total >= 0.42) return top;
  return count.size >= 5 && n / total < 0.3 ? "many" : null;
}

// Its shape, if it's a shape worth rhyming with: tiny, long, scattered or huge.
export function shapeFamily(shape) {
  const m = shape.rotations?.[0];
  if (!m) return null;
  const h = m.length, w = m[0].length, n = m.flat().filter(Boolean).length;
  if (n === 1) return "tiny";
  const lo = Math.min(h, w), hi = Math.max(h, w);
  if ((lo === 1 && hi >= 5) || (lo === 2 && hi >= 7 && n / (h * w) > 0.6)) return "long";
  if (n >= 4 && n / (h * w) < 0.4) return "scattered";
  if (n >= 26) return "huge";
  return null;
}
