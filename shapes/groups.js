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
 *   sequence: [ step, step, ... ],  the pieces, in order. A step is either:
 *     "piece_id"                      that piece, or
 *     { pick: ["id", "id", ...],      a run of pieces picked at random from the list:
 *       weights: [3, 1, ...],         optional, how likely each one is (default all 1)
 *       count: [2, 5],                how many (a random number from 2 to 5; or just 3)
 *       unique: true }                optional: each piece at most once in the run
 *     { variant: ["id", "id", "id"] } one of these, chosen once a game: the same piece drawn
 *                                     several ways (a player sees another next game)
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
    sequence: ["babel_lower", "babel_middle", "babel_top"],
  },
  {
    id: "spam",
    name: "spam",
    frequency: 1,
    sequence: [
      "spam",
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
    sequence: ["townhouses", "schnauzers", "schnerzgerberz", "hergrr"],
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
    sequence: ["moon", "earth", "asteroid_belt"],
  },
  {
    id: "loch_ness",
    name: "the Loch Ness monster",
    frequency: 1,
    sequence: ["nessie_hump", "nessie_hump_2", "nessie_hump_3", "nessie_head", "nessie_photo"],
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
    // each piece is one of three paintings, chosen once a game (see `variant` above)
    id: "existence",
    name: "existence, from the universe to existential terror",
    frequency: 1,
    room: 16, // (it piles to 13 at best: the estimate, 19, doesn't see how its pieces fit together)
    sequence: [
      { variant: ["existence_universe_1", "existence_universe_2", "existence_universe_3"] },
      { variant: ["existence_multiverse_1", "existence_multiverse_2", "existence_multiverse_3"] },
      { variant: ["existence_concept_1", "existence_concept_2", "existence_concept_3"] },
      { variant: ["existence_consciousness_1", "existence_consciousness_2", "existence_consciousness_3"] },
      { variant: ["existence_doubt_1", "existence_doubt_2", "existence_doubt_3"] },
      { variant: ["existence_terror_1", "existence_terror_2", "existence_terror_3"] },
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
    // (the universe itself opens the existence set now)
    sequence: ["shooting_star", "constellation", "spiral_galaxy", "nebula"],
  },
  {
    id: "trees",
    name: "the tree of life and the tree of death",
    frequency: 1,
    sequence: ["tree_of_life", "tree_of_death"],
  },
  {
    id: "emotions",
    name: "an emotions chart",
    frequency: 1,
    // a loose run from the ordinary to the strange: it opens on something ordinary (mostly), drifts
    // through the oddly specific and the intense to the ones that don't exist and the ones about
    // the game, and ends on the most absurd (or, now and then, on a plain one). No card twice
    // (déjà vu and the like come back once, by `echo`, never last).
    unique: true,
    sequence: [
      // the opening
      { pick: ["emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy", "emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella", "emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror"],
        weights: [3, 3, 3, 3, 3, 3, 3, 3, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.4, 0.4, 0.4, 0.4], count: [1, 3] },
      // then
      { pick: ["emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella", "emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy", "emotion_deja_vu", "emotion_memory_loss", "emotion_spooky_coincidence", "emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror"],
        weights: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 1, 1, 1, 0.8, 0.8, 0.8, 0.8], count: [1, 2] },
      // stranger
      { pick: ["emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror", "emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_deja_vu", "emotion_memory_loss", "emotion_spooky_coincidence", "emotion_inner_emptiness", "emotion_playing_extris", "emotion_winning_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling", "emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine", "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella"],
        weights: [2, 2, 2, 2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1, 1, 1, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], count: [1, 2] },
      // stranger still
      { pick: ["emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_inner_emptiness", "emotion_playing_extris", "emotion_winning_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling"],
        weights: [2, 2, 2, 2, 2, 2, 2, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5], count: [0, 2] },
      // and the last
      { pick: ["emotion_existential_dread", "emotion_winning_extris", "emotion_inner_emptiness", "emotion_being_a_piece", "emotion_playing_extris", "emotion_urge_to_rotate", "emotion_long_piece", "emotion_row_grief", "emotion_fear_of_ceiling", "emotion_utter_euphoria", "emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering", "emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy"],
        weights: [3, 3, 3, 3, 2.5, 2.5, 2.5, 2.5, 2.5, 2, 1, 1, 1, 1, 1, 1, 1, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35], count: 1 },
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
];
