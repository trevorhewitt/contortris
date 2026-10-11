// ============================================================
// END GAME (no DOM) — see CONFIG.endGame
// ============================================================
// A hidden part of the experience, never announced. When it's clear the player has given up
// (the pile has sat two thirds up the board for a good while without a single row being
// destroyed, and sooner if they've stopped steering the pieces), the game quietly stops
// helping and goes for the finale: bigger and worse pieces, fewer powerups, and the fall gets
// faster with every piece (game.js). Digging back down to CONFIG.endGame.exitAtRows gets you
// out, which isn't easy. Games then end with a full board and a big, silly last piece, rather
// than fizzling out with small pieces on a central tower.
//
// state.devEndGame: "auto" (the rule above), "on" (always) or "off" (never) — dev mode.

import { CONFIG } from "../config.js";

// How tall the pile is: the height that at least CONFIG.endGame.columns columns reach (so one
// tall thin giant standing on its end doesn't count as a full board).
export function pileRows(state, k = CONFIG.endGame?.columns ?? 4) {
  const rows = state.board.length, cols = state.board[0].length;
  const h = [];
  for (let x = 0; x < cols; x++) {
    let y = 0;
    while (y < rows && !state.board[y][x]) y++;
    h.push(rows - y);
  }
  h.sort((a, b) => b - a);
  return h[Math.min(cols, Math.max(1, k)) - 1];
}

export function initEndGame() {
  return {
    on: false,
    pieces: 0,    // pieces served since it started
    times: 0,     // how many times it has started this game
    escapes: 0,   // ...and been escaped
    stuck: 0,     // pieces in a row with the pile high and no row destroyed
    lastRows: 0,  // rows destroyed so far in the game, at the last piece
    recent: [],   // the last few pieces placed: did the player steer them? (move or turn)
  };
}

export function endGameOn(state) {
  return !!state.pieceSel?.endGame?.on;
}

// A piece has landed: remember whether the player moved or turned it at all.
export function noteLanding(state, steered) {
  const eg = state.pieceSel?.endGame;
  if (!eg) return;
  eg.recent.push(!!steered);
  const keep = (CONFIG.endGame?.idleOf ?? [3, 5])[1];
  while (eg.recent.length > keep) eg.recent.shift();
}

// Call once per piece with the board settled. Returns "enter", "exit" or null.
export function trackEndGame(state) {
  const cfg = CONFIG.endGame ?? {};
  const eg = state.pieceSel?.endGame;
  if (!eg || cfg.enabled === false) return null;
  const dev = state.devEndGame ?? "auto";
  const rows = pileRows(state);
  // destroying rows (by any means) means they're still fighting
  const cleared = (state.rowsDestroyed ?? 0) > eg.lastRows;
  eg.lastRows = state.rowsDestroyed ?? 0;

  if (eg.on) {
    if (dev === "off" || (dev !== "on" && rows <= (cfg.exitAtRows ?? 10))) {
      eg.on = false;
      eg.escapes++;
      eg.stuck = 0;
      return "exit";
    }
    return null;
  }
  if (dev === "off") return null;
  if (dev === "on") return enter(eg);

  // the pile is high and nothing is happening about it... (a level 6 group, and a few pieces
  // after one, don't count: those pieces are big on purpose)
  const l6 = state.pieceSel.level6;
  const groupTime = !!l6 && (l6.queue.length > 0 || (l6.seen.size > 0 && state.pieceSel.dropIndex - l6.lastEnd < (cfg.graceAfterGroup ?? 8)));
  if (rows < (cfg.enterAtRows ?? 16) || cleared) eg.stuck = 0;
  else if (!groupTime) eg.stuck++;

  // ...for long enough: a good while if they're still trying, less if they've stopped steering
  const [needIdle] = cfg.idleOf ?? [3, 5];
  const idle = eg.recent.filter(steered => !steered).length;
  if (eg.stuck >= (cfg.stuckPieces ?? 12)) return enter(eg);
  if (eg.stuck >= (cfg.idleStuckPieces ?? 5) && idle >= needIdle) return enter(eg);
  return null;
}

function enter(eg) {
  eg.on = true;
  eg.pieces = 0;
  eg.times++;
  eg.stuck = 0;
  return "enter";
}

// Level weights while the end game is on: CONFIG.endGame.levelWeights, with more and more of
// the weight moving onto the giants (4 and 5) the longer it lasts.
export function endGameLevelWeights(state, modeHasGiants) {
  const cfg = CONFIG.endGame ?? {};
  const base = cfg.levelWeights ?? { 2: 0.2, 3: 0.4, 4: 0.2, 5: 0.2 };
  const n = state.pieceSel?.endGame?.pieces ?? 0;
  const shift = Math.min(cfg.giantsRampMax ?? 0.35, (cfg.giantsRamp ?? 0) * n);
  const w = {};
  for (let k = 0; k <= 5; k++) w[k] = Math.max(0, base[k] ?? 0);
  if (!modeHasGiants) { w[4] = 0; w[5] = 0; return w; }
  const small = w[0] + w[1] + w[2] + w[3];
  if (small > 0 && shift > 0) {
    const take = Math.min(small, shift);
    for (let k = 0; k <= 3; k++) w[k] -= take * (w[k] / small);
    w[4] += take / 2;
    w[5] += take / 2;
  }
  return w;
}

// How far off-centre pieces may spawn (columns either way).
export function spawnJitter(state) {
  return endGameOn(state) ? (CONFIG.endGame?.spawnJitter ?? 3) : (CONFIG.spawn?.jitter ?? 0);
}

// For the dev panel only (the player is never told).
export function endGameStatus(state) {
  const eg = state.pieceSel?.endGame;
  if (!eg) return "–";
  const cfg = CONFIG.endGame ?? {};
  const dev = state.devEndGame ?? "auto";
  const rows = pileRows(state);
  const idle = eg.recent.filter(s => !s).length;
  const parts = [eg.on
    ? `ON · ${eg.pieces} pieces · out at ${cfg.exitAtRows ?? 10} rows (now ${rows})`
    : `off · pile ${rows}/${cfg.enterAtRows ?? 16} · stuck ${eg.stuck}/${cfg.stuckPieces ?? 12} (or ${cfg.idleStuckPieces ?? 5} with ${idle}/${(cfg.idleOf ?? [3, 5])[0]} idle)`];
  if (dev !== "auto") parts.push(`forced ${dev}`);
  if (eg.times) parts.push(`${eg.times}× this game, escaped ${eg.escapes}`);
  return parts.join(" · ");
}
