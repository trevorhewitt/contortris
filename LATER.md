# Notes left for later

Everything from the playtest notes that isn't done yet, to come back to after the MVP.
(The MVP list itself is being worked through on this branch; anything from it that ends up
deferred is added at the bottom.)

## Classic

- **The early game builds up.** Don't start with the smallest pieces: the first 20 or so pieces
  build up in size to a level 4, with a dramatic jump in size on the level 4, and the game moves
  on to a massive level 6 soonish after, if the player can clear enough of the board for it.

## Home screen

- **The logo:** faster animations, more of them, more often, overlapping, with no dead space
  between them. Particle effects concentrated around the logo, moving through a series of
  different (not computationally heavy) effects.

## Turbo zen

- **Stacking sets** that look nice and stack well together as a screen filler, and as simple silly
  pieces in the other modes; when they come together their names are one name ("socks!",
  "socks and underwear!"):
  - modern skyscrapers, by day and by night (which come separately)
  - socks: alongside the tube sock, knee-high striped socks, stockings and so on; each sock with
    its other one (flipped left to right); and a sock with no match, which only comes once
    (the game side of "only once" is already in: `once: true`)
  - underwear (sometimes with the socks): tighty-whities, boxers, boxer briefs
  - presents
- **Expanderz in more turbo zen sequences.** Some of this is in (a crack flooded by one
  Expanderz, fills that grow, three ways of filling with Expanderz; the new Expanderz turn up in
  all of these by themselves); still to do: more new sequences that combine Expanderz with the
  others, a "canvas" sequence for the mineshaft pieces (one drops on a messy board, the board
  under it becomes solid ground, and the shaft is filled in with long pieces), and sequences for
  the rain clouds.

## The block designer

- **Editing painted fills.** The designer keeps the new painted fills (and picture fills) when a
  piece is saved, and its in-game preview paints them as the game does, but they're edited in
  shapes/main_shapes.js (every setting is described at the top of src/fillart.js), not in the
  designer itself.

## Housekeeping

- **A smaller shapes file.** The painted fills' hand-drawn textures write one colour per line,
  so shapes/main_shapes.js is now about 120,000 lines (7.5 MB). Writing each list of colours on
  one line (in the block designer's save and in the scripts) would cut it to about a third. Left
  as it is for now, so the shapes branch merges cleanly; it's a one-time reformat of the file.
