// ============================================================
// LEVEL 6 — the biggest pieces, served in groups (no DOM)
// ============================================================
// Groups are defined in shapes/groups.js: a whole group arrives in order, one piece straight
// after another, and level 6 pieces never turn up any other way. They are locked at the start
// of each game, and unlock when the player builds the stack up past
// CONFIG.assist.level6.unlockAbove rows and then digs back down to unlockBackTo rows or fewer.
// (Normal and Extreme; CONFIG.modes[mode].level6. In God mode they're open from the start.)
//
// state.devLevel6: "auto" (the rule above), "on" or "off" — the dev mode override.
// state.level6Remembered: true if it ever unlocked in this browser (used if level6.persist).
// state.level6Recent: ids of the last groups served (the UI keeps them across games), so the
// same set doesn't come again straight away, even in the next game.

import { CONFIG } from "../config.js";
import { sampleByWeight } from "./util.js";
import { godConfig } from "./godmode.js";

export const LEVEL6 = 6;

// Groups with their pieces looked up in `shapes` (all of them, not just this mode's). A group
// whose fixed piece is missing or banished (frequency 0) is left out; banished pieces are
// dropped from picks.
export function normaliseGroups(rawGroups, shapes) {
  const byId = new Map(shapes.map(s => [s.id, s]));
  const live = (id) => {
    const s = byId.get(id);
    return s && (s.frequency ?? 1) > 0 ? s : null;
  };
  const out = [];
  for (const g of Array.isArray(rawGroups) ? rawGroups : []) {
    if (!g || !g.id || !Array.isArray(g.sequence)) continue;
    const steps = [];
    let ok = true;
    for (const step of g.sequence) {
      if (typeof step === "string") {
        const s = live(step);
        if (!s) { ok = false; break; }
        steps.push({ shapes: [s], weights: [1], count: [1, 1] });
      } else if (step && Array.isArray(step.pick)) {
        const picks = [], weights = [];
        step.pick.forEach((id, i) => {
          const s = live(id);
          if (s) { picks.push(s); weights.push(Math.max(0, Number(step.weights?.[i] ?? 1) || 0)); }
        });
        if (!picks.length) continue;
        const c = Array.isArray(step.count) ? step.count : [step.count ?? 1, step.count ?? 1];
        const lo = Math.max(0, c[0] | 0);
        const hi = Math.max(lo, c[1] | 0);
        // (unique: each piece at most once, so never more of them than there are pieces)
        const unique = step.unique === true;
        steps.push({ shapes: picks, weights, count: unique ? [Math.min(lo, picks.length), Math.min(hi, picks.length)] : [lo, hi], unique });
      } else if (step && step.chain && typeof step.chain === "object") {
        // a chain: each piece picks the next ({ start: {id: weight}, after: {id: {id: weight,
        // stop: weight}}, max }), so the run reacts to what it has already brought
        const toList = (w) => Object.entries(w ?? {}).map(([id, wt]) => ({ id, s: id === "stop" ? null : live(id), w: Math.max(0, Number(wt) || 0) }))
          .filter(it => it.w > 0 && (it.id === "stop" || it.s));
        const after = {};
        for (const [id, w] of Object.entries(step.chain.after ?? {})) after[id] = toList(w);
        const start = toList(step.chain.start);
        if (!start.length) continue;
        steps.push({ chain: { start, after, max: Math.max(1, Number(step.chain.max) || 4) } });
      }
    }
    if (!ok || !steps.length) continue;
    // a piece with `echo` comes back later in the same run as that piece (déjà vu)
    const echoes = new Map();
    for (const st of steps) for (const sh of [...(st.shapes ?? []), ...(st.chain ? [...st.chain.start, ...Object.values(st.chain.after).flat()].map(it => it.s).filter(Boolean) : [])]) {
      if (sh.echo && live(sh.echo)) echoes.set(sh.id, live(sh.echo));
    }
    out.push({ id: String(g.id), name: String(g.name ?? g.id), frequency: Math.max(0, Number(g.frequency ?? 1) || 0), steps,
      room: Math.max(0, Number(g.room) || 0), echoes });
  }
  return out;
}

