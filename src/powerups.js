// ============================================================
// POWERUPS — pure logic (no DOM). Imported by main.js and by the tests.
// ============================================================
//
// Board format (same as main.js): board[y][x] is null (empty) or a cell object.
// Area format: see the doc comment at the top of shapes/powerup_shapes.js.

export const POWERUP_TYPES = ["destroyer", "gravity", "expander", "acid", "blast", "goo", "phantom", "combo"];

// Classes a combo can be built from, in the order their parts fire.
export const COMBO_PART_TYPES = ["destroyer", "acid", "blast", "gravity", "expander"];

export const DEFAULT_EFFECT_TEXT = {
  destroyer: "destroys highlighted blocks",
  gravity: "gravitates highlighted blocks",
  expander: "fills highlighted blocks",
  acid: "dissolves the blocks around it",
  blast: "blasts highlighted blocks away",
  goo: "melts into the gaps below",
  phantom: "falls through blocks into the deepest gap",
  combo: "does several things at once",
};

// Longer explanations for intro / help screens, one per class.
export const CLASS_INFO = {
  destroyer: { name: "Destroyers", text: "When it lands, every highlighted block is destroyed." },
  gravity: { name: "Gravity", text: "Highlighted blocks fall until they hit something, squashing out air pockets." },
  expander: { name: "Expanders", text: "Fills every highlighted empty cell with stuff, plugging gaps." },
  acid: { name: "Acid", text: "Dissolves every block it touches where it lands. Rub it up against the mess." },
  blast: { name: "Blasts", text: "Throws the highlighted blocks outwards, then they fall back down somewhere new." },
  goo: { name: "Goo", text: "Melts when it lands and flows down into the lowest gaps it can reach." },
  phantom: { name: "Phantoms", text: "Falls straight through other blocks and settles in the deepest gap it fits." },
  combo: { name: "Combos", text: "Two powerups in one: each kind of highlight does its own thing, one after the other." },
};

// Which consume by default (vanish when they fire).
const CONSUMES = { destroyer: true, gravity: true, expander: false, acid: true, blast: true, goo: true, phantom: false, combo: true };

// How helpful a powerup is (1 = barely, 5 = a lifesaver) when the data doesn't say.
const DEFAULT_HELP_BY_TIER = { 1: 2, 2: 3, 3: 4.5 };

