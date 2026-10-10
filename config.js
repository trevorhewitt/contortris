// ============================================================
// EXTRIS SETTINGS — every tunable number in the game lives here.
// ============================================================

export const CONFIG = {
  board: { cols: 14, rows: 24 },

  // Game modes. Extreme = the original game. Normal = the same game plus powerups.
  modes: {
    // giants: whether the huge (difficulty 4 and 5) pieces turn up at all
    // level6: whether the level 6 groups can unlock (see assist.level6)
    easy: { label: "Easy", tagline: "powerups, and no giant pieces", powerups: true, giants: false, level6: false },
    normal: { label: "Normal", tagline: "powerups help you out", powerups: true, giants: true, level6: true },
    extreme: { label: "Extreme", tagline: "the original. no help.", powerups: false, giants: true, level6: true },
  },
  defaultMode: "normal",

  timing: {
    baseDropMs: 500,
    minDropMs: 110,
    levelEveryLines: 3,
    speedMultiplierPerLevel: 0.92,
    softDropFactor: 0.12,
    maxFallStepsPerFrame: 1,
    maxAccumulatedSteps: 2,
    lockDelayMsKeyboard: 220,
    lockDelayMsTouch: 520,
    tapRepeatStartMs: 140,
    tapRepeatEveryMs: 55,
    doubleTapMs: 300,      // double tap the bottom of the board (or press down twice) to drop instantly
  },

  // Pieces come in at the centre ± a few random columns (most often near the middle), so
  // holding down, or looking away, builds a pile rather than one tower in the middle.
  spawn: {
    jitter: 2,          // columns either way (0 = always dead centre)
  },

  // End game: once the stack reaches two thirds of the board, the game stops helping and goes
  // for a frantic finale: bigger and worse pieces, fewer powerups, and the fall speeds up with
  // every piece. Digging back down to `exitAtRows` gets you out (not easy). All modes. The
  // board flashes red meanwhile. Games then end with a full board and, usually, a big piece.
  endGame: {
    enabled: true,
    enterAtRows: 16,    // starts when the pile is this many rows tall (2/3 of 24)...
    exitAtRows: 10,     // ...and stops if you dig it back down to this many rows or fewer
    columns: 4,         // (the pile's height = the height at least this many columns reach,
                        //  so one tall giant standing on its end doesn't count)
    // what comes meanwhile (Easy has no giants: their share goes to the others)...
    levelWeights: { 0: 0, 1: 0.1, 2: 0.2, 3: 0.35, 4: 0.2, 5: 0.15 },
    giantsRamp: 0.05,   // ...and every piece moves this much more of the weight onto the giants
    giantsRampMax: 0.45,
    powerupRate: 0.3,   // powerups are this much rarer, and no longer favour the helpful ones
    speedPerPiece: 0.93,// the fall gets this much faster with every piece...
    minDropMs: 60,      // ...down to this many ms per row
    spawnJitter: 3,     // pieces come in further off-centre, so the whole board fills up
  },

  // Turning pieces. A piece that would stick out past a wall when it turns is pushed back
  // inside (so even a board-wide piece can turn), and goes back where it was on the next turn
  // if you haven't moved it sideways in between.
  rotation: {
    centrePivotFrom: 5, // pieces this many blocks across (or more) turn about their centre;
                        // smaller ones about their top-left corner
  },

  scoring: {
    lineClear: { 1: 100, 2: 250, 3: 450, 4: 700, 5: 1000, 6: 1400, 7: 1900, 8: 2500 },
    softDropPerCell: 1,
    hardDropPerCell: 2,
    // everything below is × level
    placePerBlock: 2,           // each block of a piece you place
    blockDestroyed: 5,          // each block destroyed, by a line clear or a powerup
    powerupDestroyPerBlock: 10, // extra for each block a powerup destroys
    powerupMovePerBlock: 3,     // each block a powerup moves or fills
    // rows a powerup wipes out wall to wall also score lineClear
  },

  pause: { hideShapes: true, pauseWhenHidden: true },

  render: {
    // "enhanced" = new look (art not cut by grid lines, soft piece edges, tiled background).
    // "classic"  = the original look.
    // While debugging (press D), V toggles between them.
    cellStyle: "enhanced",

    cellPx: 18,
    maxScale: 3, // max backing-store pixels per board pixel (crispness vs cost)
    gridLineAlpha: 0.22,
    bg: "#000000",

    ghost: {
      enabled: true,
      fill: "rgba(255,255,255,0.07)",
      stroke: "rgba(255,255,255,0.40)",
      lineWidth: 0.1,
      insetPx: 0.0,
      drawBehindActive: true,
    },

    enhanced: {
      // How visible the edges between pieces are (outline, bevel and shadow together).
      // 0 = none: the board becomes one big mess of pixel art. 1 = strong, chunky pieces.
      edgeStrength: 0.3,

      // Edge colours at edgeStrength 1 (their alpha is scaled by edgeStrength).
      outline: [0, 0, 0, 0.62],
      bevelLight: [255, 255, 255, 0.22],
      bevelDark: [0, 0, 0, 0.26],
      shadow: [0, 0, 0, 0.55],
      shadowOffsetPx: 2,

      bgTop: "#06060f",
      bgBottom: "#020206",
      emptyCellFill: "rgba(255,255,255,0.028)",
      emptyCellDot: "rgba(255,255,255,0.10)",
      ghostFill: "rgba(255,255,255,0.05)",
      ghostStroke: "rgba(255,255,255,0.45)",
    },
  },

  assist: {
    openingNoLevel0UntilDrop: 17, // no level-0 (tiny) pieces in the first 17 drops

    // “Danger” bands (rows-from-top). Higher = assistance kicks in earlier.
    topRowsForDiff2Only: 19,  // (scaled with the board: it was 22 of 28 rows)
    topRowsForDiff1Only: 10,  // (was 12 of 28)

    pieceMix: {
      // Baseline level weights (0–5). Keep 4/5 at 0: they’re injected via the “hard” scheduler below.
      // (level 0 is 0.13 rather than 0.1 to make up for the opening level-0 ban below,
      //  which used to be switched off by a bug — measured to keep the same difficulty)
      baseLevelWeight:    { 0: 0.13, 1: 0.5, 2: 0.3, 3: 0.08, 4: 0.00, 5: 0.00 },

      // Opening blend (first N drops), then fades into baseLevelWeight.
      openingDrops: 10,
      openingLevelWeight: { 0: 0.00, 1: 0.42, 2: 0.38, 3: 0.20, 4: 0.00, 5: 0.00 },

      // Soft danger bias: blends level weights towards dangerTargetMix as danger rises.
      dangerBiasStrength: 1.35,
      dangerTargetMix: { 0: 0.72, 1: 0.25, 2: 0.03, 3: 0.00, 4: 0.00, 5: 0.00 },

      // “Hard shapes” scheduler: subclasses are level 4 (awkward) and level 5 (large-but-not-awkward).
      hard: {
        // Never drop any hard (4/5) in the first minDropIndex drops.
        minDropIndex: 5,

        // Window where hard becomes increasingly likely (urge grows faster inside window).
        softWindowStart: 6,
        softWindowEnd: 25,

        // Urge accumulator (shared for 4+5). When a 4 or 5 drops: urge -> 0 and cooldown starts.
        rechargePerDrop: 0.0075,
        maxUrge: 0.95,
        cooldownDrops: 9,

        // Early “first hard” preference: the first hard drop should be a level 5 (if possible).
        preferLevel5ForFirstHard: true,

        // The first giant (level 5) always lands somewhere in this range of pieces — just as
        // you settle in, the Pyramid of Giza arrives. A random piece number in the range is
        // picked at the start of each game. (Normal and Extreme; Easy has no giants.)
        firstGiantBetween: [6, 18],

        // If danger is above this, hard is disallowed entirely (same idea as old level4MaxDanger).
        hardMaxDanger: 0.32,

        // Level 5 gating: level 5 is suppressed as stack gets higher.
        // Below level5FullAllowedDanger: 5 is fully eligible.
        // Above level5AlmostNeverDanger: 5 is almost never chosen (but still technically possible).
        level5FullAllowedDanger: 0.12,
        level5AlmostNeverDanger: 0.28,

        // When hard is chosen (4/5), split between them using this baseline ratio,
        // then apply the level-5 suppression curve above.
        baseProbLevel5WhenHard: 0.55,
      },
    },

    // Variety: once a level has been chosen, pieces are picked by frequency × these
    // multipliers, so the same things don't keep turning up. Both are soft (never zero),
    // and linked "back to back" pieces (nextShapes) ignore them.
    variety: {
      // Hard rule: the same piece never comes again within this many pieces (linked
      // "back to back" pieces like the fish are the only exception). 0 = off.
      noRepeatWithin: 5,
      // The big level 4 and 5 pieces are the most noticeable, so one already served this
      // game is much less likely to come again: its weight × repeatPenalty per time served
      // (it can still happen, just rarely, e.g. when every giant has had a turn).
      giants: { repeatPenalty: 0.04 },
      // Across games: pieces that opened your last few games (remembered in this browser)
      // are less likely in the first `drops` pieces of the next one, so openings differ.
      acrossGames: { games: 3, drops: 20, penalty: 0.2 },

      // Pieces served recently: d drops ago (1..lastK) the weight is multiplied by
      // 1 - penaltyStrength × (lastK - d + 1) / lastK  (strongest for the last piece).
      recent: {
        lastK: 8,
        penaltyStrength: 0.8,  // 0 = off
        minMultiplier: 0.1,
      },
      // Pieces whose blocks are still on the board: each whole copy on the board multiplies
      // the weight by (1 - penaltyPerCopy). A copy that has been partly destroyed counts
      // partly (by the fraction of its blocks left).
      onBoard: {
        penaltyPerCopy: 0.6,   // 0 = off
        minMultiplier: 0.1,
      },
    },

    // Level 6: the biggest pieces of all. They only ever come as whole groups, in order
    // (shapes/groups.js: the Tower of Babel in three sections, nothing and then everything,
    // a run of spam, the townhouses...). They are locked at the start of every game, and
    // unlock when you build the stack up past row `unlockAbove` (counted from the bottom) and
    // then dig back down to row `unlockBackTo` or lower. Normal and Extreme only.
    level6: {
      unlockAbove: 10,          // the stack has to have been taller than this many rows...
      unlockBackTo: 5,          // ...and then come back down to this many rows or fewer
      persist: false,           // true = once unlocked, stay unlocked in later games too
                                //        (remembered in this browser)
      firstAfter: [2, 5],       // the first group arrives this many pieces after the unlock
      chancePerDrop: 0.05,      // after that: the chance a group starts on any given piece...
      cooldownDrops: 25,        // ...once this many pieces have passed since the last group...
      maxStackRows: 9,          // ...and only while the stack is this many rows tall or less
      // A group only starts if the board has room for all of it: its blocks spread over the
      // width × roomFactor (for the gaps they leave), with `headroom` rows to spare at the top.
      // (Three townhouses in a row need about 15 rows.)
      roomFactor: 1.25,
      headroom: 3,
      repeatPenalty: 0.15,      // a group already seen this game is this much less likely
    },

    // Powerup scheduler (Normal mode only). Runs before the regular level mix:
    // once a powerup is "due", it replaces that drop's regular piece.
    powerups: {
      // No powerups in the first N drops of a run.
      minDropIndex: 4,
      // Drops to wait after a powerup before another one can appear.
      cooldownDrops: 2,

      // Chance per drop once eligible. Starts at baseChance and grows by
      // chancePerDrop every drop without a powerup (reset when one drops).
      baseChance: 0.12,
      chancePerDrop: 0.07,
      maxChance: 0.8,

      // Powerup types that are switched off: their pieces stay in shapes/main_shapes.js but are
      // never served (combos with a part of these types are off too).
      disabledTypes: ["blast", "goo"],

      // Powerups are introduced class by class (each class with an intro screen). Once a
      // class is in, every powerup of that class can turn up.
      progression: {
        enabled: true,
        // the first class is picked at random from these (the simpler ones), so every
        // game starts differently
        firstClassPool: ["destroyer", "gravity", "expander"],
        newClassEvery: 6,          // after this many powerups, the next one opens a new class
        newClassAfterDrops: 32,    // ...or after this many drops since the last new class
        // intro screens interrupt the game: at least this many pieces between two of them
        // (new classes and the first combo). The first of a class is always a `starter`.
        minDropsBetweenIntros: 18,
      },

      // Usability: before picking, every candidate powerup is tried on the current board.
      // Ones that couldn't help anywhere (e.g. gravity with no air pockets to fill, a phantom
      // whose shape fits no gap) get their weight × unusableWeight, so they still turn up
      // now and then (it shouldn't feel like hand-holding) but rarely. The same goes for
      // which class is introduced next (× unusableClassWeight if none of it is usable).
      usability: {
        enabled: true,
        minUseful: 1,            // "useful" = destroys, moves down/sideways or plugs at least this many blocks
        unusableWeight: 0.1,     // 0 = never serve an unusable powerup, 1 = no bias
        // Hard rules (always on while usability is enabled): a new class only opens when one
        // of its pieces is usable, and a class only serves usable pieces until one of its
        // powerups has done something, and again after one is wasted.
      },

      // Combos (two powerups in one) turn up mid-to-late game, built only from classes
      // that are already in.
      combos: {
        minDrop: 15,      // not before this many drops...
        minClasses: 2,    // ...and not until this many classes are in (they're built from those)
        firstBoost: 25,   // until the first combo has turned up, combos are this much likelier,
                          // so players see one soon after they open; then back to `weight`
        weight: 0.5,      // how often a combo is picked compared with a normal powerup
      },

      // "Bad" powerups (powerup.bad in the data, e.g. existential horror): they mostly make
      // things worse. Rare by their frequency and help 1; on top of that, never before this
      // many drops, and never while their class is still being learned.
      bad: {
        minDrop: 40,
      },

      // Helpfulness: each powerup has `help` (1–5) in its data. The worse you're doing
      // (the struggle tally: stack height, air pockets, how long since you cleared a row),
      // the more the helpful ones are preferred. helpPower is how strongly, at full struggle.
      // Even when you're doing fine, luckyChance of powerups are picked mostly by help.
      struggle: {
        rowDroughtDrops: 18, // this many drops without destroying a row counts as full drought
        smoothing: 0.3,      // 0..1: how quickly the tally follows the board
        helpPower: 2.2,
        calmHelpPower: -0.3, // when not struggling, slightly favour the gentler ones
        chanceBoost: 0.6,    // the powerup chance is also multiplied by 1 + chanceBoost * struggle
        luckyChance: 0.12,
      },

      // The chance is multiplied by (1 + dangerBoost*danger + holesBoost*holes01):
      // you get more help when the stack is high or full of air pockets.
      dangerBoost: 1.6,
      holesBoost: 0.8,
      holesForMax: 18, // this many air pockets counts as holes01 = 1

      // Which class is most useful right now (multipliers):
      // downward gravity/expanders fix air pockets, destroyers fix height.
      // Sideways gravity (slides) tidies rows but rarely fixes air pockets.
      need: {
        gravity:         { base: 0.6, holes: 1.2, danger: 0.0 },
        gravitySideways: { base: 0.6, holes: 0.0, danger: 0.0 },
        expander:        { base: 0.6, holes: 0.8, danger: 0.0 },
        destroyer:       { base: 0.7, holes: 0.2, danger: 1.0 },
        acid:            { base: 0.7, holes: 0.3, danger: 0.8 },
        blast:           { base: 0.7, holes: 0.3, danger: 0.6 },
        goo:             { base: 0.6, holes: 1.0, danger: 0.0 },
        phantom:         { base: 0.6, holes: 1.2, danger: 0.0 },
        combo:           { base: 0.8, holes: 0.6, danger: 0.8 },
      },
    },
  },

  achievements: {
    enabled: true,
    toastMs: 3200,     // how long an unlock toast stays up
    maxToastsAtOnce: 1, // more unlocks than this wait their turn...
    maxToastsQueued: 3, // ...up to this many in all; any more unlock quietly (no toast)
  },

  sound: {
    enabled: true,     // players can toggle it in the menus (remembered per browser)
    volume: 0.45,      // master volume 0–1
    moveClicks: true,  // tiny clicks when moving/rotating
  },

  fx: {
    quake: {
      enabled: true,

      // Visual behaviour of the shake itself
      maxOffsetPx: 8,
      traumaDecayPerSecond: 2.8,
      rotationalDegrees: 0.8,

      // Scaling of triggered shake intensity
      minTrauma: 0.025,        // smallest visible shake if triggered at all
      maxTrauma: 0.5,          // largest allowed shake from any single trigger
      blocksForMax: 100,       // how many blocks correspond to maxTrauma
      blockScalePower: 0.85,   // <1 = ramps up faster early, >1 = slower early
    },
    lineClear: {
      enabled: true,
      particleSizePx: 3,
      particlesPerPixel: 0.35,
      maxParticlesPerCell: 24,
      speedMin: 35,
      speedMax: 180,
      upwardBias: 0.18,
      lifeMinMs: 220,
      lifeMaxMs: 520,
      gravityPxPerSec2: 260,
      dragPerSecond: 2.4,
      boardFallAnimMs: 60,
      boardFallPxPerRow: 18,
      quakePerClearedLine: 0.3,
    },

    // Big text that pops up over the board ("DOUBLE!", "+24 BLOCKS").
    callouts: {
      enabled: true,
      durationMs: 1100,
      multiRow: { 2: "double!", 3: "triple!", 4: "quadruple!", 5: "pentuple!!", 6: "sextuple!!!" },
      powerupBlocksMin: 8, // show "+N" when a powerup destroys/moves/fills at least this many
    },

    largePieceLock: {
      quakePerCell: 0.03,
      minDifficulty: 4,
      // the least shake a big piece makes when it lands (0-1, maxTrauma is 0.5)
      minTraumaByDifficulty: { 4: 0.3, 5: 0.42, 6: 0.5 },
    },

    powerup: {
      // Locked powerup glows for this long before it fires.
      chargeMs: 260,

      // Destroyer: pause after the blast before play continues.
      destroySettleMs: 220,
      destroyFlashMs: 160,
      destroyQuakePerBlock: 1.5,

      // Gravity: per-block slide time = base + perSqrtCell*sqrt(distance), capped.
      gravityBaseMs: 60,
      gravityMsPerSqrtCell: 70,
      gravityMaxMs: 420,
      blastTimeScale: 1.7,  // blast flights play this much slower than "real" time
      gravityQuakePerBlock: 0.8,

      // Expander: fill cells pop in rings outward from the powerup.
      expandStaggerMsPerCell: 40,
      expandGrowMs: 180,

      // Highlighted cells overlay.
      overlay: {
        periodMs: 900,           // one loop of the square / line animation
        hueDegPerMs: 0.12,       // rainbow scroll speed
        hueStepPerCell: 18,      // rainbow spread across cells
        fillAlpha: 0.30,         // cells the effect will change
        idleFillAlpha: 0.11,     // highlighted cells it won't change (e.g. empty cells for a destroyer)
        markAlpha: 0.95,
        idleMarkAlpha: 0.45,
        ripplePerCell: 0.12,     // destroyer/expander ripple offset per cell of distance
      },
      shimmerAlpha: 0.9,         // rainbow outline around powerup pieces
    },

    gameOverBackdrop: {
      enabled: true,
      scale: 1.9,
      alpha: 0.95,
      cutEveryMs: 5000,
      movePxPerSec: 24,
      rotationDeg: 18,
    },
  },
};
