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
// state.level6Recent: ids of the last groups served, latest first (the UI keeps them across
// games), so the same set doesn't come again straight away, even in the next game, nor one of
// its family (the tins: CONFIG.assist.level6.families).

import { CONFIG } from "../config.js";
import { sampleByWeight } from "./util.js";
import { godConfig, isGodMode } from "./godmode.js";
import { lateness, warmth, alwaysWarm } from "./pacing.js";
import { setThreadWeight } from "./threads.js";

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
    // (a set can come in several versions: each its own sequence)
    const sequences = Array.isArray(g?.versions) ? g.versions.filter(Array.isArray) : [g?.sequence];
    if (!g || !g.id || !sequences.length || !sequences.every(Array.isArray)) continue;
    if (Number(g.frequency ?? 1) <= 0) continue; // (banished, like the portraits)
    const versions = sequences.map((seq, vi) => parseSequence(seq, g, vi)).filter(Boolean);
    if (!versions.length) continue;
    const steps = versions.flat(); // (every step of every version: all its pieces)
    // a piece with `echo` comes back later in the same run as that piece (déjà vu)
    const echoes = new Map();
    for (const sh of stepPieces(steps)) if (sh.echo && live(sh.echo)) echoes.set(sh.id, live(sh.echo));
    // (a set with powerups in it that it can't do without, a step of nothing but powerups: the
    // classes it needs met before it can come, groupPlayable. One that only might come, in a
    // chain or among other pieces or now and then, is left out of the run where it can't:
    // playableRun)
    const needed = steps.filter(st => st.shapes?.length && st.count?.[0] >= 1 && st.chance == null && st.shapes.every(s => s.powerup));
    const powerupClasses = [...new Set(needed.flatMap(st => st.shapes.map(s => s.powerup.cls)))];
    // (unique: no piece twice in one run, whichever steps it's in; echoes aside)
    out.push({ id: String(g.id), name: String(g.name ?? g.id), frequency: Math.max(0, Number(g.frequency ?? 1) || 0), steps, versions,
      room: Math.max(0, Number(g.room) || 0), echoes, unique: g.unique === true, powerupClasses });
  }
  return out;

  // One version's steps (null if a fixed piece is missing).
  function parseSequence(sequence, g, vi) {
    const steps = [];
    let ok = true;
    for (const step of sequence) {
      if (typeof step === "string") {
        const s = byId.get(step); // (a fixed piece can be one that only ever comes linked: frequency 0)
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
        // (unique: each piece at most once, so never more of them than there are pieces; chance:
        // the step only happens now and then)
        const unique = step.unique === true;
        const chance = step.chance != null ? Math.max(0, Math.min(1, Number(step.chance) || 0)) : null;
        steps.push({ shapes: picks, weights, count: unique ? [Math.min(lo, picks.length), Math.min(hi, picks.length)] : [lo, hi], unique, ...(chance != null ? { chance } : {}) });
      } else if (step && Array.isArray(step.repeat)) {
        // now and then (chance), one of these again and again (`times`), now and then as its echo
        const picks = step.repeat.map(live).filter(Boolean);
        if (!picks.length) continue;
        const t = Array.isArray(step.times) ? step.times : [step.times ?? 3, step.times ?? 3];
        steps.push({ repeat: picks, times: [Math.max(1, t[0] | 0), Math.max(1, t[0] | 0, t[1] | 0)], chance: Math.max(0, Math.min(1, Number(step.chance ?? 1))) });
      } else if (step && Array.isArray(step.variant)) {
        // one of these, chosen once a game: the same piece drawn several ways
        const picks = step.variant.map(live).filter(Boolean);
        if (!picks.length) { ok = false; break; }
        steps.push({ variant: picks, key: `${g.id}:${vi}:${steps.length}` });
      } else if (step && step.chain && typeof step.chain === "object") {
        // a chain: each piece picks the next ({ start: {id: weight}, after: {id: {id: weight,
        // stop: weight}}, max }), so the run reacts to what it has already brought
        const toList = (w) => Object.entries(w ?? {}).map(([id, wt]) => ({ id, s: id === "stop" ? null : live(id), w: Math.max(0, Number(wt) || 0) }))
          .filter(it => it.w > 0 && (it.id === "stop" || it.s));
        const after = {};
        for (const [id, w] of Object.entries(step.chain.after ?? {})) after[id] = toList(w);
        const start = toList(step.chain.start);
        if (!start.length) continue;
        const max = Math.max(1, Number(step.chain.max) || 4);
        steps.push({ chain: { start, after, max, min: Math.min(max, Math.max(1, Number(step.chain.min) || 1)) } });
      }
    }
    return ok && steps.length ? steps : null;
  }
}