const DIRECTIONS = {
  down: { dx: 0, dy: 1 },
  up: { dx: 0, dy: -1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// Area flags (bitmask) for one area entry.
export const AREA_CELL = 1;
export const AREA_ROW = 2;
export const AREA_COL = 4;

const AREA_CHAR_FLAGS = {
  "#": AREA_CELL,
  "-": AREA_ROW,
  "|": AREA_COL,
  "+": AREA_ROW | AREA_COL,
};

/* =========================
   Normalisation
   ========================= */

// Parse an area grid into offsets relative to the piece's top-left block.
// `trim` = {top, left}: how many empty rows/cols were trimmed off the top/left
// of the piece grid when it was normalised (so the origin still lines up).
export function parseArea(area, trim = { top: 0, left: 0 }) {
  const out = { cells: [], rows: [], cols: [] };
  if (!area || !area.grid) return out;

  const lines = Array.isArray(area.grid) ? area.grid : String(area.grid).split("\n");
  const [ox, oy] = Array.isArray(area.origin) ? area.origin : [0, 0];

  const rowSet = new Set();
  const colSet = new Set();

  for (let gy = 0; gy < lines.length; gy++) {
    const line = String(lines[gy]);
    for (let gx = 0; gx < line.length; gx++) {
      const flags = AREA_CHAR_FLAGS[line[gx]] ?? 0;
      if (!flags) continue;
      const dx = gx - (ox | 0) - (trim.left | 0);
      const dy = gy - (oy | 0) - (trim.top | 0);
      if (flags & AREA_CELL) out.cells.push({ dx, dy });
      if (flags & AREA_ROW) rowSet.add(dy);
      if (flags & AREA_COL) colSet.add(dx);
    }
  }

  out.rows = [...rowSet].sort((a, b) => a - b);
  out.cols = [...colSet].sort((a, b) => a - b);
  return out;
}

// Rotate area offsets 90° clockwise to follow a piece rotation.
// `pieceH` is the height of the piece matrix BEFORE this rotation.
// Matches main.js rotateMatrix90CW: (x, y) -> (H - 1 - y, x).
export function rotateArea90CW(area, pieceH) {
  const rot = ({ dx, dy }) => ({ dx: pieceH - 1 - dy, dy: dx });
  return {
    cells: area.cells.map(rot),
    // a whole row at dy becomes a whole column at (H - 1 - dy), and vice versa
    rows: area.cols.slice().sort((a, b) => a - b),
    cols: area.rows.map(dy => pieceH - 1 - dy).sort((a, b) => a - b),
  };
}

// Parse an area/zone ({origin, grid}) for every rotation of a piece.
// `rotations` are the piece's boolean matrices in rotation order (0..3).
export function areaRotationsFor(area, rotations, trim = { top: 0, left: 0 }) {
  const out = [parseArea(area, trim)];
  for (let i = 1; i < rotations.length; i++) {
    out.push(rotateArea90CW(out[i - 1], rotations[i - 1].length));
  }
  return out;
}

export function isEmptyArea(a) {
  return !a.cells.length && !a.rows.length && !a.cols.length;
}

// Normalise a raw `powerup` object. `rotations` are the piece's boolean
// matrices (one per allowed rotation), `trim` comes from the grid parser.
export function normalisePowerup(raw, rotations, trim, id = "?") {
  if (!raw || typeof raw !== "object") return null;

  const type = POWERUP_TYPES.includes(raw.type) ? raw.type : null;
  if (!type) {
    console.warn(`[${id}] unknown powerup type "${raw.type}"; treating as a regular shape.`);
    return null;
  }

  const direction = DIRECTIONS[raw.direction] ? raw.direction : "down";
  const tier = Math.max(1, Math.min(3, Math.round(Number(raw.tier) || 1)));

  let areaRotations;
  let parts = null;
  if (type === "combo") {
    // each part is a small powerup of its own (no goo / phantom / nested combos)
    parts = (Array.isArray(raw.parts) ? raw.parts : [])
      .filter(p => p && COMBO_PART_TYPES.includes(p.type))
      .map(p => normalisePowerup({ ...p, consume: false, tier: raw.tier }, rotations, trim, `${id}/${p.type}`))
      .filter(Boolean)
      .sort((a, b) => COMBO_PART_TYPES.indexOf(a.type) - COMBO_PART_TYPES.indexOf(b.type));
    if (parts.length < 2) console.warn(`[${id}] a combo needs at least two parts.`);
    areaRotations = rotations.map((_, i) => unionAreas(parts.map(p => p.areaRotations[i])));
  } else if (type === "acid") {
    // everything within `reach` steps of the piece, plus any explicit area
    const reach = Math.max(1, Math.round(Number(raw.reach) || 1));
    const extra = raw.area ? areaRotationsFor(raw.area, rotations, trim) : null;
    areaRotations = rotations.map((mat, i) => {
      const t = touchArea(mat, reach);
      if (extra) {
        t.cells.push(...extra[i].cells);
        t.rows = [...new Set([...t.rows, ...extra[i].rows])];
        t.cols = [...new Set([...t.cols, ...extra[i].cols])];
      }
      return t;
    });
  } else if (type === "goo" || type === "phantom") {
    areaRotations = rotations.map(() => ({ cells: [], rows: [], cols: [] }));
  } else {
    areaRotations = areaRotationsFor(raw.area, rotations, trim);
    if (isEmptyArea(areaRotations[0])) {
      console.warn(`[${id}] powerup has an empty area; it will do nothing.`);
    }
  }

  return {
    type,
    direction,
    tier,
    description: (typeof raw.description === "string" && raw.description.trim())
      ? raw.description.trim()
      : DEFAULT_EFFECT_TEXT[type],
    intro: typeof raw.intro === "string" ? raw.intro.trim() : "",
    consume: (typeof raw.consume === "boolean") ? raw.consume : CONSUMES[type],
    collapse: (type === "destroyer" || type === "acid") && raw.collapse === true,
    reach: Math.max(1, Math.round(Number(raw.reach) || 1)),
    push: Math.max(1, Number(raw.push) || 3),
    volume: Math.max(0.1, Number(raw.volume) || 1),
    fill: raw.fill ?? null,
    help: Number.isFinite(Number(raw.help)) && raw.help !== null && raw.help !== ""
      ? Math.max(1, Math.min(5, Number(raw.help)))
      : DEFAULT_HELP_BY_TIER[tier],
    parts,
    areaRotations,
  };
}

function unionAreas(list) {
  const out = { cells: [], rows: [], cols: [] };
  for (const a of list) {
    if (!a) continue;
    out.cells.push(...a.cells);
    out.rows.push(...a.rows);
    out.cols.push(...a.cols);
  }
  out.rows = [...new Set(out.rows)].sort((a, b) => a - b);
  out.cols = [...new Set(out.cols)].sort((a, b) => a - b);
  return out;
}

// The area of a powerup at board position (px, py) in rotation `rot`. Combos also get
// `parts`: one resolved area per part.
export function resolvePowerupArea(pu, rot, px, py, cols, rows) {
  const area = resolveArea(pu.areaRotations[rot] ?? pu.areaRotations[0], px, py, cols, rows);
  if (pu.parts) area.parts = pu.parts.map(p => resolveArea(p.areaRotations[rot] ?? p.areaRotations[0], px, py, cols, rows));
  return area;
}

// Cells within `reach` (Manhattan) steps of the piece's blocks, not the blocks themselves.
export function touchArea(mat, reach = 1) {
  const H = mat.length, W = mat[0].length;
  const cells = [];
  for (let dy = -reach; dy < H + reach; dy++) {
    for (let dx = -reach; dx < W + reach; dx++) {
      if (mat[dy]?.[dx]) continue;
      let best = Infinity;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (mat[y][x]) best = Math.min(best, Math.abs(dx - x) + Math.abs(dy - y));
      }
      if (best <= reach) cells.push({ dx, dy });
    }
  }
  return { cells, rows: [], cols: [] };
}

/* =========================
   Area resolution on a board
   ========================= */

// Resolve the area of a piece at board position (px, py).
// Returns:
//   flags:    Uint8Array(cols*rows), non-zero for affected cells
//   indices:  affected cell indices (y*cols + x), sorted
//   fullRows: board rows covered wall-to-wall by a row flag
export function resolveArea(areaRot, px, py, cols, rows) {
  const flags = new Uint8Array(cols * rows);
  const fullRows = [];

  for (const { dx, dy } of areaRot.cells) {
    const x = px + dx, y = py + dy;
    if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
    flags[y * cols + x] |= AREA_CELL;
  }
  for (const dy of areaRot.rows) {
    const y = py + dy;
    if (y < 0 || y >= rows) continue;
    fullRows.push(y);
    for (let x = 0; x < cols; x++) flags[y * cols + x] |= AREA_ROW;
  }
  for (const dx of areaRot.cols) {
    const x = px + dx;
    if (x < 0 || x >= cols) continue;
    for (let y = 0; y < rows; y++) flags[y * cols + x] |= AREA_COL;
  }

  const indices = [];
  for (let i = 0; i < flags.length; i++) if (flags[i]) indices.push(i);
  return { flags, indices, fullRows };
}

/* =========================
   Effects (mutate the board)
   ========================= */

// Destroyer: empties every affected cell. Returns [{x, y, cell}].
export function applyDestroy(board, area, cols) {
  const destroyed = [];
  for (const i of area.indices) {
    const x = i % cols, y = (i / cols) | 0;
    const cell = board[y][x];
    if (!cell) continue;
    destroyed.push({ x, y, cell });
    board[y][x] = null;
  }
  return destroyed;
}

// Gravity: every affected block moves in `direction` until it hits a wall or
// another block. Blocks closest to the "floor" settle first, so stacked blocks
// land on each other. Unaffected blocks stay put and act as obstacles.
// Returns moves [{fromX, fromY, toX, toY, cell}] (only blocks that moved).
export function applyGravity(board, area, cols, rows, direction = "down") {
  const dir = DIRECTIONS[direction] ?? DIRECTIONS.down;
  const moves = [];

  // Visit order: nearest the floor first.
  const order = [];
  if (dir.dy !== 0) {
    const ys = [];
    for (let y = 0; y < rows; y++) ys.push(y);
    if (dir.dy > 0) ys.reverse();
    for (const y of ys) for (let x = 0; x < cols; x++) order.push([x, y]);
  } else {
    const xs = [];
    for (let x = 0; x < cols; x++) xs.push(x);
    if (dir.dx > 0) xs.reverse();
    for (const x of xs) for (let y = 0; y < rows; y++) order.push([x, y]);
  }

  for (const [x, y] of order) {
    if (!area.flags[y * cols + x]) continue;
    const cell = board[y][x];
    if (!cell) continue;

    let tx = x, ty = y;
    while (true) {
      const nx = tx + dir.dx, ny = ty + dir.dy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) break;
      if (board[ny][nx]) break;
      tx = nx; ty = ny;
    }
    if (tx === x && ty === y) continue;

    board[y][x] = null;
    board[ty][tx] = cell;
    moves.push({ fromX: x, fromY: y, toX: tx, toY: ty, cell });
  }
  return moves;
}