// One run through a group: the list of pieces, picks rolled.
export function expandGroup(group, rng) {
  const out = [];
  const pick = (list) => sampleByWeight(list, it => it.w, rng);
  for (const st of group.steps) {
    if (st.chain) {
      // a chain: start somewhere, then each piece picks the next, until "stop" or `max`
      let it = pick(st.chain.start);
      for (let n = 0; it && it.s && n < st.chain.max; n++) {
        out.push(it.s);
        const nexts = st.chain.after[it.s.id];
        it = nexts?.length ? pick(nexts) : null;
      }
      continue;
    }
    const n = st.count[0] + Math.floor(rng() * (st.count[1] - st.count[0] + 1));
    let pool = st.shapes.map((s, k) => ({ s, w: st.weights[k] }));
    for (let i = 0; i < n && pool.length; i++) {
      const it = pool.length === 1 ? pool[0] : sampleByWeight(pool, it => it.w, rng);
      out.push(it.s);
      if (st.unique) pool = pool.filter(x => x !== it);
    }
  }
  // echoes: the first piece that has one comes back once, somewhere later in the run (only
  // one per run)
  // (at least one other piece in between, when there's room for that)
  const i = out.findIndex(s => group.echoes?.has(s.id));
  if (i >= 0) {
    const lo = Math.min(out.length, i + 2);
    out.splice(lo + Math.floor(rng() * (out.length - lo + 1)), 0, group.echoes.get(out[i].id));
  }
  return out;
}

// Per-game bookkeeping (lives in state.pieceSel.level6).
export function initLevel6(state) {
  // God mode (level6: "open"): open from the first piece, and the first group soon after
  const open = CONFIG.modes[state.mode]?.level6 === "open";
  const remembered = open || ((CONFIG.assist.level6?.persist === true) && state.level6Remembered === true);
  const [a, b] = level6Cfg(state).firstAfter ?? [2, 5];
  return {
    unlocked: remembered, // in this game
    unlockedAt: remembered ? 0 : null,
    wasHigh: false,       // the stack has been taller than unlockAbove this game
    firstDueAt: open ? a + Math.floor((state.rng ?? Math.random)() * (b - a + 1)) : null, // the first group arrives at this piece number
    queue: [],            // pieces still to come in the group being served
    group: null,          // id of the group being served
    lastEnd: 0,           // piece number when the last group finished
    seen: new Map(),      // group id -> times served this game
  };
}

// CONFIG.assist.level6, with God mode's numbers on top in God mode
const level6Cfg = (state) => godConfig(state.mode, "level6", CONFIG.assist.level6 ?? {});

export function stackRows(state) {
  const rows = state.board.length;
  for (let y = 0; y < rows; y++) if (state.board[y].some(Boolean)) return rows - y;
  return 0;
}

// Are level 6 groups available right now?
export function level6Open(state) {
  const dev = state.devLevel6 ?? "auto";
  if (dev === "on") return true;
  if (dev === "off") return false;
  return CONFIG.modes[state.mode]?.level6 !== false && !!state.pieceSel?.level6?.unlocked;
}

// Watches the stack for the comeback that unlocks level 6 (call once per piece, with the board
// settled). Returns true at the moment it unlocks.
export function trackLevel6(state) {
  const l6 = state.pieceSel?.level6;
  const cfg = CONFIG.assist.level6 ?? {};
  if (!l6 || l6.unlocked || CONFIG.modes[state.mode]?.level6 === false) return false;
  const rows = stackRows(state);
  if (rows > (cfg.unlockAbove ?? 10)) l6.wasHigh = true;
  if (!l6.wasHigh || rows > (cfg.unlockBackTo ?? 5)) return false;
  l6.unlocked = true;
  l6.unlockedAt = state.pieceSel.dropIndex;
  scheduleFirstGroup(state);
  return true;
}

// The first group of a game comes soon after level 6 opens (CONFIG.assist.level6.firstAfter).
export function scheduleFirstGroup(state) {
  const l6 = state.pieceSel.level6;
  const [a, b] = level6Cfg(state).firstAfter ?? [2, 5];
  l6.firstDueAt = state.pieceSel.dropIndex + a + Math.floor(state.rng() * (b - a + 1));
}

