// ============================================================
// END GAME (no DOM) — see CONFIG.endGame
// ============================================================
// Once the stack reaches two thirds of the board the game stops helping and goes for a
// frantic finale: bigger and worse pieces, fewer powerups, and the fall speeds up with every
// piece (game.js). Digging back down to CONFIG.endGame.exitAtRows gets you out, which isn't
// easy. The idea is that games end with a full board and a big, silly last piece, rather than
// fizzling out with small pieces on a central tower.
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
  };
}

export function endGameOn(state) {
  return !!state.pieceSel?.endGame?.on;
}

// Call once per piece with the board settled. Returns "enter", "exit" or null.
export function trackEndGame(state) {
  const cfg = CONFIG.endGame ?? {};
  const eg = state.pieceSel?.endGame;
  if (!eg || cfg.enabled === false) return null;
  const dev = state.devEndGame ?? "auto";
  const rows = pileRows(state);
  if (!eg.on) {
    if (dev === "off") return null;
    if (dev === "on" || rows >= (cfg.enterAtRows ?? 16)) {
      eg.on = true;
      eg.pieces = 0;
      eg.times++;
      return "enter";
    }
  } else if (dev === "off" || (dev !== "on" && rows <= (cfg.exitAtRows ?? 10))) {
    eg.on = false;
    eg.escapes++;
    return "exit";
  }
  return null;
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

export function endGameStatus(state) {
  const eg = state.pieceSel?.endGame;
  if (!eg) return "–";
  const cfg = CONFIG.endGame ?? {};
  const dev = state.devEndGame ?? "auto";
  const rows = pileRows(state);
  const parts = [eg.on ? `ON · ${eg.pieces} pieces · out at ${cfg.exitAtRows ?? 10} rows` : `off · starts at ${cfg.enterAtRows ?? 16} rows (now ${rows})`];
  if (dev !== "auto") parts.push(`forced ${dev}`);
  if (eg.times) parts.push(`${eg.times}× this game, escaped ${eg.escapes}`);
  return parts.join(" · ");
}