// Expander: fills every empty affected cell with makeCell(x, y).
// Returns [{x, y, cell}].
export function applyExpand(board, area, cols, makeCell) {
  const filled = [];
  for (const i of area.indices) {
    const x = i % cols, y = (i / cols) | 0;
    if (board[y][x]) continue;
    const cell = makeCell(x, y);
    board[y][x] = cell;
    filled.push({ x, y, cell });
  }
  return filled;
}

// Remove whole rows and drop everything above them (like a line clear).
// Returns { removed: [{y, cells}], dropDistances } where dropDistances[newY]
// is how many rows the row now at newY fell (for the fall animation).
export function collapseRows(board, rowsToRemove, cols) {
  const rows = board.length;
  const set = new Set(rowsToRemove);
  const removed = [];
  const kept = [];
  const dropDistances = Array(rows).fill(0);

  for (let y = 0; y < rows; y++) {
    if (set.has(y)) removed.push({ y, cells: board[y].slice() });
    else kept.push(y);
  }
  if (!removed.length) return { removed, dropDistances };

  const newBoard = [];
  for (let i = 0; i < removed.length; i++) newBoard.push(Array(cols).fill(null));
  for (const y of kept) newBoard.push(board[y]);

  // dropDistances: for each surviving row, the number of removed rows below it.
  for (let i = 0; i < kept.length; i++) {
    const oldY = kept[i];
    const newY = removed.length + i;
    dropDistances[newY] = newY - oldY;
  }

  for (let y = 0; y < rows; y++) board[y] = newBoard[y];
  return { removed, dropDistances };
}

