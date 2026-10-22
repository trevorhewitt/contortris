// ============================================================
// FILL ART — what the cells an Expanderz fills look like (no DOM)
// ============================================================
// An Expanderz's `fill` can be a colour, one block of pixels (the same in every cell), or a
// picture over its whole area (powerups.js pictureBox). This is the fourth kind: art painted to
// fit the shape it actually fills, at any size, the moment it fills it. It knows
//   - where each pixel is on the board (so textures run on from cell to cell, and from one fill
//     to the next),
//   - how far it is from the piece that filled it, and in which direction (rays, rings, a glow),
//   - how far it is from the edge of what was filled (outlines, a bevel lit from the top left,
//     a puffy pillow shape), and how deep it is (darker at the bottom of the water),
// and it comes out a little different every time (the noise moves, the colours shift: `vary`).
// With `cover`, the piece's own cells become part of it (repainted, or filled in if the piece
// vanished), so the piece and what it filled are one thing; with `join`, no edge is drawn
// between the piece and its fill.
//
//   fill: {
//     k: 6,                         pixels per cell (1-9)
//     palette: ["#hex", ...],       dark to light (or "piece": the piece's own colours)
//     palettes: [[...], [...]],     ...or several, one picked each time (colourways)
//     gen: "noise",                 the painter (below), with its settings alongside
//     layers: [ { gen, palette?, alpha?, ...settings }, ... ],   ...or several, one over another
//     shade: { light: 0.22, dark: 0.3, width: 1 },  a bevel round the edge of the whole fill
//     edge: { color: "#000", width: 1, alpha: 0.5 },  an outline round it
//     glow: { color: "#fff", radius: 3, strength: 0.5 },  brighter near the piece (radius in cells)
//     depth: { color: "#000", amount: 0.4 },  towards this colour further down
//     grain: 0.05,                  a little noise in every pixel
//     vary: { hue: 12, sat: 0.08, light: 0.06 },  colours shifted at random each time it fills
//     dither: true,                 gradients in steps of the palette, dithered (pixel art)
//     smooth: false,                ...or blended smoothly
//     cover: true,                  the piece's own cells are part of the fill
//     join: true,                   no edge between the piece and its fill
//     walls: true,                  the walls and floor count as edges (outline, bevel there too)
//   }
//
// Painters (`gen`), settings in cells unless said:
//   solid      palette[0]
//   noise      cloudy noise through the palette: scale (2.5), octaves (3), contrast (1), warp (0)
//   gradient   dir: "down" | "up" | "out" (from the piece) | "in" | "across"
//   strata     horizontal layers, one palette colour each, in order: thickness (1), wobble (0.5),
//              scale (3), speckle (0.15)
//   streaks    falling streaks (rain, a waterfall): length (1.5), density (0.5), fill (0.6);
//              palette[0] the background, the rest the streak from tail to head
//   rays       from the piece: count (12), twist (0), duty (0.5), falloff (1)
//   rings      round the piece: width (1)
//   blob       one soft shape: mode "sphere" (round the piece) or "pillow" (puffed up from its
//              edges, pillow: 1.5 cells)
//   bubbles    round things (foam, marbles, popcorn): size (1), min (0.3), max (0.5), count (0.9);
//              palette[0] between them, the rest the bubble from rim to highlight
//   tiles      a tiled pattern: pattern "running" | "stack" | "checker" | "basket" | "hex" |
//              "scales" | "diamond"; w (2), h (1) (a tile's size, cells); line (1, pixels);
//              grout ("#hex"); pick "random" | "alternate" | "rows"; weights; tileVary (0.06);
//              bevel (true)
//   texture    a hand-drawn pattern that repeats: texture (a pixel grid, a whole number of cells
//              of `tk` pixels each, default k), anchor "board" (lines up across fills) | "piece"
//   picture    a picture over the area, as the picture fill (picture, slice), to shade and vary
// A layer's `alpha` lays it over the ones before; `texture` and `picture` pixels left empty ("")
// let the layers under them show.

import { isHexColour } from "./util.js";

/* ---------- colour ---------- */