// The next piece of the group being served (null if no group is under way).
export function nextGroupPiece(state) {
  const l6 = state.pieceSel.level6;
  if (!l6.queue.length) return null;
  const shape = l6.queue.shift();
  if (!l6.queue.length) {
    l6.lastEnd = state.pieceSel.dropIndex;
    l6.group = null;
  }
  return shape;
}

export function groupUnderWay(state) {
  return (state.pieceSel?.level6?.queue.length ?? 0) > 0;
}

// Maybe start a group on this piece: returns its first piece, or null.
export function maybeStartGroup(state) {
  if (!state.groups?.length || !level6Open(state)) return null;
  const sel = state.pieceSel, l6 = sel.level6, cfg = level6Cfg(state);
  if (sel.lastWasHard) return null; // never straight after a giant
  if (stackRows(state) > (cfg.maxStackRows ?? 8)) return null;
  const firstDue = l6.firstDueAt != null && !l6.seen.size && sel.dropIndex >= l6.firstDueAt;
  if (!firstDue) {
    if (sel.dropIndex - l6.lastEnd < (cfg.cooldownDrops ?? 30)) return null;
    if (state.rng() >= (cfg.chancePerDrop ?? 0.04)) return null;
  }
  // No set comes round again until every other one has had its turn this game, and the last
  // ones served (this game or the one before) wait if anything else can go.
  const live = state.groups.filter(g => g.frequency > 0);
  const turns = (g) => l6.seen.get(g.id) ?? 0;
  const least = Math.min(...live.map(turns));
  let pool = live.filter(g => turns(g) === least);
  const recent = state.level6Recent ?? [];
  const fresh = pool.filter(g => !recent.includes(g.id));
  if (fresh.length) pool = fresh;
  // ...and only one whose whole run fits on the board (a set can't be cleared until it's down)
  const room = state.board.length - (cfg.headroom ?? 3) - stackRows(state);
  while (pool.length) {
    const group = sampleByWeight(pool, g => g.frequency, state.rng);
    const pieces = expandGroup(group, state.rng);
    if (Math.max(roomNeeded(pieces), group.room) <= room) return startGroup(state, group, pieces);
    pool = pool.filter(g => g !== group);
  }
  return null;
}

// Rows of board a run of pieces needs: their blocks spread over the width, plus some for the
// gaps they leave (CONFIG.assist.level6.roomFactor) — or, if more, the full height of every
// piece wider than half the board (those can't sit side by side, so they stack up) — or, if
// more still, how high they pile up even when placed as well as possible (bestPile).
export function roomNeeded(pieces) {
  const cols = CONFIG.board.cols;
  let blocks = 0, stacked = 0;
  for (const s of pieces) {
    const mat = s.rotations[0];
    const n = mat.flat().filter(Boolean).length;
    blocks += n;
    // (a sparse one, like the asteroid belt, mostly falls into its own gaps)
    const fill = n / (mat.length * mat[0].length);
    if (mat[0].length > cols / 2) stacked += fill >= 0.5 ? mat.length : Math.ceil(mat.length * fill * 2);
  }
  return Math.max(stacked, Math.ceil((blocks / cols) * (CONFIG.assist.level6?.roomFactor ?? 1.25)), bestPile(pieces));
}