/* =========================
   Board analysis (for the powerup scheduler)
   ========================= */

// holes = empty cells with at least one block somewhere above them in the column.
export function analyseBoard(board) {
  const rows = board.length;
  const cols = rows ? board[0].length : 0;
  let highest = rows;
  let holes = 0;
  let filled = 0;

  for (let x = 0; x < cols; x++) {
    let seenBlock = false;
    for (let y = 0; y < rows; y++) {
      if (board[y][x]) {
        filled++;
        if (!seenBlock) {
          seenBlock = true;
          if (y < highest) highest = y;
        }
      } else if (seenBlock) {
        holes++;
      }
    }
  }
  return { highest, holes, filled, stackHeight: rows - highest };
}

// Blast: every block in the area is launched away from `centre` (harder the closer it
// is, always with some lift), flies on a ballistic arc under gravity, bounces off the
// walls, and lands where it comes down. All blocks fly at once, so they land on each
// other in the order they come down. `push` scales how far they go.
// Moves carry `path` ([{x, y, t}] in cells and seconds), `flight` (seconds) and `spin`
// (radians, a whole number of turns) for the animation.
export const BLAST_PHYSICS = { gravity: 40, speedPerPush: 3.1, lift: 11, dt: 1 / 120, sampleEvery: 1 / 40, maxFlight: 3 };

