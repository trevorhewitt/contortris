import { SHAPES as RAW_SHAPES } from "./shapes/main_shapes.js";
import { POWERUPS as RAW_POWERUPS } from "./shapes/powerup_shapes.js";
import {
  normalisePowerup,
  resolveArea,
  applyDestroy,
  applyGravity,
  applyExpand,
  collapseRows,
  analyseBoard,
} from "./powerups.js";

const CONFIG = {
  board: { cols: 14, rows: 28 },

  // Game modes. Hard = the original game. Normal = the same game plus powerups.
  modes: {
    normal: { label: "Normal", tagline: "powerups help you out", powerups: true },
    hard: { label: "Hard", tagline: "the original. no help.", powerups: false },
  },
  defaultMode: "normal",

  timing: {
    baseDropMs: 500,
    minDropMs: 110,
    levelEveryLines: 3,
    speedMultiplierPerLevel: 0.92,
    softDropFactor: 0.12,
    maxFallStepsPerFrame: 1,
    maxAccumulatedSteps: 2,
    lockDelayMsKeyboard: 220,
    lockDelayMsTouch: 520,
    tapRepeatStartMs: 140,
    tapRepeatEveryMs: 55,
  },

  scoring: {
    lineClear: { 1: 100, 2: 250, 3: 450, 4: 700 },
    softDropPerCell: 1,
    hardDropPerCell: 2,
    powerupDestroyPerBlock: 10, // × level, for blocks destroyed by a destroyer
  },

  pause: { hideShapes: true, pauseWhenHidden: true },

  render: {
    // "enhanced" = new look (piece outlines + bevels, art not cut by grid lines,
    //              soft shadows, tiled background).
    // "classic"  = the original look.
    // While debugging (press D), V toggles between them.
    cellStyle: "enhanced",

    cellPx: 18,
    maxScale: 3, // max backing-store pixels per board pixel (crispness vs cost)
    gridLineAlpha: 0.22,
    bg: "#000000",
    silhouetteColor: "rgba(240,240,255,0.16)",
    silhouetteStroke: "rgba(240,240,255,0.20)",
    pixelArtJitter: 0,

    ghost: {
      enabled: true,
      fill: "rgba(255,255,255,0.07)",
      stroke: "rgba(255,255,255,0.40)",
      lineWidth: 0.1,
      insetPx: 0.0,
      drawBehindActive: true,
    },

    enhanced: {
      bgTop: "#06060f",
      bgBottom: "#020206",
      emptyCellFill: "rgba(255,255,255,0.028)",
      emptyCellDot: "rgba(255,255,255,0.10)",
      shadowOffsetPx: 2,
      shadowColor: "rgba(0,0,0,0.55)",
      outlineColor: "rgba(0,0,0,0.62)",
      bevelLight: "rgba(255,255,255,0.22)",
      bevelDark: "rgba(0,0,0,0.26)",
      ghostFill: "rgba(255,255,255,0.05)",
      ghostStroke: "rgba(255,255,255,0.45)",
    },
  },

  assist: {
    openingNoLevel0UntilDrop: 17,

    // “Danger” bands (rows-from-top). Higher = assistance kicks in earlier.
    topRowsForDiff2Only: 22,
    topRowsForDiff1Only: 12,

    pieceMix: {
      // Baseline level weights (0–5). Keep 4/5 at 0: they’re injected via the “hard” scheduler below.
      baseLevelWeight:    { 0: 0.1, 1: 0.5, 2: 0.3, 3: 0.08, 4: 0.00, 5: 0.00 },

      // Opening blend (first N drops), then fades into baseLevelWeight.
      openingDrops: 10,
      openingLevelWeight: { 0: 0.00, 1: 0.42, 2: 0.38, 3: 0.20, 4: 0.00, 5: 0.00 },

      // Soft danger bias: blends level weights towards dangerTargetMix as danger rises.
      dangerBiasStrength: 1.35,
      dangerTargetMix: { 0: 0.72, 1: 0.25, 2: 0.03, 3: 0.00, 4: 0.00, 5: 0.00 },

      // Recency bias against repeating the same shape ID too often.
      // lastK = “within the last K drops” and penaltyStrength = how hard we downweight repeats (soft, never zero).
      recency: {
        lastK: 5,
        penaltyStrength: 0.75, // 0 = off; 0.75 is strong but still allows repeats if needed
        minMultiplier: 0.15,   // never downweight below this multiplier
      },

      // “Hard shapes” scheduler: subclasses are level 4 (awkward) and level 5 (large-but-not-awkward).
      hard: {
        // Never drop any hard (4/5) in the first minDropIndex drops.
        minDropIndex: 5,

        // Window where hard becomes increasingly likely (urge grows faster inside window).
        softWindowStart: 6,
        softWindowEnd: 25,

        // Urge accumulator (shared for 4+5). When a 4 or 5 drops: urge -> 0 and cooldown starts.
        rechargePerDrop: 0.0075,
        maxUrge: 0.95,
        cooldownDrops: 9,

        // Early “first hard” preference: the first hard drop should be a level 5 (if possible).
        preferLevel5ForFirstHard: true,

        // If danger is above this, hard is disallowed entirely (same idea as old level4MaxDanger).
        hardMaxDanger: 0.32,

        // Level 5 gating: level 5 is suppressed as stack gets higher.
        // Below level5FullAllowedDanger: 5 is fully eligible.
        // Above level5AlmostNeverDanger: 5 is almost never chosen (but still technically possible).
        level5FullAllowedDanger: 0.12,
        level5AlmostNeverDanger: 0.28,

        // When hard is chosen (4/5), split between them using this baseline ratio,
        // then apply the level-5 suppression curve above.
        baseProbLevel5WhenHard: 0.55,
      },
    },

    // Powerup scheduler (Normal mode only). Runs before the regular level mix:
    // once a powerup is "due", it replaces that drop's regular piece.
    powerups: {
      // No powerups in the first N drops of a run.
      minDropIndex: 6,
      // Drops to wait after a powerup before another one can appear.
      cooldownDrops: 5,

      // Chance per drop once eligible. Starts at baseChance and grows by
      // chancePerDrop every drop without a powerup (reset when one drops).
      baseChance: 0.05,
      chancePerDrop: 0.035,
      maxChance: 0.6,

      // The chance is multiplied by (1 + dangerBoost*danger + holesBoost*holes01):
      // you get more help when the stack is high or full of air pockets.
      dangerBoost: 1.6,
      holesBoost: 0.8,
      holesForMax: 18, // this many air pockets counts as holes01 = 1

      // Which tier to serve: blended from calm -> danger as the stack rises.
      tierWeights: {
        calm:   { 1: 1.00, 2: 0.45, 3: 0.12 },
        danger: { 1: 0.45, 2: 1.00, 3: 0.90 },
      },

      // Which class is most useful right now (multipliers):
      // gravity/expanders fix air pockets, destroyers fix height.
      need: {
        gravity:   { base: 0.6, holes: 1.2, danger: 0.0 },
        expander:  { base: 0.6, holes: 0.8, danger: 0.0 },
        destroyer: { base: 0.7, holes: 0.2, danger: 1.0 },
      },
    },
  },

  fx: {
    quake: {
      enabled: true,

      // Visual behaviour of the shake itself
      maxOffsetPx: 8,
      traumaDecayPerSecond: 2.8,
      rotationalDegrees: 0.8,

      // Scaling of triggered shake intensity
      minTrauma: 0.025,        // smallest visible shake if triggered at all
      maxTrauma: 0.5,          // largest allowed shake from any single trigger
      blocksForMax: 100,       // how many blocks correspond to maxTrauma
      blockScalePower: 0.85,   // <1 = ramps up faster early, >1 = slower early
    },
    lineClear: {
      enabled: true,
      particleSizePx: 3,
      particlesPerPixel: 0.35,
      maxParticlesPerCell: 24,
      speedMin: 35,
      speedMax: 180,
      upwardBias: 0.18,
      lifeMinMs: 220,
      lifeMaxMs: 520,
      gravityPxPerSec2: 260,
      dragPerSecond: 2.4,
      boardFallAnimMs: 60,
      boardFallPxPerRow: 18,
      quakePerClearedLine: 0.3,
    },

    largePieceLock: {
      quakePerCell: 0.03,
      minDifficulty: 4,
    },

    powerup: {
      // Locked powerup glows for this long before it fires.
      chargeMs: 260,

      // Destroyer: pause after the blast before play continues.
      destroySettleMs: 220,
      destroyFlashMs: 160,
      destroyQuakePerBlock: 1.5,

      // Gravity: per-block slide time = base + perSqrtCell*sqrt(distance), capped.
      gravityBaseMs: 60,
      gravityMsPerSqrtCell: 70,
      gravityMaxMs: 420,
      gravityQuakePerBlock: 0.8,

      // Expander: fill cells pop in rings outward from the powerup.
      expandStaggerMsPerCell: 40,
      expandGrowMs: 180,

      // Highlighted cells overlay.
      overlay: {
        periodMs: 900,           // one loop of the square / line animation
        hueDegPerMs: 0.12,       // rainbow scroll speed
        hueStepPerCell: 18,      // rainbow spread across cells
        fillAlpha: 0.30,         // cells the effect will change
        idleFillAlpha: 0.11,     // highlighted cells it won't change (e.g. empty cells for a destroyer)
        markAlpha: 0.95,
        idleMarkAlpha: 0.45,
        ripplePerCell: 0.12,     // destroyer/expander ripple offset per cell of distance
      },
      shimmerAlpha: 0.9,         // rainbow outline around powerup pieces
    },

    gameOverBackdrop: {
      enabled: true,
      scale: 1.9,
      alpha: 0.95,
      cutEveryMs: 5000,
      movePxPerSec: 24,
      rotationDeg: 18,
    },
  },

};

const DEBUG_LINK = false; // verbose console logging for linked shapes


/* =========================================
   State tracking variables (initialisation)
   =========================================
   Call once when creating a new run / resetting state.
*/

function initPieceSelectionState(state) {
  state.pieceSel = {
    dropIndex: 0,
    lastLevel: null,
    lastWasHard: false,
    lastShapeId: null,

    // last few selected shape IDs (for soft non-repetition bias)
    recentShapeIds: [],

    // counts by level (0–5)
    levelCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },

    // shared urge/cooldown for hard (4/5)
    urge: { hard: 0.0 },
    cooldown: { hard: 0 },

    // whether we already produced the first hard drop in this run
    hasDroppedFirstHard: false,

    // powerup scheduler (Normal mode)
    powerup: {
      chance: CONFIG.assist.powerups.baseChance,
      cooldown: 0,
      count: 0,
      lastChance: 0, // for the debug panel
    },
  };
}


/* =========================
   Helper: danger estimation
   =========================
   Returns a value in [0, 1]:
   - 0 means the highest locked block is well below the “diff2” band
   - 1 means the highest locked block is at/above the very top row (i.e., game-over territory)
*/
function computeStackDanger01(state) {
  const rows = CONFIG.board.rows;

  const highest = highestLockedRowIndex(state);
  if (highest === null) return 0; // empty board

  // Convert “highest occupied row” into “rows from top that are currently penetrated”.
  const topPenetration = (rows - highest); // bigger = closer to top / worse

  const diff2Band = CONFIG.assist.topRowsForDiff2Only;
  const diff1Band = CONFIG.assist.topRowsForDiff1Only;

  // Soft ramp:
  // - danger is ~0 until we enter the diff2 band
  // - danger approaches 1 as we approach the top row (penetration ~ rows)
  // To keep it interpretable, map penetration within [rows - diff2Band, rows] -> [0, 1].
  const startPenetration = rows - diff2Band;
  const endPenetration = rows; // top

  const t = (topPenetration - startPenetration) / (endPenetration - startPenetration);
  const dangerRaw = clamp01(t);

  // Add extra curvature so the “diff1” band feels meaningfully more urgent.
  // This keeps it soft, but makes near-top assistance kick in harder.
  const diff1StartPenetration = rows - diff1Band;
  const diff1T = clamp01((topPenetration - diff1StartPenetration) / (endPenetration - diff1StartPenetration));

  // Blend: base ramp + a “near-top” ramp.
  const danger = clamp01(0.65 * dangerRaw + 0.35 * diff1T);
  return danger;
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }



function sampleByWeight(items, getWeight, rng) {
  let total = 0;
  for (const it of items) total += Math.max(0, getWeight(it) ?? 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];

  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, getWeight(it) ?? 0);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function getRecencyMultiplier(shapeId, recentIds, lastK, penaltyStrength, minMultiplier) {
  // If the same ID occurred d drops ago (1..K), apply a multiplier that increases with distance.
  // d=1 => strongest penalty; d=K => light penalty; not in window => 1.
  for (let i = recentIds.length - 1, d = 1; i >= 0 && d <= lastK; i--, d++) {
    if (recentIds[i] === shapeId) {
      const t = (lastK - d + 1) / lastK; // closer => larger t
      const mult = 1 - penaltyStrength * t;
      return Math.max(minMultiplier, mult);
    }
  }
  return 1.0;
}

function buildIdToShapeMap(shapes) {
  const m = new Map();
  for (const s of shapes) {
    if (s && typeof s.id === "string") m.set(s.id, s);
  }
  return m;
}

function tryLinkedNextShape(state, prevShape, idToShape, debug = false) {
  if (!prevShape) {
    if (debug) console.log("[LINK] prevShape is null/undefined");
    return null;
  }

  const ids = prevShape.nextShapes;
  const ps = prevShape.nextShapeProbs;

  if (!Array.isArray(ids) || !Array.isArray(ps)) return null;

  if (ids.length === 0 || ids.length !== ps.length) {
    if (debug) console.log("[LINK] invalid arrays", { id: prevShape.id, ids, ps });
    return null;
  }

  // Only consider targets that exist in this mode's pool (e.g. powerup links
  // are ignored in Hard mode), so a missing target never "uses up" the roll.
  const cand = [];
  for (let i = 0; i < ids.length; i++) {
    const shape = idToShape.get(ids[i]);
    const x = Number(ps[i]);
    const p = Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
    if (shape && p > 0) cand.push({ shape, p });
    else if (!shape && debug) console.log("[LINK] id not in this mode's pool", ids[i]);
  }
  if (!cand.length) return null;

  let sumP = 0;
  for (const c of cand) sumP += c.p;
  sumP = Math.min(1, sumP);

  const gate = state.rng();
  if (debug) console.log("[LINK] gate roll", { from: prevShape.id, gate, sumP, triggered: gate < sumP });
  if (gate >= sumP) return null;

  // Sample among linked targets using their probs (normalised within sumP mass).
  const chosen = sampleByWeight(cand, c => c.p, state.rng).shape;
  if (debug) console.log("[LINK] chose", chosen.id);
  return chosen;
}

