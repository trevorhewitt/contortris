# Estrix

A falling-block puzzle game where every piece is a silly pixel-art object: fill a row and it
clears.

- **Classic**: the game plus Shiny Pieces (powerups, in the code; the game itself never says
  "powerup"), introduced one class at a time: Destroyerz (destroyers and acid), Gravitizerz and
  Expanderz, plus Comboz once two classes are in. (Blasts, goo and phantoms still exist in the
  code but are switched off: `assist.powerups.disabledTypes` in `config.js`.) Each new class
  pauses the game with an intro screen (Options turns them off). Each class comes about as often
  as the others, however many pieces it has. Extra Shiny Pieces, at the bottom left in every
  mode, says how many you have (×0 when none): one strong Shiny Piece of each of the three
  classes per game, the same ones every game (a tidal wave, bathroom tiles and a hippo in a tutu:
  never a combo), each added the moment its class unlocks (its first piece down on the board,
  after its intro), the number hopping up as it comes. Tap it (or press Space; Escape pauses) and
  the next one takes the falling piece's place, put straight in at the top of the board in rays
  of light as the falling piece bursts into bits. They go in the order they came, shown along its
  bottom by their classes' icons (the Destroyerz' square, the Expanderz' star, the Gravitizerz'
  arrow; a combo's side by side), the next on the left. The pause menu shows them in that order,
  and the button between two swaps them.
  It starts easy and gets harder as it goes (`difficulty` in `config.js`, `src/difficulty.js`):
  a bit faster with every piece all the way, fewer Shiny Pieces and less rescue, and more awkward
  pieces; giants and level 6 sets come more often, but only while the stack is low, never near
  the top, so it's how you play that ends a game. The biggest set pieces fall a little slower,
  for the sense of scale. Each piece is picked as it comes, on the board as it is. While the
  Expanderz are the only class, they're kept apart and mostly the ones that don't fill down to
  the floor. And now and then the pieces turn awkward for a stretch, with the Shiny Pieces held
  back, until a big Gravitizer brings the mess down (`waves`, `src/waves.js`).