// Every piece a set's steps can bring (in a pick, a variant, a repeat or a chain), once each.
export function groupMembers(group) {
  return [...new Set(stepPieces(group?.steps ?? []))];
}
function stepPieces(steps) {
  return steps.flatMap(st => [...(st.shapes ?? []), ...(st.variant ?? []), ...(st.repeat ?? []),
    ...(st.chain ? [...st.chain.start, ...Object.values(st.chain.after).flat()].map(it => it.s).filter(Boolean) : [])]);
}

// One run through a group: the list of pieces, picks rolled. `variants` (a Map, kept for the
// game) remembers which version of each variant step this game has. A set with versions comes
// as one of them, never `avoid` (the one it had last time) if it has another; the list says
// which (`.version`), for startGroup to remember.
export function expandGroup(group, rng, variants = null, avoid = null) {
  const out = [];
  let tail = null; // (where a run that ends on one thing over and over starts doing that)
  const pick = (list) => sampleByWeight(list, it => it.w, rng);
  const versions = group.versions ?? [group.steps];
  const choices = versions.map((_, i) => i).filter(i => versions.length < 2 || i !== avoid);
  const version = choices[Math.floor(rng() * choices.length)];
  for (const st of versions[version]) {
    if (st.variant) {
      let s = variants?.get(st.key);
      if (!s) { s = st.variant[Math.floor(rng() * st.variant.length)]; variants?.set(st.key, s); }
      out.push(s);
      continue;
    }
    if (st.repeat) {
      // (unique or not: the same one again, and again)
      if (rng() >= st.chance) continue;
      const s = st.repeat[Math.floor(rng() * st.repeat.length)], again = group.echoes?.get(s.id);
      const n = st.times[0] + Math.floor(rng() * (st.times[1] - st.times[0] + 1));
      tail ??= out.length;
      for (let k = 0; k < n; k++) out.push(again && k > 0 && rng() < 0.4 ? again : s);
      continue;
    }
    if (st.chain) {
      // a chain: start somewhere, then each piece picks the next, until "stop" or `max`
      let it = pick(st.chain.start);
      for (let n = 0; it && it.s && n < st.chain.max; n++) {
        out.push(it.s);
        // (no stopping before `min`)
        const nexts = (st.chain.after[it.s.id] ?? []).filter(x => x.s || n + 1 >= st.chain.min);
        it = nexts.length ? pick(nexts) : null;
      }
      continue;
    }
    if (st.chance != null && rng() >= st.chance) continue; // (a step that only happens now and then)
    const n = st.count[0] + Math.floor(rng() * (st.count[1] - st.count[0] + 1));
    let pool = st.shapes.map((s, k) => ({ s, w: st.weights[k] }));
    if (group.unique) pool = pool.filter(it => !out.includes(it.s));
    for (let i = 0; i < n && pool.length; i++) {
      const it = pool.length === 1 ? pool[0] : sampleByWeight(pool, it => it.w, rng);
      out.push(it.s);
      if (st.unique || group.unique) pool = pool.filter(x => x !== it);
    }
  }
  // echoes: the first piece that has one comes back once, somewhere later in the run (only
  // one per run), with at least one other piece in between when there's room for that, and
  // never last (a run ends on one of its own)
  // (and an ending of one thing over and over stays just that: the echo comes before it, and
  // one that's in it already comes back plenty)
  const end = tail ?? out.length;
  const i = out.slice(0, end).findIndex(s => group.echoes?.has(s.id));
  if (i >= 0 && i < end - 1) { // (if it was the last of the run, it doesn't come back)
    let lo = Math.min(end, i + 2), hi = end - 1; // (where it can go: lo..hi)
    if (lo > hi) lo = hi = end - 1;
    out.splice(lo + Math.floor(rng() * (hi - lo + 1)), 0, group.echoes.get(out[i].id));
  }
  out.version = version;
  return out;
}

// A run, as it can be played here and now: a powerup the set might bring (in a chain, or among
// other pieces) that can't come in this mode, or not yet (its class not met), is left out.
export function playableRun(state, pieces) {
  if (!pieces.some(s => s.powerup)) return pieces;
  const mode = CONFIG.modes[state.mode] ?? {}, ps = state.pieceSel?.powerup;
  const off = CONFIG.assist.powerups?.disabledTypes ?? [];
  const ok = (p) => !p.powerup || (mode.powerups && !off.includes(p.powerup.type) && (mode.everything || !!ps?.shownClasses.has(p.powerup.cls)));
  const out = pieces.filter(ok);
  out.version = pieces.version;
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
    variants: new Map(),  // which version of each variant step this game has (expandGroup)
    seenBefore: state.seenSetsEver ? new Map(state.seenSetsEver) : null, // sets seen in this browser before this game
    shownThisLoad: state.setsShownThisLoad ? new Map(state.setsShownThisLoad) : null, // ...and since the page was loaded
  };
}