const hexCache = new Map();
function hexToRgb(h) {
  let v = hexCache.get(h);
  if (v) return v;
  let s = h.trim().replace("#", "");
  if (s.length === 3) s = s.split("").map(c => c + c).join("");
  v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  hexCache.set(h, v);
  return v;
}
const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
function rgbToHex(c) {
  const f = (v) => HEX[v < 0 ? 0 : v > 255 ? 255 : Math.round(v)];
  return "#" + f(c[0]) + f(c[1]) + f(c[2]);
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a || 1)); return t * t * (3 - 2 * t); };
const frac = (x) => x - Math.floor(x);

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb([h, s, l]) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    t = frac(t);
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
function shiftColour(c, { hue = 0, sat = 0, light = 0 }) {
  const [h, s, l] = rgbToHsl(c);
  return hslToRgb([h + hue, clamp01(s + sat), clamp01(l + light)]);
}

/* ---------- noise (seeded, no state) ---------- */

function hash3(i, j, s) {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(s | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y);
  let u = x - i, v = y - j;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const a = hash3(i, j, s), b = hash3(i + 1, j, s), c = hash3(i, j + 1, s), d = hash3(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, octaves = 3) {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(x * f, y * f, s + o * 1013);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

/* ---------- the spec ---------- */

const GENS = new Set(["solid", "noise", "gradient", "strata", "streaks", "rays", "rings", "blob", "bubbles", "tiles", "texture", "picture"]);

// Is this `fill` one of these (and not a colour, a block, or a plain picture fill)?
export function isFillArt(fill) {
  return !!fill && typeof fill === "object" && !Array.isArray(fill) && (typeof fill.gen === "string" || Array.isArray(fill.layers));
}

// (a pixel grid: rows of "#hex" or "" for nothing)
function pixelGrid(g) {
  if (!Array.isArray(g) || !g.length || !Array.isArray(g[0])) return null;
  const w = g[0].length;
  if (!w || g.some(r => !Array.isArray(r) || r.length !== w)) return null;
  return g.map(r => r.map(v => (isHexColour(v) ? hexToRgb(v.trim()) : null)));
}

function paletteFrom(p, pieceColours) {
  if (p === "piece") {
    // (the piece's own colours, dark to light, a handful of them spread across the range)
    const seen = new Map();
    for (const c of pieceColours ?? []) if (isHexColour(c)) seen.set(c.toLowerCase(), hexToRgb(c.trim()));
    const all = [...seen.values()].sort((a, b) => lum(a) - lum(b));
    if (!all.length) return null;
    const n = Math.min(6, all.length);
    return Array.from({ length: n }, (_, i) => all[Math.round(i * (all.length - 1) / Math.max(1, n - 1))]);
  }
  if (!Array.isArray(p)) return null;
  const out = p.filter(isHexColour).map(c => hexToRgb(c.trim()));
  return out.length ? out : null;
}

// The fill as written in main_shapes.js -> the spec paintFill uses (or null if it isn't one).
// `pieceColours`: the piece's own colours (for palette: "piece").
export function normaliseFillArt(fill, pieceColours = []) {
  if (!isFillArt(fill)) return null;
  const k = Math.max(1, Math.min(9, Math.round(Number(fill.k) || 6)));
  const palettes = Array.isArray(fill.palettes) && fill.palettes.length
    ? fill.palettes.map(p => paletteFrom(p, pieceColours)).filter(Boolean)
    : [paletteFrom(fill.palette ?? "piece", pieceColours) ?? [[128, 128, 128]]];
  if (!palettes.length) palettes.push([[128, 128, 128]]);
  const rawLayers = Array.isArray(fill.layers) && fill.layers.length ? fill.layers : [fill];
  const layers = [];
  for (const L of rawLayers) {
    const gen = GENS.has(L.gen) ? L.gen : "solid";
    const layer = { ...L, gen, alpha: L.alpha == null ? 1 : clamp01(Number(L.alpha)) };
    layer.palette = L.palette != null ? paletteFrom(L.palette, pieceColours) : null;
    if (gen === "texture") {
      layer.tex = pixelGrid(L.texture);
      if (!layer.tex) { console.warn("a texture fill needs `texture`: a grid of pixels"); continue; }
      layer.tk = Math.max(1, Math.round(Number(L.tk) || k));
    }
    if (gen === "picture") {
      layer.pic = pixelGrid(L.picture);
      if (!layer.pic) { console.warn("a picture layer needs `picture`: a grid of pixels"); continue; }
      layer.pk = Math.max(1, Math.round(Number(L.k) || k));
      const W = Math.floor(layer.pic[0].length / layer.pk), H = Math.floor(layer.pic.length / layer.pk);
      const s = L.slice ?? {}, n = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
      const top = n(s.top, H - 1), left = n(s.left, W - 1);
      layer.slice = { W, H, top, bottom: n(s.bottom, H - 1 - top), left, right: n(s.right, W - 1 - left) };
    }
    layers.push(layer);
  }
  if (!layers.length) layers.push({ gen: "solid", alpha: 1, palette: null });
  const spec = {
    k, palettes, layers,
    shade: fill.shade === false ? null : { light: 0.22, dark: 0.28, width: 1, ...(typeof fill.shade === "object" ? fill.shade : {}) },
    edge: fill.edge ? { width: 1, alpha: 0.5, ...fill.edge, rgb: hexToRgb(isHexColour(fill.edge.color) ? fill.edge.color : "#000000") } : null,
    glow: fill.glow ? { radius: 3, strength: 0.5, ...fill.glow, rgb: hexToRgb(isHexColour(fill.glow.color) ? fill.glow.color : "#ffffff") } : null,
    depth: fill.depth ? { amount: 0.4, ...fill.depth, rgb: hexToRgb(isHexColour(fill.depth.color) ? fill.depth.color : "#000000") } : null,
    grain: Math.max(0, Number(fill.grain) || 0),
    vary: fill.vary ? { hue: 0, sat: 0, light: 0, ...fill.vary } : null,
    dither: fill.dither !== false,
    smooth: fill.smooth === true,
    cover: fill.cover === true,
    join: fill.join === true || fill.cover === true,
    walls: fill.walls !== false,
  };
  // (what it looks like in one cell, for anywhere that shows a single block of it)
  spec.swatch = swatchOf(spec);
  return spec;
}

function swatchOf(spec) {
  const cells = [];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) cells.push({ x, y });
  const paints = paintFill(spec, cells, { cols: 3, rows: 3, piece: [], seed: 7, source: { x: 1.5, y: 1.5 }, swatch: true });
  return paints.get(1 * 3 + 1);
}

/* ---------- painting ---------- */

// Paint `targets` (cells [{x, y}] about to be filled) with `spec`. ctx: { cols, rows, piece:
// [{x, y}] (the piece's own cells on the board), seed, source ({x, y} in cells: the middle of
// the piece; else worked out from `piece`), box ({x0, x1, y0, y1}: the area's box, for a
// picture layer), pieceInside (true: the piece counts as part of the fill, for its edges) }.
// Returns Map(y * cols + x -> paint: "#hex" for k = 1, else { k, pixels }).
export function paintFill(spec, targets, ctx) {
  const { cols, rows } = ctx;
  const k = spec.k;
  const seed = (ctx.seed ?? 1) >>> 0 || 1;
  const rnd = (n) => hash3(n, 77, seed);
  const out = new Map();
  if (!targets.length) return out;

  // the colours, this time: one of its colourways, shifted a little (vary)
  const pi = Math.min(spec.palettes.length - 1, Math.floor(rnd(1) * spec.palettes.length));
  const shift = spec.vary ? { hue: (rnd(2) * 2 - 1) * spec.vary.hue, sat: (rnd(3) * 2 - 1) * spec.vary.sat, light: (rnd(4) * 2 - 1) * spec.vary.light } : null;
  const recolour = (c) => (shift ? shiftColour(c, shift) : c);
  const palette = spec.palettes[pi].map(recolour);
  // (a drawn texture or picture in the first colourway's colours takes the one picked)
  const swapFrom = spec.palettes[0], swapTo = spec.palettes[pi];
  const texColour = (c) => {
    if (swapTo !== swapFrom) {
      const i = swapFrom.findIndex(p => p[0] === c[0] && p[1] === c[1] && p[2] === c[2]);
      if (i >= 0 && swapTo[i]) c = swapTo[i];
    }
    return recolour(c);
  };

  // the region: what's being filled, and (for its edges) the piece too, if it's part of it
  const inRegion = new Set(targets.map(c => c.y * cols + c.x));
  const piece = (ctx.piece ?? []).filter(p => p.x >= 0 && p.y >= 0 && p.x < cols && p.y < rows);
  const inside = new Set(inRegion);
  if (ctx.pieceInside || spec.join) for (const p of piece) inside.add(p.y * cols + p.x);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const c of targets) { x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y); }
  const source = ctx.source ?? (piece.length
    ? { x: piece.reduce((s, p) => s + p.x, 0) / piece.length + 0.5, y: piece.reduce((s, p) => s + p.y, 0) / piece.length + 0.5 }
    : { x: (x0 + x1 + 1) / 2, y: (y0 + y1 + 1) / 2 });
  let reach = 0.5;
  for (const c of targets) reach = Math.max(reach, Math.hypot(c.x + 0.5 - source.x, c.y + 0.5 - source.y) + 0.5);

  // distance (in pixels) from every pixel in the region to the nearest pixel outside it, and the
  // way out from there: a chamfer distance transform over the region's box, a pixel round it
  const bx0 = (x0 - 1) * k, by0 = (y0 - 1) * k, BW = (x1 - x0 + 3) * k, BH = (y1 - y0 + 3) * k;
  const dist = new Float32Array(BW * BH);
  const BIG = 1e9;
  const insideCell = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return !spec.walls;
    return inside.has(cy * cols + cx);
  };
  for (let j = 0; j < BH; j++) {
    const cy = Math.floor((by0 + j) / k);
    for (let i = 0; i < BW; i++) dist[j * BW + i] = insideCell(Math.floor((bx0 + i) / k), cy) ? BIG : 0;
  }
  const D1 = 1, D2 = 1.4142;
  for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) {
    const p = j * BW + i;
    let d = dist[p];
    if (d === 0) continue;
    if (i > 0) d = Math.min(d, dist[p - 1] + D1);
    if (j > 0) {
      d = Math.min(d, dist[p - BW] + D1);
      if (i > 0) d = Math.min(d, dist[p - BW - 1] + D2);
      if (i < BW - 1) d = Math.min(d, dist[p - BW + 1] + D2);
    }
    dist[p] = d;
  }
  for (let j = BH - 1; j >= 0; j--) for (let i = BW - 1; i >= 0; i--) {
    const p = j * BW + i;
    let d = dist[p];
    if (d === 0) continue;
    if (i < BW - 1) d = Math.min(d, dist[p + 1] + D1);
    if (j < BH - 1) {
      d = Math.min(d, dist[p + BW] + D1);
      if (i < BW - 1) d = Math.min(d, dist[p + BW + 1] + D2);
      if (i > 0) d = Math.min(d, dist[p + BW - 1] + D2);
    }
    dist[p] = d;
  }
  const at = (i, j) => (i < 0 || j < 0 || i >= BW || j >= BH ? 0 : Math.min(dist[j * BW + i], 64));
  // (how much the edge nearest a pixel faces the light, up and to the left: 1 facing it, -1 away)
  const LX = -0.55, LY = -0.83;
  const facing = (i, j) => {
    const gx = at(i + 1, j) - at(i - 1, j), gy = at(i, j + 1) - at(i, j - 1);
    const n = Math.hypot(gx, gy);
    return n > 0 ? -(gx * LX + gy * LY) / n : 0;
  };

  const ramp = (pal, t, px, py) => {
    const n = pal.length;
    if (n === 1) return pal[0];
    t = clamp01(t) * (n - 1);
    if (spec.smooth) {
      const i = Math.min(n - 2, Math.floor(t));
      return mix(pal[i], pal[i + 1], t - i);
    }
    if (spec.dither) t += (BAYER[py & 3][px & 3] / 16 - 0.47) * 0.9;
    return pal[Math.max(0, Math.min(n - 1, Math.round(t)))];
  };

  // ---- each painter: rgb and alpha for a pixel ----
  const off = (n) => rnd(n) * 1000;
  const painters = spec.layers.map((L, li) => {
    const pal = L.palette ? L.palette.map(recolour) : palette;
    const s = seed + li * 7919;
    switch (L.gen) {
      case "noise": {
        const scale = L.scale ?? 2.5, oct = L.octaves ?? 3, con = L.contrast ?? 1, warp = L.warp ?? 0, ox = off(10 + li), oy = off(20 + li);
        return (X, Y, px, py) => {
          let x = X / scale + ox, y = Y / scale + oy;
          if (warp) { x += warp * (fbm(x + 5.2, y + 1.3, s + 1, 2) - 0.5); y += warp * (fbm(x + 9.7, y + 2.8, s + 2, 2) - 0.5); }
          return [ramp(pal, (fbm(x, y, s, oct) - 0.5) * con * 1.8 + 0.5, px, py), 1];
        };
      }
      case "gradient": {
        const dir = L.dir ?? "down";
        return (X, Y, px, py, D) => {
          const t = dir === "up" ? 1 - (Y - y0) / (y1 - y0 + 1) : dir === "out" ? D / reach : dir === "in" ? 1 - D / reach
            : dir === "across" ? (X - x0) / (x1 - x0 + 1) : (Y - y0) / (y1 - y0 + 1);
          return [ramp(pal, t, px, py), 1];
        };
      }
      case "strata": {
        const th = L.thickness ?? 1, wob = L.wobble ?? 0.5, sc = L.scale ?? 3, sp = L.speckle ?? 0.15, ox = off(30 + li);
        return (X, Y, px, py) => {
          const yy = Y + wob * (fbm(X / sc + ox, 0.5, s, 2) - 0.5) * 2;
          const band = Math.floor(yy / th);
          let c = pal[((band % pal.length) + pal.length) % pal.length];
          if (sp && hash3(px, py, s + 3) < sp) c = mix(c, pal[(((band + 1) % pal.length) + pal.length) % pal.length], 0.6);
          return [c, 1];
        };
      }
      case "streaks": {
        const len = (L.length ?? 1.5) * k, dens = L.density ?? 0.5, fill = L.fill ?? 0.6;
        const bg = pal[0], body = pal.length > 1 ? pal.slice(1) : pal;
        return (X, Y, px, py) => {
          if (hash3(px, 3, s) > dens) return [bg, L.background === false ? 0 : 1];
          const ph = hash3(px, 5, s) * len;
          const u = frac((py + ph) / len);
          if (u > fill) return [bg, L.background === false ? 0 : 1];
          return [ramp(body, u / fill, px, py), 1];
        };
      }
      case "rays": {
        const count = L.count ?? 12, twist = L.twist ?? 0, duty = L.duty ?? 0.5, fall = L.falloff ?? 1, ph = rnd(40 + li);
        return (X, Y, px, py, D, A) => {
          const band = frac(A / (2 * Math.PI) * count + twist * D / reach + ph);
          const near = Math.pow(clamp01(1 - D / reach), fall);
          const t = band < duty ? 0.45 + 0.55 * near : 0.35 * near;
          return [ramp(pal, t, px, py), 1];
        };
      }
      case "rings": {
        const w = L.width ?? 1, ph = rnd(50 + li);
        return (X, Y, px, py, D) => [pal[Math.floor(D / w + ph) % pal.length], 1];
      }
      case "blob": {
        const mode = L.mode ?? "sphere", P = (L.pillow ?? 1.5) * k;
        return (X, Y, px, py, D, A, i, j) => {
          let t;
          if (mode === "pillow") {
            const h = smoothstep(0, P, at(i, j));
            t = 0.25 + 0.7 * h + 0.25 * facing(i, j) * (1 - h);
          } else {
            const R = reach * 1.04, nx = (X - source.x) / R, ny = (Y - source.y) / R;
            const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
            const lit = -0.45 * nx - 0.6 * ny + 0.66 * nz;
            t = 0.2 + 0.85 * clamp01(lit);
          }
          return [ramp(pal, t, px, py), 1];
        };
      }
      case "bubbles": {
        const size = (L.size ?? 1) * k, rmin = L.min ?? 0.3, rmax = L.max ?? 0.5, count = L.count ?? 0.9;
        const bg = pal[0], body = pal.length > 1 ? pal.slice(1) : pal;
        return (X, Y, px, py) => {
          const gx = Math.floor(px / size), gy = Math.floor(py / size);
          let best = null, bestQ = 1;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const cx = gx + dx, cy = gy + dy;
            if (hash3(cx, cy, s + 4) > count) continue;
            const r = size * (rmin + (rmax - rmin) * hash3(cx, cy, s + 5));
            const ux = (cx + 0.2 + 0.6 * hash3(cx, cy, s + 6)) * size, uy = (cy + 0.2 + 0.6 * hash3(cx, cy, s + 7)) * size;
            const q = Math.hypot(px + 0.5 - ux, py + 0.5 - uy) / r;
            if (q < bestQ) { bestQ = q; best = { ux, uy, r }; }
          }
          if (!best) return [bg, L.background === false ? 0 : 1];
          const nx = (px + 0.5 - best.ux) / best.r, ny = (py + 0.5 - best.uy) / best.r;
          const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
          const t = clamp01(0.15 + 0.85 * (-0.45 * nx - 0.6 * ny + 0.66 * nz)) * (bestQ > 0.82 ? 0.55 : 1);
          return [ramp(body, t, px, py), 1];
        };
      }
      case "tiles": return tilePainter(L, pal, k, s, ramp);
      case "texture": {
        const tex = L.tex, TW = tex[0].length, TH = tex.length, tk = L.tk;
        const ax = L.anchor === "piece" && piece.length ? Math.min(...piece.map(p => p.x)) * k : 0;
        const ay = L.anchor === "piece" && piece.length ? Math.min(...piece.map(p => p.y)) * k : 0;
        return (X, Y, px, py) => {
          // (k pixels a cell here, tk in the texture: scaled to fit)
          const u = Math.floor((((px - ax) * tk / k) % TW + TW) % TW), v = Math.floor((((py - ay) * tk / k) % TH + TH) % TH);
          const c = tex[v][u];
          return c ? [texColour(c), 1] : [null, 0];
        };
      }
      case "picture": {
        const { W, H, top, bottom, left, right } = L.slice, pk = L.pk, pic = L.pic;
        const box = ctx.box ?? { x0, x1, y0, y1 };
        return (X, Y, px, py) => {
          const cx = Math.floor(px / k), cy = Math.floor(py / k);
          const u = sliceAt(cx - box.x0, box.x1 - box.x0 + 1, W, left, right), v = sliceAt(cy - box.y0, box.y1 - box.y0 + 1, H, top, bottom);
          const ii = Math.floor((px - cx * k) * pk / k), jj = Math.floor((py - cy * k) * pk / k);
          const c = pic[Math.max(0, Math.min(H - 1, v)) * pk + jj]?.[Math.max(0, Math.min(W - 1, u)) * pk + ii];
          return c ? [texColour(c), 1] : [null, 0];
        };
      }
      default: return () => [pal[0], 1];
    }
  });

  // ---- every pixel of every cell ----
  const cellsToPaint = spec.cover ? [...targets, ...piece.filter(p => !inRegion.has(p.y * cols + p.x))] : targets;
  const sh = spec.shade, ed = spec.edge, gl = spec.glow, dp = spec.depth, gr = spec.grain;
  for (const c of cellsToPaint) {
    const pixels = Array.from({ length: k }, () => Array(k));
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
      const px = c.x * k + i, py = c.y * k + j;
      const X = (px + 0.5) / k, Y = (py + 0.5) / k;
      const D = Math.hypot(X - source.x, Y - source.y), A = Math.atan2(Y - source.y, X - source.x);
      const bi = px - bx0, bj = py - by0;
      let rgb = null;
      for (let li = 0; li < painters.length; li++) {
        const [col, a] = painters[li](X, Y, px, py, D, A, bi, bj);
        if (!col || a <= 0) continue;
        const la = a * spec.layers[li].alpha;
        rgb = rgb && la < 1 ? mix(rgb, col, la) : col;
      }
      rgb = rgb ?? palette[0];
      const d = at(bi, bj);
      if (sh && d <= sh.width + 0.01) {
        const f = facing(bi, bj);
        if (f > 0.25) rgb = mix(rgb, [255, 255, 255], sh.light * Math.min(1, f + 0.2));
        else if (f < -0.25) rgb = mix(rgb, [0, 0, 0], sh.dark * Math.min(1, -f + 0.2));
      }
      if (ed && d <= ed.width + 0.01) rgb = mix(rgb, ed.rgb, ed.alpha);
      if (gl) rgb = mix(rgb, gl.rgb, gl.strength * Math.pow(clamp01(1 - D / gl.radius), 1.5));
      if (dp) rgb = mix(rgb, dp.rgb, dp.amount * clamp01((Y - y0) / (y1 - y0 + 1)));
      if (gr) { const g = (hash3(px, py, seed + 9) - 0.5) * 2 * gr * 255; rgb = [rgb[0] + g, rgb[1] + g, rgb[2] + g]; }
      pixels[j][i] = rgbToHex(rgb);
    }
    out.set(c.y * cols + c.x, k === 1 ? pixels[0][0] : { k, pixels });
  }
  return out;
}

