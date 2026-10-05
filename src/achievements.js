// ============================================================
// ACHIEVEMENTS (no DOM) — definitions live in shapes/achievements.js
// ============================================================
// Feed it the game's events: tracker.handle(type, data, state).
// Unlocks are saved through `storage` ({ load(), save(data) }).

import { matchShape } from "./shapes.js";
import { currentPool } from "./game.js";
import { store } from "./util.js";

const STORAGE_KEY = "extris.achievements.v1";

export const localStorageAdapter = {
  load: () => store.getJSON(STORAGE_KEY, null),
  save: (data) => store.setJSON(STORAGE_KEY, data),
};

function emptyData() {
  return {
    version: 1,
    unlocked: {},                       // id -> { at, mode }
    stats: { rowsDestroyed: 0, powerupsUsed: 0, games: 0, bestRowsInGame: 0 },
    progress: {},                       // achievement id -> lifetime counter
  };
}

export function createAchievements(defs, { storage = localStorageAdapter, onUnlock = () => {}, now = () => Date.now() } = {}) {
  const list = (Array.isArray(defs) ? defs : []).filter(d => d && d.id && d.trigger?.type);
  const data = { ...emptyData(), ...(storage.load() ?? {}) };
  data.stats = { ...emptyData().stats, ...(data.stats ?? {}) };
  data.unlocked = data.unlocked ?? {};
  data.progress = data.progress ?? {};

  // Per-game bookkeeping (reset on "start").
  let game = newGame("normal", []);

  function newGame(mode, pool) {
    return { mode, pool, rows: 0, drops: 0, history: [], seen: new Set(), progress: {}, unlocked: [] };
  }

  const save = () => storage.save(data);
  const isUnlocked = (id) => !!data.unlocked[id];

  function eligible(def) {
    if (isUnlocked(def.id)) return false;
    const mode = def.mode ?? "any";
    return mode === "any" || mode === game.mode;
  }

  function unlock(def) {
    if (isUnlocked(def.id)) return;
    data.unlocked[def.id] = { at: now(), mode: game.mode };
    game.unlocked.push(def.id);
    save();
    try { onUnlock(def); } catch (e) { console.error(e); }
  }

  // Count towards a counter trigger; scope "lifetime" persists between games.
  function bump(def, by = 1) {
    if ((def.trigger.scope ?? "game") === "lifetime") {
      data.progress[def.id] = (data.progress[def.id] ?? 0) + by;
      return data.progress[def.id];
    }
    game.progress[def.id] = (game.progress[def.id] ?? 0) + by;
    return game.progress[def.id];
  }

  function each(type, fn) {
    for (const def of list) {
      if (def.trigger.type === type && eligible(def)) fn(def, def.trigger);
    }
  }

  // Thresholds that depend on the live game state.
  function checkState(state) {
    if (!state) return;
    each("score", (def, t) => { if (state.score >= (t.value ?? Infinity)) unlock(def); });
    each("level", (def, t) => { if (state.level >= (t.value ?? Infinity)) unlock(def); });
    each("drops", (def, t) => { if (game.drops >= (t.count ?? Infinity)) unlock(def); });
  }

  function handle(type, d = {}, state = null) {
    switch (type) {
      case "start": {
        game = newGame(d.mode ?? "normal", state ? currentPool(state) : []);
        data.stats.games++;
        save();
        break;
      }

      case "spawn": {
        const shape = d.shape;
        if (!shape) break;
        game.history.push(shape.id);
        if (game.history.length > 64) game.history.shift();
        game.seen.add(shape.id);

        each("pieceServed", (def, t) => { if (matchShape(shape, t.match)) unlock(def); });

        each("pieceSequence", (def, t) => {
          const ids = t.ids ?? [];
          if (!ids.length || game.history.length < ids.length) return;
          const tail = game.history.slice(-ids.length);
          if (tail.every((id, i) => id === ids[i])) unlock(def);
        });

        each("seenAll", (def, t) => {
          const wanted = game.pool.filter(s => matchShape(s, t.match));
          if (wanted.length && wanted.every(s => game.seen.has(s.id))) unlock(def);
        });
        break;
      }

      case "lock": {
        game.drops = d.drops ?? game.drops + 1;
        each("together", (def, t) => {
          const present = d.onBoard ? d.onBoard() : [];
          if (t.groups?.length) {
            // one distinct piece on the board for each group
            const used = new Set();
            const ok = t.groups.every(g => {
              const i = present.findIndex((s, k) => !used.has(k) && matchShape(s, g));
              if (i < 0) return false;
              used.add(i);
              return true;
            });
            if (ok) unlock(def);
          } else if (t.count) {
            const ids = new Set(present.filter(s => matchShape(s, t.match)).map(s => s.id));
            if (ids.size >= t.count) unlock(def);
          }
        });
        each("pieceInside", (def, t) => {
          const pairs = d.inside ? d.inside(t.zone ?? "inside") : [];
          if (pairs.some(p => matchShape(p.inner, t.piece) && matchShape(p.container, t.container))) unlock(def);
        });
        break;
      }

      case "rowsDestroyed": {
        const n = d.count ?? 0;
        if (n <= 0) break;
        game.rows += n;
        data.stats.rowsDestroyed += n;
        data.stats.bestRowsInGame = Math.max(data.stats.bestRowsInGame, game.rows);
        save();
        each("rowsDestroyed", (def, t) => {
          const have = (t.scope ?? "game") === "lifetime" ? data.stats.rowsDestroyed : game.rows;
          if (have >= (t.count ?? 1)) unlock(def);
        });
        each("multiRow", (def, t) => { if (n >= (t.rows ?? 2)) unlock(def); });
        break;
      }

      case "powerupFire": {
        const shape = d.shape;
        data.stats.powerupsUsed++;
        save();
        each("powerupUsed", (def, t) => {
          if (!matchShape(shape, t.match)) return;
          if (bump(def) >= (t.count ?? 1)) unlock(def);
          else if ((t.scope ?? "game") === "lifetime") save();
        });
        each("powerupBlocks", (def, t) => {
          if (matchShape(shape, t.match) && (d.affected ?? 0) >= (t.count ?? 1)) unlock(def);
        });
        break;
      }

      case "boardCleared": {
        each("boardCleared", (def) => unlock(def));
        break;
      }

      case "gameOver": {
        each("gameOver", (def, t) => {
          if (t.killer && !matchShape(d.killer, t.killer)) return;
          if (t.maxDrops != null && (d.drops ?? Infinity) > t.maxDrops) return;
          unlock(def);
        });
        break;
      }

      default:
        break;
    }
    checkState(state);
  }

  // Progress towards counter-style achievements: { value, target } or null.
  function progressOf(def) {
    const t = def.trigger;
    const lifetime = (t.scope ?? "game") === "lifetime";
    if (t.type === "rowsDestroyed") {
      return lifetime
        ? { value: data.stats.rowsDestroyed, target: t.count ?? 1 }
        : { value: data.stats.bestRowsInGame, target: t.count ?? 1, best: true };
    }
    if (t.type === "powerupUsed" && lifetime) return { value: data.progress[def.id] ?? 0, target: t.count ?? 1 };
    return null;
  }

  return {
    handle,
    isUnlocked,
    progressOf,
    get defs() { return list; },
    get stats() { return data.stats; },
    get unlockedThisGame() { return game.unlocked.slice(); },
    unlockedCount: () => list.filter(d => isUnlocked(d.id)).length,
    unlockedAt: (id) => data.unlocked[id]?.at ?? null,
    resetAll() {
      const fresh = emptyData();
      Object.assign(data, fresh);
      save();
    },
  };
}
