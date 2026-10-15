// ============================================================
// EXTRIS SETTINGS — every tunable number in the game lives here.
// ============================================================

export const CONFIG = {
  board: { cols: 14, rows: 24 },

  // Game modes. Extreme = the original game. Normal = the same game plus powerups.
  modes: {
    // giants: whether the huge (difficulty 4 and 5) pieces turn up at all
    // level6: whether the level 6 groups can unlock (see assist.level6), or "open": open from
    //         the first piece
    // everything: every powerup class and the combos are in from the first piece (no intro
    //         screens, nothing to wait for)
    // (Easy is gone from the menu: kept here so a game remembered as Easy still means something)
    easy: { label: "Easy", tagline: "powerups, and no giant pieces", powerups: true, giants: false, level6: false, warmup: true, hidden: true },
    normal: { label: "Classic", tagline: "the full game, powerups and all", powerups: true, giants: true, level6: true, warmup: true },
    extreme: { label: "Extreme", tagline: "the original. no help.", powerups: false, giants: true, level6: true, hints: false },
    god: { label: "God", tagline: "everything, right away", powerups: true, giants: true, level6: "open", everything: true },
    // speeds: a speed setting on the pause menu, these times timeScale (1 to start with).
    // zen: it plays itself, and never ends (CONFIG.zen, src/zen.js); calm: zen for playing, slow
    // and easy (CONFIG.zen.calm, which also has its own numbers for the pieces); timeScale: how fast it all runs;
    // zenMovements: "turbo" for turbo zen's own mix of movements; flashNames: the falling piece's
    // name just appears, no sliding in and out; captions: false, no words over the board for what
    // zen's director is up to
    zen: { label: "Zen", tagline: "slow and easy: it plays itself, or you do", warmup: "always", powerups: true, giants: true, level6: "open", everything: true, zen: true, calm: true },
    turbo: { label: "Turbo zen", tagline: "it plays itself, and doesn't stop", powerups: true, giants: true, level6: "open", everything: true, zen: true, timeScale: 2.34, zenMovements: "turbo", flashNames: true, pauseWhenHidden: false, speeds: [0.5, 0.75, 1, 1.25, 1.5, 2], captions: false },
    // (behind the home screen, CONFIG.home: turbo zen with no words in it at all, no names, no
    // callouts, at an easier pace so you see the pieces fall; never a pause, dramatic or for
    // breath (dramatic, rest: false), so something's always coming down; its demolitions leave
    // `keep` rows or so, so the board is seldom bare; and it stops while the page is hidden.
    // Never one to play.)
    home: { label: "Home", hidden: true, powerups: true, giants: true, level6: "open", everything: true, zen: true, timeScale: 1, zenMovements: "turbo", flashNames: true, pauseWhenHidden: false, captions: false, callouts: false, names: false, home: true, keep: [6, 10], dramatic: false, rest: false },
  },
  defaultMode: "normal",

  // The home screen (src/home.js). Turbo zen plays behind it (mode "home"), on a board `rows`
  // tall and as wide as the window's shape allows (`widthShare` of it, `minCols` to `maxCols`),
  // seen through a camera that works in shots, like a film: a steady, straight move lasting
  // `shotMs` (a pan past the action, mostly, or a push in or a pull back), then a cut to the
  // next; now and then (`tiltChance`) one at a tilt of up to `maxTurn` degrees. Each shot is
  // framed on where the action is (the next piece's landing and all a powerup will reach, and the
  // next few landings), zoomed in up to `zoom` times as close as just filling the screen but never
  // to less than `minView` cells across and down; and when the next piece will land out of
  // sight, it cuts to it (no two cuts within `minShotMs`). Over it, effects drift by, a different
  // kind every `fxEvery` ms or so, and the logo does a different move every `logoEvery` ms.
  // Left alone for `idleMs`, it all fades away into plain turbo zen filling the window (a fresh
  // one whenever the window changes size), with a small button to play; any touch, click, key or
  // move of the mouse brings the home screen back.
  // Choosing a mode: everything on the screen bursts into pieces and fades to dark (`burstMs` in
  // all, the last `fadeMs` of it the fade), and the game comes up out of the dark (`fadeMs`).
  home: {
    rows: 24, minCols: 14, maxCols: 30, widthShare: 0.85,
    zoom: 2.6, shotMs: [2600, 4200], tiltChance: 0.3, maxTurn: 5, minView: [10, 9], minShotMs: 600,
    fxEvery: [14000, 22000], logoEvery: 2600,
    idleMs: 30000,
    burstMs: 600, fadeMs: 240,
  },

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
    // slid or turned along the ground, a piece waits at least this long before it locks, so it
    // can be slid again (until it has spent slideMaxMs on the ground in all)
    slideLockMs: 500,
    slideMaxMs: 3000,
    tapRepeatStartMs: 140,
    tapRepeatEveryMs: 55,
    // triple tap the bottom of the board (or press down three times) to drop instantly, or a
    // side (left / right three times) to slide all the way over; taps this close together count
    multiTapMs: 300,
    multiTaps: 3,
    // a piece about to lock sticking out above the top (game over) gets this long more, once:
    // it flashes red and the board warns, and it can still be moved
    lastChanceMs: 1000,
  },

  // Pieces come in at the centre ± a few random columns (most often near the middle), so
  // holding down, or looking away, builds a pile rather than one tower in the middle.
  spawn: {
    jitter: 2,          // columns either way (0 = always dead centre)
  },

  // End game: a hidden part of the experience (never announced). Once it's clear the player has
  // given up, the game quietly stops helping and goes for a frantic finale: bigger and worse
  // pieces, fewer powerups, and the fall gets faster with every piece. Digging back down to
  // `exitAtRows` gets you out (not easy). Games then end with a full board and, usually, a big
  // piece, instead of a long slow fizzle on a central tower. All modes.
  endGame: {
    enabled: true,
    // "Given up" = the pile has sat this high...
    enterAtRows: 16,    // (rows: two thirds of 24)
    columns: 4,         // (the pile's height = the height at least this many columns reach,
                        //  so one tall giant standing on its end doesn't count)
    // ...for this many pieces in a row without a single row being destroyed...
    stuckPieces: 20,
    // ...or for only this many if they've also stopped steering: `idleOf` [3, 4] = 3 of the
    // last 4 pieces were dropped where they appeared, without being moved or turned
    idleStuckPieces: 3,
    idleOf: [3, 4],
    graceAfterGroup: 8, // a level 6 group, and this many pieces after it, don't count
    exitAtRows: 10,     // it stops if the pile is dug back down to this many rows or fewer
    // what comes meanwhile (Easy has no giants: their share goes to the others)...
    levelWeights: { 0: 0, 1: 0.05, 2: 0.1, 3: 0.25, 4: 0.3, 5: 0.3 },
    giantsRamp: 0.05,   // ...and every piece moves this much more of the weight onto the giants
    giantsRampMax: 0.3,
    powerupRate: 0.3,   // powerups are this much rarer, and no longer favour the helpful ones
    speedPerPiece: 0.93,// the fall gets this much faster with every piece...
    minDropMs: 60,      // ...down to this many ms per row
    spawnJitter: 3,     // pieces come in further off-centre, so the whole board fills up
  },

  // God mode (modes.god): everything from the first piece, and plenty of it. The level 6 sets
  // are open from the start, every powerup class and the combos are in (no intro screens), and
  // giants and sets come early and often. To make up for them: lots of powerups, mostly the
  // best ones, the wide gravitizers. Each section replaces the same numbers in `assist` (only
  // the ones listed) while playing God mode.
  // Zen mode (src/zen.js): the director decides what comes next, the autopilot plays each piece
  // unless the player takes it over, and it never ends.
  zen: {
    // Zen itself is for playing: slow and easy, and it can't be lost. Each piece comes down at an
    // easy pace (dropMs a row), and the computer turns it and moves it over to where it would put
    // it, a step every glideMs; touch it and it's yours. Leave it alone for idleMs and it carries
    // on by itself a little quicker (idleDropMs a row) until it's touched again. It keeps the
    // board low and never builds anything up, with now and then a little run of something; and
    // when the player leaves it high (helpHeight of the board) or full of gaps (helpGaps), a
    // helpful powerup, at most one every helpEvery pieces. dangerRows: built this close to the
    // top, a big powerup. The rest (hard, level6, powerups, pieceMix) replace the same numbers in
    // CONFIG.assist, as God mode's do: fewer giants and sets than God mode, later on, and mostly
    // the easier pieces.
    calm: {
      dropMs: 700, glideMs: 110, idleMs: 20000, idleDropMs: 170,
      helpHeight: 0.45, helpGaps: 12, helpEvery: 8, dangerRows: 7,
      hard: { minDropIndex: 12, firstGiantBetween: [18, 36], softWindowStart: 18, rechargePerDrop: 0.004, cooldownDrops: 30, hardMaxDanger: 0.25 },
      level6: { firstAfter: [25, 45], cooldownDrops: 50, chancePerDrop: 0.04 },
      powerups: { minDropIndex: 6, cooldownDrops: 4, baseChance: 0.08, chancePerDrop: 0.04, maxChance: 0.4 },
      pieceMix: { baseLevelWeight: { 0: 0.14, 1: 0.6, 2: 0.23, 3: 0.03 }, openingLevelWeight: { 0: 0, 1: 0.65, 2: 0.3, 3: 0.05 } },
    },
    // Turbo zen is for watching. Each piece arrives already turned and over the place it's going,
    // and falls quickly into it:
    fallMs: 40,          // the autopilot's pieces fall a row this often (times the pace)...
    lockMs: 100,         // ...and lock this soon after landing (times the pace)
    pieceMs: 650,        // (but each takes this long at least, however short the way down: it starts further up, out of sight)
    restMs: 900,         // after a big clearance, a breath before the next piece
    maxStepsPerFrame: 3, // (so a fast fall stays fast in turbo zen)
    dropMs: 650,         // how fast a piece falls once the player has taken it over (turbo zen)
    // The pace (times fallMs, lockMs and pieceMs): small things, repeats and the pieces that build
    // up the board come down faster; the pieces that bring it all down take their time. And from
    // low (an empty board) to high (a full one), it eases off a little as it nears the top.
    // (high: near the top, in a careful movement, a movement in carefulChance; top: in the rest)
    pace: { small: 0.55, repeat: 0.7, filler: 0.7, key: 2.2, phantom: 0.45, fastest: 0.2, low: 0.6, high: 0.95, top: 0.72, carefulChance: 0.25 },
    // The piece that brings the whole board down (the director marks it) lands, and then there's a
    // dramatic pause before it all goes, for pauseMs (real time, turbo or not): the board glows
    // and sparkles (CONFIG.fx.admire) and the name says "(dramatic pause)". Only for the big ones:
    // minRows full rows, or for a powerup minBlocks blocks gone. demolitionChance: now and then
    // before a demolition of a full board too (if that's big enough).
    dramatic: { minRows: 18, minBlocks: 150, pauseMs: 1500, demolitionChance: 0.3 },
    headroom: 7,         // rows it keeps clear at the top (as it comes)
    dangerRows: 3,       // the player built it up this close to the top: a big powerup comes
    brinkRows: 2,        // ...or the director overdid it (its fills go right up to the brink on purpose)
    powerupChoices: 8,   // powerups it weighs up when it wants one
    rescueKeepRows: 5,   // if anything ever tops out, all but the bottom few rows dissolve
    level6: { headroom: 9, maxStackRows: 3 }, // level 6 sets only start with plenty of room
    captionRow: 3, captionMs: 2600, captionColour: "#d8ccff", // what it's doing, over the board
    // the board full of one awkward thing: what the name says all the way up (how often): its own
    // name, "Oops, all bagpipes!", "bagpipe bagpipe bagpipe!!", "bagpipes bagpipes and more
    // bagpipes", "the strategic reserve of bagpipes"
    oopsNames: { plain: 1, oops: 1.6, thrice: 1, more: 1, reserve: 0.8 },
    wholeWindowCell: 0.8, // turbo zen filling the whole window: its cells this much of the usual size...
    wholeWindowCells: 1000, // ...or bigger on a big screen, to keep to about this many
    // Turbo zen on a big board (at least minCols wide): now and then (chance) the next few pieces
    // come down together, each in columns of its own (margin columns apart), up to one for every
    // colsEach columns (at most `most` at once), up to `stagger` rows apart as they start. They
    // all land before any rows clear.
    flock: { minCols: 22, colsEach: 12, most: 4, chance: 0.6, margin: 1, headroom: 3, stagger: 5,
      tiny: { most: 12, colsEach: 3, chance: 0.85 } }, // (pieces of one or two blocks: a shower of them)
    mosaicChance: 0.45,    // (on a big board) the squares now and then 1 x 1, a mosaic
    // Turbo zen's fills are a few kinds of piece that go together (src/zen.js palettePick): how
    // often no palette (anything goes), how often something else turns up among them (odd), how
    // likely each way of going together is (a colour, a theme, both, a shape, one of the
    // combinations in shapes/combos.js), and how many
    // kinds: the weights for 2, 3, 4, ... up to 15 of them.
    palette: { none: 0.12, odd: 0.04, colour: 1, theme: 1.1, colourTheme: 0.6, shape: 0.7, curated: 0.9,
      kinds: [0.18, 0.24, 0.2, 0.14, 0.05, 0.04, 0.03, 0.03, 0.02, 0.02, 0.02, 0.01, 0.01, 0.01] },
    // ...and the same piece a few times running, to read its name: a mood that wanders up and
    // down (wander, now and then a jump), more of it and longer runs when it's going quickly
    // (pace at most fastPace); the bigger the piece, the shorter (about `blocks` blocks' worth).
    batches: { base: 0.06, fast: 0.6, slow: 0.3, longFast: 7, longSlow: 4, wander: 0.2, jump: 0.03, fastPace: 0.85, blocks: 30 },
    // Bringing the board down (turbo zen) goes on only while it's spectacular: after the first
    // `free` blasts, another only if it takes a big bite at once, minBlocks (on the usual board;
    // on a bigger one, that times its size to the power `grow`) and minShare of what's there
    // (and only if the last one did); otherwise the rest stays and the next movement builds on it.
    demolish: { free: 1, minBlocks: 30, grow: 0.8, minShare: 0.22 },
    // ...and the most spectacular of all, one of the tallest pieces dropping into the column a
    // fill kept clear and taking every row at once, is this likely when one of the movements that
    // needs a clean board is waiting
    keyWhenWaiting: 0.9,
    // (after a crack, the pacmen or the leaky taps eating rows: this many, and then the rest
    // comes down in big bites)
    sealWith: 6,
    // ...or else one of the biggest destroyers (`size` cells at least) that would take `most` of
    // what's there at once
    sweep: { size: 90, most: 0.6 },
    // On the way up (a fill), beds for one big or strange piece each (of minBlocks blocks at
    // least), patches of tiles, and Expanderz filling what they can of the gaps (grows): how
    // likely none, one, two or three of them (beds; patches; grows), above `belowTop` rows from
    // the top and with `headroom` rows over them.
    extras: { beds: [0.3, 0.4, 0.22, 0.08], patches: [0.4, 0.4, 0.2], grows: [0.45, 0.35, 0.2], belowTop: 6, headroom: 4, minCols: 0, minBlocks: 6 },
    // Now and then (chance, each piece of a fill; half that in a board of one family; never in
    // "Oops, all..."), something else altogether: one of the pieces turbo zen hardly uses, up to
    // maxDifficulty, the less it has been used since the page was loaded the likelier (to the
    // power `power`), for the rest to work round. And in a planned fill (planChance of them),
    // perPlan of them, each going in once, wherever it fits, at perAnchor of the places it might.
    // (Turbo zen.)
    // freshness: whatever it picks from (palettes, families, the planners' pieces), the ones that
    // have come up less since the page was loaded are likelier, to this power.
    strays: { chance: 0.1, maxDifficulty: 5, power: 1.5, headroom: 4, planChance: 0.5, perPlan: 3, perAnchor: 0.25, freshness: 0.5 },
    // Guests in a tiling (turbo zen): how likely none, one, two, or a few (up to `most`) strange
    // pieces (up to maxSize wide and tall) built into the pattern where they fall.
    tileGuests: { counts: [0.45, 0.3, 0.15, 0.1], most: 5, maxSize: 8 },
    // What turbo zen opens with, the first time since the page was loaded (a movement by name,
    // and how it goes), e.g. { turbo: { movement: "crack", opts: { end: "up" } } }: nothing, for now.
    opening: {},
  },

  godMode: {
    hard: {                       // the giants (assist.pieceMix.hard)
      minDropIndex: 1,
      firstGiantBetween: [2, 4],
      softWindowStart: 1,
      softWindowEnd: 400,
      rechargePerDrop: 0.05,      // (7× as fast)
      cooldownDrops: 4,
      hardMaxDanger: 0.5,
      level5FullAllowedDanger: 0.25,
      level5AlmostNeverDanger: 0.5,
    },
    level6: {                     // the level 6 sets (assist.level6)
      firstAfter: [3, 5],
      cooldownDrops: 5,
      chancePerDrop: 0.35,
      maxStackRows: 10,
    },
    powerups: {                   // assist.powerups
      minDropIndex: 1,
      cooldownDrops: 1,
      baseChance: 0.18,
      chancePerDrop: 0.075,
      maxChance: 0.65,
      combos: { minDrop: 0, weight: 1 },
      bad: { minDrop: 0 },
    },
    // gravitizers that collapse at least `minCols` columns are this many times likelier
    wideGravity: { minCols: 6, weight: 4.5 },
    // ...and these are this much as likely as they would be (the large black hole takes
    // everything: it's better for being rarer). Zen's director goes by the same numbers.
    rarer: { large_black_hole: 0.3, tidal_wave: 0.45 },
    // the set God mode opens with, the first time since the page was loaded (of these, the first
    // never seen in this browser, or else any of them), and the pieces that come straight after
    // it (firstBoost times likelier until each has come once)
    firstSet: ["emotions_ascent", "emotions_british", "emotions_online"],
    firstPieces: [],
    // The newest things in the game come first (update this with every new batch), so they can be
    // looked at straight away, and then it's God mode as usual: a new piece is newBoost times
    // likelier until it has turned up newUntilShown times since the page was loaded, a new set
    // newSetBoost times (load the page again to see them all again). Anything never seen in this
    // browser at all comes up unseenBoost times as often. (God mode.)
    newest: {
      sets: ["sunshine", "trees", "great_and_terrible", "space", "emotions_british", "emotions_online", "emotions_ascent", "beans", "spaghetti_os", "townhouses", "space", "trees", "loch_ness", "universe", "loch_ness_wee", "tower_of_babel", "noahs_ark", "dinosaur_bones", "loch_ness_wee", "sky_evening", "sky_sunset", "sky_night", "emotions", "existence", "universe"],
      pieces: [
        "sphinx", "extris", "present_big", "present_wide", "present_tall", "present_long", "present_small", "dinosaur_footprints", "bigfoot_footprints",
        "stop_sign", "dynamite", "umbrella_for_a_fish", "seen_things", "storm_in_a_teacup",
        "microwave_popcorn", "fog_machine", "spreading_cloud", "sun_in_a_cloud",
        "box_of_eggs", "spare_allen_key", "bees_knees", "popcorn",
        "rubiks_cube_checkerboard", "rubiks_cube", "tuning_fork",
        "spam_tin_opened", "beans_tin_on_its_side", "spaghetti_os_tin_upended", "lego_cube_2x2_red", "lego_cube_3x3", "lego_cube_4x4", "lego_slab_2x4", "lego_block_3x2", "lego_cube_2x2_blue",
        "paddling_swan", "candle_both_ends", "wandering_washing_machine", "unwanted_present", "unbothered_capybara", "exasperated_life_ring", "rubber_chicken", "storm_in_a_teacup",
        "sandbag_wall", "avalanche", "tipped_honey_jar", "slumped_beanbag", "unravelling_yarn", "patchwork_quilt", "spilled_paint", "mountain_of_post",
        "tipper_truck", "bath_left_running", "split_rice_sack", "memory_foam_mattress", "week_of_laundry", "thanksgiving_mash",
        "advancing_glacier", "last_jigsaw_piece", "paper_shredder", "medium_black_hole", "small_asteroid", "tablecloth_trick",
        "spaghetti_os", "spam_can", "bull", "china_shop", "bees_knees", "queen_bee",
        "meteor_shower", "tidal_wave", "dragon_with_hay_fever", "giant_eraser", "hole_in_one",
        "horseshoe_magnet", "sarcastic_thumbs_up", "ice_skate", "hole_punch", "lightning_bolt_with_a_grudge", "lit_fuse", "magic_wand", "toadstool",
        "invader_squid_arcade", "invader_crab_neon", "invader_octopus_sticky_notes", "mystery_ship", "invader_squid_neon", "invader_crab_sticky_notes", "invader_octopus_arcade",
        "tile_square_blue", "tile_big_green", "tile_l_terracotta", "tile_t_gold", "tile_s_blue", "tile_lizard_green",
        "a_bee", "two_bees", "bee_line", "queen_bee", "honeycomb", "bees_knees", "bee_bigger_bee", "bee_in_a_bonnet", "cloud_of_bees",
        "storm_cloud", "big_storm_cloud", "rumbling_storm_cloud", "space_invader_2", "space_invader_3", "space_invader_4",
        "happy_pills_2", "piece_of_sky_sunset", "piece_of_sky_night",
        "bull", "camel", "mouse", "elephant_in_the_room", "giant_rubber_duck", "dinosaur_fossil",
        "big_hot_air_balloon", "lighthouse", "double_decker",
        "rubiks_cube", "mondrian", "qr_code", "space_invader", "stuck_pixel",
        "watermelon_slice", "stop_sign", "lego_brick_2x4", "swiss_cheese_lump",
        "caveman_in_ice", "piece_of_sky",
        "kilometerworm", "lightyearworm", "nebula",
        "umbrella_for_a_fish", "anvil_of_feathers", "jar_of_fog", "fossilised_sandwich",
        "piano_full_of_bees",
        "ladder_to_nowhere", "kite_in_a_storm", "flock_of_starlings", "trail_of_footprints", "portrait_of_a_potato",
        "long_red_ribbon",
      ],
    },
    novelty: { newBoost: 25, newSetBoost: 40, newUntilShown: 1, unseenBoost: 2.5, firstBoost: 1e6 },
    // Sets being shown off (for trying them out): they come round whenever they like, not waiting
    // for every other set to have had its turn (just never twice running), `weight` times as
    // likely. Empty it when they've been seen enough.
    featured: { sets: ["townhouses"], weight: 10 },
    // calm spells: after a level 6 set (afterSet), or `giants` giants within `within` pieces
    // (afterGiants), this many ordinary pieces: no giants, no sets
    calm: { afterSet: [8, 14], giants: 2, within: 8, afterGiants: [6, 10] },
    helpPower: 1.25,                 // always prefer the more helpful powerups (as when struggling)
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

  // Paused, the board stays in view: tap a piece for its card, pinch (or the wheel) to zoom in,
  // drag to look around. maxZoom: how far in it goes.
  pause: { hideShapes: false, pauseWhenHidden: true, maxZoom: 5 },

  // How rare a piece is, in words, on its card (src/rarity.js): by its rough chance of turning
  // up, the commonest 13% of the pieces are "common", the next ones up to 39% "fairly common", and
  // so on (spread as they come out in play). share: the giants' and the powerups' rough shares of
  // all the pieces.
  rarity: {
    share: { giants: 0.05, powerups: 0.14 },
    words: [[0.13, "common"], [0.39, "fairly common"], [0.63, "uncommon"], [0.81, "rare"], [0.935, "very rare"], [1.01, "extremely rare"]],
  },

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
    // Threads (shapes/threads.js, src/threads.js): pieces share loose themes, and often the next
    // piece follows one from the last piece or two, so they come in drifting, poetic runs, with
    // plenty of plain randomness between.
    threads: {
      enabled: true,
      follow: 0.8,        // how often a pick follows a thread at all
      lookBack: 0.25,     // ...from the piece before last, rather than the last
      stay: 0.6,          // ...staying on the same thread as last time, if it can
      formalChance: 0.45, // how often a colour or shape thread is followed, against a theme (1)
      weight: 18,         // a piece on the thread is this many times likelier
      formalWeight: 4,    // ...on a colour or shape thread
      setWeight: 3,       // a level 6 set on the thread
      bigThread: 40,      // threads bigger than this pull less hard on each of their pieces
      fatigue: 0.8,       // ...and a thread pulls less on pieces it's brought already this game
      maxRun: 7,          // ...and after this many picks in a row that followed one, a plain random one
      powerups: true,     // powerups follow threads too
      powerupWeight: 40,  // ...this many times likelier (their weight is mostly how much they'd help)
    },

    openingNoLevel0UntilDrop: 17, // no level-0 (tiny) pieces in the first 17 drops

    // The start of a game (a mode with `warmup`) plays nicely, not much harder than Tetris: for
    // the first `fullUntil` pieces, fading out by `goneBy`, the levels lean to `levelWeight`, and
    // each piece is picked `draws` times over the usual way, and then one of those that would sit
    // well on the board as it is: a piece that couldn't help leaving n gaps under itself is
    // (1 + n)^-strength as likely (src/selection.js pickFitting). The giants still come (the
    // first while it's still funny), but ones that fit; a level 6 set only now and then
    // (`sets`: this much of the time it would have, at the start).
    warmup: { fullUntil: 25, goneBy: 90, strength: 2.5, draws: 8, sets: 0.1, levelWeight: { 0: 0.08, 1: 0.6, 2: 0.27, 3: 0.05 } },
    // ...and later on (a mode with `warmup`), from piece `from` to piece `by`, the mix opens up a
    // little at a time, towards something like God mode's: the levels lean to `levelWeight`, the
    // giants come `hardRate` times as often and the level 6 sets `setRate` times (src/pacing.js).
    later: { from: 90, by: 300, levelWeight: { 0: 0.1, 1: 0.38, 2: 0.32, 3: 0.2 }, hardRate: 2.5, setRate: 2 },

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
      // Links that lead round and round (each tile to the others of its shape): after this many
      // in a row of them, the link isn't followed.
      linkRun: 4,
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
      unlockAbove: 9,           // the stack has to have been taller than this many rows...
      unlockBackTo: 6,          // ...and then come back down to this many rows or fewer
      persist: false,           // true = once unlocked, stay unlocked in later games too
                                //        (remembered in this browser)
      firstAfter: [2, 5],       // the first group arrives this many pieces after the unlock
      chancePerDrop: 0.07,      // after that: the chance a group starts on any given piece...
      cooldownDrops: 20,        // ...once this many pieces have passed since the last group...
      maxStackRows: 10,         // ...and only while the stack is this many rows tall or less
      afterClass: "gravity",    // (where powerups come in one class at a time: not before the
                                // gravitizers have been met, which tidy up after a set)
      // A group only starts if the board has room for all of it: its blocks spread over the
      // width × roomFactor (for the gaps they leave), with `headroom` rows to spare at the top.
      // (Three townhouses in a row need about 15 rows.)
      roomFactor: 1.25,
      headroom: 3,
      // No set comes round again until every other one has had its turn this game, and the last
      // `rememberRecent` sets served (also in the previous game, in this browser) wait if any
      // other set can go.
      rememberRecent: 2,
      // Sets of a kind (`families`: the tins): one soon after another is unlikely. A set with one
      // of its family among the last `familyGap` sets served (this game or the one before) is
      // only `familyWeight` times as likely as it would be.
      families: [["spam", "beans", "spaghetti_os"]],
      familyGap: 3,
      familyWeight: 0.08,
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
      // never served (combos with a part of these types are off too, unless that part is taken
      // out of combos: stripFromCombos, and then the combo does the rest). Phantoms are out for
      // now: the phantoms themselves never come, and combos come without their phantom part.
      disabledTypes: ["blast", "goo", "phantom"],
      stripFromCombos: ["phantom"],

      // Powerups are introduced class by class (each class with an intro screen). Once a
      // class is in, every powerup of that class can turn up.
      progression: {
        enabled: true,
        // the first class is picked at random from these (the simpler ones), so every
        // game starts differently
        firstClassPool: ["destroyer", "gravity", "expander"],
        // one of the first two classes is always this one (if the first wasn't it, the second);
        // then the combos of those two, and only then (combosBeforeThird) the third class, or
        // after comboWaitDrops pieces anyway
        early: "gravity", combosBeforeThird: true, comboWaitDrops: 90,
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
        unusableWeight: 0.02,    // 0 = never serve an unusable powerup, 1 = no bias
        // ...and the more it could do right now, the likelier: one that would only help a block
        // or two is picked this much as often (`littleWeight`), rising to full weight for one
        // that helps `goodUseful` blocks or more
        goodUseful: 6,
        littleWeight: 0.35,
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

      // Variety: no long runs of one class. Each of the last `last` powerups that was of the
      // same class makes another one of it this much less likely.
      classVariety: { last: 2, weight: 0.4 },

      // After a level 6 set: the next few pieces are very likely a powerup, and the big
      // destroyers (two rows or more, a wide area, several columns; never the bad ones) are the
      // ones to pick, to clear up after it.
      afterSet: {
        pieces: 4,          // for this many pieces after a set...
        chance: 0.75,       // ...each one is a powerup at least this often
        bigDestroyer: { minCells: 24, weight: 10 }, // destroyers that wipe at least this many
                                                     // cells are this many times likelier
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

    // The dramatic pause (CONFIG.zen.dramatic): the whole board glows, in its own colours, gently
    // pulsing in a slow wave across it (glow: how bright), and sparkles twinkle up out of it, the
    // colours of the pieces they come from (perSec a second, real time; lifeMs; size in px).
    admire: { glow: 0.34, perSec: 150, lifeMs: [450, 1100], size: [2, 4.5] },

    // Rows going: a band of light sweeps along each row, and the row scatters as it passes
    // (game.js rowClearShow, render.js drawRowClears). One family of looks, more of it the more
    // rows go at once: each tier from `rows` rows. patterns: which way the light goes, one at
    // random ("ltr", "rtl", "centre": from the middle out, "edges": from both ends in, "weave":
    // every other row the other way); rowStaggerMs: each row up starts this much later; band: its height (cells); glow,
    // chroma (cyan and magenta fringes), rainbow, ripples (lines running up and down the board),
    // sparks (per cell), wash (a rainbow over the whole board), speed (how hard it scatters),
    // trauma (a shake).
    rowClear: {
      tiers: [
        { rows: 1, patterns: ["ltr", "rtl"], sweepMs: 190, fadeMs: 180, band: 0.6, glow: 2, speed: 1 },
        { rows: 2, patterns: ["centre", "edges"], sweepMs: 190, fadeMs: 200, rowStaggerMs: 22, band: 0.9, glow: 4, chroma: true, speed: 1.15 },
        { rows: 4, patterns: ["centre", "ltr", "rtl"], sweepMs: 200, fadeMs: 250, rowStaggerMs: 26, band: 1, glow: 9, chroma: true, ripples: 1, rippleMs: 340, sparks: 1, speed: 1.3, trauma: 0.22 },
        { rows: 7, patterns: ["weave", "centre"], sweepMs: 230, fadeMs: 320, rowStaggerMs: 30, band: 1, glow: 13, chroma: true, rainbow: true, ripples: 2, rippleMs: 440, sparks: 1, speed: 1.45, trauma: 0.38 },
        { rows: 13, patterns: ["centre", "weave"], sweepMs: 260, fadeMs: 420, rowStaggerMs: 32, band: 1, glow: 17, chroma: true, rainbow: true, ripples: 3, rippleMs: 560, sparks: 2, wash: true, speed: 1.6, trauma: 0.55 },
      ],
    },

    // Big text that pops up over the board ("DOUBLE!", "+24 BLOCKS").
    callouts: {
      enabled: true,
      durationMs: 1100,
      // rows cleared at once, all the way up to the whole board
      multiRow: {
        2: "double!", 3: "triple!", 4: "quadruple!", 5: "quintuple!!", 6: "sextuple!!!",
        7: "septuple!!!", 8: "octuple!!!", 9: "nonuple!!!", 10: "decuple!!!!",
        11: "undecuple!!!!", 12: "duodecuple!!!!", 13: "tredecuple!!!!", 14: "quattuordecuple!!!!",
        15: "quindecuple!!!!", 16: "sexdecuple!!!!", 17: "septendecuple!!!!", 18: "octodecuple!!!!",
        19: "novemdecuple!!!!", 20: "vigintuple!!!!!", 21: "unvigintuple!!!!!", 22: "duovigintuple!!!!!",
        23: "trevigintuple!!!!!", 24: "quattuorvigintuple!!!!!",
      },
      powerupBlocksMin: 8, // show "+N" when a powerup destroys/moves/fills at least this many
    },

    // Big pieces shake the board when they land: giants (difficulty 4–6) with at least
    // `minBlocks` blocks (small ones in a level 6 set, like two kangaroos, don't), and the
    // bigger the piece, the bigger the thud. Pieces with noShake never shake; pieces with
    // `shake` always do (a small boulder), with the smallest thud.
    largePieceLock: {
      quakePerCell: 0.03,
      minDifficulty: 4,
      minBlocks: 13,
      // the least shake it makes (0-1; the board moves up to quake.maxOffsetPx × trauma²):
      // `small` at minBlocks, rising to `big` at bigBlocks blocks or more
      trauma: { small: 0.48, big: 0.82, bigBlocks: 60 },
    },

    powerup: {
      // Locked powerup glows for this long before it fires.
      chargeMs: 260,

      // Destroyer: how much the board shakes when it goes, per block
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

      // The show when a powerup fires (game.js planShow, render.js drawShow): each class has
      // its own, and the more blocks it changes, the bigger it is. From bigFrom blocks (full
      // size at bigAt) it holds the moment: a freeze, a punch of the board, all a little
      // slower, and a moment longer to take it in.
      show: {
        bigFrom: 10, bigAt: 48,
        holdMs: 150,        // the freeze, at full size
        punch: 0.05,        // how far the board zooms in, at full size
        slowdown: 0.5,      // it all plays this much slower, at full size
        extraMs: 380,       // and leaves this long to take it in, at full size
        minSettleMs: 140,
        tailMs: 500,        // (rings and glows fade out after play carries on)
        fadeMs: 170,        // a vanishing powerup fades out
        comboOverlap: 0.72, // a combo's next part starts when the one before is this far through
        finaleLead: 120,    // and its rainbow comes this long before the end
        destroy: { pullMs: 150, msPerSqrtCell: 52, jitterMs: 60, popMs: 260, maxEmbers: 180 },
        gravity: { trembleMs: 230, trembleFrom: 6, squashMs: 150 },
        phantom: { ms: 380 },
      },

      // Highlighted cells overlay.
      // Each class has its own colours, a gradient that shimmers back and forth within them, so
      // they're easy to tell apart at a glance (combos show each part in its own colours).
      // hues: [from, to] in degrees (going round the colour wheel), sat/light in %.
      classColours: {
        destroyer: { hues: [350, 45], sat: 100, light: 58 },   // Dissolverz: fire
        gravity:   { hues: [215, 275], sat: 95, light: 62 },   // Gravitizerz: deep blue-violet
        expander:  { hues: [80, 165], sat: 90, light: 55 },    // Expanderz: lime to teal
        phantom:   { hues: [175, 290], sat: 55, light: 80 },   // Phantomz: pale and ghostly
        blast:     { hues: [20, 50], sat: 100, light: 60 },
      },
      overlay: {
        periodMs: 900,           // one loop of the square / line animation
        hueDegPerMs: 0.12,       // colour shimmer speed (rainbow for anything without classColours)
        hueStepPerCell: 18,      // colour spread across cells
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
