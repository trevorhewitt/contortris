/**
 * EXTRIS ACHIEVEMENTS
 * Edit by hand or with block_designer.html (Achievements tab; it keeps this comment when saving).
 *
 * Each entry:
 * {
 *   id: "unique_id",          lowercase letters, numbers and _ (unlocks are saved by id)
 *   name: "Fun Name",
 *   description: "What you have to do.",
 *   icon: [[...]],            pixel art: a square grid of hex colours, "" = transparent
 *                             (12×12 recommended; any size up to 32×32 works)
 *   trigger: { type, ... },   when it unlocks (see below)
 *   mode: "any",              optional: "any" (default), "normal" or "extreme"
 *   secret: false,            optional: shows as "???" until unlocked
 * }
 *
 * trigger types:
 *   rowsDestroyed  { count, scope }   destroy `count` rows; scope "game" (one game, default)
 *                                     or "lifetime" (all games). Line clears and rows a
 *                                     powerup collapses both count.
 *   multiRow       { rows }           destroy at least `rows` rows in one go
 *   pieceServed    { match }          a matching piece arrives
 *   pieceSequence  { ids }            these pieces arrive one straight after another, in order
 *                                     (e.g. ["spam", "spam", "spam"])
 *   pieceInside    { piece, container, zone }
 *                                     a `piece`-matching block lands with at least one block in
 *                                     the zone (default "inside") of a `container`-matching
 *                                     piece on the board — in either order
 *   seenAll        { match }          every matching piece has arrived at least once in one game
 *   powerupUsed    { match, count, scope }
 *                                     fire matching powerups `count` times (default 1)
 *   powerupBlocks  { match, count }   one matching powerup destroys, moves or fills at least
 *                                     `count` blocks
 *   score          { value }          reach this score in one game
 *   level          { value }          reach this level in one game
 *   drops          { count }          place this many pieces in one game
 *   boardCleared   {}                 the board is completely empty after rows are destroyed
 *   gameOver       { killer, maxDrops }
 *                                     the game ends; optionally only if the piece that topped
 *                                     you out matches `killer`, or within `maxDrops` pieces
 *
 * match: { ids: ["spam"], tags: ["food"], types: ["destroyer"] }
 *   matches a piece whose id is listed, OR that has one of the tags, OR (powerups) whose type
 *   is listed. Leave it out to match anything.
 */

