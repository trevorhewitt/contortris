/**
 * EXTRIS THREADS: loose themes that pieces (and powerups, and level 6 sets) share.
 * Edit by hand. A thread is a name and the ids on it; a piece can be on several.
 *
 * Often the next piece follows a thread from the last piece or two (CONFIG.assist.threads),
 * so pieces tend to come in loose, drifting runs: a cloud, a raindrop, an umbrella for a fish,
 * a whale, a lighthouse... and just as often not at all. Colour and shape threads ("everything
 * red", "long things") are worked out from the art (src/threads.js), so they aren't listed here.
 */

export const THREADS = {
  weather: ["raindrop", "drizzle", "big_raindrop", "piece_of_sky", "happy_cloud", "snowflakes"],
  sea: ["blue_whale", "two_fish", "bluefishbig", "lighthouse", "giant_rubber_duck"],
  garden: ["daisy", "tulip", "bluebell", "dandelion_clock", "poppy", "forget_me_not", "lavender", "snowdrop", "inchworm"],
};

// the threads each level 6 set belongs to (a set is likelier to start while one is followed)
export const SET_THREADS = {
  sky: ["weather"],
  noahs_ark: ["sea", "weather"],
};
