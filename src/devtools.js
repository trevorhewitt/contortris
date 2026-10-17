// ============================================================
// DEVELOPER TOOLS — settings to try the game out with (DOM)
// ============================================================
// Holding God mode and Turbo zen down together on the home screen switches the developer tools
// on (remembered in this browser) and opens their page: a developer game (new things first),
// which powerup classes Classic has and in what order they come, sliders for how Classic and
// God mode get harder (CONFIG.difficulty) and how often each class comes at each stage, and a
// button that copies the settings, to hand on. While they're on, the settings apply to every
// game, and the game's numbers show at the side of the screen (src/ui.js updateDevPanel).
// Turning them off puts everything back as it was.

import { CONFIG } from "../config.js";
import { store } from "./util.js";
import { CLASS_INFO } from "./powerups.js";

const ON_KEY = "eztrix.devtools";
const SETTINGS_KEY = "eztrix.devSettings";

// The classes a game can have (the ones never switched on for anyone stay off)
const CLASSES = ["destroyer", "gravity", "expander", "combo"];
const ALWAYS_OFF = (CONFIG.assist.powerups.disabledTypes ?? []).filter(t => !CLASSES.includes(t));

// The sliders: [path in CONFIG, label, min, max, step]
const ramp = (mode) => [
  [`difficulty.${mode}.start`, "easy start (pieces)", 0, 300, 5],
  [`difficulty.${mode}.length`, "then gets harder over (pieces)", 0, 1500, 10],
  [`difficulty.${mode}.hardest`, "how hard it gets (1 = full)", 0, 1.5, 0.05],
  [`difficulty.${mode}.speed.capStartMs`, "speed limit at the start (ms a row)", 100, 600, 10],
  [`difficulty.${mode}.speed.capEndMs`, "speed limit once it's hard (ms a row)", 40, 400, 5],
  [`difficulty.${mode}.speed.perPiece`, "after that, faster per piece", 0.98, 1, 0.001],
  [`difficulty.${mode}.speed.minMs`, "fastest (ms a row)", 30, 200, 5],
];
const STAGES = [["early", "at the start"], ["middle", "halfway"], ["late", "once it's hard"]];
const GROUPS = [
  { title: "Classic: getting harder", items: ramp("normal") },
  { title: "God mode: getting harder", items: ramp("god") },
  { title: "What “hard” means", items: [
    ["difficulty.hard.dangerBias", "a high stack makes pieces small", 0, 1.5, 0.05],
    ["difficulty.hard.hardMaxDanger", "giants still come this high up (0–1)", 0.2, 1, 0.02],
    ["difficulty.hard.hardRate", "giants: how often (×)", 0.5, 6, 0.1],
    ["difficulty.hard.hardCooldown", "giants: at least this far apart", 1, 15, 1],
    ["difficulty.hard.setRate", "level 6 sets: how often (×)", 0.5, 6, 0.1],
    ["difficulty.hard.setMaxStackRows", "level 6 sets: up to this tall a stack", 4, 18, 1],
    ["difficulty.hard.powerupRate", "powerups: how often (×)", 0.1, 2, 0.05],
    ["difficulty.hard.dangerBoost", "powerups: likelier when high up", 0, 6, 0.1],
    ["difficulty.hard.afterGiant", "powerups: chance just after a giant", 0, 1, 0.05],
  ] },
  ...STAGES.map(([stage, when]) => ({
    title: `Powerup classes ${when}`,
    items: CLASSES.map(c => [`difficulty.classes.${stage}.${c}`, CLASS_INFO[c]?.name ?? c, 0, 4, 0.1]),
  })),
  { title: "Powerups overall (all modes)", items: [
    ["assist.powerups.baseChance", "chance after one", 0, 0.6, 0.01],
    ["assist.powerups.chancePerDrop", "...going up each piece by", 0, 0.3, 0.005],
    ["assist.powerups.cooldownDrops", "at least this many pieces apart", 0, 10, 1],
  ] },
];

const get = (path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), CONFIG);
function set(path, v) {
  const ks = path.split("."); let o = CONFIG;
  for (const k of ks.slice(0, -1)) o = o[k] ??= {};
  o[ks.at(-1)] = v;
}
// (the game's own settings, before anything here changed them)
const DEFAULTS = Object.fromEntries(GROUPS.flatMap(g => g.items).map(([p]) => [p, get(p)]));
const DEFAULT_OFF = [...(CONFIG.assist.powerups.disabledTypes ?? [])];
const DEFAULT_ORDER = CONFIG.assist.powerups.progression?.order ?? null;

export const devToolsOn = () => store.get(ON_KEY) === "1";