// CONFIG.assist.level6, with God mode's numbers on top in God mode
// (zen mode keeps well clear of the top: CONFIG.zen.level6)
const level6Cfg = (state) => {
  const base = godConfig(state.mode, "level6", CONFIG.assist.level6 ?? {});
  return CONFIG.modes[state.mode]?.zen ? { ...base, ...CONFIG.zen.level6 } : base;
};

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

// Can this set come now? Not banished; and one with powerups in it only where there are
// powerups, once every class it has in it has been met (in a mode with everything from the
// start, straight away).
export function groupPlayable(state, g) {
  if (!(g.frequency > 0)) return false;
  if (!g.powerupClasses?.length) return true;
  const mode = CONFIG.modes[state.mode] ?? {};
  if (!mode.powerups) return false;
  if (mode.everything) return true;
  const ps = state.pieceSel?.powerup;
  return !!ps && g.powerupClasses.every(c => ps.shownClasses.has(c));
}

export function groupUnderWay(state) {
  return (state.pieceSel?.level6?.queue.length ?? 0) > 0;
}

// Maybe start a group on this piece: returns its first piece, or null.
export function maybeStartGroup(state) {
  if (!state.groups?.length || !level6Open(state)) return null;
  const sel = state.pieceSel, l6 = sel.level6, cfg = level6Cfg(state);
  if (sel.lastWasHard) return null; // never straight after a giant
  if (sel.calmUntil != null && sel.dropIndex < sel.calmUntil) return null; // (God mode: a calm spell)
  if (stackRows(state) > (cfg.maxStackRows ?? 8)) return null;
  // (in the warm-up at the start of a game, hardly ever yet: CONFIG.assist.warmup.sets)
  const warm = warmth(state);
  if (warm > 0 && !alwaysWarm(state) && state.rng() < warm * (1 - (CONFIG.assist.warmup?.sets ?? 0.1))) return null;
  const firstDue = l6.firstDueAt != null && !l6.seen.size && sel.dropIndex >= l6.firstDueAt;
  if (!firstDue) {
    if (sel.dropIndex - l6.lastEnd < (cfg.cooldownDrops ?? 30)) return null;
    // (later in a game, more often: CONFIG.assist.later)
    const more = 1 + ((CONFIG.assist.later?.setRate ?? 1) - 1) * lateness(state);
    if (state.rng() >= (cfg.chancePerDrop ?? 0.04) * more) return null;
  }
  // No set comes round again until every other one has had its turn this game, and the last
  // ones served (this game or the one before) wait if anything else can go.
  const live = state.groups.filter(g => groupPlayable(state, g));
  if (!live.length) return null;
  const turns = (g) => l6.seen.get(g.id) ?? 0;
  const least = Math.min(...live.map(turns));
  let pool = live.filter(g => turns(g) === least);
  const recent = (state.level6Recent ?? []).slice(0, cfg.rememberRecent ?? 2);
  const fresh = pool.filter(g => !recent.includes(g.id));
  if (fresh.length) pool = fresh;
  // (God mode: the sets being shown off come round whenever they like, just not twice running:
  // CONFIG.godMode.featured)
  const featured = isGodMode(state.mode) ? CONFIG.godMode?.featured ?? {} : {};
  for (const g of live) if (featured.sets?.includes(g.id) && !pool.includes(g) && state.level6Recent?.[0] !== g.id) pool.push(g);
  // (God mode opens with a particular set, or one of a few, the first time since the page was
  // loaded: CONFIG.godMode.firstSet)
  const opening = firstDue && openingSet(state);
  if (opening) pool = [opening];
  // ...and only one whose whole run fits on the board (a set can't be cleared until it's down)
  const room = state.board.length - (cfg.headroom ?? 3) - stackRows(state);
  while (pool.length) {
    const shown = (g) => (featured.sets?.includes(g.id) ? featured.weight ?? 1 : 1);
    const group = sampleByWeight(pool, g => g.frequency * setNovelty(state, g) * setThreadWeight(state, sel.currentThread, g) * familyWeight(state, g, cfg) * shown(g), state.rng);
    const pieces = playableRun(state, expandGroup(group, state.rng, l6.variants, lastVersion(state, group)));
    // (not if its first piece mustn't come straight after the last one: a small piece of the sky)
    if (pieces[0]?.notAfter?.includes(sel.lastShapeId)) { pool = pool.filter(g => g !== group); continue; }
    if ((group.room || roomNeeded(pieces)) <= room) return startGroup(state, group, pieces); // (a set's own `room` has the last word)
    pool = pool.filter(g => g !== group);
  }
  return null;
}

