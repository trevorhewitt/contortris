// ============================================================
// DEVELOPER TOOLS — settings to try the game out with (DOM)
// ============================================================
// Three taps on the version number at the bottom of the home screen switch the developer tools
// on, for this visit only (never remembered: the next visit starts without them), and opens
// their page: a developer game (new things first), Turbo zen (no longer on the menu),
// which powerup classes Classic has and in what order they come, the bay's Extra Shiny Pieces
// (CONFIG.shelf.pieces: which one each of its classes has), sliders for how fast Classic and
// God mode fall and how they get harder (CONFIG.difficulty) and how often each class comes at
// each stage, and how what destroyed blocks leave behind looks (src/remains.js), and a
// button that copies the settings, to hand on. While they're on, the settings apply to every
// game, and the game's numbers show at the side of the screen (src/ui.js updateDevPanel).
// Turning them off, or leaving, puts everything back as it was. (The settings are kept for the
// tab, so switching them on again after a reload brings the same ones back.)

import { CONFIG } from "../config.js";
import { CLASS_INFO, classOf } from "./powerups.js";
import { pieceReach } from "./shelf.js";

const SETTINGS_KEY = "eztrix.devSettings";
// (they used to be remembered in the browser, on and their settings both: gone, so nobody is
// left with them on, or with a class switched off, for good)
for (const k of ["eztrix.devtools", "extris.devtools", "eztrix.devSettings", "extris.devSettings"]) {
  try { globalThis.localStorage?.removeItem(k); } catch { /* storage unavailable */ }
}
const session = {
  get(k) { try { return globalThis.sessionStorage?.getItem(k) ?? null; } catch { return null; } },
  set(k, v) { try { globalThis.sessionStorage?.setItem(k, v); } catch { /* storage unavailable */ } },
};
let on = false;

// The classes a game can have (the ones never switched on for anyone stay off)
const CLASSES = ["destroyer", "gravity", "expander", "combo"];
const ALWAYS_OFF = (CONFIG.assist.powerups.disabledTypes ?? []).filter(t => !CLASSES.includes(t));

