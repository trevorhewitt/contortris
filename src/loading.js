// ============================================================
// LOADING — the screen the page opens on (a plain script: it runs before the game has loaded)
// ============================================================
// "LOADING 42%" over a small sideways board, its pieces sliding in from the right and coming to
// rest on the left, so it fills up like a loading bar; under it, a line for each piece as it falls
// in ("Untangling lobster telephones"). The pieces and the ways of filling the bar come from
// src/loadingdata.js (tools/make_loading_pieces.mjs picked them: no gaps, and no pieces of four).
//
// How far along it is: the pieces file (by far the biggest thing) as it downloads, then the game
// starting up behind it. The bar never runs ahead of that, and never jumps: a piece at a time,
// each sliding in. Once the game says it's ready (window.__loading.done, from src/ui.js), the bar
// fills the rest of the way quickly, and then the screen goes.
(function () {
  const D = window.LOADING_DATA;
  const boot = document.getElementById("boot");
  if (!D || !boot) { window.__loading = { set() {}, done(cb) { cb?.(); } }; return; }

  const SLIDE_MS = 170, GAP_MS = 40, FAST_MS = 70, MIN_MS = 900;
  const t0 = performance.now();
  const run = D.runs[Math.floor(Math.random() * D.runs.length)];
  const total = run.reduce((n, s) => n + cellsOf(s).length, 0);

  boot.innerHTML = "";
  const word = el("div", "loadWord");
  const canvas = el("canvas", "loadBar");
  const say = el("div", "loadSay");
  boot.append(word, canvas, say);
  boot.setAttribute("aria-label", "Loading");

  // the art, as canvases: one for each piece and turn
  const tiles = new Map();
  function tile(s) {
    const key = s.id + ":" + s.rot;
    if (tiles.has(key)) return tiles.get(key);
    const r = D.pieces[s.id].rots[s.rot], k = D.k, h = r.mat.length, w = r.mat[0].length;
    const c = document.createElement("canvas");
    c.width = w * k; c.height = h * k;
    const g = c.getContext("2d");
    r.art.forEach((row, y) => row.forEach((cell, x) => {
      if (!cell) return;
      for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
        g.fillStyle = D.palette[parseInt(cell.substr((j * k + i) * 2, 2), 36)];
        g.fillRect(x * k + i, y * k + j, 1, 1);
      }
    }));
    tiles.set(key, c);
    return c;
  }
  function cellsOf(s) {
    const out = [];
    D.pieces[s.id].rots[s.rot].mat.forEach((row, j) => [...row].forEach((c, i) => { if (c === "1") out.push([s.x + i, s.y + j]); }));
    return out;
  }

  // how far along: the pieces file downloading (to 80%), then the game starting (90%), then done
  let real = 0.02, ready = null;
  try {
    fetch("./shapes/main_shapes.js").then(async (res) => {
      const size = Number(res.headers.get("content-length")) || 9.9e6;
      const reader = res.body?.getReader?.();
      if (!reader) { real = Math.max(real, 0.8); return; }
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        got += value.length;
        real = Math.max(real, Math.min(0.8, 0.8 * got / size));
      }
      real = Math.max(real, 0.8);
    }).catch(() => {});
  } catch { /* no fetch: the game's own start-up moves it on */ }

  let placed = 0, filled = 0, moving = null, wait = 0, last = t0, finished = false;
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    // (time passing moves it on a little too, so it never looks stuck)
    real = Math.min(ready ? 1 : 0.95, real + dt * (ready ? 0.003 : 0.00004));
    if (moving) {
      moving.t += dt / (ready ? FAST_MS : SLIDE_MS);
      if (moving.t >= 1) { filled += cellsOf(moving.s).length; placed++; moving = null; wait = ready ? 0 : GAP_MS; }
    } else if ((wait -= dt) <= 0 && placed < run.length) {
      const s = run[placed], after = (filled + cellsOf(s).length) / total;
      // (the next piece comes once it's that far along; the last only once it's all done)
      if (after <= real || (ready && now - t0 >= MIN_MS * 0.6)) {
        moving = { s, t: 0 };
        say.textContent = D.pieces[s.id].say + "...";
      }
    }
    draw();
    const pct = Math.round(100 * (filled + (moving ? cellsOf(moving.s).length * moving.t : 0)) / total);
    word.textContent = `LOADING ${Math.min(100, pct)}%`;
    if (placed >= run.length && ready && !finished && now - t0 >= MIN_MS) {
      finished = true;
      setTimeout(ready, 160);
      return;
    }
    requestAnimationFrame(frame);
  }

  function draw() {
    // (the bar is just as big as its cells: as wide as there's room for in whole cells, the
    // pieces at either end right up against its sides)
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const room = Math.min(window.innerWidth * 0.86, 420);
    const cell = Math.max(1, Math.floor(room * dpr / D.cols)), W = cell * D.cols, H = cell * D.rows;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
      canvas.style.width = `${W / dpr}px`; canvas.style.height = `${H / dpr}px`;
    }
    const g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    const ox = 0, oy = 0;
    // the board: faint cells
    g.fillStyle = "rgba(255,255,255,0.05)";
    for (let y = 0; y < D.rows; y++) for (let x = 0; x < D.cols; x++) g.fillRect(ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2);
    const put = (s, dx) => g.drawImage(tile(s), Math.round(ox + (s.x + dx) * cell), oy + s.y * cell, D.pieces[s.id].rots[s.rot].mat[0].length * cell, D.pieces[s.id].rots[s.rot].mat.length * cell);
    for (let i = 0; i < placed; i++) put(run[i], 0);
    if (moving) {
      // (in from the right, slowing as it comes to rest)
      const e = 1 - Math.pow(1 - Math.min(1, moving.t), 3);
      g.save();
      g.beginPath(); g.rect(ox, oy, cell * D.cols, cell * D.rows); g.clip();
      put(moving.s, (D.cols - moving.s.x) * (1 - e));
      g.restore();
    }
  }

  function el(tag, cls) { const e = document.createElement(tag); e.className = cls; return e; }

  window.__loading = {
    set(p) { real = Math.max(real, Math.min(0.95, p)); },
    // the game is ready: fill the rest, then cb()
    done(cb) { if (ready) return; ready = cb ?? (() => {}); real = Math.max(real, 0.9); },
  };
  requestAnimationFrame(frame);
})();
