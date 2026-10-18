# Eztrix

A falling-block puzzle game where every piece is a silly pixel-art object: fill a row and it
clears.

- **Classic**: the game plus powerups, introduced one class at a time: Dissolverz (destroyers and
  acid), Gravitizerz and Expanderz, plus Comboz once two classes are in. (Blasts, goo and phantoms
  still exist in the code but are switched off: `assist.powerups.disabledTypes` in `config.js`.)
  Each new class pauses the game with an intro screen (Options turns them off). The bay on the
  left holds one big powerup ("shiny piece" in the game's own words) of each class per game, each
  showing up there once its class has opened: tap the bay, pick one from its menu (the game slows
  while it's open), and it takes the falling piece's place. No keys for it. It starts easy and
  gets harder as it goes (`difficulty` in `config.js`, `src/difficulty.js`).
- **Extreme**: no powerups, no mercy.
- **God mode**: everything from the first piece; it gets harder too.
- **Zen** and **Turbo zen**: it plays itself (slowly, or as a show), or you do.
- **Options**: skip the powerup intro screens, a favourite piece that turns up a little more
  often, toned-down animations, high contrast, and whether Turbo zen fills the screen. Kept in
  the browser.
- **Tutorial**: the controls, every kind of powerup (each until the board is nearly gone), where to put them, the bay, and the modes to pick from, page by page.

## Where things are

| File | What it is |
|---|---|
| `index.html` | The game page (layout, menus, styles). |
| `block_designer.html` | The one editor: blocks, powerups and achievements. |
| `config.js` | **Every tunable number**: speeds, the piece picker, powerup scheduling, how it gets harder, the look. |
| `shapes/main_shapes.js` | **Every block**, regular and powerups (the header comment documents every field). |
| `shapes/achievements.js` | **Every achievement** (the header comment documents every trigger type). |
| `src/` | Game code (you shouldn't need to touch it to add content). |
| `tests/` | Automated tests. |

### `src/` in brief

| File | What it does |
|---|---|
| `main.js` | Boots the game and runs the loop. |
| `game.js` | The game rules: falling, locking, line clears, powerup effects. No DOM, sends events. |
| `selection.js` | The piece picker: difficulty levels, "hard" pieces, powerup scheduling, variety. |
| `difficulty.js` | How Classic and God mode get harder as a game goes on. |
| `devtools.js` | The developer tools page (settings to try the game out with). |
| `zen.js` | Zen and Turbo zen: the director and the autopilot. |
| `powerups.js` | Powerup areas and effects for every class (`computeEffect`). |
| `demo.js` | The little looping powerup animations on the intro / help / How to play screens. |
| `tutorial.js` | The tutorial's pages (each one's words, board and pieces) and the autopilot that plays them. No DOM. |
| `tutorialui.js` | The tutorial on the page: its words over the board, its bar (Touch or Keys, the bay), the finger tapping the board, the keys lighting up, the modes on its last page. |
| `shelf.js`, `shelfui.js` | The bay of powerups: what's in it, and the bay in the bottom bar with its menu to pick from. |
| `settings.js`, `optionsui.js` | The options (kept in the browser) and the Options page. |
| `home.js` | The home screen: turbo zen behind the menu through a moving camera. |
| `mosaic.js` | The home screen's packed screens of pieces the camera sweeps across now and then. |
| `loading.js` | The loading screen: a sideways board filling with pieces (its pieces and captions come from `tools/make_loading_pieces.mjs`). |
| `shapes.js` | Loads `shapes/main_shapes.js`. |
| `achievements.js` | Tracks and unlocks achievements (saved in the browser). |
| `render.js` | Draws everything on the board canvas. |
| `ui.js` | Menus, How to play, achievements page, toasts, HUD, touch + keyboard. |

## Running it

The game uses JavaScript modules, so it has to be served (not opened as a file):

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000> for the game and <http://localhost:8000/block_designer.html> for the editor.

## Making blocks, powerups and achievements

The easiest way: run the local server, which also lets the designer save straight into your files:

```sh
python3 serve.py          # http://localhost:8000/block_designer.html
```

Every save keeps the previous version in `shapes/.backups/` (the newest 30 per file; not
committed). Only `shapes/main_shapes.js` and `shapes/achievements.js` can be written, and the
server only listens on your own computer.

Open `block_designer.html`, pick `shapes/main_shapes.js` (or `shapes/achievements.js` in the
Achievements tab) with the file picker once (Chrome/Edge), and it saves straight into the file.
Otherwise it downloads the updated file for you to drop in.

- **Linking**: `nextShapes` + `nextShapeProbs` make pieces come back to back.
- **Tags** (`tags: ["food"]`) and **zones** (`zones: { inside: ... }`) are what achievements
  match on — e.g. "drop a `food` piece inside the `inside` zone of a `mouth`".

## Useful settings (`config.js`)

- `render.cellStyle`: `"enhanced"` (new look) or `"classic"` (the original look).
- `render.enhanced.edgeStrength`: 0 = pieces melt into one mess of pixel art, 1 = chunky outlines.
- `assist.variety`: how strongly the picker avoids pieces served recently / still on the board.
- `assist.powerups`: how often powerups appear and which ones; `progression` controls how they are
  introduced (`firstClassPool`, `newClassEvery`, or `enabled: false` for all at once), `combos`
  (when combo powerups start), `struggle` (how much the helpful ones are favoured when you're in
  trouble) and `usability` (how strongly powerups that can't help on the current board are avoided).
- `assist.pieceMix.hard.firstGiantBetween`: the first giant always lands in this range of pieces.
- `assist.variety.giants.repeatPenalty`: how strongly a giant you've already had is avoided.
- `scoring`: points for placing, destroying and clearing.
- `difficulty`: for Classic and God mode, the easy start, how long it takes to get hard, how hard
  it gets, the speed limits, what "hard" means, and how often each powerup class comes when.

## Developer tools

Hold **God mode** and **Turbo zen** down together on the home screen (or shift-click God mode) to
switch the developer tools on, for this visit only (a reload, or the next visit, starts without
them; while they're on, a "Developer tools" button on the home screen brings the page back). The
page has:

- **Developer game**: God mode with the newest pieces and sets first; it won't let you lose.
- **Powerup classes in Classic**: which classes are in, and (ticked) the exact order they come in,
  with "Comboz" where the combos may start.
- **Sliders** for how Classic and God mode get harder, what "hard" means, how often each class
  comes at the start, halfway and once it's hard, and powerups overall. Changed ones show in yellow.
- **Copy settings**: copies just what you've changed, as text to paste into a message.
- **Back to the usual** and **Turn developer tools off** (everything back to the game's own).

While they're on, the game's numbers show at the side of the screen (where the game has got to:
how hard, the classes in, level 6, the end game...; tap it to fold it away on a phone), and the
pause menu has a dev section: pick exactly which piece comes next, unlock every powerup, clear the
board or fill it with a messy stack, tick which powerups are enabled, and override how often
powerups turn up. `index.html?devmode=1` turns them on from the start. The settings are kept for
the tab: switch the tools on again after a reload and they're as you left them.

## Debug keys

Open `index.html?debug` to get `window.__eztrix` in the console. In game, press **`** (backquote)
for the debug panel, then:

- **V** switches between the enhanced and classic look
- **E** cycles the edge strength
- **P** makes the next piece a powerup (cycles through them all)

## Tests

```sh
node --test tests/*.test.mjs
```
