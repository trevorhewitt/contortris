/**
 * ESTRIX COMBINATIONS: pieces that look good together, or funny. Turbo zen fills the board with
 * one of these now and then (src/zen.js, the "combo" movement), and its other fills borrow them
 * as palettes. A running list: edit by hand, and add to it.
 *
 * Each one:
 *   id:      a name for it (the dev panel, the tests)
 *   pieces:  the ids, or { id: weight } (weight 1 if not given). Ids that are missing, or
 *            banished, are skipped, and so is a combination left with fewer than two pieces.
 *   sets:    level 6 sets whose pieces all join in (their powerups aside), e.g. ["spam"]
 *   stages:  instead of `pieces`, a progression: lists of ids (or { id: weight }), the board
 *            filling with the first at the bottom, the next above it, and so on up (an emotions
 *            chart getting stranger as it goes); top: the one that goes on the very top, once
 *   label:   what every name card says while it lasts, instead of each piece's own name (or a few
 *            to choose from, one for the whole fill); labelChance: how often (otherwise their own
 *            names; 1 if not given)
 *   upright: the chance that every piece stays the way up it was drawn (a gallery, rather than
 *            an abstract)
 *   weight:  how often it comes up, compared with the others (1 if not given)
 */

// The emotion cards, by how strange they are (shapes/groups.js, the emotions charts).
const PLAIN = ["emotion_happiness", "emotion_sadness", "emotion_anger", "emotion_fear", "emotion_surprise", "emotion_boredom", "emotion_calm", "emotion_jealousy"];
const SPECIFIC = ["emotion_someone_behind_you", "emotion_ear_itch", "emotion_oven", "emotion_nostalgia", "emotion_cold_pillow", "emotion_vending_machine",
  "emotion_missing_step", "emotion_screen_film", "emotion_preemptive_embarrassment", "emotion_umbrella"];
const INTENSE = ["emotion_utter_euphoria", "emotion_existential_dread", "emotion_nails_chalkboard", "emotion_gut_terror"];
const AGAIN = ["emotion_deja_vu", "emotion_deja_vu_2", "emotion_memory_loss", "emotion_memory_loss_2", "emotion_spooky_coincidence", "emotion_spooky_coincidence_2"];
const MADE_UP = ["emotion_forglavedness", "emotion_plorch", "emotion_glumpf", "emotion_wibberance", "emotion_snerk", "emotion_sprongle", "emotion_halvering"];
const THE_GAME = ["emotion_inner_emptiness", "emotion_playing_estrix", "emotion_winning_estrix",
  "emotion_being_a_piece", "emotion_row_grief", "emotion_fear_of_ceiling"];
const BRITISH = ["emotion_mustnt_grumble", "emotion_queueing", "emotion_bagging_area", "emotion_quietly_seething", "emotion_last_biscuit", "emotion_sorry"];
const ONLINE = ["emotion_buffering", "emotion_unread_notifications", "emotion_low_battery", "emotion_someone_typing", "emotion_not_a_robot", "emotion_off_and_on_again"];
const HIGHER = ["emotion_mother_earth", "emotion_enlightenment", "emotion_higher_frequency", "emotion_one_with_the_board", "emotion_solving_some_things"];
const HIGHEST = ["emotion_ai_human_singularity", "emotion_singularity", "emotion_void_looking_back"];

const PAIRS = ["two_giraffes", "two_elephants", "two_penguins", "two_snails", "two_crocodiles", "two_zebras", "two_lions", "two_kangaroos", "two_flamingos",
  "two_hippos", "two_pandas", "two_owls", "two_frogs", "two_tortoises", "two_sheep", "two_hedgehogs", "two_octopuses", "two_fish"];
const JUST_ONE = ["just_one_unicorn", "just_one_dinosaur", "just_one_dodo", "just_one_mammoth", "just_one_griffin", "dragons_both_dudes"];
const BONES = ["bones_trex_1", "bones_trex_2", "bones_trex_3", "bones_trex_head", "bones_tri_1", "bones_tri_2", "bones_tri_3", "bones_tri_head",
  "bones_stego_1", "bones_stego_2", "bones_stego_3", "bones_stego_head", "bones_brachio_1", "bones_brachio_2", "bones_brachio_3", "bones_brachio_head"];
const INVADERS = ["space_invader", "space_invader_2", "space_invader_3", "space_invader_4", "invader_squid_arcade", "invader_crab_arcade", "invader_octopus_arcade",
  "invader_squid_neon", "invader_crab_neon", "invader_octopus_neon", "invader_squid_sticky_notes", "invader_crab_sticky_notes", "invader_octopus_sticky_notes"];
const FLOWERS = ["daisy", "tulip", "dandelion_clock", "poppy", "bluebell", "forget_me_not", "lavender", "snowdrop", "thats"];

