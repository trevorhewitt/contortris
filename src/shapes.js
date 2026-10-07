// ============================================================
// SHAPES — load and normalise block definitions (no DOM)
// ============================================================

import { isHexColour } from "./util.js";
import { normalisePowerup, areaRotationsFor } from "./powerups.js";

// Splits the raw SHAPES array into regular blocks and powerups.
export function loadShapes(rawShapes) {
  const all = loadAndNormaliseShapes(rawShapes);
  return {
    shapes: all.filter(s => !s.powerup),
    powerups: all.filter(s => s.powerup),
  };
}

export function loadAndNormaliseShapes(rawShapes, defaults = {}) {
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
  // off the top/left so other grids (colours, powerup areas, zones) can line up.
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
    const trim = { top: parsed.top, left: parsed.left };

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
      powerup = normalisePowerup(s.powerup, allRotations, trim, id);
      if (powerup) {
        // Effects never rotate: a rotated powerup keeps its rotation-0 area, in board
        // orientation, centred on the piece the same way.
        powerup.areaRotations = allowed.map(i => fixedArea(powerup.areaRotations[0], allRotations[0], allRotations[i]));
        const fill = normaliseFillPaint(powerup.fill, style.baseColor);
        powerup.fillPaint = fill.paint;
        powerup.fillStyle = { ...style, baseColor: fill.baseColor };
        for (const part of powerup.parts ?? []) {
          part.areaRotations = allowed.map(i => fixedArea(part.areaRotations[0], allRotations[0], allRotations[i]));
          const pf = part.fill != null ? normaliseFillPaint(part.fill, style.baseColor) : fill;
          part.fillPaint = pf.paint;
          part.fillStyle = { ...style, baseColor: pf.baseColor };
        }
      }
    }

    // --- zones (optional): named regions around the piece, e.g. "inside" ---
    let zones = null;
    if (s.zones && typeof s.zones === "object") {
      zones = {};
      for (const [zoneName, area] of Object.entries(s.zones)) {
        if (!area || !area.grid) continue;
        const all = areaRotationsFor(area, allRotations, trim);
        zones[zoneName] = allowed.map(i => all[i]);
      }
    }

    const tags = Array.isArray(s.tags) ? s.tags.map(t => String(t)) : [];

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
      tags,
      noShake: s.noShake === true, // lands without shaking the board (e.g. a swarm of bees)

      // Keep original colour spec for future extension
      color: s.color,

      // Linking/sequencing metadata (used by the piece picker)
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

      // Named zones per rotation (null if none)
      zones,
    };
  });
}

// The rotation-0 area `base` (offsets from the piece's top-left), moved so it sits the same
// way around the centre of the piece's rotated matrix `mat`.
function fixedArea(base, mat0, mat) {
  if (!base) return base;
  const sx = Math.floor((mat[0].length - mat0[0].length) / 2);
  const sy = Math.floor((mat.length - mat0.length) / 2);
  return {
    cells: base.cells.map(({ dx, dy }) => ({ dx: dx + sx, dy: dy + sy })),
    rows: base.rows.map(dy => dy + sy),
    cols: base.cols.map(dx => dx + sx),
  };
}

// Does `shape` match an achievement-style match object {ids, tags, types}?
// A missing or empty match matches everything.
export function matchShape(shape, match) {
  if (!shape) return false;
  if (!match) return true;
  const ids = match.ids ?? [];
  const tags = match.tags ?? [];
  const types = match.types ?? [];
  const levels = match.levels ?? [];
  if (!ids.length && !tags.length && !types.length && !levels.length) return true;
  if (levels.length && !shape.powerup && levels.includes(shape.difficulty ?? 1)) return true;
  if (ids.includes(shape.id)) return true;
  if (tags.length && shape.tags?.some(t => tags.includes(t))) return true;
  if (types.length && shape.powerup && types.includes(shape.powerup.type)) return true;
  return false;
}

export function getShapePaint(shape, rotIdx, bx, by) {
  return shape.cellPaints[rotIdx][by][bx];
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
