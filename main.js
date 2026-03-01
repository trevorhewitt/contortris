const CONFIG = {
    board: { cols: 14, rows: 28 },
    timing: {
      baseDropMs: 500,
      minDropMs: 110,
      levelEveryLines: 3,
      speedMultiplierPerLevel: 0.92,
  
      // NEW: soft drop factor while ↓ is held.
      // e.g. 0.12 => ~8.3× faster gravity.
      softDropFactor: 0.12,
      maxFallStepsPerFrame: 1,        // NEW: 1 = no multi-row jumps per frame
      maxAccumulatedSteps: 2,         // NEW: cap backlog to avoid bursts after lag
      // Lock grace after touching down
      lockDelayMsKeyboard: 220,
      lockDelayMsTouch: 520,

      // Tap-and-hold repeat
      tapRepeatStartMs: 140,
      tapRepeatEveryMs: 55,
    },
    scoring: {
      lineClear: { 1: 100, 2: 250, 3: 450, 4: 700 },
  
      // NEW: optional scoring while soft-dropping (per cell advanced due to soft drop).
      // Set to 0 if you don’t want it.
      softDropPerCell: 1,
  
      // Kept but no longer used by ArrowDown (reserved if you add hard-drop later)
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
      // “Danger” is measured by how many TOP rows contain any locked blocks.
      // If the stack reaches into the top N rows, apply restrictions.
    
      // If any locked block is within the top n rows -> mostly difficulty <= 2
      topRowsForDiff2Only: 20,
    
      // If any locked block is within the top m rows -> difficulty <= 1 only (no exceptions)
      topRowsForDiff1Only: 10,
    
      // When in the diff<=2 zone, occasionally allow harder pieces anyway
      allowHarderThan2Prob: 0.15,
    },
  };
  
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
  
      const difficulty = Number.isFinite(+s.difficulty) ? +s.difficulty : (Number.isFinite(+defaults.difficulty) ? +defaults.difficulty : 1);
      const frequency = Number.isFinite(+s.frequency) ? +s.frequency : (Number.isFinite(+defaults.frequency) ? +defaults.frequency : 1);
  
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
            console.warn(`[${id}] colour grid dims (${gridW0}×${gridH0}) do not match piece dims (${matW0}×${matH0}); falling back to solid baseColor.`);
          }
        }
      }
  
      return {
        id,
        name,
        difficulty,
        frequency,
        style,
  
        // Keep original colour spec for future extension
        color: s.color,
  
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

function clamp01(x){ return Math.max(0, Math.min(1, x)); }

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

  function randomShape(state) {
    // Decide difficulty cap based on how high the locked stack is.
    const inDiff1Zone = isStackInTopRows(state, CONFIG.assist.topRowsForDiff1Only);
    const inDiff2Zone = !inDiff1Zone && isStackInTopRows(state, CONFIG.assist.topRowsForDiff2Only);

    let difficultyCap = Infinity;
  
    if (inDiff1Zone) {
      difficultyCap = 1; // strict: no exceptions
    } else if (inDiff2Zone) {
      // Mostly <=2, but sometimes allow >2.
      const allowHard = state.rng() < CONFIG.assist.allowHarderThan2Prob;
      difficultyCap = allowHard ? Infinity : 2;
    }
  
    // Candidate pool respecting cap (and frequency > 0).
    let candidates = state.shapes.filter(s => (s.frequency ?? 1) > 0 && (s.difficulty ?? 1) <= difficultyCap);
  
    // Fallback if cap eliminates everything (e.g., user defined no diff<=1 shapes)
    if (candidates.length === 0) {
      candidates = state.shapes.filter(s => (s.frequency ?? 1) > 0);
    }
    if (candidates.length === 0) {
      // Absolute fallback: original uniform behaviour
      return state.shapes[Math.floor(state.rng() * state.shapes.length)];
    }
  
    // Weighted by frequency (0..1). 0 => never.
    let total = 0;
    for (const s of candidates) total += (s.frequency ?? 1);
  
    if (total <= 0) {
      return candidates[Math.floor(state.rng() * candidates.length)];
    }
  
    let r = state.rng() * total;
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
    if (!state.next) state.next = randomShape(state);
    const shape = state.next;
    state.next = randomShape(state);
  
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
      nctx.fillStyle = "#1c002e"; // opaque "silhouette ink" (edit if desired)
    
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
      showOverlay(true, "Paused", "Use ▶ to resume. New game resets.", "pause");
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
    showOverlay(true, "EXTRIS", "Press Play (tap anywhere).", "start");
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