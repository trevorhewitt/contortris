/**
 * EXTRIS BLOCKS — every piece in the game: regular blocks and powerups.
 * Edit by hand or with block_designer.html (it keeps this comment when saving).
 *
 * Each entry:
 * {
 *   id: "unique_id",          lowercase letters, numbers and _
 *   name: "shown in game",
 *   grid: ["XX", "X."],       the shape: X = block, . = empty
 *   color: "#hex" | [[...]],  a solid colour, or pixel art: a grid of hex colours exactly
 *                             k times the size of `grid` (k = pixels per block, 1-7).
 *                             "" pixels inside a block show the first colour in the grid.
 *   difficulty: 0-5,          regular blocks only; drives when it is served
 *                             (see CONFIG.assist.pieceMix in config.js)
 *   frequency: 0-1,           how often it is picked compared with others of its kind
 *                             (0 = retired: never served, but kept in the file)
 *   rotation: { mode: "any" | "none" },
 *
 *   Optional:
 *   nextShapes: ["id"],       blocks that may come straight after this one ("back to back")...
 *   nextShapeProbs: [0.5],    ...with these probabilities
 *   tags: ["food"],           labels used by achievements (shapes/achievements.js), e.g.
 *                             "food", "medicine", "squelchy"
 *   zones: {                  named regions around the piece, in the same format as powerup
 *     inside: { origin, grid } areas (below). Used by achievements, e.g. the inside of a mouth.
 *   },
 *   powerup: { ... },         makes this block a powerup (Normal mode only), see below
 * }
 *
 * powerup: {
 *   type: "destroyer" | "gravity" | "expander" | "acid" | "blast" | "goo" | "phantom" | "combo",
 *     destroyer: destroys every block in its area
 *     gravity:   blocks in its area fall (or slide) until they hit something
 *     expander:  fills every empty cell in its area with `fill`
 *     acid:      dissolves every block it touches (its area is worked out from its shape:
 *                every cell within `reach` steps of one of its blocks, plus any `area`)
 *     blast:     throws the blocks in its area outwards by up to `push` cells, then they fall
 *     goo:       melts: its blocks (× `volume`) flow down into the lowest gaps they can reach
 *     phantom:   falls straight through blocks into the deepest gap it fits; stays as blocks
 *     combo:     several powerups in one: `parts` (see below), mid-to-late game only
 *   reach: 1,                 acid only: how far it dissolves (steps from its blocks, default 1)
 *   push: 3,                  blast only: how far blocks get thrown (cells, default 3)
 *   volume: 1.5,              goo only: how many cells it fills, × its own block count (default 1)
 *   intro: "...",             optional: a line or two for the powerup's intro screen
 *   help: 1-5,                how helpful it is (1 = barely, 5 = a lifesaver). The more the
 *                             player is struggling, the more the helpful ones are picked
 *                             (CONFIG.assist.powerups.struggle). Default from tier.
 *   parts: [ {...}, {...} ],  combo only: each part is a mini powerup with its own type
 *                             ("destroyer", "acid", "blast", "gravity" or "expander") and that
 *                             type's fields (area, direction, reach, push, fill). They fire in
 *                             that order (destroy first, fill last). A combo only turns up once
 *                             all of its parts' classes are in the game.
 *   direction: "down" | "left" | "right" | "up",   gravity only (default "down")
 *   tier: 1 | 2 | 3,          1 = gentle ... 3 = very strong. Stronger tiers are served more
 *                             when the stack is high (CONFIG.assist.powerups in config.js)
 *   description: "...",       optional: replaces the effect text shown under the name
 *   area: {                   the highlighted ("effected") cells:
 *     origin: [x, y],         where the piece's top-left block sits inside `grid`
 *     grid: ["..."],          "." not affected, "#" this cell, "-" this cell's whole row,
 *   },                        "|" this cell's whole column, "+" both row and column
 *   fill: "#hex" | [[...]],   expander / goo: art for the cells it fills (one block of k×k pixels)
 *   consume: true,            optional: vanish when fired (default: yes, except expanders)
 *   collapse: false,          destroyer / acid: wiped wall-to-wall rows close up like a line clear
 * }
 *
 * For powerups, `frequency` is compared with the other powerups only. Powerups don't rotate
 * unless rotation.mode is "any" (then the highlighted area rotates with the piece).
 */

export const SHAPES = [
  {
    id: "david",
    name: "David",
    grid: [
        "XX",
        "XX",
        "XX",
        "XX",
        "XX",
        "XX"
      ],
    color: [["#ffffff","#ffffff","#ffffff","#ffffff","#fcfbff","#e3e2e8","#7d7e8b","#f0f5fb","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#fefffe","#797379","#191619","#1f161a","#1c171a","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#fdfbfa","#6d615d","#b09792","#655353","#5a5155","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#fcfefb","#635a56","#b8aaaa","#ddc8c0","#7e7480","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#89756e","#c6b3af","#7c696a","#bdb8bb","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ececea","#c2aea5","#554c4f","#fbfafc","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#d2bebd","#b0a6ad","#444243","#c3c3db","#e0e2ed","#fefefe","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#fefffe","#c0b3b8","#bcafb3","#d6d8e1","#717082","#9aa1bb","#c7cee2","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#fffefe","#dfd9da","#e0dde2","#d9d0d6","#918083","#b7b6cf","#85797b","#b1b6ca","#fdfdfd","#ffffff","#ffffff"],["#ffffff","#ffffff","#fefefb","#e5dde2","#e4dde1","#c6bcc2","#dbd0d6","#bcb1b4","#584f4b","#aaa9b9","#c0c1d1","#b0b4c9","#ffffff","#ffffff"],["#ffffff","#ffffff","#f5edf0","#e8e1e4","#dfd5db","#b4aab8","#d2c4cb","#c7bcc1","#837878","#88756d","#a19aa4","#b7bacf","#ffffff","#ffffff"],["#ffffff","#ffffff","#e1d9d8","#e0d6dc","#d8cdd1","#9d919d","#b2a3ae","#a2929e","#b0a7b2","#665c59","#77645e","#78686a","#c3c1ce","#ffffff"],["#ffffff","#ffffff","#f8ebe9","#7c6e69","#eee4e3","#dfd4da","#c5b9c2","#b2a6b1","#998e95","#3c3235","#dbd8d4","#605047","#dbd7d8","#ffffff"],["#ffffff","#ffffff","#f5edeb","#938381","#cec0c2","#c2b5bd","#baadb2","#a29697","#736769","#483c3c","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#eddfdc","#756665","#b3a2a2","#b5a8ab","#c3b8bc","#aca1a8","#796d6d","#5e5859","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#e0d0c8","#645151","#f6eeea","#c5babf","#beb3ba","#aba0aa","#b6aab4","#fdfefe","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#fffeff","#c7b9b7","#e9e6e5","#f7edec","#c8bcc3","#988c97","#ccc3cb","#b6abb1","#e7e5e6","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#fdfbfb","#bcb0b9","#f3f2f1","#efe4e5","#cabec0","#a698a2","#b9aeb4","#b0a5b0","#cbc7ca","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#f9f6ef","#c2b6ba","#fbfaf7","#dacecf","#246600","#766668","#807378","#cdc3ce","#786e73","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#f7f1ec","#a19595","#f0e7e6","#4ed803","#246600","#4ed803","#e8dbdc","#c4b9c0","#91888d","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#e4dde1","#c9c0c1","#f3ede9","#4ed803","#246600","#4ed803","#d4c8d0","#a096a1","#8e848a","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#d1c7ca","#fdfffd","#efe7e8","#93d96d","#4ed803","#93d96d","#d4c9cf","#a098a5","#dfdcde","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#c0afa7","#c4bbbd","#f3efed","#c8b8b9","#93d96d","#afa6b1","#e8dfe2","#b6b2bb","#efeeef","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#f9fefe","#c1b4b9","#796d6f","#dccbcd","#93878a","#a79ba6","#cfc3c6","#a39aaa","#efedef","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#e2d0c9","#635755","#dacaca","#968b91","#403539","#d6cbce","#9d94a5","#fdfdfb","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#d8c9c7","#beaeb1","#3d3333","#cac0c1","#95919e","#fefefe","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#fbfaf9","#c8b8b9","#493d3f","#d0c5c9","#928d9b","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#feffff","#c8b8bb","#35292b","#dbcece","#898492","#fdfdfc","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#b9aaa5","#3c3138","#baaead","#978b95","#a5a1ae","#fefefe","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#eae0de","#6d6269","#685e69","#86736d","#a297a5","#918d9a","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#f5f1f0","#8a8086","#7d7481","#928285","#af9f9d","#968d9a","#fefefe","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#fffffe","#8c818a","#867c89","#4f4548","#cebbb5","#9b8f9a","#f1eeed","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#b3a09d","#88818d","#645a5f","#8b7c80","#87787b","#867e8c","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#e1d8d4","#8b838e","#584f54","#f3f4f4","#b5a19c","#8f8691","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#b5a3a5","#8c808c","#3a3035","#fdfefe","#dfd2d2","#9b929e","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#f7fbf4","#c8bcbd","#241c27","#a8a5ab","#fefefe","#aa9fa5","#eaeaef","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#e0cfd1","#726670","#a29ba3","#ffffff","#b4a9b2","#888396","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#fdfdfe","#8b8087","#6b6066","#b6abae","#fefefd","#bdb4bc","#bfbfce","#fcfcfd"],["#ffffff","#ffffff","#ffffff","#ffffff","#fefeff","#d1cfd8","#898495","#2d232b","#8c8ba3","#a8a9be","#a8a6b9","#dedce4","#898a9f","#706c78"],["#ffffff","#ffffff","#ffffff","#fdfefd","#978c90","#a19499","#372d2c","#4a3f3f","#4f424b","#c1c4ce","#d0c5c9","#6e6465","#281e24","#5c525b"],["#ffffff","#ffffff","#ffffff","#fefdfe","#c1b4ba","#aa9ea3","#8b7f86","#b1a6b0","#72686c","#8d8081","#c9b8bb","#6f5e62","#675e66","#5d535e"],["#ffffff","#ffffff","#fffffe","#797277","#5e5459","#51414b","#686168","#746a6f","#6c6166","#8b7f81","#786f71","#8c8281","#211c21","#272024"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "art"
      ],
  },
  {
    id: "lisa",
    name: "The Mona Lisa",
    grid: [
        "XX",
        "XX",
        "XX"
      ],
    color: [["#7a5838","#7d5c30","#75552d","#846440","#7c5d2c","#6c4a1f","#745128","#6b4823","#674617","#64421b","#6d4a24","#7e5a2d","#5d3a16","#634121"],["#6a5326","#2d1a13","#1e1f11","#1f1f11","#252115","#251e18","#231e19","#2a211a","#2b231d","#241b17","#261c18","#2c231a","#473119","#6c4f1f"],["#724f1f","#43402c","#404227","#42422c","#3e3e25","#433f27","#43442a","#45432b","#494c32","#4d4d33","#4c4e33","#504e33","#52391e","#63411e"],["#634210","#494529","#4c4c27","#504f2c","#52512e","#4d4c28","#292415","#2e2a1b","#55543d","#565437","#595736","#57542d","#4a361b","#5d390f"],["#725022","#51482f","#5f5b33","#605d38","#635e3c","#fbff00","#fbff00","#fbff00","#322e1e","#5e5d3b","#645f3b","#5e582e","#50371d","#593614"],["#7e5527","#2c2816","#3b3920","#403a1c","#fbff00","#000000","#fbff00","#000000","#fbff00","#3c3820","#665f31","#564d26","#4a361b","#593811"],["#6f4a20","#232217","#2e2c1f","#312b1f","#fbff00","#fbff00","#fbff00","#fbff00","#fbff00","#2c291c","#3b3423","#342e1c","#493320","#573517"],["#613e16","#1e1f16","#27241b","#2a261c","#fbff00","#000000","#000000","#000000","#fbff00","#2f2d20","#302b1d","#2e271d","#422917","#4e2d0d"],["#6e4c19","#221e16","#2d271e","#2e2b1f","#312823","#fbff00","#fbff00","#fbff00","#241e15","#28241c","#3d3121","#30271b","#482f1a","#5f3f12"],["#684926","#281d18","#38291d","#342417","#21221c","#925821","#bb6f2b","#a4602d","#392018","#282014","#483120","#46331c","#412a16","#6f4f25"],["#50340f","#2d1913","#3e2417","#3a281c","#2a1d19","#ad713a","#d38741","#804e19","#30231b","#201d14","#1e1b17","#312018","#452e1c","#735224"],["#694513","#201616","#3b2112","#291b14","#26211c","#2b2219","#2b1f1b","#2b211d","#2f251d","#32241d","#1e1817","#301c17","#442c17","#5c3919"],["#6b4519","#2e2016","#2e231a","#221b15","#1f1b19","#211d17","#211c19","#241e19","#2a201a","#211c13","#1d1918","#281d19","#482f19","#744f2a"],["#5c3311","#281d12","#221a16","#26201b","#1e1c1c","#1d1a15","#1c1a16","#1f1a17","#241c18","#211b16","#1b1a16","#1b1915","#462c1c","#6a4622"],["#6c4313","#241c13","#251b16","#3f2517","#a85b2f","#59361d","#1a1611","#231d1c","#27211b","#241e1a","#181915","#181914","#4c2d1d","#523314"],["#6f441c","#1c1711","#1f1a14","#241d1d","#4d2610","#83401f","#7a3b1b","#62351b","#4f2a1f","#241d13","#1a1a16","#181914","#52341c","#513517"],["#633d15","#1f1b16","#231a15","#2b1e14","#703c13","#3c2718","#482716","#2f1d13","#32241e","#241d18","#1b1918","#1a1a16","#523423","#5b3920"],["#613c11","#191513","#2b1e1d","#161712","#2c1a1a","#211e1a","#1e1a17","#1e1a16","#281e1b","#1f1a17","#1a1817","#181a17","#543120","#644018"],["#785327","#1b1611","#141916","#191818","#181716","#171614","#1e1a19","#2c1f1e","#333028","#4e3e31","#2f2521","#2d2117","#4c3122","#643f19"],["#5d4228","#775c25","#76562c","#6f5028","#7d5b2e","#6a471e","#784d29","#774b23","#9b6d40","#825830","#815632","#a68562","#7d5c37","#6a4a2a"],["#744c25","#7a5329","#845727","#895c26","#764e21","#764f24","#a3754e","#87582d","#996f44","#8f6138","#9c7136","#9c7457","#7d573a","#926f55"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "art"
      ],
  },
  {
    id: "hotdog",
    name: "hot dog",
    grid: [
        ".X.",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        ".X."
      ],
    color: [["","","","#812a02","#ca501b","#d85e0b","","",""],["","","","#812a02","#ca501b","#d85e0b","","",""],["","","","#933309","#d36134","#d75621","","",""],["#bd7501","#b95904","#e7c097","#8f2f01","#ca5322","#d7551e","#ebaf79","#f58f1e","#f58f1e"],["#a75f02","#ca6a0e","#e8c29b","#8f2e01","#d05725","#d8571f","#e6ae79","#f79729","#f58f1e"],["#9f5801","#cb6708","#edcfb1","#923306","#cf5522","#de5a23","#e7b07c","#fa9626","#f58f1e"],["#9b5401","#c76507","#f2d3b3","#953406","#d05723","#e26229","#eab780","#f8992c","#f58f1e"],["#985201","#c96809","#f1d6ba","#8f3002","#d05721","#dd5b20","#e6ba8c","#f79325","#f58f1e"],["#985301","#cc6d0d","#f0cfae","#9a3708","#d05823","#e05c22","#e4b27c","#f8962d","#f58f1e"],["#985201","#c96808","#f1d1ae","#973606","#d25a25","#df5f25","#e1ae81","#f99c2d","#f58f1e"],["#975201","#cb6707","#f3d7b9","#943304","#d45d2a","#e2662d","#d79d5f","#f79727","#f58f1e"],["#965202","#ce7010","#f3d5b8","#973404","#d15625","#dc5a20","#da9e65","#f79122","#f58f1e"],["#975201","#c96907","#f5d6b9","#913305","#d35923","#da5a21","#d79e66","#f89a28","#f58f1e"],["#985201","#cc6a0b","#eecca9","#8e2e02","#cc551f","#da581c","#cd874c","#f69121","#f58f1e"],["#985402","#ca6a11","#f2d2ae","#923104","#cb541d","#d75419","#cb8646","#f79424","#f58f1e"],["#985201","#cd6c0a","#ebc297","#913003","#cd5622","#db5b21","#cd8f51","#f29121","#f58f1e"],["#995502","#d07316","#f2d1ab","#923003","#ce5925","#da571d","#dda56c","#ef8818","#f58f1e"],["#995602","#c76b15","#eec89e","#8b2e02","#ce531b","#d65d22","#eab178","#e9861c","#f58f1e"],["","","","#94370f","#c95220","#d25019","","",""],["","","","#94370f","#ae451e","#b65203","","",""],["","","","#6d1e01","#ae451e","#b65203","","",""]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "donut",
    name: "a donut",
    grid: [
        "XXX",
        "X.X",
        "XXX"
      ],
    color: [["#5cf4ff","#5cf4ff","#ff00e6","#ff00e6","#ffffff","#ffffff"],["#ff00e6","#ff00e6","#ff00e6","#ff00e6","#fe2fe2","#fe2fe2"],["#ffffff","#ff00e6","","","#d336ce","#5cf4ff"],["#ff00e6","#ff00e6","","","#d336ce","#fe2fe2"],["#ff00e6","#ffffff","#d336ce","#d336ce","#d336ce","#f5e684"],["#fe2fe2","#ffffff","#fe2fe2","#f5e684","#f5e684","#f5e684"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "marge",
    name: "Marge",
    grid: [
        "X",
        "X",
        "X",
        "X",
        "X",
        "X",
        "X"
      ],
    color: [["#1c2359","#202d92","#001eff"],["#202d92","#384df0","#001eff"],["#202d92","#384df0","#001eff"],["#202d92","#384df0","#001eff"],["#202d92","#384df0","#001eff"],["#202d92","#384df0","#001eff"],["#202d92","#384df0","#001eff"],["#202d92","#384df0","#001eff"],["#202d92","#384df0","#001eff"],["#202d92","#001eff","#001eff"],["#202d92","#001eff","#001eff"],["#202d92","#001eff","#001eff"],["#c6c662","#ffff80","#ffff00"],["#c6c662","#ffff80","#ffff00"],["#c6c662","#ffff80","#ffff00"],["#78b361","#96e972","#96e972"],["#78b361","#96e972","#96e972"],["#78b361","#96e972","#96e972"],["#78b361","#96e972","#96e972"],["#78b361","#96e972","#96e972"],["#78b361","#96e972","#96e972"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "hooootdoooog",
    name: "hoooot doooog",
    grid: [
        ".X.",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        ".X.",
        ".X.",
        ".X.",
        ".X."
      ],
    color: [["","","","#8a2801","#c06203","#da643d","","",""],["","","","#8a2801","#c04311","#c14416","","",""],["","","","#7f1e02","#c04414","#da643d","","",""],["#bc8001","#bd6008","#eacca3","#852103","#c04213","#d45629","#611d0a","#faac3e","#c76204"],["#905401","#c2660b","#eaca9c","#8b2805","#bf4412","#d75827","#69270e","#fbbd61","#ce6708"],["#924f02","#d37911","#e8c493","#8c2c08","#c24515","#d4521f","#753114","#faca7a","#cf6607"],["#a65903","#d57a13","#e3c095","#8d2e09","#c64716","#d65321","#7d3c18","#f9cd86","#d16808"],["#ac5c04","#d47a14","#e9cfae","#94300a","#c34412","#d55220","#6b290a","#facb80","#d76d08"],["#a85a04","#e2871d","#eaca9f","#8f2a04","#c64717","#d75421","#7a3916","#f9d28c","#e0740b"],["#a65502","#e1881c","#efd1a9","#912a05","#c54614","#d6501e","#7e3c18","#fac975","#e1780a"],["#a75503","#df8418","#f2dabd","#922a06","#c54513","#dc5d2b","#6e2a0e","#f8d291","#e67b0b"],["#a65603","#df8418","#ebca9c","#932e09","#c04312","#d9541f","#6e2a0b","#f9d295","#e88110"],["#a95903","#e0871a","#f4d8af","#902f0a","#c34211","#dc5c29","#5b1802","#fad08c","#ea820e"],["#a95702","#e28919","#f3d7ad","#92300c","#c34415","#dd5b26","#601d05","#f9d192","#ef8b17"],["#a95602","#e89526","#f6dcb6","#93360f","#c54514","#de6132","#591702","#fddfac","#eb840f"],["#a25002","#e28b18","#f4d8ae","#933510","#c34312","#e57146","#5b1a03","#fbdba0","#ec8510"],["#a85804","#e38f1f","#f9e2bf","#92310b","#c34111","#e77042","#641d03","#fbd89f","#ed830e"],["#a65402","#e38d1f","#f4dcb8","#95340d","#c64613","#e98056","#641c02","#f9d59f","#ec8410"],["#ac5905","#dc8117","#f2d5ac","#91320b","#c1400f","#db5425","#6b1e04","#f9d79e","#ef8a19"],["#a95804","#e0881b","#f6ddb9","#94330c","#c3410e","#df5924","#5b1200","#f6d29a","#f08c15"],["#a04d01","#e0881b","#f5d6ac","#91310b","#c03e0e","#e66f42","#621c02","#f7cd88","#ed8a12"],["#ab5605","#e5901f","#f5dab2","#93320d","#c84613","#ec855f","#6c1d03","#fbdea9","#f39319"],["#ab5804","#e4901e","#f0ce9e","#97340d","#c64110","#df612f","#76270a","#fadeb3","#f08a11"],["#a75402","#e79423","#f5dbb6","#94320b","#c74311","#e26130","#5b1401","#f8d29b","#ec8512"],["","","","#94320a","#c54413","#e46938","","",""],["","","","#94320a","#c64613","#e96736","","",""],["","","","#96360d","#c44211","#eb7949","","",""],["","","","#91320d","#c64613","#e35f28","","",""],["","","","#93310c","#c94816","#e7632e","","",""],["","","","#95320a","#c6430f","#ed8152","","",""],["","","","#90300a","#c64513","#e1622d","","",""],["","","","#94320c","#c74613","#e26736","","",""],["","","","#923009","#c14311","#dc5720","","",""],["","","","#902d08","#c2410c","#dd5622","","",""],["","","","#902e07","#c34414","#d14c15","","",""],["","","","#902d08","#c34210","#d64f1b","","",""]],
    difficulty: 4,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "lentil",
    name: "a lentil",
    grid: [
        "X"
      ],
    color: [["#8c533b","#b4603c","#b4603c","#b4603c"],["#b4603c","#ff773d","#ff773d","#b4603c"],["#b4603c","#ff773d","#ff773d","#b4603c"],["#8c533b","#b4603c","#b4603c","#8c533b"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "banana",
    name: "an oddly straight banana",
    grid: [
        "X",
        "X",
        "X",
        "X"
      ],
    color: [["#f7f9fd","#f5f8fd","#f3f6fb","#f2f5fb","#f4f7fc"],["#f6f8fc","#f4f7fb","#5a3b29","#95a4a7","#ebf1f6"],["#f8f9fc","#f6f9fc","#e6ce2e","#92a19e","#e5edf3"],["#f7fafc","#f5f6f8","#d7b20a","#8e9e95","#eef3f8"],["#f8f9fb","#fceb7d","#fbd239","#c3a547","#e8eff2"],["#f9f9fb","#fbe578","#edab10","#c09924","#d7e1e4"],["#f7f7fa","#fcec80","#f3b80d","#d6af3e","#cdd7db"],["#f8f8f7","#fcea75","#d79204","#d0a942","#ccd5d9"],["#faf6ef","#fbe76d","#f4bd13","#d1ac45","#cdd6d9"],["#f7f1e6","#fadd5f","#f7c220","#cfa941","#cbd3d6"],["#f6f6f6","#fcd955","#fbcb1e","#d2ab42","#ccd4d5"],["#f6f6f7","#f7cd48","#b25d01","#d2a839","#c4cdcf"],["#f6f7f9","#fbe356","#fbc712","#e3b423","#bac2c1"],["#f6f7f9","#f7cd2c","#f2b30b","#e5b418","#b0b7b3"],["#f5f6f9","#f1c22c","#fdd83c","#e9b623","#a3a8a2"],["#f6f7fb","#fddc4f","#fcdd4f","#ecb30e","#96998e"],["#f4f6fa","#f2f4f4","#f9cb22","#f6c40b","#b1a171"],["#f6f8fc","#f5f6fa","#f8ce18","#e6b403","#8b938d"],["#f6f8fc","#f7f7fc","#edf1f5","#371b01","#93a1a5"],["#f5f7fc","#f5f7fc","#f6f7fc","#eff3f8","#d4dee7"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "heart",
    name: "a heart <3",
    grid: [
        "XX.",
        "XXX",
        "XXX"
      ],
    color: [["#ff5757","#ff0000","#ff0000","#ff0000","",""],["#ff0000","#ff0000","#ff0000","#ff0000","",""],["#ff0000","#ff0000","#ff5757","#db0000","#ff0000","#db0000"],["#ff0000","#ff5757","#db0000","#ff0000","#ff0000","#db0000"],["#ff0000","#ff0000","#ff0000","#ff0000","#db0000","#db0000"],["#db0000","#db0000","#db0000","#db0000","#db0000","#db0000"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "diamond",
    name: "a beautiful diamond",
    grid: [
        "..X..",
        ".XXX.",
        "XXXXX",
        ".XXX.",
        "..X.."
      ],
    color: [["","","","","#b8f7ff","#b8f7ff","","","",""],["","","","","#b8f7ff","#94f3ff","","","",""],["","","#b8f7ff","#b8f7ff","#b8f7ff","#94f3ff","#94f3ff","#94f3ff","",""],["","","#b8f7ff","#94f3ff","#94f3ff","#94f3ff","#ddf5f8","#94f3ff","",""],["#b8f7ff","#b8f7ff","#b8f7ff","#94f3ff","#94f3ff","#7af0ff","#ddf5f8","#94f3ff","#94f3ff","#94f3ff"],["#b8f7ff","#94f3ff","#94f3ff","#94f3ff","#ddf5f8","#7af0ff","#ddf5f8","#94f3ff","#94f3ff","#94f3ff"],["","","#94f3ff","#94f3ff","#ddf5f8","#7af0ff","#94f3ff","#94f3ff","",""],["","","#94f3ff","#94f3ff","#ddf5f8","#7af0ff","#94f3ff","#94f3ff","",""],["","","","","#94f3ff","#94f3ff","","","",""],["","","","","#94f3ff","#94f3ff","","","",""]],
    difficulty: 4,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "solo",
    name: "a solo cup",
    grid: [
        "XXXXX",
        ".XXX.",
        ".XXX.",
        ".XXX.",
        ".XXX."
      ],
    color: [["#908e8e","#908e8e","#908e8e","#dedede","#dedede","#dedede","#ffffff","#dedede","#dedede","#908e8e"],["#b30000","#db0000","#ff0000","#ff0000","#ff0000","#ff0000","#ff0000","#ff0000","#db0000","#b30000"],["","","#b30000","#db0000","#e60000","#e60000","#db0000","#b30000","",""],["","","#ff0000","#ff0000","#db0000","#db0000","#ff0000","#ff0000","",""],["","","#ff0000","#ff0000","#ff0000","#ff0000","#ff0000","#ff0000","",""],["","","#b30000","#db0000","#e60000","#e60000","#db0000","#b30000","",""],["","","#ff0000","#ff0000","#db0000","#db0000","#ff0000","#ff0000","",""],["","","#ff0000","#ff0000","#ff0000","#ff0000","#ff0000","#ff0000","",""],["","","#db0000","#ff0000","#ff0000","#ff0000","#ff0000","#db0000","",""],["","","#b30000","#db0000","#db0000","#db0000","#db0000","#b30000","",""]],
    difficulty: 4,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "pill",
    name: "medication",
    grid: [
        "XX"
      ],
    color: [["#c34b43","#c24a41","#c44c41","#e6e56f","#e7e670","#e4e36d"],["#a21112","#a81114","#a71215","#cfd136","#ced035","#d2d338"],["#972726","#942626","#942724","#c4c332","#c2c52e","#c7c936"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "medicine"
      ],
  },
  {
    id: "brain",
    name: "an acutal human brain",
    grid: [
        ".XX.",
        "XXXX",
        "XXXX",
        "..X."
      ],
    color: [["","","#f7b2c9","#fbbed2","#f1abc3","#fbc5d8","",""],["","","#fcd0de","#fbd6e4","#fdc9db","#fab2ca","",""],["#fca9c2","#fba3c0","#fbb7cc","#fba8c2","#f8b4c9","#fcbdd1","#f7b1c8","#fbb2ca"],["#ef8fac","#e884a2","#f79bb6","#f69eb8","#b5516c","#cb6885","#f996b3","#ed86a5"],["#b14e6c","#ad4766","#fca8c2","#fca6c0","#f794b3","#df7796","#dc6f8d","#cc6282"],["#843d52","#c15a79","#d97895","#d8718f","#d36d8d","#d77090","#ce6685","#cc6182"],["","","","","#692a30","#aa5362","",""],["","","","","#823c46","#c16377","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "smiley",
    name: "a smiley face",
    grid: [
        "XXX",
        "XXX",
        "XXX"
      ],
    color: [["#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500"],["#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#e2e600","#e2e600","#fbff00","#fbff00","#fbff00","#fbff00","#fbff00","#e2e600","#e2e600","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#e2e600","#e2e600","#fbff00","#000000","#fbff00","#000000","#fbff00","#e2e600","#e2e600","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#e2e600","#e2e600","#fbff17","#fbff17","#fbff17","#fbff17","#fbff17","#e2e600","#e2e600","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#e2e600","#e2e600","#fbff00","#000000","#000000","#000000","#fbff00","#e2e600","#e2e600","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#e2e600","#e2e600","#fbff00","#fbff00","#fbff00","#fbff00","#fbff00","#e2e600","#e2e600","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#e2e600","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#babd00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#9b9e00","#737500","#737500"],["#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500"],["#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500","#737500"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "spam",
    name: "spam!",
    grid: [
        "XXX",
        "XXX",
        "XXX"
      ],
    color: [["#fefffe","#7c5a23","#70511b","#68460f","#ae852d","#785411","#674912","#69450b","#947526","#a98632","#997225","#9d7b2b","#9f7d2e","#88641b","#7f5b17","#775214","#845e1a","#a6842d","#85641e","#826126","#ddd5c4"],["#5a3e1c","#7d6939","#886f38","#aca066","#c7b186","#c0aa58","#a87f20","#ddc565","#c3b18a","#98773d","#957438","#8e6d34","#83632d","#6d522a","#8b6730","#cbb37d","#917239","#ad8d4f","#b4914f","#7c5e2d","#663f0f"],["#a58c54","#5d3605","#d9b843","#dbbb4b","#dfc77d","#f5f3dc","#785d2a","#866830","#4d3120","#c0af8e","#cbbb9a","#c0ad88","#cab792","#cfbe98","#7a736e","#cfc09b","#c8b294","#c3b093","#cf9b88","#cab791","#7a6138"],["#041450","#111a4a","#010d3d","#010c37","#020e35","#030c32","#040b32","#060e32","#050d31","#040e33","#020c34","#050c32","#040e35","#060d34","#040d35","#060e36","#020f38","#010d37","#030e3a","#171b39","#0c153e"],["#d4b928","#000943","#000b42","#bf9e02","#836a0c","#01012c","#937f16","#968216","#08052f","#000031","#060727","#c49b03","#010030","#9b8c05","#b19708","#000031","#01012c","#8d7709","#000134","#11102e","#0b1544"],["#a8b4d7","#02114c","#e3be09","#02083e","#00063d","#010334","#dbb402","#010b3e","#dfba06","#dfb801","#deb901","#deb700","#020238","#574914","#deb801","#998416","#deb700","#ddb700","#7f6a0d","#3c3521","#192256"],["#223675","#03134d","#e2c00a","#e1bc09","#e0bb07","#dcb703","#ddb807","#e2be0c","#e2bd09","#4c4a1d","#000b3c","#e0bc05","#d9b705","#615217","#565012","#e3c10a","#000336","#dfbb01","#00073f","#a17a1c","#192a5f"],["#27387f","#06134c","#e1be10","#000b41","#e2be08","#deb907","#deb906","#000c3f","#00093d","#e1bf09","#00093d","#594e18","#e2bf0c","#756717","#01063b","#e4c309","#00053b","#e1bf05","#000b42","#d6b124","#1d2d66"],["#2d4188","#061452","#000d46","#584d20","#010e42","#000a3e","#000c3f","#000c3f","#010b41","#000e40","#010d41","#020d40","#010b40","#000a3d","#00073e","#000a41","#00073b","#01083e","#000d46","#d6b61d","#d8d1bc"],["#22438f","#061351","#000d48","#000b43","#000740","#010b40","#424462","#d3a27e","#d0aa94","#cfae81","#d3a06c","#cb9560","#655d64","#091243","#000d43","#000d46","#000841","#000941","#000d44","#d9b71b","#827e7a"],["#bcbed9","#0a1457","#03104f","#d7bcae","#d2ab86","#d4cecb","#cfa67f","#cea389","#d19a7a","#d3ad88","#d18b64","#d8ab6a","#cf7a59","#cf7458","#ce7853","#d3ad77","#c9674d","#d29f63","#000f48","#d8ba1c","#d8d4c1"],["#5a6a96","#d7c7a5","#dcd3cc","#d6bca6","#d0ba95","#d2b49d","#d2c0b0","#d6b87f","#d28262","#c26a54","#c55f4b","#cd7857","#d2ba9e","#cc705a","#d16d57","#dfc1a6","#c46148","#d05d4b","#ce5f48","#dab91b","#243f80"],["#7383b5","#e3caad","#dab692","#d7b896","#dab48c","#cf8b61","#c45c40","#d68d62","#d49171","#d06f5b","#c14d42","#d06a58","#c55d47","#d3936c","#c7936c","#d1765a","#c85b43","#c46047","#cb845c","#c88a6b","#284689"],["#678ebd","#e2bb85","#d6ae7a","#d69e70","#d6a16f","#d17e57","#cf6752","#d36852","#cd6d59","#bb423b","#bf5046","#be473d","#ca584a","#c9624e","#c66b51","#cc845b","#cc6950","#d47b58","#cd754d","#c76751","#26498d"],["#235fa4","#cc5e55","#db9a63","#dba377","#d6875b","#d5b582","#ce644e","#c65449","#bd4642","#c24741","#b7433b","#b7413b","#c35342","#ce624d","#ca7a5f","#d56f54","#d07d56","#d47c5a","#c76149","#7c5c69","#2a4f94"],["#d1cda9","#c65c54","#db635b","#d6d0ca","#d5d0c8","#c4b09d","#c28572","#cbc4c0","#bba59c","#b19483","#bf9781","#b98e7b","#c6ae94","#d1c1b0","#d0b9a6","#d8bba3","#d05243","#dc4b45","#d04742","#c1745d","#2d569d"],["#1f62b1","#a49b68","#c25e49","#db413d","#d02b2b","#c72226","#bf232a","#b22028","#a61c24","#7b2228","#42202e","#621b22","#871b23","#a41f25","#cc222c","#d3252b","#d33936","#dd5c52","#c4705e","#ab614f","#2a5ca1"],["#3c82c5","#c0c493","#8a9267","#5b2728","#d4b569","#67242e","#aa5452","#ae4141","#b74b4c","#a4292f","#962b32","#a3423f","#a74143","#be6b67","#d0d8e9","#367285","#025b69","#54878a","#817c64","#adaf83","#2962a8"],["#77a9da","#dda77e","#dbc8b4","#afae73","#b05146","#556b5d","#4b252e","#aa5850","#c0655a","#ab373c","#ad403d","#aa4c4e","#c46c60","#a4514d","#dfdee2","#d6868b","#f2918f","#e3e7eb","#cfb898","#c26e50","#2b66ac"],["#6a625d","#161c5b","#de9a6e","#d49f70","#dac0a6","#d8b195","#dfbd9f","#8fa183","#2e4245","#563f43","#833439","#574b46","#1d3a3c","#be9e73","#d6b192","#dcc19d","#cead8a","#d88762","#c6664b","#111c41","#003b82"],["#c3cdd8","#95917e","#eadeb5","#e7dbb3","#e5dab5","#e3dab4","#e6dcb3","#e5dbb4","#e1d9b8","#ddd1ad","#d9cba9","#d6c7a3","#d7cba7","#dcd1ac","#d9cda0","#d7caa7","#e1d3af","#dfd4b0","#e4dcb7","#c3bfa2","#c0c7cf"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 0.2,
    nextShapeProbs: [
        0.8
      ],
    nextShapes: [
        "spam"
      ],
    tags: [
        "food"
      ],
  },
  {
    id: "beans",
    name: "a can of beans",
    grid: [
        "XXX",
        "XXX",
        "XXX",
        "XXX"
      ],
    color: [["#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9"],["#006b70","#007178","#008993","#00a1ab","#04abae","#009fa9","#009fa9","#009fa9","#009fa9","#009fa9","#009fa9","#009fa9","#009fa9","#00a3b2","#00a8b0","#008e99","#01767c","#00696f"],["#006a70","#007178","#038497","#eec266","#f5d48d","#f5d48d","#f5d48d","#f5d48d","#f5d48d","#f5d48d","#f5d48d","#f5d48d","#f5d48d","#e5be75","#eac26f","#0a8593","#067475","#00696f"],["#006b70","#007178","#d5b784","#1d1b1b","#12110f","#12110f","#191818","#171615","#13100f","#141311","#12110f","#12110f","#12110f","#373433","#241f1f","#e1ac66","#06737f","#00696f"],["#006b6f","#007178","#d8a05a","#1d1b18","#12110f","#12110f","#c2b6b5","#c2b6b5","#141011","#12110f","#12110f","#12110f","#12110f","#12110f","#12110f","#d5b467","#01767c","#00696f"],["#006b6f","#007178","#048786","#12110f","#12110f","#191718","#c2b6b5","#161314","#141110","#100d0c","#12110f","#12110f","#12110f","#12110f","#f9e1a5","#018fa6","#00767c","#00696f"],["#007178","#b18750","#d3aa6c","#12110f","#272121","#12110f","#c2b6b5","#c2b6b5","#12110f","#c2b6b5","#c2b6b5","#181413","#1e1a19","#211d1c","#12110f","#f6dfbf","#ceb398","#007178"],["#007178","#110901","#1a1917","#c2b6b5","#221e1d","#12110f","#c2b6b5","#12110f","#12110f","#c2b6b5","#12110f","#12110f","#12110f","#12110f","#12110f","#120f10","#50534f","#007178"],["#007178","#bec0bc","#12110f","#c2b6b5","#12110f","#12110f","#c2b6b5","#c2b6b5","#12110f","#c2b6b5","#c2b6b5","#12110f","#c2b6b5","#12110f","#12110f","#181413","#c1c3c2","#007178"],["#007178","#c2b6b5","#0d0c0a","#c2b6b5","#c2b6b5","#12110f","#12110f","#12110f","#12110f","#c2b6b5","#12110f","#12110f","#c2b6b5","#c2b6b5","#12110f","#181413","#c6ad83","#007178"],["#006b6f","#a68948","#181617","#c2b6b5","#12110f","#c2b6b5","#12110f","#12110f","#12110f","#c2b6b5","#c2b6b5","#12110f","#c2b6b5","#12110f","#c2b6b5","#191516","#b78e44","#00696f"],["#006b6f","#b9823e","#161012","#1f1b1c","#c2b6b5","#12110f","#12110f","#12110f","#12110f","#12110f","#070405","#181415","#c2b6b5","#1e1918","#c2b6b5","#1b131c","#b98c45","#00696f"],["#006b70","#b58537","#17120d","#1f1b1a","#292323","#201c1b","#1f1a19","#161314","#161513","#12110f","#141311","#1a1615","#1d1918","#201c1b","#241e1e","#393238","#a59655","#00696f"],["#006b70","#5e7a4e","#e1e2dd","#eeb973","#f7c77b","#edc573","#eabc6b","#c8983d","#bf8e26","#b8852f","#c28d24","#dba343","#f2bb69","#fac375","#eec067","#e2e5e6","#057372","#00696f"],["#006b70","#007278","#dddce2","#271509","#f5c86b","#533614","#b9954d","#b58f2c","#8e6110","#ab801f","#c68a19","#c69f3c","#ebba71","#f5c470","#21151e","#eadab6","#00767d","#00696f"],["#006b70","#007178","#d4b978","#221b1a","#2b1f21","#23181c","#201618","#16111a","#c5ac7b","#220900","#171210","#1c1314","#1e191c","#1e1e1f","#261b29","#dab360","#01767c","#00696f"],["#006a70","#007178","#dba754","#22171d","#262122","#361a00","#1e1613","#ed8727","#e56b1a","#ed9e4a","#eaac7b","#f58c17","#1d191c","#211d1c","#282017","#dcb363","#01767c","#00696f"],["#006a70","#007178","#dca457","#ffbf5e","#ffd8a5","#ff702b","#fb9c1a","#ce4713","#e2b260","#e4731f","#dd741a","#d3421a","#cd5126","#fbaf42","#ffa821","#d6b46d","#00787c","#00696f"],["#006a70","#056e71","#dea652","#faac54","#ffb02b","#fe7e22","#dc3b1f","#e78416","#e1701e","#d2451e","#de6b23","#fba903","#ec5917","#ffa41e","#f87222","#ee930e","#326359","#00696f"],["#006a70","#007178","#1e7f75","#fabe71","#fc7830","#ffd554","#fac33a","#de6422","#c7311f","#c48121","#cb8527","#de942a","#efaf3c","#f5bb55","#f5c669","#d16027","#037483","#00696f"],["#006a70","#007178","#008892","#00a2a7","#00afb0","#e8471b","#ff6f1b","#d6421c","#01838a","#00878b","#008691","#018f9b","#009bab","#04a1ab","#06a5a9","#0a8d93","#01767c","#00696f"],["#006a70","#007178","#008993","#00a0aa","#01acb4","#009eb2","#e7551e","#00646b","#005562","#005259","#00868f","#018f99","#009ba7","#00a3ad","#00a8b0","#008e99","#01767c","#00696f"],["#006a70","#007178","#008892","#01a0ab","#01acb4","#019faa","#0099a2","#0a747a","#01818d","#078192","#00868f","#018f99","#009ba7","#01a2ad","#00a8b0","#008e99","#01767c","#00696f"],["#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9","#bab8b9"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "bees",
    name: "a swarm of bees",
    grid: [
        ".X...",
        "...X.",
        ".....",
        "..X..",
        "X...X"
      ],
    color: [["","","","","","","","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","#6cc4ef","#6cc4ef","#bfe4f8","#ffffff","#6cc4ef","#6cc4ef","#6cc4ef","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","#6cc4ef","#bfe4f8","#ffffff","#ffffff","#ffffff","#6cc4ef","#6cc4ef","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","#6cc4ef","#ffd21f","#1d1424","#ffd21f","#1d1424","#1d1424","#6cc4ef","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","#1d1424","#ffd21f","#1d1424","#ffd21f","#ffffff","#1d1424","#1d1424","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","#6cc4ef","#e39b00","#1d1424","#e39b00","#1d1424","#1d1424","#6cc4ef","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","#6cc4ef","#6cc4ef","#ffffff","#ffffff","#ffffff","#6cc4ef","#6cc4ef","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","#6cc4ef","#6cc4ef","#ffffff","#bfe4f8","#ffffff","#ffffff","#6cc4ef","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","#1d1424","#1d1424","#ffd21f","#1d1424","#ffd21f","#1d1424","#6cc4ef","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","#1d1424","#ffffff","#1d1424","#ffd21f","#1d1424","#ffd21f","#1d1424","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","#1d1424","#1d1424","#1d1424","#e39b00","#1d1424","#e39b00","#6cc4ef","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","#6cc4ef","#1d1424","#6cc4ef","#6cc4ef","#6cc4ef","#1d1424","#6cc4ef","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","#6cc4ef","#6cc4ef","#1d1424","#1d1424","#1d1424","#6cc4ef","#6cc4ef","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","#ffffff","#1d1424","#ff3b30","#1d1424","#ff3b30","#1d1424","#ffffff","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","#ffffff","#ffffff","#ffd21f","#ffd21f","#ffd21f","#ffffff","#ffffff","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","#6cc4ef","#bfe4f8","#1d1424","#1d1424","#1d1424","#bfe4f8","#6cc4ef","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","#6cc4ef","#6cc4ef","#ffd21f","#ffd21f","#ffd21f","#6cc4ef","#6cc4ef","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","#6cc4ef","#6cc4ef","#6cc4ef","#1d1424","#6cc4ef","#6cc4ef","#6cc4ef","","","","","","","","","","","","","",""],["#6cc4ef","#6cc4ef","#1d1424","#1d1424","#6cc4ef","#6cc4ef","#6cc4ef","","","","","","","","","","","","","","","","","","","","","","#6cc4ef","#6cc4ef","#6cc4ef","#ffffff","#ffffff","#6cc4ef","#6cc4ef"],["#6cc4ef","#1d1424","#ffffff","#1d1424","#ffffff","#ffffff","#6cc4ef","","","","","","","","","","","","","","","","","","","","","","#6cc4ef","#6cc4ef","#ffffff","#bfe4f8","#ffffff","#ffffff","#6cc4ef"],["#6cc4ef","#ffd21f","#ffd21f","#ffd21f","#ffffff","#bfe4f8","#6cc4ef","","","","","","","","","","","","","","","","","","","","","","#6cc4ef","#1d1424","#1d1424","#ffd21f","#ffd21f","#ffd21f","#6cc4ef"],["#6cc4ef","#1d1424","#1d1424","#1d1424","#ffffff","#6cc4ef","#6cc4ef","","","","","","","","","","","","","","","","","","","","","","#1d1424","#ffffff","#1d1424","#ffd21f","#1d1424","#ffd21f","#1d1424"],["#6cc4ef","#ffd21f","#ffd21f","#ffd21f","#6cc4ef","#6cc4ef","#6cc4ef","","","","","","","","","","","","","","","","","","","","","","#1d1424","#1d1424","#1d1424","#ffd21f","#1d1424","#ffd21f","#1d1424"],["#6cc4ef","#e39b00","#1d1424","#e39b00","#6cc4ef","#6cc4ef","#6cc4ef","","","","","","","","","","","","","","","","","","","","","","#6cc4ef","#1d1424","#1d1424","#e39b00","#1d1424","#e39b00","#6cc4ef"],["#6cc4ef","#6cc4ef","#1d1424","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","","","","","","","","","","","","","","","","","","","","","","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef","#6cc4ef"]],
    difficulty: 4,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "log",
    name: "a log",
    grid: [
        "XX",
        "XX",
        "XX",
        "XX",
        "XX",
        "XX",
        "XX"
      ],
    color: [["#000000","#1e0a01","#1e0a01","#1e0d06","#1e0a01","#000000"],["#1e0d06","#df845d","#df845d","#d58f72","#d58f72","#1e0a01"],["#1e0d06","#df845d","#a06b54","#a06b54","#df845d","#1e0d06"],["#1e0a01","#d58f72","#d58f72","#df845d","#df845d","#1e0a01"],["#4d1700","#1e0a01","#1e0a01","#1e0a01","#1e0a01","#452b21"],["#302018","#402a20","#603a2a","#452b21","#452b21","#452b21"],["#150a04","#402a20","#603a2a","#452b21","#452b21","#452b21"],["#150a04","#402a20","#603a2a","#452b21","#452b21","#603a2a"],["#150a04","#1e0a01","#603a2a","#603a2a","#603a2a","#1e0a01"],["#3f2f27","#302018","#603a2a","#603a2a","#4d1700","#1e0a01"],["#150a04","#603a2a","#7f5848","#603a2a","#4d1700","#7f5848"],["#150a04","#603a2a","#452b21","#603a2a","#452b21","#4d1700"],["#150a04","#150a04","#452b21","#4d1700","#452b21","#4d1700"],["#302018","#402a20","#452b21","#7f5848","#452b21","#4d1700"],["#302018","#603a2a","#603a2a","#7f5848","#1e0a01","#452b21"],["#150a04","#302018","#603a2a","#7f5848","#1e0a01","#452b21"],["#150a04","#302018","#452b21","#4d1700","#1e0a01","#452b21"],["#150a04","#302018","#452b21","#4d1700","#4d1700","#452b21"],["#4d1700","#150a04","#452b21","#4d1700","#603a2a","#452b21"],["#1e0a01","#150a04","#452b21","#603a2a","#603a2a","#1e0a01"],["#000000","#1e0a01","#452b21","#603a2a","#1e0a01","#000000"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "luxembourg",
    name: "Luxembourg",
    grid: [
        ".XX.",
        "XXX.",
        "XXXX",
        "XXXX",
        ".XXX"
      ],
    color: [["","","","","","#003e8f","#003e8f","#003e8f","#3187f6","#003e8f","#003e8f","#003e8f","#3187f6","#003e8f","#003e8f","","","","",""],["","","","","","#003e8f","#0452b9","#3187f6","#e5b9a9","#0452b9","#3187f6","#3187f6","#e0ae95","#3187f6","#003e8f","","","","",""],["","","","","","#003e8f","#0452b9","#e4bbb1","#e0b8a9","#e0b8a9","#e7bbaa","#e2b5a2","#dcac92","#3187f6","#003e8f","","","","",""],["","","","","","#003e8f","#3187f6","#e1afa0","#e3b3a4","#ddae9e","#e3b4a0","#e0b29c","#0452b9","#003e8f","#003e8f","","","","",""],["","","","","","#0452b9","#dcab99","#e0b2a3","#e8b6a4","#e2b09e","#e2b19b","#dfae96","#3187f6","#003e8f","#003e8f","","","","",""],["#003e8f","#003e8f","#003e8f","#003e8f","#003e8f","#3187f6","#ddae9b","#dfb3a3","#d9a592","#ddaa96","#e4b19a","#dfad94","#3187f6","#003e8f","#3187f6","","","","",""],["#003e8f","#003e8f","#3187f6","#3187f6","#0452b9","#daa793","#dcad9a","#e4b8a6","#e2ae99","#dca691","#e5af98","#e5b198","#3187f6","#003e8f","#003e8f","","","","",""],["#003e8f","#003e8f","#003e8f","#003e8f","#3187f6","#825f4d","#ba8b78","#d29b87","#d69f87","#dda18b","#e1a793","#ba8c76","#0452b9","#003e8f","#003e8f","","","","",""],["#003e8f","#003e8f","#003e8f","#67a8fe","#6c4e40","#543020","#7b4c3b","#b37e6b","#d2917c","#d49581","#c38c77","#926b52","#6b4430","#3187f6","#003e8f","","","","",""],["#003e8f","#67a8fe","#003e8f","#67a8fe","#7b4c46","#794b41","#895a4c","#8b5d4b","#cd957d","#d79b86","#ab725d","#7e513a","#6b3c27","#0452b9","#003e8f","","","","",""],["#003e8f","#67a8fe","#3187f6","#886251","#4c3120","#b49280","#794f3d","#9b6a57","#ce9980","#d19982","#8c523f","#8f5946","#784c41","#a17f73","#3187f6","#0452b9","#003e8f","#003e8f","#003e8f","#3187f6"],["#003e8f","#003e8f","#3187f6","#bf8a7b","#c09181","#b17f6f","#ab7864","#b17c67","#d49c83","#ce967f","#945b48","#b37a68","#ac7668","#c99787","#b78773","#af7865","#3187f6","#3187f6","#0452b9","#003e8f"],["#003e8f","#3187f6","#d59c7f","#c58a77","#a97060","#c98f7e","#ca8d7a","#c48671","#d89d83","#d49981","#a0644e","#bf826f","#d39784","#d8a18c","#bf8971","#b87a62","#c3886e","#c78f72","#c68f72","#0452b9"],["#003e8f","#3187f6","#dda78c","#e4ab9b","#dea694","#dba18e","#d79b86","#c88c75","#dea186","#d99c81","#b57760","#b97c67","#d29887","#dca794","#daa790","#d79c86","#d09379","#c98c6e","#c2886c","#3187f6"],["#003e8f","#3187f6","#dfab94","#e2b49d","#e2ad9b","#dba08b","#ca8972","#d28e75","#dfad8f","#dba78a","#b98065","#aa6d54","#cb8e7c","#e2a996","#e6af98","#e4ab95","#d59880","#c5866a","#bd846b","#3187f6"],["#003e8f","#003e8f","#3187f6","#d49885","#c38672","#ac715e","#cc9280","#bd8473","#e8ae99","#e0a691","#a9715b","#b17964","#a36550","#bb7d66","#d99b81","#dc9f83","#d3947a","#c28368","#b87f68","#0452b9"],["#003e8f","#003e8f","#003e8f","#3187f6","#3187f6","#b17a6b","#7a4b3f","#542c21","#b97d71","#b67d70","#582516","#724434","#935947","#b67a64","#b97960","#ce8d6e","#c6856a","#ba7b61","#0452b9","#003e8f"],["#003e8f","#003e8f","#3187f6","#003e8f","#3187f6","#9e6e67","#976d62","#825b4e","#724d40","#704a3d","#71493c","#7b5145","#84554b","#9d6b5e","#b67e69","#bb7e64","#b87a5f","#3187f6","#003e8f","#3187f6"],["#003e8f","#003e8f","#003e8f","#3187f6","#003e8f","#3187f6","#936c5e","#9b6e5f","#8b7064","#7f6153","#886453","#855f4a","#795144","#7f5344","#9e6f5c","#ad7c65","#b78367","#3187f6","#003e8f","#3187f6"],["#003e8f","#003e8f","#003e8f","#003e8f","#003e8f","#0452b9","#3187f6","#8f5e52","#a5625a","#ac6963","#92534e","#7e423e","#754c44","#7e554b","#8c6354","#9d7360","#bc8c73","#3187f6","#003e8f","#003e8f"],["","","","","","#0452b9","#3187f6","#ba9587","#c49986","#b18877","#957063","#735247","#4f241c","#6c4136","#8a6050","#ab846f","#c4987e","#0452b9","#003e8f","#003e8f"],["","","","","","#3187f6","#ac6963","#cc8584","#c68483","#c78481","#be7974","#b87069","#a2685d","#ab7465","#ae7c67","#be9174","#be9074","#ae7c60","#0452b9","#003e8f"],["","","","","","#3187f6","#9e685c","#a16b61","#9d6963","#a06c64","#a9756a","#a67366","#3187f6","#3187f6","#3187f6","#c0927a","#ae8267","#9c6f55","#3187f6","#003e8f"],["","","","","","#3187f6","#bd8779","#b78175","#b5847c","#b48279","#b28175","#0452b9","#003e8f","#003e8f","#003e8f","#3187f6","#3187f6","#91674f","#3187f6","#003e8f"],["","","","","","#003e8f","#3187f6","#3187f6","#3187f6","#3187f6","#0452b9","#003e8f","#003e8f","#3187f6","#003e8f","#003e8f","#0452b9","#0452b9","#003e8f","#003e8f"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "rice",
    name: "a single grain of rice",
    grid: [
        "X",
        "X"
      ],
    color: [["#c4c5bf","#eaebe6"],["#d5d6cd","#f2f3ec"],["#d5d6cd","#f2f3ec"],["#c4c5bf","#eaebe6"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "tomatoeone",
    name: "just a cherry tomatoe",
    grid: [
        "X"
      ],
    color: [["#850000","#2a6006","#850000"],["#db9595","#850000","#610000"],["#610000","#850000","#610000"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "hourglass",
    name: "an hourglass",
    grid: [
        ".X",
        "X."
      ],
    color: [["","","","","#bdf7ff","#bdf7ff","#bdf7ff","#bdf7ff"],["","","","","#e8d191","#bdf7ff","#bdf7ff","#f0fdff"],["","","","","#dec47d","#e8d191","#f0fdff","#bdf7ff"],["","","","","#e8d191","#bdaf89","#bdaf89","#bdf7ff"],["#bdf7ff","#bdf7ff","#bdf7ff","#bdaf89","","","",""],["#dec47d","#bdf7ff","#e8d191","#f0fdff","","","",""],["#e8d191","#dec47d","#f0fdff","#bdf7ff","","","",""],["#dec47d","#bdaf89","#bdaf89","#bdf7ff","","","",""]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "tomatoe",
    name: "a tomatoe",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#850000","#2a6006","#2a6006","#850000"],["#db9595","#850000","#850000","#610000"],["#db9595","#850000","#850000","#610000"],["#610000","#850000","#850000","#610000"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "sausage",
    name: "a sausage",
    grid: [
        "X",
        "X",
        "X",
        "X",
        "X",
        "X"
      ],
    color: [["#000001","#9d3e03","#b23b06","#be461c","#000001","#000001"],["#9a4600","#9c3305","#c24d19","#dc6940","#ce4a16","#000001"],["#933c09","#993204","#c4501f","#eda290","#d65526","#8b3806"],["#954011","#a3370a","#c14c1b","#eb9e8d","#d65726","#8d2f05"],["#954013","#9b3307","#b84516","#e69884","#d85928","#953107"],["#954214","#a13709","#c24e1e","#efad99","#da5b2c","#942f04"],["#913a0d","#a5390c","#c04c1b","#e5886c","#e1673c","#8c2902"],["#933a0a","#9f3607","#c04918","#e89f8c","#dc5d30","#912c03"],["#984215","#9d3303","#c5501c","#e89277","#dd5c2d","#942f03"],["#974418","#9e3504","#bd4918","#f1b09c","#e26b44","#9b3306"],["#9a4618","#9a3002","#c14c19","#f09980","#df592a","#a13707"],["#9e4919","#9f3605","#be4c19","#f0967b","#e26337","#a23807"],["#9a4615","#a43909","#c5501b","#e98666","#e2612d","#a33807"],["#964415","#9b3405","#ca541e","#e8825c","#e05e2f","#9c3507"],["#9d4918","#9d3504","#c04d18","#f19b81","#e56a42","#983003"],["#9e4815","#a03909","#c7521d","#ec9172","#e56837","#993205"],["#9c4816","#a63c0e","#c2501b","#ee9271","#e36838","#a2390a"],["#9e4617","#a43b0d","#c4521c","#e88056","#e36c3d","#963303"],["#9f4818","#a43a0a","#c44f1b","#ec8865","#e56b3c","#993405"],["#a04917","#a43b0b","#c24f1b","#ea805a","#df5b28","#953305"],["#9e4818","#a63d0e","#c5501d","#ed9472","#da5b2b","#8c2d04"],["#9b4215","#a23708","#c4521c","#ef9371","#e16433","#973307"],["#9d481a","#a03707","#c44f1b","#e8845f","#dc5c2a","#943003"],["#994311","#a4370b","#c04e1d","#e67851","#da511e","#922f03"],["#9b4616","#9d3305","#c14b16","#e37956","#d95621","#933004"],["#9f4819","#a1380a","#bf4c19","#f09a81","#dd5620","#932f03"],["#9e4717","#a23a0b","#bf4916","#e9815d","#d95927","#912e02"],["#9b4616","#a23807","#be4a17","#eb8560","#db5b25","#8d2b03"],["#9e4716","#9d3609","#c14b19","#e67d5b","#d8541d","#8f2e05"],["#994618","#a5390f","#c14e1d","#e4734b","#e36a3b","#812801"],["#934214","#a13609","#c34c18","#e57752","#dd5d2a","#812702"],["#944214","#9b3207","#c04a16","#dd6c40","#d3541c","#892a02"],["#8c3c10","#9d3608","#bc4c1a","#e5764e","#d3511a","#993405"],["#8a3d12","#9a350a","#bf4c1c","#e67344","#d04f19","#a03f0c"],["#8f4100","#812903","#b04318","#bf4919","#bf4a16","#995111"],["#000001","#93460f","#812708","#8a2709","#cd7e0a","#000001"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "colour",
    name: "old tv colour bars",
    grid: [
        "XXXX",
        "XXXX",
        "XXXX"
      ],
    color: [["#c0c0c0","#c0c0c0","#c0c000","#c0c000","#00c0c0","#00c0c0","#00c000","#00c000","#c000c0","#c000c0","#c00000","#c00000","#8f8f8f","#8f8f8f","#0000c0","#0000c0"],["#c0c0c0","#c0c0c0","#c0c000","#c0c000","#00c0c0","#00c0c0","#00c000","#00c000","#c000c0","#c000c0","#c00000","#c00000","#8f8f8f","#8f8f8f","#0000c0","#0000c0"],["#c0c0c0","#c0c0c0","#c0c000","#c0c000","#00c0c0","#00c0c0","#00c000","#00c000","#c000c0","#c000c0","#c00000","#c00000","#8f8f8f","#8f8f8f","#0000c0","#0000c0"],["#c0c0c0","#c0c0c0","#c0c000","#c0c000","#00c0c0","#00c0c0","#00c000","#00c000","#c000c0","#c000c0","#c00000","#c00000","#8f8f8f","#8f8f8f","#0000c0","#0000c0"],["#c0c0c0","#c0c0c0","#c0c000","#c0c000","#00c0c0","#00c0c0","#00c000","#00c000","#c000c0","#c000c0","#c00000","#c00000","#8f8f8f","#8f8f8f","#0000c0","#0000c0"],["#c0c0c0","#c0c0c0","#c0c000","#c0c000","#00c0c0","#00c0c0","#00c000","#00c000","#c000c0","#c000c0","#c00000","#c00000","#8f8f8f","#8f8f8f","#0000c0","#0000c0"],["#c0c0c0","#c0c0c0","#c0c000","#c0c000","#00c0c0","#00c0c0","#00c000","#00c000","#c000c0","#c000c0","#c00000","#c00000","#8f8f8f","#8f8f8f","#0000c0","#0000c0"],["#c0c0c0","#c0c0c0","#c0c000","#c0c000","#00c0c0","#00c0c0","#00c000","#00c000","#c000c0","#c000c0","#c00000","#c00000","#8f8f8f","#8f8f8f","#0000c0","#0000c0"],["#8f8f8f","#0000c0","#0000c0","#131313","#131313","#c00000","#c00000","#0000c0","#0000c0","#131313","#131313","#00c000","#00c000","#00c0c0","#00c0c0","#131313"],["#00214c","#00214c","#00214c","#ffffff","#ffffff","#ffffff","#32006a","#32006a","#32006a","#383838","#383838","#383838","#131313","#131313","#090909","#131313"],["#00214c","#00214c","#00214c","#ffffff","#ffffff","#ffffff","#32006a","#32006a","#32006a","#383838","#383838","#383838","#131313","#131313","#090909","#131313"],["#00214c","#00214c","#00214c","#ffffff","#ffffff","#ffffff","#32006a","#32006a","#32006a","#383838","#383838","#383838","#131313","#131313","#090909","#131313"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "there",
    name: "finger pointy",
    grid: [
        "XXXXX",
        "XXXXX"
      ],
    color: [["#fefdfe","#fefefe","#fffef9","#fbffff","#fffcf9","#feffff","#fafffe","#feffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#e8c1a5","#e8c1a5","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#fefefe","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#feffff","#fdfdfd","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#e6c1a4","#e8c1a5","#ebc4a7","#e5be9f","#e7bd9f","#e9c0a2","#e8c2a3","#efc8ab","#ecc5a8","#eac1a3","#eac3a7","#ecc5ab","#e9c2a8","#efcdb4","#f3cfb7","#f1ccb2","#f1ccaf","#f1caab","#eec7aa","#f0c9ac","#f2cfb8","#edc9af","#e7bd9f","#f0c1a9","#f0c9af","#ffffff","#ffffff","#ffffff","#f8fdff","#fcfeff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#dfb293","#e0b497","#e1b99a","#e5b99c","#e2b596","#dfae8e","#ddab8a","#dcaa87","#dba684","#dba988","#daa988","#dcaa89","#dda687","#dfac8d","#e4b89b","#e6b594","#edc1a4","#eec1a2","#f0c9aa","#efc8ab","#efcaaf","#eac5ab","#f0ceb5","#f1cdb3","#edc9af","#eac6ae","#f4c7aa","#eec3a3","#e7b394","#eeceb5","#ead1b2","#efceb9","#efc6b2","#efc6b2","#ffffff"],["#d19e81","#d6a78b","#d8ab8e","#d8a98b","#d8a988","#d6a585","#d3a685","#d6a182","#d09779","#d29c7a","#d39c7d","#d0997a","#cd9274","#c78e71","#cf997f","#d9ac8f","#daa687","#d8a07f","#dbaa89","#dfaf91","#deaf8f","#e0b595","#e5c1a7","#e3b9a0","#e4b99d","#e7bda4","#dfb092","#d8a07f","#d78f6f","#d68f6f","#d99072","#d6886a","#c77d67","#c77d67","#ffffff"],["#cb9779","#cf9a82","#d29b7f","#d1a082","#d2a183","#cf9c7e","#ce9879","#cb9577","#c68d6f","#c4876a","#c38569","#c18367","#be8066","#bb7d62","#b6785e","#c78b6e","#daad93","#d29d81","#d59f80","#deac8d","#d8a484","#d0a184","#d2a087","#c7886d","#d49a7e","#cd8870","#bd6d56","#c27058","#ffffff","#fffdff","#fffdfc","#fdfffe","#fdfeff","#ffffff","#ffffff"],["#c58e73","#c88f74","#cb9378","#cd967a","#cb937a","#c69076","#c58b73","#c1876f","#bd836b","#b97f67","#bd836b","#b98166","#b88069","#b37b64","#b47b64","#b47c67","#bd8473","#c7856d","#d4a182","#d39d7d","#d6a887","#c99178","#bf816a","#9f543d","#a75c46","#ad5d42","#7d432f","#fafaf4","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#ce9b80","#c7957a","#c9987f","#c9977e","#cc9a81","#c9957b","#c48e74","#c38d75","#c39178","#bd8d76","#be8a74","#c18f78","#c39584","#e2cabe","#fdfefd","#ffffff","#ffffff","#af715e","#b97b64","#d0967e","#d9a78a","#e0b298","#d8b197","#bd6c53","#853c26","#63281e","#c1836c","#c17f69","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#c5977d","#cb9c85","#cb9b84","#cb9e86","#cd9f88","#cc9e86","#c89881","#c5967c","#c3907a","#c29079","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#fcfdfe","#ab7460","#bd846e","#c88f74","#d6a786","#e7c3ad","#e6bba2","#fff7fe","#7f3a28","#c27156","#d39e86","#fcfeff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#c8967d","#c7957c","#c99982","#c99b84","#c89a83","#ffffff","#ffffff","#ffffff","#ffffff","#fcfefc","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#f9fcf7","#b07e6d","#bc8570","#b97960","#d59e80","#e8c2ab","#ebbea6","#e3a08a","#d18868","#d3a798","#fdfdfc","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#b5816c","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#fdfcfa","#d0baaf","#ca9b87","#bf826d","#d4987c","#e8bea5","#e7b9a1","#dead9a","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#f5feff","#fefeff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#fffdff","#fffef9","#deb9ae","#b9725a","#d59b80","#d3856e","#fcfefe","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#fefefe","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#c9998c","#c49482","#d99d95","#fbefe7","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "nicholas",
    name: "Nicholas Cage",
    grid: [
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX"
      ],
    color: [["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458"],["#d18458","#d18458","#d08456","#d08357","#d08655","#d08357","#d08357","#cf8455","#cf8456","#d08357","#d08355","#d08355","#d08355","#d08357","#d08355","#d08455","#cf8355","#d08456","#d08355","#d08355","#cf8354"],["#d18458","#d18456","#d08456","#cf8556","#cf8457","#d18458","#ce8453","#d08657","#d18456","#d08457","#d08556","#cf8355","#cf8355","#cf8556","#cf8556","#ce8356","#d28557","#d08557","#ce8455","#cf8354","#cf8355"],["#d18458","#d08456","#d18455","#cf8554","#d18458","#d18458","#d18458","#cf8556","#ce8456","#d18457","#d08556","#d08556","#cf8455","#d08355","#d18456","#d18456","#d18456","#cf8656","#d08458","#d08458","#cf8455"],["#d18458","#cf8456","#d18556","#d18458","#d18458","#d18458","#d18458","#cf8556","#d08457","#d08656","#cf8556","#d08355","#d08355","#ce8455","#cf8556","#d18458","#d18556","#cf8554","#d18456","#d18458","#d08355"],["#d18458","#ce8455","#d08456","#d18458","#d18458","#d18458","#d18458","#cf8555","#d08357","#d18457","#d08355","#cf8355","#ce8455","#d18456","#d08555","#d08455","#cf8455","#d08657","#d18557","#d18456","#cf8357"],["#d08455","#d08355","#cf8356","#d08657","#d18458","#d18458","#d18456","#ce8455","#ce8455","#d18456","#cf8556","#ce8355","#d08355","#d08355","#d08355","#d08355","#d18557","#d18456","#d28557","#cf8556","#d08355"],["#d08456","#d08556","#ce8455","#d08355","#d18454","#d18458","#cf8452","#c67d4e","#cf8254","#cf8554","#d18655","#c77d52","#ad6f47","#a56747","#a9683d","#be7649","#ce8352","#ce8455","#d18456","#d08355","#cf8254"],["#d18458","#d08357","#cf8455","#d08355","#cc8050","#854f2c","#624229","#502e19","#8a5939","#be7952","#c88256","#9a6843","#704329","#5c3821","#56361d","#5b321c","#945530","#cf8254","#cf8355","#cf8254","#ce8153"],["#d18458","#d18458","#d18457","#cf8455","#a76239","#be7d4d","#ad6a41","#9f5d3d","#bb7a58","#c17a47","#cb8a5a","#a96e4c","#aa5f3e","#ad6846","#a45c39","#8e5534","#88512e","#cb804e","#ce8153","#d08355","#d08355"],["#d18458","#d18458","#d18456","#d08354","#bb6f41","#512411","#4e462c","#a58a7a","#c37a54","#bc7844","#c88356","#a86a3f","#a86041","#624d33","#8d614f","#552919","#a65f34","#d18353","#d08355","#d08355","#cf8554"],["#d18458","#d08455","#d08456","#ce8455","#c87d4a","#bd6f46","#a56242","#ba7551","#c68356","#c27847","#c87d52","#a3663b","#c17c54","#b47150","#ab6947","#a76740","#cd814d","#d08353","#cf8254","#ce8455","#d08455"],["#d18457","#d18456","#cf8455","#cf8556","#d08457","#cf8355","#d08455","#cf8356","#cf8456","#c37845","#d2845d","#a5603a","#ce8356","#ce8455","#cd8455","#cf8355","#d18457","#d08355","#d08357","#d08355","#d08355"],["#ce8455","#ce8455","#d08458","#d18458","#d08357","#ce8354","#cf8351","#d18458","#c47844","#c47845","#cb7955","#9d5c38","#bf7544","#ce8455","#d08254","#cf8354","#ce8153","#d08355","#ce8455","#d08355","#d18456"],["#ce8455","#cf8455","#d18458","#d18458","#d18458","#d18458","#ce8455","#d08455","#c47444","#c6774a","#c87b58","#a26140","#b97952","#ce8455","#ce8455","#cf8355","#cf8455","#cf8456","#d08355","#d08455","#ce8455"],["#ce8455","#cf8556","#d18458","#d18458","#d18458","#d18458","#cf8556","#cc7f54","#ce7b55","#c77c54","#c98566","#b16a4c","#924729","#cf8353","#ce8455","#cf8254","#d08457","#d08357","#d08355","#cf8557","#cf8455"],["#cf8556","#d08655","#d18458","#d18458","#d18458","#d18458","#ce8455","#ca8156","#884636","#84452f","#8f5c44","#955744","#af6e4c","#cf8456","#ce8455","#ce8354","#d18456","#d18556","#d08355","#d08355","#d08355"],["#d08456","#cf8556","#d08556","#d18458","#d18457","#ce8455","#ce8455","#cd8357","#c27c55","#bc7b55","#ad765a","#ab6a51","#a7684c","#cc8357","#cf824e","#d18458","#d08554","#d08455","#d08355","#d08455","#cf8254"],["#d18456","#d08355","#d08556","#d08559","#cf8455","#d18456","#c98054","#be7c56","#bc7551","#c67d5e","#bd7b5c","#b77659","#a66749","#b67752","#d08353","#d08355","#d08355","#cf8455","#d18457","#cf8254","#cf8254"],["#d18458","#d18556","#d08455","#d08657","#d08556","#cf8556","#cb8355","#bc7c56","#af5b41","#994938","#a35241","#7e4433","#7c4231","#a46745","#cb8051","#d08355","#d08355","#d08455","#d18456","#d08456","#d18456"],["#d18458","#d18458","#d18458","#d18457","#d08557","#d18458","#ca8655","#9b543d","#bea280","#c5a581","#cbab86","#c2a88d","#973b2a","#b27248","#cd8351","#d08355","#d08457","#d18458","#d18457","#ce8455","#d08355"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#cd8555","#c48355","#b96442","#ba5e46","#bc624d","#b5593f","#9e593e","#bb7a52","#ce8352","#cf8455","#cf8355","#d08557","#d18456","#cf8355","#cf8254"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#c78355","#bc754d","#ad6448","#a8644d","#9a5846","#ba7c55","#bf7b4e","#cf8352","#d08456","#d18457","#cf8556","#d08355","#d08355","#cf8354"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d08558","#c58154","#c4805c","#a7664c","#b67556","#bb7c55","#cf8256","#cf8455","#d18458","#d18457","#d08357","#d08456","#d08355","#d08357"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d08556","#cd8155","#c87e55","#c87e53","#ca8053","#ce8455","#d08556","#d18458","#d18458","#d18458","#d18458","#d08557","#d08355"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d08357","#d08355","#d08355","#d08456","#d08655","#d18458","#d18458","#d18458","#d18458","#d08455","#cf8355"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18456","#d08355","#cf8556","#d18456","#d08557","#d08456","#d18457","#d08456","#d08355","#ce8455","#cf8355"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18456","#ce8455","#cf8455","#d08557","#d08455","#cf8455","#cf8457","#ce8455","#cf8354","#d08355","#d08455"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18456","#ce8354","#ce8455","#d08656","#d18456","#d18456","#ce8354","#ce8455","#cf8256","#d08355","#cf8556"],["#cf8356","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18457","#cf8456","#ce8455","#d08456","#cf8455","#cf8556","#d08355","#ce8354","#d08355","#d08355","#d18657"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458"],["#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458","#d18458"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "chess",
    name: "white to mate in 1",
    grid: [
        "XXXX",
        "XXXX",
        "XXXX",
        "XXXX"
      ],
    color: [["#e3dcb5","#3d1500","#e3dcb5","#8ee576","#e3dcb5","#8ee576","#e3dcb5","#8ee576"],["#3d1500","#3d1500","#3d1500","#e3dcb5","#8ee576","#e3dcb5","#8ee576","#e3dcb5"],["#e3dcb5","#8ee576","#e3dcb5","#8ee576","#e3dcb5","#8ee576","#e3dcb5","#8ee576"],["#8ee576","#3d1500","#8ee576","#ffffff","#3d1500","#e3dcb5","#8ee576","#e3dcb5"],["#e3dcb5","#8ee576","#e3dcb5","#8ee576","#e3dcb5","#8ee576","#e3dcb5","#8ee576"],["#ffffff","#e3dcb5","#8ee576","#e3dcb5","#8ee576","#e3dcb5","#8ee576","#e3dcb5"],["#e3dcb5","#ffffff","#ffffff","#8ee576","#e3dcb5","#8ee576","#e3dcb5","#8ee576"],["#8ee576","#ffffff","#8ee576","#e3dcb5","#8ee576","#e3dcb5","#8ee576","#e3dcb5"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 0,
  },
  {
    id: "smallintestine",
    name: "the small intestine",
    grid: [
        "X"
      ],
    color: [["#d7a2c1","#f3b4da","#d279ad","#feb4db","#feb4db","#feb4db","#feb4db"],["#feb4db","#4f3644","#261c26","#261c26","#261c26","#261c26","#261c26"],["#f3b4da","#feb4db","#feb4db","#e5cce5","#f3b4da","#feb4db","#feb4db"],["#261c26","#261c26","#261c26","#261c26","#261c26","#4f3644","#e5cce5"],["#d279ad","#feb4db","#feb4db","#feb4db","#feb4db","#feb4db","#f3b4da"],["#feb4db","#4f3644","#261c26","#271627","#261c26","#140f12","#8f667e"],["#a07990","#feb4db","#d279ad","#d279ad","#feb4db","#feb4db","#140f12"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "largentestine",
    name: "the large intestine",
    grid: [
        "XXXX",
        "X..X",
        "X..X",
        "X.XX"
      ],
    color: [["#4e223a","#4e223a","#932a62","#911256","#932a62","#911256","#911256","#932a62","#911256","#911256","#4e223a","#4e223a"],["#4e223a","#911256","#911256","#911256","#911256","#944c74","#944c74","#944c74","#944c74","#944c74","#911256","#4e223a"],["#911256","#911256","#911256","#932a62","#911256","#4e223a","#4e223a","#911256","#932a62","#911256","#911256","#911256"],["#911256","#911256","#911256","","","","","","","#911256","#911256","#932a62"],["#932a62","#911256","#4e223a","","","","","","","#932a62","#911256","#911256"],["#4e223a","#911256","#4e223a","","","","","","","#911256","#911256","#911256"],["#4e223a","#911256","#932a62","","","","","","","#932a62","#911256","#932a62"],["#4e223a","#911256","#932a62","","","","","","","#4e223a","#911256","#911256"],["#911256","#911256","#944c74","","","","","","","#4e223a","#911256","#911256"],["#4e223a","#911256","#944c74","","","","#4e223a","#4e223a","#4e223a","#4e223a","#911256","#4e223a"],["#4e223a","#911256","#911256","","","","#4e223a","#911256","#911256","#932a62","#932a62","#4e223a"],["#4e223a","#911256","#4e223a","","","","#4e223a","#911256","#932a62","#4e223a","#4e223a","#4e223a"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    nextShapeProbs: [
        1
      ],
    nextShapes: [
        "smallintestine"
      ],
  },
  {
    id: "eyeball",
    name: "an eyeball",
    grid: [
        "...XXX",
        "XXXXXX",
        "...XXX"
      ],
    color: [["","","","","","","#65494e","#fea4b6","#fed7de","#feecec","#fbffdb","#b0b493"],["","","","","","","#fea4b6","#fed7de","#feecec","#fbffdb","#f7ddc5","#9b5717"],["#fea4b6","#fea4b6","#fea4b6","#fea4b6","#fea4b6","#fea4b6","#fea4b6","#fed7de","#fbffdb","#fbffdb","#9b5717","#ffffff"],["#65494e","#65494e","#a65969","#a65969","#a65969","#a65969","#fea4b6","#fed7de","#fbffdb","#fbffdb","#9b5717","#050505"],["","","","","","","#fea4b6","#fea4b6","#fed7de","#fbffdb","#f7ddc5","#9b5717"],["","","","","","","#65494e","#fea4b6","#fea4b6","#fed7de","#fbffdb","#b0b493"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "paino",
    name: "a grand paino",
    grid: [
        "XX.",
        "XXX",
        "XXX"
      ],
    color: [["#171717","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#171717","","",""],["#1c1c1c","#1c1c1c","#b0b0b0","#1c1c1c","#1c1c1c","#1c1c1c","","",""],["#1c1c1c","#878787","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","","",""],["#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#171717"],["#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c"],["#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c","#1c1c1c"],["#1c1c1c","#171717","#171717","#171717","#171717","#171717","#171717","#171717","#171717"],["#e6e6e6","#171717","#e6e6e6","#171717","#e6e6e6","#171717","#e6e6e6","#171717","#e6e6e6"],["#e6e6e6","#171717","#e6e6e6","#171717","#e6e6e6","#171717","#e6e6e6","#171717","#e6e6e6"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 0,
  },
  {
    id: "foot",
    name: "a foot",
    grid: [
        "...XXX",
        "...XXX",
        "...XXX",
        "...XXX",
        "XXXXXX",
        "XXXXXX"
      ],
    color: [["","","","","","","","","","","","","","","","#442629","#532f2f","#69413f","#8e6259","#a67868","#c59983","#caaa96","#d9bca9","#e2c7b6","#e6d1c0","#e5d1c0","#dfc9b8","#d2b8a8","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#492527","#623a38","#7b574b","#9e715f","#c0917a","#ccad91","#d7bda7","#e3c9ba","#e7cdbe","#e3cebd","#dfcebc","#d8b9ac","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#3f2528","#4e312d","#785049","#996d5c","#bd9179","#cda990","#dcbeac","#ddc6b4","#e5cbbc","#e5cbbc","#dec9b8","#d1b7a8","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#382526","#522a2a","#6d4543","#936c5c","#b78771","#cba38a","#dabda8","#e0c8b7","#e8cebf","#ead0c1","#e0c6b7","#d6c0b0","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#49282b","#66413f","#946759","#b1816d","#cba386","#d9b9aa","#e1c6b5","#ead0c0","#e6ccbd","#e1c7b8","#dabfb4","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#4c2828","#5d3431","#866056","#a97866","#cba388","#dcbea6","#e5cab4","#e9cfc0","#ebd1c2","#e5cbbc","#d7baaf","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#3c2621","#633b3b","#805954","#a57968","#cca187","#dbbca5","#e5c9b8","#e4cab9","#ecd2c3","#e7cdbe","#d4b4a7","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#47252a","#552e2d","#7a5449","#a37565","#c79f82","#d9bda3","#dfc4b3","#e7cdbe","#e8cebf","#e3c9b8","#c8b7a1","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#8bc6bf","#532e31","#724b45","#9c6e5d","#c19980","#d6b5a1","#dec6b0","#e7cdbc","#ead0c1","#e3c9ba","#d3b7a5","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#8bc6bf","#492529","#643f3a","#976c5c","#c19476","#d5b6a2","#e3c8b7","#ebd1c1","#e8cebf","#e4cabb","#d6baaa","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#8bc6bf","#422328","#623a3a","#8d5f50","#b99177","#d0ad91","#e1c2aa","#e2cdbb","#e8d1c3","#e5ccbd","#d6b1a4","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#8bc6bf","#3f2b2a","#613635","#946a5a","#b88971","#cdaf92","#e0c5b1","#e5cab9","#e6ccbd","#e6ccbd","#d3ac9e","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#8bc6bf","#372425","#552d2d","#8d5f51","#b7876f","#c9a98e","#ddc3ab","#e7ccbb","#ebd1c2","#e6ccbd","#be9d92","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#8bc6bf","#372325","#58312e","#8d6154","#b99179","#d3b39e","#ddc0ad","#e8cdb8","#ecd2c3","#e2c8b9","#a8a3a6","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#8bc6bf","#402423","#5a3232","#8e6256","#be8f73","#ceb199","#dabba7","#e2c6b1","#e9cebd","#e6cdbf","#8bc6bf","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#8bc6bf","#502829","#6a453d","#9c7161","#c69d81","#d0b09b","#dcbca7","#e4c5b1","#e8d3c2","#e3c7b9","#8bc6bf","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#8bc6bf","#563b3b","#583534","#815748","#aa7668","#c9a184","#d9b59d","#dabba7","#e0c5b3","#e7cdbc","#e1c5ba","#8bc6bf","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#5d3534","#693b38","#906253","#af7d64","#c89b86","#cca78d","#d6b09b","#d6b49f","#e2c4af","#e5cbbc","#dec3b4","#8bc6bf","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#916258","#a87665","#b6876c","#c2967b","#d0b093","#d1b198","#cea992","#d2ae96","#dec6ae","#e4cabb","#e2c2b5","#8bc6bf","#8bc6bf","#8bc6bf"],["","","","","","","","","","","","","","","","#8bc6bf","#b68370","#c39a7c","#cba585","#d0ae8b","#debca3","#d4b9a4","#d0ad95","#d5b197","#e4caba","#e8d2c5","#ddc2b3","#dabaab","#8bc6bf","#8bc6bf"],["#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#c79e81","#cea98c","#d0ab8e","#d4b49b","#d6baa3","#dabda8","#dabfaa","#d4b9a4","#d8b29f","#e4c9b5","#e2ccbf","#dbc0ae","#dfbaa7","#8bc6bf","#8bc6bf"],["#8bc6bf","#b47460","#9f6757","#bf886e","#bc8068","#956966","#8c6358","#956b5d","#a36f5e","#a2725e","#a87565","#b48169","#c09076","#c8997f","#c89b80","#cfab93","#d7b49b","#d9b9a4","#dabaa1","#dcc0aa","#dfc5b3","#dbc1ae","#ddbeaa","#dab6a3","#e2bdaa","#e0c5b6","#debdac","#d9ba9f","#8bc6bf","#8bc6bf"],["#997975","#b56c54","#c6947f","#ce9577","#bc8571","#7c473b","#9d6954","#b17e61","#bd9176","#c3957b","#bb8d73","#c7987e","#ca9d82","#d0a489","#d2ad93","#cbab96","#dfbba3","#dbbea9","#e6c8b6","#e0c9b7","#e3c9b8","#dfc5b4","#dcc1b0","#debdaa","#d9baa6","#dabea9","#dfc0ac","#ddb8a5","#daab98","#8bc6bf"],["#8bc6bf","#b3654d","#cd8c7a","#7c4e56","#844940","#c7856a","#d0a78b","#b97e6b","#c59b7f","#c9a185","#cba78d","#caa38c","#cda88b","#cba58e","#d9b4a0","#d8b8a3","#d8b9a5","#e2c8b6","#e5ccbc","#e5cbba","#ead0c1","#e4cabb","#ddc2ae","#e0c0af","#ddbeaa","#dfc1b0","#e0c0ab","#dcbba8","#ddae99","#8bc6bf"],["#8bc6bf","#8bc6bf","#492827","#7e493e","#cc7d65","#b6958b","#b36960","#d0a385","#be927e","#cb9278","#cda88e","#cfa992","#d3b39a","#cfa992","#d2b29e","#dcbda9","#e2c4af","#e4c9b4","#e5cab9","#e7cbba","#e8cebd","#e1c7b8","#e1c5b4","#d8b8a9","#dab9a7","#ddb9a2","#dbbba6","#e2c0a7","#dab4a3","#8bc6bf"],["#8bc6bf","#8bc6bf","#a68e8d","#bb715a","#d0a184","#8f5049","#cb8469","#7c586a","#ca886a","#d6ab8e","#c88c84","#d2ab91","#d8b7a4","#dabca8","#dcc1ac","#ddc2ad","#e0c5b0","#e1c2ae","#e4c5b1","#e3c4b0","#e4c7b3","#e4c2b3","#ddbeaa","#e0bfac","#dfbdaa","#ddb9a1","#dfbca4","#dcb39d","#e7baa3","#8bc6bf"],["#8bc6bf","#8bc6bf","#974f41","#a3624f","#6b3a41","#bd755d","#ab8178","#af6653","#ceb198","#b87564","#caa789","#d9b197","#e3c3ae","#e2c8b7","#e4c9b8","#e3c8b3","#e1c6b2","#e0c5b4","#e5c6b2","#e3c6b1","#ddbeaa","#e2beab","#e4c0b0","#dab9a6","#ddbca3","#dbb69f","#dfb49c","#e4bca3","#e5b59f","#8bc6bf"],["#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#c26c54","#c57a5d","#723e3b","#d28267","#633539","#cf926e","#d8b4a4","#deb59f","#e5c3aa","#e0c5b0","#e5cab9","#e7ccbb","#e6cbb6","#e3c5b3","#e5c0ad","#dfbaa8","#e0bba9","#e3baa8","#d9ac97","#dcad97","#dcad98","#dbad96","#e0b29c","#deab98","#c59a92","#8bc6bf"],["#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#92543f","#ca8c77","#dda993","#d9b79d","#e7c1ae","#e8c3b0","#e3c6b3","#e7c3ac","#d9a894","#d19a8d","#cf9484","#c78d83","#c7836f","#c6856d","#d08a78","#d0937e","#d49e86","#c48676","#8bc6bf","#8bc6bf"],["#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf","#8bc6bf"]],
    difficulty: 4,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "juggling",
    name: "juggling balls",
    grid: [
        ".X.",
        "...",
        "X.X"
      ],
    color: [["","","#e8e345","#2b00ff","",""],["","","#2b00ff","#e8e345","",""],["","","","","",""],["","","","","",""],["#235756","#ff0000","","","#008002","#9c9c9c"],["#ff0000","#235756","","","#9c9c9c","#008002"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "orbiting",
    name: "orbiting moons",
    grid: [
        "X",
        ".",
        "X"
      ],
    color: [["#616161","#c7dee1","#9a9d9e","#616161"],["#c7dee1","#9a9d9e","#919191","#919191"],["#9a9d9e","#9a9d9e","#919191","#919191"],["#616161","#919191","#919191","#616161"],["","","",""],["","","",""],["","","",""],["","","",""],["#616161","#c7dee1","#9a9d9e","#616161"],["#c7dee1","#9a9d9e","#919191","#919191"],["#9a9d9e","#919191","#919191","#919191"],["#616161","#919191","#919191","#616161"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "inchworm",
    name: "an inchworm",
    grid: [
        ".XX.",
        "XXXX"
      ],
    color: [["","","","#175e0d","#6ec63f","#46c700","#6ec63f","#46c700","#175e0d","","",""],["","","","#6ec63f","#3e9f09","#3e9f09","#46c700","#6ec63f","#46c700","","",""],["","","","#46c700","#3e9f09","#175e0d","#46c700","#6ec63f","#46c700","","",""],["#c2ea86","#c2ea86","#46c700","#6ec63f","#3e9f09","#175e0d","#46c700","#6ec63f","#6ec63f","#6ec63f","#6ec63f","#175e0d"],["#c2ea86","#a7d364","#46c700","#46c700","#3e9f09","#175e0d","#3e9f09","#3e9f09","#3e9f09","#3e9f09","#3e9f09","#46c700"],["#c2ea86","#46c700","#46c700","#3e9f09","#3e9f09","#175e0d","#175e0d","#175e0d","#175e0d","#175e0d","#3e9f09","#3e9f09"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "worm",
    name: "a worm",
    grid: [
        "X",
        "X",
        "X"
      ],
    color: [["#95849f","#b9a7c3","#eac2ff"],["#a37fa4","#d292d3","#d292d3"],["#b9a7c3","#eac2ff","#eac2ff"],["#a37fa4","#d292d3","#d292d3"],["#b9a7c3","#eac2ff","#eac2ff"],["#a37fa4","#d292d3","#d292d3"],["#b9a7c3","#eac2ff","#eac2ff"],["#a37fa4","#d292d3","#d292d3"],["#95849f","#b9a7c3","#eac2ff"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "little2",
    name: "a dirty little block that knows what it did",
    grid: [
        "X"
      ],
    color: "#f7a6e8",
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "seeyou1",
    name: "an eye that watches you while you sleep",
    grid: [
        "X"
      ],
    color: [["#ffffff","#ffffff","#7b8ca7","#7b8ca7","#7b8ca7","#ffffff","#ffffff"],["#ffffff","#7b8ca7","#383b5c","#383b5c","#383b5c","#7b8ca7","#ffffff"],["#7b8ca7","#383b5c","#383b5c","#000001","#d4d6f2","#383b5c","#7b8ca7"],["#7b8ca7","#383b5c","#000001","#000001","#000001","#383b5c","#7b8ca7"],["#7b8ca7","#383b5c","#383b5c","#000001","#383b5c","#383b5c","#7b8ca7"],["#ffffff","#7b8ca7","#383b5c","#383b5c","#383b5c","#7b8ca7","#ffffff"],["#ffffff","#ffffff","#7b8ca7","#7b8ca7","#7b8ca7","#ffffff","#ffffff"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "seeyou2",
    name: "an eye that sees into your dreams",
    grid: [
        "X"
      ],
    color: [["#ffffff","#ffffff","#a46346","#a46346","#a46346","#ffffff","#ffffff"],["#ffffff","#a46346","#561a01","#561a01","#561a01","#a46346","#ffffff"],["#a46346","#561a01","#561a01","#000001","#d4d6f2","#561a01","#a46346"],["#a46346","#561a01","#000001","#000001","#000001","#561a01","#a46346"],["#a46346","#561a01","#561a01","#000001","#561a01","#561a01","#a46346"],["#ffffff","#a46346","#561a01","#561a01","#561a01","#a46346","#ffffff"],["#ffffff","#ffffff","#a46346","#a46346","#a46346","#ffffff","#ffffff"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "seeyou3",
    name: "an eye that watches you play extris",
    grid: [
        "X"
      ],
    color: [["#ffffff","#ffffff","#89dd88","#89dd88","#89dd88","#ffffff","#ffffff"],["#ffffff","#89dd88","#146313","#146313","#146313","#89dd88","#ffffff"],["#89dd88","#146313","#146313","#000001","#d4d6f2","#146313","#89dd88"],["#89dd88","#146313","#000001","#000001","#000001","#146313","#89dd88"],["#89dd88","#146313","#146313","#000001","#146313","#146313","#89dd88"],["#ffffff","#89dd88","#146313","#146313","#146313","#89dd88","#ffffff"],["#ffffff","#ffffff","#89dd88","#89dd88","#89dd88","#ffffff","#ffffff"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "doorway",
    name: "the doorway",
    grid: [
        "X",
        "X"
      ],
    color: [["#5e1e08","#5e1e08","#5e1e08","#5e1e08","#5e1e08","#5e1e08","#5e1e08"],["#5e1e08","#9eefff","#9eefff","#9eefff","#9eefff","#9eefff","#5e1e08"],["#5e1e08","#fcffcc","#9eefff","#9eefff","#9eefff","#9eefff","#5e1e08"],["#5e1e08","#9eefff","#9eefff","#9eefff","#fcffcc","#fcffcc","#5e1e08"],["#5e1e08","#9eefff","#fcffcc","#fcffcc","#fcffcc","#fcffcc","#5e1e08"],["#5e1e08","#9eefff","#9eefff","#9eefff","#9eefff","#9eefff","#5e1e08"],["#5e1e08","#fcffcc","#fcffcc","#9eefff","#9eefff","#9eefff","#5e1e08"],["#5e1e08","#9eefff","#9eefff","#9eefff","#9eefff","#9eefff","#5e1e08"],["#5e1e08","#fcffcc","#9eefff","#9eefff","#9eefff","#9eefff","#5e1e08"],["#5e1e08","#fcffcc","#fcffcc","#9eefff","#fcffcc","#9eefff","#5e1e08"],["#5e1e08","#fcffcc","#fcffcc","#fcffcc","#fcffcc","#fcffcc","#5e1e08"],["#5e1e08","#9eefff","#9eefff","#9eefff","#9eefff","#9eefff","#5e1e08"],["#5e1e08","#9eefff","#9eefff","#9eefff","#9eefff","#9eefff","#5e1e08"],["#5e1e08","#9eefff","#fcffcc","#fcffcc","#fcffcc","#fcffcc","#5e1e08"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "darkness",
    name: "a small black void of darkness",
    grid: [
        "X"
      ],
    color: [["#e8f7f7","#dcfefe","#b2cbd2","#423a7e","#b2cbd2","#dcfefe","#e8f7f7"],["#dcfefe","#8b9eb6","#3c2650","#22142e","#3c2650","#8b9eb6","#dcfefe"],["#b2cbd2","#3c2650","#22142e","#120a1a","#22142e","#3c2650","#b2cbd2"],["#423a7e","#22142e","#120a1a","#0d070c","#120a1a","#22142e","#423a7e"],["#b2cbd2","#3c2650","#22142e","#120a1a","#22142e","#3c2650","#b2cbd2"],["#dcfefe","#8b9eb6","#3c2650","#22142e","#3c2650","#8b9eb6","#dcfefe"],["#e8f7f7","#dcfefe","#b2cbd2","#423a7e","#b2cbd2","#dcfefe","#e8f7f7"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "another",
    name: "another mouth to feed",
    grid: [
        "XXX",
        "X..",
        "XXX"
      ],
    color: [["#d0b886","#d2ab56","#fbc85b","#fbc85b","#fbc85b","#fbc85b","#fbc85b","#fbc85b","#fbc85b"],["#d2ab56","#fbc85b","#e7936f","#d41c6c","#d41c6c","#d41c6c","#d41c6c","#d41c6c","#d41c6c"],["#c2a361","#fbc85b","#d41c6c","#a5a894","#cdd2b2","#e2e9c4","#f8ffd6","#e2e9c4","#f8ffd6"],["#c2a361","#e7936f","#d41c6c","","","","","",""],["#c2a361","#d41c6c","#902352","","","","","",""],["#c2a361","#e7936f","#d41c6c","","","","","",""],["#d2ab56","#fbc85b","#d41c6c","#a5a894","#cdd2b2","#e2e9c4","#f8ffd6","#e2e9c4","#f8ffd6"],["#d0b886","#d2ab56","#e7936f","#d41c6c","#d41c6c","#d41c6c","#d41c6c","#d41c6c","#d41c6c"],["#d0b886","#d0b886","#d2ab56","#d2ab56","#fbc85b","#fbc85b","#fbc85b","#fbc85b","#fbc85b"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "mouth"
      ],
    zones: {
        "inside": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "...",
            ".##",
            "..."
          ]
        }
      },
  },
  {
    id: "tongue",
    name: "a tongue",
    grid: [
        "X",
        "X",
        "X"
      ],
    color: [["#6f2f5e","#a44c8d","#f46cd0","#a44c8d","#a44c8d"],["#a44c8d","#f46cd0","#f46cd0","#f46cd0","#a44c8d"],["#a44c8d","#f46cd0","#f46cd0","#f46cd0","#f46cd0"],["#f46cd0","#f46cd0","#a4568f","#f46cd0","#f46cd0"],["#f46cd0","#f46cd0","#c85fac","#f46cd0","#f46cd0"],["#f46cd0","#f46cd0","#c85fac","#f46cd0","#c85fac"],["#f46cd0","#f46cd0","#a4568f","#f46cd0","#c85fac"],["#f46cd0","#f46cd0","#a4568f","#f46cd0","#c85fac"],["#f46cd0","#f46cd0","#c85fac","#f46cd0","#c85fac"],["#f46cd0","#f46cd0","#a4568f","#f46cd0","#f46cd0"],["#c85fac","#f46cd0","#c85fac","#f46cd0","#f46cd0"],["#c85fac","#f46cd0","#a4568f","#f46cd0","#c85fac"],["#c85fac","#f46cd0","#a4568f","#f46cd0","#f46cd0"],["#f46cd0","#f46cd0","#a4568f","#f46cd0","#f46cd0"],["#f46cd0","#f46cd0","#a4568f","#f46cd0","#f46cd0"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "egg",
    name: "egg",
    grid: [
        "X"
      ],
    color: [["#fffdd1","#fffdd1","#fffdd1"],["#fffdd1","#ff7300","#fffdd1"],["#fffdd1","#fffdd1","#fffdd1"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "ziggurat",
    name: "The Great Ziggurat of Ur",
    grid: [
        "...XXX...",
        ".XXXXXXX.",
        "XXXXXXXXX",
        "XXXXXXXXX",
        "XXXXXXXXX"
      ],
    color: [["","","","","","","","","","#eb8b3d","#eb8b3d","#c56a20","#c56a20","#c56a20","#de7c2b","#c56a20","#c56a20","#de7c2b","","","","","","","","",""],["","","","","","","","","","#eb8b3d","#623109","#d47425","#de7c2b","#623109","#de7c2b","#c56a20","#623109","#de7c2b","","","","","","","","",""],["","","","","","","","","","#d47425","#623109","#d47425","#d47425","#623109","#de7c2b","#c56a20","#623109","#de7c2b","","","","","","","","",""],["","","","#e28c46","#e28c46","#e28c46","#e28c46","#e28c46","#e28c46","#c2681e","#c2681e","#ad4e00","#ad4e00","#f3ba8c","#ad4e00","#ad4e00","#c2681e","#c2681e","#c2681e","#c2681e","#e28c46","#e28c46","#e28c46","#c2681e","","",""],["","","","#e28c46","#c2681e","#c2681e","#c2681e","#b35e19","#b35e19","#c2681e","#ad4e00","#ad4e00","#ad4e00","#f3ba8c","#ad4e00","#ad4e00","#ad4e00","#c2681e","#c2681e","#b35e19","#b35e19","#c2681e","#c2681e","#c2681e","","",""],["","","","#c2681e","#b35e19","#b35e19","#b35e19","#b35e19","#c2681e","#ad4e00","#ad4e00","#ad4e00","#d89e6e","#844d1f","#d89e6e","#ad4e00","#ad4e00","#ad4e00","#c2681e","#c2681e","#c2681e","#b35e19","#b35e19","#b35e19","","",""],["#e28c46","#e28c46","#e28c46","#e28c46","#e28c46","#e28c46","#e28c46","#e28c46","#ad4e00","#ad4e00","#9d4a06","#9d4a06","#f3ba8c","#f3ba8c","#f3ba8c","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#e28c46","#e28c46","#e28c46","#e28c46","#e28c46","#9d4a06","#9d4a06"],["#e28c46","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#9d4a06","#9d4a06","#9d4a06","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#f3ba8c","#844d1f","#f3ba8c","#ad4e00","#ad4e00","#9d4a06","#9d4a06","#ad4e00","#9d4a06","#9d4a06","#9d4a06","#ad4e00","#ad4e00","#ad4e00","#ad4e00"],["#ad4e00","#ad4e00","#9d4a06","#9d4a06","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#d89e6e","#f3ba8c","#f3ba8c","#f3ba8c","#d89e6e","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#9d4a06","#9d4a06","#9d4a06"],["#ad4e00","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#844d1f","#f3a462","#f3a462","#f3a462","#de7c2b","#de7c2b","#f3ba8c","#844d1f","#844d1f","#844d1f","#f3ba8c","#de7c2b","#de7c2b","#c46b21","#de7c2b","#de7c2b","#844d1f","#ad4e00","#ad4e00","#ad4e00","#ad4e00","#ad4e00"],["#9d4a06","#9d4a06","#ad4e00","#ad4e00","#844d1f","#844d1f","#f3a462","#de7c2b","#de7c2b","#de7c2b","#d89e6e","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#de7c2b","#de7c2b","#c46b21","#c46b21","#844d1f","#844d1f","#ad4e00","#ad4e00","#9d4a06","#9d4a06"],["#ad4e00","#ad4e00","#ad4e00","#844d1f","#844d1f","#844d1f","#de7c2b","#de7c2b","#de7c2b","#f3ba8c","#f3ba8c","#844d1f","#844d1f","#844d1f","#844d1f","#844d1f","#f3ba8c","#f3ba8c","#de7c2b","#de7c2b","#de7c2b","#844d1f","#844d1f","#844d1f","#ad4e00","#ad4e00","#ad4e00"],["#ad4e00","#ad4e00","#844d1f","#844d1f","#844d1f","#844d1f","#de7c2b","#de7c2b","#d89e6e","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#d89e6e","#d89e6e","#d89e6e","#d89e6e","#de7c2b","#c46b21","#844d1f","#844d1f","#844d1f","#844d1f","#ad4e00","#ad4e00"],["#ad4e00","#844d1f","#844d1f","#844d1f","#844d1f","#844d1f","#de7c2b","#d89e6e","#d89e6e","#844d1f","#844d1f","#844d1f","#844d1f","#844d1f","#844d1f","#844d1f","#844d1f","#844d1f","#f3ba8c","#f3ba8c","#de7c2b","#844d1f","#844d1f","#844d1f","#844d1f","#844d1f","#ad4e00"],["#844d1f","#844d1f","#844d1f","#844d1f","#844d1f","#844d1f","#d89e6e","#d89e6e","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#f3ba8c","#d89e6e","#f3ba8c","#844d1f","#844d1f","#844d1f","#844d1f","#844d1f","#844d1f"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "capacity",
    name: "a sentient block with the capacity to suffer",
    grid: [
        "X"
      ],
    color: "#000ba3",
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "feathers",
    name: "a pound of feathers",
    grid: [
        "XXXXXXX",
        "XXXXXXX",
        "XXXXXXX",
        "XXXXXXX",
        "XXXXXXX",
        "XXXXXXX"
      ],
    color: [["#d3cfc9","#c9c3bc","#e6e5df","#ebeae5","#dedbd4","#f4f4f2","#f2f2ee","#f3f2ef","#f3f2ef","#f2f2ee","#bdb7b2","#7b7370","#aaa29d","#c3bcb6","#9b9390","#8f8885","#928b87","#968e8a","#89827d","#bfb7b2","#aca59f","#504947","#847d79","#443d3c","#615b58","#877e7a","#a69e99","#e2e0db","#edece7","#d1ccc6","#dddad3","#c4beb7","#d9d5cf","#d3cec7","#b4aca7","#d7d3cd","#d8d4cc","#a19994","#f1efee","#978f8c","#968d8a","#aea6a0","#bbb3ad","#9f9791","#847c78","#a59e97","#615a57","#8d8480","#9d9490"],["#aca5a0","#ecebe6","#f5f5f3","#f7f7f4","#f8f8f6","#f7f7f5","#f8f8f7","#f7f7f5","#e8e6e1","#cec9c3","#6d6663","#958d89","#d3cec7","#aaa29c","#f2f1ef","#968d89","#ccc6bf","#c0b9b3","#cbc5be","#b2aaa5","#635b59","#a29b96","#978f8b","#a09893","#9d9591","#9c9591","#98928e","#7b7370","#78716d","#d9d7d1","#dbd8d1","#dfdbd5","#dedbd4","#c2bbb4","#bab2ad","#cac4bd","#c2bcb6","#c4beb8","#a09894","#b5afaa","#ada7a3","#8c837f","#bab3ac","#a89f9a","#736a67","#8f8783","#524c4a","#8e8682","#7e7672"],["#d5d1ca","#e6e3de","#eae8e3","#f2f2ee","#f4f3f0","#dddad5","#e1dfd9","#d4cfc8","#a7a19c","#716a66","#98908c","#c2bdb7","#beb7b1","#938b87","#c5c1bd","#aea7a1","#c1bbb5","#b4aea8","#9c9490","#79716e","#a8a39e","#d5d0ca","#dfdcd6","#dedbd5","#ecebe6","#f0efeb","#f1f0ec","#dad6cf","#d3cec8","#948c87","#b1aba6","#c1bcb6","#d1cbc4","#cac4bd","#bdb6b0","#bab4ae","#a29b96","#8b827e","#bbb4af","#c4beb7","#c7c3be","#e9e8e4","#aba29d","#88807c","#615957","#857d79","#6d6562","#6c6562","#736a67"],["#e6e5df","#dcd8d2","#e6e4df","#dfdcd6","#e3e0db","#e5e3dd","#e9e8e3","#eae8e3","#d8d5d0","#7c7572","#938b87","#cec8c1","#c4bdb6","#9e9793","#6f6764","#7b7471","#8b8380","#b3aca7","#a8a19b","#cfccc7","#edebe6","#d8d4cd","#e1ded8","#edede8","#d5d0c9","#f5f5f3","#ccc7c1","#e8e6e1","#f4f3f0","#edece7","#a19894","#655d5a","#908783","#807874","#7e7874","#88817d","#cec9c2","#b6aea9","#beb7b2","#b9b2ac","#b1a9a4","#a69d98","#f2f1ef","#8a817d","#655d5b","#706864","#827975","#56504c","#544d4b"],["#dad6d0","#d2ccc6","#dddad4","#e5e3de","#e4e2dc","#dedad5","#e2dfd9","#e8e6e1","#877f7b","#8d8581","#a39b96","#ccc6bf","#9f9793","#7c7471","#6a635f","#8b837f","#d0cbc3","#d2cdc5","#a8a09b","#e9e8e3","#d9d5ce","#d8d4cd","#d6d2cc","#f4f3f0","#f2f1ee","#e3e0db","#e9e8e3","#f7f7f5","#f6f5f2","#e4e1dc","#b5aea8","#78706e","#b8b2ad","#d0cbc4","#cdc8c1","#a69e98","#928a86","#938a86","#9b938e","#9c948f","#a8a09b","#97908b","#9b928d","#deddd9","#7c7471","#665e5a","#756d6a","#77726e","#554f4c"],["#e6e4de","#edece7","#e0ddd7","#dedbd5","#e0ddd7","#e7e5e0","#e6e4df","#847c79","#7e7672","#736b68","#b6b0a9","#948c88","#645d5a","#9c9590","#dcd9d2","#c0b8b2","#d1cbc5","#d0cbc5","#dfdbd6","#dad6d0","#d4d0c9","#e7e5e0","#ecebe7","#dad7d1","#ddd9d3","#d8d5cf","#f9f9f7","#eeedea","#d4cfc8","#dfdbd5","#e5e2dd","#8a827f","#554f4c","#867e79","#a49b97","#bcb4ae","#d7d3cc","#d4d0c9","#aaa19c","#a69e99","#7b7370","#8b837f","#6e6763","#8e8481","#dbd9d4","#d8d6d4","#58514e","#6c6360","#9a928e"],["#d4d0ca","#bab5b0","#c7c3be","#c4c0bb","#c2bfba","#a7a29d","#7b736f","#857d79","#7d7570","#b8b1ab","#99928e","#665f5c","#8d8580","#d7d3cc","#cfcac2","#d3cec7","#e7e6e1","#bcb4ad","#e7e6e0","#cbc4bd","#dbd7d0","#eeede9","#e8e6e0","#d8d4cd","#e8e7e1","#f5f4f2","#e5e2de","#d8d4ce","#e4e2dc","#f2f2ed","#e7e5e0","#8a827e","#564e4c","#736b68","#68605d","#968f8a","#7f7774","#6e6562","#8b837f","#c5bfb7","#afa7a2","#a19994","#88807c","#726967","#6d6462","#7e7572","#e3e2e0","#7a716e","#f7f6f4"],["#e7e5e0","#e3e0d9","#dddad3","#cecac4","#d3d0c9","#a49d98","#645d5b","#b1aaa4","#938a86","#655e5b","#99908d","#79716e","#cfc9c2","#cec9c1","#c6c0b8","#ccc6bf","#d2ccc5","#c8c2ba","#e1ded8","#d5d0c8","#dedcd6","#e0dcd7","#eceae5","#f4f4f2","#d3cec8","#dddad3","#f0efec","#f0efeb","#edece8","#ebe9e4","#ddd9d3","#7d7572","#7f7673","#988f8b","#7c7470","#4d4644","#514a48","#514a48","#a19894","#b1a9a4","#8f8682","#6f6865","#58514f","#69605d","#69615d","#524b48","#d2cdc7","#d6d3d0","#bcb5ae"],["#cfcac2","#cfc9c2","#d0cac3","#dfdbd5","#ccc6c1","#756d6a","#675f5c","#6e6764","#88807c","#bab2ac","#cac5bd","#9c9692","#dcd8d2","#c3bdb6","#d5d1ca","#d5d1cb","#d3cec7","#d8d4cd","#a79f9a","#e1ded8","#dedcd6","#cdc7c1","#e2e0db","#c4beb8","#ebeae5","#efefea","#f3f2ef","#e3dfd9","#d3cec7","#d6d1ca","#b9b2ac","#807774","#948c87","#cdc8c2","#968e8a","#635b58","#494441","#433c3a","#918a86","#605956","#5f5855","#918985","#7e7773","#59524f","#675f5c","#615956","#6d6562","#afa9a4","#b0aba7"],["#d4cfc8","#e1ded9","#e2dfd9","#a39a95","#77706c","#b1aaa5","#4d4844","#655e5c","#bbb4ae","#dddad4","#cbc6bf","#b6b1ac","#d3cec6","#b9b2ad","#dbd9d3","#c1bbb5","#cdc8c1","#dbd7d0","#b1aaa4","#c5bfb8","#f2f2ee","#c0b9b3","#d7d3cd","#efeeea","#e8e6e1","#d7d3cd","#c1bbb6","#d9d6d0","#edece8","#e7e4df","#807874","#867e7b","#c6bfb9","#9e9691","#8a837f","#7a716d","#89807d","#958f8b","#938c87","#918985","#8e8682","#766e6b","#b3aca7","#978f8b","#afa8a2","#817a75","#716865","#dcd9d2","#aca49f"],["#dddad3","#c0bab2","#7f7572","#958d88","#b5aea9","#4f4946","#79726e","#cec9c1","#c3bcb5","#d6d1ca","#bab3ac","#b5b0aa","#cac4bd","#d3cfc9","#c8c3bc","#beb8b2","#d5d1ca","#cac5be","#a69f9a","#c3bfbc","#aca49f","#d6d2cb","#e6e4df","#e1ded9","#efede9","#f2f2ee","#f1f0ed","#f3f2ee","#f3f3ef","#d7d4ce","#5f5755","#645d59","#9b9490","#756e6b","#dcd8d3","#e1ded8","#d6d2cb","#dedbd5","#dedad4","#d8d5cf","#bbb4ae","#dcd9d1","#dddad4","#b9b1ac","#706865","#8e8683","#736a67","#c8c3be","#f6f6f3"],["#827975","#6b6461","#887f7b","#d6d2cb","#7f7773","#98908b","#938d88","#c2bcb5","#c3bdb7","#beb7b1","#c1bab3","#ada6a1","#d0cbc4","#dad6cf","#847c79","#a8a19b","#a9a19c","#f7f7f5","#98908b","#d1cbc5","#dbd7d0","#dad6cf","#d9d4cd","#d3cec8","#e8e6e1","#e2dfd9","#e4e2dc","#e0ded8","#dedad4","#817875","#847c78","#968f8b","#d0cac3","#dbd6d0","#e6e3dd","#d9d6d0","#eeede9","#ecebe6","#dbd7d0","#d8d4cf","#f5f5f2","#f7f7f5","#e0ded9","#a69e99","#d0cbc4","#c1bab4","#77706c","#827976","#bfb9b2"],["#746d6a","#a49d97","#c6c0b9","#847d79","#c0b9b3","#706965","#b7b1ab","#c6c0b9","#b8b1ab","#c6c0b9","#d1cbc4","#cac4bd","#d4cec8","#cfcac3","#948d89","#c9c4c0","#a29c99","#a49b96","#8e8682","#beb9b2","#d3cec7","#d1ccc5","#e6e4df","#dddad4","#e0ded7","#e2dfd9","#e6e5df","#e6e4de","#827b77","#8e8582","#c9c3bd","#b5afaa","#d9d5cf","#e7e5e0","#e5e3de","#d3cec8","#efeeea","#f1efec","#d8d5d0","#f5f5f2","#f0f0ed","#ccc7c1","#d7d3cb","#dad5cf","#dad6d0","#bab4ae","#958c89","#98908c","#7a726e"],["#49423f","#837a77","#7f7773","#6e6663","#c7c1ba","#635c5a","#c3bcb6","#a69e99","#c2bcb6","#dcd8d2","#d8d4cd","#d1ccc4","#c3beb7","#d9d6d1","#eae9e5","#afa6a0","#bfb8b2","#d6d1ca","#d4d0c9","#e2dfd9","#cec8c1","#e4e2dc","#cbc5bf","#cac3bd","#e2dfd9","#e8e6e1","#e5e3dd","#918984","#aea6a1","#918884","#c2bcb5","#e5e4de","#aea6a1","#dfddd7","#edede7","#eeeee9","#f1f1ed","#ccc7c2","#f1f0ec","#f1f1ec","#f1f0ec","#f0efeb","#eae9e4","#edece7","#e3e1db","#e4e1db","#dedcd5","#b6afa9","#928a86"],["#706865","#564f4d","#5f5754","#a19994","#a79e99","#9b938f","#bdb6af","#b7b0aa","#bbb4ae","#d9d5ce","#d2cdc5","#b3aba5","#d7d3d0","#afa8a4","#b4aca6","#bfb8b2","#cfcac2","#c2bcb5","#cdc8c0","#d0cac3","#d6d1ca","#d3cfc8","#e4e2dd","#e8e6e2","#e4e1db","#d1ccc6","#a29b96","#9f9893","#c6c1bb","#918a84","#e5e3de","#e9e6e1","#b7afa9","#e6e3de","#efeeea","#e9e8e3","#d8d4cf","#f0f0eb","#ebeae5","#e9e7e2","#dbd7d1","#f0efeb","#ecebe6","#ebeae5","#b8b2ad","#d4d0ca","#e1dedc","#eae9e5","#f0efec"],["#847b78","#4e4745","#817975","#9f9692","#b1aaa4","#b6b0a9","#b8b0ab","#cfc9c2","#d3cdc6","#c8c2bb","#b8b1ac","#d7d3d0","#7c7571","#7d7571","#a19993","#a79f99","#bcb5af","#d8d4cd","#d5d1ca","#ccc7c0","#c3bdb6","#cec9c2","#dddad4","#d6d2cb","#d9d5ce","#bfb8b2","#7f7773","#beb8b2","#b9b3ae","#dcd8d2","#e6e5df","#eae9e4","#dfdcd6","#e8e6e1","#eceae5","#b8b1ac","#eae9e3","#e7e5e0","#e0ddd7","#efeeea","#e8e7e1","#efede9","#e6e4df","#aca49f","#f0efeb","#f2f2ee","#e4e2dc","#f5f5f3","#f8f8f6"],["#958d89","#5b5452","#857e7a","#837a77","#c7c1bb","#c9c3bc","#d3cec6","#d4d0c8","#b7b0a9","#f5f4f2","#827a77","#8e8682","#99918d","#b0a9a3","#ccc6bf","#bcb6af","#837b79","#9d9691","#b7b0aa","#bab3ac","#c2bab4","#cdc7c0","#d4cfc8","#e1dfda","#776f6c","#7e7773","#b2aaa4","#c8c2bb","#a9a19c","#dcd8d1","#d7d2cb","#d8d4cd","#e9e8e2","#e7e6e0","#b5aea9","#ecece6","#eae9e4","#eae8e3","#e2e0da","#ecece7","#f0efeb","#c3bdb7","#e0ddd9","#efefea","#e9e7e2","#e6e5df","#f4f4f0","#fafaf8","#e8e5e0"],["#bcb5af","#a59e98","#847b77","#908783","#b1a9a3","#cbc5be","#bab3ad","#ada5a0","#f1f0ee","#857c78","#a59d99","#a09994","#98908c","#a79f9a","#cdc8c1","#cec7c0","#d8d3cc","#d4d0c9","#cac6c0","#a09893","#9d9590","#9d9691","#8b837f","#7f7874","#8f8683","#9d9490","#bab2ac","#a8a19b","#c5bfb8","#beb8b1","#b9b2ab","#d5d0c9","#d7d2cb","#d4cfc9","#d2cdc8","#dedad4","#dcd9d3","#dcd9d3","#e5e4de","#e6e4df","#ccc6c0","#edece7","#e8e6e1","#e5e3de","#ecebe7","#f5f5f2","#f6f5f3","#dedad5","#dad7d1"],["#4f4845","#c5bfb8","#867e79","#8c8480","#a59d97","#b6aea9","#cdcac6","#cbc9c5","#877e7b","#c7c1ba","#b0a8a2","#c1bab4","#c2bbb5","#afa8a3","#a39b96","#b6aea9","#b2aaa4","#b3aca6","#b2aaa5","#c4bfb9","#cdc9c4","#89817d","#665f5c","#98908b","#b5aea9","#aea7a1","#c3bcb5","#928b87","#b0a9a3","#beb8b2","#b6afaa","#b8b1ab","#958d88","#7b7270","#aaa29c","#a8a19b","#b3aca6","#c7c3bc","#cdc8c2","#9b938f","#ebe9e5","#f2f2ed","#eeede8","#f5f5f2","#f8f7f5","#f8f8f7","#f7f7f5","#f7f7f6","#f5f4f1"],["#6b6460","#8f8783","#877f7a","#968e89","#8b837f","#eae9e7","#a69f9c","#8e8481","#9c938d","#9d9590","#8b8380","#b0a9a4","#c7c0b9","#b9b1ac","#cfcac2","#d5d0c9","#cec9c1","#ccc6bf","#d2cdc6","#a49c97","#6c6662","#4f4846","#5e5754","#665e5c","#726a67","#766d6b","#716966","#736b69","#726967","#706865","#756c6a","#726a67","#9a9590","#928c87","#8c8582","#9b9591","#a9a3a0","#a29c98","#968f8c","#aea7a2","#c9c3bc","#d4d0c9","#d8d4ce","#e0ddd7","#e4e2dc","#efefeb","#e8e7e3","#e1ded9","#f6f6f4"],["#716a66","#7f7773","#837a76","#89817c","#e9e8e6","#b3aca6","#928985","#aba29d","#b0a7a2","#b4ada7","#8c8480","#a79f9a","#aaa29d","#99918c","#c2bcb6","#b5ada7","#97908b","#958d89","#8c8480","#5e5754","#574f4c","#7c746f","#948d88","#8c8580","#867e7a","#7c7370","#786f6d","#8e8682","#8f8682","#8b837f","#9a918d","#aca39e","#bbb5ae","#c8c1ba","#c4beb9","#b9b2ab","#cfc9c2","#dddad3","#d5d0c9","#dbd8d1","#ecebe6","#eeede9","#d8d5ce","#e7e5e0","#f2f2ee","#e3e0db","#dcd9d4","#f4f3f0","#e7e4df"],["#635b58","#867e7b","#7b7370","#cec9c3","#7b7471","#706865","#7d7471","#847c78","#a29a94","#aea8a3","#7e7673","#aca5a0","#cbc5be","#ccc7c0","#d1cbc4","#cbc6c0","#aaa49e","#726b67","#817874","#cec9c1","#d3cfc7","#c8c2bb","#dddad4","#e4e2dc","#d3cec7","#d3cec7","#a7a09a","#8b8480","#a69e99","#d1cbc4","#cec9c2","#afa8a2","#e6e3de","#dedad5","#e0ddd7","#c6c1bc","#cac4bd","#dcd9d3","#e5e2dc","#eeede8","#f0eeea","#d8d4ce","#e9e8e3","#c9c3bd","#f3f2ee","#f4f4f0","#f1f1ed","#948d8a","#aca8a5"],["#544d4b","#867e79","#d9d5cf","#706966","#635c59","#635b58","#615a57","#69615e","#6b6360","#736a66","#6a635f","#817875","#857e7b","#8b837f","#a49c98","#746d6a","#aca39e","#d8d4cd","#eeede8","#ebeae6","#c7c1bb","#e9e7e2","#f5f5f2","#efeeea","#f7f7f5","#e9e7e2","#ccc7bf","#afa9a3","#968e8b","#a29c96","#e4e1dc","#d1cbc3","#cac4bd","#eae9e4","#dcd9d2","#ebeae5","#aea8a4","#aba49e","#d9d5ce","#e2dfda","#dcd7d1","#efefeb","#f3f3ef","#eeedea","#736b68","#746b68","#8d8582","#b4aca7","#afa8a2"],["#7a7371","#c8c2bd","#6d6461","#79706d","#736b67","#6c6360","#6f6764","#655e5a","#817974","#857d79","#716a67","#8f8682","#8f8783","#756d6a","#7d7571","#c2bcb5","#f3f3f0","#e2e0d9","#f5f4f1","#c8c4bf","#eae9e4","#f6f6f3","#f3f3f0","#f8f8f7","#eceae6","#dad6cf","#dcd9d3","#cdc7c1","#978f8b","#a19a95","#d4cfc8","#d6d1ca","#c6bfb8","#d7d2cb","#d6d1c9","#cec8c1","#cec9c2","#d3cfc8","#817875","#a69e99","#978f8c","#9c948f","#8b827e","#a29994","#a9a29c","#a8a09b","#a9a19b","#a49c97","#938b87"],["#b7b2ad","#79716e","#6f6663","#79716d","#9e9690","#cdc7c0","#b4aca7","#89807c","#8a827d","#b9b2ad","#7b7571","#5a5452","#5e5754","#aca5a1","#d9d5cf","#dedad5","#f5f5f2","#f3f3ef","#f7f7f5","#e3e0dc","#f1f1ec","#f7f7f5","#f2f1ee","#e1ddd7","#e4e1db","#d9d5cf","#ddd9d3","#cec9c2","#9c9490","#a79f9b","#9a938f","#bdb6af","#c8c1ba","#afa7a2","#ccc8c2","#c1bab3","#b3aba5","#a49c98","#968e8a","#726a67","#68605e","#786f6d","#9c948f","#a59d97","#cbc6be","#c1bab3","#d1ccc4","#cfcac3","#c4bdb7"],["#d1ccc4","#a9a19c","#6c6561","#4a4442","#655e5b","#8d8682","#8d8682","#8b837f","#68605e","#867f7b","#6c6461","#68605d","#e5e3dd","#dad7d0","#f1f1ee","#d4d0ca","#f4f4f1","#f4f4f1","#e0dcd6","#f5f5f2","#f8f8f6","#e1ded9","#eeede9","#e8e7e2","#efeeea","#f1f0ed","#ebeae5","#c1bab4","#9f9793","#a69e99","#d7d3cc","#cdc7c0","#8f8783","#8e8681","#9a918c","#817975","#7d7572","#69625e","#bbb4ae","#c5bfb8","#b5aea9","#bdb6b0","#d6d2cb","#d5d0c9","#c3bcb5","#aaa29d","#8d8682","#c1bab4","#b3aba6"],["#bdb6b0","#807874","#8f8682","#7a726e","#867f7b","#47403e","#68605e","#857e7a","#98908b","#9b938f","#574f4d","#b0a9a4","#dddad3","#e8e7e2","#f5f4f1","#e9e7e1","#f4f4f0","#f1f1ec","#e0ddd7","#f4f4f1","#cfc8c2","#e5e3dd","#efede9","#f3f3ef","#f6f5f3","#f4f4f1","#e3e0da","#877f7c","#a79f9a","#a79e9a","#d7d2cb","#b6aea9","#c4bdb7","#b9b1ab","#6f6763","#615957","#8c837f","#bfb8b2","#cac4bd","#d8d4cd","#dcd8d1","#bfb8b2","#cfcac2","#d4cec7","#b7b0aa","#b8b0aa","#c9c2bc","#b1aaa4","#a69d99"],["#e5e3de","#e2dfd9","#efefea","#cfcac3","#88807c","#6b6461","#b4ada7","#ccc7c0","#a29a96","#b8b1aa","#69615f","#cfcbc5","#e6e5e0","#e7e5e0","#edede8","#eaeae4","#f5f5f2","#efeeea","#e1ddd8","#e7e5e1","#f6f5f2","#f7f6f3","#f8f8f7","#f7f7f5","#ebeae6","#dedad4","#d5d1ca","#7c7571","#918784","#68605c","#918985","#726b68","#87807c","#837a76","#857d79","#c0bab3","#bfb9b2","#b3aca5","#aca4a0","#9f9691","#c2bcb5","#cfc9c2","#cfc9c2","#c1bab4","#a29994","#a49c97","#a19893","#a8a09b","#8e8682"],["#d5cfca","#cec8c2","#d5d1cc","#e9e7e4","#f5f4f1","#b6b0aa","#98908c","#7b7370","#b5afa9","#d1cdc5","#aaa49e","#dedcd5","#d4cfc9","#e9e7e2","#e9e8e3","#e3e1dc","#f2f1ed","#bbb5b0","#cdc9c4","#e8e6e1","#f1f0ec","#dad6d0","#e5e3dd","#efeeea","#f6f6f3","#e9e8e3","#7d7773","#6a635f","#645d5a","#47423f","#5a5351","#847c77","#7e7572","#7c746f","#736b69","#88807b","#d4cfc8","#dad6ce","#d0cbc4","#cbc5bd","#bfb9b2","#b9b1ab","#b7afaa","#bdb6b0","#aaa29d","#a09894","#928985","#938c87","#e1dfdc"],["#e2e0da","#f0f0eb","#f6f6f3","#f7f7f5","#f8f8f5","#f6f6f4","#928c87","#d3cec7","#dbd7d1","#e2e0db","#a7a09a","#dedbd5","#e4e1db","#eae8e3","#e9e8e3","#dfdcd7","#9b938f","#d3cfc9","#ecebe6","#ecebe6","#e5e3dd","#f2f2ee","#f2f2ee","#f3f2ef","#e4e0db","#dddad5","#7d7572","#98908c","#c2bcb5","#756c69","#827975","#c0bab3","#d7d3cc","#d5d0c9","#d2cdc6","#d1ccc3","#c6c1bb","#cbc5be","#bab4ad","#ccc6be","#beb7b0","#a79f9a","#827a76","#877f7b","#928b86","#988f8b","#d7d5d1","#d5d1ce","#8e8582"],["#e5e3dd","#ecebe6","#d5d1ca","#d2cdc6","#edece9","#e7e6e3","#b9b4ad","#dad6d0","#e4e2dc","#e9e7e2","#bfb9b3","#e1ddd7","#ddd9d4","#e3e0da","#d6d2cc","#978f8a","#dcd8d3","#edece7","#eeede9","#efeeea","#e9e8e3","#f0efeb","#ecebe6","#e0ddd7","#e6e5df","#ada59f","#79716e","#aea7a1","#776f6c","#c7c1b9","#d4d0c9","#d5d0c9","#d7d2cb","#d5d1ca","#bcb5ae","#bab2ac","#c2bbb5","#c8c2bb","#ccc7bf","#89817e","#aaa39e","#b0a9a4","#a9a09a","#867e7a","#eeedea","#eeedea","#908784","#867e7a","#817976"],["#d7d4cf","#d2cdc7","#f8f8f7","#f8f8f6","#c3c0bc","#726a67","#d2cdc6","#e6e3de","#e5e2dd","#d9d5ce","#d3cfc8","#dfdbd5","#dcd8d2","#bbb5af","#c3beb9","#cdc6c0","#dad7d1","#ebe9e4","#ebe9e5","#cac3be","#dedad4","#dad6d0","#e1ded8","#c0bbb6","#827b77","#776f6c","#79706c","#99918d","#afa8a3","#ccc7c1","#dcd7d1","#e0ddd7","#dbd7d1","#d5d1ca","#d3cec7","#dad6cf","#c9c3bc","#bdb6b0","#c5bfb8","#b0a8a3","#a39b96","#978e8a","#a9a4a1","#d4d0cb","#9d9590","#8d8581","#b3aca6","#a09893","#857e7a"],["#e8e6e0","#f7f7f6","#f8f8f6","#e8e7e4","#716966","#aba5a0","#d8d3cc","#e6e3de","#dfdcd6","#e0dcd7","#cbc6be","#d4d0c9","#9f9793","#a39b96","#c8c2bb","#dfddd7","#e8e7e1","#e9e9e4","#e6e5df","#f4f3ef","#f4f3ef","#e9e7e2","#e4e2dd","#e1ded9","#655d5a","#645c5a","#918984","#d7d3cc","#e8e7e2","#e4e2db","#d0cac3","#bfb7b1","#8a807d","#d3cec6","#ccc5be","#bfb9b2","#b1a9a4","#bfb8b3","#b8b2ab","#a79f9a","#a59d99","#ebe9e4","#8c8580","#6c6462","#aca49e","#b3aca6","#a59d98","#a59e99","#9d948f"],["#d8d4ce","#f4f4f2","#e9e8e5","#6c6462","#6c6461","#c6c0b9","#c0b9b3","#d5d0c9","#d7d3cc","#e0ded8","#cbc5be","#b1aaa5","#a49c97","#b9b2ab","#d5d1ca","#e0dcd6","#e7e6e0","#e4e2dd","#d7d2cc","#dad6cf","#dbd7d1","#dddad4","#dddad5","#7a726f","#7a716d","#dad6d0","#e0dcd6","#e3e1db","#e1ddd8","#cfcac3","#d1cbc4","#cac4bd","#dcd8d1","#d5d0ca","#c7c2bb","#beb8b2","#aba49e","#938b86","#b1aba7","#eeedeb","#958d8a","#a39b97","#a9a09b","#766d6a","#d5d1ca","#c8c1ba","#bbb3ae","#c1bab4","#8e8683"],["#ccc6c0","#c0bab4","#716966","#bab3ad","#978f8b","#d6d3cb","#b6afaa","#b4ada6","#c7c1b9","#d6d2cb","#b1a9a4","#9a9490","#b5ada6","#d3cec7","#dbd7d0","#dad6cf","#dddad4","#dbd7d2","#e9e8e2","#e6e5e0","#dcd8d2","#d7d3cd","#7d7572","#89827e","#e0ddd8","#f0efec","#f1f0ed","#efeeea","#e7e6e1","#e5e3de","#d2ccc6","#c3bdb6","#b9b2ac","#bab3ad","#b5afa9","#b4ada7","#b5b0ad","#e9e8e5","#89817d","#7f7874","#b8b2ab","#d2cdc6","#b7b0a9","#726b68","#bcb5af","#bdb6b1","#c0b9b3","#c4bdb7","#857d79"],["#f4f4f1","#76706d","#a49d97","#bdb7b0","#c2bcb6","#cdc8c1","#b3aba6","#c7c2bb","#d0cac2","#ada5a0","#cfcbc6","#b3aba6","#d2cdc6","#bfb9b3","#dad7d1","#d0cac3","#cdc8c2","#d8d4cd","#dbd8d2","#eae8e4","#e3e0da","#605956","#584f4e","#6b6360","#968f8a","#c6c0ba","#dad6d0","#b4ada7","#c9c4be","#d1ccc5","#ccc6bf","#c7c0ba","#c3bdb6","#b1aaa4","#dedbd7","#c5bfb9","#aba49f","#b8b1ac","#bab3ad","#99918d","#cdc7c0","#b7afa8","#b9b1ab","#6e6763","#ccc8c0","#b6afaa","#cfcac2","#867e7b","#978f8b"],["#d9d5cf","#7e7673","#bbb4ad","#ddd9d2","#7c7471","#bcb5af","#b7afaa","#d6d2ca","#cdc8c1","#c6c1bc","#918984","#bab3ad","#bdb6b0","#cac4bd","#dfdcd6","#e0dcd6","#ebeae6","#e7e5e0","#e1dfd9","#847d79","#6f6663","#6a625f","#a39c96","#dedad4","#eae9e4","#f1f1ec","#eeeee9","#e2dfd9","#e1dfd8","#cbc6bf","#a09893","#928a86","#f8f8f7","#c3bdb8","#afa6a1","#a49b96","#ccc7c0","#d2cdc6","#bfb7b1","#c7c1b9","#beb7b1","#b9b2ac","#7f7773","#736b68","#d6d2ca","#b6aea8","#c6bfb8","#5f5856","#786f6c"],["#756c69","#bfb9b3","#b7b0a9","#9d958f","#8e8682","#9c948f","#c8c1ba","#b9b2ac","#d4d0cc","#9b938f","#bcb6af","#bfb8b2","#c2bbb5","#c6bfb9","#c8c2bc","#d6d1c9","#cbc4bd","#c4bdb6","#958d89","#585250","#5c5552","#a7a09a","#f4f3f1","#f2f2ee","#e0ddd7","#dbd8d2","#e0ddd7","#e1ded8","#dedad4","#cec8c1","#dedbd5","#d1cdc8","#b3aca7","#ccc6bf","#cbc5bd","#dad6d0","#d0cbc4","#c7c1ba","#b7b0aa","#cbc6be","#b3aca7","#d4d0c9","#746d69","#9f9791","#bfb8b2","#a19994","#776e6c","#a19a95","#d6d3cc"],["#68605d","#c9c3bc","#c3bcb5","#9d9490","#d5d1c9","#9b928e","#bcb4ae","#eae9e7","#8b8480","#bdb6b0","#d1cbc4","#ccc6bf","#c2bbb4","#d6d1ca","#d9d5ce","#d9d5ce","#d9d4ce","#c2bcb5","#847b78","#4e4745","#827974","#f6f6f4","#f7f7f5","#f3f3f0","#f2f1ee","#ebeae5","#dcd8d3","#c9c4bd","#dddbd5","#b4ada7","#d6d2cb","#e4e2dd","#c9c2bb","#dfdbd5","#e5e3de","#d7d2cb","#bcb5af","#c9c3bc","#c4beb7","#d4cfc8","#b5ada8","#d0cac2","#514a47","#c0b9b2","#8c8380","#6b625f","#beb7b0","#d8d3cc","#dddad4"],["#6a625f","#ada5a0","#b2aaa5","#c4bdb6","#d0cbc4","#a29994","#cfccc9","#877f7c","#b0a8a2","#c6c0b9","#b9b3ac","#b3aca6","#b0a9a4","#c8c2ba","#bbb3ad","#aba29d","#716966","#5c5653","#5e5854","#6e6664","#ada6a0","#dbd7d1","#c6c0bb","#cfcac4","#c9c3bd","#cec9c3","#ddd9d3","#e2dfd9","#ebe9e4","#d7d3cc","#e2dfda","#e4e1db","#c8c2bb","#d9d4ce","#dbd7d1","#bbb3ad","#c6bfb8","#c0bab4","#b5ada7","#ccc6bf","#ccc6c0","#aaa19c","#857e7a","#8d8682","#887f7c","#e8e6e1","#d8d3cd","#d5d1c9","#e8e7e2"],["#928a86","#9f9893","#dad6cf","#c4beb7","#b7afaa","#827a78","#afa9a5","#b3aba5","#dddad3","#d4cfc8","#c9c4bd","#98918c","#8b8480","#7f7773","#6d6662","#aaa39e","#aba29d","#807874","#a49d98","#79706d","#eeede9","#f4f4f1","#f4f3f0","#f1f1ec","#f5f5f2","#f2f1ef","#edece7","#e7e4df","#dad7d1","#eceae5","#e6e4df","#d4cfc9","#d7d3cc","#eae7e3","#cac5bf","#d4cfc8","#c5bfb8","#beb7b1","#bcb5b0","#bcb5af","#a8a09b","#5c5553","#5c5552","#837c78","#dedbd5","#d8d5ce","#ebe9e5","#efeeea","#f1f0ec"],["#dfdcd7","#7f7773","#918884","#c2bcb6","#958e8a","#f0f0ed","#a9a19c","#c9c3bb","#bfb9b3","#bcb5af","#aba39e","#aca49f","#b3aca7","#b1aaa4","#aba39e","#78706e","#6a6260","#c1bbb5","#d7d2cc","#b0a9a3","#f7f6f3","#f7f7f5","#f8f8f6","#f5f5f3","#e4e1dd","#f3f2ee","#e8e7e1","#dad7d1","#efefea","#dfdbd6","#b9b2ad","#cac3bd","#e5e1db","#bbb4ae","#d6d1cb","#b6afaa","#c9c4bd","#b0a8a3","#c0bab4","#8c837f","#595250","#706866","#b8b1ab","#68605d","#dad6cf","#d7d2cb","#f0efeb","#f1f0ec","#f3f2ef"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "repugnant",
    name: "a vicious little block. keep it away from the others.",
    grid: [
        "X"
      ],
    color: "#009936",
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "pea",
    name: "a pea",
    grid: [
        "X"
      ],
    color: "#9dfe90",
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "pizza_t",
    name: "a slice of pizza that is somehow a T-piece",
    grid: [
        "XXX",
        ".X."
      ],
    color: [["#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#f0b860","#c8822e"],["#c8822e","#c8822e","#f0b860","#c8822e","#c8822e","#c8822e","#c8822e","#c8822e","#f0b860","#c8822e","#c8822e","#c8822e","#c8822e","#c8822e","#c8822e","#f0b860","#c8822e","#9a5a1c"],["#9a5a1c","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#9a5a1c"],["#ffd84a","#cf3a2a","#cf3a2a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#3f8a2e","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#cf3a2a","#cf3a2a","#ffd84a","#efb22a","#efb22a"],["#ffd84a","#cf3a2a","#8e1c18","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#cf3a2a","#8e1c18","#ffd84a","#efb22a","#efb22a"],["#efb22a","#ffd84a","#ffd84a","#efb22a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#efb22a","#efb22a","#efb22a"],["","","","","","","#ffd84a","#ffd84a","#cf3a2a","#cf3a2a","#ffd84a","#efb22a","","","","","",""],["","","","","","","#ffd84a","#ffd84a","#cf3a2a","#8e1c18","#ffd84a","#efb22a","","","","","",""],["","","","","","","#ffd84a","#3f8a2e","#ffd84a","#ffd84a","#efb22a","#efb22a","","","","","",""],["","","","","","","#efb22a","#ffd84a","#ffd84a","#ffd84a","#efb22a","#efb22a","","","","","",""],["","","","","","","#efb22a","#ffd84a","#ffd84a","#efb22a","#efb22a","#efb22a","","","","","",""],["","","","","","","#efb22a","#efb22a","#ffd84a","#efb22a","#efb22a","#efb22a","","","","","",""]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
    tags: [
        "food"
      ],
  },
  {
    id: "traffic_cone",
    name: "a traffic cone somebody stole in 2009",
    grid: [
        ".X.",
        ".X.",
        "XXX"
      ],
    color: [["","","","","","","#9e6938","#c75f14","#c75f14","#c75f14","#c75f14","#813507","","","","","",""],["","","","","","","#c78546","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#a24309","","","","","",""],["","","","","","","#c78546","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#a24309","","","","","",""],["","","","","","","#bebebe","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#9c9ca2","","","","","",""],["","","","","","","#bebebe","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#9c9ca2","","","","","",""],["","","","","","","#c78546","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#a24309","","","","","",""],["","","","","","","#c78546","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#a24309","","","","","",""],["","","","","","","#c78546","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#a24309","","","","","",""],["","","","","","","#bebebe","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#9c9ca2","","","","","",""],["","","","","","","#bebebe","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#9c9ca2","","","","","",""],["","","","","","","#c78546","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#a24309","","","","","",""],["","","","","","","#c78546","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#a24309","","","","","",""],["#9e4c10","#c75f14","#c75f14","#c75f14","#c75f14","#c75f14","#e39750","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#b94d0b","#c75f14","#c75f14","#c75f14","#c75f14","#c75f14","#9e4c10"],["#c75f14","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ffaa5a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#d0560c","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#c75f14"],["#bebebe","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#9c9ca2"],["#c78546","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#a24309"],["#6c6c78","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#8a8a9a","#53535f"],["#42424c","#53535f","#53535f","#53535f","#53535f","#53535f","#53535f","#53535f","#53535f","#53535f","#53535f","#53535f","#53535f","#53535f","#53535f","#53535f","#53535f","#42424c"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "pickle_jar",
    name: "a jar of pickles nobody can open",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#9a7a1e","#e0bc44","#e0bc44","#e0bc44","#e0bc44","#e0bc44","#e0bc44","#e0bc44","#e0bc44","#e0bc44","#e0bc44","#e0bc44","#e0bc44","#9a7a1e"],["#9a7a1e","#e0bc44","#9a7a1e","#e0bc44","#9a7a1e","#e0bc44","#9a7a1e","#e0bc44","#9a7a1e","#e0bc44","#9a7a1e","#e0bc44","#9a7a1e","#9a7a1e"],["#b8d8c4","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#b8d8c4"],["#f4fff8","#a8cf74","#3f7a2a","#3f7a2a","#a8cf74","#a8cf74","#3f7a2a","#3f7a2a","#a8cf74","#3f7a2a","#3f7a2a","#a8cf74","#a8cf74","#b8d8c4"],["#f4fff8","#3f7a2a","#6aa040","#3f7a2a","#3f7a2a","#a8cf74","#3f7a2a","#6aa040","#3f7a2a","#3f7a2a","#6aa040","#3f7a2a","#a8cf74","#b8d8c4"],["#f4fff8","#3f7a2a","#3f7a2a","#2a5a1c","#3f7a2a","#a8cf74","#3f7a2a","#3f7a2a","#2a5a1c","#3f7a2a","#3f7a2a","#2a5a1c","#a8cf74","#b8d8c4"],["#f4fff8","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#b8d8c4"],["#f4fff8","#f6eed2","#f6eed2","#6aa040","#3f7a2a","#3f7a2a","#3f7a2a","#3f7a2a","#3f7a2a","#6aa040","#f6eed2","#f6eed2","#f6eed2","#b8d8c4"],["#f4fff8","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#f6eed2","#b8d8c4"],["#f4fff8","#3f7a2a","#6aa040","#3f7a2a","#3f7a2a","#a8cf74","#3f7a2a","#6aa040","#3f7a2a","#3f7a2a","#6aa040","#3f7a2a","#a8cf74","#b8d8c4"],["#f4fff8","#3f7a2a","#3f7a2a","#2a5a1c","#3f7a2a","#a8cf74","#3f7a2a","#3f7a2a","#2a5a1c","#3f7a2a","#3f7a2a","#2a5a1c","#a8cf74","#b8d8c4"],["#f4fff8","#a8cf74","#3f7a2a","#3f7a2a","#a8cf74","#a8cf74","#3f7a2a","#3f7a2a","#a8cf74","#3f7a2a","#3f7a2a","#a8cf74","#a8cf74","#b8d8c4"],["#b8d8c4","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#a8cf74","#b8d8c4"],["#7aa088","#7aa088","#7aa088","#7aa088","#7aa088","#7aa088","#7aa088","#7aa088","#7aa088","#7aa088","#7aa088","#7aa088","#7aa088","#7aa088"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
    tags: [
        "food"
      ],
  },
  {
    id: "cat_loaf",
    name: "a cat in loaf mode. do not disturb.",
    grid: [
        "X..",
        "XXX"
      ],
    color: [["#f2a444","#f2a444","#0f0d16","#0f0d16","#f2a444","#f2a444","","","","","","","","","","","",""],["#f2a444","#ff8a9a","#f2a444","#f2a444","#ff8a9a","#f2a444","","","","","","","","","","","",""],["#f2a444","#a05a18","#f2a444","#f2a444","#a05a18","#f2a444","","","","","","","","","","","",""],["#f2a444","#2a1a10","#f2a444","#f2a444","#2a1a10","#f2a444","","","","","","","","","","","",""],["#f2a444","#fff4e0","#ff8a9a","#ff8a9a","#fff4e0","#f2a444","","","","","","","","","","","",""],["#fff4e0","#fff4e0","#2a1a10","#2a1a10","#fff4e0","#fff4e0","","","","","","","","","","","",""],["#fff4e0","#fff4e0","#fff4e0","#fff4e0","#f2a444","#f2a444","#a05a18","#f2a444","#f2a444","#f2a444","#a05a18","#f2a444","#f2a444","#f2a444","#a05a18","#f2a444","#f2a444","#c87828"],["#fff4e0","#fff4e0","#fff4e0","#f2a444","#f2a444","#f2a444","#a05a18","#f2a444","#f2a444","#f2a444","#a05a18","#f2a444","#f2a444","#f2a444","#a05a18","#f2a444","#f2a444","#c87828"],["#fff4e0","#fff4e0","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#c87828"],["#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#c87828","#c87828","#f2a444","#f2a444","#c87828"],["#c87828","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#f2a444","#a05a18","#a05a18","#f2a444","#a05a18","#f2a444","#a05a18","#f2a444","#f2a444","#c87828","#c87828"],["#c87828","#c87828","#c87828","#c87828","#c87828","#c87828","#c87828","#c87828","#c87828","#c87828","#c87828","#c87828","#c87828","#c87828","#c87828","#c87828","#c87828","#c87828"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "sad_avocado",
    name: "a sad avocado (it was ripe for eleven minutes)",
    grid: [
        "XX",
        "XX",
        "XX"
      ],
    color: [["#2a4418","#2a4418","#2a4418","#2a4418","#2a4418","#43662a","#43662a","#2a4418","#2a4418","#2a4418","#2a4418","#2a4418"],["#2a4418","#2a4418","#2a4418","#2a4418","#43662a","#9ec244","#9ec244","#43662a","#2a4418","#2a4418","#2a4418","#2a4418"],["#2a4418","#2a4418","#2a4418","#43662a","#9ec244","#e2ea9a","#e2ea9a","#9ec244","#43662a","#2a4418","#2a4418","#2a4418"],["#2a4418","#2a4418","#43662a","#9ec244","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#9ec244","#43662a","#2a4418","#2a4418"],["#2a4418","#2a4418","#43662a","#9ec244","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#9ec244","#43662a","#2a4418","#2a4418"],["#2a4418","#43662a","#9ec244","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#9ec244","#43662a","#2a4418"],["#2a4418","#43662a","#9ec244","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#9ec244","#43662a","#2a4418"],["#43662a","#9ec244","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#9ec244","#43662a"],["#43662a","#9ec244","#e2ea9a","#e2ea9a","#8a5428","#8a5428","#8a5428","#8a5428","#e2ea9a","#e2ea9a","#9ec244","#43662a"],["#43662a","#9ec244","#e2ea9a","#8a5428","#b4743e","#8a5428","#8a5428","#8a5428","#8a5428","#e2ea9a","#9ec244","#43662a"],["#43662a","#9ec244","#e2ea9a","#8a5428","#1a1208","#8a5428","#8a5428","#1a1208","#8a5428","#e2ea9a","#9ec244","#43662a"],["#43662a","#9ec244","#e2ea9a","#8a5428","#7ac8ff","#8a5428","#8a5428","#8a5428","#8a5428","#e2ea9a","#9ec244","#43662a"],["#43662a","#9ec244","#e2ea9a","#8a5428","#8a5428","#4e2c12","#4e2c12","#8a5428","#8a5428","#e2ea9a","#9ec244","#43662a"],["#43662a","#9ec244","#e2ea9a","#8a5428","#4e2c12","#8a5428","#8a5428","#4e2c12","#8a5428","#e2ea9a","#9ec244","#43662a"],["#43662a","#9ec244","#e2ea9a","#e2ea9a","#8a5428","#8a5428","#8a5428","#8a5428","#e2ea9a","#e2ea9a","#9ec244","#43662a"],["#2a4418","#43662a","#9ec244","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#e2ea9a","#9ec244","#43662a","#2a4418"],["#2a4418","#2a4418","#43662a","#9ec244","#9ec244","#9ec244","#9ec244","#9ec244","#9ec244","#43662a","#2a4418","#2a4418"],["#2a4418","#2a4418","#2a4418","#43662a","#43662a","#43662a","#43662a","#43662a","#43662a","#2a4418","#2a4418","#2a4418"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
    tags: [
        "food"
      ],
  },
  {
    id: "garden_gnome",
    name: "a garden gnome who has never once gardened",
    grid: [
        ".X.",
        "XXX",
        "XXX"
      ],
    color: [["","","","","","","#86201b","#a82922","#c75745","#a82922","#a82922","#86201b","","","","","",""],["","","","","","","#a82922","#d8342c","#ff7058","#d8342c","#d8342c","#a82922","","","","","",""],["","","","","","","#a82922","#ff7058","#d8342c","#d8342c","#d8342c","#a82922","","","","","",""],["","","","","","","#a82922","#ff7058","#d8342c","#d8342c","#d8342c","#a82922","","","","","",""],["","","","","","","#c75745","#d8342c","#d8342c","#d8342c","#d8342c","#a82922","","","","","",""],["","","","","","","#c75745","#d8342c","#d8342c","#d8342c","#d8342c","#831919","","","","","",""],["#86201b","#a82922","#a82922","#a82922","#a82922","#c75745","#c02e27","#d8342c","#d8342c","#d8342c","#d8342c","#c02e27","#a82922","#a82922","#a82922","#831919","#831919","#681414"],["#a82922","#d8342c","#d8342c","#d8342c","#ff7058","#d8342c","#d8342c","#d8342c","#d8342c","#d8342c","#d8342c","#d8342c","#d8342c","#d8342c","#d8342c","#a82020","#a82020","#831919"],["#831919","#a82020","#a82020","#a82020","#a82020","#a82020","#a82020","#a82020","#a82020","#a82020","#a82020","#a82020","#a82020","#a82020","#a82020","#a82020","#a82020","#831919"],["#c79c7d","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#c79c7d"],["#c79c7d","#ffc8a0","#ffc8a0","#ffc8a0","#2a1a14","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#2a1a14","#ffc8a0","#ffc8a0","#ffc8a0","#c79c7d"],["#c79c7d","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#f07a6a","#f07a6a","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#ffc8a0","#c79c7d"],["#2d53a2","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f07a6a","#f07a6a","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#2d53a2"],["#2d53a2","#3a6ad0","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#3a6ad0","#2d53a2"],["#2d53a2","#3a6ad0","#3a6ad0","#3a6ad0","#f4f4f4","#f4f4f4","#f4f4f4","#c4c8d8","#f4f4f4","#f4f4f4","#c4c8d8","#f4f4f4","#f4f4f4","#f4f4f4","#3a6ad0","#3a6ad0","#3a6ad0","#2d53a2"],["#2d53a2","#3a6ad0","#3a6ad0","#3a6ad0","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#3a6ad0","#3a6ad0","#3a6ad0","#2d53a2"],["#6c421e","#8a5426","#8a5426","#3a6ad0","#3a6ad0","#3a6ad0","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#3a6ad0","#3a6ad0","#3a6ad0","#8a5426","#8a5426","#6c421e"],["#563418","#6c421e","#6c421e","#6c421e","#213a7d","#213a7d","#213a7d","#213a7d","#bebebe","#bebebe","#213a7d","#213a7d","#213a7d","#213a7d","#6c421e","#6c421e","#6c421e","#563418"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "hug_cactus",
    name: "a cactus that just wants a hug",
    grid: [
        ".X.",
        "XXX",
        ".X.",
        ".X."
      ],
    color: [["","","","","","","#2e7d32","#8ee07a","#ff6fa8","#ff6fa8","#2e7d32","#2e7d32","","","","","",""],["","","","","","","#4caf50","#8ee07a","#ff6fa8","#ffd34a","#4caf50","#2e7d32","","","","","",""],["","","","","","","#4caf50","#8ee07a","#4caf50","#4caf50","#f4f0d0","#2e7d32","","","","","",""],["","","","","","","#4caf50","#f4f0d0","#4caf50","#4caf50","#4caf50","#2e7d32","","","","","",""],["","","","","","","#4caf50","#8ee07a","#4caf50","#4caf50","#4caf50","#2e7d32","","","","","",""],["","","","","","","#4caf50","#8ee07a","#4caf50","#f4f0d0","#4caf50","#2e7d32","","","","","",""],["#2e7d32","#8ee07a","#8ee07a","#f4f0d0","#8ee07a","#8ee07a","#4caf50","#8ee07a","#4caf50","#4caf50","#4caf50","#2e7d32","#8ee07a","#8ee07a","#f4f0d0","#8ee07a","#8ee07a","#2e7d32"],["#8ee07a","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#14240f","#4caf50","#4caf50","#14240f","#2e7d32","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#2e7d32"],["#4caf50","#4caf50","#f4f0d0","#4caf50","#4caf50","#4caf50","#4caf50","#8ee07a","#4caf50","#4caf50","#4caf50","#2e7d32","#4caf50","#4caf50","#4caf50","#f4f0d0","#4caf50","#2e7d32"],["#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#ff8a9a","#14240f","#14240f","#14240f","#14240f","#ff8a9a","#4caf50","#4caf50","#4caf50","#4caf50","#4caf50","#2e7d32"],["#2e7d32","#4caf50","#4caf50","#4caf50","#f4f0d0","#4caf50","#4caf50","#8ee07a","#4caf50","#4caf50","#4caf50","#2e7d32","#4caf50","#f4f0d0","#4caf50","#4caf50","#4caf50","#2e7d32"],["#2e7d32","#2e7d32","#2e7d32","#2e7d32","#2e7d32","#2e7d32","#4caf50","#8ee07a","#4caf50","#4caf50","#4caf50","#2e7d32","#2e7d32","#2e7d32","#2e7d32","#2e7d32","#2e7d32","#2e7d32"],["","","","","","","#4caf50","#8ee07a","#4caf50","#4caf50","#f4f0d0","#2e7d32","","","","","",""],["","","","","","","#4caf50","#8ee07a","#4caf50","#4caf50","#4caf50","#2e7d32","","","","","",""],["","","","","","","#4caf50","#f4f0d0","#4caf50","#4caf50","#4caf50","#2e7d32","","","","","",""],["","","","","","","#4caf50","#8ee07a","#4caf50","#4caf50","#4caf50","#2e7d32","","","","","",""],["","","","","","","#4caf50","#8ee07a","#4caf50","#f4f0d0","#4caf50","#2e7d32","","","","","",""],["","","","","","","#2e7d32","#8ee07a","#4caf50","#4caf50","#4caf50","#2e7d32","","","","","",""],["","","","","","","#e07a4a","#e07a4a","#e07a4a","#e07a4a","#e07a4a","#b85a30","","","","","",""],["","","","","","","#8a3e20","#8a3e20","#8a3e20","#8a3e20","#8a3e20","#8a3e20","","","","","",""],["","","","","","","#b85a30","#e07a4a","#e07a4a","#e07a4a","#b85a30","#8a3e20","","","","","",""],["","","","","","","#b85a30","#e07a4a","#e07a4a","#b85a30","#b85a30","#8a3e20","","","","","",""],["","","","","","","#b85a30","#e07a4a","#b85a30","#b85a30","#8a3e20","#8a3e20","","","","","",""],["","","","","","","#8a3e20","#8a3e20","#8a3e20","#8a3e20","#8a3e20","#8a3e20","","","","","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "disguise",
    name: "a very convincing disguise",
    grid: [
        "XXXX",
        ".XX."
      ],
    color: [["#8b7164","#623b22","#623b22","#7d6051","#623b22","#623b22","#623b22","#623b22","#7d6051","#623b22","#623b22","#c08d6e","#c08d6e","#623b22","#623b22","#7d6051","#623b22","#623b22","#623b22","#623b22","#7d6051","#623b22","#623b22","#8b7164"],["#55362a","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#6a4434","#55362a"],["#55362a","#ffffff","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#6a4434","#f6a0a0","#f6a0a0","#6a4434","#ffffff","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#55362a"],["#55362a","#a8dcf4","#ffffff","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#78b0d4","#6a4434","#f6a0a0","#f6a0a0","#6a4434","#a8dcf4","#ffffff","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#78b0d4","#55362a"],["#55362a","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#78b0d4","#78b0d4","#6a4434","#f6a0a0","#f6a0a0","#6a4434","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#a8dcf4","#78b0d4","#78b0d4","#55362a"],["#482e23","#55362a","#55362a","#55362a","#55362a","#55362a","#5f3d2f","#6a4434","#6a4434","#6a4434","#f6a0a0","#f6a0a0","#f6a0a0","#f6a0a0","#6a4434","#6a4434","#6a4434","#5f3d2f","#55362a","#55362a","#55362a","#55362a","#55362a","#482e23"],["","","","","","","#c08d6e","#d0707a","#f6a0a0","#f6a0a0","#f6a0a0","#f6a0a0","#f6a0a0","#f6a0a0","#f6a0a0","#d0707a","#d0707a","#c08d6e","","","","","",""],["","","","","","","#c08d6e","#d0707a","#f6a0a0","#f6a0a0","#f6a0a0","#f6a0a0","#f6a0a0","#f6a0a0","#f6a0a0","#f6a0a0","#d0707a","#c08d6e","","","","","",""],["","","","","","","#623b22","#7a4a2a","#d0707a","#d0707a","#f6a0a0","#f6a0a0","#f6a0a0","#f6a0a0","#d0707a","#d0707a","#7a4a2a","#623b22","","","","","",""],["","","","","","","#80552e","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#5a3420","#5a3420","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#80552e","","","","","",""],["","","","","","","#623b22","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#5a3420","#5a3420","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#623b22","","","","","",""],["","","","","","","#8b7164","#623b22","#7d6051","#623b22","#7d6051","#7d6051","#7d6051","#7d6051","#623b22","#7d6051","#623b22","#8b7164","","","","","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "mullet",
    name: "a mullet: business in front, party in the back",
    grid: [
        "XXX",
        "X..",
        "X.."
      ],
    color: [["#5e3a16","#8a5a2a","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#5e3a16"],["#8a5a2a","#b8803e","#e0aa64","#b8803e","#e0aa64","#b8803e","#e0aa64","#b8803e","#e0aa64","#b8803e","#e0aa64","#b8803e","#e0aa64","#b8803e","#e0aa64","#b8803e","#b8803e","#8a5a2a"],["#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#8a5a2a","#5e3a16"],["#8a5a2a","#b8803e","#b8803e","#8a5a2a","#5e3a16","#8a5a2a","#8a5a2a","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#b8803e","#5e3a16","#5e3a16","#5e3a16"],["#8a5a2a","#8a5a2a","#b8803e","#8a5a2a","#8a5a2a","#5e3a16","#d89878","#f2c0a0","#f2c0a0","#f2c0a0","#f2c0a0","#f2c0a0","#f2c0a0","#f2c0a0","#f2c0a0","#f2c0a0","#f2c0a0","#d89878"],["#8a5a2a","#e0aa64","#8a5a2a","#8a5a2a","#5e3a16","#d89878","#f2c0a0","#f2c0a0","#f2c0a0","#f2c0a0","#f2c0a0","#f2c0a0","#4a2a10","#4a2a10","#4a2a10","#f2c0a0","#f2c0a0","#d89878"],["#8a5a2a","#b8803e","#e0aa64","#8a5a2a","#5e3a16","#d89878","","","","","","","","","","","",""],["#8a5a2a","#8a5a2a","#b8803e","#e0aa64","#8a5a2a","#5e3a16","","","","","","","","","","","",""],["#5e3a16","#8a5a2a","#8a5a2a","#b8803e","#e0aa64","#ff4fa0","","","","","","","","","","","",""],["#8a5a2a","#5e3a16","#8a5a2a","#8a5a2a","#b8803e","#e0aa64","","","","","","","","","","","",""],["#8a5a2a","#ffd34a","#5e3a16","#8a5a2a","#8a5a2a","#b8803e","","","","","","","","","","","",""],["#b8803e","#e0aa64","#8a5a2a","#5e3a16","#8a5a2a","#8a5a2a","","","","","","","","","","","",""],["#8a5a2a","#b8803e","#e0aa64","#8a5a2a","#5e3a16","#8a5a2a","","","","","","","","","","","",""],["#8a5a2a","#8a5a2a","#b8803e","#e0aa64","#4fd8ff","#5e3a16","","","","","","","","","","","",""],["#5e3a16","#8a5a2a","#8a5a2a","#b8803e","#e0aa64","#8a5a2a","","","","","","","","","","","",""],["#8a5a2a","#5e3a16","#8a5a2a","#8a5a2a","#b8803e","#e0aa64","","","","","","","","","","","",""],["#b8803e","#e0aa64","#ff4fa0","#5e3a16","#8a5a2a","#b8803e","","","","","","","","","","","",""],["#5e3a16","#b8803e","#5e3a16","#5e3a16","#b8803e","#5e3a16","","","","","","","","","","","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "evil_sock",
    name: "the other sock. it knows what it did.",
    grid: [
        "X.",
        "X.",
        "XX"
      ],
    color: [["#88211d","#a02622","#a02622","#a02622","#a02622","#88211d","","","","","",""],["#a44e4b","#8e1c18","#8e1c18","#8e1c18","#8e1c18","#a44e4b","","","","","",""],["#746b84","#3e3552","#4e4264","#3e3552","#4e4264","#686177","","","","","",""],["#a02622","#c8302a","#c8302a","#c8302a","#c8302a","#a02622","","","","","",""],["#746b84","#4e4264","#4e4264","#4e4264","#4e4264","#746b84","","","","","",""],["#746b84","#3e3552","#4e4264","#4e4264","#3e3552","#746b84","","","","","",""],["#545164","#4e4264","#4e4264","#4e4264","#4e4264","#545164","","","","","",""],["#746b84","#24203a","#4e4264","#4e4264","#24203a","#746b84","","","","","",""],["#746b84","#ff3a2a","#4e4264","#4e4264","#ff3a2a","#746b84","","","","","",""],["#746b84","#4e4264","#4e4264","#4e4264","#4e4264","#746b84","","","","","",""],["#746b84","#4e4264","#24203a","#24203a","#4e4264","#746b84","","","","","",""],["#746b84","#24203a","#4e4264","#4e4264","#24203a","#746b84","","","","","",""],["#746b84","#3e3552","#4e4264","#4e4264","#4e4264","#615674","#746b84","#746b84","#686177","#a02622","#a02622","#88211d"],["#746b84","#4e4264","#4e4264","#4e4264","#3e3552","#4e4264","#4e4264","#4e4264","#4e4264","#c8302a","#c8302a","#a02622"],["#a02622","#c8302a","#4e4264","#4e4264","#4e4264","#4e4264","#4e4264","#4e4264","#4e4264","#c8302a","#e8a090","#a02622"],["#a02622","#c8302a","#c8302a","#4e4264","#4e4264","#4e4264","#3e3552","#4e4264","#4e4264","#c8302a","#c8302a","#a02622"],["#a02622","#c8302a","#c8302a","#4e4264","#4e4264","#4e4264","#4e4264","#4e4264","#4e4264","#c8302a","#8e1c18","#a02622"],["#ad625f","#a44e4b","#a44e4b","#686177","#686177","#686177","#686177","#686177","#686177","#a44e4b","#a44e4b","#ad625f"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "rubber_chicken",
    name: "a rubber chicken, for emergencies",
    grid: [
        "XX.",
        ".XX"
      ],
    color: [["#9e8724","#b52521","#b52521","#b52521","#c7a92d","#c7a92d","#c7a92d","#c7a92d","#c7a92d","#c7bb6c","#c7bb6c","#9e9556","","","","","",""],["#b52521","#e8302a","#e8302a","#e8302a","#e8302a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#c7a92d","","","","","",""],["#c76c14","#ff8a1a","#ffd93a","#2a1a10","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#c7a92d","","","","","",""],["#c76c14","#ff8a1a","#ff8a1a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#c7a92d","","","","","",""],["#c76c14","#e8302a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#c7a92d","","","","","",""],["#9e8724","#b52521","#c7a92d","#c7a92d","#c7a92d","#c7a92d","#e3c134","#ffd93a","#e8b020","#e8b020","#ffd93a","#c7a92d","","","","","",""],["","","","","","","#c7a92d","#ffd93a","#e8b020","#e8b020","#e8b020","#ce9d1c","#c7a92d","#c7a92d","#c7a92d","#c7a92d","#c7a92d","#9e8724"],["","","","","","","#c7a92d","#e8b020","#e8b020","#e8b020","#e8b020","#e8b020","#e8b020","#ffd93a","#ffd93a","#ffd93a","#fff08a","#c7bb6c"],["","","","","","","#c7a92d","#ffd93a","#ffd93a","#e8b020","#e8b020","#e8b020","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#fff08a","#c7bb6c"],["","","","","","","#c7a92d","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#c7a92d"],["","","","","","","#c7a92d","#ffd93a","#ff8a1a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ffd93a","#ff8a1a","#ffd93a","#ffd93a","#c7a92d"],["","","","","","","#9e8724","#c76c14","#c76c14","#c76c14","#c7a92d","#c7a92d","#c7a92d","#c76c14","#c76c14","#c76c14","#c7a92d","#9e8724"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "trombone",
    name: "a trombone, played badly",
    grid: [
        "XXXXXXX",
        "X....XX",
        "XXXXX.."
      ],
    color: [["#a87a1e","#a87a1e","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#f2c94c","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#f2c94c","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#fff2a8"],["#a87a1e","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#a87a1e","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#a87a1e","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#fff2a8","#fff2a8","#fff2a8","#a87a1e"],["#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#a87a1e","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#a87a1e","#d9a632","#d9a632","#d9a632","#d9a632","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#f2c94c","#3a2808"],["#f2c94c","#fff2a8","#f2c94c","#d9a632","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#fff2a8","#fff2a8","#fff2a8","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#6e4e10","#3a2808"],["#f2c94c","#fff2a8","#f2c94c","#d9a632","#a87a1e","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#a87a1e","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#a87a1e","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#d9a632","#6e4e10","#3a2808"],["#f2c94c","#fff2a8","#f2c94c","#d9a632","#a87a1e","","","","","","","","","","","","","","","","","","","","","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#6e4e10","#3a2808"],["#f2c94c","#fff2a8","#f2c94c","#d9a632","#a87a1e","","","","","","","","","","","","","","","","","","","","","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#6e4e10","#3a2808"],["#f2c94c","#fff2a8","#f2c94c","#d9a632","#a87a1e","","","","","","","","","","","","","","","","","","","","","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#a87a1e","#a87a1e","#a87a1e","#3a2808"],["#f2c94c","#fff2a8","#f2c94c","#d9a632","#a87a1e","","","","","","","","","","","","","","","","","","","","","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#6e4e10","#6e4e10","#6e4e10","#a87a1e"],["#f2c94c","#fff2a8","#f2c94c","#d9a632","#a87a1e","","","","","","","","","","","","","","","","","","","","","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#0f0d16","#6e4e10"],["#f2c94c","#fff2a8","#f2c94c","#d9a632","#a87a1e","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#f2c94c","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#fff2a8","#c8ccd6","#c8ccd6","#c8ccd6","#c8ccd6","","","","","","","","","",""],["#f2c94c","#fff2a8","#f2c94c","#d9a632","#a87a1e","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#a87a1e","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f0f2f6","#f0f2f6","#f0f2f6","#f0f2f6","","","","","","","","","",""],["#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#a87a1e","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#d9a632","#c8ccd6","#c8ccd6","#c8ccd6","#2a2a30","","","","","","","","","",""],["#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#a87a1e","#9aa0ac","#9aa0ac","#9aa0ac","#9aa0ac","","","","","","","","","",""],["#a87a1e","#a87a1e","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#a87a1e","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6e4e10","#6c7280","#6c7280","#6c7280","#6c7280","","","","","","","","","",""]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
  },
  {
    id: "no_stamp",
    name: "a rubber stamp that only says NO",
    grid: [
        ".X.",
        "XXX"
      ],
    color: [["","","","","","","#0f0d16","#c88a4a","#c88a4a","#c88a4a","#8a5426","#0f0d16","","","","","",""],["","","","","","","#c88a4a","#f0c08a","#c88a4a","#c88a4a","#8a5426","#8a5426","","","","","",""],["","","","","","","#c88a4a","#c88a4a","#c88a4a","#c88a4a","#8a5426","#8a5426","","","","","",""],["","","","","","","#0f0d16","#8a5426","#8a5426","#8a5426","#8a5426","#0f0d16","","","","","",""],["","","","","","","#0f0d16","#0f0d16","#5e3416","#5e3416","#0f0d16","#0f0d16","","","","","",""],["","","","","","","#0f0d16","#0f0d16","#5e3416","#5e3416","#0f0d16","#0f0d16","","","","","",""],["#6e3e18","#a86a34","#a86a34","#a86a34","#a86a34","#a86a34","#a86a34","#a86a34","#a86a34","#a86a34","#a86a34","#a86a34","#a86a34","#a86a34","#a86a34","#a86a34","#a86a34","#6e3e18"],["#d8283a","#d8283a","#d8283a","#d8283a","#fff0e4","#d8283a","#d8283a","#fff0e4","#d8283a","#d8283a","#d8283a","#fff0e4","#fff0e4","#d8283a","#d8283a","#d8283a","#d8283a","#8a1020"],["#d8283a","#d8283a","#d8283a","#d8283a","#fff0e4","#fff0e4","#d8283a","#fff0e4","#d8283a","#d8283a","#fff0e4","#d8283a","#d8283a","#fff0e4","#d8283a","#d8283a","#d8283a","#8a1020"],["#d8283a","#d8283a","#d8283a","#d8283a","#fff0e4","#d8283a","#fff0e4","#fff0e4","#d8283a","#d8283a","#fff0e4","#d8283a","#d8283a","#fff0e4","#d8283a","#d8283a","#d8283a","#8a1020"],["#d8283a","#d8283a","#d8283a","#d8283a","#fff0e4","#d8283a","#d8283a","#fff0e4","#d8283a","#d8283a","#d8283a","#fff0e4","#fff0e4","#d8283a","#d8283a","#d8283a","#d8283a","#8a1020"],["#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020","#8a1020"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "floppy_disk",
    name: "a floppy disk. it is the save icon now.",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#3a5ad0","#3a5ad0","#3a5ad0","#d4d8e2","#d4d8e2","#d4d8e2","#d4d8e2","#d4d8e2","#d4d8e2","#d4d8e2","#d4d8e2","#3a5ad0","#3a5ad0","#22348a"],["#3a5ad0","#3a5ad0","#3a5ad0","#d4d8e2","#d4d8e2","#d4d8e2","#d4d8e2","#1a1a26","#1a1a26","#d4d8e2","#8a909c","#3a5ad0","#3a5ad0","#22348a"],["#3a5ad0","#3a5ad0","#3a5ad0","#d4d8e2","#d4d8e2","#d4d8e2","#d4d8e2","#1a1a26","#1a1a26","#d4d8e2","#8a909c","#3a5ad0","#3a5ad0","#22348a"],["#3a5ad0","#3a5ad0","#3a5ad0","#d4d8e2","#d4d8e2","#d4d8e2","#d4d8e2","#1a1a26","#1a1a26","#d4d8e2","#8a909c","#3a5ad0","#3a5ad0","#22348a"],["#3a5ad0","#3a5ad0","#3a5ad0","#d4d8e2","#d4d8e2","#d4d8e2","#d4d8e2","#1a1a26","#1a1a26","#d4d8e2","#8a909c","#3a5ad0","#3a5ad0","#22348a"],["#3a5ad0","#3a5ad0","#3a5ad0","#8a909c","#8a909c","#8a909c","#8a909c","#8a909c","#8a909c","#8a909c","#8a909c","#3a5ad0","#3a5ad0","#22348a"],["#3a5ad0","#3a5ad0","#3a5ad0","#3a5ad0","#3a5ad0","#3a5ad0","#3a5ad0","#3a5ad0","#3a5ad0","#3a5ad0","#3a5ad0","#3a5ad0","#3a5ad0","#22348a"],["#3a5ad0","#3a5ad0","#e04a3a","#e04a3a","#e04a3a","#e04a3a","#e04a3a","#e04a3a","#e04a3a","#e04a3a","#e04a3a","#e04a3a","#3a5ad0","#22348a"],["#3a5ad0","#3a5ad0","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#3a5ad0","#22348a"],["#3a5ad0","#3a5ad0","#f6f2e6","#a8a090","#a8a090","#a8a090","#a8a090","#a8a090","#a8a090","#f6f2e6","#f6f2e6","#f6f2e6","#3a5ad0","#22348a"],["#3a5ad0","#3a5ad0","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#3a5ad0","#22348a"],["#3a5ad0","#3a5ad0","#f6f2e6","#a8a090","#a8a090","#a8a090","#a8a090","#a8a090","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#3a5ad0","#22348a"],["#3a5ad0","#3a5ad0","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#f6f2e6","#3a5ad0","#22348a"],["#22348a","#22348a","#22348a","#22348a","#22348a","#22348a","#22348a","#22348a","#22348a","#22348a","#22348a","#22348a","#22348a","#22348a"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "skateboard",
    name: "a skateboard that has done one (1) kickflip",
    grid: [
        "XXXX"
      ],
    color: [["#9a4113","#d66623","#8dd6ca","#8dd6ca","#4abca1","#d6863e","#d6863e","#d6863e","#d6863e","#d6863e","#d6b031","#d6863e","#d6863e","#d6863e","#d6b031","#d6863e","#d6863e","#d6863e","#8dd6ca","#8dd6ca","#4abca1","#d6863e","#d66623","#9a4113"],["#b44c16","#ff7a2a","#58e0c0","#58e0c0","#58e0c0","#ffa04a","#ffa04a","#ffa04a","#ffa04a","#ffd23a","#e8302a","#ffd23a","#ffa04a","#ffd23a","#e8302a","#ffd23a","#ffa04a","#ffa04a","#58e0c0","#58e0c0","#58e0c0","#ffa04a","#ff7a2a","#b44c16"],["#b44c16","#c4cad8","#7a8296","#7a8296","#7a8296","#c4cad8","#ff7a2a","#ff7a2a","#ffd23a","#e8302a","#e8302a","#e8302a","#ffd23a","#e8302a","#e8302a","#e8302a","#ffd23a","#c4cad8","#7a8296","#7a8296","#7a8296","#c4cad8","#ff7a2a","#b44c16"],["#b44c16","#c4cad8","#7a8296","#7a8296","#7a8296","#c4cad8","#ff7a2a","#ffd23a","#e8302a","#e8302a","#e8302a","#e8302a","#e8302a","#e8302a","#e8302a","#e8302a","#ffd23a","#c4cad8","#7a8296","#7a8296","#7a8296","#c4cad8","#ff7a2a","#b44c16"],["#b44c16","#ff7a2a","#a8fff0","#a8fff0","#58e0c0","#d65a1a","#d65a1a","#d65a1a","#d65a1a","#ffd23a","#d65a1a","#d65a1a","#ffd23a","#d65a1a","#d65a1a","#ffd23a","#d65a1a","#d65a1a","#a8fff0","#a8fff0","#58e0c0","#d65a1a","#ff7a2a","#b44c16"],["#9a4113","#d66623","#4abca1","#4abca1","#4abca1","#b44c16","#b44c16","#b44c16","#b44c16","#b44c16","#b44c16","#b44c16","#b44c16","#b44c16","#b44c16","#b44c16","#b44c16","#b44c16","#4abca1","#4abca1","#4abca1","#b44c16","#d66623","#9a4113"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "sport"
      ],
  },
  {
    id: "amber_light",
    name: "a traffic light stuck on amber. nobody knows what to do.",
    grid: [
        "X",
        "X",
        "X"
      ],
    color: [["#555a67","#646a7a","#95585d","#95585d","#646a7a","#555a67"],["#4a5060","#7a2a30","#a04048","#7a2a30","#7a2a30","#4a5060"],["#95585d","#a04048","#7a2a30","#7a2a30","#7a2a30","#95585d"],["#95585d","#7a2a30","#7a2a30","#7a2a30","#7a2a30","#95585d"],["#4a5060","#7a2a30","#7a2a30","#7a2a30","#7a2a30","#4a5060"],["#4a5060","#5d6478","#7a2a30","#7a2a30","#5d6478","#4a5060"],["#7b6e40","#9a8a50","#ffaa1a","#ffaa1a","#9a8a50","#7b6e40"],["#7b6e40","#ffaa1a","#fff2a0","#ffaa1a","#ffaa1a","#7b6e40"],["#cc8815","#fff2a0","#ffaa1a","#ffaa1a","#ffaa1a","#cc8815"],["#cc8815","#ffaa1a","#ffaa1a","#ffaa1a","#ffaa1a","#a66206"],["#7b6e40","#ffaa1a","#ffaa1a","#ffaa1a","#d07a08","#7b6e40"],["#7b6e40","#9a8a50","#d07a08","#d07a08","#9a8a50","#7b6e40"],["#646a7a","#7d8498","#1e5a34","#1e5a34","#7d8498","#646a7a"],["#4a5060","#1e5a34","#2e7a46","#1e5a34","#1e5a34","#4a5060"],["#4f7d60","#2e7a46","#1e5a34","#1e5a34","#1e5a34","#4f7d60"],["#4f7d60","#1e5a34","#1e5a34","#1e5a34","#1e5a34","#4f7d60"],["#4a5060","#1e5a34","#1e5a34","#1e5a34","#1e5a34","#4a5060"],["#3f4452","#4a5060","#4f7d60","#4f7d60","#4a5060","#3f4452"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "set_square",
    name: "a set square. ninety degrees is all it knows.",
    grid: [
        "X.",
        "XX"
      ],
    color: [["#79b1ad","#8dcfca","#4cb5af","#4cb5af","#4cb5af","#419c96","","","","","",""],["#8dcfca","#156a64","#5ad8d0","#5ad8d0","#5ad8d0","#4cb5af","","","","","",""],["#8dcfca","#a8f6f0","#156a64","#5ad8d0","#5ad8d0","#4cb5af","","","","","",""],["#8dcfca","#156a64","#2aa8a0","#5ad8d0","#5ad8d0","#4cb5af","","","","","",""],["#8dcfca","#a8f6f0","#2aa8a0","#2aa8a0","#5ad8d0","#4cb5af","","","","","",""],["#8dcfca","#156a64","#2aa8a0","#d4fffa","#2aa8a0","#4cb5af","","","","","",""],["#8dcfca","#a8f6f0","#156a64","#d4fffa","#d4fffa","#2aa8a0","#4cb5af","#4cb5af","#4cb5af","#238d86","#4cb5af","#419c96"],["#8dcfca","#156a64","#2aa8a0","#d4fffa","#d4fffa","#d4fffa","#2aa8a0","#5ad8d0","#5ad8d0","#5ad8d0","#2aa8a0","#4cb5af"],["#8dcfca","#a8f6f0","#2aa8a0","#d4fffa","#d4fffa","#d4fffa","#d4fffa","#2aa8a0","#5ad8d0","#5ad8d0","#a8f6f0","#238d86"],["#8dcfca","#156a64","#2aa8a0","#2aa8a0","#156a64","#2aa8a0","#2aa8a0","#2aa8a0","#156a64","#5ad8d0","#5ad8d0","#8dcfca"],["#8dcfca","#a8f6f0","#156a64","#ff8a2a","#156a64","#a8f6f0","#156a64","#a8f6f0","#156a64","#a8f6f0","#156a64","#8dcfca"],["#79b1ad","#8dcfca","#8dcfca","#d67423","#8dcfca","#8dcfca","#8dcfca","#8dcfca","#8dcfca","#8dcfca","#8dcfca","#79b1ad"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "magnet_s",
    name: "a fridge magnet S. the rest of the alphabet is under the fridge.",
    grid: [
        ".XX",
        "XX."
      ],
    color: [["","","","","","","#0f0d16","#ff8a90","#ff8a90","#ff8a90","#ff8a90","#ff8a90","#ff8a90","#ff8a90","#ff8a90","#ff8a90","#e8303a","#0f0d16"],["","","","","","","#ff8a90","#ffd8da","#ffd8da","#ff8a90","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#a8141e"],["","","","","","","#ff8a90","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#a8141e","#a8141e","#a8141e"],["","","","","","","#ff8a90","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#a8141e","#a8141e","#0f0d16"],["","","","","","","#ff8a90","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#a8141e","#a8141e","#0f0d16"],["","","","","","","#ff8a90","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#a8141e","#a8141e","#a8141e","#a8141e","#0f0d16"],["#0f0d16","#ff8a90","#ff8a90","#ff8a90","#ff8a90","#ff8a90","#ff8a90","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","","","","","",""],["#ff8a90","#ffd8da","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","","","","","",""],["#ff8a90","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","","","","","",""],["#ff8a90","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","","","","","",""],["#a8141e","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#e8303a","#a8141e","","","","","",""],["#0f0d16","#a8141e","#a8141e","#a8141e","#a8141e","#a8141e","#a8141e","#a8141e","#a8141e","#a8141e","#a8141e","#a8141e","","","","","",""]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "hockey_stick",
    name: "a hockey stick. it has never seen ice and it is nervous.",
    grid: [
        ".X",
        ".X",
        "XX"
      ],
    color: [["","","","","","","#b84141","#d64c4c","#d64c4c","#d64c4c","#d64c4c","#b84141"],["","","","","","","#cbcdd0","#f2f4f8","#f2f4f8","#f2f4f8","#f2f4f8","#cbcdd0"],["","","","","","","#8d939e","#a8afbc","#a8afbc","#a8afbc","#a8afbc","#8d939e"],["","","","","","","#cbcdd0","#f2f4f8","#f2f4f8","#f2f4f8","#f2f4f8","#cbcdd0"],["","","","","","","#8d939e","#a8afbc","#a8afbc","#a8afbc","#a8afbc","#8d939e"],["","","","","","","#b98d52","#f6d8a0","#f6d8a0","#dca862","#dca862","#946632"],["","","","","","","#b98d52","#4a2a12","#f6d8a0","#dca862","#4a2a12","#946632"],["","","","","","","#b98d52","#ffffff","#f6d8a0","#b07a3c","#ffffff","#946632"],["","","","","","","#b98d52","#f6d8a0","#f6d8a0","#dca862","#dca862","#78b2d6"],["","","","","","","#b98d52","#f6d8a0","#4a2a12","#4a2a12","#dca862","#4c94ca"],["","","","","","","#b98d52","#4a2a12","#b07a3c","#dca862","#4a2a12","#946632"],["","","","","","","#b98d52","#f6d8a0","#f6d8a0","#dca862","#dca862","#946632"],["#5870b0","#314fa8","#6683cd","#314fa8","#6683cd","#cfb586","#dca862","#f6d8a0","#f6d8a0","#dca862","#dca862","#946632"],["#6683cd","#3a5ec8","#7a9cf4","#3a5ec8","#7a9cf4","#f6d8a0","#dca862","#f6d8a0","#f6d8a0","#b07a3c","#dca862","#946632"],["#6683cd","#3a5ec8","#7a9cf4","#3a5ec8","#7a9cf4","#dca862","#dca862","#dca862","#f6d8a0","#dca862","#dca862","#946632"],["#6683cd","#3a5ec8","#7a9cf4","#3a5ec8","#7a9cf4","#dca862","#dca862","#dca862","#dca862","#dca862","#dca862","#b98d52"],["#6683cd","#3a5ec8","#7a9cf4","#3a5ec8","#7a9cf4","#b07a3c","#b07a3c","#b07a3c","#b07a3c","#b07a3c","#b07a3c","#946632"],["#5870b0","#314fa8","#6683cd","#314fa8","#6683cd","#946632","#946632","#946632","#946632","#946632","#946632","#7f582b"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "sport"
      ],
  },
  {
    id: "maraca",
    name: "a maraca, shaking with excitement",
    grid: [
        "XX",
        "XX",
        "X."
      ],
    color: [["#ab2a2e","#c83136","#329e40","#329e40","#d6b031","#d6b031","#c83136","#c83136","#329e40","#329e40","#d6b031","#b8972a"],["#c83136","#3cbc4c","#3cbc4c","#ffe27f","#ffd23a","#ee3a40","#ee3a40","#3cbc4c","#3cbc4c","#ffd23a","#ffd23a","#c83136"],["#329e40","#3cbc4c","#ffe27f","#ffe27f","#f47f83","#ee3a40","#3cbc4c","#3cbc4c","#ffd23a","#ffd23a","#ee3a40","#c83136"],["#329e40","#ffe27f","#ffe27f","#f47f83","#f47f83","#80d38b","#3cbc4c","#ffd23a","#ffd23a","#ee3a40","#ee3a40","#329e40"],["#d6b031","#ffd23a","#f47f83","#f47f83","#80d38b","#3cbc4c","#ffd23a","#ffd23a","#ee3a40","#ee3a40","#3cbc4c","#329e40"],["#d6b031","#ee3a40","#ee3a40","#80d38b","#3cbc4c","#ffd23a","#ffd23a","#ee3a40","#ee3a40","#3cbc4c","#3cbc4c","#d6b031"],["#c83136","#ee3a40","#3cbc4c","#3cbc4c","#ffd23a","#ffd23a","#ee3a40","#ee3a40","#3cbc4c","#3cbc4c","#ffd23a","#d6b031"],["#c83136","#3cbc4c","#3cbc4c","#ffd23a","#ffd23a","#ee3a40","#ee3a40","#3cbc4c","#3cbc4c","#ffd23a","#ffd23a","#c83136"],["#329e40","#3cbc4c","#ffd23a","#ffd23a","#ee3a40","#ee3a40","#3cbc4c","#3cbc4c","#ffd23a","#ffd23a","#ee3a40","#c83136"],["#329e40","#ffd23a","#ffd23a","#ee3a40","#ee3a40","#3cbc4c","#3cbc4c","#ffd23a","#ffd23a","#ee3a40","#ee3a40","#329e40"],["#d6b031","#ffd23a","#ee3a40","#ee3a40","#3cbc4c","#3cbc4c","#ffd23a","#ffd23a","#ee3a40","#ee3a40","#3cbc4c","#329e40"],["#d6b031","#ee3a40","#ee3a40","#3cbc4c","#3cbc4c","#ffd23a","#d6b031","#c83136","#c83136","#329e40","#329e40","#b8972a"],["#d65959","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#d65959","","","","","",""],["#a12025","#c0262c","#c0262c","#c0262c","#c0262c","#a12025","","","","","",""],["#946632","#dca862","#f6d8a0","#f6d8a0","#dca862","#946632","","","","","",""],["#946632","#dca862","#b07a3c","#f6d8a0","#dca862","#946632","","","","","",""],["#946632","#dca862","#f6d8a0","#f6d8a0","#b07a3c","#946632","","","","","",""],["#7f582b","#b98d52","#cfb586","#946632","#b98d52","#7f582b","","","","","",""]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "music"
      ],
  },
  {
    id: "participation_trophy",
    name: "a trophy for participating. well done, everyone.",
    grid: [
        "XXX",
        ".X.",
        "XXX"
      ],
    color: [["#a5832c","#c29a33","#c29a33","#cbb94e","#cbb94e","#cbb94e","#cbb94e","#cbb94e","#cbb94e","#cbb94e","#cbb94e","#cbb94e","#cbb94e","#cbb94e","#cbb94e","#c29a33","#c29a33","#a5832c"],["#c29a33","#a46a1c","#f2c040","#f2c040","#fee761","#ffffff","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#d89a28","#f2c040","#a46a1c","#c29a33"],["#c29a33","#a46a1c","#f2c040","#f2c040","#fee761","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#d89a28","#f2c040","#a46a1c","#c29a33"],["#ad7b20","#f2c040","#d89a28","#f2c040","#fee761","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#d89a28","#d89a28","#f2c040","#ad7b20"],["#ad7b20","#d89a28","#d89a28","#d89a28","#d89a28","#fee761","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#d89a28","#d89a28","#d89a28","#d89a28","#ad7b20"],["#704813","#835516","#835516","#835516","#835516","#835516","#c28b24","#fee761","#f2c040","#f2c040","#f2c040","#c28b24","#ad7b20","#835516","#835516","#835516","#835516","#704813"],["","","","","","","#ad7b20","#f2c040","#fee761","#f2c040","#f2c040","#ad7b20","","","","","",""],["","","","","","","#ad7b20","#f2c040","#fee761","#f2c040","#f2c040","#ad7b20","","","","","",""],["","","","","","","#835516","#d89a28","#f2c040","#f2c040","#d89a28","#835516","","","","","",""],["","","","","","","#ad7b20","#f2c040","#fee761","#f2c040","#f2c040","#ad7b20","","","","","",""],["","","","","","","#ad7b20","#d89a28","#f2c040","#f2c040","#d89a28","#ad7b20","","","","","",""],["","","","","","","#ad7b20","#f2c040","#fee761","#f2c040","#f2c040","#ad7b20","","","","","",""],["#785336","#8d6240","#8d6240","#8d6240","#8d6240","#8d6240","#9e6e48","#b07a50","#b07a50","#b07a50","#b07a50","#9e6e48","#8d6240","#8d6240","#8d6240","#8d6240","#8d6240","#785336"],["#72452f","#8f563b","#8f563b","#8f563b","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#8f563b","#8f563b","#8f563b","#72452f"],["#72452f","#6b3e22","#8f563b","#8f563b","#c0cbdc","#5a6988","#5a6988","#c0cbdc","#5a6988","#5a6988","#c0cbdc","#5a6988","#5a6988","#c0cbdc","#8f563b","#8f563b","#6b3e22","#72452f"],["#72452f","#8f563b","#8f563b","#8f563b","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8f563b","#8f563b","#8f563b","#72452f"],["#72452f","#8f563b","#6b3e22","#8f563b","#8f563b","#8f563b","#8f563b","#8f563b","#8f563b","#8f563b","#8f563b","#8f563b","#8f563b","#6b3e22","#8f563b","#8f563b","#8f563b","#72452f"],["#967866","#8a6852","#8a6852","#8a6852","#8a6852","#8a6852","#8a6852","#8a6852","#8a6852","#8a6852","#8a6852","#8a6852","#8a6852","#8a6852","#8a6852","#8a6852","#8a6852","#967866"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "sport"
      ],
  },
  {
    id: "microscope",
    name: "a microscope. it has a few questions about you.",
    grid: [
        ".X.",
        ".XX",
        "XXX",
        ".XX"
      ],
    color: [["","","","","","","#838a96","#9aa2b0","#9aa2b0","#9aa2b0","#6f7c90","#3d475c","","","","","",""],["","","","","","","#9aa2b0","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#48546d","","","","","",""],["","","","","","","#9aa2b0","#f4f4f4","#2a7fd4","#2a7fd4","#2a7fd4","#48546d","","","","","",""],["","","","","","","#9aa2b0","#f4f4f4","#2a7fd4","#1a2a4a","#2a7fd4","#48546d","","","","","",""],["","","","","","","#9aa2b0","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#48546d","","","","","",""],["","","","","","","#48546d","#8b9bb4","#8b9bb4","#8b9bb4","#5a6988","#48546d","","","","","",""],["","","","","","","#48546d","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#515e7a","#b8bdc3","#b8bdc3","#b8bdc3","#b8bdc3","#b8bdc3","#78808b"],["","","","","","","#48546d","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#5a6988","#e6ecf4","#e6ecf4","#e6ecf4","#e6ecf4","#e6ecf4","#8d96a3"],["","","","","","","#ad8d3a","#d8b048","#d8b048","#d8b048","#d8b048","#d8b048","#e6ecf4","#e43b44","#e43b44","#e6ecf4","#e6ecf4","#8d96a3"],["","","","","","","#806220","#a07a28","#a07a28","#a07a28","#a07a28","#a07a28","#e6ecf4","#a22633","#a22633","#e6ecf4","#e6ecf4","#8d96a3"],["","","","","","","#48546d","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#5a6988","#b0bccc","#e6ecf4","#e6ecf4","#e6ecf4","#e6ecf4","#8d96a3"],["","","","","","","#3b4560","#5a6988","#c0cbdc","#c0cbdc","#5a6988","#4a5678","#b0bccc","#e6ecf4","#e6ecf4","#e6ecf4","#e6ecf4","#8d96a3"],["#838a96","#9aa2b0","#9aa2b0","#9aa2b0","#9aa2b0","#9aa2b0","#e6e6e6","#c0cbdc","#d8b048","#d8b048","#5a6988","#c0cbdc","#b0bccc","#e6ecf4","#e6ecf4","#e6ecf4","#e6ecf4","#8d96a3"],["#cccccc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#8fd8ff","#8fd8ff","#8fd8ff","#8fd8ff","#8fd8ff","#8fd8ff","#c0cbdc","#e6ecf4","#e6ecf4","#e6ecf4","#8d96a3"],["#6f7c90","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#5ab0e0","#5ab0e0","#5ab0e0","#5ab0e0","#5ab0e0","#5ab0e0","#8b9bb4","#8b9bb4","#e6ecf4","#e6ecf4","#e6ecf4","#8d96a3"],["#48546d","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#e6ecf4","#e6ecf4","#e6ecf4","#8d96a3"],["#48546d","#e43b44","#e43b44","#e43b44","#e43b44","#5a6988","#4a5678","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#4a5678","#b0bccc","#e6ecf4","#e6ecf4","#e6ecf4","#e6ecf4","#8d96a3"],["#3d475c","#821e29","#b62f36","#b62f36","#821e29","#48546d","#434d6c","#4a5678","#4a5678","#4a5678","#4a5678","#4a5678","#b0bccc","#e6ecf4","#e6ecf4","#e6ecf4","#e6ecf4","#8d96a3"],["","","","","","","#adb2ba","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#5a6988","#5a6988","#5a6988","#d8dee8","#d8dee8","#d8dee8","#858d9b"],["","","","","","","#adb2ba","#ffffff","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#5a6988","#d8dee8","#d8dee8","#d8dee8","#858d9b"],["","","","","","","#adb2ba","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#5a6988","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#858d9b"],["","","","","","","#adb2ba","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#858d9b"],["","","","","","","#adb2ba","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#5a6988","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#858d9b"],["","","","","","","#717884","#858d9b","#858d9b","#858d9b","#858d9b","#858d9b","#858d9b","#858d9b","#858d9b","#858d9b","#858d9b","#717884"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "science"
      ],
  },
  {
    id: "saxophone",
    name: "a saxophone (smooth)",
    grid: [
        "XX.",
        "X..",
        "X.X",
        "XXX"
      ],
    color: [["#906d1e","#c7af57","#c7af57","#c7af57","#c7af57","#c7af57","#c7af57","#c7af57","#c7af57","#b58925","#b58925","#906d1e","","","","","",""],["#b58925","#ffe070","#ffe070","#ffe070","#ffe070","#ffe070","#ffe070","#ffe070","#ffe070","#d8dce8","#4a4a60","#3a3a4b","","","","","",""],["#b58925","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#4a4a60","#4a4a60","#3a3a4b","","","","","",""],["#b58925","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#4a4a60","#4a4a60","#3a3a4b","","","","","",""],["#b58925","#e8b030","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#d8dce8","#4a4a60","#3a3a4b","","","","","",""],["#b58925","#e8b030","#c08a1c","#c08a1c","#c08a1c","#ab7b19","#966c16","#966c16","#966c16","#b58925","#b58925","#906d1e","","","","","",""],["#b58925","#ffe070","#e8b030","#e8b030","#c08a1c","#b58925","","","","","","","","","","","",""],["#b58925","#ffe070","#8a5a14","#8a5a14","#c08a1c","#b58925","","","","","","","","","","","",""],["#b58925","#ffe070","#fff4dc","#fff4dc","#c08a1c","#b58925","","","","","","","","","","","",""],["#b58925","#ffe070","#e8b030","#e8b030","#c08a1c","#b58925","","","","","","","","","","","",""],["#b58925","#ffe070","#8a5a14","#8a5a14","#c08a1c","#b58925","","","","","","","","","","","",""],["#b58925","#ffe070","#fff4dc","#fff4dc","#c08a1c","#b58925","","","","","","","","","","","",""],["#b58925","#ffe070","#e8b030","#e8b030","#c08a1c","#b58925","","","","","","","#9e8b45","#c7af57","#c7af57","#c7af57","#c7af57","#9e8b45"],["#b58925","#ffe070","#e8b030","#e8b030","#c08a1c","#b58925","","","","","","","#c7af57","#7a4a10","#7a4a10","#7a4a10","#7a4a10","#c7af57"],["#b58925","#ffe070","#8a5a14","#8a5a14","#c08a1c","#b58925","","","","","","","#835313","#7a4a10","#7a4a10","#7a4a10","#7a4a10","#835313"],["#b58925","#ffe070","#fff4dc","#fff4dc","#c08a1c","#b58925","","","","","","","#b58925","#a86a18","#a86a18","#a86a18","#a86a18","#966c16"],["#b58925","#ffe070","#e8b030","#e8b030","#c08a1c","#b58925","","","","","","","#b58925","#ffe070","#e8b030","#e8b030","#c08a1c","#966c16"],["#b58925","#ffe070","#e8b030","#e8b030","#c08a1c","#b58925","","","","","","","#b58925","#ffe070","#e8b030","#e8b030","#c08a1c","#966c16"],["#b58925","#ffe070","#8a5a14","#8a5a14","#c08a1c","#ce9d2b","#b58925","#b58925","#b58925","#b58925","#b58925","#b58925","#ce9d2b","#ffe070","#e8b030","#e8b030","#c08a1c","#966c16"],["#b58925","#ffe070","#fff4dc","#fff4dc","#c08a1c","#e8b030","#ffe070","#ffe070","#ffe070","#ffe070","#ffe070","#ffe070","#ffe070","#ffe070","#e8b030","#e8b030","#c08a1c","#966c16"],["#b58925","#ffe070","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#c08a1c","#c08a1c","#966c16"],["#b58925","#e8b030","#ffe070","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#e8b030","#c08a1c","#c08a1c","#966c16"],["#b58925","#e8b030","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#c08a1c","#966c16"],["#906d1e","#966c16","#966c16","#966c16","#966c16","#966c16","#966c16","#966c16","#966c16","#966c16","#966c16","#966c16","#966c16","#966c16","#966c16","#966c16","#966c16","#775611"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "music"
      ],
  },
  {
    id: "vhs_tape",
    name: "a VHS tape. be kind, rewind.",
    grid: [
        "XXX",
        "XXX"
      ],
    color: [["#4b5062","#585e73","#585e73","#585e73","#585e73","#585e73","#585e73","#585e73","#585e73","#585e73","#585e73","#585e73","#585e73","#585e73","#585e73","#585e73","#585e73","#4b5062"],["#3e4355","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#3e4355"],["#3e4355","#f4f0e8","#3b5dc9","#3b5dc9","#3b5dc9","#3b5dc9","#f4f0e8","#f4f0e8","#3b5dc9","#3b5dc9","#f4f0e8","#f4f0e8","#f4f0e8","#e43b44","#e43b44","#e43b44","#f4f0e8","#3e4355"],["#3e4355","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#f4f0e8","#3e4355"],["#3e4355","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#3e4355"],["#3e4355","#4e546a","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#33394e","#33394e","#33394e","#33394e","#33394e","#33394e","#33394e","#33394e","#4e546a","#3e4355"],["#3e4355","#7a4a2a","#7a4a2a","#5a3420","#7a4a2a","#9aa6b8","#9aa6b8","#7a4a2a","#7a4a2a","#33394e","#33394e","#9aa6b8","#9aa6b8","#33394e","#33394e","#33394e","#4e546a","#3e4355"],["#3e4355","#7a4a2a","#7a4a2a","#7a4a2a","#9aa6b8","#e8eef8","#e8eef8","#9aa6b8","#7a4a2a","#33394e","#33394e","#9aa6b8","#e8eef8","#e8eef8","#33394e","#33394e","#33394e","#3e4355"],["#3e4355","#7a4a2a","#7a4a2a","#5a3420","#7a4a2a","#9aa6b8","#9aa6b8","#7a4a2a","#7a4a2a","#33394e","#33394e","#9aa6b8","#9aa6b8","#33394e","#33394e","#33394e","#4e546a","#3e4355"],["#3e4355","#4e546a","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#33394e","#33394e","#33394e","#33394e","#33394e","#33394e","#33394e","#33394e","#4e546a","#3e4355"],["#3e4355","#4e546a","#3c4256","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#4e546a","#3c4256","#4e546a","#3e4355"],["#777b88","#666b7a","#666b7a","#666b7a","#666b7a","#666b7a","#666b7a","#666b7a","#666b7a","#666b7a","#666b7a","#666b7a","#666b7a","#666b7a","#666b7a","#666b7a","#666b7a","#777b88"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "dumbbell",
    name: "a dumbbell nobody has lifted since january",
    grid: [
        "X.X",
        "XXX",
        "X.X"
      ],
    color: [["#abadb8","#c8cad6","#c8cad6","#c8cad6","#9ea4af","#656a76","","","","","","","#656a76","#9ea4af","#404552","#767b8a","#9ea4af","#484d59"],["#c8cad6","#bcc3d0","#eef0ff","#4c5262","#bcc3d0","#767b8a","","","","","","","#767b8a","#bcc3d0","#4c5262","#8c93a4","#bcc3d0","#545a68"],["#c8cad6","#eef0ff","#8c93a4","#4c5262","#bcc3d0","#767b8a","","","","","","","#767b8a","#bcc3d0","#4c5262","#8c93a4","#bcc3d0","#545a68"],["#c8cad6","#bcc3d0","#8c93a4","#4c5262","#bcc3d0","#767b8a","","","","","","","#767b8a","#bcc3d0","#4c5262","#8c93a4","#bcc3d0","#545a68"],["#545a68","#bcc3d0","#8c93a4","#4c5262","#bcc3d0","#767b8a","","","","","","","#767b8a","#bcc3d0","#4c5262","#8c93a4","#bcc3d0","#545a68"],["#545a68","#bcc3d0","#8c93a4","#4c5262","#bcc3d0","#767b8a","","","","","","","#767b8a","#bcc3d0","#4c5262","#8c93a4","#bcc3d0","#545a68"],["#545a68","#bcc3d0","#8c93a4","#4c5262","#bcc3d0","#8c93a4","#666c79","#666c79","#666c79","#666c79","#666c79","#666c79","#8c93a4","#bcc3d0","#4c5262","#8c93a4","#bcc3d0","#545a68"],["#545a68","#ffd23a","#8c93a4","#4c5262","#bcc3d0","#8c93a4","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#d8dee8","#8c93a4","#bcc3d0","#4c5262","#8c93a4","#ffd23a","#545a68"],["#545a68","#ffd23a","#8c93a4","#4c5262","#ffd23a","#8c93a4","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#8c93a4","#ffd23a","#4c5262","#8c93a4","#ffd23a","#545a68"],["#545a68","#ffd23a","#8c93a4","#4c5262","#ffd23a","#8c93a4","#c8ced8","#8a909c","#c8ced8","#8a909c","#c8ced8","#8a909c","#8c93a4","#ffd23a","#4c5262","#8c93a4","#ffd23a","#545a68"],["#545a68","#ffd23a","#8c93a4","#4c5262","#bcc3d0","#8c93a4","#80869a","#a0a6b4","#80869a","#a0a6b4","#80869a","#a0a6b4","#8c93a4","#bcc3d0","#4c5262","#8c93a4","#ffd23a","#545a68"],["#545a68","#bcc3d0","#8c93a4","#4c5262","#bcc3d0","#8c93a4","#595e6c","#595e6c","#595e6c","#595e6c","#595e6c","#595e6c","#8c93a4","#bcc3d0","#4c5262","#8c93a4","#bcc3d0","#545a68"],["#545a68","#bcc3d0","#8c93a4","#4c5262","#bcc3d0","#767b8a","","","","","","","#767b8a","#bcc3d0","#4c5262","#8c93a4","#bcc3d0","#545a68"],["#545a68","#bcc3d0","#8c93a4","#4c5262","#bcc3d0","#767b8a","","","","","","","#767b8a","#bcc3d0","#4c5262","#8c93a4","#bcc3d0","#545a68"],["#545a68","#bcc3d0","#8c93a4","#4c5262","#bcc3d0","#767b8a","","","","","","","#767b8a","#bcc3d0","#4c5262","#8c93a4","#bcc3d0","#545a68"],["#545a68","#bcc3d0","#8c93a4","#4c5262","#bcc3d0","#767b8a","","","","","","","#767b8a","#bcc3d0","#4c5262","#8c93a4","#bcc3d0","#545a68"],["#545a68","#bcc3d0","#8c93a4","#4c5262","#bcc3d0","#767b8a","","","","","","","#767b8a","#bcc3d0","#4c5262","#8c93a4","#bcc3d0","#545a68"],["#484d59","#9ea4af","#767b8a","#404552","#9ea4af","#656a76","","","","","","","#656a76","#9ea4af","#404552","#767b8a","#9ea4af","#484d59"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "sport"
      ],
  },
  {
    id: "odd_flask",
    name: "a flask of something. it waved at me.",
    grid: [
        ".X.",
        ".X.",
        "XXX",
        "XXX"
      ],
    color: [["","","","","","","#967866","#72452f","#72452f","#72452f","#72452f","#967866","","","","","",""],["","","","","","","#8a6852","#6b3e22","#6b3e22","#6b3e22","#6b3e22","#8a6852","","","","","",""],["","","","","","","#627b8d","#5ae05a","#5ae05a","#e8f6ff","#5ae05a","#627b8d","","","","","",""],["","","","","","","#627b8d","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#627b8d","","","","","",""],["","","","","","","#627b8d","#e8f6ff","#5ae05a","#5ae05a","#2a9a3a","#627b8d","","","","","",""],["","","","","","","#627b8d","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#627b8d","","","","","",""],["","","","","","","#627b8d","#5ae05a","#5ae05a","#e8f6ff","#2a9a3a","#627b8d","","","","","",""],["","","","","","","#627b8d","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#627b8d","","","","","",""],["","","","","","","#627b8d","#5ae05a","#e8f6ff","#5ae05a","#2a9a3a","#627b8d","","","","","",""],["","","","","","","#627b8d","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#627b8d","","","","","",""],["","","","","","","#627b8d","#5ae05a","#5ae05a","#e8f6ff","#2a9a3a","#627b8d","","","","","",""],["","","","","","","#627b8d","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#627b8d","","","","","",""],["#728593","#869dad","#869dad","#869dad","#869dad","#869dad","#97b0c2","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#97b0c2","#869dad","#869dad","#869dad","#90cc7b","#90cc7b","#728593"],["#869dad","#a8c4d8","#e8f6ff","#a8c4d8","#a8c4d8","#a8c4d8","#a8c4d8","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#a8c4d8","#a8c4d8","#a8c4d8","#a8c4d8","#b4ff9a","#a8c4d8","#869dad"],["#869dad","#a8c4d8","#a8c4d8","#a8c4d8","#a8c4d8","#a8c4d8","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#a8c4d8","#a8c4d8","#b4ff9a","#a8c4d8","#a8c4d8","#869dad"],["#90cc7b","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#b4ff9a","#90cc7b"],["#48b348","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#2a9a3a","#2a9a3a","#48b348"],["#48b348","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#ffffff","#ffffff","#5ae05a","#5ae05a","#ffffff","#ffffff","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#2a9a3a","#2a9a3a","#48b348"],["#48b348","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#ffffff","#143018","#5ae05a","#5ae05a","#ffffff","#143018","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#2a9a3a","#2a9a3a","#48b348"],["#48b348","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#5ae05a","#5ae05a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#48b348"],["#48b348","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#2a9a3a","#2a9a3a","#48b348"],["#48b348","#5ae05a","#e8f6ff","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#5ae05a","#2a9a3a","#2a9a3a","#2a9a3a","#48b348"],["#227b2e","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#2a9a3a","#227b2e"],["#3d5362","#486273","#486273","#486273","#486273","#486273","#486273","#486273","#486273","#486273","#486273","#486273","#486273","#486273","#486273","#486273","#486273","#3d5362"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "science"
      ],
  },
  {
    id: "grumpy_emperor",
    name: "a bust of a Roman emperor having a bad century",
    grid: [
        ".XX.",
        ".XX.",
        "XXXX",
        ".XX."
      ],
    color: [["","","","","","#0f0d16","#2e7a2a","#6cc04a","#2e7a2a","#6cc04a","#2e7a2a","#6cc04a","#2e7a2a","#6cc04a","#0f0d16","","","","",""],["","","","","","#6cc04a","#2e7a2a","#c4beb2","#f0ece4","#c4beb2","#f0ece4","#c4beb2","#f0ece4","#2e7a2a","#6cc04a","","","","",""],["","","","","","#2e7a2a","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#c4beb2","#2e7a2a","","","","",""],["","","","","","#f0ece4","#3a342e","#3a342e","#f0ece4","#f0ece4","#f0ece4","#c4beb2","#3a342e","#3a342e","#8e887c","","","","",""],["","","","","","#f0ece4","#f0ece4","#8e887c","#3a342e","#f0ece4","#c4beb2","#3a342e","#8e887c","#8e887c","#8e887c","","","","",""],["","","","","","#f0ece4","#f0ece4","#8e887c","#8e887c","#f0ece4","#c4beb2","#8e887c","#8e887c","#c4beb2","#8e887c","","","","",""],["","","","","","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#8e887c","","","","",""],["","","","","","#f0ece4","#f0ece4","#f0ece4","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#8e887c","","","","",""],["","","","","","#0f0d16","#f0ece4","#f0ece4","#3a342e","#3a342e","#3a342e","#3a342e","#c4beb2","#8e887c","#0f0d16","","","","",""],["","","","","","#0f0d16","#0f0d16","#3a342e","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#3a342e","#0f0d16","#0f0d16","","","","",""],["#0f0d16","#0f0d16","#f0ece4","#f0ece4","#8e887c","#8e887c","#f0ece4","#f0ece4","#c4beb2","#c4beb2","#c4beb2","#8e887c","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#0f0d16","#0f0d16"],["#0f0d16","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#8e887c","#8e887c","#f0ece4","#f0ece4","#f0ece4","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#0f0d16"],["#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#8e887c","#8e887c","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#c4beb2"],["#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#f0ece4","#c4beb2","#8e887c","#8e887c","#c4beb2","#c4beb2","#c4beb2","#c4beb2","#c4beb2"],["#8e887c","#8e887c","#8e887c","#8e887c","#8e887c","#8e887c","#8e887c","#8e887c","#8e887c","#8e887c","#8e887c","#8e887c","#8e887c","#8e887c","#8e887c","#8e887c","#3a342e","#3a342e","#8e887c","#8e887c"],["","","","","","#8a8a96","#8a8a96","#8a8a96","#8a8a96","#8a8a96","#8a8a96","#8a8a96","#8a8a96","#8a8a96","#8a8a96","","","","",""],["","","","","","#5a5a66","#5a5a66","#d8b04a","#d8b04a","#d8b04a","#d8b04a","#d8b04a","#d8b04a","#5a5a66","#5a5a66","","","","",""],["","","","","","#5a5a66","#5a5a66","#d8b04a","#8a6a1a","#8a6a1a","#8a6a1a","#8a6a1a","#d8b04a","#5a5a66","#5a5a66","","","","",""],["","","","","","#5a5a66","#5a5a66","#d8b04a","#d8b04a","#d8b04a","#d8b04a","#d8b04a","#d8b04a","#5a5a66","#5a5a66","","","","",""],["","","","","","#3a3a44","#3a3a44","#3a3a44","#3a3a44","#3a3a44","#3a3a44","#3a3a44","#3a3a44","#3a3a44","#3a3a44","","","","",""]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "art"
      ],
  },
  {
    id: "telescope",
    name: "a telescope. the moon is not in today.",
    grid: [
        "..XX",
        ".XX.",
        "XXX.",
        "X.X."
      ],
    color: [["","","","","","","","","","","#7285ad","#869dcc","#4862b3","#c29a33","#adc3cc","#72adcc","#72adcc","#72adcc","#c29a33","#a5832c"],["","","","","","","","","","","#869dcc","#5a7ae0","#5a7ae0","#5a7ae0","#f2c040","#8fd8ff","#8fd8ff","#ffffff","#f2c040","#936e20"],["","","","","","","","","","","#4862b3","#5a7ae0","#5a7ae0","#3b5dc9","#3b5dc9","#f2c040","#f2c040","#f2c040","#ffffff","#936e20"],["","","","","","","","","","","#4862b3","#5a7ae0","#3b5dc9","#3b5dc9","#3b5dc9","#3b5dc9","#f2c040","#b88a28","#b88a28","#936e20"],["","","","","","","","","","","#4862b3","#3b5dc9","#3b5dc9","#3b5dc9","#3554b5","#2f4aa1","#5564a1","#936e20","#936e20","#7d5e1b"],["","","","","","#7285ad","#869dcc","#c29a33","#c29a33","#4862b3","#3554b5","#3b5dc9","#3b5dc9","#3b5dc9","#2f4aa1","","","","",""],["","","","","","#869dcc","#5a7ae0","#5a7ae0","#f2c040","#f2c040","#3b5dc9","#3b5dc9","#3b5dc9","#3b5dc9","#5564a1","","","","",""],["","","","","","#4862b3","#5a7ae0","#5a7ae0","#3b5dc9","#f2c040","#f2c040","#3b5dc9","#3b5dc9","#263a8a","#5564a1","","","","",""],["","","","","","#4862b3","#5a7ae0","#3b5dc9","#3b5dc9","#3b5dc9","#f2c040","#b88a28","#263a8a","#263a8a","#5564a1","","","","",""],["","","","","","#c29a33","#3b5dc9","#3b5dc9","#3b5dc9","#3b5dc9","#3b5dc9","#b88a28","#b88a28","#263a8a","#5564a1","","","","",""],["#838a96","#9aa2b0","#9aa2b0","#9aa2b0","#4862b3","#3554b5","#f2c040","#3b5dc9","#3b5dc9","#3b5dc9","#a0683c","#b88a28","#b88a28","#b88a28","#623b22","","","","",""],["#9aa2b0","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#3b5dc9","#3b5dc9","#f2c040","#3b5dc9","#263a8a","#b88a28","#d8b048","#d8b048","#d8b048","#936e20","","","","",""],["#9aa2b0","#c0cbdc","#c0cbdc","#c0cbdc","#7d879c","#7d879c","#3b5dc9","#3b5dc9","#b88a28","#263a8a","#b88a28","#d8b048","#d8b048","#d8b048","#936e20","","","","",""],["#9aa2b0","#c0cbdc","#c0cbdc","#7d879c","#7d879c","#7d879c","#7d879c","#263a8a","#263a8a","#b88a28","#b88a28","#d8b048","#d8b048","#d8b048","#936e20","","","","",""],["#9aa2b0","#c0cbdc","#7d879c","#7d879c","#707a8c","#646c7d","#646c7d","#646c7d","#5564a1","#5564a1","#6e4326","#b88a28","#b88a28","#b88a28","#805330","","","","",""],["#a06e48","#a0683c","#a0683c","#7a4a2a","#805330","","","","","","#a06e48","#7a4a2a","#a0683c","#a0683c","#805330","","","","",""],["#623b22","#a0683c","#a0683c","#c88a5a","#623b22","","","","","","#805330","#a0683c","#7a4a2a","#c88a5a","#805330","","","","",""],["#805330","#c88a5a","#a0683c","#a0683c","#805330","","","","","","#805330","#c88a5a","#a0683c","#7a4a2a","#805330","","","","",""],["#805330","#a0683c","#7a4a2a","#a0683c","#a06e48","","","","","","#623b22","#a0683c","#a0683c","#a0683c","#a06e48","","","","",""],["#6d4729","#805330","#a06e48","#623b22","#6d4729","","","","","","#6d4729","#623b22","#a06e48","#805330","#6d4729","","","","",""]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "science"
      ],
  },
  {
    id: "baguette",
    name: "a baguette, much too long for the bag",
    grid: [
        "XXXXX"
      ],
    color: [["#5e3410","#6e3d13","#6e3d13","#6e3d13","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#8d551a","#6e3d13","#5e3410"],["#6e3d13","#8a4c18","#b06a20","#e0a044","#e0a044","#e0a044","#e0a044","#fbf2dc","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#fbf2dc","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#b06a20","#6e3d13"],["#6e3d13","#b06a20","#e0a044","#e0a044","#f8d890","#f8d890","#e0a044","#e0a044","#e0a044","#e0a044","#f8d890","#f8d890","#e0a044","#e0a044","#e0a044","#e0a044","#f8d890","#f8d890","#e0a044","#e0a044","#e0a044","#e0a044","#f8d890","#f8d890","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#8d551a"],["#8d551a","#e0a044","#e0a044","#f8d890","#f8d890","#e0a044","#e0a044","#e0a044","#e0a044","#f8d890","#f8d890","#e0a044","#e0a044","#e0a044","#e0a044","#f8d890","#f8d890","#e0a044","#e0a044","#e0a044","#e0a044","#f8d890","#f8d890","#e0a044","#e0a044","#e0a044","#e0a044","#e0a044","#b06a20","#8d551a"],["#6e3d13","#b06a20","#b06a20","#e0a044","#e0a044","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#b06a20","#6e3d13"],["#5e3410","#6e3d13","#6e3d13","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#8c6645","#6e3d13","#5e3410"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "fried_egg",
    name: "a fried egg, sunny side up, cautiously optimistic",
    grid: [
        "XX",
        "X."
      ],
    color: [["#a06e2e","#d19e56","#d19e56","#d19e56","#b47c34","#d19e56","#d19e56","#d19e56","#b47c34","#d19e56","#d19e56","#ba8d4d"],["#d19e56","#fffaf0","#fffaf0","#ffe070","#ffe070","#fffaf0","#e8b060","#fffaf0","#fffaf0","#fffaf0","#e8b060","#d19e56"],["#d19e56","#e8b060","#fff6c0","#ffe070","#ffb820","#e08810","#fffaf0","#fffaf0","#fffaf0","#fffaf0","#fffaf0","#d19e56"],["#d19e56","#ffe070","#6a3008","#ffb820","#ffb820","#6a3008","#e08810","#fffaf0","#efe6d4","#fffaf0","#fffaf0","#b47c34"],["#b47c34","#ffe070","#ff9a40","#ffb820","#ffb820","#ff9a40","#e08810","#fffaf0","#fffaf0","#e8b060","#fffaf0","#d19e56"],["#d19e56","#fffaf0","#e08810","#6a3008","#6a3008","#e08810","#d19e56","#d19e56","#d19e56","#b47c34","#d19e56","#ba8d4d"],["#d19e56","#e8b060","#fffaf0","#e08810","#e08810","#d19e56","","","","","",""],["#d19e56","#fffaf0","#fffaf0","#fffaf0","#fffaf0","#d19e56","","","","","",""],["#b47c34","#fffaf0","#fffaf0","#efe6d4","#fffaf0","#d19e56","","","","","",""],["#d19e56","#fffaf0","#efe6d4","#fffaf0","#e8b060","#b47c34","","","","","",""],["#d19e56","#fffaf0","#e8b060","#fffaf0","#efe6d4","#d19e56","","","","","",""],["#ba8d4d","#d19e56","#d19e56","#b47c34","#d19e56","#ba8d4d","","","","","",""]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "corgi_bum",
    name: "a corgi, seen from behind (it is mostly bum)",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#9c5f1f","#db9790","#ac6922","#dbac67","#d08a37","#d08a37","#d08a37","#d08a37","#dbac67","#ac6922","#db9790","#9c5f1f"],["#ac6922","#ffb0a8","#ffb0a8","#c87a28","#f2a040","#f2a040","#f2a040","#f2a040","#c87a28","#ffb0a8","#ffb0a8","#ac6922"],["#d08a37","#c87a28","#ffb0a8","#c87a28","#f2a040","#ffc878","#ffc878","#f2a040","#c87a28","#ffb0a8","#c87a28","#d08a37"],["#d08a37","#f2a040","#c87a28","#f2a040","#ffc878","#ffc878","#ffc878","#ffc878","#f2a040","#c87a28","#f2a040","#d08a37"],["#d08a37","#ffc878","#f2a040","#f2a040","#f2a040","#f2a040","#f2a040","#f2a040","#f2a040","#f2a040","#ffc878","#d08a37"],["#d08a37","#f2a040","#f2a040","#f2a040","#f2a040","#ffdca0","#ffdca0","#f2a040","#f2a040","#f2a040","#f2a040","#d08a37"],["#d08a37","#f2a040","#fff6e6","#fff6e6","#fff6e6","#ffdca0","#ffdca0","#fff6e6","#fff6e6","#fff6e6","#f2a040","#d08a37"],["#d08a37","#fff6e6","#fff6e6","#fff6e6","#fff6e6","#fff6e6","#fff6e6","#fff6e6","#fff6e6","#fff6e6","#fff6e6","#d08a37"],["#d08a37","#fff6e6","#fff6e6","#fff6e6","#fff6e6","#e8d4b8","#e8d4b8","#fff6e6","#fff6e6","#fff6e6","#fff6e6","#d08a37"],["#d08a37","#fff6e6","#fff6e6","#fff6e6","#fff6e6","#e8d4b8","#e8d4b8","#fff6e6","#fff6e6","#fff6e6","#fff6e6","#d08a37"],["#d08a37","#e8d4b8","#fff6e6","#fff6e6","#e8d4b8","#f2a040","#f2a040","#e8d4b8","#fff6e6","#fff6e6","#e8d4b8","#d08a37"],["#9c5f1f","#dbac67","#dbac67","#ac6922","#ac6922","#ac6922","#ac6922","#ac6922","#ac6922","#dbac67","#dbac67","#9c5f1f"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "pea_pod",
    name: "a pea pod. one of them has moved out.",
    grid: [
        "XXX"
      ],
    color: [["#204813","#2e621b","#2e621b","#265516","#3d7b26","#3d7b26","#3d7b26","#3d7b26","#3d7b26","#3d7b26","#3d7b26","#3d7b26","#3d7b26","#3d7b26","#3d7b26","#3d7b26","#265516","#275317"],["#2e621b","#2f6a1c","#4c9a30","#86c850","#86c850","#86c850","#86c850","#86c850","#86c850","#86c850","#86c850","#86c850","#86c850","#86c850","#86c850","#86c850","#4c9a30","#265516"],["#265516","#4c9a30","#86c850","#e4ffb0","#9ee05a","#5aa82e","#86c850","#86c850","#e4ffb0","#9ee05a","#5aa82e","#86c850","#86c850","#3a7a22","#2f5a1c","#2f5a1c","#86c850","#3d7b26"],["#265516","#4c9a30","#86c850","#9ee05a","#9ee05a","#5aa82e","#86c850","#86c850","#9ee05a","#9ee05a","#5aa82e","#86c850","#86c850","#2f5a1c","#2f5a1c","#2f5a1c","#86c850","#3d7b26"],["#2e621b","#2f6a1c","#86c850","#5aa82e","#5aa82e","#5aa82e","#86c850","#86c850","#5aa82e","#5aa82e","#5aa82e","#86c850","#86c850","#86c850","#86c850","#86c850","#4c9a30","#265516"],["#275317","#2e621b","#265516","#265516","#265516","#265516","#265516","#265516","#265516","#265516","#265516","#265516","#265516","#265516","#265516","#265516","#2e621b","#275317"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "garden_hose",
    name: "a garden hose, kinked out of spite",
    grid: [
        ".XX",
        "XX."
      ],
    color: [["","","","","","","#226627","#45a143","#81c36a","#81c36a","#45a143","#27772d","#81c36a","#81c36a","#86651b","#d6c074","#d6c074","#b8a463"],["","","","","","","#27772d","#52c050","#9ae87e","#9ae87e","#52c050","#2f8e36","#9ae87e","#9ae87e","#a07820","#ffe48a","#ffe48a","#66afd6"],["","","","","","","#27772d","#52c050","#9ae87e","#9ae87e","#52c050","#2f8e36","#52c050","#52c050","#a07820","#e0b040","#e0b040","#66afd6"],["","","","","","","#27772d","#52c050","#9ae87e","#9ae87e","#52c050","#2f8e36","#52c050","#52c050","#a07820","#e0b040","#e0b040","#66afd6"],["","","","","","","#1a5922","#52c050","#1f6a28","#9ae87e","#1f6a28","#2f8e36","#2f8e36","#2f8e36","#a07820","#a07820","#a07820","#66afd6"],["","","","","","","#27772d","#1f6a28","#9ae87e","#1f6a28","#52c050","#1f6a28","#27772d","#27772d","#86651b","#86651b","#86651b","#735617"],["#735617","#86651b","#86651b","#81c36a","#81c36a","#27772d","#2f8e36","#1f6a28","#9ae87e","#1f6a28","#52c050","#1a5922","","","","","",""],["#bc9436","#ffe48a","#a07820","#9ae87e","#9ae87e","#2f8e36","#1f6a28","#52c050","#1f6a28","#9ae87e","#1f6a28","#27772d","","","","","",""],["#bc9436","#ffe48a","#a07820","#52c050","#52c050","#52c050","#2f8e36","#52c050","#9ae87e","#9ae87e","#52c050","#27772d","","","","","",""],["#bc9436","#ffe48a","#a07820","#52c050","#52c050","#52c050","#2f8e36","#52c050","#9ae87e","#9ae87e","#52c050","#27772d","","","","","",""],["#bc9436","#ffe48a","#a07820","#2f8e36","#2f8e36","#1f6a28","#2f8e36","#52c050","#9ae87e","#9ae87e","#52c050","#27772d","","","","","",""],["#735617","#86651b","#86651b","#27772d","#27772d","#1a5922","#27772d","#45a143","#81c36a","#81c36a","#45a143","#226627","","","","","",""]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "little_teapot",
    name: "a little teapot, short and stout (as advertised)",
    grid: [
        ".X.",
        "XXX"
      ],
    color: [["","","","","","","#60ad9e","#71cab9","#d6b031","#d6b031","#71cab9","#60ad9e","","","","","",""],["","","","","","","#71cab9","#86f0dc","#e0a820","#e0a820","#86f0dc","#71cab9","","","","","",""],["","","","","","","#71cab9","#86f0dc","#86f0dc","#86f0dc","#ffffff","#71cab9","","","","","",""],["","","","","","","#32a894","#3cc8b0","#ffffff","#3cc8b0","#3cc8b0","#32a894","","","","","",""],["","","","","","","#d6d6d6","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#32a894","","","","","",""],["","","","","","","#125e50","#16705f","#16705f","#16705f","#16705f","#125e50","","","","","",""],["#60ad9e","#71cab9","#71cab9","#71cab9","#71cab9","#71cab9","#86f0dc","#86f0dc","#86f0dc","#86f0dc","#86f0dc","#86f0dc","#71cab9","#71cab9","#71cab9","#71cab9","#71cab9","#0c453a"],["#0d5143","#106050","#106050","#106050","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#106050","#0d5143"],["#0d5143","#86f0dc","#86f0dc","#106050","#3cc8b0","#3cc8b0","#3cc8b0","#ffffff","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#106050","#106050","#32a894"],["#0d5143","#86f0dc","#86f0dc","#86f0dc","#106050","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#3cc8b0","#106050","#106050","#106050","#106050","#3cc8b0","#32a894"],["#0d5143","#86f0dc","#86f0dc","#106050","#ffffff","#21907e","#21907e","#21907e","#21907e","#21907e","#ffffff","#21907e","#106050","#ffffff","#106050","#21907e","#21907e","#1c796a"],["#0c453a","#0d5143","#0d5143","#1c796a","#1c796a","#1c796a","#1c796a","#1c796a","#1c796a","#1c796a","#1c796a","#1c796a","#1c796a","#1c796a","#1c796a","#1c796a","#1c796a","#18685b"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "candy_cane",
    name: "a candy cane from the back of the drawer",
    grid: [
        "XX",
        "X.",
        "X."
      ],
    color: [["#ad5357","#cc6266","#cc6266","#cccccc","#cccccc","#cccccc","#cc6266","#cc6266","#cc6266","#cccccc","#cccccc","#adadad"],["#cc6266","#ff7a80","#ffffff","#ffffff","#ffffff","#ff7a80","#ff7a80","#ff7a80","#ffffff","#ffffff","#ffffff","#cc6266"],["#cc6266","#ffffff","#f6f2f2","#f6f2f2","#e43b44","#e43b44","#e43b44","#f6f2f2","#f6f2f2","#f6f2f2","#e43b44","#b62f36"],["#cccccc","#ffffff","#f6f2f2","#e43b44","#e43b44","#e43b44","#f6f2f2","#f6f2f2","#f6f2f2","#9a96a8","#e43b44","#b62f36"],["#cccccc","#ffffff","#e43b44","#e43b44","#a8242e","#cfc6d2","#cfc6d2","#cfc6d2","#a8242e","#a8242e","#a8242e","#a69ea8"],["#cccccc","#ff7a80","#e43b44","#e43b44","#cfc6d2","#bab2bd","#a69ea8","#861d25","#861d25","#861d25","#a69ea8","#8d878f"],["#cc6266","#ff7a80","#e43b44","#f6f2f2","#cfc6d2","#a69ea8","","","","","",""],["#cc6266","#ff7a80","#f6f2f2","#f6f2f2","#cfc6d2","#861d25","","","","","",""],["#cc6266","#ffffff","#f6f2f2","#f6f2f2","#a8242e","#861d25","","","","","",""],["#cccccc","#ffffff","#c8a060","#e43b44","#a8242e","#861d25","","","","","",""],["#cccccc","#ffffff","#e43b44","#e43b44","#a8242e","#a69ea8","","","","","",""],["#cccccc","#ff7a80","#e43b44","#e43b44","#cfc6d2","#a69ea8","","","","","",""],["#cc6266","#ff7a80","#e43b44","#f6f2f2","#cfc6d2","#a69ea8","","","","","",""],["#cc6266","#ff7a80","#9a96a8","#9a96a8","#cfc6d2","#861d25","","","","","",""],["#cc6266","#ffffff","#f6f2f2","#9a96a8","#a8242e","#861d25","","","","","",""],["#cccccc","#ffffff","#f6f2f2","#e43b44","#a8242e","#861d25","","","","","",""],["#cccccc","#ffffff","#e43b44","#e43b44","#a8242e","#a69ea8","","","","","",""],["#adadad","#cc6266","#b62f36","#b62f36","#a69ea8","#8d878f","","","","","",""]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "hasty_snail",
    name: "a snail in a tremendous hurry",
    grid: [
        ".XX",
        "XXX"
      ],
    color: [["","","","","","","#9e683c","#c7834b","#c7834b","#af5e25","#af5e25","#af5e25","#af5e25","#af5e25","#af5e25","#af5e25","#af5e25","#6d3210"],["","","","","","","#c7834b","#e07830","#7a3010","#7a3010","#7a3010","#7a3010","#7a3010","#7a3010","#7a3010","#7a3010","#e07830","#893e14"],["","","","","","","#c7834b","#7a3010","#e07830","#e07830","#e07830","#e07830","#e07830","#e07830","#e07830","#e07830","#7a3010","#893e14"],["","","","","","","#c7834b","#7a3010","#e07830","#7a3010","#7a3010","#7a3010","#7a3010","#7a3010","#7a3010","#e07830","#7a3010","#893e14"],["","","","","","","#c7834b","#7a3010","#e07830","#7a3010","#e07830","#e07830","#e07830","#e07830","#7a3010","#e07830","#7a3010","#893e14"],["","","","","","","#c7834b","#7a3010","#e07830","#7a3010","#7a3010","#7a3010","#e07830","#7a3010","#e07830","#7a3010","#e07830","#893e14"],["#908059","#21140c","#b5a170","#21140c","#b5a170","#b5a170","#e39655","#7a3010","#e07830","#e07830","#e07830","#e07830","#e07830","#e07830","#7a3010","#e07830","#e07830","#893e14"],["#b5a170","#c0a060","#e8cf90","#c0a060","#e8cf90","#e8cf90","#ffa860","#e07830","#7a3010","#7a3010","#7a3010","#7a3010","#7a3010","#7a3010","#7a3010","#7a3010","#e07830","#893e14"],["#b5a170","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#b0501a","#b0501a","#b0501a","#b0501a","#b0501a","#b0501a","#b0501a","#b0501a","#b0501a","#b0501a","#b0501a","#893e14"],["#b5a170","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#b5a170"],["#b5a170","#c0a060","#c0a060","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#e8cf90","#fff4d0","#b5a170"],["#77633c","#967d4b","#967d4b","#967d4b","#967d4b","#967d4b","#967d4b","#967d4b","#967d4b","#967d4b","#967d4b","#967d4b","#967d4b","#967d4b","#967d4b","#c7bea2","#967d4b","#9e9781"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "knowing_owl",
    name: "an owl who knows. it isn't telling.",
    grid: [
        "X.X",
        "XXX",
        "XXX"
      ],
    color: [["#ad9062","#caa872","#b58651","#b58651","#b58651","#9c7345","","","","","","","#9c7345","#b58651","#b58651","#b58651","#caa872","#ad9062"],["#caa872","#f0c888","#d8a060","#d8a060","#7a4a24","#b58651","","","","","","","#b58651","#7a4a24","#d8a060","#d8a060","#f0c888","#caa872"],["#663e1e","#7a4a24","#a86a3a","#a86a3a","#a86a3a","#663e1e","","","","","","","#663e1e","#a86a3a","#a86a3a","#a86a3a","#7a4a24","#663e1e"],["#663e1e","#a86a3a","#7a4a24","#a86a3a","#a86a3a","#8d5931","","","","","","","#8d5931","#a86a3a","#a86a3a","#7a4a24","#a86a3a","#663e1e"],["#663e1e","#a86a3a","#a86a3a","#7a4a24","#a86a3a","#8d5931","","","","","","","#8d5931","#a86a3a","#7a4a24","#a86a3a","#a86a3a","#663e1e"],["#663e1e","#a86a3a","#a86a3a","#a86a3a","#7a4a24","#8d5931","","","","","","","#8d5931","#7a4a24","#a86a3a","#a86a3a","#a86a3a","#663e1e"],["#8d5931","#7a4a24","#7a4a24","#7a4a24","#7a4a24","#7a4a24","#663e1e","#8d5931","#8d5931","#8d5931","#8d5931","#663e1e","#7a4a24","#7a4a24","#7a4a24","#7a4a24","#7a4a24","#8d5931"],["#c1a577","#e6c48e","#8a5428","#8a5428","#8a5428","#8a5428","#8a5428","#e6c48e","#e6c48e","#e6c48e","#e6c48e","#8a5428","#8a5428","#8a5428","#8a5428","#8a5428","#e6c48e","#c1a577"],["#c1a577","#e6c48e","#5e3818","#5e3818","#5e3818","#5e3818","#5e3818","#e6c48e","#e6c48e","#e6c48e","#e6c48e","#5e3818","#5e3818","#5e3818","#5e3818","#5e3818","#e6c48e","#c1a577"],["#c1a577","#e6c48e","#ffa820","#ffa820","#1e0c04","#1e0c04","#ffa820","#e6c48e","#ffe080","#ffc030","#e6c48e","#ffa820","#ffa820","#1e0c04","#1e0c04","#ffa820","#e6c48e","#c1a577"],["#c1a577","#e6c48e","#ffa820","#e07810","#1e0c04","#1e0c04","#ffa820","#e6c48e","#ffc030","#ffc030","#e6c48e","#ffa820","#e07810","#1e0c04","#1e0c04","#ffa820","#e6c48e","#c1a577"],["#c1a577","#e6c48e","#e6c48e","#ffa820","#ffa820","#ffa820","#e6c48e","#e6c48e","#e6c48e","#ffc030","#e6c48e","#e6c48e","#ffa820","#ffa820","#ffa820","#e6c48e","#e6c48e","#c1a577"],["#8d5931","#a86a3a","#a86a3a","#7a4a24","#f6e2b4","#f6e2b4","#f6e2b4","#f6e2b4","#f6e2b4","#f6e2b4","#f6e2b4","#f6e2b4","#f6e2b4","#f6e2b4","#7a4a24","#a86a3a","#a86a3a","#8d5931"],["#8d5931","#a86a3a","#a86a3a","#7a4a24","#f6e2b4","#f6e2b4","#c8a070","#d8bc88","#c8a070","#f6e2b4","#c8a070","#d8bc88","#c8a070","#f6e2b4","#7a4a24","#a86a3a","#a86a3a","#8d5931"],["#8d5931","#7a4a24","#7a4a24","#7a4a24","#f6e2b4","#f6e2b4","#f6e2b4","#c8a070","#f6e2b4","#f6e2b4","#f6e2b4","#c8a070","#f6e2b4","#f6e2b4","#7a4a24","#7a4a24","#7a4a24","#8d5931"],["#8d5931","#a86a3a","#a86a3a","#7a4a24","#f6e2b4","#d8bc88","#f6e2b4","#f6e2b4","#c8a070","#d8bc88","#c8a070","#f6e2b4","#f6e2b4","#d8bc88","#7a4a24","#a86a3a","#a86a3a","#8d5931"],["#8d5931","#a86a3a","#a86a3a","#7a4a24","#f6e2b4","#f6e2b4","#f6e2b4","#f6e2b4","#f6e2b4","#c8a070","#f6e2b4","#f6e2b4","#f6e2b4","#f6e2b4","#7a4a24","#a86a3a","#a86a3a","#8d5931"],["#794c2a","#663e1e","#663e1e","#663e1e","#cfbe97","#d6811b","#d6811b","#d6811b","#cfbe97","#cfbe97","#d6811b","#d6811b","#d6811b","#cfbe97","#663e1e","#663e1e","#663e1e","#794c2a"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "inside_out_umbrella",
    name: "an umbrella, inside out, still doing its best",
    grid: [
        "X.X",
        "XXX",
        ".X.",
        ".X."
      ],
    color: [["#8b1e1b","#af2522","#c1bbbb","#c1bbbb","#af2522","#8b1e1b","","","","","","","#8b1e1b","#af2522","#c1bbbb","#c1bbbb","#af2522","#8b1e1b"],["#af2522","#e0302c","#f8f0f0","#f8f0f0","#e0302c","#af2522","","","","","","","#af2522","#e0302c","#f8f0f0","#f8f0f0","#e0302c","#af2522"],["#af2522","#e0302c","#f8f0f0","#f8f0f0","#e0302c","#af2522","","","","","","","#af2522","#e0302c","#f8f0f0","#f8f0f0","#e0302c","#af2522"],["#af2522","#e0302c","#f8f0f0","#f8f0f0","#e0302c","#af2522","","","","","","","#af2522","#e0302c","#f8f0f0","#f8f0f0","#e0302c","#af2522"],["#af2522","#e0302c","#e0302c","#f8f0f0","#f8f0f0","#af2522","","","","","","","#af2522","#f8f0f0","#f8f0f0","#e0302c","#e0302c","#af2522"],["#af2522","#e0302c","#e0302c","#f8f0f0","#f8f0f0","#af2522","","","","","","","#af2522","#f8f0f0","#f8f0f0","#e0302c","#e0302c","#af2522"],["#af2522","#e0302c","#e0302c","#e0302c","#f8f0f0","#ddd6d6","#c1bbbb","#af2522","#96969f","#96969f","#af2522","#c1bbbb","#ddd6d6","#f8f0f0","#e0302c","#e0302c","#e0302c","#af2522"],["#891919","#e0302c","#e0302c","#e0302c","#e0302c","#f8f0f0","#f8f0f0","#f8f0f0","#c0c0cc","#c0c0cc","#f8f0f0","#f8f0f0","#f8f0f0","#e0302c","#e0302c","#e0302c","#e0302c","#891919"],["#891919","#b02020","#e0302c","#e0302c","#e0302c","#e0302c","#f8f0f0","#f8f0f0","#c0c0cc","#c0c0cc","#f8f0f0","#f8f0f0","#e0302c","#e0302c","#e0302c","#e0302c","#b02020","#891919"],["#891919","#b02020","#b02020","#e0302c","#e0302c","#e0302c","#e0302c","#f8f0f0","#c0c0cc","#c0c0cc","#f8f0f0","#e0302c","#e0302c","#e0302c","#e0302c","#b02020","#b02020","#891919"],["#891919","#b02020","#b02020","#b02020","#e0302c","#e0302c","#e0302c","#e0302c","#c0c0cc","#c0c0cc","#e0302c","#e0302c","#e0302c","#e0302c","#b02020","#b02020","#b02020","#891919"],["#6d1414","#891919","#891919","#891919","#891919","#891919","#9d1c1c","#b02020","#c0c0cc","#c0c0cc","#b02020","#9d1c1c","#891919","#891919","#891919","#891919","#891919","#6d1414"],["","","","","","","#787d8c","#c8ccd8","#f4f6ff","#f4f6ff","#c8ccd8","#787d8c","","","","","",""],["","","","","","","#787d8c","#c8ccd8","#f4f6ff","#f4f6ff","#c8ccd8","#787d8c","","","","","",""],["","","","","","","#787d8c","#9aa0b4","#9aa0b4","#9aa0b4","#9aa0b4","#787d8c","","","","","",""],["","","","","","","#787d8c","#c8ccd8","#f4f6ff","#f4f6ff","#c8ccd8","#787d8c","","","","","",""],["","","","","","","#787d8c","#c8ccd8","#f4f6ff","#f4f6ff","#c8ccd8","#787d8c","","","","","",""],["","","","","","","#787d8c","#9aa0b4","#9aa0b4","#9aa0b4","#9aa0b4","#787d8c","","","","","",""],["","","","","","","#78461c","#9a5a24","#d08a48","#9a5a24","#9a5a24","#78461c","","","","","",""],["","","","","","","#78461c","#9a5a24","#d08a48","#9a5a24","#9a5a24","#78461c","","","","","",""],["","","","","","","#78461c","#9a5a24","#d08a48","#9a5a24","#9a5a24","#78461c","","","","","",""],["","","","","","","#78461c","#9a5a24","#d08a48","#9a5a24","#9a5a24","#a26c38","","","","","",""],["","","","","","","#78461c","#9a5a24","#9a5a24","#d08a48","#d08a48","#78461c","","","","","",""],["","","","","","","#5f3816","#78461c","#78461c","#78461c","#78461c","#5f3816","","","","","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "sofa_remote",
    name: "a sofa that has eaten the remote",
    grid: [
        "X..X",
        "XXXX"
      ],
    color: [["#9e6d45","#c78957","#b56c2d","#b56c2d","#b56c2d","#723a14","","","","","","","","","","","","","#9e6d45","#c78957","#b56c2d","#b56c2d","#b56c2d","#723a14"],["#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#904919","","","","","","","","","","","","","#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#904919"],["#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#904919","","","","","","","","","","","","","#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#904919"],["#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#904919","","","","","","","","","","","","","#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#904919"],["#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#904919","","","","","","","","","","","","","#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#904919"],["#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#904919","","","","","","","","","","","","","#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#904919"],["#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#a4541c","#c78957","#be8345","#be8345","#be8345","#be8345","#be8345","#9c5e25","#57576c","#57576c","#57576c","#be8345","#be8345","#d9964e","#f4a858","#c87830","#e88a3a","#e88a3a","#904919"],["#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#b85e20","#ffb070","#f4a858","#f4a858","#f4a858","#f4a858","#f4a858","#c87830","#4a4a5e","#ff3030","#4a4a5e","#f4a858","#f4a858","#f4a858","#f4a858","#c87830","#e88a3a","#e88a3a","#904919"],["#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#b85e20","#f4a858","#f4a858","#f4a858","#f4a858","#f4a858","#f4a858","#c87830","#4a4a5e","#a8a8c0","#4a4a5e","#c87830","#f4a858","#f4a858","#f4a858","#f4a858","#e88a3a","#e88a3a","#904919"],["#c78957","#e88a3a","#e88a3a","#e88a3a","#e88a3a","#b85e20","#c87830","#c87830","#c87830","#c87830","#c87830","#c87830","#c87830","#4a4a5e","#4a4a5e","#4a4a5e","#c87830","#c87830","#c87830","#c87830","#c87830","#e88a3a","#e88a3a","#904919"],["#904919","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#b85e20","#904919"],["#562e10","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#6c3a14","#562e10"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "goldfish",
    name: "a goldfish who has forgotten what it came in for",
    grid: [
        "X.XX",
        "XXXX"
      ],
    color: [["#ffb050","#ffb050","#173058","#173058","#173058","#173058","","","","","","","#173058","#173058","#173058","#ffc870","#ffc870","#ffc870","#ff8a1a","#173058","#173058","#173058","#173058","#173058"],["#e07a20","#ffb050","#ffb050","#173058","#173058","#173058","","","","","","","#173058","#ffc870","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#173058","#c8e8ff","#173058"],["#173058","#e07a20","#ffb050","#ffb050","#173058","#173058","","","","","","","#ffc870","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#173058","#8ac8ff"],["#173058","#173058","#e07a20","#ffb050","#ffb050","#173058","","","","","","","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#fafafa","#fafafa","#ff8a1a","#ff8a1a","#ff8a1a","#173058"],["#173058","#173058","#173058","#e07a20","#ffb050","#ffb050","","","","","","","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#fafafa","#141414","#ff8a1a","#ff8a1a","#ff8a1a","#173058"],["#173058","#173058","#173058","#173058","#e07a20","#ffb050","","","","","","","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#a83a08","#173058"],["#173058","#173058","#173058","#173058","#e07a20","#ffb050","#ffb050","#ffc870","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#173058"],["#173058","#173058","#173058","#e07a20","#ffb050","#ffb050","#173058","#e07a20","#d05a0a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#d05a0a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#173058","#173058"],["#173058","#173058","#e07a20","#ffb050","#ffb050","#173058","#173058","#173058","#173058","#d05a0a","#d05a0a","#d05a0a","#d05a0a","#d05a0a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#d05a0a","#173058","#173058"],["#173058","#e07a20","#ffb050","#ffb050","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#d05a0a","#e07a20","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#ff8a1a","#d05a0a","#d05a0a","#173058","#8ac8ff"],["#e07a20","#ffb050","#ffb050","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#e07a20","#ffb050","#d05a0a","#d05a0a","#d05a0a","#d05a0a","#d05a0a","#173058","#173058","#173058"],["#ffb050","#ffb050","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#173058","#e07a20","#ffb050","#173058","#173058","#173058","#173058","#173058","#173058","#173058"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "thirsty_plant",
    name: "a houseplant you forgot to water (it forgives you)",
    grid: [
        "XX",
        ".X",
        "XX"
      ],
    color: [["#404b17","#6e7b26","#6e7b26","#6e7b26","#6e7b26","#909a40","#909a40","#909a40","#6e7b26","#6e7b26","#6e7b26","#404b17"],["#6e7b26","#b4c050","#b4c050","#b4c050","#8a9a30","#8a9a30","#8a9a30","#8a9a30","#8a9a30","#b4c050","#8a9a30","#4b581b"],["#6e7b26","#8a9a30","#8a9a30","#5e6e22","#5e6e22","#5e6e22","#8a9a30","#8a9a30","#8a9a30","#5e6e22","#8a9a30","#4b581b"],["#a0863a","#c8a848","#5e6e22","#8a9a30","#8a9a30","#8a9a30","#5e6e22","#b4c050","#8a9a30","#5e6e22","#8a9a30","#4b581b"],["#7b501d","#c8a848","#5e6e22","#c8a848","#8a9a30","#8a9a30","#5e6e22","#8a9a30","#8a9a30","#5e6e22","#94b040","#4b581b"],["#694418","#7b501d","#4b581b","#7b501d","#a0863a","#a0863a","#55631f","#5e6e22","#8a9a30","#b4c050","#6a8a2a","#4b581b"],["","","","","","","#3e5518","#6a8a2a","#94b040","#6a8a2a","#6a8a2a","#3e5518"],["","","","","","","#a0863a","#4e6a1e","#94b040","#6a8a2a","#4e6a1e","#6e7b26"],["","","","","","","#7b501d","#c8a848","#4e6a1e","#6a8a2a","#8a9a30","#909a40"],["","","","","","","#3e5518","#6a8a2a","#94b040","#6a8a2a","#6a8a2a","#3e5518"],["","","","","","","#3e5518","#6a8a2a","#94b040","#6a8a2a","#6a8a2a","#3e5518"],["","","","","","","#3e5518","#6a8a2a","#94b040","#6a8a2a","#6a8a2a","#3e5518"],["#49321d","#563b22","#746051","#563b22","#563b22","#563b22","#604326","#6b4a2a","#94b040","#6a8a2a","#6b4a2a","#563b22"],["#bd724a","#ec8e5c","#ec8e5c","#ec8e5c","#ec8e5c","#ec8e5c","#ec8e5c","#ec8e5c","#ec8e5c","#ec8e5c","#ec8e5c","#bd724a"],["#863d22","#a84c2a","#a84c2a","#a84c2a","#a84c2a","#a84c2a","#a84c2a","#a84c2a","#a84c2a","#a84c2a","#a84c2a","#863d22"],["#a6552e","#d06a3a","#d06a3a","#4a2420","#d06a3a","#d06a3a","#d06a3a","#d06a3a","#4a2420","#d06a3a","#d06a3a","#a6552e"],["#a6552e","#d06a3a","#f07a8a","#d06a3a","#d06a3a","#4a2420","#4a2420","#d06a3a","#d06a3a","#f07a8a","#d06a3a","#a6552e"],["#8d4827","#a6552e","#a6552e","#a6552e","#a6552e","#a6552e","#a6552e","#a6552e","#a6552e","#a6552e","#a6552e","#8d4827"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "just_boiled_kettle",
    name: "a kettle that has just boiled and wants everyone to know",
    grid: [
        "..X",
        "XXX",
        "XX."
      ],
    color: [["","","","","","","","","","","","","#9aa4b1","#cfd2d6","#cfd2d6","#b4c0cf","#b4c0cf","#7989a0"],["","","","","","","","","","","","","#b4c0cf","#f6faff","#f6faff","#d6e4f6","#f6faff","#b4c0cf"],["","","","","","","","","","","","","#b4c0cf","#f6faff","#f6faff","#ffffff","#f6faff","#cfd2d6"],["","","","","","","","","","","","","#cfd2d6","#ffffff","#f6faff","#f6faff","#f6faff","#cfd2d6"],["","","","","","","","","","","","","#cfd2d6","#f6faff","#f6faff","#f6faff","#f6faff","#b4c0cf"],["","","","","","","","","","","","","#b4c0cf","#f6faff","#f6faff","#d6e4f6","#f6faff","#cfd2d6"],["#636973","#c33131","#d66659","#d66659","#d66659","#d66659","#d66659","#d66659","#d66659","#d66659","#c33131","#666d79","#9aa2b0","#9aa2b0","#9aa2b0","#9aa2b0","#7a8290","#59606d"],["#747b86","#e83a3a","#e83a3a","#e83a3a","#e83a3a","#e83a3a","#e83a3a","#e83a3a","#e83a3a","#e83a3a","#e83a3a","#7a8290","#9aa2b0","#9aa2b0","#9aa2b0","#e8eef6","#ffffff","#666d79"],["#747b86","#b8c0cc","#e8eef6","#a82424","#a82424","#a82424","#a82424","#a82424","#a82424","#9aa2b0","#8a92a0","#7a8290","#9aa2b0","#9aa2b0","#e8eef6","#ffffff","#e8eef6","#9ba1ab"],["#747b86","#b8c0cc","#e8eef6","#ffffff","#e0e6ee","#ccd2dc","#c0c8d2","#b4bcc8","#a8b0bc","#9aa2b0","#8a92a0","#7a8290","#9aa2b0","#e8eef6","#ffffff","#e8eef6","#b8c0cc","#9ba1ab"],["#747b86","#b8c0cc","#2a2e48","#2a2e48","#e0e6ee","#2a2e48","#2a2e48","#2a2e48","#a8b0bc","#9aa2b0","#8a92a0","#7a8290","#e8eef6","#ffffff","#e8eef6","#b8c0cc","#b8c0cc","#9ba1ab"],["#747b86","#b8c0cc","#e8eef6","#ffffff","#e0e6ee","#ccd2dc","#c0c8d2","#b4bcc8","#a8b0bc","#9aa2b0","#8a92a0","#7a8290","#d6d6d6","#c3c8cf","#9ba1ab","#9ba1ab","#9ba1ab","#848a93"],["#747b86","#b8c0cc","#e8eef6","#ffffff","#2a2e48","#2a2e48","#c0c8d2","#b4bcc8","#a8b0bc","#9aa2b0","#8a92a0","#666d79","","","","","",""],["#747b86","#b8c0cc","#e8eef6","#2a2e48","#e04060","#e04060","#2a2e48","#b4bcc8","#a8b0bc","#ff9090","#8a92a0","#666d79","","","","","",""],["#747b86","#b8c0cc","#e8eef6","#2a2e48","#e04060","#e04060","#2a2e48","#b4bcc8","#a8b0bc","#ff3030","#8a92a0","#666d79","","","","","",""],["#747b86","#b8c0cc","#e8eef6","#ffffff","#2a2e48","#2a2e48","#c0c8d2","#b4bcc8","#a8b0bc","#9aa2b0","#8a92a0","#666d79","","","","","",""],["#d66659","#ff7a6a","#ff7a6a","#ff7a6a","#ff7a6a","#ff7a6a","#ff7a6a","#ff7a6a","#ff7a6a","#ff7a6a","#ff7a6a","#d66659","","","","","",""],["#a72a2a","#c33131","#c33131","#c33131","#c33131","#c33131","#c33131","#c33131","#c33131","#c33131","#c33131","#a72a2a","","","","","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "lily_frog",
    name: "a frog on a lily pad, considering his options",
    grid: [
        ".X.X.",
        ".XXX.",
        "XXXXX"
      ],
    color: [["","","","","","","#0f0d16","#a8f070","#5cc040","#5cc040","#2e8020","#0f0d16","","","","","","","#0f0d16","#a8f070","#5cc040","#5cc040","#2e8020","#0f0d16","","","","","",""],["","","","","","","#a8f070","#e8ffd8","#e8ffd8","#e8ffd8","#5cc040","#2e8020","","","","","","","#a8f070","#e8ffd8","#e8ffd8","#e8ffd8","#5cc040","#2e8020","","","","","",""],["","","","","","","#5cc040","#141a10","#141a10","#141a10","#141a10","#2e8020","","","","","","","#5cc040","#141a10","#141a10","#141a10","#141a10","#2e8020","","","","","",""],["","","","","","","#5cc040","#e8ffd8","#141a10","#141a10","#e8ffd8","#2e8020","","","","","","","#5cc040","#e8ffd8","#141a10","#141a10","#e8ffd8","#2e8020","","","","","",""],["","","","","","","#2e8020","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","","","","","","","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#2e8020","","","","","",""],["","","","","","","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","","","","","","","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","","","","","",""],["","","","","","","#5cc040","#a8f070","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","","","","","",""],["","","","","","","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","","","","","",""],["","","","","","","#5cc040","#5cc040","#1f5a14","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#5cc040","#1f5a14","#5cc040","#2e8020","","","","","",""],["","","","","","","#2e8020","#5cc040","#5cc040","#1f5a14","#1f5a14","#1f5a14","#1f5a14","#1f5a14","#1f5a14","#1f5a14","#1f5a14","#1f5a14","#1f5a14","#1f5a14","#1f5a14","#5cc040","#5cc040","#2e8020","","","","","",""],["","","","","","","#0f0d16","#5cc040","#5cc040","#5cc040","#5cc040","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#5cc040","#5cc040","#5cc040","#5cc040","#2e8020","#0f0d16","","","","","",""],["","","","","","","#5cc040","#5cc040","#2e8020","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#2e8020","#5cc040","#5cc040","#2e8020","","","","","",""],["#1a3a66","#1a3a66","#24508a","#1a3a66","#1a3a66","#4ea050","#2e8020","#5cc040","#5cc040","#5cc040","#2e8020","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#f0f0b0","#2e8020","#5cc040","#5cc040","#2e8020","#5cc040","#2e8020","#4ea050","#1a3a66","#1a3a66","#24508a","#1a3a66"],["#1a3a66","#4ea050","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2e8020","#5cc040","#5cc040","#2e8020","#2e8020","#2e8020","#2e8020","#2e8020","#2e8020","#2e8020","#2e8020","#2e8020","#2e8020","#2e8020","#2e8020","#2e8020","#2e8020","#5cc040","#2e8020","#2f7a3a","#2f7a3a","#2f7a3a","#4ea050","#1a3a66"],["#4ea050","#2f7a3a","#2f7a3a","#4ea050","#2f7a3a","#2f7a3a","#5cc040","#2e8020","#5cc040","#5cc040","#5cc040","#2e8020","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2e8020","#5cc040","#2e8020","#5cc040","#5cc040","#2e8020","#2f7a3a","#ff9ac8","#ff9ac8","#ff9ac8","#4ea050"],["#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#4ea050","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#4ea050","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#ff9ac8","#ffe060","#ff9ac8","#e05a9a","#2f7a3a"],["#1a3a66","#1c5a28","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#4ea050","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#4ea050","#2f7a3a","#2f7a3a","#2f7a3a","#2f7a3a","#e05a9a","#ff9ac8","#1c5a28","#1a3a66"],["#24508a","#1a3a66","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1c5a28","#1a3a66","#24508a"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "lonely_wellie",
    name: "one wellington boot (the other one is in a hedge)",
    grid: [
        "XX..",
        "XX..",
        "XX..",
        "XXXX"
      ],
    color: [["#845c0c","#9b6c0d","#9b6c0d","#9b6c0d","#9b6c0d","#9b6c0d","#9b6c0d","#9b6c0d","#9b6c0d","#9b6c0d","#9b6c0d","#845c0c","","","","","","","","","","","",""],["#bc8d1b","#f0c030","#f0c030","#f0c030","#f0c030","#f0c030","#f0c030","#f0c030","#f0c030","#f0c030","#f0c030","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#e0a820","#e0a820","#e0a820","#e0a820","#e0a820","#e0a820","#e0a820","#e0a820","#e0a820","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#9b6c0d","#b88010","#b88010","#b88010","#b88010","#b88010","#b88010","#b88010","#b88010","#b88010","#b88010","#9b6c0d","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#4cc048","#ffd23a","#ffd23a","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#4cc048","#4cc048","#ffd23a","#ffd23a","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#2a8a30","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#ffd23a","#ffd23a","#4cc048","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#ffd23a","#ffd23a","#4cc048","#2a8a30","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#e0a820","#bc8d1b","","","","","","","","","","","",""],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#fff08a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#e0a820","#e0a820","#bc8d1b","#d6ca74","#d6ca74","#d6ca74","#d6ca74","#d6ca74","#d6ca74","#d6ca74","#d6ca74","#d6ca74","#d6ca74","#b8ad63"],["#bc8d1b","#ffd23a","#fff08a","#8a5a2c","#fff08a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#e0a820","#e0a820","#ffd23a","#e0a820","#ffd23a","#ffd23a","#8a5a2c","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#fff08a","#7ad0ff","#d6ca74"],["#bc8d1b","#ffd23a","#fff08a","#fff08a","#8a5a2c","#ffd23a","#ffd23a","#8a5a2c","#ffd23a","#ffd23a","#e0a820","#e0a820","#ffd23a","#ffd23a","#ffd23a","#8a5a2c","#ffd23a","#8a5a2c","#ffd23a","#ffd23a","#8a5a2c","#ffd23a","#ffd23a","#d6b031"],["#a18152","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#c09a62","#a18152"],["#5c4528","#6e5230","#6e5230","#6e5230","#6e5230","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#9a7444","#816139"],["#4f3b23","#5c4528","#5c4528","#5c4528","#5c4528","#816139","#816139","#5c4528","#816139","#816139","#5c4528","#816139","#816139","#5c4528","#816139","#816139","#5c4528","#816139","#816139","#5c4528","#816139","#816139","#5c4528","#6f5431"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "stubborn_sugar_cube",
    name: "a sugar cube that refuses to dissolve",
    grid: [
        "X"
      ],
    color: [["#bdbdbd","#cfcec8","#cfcec8","#b2afa7","#cfcec8","#dbdbdb","#b2b1ac"],["#cfcec8","#cfcbc2","#ffffff","#f1efe9","#f1efe9","#f1efe9","#cfcec8"],["#cfcec8","#f1efe9","#f1efe9","#f1efe9","#cfcbc2","#f1efe9","#cfcec8"],["#cfcec8","#5b4a58","#f1efe9","#f1efe9","#f1efe9","#5b4a58","#cfcec8"],["#cfcec8","#f1efe9","#f1efe9","#f1efe9","#f1efe9","#f1efe9","#dbdbdb"],["#b2afa7","#f1efe9","#5b4a58","#5b4a58","#5b4a58","#f1efe9","#cfcec8"],["#b2b1ac","#cfcec8","#cfcec8","#dbdbdb","#cfcec8","#b2afa7","#b2b1ac"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "die_of_ones",
    name: "a die that has only ever rolled a one",
    grid: [
        "X"
      ],
    color: [["#999794","#c5c2be","#c5c2be","#c5c2be","#c5c2be","#c5c2be","#999794"],["#c5c2be","#f6f3ee","#f6f3ee","#f6f3ee","#f6f3ee","#f6f3ee","#c5c2be"],["#c5c2be","#f6f3ee","#e98a8e","#d4202c","#e98a8e","#f6f3ee","#c5c2be"],["#c5c2be","#f6f3ee","#d4202c","#ff6a72","#d4202c","#f6f3ee","#c5c2be"],["#c5c2be","#f6f3ee","#e98a8e","#d4202c","#e98a8e","#f6f3ee","#c5c2be"],["#c5c2be","#f6f3ee","#f6f3ee","#f6f3ee","#f6f3ee","#f6f3ee","#c5c2be"],["#999794","#c5c2be","#c5c2be","#c5c2be","#c5c2be","#c5c2be","#999794"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "ambitious_sesame",
    name: "a sesame seed with ambition",
    grid: [
        "X"
      ],
    color: [["#816c46","#a18657","#c4b288","#d1c8ae","#c4b288","#a18657","#816c46"],["#a18657","#efd9a6","#fff4d4","#fff4d4","#fff4d4","#efd9a6","#a18657"],["#c4b288","#3b2a1e","#efd9a6","#efd9a6","#efd9a6","#3b2a1e","#b49f71"],["#c4b288","#efd9a6","#efd9a6","#efd9a6","#efd9a6","#efd9a6","#b49f71"],["#c4b288","#efd9a6","#ffffff","#2a3c8c","#ffffff","#efd9a6","#b49f71"],["#c4b288","#efd9a6","#efd9a6","#2a3c8c","#efd9a6","#efd9a6","#c4b288"],["#91805b","#c4b288","#223173","#223173","#223173","#c4b288","#91805b"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "orphan_sim_card",
    name: "a SIM card from a phone you lost in 2011",
    grid: [
        "X"
      ],
    color: [["#a7a8ab","#c8cacd","#c8cacd","#c8cacd","#c8cacd","#8a92a2","#8a92a2"],["#c8cacd","#eef0f4","#eef0f4","#eef0f4","#eef0f4","#eef0f4","#8a92a2"],["#c8cacd","#f2c13a","#f2c13a","#f2c13a","#a8740c","#f2c13a","#c8cacd"],["#c8cacd","#a8740c","#a8740c","#f2c13a","#a8740c","#f2c13a","#c8cacd"],["#c8cacd","#f2c13a","#f2c13a","#f2c13a","#a8740c","#a8740c","#c8cacd"],["#c8cacd","#f2c13a","#a8740c","#f2c13a","#f2c13a","#f2c13a","#c8cacd"],["#a7a8ab","#c8cacd","#c8cacd","#c8cacd","#c8cacd","#c8cacd","#a7a8ab"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "barefoot_lego",
    name: "a single lego, placed exactly where you will step",
    grid: [
        "X"
      ],
    color: [["#91181b","#b61e22","#b61e22","#b61e22","#b61e22","#b61e22","#91181b"],["#b61e22","#e3262a","#a8161c","#a8161c","#a8161c","#e3262a","#b61e22"],["#b61e22","#a8161c","#ff9a86","#ffd2c4","#f04a3c","#a8161c","#b61e22"],["#b61e22","#a8161c","#ff9a86","#f04a3c","#f04a3c","#a8161c","#b61e22"],["#b61e22","#a8161c","#f04a3c","#f04a3c","#f04a3c","#a8161c","#b61e22"],["#b61e22","#e3262a","#a8161c","#a8161c","#a8161c","#e3262a","#b61e22"],["#91181b","#b61e22","#b61e22","#b61e22","#b61e22","#b61e22","#91181b"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "lone_sprinkle",
    name: "a lone sprinkle. the cake left without it.",
    grid: [
        "XX"
      ],
    color: [["#9e3b6c","#d14e8f","#d14e8f","#d14e8f","#d14e8f","#d14e8f","#d14e8f","#d14e8f","#d14e8f","#d14e8f","#d14e8f","#d14e8f","#d14e8f","#9e3b6c"],["#d14e8f","#ffb3d9","#ffb3d9","#ffb3d9","#ffb3d9","#ffb3d9","#ffb3d9","#ffb3d9","#ffb3d9","#ffb3d9","#ffb3d9","#ffb3d9","#ffb3d9","#d14e8f"],["#d14e8f","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#d14e8f"],["#d14e8f","#ff5fae","#ff5fae","#5a1438","#ff5fae","#ff5fae","#ff5fae","#5a1438","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#d14e8f"],["#d14e8f","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#7fd8ff","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#d14e8f"],["#d14e8f","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#5a1438","#ff5fae","#ff5fae","#7fd8ff","#ff5fae","#ff5fae","#ff5fae","#ff5fae","#d14e8f"],["#9e3b6c","#ac306e","#ac306e","#ac306e","#ac306e","#ac306e","#ac306e","#ac306e","#ac306e","#ac306e","#ac306e","#ac306e","#ac306e","#9e3b6c"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "rubber_duck_egg",
    name: "a rubber duck egg. it squeaks when it hatches.",
    grid: [
        "X"
      ],
    color: [["#a88b26","#d1ac30","#d1c78a","#d1ac30","#d1ac30","#d1ac30","#a88b26"],["#d1ac30","#fff3a8","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#d1ac30"],["#d1ac30","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#d1ac30"],["#643d00","#ffd23a","#ffd23a","#7a4a00","#ffd23a","#ffd23a","#643d00"],["#d1ac30","#7a4a00","#2a1a10","#7a4a00","#ff7a10","#ffd23a","#d1ac30"],["#d1ac30","#ffd23a","#ffd23a","#ff7a10","#ff7a10","#ffd23a","#d1ac30"],["#a88b26","#d1ac30","#d1ac30","#d1ac30","#d1ac30","#d1ac30","#a88b26"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "blank_domino",
    name: "a domino with nothing to say",
    grid: [
        "X",
        "X"
      ],
    color: [["#a09a8d","#c7c0af","#c7c0af","#c7c0af","#c7c0af","#c7c0af","#a09a8d"],["#c7c0af","#ffffff","#fbf6ea","#f3ead6","#f3ead6","#f3ead6","#c7c0af"],["#c7c0af","#ffffff","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#c7c0af"],["#c7c0af","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#c7c0af"],["#c7c0af","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#c7c0af"],["#c7c0af","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#c7c0af"],["#a59a82","#c9bc9e","#c9bc9e","#d9a62a","#c9bc9e","#c9bc9e","#a59a82"],["#8a7d64","#a8987a","#a8987a","#a8987a","#a8987a","#a8987a","#8a7d64"],["#c7c0af","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#c7c0af"],["#c7c0af","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#c7c0af"],["#c7c0af","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#c7c0af"],["#c7c0af","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#c7c0af"],["#c7c0af","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#c7c0af"],["#a09a8d","#c7c0af","#c7c0af","#c7c0af","#c7c0af","#c7c0af","#a09a8d"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "overpacked_suitcase",
    name: "a suitcase that will not close. it has tried.",
    grid: [
        "X..",
        "XXX"
      ],
    color: [["#b2b2b2","#d6d6d6","#d6d6d6","#5085cb","#5085cb","#426fa9","","","","","","","","","","","",""],["#be2832","#ffffff","#5f9ef2","#5f9ef2","#5f9ef2","#5085cb","","","","","","","","","","","",""],["#d6d6d6","#e2303c","#5f9ef2","#a8ccff","#5f9ef2","#5085cb","","","","","","","","","","","",""],["#be2832","#ffffff","#5f9ef2","#5f9ef2","#5f9ef2","#5085cb","","","","","","","","","","","",""],["#d6d6d6","#e2303c","#5f9ef2","#5f9ef2","#5f9ef2","#8dabd6","","","","","","","","","","","",""],["#be2832","#ffffff","#5f9ef2","#5f9ef2","#5f9ef2","#5085cb","","","","","","","","","","","",""],["#be2832","#ffffff","#5f9ef2","#5f9ef2","#5f9ef2","#5f9ef2","#76451d","#76451d","#76451d","#76451d","#76451d","#76451d","#76451d","#76451d","#76451d","#76451d","#76451d","#623918"],["#bc8145","#e09a52","#e09a52","#e09a52","#e09a52","#8c5222","#e09a52","#e09a52","#e09a52","#e09a52","#e09a52","#e09a52","#8c5222","#e09a52","#e09a52","#e09a52","#e09a52","#bc8145"],["#a3662d","#c27a36","#c27a36","#c27a36","#c27a36","#8c5222","#c27a36","#c27a36","#c27a36","#c27a36","#c27a36","#c27a36","#8c5222","#c27a36","#c27a36","#c27a36","#c27a36","#a3662d"],["#a3662d","#c27a36","#c27a36","#c27a36","#c27a36","#8c5222","#c27a36","#c27a36","#fff0a0","#e8c25a","#c27a36","#c27a36","#8c5222","#c27a36","#c27a36","#c27a36","#c27a36","#a3662d"],["#a3662d","#c27a36","#c27a36","#c27a36","#c27a36","#8c5222","#c27a36","#c27a36","#e8c25a","#e8c25a","#c27a36","#c27a36","#8c5222","#c27a36","#c27a36","#c27a36","#c27a36","#a3662d"],["#885526","#a3662d","#a3662d","#a3662d","#a3662d","#76451d","#a3662d","#a3662d","#a3662d","#a3662d","#a3662d","#a3662d","#76451d","#a3662d","#a3662d","#a3662d","#a3662d","#885526"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "blinking_photo_strip",
    name: "a photo booth strip. you blinked in all three.",
    grid: [
        "X",
        "X",
        "X"
      ],
    color: [["#b5b4b1","#d8d7d4","#d8d7d4","#d8d7d4","#d8d7d4","#b5b4b1"],["#d8d7d4","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#d8d7d4"],["#d8d7d4","#f2c29a","#f2c29a","#f2c29a","#f2c29a","#d8d7d4"],["#d8d7d4","#4a2a20","#f2c29a","#f2c29a","#4a2a20","#d8d7d4"],["#d8d7d4","#f2c29a","#c95a5a","#c95a5a","#f2c29a","#d8d7d4"],["#d8d7d4","#9fd0f0","#f2c29a","#f2c29a","#9fd0f0","#d8d7d4"],["#d8d7d4","#fbfaf6","#fbfaf6","#fbfaf6","#fbfaf6","#d8d7d4"],["#d8d7d4","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#d8d7d4"],["#d8d7d4","#f2c29a","#f2c29a","#f2c29a","#f2c29a","#d8d7d4"],["#d8d7d4","#4a2a20","#f2c29a","#4a2a20","#f2c29a","#d8d7d4"],["#d8d7d4","#f2c29a","#c95a5a","#c95a5a","#f2c29a","#d8d7d4"],["#d8d7d4","#9fd0f0","#f2c29a","#f2c29a","#9fd0f0","#d8d7d4"],["#d8d7d4","#fbfaf6","#fbfaf6","#fbfaf6","#fbfaf6","#d8d7d4"],["#d8d7d4","#7a4a2a","#7a4a2a","#7a4a2a","#7a4a2a","#d8d7d4"],["#d8d7d4","#f2c29a","#f2c29a","#f2c29a","#f2c29a","#d8d7d4"],["#d8d7d4","#4a2a20","#f2c29a","#f2c29a","#4a2a20","#d8d7d4"],["#d8d7d4","#f2c29a","#e0403c","#e0403c","#f2c29a","#d8d7d4"],["#b5b4b1","#89b3ce","#d0a784","#d0a784","#89b3ce","#b5b4b1"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "drizzle_cloud",
    name: "a cloud that is mostly drizzle",
    grid: [
        "XXX",
        ".X."
      ],
    color: [["#a8abb0","#dbdbdb","#dbdbdb","#dbdbdb","#c8cdd3","#c8cdd3","#dbdbdb","#dbdbdb","#dbdbdb","#c8cdd3","#c8cdd3","#dbdbdb","#dbdbdb","#dbdbdb","#c8cdd3","#c8cdd3","#dbdbdb","#b8b8b8"],["#c8cdd3","#e9eef5","#ffffff","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#56607a","#e9eef5","#e9eef5","#56607a","#e9eef5","#ffffff","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#dbdbdb"],["#c8cdd3","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#c8cdd3"],["#c8cdd3","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#56607a","#56607a","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#c8cdd3"],["#c8cdd3","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#e9eef5","#c8cdd3"],["#8c939c","#a8afba","#a8afba","#a8afba","#a8afba","#a8afba","#c3ccd8","#c3ccd8","#c3ccd8","#c3ccd8","#c3ccd8","#c3ccd8","#a8afba","#a8afba","#a8afba","#a8afba","#a8afba","#8c939c"],["","","","","","","#a8afba","#e2eeff","#a8c4e6","#a8c4e6","#a8c4e6","#a8afba","","","","","",""],["","","","","","","#90a9c6","#a8c4e6","#a8c4e6","#a8c4e6","#e2eeff","#90a9c6","","","","","",""],["","","","","","","#90a9c6","#a8c4e6","#e2eeff","#a8c4e6","#a8c4e6","#90a9c6","","","","","",""],["","","","","","","#c2cddb","#a8c4e6","#a8c4e6","#a8c4e6","#a8c4e6","#c2cddb","","","","","",""],["","","","","","","#90a9c6","#a8c4e6","#a8c4e6","#e2eeff","#a8c4e6","#90a9c6","","","","","",""],["","","","","","","#798da6","#c2cddb","#90a9c6","#90a9c6","#c2cddb","#798da6","","","","","",""]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "weather"
      ],
  },
  {
    id: "washed_rainbow",
    name: "a rainbow that has been through the wash",
    grid: [
        "XXX",
        "X.X"
      ],
    color: [["#b65a58","#cb6867","#ca6b6a","#ca6e6e","#c97171","#c87475","#c77879","#c67a7c","#c57e80","#c48182","#c28486","#c2878a","#c18b8d","#c08d91","#bf9194","#be9498","#bd979c","#a7898d"],["#cc6563","#e9aa6d","#e7ab72","#e6ac76","#e5ad7a","#e3ae7e","#e2b082","#e1b186","#dfb28a","#deb38e","#dcb492","#dbb596","#dab69b","#d8b79f","#d7b9a3","#d6baa7","#d4bbab","#bc9a9e"],["#cc6563","#e9aa6d","#e7d480","#e5d483","#e4d387","#e3d28a","#e1d18d","#e0d191","#dfd094","#ddcf98","#dcce9b","#dbce9f","#d9cda2","#d8cca6","#d7cba9","#d5cbad","#d4bbab","#bc9a9e"],["#cc6563","#e9aa6d","#e7d480","#9ece90","#a0cd93","#a2cd96","#a4cc99","#a6cc9c","#a8cb9f","#aacba1","#accaa4","#aecaa7","#b0caaa","#b2c9ad","#b4c9b0","#d5cbad","#d4bbab","#bc9a9e"],["#cc6563","#e9aa6d","#e7d480","#9ece90","#90b4e0","#93b5df","#96b6de","#99b7dd","#9cb8dc","#9eb8db","#a1b9da","#a4bad9","#a7bbd8","#aabbd7","#b4c9b0","#d5cbad","#d4bbab","#bc9a9e"],["#cc6563","#e9aa6d","#e7d480","#9ece90","#90b4e0","#b19dd3","#a08fbd","#a191bd","#a393bd","#a494bc","#a596bc","#a698bc","#baabd0","#aabbd7","#b4c9b0","#d5cbad","#d4bbab","#bc9a9e"],["#cc6563","#e9aa6d","#e7d480","#9ece90","#90b4e0","#9f8dbe","","","","","","","#a79abb","#aabbd7","#b4c9b0","#d5cbad","#d4bbab","#bc9a9e"],["#cc6563","#e9aa6d","#e7d480","#9ece90","#90b4e0","#9f8dbe","","","","","","","#a79abb","#aabbd7","#b4c9b0","#d5cbad","#d4bbab","#bc9a9e"],["#cc6563","#e9aa6d","#e7d480","#9ece90","#90b4e0","#9f8dbe","","","","","","","#a79abb","#aabbd7","#b4c9b0","#d5cbad","#d4bbab","#bc9a9e"],["#cc6563","#e9aa6d","#e7d480","#9ece90","#90b4e0","#9f8dbe","","","","","","","#a79abb","#aabbd7","#b4c9b0","#d5cbad","#d4bbab","#bc9a9e"],["#cc6563","#e9aa6d","#e7d480","#9ece90","#90b4e0","#9f8dbe","","","","","","","#a79abb","#aabbd7","#b4c9b0","#d5cbad","#d4bbab","#bc9a9e"],["#b65a58","#d29962","#d0bf73","#8eb982","#82a2ca","#8e7ea9","","","","","","","#9589a6","#99a8c2","#a2b59e","#c0b79c","#bfa89a","#a7898d"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "weather"
      ],
  },
  {
    id: "slough_postcard",
    name: "a postcard from slough. the weather is also slough.",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#b5b2ab","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#b5b2ab"],["#d8d4cd","#b7bcc4","#b7bcc4","#b7bcc4","#b7bcc4","#b7bcc4","#b7bcc4","#b7bcc4","#d8343c","#d8343c","#d8343c","#d8d4cd"],["#d8d4cd","#b7bcc4","#b7bcc4","#b7bcc4","#b7bcc4","#b7bcc4","#b7bcc4","#b7bcc4","#d8343c","#ffd0c0","#d8343c","#d8d4cd"],["#d8d4cd","#b7bcc4","#b7bcc4","#b7bcc4","#b7bcc4","#b7bcc4","#b7bcc4","#b7bcc4","#d8343c","#d8343c","#d8343c","#d8d4cd"],["#d8d4cd","#b7bcc4","#b7bcc4","#848b96","#848b96","#848b96","#848b96","#848b96","#b7bcc4","#b7bcc4","#b7bcc4","#d8d4cd"],["#d8d4cd","#b7bcc4","#b7bcc4","#848b96","#c4cad2","#848b96","#c4cad2","#848b96","#848b96","#848b96","#848b96","#d8d4cd"],["#d8d4cd","#b7bcc4","#b7bcc4","#848b96","#848b96","#848b96","#848b96","#848b96","#848b96","#c4cad2","#848b96","#d8d4cd"],["#d8d4cd","#b7bcc4","#b7bcc4","#848b96","#c4cad2","#848b96","#c4cad2","#848b96","#848b96","#848b96","#848b96","#d8d4cd"],["#d8d4cd","#848b96","#848b96","#848b96","#848b96","#848b96","#848b96","#848b96","#848b96","#848b96","#848b96","#d8d4cd"],["#d8d4cd","#9aa094","#9aa094","#9aa094","#9aa094","#9aa094","#9aa094","#9aa094","#9aa094","#9aa094","#9aa094","#d8d4cd"],["#d8d4cd","#9aa094","#9aa094","#9aa094","#9aa094","#9aa094","#9aa094","#9aa094","#9aa094","#9aa094","#9aa094","#d8d4cd"],["#b5b2ab","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#d8d4cd","#b5b2ab"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "travel"
      ],
  },
  {
    id: "lost_satellite",
    name: "a satellite that has lost signal. it is just floating now.",
    grid: [
        "XXX"
      ],
    color: [["#2c59a1","#356bc1","#789cd6","#789cd6","#356bc1","#356bc1","#cba53a","#cba53a","#59310d","#59310d","#cba53a","#cba53a","#356bc1","#356bc1","#789cd6","#789cd6","#356bc1","#2c59a1"],["#356bc1","#3f7fe6","#8fbaff","#8fbaff","#3f7fe6","#3f7fe6","#f2c445","#6a3a10","#f2c445","#f2c445","#6a3a10","#f2c445","#3f7fe6","#3f7fe6","#8fbaff","#8fbaff","#3f7fe6","#356bc1"],["#789cd6","#8fbaff","#2a5cb8","#2a5cb8","#8fbaff","#8fbaff","#f2c445","#f2c445","#f2c445","#6a3a10","#f2c445","#f2c445","#8fbaff","#8fbaff","#2a5cb8","#2a5cb8","#8fbaff","#789cd6"],["#789cd6","#8fbaff","#2a5cb8","#2a5cb8","#8fbaff","#8fbaff","#f2c445","#f2c445","#6a3a10","#f2c445","#f2c445","#f2c445","#8fbaff","#8fbaff","#2a5cb8","#2a5cb8","#8fbaff","#789cd6"],["#356bc1","#3f7fe6","#8fbaff","#8fbaff","#3f7fe6","#3f7fe6","#f2c445","#f2c445","#f2c445","#f2c445","#f2c445","#f2c445","#3f7fe6","#3f7fe6","#8fbaff","#8fbaff","#3f7fe6","#356bc1"],["#2c59a1","#356bc1","#789cd6","#789cd6","#356bc1","#356bc1","#cba53a","#cba53a","#59310d","#cba53a","#cba53a","#cba53a","#356bc1","#356bc1","#789cd6","#789cd6","#356bc1","#2c59a1"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "space"
      ],
  },
  {
    id: "astronaut_ice_cream",
    name: "astronaut ice cream. it is crunchy and that is wrong.",
    grid: [
        "XXXX"
      ],
    color: [["#7a7f88","#c1c5ca","#c1c5ca","#9299a3","#c1c5ca","#a8adb5","#d68297","#d68297","#d68297","#d68297","#d6a8b4","#d68297","#d68297","#d68297","#d68297","#d6a8b4","#d68297","#d68297","#d68297","#d68297","#d6a8b4","#d68297","#d68297","#b26c7e"],["#c1c5ca","#e6eaf0","#aeb6c2","#e6eaf0","#e6eaf0","#ff9bb4","#ff9bb4","#ffc8d6","#ff9bb4","#ff9bb4","#ff9bb4","#ff9bb4","#ffc8d6","#ff9bb4","#ff9bb4","#ff9bb4","#ff9bb4","#ffc8d6","#ff9bb4","#ff9bb4","#ff9bb4","#ff9bb4","#ffc8d6","#d68297"],["#c1c5ca","#aeb6c2","#e6eaf0","#e6eaf0","#aeb6c2","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#d6ccb4"],["#9299a3","#e6eaf0","#e6eaf0","#aeb6c2","#e6eaf0","#e8d6a8","#fff3d6","#e8d6a8","#fff3d6","#e8d6a8","#fff3d6","#e8d6a8","#fff3d6","#e8d6a8","#fff3d6","#e8d6a8","#fff3d6","#e8d6a8","#fff3d6","#e8d6a8","#fff3d6","#e8d6a8","#fff3d6","#c3b48d"],["#c1c5ca","#e6eaf0","#aeb6c2","#e6eaf0","#e6eaf0","#a8683c","#a8683c","#a8683c","#c88a58","#a8683c","#a8683c","#a8683c","#c88a58","#a8683c","#a8683c","#a8683c","#c88a58","#a8683c","#a8683c","#a8683c","#c88a58","#a8683c","#a8683c","#8d5732"],["#a1a4a8","#9299a3","#c1c5ca","#c1c5ca","#9299a3","#a8adb5","#8d5732","#a8744a","#8d5732","#8d5732","#8d5732","#a8744a","#8d5732","#8d5732","#8d5732","#a8744a","#8d5732","#8d5732","#8d5732","#a8744a","#8d5732","#8d5732","#8d5732","#8c613e"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food",
        "space"
      ],
  },
  {
    id: "sad_asteroid",
    name: "a small sad asteroid. it missed.",
    grid: [
        ".XX",
        "XX."
      ],
    color: [["","","","","","","#726961","#897e74","#897e74","#897e74","#897e74","#897e74","#897e74","#897e74","#897e74","#665c52","#897e74","#726961"],["","","","","","","#897e74","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#6a5e54","#6a5e54","#a3968a","#897e74"],["","","","","","","#897e74","#2e241f","#a3968a","#a3968a","#a3968a","#2e241f","#a3968a","#c4b8ab","#6a5e54","#d2c6b8","#a3968a","#897e74"],["","","","","","","#897e74","#2e241f","#a3968a","#a3968a","#a3968a","#2e241f","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#897e74"],["","","","","","","#897e74","#7fd0ff","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#6a5e54","#6a5e54","#a3968a","#a3968a","#897e74"],["","","","","","","#897e74","#a3968a","#2e241f","#2e241f","#2e241f","#a3968a","#897e74","#594f47","#b0a69b","#897e74","#a59b90","#726961"],["#726961","#897e74","#897e74","#897e74","#897e74","#897e74","#a3968a","#2e241f","#a3968a","#a3968a","#a3968a","#271e1a","","","","","",""],["#897e74","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#897e74","","","","","",""],["#897e74","#a3968a","#6a5e54","#6a5e54","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#897e74","","","","","",""],["#897e74","#a3968a","#6a5e54","#d2c6b8","#a3968a","#a3968a","#7a6d62","#a3968a","#a3968a","#a3968a","#a3968a","#897e74","","","","","",""],["#897e74","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a3968a","#a59b90","","","","","",""],["#726961","#897e74","#897e74","#897e74","#897e74","#897e74","#897e74","#897e74","#897e74","#897e74","#897e74","#726961","","","","","",""]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "space"
      ],
  },
  {
    id: "lost_ufo",
    name: "a ufo that took a wrong turn at saturn",
    grid: [
        ".X.",
        "XXX"
      ],
    color: [["","","","","","","#6fa1a9","#86c1cb","#86c1cb","#86c1cb","#86c1cb","#6fa1a9","","","","","",""],["","","","","","","#86c1cb","#ffffff","#9fe6f2","#9fe6f2","#9fe6f2","#86c1cb","","","","","",""],["","","","","","","#86c1cb","#9fe6f2","#6ad64a","#6ad64a","#9fe6f2","#86c1cb","","","","","",""],["","","","","","","#86c1cb","#6ad64a","#1e4a14","#1e4a14","#6ad64a","#86c1cb","","","","","",""],["","","","","","","#86c1cb","#6ad64a","#6ad64a","#6ad64a","#6ad64a","#86c1cb","","","","","",""],["","","","","","","#999ea8","#b6bcc8","#6ad64a","#6ad64a","#b6bcc8","#999ea8","","","","","",""],["#7f848c","#999ea8","#999ea8","#999ea8","#999ea8","#999ea8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#999ea8","#999ea8","#999ea8","#999ea8","#999ea8","#7f848c"],["#c0c3ca","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#e4e8f0","#c0c3ca"],["#999ea8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#999ea8"],["#999ea8","#ffe04a","#ffe04a","#b6bcc8","#b6bcc8","#ff5a6a","#ff5a6a","#b6bcc8","#b6bcc8","#ffe04a","#ffe04a","#b6bcc8","#b6bcc8","#ff5a6a","#ff5a6a","#b6bcc8","#b6bcc8","#d6bc3e"],["#999ea8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#b6bcc8","#999ea8"],["#61656f","#747985","#747985","#747985","#747985","#747985","#747985","#747985","#747985","#747985","#747985","#747985","#747985","#747985","#747985","#747985","#747985","#61656f"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "space"
      ],
  },
  {
    id: "folded_deckchair",
    name: "a deckchair that refuses to unfold",
    grid: [
        "XX.",
        ".XX"
      ],
    color: [["#8e6335","#a97740","#a97740","#a97740","#a97740","#a97740","#a97740","#a97740","#a97740","#a97740","#a97740","#8e6335","","","","","",""],["#a97740","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#a97740","","","","","",""],["#a97740","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#a97740","","","","","",""],["#a97740","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#a97740","","","","","",""],["#a97740","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#a97740","","","","","",""],["#8e6335","#a97740","#a97740","#a97740","#a97740","#a97740","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#a97740","","","","","",""],["","","","","","","#a97740","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#a97740","#a97740","#a97740","#a97740","#a97740","#8e6335"],["","","","","","","#a97740","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#a97740"],["","","","","","","#a97740","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#a97740"],["","","","","","","#a97740","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#a97740"],["","","","","","","#a97740","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#3d7fd8","#f6f6f2","#f6f6f2","#3d7fd8","#a97740"],["","","","","","","#8e6335","#a97740","#a97740","#a97740","#a97740","#a97740","#a97740","#a97740","#a97740","#a97740","#a97740","#8e6335"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "travel"
      ],
  },
  {
    id: "wizard_hat_rabbit",
    name: "a wizard's hat with a rabbit stuck in it (wrong way up)",
    grid: [
        ".X.",
        ".X.",
        "XXX"
      ],
    color: [["","","","","","","#b8b8b8","#d6d6d6","#8160c6","#8160c6","#d6d6d6","#b8b8b8","","","","","",""],["","","","","","","#d6819b","#ffffff","#9a72ec","#9a72ec","#ffffff","#d6819b","","","","","",""],["","","","","","","#8160c6","#ffffff","#9a72ec","#9a72ec","#ffffff","#8160c6","","","","","",""],["","","","","","","#8160c6","#ffffff","#d6d6e6","#d6d6e6","#ffffff","#8160c6","","","","","",""],["","","","","","","#b4b4c1","#ffffff","#ffffff","#ffffff","#ffffff","#b4b4c1","","","","","",""],["","","","","","","#5e3ca8","#d6d6e6","#ffffff","#ffffff","#d6d6e6","#5e3ca8","","","","","",""],["","","","","","","#8160c6","#7048c8","#d6d6e6","#d6d6e6","#7048c8","#452885","","","","","",""],["","","","","","","#8160c6","#9a72ec","#7048c8","#7048c8","#7048c8","#452885","","","","","",""],["","","","","","","#8160c6","#ffd23a","#7048c8","#7048c8","#52309e","#452885","","","","","",""],["","","","","","","#d6b031","#ffd23a","#ffd23a","#7048c8","#7048c8","#452885","","","","","",""],["","","","","","","#8160c6","#ffd23a","#7048c8","#7048c8","#7048c8","#452885","","","","","",""],["","","","","","","#c39428","#e8b030","#e8b030","#e8b030","#e8b030","#9b6c14","","","","","",""],["#6f52aa","#5e3ca8","#341e6d","#452885","#8160c6","#8160c6","#9a72ec","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#5e3ca8","#5e3ca8","#452885","#341e6d","#5e3ca8","#6f52aa"],["#5e3ca8","#9a72ec","#3e2482","#52309e","#7048c8","#9a72ec","#9a72ec","#9a72ec","#7048c8","#7048c8","#7048c8","#7048c8","#ffd23a","#7048c8","#52309e","#3e2482","#7048c8","#452885"],["#8160c6","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#9a72ec","#8160c6"],["#5e3ca8","#7048c8","#7048c8","#ffd23a","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#ffd23a","#7048c8","#5e3ca8"],["#5e3ca8","#7048c8","#ffd23a","#ffd23a","#ffd23a","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#7048c8","#5e3ca8"],["#3b2372","#452885","#452885","#d6b031","#452885","#452885","#452885","#452885","#452885","#452885","#452885","#452885","#452885","#452885","#452885","#452885","#452885","#3b2372"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "frog_prince",
    name: "a frog prince. not kissed yet. taking applications.",
    grid: [
        ".X.",
        "XXX",
        "X.X"
      ],
    color: [["","","","","","","#b8972a","#409e32","#d6b031","#d6b031","#409e32","#b8972a","","","","","",""],["","","","","","","#d6b031","#4cbc3c","#ffd23a","#ffd23a","#4cbc3c","#d6b031","","","","","",""],["","","","","","","#d6b031","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#d6b031","","","","","",""],["","","","","","","#d6b031","#e83040","#ffd23a","#3a8ae8","#ffd23a","#c32836","","","","","",""],["","","","","","","#d6b031","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#d6b031","","","","","",""],["","","","","","","#b58114","#d89a18","#d89a18","#d89a18","#d89a18","#b58114","","","","","",""],["#21631e","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#277423","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#277423","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#21631e"],["#d6d6d6","#ffffff","#1e2a1e","#1e2a1e","#ffffff","#ffffff","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#ffffff","#ffffff","#1e2a1e","#1e2a1e","#ffffff","#d6d6d6"],["#d6d6d6","#ffffff","#1e2a1e","#1e2a1e","#ffffff","#ffffff","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#ffffff","#ffffff","#1e2a1e","#1e2a1e","#ffffff","#d6d6d6"],["#277423","#ffffff","#ffffff","#ffffff","#ffffff","#2e8a2a","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#2e8a2a","#ffffff","#ffffff","#ffffff","#ffffff","#277423"],["#409e32","#ff8aa8","#ff8aa8","#4cbc3c","#4cbc3c","#1f6a20","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#1f6a20","#4cbc3c","#4cbc3c","#ff8aa8","#ff8aa8","#409e32"],["#409e32","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#1a591b","#1a591b","#1a591b","#1a591b","#1a591b","#1a591b","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#4cbc3c","#409e32"],["#409e32","#4cbc3c","#c8f090","#4cbc3c","#4cbc3c","#409e32","","","","","","","#409e32","#4cbc3c","#4cbc3c","#8ee060","#4cbc3c","#409e32"],["#409e32","#c8f090","#c8f090","#c8f090","#4cbc3c","#409e32","","","","","","","#409e32","#4cbc3c","#c8f090","#c8f090","#c8f090","#409e32"],["#409e32","#4cbc3c","#4cbc3c","#4cbc3c","#2e8a2a","#409e32","","","","","","","#409e32","#2e8a2a","#4cbc3c","#4cbc3c","#4cbc3c","#409e32"],["#409e32","#4cbc3c","#4cbc3c","#2e8a2a","#4cbc3c","#409e32","","","","","","","#409e32","#4cbc3c","#2e8a2a","#4cbc3c","#4cbc3c","#409e32"],["#77bc51","#4cbc3c","#8ee060","#4cbc3c","#8ee060","#409e32","","","","","","","#409e32","#8ee060","#4cbc3c","#8ee060","#4cbc3c","#77bc51"],["#66a145","#77bc51","#77bc51","#77bc51","#77bc51","#66a145","","","","","","","#66a145","#77bc51","#77bc51","#77bc51","#77bc51","#66a145"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "rapunzel_brush",
    name: "Rapunzel's hairbrush (it is mostly hair now)",
    grid: [
        "XXX",
        "XXX",
        ".X.",
        ".X."
      ],
    color: [["#a1517f","#ad7b1a","#ccad3b","#ccc286","#ccad3b","#b35a8d","#b35a8d","#b35a8d","#ad7b1a","#ccad3b","#ccc286","#ccad3b","#b35a8d","#ad7b1a","#ccad3b","#ccc286","#ccad3b","#a1517f"],["#b35a8d","#ffd0ea","#d89a20","#ffd84a","#fff3a8","#ffd84a","#e070b0","#ffd0ea","#d89a20","#ffd84a","#fff3a8","#ffd84a","#e070b0","#d89a20","#ffd84a","#fff3a8","#ffd84a","#b35a8d"],["#b35a8d","#a03c78","#d89a20","#ffd84a","#fff3a8","#ffd84a","#e070b0","#fff3a8","#fff3a8","#fff3a8","#fff3a8","#e070b0","#d89a20","#ffd84a","#fff3a8","#ffd84a","#a03c78","#b35a8d"],["#ccc286","#e070b0","#e070b0","#d89a20","#ffd84a","#fff3a8","#fff3a8","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#fff3a8","#fff3a8","#fff3a8","#ffd84a","#e070b0","#e070b0","#ccc286"],["#ccad3b","#fff3a8","#fff3a8","#fff3a8","#fff3a8","#ffd84a","#ffd84a","#d89a20","#d89a20","#d89a20","#d89a20","#ffd84a","#ffd84a","#fff3a8","#fff3a8","#fff3a8","#fff3a8","#ccad3b"],["#ad7b1a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#d89a20","#d89a20","#ffd84a","#fff3a8","#ffd84a","#d89a20","#d89a20","#d89a20","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ad7b1a"],["#b35a8d","#d89a20","#d89a20","#d89a20","#d89a20","#d89a20","#ffd84a","#fff3a8","#ffd84a","#e070b0","#e070b0","#d89a20","#ffd84a","#d89a20","#d89a20","#d89a20","#d89a20","#b35a8d"],["#ad7b1a","#ffd84a","#fff3a8","#ffd84a","#ffd0ea","#d89a20","#ffd84a","#fff3a8","#ffd84a","#e070b0","#ffd0ea","#d89a20","#ffd84a","#fff3a8","#ffd84a","#e070b0","#ffd0ea","#b35a8d"],["#ccad3b","#fff3a8","#ffd84a","#e070b0","#a03c78","#e070b0","#d89a20","#ffd84a","#fff3a8","#ffd84a","#a03c78","#e070b0","#d89a20","#ffd84a","#fff3a8","#ffd84a","#a03c78","#b35a8d"],["#ccad3b","#fff3a8","#ffd84a","#e070b0","#e070b0","#e070b0","#e070b0","#d89a20","#ffd84a","#fff3a8","#ffd84a","#e070b0","#e070b0","#d89a20","#ffd84a","#fff3a8","#ffd84a","#b35a8d"],["#ad7b1a","#ffd84a","#fff3a8","#ffd84a","#ffd0ea","#e070b0","#e070b0","#d89a20","#ffd84a","#fff3a8","#ffd84a","#e070b0","#e070b0","#ffd0ea","#d89a20","#ffd84a","#fff3a8","#ccad3b"],["#a1517f","#ad7b1a","#ccad3b","#ccc286","#ccad3b","#b35a8d","#e070b0","#a03c78","#d89a20","#ffd84a","#fff3a8","#ffd84a","#b35a8d","#803060","#ad7b1a","#ccad3b","#ccc286","#b89c35"],["","","","","","","#623b20","#7a4a28","#d89a20","#ffd84a","#fff3a8","#ccad3b","","","","","",""],["","","","","","","#865026","#d89a20","#ffd84a","#fff3a8","#ffd84a","#865026","","","","","",""],["","","","","","","#865026","#d89a20","#ffd84a","#fff3a8","#ffd84a","#865026","","","","","",""],["","","","","","","#ad7b1a","#ffd84a","#fff3a8","#ffd84a","#d08a48","#865026","","","","","",""],["","","","","","","#ccad3b","#fff3a8","#ffd84a","#f0b878","#d08a48","#865026","","","","","",""],["","","","","","","#ccad3b","#fff3a8","#ffd84a","#f0b878","#d08a48","#865026","","","","","",""],["","","","","","","#ad7b1a","#ffd84a","#fff3a8","#ffd84a","#d08a48","#865026","","","","","",""],["","","","","","","#ad7b1a","#ffd84a","#fff3a8","#ffd84a","#d08a48","#865026","","","","","",""],["","","","","","","#865026","#d89a20","#ffd84a","#fff3a8","#ffd84a","#865026","","","","","",""],["","","","","","","#865026","#d08a48","#d89a20","#ffd84a","#fff3a8","#ccad3b","","","","","",""],["","","","","","","#865026","#d08a48","#d89a20","#ffd84a","#fff3a8","#ccad3b","","","","","",""],["","","","","","","#794823","#ad7b1a","#ccad3b","#ccc286","#ccad3b","#794823","","","","","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "dragon_egg",
    name: "a dragon's egg. do not sit on it.",
    grid: [
        ".X.",
        "XXX",
        "XXX",
        ".X."
      ],
    color: [["","","","","","","#227d4c","#279259","#6abc86","#6abc86","#279259","#227d4c","","","","","",""],["","","","","","","#279259","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#279259","","","","","",""],["","","","","","","#125734","#1f8a52","#1f8a52","#1f8a52","#1f8a52","#125734","","","","","",""],["","","","","","","#6abc86","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#6abc86","","","","","",""],["","","","","","","#5ca67f","#6dc697","#2fae6a","#2fae6a","#2fae6a","#279259","","","","","",""],["","","","","","","#529171","#62ad86","#5c9578","#16683e","#1f8a52","#1a7445","","","","","",""],["#227d4c","#279259","#6abc86","#6abc86","#5ca67f","#5ca67f","#6dc697","#6dc697","#a5e9bc","#7ee0a0","#2fae6a","#2fae6a","#279259","#279259","#6abc86","#6abc86","#279259","#227d4c"],["#279259","#2fae6a","#2fae6a","#2fae6a","#6dc697","#6dc697","#6dc697","#6dc697","#6dc697","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#279259"],["#125734","#1f8a52","#1f8a52","#1f8a52","#1f8a52","#5c9578","#5c9578","#62ad86","#1f8a52","#1f8a52","#1f8a52","#16683e","#16683e","#1f8a52","#1f8a52","#1f8a52","#1f8a52","#125734"],["#6abc86","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#7ee0a0","#7ee0a0","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#7ee0a0","#7ee0a0","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#6abc86"],["#279259","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#ffb030","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#279259"],["#1a7445","#1f8a52","#ff8a1a","#ff8a1a","#1f8a52","#1f8a52","#1f8a52","#ff7a1a","#ffe23a","#3a1a08","#ffe23a","#ff7a1a","#1f8a52","#1f8a52","#16683e","#ff8a1a","#ff8a1a","#1a7445"],["#d67416","#ff8a1a","#7ee0a0","#7ee0a0","#ff8a1a","#2fae6a","#2fae6a","#ff7a1a","#ffe23a","#3a1a08","#ffe23a","#ff7a1a","#2fae6a","#2fae6a","#ff8a1a","#7ee0a0","#2fae6a","#d67416"],["#279259","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#ff8a1a","#ff8a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ff7a1a","#ffb030","#ff8a1a","#ff8a1a","#2fae6a","#2fae6a","#2fae6a","#279259"],["#125734","#1f8a52","#1f8a52","#1f8a52","#1f8a52","#16683e","#16683e","#1f8a52","#1f8a52","#1f8a52","#1f8a52","#16683e","#16683e","#1f8a52","#1f8a52","#1f8a52","#1f8a52","#125734"],["#6abc86","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#7ee0a0","#7ee0a0","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#7ee0a0","#7ee0a0","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#6abc86"],["#279259","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#279259"],["#16633b","#1a7445","#125734","#125734","#1a7445","#1a7445","#1f8a52","#1f8a52","#16683e","#16683e","#1f8a52","#1f8a52","#1a7445","#1a7445","#125734","#125734","#1a7445","#16633b"],["","","","","","","#279259","#2fae6a","#7ee0a0","#7ee0a0","#2fae6a","#279259","","","","","",""],["","","","","","","#279259","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#279259","","","","","",""],["","","","","","","#125734","#1f8a52","#ffb040","#1f8a52","#1f8a52","#125734","","","","","",""],["","","","","","","#6abc86","#2fae6a","#2fae6a","#ff7a1a","#ffb040","#6abc86","","","","","",""],["","","","","","","#279259","#2fae6a","#ffb040","#2fae6a","#2fae6a","#279259","","","","","",""],["","","","","","","#16633b","#1a7445","#125734","#125734","#1a7445","#16633b","","","","","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "lighthouse_lunchbox",
    name: "a lighthouse keeper's lunchbox (it flashes at lunchtime)",
    grid: [
        ".X.",
        "XXX",
        "XXX"
      ],
    color: [["","","","","","","#731117","#af2328","#af2328","#af2328","#af2328","#731117","","","","","",""],["","","","","","","#d69b1b","#ffe040","#ffe040","#ffe040","#ffe040","#d69b1b","","","","","",""],["","","","","","","#d6bc36","#ffe040","#fffbd0","#fffbd0","#ffe040","#d6bc36","","","","","",""],["","","","","","","#d69b1b","#ffe040","#fffbd0","#fffbd0","#ffe040","#d69b1b","","","","","",""],["","","","","","","#818a9b","#9aa4b8","#9aa4b8","#9aa4b8","#9aa4b8","#818a9b","","","","","",""],["","","","","","","#596172","#6a7488","#6a7488","#6a7488","#6a7488","#596172","","","","","",""],["#b1b1ae","#cfcfcb","#cfcfcb","#cfcfcb","#cfcfcb","#d6cc86","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#cfcfcb","#cfcfcb","#cfcfcb","#cfcfcb","#cfcfcb","#b1b1ae"],["#cfcfcb","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#cfcfcb"],["#c32c32","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#c0c8d6","#c0c8d6","#c0c8d6","#c0c8d6","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#c32c32"],["#74141b","#8a1820","#8a1820","#8a1820","#8a1820","#8a1820","#8a1820","#c0c8d6","#7a8496","#7a8496","#c0c8d6","#8a1820","#8a1820","#8a1820","#8a1820","#8a1820","#8a1820","#74141b"],["#cfcfcb","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#c0c8d6","#7a8496","#7a8496","#c0c8d6","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#cfcfcb"],["#cfcfcb","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#c0c8d6","#c0c8d6","#c0c8d6","#c0c8d6","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#cfcfcb"],["#c32c32","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#c32c32"],["#c32c32","#e8343c","#a8d8ff","#5aa8e8","#5aa8e8","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#f4d090","#f4d090","#f4d090","#f4d090","#cdaf79"],["#cfcfcb","#f6f6f2","#5aa8e8","#5aa8e8","#5aa8e8","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#5ac04a","#5ac04a","#5ac04a","#5ac04a","#4ca13e"],["#cfcfcb","#f6f6f2","#5aa8e8","#5aa8e8","#5aa8e8","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f6f6f2","#f4d090","#f4d090","#f4d090","#f4d090","#cdaf79"],["#c32c32","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#d8a858","#d8a858","#d8a858","#d8a858","#b58d4a"],["#a7252b","#c32c32","#c32c32","#c32c32","#c32c32","#c32c32","#c32c32","#c32c32","#c32c32","#c32c32","#c32c32","#c32c32","#c32c32","#c32c32","#c32c32","#c32c32","#c32c32","#a7252b"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "postbag_cards",
    name: "a postman's bag full of birthday cards. none of them are for him.",
    grid: [
        "X.X",
        "XXX",
        "XXX"
      ],
    color: [["#b85c84","#d66c9b","#d66c9b","#d66c9b","#d66c9b","#b85c84","","","","","","","#a3a3ab","#bebec8","#bebec8","#bebec8","#4ca13e","#418a35"],["#d694b2","#ff80b8","#ff80b8","#ff80b8","#ff80b8","#d694b2","","","","","","","#d6d6d6","#e2e2ee","#e2e2ee","#e2e2ee","#5ac04a","#4ca13e"],["#d694b2","#ffb0d4","#ff80b8","#ff80b8","#ffb0d4","#d694b2","","","","","","","#d6d6d6","#ffffff","#e2e2ee","#e2e2ee","#ffffff","#d6d6d6"],["#d694b2","#ffb0d4","#e83040","#ff80b8","#e83040","#d694b2","","","","","","","#d6d6d6","#ffffff","#ffffff","#ffffff","#ffffff","#d6d6d6"],["#d694b2","#ffb0d4","#e83040","#e83040","#e83040","#d694b2","","","","","","","#8db5d6","#a8d8ff","#a8d8ff","#a8d8ff","#a8d8ff","#8db5d6"],["#d694b2","#ffb0d4","#ffb0d4","#e83040","#ffb0d4","#d694b2","","","","","","","#659bca","#78b8f0","#78b8f0","#78b8f0","#78b8f0","#659bca"],["#713c18","#86481c","#86481c","#86481c","#86481c","#86481c","#713c18","#713c18","#713c18","#713c18","#713c18","#713c18","#86481c","#86481c","#86481c","#86481c","#86481c","#713c18"],["#a86d34","#e0a060","#e0a060","#e0a060","#e0a060","#e0a060","#e0a060","#e0a060","#e0a060","#e0a060","#e0a060","#e0a060","#e0a060","#e0a060","#e0a060","#e0a060","#e0a060","#a86d34"],["#a86d34","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#a86d34"],["#592f11","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#592f11"],["#8d5423","#6a3814","#6a3814","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#c8823e","#6a3814","#6a3814","#8d5423"],["#8d5423","#a8642a","#a8642a","#6a3814","#6a3814","#c8823e","#c8823e","#c8823e","#86481c","#86481c","#c8823e","#c8823e","#c8823e","#6a3814","#6a3814","#a8642a","#a8642a","#8d5423"],["#8d5423","#a8642a","#a8642a","#a8642a","#a8642a","#6a3814","#6a3814","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#6a3814","#6a3814","#a8642a","#a8642a","#a8642a","#a8642a","#8d5423"],["#713c18","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#ffd23a","#86481c","#86481c","#ffd23a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#713c18"],["#713c18","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#713c18"],["#713c18","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#713c18"],["#713c18","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#a8642a","#713c18"],["#603414","#8d5423","#8d5423","#8d5423","#8d5423","#8d5423","#8d5423","#8d5423","#8d5423","#8d5423","#8d5423","#8d5423","#8d5423","#8d5423","#8d5423","#8d5423","#8d5423","#603414"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "dentist_chair",
    name: "a dentist's chair. it goes back further than you'd like.",
    grid: [
        "X...",
        "XX..",
        ".XXX",
        "..X."
      ],
    color: [["#27796d","#4cafa1","#4cafa1","#4cafa1","#4cafa1","#41968a","","","","","","","","","","","","","","","","","",""],["#4cafa1","#9af0e2","#9af0e2","#9af0e2","#9af0e2","#2d8d80","","","","","","","","","","","","","","","","","",""],["#4cafa1","#9af0e2","#9af0e2","#9af0e2","#9af0e2","#4cafa1","","","","","","","","","","","","","","","","","",""],["#4cafa1","#9af0e2","#9af0e2","#9af0e2","#9af0e2","#4cafa1","","","","","","","","","","","","","","","","","",""],["#4cafa1","#36a898","#36a898","#36a898","#36a898","#4cafa1","","","","","","","","","","","","","","","","","",""],["#4cafa1","#36a898","#5ad0c0","#5ad0c0","#5ad0c0","#4cafa1","","","","","","","","","","","","","","","","","",""],["#2d8d80","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#2d8d80","#4cafa1","#4cafa1","#4cafa1","#4cafa1","#41968a","","","","","","","","","","","",""],["#4cafa1","#ffffff","#ffffff","#ffffff","#5ad0c0","#36a898","#5ad0c0","#5ad0c0","#5ad0c0","#f8f8ff","#f8f8ff","#2d8d80","","","","","","","","","","","",""],["#ffffff","#c0e8ff","#ffffff","#ffffff","#ffffff","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#f8f8ff","#f8f8ff","#4cafa1","","","","","","","","","","","",""],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#f8f8ff","#f8f8ff","#4cafa1","","","","","","","","","","","",""],["#4cafa1","#ffffff","#36a898","#ffffff","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#36a898","#5ad0c0","#5ad0c0","#4cafa1","","","","","","","","","","","",""],["#41968a","#2d8d80","#4cafa1","#4cafa1","#4cafa1","#4cafa1","#5ad0c0","#36a898","#5ad0c0","#5ad0c0","#5ad0c0","#4cafa1","","","","","","","","","","","",""],["","","","","","","#2d8d80","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#2d8d80","#4cafa1","#4cafa1","#4cafa1","#4cafa1","#4cafa1","#81cabe","#81cabe","#81cabe","#81cabe","#81cabe","#6fada3"],["","","","","","","#4cafa1","#e8eef6","#e8eef6","#e8eef6","#e8eef6","#e8eef6","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#36a898","#9af0e2","#9af0e2","#9af0e2","#9af0e2","#9af0e2","#81cabe"],["","","","","","","#4cafa1","#e8eef6","#e8eef6","#e8eef6","#e8eef6","#e8eef6","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#36a898","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#36a898","#4cafa1"],["","","","","","","#4cafa1","#a8b2c4","#a8b2c4","#a8b2c4","#a8b2c4","#a8b2c4","#5ad0c0","#5ad0c0","#5ad0c0","#36a898","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#36a898","#5ad0c0","#4cafa1"],["","","","","","","#4cafa1","#5ad0c0","#36a898","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#36a898","#5ad0c0","#5ad0c0","#5ad0c0","#24806e","#24806e","#24806e","#24806e","#24806e","#1e6c5c"],["","","","","","","#41968a","#2d8d80","#4cafa1","#4cafa1","#4cafa1","#4cafa1","#5ad0c0","#36a898","#5ad0c0","#5ad0c0","#5ad0c0","#5ad0c0","#1e6c5c","#1e6c5c","#1e6c5c","#1e6c5c","#1e6c5c","#1a5c4f"],["","","","","","","","","","","","","#747c8d","#c8d0de","#f0f4fa","#c8d0de","#a8b2c4","#666f80","","","","","",""],["","","","","","","","","","","","","#747c8d","#c8d0de","#f0f4fa","#c8d0de","#a8b2c4","#666f80","","","","","",""],["","","","","","","","","","","","","#747c8d","#c8d0de","#f0f4fa","#c8d0de","#e83040","#c32836","","","","","",""],["","","","","","","","","","","","","#747c8d","#c8d0de","#f0f4fa","#c8d0de","#e83040","#c32836","","","","","",""],["","","","","","","","","","","","","#596172","#9aa4b8","#9aa4b8","#9aa4b8","#9aa4b8","#596172","","","","","",""],["","","","","","","","","","","","","#4c5462","#596172","#596172","#596172","#596172","#4c5462","","","","","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "unicycle",
    name: "a unicycle, for people who find bicycles too easy",
    grid: [
        "XX",
        ".X",
        "XX",
        "XX"
      ],
    color: [["#8a1e23","#a12328","#d65959","#d65959","#d65959","#d65959","#d65959","#d65959","#d65959","#d65959","#d65959","#b84c4c"],["#a12328","#c02a30","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#d65959"],["#a12328","#c02a30","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#c32c32"],["#a12328","#c02a30","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#c32c32"],["#a12328","#c02a30","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#c32c32"],["#8a1e23","#a12328","#8d1b22","#8d1b22","#8d1b22","#8d1b22","#a82028","#a82028","#a82028","#a82028","#a82028","#8d1b22"],["","","","","","","#666f80","#a8b2c4","#e8eef6","#ffffff","#c8d0de","#747c8d"],["","","","","","","#666f80","#a8b2c4","#e8eef6","#ffffff","#c8d0de","#747c8d"],["","","","","","","#666f80","#a8b2c4","#e8eef6","#ffffff","#c8d0de","#747c8d"],["","","","","","","#666f80","#a8b2c4","#e8eef6","#ffffff","#c8d0de","#747c8d"],["","","","","","","#666f80","#a8b2c4","#e8eef6","#ffffff","#c8d0de","#747c8d"],["","","","","","","#666f80","#a8b2c4","#e8eef6","#ffffff","#c8d0de","#747c8d"],["#585868","#4c4c5c","#666679","#4c4c5c","#666679","#4c4c5c","#7a7a90","#a8b2c4","#a8b2c4","#5a5a6e","#7a7a90","#4c4c5c"],["#4c4c5c","#7a7a90","#5a5a6e","#7a7a90","#c8d0de","#c8d0de","#c8d0de","#a8b2c4","#a8b2c4","#7a7a90","#5a5a6e","#666679"],["#666679","#5a5a6e","#e8eef6","#9ad8ff","#9ad8ff","#9ad8ff","#e8eef6","#a8b2c4","#a8b2c4","#c8d0de","#e8eef6","#4c4c5c"],["#4c4c5c","#7a7a90","#9ad8ff","#e8eef6","#9ad8ff","#9ad8ff","#e8eef6","#9ad8ff","#9ad8ff","#e8eef6","#5a5a6e","#666679"],["#d6b031","#ffd23a","#9ad8ff","#9ad8ff","#e8eef6","#9ad8ff","#e8eef6","#9ad8ff","#e8eef6","#9ad8ff","#c8d0de","#4c4c5c"],["#d6b031","#ffd23a","#9ad8ff","#9ad8ff","#9ad8ff","#ffd23a","#ffd23a","#e8eef6","#9ad8ff","#9ad8ff","#c8d0de","#666679"],["#666679","#c8d0de","#e8eef6","#e8eef6","#e8eef6","#ffd23a","#ffd23a","#e8eef6","#e8eef6","#e8eef6","#ffd23a","#d6b031"],["#4c4c5c","#c8d0de","#9ad8ff","#9ad8ff","#9ad8ff","#e8eef6","#e8eef6","#e8eef6","#9ad8ff","#9ad8ff","#ffd23a","#d6b031"],["#666679","#5a5a6e","#9ad8ff","#9ad8ff","#e8eef6","#9ad8ff","#e8eef6","#9ad8ff","#e8eef6","#9ad8ff","#7a7a90","#4c4c5c"],["#4c4c5c","#7a7a90","#c8d0de","#e8eef6","#9ad8ff","#9ad8ff","#e8eef6","#9ad8ff","#9ad8ff","#e8eef6","#5a5a6e","#666679"],["#666679","#5a5a6e","#e8eef6","#5a5a6e","#c8d0de","#c8d0de","#e8eef6","#c8d0de","#7a7a90","#5a5a6e","#e8eef6","#4c4c5c"],["#41414f","#666679","#4c4c5c","#666679","#4c4c5c","#666679","#4c4c5c","#666679","#4c4c5c","#666679","#4c4c5c","#585868"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "tiny_armour",
    name: "a knight's armour, two sizes too small",
    grid: [
        ".X.",
        "XXX",
        ".X.",
        "X.X"
      ],
    color: [["","","","","","","#848c99","#c3c8d0","#c3c8d0","#c32836","#d65959","#848c99","","","","","",""],["","","","","","","#9ba3b2","#e8eef8","#b8c2d4","#b8c2d4","#b8c2d4","#9ba3b2","","","","","",""],["","","","","","","#747c8f","#8a94aa","#8a94aa","#8a94aa","#8a94aa","#747c8f","","","","","",""],["","","","","","","#d6a186","#5a3a3a","#ffc0a0","#ffc0a0","#5a3a3a","#d6a186","","","","","",""],["","","","","","","#d6a186","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#d6a186","","","","","",""],["","","","","","","#747c8f","#8a94aa","#b8c2d4","#8a94aa","#8a94aa","#9ba3b2","","","","","",""],["#848c99","#9ba3b2","#9ba3b2","#9ba3b2","#c3c8d0","#c3c8d0","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#747c8f","#747c8f","#9ba3b2","#9ba3b2","#9ba3b2","#848c99"],["#747c8f","#8a94aa","#8a94aa","#8a94aa","#e8eef8","#e8eef8","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#8a94aa","#8a94aa","#8a94aa","#8a94aa","#8a94aa","#747c8f"],["#d6a186","#ffc0a0","#ffc0a0","#ffc0a0","#e8eef8","#e8eef8","#b8c2d4","#b8c2d4","#e8eef8","#b8c2d4","#b8c2d4","#b8c2d4","#8a94aa","#8a94aa","#ffc0a0","#ffc0a0","#ffc0a0","#d6a186"],["#d6a186","#e89878","#ffc0a0","#ffc0a0","#e8eef8","#e8eef8","#b8c2d4","#b8c2d4","#b8c2d4","#e8eef8","#b8c2d4","#b8c2d4","#8a94aa","#8a94aa","#ffc0a0","#ffc0a0","#e89878","#d6a186"],["#d6a186","#ffc0a0","#ffc0a0","#ffc0a0","#e8eef8","#e8eef8","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#8a94aa","#8a94aa","#ffc0a0","#ffc0a0","#ffc0a0","#d6a186"],["#b88a73","#d6a186","#d6a186","#d6a186","#c3c8d0","#c3c8d0","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#747c8f","#747c8f","#d6a186","#d6a186","#d6a186","#b88a73"],["","","","","","","#747c8f","#8a94aa","#8a94aa","#8a94aa","#8a94aa","#747c8f","","","","","",""],["","","","","","","#d6a186","#ffc0a0","#ffc0a0","#ffc0a0","#ffc0a0","#d6a186","","","","","",""],["","","","","","","#d6a186","#ffd8c0","#ffc0a0","#ffc0a0","#ffc0a0","#d6a186","","","","","",""],["","","","","","","#d6a186","#ffc0a0","#e89878","#e89878","#ffc0a0","#d6a186","","","","","",""],["","","","","","","#d6a186","#ffc0a0","#ffc0a0","#ffc0a0","#ffc0a0","#d6a186","","","","","",""],["","","","","","","#354c96","#3e59af","#3e59af","#3e59af","#3e59af","#354c96","","","","","",""],["#b88a73","#d6b5a1","#d6b5a1","#d6b5a1","#d6b5a1","#b88a73","","","","","","","#b88a73","#d6b5a1","#d6b5a1","#d6b5a1","#d6b5a1","#b88a73"],["#d6a186","#ffc0a0","#ffc0a0","#ffc0a0","#ffc0a0","#d6a186","","","","","","","#d6a186","#ffc0a0","#ffc0a0","#ffc0a0","#ffc0a0","#d6a186"],["#747c8f","#8a94aa","#8a94aa","#8a94aa","#8a94aa","#747c8f","","","","","","","#747c8f","#8a94aa","#8a94aa","#8a94aa","#8a94aa","#747c8f"],["#9ba3b2","#e8eef8","#b8c2d4","#b8c2d4","#b8c2d4","#9ba3b2","","","","","","","#9ba3b2","#e8eef8","#b8c2d4","#b8c2d4","#b8c2d4","#9ba3b2"],["#9ba3b2","#e8eef8","#b8c2d4","#b8c2d4","#b8c2d4","#9ba3b2","","","","","","","#9ba3b2","#e8eef8","#b8c2d4","#b8c2d4","#b8c2d4","#9ba3b2"],["#4c5462","#596172","#596172","#596172","#596172","#4c5462","","","","","","","#4c5462","#596172","#596172","#596172","#596172","#4c5462"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "genie_lamp",
    name: "a genie's lamp. the genie is on his lunch break.",
    grid: [
        "..X.",
        "XXXX",
        ".XX."
      ],
    color: [["","","","","","","","","","","","","#794c0e","#8d5911","#d6cb86","#d6cb86","#8d5911","#794c0e","","","","","",""],["","","","","","","","","","","","","#8d5911","#a86a14","#fff2a0","#fff2a0","#a86a14","#8d5911","","","","","",""],["","","","","","","","","","","","","#8d5911","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#8d5911","","","","","",""],["","","","","","","","","","","","","#d6b031","#fff2a0","#ffd23a","#ffd23a","#ffd23a","#d6b031","","","","","",""],["","","","","","","","","","","","","#d6b031","#fff2a0","#ffd23a","#ffd23a","#ffd23a","#d6b031","","","","","",""],["","","","","","","","","","","","","#d6b031","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#d6b031","","","","","",""],["#a17fb8","#a15ed6","#8d5911","#8d5911","#8d5911","#8d5911","#8d5911","#8d5911","#8d5911","#8d5911","#8d5911","#d6b031","#ffd23a","#a86a14","#a86a14","#a86a14","#a86a14","#a86a14","#8d5911","#8d5911","#8d5911","#8d5911","#8d5911","#794c0e"],["#d6b031","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#a86a14","#fffbe0","#fffbe0","#fffbe0","#fffbe0","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#a86a14","#a86a14","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#a86a14","#8d5911"],["#8d5911","#ffd23a","#ffd23a","#fff2a0","#fff2a0","#fff2a0","#ffd23a","#fff2a0","#fff2a0","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#a86a14","#a86a14","#a86a14","#a86a14","#ffd23a","#8d5911"],["#8d5911","#a86a14","#a86a14","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ff9090","#e83040","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#a86a14","#a86a14","#a86a14","#a86a14","#ffd23a","#d6b031"],["#8d5911","#a86a14","#a86a14","#a86a14","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#3a8ae8","#ffd23a","#ffd23a","#e83040","#e83040","#ffd23a","#ffd23a","#3a8ae8","#ffd23a","#ffd23a","#a86a14","#a86a14","#a86a14","#ffd23a","#8d5911"],["#794c0e","#8d5911","#8d5911","#8d5911","#8d5911","#d6b031","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#d6b031","#d6b031","#d6b031","#d6b031","#8d5911","#794c0e"],["","","","","","","#8d5911","#a86a14","#a86a14","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#a86a14","#a86a14","#8d5911","","","","","",""],["","","","","","","#8d5911","#a86a14","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#a86a14","#8d5911","","","","","",""],["","","","","","","#8d5911","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#8d5911","","","","","",""],["","","","","","","#d6b031","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#d6b031","","","","","",""],["","","","","","","#c3861b","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#c3861b","","","","","",""],["","","","","","","#a77317","#c3861b","#c3861b","#c3861b","#c3861b","#c3861b","#c3861b","#c3861b","#c3861b","#c3861b","#c3861b","#a77317","","","","","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "knitting_mishap",
    name: "a knitting project that got out of hand (it was meant to be a sock)",
    grid: [
        "XXXX..",
        "...X..",
        "...XXX",
        ".....X"
      ],
    color: [["#b84c7f","#d65994","#d67474","#ca3e43","#d67474","#ca3e43","#d6d6d6","#cfc9bc","#d6d6d6","#cfc9bc","#d6d6d6","#cfc9bc","#66b572","#329440","#66b572","#329440","#66b572","#329440","#d67474","#a1232c","#ca3e43","#d67474","#a1232c","#ad353a","","","","","","","","","","","",""],["#d65994","#ff6ab0","#c02a34","#c02a34","#c02a34","#c02a34","#cfc2a8","#cfc2a8","#cfc2a8","#cfc2a8","#cfc2a8","#cfc2a8","#26843a","#26843a","#26843a","#26843a","#26843a","#26843a","#f04a50","#c02a34","#f04a50","#f04a50","#c02a34","#ca3e43","","","","","","","","","","","",""],["#8d96a5","#a8b2c4","#e8eef8","#e8eef8","#e8eef8","#e8eef8","#f6efe0","#f6efe0","#f6efe0","#f6efe0","#f6efe0","#f6efe0","#3cb04c","#3cb04c","#3cb04c","#3cb04c","#3cb04c","#3cb04c","#ff8a8a","#c02a34","#f04a50","#ff8a8a","#c02a34","#ca3e43","","","","","","","","","","","",""],["#d67474","#f04a50","#e8eef8","#e8eef8","#a8b2c4","#a8b2c4","#ffffff","#f6efe0","#ffffff","#f6efe0","#ffffff","#f6efe0","#7ad888","#3cb04c","#7ad888","#3cb04c","#7ad888","#3cb04c","#f04a50","#c02a34","#f04a50","#f04a50","#c02a34","#ca3e43","","","","","","","","","","","",""],["#d65994","#ff6ab0","#a8b2c4","#a8b2c4","#a8b2c4","#a8b2c4","#cfc2a8","#cfc2a8","#cfc2a8","#cfc2a8","#cfc2a8","#cfc2a8","#26843a","#26843a","#26843a","#26843a","#26843a","#26843a","#ff8a8a","#c02a34","#f04a50","#ff8a8a","#c02a34","#ca3e43","","","","","","","","","","","",""],["#b84c7f","#d65994","#ca3e43","#ca3e43","#ca3e43","#ca3e43","#cfc9bc","#cfc9bc","#cfc9bc","#cfc9bc","#cfc9bc","#cfc9bc","#329440","#329440","#329440","#329440","#329440","#329440","#f04a50","#c02a34","#f04a50","#f04a50","#c02a34","#ca3e43","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","#d6d6d6","#cfc2a8","#f6efe0","#ffffff","#cfc2a8","#cfc9bc","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","#cfc9bc","#cfc2a8","#f6efe0","#f6efe0","#cfc2a8","#cfc9bc","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","#d6d6d6","#cfc2a8","#f6efe0","#ffffff","#cfc2a8","#cfc9bc","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","#cfc9bc","#cfc2a8","#f6efe0","#f6efe0","#cfc2a8","#cfc9bc","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","#d6d6d6","#cfc2a8","#f6efe0","#ffffff","#cfc2a8","#cfc9bc","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","#cfc9bc","#cfc2a8","#f6efe0","#f6efe0","#cfc2a8","#cfc9bc","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","#66b572","#3cb04c","#7ad888","#3cb04c","#7ad888","#3cb04c","#d67474","#ca3e43","#d67474","#ca3e43","#d67474","#ca3e43","#d6d6d6","#cfc9bc","#d6d6d6","#cfc9bc","#d6d6d6","#b1aca1"],["","","","","","","","","","","","","","","","","","","#206f31","#26843a","#26843a","#26843a","#26843a","#26843a","#c02a34","#c02a34","#c02a34","#c02a34","#c02a34","#c02a34","#cfc2a8","#cfc2a8","#cfc2a8","#cfc2a8","#cfc2a8","#aea38d"],["","","","","","","","","","","","","","","","","","","#329440","#3cb04c","#3cb04c","#3cb04c","#3cb04c","#3cb04c","#f04a50","#f04a50","#f04a50","#f04a50","#f04a50","#f04a50","#f6efe0","#f6efe0","#f6efe0","#f6efe0","#f6efe0","#cfc9bc"],["","","","","","","","","","","","","","","","","","","#66b572","#3cb04c","#7ad888","#3cb04c","#7ad888","#3cb04c","#ff8a8a","#f04a50","#ff8a8a","#f04a50","#ff8a8a","#f04a50","#ffffff","#f6efe0","#ffffff","#f6efe0","#ffffff","#cfc9bc"],["","","","","","","","","","","","","","","","","","","#206f31","#26843a","#26843a","#26843a","#26843a","#26843a","#c02a34","#c02a34","#c02a34","#c02a34","#c02a34","#c02a34","#cfc2a8","#cfc2a8","#cfc2a8","#cfc2a8","#cfc2a8","#aea38d"],["","","","","","","","","","","","","","","","","","","#2b7f37","#329440","#329440","#329440","#329440","#329440","#ca3e43","#ca3e43","#ca3e43","#ca3e43","#ca3e43","#ca3e43","#f6efe0","#f6efe0","#f6efe0","#f6efe0","#f6efe0","#cfc9bc"],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","#329440","#5ad06a","#3cb04c","#5ad06a","#3cb04c","#4caf59"],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","#4caf59","#a8f0b0","#a8f0b0","#3cb04c","#5ad06a","#329440"],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","#4caf59","#a8f0b0","#a8f0b0","#5ad06a","#3cb04c","#4caf59"],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","#329440","#5ad06a","#5ad06a","#3cb04c","#5ad06a","#329440"],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","#4caf59","#3cb04c","#5ad06a","#5ad06a","#3cb04c","#4caf59"],["","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","#2b7f37","#4caf59","#329440","#4caf59","#4caf59","#2b7f37"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "model_railway",
    name: "a model railway that only goes in a circle",
    grid: [
        "XXXX",
        "X..X",
        "XXXX"
      ],
    color: [["#377d2f","#4fa541","#4fa541","#4fa541","#4fa541","#3c8a34","#4fa541","#4fa541","#4fa541","#c6cdd5","#dbdbdb","#5b5b6e","#4fa541","#4fa541","#4fa541","#3c8a34","#4fa541","#4fa541","#4fa541","#4fa541","#3c8a34","#4fa541","#4fa541","#48963b"],["#4fa541","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#c8d0de","#3a8ae8","#3a8ae8","#3a8ae8","#3a8ae8","#c8d0de","#2fae6a","#2fae6a","#2fae6a","#2fae6a","#3c8a34"],["#4fa541","#c8d0de","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#e8343c","#9ad8ff","#9ad8ff","#e8343c","#e8343c","#ffd23a","#b07a44","#3a8ae8","#ffe070","#ffe070","#3a8ae8","#8a5a30","#2fae6a","#ffe070","#ffe070","#2fae6a","#4fa541"],["#4fa541","#c8d0de","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#b07a44","#3a8ae8","#3a8ae8","#3a8ae8","#3a8ae8","#8a5a30","#1f8a52","#1f8a52","#1f8a52","#1f8a52","#4fa541"],["#4fa541","#c8d0de","#8a5a30","#b07a44","#c8d0de","#c8d0de","#c8d0de","#a82028","#a82028","#a82028","#a82028","#a82028","#a82028","#c8d0de","#2060b8","#2060b8","#2060b8","#2060b8","#c8d0de","#1f8a52","#1f8a52","#1f8a52","#1f8a52","#4fa541"],["#3c8a34","#c8d0de","#8a5a30","#b07a44","#c8d0de","#46a03c","#4fa541","#4fa541","#4fa541","#4fa541","#3c8a34","#4fa541","#4fa541","#4fa541","#4fa541","#3c8a34","#4fa541","#4fa541","#5cc04c","#c8d0de","#8a5a30","#b07a44","#c8d0de","#4fa541"],["#4fa541","#c8d0de","#8a5a30","#8a5a30","#c8d0de","#4fa541","","","","","","","","","","","","","#3c8a34","#c8d0de","#8a5a30","#8a5a30","#c8d0de","#3c8a34"],["#4fa541","#c8d0de","#b07a44","#b07a44","#c8d0de","#4fa541","","","","","","","","","","","","","#4fa541","#c8d0de","#b07a44","#b07a44","#c8d0de","#4fa541"],["#4fa541","#c8d0de","#8a5a30","#8a5a30","#c8d0de","#4fa541","","","","","","","","","","","","","#4fa541","#c8d0de","#8a5a30","#8a5a30","#c8d0de","#4fa541"],["#4fa541","#c8d0de","#b07a44","#b07a44","#c8d0de","#4fa541","","","","","","","","","","","","","#4fa541","#c8d0de","#b07a44","#b07a44","#c8d0de","#4fa541"],["#3c8a34","#c8d0de","#8a5a30","#8a5a30","#c8d0de","#3c8a34","","","","","","","","","","","","","#4fa541","#c8d0de","#8a5a30","#8a5a30","#c8d0de","#4fa541"],["#4fa541","#c8d0de","#b07a44","#b07a44","#c8d0de","#4fa541","","","","","","","","","","","","","#3c8a34","#c8d0de","#b07a44","#b07a44","#c8d0de","#3c8a34"],["#4fa541","#c8d0de","#8a5a30","#b07a44","#c8d0de","#5cc04c","#3c8a34","#4fa541","#4fa541","#4fa541","#4fa541","#3c8a34","#4fa541","#4fa541","#4fa541","#4fa541","#3c8a34","#4fa541","#5cc04c","#c8d0de","#8a5a30","#b07a44","#c8d0de","#4fa541"],["#4fa541","#c8d0de","#8a5a30","#b07a44","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#8a5a30","#b07a44","#c8d0de","#4fa541"],["#4fa541","#c8d0de","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#c8d0de","#4fa541"],["#3c8a34","#c8d0de","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#8a5a30","#b07a44","#c8d0de","#4fa541"],["#4fa541","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#c8d0de","#3c8a34"],["#48963b","#3c8a34","#4fa541","#246922","#4fa541","#4fa541","#3c8a34","#4fa541","#4fa541","#4fa541","#4fa541","#3c8a34","#4fa541","#4fa541","#4fa541","#4fa541","#3c8a34","#4fa541","#4fa541","#4fa541","#dbdbdb","#cecece","#4fa541","#48963b"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "stubborn_knight",
    name: "a chess knight who refuses to move in an L",
    grid: [
        ".XX",
        "XXX",
        ".XX",
        "XXX"
      ],
    color: [["","","","","","","#735934","#a88a5e","#d3c6a8","#d3c6a8","#a88a5e","#86683c","#c5b086","#c5b086","#713c18","#713c18","#a88a5e","#907651"],["","","","","","","#a88a5e","#c8a470","#fbecc8","#fbecc8","#c8a470","#c8a470","#ead2a0","#ead2a0","#a8642a","#a8642a","#c8a470","#a88a5e"],["","","","","","","#c5b086","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#86481c","#86481c","#c8a470","#a88a5e"],["","","","","","","#c5b086","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#a8642a","#a8642a","#c8a470","#a88a5e"],["","","","","","","#c5b086","#ead2a0","#5a3818","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#86481c","#86481c","#c8a470","#a88a5e"],["","","","","","","#c5b086","#ead2a0","#ead2a0","#5a3818","#5a3818","#5a3818","#ead2a0","#ead2a0","#a8642a","#a8642a","#c8a470","#a88a5e"],["#a89773","#c5b086","#c5b086","#c5b086","#c5b086","#c5b086","#ead2a0","#ead2a0","#ead2a0","#ffffff","#ffffff","#ead2a0","#ead2a0","#ead2a0","#86481c","#86481c","#c8a470","#a88a5e"],["#c5b086","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ffffff","#3a2410","#ead2a0","#ead2a0","#ead2a0","#a8642a","#a8642a","#c8a470","#a88a5e"],["#c5b086","#a07c48","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#86481c","#86481c","#c8a470","#a88a5e"],["#c5b086","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#a8642a","#a8642a","#c8a470","#a88a5e"],["#a88a5e","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#86481c","#86481c","#c8a470","#a88a5e"],["#735934","#86683c","#86683c","#86683c","#86683c","#a88a5e","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#a8642a","#a8642a","#c8a470","#a88a5e"],["","","","","","","#c5b086","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#86481c","#86481c","#c8a470","#c8a470","#a88a5e"],["","","","","","","#c5b086","#c8a470","#fbecc8","#fbecc8","#fbecc8","#fbecc8","#fbecc8","#a8642a","#a8642a","#c8a470","#c8a470","#a88a5e"],["","","","","","","#c5b086","#fbecc8","#fbecc8","#fbecc8","#fbecc8","#fbecc8","#c8a470","#86481c","#86481c","#c8a470","#c8a470","#a88a5e"],["","","","","","","#c5b086","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#a8642a","#a8642a","#c8a470","#c8a470","#a88a5e"],["","","","","","","#c5b086","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#86481c","#86481c","#c8a470","#c8a470","#a88a5e"],["","","","","","","#c5b086","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#a8642a","#a8642a","#c8a470","#c8a470","#a88a5e"],["#b5aa90","#d3c6a8","#d3c6a8","#d3c6a8","#d3c6a8","#d3c6a8","#fbecc8","#fbecc8","#fbecc8","#fbecc8","#fbecc8","#fbecc8","#fbecc8","#fbecc8","#fbecc8","#fbecc8","#fbecc8","#d3c6a8"],["#c5b086","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#ead2a0","#c5b086"],["#86683c","#a07c48","#a07c48","#a07c48","#a07c48","#a07c48","#a07c48","#a07c48","#a07c48","#a07c48","#a07c48","#a07c48","#a07c48","#a07c48","#a07c48","#a07c48","#a07c48","#86683c"],["#a88a5e","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#c8a470","#a88a5e"],["#31813e","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#3a9a4a","#31813e"],["#2a6f35","#31813e","#31813e","#31813e","#31813e","#31813e","#31813e","#31813e","#31813e","#31813e","#31813e","#31813e","#31813e","#31813e","#31813e","#31813e","#31813e","#2a6f35"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "bagpipes",
    name: "a bagpipe. nobody knows which end to hold.",
    grid: [
        "X.X..",
        "XXX..",
        ".XXXX",
        "..X.."
      ],
    color: [["#b8b8b8","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#b8b8b8","","","","","","","#b8b8b8","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#b8b8b8","","","","","","","","","","","",""],["#593118","#9a5a2a","#c47a3a","#d8904a","#a8642a","#66391b","","","","","","","#593118","#9a5a2a","#c47a3a","#d8904a","#a8642a","#66391b","","","","","","","","","","","",""],["#593118","#9a5a2a","#c47a3a","#d8904a","#a8642a","#66391b","","","","","","","#593118","#9a5a2a","#c47a3a","#d8904a","#a8642a","#66391b","","","","","","","","","","","",""],["#cfc9bc","#f6efe0","#f6efe0","#f6efe0","#f6efe0","#cfc9bc","","","","","","","#cfc9bc","#f6efe0","#f6efe0","#f6efe0","#f6efe0","#cfc9bc","","","","","","","","","","","",""],["#593118","#9a5a2a","#c47a3a","#d8904a","#a8642a","#66391b","","","","","","","#593118","#9a5a2a","#c47a3a","#d8904a","#a8642a","#66391b","","","","","","","","","","","",""],["#593118","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#66391b","","","","","","","#593118","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#66391b","","","","","","","","","","","",""],["#941e28","#ffd23a","#b02430","#2a8a42","#b02430","#ffd23a","#941e28","#d6b031","#941e28","#237437","#941e28","#d6b031","#b02430","#ffd23a","#b02430","#2a8a42","#b02430","#d6b031","","","","","","","","","","","",""],["#d6b031","#d8343c","#d8343c","#2a8a42","#ff8a8a","#ff8a8a","#ff8a8a","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#ffd23a","#d8343c","#d8343c","#2a8a42","#d8343c","#b52c32","","","","","","","","","","","",""],["#941e28","#d8343c","#d8343c","#2a8a42","#ff8a8a","#ff8a8a","#ff8a8a","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#b02430","#d8343c","#d8343c","#2a8a42","#d8343c","#b52c32","","","","","","","","","","","",""],["#237437","#2a8a42","#2a8a42","#1e6a32","#2a8a42","#2a8a42","#2a8a42","#2a8a42","#2a8a42","#1e6a32","#2a8a42","#2a8a42","#2a8a42","#2a8a42","#2a8a42","#1e6a32","#2a8a42","#237437","","","","","","","","","","","",""],["#941e28","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#b02430","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#b02430","#d8343c","#d8343c","#2a8a42","#d8343c","#b52c32","","","","","","","","","","","",""],["#b8972a","#b52c32","#b52c32","#237437","#b52c32","#b52c32","#ffd23a","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#ffd23a","#d8343c","#d8343c","#2a8a42","#d8343c","#b52c32","","","","","","","","","","","",""],["","","","","","","#941e28","#ffd23a","#b02430","#2a8a42","#b02430","#ffd23a","#b02430","#ffd23a","#b02430","#2a8a42","#b02430","#ffd23a","#941e28","#d6b031","#941e28","#237437","#941e28","#d6b031","#cfc9bc","#593118","#593118","#593118","#593118","#4c2a14"],["","","","","","","#d6b031","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#ffd23a","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#ffd23a","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#f6efe0","#9a5a2a","#9a5a2a","#9a5a2a","#9a5a2a","#d6d6d6"],["","","","","","","#941e28","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#b02430","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#b02430","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#f6efe0","#c47a3a","#c47a3a","#c47a3a","#c47a3a","#d6d6d6"],["","","","","","","#237437","#2a8a42","#2a8a42","#1e6a32","#2a8a42","#2a8a42","#2a8a42","#2a8a42","#2a8a42","#1e6a32","#2a8a42","#2a8a42","#2a8a42","#2a8a42","#2a8a42","#1e6a32","#2a8a42","#2a8a42","#f6efe0","#d8904a","#d8904a","#d8904a","#d8904a","#d6d6d6"],["","","","","","","#941e28","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#b02430","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#b02430","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#f6efe0","#a8642a","#a8642a","#a8642a","#a8642a","#d6d6d6"],["","","","","","","#b8972a","#b52c32","#b52c32","#237437","#b52c32","#b52c32","#ffd23a","#d8343c","#d8343c","#2a8a42","#d8343c","#d8343c","#d6b031","#b52c32","#b52c32","#237437","#b52c32","#b52c32","#cfc9bc","#66391b","#66391b","#66391b","#66391b","#583117"],["","","","","","","","","","","","","#cfc9bc","#f6efe0","#f6efe0","#f6efe0","#f6efe0","#cfc9bc","","","","","","","","","","","",""],["","","","","","","","","","","","","#593118","#9a5a2a","#4a2a14","#4a2a14","#a8642a","#66391b","","","","","","","","","","","",""],["","","","","","","","","","","","","#593118","#9a5a2a","#c47a3a","#d8904a","#a8642a","#66391b","","","","","","","","","","","",""],["","","","","","","","","","","","","#593118","#9a5a2a","#4a2a14","#4a2a14","#a8642a","#66391b","","","","","","","","","","","",""],["","","","","","","","","","","","","#593118","#9a5a2a","#c47a3a","#d8904a","#a8642a","#66391b","","","","","","","","","","","",""],["","","","","","","","","","","","","#b1aca1","#cfc9bc","#cfc9bc","#cfc9bc","#cfc9bc","#b1aca1","","","","","","","","","","","",""]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "hot_air_balloon",
    name: "a hot air balloon, powered entirely by hot air",
    grid: [
        "XXX",
        "XXX",
        "XXX",
        ".X."
      ],
    color: [["#a7252b","#c32c32","#c32c32","#c32c32","#c32c32","#d6b031","#3174c3","#3174c3","#d6b031","#d6b031","#c32c32","#c32c32","#d6b031","#3174c3","#3174c3","#3174c3","#3174c3","#2a63a7"],["#c32c32","#e8343c","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#ffd23a","#ffd23a","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#e8343c","#ffe489","#ffe489","#89b9f1","#3a8ae8","#ffd23a","#ffd23a","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#ffe489","#ffe489","#ffe489","#89b9f1","#89b9f1","#ffd23a","#ffd23a","#e8343c","#e8343c","#ffd23a","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#ffe489","#ffe489","#ffe489","#89b9f1","#89b9f1","#ffd23a","#ffd23a","#e8343c","#e8343c","#ffd23a","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#ffe489","#ffe489","#89b9f1","#89b9f1","#89b9f1","#ffd23a","#ffd23a","#e8343c","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#ffd23a","#ffe489","#89b9f1","#89b9f1","#3a8ae8","#ffd23a","#ffd23a","#e8343c","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3a8ae8","#ffd23a","#ffd23a","#e8343c","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3a8ae8","#ffd23a","#ffd23a","#e8343c","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3a8ae8","#ffd23a","#ffd23a","#e8343c","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3a8ae8","#ffd23a","#ffd23a","#e8343c","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3a8ae8","#ffd23a","#ffd23a","#e8343c","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3a8ae8","#ffd23a","#ffd23a","#e8343c","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#ffd23a","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#ffd23a","#ffd23a","#e8343c","#e8343c","#ffd23a","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#ffd23a","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#ffd23a","#ffd23a","#e8343c","#e8343c","#ffd23a","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3174c3"],["#c32c32","#e8343c","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#ffd23a","#ffd23a","#e8343c","#e8343c","#ffd23a","#ffd23a","#3a8ae8","#3a8ae8","#3a8ae8","#3174c3"],["#9b1b22","#b82028","#b82028","#b82028","#b82028","#b82028","#b82028","#ffe070","#ffe070","#ffe070","#ffe070","#b82028","#b82028","#b82028","#b82028","#b82028","#b82028","#9b1b22"],["#84171d","#9b1b22","#9b1b22","#9b1b22","#d66623","#d66623","#ff7a2a","#ff7a2a","#ff7a2a","#ff7a2a","#ff7a2a","#ff7a2a","#d66623","#d66623","#9b1b22","#9b1b22","#9b1b22","#84171d"],["","","","","","","#a8865e","#f4d8b0","#5a3a20","#5a3a20","#ffc0a0","#a8865e","","","","","",""],["","","","","","","#a8865e","#f4d8b0","#ffc0a0","#ffc0a0","#f4d8b0","#a8865e","","","","","",""],["","","","","","","#713c18","#86481c","#86481c","#86481c","#86481c","#713c18","","","","","",""],["","","","","","","#a86d34","#a8642a","#c8823e","#a8642a","#c8823e","#8d5423","","","","","",""],["","","","","","","#8d5423","#c8823e","#a8642a","#c8823e","#a8642a","#a86d34","","","","","",""],["","","","","","","#905e2d","#8d5423","#a86d34","#8d5423","#a86d34","#79481e","","","","","",""]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "big_spade",
    name: "a garden trowel's big brother. he's been working out.",
    grid: [
        "XXX",
        ".X.",
        ".X.",
        ".X.",
        "XXX",
        ".X."
      ],
    color: [["#ad8456","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ca9b65","#ad8456"],["#ca9b65","#f0b878","#f0b878","#f0b878","#f0b878","#f0b878","#f0b878","#f0b878","#f0b878","#f0b878","#f0b878","#f0b878","#f0b878","#f0b878","#f0b878","#f0b878","#f0b878","#ca9b65"],["#af743c","#d08a48","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#ff6a6a","#d08a48","#af743c"],["#af743c","#d08a48","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#e8343c","#d08a48","#af743c"],["#8d5428","#a86430","#a86430","#a86430","#a86430","#a86430","#a86430","#a86430","#a86430","#a86430","#a86430","#a86430","#a86430","#a86430","#a86430","#a86430","#a86430","#8d5428"],["#794823","#8d5428","#8d5428","#8d5428","#8d5428","#8d5428","#a86430","#a86430","#a86430","#a86430","#a86430","#a86430","#8d5428","#8d5428","#8d5428","#8d5428","#8d5428","#794823"],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#d6d6d6","#ffffff","#ffffff","#ffffff","#ffffff","#d6d6d6","","","","","",""],["","","","","","","#3174c3","#3a8ae8","#3a8ae8","#3a8ae8","#3a8ae8","#3174c3","","","","","",""],["","","","","","","#d6d6d6","#ffffff","#ffffff","#ffffff","#ffffff","#d6d6d6","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["","","","","","","#8d5428","#d08a48","#f0b878","#f0b878","#d08a48","#8d5428","","","","","",""],["#abaeb4","#c8cbd2","#c8cbd2","#c8cbd2","#9ba3b2","#9ba3b2","#6a7488","#6a7488","#6a7488","#6a7488","#6a7488","#6a7488","#9ba3b2","#747c8f","#747c8f","#747c8f","#747c8f","#636b7a"],["#c8cbd2","#eef2fa","#eef2fa","#eef2fa","#b8c2d4","#b8c2d4","#6a7488","#6a7488","#6a7488","#6a7488","#6a7488","#6a7488","#b8c2d4","#8a94aa","#8a94aa","#8a94aa","#8a94aa","#747c8f"],["#c8cbd2","#eef2fa","#eef2fa","#eef2fa","#ffffff","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#8a94aa","#8a94aa","#8a94aa","#8a94aa","#747c8f"],["#c8cbd2","#eef2fa","#eef2fa","#eef2fa","#ffffff","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#8a94aa","#8a94aa","#8a94aa","#8a94aa","#747c8f"],["#c8cbd2","#eef2fa","#eef2fa","#eef2fa","#ffffff","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#8a94aa","#8a94aa","#8a94aa","#8a94aa","#747c8f"],["#abaeb4","#c8cbd2","#c8cbd2","#c8cbd2","#d6d6d6","#9ba3b2","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#b8c2d4","#9ba3b2","#747c8f","#747c8f","#747c8f","#747c8f","#636b7a"],["","","","","","","#9ba3b2","#b8c2d4","#3a2010","#ff9ab8","#b8c2d4","#9ba3b2","","","","","",""],["","","","","","","#9ba3b2","#b8c2d4","#ff9ab8","#ff9ab8","#b8c2d4","#9ba3b2","","","","","",""],["","","","","","","#744c28","#8a5a30","#ff9ab8","#ff9ab8","#8a5a30","#744c28","","","","","",""],["","","","","","","#744c28","#6a4220","#ff9ab8","#ff9ab8","#8a5a30","#744c28","","","","","",""],["","","","","","","#744c28","#8a5a30","#8a5a30","#8a5a30","#6a4220","#744c28","","","","","",""],["","","","","","","#634123","#744c28","#744c28","#744c28","#744c28","#634123","","","","","",""]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "very_long_cat",
    name: "a very long cat (it just keeps going)",
    grid: [
        "X.X........X",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXX.",
        ".X.X....X.X."
      ],
    color: [["#af6f2b","#cc8132","#cc8132","#af6f2b","","","","","#af6f2b","#cc8132","#cc8132","#af6f2b","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","#b6a484","#d5c09b","#d5c09b","#b6a484"],["#cc8132","#f4a3ab","#f39a3c","#cc8132","","","","","#cc8132","#f39a3c","#f4a3ab","#cc8132","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","#cc8132","#f39a3c","#f39a3c","#cc8132"],["#cc8132","#f4a3ab","#f4a3ab","#cc8132","","","","","#cc8132","#f4a3ab","#f4a3ab","#cc8132","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","#a95719","#c9681e","#c9681e","#a95719"],["#cc8132","#f4a3ab","#f4a3ab","#cc8132","","","","","#cc8132","#f4a3ab","#f4a3ab","#cc8132","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","#cc8132","#f39a3c","#f39a3c","#cc8132"],["#cc8132","#f39a3c","#f39a3c","#f39a3c","#cc8132","#a95719","#a95719","#cc8132","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#cc8132","#cc8132","#cc8132","#a95719","#a95719","#cc8132","#cc8132","#cc8132","#a95719","#a95719","#cc8132","#cc8132","#cc8132","#a95719","#a95719","#cc8132","#cc8132","#cc8132","#a95719","#a95719","#cc8132","#cc8132","#cc8132","#a95719","#a95719","#cc8132","#cc8132","#cc8132","#a95719","#a95719","#cc8132","#cc8132","#f39a3c","#f39a3c","#f39a3c","#cc8132"],["#cc8132","#f39a3c","#f39a3c","#f39a3c","#c9681e","#f39a3c","#f39a3c","#c9681e","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#c9681e","#c9681e","#c9681e","#a95719"],["#cc8132","#f39a3c","#7cc242","#1d1408","#f39a3c","#f39a3c","#f39a3c","#1d1408","#7cc242","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#cc8132"],["#cc8132","#f39a3c","#7cc242","#1d1408","#f39a3c","#f39a3c","#f39a3c","#1d1408","#7cc242","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#c9681e","#f39a3c","#f39a3c","#cc8132","#cc8132","#cc8132","#af6f2b"],["#cc8132","#ffffff","#fde4b8","#fde4b8","#fde4b8","#f4a3ab","#f4a3ab","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#c9681e","#f39a3c","#f39a3c","#f39a3c","#c9681e","#f39a3c","#f39a3c","#cc8132","","","",""],["#cc8132","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#8a4a2a","#8a4a2a","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#f39a3c","#cc8132","","","",""],["#cc8132","#ffffff","#fde4b8","#fde4b8","#8a4a2a","#fde4b8","#fde4b8","#8a4a2a","#fde4b8","#fde4b8","#fde4b8","#f39a3c","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#d5c09b","","","",""],["#af6f2b","#d5c09b","#d5c09b","#d5c09b","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#d5c09b","#d5c09b","#d5c09b","#cc8132","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#fde4b8","#fde4b8","#fde4b8","#fde4b8","#d5c09b","#d5c09b","#d5c09b","#d5c09b","#fde4b8","#fde4b8","#fde4b8","#d5c09b","","","",""],["","","","","#cc8132","#f39a3c","#f39a3c","#cc8132","","","","","#a95719","#f39a3c","#f39a3c","#cc8132","","","","","","","","","","","","","","","","","#cc8132","#f39a3c","#f39a3c","#cc8132","","","","","#a95719","#f39a3c","#f39a3c","#cc8132","","","",""],["","","","","#cc8132","#f39a3c","#f39a3c","#cc8132","","","","","#cc8132","#f39a3c","#f39a3c","#cc8132","","","","","","","","","","","","","","","","","#cc8132","#f39a3c","#f39a3c","#cc8132","","","","","#cc8132","#f39a3c","#f39a3c","#cc8132","","","",""],["","","","","#d5c09b","#fde4b8","#fde4b8","#d5c09b","","","","","#d5c09b","#fde4b8","#fde4b8","#d5c09b","","","","","","","","","","","","","","","","","#d5c09b","#fde4b8","#fde4b8","#d5c09b","","","","","#d5c09b","#fde4b8","#fde4b8","#d5c09b","","","",""],["","","","","#b6a484","#c4a981","#c4a981","#b6a484","","","","","#b6a484","#c4a981","#c4a981","#b6a484","","","","","","","","","","","","","","","","","#b6a484","#c4a981","#c4a981","#b6a484","","","","","#b6a484","#c4a981","#c4a981","#b6a484","","","",""]],
    difficulty: 4,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "moose_head_on",
    name: "a moose, head-on, antlers first",
    grid: [
        "X.X..X.X",
        "XXX..XXX",
        ".XXXXXX.",
        "..XXXX..",
        "...XX...",
        "...XX..."
      ],
    color: [["#a69873","#c1b186","#c1b186","#a69873","","","","","#a69873","#c1b186","#c1b186","#a69873","","","","","","","","","#a69873","#c1b186","#c1b186","#a69873","","","","","#a69873","#c1b186","#c1b186","#a69873"],["#c1b186","#fff3cc","#e6d3a0","#c1b186","","","","","#c1b186","#fff3cc","#e6d3a0","#c1b186","","","","","","","","","#c1b186","#e6d3a0","#fff3cc","#c1b186","","","","","#c1b186","#e6d3a0","#fff3cc","#c1b186"],["#c1b186","#fff3cc","#e6d3a0","#c1b186","","","","","#c1b186","#fff3cc","#e6d3a0","#c1b186","","","","","","","","","#c1b186","#e6d3a0","#fff3cc","#c1b186","","","","","#c1b186","#e6d3a0","#fff3cc","#c1b186"],["#c1b186","#e6d3a0","#e6d3a0","#c1b186","","","","","#c1b186","#e6d3a0","#e6d3a0","#c1b186","","","","","","","","","#c1b186","#e6d3a0","#e6d3a0","#c1b186","","","","","#c1b186","#e6d3a0","#e6d3a0","#c1b186"],["#c1b186","#e6d3a0","#e6d3a0","#b39a62","#968152","#c1b186","#c1b186","#c1b186","#e6d3a0","#e6d3a0","#e6d3a0","#c1b186","","","","","","","","","#c1b186","#e6d3a0","#e6d3a0","#e6d3a0","#c1b186","#c1b186","#c1b186","#968152","#b39a62","#e6d3a0","#e6d3a0","#c1b186"],["#c1b186","#e6d3a0","#e6d3a0","#b39a62","#b39a62","#e6d3a0","#e6d3a0","#e6d3a0","#e6d3a0","#e6d3a0","#e6d3a0","#c1b186","","","","","","","","","#c1b186","#e6d3a0","#e6d3a0","#e6d3a0","#e6d3a0","#e6d3a0","#e6d3a0","#b39a62","#b39a62","#e6d3a0","#e6d3a0","#c1b186"],["#c1b186","#e6d3a0","#e6d3a0","#b39a62","#b39a62","#e6d3a0","#e6d3a0","#e6d3a0","#e6d3a0","#e6d3a0","#e6d3a0","#c1b186","","","","","","","","","#c1b186","#e6d3a0","#e6d3a0","#e6d3a0","#e6d3a0","#e6d3a0","#e6d3a0","#b39a62","#b39a62","#e6d3a0","#e6d3a0","#c1b186"],["#816f47","#968152","#968152","#968152","#b39a62","#b39a62","#b39a62","#b39a62","#b39a62","#b39a62","#b39a62","#968152","","","","","","","","","#968152","#b39a62","#b39a62","#b39a62","#b39a62","#b39a62","#b39a62","#b39a62","#968152","#968152","#968152","#816f47"],["","","","","#5c3c22","#6e4728","#6e4728","#6e4728","#4a2d17","#b39a62","#b39a62","#4a2d17","#3e2613","#3e2613","#3e2613","#3e2613","#3e2613","#3e2613","#3e2613","#3e2613","#4a2d17","#b39a62","#b39a62","#4a2d17","#6e4728","#6e4728","#6e4728","#5c3c22","","","",""],["","","","","#5c3c22","#c38d63","#c38d63","#6e4728","#6e4728","#b39a62","#b39a62","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#b39a62","#b39a62","#6e4728","#6e4728","#c38d63","#c38d63","#5c3c22","","","",""],["","","","","#5c3c22","#c38d63","#c38d63","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#c38d63","#c38d63","#5c3c22","","","",""],["","","","","#4f331d","#5c3c22","#5c3c22","#5c3c22","#6e4728","#6e4728","#4a2d17","#4a2d17","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#4a2d17","#4a2d17","#6e4728","#6e4728","#5c3c22","#5c3c22","#5c3c22","#4f331d","","","",""],["","","","","","","","","#5c3c22","#6e4728","#fffbe8","#1a0e06","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#fffbe8","#1a0e06","#6e4728","#5c3c22","","","","","","","",""],["","","","","","","","","#5c3c22","#6e4728","#fffbe8","#1a0e06","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#6e4728","#fffbe8","#1a0e06","#6e4728","#5c3c22","","","","","","","",""],["","","","","","","","","#5c3c22","#6e4728","#6e4728","#6e4728","#6e4728","#94643c","#94643c","#94643c","#94643c","#94643c","#94643c","#6e4728","#6e4728","#6e4728","#6e4728","#5c3c22","","","","","","","",""],["","","","","","","","","#352011","#5c3c22","#5c3c22","#5c3c22","#6e4728","#94643c","#94643c","#94643c","#94643c","#94643c","#94643c","#6e4728","#5c3c22","#5c3c22","#5c3c22","#352011","","","","","","","",""],["","","","","","","","","","","","","#785338","#8f6343","#8f6343","#8f6343","#8f6343","#8f6343","#8f6343","#785338","","","","","","","","","","","",""],["","","","","","","","","","","","","#785338","#a6774f","#c29469","#c29469","#a6774f","#a6774f","#a6774f","#785338","","","","","","","","","","","",""],["","","","","","","","","","","","","#785338","#a6774f","#a6774f","#a6774f","#a6774f","#a6774f","#a6774f","#785338","","","","","","","","","","","",""],["","","","","","","","","","","","","#785338","#a6774f","#a6774f","#a6774f","#a6774f","#a6774f","#a6774f","#785338","","","","","","","","","","","",""],["","","","","","","","","","","","","#785338","#2c1a0c","#2c1a0c","#a6774f","#a6774f","#2c1a0c","#2c1a0c","#785338","","","","","","","","","","","",""],["","","","","","","","","","","","","#785338","#2c1a0c","#2c1a0c","#a6774f","#a6774f","#2c1a0c","#2c1a0c","#785338","","","","","","","","","","","",""],["","","","","","","","","","","","","#785338","#a6774f","#a6774f","#a6774f","#a6774f","#a6774f","#a6774f","#785338","","","","","","","","","","","",""],["","","","","","","","","","","","","#674730","#785338","#4c311b","#4c311b","#4c311b","#4c311b","#785338","#674730","","","","","","","","","","","",""]],
    difficulty: 4,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "unasked_bouquet",
    name: "a bouquet nobody asked for",
    grid: [
        "X..X..X",
        "XXX.XXX",
        ".XXXXX.",
        "..XXX..",
        "..XXX..",
        "...X..."
      ],
    color: [["#a71d2b","#c32232","#c32232","#a71d2b","","","","","","","","","#b8961e","#d6b023","#d6b023","#b8961e","","","","","","","","","#5e2b81","#883fbc","#883fbc","#5e2b81"],["#c32232","#a5101f","#a5101f","#c32232","","","","","","","","","#d6b023","#7a4a12","#7a4a12","#d6b023","","","","","","","","","#883fbc","#f2d8ff","#f2d8ff","#883fbc"],["#c32232","#a5101f","#a5101f","#c32232","","","","","","","","","#d6b023","#7a4a12","#7a4a12","#d6b023","","","","","","","","","#883fbc","#f2d8ff","#f2d8ff","#883fbc"],["#c32232","#e8283c","#e8283c","#c32232","","","","","","","","","#b8961e","#d6b023","#d6b023","#b8961e","","","","","","","","","#883fbc","#a24be0","#a24be0","#883fbc"],["#429231","#ba2030","#ba2030","#4fae3a","#429231","#ababab","#ababab","#429231","#429231","#d67423","#d67423","#b8631e","","","","","#397d2a","#ab557b","#d66a9b","#d66a9b","#d66a9b","#ab557b","#429231","#429231","#4fae3a","#823cb3","#823cb3","#429231"],["#429231","#2f7d24","#4fae3a","#4fae3a","#ffffff","#ffffff","#ffffff","#ffffff","#2f7d24","#ff8a2a","#ffd9a8","#d67423","","","","","#429231","#ff7eb8","#ff7eb8","#c2185b","#ff7eb8","#ff7eb8","#2f7d24","#4fae3a","#4fae3a","#4fae3a","#4fae3a","#429231"],["#429231","#4fae3a","#4fae3a","#4fae3a","#ffffff","#ffc21a","#ffc21a","#ffffff","#4fae3a","#cc6e22","#ff8a2a","#ab5c1d","","","","","#429231","#ff7eb8","#ff7eb8","#c2185b","#ff7eb8","#ff7eb8","#ba2030","#e8283c","#e8283c","#ba2030","#4fae3a","#429231"],["#225a1a","#429231","#429231","#429231","#ffffff","#ffffff","#ffffff","#ffffff","#4fae3a","#4fae3a","#4fae3a","#429231","","","","","#429231","#cc6593","#ff7eb8","#ff7eb8","#ff7eb8","#cc6593","#e8283c","#a5101f","#8b0d1a","#c32232","#429231","#397d2a"],["","","","","#429231","#cccccc","#cccccc","#4fae3a","#cca722","#cca722","#2f7d24","#4fae3a","#429231","#3e89d6","#3e89d6","#3e89d6","#4fae3a","#2f7d24","#4fae3a","#cc6593","#4fae3a","#4fae3a","#e8283c","#c32232","","","",""],["","","","","#429231","#4fae3a","#2f7d24","#cca722","#ffd12a","#ffd12a","#cca722","#4fae3a","#3b82cc","#4aa3ff","#ffffff","#4aa3ff","#3b82cc","#4fae3a","#4fae3a","#ffffff","#ffffff","#4fae3a","#4fae3a","#c32232","","","",""],["","","","","#429231","#4fae3a","#4fae3a","#cca722","#ffd12a","#ffd12a","#cca722","#4fae3a","#4fae3a","#4aa3ff","#4aa3ff","#4aa3ff","#2f7d24","#4fae3a","#cccccc","#ffc21a","#ffc21a","#cccccc","#4fae3a","#27691e","","","",""],["","","","","#b18f9c","#ba7c94","#429231","#429231","#f6c7d8","#f6c7d8","#4fae3a","#4fae3a","#f6c7d8","#f6c7d8","#3b82cc","#4fae3a","#f6c7d8","#de94b0","#4fae3a","#ffffff","#cfa7b5","#cfa7b5","#429231","#397d2a","","","",""],["","","","","","","","","#cfa7b5","#f6c7d8","#fff0f5","#fff0f5","#de94b0","#f6c7d8","#f6c7d8","#f6c7d8","#f6c7d8","#f6c7d8","#de94b0","#cfa7b5","","","","","","","",""],["","","","","","","","","#cfa7b5","#f6c7d8","#fff0f5","#fff0f5","#de94b0","#f6c7d8","#f6c7d8","#f6c7d8","#f6c7d8","#f6c7d8","#de94b0","#cfa7b5","","","","","","","",""],["","","","","","","","","#cfa7b5","#f6c7d8","#fff0f5","#d81b3c","#f6c7d8","#de94b0","#f6c7d8","#f6c7d8","#d81b3c","#f6c7d8","#f6c7d8","#ba7c94","","","","","","","",""],["","","","","","","","","#cfa7b5","#f6c7d8","#d81b3c","#fff0f5","#d81b3c","#d81b3c","#d81b3c","#d81b3c","#f6c7d8","#d81b3c","#f6c7d8","#ba7c94","","","","","","","",""],["","","","","","","","","#b51732","#d81b3c","#d81b3c","#d81b3c","#d81b3c","#d81b3c","#d81b3c","#d81b3c","#d81b3c","#d81b3c","#d81b3c","#b51732","","","","","","","",""],["","","","","","","","","#ba7c94","#f6c7d8","#fff0f5","#fff0f5","#9a0f28","#f6c7d8","#de94b0","#9a0f28","#f6c7d8","#f6c7d8","#f6c7d8","#cfa7b5","","","","","","","",""],["","","","","","","","","#cfa7b5","#de94b0","#f6c7d8","#9a0f28","#f6c7d8","#f6c7d8","#f6c7d8","#de94b0","#9a0f28","#f6c7d8","#f6c7d8","#cfa7b5","","","","","","","",""],["","","","","","","","","#b18f9c","#ba7c94","#cfa7b5","#cfa7b5","#9a0f28","#f6c7d8","#f6c7d8","#9a0f28","#cfa7b5","#cfa7b5","#cfa7b5","#b18f9c","","","","","","","",""],["","","","","","","","","","","","","#cfa7b5","#f6c7d8","#f6c7d8","#cfa7b5","","","","","","","","","","","",""],["","","","","","","","","","","","","#cfa7b5","#3d8a2c","#3d8a2c","#cfa7b5","","","","","","","","","","","",""],["","","","","","","","","","","","","#cfa7b5","#3d8a2c","#3d8a2c","#cfa7b5","","","","","","","","","","","",""],["","","","","","","","","","","","","#b18f9c","#337425","#337425","#b18f9c","","","","","","","","","","","",""]],
    difficulty: 4,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "crisps_mostly_air",
    name: "a family-size bag of crisps (mostly air)",
    grid: [
        "X.X.X",
        "XXXXX",
        "XXXXX",
        "XXXXX",
        "XXXXX",
        "X.X.X"
      ],
    color: [["#b29941","#a98119","#cfb34c","#916f16","","","","","#b29941","#a98119","#cfb34c","#916f16","","","","","#b29941","#a98119","#cfb34c","#916f16"],["#cfb34c","#c99a1e","#f7d55a","#a98119","","","","","#cfb34c","#c99a1e","#f7d55a","#a98119","","","","","#cfb34c","#c99a1e","#f7d55a","#a98119"],["#cfb34c","#c99a1e","#f7d55a","#a98119","","","","","#cfb34c","#c99a1e","#f7d55a","#a98119","","","","","#cfb34c","#c99a1e","#f7d55a","#a98119"],["#cfb34c","#c99a1e","#f7d55a","#a98119","","","","","#cfb34c","#c99a1e","#f7d55a","#a98119","","","","","#cfb34c","#c99a1e","#f7d55a","#a98119"],["#b68616","#d9a01a","#d9a01a","#d9a01a","#b68616","#b68616","#b68616","#b68616","#d9a01a","#d9a01a","#d9a01a","#d9a01a","#b68616","#b68616","#b68616","#b68616","#d9a01a","#d9a01a","#d9a01a","#b68616"],["#d6ae27","#ffcf2e","#ffcf2e","#fff4a6","#fff4a6","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#d9a01a","#d9a01a","#b68616"],["#d6ae27","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#ff6a50","#b68616"],["#d6ae27","#e2342c","#e2342c","#e2342c","#e2342c","#ffffff","#e2342c","#e2342c","#ffffff","#ffffff","#ffffff","#e2342c","#ffffff","#ffffff","#e2342c","#e2342c","#e2342c","#e2342c","#e2342c","#b68616"],["#d6ae27","#e2342c","#e2342c","#e2342c","#ffffff","#e2342c","#ffffff","#e2342c","#e2342c","#ffffff","#e2342c","#e2342c","#ffffff","#e2342c","#ffffff","#e2342c","#e2342c","#e2342c","#e2342c","#b68616"],["#d6ae27","#e2342c","#e2342c","#e2342c","#ffffff","#ffffff","#ffffff","#e2342c","#e2342c","#ffffff","#e2342c","#e2342c","#ffffff","#ffffff","#e2342c","#e2342c","#e2342c","#e2342c","#e2342c","#b68616"],["#d6ae27","#e2342c","#e2342c","#e2342c","#ffffff","#e2342c","#ffffff","#e2342c","#e2342c","#ffffff","#e2342c","#e2342c","#ffffff","#e2342c","#ffffff","#e2342c","#e2342c","#e2342c","#e2342c","#b68616"],["#d6ae27","#e2342c","#e2342c","#e2342c","#ffffff","#e2342c","#ffffff","#e2342c","#ffffff","#ffffff","#ffffff","#e2342c","#ffffff","#e2342c","#ffffff","#e2342c","#e2342c","#e2342c","#e2342c","#b68616"],["#d6ae27","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#a81f1a","#b68616"],["#d6ae27","#ffcf2e","#ffcf2e","#fff4a6","#fff4a6","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#d9a01a","#d9a01a","#b68616"],["#d6ae27","#ffcf2e","#ffcf2e","#fff4a6","#fff4a6","#ffcf2e","#ffcf2e","#ffcf2e","#c9741a","#c9741a","#c9741a","#c9741a","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#d9a01a","#d9a01a","#b68616"],["#d6ae27","#ffcf2e","#ffcf2e","#fff4a6","#fff4a6","#ffcf2e","#ffcf2e","#c9741a","#ffb84a","#ffb84a","#c9741a","#ffb84a","#c9741a","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#d9a01a","#d9a01a","#b68616"],["#d6ae27","#ffcf2e","#ffcf2e","#fff4a6","#fff4a6","#ffcf2e","#c9741a","#ffb84a","#ffb84a","#c9741a","#ffb84a","#ffb84a","#c9741a","#c9741a","#ffcf2e","#ffcf2e","#ffcf2e","#d9a01a","#d9a01a","#b68616"],["#d6ae27","#ffcf2e","#ffcf2e","#fff4a6","#fff4a6","#ffcf2e","#ffcf2e","#c9741a","#ffb84a","#c9741a","#ffb84a","#ffb84a","#c9741a","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#d9a01a","#d9a01a","#b68616"],["#d6ae27","#ffcf2e","#ffcf2e","#fff4a6","#fff4a6","#ffcf2e","#ffcf2e","#ffcf2e","#c9741a","#c9741a","#c9741a","#c9741a","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#ffcf2e","#d9a01a","#d9a01a","#b68616"],["#b68616","#d9a01a","#d9a01a","#d9a01a","#b68616","#b68616","#b68616","#b68616","#d9a01a","#d9a01a","#d9a01a","#d9a01a","#b68616","#b68616","#b68616","#b68616","#d9a01a","#d9a01a","#d9a01a","#b68616"],["#cfb34c","#c99a1e","#f7d55a","#a98119","","","","","#cfb34c","#c99a1e","#f7d55a","#a98119","","","","","#cfb34c","#c99a1e","#f7d55a","#a98119"],["#cfb34c","#c99a1e","#f7d55a","#a98119","","","","","#cfb34c","#c99a1e","#f7d55a","#a98119","","","","","#cfb34c","#c99a1e","#f7d55a","#a98119"],["#cfb34c","#c99a1e","#f7d55a","#a98119","","","","","#cfb34c","#c99a1e","#f7d55a","#a98119","","","","","#cfb34c","#c99a1e","#f7d55a","#a98119"],["#b29941","#a98119","#cfb34c","#916f16","","","","","#b29941","#a98119","#cfb34c","#916f16","","","","","#b29941","#a98119","#cfb34c","#916f16"]],
    difficulty: 4,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "novelty_cheque",
    name: "a giant novelty cheque for £3",
    grid: [
        "XXXXXXXX",
        "XXXXXXXX",
        "XXXXXXXX",
        ".X....X.",
        ".X....X."
      ],
    color: [["#22509a","#275db4","#83a5d6","#275db4","#275db4","#275db4","#83a5d6","#275db4","#275db4","#275db4","#83a5d6","#275db4","#275db4","#275db4","#83a5d6","#275db4","#275db4","#275db4","#83a5d6","#275db4","#275db4","#275db4","#83a5d6","#275db4","#275db4","#275db4","#83a5d6","#275db4","#275db4","#275db4","#83a5d6","#22509a"],["#1a428d","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1f4fa8","#1a428d"],["#d3cfc0","#fbf6e4","#fbf6e4","#fbf6e4","#ecf0d6","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#ecf0d6","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#9cc98a","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#d3cfc0"],["#d3cfc0","#fbf6e4","#c4c4c4","#c4c4c4","#c4c4c4","#c4c4c4","#c4c4c4","#fbf6e4","#fbf6e4","#ecf0d6","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#9cc98a","#e3f3da","#e3f3da","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#e3f3da","#e3f3da","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#e3f3da","#e3f3da","#d3cfc0"],["#d3cfc0","#fbf6e4","#ecf0d6","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#ecf0d6","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#ecf0d6","#9cc98a","#e3f3da","#0d5c1e","#0d5c1e","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#0d5c1e","#0d5c1e","#e3f3da","#d3cfc0"],["#d3cfc0","#ecf0d6","#9a9a9a","#9a9a9a","#9a9a9a","#9a9a9a","#9a9a9a","#9a9a9a","#9a9a9a","#9a9a9a","#9a9a9a","#9a9a9a","#9a9a9a","#ecf0d6","#fbf6e4","#9cc98a","#e3f3da","#0d5c1e","#0d5c1e","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#0d5c1e","#0d5c1e","#e3f3da","#c6cab4"],["#c6cab4","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#ecf0d6","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#ecf0d6","#fbf6e4","#fbf6e4","#9cc98a","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#0d5c1e","#0d5c1e","#0d5c1e","#e3f3da","#e3f3da","#d3cfc0"],["#d3cfc0","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#ecf0d6","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#ecf0d6","#fbf6e4","#fbf6e4","#fbf6e4","#9cc98a","#e3f3da","#0d5c1e","#0d5c1e","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#0d5c1e","#0d5c1e","#e3f3da","#d3cfc0"],["#d3cfc0","#fbf6e4","#fbf6e4","#1f4fa8","#ecf0d6","#fbf6e4","#1f4fa8","#fbf6e4","#1f4fa8","#fbf6e4","#ecf0d6","#fbf6e4","#fbf6e4","#fbf6e4","#fbf6e4","#9cc98a","#e3f3da","#0d5c1e","#0d5c1e","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#0d5c1e","#0d5c1e","#e3f3da","#d3cfc0"],["#d3cfc0","#fbf6e4","#1f4fa8","#ecf0d6","#1f4fa8","#fbf6e4","#fbf6e4","#1f4fa8","#fbf6e4","#1f4fa8","#fbf6e4","#1f4fa8","#1f4fa8","#fbf6e4","#fbf6e4","#9cc98a","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#0d5c1e","#0d5c1e","#e3f3da","#d3cfc0"],["#d3cfc0","#fbf6e4","#ecf0d6","#fbf6e4","#fbf6e4","#1f4fa8","#fbf6e4","#fbf6e4","#ecf0d6","#fbf6e4","#1f4fa8","#fbf6e4","#fbf6e4","#fbf6e4","#ecf0d6","#9cc98a","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#e3f3da","#e3f3da","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#0d5c1e","#e3f3da","#e3f3da","#d3cfc0"],["#b5b1a4","#c6cab4","#d3cfc0","#d3cfc0","#fbf6e4","#fbf6e4","#fbf6e4","#ecf0d6","#d3cfc0","#d3cfc0","#d3cfc0","#d3cfc0","#d3cfc0","#c6cab4","#d3cfc0","#83a974","#bfccb7","#bfccb7","#bfccb7","#bfccb7","#bfccb7","#bfccb7","#bfccb7","#bfccb7","#e3f3da","#e3f3da","#e3f3da","#e3f3da","#bfccb7","#bfccb7","#bfccb7","#aaad9a"],["","","","","#976637","#b47a42","#8e5a2c","#976637","","","","","","","","","","","","","","","","","#774c25","#b47a42","#b47a42","#774c25","","","",""],["","","","","#976637","#8e5a2c","#b47a42","#976637","","","","","","","","","","","","","","","","","#976637","#b47a42","#8e5a2c","#976637","","","",""],["","","","","#774c25","#b47a42","#b47a42","#774c25","","","","","","","","","","","","","","","","","#976637","#8e5a2c","#b47a42","#976637","","","",""],["","","","","#976637","#b47a42","#8e5a2c","#976637","","","","","","","","","","","","","","","","","#774c25","#b47a42","#b47a42","#774c25","","","",""],["","","","","#976637","#8e5a2c","#b47a42","#976637","","","","","","","","","","","","","","","","","#976637","#b47a42","#8e5a2c","#976637","","","",""],["","","","","#774c25","#b47a42","#b47a42","#774c25","","","","","","","","","","","","","","","","","#976637","#8e5a2c","#b47a42","#976637","","","",""],["","","","","#976637","#b47a42","#8e5a2c","#976637","","","","","","","","","","","","","","","","","#774c25","#b47a42","#b47a42","#774c25","","","",""],["","","","","#825830","#774c25","#976637","#825830","","","","","","","","","","","","","","","","","#825830","#976637","#774c25","#825830","","","",""]],
    difficulty: 4,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "grand_chandelier",
    name: "a grand chandelier (for a very low ceiling)",
    grid: [
        "....X....",
        "....X....",
        "X.X.X.X.X",
        "XXXXXXXXX",
        ".X.XXX.X.",
        "...XXX...",
        "....X...."
      ],
    color: [["","","","","","","","","","","","","","","","","#795514","#c19631","#c19631","#795514","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#8d6318","#fff0a0","#e6b23a","#8d6318","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#8d6318","#fff0a0","#e6b23a","#8d6318","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#8d6318","#e6b23a","#e6b23a","#8d6318","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#8d6318","#e6b23a","#e6b23a","#8d6318","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#8d6318","#fff0a0","#e6b23a","#8d6318","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#8d6318","#fff0a0","#e6b23a","#8d6318","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#8d6318","#e6b23a","#e6b23a","#8d6318","","","","","","","","","","","","","","","",""],["#b8a87f","#d6941b","#d66616","#b8a87f","","","","","#b8a87f","#d6941b","#d66616","#b8a87f","","","","","#d6c494","#ffb020","#ff7a1a","#d6c494","","","","","#b8a87f","#d6941b","#d66616","#b8a87f","","","","","#b8a87f","#d6941b","#d66616","#b8a87f"],["#d6ccb4","#fff47a","#ffd23a","#d6ccb4","","","","","#d6ccb4","#fff47a","#ffd23a","#d6ccb4","","","","","#d6ccb4","#fff47a","#ffd23a","#d6ccb4","","","","","#d6ccb4","#fff47a","#ffd23a","#d6ccb4","","","","","#d6ccb4","#fff47a","#ffd23a","#d6ccb4"],["#d6ccb4","#fff3d6","#fff3d6","#c1b08d","","","","","#d6ccb4","#fff3d6","#fff3d6","#c1b08d","","","","","#d6ccb4","#fff3d6","#fff3d6","#c1b08d","","","","","#d6ccb4","#fff3d6","#fff3d6","#c1b08d","","","","","#d6ccb4","#fff3d6","#fff3d6","#c1b08d"],["#8d6318","#a8761c","#a8761c","#8d6318","","","","","#8d6318","#a8761c","#a8761c","#8d6318","","","","","#8d6318","#a8761c","#a8761c","#8d6318","","","","","#8d6318","#a8761c","#a8761c","#8d6318","","","","","#8d6318","#a8761c","#a8761c","#8d6318"],["#d6ca86","#fff0a0","#fff0a0","#fff0a0","#d6ca86","#d6ca86","#d6ca86","#d6ca86","#fff0a0","#fff0a0","#fff0a0","#fff0a0","#d6ca86","#d6ca86","#d6ca86","#d6ca86","#fff0a0","#fff0a0","#fff0a0","#fff0a0","#d6ca86","#d6ca86","#d6ca86","#d6ca86","#fff0a0","#fff0a0","#fff0a0","#fff0a0","#d6ca86","#d6ca86","#d6ca86","#d6ca86","#fff0a0","#fff0a0","#fff0a0","#d6ca86"],["#c19631","#e6b23a","#fff0a0","#e6b23a","#e6b23a","#e6b23a","#fff0a0","#e6b23a","#e6b23a","#e6b23a","#fff0a0","#e6b23a","#e6b23a","#e6b23a","#fff0a0","#e6b23a","#e6b23a","#e6b23a","#fff0a0","#e6b23a","#e6b23a","#e6b23a","#fff0a0","#e6b23a","#e6b23a","#e6b23a","#fff0a0","#e6b23a","#e6b23a","#e6b23a","#fff0a0","#e6b23a","#e6b23a","#e6b23a","#fff0a0","#c19631"],["#c19631","#a8761c","#e6b23a","#e6b23a","#e6b23a","#a8761c","#e6b23a","#e6b23a","#e6b23a","#a8761c","#e6b23a","#e6b23a","#e6b23a","#a8761c","#e6b23a","#e6b23a","#e6b23a","#a8761c","#e6b23a","#e6b23a","#e6b23a","#a8761c","#e6b23a","#e6b23a","#e6b23a","#a8761c","#e6b23a","#e6b23a","#e6b23a","#a8761c","#e6b23a","#e6b23a","#e6b23a","#a8761c","#e6b23a","#c19631"],["#795514","#8d6318","#8d6318","#8d6318","#a8761c","#a8761c","#a8761c","#a8761c","#8d6318","#8d6318","#8d6318","#8d6318","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#8d6318","#8d6318","#8d6318","#8d6318","#a8761c","#a8761c","#a8761c","#a8761c","#8d6318","#8d6318","#8d6318","#795514"],["","","","","#d6d6d6","#7fb8e0","#cdeeff","#acc8d6","","","","","#d6ca86","#fff0a0","#fff0a0","#fff0a0","#fff0a0","#fff0a0","#fff0a0","#fff0a0","#fff0a0","#fff0a0","#fff0a0","#d6ca86","","","","","#d6d6d6","#7fb8e0","#cdeeff","#acc8d6","","","",""],["","","","","#6b9bbc","#ffffff","#cdeeff","#6b9bbc","","","","","#c19631","#ff5a6a","#e6b23a","#e6b23a","#ff5a6a","#e6b23a","#e6b23a","#ff5a6a","#e6b23a","#e6b23a","#ff5a6a","#c19631","","","","","#6b9bbc","#ffffff","#cdeeff","#6b9bbc","","","",""],["","","","","#acc8d6","#cdeeff","#ffffff","#acc8d6","","","","","#8d6318","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#8d6318","","","","","#acc8d6","#cdeeff","#ffffff","#acc8d6","","","",""],["","","","","#94abb8","#6b9bbc","#acc8d6","#b8b8b8","","","","","#8d6318","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#a8761c","#8d6318","","","","","#94abb8","#6b9bbc","#acc8d6","#b8b8b8","","","",""],["","","","","","","","","","","","","#d6d6d6","#7fb8e0","#cdeeff","#cdeeff","#ffffff","#cdeeff","#cdeeff","#7fb8e0","#ffffff","#cdeeff","#7fb8e0","#acc8d6","","","","","","","","","","","",""],["","","","","","","","","","","","","#6b9bbc","#ffffff","#cdeeff","#7fb8e0","#cdeeff","#ffffff","#7fb8e0","#cdeeff","#cdeeff","#ffffff","#cdeeff","#acc8d6","","","","","","","","","","","",""],["","","","","","","","","","","","","#acc8d6","#cdeeff","#ffffff","#cdeeff","#cdeeff","#7fb8e0","#ffffff","#cdeeff","#7fb8e0","#cdeeff","#ffffff","#6b9bbc","","","","","","","","","","","",""],["","","","","","","","","","","","","#94abb8","#6b9bbc","#acc8d6","#d6d6d6","#7fb8e0","#cdeeff","#cdeeff","#ffffff","#acc8d6","#acc8d6","#6b9bbc","#b8b8b8","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#d6d6d6","#cdeeff","#7fb8e0","#acc8d6","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#acc8d6","#ffffff","#cdeeff","#acc8d6","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#6b9bbc","#cdeeff","#ffffff","#6b9bbc","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#94abb8","#d6d6d6","#6b9bbc","#b8b8b8","","","","","","","","","","","","","","","",""]],
    difficulty: 4,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "eiffel_tower",
    name: "The Eiffel Tower",
    grid: [
        "...X...",
        "...X...",
        "...X...",
        "..XXX..",
        "..XXX..",
        "..XXX..",
        ".XXXXX.",
        ".XXXXX.",
        "XXXXXXX",
        "XX...XX",
        "XX...XX"
      ],
    color: [["","","","","","","","","","","","","#4c2e1a","#d6cc94","#d6b559","#4c2e1a","","","","","","","","","","","",""],["","","","","","","","","","","","","#59361e","#ffd76a","#ffd76a","#59361e","","","","","","","","","","","",""],["","","","","","","","","","","","","#59361e","#cf955c","#7d4a26","#59361e","","","","","","","","","","","",""],["","","","","","","","","","","","","#59361e","#cf955c","#7d4a26","#59361e","","","","","","","","","","","",""],["","","","","","","","","","","","","#59361e","#cf955c","#7d4a26","#59361e","","","","","","","","","","","",""],["","","","","","","","","","","","","#59361e","#cf955c","#7d4a26","#59361e","","","","","","","","","","","",""],["","","","","","","","","","","","","#693e20","#cf955c","#a86c3c","#693e20","","","","","","","","","","","",""],["","","","","","","","","","","","","#693e20","#cf955c","#a86c3c","#693e20","","","","","","","","","","","",""],["","","","","","","","","","","","","#693e20","#cf955c","#cf955c","#693e20","","","","","","","","","","","",""],["","","","","","","","","","","","","#693e20","#cf955c","#a86c3c","#693e20","","","","","","","","","","","",""],["","","","","","","","","","","","","#693e20","#cf955c","#cf955c","#693e20","","","","","","","","","","","",""],["","","","","","","","","","","","","#693e20","#cf955c","#a86c3c","#693e20","","","","","","","","","","","",""],["","","","","","","","","#4c2e1a","#caa174","#caa174","#caa174","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#caa174","#caa174","#caa174","#4c2e1a","","","","","","","",""],["","","","","","","","","#59361e","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#59361e","","","","","","","",""],["","","","","","","","","#59361e","#6a4024","#6a4024","#7d4a26","#a86c3c","#a86c3c","#cf955c","#a86c3c","#7d4a26","#6a4024","#6a4024","#59361e","","","","","","","",""],["","","","","","","","","#59361e","#6a4024","#6a4024","#7d4a26","#a86c3c","#a86c3c","#a86c3c","#cf955c","#7d4a26","#6a4024","#6a4024","#59361e","","","","","","","",""],["","","","","","","","","#59361e","#6a4024","#7d4a26","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#cf955c","#7d4a26","#6a4024","#59361e","","","","","","","",""],["","","","","","","","","#59361e","#6a4024","#7d4a26","#cf955c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#7d4a26","#6a4024","#59361e","","","","","","","",""],["","","","","","","","","#59361e","#6a4024","#7d4a26","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#a86c3c","#7d4a26","#6a4024","#59361e","","","","","","","",""],["","","","","","","","","#59361e","#7d4a26","#a86c3c","#cf955c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#7d4a26","#59361e","","","","","","","",""],["","","","","","","","","#59361e","#7d4a26","#cf955c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#cf955c","#a86c3c","#7d4a26","#59361e","","","","","","","",""],["","","","","","","","","#59361e","#7d4a26","#a86c3c","#a86c3c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#7d4a26","#59361e","","","","","","","",""],["","","","","","","","","#59361e","#7d4a26","#cf955c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#cf955c","#a86c3c","#7d4a26","#59361e","","","","","","","",""],["","","","","","","","","#693e20","#a86c3c","#a86c3c","#cf955c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#693e20","","","","","","","",""],["","","","","#4c2e1a","#caa174","#d6c28d","#caa174","#f0c08a","#ffe7a8","#f0c08a","#f0c08a","#ffe7a8","#f0c08a","#f0c08a","#ffe7a8","#f0c08a","#f0c08a","#ffe7a8","#f0c08a","#caa174","#d6c28d","#caa174","#4c2e1a","","","",""],["","","","","#59361e","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#59361e","","","",""],["","","","","#59361e","#6a4024","#6a4024","#7d4a26","#cf955c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#7d4a26","#6a4024","#6a4024","#59361e","","","",""],["","","","","#59361e","#6a4024","#7d4a26","#a86c3c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#a86c3c","#a86c3c","#7d4a26","#6a4024","#59361e","","","",""],["","","","","#59361e","#6a4024","#7d4a26","#a86c3c","#cf955c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#7d4a26","#6a4024","#59361e","","","",""],["","","","","#59361e","#7d4a26","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#7d4a26","#59361e","","","",""],["","","","","#59361e","#7d4a26","#cf955c","#a86c3c","#a86c3c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#7d4a26","#59361e","","","",""],["","","","","#693e20","#cf955c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#cf955c","#a86c3c","#cf955c","#a86c3c","#a86c3c","#a86c3c","#693e20","","","",""],["#ad8a63","#caa174","#caa174","#caa174","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#f0c08a","#caa174","#caa174","#caa174","#ad8a63"],["#693e20","#ffdf8a","#7d4a26","#7d4a26","#ffdf8a","#7d4a26","#7d4a26","#ffdf8a","#7d4a26","#7d4a26","#ffdf8a","#7d4a26","#7d4a26","#ffdf8a","#7d4a26","#7d4a26","#ffdf8a","#7d4a26","#7d4a26","#ffdf8a","#7d4a26","#7d4a26","#ffdf8a","#7d4a26","#7d4a26","#ffdf8a","#7d4a26","#693e20"],["#693e20","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#7d4a26","#693e20"],["#59361e","#6a4024","#6a4024","#6a4024","#a86c3c","#cf955c","#a86c3c","#7d4a26","#59361e","#59361e","#59361e","#59361e","#59361e","#59361e","#59361e","#59361e","#59361e","#59361e","#59361e","#59361e","#7d4a26","#a86c3c","#a86c3c","#cf955c","#6a4024","#6a4024","#6a4024","#59361e"],["#59361e","#6a4024","#6a4024","#6a4024","#a86c3c","#a86c3c","#7d4a26","#59361e","","","","","","","","","","","","","#59361e","#7d4a26","#a86c3c","#a86c3c","#6a4024","#6a4024","#6a4024","#59361e"],["#59361e","#6a4024","#6a4024","#a86c3c","#a86c3c","#cf955c","#7d4a26","#59361e","","","","","","","","","","","","","#59361e","#7d4a26","#a86c3c","#cf955c","#a86c3c","#6a4024","#6a4024","#59361e"],["#59361e","#6a4024","#6a4024","#a86c3c","#cf955c","#a86c3c","#7d4a26","#59361e","","","","","","","","","","","","","#59361e","#7d4a26","#cf955c","#a86c3c","#a86c3c","#6a4024","#6a4024","#59361e"],["#59361e","#6a4024","#6a4024","#cf955c","#a86c3c","#a86c3c","#7d4a26","#59361e","","","","","","","","","","","","","#59361e","#7d4a26","#a86c3c","#a86c3c","#a86c3c","#6a4024","#6a4024","#59361e"],["#59361e","#6a4024","#cf955c","#a86c3c","#cf955c","#7d4a26","#6a4024","#59361e","","","","","","","","","","","","","#59361e","#6a4024","#7d4a26","#a86c3c","#a86c3c","#a86c3c","#6a4024","#59361e"],["#59361e","#6a4024","#a86c3c","#a86c3c","#a86c3c","#7d4a26","#6a4024","#59361e","","","","","","","","","","","","","#59361e","#6a4024","#7d4a26","#cf955c","#a86c3c","#cf955c","#6a4024","#59361e"],["#59361e","#6a4024","#a86c3c","#a86c3c","#a86c3c","#7d4a26","#6a4024","#59361e","","","","","","","","","","","","","#59361e","#6a4024","#7d4a26","#a86c3c","#cf955c","#a86c3c","#6a4024","#59361e"],["#44792a","#508d31","#508d31","#508d31","#508d31","#508d31","#508d31","#44792a","","","","","","","","","","","","","#44792a","#508d31","#508d31","#508d31","#508d31","#508d31","#508d31","#44792a"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "landmark"
      ],
  },
  {
    id: "statue_of_liberty",
    name: "The Statue of Liberty",
    grid: [
        "X....",
        "X.X..",
        "XXXX.",
        "XXX..",
        ".XXX.",
        ".XXX.",
        ".XXX.",
        ".XXX.",
        "XXXXX",
        "XXXXX",
        "XXXXX"
      ],
    color: [["#b86313","#d6cf94","#d6a931","#b86313","","","","","","","","","","","","","","","",""],["#d6a931","#fff6b0","#fff6b0","#d6a931","","","","","","","","","","","","","","","",""],["#d67416","#ffc93a","#ffc93a","#d67416","","","","","","","","","","","","","","","",""],["#a97d23","#ffd35a","#ffd35a","#a97d23","","","","","","","","","","","","","","","",""],["#a97d23","#ffd35a","#ffd35a","#a97d23","","","","","#2d6355","#357463","#a0caba","#2d6355","","","","","","","",""],["#357463","#8fd8c0","#8fd8c0","#357463","","","","","#357463","#bff0de","#bff0de","#357463","","","","","","","",""],["#357463","#8fd8c0","#5fb39b","#357463","","","","","#357463","#bff0de","#bff0de","#357463","","","","","","","",""],["#357463","#8fd8c0","#5fb39b","#357463","","","","","#509682","#bff0de","#8fd8c0","#509682","","","","","","","",""],["#357463","#8fd8c0","#5fb39b","#3f8a76","#a0caba","#357463","#357463","#357463","#3f8a76","#bff0de","#8fd8c0","#3f8a76","#357463","#357463","#357463","#8aada0","","","",""],["#357463","#8fd8c0","#5fb39b","#3f8a76","#3f8a76","#bff0de","#3f8a76","#3f8a76","#5fb39b","#bff0de","#8fd8c0","#5fb39b","#3f8a76","#3f8a76","#bff0de","#357463","","","",""],["#357463","#8fd8c0","#5fb39b","#3f8a76","#3f8a76","#3f8a76","#bff0de","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#bff0de","#3f8a76","#357463","","","",""],["#357463","#8fd8c0","#5fb39b","#3f8a76","#3f8a76","#5fb39b","#bff0de","#5fb39b","#bff0de","#5fb39b","#bff0de","#5fb39b","#a0caba","#509682","#357463","#2d6355","","","",""],["#357463","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#509682","","","","","","","",""],["#509682","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#2b6656","#8fd8c0","#8fd8c0","#2b6656","#8fd8c0","#509682","","","","","","","",""],["#509682","#8fd8c0","#5fb39b","#5fb39b","#3f8a76","#8fd8c0","#8fd8c0","#bff0de","#bff0de","#8fd8c0","#8fd8c0","#357463","","","","","","","",""],["#448170","#78b5a1","#78b5a1","#509682","#3f8a76","#3f8a76","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#3f8a76","#357463","","","","","","","",""],["","","","","#78b5a1","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#a0caba","#a0caba","#a0caba","#2d6355","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#5fb39b","#9fe0ca","#9fe0ca","#9fe0ca","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#5fb39b","#9fe0ca","#3f8a76","#3f8a76","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#5fb39b","#9fe0ca","#9fe0ca","#9fe0ca","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#5fb39b","#9fe0ca","#3f8a76","#3f8a76","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#8fd8c0","#9fe0ca","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#3f8a76","#3f8a76","#3f8a76","#3f8a76","#3f8a76","#9fe0ca","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#357463","","","",""],["","","","","#357463","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#5fb39b","#3f8a76","#5fb39b","#8fd8c0","#357463","","","",""],["","","","","#357463","#3f8a76","#3f8a76","#3f8a76","#3f8a76","#3f8a76","#3f8a76","#3f8a76","#3f8a76","#3f8a76","#3f8a76","#357463","","","",""],["#aca288","#c9bd9f","#c9bd9f","#c9bd9f","#efe1bd","#efe1bd","#efe1bd","#efe1bd","#efe1bd","#efe1bd","#efe1bd","#efe1bd","#efe1bd","#efe1bd","#efe1bd","#efe1bd","#c9bd9f","#c9bd9f","#c9bd9f","#aca288"],["#b6a581","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#b6a581"],["#96815b","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#96815b"],["#96815b","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#96815b"],["#b6a581","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#b6a581"],["#b6a581","#d9c49a","#d9c49a","#b29a6c","#b29a6c","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#b29a6c","#b29a6c","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#b29a6c","#b29a6c","#d9c49a","#d9c49a","#b6a581"],["#96815b","#b29a6c","#b29a6c","#8f7a52","#8f7a52","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#8f7a52","#8f7a52","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#8f7a52","#8f7a52","#b29a6c","#b29a6c","#96815b"],["#b6a581","#d9c49a","#d9c49a","#8f7a52","#8f7a52","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#8f7a52","#8f7a52","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#8f7a52","#8f7a52","#d9c49a","#d9c49a","#b6a581"],["#b6a581","#d9c49a","#d9c49a","#8f7a52","#8f7a52","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#8f7a52","#8f7a52","#d9c49a","#d9c49a","#d9c49a","#d9c49a","#8f7a52","#8f7a52","#d9c49a","#d9c49a","#b6a581"],["#96815b","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#b29a6c","#96815b"],["#639640","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#76b24c","#639640"],["#416f2a","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#4c8131","#416f2a"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "landmark"
      ],
  },
  {
    id: "sydney_opera_house",
    name: "The Sydney Opera House",
    grid: [
        "..X.......",
        ".XX...X...",
        "XXXX.XXX.X",
        "XXXXXXXXXX",
        "XXXXXXXXXX"
      ],
    color: [["","","","","","","","","#aaa69d","#c6c2b7","#817a6a","#817a6c","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","#c6c2b7","#ece7da","#d4d0c4","#817a6a","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","#c6c2b7","#ece7da","#ece7da","#c6c2b7","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","#c6c2b7","#ece7da","#ece7da","#c6c2b7","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","#b0aea8","#cecbc4","#b9b7b0","#817a6a","#ece7da","#ece7da","#ece7da","#b2afa5","","","","","","","","","","","","","#aaa69d","#c6c2b7","#b2afa5","#6f685b","","","","","","","","","","","",""],["","","","","#cecbc4","#f5f2e9","#f5f2e9","#f5f2e9","#9a917e","#ece7da","#ece7da","#b2afa5","","","","","","","","","","","","","#c6c2b7","#ece7da","#ece7da","#c6c2b7","","","","","","","","","","","",""],["","","","","#cecbc4","#f5f2e9","#f5f2e9","#dcdad2","#f5f2e9","#9a917e","#ece7da","#b2afa5","","","","","","","","","","","","","#c6c2b7","#ece7da","#ece7da","#b2afa5","","","","","","","","","","","",""],["","","","","#cecbc4","#f5f2e9","#f5f2e9","#dcdad2","#f5f2e9","#9a917e","#ece7da","#c6c2b7","","","","","","","","","","","","","#c6c2b7","#ece7da","#ece7da","#b2afa5","","","","","","","","","","","",""],["#817a6c","#d5d4cf","#d5d4cf","#c0bfba","#9a917e","#f5f2e9","#f5f2e9","#dcdad2","#f5f2e9","#f5f2e9","#9a917e","#ece7da","#c6c2b7","#c6c2b7","#817a6a","#817a6c","","","","","#b0aea8","#b9b7b0","#cecbc4","#cecbc4","#9a917e","#ece7da","#ece7da","#d4d0c4","#c6c2b7","#c6c2b7","#817a6a","#817a6c","","","","","#b6b5b1","#d5d4cf","#817a6a","#817a6c"],["#d5d4cf","#fdfcf6","#fdfcf6","#fdfcf6","#fdfcf6","#9a917e","#f5f2e9","#f5f2e9","#f5f2e9","#f5f2e9","#9a917e","#ece7da","#d4d0c4","#ece7da","#9a917e","#968f7e","","","","","#cecbc4","#f5f2e9","#f5f2e9","#f5f2e9","#f5f2e9","#9a917e","#ece7da","#ece7da","#ece7da","#ece7da","#9a917e","#968f7e","","","","","#d5d4cf","#fdfcf6","#9a917e","#968f7e"],["#d5d4cf","#fdfcf6","#e4e3dd","#fdfcf6","#e4e3dd","#9a917e","#f5f2e9","#f5f2e9","#dcdad2","#f5f2e9","#f5f2e9","#9a917e","#d4d0c4","#ece7da","#ece7da","#817a6a","","","","","#cecbc4","#f5f2e9","#dcdad2","#f5f2e9","#dcdad2","#f5f2e9","#9a917e","#ece7da","#d4d0c4","#ece7da","#ece7da","#817a6a","","","","","#d5d4cf","#fdfcf6","#e4e3dd","#817a6a"],["#a9743e","#c98a4a","#c98a4a","#c98a4a","#e4e3dd","#fdfcf6","#9a917e","#f5f2e9","#dcdad2","#f5f2e9","#f5f2e9","#9a917e","#d4d0c4","#ece7da","#ece7da","#817a6a","","","","","#a9743e","#c98a4a","#c98a4a","#c98a4a","#f5f2e9","#dcdad2","#f5f2e9","#9a917e","#d4d0c4","#ece7da","#ece7da","#817a6a","","","","","#a9743e","#c98a4a","#c98a4a","#a9743e"],["#caa577","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#caa577","#caa577","#caa577","#caa577","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#caa577","#caa577","#caa577","#caa577","#f0c48e","#f0c48e","#f0c48e","#caa577"],["#9a683b","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#b77c46","#9a683b"],["#b88859","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#b88859"],["#b88859","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#b88859"],["#b88859","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#f0c48e","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#b88859"],["#b88859","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#dba26a","#b88859"],["#8db9d6","#4aa0e6","#4aa0e6","#4aa0e6","#4aa0e6","#4aa0e6","#a8dcff","#4aa0e6","#4aa0e6","#4aa0e6","#4aa0e6","#4aa0e6","#a8dcff","#4aa0e6","#4aa0e6","#4aa0e6","#4aa0e6","#4aa0e6","#a8dcff","#4aa0e6","#4aa0e6","#4aa0e6","#4aa0e6","#4aa0e6","#a8dcff","#4aa0e6","#4aa0e6","#4aa0e6","#4aa0e6","#4aa0e6","#a8dcff","#4aa0e6","#4aa0e6","#4aa0e6","#4aa0e6","#4aa0e6","#a8dcff","#4aa0e6","#4aa0e6","#3e86c1"],["#225b95","#276bae","#276bae","#68a5d6","#276bae","#276bae","#276bae","#276bae","#276bae","#68a5d6","#276bae","#276bae","#276bae","#276bae","#276bae","#68a5d6","#276bae","#276bae","#276bae","#276bae","#276bae","#68a5d6","#276bae","#276bae","#276bae","#276bae","#276bae","#68a5d6","#276bae","#276bae","#276bae","#276bae","#276bae","#68a5d6","#276bae","#276bae","#276bae","#276bae","#276bae","#598db8"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "landmark"
      ],
  },
  {
    id: "taj_mahal",
    name: "The Taj Mahal",
    grid: [
        "....X....",
        "...XXX...",
        "X.XXXXX.X",
        "X.XXXXX.X",
        "X.XXXXX.X",
        "X.XXXXX.X",
        "XXXXXXXXX"
      ],
    color: [["","","","","","","","","","","","","","","","","#a8a49a","#c39b28","#c39b28","#a8a49a","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#c4c0b4","#ffe27a","#e8b830","#c4c0b4","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#c4c0b4","#e8b830","#ffe27a","#c4c0b4","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","#c4c0b4","#dcd5c6","#dcd5c6","#c4c0b4","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","#a39f94","#bfbaac","#bfbaac","#bfbaac","#f6f2e8","#f6f2e8","#f6f2e8","#dcd5c6","#bfbaac","#bfbaac","#bfbaac","#a39f94","","","","","","","","","","","",""],["","","","","","","","","","","","","#bfbaac","#e3ddcd","#f6f2e8","#f6f2e8","#ffffff","#f6f2e8","#f6f2e8","#f6f2e8","#dcd5c6","#bdb4a3","#e3ddcd","#bfbaac","","","","","","","","","","","",""],["","","","","","","","","","","","","#cfcbc3","#f6f2e8","#f6f2e8","#ffffff","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#dcd5c6","#dcd5c6","#9f9789","","","","","","","","","","","",""],["","","","","","","","","","","","","#cfcbc3","#f6f2e8","#ffffff","#ffffff","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#dcd5c6","#dcd5c6","#b9b3a6","","","","","","","","","","","",""],["#9e998f","#c39b28","#c39b28","#9e998f","","","","","#a39f94","#c39b28","#c39b28","#cfcbc3","#f6f2e8","#ffffff","#ffffff","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#dcd5c6","#dcd5c6","#b9b3a6","#c39b28","#c39b28","#a39f94","","","","","#9e998f","#c39b28","#c39b28","#9e998f"],["#cfcbc3","#f6f2e8","#f6f2e8","#cfcbc3","","","","","#cfcbc3","#f6f2e8","#f6f2e8","#f6f2e8","#ffffff","#ffffff","#ffffff","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#dcd5c6","#f6f2e8","#f6f2e8","#f6f2e8","#cfcbc3","","","","","#cfcbc3","#f6f2e8","#f6f2e8","#cfcbc3"],["#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#cfcbc3","#f6f2e8","#dcd5c6","#dcd5c6","#ffffff","#ffffff","#ffffff","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#dcd5c6","#f6f2e8","#f6f2e8","#dcd5c6","#b9b3a6","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6"],["#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#bdb4a3","#bdb4a3","#dcd5c6","#ffffff","#ffffff","#ffffff","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#dcd5c6","#dcd5c6","#bdb4a3","#bdb4a3","#b9b3a6","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6"],["#9f9789","#bdb4a3","#bdb4a3","#9f9789","","","","","#cfcbc3","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#dcd5c6","#dcd5c6","#dcd5c6","#dcd5c6","#9f9789","","","","","#9f9789","#bdb4a3","#bdb4a3","#9f9789"],["#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#cfcbc3","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#dcd5c6","#dcd5c6","#dcd5c6","#dcd5c6","#9f9789","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6"],["#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#cfcbc3","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#dcd5c6","#dcd5c6","#dcd5c6","#dcd5c6","#9f9789","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6"],["#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#9f9789","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#bdb4a3","#9f9789","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6"],["#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#c9a24a","#c9a24a","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6"],["#9f9789","#bdb4a3","#bdb4a3","#9f9789","","","","","#b9b3a6","#f6f2e8","#c9a24a","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#c9a24a","#a9b8cf","#a9b8cf","#c9a24a","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#c9a24a","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#9f9789","#bdb4a3","#bdb4a3","#9f9789"],["#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#c9a24a","#a9b8cf","#c9a24a","#f6f2e8","#f6f2e8","#f6f2e8","#c9a24a","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#c9a24a","#f6f2e8","#f6f2e8","#c9a24a","#a9b8cf","#c9a24a","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6"],["#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#c9a24a","#a9b8cf","#c9a24a","#f6f2e8","#f6f2e8","#c9a24a","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#c9a24a","#f6f2e8","#c9a24a","#a9b8cf","#c9a24a","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6"],["#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#c9a24a","#a9b8cf","#c9a24a","#f6f2e8","#f6f2e8","#c9a24a","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#c9a24a","#f6f2e8","#c9a24a","#a9b8cf","#c9a24a","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6"],["#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#c9a24a","#a9b8cf","#c9a24a","#f6f2e8","#f6f2e8","#c9a24a","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#c9a24a","#f6f2e8","#c9a24a","#a9b8cf","#c9a24a","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6"],["#9f9789","#bdb4a3","#bdb4a3","#9f9789","","","","","#b9b3a6","#c9a24a","#c9a24a","#c9a24a","#f6f2e8","#f6f2e8","#c9a24a","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#c9a24a","#f6f2e8","#c9a24a","#c9a24a","#c9a24a","#f6f2e8","#b9b3a6","","","","","#9f9789","#bdb4a3","#bdb4a3","#9f9789"],["#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#c9a24a","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#a9b8cf","#c9a24a","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#f6f2e8","#b9b3a6","","","","","#b9b3a6","#f6f2e8","#f6f2e8","#b9b3a6"],["#c6c1b4","#ece6d6","#ece6d6","#ece6d6","#c6c1b4","#c6c1b4","#c6c1b4","#c6c1b4","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#ece6d6","#c6c1b4","#c6c1b4","#c6c1b4","#c6c1b4","#ece6d6","#ece6d6","#ece6d6","#c6c1b4"],["#428d32","#4fa83c","#2f7a26","#4fa83c","#4fa83c","#3c8a2e","#2f7a26","#4fa83c","#3c8a2e","#4fa83c","#2f7a26","#3c8a2e","#4fa83c","#4fa83c","#7cc4f0","#c4ecff","#7cc4f0","#7cc4f0","#7cc4f0","#c4ecff","#7cc4f0","#7cc4f0","#4fa83c","#3c8a2e","#4fa83c","#2f7a26","#3c8a2e","#4fa83c","#4fa83c","#2f7a26","#4fa83c","#4fa83c","#3c8a2e","#2f7a26","#4fa83c","#327427"],["#428d32","#3c8a2e","#2f7a26","#4fa83c","#3c8a2e","#4fa83c","#2f7a26","#3c8a2e","#4fa83c","#4fa83c","#2f7a26","#4fa83c","#4fa83c","#3c8a2e","#c4ecff","#7cc4f0","#7cc4f0","#7cc4f0","#c4ecff","#7cc4f0","#7cc4f0","#7cc4f0","#3c8a2e","#4fa83c","#4fa83c","#2f7a26","#4fa83c","#4fa83c","#3c8a2e","#2f7a26","#4fa83c","#3c8a2e","#4fa83c","#2f7a26","#3c8a2e","#428d32"],["#2b6321","#428d32","#428d32","#327427","#428d32","#428d32","#327427","#428d32","#428d32","#327427","#428d32","#428d32","#327427","#428d32","#68a5ca","#68a5ca","#68a5ca","#a5c6d6","#68a5ca","#68a5ca","#68a5ca","#a5c6d6","#428d32","#428d32","#327427","#428d32","#428d32","#327427","#428d32","#428d32","#327427","#428d32","#428d32","#327427","#428d32","#39792b"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "landmark"
      ],
  },
  {
    id: "mount_rushmore",
    name: "Mount Rushmore (all four of them)",
    grid: [
        "XX.XX.XX.XX",
        "XXXXXXXXXXX",
        "XXXXXXXXXXX",
        ".XXXXXXXXX."
      ],
    color: [["#79736b","#8d867c","#b4afa5","#b4afa5","#b4afa5","#b4afa5","#8d867c","#79736b","","","","","#79736b","#b4afa5","#b4afa5","#b4afa5","#b4afa5","#b4afa5","#b4afa5","#79736b","","","","","#79736b","#b4afa5","#b4afa5","#b4afa5","#b4afa5","#b4afa5","#b4afa5","#79736b","","","","","#79736b","#8d867c","#8d867c","#8d867c","#8d867c","#8d867c","#8d867c","#79736b"],["#8d867c","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#8d867c","","","","","#8d867c","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#b4afa5","","","","","#b4afa5","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#b4afa5","","","","","#8d867c","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#8d867c"],["#8d867c","#a8a094","#7d7569","#d6d0c4","#d6d0c4","#7d7569","#a8a094","#8d867c","","","","","#b4afa5","#a8a094","#7d7569","#d6d0c4","#d6d0c4","#7d7569","#a8a094","#b4afa5","","","","","#696258","#7d7569","#7d7569","#d6d0c4","#d6d0c4","#7d7569","#7d7569","#696258","","","","","#b4afa5","#a8a094","#7d7569","#d6d0c4","#d6d0c4","#7d7569","#a8a094","#b4afa5"],["#8d867c","#d6d0c4","#a8a094","#d6d0c4","#d6d0c4","#a8a094","#d6d0c4","#8d867c","","","","","#b4afa5","#d6d0c4","#a8a094","#d6d0c4","#d6d0c4","#a8a094","#d6d0c4","#b4afa5","","","","","#696258","#d6d0c4","#7d7569","#7d7569","#7d7569","#7d7569","#d6d0c4","#696258","","","","","#b4afa5","#d6d0c4","#a8a094","#d6d0c4","#d6d0c4","#a8a094","#d6d0c4","#b4afa5"],["#9b968b","#d6d0c4","#d6d0c4","#f2ede2","#f2ede2","#d6d0c4","#d6d0c4","#b9b2a6","#979186","#898277","#898277","#979186","#b9b2a6","#d6d0c4","#d6d0c4","#f2ede2","#f2ede2","#d6d0c4","#d6d0c4","#b9b2a6","#898277","#a9a398","#979186","#898277","#b9b2a6","#d6d0c4","#d6d0c4","#f2ede2","#f2ede2","#d6d0c4","#d6d0c4","#b9b2a6","#979186","#898277","#979186","#a9a398","#b9b2a6","#d6d0c4","#d6d0c4","#f2ede2","#f2ede2","#d6d0c4","#d6d0c4","#9b968b"],["#9b968b","#d6d0c4","#d6d0c4","#f2ede2","#f2ede2","#d6d0c4","#d6d0c4","#b9b2a6","#c9c2b5","#a39b8e","#b4ada0","#a39b8e","#b9b2a6","#d6d0c4","#d6d0c4","#f2ede2","#f2ede2","#d6d0c4","#d6d0c4","#b9b2a6","#a39b8e","#b4ada0","#c9c2b5","#b4ada0","#b9b2a6","#d6d0c4","#d6d0c4","#f2ede2","#f2ede2","#d6d0c4","#d6d0c4","#b9b2a6","#c9c2b5","#b4ada0","#a39b8e","#b4ada0","#b9b2a6","#d6d0c4","#d6d0c4","#f2ede2","#f2ede2","#d6d0c4","#d6d0c4","#9b968b"],["#9b968b","#d6d0c4","#a8a094","#d6d0c4","#d6d0c4","#a8a094","#d6d0c4","#b9b2a6","#b4ada0","#b4ada0","#a39b8e","#b4ada0","#b9b2a6","#d6d0c4","#a8a094","#d6d0c4","#d6d0c4","#a8a094","#d6d0c4","#b9b2a6","#b4ada0","#b4ada0","#a39b8e","#c9c2b5","#b9b2a6","#7d7569","#7d7569","#7d7569","#7d7569","#7d7569","#7d7569","#b9b2a6","#b4ada0","#c9c2b5","#a39b8e","#a39b8e","#b9b2a6","#d6d0c4","#a8a094","#d6d0c4","#d6d0c4","#a8a094","#d6d0c4","#9b968b"],["#9b968b","#d6d0c4","#7d7569","#7d7569","#7d7569","#7d7569","#d6d0c4","#b9b2a6","#a39b8e","#a39b8e","#b4ada0","#b4ada0","#b9b2a6","#d6d0c4","#7d7569","#7d7569","#7d7569","#7d7569","#d6d0c4","#b9b2a6","#a39b8e","#a39b8e","#b4ada0","#a39b8e","#b9b2a6","#d6d0c4","#a8a094","#a8a094","#a8a094","#d6d0c4","#d6d0c4","#b9b2a6","#a39b8e","#c9c2b5","#b4ada0","#c9c2b5","#b9b2a6","#a8a094","#7d7569","#7d7569","#7d7569","#7d7569","#a8a094","#9b968b"],["#9b968b","#a8a094","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#a8a094","#b9b2a6","#b4ada0","#a39b8e","#b4ada0","#c9c2b5","#b9b2a6","#a8a094","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#a8a094","#b9b2a6","#a39b8e","#c9c2b5","#b4ada0","#a39b8e","#b9b2a6","#a8a094","#d6d0c4","#d6d0c4","#d6d0c4","#d6d0c4","#a8a094","#b9b2a6","#c9c2b5","#a39b8e","#a39b8e","#a39b8e","#b9b2a6","#a8a094","#a8a094","#a8a094","#a8a094","#a8a094","#a8a094","#8d867c"],["#9b968b","#b9b2a6","#a8a094","#d6d0c4","#d6d0c4","#a8a094","#b9b2a6","#b9b2a6","#a39b8e","#a39b8e","#b4ada0","#b4ada0","#b9b2a6","#b9b2a6","#a8a094","#d6d0c4","#d6d0c4","#a8a094","#b9b2a6","#b9b2a6","#a39b8e","#c9c2b5","#b4ada0","#a39b8e","#b9b2a6","#b9b2a6","#a8a094","#d6d0c4","#d6d0c4","#a8a094","#b9b2a6","#b9b2a6","#b4ada0","#b4ada0","#a39b8e","#a39b8e","#b9b2a6","#a8a094","#a8a094","#a8a094","#a8a094","#a8a094","#a8a094","#8d867c"],["#9b968b","#b9b2a6","#b9b2a6","#a8a094","#a8a094","#b9b2a6","#b9b2a6","#b9b2a6","#a39b8e","#a39b8e","#b4ada0","#c9c2b5","#b9b2a6","#b9b2a6","#b9b2a6","#a8a094","#a8a094","#b9b2a6","#b9b2a6","#b9b2a6","#a39b8e","#a39b8e","#a39b8e","#c9c2b5","#b9b2a6","#b9b2a6","#b9b2a6","#a8a094","#a8a094","#b9b2a6","#b9b2a6","#b9b2a6","#a39b8e","#a39b8e","#a39b8e","#a39b8e","#b9b2a6","#a8a094","#a8a094","#a8a094","#a8a094","#a8a094","#a8a094","#8d867c"],["#858078","#9b968b","#9b968b","#9b968b","#b9b2a6","#b9b2a6","#b9b2a6","#b9b2a6","#a39b8e","#b4ada0","#a39b8e","#a39b8e","#b9b2a6","#b9b2a6","#b9b2a6","#b9b2a6","#b9b2a6","#b9b2a6","#b9b2a6","#b9b2a6","#c9c2b5","#a39b8e","#b4ada0","#b4ada0","#b9b2a6","#b9b2a6","#b9b2a6","#b9b2a6","#b9b2a6","#b9b2a6","#b9b2a6","#b9b2a6","#b4ada0","#b4ada0","#a39b8e","#a39b8e","#b9b2a6","#b9b2a6","#b9b2a6","#b9b2a6","#9b968b","#9b968b","#9b968b","#858078"],["","","","","#898277","#a39b8e","#c9c2b5","#a39b8e","#a39b8e","#c9c2b5","#a39b8e","#c9c2b5","#c9c2b5","#a39b8e","#c9c2b5","#c9c2b5","#a39b8e","#a39b8e","#a39b8e","#a39b8e","#c9c2b5","#a39b8e","#a39b8e","#a39b8e","#c9c2b5","#a39b8e","#c9c2b5","#c9c2b5","#c9c2b5","#c9c2b5","#a39b8e","#a39b8e","#a39b8e","#a39b8e","#a39b8e","#a39b8e","#c9c2b5","#c9c2b5","#a39b8e","#898277","","","",""],["","","","","#898277","#a39b8e","#4fa648","#c9c2b5","#c9c2b5","#c9c2b5","#4fa648","#c9c2b5","#c9c2b5","#a39b8e","#4fa648","#a39b8e","#a39b8e","#c9c2b5","#4fa648","#a39b8e","#a39b8e","#a39b8e","#4fa648","#c9c2b5","#c9c2b5","#a39b8e","#4fa648","#a39b8e","#a39b8e","#a39b8e","#4fa648","#a39b8e","#c9c2b5","#c9c2b5","#4fa648","#c9c2b5","#a39b8e","#c9c2b5","#4fa648","#898277","","","",""],["","","","","#a9a398","#3f8f3a","#2f7a2c","#a39b8e","#a39b8e","#3f8f3a","#2f7a2c","#a39b8e","#c9c2b5","#3f8f3a","#2f7a2c","#a39b8e","#c9c2b5","#3f8f3a","#2f7a2c","#c9c2b5","#a39b8e","#3f8f3a","#2f7a2c","#c9c2b5","#c9c2b5","#3f8f3a","#2f7a2c","#c9c2b5","#c9c2b5","#3f8f3a","#2f7a2c","#a39b8e","#a39b8e","#3f8f3a","#2f7a2c","#a39b8e","#c9c2b5","#3f8f3a","#2f7a2c","#898277","","","",""],["","","","","#2d672a","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#276625","#357831","#225820","","","",""]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "landmark"
      ],
  },
  {
    id: "great_wall",
    name: "The Great Wall of China (abridged)",
    grid: [
        ".X..........",
        ".XX.....X...",
        "XXXX....XX..",
        "X..XX..XXXX.",
        "....XXXX..XX",
        ".....XX....X"
      ],
    color: [["","","","","#a69a7f","#8d7b59","#c1b494","#79694c","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","#ac9b7b","#cdb892","#cdb892","#ac9b7b","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","#ac9b7b","#8a7452","#8a7452","#ac9b7b","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","#ac9b7b","#8a7452","#8a7452","#ac9b7b","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""],["","","","","#c1b494","#a8926a","#e6d6b0","#a8926a","#c1b494","#8d7b59","#c1b494","#79694c","","","","","","","","","","","","","","","","","","","","","#a69a7f","#8d7b59","#c1b494","#79694c","","","","","","","","","","","",""],["","","","","#c1b494","#e6d6b0","#e6d6b0","#e6d6b0","#e6d6b0","#e6d6b0","#e6d6b0","#c1b494","","","","","","","","","","","","","","","","","","","","","#ac9b7b","#cdb892","#cdb892","#ac9b7b","","","","","","","","","","","",""],["","","","","#9b8a6a","#cdb892","#cdb892","#cdb892","#b8a47e","#cdb892","#cdb892","#ac9b7b","","","","","","","","","","","","","","","","","","","","","#ac9b7b","#8a7452","#8a7452","#ac9b7b","","","","","","","","","","","",""],["","","","","#ac9b7b","#cdb892","#b8a47e","#cdb892","#cdb892","#cdb892","#b8a47e","#ac9b7b","","","","","","","","","","","","","","","","","","","","","#ac9b7b","#8a7452","#8a7452","#ac9b7b","","","","","","","","","","","",""],["#a69a7f","#8d7b59","#c1b494","#8d7b59","#3f8a32","#7cc45a","#7cc45a","#7cc45a","#3f8a32","#7cc45a","#5aa844","#5aa844","#c1b494","#8d7b59","#c1b494","#79694c","","","","","","","","","","","","","","","","","#c1b494","#a8926a","#e6d6b0","#a8926a","#c1b494","#8d7b59","#c1b494","#79694c","","","","","","","",""],["#c1b494","#e6d6b0","#e6d6b0","#e6d6b0","#5aa844","#5aa844","#5aa844","#3f8a32","#5aa844","#5aa844","#3f8a32","#5aa844","#e6d6b0","#e6d6b0","#e6d6b0","#c1b494","","","","","","","","","","","","","","","","","#c1b494","#e6d6b0","#e6d6b0","#e6d6b0","#e6d6b0","#e6d6b0","#e6d6b0","#c1b494","","","","","","","",""],["#9b8a6a","#cdb892","#cdb892","#cdb892","#5aa844","#5aa844","#3f8a32","#3f8a32","#5aa844","#5aa844","#5aa844","#5aa844","#b8a47e","#cdb892","#cdb892","#ac9b7b","","","","","","","","","","","","","","","","","#9b8a6a","#cdb892","#cdb892","#cdb892","#b8a47e","#cdb892","#cdb892","#ac9b7b","","","","","","","",""],["#ac9b7b","#cdb892","#b8a47e","#cdb892","#35742a","#4c8d39","#4c8d39","#4c8d39","#4c8d39","#4c8d39","#35742a","#4c8d39","#cdb892","#cdb892","#b8a47e","#ac9b7b","","","","","","","","","","","","","","","","","#ac9b7b","#cdb892","#b8a47e","#cdb892","#cdb892","#cdb892","#b8a47e","#ac9b7b","","","","","","","",""],["#68a54c","#3f8a32","#7cc45a","#4c8d39","","","","","","","","","#4c8d39","#7cc45a","#3f8a32","#5aa844","#c1b494","#8d7b59","#c1b494","#79694c","","","","","","","","","#a69a7f","#8d7b59","#c1b494","#8d7b59","#7cc45a","#5aa844","#7cc45a","#7cc45a","#3f8a32","#3f8a32","#7cc45a","#5aa844","#c1b494","#8d7b59","#c1b494","#79694c","","","",""],["#35742a","#5aa844","#5aa844","#4c8d39","","","","","","","","","#35742a","#3f8a32","#5aa844","#5aa844","#e6d6b0","#e6d6b0","#e6d6b0","#c1b494","","","","","","","","","#c1b494","#e6d6b0","#e6d6b0","#e6d6b0","#3f8a32","#3f8a32","#5aa844","#5aa844","#5aa844","#5aa844","#5aa844","#5aa844","#e6d6b0","#e6d6b0","#e6d6b0","#c1b494","","","",""],["#4c8d39","#3f8a32","#5aa844","#4c8d39","","","","","","","","","#4c8d39","#3f8a32","#5aa844","#5aa844","#b8a47e","#cdb892","#cdb892","#ac9b7b","","","","","","","","","#9b8a6a","#cdb892","#cdb892","#cdb892","#3f8a32","#3f8a32","#5aa844","#5aa844","#5aa844","#5aa844","#5aa844","#5aa844","#b8a47e","#cdb892","#cdb892","#ac9b7b","","","",""],["#417931","#4c8d39","#4c8d39","#2d6324","","","","","","","","","#417931","#4c8d39","#4c8d39","#4c8d39","#cdb892","#cdb892","#b8a47e","#ac9b7b","","","","","","","","","#ac9b7b","#cdb892","#b8a47e","#cdb892","#4c8d39","#4c8d39","#4c8d39","#4c8d39","#35742a","#4c8d39","#35742a","#35742a","#cdb892","#cdb892","#b8a47e","#ac9b7b","","","",""],["","","","","","","","","","","","","","","","","#4c8d39","#7cc45a","#5aa844","#7cc45a","#c1b494","#8d7b59","#c1b494","#8d7b59","#c1b494","#8d7b59","#c1b494","#8d7b59","#5aa844","#7cc45a","#5aa844","#68a54c","","","","","","","","","#68a54c","#7cc45a","#5aa844","#3f8a32","#c1b494","#8d7b59","#c1b494","#79694c"],["","","","","","","","","","","","","","","","","#4c8d39","#5aa844","#5aa844","#5aa844","#e6d6b0","#e6d6b0","#e6d6b0","#e6d6b0","#e6d6b0","#e6d6b0","#e6d6b0","#e6d6b0","#5aa844","#5aa844","#5aa844","#4c8d39","","","","","","","","","#4c8d39","#5aa844","#5aa844","#3f8a32","#e6d6b0","#e6d6b0","#e6d6b0","#c1b494"],["","","","","","","","","","","","","","","","","#4c8d39","#5aa844","#5aa844","#5aa844","#b8a47e","#cdb892","#cdb892","#cdb892","#b8a47e","#cdb892","#cdb892","#cdb892","#3f8a32","#5aa844","#5aa844","#4c8d39","","","","","","","","","#4c8d39","#5aa844","#5aa844","#5aa844","#b8a47e","#cdb892","#cdb892","#ac9b7b"],["","","","","","","","","","","","","","","","","#417931","#4c8d39","#4c8d39","#35742a","#cdb892","#cdb892","#b8a47e","#cdb892","#cdb892","#cdb892","#b8a47e","#cdb892","#4c8d39","#4c8d39","#35742a","#417931","","","","","","","","","#2d6324","#4c8d39","#35742a","#4c8d39","#cdb892","#cdb892","#b8a47e","#ac9b7b"],["","","","","","","","","","","","","","","","","","","","","#68a54c","#7cc45a","#7cc45a","#7cc45a","#3f8a32","#7cc45a","#7cc45a","#4c8d39","","","","","","","","","","","","","","","","","#4c8d39","#5aa844","#7cc45a","#4c8d39"],["","","","","","","","","","","","","","","","","","","","","#35742a","#3f8a32","#5aa844","#5aa844","#3f8a32","#3f8a32","#5aa844","#4c8d39","","","","","","","","","","","","","","","","","#4c8d39","#5aa844","#5aa844","#4c8d39"],["","","","","","","","","","","","","","","","","","","","","#35742a","#5aa844","#5aa844","#3f8a32","#5aa844","#3f8a32","#3f8a32","#4c8d39","","","","","","","","","","","","","","","","","#4c8d39","#3f8a32","#5aa844","#35742a"],["","","","","","","","","","","","","","","","","","","","","#417931","#35742a","#4c8d39","#4c8d39","#4c8d39","#4c8d39","#4c8d39","#417931","","","","","","","","","","","","","","","","","#417931","#4c8d39","#4c8d39","#417931"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "landmark"
      ],
  },
  {
    id: "mormon",
    name: "The Book of Mormon",
    grid: [
        "X",
        "X"
      ],
    color: [["#161e8a","#242fcc","#5664ff","#5664ff","#5664ff","#5664ff","#3341ff"],["#161e8a","#242fcc","#2a36e5","#e8d930","#e8d930","#e8d930","#3341ff"],["#161e8a","#242fcc","#2a36e5","#3341ff","#3341ff","#3341ff","#3341ff"],["#161e8a","#242fcc","#2a36e5","#e8d930","#e8d930","#3341ff","#3341ff"],["#161e8a","#242fcc","#2a36e5","#3341ff","#3341ff","#3341ff","#3341ff"],["#161e8a","#242fcc","#2a36e5","#e8d930","#e8d930","#e8d930","#3341ff"],["#161e8a","#242fcc","#2a36e5","#3341ff","#3341ff","#3341ff","#3341ff"],["#161e8a","#242fcc","#2a36e5","#b9a922","#b9a922","#b9a922","#3341ff"],["#161e8a","#242fcc","#2a36e5","#3341ff","#3341ff","#3341ff","#3341ff"],["#161e8a","#242fcc","#2a36e5","#3341ff","#3341ff","#3341ff","#3341ff"],["#161e8a","#242fcc","#2a36e5","#3341ff","#3341ff","#3341ff","#3341ff"],["#161e8a","#242fcc","#2a36e5","#3341ff","#e8d930","#3341ff","#3341ff"],["#161e8a","#242fcc","#2a36e5","#3341ff","#3341ff","#3341ff","#3341ff"],["#161e8a","#242fcc","#242fcc","#242fcc","#242fcc","#242fcc","#242fcc"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 2,
        "intro": "Hello! Knocks on every door in the four columns under it, and everything in them comes down to answer, filling the gaps. They just want to talk.",
        "area": {
          "origin": [
            1,
            0
          ],
          "grid": [
            "....",
            "||||"
          ]
        },
        "help": 4
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
    tags: [
        "scripture"
      ],
  },
  {
    id: "tiniest",
    name: "the worlds tiniest volion",
    grid: [
        "X",
        "X"
      ],
    color: [["#5c5c5c","#653939","#2c2e3a","#a86767","#5c5c5c"],["#5c5c5c","#5c5c5c","#2c2e3a","#5c5c5c","#5c5c5c"],["#5c5c5c","#653939","#2c2e3a","#a86767","#5c5c5c"],["#653939","#a86767","#2c2e3a","#a86767","#a86767"],["#653939","#a86767","#2c2e3a","#a86767","#d89797"],["#5c5c5c","#653939","#a86767","#d89797","#5c5c5c"],["#653939","#a86767","#a86767","#a86767","#d89797"],["#653939","#a86767","#2c2e3a","#a86767","#d89797"],["#653939","#653939","#2c2e3a","#a86767","#a86767"],["#5c5c5c","#653939","#2c2e3a","#a86767","#5c5c5c"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "censored",
    name: "(censored)",
    grid: [
        "XXXXXX",
        "XXXXXX",
        "XXXXXX",
        "XXXXXX",
        "XXXXXX"
      ],
    color: [["#573529","#1f2623","#a46751","#b39980","#e06d08","#a4502d"],["#261e18","#25292a","#837b72","#816f62","#d8580d","#653a25"],["#482417","#aa461e","#966a5d","#c17e5c","#cd570c","#382319"],["#7d340b","#573529","#be6724","#a4502d","#c9510a","#cd570c"],["#b39980","#2a1106","#782f12","#464e4b","#cb7135","#b3621e"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "steel",
    name: "a pound of steel",
    grid: [
        "X"
      ],
    color: "#6e6e6e",
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "rapunzels",
    name: "Rapunzel's long beautiful hair",
    grid: [
        "X",
        "X",
        "X",
        "X",
        "X",
        "X",
        "X",
        "X",
        "X",
        "X",
        "X"
      ],
    color: [["#e0c8b0","#b5794e","#c48553","#c08053","#492e25","#6a4733","#faf3f4"],["#fbf6fa","#c58653","#bb7c4f","#b5754b","#b0764f","#845539","#f8eee9"],["#fbf8fd","#ce8e5c","#ad6f46","#75462f","#b47950","#9a6343","#f9efe9"],["#f4ecec","#8e5a39","#a66a44","#8f5b3c","#c18458","#ac7149","#faf2f3"],["#b1896e","#493025","#6b412d","#815235","#b97c50","#c48557","#faf7fd"],["#956649","#553525","#30201d","#88593e","#9b6544","#cc8d5e","#fbf8fd"],["#9e6d4a","#744931","#71472f","#784f37","#86553a","#c1885b","#fbf8fd"],["#b68865","#855137","#a46a45","#633e2d","#7f5037","#573629","#faf8fb"],["#f5edef","#95603c","#bf7f55","#c08357","#563827","#785237","#faf4f5"],["#fbf8fd","#b5774f","#c6875b","#af744b","#825339","#ae754d","#f9ede8"],["#f2edec","#b27953","#b0724c","#966344","#ad734d","#bc7f56","#eacaac"],["#956d50","#372620","#8d5639","#86583f","#b1754d","#bd8054","#e2b791"],["#8f603e","#664130","#452d23","#87593c","#b67b54","#c4875a","#e8be98"],["#976744","#7c5135","#87563a","#724b32","#a16b48","#c78a5d","#f8f1ef"],["#916040","#7e5037","#b17551","#7a4f37","#815239","#a46c46","#eddbd0"],["#aa7b5a","#946042","#c4875b","#be8155","#714832","#7b4e33","#7d5032"],["#f4ecec","#b1764d","#bd8052","#c3865a","#4d3024","#6f4830","#714a32"],["#faf8fc","#c4875b","#c7885b","#be8154","#764d36","#946143","#815436"],["#ae8167","#a16844","#9b5e3c","#945c3b","#a06a44","#ba7d54","#915e3d"],["#bf8259","#492e20","#7d4b31","#7a4c30","#794b2d","#b77a4f","#ac734b"],["#aa6f47","#683e28","#673e2a","#7e5236","#8b5738","#b97b4f","#bf8559"],["#b4774f","#9a6040","#815236","#74492f","#7c4b2e","#a56940","#c98f5b"],["#b4774c","#b8794e","#a46a40","#6a422d","#7d4f32","#9b603a","#a27148"],["#b77950","#b87b4e","#ab6d46","#5d3728","#6e432b","#73452d","#8e5b3c"],["#b6784d","#bc7c4e","#bb7b4f","#ae734d","#593725","#9f6440","#a56c45"],["#fbf8fd","#a78168","#915934","#6a4229","#55301c","#5c3523","#c38858"],["#fbf8fd","#634029","#b16f45","#a16741","#533123","#814d31","#ce925c"],["#fbf8fd","#362015","#b27246","#b8794c","#513321","#a16641","#cc8c5a"],["#f9f5f9","#3a261a","#885532","#9d613b","#885636","#ae7145","#cb8f5c"],["#f1e9e3","#482a1b","#5d3726","#6c3f25","#a0663f","#b27349","#d39d69"],["#ead1bf","#6b422a","#321e16","#45291d","#ab7043","#b6774a","#f9f2f0"],["#c39777","#764528","#5e3622","#563a2b","#b2754e","#c58654","#f9f8fd"],["#b1815a","#965c37","#955e3b","#603d2a","#ac7249","#af744b","#fbf8fd"],["#bf936d","#9f663f","#b27348","#a46d49","#905c3d","#5c3726","#fbf7fd"],["#d9b99e","#b0714b","#c08151","#c08154","#613c2c","#5b3c2b","#faf5f7"],["#f6f0f1","#be7f51","#be7f52","#bd7e51","#9a6546","#81553a","#f9efeb"],["#fbf8fd","#d2905d","#b1734a","#865436","#aa734a","#925e3e","#f8f0ea"],["#f6f4f6","#ac7144","#aa6d45","#915c3e","#c3875a","#b17751","#faf0ef"],["#cdb4a2","#3a261c","#835035","#865638","#bc7f52","#ba7d52","#faf7fc"],["#96694d","#4b3025","#3e2923","#845439","#ab734c","#cb8c5d","#fbf8fd"],["#976644","#6c422d","#5a3b2c","#80553a","#86553a","#c78e5b","#fbf8fd"],["#aa7a59","#825135","#955e3d","#6a4432","#835237","#5e3a2a","#faf8fd"],["#e7d7cf","#8d5c3c","#b6794f","#ad7450","#69432e","#63402b","#faf5f6"],["#fbf8fd","#ae6f4a","#c5865b","#b6794e","#603f2c","#a46c45","#f9f1ef"],["#faf7fb","#c58657","#ba7c54","#9f6843","#a76f4a","#b97d55","#f3dcc8"],["#b1886f","#2d1f1b","#9a603f","#85583e","#b2774f","#bd7f54","#e6bc9a"],["#8e603f","#563829","#633d2c","#86573a","#b57a52","#bf8254","#e8bb90"],["#956342","#754930","#774c35","#784d35","#ae754e","#c48759","#f3e3d6"],["#936343","#7b5035","#9a6341","#66402f","#88563c","#a96e48","#faf5f8"],["#9b6b4a","#8e5c3f","#c1845a","#b5774f","#714630","#875536","#9a6847"],["#e5cdc1","#a46c48","#c58659","#c08357","#5c3829","#5b3b2c","#6f4731"],["#fbf8fd","#bb7e52","#c28257","#c28456","#68412e","#915f41","#7b5035"],["#d5bda9","#b5774e","#a1653e","#a16741","#ae764c","#ad714a","#845434"],["#af774e","#422a1f","#73442c","#7b4b30","#7a4b30","#bd8054","#a56c46"],["#ac7147","#6b3f2a","#814f34","#835336","#895638","#ad6e42","#ba7f54"],["#af734a","#835139","#6f452f","#73472e","#845336","#a96d43","#c18355"],["#ae7248","#b2764a","#9d643b","#6e462e","#805034","#9f623e","#d9a97b"],["#b4784f","#b77a4c","#a2653e","#5d3829","#774b2f","#945c3a","#94613e"],["#b5784b","#b7794d","#b7774e","#9e6b47","#5b3929","#804e33","#966341"],["#c48756","#be8050","#bf8052","#815133","#b4774d","#c28558","#c1936b"],["#ead3c5","#c38252","#b97a4e","#a96e43","#ae6f45","#cb8d5d","#faf5f9"],["#fbf8fd","#c78957","#9b613e","#855131","#9f613d","#cf9867","#fbf8fd"],["#fbf8fd","#fbf8fd","#452b1d","#603c28","#77543b","#fbf8fd","#fbf8fd"],["#fbf8fd","#fbf8fd","#61422f","#5a3a28","#523325","#faf8fd","#fbf8fd"],["#fbf8fd","#faf7fa","#945c38","#8f5633","#613a23","#af794e","#fbf8fd"],["#fbf8fd","#b97e4e","#945b35","#a0643e","#6d4027","#8c5834","#f3e6dd"],["#faf6fc","#845233","#b5784a","#955b38","#734328","#9a603d","#aa7a51"],["#f0eae1","#7c4b2e","#b77849","#9d6340","#865333","#985d35","#ae7b50"],["#f5efe3","#744327","#a4643a","#a9673b","#72462c","#a06238","#b27d52"],["#f5eee5","#79482c","#955a33","#ad6d3d","#71462f","#8e5535","#875735"],["#ede6e3","#7c4c2a","#955a36","#a86738","#704126","#95623e","#ab7b57"],["#faf6fc","#794a28","#955f39","#9c5f34","#9f653e","#693d21","#f6eaea"],["#f3f1f1","#8d5833","#af7343","#6b3f29","#a96c40","#754425","#faf5fb"],["#ece0da","#d3a579","#9f6338","#5e3826","#965c37","#b57e50","#faf7fb"],["#f9f6fc","#e6ceb7","#703e1f","#683b21","#9b5d38","#ecd2b7","#fbf8fb"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "sock",
    name: "a tube sock",
    grid: [
        "X.",
        "X.",
        "X.",
        "X.",
        "X.",
        "XX"
      ],
    color: [["#f6f6ea","#f6f6ea","#e2e2d5","","",""],["#c84141","#d44949","#c84141","","",""],["#cdcdc6","#f6f6ea","#e2e2d5","","",""],["#c84141","#d44949","#c84141","","",""],["#cdcdc6","#f6f6ea","#e2e2d5","","",""],["#c84141","#d44949","#c84141","","",""],["#cdcdc6","#f6f6ea","#e2e2d5","","",""],["#cdcdc6","#f6f6ea","#e2e2d5","","",""],["#cdcdc6","#f6f6ea","#e2e2d5","","",""],["#cdcdc6","#f6f6ea","#e2e2d5","","",""],["#cdcdc6","#f6f6ea","#e2e2d5","","",""],["#cdcdc6","#f6f6ea","#e2e2d5","","",""],["#cdcdc6","#f6f6ea","#e2e2d5","","",""],["#bdbdb7","#f6f6ea","#e2e2d5","","",""],["#bdbdb7","#f6f6ea","#e2e2d5","","",""],["#e2e2d5","#f6f6ea","#e2e2d5","#e2e2d5","#bdbdb7","#bdbdb7"],["#e2e2d5","#e2e2d5","#f6f6ea","#f6f6ea","#f6f6ea","#e2e2d5"],["#bdbdb7","#e2e2d5","#cdcdc6","#bdbdb7","#cdcdc6","#e2e2d5"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "fancy",
    name: "a very fancy hat",
    grid: [
        ".X.",
        ".X.",
        ".X.",
        ".X.",
        ".X.",
        ".X.",
        "XXX"
      ],
    color: [["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#3f3731","#51453d","#51453d","","",""],["","","","#940047","#940047","#940047","","",""],["","","","#940047","#940047","#940047","","",""],["#3f3731","#3f3731","#3f3731","#51453d","#51453d","#51453d","#51453d","#51453d","#51453d"],["#3f3731","#3f3731","#51453d","#51453d","#51453d","#51453d","#51453d","#51453d","#51453d"],["#3f3731","#51453d","#51453d","#51453d","#51453d","#51453d","#51453d","#51453d","#51453d"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "importand",
    name: "an importand stack of buisness papers, for buisness",
    grid: [
        "X",
        "X",
        "X",
        "X",
        "X"
      ],
    color: [["#a1a1a1","#e3e3e3","#a1a1a1","#7e7c7c","#c9c5c5"],["#a1a1a1","#e3e3e3","#a1a1a1","#7e7c7c","#c9c5c5"],["#a1a1a1","#e3e3e3","#c9c5c5","#7e7c7c","#c9c5c5"],["#404040","#404040","#404040","#404040","#404040"],["#c7c7c7","#c7c7c7","#c7c7c7","#c7c7c7","#dedede"],["#8a8a8a","#5e5e5e","#5e5e5e","#5e5e5e","#5e5e5e"],["#dedede","#c7c7c7","#c7c7c7","#c7c7c7","#c7c7c7"],["#8a8a8a","#8a8a8a","#8a8a8a","#8a8a8a","#8a8a8a"],["#5e5e5e","#5e5e5e","#1c1c1c","#1c1c1c","#1c1c1c"],["#dedede","#8a8a8a","#8a8a8a","#8a8a8a","#8a8a8a"],["#dedede","#c7c7c7","#c7c7c7","#c7c7c7","#c7c7c7"],["#8a8a8a","#8a8a8a","#5e5e5e","#5e5e5e","#8a8a8a"],["#dedede","#dedede","#dedede","#dedede","#dedede"],["#5e5e5e","#5e5e5e","#5e5e5e","#5e5e5e","#5e5e5e"],["#dedede","#dedede","#1c1c1c","#1c1c1c","#1c1c1c"],["#c7c7c7","#c7c7c7","#c7c7c7","#c7c7c7","#c7c7c7"],["#1c1c1c","#5e5e5e","#5e5e5e","#5e5e5e","#5e5e5e"],["#dedede","#dedede","#dedede","#dedede","#dedede"],["#5e5e5e","#5e5e5e","#1c1c1c","#1c1c1c","#1c1c1c"],["#dedede","#dedede","#c7c7c7","#c7c7c7","#c7c7c7"],["#c7c7c7","#c7c7c7","#dedede","#dedede","#dedede"],["#1c1c1c","#1c1c1c","#1c1c1c","#5e5e5e","#5e5e5e"],["#dedede","#dedede","#dedede","#dedede","#dedede"],["#5e5e5e","#5e5e5e","#1c1c1c","#1c1c1c","#8a8a8a"],["#c7c7c7","#c7c7c7","#c7c7c7","#c7c7c7","#5e5e5e"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "nuclear",
    name: "one barrel of nuclear waste",
    grid: [
        "X",
        "X"
      ],
    color: [["#818820","#63ed31","#63ed31","#63ed31","#63ed31"],["#818820","#bbe000","#96e421","#63ed31","#63ed31"],["#818820","#d1e000","#d1e000","#63ed31","#bcc723"],["#818820","#a7b120","#a7b120","#a7b120","#a7b120"],["#818820","#bcc723","#d1e000","#bbe000","#bcc723"],["#818820","#d1e000","#d1e000","#63ed31","#bcc723"],["#818820","#a7b120","#a7b120","#a7b120","#a7b120"],["#818820","#bcc723","#d1e000","#d1e000","#bcc723"],["#818820","#d1e000","#d1e000","#d1e000","#bcc723"],["#383838","#818820","#383838","#818820","#383838"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "boulder",
    name: "a small boulder",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#141414","#141414","#454545","#6e6e6e","#8f8f8f","#454545","#454545","#6e6e6e","#454545","#141414"],["#141414","#454545","#8f8f8f","#8f8f8f","#8f8f8f","#8f8f8f","#6e6e6e","#6e6e6e","#6e6e6e","#454545"],["#454545","#8f8f8f","#8f8f8f","#8f8f8f","#bfbaba","#bfbaba","#bfbaba","#bfbaba","#7c8d81","#7c8d81"],["#454545","#8f8f8f","#8f8f8f","#8f8f8f","#8f8f8f","#8f8f8f","#8f8f8f","#496e4e","#496e4e","#496e4e"],["#6e6e6e","#8f8f8f","#bfbaba","#bfbaba","#8f8f8f","#8f8f8f","#7c8d81","#7c8d81","#8f8f8f","#8f8f8f"],["#496e4e","#496e4e","#8f8f8f","#8f8f8f","#7c8d81","#7c8d81","#7c8d81","#637465","#7c8d81","#7c8d81"],["#bfbaba","#bfbaba","#bfbaba","#7c8d81","#7c8d81","#637465","#637465","#bfbaba","#bfbaba","#637465"],["#6e6e6e","#8f8f8f","#7c8d81","#637465","#637465","#496e4e","#637465","#637465","#637465","#202c22"],["#454545","#7c8d81","#637465","#496e4e","#496e4e","#496e4e","#496e4e","#496e4e","#496e4e","#202c22"],["#454545","#637465","#496e4e","#496e4e","#496e4e","#496e4e","#425c46","#425c46","#425c46","#425c46"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "congealed",
    name: "a solid cube of congealed gelatine",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#7cd080","#7cd080","#84d788","#84d788","#84d788","#84d788","#84d788","#84d788","#84d788","#84d788","#7cd080","#7cd080"],["#7cd080","#d6ffdd","#d6ffdd","#98eb9c","#98eb9c","#9bf39f","#9bf39f","#9bf39f","#98eb9c","#98eb9c","#98eb9c","#7cd080"],["#84d788","#d6ffdd","#d6ffdd","#9ffea5","#9ffea5","#9ffea5","#9ffea5","#9ffea5","#9ffea5","#9dfba3","#98eb9c","#84d788"],["#84d788","#d6ffdd","#d6ffdd","#9ffea5","#9ffea5","#9ffea5","#8bf992","#9ffea5","#8bf992","#9ffea5","#98eb9c","#84d788"],["#84d788","#d6ffdd","#d6ffdd","#9ffea5","#9ffea5","#9ffea5","#8bf992","#9ffea5","#8bf992","#9ffea5","#98eb9c","#84d788"],["#84d788","#9bf39f","#9ffea5","#8bf992","#9ffea5","#8bf992","#9ffea5","#9ffea5","#8bf992","#9ffea5","#9bf39f","#84d788"],["#84d788","#9bf39f","#9ffea5","#8bf992","#9ffea5","#8bf992","#9ffea5","#9ffea5","#8bf992","#9ffea5","#9bf39f","#84d788"],["#84d788","#9bf39f","#9ffea5","#8bf992","#9ffea5","#8bf992","#9ffea5","#9ffea5","#9ffea5","#9ffea5","#9bf39f","#84d788"],["#84d788","#98eb9c","#9ffea5","#8bf992","#9ffea5","#9ffea5","#9ffea5","#9ffea5","#9ffea5","#8bf992","#98eb9c","#84d788"],["#84d788","#98eb9c","#9dfba3","#9ffea5","#9ffea5","#9ffea5","#9ffea5","#9ffea5","#9ffea5","#8bf992","#98eb9c","#84d788"],["#7cd080","#98eb9c","#98eb9c","#98eb9c","#9bf39f","#9bf39f","#9bf39f","#9bf39f","#98eb9c","#8bf992","#98eb9c","#7cd080"],["#7cd080","#7cd080","#84d788","#84d788","#84d788","#84d788","#84d788","#84d788","#84d788","#84d788","#7cd080","#7cd080"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "mirror",
    name: "a cursed mirror that shows you where you will die",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#a18e4a","#a18e4a","#a18e4a","#fecc16","#f5d870","#fecc16","#f5d870","#f5d870","#fecc16","#f5d870","#fecc16","#a18e4a","#a18e4a","#a18e4a"],["#a18e4a","#f5d870","#a18e4a","#a18e4a","#fecc16","#a18e4a","#fecc16","#fecc16","#a18e4a","#fecc16","#a18e4a","#a18e4a","#f5d870","#a18e4a"],["#a18e4a","#a18e4a","#9be3e8","#9be3e8","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9be3e8","#9be3e8","#a18e4a","#a18e4a"],["#fecc16","#a18e4a","#9be3e8","#9ef9ff","#9ef9ff","#e4f6f7","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9be3e8","#a18e4a","#fecc16"],["#f5d870","#fecc16","#9ef9ff","#9ef9ff","#e4f6f7","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#fecc16","#f5d870"],["#fecc16","#a18e4a","#9ef9ff","#e4f6f7","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#4d0000","#9ef9ff","#9ef9ff","#9ef9ff","#a18e4a","#fecc16"],["#f5d870","#fecc16","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#4d0000","#4d0000","#9ef9ff","#9ef9ff","#fecc16","#f5d870"],["#f5d870","#fecc16","#9ef9ff","#4d0000","#4d0000","#4d0000","#4d0000","#4d0000","#4d0000","#4d0000","#4d0000","#9ef9ff","#fecc16","#f5d870"],["#fecc16","#a18e4a","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#4d0000","#4d0000","#9ef9ff","#9ef9ff","#a18e4a","#fecc16"],["#f5d870","#fecc16","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#e4f6f7","#4d0000","#9ef9ff","#9ef9ff","#9ef9ff","#fecc16","#f5d870"],["#fecc16","#a18e4a","#9be3e8","#9ef9ff","#9ef9ff","#9ef9ff","#e4f6f7","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9be3e8","#a18e4a","#fecc16"],["#a18e4a","#a18e4a","#9be3e8","#9be3e8","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9be3e8","#9be3e8","#a18e4a","#a18e4a"],["#a18e4a","#f5d870","#a18e4a","#a18e4a","#fecc16","#a18e4a","#fecc16","#fecc16","#a18e4a","#fecc16","#a18e4a","#a18e4a","#f5d870","#a18e4a"],["#a18e4a","#a18e4a","#a18e4a","#fecc16","#f5d870","#fecc16","#f5d870","#f5d870","#fecc16","#f5d870","#fecc16","#a18e4a","#a18e4a","#a18e4a"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "raviolo",
    name: "one raviolo",
    grid: [
        "X"
      ],
    color: [["#fef0be","#c2a747","#fef0be","#c2a747","#fef0be","#c2a747","#ffe894"],["#c2a747","#c2a747","#c2a747","#c2a747","#c2a747","#c2a747","#c2a747"],["#fef0be","#c2a747","#fef0be","#fef0be","#ffe894","#c2a747","#ffe894"],["#c2a747","#c2a747","#ffe894","#ffe894","#ffe894","#c2a747","#c2a747"],["#ffe894","#c2a747","#ffe894","#ffe894","#ffe894","#c2a747","#ffe894"],["#c2a747","#c2a747","#c2a747","#c2a747","#c2a747","#c2a747","#c2a747"],["#ffe894","#c2a747","#ffe894","#c2a747","#ffe894","#c2a747","#ffe894"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "mirrormean",
    name: "a mirror that says if you are pretty",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#a18e4a","#a18e4a","#a18e4a","#fecc16","#f5d870","#fecc16","#f5d870","#f5d870","#fecc16","#f5d870","#fecc16","#a18e4a","#a18e4a","#a18e4a"],["#a18e4a","#f5d870","#a18e4a","#a18e4a","#fecc16","#a18e4a","#fecc16","#fecc16","#a18e4a","#fecc16","#a18e4a","#a18e4a","#f5d870","#a18e4a"],["#a18e4a","#a18e4a","#9be3e8","#9be3e8","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9be3e8","#9be3e8","#a18e4a","#a18e4a"],["#fecc16","#a18e4a","#9be3e8","#9ef9ff","#9ef9ff","#e4f6f7","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9be3e8","#a18e4a","#fecc16"],["#f5d870","#fecc16","#9ef9ff","#9ef9ff","#e4f6f7","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#fecc16","#f5d870"],["#fecc16","#a18e4a","#9ef9ff","#4d0000","#9ef9ff","#9ef9ff","#4d0000","#9ef9ff","#4d0000","#4d0000","#4d0000","#9ef9ff","#a18e4a","#fecc16"],["#f5d870","#fecc16","#9ef9ff","#4d0000","#4d0000","#9ef9ff","#4d0000","#9ef9ff","#4d0000","#9ef9ff","#4d0000","#9ef9ff","#fecc16","#f5d870"],["#f5d870","#fecc16","#9ef9ff","#4d0000","#9ef9ff","#4d0000","#4d0000","#9ef9ff","#4d0000","#9ef9ff","#4d0000","#9ef9ff","#fecc16","#f5d870"],["#fecc16","#a18e4a","#9ef9ff","#4d0000","#9ef9ff","#9ef9ff","#4d0000","#9ef9ff","#4d0000","#4d0000","#4d0000","#9ef9ff","#a18e4a","#fecc16"],["#f5d870","#fecc16","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#e4f6f7","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#fecc16","#f5d870"],["#fecc16","#a18e4a","#9be3e8","#9ef9ff","#9ef9ff","#9ef9ff","#e4f6f7","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9be3e8","#a18e4a","#fecc16"],["#a18e4a","#a18e4a","#9be3e8","#9be3e8","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9ef9ff","#9be3e8","#9be3e8","#a18e4a","#a18e4a"],["#a18e4a","#f5d870","#a18e4a","#a18e4a","#fecc16","#a18e4a","#fecc16","#fecc16","#a18e4a","#fecc16","#a18e4a","#a18e4a","#f5d870","#a18e4a"],["#a18e4a","#a18e4a","#a18e4a","#fecc16","#f5d870","#fecc16","#f5d870","#f5d870","#fecc16","#f5d870","#fecc16","#a18e4a","#a18e4a","#a18e4a"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "millipede",
    name: "a cute little millipede curled into a ball",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#86362d","#732e26","#86362d","#732e26","#86362d","#732e26","#86362d","#732e26","#86362d","#732e26"],["#251918","#251918","#251918","#251918","#251918","#251918","#251918","#251918","#251918","#86362d"],["#86362d","#732e26","#86362d","#732e26","#86362d","#732e26","#86362d","#732e26","#251918","#732e26"],["#732e26","#251918","#251918","#251918","#251918","#251918","#251918","#86362d","#251918","#86362d"],["#86362d","#251918","#86362d","#732e26","#86362d","#732e26","#251918","#732e26","#251918","#732e26"],["#732e26","#251918","#732e26","#251918","#251918","#86362d","#251918","#86362d","#251918","#86362d"],["#86362d","#251918","#86362d","#251918","#251918","#251918","#251918","#732e26","#251918","#732e26"],["#732e26","#251918","#732e26","#86362d","#732e26","#86362d","#732e26","#86362d","#251918","#86362d"],["#86362d","#251918","#251918","#251918","#251918","#251918","#251918","#251918","#251918","#732e26"],["#732e26","#86362d","#732e26","#86362d","#732e26","#86362d","#732e26","#86362d","#732e26","#86362d"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "illusion",
    name: "the illusion of time",
    grid: [
        "XX",
        ".X"
      ],
    color: [["#363636","#363636","#9e9e9e","#9e9e9e","#9e9e9e","#9e9e9e","#9e9e9e","#9e9e9e","#363636","#363636"],["#363636","#9e9e9e","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#9e9e9e","#363636"],["#9e9e9e","#ffffff","#ffffff","#303030","#303030","#303030","#ffffff","#ffffff","#ffffff","#9e9e9e"],["#363636","#9e9e9e","#ffffff","#ffffff","#ffffff","#ffffff","#303030","#ffffff","#ffffff","#9e9e9e"],["#363636","#363636","#9e9e9e","#9e9e9e","#9e9e9e","#ffffff","#ffffff","#303030","#ffffff","#9e9e9e"],["","","","","","#9e9e9e","#ffffff","#303030","#ffffff","#9e9e9e"],["","","","","","#9e9e9e","#ffffff","#303030","#ffffff","#9e9e9e"],["","","","","","#9e9e9e","#ffffff","#ffffff","#ffffff","#9e9e9e"],["","","","","","#363636","#9e9e9e","#ffffff","#9e9e9e","#363636"],["","","","","","#363636","#363636","#9e9e9e","#363636","#363636"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "snowflakes",
    name: "two perfectly identical snowflakes",
    grid: [
        "X..X"
      ],
    color: [["#a4befe","#102047","#102047","#a4befe","#102047","#102047","#a4befe","","","","","","","","","","","","","","","#a4befe","#102047","#102047","#a4befe","#102047","#102047","#a4befe"],["#102047","#a4befe","#102047","#a4befe","#102047","#a4befe","#102047","","","","","","","","","","","","","","","#102047","#a4befe","#102047","#a4befe","#102047","#a4befe","#102047"],["#102047","#102047","#a4befe","#a4befe","#a4befe","#102047","#102047","","","","","","","","","","","","","","","#102047","#102047","#a4befe","#a4befe","#a4befe","#102047","#102047"],["#a4befe","#a4befe","#a4befe","#102047","#a4befe","#a4befe","#a4befe","","","","","","","","","","","","","","","#a4befe","#a4befe","#a4befe","#102047","#a4befe","#a4befe","#a4befe"],["#102047","#102047","#a4befe","#a4befe","#a4befe","#102047","#102047","","","","","","","","","","","","","","","#102047","#102047","#a4befe","#a4befe","#a4befe","#102047","#102047"],["#102047","#a4befe","#102047","#a4befe","#102047","#a4befe","#102047","","","","","","","","","","","","","","","#102047","#a4befe","#102047","#a4befe","#102047","#a4befe","#102047"],["#a4befe","#102047","#102047","#a4befe","#102047","#102047","#a4befe","","","","","","","","","","","","","","","#a4befe","#102047","#102047","#a4befe","#102047","#102047","#a4befe"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "bone",
    name: "big fish head bone",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#807d5b","#807d5b","#807d5b","#807d5b","#000c47","#000c47","#000c47","#000c47"],["#807d5b","#2e2e2e","#2e2e2e","#807d5b","#807d5b","#000c47","#000c47","#000c47"],["#807d5b","#2e2e2e","#2e2e2e","#807d5b","#807d5b","#807d5b","#807d5b","#000c47"],["#807d5b","#807d5b","#807d5b","#807d5b","#807d5b","#807d5b","#807d5b","#807d5b"],["#807d5b","#807d5b","#807d5b","#807d5b","#807d5b","#807d5b","#807d5b","#807d5b"],["#807d5b","#000c47","#ddd688","#000c47","#ddd688","#000c47","#ddd688","#000c47"],["#807d5b","#000c47","#000c47","#ddd688","#000c47","#ddd688","#000c47","#ddd688"],["#807d5b","#807d5b","#807d5b","#807d5b","#807d5b","#807d5b","#807d5b","#807d5b"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "florgenorflepus",
    name: "a fresh wet florgnorfepus",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#102d2b","#264b48","#264b48","#264b48","#102d2b","#102d2b"],["#264b48","#4fc492","#264b48","#4fc492","#4fc492","#102d2b"],["#264b48","#4fc492","#4fc492","#25b677","#25b677","#102d2b"],["#264b48","#4fc492","#25b677","#25b677","#264b48","#264b48"],["#102d2b","#25b677","#264b48","#25b677","#25b677","#264b48"],["#102d2b","#264b48","#264b48","#264b48","#102d2b","#102d2b"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    nextShapeProbs: [
        0.15,
        0.1,
        0.1
      ],
    nextShapes: [
        "florgnorfepus_egg",
        "plorbs",
        "snorfwiggle"
      ],
    tags: [
        "squelchy"
      ],
  },
  {
    id: "message",
    name: "tv static with a hidden message inside",
    grid: [
        "XXX",
        "XXX"
      ],
    color: [["#ababab","#383838","#4f4f4f","#4f4f4f","#e3e3e3","#e3e3e3","#ababab","#c2c2c2","#4f4f4f","#4f4f4f","#ababab","#e3e3e3","#9e9e9e","#ababab","#ababab","#4f4f4f","#c2c2c2","#9e9e9e","#9e9e9e","#ababab","#c2c2c2"],["#e3e3e3","#9e9e9e","#e3e3e3","#383838","#c2c2c2","#383838","#ababab","#383838","#c2c2c2","#383838","#9e9e9e","#e3e3e3","#9e9e9e","#4f4f4f","#c2c2c2","#4f4f4f","#4f4f4f","#c2c2c2","#4f4f4f","#e3e3e3","#ababab"],["#383838","#e3e3e3","#9e9e9e","#4f4f4f","#e3e3e3","#e3e3e3","#000000","#9e9e9e","#000000","#ababab","#383838","#4f4f4f","#e3e3e3","#4f4f4f","#c2c2c2","#c2c2c2","#4f4f4f","#9e9e9e","#4f4f4f","#000000","#000000"],["#ababab","#ababab","#4f4f4f","#9e9e9e","#e3e3e3","#e3e3e3","#4f4f4f","#ababab","#9e9e9e","#9e9e9e","#383838","#c2c2c2","#ababab","#4f4f4f","#4f4f4f","#c2c2c2","#ababab","#4f4f4f","#c2c2c2","#ababab","#ababab"],["#ababab","#383838","#e3e3e3","#4f4f4f","#e3e3e3","#c2c2c2","#e3e3e3","#383838","#383838","#383838","#e3e3e3","#ababab","#ababab","#000000","#4f4f4f","#000000","#4f4f4f","#ababab","#e3e3e3","#ababab","#9e9e9e"],["#383838","#4f4f4f","#e3e3e3","#9e9e9e","#e3e3e3","#c2c2c2","#e3e3e3","#c2c2c2","#383838","#e3e3e3","#4f4f4f","#9e9e9e","#c2c2c2","#c2c2c2","#ababab","#4f4f4f","#9e9e9e","#4f4f4f","#4f4f4f","#000000","#9e9e9e"],["#c2c2c2","#4f4f4f","#4f4f4f","#e3e3e3","#000000","#4f4f4f","#e3e3e3","#383838","#ababab","#e3e3e3","#4f4f4f","#ababab","#383838","#000000","#e3e3e3","#9e9e9e","#000000","#4f4f4f","#c2c2c2","#9e9e9e","#9e9e9e"],["#4f4f4f","#000000","#383838","#4f4f4f","#ababab","#e3e3e3","#383838","#383838","#ababab","#c2c2c2","#000000","#383838","#ababab","#e3e3e3","#ababab","#ababab","#e3e3e3","#c2c2c2","#e3e3e3","#ababab","#e3e3e3"],["#c2c2c2","#e3e3e3","#e3e3e3","#4f4f4f","#e3e3e3","#e3e3e3","#c2c2c2","#383838","#383838","#383838","#c2c2c2","#e3e3e3","#383838","#383838","#e3e3e3","#c2c2c2","#000000","#4f4f4f","#e3e3e3","#4f4f4f","#e3e3e3"],["#9e9e9e","#4f4f4f","#e3e3e3","#4f4f4f","#c2c2c2","#4f4f4f","#c2c2c2","#ababab","#e3e3e3","#4f4f4f","#383838","#9e9e9e","#383838","#4f4f4f","#000001","#ababab","#e3e3e3","#e3e3e3","#000001","#f0f0f0","#383838"],["#9e9e9e","#9e9e9e","#9e9e9e","#ababab","#4f4f4f","#e3e3e3","#4f4f4f","#9e9e9e","#c2c2c2","#e3e3e3","#ababab","#383838","#e3e3e3","#4f4f4f","#000001","#f0f0f0","#e3e3e3","#4f4f4f","#e3e3e3","#ababab","#e3e3e3"],["#c2c2c2","#383838","#000000","#c2c2c2","#e3e3e3","#4f4f4f","#4f4f4f","#4f4f4f","#c2c2c2","#9e9e9e","#4f4f4f","#000000","#4f4f4f","#f0f0f0","#000001","#000001","#000001","#e3e3e3","#000001","#f0f0f0","#383838"],["#4f4f4f","#ababab","#383838","#ababab","#ababab","#383838","#383838","#9e9e9e","#e3e3e3","#000000","#e3e3e3","#000000","#e3e3e3","#4f4f4f","#000001","#e3e3e3","#000001","#e3e3e3","#000001","#e3e3e3","#000000"],["#ababab","#ababab","#c2c2c2","#ababab","#383838","#c2c2c2","#383838","#383838","#9e9e9e","#e3e3e3","#383838","#c2c2c2","#383838","#ababab","#9e9e9e","#4f4f4f","#9e9e9e","#4f4f4f","#e3e3e3","#ababab","#383838"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "rasberry",
    name: "a blue rasberry",
    grid: [
        "XX",
        "XX",
        "XX"
      ],
    color: [["#297fdb","#75e3ff","#2875c8","#297fdb","#75e3ff","#2875c8"],["#094d95","#297fdb","#094d95","#094d95","#297fdb","#094d95"],["#2875c8","#094d95","#094d95","#2875c8","#094d95","#094d95"],["#297fdb","#75e3ff","#2875c8","#094d95","#75e3ff","#2875c8"],["#094d95","#297fdb","#094d95","#58a8fe","#297fdb","#094d95"],["#2875c8","#094d95","#094d95","#2875c8","#094d95","#094d95"],["#094d95","#75e3ff","#2875c8","#094d95","#75e3ff","#2875c8"],["#2875c8","#58a8fe","#094d95","#58a8fe","#2875c8","#094d95"],["#000f1f","#094d95","#094d95","#094d95","#094d95","#000f1f"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "square",
    name: "rectangular pizza",
    grid: [
        "XXXX",
        "XXXX"
      ],
    color: [["#e4ae3b","#c67f28","#e8b13e","#e6b03d","#c3832a","#e4ae3b","#e4ae3b","#c3832a","#c3832a","#c3832a","#e4ae3b","#e4ae3b","#e4ae3b","#e6b039","#c3832a","#e4ae3b"],["#d18f2f","#bb5111","#e7d7ba","#a92e15","#b72c10","#e4ddc3","#e6dcbf","#e6dcbf","#b12f12","#e6dcc2","#b3310c","#b92c10","#ebdbbd","#e3ddc2","#b72b0d","#cb7d2d"],["#e7b13d","#b92d10","#fdd9b4","#c65317","#bf4514","#b82c0f","#fcbfa5","#b92b0f","#b92c10","#d1711d","#e6dcc0","#e7dbc1","#b92c10","#b92c10","#b92c10","#c67f2e"],["#e4ae3a","#b92c10","#b92c10","#f3ddbd","#b32c12","#a33b1f","#e5dcc0","#b92c10","#af2f11","#e6ddc3","#b92c10","#b92c10","#e8dabf","#e5dcc2","#b42d11","#c3832a"],["#e5af3f","#b92c13","#e6dcc2","#b92c10","#b92c10","#b92c10","#b92c10","#bb2a0f","#4d6a29","#526a2b","#6d6625","#e6dcc2","#aa391b","#b92c10","#b92c10","#ca7d2f"],["#ecb141","#b92b10","#eadbc1","#b92c10","#e9d9c4","#f8c9af","#e3debc","#b92c10","#b92c10","#b92b10","#5d6426","#c54814","#b92b0f","#bb2a10","#b92c10","#c97d32"],["#c87e35","#b12e0a","#e5dcbf","#ead9bf","#b92c10","#b92c10","#a73012","#e3ddc2","#b52a0d","#e6dcc2","#e6dac0","#b92c10","#e4dbc1","#e6dcc2","#b72711","#c78036"],["#e4ae3b","#e09e38","#e6b03e","#e5af3b","#ecb23f","#e8b03c","#e9b03f","#ebaf40","#e5af3b","#e5af3b","#e6b03c","#e6b03c","#e5b03d","#e7af3c","#c77e34","#e4ae3b"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "ramen",
    name: "a delicious bowl of ramen",
    grid: [
        "XXXX",
        ".XX."
      ],
    color: [["#69a5bf","#cbfbfb","#cbfbfb","#cbfbfb","#cbfbfb","#cbfbfb","#e5ffff","#e5ffff","#e5ffff","#ebffff","#cbfbfb","#cbfbfb"],["#470000","#750000","#e60000","#e60000","#e60000","#e60000","#e60000","#fe8181","#fe8181","#e60000","#e60000","#470000"],["#0a1e61","#4e7da2","#69a5bf","#cbfbfb","#cbfbfb","#cbfbfb","#e5ffff","#e5ffff","#cbfbfb","#cbfbfb","#4e7da2","#0a1e61"],["","","","#69a5bf","#69a5bf","#cbfbfb","#cbfbfb","#ebffff","#cbfbfb","","",""],["","","","#0a1e61","#4e7da2","#69a5bf","#cbfbfb","#4e7da2","#0a1e61","","",""],["","","","#4e7da2","#69a5bf","#69a5bf","#69a5bf","#69a5bf","#4e7da2","","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "threatening",
    name: "A threatening legal letter written by a five year old",
    grid: [
        "XX",
        "XX",
        "XX"
      ],
    color: [["#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#b9bbb4"],["#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#f8ffe0","#ad0000","#ad0000","#ad0000","#b9bbb4"],["#d4d7cc","#2a292e","#2a292e","#2a292e","#2a292e","#f8ffe0","#ad0000","#ad0000","#ad0000","#d4d7cc"],["#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#d4d7cc","#d4d7cc"],["#d4d7cc","#2a292e","#2a292e","#2a292e","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#d4d7cc"],["#b9bbb4","#d4d7cc","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#d4d7cc"],["#b9bbb4","#f8ffe0","#f8ffe0","#2a292e","#2a292e","#2a292e","#2a292e","#2a292e","#f8ffe0","#d4d7cc"],["#b9bbb4","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#d4d7cc"],["#b9bbb4","#2a292e","#2a292e","#2a292e","#2a292e","#2a292e","#2a292e","#2a292e","#2a292e","#d4d7cc"],["#d4d7cc","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#d4d7cc"],["#d4d7cc","#2a292e","#2a292e","#2a292e","#2a292e","#2a292e","#2a292e","#2a292e","#2a292e","#d4d7cc"],["#d4d7cc","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#d4d7cc"],["#d4d7cc","#2a292e","#2a292e","#2a292e","#2a292e","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#d4d7cc"],["#d4d7cc","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#f8ffe0","#2a292e","#2a292e","#2a292e","#d4d7cc"],["#b9bbb4","#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#d4d7cc","#f8ffe0"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "pepper",
    name: "a spicy little pepper",
    grid: [
        ".X",
        "XX"
      ],
    color: [["","","","#1a3b11","#389a1d","#1a3b11"],["","","","#389a1d","#1c8000","#1c8000"],["","","","#a20606","#d60000","#710404"],["#470000","#a20606","#a20606","#a20606","#d60000","#710404"],["#a20606","#d60000","#ff5c5c","#ff5c5c","#d60000","#710404"],["#470000","#710404","#710404","#710404","#710404","#470000"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "north",
    name: "the north star",
    grid: [
        ".X.",
        "XXX",
        ".X."
      ],
    color: [["","","","#005cb3","#8ac6ff","#005cb3","","",""],["","","","#005cb3","#ccfcff","#005cb3","","",""],["","","","#49a1f3","#ccfcff","#49a1f3","","",""],["#005cb3","#005cb3","#49a1f3","#49a1f3","#ccfcff","#49a1f3","#49a1f3","#005cb3","#005cb3"],["#8ac6ff","#8ac6ff","#ccfcff","#ccfcff","#ffffff","#ccfcff","#ccfcff","#8ac6ff","#8ac6ff"],["#005cb3","#005cb3","#49a1f3","#49a1f3","#ccfcff","#49a1f3","#49a1f3","#005cb3","#005cb3"],["","","","#49a1f3","#ccfcff","#49a1f3","","",""],["","","","#005cb3","#ccfcff","#005cb3","","",""],["","","","#005cb3","#8ac6ff","#005cb3","","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "popes",
    name: "the pope's fancy hat",
    grid: [
        ".X.",
        "XXX",
        "XXX",
        "XXX"
      ],
    color: [["","","","","#676242","#ffba7a","#ffba7a","#676242","","","",""],["","","","","#676242","#ffba7a","#ffba7a","#676242","","","",""],["","","","","#dbe2bb","#ffba7a","#ffba7a","#dbe2bb","","","",""],["","","","","#f6ffcc","#d87118","#d87118","#f6ffcc","","","",""],["#49410e","#49410e","#dbe2bb","#f6ffcc","#d87118","#ffd7b3","#ffd7b3","#d87118","#f6ffcc","#676242","#49410e","#49410e"],["#49410e","#b3bc8a","#f6ffcc","#d87118","#d87118","#ffd7b3","#ffd7b3","#d87118","#d87118","#f6ffcc","#b3bc8a","#49410e"],["#676242","#dbe2bb","#d87118","#ffd7b3","#ffd7b3","#ffd7b3","#ffd7b3","#ffd7b3","#ffd7b3","#d87118","#dbe2bb","#676242"],["#676242","#f6ffcc","#d87118","#ffd7b3","#ffd7b3","#ffd7b3","#ffd7b3","#ffd7b3","#ffd7b3","#d87118","#f6ffcc","#676242"],["#dbe2bb","#f6ffcc","#f6ffcc","#d87118","#d87118","#ffd7b3","#ffd7b3","#d87118","#d87118","#f6ffcc","#f6ffcc","#dbe2bb"],["#dbe2bb","#f6ffcc","#f6ffcc","#f6ffcc","#d87118","#ffd7b3","#ffd7b3","#d87118","#f6ffcc","#f6ffcc","#f6ffcc","#dbe2bb"],["#dbe2bb","#f6ffcc","#f6ffcc","#f6ffcc","#d87118","#ffd7b3","#ffd7b3","#d87118","#f6ffcc","#f6ffcc","#f6ffcc","#dbe2bb"],["#b3bc8a","#dbe2bb","#f6ffcc","#f6ffcc","#d87118","#ffd7b3","#ffd7b3","#d87118","#f6ffcc","#f6ffcc","#dbe2bb","#b3bc8a"],["#b3bc8a","#dbe2bb","#f6ffcc","#f6ffcc","#f6ffcc","#d87118","#d87118","#f6ffcc","#f6ffcc","#f6ffcc","#dbe2bb","#b3bc8a"],["#b3bc8a","#dbe2bb","#dbe2bb","#f6ffcc","#f6ffcc","#ffba7a","#ffba7a","#f6ffcc","#f6ffcc","#dbe2bb","#dbe2bb","#b3bc8a"],["#4d2500","#744b25","#d8924f","#ffba7a","#ffba7a","#ffba7a","#ffba7a","#ffba7a","#ffba7a","#d8924f","#744b25","#4d2500"],["#4d2500","#744b25","#d8924f","#ffba7a","#ffba7a","#ffba7a","#ffba7a","#ffba7a","#ffba7a","#d8924f","#744b25","#4d2500"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "hellfire",
    name: "an eternal flame of damnation",
    grid: [
        ".X.",
        "XX.",
        "XXX",
        "XXX",
        ".X."
      ],
    color: [["","","","#9f4009","#e36e17","#a30500","","",""],["","","","#ca2c09","#ef831f","#9a1e04","","",""],["","","","#f38d27","#fbaa33","#c0210f","","",""],["#a30500","#b10501","#d94408","#feab32","#feb53a","#c52307","","",""],["#940f00","#cc430b","#f99324","#fecc55","#fcc962","#dd5b0e","","",""],["#b40700","#e26810","#f9b43d","#fcf5b7","#edd480","#ce4f0d","","",""],["#de4f0d","#fa9924","#fdc64b","#fcfece","#f8e093","#f7a22c","#f48b1a","#c72305","#7f1202"],["#d84d0b","#f5a832","#f5d774","#f3fbc8","#f9fbdd","#fae795","#fcab36","#dc540b","#930b00"],["#d14506","#f89e26","#facc5b","#fcfecb","#faffd1","#f8d471","#ffab33","#e56f14","#b60b02"],["#b20900","#df6212","#fc9728","#f8c858","#f9d882","#f6bb44","#f38f22","#ce3902","#af0c06"],["#9d1a03","#c82c01","#db5f0d","#feb337","#fbbd43","#fb9c26","#d03b05","#a61604","#721102"],["#a30500","#b60803","#b20b01","#ffab2f","#f8ac35","#e25b0b","#a70b01","#6d0c00","#a30500"],["","","","#b91403","#f7921d","#b51d06","","",""],["","","","#b81908","#f4831c","#a8280a","","",""],["","","","#a30500","#e56b16","#a30500","","",""]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "uranium",
    name: "extra spicy uranium, yum!",
    grid: [
        "X",
        "X"
      ],
    color: [["#006b1b","#006b1b","#009926","#006b1b","#006b1b"],["#006b1b","#009926","#26ff00","#009926","#006b1b"],["#009926","#26ff00","#c3ffb8","#26ff00","#009926"],["#009926","#26ff00","#c3ffb8","#26ff00","#009926"],["#009926","#26ff00","#c3ffb8","#26ff00","#009926"],["#009926","#26ff00","#c3ffb8","#26ff00","#009926"],["#009926","#26ff00","#c3ffb8","#26ff00","#009926"],["#009926","#26ff00","#c3ffb8","#26ff00","#009926"],["#006b1b","#009926","#26ff00","#009926","#006b1b"],["#006b1b","#006b1b","#009926","#006b1b","#006b1b"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "beetle",
    name: "a shiny green beetle",
    grid: [
        "X",
        "X"
      ],
    color: [["#065200","#20be0b","#1af700","#28c80c","#0f5f0a"],["#21ca0b","#270047","#19f200","#1b0040","#13af00"],["#1cf900","#18f700","#1fc00f","#2bff09","#19f400"],["#0df600","#b0f79f","#1ec20c","#30ff09","#26ff03"],["#003e00","#004100","#004600","#003d00","#003d00"],["#0daf00","#1bbb06","#003b00","#0fb300","#1ab501"],["#20fe01","#beffba","#0d4f00","#a9f5a7","#12f400"],["#31ff0d","#bcffb7","#0f580c","#20ff00","#2fff0f"],["#11bc00","#4eef33","#004200","#24ff0a","#0dad00"],["#004400","#2fff0c","#003a00","#28ff05","#1b690e"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "button",
    name: "a lost button",
    grid: [
        "X"
      ],
    color: [["#520000","#fe2020","#fe2020","#fe2020","#fe2020","#fe2020","#520000"],["#fe2020","#e00000","#c20000","#c20000","#c20000","#e00000","#fe2020"],["#fe2020","#c20000","#850000","#c20000","#c20000","#c20000","#fe2020"],["#fe2020","#c20000","#520000","#c20000","#850000","#c20000","#fe2020"],["#fe2020","#c20000","#c20000","#c20000","#520000","#c20000","#fe2020"],["#fe2020","#e00000","#c20000","#c20000","#c20000","#e00000","#fe2020"],["#520000","#fe2020","#fe2020","#fe2020","#fe2020","#fe2020","#520000"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "pyramid",
    name: "The Pyramid of Giza",
    grid: [
        "....X....",
        "...XXX...",
        "..XXXXX..",
        ".XXXXXXX.",
        "XXXXXXXXX"
      ],
    color: [["","","","","","","","","#fffeb2","#807900","","","","","","","",""],["","","","","","","","","#bfbb6d","#635c01","","","","","","","",""],["","","","","","","#b8b26a","#bfbb6d","#ffffb2","#a79d47","#a19941","#9e9540","","","","","",""],["","","","","","","#f9f28e","#ffff9b","#fff795","#bcb269","#675a01","#655e04","","","","","",""],["","","","","#ffff9b","#fffab0","#fcf2aa","#fffab0","#ffff9c","#f5ee88","#867900","#5e5500","#615a00","#5a5500","","","",""],["","","","","#ffff96","#fcfb93","#fbf691","#b7ae63","#bfb66d","#b5b162","#857900","#7a7100","#847c02","#7e7100","","","",""],["","","#f5eea4","#f5efa2","#f2ec83","#f6f2a8","#f9f0a8","#fff8aa","#f8efa2","#fffbb0","#fffdb3","#a7a347","#a79d42","#a49e43","#a49e45","#908404","",""],["","","#f2eb87","#f6e887","#fffb98","#ffff98","#f4ec84","#bfba6a","#bfbe74","#bcb568","#b8b569","#675b03","#7d7300","#645b01","#5e5000","#8a8206","",""],["#fff597","#f8f68c","#bfbf73","#b6b262","#beb86f","#bbb464","#fffb93","#ffff9b","#faee8b","#fffb98","#fcf78d","#7d6e00","#8d840c","#8d8709","#a99b42","#aaa149","#a9a243","#a8a247"],["#bfb867","#bab267","#f9f3aa","#fff9b0","#fdfaac","#fbf7a7","#fcf8aa","#fff798","#bcb96b","#bcb565","#bfbb6d","#bcbb6d","#837701","#8d7e05","#7f6f00","#5d5600","#646103","#675d04"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "morrrocan",
    name: "a gorgious Morrrocan rug",
    grid: [
        "XXXXXX",
        "XXXXXX",
        "XXXXXX",
        "XXXXXX",
        "XXXXXX",
        "XXXXXX",
        "XXXXXX",
        "XXXXXX",
        "XXXXXX",
        "XXXXXX"
      ],
    color: [["#d6c2ad","#423322","#aa9379","#452b2d","#d9c8b1","#583c2f","#dccbb2","#311a06","#c3b098","#38221d","#d0c2ab","#281a01","#dbcab6","#4d382d","#c9b89f","#3b2414","#d7c5b0","#4f412c","#dfd4bf","#3b2421","#ddcfbd","#291a02","#e4dac5","#42312d","#dbcbb1","#3e3123","#ded0be","#3d2a1f","#e4d4bc","#3b1c12","#e3d4bb","#291902","#e0cfb6","#4d342d","#bfae97","#372425","#dccab6","#393224","#e3d2ba","#4a4032","#d2bca2","#412c2a"],["#dab893","#3b2018","#d1a075","#4a4434","#e5c6a2","#45422a","#d9b590","#4e4229","#e0c09d","#402419","#e4c095","#4a3c36","#e4caa6","#3d301b","#e5c5a2","#33241a","#e2c8a7","#251208","#e0bd99","#2c2619","#e0c3a1","#20120c","#e5ccac","#463633","#e2c6a5","#332b0f","#dfc3a3","#2d1807","#e7ceaa","#25100e","#e7caa7","#402611","#dfc3a3","#454230","#e3c49d","#54452c","#e1bd93","#341c07","#ddb58b","#32210e","#d9be99","#2c1e0d"],["#771110","#781c0d","#411912","#551812","#79361f","#783f2c","#8e2113","#4e1c17","#912d18","#7a3720","#9b472b","#661b16","#b0461d","#6e251f","#a34425","#631d16","#ad492d","#842e23","#b02414","#a25641","#431713","#4e1d19","#913c2c","#93281c","#773325","#cf552c","#9d341e","#94491d","#742d1b","#b04627","#653a2a","#7b4d38","#8d3325","#844d28","#6a2619","#a3542c","#481e13","#551d17","#71281c","#a64d31","#471914","#701618"],["#a52012","#370e0c","#3f1c15","#6d1615","#e35614","#481914","#79201d","#982420","#572829","#9d3522","#9c231c","#513028","#b01a14","#571e14","#412922","#7d625d","#c3ab94","#411b13","#6f1815","#891f1b","#a81814","#ac1d18","#7b2217","#7d1f1a","#6e1f1b","#d3b899","#6b5053","#61322f","#3e1e13","#9f1410","#361816","#69291c","#d8541d","#351714","#5b1614","#621512","#3d372b","#d95810","#39221e","#461b13","#611512","#b92316"],["#d7532b","#4e1a17","#5e1f1a","#ae4121","#5a2217","#b54722","#4c110f","#551b11","#300f0a","#261511","#ad5635","#9b1312","#c54e26","#691f1b","#96291c","#48120f","#561b1a","#d04d1c","#7a1e1d","#6b2219","#4b1c17","#411410","#a53a1b","#831e1c","#692b1a","#4d211d","#561a17","#8e2218","#391411","#c2663a","#79140f","#4c1712","#6e3833","#c3643d","#651410","#772010","#33130e","#4a1d1a","#b24527","#5e1c16","#681818","#d74622"],["#b3351b","#f09023","#ec8817","#482a2a","#90372e","#bb896d","#995e4c","#b9866b","#c79f7f","#a36b5a","#c1967b","#c1876e","#97513e","#c2997b","#c4967c","#ae6952","#b16f58","#c9a48a","#d4a181","#b0705e","#ca997d","#c3745e","#b55849","#b4715b","#ad6a54","#cb9d82","#a75d44","#c8937b","#a66651","#b7836a","#a56050","#b68168","#a65645","#994d3c","#8b5240","#7f3126","#6a3b30","#8a4139","#39211c","#f28d1b","#f8a12e","#cc451c"],["#5b1417","#d36a1e","#e07f16","#261010","#d4a986","#c18860","#bc5f3b","#d6a27b","#ce9d73","#d49e81","#e2c9a3","#dfbe9a","#d17a46","#ddb794","#e2b88a","#c95430","#bb3e24","#e0c09c","#e5c69d","#c3573a","#deb384","#deb78f","#e5bd95","#d6a981","#e4bc95","#e2c69f","#cf733c","#e3c9a5","#ddb48a","#e3c69e","#e0b691","#e0bf97","#725e4d","#c28359","#e4c69e","#e3b791","#e6cba3","#e8c3a1","#261614","#de8327","#f18a1f","#621915"],["#571112","#511e1a","#401511","#4d1c1c","#ba5e4e","#e0c3a1","#e4c39f","#e2c094","#c8765d","#ab1e14","#ae433b","#cc9671","#e0c4a2","#e1c49b","#e1cca5","#e7d0ac","#e6c8a4","#e6cba6","#dab189","#ead0ab","#261713","#33110c","#bb9b81","#e8d0ac","#e4c6a3","#ead2af","#ead0ac","#e0c7a1","#e6cda7","#e1b994","#d7bc97","#766250","#981e19","#b1a07c","#e7cfaa","#e4c296","#e5c89f","#e5c09d","#322220","#59241d","#411210","#ca7247"],["#941a0a","#21120f","#2c0e0c","#341012","#cc9f87","#e7cba2","#e5bd93","#dcbea2","#b01b19","#8d484c","#ab5239","#af1c18","#dfc097","#e6c89f","#e1c49e","#e3bb93","#e6c294","#d9ab86","#eccfa8","#382521","#ed7428","#b92b10","#36130e","#e9caa3","#e6caa3","#e9c198","#e2c6a4","#e4cdaa","#e5c8a2","#e3cbaa","#261514","#af3a1b","#9a1717","#b52018","#cfc09f","#e8c6a0","#e4c399","#b1523c","#362321","#2c150f","#3a1413","#e26a24"],["#83160d","#63201e","#55261c","#3a0d10","#cf8062","#cb9b71","#dbb996","#be3829","#623243","#dc5408","#da5011","#653b3b","#b12a22","#e8c9a2","#e7c39e","#d9b189","#e5cca7","#dfbb96","#8e7464","#f06d21","#9d1110","#a50f11","#c02a0a","#26130f","#d5bb97","#e2bc94","#ecd0a9","#e7c296","#dab18a","#2c1c1b","#a53031","#d25a14","#f06c1b","#ba3521","#8a1a19","#eac695","#e7d4b0","#bf5b40","#27181a","#54201c","#631a15","#761b13"],["#cd5218","#db440a","#dc460a","#5a2a27","#a8624b","#eacaa3","#dcaf96","#b9453f","#cc3e18","#da5213","#e65907","#c0492c","#a0140c","#deb699","#bc6f49","#e0c5a3","#d7b993","#332720","#f17018","#a91011","#b20b0d","#a80a0a","#9d0909","#db4e1a","#341f18","#dfc3a1","#ce976d","#e4c3a0","#e0b790","#2e201d","#b2472f","#e65b0d","#de460d","#e25a10","#a51e19","#d8a47c","#e6c8a1","#d79e7f","#291716","#d5440a","#df4e0f","#6c1513"],["#913522","#4b140d","#521d11","#4d1919","#d0b191","#e0b78e","#cb986e","#a23227","#a23c2e","#bb1e10","#c4361b","#a71814","#e5bc96","#e5c498","#e6c8a2","#d8af87","#291d1a","#f6711c","#a9221b","#b70e10","#c63c0f","#e35713","#aa0b0c","#ab261a","#e15210","#261713","#e6c6a2","#cc8a5e","#dcb38c","#dfc5a0","#2c1917","#bb3a27","#ea650e","#963425","#291816","#dcb38b","#e1bf96","#e1b798","#3e2321","#51120d","#48180d","#6f0f13"],["#621316","#321812","#681c15","#431513","#dca28a","#e2c29a","#e3c5a2","#e5c9a2","#d59e87","#a8493e","#ab1814","#e0a88e","#e0bd97","#dfbd98","#e4caa3","#baa68c","#eb752f","#670f0c","#b11311","#a92810","#e35709","#e6590e","#c33010","#b10a0c","#9d0b0e","#da5a17","#856855","#dcbe98","#e3be96","#e6cba6","#e1bc96","#341f1d","#b72b1a","#977e6f","#e5c8a0","#e6c7a3","#ddac80","#d6977c","#3f1b17","#341710","#4a1813","#ad1a15"],["#cd5517","#421913","#3d1c16","#5b241e","#ba775e","#d2a97f","#e2c199","#deba96","#d5986f","#b27560","#d4b797","#e2bc95","#cd9064","#e1c49e","#1e130e","#e65b20","#9f1012","#af0709","#b82110","#eb5b0e","#e7ae6a","#ea8624","#e24804","#ce3b0e","#ad1110","#a3110e","#ed892f","#2a1c16","#e9d1ad","#e5c8a2","#ebcea8","#e0c39b","#694a3f","#dfc3a0","#e3cba8","#e4bc96","#e0c39d","#ad422a","#491510","#3a1b14","#361715","#ca6029"],["#b03d19","#9b6453","#b7927a","#2d0d0d","#c76442","#e6c398","#e3caa9","#d69865","#e5c49e","#d7ab84","#e0bb91","#dcbd96","#dfc298","#412c23","#d8410e","#a21413","#a71110","#b02117","#d84d0f","#edb369","#3f2c21","#21100d","#edae52","#e9520c","#b61d0e","#ab1814","#ab0d0e","#ee7126","#33221a","#e2c39b","#e7cfac","#e3c7a4","#e6cda9","#e6caa4","#deb588","#e5c8a2","#dcbb96","#cf8574","#32201d","#986251","#ccb1a1","#bd4228"],["#4f0c10","#ab937a","#dbc49e","#321c19","#d9bc9a","#e1c5a3","#e6bf94","#e0c4a1","#e3cfac","#daba96","#dcb48a","#ddbd95","#948262","#d2270c","#620808","#a91511","#a82810","#ec6212","#e8af6d","#351e13","#7f1610","#c73728","#5a301a","#ebb152","#ea580e","#d24122","#af1010","#a30b0c","#ef6e1e","#513d2c","#e4c6a3","#e5ceaa","#e4c9a3","#e2c8a3","#e1caa7","#e7c7a2","#e9cea5","#e4bf9f","#312a27","#cdb391","#cbad8a","#5d1012"],["#430c0d","#401d19","#5b1f1c","#512022","#c37352","#ddba97","#d7b189","#e6cca6","#e8cba2","#eacca3","#e0c099","#291c1c","#bf050b","#680f10","#b51a17","#a90f0d","#db420a","#e26b1c","#683e20","#c17754","#d93c19","#d94428","#411513","#583821","#eb8f3b","#dd5209","#a30b0b","#a52417","#611110","#c51510","#362623","#e4c4a3","#ecd6b1","#e4c7a0","#d4ab86","#d2ad87","#e3c19e","#d3997f","#352223","#42110e","#823527","#660f14"],["#cd4310","#481a18","#3f1f1e","#5c1f1d","#be725c","#ebcca3","#e2c197","#e9d0ab","#e7d2b0","#dbc7a6","#e0c297","#e4c3a0","#d7b18b","#b31510","#4f0c0f","#9f2315","#a80f10","#de400b","#ec741d","#6e4128","#ad4021","#69331c","#361b0e","#ea9542","#e94e03","#ac1710","#a54f2d","#900e12","#bd1207","#d5ad86","#e4cca6","#d4bb97","#7e655e","#e5cca7","#eacba6","#ebd0a8","#e6c9a3","#c46641","#242222","#43211d","#261210","#d1511c"],["#b4361f","#3d1d19","#521c14","#4f2b25","#d4a889","#e8d1ad","#e7ceaa","#deb58f","#342320","#a4241b","#53261f","#c09e81","#dbb188","#5c4b3b","#b52114","#711211","#ac1c18","#b4261b","#db440a","#ea7a29","#58351e","#301d12","#ebad6a","#e25210","#a72b15","#932317","#701012","#c41e0c","#2c1f19","#e4cba6","#debd98","#9f1c1f","#b01a17","#312a34","#e9d0af","#e9d0ab","#e8cca3","#c6856f","#3f201f","#5b1611","#43120f","#cc6334"],["#5a1317","#e9500e","#e54b10","#391111","#d88e73","#e9cea5","#e1caac","#ccb299","#591512","#f2b469","#d6734b","#3f1a19","#e8d0ad","#e6c89e","#7a5c4c","#c02416","#670d0d","#ac1513","#a51e16","#f05509","#e68d3c","#ecae61","#e65309","#bb1511","#9e1916","#831314","#c82712","#aa8b70","#e2cea8","#e2c59d","#8a2f32","#e9580b","#d43d14","#ab2e23","#bd9d85","#e8d0ad","#e3c9a4","#e6c3a2","#41302f","#d53e15","#e5471c","#5e130e"],["#581117","#7f160f","#922a13","#400f10","#b15741","#e9bb92","#e6c9a3","#d3ac85","#bb1c18","#d49765","#d6803c","#50211c","#e1caa7","#e3c09a","#e5d0ad","#d1b594","#c0180d","#680608","#a1442c","#aa1914","#e6520b","#e64f06","#a41b11","#973422","#911a17","#c61608","#826d5a","#e3caa9","#ead3af","#e9d0aa","#79353f","#e64f14","#f16f15","#a8372f","#a38e74","#e7c499","#e2c6a6","#b36e5e","#261b1b","#971e17","#841e18","#6f131a"],["#841d17","#3b1e14","#3d1b0e","#431514","#bf6a51","#eacca4","#e9d2ae","#e5cca7","#2d2222","#7d201a","#341617","#d5ad85","#e2c29a","#e7cea8","#e8cca9","#e2c79f","#342722","#cb180f","#5f120f","#af3224","#a52e16","#a32616","#9f2010","#8b0c12","#d43d15","#32211c","#e0c299","#e2c49d","#eccea4","#e2c8a3","#e5cfa8","#803841","#b41f23","#36232a","#e5c7a1","#e8d3af","#e8d0ac","#da7d58","#3b2724","#4c2218","#2e150e","#750e0e"],["#8a2413","#301713","#30140f","#2a1513","#d4b78f","#e3c49d","#e6cba7","#e1caa6","#e5cfb0","#736157","#876d5c","#d7a37b","#e4c29c","#e8cba5","#e8cfab","#e1caa7","#e3c39a","#d0a27a","#c3170c","#6a0f10","#b21713","#b31010","#a31616","#d53f16","#b49979","#eac59d","#e5c49e","#e7cfab","#e6cba3","#e4d0af","#d6a77d","#d7ba97","#6b4f44","#e4d0b0","#e7c9a2","#dfb388","#e5cdac","#bb6862","#43221e","#29160e","#341615","#a41e16"],["#e58130","#962316","#a02a1e","#261214","#cc8f7c","#eacfad","#e1c29b","#e2c9a6","#e4caa6","#e2c6a6","#e8c8a3","#e9c9a0","#eacaa5","#e4cdb0","#ead1ad","#e5cea9","#e5c29a","#e5c498","#392923","#d11f11","#91271a","#a51716","#c5250c","#2d1c1b","#e5c5a0","#e8d0ac","#e9d3b5","#e5cfaa","#e7c9a2","#dbbb97","#e3c095","#e4c9a8","#e7cfaa","#ebd0af","#e2c8a3","#e0c49f","#ebd7b6","#ecbe94","#332320","#a4271e","#5b2b27","#ec8840"],["#c85d25","#e2b78d","#d8b480","#2a1614","#967466","#dcb696","#e4ceb0","#e6cfab","#e6cfac","#e6c9a7","#e8cead","#ebd1ad","#e0c49d","#e1c29b","#e9cfaa","#ecd4b1","#caa37a","#e4cca8","#e7d0aa","#c8b491","#d82110","#d32b09","#d2bda2","#e9d0aa","#ead7b5","#cb9365","#e5c29c","#e4d1b4","#e5cba6","#e0c49f","#ebd3ae","#dab794","#e7cda8","#e9d2af","#e4cca9","#e7ceae","#e9d0af","#e6caa8","#312723","#d2b594","#d7be9e","#cf5f28"],["#561015","#231510","#1f0e0c","#431111","#c35138","#e7cca2","#e7cfac","#be8766","#debf96","#3c3029","#453b30","#e6cdac","#e3cba7","#e6c9a1","#e3c49b","#ebd8b8","#e3caa5","#e9d5b4","#dfb388","#e9d3b0","#d9b38a","#866a51","#e3cba4","#e7caa7","#e7d1ae","#e5cdac","#e8cfaa","#e9cea6","#e6c599","#deb187","#e0c29f","#3e2f28","#201814","#dcaa84","#e1ba91","#e7cead","#e9d2b4","#e2aa87","#352e2c","#2c150f","#26110d","#4d1614"],["#6e0f10","#431514","#4a1313","#361515","#ddb996","#e5cca8","#e7d0ac","#e9caa2","#8d7d60","#cb4510","#cc4a16","#6f5444","#d9ab84","#edd6b2","#e8d2b1","#e4ba91","#dbb792","#e4c8a3","#ebd0af","#5d4535","#af3226","#a14031","#443629","#e8cca5","#e3c49c","#e6cca7","#e7cdac","#e6d0ac","#e7d0ac","#dec3a3","#d2c1a2","#c33111","#e6470b","#b3a482","#e3ceac","#ddb384","#e4c6a3","#7f5045","#4e3631","#2f1211","#5e1010","#831315"],["#bb501d","#85251f","#68241f","#591b16","#df9d7d","#e5c8a0","#e8cca9","#a98d7f","#8f2a18","#64211d","#671916","#824b33","#dfbb97","#dfbe96","#d2a177","#dab792","#e4c4a0","#e4c39e","#4c352d","#aa1c18","#eac39c","#eccaa4","#b51816","#301b1d","#e6c8a1","#deb68e","#ebcda6","#e4c69e","#e2c39e","#dab896","#8b593d","#a51911","#591614","#f04e0f","#903825","#ead0ab","#e4ccab","#d9967a","#4c1e1a","#75251d","#862f2a","#b8512b"],["#c14e19","#e75215","#e35714","#331414","#c87961","#ebd4b0","#eacfad","#482315","#820c0c","#ea7019","#cc6c5c","#c82d0a","#1a1310","#e0c5a5","#e5cda6","#dbbc95","#e7caa4","#cbad8d","#b31418","#edcd9d","#cc5e5b","#e7ae9b","#edcba8","#a94330","#d0b38d","#eac7a0","#e7cda9","#e3c5a4","#dfc9a6","#332725","#e24d18","#c43c0e","#d3511c","#931917","#852d0c","#cfaf8b","#e5c9a2","#e9c7a4","#251f1e","#ec5713","#e44f0b","#cf5620"],["#6c0f12","#d94506","#d93e06","#310f0e","#df9264","#e7d0ab","#e8d5b3","#532014","#711a14","#c15f49","#c24e3d","#b73a1a","#2d201b","#e6cfac","#e4c8a3","#e2cba7","#2c1e18","#95221f","#ebc39d","#e49d89","#dc4e50","#db4850","#dc847b","#e6c49e","#996146","#2f1b16","#e8cdab","#eacca5","#e9d2b0","#644e43","#d64d0f","#922110","#9e3324","#b73c1a","#b84a25","#e0caab","#e9cea2","#e0845d","#322320","#df480e","#db440b","#6a1a14"],["#4f1314","#5a231a","#4f201a","#4f1b16","#af6858","#e1b693","#e4cdaa","#e0c7a9","#6d3929","#a33315","#d84b10","#c7997e","#d6ab81","#d6a87d","#cc865c","#d0ac8d","#9f1f1a","#eac39d","#e9b598","#d84143","#63231d","#411613","#800d0d","#e9b599","#e6c39d","#a31b16","#331c15","#d7a87c","#e6c8a6","#deb98e","#d5bfa0","#cc4718","#ec5605","#493626","#e7d1a8","#e4c8a1","#dfbd99","#b06f5f","#452320","#793329","#5e1f18","#5c0f0f"],["#87130e","#26100b","#441310","#51201e","#e59d6c","#e4c9a3","#e6caa2","#dfc4a2","#e1c6a6","#322320","#211717","#ead5b6","#e8d3b4","#d7a67c","#dbaa7f","#982919","#e7c29f","#c2292d","#df4c51","#631b18","#c3773a","#7c3219","#651c1a","#db474c","#d8786d","#eac2a2","#a53c2d","#d0b195","#b76135","#e8d2ad","#eeb98d","#49392e","#352926","#c37b53","#e6d2b1","#ecd3af","#e7cca4","#b95f35","#3f2521","#300f0c","#540b0d","#8f250f"],["#d64c0e","#713423","#1e0e0a","#401615","#dfb891","#e8cba5","#e8d7b6","#debc97","#e5c6a2","#e0bf9b","#d9b68c","#e0c9a5","#e3b993","#816b59","#761311","#e8c09d","#da706d","#e4575b","#832221","#513c33","#d15d1c","#f17814","#42251a","#461712","#e24953","#e2947d","#e8c2a2","#974528","#331e1a","#e8cea5","#e2bf95","#e9d1ae","#e2c9a3","#e4c9a3","#e9d0ac","#e9d0af","#e7d3b3","#e6c3a0","#3b211c","#381810","#4f2a1f","#dd7030"],["#851515","#85120f","#8a1d15","#221310","#d09580","#c88458","#e5cda9","#e4caa3","#e3c8a0","#e9cea6","#eacfae","#e4cfa6","#ceb998","#761d1a","#e0a785","#e7bf9e","#df4e54","#992528","#4d271a","#d54b1c","#ce3718","#b83a2a","#ef570e","#331c15","#5b1615","#d7494d","#eec2a1","#e8c39b","#a5261c","#c4ac88","#dfc6a2","#e2bd95","#e2c095","#e2c6a3","#deb88c","#e7cca3","#e5c9a2","#e3a684","#2f2423","#99231f","#951a18","#6d1311"],["#671116","#9b0d0f","#991914","#210f0d","#ad332a","#e2ac86","#e0bb97","#e5caa6","#e3c6a0","#e0c09d","#e9d5b4","#e8d0b1","#e8c89f","#2c1916","#ac1f19","#ebc09d","#db4c50","#d84950","#331e1a","#491512","#e36110","#eb6617","#7c2310","#99613e","#cb3c43","#e24f51","#e5ab8e","#c14f43","#461915","#e4c7a1","#ebd7b6","#e4c7a3","#e8caa3","#e8cea8","#e8cfae","#dab88f","#d7ae87","#d37c63","#271f1b","#9c1818","#a81b19","#660f10"],["#881d17","#8c3020","#562217","#521814","#9c645a","#e8c9a2","#e9d0ac","#e1c3a2","#e5c6a2","#e8cca5","#e8d0ad","#d0aa87","#e0b98e","#a38f74","#4d322a","#ae211b","#d56d5e","#dd4e54","#ac2024","#af592e","#76271c","#ab3622","#b95e3b","#cd4445","#dc434d","#d25455","#b5493c","#441611","#957c65","#e4cba7","#e9c7a4","#e3c7a2","#e7c6a1","#e7c7a3","#e4c69f","#e7cfac","#e3c8a8","#cd8367","#401d19","#6d2922","#3a110f","#9b2618"],["#df6e14","#291c16","#301b14","#60221d","#dca77a","#e6cbaa","#e8d0ad","#e7caa7","#eaceac","#ddaf95","#e4c3a0","#e5cca8","#e9d3af","#e7c7a2","#dcc3a2","#2d1c18","#a21e19","#ebc39c","#dd4c51","#a51618","#4c291d","#421d12","#9f2424","#e25358","#e0b593","#c56954","#3e130d","#ddb995","#e4c5a0","#e8d0aa","#e1c198","#e3c09c","#be5e50","#e8cfa9","#e2c8a4","#e7d2b0","#e7d0ac","#d69b7e","#432a22","#19110f","#1b120e","#de7834"],["#8e1413","#2f0c0a","#411511","#3a221d","#dfb79a","#e9cfaa","#ebd0a8","#e4caa3","#ab0f0d","#834544","#af422b","#b54e3a","#e7d0ae","#e7cbaa","#e7cfaa","#dec4a3","#291714","#a62922","#e7b08f","#e25358","#e16066","#d34d4f","#e1585a","#e3a886","#c06550","#42120e","#b59980","#e1c5a3","#ebd1b1","#e3caa6","#e1b69e","#b42614","#682e21","#ac1818","#deb48b","#e2c7a7","#e3c6a0","#e7c8ad","#3d2e26","#431513","#893025","#6b1e18"],["#551314","#d63f05","#e55909","#3b1312","#e6ac84","#e7c39b","#eacfa6","#830e0f","#ce6439","#c65d2e","#5a2821","#d64c2c","#ac2319","#e7cfa9","#eadabb","#e1c7a7","#c4a98c","#4d3630","#ad201b","#dd4e50","#dd4e52","#de5f61","#e1715a","#c7715a","#431613","#a58a72","#e3cbab","#ecd2ae","#efd2a8","#b27659","#b92117","#2a1d1d","#e79544","#923823","#ad1011","#e3ba94","#e5c59d","#e0b99d","#40332e","#d65215","#e1600f","#5c100e"],["#6a1e19","#5f1810","#5b2115","#37120f","#bd816e","#e8cfa8","#e2cba7","#d5542c","#84290d","#854f22","#ed7818","#7c3b34","#b91b1c","#ebdcbc","#ead1ac","#e8c8a0","#e7c49a","#e4cda8","#342220","#a41918","#d78c6e","#eac4a4","#cb735e","#351410","#dfbb96","#e1be96","#e8cca5","#e8d0ad","#e5cba7","#b81113","#552520","#f07e0c","#3f2b1f","#e15f1a","#a72a23","#e2ab8a","#e8cfaf","#e0a088","#312423","#622f24","#653b2c","#5c120e"],["#d05219","#231817","#2e221a","#461c18","#945e4e","#e1bf9a","#c36455","#613728","#eda55c","#281619","#33211f","#e57424","#8b4333","#d07467","#e9cfad","#ecd4b1","#e7d0ac","#e8d2b1","#96836e","#4a302a","#ad3123","#c97664","#4b1712","#b29e8a","#e4c5a0","#deb78e","#ecd0ab","#ebd3b2","#c77664","#983e2b","#e7500e","#5a3f29","#341615","#ebbb7a","#291d1a","#d38170","#e2c1a1","#994435","#3a2c26","#561d12","#29120c","#dc8745"],["#c24e1b","#402820","#2b1512","#4d1311","#d96b3b","#e8c69d","#e2c299","#b41b1b","#714e5f","#e69344","#e8a65e","#503140","#a51a19","#e6cba4","#e1ba92","#e8cfb1","#e4c9a7","#e8ceaa","#e9d0ac","#e5c79e","#281916","#511412","#e7c6a1","#ebd1ad","#e0af85","#e4cca7","#e1c29b","#e3cba5","#e6cba7","#c15946","#6d4236","#ea6110","#f38126","#992a1c","#b01010","#e7caa3","#e6cea9","#d68b6a","#3f2823","#461b14","#371711","#ae3621"],["#481617","#c17568","#a56450","#361615","#d59a7a","#e5c9a2","#ebcca3","#dfb798","#a72623","#a86a50","#9c4224","#a93a33","#e4c396","#e5cca7","#e6c59d","#e4d0af","#e0b690","#e0ba93","#e3caab","#e7cfaa","#381615","#761e1b","#e3cbab","#deb890","#dcac83","#ddb385","#e6d3b2","#e9ccaa","#e2cba8","#e9d0ac","#b4493d","#832a1c","#b9221f","#ac1b17","#ca8670","#edcba2","#d8ac81","#e5ae8c","#392f2c","#a94535","#926453","#431011"],["#d96322","#d9c2a4","#dabf97","#431814","#e5b888","#e5d0ad","#e7cfb0","#e4c8a1","#dfc3a2","#be241f","#ad1915","#e5caa6","#e1c398","#ead2af","#e5cba9","#e2b88f","#e2c8a1","#e7c79f","#ead0ac","#35130f","#c83a12","#8d1915","#4e1c17","#e8cba4","#dbaa7c","#e8cba5","#dcb189","#e7d3b2","#e7ceaa","#e8cfa9","#dfc3a1","#ad2520","#ae1b17","#e2c8a4","#e1c4a2","#e8cfaf","#e0c39c","#e5aa80","#493a33","#d3c098","#d7c4a0","#c93f1f"],["#891a19","#34130e","#29110d","#300d0b","#a95444","#e4c39e","#e3c6a0","#e8d0b1","#e9d3b2","#e4cca8","#e0b790","#e9d0ac","#e7cca3","#ddb98f","#e5c8a2","#e7d0ab","#e0c099","#b69c83","#3f2017","#ca3a0e","#a01714","#aa1814","#9e2119","#531715","#a18667","#d7a276","#eacea7","#ead3af","#e8cfaf","#ead1ad","#e4caa9","#e9cdac","#e6c5a1","#e5cca7","#e9d7b7","#e8cfaf","#e3cba8","#bc5b51","#412d2a","#2d130e","#341a15","#701813"],["#671617","#661916","#801913","#20100e","#c4724f","#e8cfa8","#e6cfaa","#e2cca9","#e9d0ac","#e7d0ac","#e8cdac","#e8d1af","#e8caa8","#e3c49f","#e6c296","#e6c39e","#e2c095","#3d1614","#d24311","#a6432f","#b61110","#ab1212","#ac1513","#98170d","#4a1713","#dfbf97","#d09d77","#e0bf9a","#e8d0b1","#e3cca8","#e7d1b0","#e5ceab","#e3cca9","#e8cca9","#e7cfab","#e8d7b6","#e7d4b4","#dd946a","#372e2a","#441a14","#5b1314","#671817"],["#6a180f","#48160c","#54211b","#471313","#deb799","#ca9970","#e5bd8d","#e7cbaa","#e7cda7","#ead4b3","#dec19f","#e3d0ae","#e9c9a5","#e9b994","#edd1ac","#e1bb8e","#2f1210","#c6300a","#b1100f","#b31415","#cb360f","#df4e0a","#b91f1b","#b83325","#ba2010","#3f170f","#d9b592","#e6cfaa","#e8c9a2","#e6be95","#e9c69b","#e7d0ab","#e9d8b7","#e1c6a6","#e9d0af","#e7d0ad","#dfbc96","#e6c5a3","#3f2a25","#972e1c","#a24233","#59180c"],["#df640e","#bf090a","#a30d0e","#401615","#d88f6a","#e9d2b5","#e9d4b2","#ecd9b7","#e7cfa9","#a94d48","#e3bc9c","#e6c6a3","#d8b38d","#e4ceaa","#62483f","#42261e","#de5c18","#a91615","#b4211c","#ce3f19","#ed6f17","#e95e0c","#d5491c","#b00e0f","#a00d10","#c92c0e","#3d1514","#7c5c4a","#e9cfad","#e8d5b5","#e7d5b3","#dfbea4","#b23d31","#e8caaa","#e9c89f","#ebdab8","#ebd5b2","#cc663a","#433330","#c71b11","#c81c09","#d75a32"],["#9e3426","#ad2214","#a81a11","#1c1411","#c95a3f","#ead0af","#e4ceaf","#e5c6a2","#6a424d","#ca5c27","#bd2e20","#deb888","#d2976c","#e4c69e","#261310","#ed7523","#ad2722","#ac1513","#bb2d1a","#ed6b12","#d78037","#eb7916","#e95303","#b82b10","#b61210","#b2221d","#c32d0f","#2e1111","#dfc3a0","#d7a47c","#e0c39b","#a03833","#784735","#604645","#ead1ae","#ead3af","#ead4b1","#c4694b","#39302c","#b92814","#cc1f10","#bb5737"],["#d27436","#4e1812","#441a14","#3d1f1e","#d9b494","#e4caa3","#e9c6a1","#ddc2a0","#e2c6a3","#c18a80","#dfc4a2","#e8c99f","#e0c19a","#2e1713","#e86f17","#b81c17","#b00e10","#c12715","#eb540c","#e7a552","#492f1e","#321b16","#f2a642","#e55809","#c22e11","#b40b0e","#af1512","#c0380c","#331616","#e0c49f","#e4caa6","#e2c8a3","#873f4f","#e0c199","#d7b186","#e9cfa9","#e8c9a1","#e5c29f","#52322d","#6d261f","#4b1d18","#984125"],["#971a12","#251511","#421b16","#4a1011","#d9a487","#e9cfad","#e9cba2","#e7cbaa","#dfc3a1","#e7cdac","#ca885f","#b29b80","#674f42","#f67822","#821a15","#b71f1b","#b21e10","#e6580e","#edac55","#6e4d21","#932015","#d22d15","#5f3e1d","#eb8329","#e8580c","#d23819","#b30a10","#9d221a","#d34918","#5f3a2d","#9e7459","#cf9569","#e3c59e","#d5ab84","#e8d1af","#ecd0ae","#deb891","#ca8b6e","#452e28","#2b110c","#46100b","#911610"],["#680f12","#81291c","#55160f","#290d0c","#8f3f33","#e6c29d","#e8c8a3","#e5c09a","#e1c098","#e0c39d","#e1c3a0","#2d1d1a","#ea6222","#a62419","#9b6538","#b72f16","#e0520d","#eca055","#321d13","#551f17","#de6622","#df8d66","#691d18","#6a3418","#e7a354","#e25308","#ba3613","#a65a2d","#a5080b","#f07925","#332320","#e6cda7","#e7ceaa","#dfc19b","#e8ceaa","#e4c9a8","#e3caa7","#cf8861","#43312c","#73291c","#8b3125","#430f10"],["#8b1a16","#daa069","#d6a069","#411211","#e3b084","#e8cea9","#d7a77c","#e8cda5","#e1c59e","#e8caa4","#e5c5a0","#c6b292","#55493f","#ed671b","#600a09","#b01614","#aa2112","#e8580d","#eea145","#744e31","#a92927","#7f1a12","#522718","#e9b066","#e8540e","#b51b13","#b21211","#9e0e0c","#ee6e1d","#7b6455","#c5a989","#deb187","#e2caa3","#e3c7a4","#c48459","#e7c9a3","#deb78b","#cd8a61","#4a3a32","#dba97c","#bb9473","#920e11"],["#df7d2b","#781e13","#663725","#4f1f1c","#e0aa8a","#e3c49b","#cc9e75","#e9cfae","#e7c7a2","#e7b98d","#e2c9a5","#e6d0aa","#eaceac","#2c1e17","#f76c25","#aa0709","#bb0f12","#a81a15","#e55815","#eeae69","#40271b","#2e170f","#eaac60","#dd4809","#c53928","#ce4035","#ab1212","#dd6126","#291a17","#dab48f","#d29165","#e6caa2","#e4c4a0","#ead3ad","#e8d0ac","#eacfad","#e8c59f","#eac4a3","#422a26","#643025","#806756","#e5893a"],["#62100f","#271713","#311e1b","#490f0d","#d0735c","#e8cda8","#dba376","#ddbf98","#e5d0ad","#7d6652","#dfc4a3","#dfa57b","#b9865c","#c2ad91","#706255","#f88127","#9a1210","#b91412","#c62813","#e56013","#efbb6e","#f4b968","#e1510e","#c73515","#a62d1b","#973726","#d54310","#2c1712","#aa8f70","#ce9f72","#c88666","#e6cfa8","#af4230","#e3c7a6","#e7c9a1","#d6b28e","#eac295","#b0523d","#402f2b","#481a15","#291916","#5f1810"],["#8d0b0c","#1a1710","#20100c","#3c1212","#c64f2d","#e3c49c","#e2c5a3","#bf7e58","#755c4b","#743c31","#3d2521","#c4a180","#e0b688","#ddab84","#e5cea7","#261d19","#f76b1d","#a20a0b","#b2201b","#c13318","#e7560c","#e66014","#b42713","#ba1411","#a81b15","#d6420f","#31110e","#e8ceaa","#ead0af","#c6946f","#e1be9c","#ac2727","#ae1412","#a94534","#e7cea9","#e2bc97","#e9cda5","#b36548","#3e2a27","#1b120f","#211812","#790d0f"],["#ca521e","#812c1c","#992a1a","#291916","#cf9c7d","#e8cfa9","#e4c59d","#c9b29a","#531a18","#e4a475","#e18262","#241813","#e9cfa9","#ead1ae","#eacaa6","#e6d0ac","#1d1611","#f27220","#ba1112","#b1211b","#d8480f","#d44113","#b91616","#b71d1a","#d14113","#3b1612","#493728","#e9cfad","#e7d0ab","#e8d1ac","#a20d11","#b43816","#9f1d18","#ba100f","#b45642","#e2c299","#e6c8a2","#e4b689","#423630","#832b1f","#a33620","#de8234"],["#531615","#cb300d","#e65110","#2c0d0d","#c76c56","#e5be98","#e6cfac","#351615","#e0482f","#e5c496","#e2a372","#d37d65","#2e2421","#e8d0ad","#e8d4b3","#e8cba9","#cab59a","#3f2721","#e5601c","#aa322b","#ab0c0e","#bb1616","#9b492f","#b0331c","#501513","#c88a69","#ebd0ac","#e2c8a3","#e5caa2","#b7251f","#c31b11","#cd3a11","#f26307","#d6571f","#af2119","#e9caa2","#e1c49e","#e8ad84","#372c28","#d64614","#f25110","#450f0c"],["#571212","#44150f","#24100e","#350f10","#c16749","#debd98","#29231f","#eaa780","#db7230","#c6412d","#e5b78b","#dc8450","#c9503b","#2f2724","#e5caa6","#e8cdad","#ebd9b9","#c5ae93","#472820","#d94712","#b31513","#b11311","#8f190d","#601712","#b69e86","#ebd9b6","#e9cfa9","#ebdab7","#ab493e","#a51d16","#a8381d","#e9530b","#b0332f","#d6360f","#c8631c","#a72f26","#ebcfa5","#b85636","#30201c","#4b1b17","#33140c","#4f1412"],["#c75529","#211b17","#281916","#241310","#e0915d","#e7cba9","#dfc49e","#7c6f5e","#e49d79","#e9a05c","#e67835","#e09a7a","#d8bc93","#e8c6a2","#e3cba7","#deb78e","#e9d0a9","#eacfad","#e6cba9","#3d1a17","#d4511d","#6a160d","#661a15","#e5cfad","#e8cbab","#e2c39f","#e6c89f","#e6caa3","#e4c6a3","#e0c39b","#a81c11","#b21914","#de570f","#c26e23","#a73226","#e4c9a9","#eacfaf","#de9665","#43302d","#2d1814","#2b1715","#c8582f"],["#d24c1c","#3a1815","#271410","#34120f","#c1775d","#d39a70","#e2c6a4","#dcc4a8","#352926","#dd8e68","#dca789","#4f4439","#e8cca9","#e9d0ab","#ead7b5","#e4c8a6","#dfbb96","#e6cda7","#e5c79f","#e3cba4","#311411","#7f1714","#ddb88e","#e6cca8","#e8c6a2","#eacea7","#e6cba7","#ead3af","#ddba94","#e8c7a2","#aa4332","#b13523","#ae1f11","#a90d0f","#e5c8a6","#e8ceaf","#ecd6b2","#db9f7c","#3b2521","#291410","#1c130f","#d16338"],["#6d1315","#601f17","#ae3226","#250e0e","#deb799","#e6c59f","#e3cbaa","#ddc3a2","#e0c398","#371e19","#231717","#e2bf9e","#dcb791","#e3c09d","#e7caa2","#d3b693","#e2c9a6","#dea37b","#ebd0b0","#e9c9a9","#e7caa2","#b59d81","#e7c49a","#d1a279","#e6ccaa","#eec195","#e2c5a3","#ebd1b0","#e8c199","#ebcda7","#e8d0ac","#8f1614","#b71a1b","#e6b695","#e9cca5","#dfbf9b","#e0c19d","#e7caa4","#3e332d","#8e2a1d","#813e36","#571714"],["#68110e","#443c2e","#9b291b","#321214","#e8a181","#e2c5a3","#e4ae87","#eac191","#dec09a","#e8ba8b","#dfc298","#ebc498","#e5ab79","#e4c39e","#e8bf96","#c33a20","#d9945f","#e9cca3","#ebcba2","#e07d37","#dab28c","#e4ac87","#e27f55","#e4c5a0","#e37d31","#e1ba96","#d66748","#e38550","#e2995f","#e8ccaa","#ebc99e","#e58f48","#e19867","#e4a079","#d6a77c","#e69d6b","#dcbfa0","#dd9163","#392622","#643820","#7a1e19","#631010"],["#c74116","#94291d","#6d2922","#3b1211","#a62d24","#ab6054","#641f1d","#7d372d","#954f47","#5f1818","#9c5f54","#913c35","#8b3c33","#94534d","#95463b","#79483d","#9a473f","#8e5147","#975d52","#73362c","#945b4f","#a15f51","#8e3633","#a1594f","#90483e","#9d524c","#833532","#99544b","#723930","#805045","#976150","#905548","#68322a","#74372e","#9e6155","#512822","#8a5045","#a2544d","#46322b","#761c17","#943a24","#d86025"],["#a6371d","#9d1210","#a9100f","#722918","#6c1c23","#6a2a1c","#511714","#431510","#2a110d","#2c120c","#a75e45","#8e281b","#c38a68","#36130e","#531812","#432219","#631613","#964732","#841b16","#541c11","#21160f","#341615","#864638","#671b19","#8f483a","#8d403a","#6c2019","#2d120c","#3b1a14","#4a1d1a","#6a2619","#4e1b14","#934337","#3e160e","#7b281e","#823a26","#371611","#5f1d17","#692118","#941210","#af1210","#7f1e14"],["#521112","#350c0c","#3c1712","#661d1e","#ba3209","#5a1f17","#5b4134","#911816","#733c36","#c14023","#af3923","#904023","#911a17","#8b2017","#8e2719","#d2ae8f","#d8baa1","#51150c","#8c1612","#37120d","#a81814","#b9231e","#501e14","#a91b15","#681a15","#e8c398","#c5a69e","#852518","#661c17","#821711","#401e18","#6d241f","#cc2711","#401816","#a72c1b","#a81213","#6d2213","#ca4c1a","#632c1d","#331512","#2e130d","#5a1111"],["#5c170d","#4c1e11","#80190f","#21100b","#4d2529","#753a2d","#8e120f","#240e08","#351b15","#472828","#87492e","#b70e0d","#cd7652","#2b130f","#6d2711","#621d15","#7c2023","#c73f18","#601215","#371611","#34110d","#691c11","#892819","#772b28","#381a11","#962f28","#52150c","#341d15","#2e150d","#be6a34","#ac100b","#23150d","#462f46","#34140c","#b91914","#993725","#251712","#51333a","#18130b","#9f3e2f","#841b0d","#7a2310"],["#6f4036","#826557","#705949","#6a5a51","#715844","#755f4c","#6c604c","#75624f","#8a715b","#8f7a66","#887565","#94846e","#948873","#927969","#926856","#807b69","#9c8a73","#8a7561","#90826d","#8a6b5c","#81684f","#7c6c55","#8e725f","#857968","#958770","#968470","#948473","#957f69","#8a7b69","#978268","#93836b","#9b7a66","#857a64","#826f5b","#976e5b","#94846e","#957969","#9e7e6b","#7c6754","#684338","#5e3f38","#723b30"],["#301c1b","#d6c2a6","#251412","#dfcfb6","#2c0e04","#ddcdb4","#391b0c","#caaf91","#4a3432","#dcc9ad","#280f03","#d2bb9e","#423a2c","#c7b79f","#554126","#d4c5ad","#341c05","#e2d2b7","#2e2111","#decbaf","#3d2a21","#dac8af","#55392f","#e0d1b7","#4a322d","#d9c5aa","#2c0b01","#d9c4a7","#312520","#dbc8ac","#341910","#e3d0b6","#544023","#bba287","#48412d","#cbb392","#453133","#d8c3a7","#321108","#dbcab2","#3d2f29","#dcc7ac"],["#443629","#d7ceb8","#27250b","#d5cab6","#523825","#edeeee","#270e0c","#e4dbc8","#341910","#e6dbca","#4b3a2d","#eeeeee","#21180c","#e3dace","#21170a","#e6dbc6","#56432e","#e8e2d7","#463d33","#eeeeed","#33250e","#e1d7c3","#31160e","#e3ded6","#321c07","#dfd7cb","#2c2411","#eeefee","#4f4231","#e1dacf","#5a472d","#e4d7c5","#49371a","#eeeeee","#4d4225","#d9cebe","#4b3a1b","#eeefee","#56492c","#e2dad0","#403518","#e3ddd2"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "cookie",
    name: "have a cookie",
    grid: [
        "X"
      ],
    color: [["#3e2e1d","#b38451","#472300","#ffba7a","#ffba7a","#b38451","#3e2e1d"],["#b38451","#ffba7a","#ffba7a","#ffba7a","#ffba7a","#ffba7a","#b38451"],["#ffba7a","#ffba7a","#ffba7a","#472300","#ffba7a","#ffba7a","#ffba7a"],["#ffba7a","#ffba7a","#ffba7a","#ffba7a","#ffba7a","#472300","#ffba7a"],["#ffba7a","#472300","#ffba7a","#ffba7a","#ffba7a","#ffba7a","#ffba7a"],["#b38451","#ffba7a","#ffba7a","#472300","#ffba7a","#ffba7a","#b38451"],["#3e2e1d","#b38451","#ffba7a","#ffba7a","#ffba7a","#b38451","#3e2e1d"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "saltine",
    name: "a saltine cracker",
    grid: [
        "X"
      ],
    color: [["#ffefcc","#ffefcc","#ffefcc","#ffefcc","#ffefcc","#ffefcc","#eed8aa"],["#ffefcc","#87754f","#ffecc2","#87754f","#ffecc2","#87754f","#eed8aa"],["#ffefcc","#ffecc2","#ffecc2","#ffecc2","#ffecc2","#eed8aa","#eed8aa"],["#ffefcc","#87754f","#ffecc2","#87754f","#ffecc2","#87754f","#eed8aa"],["#ffefcc","#ffecc2","#ffecc2","#ffecc2","#ffecc2","#eed8aa","#eed8aa"],["#ffefcc","#87754f","#eed8aa","#87754f","#eed8aa","#87754f","#eed8aa"],["#eed8aa","#eed8aa","#eed8aa","#eed8aa","#eed8aa","#eed8aa","#eed8aa"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "flemish",
    name: "a 12th century Flemish castle",
    grid: [
        "XX...XX",
        "XXXXXXX",
        "XXXXXXX",
        "XXXXXXX",
        "XXXXXXX"
      ],
    color: [["#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3","#a3a3a3","","","","","","","","","","","","","","","","#a3a3a3","#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3"],["#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","","","","","","","","","","","","","","","","#828282","#828282","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3"],["#2e2e2e","#a3a3a3","#a3a3a3","#696969","#696969","#696969","#696969","#a3a3a3","#a3a3a3","#2e2e2e","","","","","","","","","","","","","","","","#2e2e2e","#a3a3a3","#a3a3a3","#696969","#696969","#696969","#696969","#a3a3a3","#a3a3a3","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e","","","","","","","","","","","","","","","","#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#828282","#828282","#828282","#a3a3a3","#a3a3a3","#696969","#2e2e2e","","","","","","","","","","","","","","","","#2e2e2e","#545454","#828282","#828282","#a3a3a3","#a3a3a3","#a3a3a3","#828282","#545454","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#828282","#828282","#696969","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#828282","#828282","#828282","#828282","#a3a3a3","#b5b5b5","#b5b5b5","#b5b5b5","#b5b5b5","#b5b5b5","#a3a3a3","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#352b50","#a3a3a3","#b5b5b5","#b5b5b5","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#352b50","#a3a3a3","#828282","#828282","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#696969","#696969","#696969","#696969","#696969","#696969","#696969","#696969","#696969","#878787","#878787","#878787","#878787","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#a3a3a3","#828282","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#828282","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e","#828282","#828282","#828282","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#828282","#828282","#828282","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#878787","#b5b5b5","#b5b5b5","#b5b5b5","#b5b5b5","#a3a3a3","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#a3a3a3","#b5b5b5","#b5b5b5","#b5b5b5","#b5b5b5","#b5b5b5","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#545454","#828282","#828282","#828282","#a3a3a3","#352b50","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#828282","#828282","#828282","#a3a3a3","#352b50","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#352b50","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#b5b5b5","#b5b5b5","#352b50","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#352b50","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#352b50","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#352b50","#a3a3a3","#b5b5b5","#b5b5b5","#b5b5b5","#352b50","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#352b50","#a3a3a3","#696969","#2e2e2e"],["#585858","#878787","#b5b5b5","#b5b5b5","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e","#b5b5b5","#b5b5b5","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#828282","#828282","#a3a3a3","#a3a3a3","#a3a3a3","#828282","#828282","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#a3a3a3","#b5b5b5","#b5b5b5","#b5b5b5","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#b5b5b5","#b5b5b5","#a3a3a3","#a3a3a3","#6c5933","#897a5c","#6c5933","#6c5933","#6c5933","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#352b50","#a3a3a3","#b5b5b5","#b5b5b5","#b5b5b5","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#828282","#828282","#a3a3a3","#564729","#897a5c","#6c5933","#6c5933","#564729","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#352b50","#828282","#828282","#828282","#828282","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#564729","#897a5c","#564729","#6c5933","#564729","#a3a3a3","#a3a3a3","#a3a3a3","#b5b5b5","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#352b50","#a3a3a3","#828282","#828282","#828282","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#564729","#6c5933","#564729","#6c5933","#6c5933","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#352b50","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#828282","#828282","#828282","#a3a3a3","#6c5933","#6c5933","#6c5933","#897a5c","#6c5933","#a3a3a3","#828282","#828282","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#b5b5b5","#b5b5b5","#b5b5b5","#b5b5b5","#828282","#828282","#545454","#2e2e2e"],["#2e2e2e","#696969","#b5b5b5","#b5b5b5","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#6c5933","#6c5933","#6c5933","#897a5c","#6c5933","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#828282","#828282","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#897a5c","#6c5933","#564729","#6c5933","#897a5c","#a3a3a3","#a3a3a3","#a3a3a3","#b5b5b5","#b5b5b5","#585858","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#828282","#828282","#828282","#828282","#a3a3a3","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#897a5c","#6c5933","#564729","#6c5933","#6c5933","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#b5b5b5","#b5b5b5","#b5b5b5","#a3a3a3","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#9c9c9c","#9c9c9c","#9c9c9c","#696969","#2e2e2e","#828282","#828282","#a3a3a3","#a3a3a3","#a3a3a3","#6c5933","#6c5933","#564729","#6c5933","#897a5c","#a3a3a3","#828282","#828282","#828282","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#828282","#828282","#a3a3a3","#696969","#2e2e2e"],["#2e2e2e","#696969","#a3a3a3","#a3a3a3","#b5b5b5","#b5b5b5","#b5b5b5","#a3a3a3","#696969","#2e2e2e","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#6c5933","#897a5c","#6c5933","#6c5933","#897a5c","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#2e2e2e","#696969","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#a3a3a3","#696969","#2e2e2e"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "refreshing",
    name: "a tall, cold, refreshing glass of paint thinner",
    grid: [
        "XX",
        "XX",
        "XX",
        "XX"
      ],
    color: [["#75908d","#95aca9","#d4d4d4","#d4d4d4","#d4d4d4","#d8e5e5","#95aca9","#758e8c"],["#749295","#a9b7b6","#9bbbba","#95aca9","#95aca9","#9bbbba","#d5e5e5","#88aba5"],["#73908c","#acbcbe","#c9d9d9","#d9e5e5","#cfe2e0","#ebfff5","#d3e5e2","#819a9e"],["#809f99","#b3c3c3","#c9d9d9","#d1e4e5","#cdddda","#e0f8e9","#d5e5e5","#82a29f"],["#82a49e","#aab6b8","#cad9d9","#d3e5e5","#d0e5e2","#e6fcf5","#cbdfd9","#829fa2"],["#83a5a1","#b1bfc1","#bdd0cc","#d8e5e5","#cfe2dd","#e9f9ef","#d2e5e2","#95b4ac"],["#819c9e","#a5beb9","#c5d8dc","#dbe5e5","#cfe5e5","#f1fff5","#cbdee0","#819998"],["#88a39f","#bbc3c3","#bdd0ce","#d3e5e5","#d3e5e5","#f3fff5","#cbe0e1","#97b2ac"],["#779594","#a9b7b6","#c8d9d9","#d8e5e5","#cbdbde","#def1ec","#dbe5e5","#8da9a7"],["#758d8e","#bac3c3","#c6d9d8","#d2e5e5","#d6e5e5","#f8fff5","#d0e0e2","#92a9ab"],["#76928e","#a9bbb9","#c0d2d7","#dbe5e5","#d8e5e5","#e1fae9","#d8e5e5","#8faca9"],["#7f9a9d","#b4c3c3","#bdcece","#d3e4e0","#c5d8dc","#e8fcf5","#dde5e5","#7ea29d"],["#7e9696","#a5b5b9","#c2d9d9","#cbe2e0","#d5e5e3","#f1fff5","#d0dedf","#88a7a5"],["#749092","#b6c3c3","#ccd9d9","#d8e5e5","#cfe2dd","#f8fff5","#ccdfdf","#8caaa6"],["#758b8c","#9fabab","#bac1c1","#b6c7c2","#c6d3d6","#c5d5d2","#bccdcc","#809c9a"],["#647d76","#7d9192","#89a3a0","#93aba8","#a7bebc","#a7c1be","#95aead","#708c88"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "column",
    name: "a tiny vase on a tall marble column",
    grid: [
        "X",
        "X",
        "X",
        "X",
        "X",
        "X",
        "X"
      ],
    color: [["#182f34","#00941e","#00941e","#006b15","#182f34"],["#182f34","#182f34","#00941e","#182f34","#182f34"],["#182f34","#00941e","#00941e","#006b15","#182f34"],["#182f34","#00941e","#00941e","#006b15","#182f34"],["#182f34","#00941e","#006b15","#006b15","#182f34"],["#575757","#575757","#575757","#575757","#575757"],["#cccccc","#cccccc","#cccccc","#cccccc","#cccccc"],["#7a7a7a","#575757","#575757","#575757","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#cccccc","#7a7a7a","#cccccc","#7a7a7a"],["#7a7a7a","#575757","#575757","#575757","#7a7a7a"],["#7a7a7a","#cccccc","#cccccc","#cccccc","#7a7a7a"],["#575757","#575757","#575757","#575757","#575757"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "onefish",
    name: "one fish",
    grid: [
        "X",
        "X"
      ],
    color: [["#008500","#008a06","#006106","#001f02","#006106","#028b08","#009206"],["#018b0b","#018607","#008000","#0f9714","#0d9e17","#049311","#099517"],["#006106","#008501","#018c09","#00b30c","#008300","#048e09","#006106"],["#006106","#059710","#089410","#00b30c","#099b15","#038c07","#006106"],["#001f02","#006106","#0c9412","#008100","#019209","#006106","#001f02"],["#001f02","#006106","#008e07","#0b9313","#129e18","#006106","#001f02"],["#006106","#028d04","#018b0e","#00b30c","#0fa316","#018c0b","#006106"],["#069d14","#008202","#00b30c","#00b30c","#00b30c","#00910a","#059d14"],["#0aa118","#008808","#00940a","#099617","#008908","#009009","#07991a"],["#008704","#008905","#00b30c","#ccfff7","#ccfff7","#ccfff7","#008906"],["#00920b","#008d01","#00b30c","#ccfff7","#00473d","#ccfff7","#009008"],["#089918","#079112","#00b30c","#ccfff7","#ccfff7","#007f02","#007c00"],["#006106","#019010","#008e01","#059811","#008800","#008600","#006106"],["#001f02","#006106","#0a9b14","#008808","#008600","#006106","#001f02"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0.1,
    nextShapeProbs: [
        1
      ],
    nextShapes: [
        "twofish"
      ],
    tags: [
        "food"
      ],
  },
  {
    id: "twofish",
    name: "two fish",
    grid: [
        "X.X",
        "X.X"
      ],
    color: [["#008500","#008a06","#006106","#002903","#006106","#028b08","#009206","","","","","","","","#008500","#008a06","#006106","#002903","#006106","#028b08","#009206"],["#018b0b","#018607","#008000","#0f9714","#0d9e17","#049311","#099517","","","","","","","","#018b0b","#018607","#008000","#0f9714","#0d9e17","#049311","#099517"],["#006106","#008501","#018c09","#00b30c","#008300","#048e09","#006106","","","","","","","","#006106","#008501","#018c09","#00b30c","#008300","#048e09","#006106"],["#006106","#059710","#089410","#00b30c","#099b15","#038c07","#006106","","","","","","","","#006106","#059710","#089410","#00b30c","#099b15","#038c07","#006106"],["#002903","#006106","#0c9412","#008100","#019209","#006106","#002903","","","","","","","","#002903","#006106","#0c9412","#008100","#019209","#006106","#002903"],["#002903","#006106","#008e07","#0b9313","#129e18","#006106","#002903","","","","","","","","#002903","#006106","#008e07","#0b9313","#129e18","#006106","#002903"],["#006106","#028d04","#018b0e","#00b30c","#0fa316","#018c0b","#006106","","","","","","","","#006106","#028d04","#018b0e","#00b30c","#0fa316","#018c0b","#006106"],["#069d14","#008202","#00b30c","#00b30c","#00b30c","#00910a","#059d14","","","","","","","","#069d14","#008202","#00b30c","#00b30c","#00b30c","#00910a","#059d14"],["#0aa118","#008808","#00940a","#099617","#008908","#009009","#07991a","","","","","","","","#0aa118","#008808","#00940a","#099617","#008908","#009009","#07991a"],["#008704","#008905","#00b30c","#ccfff7","#ccfff7","#ccfff7","#008906","","","","","","","","#008704","#008905","#00b30c","#ccfff7","#ccfff7","#ccfff7","#008906"],["#00920b","#008d01","#00b30c","#ccfff7","#00473d","#ccfff7","#009008","","","","","","","","#00920b","#008d01","#00b30c","#ccfff7","#00473d","#ccfff7","#009008"],["#089918","#079112","#00b30c","#ccfff7","#ccfff7","#007f02","#007c00","","","","","","","","#089918","#079112","#00b30c","#ccfff7","#ccfff7","#007f02","#007c00"],["#006106","#019010","#008e01","#059811","#008800","#008600","#006106","","","","","","","","#006106","#019010","#008e01","#059811","#008800","#008600","#006106"],["#002903","#006106","#0a9b14","#008808","#008600","#006106","#002903","","","","","","","","#002903","#006106","#0a9b14","#008808","#008600","#006106","#002903"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0,
    nextShapeProbs: [
        1
      ],
    nextShapes: [
        "redfish"
      ],
    tags: [
        "food"
      ],
  },
  {
    id: "redfish",
    name: "red fish",
    grid: [
        "X",
        "X"
      ],
    color: [["#852800","#8a2f00","#612300","#1f0b00","#612300","#8b3102","#923200"],["#8b3401","#862f01","#802600","#973d0f","#9e420d","#933c04","#954109"],["#612300","#852900","#8c3301","#b34200","#832700","#8e3204","#612300"],["#612300","#973c05","#943a08","#b34200","#9b4109","#8c3003","#612300"],["#1f0b00","#612300","#943b0c","#812700","#923401","#612300","#1f0b00"],["#1f0b00","#612300","#8e3200","#933c0b","#9e4212","#612300","#1f0b00"],["#612300","#8d2e02","#8b3701","#b34200","#a3420f","#8c3501","#612300"],["#9d4106","#822900","#b34200","#b34200","#b34200","#913500","#9d4205"],["#a1450a","#883100","#943600","#964109","#893100","#903400","#994607"],["#872c00","#892e00","#b34200","#f8ffcc","#f8ffcc","#f8ffcc","#892f00"],["#923700","#8d2b00","#b34200","#f8ffcc","#3c4700","#f8ffcc","#903300"],["#994308","#913b07","#b34200","#f8ffcc","#f8ffcc","#7f2800","#7c2500"],["#612300","#903b01","#8e2c00","#983d05","#882900","#862800","#612300"],["#1f0b00","#612300","#9b3f0a","#883100","#862800","#612300","#1f0b00"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0,
    nextShapeProbs: [
        0.5,
        0.5
      ],
    nextShapes: [
        "bluefish",
        "bluefishbig"
      ],
    tags: [
        "food"
      ],
  },
  {
    id: "bluefish",
    name: "blue fish",
    grid: [
        "X",
        "X"
      ],
    color: [["#006685","#00648a","#004461","#00151f","#004461","#02658b","#006a92"],["#01618b","#016186","#006380","#0f7297","#0d739e","#046593","#096695"],["#004461","#006585","#01638c","#007db3","#006583","#04698e","#004461"],["#004461","#056a97","#086b94","#007db3","#096d9b","#03688c","#004461"],["#00151f","#004461","#0c6e94","#006381","#016992","#004461","#00151f"],["#00151f","#004461","#00658e","#0b6b93","#12779e","#004461","#00151f"],["#004461","#026a8d","#015e8b","#007db3","#0f7aa3","#01618c","#004461"],["#066c9d","#006282","#007db3","#007db3","#007db3","#006691","#056a9d"],["#0a70a1","#006088","#006894","#096796","#006189","#006690","#076499"],["#006487","#006489","#007db3","#d0ccff","#d0ccff","#d0ccff","#006389"],["#006592","#006b8d","#007db3","#d0ccff","#060047","#d0ccff","#006790"],["#086899","#076691","#007db3","#d0ccff","#d0ccff","#005f7f","#005f7c"],["#004461","#016090","#006b8e","#056a98","#006888","#006786","#004461"],["#00151f","#004461","#0a709b","#006088","#006786","#004461","#00151f"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0,
    tags: [
        "food"
      ],
  },
  {
    id: "bluefishbig",
    name: "blue fish",
    grid: [
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX"
      ],
    color: [["#28950a","#249500","#1d8b00","#188c00","#1c8900","#108100","#2a9807","#259401","#1d8d01","#158200","#188a00","#178a00","#239503","#198a00","#249406","#26990a","#188c00","#1f9000","#209404","#229509","#138400"],["#219100","#178200","#289807","#2d3b3d","#101d23","#1d8c00","#1b8e00","#138500","#27970b","#28970c","#1b8700","#1f8d00","#1c8700","#138500","#1c8d00","#1e8800","#2a9908","#1c8900","#303a43","#198700","#249203"],["#24990a","#148600","#249103","#158600","#1e2330","#162028","#334348","#219101","#1b8b01","#249609","#258f05","#1b8700","#1d8d02","#1e8c03","#249406","#299d0a","#1d8d00","#0e1b21","#2b3540","#269b07","#1b8400"],["#108500","#279509","#158800","#1b8800","#209008","#19242c","#18232e","#0f1e28","#28980a","#279308","#188c00","#229105","#178600","#1a8d00","#1a8b00","#127f00","#269501","#292a38","#168200","#178000","#2a9609"],["#198c00","#178300","#269301","#208c00","#249404","#1e9006","#2f313c","#15232c","#209401","#259705","#1e9100","#1e8c02","#249305","#1f9503","#141f29","#373442","#36323e","#292e3a","#1b8800","#209201","#269201"],["#2b9608","#259506","#1a8600","#26950b","#168600","#108500","#2c363f","#30343d","#1e2331","#1f2531","#198c00","#26990c","#18252e","#313343","#343843","#333945","#3b3946","#279602","#188800","#218d03","#259308"],["#269601","#299b0b","#1f8d00","#128700","#259b08","#228e04","#158a00","#3b3e4d","#313745","#303946","#18222d","#2c2e3a","#43475a","#343e4c","#373c4a","#31333e","#1f8c00","#1d8d00","#188500","#158900","#209403"],["#218e00","#1b8f00","#219705","#1a8a00","#1f9104","#1e9100","#2a9805","#4a5b6f","#536d82","#668295","#506576","#4f5970","#59788d","#4c6072","#4d5566","#303442","#198600","#29950a","#259704","#1a8900","#229209"],["#229805","#269505","#239704","#239100","#148600","#2a9207","#118500","#56778b","#759eb6","#7ab2d4","#7eaac0","#6c9cbb","#4a82a0","#457087","#484f60","#158500","#1f9502","#148800","#158800","#138a00","#1d8a00"],["#1f8b00","#229108","#148a00","#209200","#1a8900","#219606","#138400","#188300","#91b9d1","#8bbdd8","#7faac3","#6497b3","#3f83a6","#65879f","#454e5e","#1b8600","#198700","#1e8c02","#1a8600","#26990c","#219405"],["#168900","#1f8c00","#2a9706","#198600","#2c9a0a","#2c9d08","#1e8e05","#239706","#abcfe3","#9ec4db","#88b7d5","#69a0bf","#28657f","#5d87a2","#299309","#289308","#188900","#1f9000","#108500","#289708","#168700"],["#1e8d00","#289807","#279602","#249200","#148b00","#239306","#128200","#289705","#abd1e3","#99c2d6","#8abeda","#629bb5","#327193","#1b8d00","#269604","#1b8f00","#1e8b00","#218c00","#269906","#208b00","#229200"],["#29950a","#1e8a00","#118300","#1b8a00","#1d8d00","#1b8b00","#188700","#198c00","#8cadc3","#9cbfd5","#8bc0d9","#629cbc","#204a63","#1f8900","#239200","#1f9201","#1f8b01","#158200","#239006","#188f00","#299804"],["#1e8d04","#2b9b0a","#1d9100","#229003","#219300","#1b8700","#289104","#2b9409","#cadae3","#9dc1db","#8bc1db","#67a6c3","#235168","#239300","#148600","#1c8b02","#239206","#269808","#128400","#269405","#168700"],["#209204","#168300","#148900","#229707","#209107","#249402","#26940b","#1d8800","#84a7b9","#9bc1d4","#85bcdd","#64a1c3","#296079","#1c9000","#1f9004","#259707","#138600","#249200","#168100","#259601","#188700"],["#128300","#168900","#198a00","#128600","#1c9001","#158300","#238f04","#209101","#b8d2e8","#a1c2d9","#83bada","#64a3c1","#235d7c","#209200","#1d8c00","#2b960a","#1a8a00","#178800","#229405","#1d8600","#1f9201"],["#198300","#198b00","#2c950a","#1c8e00","#2c950a","#1a8a00","#2a970b","#249309","#aed0e3","#a4c5dd","#77b1cf","#4c90b2","#296385","#1d8a00","#1f8800","#128800","#198b00","#259106","#1f9205","#158900","#2a9d0a"],["#2b9709","#199000","#26980a","#1a8800","#158a00","#229806","#229003","#bbc2d9","#afd3e9","#9cc0d7","#7cb2d0","#539ec5","#4082a6","#1c4458","#299407","#1a8800","#168700","#1f9100","#178a00","#1d8c02","#289409"],["#259606","#1c8d00","#299804","#218c01","#208e01","#289406","#6f6f96","#cae1ee","#a1c1da","#9dc2d5","#82bbd6","#529abf","#347499","#2a6682","#162328","#188800","#158500","#138500","#218c00","#2b9609","#279c0b"],["#188a00","#268f05","#279206","#1e8e01","#168700","#188f00","#b3bdd3","#cee8f7","#a0c4d8","#94bcd0","#70acce","#69aed0","#458aab","#3a7a9f","#122227","#1d9104","#289808","#269b08","#1c9001","#158900","#168700"],["#188500","#1a8c00","#279404","#29950b","#188500","#636287","#d0e4f0","#b3d2e6","#9abccf","#9dc1d9","#79accb","#7bbddb","#5191b1","#296382","#123142","#1a8c00","#168600","#188b00","#188700","#28970c","#118000"],["#289408","#1e8e03","#1b8c00","#1f9203","#a5b0b3","#9795b0","#dbf3fa","#b4d5e8","#9ec0d6","#99bed7","#7cb2d0","#5da5c8","#5796b4","#2f6c8d","#1e4e68","#14232e","#168200","#128700","#138200","#1c8800","#2c9e09"],["#26950a","#2a970c","#178800","#2a9409","#606689","#c7cee3","#d3f0fa","#b4d4ea","#9dc0d2","#8cb1ca","#74abc6","#5aa2c7","#5098be","#3a7498","#23607a","#101f28","#239501","#1d8800","#1e9303","#1a8a00","#1f9000"],["#198f00","#289204","#1c8800","#505b74","#79779d","#d4edfa","#c5e7f7","#b3d4e4","#96b6cc","#91b8d4","#7ab0cc","#58a4c8","#5898b9","#38728f","#245f7e","#142938","#1c2633","#2d9d07","#1d9103","#148700","#1c9100"],["#1f9100","#1c8a00","#4e526c","#606180","#c4cbdf","#d2eaf6","#b9d9ed","#aacee2","#9ebed4","#85b1c8","#81b7d6","#63aace","#488db7","#3d748d","#316a8a","#255264","#222d37","#2b9507","#249809","#198c00","#148500"],["#1e8900","#1b8700","#6e6d89","#74719c","#c6deed","#d5eaf5","#c2e2f6","#accddf","#9dbed5","#86adc8","#84b8d5","#6fafd0","#3e88ae","#427ea0","#316a88","#255871","#18222a","#363b48","#209206","#219200","#1f8900"],["#168a00","#178600","#279906","#9ea7bb","#c9ecf7","#c8e9f6","#bad9eb","#a8cae0","#a5c7db","#87aec8","#72a4c4","#74b7d9","#458db5","#4a84a4","#2e6986","#20526d","#142229","#393e4f","#3f445a","#59585f","#108700"],["#188600","#198a00","#249308","#c2c9e0","#cbe7f1","#c3e8f6","#b6d9eb","#accfe2","#9fc3d7","#8db5cf","#73a6c3","#6eb4d4","#4e99bf","#558dad","#347094","#1f556e","#19343e","#444a5b","#485167","#474c58","#188300"],["#1c8d00","#1e8600","#168500","#c2e6f6","#d3ebfb","#bbdcf0","#b6d6eb","#adcde2","#8badc6","#81aac1","#7aafcd","#559dc2","#4692b7","#3d748f","#2b6280","#316e8e","#27617f","#343842","#64647b","#219000","#1e9201"],["#178c00","#1e9000","#148900","#bfdfee","#d2effa","#c2e4f2","#beddf2","#a6c9de","#a2c7da","#8eb7d1","#7bacca","#5da7ca","#5da7c9","#4592b6","#3f85ab","#296587","#235469","#1d222d","#58596b","#168500","#2a9a0b"],["#118400","#29970b","#178600","#bdd9e7","#c9e5f4","#c7eaf9","#c0e3f6","#b7d8ea","#aacee2","#81acc5","#84b7d1","#64aac8","#61abcd","#3c85aa","#3f8aaf","#21556d","#22556c","#0f1e24","#2b3741","#239409","#178700"],["#188800","#1a8b01","#279c0b","#c2e5f4","#cce8f4","#bee1ef","#bedeee","#a2c6da","#a6cee2","#96bfd6","#78a6be","#5097bf","#6eb2d5","#387aa0","#266482","#2d6889","#215973","#05131c","#228e00","#239200","#1a9000"],["#209200","#198b00","#1c9101","#c2e4f6","#c8eafa","#c3e1f3","#b1d1e6","#b0d2ea","#99bcd5","#8bb2ce","#7caac4","#5ea3c4","#6fb5d8","#4d9ac1","#427c9e","#367491","#1c4e64","#0e1d24","#108100","#279603","#259308"],["#1a8b00","#178800","#269408","#c2e1f1","#c3e7f5","#b9daec","#b5d8ee","#a7cadf","#9bc0d4","#84adc6","#7aa4ba","#66a7c9","#75b6d8","#4c96ba","#3b779b","#2e6886","#245876","#0d2027","#299a07","#168800","#219204"],["#1f9100","#188b00","#1f9103","#bddfee","#bfe4f1","#c6e8f6","#b6daee","#aacfe2","#91b2cb","#8cb6cc","#7fa4c0","#67a6c9","#66b0d2","#5faacd","#286586","#387ca1","#265c79","#132931","#198f00","#259100","#1b8e00"],["#299a09","#2a9a0a","#1a8900","#c2e3f5","#c5e4f4","#c9ebfb","#b3d7ed","#accee7","#9dc1d4","#92bbd2","#8ab4cb","#6fa9c8","#6ab1cf","#69afd4","#3e82a2","#2e6d8e","#2d6784","#14232f","#1d9000","#218e04","#2a9e0a"],["#158b00","#1e8900","#299609","#c2e0f1","#c9eaf7","#b5dcec","#a8d9f0","#9fc6e2","#a3c7da","#83b0c8","#82abc7","#69a0c1","#5fa8c9","#73b7d6","#468cb1","#377695","#286585","#0d1d2a","#1c8c00","#249202","#219003"],["#1f9000","#198a00","#289904","#c1e4f4","#c9ecfb","#aedff2","#a1d2f0","#94c1d8","#a1c6da","#7bb0c9","#749cb3","#6096b6","#71b2d4","#61a6cc","#428eb4","#4083a7","#235f7a","#12242d","#1a8700","#1a8900","#218f03"],["#1e8c00","#198900","#2a9904","#c9e7f7","#c2e9f6","#b1e4f7","#a0d2ec","#91bed6","#9bc2d9","#6c93ad","#6a94ab","#74a2bf","#7bbadb","#6daccf","#4b97bd","#205b76","#244f62","#15272f","#1b8a00","#2c990a","#128500"],["#218c00","#259401","#1e9401","#b3e1f6","#b5e3f5","#afe1f1","#9dd1e8","#93c3db","#a1c5db","#87b2c8","#7ba2bb","#7cb0cd","#7ab8d4","#81bad9","#4f97bc","#2c678a","#275871","#0e1e29","#259305","#229003","#1b8900"],["#259409","#1b8b00","#188300","#abe1f7","#bbe9fa","#29617d","#a6d7f1","#99c8e0","#9bc0da","#8cb7cd","#88afca","#82b1ca","#91cae6","#8ec1dd","#6aaccd","#3e789a","#256182","#153644","#1b8500","#2a9b08","#168600"],["#269705","#b6c1ce","#269403","#9fd8f9","#acdff2","#b3e5f4","#285c7a","#9ec6de","#95bdd1","#82acc2","#79a4ba","#87b4cb","#9fcfec","#96cbe4","#7cb5d6","#387c9e","#2f6a8d","#132834","#249502","#269b09","#1c8b00"],["#198a00","#bec9d9","#95a2b7","#9edbf8","#aee5fa","#afe2f3","#a7cee2","#708d9c","#8fbbd6","#94beda","#89b4c8","#8fb9d2","#90c6e5","#91c3df","#7ab3d4","#4e8fb4","#24617c","#0d232b","#1a8e00","#1e8a00","#209305"],["#1f8e00","#208b00","#acbaca","#95cdec","#a7dcf4","#bce8fb","#9fd4e9","#a7b4ae","#98bcd3","#81b0ca","#96c1d5","#9fc3d7","#9fc9e2","#9cc8e2","#85bfdd","#417ea0","#347595","#11212c","#299506","#1f9005","#269908"],["#239607","#2b9d09","#b9c4d7","#91ceeb","#96d2f0","#baeafb","#a7def5","#636971","#5a6878","#648b9e","#88b2cc","#a5cbe4","#a3cae6","#7fbad6","#80b3d3","#468bb0","#3a7a9a","#13242b","#269904","#219000","#1f8c00"],["#228f00","#24990a","#289506","#99d5f3","#98d3f1","#bceafe","#ace0fa","#9ccfe7","#697985","#030a10","#b7deee","#a0c7db","#9cc1db","#a1cae7","#7fb8da","#357aa0","#28627f","#04111a","#209307","#249602","#28990a"],["#219000","#128500","#269a08","#a1d6ef","#96ceef","#b4e5f3","#afe1f4","#90c4df","#a4ccde","#1b202a","#c2e3f5","#99cce4","#99cbe7","#8fc7e8","#6fb2d3","#3681a3","#27607f","#0d1822","#219200","#2d9d08","#279c09"],["#209000","#158b00","#1b8b01","#1b8c00","#9ed5f1","#b5e7f9","#b2dcf2","#afd5ec","#96b6c5","#83939e","#7099b1","#6990a4","#86abc2","#4a7389","#639fbd","#3b85a8","#215264","#188600","#198d00","#118500","#158600"],["#279005","#249206","#299807","#1c8e03","#a0cfed","#b1daf0","#b4c6d6","#7c8d97","#92b1ca","#9ebbd2","#7ba5bd","#86aac4","#7095ac","#79b8d9","#62778f","#3a7a9a","#1b4357","#158400","#1a8600","#178a00","#1e8b00"],["#138500","#269505","#29980b","#158800","#88c2de","#b5c9da","#959fb0","#a8c2dd","#b0ccdc","#90b6c8","#6896ad","#89b0c4","#456a7b","#1c3042","#33414e","#2a637d","#132633","#239305","#269205","#279909","#208f00"],["#168300","#1e8c00","#1f8d00","#158500","#93c9e6","#beddf3","#acc6d9","#afcce5","#96bad3","#7b9db4","#233440","#0b1922","#3d4355","#0d1a22","#9eacac","#173b47","#09151f","#208d00","#249001","#238f00","#1c8b00"],["#239603","#279409","#1b8800","#279307","#158800","#c5e8f7","#a9c8e2","#6da2bf","#8bb0c9","#9ebbcf","#abc1ce","#b3c7d6","#7eb1ca","#3f6676","#19232d","#617683","#05121d","#229203","#158700","#148300","#1a8a02"],["#1a8700","#289504","#23940a","#1f8f02","#1a8d00","#a9cde1","#98c8e1","#93bedb","#afcee8","#d7eaf8","#cfe2ee","#bcced9","#96bace","#528aac","#273e4f","#26576d","#0b1924","#299a07","#2a9806","#27960c","#229608"],["#1f8900","#279103","#198800","#1d9200","#279d09","#229100","#a0cdeb","#a9cadd","#b7d2df","#b5ccd6","#cbe3ed","#c0d2e0","#92afbe","#7da2bc","#527488","#284a60","#1a8e00","#158200","#138400","#249607","#27930a"],["#1a8e01","#219604","#148800","#229507","#269401","#299507","#a3cce1","#9fbecf","#bed4e4","#b5d0e1","#93b0c3","#81a9bb","#6a8fa6","#5390ac","#284453","#173543","#178500","#2b9d09","#249309","#178300","#158900"],["#138600","#1c9000","#239309","#188900","#289406","#1a8e00","#a4adb5","#9dbfd5","#9dc3dc","#92b4ca","#9dbdcb","#39596c","#334d61","#335970","#0b161f","#18272d","#28970d","#279204","#248f00","#1e8c02","#249207"],["#208d00","#198800","#168800","#158600","#239406","#158700","#95bad0","#86afcb","#a3c5d7","#8cb2cd","#78aecb","#040d11","#252d34","#18242d","#14222c","#249102","#198800","#229004","#158500","#188300","#1c8c00"],["#269906","#299c0a","#188800","#178500","#148500","#249300","#95c0dc","#a0c2d5","#97bcd3","#7498b2","#8eafc6","#969e86","#1b435a","#132125","#111e24","#198a00","#209200","#269206","#1b9000","#289707","#229200"],["#198c00","#1f9000","#248d02","#27980a","#208d00","#289704","#1a8f00","#9dc1d9","#90b6d0","#7098af","#98bdd2","#89aec6","#3f5266","#0d1c23","#209401","#178800","#1f8f04","#1e9100","#188800","#148700","#198f00"],["#269003","#188200","#239806","#188e00","#148300","#1b8c00","#1b8700","#83afc5","#92b1c8","#5b595a","#5c8499","#23303c","#254e67","#111d26","#259306","#1a8900","#219807","#2c9a0a","#1d8900","#168500","#239506"],["#2a9b07","#289904","#1a8700","#188b00","#249004","#1b8a00","#168500","#6997b8","#95b5c8","#6c7679","#158200","#3c5063","#13262e","#269602","#289904","#1f9000","#24940b","#1b8c00","#138600","#299807","#209705"],["#198d00","#219207","#1f8d01","#2b970a","#289306","#118700","#1b8500","#198400","#83a5b8","#4c657a","#1c8e00","#1a8a00","#289307","#1c8700","#269403","#259501","#238f00","#219002","#198900","#1e9203","#2a9a09"],["#158200","#1d8b00","#26990b","#209406","#138600","#168d00","#2b9a08","#188a00","#198900","#1d9302","#278f04","#138600","#209000","#2b950a","#219206","#1c9201","#1c9302","#1f8e00","#158400","#198b00","#219000"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 0,
    tags: [
        "food"
      ],
  },
  {
    id: "thats",
    name: "a flower with a face",
    grid: [
        "XXX",
        "XXX",
        "XXX"
      ],
    color: [["#18001f","#330042","#72007f","#740085","#72007f","#3b0045","#18001f","#390045","#41004c","#6e007d","#6e007b","#6e007f","#3d0047","#3e0047","#18001f","#3e0045","#710082","#710081","#6f0081","#390040","#18001f"],["#36003f","#e319fb","#fb86ff","#ef25ff","#6f007b","#760086","#3d0045","#720084","#720084","#fb84ff","#fb81ff","#fb80ff","#770086","#770087","#40004d","#6c007a","#6e0080","#e81eff","#fc7dff","#e71afe","#3d004a"],["#6e007b","#ff7afb","#ffb5fc","#ff7afb","#ee24ff","#71007f","#6d007d","#6d007b","#e91cfc","#fb84ff","#ffaef4","#fc80ff","#e41af6","#6a0078","#710080","#6a007c","#e71cff","#ff7bf6","#ffb5fc","#ff7bf9","#6c007c"],["#6e007b","#df16f9","#fb87ff","#ffb7fc","#fe81ff","#ef25ff","#6d007d","#e117f2","#fb84ff","#ff7dfb","#fdb7ff","#fc82ff","#ff7cff","#e417fb","#6f0080","#df17fa","#ff81ff","#ffb2f7","#ff7ffe","#e51afc","#760082"],["#73007f","#760082","#df15f9","#fb84ff","#ffb4fd","#fb82ff","#680077","#ee21ff","#fb86ff","#ff7af8","#ffaffa","#ff7cf9","#ff77fa","#ed20ff","#6f007f","#fb85ff","#ffaaf3","#ff7cfe","#e31af9","#6f007b","#68007a"],["#340040","#6a007d","#790086","#df19f9","#ff7dfa","#ffaffa","#6a007b","#6e007b","#ee20ff","#ff7bfd","#ffa8f2","#fb89ff","#de16f6","#770084","#720082","#ffaaf3","#fb85ff","#e61efc","#730080","#770087","#3c0047"],["#18001f","#410048","#6e0080","#6a007a","#740081","#760084","#ffadf4","#760085","#730080","#fffa6c","#fffa69","#fffa6e","#740081","#68007a","#ffb3fa","#720084","#690077","#780085","#6e0080","#40004f","#18001f"],["#3c0049","#6f0081","#6d007b","#e71cff","#ed24ff","#6c0078","#6e007f","#fffa67","#fffa67","#fffa70","#fffc9f","#fff966","#fffa71","#fffa6c","#710081","#6c007a","#e41cfb","#ed21ff","#780084","#6f007d","#38003f"],["#3d0047","#780085","#e11afa","#ff77f9","#ff7ffe","#e91efc","#6e0080","#fffa6b","#fffc9d","#fffc9b","#fffca1","#fffc9f","#fffc9d","#fffc9d","#6f007d","#e91eff","#fc7fff","#ff7ffb","#df14f6","#6e007d","#760086"],["#710082","#fb85ff","#fb87ff","#fb82ff","#fb87ff","#fb84ff","#fffa71","#fffa6c","#fffc9d","#b20a00","#fffdc6","#b20a00","#fffc9d","#fffa67","#fffa69","#ff7dff","#fb85ff","#ff7bfd","#ff7cfe","#ff7af9","#740080"],["#6a007a","#fc82ff","#ffadf8","#ffb5fb","#ffaef4","#ffb2fd","#fffa66","#fffca0","#fffc9e","#fffdc1","#fffdc6","#fffdc2","#fffc99","#fffc9d","#fffa70","#ffadf8","#ffaef5","#ffb0fa","#feb7ff","#ff7cfa","#720084"],["#720082","#fb80ff","#fe82ff","#fb86ff","#fb82ff","#fb85ff","#fffa72","#fffa63","#fffc9e","#b20a00","#b20a00","#b20a00","#fffc9e","#fffa72","#fffa6c","#fb86ff","#fb86ff","#ff7cfb","#ff7dfb","#ff7dfb","#69007a"],["#3c0042","#710080","#e119f6","#ff7cfd","#ff7bff","#e116f6","#68007a","#fffa73","#b20a00","#fffc98","#fffa94","#fffc9a","#b20a00","#fffa72","#6a007c","#ea1eff","#fb82ff","#fc7fff","#e416f6","#730082","#36003f"],["#37003d","#6f007f","#6d007d","#ea1eff","#ec1eff","#6a0077","#770084","#fffa6b","#fffa67","#fffa6b","#fffca0","#fffa6d","#fffa73","#fffa68","#740086","#73007f","#df16f6","#e319fb","#760082","#730084","#390043"],["#18001f","#3d004c","#760080","#6d007a","#73007f","#680078","#ffaaf5","#71007f","#690078","#fffa6d","#fffa64","#fffa71","#720084","#6e0081","#ffb8fd","#6f007d","#780085","#720084","#790086","#400047","#18001f"],["#41004a","#6c0078","#6f0081","#e015f4","#fb87ff","#fdb8ff","#6c0078","#68007b","#e91ffb","#fb89ff","#ffb0fc","#fb82ff","#df1af7","#69007a","#6c0077","#ffb7fc","#fe82ff","#e019fb","#71007f","#6e007a","#3f004c"],["#68007b","#760085","#e81afc","#fc85ff","#ffb3fe","#fc84ff","#710080","#ea1eff","#ff77f9","#fb82ff","#ffb8fe","#fc80ff","#ff7cf9","#e51cfc","#720082","#fc80ff","#ffaff9","#fb82ff","#ea20ff","#740082","#71007d"],["#670078","#e014f5","#ff7dff","#ffaefa","#ff7af9","#e016f9","#6e0078","#e91ffc","#ff82ff","#ff7cf9","#ffb2f9","#ff77fc","#ff80fe","#dd12f6","#740086","#e81efc","#fb84ff","#ffb0f9","#ff7dfd","#e214f6","#6f0080"],["#720084","#fe7fff","#ffb3f8","#ff7cf9","#ea21fe","#73007f","#68007c","#760084","#ed23ff","#fb87ff","#ffadf4","#ff7cff","#eb20ff","#680078","#68007b","#730081","#e017f4","#ff78fb","#ffaff8","#ff77fc","#710082"],["#3d0044","#dc17f5","#ff78f9","#ea24ff","#6e0080","#670077","#400048","#6c007b","#730085","#fe7fff","#fb85ff","#fb86ff","#740082","#740081","#41004c","#68007a","#690078","#e921ff","#fb80ff","#e41afb","#3e0045"],["#18001f","#3c0047","#6f007d","#72007d","#6e007c","#46004d","#18001f","#3b0040","#750087","#730080","#730080","#740086","#3f004c","#37003e","#18001f","#40004d","#790086","#6e0080","#6e007b","#390040","#18001f"]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "croissant",
    name: "a croissant",
    grid: [
        "X.",
        "XX"
      ],
    color: [["#1d1006","#22130a","#291a0d","#49301c","#835b3a","#7e5634","#835b3b","","","","","","",""],["#2a1e10","#513720","#825a39","#845b3b","#815637","#d3a86c","#865d3c","","","","","","",""],["#432d19","#7e5336","#7f5635","#8b6242","#be8658","#ca9267","#2f2012","","","","","","",""],["#815938","#83593b","#432b14","#4e341f","#865a3c","#825739","#221506","","","","","","",""],["#8a6242","#7e5336","#f4d8a7","#f4d5a4","#cc9067","#7f5235","#312012","","","","","","",""],["#7e5636","#c18c5f","#c89167","#e9c58b","#c89167","#c68d63","#895f3f","","","","","","",""],["#180c03","#7e5634","#c58f66","#bd875c","#c99066","#7c5335","#885f3d","","","","","","",""],["#452b1a","#83583b","#805735","#885d3e","#875a3d","#c69066","#865f3f","#845a3b","#4b2f1e","#1c0e03","#221108","#201209","#4a321f","#7e5537"],["#825a38","#845d3c","#c2895c","#cb9165","#c69266","#c1895f","#8a5f3e","#815539","#825939","#8a5f42","#875e3e","#896241","#845e3c","#875e3d"],["#895f42","#c1895c","#f7d8a7","#f6d7a8","#e8c28d","#cb9263","#c68c60","#855c3a","#dcb375","#835a3c","#dfbb80","#dfb476","#8b6240","#472f1c"],["#845c3b","#c38c60","#debb84","#e7c28a","#dfb980","#c18b5f","#bd8559","#4b3620","#d5aa6c","#452917","#e6c08a","#c59063","#8a5f42","#4b3420"],["#835739","#c59066","#bc865b","#e4c288","#c48e62","#c08759","#7e5135","#513621","#c99166","#896041","#c2895b","#8a603f","#8a6242","#452d1d"],["#896241","#875e3f","#bc8759","#c28d62","#c98f67","#825a3b","#805538","#896240","#825838","#855b3d","#8b5d41","#7d5335","#452c17","#160b03"],["#231709","#7d5436","#8a5f3f","#845a3c","#88623f","#1e1407","#190e03","#7f5336","#885f3f","#825739","#442f1b","#2a1c0e","#1e1006","#1e1006"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "food"
      ],
  },
  {
    id: "florgnorfepus_egg",
    name: "a florgnorfepus egg. it's warm.",
    grid: [
        "X"
      ],
    color: [["#5b2a63","#5b2a63","#5b2a63","#5b2a63","#5b2a63","#5b2a63","#5b2a63"],["#5b2a63","#5b2a63","#5fd39e","#25b677","#5fd39e","#5b2a63","#5b2a63"],["#5b2a63","#5fd39e","#ffe95a","#25b677","#ffe95a","#25b677","#5b2a63"],["#c8f7da","#12382c","#25b677","#c8f7da","#12382c","#25b677","#12382c"],["#ffffff","#c8f7da","#c8f7da","#c8f7da","#c8f7da","#c8f7da","#7fd9aa"],["#5b2a63","#c8f7da","#4fae80","#c8f7da","#c8f7da","#7fd9aa","#5b2a63"],["#5b2a63","#5b2a63","#7fd9aa","#3f9f75","#3f9f75","#5b2a63","#5b2a63"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
    nextShapeProbs: [
        0.2,
        0.1
      ],
    nextShapes: [
        "florgenorflepus",
        "blibbets"
      ],
    tags: [
        "squelchy"
      ],
  },
  {
    id: "snorfwiggle",
    name: "a snorfwiggle with a head cold",
    grid: [
        "X",
        "X"
      ],
    color: [["#3a2150","#3a2150","#f2c4d6","#3a2150","#f2c4d6","#3a2150","#3a2150"],["#3a2150","#3a2150","#6e1f45","#6e1f45","#6e1f45","#3a2150","#3a2150"],["#3a2150","#6e1f45","#ffffff","#f7a8bc","#f7a8bc","#6e1f45","#3a2150"],["#3a2150","#6e1f45","#1a0a14","#f7a8bc","#1a0a14","#6e1f45","#3a2150"],["#3a2150","#6e1f45","#8fd8ff","#f7a8bc","#d9718f","#6e1f45","#3a2150"],["#3a2150","#6e1f45","#f7a8bc","#d9718f","#f7a8bc","#6e1f45","#3a2150"],["#6e1f45","#f7a8bc","#f7a8bc","#d9718f","#f7a8bc","#f7a8bc","#6e1f45"],["#6e1f45","#f7a8bc","#d9718f","#ff5d70","#ff5d70","#d9718f","#6e1f45"],["#6e1f45","#d9718f","#ff5d70","#ff5d70","#ff5d70","#c92f48","#6e1f45"],["#6e1f45","#ff5d70","#ffffff","#ff5d70","#ff5d70","#c92f48","#6e1f45"],["#6e1f45","#ff5d70","#ff5d70","#ff5d70","#ff5d70","#c92f48","#6e1f45"],["#6e1f45","#ff5d70","#3a0d1f","#ff5d70","#3a0d1f","#c92f48","#6e1f45"],["#2a173d","#6e1f45","#6e1f45","#6e1f45","#eaff9a","#6e1f45","#3a2150"],["#2a173d","#2a173d","#2a173d","#2a173d","#b9e34c","#7aa81f","#2a173d"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
    nextShapeProbs: [
        0.12,
        0.1,
        0.08
      ],
    nextShapes: [
        "blibbets",
        "plorbs",
        "florgenorflepus"
      ],
    tags: [
        "squelchy"
      ],
  },
  {
    id: "plorbs",
    name: "two moist plorbs in love",
    grid: [
        "X.",
        ".X"
      ],
    color: [["#cc90aa","#e09ebb","#e09ebb","#e09ebb","#e06b9b","#e06b9b","#cc628d","","","","","","",""],["#e09ebb","#ffffff","#ffb4d4","#ff7ab0","#ff7ab0","#ff7ab0","#e06b9b","","","","","","",""],["#e09ebb","#ffffff","#ffffff","#ff7ab0","#ffffff","#ffffff","#e06b9b","","","","","","",""],["#e09ebb","#ffffff","#4a1050","#ff7ab0","#ffffff","#4a1050","#bb4378","","","","","","",""],["#e06b9b","#ff5a8a","#ff7ab0","#ff7ab0","#ff7ab0","#ff5a8a","#bb4378","","","","","","",""],["#e06b9b","#ff7ab0","#4a1050","#ff7ab0","#4a1050","#d44c88","#ff2a5a","","","","","","",""],["#cc628d","#e06b9b","#e06b9b","#410e46","#bb4378","#ff2a5a","#ff2a5a","","","","","","",""],["","","","","","","","#ff2a5a","#ff2a5a","#b399e0","#b399e0","#8d63d3","#8d63d3","#805ac0"],["","","","","","","","#ff2a5a","#ffffff","#cbaeff","#a070f0","#a070f0","#a070f0","#8d63d3"],["","","","","","","","#b399e0","#4a1050","#ffffff","#a070f0","#4a1050","#ffffff","#8d63d3"],["","","","","","","","#b399e0","#ffffff","#ffffff","#a070f0","#ffffff","#ffffff","#663fac"],["","","","","","","","#8d63d3","#ff5a8a","#a070f0","#a070f0","#a070f0","#ff5a8a","#663fac"],["","","","","","","","#8d63d3","#a070f0","#4a1050","#a070f0","#4a1050","#7448c4","#663fac"],["","","","","","","","#805ac0","#8d63d3","#8d63d3","#410e46","#663fac","#663fac","#5d3a9d"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
    nextShapeProbs: [
        0.15,
        0.15
      ],
    nextShapes: [
        "florgnorfepus_egg",
        "blibbets"
      ],
    tags: [
        "squelchy"
      ],
  },
  {
    id: "grumblesac",
    name: "an exposed grumblesac",
    grid: [
        "XX",
        "X."
      ],
    color: [["#95576d","#bb6d89","#c79cac","#bb6d89","#bb6d89","#bb6d89","#bb6d89","#bb6d89","#bb6d89","#bb6d89","#bb6d89","#c79cac","#bb6d89","#95576d"],["#bb6d89","#ffc8dc","#c8507a","#c8507a","#f08cb0","#f08cb0","#f08cb0","#a02850","#f08cb0","#f08cb0","#c8507a","#c8507a","#f08cb0","#bb6d89"],["#bb6d89","#f08cb0","#fff0f4","#c8507a","#c8507a","#f08cb0","#a02850","#f08cb0","#f08cb0","#c8507a","#c8507a","#fff0f4","#f08cb0","#bb6d89"],["#bb6d89","#f08cb0","#fff0f4","#4a1430","#fff0f4","#f08cb0","#f08cb0","#a02850","#f08cb0","#fff0f4","#4a1430","#fff0f4","#f08cb0","#bb6d89"],["#bb6d89","#f08cb0","#fff0f4","#fff0f4","#fff0f4","#f08cb0","#a02850","#a02850","#f08cb0","#fff0f4","#fff0f4","#fff0f4","#f08cb0","#bb6d89"],["#bb6d89","#f08cb0","#f08cb0","#f08cb0","#f08cb0","#a02850","#f08cb0","#f08cb0","#f08cb0","#a02850","#f08cb0","#f08cb0","#f08cb0","#bb6d89"],["#bb6d89","#f08cb0","#8a1c40","#8a1c40","#8a1c40","#8a1c40","#7b1939","#6c1632","#6c1632","#6c1632","#bb6d89","#bb6d89","#7d1f3e","#95576d"],["#bb6d89","#8a1c40","#f08cb0","#f08cb0","#a02850","#f08cb0","#bb6d89","","","","","","",""],["#bb6d89","#f08cb0","#f08cb0","#ffc8dc","#a02850","#f08cb0","#bb6d89","","","","","","",""],["#bb6d89","#a02850","#f08cb0","#f08cb0","#f08cb0","#a02850","#bb6d89","","","","","","",""],["#bb6d89","#a02850","#a02850","#f08cb0","#f08cb0","#ffc8dc","#bb6d89","","","","","","",""],["#bb6d89","#f08cb0","#a02850","#f08cb0","#f08cb0","#f08cb0","#bb6d89","","","","","","",""],["#bb6d89","#c8507a","#f08cb0","#a02850","#a02850","#f08cb0","#bb6d89","","","","","","",""],["#95576d","#bb6d89","#bb6d89","#bb6d89","#9c3e5f","#bb6d89","#95576d","","","","","","",""]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
    nextShapeProbs: [
        0.15,
        0.1
      ],
    nextShapes: [
        "schlopwort",
        "snorfwiggle"
      ],
    tags: [
        "squelchy"
      ],
  },
  {
    id: "schlopwort",
    name: "a schlopwort, fresh from the drain",
    grid: [
        "XX.",
        ".XX"
      ],
    color: [["#7c7728","#bbb564","#9c9632","#9c9632","#9c9632","#9c9632","#9c9632","#9c9632","#9c9632","#9c9632","#9c9632","#95904f","","","","","",""],["#9c9632","#ffffff","#ffffff","#c8c040","#c8c040","#c8c040","#ffffff","#ffffff","#c8c040","#c8c040","#c8c040","#9c9632","","","","","",""],["#9c9632","#ffffff","#2a2a10","#c8c040","#c8c040","#c8c040","#ffffff","#2a2a10","#c8c040","#c8c040","#f0e880","#9c9632","","","","","",""],["#9c9632","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#9c9632","","","","","",""],["#9c9632","#9a9428","#5a3a20","#5a3a20","#5a3a20","#5a3a20","#9a9428","#c8c040","#c8c040","#c8c040","#7a7a20","#9c9632","","","","","",""],["#7c7728","#9c9632","#9c9632","#9c9632","#9c9632","#9c9632","#b2ab39","#c8c040","#7a7a20","#c8c040","#c8c040","#9c9632","","","","","",""],["","","","","","","#9c9632","#c8c040","#c8c040","#f0e880","#c8c040","#b2ab39","#5f5f19","#9c9632","#9c9632","#9c9632","#9c9632","#7c7728"],["","","","","","","#9c9632","#7a7a20","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#7a7a20","#f0e880","#9c9632"],["","","","","","","#9c9632","#c8c040","#c8c040","#7a7a20","#c8c040","#c8c040","#f0e880","#c8c040","#c8c040","#c8c040","#c8c040","#9c9632"],["","","","","","","#9c9632","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#7a7a20","#c8c040","#c8c040","#9c9632"],["","","","","","","#bbb564","#c8c040","#c8c040","#c8c040","#7a7a20","#c8c040","#c8c040","#c8c040","#c8c040","#c8c040","#9a9428","#9c9632"],["","","","","","","#5f5c19","#78731f","#9c9632","#78731f","#78731f","#9c9632","#78731f","#78731f","#78731f","#9c9632","#78731f","#5f5c19"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
    nextShapeProbs: [
        0.15,
        0.15
      ],
    nextShapes: [
        "grumblesac",
        "squonch"
      ],
    tags: [
        "squelchy"
      ],
  },
  {
    id: "squonch",
    name: "a mildly alarmed squonch",
    grid: [
        ".X.",
        "XXX",
        ".X."
      ],
    color: [["","","","","","","#ad5c90","#ca6ca8","#ca6ca8","#ca6ca8","#ca6ca8","#ad5c90","","","","","",""],["","","","","","","#ca6ca8","#f080c8","#f080c8","#f080c8","#f080c8","#ca6ca8","","","","","",""],["","","","","","","#ab79cd","#cc90f4","#f4a6d8","#cc90f4","#cc90f4","#ab79cd","","","","","",""],["","","","","","","#ab79cd","#3a1060","#3a1060","#3a1060","#3a1060","#310d51","","","","","",""],["","","","","","","#310d51","#cc90f4","#cc90f4","#cc90f4","#a050e0","#310d51","","","","","",""],["","","","","","","#ab79cd","#cc90f4","#cc90f4","#a050e0","#a050e0","#8643bc","","","","","",""],["#ad5c90","#ca6ca8","#ab79cd","#ab79cd","#ab79cd","#ab79cd","#cc90f4","#ffffff","#ffffff","#ffffff","#ffffff","#a050e0","#8643bc","#8643bc","#5e2894","#5e2894","#ca6ca8","#ad5c90"],["#ca6ca8","#f080c8","#cc90f4","#cc90f4","#cc90f4","#cc90f4","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#a050e0","#7030b0","#7030b0","#7030b0","#f080c8","#ca6ca8"],["#ca6ca8","#f080c8","#f4a6d8","#cc90f4","#cc90f4","#cc90f4","#ffffff","#ffffff","#2a0840","#bfe8ff","#ffffff","#ffffff","#7030b0","#7030b0","#7030b0","#f4a6d8","#f080c8","#ca6ca8"],["#ca6ca8","#f080c8","#cc90f4","#f4a6d8","#cc90f4","#a050e0","#ffffff","#ffffff","#2a0840","#2a0840","#ffffff","#ffffff","#7030b0","#7030b0","#f4a6d8","#7030b0","#f080c8","#ca6ca8"],["#ca6ca8","#f080c8","#cc90f4","#cc90f4","#a050e0","#a050e0","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#7030b0","#7030b0","#7030b0","#7030b0","#f080c8","#ca6ca8"],["#ad5c90","#ca6ca8","#ab79cd","#8643bc","#8643bc","#8643bc","#a050e0","#ffffff","#ffffff","#ffffff","#ffffff","#7030b0","#5e2894","#5e2894","#5e2894","#5e2894","#ca6ca8","#ad5c90"],["","","","","","","#8643bc","#a050e0","#7030b0","#7030b0","#7030b0","#5e2894","","","","","",""],["","","","","","","#8643bc","#7030b0","#3a1060","#3a1060","#7030b0","#5e2894","","","","","",""],["","","","","","","#5e2894","#3a1060","#e04080","#e04080","#3a1060","#5e2894","","","","","",""],["","","","","","","#5e2894","#7030b0","#3a1060","#3a1060","#7030b0","#5e2894","","","","","",""],["","","","","","","#ca6ca8","#f080c8","#f080c8","#f080c8","#f080c8","#ca6ca8","","","","","",""],["","","","","","","#ad5c90","#ca6ca8","#ca6ca8","#ca6ca8","#ca6ca8","#ad5c90","","","","","",""]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 0.7,
    nextShapeProbs: [
        0.2,
        0.06
      ],
    nextShapes: [
        "plorbs",
        "mumblethorpe"
      ],
    tags: [
        "squelchy"
      ],
  },
  {
    id: "blibbets",
    name: "a litter of newborn blibbets",
    grid: [
        "XX.",
        "XXX"
      ],
    color: [["#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","","","","","",""],["#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#7a2050","#7a2050","#7a2050","#7a2050","#cbbb3c","#cbbb3c","","","","","",""],["#cbbb3c","#cbbb3c","#7a2050","#7a2050","#7a2050","#7a2050","#ffffff","#ff9ec4","#ff9ec4","#ff9ec4","#7a2050","#cbbb3c","","","","","",""],["#cbbb3c","#7a2050","#ffffff","#c8a0ff","#9a70e0","#7a2050","#ff9ec4","#1a0a14","#ff9ec4","#1a0a14","#7a2050","#cbbb3c","","","","","",""],["#cbbb3c","#7a2050","#1a0a14","#c8a0ff","#1a0a14","#7a2050","#ff9ec4","#ff9ec4","#ff9ec4","#e070a0","#7a2050","#cbbb3c","","","","","",""],["#cbbb3c","#cbbb3c","#7a2050","#7a2050","#7a2050","#cbbb3c","#7a2050","#7a2050","#7a2050","#7a2050","#cbbb3c","#cbbb3c","","","","","",""],["#cbbb3c","#7a2050","#7a2050","#7a2050","#7a2050","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#cbbb3c","#7a2050","#7a2050","#7a2050","#7a2050","#cbbb3c"],["#7a2050","#ffffff","#ff9ec4","#ff9ec4","#ff9ec4","#7a2050","#cbbb3c","#7a2050","#7a2050","#7a2050","#7a2050","#cbbb3c","#7a2050","#ffffff","#c8a0ff","#c8a0ff","#c8a0ff","#7a2050"],["#7a2050","#ff9ec4","#1a0a14","#ff9ec4","#1a0a14","#7a2050","#7a2050","#ffffff","#ffbf94","#ffbf94","#ffbf94","#7a2050","#7a2050","#c8a0ff","#1a0a14","#c8a0ff","#1a0a14","#7a2050"],["#7a2050","#ff9ec4","#ff9ec4","#ff9ec4","#e070a0","#7a2050","#7a2050","#ffbf94","#ffffff","#1a0a14","#ffbf94","#7a2050","#7a2050","#c8a0ff","#c8a0ff","#c8a0ff","#9a70e0","#7a2050"],["#f0e57a","#7a2050","#7a2050","#7a2050","#7a2050","#cbbb3c","#7a2050","#ffbf94","#ffbf94","#ffbf94","#e8906a","#7a2050","#cbbb3c","#7a2050","#7a2050","#7a2050","#7a2050","#cbbb3c"],["#9a8a1e","#9a8a1e","#9a8a1e","#9a8a1e","#9a8a1e","#9a8a1e","#9a8a1e","#7a2050","#7a2050","#7a2050","#7a2050","#9a8a1e","#9a8a1e","#9a8a1e","#9a8a1e","#9a8a1e","#9a8a1e","#9a8a1e"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 0.7,
    nextShapeProbs: [
        0.15,
        0.1,
        0.05
      ],
    nextShapes: [
        "florgnorfepus_egg",
        "plorbs",
        "mumblethorpe"
      ],
    tags: [
        "squelchy"
      ],
  },
  {
    id: "mumblethorpe",
    name: "the great gurgling mumblethorpe",
    grid: [
        ".XX.",
        "XXXX",
        "X..X"
      ],
    color: [["","","","","","","#b87299","#d685b2","#742759","#742759","#742759","#742759","#742759","#742759","#742759","#742759","#d685b2","#b87299","","","","","",""],["","","","","","","#d685b2","#b84890","#ff9ed4","#ff9ed4","#ffe040","#ffe040","#ffe040","#ffe040","#ff9ed4","#ff9ed4","#ff9ed4","#d685b2","","","","","",""],["","","","","","","#d685b2","#ff9ed4","#ff9ed4","#ffe040","#ffffff","#ffe040","#ffe040","#ffe040","#ffe040","#ff9ed4","#ff9ed4","#d685b2","","","","","",""],["","","","","","","#bc5e94","#e070b0","#e070b0","#ffe040","#ffe040","#2a0a20","#2a0a20","#ffe040","#ffe040","#e070b0","#b84890","#bc5e94","","","","","",""],["","","","","","","#bc5e94","#e070b0","#e070b0","#ffe040","#ffe040","#2a0a20","#2a0a20","#ffe040","#ffe040","#e070b0","#e070b0","#bc5e94","","","","","",""],["","","","","","","#bc5e94","#e070b0","#e070b0","#e070b0","#e0a820","#ffe040","#ffe040","#e0a820","#e070b0","#e070b0","#e070b0","#bc5e94","","","","","",""],["#a1517f","#9b3c79","#9b3c79","#9b3c79","#9b3c79","#9b3c79","#b84890","#b84890","#b84890","#b84890","#b84890","#b84890","#b84890","#b84890","#b84890","#b84890","#b84890","#b84890","#9b3c79","#9b3c79","#9b3c79","#9b3c79","#9b3c79","#a1517f"],["#bc5e94","#e070b0","#ffffff","#ffffff","#6a1438","#ffffff","#ffffff","#6a1438","#ffffff","#ffffff","#6a1438","#ffffff","#ffffff","#6a1438","#ffffff","#ffffff","#6a1438","#ffffff","#ffffff","#6a1438","#ffffff","#ffffff","#e070b0","#bc5e94"],["#bc5e94","#e070b0","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#e070b0","#bc5e94"],["#bc5e94","#e070b0","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#6a1438","#e070b0","#bc5e94"],["#bc5e94","#e070b0","#6a1438","#ffffff","#a02858","#a02858","#a02858","#ffffff","#a02858","#a02858","#a02858","#ffffff","#a02858","#a02858","#a02858","#ffffff","#a02858","#a02858","#a02858","#ffffff","#a02858","#6a1438","#e070b0","#bc5e94"],["#bc5e94","#b84890","#b84890","#b84890","#b84890","#b84890","#9b3c79","#9b3c79","#9b3c79","#9b3c79","#9b3c79","#9b3c79","#a8cad6","#9b3c79","#9b3c79","#9b3c79","#9b3c79","#9b3c79","#b84890","#b84890","#b84890","#b84890","#b84890","#bc5e94"],["#9b3c79","#e070b0","#e070b0","#e070b0","#e070b0","#9b3c79","","","","","","","","","","","","","#9b3c79","#e070b0","#e070b0","#e070b0","#e070b0","#9b3c79"],["#9b3c79","#b84890","#e070b0","#e070b0","#e070b0","#9b3c79","","","","","","","","","","","","","#9b3c79","#b84890","#e070b0","#e070b0","#e070b0","#9b3c79"],["#9b3c79","#e070b0","#e070b0","#e070b0","#e070b0","#9b3c79","","","","","","","","","","","","","#9b3c79","#e070b0","#e070b0","#e070b0","#b84890","#9b3c79"],["#9b3c79","#e070b0","#e070b0","#e070b0","#b84890","#9b3c79","","","","","","","","","","","","","#9b3c79","#e070b0","#e070b0","#e070b0","#e070b0","#9b3c79"],["#9b3c79","#e070b0","#e070b0","#e070b0","#e070b0","#9b3c79","","","","","","","","","","","","","#9b3c79","#e070b0","#e070b0","#e070b0","#e070b0","#9b3c79"],["#b8ad90","#bc5e94","#d6caa8","#bc5e94","#d6caa8","#843468","","","","","","","","","","","","","#843468","#d6caa8","#bc5e94","#d6caa8","#bc5e94","#b8ad90"]],
    difficulty: 4,
    rotation: {
        "mode": "any"
      },
    frequency: 0.4,
    nextShapeProbs: [
        0.15,
        0.1,
        0.1
      ],
    nextShapes: [
        "blibbets",
        "florgnorfepus_egg",
        "grumblesac"
      ],
    tags: [
        "squelchy"
      ],
  },
  {
    id: "happy_pills",
    name: "happy pills",
    grid: [
        "XX"
      ],
    color: [["#9e8224","#c7a42d","#c7a42d","#c7a42d","#c7a42d","#c7a42d","#c7a42d","#c76c96","#c76c96","#c76c96","#c76c96","#c76c96","#c76c96","#9e5677"],["#c7a42d","#ffffff","#ffffff","#ffffff","#ffd23a","#ffd23a","#ffd23a","#ff8ac0","#ff8ac0","#ffffff","#ffffff","#ffffff","#ff8ac0","#c76c96"],["#c7a42d","#ffd23a","#ffd23a","#ffd23a","#3a1a28","#ffd23a","#ffd23a","#ff8ac0","#ff8ac0","#3a1a28","#ff8ac0","#ff8ac0","#ff8ac0","#c76c96"],["#c7a42d","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ffd23a","#ff8ac0","#ff8ac0","#ff8ac0","#ff8ac0","#ff8ac0","#ff8ac0","#c76c96"],["#c7a42d","#ffd23a","#ffd23a","#7a2a40","#ffd23a","#ffd23a","#ffd23a","#ff8ac0","#ff8ac0","#7a2a40","#ff8ac0","#ff8ac0","#ff8ac0","#c76c96"],["#c7a42d","#ffd23a","#ffd23a","#ffd23a","#7a2a40","#7a2a40","#7a2a40","#7a2a40","#7a2a40","#ff8ac0","#ff8ac0","#ff8ac0","#ff8ac0","#c76c96"],["#8b6814","#af8319","#af8319","#af8319","#af8319","#af8319","#af8319","#af4677","#af4677","#af4677","#af4677","#af4677","#af4677","#8b385e"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
    nextShapeProbs: [
        0.3
      ],
    nextShapes: [
        "happy_pills"
      ],
    tags: [
        "medicine"
      ],
  },
  {
    id: "tooth",
    name: "a tooth. not yours.",
    grid: [
        "X"
      ],
    color: [["#6e1426","#ffffff","#f6f0dc","#6e1426","#f6f0dc","#d6c99f","#6e1426"],["#ffffff","#f6f0dc","#f6f0dc","#f6f0dc","#f6f0dc","#f6f0dc","#a89870"],["#f6f0dc","#f6f0dc","#f6f0dc","#f6f0dc","#f6f0dc","#d6c99f","#a89870"],["#6e1426","#f6f0dc","#f6f0dc","#f6f0dc","#d6c99f","#d6c99f","#6e1426"],["#6e1426","#f6f0dc","#f6f0dc","#6e1426","#f6f0dc","#d6c99f","#6e1426"],["#6e1426","#f6f0dc","#d6c99f","#6e1426","#f6f0dc","#a89870","#6e1426"],["#6e1426","#d02040","#6e1426","#6e1426","#6e1426","#d02040","#6e1426"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "breath_mint",
    name: "a breath mint. it's for you.",
    grid: [
        "X"
      ],
    color: [["#1d3b3a","#1d3b3a","#8f9ba6","#8f9ba6","#8f9ba6","#1d3b3a","#1d3b3a"],["#1d3b3a","#8f9ba6","#ffffff","#ffffff","#e8283c","#8f9ba6","#1d3b3a"],["#8f9ba6","#e8283c","#e8283c","#ffffff","#ffffff","#e8283c","#8f9ba6"],["#8f9ba6","#e8283c","#ffffff","#e8283c","#e8283c","#ffffff","#8f9ba6"],["#8f9ba6","#ffffff","#e8283c","#e8283c","#ffffff","#dfe6ec","#8f9ba6"],["#1d3b3a","#8f9ba6","#dfe6ec","#e8283c","#e8283c","#8f9ba6","#1d3b3a"],["#1d3b3a","#1d3b3a","#8f9ba6","#8f9ba6","#8f9ba6","#1d3b3a","#1d3b3a"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
    tags: [
        "food"
      ],
  },
  {
    id: "support_brick",
    name: "an emotional support brick",
    grid: [
        "XX"
      ],
    color: [["#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014"],["#5a2014","#e27a5a","#c4553a","#c4553a","#c4553a","#c4553a","#2f6fd6","#2f6fd6","#2f6fd6","#2f6fd6","#2f6fd6","#2f6fd6","#2f6fd6","#5a2014"],["#5a2014","#c4553a","#2a1010","#c4553a","#2a1010","#c4553a","#2f6fd6","#2f6fd6","#ff5a8a","#2f6fd6","#ff5a8a","#2f6fd6","#2f6fd6","#5a2014"],["#5a2014","#2a1010","#c4553a","#c4553a","#c4553a","#2a1010","#2f6fd6","#ff5a8a","#ff5a8a","#ff5a8a","#ff5a8a","#ff5a8a","#2f6fd6","#5a2014"],["#5a2014","#c4553a","#2a1010","#2a1010","#2a1010","#c4553a","#2f6fd6","#2f6fd6","#ff5a8a","#ff5a8a","#ff5a8a","#2f6fd6","#2f6fd6","#5a2014"],["#5a2014","#a8432c","#a8432c","#8a3420","#a8432c","#a8432c","#2152a8","#2f6fd6","#2f6fd6","#ff5a8a","#2f6fd6","#2f6fd6","#2152a8","#5a2014"],["#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014","#5a2014"]],
    difficulty: 0,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "seen_things",
    name: "a rubber duck that has seen things",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee"],["#9fd6ee","#9fd6ee","#9fd6ee","#7a4a0c","#7a4a0c","#7a4a0c","#ffffff","#e05050","#ffffff","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee"],["#9fd6ee","#9fd6ee","#7a4a0c","#c27f10","#c27f10","#c27f10","#c27f10","#ffffff","#7a4a0c","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee"],["#9fd6ee","#9fd6ee","#7a4a0c","#ffffff","#1a1010","#ffffff","#ffffff","#f0ae1e","#7a4a0c","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee"],["#ff8a1f","#ff8a1f","#ff8a1f","#7a5aa0","#7a5aa0","#7a5aa0","#7a5aa0","#f0ae1e","#7a4a0c","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee"],["#d65a10","#d65a10","#d65a10","#ffd83a","#a07ac0","#a07ac0","#ffd83a","#f0ae1e","#7a4a0c","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee","#9fd6ee"],["#9fd6ee","#9fd6ee","#7a4a0c","#fff3a8","#ffd83a","#ffd83a","#ffd83a","#f0ae1e","#7a4a0c","#9fd6ee","#9fd6ee","#9fd6ee","#7a4a0c","#7a4a0c"],["#9fd6ee","#7a4a0c","#fff3a8","#ffd83a","#ffd83a","#ffd83a","#ffd83a","#ffd83a","#f0ae1e","#7a4a0c","#7a4a0c","#7a4a0c","#7a4a0c","#9fd6ee"],["#9fd6ee","#7a4a0c","#fff3a8","#ffd83a","#ffd83a","#ffd83a","#ffd83a","#ffd83a","#ffd83a","#fff3a8","#fff3a8","#fff3a8","#f0ae1e","#7a4a0c"],["#9fd6ee","#7a4a0c","#f0ae1e","#ffd83a","#ffd83a","#ffd83a","#ffd83a","#ffd83a","#ffd83a","#ffd83a","#ffd83a","#ffd83a","#f0ae1e","#7a4a0c"],["#9fd6ee","#9fd6ee","#7a4a0c","#f0ae1e","#f0ae1e","#f0ae1e","#f0ae1e","#f0ae1e","#f0ae1e","#f0ae1e","#f0ae1e","#f0ae1e","#7a4a0c","#9fd6ee"],["#e6f6ff","#3d8fd1","#e6f6ff","#e6f6ff","#e6f6ff","#3d8fd1","#e6f6ff","#e6f6ff","#3d8fd1","#e6f6ff","#e6f6ff","#e6f6ff","#3d8fd1","#e6f6ff"],["#3d8fd1","#3d8fd1","#3d8fd1","#2a6fae","#3d8fd1","#3d8fd1","#3d8fd1","#3d8fd1","#3d8fd1","#2a6fae","#3d8fd1","#3d8fd1","#3d8fd1","#3d8fd1"],["#2a6fae","#3d8fd1","#3d8fd1","#3d8fd1","#3d8fd1","#2a6fae","#3d8fd1","#3d8fd1","#3d8fd1","#3d8fd1","#3d8fd1","#2a6fae","#3d8fd1","#3d8fd1"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "haunted_toaster",
    name: "a haunted toaster. still makes great toast.",
    grid: [
        ".X",
        "XX"
      ],
    color: [["","","","","","","","#2a2350","#2a2350","#f4f6ff","#f4f6ff","#f4f6ff","#2a2350","#2a2350"],["","","","","","","","#2a2350","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#2a2350"],["","","","","","","","#2a2350","#f4f6ff","#1a1424","#f4f6ff","#1a1424","#f4f6ff","#2a2350"],["","","","","","","","#f4f6ff","#f4f6ff","#1a1424","#f4f6ff","#1a1424","#f4f6ff","#f4f6ff"],["","","","","","","","#2a2350","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#2a2350"],["","","","","","","","#2a2350","#c9cdee","#f4f6ff","#1a1424","#f4f6ff","#c9cdee","#2a2350"],["","","","","","","","#2a2350","#2a2350","#c9cdee","#f4f6ff","#f4f6ff","#2a2350","#2a2350"],["#2a2350","#2a2350","#a8642a","#a8642a","#a8642a","#a8642a","#2a2350","#2a2350","#2a2350","#c9cdee","#f4f6ff","#2a2350","#2a2350","#2a2350"],["#2a2350","#2a2350","#a8642a","#f0c070","#f0c070","#a8642a","#2a2350","#2a2350","#2a2350","#f4f6ff","#c9cdee","#2a2350","#2a2350","#2a2350"],["#2a2350","#2c3240","#a8642a","#f0c070","#f0c070","#a8642a","#2c3240","#2c3240","#2c3240","#f4f6ff","#c9cdee","#2c3240","#2c3240","#2a2350"],["#2c3240","#dfe5ee","#111318","#111318","#111318","#111318","#dfe5ee","#dfe5ee","#111318","#111318","#111318","#111318","#dfe5ee","#2c3240"],["#2c3240","#a8b2c2","#ffffff","#ffffff","#ffffff","#a8b2c2","#a8b2c2","#a8b2c2","#a8b2c2","#a8b2c2","#a8b2c2","#ff4d3d","#a8b2c2","#2c3240"],["#2c3240","#6d7788","#6d7788","#6d7788","#6d7788","#6d7788","#6d7788","#6d7788","#6d7788","#6d7788","#6d7788","#6d7788","#6d7788","#2c3240"],["#2a2350","#1a1424","#1a1424","#2a2350","#2a2350","#2a2350","#2a2350","#2a2350","#2a2350","#2a2350","#2a2350","#1a1424","#1a1424","#2a2350"]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0,
  },
  {
    id: "swiss_cheese",
    name: "a slice of swiss cheese. the holes are load-bearing.",
    grid: [
        "XXXX",
        "X.XX",
        "XXX."
      ],
    color: [["#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#a86c12","#a86c12","#a86c12","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14"],["#b97a14","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#d99a22","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#a86c12","#a86c12","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#f2bf2e","#b97a14"],["#b97a14","#fff2a0","#a86c12","#a86c12","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#a86c12","#d99a22","#d99a22","#a86c12","#ffd84a","#ffd84a","#ffd84a","#f2bf2e","#b97a14"],["#b97a14","#fff2a0","#d99a22","#d99a22","#ffd84a","#f2bf2e","#f2bf2e","#f2bf2e","#f2bf2e","#f2bf2e","#ffd84a","#ffd84a","#d99a22","#d99a22","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#f2bf2e","#b97a14"],["#b97a14","#fff2a0","#ffd84a","#ffd84a","#f2bf2e","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#f2bf2e","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#f2bf2e","#b97a14"],["#b97a14","#fff2a0","#ffd84a","#f2bf2e","#b97a14","","","","","","#b97a14","#fff2a0","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#f2bf2e","#b97a14"],["#b97a14","#fff2a0","#ffd84a","#f2bf2e","#b97a14","","","","","","#b97a14","#fff2a0","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#a86c12","#a86c12","#f2bf2e","#b97a14"],["#a86c12","#fff2a0","#ffd84a","#f2bf2e","#b97a14","","","","","","#b97a14","#a86c12","#a86c12","#ffd84a","#ffd84a","#ffd84a","#d99a22","#d99a22","#f2bf2e","#b97a14"],["#a86c12","#d99a22","#ffd84a","#f2bf2e","#b97a14","","","","","","#b97a14","#d99a22","#d99a22","#ffd84a","#ffd84a","#f2bf2e","#f2bf2e","#f2bf2e","#f2bf2e","#b97a14"],["#a86c12","#fff2a0","#ffd84a","#f2bf2e","#b97a14","","","","","","#b97a14","#fff2a0","#ffd84a","#ffd84a","#f2bf2e","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14"],["#b97a14","#fff2a0","#ffd84a","#ffd84a","#f2bf2e","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#fff2a0","#ffd84a","#ffd84a","#f2bf2e","#b97a14","","","","",""],["#b97a14","#fff2a0","#ffd84a","#ffd84a","#ffd84a","#fff2a0","#a86c12","#a86c12","#fff2a0","#fff2a0","#ffd84a","#ffd84a","#ffd84a","#f2bf2e","#b97a14","","","","",""],["#b97a14","#fff2a0","#ffd84a","#ffd84a","#ffd84a","#a86c12","#d99a22","#d99a22","#a86c12","#ffd84a","#ffd84a","#ffd84a","#a86c12","#a86c12","#b97a14","","","","",""],["#b97a14","#f2bf2e","#f2bf2e","#f2bf2e","#f2bf2e","#f2bf2e","#d99a22","#d99a22","#f2bf2e","#f2bf2e","#f2bf2e","#f2bf2e","#d99a22","#d99a22","#b97a14","","","","",""],["#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","#b97a14","","","","",""]],
    difficulty: 3,
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
    tags: [
        "food"
      ],
  },
  {
    id: "licked_sandwich",
    name: "a sandwich that someone has already licked",
    grid: [
        "XXX",
        "XXX"
      ],
    color: [["#2a3550","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#ffffff","#ffffff","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#2a3550"],["#8f4f1c","#c9772e","#c9772e","#c9772e","#c9772e","#9a5520","#bfe8ff","#bfe8ff","#ffffff","#bfe8ff","#bfe8ff","#9a5520","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#8f4f1c"],["#8f4f1c","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#bfe8ff","#f5e0b0","#f5e0b0","#8f4f1c"],["#8f4f1c","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#bfe8ff","#e0c48a","#e0c48a","#8f4f1c"],["#3a8a22","#9be35a","#5fc43a","#9be35a","#5fc43a","#5fc43a","#9be35a","#5fc43a","#5fc43a","#9be35a","#5fc43a","#5fc43a","#9be35a","#5fc43a","#bfe8ff","#9be35a","#5fc43a","#3a8a22"],["#3a8a22","#b52a26","#e8443a","#e8443a","#b52a26","#e8443a","#e8443a","#e8443a","#b52a26","#e8443a","#e8443a","#e8443a","#e8443a","#b52a26","#bfe8ff","#e8443a","#b52a26","#3a8a22"],["#ff9fb0","#ff9fb0","#ff9fb0","#ff9fb0","#e0708a","#ff9fb0","#ff9fb0","#ff9fb0","#ff9fb0","#ff9fb0","#e0708a","#ff9fb0","#ff9fb0","#ff9fb0","#bfe8ff","#ff9fb0","#ff9fb0","#ff9fb0"],["#ffd23f","#ffd23f","#e0a420","#ffd23f","#ffd23f","#ffd23f","#ffd23f","#e0a420","#ffd23f","#ffd23f","#ffd23f","#ffd23f","#e0a420","#ffd23f","#bfe8ff","#ffd23f","#ffd23f","#ffd23f"],["#8f4f1c","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#f5e0b0","#8f4f1c"],["#8f4f1c","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#e0c48a","#8f4f1c"],["#8f4f1c","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#c9772e","#8f4f1c"],["#2a3550","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#8f4f1c","#2a3550"]],
    difficulty: 2,
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
    tags: [
        "food"
      ],
  },
  {
    id: "tuesday",
    name: "the concept of tuesday",
    grid: [
        "XXX",
        ".X."
      ],
    color: [["#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a"],["#6b645a","#d8d0c2","#d8d0c2","#d8d0c2","#d8d0c2","#4e4943","#4e4943","#4e4943","#d8d0c2","#4e4943","#d8d0c2","#4e4943","#d8d0c2","#4e4943","#4e4943","#4e4943","#d8d0c2","#d8d0c2","#d8d0c2","#a0978a","#6b645a"],["#6b645a","#d8d0c2","#bdb4a4","#bdb4a4","#bdb4a4","#bdb4a4","#4e4943","#bdb4a4","#bdb4a4","#4e4943","#bdb4a4","#4e4943","#bdb4a4","#4e4943","#bdb4a4","#bdb4a4","#bdb4a4","#bdb4a4","#bdb4a4","#a0978a","#6b645a"],["#6b645a","#d8d0c2","#bdb4a4","#bdb4a4","#bdb4a4","#bdb4a4","#4e4943","#bdb4a4","#bdb4a4","#4e4943","#bdb4a4","#4e4943","#bdb4a4","#4e4943","#4e4943","#bdb4a4","#bdb4a4","#bdb4a4","#bdb4a4","#a0978a","#6b645a"],["#6b645a","#d8d0c2","#bdb4a4","#bdb4a4","#bdb4a4","#bdb4a4","#4e4943","#bdb4a4","#bdb4a4","#4e4943","#bdb4a4","#4e4943","#bdb4a4","#4e4943","#bdb4a4","#bdb4a4","#bdb4a4","#bdb4a4","#bdb4a4","#a0978a","#6b645a"],["#6b645a","#a0978a","#a0978a","#a0978a","#a0978a","#a0978a","#4e4943","#bdb4a4","#bdb4a4","#4e4943","#4e4943","#4e4943","#bdb4a4","#4e4943","#4e4943","#4e4943","#a0978a","#a0978a","#a0978a","#a0978a","#6b645a"],["#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#a0978a","#bdb4a4","#bdb4a4","#bdb4a4","#bdb4a4","#bdb4a4","#a0978a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a"],["","","","","","","","#6b645a","#d8d0c2","#bdb4a4","#bdb4a4","#bdb4a4","#a0978a","#6b645a","","","","","","",""],["","","","","","","","#6b645a","#d8d0c2","#a0978a","#bdb4a4","#a0978a","#a0978a","#6b645a","","","","","","",""],["","","","","","","","#6b645a","#d8d0c2","#3e3a35","#bdb4a4","#3e3a35","#a0978a","#6b645a","","","","","","",""],["","","","","","","","#6b645a","#d8d0c2","#bdb4a4","#bdb4a4","#bdb4a4","#a0978a","#6b645a","","","","","","",""],["","","","","","","","#6b645a","#d8d0c2","#3e3a35","#3e3a35","#3e3a35","#a0978a","#6b645a","","","","","","",""],["","","","","","","","#6b645a","#a0978a","#a0978a","#a0978a","#a0978a","#a0978a","#6b645a","","","","","","",""],["","","","","","","","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","#6b645a","","","","","","",""]],
    difficulty: 1,
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
  },
  {
    id: "pisa",
    name: "The Leaning Tower of Pisa",
    grid: [
        "...X.",
        "..XXX",
        "..XXX",
        "..XXX",
        ".XXX.",
        ".XXX.",
        ".XXX.",
        "XXX..",
        "XXX..",
        "XXX.."
      ],
    color: [["","","","","","","","","","","","","","","","#f3ead6","#fffbf2","#f3ead6","#fffbf2","#c8b994","","","","",""],["","","","","","","","","","","","","","","","#f3ead6","#544b3a","#f3ead6","#544b3a","#c8b994","","","","",""],["","","","","","","","","","","","","","","","#f3ead6","#d8a928","#f3ead6","#d8a928","#c8b994","","","","",""],["","","","","","","","","","","","","","","","#f3ead6","#544b3a","#f3ead6","#544b3a","#c8b994","","","","",""],["","","","","","","","","","","","","","","","#f3ead6","#f3ead6","#f3ead6","#f3ead6","#c8b994","","","","",""],["","","","","","","","","","","#f3ead6","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#f3ead6","#f3ead6","#e0d4b8","#e0d4b8","#c8b994"],["","","","","","","","","","","#e0d4b8","#e0d4b8","#6a604c","#f3ead6","#fffbf2","#f3ead6","#6a604c","#e0d4b8","#f3ead6","#e0d4b8","#40382b","#c8b994","#c8b994","#30291f","#a69673"],["","","","","","","","","","","#e0d4b8","#6a604c","#857a63","#857a63","#fffbf2","#857a63","#857a63","#6a604c","#f3ead6","#6a604c","#544b3a","#544b3a","#c8b994","#40382b","#a69673"],["","","","","","","","","","","#e0d4b8","#544b3a","#6a604c","#6a604c","#fffbf2","#6a604c","#6a604c","#544b3a","#f3ead6","#544b3a","#40382b","#40382b","#c8b994","#30291f","#a69673"],["","","","","","","","","","","#a69673","#40382b","#544b3a","#544b3a","#e0d4b8","#544b3a","#544b3a","#40382b","#c8b994","#40382b","#30291f","#30291f","#857657","#30291f","#857657"],["","","","","","","","","","","#f3ead6","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#f3ead6","#f3ead6","#e0d4b8","#e0d4b8","#c8b994"],["","","","","","","","","","","#e0d4b8","#e0d4b8","#6a604c","#f3ead6","#fffbf2","#f3ead6","#6a604c","#e0d4b8","#f3ead6","#e0d4b8","#40382b","#c8b994","#c8b994","#30291f","#a69673"],["","","","","","","","","","","#e0d4b8","#6a604c","#857a63","#857a63","#fffbf2","#857a63","#857a63","#6a604c","#f3ead6","#6a604c","#544b3a","#544b3a","#c8b994","#40382b","#a69673"],["","","","","","","","","","","#e0d4b8","#544b3a","#6a604c","#6a604c","#fffbf2","#6a604c","#6a604c","#544b3a","#f3ead6","#544b3a","#40382b","#40382b","#c8b994","#30291f","#a69673"],["","","","","","","","","","","#a69673","#40382b","#544b3a","#544b3a","#e0d4b8","#544b3a","#544b3a","#40382b","#c8b994","#40382b","#30291f","#30291f","#857657","#30291f","#857657"],["","","","","","","","","","","#f3ead6","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#f3ead6","#f3ead6","#e0d4b8","#e0d4b8","#c8b994"],["","","","","","","","","","","#e0d4b8","#e0d4b8","#6a604c","#f3ead6","#fffbf2","#f3ead6","#6a604c","#e0d4b8","#f3ead6","#e0d4b8","#40382b","#c8b994","#c8b994","#30291f","#a69673"],["","","","","","","","","","","#e0d4b8","#6a604c","#857a63","#857a63","#fffbf2","#857a63","#857a63","#6a604c","#f3ead6","#6a604c","#544b3a","#544b3a","#c8b994","#40382b","#a69673"],["","","","","","","","","","","#e0d4b8","#544b3a","#6a604c","#6a604c","#fffbf2","#6a604c","#6a604c","#544b3a","#f3ead6","#544b3a","#40382b","#40382b","#c8b994","#30291f","#a69673"],["","","","","","","","","","","#a69673","#40382b","#544b3a","#544b3a","#e0d4b8","#544b3a","#544b3a","#40382b","#c8b994","#40382b","#30291f","#30291f","#857657","#30291f","#857657"],["","","","","","#f3ead6","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#f3ead6","#f3ead6","#e0d4b8","#e0d4b8","#c8b994","","","","",""],["","","","","","#e0d4b8","#e0d4b8","#6a604c","#f3ead6","#fffbf2","#f3ead6","#6a604c","#e0d4b8","#f3ead6","#e0d4b8","#40382b","#c8b994","#c8b994","#30291f","#a69673","","","","",""],["","","","","","#e0d4b8","#6a604c","#857a63","#857a63","#fffbf2","#857a63","#857a63","#6a604c","#f3ead6","#6a604c","#544b3a","#544b3a","#c8b994","#40382b","#a69673","","","","",""],["","","","","","#e0d4b8","#544b3a","#6a604c","#6a604c","#fffbf2","#6a604c","#6a604c","#544b3a","#f3ead6","#544b3a","#40382b","#40382b","#c8b994","#30291f","#a69673","","","","",""],["","","","","","#a69673","#40382b","#544b3a","#544b3a","#e0d4b8","#544b3a","#544b3a","#40382b","#c8b994","#40382b","#30291f","#30291f","#857657","#30291f","#857657","","","","",""],["","","","","","#f3ead6","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#f3ead6","#f3ead6","#e0d4b8","#e0d4b8","#c8b994","","","","",""],["","","","","","#e0d4b8","#e0d4b8","#6a604c","#f3ead6","#fffbf2","#f3ead6","#6a604c","#e0d4b8","#f3ead6","#e0d4b8","#40382b","#c8b994","#c8b994","#30291f","#a69673","","","","",""],["","","","","","#e0d4b8","#6a604c","#857a63","#857a63","#fffbf2","#857a63","#857a63","#6a604c","#f3ead6","#6a604c","#544b3a","#544b3a","#c8b994","#40382b","#a69673","","","","",""],["","","","","","#e0d4b8","#544b3a","#6a604c","#6a604c","#fffbf2","#6a604c","#6a604c","#544b3a","#f3ead6","#544b3a","#40382b","#40382b","#c8b994","#30291f","#a69673","","","","",""],["","","","","","#a69673","#40382b","#544b3a","#544b3a","#e0d4b8","#544b3a","#544b3a","#40382b","#c8b994","#40382b","#30291f","#30291f","#857657","#30291f","#857657","","","","",""],["","","","","","#f3ead6","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#f3ead6","#f3ead6","#e0d4b8","#e0d4b8","#c8b994","","","","",""],["","","","","","#e0d4b8","#e0d4b8","#6a604c","#f3ead6","#fffbf2","#f3ead6","#6a604c","#e0d4b8","#f3ead6","#e0d4b8","#40382b","#c8b994","#c8b994","#30291f","#a69673","","","","",""],["","","","","","#e0d4b8","#6a604c","#857a63","#857a63","#fffbf2","#857a63","#857a63","#6a604c","#f3ead6","#6a604c","#544b3a","#544b3a","#c8b994","#40382b","#a69673","","","","",""],["","","","","","#e0d4b8","#544b3a","#6a604c","#6a604c","#fffbf2","#6a604c","#6a604c","#544b3a","#f3ead6","#544b3a","#40382b","#40382b","#c8b994","#30291f","#a69673","","","","",""],["","","","","","#a69673","#40382b","#544b3a","#544b3a","#e0d4b8","#544b3a","#544b3a","#40382b","#c8b994","#40382b","#30291f","#30291f","#857657","#30291f","#857657","","","","",""],["#f3ead6","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#f3ead6","#f3ead6","#e0d4b8","#e0d4b8","#c8b994","","","","","","","","","",""],["#e0d4b8","#e0d4b8","#6a604c","#f3ead6","#fffbf2","#f3ead6","#6a604c","#e0d4b8","#f3ead6","#e0d4b8","#40382b","#c8b994","#c8b994","#30291f","#a69673","","","","","","","","","",""],["#e0d4b8","#6a604c","#857a63","#857a63","#fffbf2","#857a63","#857a63","#6a604c","#f3ead6","#6a604c","#544b3a","#544b3a","#c8b994","#40382b","#a69673","","","","","","","","","",""],["#e0d4b8","#544b3a","#6a604c","#6a604c","#fffbf2","#6a604c","#6a604c","#544b3a","#f3ead6","#544b3a","#40382b","#40382b","#c8b994","#30291f","#a69673","","","","","","","","","",""],["#a69673","#40382b","#544b3a","#544b3a","#e0d4b8","#544b3a","#544b3a","#40382b","#c8b994","#40382b","#30291f","#30291f","#857657","#30291f","#857657","","","","","","","","","",""],["#f3ead6","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#f3ead6","#f3ead6","#e0d4b8","#e0d4b8","#c8b994","","","","","","","","","",""],["#e0d4b8","#e0d4b8","#6a604c","#f3ead6","#fffbf2","#f3ead6","#6a604c","#e0d4b8","#f3ead6","#e0d4b8","#40382b","#c8b994","#c8b994","#30291f","#a69673","","","","","","","","","",""],["#e0d4b8","#6a604c","#857a63","#857a63","#fffbf2","#857a63","#857a63","#6a604c","#f3ead6","#6a604c","#544b3a","#544b3a","#c8b994","#40382b","#a69673","","","","","","","","","",""],["#e0d4b8","#544b3a","#6a604c","#6a604c","#fffbf2","#6a604c","#6a604c","#544b3a","#f3ead6","#544b3a","#40382b","#40382b","#c8b994","#30291f","#a69673","","","","","","","","","",""],["#a69673","#40382b","#544b3a","#544b3a","#e0d4b8","#544b3a","#544b3a","#40382b","#c8b994","#40382b","#30291f","#30291f","#857657","#30291f","#857657","","","","","","","","","",""],["#f3ead6","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#fffbf2","#f3ead6","#f3ead6","#e0d4b8","#e0d4b8","#c8b994","","","","","","","","","",""],["#e0d4b8","#e0d4b8","#e0d4b8","#f3ead6","#fffbf2","#f3ead6","#f3ead6","#544b3a","#e0d4b8","#e0d4b8","#e0d4b8","#c8b994","#857657","#a69673","#a69673","","","","","","","","","",""],["#e0d4b8","#e0d4b8","#e0d4b8","#f3ead6","#fffbf2","#f3ead6","#544b3a","#544b3a","#544b3a","#e0d4b8","#e0d4b8","#c8b994","#857657","#a69673","#a69673","","","","","","","","","",""],["#e0d4b8","#e0d4b8","#e0d4b8","#f3ead6","#fffbf2","#f3ead6","#40382b","#40382b","#40382b","#e0d4b8","#e0d4b8","#c8b994","#857657","#a69673","#a69673","","","","","","","","","",""],["#6aa543","#4c8530","#6aa543","#4c8530","#6aa543","#4c8530","#6aa543","#4c8530","#6aa543","#4c8530","#6aa543","#4c8530","#6aa543","#4c8530","#6aa543","","","","","","","","","",""]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "landmark"
      ],
  },
  {
    id: "moai",
    name: "an Easter Island head",
    grid: [
        ".XXXX.",
        ".XXXX.",
        ".XXXX.",
        ".XXXX.",
        ".XXXX.",
        ".XXXX.",
        ".XXXX.",
        "XXXXXX"
      ],
    color: [["","","","","#b8ac93","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#b8ac93","#94887a","","","",""],["","","","","#94887a","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#7f8f55","#94887a","#6d6257","","","",""],["","","","","#94887a","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#94887a","#6d6257","","","",""],["","","","","#94887a","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#5e6c3c","#6d6257","","","",""],["","","","","#94887a","#94887a","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#94887a","#94887a","#6d6257","","","",""],["","","","","#94887a","#94887a","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#d9ceb5","#94887a","#6d6257","","","",""],["","","","","#94887a","#6d6257","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#6d6257","#4b423a","","","",""],["","","","","#b8ac93","#6d6257","#2a231e","#2a231e","#2a231e","#2a231e","#2a231e","#b8ac93","#b8ac93","#2a231e","#2a231e","#2a231e","#2a231e","#2a231e","#6d6257","#4b423a","","","",""],["","","","","#b8ac93","#6d6257","#2a231e","#2a231e","#2a231e","#2a231e","#4b423a","#b8ac93","#94887a","#4b423a","#2a231e","#2a231e","#2a231e","#2a231e","#6d6257","#4b423a","","","",""],["","","","","#b8ac93","#6d6257","#4b423a","#6d6257","#6d6257","#6d6257","#94887a","#b8ac93","#94887a","#6d6257","#6d6257","#6d6257","#6d6257","#4b423a","#6d6257","#4b423a","","","",""],["","","","","#b8ac93","#6d6257","#94887a","#94887a","#94887a","#94887a","#94887a","#b8ac93","#94887a","#6d6257","#94887a","#94887a","#94887a","#94887a","#6d6257","#4b423a","","","",""],["","","","","#b8ac93","#6d6257","#94887a","#94887a","#94887a","#94887a","#94887a","#b8ac93","#94887a","#6d6257","#94887a","#94887a","#94887a","#94887a","#6d6257","#4b423a","","","",""],["","","","","#b8ac93","#6d6257","#94887a","#94887a","#94887a","#94887a","#b8ac93","#b8ac93","#94887a","#94887a","#6d6257","#94887a","#94887a","#94887a","#6d6257","#4b423a","","","",""],["","","","","#b8ac93","#6d6257","#94887a","#94887a","#94887a","#94887a","#b8ac93","#b8ac93","#94887a","#94887a","#6d6257","#94887a","#94887a","#94887a","#6d6257","#4b423a","","","",""],["","","","","#b8ac93","#6d6257","#94887a","#94887a","#94887a","#b8ac93","#d9ceb5","#b8ac93","#94887a","#94887a","#94887a","#6d6257","#94887a","#94887a","#6d6257","#4b423a","","","",""],["","","","","#b8ac93","#6d6257","#94887a","#94887a","#94887a","#b8ac93","#d9ceb5","#b8ac93","#94887a","#94887a","#94887a","#6d6257","#94887a","#94887a","#6d6257","#4b423a","","","",""],["","","","","#b8ac93","#6d6257","#94887a","#94887a","#b8ac93","#b8ac93","#d9ceb5","#b8ac93","#94887a","#94887a","#94887a","#94887a","#6d6257","#94887a","#6d6257","#4b423a","","","",""],["","","","","#b8ac93","#6d6257","#94887a","#94887a","#6d6257","#2a231e","#b8ac93","#b8ac93","#94887a","#94887a","#2a231e","#6d6257","#6d6257","#94887a","#6d6257","#4b423a","","","",""],["","","","","#94887a","#6d6257","#94887a","#94887a","#94887a","#6d6257","#6d6257","#6d6257","#6d6257","#6d6257","#6d6257","#6d6257","#94887a","#94887a","#6d6257","#4b423a","","","",""],["","","","","#94887a","#94887a","#94887a","#94887a","#94887a","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#94887a","#94887a","#94887a","#6d6257","#4b423a","","","",""],["","","","","#94887a","#94887a","#94887a","#94887a","#6d6257","#4b423a","#4b423a","#4b423a","#4b423a","#4b423a","#4b423a","#6d6257","#94887a","#94887a","#6d6257","#4b423a","","","",""],["","","","","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#94887a","#94887a","#94887a","#94887a","#6d6257","#4b423a","","","",""],["","","","","#6d6257","#94887a","#94887a","#94887a","#94887a","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#b8ac93","#94887a","#94887a","#94887a","#4b423a","#4b423a","","","",""],["","","","","#4b423a","#6d6257","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#6d6257","#4b423a","#2a231e","","","",""],["","","","","#4b423a","#2a231e","#2a231e","#6d6257","#6d6257","#6d6257","#6d6257","#6d6257","#6d6257","#6d6257","#6d6257","#6d6257","#6d6257","#2a231e","#2a231e","#4b423a","","","",""],["","","","","#94887a","#b8ac93","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#6d6257","#4b423a","","","",""],["","","","","#94887a","#b8ac93","#6d6257","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#94887a","#6d6257","#6d6257","#4b423a","","","",""],["","","","","#7f8f55","#b8ac93","#94887a","#6d6257","#b8ac93","#6d6257","#b8ac93","#6d6257","#b8ac93","#6d6257","#b8ac93","#6d6257","#b8ac93","#94887a","#6d6257","#4b423a","","","",""],["#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#a7a398","#88847a","#88847a","#88847a","#88847a"],["#4e4c46","#88847a","#88847a","#88847a","#88847a","#88847a","#4e4c46","#88847a","#88847a","#88847a","#88847a","#88847a","#4e4c46","#88847a","#88847a","#88847a","#88847a","#88847a","#4e4c46","#6a675f","#6a675f","#6a675f","#6a675f","#6a675f"],["#88847a","#88847a","#88847a","#4e4c46","#88847a","#88847a","#88847a","#88847a","#88847a","#4e4c46","#88847a","#88847a","#88847a","#88847a","#88847a","#4e4c46","#88847a","#88847a","#6a675f","#6a675f","#6a675f","#4e4c46","#6a675f","#6a675f"],["#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d","#467e2d"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "landmark"
      ],
  },
  {
    id: "stonehenge",
    name: "Stonehenge",
    grid: [
        "...XXX...",
        "XXXX.XXXX",
        "X.XX.XX.X",
        "X.XX.XX.X",
        "X.XX.XX.X"
      ],
    color: [["","","","","","","","","","","","","#bebcab","#bebcab","#bebcab","#bebcab","#bebcab","#a3a191","#bebcab","#a3a191","#a3a191","#a3a191","#a3a191","#878576","","","","","","","","","","","",""],["","","","","","","","","","","","","#d9d7c6","#b9bd74","#a3a191","#a3a191","#d2c97e","#878576","#878576","#878576","#878576","#878576","#878576","#6a695c","","","","","","","","","","","",""],["","","","","","","","","","","","","#bebcab","#a3a191","#a3a191","#a3a191","#878576","#878576","#878576","#878576","#878576","#878576","#878576","#6a695c","","","","","","","","","","","",""],["","","","","","","","","","","","","#878576","#6a695c","#6a695c","#6a695c","#6a695c","#6a695c","#6a695c","#6a695c","#4e4d44","#6a695c","#4e4d44","#4e4d44","","","","","","","","","","","",""],["#d9d7c6","#bebcab","#bebcab","#a3a191","#a3a191","#bebcab","#a3a191","#a3a191","#bebcab","#a3a191","#878576","#6a695c","#bebcab","#bebcab","#a3a191","#878576","","","","","#d9d7c6","#a3a191","#bebcab","#878576","#bebcab","#bebcab","#bebcab","#bebcab","#bebcab","#a3a191","#bebcab","#a3a191","#a3a191","#a3a191","#a3a191","#6a695c"],["#bebcab","#a3a191","#a3a191","#a3a191","#d2c97e","#b9bd74","#a3a191","#878576","#878576","#878576","#878576","#4e4d44","#d9d7c6","#a3a191","#878576","#6a695c","","","","","#d9d7c6","#a3a191","#a3a191","#6a695c","#bebcab","#a3a191","#a3a191","#a3a191","#a3a191","#878576","#a3a191","#a3a191","#878576","#878576","#b9bd74","#4e4d44"],["#a3a191","#a3a191","#a3a191","#a3a191","#878576","#a3a191","#878576","#878576","#878576","#6a695c","#878576","#6a695c","#d9d7c6","#a3a191","#878576","#6a695c","","","","","#bebcab","#a3a191","#a3a191","#6a695c","#bebcab","#a3a191","#a3a191","#b9bd74","#a3a191","#878576","#878576","#878576","#878576","#6a695c","#6a695c","#4e4d44"],["#a3a191","#878576","#6a695c","#878576","#878576","#6a695c","#6a695c","#6a695c","#4e4d44","#4e4d44","#4e4d44","#4e4d44","#bebcab","#b9bd74","#878576","#6a695c","","","","","#bebcab","#6a695c","#878576","#4e4d44","#878576","#6a695c","#6a695c","#6a695c","#878576","#6a695c","#6a695c","#4e4d44","#6a695c","#6a695c","#6a695c","#4e4d44"],["#bebcab","#bebcab","#bebcab","#878576","","","","","#bebcab","#bebcab","#bebcab","#878576","#bebcab","#6a695c","#878576","#4e4d44","","","","","#bebcab","#a3a191","#d2c97e","#6a695c","#bebcab","#bebcab","#a3a191","#878576","","","","","#bebcab","#bebcab","#a3a191","#878576"],["#bebcab","#a3a191","#878576","#6a695c","","","","","#bebcab","#a3a191","#878576","#4e4d44","#bebcab","#a3a191","#6a695c","#6a695c","","","","","#bebcab","#6a695c","#878576","#6a695c","#bebcab","#a3a191","#878576","#6a695c","","","","","#d9d7c6","#d2c97e","#a3a191","#6a695c"],["#bebcab","#a3a191","#878576","#4e4d44","","","","","#bebcab","#a3a191","#a3a191","#6a695c","#bebcab","#a3a191","#6a695c","#4e4d44","","","","","#bebcab","#6a695c","#878576","#6a695c","#d9d7c6","#b9bd74","#878576","#6a695c","","","","","#bebcab","#a3a191","#878576","#4e4d44"],["#d9d7c6","#6a695c","#d2c97e","#6a695c","","","","","#bebcab","#a3a191","#6a695c","#6a695c","#bebcab","#878576","#a3a191","#6a695c","","","","","#bebcab","#6a695c","#878576","#4e4d44","#bebcab","#6a695c","#878576","#6a695c","","","","","#bebcab","#878576","#b9bd74","#4e4d44"],["#bebcab","#6a695c","#878576","#6a695c","","","","","#d9d7c6","#a3a191","#d2c97e","#6a695c","#bebcab","#a3a191","#878576","#6a695c","","","","","#bebcab","#878576","#878576","#4e4d44","#d9d7c6","#a3a191","#6a695c","#4e4d44","","","","","#d9d7c6","#a3a191","#6a695c","#6a695c"],["#bebcab","#a3a191","#6a695c","#4e4d44","","","","","#d9d7c6","#878576","#6a695c","#4e4d44","#d9d7c6","#a3a191","#b9bd74","#4e4d44","","","","","#bebcab","#a3a191","#878576","#4e4d44","#bebcab","#a3a191","#6a695c","#4e4d44","","","","","#bebcab","#a3a191","#6a695c","#6a695c"],["#bebcab","#a3a191","#6a695c","#6a695c","","","","","#d9d7c6","#6a695c","#a3a191","#4e4d44","#bebcab","#a3a191","#a3a191","#6a695c","","","","","#bebcab","#a3a191","#878576","#4e4d44","#bebcab","#a3a191","#878576","#4e4d44","","","","","#bebcab","#a3a191","#a3a191","#4e4d44"],["#bebcab","#878576","#878576","#6a695c","","","","","#bebcab","#d2c97e","#878576","#6a695c","#bebcab","#a3a191","#878576","#4e4d44","","","","","#bebcab","#a3a191","#d2c97e","#4e4d44","#bebcab","#d2c97e","#878576","#4e4d44","","","","","#bebcab","#a3a191","#878576","#6a695c"],["#bebcab","#d2c97e","#a3a191","#6a695c","","","","","#bebcab","#a3a191","#878576","#4e4d44","#d9d7c6","#a3a191","#878576","#6a695c","","","","","#bebcab","#a3a191","#878576","#4e4d44","#bebcab","#878576","#878576","#4e4d44","","","","","#bebcab","#a3a191","#878576","#6a695c"],["#bebcab","#878576","#878576","#4e4d44","","","","","#bebcab","#b9bd74","#878576","#6a695c","#bebcab","#a3a191","#878576","#6a695c","","","","","#bebcab","#878576","#878576","#4e4d44","#bebcab","#878576","#878576","#4e4d44","","","","","#bebcab","#b9bd74","#a3a191","#6a695c"],["#6aa848","#a3a191","#b9bd74","#6aa848","","","","","#bebcab","#6aa848","#878576","#4e4d44","#6aa848","#878576","#878576","#6aa848","","","","","#bebcab","#6aa848","#878576","#6a695c","#6aa848","#878576","#a3a191","#6aa848","","","","","#d9d7c6","#6aa848","#878576","#6a695c"],["#4f8a34","#4f8a34","#4f8a34","#6aa848","","","","","#4f8a34","#6aa848","#4f8a34","#3c6e28","#4f8a34","#4f8a34","#4f8a34","#6aa848","","","","","#4f8a34","#6aa848","#4f8a34","#3c6e28","#4f8a34","#4f8a34","#4f8a34","#6aa848","","","","","#4f8a34","#6aa848","#4f8a34","#3c6e28"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "landmark"
      ],
  },
  {
    id: "big_ben",
    name: "Big Ben",
    grid: [
        ".X.",
        ".X.",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX",
        "XXX"
      ],
    color: [["","","","","","#2f3744","#fff0a8","#f2c94c","#5d6b7e","#2f3744","","","","",""],["","","","","","#2f3744","#465264","#f2c94c","#465264","#2f3744","","","","",""],["","","","","","#465264","#f2c94c","#f2c94c","#f2c94c","#465264","","","","",""],["","","","","","#2f3744","#465264","#f2c94c","#465264","#2f3744","","","","",""],["","","","","","#2f3744","#465264","#f2c94c","#465264","#2f3744","","","","",""],["","","","","","#5d6b7e","#465264","#f2c94c","#465264","#2f3744","","","","",""],["","","","","","#2f3744","#465264","#f2c94c","#465264","#2f3744","","","","",""],["","","","","","#f2c94c","#465264","#f2c94c","#465264","#f2c94c","","","","",""],["","","","","","#2f3744","#465264","#f2c94c","#465264","#5d6b7e","","","","",""],["","","","","","#465264","#465264","#f2c94c","#465264","#2f3744","","","","",""],["#f2c94c","#2f3744","#465264","#465264","#465264","#465264","#465264","#f2c94c","#465264","#465264","#465264","#465264","#465264","#2f3744","#f2c94c"],["#fff0a8","#465264","#465264","#465264","#465264","#465264","#465264","#f2c94c","#465264","#465264","#465264","#465264","#465264","#2f3744","#c9952a"],["#f2c94c","#465264","#465264","#f2c94c","#465264","#465264","#465264","#f2c94c","#465264","#465264","#465264","#f2c94c","#465264","#2f3744","#c9952a"],["#f2c94c","#465264","#f2c94c","#fff0a8","#f2c94c","#465264","#465264","#f2c94c","#465264","#465264","#f2c94c","#fff0a8","#f2c94c","#2f3744","#c9952a"],["#fff0a8","#fff0a8","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#c9952a","#c9952a","#c9952a"],["#dfc283","#f4dea6","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#2c2218","#dfc283","#dfc283","#dfc283","#2c2218","#c6a566","#c6a566","#c6a566","#2c2218","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#2c2218","#2c2218","#2c2218","#dfc283","#2c2218","#2c2218","#2c2218","#c6a566","#2c2218","#2c2218","#2c2218","#a2824a","#735a32"],["#dfc283","#f4dea6","#2c2218","#2c2218","#2c2218","#dfc283","#2c2218","#c9952a","#2c2218","#c6a566","#2c2218","#2c2218","#2c2218","#a2824a","#735a32"],["#c6a566","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#a2824a","#735a32","#735a32","#4d3b20"],["#dfc283","#fff0a8","#fff0a8","#fff0a8","#fff0a8","#fff0a8","#fff0a8","#fff0a8","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#735a32"],["#dfc283","#f4dea6","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#c9952a","#f2c94c","#c9952a","#f2c94c","#c9952a","#f2c94c","#c9952a","#f2c94c","#c9952a","#f2c94c","#c9952a","#f2c94c","#c9952a","#735a32"],["#dfc283","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#8a5f14","#c9952a","#c9952a","#c9952a","#c9952a","#c9952a","#f2c94c","#735a32"],["#dfc283","#c9952a","#f2c94c","#f2c94c","#8a5f14","#8a5f14","#8a5f14","#f7f2e0","#8a5f14","#8a5f14","#8a5f14","#c9952a","#c9952a","#c9952a","#735a32"],["#dfc283","#f2c94c","#f2c94c","#8a5f14","#f7f2e0","#f7f2e0","#f7f2e0","#8a5f14","#f7f2e0","#f7f2e0","#f7f2e0","#8a5f14","#c9952a","#f2c94c","#735a32"],["#dfc283","#c9952a","#8a5f14","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#1d1a16","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#8a5f14","#c9952a","#735a32"],["#dfc283","#f2c94c","#8a5f14","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#1d1a16","#f7f2e0","#1d1a16","#f7f2e0","#f7f2e0","#8a5f14","#f2c94c","#735a32"],["#dfc283","#c9952a","#8a5f14","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#1d1a16","#1d1a16","#f7f2e0","#f7f2e0","#f7f2e0","#8a5f14","#c9952a","#735a32"],["#dfc283","#f2c94c","#f7f2e0","#8a5f14","#f7f2e0","#f7f2e0","#1d1a16","#1d1a16","#f7f2e0","#f7f2e0","#f7f2e0","#8a5f14","#f7f2e0","#f2c94c","#735a32"],["#dfc283","#c9952a","#8a5f14","#f7f2e0","#f7f2e0","#1d1a16","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#8a5f14","#c9952a","#735a32"],["#dfc283","#f2c94c","#8a5f14","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#8a5f14","#f2c94c","#735a32"],["#dfc283","#c9952a","#8a5f14","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#f7f2e0","#8a5f14","#c9952a","#735a32"],["#dfc283","#f2c94c","#c9952a","#8a5f14","#f7f2e0","#f7f2e0","#f7f2e0","#8a5f14","#f7f2e0","#f7f2e0","#f7f2e0","#8a5f14","#f2c94c","#f2c94c","#735a32"],["#dfc283","#c9952a","#c9952a","#c9952a","#8a5f14","#8a5f14","#8a5f14","#f7f2e0","#8a5f14","#8a5f14","#8a5f14","#f2c94c","#f2c94c","#c9952a","#735a32"],["#dfc283","#f2c94c","#c9952a","#c9952a","#c9952a","#c9952a","#c9952a","#8a5f14","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#735a32"],["#dfc283","#c9952a","#f2c94c","#c9952a","#f2c94c","#c9952a","#f2c94c","#c9952a","#f2c94c","#c9952a","#f2c94c","#c9952a","#f2c94c","#c9952a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#fff0a8","#fff0a8","#fff0a8","#fff0a8","#fff0a8","#fff0a8","#fff0a8","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#f2c94c","#735a32"],["#c6a566","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#a2824a","#735a32","#735a32","#4d3b20"],["#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#a2824a"],["#c6a566","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#a2824a","#735a32","#735a32","#4d3b20"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#735a32","#dfc283","#c6a566","#c6a566","#735a32","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#4d3b20","#dfc283","#c6a566","#c6a566","#4d3b20","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#4d3b20","#dfc283","#c6a566","#c6a566","#4d3b20","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#a2824a"],["#c6a566","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#a2824a","#735a32","#735a32","#4d3b20"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#735a32","#dfc283","#c6a566","#c6a566","#735a32","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#4d3b20","#dfc283","#c6a566","#c6a566","#4d3b20","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#4d3b20","#dfc283","#c6a566","#c6a566","#4d3b20","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#a2824a"],["#c6a566","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#a2824a","#735a32","#735a32","#4d3b20"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#735a32","#dfc283","#c6a566","#c6a566","#735a32","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#4d3b20","#dfc283","#c6a566","#c6a566","#4d3b20","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#4d3b20","#dfc283","#c6a566","#c6a566","#4d3b20","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#a2824a"],["#c6a566","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#a2824a","#735a32","#735a32","#4d3b20"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#735a32","#dfc283","#c6a566","#c6a566","#735a32","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#4d3b20","#dfc283","#c6a566","#c6a566","#4d3b20","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#4d3b20","#dfc283","#c6a566","#c6a566","#4d3b20","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#a2824a"],["#c6a566","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#a2824a","#735a32","#735a32","#4d3b20"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#735a32","#dfc283","#c6a566","#c6a566","#735a32","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#4d3b20","#dfc283","#c6a566","#c6a566","#4d3b20","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#4d3b20","#dfc283","#c6a566","#c6a566","#4d3b20","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#dfc283","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#a2824a"],["#c6a566","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#a2824a","#735a32","#735a32","#4d3b20"],["#dfc283","#f4dea6","#f4dea6","#f4dea6","#dfc283","#dfc283","#dfc283","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#735a32"],["#a2824a","#c6a566","#c6a566","#c6a566","#c6a566","#c6a566","#c6a566","#c6a566","#a2824a","#a2824a","#a2824a","#a2824a","#735a32","#735a32","#4d3b20"],["#735a32","#735a32","#735a32","#735a32","#735a32","#735a32","#735a32","#735a32","#735a32","#735a32","#735a32","#735a32","#4d3b20","#4d3b20","#4d3b20"]],
    difficulty: 5,
    rotation: {
        "mode": "any"
      },
    frequency: 1,
    tags: [
        "landmark"
      ],
  },
  {
    id: "infectious_sand",
    name: "infectious sand",
    grid: [
        "X"
      ],
    color: [["#5c3470","#5c3470","#5c3470","#5c3470","#5c3470","#8ee35c","#5c3470"],["#5c3470","#4fb83a","#5c3470","#5c3470","#5c3470","#5c3470","#5c3470"],["#5c3470","#5c3470","#5c3470","#e9e58e","#c9c35c","#5c3470","#5c3470"],["#5c3470","#5c3470","#e9e58e","#c9c35c","#7bd64a","#929c40","#5c3470"],["#5c3470","#e9e58e","#251a2e","#c9c35c","#251a2e","#929c40","#5c3470"],["#e9e58e","#c9c35c","#c9c35c","#3e2731","#c9c35c","#c9c35c","#929c40"],["#c9c35c","#7bd64a","#929c40","#c9c35c","#c9c35c","#929c40","#5f6f2c"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 1,
        "area": {
          "origin": [
            1,
            0
          ],
          "grid": [
            "|||"
          ]
        },
        "intro": "Makes its own column and the two next to it collapse, squashing out the air pockets. Try not to touch it.",
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "small_black_hole",
    name: "a small black hole",
    grid: [
        "X"
      ],
    color: [["#522ea0","#5e35b1","#5e35b1","#5e35b1","#5e35b1","#492997","#381f81"],["#492997","#45269a","#9a3ad0","#c8389a","#ff6a3d","#7a44d8","#3c2188"],["#3c2188","#9a3ad0","#ff9a3c","#ff9a3c","#ffe27a","#ff6a3d","#3c2188"],["#3c2188","#ff6a3d","#ffe27a","#2c0f55","#ffe27a","#ff6a3d","#3c2188"],["#3c2188","#ff6a3d","#ffe27a","#ff9a3c","#ff9a3c","#9a3ad0","#3c2188"],["#3c2188","#7a44d8","#ff6a3d","#c8389a","#9a3ad0","#45269a","#492997"],["#381f81","#492997","#5e35b1","#5e35b1","#5e35b1","#5e35b1","#522ea0"]],
    powerup: {
        "type": "destroyer",
        "tier": 2,
        "area": {
          "origin": [
            2,
            2
          ],
          "grid": [
            ".###.",
            "#####",
            "#####",
            "#####",
            ".###."
          ]
        },
        "intro": "Swallows every block in a small circle around where it lands. Mind the event horizon.",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "large_black_hole",
    name: "a large black hole",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#381f81","#3c2188","#492997","#492997","#492997","#492997","#492997","#492997","#3c2188","#3c2188","#3c2188","#492997","#5e35b1","#522ea0"],["#3c2188","#5a32b0","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#5a32b0","#45269a","#45269a","#45269a","#5a32b0","#5e35b1"],["#5e35b1","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#5a32b0","#45269a","#45269a","#45269a","#5e35b1"],["#5e35b1","#7a44d8","#7a44d8","#5a32b0","#5a32b0","#5a32b0","#c8389a","#ff6a3d","#7a44d8","#7a44d8","#5a32b0","#45269a","#45269a","#492997"],["#5e35b1","#7a44d8","#5a32b0","#45269a","#9a3ad0","#9a3ad0","#9a3ad0","#c8389a","#ff6a3d","#ff6a3d","#5a32b0","#45269a","#45269a","#492997"],["#5e35b1","#5a32b0","#45269a","#45269a","#9a3ad0","#ff9a3c","#2c0f55","#2c0f55","#ffe27a","#ff6a3d","#5a32b0","#45269a","#45269a","#492997"],["#5e35b1","#45269a","#45269a","#9a3ad0","#c8389a","#2c0f55","#2c0f55","#2c0f55","#2c0f55","#ff6a3d","#c8389a","#45269a","#45269a","#492997"],["#492997","#45269a","#45269a","#c8389a","#ff6a3d","#2c0f55","#2c0f55","#2c0f55","#2c0f55","#c8389a","#9a3ad0","#45269a","#45269a","#5e35b1"],["#492997","#45269a","#45269a","#5a32b0","#ff6a3d","#ffe27a","#2c0f55","#2c0f55","#ff9a3c","#9a3ad0","#45269a","#45269a","#5a32b0","#5e35b1"],["#492997","#45269a","#45269a","#5a32b0","#ff6a3d","#ff6a3d","#c8389a","#9a3ad0","#9a3ad0","#9a3ad0","#45269a","#5a32b0","#7a44d8","#5e35b1"],["#492997","#45269a","#45269a","#5a32b0","#7a44d8","#7a44d8","#ff6a3d","#c8389a","#5a32b0","#5a32b0","#5a32b0","#7a44d8","#7a44d8","#5e35b1"],["#5e35b1","#45269a","#45269a","#45269a","#5a32b0","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#5e35b1"],["#5e35b1","#5a32b0","#45269a","#45269a","#45269a","#5a32b0","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#7a44d8","#5a32b0","#3c2188"],["#522ea0","#5e35b1","#492997","#3c2188","#3c2188","#3c2188","#492997","#492997","#492997","#492997","#492997","#492997","#3c2188","#381f81"]],
    powerup: {
        "type": "destroyer",
        "tier": 3,
        "area": {
          "origin": [
            3,
            3
          ],
          "grid": [
            "..####..",
            ".######.",
            "########",
            "########",
            "########",
            "########",
            ".######.",
            "..####.."
          ]
        },
        "intro": "Swallows a big circle of blocks around it. Physicists are very excited and also very worried.",
        "help": 3.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.6,
  },
  {
    id: "katana",
    name: "a cool katana",
    grid: [
        "XXXXX"
      ],
    color: [["#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#c97f1e","#c97f1e","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633"],["#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#feae34","#c97f1e","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633"],["#c97f1e","#feae34","#ead4aa","#181425","#181425","#ead4aa","#181425","#181425","#ead4aa","#181425","#181425","#feae34","#c97f1e","#feae34","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#ffffff","#ffffff","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#ffffff","#ffffff"],["#c97f1e","#feae34","#181425","#ead4aa","#181425","#181425","#ead4aa","#181425","#181425","#ead4aa","#181425","#feae34","#c97f1e","#feae34","#c0cbdc","#ffffff","#c0cbdc","#c0cbdc","#ffffff","#c0cbdc","#c0cbdc","#c0cbdc","#ffffff","#c0cbdc","#c0cbdc","#ffffff","#c0cbdc","#c0cbdc","#c0cbdc","#ffffff","#c0cbdc","#c0cbdc","#ffffff","#a22633","#a22633"],["#c97f1e","#feae34","#181425","#181425","#ead4aa","#181425","#181425","#ead4aa","#181425","#181425","#ead4aa","#feae34","#c97f1e","#c97f1e","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#a22633","#a22633","#a22633"],["#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#feae34","#c97f1e","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633"],["#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#c97f1e","#c97f1e","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633"]],
    powerup: {
        "type": "destroyer",
        "tier": 2,
        "collapse": true,
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "-----"
          ]
        },
        "intro": "Slices its whole row clean off, and everything above drops down. It is very cool and knows it.",
        "help": 4
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "expanding_foam",
    name: "expanding foam",
    grid: [
        "X"
      ],
    color: [["#124e89","#124e89","#124e89","#124e89","#fffadf","#efe4b0","#124e89"],["#124e89","#124e89","#124e89","#5a6988","#efe4b0","#efe4b0","#efe4b0"],["#124e89","#124e89","#5a6988","#181425","#124e89","#cdbd84","#efe4b0"],["#124e89","#e43b44","#e43b44","#e43b44","#e43b44","#124e89","#124e89"],["#124e89","#fee761","#fee761","#fee761","#fee761","#124e89","#124e89"],["#124e89","#e43b44","#f6757a","#e43b44","#e43b44","#124e89","#124e89"],["#124e89","#a22633","#f6757a","#e43b44","#a22633","#124e89","#124e89"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "fill": [
          [
            "#fbf3cf",
            "#fbf3cf",
            "#efe4b0",
            "#efe4b0",
            "#efe4b0",
            "#ddd09a",
            "#c7b67a"
          ],
          [
            "#fbf3cf",
            "#efe4b0",
            "#efe4b0",
            "#efe4b0",
            "#efe4b0",
            "#ddd09a",
            "#c7b67a"
          ],
          [
            "#efe4b0",
            "#efe4b0",
            "#efe4b0",
            "#efe4b0",
            "#ddd09a",
            "#ddd09a",
            "#c7b67a"
          ],
          [
            "#efe4b0",
            "#efe4b0",
            "#efe4b0",
            "#ddd09a",
            "#ddd09a",
            "#c7b67a",
            "#efe4b0"
          ],
          [
            "#ddd09a",
            "#ddd09a",
            "#ddd09a",
            "#c7b67a",
            "#c7b67a",
            "#efe4b0",
            "#fbf3cf"
          ],
          [
            "#c7b67a",
            "#c7b67a",
            "#c7b67a",
            "#efe4b0",
            "#fbf3cf",
            "#fbf3cf",
            "#efe4b0"
          ],
          [
            "#ddd09a",
            "#c7b67a",
            "#efe4b0",
            "#fbf3cf",
            "#efe4b0",
            "#efe4b0",
            "#efe4b0"
          ]
        ],
        "area": {
          "origin": [
            2,
            1
          ],
          "grid": [
            ".###.",
            "#####",
            "#####",
            "#####",
            ".###."
          ]
        },
        "intro": "Puffs up and fills every empty cell around it. Don't get it in your hair.",
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "mole",
    name: "a mole with a grudge",
    grid: [
        "X"
      ],
    color: [["#57b9f0","#57b9f0","#5e4b66","#5e4b66","#5e4b66","#57b9f0","#57b9f0"],["#57b9f0","#5e4b66","#5e4b66","#5e4b66","#5e4b66","#5e4b66","#57b9f0"],["#5e4b66","#1a1020","#5e4b66","#5e4b66","#5e4b66","#1a1020","#5e4b66"],["#5e4b66","#5e4b66","#1a1020","#5e4b66","#1a1020","#5e4b66","#5e4b66"],["#5e4b66","#5e4b66","#f6757a","#f6757a","#f6757a","#5e4b66","#5e4b66"],["#f6a0a0","#5e4b66","#5e4b66","#ffffff","#5e4b66","#5e4b66","#f6a0a0"],["#f6a0a0","#b86f50","#b86f50","#b86f50","#b86f50","#b86f50","#f6a0a0"]],
    powerup: {
        "type": "destroyer",
        "tier": 1,
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            ".",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#"
          ]
        },
        "intro": "Digs straight down through the six blocks underneath it. It has never forgiven the stack.",
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "space_laser",
    name: "a laser from space",
    grid: [
        "X"
      ],
    color: [["#ffffff","#24306a","#24306a","#c0cbdc","#24306a","#24306a","#24306a"],["#0099db","#0099db","#24306a","#feae34","#24306a","#0099db","#0099db"],["#2ce8f5","#2ce8f5","#8b9bb4","#feae34","#8b9bb4","#2ce8f5","#2ce8f5"],["#0099db","#0099db","#24306a","#c97f1e","#24306a","#0099db","#0099db"],["#24306a","#24306a","#24306a","#ff0044","#24306a","#24306a","#ffffff"],["#24306a","#ffffff","#24306a","#ff0044","#24306a","#24306a","#24306a"],["#24306a","#24306a","#a22633","#ffe0e8","#a22633","#24306a","#24306a"]],
    powerup: {
        "type": "destroyer",
        "tier": 2,
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "|"
          ]
        },
        "intro": "Vaporises every block in its whole column, top to bottom. Funded by a billionaire, aimed by nobody.",
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "fart",
    name: "a tremendous fart",
    grid: [
        "XX"
      ],
    color: [["#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#5f7a20","#c9a3e6","#c9a3e6","#5f7a20","#c9a3e6","#c9a3e6","#c9a3e6"],["#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#5f7a20","#c9a3e6","#c9a3e6","#5f7a20","#c9a3e6","#4a5420","#4a5420","#c9a3e6"],["#c9a3e6","#f6d0b0","#e8b796","#c28569","#f6d0b0","#e8b796","#c9a3e6","#5f7a20","#4a5420","#4a5420","#4a5420","#dbe46a","#dbe46a","#4a5420"],["#e8b796","#e8b796","#e8b796","#c28569","#e8b796","#e8b796","#4a5420","#4a5420","#dbe46a","#dbe46a","#a9b83a","#a9b83a","#a9b83a","#4a5420"],["#e8b796","#e8b796","#e8b796","#c28569","#e8b796","#e8b796","#4a5420","#a9b83a","#a9b83a","#a9b83a","#a9b83a","#a9b83a","#a9b83a","#4a5420"],["#c9a3e6","#e8b796","#e8b796","#c28569","#e8b796","#c9a3e6","#c9a3e6","#4a5420","#a9b83a","#a9b83a","#a9b83a","#76862a","#76862a","#4a5420"],["#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#4a5420","#4a5420","#4a5420","#4a5420","#4a5420","#c9a3e6"]],
    powerup: {
        "type": "destroyer",
        "tier": 2,
        "area": {
          "origin": [
            2,
            2
          ],
          "grid": [
            ".####.",
            "######",
            "######",
            "######",
            ".####."
          ]
        },
        "intro": "Clears a big cloud of blocks around it. Nobody will admit to it.",
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0,
  },
  {
    id: "scissors",
    name: "a pair of scissors, for running with",
    grid: [
        "X"
      ],
    color: [["#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#ffffff"],["#0099db","#0099db","#0099db","#0099db","#0099db","#ffffff","#8b9bb4"],["#ffffff","#0099db","#0099db","#0099db","#ffffff","#8b9bb4","#0099db"],["#8b9bb4","#ffffff","#0099db","#feae34","#8b9bb4","#0099db","#0099db"],["#0099db","#8b9bb4","#e43b44","#e43b44","#0099db","#0099db","#0099db"],["#e43b44","#e43b44","#0099db","#e43b44","#0099db","#0099db","#0099db"],["#e43b44","#e43b44","#e43b44","#0099db","#0099db","#0099db","#0099db"]],
    powerup: {
        "type": "destroyer",
        "tier": 3,
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "+"
          ]
        },
        "collapse": true,
        "intro": "Cuts through its whole row and its whole column at once. The row closes up afterwards. Don't run.",
        "help": 4.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.5,
  },
  {
    id: "lawnmower",
    name: "an unattended lawnmower",
    grid: [
        "XX"
      ],
    color: [["#181425","#181425","#181425","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0"],["#57b9f0","#57b9f0","#3a4466","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0"],["#57b9f0","#57b9f0","#57b9f0","#3a4466","#57b9f0","#57b9f0","#3a4466","#3a4466","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#9be86a","#57b9f0"],["#ffffff","#ffffff","#57b9f0","#57b9f0","#3a4466","#f6757a","#f6757a","#f6757a","#f6757a","#f6757a","#57b9f0","#57b9f0","#57b9f0","#9be86a"],["#57b9f0","#ffffff","#ffffff","#57b9f0","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#57b9f0","#9be86a","#57b9f0"],["#ffffff","#57b9f0","#57b9f0","#181425","#181425","#a22633","#a22633","#a22633","#a22633","#a22633","#181425","#181425","#57b9f0","#57b9f0"],["#63c74d","#63c74d","#63c74d","#181425","#c0cbdc","#63c74d","#63c74d","#3e8948","#63c74d","#63c74d","#181425","#c0cbdc","#63c74d","#3e8948"]],
    powerup: {
        "type": "destroyer",
        "tier": 2,
        "collapse": true,
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "..",
            "-."
          ]
        },
        "intro": "Mows the whole row underneath it clean away, and everything above drops down. Nobody is pushing it.",
        "help": 4
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "tax_audit",
    name: "an unexpected tax audit",
    grid: [
        "X",
        "X"
      ],
    color: [["#f4f1ea","#f4f1ea","#f4f1ea","#f4f1ea","#f4f1ea","#c0cbdc","#3e8948"],["#f4f1ea","#124e89","#124e89","#124e89","#124e89","#f4f1ea","#c0cbdc"],["#f4f1ea","#124e89","#feae34","#feae34","#124e89","#f4f1ea","#f4f1ea"],["#f4f1ea","#124e89","#124e89","#124e89","#124e89","#f4f1ea","#f4f1ea"],["#f4f1ea","#f4f1ea","#f4f1ea","#f4f1ea","#f4f1ea","#f4f1ea","#f4f1ea"],["#f4f1ea","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#f4f1ea","#f4f1ea"],["#f4f1ea","#f4f1ea","#f4f1ea","#f4f1ea","#f4f1ea","#f4f1ea","#f4f1ea"],["#f4f1ea","#f4f1ea","#f4f1ea","#e43b44","#f4f1ea","#f4f1ea","#f4f1ea"],["#f4f1ea","#f4f1ea","#e43b44","#e43b44","#e43b44","#e43b44","#f4f1ea"],["#f4f1ea","#e43b44","#f4f1ea","#e43b44","#f4f1ea","#f4f1ea","#f4f1ea"],["#f4f1ea","#f4f1ea","#e43b44","#e43b44","#e43b44","#f4f1ea","#f4f1ea"],["#f4f1ea","#f4f1ea","#f4f1ea","#e43b44","#f4f1ea","#e43b44","#f4f1ea"],["#f4f1ea","#e43b44","#e43b44","#e43b44","#e43b44","#f4f1ea","#f4f1ea"],["#f4f1ea","#f4f1ea","#f4f1ea","#e43b44","#f4f1ea","#f4f1ea","#f4f1ea"]],
    powerup: {
        "type": "destroyer",
        "tier": 3,
        "collapse": true,
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "-",
            "-"
          ]
        },
        "intro": "Takes both of its rows away completely. Everything above drops down. Please keep your receipts.",
        "help": 5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.5,
  },
  {
    id: "dynamite",
    name: "a stick of dynamite (it knows)",
    grid: [
        "X",
        "X"
      ],
    color: [["#3a4466","#f77622","#3a4466","#feae34","#3a4466","#3a4466","#3a4466"],["#feae34","#3a4466","#fee761","#ffffff","#fee761","#3a4466","#f77622"],["#3a4466","#3a4466","#f77622","#fee761","#feae34","#3a4466","#3a4466"],["#3a4466","#3a4466","#3a4466","#e4a672","#3a4466","#3a4466","#3a4466"],["#3a4466","#3a4466","#3a4466","#e4a672","#3a4466","#3a4466","#3a4466"],["#3a4466","#a22633","#f6757a","#f6757a","#f6757a","#a22633","#3a4466"],["#3a4466","#a22633","#f6757a","#e43b44","#e43b44","#a22633","#2ce8f5"],["#3a4466","#a22633","#181425","#e43b44","#181425","#a22633","#3a4466"],["#3a4466","#a22633","#ffffff","#e43b44","#ffffff","#a22633","#3a4466"],["#3a4466","#a22633","#f6757a","#e43b44","#e43b44","#a22633","#3a4466"],["#3a4466","#a22633","#f6757a","#5a1020","#e43b44","#a22633","#3a4466"],["#3a4466","#181425","#181425","#181425","#181425","#181425","#3a4466"],["#3a4466","#a22633","#f6757a","#e43b44","#e43b44","#a22633","#3a4466"],["#3a4466","#a22633","#f6757a","#e43b44","#e43b44","#a22633","#3a4466"]],
    powerup: {
        "type": "destroyer",
        "tier": 2,
        "area": {
          "origin": [
            0,
            3
          ],
          "grid": [
            "#",
            "#",
            "#",
            "#",
            "-",
            "#",
            "#",
            "#"
          ]
        },
        "collapse": true,
        "intro": "Blows away its whole row plus a few blocks above and below. It knows, and it is not okay.",
        "help": 4.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.7,
  },
  {
    id: "heavy_book",
    name: "an unread copy of war and peace",
    grid: [
        "XX"
      ],
    color: [["#2f9a9a","#e43b44","#e43b44","#feae34","#feae34","#feae34","#feae34","#feae34","#feae34","#e43b44","#e43b44","#e43b44","#e43b44","#2f9a9a"],["#e43b44","#a22633","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#a22633"],["#a22633","#feae34","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#a22633"],["#a22633","#a22633","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#a22633"],["#a22633","#feae34","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#c8aa80","#a22633"],["#a22633","#a22633","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#0099db","#a22633"],["#2f9a9a","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#0099db","#a22633","#2f9a9a"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 2,
        "area": {
          "origin": [
            1,
            0
          ],
          "grid": [
            "||||"
          ]
        },
        "intro": "So heavy that the four columns under it collapse, squashing out air pockets. Nobody has finished it.",
        "help": 3.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "newtons_apple",
    name: "isaac newton's apple",
    grid: [
        "X"
      ],
    color: [["#57b9f0","#ffffff","#57b9f0","#733e39","#3e8948","#63c74d","#57b9f0"],["#57b9f0","#ffffff","#57b9f0","#733e39","#63c74d","#57b9f0","#57b9f0"],["#57b9f0","#e43b44","#e43b44","#733e39","#e43b44","#e43b44","#57b9f0"],["#e43b44","#ffd0d0","#f6757a","#e43b44","#e43b44","#e43b44","#a22633"],["#e43b44","#f6757a","#e43b44","#e43b44","#e43b44","#e43b44","#a22633"],["#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#a22633","#a22633"],["#57b9f0","#a22633","#e43b44","#e43b44","#a22633","#a22633","#57b9f0"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 2,
        "area": {
          "origin": [
            2,
            0
          ],
          "grid": [
            "|||||"
          ]
        },
        "intro": "Gravity is discovered all over again: five columns collapse and the air pockets disappear.",
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "earthquake",
    name: "a small earthquake (nobody was hurt)",
    grid: [
        "XX"
      ],
    color: [["#57b9f0","#ffffff","#57b9f0","#e43b44","#57b9f0","#ffffff","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#8b9bb4","#57b9f0","#57b9f0"],["#57b9f0","#57b9f0","#e43b44","#e43b44","#e43b44","#57b9f0","#57b9f0","#57b9f0","#8b9bb4","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0"],["#ffffff","#57b9f0","#ead4aa","#3e2731","#ead4aa","#57b9f0","#ffffff","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#ffffff","#57b9f0"],["#63c74d","#63c74d","#ead4aa","#3e2731","#ead4aa","#63c74d","#63c74d","#181425","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0"],["#b86f50","#b86f50","#b86f50","#b86f50","#b86f50","#181425","#181425","#181425","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d"],["#b86f50","#b86f50","#733e39","#b86f50","#b86f50","#181425","#b86f50","#181425","#b86f50","#733e39","#b86f50","#b86f50","#b86f50","#b86f50"],["#b86f50","#b86f50","#b86f50","#733e39","#181425","#181425","#b86f50","#b86f50","#b86f50","#b86f50","#b86f50","#733e39","#b86f50","#b86f50"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 3,
        "area": {
          "origin": [
            13,
            0
          ],
          "grid": [
            "|||||||||||||||||||||||||||"
          ]
        },
        "intro": "Every column on the board collapses. Nobody was hurt. Some blocks were mildly inconvenienced.",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.4,
  },
  {
    id: "gust_of_wind",
    name: "a strong gust of wind",
    grid: [
        "XX"
      ],
    color: [["#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#d8ecf8","#ffffff","#ffffff","#d8ecf8","#ffffff","#d8ecf8","#57b9f0","#57b9f0"],["#57b9f0","#bfe6fa","#f0fbff","#f0fbff","#57b9f0","#d8ecf8","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#57b9f0"],["#f0fbff","#57b9f0","#57b9f0","#57b9f0","#d8ecf8","#ffffff","#3a4466","#ffffff","#ffffff","#3a4466","#ffffff","#ffffff","#d8ecf8","#57b9f0"],["#f0fbff","#f0fbff","#f0fbff","#e05a8a","#e05a8a","#ffffff","#ffb3c6","#ffb3c6","#ffffff","#ffffff","#ffb3c6","#ffb3c6","#ffffff","#d8ecf8"],["#f0fbff","#57b9f0","#57b9f0","#57b9f0","#d8ecf8","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#d8ecf8","#57b9f0"],["#57b9f0","#bfe6fa","#f0fbff","#f0fbff","#57b9f0","#d8ecf8","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#9cc4e0","#57b9f0","#57b9f0"],["#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#57b9f0","#9cc4e0","#9cc4e0","#9cc4e0","#9cc4e0","#9cc4e0","#57b9f0","#57b9f0","#57b9f0"]],
    powerup: {
        "type": "gravity",
        "direction": "left",
        "tier": 2,
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--",
            "--"
          ]
        },
        "intro": "Blows its row and every row below it over to the left, packing them up against the wall.",
        "help": 1.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.7,
  },
  {
    id: "leaky_tap",
    name: "a leaky tap",
    grid: [
        "X"
      ],
    color: [["#1f5f78","#1f5f78","#e43b44","#e43b44","#e43b44","#1f5f78","#1f5f78"],["#1f5f78","#1f5f78","#1f5f78","#c0cbdc","#1f5f78","#1f5f78","#1f5f78"],["#1f5f78","#c0cbdc","#ffffff","#ffffff","#ffffff","#c0cbdc","#1f5f78"],["#8b9bb4","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#ffffff","#c0cbdc"],["#1f5f78","#8b9bb4","#8b9bb4","#1f5f78","#1f5f78","#c0cbdc","#8b9bb4"],["#1f5f78","#1f5f78","#1f5f78","#1f5f78","#1f5f78","#2ce8f5","#1f5f78"],["#1f5f78","#1f5f78","#1f5f78","#1f5f78","#7fe6fa","#0099db","#2ce8f5"]],
    powerup: {
        "type": "expander",
        "tier": 2,
        "fill": [
          [
            "#7fe6fa",
            "#7fe6fa",
            "#ffffff",
            "#7fe6fa",
            "#7fe6fa",
            "#7fe6fa",
            "#7fe6fa"
          ],
          [
            "#0099db",
            "#7fe6fa",
            "#0099db",
            "#0099db",
            "#0099db",
            "#7fe6fa",
            "#0099db"
          ],
          [
            "#0099db",
            "#0099db",
            "#0099db",
            "#0099db",
            "#0099db",
            "#0099db",
            "#0099db"
          ],
          [
            "#0099db",
            "#0099db",
            "#2ce8f5",
            "#0099db",
            "#0099db",
            "#0099db",
            "#0099db"
          ],
          [
            "#0099db",
            "#2ce8f5",
            "#0099db",
            "#0099db",
            "#0099db",
            "#2ce8f5",
            "#0099db"
          ],
          [
            "#124e89",
            "#0099db",
            "#0099db",
            "#124e89",
            "#0099db",
            "#0099db",
            "#0099db"
          ],
          [
            "#124e89",
            "#124e89",
            "#124e89",
            "#124e89",
            "#124e89",
            "#124e89",
            "#124e89"
          ]
        ],
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            ".",
            "-"
          ]
        },
        "intro": "Floods the entire row underneath it, which usually means that row is done. Call a plumber.",
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "wall_filler",
    name: "a tube of wall filler",
    grid: [
        "X",
        "X"
      ],
    color: [["#8b9bb4","#c0cbdc","#8b9bb4","#c0cbdc","#8b9bb4","#c0cbdc","#8b9bb4"],["#5a6988","#8b9bb4","#c0cbdc","#c0cbdc","#c0cbdc","#8b9bb4","#5a6988"],["#5a6988","#f77622","#feae34","#f77622","#f77622","#be4a2f","#5a6988"],["#5a6988","#f77622","#feae34","#f77622","#f77622","#be4a2f","#5a6988"],["#5a6988","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#5a6988"],["#5a6988","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#5a6988"],["#5a6988","#ffffff","#c0cbdc","#c0cbdc","#c0cbdc","#ffffff","#5a6988"],["#5a6988","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#5a6988"],["#5a6988","#f77622","#feae34","#f77622","#f77622","#be4a2f","#5a6988"],["#5a6988","#5a6988","#f77622","#feae34","#be4a2f","#5a6988","#5a6988"],["#5a6988","#5a6988","#f4f1ea","#f4f1ea","#c0cbdc","#5a6988","#5a6988"],["#5a6988","#5a6988","#5a6988","#f4f1ea","#f4f1ea","#5a6988","#5a6988"],["#5a6988","#5a6988","#5a6988","#f4f1ea","#d8d4c8","#f4f1ea","#5a6988"],["#5a6988","#5a6988","#5a6988","#5a6988","#f4f1ea","#d8d4c8","#5a6988"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "fill": [
          [
            "#ece6d6",
            "#ece6d6",
            "#ece6d6",
            "#ece6d6",
            "#faf7ef",
            "#ece6d6",
            "#ece6d6"
          ],
          [
            "#ece6d6",
            "#ece6d6",
            "#ece6d6",
            "#faf7ef",
            "#ece6d6",
            "#ece6d6",
            "#d6cdb8"
          ],
          [
            "#ece6d6",
            "#ece6d6",
            "#faf7ef",
            "#ece6d6",
            "#ece6d6",
            "#d6cdb8",
            "#ece6d6"
          ],
          [
            "#ece6d6",
            "#faf7ef",
            "#ece6d6",
            "#ece6d6",
            "#d6cdb8",
            "#ece6d6",
            "#ece6d6"
          ],
          [
            "#faf7ef",
            "#ece6d6",
            "#ece6d6",
            "#d6cdb8",
            "#ece6d6",
            "#ece6d6",
            "#ece6d6"
          ],
          [
            "#ece6d6",
            "#ece6d6",
            "#d6cdb8",
            "#ece6d6",
            "#ece6d6",
            "#ece6d6",
            "#faf7ef"
          ],
          [
            "#ece6d6",
            "#d6cdb8",
            "#ece6d6",
            "#ece6d6",
            "#ece6d6",
            "#faf7ef",
            "#ece6d6"
          ]
        ],
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            ".",
            ".",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#"
          ]
        },
        "intro": "Squirts filler into the eight cells below it, even the air pockets under overhangs. Very satisfying.",
        "help": 1.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "popcorn",
    name: "a single popcorn kernel",
    grid: [
        "X"
      ],
    color: [["#e43b44","#e43b44","#ffffff","#ffffff","#e43b44","#e43b44","#ffffff"],["#e43b44","#e43b44","#fee761","#feae34","#feae34","#2ce8f5","#ffffff"],["#e43b44","#feae34","#feae34","#feae34","#feae34","#feae34","#ffffff"],["#e43b44","#feae34","#5a2a1a","#feae34","#5a2a1a","#feae34","#ffffff"],["#e43b44","#ff9a8a","#feae34","#a8402a","#feae34","#ff9a8a","#ffffff"],["#e43b44","#e43b44","#d77643","#d77643","#d77643","#e43b44","#ffffff"],["#e43b44","#e43b44","#ffffff","#ead4aa","#e43b44","#e43b44","#ffffff"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "fill": [
          [
            "#ffffff",
            "#ffffff",
            "#f0d8a0",
            "#d9a95a",
            "#ffffff",
            "#ffffff",
            "#fff4dc"
          ],
          [
            "#ffffff",
            "#fff4dc",
            "#f0d8a0",
            "#fee761",
            "#fff4dc",
            "#fff4dc",
            "#f0d8a0"
          ],
          [
            "#f0d8a0",
            "#f0d8a0",
            "#d9a95a",
            "#f0d8a0",
            "#f0d8a0",
            "#feae34",
            "#d9a95a"
          ],
          [
            "#d9a95a",
            "#ffffff",
            "#ffffff",
            "#fff4dc",
            "#d9a95a",
            "#fee761",
            "#ffffff"
          ],
          [
            "#fee761",
            "#ffffff",
            "#fff4dc",
            "#f0d8a0",
            "#d9a95a",
            "#ffffff",
            "#ffffff"
          ],
          [
            "#d9a95a",
            "#f0d8a0",
            "#f0d8a0",
            "#d9a95a",
            "#ffffff",
            "#fff4dc",
            "#f0d8a0"
          ],
          [
            "#ffffff",
            "#fff4dc",
            "#d9a95a",
            "#d9a95a",
            "#f0d8a0",
            "#f0d8a0",
            "#d9a95a"
          ]
        ],
        "area": {
          "origin": [
            2,
            2
          ],
          "grid": [
            "..#..",
            ".###.",
            "##.##",
            ".###.",
            "..#.."
          ]
        },
        "intro": "Pops into a puff of popcorn that fills the empty cells around it. You can't stop at one.",
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "sneeze",
    name: "a big wet sneeze",
    grid: [
        "X"
      ],
    color: [["#0099db","#0099db","#e8b796","#e8b796","#c28569","#0099db","#0099db"],["#0099db","#0099db","#f6d0b0","#e8b796","#c28569","#0099db","#d0f8ff"],["#0099db","#0099db","#f6d0b0","#e8b796","#c28569","#0099db","#0099db"],["#0099db","#0099db","#f6d0b0","#e8b796","#e8b796","#c28569","#0099db"],["#0099db","#e8b796","#e8b796","#e8b796","#f6757a","#c28569","#c28569"],["#e8b796","#c28569","#5a2a2a","#e8b796","#5a2a2a","#c28569","#c28569"],["#0099db","#e8b796","#b9d94a","#c28569","#c28569","#c28569","#0099db"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "fill": [
          [
            "#a9c93a",
            "#cfe36a",
            "#cfe36a",
            "#cfe36a",
            "#a9c93a",
            "#a9c93a",
            "#83a52a"
          ],
          [
            "#cfe36a",
            "#f4ffd0",
            "#f4ffd0",
            "#cfe36a",
            "#a9c93a",
            "#83a52a",
            "#a9c93a"
          ],
          [
            "#cfe36a",
            "#cfe36a",
            "#a9c93a",
            "#a9c93a",
            "#a9c93a",
            "#a9c93a",
            "#a9c93a"
          ],
          [
            "#a9c93a",
            "#a9c93a",
            "#a9c93a",
            "#83a52a",
            "#83a52a",
            "#a9c93a",
            "#a9c93a"
          ],
          [
            "#a9c93a",
            "#a9c93a",
            "#83a52a",
            "#5f7d1c",
            "#83a52a",
            "#a9c93a",
            "#cfe36a"
          ],
          [
            "#83a52a",
            "#a9c93a",
            "#a9c93a",
            "#83a52a",
            "#a9c93a",
            "#cfe36a",
            "#f4ffd0"
          ],
          [
            "#a9c93a",
            "#83a52a",
            "#a9c93a",
            "#a9c93a",
            "#a9c93a",
            "#a9c93a",
            "#cfe36a"
          ]
        ],
        "area": {
          "origin": [
            0,
            1
          ],
          "grid": [
            "..###.",
            ".#####",
            "..###."
          ]
        },
        "intro": "Sprays a cone of snot to the right, filling the empty cells. Bless you. Gross.",
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0,
  },
  {
    id: "sourdough",
    name: "a sourdough starter you forgot to feed",
    grid: [
        "X",
        "X"
      ],
    color: [["#2a6f8f","#2a6f8f","#c0cbdc","#c0cbdc","#c0cbdc","#2a6f8f","#2a6f8f"],["#2a6f8f","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#2a6f8f"],["#fff4dc","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#c8a878"],["#ead4aa","#3e2731","#ead4aa","#ead4aa","#ead4aa","#3e2731","#c8a878"],["#ead4aa","#ead4aa","#3e2731","#ead4aa","#3e2731","#c8a878","#c8a878"],["#c8a878","#ead4aa","#7a2a2a","#7a2a2a","#7a2a2a","#ead4aa","#c8a878"],["#c8a878","#c8a878","#e3cfa0","#e3cfa0","#e3cfa0","#c8a878","#c8a878"],["#2a6f8f","#e6f8fc","#e3cfa0","#a88858","#e3cfa0","#8ab8c8","#c8a878"],["#2a6f8f","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#2a6f8f"],["#2a6f8f","#e6f8fc","#e3cfa0","#e3cfa0","#a88858","#8ab8c8","#2a6f8f"],["#2a6f8f","#e6f8fc","#a88858","#e3cfa0","#e3cfa0","#8ab8c8","#2a6f8f"],["#2a6f8f","#e6f8fc","#e3cfa0","#e3cfa0","#e3cfa0","#8ab8c8","#2a6f8f"],["#2a6f8f","#e6f8fc","#e3cfa0","#a88858","#e3cfa0","#8ab8c8","#2a6f8f"],["#2a6f8f","#2a6f8f","#e6f8fc","#e6f8fc","#8ab8c8","#2a6f8f","#2a6f8f"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "fill": [
          [
            "#ead4aa",
            "#ead4aa",
            "#ead4aa",
            "#fff4dc",
            "#ead4aa",
            "#ead4aa",
            "#ead4aa"
          ],
          [
            "#ead4aa",
            "#d6b88a",
            "#a8865a",
            "#ead4aa",
            "#ead4aa",
            "#d6b88a",
            "#ead4aa"
          ],
          [
            "#ead4aa",
            "#a8865a",
            "#fff4dc",
            "#ead4aa",
            "#d6b88a",
            "#a8865a",
            "#fff4dc"
          ],
          [
            "#ead4aa",
            "#ead4aa",
            "#ead4aa",
            "#ead4aa",
            "#fff4dc",
            "#ead4aa",
            "#ead4aa"
          ],
          [
            "#fff4dc",
            "#ead4aa",
            "#ead4aa",
            "#ead4aa",
            "#ead4aa",
            "#ead4aa",
            "#ead4aa"
          ],
          [
            "#ead4aa",
            "#ead4aa",
            "#ead4aa",
            "#d6b88a",
            "#a8865a",
            "#ead4aa",
            "#ead4aa"
          ],
          [
            "#d6b88a",
            "#ead4aa",
            "#ead4aa",
            "#ead4aa",
            "#fff4dc",
            "#ead4aa",
            "#ead4aa"
          ]
        ],
        "area": {
          "origin": [
            2,
            1
          ],
          "grid": [
            ".###.",
            "##.##",
            "##.##",
            "#####",
            ".###."
          ]
        },
        "intro": "Escapes and fills the empty cells around and below it. It has a name now and it is Gerald.",
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "acid_candy",
    name: "a blob of extremely sour candy",
    grid: [
        "X"
      ],
    color: [["#68386c","#68386c","#a8e61d","#a8e61d","#a8e61d","#68386c","#68386c"],["#68386c","#eaff9e","#a8e61d","#ffffff","#a8e61d","#5fa81a","#68386c"],["#eaff9e","#a8e61d","#1e3a10","#a8e61d","#1e3a10","#a8e61d","#5fa81a"],["#a8e61d","#ffffff","#a8e61d","#a8e61d","#a8e61d","#ffffff","#5fa81a"],["#a8e61d","#a8e61d","#5fa81a","#1e3a10","#5fa81a","#a8e61d","#5fa81a"],["#68386c","#5fa81a","#a8e61d","#a8e61d","#a8e61d","#5fa81a","#68386c"],["#68386c","#68386c","#68386c","#5fa81a","#68386c","#c8f05a","#68386c"]],
    powerup: {
        "type": "acid",
        "reach": 2,
        "tier": 1,
        "intro": "So sour it dissolves every block within two steps of it. The packet says \"ages 40 and up\".",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "battery_acid",
    name: "a jar of battery acid",
    grid: [
        "X",
        "X"
      ],
    color: [["#262b44","#9be86a","#262b44","#262b44","#262b44","#9be86a","#262b44"],["#262b44","#262b44","#9be86a","#262b44","#9be86a","#262b44","#262b44"],["#262b44","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#262b44"],["#262b44","#8b9bb4","#c0cbdc","#c0cbdc","#c0cbdc","#8b9bb4","#262b44"],["#8fb8d4","#3d5a78","#3d5a78","#d8ff9a","#3d5a78","#3d5a78","#8fb8d4"],["#8fb8d4","#7cf02a","#d8ff9a","#7cf02a","#7cf02a","#d8ff9a","#8fb8d4"],["#8fb8d4","#7cf02a","#7cf02a","#7cf02a","#7cf02a","#3ec41a","#8fb8d4"],["#8fb8d4","#fee761","#181425","#181425","#181425","#fee761","#8fb8d4"],["#8fb8d4","#181425","#fee761","#181425","#fee761","#181425","#8fb8d4"],["#8fb8d4","#fee761","#181425","#181425","#181425","#fee761","#8fb8d4"],["#8fb8d4","#fee761","#181425","#fee761","#181425","#fee761","#8fb8d4"],["#8fb8d4","#7cf02a","#3ec41a","#7cf02a","#d8ff9a","#7cf02a","#8fb8d4"],["#8fb8d4","#3ec41a","#7cf02a","#7cf02a","#7cf02a","#3ec41a","#8fb8d4"],["#262b44","#8fb8d4","#8fb8d4","#8fb8d4","#8fb8d4","#8fb8d4","#262b44"]],
    powerup: {
        "type": "acid",
        "reach": 2,
        "tier": 1,
        "intro": "Dissolves every block within two steps of the jar. Somebody labelled it \"juice\" and we need to talk about that.",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "piranha",
    name: "a hungry piranha",
    grid: [
        "XX"
      ],
    color: [["#1f5f78","#1f5f78","#1f5f78","#1f5f78","#1f5f78","#5a6988","#5a6988","#5a6988","#1f5f78","#1f5f78","#1f5f78","#1f5f78","#9fd8f2","#1f5f78"],["#5a6988","#1f5f78","#1f5f78","#1f5f78","#5a6988","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#1f5f78","#1f5f78","#1f5f78"],["#5a6988","#5a6988","#1f5f78","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#fee761","#181425","#7a8aa6","#1f5f78"],["#5a6988","#5a6988","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6","#7a8aa6"],["#5a6988","#5a6988","#7a8aa6","#7a8aa6","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#ffffff","#4a0f20","#ffffff","#4a0f20","#1f5f78"],["#5a6988","#1f5f78","#7a8aa6","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#4a0f20","#ffffff","#4a0f20","#ffffff","#e43b44"],["#1f5f78","#1f5f78","#1f5f78","#1f5f78","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#1f5f78"]],
    powerup: {
        "type": "acid",
        "reach": 2,
        "tier": 1,
        "intro": "Eats every block within two bites of it, then stares at you like you're next. It skipped breakfast.",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "chattering_teeth",
    name: "a set of wind-up chattering teeth",
    grid: [
        "XX"
      ],
    color: [["#ffd25e","#ffd25e","#ffd25e","#c97f1e","#ffd25e","#ffd25e","#ffd25e","#ffd25e","#ffd25e","#ffd25e","#c97f1e","#ffd25e","#ffd25e","#ffd25e"],["#c97f1e","#ffd25e","#e05a8a","#e05a8a","#e05a8a","#e05a8a","#e05a8a","#e05a8a","#e05a8a","#e05a8a","#e05a8a","#e05a8a","#ffd25e","#ffd25e"],["#c97f1e","#7a4a10","#e05a8a","#ffffff","#d8dce8","#ffffff","#d8dce8","#ffffff","#d8dce8","#ffffff","#d8dce8","#e05a8a","#e05a8a","#ffd25e"],["#c97f1e","#ffd25e","#4a0f20","#4a0f20","#4a0f20","#4a0f20","#4a0f20","#4a0f20","#4a0f20","#4a0f20","#4a0f20","#4a0f20","#e05a8a","#ffd25e"],["#c97f1e","#7a4a10","#e05a8a","#d8dce8","#ffffff","#d8dce8","#ffffff","#d8dce8","#ffffff","#d8dce8","#ffffff","#e05a8a","#e05a8a","#ffd25e"],["#ffd25e","#ffd25e","#ffd25e","#e05a8a","#e05a8a","#e05a8a","#e05a8a","#e05a8a","#e05a8a","#e05a8a","#e05a8a","#ffd25e","#ffd25e","#ffd25e"],["#ffd25e","#ffd25e","#ffd25e","#be4a2f","#f77622","#f77622","#be4a2f","#ffd25e","#ffd25e","#be4a2f","#f77622","#f77622","#be4a2f","#ffd25e"]],
    powerup: {
        "type": "acid",
        "reach": 2,
        "tier": 1,
        "intro": "Wind them up and they chomp through every block within two steps. Nobody knows whose teeth these were.",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "bleach",
    name: "a slug of pure bleach",
    grid: [
        "X.",
        "XX"
      ],
    color: [["#2a5d9a","#181425","#2a5d9a","#2a5d9a","#2a5d9a","#181425","#2a5d9a","","","","","","",""],["#2a5d9a","#dfe9f5","#2a5d9a","#3a74b8","#2a5d9a","#dfe9f5","#2a5d9a","","","","","","",""],["#2a5d9a","#2a5d9a","#dfe9f5","#2a5d9a","#dfe9f5","#2a5d9a","#2a5d9a","","","","","","",""],["#2a5d9a","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#2a5d9a","","","","","","",""],["#ffffff","#ffffff","#181425","#ffffff","#181425","#ffffff","#b8cde6","","","","","","",""],["#ffffff","#ffffff","#e05a8a","#e05a8a","#e05a8a","#ffffff","#b8cde6","","","","","","",""],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#b8cde6","","","","","","",""],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#b8cde6","#2a5d9a","#2a5d9a","#2a5d9a","#2a5d9a","#3a74b8","#2a5d9a","#2a5d9a"],["#ffffff","#2ce8f5","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#b8cde6","#2a5d9a","#2a5d9a","#2a5d9a","#2a5d9a","#2a5d9a"],["#ffffff","#ffffff","#ffffff","#2ce8f5","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#b8cde6","#2a5d9a","#2a5d9a","#2a5d9a"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#2ce8f5","#ffffff","#ffffff","#2ce8f5","#ffffff","#ffffff","#b8cde6","#2a5d9a","#2a5d9a"],["#b8cde6","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#b8cde6","#2a5d9a"],["#a8f4ff","#a8f4ff","#a8f4ff","#a8f4ff","#a8f4ff","#a8f4ff","#fee761","#a8f4ff","#a8f4ff","#a8f4ff","#a8f4ff","#a8f4ff","#a8f4ff","#2a5d9a"],["#2a5d9a","#3a74b8","#2a5d9a","#2a5d9a","#2a5d9a","#2a5d9a","#2a5d9a","#2a5d9a","#3a74b8","#2a5d9a","#2a5d9a","#2a5d9a","#2a5d9a","#2a5d9a"]],
    powerup: {
        "type": "acid",
        "reach": 2,
        "tier": 1,
        "intro": "Dissolves every block within two steps and leaves a lemon-fresh trail. Kills 99.9% of blocks.",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "termite_queen",
    name: "a termite queen",
    grid: [
        "X"
      ],
    color: [["#fee761","#e43b44","#fee761","#3e2731","#3e2731","#3e2731","#3e2731"],["#feae34","#feae34","#feae34","#3e2731","#3e2731","#3e2731","#3e2731"],["#f77622","#181425","#f77622","#3e2731","#3e2731","#3e2731","#3e2731"],["#e4a672","#f77622","#f4e6c0","#cdb07a","#f4e6c0","#cdb07a","#3e2731"],["#3e2731","#f4e6c0","#cdb07a","#f4e6c0","#cdb07a","#f4e6c0","#cdb07a"],["#e4a672","#f4e6c0","#cdb07a","#f4e6c0","#cdb07a","#f4e6c0","#cdb07a"],["#3e2731","#3e2731","#f4e6c0","#cdb07a","#f4e6c0","#cdb07a","#3e2731"]],
    powerup: {
        "type": "acid",
        "reach": 3,
        "tier": 2,
        "intro": "Her loyal colony devours every block within three steps of her. Long may she reign over your stack.",
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "lava_lamp",
    name: "a lava lamp that got too hot",
    grid: [
        "X",
        "X"
      ],
    color: [["#262b44","#262b44","#262b44","#fee761","#262b44","#262b44","#262b44"],["#262b44","#262b44","#262b44","#f77622","#262b44","#262b44","#262b44"],["#262b44","#262b44","#c0cbdc","#c0cbdc","#c0cbdc","#262b44","#262b44"],["#262b44","#262b44","#c0306a","#f77622","#c0306a","#262b44","#262b44"],["#262b44","#262b44","#c0306a","#c0306a","#ff0044","#262b44","#262b44"],["#262b44","#c0306a","#f77622","#f77622","#c0306a","#ff0044","#262b44"],["#262b44","#c0306a","#f77622","#c0306a","#ffffff","#c0306a","#262b44"],["#262b44","#c0306a","#c0306a","#ffffff","#f77622","#ff0044","#262b44"],["#262b44","#c0306a","#f77622","#f77622","#c0306a","#ff0044","#262b44"],["#262b44","#262b44","#c0306a","#c0306a","#f77622","#c0306a","#262b44"],["#262b44","#262b44","#c0cbdc","#c0cbdc","#c0cbdc","#262b44","#262b44"],["#262b44","#c0cbdc","#8b9bb4","#c0cbdc","#8b9bb4","#c0cbdc","#262b44"],["#c0cbdc","#8b9bb4","#c0cbdc","#c0cbdc","#c0cbdc","#8b9bb4","#c0cbdc"],["#5a6988","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#5a6988"]],
    powerup: {
        "type": "acid",
        "reach": 3,
        "tier": 2,
        "intro": "It has been on since 1974 and now melts every block within three steps. Still very relaxing to watch.",
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.7,
  },
  {
    id: "floor_is_lava",
    name: "the floor is lava",
    grid: [
        "XXXX"
      ],
    color: [["#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#733e39","#733e39","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a"],["#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#e8b796","#e8b796","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#6aa84f","#6aa84f","#6aa84f","#6aa84f","#3a2a5a","#3a2a5a"],["#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#e8b796","#0099db","#0099db","#0099db","#0099db","#e8b796","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#6aa84f","#3e8948","#3e8948","#6aa84f","#3a2a5a","#3a2a5a"],["#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#0099db","#124e89","#0099db","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#fee761","#3a2a5a","#3a2a5a","#3a2a5a","#6aa84f","#6aa84f","#6aa84f","#6aa84f","#6aa84f","#6aa84f"],["#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#e05a8a","#e05a8a","#a8306a","#e05a8a","#e05a8a","#e05a8a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#3a2a5a","#fee761","#fee761","#181425","#3a2a5a","#6aa84f","#3e8948","#3e8948","#3e8948","#3e8948","#6aa84f"],["#f77622","#fee761","#f77622","#f77622","#e43b44","#e43b44","#f77622","#f77622","#fee761","#f77622","#f77622","#e43b44","#e43b44","#f77622","#fee761","#f77622","#f77622","#e43b44","#e43b44","#fee761","#f77622","#f77622","#e43b44","#e43b44","#6aa84f","#f77622","#6aa84f","#f77622"],["#e43b44","#a22633","#e43b44","#e43b44","#a22633","#f77622","#e43b44","#e43b44","#a22633","#e43b44","#e43b44","#a22633","#e43b44","#f77622","#e43b44","#a22633","#e43b44","#e43b44","#a22633","#e43b44","#e43b44","#a22633","#e43b44","#e43b44","#e43b44","#a22633","#e43b44","#e43b44"]],
    powerup: {
        "type": "acid",
        "reach": 2,
        "tier": 2,
        "intro": "Every block within two steps becomes lava, and lava means gone. You know the rules.",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.7,
  },
  {
    id: "whoopee_cushion",
    name: "a whoopee cushion",
    grid: [
        "X"
      ],
    color: [["#57b9f0","#57b9f0","#57b9f0","#57b9f0","#ffffff","#d8ecf8","#ffffff"],["#57b9f0","#57b9f0","#57b9f0","#57b9f0","#c23a78","#ffffff","#ffffff"],["#57b9f0","#ff6fa8","#ff6fa8","#c23a78","#ff6fa8","#57b9f0","#ffffff"],["#ff6fa8","#ff6fa8","#ffc0dc","#ff6fa8","#ff6fa8","#ff6fa8","#57b9f0"],["#ff6fa8","#ffc0dc","#ff6fa8","#ff6fa8","#ff6fa8","#ff6fa8","#c23a78"],["#ff6fa8","#ff6fa8","#ff6fa8","#ff6fa8","#ff6fa8","#ff6fa8","#c23a78"],["#57b9f0","#c23a78","#c23a78","#c23a78","#c23a78","#c23a78","#57b9f0"]],
    powerup: {
        "type": "blast",
        "push": 4,
        "tier": 1,
        "intro": "Pffft. Blows the blocks in a diamond around it up into the air; they arc away and land where they fall. Timeless comedy.",
        "area": {
          "origin": [
            3,
            3
          ],
          "grid": [
            "...#...",
            "..###..",
            ".#####.",
            "#######",
            ".#####.",
            "..###..",
            "...#..."
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "party_popper",
    name: "a party popper",
    grid: [
        "X"
      ],
    color: [["#9e3163","#c73e7d","#c7a42d","#2dafc7","#c7c7c7","#53c753","#248b9e"],["#c73e7d","#ffd23a","#ffd23a","#ff4fa0","#ff8a2a","#6aff6a","#c7c7c7"],["#c7a42d","#ffd23a","#ff4fa0","#ff4fa0","#ffd23a","#ffd23a","#c76c21"],["#c7a42d","#ff4fa0","#ff4fa0","#ffd23a","#ffd23a","#ff4fa0","#c73e7d"],["#c73e7d","#ff4fa0","#ffd23a","#ffd23a","#ff4fa0","#ff4fa0","#c7a42d"],["#c73e7d","#ffd23a","#ffd23a","#ff4fa0","#ff4fa0","#ffd23a","#c7a42d"],["#9e8224","#c7a42d","#c73e7d","#c73e7d","#c7a42d","#c7a42d","#9e3163"]],
    powerup: {
        "type": "blast",
        "push": 5,
        "tier": 1,
        "intro": "Pops a big circle of blocks around it up and outwards in a shower of confetti; they fly off and land where they fall. Someone has to tidy that up.",
        "area": {
          "origin": [
            4,
            4
          ],
          "grid": [
            "...###...",
            "..#####..",
            ".#######.",
            "#########",
            "#########",
            "#########",
            ".#######.",
            "..#####..",
            "...###..."
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "microwaved_egg",
    name: "an egg someone microwaved",
    grid: [
        "X"
      ],
    color: [["#ffffff","#e0d6c0","#e6a84a","#fee761","#e6a84a","#f77622","#e6a84a"],["#e6a84a","#e6a84a","#fee761","#f77622","#fee761","#fee761","#e6a84a"],["#e6a84a","#ffffff","#fee761","#f77622","#fee761","#ffffff","#e6a84a"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#e0d6c0"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#e0d6c0","#e0d6c0"],["#e6a84a","#ffffff","#ffffff","#ffffff","#e0d6c0","#e0d6c0","#e6a84a"],["#8b9bb4","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#8b9bb4","#c0cbdc"]],
    powerup: {
        "type": "blast",
        "push": 4,
        "tier": 1,
        "intro": "Explodes and flings a wide oval of blocks around it into the air; they rain down wherever they land. It said not to on the box.",
        "area": {
          "origin": [
            3,
            2
          ],
          "grid": [
            ".#####.",
            "#######",
            "#######",
            "#######",
            ".#####."
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "firework_sideways",
    name: "a firework that went off sideways",
    grid: [
        "X"
      ],
    color: [["#fee761","#262b44","#262b44","#262b44","#262b44","#ffffff","#262b44"],["#262b44","#262b44","#e43b44","#e43b44","#e43b44","#262b44","#262b44"],["#fee761","#f77622","#e43b44","#ffffff","#e43b44","#fee761","#262b44"],["#f77622","#fee761","#e43b44","#ffffff","#e43b44","#fee761","#fee761"],["#fee761","#f77622","#e43b44","#ffffff","#a22633","#fee761","#262b44"],["#b86f50","#b86f50","#b86f50","#b86f50","#b86f50","#b86f50","#262b44"],["#262b44","#ffffff","#262b44","#262b44","#262b44","#2ce8f5","#262b44"]],
    powerup: {
        "type": "blast",
        "push": 8,
        "tier": 1,
        "intro": "Blasts the blocks in its row and the rows around it off sideways, far and fast, and they land where they fall. Health and safety have been notified.",
        "area": {
          "origin": [
            5,
            2
          ],
          "grid": [
            "###########",
            "###########",
            "###########",
            "###########",
            "###########"
          ]
        },
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "fizzy_pop",
    name: "a shaken can of fizzy pop",
    grid: [
        "X",
        "X"
      ],
    color: [["#ffffff","#1f5f78","#d8ecf8","#ffffff","#d8ecf8","#1f5f78","#ffffff"],["#1f5f78","#d8ecf8","#ffffff","#ffffff","#ffffff","#d8ecf8","#1f5f78"],["#1f5f78","#1f5f78","#d8ecf8","#ffffff","#d8ecf8","#1f5f78","#1f5f78"],["#1f5f78","#c0cbdc","#8b9bb4","#c0cbdc","#8b9bb4","#c0cbdc","#1f5f78"],["#2ce8f5","#e43b44","#e43b44","#f6757a","#e43b44","#a22633","#2ce8f5"],["#1f5f78","#e43b44","#f6757a","#e43b44","#e43b44","#a22633","#1f5f78"],["#e43b44","#e43b44","#f6757a","#ffffff","#ffffff","#a22633","#a22633"],["#e43b44","#f6757a","#ffffff","#ffffff","#e43b44","#a22633","#a22633"],["#2ce8f5","#e43b44","#e43b44","#f6757a","#e43b44","#a22633","#2ce8f5"],["#1f5f78","#e43b44","#f6757a","#e43b44","#e43b44","#a22633","#1f5f78"],["#1f5f78","#e43b44","#f6757a","#e43b44","#e43b44","#a22633","#1f5f78"],["#2ce8f5","#e43b44","#f6757a","#e43b44","#e43b44","#a22633","#2ce8f5"],["#1f5f78","#c0cbdc","#8b9bb4","#c0cbdc","#8b9bb4","#c0cbdc","#1f5f78"],["#1f5f78","#1f5f78","#1f5f78","#1f5f78","#1f5f78","#1f5f78","#1f5f78"]],
    powerup: {
        "type": "blast",
        "push": 5,
        "tier": 2,
        "intro": "Sprays a tall column of blocks around it up and out; they come back down wherever they land, all sticky. Don't open it facing the stack.",
        "area": {
          "origin": [
            3,
            3
          ],
          "grid": [
            "..###..",
            "#######",
            "#######",
            "#######",
            "#######",
            "#######",
            "#######",
            "..###.."
          ]
        },
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "cartoon_bomb",
    name: "a cartoon bomb",
    grid: [
        "X"
      ],
    color: [["#505d90","#5d6da9","#5d6da9","#5d6da9","#353f71","#e0c080","#ffe040"],["#5d6da9","#6a7cc0","#d0dcff","#3c4880","#a0a8b8","#c8ced8","#e0c080"],["#5d6da9","#d0dcff","#3c4880","#3c4880","#808898","#3c4880","#353f71"],["#5d6da9","#a8b8f0","#3c4880","#3c4880","#3c4880","#3c4880","#232c54"],["#353f71","#3c4880","#3c4880","#3c4880","#3c4880","#283260","#232c54"],["#353f71","#3c4880","#3c4880","#3c4880","#283260","#283260","#232c54"],["#2d3660","#353f71","#353f71","#232c54","#232c54","#232c54","#1e2648"]],
    powerup: {
        "type": "blast",
        "push": 6,
        "tier": 2,
        "intro": "Sends every block in a big circle around it flying in high arcs; they land wherever they come down. Your eyebrows will grow back.",
        "area": {
          "origin": [
            4,
            4
          ],
          "grid": [
            "...###...",
            ".#######.",
            ".#######.",
            "#########",
            "#########",
            "#########",
            ".#######.",
            ".#######.",
            "...###..."
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "big_burp",
    name: "a very large burp",
    grid: [
        "XX"
      ],
    color: [["#c9a3e6","#733e39","#733e39","#733e39","#733e39","#733e39","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#eaff7a","#4f8a1a","#c9a3e6"],["#733e39","#e8b796","#e8b796","#e8b796","#e8b796","#e8b796","#733e39","#c9a3e6","#eaff7a","#4f8a1a","#c9a3e6","#c9a3e6","#eaff7a","#4f8a1a"],["#e8b796","#181425","#e8b796","#e8b796","#e8b796","#181425","#e8b796","#c9a3e6","#c9a3e6","#eaff7a","#4f8a1a","#c9a3e6","#eaff7a","#4f8a1a"],["#e8b796","#e8b796","#e8b796","#e8b796","#e8b796","#c28569","#c28569","#ffffff","#c9a3e6","#eaff7a","#4f8a1a","#c9a3e6","#eaff7a","#4f8a1a"],["#e8b796","#5a1020","#5a1020","#5a1020","#5a1020","#c28569","#c28569","#c9a3e6","#c9a3e6","#eaff7a","#4f8a1a","#c9a3e6","#eaff7a","#4f8a1a"],["#e8b796","#5a1020","#f6757a","#f6757a","#5a1020","#c28569","#c28569","#c9a3e6","#eaff7a","#4f8a1a","#c9a3e6","#c9a3e6","#eaff7a","#4f8a1a"],["#c9a3e6","#e8b796","#e8b796","#e8b796","#e8b796","#c28569","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#c9a3e6","#eaff7a","#4f8a1a","#c9a3e6"]],
    powerup: {
        "type": "blast",
        "push": 5,
        "tier": 2,
        "intro": "Excuse you. Blows the blocks around it up to 3 cells away, then they settle back down, embarrassed.",
        "area": {
          "origin": [
            3,
            3
          ],
          "grid": [
            ".######.",
            "########",
            "########",
            "########",
            "########",
            "########",
            ".######."
          ]
        }
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0,
  },
  {
    id: "small_meteor",
    name: "a meteor (small)",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#7d726d","#a04d26","#938680","#b62f36","#b62f36","#c65e1b","#c65e1b","#c65e1b","#cbb94e","#cbb94e","#ccc5ad","#ccc5ad","#ccc5ad","#ada793"],["#938680","#b8a8a0","#b8a8a0","#c86030","#e43b44","#f77622","#f77622","#f77622","#fee761","#fee761","#fee761","#fff6d8","#fff6d8","#ccc5ad"],["#938680","#b8a8a0","#b8a8a0","#b8a8a0","#e43b44","#e43b44","#e43b44","#f77622","#f77622","#fee761","#fee761","#fff6d8","#fff6d8","#ccc5ad"],["#938680","#b8a8a0","#4e3e48","#4e3e48","#8a7a7a","#e43b44","#e43b44","#e43b44","#f77622","#f77622","#fee761","#fee761","#fee761","#cbb94e"],["#938680","#b8a8a0","#b8a8a0","#8a7a7a","#8a7a7a","#8a7a7a","#e43b44","#e43b44","#e43b44","#f77622","#f77622","#fee761","#fee761","#cbb94e"],["#938680","#b8a8a0","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#c86030","#e43b44","#e43b44","#f77622","#f77622","#f77622","#fee761","#cbb94e"],["#938680","#8a7a7a","#6a5a60","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#6a5a60","#e43b44","#e43b44","#f77622","#f77622","#fee761","#cbb94e"],["#6e6262","#8a7a7a","#8a7a7a","#2a1e2e","#8a7a7a","#8a7a7a","#2a1e2e","#8a7a7a","#c86030","#e43b44","#c86030","#f77622","#e43b44","#c65e1b"],["#6e6262","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#c86030","#c86030","#e43b44","#b62f36"],["#6e6262","#8a7a7a","#8a7a7a","#8a7a7a","#a22633","#a22633","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#c86030","#c86030","#e43b44","#c65e1b"],["#6e6262","#8a7a7a","#8a7a7a","#8a7a7a","#4e3e48","#4e3e48","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#6a5a60","#c86030","#c86030","#b62f36"],["#6e6262","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#6a5a60","#4e3e48","#6a5a60","#c86030","#a04d26"],["#6e6262","#4e3e48","#4e3e48","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#8a7a7a","#6a5a60","#4e3e48","#6a5a60","#6a5a60","#6a5a60","#55484d"],["#5e5353","#6e6262","#6e6262","#6e6262","#6e6262","#6e6262","#6e6262","#55484d","#55484d","#55484d","#55484d","#55484d","#55484d","#483d41"]],
    powerup: {
        "type": "blast",
        "push": 7,
        "tier": 3,
        "intro": "Small for a meteor, enormous for a stack. Hurls a huge circle of blocks far into the sky and lets them rain back down wherever they land.",
        "area": {
          "origin": [
            3,
            3
          ],
          "grid": [
            ".######.",
            "########",
            "########",
            "########",
            "########",
            "########",
            "########",
            ".######."
          ]
        },
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.5,
  },
  {
    id: "florg_goo",
    name: "a puddle of florgnorfepus goo",
    grid: [
        "XX"
      ],
    color: [["#24814c","#2da25f","#6cc783","#2da25f","#2da25f","#90c7a8","#2da25f","#2da25f","#2da25f","#6cc783","#2da25f","#2da25f","#2da25f","#24814c"],["#2da25f","#8affa8","#f0fff4","#f0fff4","#3ad07a","#3ad07a","#8affa8","#3ad07a","#3ad07a","#3ad07a","#3ad07a","#b8ffd8","#3ad07a","#2da25f"],["#2da25f","#f0fff4","#f0fff4","#f0fff4","#f0fff4","#3ad07a","#3ad07a","#3ad07a","#3ad07a","#b8ffd8","#3ad07a","#3ad07a","#3ad07a","#2da25f"],["#2da25f","#f0fff4","#1a3a2a","#1a3a2a","#f0fff4","#3ad07a","#3ad07a","#22a058","#3ad07a","#3ad07a","#3ad07a","#b8ffd8","#3ad07a","#2da25f"],["#2da25f","#f0fff4","#1a3a2a","#1a3a2a","#f0fff4","#3ad07a","#3ad07a","#3ad07a","#3ad07a","#3ad07a","#3ad07a","#3ad07a","#22a058","#2da25f"],["#2da25f","#3ad07a","#f0fff4","#f0fff4","#3ad07a","#22a058","#3ad07a","#3ad07a","#3ad07a","#22a058","#3ad07a","#3ad07a","#3ad07a","#2da25f"],["#24814c","#1b7d45","#2da25f","#2da25f","#2da25f","#2da25f","#1b7d45","#2da25f","#2da25f","#2da25f","#2da25f","#1b7d45","#2da25f","#24814c"]],
    powerup: {
        "type": "goo",
        "tier": 1,
        "volume": 1.5,
        "intro": "What's left of a florgnorfepus after a very long bath. It melts when it lands and oozes down into the lowest gaps it can find. The eye is fine.",
        "fill": [
          [
            "#25b677",
            "#25b677",
            "#4fc492",
            "#25b677",
            "#25b677",
            "#25b677",
            "#25b677"
          ],
          [
            "#25b677",
            "#4fc492",
            "#25b677",
            "#25b677",
            "#264b48",
            "#25b677",
            "#25b677"
          ],
          [
            "#25b677",
            "#25b677",
            "#25b677",
            "#25b677",
            "#25b677",
            "#25b677",
            "#c8f7da"
          ],
          [
            "#25b677",
            "#264b48",
            "#25b677",
            "#25b677",
            "#4fc492",
            "#25b677",
            "#25b677"
          ],
          [
            "#25b677",
            "#25b677",
            "#25b677",
            "#c8f7da",
            "#25b677",
            "#25b677",
            "#25b677"
          ],
          [
            "#4fc492",
            "#25b677",
            "#25b677",
            "#25b677",
            "#25b677",
            "#264b48",
            "#25b677"
          ],
          [
            "#25b677",
            "#25b677",
            "#264b48",
            "#25b677",
            "#25b677",
            "#25b677",
            "#4fc492"
          ]
        ],
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "melting_snorfwiggle",
    name: "a melting snorfwiggle",
    grid: [
        "X",
        "X"
      ],
    color: [["#3a2150","#3a2150","#3a2150","#f2c4d6","#3a2150","#3a2150","#3a2150"],["#3a2150","#3a2150","#6e1f45","#6e1f45","#6e1f45","#3a2150","#3a2150"],["#3a2150","#6e1f45","#ffffff","#f7a8bc","#f7a8bc","#6e1f45","#3a2150"],["#3a2150","#6e1f45","#1a0a14","#f7a8bc","#1a0a14","#6e1f45","#3a2150"],["#3a2150","#6e1f45","#8fd8ff","#f7a8bc","#d9718f","#8fd8ff","#3a2150"],["#3a2150","#6e1f45","#f7a8bc","#ff5d70","#ff5d70","#6e1f45","#3a2150"],["#3a2150","#f7a8bc","#ff5d70","#ff5d70","#ff5d70","#c92f48","#3a2150"],["#3a2150","#f7a8bc","#ff5d70","#ffffff","#ff5d70","#c92f48","#f7a8bc"],["#3a2150","#d9718f","#ff5d70","#ff5d70","#ff5d70","#c92f48","#d9718f"],["#f7a8bc","#f7a8bc","#ff5d70","#ff5d70","#c92f48","#d9718f","#f7a8bc"],["#f7a8bc","#d9718f","#f7a8bc","#c92f48","#d9718f","#f7a8bc","#f7a8bc"],["#f7a8bc","#f7a8bc","#d9718f","#f7a8bc","#f7a8bc","#d9718f","#f7a8bc"],["#f7a8bc","#f7a8bc","#f7a8bc","#d9718f","#f7a8bc","#f7a8bc","#f7a8bc"],["#d9718f","#f7a8bc","#f7a8bc","#f7a8bc","#d9718f","#f7a8bc","#d9718f"]],
    powerup: {
        "type": "goo",
        "tier": 1,
        "volume": 1.5,
        "intro": "The head cold finally won. It lands, goes all runny, and trickles into the lowest holes in your stack.",
        "fill": [
          [
            "#f7a8bc",
            "#f7a8bc",
            "#d9718f",
            "#f7a8bc",
            "#f7a8bc",
            "#f7a8bc",
            "#d9718f"
          ],
          [
            "#f7a8bc",
            "#d9718f",
            "#f7a8bc",
            "#d9718f",
            "#f7a8bc",
            "#f7a8bc",
            "#f7a8bc"
          ],
          [
            "#d9718f",
            "#f7a8bc",
            "#f7a8bc",
            "#f7a8bc",
            "#d9718f",
            "#f7a8bc",
            "#f2c4d6"
          ],
          [
            "#f7a8bc",
            "#d9718f",
            "#f7a8bc",
            "#f7a8bc",
            "#f7a8bc",
            "#f7a8bc",
            "#f7a8bc"
          ],
          [
            "#f7a8bc",
            "#f7a8bc",
            "#f7a8bc",
            "#f7a8bc",
            "#d9718f",
            "#f7a8bc",
            "#f7a8bc"
          ],
          [
            "#f2c4d6",
            "#f7a8bc",
            "#d9718f",
            "#f7a8bc",
            "#f7a8bc",
            "#f7a8bc",
            "#d9718f"
          ],
          [
            "#f7a8bc",
            "#f7a8bc",
            "#f7a8bc",
            "#d9718f",
            "#f7a8bc",
            "#f7a8bc",
            "#f7a8bc"
          ]
        ],
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "unset_jelly",
    name: "a jelly that didn't set",
    grid: [
        "XX"
      ],
    color: [["#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#3e8948","#262b44","#262b44","#262b44","#262b44","#262b44"],["#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#ff8a90","#e43b44","#262b44","#262b44","#262b44","#262b44","#262b44"],["#262b44","#262b44","#262b44","#262b44","#e4ffb0","#a8e86a","#a8e86a","#e43b44","#e43b44","#a8e86a","#63c74d","#262b44","#262b44","#262b44"],["#262b44","#262b44","#e4ffb0","#a8e86a","#a8e86a","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#262b44","#262b44"],["#262b44","#e4ffb0","#a8e86a","#63c74d","#63c74d","#a8e86a","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#3e8948","#262b44"],["#e4ffb0","#a8e86a","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#63c74d","#3e8948"],["#c0cbdc","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#c0cbdc"]],
    powerup: {
        "type": "goo",
        "tier": 1,
        "volume": 1.5,
        "intro": "You did follow the packet. When it lands it collapses and wobbles down into the lowest gaps. The cherry was a mistake.",
        "fill": [
          [
            "#63c74d",
            "#63c74d",
            "#63c74d",
            "#a8e86a",
            "#63c74d",
            "#63c74d",
            "#63c74d"
          ],
          [
            "#63c74d",
            "#a8e86a",
            "#63c74d",
            "#63c74d",
            "#63c74d",
            "#63c74d",
            "#3e8948"
          ],
          [
            "#63c74d",
            "#63c74d",
            "#63c74d",
            "#63c74d",
            "#e4ffb0",
            "#63c74d",
            "#63c74d"
          ],
          [
            "#63c74d",
            "#63c74d",
            "#3e8948",
            "#63c74d",
            "#63c74d",
            "#63c74d",
            "#63c74d"
          ],
          [
            "#a8e86a",
            "#63c74d",
            "#63c74d",
            "#63c74d",
            "#63c74d",
            "#a8e86a",
            "#63c74d"
          ],
          [
            "#63c74d",
            "#63c74d",
            "#63c74d",
            "#63c74d",
            "#3e8948",
            "#63c74d",
            "#63c74d"
          ],
          [
            "#63c74d",
            "#e4ffb0",
            "#63c74d",
            "#63c74d",
            "#63c74d",
            "#63c74d",
            "#63c74d"
          ]
        ],
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "sad_ice_cream",
    name: "a very sad ice cream",
    grid: [
        "X",
        "X"
      ],
    color: [["#262b44","#262b44","#ffe3ec","#ffe3ec","#ffb3c6","#262b44","#262b44"],["#262b44","#ffe3ec","#ffb3c6","#ffb3c6","#ffb3c6","#f6757a","#262b44"],["#ffe3ec","#ffb3c6","#ffb3c6","#ffb3c6","#ffb3c6","#f6757a","#f6757a"],["#ffb3c6","#ffb3c6","#3e2731","#ffb3c6","#3e2731","#ffb3c6","#f6757a"],["#ffb3c6","#ffb3c6","#8fd8ff","#ffb3c6","#ffb3c6","#f6757a","#f6757a"],["#ffb3c6","#f6757a","#3e2731","#3e2731","#3e2731","#f6757a","#f6757a"],["#f6757a","#3e2731","#f6757a","#f6757a","#f6757a","#3e2731","#f6757a"],["#e4a672","#b86f50","#f6757a","#e4a672","#b86f50","#f6757a","#e4a672"],["#b86f50","#e4a672","#f6757a","#b86f50","#e4a672","#f6757a","#b86f50"],["#262b44","#e4a672","#b86f50","#e4a672","#b86f50","#f6757a","#262b44"],["#262b44","#262b44","#b86f50","#e4a672","#b86f50","#262b44","#262b44"],["#262b44","#262b44","#e4a672","#b86f50","#f6757a","#262b44","#262b44"],["#262b44","#262b44","#262b44","#b86f50","#f6757a","#262b44","#262b44"],["#262b44","#f6757a","#f6757a","#b86f50","#f6757a","#f6757a","#262b44"]],
    powerup: {
        "type": "goo",
        "tier": 1,
        "volume": 1,
        "intro": "It has had a long day in the sun. It lands, melts, and drips into the lowest holes it can reach. Crying is only making it worse.",
        "fill": [
          [
            "#ffb3c6",
            "#ffb3c6",
            "#f6757a",
            "#ffb3c6",
            "#ffb3c6",
            "#ffe3ec",
            "#ffb3c6"
          ],
          [
            "#ffb3c6",
            "#f6757a",
            "#f6757a",
            "#ffb3c6",
            "#ffb3c6",
            "#ffb3c6",
            "#ffb3c6"
          ],
          [
            "#ffb3c6",
            "#ffb3c6",
            "#ffb3c6",
            "#ffe3ec",
            "#ffb3c6",
            "#f6757a",
            "#ffb3c6"
          ],
          [
            "#ffe3ec",
            "#ffb3c6",
            "#ffb3c6",
            "#ffb3c6",
            "#f6757a",
            "#f6757a",
            "#ffb3c6"
          ],
          [
            "#ffb3c6",
            "#ffb3c6",
            "#f6757a",
            "#ffb3c6",
            "#ffb3c6",
            "#ffb3c6",
            "#ffb3c6"
          ],
          [
            "#ffb3c6",
            "#ffb3c6",
            "#ffb3c6",
            "#ffb3c6",
            "#ffe3ec",
            "#ffb3c6",
            "#f6757a"
          ],
          [
            "#f6757a",
            "#ffb3c6",
            "#ffb3c6",
            "#ffb3c6",
            "#ffb3c6",
            "#ffb3c6",
            "#ffb3c6"
          ]
        ],
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "bee_honey",
    name: "honey (from the bees)",
    grid: [
        "X",
        "X"
      ],
    color: [["#262b44","#262b44","#262b44","#fee761","#181425","#262b44","#262b44"],["#e43b44","#ffffff","#e43b44","#ffffff","#e43b44","#ffffff","#e43b44"],["#262b44","#a22633","#a22633","#a22633","#a22633","#a22633","#262b44"],["#c0cbdc","#fee761","#feae34","#feae34","#feae34","#feae34","#c0cbdc"],["#c0cbdc","#fee761","#feae34","#feae34","#feae34","#c97f1e","#c0cbdc"],["#c0cbdc","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#c0cbdc"],["#c0cbdc","#ead4aa","#ead4aa","#c8f4ff","#c8f4ff","#ead4aa","#c0cbdc"],["#c0cbdc","#ead4aa","#fee761","#181425","#fee761","#181425","#c0cbdc"],["#c0cbdc","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#c0cbdc"],["#c0cbdc","#fee761","#feae34","#feae34","#feae34","#c97f1e","#c0cbdc"],["#c0cbdc","#feae34","#feae34","#feae34","#feae34","#c97f1e","#feae34"],["#c0cbdc","#feae34","#feae34","#feae34","#c97f1e","#c97f1e","#feae34"],["#c0cbdc","#c97f1e","#c97f1e","#c97f1e","#c97f1e","#c97f1e","#feae34"],["#262b44","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#feae34"]],
    powerup: {
        "type": "goo",
        "tier": 1,
        "volume": 1.5,
        "intro": "Locally sourced from some bees. It lands, the lid gives up, and it seeps slowly into the lowest gaps in the stack.",
        "fill": [
          [
            "#feae34",
            "#feae34",
            "#feae34",
            "#fee761",
            "#feae34",
            "#feae34",
            "#feae34"
          ],
          [
            "#feae34",
            "#fee761",
            "#fee761",
            "#feae34",
            "#feae34",
            "#feae34",
            "#c97f1e"
          ],
          [
            "#feae34",
            "#feae34",
            "#feae34",
            "#feae34",
            "#feae34",
            "#c97f1e",
            "#feae34"
          ],
          [
            "#feae34",
            "#feae34",
            "#c97f1e",
            "#feae34",
            "#feae34",
            "#feae34",
            "#feae34"
          ],
          [
            "#fee761",
            "#feae34",
            "#feae34",
            "#feae34",
            "#feae34",
            "#feae34",
            "#feae34"
          ],
          [
            "#feae34",
            "#feae34",
            "#feae34",
            "#feae34",
            "#fee761",
            "#fee761",
            "#feae34"
          ],
          [
            "#feae34",
            "#c97f1e",
            "#feae34",
            "#feae34",
            "#feae34",
            "#feae34",
            "#feae34"
          ]
        ],
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "custard",
    name: "some lukewarm custard",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#ffffff","#262b44","#262b44"],["#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#c0cbdc","#262b44","#262b44"],["#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#ffffff","#262b44","#262b44"],["#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#e43b44","#262b44","#262b44"],["#262b44","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#e43b44","#ffffff","#262b44"],["#ffffff","#e8c84a","#fee761","#feae34","#e8c84a","#fee761","#fee761","#e8c84a","#fee761","#e43b44","#fee761","#ffffff"],["#ffffff","#fee761","#e8c84a","#fee761","#fee761","#feae34","#e8c84a","#fee761","#fee761","#fee761","#fee761","#ffffff"],["#c0cbdc","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#c0cbdc"],["#262b44","#0099db","#0099db","#ffffff","#0099db","#0099db","#ffffff","#0099db","#0099db","#ffffff","#0099db","#262b44"],["#262b44","#262b44","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#262b44","#262b44"],["#262b44","#262b44","#262b44","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#262b44","#262b44","#262b44"],["#262b44","#262b44","#262b44","#262b44","#124e89","#124e89","#124e89","#124e89","#262b44","#262b44","#262b44","#262b44"]],
    powerup: {
        "type": "goo",
        "tier": 2,
        "volume": 1.5,
        "intro": "Neither hot nor cold, like the custard of a disappointing school dinner. It splats on landing and slops down into the lowest gaps, skin and all.",
        "fill": [
          [
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761",
            "#e8c84a",
            "#fee761",
            "#fee761"
          ],
          [
            "#fee761",
            "#e8c84a",
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761"
          ],
          [
            "#fee761",
            "#fee761",
            "#fee761",
            "#feae34",
            "#fee761",
            "#fee761",
            "#e8c84a"
          ],
          [
            "#e8c84a",
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761"
          ],
          [
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761",
            "#e8c84a",
            "#fee761"
          ],
          [
            "#fee761",
            "#feae34",
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761"
          ],
          [
            "#fee761",
            "#fee761",
            "#fee761",
            "#e8c84a",
            "#fee761",
            "#fee761",
            "#feae34"
          ]
        ],
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "liquid_florg",
    name: "liquid florgnorfepus (do not drink)",
    grid: [
        "XXX"
      ],
    color: [["#262b44","#262b44","#262b44","#262b44","#262b44","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#262b44"],["#e4a672","#e4a672","#8b9bb4","#4fc492","#c0cbdc","#c0cbdc","#4fc492","#25b677","#4fc492","#181425","#ffffff","#ffffff","#ffffff","#ffffff","#181425","#4fc492","#25b677","#c0cbdc"],["#e4a672","#e4a672","#8b9bb4","#25b677","#25b677","#25b677","#25b677","#25b677","#4fc492","#ffffff","#181425","#ffffff","#ffffff","#181425","#ffffff","#25b677","#4fc492","#c0cbdc"],["#b86f50","#e4a672","#8b9bb4","#25b677","#c8f7da","#25b677","#25b677","#4fc492","#25b677","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#25b677","#25b677","#c0cbdc"],["#262b44","#262b44","#262b44","#8b9bb4","#8b9bb4","#25b677","#25b677","#25b677","#4fc492","#181425","#ffffff","#181425","#ffffff","#181425","#181425","#25b677","#25b677","#8b9bb4"],["#262b44","#262b44","#262b44","#262b44","#262b44","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#262b44"]],
    powerup: {
        "type": "goo",
        "tier": 2,
        "volume": 1.5,
        "intro": "A florgnorfepus, concentrated. It smashes when it lands and the contents pour into the lowest holes. Please, for the last time, do not drink it.",
        "fill": [
          [
            "#4fc492",
            "#25b677",
            "#25b677",
            "#25b677",
            "#4fc492",
            "#25b677",
            "#25b677"
          ],
          [
            "#25b677",
            "#25b677",
            "#c8f7da",
            "#25b677",
            "#25b677",
            "#25b677",
            "#4fc492"
          ],
          [
            "#25b677",
            "#4fc492",
            "#25b677",
            "#25b677",
            "#25b677",
            "#d8ff8a",
            "#25b677"
          ],
          [
            "#25b677",
            "#25b677",
            "#25b677",
            "#4fc492",
            "#25b677",
            "#25b677",
            "#25b677"
          ],
          [
            "#d8ff8a",
            "#25b677",
            "#25b677",
            "#25b677",
            "#25b677",
            "#c8f7da",
            "#25b677"
          ],
          [
            "#25b677",
            "#25b677",
            "#4fc492",
            "#25b677",
            "#25b677",
            "#25b677",
            "#25b677"
          ],
          [
            "#25b677",
            "#25b677",
            "#25b677",
            "#25b677",
            "#d8ff8a",
            "#25b677",
            "#4fc492"
          ]
        ],
        "help": 3.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.7,
  },
  {
    id: "bucket_of_slime",
    name: "a bucket of slime",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#262b44","#262b44","#262b44","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#262b44","#262b44","#262b44"],["#262b44","#262b44","#5a6988","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#5a6988","#262b44","#262b44"],["#262b44","#5a6988","#262b44","#262b44","#262b44","#e8b796","#262b44","#e8b796","#262b44","#262b44","#5a6988","#262b44"],["#262b44","#5a6988","#262b44","#262b44","#262b44","#e8b796","#e8b796","#e8b796","#262b44","#262b44","#5a6988","#262b44"],["#262b44","#8ee35c","#4fb83a","#8ee35c","#8ee35c","#8ee35c","#e8b796","#8ee35c","#4fb83a","#8ee35c","#8ee35c","#262b44"],["#c0cbdc","#8ee35c","#8ee35c","#8ee35c","#4fb83a","#8ee35c","#8ee35c","#8ee35c","#8ee35c","#8ee35c","#4fb83a","#c0cbdc"],["#c0cbdc","#8b9bb4","#8ee35c","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8ee35c","#8b9bb4","#8b9bb4","#8b9bb4","#c0cbdc"],["#262b44","#8b9bb4","#8ee35c","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8ee35c","#8b9bb4","#8b9bb4","#8b9bb4","#262b44"],["#262b44","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8ee35c","#8b9bb4","#8b9bb4","#8b9bb4","#262b44"],["#262b44","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#262b44"],["#262b44","#262b44","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#262b44","#262b44"],["#262b44","#262b44","#262b44","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#262b44","#262b44","#262b44"]],
    powerup: {
        "type": "goo",
        "tier": 3,
        "volume": 2.5,
        "intro": "A whole bucket. It tips over on landing and floods the lowest gaps with far more slime than should fit in a bucket. Something in it waves goodbye.",
        "fill": [
          [
            "#8ee35c",
            "#8ee35c",
            "#8ee35c",
            "#4fb83a",
            "#8ee35c",
            "#8ee35c",
            "#8ee35c"
          ],
          [
            "#8ee35c",
            "#4fb83a",
            "#8ee35c",
            "#8ee35c",
            "#8ee35c",
            "#d8ff9a",
            "#8ee35c"
          ],
          [
            "#8ee35c",
            "#8ee35c",
            "#8ee35c",
            "#8ee35c",
            "#4fb83a",
            "#8ee35c",
            "#8ee35c"
          ],
          [
            "#d8ff9a",
            "#8ee35c",
            "#8ee35c",
            "#4fb83a",
            "#8ee35c",
            "#8ee35c",
            "#8ee35c"
          ],
          [
            "#8ee35c",
            "#8ee35c",
            "#8ee35c",
            "#8ee35c",
            "#8ee35c",
            "#4fb83a",
            "#8ee35c"
          ],
          [
            "#8ee35c",
            "#4fb83a",
            "#8ee35c",
            "#8ee35c",
            "#d8ff9a",
            "#8ee35c",
            "#8ee35c"
          ],
          [
            "#8ee35c",
            "#8ee35c",
            "#4fb83a",
            "#8ee35c",
            "#8ee35c",
            "#8ee35c",
            "#4fb83a"
          ]
        ],
        "help": 3.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.5,
  },
  {
    id: "friendly_ghost",
    name: "a ghost (the friendly kind)",
    grid: [
        "X"
      ],
    color: [["#969cb3","#cdd0d6","#cdd0d6","#cdd0d6","#cdd0d6","#cdd0d6","#969cb3"],["#cdd0d6","#ffffff","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#cdd0d6"],["#cdd0d6","#f4f8ff","#3a3a70","#f4f8ff","#3a3a70","#f4f8ff","#8d97bc"],["#cdd0d6","#ffc0d8","#f4f8ff","#f4f8ff","#f4f8ff","#ffc0d8","#8d97bc"],["#cdd0d6","#f4f8ff","#f4f8ff","#ff9ec4","#f4f8ff","#f4f8ff","#8d97bc"],["#cdd0d6","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#8d97bc"],["#7b84a4","#cdd0d6","#8d97bc","#cdd0d6","#8d97bc","#cdd0d6","#7b84a4"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "It floats straight down through your blocks and settles into the deepest gap it fits, where it stays. It just wanted to help.",
        "help": 2
      },
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "quantum_lentil",
    name: "a quantum lentil",
    grid: [
        "X"
      ],
    color: [["#74b2ba","#b5d4d6","#86ccd6","#b5d4d6","#86ccd6","#ca8651","#9d5631"],["#b5d4d6","#9ff3ff","#d8fcff","#9ff3ff","#f0a060","#ffd0a0","#b56338"],["#86ccd6","#d8fcff","#9ff3ff","#f0a060","#ffd0a0","#f0a060","#b56338"],["#b5d4d6","#9ff3ff","#f0a060","#ffd0a0","#f0a060","#f0a060","#b56338"],["#86ccd6","#f0a060","#ffd0a0","#f0a060","#f0a060","#d77643","#944c28"],["#ca8651","#f0a060","#f0a060","#f0a060","#d77643","#b05a30","#944c28"],["#af7546","#b56338","#b56338","#b56338","#944c28","#944c28","#814223"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Until it lands, it is both here and at the bottom of your stack. It passes through blocks and drops into the deepest gap it fits.",
        "help": 2
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "ghost_sock",
    name: "the ghost of a sock",
    grid: [
        "X",
        "X"
      ],
    color: [["#979eba","#aeb5d6","#aeb5d6","#aeb5d6","#aeb5d6","#aeb5d6","#979eba"],["#aeb5d6","#fee761","#fee761","#fee761","#fee761","#fee761","#aeb5d6"],["#d6a1b5","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#d6a1b5"],["#cdd0d6","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#9ea8ca"],["#8dc0d6","#a8e4ff","#a8e4ff","#a8e4ff","#a8e4ff","#a8e4ff","#8dc0d6"],["#cdd0d6","#4a4a80","#f4f8ff","#f4f8ff","#4a4a80","#f4f8ff","#9ea8ca"],["#cdd0d6","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#9ea8ca"],["#cdd0d6","#f4f8ff","#f4f8ff","#7080b8","#f4f8ff","#f4f8ff","#9ea8ca"],["#cdd0d6","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#9ea8ca"],["#cdd0d6","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#9ea8ca"],["#d6a1b5","#ffc0d8","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#9ea8ca"],["#d6a1b5","#ffc0d8","#ffc0d8","#f4f8ff","#f4f8ff","#f4f8ff","#9ea8ca"],["#cdd0d6","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#ff9ec4","#d685a5"],["#8992af","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#d685a5","#ba738f"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Lost in the dryer, now at peace. It drifts through your blocks and lies down in the deepest gap it fits. Its partner is still out there.",
        "help": 2.5
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "phasing_cat",
    name: "a cat that can walk through walls",
    grid: [
        "XX"
      ],
    color: [["#aeafba","#c8cad6","#9ba1ca","#c8cad6","#c8cad6","#9b5143","#9b5143","#663e3e","#9b5143","#c8cad6","#d685a5","#c8cad6","#d685a5","#aeafba"],["#c8cad6","#b8c0f0","#eef0ff","#eef0ff","#eef0ff","#b86050","#b86050","#7a4a4a","#b86050","#eef0ff","#eef0ff","#eef0ff","#eef0ff","#c8cad6"],["#c8cad6","#eef0ff","#eef0ff","#eef0ff","#eef0ff","#7a4a4a","#7a4a4a","#7a4a4a","#7a4a4a","#eef0ff","#2ce8f5","#eef0ff","#2ce8f5","#c8cad6"],["#c8cad6","#eef0ff","#eef0ff","#eef0ff","#eef0ff","#7a4a4a","#b86050","#b86050","#b86050","#eef0ff","#eef0ff","#ff9ec4","#eef0ff","#c8cad6"],["#c8cad6","#eef0ff","#eef0ff","#eef0ff","#eef0ff","#7a4a4a","#b86050","#b86050","#b86050","#8890c8","#eef0ff","#eef0ff","#eef0ff","#7279a8"],["#9ba1ca","#eef0ff","#b8c0f0","#eef0ff","#b8c0f0","#7a4a4a","#7a4a4a","#7a4a4a","#7a4a4a","#eef0ff","#eef0ff","#eef0ff","#eef0ff","#c8cad6"],["#aeafba","#9ba1ca","#c8cad6","#9ba1ca","#c8cad6","#9b5143","#9b5143","#663e3e","#9b5143","#9ba1ca","#c8cad6","#9ba1ca","#c8cad6","#868caf"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Ignores walls, blocks and you. It strolls straight down through the stack into the deepest gap it fits, and sits there like it owns the place.",
        "help": 2
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "ghost_worm",
    name: "the ghost of a worm",
    grid: [
        "X",
        "X",
        "X"
      ],
    color: [["#979eba","#aeb5d6","#aeb5d6","#aeb5d6","#aeb5d6","#979eba"],["#aeb5d6","#fee761","#fee761","#fee761","#fee761","#aeb5d6"],["#d6b5c3","#6a3050","#ffd8e8","#ffd8e8","#6a3050","#a8748d"],["#d6b5c3","#fff0f6","#d0709a","#d0709a","#ffd8e8","#a8748d"],["#c38da8","#e8a8c8","#e8a8c8","#e8a8c8","#e8a8c8","#c38da8"],["#d6b5c3","#fff0f6","#ffd8e8","#ffd8e8","#ffd8e8","#a8748d"],["#d6b5c3","#fff0f6","#ffd8e8","#ffd8e8","#ffd8e8","#a8748d"],["#c38da8","#e8a8c8","#e8a8c8","#e8a8c8","#e8a8c8","#c38da8"],["#d6b5c3","#ffd8e8","#fff0f6","#ffd8e8","#ffd8e8","#a8748d"],["#d6b5c3","#ffd8e8","#fff0f6","#ffd8e8","#ffd8e8","#a8748d"],["#c38da8","#e8a8c8","#e8a8c8","#e8a8c8","#e8a8c8","#c38da8"],["#d6b5c3","#ffd8e8","#fff0f6","#ffd8e8","#ffd8e8","#a8748d"],["#d6b5c3","#ffd8e8","#fff0f6","#ffd8e8","#ffd8e8","#a8748d"],["#c38da8","#e8a8c8","#e8a8c8","#e8a8c8","#e8a8c8","#c38da8"],["#d6b5c3","#fff0f6","#ffd8e8","#ffd8e8","#ffd8e8","#a8748d"],["#d6b5c3","#fff0f6","#ffd8e8","#ffd8e8","#ffd8e8","#a8748d"],["#c38da8","#e8a8c8","#e8a8c8","#e8a8c8","#e8a8c8","#c38da8"],["#92657b","#c38da8","#c38da8","#c38da8","#a8748d","#92657b"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Gone to the big compost heap in the sky. It wriggles down through solid blocks into the deepest gap it fits.",
        "help": 2
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
  },
  {
    id: "forgotten_memories",
    name: "a pair of forgotten memories",
    grid: [
        "X.X"
      ],
    color: [["#e8e4f8","#e8e4f8","#e8e4f8","#e8e4f8","#e8e4f8","#e8e4f8","","","","","","","#e8e4f8","#e8e4f8","#e8e4f8","#e8e4f8","#e8e4f8","#e8e4f8"],["#e8e4f8","#8090c0","#8090c0","#8090c0","#8090c0","#e8e4f8","","","","","","","#e8e4f8","#8090c0","#6a5070","#6a5070","#8090c0","#e8e4f8"],["#e8e4f8","#fee761","#fee761","#8090c0","#8090c0","#e8e4f8","","","","","","","#e8e4f8","#8090c0","#e8c0a8","#e8c0a8","#8090c0","#e8e4f8"],["#e8e4f8","#8090c0","#fee761","#fee761","#fee761","#b8b0d8","","","","","","","#e8e4f8","#8090c0","#e8c0a8","#e8c0a8","#8090c0","#b8b0d8"],["#e8e4f8","#e8e4f8","#e8e4f8","#e8e4f8","#e8e4f8","#b8b0d8","","","","","","","#e8e4f8","#8090c0","#8090c0","#8090c0","#e8e4f8","#b8b0d8"],["#e8e4f8","#e8e4f8","#b8b0d8","#e8e4f8","#b8b0d8","#b8b0d8","","","","","","","#e8e4f8","#e8e4f8","#b8b0d8","#e8e4f8","#b8b0d8","#b8b0d8"]],
    powerup: {
        "type": "phantom",
        "tier": 2,
        "intro": "One is where you left your keys. The other is that guy's name. They sink through everything and settle into the deepest gap they fit, never to be seen again.",
        "help": 2
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.7,
  },
  {
    id: "ghost_tetromino",
    name: "the ghost of a tetris piece",
    grid: [
        "X..",
        "XXX"
      ],
    color: [["#a8c8ff","#a8c8ff","#a8c8ff","#a8c8ff","#a8c8ff","#5a7cff","","","","","","","","","","","",""],["#a8c8ff","#1a2280","#1a2280","#1a2280","#1a2280","#5a7cff","","","","","","","","","","","",""],["#a8c8ff","#e8f0ff","#1a2280","#1a2280","#e8f0ff","#5a7cff","","","","","","","","","","","",""],["#a8c8ff","#1a2280","#1a2280","#1a2280","#1a2280","#5a7cff","","","","","","","","","","","",""],["#a8c8ff","#1a2280","#1a2280","#2a34a0","#1a2280","#5a7cff","","","","","","","","","","","",""],["#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","","","","","","","","","","","",""],["#a8c8ff","#a8c8ff","#a8c8ff","#a8c8ff","#a8c8ff","#5a7cff","#a8c8ff","#a8c8ff","#a8c8ff","#a8c8ff","#a8c8ff","#5a7cff","#a8c8ff","#a8c8ff","#a8c8ff","#a8c8ff","#a8c8ff","#5a7cff"],["#a8c8ff","#1a2280","#1a2280","#1a2280","#1a2280","#5a7cff","#a8c8ff","#1a2280","#1a2280","#1a2280","#1a2280","#5a7cff","#a8c8ff","#1a2280","#1a2280","#1a2280","#1a2280","#5a7cff"],["#a8c8ff","#1a2280","#2a34a0","#1a2280","#1a2280","#5a7cff","#a8c8ff","#1a2280","#2a34a0","#1a2280","#1a2280","#5a7cff","#a8c8ff","#1a2280","#2a34a0","#1a2280","#1a2280","#5a7cff"],["#a8c8ff","#1a2280","#1a2280","#1a2280","#1a2280","#5a7cff","#a8c8ff","#1a2280","#1a2280","#1a2280","#1a2280","#5a7cff","#a8c8ff","#1a2280","#1a2280","#1a2280","#1a2280","#5a7cff"],["#a8c8ff","#1a2280","#1a2280","#1a2280","#1a2280","#5a7cff","#a8c8ff","#1a2280","#1a2280","#1a2280","#1a2280","#5a7cff","#a8c8ff","#1a2280","#1a2280","#1a2280","#1a2280","#5a7cff"],["#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff","#5a7cff"]],
    powerup: {
        "type": "phantom",
        "tier": 2,
        "intro": "You've seen it before: the faint outline showing where a piece will land. Now it goes there for real, straight through your blocks into the deepest gap it fits.",
        "help": 1.5
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
  },
  {
    id: "haunted_bedsheet",
    name: "a haunted bedsheet",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#71799e","#a5aeca","#c8cdd6","#c8cdd6","#c8cdd6","#c8cdd6","#c8cdd6","#c8cdd6","#c8cdd6","#c8cdd6","#a5aeca","#8f97af"],["#a5aeca","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#a5aeca"],["#c8cdd6","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#c8cdd6"],["#c8cdd6","#eef4ff","#3a4680","#3a4680","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#3a4680","#3a4680","#eef4ff","#c8cdd6"],["#c8cdd6","#eef4ff","#3a4680","#3a4680","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#3a4680","#3a4680","#eef4ff","#a5aeca"],["#c8cdd6","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#a5aeca"],["#d6a1b5","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#d6a1b5"],["#c8cdd6","#eef4ff","#eef4ff","#c4cff0","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#c4cff0","#eef4ff","#eef4ff","#a5aeca"],["#c8cdd6","#eef4ff","#eef4ff","#c4cff0","#eef4ff","#eef4ff","#eef4ff","#eef4ff","#c4cff0","#eef4ff","#ffffff","#d6d6d6"],["#d6a1b5","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#ffc0d8","#e43b44","#d6d6d6"],["#c8cdd6","#c4cff0","#eef4ff","#eef4ff","#eef4ff","#c4cff0","#eef4ff","#eef4ff","#eef4ff","#c4cff0","#eef4ff","#c8cdd6"],["#71799e","#c8cdd6","#818bb5","#c8cdd6","#818bb5","#c8cdd6","#818bb5","#c8cdd6","#818bb5","#c8cdd6","#818bb5","#aeb2ba"]],
    powerup: {
        "type": "phantom",
        "tier": 2,
        "intro": "There is nobody underneath. It floats down through your blocks and settles in the deepest gap it fits. Wash at 40.",
        "help": 1
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.7,
  },
  {
    id: "hungry_caterpillar",
    name: "a very hungry caterpillar",
    grid: [
        "XX"
      ],
    color: [["#193c3e","#193c3e","#193c3e","#193c3e","#193c3e","#193c3e","#193c3e","#193c3e","#193c3e","#68386c","#193c3e","#68386c","#193c3e","#193c3e"],["#193c3e","#0f2426","#193c3e","#193c3e","#193c3e","#193c3e","#193c3e","#193c3e","#193c3e","#e43b44","#e43b44","#e43b44","#e43b44","#193c3e"],["#193c3e","#0f2426","#a8e86a","#63c74d","#193c3e","#a8e86a","#63c74d","#193c3e","#a8e86a","#e43b44","#fee761","#e43b44","#fee761","#e43b44"],["#a8e86a","#a8e86a","#63c74d","#63c74d","#a8e86a","#63c74d","#63c74d","#a8e86a","#63c74d","#e43b44","#181425","#e43b44","#181425","#e43b44"],["#63c74d","#63c74d","#63c74d","#a8e86a","#63c74d","#63c74d","#a8e86a","#63c74d","#63c74d","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44"],["#193c3e","#63c74d","#a8e86a","#63c74d","#193c3e","#63c74d","#a8e86a","#63c74d","#193c3e","#e43b44","#e43b44","#181425","#e43b44","#193c3e"],["#193c3e","#b55088","#193c3e","#b55088","#193c3e","#b55088","#193c3e","#b55088","#193c3e","#b55088","#0f2426","#193c3e","#b55088","#193c3e"]],
    powerup: {
        "type": "destroyer",
        "tier": 1,
        "intro": "On Monday it ate one leaf. Today it eats the two rows of six blocks underneath it. It will still be hungry.",
        "area": {
          "origin": [
            2,
            0
          ],
          "grid": [
            "......",
            "######",
            "######"
          ]
        },
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "eraser",
    name: "an eraser (the good kind)",
    grid: [
        "XX"
      ],
    color: [["#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44"],["#262b44","#262b44","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#0099db","#0099db","#262b44","#262b44"],["#262b44","#ffe3f0","#ff9ec4","#ff9ec4","#ff9ec4","#ff9ec4","#ff9ec4","#ff9ec4","#ff9ec4","#124e89","#0099db","#0099db","#0099db","#262b44"],["#ffe3f0","#ff9ec4","#ff9ec4","#3e2731","#ff9ec4","#ff9ec4","#3e2731","#ff9ec4","#0099db","#124e89","#0099db","#0099db","#124e89","#262b44"],["#ffe3f0","#ff9ec4","#ff9ec4","#ff9ec4","#3e2731","#3e2731","#ff9ec4","#ff9ec4","#0099db","#124e89","#0099db","#0099db","#124e89","#262b44"],["#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#124e89","#124e89","#124e89","#124e89","#262b44","#262b44"],["#262b44","#ffd0e0","#262b44","#262b44","#ffd0e0","#262b44","#262b44","#262b44","#ffd0e0","#262b44","#262b44","#ffd0e0","#262b44","#262b44"]],
    powerup: {
        "type": "destroyer",
        "tier": 1,
        "intro": "Not the grey one that just smears. It rubs out the 4x2 patch of blocks beneath it, cleanly.",
        "area": {
          "origin": [
            1,
            0
          ],
          "grid": [
            "....",
            "####",
            "####"
          ]
        },
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "wrecking_ball",
    name: "a wrecking ball",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#5a6988","#5a6988","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff"],["#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#3a4466","#3a4466","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff"],["#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#5a6988","#5a6988","#8fd3ff","#e43b44","#ffffff","#f77622","#8fd3ff"],["#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#3a4466","#3a4466","#3a4466","#3a4466","#e43b44","#e43b44","#e43b44","#8fd3ff"],["#8fd3ff","#8fd3ff","#8fd3ff","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#f77622","#8fd3ff","#8fd3ff"],["#8fd3ff","#8fd3ff","#3a4466","#8b9bb4","#8b9bb4","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#8fd3ff","#8fd3ff"],["#8fd3ff","#3a4466","#8b9bb4","#8b9bb4","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#181425","#8fd3ff"],["#8fd3ff","#3a4466","#8b9bb4","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#181425","#8fd3ff"],["#8fd3ff","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#181425","#8fd3ff"],["#8fd3ff","#8fd3ff","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#181425","#181425","#8fd3ff"],["#8fd3ff","#8fd3ff","#8fd3ff","#3a4466","#3a4466","#3a4466","#3a4466","#181425","#181425","#181425","#8fd3ff","#8fd3ff"],["#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#181425","#181425","#181425","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff"]],
    powerup: {
        "type": "destroyer",
        "tier": 2,
        "intro": "It came in like one. Smashes the 4x3 chunk of blocks right below it. The bird is staying on.",
        "area": {
          "origin": [
            1,
            0
          ],
          "grid": [
            "....",
            "....",
            "####",
            "####",
            "####"
          ]
        },
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.7,
  },
  {
    id: "anvil",
    name: "a cartoon anvil",
    grid: [
        "XXX",
        ".X."
      ],
    color: [["#262b44","#262b44","#262b44","#262b44","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#262b44"],["#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#5a6988","#5a6988","#5a6988","#c0cbdc","#5a6988","#c0cbdc","#c0cbdc","#c0cbdc","#5a6988","#c0cbdc","#c0cbdc","#c0cbdc","#5a6988","#262b44"],["#262b44","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#c0cbdc","#5a6988","#c0cbdc","#5a6988","#c0cbdc","#5a6988","#5a6988","#c0cbdc","#5a6988","#5a6988","#262b44"],["#262b44","#262b44","#3a4466","#5a6988","#5a6988","#5a6988","#5a6988","#c0cbdc","#5a6988","#c0cbdc","#c0cbdc","#c0cbdc","#5a6988","#5a6988","#c0cbdc","#5a6988","#3a4466","#262b44"],["#262b44","#262b44","#262b44","#262b44","#3a4466","#3a4466","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#3a4466","#3a4466","#262b44","#262b44"],["#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44"],["","","","","","","#262b44","#3a4466","#5a6988","#5a6988","#3a4466","#262b44","","","","","",""],["","","","","","","#262b44","#3a4466","#5a6988","#5a6988","#3a4466","#262b44","","","","","",""],["","","","","","","#262b44","#3a4466","#5a6988","#5a6988","#3a4466","#262b44","","","","","",""],["","","","","","","#3a4466","#5a6988","#5a6988","#5a6988","#5a6988","#3a4466","","","","","",""],["","","","","","","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","","","","","",""],["","","","","","","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","#3a4466","","","","","",""]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 2,
        "intro": "Ten tonnes, it says on the side. When it lands, everything in the five columns under it drops down to fill the gaps.",
        "area": {
          "origin": [
            1,
            0
          ],
          "grid": [
            "|||||"
          ]
        },
        "help": 3.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "existential_sigh",
    name: "an existential sigh",
    grid: [
        "X"
      ],
    color: [["#7a7d8b","#babbc3","#babbc3","#babbc3","#babbc3","#999eaf","#7a7d8b"],["#babbc3","#eef0fa","#eef0fa","#eef0fa","#eef0fa","#c4cae0","#999eaf"],["#999eaf","#c4cae0","#c4cae0","#c4cae0","#c4cae0","#c4cae0","#999eaf"],["#999eaf","#4c5478","#c4cae0","#4c5478","#c4cae0","#4c5478","#999eaf"],["#999eaf","#c4cae0","#c4cae0","#c4cae0","#c4cae0","#c4cae0","#7d8399"],["#999eaf","#a0a8c4","#c4cae0","#c4cae0","#a0a8c4","#c4cae0","#7d8399"],["#63687a","#7d8399","#999eaf","#999eaf","#7d8399","#7d8399","#63687a"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 1,
        "intro": "What's the point, really. Every block in the three columns under it gives up and slumps down into the gaps below.",
        "area": {
          "origin": [
            1,
            0
          ],
          "grid": [
            "|||"
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "dropped_lasagne",
    name: "a dropped lasagne",
    grid: [
        "XX"
      ],
    color: [["#262b44","#262b44","#c0cbdc","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#c0cbdc","#262b44","#262b44","#262b44"],["#262b44","#262b44","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#262b44","#262b44"],["#262b44","#124e89","#0099db","#0099db","#ffffff","#ffffff","#ffffff","#ffffff","#0099db","#0099db","#0099db","#0099db","#124e89","#262b44"],["#124e89","#124e89","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#124e89","#124e89"],["#fee761","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#fee761"],["#be4a2f","#e43b44","#be4a2f","#ead4aa","#be4a2f","#e43b44","#feae34","#be4a2f","#ead4aa","#e43b44","#be4a2f","#e43b44","#be4a2f","#ead4aa"],["#fee761","#feae34","#fee761","#fee761","#feae34","#feae34","#fee761","#fee761","#63c74d","#feae34","#fee761","#feae34","#fee761","#feae34"]],
    powerup: {
        "type": "expander",
        "fill": [
          [
            "#fee761",
            "#feae34",
            "#fee761",
            "#fee761",
            "#feae34",
            "#fee761",
            "#fee761"
          ],
          [
            "#e43b44",
            "#be4a2f",
            "#e43b44",
            "#e43b44",
            "#be4a2f",
            "#e43b44",
            "#e43b44"
          ],
          [
            "#be4a2f",
            "#be4a2f",
            "#e43b44",
            "#be4a2f",
            "#e43b44",
            "#be4a2f",
            "#be4a2f"
          ],
          [
            "#ead4aa",
            "#ead4aa",
            "#ffffff",
            "#ead4aa",
            "#ead4aa",
            "#ead4aa",
            "#ffffff"
          ],
          [
            "#fee761",
            "#fee761",
            "#feae34",
            "#fee761",
            "#fee761",
            "#feae34",
            "#fee761"
          ],
          [
            "#e43b44",
            "#be4a2f",
            "#e43b44",
            "#be4a2f",
            "#e43b44",
            "#e43b44",
            "#be4a2f"
          ],
          [
            "#ead4aa",
            "#ead4aa",
            "#ead4aa",
            "#ead4aa",
            "#ffffff",
            "#ead4aa",
            "#ead4aa"
          ]
        ],
        "tier": 2,
        "intro": "Face down, sadly. It splats into the 4x3 space underneath, filling every empty cell with lasagne. Five second rule.",
        "area": {
          "origin": [
            1,
            0
          ],
          "grid": [
            "....",
            "####",
            "####",
            "####"
          ]
        },
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.7,
  },
  {
    id: "bowling_ball",
    name: "a bowling ball (strike!)",
    grid: [
        "X"
      ],
    color: [["#5c51ad","#7163d3","#7163d3","#7163d3","#4638b0","#4638b0","#3a2e90"],["#7163d3","#c0b8ff","#8070f0","#5040c8","#5040c8","#5040c8","#4638b0"],["#7163d3","#8070f0","#5040c8","#18124a","#5040c8","#18124a","#4638b0"],["#7163d3","#5040c8","#5040c8","#5040c8","#5040c8","#5040c8","#332786"],["#4638b0","#6a5ae0","#5040c8","#5040c8","#18124a","#6a5ae0","#332786"],["#4638b0","#5040c8","#6a5ae0","#5040c8","#6a5ae0","#3a2c98","#332786"],["#3a2e90","#4638b0","#4638b0","#332786","#332786","#332786","#2a206d"]],
    powerup: {
        "type": "blast",
        "tier": 1,
        "intro": "Strike! The wide triangle of 'pins' under it goes flying up and out, and every pin lands where it falls. The pins have filed a complaint.",
        "area": {
          "origin": [
            4,
            0
          ],
          "grid": [
            "...###...",
            "..#####..",
            ".#######.",
            "#########",
            "#########",
            "#########"
          ]
        },
        "push": 6,
        "help": 3.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "sumo_wrestler",
    name: "a sumo wrestler (mid-stomp)",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#e9cf97","#e9cf97","#e9cf97","#e9cf97","#e9cf97","#1b1420","#1b1420","#e9cf97","#e9cf97","#e9cf97","#e9cf97","#e9cf97"],["#e9cf97","#e9cf97","#e9cf97","#e9cf97","#1b1420","#1b1420","#1b1420","#1b1420","#e9cf97","#e9cf97","#e9cf97","#e9cf97"],["#e9cf97","#e9cf97","#e9cf97","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#e9cf97","#e9cf97"],["#e9cf97","#e9cf97","#f3bf98","#1b1420","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#1b1420","#f3bf98","#e9cf97","#e9cf97"],["#e9cf97","#e9cf97","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#e9cf97","#e9cf97"],["#e9cf97","#f3bf98","#f3bf98","#f3bf98","#cf8a64","#a8484c","#a8484c","#cf8a64","#f3bf98","#f3bf98","#f3bf98","#e9cf97"],["#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#cf8a64","#cf8a64"],["#f3bf98","#cf8a64","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#cf8a64","#cf8a64"],["#f3bf98","#f3bf98","#f3bf98","#f3bf98","#f3bf98","#cf8a64","#cf8a64","#f3bf98","#f3bf98","#f3bf98","#cf8a64","#cf8a64"],["#3247a8","#3247a8","#3247a8","#3247a8","#3247a8","#3247a8","#3247a8","#3247a8","#3247a8","#3247a8","#3247a8","#3247a8"],["#e9cf97","#f3bf98","#f3bf98","#f3bf98","#3247a8","#3247a8","#3247a8","#3247a8","#f3bf98","#f3bf98","#f3bf98","#e9cf97"],["#e9cf97","#f3bf98","#cf8a64","#cf8a64","#e9cf97","#3247a8","#3247a8","#e9cf97","#cf8a64","#cf8a64","#f3bf98","#e9cf97"]],
    powerup: {
        "type": "gravity",
        "tier": 2,
        "intro": "Stomps so hard that every block in the 8x8 patch around and below him drops down into the gaps. He has done this once before. The floor remembers.",
        "area": {
          "origin": [
            3,
            0
          ],
          "grid": [
            "########",
            "########",
            "########",
            "########",
            "########",
            "########",
            "########",
            "########"
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "potato_sack",
    name: "a sack of potatoes",
    grid: [
        "X",
        "X"
      ],
    color: [["#a7dcf0","#c99a55","#8a6330","#a7dcf0","#c99a55","#c99a55","#a7dcf0"],["#a7dcf0","#c99a55","#c99a55","#8a6330","#c99a55","#8a6330","#a7dcf0"],["#a7dcf0","#a7dcf0","#d6b27a","#d6b27a","#d6b27a","#a7dcf0","#a7dcf0"],["#a7dcf0","#4a3020","#4a3020","#4a3020","#4a3020","#4a3020","#a7dcf0"],["#a7dcf0","#a7dcf0","#d6b27a","#d6b27a","#d6b27a","#a07f48","#a7dcf0"],["#a7dcf0","#d6b27a","#d6b27a","#d6b27a","#d6b27a","#d6b27a","#a07f48"],["#d6b27a","#d6b27a","#d6b27a","#d6b27a","#d6b27a","#d6b27a","#a07f48"],["#d6b27a","#d6b27a","#a07f48","#d6b27a","#d6b27a","#d6b27a","#a07f48"],["#d6b27a","#d6b27a","#4a3020","#4a3020","#4a3020","#d6b27a","#a07f48"],["#d6b27a","#4a3020","#c99a55","#8a6330","#c99a55","#4a3020","#a07f48"],["#d6b27a","#d6b27a","#4a3020","#4a3020","#4a3020","#d6b27a","#a07f48"],["#d6b27a","#d6b27a","#d6b27a","#d6b27a","#d6b27a","#d6b27a","#a07f48"],["#d6b27a","#a07f48","#d6b27a","#d6b27a","#a07f48","#a07f48","#a07f48"],["#a7dcf0","#a07f48","#a07f48","#a07f48","#a07f48","#a07f48","#a7dcf0"]],
    powerup: {
        "type": "gravity",
        "tier": 1,
        "intro": "Slumps down in a funnel: the blocks in a 7-wide V shape around and under it drop into the gaps. It's what potatoes do best, apart from chips.",
        "area": {
          "origin": [
            3,
            0
          ],
          "grid": [
            "#######",
            "#######",
            ".#####.",
            "..###..",
            "...#..."
          ]
        },
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "black_cat",
    name: "a black cat (it walked under a ladder)",
    grid: [
        "XX"
      ],
    color: [["#6e65a6","#cf89c2","#5f5893","#5f5893","#cf89c2","#5f5893","#5f5893","#5f5893","#5f5893","#5f5893","#5f5893","#5f5893","#5f5893","#6e65a6"],["#5f5893","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#6e66a8","#6e66a8","#6e66a8","#5f5893"],["#5f5893","#ffe040","#ffe040","#34305a","#ffe040","#ffe040","#34305a","#34305a","#34305a","#34305a","#34305a","#6e66a8","#34305a","#5f5893"],["#5f5893","#ffe040","#ffe040","#34305a","#ffe040","#ffe040","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#5f5893"],["#7f75be","#34305a","#34305a","#ff8ab0","#34305a","#34305a","#6e66a8","#6e66a8","#34305a","#34305a","#34305a","#34305a","#34305a","#5f5893"],["#5f5893","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#34305a","#5f5893"],["#6e65a6","#7f75be","#7f75be","#5f5893","#7f75be","#7f75be","#5f5893","#5f5893","#7f75be","#7f75be","#5f5893","#5f5893","#7f75be","#857ac5"]],
    powerup: {
        "type": "gravity",
        "tier": 1,
        "intro": "Only the unlucky blocks fall: every other cell, in a checkerboard across the 6x6 patch under it, drops down. Seven years of this.",
        "area": {
          "origin": [
            2,
            0
          ],
          "grid": [
            "......",
            "#.#.#.",
            ".#.#.#",
            "#.#.#.",
            ".#.#.#",
            "#.#.#.",
            ".#.#.#"
          ]
        },
        "help": 1.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "pogo_stick",
    name: "a pogo stick (boing)",
    grid: [
        "X",
        "X",
        "X"
      ],
    color: [["#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44"],["#ffe9a8","#ffe9a8","#ffe9a8","#c0cbdc","#ffe9a8","#ffe9a8"],["#ffe9a8","#ffe9a8","#c0cbdc","#c0cbdc","#ffe9a8","#ffe9a8"],["#ffe9a8","#ffe9a8","#c0cbdc","#c0cbdc","#ffe9a8","#ffe9a8"],["#ffe9a8","#ffe9a8","#c0cbdc","#c0cbdc","#ffe9a8","#ffe9a8"],["#ffe9a8","#ffe9a8","#c0cbdc","#c0cbdc","#ffe9a8","#ffe9a8"],["#ffe9a8","#ffe9a8","#c0cbdc","#c0cbdc","#ffe9a8","#ffe9a8"],["#ffe9a8","#ffe9a8","#c0cbdc","#c0cbdc","#ffe9a8","#ffe9a8"],["#ffe9a8","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#ffe9a8"],["#262b44","#262b44","#c0cbdc","#c0cbdc","#262b44","#262b44"],["#ffe9a8","#5a6988","#5a6988","#5a6988","#5a6988","#ffe9a8"],["#ffe9a8","#ffe9a8","#c0cbdc","#c0cbdc","#ffe9a8","#ffe9a8"],["#ffe9a8","#5a6988","#5a6988","#5a6988","#5a6988","#ffe9a8"],["#ffe9a8","#ffe9a8","#c0cbdc","#c0cbdc","#ffe9a8","#ffe9a8"],["#ffe9a8","#5a6988","#5a6988","#5a6988","#5a6988","#ffe9a8"],["#ffe9a8","#ffe9a8","#c0cbdc","#c0cbdc","#ffe9a8","#ffe9a8"],["#ffe9a8","#ffe9a8","#262b44","#262b44","#ffe9a8","#ffe9a8"],["#ffe9a8","#ffe9a8","#262b44","#262b44","#ffe9a8","#ffe9a8"]],
    powerup: {
        "type": "gravity",
        "tier": 1,
        "intro": "Boings straight down: every block in its own column below it drops into the gaps. Just the one column. It is only a small pogo stick.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            ".",
            ".",
            ".",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#"
          ]
        },
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "hippo_bellyflop",
    name: "a hippo in a tutu (belly flop)",
    grid: [
        "XXX",
        "XXX"
      ],
    color: [["#8fd3ff","#8fd3ff","#8fd3ff","#9a8fc4","#9a8fc4","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff"],["#8fd3ff","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#8fd3ff","#8fd3ff","#8fd3ff"],["#8fd3ff","#9a8fc4","#1a1424","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#8fd3ff","#8fd3ff"],["#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#8fd3ff"],["#f2a5b8","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4"],["#f2a5b8","#f2a5b8","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#6b6196"],["#7a3050","#f2a5b8","#f2a5b8","#9a8fc4","#9a8fc4","#9a8fc4","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#6b6196"],["#f2a5b8","#f2a5b8","#f2a5b8","#9a8fc4","#9a8fc4","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#9a8fc4","#6b6196","#6b6196"],["#8fd3ff","#f2a5b8","#f2a5b8","#6b6196","#9a8fc4","#9a8fc4","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#ff7ccf","#9a8fc4","#6b6196","#6b6196","#8fd3ff"],["#8fd3ff","#8fd3ff","#8fd3ff","#6b6196","#6b6196","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#9a8fc4","#6b6196","#6b6196","#8fd3ff","#8fd3ff"],["#8fd3ff","#8fd3ff","#8fd3ff","#6b6196","#6b6196","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#8fd3ff","#6b6196","#6b6196","#8fd3ff","#8fd3ff","#8fd3ff"],["#3b7dd8","#e8f6ff","#3b7dd8","#6b6196","#6b6196","#3b7dd8","#e8f6ff","#3b7dd8","#3b7dd8","#e8f6ff","#3b7dd8","#3b7dd8","#3b7dd8","#6b6196","#6b6196","#3b7dd8","#e8f6ff","#3b7dd8"]],
    powerup: {
        "type": "gravity",
        "tier": 3,
        "intro": "Belly flops into the stack: a shockwave five rows deep, getting wider as it goes (up to 13 cells), makes every block in it drop into the gaps. Ten out of ten from the judges.",
        "area": {
          "origin": [
            5,
            0
          ],
          "grid": [
            ".............",
            ".............",
            "....#####....",
            "...#######...",
            "..#########..",
            ".###########.",
            "#############"
          ]
        },
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "ton_of_bricks",
    name: "a ton of bricks",
    grid: [
        "XXX"
      ],
    color: [["#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8"],["#c8553d","#c8553d","#c8553d","#c8553d","#cfc6b8","#c8553d","#c8553d","#c8553d","#f08a6c","#cfc6b8","#c8553d","#c8553d","#c8553d","#c8553d","#cfc6b8","#c8553d","#c8553d","#c8553d"],["#8f3324","#8f3324","#8f3324","#8f3324","#cfc6b8","#8f3324","#8f3324","#8f3324","#8f3324","#cfc6b8","#8f3324","#8f3324","#8f3324","#8f3324","#cfc6b8","#8f3324","#8f3324","#8f3324"],["#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8","#cfc6b8"],["#c8553d","#c8553d","#cfc6b8","#c8553d","#c8553d","#c8553d","#c8553d","#cfc6b8","#c8553d","#c8553d","#c8553d","#c8553d","#cfc6b8","#c8553d","#c8553d","#c8553d","#c8553d","#cfc6b8"],["#a87a46","#a87a46","#6b4a28","#a87a46","#a87a46","#a87a46","#a87a46","#6b4a28","#a87a46","#a87a46","#a87a46","#a87a46","#6b4a28","#a87a46","#a87a46","#a87a46","#a87a46","#6b4a28"]],
    powerup: {
        "type": "gravity",
        "tier": 2,
        "intro": "Lands like a ton of bricks: every block in its own row and the three rows under it, wall to wall, drops into the gaps. Exactly one ton. We weighed it.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "-",
            "-",
            "-",
            "-"
          ]
        },
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "lost_marbles",
    name: "your marbles (you have lost them)",
    grid: [
        "X"
      ],
    color: [["#2b2d42","#2b2d42","#5cc8ff","#5cc8ff","#5cc8ff","#2b2d42","#2b2d42"],["#2b2d42","#5cc8ff","#ffffff","#5cc8ff","#5cc8ff","#2a7fbf","#2b2d42"],["#5cc8ff","#ffffff","#ff9a3c","#ff9a3c","#5cc8ff","#5cc8ff","#2a7fbf"],["#5cc8ff","#5cc8ff","#5cc8ff","#ff9a3c","#ff9a3c","#2a7fbf","#2a7fbf"],["#5cc8ff","#5cc8ff","#ff9a3c","#ff9a3c","#5cc8ff","#2a7fbf","#2a7fbf"],["#2b2d42","#5cc8ff","#5cc8ff","#2a7fbf","#2a7fbf","#2a7fbf","#2b2d42"],["#2b2d42","#2b2d42","#2a7fbf","#2a7fbf","#2a7fbf","#2b2d42","#2b2d42"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "intro": "Your marbles roll out both sides and fill the empty cells in its own row, up to four on each side. You can't find them anywhere. Look, there they are.",
        "area": {
          "origin": [
            4,
            0
          ],
          "grid": [
            "####.####"
          ]
        },
        "fill": [
          [
            "#ff5c5c",
            "#ffffff",
            "#ff5c5c",
            "#2b2d42",
            "#5cc8ff",
            "#ffffff",
            "#5cc8ff"
          ],
          [
            "#ff5c5c",
            "#ff5c5c",
            "#b02a3a",
            "#2b2d42",
            "#5cc8ff",
            "#5cc8ff",
            "#2a7fbf"
          ],
          [
            "#2b2d42",
            "#b02a3a",
            "#b02a3a",
            "#2b2d42",
            "#2a7fbf",
            "#2a7fbf",
            "#2b2d42"
          ],
          [
            "#2b2d42",
            "#2b2d42",
            "#2b2d42",
            "#2b2d42",
            "#2b2d42",
            "#2b2d42",
            "#ffd23f"
          ],
          [
            "#4cd97b",
            "#ffffff",
            "#4cd97b",
            "#2b2d42",
            "#ffd23f",
            "#ffffff",
            "#ffd23f"
          ],
          [
            "#4cd97b",
            "#4cd97b",
            "#1f8a4c",
            "#2b2d42",
            "#ffd23f",
            "#ffd23f",
            "#c9921a"
          ],
          [
            "#2b2d42",
            "#1f8a4c",
            "#1f8a4c",
            "#2b2d42",
            "#c9921a",
            "#c9921a",
            "#2b2d42"
          ]
        ],
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "lawn_sprinkler",
    name: "a lawn sprinkler (it never stops)",
    grid: [
        "X"
      ],
    color: [["#5cc8ff","#9fd8ff","#5cc8ff","#9fd8ff","#5cc8ff","#9fd8ff","#5cc8ff"],["#9fd8ff","#5cc8ff","#9fd8ff","#2a7fbf","#9fd8ff","#5cc8ff","#9fd8ff"],["#5cc8ff","#9fd8ff","#9fd8ff","#8a8f98","#9fd8ff","#9fd8ff","#5cc8ff"],["#9fd8ff","#9fd8ff","#8a8f98","#4a4f58","#8a8f98","#9fd8ff","#9fd8ff"],["#9fd8ff","#4a4f58","#4a4f58","#4a4f58","#4a4f58","#4a4f58","#9fd8ff"],["#9be36a","#4cb84c","#9be36a","#9be36a","#4cb84c","#9be36a","#4cb84c"],["#2e7d32","#4cb84c","#2e7d32","#4cb84c","#2e7d32","#4cb84c","#2e7d32"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "intro": "Sprays a T of fresh lawn: it fills the empty cells three to its left, three to its right and three below it. Someone has to mow all this now.",
        "area": {
          "origin": [
            3,
            0
          ],
          "grid": [
            "###.###",
            "...#...",
            "...#...",
            "...#..."
          ]
        },
        "fill": [
          [
            "#9be36a",
            "#4cb84c",
            "#9be36a",
            "#9be36a",
            "#4cb84c",
            "#9be36a",
            "#4cb84c"
          ],
          [
            "#4cb84c",
            "#2e7d32",
            "#4cb84c",
            "#4cb84c",
            "#9be36a",
            "#4cb84c",
            "#2e7d32"
          ],
          [
            "#4cb84c",
            "#4cb84c",
            "#2e7d32",
            "#4cb84c",
            "#2e7d32",
            "#4cb84c",
            "#4cb84c"
          ],
          [
            "#4cb84c",
            "#2e7d32",
            "#4cb84c",
            "#4cb84c",
            "#4cb84c",
            "#4cb84c",
            "#2e7d32"
          ],
          [
            "#2e7d32",
            "#4cb84c",
            "#2e7d32",
            "#4cb84c",
            "#2e7d32",
            "#4cb84c",
            "#4cb84c"
          ],
          [
            "#4cb84c",
            "#2e7d32",
            "#2e7d32",
            "#4cb84c",
            "#2e7d32",
            "#2e7d32",
            "#4cb84c"
          ],
          [
            "#2e7d32",
            "#2e7d32",
            "#2e7d32",
            "#2e7d32",
            "#2e7d32",
            "#2e7d32",
            "#2e7d32"
          ]
        ],
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "bouncy_castle",
    name: "a bouncy castle (inflating)",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#e8333f","#e8333f","#8fd3ff","#e8333f","#e8333f","#8fd3ff","#8fd3ff","#e8333f","#e8333f","#8fd3ff","#e8333f","#e8333f"],["#e8333f","#ffd23f","#e8333f","#e8333f","#ffd23f","#e8333f","#e8333f","#ffd23f","#e8333f","#e8333f","#ffd23f","#e8333f"],["#e8333f","#e8333f","#e8333f","#e8333f","#e8333f","#e8333f","#e8333f","#e8333f","#e8333f","#e8333f","#e8333f","#e8333f"],["#e8333f","#ffd23f","#e8333f","#ffd23f","#e8333f","#ffd23f","#e8333f","#ffd23f","#e8333f","#ffd23f","#e8333f","#ffd23f"],["#ffd23f","#e8333f","#ffd23f","#e8333f","#ffd23f","#e8333f","#ffd23f","#e8333f","#ffd23f","#e8333f","#ffd23f","#e8333f"],["#e8333f","#ffd23f","#e8333f","#ffd23f","#e8333f","#2a1640","#2a1640","#e8333f","#ffd23f","#e8333f","#ffd23f","#e8333f"],["#ffd23f","#e8333f","#ffd23f","#e8333f","#2a1640","#2a1640","#2a1640","#2a1640","#e8333f","#ffd23f","#e8333f","#ffd23f"],["#e8333f","#ffd23f","#e8333f","#ffd23f","#2a1640","#2a1640","#2a1640","#2a1640","#ffd23f","#e8333f","#ffd23f","#e8333f"],["#ffd23f","#e8333f","#ffd23f","#e8333f","#2a1640","#2a1640","#2a1640","#2a1640","#e8333f","#ffd23f","#e8333f","#ffd23f"],["#3a6fe8","#3a6fe8","#3a6fe8","#3a6fe8","#3a6fe8","#3a6fe8","#3a6fe8","#3a6fe8","#3a6fe8","#3a6fe8","#3a6fe8","#3a6fe8"],["#3a6fe8","#22439a","#3a6fe8","#22439a","#3a6fe8","#22439a","#3a6fe8","#22439a","#3a6fe8","#22439a","#3a6fe8","#22439a"],["#22439a","#22439a","#22439a","#22439a","#22439a","#22439a","#22439a","#22439a","#22439a","#22439a","#22439a","#22439a"]],
    powerup: {
        "type": "expander",
        "tier": 2,
        "intro": "Inflates into the ring of 12 cells all around it, filling every empty one. Shoes off. No, all the way off.",
        "area": {
          "origin": [
            1,
            1
          ],
          "grid": [
            "####",
            "#..#",
            "#..#",
            "####"
          ]
        },
        "fill": [
          [
            "#e8333f",
            "#ffd23f",
            "#e8333f",
            "#ffd23f",
            "#e8333f",
            "#ffd23f"
          ],
          [
            "#ffd23f",
            "#e8333f",
            "#ffd23f",
            "#e8333f",
            "#ffd23f",
            "#e8333f"
          ],
          [
            "#e8333f",
            "#ffd23f",
            "#e8333f",
            "#ffd23f",
            "#e8333f",
            "#ffd23f"
          ],
          [
            "#ffd23f",
            "#e8333f",
            "#ffd23f",
            "#e8333f",
            "#ffd23f",
            "#e8333f"
          ],
          [
            "#e8333f",
            "#ffd23f",
            "#e8333f",
            "#ffd23f",
            "#e8333f",
            "#ffd23f"
          ],
          [
            "#a81f2c",
            "#d39a1a",
            "#a81f2c",
            "#d39a1a",
            "#a81f2c",
            "#d39a1a"
          ]
        ],
        "help": 1
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "pancake_stack",
    name: "a tall stack of pancakes",
    grid: [
        "XX"
      ],
    color: [["#ffe9c7","#ffe9c7","#ffe9c7","#ffe9c7","#ffe9c7","#ffe9c7","#fff27a","#fff27a","#ffe9c7","#ffe9c7","#ffe9c7","#ffe9c7","#ffe9c7","#ffe9c7"],["#ffe9c7","#ffe9c7","#e8a654","#e8a654","#e8a654","#e8a654","#e8a654","#e8a654","#e8a654","#e8a654","#e8a654","#8a3d10","#ffe9c7","#ffe9c7"],["#ffe9c7","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#8a3d10","#8a3d10","#b8732e","#ffe9c7"],["#ffe9c7","#f6d08a","#f6d08a","#f6d08a","#f6d08a","#f6d08a","#f6d08a","#f6d08a","#f6d08a","#8a3d10","#f6d08a","#f6d08a","#e8a654","#ffe9c7"],["#ffe9c7","#e8a654","#e8a654","#e8a654","#e8a654","#e8a654","#e8a654","#e8a654","#e8a654","#e8a654","#8a3d10","#e8a654","#e8a654","#ffe9c7"],["#ffe9c7","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#b8732e","#ffe9c7"],["#c9ccd6","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#c9ccd6"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "intro": "Flops pancakes into every empty cell in the four rows under it, two wide, plugging the gaps. Syrup is not included. Syrup is never included.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "..",
            "##",
            "##",
            "##",
            "##"
          ]
        },
        "fill": [
          [
            "#e8a654",
            "#e8a654",
            "#e8a654",
            "#e8a654",
            "#e8a654",
            "#e8a654",
            "#e8a654"
          ],
          [
            "#b8732e",
            "#b8732e",
            "#b8732e",
            "#b8732e",
            "#b8732e",
            "#b8732e",
            "#b8732e"
          ],
          [
            "#f6d08a",
            "#f6d08a",
            "#8a3d10",
            "#f6d08a",
            "#f6d08a",
            "#f6d08a",
            "#f6d08a"
          ],
          [
            "#e8a654",
            "#e8a654",
            "#e8a654",
            "#8a3d10",
            "#e8a654",
            "#e8a654",
            "#e8a654"
          ],
          [
            "#b8732e",
            "#b8732e",
            "#b8732e",
            "#b8732e",
            "#b8732e",
            "#b8732e",
            "#b8732e"
          ],
          [
            "#f6d08a",
            "#f6d08a",
            "#f6d08a",
            "#f6d08a",
            "#f6d08a",
            "#8a3d10",
            "#f6d08a"
          ],
          [
            "#e8a654",
            "#e8a654",
            "#e8a654",
            "#e8a654",
            "#e8a654",
            "#e8a654",
            "#e8a654"
          ]
        ],
        "help": 1.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "ball_pit",
    name: "a ball pit (do not dive in)",
    grid: [
        "XX"
      ],
    color: [["#ff4d5e","#ff4d5e","#ff4d5e","#ff4d5e","#ff4d5e","#ff4d5e","#ff4d5e","#ff4d5e","#ff4d5e","#ff4d5e","#ff4d5e","#ff4d5e","#ff4d5e","#ff4d5e"],["#2f5fd0","#ff4d5e","#ff4d5e","#2b2d42","#ffd23f","#ffd23f","#2b2d42","#3fa7ff","#3fa7ff","#2b2d42","#4cd97b","#4cd97b","#2b2d42","#2f5fd0"],["#2f5fd0","#ff4d5e","#ff4d5e","#2b2d42","#ffd23f","#ffd23f","#2b2d42","#3fa7ff","#3fa7ff","#2b2d42","#4cd97b","#4cd97b","#2b2d42","#2f5fd0"],["#2f5fd0","#2b2d42","#3fa7ff","#3fa7ff","#2b2d42","#c86bff","#c86bff","#2b2d42","#ff4d5e","#ff4d5e","#2b2d42","#ffd23f","#ffd23f","#2f5fd0"],["#2f5fd0","#2b2d42","#3fa7ff","#3fa7ff","#2b2d42","#c86bff","#c86bff","#2b2d42","#ff4d5e","#ff4d5e","#2b2d42","#ffd23f","#ffd23f","#2f5fd0"],["#2f5fd0","#4cd97b","#4cd97b","#2b2d42","#ff4d5e","#ff4d5e","#2b2d42","#ffd23f","#ffd23f","#2b2d42","#3fa7ff","#3fa7ff","#2b2d42","#2f5fd0"],["#2f5fd0","#2f5fd0","#2f5fd0","#2f5fd0","#2f5fd0","#2f5fd0","#2f5fd0","#2f5fd0","#2f5fd0","#2f5fd0","#2f5fd0","#2f5fd0","#2f5fd0","#2f5fd0"]],
    powerup: {
        "type": "expander",
        "tier": 2,
        "intro": "Fills a bowl of empty cells with balls: three on each side of it, and the two 8-wide rows underneath. Nobody knows what is at the bottom.",
        "area": {
          "origin": [
            3,
            0
          ],
          "grid": [
            "###..###",
            "########",
            "########"
          ]
        },
        "fill": [
          [
            "#ff4d5e",
            "#ff4d5e",
            "#2b2d42",
            "#3fa7ff",
            "#3fa7ff",
            "#2b2d42",
            "#4cd97b"
          ],
          [
            "#ff4d5e",
            "#ff4d5e",
            "#2b2d42",
            "#3fa7ff",
            "#3fa7ff",
            "#2b2d42",
            "#2b2d42"
          ],
          [
            "#2b2d42",
            "#2b2d42",
            "#ffd23f",
            "#ffd23f",
            "#2b2d42",
            "#c86bff",
            "#c86bff"
          ],
          [
            "#4cd97b",
            "#2b2d42",
            "#ffd23f",
            "#ffd23f",
            "#2b2d42",
            "#c86bff",
            "#c86bff"
          ],
          [
            "#2b2d42",
            "#ff9a3c",
            "#ff9a3c",
            "#2b2d42",
            "#2b2d42",
            "#3fa7ff",
            "#2b2d42"
          ],
          [
            "#ff4d5e",
            "#ff9a3c",
            "#ff9a3c",
            "#2b2d42",
            "#ff4d5e",
            "#ff4d5e",
            "#2b2d42"
          ],
          [
            "#2b2d42",
            "#2b2d42",
            "#4cd97b",
            "#2b2d42",
            "#ff4d5e",
            "#ff4d5e",
            "#2b2d42"
          ]
        ],
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "lego_brick",
    name: "a lego brick (barefoot warning)",
    grid: [
        "X"
      ],
    color: [["#2b2d42","#ff8a8a","#e8333f","#2b2d42","#ff8a8a","#e8333f","#2b2d42"],["#2b2d42","#e8333f","#9e1f2a","#2b2d42","#e8333f","#9e1f2a","#2b2d42"],["#ff8a8a","#ff8a8a","#e8333f","#e8333f","#e8333f","#e8333f","#e8333f"],["#ff8a8a","#e8333f","#e8333f","#e8333f","#e8333f","#e8333f","#9e1f2a"],["#e8333f","#e8333f","#e8333f","#e8333f","#e8333f","#e8333f","#9e1f2a"],["#e8333f","#e8333f","#e8333f","#e8333f","#e8333f","#9e1f2a","#9e1f2a"],["#9e1f2a","#9e1f2a","#9e1f2a","#9e1f2a","#9e1f2a","#9e1f2a","#9e1f2a"]],
    powerup: {
        "type": "expander",
        "tier": 2,
        "intro": "Multiplies and builds a step pyramid under it: 1, 3, 5 and 7 cells wide, filling every empty cell. You will find the last piece with your foot at 3am.",
        "area": {
          "origin": [
            3,
            0
          ],
          "grid": [
            ".......",
            "...#...",
            "..###..",
            ".#####.",
            "#######"
          ]
        },
        "fill": [
          [
            "#2b2d42",
            "#ffd23f",
            "#c9921a",
            "#2b2d42",
            "#ffd23f",
            "#c9921a",
            "#2b2d42"
          ],
          [
            "#2b2d42",
            "#c9921a",
            "#c9921a",
            "#2b2d42",
            "#c9921a",
            "#c9921a",
            "#2b2d42"
          ],
          [
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#ffd23f"
          ],
          [
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#c9921a"
          ],
          [
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#c9921a"
          ],
          [
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#ffd23f",
            "#c9921a",
            "#c9921a"
          ],
          [
            "#c9921a",
            "#c9921a",
            "#c9921a",
            "#c9921a",
            "#c9921a",
            "#c9921a",
            "#c9921a"
          ]
        ],
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "cotton_candy",
    name: "a cloud of cotton candy",
    grid: [
        "X",
        "X"
      ],
    color: [["#7fd0ff","#ffb3dc","#ffe3f3","#ffe3f3","#ffb3dc","#ff7cc4","#7fd0ff"],["#ffb3dc","#ffe3f3","#ffe3f3","#ffb3dc","#ffb3dc","#ffb3dc","#ff7cc4"],["#ffe3f3","#ffb3dc","#ffb3dc","#ffb3dc","#ff7cc4","#ffb3dc","#ff7cc4"],["#ffb3dc","#ffb3dc","#ffb3dc","#ff7cc4","#ffb3dc","#ffb3dc","#ff7cc4"],["#ff7cc4","#ffb3dc","#ffb3dc","#ffb3dc","#ff7cc4","#ff7cc4","#ff7cc4"],["#7fd0ff","#ff7cc4","#ff7cc4","#ff7cc4","#ff7cc4","#ff7cc4","#7fd0ff"],["#7fd0ff","#a8d8ff","#ff7cc4","#ff7cc4","#ff7cc4","#a8d8ff","#7fd0ff"],["#7fd0ff","#7fd0ff","#a8d8ff","#ff7cc4","#a8d8ff","#7fd0ff","#7fd0ff"],["#7fd0ff","#7fd0ff","#7fd0ff","#c9b99a","#7fd0ff","#7fd0ff","#7fd0ff"],["#7fd0ff","#7fd0ff","#7fd0ff","#c9b99a","#7fd0ff","#7fd0ff","#7fd0ff"],["#7fd0ff","#7fd0ff","#7fd0ff","#c9b99a","#7fd0ff","#7fd0ff","#7fd0ff"],["#7fd0ff","#7fd0ff","#7fd0ff","#c9b99a","#7fd0ff","#7fd0ff","#7fd0ff"],["#7fd0ff","#7fd0ff","#7fd0ff","#c9b99a","#7fd0ff","#7fd0ff","#7fd0ff"],["#7fd0ff","#7fd0ff","#7fd0ff","#c9b99a","#7fd0ff","#7fd0ff","#7fd0ff"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "intro": "Fluffs out sideways, filling the empty cells two to each side of it, in both of its rows. It is 98% air and 2% regret.",
        "area": {
          "origin": [
            2,
            0
          ],
          "grid": [
            "##.##",
            "##.##"
          ]
        },
        "fill": [
          [
            "#ffe3f3",
            "#ffb3dc",
            "#ffb3dc",
            "#ffe3f3",
            "#ffb3dc",
            "#ffb3dc",
            "#ff7cc4"
          ],
          [
            "#ffb3dc",
            "#ffb3dc",
            "#ff7cc4",
            "#ffb3dc",
            "#ffb3dc",
            "#ffe3f3",
            "#ffb3dc"
          ],
          [
            "#ffe3f3",
            "#ffb3dc",
            "#ffb3dc",
            "#ff7cc4",
            "#ffb3dc",
            "#ffb3dc",
            "#ffb3dc"
          ],
          [
            "#ffb3dc",
            "#ff7cc4",
            "#ffb3dc",
            "#ffb3dc",
            "#ffe3f3",
            "#ffb3dc",
            "#ff7cc4"
          ],
          [
            "#ffb3dc",
            "#ffb3dc",
            "#ffe3f3",
            "#ffb3dc",
            "#ff7cc4",
            "#ffb3dc",
            "#ffb3dc"
          ],
          [
            "#ff7cc4",
            "#ffb3dc",
            "#ffb3dc",
            "#ff7cc4",
            "#ffb3dc",
            "#ffb3dc",
            "#ffe3f3"
          ],
          [
            "#ffb3dc",
            "#ff7cc4",
            "#ffb3dc",
            "#ffb3dc",
            "#ffb3dc",
            "#ff7cc4",
            "#ffb3dc"
          ]
        ],
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "foam_cousin",
    name: "expanding foam's cousin from out of town",
    grid: [
        "X",
        "X"
      ],
    color: [["#ffe9a8","#ffe9a8","#3a2414","#3a2414","#3a2414","#ffe9a8","#ffe9a8"],["#ffe9a8","#ffe9a8","#6b4424","#3a2414","#6b4424","#ffe9a8","#ffe9a8"],["#3a2414","#3a2414","#3a2414","#3a2414","#3a2414","#3a2414","#3a2414"],["#ffe9a8","#ffe9a8","#c0cbdc","#6b7389","#c0cbdc","#ffe9a8","#ffe9a8"],["#ffe9a8","#3cbfa8","#3cbfa8","#3cbfa8","#3cbfa8","#1f7a6b","#ffe9a8"],["#ffe9a8","#3cbfa8","#ffffff","#3cbfa8","#3cbfa8","#1f7a6b","#ffe9a8"],["#ffe9a8","#3cbfa8","#ffffff","#3cbfa8","#3cbfa8","#1f7a6b","#ffe9a8"],["#ffe9a8","#3cbfa8","#3cbfa8","#3cbfa8","#3cbfa8","#1f7a6b","#ffe9a8"],["#ffe9a8","#1f7a6b","#b8f05a","#b8f05a","#b8f05a","#1f7a6b","#ffe9a8"],["#ffe9a8","#1f7a6b","#b8f05a","#7fbf2a","#b8f05a","#1f7a6b","#ffe9a8"],["#ffe9a8","#1f7a6b","#b8f05a","#b8f05a","#b8f05a","#1f7a6b","#ffe9a8"],["#ffe9a8","#3cbfa8","#3cbfa8","#3cbfa8","#3cbfa8","#1f7a6b","#ffe9a8"],["#ffe9a8","#3cbfa8","#3cbfa8","#3cbfa8","#1f7a6b","#1f7a6b","#ffe9a8"],["#ffe9a8","#1f7a6b","#1f7a6b","#1f7a6b","#1f7a6b","#1f7a6b","#ffe9a8"]],
    powerup: {
        "type": "expander",
        "tier": 3,
        "intro": "Fills every empty cell in the three columns under it, all the way to the floor, and the cells beside it. It is only staying for a few days. It said that in March.",
        "area": {
          "origin": [
            1,
            0
          ],
          "grid": [
            "#.#",
            "#.#",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###"
          ]
        },
        "fill": [
          [
            "#b8f05a",
            "#e8ffb0",
            "#b8f05a",
            "#b8f05a",
            "#e8ffb0",
            "#b8f05a",
            "#b8f05a"
          ],
          [
            "#b8f05a",
            "#b8f05a",
            "#7fbf2a",
            "#b8f05a",
            "#b8f05a",
            "#7fbf2a",
            "#b8f05a"
          ],
          [
            "#e8ffb0",
            "#b8f05a",
            "#b8f05a",
            "#b8f05a",
            "#e8ffb0",
            "#b8f05a",
            "#b8f05a"
          ],
          [
            "#b8f05a",
            "#7fbf2a",
            "#b8f05a",
            "#7fbf2a",
            "#b8f05a",
            "#b8f05a",
            "#7fbf2a"
          ],
          [
            "#b8f05a",
            "#b8f05a",
            "#e8ffb0",
            "#b8f05a",
            "#b8f05a",
            "#b8f05a",
            "#e8ffb0"
          ],
          [
            "#7fbf2a",
            "#b8f05a",
            "#b8f05a",
            "#7fbf2a",
            "#e8ffb0",
            "#b8f05a",
            "#b8f05a"
          ],
          [
            "#b8f05a",
            "#7fbf2a",
            "#b8f05a",
            "#b8f05a",
            "#b8f05a",
            "#7fbf2a",
            "#b8f05a"
          ]
        ],
        "help": 3.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "zeus_bolt",
    name: "a lightning bolt from zeus",
    grid: [
        ".X",
        "XX",
        "X."
      ],
    color: [["","","","","","","#2a2550","#2a2550","#2a2550","#fff27a","#ffc93c","#2a2550"],["","","","","","","#2a2550","#2a2550","#fff27a","#ffc93c","#2a2550","#2a2550"],["","","","","","","#2a2550","#fff27a","#ffc93c","#2a2550","#2a2550","#2a2550"],["","","","","","","#2a2550","#fff27a","#ffc93c","#2a2550","#2a2550","#2a2550"],["","","","","","","#fff27a","#ffc93c","#2a2550","#2a2550","#2a2550","#2a2550"],["","","","","","","#fff27a","#ffc93c","#2a2550","#2a2550","#2a2550","#2a2550"],["#2a2550","#2a2550","#2a2550","#2a2550","#fff27a","#fff27a","#fff27a","#fff27a","#fff27a","#fff27a","#fff27a","#2a2550"],["#2a2550","#2a2550","#2a2550","#fff27a","#ffc93c","#ffc93c","#ffc93c","#ffc93c","#ffc93c","#ffc93c","#ffc93c","#2a2550"],["#2a2550","#2a2550","#2a2550","#fff27a","#ffc93c","#ffc93c","#ffc93c","#ffc93c","#ffc93c","#ffc93c","#2a2550","#2a2550"],["#2a2550","#2a2550","#fff27a","#ffc93c","#ffc93c","#ffc93c","#ffc93c","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550"],["#2a2550","#2a2550","#fff27a","#ffc93c","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550"],["#2a2550","#fff27a","#ffc93c","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550"],["#2a2550","#fff27a","#ffc93c","#2a2550","#2a2550","#2a2550","","","","","",""],["#fff27a","#ffc93c","#2a2550","#2a2550","#2a2550","#2a2550","","","","","",""],["#fff27a","#ffc93c","#2a2550","#2a2550","#2a2550","#2a2550","","","","","",""],["#ffc93c","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550","","","","","",""],["#ffffff","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550","","","","","",""],["#ffc93c","#2a2550","#2a2550","#2a2550","#2a2550","#2a2550","","","","","",""]],
    powerup: {
        "type": "destroyer",
        "tier": 2,
        "intro": "Smites both of its columns, top to bottom: every block in them is destroyed. Zeus says it slipped. Zeus always says it slipped.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "||"
          ]
        },
        "help": 4
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "pacman",
    name: "a hungry yellow chomper (legally distinct)",
    grid: [
        "X"
      ],
    color: [["#bfb76c","#e6dc82","#e6dc82","#e6dc82","#e6ca2b","#e6ca2b","#84182c"],["#e6dc82","#fff490","#1c2458","#ffe030","#ffe030","#b0203a","#9e1d34"],["#e6dc82","#fff490","#ffe030","#ffe030","#b0203a","#b0203a","#9e1d34"],["#e6dc82","#ffe030","#ffe030","#b0203a","#b0203a","#e05060","#ca4856"],["#e6ca2b","#ffe030","#ffe030","#ffe030","#b0203a","#b0203a","#9e1d34"],["#e6ca2b","#ffe030","#ffe030","#ffe030","#e0a810","#b0203a","#9e1d34"],["#bfa824","#e6ca2b","#e6ca2b","#ca970e","#ca970e","#ca970e","#84182c"]],
    powerup: {
        "type": "destroyer",
        "tier": 1,
        "intro": "Eats the six blocks in a straight line in front of its mouth (rotate it to aim). Waka waka. It has not stopped saying waka since 1980.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            ".######"
          ]
        },
        "help": 2
      },
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "cheese_grater",
    name: "a cheese grater (the scary side)",
    grid: [
        "X",
        "X"
      ],
    color: [["#ffd27a","#ffd27a","#262b44","#262b44","#262b44","#ffd27a","#ffd27a"],["#ffd27a","#ffd27a","#262b44","#ffd27a","#262b44","#ffd27a","#ffd27a"],["#c9d1df","#c9d1df","#c9d1df","#c9d1df","#c9d1df","#7d879c","#c9d1df"],["#c9d1df","#262b44","#c9d1df","#262b44","#c9d1df","#262b44","#7d879c"],["#c9d1df","#c9d1df","#c9d1df","#c9d1df","#c9d1df","#c9d1df","#7d879c"],["#c9d1df","#262b44","#c9d1df","#262b44","#c9d1df","#262b44","#7d879c"],["#c9d1df","#c9d1df","#c9d1df","#c9d1df","#c9d1df","#c9d1df","#7d879c"],["#c9d1df","#262b44","#c9d1df","#262b44","#c9d1df","#262b44","#7d879c"],["#c9d1df","#c9d1df","#c9d1df","#c9d1df","#c9d1df","#c9d1df","#7d879c"],["#c9d1df","#262b44","#c9d1df","#262b44","#c9d1df","#262b44","#7d879c"],["#c9d1df","#c9d1df","#c9d1df","#c9d1df","#c9d1df","#c9d1df","#7d879c"],["#c9d1df","#262b44","#c9d1df","#262b44","#c9d1df","#262b44","#7d879c"],["#ffd23f","#ffd23f","#ffd23f","#ffd23f","#ffd23f","#ffd23f","#7d879c"],["#ffd23f","#e0a316","#ffd23f","#e0a316","#ffd23f","#e0a316","#7d879c"]],
    powerup: {
        "type": "destroyer",
        "tier": 3,
        "intro": "Grates away every other row below it: the 1st, 3rd and 5th rows underneath vanish wall to wall, and the rows close up. Mind your knuckles.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            ".",
            ".",
            "-",
            ".",
            "-",
            ".",
            "-"
          ]
        },
        "collapse": true,
        "help": 5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "shuriken",
    name: "a ninja's throwing star",
    grid: [
        "X"
      ],
    color: [["#9ea2a9","#babec6","#3e4860","#3e4860","#3e4860","#babec6","#9ea2a9"],["#babec6","#8b95aa","#e8eef8","#4e5a78","#e8eef8","#8b95aa","#babec6"],["#3e4860","#e8eef8","#8b95aa","#e8eef8","#8b95aa","#e8eef8","#3e4860"],["#3e4860","#4e5a78","#e8eef8","#2e3650","#e8eef8","#4e5a78","#3e4860"],["#3e4860","#e8eef8","#8b95aa","#e8eef8","#8b95aa","#e8eef8","#3e4860"],["#babec6","#8b95aa","#e8eef8","#4e5a78","#e8eef8","#8b95aa","#babec6"],["#9ea2a9","#babec6","#3e4860","#3e4860","#3e4860","#babec6","#9ea2a9"]],
    powerup: {
        "type": "destroyer",
        "tier": 1,
        "intro": "Slices along both diagonals in an X, destroying every block up to four cells out along each diagonal. You did not see it coming. That is sort of the point of ninjas.",
        "area": {
          "origin": [
            4,
            4
          ],
          "grid": [
            "#.......#",
            ".#.....#.",
            "..#...#..",
            "...#.#...",
            ".........",
            "...#.#...",
            "..#...#..",
            ".#.....#.",
            "#.......#"
          ]
        },
        "help": 1
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "rotten_lemon",
    name: "a lemon that has gone off",
    grid: [
        "X"
      ],
    color: [["#262b44","#262b44","#262b44","#262b44","#262b44","#3e8948","#63c74d"],["#262b44","#262b44","#fee761","#fee761","#fee761","#3e8948","#262b44"],["#262b44","#fee761","#fff6b0","#fee761","#a8c060","#a8c060","#262b44"],["#fee761","#3e2731","#fee761","#6f8a3a","#3e2731","#fee761","#e8b830"],["#fee761","#fee761","#a8c060","#fee761","#fee761","#fee761","#e8b830"],["#262b44","#6f8a3a","#3e2731","#3e2731","#3e2731","#e8b830","#262b44"],["#b6ff3a","#262b44","#e8b830","#e8b830","#e8b830","#262b44","#262b44"]],
    powerup: {
        "type": "acid",
        "reach": 1,
        "tier": 1,
        "intro": "Dissolves the blocks right next to it, and squirts three cells to each side along its row. Straight in the eye, every time.",
        "area": {
          "origin": [
            3,
            0
          ],
          "grid": [
            "###.###"
          ]
        },
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "alien_blood",
    name: "a drop of alien blood",
    grid: [
        "X"
      ],
    color: [["#72951e","#90bb25","#90bb25","#c7c7c7","#90bb25","#90bb25","#72951e"],["#90bb25","#b8f030","#e8ff8a","#ffffff","#e8ff8a","#b8f030","#90bb25"],["#90bb25","#e8ff8a","#ffffff","#b8f030","#b8f030","#dfff9a","#90bb25"],["#90bb25","#e8ff8a","#b8f030","#b8f030","#b8f030","#80b818","#90bb25"],["#90bb25","#b8f030","#b8f030","#b8f030","#b8f030","#b8f030","#649013"],["#90bb25","#80b818","#b8f030","#b8f030","#b8f030","#80b818","#649013"],["#72951e","#90bb25","#649013","#649013","#90bb25","#90bb25","#72951e"]],
    powerup: {
        "type": "acid",
        "reach": 1,
        "tier": 2,
        "intro": "Dissolves the blocks next to it, then eats straight down through the seven cells underneath it. It's not personal, it's just very acidic.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            ".",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#"
          ]
        },
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "stomach",
    name: "a stomach (with acid in)",
    grid: [
        "X..",
        "XXX"
      ],
    color: [["#262b44","#7a1f3d","#f0a0b8","#e0708f","#7a1f3d","#262b44","","","","","","","","","","","",""],["#262b44","#7a1f3d","#f0a0b8","#e0708f","#7a1f3d","#262b44","","","","","","","","","","","",""],["#262b44","#7a1f3d","#f0a0b8","#e0708f","#7a1f3d","#262b44","","","","","","","","","","","",""],["#262b44","#7a1f3d","#f0a0b8","#e0708f","#7a1f3d","#262b44","","","","","","","","","","","",""],["#7a1f3d","#f0a0b8","#f0a0b8","#e0708f","#e0708f","#7a1f3d","","","","","","","","","","","",""],["#7a1f3d","#f0a0b8","#f0a0b8","#f0a0b8","#e0708f","#e0708f","","","","","","","","","","","",""],["#7a1f3d","#f0a0b8","#ffd8e4","#f0a0b8","#f0a0b8","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#7a1f3d","#262b44"],["#7a1f3d","#f0a0b8","#ffd8e4","#3e2731","#f0a0b8","#e0708f","#e0708f","#e0708f","#3e2731","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#7a1f3d"],["#7a1f3d","#f0a0b8","#e0708f","#e0708f","#3e2731","#3e2731","#3e2731","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#e0708f","#7a1f3d"],["#7a1f3d","#e0708f","#9ae83a","#c8ff6a","#9ae83a","#9ae83a","#9ae83a","#c8ff6a","#9ae83a","#9ae83a","#9ae83a","#f4ffd0","#9ae83a","#9ae83a","#9ae83a","#e0708f","#e0708f","#7a1f3d"],["#262b44","#7a1f3d","#9ae83a","#f4ffd0","#9ae83a","#c8ff6a","#9ae83a","#9ae83a","#5aa020","#9ae83a","#9ae83a","#9ae83a","#c8ff6a","#9ae83a","#9ae83a","#9ae83a","#7a1f3d","#262b44"],["#262b44","#262b44","#7a1f3d","#7a1f3d","#7a1f3d","#7a1f3d","#7a1f3d","#7a1f3d","#7a1f3d","#7a1f3d","#7a1f3d","#7a1f3d","#7a1f3d","#7a1f3d","#7a1f3d","#7a1f3d","#262b44","#262b44"]],
    powerup: {
        "type": "acid",
        "reach": 2,
        "tier": 2,
        "intro": "Digests every block within two steps of it, all the way round its bend. It has been empty since lunch and it is not happy about it.",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "vinegar_bottle",
    name: "a bottle of very strong vinegar",
    grid: [
        "X",
        "X",
        "X"
      ],
    color: [["#262b44","#262b44","#e43b44","#e43b44","#262b44","#262b44"],["#262b44","#a22633","#e43b44","#e43b44","#a22633","#262b44"],["#262b44","#262b44","#c0cbdc","#c0cbdc","#262b44","#262b44"],["#262b44","#262b44","#c0cbdc","#e4a672","#262b44","#262b44"],["#262b44","#c0cbdc","#b86f50","#e4a672","#b86f50","#262b44"],["#c0cbdc","#b86f50","#b86f50","#b86f50","#b86f50","#c0cbdc"],["#c0cbdc","#b86f50","#e4a672","#b86f50","#b86f50","#c0cbdc"],["#c0cbdc","#ffffff","#ffffff","#ffffff","#ffffff","#c0cbdc"],["#c0cbdc","#262b44","#ffffff","#ffffff","#262b44","#c0cbdc"],["#c0cbdc","#ffffff","#262b44","#262b44","#ffffff","#c0cbdc"],["#c0cbdc","#ffffff","#ffffff","#ffffff","#ffffff","#c0cbdc"],["#c0cbdc","#b86f50","#b86f50","#b86f50","#b86f50","#c0cbdc"],["#c0cbdc","#b86f50","#e4a672","#b86f50","#b86f50","#c0cbdc"],["#c0cbdc","#b86f50","#e4a672","#b86f50","#8a4a30","#c0cbdc"],["#c0cbdc","#b86f50","#b86f50","#b86f50","#b86f50","#c0cbdc"],["#c0cbdc","#b86f50","#b86f50","#b86f50","#8a4a30","#c0cbdc"],["#c0cbdc","#8a4a30","#8a4a30","#8a4a30","#8a4a30","#c0cbdc"],["#262b44","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#262b44"]],
    powerup: {
        "type": "acid",
        "reach": 2,
        "tier": 2,
        "intro": "Dissolves every block within two steps of the bottle, top to bottom. Great on chips, terrible on everything else.",
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "acid_vat",
    name: "a vat of hydro-something acid",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#2a5d31","#4f9f3e","#92cc2e","#bfcca0","#4f9f3e","#326e3a","#4f9f3e","#92cc2e","#4f9f3e","#bfcca0","#4f9f3e","#2a5d31"],["#4f9f3e","#b6ff3a","#63c74d","#3e8948","#63c74d","#b6ff3a","#b6ff3a","#63c74d","#3e8948","#63c74d","#b6ff3a","#4f9f3e"],["#92cc2e","#63c74d","#b6ff3a","#b6ff3a","#63c74d","#b6ff3a","#63c74d","#b6ff3a","#b6ff3a","#63c74d","#b6ff3a","#92cc2e"],["#686f8e","#3e4870","#63c74d","#3e4870","#3e4870","#3e4870","#3e4870","#3e4870","#3e4870","#63c74d","#3e4870","#686f8e"],["#cb8b2a","#feae34","#63c74d","#fee761","#fee761","#f4f4f4","#fee761","#fee761","#f4f4f4","#63c74d","#feae34","#a16618"],["#cb8b2a","#fee761","#63c74d","#f4f4f4","#3e4870","#f4f4f4","#f4f4f4","#3e4870","#f4f4f4","#63c74d","#feae34","#a16618"],["#cb8b2a","#fee761","#fee761","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#f4f4f4","#fee761","#fee761","#a16618"],["#cb8b2a","#fee761","#fee761","#fee761","#f4f4f4","#3e4870","#3e4870","#f4f4f4","#fee761","#fee761","#feae34","#a16618"],["#686f8e","#3e4870","#3e4870","#3e4870","#3e4870","#3e4870","#3e4870","#3e4870","#3e4870","#63c74d","#3e4870","#686f8e"],["#cb8b2a","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#63c74d","#feae34","#a16618"],["#cb8b2a","#feae34","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#63c74d","#c97f1e","#a16618"],["#787f99","#686f8e","#686f8e","#686f8e","#686f8e","#686f8e","#686f8e","#686f8e","#686f8e","#92cc2e","#686f8e","#787f99"]],
    powerup: {
        "type": "acid",
        "reach": 1,
        "tier": 2,
        "intro": "Dissolves every block touching the vat, and it leaks: the 2x3 patch underneath goes too. The label just says \"HYDRO\" and then a skull.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "..",
            "..",
            "##",
            "##",
            "##"
          ]
        },
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.5,
  },
  {
    id: "champagne",
    name: "a shaken bottle of champagne",
    grid: [
        "XX"
      ],
    color: [["#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#c8f4ff","#262b44"],["#262b44","#1e4d2b","#1e4d2b","#1e4d2b","#1e4d2b","#1e4d2b","#1e4d2b","#262b44","#262b44","#262b44","#262b44","#c8f4ff","#262b44","#ffffff"],["#1e4d2b","#3e8948","#7ad08a","#7ad08a","#7ad08a","#7ad08a","#3e8948","#3e8948","#1e4d2b","#fee761","#fee761","#b86f50","#e4a672","#c8f4ff"],["#1e4d2b","#ead4aa","#ead4aa","#ead4aa","#e43b44","#ead4aa","#1e4d2b","#1e4d2b","#1e4d2b","#fee761","#c9a030","#b86f50","#e4a672","#ffffff"],["#1e4d2b","#3e8948","#3e8948","#3e8948","#3e8948","#3e8948","#1e4d2b","#1e4d2b","#1e4d2b","#c9a030","#c9a030","#b86f50","#e4a672","#c8f4ff"],["#262b44","#1e4d2b","#1e4d2b","#1e4d2b","#1e4d2b","#1e4d2b","#1e4d2b","#262b44","#262b44","#262b44","#262b44","#262b44","#c8f4ff","#262b44"],["#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#c8f4ff","#262b44","#262b44"]],
    powerup: {
        "type": "blast",
        "push": 5,
        "tier": 2,
        "intro": "Pops! Every block in its row and the row below, wall to wall, sprays up into the air and lands wherever it comes down. Congratulations on whatever this is.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "-",
            "-"
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "jack_in_the_box",
    name: "a jack-in-the-box",
    grid: [
        "X",
        "X"
      ],
    color: [["#262b44","#e43b44","#262b44","#262b44","#262b44","#e43b44","#262b44"],["#262b44","#262b44","#e43b44","#fee761","#e43b44","#262b44","#262b44"],["#262b44","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#262b44"],["#262b44","#ffffff","#181425","#ffffff","#181425","#ffffff","#262b44"],["#ff8a90","#ffffff","#ffffff","#e43b44","#ffffff","#ffffff","#ff8a90"],["#262b44","#ffffff","#181425","#181425","#181425","#ffffff","#262b44"],["#262b44","#262b44","#ffffff","#ffffff","#ffffff","#262b44","#262b44"],["#262b44","#262b44","#c0cbdc","#8b9bb4","#c0cbdc","#262b44","#262b44"],["#feae34","#fee761","#fee761","#fee761","#fee761","#fee761","#feae34"],["#fee761","#e43b44","#e43b44","#fee761","#0099db","#0099db","#fee761"],["#fee761","#e43b44","#e43b44","#fee761","#0099db","#0099db","#fee761"],["#fee761","#63c74d","#63c74d","#fee761","#124e89","#124e89","#fee761"],["#fee761","#63c74d","#63c74d","#fee761","#124e89","#124e89","#fee761"],["#feae34","#feae34","#feae34","#feae34","#feae34","#feae34","#feae34"]],
    powerup: {
        "type": "blast",
        "push": 5,
        "tier": 3,
        "intro": "Boing! Every block in its three columns, top to bottom, gets flung up and out and lands where it falls. Nobody has ever been happy to see him.",
        "area": {
          "origin": [
            1,
            0
          ],
          "grid": [
            "|||"
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "popped_balloon",
    name: "a balloon that just popped",
    grid: [
        "X"
      ],
    color: [["#262b44","#262b44","#e43b44","#e43b44","#262b44","#ffffff","#262b44"],["#262b44","#e43b44","#ff8a90","#e43b44","#fee761","#ffffff","#fee761"],["#e43b44","#ff8a90","#e43b44","#e43b44","#ffffff","#fee761","#ffffff"],["#e43b44","#e43b44","#e43b44","#e43b44","#262b44","#ffffff","#262b44"],["#262b44","#e43b44","#e43b44","#a22633","#262b44","#262b44","#262b44"],["#262b44","#262b44","#a22633","#262b44","#262b44","#262b44","#262b44"],["#262b44","#262b44","#c0cbdc","#262b44","#262b44","#262b44","#262b44"]],
    powerup: {
        "type": "blast",
        "push": 6,
        "tier": 1,
        "intro": "BANG. A big circle of blocks around it jumps into the air and lands wherever it comes down. Small balloon, but everyone jumped.",
        "area": {
          "origin": [
            3,
            3
          ],
          "grid": [
            ".#####.",
            "#######",
            "#######",
            "#######",
            "#######",
            "#######",
            ".#####."
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "volcano",
    name: "a small volcano",
    grid: [
        ".X.",
        "XXX"
      ],
    color: [["","","","","","","#262b44","#9a9aaa","#fee761","#262b44","#f77622","#262b44","","","","","",""],["","","","","","","#9a9aaa","#fee761","#f77622","#fee761","#e43b44","#9a9aaa","","","","","",""],["","","","","","","#262b44","#e43b44","#f77622","#fee761","#e43b44","#262b44","","","","","",""],["","","","","","","#262b44","#3e2731","#e43b44","#f77622","#3e2731","#262b44","","","","","",""],["","","","","","","#3e2731","#8a5a3a","#e43b44","#f77622","#5d3a2a","#3e2731","","","","","",""],["","","","","","","#8a5a3a","#5d3a2a","#e43b44","#5d3a2a","#5d3a2a","#3e2731","","","","","",""],["#262b44","#262b44","#262b44","#262b44","#262b44","#8a5a3a","#5d3a2a","#5d3a2a","#f77622","#5d3a2a","#5d3a2a","#5d3a2a","#3e2731","#262b44","#262b44","#262b44","#262b44","#262b44"],["#262b44","#262b44","#262b44","#262b44","#8a5a3a","#5d3a2a","#5d3a2a","#e43b44","#f77622","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#3e2731","#262b44","#262b44","#262b44","#262b44"],["#262b44","#262b44","#262b44","#8a5a3a","#5d3a2a","#8a5a3a","#5d3a2a","#5d3a2a","#e43b44","#5d3a2a","#5d3a2a","#5d3a2a","#3e2731","#5d3a2a","#3e2731","#262b44","#262b44","#262b44"],["#262b44","#262b44","#8a5a3a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#f77622","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#3e2731","#262b44","#262b44"],["#262b44","#8a5a3a","#5d3a2a","#8a5a3a","#5d3a2a","#5d3a2a","#5d3a2a","#e43b44","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#3e2731","#5d3a2a","#5d3a2a","#3e2731","#262b44"],["#8a5a3a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#5d3a2a","#3e2731"]],
    powerup: {
        "type": "blast",
        "push": 7,
        "tier": 3,
        "intro": "Erupts on landing: a huge patch of blocks around and below it is hurled high into the air and rains down wherever it lands. It's been dormant for ages. Ages.",
        "area": {
          "origin": [
            4,
            1
          ],
          "grid": [
            "..#######..",
            "###########",
            "###########",
            "###########",
            "###########",
            "###########",
            ".#########."
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.5,
  },
  {
    id: "mentos_cola",
    name: "a cola with a mint in it",
    grid: [
        "X",
        "X"
      ],
    color: [["#262b44","#c8f4ff","#262b44","#ffffff","#262b44","#c8f4ff","#262b44"],["#262b44","#c8f4ff","#ffffff","#e8e8e8","#ffffff","#c8f4ff","#262b44"],["#262b44","#262b44","#ffffff","#e8e8e8","#ffffff","#262b44","#262b44"],["#262b44","#262b44","#c0cbdc","#c8f4ff","#c0cbdc","#262b44","#262b44"],["#262b44","#262b44","#c0cbdc","#5a2a10","#c0cbdc","#262b44","#262b44"],["#262b44","#c0cbdc","#5a2a10","#8a4a20","#5a2a10","#c0cbdc","#262b44"],["#c0cbdc","#5a2a10","#5a2a10","#8a4a20","#5a2a10","#5a2a10","#c0cbdc"],["#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44"],["#e43b44","#ffffff","#ffffff","#e43b44","#ffffff","#ffffff","#e43b44"],["#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44"],["#c0cbdc","#5a2a10","#5a2a10","#8a4a20","#5a2a10","#5a2a10","#c0cbdc"],["#c0cbdc","#5a2a10","#8a4a20","#5a2a10","#5a2a10","#5a2a10","#c0cbdc"],["#c0cbdc","#5a2a10","#5a2a10","#5a2a10","#3a1808","#3a1808","#c0cbdc"],["#262b44","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#262b44"]],
    powerup: {
        "type": "blast",
        "push": 6,
        "tier": 2,
        "intro": "Blasts mostly downwards: the deep chunk of blocks under it erupts up and out, and lands wherever it falls. You've seen the videos.",
        "area": {
          "origin": [
            3,
            0
          ],
          "grid": [
            ".#####.",
            "#######",
            "#######",
            "#######",
            "#######",
            "#######",
            "#######",
            ".#####."
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
  },
  {
    id: "fondue",
    name: "a wheel of very melted cheese",
    grid: [
        "XX"
      ],
    color: [["#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#c0cbdc","#262b44","#262b44","#262b44","#262b44"],["#262b44","#262b44","#fff6b0","#fff6b0","#fff6b0","#fff6b0","#fff6b0","#fff6b0","#fff6b0","#c0cbdc","#fff6b0","#fff6b0","#262b44","#262b44"],["#262b44","#fff6b0","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#c0cbdc","#fee761","#fee761","#fff6b0","#262b44"],["#c97f1e","#feae34","#feae34","#feae34","#feae34","#feae34","#feae34","#feae34","#feae34","#feae34","#feae34","#feae34","#feae34","#c97f1e"],["#c97f1e","#fee761","#fee761","#c97f1e","#fee761","#fee761","#fee761","#fee761","#fee761","#c97f1e","#fee761","#fee761","#fee761","#c97f1e"],["#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#c97f1e","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761"],["#fee761","#262b44","#fee761","#fee761","#feae34","#262b44","#fee761","#fee761","#fee761","#262b44","#fee761","#fee761","#262b44","#fee761"]],
    powerup: {
        "type": "goo",
        "tier": 2,
        "volume": 2.5,
        "intro": "Melts when it lands and oozes into the lowest gaps, filling five cells (more than it looks). Bring a long fork.",
        "fill": [
          [
            "#fee761",
            "#fee761",
            "#fee761",
            "#fff6b0",
            "#fee761",
            "#fee761",
            "#fee761"
          ],
          [
            "#fee761",
            "#feae34",
            "#fee761",
            "#fee761",
            "#fee761",
            "#c97f1e",
            "#fee761"
          ],
          [
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761",
            "#feae34",
            "#fee761",
            "#fee761"
          ],
          [
            "#fff6b0",
            "#fee761",
            "#c97f1e",
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761"
          ],
          [
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761",
            "#fee761",
            "#feae34",
            "#fff6b0"
          ],
          [
            "#fee761",
            "#feae34",
            "#fee761",
            "#fee761",
            "#c97f1e",
            "#fee761",
            "#fee761"
          ],
          [
            "#fee761",
            "#fee761",
            "#fee761",
            "#feae34",
            "#fee761",
            "#fee761",
            "#fee761"
          ]
        ],
        "help": 3.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.7,
  },
  {
    id: "lava_blob",
    name: "a blob of lava",
    grid: [
        "X"
      ],
    color: [["#262b44","#262b44","#262b44","#fee761","#f77622","#262b44","#262b44"],["#262b44","#262b44","#f77622","#f77622","#f77622","#f77622","#262b44"],["#262b44","#f77622","#fee761","#f77622","#f77622","#f77622","#e43b44"],["#f77622","#181425","#fff6b0","#f77622","#181425","#fff6b0","#e43b44"],["#f77622","#f77622","#f77622","#f77622","#f77622","#e43b44","#a22633"],["#e43b44","#e43b44","#3e2731","#3e2731","#e43b44","#e43b44","#a22633"],["#a22633","#e43b44","#a22633","#a22633","#e43b44","#a22633","#a22633"]],
    powerup: {
        "type": "goo",
        "tier": 2,
        "volume": 4,
        "intro": "One small blob, four cells of lava: it pours into the lowest gaps it can reach and sets there. Do not pat it.",
        "fill": [
          [
            "#f77622",
            "#f77622",
            "#e43b44",
            "#e43b44",
            "#a22633",
            "#e43b44",
            "#f77622"
          ],
          [
            "#f77622",
            "#fee761",
            "#f77622",
            "#e43b44",
            "#e43b44",
            "#f77622",
            "#f77622"
          ],
          [
            "#e43b44",
            "#f77622",
            "#f77622",
            "#f77622",
            "#fee761",
            "#f77622",
            "#e43b44"
          ],
          [
            "#e43b44",
            "#e43b44",
            "#f77622",
            "#f77622",
            "#f77622",
            "#e43b44",
            "#a22633"
          ],
          [
            "#a22633",
            "#e43b44",
            "#f77622",
            "#fee761",
            "#f77622",
            "#e43b44",
            "#e43b44"
          ],
          [
            "#f77622",
            "#f77622",
            "#e43b44",
            "#f77622",
            "#f77622",
            "#e43b44",
            "#fee761"
          ],
          [
            "#e43b44",
            "#a22633",
            "#e43b44",
            "#f77622",
            "#f77622",
            "#f77622",
            "#f77622"
          ]
        ],
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.7,
  },
  {
    id: "hair_gel",
    name: "a tub of hair gel",
    grid: [
        "X"
      ],
    color: [["#262b44","#262b44","#e8ffff","#262b44","#262b44","#262b44","#262b44"],["#262b44","#e8ffff","#2ce8f5","#2ce8f5","#2ce8f5","#262b44","#262b44"],["#e8ffff","#2ce8f5","#73eff7","#2ce8f5","#2ce8f5","#2ce8f5","#262b44"],["#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89"],["#0099db","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#124e89"],["#0099db","#ffffff","#fee761","#fee761","#262b44","#ffffff","#124e89"],["#262b44","#124e89","#124e89","#124e89","#124e89","#124e89","#262b44"]],
    powerup: {
        "type": "goo",
        "tier": 1,
        "volume": 2,
        "intro": "Melts into the lowest gaps and fills two cells. Extra hold: whatever it lands on is now a sculpture.",
        "fill": [
          [
            "#2ce8f5",
            "#2ce8f5",
            "#73eff7",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5"
          ],
          [
            "#2ce8f5",
            "#73eff7",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#e8ffff"
          ],
          [
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#73eff7",
            "#2ce8f5",
            "#2ce8f5"
          ],
          [
            "#e8ffff",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#73eff7"
          ],
          [
            "#2ce8f5",
            "#2ce8f5",
            "#73eff7",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5"
          ],
          [
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#e8ffff",
            "#2ce8f5",
            "#2ce8f5"
          ],
          [
            "#73eff7",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#2ce8f5",
            "#73eff7",
            "#2ce8f5"
          ]
        ],
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "grumblesac_given_up",
    name: "a grumblesac that has given up",
    grid: [
        "XX",
        "X."
      ],
    color: [["#984c61","#b35a72","#b35a72","#b35a72","#b35a72","#b35a72","#b35a72","#b35a72","#b35a72","#b35a72","#b35a72","#b35a72","#b35a72","#ad8892"],["#b35a72","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ffc8d6","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#b35a72"],["#b35a72","#ff9fb5","#ff9fb5","#ffc8d6","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#9a3aa8","#ff9fb5","#ff9fb5","#b35a72"],["#b35a72","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#b35a72"],["#cc7f91","#e0708f","#e0708f","#e0708f","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#e0708f","#e0708f","#e0708f","#ff9fb5","#ff9fb5","#b35a72"],["#cc7f91","#3a0e1e","#3a0e1e","#3a0e1e","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#3a0e1e","#3a0e1e","#3a0e1e","#ff9fb5","#ff9fb5","#b35a72"],["#cc7f91","#ff9fb5","#ff9fb5","#ff9fb5","#a8325a","#a8325a","#972d51","#862848","#862848","#cc7f91","#cc7f91","#cc7f91","#b35a72","#984c61"],["#b35a72","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#b35a72","","","","","","",""],["#b35a72","#ff9fb5","#9a3aa8","#ff9fb5","#ff9fb5","#ff9fb5","#b35a72","","","","","","",""],["#b35a72","#ff9fb5","#ff9fb5","#ff9fb5","#ff9fb5","#e0708f","#cc7f91","","","","","","",""],["#b35a72","#ff9fb5","#ff9fb5","#e0708f","#ff9fb5","#ff9fb5","#cc7f91","","","","","","",""],["#cc7f91","#ff9fb5","#8fd8ff","#ff9fb5","#ff9fb5","#ff9fb5","#b35a72","","","","","","",""],["#cc7f91","#e0708f","#ff9fb5","#ff9fb5","#9a3aa8","#ff9fb5","#cc7f91","","","","","","",""],["#984c61","#b35a72","#b35a72","#7b2e86","#b35a72","#b35a72","#984c61","","","","","","",""]],
    powerup: {
        "type": "goo",
        "tier": 1,
        "volume": 1,
        "intro": "It has stopped grumbling. It just slumps down into the lowest gaps, three cells' worth, and lies there. Let it be.",
        "fill": [
          [
            "#ff9fb5",
            "#ff9fb5",
            "#e0708f",
            "#ff9fb5",
            "#ff9fb5",
            "#ffc8d6",
            "#ff9fb5"
          ],
          [
            "#ff9fb5",
            "#e0708f",
            "#ff9fb5",
            "#ff9fb5",
            "#ff9fb5",
            "#ff9fb5",
            "#ff9fb5"
          ],
          [
            "#ff9fb5",
            "#ff9fb5",
            "#ff9fb5",
            "#ff9fb5",
            "#9a3aa8",
            "#ff9fb5",
            "#e0708f"
          ],
          [
            "#ffc8d6",
            "#ff9fb5",
            "#ff9fb5",
            "#e0708f",
            "#ff9fb5",
            "#ff9fb5",
            "#ff9fb5"
          ],
          [
            "#ff9fb5",
            "#ff9fb5",
            "#ff9fb5",
            "#ff9fb5",
            "#ff9fb5",
            "#e0708f",
            "#ff9fb5"
          ],
          [
            "#ff9fb5",
            "#9a3aa8",
            "#ff9fb5",
            "#ff9fb5",
            "#ff9fb5",
            "#ff9fb5",
            "#ffc8d6"
          ],
          [
            "#e0708f",
            "#ff9fb5",
            "#ff9fb5",
            "#ff9fb5",
            "#e0708f",
            "#ff9fb5",
            "#ff9fb5"
          ]
        ],
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "schlopwort_drain",
    name: "a schlopwort, going home",
    grid: [
        "XX.",
        ".XX"
      ],
    color: [["#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","","","","","",""],["#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","","","","","",""],["#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","","","","","",""],["#3a2a40","#c9c23c","#c9c23c","#f5f0a0","#f5f0a0","#f5f0a0","#f5f0a0","#c9c23c","#c9c23c","#3a2a40","#3a2a40","#3a2a40","","","","","",""],["#c9c23c","#f5f0a0","#f5f0a0","#5f5410","#f5f0a0","#5f5410","#f5f0a0","#f5f0a0","#c9c23c","#c9c23c","#3a2a40","#3a2a40","","","","","",""],["#f5f0a0","#c9c23c","#c9c23c","#c9c23c","#f5f0a0","#c9c23c","#c9c23c","#c9c23c","#c9c23c","#c9c23c","#c9c23c","#3a2a40","","","","","",""],["","","","","","","#3a2a40","#c9c23c","#c9c23c","#c9c23c","#c9c23c","#c9c23c","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#3a2a40"],["","","","","","","#c9c23c","#c9c23c","#f5f0a0","#c9c23c","#c9c23c","#c9c23c","#c0cbdc","#181425","#c0cbdc","#181425","#c0cbdc","#3a2a40"],["","","","","","","#3a2a40","#f5f0a0","#c9c23c","#c9c23c","#c9c23c","#c9c23c","#c0cbdc","#181425","#c0cbdc","#181425","#c0cbdc","#3a2a40"],["","","","","","","#3a2a40","#3a2a40","#c9c23c","#c9c23c","#c9c23c","#5a6988","#c0cbdc","#181425","#c0cbdc","#181425","#c0cbdc","#3a2a40"],["","","","","","","#3a2a40","#3a2a40","#3a2a40","#c9c23c","#c9c23c","#c9c23c","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#3a2a40"],["","","","","","","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#3a2a40","#c9c23c","#5a6988","#5a6988","#5a6988","#3a2a40","#3a2a40"]],
    powerup: {
        "type": "goo",
        "tier": 2,
        "volume": 1.5,
        "intro": "Schlops down into the lowest gaps it can find and fills six of them. It was looking for the plughole, but this will do.",
        "fill": [
          [
            "#c9c23c",
            "#c9c23c",
            "#f5f0a0",
            "#c9c23c",
            "#c9c23c",
            "#c9c23c",
            "#c9c23c"
          ],
          [
            "#c9c23c",
            "#c9c23c",
            "#c9c23c",
            "#c9c23c",
            "#c9c23c",
            "#7f7a1a",
            "#c9c23c"
          ],
          [
            "#f5f0a0",
            "#c9c23c",
            "#c9c23c",
            "#c9c23c",
            "#f5f0a0",
            "#c9c23c",
            "#c9c23c"
          ],
          [
            "#c9c23c",
            "#c9c23c",
            "#7f7a1a",
            "#c9c23c",
            "#c9c23c",
            "#c9c23c",
            "#c9c23c"
          ],
          [
            "#c9c23c",
            "#c9c23c",
            "#c9c23c",
            "#c9c23c",
            "#c9c23c",
            "#f5f0a0",
            "#c9c23c"
          ],
          [
            "#c9c23c",
            "#f5f0a0",
            "#c9c23c",
            "#c9c23c",
            "#c9c23c",
            "#7f7a1a",
            "#c9c23c"
          ],
          [
            "#c9c23c",
            "#c9c23c",
            "#c9c23c",
            "#c9c23c",
            "#f5f0a0",
            "#c9c23c",
            "#c9c23c"
          ]
        ],
        "help": 3.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.7,
  },
  {
    id: "will_o_wisp",
    name: "a will-o'-the-wisp",
    grid: [
        "X"
      ],
    color: [["#137b9e","#25c3ce","#168db5","#86ccd6","#168db5","#25c3ce","#137b9e"],["#25c3ce","#9ff3ff","#2ce8f5","#9ff3ff","#2ce8f5","#9ff3ff","#25c3ce"],["#25c3ce","#9ff3ff","#9ff3ff","#ffffff","#9ff3ff","#9ff3ff","#25c3ce"],["#25c3ce","#9ff3ff","#2a4a8a","#ffffff","#2a4a8a","#9ff3ff","#25c3ce"],["#25c3ce","#9ff3ff","#ffffff","#ffffff","#ffffff","#9ff3ff","#25c3ce"],["#25c3ce","#2ce8f5","#9ff3ff","#9ff3ff","#9ff3ff","#2ce8f5","#25c3ce"],["#137b9e","#25c3ce","#168db5","#25c3ce","#168db5","#25c3ce","#137b9e"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Drifts straight down through your blocks into the deepest gap it fits, and stays there glowing. Do not follow it into the swamp.",
        "help": 2
      },
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "quantum_electron",
    name: "a quantum tunnelling electron",
    grid: [
        "X"
      ],
    color: [["#5286d9","#4f93ff","#4372d0","#4f93ff","#4372d0","#4f93ff","#5286d9"],["#4f93ff","#8fd8ff","#3a7cff","#3a7cff","#3a7cff","#8fd8ff","#4f93ff"],["#4372d0","#3a7cff","#8fd8ff","#8fd8ff","#8fd8ff","#3a7cff","#4372d0"],["#4f93ff","#8fd8ff","#ffffff","#ffffff","#ffffff","#8fd8ff","#4f93ff"],["#4372d0","#3a7cff","#8fd8ff","#8fd8ff","#8fd8ff","#3a7cff","#4372d0"],["#4f93ff","#8fd8ff","#3a7cff","#3a7cff","#3a7cff","#8fd8ff","#4f93ff"],["#5286d9","#4f93ff","#4372d0","#4f93ff","#4372d0","#4f93ff","#5286d9"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Tunnels straight through your blocks and turns up in the deepest gap it fits. Physicists hate it. It's very negative about the whole thing.",
        "help": 2
      },
    rotation: {
        "mode": "any"
      },
    frequency: 1,
  },
  {
    id: "ghost_pepper",
    name: "a ghost pepper",
    grid: [
        "X",
        "X"
      ],
    color: [["#2d593c","#4c865e","#346645","#86bc94","#346645","#4c865e","#2d593c"],["#4c865e","#5aa070","#5aa070","#5aa070","#5aa070","#5aa070","#4c865e"],["#346645","#5aa070","#3e7a52","#5aa070","#3e7a52","#5aa070","#346645"],["#c35e72","#ffb0b8","#ffb0b8","#ffb0b8","#ffb0b8","#ffb0b8","#c35e72"],["#d6949b","#ffe0e4","#ffb0b8","#ffb0b8","#ffb0b8","#ffb0b8","#c35e72"],["#d6949b","#ffe0e4","#6a2a40","#ffb0b8","#6a2a40","#ffb0b8","#c35e72"],["#d6949b","#ffe0e4","#6a2a40","#ffb0b8","#6a2a40","#ffb0b8","#c35e72"],["#d6949b","#ffe0e4","#ffb0b8","#ffb0b8","#ffb0b8","#ffb0b8","#c35e72"],["#d6949b","#ffb0b8","#ffe0e4","#a03050","#ffb0b8","#ffb0b8","#c35e72"],["#d6949b","#ffe0e4","#ffb0b8","#ffb0b8","#ffb0b8","#ffb0b8","#c35e72"],["#d6949b","#ffb0b8","#ffe0e4","#ffb0b8","#ffb0b8","#ffb0b8","#c35e72"],["#d6949b","#ffb0b8","#ffb0b8","#ffb0b8","#e87088","#ffb0b8","#c35e72"],["#c35e72","#ffb0b8","#ffb0b8","#ffb0b8","#ffb0b8","#e87088","#c35e72"],["#aa5263","#c35e72","#d6949b","#d6949b","#d6949b","#c35e72","#aa5263"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "So hot it went straight through the stack. It falls through blocks into the deepest gap it fits and stays there, still burning.",
        "help": 2.5
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "poltergeist_teacup",
    name: "a poltergeist's teacup",
    grid: [
        "XX"
      ],
    color: [["#7b84a4","#a88065","#a88065","#a88065","#a88065","#a88065","#a88065","#a88065","#a88065","#6674af","#9ba6cb","#9ba6cb","#9ba6cb","#8691b1"],["#cdcfd6","#c89878","#c89878","#a87050","#c89878","#c89878","#a87050","#c89878","#c89878","#f4f6ff","#7a8ad0","#7a8ad0","#7a8ad0","#9ba6cb"],["#cdcfd6","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#7a8ad0","#b8c6f2","#7a8ad0","#9ba6cb"],["#cdcfd6","#ff8ab8","#f4f6ff","#ff8ab8","#f4f6ff","#ff8ab8","#f4f6ff","#ff8ab8","#f4f6ff","#f4f6ff","#7a8ad0","#b8c6f2","#7a8ad0","#9ba6cb"],["#8d97bc","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#a8b4e0","#7a8ad0","#7a8ad0","#7a8ad0","#9ba6cb"],["#9ba6cb","#a8b4e0","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#f4f6ff","#a8b4e0","#b8c6f2","#b8c6f2","#b8c6f2","#b8c6f2","#9ba6cb"],["#bababa","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#d6d6d6","#7b84a4"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Floats down through the blocks and settles into the deepest gap it fits. The tea is still hot. Nobody poured it.",
        "help": 3
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "bar_of_soap",
    name: "a wet bar of soap",
    grid: [
        "XX"
      ],
    color: [["#b2b5ba","#a8cdd6","#cdd0d6","#d6bfca","#d6bfca","#d6bfca","#d6bfca","#cdd0d6","#a8cdd6","#d6bfca","#d6bfca","#cdd0d6","#a8cdd6","#b2b5ba"],["#d685a5","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#ffe3f0","#ff9ec4","#bc5e86"],["#d685a5","#ffe3f0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#ffe3f0","#bc5e86"],["#d685a5","#ffe3f0","#e070a0","#ff9ec4","#ff9ec4","#ffe3f0","#ff9ec4","#ff9ec4","#ffe3f0","#ff9ec4","#ff9ec4","#e070a0","#ff9ec4","#bc5e86"],["#d685a5","#ffe3f0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#e070a0","#ff9ec4","#bc5e86"],["#d685a5","#ff9ec4","#ff9ec4","#ff9ec4","#ff9ec4","#ff9ec4","#ff9ec4","#ff9ec4","#ff9ec4","#ff9ec4","#ff9ec4","#ff9ec4","#e070a0","#bc5e86"],["#a45275","#a8cdd6","#bc5e86","#bc5e86","#bc5e86","#bc5e86","#cdd0d6","#bc5e86","#bc5e86","#bc5e86","#bc5e86","#a8cdd6","#bc5e86","#a45275"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Slips straight through your blocks and ends up in the deepest gap it fits, exactly like it does in the shower.",
        "help": 2
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "spirit_level",
    name: "a spirit level",
    grid: [
        "XXX"
      ],
    color: [["#656f92","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#9ea8ca","#656f92"],["#9ea8ca","#f4f8ff","#5a6aa8","#f4f8ff","#f4f8ff","#f4f8ff","#8a98c8","#4fa880","#4fa880","#4fa880","#4fa880","#4fa880","#4fa880","#8a98c8","#f4f8ff","#f4f8ff","#5a6aa8","#9ea8ca"],["#9ea8ca","#f4f8ff","#5a6aa8","#f4f8ff","#f4f8ff","#f4f8ff","#4fa880","#7ad8a8","#ffffff","#ffffff","#7ad8a8","#7ad8a8","#4fa880","#f4f8ff","#f4f8ff","#f4f8ff","#5a6aa8","#9ea8ca"],["#9ea8ca","#f4f8ff","#5a6aa8","#f4f8ff","#f4f8ff","#f4f8ff","#4fa880","#7ad8a8","#7ad8a8","#7ad8a8","#7ad8a8","#7ad8a8","#4fa880","#f4f8ff","#f4f8ff","#f4f8ff","#5a6aa8","#9ea8ca"],["#9ea8ca","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#f4f8ff","#8a98c8","#4fa880","#4fa880","#4fa880","#4fa880","#4fa880","#4fa880","#8a98c8","#f4f8ff","#f4f8ff","#f4f8ff","#9ea8ca"],["#656f92","#7480a8","#7480a8","#7480a8","#7480a8","#7480a8","#7480a8","#7480a8","#7480a8","#7480a8","#7480a8","#7480a8","#7480a8","#7480a8","#7480a8","#7480a8","#7480a8","#656f92"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "A genuinely spiritual spirit level. It passes through your blocks and lies down in the deepest gap it fits, perfectly level.",
        "help": 1.5
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
  },
  {
    id: "greased_piglet",
    name: "a greased piglet",
    grid: [
        "XXX"
      ],
    color: [["#ba8192","#d694a8","#d694a8","#d694a8","#d694a8","#d694a8","#d694a8","#d694a8","#d694a8","#d694a8","#d694a8","#d694a8","#bc6580","#bc6580","#d694a8","#d694a8","#bc6580","#a4586f"],["#a8516c","#c86080","#fff6fa","#fff6fa","#fff6fa","#ffb0c8","#fff6fa","#fff6fa","#fff6fa","#fff6fa","#ffb0c8","#ffb0c8","#ffb0c8","#e07898","#ffb0c8","#ffb0c8","#e07898","#d694a8"],["#a8516c","#ffb0c8","#ffb0c8","#fff6fa","#fff6fa","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#3e2731","#ffb0c8","#ffb0c8","#3e2731","#d694a8"],["#d694a8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ff7aa0","#ff7aa0","#ff7aa0","#ff7aa0","#d694a8"],["#bc6580","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#ffb0c8","#e07898","#ffb0c8","#ff7aa0","#a0405a","#a0405a","#ff7aa0","#d694a8"],["#a4586f","#943c57","#bc6580","#bc6580","#bc6580","#943c57","#bc6580","#bc6580","#bc6580","#943c57","#bc6580","#bc6580","#bc6580","#943c57","#bc6580","#bc6580","#943c57","#a4586f"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Nobody can hold on to it, blocks included. It squirts down through the stack into the deepest gap it fits. Squeal.",
        "help": 1.5
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
  },
  {
    id: "phantom_finger",
    name: "a phantom finger",
    grid: [
        "X.",
        "XX"
      ],
    color: [["#8189aa","#c3c6d6","#d6a8b9","#d6a8b9","#d6a8b9","#c3c6d6","#8189aa","","","","","","",""],["#c3c6d6","#e8ecff","#ffc8dc","#ffe8f0","#ffc8dc","#e8ecff","#949ec3","","","","","","",""],["#c3c6d6","#e8ecff","#ffc8dc","#ffc8dc","#ffc8dc","#e8ecff","#949ec3","","","","","","",""],["#c3c6d6","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#949ec3","","","","","","",""],["#c3c6d6","#7080b8","#7080b8","#7080b8","#7080b8","#e8ecff","#949ec3","","","","","","",""],["#c3c6d6","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#949ec3","","","","","","",""],["#c3c6d6","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#c3c6d6","","","","","","",""],["#c3c6d6","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#c3c6d6","#c3c6d6","#c3c6d6","#c3c6d6","#c3c6d6","#c3c6d6","#8189aa"],["#c3c6d6","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#7080b8","#e8ecff","#e8ecff","#7080b8","#e8ecff","#e8ecff","#7080b8","#949ec3"],["#c3c6d6","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#7080b8","#e8ecff","#e8ecff","#7080b8","#e8ecff","#e8ecff","#7080b8","#949ec3"],["#c3c6d6","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#7080b8","#e8ecff","#e8ecff","#7080b8","#e8ecff","#e8ecff","#7080b8","#949ec3"],["#c3c6d6","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#949ec3"],["#c3c6d6","#c8f0ff","#e8ecff","#e8ecff","#c8f0ff","#e8ecff","#e8ecff","#c8f0ff","#e8ecff","#e8ecff","#c8f0ff","#e8ecff","#e8ecff","#949ec3"],["#8189aa","#c3c6d6","#949ec3","#949ec3","#c3c6d6","#949ec3","#949ec3","#c3c6d6","#949ec3","#949ec3","#c3c6d6","#949ec3","#949ec3","#8189aa"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Somebody's phantom limb. It sinks through your blocks into the deepest gap it fits, and points. It still itches.",
        "help": 2
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
  },
  {
    id: "ghost_eel",
    name: "an extremely slippery eel",
    grid: [
        "XXXX"
      ],
    color: [["#2e4d42","#4c745e","#35594c","#4c745e","#35594c","#4c745e","#35594c","#4c745e","#35594c","#4c745e","#35594c","#4c745e","#35594c","#4c745e","#35594c","#4c745e","#35594c","#4c745e","#35594c","#4c745e","#35594c","#4c745e","#507865","#456858"],["#35594c","#7fb398","#7fb398","#7fb398","#7fb398","#d8fff0","#7fb398","#7fb398","#7fb398","#7fb398","#7fb398","#7fb398","#d8fff0","#7fb398","#7fb398","#7fb398","#7fb398","#7fb398","#7fb398","#4a7563","#7fb398","#5f8f78","#5f8f78","#507865"],["#35594c","#5f8f78","#d8fff0","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#d8fff0","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#d8fff0","#5f8f78","#5f8f78","#5f8f78","#4a7563","#5f8f78","#fee761","#2a2550","#507865"],["#4c745e","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#5f8f78","#4a7563","#5f8f78","#5f8f78","#2f4a40","#273e36"],["#35594c","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#c8dca0","#2f4a40","#507865"],["#7b895e","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#8d9e6c","#7b895e"]],
    powerup: {
        "type": "phantom",
        "tier": 2,
        "intro": "Slides down through every block in the way into the deepest gap it fits. Turn it upright to post it down a well.",
        "help": 2.5
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.6,
  },
  {
    id: "ninja",
    name: "a ninja (you didn't see this)",
    grid: [
        ".X.",
        "XXX"
      ],
    color: [["","","","","","","#6574b8","#4d5995","#4d5995","#4d5995","#4d5995","#6574b8","","","","","",""],["","","","","","","#a15e88","#e43b44","#e43b44","#e43b44","#e43b44","#a15e88","","","","","",""],["","","","","","","#4d5995","#e8b796","#ffffff","#e8b796","#ffffff","#4d5995","","","","","",""],["","","","","","","#4d5995","#2a3060","#2a3060","#2a3060","#2a3060","#4d5995","","","","","",""],["","","","","","","#5664a3","#2a3060","#2a3060","#2a3060","#2a3060","#5664a3","","","","","",""],["","","","","","","#4d5995","#2a3060","#3e4880","#3e4880","#2a3060","#4d5995","","","","","",""],["#6474b9","#5462a7","#5462a7","#5462a7","#5462a7","#5462a7","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#5462a7","#5462a7","#5462a7","#5462a7","#919ecd","#6474b9"],["#a395ad","#3a4588","#3a4588","#3a4588","#3a4588","#3a4588","#2a3060","#3e4880","#2a3060","#2a3060","#3e4880","#2a3060","#3a4588","#3a4588","#3a4588","#c0cbdc","#ffffff","#919ecd"],["#5462a7","#3a4588","#3a4588","#3a4588","#3a4588","#3a4588","#a02838","#e43b44","#e43b44","#e43b44","#e43b44","#a02838","#3a4588","#3a4588","#3a4588","#3a4588","#c0cbdc","#5462a7"],["#5664a3","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#5664a3"],["#4d5995","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#1c2048","#1c2048","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#2a3060","#4d5995"],["#6574b8","#5664a3","#5664a3","#5664a3","#4d5995","#4d5995","#4d5995","#4d5995","#47528a","#47528a","#4d5995","#4d5995","#4d5995","#4d5995","#5664a3","#5664a3","#5664a3","#6574b8"]],
    powerup: {
        "type": "phantom",
        "tier": 2,
        "intro": "Slips silently down through your blocks into the deepest gap it fits. If anyone asks, it was never here.",
        "help": 1
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.6,
  },
  {
    id: "buttered_cat",
    name: "a cat with toast strapped to its back",
    grid: [
        "XX.",
        ".XX"
      ],
    color: [["#86513a","#9b5d43","#9b5d43","#9b5d43","#9b5d43","#9b5d43","#9b5d43","#9b5d43","#9b5d43","#9b5d43","#9b5d43","#86513a","","","","","",""],["#9b5d43","#ead4aa","#ead4aa","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#ead4aa","#9b5d43","","","","","",""],["#9b5d43","#ead4aa","#fee761","#fee761","#fee761","#fff3b0","#fee761","#fee761","#fee761","#fee761","#ead4aa","#9b5d43","","","","","",""],["#9b5d43","#ead4aa","#ead4aa","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#ead4aa","#ead4aa","#9b5d43","","","","","",""],["#9b5d43","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#ead4aa","#e43b44","#ead4aa","#ead4aa","#e43b44","#9b5d43","","","","","",""],["#86513a","#9b5d43","#9b5d43","#9b5d43","#9b5d43","#9b5d43","#b86f50","#e43b44","#b86f50","#b86f50","#e43b44","#9b5d43","","","","","",""],["","","","","","","#a94c0f","#e43b44","#f77622","#f77622","#e43b44","#f77622","#cf631d","#cf631d","#a94c0f","#cf631d","#cf631d","#93420d"],["","","","","","","#cf631d","#e43b44","#c95a12","#c95a12","#e43b44","#c95a12","#c95a12","#f77622","#f77622","#f77622","#f77622","#cf631d"],["","","","","","","#a94c0f","#e43b44","#f77622","#f77622","#e43b44","#f77622","#f77622","#f77622","#2a6a50","#f77622","#2a6a50","#a94c0f"],["","","","","","","#cf631d","#e43b44","#c95a12","#c95a12","#e43b44","#c95a12","#c95a12","#f77622","#f77622","#ff9ec4","#f77622","#cf631d"],["","","","","","","#cf631d","#f77622","#f77622","#f77622","#f77622","#f77622","#f77622","#f77622","#f77622","#f77622","#f77622","#a94c0f"],["","","","","","","#93420d","#cf631d","#a94c0f","#a94c0f","#a94c0f","#cf631d","#a94c0f","#a94c0f","#a94c0f","#cf631d","#a94c0f","#93420d"]],
    powerup: {
        "type": "phantom",
        "tier": 2,
        "intro": "It can't land butter-side down OR feet-first, so it doesn't land: it sinks through your blocks into the deepest gap it fits. Science.",
        "help": 1
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.5,
  },
  {
    id: "cat_burglar",
    name: "a cat burglar",
    grid: [
        "X..",
        "XXX"
      ],
    color: [["#71717c","#d685a5","#81818f","#81818f","#d685a5","#71717c","","","","","","","","","","","",""],["#81818f","#9a9aaa","#9a9aaa","#9a9aaa","#9a9aaa","#81818f","","","","","","","","","","","",""],["#272c56","#2e3466","#2e3466","#2e3466","#2e3466","#272c56","","","","","","","","","","","",""],["#272c56","#fee761","#2e3466","#2e3466","#fee761","#272c56","","","","","","","","","","","",""],["#81818f","#9a9aaa","#9a9aaa","#ff9ec4","#9a9aaa","#81818f","","","","","","","","","","","",""],["#81818f","#6e6e82","#9a9aaa","#6e6e82","#9a9aaa","#5c5c6d","","","","","","","","","","","",""],["#31375e","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#31375e","#31375e","#31375e","#31375e","#31375e","#31375e","#664328","#8d654a","#664328","#664328","#8d654a","#593a23"],["#c3c6d6","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#9a9aaa","#a87858","#a87858","#7a5030","#7a5030","#a87858","#8d654a"],["#31375e","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#9a9aaa","#9a9aaa","#9a9aaa","#a87858","#a87858","#fee761","#a87858","#8d654a"],["#c3c6d6","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#e8ecff","#9a9aaa","#9a9aaa","#a87858","#fee761","#fee761","#fee761","#a87858","#8d654a"],["#31375e","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#3a4270","#a87858","#a87858","#a87858","#fee761","#a87858","#8d654a"],["#71717c","#81818f","#5c5c6d","#31375e","#31375e","#31375e","#31375e","#31375e","#81818f","#81818f","#5c5c6d","#31375e","#664328","#8d654a","#8d654a","#8d654a","#8d654a","#593a23"]],
    powerup: {
        "type": "phantom",
        "tier": 2,
        "intro": "Sneaks down through your blocks into the deepest gap it fits and hides there with the loot. It is a cat. It is also a burglar.",
        "help": 1
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.5,
  },
  {
    id: "pile_driver",
    name: "a pile driver",
    grid: [
        "X",
        "X",
        "X"
      ],
    color: [["#fee761","#fee761","#fee761","#fee761","#fee761","#fee761"],["#fee761","#262b44","#c0cbdc","#c0cbdc","#262b44","#fee761"],["#fee761","#feae34","#c0cbdc","#c0cbdc","#feae34","#fee761"],["#fee761","#262b44","#c0cbdc","#c0cbdc","#262b44","#fee761"],["#fee761","#feae34","#c0cbdc","#c0cbdc","#feae34","#fee761"],["#fee761","#262b44","#c0cbdc","#c0cbdc","#262b44","#fee761"],["#5a6988","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc"],["#c0cbdc","#ffffff","#ffffff","#ffffff","#ffffff","#8b9bb4"],["#c0cbdc","#181425","#fee761","#181425","#fee761","#8b9bb4"],["#c0cbdc","#fee761","#181425","#fee761","#181425","#8b9bb4"],["#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4"],["#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988"],["#fee761","#262b44","#b86f50","#733e39","#262b44","#fee761"],["#fee761","#262b44","#b86f50","#733e39","#262b44","#fee761"],["#fee761","#262b44","#b86f50","#733e39","#262b44","#fee761"],["#ead4aa","#262b44","#b86f50","#733e39","#262b44","#ead4aa"],["#ead4aa","#ead4aa","#b86f50","#733e39","#ead4aa","#ead4aa"],["#e4a672","#ead4aa","#b86f50","#733e39","#ead4aa","#e4a672"]],
    powerup: {
        "type": "combo",
        "tier": 3,
        "intro": "Slams down and smashes the whole row underneath it, which closes up like a line clear. Then everything in its column and the two beside it drops down into the gaps. Hard hats on.",
        "parts": [
          {
            "type": "destroyer",
            "collapse": true,
            "area": {
              "origin": [
                0,
                0
              ],
              "grid": [
                ".",
                ".",
                ".",
                "-"
              ]
            }
          },
          {
            "type": "gravity",
            "direction": "down",
            "area": {
              "origin": [
                1,
                0
              ],
              "grid": [
                "|||"
              ]
            }
          }
        ],
        "help": 5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "dentist_drill",
    name: "a dentist's drill",
    grid: [
        "XX",
        ".X"
      ],
    color: [["#8b9bb4","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc"],["#5a6988","#c0cbdc","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#c0cbdc"],["#5a6988","#c0cbdc","#ffffff","#ffffff","#a6e4ff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#a6e4ff","#ffffff","#c0cbdc"],["#5a6988","#8b9bb4","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#8b9bb4"],["#5a6988","#c0cbdc","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#8b9bb4"],["#5a6988","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4"],["#3e2731","#3e2731","#3e2731","#3e2731","#3e2731","#3e2731","#3e2731","#3e2731","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#a8f0c8"],["","","","","","","","#a8f0c8","#a8f0c8","#8b9bb4","#8b9bb4","#8b9bb4","#a8f0c8","#a8f0c8"],["","","","","","","","#a8f0c8","#a8f0c8","#a8f0c8","#ffffff","#c0cbdc","#a8f0c8","#a8f0c8"],["","","","","","","","#a8f0c8","#a8f0c8","#a8f0c8","#ffffff","#c0cbdc","#a8f0c8","#a8f0c8"],["","","","","","","","#a8f0c8","#a8f0c8","#a8f0c8","#ffffff","#c0cbdc","#a8f0c8","#a8f0c8"],["","","","","","","","#a8f0c8","#a8f0c8","#fee761","#ffffff","#c0cbdc","#fee761","#a8f0c8"],["","","","","","","","#a8f0c8","#fee761","#a8f0c8","#ffffff","#a8f0c8","#fee761","#a8f0c8"],["","","","","","","","#a8f0c8","#a8f0c8","#a8f0c8","#fee761","#a8f0c8","#a8f0c8","#a8f0c8"]],
    powerup: {
        "type": "combo",
        "tier": 2,
        "intro": "Drills out the three blocks under its tip, then packs a filling into every empty cell of the 3x4 patch around the hole. This might sting a little.",
        "parts": [
          {
            "type": "destroyer",
            "area": {
              "origin": [
                0,
                0
              ],
              "grid": [
                "..",
                "..",
                ".#",
                ".#",
                ".#"
              ]
            }
          },
          {
            "type": "expander",
            "fill": [
              [
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc"
              ],
              [
                "#c0cbdc",
                "#ffffff",
                "#c0cbdc",
                "#c0cbdc",
                "#8b9bb4",
                "#c0cbdc",
                "#c0cbdc"
              ],
              [
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#ffffff",
                "#c0cbdc"
              ],
              [
                "#8b9bb4",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc"
              ],
              [
                "#c0cbdc",
                "#c0cbdc",
                "#ffffff",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#8b9bb4"
              ],
              [
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#8b9bb4",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc"
              ],
              [
                "#c0cbdc",
                "#8b9bb4",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#ffffff",
                "#c0cbdc"
              ]
            ],
            "area": {
              "origin": [
                0,
                0
              ],
              "grid": [
                "...",
                "...",
                "###",
                "###",
                "###",
                "###"
              ]
            }
          }
        ],
        "help": 1.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "cement_mixer",
    name: "a cement mixer",
    grid: [
        "XXX",
        "XXX"
      ],
    color: [["#262b44","#262b44","#262b44","#262b44","#262b44","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44"],["#262b44","#262b44","#262b44","#ffffff","#f77622","#ffffff","#ffffff","#ffffff","#f77622","#ffffff","#ffffff","#ffffff","#f77622","#ffffff","#262b44","#262b44","#262b44","#262b44"],["#262b44","#262b44","#ffffff","#f77622","#ffffff","#ffffff","#ffffff","#f77622","#ffffff","#ffffff","#ffffff","#f77622","#ffffff","#ffffff","#ffffff","#262b44","#262b44","#262b44"],["#262b44","#ffffff","#f77622","#ffffff","#ffffff","#ffffff","#f77622","#ffffff","#ffffff","#ffffff","#f77622","#ffffff","#ffffff","#ffffff","#f77622","#262b44","#e43b44","#e43b44"],["#262b44","#c0cbdc","#ffffff","#ffffff","#ffffff","#f77622","#ffffff","#ffffff","#ffffff","#f77622","#ffffff","#ffffff","#ffffff","#f77622","#c0cbdc","#262b44","#e43b44","#a6e4ff"],["#262b44","#262b44","#c0cbdc","#c0cbdc","#c0cbdc","#ffffff","#ffffff","#ffffff","#f77622","#ffffff","#ffffff","#c0cbdc","#c0cbdc","#c0cbdc","#262b44","#262b44","#e43b44","#a6e4ff"],["#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#c0cbdc","#e43b44","#e43b44","#e43b44","#e43b44"],["#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#a22633","#a22633","#a22633","#a22633"],["#8b9bb4","#181425","#181425","#181425","#181425","#8b9bb4","#8b9bb4","#8b9bb4","#8b9bb4","#181425","#181425","#181425","#181425","#8b9bb4","#181425","#181425","#181425","#181425"],["#262b44","#181425","#c0cbdc","#c0cbdc","#181425","#262b44","#262b44","#262b44","#262b44","#181425","#c0cbdc","#c0cbdc","#181425","#262b44","#181425","#c0cbdc","#c0cbdc","#181425"],["#262b44","#181425","#c0cbdc","#c0cbdc","#181425","#262b44","#262b44","#262b44","#262b44","#181425","#c0cbdc","#c0cbdc","#181425","#262b44","#181425","#c0cbdc","#c0cbdc","#181425"],["#262b44","#262b44","#181425","#181425","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#181425","#181425","#262b44","#262b44","#262b44","#181425","#181425","#262b44"]],
    powerup: {
        "type": "combo",
        "tier": 2,
        "intro": "First everything in the five columns under it settles down, squashing out the air pockets. Then it pours cement into every empty cell of the 5x2 patch just below it. Keep it turning.",
        "parts": [
          {
            "type": "gravity",
            "direction": "down",
            "area": {
              "origin": [
                1,
                0
              ],
              "grid": [
                "|||||"
              ]
            }
          },
          {
            "type": "expander",
            "fill": [
              [
                "#c0cbdc",
                "#c0cbdc",
                "#8b9bb4",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#5a6988"
              ],
              [
                "#c0cbdc",
                "#8b9bb4",
                "#c0cbdc",
                "#c0cbdc",
                "#5a6988",
                "#c0cbdc",
                "#c0cbdc"
              ],
              [
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#8b9bb4",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc"
              ],
              [
                "#5a6988",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#8b9bb4",
                "#c0cbdc"
              ],
              [
                "#c0cbdc",
                "#c0cbdc",
                "#8b9bb4",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc"
              ],
              [
                "#8b9bb4",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#5a6988",
                "#c0cbdc",
                "#8b9bb4"
              ],
              [
                "#c0cbdc",
                "#c0cbdc",
                "#5a6988",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc",
                "#c0cbdc"
              ]
            ],
            "area": {
              "origin": [
                1,
                0
              ],
              "grid": [
                ".....",
                ".....",
                "#####",
                "#####"
              ]
            }
          }
        ],
        "help": 1.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "erupting_volcano",
    name: "a small erupting volcano",
    grid: [
        ".X.",
        "XXX"
      ],
    color: [["","","","","","","#fee761","#262b44","#e43b44","#262b44","#262b44","#262b44","","","","","",""],["","","","","","","#262b44","#fee761","#e43b44","#fee761","#262b44","#262b44","","","","","",""],["","","","","","","#fee761","#e43b44","#fee761","#e43b44","#262b44","#262b44","","","","","",""],["","","","","","","#e43b44","#fee761","#fee761","#e43b44","#262b44","#262b44","","","","","",""],["","","","","","","#e43b44","#fee761","#f77622","#e43b44","#b86f50","#262b44","","","","","",""],["","","","","","","#733e39","#e43b44","#e43b44","#b86f50","#b86f50","#262b44","","","","","",""],["#262b44","#262b44","#262b44","#262b44","#733e39","#733e39","#b86f50","#f77622","#e43b44","#b86f50","#b86f50","#b86f50","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44"],["#262b44","#262b44","#262b44","#733e39","#733e39","#b86f50","#b86f50","#e43b44","#f77622","#b86f50","#b86f50","#b86f50","#b86f50","#262b44","#262b44","#262b44","#262b44","#262b44"],["#262b44","#262b44","#733e39","#733e39","#b86f50","#b86f50","#f77622","#e43b44","#b86f50","#b86f50","#b86f50","#e4a672","#b86f50","#b86f50","#262b44","#262b44","#262b44","#262b44"],["#262b44","#733e39","#733e39","#b86f50","#b86f50","#b86f50","#e43b44","#f77622","#b86f50","#b86f50","#b86f50","#b86f50","#e4a672","#b86f50","#b86f50","#262b44","#262b44","#262b44"],["#733e39","#733e39","#b86f50","#b86f50","#b86f50","#b86f50","#f77622","#e43b44","#b86f50","#b86f50","#b86f50","#b86f50","#b86f50","#e4a672","#b86f50","#b86f50","#b86f50","#262b44"],["#733e39","#733e39","#733e39","#733e39","#733e39","#733e39","#733e39","#733e39","#733e39","#733e39","#733e39","#733e39","#733e39","#733e39","#733e39","#733e39","#733e39","#733e39"]],
    powerup: {
        "type": "combo",
        "tier": 3,
        "intro": "Melts straight down through the four blocks under its crater, then erupts: a big patch of blocks around it is thrown high and lands wherever it comes down. The ground will be lovely and fertile in a few hundred years.",
        "parts": [
          {
            "type": "destroyer",
            "area": {
              "origin": [
                0,
                0
              ],
              "grid": [
                "...",
                "...",
                ".#.",
                ".#.",
                ".#.",
                ".#."
              ]
            }
          },
          {
            "type": "blast",
            "push": 4,
            "area": {
              "origin": [
                3,
                1
              ],
              "grid": [
                "..#######..",
                ".#########.",
                "###########",
                "###########",
                "###########",
                "###########",
                ".#########."
              ]
            }
          }
        ],
        "help": 3.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "sinkhole",
    name: "a sinkhole",
    grid: [
        "XXX"
      ],
    color: [["#5ca848","#4fa545","#4fa545","#69c153","#4fa545","#ba8d59","#ba8d59","#ba8d59","#ba8d59","#ba8d59","#ba8d59","#ba8d59","#ba8d59","#4fa545","#4fa545","#69c153","#4fa545","#45903c"],["#4fa545","#5cc050","#d8a468","#d8a468","#b07a44","#b07a44","#8a5a30","#8a5a30","#8a5a30","#ffa050","#8a5a30","#8a5a30","#c8b090","#b07a44","#d8a468","#d8a468","#5cc050","#69c153"],["#4fa545","#d8a468","#b07a44","#b07a44","#c8b090","#6e4424","#6e4424","#5a3418","#ff7a1a","#ffffff","#ff7a1a","#6e4424","#6e4424","#8a5a30","#b07a44","#b07a44","#d8a468","#4fa545"],["#69c153","#d8a468","#b07a44","#b07a44","#8a5a30","#6e4424","#6e4424","#5a3418","#ff7a1a","#ff7a1a","#ff7a1a","#6e4424","#6e4424","#c8b090","#b07a44","#b07a44","#d8a468","#4fa545"],["#4fa545","#5cc050","#d8a468","#d8a468","#b07a44","#b07a44","#c8b090","#8a5a30","#8a5a30","#8a5a30","#8a5a30","#8a5a30","#b07a44","#b07a44","#d8a468","#d8a468","#5cc050","#69c153"],["#45903c","#69c153","#4fa545","#4fa545","#69c153","#ba8d59","#ba8d59","#ba8d59","#ba8d59","#ba8d59","#ba8d59","#ba8d59","#ba8d59","#69c153","#4fa545","#4fa545","#69c153","#45903c"]],
    powerup: {
        "type": "combo",
        "tier": 2,
        "intro": "Swallows every block within two steps of it, then everything in the five columns under it slumps down into the hole. The traffic cone was a nice touch.",
        "parts": [
          {
            "type": "acid",
            "reach": 2
          },
          {
            "type": "gravity",
            "direction": "down",
            "area": {
              "origin": [
                1,
                0
              ],
              "grid": [
                "|||||"
              ]
            }
          }
        ],
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "tornado",
    name: "a tornado (with a cow in it)",
    grid: [
        "XXX",
        ".X.",
        ".X."
      ],
    color: [["#262b44","#5a6988","#5a6988","#8b9bb4","#5a6988","#5a6988","#5a6988","#5a6988","#8b9bb4","#5a6988","#5a6988","#5a6988","#8b9bb4","#5a6988","#5a6988","#5a6988","#5a6988","#262b44"],["#5a6988","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#5a6988"],["#8b9bb4","#c0cbdc","#ffffff","#181425","#ffffff","#ffffff","#c0cbdc","#8b9bb4","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#c0cbdc"],["#5a6988","#8b9bb4","#ffffff","#ffffff","#181425","#ffffff","#f6757a","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#c0cbdc","#5a6988"],["#262b44","#5a6988","#181425","#8b9bb4","#5a6988","#181425","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#c0cbdc","#8b9bb4","#5a6988","#262b44"],["#262b44","#262b44","#262b44","#5a6988","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#c0cbdc","#8b9bb4","#5a6988","#262b44","#262b44"],["","","","","","","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#8b9bb4","#c0cbdc","","","","","",""],["","","","","","","#5a6988","#8b9bb4","#c0cbdc","#8b9bb4","#8b9bb4","#5a6988","","","","","",""],["","","","","","","#262b44","#8b9bb4","#c0cbdc","#8b9bb4","#c0cbdc","#262b44","","","","","",""],["","","","","","","#262b44","#5a6988","#8b9bb4","#c0cbdc","#8b9bb4","#262b44","","","","","",""],["","","","","","","#262b44","#262b44","#8b9bb4","#c0cbdc","#8b9bb4","#262b44","","","","","",""],["","","","","","","#262b44","#262b44","#c0cbdc","#8b9bb4","#5a6988","#262b44","","","","","",""],["","","","","","","#262b44","#262b44","#8b9bb4","#c0cbdc","#262b44","#262b44","","","","","",""],["","","","","","","#262b44","#262b44","#262b44","#8b9bb4","#c0cbdc","#262b44","","","","","",""],["","","","","","","#262b44","#262b44","#262b44","#c0cbdc","#8b9bb4","#262b44","","","","","",""],["","","","","","","#262b44","#262b44","#c0cbdc","#8b9bb4","#262b44","#262b44","","","","","",""],["","","","","","","#262b44","#ead4aa","#c0cbdc","#ead4aa","#b86f50","#262b44","","","","","",""],["","","","","","","#ead4aa","#b86f50","#ead4aa","#ead4aa","#b86f50","#ead4aa","","","","","",""]],
    powerup: {
        "type": "combo",
        "tier": 3,
        "intro": "Picks up the blocks around it and flings them high into the air, then everything in the five columns under it settles down into the gaps. The cow is fine. The cow has seen things.",
        "parts": [
          {
            "type": "blast",
            "push": 5,
            "area": {
              "origin": [
                2,
                1
              ],
              "grid": [
                "#######",
                "#######",
                "#######",
                "#######",
                "#######",
                "#######",
                "#######"
              ]
            }
          },
          {
            "type": "gravity",
            "direction": "down",
            "area": {
              "origin": [
                1,
                0
              ],
              "grid": [
                "|||||"
              ]
            }
          }
        ],
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "hot_glue_gun",
    name: "a hot glue gun",
    grid: [
        "XXX",
        "X.."
      ],
    color: [["#ead4aa","#ead4aa","#ead4aa","#ead4aa","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#c0cbdc","#c0cbdc"],["#ead4aa","#ffffff","#ead4aa","#0099db","#0099db","#a6e4ff","#a6e4ff","#a6e4ff","#a6e4ff","#a6e4ff","#a6e4ff","#a6e4ff","#a6e4ff","#0099db","#0099db","#0099db","#c0cbdc","#8b9bb4"],["#ead4aa","#ead4aa","#ead4aa","#ead4aa","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#0099db","#c0cbdc","#c0cbdc"],["#262b44","#262b44","#262b44","#0099db","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#124e89","#262b44","#262b44","#262b44"],["#262b44","#262b44","#262b44","#0099db","#124e89","#262b44","#fee761","#fee761","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#ead4aa"],["#262b44","#262b44","#262b44","#0099db","#124e89","#262b44","#262b44","#fee761","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#262b44","#ead4aa"],["#262b44","#262b44","#0099db","#0099db","#124e89","#262b44","","","","","","","","","","","",""],["#262b44","#262b44","#0099db","#124e89","#124e89","#262b44","","","","","","","","","","","",""],["#262b44","#262b44","#0099db","#124e89","#124e89","#262b44","","","","","","","","","","","",""],["#262b44","#0099db","#0099db","#124e89","#124e89","#262b44","","","","","","","","","","","",""],["#262b44","#0099db","#124e89","#124e89","#262b44","#262b44","","","","","","","","","","","",""],["#262b44","#124e89","#124e89","#124e89","#262b44","#262b44","","","","","","","","","","","",""]],
    powerup: {
        "type": "combo",
        "tier": 2,
        "intro": "Melts every block it touches, then squirts glue into every empty cell under it (a 3x3 patch). Your fingers will be fine. Eventually.",
        "parts": [
          {
            "type": "acid",
            "reach": 1
          },
          {
            "type": "expander",
            "fill": [
              [
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ffffff",
                "#ead4aa",
                "#ead4aa"
              ],
              [
                "#ead4aa",
                "#ffffff",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#e4a672"
              ],
              [
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa"
              ],
              [
                "#ead4aa",
                "#e4a672",
                "#ead4aa",
                "#ffffff",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa"
              ],
              [
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ffffff",
                "#ead4aa"
              ],
              [
                "#ffffff",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#e4a672",
                "#ead4aa"
              ],
              [
                "#ead4aa",
                "#ead4aa",
                "#ffffff",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa"
              ]
            ],
            "area": {
              "origin": [
                0,
                0
              ],
              "grid": [
                "...",
                "###",
                "###",
                "###"
              ]
            }
          }
        ],
        "help": 1
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "car_airbag",
    name: "a car airbag",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#262b44","#262b44","#262b44","#262b44","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#262b44","#262b44","#262b44","#262b44"],["#262b44","#262b44","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#262b44","#262b44"],["#262b44","#ffffff","#ffffff","#c0cbdc","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#262b44"],["#262b44","#ffffff","#c0cbdc","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#c0cbdc","#ffffff","#ffffff","#262b44"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#c0cbdc","#ffffff","#ffffff"],["#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff"],["#5a6988","#ffffff","#ffffff","#ffffff","#c0cbdc","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#5a6988"],["#5a6988","#5a6988","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#c0cbdc","#ffffff","#5a6988","#5a6988"],["#5a6988","#181425","#5a6988","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#5a6988","#181425","#5a6988"],["#5a6988","#181425","#181425","#5a6988","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#ffffff","#5a6988","#181425","#181425","#5a6988"],["#5a6988","#181425","#181425","#181425","#5a6988","#5a6988","#8b9bb4","#8b9bb4","#5a6988","#5a6988","#181425","#181425","#181425","#5a6988"],["#5a6988","#5a6988","#181425","#181425","#181425","#181425","#8b9bb4","#5a6988","#181425","#181425","#181425","#181425","#5a6988","#5a6988"],["#262b44","#5a6988","#5a6988","#181425","#181425","#181425","#5a6988","#8b9bb4","#181425","#181425","#181425","#5a6988","#5a6988","#262b44"],["#262b44","#262b44","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#5a6988","#262b44","#262b44"]],
    powerup: {
        "type": "combo",
        "tier": 2,
        "intro": "Bangs the blocks around it up into the air (they land where they fall), then inflates into the six empty cells under it. You will be absolutely fine and also slightly deaf.",
        "parts": [
          {
            "type": "blast",
            "push": 4,
            "area": {
              "origin": [
                2,
                2
              ],
              "grid": [
                ".####.",
                "######",
                "######",
                "######",
                "######",
                ".####."
              ]
            }
          },
          {
            "type": "expander",
            "fill": [
              [
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff"
              ],
              [
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#c0cbdc",
                "#ffffff",
                "#ffffff",
                "#ffffff"
              ],
              [
                "#ffffff",
                "#ffffff",
                "#c0cbdc",
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff"
              ],
              [
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#c0cbdc",
                "#ffffff"
              ],
              [
                "#ffffff",
                "#c0cbdc",
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff"
              ],
              [
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#c0cbdc",
                "#ffffff",
                "#ffffff"
              ],
              [
                "#c0cbdc",
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff",
                "#ffffff"
              ]
            ],
            "area": {
              "origin": [
                1,
                0
              ],
              "grid": [
                "....",
                "....",
                "####",
                ".##."
              ]
            }
          }
        ],
        "help": 1
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "hard_hats",
    name: "a demolition crew (two tiny hard hats)",
    grid: [
        "XX"
      ],
    color: [["#262b44","#262b44","#fee761","#fee761","#fee761","#262b44","#262b44","#262b44","#262b44","#f77622","#f77622","#f77622","#262b44","#262b44"],["#262b44","#fee761","#fee761","#ffffff","#fee761","#fee761","#262b44","#262b44","#f77622","#f77622","#ffffff","#f77622","#f77622","#262b44"],["#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#f77622","#f77622","#f77622","#f77622","#f77622","#f77622","#f77622"],["#262b44","#262b44","#e4a672","#e4a672","#e4a672","#e4a672","#262b44","#262b44","#262b44","#e4a672","#e4a672","#e4a672","#e4a672","#262b44"],["#262b44","#262b44","#e4a672","#181425","#e4a672","#181425","#262b44","#262b44","#262b44","#e4a672","#181425","#e4a672","#181425","#262b44"],["#262b44","#262b44","#e4a672","#e4a672","#e4a672","#e4a672","#262b44","#262b44","#262b44","#e4a672","#e4a672","#e4a672","#e4a672","#262b44"],["#262b44","#262b44","#0099db","#0099db","#0099db","#0099db","#262b44","#262b44","#262b44","#a22633","#a22633","#a22633","#a22633","#262b44"]],
    powerup: {
        "type": "combo",
        "tier": 3,
        "intro": "A three-step job: knocks out the 2x2 of blocks under them, lets everything in the four columns around them settle, then bricks up every empty cell of the 4x2 patch below. On budget, somehow.",
        "parts": [
          {
            "type": "destroyer",
            "area": {
              "origin": [
                0,
                0
              ],
              "grid": [
                "..",
                "##",
                "##"
              ]
            }
          },
          {
            "type": "gravity",
            "direction": "down",
            "area": {
              "origin": [
                1,
                0
              ],
              "grid": [
                "||||"
              ]
            }
          },
          {
            "type": "expander",
            "fill": [
              [
                "#e43b44",
                "#e43b44",
                "#e43b44",
                "#ead4aa",
                "#e43b44",
                "#e43b44",
                "#e43b44"
              ],
              [
                "#e43b44",
                "#a22633",
                "#e43b44",
                "#ead4aa",
                "#e43b44",
                "#a22633",
                "#e43b44"
              ],
              [
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa"
              ],
              [
                "#e43b44",
                "#ead4aa",
                "#e43b44",
                "#e43b44",
                "#e43b44",
                "#ead4aa",
                "#e43b44"
              ],
              [
                "#e43b44",
                "#ead4aa",
                "#a22633",
                "#e43b44",
                "#e43b44",
                "#ead4aa",
                "#a22633"
              ],
              [
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa",
                "#ead4aa"
              ],
              [
                "#e43b44",
                "#e43b44",
                "#e43b44",
                "#ead4aa",
                "#e43b44",
                "#e43b44",
                "#e43b44"
              ]
            ],
            "area": {
              "origin": [
                1,
                0
              ],
              "grid": [
                "....",
                "####",
                "####"
              ]
            }
          }
        ],
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "plunger",
    name: "a plumber's plunger",
    grid: [
        "X",
        "X"
      ],
    color: [["#262b44","#262b44","#b86f50","#e4a672","#b86f50","#262b44","#262b44"],["#262b44","#262b44","#b86f50","#e4a672","#b86f50","#262b44","#262b44"],["#262b44","#262b44","#b86f50","#e4a672","#b86f50","#262b44","#262b44"],["#262b44","#262b44","#b86f50","#e4a672","#b86f50","#262b44","#262b44"],["#262b44","#262b44","#b86f50","#e4a672","#b86f50","#262b44","#262b44"],["#262b44","#262b44","#b86f50","#e4a672","#b86f50","#262b44","#262b44"],["#262b44","#262b44","#b86f50","#e4a672","#b86f50","#262b44","#262b44"],["#262b44","#262b44","#b86f50","#e4a672","#b86f50","#262b44","#262b44"],["#262b44","#262b44","#b86f50","#e4a672","#b86f50","#262b44","#262b44"],["#262b44","#262b44","#a22633","#e43b44","#a22633","#262b44","#262b44"],["#262b44","#a22633","#e43b44","#f6757a","#e43b44","#a22633","#262b44"],["#a22633","#e43b44","#e43b44","#f6757a","#e43b44","#e43b44","#a22633"],["#a22633","#e43b44","#e43b44","#e43b44","#e43b44","#e43b44","#a22633"],["#a22633","#a22633","#a22633","#a22633","#a22633","#a22633","#a22633"]],
    powerup: {
        "type": "combo",
        "tier": 2,
        "intro": "Shoves the clog out: destroys the three blocks straight under it, then everything in its column and the two beside it drains down into the gaps. Glug.",
        "parts": [
          {
            "type": "destroyer",
            "area": {
              "origin": [
                0,
                0
              ],
              "grid": [
                ".",
                ".",
                "#",
                "#",
                "#"
              ]
            }
          },
          {
            "type": "gravity",
            "direction": "down",
            "area": {
              "origin": [
                1,
                0
              ],
              "grid": [
                "|||"
              ]
            }
          }
        ],
        "help": 4
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "old_testament",
    name: "The Old Testament",
    grid: [
        "X",
        "X"
      ],
    color: [["#d9a63a","#4a2410","#9a5e34","#9a5e34","#9a5e34","#d9a63a","#d9a63a"],["#d9a63a","#c9952e","#6b3519","#d9a63a","#d9a63a","#d9a63a","#7a4020"],["#d9a63a","#4a2410","#6b3519","#7a4020","#7a4020","#7a4020","#7a4020"],["#2a1408","#4a2410","#6b3519","#a6782a","#a6782a","#a6782a","#7a4020"],["#d9a63a","#c9952e","#6b3519","#7a4020","#ff8a1c","#7a4020","#7a4020"],["#2a1408","#4a2410","#6b3519","#7a4020","#ff8a1c","#d8401a","#7a4020"],["#2a1408","#4a2410","#6b3519","#d8401a","#ff8a1c","#ff8a1c","#7a4020"],["#d9a63a","#c9952e","#6b3519","#7a4020","#ff8a1c","#ffe066","#ff8a1c"],["#2a1408","#4a2410","#6b3519","#d8401a","#ffe066","#ffe066","#ff8a1c"],["#2a1408","#4a2410","#6b3519","#ff8a1c","#ffe066","#ffe066","#d8401a"],["#2a1408","#4a2410","#6b3519","#7a4020","#d8401a","#ff8a1c","#d8401a"],["#d9a63a","#c9952e","#6b3519","#7a4020","#7a4020","#7a4020","#7a4020"],["#d9a63a","#4a2410","#6b3519","#a6782a","#a6782a","#a6782a","#7a4020"],["#d9a63a","#4a2410","#4a2410","#4a2410","#4a2410","#d9a63a","#d9a63a"]],
    powerup: {
        "type": "destroyer",
        "tier": 2,
        "intro": "Smites the 3-wide pillar of blocks straight below it, 8 rows deep, with fire and brimstone. It's all in the small print.",
        "area": {
          "origin": [
            1,
            0
          ],
          "grid": [
            "...",
            "...",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###",
            "###"
          ]
        },
        "help": 3.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
    tags: [
        "scripture"
      ],
  },
  {
    id: "new_testament",
    name: "The New Testament",
    grid: [
        "X",
        "X"
      ],
    color: [["#3a0810","#6a1220","#c84058","#c84058","#c84058","#c84058","#a8243a"],["#3a0810","#6a1220","#8a1a2c","#f0c94a","#f0c94a","#f0c94a","#a8243a"],["#3a0810","#6a1220","#8a1a2c","#a8243a","#a8243a","#a8243a","#a8243a"],["#3a0810","#6a1220","#8a1a2c","#f0c94a","#f0c94a","#a8243a","#a8243a"],["#3a0810","#6a1220","#8a1a2c","#a8243a","#a8243a","#a8243a","#a8243a"],["#3a0810","#6a1220","#8a1a2c","#a8243a","#f0c94a","#a8243a","#a8243a"],["#3a0810","#6a1220","#8a1a2c","#a8243a","#f0c94a","#a8243a","#a8243a"],["#3a0810","#6a1220","#8a1a2c","#f0c94a","#f0c94a","#f0c94a","#a8243a"],["#3a0810","#6a1220","#8a1a2c","#a8243a","#f0c94a","#a8243a","#a8243a"],["#3a0810","#6a1220","#8a1a2c","#a8243a","#f0c94a","#a8243a","#a8243a"],["#3a0810","#6a1220","#8a1a2c","#a8243a","#f0c94a","#a8243a","#a8243a"],["#3a0810","#6a1220","#8a1a2c","#a8243a","#a8243a","#a8243a","#a8243a"],["#3a0810","#6a1220","#8a1a2c","#b08a20","#b08a20","#b08a20","#a8243a"],["#3a0810","#6a1220","#6a1220","#6a1220","#6a1220","#6a1220","#6a1220"]],
    powerup: {
        "type": "expander",
        "tier": 2,
        "fill": [
          [
            "#efdcae",
            "#a3561c",
            "#e39a45",
            "#e39a45",
            "#e39a45",
            "#a3561c",
            "#efdcae"
          ],
          [
            "#a3561c",
            "#e39a45",
            "#9a4c18",
            "#e39a45",
            "#9a4c18",
            "#e39a45",
            "#a3561c"
          ],
          [
            "#a3561c",
            "#e39a45",
            "#e39a45",
            "#e39a45",
            "#e39a45",
            "#e39a45",
            "#a3561c"
          ],
          [
            "#efdcae",
            "#a3561c",
            "#a3561c",
            "#a3561c",
            "#a3561c",
            "#a3561c",
            "#efdcae"
          ],
          [
            "#efdcae",
            "#7fb2dc",
            "#7fb2dc",
            "#7fb2dc",
            "#efdcae",
            "#7fb2dc",
            "#efdcae"
          ],
          [
            "#7fb2dc",
            "#16162a",
            "#7fb2dc",
            "#7fb2dc",
            "#7fb2dc",
            "#7fb2dc",
            "#efdcae"
          ],
          [
            "#efdcae",
            "#7fb2dc",
            "#7fb2dc",
            "#7fb2dc",
            "#efdcae",
            "#7fb2dc",
            "#efdcae"
          ]
        ],
        "intro": "Loaves and fishes: fills every empty cell beside it and in a wide basket below it with bread and fish. Somehow there are leftovers.",
        "area": {
          "origin": [
            3,
            0
          ],
          "grid": [
            ".##.##.",
            ".##.##.",
            "#######",
            "#######",
            ".#####."
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.8,
    tags: [
        "scripture"
      ],
  },
  {
    id: "one_ring",
    name: "the One Ring",
    grid: [
        "XXX",
        "X.X",
        "XXX"
      ],
    color: [["#93691b","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#93691b"],["#ad7b20","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#fee761","#ff8a2a","#fee761","#ff8a2a","#ff8a2a","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#fee761","#ff8a2a","#ff8a2a","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#fee761","#f2c040","#ff8a2a","#ff8a2a","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#f2c040","#fee761","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#fee761","#f2c040","#d89a28","#d89a28","#d89a28","#d89a28","#d89a28","#d89a28","#d89a28","#d89a28","#d89a28","#d89a28","#f2c040","#fee761","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#fee761","#f2c040","#d89a28","#9e651d","#8d5a1a","#8d5a1a","#8d5a1a","#8d5a1a","#8d5a1a","#8d5a1a","#9e651d","#d89a28","#f2c040","#fee761","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#fee761","#f2c040","#d89a28","#8d5a1a","","","","","","","#8d5a1a","#d89a28","#f2c040","#fee761","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#fee761","#f2c040","#d89a28","#8d5a1a","","","","","","","#8d5a1a","#d89a28","#f2c040","#fee761","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#fee761","#f2c040","#d89a28","#8d5a1a","","","","","","","#8d5a1a","#d89a28","#f2c040","#fee761","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#ff8a2a","#f2c040","#d89a28","#8d5a1a","","","","","","","#8d5a1a","#d89a28","#f2c040","#fee761","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#e43b44","#ff8a2a","#d89a28","#8d5a1a","","","","","","","#8d5a1a","#d89a28","#f2c040","#e43b44","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#fee761","#e43b44","#d89a28","#8d5a1a","","","","","","","#8d5a1a","#d89a28","#ff8a2a","#ff8a2a","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#ff8a2a","#f2c040","#d89a28","#9e651d","#8d5a1a","#8d5a1a","#8d5a1a","#8d5a1a","#8d5a1a","#8d5a1a","#9e651d","#d89a28","#e43b44","#fee761","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#fee761","#ff8a2a","#d89a28","#d89a28","#d89a28","#d89a28","#d89a28","#d89a28","#d89a28","#d89a28","#d89a28","#d89a28","#f2c040","#e43b44","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#ff8a2a","#f2c040","#f2c040","#f2c040","#ff8a2a","#ff8a2a","#f2c040","#ff8a2a","#ff8a2a","#f2c040","#f2c040","#f2c040","#ff8a2a","#fee761","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#fee761","#fee761","#fee761","#ff8a2a","#ff8a2a","#fee761","#ff8a2a","#fee761","#e43b44","#ff8a2a","#fee761","#fee761","#fee761","#ff8a2a","#fff2a0","#ad7b20"],["#ad7b20","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#fff2a0","#ad7b20"],["#93691b","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#ad7b20","#93691b"]],
    powerup: {
        "type": "destroyer",
        "tier": 3,
        "intro": "One ring to rule them all: every block in the three rows it spans, wall to wall, is destroyed, and the rows above drop down. My precious.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "-",
            "-",
            "-"
          ]
        },
        "collapse": true,
        "help": 5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.5,
    tags: [
        "lotr"
      ],
  },
  {
    id: "eye_of_sauron",
    name: "the Eye of Sauron",
    grid: [
        "XXX",
        "XXX"
      ],
    color: [["#6e1a23","#821e29","#821e29","#b62f36","#b62f36","#b62f36","#b62f36","#b62f36","#b62f36","#b62f36","#b62f36","#c65e1b","#b62f36","#b62f36","#b62f36","#821e29","#821e29","#6e1a23"],["#821e29","#a22633","#a22633","#e43b44","#e43b44","#f77622","#feae34","#f77622","#4a0c14","#4a0c14","#f77622","#f77622","#f77622","#f77622","#e43b44","#a22633","#a22633","#821e29"],["#821e29","#e43b44","#e43b44","#e43b44","#f77622","#feae34","#feae34","#feae34","#4a0c14","#4a0c14","#feae34","#feae34","#f77622","#f77622","#e43b44","#e43b44","#e43b44","#821e29"],["#b62f36","#e43b44","#f77622","#f77622","#f77622","#feae34","#fee761","#701420","#4a0c14","#4a0c14","#701420","#feae34","#feae34","#f77622","#f77622","#e43b44","#f77622","#b62f36"],["#b62f36","#f77622","#feae34","#feae34","#feae34","#fee761","#fee761","#701420","#4a0c14","#4a0c14","#701420","#fee761","#feae34","#feae34","#f77622","#feae34","#f77622","#b62f36"],["#b62f36","#f77622","#f77622","#feae34","#fee761","#fee761","#fff6d8","#701420","#4a0c14","#4a0c14","#701420","#fff6d8","#fee761","#fee761","#feae34","#f77622","#f77622","#c65e1b"],["#b62f36","#f77622","#f77622","#f77622","#feae34","#fee761","#fff6d8","#701420","#4a0c14","#4a0c14","#701420","#fff6d8","#feae34","#fee761","#feae34","#f77622","#e43b44","#b62f36"],["#b62f36","#f77622","#f77622","#f77622","#feae34","#fee761","#fff6d8","#701420","#4a0c14","#4a0c14","#701420","#fee761","#fee761","#feae34","#feae34","#f77622","#f77622","#b62f36"],["#b62f36","#e43b44","#f77622","#feae34","#feae34","#fee761","#feae34","#701420","#4a0c14","#4a0c14","#701420","#fee761","#fee761","#feae34","#f77622","#f77622","#e43b44","#821e29"],["#821e29","#e43b44","#f77622","#f77622","#f77622","#f77622","#feae34","#feae34","#4a0c14","#4a0c14","#feae34","#f77622","#f77622","#feae34","#f77622","#e43b44","#e43b44","#821e29"],["#821e29","#e43b44","#e43b44","#e43b44","#e43b44","#f77622","#f77622","#f77622","#4a0c14","#4a0c14","#f77622","#f77622","#e43b44","#e43b44","#e43b44","#e43b44","#a22633","#821e29"],["#6e1a23","#821e29","#821e29","#821e29","#b62f36","#b62f36","#b62f36","#b62f36","#b62f36","#c65e1b","#b62f36","#b62f36","#b62f36","#b62f36","#821e29","#821e29","#821e29","#6e1a23"]],
    powerup: {
        "type": "destroyer",
        "tier": 3,
        "intro": "Its gaze burns a widening cone of blocks below it, 5 rows deep and up to 11 wide. It sees you. It sees everything. It is mostly a lighthouse.",
        "area": {
          "origin": [
            4,
            0
          ],
          "grid": [
            "...........",
            "...........",
            "....###....",
            "...#####...",
            "..#######..",
            ".#########.",
            "###########"
          ]
        },
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.5,
    tags: [
        "lotr"
      ],
  },
  {
    id: "time_machine",
    name: "a time machine (slightly used)",
    grid: [
        "X",
        "X"
      ],
    color: [["#a57d31","#d8be79","#d8be79","#d8be79","#d8be79","#d8be79","#a57d31"],["#bf9039","#f6d88a","#fff3d6","#fff3d6","#fff3d6","#f6d88a","#bf9039"],["#bf9039","#fff3d6","#fff3d6","#6a4320","#fff3d6","#fff3d6","#bf9039"],["#bf9039","#fff3d6","#fff3d6","#6a4320","#6a4320","#fff3d6","#bf9039"],["#bf9039","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#fff3d6","#bf9039"],["#bf9039","#a8742c","#fff3d6","#fff3d6","#fff3d6","#a8742c","#bf9039"],["#946627","#a8742c","#a8742c","#a8742c","#a8742c","#a8742c","#946627"],["#bf9039","#2f86d6","#2f86d6","#2f86d6","#2f86d6","#2f86d6","#bf9039"],["#bf9039","#2f86d6","#5fd4ff","#5fd4ff","#5fd4ff","#2f86d6","#bf9039"],["#bf9039","#5fd4ff","#d6f7ff","#2f86d6","#d6f7ff","#5fd4ff","#bf9039"],["#bf9039","#2f86d6","#5fd4ff","#d6f7ff","#5fd4ff","#2f86d6","#bf9039"],["#bf9039","#2f86d6","#2f86d6","#2f86d6","#2f86d6","#2f86d6","#bf9039"],["#bf9039","#a8742c","#f6d88a","#ff4d5e","#f6d88a","#a8742c","#bf9039"],["#a57d31","#bf9039","#bf9039","#bf9039","#bf9039","#bf9039","#a57d31"]],
    powerup: {
        "type": "destroyer",
        "tier": 3,
        "collapse": true,
        "area": {
          "origin": [
            0,
            1
          ],
          "grid": [
            "-",
            ".",
            ".",
            "-"
          ]
        },
        "intro": "Erases the row just above it and the row just below it, wall to wall, and everything above drops down. Those rows never happened. Please stop asking about them.",
        "help": 5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.5,
  },
  {
    id: "pinking_shears",
    name: "a pair of pinking shears",
    grid: [
        "X",
        "X"
      ],
    color: [["#c2692e","#e07936","#e07936","#e07936","#e07936","#e07936","#c2692e"],["#e07936","#ffd2a8","#ffd2a8","#ff8a3d","#ffd2a8","#ffd2a8","#e07936"],["#e07936","#ffd2a8","#ffd2a8","#ff8a3d","#ffd2a8","#ffd2a8","#e07936"],["#e07936","#ff8a3d","#ff8a3d","#ff8a3d","#ff8a3d","#ff8a3d","#e07936"],["#bf5625","#ff8a3d","#ff8a3d","#ff8a3d","#ff8a3d","#ff8a3d","#bf5625"],["#c4cad2","#d9622a","#dfe5ef","#dfe5ef","#dfe5ef","#d9622a","#c4cad2"],["#c4cad2","#ffffff","#dfe5ef","#6e7a90","#dfe5ef","#ffffff","#c4cad2"],["#c4cad2","#ffffff","#dfe5ef","#9aa6b8","#dfe5ef","#ffffff","#c4cad2"],["#c4cad2","#ffffff","#9aa6b8","#dfe5ef","#ffffff","#ffffff","#c4cad2"],["#c4cad2","#ffffff","#dfe5ef","#9aa6b8","#dfe5ef","#ffffff","#c4cad2"],["#c4cad2","#ffffff","#ffffff","#dfe5ef","#9aa6b8","#ffffff","#c4cad2"],["#c4cad2","#ffffff","#dfe5ef","#9aa6b8","#dfe5ef","#ffffff","#c4cad2"],["#c4cad2","#ffffff","#9aa6b8","#dfe5ef","#ffffff","#ffffff","#c4cad2"],["#a9aeb6","#e0e0e0","#c4cad2","#8892a2","#c4cad2","#e0e0e0","#a9aeb6"]],
    powerup: {
        "type": "destroyer",
        "tier": 2,
        "area": {
          "origin": [
            2,
            0
          ],
          "grid": [
            ".....",
            ".....",
            "##.##",
            "##.##",
            "##.##",
            "##.##",
            "##.##",
            "##.##",
            "##.##",
            "##.##"
          ]
        },
        "intro": "Snips two strips of blocks straight down, each 2 wide and 8 deep, one either side of it. It leaves the column in the middle, with a lovely zigzag edge.",
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "black_hole_intern",
    name: "a black hole's intern",
    grid: [
        "X"
      ],
    color: [["#873ca4","#9c46be","#e06ba2","#e06ba2","#e06ba2","#9c46be","#873ca4"],["#9c46be","#ff7ab8","#ffa94d","#ffa94d","#ffa94d","#ff7ab8","#9c46be"],["#e06ba2","#ffa94d","#ffe680","#ffe680","#ffe680","#ffa94d","#e06ba2"],["#e06ba2","#ffa94d","#ffe680","#4a2a7a","#ffe680","#ffa94d","#e06ba2"],["#e06ba2","#ffa94d","#ffe680","#ffe680","#ffa94d","#ffffff","#e04453"],["#9c46be","#ff7ab8","#ffa94d","#ffa94d","#ff7ab8","#ffffff","#e0e0e0"],["#873ca4","#9c46be","#e06ba2","#e06ba2","#e06ba2","#9c46be","#873ca4"]],
    powerup: {
        "type": "destroyer",
        "tier": 1,
        "area": {
          "origin": [
            3,
            3
          ],
          "grid": [
            ".#####.",
            "#.....#",
            "#.....#",
            "#.....#",
            "#.....#",
            "#.....#",
            ".#####."
          ]
        },
        "intro": "Swallows a ring of blocks three cells out all around it, but misses everything in between. It's their first week and they have a lanyard.",
        "help": 1
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "delete_key",
    name: "the delete key",
    grid: [
        "XX"
      ],
    color: [["#8d929b","#a3a9b4","#a3a9b4","#a3a9b4","#a3a9b4","#a3a9b4","#a3a9b4","#a3a9b4","#a3a9b4","#a3a9b4","#a3a9b4","#a3a9b4","#a3a9b4","#8d929b"],["#a3a9b4","#dde2ea","#3e4658","#3e4658","#dde2ea","#dde2ea","#3e4658","#3e4658","#3e4658","#dde2ea","#3e4658","#dde2ea","#dde2ea","#a3a9b4"],["#a3a9b4","#dde2ea","#3e4658","#dde2ea","#3e4658","#dde2ea","#3e4658","#dde2ea","#dde2ea","#dde2ea","#3e4658","#dde2ea","#dde2ea","#a3a9b4"],["#a3a9b4","#dde2ea","#3e4658","#dde2ea","#3e4658","#dde2ea","#3e4658","#3e4658","#dde2ea","#dde2ea","#3e4658","#dde2ea","#dde2ea","#a3a9b4"],["#a3a9b4","#dde2ea","#3e4658","#dde2ea","#3e4658","#dde2ea","#3e4658","#dde2ea","#dde2ea","#dde2ea","#3e4658","#dde2ea","#dde2ea","#a3a9b4"],["#a3a9b4","#dde2ea","#3e4658","#3e4658","#dde2ea","#dde2ea","#3e4658","#3e4658","#3e4658","#dde2ea","#3e4658","#3e4658","#3e4658","#a3a9b4"],["#757b87","#888f9d","#888f9d","#888f9d","#888f9d","#888f9d","#888f9d","#888f9d","#888f9d","#888f9d","#888f9d","#888f9d","#888f9d","#757b87"]],
    powerup: {
        "type": "destroyer",
        "tier": 1,
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            ".........",
            "###......",
            "..###....",
            "....###..",
            "......###"
          ]
        },
        "intro": "Deletes a staircase of blocks stepping down to its right: three per step, four steps deep. Like the real key, it only ever deletes forwards.",
        "help": 1.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "egg_timer",
    name: "an egg timer that has run out",
    grid: [
        "X",
        "X"
      ],
    color: [["#69411e","#794b23","#794b23","#794b23","#794b23","#794b23","#69411e"],["#a26937","#dff6ff","#dff6ff","#dff6ff","#dff6ff","#dff6ff","#a26937"],["#a26937","#a8d8ef","#f5c242","#f5c242","#f5c242","#a8d8ef","#a26937"],["#a26937","#a8d8ef","#dff6ff","#f5c242","#dff6ff","#a8d8ef","#a26937"],["#a26937","#b8773f","#a8d8ef","#f5c242","#a8d8ef","#b8773f","#a26937"],["#a26937","#b8773f","#b8773f","#f5c242","#b8773f","#b8773f","#a26937"],["#a26937","#b8773f","#b8773f","#f5c242","#b8773f","#b8773f","#a26937"],["#a26937","#b8773f","#b8773f","#f5c242","#b8773f","#b8773f","#a26937"],["#a26937","#b8773f","#a8d8ef","#f5c242","#a8d8ef","#b8773f","#a26937"],["#a26937","#a8d8ef","#dff6ff","#f5c242","#dff6ff","#a8d8ef","#a26937"],["#a26937","#a8d8ef","#f5c242","#f5c242","#f5c242","#a8d8ef","#a26937"],["#a26937","#f5c242","#d99a2b","#f5c242","#d99a2b","#f5c242","#a26937"],["#a26937","#d99a2b","#f5c242","#d99a2b","#f5c242","#d99a2b","#a26937"],["#69411e","#794b23","#794b23","#794b23","#794b23","#794b23","#69411e"]],
    powerup: {
        "type": "destroyer",
        "tier": 2,
        "area": {
          "origin": [
            2,
            0
          ],
          "grid": [
            ".....",
            ".....",
            "#####",
            ".###.",
            "..#..",
            ".###.",
            "#####"
          ]
        },
        "intro": "Destroys an hourglass of blocks under it: 5 wide, then 3, 1, 3 and 5 wide again, five rows deep. Time's up for them. Also for the egg.",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "fizzing_aspirin",
    name: "a dissolving aspirin",
    grid: [
        "X"
      ],
    color: [["#6198ba","#b0d0e0","#d8dade","#d8dade","#d8dade","#b0d0e0","#6198ba"],["#b0d0e0","#f6f8fc","#f6f8fc","#f6f8fc","#f6f8fc","#f6f8fc","#70b0d8"],["#d8dade","#f6f8fc","#f6f8fc","#f6f8fc","#f6f8fc","#f6f8fc","#d8dade"],["#acb2be","#c3cad8","#c3cad8","#c3cad8","#c3cad8","#c3cad8","#acb2be"],["#d8dade","#f6f8fc","#f6f8fc","#f6f8fc","#f6f8fc","#f6f8fc","#d8dade"],["#70b0d8","#f6f8fc","#f6f8fc","#f6f8fc","#f6f8fc","#f6f8fc","#b0d0e0"],["#98b3c2","#70b0d8","#d8dade","#d8dade","#d8dade","#70b0d8","#98b3c2"]],
    powerup: {
        "type": "acid",
        "reach": 1,
        "tier": 3,
        "collapse": true,
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "-"
          ]
        },
        "intro": "Fizzes away every block touching it and then its whole row, wall to wall, and everything above drops down. Take two and call the stack in the morning.",
        "help": 4.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.6,
  },
  {
    id: "sugar_free_gummy",
    name: "a sugar-free gummy bear",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#932234","#ab283c","#d23e4c","#d23e4c","#d23e4c","#d23e4c","#d23e4c","#d23e4c","#d23e4c","#d23e4c","#ab283c","#932234"],["#ab283c","#ff9a9a","#c22d44","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#c22d44","#ff9a9a","#ab283c"],["#ab283c","#c22d44","#ef4656","#ef4656","#ff9a9a","#ff9a9a","#ef4656","#ef4656","#ef4656","#ef4656","#c22d44","#ab283c"],["#d23e4c","#ef4656","#ef4656","#ff9a9a","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#d23e4c"],["#d23e4c","#ef4656","#ef4656","#7a1428","#ef4656","#7a1428","#ef4656","#ef4656","#7a1428","#ef4656","#ef4656","#d23e4c"],["#d23e4c","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#d23e4c"],["#d23e4c","#ef4656","#ef4656","#ef4656","#ff7272","#ff7272","#ff7272","#ff7272","#ff7272","#ef4656","#ef4656","#d23e4c"],["#d23e4c","#ef4656","#ef4656","#ff7272","#ff7272","#9a1f33","#9a1f33","#9a1f33","#ff7272","#ff7272","#ef4656","#d23e4c"],["#d23e4c","#ef4656","#ef4656","#ff7272","#ff7272","#ff7272","#9a1f33","#ff7272","#ff7272","#ff7272","#ef4656","#d23e4c"],["#d23e4c","#ef4656","#ef4656","#ef4656","#ff7272","#ff7272","#ff7272","#ff7272","#ff7272","#ff7272","#ef4656","#d23e4c"],["#d23e4c","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#ef4656","#d23e4c"],["#b63541","#ab283c","#d23e4c","#d23e4c","#d23e4c","#d23e4c","#d23e4c","#d23e4c","#d23e4c","#d23e4c","#ab283c","#b63541"]],
    powerup: {
        "type": "acid",
        "reach": 3,
        "tier": 3,
        "intro": "Dissolves every block within three steps of it. Everything. Do not read the reviews.",
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.5,
  },
  {
    id: "bath_bomb",
    name: "a bath bomb (lavender, apparently)",
    grid: [
        "X"
      ],
    color: [["#997cb5","#e0e0e0","#b18fd1","#b18fd1","#b18fd1","#e0e0e0","#997cb5"],["#b18fd1","#c9a3ee","#ff9ccf","#c9a3ee","#c9a3ee","#8fe0c0","#b18fd1"],["#b18fd1","#a97fd6","#c9a3ee","#ffe36b","#c9a3ee","#c9a3ee","#b18fd1"],["#b18fd1","#c9a3ee","#ffe36b","#ffe36b","#ffe36b","#c9a3ee","#e089b6"],["#e089b6","#c9a3ee","#c9a3ee","#ffe36b","#a97fd6","#c9a3ee","#b18fd1"],["#b18fd1","#c9a3ee","#8fe0c0","#c9a3ee","#c9a3ee","#ff9ccf","#b18fd1"],["#c2c2c2","#b18fd1","#b18fd1","#b18fd1","#e0e0e0","#b18fd1","#997cb5"]],
    powerup: {
        "type": "acid",
        "reach": 2,
        "tier": 2,
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            ".",
            ".",
            ".",
            "#",
            "#",
            "#",
            "#"
          ]
        },
        "intro": "Fizzes away every block within two steps of it, then sinks and dissolves the four cells below that too. The bath is now purple. The bath will always be purple.",
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "vanishing_cream",
    name: "a pot of vanishing cream",
    grid: [
        "XX"
      ],
    color: [["#61a48a","#70be9f","#70be9f","#70be9f","#70be9f","#70be9f","#70be9f","#cad1da","#70be9f","#b2bece","#70be9f","#cad1da","#b2bece","#afb5bc"],["#4ba280","#55b892","#55b892","#55b892","#55b892","#55b892","#55b892","#cad8ea","#e6eef8","#55b892","#e6eef8","#cad8ea","#e6eef8","#b2bece"],["#d9d9dc","#f7f7fa","#f7f7fa","#f7f7fa","#f7f7fa","#f7f7fa","#f7f7fa","#e6eef8","#f7f7fa","#cad8ea","#e6eef8","#f7f7fa","#cad8ea","#cad1da"],["#d9d9dc","#ffc2d8","#ffc2d8","#ffc2d8","#ffc2d8","#f7f7fa","#f7f7fa","#e6eef8","#cad8ea","#f7f7fa","#e6eef8","#cad8ea","#e6eef8","#d9d9dc"],["#d9d9dc","#ffc2d8","#f7f7fa","#f7f7fa","#ffc2d8","#f7f7fa","#f7f7fa","#cad8ea","#f7f7fa","#e6eef8","#cad8ea","#f7f7fa","#e6eef8","#b2bece"],["#d9d9dc","#ffc2d8","#ffc2d8","#ffc2d8","#ffc2d8","#f7f7fa","#f7f7fa","#e6eef8","#cad8ea","#f7f7fa","#e6eef8","#cad8ea","#e6eef8","#d9d9dc"],["#bcbcbe","#d9d9dc","#d9d9dc","#d9d9dc","#d9d9dc","#d9d9dc","#d9d9dc","#b2bece","#d9d9dc","#cad1da","#d9d9dc","#b2bece","#d9d9dc","#afb5bc"]],
    powerup: {
        "type": "acid",
        "reach": 1,
        "tier": 2,
        "area": {
          "origin": [
            4,
            0
          ],
          "grid": [
            "..........",
            "##########"
          ]
        },
        "intro": "Dissolves every block touching the pot, and a thin layer of the row underneath, four cells out to each side. Half the pot has already vanished. It works.",
        "help": 1.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "bubble_bath",
    name: "an overflowing bubble bath",
    grid: [
        "XX"
      ],
    color: [["#c2c2c2","#e0e0e0","#b6cee0","#e0e0e0","#e0e0e0","#b6cee0","#b6cee0","#e0be41","#e0be41","#e0e0e0","#e0e0e0","#b6cee0","#e0e0e0","#c2c2c2"],["#e0e0e0","#cfeaff","#ffffff","#ffffff","#cfeaff","#ffffff","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ff9a3a","#cfeaff","#ffffff","#b6cee0"],["#b6cee0","#ffffff","#ffffff","#cfeaff","#ffffff","#ffffff","#ffd84a","#3a3a4a","#ffd84a","#ffd84a","#ff9a3a","#ff9a3a","#ffffff","#b6cee0"],["#e0e0e0","#ffffff","#cfeaff","#ffffff","#ffffff","#cfeaff","#ffd84a","#ffd84a","#ffd84a","#ffd84a","#ffffff","#cfeaff","#ffffff","#e0e0e0"],["#b6cee0","#ffffff","#ffffff","#ffffff","#cfeaff","#ffffff","#ffffff","#ffd84a","#ffd84a","#ffffff","#ffffff","#ffffff","#cfeaff","#e0e0e0"],["#8cb7d8","#cfeaff","#ffffff","#9fd0f5","#cfeaff","#ffffff","#9fd0f5","#cfeaff","#ffffff","#9fd0f5","#cfeaff","#ffffff","#9fd0f5","#b6cee0"],["#799eba","#8cb7d8","#b6cee0","#8cb7d8","#8cb7d8","#b6cee0","#8cb7d8","#8cb7d8","#b6cee0","#8cb7d8","#8cb7d8","#b6cee0","#8cb7d8","#799eba"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "fill": [
          [
            "#cfeaff",
            "#ffffff",
            "#ffffff",
            "#cfeaff",
            "#9fd0f5",
            "#cfeaff",
            "#cfeaff"
          ],
          [
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#cfeaff",
            "#ffffff",
            "#cfeaff"
          ],
          [
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#cfeaff",
            "#9fd0f5",
            "#ffffff",
            "#ffffff"
          ],
          [
            "#cfeaff",
            "#ffffff",
            "#cfeaff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#cfeaff"
          ],
          [
            "#9fd0f5",
            "#cfeaff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#cfeaff",
            "#9fd0f5"
          ],
          [
            "#cfeaff",
            "#cfeaff",
            "#ffffff",
            "#cfeaff",
            "#ffffff",
            "#cfeaff",
            "#ffffff"
          ],
          [
            "#ffffff",
            "#cfeaff",
            "#9fd0f5",
            "#cfeaff",
            "#cfeaff",
            "#ffffff",
            "#ffffff"
          ]
        ],
        "area": {
          "origin": [
            2,
            0
          ],
          "grid": [
            "......",
            "######",
            ".####.",
            "..##.."
          ]
        },
        "intro": "Bubbles fill every empty cell in a bowl under it: 6 wide, then 4, then 2. There is a duck in there somewhere and it is fine.",
        "help": 1.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "liquid_cat",
    name: "a cat (currently a liquid)",
    grid: [
        "X"
      ],
    color: [["#b87a2e","#b66b27","#d58d36","#d58d36","#d58d36","#b66b27","#b87a2e"],["#d58d36","#ffb3c6","#cf7a2c","#f2a03d","#cf7a2c","#ffb3c6","#d58d36"],["#d58d36","#f2a03d","#f2a03d","#f2a03d","#f2a03d","#f2a03d","#d58d36"],["#d58d36","#9be26a","#4a3420","#f2a03d","#4a3420","#9be26a","#d58d36"],["#d58d36","#f2a03d","#f2a03d","#f2a03d","#ff8fa8","#f2a03d","#d58d36"],["#d58d36","#ffe2b8","#ffe2b8","#ff8fa8","#ffe2b8","#ffe2b8","#d58d36"],["#9d5d21","#e0c7a2","#e0c7a2","#e0c7a2","#e0c7a2","#e0c7a2","#9d5d21"]],
    powerup: {
        "type": "expander",
        "tier": 2,
        "fill": [
          [
            "#f2a03d",
            "#f2a03d",
            "#cf7a2c",
            "#f2a03d",
            "#f2a03d",
            "#f2a03d",
            "#f2a03d"
          ],
          [
            "#f2a03d",
            "#f2a03d",
            "#f2a03d",
            "#cf7a2c",
            "#f2a03d",
            "#f2a03d",
            "#f2a03d"
          ],
          [
            "#f2a03d",
            "#9be26a",
            "#f2a03d",
            "#f2a03d",
            "#9be26a",
            "#f2a03d",
            "#f2a03d"
          ],
          [
            "#f2a03d",
            "#f2a03d",
            "#f2a03d",
            "#ff8fa8",
            "#f2a03d",
            "#f2a03d",
            "#f2a03d"
          ],
          [
            "#cf7a2c",
            "#f2a03d",
            "#ffe2b8",
            "#ffe2b8",
            "#ffe2b8",
            "#f2a03d",
            "#f2a03d"
          ],
          [
            "#f2a03d",
            "#f2a03d",
            "#f2a03d",
            "#f2a03d",
            "#cf7a2c",
            "#f2a03d",
            "#f2a03d"
          ],
          [
            "#f2a03d",
            "#cf7a2c",
            "#f2a03d",
            "#f2a03d",
            "#f2a03d",
            "#f2a03d",
            "#cf7a2c"
          ]
        ],
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            ".",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#",
            "#"
          ]
        },
        "intro": "Pours itself into every empty cell in the column under it, all the way to the floor. If it fits, it sits. It always fits.",
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "swelling_sponge",
    name: "a sponge that keeps swelling",
    grid: [
        "X"
      ],
    color: [["#3a9147","#29823e","#43a853","#29823e","#43a853","#29823e","#3a9147"],["#29823e","#4cbf5e","#2f9446","#4cbf5e","#2f9446","#4cbf5e","#29823e"],["#e0bc41","#ffd64a","#ffd64a","#ffd64a","#fff0a0","#ffd64a","#e0bc41"],["#e0bc41","#e0ae2a","#ffd64a","#ffd64a","#ffd64a","#e0ae2a","#e0bc41"],["#e0bc41","#ffd64a","#fff0a0","#e0ae2a","#ffd64a","#ffd64a","#e0bc41"],["#e0bc41","#e0ae2a","#ffd64a","#ffd64a","#ffd64a","#fff0a0","#e0bc41"],["#c2a338","#e0bc41","#e0bc41","#c59925","#e0bc41","#e0bc41","#c2a338"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "fill": [
          [
            "#ffd64a",
            "#ffd64a",
            "#ffd64a",
            "#e0ae2a",
            "#ffd64a",
            "#ffd64a",
            "#ffd64a"
          ],
          [
            "#ffd64a",
            "#e0ae2a",
            "#ffd64a",
            "#ffd64a",
            "#ffd64a",
            "#fff0a0",
            "#ffd64a"
          ],
          [
            "#ffd64a",
            "#ffd64a",
            "#ffd64a",
            "#ffd64a",
            "#e0ae2a",
            "#ffd64a",
            "#ffd64a"
          ],
          [
            "#fff0a0",
            "#ffd64a",
            "#e0ae2a",
            "#ffd64a",
            "#ffd64a",
            "#ffd64a",
            "#ffd64a"
          ],
          [
            "#ffd64a",
            "#ffd64a",
            "#ffd64a",
            "#ffd64a",
            "#ffd64a",
            "#e0ae2a",
            "#ffd64a"
          ],
          [
            "#ffd64a",
            "#e0ae2a",
            "#ffd64a",
            "#fff0a0",
            "#ffd64a",
            "#ffd64a",
            "#ffd64a"
          ],
          [
            "#ffd64a",
            "#ffd64a",
            "#ffd64a",
            "#ffd64a",
            "#ffd64a",
            "#ffd64a",
            "#e0ae2a"
          ]
        ],
        "area": {
          "origin": [
            3,
            3
          ],
          "grid": [
            "...#...",
            "...#...",
            "...#...",
            "###.###",
            "...#...",
            "...#...",
            "...#..."
          ]
        },
        "intro": "Swells into a plus sign, filling the empty cells three out from it in all four directions. It has absorbed a whole sink and it wants more.",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "packing_peanuts",
    name: "a box of packing peanuts",
    grid: [
        "XX",
        "XX"
      ],
    color: [["#c2beb6","#e0dcd3","#c2b699","#e0dcd3","#e0dcd3","#e0dcd3","#c2b699","#e0dcd3","#e0dcd3","#c2b699","#e0dcd3","#c2beb6"],["#e0dcd3","#dccfae","#fffaf0","#fffaf0","#fffaf0","#dccfae","#fffaf0","#fffaf0","#fffaf0","#fffaf0","#dccfae","#e0dcd3"],["#c8a26a","#e3b878","#e3b878","#e3b878","#e3b878","#e3b878","#e3b878","#e3b878","#e3b878","#e3b878","#e3b878","#c8a26a"],["#ac7941","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#ac7941"],["#ac7941","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#e8434f","#e8434f","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#ac7941"],["#ac7941","#c48a4a","#c48a4a","#c48a4a","#e8434f","#e8434f","#e8434f","#e8434f","#c48a4a","#c48a4a","#c48a4a","#ac7941"],["#ac7941","#c48a4a","#c48a4a","#e8434f","#e8434f","#e8434f","#e8434f","#e8434f","#e8434f","#c48a4a","#c48a4a","#ac7941"],["#ac7941","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#e8434f","#e8434f","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#ac7941"],["#ac7941","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#e8434f","#e8434f","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#ac7941"],["#ac7941","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#e8434f","#e8434f","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#ac7941"],["#ac7941","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#c48a4a","#9c6a36","#c48a4a","#ac7941"],["#956938","#895d30","#ac7941","#ac7941","#ac7941","#ac7941","#ac7941","#ac7941","#ac7941","#ac7941","#ac7941","#956938"]],
    powerup: {
        "type": "expander",
        "tier": 2,
        "fill": [
          [
            "#dccfae",
            "#fffaf0",
            "#fffaf0",
            "#f2ead6",
            "#f2ead6",
            "#f2ead6",
            "#f2ead6"
          ],
          [
            "#fffaf0",
            "#fffaf0",
            "#dccfae",
            "#f2ead6",
            "#dccfae",
            "#fffaf0",
            "#f2ead6"
          ],
          [
            "#f2ead6",
            "#f2ead6",
            "#f2ead6",
            "#f2ead6",
            "#dccfae",
            "#fffaf0",
            "#f2ead6"
          ],
          [
            "#fffaf0",
            "#fffaf0",
            "#f2ead6",
            "#f2ead6",
            "#f2ead6",
            "#f2ead6",
            "#f2ead6"
          ],
          [
            "#fffaf0",
            "#dccfae",
            "#fffaf0",
            "#f2ead6",
            "#f2ead6",
            "#dccfae",
            "#fffaf0"
          ],
          [
            "#f2ead6",
            "#dccfae",
            "#fffaf0",
            "#f2ead6",
            "#f2ead6",
            "#fffaf0",
            "#dccfae"
          ],
          [
            "#f2ead6",
            "#f2ead6",
            "#f2ead6",
            "#f2ead6",
            "#f2ead6",
            "#f2ead6",
            "#f2ead6"
          ]
        ],
        "area": {
          "origin": [
            2,
            0
          ],
          "grid": [
            "##..##",
            "##..##",
            "######",
            "######"
          ]
        },
        "intro": "Fills every empty cell in the gaps either side of it, two out, and in the two rows under it, six wide. Nobody has ever successfully put them back in the box.",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "stuffed_duvet",
    name: "a duvet being stuffed into its cover",
    grid: [
        "XXX"
      ],
    color: [["#5d7fb0","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#d5d8e0","#d5d8e0","#b0bcd3","#d5d8e0","#d5d8e0","#b8bbc2"],["#6b93cc","#7aa7e8","#ffe07a","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#ffe07a","#7aa7e8","#7aa7e8","#7aa7e8","#f2f6ff","#f2f6ff","#f2f6ff","#c8d6f0","#f2f6ff","#d5d8e0"],["#6b93cc","#7aa7e8","#7aa7e8","#7aa7e8","#4f80c8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#4f80c8","#f2f6ff","#f2f6ff","#f2f6ff","#c8d6f0","#d5d8e0"],["#6b93cc","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#ffe07a","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#4f80c8","#f2f6ff","#f2f6ff","#f2f6ff","#d5d8e0"],["#6b93cc","#ffe07a","#4f80c8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#7aa7e8","#ffe07a","#4f80c8","#f2f6ff","#c8d6f0","#f2f6ff","#f2f6ff","#d5d8e0"],["#5d7fb0","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#6b93cc","#d5d8e0","#d5d8e0","#b0bcd3","#b8bbc2"]],
    powerup: {
        "type": "expander",
        "tier": 3,
        "fill": [
          [
            "#f2f6ff",
            "#f2f6ff",
            "#f2f6ff",
            "#c8d6f0",
            "#f2f6ff",
            "#f2f6ff",
            "#f2f6ff"
          ],
          [
            "#f2f6ff",
            "#f2f6ff",
            "#f2f6ff",
            "#c8d6f0",
            "#f2f6ff",
            "#f2f6ff",
            "#f2f6ff"
          ],
          [
            "#f2f6ff",
            "#f2f6ff",
            "#f2f6ff",
            "#c8d6f0",
            "#f2f6ff",
            "#f2f6ff",
            "#f2f6ff"
          ],
          [
            "#c8d6f0",
            "#c8d6f0",
            "#c8d6f0",
            "#c8d6f0",
            "#c8d6f0",
            "#c8d6f0",
            "#c8d6f0"
          ],
          [
            "#f2f6ff",
            "#f2f6ff",
            "#f2f6ff",
            "#c8d6f0",
            "#f2f6ff",
            "#f2f6ff",
            "#f2f6ff"
          ],
          [
            "#f2f6ff",
            "#f2f6ff",
            "#f2f6ff",
            "#c8d6f0",
            "#f2f6ff",
            "#f2f6ff",
            "#f2f6ff"
          ],
          [
            "#f2f6ff",
            "#f2f6ff",
            "#f2f6ff",
            "#c8d6f0",
            "#f2f6ff",
            "#f2f6ff",
            "#f2f6ff"
          ]
        ],
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "...",
            "-..",
            "-.."
          ]
        },
        "intro": "Fills every empty cell in the two rows under it, wall to wall, right into the corners. Nobody has ever got the corners. Until now.",
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.5,
  },
  {
    id: "snow_drift",
    name: "a snowball that wants to be a drift",
    grid: [
        "X"
      ],
    color: [["#adb6c2","#e0e0e0","#e0e0e0","#e0e0e0","#e0e0e0","#e0e0e0","#adb6c2"],["#e0e0e0","#ffffff","#ffffff","#ffffff","#b8cff0","#ffffff","#e0e0e0"],["#e0e0e0","#b8cff0","#ffffff","#ffffff","#ffffff","#ffffff","#c9d2e0"],["#e0e0e0","#ffffff","#ffffff","#ffffff","#ffffff","#e4efff","#c9d2e0"],["#e0e0e0","#ffffff","#ffffff","#b8cff0","#e4efff","#b8cff0","#c9d2e0"],["#e0e0e0","#ffffff","#e4efff","#e4efff","#e4efff","#b8cff0","#a2b6d3"],["#adb6c2","#c9d2e0","#a2b6d3","#c9d2e0","#a2b6d3","#a2b6d3","#8c9db6"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "fill": [
          [
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#e4efff",
            "#ffffff",
            "#ffffff",
            "#ffffff"
          ],
          [
            "#ffffff",
            "#e4efff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#e4efff"
          ],
          [
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#b8cff0",
            "#ffffff",
            "#ffffff"
          ],
          [
            "#e4efff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#e4efff"
          ],
          [
            "#ffffff",
            "#ffffff",
            "#b8cff0",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#ffffff"
          ],
          [
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#e4efff",
            "#ffffff",
            "#b8cff0"
          ],
          [
            "#ffffff",
            "#e4efff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#ffffff",
            "#ffffff"
          ]
        ],
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            ".##....",
            "#####..",
            "#######"
          ]
        },
        "intro": "Drifts off to the right, filling empty cells: two beside it, five in the row under it, seven in the row under that. The wind only ever blows one way here.",
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "autumn_leaves",
    name: "a pile of autumn leaves",
    grid: [
        "XX"
      ],
    color: [["#c2a038","#e0b941","#e0b941","#e07b25","#e0b941","#e0b941","#e0b941","#c59325","#e0b941","#e0b941","#e0b941","#cc3b46","#e0b941","#c2a038"],["#e0b941","#ff8c2a","#ffd24a","#ff8c2a","#ffd24a","#ff8c2a","#ffd24a","#ffd24a","#ffd24a","#e8434f","#ffd24a","#e8434f","#ffd24a","#cc3b46"],["#e0b941","#ff8c2a","#ff8c2a","#ff8c2a","#ff8c2a","#ff8c2a","#ffd24a","#e0a72a","#ffd24a","#e8434f","#e8434f","#e8434f","#e8434f","#cc3b46"],["#e0b941","#ffd24a","#ff8c2a","#ff8c2a","#ff8c2a","#ffd24a","#ffd24a","#ffd24a","#ffd24a","#ffd24a","#e8434f","#e8434f","#e8434f","#e0b941"],["#e0b941","#ff8c2a","#ff8c2a","#ff8c2a","#ff8c2a","#ff8c2a","#ffd24a","#ffd24a","#e0a72a","#e8434f","#e8434f","#e8434f","#e8434f","#cc3b46"],["#e0b941","#ffd24a","#ffd24a","#9c6a36","#ffd24a","#ffd24a","#e0a72a","#ffd24a","#ffd24a","#ffd24a","#ffd24a","#9c6a36","#ffd24a","#e0b941"],["#aa7f20","#e0b941","#e0b941","#895d30","#e0b941","#e0b941","#e0b941","#e0b941","#c59325","#e0b941","#e0b941","#895d30","#e0b941","#aa7f20"]],
    powerup: {
        "type": "expander",
        "tier": 1,
        "fill": [
          [
            "#ff8c2a",
            "#d9601e",
            "#ff8c2a",
            "#ffd24a",
            "#ffd24a",
            "#e0a72a",
            "#ff8c2a"
          ],
          [
            "#ff8c2a",
            "#ff8c2a",
            "#d9601e",
            "#ffd24a",
            "#e0a72a",
            "#ffd24a",
            "#ffd24a"
          ],
          [
            "#e8434f",
            "#e8434f",
            "#ff8c2a",
            "#d9601e",
            "#ff8c2a",
            "#ffd24a",
            "#d9601e"
          ],
          [
            "#e8434f",
            "#b52a3a",
            "#e8434f",
            "#ff8c2a",
            "#ff8c2a",
            "#ff8c2a",
            "#ff8c2a"
          ],
          [
            "#b52a3a",
            "#e8434f",
            "#e8434f",
            "#9c6a36",
            "#ffd24a",
            "#ffd24a",
            "#ff8c2a"
          ],
          [
            "#ff8c2a",
            "#ff8c2a",
            "#e8434f",
            "#e8434f",
            "#ffd24a",
            "#e0a72a",
            "#ffd24a"
          ],
          [
            "#ff8c2a",
            "#d9601e",
            "#e8434f",
            "#b52a3a",
            "#ff8c2a",
            "#ffd24a",
            "#ffd24a"
          ]
        ],
        "area": {
          "origin": [
            4,
            0
          ],
          "grid": [
            "..........",
            "...####...",
            "..##..##..",
            ".##....##.",
            "##......##"
          ]
        },
        "intro": "Leaves drift down in two trails falling away from it, filling the empty cells: four under it, then two-wide steps out to each side, four rows deep. Someone has to rake all this.",
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 1,
  },
  {
    id: "self_raising_cake",
    name: "a self-raising cake",
    grid: [
        "XX"
      ],
    color: [["#c2889f","#e09eb8","#e0d8dc","#e09eb8","#e09eb8","#e09eb8","#e09eb8","#4fa84f","#e03445","#e09eb8","#e09eb8","#e09eb8","#e0d8dc","#c2889f"],["#e09eb8","#ffb3d1","#ffb3d1","#ffb3d1","#ffb3d1","#ffb3d1","#ff3b4e","#ff3b4e","#ff3b4e","#ff3b4e","#ffb3d1","#ffb3d1","#ffb3d1","#e09eb8"],["#e079a2","#ffb3d1","#ff8ab8","#ffb3d1","#ff8ab8","#ff8ab8","#ffb3d1","#ff3b4e","#ff3b4e","#ff8ab8","#ffb3d1","#ff8ab8","#ffb3d1","#e079a2"],["#cc9b55","#e8b061","#e8b061","#c98c3e","#e8b061","#e8b061","#e8b061","#e8b061","#e8b061","#e8b061","#c98c3e","#e8b061","#e8b061","#cc9b55"],["#cc3b46","#e8434f","#e8434f","#e8434f","#e8434f","#e8434f","#e8434f","#e8434f","#e8434f","#e8434f","#e8434f","#e8434f","#e8434f","#cc3b46"],["#cc9b55","#e8b061","#c98c3e","#e8b061","#e8b061","#e8b061","#e8b061","#c98c3e","#e8b061","#e8b061","#e8b061","#e8b061","#c98c3e","#cc9b55"],["#b0864a","#cc9b55","#cc9b55","#cc9b55","#cc9b55","#b17b37","#cc9b55","#cc9b55","#cc9b55","#cc9b55","#cc9b55","#cc9b55","#b17b37","#b0864a"]],
    powerup: {
        "type": "expander",
        "tier": 3,
        "fill": [
          [
            "#e8b061",
            "#e8b061",
            "#e8b061",
            "#c98c3e",
            "#e8b061",
            "#e8b061",
            "#e8b061"
          ],
          [
            "#e8b061",
            "#c98c3e",
            "#e8b061",
            "#e8b061",
            "#e8b061",
            "#e8b061",
            "#c98c3e"
          ],
          [
            "#e8b061",
            "#e8b061",
            "#e8b061",
            "#e8b061",
            "#c98c3e",
            "#e8b061",
            "#e8b061"
          ],
          [
            "#e8434f",
            "#e8434f",
            "#e8434f",
            "#e8434f",
            "#e8434f",
            "#e8434f",
            "#e8434f"
          ],
          [
            "#e8b061",
            "#c98c3e",
            "#e8b061",
            "#e8b061",
            "#e8b061",
            "#e8b061",
            "#e8b061"
          ],
          [
            "#e8b061",
            "#e8b061",
            "#e8b061",
            "#c98c3e",
            "#e8b061",
            "#e8b061",
            "#c98c3e"
          ],
          [
            "#e8b061",
            "#e8b061",
            "#e8b061",
            "#e8b061",
            "#e8b061",
            "#e8b061",
            "#e8b061"
          ]
        ],
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "-"
          ]
        },
        "intro": "Rises sideways and fills every empty cell in its own row, wall to wall. It is self-raising, not self-aware, so it does not know where to stop.",
        "help": 1
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.6,
  },
  {
    id: "neutrino",
    name: "a neutrino (it went straight through you)",
    grid: [
        "X"
      ],
    color: [["#746bbd","#695dce","#695dce","#877cdb","#695dce","#695dce","#746bbd"],["#a3d1db","#bdf3ff","#bdf3ff","#9d90ff","#55c8ff","#55c8ff","#877cdb"],["#877cdb","#7a6cf0","#7a6cf0","#55c8ff","#bdf3ff","#ffffff","#49acdb"],["#a3d1db","#bdf3ff","#bdf3ff","#bdf3ff","#ffffff","#ffffff","#a3d1db"],["#877cdb","#7a6cf0","#7a6cf0","#55c8ff","#bdf3ff","#ffffff","#49acdb"],["#a3d1db","#bdf3ff","#bdf3ff","#9d90ff","#55c8ff","#55c8ff","#877cdb"],["#746bbd","#695dce","#695dce","#877cdb","#695dce","#695dce","#746bbd"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Passes straight through your blocks and stops in the deepest gap it fits, where it stays. Trillions of them go through you every second. This one finally sat down.",
        "help": 2.5
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "vanishing_coin",
    name: "a magician's disappearing coin",
    grid: [
        "X"
      ],
    color: [["#9382b7","#c9bbdb","#bb841d","#bb841d","#bb841d","#c9bbdb","#9382b7"],["#c9bbdb","#d99a22","#fff3a6","#fff3a6","#ffd447","#ffd447","#c9bbdb"],["#bb841d","#fff3a6","#fff3a6","#ffd447","#ffd447","#d99a22","#dbdbdb"],["#bb841d","#fff3a6","#ffd447","#ffd447","#ffd447","#d99a22","#aa97d4"],["#bb841d","#ffd447","#ffd447","#ffd447","#d99a22","#c6b0f7","#c9bbdb"],["#c9bbdb","#d99a22","#ffd447","#d99a22","#d99a22","#ead9ff","#dbdbdb"],["#9382b7","#c9bbdb","#bb841d","#bb841d","#c9bbdb","#aa97d4","#ada1bd"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Vanishes through your blocks and reappears in the deepest gap it fits, and stays there. Is this your gap?",
        "help": 2
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "schrodingers_box",
    name: "schrödinger's cat box",
    grid: [
        "XX"
      ],
    color: [["#865c33","#9c6c3b","#9c6c3b","#9c6c3b","#9c6c3b","#9c6c3b","#ceb384","#ceb384","#9c6c3b","#9c6c3b","#9c6c3b","#9c6c3b","#9c6c3b","#865c33"],["#bb8a53","#d9a061","#d9a061","#d9a061","#d9a061","#d9a061","#efd09a","#efd09a","#d9a061","#fff7e6","#fff7e6","#fff7e6","#d9a061","#bb8a53"],["#bb8a53","#4a2f2a","#4a2f2a","#4a2f2a","#4a2f2a","#4a2f2a","#efd09a","#efd09a","#d9a061","#d9a061","#d9a061","#fff7e6","#d9a061","#bb8a53"],["#bb8a53","#4a2f2a","#9dff6a","#4a2f2a","#9dff6a","#4a2f2a","#efd09a","#efd09a","#d9a061","#d9a061","#fff7e6","#d9a061","#d9a061","#bb8a53"],["#bb8a53","#4a2f2a","#4a2f2a","#4a2f2a","#4a2f2a","#4a2f2a","#efd09a","#efd09a","#d9a061","#d9a061","#d9a061","#d9a061","#d9a061","#bb8a53"],["#bb8a53","#d9a061","#d9a061","#d9a061","#d9a061","#d9a061","#efd09a","#efd09a","#d9a061","#d9a061","#fff7e6","#d9a061","#d9a061","#bb8a53"],["#865c33","#9c6c3b","#9c6c3b","#9c6c3b","#9c6c3b","#9c6c3b","#ceb384","#ceb384","#9c6c3b","#9c6c3b","#9c6c3b","#9c6c3b","#9c6c3b","#865c33"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Sinks straight through your blocks into the deepest gap it fits, and stays there. Until it lands, the cat inside is both fine and extremely fine.",
        "help": 2.5
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.9,
  },
  {
    id: "trenchcoat_spy",
    name: "a spy in a trench coat",
    grid: [
        "X",
        "X",
        "X"
      ],
    color: [["#523722","#5f4028","#5f4028","#5f4028","#5f4028","#523722"],["#5f4028","#94653d","#94653d","#94653d","#94653d","#5f4028"],["#34241d","#3c2a22","#3c2a22","#3c2a22","#3c2a22","#34241d"],["#cea584","#f0c09a","#f0c09a","#f0c09a","#f0c09a","#cea584"],["#262d3e","#2c3448","#f0c09a","#2c3448","#2c3448","#cea584"],["#cea584","#f0c09a","#f0c09a","#d89a78","#f0c09a","#cea584"],["#ba9e67","#b89656","#f0c09a","#f0c09a","#d8b878","#9e814a"],["#ba9e67","#d8b878","#b89656","#b89656","#d8b878","#ba9e67"],["#ba9e67","#b89656","#d8b878","#d8b878","#b89656","#ba9e67"],["#ba9e67","#d8b878","#d8b878","#3c2a22","#d8b878","#ba9e67"],["#ba9e67","#b89656","#d8b878","#3c2a22","#d8b878","#ba9e67"],["#ba9e67","#d8b878","#d8b878","#3c2a22","#d8b878","#ba9e67"],["#775b32","#8a6a3a","#8a6a3a","#3c2a22","#8a6a3a","#775b32"],["#5c4424","#6b4f2a","#6b4f2a","#6b4f2a","#6b4f2a","#5c4424"],["#ba9e67","#d8b878","#d8b878","#3c2a22","#d8b878","#ba9e67"],["#ba9e67","#b89656","#d8b878","#d8b878","#d8b878","#ba9e67"],["#ba9e67","#b89656","#d8b878","#d8b878","#d8b878","#ba9e67"],["#664e2b","#775b32","#ba9e67","#775b32","#775b32","#664e2b"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Slips down through your blocks unseen and takes up position in the deepest gap it fits. This message will self-destruct. The spy will not: it stays.",
        "help": 2
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
  },
  {
    id: "jellyfish",
    name: "a jellyfish (mostly water, partly sneaking)",
    grid: [
        "XXX",
        ".X."
      ],
    color: [["#a6538b","#c160a2","#db7bb3","#db7bb3","#db7bb3","#db7bb3","#db7bb3","#db7bb3","#db7bb3","#db7bb3","#db7bb3","#db7bb3","#db7bb3","#db7bb3","#db7bb3","#db7bb3","#c160a2","#a6538b"],["#c160a2","#ff8fd0","#ffc4ea","#ffc4ea","#ffc4ea","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ffc4ea","#c160a2"],["#db7bb3","#ffc4ea","#ffffff","#ffc4ea","#ffc4ea","#ff8fd0","#ff8fd0","#5a2350","#ff8fd0","#ff8fd0","#ff8fd0","#5a2350","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#db7bb3"],["#db7bb3","#ffc4ea","#ffc4ea","#ffc4ea","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ffc4ea","#db7bb3"],["#db7bb3","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#5a2350","#5a2350","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#ff8fd0","#db7bb3"],["#823772","#db7bb3","#974084","#db7bb3","#974084","#db7bb3","#b04a9a","#ff8fd0","#b04a9a","#ff8fd0","#b04a9a","#ff8fd0","#974084","#db7bb3","#974084","#db7bb3","#974084","#bd6a9a"],["","","","","","","#ba539b","#ffc4ea","#d860b4","#ffc4ea","#d860b4","#dba9c9","","","","","",""],["","","","","","","#ba539b","#ffc4ea","#d860b4","#ffc4ea","#d860b4","#dba9c9","","","","","",""],["","","","","","","#dba9c9","#d860b4","#ffc4ea","#d860b4","#ffc4ea","#ba539b","","","","","",""],["","","","","","","#dba9c9","#d860b4","#ffc4ea","#d860b4","#ffc4ea","#ba539b","","","","","",""],["","","","","","","#ba539b","#ffc4ea","#d860b4","#ffc4ea","#d860b4","#dba9c9","","","","","",""],["","","","","","","#a04785","#dba9c9","#ba539b","#dba9c9","#ba539b","#bd91ad","","","","","",""]],
    powerup: {
        "type": "phantom",
        "tier": 2,
        "intro": "Drifts down through your blocks into the deepest gap it fits, and stays there. It has no brain, and it still found the best spot.",
        "help": 1
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.7,
  },
  {
    id: "slippery_seal",
    name: "a slippery seal",
    grid: [
        "..X",
        "XXX"
      ],
    color: [["","","","","","","","","","","","","#5e6a7b","#6d7b8f","#9da9b8","#9da9b8","#6d7b8f","#5e6a7b"],["","","","","","","","","","","","","#6d7b8f","#b6c4d6","#7f8fa6","#7f8fa6","#7f8fa6","#6d7b8f"],["","","","","","","","","","","","","#6d7b8f","#1e2633","#ffffff","#7f8fa6","#7f8fa6","#6d7b8f"],["","","","","","","","","","","","","#6d7b8f","#1e2633","#1e2633","#7f8fa6","#2e3644","#282e3a"],["","","","","","","","","","","","","#6d7b8f","#7f8fa6","#c9d3df","#ffffff","#c9d3df","#dbdbdb"],["","","","","","","","","","","","","#6d7b8f","#7f8fa6","#c9d3df","#c9d3df","#c9d3df","#adb5c0"],["#465162","#525f72","#6d7b8f","#6d7b8f","#6d7b8f","#9da9b8","#9da9b8","#9da9b8","#9da9b8","#9da9b8","#6d7b8f","#6d7b8f","#7f8fa6","#7f8fa6","#7f8fa6","#c9d3df","#c9d3df","#6d7b8f"],["#525f72","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#c9d3df","#c9d3df","#c9d3df","#6d7b8f"],["#525f72","#5f6e84","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#7f8fa6","#c9d3df","#c9d3df","#c9d3df","#6d7b8f"],["#525f72","#7f8fa6","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#7f8fa6","#6d7b8f"],["#525f72","#5f6e84","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#c9d3df","#5f6e84","#5f6e84","#5f6e84","#c9d3df","#6d7b8f"],["#465162","#6d7b8f","#adb5c0","#adb5c0","#adb5c0","#adb5c0","#adb5c0","#adb5c0","#adb5c0","#adb5c0","#adb5c0","#adb5c0","#adb5c0","#adb5c0","#525f72","#525f72","#adb5c0","#5e6a7b"]],
    powerup: {
        "type": "phantom",
        "tier": 2,
        "intro": "Slides down through your blocks on its belly into the deepest gap it fits, and stays there. Nobody has ever kept hold of a seal. Arf.",
        "help": 1
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.7,
  },
  {
    id: "greased_lightning",
    name: "greased lightning",
    grid: [
        "X.",
        "XX",
        ".X"
      ],
    color: [["#b47221","#dbc240","#dbc240","#dbc240","#dbc240","#b47221","","","","","",""],["#d18426","#ffe14a","#ffffff","#ffe14a","#ffe14a","#d18426","","","","","",""],["#d18426","#ffe14a","#ffe14a","#ffffff","#ffe14a","#d18426","","","","","",""],["#d18426","#ffe14a","#ffe14a","#ffffff","#ffe14a","#d18426","","","","","",""],["#d18426","#ffe14a","#ffe14a","#ffe14a","#ffffff","#d18426","","","","","",""],["#d18426","#ffe14a","#ffe14a","#ffe14a","#ffffff","#dbc240","","","","","",""],["#d18426","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffffff","#dbc240","#dbc240","#dbc240","#dbc240","#dbc240","#b47221"],["#d18426","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffffff","#ffffff","#ffe14a","#ffe14a","#ffe14a","#d18426"],["#d18426","#8a4a1a","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffffff","#ffe14a","#ffe14a","#d18426"],["#d18426","#8a4a1a","#8a4a1a","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffffff","#ffe14a","#d18426"],["#d18426","#f39a2c","#8a4a1a","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffffff","#d18426"],["#b47221","#d18426","#d18426","#dbc240","#dbc240","#dbc240","#ffe14a","#ffe14a","#ffe14a","#ffe14a","#ffffff","#d18426"],["","","","","","","#d18426","#ffe14a","#ffe14a","#ffe14a","#ffffff","#d18426"],["","","","","","","#d18426","#ffe14a","#ffe14a","#ffffff","#ffe14a","#d18426"],["","","","","","","#d18426","#ffe14a","#ffffff","#ffe14a","#ffe14a","#d18426"],["","","","","","","#d18426","#ffe14a","#ffffff","#ffe14a","#8a4a1a","#d18426"],["","","","","","","#d18426","#ffe14a","#ffffff","#ffe14a","#f39a2c","#d18426"],["","","","","","","#b47221","#d18426","#dbdbdb","#d18426","#d18426","#b47221"]],
    powerup: {
        "type": "phantom",
        "tier": 2,
        "intro": "Zaps straight down through your blocks into the deepest gap it fits, and stays there. Lightning never strikes the same place twice. Greased lightning never strikes anything.",
        "help": 1
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.6,
  },
  {
    id: "fish_got_away",
    name: "the fish that got away",
    grid: [
        "XXX"
      ],
    color: [["#23665c","#28776b","#44a790","#44a790","#44a790","#44a790","#77c6b2","#44a790","#44a790","#44a790","#44a790","#44a790","#44a790","#286b64","#5fbaa4","#5fbaa4","#5fbaa4","#52a08d"],["#28776b","#4fc2a8","#4fc2a8","#14303a","#4fc2a8","#8ae6cf","#8ae6cf","#8ae6cf","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#2f7c74","#2f7c74","#6fd8bf","#6fd8bf","#286b64"],["#c8c8ce","#2f8a7c","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#2f7c74","#2f7c74","#2f7c74","#286b64"],["#c8c8ce","#e8e8f0","#2f8a7c","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#4fc2a8","#2f7c74","#2f7c74","#2f7c74","#286b64"],["#28776b","#2f8a7c","#d9f4e2","#d9f4e2","#d9f4e2","#d9f4e2","#d9f4e2","#d9f4e2","#d9f4e2","#d9f4e2","#d9f4e2","#d9f4e2","#4fc2a8","#2f7c74","#2f7c74","#6fd8bf","#6fd8bf","#286b64"],["#23665c","#28776b","#28776b","#bbd2c2","#bbd2c2","#bbd2c2","#bbd2c2","#bbd2c2","#bbd2c2","#bbd2c2","#bbd2c2","#44a790","#44a790","#286b64","#5fbaa4","#5fbaa4","#5fbaa4","#52a08d"]],
    powerup: {
        "type": "phantom",
        "tier": 1,
        "intro": "Wriggles off the hook and down through your blocks into the deepest gap it fits, and stays there. It was this big. Three blocks, honestly.",
        "help": 2.5
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.8,
  },
  {
    id: "wisp_of_fog",
    name: "a wisp of fog",
    grid: [
        "XX.X"
      ],
    color: [["#7d8794","#b5bdc8","#b5bdc8","#919dac","#919dac","#919dac","#b5bdc8","#b5bdc8","#b5bdc8","#919dac","#919dac","#7d8794","","","","","","","#7d8794","#919dac","#b5bdc8","#b5bdc8","#919dac","#7d8794"],["#b5bdc8","#f4f7fb","#f4f7fb","#d3dce8","#d3dce8","#a9b6c8","#d3dce8","#f4f7fb","#f4f7fb","#f4f7fb","#d3dce8","#b5bdc8","","","","","","","#b5bdc8","#f4f7fb","#f4f7fb","#d3dce8","#d3dce8","#b5bdc8"],["#b5bdc8","#f4f7fb","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#f4f7fb","#d3dce8","#d3dce8","#d3dce8","#b5bdc8","","","","","","","#b5bdc8","#d3dce8","#f4f7fb","#f4f7fb","#d3dce8","#919dac"],["#b5bdc8","#d3dce8","#d3dce8","#d3dce8","#a9b6c8","#a9b6c8","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#919dac","","","","","","","#b5bdc8","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#919dac"],["#919dac","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#b5bdc8","","","","","","","#919dac","#d3dce8","#d3dce8","#d3dce8","#d3dce8","#919dac"],["#7d8794","#919dac","#919dac","#919dac","#919dac","#919dac","#919dac","#919dac","#919dac","#919dac","#919dac","#7d8794","","","","","","","#7d8794","#919dac","#919dac","#919dac","#919dac","#7d8794"]],
    powerup: {
        "type": "phantom",
        "tier": 2,
        "intro": "Rolls down through your blocks and settles in the deepest gap its three puffs fit (two together, a gap, then one), and stays there. Visibility: poor.",
        "help": 1.5
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.6,
  },
  {
    id: "pickpockets_hand",
    name: "a pickpocket's hand",
    grid: [
        "XXX",
        "X.."
      ],
    color: [["#b39376","#d0ab8a","#d0ab8a","#d0ab8a","#d0ab8a","#dbdbdb","#c8cbd4","#38457b","#c8cbd4","#38457b","#c8cbd4","#38457b","#c8cbd4","#38457b","#c8cbd4","#38457b","#c8cbd4","#303b6a"],["#d0ab8a","#f2c7a0","#f2c7a0","#f2c7a0","#f2c7a0","#f2c7a0","#ffffff","#41508f","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#38457b"],["#d0ab8a","#f2c7a0","#f2c7a0","#f2c7a0","#f2c7a0","#ffffff","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#38457b"],["#d0ab8a","#c98a64","#f2c7a0","#c98a64","#f2c7a0","#ffffff","#ffffff","#41508f","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#38457b"],["#d0ab8a","#c98a64","#f2c7a0","#c98a64","#f2c7a0","#ffffff","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#41508f","#e8ecf6","#38457b"],["#d0ab8a","#c98a64","#f2c7a0","#c98a64","#f2c7a0","#ffffff","#dbdbdb","#38457b","#c8cbd4","#38457b","#c8cbd4","#38457b","#c8cbd4","#38457b","#c8cbd4","#38457b","#c8cbd4","#303b6a"],["#d0ab8a","#8a4f26","#f2c7a0","#8a4f26","#f2c7a0","#774421","","","","","","","","","","","",""],["#774421","#7ed36a","#7ed36a","#7ed36a","#8a4f26","#774421","","","","","","","","","","","",""],["#774421","#b06a34","#b06a34","#b06a34","#b06a34","#774421","","","","","","","","","","","",""],["#774421","#b06a34","#b06a34","#ffd447","#b06a34","#774421","","","","","","","","","","","",""],["#774421","#b06a34","#b06a34","#b06a34","#b06a34","#774421","","","","","","","","","","","",""],["#663a1c","#774421","#774421","#774421","#774421","#663a1c","","","","","","","","","","","",""]],
    powerup: {
        "type": "phantom",
        "tier": 2,
        "intro": "Slips down through your blocks into the deepest gap it fits, and keeps whatever it finds there. Check your pockets.",
        "help": 1.5
      },
    rotation: {
        "mode": "any"
      },
    frequency: 0.6,
  },
  {
    id: "flour_sack",
    name: "a sack of flour",
    grid: [
        "XX"
      ],
    color: [["#a09373","#cec3a9","#baaa86","#cec3a9","#baaa86","#cec3a9","#baaa86","#cec3a9","#baaa86","#cec3a9","#baaa86","#845b32","#dbdbdb","#a09373"],["#446da5","#4f7fc0","#4f7fc0","#4f7fc0","#4f7fc0","#4f7fc0","#4f7fc0","#4f7fc0","#4f7fc0","#4f7fc0","#efe3c4","#9a6a3a","#ffffff","#dbdbdb"],["#cec3a9","#efe3c4","#e0a838","#efe3c4","#e0a838","#efe3c4","#efe3c4","#d8c69c","#efe3c4","#efe3c4","#efe3c4","#9a6a3a","#9a6a3a","#dbdbdb"],["#cec3a9","#d8c69c","#e0a838","#e0a838","#e0a838","#efe3c4","#efe3c4","#efe3c4","#efe3c4","#d8c69c","#efe3c4","#9a6a3a","#ffffff","#dbdbdb"],["#cec3a9","#efe3c4","#efe3c4","#a8772a","#efe3c4","#d8c69c","#efe3c4","#efe3c4","#efe3c4","#efe3c4","#efe3c4","#9a6a3a","#9a6a3a","#dbdbdb"],["#446da5","#4f7fc0","#4f7fc0","#4f7fc0","#4f7fc0","#4f7fc0","#4f7fc0","#4f7fc0","#4f7fc0","#4f7fc0","#efe3c4","#9a6a3a","#ffffff","#dbdbdb"],["#a09373","#cec3a9","#baaa86","#cec3a9","#baaa86","#cec3a9","#baaa86","#cec3a9","#baaa86","#cec3a9","#baaa86","#845b32","#dbdbdb","#a09373"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 1,
        "intro": "Every block in the 10-wide, 3-row band around and under it (its own row and the two below) drops down into the gaps. Leaves a fine white dust on everything.",
        "area": {
          "origin": [
            4,
            0
          ],
          "grid": [
            "##########",
            "##########",
            "##########"
          ]
        },
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "tiptoe_elephant",
    name: "an elephant tiptoeing past",
    grid: [
        "XXX",
        "X.X"
      ],
    color: [["#727c88","#84909e","#84909e","#84909e","#84909e","#84909e","#84909e","#84909e","#a98c9b","#a98c9b","#a98c9b","#a98c9b","#84909e","#84909e","#84909e","#84909e","#a7afba","#727c88"],["#84909e","#9aa7b8","#c2ccd8","#c2ccd8","#9aa7b8","#9aa7b8","#9aa7b8","#c4a3b4","#c4a3b4","#c4a3b4","#c4a3b4","#c4a3b4","#c4a3b4","#9aa7b8","#c2ccd8","#9aa7b8","#9aa7b8","#84909e"],["#5e6978","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#c4a3b4","#c4a3b4","#c4a3b4","#c4a3b4","#c4a3b4","#c4a3b4","#c4a3b4","#9aa7b8","#1e2633","#9aa7b8","#9aa7b8","#84909e"],["#5e6978","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#c4a3b4","#c4a3b4","#c4a3b4","#c4a3b4","#c4a3b4","#c4a3b4","#9aa7b8","#9aa7b8","#fff1d6","#9aa7b8","#84909e"],["#84909e","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#c4a3b4","#c4a3b4","#c4a3b4","#c4a3b4","#c4a3b4","#9aa7b8","#9aa7b8","#9aa7b8","#fff1d6","#8794a6","#84909e"],["#84909e","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#84909e","#84909e","#84909e","#84909e","#84909e","#84909e","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#8794a6","#84909e"],["#84909e","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#84909e","","","","","","","#84909e","#9aa7b8","#9aa7b8","#6d7a8c","#8794a6","#84909e"],["#84909e","#c2ccd8","#9aa7b8","#9aa7b8","#9aa7b8","#84909e","","","","","","","#84909e","#9aa7b8","#9aa7b8","#6d7a8c","#8794a6","#84909e"],["#84909e","#c2ccd8","#9aa7b8","#9aa7b8","#9aa7b8","#84909e","","","","","","","#84909e","#9aa7b8","#9aa7b8","#6d7a8c","#8794a6","#84909e"],["#84909e","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#84909e","","","","","","","#84909e","#9aa7b8","#9aa7b8","#6d7a8c","#8794a6","#747f8f"],["#84909e","#9aa7b8","#9aa7b8","#9aa7b8","#9aa7b8","#84909e","","","","","","","#84909e","#9aa7b8","#9aa7b8","#6d7a8c","#8794a6","#747f8f"],["#aba094","#dbdbdb","#c7baac","#dbdbdb","#c7baac","#aba094","","","","","","","#bdbdbd","#c7baac","#dbdbdb","#c7baac","#747f8f","#646e7b"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 2,
        "intro": "Only every other column goes: four columns across the 7 cells under it, including the two under its feet. Everything in them drops into the gaps. It is trying so hard to be quiet.",
        "area": {
          "origin": [
            2,
            0
          ],
          "grid": [
            "|.|.|.|"
          ]
        },
        "help": 3.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "gravity_boot",
    name: "a gravity boot",
    grid: [
        "X.",
        "XX"
      ],
    color: [["#abb0b7","#c7cdd4","#c7cdd4","#c7cdd4","#c7cdd4","#c7cdd4","#abb0b7","","","","","","",""],["#798597","#d4e0ee","#8d9bb0","#8d9bb0","#8d9bb0","#d4e0ee","#798597","","","","","","",""],["#798597","#8d9bb0","#8d9bb0","#ff8a2a","#ff8a2a","#8d9bb0","#798597","","","","","","",""],["#798597","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#798597","","","","","","",""],["#798597","#8d9bb0","#8d9bb0","#ff8a2a","#ff8a2a","#8d9bb0","#798597","","","","","","",""],["#798597","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#798597","","","","","","",""],["#798597","#8d9bb0","#8d9bb0","#ff8a2a","#ff8a2a","#8d9bb0","#798597","","","","","","",""],["#798597","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#798597","#798597","#798597","#798597","#798597","#798597","#687382"],["#798597","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#d4e0ee","#8d9bb0","#798597"],["#798597","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#d4e0ee","#798597"],["#798597","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#8d9bb0","#798597"],["#414959","#4c5568","#4c5568","#4c5568","#4c5568","#4c5568","#4c5568","#4c5568","#4c5568","#4c5568","#4c5568","#4c5568","#4c5568","#414959"],["#323948","#3a4254","#3a4254","#3a4254","#3a4254","#3a4254","#3a4254","#3a4254","#3a4254","#3a4254","#3a4254","#3a4254","#3a4254","#323948"],["#2b313e","#414959","#323948","#323948","#414959","#323948","#323948","#414959","#323948","#323948","#414959","#323948","#323948","#2b313e"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 2,
        "intro": "Kicks down a staircase to its right: blocks fall in three 2-wide steps, 2, 4 and 6 rows deep, starting just under its sole. The opposite of moon boots.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "......",
            "......",
            "######",
            "######",
            "..####",
            "..####",
            "....##",
            "....##"
          ]
        },
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "lead_balloon",
    name: "a lead balloon",
    grid: [
        "X",
        "X"
      ],
    color: [["#515965","#5e6776","#79828f","#79828f","#79828f","#5e6776","#515965"],["#5e6776","#8d97a6","#c3cad4","#c3cad4","#8d97a6","#8d97a6","#5e6776"],["#79828f","#c3cad4","#3e4656","#3e4656","#3e4656","#8d97a6","#79828f"],["#79828f","#8d97a6","#3e4656","#8d97a6","#3e4656","#8d97a6","#79828f"],["#79828f","#c3cad4","#3e4656","#3e4656","#3e4656","#8d97a6","#79828f"],["#79828f","#8d97a6","#3e4656","#8d97a6","#8d97a6","#8d97a6","#79828f"],["#79828f","#8d97a6","#3e4656","#8d97a6","#3e4656","#8d97a6","#79828f"],["#79828f","#8d97a6","#8d97a6","#8d97a6","#3e4656","#8d97a6","#79828f"],["#79828f","#8d97a6","#8d97a6","#8d97a6","#3e4656","#3e4656","#353c4a"],["#79828f","#8d97a6","#8d97a6","#8d97a6","#3e4656","#8d97a6","#353c4a"],["#636c79","#8d97a6","#8d97a6","#8d97a6","#3e4656","#3e4656","#353c4a"],["#636c79","#737d8d","#8d97a6","#8d97a6","#8d97a6","#737d8d","#636c79"],["#636c79","#737d8d","#737d8d","#5a6272","#737d8d","#737d8d","#636c79"],["#555c68","#636c79","#4d5462","#4d5462","#4d5462","#636c79","#555c68"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 1,
        "intro": "Goes down like a lead balloon: blocks in a V right under it (two diagonal strokes, 9 cells wide at the top, meeting 5 rows down) drop into the gaps. Nobody laughed at the party either.",
        "area": {
          "origin": [
            4,
            0
          ],
          "grid": [
            ".........",
            ".........",
            "##.....##",
            ".##...##.",
            "..##.##..",
            "...###...",
            "....#...."
          ]
        },
        "help": 1.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "sinking_stone",
    name: "a stone that never learned to swim",
    grid: [
        "XX"
      ],
    color: [["#726e65","#847f75","#847f75","#9e998f","#9e998f","#9e998f","#9e998f","#9e998f","#847f75","#847f75","#90bdd3","#90bdd3","#847f75","#726e65"],["#847f75","#9a9488","#b8b2a6","#b8b2a6","#b8b2a6","#b8b2a6","#b8b2a6","#b8b2a6","#b8b2a6","#9a9488","#a8dcf5","#ffffff","#a8dcf5","#847f75"],["#847f75","#b8b2a6","#b8b2a6","#4a4640","#b8b2a6","#b8b2a6","#b8b2a6","#4a4640","#b8b2a6","#b8b2a6","#9a9488","#a8dcf5","#a8dcf5","#847f75"],["#847f75","#b8b2a6","#b8b2a6","#b8b2a6","#b8b2a6","#b8b2a6","#b8b2a6","#b8b2a6","#b8b2a6","#b8b2a6","#9a9488","#9a9488","#9a9488","#847f75"],["#847f75","#9a9488","#b8b2a6","#b8b2a6","#b8b2a6","#4a4640","#4a4640","#b8b2a6","#b8b2a6","#b8b2a6","#9a9488","#9a9488","#7a7468","#847f75"],["#847f75","#7a7468","#9a9488","#9a9488","#9a9488","#9a9488","#9a9488","#9a9488","#9a9488","#9a9488","#9a9488","#7a7468","#9a9488","#847f75"],["#5a564d","#847f75","#847f75","#847f75","#696459","#847f75","#847f75","#847f75","#847f75","#696459","#847f75","#847f75","#847f75","#726e65"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 1,
        "intro": "Sinks straight to the bottom: every block in the two columns under it, all the way down, drops into the gaps. It never learned to swim. It never wanted to.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "..",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##",
            "##"
          ]
        },
        "help": 3
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "ambitious_paperweight",
    name: "a paperweight with ambitions",
    grid: [
        "X"
      ],
    color: [["#76a6b3","#89c1d0","#dbaf24","#89c1d0","#dbaf24","#89c1d0","#76a6b3"],["#89c1d0","#ffffff","#ffcc2a","#ffcc2a","#ffcc2a","#9fe0f2","#89c1d0"],["#89c1d0","#ffffff","#ff6b8a","#ff6b8a","#ff6b8a","#9fe0f2","#89c1d0"],["#89c1d0","#ff6b8a","#ff6b8a","#ffe14a","#ff6b8a","#ff6b8a","#89c1d0"],["#89c1d0","#6fc4e0","#ff6b8a","#ff6b8a","#ff6b8a","#6fc4e0","#89c1d0"],["#b68d37","#d4a440","#d4a440","#d4a440","#d4a440","#d4a440","#b68d37"],["#7c5c1f","#906b24","#906b24","#906b24","#906b24","#906b24","#7c5c1f"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 2,
        "intro": "Presses down in a T: the 7-wide strip two rows deep right under it, plus its own column down to 8 rows below it, drops into the gaps. It used to hold down one letter. Now it wants the whole stack.",
        "area": {
          "origin": [
            3,
            0
          ],
          "grid": [
            ".......",
            "#######",
            "#######",
            "...#...",
            "...#...",
            "...#...",
            "...#...",
            "...#...",
            "...#..."
          ]
        },
        "help": 2.5
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "sideways_apple",
    name: "an apple from a different tree",
    grid: [
        "X"
      ],
    color: [["#4e8224","#7bba40","#7bba40","#7bba40","#7bba40","#7bba40","#4e8224"],["#7bba40","#efffd8","#efffd8","#8fd84a","#8fd84a","#2e8a3a","#287732"],["#7bba40","#efffd8","#8fd84a","#8fd84a","#8fd84a","#2e8a3a","#7bba40"],["#7bba40","#8fd84a","#8fd84a","#8fd84a","#8fd84a","#7a4a22","#69401d"],["#7bba40","#8fd84a","#8fd84a","#8fd84a","#8fd84a","#8fd84a","#7bba40"],["#7bba40","#8fd84a","#8fd84a","#8fd84a","#8fd84a","#ff8a5a","#7bba40"],["#4e8224","#7bba40","#7bba40","#7bba40","#db774d","#db774d","#4e8224"]],
    powerup: {
        "type": "gravity",
        "direction": "right",
        "tier": 1,
        "intro": "Falls the wrong way: blocks in its own row and the two rows under it, wall to wall, slide right until they hit something. Different tree, different rules.",
        "area": {
          "origin": [
            0,
            0
          ],
          "grid": [
            "-",
            "-",
            "-"
          ]
        },
        "help": 1
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
  {
    id: "falling_accordion",
    name: "a falling accordion (a piano's little cousin)",
    grid: [
        "XXX"
      ],
    color: [["#a02637","#ba2d40","#ba2d40","#ba2d40","#ba2d40","#ba2d40","#dbb63d","#d8d1c4","#901f32","#d8d1c4","#901f32","#dbb63d","#ba2d40","#ba2d40","#ba2d40","#ba2d40","#ba2d40","#a02637"],["#26242e","#2c2a36","#2c2a36","#fbf3e4","#fbf3e4","#d8344a","#fbf3e4","#a8243a","#fbf3e4","#a8243a","#fbf3e4","#a8243a","#d8344a","#ffd447","#d8344a","#ffd447","#d8344a","#ba2d40"],["#d8d1c4","#fbf3e4","#fbf3e4","#fbf3e4","#fbf3e4","#d8344a","#fbf3e4","#a8243a","#fbf3e4","#a8243a","#fbf3e4","#a8243a","#d8344a","#d8344a","#d8344a","#d8344a","#d8344a","#ba2d40"],["#26242e","#2c2a36","#2c2a36","#fbf3e4","#fbf3e4","#d8344a","#fbf3e4","#a8243a","#fbf3e4","#a8243a","#fbf3e4","#a8243a","#d8344a","#ffd447","#d8344a","#ffd447","#d8344a","#ba2d40"],["#d8d1c4","#fbf3e4","#fbf3e4","#fbf3e4","#fbf3e4","#d8344a","#fbf3e4","#a8243a","#fbf3e4","#a8243a","#fbf3e4","#a8243a","#d8344a","#d8344a","#d8344a","#d8344a","#d8344a","#ba2d40"],["#a02637","#ba2d40","#ba2d40","#ba2d40","#ba2d40","#ba2d40","#dbb63d","#d8d1c4","#901f32","#d8d1c4","#901f32","#dbb63d","#ba2d40","#ba2d40","#ba2d40","#ba2d40","#ba2d40","#a02637"]],
    powerup: {
        "type": "gravity",
        "direction": "down",
        "tier": 2,
        "intro": "Squeezes every other row: rows 1, 3, 5 and 7 under it, 7 cells wide, drop into the gaps. A piano's little cousin. It falls just as hard, only wheezier.",
        "area": {
          "origin": [
            2,
            0
          ],
          "grid": [
            ".......",
            "#######",
            ".......",
            "#######",
            ".......",
            "#######",
            ".......",
            "#######"
          ]
        },
        "help": 2
      },
    rotation: {
        "mode": "none"
      },
    frequency: 0.9,
  },
];