// ============================================================
// SHAPES — normalisation
// ============================================================

function loadAndNormaliseShapes(rawShapes, defaults = {}) {
  // defaults can include:
  // defaults.style = { baseColor, edgeLight, edgeDark, ... }
  // defaults.difficulty, defaults.frequency, etc.

  if (!Array.isArray(rawShapes)) {
    throw new Error("loadAndNormaliseShapes: rawShapes must be an array");
  }

  // Occupancy rotation (boolean matrix) 90° clockwise
  function rotateMatrix90CW(mat) {
    const H = mat.length;
    const W = mat[0].length;
    const out = Array.from({ length: W }, () => Array(H).fill(false));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        out[x][H - 1 - y] = !!mat[y][x];
      }
    }
    return out;
  }

  // Trim empty rows/cols around a boolean matrix; also report what was cut
  // off the top/left so other grids (colours, powerup areas) can line up.
  function trimMatrix(mat) {
    let top = 0, bottom = mat.length - 1;
    let left = 0, right = mat[0].length - 1;

    const rowEmpty = (y) => mat[y].every(v => !v);
    const colEmpty = (x) => mat.every(row => !row[x]);

    while (top <= bottom && rowEmpty(top)) top++;
    while (bottom >= top && rowEmpty(bottom)) bottom--;
    while (left <= right && colEmpty(left)) left++;
    while (right >= left && colEmpty(right)) right--;

    const out = [];
    for (let y = top; y <= bottom; y++) {
      out.push(mat[y].slice(left, right + 1));
    }
    if (!out.length) return { mat: [[true]], top: 0, left: 0 };
    return { mat: out, top, left };
  }

  function parseShapeGrid(shapeLines) {
    // shapeLines can be:
    // - array of strings, or
    // - a single multiline string
    const lines = Array.isArray(shapeLines)
      ? shapeLines
      : String(shapeLines).split("\n");

    const cleaned = lines
      .map(s => String(s).trimEnd())
      .filter(s => s.trim().length > 0);

    if (cleaned.length === 0) throw new Error("Shape grid is empty");

    const width = Math.max(...cleaned.map(s => s.length));
    const mat = cleaned.map(line => {
      const padded = line.padEnd(width, ".");
      return Array.from(padded).map(ch => ch === "X");
    });

    const trimmed = trimMatrix(mat);
    return { ...trimmed, rawH: mat.length, rawW: width };
  }

  function safeId(name, idx) {
    const base = (name ?? `shape_${idx}`).toString().toLowerCase();
    return base.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function allowedRotationIndices(rotation, isPowerup) {
    // Powerups don't rotate unless their definition says so.
    const mode = rotation?.mode ?? (isPowerup ? "none" : "any");
    if (mode === "none") return [0];
    if (mode === "custom" && Array.isArray(rotation.allowed)) {
      const ok = [...new Set(rotation.allowed.map(n => n | 0).filter(n => n >= 0 && n <= 3))].sort();
      return ok.length ? ok : [0];
    }
    return [0, 1, 2, 3];
  }

  return rawShapes.map((s, idx) => {
    // --- core metadata ---
    const name = (s.name ?? `shape ${idx + 1}`).toString();
    const id = (s.id ?? safeId(name, idx)).toString();

    const difficulty = Number.isFinite(+s.difficulty)
      ? +s.difficulty
      : (Number.isFinite(+defaults.difficulty) ? +defaults.difficulty : 1);

    const frequency = Number.isFinite(+s.frequency)
      ? +s.frequency
      : (Number.isFinite(+defaults.frequency) ? +defaults.frequency : 1);

    // --- occupancy base matrix ---
    const parsed = parseShapeGrid(s.shape ?? s.grid ?? s.matrix);
    const baseMat = parsed.mat;

    // --- generate all 4 rotations, then keep the allowed ones ---
    const allRotations = [baseMat];
    for (let i = 1; i < 4; i++) allRotations.push(rotateMatrix90CW(allRotations[i - 1]));
    const allowed = allowedRotationIndices(s.rotation, !!s.powerup);
    const rotations = allowed.map(i => allRotations[i]);

    // --- style defaults + baseColor selection for shading ---
    const style = { ...(defaults.style ?? {}), ...(s.style ?? {}) };

    // Backwards compatible: s.color may be a string or a 2D grid
    let baseColor = "#FFFFFF";
    if (isHexColour(s.color)) {
      baseColor = s.color.trim();
    } else {
      const grid = normaliseGrid(s.color);
      if (grid) {
        const c0 = firstNonEmptyColour(grid);
        if (c0) baseColor = c0;
      }
    }
    style.baseColor = style.baseColor ?? baseColor;

    // --- colour rotations (optional) ---
    let colorRotations = null;
    let pixelK = 1;

    if (!isHexColour(s.color)) {
      let grid = normaliseGrid(s.color);
      if (grid) {
        const matH0 = baseMat.length;
        const matW0 = baseMat[0].length;
        const gridH0 = grid.length;
        const gridW0 = grid[0].length;

        let k = inferPixelScale(matH0, matW0, gridH0, gridW0);
        if (!k && (parsed.top || parsed.left || parsed.rawH !== matH0 || parsed.rawW !== matW0)) {
          // The colour grid was drawn for the untrimmed grid: crop it to match.
          const kRaw = inferPixelScale(parsed.rawH, parsed.rawW, gridH0, gridW0);
          if (kRaw) {
            k = kRaw;
            grid = grid
              .slice(parsed.top * k, (parsed.top + matH0) * k)
              .map(row => row.slice(parsed.left * k, (parsed.left + matW0) * k));
          }
        }
        if (k) {
          pixelK = k;

          // Clean blanks: "" / "." / null => baseColor
          const cleaned = grid.map(row =>
            row.map(v => (isHexColour(v) ? v.trim() : baseColor))
          );

          // Rotate colour grid to match occupancy rotations
          const allColor = [cleaned];
          for (let i = 1; i < 4; i++) {
            allColor.push(rotateGrid90CW(allColor[i - 1]));
          }
          colorRotations = allowed.map(i => allColor[i]);
        } else {
          console.warn(
            `[${id}] colour grid dims (${gridW0}×${gridH0}) do not match piece dims (${matW0}×${matH0}); falling back to solid baseColor.`
          );
        }
      }
    }

    // Per-rotation, per-block paint (precomputed once so rendering and locking
    // never have to slice pixel grids at runtime).
    const cellPaints = rotations.map((mat, ri) =>
      buildCellPaints(mat, colorRotations?.[ri] ?? null, pixelK, style.baseColor)
    );

    // --- powerup (optional) ---
    let powerup = null;
    if (s.powerup) {
      powerup = normalisePowerup(s.powerup, allRotations, { top: parsed.top, left: parsed.left }, id);
      if (powerup) {
        powerup.areaRotations = allowed.map(i => powerup.areaRotations[i]);
        const fill = normaliseFillPaint(powerup.fill, style.baseColor);
        powerup.fillPaint = fill.paint;
        powerup.fillStyle = { ...style, baseColor: fill.baseColor };
      }
    }

    // --- Preserve linking metadata (and keep backward compat with old nextShape) ---
    const nextShapes = Array.isArray(s.nextShapes)
      ? s.nextShapes.slice()
      : (Array.isArray(s.nextShape) ? s.nextShape.slice() : undefined);

    const nextShapeProbs = Array.isArray(s.nextShapeProbs) ? s.nextShapeProbs.slice() : undefined;

    return {
      id,
      name,
      difficulty,
      frequency,
      style,

      // Keep original colour spec for future extension
      color: s.color,

      // Linking/sequencing metadata (used by selectPiece)
      nextShapes,
      nextShapeProbs,

      // Used by renderer/locking
      colorRotations,
      pixelK,
      cellPaints,

      // Rotations used for collision + placement
      rotations,

      // Powerup behaviour (null for regular shapes)
      powerup,
    };
  });
}

function buildCellPaints(mat, grid, k, baseColor) {
  return mat.map((row, y) => row.map((filled, x) => {
    if (!filled) return null;
    if (!grid) return baseColor;
    if (k === 1) return grid[y][x];
    return { k, pixels: sliceBlockPixels(grid, k, x, y) };
  }));
}

// Expander fill art: "#hex" or a k×k grid of hex colours.
function normaliseFillPaint(fill, fallback) {
  if (isHexColour(fill)) return { paint: fill.trim(), baseColor: fill.trim() };
  const grid = normaliseGrid(fill);
  if (grid && grid.length === grid[0].length && grid.length <= 7) {
    const base = firstNonEmptyColour(grid) ?? fallback;
    const pixels = grid.map(row => row.map(v => (isHexColour(v) ? v.trim() : base)));
    if (pixels.length === 1) return { paint: pixels[0][0], baseColor: base };
    return { paint: { k: pixels.length, pixels }, baseColor: base };
  }
  return { paint: fallback, baseColor: fallback };
}

// ===============================
// Pixel-art colour grid utilities
// ===============================

// Returns true if value looks like a hex colour string (#RGB, #RRGGBB, #RRGGBBAA not supported here)
function isHexColour(s) {
  return typeof s === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s.trim());
}

function firstNonEmptyColour(grid) {
  for (const row of grid) {
    for (const c of row) {
      if (isHexColour(c)) return c.trim();
    }
  }
  return null;
}

// Ensure rectangular 2D array
function normaliseGrid(grid) {
  if (!Array.isArray(grid) || grid.length === 0) return null;
  const w = Array.isArray(grid[0]) ? grid[0].length : 0;
  if (w === 0) return null;
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== w) return null;
  }
  return grid;
}

// Infer pixel scale k such that grid is (k*h) x (k*w) for a given block matrix h x w.
// Returns k in {1..7} or null.
function inferPixelScale(matH, matW, gridH, gridW) {
  if (gridH % matH !== 0) return null;
  if (gridW % matW !== 0) return null;
  const kH = gridH / matH;
  const kW = gridW / matW;
  if (kH !== kW) return null;
  const MAX_K = 7; // rendering cost scales with k^2
  if (kH < 1 || kH > MAX_K) return null;
  return kH;
}

// Rotate a 2D array 90° clockwise (works for any element type)
function rotateGrid90CW(grid) {
  const H = grid.length;
  const W = grid[0].length;
  const out = Array.from({ length: W }, () => Array(H));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      out[x][H - 1 - y] = grid[y][x];
    }
  }
  return out;
}

// Slice a k×k pixel block from a rotated colour grid at block coords (bx, by)
function sliceBlockPixels(colorGridRot, k, bx, by) {
  const y0 = by * k;
  const x0 = bx * k;
  const pixels = [];
  for (let py = 0; py < k; py++) {
    const row = [];
    for (let px = 0; px < k; px++) {
      row.push(colorGridRot[y0 + py][x0 + px]);
    }
    pixels.push(row);
  }
  return pixels;
}

function getShapePaint(shape, rotIdx, bx, by) {
  return shape.cellPaints[rotIdx][by][bx];
}


// ============================================================
// GAME CORE
// ============================================================

