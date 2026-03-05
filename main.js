const CONFIG = {
  board: { cols: 14, rows: 28 },

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
  },

  pause: { hideShapes: true },

  render: {
    cellPx: 18,
    gridLineAlpha: 0.22,
    bg: "#000000",
    silhouetteColor: "rgba(240,240,255,0.16)",
    silhouetteStroke: "rgba(240,240,255,0.20)",
    pixelArtJitter: 0,
  },

  assist: {
    // “Danger” bands (rows-from-top). Higher = assistance kicks in earlier.
    topRowsForDiff2Only: 22,
    topRowsForDiff1Only: 12,

    pieceMix: {
      // Baseline level weights (0–5). Keep 4/5 at 0: they’re injected via the “hard” scheduler below.
      baseLevelWeight:    { 0: 0.18, 1: 0.52, 2: 0.22, 3: 0.08, 4: 0.00, 5: 0.00 },

      // Opening blend (first N drops), then fades into baseLevelWeight.
      openingDrops: 7,
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
        rechargePerDrop: 0.005,
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
  },
};


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
  const cols = CONFIG.board.cols;

  // Find the highest occupied row (0 = top, rows-1 = bottom).
  // Assumes state.board[r][c] is truthy for locked blocks.
  let highest = rows; // sentinel: none found
  for (let r = 0; r < rows; r++) {
    const row = state.board[r];
    if (!row) continue;
    for (let c = 0; c < cols; c++) {
      if (row[c]) { highest = r; break; }
    }
    if (highest !== rows) break;
  }

  if (highest === rows) return 0; // empty board

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

  if (!Array.isArray(ids) || !Array.isArray(ps)) {
    if (debug) {
      console.log("[LINK] prevShape has no nextShapes/nextShapeProbs", {
        id: prevShape.id,
        nextShapes: ids,
        nextShapeProbs: ps,
        keys: Object.keys(prevShape),
      });
    }
    return null;
  }

  if (ids.length === 0 || ids.length !== ps.length) {
    if (debug) console.log("[LINK] invalid arrays", { id: prevShape.id, ids, ps });
    return null;
  }

  // Coerce probs to numbers safely.
  const probs = ps.map(p => {
    const x = Number(p);
    return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
  });

  let sumP = 0;
  for (const p of probs) sumP += p;
  sumP = Math.min(1, sumP);

  if (debug) console.log("[LINK] candidates", { from: prevShape.id, ids, probs, sumP });

  if (sumP <= 0) return null;

  const gate = state.rng();
  if (debug) console.log("[LINK] gate roll", { gate, sumP, triggered: gate < sumP });

  if (gate >= sumP) return null;

  // Sample among linked targets using their probs (normalised within sumP mass).
  const total = probs.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;

  let r = state.rng() * total;
  let chosenIdx = probs.length - 1;
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i];
    if (r <= 0) { chosenIdx = i; break; }
  }

  const chosenId = ids[chosenIdx];
  const chosen = idToShape.get(chosenId) ?? null;

  if (debug) console.log("[LINK] chose", { chosenId, existsInStateShapes: !!chosen });

  if (!chosen && debug) {
    // Dump a few known IDs to spot mismatches quickly.
    const sampleIds = [];
    for (const k of idToShape.keys()) { sampleIds.push(k); if (sampleIds.length >= 12) break; }
    console.log("[LINK] id not found in state.shapes map", { chosenId, sampleIds });
  }

  return chosen;
}

import { SHAPES as RAW_SHAPES } from "./shapes/main_shapes.js";

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

  // Trim empty rows/cols around a boolean matrix
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
    return out.length ? out : [[true]];
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

    return trimMatrix(mat);
  }

  function safeId(name, idx) {
    const base = (name ?? `shape_${idx}`).toString().toLowerCase();
    return base.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
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
    const baseMat = parseShapeGrid(s.shape ?? s.grid ?? s.matrix);

    // --- generate 4 rotations (and optionally dedupe elsewhere if you do that) ---
    const rotations = [baseMat];
    for (let i = 1; i < 4; i++) rotations.push(rotateMatrix90CW(rotations[i - 1]));

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

    // --- NEW: colour rotations (optional) ---
    let colorRotations = null;
    let pixelK = 1;

    if (!isHexColour(s.color)) {
      const grid = normaliseGrid(s.color);
      if (grid) {
        const matH0 = rotations[0].length;
        const matW0 = rotations[0][0].length;
        const gridH0 = grid.length;
        const gridW0 = grid[0].length;

        const k = inferPixelScale(matH0, matW0, gridH0, gridW0);
        if (k) {
          pixelK = k;

          // Clean blanks: "" / "." / null => baseColor
          const cleaned = grid.map(row =>
            row.map(v => (isHexColour(v) ? v.trim() : baseColor))
          );

          // Rotate colour grid to match occupancy rotations
          colorRotations = [cleaned];
          for (let i = 1; i < rotations.length; i++) {
            colorRotations.push(rotateGrid90CW(colorRotations[i - 1]));
          }
        } else {
          console.warn(
            `[${id}] colour grid dims (${gridW0}×${gridH0}) do not match piece dims (${matW0}×${matH0}); falling back to solid baseColor.`
          );
        }
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

      // New fields used by renderer/locking
      colorRotations,
      pixelK,

      // Rotations used for collision + placement
      rotations,
    };
  });
}

