# Extris

A Tetris-like game where every piece is a silly pixel-art object.

- **Normal mode**: the game plus powerups (destroyers, gravity blocks, expanders).
- **Extreme mode**: the original game. No powerups, no mercy.

## Where things are

| File | What it is |
|---|---|
| `index.html` | The game page (layout, menus, styles). |
| `block_designer.html` | The one editor: blocks, powerups and achievements. |
| `config.js` | **Every tunable number**: speeds, the piece picker, powerup scheduling, the look, sound. |
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
| `powerups.js` | Powerup areas and effects (destroy / gravity / expand). |
| `shapes.js` | Loads `shapes/main_shapes.js`. |
| `achievements.js` | Tracks and unlocks achievements (saved in the browser). |
| `render.js` | Draws everything on the board canvas. |
| `ui.js` | Menus, How to play, achievements page, toasts, HUD, touch + keyboard. |
| `sound.js` | Synthesised sound effects. |

## Running it

The game uses JavaScript modules, so it has to be served (not opened as a file):

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000> for the game and <http://localhost:8000/block_designer.html> for the editor.

## Making blocks, powerups and achievements

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
- `assist.powerups`: how often powerups appear and which ones.
- `sound.enabled`, `sound.volume`.

## Debug keys

Open `index.html?debug` to get `window.__extris` in the console. In game, press **D** for the
debug panel, then:

- **V** switches between the enhanced and classic look
- **E** cycles the edge strength
- **P** makes the next piece a powerup (cycles through them all)

## Tests

```sh
node --test tests/*.test.mjs
```