- **Extreme**: no Shiny Pieces, no mercy.
- **God mode**: everything from the first piece; it gets harder too.
- **Zen** and **Turbo zen**: it plays itself (slowly, or as a show), or you do. In Zen each piece
  comes in over a different place from the last few and is a new shape each time; move one
  away from where it was going and it won't keep putting things there. You can build the board
  most of the way up if you like: no Shiny Piece of its own takes much of it, and help only
  comes near the top (it still can't be lost). In Turbo zen every piece arrives already turned
  and over the place it's going, and drops straight into it, quickly; the computer never moves
  a piece once it's on the board. Step in whenever you like: the piece you touch is yours until
  it lands, and while you're playing the next ones come promptly, one at a time, at a pace you
  can steer, each with a moment on the ground to slide or turn it; stop, and the computer takes
  back over gently, over a few pieces (`zen` in `config.js`).
- **Options**: skip the Shiny Piece intro screens, a favourite piece that turns up a little more
  often, toned-down animations, high contrast, and whether Turbo zen fills the screen. Kept in
  the browser.
- **Tutorial**: the controls; the three classes of Shiny Piece side by side, each with its little
  animation, and then a page for each (more of the class until the board is nearly gone); where
  to put them; the bay; and last, a page for each mode, with a board playing the way it does
  behind it and a button to go and play it.

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
| `waves.js` | Classic and God mode's waves: a stretch of awkward pieces, then a big Gravitizer. |
| `devtools.js` | The developer tools page (settings to try the game out with). |
| `zen.js` | Zen and Turbo zen: the director and the autopilot. |
| `powerups.js` | Powerup areas and effects for every class (`computeEffect`). |
| `demo.js` | The little looping powerup animations on the intro / help / How to play screens. |
| `tutorial.js` | The tutorial's pages (each one's words, board and pieces) and the autopilot that plays them. No DOM. |
| `tutorialui.js` | The tutorial on the page: its words where a piece's name goes, its bar (Touch or Keys, the bay), the finger tapping the board, the keys lighting up, the Shiny Pieces' classes side by side, and each mode's page's button to go and play it. |
| `shelf.js`, `shelfui.js` | The bay of Extra Shiny Pieces: what's in it and when each comes, and the bay in the bottom bar (a Shiny Piece × how many, and its pieces' icons in the order they'll come), a tap on it using the next; and that order in the pause menu, to change. |
| `settings.js`, `optionsui.js` | The options (kept in the browser) and the Options page. |
| `home.js` | The home screen: turbo zen behind the menu through a moving camera. |
| `mosaic.js` | The home screen's packed screens of pieces the camera sweeps across now and then. |
| `loading.js` | The loading screen: a sideways board filling with pieces (its pieces and captions come from `tools/make_loading_pieces.mjs`). |
| `shapes.js` | Loads `shapes/main_shapes.js`. |
| `achievements.js` | Tracks and unlocks achievements (saved in the browser). |
| `render.js` | Draws everything on the board canvas. |
| `remains.js` | What destroyed blocks leave behind: their art where they were, darker and faded, in layers that move apart a little when the board shakes. On to try out, and easy to take out (the top of the file says how). |
| `ui.js` | Menus, How to play, achievements page, toasts, HUD, touch + keyboard. |
| `pausemenu.js` | The pause menu's gallery of the pieces so far, each once, where it last fell, newest first (swipe, or ← → and A D), each with its name and how rare it is; the game over page's, of some of the game's pieces, the one that ended it big in the middle; and the sparkles round the menu. |

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
  trouble), `usability` (how strongly powerups that can't help on the current board are avoided),
  `fairShare` (how firmly each class is kept to its share over a game), `classApart` (the
  expanders kept apart) and `expanderMaxCols` (how wide an expander's fill down to the floor
  can be; one along a row or in a shape is as drawn).
- `waves`: Classic and God mode's stretches of awkward pieces and the big Gravitizer after each.
- `assist.pieceMix.hard.firstGiantBetween`: the first giant always lands in this range of pieces.
- `assist.variety.giants.repeatPenalty`: how strongly a giant you've already had is avoided.
- `scoring`: points for placing, destroying and clearing.
- `remains`: what destroyed blocks leave behind (`src/remains.js`): how dark, faded and grey,
  fading away or there for good, its layers and their parallax, and the modes it's not in
  (`enabled: false` switches it off).
- `difficulty`: for Classic and God mode, the easy start, how long it takes to get hard, how hard
  it gets, the speed (by how far into the game it is), what "hard" means, and how often each
  powerup class comes when.

## Developer tools

Hold **God mode** and **Turbo zen** down together on the home screen (or shift-click God mode) to
switch the developer tools on, for this visit only (a reload, or the next visit, starts without
them; while they're on, a "Developer tools" button on the home screen brings the page back). The
page has:

- **Developer game**: God mode with the newest pieces and sets first; it won't let you lose.
- **Shiny Piece classes in Classic**: which classes are in, and (ticked) the exact order they come in,
  with "Comboz" where the combos may start.
- **Extra Shiny Pieces (the bay)**: which piece each of its three classes has, from that class's
  pieces or the combos with it in, strongest first (how much of the board each one reaches).
- **Sliders** for how fast Classic and God mode fall (at the start, once it's hard, and faster
  per piece after that), how they get harder, what "hard" means, how often each class comes at
  the start, halfway and once it's hard, and Shiny Pieces overall (how often, and how fast they
  go off). Changed ones show in yellow.
- **What destroyed blocks leave behind**: on or off, how much darker, how faded and how grey it
  is, how long it takes to fade away (or whether it lasts for good), and the parallax when the
  board shakes. These change it at once.
- **Copy settings**: copies just what you've changed, as text to paste into a message.
- **Back to the usual** and **Turn developer tools off** (everything back to the game's own).

While they're on, the game's numbers show at the side of the screen (where the game has got to:
how hard, the classes in, level 6, the end game...; tap it to fold it away on a phone), and the
pause menu has a dev section: pick exactly which piece comes next, unlock every Shiny Piece, clear
the board or fill it with a messy stack, tick which Shiny Pieces are enabled, and override how
often they turn up. `index.html?devmode=1` turns them on from the start. The settings are kept for
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
