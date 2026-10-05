// ============================================================
// EXTRIS SETTINGS — every tunable number in the game lives here.
// ============================================================

export const CONFIG = {
  board: { cols: 14, rows: 28 },

  // Game modes. Extreme = the original game. Normal = the same game plus powerups.
  modes: {
    // giants: whether the huge (difficulty 4 and 5) pieces turn up at all
    easy: { label: "Easy", tagline: "powerups, and no giant pieces", powerups: true, giants: false },
    normal: { label: "Normal", tagline: "powerups help you out", powerups: true, giants: true },
    extreme: { label: "Extreme", tagline: "the original. no help.", powerups: false, giants: true },
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
    topRowsForDiff2Only: 22,
    topRowsForDiff1Only: 12,

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

      // Powerups are introduced class by class (each class with an intro screen). Once a
      // class is in, every powerup of that class can turn up.
      progression: {
        enabled: true,
        // the first class is picked at random from these (the simpler ones), so every
        // game starts differently
        firstClassPool: ["destroyer", "gravity", "expander", "acid"],
        newClassEvery: 5,          // after this many powerups, the next one opens a new class
        newClassAfterDrops: 28,    // ...or after this many drops since the last new class
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
        unusableClassWeight: 0.1,
      },

      // Combos (two powerups in one) turn up mid-to-late game, built only from classes
      // that are already in.
      combos: {
        minDrop: 45,      // not before this many drops...
        minClasses: 3,    // ...and not until this many classes are in
        weight: 0.6,      // how often a combo is picked compared with a normal powerup
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
    maxToastsAtOnce: 2, // more unlocks than this wait their turn
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