export function applyBlast(board, area, cols, rows, centre, push = 3, rng = Math.random) {
  const P = BLAST_PHYSICS;
  const flyers = [];
  let maxD = 0;
  for (const i of area.indices) {
    const x = i % cols, y = (i / cols) | 0;
    if (!board[y][x]) continue;
    const d = Math.hypot(x - centre.x, y - centre.y);
    maxD = Math.max(maxD, d);
    flyers.push({ x, y, d, cell: board[y][x] });
  }
  if (!flyers.length) return [];
  for (const f of flyers) board[f.y][f.x] = null; // everything in the blast takes off at once

  for (const f of flyers) {
    let ux = f.x - centre.x, uy = f.y - centre.y;
    let len = Math.hypot(ux, uy);
    if (len < 0.01) { ux = rng() * 2 - 1; uy = -1; len = Math.hypot(ux, uy); }
    ux /= len; uy /= len;
    const near = 1 - f.d / (maxD + 1.5);                 // closer to the centre = harder
    const power = push * P.speedPerPush * (0.6 + 0.7 * near) * (0.85 + 0.3 * rng());
    f.px = f.x; f.py = f.y;
    const lift = P.lift * (0.75 + 0.5 * rng()) * (0.6 + 0.4 * Math.min(1, push / 4));
    f.vx = ux * power * (uy > 0 ? 0.8 : 1);
    // blocks below the centre can't go down through the floor: they're thrown up and out
    f.vy = uy > 0 ? -(lift + 0.45 * uy * power) : uy * power - lift * 0.6;
    f.path = [{ x: f.x, y: f.y, t: 0 }];
    f.t = 0;
    f.nextSample = P.sampleEvery;
    f.spin = (rng() < 0.5 ? -1 : 1) * Math.PI * 2 * (1 + Math.floor(rng() * Math.min(3, push / 2)));
  }

  const occupied = (x, y) => y >= rows || (y >= 0 && !!board[y][x]);
  const land = (f, x, y) => {
    // settle into the nearest free cell at or above (x, y) in that column
    let yy = Math.min(y, rows - 1);
    while (yy >= 0 && board[yy][x]) yy--;
    if (yy < 0) { // column full to the top: back where it started, or anywhere free nearby
      if (!board[f.y][f.x]) { x = f.x; yy = f.y; }
      else return false;
    }
    board[yy][x] = f.cell;
    f.toX = x; f.toY = yy;
    f.path.push({ x, y: yy, t: f.t });
    return true;
  };

  const moves = [];
  let flying = flyers.slice();
  while (flying.length) {
    const still = [];
    for (const f of flying) {
      f.t += P.dt;
      f.vy += P.gravity * P.dt;
      let nx = f.px + f.vx * P.dt;
      const ny = f.py + f.vy * P.dt;
      if (nx < 0) { nx = -nx; f.vx = -f.vx * 0.45; }
      if (nx > cols - 1) { nx = 2 * (cols - 1) - nx; f.vx = -f.vx * 0.45; }
      const cx = Math.round(nx), cy = Math.round(ny);
      if (f.vy < 0 && cy >= 0 && occupied(cx, cy)) {
        f.vy = 0; // bonk on an overhang
        f.px = nx;
      } else if (f.vy > 0 && (occupied(cx, cy) || occupied(cx, cy + 1) && ny >= cy)) {
        if (!land(f, cx, occupied(cx, cy) ? cy - 1 : cy)) still.push(f);
        continue;
      } else {
        f.px = nx; f.py = ny;
      }
      if (f.t >= f.nextSample) { f.path.push({ x: f.px, y: f.py, t: f.t }); f.nextSample += P.sampleEvery; }
      if (f.t > P.maxFlight) { if (!land(f, Math.round(f.px), Math.round(Math.max(0, f.py)))) board[f.y][f.x] = f.cell; continue; }
      still.push(f);
    }
    if (still.length === flying.length && still.every(f => f.t > P.maxFlight * 2)) break;
    flying = still;
  }

  for (const f of flyers) {
    if (f.toX == null) { f.toX = f.x; f.toY = f.y; if (!board[f.y][f.x]) board[f.y][f.x] = f.cell; }
    if (f.toX === f.x && f.toY === f.y) continue;
    moves.push({ fromX: f.x, fromY: f.y, toX: f.toX, toY: f.toY, cell: f.cell, path: f.path, flight: f.t, spin: f.spin });
  }

  // The crater caves in: in the columns the blast covered, whatever is left hanging over
  // the hole (down to the bottom of the blast) falls into it.
  let minX = cols, maxX = -1, maxY = -1;
  for (const i of area.indices) {
    const x = i % cols, y = (i / cols) | 0;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const settleArea = { flags: new Uint8Array(cols * rows) };
  for (let y = 0; y <= maxY; y++) for (let x = minX; x <= maxX; x++) settleArea.flags[y * cols + x] = 1;
  const settled = applyGravity(board, settleArea, cols, rows, "down");
  const landedAt = new Map(moves.map(m => [m.toY * cols + m.toX, m]));
  const lastLanding = Math.max(0, ...moves.map(m => m.flight));
  for (const g of settled) {
    const m = landedAt.get(g.fromY * cols + g.fromX);
    if (m) {
      // a block that flew, landed on the rubble, then slid down with it
      const fall = 0.07 * Math.sqrt(g.toY - g.fromY);
      m.toX = g.toX; m.toY = g.toY; m.flight += fall;
      m.path.push({ x: g.toX, y: g.toY, t: m.flight });
    } else {
      // it waits for the blast, then drops
      const fall = 0.07 * Math.sqrt(g.toY - g.fromY);
      const t0 = lastLanding * 0.6;
      moves.push({ fromX: g.fromX, fromY: g.fromY, toX: g.toX, toY: g.toY, cell: g.cell, flight: t0 + fall, spin: 0,
        path: [{ x: g.fromX, y: g.fromY, t: 0 }, { x: g.fromX, y: g.fromY, t: t0 }, { x: g.toX, y: g.toY, t: t0 + fall }] });
    }
  }
  return moves;
}

// Goo: `units` cells of goo flow from `sources` (the melted piece's cells, already
// empty) down and sideways (never up) and fill the lowest reachable cells first,
// staying within `spread` columns of the piece. Returns [{x, y, cell, fromX, fromY}].
export function applyGoo(board, sources, units, cols, rows, makeCell, spread = 4) {
  if (!sources.length || units <= 0) return [];
  const minX = Math.min(...sources.map(s => s.x)) - spread;
  const maxX = Math.max(...sources.map(s => s.x)) + spread;
  const cx = sources.reduce((a, s) => a + s.x, 0) / sources.length;

  const seen = new Uint8Array(cols * rows);
  const queue = [];
  for (const s of sources) {
    if (s.y < 0 || board[s.y][s.x]) continue;
    const i = s.y * cols + s.x;
    if (!seen[i]) { seen[i] = 1; queue.push(s); }
  }
  const region = [];
  while (queue.length) {
    const c = queue.shift();
    region.push(c);
    for (const [nx, ny] of [[c.x, c.y + 1], [c.x - 1, c.y], [c.x + 1, c.y]]) {
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || nx < minX || nx > maxX) continue;
      const i = ny * cols + nx;
      if (seen[i] || board[ny][nx]) continue;
      seen[i] = 1;
      queue.push({ x: nx, y: ny });
    }
  }
  region.sort((a, b) => (b.y - a.y) || (Math.abs(a.x - cx) - Math.abs(b.x - cx)) || (a.x - b.x));

  const filled = [];
  for (const t of region.slice(0, units)) {
    let src = sources[0], best = Infinity;
    for (const s of sources) {
      const d = Math.abs(s.x - t.x) + Math.abs(s.y - t.y);
      if (d < best) { best = d; src = s; }
    }
    const cell = makeCell(t.x, t.y);
    board[t.y][t.x] = cell;
    filled.push({ x: t.x, y: t.y, cell, fromX: src.x, fromY: src.y });
  }
  return filled;
}