export const ACHIEVEMENTS = [
  {
    id: "rows_1",
    name: "Baby's First Row",
    description: "Destroy a row.",
    trigger: {
      type: "rowsDestroyed",
      count: 1
    },
  },
  {
    id: "rows_5",
    name: "High Five",
    description: "Destroy 5 rows in one game.",
    trigger: {
      type: "rowsDestroyed",
      count: 5
    },
  },
  {
    id: "rows_10",
    name: "Perfect Ten",
    description: "Destroy 10 rows in one game.",
    trigger: {
      type: "rowsDestroyed",
      count: 10
    },
  },
  {
    id: "rows_20",
    name: "Twenty Twenty",
    description: "Destroy 20 rows in one game.",
    trigger: {
      type: "rowsDestroyed",
      count: 20
    },
  },
  {
    id: "rows_40",
    name: "Life Begins at Forty",
    description: "Destroy 40 rows in one game.",
    trigger: {
      type: "rowsDestroyed",
      count: 40
    },
  },
  {
    id: "rows_80",
    name: "Octogenarian",
    description: "Destroy 80 rows in one game.",
    trigger: {
      type: "rowsDestroyed",
      count: 80
    },
  },
  {
    id: "rows_160",
    name: "The Row-man Empire",
    description: "Destroy 160 rows in one game.",
    trigger: {
      type: "rowsDestroyed",
      count: 160
    },
  },
  {
    id: "rows_life_250",
    name: "Row, Row, Row Your Boat",
    description: "Destroy 250 rows in total.",
    trigger: {
      type: "rowsDestroyed",
      count: 250,
      scope: "lifetime"
    },
  },
  {
    id: "rows_life_1000",
    name: "The Thousand-Row Stare",
    description: "Destroy 1,000 rows in total.",
    trigger: {
      type: "rowsDestroyed",
      count: 1000,
      scope: "lifetime"
    },
  },
  {
    id: "multi_2",
    name: "Double Trouble",
    description: "Destroy 2 rows at once.",
    trigger: {
      type: "multiRow",
      rows: 2
    },
  },
  {
    id: "multi_3",
    name: "Hat Trick",
    description: "Destroy 3 rows at once.",
    trigger: {
      type: "multiRow",
      rows: 3
    },
  },
  {
    id: "multi_4",
    name: "Quadruple Bypass",
    description: "Destroy 4 rows at once.",
    trigger: {
      type: "multiRow",
      rows: 4
    },
  },
  {
    id: "multi_5",
    name: "Pentakill",
    description: "Destroy 5 rows at once.",
    trigger: {
      type: "multiRow",
      rows: 5
    },
  },
  {
    id: "multi_6",
    name: "Absolute Unit",
    description: "Destroy 6 or more rows at once.",
    trigger: {
      type: "multiRow",
      rows: 6
    },
  },
  {
    id: "food_mouth",
    name: "Om Nom Nom",
    description: "Drop some food into another mouth to feed.",
    trigger: {
      type: "pieceInside",
      piece: {
        tags: [
          "food"
        ]
      },
      container: {
        tags: [
          "mouth"
        ]
      },
      zone: "inside"
    },
  },
  {
    id: "tongue_mouth",
    name: "Back Where It Belongs",
    description: "Put a tongue inside the mouth.",
    trigger: {
      type: "pieceInside",
      piece: {
        ids: [
          "tongue"
        ]
      },
      container: {
        tags: [
          "mouth"
        ]
      },
      zone: "inside"
    },
  },
  {
    id: "pea_mouth",
    name: "Eat Your Greens",
    description: "Feed the mouth a single pea.",
    trigger: {
      type: "pieceInside",
      piece: {
        ids: [
          "pea"
        ]
      },
      container: {
        tags: [
          "mouth"
        ]
      },
      zone: "inside"
    },
    secret: true,
  },
  {
    id: "pill_mouth",
    name: "Take Your Medication",
    description: "Put some medicine in the mouth.",
    trigger: {
      type: "pieceInside",
      piece: {
        tags: [
          "medicine"
        ]
      },
      container: {
        tags: [
          "mouth"
        ]
      },
      zone: "inside"
    },
  },
  {
    id: "spam",
    name: "Unsolicited",
    description: "Get spam.",
    trigger: {
      type: "pieceServed",
      match: {
        ids: [
          "spam"
        ]
      }
    },
  },
  {
    id: "spam_3",
    name: "Lovely Spam, Wonderful Spam",
    description: "Get spam three times in a row.",
    trigger: {
      type: "pieceSequence",
      ids: [
        "spam",
        "spam",
        "spam"
      ]
    },
    secret: true,
  },
  {
    id: "fish",
    name: "Dr. Seuss Would Be Proud",
    description: "Get one fish, two fish, red fish and blue fish, in that order.",
    trigger: {
      type: "pieceSequence",
      ids: [
        "onefish",
        "twofish",
        "redfish",
        "bluefish"
      ]
    },
    secret: true,
  },
  {
    id: "bees",
    name: "Not the Bees!",
    description: "Get a swarm of bees.",
    trigger: {
      type: "pieceServed",
      match: {
        ids: [
          "bees"
        ]
      }
    },
  },
  {
    id: "happy_3",
    name: "Feeling Great, Actually",
    description: "Get happy pills three times in a row.",
    trigger: {
      type: "pieceSequence",
      ids: [
        "happy_pills",
        "happy_pills",
        "happy_pills"
      ]
    },
    secret: true,
  },
  {
    id: "squelchy_all",
    name: "Florgnorfepus Collector",
    description: "Meet every member of the squelchy family in one game.",
    trigger: {
      type: "seenAll",
      match: {
        tags: [
          "squelchy"
        ]
      }
    },
  },
  {
    id: "powerup_1",
    name: "Power Up!",
    description: "Use a powerup.",
    trigger: {
      type: "powerupUsed",
      count: 1
    },
    mode: "normal",
  },
  {
    id: "powerup_10",
    name: "Power Hungry",
    description: "Use 10 powerups in one game.",
    trigger: {
      type: "powerupUsed",
      count: 10
    },
    mode: "normal",
  },
  {
    id: "powerup_100",
    name: "Unlimited Power",
    description: "Use 100 powerups in total.",
    trigger: {
      type: "powerupUsed",
      count: 100,
      scope: "lifetime"
    },
    mode: "normal",
  },
  {
    id: "overkill",
    name: "Overkill",
    description: "Destroy 20 blocks with a single powerup.",
    trigger: {
      type: "powerupBlocks",
      match: {
        types: [
          "destroyer"
        ]
      },
      count: 20
    },
    mode: "normal",
  },
  {
    id: "katana",
    name: "Nothing Personal, Kid",
    description: "Slice a row in half with a cool katana.",
    trigger: {
      type: "powerupUsed",
      match: {
        ids: [
          "katana"
        ]
      }
    },
    mode: "normal",
  },
  {
    id: "earthquake",
    name: "Nobody Was Hurt",
    description: "Survive a small earthquake.",
    trigger: {
      type: "powerupUsed",
      match: {
        ids: [
          "earthquake"
        ]
      }
    },
    mode: "normal",
  },
  {
    id: "cha_cha",
    name: "Cha Cha Real Smooth",
    description: "Slide to the left, then slide to the right.",
    trigger: {
      type: "pieceSequence",
      ids: [
        "slide_left",
        "slide_right"
      ]
    },
    mode: "normal",
  },
  {
    id: "spotless",
    name: "Spotless",
    description: "Clear the entire board.",
    trigger: {
      type: "boardCleared"
    },
  },
  {
    id: "score_10k",
    name: "Five Digits",
    description: "Score 10,000 points in one game.",
    trigger: {
      type: "score",
      value: 10000
    },
  },
  {
    id: "score_50k",
    name: "Big Numbers",
    description: "Score 50,000 points in one game.",
    trigger: {
      type: "score",
      value: 50000
    },
  },
  {
    id: "drops_100",
    name: "Centurion",
    description: "Place 100 pieces in one game.",
    trigger: {
      type: "drops",
      count: 100
    },
  },
  {
    id: "extreme_level_5",
    name: "Extreme Survivor",
    description: "Reach level 5 in Extreme mode.",
    trigger: {
      type: "level",
      value: 5
    },
    mode: "extreme",
  },
  {
    id: "quick_death",
    name: "That Was Quick",
    description: "Top out within 15 pieces.",
    trigger: {
      type: "gameOver",
      maxDrops: 15
    },
    secret: true,
  },
  {
    id: "death_by_art",
    name: "Death by Art",
    description: "Get topped out by a masterpiece.",
    trigger: {
      type: "gameOver",
      killer: {
        tags: [
          "art"
        ]
      }
    },
    secret: true,
  },
];
