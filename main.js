const CONFIG = {
    board: { cols: 10, rows: 20 },
    timing: {
      baseDropMs: 850,
      minDropMs: 110,
      levelEveryLines: 8,
      speedMultiplierPerLevel: 0.88,
  
      // NEW: soft drop factor while ↓ is held.
      // e.g. 0.12 => ~8.3× faster gravity.
      softDropFactor: 0.12,
      maxFallStepsPerFrame: 1,        // NEW: 1 = no multi-row jumps per frame
      maxAccumulatedSteps: 2,         // NEW: cap backlog to avoid bursts after lag
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
      cellPx: 24,
      gridLineAlpha: 0.22,
      bg: "#000000",
      silhouetteColor: "rgba(240,240,255,0.16)",
      silhouetteStroke: "rgba(240,240,255,0.20)",
      pixelArtJitter: 0,
    },
    assist: {
      // “Danger” is measured by how many TOP rows contain any locked blocks.
      // If the stack reaches into the top N rows, apply restrictions.
    
      // If any locked block is within the top 6 rows -> mostly difficulty <= 2
      topRowsForDiff2Only: 6,
    
      // If any locked block is within the top 3 rows -> difficulty <= 1 only (no exceptions)
      topRowsForDiff1Only: 3,
    
      // When in the diff<=2 zone, occasionally allow harder pieces anyway
      allowHarderThan2Prob: 0.15,
    },
  };
  
  import { SHAPES as RAW_SHAPES } from "./shapes/main_shapes.js";
  
  // ============================================================
  // SHAPES — normalisation
  // ============================================================
  
  function loadAndNormaliseShapes(rawShapes) {
    const seen = new Set();
    return rawShapes.map((s) => {
      if (!s.id) throw new Error("Shape missing id");
      if (seen.has(s.id)) throw new Error(`Duplicate shape id: ${s.id}`);
      seen.add(s.id);
  
      const base = parseGridToBoolMatrix(s.grid);
      const rotationsAll = computeAllRotations(base);
      const rotations = filterAllowedRotations(rotationsAll, s.rotation);
  
      const color = s.color ?? "#ffffff";
      const style = normaliseStyle(color, s.style);
  
      // Guard: pieces wider than board cannot spawn (avoid silent insta-loss).
      const maxW = Math.max(...rotations.map((m) => m[0].length));
      if (maxW > CONFIG.board.cols) {
        throw new Error(
          `Shape "${s.id}" is too wide for the board (${maxW} > ${CONFIG.board.cols}). ` +
          `Either narrow it, make it vertical-only, or increase CONFIG.board.cols.`
        );
      }

      // NEW: frequency in [0,1]; default 1
      let frequency = (s.frequency ?? 1);
      frequency = Number(frequency);
      if (!Number.isFinite(frequency)) frequency = 1;
      frequency = Math.max(0, Math.min(1, frequency));
        
      return {
        id: s.id,
        name: s.name ?? s.id,
        difficulty: Number.isFinite(s.difficulty) ? s.difficulty : 1,
        frequency, // NEW
        color,
        style,
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
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  
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
  
  function tryMove(state, dx, dy) {
    const mat = getActiveMatrix(state);
    const nx = state.active.x + dx;
    const ny = state.active.y + dy;
    if (!collides(state, nx, ny, mat)) {
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
  
        // If any part of the piece is at negative board y when it locks, that's game over.
        if (by < 0) {
          lockedAboveTop = true;
          continue;
        }
  
        state.board[by][bx] = { color: shape.color, style: shape.style };
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
  
      if (!hide) {
        for (let y = 0; y < CONFIG.board.rows; y++) {
          for (let x = 0; x < CONFIG.board.cols; x++) {
            const cellObj = state.board[y][x];
            if (!cellObj) continue;
            drawCell(bctx, x, y, cellObj.color, cellObj.style);
          }
        }
      }
  
      if (!hide && state.active) {
        const mat = getActiveMatrix(state);
        for (let y = 0; y < mat.length; y++) {
          for (let x = 0; x < mat[0].length; x++) {
            if (!mat[y][x]) continue;
            const bx = state.active.x + x;
            const by = state.active.y + y;
            if (by < 0) continue;
            drawCell(bctx, bx, by, state.active.shape.color, state.active.shape.style);
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
  
    function drawCell(ctx, gx, gy, baseColor, style) {
      const x = gx * cell;
      const y = gy * cell;
  
      ctx.fillStyle = baseColor;
      ctx.fillRect(x, y, cell, cell);
  
      ctx.fillStyle = style.shadeTopRight;
      ctx.fillRect(x, y, cell, 2);
      ctx.fillRect(x + cell - 2, y, 2, cell);
  
      ctx.fillStyle = style.shadeBottomLeft;
      ctx.fillRect(x, y + cell - 2, cell, 2);
      ctx.fillRect(x, y, 2, cell);
  
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(x + 3, y + 3, 2, 2);
  
      if (style.glow?.enabled) {
        ctx.save();
        ctx.globalAlpha = 0.10 * (style.glow.strength ?? 0.35);
        ctx.fillStyle = baseColor;
        ctx.fillRect(x - 1, y - 1, cell + 2, cell + 2);
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
  
  function bindUI(state, renderer, nameLayer, boardEl) {
    // HUD
    const statusText = document.getElementById("statusText");
    const scoreText = document.getElementById("scoreText");
    const linesText = document.getElementById("linesText");
  
    // Overlay + overlay buttons
    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlayTitle");
    const overlaySubtitle = document.getElementById("overlaySubtitle");
    const overlayPlayBtn = document.getElementById("overlayPlayBtn");
    const overlayResumeBtn = document.getElementById("overlayResumeBtn");
    const overlayNewBtn = document.getElementById("overlayNewBtn");
  
    // Debug panel
    const debugPanel = document.getElementById("debugPanel");
    const dbgZone = document.getElementById("dbgZone");
    const dbgPieceDiff = document.getElementById("dbgPieceDiff");
    const dbgBaseSpeed = document.getElementById("dbgBaseSpeed");
  
    function showOverlay(show, title, subtitle, mode) {
      overlay.classList.toggle("show", show);
      if (!show) return;
  
      overlayTitle.textContent = title ?? "Contortris";
      overlaySubtitle.textContent = subtitle ?? "";
  
      // Button visibility by mode: "start" | "pause" | "gameover"
      const m = mode ?? "start";
      overlayPlayBtn.style.display = (m === "start") ? "inline-block" : "none";
      overlayResumeBtn.style.display = (m === "pause") ? "inline-block" : "none";
      overlayNewBtn.style.display = (m === "pause" || m === "gameover") ? "inline-block" : "none";
    }
  
    function updateHUD() {
      scoreText.textContent = String(state.score);
      linesText.textContent = String(state.lines);
  
      statusText.textContent = state.gameOver
        ? "game over"
        : state.paused
          ? "paused"
          : state.running
            ? "running"
            : "ready";
  
      // Debug panel updates (only when enabled)
      if (state.debug) {
        const z = getDifficultyZone(state);
        dbgZone.textContent = z.zone;
        dbgPieceDiff.textContent = state.active ? String(state.active.shape.difficulty ?? 1) : "–";
        // Base fall speed: show the default drop interval (ignoring ArrowDown)
        dbgBaseSpeed.textContent = `${state.dropMs} ms/row (level ${state.level})`;
      }
    }
  
    function startGame() {
      if (state.gameOver) resetGame(state, renderer, nameLayer, updateHUD, showOverlay);
      if (!state.running) {
        state.running = true;
        state.paused = false;
        showOverlay(false);
      }
    }
  
    function resumeGame() {
      if (state.gameOver) return;
      state.running = true;
      state.paused = false;
      showOverlay(false);
      updateHUD();
    }
  
    function pauseGame() {
      if (!state.running || state.gameOver) return;
      state.paused = true;
      state.running = true; // keep running flag true; pause gates update loop
      showOverlay(true, "Paused", "Space to resume, or use buttons below.", "pause");
      updateHUD();
    }
  
    // Overlay buttons
    overlayPlayBtn.addEventListener("click", () => startGame());
    overlayResumeBtn.addEventListener("click", () => resumeGame());
    overlayNewBtn.addEventListener("click", () => resetGame(state, renderer, nameLayer, updateHUD, showOverlay));
  
    // Keyboard
    window.addEventListener("keydown", (e) => {
      // Debug toggle always available
      if (e.code === "KeyD") {
        state.debug = !state.debug;
        debugPanel.style.display = state.debug ? "block" : "none";
        updateHUD();
        return;
      }
  
      if (!state.running && e.code !== "Enter") return;
      if (state.gameOver) return;
  
      if (e.code === "Space") {
        e.preventDefault();
        if (state.paused) {
          state.paused = false;
          showOverlay(false);
        } else {
          pauseGame();
        }
        updateHUD();
        return;
      }
  
      if (state.paused) return;
  
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
  
    // Touch controls (mobile-friendly)
    // Behaviour:
    // - swipe left/right: move 1
    // - swipe up: rotate
    // - swipe down: move down 1 step
    // - double tap: play (or resume if paused)
    const SWIPE_MIN = 26; // px
    const SWIPE_AXIS_DOMINANCE = 1.2; // must be 20% more in one axis than the other
    const DOUBLE_TAP_MS = 320;
  
    boardEl.addEventListener("touchstart", (ev) => {
      if (ev.touches.length !== 1) return;
      const t = ev.touches[0];
      state.touch.active = true;
      state.touch.startX = t.clientX;
      state.touch.startY = t.clientY;
      state.touch.startT = performance.now();
    }, { passive: true });
  
    boardEl.addEventListener("touchend", (ev) => {
      if (!state.touch.active) return;
      state.touch.active = false;
  
      const now = performance.now();
  
      // Double tap: start/resume
      if (now - state.touch.lastTapT < DOUBLE_TAP_MS) {
        state.touch.lastTapT = 0;
        if (!state.running) startGame();
        else if (state.paused) resumeGame();
        return;
      }
  
      state.touch.lastTapT = now;
  
      // If no movement, treat as single tap (no action)
      const changed = ev.changedTouches && ev.changedTouches[0];
      if (!changed) return;
  
      const dx = changed.clientX - state.touch.startX;
      const dy = changed.clientY - state.touch.startY;
  
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
  
      // ignore tiny gestures
      if (Math.max(adx, ady) < SWIPE_MIN) return;
  
      // Allow gestures even before start? no (except double tap). Keep consistent with keyboard.
      if (!state.running || state.gameOver) return;
  
      // If paused, ignore swipes (double tap handles resume)
      if (state.paused) return;
  
      // Horizontal swipe
      if (adx > ady * SWIPE_AXIS_DOMINANCE) {
        if (state.active) tryMove(state, dx < 0 ? -1 : +1, 0);
        return;
      }
  
      // Vertical swipe
      if (ady > adx * SWIPE_AXIS_DOMINANCE) {
        if (dy < 0) {
          // swipe up: rotate
          if (state.active) tryRotate(state);
        } else {
          // swipe down: move down 1 step (not hard drop)
          if (state.active) {
            const moved = tryMove(state, 0, 1);
            if (!moved) {
              // If cannot move down, lock immediately (matches typical behaviour)
              stepLockAndSpawn(state, renderer, nameLayer, updateHUD, showOverlay);
            }
          }
        }
      }
    }, { passive: true });
  
    // Initial overlay
    showOverlay(true, "Contortris", "Press Play (or double-tap).", "start");
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
    if (!state.running || state.paused || state.gameOver) return;
  
    if (!state.active) {
      const ok = spawnPiece(state);
      if (!ok) {
        state.gameOver = true;
        state.running = false;
        showOverlay(true, "Game over", "Reset to try again");
        updateHUD();
        return;
      }
      nameLayer.setName(state.active.shape.name);
      renderer.drawNextSilhouette(state.next);
      updateHUD();
    }
  
    // NEW: effective gravity while soft dropping
    const effectiveDropMs = state.softDropping
      ? Math.max(16, Math.floor(state.dropMs * CONFIG.timing.softDropFactor))
      : state.dropMs;

    // Accumulate time
    state.dropAccum += dt;

    // NEW: prevent backlog bursts (e.g., when the tab lags)
    const maxBacklog = effectiveDropMs * CONFIG.timing.maxAccumulatedSteps;
    if (state.dropAccum > maxBacklog) state.dropAccum = maxBacklog;

    // NEW: never process more than N fall steps per frame (prevents “mini teleports”)
    let steps = 0;
    while (state.dropAccum >= effectiveDropMs && steps < CONFIG.timing.maxFallStepsPerFrame) {
      state.dropAccum -= effectiveDropMs;

      const moved = tryMove(state, 0, 1);
      if (moved) {
        if (state.softDropping && CONFIG.scoring.softDropPerCell > 0) {
          state.score += CONFIG.scoring.softDropPerCell;
        }
      } else {
        stepLockAndSpawn(state, renderer, nameLayer, updateHUD, showOverlay);
        break;
      }
      steps++;
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
  const ui = bindUI(state, renderer, nameLayer, boardShell);
  
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(50, now - last);
    last = now;
  
    updateGame(state, dt, renderer, nameLayer, ui.updateHUD, ui.showOverlay);
    renderer.draw(state);
  
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);