// What's been changed: { values: { path: value }, classes: { on: [..], order: [..] | null } }
function load() {
  const s = store.getJSON(SETTINGS_KEY, null);
  return s && typeof s === "object" ? { values: s.values ?? {}, classes: s.classes ?? null } : { values: {}, classes: null };
}
const save = (s) => store.set(SETTINGS_KEY, JSON.stringify(s));

// Put the settings into CONFIG (or, off, the game's own back)
function apply(s, on = true) {
  for (const [p, v] of Object.entries(DEFAULTS)) set(p, on && p in s.values ? s.values[p] : v);
  const pu = CONFIG.assist.powerups;
  if (on && s.classes) {
    // (the acid pieces are Dissolverz too: CLASS_OF in src/powerups.js)
    const off = CLASSES.filter(c => !s.classes.on.includes(c));
    pu.disabledTypes = [...ALWAYS_OFF, ...off, ...(off.includes("destroyer") ? ["acid"] : [])];
    pu.progression.order = s.classes.order ? s.classes.order.filter(c => s.classes.on.includes(c)) : null;
  } else {
    pu.disabledTypes = [...DEFAULT_OFF];
    pu.progression.order = DEFAULT_ORDER;
  }
}

// At start-up: the saved settings, if the developer tools are on
export function applySavedDevSettings() {
  if (devToolsOn()) apply(load());
}

// The settings as text, to hand on: only what differs from the game's own
export function devSettingsText() {
  const s = load(), changed = {};
  for (const [p, v] of Object.entries(s.values)) if (v !== DEFAULTS[p]) changed[p] = v;
  const out = { eztrixDevSettings: 1, changed };
  if (s.classes) out.powerupClasses = { on: s.classes.on, order: s.classes.order ?? "usual (random, gravitizers in the first two)" };
  return JSON.stringify(out, null, 2);
}

// Build the developer tools page into `body`. `hooks`: { onPlayDev(), onClose(), onChange() }
export function buildDevTools(body, hooks = {}) {
  let s = load();
  const changed = () => { save(s); apply(s); hooks.onChange?.(); };
  body.innerHTML = "";
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // play
  const top = el("div", "menuBtns");
  const play = el("button", "", "Developer game");
  play.title = "God mode with the newest pieces and sets first, and it won't let you lose";
  play.addEventListener("click", () => hooks.onPlayDev?.());
  top.appendChild(play);
  body.appendChild(top);
  body.appendChild(el("div", "small devNote", "These settings apply to every game while the developer tools are on, from the next game."));

  // powerup classes: which, and in what order (Classic)
  const cls = el("div", "devSection");
  cls.appendChild(el("div", "devTitle", "Powerup classes in Classic"));
  const usualOn = CLASSES.filter(c => !DEFAULT_OFF.includes(c));
  const classes = () => s.classes ?? { on: usualOn, order: null };
  const list = el("div", "devClassList");
  const orderBox = el("label", "devCheck");
  const orderCb = el("input"); orderCb.type = "checkbox";
  orderBox.append(orderCb, document.createTextNode(" in this order (else: the usual, random, with the Gravitizerz in the first two)"));
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

  // the sliders
  const sliders = [];
  for (const g of GROUPS) {
    const sec = el("details", "devSection");
    sec.appendChild(el("summary", "devTitle", g.title));
    for (const [path, label, min, max, step] of g.items) {
      const row = el("label", "devSlider");
      const text = el("span", "devSliderLabel");
      const input = el("input"); input.type = "range"; input.min = min; input.max = max; input.step = step;
      const show = () => {
        const v = Number(input.value), d = DEFAULTS[path];
        text.textContent = `${label}: ${+v.toFixed(4)}${v !== d ? ` (usually ${d})` : ""}`;
        row.classList.toggle("changed", v !== d);
      };
      input.value = String(path in s.values ? s.values[path] : DEFAULTS[path]);
      input.addEventListener("input", () => { s.values[path] = Number(input.value); show(); changed(); });
      show();
      row.append(text, input);
      sec.appendChild(row);
      sliders.push({ path, input, show });
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
    for (const sl of sliders) { sl.input.value = String(DEFAULTS[sl.path]); sl.show(); }
    drawClasses();
    status.textContent = "Everything is back to the game's own settings.";
  });
  const off = el("button", "secondary small", "Turn developer tools off");
  off.addEventListener("click", () => { setDevTools(false); hooks.onClose?.(); });
  foot.append(copy, reset, off);
  body.append(foot, status);
}

// Switch the developer tools on or off (off: the game's own settings back)
export function setDevTools(on) {
  store.set(ON_KEY, on ? "1" : "0");
  apply(load(), on);
}