// (one of them, if it's a list: the first never seen in this browser, or else any of them; and
// once one of them has opened a game since the page was loaded, that's that)
function openingSet(state) {
  const ids = [].concat(CONFIG.godMode?.firstSet ?? []);
  if (!ids.length || state.mode !== "god") return null;
  const l6 = state.pieceSel.level6;
  if (ids.some(id => (l6.shownThisLoad?.get(id) ?? 0) + (l6.seen.get(id) ?? 0) > 0)) return null;
  const live = ids.map(id => state.groups.find(g => g.id === id && g.frequency > 0)).filter(Boolean);
  if (!live.length) return null;
  return live.find(g => !(l6.seenBefore?.get(g.id) ?? 0)) ?? live[Math.floor(state.rng() * live.length)];
}

// Sets of a kind (CONFIG.assist.level6.families: the tins): one soon after another is unlikely.
function familyWeight(state, g, cfg) {
  const family = (cfg.families ?? []).find(f => f.includes(g.id));
  if (!family) return 1;
  const recent = (state.level6Recent ?? []).slice(0, cfg.familyGap ?? 3);
  return recent.some(id => family.includes(id)) ? cfg.familyWeight ?? 0.1 : 1;
}

// God mode: the newest sets first (CONFIG.godMode.newest) until each has come once since the
// page was loaded, and any never seen in this browser more often.
function setNovelty(state, g) {
  const l6 = state.pieceSel.level6;
  if (!isGodMode(state.mode) || CONFIG.modes[state.mode]?.calm || !l6.seenBefore) return 1; // (zen is as it comes)
  const n = CONFIG.godMode.novelty ?? {};
  const here = l6.seen.get(g.id) ?? 0;
  const shown = (l6.shownThisLoad?.get(g.id) ?? 0) + here;
  if ((CONFIG.godMode.newest?.sets ?? []).includes(g.id) && shown < (n.newUntilShown ?? 1)) return n.newSetBoost ?? 10;
  return (l6.seenBefore.get(g.id) ?? 0) + here ? 1 : (n.unseenBoost ?? 2.5);
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
  const cols = CONFIG.board.cols;
  // (a board too wide for a row in one number, turbo zen's whole window: the rough estimate)
  if (cols > 31) return Math.ceil(pieces.reduce((n, s) => n + s.rotations[0].flat().filter(Boolean).length, 0) / cols * 1.5);
  const key = cols + ":" + pieces.map(s => s.id).join(">");
  if (pileCache.has(key)) return pileCache.get(key);
  const H = 64, FULL = (1 << cols) - 1;
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

// The version of a set it had last time (this game, or in this browser before: state.setVersions,
// kept by the UI), and remembering the one it has now.
export function lastVersion(state, group) {
  return group.versions?.length > 1 ? state.setVersions?.get(group.id) ?? null : null;
}
export function noteVersion(state, group, version) {
  if (group.versions?.length > 1 && version != null) (state.setVersions ??= new Map()).set(group.id, version);
}

// Start `group` now: returns its first piece (the rest follow, in order).
export function startGroup(state, group, pieces = null) {
  if (!group) return null;
  const l6 = state.pieceSel.level6;
  l6.queue = pieces ?? playableRun(state, expandGroup(group, state.rng, l6.variants, lastVersion(state, group)));
  noteVersion(state, group, l6.queue.version);
  l6.group = group.id;
  l6.lastGroup = group.id; // (a one-piece set is over as soon as it starts)
  l6.nameIndex = Math.floor(Math.random() * 1e6); // (which of its pieces' other names, if they have them: game.js prepareShape)
  l6.starts = (l6.starts ?? 0) + 1;
  l6.seen.set(group.id, (l6.seen.get(group.id) ?? 0) + 1);
  const keep = Math.max(CONFIG.assist.level6?.rememberRecent ?? 2, CONFIG.assist.level6?.familyGap ?? 0);
  state.level6Recent = [group.id, ...(state.level6Recent ?? []).filter(id => id !== group.id)].slice(0, keep);
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