export const COMBOS = [
  // the gallery: the Mona Lisa, Nicholas Cage, a portrait of a potato, the queen bee and David
  { id: "portraits", pieces: ["lisa", "nicholas", "portrait_of_a_potato", "queen_bee", "david"], upright: 0.6, weight: 1.4 },
  // a stack of business papers, tv static and two zebras
  { id: "papers_static_zebras", pieces: { importand: 1.2, message: 1.2, two_zebras: 1 }, weight: 1.4 },
  // ...and the same, with everything else that's black and white
  { id: "black_and_white", pieces: { importand: 1, message: 1, two_zebras: 1, two_pandas: 0.7, two_penguins: 0.5, blank_domino: 0.5, qr_code: 0.25 } },
  // the flowers and nothing but the flowers (and now and then a whole bunch of them)
  { id: "flowers", pieces: [...FLOWERS, { bunch_of_roses: 0.12, flowerbed: 0.12 }], weight: 1.2 },
  // the animals off the ark, without the ark (or the rain)
  { id: "animals", pieces: [...PAIRS, ...JUST_ONE.map(id => ({ [id]: 0.5 }))], weight: 1.2 },
  { id: "animals_two_by_two", pieces: PAIRS, label: ["two by two", "two of everything", "all of them, in twos"], weight: 0.5 },

  // the tins: spam, the beans, the Spaghetti-Os, and all of them at once
  { id: "spam", sets: ["spam"], weight: 0.8 },
  { id: "beans", sets: ["beans"], weight: 0.8 },
  { id: "spaghetti_os", sets: ["spaghetti_os"], weight: 0.8 },
  { id: "tins", sets: ["spam", "beans", "spaghetti_os"], weight: 1.2 },
  { id: "spam_and_beans", sets: ["spam", "beans"], label: ["spam and beans", "beans and spam", "spam, beans, spam"], labelChance: 0.4, weight: 0.5 },

  // oops, all of one kind of thing
  { id: "dinosaur_bones", pieces: [...BONES, { dinosaur_fossil: 0.5 }], label: ["Oops, all dinosaur bones!", "nothing but dinosaur bones", "more dinosaur bones than anyone asked for"], labelChance: 0.6 },
  { id: "invaders", pieces: [...INVADERS.map(id => ({ [id]: id.startsWith("space_") ? 1.6 : 0.6 })), { mystery_ship: 0.3 }], label: ["Oops, all space invaders!", "an invasion", "they came in peace, mostly"], labelChance: 0.6 },
  { id: "fish", pieces: { onefish: 1, twofish: 1, redfish: 1, bluefish: 1, two_fish: 1, bone: 0.6, goldfish_bowl_moon: 0.6, umbrella_for_a_fish: 0.5, mullet: 0.3 },
    label: ["Oops, all fish!", "fish, mostly", "a great many fish"], labelChance: 0.5 },
  { id: "ancient_monuments", pieces: ["pyramid", "ziggurat", "great_wall", "stonehenge", "moai", "sphinx", { sphinx_nose: 0.4 },
    { babel_lower: 0.3, babel_middle: 0.3, babel_top: 0.3, babel_ruin_lower: 0.3, babel_ruin_middle: 0.3, babel_ruin_top: 0.3 }],
    label: ["Oops, all ancient monuments!", "the wonders of the ancient world", "antiquity"], labelChance: 0.6 },

  // presents, just for you (all of them)
  { id: "presents", pieces: ["unwanted_present", "present_small", "present_long", "present_tall", "present_wide", "present_big"], label: ["presents, just for you", "all of them, just for you"], labelChance: 0.5, weight: 0.8 },
  // a great many footprints, going nowhere in particular
  { id: "footprints", pieces: ["trail_of_footprints", "dinosaur_footprints", "bigfoot_footprints"], weight: 0.5 },

  // the emotion cards: getting stranger as they go up...
  { id: "feelings_stranger", stages: [PLAIN, SPECIFIC, [...INTENSE, ...AGAIN.slice(0, 3)], MADE_UP, THE_GAME], weight: 1.5 },
  // ...or stranger and stranger, then very British (a nice cup of tea at the top)...
  { id: "feelings_british", stages: [PLAIN, SPECIFIC, BRITISH.slice(0, 3), BRITISH.slice(3)], top: "emotion_cup_of_tea", weight: 0.6 },
  // ...or online (touching grass at the top)...
  { id: "feelings_online", stages: [PLAIN, SPECIFIC, ONLINE.slice(0, 3), ONLINE.slice(3)], top: "emotion_touching_grass", weight: 0.6 },
  // ...or ever higher, to the heat death of the universe
  { id: "feelings_ascending", stages: [PLAIN, [...SPECIFIC, ...INTENSE], [...MADE_UP, ...THE_GAME], HIGHER, HIGHEST], top: "emotion_heat_death", weight: 0.8 },
  // the other way: the strangest at the bottom, getting plainer, to calm at the top
  { id: "feelings_plainer", stages: [THE_GAME, MADE_UP, INTENSE, SPECIFIC, PLAIN.filter(id => id !== "emotion_calm")], top: "emotion_calm", weight: 0.6 },
  // only the strange ones
  { id: "feelings_strange", pieces: [...MADE_UP, ...THE_GAME, ...INTENSE.map(id => ({ [id]: 0.5 }))], weight: 1.2 },
  // only the made-up ones
  { id: "feelings_made_up", pieces: MADE_UP, weight: 0.7 },
  // plain feelings, and the made-up ones in among them
  { id: "feelings_plain_and_made_up", pieces: [...PLAIN, ...MADE_UP], weight: 0.7 },
  // nothing but the plain ones
  { id: "feelings_plain", pieces: PLAIN, weight: 0.5 },
  // déjà vu, memory loss and spooky coincidences, over and over
  { id: "feelings_again", pieces: AGAIN, weight: 0.6 },
  // the ones about the game
  { id: "feelings_the_game", pieces: THE_GAME, weight: 0.6 },
];
