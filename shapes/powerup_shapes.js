/**
 * Powerup block definitions (Normal mode only).
 *
 * Export: POWERUPS (array)
 *
 * A powerup uses the same fields as a regular shape (id, name, grid, color,
 * frequency, rotation, nextShapes, nextShapeProbs), plus a `powerup` object:
 *
 * powerup: {
 *   type: "destroyer" | "gravity" | "expander",
 *
 *   // gravity only: which way the highlighted blocks fall (default "down")
 *   direction: "down" | "left" | "right" | "up",
 *
 *   // 1 = gentle, 2 = strong, 3 = very strong. The scheduler serves stronger
 *   // tiers more often when the stack is high (see CONFIG.modes.normal.powerups).
 *   tier: 1,
 *
 *   // optional: replaces the default effect text shown under the name
 *   description: "destroys highlighted blocks",
 *
 *   // The highlighted ("effected") cells. `grid` is drawn around the piece and
 *   // `origin` is where the piece's top-left block sits inside `grid`.
 *   //   "."  not affected
 *   //   "#"  this cell
 *   //   "-"  this cell's whole board row
 *   //   "|"  this cell's whole board column
 *   //   "+"  both the whole row and the whole column
 *   area: { origin: [0, 0], grid: ["#"] },
 *
 *   // expander only: art for the cells it fills. A hex colour, or a k×k
 *   // grid of hex colours (one block's worth of pixel art).
 *   fill: "#ffffff",
 *
 *   // optional: does the powerup piece vanish when it fires?
 *   // default: true for destroyer and gravity, false for expander.
 *   consume: true,
 *
 *   // destroyer only (optional): rows that are wiped wall-to-wall collapse
 *   // like a line clear instead of leaving an empty row behind.
 *   collapse: false,
 * }
 *
 * `frequency` here is relative to the other powerups (how often THIS powerup
 * is chosen once the scheduler has decided a powerup is due).
 *
 * Linking works as for regular shapes: "slide to the left" is usually followed
 * by "slide to the right" (nextShapeProbs 0.75), and "slide to the right" has a
 * low frequency of its own so it mostly arrives as the follow-up.
 *
 * Edit this file by hand or with block_designer.html (saving from the designer
 * keeps this header comment but reformats the array).
 *
 * Powerups are not rotatable by default (rotation.mode "none"). If you set
 * rotation to "any", the highlighted area rotates with the piece.
 */

export const POWERUPS = [
  {
    id: "infectious_sand",
    name: "infectious sand",
    grid: ["X"],
    color: "#d9b45a",
    powerup: {
      type: "gravity",
      direction: "down",
      tier: 1,
      area: {
        origin: [1, 0],
        grid: ["|||"],
      },
    },
    rotation: { mode: "none" },
    frequency: 1,
  },
  {
    id: "slide_left",
    name: "slide to the left",
    grid: [
      "..X",
      ".XX",
      "XXX",
    ],
    color: "#ff6b3d",
    powerup: {
      type: "gravity",
      direction: "left",
      tier: 1,
      area: {
        origin: [0, 0],
        grid: [
          "---",
          "---",
          "---",
        ],
      },
    },
    rotation: { mode: "none" },
    frequency: 0.8,
    nextShapes: ["slide_right"],
    nextShapeProbs: [0.75],
  },
  {
    id: "slide_right",
    name: "slide to the right",
    grid: [
      "X..",
      "XX.",
      "XXX",
    ],
    color: "#3dc1ff",
    powerup: {
      type: "gravity",
      direction: "right",
      tier: 1,
      area: {
        origin: [0, 0],
        grid: [
          "---",
          "---",
          "---",
        ],
      },
    },
    rotation: { mode: "none" },
    frequency: 0.2,
  },
  {
    id: "small_black_hole",
    name: "a small black hole",
    grid: ["X"],
    color: "#6a3fb5",
    powerup: {
      type: "destroyer",
      tier: 2,
      area: {
        origin: [2, 2],
        grid: [
          ".###.",
          "#####",
          "#####",
          "#####",
          ".###.",
        ],
      },
    },
    rotation: { mode: "none" },
    frequency: 1,
  },
  {
    id: "large_black_hole",
    name: "a large black hole",
    grid: [
      "XX",
      "XX",
    ],
    color: "#4a2391",
    powerup: {
      type: "destroyer",
      tier: 3,
      area: {
        origin: [3, 3],
        grid: [
          "..####..",
          ".######.",
          "########",
          "########",
          "########",
          "########",
          ".######.",
          "..####..",
        ],
      },
    },
    rotation: { mode: "none" },
    frequency: 0.6,
  },
  {
    id: "katana",
    name: "a cool katana",
    grid: ["XXXXX"],
    color: "#c9d3e0",
    powerup: {
      type: "destroyer",
      tier: 2,
      collapse: true,
      area: {
        origin: [0, 0],
        grid: ["-----"],
      },
    },
    rotation: { mode: "none" },
    frequency: 0.9,
  },
  {
    id: "expanding_foam",
    name: "expanding foam",
    grid: ["X"],
    color: "#f2efd8",
    powerup: {
      type: "expander",
      tier: 1,
      fill: "#e3dcae",
      area: {
        origin: [2, 1],
        grid: [
          ".###.",
          "#####",
          "#####",
          "#####",
          ".###.",
        ],
      },
    },
    rotation: { mode: "none" },
    frequency: 1,
  },
  {
    id: "bamboo",
    name: "bamboo",
    grid: [
      "X",
      "X",
    ],
    color: "#4f9e3a",
    powerup: {
      type: "expander",
      tier: 1,
      fill: "#7fd35f",
      area: {
        origin: [0, 5],
        grid: [
          "#",
          "#",
          "#",
          "#",
          "#",
          ".",
          ".",
        ],
      },
    },
    rotation: { mode: "none" },
    frequency: 0.9,
  },
];