// The sliders: [path in CONFIG, label, min, max, step]
const ramp = (mode) => [
  [`difficulty.${mode}.start`, "easy start (pieces)", 0, 300, 5],
  [`difficulty.${mode}.length`, "then gets harder over (pieces)", 0, 1500, 10],
  [`difficulty.${mode}.hardest`, "how hard it gets (1 = full)", 0, 1.5, 0.05],
];
// (how fast it falls, by how far into the game it is: src/difficulty.js rampDropMs)
const speed = (mode) => [
  [`difficulty.${mode}.speed.fromMs`, "speed at the start (ms a row)", 150, 900, 10],
  [`difficulty.${mode}.speed.toMs`, "speed once it's hard (ms a row)", 40, 500, 5],
  [`difficulty.${mode}.speed.perPiece`, "after that, faster per piece", 0.98, 1, 0.001],
  [`difficulty.${mode}.speed.minMs`, "fastest (ms a row)", 30, 300, 5],
  [`difficulty.${mode}.slowBig.most`, "the biggest set pieces: up to this much slower (×)", 1, 4, 0.05],
  [`difficulty.${mode}.slowBig.least`, "...and the smallest of the big ones (×)", 1, 3, 0.05],
];
const STAGES = [["early", "at the start"], ["middle", "halfway"], ["late", "once it's hard"]];
const GROUPS = [
  { title: "Classic: speed", items: speed("normal"), open: true },
  { title: "Classic: getting harder", items: ramp("normal") },
  { title: "God mode: speed", items: speed("god") },
  { title: "God mode: getting harder", items: ramp("god") },
  { title: "What “hard” means", items: [
    ["difficulty.hard.dangerBias", "a high stack makes pieces small", 0, 1.5, 0.05],
    ["difficulty.hard.hardMaxDanger", "giants only with the stack this low (0–1)", 0.05, 1, 0.01],
    ["difficulty.hard.hardRate", "giants: how often (×)", 0.5, 6, 0.1],
    ["difficulty.hard.hardCooldown", "giants: at least this far apart", 1, 15, 1],
    ["difficulty.hard.setRate", "level 6 sets: how often (×)", 0.5, 6, 0.1],
    ["difficulty.hard.setMaxStackRows", "level 6 sets: up to this tall a stack", 2, 18, 1],
    ["difficulty.hard.powerupRate", "Shiny Pieces: how often (×)", 0.1, 2, 0.05],
    ["difficulty.hard.dangerBoost", "Shiny Pieces: likelier when high up", 0, 6, 0.1],
    ["difficulty.hard.holesBoost", "Shiny Pieces: likelier with air pockets", 0, 3, 0.05],
    ["difficulty.hard.struggleBoost", "Shiny Pieces: likelier when struggling", 0, 2, 0.05],
    ["difficulty.hard.helpPower", "Shiny Pieces: the best ones when struggling", 0, 4, 0.1],
    ["difficulty.hard.afterGiant", "Shiny Pieces: chance just after a giant", 0, 1, 0.05],
    ["difficulty.hard.afterSet", "Shiny Pieces: chance just after a set", 0, 1, 0.05],
  ] },
  ...STAGES.map(([stage, when]) => ({
    title: `Shiny Piece classes ${when} (each against the others, not how many)`,
    items: CLASSES.map(c => [`difficulty.classes.${stage}.${c}`, CLASS_INFO[c]?.name ?? c, 0, 4, 0.1]),
  })),
  { title: "Shiny Pieces overall (all modes)", items: [
    ["assist.powerups.baseChance", "chance after one", 0, 0.6, 0.01],
    ["assist.powerups.chancePerDrop", "...going up each piece by", 0, 0.3, 0.005],
    ["assist.powerups.cooldownDrops", "at least this many pieces apart", 0, 10, 1],
    ["assist.powerups.opening.rate", "fewer at the start of Classic (×)", 0, 1, 0.05],
    ["assist.powerups.opening.until", "...up to the full number by piece", 1, 200, 5],
    ["fx.powerup.speed", "how fast they go off, at the start (×)", 0.5, 3, 0.05],
    ["fx.powerup.maxSpeed", "...and at most, as the game speeds up (×)", 1, 5, 0.1],
  ] },
  // (what destroyed blocks leave behind: src/remains.js; these change it at once)
  { title: "What destroyed blocks leave behind", items: [
    ["remains.enabled", "on"],
    ["remains.moved", "blocks that moved away leave their art too (each cell shows the last that was in it)"],
    ["remains.darker", "the sharp art: how much darker (0 as it was, 1 black)", 0, 1, 0.05],
    ["remains.faded", "...how faded (0 solid, 1 gone)", 0, 1, 0.05],
    ["remains.saturation", "...colour (0 grey, 1 as it was, 2 twice as strong)", 0, 2, 0.05],
    ["remains.sharpSec", "...gone over (seconds)", 1, 120, 1],
    ["remains.softBlur", "the soft blur: how wide (cells)", 0.05, 1, 0.05],
    ["remains.softStrength", "...how strong", 0, 1, 0.05],
    ["remains.softSec", "...gone over (seconds)", 1, 300, 1],
    ["remains.glowBlur", "the glow: how wide (cells)", 0.5, 4, 0.1],
    ["remains.glowStrength", "...how strong", 0, 1, 0.05],
    ["remains.fadeAwaySec", "...lingers (seconds)", 5, 600, 5],
    ["remains.forever", "...or all of it for good"],
    ["remains.rgbShift", "red and blue apart, as they get older (cells)", 0, 0.5, 0.01],
    ["remains.scanlines", "scanlines: how dark (0 none)", 0, 1, 0.05],
    ["remains.scanlinesPerCell", "...how many a cell", 2, 9, 1],
    ["remains.scanlineGlow", "...a glow in them (0 none)", 0, 1, 0.05],
    ["remains.parallax", "parallax when the board shakes (1: the oldest keep still)", 0, 1, 0.05],
    ["remains.liveLift", "the blocks in play lighter (gamma: 1 as they are)", 1, 2, 0.05],
  ] },
];

const get = (path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), CONFIG);
function set(path, v) {
  const ks = path.split("."); let o = CONFIG;
  for (const k of ks.slice(0, -1)) o = o[k] ??= {};
  o[ks.at(-1)] = v;
}
// The bay's pieces (CONFIG.shelf.pieces): [path in CONFIG, class], each chosen from a list
const BAY = Object.keys(CONFIG.shelf?.pieces ?? {}).map(cls => [`shelf.pieces.${cls}`, cls]);
// (the game's own settings, before anything here changed them)
const DEFAULTS = Object.fromEntries([...GROUPS.flatMap(g => g.items), ...BAY].map(([p]) => [p, get(p)]));
const DEFAULT_OFF = [...(CONFIG.assist.powerups.disabledTypes ?? [])];
const DEFAULT_ORDER = CONFIG.assist.powerups.progression?.order ?? null;

export const devToolsOn = () => on;

// What's been changed: { values: { path: value }, classes: { on: [..], order: [..] | null } }
function load() {
  let s = null;
  try { s = JSON.parse(session.get(SETTINGS_KEY) ?? "null"); } catch { s = null; }
  return s && typeof s === "object" ? { values: s.values ?? {}, classes: s.classes ?? null } : { values: {}, classes: null };
}
const save = (s) => session.set(SETTINGS_KEY, JSON.stringify(s));

