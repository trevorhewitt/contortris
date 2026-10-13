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
 *   room: 16,                       optional: rows of free board it needs before it can start
 *                                   (default: worked out from its pieces, as if placed well;
 *                                   set it to say otherwise: higher for a set that's awkward to
 *                                   place, lower for one that fits together better than that)
 *   unique: true,                   optional: no piece twice in one run, whichever steps it's in
 *   versions: [ [step, ...], ... ], optional, in place of `sequence`: the set in several versions
 *                                   (the same tower lush, unfinished or crumbling); each time it
 *                                   comes, one of them, never the one it had last time
 *   sequence: [ step, step, ... ],  the pieces, in order. A step is either:
 *     "piece_id"                      that piece, or
 *     { pick: ["id", "id", ...],      a run of pieces picked at random from the list:
 *       weights: [3, 1, ...],         optional, how likely each one is (default all 1)
 *       count: [2, 5],                how many (a random number from 2 to 5; or just 3)
 *       unique: true }                optional: each piece at most once in the run
 *     { variant: ["id", "id", "id"] } one of these, chosen once a game: the same piece drawn
 *                                     several ways (a player sees another next game)
 *     { repeat: ["id", "id"],         now and then (chance, default always) one of these, again
 *       times: [3, 5], chance: 0.3 }    and again (that many times), now and then as its echo
 *     { chain: {                      a run where each piece picks the next one:
 *         start: { id: 3, id: 1 },      the first (weights),
 *         after: { id: { id: 2, stop: 1 }, ... },  what can follow each piece ("stop" ends it)
 *         min: 2, max: 4 } }            at least (default 1) and at most this many
 *
 * A piece with `echo: "other_id"` in its data comes back later in the same run as that piece
 * (déjà vu), never as the run's last piece if there's room before it; only the first such
 * piece in a run does. A piece with `nameAgain` goes by that
 * name when it comes straight after itself ("another raindrop").
 * }
 *
 * A group's fixed ("piece_id") pieces can be ones that otherwise only come linked after
 * another (frequency 0, like the large piece of the sky); picks leave frequency 0 pieces out.
 *
 * A piece can also have `remix` (see main_shapes.js): it is rebuilt at random each time it
 * arrives, e.g. scrambled spam, or er berger flerg de schnerzgerberz.
 */