// How many rows a run of pieces piles up on an empty board, placed as well as possible: every
// rotation and column, dropped straight down, keeping the lowest few piles after each piece
// (rows that fill up are cleared). Remembered for each run of pieces.
const pileCache = new Map();
export function bestPile(pieces, beamWidth = 12, perLevel = 3) {
  const key = pieces.map(s => s.id).join(">");
  if (pileCache.has(key)) return pileCache.get(key);
  const cols = CONFIG.board.cols, H = 64, FULL = (1 << cols) - 1;
  // a board: rows[y] = bit mask of filled cells (y = 0 at the top), tops[x] = first filled row
  let beam = [{ rows: new Uint32Array(H), tops: new Int16Array(cols).fill(H), score: 0 }];
  for (const s of pieces) {
    const next = [];
    for (const mat of s.rotations) {
      const w = mat[0].length, h = mat.length;
      const low = [], high = [];
      for (let i = 0; i < w; i++) {
        let lo = -1, hi = -1;
        for (let j = 0; j < h; j++) if (mat[j][i]) { if (hi < 0) hi = j; lo = j; }
        low.push(lo); high.push(hi);
      }
      for (const b of beam) for (let x = 0; x + w <= cols; x++) {
        let y = Infinity;
        for (let i = 0; i < w; i++) if (low[i] >= 0) y = Math.min(y, b.tops[x + i] - 1 - low[i]);
        if (y < 0 || !Number.isFinite(y)) continue; // (doesn't fit at all)
        const rows = b.rows.slice();
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (mat[j][i]) rows[y + j] |= 1 << (x + i);
        // clear full rows
        let out = H - 1;
        const kept = new Uint32Array(H);
        for (let r = H - 1; r >= 0; r--) if (rows[r] !== FULL) kept[out--] = rows[r];
        const tops = new Int16Array(cols).fill(H);
        let holes = 0;
        for (let c = 0; c < cols; c++) {
          const bit = 1 << c;
          for (let r = 0; r < H; r++) {
            if (kept[r] & bit) { if (tops[c] === H) tops[c] = r; }
            else if (tops[c] < H) holes++;
          }
        }
        const height = H - Math.min(...tops);
        next.push({ rows: kept, tops, score: height * 1000 + holes });
      }
    }
    if (!next.length) { pileCache.set(key, H); return H; }
    // keep the lowest piles, but only a few of each height (so a taller pile that leaves room
    // for what comes next, like the moon standing up, isn't crowded out), and no duplicates
    next.sort((a, c) => a.score - c.score);
    const seen = new Set(), perHeight = new Map();
    beam = [];
    for (const st of next) {
      const sky = st.tops.join(",");
      if (seen.has(sky)) continue;
      seen.add(sky);
      const h = Math.floor(st.score / 1000), n = perHeight.get(h) ?? 0;
      if (n >= perLevel) continue;
      perHeight.set(h, n + 1);
      beam.push(st);
      if (beam.length >= beamWidth) break;
    }
  }
  const best = Math.floor(beam[0].score / 1000);
  pileCache.set(key, best);
  return best;
}

// Start `group` now: returns its first piece (the rest follow, in order).
export function startGroup(state, group, pieces = null) {
  if (!group) return null;
  const l6 = state.pieceSel.level6;
  l6.queue = pieces ?? expandGroup(group, state.rng);
  l6.group = group.id;
  l6.lastGroup = group.id; // (a one-piece set is over as soon as it starts)
  l6.starts = (l6.starts ?? 0) + 1;
  l6.seen.set(group.id, (l6.seen.get(group.id) ?? 0) + 1);
  state.level6Recent = [group.id, ...(state.level6Recent ?? []).filter(id => id !== group.id)].slice(0, CONFIG.assist.level6?.rememberRecent ?? 2);
  return nextGroupPiece(state);
}

// For the dev panel: one line about where level 6 stands.
export function level6Status(state) {
  const l6 = state.pieceSel?.level6;
  if (!l6) return "–";
  const cfg = CONFIG.assist.level6 ?? {};
  const dev = state.devLevel6 ?? "auto";
  const parts = [level6Open(state) ? "unlocked" : "locked"];
  if (dev !== "auto") parts.push(`forced ${dev}`);
  else if (CONFIG.modes[state.mode]?.level6 === "open") parts.push("God mode: open from the start");
  else if (!l6.unlocked) parts.push(l6.wasHigh ? `was above row ${cfg.unlockAbove ?? 10}: dig to ${cfg.unlockBackTo ?? 5}` : `needs a stack above row ${cfg.unlockAbove ?? 10}`);
  if (l6.group) parts.push(`${l6.group}: ${l6.queue.length} to come`);
  else if (l6.firstDueAt != null && !l6.seen.size) parts.push(`first group at piece ${l6.firstDueAt}`);
  if (l6.seen.size) parts.push(`seen ${[...l6.seen.keys()].join(", ")}`);
  return parts.join(" · ");
}