function parseGridToBoolMatrix(gridRows) {
  if (!Array.isArray(gridRows) || gridRows.length === 0) throw new Error("grid must be a non-empty string[]");
  const rows = gridRows.map((r) => String(r));
  const w = Math.max(...rows.map((r) => r.length));
  const mat = rows.map((r) => {
    const padded = r.padEnd(w, ".");
    return [...padded].map((ch) => ch === "X");
  });
  return trimBoolMatrix(mat);
}

function trimBoolMatrix(mat) {
  const h = mat.length, w = mat[0].length;
  let top = 0, bottom = h - 1, left = 0, right = w - 1;
  const rowHas = (y) => mat[y].some(Boolean);
  const colHas = (x) => mat.some((row) => row[x]);
  while (top <= bottom && !rowHas(top)) top++;
  while (bottom >= top && !rowHas(bottom)) bottom--;
  while (left <= right && !colHas(left)) left++;
  while (right >= left && !colHas(right)) right--;
  const out = [];
  for (let y = top; y <= bottom; y++) out.push(mat[y].slice(left, right + 1));
  return out.length ? out : [[true]];
}

function computeAllRotations(base) {
  const r0 = base;
  const r1 = rotateCW(r0);
  const r2 = rotateCW(r1);
  const r3 = rotateCW(r2);
  return [r0, r1, r2, r3].map(trimBoolMatrix);
}

function filterAllowedRotations(rotationsAll, rotationSpec) {
  const mode = rotationSpec?.mode ?? "any";
  if (mode === "none") return [rotationsAll[0]];
  if (mode === "custom") {
    const allowed = Array.isArray(rotationSpec.allowed) ? rotationSpec.allowed : [0];
    const unique = [...new Set(allowed.map((n) => ((n % 4) + 4) % 4))];
    return unique.map((i) => rotationsAll[i]);
  }
  const uniq = [];
  const seen = new Set();
  for (const m of rotationsAll) {
    const key = m.map((row) => row.map((b) => (b ? "1" : "0")).join("")).join("|");
    if (!seen.has(key)) { seen.add(key); uniq.push(m); }
  }
  return uniq;
}

function rotateCW(mat) {
  const h = mat.length, w = mat[0].length;
  const out = Array.from({ length: w }, () => Array(h).fill(false));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[x][h - 1 - y] = mat[y][x];
  return out;
}

function normaliseStyle(baseHex, style = {}) {
  const base = parseHex(baseHex);
  const shadeTopRight = style.shadeTopRight ?? toHex(adjustColour(base, { l: +0.18, s: +0.10, h: +10 }));
  const shadeBottomLeft = style.shadeBottomLeft ?? toHex(adjustColour(base, { l: -0.22, s: +0.05, h: -12 }));
  return {
    shadeTopRight,
    shadeBottomLeft,
    glow: style.glow ?? { enabled: true, strength: 0.35 },
  };
}

function parseHex(hex) {
  const h = hex.replace("#", "").trim();
  const s = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  if (s.length !== 6) return { r: 255, g: 255, b: 255 };
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}

function rgbToHsl({ r, g, b }) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const d = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case R: h = ((G - B) / d) % 6; break;
      case G: h = (B - R) / d + 2; break;
      case B: h = (R - G) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}