export const GROUPS = [
  {
    id: "tower_of_babel",
    name: "the Tower of Babel",
    frequency: 1,
    // (the same tower at different moments: as it was, overgrown with hanging gardens, still
    // being built, and fallen into ruin)
    versions: [
      ["babel_lower", "babel_middle", "babel_top"],
      ["babel_lush_lower", "babel_lush_middle", "babel_lush_top"],
      ["babel_unfinished_lower", "babel_unfinished_middle", "babel_unfinished_top"],
      ["babel_ruin_lower", "babel_ruin_middle", "babel_ruin_top"],
    ],
  },
  {
    id: "spam",
    name: "spam",
    frequency: 1,
    sequence: [
      // (the first can is the one that turns up on its own now and then: spam_can)
      "spam_can",
      "spam",
      // then two to five more, at random: each one picks the next ("Sp" is usually followed by
      // "am!", the other half of the same can)
      { chain: {
        start: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6 },
        after: {
          spam: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
          spam_spam_and_spam: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
          spm: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
          scrambled_spam: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
          mini_spam: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
          mini_spams: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
          giant_spam: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
          maps: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
          spaaaaaaaam: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
          spergegam: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
          sp_m: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
          sp: { am: 12, spam: 1, spm: 0.5, stop: 1.5 },
          am: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
          spam_spam_spam_spam_and_spa: { spam: 3, spam_spam_and_spam: 1.2, spm: 1, scrambled_spam: 1, mini_spam: 1, mini_spams: 1, giant_spam: 0.8, maps: 1, spaaaaaaaam: 1, spergegam: 0.8, sp_m: 1, sp: 0.9, am: 0.5, spam_spam_spam_spam_and_spa: 0.6, stop: 4.5 },
        },
        min: 2, max: 5,
      } },
    ],
  },
  {
    id: "townhouses",
    name: "the townhouses",
    frequency: 1,
    versions: [
      ["townhouses", "schnauzers", "schnerzgerberz", "hergrr"],
      ["canal_houses", "candle_mouses", "kerndl_merzerz", "cherm_mrrz"],
      ["royal_crescent", "royal_croissant", "rerl_crerssernt", "crrs_brf"],
    ],
  },
  {
    // the trash fits on the mountain: drop both upright in the same place
    id: "everest",
    name: "Mt Everest",
    frequency: 1,
    room: 16, // (the trash is awkward to build on)
    sequence: [
      "everest",
      // (each heap of trash is one of two, at random)
      { pick: ["everest_trash", "everest_trash_2"], count: 1 },
      { pick: ["everest_more_trash", "everest_more_trash_2"], count: 1 },
      { pick: ["everest_even_more_trash", "everest_even_more_trash_2"], count: 1 },
    ],
  },
  {
    id: "space",
    name: "space",
    frequency: 1,
    sequence: [
      {pick: ["moon", "harvest_moon", "blue_moon"], weights: [1, 1, 0.35], count: 1},
      {pick: ["earth", "mars", "saturn"], count: 1},
      {pick: ["asteroid_belt", "voyager_1"], count: 1},
    ],
  },
  {
    id: "loch_ness",
    name: "the Loch Ness monster",
    frequency: 1,
    sequence: [
      { chain: {
          start: {nessie_hump: 4, nessie_hump_far: 1.2, nessie_log: 1},
          after: {
            nessie_hump: {nessie_hump_2: 4, nessie_log: 1, nessie_hump_far: 1, nessie_hump_close: 1, nessie_head: 1.5, nessie_absence: 0.5},
            nessie_hump_far: {nessie_hump_2: 2, nessie_hump_close: 1.5, nessie_head: 1, nessie_absence: 0.4},
            nessie_log: {nessie_hump_2: 2, nessie_hump_close: 1, nessie_head: 1.2, nessie_absence: 0.5},
            nessie_hump_2: {nessie_hump_3: 3, nessie_head: 2, nessie_absence: 0.7},
            nessie_hump_3: {nessie_head: 3, nessie_absence: 1.2, nessie_photo: 0.5, nessie_boat: 0.3, nessie_sonar: 0.3},
            nessie_hump_close: {nessie_head: 3, nessie_absence: 1.2, nessie_photo: 0.5, nessie_boat: 0.3, nessie_sonar: 0.3},
            nessie_head: {nessie_photo: 4, nessie_boat: 1, nessie_sonar: 1, stop: 2.2},
            nessie_absence: {nessie_photo: 3, nessie_boat: 1, nessie_sonar: 1.5, stop: 1},
            nessie_boat: {nessie_photo: 1, stop: 3},
            nessie_photo: {stop: 1},
            nessie_sonar: {stop: 1},
          },
          min: 2, max: 6,
      } },
    ],
  },
  {
    id: "loch_ness_wee",
    name: "a wee Loch Ness monster",
    frequency: 0.6,
    sequence: [
      { chain: {
          start: {nessie_wee_hump: 3, nessie_wee_log: 1},
          after: {
            nessie_wee_hump: {nessie_wee_hump_2: 3, nessie_wee_log: 1, nessie_wee_head: 1.5, nessie_wee_absence: 0.6},
            nessie_wee_log: {nessie_wee_hump_2: 2, nessie_wee_head: 1.5, nessie_wee_absence: 0.6},
            nessie_wee_hump_2: {nessie_wee_head: 3, nessie_wee_absence: 1.2, nessie_wee_photo: 0.4, nessie_wee_boat: 0.4},
            nessie_wee_head: {nessie_wee_photo: 3, nessie_wee_boat: 1, stop: 2},
            nessie_wee_absence: {nessie_wee_photo: 2, nessie_wee_boat: 1, stop: 1},
            nessie_wee_boat: {nessie_wee_photo: 1, stop: 3},
            nessie_wee_photo: {stop: 1},
          },
          min: 2, max: 5,
      } },
    ],
  },
  {
    // one dinosaur's bones, then its head (which dinosaur? you'll see)
    id: "dinosaur_bones",
    name: "dinosaur bones",
    frequency: 1,
    sequence: [
      { chain: {
        start: { bones_trex_1: 1, bones_tri_1: 1, bones_stego_1: 1, bones_brachio_1: 1 },
        after: {
          bones_trex_1: { bones_trex_2: 1 },
          bones_trex_2: { bones_trex_3: 1 },
          bones_trex_3: { bones_trex_head: 1 },
          bones_tri_1: { bones_tri_2: 1 },
          bones_tri_2: { bones_tri_3: 1 },
          bones_tri_3: { bones_tri_head: 1 },
          bones_stego_1: { bones_stego_2: 1 },
          bones_stego_2: { bones_stego_3: 1 },
          bones_stego_3: { bones_stego_head: 1 },
          bones_brachio_1: { bones_brachio_2: 1 },
          bones_brachio_2: { bones_brachio_3: 1 },
          bones_brachio_3: { bones_brachio_head: 1 },
        },
        min: 4, max: 4,
      } },
    ],
  },
  {
    id: "noahs_ark",
    name: "Noah's ark",
    frequency: 1,
    sequence: [
      "noahs_ark",
      { pick: ["two_giraffes","two_elephants","two_penguins","two_snails","two_crocodiles","two_zebras","two_lions","two_kangaroos","two_flamingos","two_hippos","two_pandas","two_owls","two_frogs","two_tortoises","two_sheep","two_hedgehogs","two_octopuses","two_fish"], count: [3, 4], unique: true },
      { pick: ["just_one_unicorn","just_one_dinosaur","just_one_dodo","just_one_mammoth","just_one_griffin","dragons_both_dudes"], count: 1 },
      // the rain: each drop decides what comes next (or, now and then, the storm clouds gather
      // instead), then the downpour, one of three
      {
        chain: {
          start: { drizzle: 2, raindrop: 3, storm_cloud: 2 },
          after: {
            drizzle: { raindrop: 3, drizzle: 1, stop: 1 },
            raindrop: { raindrop: 3, big_raindrop: 2, stop: 2 },
            big_raindrop: { big_raindrop: 1, raindrop: 1, stop: 3 },
            storm_cloud: { storm_cloud: 2, big_storm_cloud: 1.5, rumbling_storm_cloud: 1.2, stop: 1.5 },
            big_storm_cloud: { storm_cloud: 1, rumbling_storm_cloud: 1, stop: 2 },
            rumbling_storm_cloud: { storm_cloud: 1, big_storm_cloud: 0.5, stop: 2 },
          },
          max: 4,
        },
      },
      { pick: ["forty_days_of_rain", "forty_days_of_rain_2", "forty_days_of_rain_3"], weights: [2, 1, 1], count: 1 },
    ],
  },
  {
    // Existence: a rough progression from the physical, to the abstract, to consciousness, to
    // what we know and don't, to life, and on to the end of everything. At each stage, one thing
    // at random (each as likely as the others), in one of its versions: some are the same
    // outline painted a few ways, some another shape altogether. And now and then, questions
    // (or doubt) along the way.
    id: "existence",
    name: "existence, from the universe to nothingness",
    frequency: 1,
    room: 18, // (it piles to 13–19 rows: the estimate, 19 for most runs, doesn't see how its pieces fit together)
    unique: true,
    sequence: [
      { pick: ["existence_universe_1", "existence_universe_2", "existence_universe_3", "existence_universe_4", "existence_reality_a", "existence_reality_b", "existence_observable_a", "existence_observable_b"],
        weights: [1/6, 1/6, 1/6, 1/2, 1/2, 1/2, 1/2, 1/2], count: 1 }, // the physical
      { pick: ["existence_multiverse_1", "existence_multiverse_2", "existence_multiverse_3", "existence_multiverse_4", "existence_time_a", "existence_time_b", "existence_concept_1", "existence_concept_2", "existence_concept_3", "existence_concept_4"],
        weights: [1/6, 1/6, 1/6, 1/2, 1/2, 1/2, 1/6, 1/6, 1/6, 1/2], count: 1 },
      { pick: ["existence_abstract_a", "existence_abstract_b", "existence_consciousness_1", "existence_consciousness_2", "existence_consciousness_3", "existence_consciousness_4", "existence_soul_a", "existence_soul_b"],
        weights: [1/2, 1/2, 1/6, 1/6, 1/6, 1/2, 1/2, 1/2], count: 1 }, // the abstract, and the mind (the soul is tiny)
      { pick: ["existence_knowledge_a", "existence_knowledge_b", "existence_ignorance_a", "existence_ignorance_b"],
        weights: [1/2, 1/2, 1/2, 1/2], count: 1 },
      { pick: ["existence_questions_a", "existence_questions_b", "existence_doubt_1", "existence_doubt_2", "existence_doubt_3"],
        weights: [1/2, 1/2, 1/3, 1/3, 1/3], count: [0, 1] }, // (sometimes)
      { pick: ["existence_life_a", "existence_life_b", "existence_choices_a", "existence_choices_b", "existence_wisdom_a", "existence_wisdom_b"],
        weights: [1/2, 1/2, 1/2, 1/2, 1/2, 1/2], count: 1 },
      { pick: ["existence_death_a", "existence_death_b", "existence_void_a", "existence_void_b", "existence_nothingness_a", "existence_nothingness_b", "existence_terror_1", "existence_terror_2", "existence_terror_3"],
        weights: [1/2, 1/2, 1/2, 1/2, 1/2, 1/2, 1/3, 1/3, 1/3], count: 1 }, // and the end of it all
    ],
  },
  {
    // banished (frequency 0), kept as an easter egg
    id: "portraits",
    name: "two portraits",
    frequency: 0,
    sequence: ["portrait_claude", "portrait_trevor"],
  },
  {
    id: "universe",
    name: "the stars",
    frequency: 1,
    sequence: [
      { chain: {
          start: {shooting_star: 3.5, comet: 2.2, pulsar: 1.8},
          after: {
            shooting_star: {comet: 1.6, pulsar: 1.4, constellation: 3.5, supernova: 1.2, wormhole: 1.2, spiral_galaxy: 1.2},
            comet: {constellation: 2.2, supernova: 2, wormhole: 1.8, spiral_galaxy: 1.4},
            pulsar: {supernova: 2, wormhole: 2},
            constellation: {wormhole: 1.2, spiral_galaxy: 4, nebula: 1.8, quasar: 1.8},
            supernova: {nebula: 1, quasar: 1},
            wormhole: {nebula: 1, quasar: 1.1},
            spiral_galaxy: {nebula: 2, quasar: 1, stop: 1.8},
            nebula: {stop: 1},
            quasar: {stop: 1},
          },
          min: 3, max: 4,
      } },
    ],
  },
  {
    id: "trees",
    name: "the tree of life and the tree of death",
    frequency: 1,
    versions: [
      ["tree_of_life", "tree_of_death"],
      ["tree_of_death", "tree_of_life"],
      ["tree_of_life", {pick: ["tree_of_mild_inconvenience", "tree_of_knowing_keys"], count: 1}, "tree_of_death"],
      [{pick: ["tree_of_life", "tree_of_death"], count: 1}, {pick: ["tree_of_mild_inconvenience", "tree_of_knowing_keys"], count: 1}],
      [{pick: ["tree_of_life_winter", "tree_of_death_winter"], count: 2, unique: true}],
    ],
  },
  {
    id: "emotions",
    name: "an emotions chart",
    frequency: 1,
    // a loose run from the ordinary to the strange: it opens on two to four ordinary ones, drifts
    // through the oddly specific and the intense to the ones that don't exist and the ones about
    // the game, and ends on the most absurd (or, now and then, on a plain one). No card twice
    // (déjà vu and the like come back once, by `echo`, never last; or else, now and then, déjà vu
    // or memory loss ends it, over and over).
    unique: true,
    sequence: [
      // the opening: two to four of the ordinary ones, before it starts getting strange
      { pick: ["emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy"],
        count: [2, 4], unique: true },
      // then
      { pick: ["emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella", "emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy", "emotion_deja_vu", "emotion_memory_loss", "emotion_spooky_coincidence", "emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror"],
        weights: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 1, 1, 1, 0.8, 0.8, 0.8, 0.8], count: [0, 1] },
      // stranger
      { pick: ["emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror", "emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_deja_vu", "emotion_memory_loss", "emotion_spooky_coincidence", "emotion_inner_emptiness", "emotion_playing_extris", "emotion_winning_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling", "emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella"],
        weights: [2, 2, 2, 2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1, 1, 1, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], count: [1, 2] },
      // stranger still
      { pick: ["emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_inner_emptiness", "emotion_playing_extris", "emotion_winning_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling"],
        weights: [2, 2, 2, 2, 2, 2, 2, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5], count: [0, 2] },
      // and the last
      { pick: ["emotion_existential_dread", "emotion_winning_extris", "emotion_inner_emptiness", "emotion_being_a_piece", "emotion_playing_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_row_grief", "emotion_fear_of_ceiling", "emotion_utter_euphoria", "emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy"],
        weights: [3, 3, 3, 3, 2.5, 2.5, 2.5, 2.5, 2.5, 2, 1, 1, 1, 1, 1, 1, 1, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35], count: 1 },
      // ...and now and then, after that, déjà vu or memory loss, again, and again, and again
      { repeat: ["emotion_deja_vu", "emotion_memory_loss"], times: [3, 5], chance: 0.3 },
    ],
  },
  {
    id: "sunshine",
    name: "sunshine, rainbows and butterflies",
    frequency: 1,
    sequence: ["sunshine", { pick: ["rainbow","double_rainbow"], count: 1 }, { pick: ["happy_cloud"], count: [1,2] }, "butterflies"],
  },
  {
    // (the humongous piece always comes after the other two; mostly by day, sometimes as the
    // evening passes, now and then all sunset, rarest of all all night)
    id: "sky",
    name: "a humongous piece of the sky",
    frequency: 0.32,
    sequence: ["piece_of_sky", "large_piece_of_sky", "humongous_piece_of_sky"],
  },
  {
    id: "sky_evening",
    name: "a humongous piece of the sky, as the evening passes",
    frequency: 0.12,
    sequence: ["piece_of_sky", "large_piece_of_sky_sunset", "humongous_piece_of_sky_night"],
  },
  {
    id: "sky_sunset",
    name: "a humongous piece of the sunset",
    frequency: 0.09,
    sequence: ["piece_of_sky_sunset", "large_piece_of_sky_sunset", "humongous_piece_of_sky_sunset"],
  },
  {
    id: "sky_night",
    name: "a humongous piece of the night sky",
    frequency: 0.05,
    sequence: ["piece_of_sky_night", "large_piece_of_sky_night", "humongous_piece_of_sky_night"],
  },
  {
    id: "beans",
    name: "beans",
    frequency: 1,
    sequence: [
      "beans",
      {pick: ["beans"], count: [0, 1]},
      { chain: {
          start: {beans: 2.2, beans_beans_and_beans: 1.3, giant_beans: 0.8, beeeeeans: 0.8, mini_beans: 0.8, mini_beanses: 0.7, bea: 1, ns: 0.15, a_can_of_bean: 0.8, snaeb: 0.7, slab_of_beans: 0.6, heap_of_beans: 0.25, beans_in_their_sauce: 0.15, bean: 0.2, giant_bean: 0.12},
          after: {
            beans: {beans: 2.4, beeeeeans: 0.9, mini_beans: 1, mini_beanses: 0.9, bea: 1.1, ns: 0.2, a_can_of_bean: 0.9, snaeb: 0.8, slab_of_beans: 1.1, heap_of_beans: 0.7, beans_in_their_sauce: 0.5, bean: 0.5, stop: 2.4},
            beeeeeans: {beans: 2.4, beeeeeans: 0.2, mini_beans: 1, mini_beanses: 0.9, bea: 1.1, ns: 0.2, a_can_of_bean: 0.9, snaeb: 0.8, slab_of_beans: 1.1, heap_of_beans: 0.7, beans_in_their_sauce: 0.2, bean: 0.5, stop: 3.2},
            mini_beans: {beans: 2.4, beeeeeans: 0.9, mini_beans: 1.2, mini_beanses: 1.2, bea: 1.1, ns: 0.2, a_can_of_bean: 0.9, snaeb: 0.8, slab_of_beans: 1.1, heap_of_beans: 0.7, beans_in_their_sauce: 0.5, bean: 0.5, stop: 2.4},
            mini_beanses: {beans: 2.4, beeeeeans: 0.9, mini_beans: 1.2, mini_beanses: 0.3, bea: 1.1, ns: 0.2, a_can_of_bean: 0.9, snaeb: 0.8, slab_of_beans: 1.1, heap_of_beans: 0.7, beans_in_their_sauce: 0.5, bean: 0.5, stop: 2.4},
            bea: {ns: 12, beans: 1, stop: 1.2},
            ns: {beans: 2.4, beeeeeans: 0.9, mini_beans: 1, mini_beanses: 0.9, bea: 1.1, ns: 0.2, a_can_of_bean: 0.9, snaeb: 0.8, slab_of_beans: 1.1, heap_of_beans: 0.7, beans_in_their_sauce: 0.5, bean: 0.5, stop: 2.4},
            a_can_of_bean: {beans: 2.4, beeeeeans: 0.9, mini_beans: 1, mini_beanses: 0.9, bea: 1.1, ns: 0.2, a_can_of_bean: 0.5, snaeb: 0.8, slab_of_beans: 1.1, heap_of_beans: 0.7, beans_in_their_sauce: 0.5, bean: 1.4, stop: 2.6},
            snaeb: {beans: 2.4, beeeeeans: 0.9, mini_beans: 1, mini_beanses: 0.9, bea: 1.1, ns: 0.2, a_can_of_bean: 0.9, snaeb: 0.3, slab_of_beans: 1.1, heap_of_beans: 0.7, beans_in_their_sauce: 0.5, bean: 0.5, stop: 2.4},
            giant_beans: {beans: 1.2, mini_beans: 1.2, mini_beanses: 0.8, a_can_of_bean: 0.5, bea: 0.6, slab_of_beans: 0.8, heap_of_beans: 0.4, bean: 1, stop: 5},
            beans_beans_and_beans: {beans: 1.6, mini_beans: 1.2, mini_beanses: 0.6, a_can_of_bean: 0.8, bea: 0.8, snaeb: 0.5, slab_of_beans: 1, heap_of_beans: 0.5, bean: 0.8, stop: 3.5},
            slab_of_beans: {heap_of_beans: 1.4, beans_in_their_sauce: 1.1, bean: 1.2, slab_of_beans: 0.4, beans: 1, mini_beans: 0.4, snaeb: 0.3, stop: 2.6},
            heap_of_beans: {beans_in_their_sauce: 1.2, bean: 1.6, giant_bean: 0.3, slab_of_beans: 0.3, beans: 0.8, mini_beans: 0.4, stop: 3},
            beans_in_their_sauce: {bean: 2, beans: 1, heap_of_beans: 0.4, a_can_of_bean: 0.5, giant_bean: 0.3, stop: 3.6},
            bean: {bean: 1.6, giant_bean: 0.7, beans: 0.6, mini_beans: 0.5, a_can_of_bean: 0.4, stop: 4},
            giant_bean: {bean: 1.2, beans: 0.8, mini_beans: 0.4, stop: 3.6},
          },
          min: 3, max: 6,
      } },
    ],
  },
  {
    id: "spaghetti_os",
    name: "Spaghetti-Os",
    frequency: 1,
    sequence: [
      "spaghetti_os",
      {pick: ["spaghetti_os"], count: [0, 1]},
      { chain: {
          start: {spaghetti_os: 0.8, spaghetti_os_spaghetti_os_and_spaghetti_os: 1, spaghetti_oooooooos: 0.9, giant_spaghetti_os: 0.8, spill_of_spaghetti_os: 0.8, spaghetti_qs: 1.1, spaghetti_0s: 1.1, mini_spaghetti_os: 0.9, spaghetti_os_left_half: 0.5, spaghetti_os_right_half: 0.12, spgtti_os: 0.9, slab_of_spaghetti_os: 0.7, blob_of_spaghetti_os: 0.3, spaghetti_o: 0.3, ring_of_spaghetti_os: 0.4},
          after: {
            spaghetti_os: {spaghetti_os: 0.5, spaghetti_qs: 1, spaghetti_0s: 1, mini_spaghetti_os: 0.9, spaghetti_os_left_half: 0.55, spaghetti_os_right_half: 0.1, spgtti_os: 0.9, slab_of_spaghetti_os: 1, blob_of_spaghetti_os: 0.6, spaghetti_o: 0.7, ring_of_spaghetti_os: 0.6, stop: 2.3},
            spaghetti_qs: {spaghetti_os: 0.8, spaghetti_0s: 1, mini_spaghetti_os: 0.9, spaghetti_os_left_half: 0.55, spaghetti_os_right_half: 0.1, spgtti_os: 0.9, slab_of_spaghetti_os: 1, blob_of_spaghetti_os: 0.6, spaghetti_o: 0.7, ring_of_spaghetti_os: 0.6, stop: 2.3},
            spaghetti_0s: {spaghetti_os: 0.8, spaghetti_qs: 1, mini_spaghetti_os: 0.9, spaghetti_os_left_half: 0.55, spaghetti_os_right_half: 0.1, spgtti_os: 0.9, slab_of_spaghetti_os: 1, blob_of_spaghetti_os: 0.6, spaghetti_o: 0.7, ring_of_spaghetti_os: 0.6, stop: 2.3},
            mini_spaghetti_os: {spaghetti_os: 0.8, spaghetti_qs: 1, spaghetti_0s: 1, spaghetti_os_left_half: 0.55, spaghetti_os_right_half: 0.1, spgtti_os: 0.9, slab_of_spaghetti_os: 1, blob_of_spaghetti_os: 0.6, spaghetti_o: 0.7, ring_of_spaghetti_os: 0.6, stop: 2.3},
            spgtti_os: {spaghetti_os: 0.8, spaghetti_qs: 1, spaghetti_0s: 1, mini_spaghetti_os: 0.9, spaghetti_os_left_half: 0.55, spaghetti_os_right_half: 0.1, slab_of_spaghetti_os: 1, blob_of_spaghetti_os: 0.6, spaghetti_o: 0.7, ring_of_spaghetti_os: 0.6, stop: 2.3},
            spaghetti_os_right_half: {spaghetti_os: 0.8, spaghetti_qs: 1, spaghetti_0s: 1, mini_spaghetti_os: 0.9, spaghetti_os_left_half: 0.55, spgtti_os: 0.9, slab_of_spaghetti_os: 1, blob_of_spaghetti_os: 0.6, spaghetti_o: 0.7, ring_of_spaghetti_os: 0.6, stop: 2.3},
            giant_spaghetti_os: {spaghetti_os: 0.5, spaghetti_o: 1, mini_spaghetti_os: 0.8, slab_of_spaghetti_os: 0.5, ring_of_spaghetti_os: 0.5, spaghetti_os_left_half: 0.3, spgtti_os: 0.3, stop: 4},
            spaghetti_os_spaghetti_os_and_spaghetti_os: {spaghetti_os: 0.6, spaghetti_qs: 0.8, spaghetti_0s: 0.8, mini_spaghetti_os: 0.6, spaghetti_os_left_half: 0.3, spgtti_os: 0.6, slab_of_spaghetti_os: 0.8, blob_of_spaghetti_os: 0.4, spaghetti_o: 0.6, ring_of_spaghetti_os: 0.5, stop: 3},
            spaghetti_oooooooos: {spaghetti_os: 0.6, spaghetti_qs: 0.8, spaghetti_0s: 0.8, mini_spaghetti_os: 0.6, spaghetti_os_left_half: 0.3, spgtti_os: 0.6, slab_of_spaghetti_os: 0.8, blob_of_spaghetti_os: 0.4, spaghetti_o: 0.6, ring_of_spaghetti_os: 0.5, stop: 2.6},
            spill_of_spaghetti_os: {spaghetti_o: 2, ring_of_spaghetti_os: 0.5, blob_of_spaghetti_os: 0.4, mini_spaghetti_os: 0.3, stop: 2.8},
            spaghetti_os_left_half: {spaghetti_os_right_half: 12, spaghetti_o: 0.6, spaghetti_qs: 0.4, stop: 1},
            slab_of_spaghetti_os: {blob_of_spaghetti_os: 1.2, spaghetti_o: 1, ring_of_spaghetti_os: 0.9, spaghetti_qs: 0.4, spaghetti_0s: 0.4, mini_spaghetti_os: 0.4, spgtti_os: 0.3, spaghetti_os_left_half: 0.3, stop: 2.4},
            blob_of_spaghetti_os: {spaghetti_o: 1.2, ring_of_spaghetti_os: 0.8, spaghetti_qs: 0.4, spaghetti_0s: 0.4, mini_spaghetti_os: 0.4, spgtti_os: 0.3, spaghetti_os_left_half: 0.3, stop: 2.6},
            ring_of_spaghetti_os: {spaghetti_o: 1.1, blob_of_spaghetti_os: 0.8, slab_of_spaghetti_os: 0.6, spaghetti_qs: 0.4, spaghetti_0s: 0.4, mini_spaghetti_os: 0.4, spaghetti_os_left_half: 0.3, stop: 2.4},
            spaghetti_o: {spaghetti_os: 0.3, spaghetti_o: 0.6, ring_of_spaghetti_os: 0.5, blob_of_spaghetti_os: 0.4, slab_of_spaghetti_os: 0.4, spaghetti_qs: 0.4, spaghetti_0s: 0.4, mini_spaghetti_os: 0.4, spaghetti_os_left_half: 0.3, spgtti_os: 0.3, stop: 3.2},
          },
          min: 3, max: 6,
      } },
    ],
  },
  {
    id: "emotions_ascent",
    name: "an emotions chart (ascending)",
    frequency: 0.35,
    unique: true,
    sequence: [
      {pick: ["emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy"], count: [2, 4], unique: true},
      {pick: ["emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella", "emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy", "emotion_deja_vu", "emotion_memory_loss", "emotion_spooky_coincidence", "emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror"], weights: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 1, 1, 1, 0.8, 0.8, 0.8, 0.8], count: [0, 1]},
      {pick: ["emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror", "emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_deja_vu", "emotion_memory_loss", "emotion_spooky_coincidence", "emotion_inner_emptiness", "emotion_playing_extris", "emotion_winning_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling", "emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella"], weights: [2, 2, 2, 2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1, 1, 1, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], count: [1, 2]},
      {pick: ["emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_inner_emptiness", "emotion_playing_extris", "emotion_winning_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling"], weights: [2, 2, 2, 2, 2, 2, 2, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5], count: [0, 2]},
      { chain: {
          start: {emotion_mother_earth: 1, emotion_enlightenment: 1},
          after: {
            emotion_mother_earth: {emotion_enlightenment: 3, emotion_higher_frequency: 2, emotion_one_with_the_board: 1.5, emotion_solving_some_things: 0.7},
            emotion_enlightenment: {emotion_solving_some_things: 2.6, emotion_higher_frequency: 1.8, emotion_one_with_the_board: 1.5},
            emotion_higher_frequency: {emotion_one_with_the_board: 1.5, emotion_solving_some_things: 1.2, emotion_ai_human_singularity: 1.5, emotion_singularity: 1},
            emotion_one_with_the_board: {emotion_solving_some_things: 1, emotion_ai_human_singularity: 1.5, emotion_singularity: 1.5, emotion_void_looking_back: 0.8},
            emotion_solving_some_things: {emotion_ai_human_singularity: 1.5, emotion_singularity: 1.5, emotion_void_looking_back: 1, stop: 0.3},
            emotion_ai_human_singularity: {emotion_singularity: 2, emotion_void_looking_back: 1, emotion_heat_death: 1.5, stop: 0.15},
            emotion_singularity: {emotion_void_looking_back: 1.5, emotion_heat_death: 2.5, stop: 0.15},
            emotion_void_looking_back: {emotion_heat_death: 4, stop: 0.5},
          },
          min: 4, max: 7,
      } },
    ],
  },
  // An emotions chart (for business): the usual opening, then the corporate feelings (synergy,
  // a quick sync, circling back, per my last email...), and usually it ends on stonks; now and
  // then on not stonks.
  {
    id: "emotions_business",
    name: "an emotions chart (for business)",
    frequency: 0.25,
    unique: true,
    sequence: [
      {pick: ["emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy"], count: [2, 4], unique: true},
      {pick: ["emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella", "emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy", "emotion_deja_vu", "emotion_memory_loss", "emotion_spooky_coincidence", "emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror"], weights: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 1, 1, 1, 0.8, 0.8, 0.8, 0.8], count: [0, 1]},
      {pick: ["emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror", "emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_deja_vu", "emotion_memory_loss", "emotion_spooky_coincidence", "emotion_inner_emptiness", "emotion_playing_extris", "emotion_winning_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling", "emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella"], weights: [2, 2, 2, 2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1, 1, 1, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], count: [1, 2]},
      {pick: ["emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_inner_emptiness", "emotion_playing_extris", "emotion_winning_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling"], weights: [2, 2, 2, 2, 2, 2, 2, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5], count: [0, 2]},
      { chain: {
          start: {emotion_synergy: 1.2, emotion_quick_sync: 1},
          after: {
            emotion_synergy: {emotion_quick_sync: 1.1, emotion_circling_back: 1.5, emotion_per_my_last_email: 1},
            emotion_quick_sync: {emotion_circling_back: 1.6, emotion_per_my_last_email: 1.2},
            emotion_circling_back: {emotion_per_my_last_email: 1.3, emotion_quarterly_growth: 1, emotion_pivot: 0.9, emotion_disruption: 0.7},
            emotion_per_my_last_email: {emotion_quarterly_growth: 1, emotion_pivot: 1, emotion_disruption: 0.8},
            emotion_quarterly_growth: {emotion_thought_leadership: 1, emotion_stonks: 1.7, emotion_not_stonks: 0.15},
            emotion_pivot: {emotion_disruption: 0.7, emotion_thought_leadership: 1, emotion_stonks: 1.6, emotion_not_stonks: 0.15},
            emotion_disruption: {emotion_thought_leadership: 1.1, emotion_stonks: 1.8, emotion_not_stonks: 0.2},
            emotion_thought_leadership: {emotion_stonks: 3.6, emotion_not_stonks: 0.4},
            emotion_stonks: {emotion_not_stonks: 0.1, stop: 1},
          },
          min: 4, max: 7,
      } },
    ],
  },
  // An emotions chart (very British): the usual opening, then mustn't grumble, queueing, an
  // unexpected item in the bagging area, quietly seething..., nearly always ending on a nice cup
  // of tea (now and then, on sorry).
  {
    id: "emotions_british",
    name: "an emotions chart (very British)",
    frequency: 0.25,
    unique: true,
    sequence: [
      {pick: ["emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy"], count: [2, 4], unique: true},
      {pick: ["emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella", "emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy", "emotion_deja_vu", "emotion_memory_loss", "emotion_spooky_coincidence", "emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror"], weights: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 1, 1, 1, 0.8, 0.8, 0.8, 0.8], count: [0, 1]},
      {pick: ["emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror", "emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_deja_vu", "emotion_memory_loss", "emotion_spooky_coincidence", "emotion_inner_emptiness", "emotion_playing_extris", "emotion_winning_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling", "emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella"], weights: [2, 2, 2, 2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1, 1, 1, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], count: [1, 2]},
      {pick: ["emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_inner_emptiness", "emotion_playing_extris", "emotion_winning_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling"], weights: [2, 2, 2, 2, 2, 2, 2, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5], count: [0, 2]},
      { chain: {
          start: {emotion_mustnt_grumble: 1.3, emotion_queueing: 1},
          after: {
            emotion_mustnt_grumble: {emotion_queueing: 1.7, emotion_bagging_area: 1, emotion_quietly_seething: 1},
            emotion_queueing: {emotion_bagging_area: 1.4, emotion_quietly_seething: 1.2},
            emotion_bagging_area: {emotion_quietly_seething: 1.7, emotion_last_biscuit: 0.9, emotion_sorry: 0.7},
            emotion_quietly_seething: {emotion_last_biscuit: 1.4, emotion_sorry: 1},
            emotion_last_biscuit: {emotion_sorry: 1.3, emotion_cup_of_tea: 1.5},
            emotion_sorry: {emotion_cup_of_tea: 3, stop: 0.45},
          },
          min: 4, max: 7,
      } },
    ],
  },
  // An emotions chart (online): the usual opening, then buffering, low battery, unread
  // notifications, someone is typing..., nearly always ending on touching grass (now and then,
  // on turning it off and on again).
  {
    id: "emotions_online",
    name: "an emotions chart (online)",
    frequency: 0.25,
    unique: true,
    sequence: [
      {pick: ["emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy"], count: [2, 4], unique: true},
      {pick: ["emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella", "emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy", "emotion_deja_vu", "emotion_memory_loss", "emotion_spooky_coincidence", "emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror"], weights: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 1, 1, 1, 0.8, 0.8, 0.8, 0.8], count: [0, 1]},
      {pick: ["emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror", "emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_deja_vu", "emotion_memory_loss", "emotion_spooky_coincidence", "emotion_inner_emptiness", "emotion_playing_extris", "emotion_winning_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling", "emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella"], weights: [2, 2, 2, 2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1, 1, 1, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], count: [1, 2]},
      {pick: ["emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_inner_emptiness", "emotion_playing_extris", "emotion_winning_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling"], weights: [2, 2, 2, 2, 2, 2, 2, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5], count: [0, 2]},
      { chain: {
          start: {emotion_buffering: 1.2, emotion_unread_notifications: 1},
          after: {
            emotion_buffering: {emotion_unread_notifications: 1.7, emotion_low_battery: 1, emotion_someone_typing: 0.9},
            emotion_unread_notifications: {emotion_low_battery: 1.3, emotion_someone_typing: 1.2},
            emotion_low_battery: {emotion_someone_typing: 1.6, emotion_not_a_robot: 0.9, emotion_off_and_on_again: 0.7},
            emotion_someone_typing: {emotion_not_a_robot: 1.4, emotion_off_and_on_again: 0.9},
            emotion_not_a_robot: {emotion_off_and_on_again: 1.4, emotion_touching_grass: 1.5},
            emotion_off_and_on_again: {emotion_touching_grass: 3, stop: 0.45},
          },
          min: 4, max: 7,
      } },
    ],
  },
];