function createEmptyBoard(cols, rows) {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

function highestLockedRowIndex(state) {
  // Returns smallest y (closest to top) that contains ANY locked block.
  // If board empty, returns null.
  for (let y = 0; y < CONFIG.board.rows; y++) {
    const row = state.board[y];
    for (let x = 0; x < CONFIG.board.cols; x++) {
      if (row[x]) return y;
    }
  }
  return null;
}

function isStackInTopRows(state, topRows) {
  const y = highestLockedRowIndex(state);
  if (y === null) return false;
  return y < topRows; // e.g., y=0..(topRows-1)
}

// Every change to state.board must call this (the renderer caches the board).
function markBoardDirty(state) {
  state.boardVersion++;
}

function createGameState(shapes, powerups) {
  const state = {
    allShapes: shapes,
    allPowerups: powerups,

    // Pools for the current mode (see configureMode)
    mode: CONFIG.defaultMode,
    shapes,
    powerups: [],
    idToShape: buildIdToShapeMap(shapes),

    rng: Math.random,

    board: createEmptyBoard(CONFIG.board.cols, CONFIG.board.rows),
    boardVersion: 0,
    nextPid: 1, // piece-instance id stored on each locked cell

    active: null,
    next: null,
    running: false,
    paused: false,
    gameOver: false,

    score: 0,
    lines: 0,
    blocksDestroyed: 0,
    level: 1,

    dropMs: CONFIG.timing.baseDropMs,
    dropAccum: 0,

    softDropping: false,

    debug: false,
    touch: {
      active: false,
      startX: 0,
      startY: 0,
      startT: 0,
      lastTapT: 0,
    },

    locking: false,
    lockElapsed: 0,

    lastInputType: "keyboard",
    lastInputAt: 0,

    tapRepeatTimer: null,
    tapRepeatInterval: null,

    // A powerup that has locked and is playing its effect (no active piece meanwhile)
    effect: null,

    lastLockedShape: null,
    gameOverInfo: {
      pieceName: "",
      shape: null,
    },

    fx: {
      particles: [],
      rowFall: {
        active: false,
        elapsedMs: 0,
        durationMs: CONFIG.fx.lineClear.boardFallAnimMs,
        rowDropDistances: Array(CONFIG.board.rows).fill(0),
      },
      // Gravity powerup: blocks slide from old to new positions
      moveAnim: { active: false, elapsedMs: 0, durationMs: 0, byIndex: new Map() },
      // Expander powerup: filled cells pop in
      growAnim: { active: false, elapsedMs: 0, durationMs: 0, growMs: 0, byIndex: new Map() },
      // Destroyer powerup: white flash where blocks were
      flash: { active: false, elapsedMs: 0, durationMs: 0, cells: [] },
      quake: {
        trauma: 0,
        x: 0,
        y: 0,
        rot: 0,
        seed: Math.random() * 1000,
      },
      gameOverBackdrop: {
        snapshotCanvas: null,
        elapsedMs: 0,
        currentAngle: 0,
        dirX: 1,
        dirY: 0.3,
        offsetX: 0,
        offsetY: 0,
      },
    },
  };
  configureMode(state, CONFIG.defaultMode);
  return state;
}

function configureMode(state, modeId) {
  state.mode = CONFIG.modes[modeId] ? modeId : CONFIG.defaultMode;
  state.shapes = state.allShapes;
  state.powerups = CONFIG.modes[state.mode].powerups ? state.allPowerups : [];
  state.idToShape = buildIdToShapeMap([...state.shapes, ...state.powerups]);
}

function getDifficultyZone(state) {
  const inDiff1Zone = isStackInTopRows(state, CONFIG.assist.topRowsForDiff1Only);
  const inDiff2Zone = !inDiff1Zone && isStackInTopRows(state, CONFIG.assist.topRowsForDiff2Only);

  if (inDiff1Zone) return { zone: "assist: difficulty ≤ 1 (strict)", cap: 1 };
  if (inDiff2Zone) return { zone: "assist: difficulty ≤ 2 (sometimes >2)", cap: 2 };
  return { zone: "normal", cap: Infinity };
}

/* =========================================
   Piece selection (level-aware + soft)
   =========================================
   Order of precedence for each drop:
   1. linked shapes (prev.nextShapes / nextShapeProbs)
   2. powerup scheduler (Normal mode only)
   3. regular level mix: (a) choose level, (b) choose shape within level
*/

function selectPiece(state) {
  if (!state.pieceSel) initPieceSelectionState(state);

  const sel = state.pieceSel;
  sel.dropIndex += 1;

  const mixCfg = CONFIG.assist.pieceMix;
  const danger01 = computeStackDanger01(state);
  const danger = clamp01(danger01 * (mixCfg.dangerBiasStrength ?? 1.0));

  // Cooldowns tick down.
  if (sel.cooldown.hard > 0) sel.cooldown.hard -= 1;
  if (sel.powerup.cooldown > 0) sel.powerup.cooldown -= 1;

  const idToShape = state.idToShape;
  const prevShape = sel.lastShapeId ? idToShape.get(sel.lastShapeId) : null;

  const linked = tryLinkedNextShape(state, prevShape, idToShape, DEBUG_LINK);

  if (linked) {
    if (DEBUG_LINK) console.log("[LINK] APPLY", { from: prevShape?.id, to: linked.id });
    commitSelectedShape(sel, linked);

    if (linked.powerup) {
      notePowerupDropped(sel);
    } else {
      const lvl = (linked.difficulty ?? 1);
      if (lvl === 4 || lvl === 5) {
        const hardCfg = CONFIG.assist.pieceMix.hard;
        sel.urge.hard = 0.0;
        sel.cooldown.hard = Math.max(sel.cooldown.hard ?? 0, hardCfg.cooldownDrops ?? 9);
        sel.hasDroppedFirstHard = true;
      }
    }
    return linked;
  }

  // Powerups (Normal mode).
  if (state.powerups.length) {
    const pu = maybeSelectPowerup(state, danger01);
    if (pu) {
      commitSelectedShape(sel, pu);
      notePowerupDropped(sel);
      return pu;
    }
  }

  // Keys for level weights (0–5).
  const LEVELS = [0, 1, 2, 3, 4, 5];

  // 1) Opening blend -> base.
  const baseW = normaliseWeights({ ...mixCfg.baseLevelWeight });
  const openingW = normaliseWeights({ ...mixCfg.openingLevelWeight });

  const openingDrops = Math.max(0, mixCfg.openingDrops | 0);
  const openingT = openingDrops > 0 ? clamp01(1 - (sel.dropIndex - 1) / openingDrops) : 0;

  let levelW = {};
  for (const k of LEVELS) levelW[k] = lerp(baseW[k] ?? 0, openingW[k] ?? 0, openingT);

  // 2) Danger blend towards assistance mix (never allocates to 4/5 directly).
  const dangerTarget = normaliseWeights({ ...mixCfg.dangerTargetMix });
  for (const k of LEVELS) levelW[k] = lerp(levelW[k] ?? 0, dangerTarget[k] ?? 0, danger);

  // 3) Hard scheduler (4/5 share the same urge/cooldown).
  const hardCfg = mixCfg.hard;

  const pastMinHard = sel.dropIndex > (hardCfg.minDropIndex ?? 5);
  const dangerAllowsHard = danger01 <= (hardCfg.hardMaxDanger ?? 0.32);
  const cooldownAllowsHard = (sel.cooldown.hard ?? 0) <= 0 && !sel.lastWasHard;

  const allowHard = pastMinHard && dangerAllowsHard && cooldownAllowsHard;

  // Update shared hard urge every call.
  const inWindow =
    sel.dropIndex >= (hardCfg.softWindowStart ?? 6) &&
    sel.dropIndex <= (hardCfg.softWindowEnd ?? 25);

  const recharge = (hardCfg.rechargePerDrop ?? 0.005) * (inWindow ? 1.4 : 0.8);
  sel.urge.hard = clamp01(Math.min(hardCfg.maxUrge ?? 0.95, (sel.urge.hard ?? 0) + recharge));

  const addHardWeight = allowHard ? (sel.urge.hard ?? 0) : 0;

  // Inject hard weight by allocating it to 4/5 (not to the whole distribution).
  // This keeps baseline/danger behaviour intact while allowing periodic “hard surprises”.
  if (addHardWeight > 0) {
    // Compute probability of choosing a 5 vs 4, with 5 suppressed as danger rises.
    let p5 = hardCfg.baseProbLevel5WhenHard ?? 0.55;

    const dFull = hardCfg.level5FullAllowedDanger ?? 0.12;
    const dNever = hardCfg.level5AlmostNeverDanger ?? 0.28;

    // Suppression factor: 1 below dFull, ~0 above dNever, smooth in between.
    const t = clamp01((danger01 - dFull) / Math.max(1e-6, (dNever - dFull)));
    const suppression = 1 - t; // linear; adjust later if you want a steeper curve
    p5 = p5 * suppression;

    // First hard preference: try to make the first hard a 5 if possible (and not heavily suppressed).
    if ((hardCfg.preferLevel5ForFirstHard ?? true) && !sel.hasDroppedFirstHard) {
      const anyLevel5Exists = state.shapes.some(s => (s.difficulty ?? 1) === 5 && (s.frequency ?? 1) >= 0);
      if (anyLevel5Exists && suppression > 0.25) p5 = Math.max(p5, 0.80);
    }

    // Allocate injected weight into levels 4 and 5.
    levelW[4] = (levelW[4] ?? 0) + addHardWeight * (1 - p5);
    levelW[5] = (levelW[5] ?? 0) + addHardWeight * p5;
  } else {
    // Ensure these are not accidentally non-zero from upstream configs.
    levelW[4] = 0;
    levelW[5] = 0;
  }

  // Softly suppress level 3 in danger to prevent “still awkward at the top”.
  levelW[3] *= (1 - 0.65 * danger);

  // Hard-ban level 0 for the first few drops.
  // NOTE: openingNoLevel0UntilDrop lives in CONFIG.assist, not pieceMix, so this
  // reads undefined and the ban is currently off. Left as-is so the tuned
  // balance doesn't change; point it at CONFIG.assist to switch the ban on.
  if (sel.dropIndex <= (mixCfg.openingNoLevel0UntilDrop ?? 0)) {
    levelW[0] = 0;
  }

  levelW = normaliseWeights(levelW);

  // Choose a level.
  const chosenLevel = sampleDiscrete(levelW, state.rng);

  // Candidate shapes in that level (frequency>0), then weighted by frequency * recency multiplier.
  let candidates = state.shapes.filter(s =>
    (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) === chosenLevel
  );

  // Fallback: if no shapes exist for that level, broaden to any frequency>0.
  if (candidates.length === 0) {
    candidates = state.shapes.filter(s => (s.frequency ?? 1) > 0);
  }
  if (candidates.length === 0) {
    return state.shapes[Math.floor(state.rng() * state.shapes.length)];
  }

  // Soft anti-repeat within last K: multiply frequency by a recency factor (never zero).
  const chosenShape = sampleByWeight(
    candidates,
    (s) => (s.frequency ?? 1) * recencyMultiplierFor(sel, s),
    state.rng
  );

  // Commit selection + update trackers (incl. hard bookkeeping).
  commitSelectedShape(sel, chosenShape);

  // If we dropped a hard shape, reset shared urge and start shared cooldown.
  const lvl = (chosenShape.difficulty ?? 1);
  if (lvl === 4 || lvl === 5) {
    sel.urge.hard = 0.0;
    sel.cooldown.hard = Math.max(sel.cooldown.hard ?? 0, hardCfg.cooldownDrops ?? 9);
    sel.hasDroppedFirstHard = true;
  }

  return chosenShape;
}

function recencyMultiplierFor(sel, shape) {
  const recCfg = CONFIG.assist.pieceMix.recency ?? {};
  if (typeof shape.id !== "string") return 1.0;
  return getRecencyMultiplier(
    shape.id,
    sel.recentShapeIds,
    recCfg.lastK ?? 5,
    recCfg.penaltyStrength ?? 0.75,
    recCfg.minMultiplier ?? 0.15
  );
}

/* =========================================
   Powerup scheduler (Normal mode)
   =========================================
   Decides IF a powerup is due (an accumulating chance, boosted by danger and
   air pockets) and THEN WHICH one (frequency × tier-for-danger × class-need ×
   recency).
*/
function maybeSelectPowerup(state, danger01) {
  const cfg = CONFIG.assist.powerups;
  const sel = state.pieceSel;
  const ps = sel.powerup;

  if (sel.dropIndex <= (cfg.minDropIndex ?? 0)) return null;
  if (ps.cooldown > 0) return null;

  const stats = analyseBoard(state.board);
  const holes01 = clamp01(stats.holes / Math.max(1, cfg.holesForMax ?? 18));

  const boost = 1 + (cfg.dangerBoost ?? 0) * danger01 + (cfg.holesBoost ?? 0) * holes01;
  const chance = clamp01(ps.chance * boost);
  ps.lastChance = chance;

  if (state.rng() >= chance) {
    ps.chance = Math.min(cfg.maxChance ?? 0.6, ps.chance + (cfg.chancePerDrop ?? 0.03));
    return null;
  }

  const candidates = state.powerups.filter(p => (p.frequency ?? 1) > 0);
  if (!candidates.length) return null;

  const tw = cfg.tierWeights;
  const need = cfg.need ?? {};

  return sampleByWeight(candidates, (p) => {
    const tier = p.powerup.tier;
    const tierW = lerp(tw.calm[tier] ?? 1, tw.danger[tier] ?? 1, danger01);
    const n = need[p.powerup.type] ?? { base: 1 };
    const needW = (n.base ?? 1) + (n.holes ?? 0) * holes01 + (n.danger ?? 0) * danger01;
    return (p.frequency ?? 1) * tierW * needW * recencyMultiplierFor(sel, p);
  }, state.rng);
}

function notePowerupDropped(sel) {
  const cfg = CONFIG.assist.powerups;
  sel.powerup.chance = cfg.baseChance ?? 0.05;
  sel.powerup.cooldown = cfg.cooldownDrops ?? 5;
  sel.powerup.count++;
}

function commitSelectedShape(sel, shape) {
  sel.lastShapeId = (typeof shape.id === "string") ? shape.id : null;

  if (shape.powerup) {
    // Powerups sit outside the 0–5 difficulty levels.
    sel.lastWasHard = false;
  } else {
    const lvl = (shape.difficulty ?? 1);
    sel.lastLevel = lvl;
    sel.lastWasHard = (lvl === 4 || lvl === 5);
    sel.levelCounts[lvl] = (sel.levelCounts[lvl] ?? 0) + 1;
  }

  if (sel.lastShapeId) {
    sel.recentShapeIds.push(sel.lastShapeId);

    // Keep a modest history buffer (only last ~20 needed even if lastK=5).
    if (sel.recentShapeIds.length > 24) sel.recentShapeIds.splice(0, sel.recentShapeIds.length - 24);
  }
}

/* =========================
   Sampling helpers
   ========================= */

function normaliseWeights(w) {
  let total = 0;
  for (const k of Object.keys(w)) total += Math.max(0, w[k] ?? 0);
  if (total <= 0) {
    // Safe fallback: uniform over 0–3 (never 4) if everything went to zero.
    return { 0: 0.25, 1: 0.25, 2: 0.25, 3: 0.25, 4: 0.0, 5: 0.0 };
  }
  const out = {};
  for (const k of Object.keys(w)) out[k] = Math.max(0, w[k] ?? 0) / total;
  // Ensure all  keys exist.
  for (const k of [0, 1, 2, 3, 4, 5]) out[k] = out[k] ?? 0;
  return out;
}

function sampleDiscrete(probByKey, rng) {
  // probByKey: {0: p0, 1: p1, ...} assumed normalised, but not required.
  let total = 0;
  for (const k of Object.keys(probByKey)) total += Math.max(0, probByKey[k] ?? 0);
  if (total <= 0) return 1;

  let r = rng() * total;
  const keys = Object.keys(probByKey).map(k => Number(k)).sort((a, b) => a - b);
  for (const k of keys) {
    r -= Math.max(0, probByKey[k] ?? 0);
    if (r <= 0) return k;
  }
  return keys[keys.length - 1];
}

function getActiveMatrix(state) {
  return state.active.shape.rotations[state.active.rotIdx];
}

function getGhostDropY(state) {
  if (!state.active) return null;

  const mat = getActiveMatrix(state);
  let ghostY = state.active.y;

  while (!collides(state, state.active.x, ghostY + 1, mat)) {
    ghostY += 1;
  }

  return ghostY;
}

function spawnPiece(state) {
  if (!state.next) state.next = selectPiece(state);
  const shape = state.next;
  state.next = selectPiece(state);

  const rotIdx = 0;
  const mat = shape.rotations[rotIdx];
  const w = mat[0].length;

  state.active = {
    shape,
    rotIdx,
    x: Math.floor((CONFIG.board.cols - w) / 2),

    // Start fully above the board so entry is row-by-row, even for tall pieces
    y: -mat.length,
  };

  return !collides(state, state.active.x, state.active.y, mat);
}

function collides(state, px, py, mat) {
  for (let y = 0; y < mat.length; y++) {
    for (let x = 0; x < mat[0].length; x++) {
      if (!mat[y][x]) continue;
      const bx = px + x;
      const by = py + y;
      if (bx < 0 || bx >= CONFIG.board.cols) return true;
      if (by >= CONFIG.board.rows) return true;
      if (by >= 0 && state.board[by][bx]) return true;
    }
  }
  return false;
}

function markInput(state, type) {
  state.lastInputType = type;
  state.lastInputAt = performance.now();
}

function currentLockDelayMs(state) {
  // treat as touch if touch input occurred recently
  const now = performance.now();
  const recentTouch = (state.lastInputType === "touch") && (now - state.lastInputAt < 1200);
  return recentTouch ? CONFIG.timing.lockDelayMsTouch : CONFIG.timing.lockDelayMsKeyboard;
}

function beginLockIfNeeded(state) {
  if (!state.locking) {
    state.locking = true;
    state.lockElapsed = 0;
  }
}

function cancelLock(state) {
  state.locking = false;
  state.lockElapsed = 0;
}

function tryMove(state, dx, dy) {
  const mat = getActiveMatrix(state);
  const nx = state.active.x + dx;
  const ny = state.active.y + dy;
  if (!collides(state, nx, ny, mat)) {
    // If player nudges a piece while it's in lock grace, reset the timer.
    if (dx !== 0 || dy !== 0) cancelLock(state);
    state.active.x = nx;
    state.active.y = ny;
    return true;
  }
  return false;
}

function tryRotate(state) {
  const shape = state.active.shape;
  if (shape.rotations.length <= 1) return false;

  const nextIdx = (state.active.rotIdx + 1) % shape.rotations.length;
  const nextMat = shape.rotations[nextIdx];

  const kicks = [
    { x: 0, y: 0 }, { x: -1, y: 0 }, { x: +1, y: 0 },
    { x: -2, y: 0 }, { x: +2, y: 0 }, { x: 0, y: -1 },
  ];

  for (const k of kicks) {
    const nx = state.active.x + k.x;
    const ny = state.active.y + k.y;
    if (!collides(state, nx, ny, nextMat)) {
      state.active.rotIdx = nextIdx;
      state.active.x = nx;
      state.active.y = ny;
      cancelLock(state);
      return true;
    }
  }
  return false;
}

// Locks the active piece into the board. Returns info about the placement.
function lockPiece(state) {
  const { shape, rotIdx } = state.active;
  const mat = getActiveMatrix(state);
  const pid = state.nextPid++;

  let lockedAboveTop = false;
  const placed = [];

  for (let y = 0; y < mat.length; y++) {
    for (let x = 0; x < mat[0].length; x++) {
      if (!mat[y][x]) continue;

      const bx = state.active.x + x;
      const by = state.active.y + y;

      if (by < 0) {
        lockedAboveTop = true;
        continue;
      }

      state.board[by][bx] = { paint: getShapePaint(shape, rotIdx, x, y), style: shape.style, pid };
      placed.push({ x: bx, y: by });
    }
  }
  markBoardDirty(state);

  state.lastLockedShape = shape;

  if ((shape.difficulty ?? 0) >= (CONFIG.fx.largePieceLock.minDifficulty ?? 5) && !shape.powerup) {
    addQuakeFromBlocks(state, placed.length);
  }

  // A powerup that vanishes when it fires can't top you out.
  const consumed = !!shape.powerup?.consume;
  if (lockedAboveTop && !consumed) {
    setGameOver(state, shape);
  }

  return { shape, rotIdx, x: state.active.x, y: state.active.y, pid, placed };
}

function setGameOver(state, shape) {
  state.gameOver = true;
  state.running = false;
  state.effect = null;
  state.gameOverInfo.pieceName = shape?.name ?? "";
  state.gameOverInfo.shape = shape ?? null;
  state.fx.gameOverBackdrop.snapshotCanvas = makeBoardSnapshotCanvas(state);
  state.fx.gameOverBackdrop.elapsedMs = 0;
}

function clearFullLines(state) {
  const rows = CONFIG.board.rows;
  const cols = CONFIG.board.cols;

  const fullRows = [];
  for (let y = 0; y < rows; y++) {
    if (state.board[y].every((c) => c !== null)) fullRows.push(y);
  }

  const cleared = fullRows.length;
  if (cleared === 0) return 0;

  const fullRowsSet = new Set(fullRows);
  const fallingBlocks = countFallingBlocksAfterClear(state.board, fullRowsSet);

  const { removed, dropDistances } = collapseRows(state.board, fullRows, cols);
  markBoardDirty(state);

  spawnCellParticles(state, rowsToCells(removed));
  startRowFall(state, dropDistances);

  state.lines += cleared;
  state.blocksDestroyed += cleared * cols;

  const base = CONFIG.scoring.lineClear[cleared] ?? (cleared * 100);
  state.score += base * state.level;

  const newLevel = 1 + Math.floor(state.lines / CONFIG.timing.levelEveryLines);
  if (newLevel !== state.level) {
    state.level = newLevel;
    recomputeSpeed(state);
  }

  addQuakeFromBlocks(state, fallingBlocks);

  return cleared;
}

function rowsToCells(removedRows) {
  const out = [];
  for (const { y, cells } of removedRows) {
    for (let x = 0; x < cells.length; x++) {
      if (cells[x]) out.push({ x, y, cell: cells[x] });
    }
  }
  return out;
}

function startRowFall(state, dropDistances) {
  const rf = state.fx.rowFall;
  rf.active = dropDistances.some(d => d > 0);
  rf.elapsedMs = 0;
  rf.durationMs = CONFIG.fx.lineClear.boardFallAnimMs;
  rf.rowDropDistances = dropDistances;
}

function recomputeSpeed(state) {
  const mult = Math.pow(CONFIG.timing.speedMultiplierPerLevel, state.level - 1);
  state.dropMs = Math.max(CONFIG.timing.minDropMs, Math.floor(CONFIG.timing.baseDropMs * mult));
}

// ============================================================
// POWERUP EFFECTS
// ============================================================
// Sequence after a powerup locks:
//   "charge" (piece + highlighted cells glow)  ->  fire the effect
//   "settle" (blocks fly / slide / grow)       ->  line clears, next piece

function beginPowerupEffect(state, lockInfo) {
  const { shape, rotIdx, x, y } = lockInfo;
  const pu = shape.powerup;
  const mat = shape.rotations[rotIdx];

  state.effect = {
    ...lockInfo,
    pu,
    area: resolveArea(pu.areaRotations[rotIdx], x, y, CONFIG.board.cols, CONFIG.board.rows),
    centre: { x: x + (mat[0].length - 1) / 2, y: y + (mat.length - 1) / 2 },
    phase: "charge",
    elapsedMs: 0,
    durationMs: CONFIG.fx.powerup.chargeMs,
    quakeOnSettle: 0,
  };
}

function updatePowerupEffect(state, dt, ctx) {
  const e = state.effect;
  e.elapsedMs += dt;
  if (e.elapsedMs < e.durationMs) return;

  if (e.phase === "charge") {
    e.durationMs = firePowerupEffect(state, e);
    e.phase = "settle";
    e.elapsedMs = 0;
    return;
  }

  // settle finished
  if (e.quakeOnSettle > 0) addQuakeFromBlocks(state, e.quakeOnSettle);
  state.effect = null;
  finishTurn(state, ctx);
}

// Applies the effect to the board. Returns how long to wait before continuing.
function firePowerupEffect(state, e) {
  const cfg = CONFIG.fx.powerup;
  const cols = CONFIG.board.cols;
  const rows = CONFIG.board.rows;
  const board = state.board;
  const pu = e.pu;
  let settleMs = 0;

  if (pu.consume) {
    const gone = [];
    for (const { x, y } of e.placed) {
      const c = board[y][x];
      if (c && c.pid === e.pid) {
        gone.push({ x, y, cell: c });
        board[y][x] = null;
      }
    }
    spawnCellParticles(state, gone, 0.6);
  }

  if (pu.type === "destroyer") {
    const destroyed = applyDestroy(board, e.area, cols);
    spawnCellParticles(state, destroyed);
    startFlash(state, destroyed, cfg.destroyFlashMs);

    state.blocksDestroyed += destroyed.length;
    state.score += destroyed.length * (CONFIG.scoring.powerupDestroyPerBlock ?? 0) * state.level;
    addQuakeFromBlocks(state, destroyed.length * (cfg.destroyQuakePerBlock ?? 1));
    settleMs = cfg.destroySettleMs;

    if (pu.collapse && e.area.fullRows.length) {
      const { dropDistances } = collapseRows(board, e.area.fullRows, cols);
      startRowFall(state, dropDistances);
      settleMs = Math.max(settleMs, CONFIG.fx.lineClear.boardFallAnimMs);
    }
  } else if (pu.type === "gravity") {
    const moves = applyGravity(board, e.area, cols, rows, pu.direction);
    settleMs = startMoveAnim(state, moves);
    e.quakeOnSettle = moves.length * (cfg.gravityQuakePerBlock ?? 1);
  } else if (pu.type === "expander") {
    const fillPid = state.nextPid++;
    const filled = applyExpand(board, e.area, cols, () => ({
      paint: pu.fillPaint,
      style: pu.fillStyle,
      pid: fillPid,
    }));
    settleMs = startGrowAnim(state, filled, e.centre);
  }

  markBoardDirty(state);
  return settleMs;
}

function startMoveAnim(state, moves) {
  const cfg = CONFIG.fx.powerup;
  const cols = CONFIG.board.cols;
  const anim = state.fx.moveAnim;
  anim.byIndex.clear();
  anim.elapsedMs = 0;
  let longest = 0;

  for (const m of moves) {
    const ox = m.fromX - m.toX;
    const oy = m.fromY - m.toY;
    const dist = Math.abs(ox) + Math.abs(oy);
    const dur = Math.min(cfg.gravityMaxMs, cfg.gravityBaseMs + cfg.gravityMsPerSqrtCell * Math.sqrt(dist));
    anim.byIndex.set(m.toY * cols + m.toX, { ox, oy, dur });
    longest = Math.max(longest, dur);
  }

  anim.durationMs = longest;
  anim.active = moves.length > 0;
  return longest;
}

function startGrowAnim(state, filled, centre) {
  const cfg = CONFIG.fx.powerup;
  const cols = CONFIG.board.cols;
  const anim = state.fx.growAnim;
  anim.byIndex.clear();
  anim.elapsedMs = 0;
  anim.growMs = cfg.expandGrowMs;
  let maxDelay = 0;

  for (const { x, y } of filled) {
    const delay = Math.hypot(x - centre.x, y - centre.y) * cfg.expandStaggerMsPerCell;
    anim.byIndex.set(y * cols + x, delay);
    maxDelay = Math.max(maxDelay, delay);
  }

  anim.durationMs = filled.length ? maxDelay + cfg.expandGrowMs : 0;
  anim.active = filled.length > 0;
  return anim.durationMs;
}

function startFlash(state, cells, durationMs) {
  const f = state.fx.flash;
  f.cells = cells.map(({ x, y }) => ({ x, y }));
  f.elapsedMs = 0;
  f.durationMs = durationMs;
  f.active = cells.length > 0;
}

/// FX HELPERS

function addQuakeFromBlocks(state, blockCount) {
  const cfg = CONFIG.fx.quake;
  if (!cfg.enabled) return;

  const n = Math.max(0, Number(blockCount) || 0);
  if (n <= 0) return;

  const t = clamp01(n / Math.max(1, cfg.blocksForMax ?? 28));
  const scaled = Math.pow(t, cfg.blockScalePower ?? 0.85);
  const trauma = lerp(cfg.minTrauma ?? 0.10, cfg.maxTrauma ?? 0.38, scaled);

  // Use the stronger of the current quake and the new trigger,
  // rather than stacking to disruptive levels.
  state.fx.quake.trauma = Math.max(state.fx.quake.trauma ?? 0, trauma);
}

function makeBoardSnapshotCanvas(state) {
  const cell = CONFIG.render.cellPx;
  const w = CONFIG.board.cols * cell;
  const h = CONFIG.board.rows * cell;
  const cvs = document.createElement("canvas");
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext("2d");

  for (let y = 0; y < CONFIG.board.rows; y++) {
    for (let x = 0; x < CONFIG.board.cols; x++) {
      const cellObj = state.board[y][x];
      if (!cellObj) continue;
      drawBlockWithPaintStatic(ctx, x * cell, y * cell, cell, cellObj.paint, cellObj.style);
    }
  }

  return cvs;
}

function drawBlockWithPaintStatic(ctx, px, py, cellSize, paint, style = {}) {
  if (typeof paint === "string") {
    ctx.fillStyle = paint;
    ctx.fillRect(px, py, cellSize, cellSize);
  } else if (paint && typeof paint === "object" && paint.pixels && paint.k) {
    const k = paint.k;
    const xb = new Array(k + 1);
    const yb = new Array(k + 1);
    for (let i = 0; i <= k; i++) {
      xb[i] = px + Math.round((i * cellSize) / k);
      yb[i] = py + Math.round((i * cellSize) / k);
    }
    for (let sy = 0; sy < k; sy++) {
      for (let sx = 0; sx < k; sx++) {
        const x0 = xb[sx], x1 = xb[sx + 1];
        const y0 = yb[sy], y1 = yb[sy + 1];
        const c = paint.pixels?.[sy]?.[sx];
        ctx.fillStyle = (typeof c === "string" && isHexColour(c)) ? c : (style.baseColor ?? "#FFFFFF");
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
  } else {
    ctx.fillStyle = style.baseColor ?? "#FFFFFF";
    ctx.fillRect(px, py, cellSize, cellSize);
  }
}

// Particles burst from cells [{x, y, cell}] (board coords). `mult` scales the count.
function spawnCellParticles(state, cells, mult = 1) {
  if (!CONFIG.fx.lineClear.enabled) return;

  const cfg = CONFIG.fx.lineClear;
  const cellPx = CONFIG.render.cellPx;

  for (const { x, y, cell: cellObj } of cells) {
    if (!cellObj) continue;

    const paint = cellObj.paint;
    const px = x * cellPx;
    const py = y * cellPx;

    let colours = [];
    if (typeof paint === "string") {
      colours = [paint];
    } else if (paint?.pixels) {
      for (const row of paint.pixels) {
        for (const c of row) {
          if (typeof c === "string") colours.push(c);
        }
      }
    }
    if (colours.length === 0) colours = [cellObj.style?.baseColor ?? "#FFFFFF"];

    const targetCount = Math.round(mult * Math.min(
      cfg.maxParticlesPerCell,
      Math.max(6, Math.round(colours.length * (cfg.particlesPerPixel ?? 0.35)))
    ));

    for (let i = 0; i < targetCount; i++) {
      const angle = state.rng() * Math.PI * 2;
      const speed = lerp(cfg.speedMin, cfg.speedMax, state.rng());
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - speed * (cfg.upwardBias ?? 0.18);
      const lifeMs = lerp(cfg.lifeMinMs, cfg.lifeMaxMs, state.rng());
      const size = cfg.particleSizePx;

      state.fx.particles.push({
        x: px + state.rng() * cellPx,
        y: py + state.rng() * cellPx,
        vx,
        vy,
        lifeMs,
        maxLifeMs: lifeMs,
        size,
        color: colours[Math.floor(state.rng() * colours.length)],
      });
    }
  }
}

function countFallingBlocksAfterClear(oldBoard, fullRowsSet) {
  const rows = CONFIG.board.rows;
  const cols = CONFIG.board.cols;
  let fallingBlocks = 0;
  let clearedBelow = 0;

  // Walk bottom-up so "rows cleared below" is a running count.
  for (let y = rows - 1; y >= 0; y--) {
    if (fullRowsSet.has(y)) { clearedBelow++; continue; }
    if (clearedBelow <= 0) continue; // this row doesn't drop

    for (let x = 0; x < cols; x++) {
      if (oldBoard[y][x] !== null) fallingBlocks++;
    }
  }

  return fallingBlocks;
}

function updateFX(state, dt) {
  const dtSec = dt / 1000;

  const parts = state.fx.particles;
  if (parts.length) {
    const cfg = CONFIG.fx.lineClear;
    const drag = Math.max(0, 1 - cfg.dragPerSecond * dtSec);
    let n = 0;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.lifeMs -= dt;
      if (p.lifeMs <= 0) continue;

      p.vx *= drag;
      p.vy = p.vy * drag + cfg.gravityPxPerSec2 * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;

      parts[n++] = p;
    }
    parts.length = n; // compact in place (no per-frame allocation)
  }

  const rf = state.fx.rowFall;
  if (rf.active) {
    rf.elapsedMs += dt;
    if (rf.elapsedMs >= rf.durationMs) {
      rf.active = false;
      rf.elapsedMs = 0;
      rf.rowDropDistances.fill(0);
    }
  }

  for (const anim of [state.fx.moveAnim, state.fx.growAnim, state.fx.flash]) {
    if (!anim.active) continue;
    anim.elapsedMs += dt;
    if (anim.elapsedMs >= anim.durationMs) anim.active = false;
  }

  const q = state.fx.quake;
  q.trauma = Math.max(0, q.trauma - CONFIG.fx.quake.traumaDecayPerSecond * dtSec);
  q.seed += dtSec * 11.7;

  if (state.gameOver) {
    const bg = state.fx.gameOverBackdrop;
    bg.elapsedMs += dt;

    if (
      !bg.snapshotCanvas ||
      bg.elapsedMs >= CONFIG.fx.gameOverBackdrop.cutEveryMs
    ) {
      bg.snapshotCanvas = makeBoardSnapshotCanvas(state);
      bg.elapsedMs = 0;
      bg.currentAngle = (state.rng() * 2 - 1) * CONFIG.fx.gameOverBackdrop.rotationDeg;
      const a = state.rng() * Math.PI * 2;
      bg.dirX = Math.cos(a);
      bg.dirY = Math.sin(a);
      bg.offsetX = 0;
      bg.offsetY = 0;
    }

    const speed = CONFIG.fx.gameOverBackdrop.movePxPerSec;
    bg.offsetX += bg.dirX * speed * dtSec;
    bg.offsetY += bg.dirY * speed * dtSec;
  }
}

// ============================================================
// BLOCK DRAWING (shared by the renderer and previews)
// ============================================================

// The classic block look: pixel art + optional shading + thin per-cell outline.
function drawBlockWithPaint(ctx, px, py, cellSize, paint, style = {}) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const shadeWidthRatio = style.shadeWidthRatio ?? 0.14;
  const shadeWidthMinPx = style.shadeWidthMinPx ?? 1;
  const shadeWidthMaxPx = style.shadeWidthMaxPx ?? 10;

  const w = clamp(
    Math.round(cellSize * shadeWidthRatio),
    shadeWidthMinPx,
    Math.min(shadeWidthMaxPx, Math.floor(cellSize / 2) - 1)
  );

  const darkAlpha = clamp(style.shadeDarkAlpha ?? 0.0, 0, 1);
  const lightAlpha = clamp(style.shadeLightAlpha ?? 0.0, 0, 1);

  const darkRGB = style.shadeDarkRGB ?? [0, 0, 0];
  const lightRGB = style.shadeLightRGB ?? [255, 255, 255];

  const darkComposite = style.shadeDarkComposite ?? "multiply";
  const lightComposite = style.shadeLightComposite ?? "screen";

  const tintWarmAlpha = clamp(style.shadeWarmTintAlpha ?? 0.0, 0, 1);
  const tintCoolAlpha = clamp(style.shadeCoolTintAlpha ?? 0.0, 0, 1);
  const warmRGB = style.shadeWarmTintRGB ?? [255, 230, 120];
  const coolRGB = style.shadeCoolTintRGB ?? [70, 120, 255];

  const outlineAlpha = clamp(style.outlineAlpha ?? 0.55, 0, 1);
  const outlineWidth = style.outlineWidth ?? 0.5;
  const outlineRGB = style.outlineRGB ?? [0, 0, 0];

  const cornerMode = style.cornerMode ?? "single";
  const shadeBottomLeftCorner = style.shadeBottomLeftCorner ?? true;
  const shadeTopRightCorner = style.shadeTopRightCorner ?? true;

  drawBlockWithPaintStatic(ctx, px, py, cellSize, paint, style);

  if (w > 0 && (darkAlpha > 0 || lightAlpha > 0 || tintWarmAlpha > 0 || tintCoolAlpha > 0)) {
    ctx.save();

    if (darkAlpha > 0 || tintCoolAlpha > 0) {
      ctx.globalCompositeOperation = darkComposite;

      if (darkAlpha > 0) {
        ctx.fillStyle = `rgba(${darkRGB[0]},${darkRGB[1]},${darkRGB[2]},${darkAlpha})`;
        ctx.fillRect(px + w, py + cellSize - w, cellSize - w, w);
        ctx.fillRect(px, py, w, cellSize - w);
      }

      if (tintCoolAlpha > 0) {
        ctx.fillStyle = `rgba(${coolRGB[0]},${coolRGB[1]},${coolRGB[2]},${tintCoolAlpha})`;
        ctx.fillRect(px + w, py + cellSize - w, cellSize - w, w);
        ctx.fillRect(px, py, w, cellSize - w);
      }

      if (cornerMode === "single" && shadeBottomLeftCorner) {
        if (darkAlpha > 0) {
          ctx.fillStyle = `rgba(${darkRGB[0]},${darkRGB[1]},${darkRGB[2]},${darkAlpha})`;
          ctx.fillRect(px, py + cellSize - w, w, w);
        }
        if (tintCoolAlpha > 0) {
          ctx.fillStyle = `rgba(${coolRGB[0]},${coolRGB[1]},${coolRGB[2]},${tintCoolAlpha})`;
          ctx.fillRect(px, py + cellSize - w, w, w);
        }
      }
    }

    if (lightAlpha > 0 || tintWarmAlpha > 0) {
      ctx.globalCompositeOperation = lightComposite;

      if (lightAlpha > 0) {
        ctx.fillStyle = `rgba(${lightRGB[0]},${lightRGB[1]},${lightRGB[2]},${lightAlpha})`;
        ctx.fillRect(px, py, cellSize - w, w);
        ctx.fillRect(px + cellSize - w, py + w, w, cellSize - w);
      }

      if (tintWarmAlpha > 0) {
        ctx.fillStyle = `rgba(${warmRGB[0]},${warmRGB[1]},${warmRGB[2]},${tintWarmAlpha})`;
        ctx.fillRect(px, py, cellSize - w, w);
        ctx.fillRect(px + cellSize - w, py + w, w, cellSize - w);
      }

      if (cornerMode === "single" && shadeTopRightCorner) {
        if (lightAlpha > 0) {
          ctx.fillStyle = `rgba(${lightRGB[0]},${lightRGB[1]},${lightRGB[2]},${lightAlpha})`;
          ctx.fillRect(px + cellSize - w, py, w, w);
        }
        if (tintWarmAlpha > 0) {
          ctx.fillStyle = `rgba(${warmRGB[0]},${warmRGB[1]},${warmRGB[2]},${tintWarmAlpha})`;
          ctx.fillRect(px + cellSize - w, py, w, w);
        }
      }
    }

    ctx.restore();
  }

  if (outlineAlpha > 0 && outlineWidth > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgba(${outlineRGB[0]},${outlineRGB[1]},${outlineRGB[2]},${outlineAlpha})`;
    ctx.lineWidth = outlineWidth;
    const half = (outlineWidth % 2) ? 0.5 : 0;
    ctx.strokeRect(px + half, py + half, cellSize - outlineWidth, cellSize - outlineWidth);
    ctx.restore();
  }
}

// Enhanced look: pixel art laid out on the device-pixel grid (even pixel
// sizes at any scale), no per-cell outline — outlines are drawn per piece.
function drawPixelArtDevice(ctx, sizePx, paint, baseColor) {
  if (paint && typeof paint === "object" && paint.pixels && paint.k) {
    const k = paint.k;
    const b = new Array(k + 1);
    for (let i = 0; i <= k; i++) b[i] = Math.round((i * sizePx) / k);
    for (let sy = 0; sy < k; sy++) {
      for (let sx = 0; sx < k; sx++) {
        const c = paint.pixels[sy][sx];
        ctx.fillStyle = (typeof c === "string" && isHexColour(c)) ? c : baseColor;
        ctx.fillRect(b[sx], b[sy], b[sx + 1] - b[sx], b[sy + 1] - b[sy]);
      }
    }
  } else {
    ctx.fillStyle = (typeof paint === "string") ? paint : baseColor;
    ctx.fillRect(0, 0, sizePx, sizePx);
  }
}

// Edge mask bits: which sides of a block border a different piece / empty space.
const EDGE_T = 1, EDGE_R = 2, EDGE_B = 4, EDGE_L = 8;

function boardEdgeMask(board, x, y, pid) {
  const rows = board.length, cols = board[0].length;
  let m = 0;
  if (y === 0 || board[y - 1][x]?.pid !== pid) m |= EDGE_T;
  if (x === cols - 1 || board[y][x + 1]?.pid !== pid) m |= EDGE_R;
  if (y === rows - 1 || board[y + 1][x]?.pid !== pid) m |= EDGE_B;
  if (x === 0 || board[y][x - 1]?.pid !== pid) m |= EDGE_L;
  return m;
}

function matrixEdgeMask(mat, x, y) {
  let m = 0;
  if (!mat[y - 1]?.[x]) m |= EDGE_T;
  if (!mat[y][x + 1]) m |= EDGE_R;
  if (!mat[y + 1]?.[x]) m |= EDGE_B;
  if (!mat[y][x - 1]) m |= EDGE_L;
  return m;
}

function hsla(h, s, l, a) {
  return `hsla(${h | 0},${s}%,${l}%,${a.toFixed(3)})`;
}

// ============================================================
// RENDERER
// ============================================================

function createRenderer(boardCanvas, nextCanvas) {
  const cell = CONFIG.render.cellPx;
  const cols = CONFIG.board.cols;
  const rows = CONFIG.board.rows;
  const bw = cols * cell;
  const bh = rows * cell;

  const bctx = boardCanvas.getContext("2d");
  let scale = 1;

  // --- caches (all rebuilt when the backing scale or cell style changes) ---
  let spriteObjCache = new WeakMap(); // paint object -> canvas
  let spriteStrCache = new WeakMap(); // style object -> Map(colour -> canvas)
  const boardCache = { canvas: document.createElement("canvas"), version: -1, styleKey: "" };
  let staticLayers = null; // { bg, screen, classicTop } pre-rendered layers
  let lastStyle = CONFIG.render.cellStyle;
  const overlayCache = { key: "", area: null };

  const isEnhanced = () => CONFIG.render.cellStyle !== "classic";

  function computeScale() {
    // Integer backing scale so cells land on whole device pixels; the browser
    // only ever scales UP a little (image-rendering: pixelated), never down.
    const dpr = window.devicePixelRatio || 1;
    const cssW = boardCanvas.getBoundingClientRect().width || bw;
    return Math.max(1, Math.min(CONFIG.render.maxScale ?? 4, Math.floor((cssW * dpr) / bw + 0.001)));
  }

  function invalidateCaches() {
    spriteObjCache = new WeakMap();
    spriteStrCache = new WeakMap();
    boardCache.version = -1;
    staticLayers = null;
    overlayCache.key = "";
  }

  function applyScale(s) {
    scale = s;
    boardCanvas.width = bw * s;
    boardCanvas.height = bh * s;
    boardCache.canvas.width = bw * s;
    boardCache.canvas.height = bh * s;
    invalidateCaches();
  }

  applyScale(computeScale());
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      const s = computeScale();
      if (s !== scale) applyScale(s);
    }).observe(boardCanvas);
  }

  // --- next-piece canvas ---
  const ndpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const nextRect = nextCanvas.getBoundingClientRect();
  const nextW = Math.max(1, Math.round(nextRect.width));
  const nextH = Math.max(1, Math.round(nextRect.height));

  nextCanvas.width = nextW * ndpr;
  nextCanvas.height = nextH * ndpr;

  const nctx = nextCanvas.getContext("2d");
  nctx.setTransform(1, 0, 0, 1, 0, 0);
  nctx.scale(ndpr, ndpr);

  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  // One cached canvas per distinct block paint.
  function getSprite(paint, style) {
    const enhanced = isEnhanced();
    if (paint && typeof paint === "object") {
      let spr = spriteObjCache.get(paint);
      if (!spr) {
        spr = renderSprite(paint, style, enhanced);
        spriteObjCache.set(paint, spr);
      }
      return spr;
    }
    const st = style ?? DEFAULT_STYLE;
    let byColour = spriteStrCache.get(st);
    if (!byColour) { byColour = new Map(); spriteStrCache.set(st, byColour); }
    let spr = byColour.get(paint);
    if (!spr) {
      spr = renderSprite(paint, st, enhanced);
      byColour.set(paint, spr);
    }
    return spr;
  }

  function renderSprite(paint, style, enhanced) {
    const size = cell * scale;
    const c = makeCanvas(size, size);
    const g = c.getContext("2d");
    if (enhanced) {
      drawPixelArtDevice(g, size, paint, style?.baseColor ?? "#FFFFFF");
    } else {
      g.scale(scale, scale);
      drawBlockWithPaint(g, 0, 0, cell, paint, style ?? {});
    }
    return c;
  }

  function getStaticLayers() {
    if (staticLayers) return staticLayers;
    const W = bw * scale, H = bh * scale;

    // Enhanced background: gradient + a faint tile in every cell.
    const bg = makeCanvas(W, H);
    {
      const g = bg.getContext("2d");
      g.scale(scale, scale);
      const e = CONFIG.render.enhanced;
      const grad = g.createLinearGradient(0, 0, 0, bh);
      grad.addColorStop(0, e.bgTop);
      grad.addColorStop(1, e.bgBottom);
      g.fillStyle = grad;
      g.fillRect(0, 0, bw, bh);
      g.fillStyle = e.emptyCellFill;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) g.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      }
      g.fillStyle = e.emptyCellDot;
      for (let y = 1; y < rows; y++) {
        for (let x = 1; x < cols; x++) g.fillRect(x * cell - 0.5, y * cell - 0.5, 1, 1);
      }
    }

    // Classic grid lines (drawn over everything in the classic look).
    function drawGridLines(g) {
      g.save();
      g.globalAlpha = CONFIG.render.gridLineAlpha;
      g.strokeStyle = "rgba(220,220,235,0.45)";
      g.lineWidth = 1;
      g.beginPath();
      for (let x = 0; x <= bw; x += cell) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, bh); }
      for (let y = 0; y <= bh; y += cell) { g.moveTo(0, y + 0.5); g.lineTo(bw, y + 0.5); }
      g.stroke();
      g.restore();
    }

    // Scanlines + chromatic border (both looks).
    function drawScreenFX(g) {
      g.save();
      g.globalAlpha = 0.08;
      g.fillStyle = "rgba(255,255,255,0.06)";
      for (let y = 0; y < bh; y += 4) g.fillRect(0, y, bw, 1);
      g.globalAlpha = 0.05;
      g.strokeStyle = "rgba(255,0,140,0.55)";
      g.strokeRect(1.5, 1.5, bw - 3, bh - 3);
      g.globalAlpha = 0.04;
      g.strokeStyle = "rgba(0,255,255,0.55)";
      g.strokeRect(3.5, 2.5, bw - 6, bh - 6);
      g.restore();
    }

    const screen = makeCanvas(W, H);
    {
      const g = screen.getContext("2d");
      g.scale(scale, scale);
      drawScreenFX(g);
    }

    // Grid + screen FX merged, so the classic look costs one composite, not two.
    const classicTop = makeCanvas(W, H);
    {
      const g = classicTop.getContext("2d");
      g.scale(scale, scale);
      drawGridLines(g);
      drawScreenFX(g);
    }

    staticLayers = { bg, screen, classicTop };
    return staticLayers;
  }

  function rowFallOffsetForRow(state, y) {
    const rf = state.fx.rowFall;
    if (!rf.active) return 0;
    const dist = rf.rowDropDistances?.[y] ?? 0;
    if (!dist) return 0;

    const t = clamp01(rf.elapsedMs / rf.durationMs);
    const eased = 1 - Math.pow(1 - t, 3);
    const startOffset = dist * (CONFIG.fx.lineClear.boardFallPxPerRow ?? 18);
    return startOffset * (1 - eased);
  }

  function quakeTransform(ctx, state) {
    const q = state.fx?.quake;
    if (!q || q.trauma <= 0.0001) return;

    const trauma2 = q.trauma * q.trauma;
    const maxOffset = CONFIG.fx.quake.maxOffsetPx * trauma2;
    const maxRot = (CONFIG.fx.quake.rotationalDegrees * Math.PI / 180) * trauma2;

    const sx = Math.sin(q.seed * 2.31);
    const sy = Math.sin(q.seed * 3.77 + 1.7);
    const sr = Math.sin(q.seed * 2.91 + 4.2);

    const ox = sx * maxOffset;
    const oy = sy * maxOffset;
    const rot = sr * maxRot;

    ctx.translate(bw / 2, bh / 2);
    ctx.rotate(rot);
    ctx.translate(-bw / 2 + ox, -bh / 2 + oy);
  }

  // --- enhanced piece edges (outline + bevel), batched into 3 paths ---
  function addEdgeRects(paths, px, py, mask) {
    const t = 1;
    const { out, light, dark } = paths;
    if (mask & EDGE_T) { out.rect(px, py, cell, t); light.rect(px, py + t, cell, t); }
    if (mask & EDGE_L) { out.rect(px, py, t, cell); light.rect(px + t, py, t, cell); }
    if (mask & EDGE_B) { out.rect(px, py + cell - t, cell, t); dark.rect(px, py + cell - 2 * t, cell, t); }
    if (mask & EDGE_R) { out.rect(px + cell - t, py, t, cell); dark.rect(px + cell - 2 * t, py, t, cell); }
  }

  function newEdgePaths() {
    return { out: new Path2D(), light: new Path2D(), dark: new Path2D() };
  }

  function fillEdgePaths(ctx, paths) {
    const e = CONFIG.render.enhanced;
    ctx.fillStyle = e.bevelLight; ctx.fill(paths.light);
    ctx.fillStyle = e.bevelDark; ctx.fill(paths.dark);
    ctx.fillStyle = e.outlineColor; ctx.fill(paths.out);
  }

  // Draw a list of blocks [{px, py, s, paint, style, mask}] in board pixels.
  function drawBlockList(ctx, list) {
    if (!list.length) return;
    const enhanced = isEnhanced();

    if (enhanced) {
      const e = CONFIG.render.enhanced;
      const so = e.shadowOffsetPx;
      ctx.fillStyle = e.shadowColor;
      ctx.beginPath();
      for (const b of list) {
        if (b.s < 1) continue;
        ctx.rect(b.px + so, b.py + so, cell, cell);
      }
      ctx.fill();
    }

    for (const b of list) {
      const spr = getSprite(b.paint, b.style);
      if (b.s >= 1) {
        ctx.drawImage(spr, b.px, b.py, cell, cell);
      } else if (b.s > 0) {
        const d = cell * b.s;
        ctx.drawImage(spr, b.px + (cell - d) / 2, b.py + (cell - d) / 2, d, d);
      }
    }

    if (enhanced) {
      const paths = newEdgePaths();
      for (const b of list) {
        if (b.s >= 1 && b.mask) addEdgeRects(paths, b.px, b.py, b.mask);
      }
      fillEdgePaths(ctx, paths);
    }
  }

  function collectBoardBlocks(state, animated) {
    const board = state.board;
    const enhanced = isEnhanced();
    const list = [];
    const mv = state.fx.moveAnim;
    const gr = state.fx.growAnim;

    for (let y = 0; y < rows; y++) {
      const rowOffset = animated ? rowFallOffsetForRow(state, y) : 0;
      const row = board[y];
      for (let x = 0; x < cols; x++) {
        const c = row[x];
        if (!c) continue;

        let px = x * cell;
        let py = y * cell - rowOffset;
        let s = 1;

        if (animated) {
          const idx = y * cols + x;
          if (mv.active) {
            const m = mv.byIndex.get(idx);
            if (m) {
              const t = clamp01(mv.elapsedMs / m.dur);
              const k = 1 - t * t; // accelerate like falling
              px += m.ox * cell * k;
              py += m.oy * cell * k;
            }
          }
          if (gr.active) {
            const delay = gr.byIndex.get(idx);
            if (delay !== undefined) {
              const t = clamp01((gr.elapsedMs - delay) / gr.growMs);
              s = easeOutBack(t);
              if (t <= 0) continue;
              if (t >= 1) s = 1;
            }
          }
        }

        list.push({
          px, py, s,
          paint: c.paint,
          style: c.style,
          mask: enhanced ? boardEdgeMask(board, x, y, c.pid) : 0,
        });
      }
    }
    return list;
  }

  function drawBackground(ctx) {
    if (isEnhanced()) {
      ctx.drawImage(getStaticLayers().bg, 0, 0, bw, bh);
    } else {
      ctx.fillStyle = CONFIG.render.bg;
      ctx.fillRect(0, 0, bw, bh);
    }
  }

  // Background + locked blocks. Cached as one opaque layer while nothing moves.
  function drawBoard(ctx, state) {
    const fx = state.fx;
    const animating = fx.rowFall.active || fx.moveAnim.active || fx.growAnim.active;
    if (animating) {
      drawBackground(ctx);
      drawBlockList(ctx, collectBoardBlocks(state, true));
      return;
    }

    const styleKey = CONFIG.render.cellStyle;
    if (boardCache.version !== state.boardVersion || boardCache.styleKey !== styleKey) {
      const g = boardCache.canvas.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, boardCache.canvas.width, boardCache.canvas.height);
      g.setTransform(scale, 0, 0, scale, 0, 0);
      g.imageSmoothingEnabled = false;
      drawBackground(g);
      drawBlockList(g, collectBoardBlocks(state, false));
      boardCache.version = state.boardVersion;
      boardCache.styleKey = styleKey;
    }
    ctx.drawImage(boardCache.canvas, 0, 0, bw, bh);
  }

  function drawGhostPiece(state, ghostY) {
    if (!CONFIG.render.ghost?.enabled) return;
    if (!state.active || state.gameOver) return;
    if (ghostY == null || ghostY === state.active.y) return;

    const mat = getActiveMatrix(state);

    if (isEnhanced()) {
      const e = CONFIG.render.enhanced;
      const fill = new Path2D();
      const edge = new Path2D();
      for (let y = 0; y < mat.length; y++) {
        for (let x = 0; x < mat[0].length; x++) {
          if (!mat[y][x]) continue;
          const by = ghostY + y;
          if (by < 0) continue;
          const px = (state.active.x + x) * cell;
          const py = by * cell;
          fill.rect(px, py, cell, cell);
          const m = matrixEdgeMask(mat, x, y);
          if (m & EDGE_T) edge.rect(px, py, cell, 1);
          if (m & EDGE_B) edge.rect(px, py + cell - 1, cell, 1);
          if (m & EDGE_L) edge.rect(px, py, 1, cell);
          if (m & EDGE_R) edge.rect(px + cell - 1, py, 1, cell);
        }
      }
      ctx_fill(bctx, fill, e.ghostFill);
      ctx_fill(bctx, edge, e.ghostStroke);
      return;
    }

    const g = CONFIG.render.ghost;
    const inset = g.insetPx ?? 1.5;

    bctx.save();
    bctx.fillStyle = g.fill ?? "rgba(255,255,255,0.07)";
    bctx.strokeStyle = g.stroke ?? "rgba(255,255,255,0.40)";
    bctx.lineWidth = g.lineWidth ?? 2;

    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[0].length; x++) {
        if (!mat[y][x]) continue;

        const bx = state.active.x + x;
        const by = ghostY + y;
        if (by < 0) continue;

        const px = bx * cell;
        const py = by * cell;

        bctx.fillRect(px + inset, py + inset, cell - inset * 2, cell - inset * 2);
        bctx.strokeRect(px + inset, py + inset, cell - inset * 2, cell - inset * 2);
      }
    }

    bctx.restore();
  }

  function ctx_fill(ctx, path, style) {
    ctx.fillStyle = style;
    ctx.fill(path);
  }

  function drawActivePiece(state) {
    const { shape, rotIdx } = state.active;
    const mat = getActiveMatrix(state);
    const enhanced = isEnhanced();
    const list = [];

    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[0].length; x++) {
        if (!mat[y][x]) continue;
        const by = state.active.y + y;
        if (by < 0) continue;
        list.push({
          px: (state.active.x + x) * cell,
          py: by * cell,
          s: 1,
          paint: getShapePaint(shape, rotIdx, x, y),
          style: shape.style,
          mask: enhanced ? matrixEdgeMask(mat, x, y) : 0,
        });
      }
    }
    drawBlockList(bctx, list);
  }

  // Animated rainbow outline around a powerup piece (falling, or charging).
  function drawPowerupShimmer(cells, now, boost = 0) {
    // cells: [{x, y, mask}] in board coords
    const alpha = clamp01(CONFIG.fx.powerup.shimmerAlpha + boost * 0.1);
    bctx.save();
    bctx.lineWidth = 1.5;
    for (const { x, y, mask } of cells) {
      const px = x * cell, py = y * cell;
      const hue = (now * 0.25 + (x + y) * 40) % 360;
      bctx.strokeStyle = hsla(hue, 100, 65, alpha);
      bctx.beginPath();
      if (mask & EDGE_T) { bctx.moveTo(px, py + 0.75); bctx.lineTo(px + cell, py + 0.75); }
      if (mask & EDGE_B) { bctx.moveTo(px, py + cell - 0.75); bctx.lineTo(px + cell, py + cell - 0.75); }
      if (mask & EDGE_L) { bctx.moveTo(px + 0.75, py); bctx.lineTo(px + 0.75, py + cell); }
      if (mask & EDGE_R) { bctx.moveTo(px + cell - 0.75, py); bctx.lineTo(px + cell - 0.75, py + cell); }
      bctx.stroke();
      if (boost > 0) {
        bctx.fillStyle = hsla(hue, 100, 70, 0.25 * boost);
        bctx.fillRect(px, py, cell, cell);
      }
    }
    bctx.restore();
  }

  function activeShimmerCells(state) {
    const mat = getActiveMatrix(state);
    const out = [];
    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[0].length; x++) {
        if (!mat[y][x] || state.active.y + y < 0) continue;
        out.push({ x: state.active.x + x, y: state.active.y + y, mask: matrixEdgeMask(mat, x, y) });
      }
    }
    return out;
  }

  // The highlighted ("effected") cells of the falling powerup (at its landing
  // spot) or of a locked powerup that is charging up.
  function drawPowerupOverlay(state, ghostY, now) {
    let pu, area, pieceCells, centre, intensity = 1, chargeT = 0;

    const e = state.effect;
    if (e && e.phase === "charge") {
      pu = e.pu;
      area = e.area;
      pieceCells = new Set(e.placed.map(({ x, y }) => y * cols + x));
      centre = e.centre;
      chargeT = clamp01(e.elapsedMs / e.durationMs);
      intensity = 1 + 0.9 * chargeT + 0.35 * Math.sin(chargeT * Math.PI * 6);
    } else if (state.active?.shape.powerup && ghostY != null) {
      const a = state.active;
      pu = a.shape.powerup;
      const key = `${a.shape.id}|${a.rotIdx}|${a.x}|${ghostY}|${state.boardVersion}`;
      if (overlayCache.key !== key) {
        overlayCache.key = key;
        overlayCache.area = resolveArea(pu.areaRotations[a.rotIdx], a.x, ghostY, cols, rows);
      }
      area = overlayCache.area;

      const mat = getActiveMatrix(state);
      pieceCells = new Set();
      for (let y = 0; y < mat.length; y++) {
        for (let x = 0; x < mat[0].length; x++) {
          if (mat[y][x] && ghostY + y >= 0) pieceCells.add((ghostY + y) * cols + a.x + x);
        }
      }
      centre = { x: a.x + (mat[0].length - 1) / 2, y: ghostY + (mat.length - 1) / 2 };
    } else {
      return;
    }

    const o = CONFIG.fx.powerup.overlay;
    const board = state.board;
    const cycle = now / o.periodMs;

    bctx.save();
    for (const i of area.indices) {
      const x = i % cols, y = (i / cols) | 0;
      const isPiece = pieceCells.has(i);
      const filled = !!board[y][x] && !isPiece;

      let effective;
      if (pu.type === "expander") effective = !filled && !isPiece;
      else effective = filled;

      const px = x * cell, py = y * cell;
      const hue = (now * o.hueDegPerMs + (x + y) * o.hueStepPerCell) % 360;
      const fillA = clamp01((effective ? o.fillAlpha : o.idleFillAlpha) * intensity);
      const markA = clamp01((effective ? o.markAlpha : o.idleMarkAlpha) * intensity);

      bctx.globalCompositeOperation = "source-over";
      bctx.fillStyle = hsla(hue, 100, 60, fillA);
      bctx.fillRect(px, py, cell, cell);

      // marks glow additively so they stay visible over bright pixel art
      bctx.globalCompositeOperation = "lighter";
      const mark = hsla(hue, 100, 62, markA);
      bctx.strokeStyle = mark;
      bctx.fillStyle = mark;

      if (pu.type === "gravity") {
        drawGravityMark(px, py, pu.direction, frac(cycle + hash01(x * 7 + y * 13) * 0.35));
      } else {
        const dist = Math.hypot(x - centre.x, y - centre.y);
        if (pu.type === "destroyer") {
          // squares shrink, rippling in towards the powerup
          const p = frac(cycle + dist * o.ripplePerCell);
          drawSquareMark(px, py, 1 - p, p < 0.15 ? p / 0.15 : 1);
        } else {
          // squares grow, rippling out from the powerup
          const p = frac(cycle - dist * o.ripplePerCell);
          drawSquareMark(px, py, p, p > 0.85 ? (1 - p) / 0.15 : 1);
        }
      }
    }

    bctx.globalCompositeOperation = "source-over";

    // White-hot flash right before the effect fires.
    if (chargeT > 0.6) {
      bctx.fillStyle = `rgba(255,255,255,${(0.45 * Math.pow((chargeT - 0.6) / 0.4, 2)).toFixed(3)})`;
      for (const i of area.indices) bctx.fillRect((i % cols) * cell, ((i / cols) | 0) * cell, cell, cell);
    }
    bctx.restore();
  }

  function drawSquareMark(px, py, sizeFrac, alphaMul) {
    const s = (cell - 3) * sizeFrac;
    if (s <= 0.5) return;
    const prev = bctx.globalAlpha;
    bctx.globalAlpha = prev * clamp01(alphaMul);
    bctx.lineWidth = 2;
    bctx.strokeRect(px + (cell - s) / 2, py + (cell - s) / 2, s, s);
    bctx.globalAlpha = prev;
  }

  // A short line travelling through the cell in the gravity direction.
  function drawGravityMark(px, py, direction, p) {
    const len = cell * 0.5;
    const head = p * (cell + len); // distance travelled along the axis
    let a = clampN(head - len, 0, cell);
    let b = clampN(head, 0, cell);
    if (b - a < 0.5) return;
    const w = 2;
    const mid = (cell - w) / 2;
    const reverse = direction === "up" || direction === "left";
    if (reverse) { const ra = cell - b, rb = cell - a; a = ra; b = rb; }

    if (direction === "down" || direction === "up") {
      bctx.fillRect(px + mid, py + a, w, b - a);
      const hy = reverse ? a : b - w;
      if (head <= cell) bctx.fillRect(px + mid - 1, py + hy, w + 2, w);
    } else {
      bctx.fillRect(px + a, py + mid, b - a, w);
      const hx = reverse ? a : b - w;
      if (head <= cell) bctx.fillRect(px + hx, py + mid - 1, w, w + 2);
    }
  }

  function drawFlash(state) {
    const f = state.fx.flash;
    if (!f.active) return;
    const a = 0.85 * (1 - clamp01(f.elapsedMs / f.durationMs));
    bctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
    for (const { x, y } of f.cells) bctx.fillRect(x * cell, y * cell, cell, cell);
  }

  function drawGameOverBackdrop(state) {
    const bg = state.fx?.gameOverBackdrop;
    if (!state.gameOver || !CONFIG.fx.gameOverBackdrop.enabled) return;
    if (!bg?.snapshotCanvas) return;

    bctx.save();
    bctx.beginPath();
    bctx.rect(0, 0, bw, bh);
    bctx.clip();

    bctx.globalAlpha = CONFIG.fx.gameOverBackdrop.alpha ?? 0.95;

    const patternCanvas = bg.snapshotCanvas;
    const scaleG = CONFIG.fx.gameOverBackdrop.scale ?? 1.9;
    const scaledW = patternCanvas.width * scaleG;
    const scaledH = patternCanvas.height * scaleG;
    const angle = bg.currentAngle * Math.PI / 180;

    bctx.translate(bw / 2, bh / 2);
    bctx.rotate(angle);
    bctx.translate(-bw / 2, -bh / 2);

    for (let yy = -scaledH * 2; yy < bh + scaledH * 2; yy += scaledH) {
      for (let xx = -scaledW * 2; xx < bw + scaledW * 2; xx += scaledW) {
        bctx.drawImage(
          patternCanvas,
          xx + bg.offsetX,
          yy + bg.offsetY,
          scaledW,
          scaledH
        );
      }
    }

    bctx.restore();
  }

  function drawParticles(state) {
    const parts = state.fx.particles;
    if (!parts.length) return;

    bctx.save();
    for (const p of parts) {
      bctx.globalAlpha = clamp01(p.lifeMs / p.maxLifeMs);
      bctx.fillStyle = p.color;
      bctx.fillRect(p.x, p.y, p.size, p.size);
    }
    bctx.restore();
  }

  function draw(state, now = performance.now()) {
    if (CONFIG.render.cellStyle !== lastStyle) {
      lastStyle = CONFIG.render.cellStyle;
      invalidateCaches();
    }
    const layers = getStaticLayers();
    const enhanced = isEnhanced();

    bctx.setTransform(scale, 0, 0, scale, 0, 0);
    bctx.imageSmoothingEnabled = false;

    // Solid fill behind everything: only needed when the shake exposes the
    // edges (otherwise the opaque board layer covers the whole canvas).
    if (state.gameOver || state.fx.quake.trauma > 0.0001) {
      bctx.fillStyle = enhanced ? CONFIG.render.enhanced.bgBottom : CONFIG.render.bg;
      bctx.fillRect(0, 0, bw, bh);
    }

    if (state.gameOver) {
      drawBackground(bctx);
      drawGameOverBackdrop(state);
      bctx.drawImage(layers.screen, 0, 0, bw, bh);
      return;
    }

    bctx.save();
    quakeTransform(bctx, state);

    const hide = state.paused && CONFIG.pause.hideShapes;

    if (hide) {
      drawBackground(bctx);
    } else {
      drawBoard(bctx, state);

      const ghostY = state.active ? getGhostDropY(state) : null;
      const ghostBehind = CONFIG.render.ghost?.drawBehindActive ?? true;

      if (state.active && ghostBehind) drawGhostPiece(state, ghostY);
      if (state.active) drawActivePiece(state);
      if (state.active && !ghostBehind) drawGhostPiece(state, ghostY);

      drawPowerupOverlay(state, ghostY, now);

      if (state.active?.shape.powerup) {
        drawPowerupShimmer(activeShimmerCells(state), now);
      } else if (state.effect?.phase === "charge") {
        const e = state.effect;
        const pids = e.placed
          .filter(({ x, y }) => state.board[y][x]?.pid === e.pid)
          .map(({ x, y }) => ({ x, y, mask: boardEdgeMask(state.board, x, y, e.pid) }));
        drawPowerupShimmer(pids, now, clamp01(e.elapsedMs / e.durationMs));
      }

      drawFlash(state);
    }

    drawParticles(state);
    bctx.drawImage(enhanced ? layers.screen : layers.classicTop, 0, 0, bw, bh);

    bctx.restore();
  }

  function drawNextSilhouette(shape) {
    const rect = nextCanvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));

    nctx.clearRect(0, 0, w, h);
    if (!shape) return;

    const mat = shape.rotations[0];
    const ph = mat.length;
    const pw = mat[0].length;

    const pad = 18;
    const availW = Math.max(1, w - pad * 2);
    const availH = Math.max(1, h - pad * 2);
    const pcell = Math.max(6, Math.floor(Math.min(availW / pw, availH / ph)));

    const drawW = pw * pcell;
    const drawH = ph * pcell;
    const ox = Math.floor((w - drawW) / 2);
    const oy = Math.floor((h - drawH) / 2);

    nctx.save();
    nctx.globalAlpha = 1;
    if (shape.powerup) {
      // Powerups get a rainbow silhouette so you can see one coming.
      const grad = nctx.createLinearGradient(ox, oy, ox + drawW, oy + drawH);
      ["#ff4d6d", "#ffb84d", "#f9ff4d", "#4dff88", "#4dc3ff", "#b44dff"].forEach((c, i, arr) =>
        grad.addColorStop(i / (arr.length - 1), c));
      nctx.fillStyle = grad;
    } else {
      nctx.fillStyle = "#a83deb";
    }

    nctx.beginPath();
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        if (!mat[y][x]) continue;
        nctx.rect(ox + x * pcell, oy + y * pcell, pcell, pcell);
      }
    }
    nctx.fill();
    nctx.restore();
  }

  return { draw, drawNextSilhouette };
}

const DEFAULT_STYLE = {};

function frac(x) { return x - Math.floor(x); }
function clampN(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function hash01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ============================================================
// NAME LAYER
// ============================================================

function createNameLayer(nameLayerEl) {
  let currentEl = null;

  function clear() {
    if (currentEl) {
      currentEl.remove();
      currentEl = null;
    }
    nameLayerEl.innerHTML = "";
  }

  // `effect`: optional line shown under the name (powerups).
  function setName(name, effect = "") {
    if (!name) {
      clear();
      return;
    }

    const nextEl = document.createElement("div");
    nextEl.className = "nameText enterFromRight" + (effect ? " powerup" : "");

    const main = document.createElement("span");
    main.className = "nameMain";
    main.textContent = name;
    nextEl.appendChild(main);

    if (effect) {
      const sub = document.createElement("span");
      sub.className = "nameEffect";
      sub.textContent = effect;
      nextEl.appendChild(sub);
    }

    nameLayerEl.appendChild(nextEl);

    nextEl.getBoundingClientRect();

    if (currentEl) {
      currentEl.classList.add("exitToLeft");
      const old = currentEl;
      old.addEventListener("transitionend", () => old.remove(), { once: true });
    }

    nextEl.classList.remove("enterFromRight");
    nextEl.classList.add("enterToCenter");
    currentEl = nextEl;
  }

  function setShape(shape) {
    if (!shape) { clear(); return; }
    setName(shape.name, shape.powerup?.description ?? "");
  }

  return { setName, setShape, clear };
}

// ============================================================
// BEST SCORES (per mode, saved in this browser)
// ============================================================

const bestScores = {
  key: (mode) => `extris.best.${mode}`,
  get(mode) {
    try { return Number(localStorage.getItem(this.key(mode))) || 0; } catch { return 0; }
  },
  submit(mode, score) {
    const prev = this.get(mode);
    if (score <= prev) return false;
    try { localStorage.setItem(this.key(mode), String(score)); } catch { /* storage unavailable */ }
    return true;
  },
};

function loadLastMode() {
  try {
    const m = localStorage.getItem("extris.mode");
    return CONFIG.modes[m] ? m : CONFIG.defaultMode;
  } catch { return CONFIG.defaultMode; }
}

function saveLastMode(mode) {
  try { localStorage.setItem("extris.mode", mode); } catch { /* storage unavailable */ }
}

// ============================================================
// UI + INPUT (soft drop)
// ============================================================
function bindUI(state, renderer, nameLayer) {
  const scoreText = document.getElementById("scoreText");
  const linesText = document.getElementById("linesText");

  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlaySubtitle = document.getElementById("overlaySubtitle");
  const overlayNormalBtn = document.getElementById("overlayNormalBtn");
  const overlayHardBtn = document.getElementById("overlayHardBtn");
  const overlayResumeBtn = document.getElementById("overlayResumeBtn");
  const overlayNewBtn = document.getElementById("overlayNewBtn");
  const modeHint = document.getElementById("modeHint");

  const pauseBtn = document.getElementById("pauseBtn");

  const debugPanel = document.getElementById("debugPanel");
  const dbgMode = document.getElementById("dbgMode");
  const dbgZone = document.getElementById("dbgZone");
  const dbgPieceDiff = document.getElementById("dbgPieceDiff");
  const dbgBaseSpeed = document.getElementById("dbgBaseSpeed");
  const dbgPowerup = document.getElementById("dbgPowerup");

  const boardShellEl = document.getElementById("boardShell");
  const targetEl = document.body;

  let lastMode = loadLastMode();
  let newBest = false;

  // Dynamic game-over piece preview container
  const overlayPieceWrap = document.createElement("div");
  overlayPieceWrap.style.marginTop = "16px";
  overlayPieceWrap.style.display = "flex";
  overlayPieceWrap.style.justifyContent = "center";
  overlayPieceWrap.style.alignItems = "center";
  overlaySubtitle.insertAdjacentElement("afterend", overlayPieceWrap);

  function makeShapePreviewCanvas(shape) {
    if (!shape) return null;

    const mat = shape.rotations[0];
    const cell = 18;
    const pad = 6;
    const w = mat[0].length * cell + pad * 2;
    const h = mat.length * cell + pad * 2;

    const cvs = document.createElement("canvas");
    cvs.width = w;
    cvs.height = h;
    cvs.style.width = `${w}px`;
    cvs.style.height = `${h}px`;
    cvs.style.imageRendering = "pixelated";

    const ctx = cvs.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    for (let y = 0; y < mat.length; y++) {
      for (let x = 0; x < mat[0].length; x++) {
        if (!mat[y][x]) continue;
        const paint = getShapePaint(shape, 0, x, y);
        drawBlockWithPaintStatic(ctx, pad + x * cell, pad + y * cell, cell, paint, shape.style ?? {});
      }
    }

    return cvs;
  }

  function setOverlayPiece(shape) {
    overlayPieceWrap.innerHTML = "";
    if (!shape) return;

    const cvs = makeShapePreviewCanvas(shape);
    if (cvs) overlayPieceWrap.appendChild(cvs);
  }

  function modeLabel(mode) {
    return CONFIG.modes[mode]?.label ?? mode;
  }

  function bestLine() {
    return Object.keys(CONFIG.modes)
      .map(m => `${modeLabel(m)} best: ${bestScores.get(m)}`)
      .join(" · ");
  }

  function showModeButtons() {
    overlayNormalBtn.style.display = "inline-block";
    overlayHardBtn.style.display = "inline-block";
    // The last-played mode is the primary button.
    overlayNormalBtn.classList.toggle("secondary", lastMode !== "normal");
    overlayHardBtn.classList.toggle("secondary", lastMode !== "hard");
    modeHint.style.display = "block";
  }

  function showOverlay(show, title, subtitle, mode) {
    const controlsBlock = document.getElementById("controlsBlock");
    const overlayBtns = document.getElementById("overlayBtns");

    overlay.classList.toggle("show", show);
    if (!show) return;

    const m = mode ?? "start";

    controlsBlock.style.display = "none";
    overlayBtns.style.display = "none";
    modeHint.style.display = "none";

    overlayNormalBtn.style.display = "none";
    overlayHardBtn.style.display = "none";
    overlayResumeBtn.style.display = "none";
    overlayNewBtn.style.display = "none";

    if (m === "loading") {
      overlayTitle.textContent = title ?? "Loading…";
      overlaySubtitle.innerHTML = subtitle ?? "";
      setOverlayPiece(null);
      return;
    }

    if (m === "gameover") {
      const killerShape = state.gameOverInfo.shape;
      const killerName = state.gameOverInfo.pieceName || "Unknown";

      overlayTitle.textContent = "Game Over";
      overlaySubtitle.innerHTML =
        `${modeLabel(state.mode)} mode<br>` +
        `Final score: ${state.score}${newBest ? " — new best!" : ""}<br>` +
        `Blocks destroyed: ${state.blocksDestroyed}<br>` +
        `The piece that killed you: ${escapeHtml(killerName)}`;

      overlayBtns.style.display = "flex";
      showModeButtons();
      setOverlayPiece(killerShape);
      return;
    }

    if (m === "pause") {
      overlayTitle.textContent = title ?? "Paused";
      overlaySubtitle.innerHTML = subtitle ?? `${modeLabel(state.mode)} mode`;
      overlayBtns.style.display = "flex";
      overlayResumeBtn.style.display = "inline-block";
      overlayNewBtn.style.display = "inline-block";
      setOverlayPiece(null);
      return;
    }

    overlayTitle.textContent = title ?? "Extris";
    overlaySubtitle.innerHTML = (subtitle ?? "alpha version 20260306") + `<br>${bestLine()}`;
    controlsBlock.style.display = "block";
    overlayBtns.style.display = "flex";
    showModeButtons();
    setOverlayPiece(null);
  }

  function updateHUD() {
    scoreText.textContent = String(state.score);
    linesText.textContent = String(state.blocksDestroyed);

    if (state.debug) {
      const z = getDifficultyZone(state);
      dbgMode.textContent = `${state.mode} · look: ${CONFIG.render.cellStyle} (V)`;
      dbgZone.textContent = z.zone;
      dbgPieceDiff.textContent = state.active
        ? (state.active.shape.powerup ? `powerup tier ${state.active.shape.powerup.tier}` : String(state.active.shape.difficulty ?? 1))
        : "–";
      dbgBaseSpeed.textContent = `${state.dropMs} ms/row (level ${state.level})`;
      const ps = state.pieceSel?.powerup;
      dbgPowerup.textContent = state.powerups.length && ps
        ? `${(ps.lastChance * 100).toFixed(0)}% · cooldown ${ps.cooldown} · served ${ps.count} (P = next)`
        : "off";
    }
  }

  function startGame(mode = lastMode) {
    markInput(state, "touch");
    if (state.running) return;
    if (state.gameOver || state.active) resetGame(state, ctx, false);

    lastMode = CONFIG.modes[mode] ? mode : CONFIG.defaultMode;
    saveLastMode(lastMode);
    configureMode(state, lastMode);
    initPieceSelectionState(state);
    newBest = false;

    spawnPiece(state);
    nameLayer.setShape(state.active.shape);
    renderer.drawNextSilhouette(state.next);

    state.running = true;
    state.paused = false;
    showOverlay(false);
    updateHUD();
  }

  function resumeGame() {
    markInput(state, "touch");
    if (state.gameOver) return;
    state.paused = false;
    state.running = true;
    showOverlay(false);
    updateHUD();
  }

  function pauseGame() {
    if (state.gameOver) return;
    if (!state.running) return;
    state.paused = true;
    state.softDropping = false;
    showOverlay(true, "Paused", null, "pause");
    updateHUD();
  }

  function togglePause() {
    if (!state.running || state.gameOver) return;
    if (state.paused) resumeGame();
    else pauseGame();
  }

  function onGameOver() {
    newBest = bestScores.submit(state.mode, state.score);
    nameLayer.clear();
    showOverlay(true, "", "", "gameover");
    updateHUD();
  }

  overlayNormalBtn.addEventListener("click", () => startGame("normal"));
  overlayHardBtn.addEventListener("click", () => startGame("hard"));
  overlayResumeBtn.addEventListener("click", () => resumeGame());
  overlayNewBtn.addEventListener("click", () => resetGame(state, ctx));

  pauseBtn.addEventListener("click", (e) => {
    e.preventDefault();
    togglePause();
  });

  if (CONFIG.pause.pauseWhenHidden) {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.running && !state.paused) pauseGame();
    });
  }

  // Debug: force the next piece to be a powerup (cycles through them all).
  let debugPowerupIdx = 0;
  function debugQueuePowerup() {
    const list = state.allPowerups;
    if (!list.length || !state.running) return;
    state.next = list[debugPowerupIdx++ % list.length];
    renderer.drawNextSilhouette(state.next);
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyD") {
      state.debug = !state.debug;
      debugPanel.style.display = state.debug ? "block" : "none";
      updateHUD();
      return;
    }
    if (state.debug && e.code === "KeyV") {
      CONFIG.render.cellStyle = CONFIG.render.cellStyle === "classic" ? "enhanced" : "classic";
      updateHUD();
      return;
    }
    if (state.debug && e.code === "KeyP") {
      debugQueuePowerup();
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      togglePause();
      return;
    }
  });

  window.addEventListener("keydown", (e) => {
    if (!state.running && e.code !== "Enter") return;
    if (state.gameOver && e.code !== "Enter") return;
    if (state.paused) return;

    markInput(state, "keyboard");

    switch (e.code) {
      case "ArrowLeft":
        e.preventDefault();
        if (state.active) tryMove(state, -1, 0);
        break;
      case "ArrowRight":
        e.preventDefault();
        if (state.active) tryMove(state, +1, 0);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (state.active) tryRotate(state);
        break;
      case "ArrowDown":
        e.preventDefault();
        state.softDropping = true;
        break;
      case "Enter":
        e.preventDefault();
        startGame();
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowDown") state.softDropping = false;
  });

  function clearGlows() {
    boardShellEl.classList.remove("glow-left", "glow-right", "glow-top", "glow-bottom");
  }

  function applyGlow(zone) {
    clearGlows();
    if (zone === "left") boardShellEl.classList.add("glow-left");
    if (zone === "right") boardShellEl.classList.add("glow-right");
    if (zone === "top") boardShellEl.classList.add("glow-top");
    if (zone === "bottom") boardShellEl.classList.add("glow-bottom");
  }

  function getZone(x, y) {
    const r = boardShellEl.getBoundingClientRect();

    const relX = x - r.left;
    const relY = y - r.top;

    if (relX < 0) return "left";
    if (relX > r.width) return "right";
    if (relY < 0) return "top";
    if (relY > r.height) return "bottom";

    const topBand = r.height * 0.22;
    const bottomBand = r.height * 0.28;
    const bottomCenterWidthFrac = 0.50;

    if (relY <= topBand) return "top";

    if (relY >= r.height - bottomBand) {
      const leftBound = r.width * (0.5 - bottomCenterWidthFrac / 2);
      const rightBound = r.width * (0.5 + bottomCenterWidthFrac / 2);

      if (relX >= leftBound && relX <= rightBound) return "bottom";
      return (relX < r.width * 0.5) ? "left" : "right";
    }

    return (relX <= r.width * 0.5) ? "left" : "right";
  }

  function canAct() {
    return state.running && !state.gameOver && !state.paused && state.active;
  }

  function doAction(zone) {
    if (!canAct()) return;
    markInput(state, "touch");

    if (zone === "left") tryMove(state, -1, 0);
    else if (zone === "right") tryMove(state, +1, 0);
    else if (zone === "top") tryRotate(state);
    else if (zone === "bottom") {
      const moved = tryMove(state, 0, 1);
      if (!moved) beginLockIfNeeded(state);
    }
  }

  function stopRepeat() {
    if (state.tapRepeatTimer) clearTimeout(state.tapRepeatTimer);
    if (state.tapRepeatInterval) clearInterval(state.tapRepeatInterval);
    state.tapRepeatTimer = null;
    state.tapRepeatInterval = null;
  }

  function startRepeat(zone) {
    doAction(zone);
    state.tapRepeatTimer = setTimeout(() => {
      state.tapRepeatInterval = setInterval(() => doAction(zone), CONFIG.timing.tapRepeatEveryMs);
    }, CONFIG.timing.tapRepeatStartMs);
  }

  targetEl.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary) return;
    // Let overlay buttons receive their own clicks (e.g. choosing a mode).
    if (e.target.closest?.("button")) return;
    e.preventDefault();

    if (!state.running && !state.gameOver) {
      startGame();
      return;
    }

    if (state.paused || state.gameOver) return;

    const zone = getZone(e.clientX, e.clientY);
    state.touch.zone = zone;

    if (zone) {
      applyGlow(zone);
      stopRepeat();
      startRepeat(zone);
    }
  });

  targetEl.addEventListener("pointerup", (e) => {
    if (!e.isPrimary) return;
    stopRepeat();
    clearGlows();
  });

  targetEl.addEventListener("pointercancel", (e) => {
    if (!e.isPrimary) return;
    stopRepeat();
    clearGlows();
  });

  const ctx = { renderer, nameLayer, updateHUD, showOverlay, onGameOver };

  showOverlay(true, "Loading…", "", "loading");
  updateHUD();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelector(".app")?.classList.add("ready");
      showOverlay(true, "Extris", "alpha version 20260306", "start");
    });
  });

  return ctx;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[m]));
}

function resetGame(state, ctx, showMenu = true) {
  state.board = createEmptyBoard(CONFIG.board.cols, CONFIG.board.rows);
  markBoardDirty(state);
  state.active = null;
  state.next = null;
  state.effect = null;
  state.running = false;
  state.paused = false;
  state.gameOver = false;
  state.score = 0;
  state.lines = 0;
  state.blocksDestroyed = 0;
  state.level = 1;
  state.dropMs = CONFIG.timing.baseDropMs;
  state.dropAccum = 0;
  state.softDropping = false;
  cancelLock(state);

  state.lastLockedShape = null;
  state.gameOverInfo.pieceName = "";
  state.gameOverInfo.shape = null;

  const fx = state.fx;
  fx.particles.length = 0;
  fx.rowFall.active = false;
  fx.rowFall.elapsedMs = 0;
  fx.rowFall.rowDropDistances = Array(CONFIG.board.rows).fill(0);
  fx.moveAnim.active = false;
  fx.growAnim.active = false;
  fx.flash.active = false;
  fx.quake.trauma = 0;
  fx.quake.x = 0;
  fx.quake.y = 0;
  fx.gameOverBackdrop.snapshotCanvas = null;
  fx.gameOverBackdrop.elapsedMs = 0;
  fx.gameOverBackdrop.offsetX = 0;
  fx.gameOverBackdrop.offsetY = 0;

  initPieceSelectionState(state);

  ctx.nameLayer.clear();
  ctx.renderer.drawNextSilhouette(null);

  ctx.updateHUD();
  if (showMenu) ctx.showOverlay(true, "Extris", " ");
}

// ============================================================
// LOOP (soft drop modifies gravity while held)
// ============================================================

function stepLockAndSpawn(state, ctx) {
  const lockInfo = lockPiece(state);

  if (state.gameOver) {
    ctx.onGameOver();
    return;
  }

  if (lockInfo.shape.powerup) {
    // The next piece spawns once the effect has played out (finishTurn).
    state.active = null;
    beginPowerupEffect(state, lockInfo);
    ctx.updateHUD();
    return;
  }

  finishTurn(state, ctx);
}

function finishTurn(state, ctx) {
  clearFullLines(state);

  const ok = spawnPiece(state);
  if (!ok) {
    setGameOver(state, state.lastLockedShape);
    ctx.onGameOver();
  } else {
    ctx.nameLayer.setShape(state.active.shape);
    ctx.renderer.drawNextSilhouette(state.next);
  }

  ctx.updateHUD();
}

function updateGame(state, dt, ctx) {
  updateFX(state, dt);

  if (!state.running || state.gameOver) return;
  if (state.paused) return;

  if (state.effect) {
    updatePowerupEffect(state, dt, ctx);
    return;
  }
  if (!state.active) return;

  const baseDropMs = state.dropMs;
  const effectiveDropMs = state.softDropping
    ? Math.max(16, Math.floor(baseDropMs * CONFIG.timing.softDropFactor))
    : baseDropMs;

  state.dropAccum += dt;
  const maxBacklog = effectiveDropMs * (CONFIG.timing.maxAccumulatedSteps ?? 2);
  if (state.dropAccum > maxBacklog) state.dropAccum = maxBacklog;

  const maxSteps = CONFIG.timing.maxFallStepsPerFrame ?? 1;
  let steps = 0;

  while (state.dropAccum >= effectiveDropMs && steps < maxSteps) {
    state.dropAccum -= effectiveDropMs;

    if (state.locking) break;

    const moved = tryMove(state, 0, 1);
    if (moved) {
      if (state.softDropping && (CONFIG.scoring?.softDropPerCell ?? 0) > 0) {
        state.score += CONFIG.scoring.softDropPerCell;
      }
    } else {
      beginLockIfNeeded(state);
      break;
    }

    steps++;
  }

  if (state.locking && state.active && !state.gameOver) {
    state.lockElapsed += dt;

    const mat = getActiveMatrix(state);
    if (!collides(state, state.active.x, state.active.y + 1, mat)) {
      cancelLock(state);
    } else {
      const delay = currentLockDelayMs(state);
      if (state.lockElapsed >= delay) {
        stepLockAndSpawn(state, ctx);
        cancelLock(state);
      }
    }
  }
}

// ============================================================
// BOOT
// ============================================================

const SHAPES = loadAndNormaliseShapes(RAW_SHAPES);
const POWERUPS = loadAndNormaliseShapes(RAW_POWERUPS).filter(p => p.powerup);

const boardCanvas = document.getElementById("boardCanvas");
const nextCanvas = document.getElementById("nextCanvas");
const nameLayerEl = document.getElementById("nameLayer");

const renderer = createRenderer(boardCanvas, nextCanvas);
const nameLayer = createNameLayer(nameLayerEl);

const state = createGameState(SHAPES, POWERUPS);
const ctx = bindUI(state, renderer, nameLayer);

// Handy for testing in the browser console: open index.html?debug
if (new URLSearchParams(location.search).has("debug")) {
  window.__extris = {
    state, ctx, CONFIG, SHAPES, POWERUPS, renderer,
    step: (dt = 16) => updateGame(state, dt, ctx), // advance the game without waiting for frames
  };
}

let last = performance.now();

function tick(now) {
  const dt = Math.min(50, now - last);
  last = now;

  updateGame(state, dt, ctx);
  renderer.draw(state, now);

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
