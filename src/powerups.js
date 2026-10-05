// ============================================================
// POWERUPS — pure logic (no DOM). Imported by main.js and by the tests.
// ============================================================
//
// Board format (same as main.js): board[y][x] is null (empty) or a cell object.
// Area format: see the doc comment at the top of shapes/powerup_shapes.js.

export const POWERUP_TYPES = ["destroyer", "gravity", "expander"];

export const DEFAULT_EFFECT_TEXT = {
  destroyer: "destroys highlighted blocks",
  gravity: "gravitates highlighted blocks",
  expander: "fills highlighted blocks",
};

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

  const areaRotations = areaRotationsFor(raw.area, rotations, trim);
  if (isEmptyArea(areaRotations[0])) {
    console.warn(`[${id}] powerup has an empty area; it will do nothing.`);
  }

  return {
    type,
    direction,
    tier,
    description: (typeof raw.description === "string" && raw.description.trim())
      ? raw.description.trim()
      : DEFAULT_EFFECT_TEXT[type],
    consume: (typeof raw.consume === "boolean") ? raw.consume : (type !== "expander"),
    collapse: type === "destroyer" && raw.collapse === true,
    fill: raw.fill ?? null,
    areaRotations,
  };
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
