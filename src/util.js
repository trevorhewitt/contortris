// Small helpers shared by the game modules (no DOM).

export function clamp01(x) { return Math.max(0, Math.min(1, x)); }
export function clampN(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function frac(x) { return x - Math.floor(x); }

export function hash01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function hsla(h, s, l, a) {
  return `hsla(${h | 0},${s}%,${l}%,${a.toFixed(3)})`;
}

export function rgba(arr, alphaMul = 1) {
  return `rgba(${arr[0]},${arr[1]},${arr[2]},${clamp01(arr[3] * alphaMul).toFixed(3)})`;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[m]));
}

// Returns true if value looks like a hex colour string (#RGB or #RRGGBB)
export function isHexColour(s) {
  return typeof s === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s.trim());
}

export function sampleByWeight(items, getWeight, rng) {
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

// A small seedable RNG (mulberry32) — handy for tests and replays.
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Safe localStorage access (private mode / blocked storage must not break the game).
export const store = {
  get(key, fallback = null) {
    try {
      const v = globalThis.localStorage?.getItem(key);
      return v == null ? fallback : v;
    } catch { return fallback; }
  },
  set(key, value) {
    try { globalThis.localStorage?.setItem(key, value); } catch { /* storage unavailable */ }
  },
  getJSON(key, fallback) {
    const raw = this.get(key, null);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  },
  setJSON(key, value) { this.set(key, JSON.stringify(value)); },
};