// Put the settings into CONFIG (or, off, the game's own back)
function apply(s, on = true) {
  for (const [p, v] of Object.entries(DEFAULTS)) set(p, on && p in s.values ? s.values[p] : v);
  const pu = CONFIG.assist.powerups;
  if (on && s.classes) {
    // (the acid pieces are Destroyerz too: CLASS_OF in src/powerups.js)
    const off = CLASSES.filter(c => !s.classes.on.includes(c));
    pu.disabledTypes = [...ALWAYS_OFF, ...off, ...(off.includes("destroyer") ? ["acid"] : [])];
    pu.progression.order = s.classes.order ? s.classes.order.filter(c => s.classes.on.includes(c)) : null;
  } else {
    pu.disabledTypes = [...DEFAULT_OFF];
    pu.progression.order = DEFAULT_ORDER;
  }
}

// At start-up (they're only ever on from the start with ?devmode=1): the settings kept for the tab
export function applySavedDevSettings() {
  if (new URLSearchParams(globalThis.location?.search ?? "").get("devmode") === "1") { on = true; apply(load()); }
}

// The settings as text, to hand on: only what differs from the game's own
export function devSettingsText() {
  const s = load(), changed = {};
  for (const [p, v] of Object.entries(s.values)) if (p in DEFAULTS && v !== DEFAULTS[p]) changed[p] = v; // (not ones there are no longer)
  const out = { eztrixDevSettings: 1, changed };
  if (s.classes) out.powerupClasses = { on: s.classes.on, order: s.classes.order ?? "usual (random)" };
  return JSON.stringify(out, null, 2);
}

