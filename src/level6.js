// ============================================================
// LEVEL 6 — the biggest pieces, served in groups (no DOM)
// ============================================================
// Groups are defined in shapes/groups.js: a whole group arrives in order, one piece straight
// after another, and level 6 pieces never turn up any other way. They are locked at the start
// of each game, and unlock when the player builds the stack up past
// CONFIG.assist.level6.unlockAbove rows and then digs back down to unlockBackTo rows or fewer.
// (Normal and Extreme; CONFIG.modes[mode].level6.)
//
// state.devLevel6: "auto" (the rule above), "on" or "off" — the dev mode override.
// state.level6Remembered: true if it ever unlocked in this browser (used if level6.persist).

import { CONFIG } from "../config.js";
import { sampleByWeight } from "./util.js";

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
        steps.push({ shapes: picks, weights, count: [lo, Math.max(lo, c[1] | 0)] });
      }
    }
    if (!ok || !steps.length) continue;
    out.push({ id: String(g.id), name: String(g.name ?? g.id), frequency: Math.max(0, Number(g.frequency ?? 1) || 0), steps });
  }
  return out;
}

// One run through a group: the list of pieces, picks rolled.
export function expandGroup(group, rng) {
  const out = [];
  for (const st of group.steps) {
    const n = st.count[0] + Math.floor(rng() * (st.count[1] - st.count[0] + 1));
    for (let i = 0; i < n; i++) {
      out.push(st.shapes.length === 1 ? st.shapes[0] : sampleByWeight(st.shapes.map((s, k) => ({ s, w: st.weights[k] })), it => it.w, rng).s);
    }
  }
  return out;
}

// Per-game bookkeeping (lives in state.pieceSel.level6).
export function initLevel6(state) {
  const remembered = (CONFIG.assist.level6?.persist === true) && state.level6Remembered === true;
  return {
    unlocked: remembered, // in this game
    unlockedAt: remembered ? 0 : null,
    wasHigh: false,       // the stack has been taller than unlockAbove this game
    firstDueAt: null,     // the first group arrives at this piece number
    queue: [],            // pieces still to come in the group being served
    group: null,          // id of the group being served
    lastEnd: 0,           // piece number when the last group finished
    seen: new Map(),      // group id -> times served this game
  };
}

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
  const [a, b] = CONFIG.assist.level6?.firstAfter ?? [2, 5];
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
  const sel = state.pieceSel, l6 = sel.level6, cfg = CONFIG.assist.level6 ?? {};
  if (sel.lastWasHard) return null; // never straight after a giant
  if (stackRows(state) > (cfg.maxStackRows ?? 8)) return null;
  const firstDue = l6.firstDueAt != null && !l6.seen.size && sel.dropIndex >= l6.firstDueAt;
  if (!firstDue) {
    if (sel.dropIndex - l6.lastEnd < (cfg.cooldownDrops ?? 30)) return null;
    if (state.rng() >= (cfg.chancePerDrop ?? 0.04)) return null;
  }
  const group = sampleByWeight(state.groups, g => g.frequency * Math.pow(cfg.repeatPenalty ?? 0.15, l6.seen.get(g.id) ?? 0), state.rng);
  const pieces = expandGroup(group, state.rng);
  // only if the whole run fits on the board (a group can't be cleared until it's all down)
  if (stackRows(state) + roomNeeded(pieces) > state.board.length - (cfg.headroom ?? 3)) return null;
  return startGroup(state, group, pieces);
}

// Rows of board a run of pieces needs: their blocks spread over the width, plus some for the
// gaps they leave (CONFIG.assist.level6.roomFactor) — or, if more, the full height of every
// piece wider than half the board (those can't sit side by side, so they stack up).
export function roomNeeded(pieces) {
  const cols = CONFIG.board.cols;
  let blocks = 0, stacked = 0;
  for (const s of pieces) {
    const mat = s.rotations[0];
    blocks += mat.flat().filter(Boolean).length;
    if (mat[0].length > cols / 2) stacked += mat.length;
  }
  return Math.max(stacked, Math.ceil((blocks / cols) * (CONFIG.assist.level6?.roomFactor ?? 1.25)));
}

// Start `group` now: returns its first piece (the rest follow, in order).
export function startGroup(state, group, pieces = null) {
  if (!group) return null;
  const l6 = state.pieceSel.level6;
  l6.queue = pieces ?? expandGroup(group, state.rng);
  l6.group = group.id;
  l6.seen.set(group.id, (l6.seen.get(group.id) ?? 0) + 1);
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
  else if (!l6.unlocked) parts.push(l6.wasHigh ? `was above row ${cfg.unlockAbove ?? 10}: dig to ${cfg.unlockBackTo ?? 5}` : `needs a stack above row ${cfg.unlockAbove ?? 10}`);
  if (l6.group) parts.push(`${l6.group}: ${l6.queue.length} to come`);
  else if (l6.firstDueAt != null && !l6.seen.size) parts.push(`first group at piece ${l6.firstDueAt}`);
  if (l6.seen.size) parts.push(`seen ${[...l6.seen.keys()].join(", ")}`);
  return parts.join(" · ");
}