// Deepest y where `mat` fits entirely in empty cells at column `x` (phantoms), or null.
export function phantomLandingY(board, x, mat) {
  const rows = board.length, cols = board[0].length;
  const fits = (y) => {
    for (let j = 0; j < mat.length; j++) for (let i = 0; i < mat[0].length; i++) {
      if (!mat[j][i]) continue;
      const bx = x + i, by = y + j;
      if (bx < 0 || bx >= cols || by >= rows) return false;
      if (by >= 0 && board[by][bx]) return false;
    }
    return true;
  };
  for (let y = rows - mat.length; y >= -mat.length; y--) if (fits(y)) return y;
  return null;
}

// Apply a powerup's effect to `board` (mutates it). Shared by the game and the demos.
//   ctx: { area, placed: [{x,y}] (the powerup's own cells), pid, centre, cols, rows, rng, makeFill }
// Returns { consumed, destroyed, moves, filled, collapsed }.
export function computeEffect(board, pu, ctx) {
  const { area, placed, pid, centre, cols, rows, rng = Math.random, makeFill } = ctx;
  const out = { consumed: [], destroyed: [], moves: [], filled: [], collapsed: null };

  if (pu.consume) {
    for (const { x, y } of placed) {
      const c = board[y]?.[x];
      if (c && (pid == null || c.pid === pid)) {
        out.consumed.push({ x, y, cell: c });
        board[y][x] = null;
      }
    }
  }

  switch (pu.type) {
    case "destroyer":
    case "acid":
      out.destroyed = applyDestroy(board, area, cols);
      if (pu.collapse && area.fullRows.length) {
        out.collapsed = { rows: area.fullRows, ...collapseRows(board, area.fullRows, cols) };
      }
      break;
    case "gravity":
      out.moves = applyGravity(board, area, cols, rows, pu.direction);
      break;
    case "expander":
      out.filled = applyExpand(board, area, cols, makeFill);
      break;
    case "blast":
      out.moves = applyBlast(board, area, cols, rows, centre, pu.push, rng);
      break;
    case "goo": {
      const units = Math.max(1, Math.round(placed.length * (pu.volume ?? 1)));
      out.filled = applyGoo(board, placed.filter(p => p.y >= 0), units, cols, rows, makeFill);
      break;
    }
    case "combo": {
      // parts fire one after another on the same board (destroy first, fill last)
      const parts = pu.parts ?? [];
      parts.forEach((part, i) => {
        const makeFill = ctx.makeFill ? (x, y) => ({ ...ctx.makeFill(x, y), paint: part.fillPaint ?? pu.fillPaint, style: part.fillStyle ?? pu.fillStyle }) : undefined;
        const sub = computeEffect(board, { ...part, consume: false }, { ...ctx, makeFill, area: area.parts?.[i] ?? area });
        mergeEffect(out, sub);
      });
      break;
    }
    default: // phantom: already where it wants to be
      break;
  }
  return out;
}