// Build the developer tools page into `body`. `hooks`: { onPlayDev(), onPlayTurbo(button),
// onClose(), onChange() };
// `powerups`: every Shiny Piece there is (the bay's to choose from)
export function buildDevTools(body, hooks = {}, powerups = []) {
  let s = load();
  const changed = () => { save(s); apply(s); hooks.onChange?.(); };
  body.innerHTML = "";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // play
  const top = el("div", "menuBtns");
  const play = el("button", "", "Developer game");
  play.title = "God mode with the newest pieces and sets first, and it won't let you lose";
  play.addEventListener("click", () => hooks.onPlayDev?.());
  const turbo = el("button", "secondary", "Turbo zen");
  turbo.title = "It plays itself, quickly, and never stops";
  turbo.addEventListener("click", () => hooks.onPlayTurbo?.(turbo));
  top.append(play, turbo);
  body.appendChild(top);
  body.appendChild(el("div", "small devNote", "These settings apply to every game while the developer tools are on, from the next game."));

  // powerup classes: which, and in what order (Classic)
  const cls = el("div", "devSection");
  cls.appendChild(el("div", "devTitle", "Shiny Piece classes in Classic"));
  const usualOn = CLASSES.filter(c => !DEFAULT_OFF.includes(c));
  const classes = () => s.classes ?? { on: usualOn, order: null };
  const list = el("div", "devClassList");
  const orderBox = el("label", "devCheck");
  const orderCb = el("input"); orderCb.type = "checkbox";
  orderBox.append(orderCb, document.createTextNode(" in this order (else: the usual, at random)"));
  const drawClasses = () => {
    const c = classes(), order = c.order ?? [...CLASSES];
    orderCb.checked = !!c.order;
    list.innerHTML = "";
    order.forEach((k, i) => {
      const row = el("div", "devClassRow");
      const cb = el("input"); cb.type = "checkbox"; cb.checked = c.on.includes(k);
      cb.addEventListener("change", () => {
        const cur = classes();
        s.classes = { on: cb.checked ? [...new Set([...cur.on, k])] : cur.on.filter(x => x !== k), order: cur.order };
        changed(); drawClasses();
      });
      const name = el("span", "devClassName", k === "combo" ? `${CLASS_INFO.combo.name} (start here)` : CLASS_INFO[k]?.name ?? k);
      const up = el("button", "secondary small devMini", "▲"), down = el("button", "secondary small devMini", "▼");
      up.disabled = i === 0; down.disabled = i === order.length - 1;
      const move = (d) => {
        const o = [...order]; [o[i], o[i + d]] = [o[i + d], o[i]];
        s.classes = { on: classes().on, order: o };
        changed(); drawClasses();
      };
      up.addEventListener("click", () => move(-1));
      down.addEventListener("click", () => move(1));
      row.append(cb, name, up, down);
      list.appendChild(row);
    });
  };
  orderCb.addEventListener("change", () => {
    const cur = classes();
    s.classes = { on: cur.on, order: orderCb.checked ? (cur.order ?? [...CLASSES]) : null };
    changed(); drawClasses();
  });
  cls.append(list, orderBox);
  body.appendChild(cls);
  drawClasses();

  // the bay's pieces: which one each of its classes has, from that class's pieces and then the
  // combos with it in (only these lists have combos: the game's own never does), strongest first
  const baySec = el("div", "devSection");
  baySec.appendChild(el("div", "devTitle", "Extra Shiny Pieces (the bay)"));
  baySec.appendChild(el("div", "small devNote", "Strongest first: how much of the board each one reaches, put down in the middle of it."));
  const types = (p) => [p.powerup.type, ...(p.powerup.parts ?? []).map(q => q.type)];
  const choices = powerups.filter(p => !p.powerup.setOnly && !types(p).some(t => ALWAYS_OFF.includes(t)))
    .map(p => ({ p, reach: pieceReach(p) })).sort((a, b) => b.reach - a.reach);
  const bay = BAY.map(([path, k]) => {
    const name = CLASS_INFO[k]?.name ?? k;
    const row = el("label", "devBayRow");
    const text = el("span", "devBayName");
    const select = el("select");
    const group = (label, list) => {
      if (!list.length) return;
      const g = el("optgroup"); g.label = label;
      for (const { p, reach } of list) g.appendChild(new Option(`${p.name}: ${Math.round(reach * 100)}%${p.id === DEFAULTS[path] ? " (usual)" : ""}`, p.id));
      select.appendChild(g);
    };
    group(name, choices.filter(c => c.p.powerup.cls === k));
    group(`${CLASS_INFO.combo.name} with ${name} in`, choices.filter(c => c.p.powerup.parts?.some(q => classOf(q.type) === k)));
    const show = () => {
      const v = select.value;
      text.textContent = `${name}${v !== DEFAULTS[path] ? ` (usually ${powerups.find(p => p.id === DEFAULTS[path])?.name ?? DEFAULTS[path]})` : ""}`;
      row.classList.toggle("changed", v !== DEFAULTS[path]);
    };
    select.value = String(s.values[path] ?? DEFAULTS[path]);
    select.addEventListener("change", () => { s.values[path] = select.value; show(); changed(); });
    show();
    row.append(text, select);
    baySec.appendChild(row);
    return { path, select, show };
  });
  if (bay.length) body.appendChild(baySec);

  // the sliders
  const sliders = [];
  for (const g of GROUPS) {
    const sec = el("details", "devSection");
    sec.open = !!g.open;
    sec.appendChild(el("summary", "devTitle", g.title));
    for (const [path, label, min, max, step] of g.items) {
      // (a setting that's on or off: a box to tick)
      const flag = typeof DEFAULTS[path] === "boolean";
      const row = el("label", "devSlider");
      const text = el("span", "devSliderLabel");
      const input = el("input");
      if (flag) { input.type = "checkbox"; input.style.width = "auto"; } else { input.type = "range"; input.min = min; input.max = max; input.step = step; }
      const value = () => (flag ? input.checked : Number(input.value));
      const put = (v) => { if (flag) input.checked = !!v; else input.value = String(v); };
      const show = () => {
        const v = value(), d = DEFAULTS[path];
        text.textContent = flag ? ` ${label}${v !== d ? ` (usually ${d ? "on" : "off"})` : ""}` : `${label}: ${+v.toFixed(4)}${v !== d ? ` (usually ${d})` : ""}`;
        row.classList.toggle("changed", v !== d);
      };
      put(path in s.values ? s.values[path] : DEFAULTS[path]);
      input.addEventListener(flag ? "change" : "input", () => { s.values[path] = value(); show(); changed(); });
      show();
      if (flag) row.append(input, text); else row.append(text, input);
      sec.appendChild(row);
      sliders.push({ path, put, show });
    }
    body.appendChild(sec);
  }

  // copy, reset, off
  const status = el("div", "small devNote");
  const foot = el("div", "menuRow");
  const copy = el("button", "small", "Copy settings");
  copy.addEventListener("click", async () => {
    const text = devSettingsText();
    try { await navigator.clipboard.writeText(text); status.textContent = "Copied. Paste it into a message."; }
    catch { window.prompt("Copy these settings:", text); }
  });
  const reset = el("button", "secondary small", "Back to the usual");
  reset.addEventListener("click", () => {
    s = { values: {}, classes: null };
    changed();
    for (const sl of sliders) { sl.put(DEFAULTS[sl.path]); sl.show(); }
    for (const b of bay) { b.select.value = DEFAULTS[b.path]; b.show(); }
    drawClasses();
    status.textContent = "Everything is back to the game's own settings.";
  });
  const off = el("button", "secondary small", "Turn developer tools off");
  off.addEventListener("click", () => { setDevTools(false); hooks.onClose?.(); });
  foot.append(copy, reset, off);
  body.append(foot, status);
}

// Switch the developer tools on or off (off: the game's own settings back)
export function setDevTools(v) {
  on = !!v;
  apply(load(), on);
}