function hslToRgb({ h, s, l }) {
  const C = (1 - Math.abs(2 * l - 1)) * s;
  const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - C / 2;
  let rp = 0, gp = 0, bp = 0;
  if (0 <= h && h < 60) [rp, gp, bp] = [C, X, 0];
  else if (60 <= h && h < 120) [rp, gp, bp] = [X, C, 0];
  else if (120 <= h && h < 180) [rp, gp, bp] = [0, C, X];
  else if (180 <= h && h < 240) [rp, gp, bp] = [0, X, C];
  else if (240 <= h && h < 300) [rp, gp, bp] = [X, 0, C];
  else [rp, gp, bp] = [C, 0, X];
  return { r: Math.round((rp + m) * 255), g: Math.round((gp + m) * 255), b: Math.round((bp + m) * 255) };
}
function adjustColour(rgb, { h = 0, s = 0, l = 0 }) {
  const hsl = rgbToHsl(rgb);
  return hslToRgb({ h: (hsl.h + h + 360) % 360, s: clamp01(hsl.s + s), l: clamp01(hsl.l + l) });
}
function toHex({ r, g, b }) {
  const f = (n) => n.toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
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
// Returns k in {1,2,3,4} or null.
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
  
function getActivePaintForBlock(state, bx, by) {
  const shape = state.active.shape;
  const rotIdx = state.active.rotIdx;

  // Case 1: legacy solid colour
  if (!shape.colorRotations) {
    // If old code expects shape.color to be a string, baseColor is the safe choice.
    return shape.style.baseColor;
  }

  // Case 2: grid-based colour (per-block or pixel art)
  const k = shape.pixelK ?? 1;
  const grid = shape.colorRotations[rotIdx];

  if (k === 1) {
    // Single colour per block cell
    return grid[by][bx];
  }

  // k in {2,3,4}: return pixel art for this block
  return {
    k,
    pixels: sliceBlockPixels(grid, k, bx, by),
  };
}

function hexToRgb(hex){
  const h = hex.replace("#","").trim();
  const v = h.length === 3
    ? h.split("").map(ch => ch + ch).join("")
    : h;
  const n = parseInt(v, 16);
  return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
}

function rgbToHex(r,g,b){
  const to = (x)=>x.toString(16).padStart(2,"0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

// Slightly lighter + yellower
function lightenTowardsYellow(hex){
  const {r,g,b} = hexToRgb(hex);
  const rr = Math.round(r + (255 - r) * 0.22);
  const gg = Math.round(g + (255 - g) * 0.18);
  const bb = Math.round(b + (50  - b) * 0.10);
  return rgbToHex(rr, gg, clampByte(bb));
}

// Slightly darker + bluer
function darkenTowardsBlue(hex){
  const {r,g,b} = hexToRgb(hex);
  const rr = Math.round(r * 0.72);
  const gg = Math.round(g * 0.72);
  const bb = Math.round(b + (255 - b) * 0.12);
  return rgbToHex(clampByte(rr), clampByte(gg), clampByte(bb));
}

function clampByte(x){ return Math.max(0, Math.min(255, x)); }

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
    for (let x = 0; x < CONFIG.board.cols; x++) {
      if (state.board[y][x]) return y;
    }
  }
  return null;
}

function isStackInTopRows(state, topRows) {
  const y = highestLockedRowIndex(state);
  if (y === null) return false;
  return y < topRows; // e.g., y=0..(topRows-1)
}

function createGameState(shapes) {
  return {
    shapes,
    rng: Math.random,

    board: createEmptyBoard(CONFIG.board.cols, CONFIG.board.rows),

    active: null,
    next: null,
    running: false,
    paused: false,
    gameOver: false,

    score: 0,
    lines: 0,
    level: 1,

    dropMs: CONFIG.timing.baseDropMs,
    dropAccum: 0,

    // NEW: soft drop state
    softDropping: false,

    debug: false,               // NEW
    touch: {                    // NEW
      active: false,
      startX: 0,
      startY: 0,
      startT: 0,
      lastTapT: 0,
    },
    // NEW: lock grace
    locking: false,
    lockElapsed: 0,

    // NEW: input typing (for choosing lock delay)
    lastInputType: "keyboard",   // "keyboard" | "touch"
    lastInputAt: 0,

    // NEW: tap-hold repeat handle
    tapRepeatTimer: null,
    tapRepeatInterval: null,
  };
}

function getDifficultyZone(state) {
  const inDiff1Zone = isStackInTopRows(state, CONFIG.assist.topRowsForDiff1Only);
  const inDiff2Zone = !inDiff1Zone && isStackInTopRows(state, CONFIG.assist.topRowsForDiff2Only);

  if (inDiff1Zone) return { zone: "assist: difficulty ≤ 1 (strict)", cap: 1 };
  if (inDiff2Zone) return { zone: "assist: difficulty ≤ 2 (sometimes >2)", cap: 2 };
  return { zone: "normal", cap: Infinity };
}

/* =========================================
   New piece selection (level-aware + soft)
   =========================================
   Notes for future linking/sequencing:
   - This is deliberately split into: (1) chooseLevel, (2) chooseShapeWithinLevel.
   - Later, a “linked piece” rule can override either step cleanly (e.g., force next id).
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

  const DEBUG_LINK = false; 

  const idToShape = buildIdToShapeMap(state.shapes);
  
  const prevShape = sel.lastShapeId ? idToShape.get(sel.lastShapeId) : null;
  
  if (DEBUG_LINK) {
    console.log("[LINK] lastShapeId", sel.lastShapeId);
    if (prevShape) {
      console.log("[LINK] prevShape found", {
        id: prevShape.id,
        hasNextShapes: Array.isArray(prevShape.nextShapes),
        hasNextShapeProbs: Array.isArray(prevShape.nextShapeProbs),
        nextShapes: prevShape.nextShapes,
        nextShapeProbs: prevShape.nextShapeProbs,
      });
    } else {
      console.log("[LINK] prevShape NOT found in state.shapes for lastShapeId");
    }
  }
  
  const linked = tryLinkedNextShape(state, prevShape, idToShape, DEBUG_LINK);
  
  if (linked) {
    if (DEBUG_LINK) console.log("[LINK] APPLY", { from: prevShape?.id, to: linked.id });
    commitSelectedShape(sel, linked);
  
    const lvl = (linked.difficulty ?? 1);
    if (lvl === 4 || lvl === 5) {
      const hardCfg = CONFIG.assist.pieceMix.hard;
      sel.urge.hard = 0.0;
      sel.cooldown.hard = Math.max(sel.cooldown.hard ?? 0, hardCfg.cooldownDrops ?? 9);
      sel.hasDroppedFirstHard = true;
    }
    return linked;
  }

  // Keys for level weights (0–5).
  const LEVELS = [0, 1, 2, 3, 4, 5];

  // 1) Opening blend -> base.
  const baseW = normaliseWeights({ ...mixCfg.baseLevelWeight }, LEVELS);
  const openingW = normaliseWeights({ ...mixCfg.openingLevelWeight }, LEVELS);

  const openingDrops = Math.max(0, mixCfg.openingDrops | 0);
  const openingT = openingDrops > 0 ? clamp01(1 - (sel.dropIndex - 1) / openingDrops) : 0;

  let levelW = {};
  for (const k of LEVELS) levelW[k] = lerp(baseW[k] ?? 0, openingW[k] ?? 0, openingT);

  // 2) Danger blend towards assistance mix (never allocates to 4/5 directly).
  const dangerTarget = normaliseWeights({ ...mixCfg.dangerTargetMix }, LEVELS);
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

  levelW = normaliseWeights(levelW, LEVELS);

  // Choose a level.
  const chosenLevel = sampleDiscrete(levelW, state.rng, LEVELS);

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

  // (1) Soft anti-repeat within last K: multiply frequency by a recency factor (never zero).
  const recCfg = mixCfg.recency ?? {};
  const lastK = recCfg.lastK ?? 5;
  const penaltyStrength = recCfg.penaltyStrength ?? 0.75;
  const minMultiplier = recCfg.minMultiplier ?? 0.15;

  const chosenShape = sampleByWeight(
    candidates,
    (s) => {
      const freq = (s.frequency ?? 1);
      const mult = (typeof s.id === "string")
        ? getRecencyMultiplier(s.id, sel.recentShapeIds, lastK, penaltyStrength, minMultiplier)
        : 1.0;
      return freq * mult;
    },
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

function commitSelectedShape(sel, shape) {
  const lvl = (shape.difficulty ?? 1);

  sel.lastLevel = lvl;
  sel.lastWasHard = (lvl === 4 || lvl === 5);
  sel.lastShapeId = (typeof shape.id === "string") ? shape.id : null;

  sel.levelCounts[lvl] = (sel.levelCounts[lvl] ?? 0) + 1;

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
    return { 0: 0.25, 1: 0.25, 2: 0.25, 3: 0.25, 4: 0.0 };
  }
  const out = {};
  for (const k of Object.keys(w)) out[k] = Math.max(0, w[k] ?? 0) / total;
  // Ensure all five keys exist.
  for (const k of [0, 1, 2, 3, 4]) out[k] = out[k] ?? 0;
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

function sampleByFrequency(candidates, rng) {
  let total = 0;
  for (const s of candidates) total += (s.frequency ?? 1);
  if (total <= 0) return candidates[Math.floor(rng() * candidates.length)];

  let r = rng() * total;
  for (const s of candidates) {
    r -= (s.frequency ?? 1);
    if (r <= 0) return s;
  }
  return candidates[candidates.length - 1];
}

function getActiveMatrix(state) {
  return state.active.shape.rotations[state.active.rotIdx];
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

    // OLD: y: -2
    // NEW: start fully above the board so entry is row-by-row, even for tall pieces
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

function lockPiece(state) {
  const mat = getActiveMatrix(state);
  const shape = state.active.shape;

  let lockedAboveTop = false;

  for (let y = 0; y < mat.length; y++) {
    for (let x = 0; x < mat[0].length; x++) {
      if (!mat[y][x]) continue;

      const bx = state.active.x + x;
      const by = state.active.y + y;

      if (by < 0) {
        lockedAboveTop = true;
        continue;
      }

      const paint = getActivePaintForBlock(state, x, y);

      // Store paint + style per locked block
      state.board[by][bx] = { paint, style: shape.style };
    }
  }

  if (lockedAboveTop) {
    state.gameOver = true;
    state.running = false;
  }
}

function clearFullLines(state) {
  const rows = CONFIG.board.rows;
  const cols = CONFIG.board.cols;
  const newBoard = [];
  let cleared = 0;

  for (let y = 0; y < rows; y++) {
    if (state.board[y].every((c) => c !== null)) cleared++;
    else newBoard.push(state.board[y]);
  }
  while (newBoard.length < rows) newBoard.unshift(Array(cols).fill(null));

  if (cleared > 0) {
    state.board = newBoard;
    state.lines += cleared;

    const base = CONFIG.scoring.lineClear[cleared] ?? (cleared * 100);
    state.score += base * state.level;

    const newLevel = 1 + Math.floor(state.lines / CONFIG.timing.levelEveryLines);
    if (newLevel !== state.level) {
      state.level = newLevel;
      recomputeSpeed(state);
    }
  }
  return cleared;
}

function recomputeSpeed(state) {
  const mult = Math.pow(CONFIG.timing.speedMultiplierPerLevel, state.level - 1);
  state.dropMs = Math.max(CONFIG.timing.minDropMs, Math.floor(CONFIG.timing.baseDropMs * mult));
}

// ============================================================
// RENDERER (unchanged from your prior version, except kept here in full)
// ============================================================

function createRenderer(boardCanvas, nextCanvas) {
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const cell = CONFIG.render.cellPx;
  const bw = CONFIG.board.cols * cell;
  const bh = CONFIG.board.rows * cell;

  boardCanvas.width = bw * dpr;
  boardCanvas.height = bh * dpr;
  const bctx = boardCanvas.getContext("2d");
  bctx.scale(dpr, dpr);
  
  // Size nextCanvas to its *actual* CSS size to avoid stretching
  const nextRect = nextCanvas.getBoundingClientRect();
  const nextW = Math.max(1, Math.round(nextRect.width));
  const nextH = Math.max(1, Math.round(nextRect.height));

  nextCanvas.width = nextW * dpr;
  nextCanvas.height = nextH * dpr;

  const nctx = nextCanvas.getContext("2d");
  nctx.setTransform(1, 0, 0, 1, 0, 0);
  nctx.scale(dpr, dpr);

  function draw(state) {
    bctx.clearRect(0, 0, bw, bh);
    bctx.fillStyle = CONFIG.render.bg;
    bctx.fillRect(0, 0, bw, bh);
  
    const hide = state.paused && CONFIG.pause.hideShapes;
    const cellSize = cell; // alias for clarity
  
    // ---- Locked blocks ----
    if (!hide) {
      for (let y = 0; y < CONFIG.board.rows; y++) {
        for (let x = 0; x < CONFIG.board.cols; x++) {
          const cellObj = state.board[y][x];
          if (!cellObj) continue;
  
          const px = x * cellSize;
          const py = y * cellSize;
  
          // cellObj is { paint, style }
          drawBlockWithPaint(bctx, px, py, cellSize, cellObj.paint, cellObj.style);
        }
      }
    }
  
    // ---- Active piece ----
    if (!hide && state.active) {
      const shape = state.active.shape;
      const mat = getActiveMatrix(state);
  
      for (let y = 0; y < mat.length; y++) {
        for (let x = 0; x < mat[0].length; x++) {
          if (!mat[y][x]) continue;
  
          const bx = state.active.x + x;
          const by = state.active.y + y;
  
          // still entering from above
          if (by < 0) continue;
  
          const px = bx * cellSize;
          const py = by * cellSize;
  
          // NEW: compute paint for this block of the active piece
          const paint = getActivePaintForBlock(state, x, y);
  
          drawBlockWithPaint(bctx, px, py, cellSize, paint, shape.style);
        }
      }
    }
  
    drawGrid(bctx, bw, bh, cell, CONFIG.render.gridLineAlpha);
    drawScreenFX(bctx, bw, bh);
  }
  
  function drawNextSilhouette(shape) {
    // Use actual on-screen size to avoid stretching.
    const rect = nextCanvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
  
    // Clear in CSS-pixel coords (nctx is scaled by dpr in createRenderer)
    nctx.clearRect(0, 0, w, h);
  
    if (!shape) return;
  
    const mat = shape.rotations[0];
    const ph = mat.length;
    const pw = mat[0].length;
  
    // Uniform scaling (no stretch)
    const pad = 18;
    const availW = Math.max(1, w - pad * 2);
    const availH = Math.max(1, h - pad * 2);
    const pcell = Math.max(6, Math.floor(Math.min(availW / pw, availH / ph)));
  
    const drawW = pw * pcell;
    const drawH = ph * pcell;
    const ox = Math.floor((w - drawW) / 2);
    const oy = Math.floor((h - drawH) / 2);
  
    // Solid silhouette: build ONE path that is the union of all occupied cells,
    // then fill it ONCE at full opacity. This avoids any overlap seams.
    nctx.save();
    nctx.globalAlpha = 1;
  
    // If you want colourless: use a solid opaque colour here.
    // (Avoid rgba/alpha to prevent any blending artefacts.)
    nctx.fillStyle = "#a83deb"; // opaque "silhouette ink" (edit if desired)
  
    nctx.beginPath();
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        if (!mat[y][x]) continue;
        const rx = ox + x * pcell;
        const ry = oy + y * pcell;
        nctx.rect(rx, ry, pcell, pcell);
      }
    }
    nctx.fill();
    nctx.restore();
  }

  function drawBlockWithPaint(ctx, px, py, cellSize, paint, style = {}) {
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  
    // ---------- Tunables ----------
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
  
    // Corner handling:
    // - No *double* blending (prevents corner artefacts)
    // - BUT bottom-left should be dark, top-right should be light
    // Achieve this by: excluding corners from strips, then filling those two corners once.
    const cornerMode = style.cornerMode ?? "single"; // "single" or "none"
    // If you ever want all four corners shaded, change these flags:
    const shadeBottomLeftCorner = style.shadeBottomLeftCorner ?? true;
    const shadeTopRightCorner = style.shadeTopRightCorner ?? true;
  
    // ---------- 1) Fill interior ----------
    if (typeof paint === "string") {
      ctx.fillStyle = paint;
      ctx.fillRect(px, py, cellSize, cellSize);
    } else if (paint && typeof paint === "object" && paint.pixels && paint.k) {
      const k = paint.k;
    
      // Build integer boundaries so the grid always fits perfectly in [px, px+cellSize]
      const xb = new Array(k + 1);
      const yb = new Array(k + 1);
      for (let i = 0; i <= k; i++) {
        xb[i] = px + Math.round((i * cellSize) / k);
        yb[i] = py + Math.round((i * cellSize) / k);
      }
    
      for (let sy = 0; sy < k; sy++) {
        const y0 = yb[sy], y1 = yb[sy + 1];
        const h = y1 - y0;
        if (h <= 0) continue;
    
        for (let sx = 0; sx < k; sx++) {
          const x0 = xb[sx], x1 = xb[sx + 1];
          const w = x1 - x0;
          if (w <= 0) continue;
    
          const c = paint.pixels?.[sy]?.[sx];
          ctx.fillStyle = (typeof c === "string" && isHexColour(c)) ? c : (style.baseColor ?? "#FFFFFF");
          ctx.fillRect(x0, y0, w, h);
        }
      }
    } else {
      ctx.fillStyle = style.baseColor ?? "#FFFFFF";
      ctx.fillRect(px, py, cellSize, cellSize);
    }
  
    // ---------- 2) Shading ----------
    if (w > 0 && (darkAlpha > 0 || lightAlpha > 0 || tintWarmAlpha > 0 || tintCoolAlpha > 0)) {
      ctx.save();
  
      // Dark: bottom + left, excluding bottom-left so it can be filled exactly once.
      if (darkAlpha > 0 || tintCoolAlpha > 0) {
        ctx.globalCompositeOperation = darkComposite;
  
        if (darkAlpha > 0) {
          ctx.fillStyle = `rgba(${darkRGB[0]},${darkRGB[1]},${darkRGB[2]},${darkAlpha})`;
          // bottom: exclude bottom-left corner area
          ctx.fillRect(px + w, py + cellSize - w, cellSize - w, w);
          // left: exclude bottom-left corner area
          ctx.fillRect(px, py, w, cellSize - w);
        }
  
        if (tintCoolAlpha > 0) {
          ctx.fillStyle = `rgba(${coolRGB[0]},${coolRGB[1]},${coolRGB[2]},${tintCoolAlpha})`;
          ctx.fillRect(px + w, py + cellSize - w, cellSize - w, w);
          ctx.fillRect(px, py, w, cellSize - w);
        }
  
        if (cornerMode === "single" && shadeBottomLeftCorner) {
          // bottom-left corner shaded ONCE (dark variant)
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
  
      // Light: top + right, excluding top-right so it can be filled exactly once.
      if (lightAlpha > 0 || tintWarmAlpha > 0) {
        ctx.globalCompositeOperation = lightComposite;
  
        if (lightAlpha > 0) {
          ctx.fillStyle = `rgba(${lightRGB[0]},${lightRGB[1]},${lightRGB[2]},${lightAlpha})`;
          // top: exclude top-right corner area
          ctx.fillRect(px, py, cellSize - w, w);
          // right: exclude top-right corner area
          ctx.fillRect(px + cellSize - w, py + w, w, cellSize - w);
        }
  
        if (tintWarmAlpha > 0) {
          ctx.fillStyle = `rgba(${warmRGB[0]},${warmRGB[1]},${warmRGB[2]},${tintWarmAlpha})`;
          ctx.fillRect(px, py, cellSize - w, w);
          ctx.fillRect(px + cellSize - w, py + w, w, cellSize - w);
        }
  
        if (cornerMode === "single" && shadeTopRightCorner) {
          // top-right corner shaded ONCE (light variant)
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
  
    // ---------- 3) Thin black outline ----------
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

  function drawGrid(ctx, w, h, cellPx, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(220,220,235,0.45)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += cellPx) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += cellPx) {
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke();
    }
    ctx.restore();
  }

  function drawScreenFX(ctx, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = "rgba(255,0,140,0.55)";
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = "rgba(0,255,255,0.55)";
    ctx.strokeRect(3.5, 2.5, w - 6, h - 6);
    ctx.restore();
  }

  return { draw, drawNextSilhouette };
}

// ============================================================
// NAME LAYER
// ============================================================

function createNameLayer(nameLayerEl) {
  let currentEl = null;

  function setName(name) {
    const nextEl = document.createElement("div");
    nextEl.className = "nameText enterFromRight";
    nextEl.textContent = name;
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

  return { setName };
}

// ============================================================
// UI + INPUT (soft drop)
// ============================================================
function bindUI(state, renderer, nameLayer) {
  // HUD
  const scoreText = document.getElementById("scoreText");
  const linesText = document.getElementById("linesText");

  // Overlay + overlay buttons
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlaySubtitle = document.getElementById("overlaySubtitle");
  const overlayPlayBtn = document.getElementById("overlayPlayBtn");
  const overlayResumeBtn = document.getElementById("overlayResumeBtn");
  const overlayNewBtn = document.getElementById("overlayNewBtn");

  // Pause button (bottom bar)
  const pauseBtn = document.getElementById("pauseBtn");

  // Debug panel
  const debugPanel = document.getElementById("debugPanel");
  const dbgZone = document.getElementById("dbgZone");
  const dbgPieceDiff = document.getElementById("dbgPieceDiff");
  const dbgBaseSpeed = document.getElementById("dbgBaseSpeed");

  const boardShellEl = document.getElementById("boardShell");
  const targetEl = document.body; // IMPORTANT: controls work even off-board

  function showOverlay(show, title, subtitle, mode) {
    overlay.classList.toggle("show", show);
    if (!show) return;

    overlayTitle.textContent = title ?? "Contortris";
    overlaySubtitle.textContent = subtitle ?? "";

    const m = mode ?? "start";
    overlayPlayBtn.style.display = (m === "start") ? "inline-block" : "none";
    overlayResumeBtn.style.display = (m === "pause") ? "inline-block" : "none";
    overlayNewBtn.style.display = (m === "pause" || m === "gameover") ? "inline-block" : "none";
  }

  function updateHUD() {
    scoreText.textContent = String(state.score);
    linesText.textContent = String(state.lines);

    if (state.debug) {
      const z = getDifficultyZone(state);
      dbgZone.textContent = z.zone;
      dbgPieceDiff.textContent = state.active ? String(state.active.shape.difficulty ?? 1) : "–";
      dbgBaseSpeed.textContent = `${state.dropMs} ms/row (level ${state.level})`;
    }
  }

  function startGame() {
    markInput(state, "touch");
    if (state.gameOver) resetGame(state, renderer, nameLayer, updateHUD, showOverlay);
    if (!state.running) {
      state.running = true;
      state.paused = false;
      showOverlay(false);
    }
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
    showOverlay(true, "Paused", "", "pause");
    updateHUD();
  }

  function togglePause() {
    if (!state.running || state.gameOver) return;
    if (state.paused) resumeGame();
    else pauseGame();
  }

  // Overlay buttons
  overlayPlayBtn.addEventListener("click", () => startGame());
  overlayResumeBtn.addEventListener("click", () => resumeGame());
  overlayNewBtn.addEventListener("click", () => resetGame(state, renderer, nameLayer, updateHUD, showOverlay));

  // Pause button (always ▶)
  pauseBtn.addEventListener("click", (e) => {
    e.preventDefault();
    togglePause();
  });

  // Debug toggle
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyD") {
      state.debug = !state.debug;
      debugPanel.style.display = state.debug ? "block" : "none";
      updateHUD();
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      togglePause();
      return;
    }
  });

  // Keyboard gameplay (optional)
  window.addEventListener("keydown", (e) => {
    if (!state.running && e.code !== "Enter") return;
    if (state.gameOver || state.paused) return;

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

  // ----- Tap zones -----
  // Zones are based on viewport:
  // top 22% rotate, bottom 28% step down, left 25% move left, right 25% move right.
  const Z = { top: 0.22, bottom: 0.28, side: 0.25 };

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
    // Zones are defined relative to the board rectangle (not the viewport).
    // Anything outside the board inherits the closest edge’s zone:
    // - far left of board => left
    // - far right => right
    // - above => top
    // - below => bottom
    //
    // If inside the board:
    // - top band rotates
    // - bottom band steps down
    // - else left/right halves move left/right
    const r = boardShellEl.getBoundingClientRect();
  
    const relX = x - r.left;
    const relY = y - r.top;
  
    // Outside board: choose by closest direction first (strong intent).
    if (relX < 0) return "left";
    if (relX > r.width) return "right";
    if (relY < 0) return "top";
    if (relY > r.height) return "bottom";
  
    // Inside board: define bands by board-space fractions
    const topBand = r.height * 0.22;

    // Bottom zone should be CENTERED and narrower to avoid accidental smashes.
    // Example: bottom 28% of height, but only middle 50% of width.
    const bottomBand = r.height * 0.28;
    const bottomCenterWidthFrac = 0.50;

    if (relY <= topBand) return "top";

    if (relY >= r.height - bottomBand) {
      const leftBound = r.width * (0.5 - bottomCenterWidthFrac / 2);
      const rightBound = r.width * (0.5 + bottomCenterWidthFrac / 2);

      if (relX >= leftBound && relX <= rightBound) return "bottom";
      // Bottom corners behave as left/right instead.
      return (relX < r.width * 0.5) ? "left" : "right";
    }

    // Middle region: left/right halves
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

  // Pointer events: reliable tap/hold everywhere
  targetEl.addEventListener("pointerdown", (e) => {
    // only primary contact
    if (!e.isPrimary) return;

    // stop browser gestures
    e.preventDefault();

    // Start game if not running
    if (!state.running && !state.gameOver) {
      startGame();
      return;
    }

    // Ignore taps while overlay is up (paused etc.)
    if (state.paused) return;

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
    e.preventDefault();
    stopRepeat();
    clearGlows();
  });

  targetEl.addEventListener("pointercancel", (e) => {
    if (!e.isPrimary) return;
    stopRepeat();
    clearGlows();
  });

  // Initial overlay
  showOverlay(true, "EXTRIS", "", "start");
  updateHUD();

  return { updateHUD, showOverlay };
}
function resetGame(state, renderer, nameLayer, updateHUD, showOverlay) {
  state.board = createEmptyBoard(CONFIG.board.cols, CONFIG.board.rows);
  state.active = null;
  state.next = null;
  state.running = false;
  state.paused = false;
  state.gameOver = false;
  state.score = 0;
  state.lines = 0;
  state.level = 1;
  state.dropMs = CONFIG.timing.baseDropMs;
  state.dropAccum = 0;
  state.softDropping = false;

  const ok = spawnPiece(state);
  if (!ok) state.gameOver = true;
  nameLayer.setName(state.active?.shape?.name ?? "");
  renderer.drawNextSilhouette(state.next);

  updateHUD();
  showOverlay(true, "Contortris", "Press Play. Space pauses.");
}

// ============================================================
// LOOP (soft drop modifies gravity while held)
// ============================================================

function stepLockAndSpawn(state, renderer, nameLayer, updateHUD, showOverlay) {
  lockPiece(state);
  if (state.gameOver) {
    showOverlay(true, "Game over", "Reset to try again");
    updateHUD();
    return;
  }
  clearFullLines(state);

  const ok = spawnPiece(state);
  if (!ok) {
    state.gameOver = true;
    state.running = false;
    showOverlay(true, "Game over", "Reset to try again");
  } else {
    nameLayer.setName(state.active.shape.name);
    renderer.drawNextSilhouette(state.next);
  }
  updateHUD();
}

function updateGame(state, dt, renderer, nameLayer, updateHUD, showOverlay) {
  if (!state.running || state.gameOver) return;
  if (state.paused) return;

  // --- Gravity timing (base vs soft drop) ---
  const baseDropMs = state.dropMs;
  const effectiveDropMs = state.softDropping
    ? Math.max(16, Math.floor(baseDropMs * CONFIG.timing.softDropFactor))
    : baseDropMs;

  // Accumulate time; cap backlog to avoid bursts.
  state.dropAccum += dt;
  const maxBacklog = effectiveDropMs * (CONFIG.timing.maxAccumulatedSteps ?? 2);
  if (state.dropAccum > maxBacklog) state.dropAccum = maxBacklog;

  // Process at most N fall steps per frame (prevents “teleport” feel).
  const maxSteps = CONFIG.timing.maxFallStepsPerFrame ?? 1;
  let steps = 0;

  while (state.dropAccum >= effectiveDropMs && steps < maxSteps) {
    state.dropAccum -= effectiveDropMs;

    // If already in lock grace, do NOT keep trying to drop; lock grace handles it.
    if (state.locking) break;

    const moved = tryMove(state, 0, 1);
    if (moved) {
      if (state.softDropping && (CONFIG.scoring?.softDropPerCell ?? 0) > 0) {
        state.score += CONFIG.scoring.softDropPerCell;
      }
    } else {
      // Touching down: start lock grace (do not lock immediately).
      beginLockIfNeeded(state);
      break;
    }

    steps++;
  }

  // --- Lock grace countdown ---
  if (state.locking && state.active && !state.gameOver) {
    state.lockElapsed += dt;

    // If piece can move down again (e.g., after a slide), cancel lock grace.
    // This prevents “sticking” if the player shifts into a gap.
    const mat = getActiveMatrix(state);
    if (!collides(state, state.active.x, state.active.y + 1, mat)) {
      cancelLock(state);
    } else {
      const delay = currentLockDelayMs(state);
      if (state.lockElapsed >= delay) {
        stepLockAndSpawn(state, renderer, nameLayer, updateHUD, showOverlay);
        cancelLock(state);
      }
    }
  }
}

// ============================================================
// BOOT
// ============================================================

const SHAPES = loadAndNormaliseShapes(RAW_SHAPES);

const boardCanvas = document.getElementById("boardCanvas");
const nextCanvas = document.getElementById("nextCanvas");
const nameLayerEl = document.getElementById("nameLayer");

const renderer = createRenderer(boardCanvas, nextCanvas);
const nameLayer = createNameLayer(nameLayerEl);

const state = createGameState(SHAPES);

spawnPiece(state);
nameLayer.setName(state.active.shape.name);
renderer.drawNextSilhouette(state.next);

const boardShell = document.querySelector(".boardShell");
const ui = bindUI(state, renderer, nameLayer, document.body);

let last = performance.now();

function tick(now) {
  const dt = Math.min(50, now - last);
  last = now;

  updateGame(state, dt, renderer, nameLayer, ui.updateHUD, ui.showOverlay);
  renderer.draw(state);

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);