// (which of `size` picture blocks goes `u` blocks into a box `n` long, `a` and `b` kept at the
// ends: as powerups.js picturePaint)
function sliceAt(u, n, size, a, b) {
  if (u < a) return Math.min(u, size - 1);
  if (u >= n - b) return Math.max(0, size - (n - u));
  const mid = Math.max(1, size - a - b);
  if (n <= size) return Math.min(size - 1, a + Math.floor((mid - (n - a - b)) / 2) + (u - a));
  return a + ((u - a) % mid);
}

/* ---------- tiles ---------- */

// A tiled pattern: which tile a pixel is in, how far it is from that tile's edge (for the grout
// and a bevel), and the tile's colour.
function tilePainter(L, pal, k, s, ramp) {
  const W = Math.max(1, Math.round((L.w ?? 2) * k)), H = Math.max(1, Math.round((L.h ?? 1) * k));
  const line = L.line ?? 1, grout = L.grout && isHexColour(L.grout) ? hexToRgb(L.grout) : null;
  const pick = L.pick ?? "random", weights = Array.isArray(L.weights) ? L.weights : null, tv = L.tileVary ?? 0.06, bevel = L.bevel !== false;
  const pattern = L.pattern ?? "running";
  const colourOf = (a, b, parity, row) => {
    let i;
    if (pick === "alternate") i = parity % pal.length;
    else if (pick === "rows") i = ((row % pal.length) + pal.length) % pal.length;
    else if (weights) {
      const tot = weights.reduce((x, y) => x + Math.max(0, y), 0) || 1;
      let r = hash3(a, b, s + 11) * tot;
      i = 0;
      while (i < pal.length - 1 && (r -= Math.max(0, weights[i] ?? 0)) > 0) i++;
    } else i = Math.floor(hash3(a, b, s + 11) * pal.length);
    let c = pal[Math.max(0, Math.min(pal.length - 1, i))];
    if (tv) { const v = (hash3(a, b, s + 12) - 0.5) * 2 * tv * 255; c = [c[0] + v, c[1] + v, c[2] + v]; }
    return c;
  };
  // each pattern: (px, py) -> [tile a, tile b, parity, row, distance to the edge (px), which edge
  // is nearest: -1 top/left (lit), 1 bottom/right (shaded)]
  const rect = (px, py, w, h, offs) => {
    const row = Math.floor(py / h), xo = px + (offs ? (row & 1) * offs : 0), col = Math.floor(xo / w);
    const lx = xo - col * w, ly = py - row * h;
    const dl = lx, dr = w - 1 - lx, dt = ly, db = h - 1 - ly;
    const m = Math.min(dl, dr, dt, db);
    return [col, row, (col + row) & 1, row, m, m === dt || m === dl ? -1 : 1];
  };
  let at;
  switch (pattern) {
    case "stack": at = (px, py) => rect(px, py, W, H, 0); break;
    case "checker": at = (px, py) => rect(px, py, W, H, 0); break;
    case "basket": {
      const S = Math.max(2, Math.min(W, H));
      at = (px, py) => {
        const sx = Math.floor(px / (2 * S)), sy = Math.floor(py / (2 * S)), lx = px - sx * 2 * S, ly = py - sy * 2 * S;
        const flat = ((sx + sy) & 1) === 0;
        const half = flat ? (ly < S ? 0 : 1) : (lx < S ? 0 : 1);
        const llx = flat ? lx : lx - half * S, lly = flat ? ly - half * S : ly, w = flat ? 2 * S : S, h = flat ? S : 2 * S;
        const dl = llx, dr = w - 1 - llx, dt = lly, db = h - 1 - lly, m = Math.min(dl, dr, dt, db);
        return [sx * 2 + half, sy * 7 + (flat ? 0 : 3), half, sy, m, m === dt || m === dl ? -1 : 1];
      };
      break;
    }
    case "diamond": {
      const D = Math.max(2, W);
      at = (px, py) => {
        const u = (px + py) / D, v = (px - py) / D, a = Math.floor(u), b = Math.floor(v);
        const lu = (u - a) * D, lv = (v - b) * D;
        const m = Math.min(lu, D - lu, lv, D - lv) / 1.4142;
        return [a, b, (a + b) & 1, a, m, lu < D / 2 ? -1 : 1];
      };
      break;
    }
    case "hex": {
      const R = Math.max(2, W / 2);
      at = (px, py) => {
        // (pointy-top hexagons R across their flats... near enough for pixels)
        const x = px + 0.5, y = py + 0.5;
        const q = (Math.sqrt(3) / 3 * x - y / 3) / R, r = (2 / 3 * y) / R;
        let cx = q, cz = r, cy = -q - r;
        let rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
        const dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
        if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
        const hx = R * Math.sqrt(3) * (rx + rz / 2), hy = R * 1.5 * rz;
        const ex = Math.abs(x - hx), ey = Math.abs(y - hy);
        const m = Math.max(0, (R * Math.sqrt(3) / 2 - Math.max(ex, ex * 0.5 + ey * Math.sqrt(3) / 2)));
        return [rx, rz, ((rx - rz) % 3 + 3) % 3, rz, m, y < hy ? -1 : 1];
      };
      break;
    }
    case "scales": {
      const R = Math.max(2, W / 2);
      at = (px, py) => {
        const x = px + 0.5, y = py + 0.5, r0 = Math.floor(y / R);
        for (let r = r0 + 1; r >= r0 - 1; r--) {
          const off = (r & 1) * R, i = Math.round((x - off) / (2 * R)), cx = i * 2 * R + off, cy = r * R;
          const d = Math.hypot(x - cx, y - cy);
          if (d < R && y >= cy - R * 0.2) return [i, r, (i + r) & 1, r, R - d, y < cy + R * 0.3 ? -1 : 1];
        }
        return [0, r0, 0, r0, 0, 1];
      };
      break;
    }
    default: at = (px, py) => rect(px, py, W, H, Math.round(W / 2)); // running bond
  }
  return (X, Y, px, py) => {
    const [a, b, parity, row, m, side] = at(px, py);
    if (grout && m < line) return [grout, 1];
    let c = pattern === "checker" ? pal[parity % pal.length] : colourOf(a, b, parity, row);
    if (bevel && m < line + 1) c = side < 0 ? mix(c, [255, 255, 255], 0.22) : mix(c, [0, 0, 0], 0.22);
    return [c, 1];
  };
}