// Fold a later part's results into `out`, chaining moves of the same block.
function mergeEffect(out, sub) {
  const at = (x, y) => out.moves.findIndex(m => m.toX === x && m.toY === y);
  for (const d of sub.destroyed) {
    const i = at(d.x, d.y);
    if (i >= 0) { // it had moved earlier in this combo: it was destroyed where it ended up
      out.moves.splice(i, 1);
    }
    out.destroyed.push(d);
  }
  for (const m of sub.moves) {
    const i = at(m.fromX, m.fromY);
    if (i >= 0) {
      const prev = out.moves[i];
      if (prev.path) {
        // it flew, landed, then fell further: add the fall to the end of its flight
        const fall = 0.06 * Math.sqrt(Math.abs(m.toY - m.fromY) + Math.abs(m.toX - m.fromX));
        out.moves[i] = { ...prev, toX: m.toX, toY: m.toY, flight: prev.flight + fall,
          path: [...prev.path, { x: m.toX, y: m.toY, t: prev.flight + fall }] };
      } else {
        out.moves[i] = { ...m, fromX: prev.fromX, fromY: prev.fromY };
      }
    } else {
      out.moves.push(m);
    }
  }
  out.filled.push(...sub.filled);
  if (sub.collapsed) out.collapsed = sub.collapsed;
}
