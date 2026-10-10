/**
 * EXTRIS PIECE GROUPS ("level 6")
 * Edit by hand. The pieces themselves live in main_shapes.js (difficulty 6).
 *
 * The biggest pieces in the game only ever arrive as whole groups: once a group starts, its
 * pieces come one straight after another, in order, with nothing in between. Pieces with
 * difficulty 6 never turn up any other way. Groups are locked at the start of each game and
 * unlock when the player builds the stack up past row 10 and then digs back down to row 5
 * (Normal and Extreme only; the numbers are in config.js, CONFIG.assist.level6).
 *
 * Each group:
 * {
 *   id: "tower_of_babel",           unique id
 *   name: "the Tower of Babel",     shown in dev mode
 *   frequency: 1,                   how often this group is picked compared with the others
 *   sequence: [ step, step, ... ],  the pieces, in order. A step is either:
 *     "piece_id"                      that piece, or
 *     { pick: ["id", "id", ...],      a run of pieces picked at random from the list:
 *       weights: [3, 1, ...],         optional, how likely each one is (default all 1)
 *       count: [2, 5] }               how many (a random number from 2 to 5; or just 3)
 * }
 *
 * A group whose fixed ("piece_id") piece is banished (frequency 0) never turns up; banished
 * pieces are simply left out of picks.
 *
 * A piece can also have `remix` (see main_shapes.js): it is rebuilt at random each time it
 * arrives, e.g. scrambled spam, or er berger flerg de schnerzgerberz.
 */

export const GROUPS = [
  {
    id: "tower_of_babel",
    name: "the Tower of Babel",
    frequency: 1,
    sequence: ["babel_lower", "babel_middle", "babel_top"],
  },
  {
    id: "nothing_and_everything",
    name: "nothing and everything",
    frequency: 1,
    sequence: ["nothing", "everything"],
  },
  {
    id: "spam",
    name: "spam",
    frequency: 1,
    sequence: [
      "spam",
      "spam",
      {
        pick: ["spam", "spam_spam_and_spam", "spm", "scrambled_spam", "mini_spam", "mini_spams"],
        weights: [3, 1.2, 1, 1, 1, 1],
        count: [2, 5],
      },
    ],
  },
  {
    id: "townhouses",
    name: "the townhouses",
    frequency: 1,
    sequence: ["townhouses", "schnauzers", "schnerzgerberz"],
  },
];
