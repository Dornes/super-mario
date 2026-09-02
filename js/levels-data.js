// ASCII level layouts and the LEVELS config array (per-level map,
// boss, enemy placements, checkpoint data, etc.)
// Level layout: 0 = empty, 1 = ground/brick, 2 = coin, 3 = flag(goal), 4 = pipe,
// q = "?" item block, g = gravity-flip-on pad, k = gravity-flip-off pad
// (space levels only - see the gravity-pad branch in buildLevel() in game.js)
const level1Map = [
"                                                                                                    ",
"                                                                                                    ",
"                                                                                                    ",
"                          2 2 2                                       2                            ",
"                        11111111                                                                    ",
"                                                                2 2 2                               ",
"                    2                          11                111                               ",
"                 111111              2 2 2                                                          ",
"                                  111111111   q                                                3    ",
"                                                          1                                    3    ",
"      2 2                          1                                       44                      ",
"    111111        2 2 2       1                    2      11              44                       ",
"111111111111  11111111111111111111111111  111111111  11111111111111111111  111111  11111111111111111"
];

const level2Map = [
"                                                                                                                                  ",
"                                                                                                                                  ",
"                                                                                                                                  ",
"                                                                                                                                  ",
"                                             2 2 2                                                                                ",
"                                            111111                         2 2 2                                                  ",
"                  2 2                                                     111111                   2 2 2                          ",
"                  1111                                    2 2                                     111111                          ",
"         2 2                       22        q            1111                          2 2                                   3   ",
"        1111                      1111                                                  1111                                  3   ",
"                            44                                    44                                        44                    ",
"                            44                                    44                                        44                    ",
"111111111111111  11111111111111111111111  11111111  11111111111111111111111  1111111111111  1111111  11111111111111111111111111111"
];

// Level 3: longer, harder platforming (real pits, staircases, floating
// bridges, and a double-jump-only plateau). Every gap/step was generated
// and validated against the player's actual jump physics so all jumps are
// guaranteed possible (see build_level3.js used to design this layout).
const level3Map = [
"                                                                                                                                                                      ",
"                                                                                                                                                                      ",
"                                                                                                                                                                      ",
"                                                                                                                                                                      ",
"                                                                                                                                                                      ",
"                                                                                                                                                                      ",
"                         2 2 2                                                  2 2 2               2 2 2                                                             ",
"                                                                                                                                                                   3  ",
"                         111111                                   q             111111             111111                                                          3  ",
"                        1      1                   11 11 11                                       1      1                                                            ",
"2 2 2 2   2 2 2        1        1 2 2 2 2                    2 2 2 2 2                  2 2 2 2  1        1 2 2 2 2 2         1 1 1  2 2 2 2 2                        ",
"                      1          1                                                              1          1                                     1                    ",
"11111111  111111 11111            11111111  1111111          111111111  111111          11111111            1111111111  111111       1111111111   11111111111111111111"
];

// Level 4: no boss yet (that's for later) - just a much harder, longer
// gauntlet. Gaps are bigger than level 3's and two of them ("stomp-chain"
// gaps) are wider than a double jump can cross on its own: a flying enemy
// hovers mid-gap so the player must jump onto it, bounce off (which resets
// the double jump), and keep chaining jumps across. Every gap/enemy
// position here was generated and validated against the player's actual
// jump physics (see build_level4.js used to design this layout) so the
// smaller gaps are plain sprint/double jumps and the two big ones are
// reliably crossable via the stomp-bounce chain with normal input timing.
const level4Map = [
"                                                                                                                                                                          ",
"                                                                                                                                                                          ",
"                                                                                                                                                                          ",
"                                                                                                                                                                          ",
"                                                                                                                                                                          ",
"                                                                                                                                                                          ",
"                                                                                                                                                                    3     ",
"                                       2 2 2                                                   2 2 2                                                                      ",
"                     2 2 2                                  q               2 2 2                                                         2 2 2                           ",
"    2 2 2                                               2 2 2                                                   2 2 2                                        2 2 2        ",
"                        11                                                                       11                                           11                          ",
"                                                                                                                                                                          ",
"1111111111111111   1111111111111    11111111111111   111111111111       111111111111111     1111111111111    1111111111111111          11111111111111   111111111111111111"
];

// Level 5: first of the space-themed levels (still a 2D platformer, just a
// new backdrop/tileset - see the 'space' theme branch in drawBackground/
// drawTiles in game.js). Reuses the same proven gap widths as level 3/4
// (3/4/5-tile plain gaps, plus two wider 7/10-tile "stomp-chain" gaps that
// need a hovering enemy bounce to cross) so every jump stays within the
// player's validated physics. Introduces two new enemy types: the ground-
// patrolling Space Robot ('robot') and the hovering, laser-firing UFO
// ('ufo') - see entities.js.
//
// Middle of the map (cols 85-119) is this level's showcase gravity-flip
// section: a 30-tile floor pit far too wide to jump, crossed by stepping on
// the 'g' pad to flip gravity, then walking upside-down along four ceiling
// platforms ('c' tiles, rendered with flipped plating in drawTiles) split
// by three gaps that each require a real jump while upside down. Ground
// SpaceRobots patrol the first three ceiling segments (gravityFlipped:
// true in enemyPositions) exactly like they'd patrol a normal floor.
// Stepping on the 'k' pad near the end of the last segment flips gravity
// back to normal, dropping the player safely onto the floor once it
// resumes at col 115. The reserved boss room right before the flag is
// still just flat, empty floor - no boss lives here yet.
const level5Map = [
"                                                                                     ccccccc    ccccccc   ccccccc    ccc                                                                                 ",
"                                                                                                   2         2        k                                                                                  ",
"                                                                                                                                                                                                         ",
"                    2 2 2                                                                                                                                                                                ",
"                                        11                                                  2 2 2                                                     11                                                 ",
"                                                                                                                                                                                                         ",
"                                                       2 2 2                                                                          2 2 2                                                3             ",
"                                                                            q                                                                                                                            ",
"                                                                                                                                                           2 2 2                                         ",
"                                                                                                                                                                                                         ",
"                                                                                                                                                                                                         ",
"                                                                                    g                                                                                                                    ",
"11111111111111   111111111111    1111111111111111     1111111111       11111111111111                              1111111          11111111111111   1111111111111111111111111111111111111111111111111111"
];

// Small, deliberately plain flat arena used only for boss testing/tuning -
// not a real level, so it's never reached by finishing another level (see
// REAL_LEVEL_COUNT below). Rendered with a neutral gray "test chamber"
// palette instead of the normal grass/sky theme (see drawBackground/
// drawTiles' testTheme branch in game.js).
const bossTestMap = [
"                                  ",
"                                  ",
"                                  ",
"                                  ",
"                                  ",
"                                  ",
"                              3   ",
"                                  ",
"                                  ",
"                                  ",
"                                  ",
"                                  ",
"1111111111111111111111111111111111",
];

const LEVELS = [

  {
    map: level1Map,
    bossType: 'bowser',
    bossName: 'Bowser',
    enemyPositions: [
      { x: 500, y: 440, range: 80 },
      { x: 900, y: 440, range: 100 },
      { x: 1400, y: 440, range: 120, type: 'hammerbro' },
      { x: 2000, y: 200, range: 60 },
      { x: 2600, y: 440, range: 100 },
      { x: 1650, y: 300, range: 150, type: 'flying' },
    ],
  },
  {
    map: level2Map,
    bossType: 'kingboo',
    bossName: 'King Boo',
    enemyPositions: [
      { x: 300, y: 440, range: 80 },
      { x: 650, y: 440, range: 100 },
      { x: 950, y: 440, range: 90, type: 'hammerbro' },
      { x: 1250, y: 200, range: 70 },
      { x: 1550, y: 440, range: 100 },
      { x: 1900, y: 440, range: 110 },
      { x: 2250, y: 200, range: 70 },
      { x: 2600, y: 440, range: 100, type: 'hammerbro' },
      { x: 2950, y: 440, range: 120 },
      { x: 3300, y: 440, range: 90 },
      { x: 800, y: 300, range: 160, type: 'flying' },
      { x: 2450, y: 320, range: 160, type: 'flying' },
      { x: 3100, y: 300, range: 150, type: 'flying-hammerbro' },
    ],
  },
  {
    map: level3Map,
    bossType: 'kamek',
    bossName: 'Kamek',
    enemyPositions: [
      { x: 145, y: 440, range: 120 },
      { x: 505, y: 440, range: 80, type: 'hammerbro' },
      { x: 765, y: 440, range: 40 },
      { x: 1105, y: 280, range: 80 },
      { x: 1505, y: 440, range: 120, type: 'hammerbro' },
      { x: 1885, y: 440, range: 80 },
      { x: 2605, y: 440, range: 120 },
      { x: 2985, y: 440, range: 80 },
      { x: 3305, y: 280, range: 80 },
      { x: 3665, y: 440, range: 120, type: 'hammerbro' },
      { x: 4085, y: 280, range: 40 },
      { x: 4505, y: 440, range: 160 },
      { x: 4905, y: 440, range: 80 },
      { x: 5505, y: 440, range: 160 },
      { x: 950, y: 300, range: 200, type: 'flying' },
      { x: 2200, y: 320, range: 200, type: 'flying' },
      { x: 4300, y: 300, range: 200, type: 'flying' },
      { x: 1750, y: 300, range: 180, type: 'flying-hammerbro' },
      { x: 4750, y: 300, range: 180, type: 'flying-hammerbro' },
    ],
  },
  {
    // The hardest bare gauntlet leads into level 4's boss: the Hammer
    // Squadron, a flying contraption carrying three Hammer Bros. Bigger
    // gaps and more enemies along the way, including two gaps wide enough
    // that they require stomping a hovering flying enemy mid-air (which
    // resets the double jump) to chain jumps across.
    map: level4Map,
    bossType: 'hammersquad',
    bossName: 'the Hammer Squadron',
    enemyPositions: [
      { x: 960, y: 440, range: 90 },
      { x: 1120, y: 440, range: 60, type: 'hammerbro' },
      { x: 1680, y: 440, range: 100 },
      { x: 1840, y: 440, range: 70 },
      { x: 2320, y: 440, range: 110, type: 'hammerbro' },
      { x: 2480, y: 440, range: 60 },
      { x: 2720, y: 440, range: 24, type: 'flying' },
      { x: 5120, y: 440, range: 24, type: 'flying' },
      { x: 5240, y: 440, range: 24, type: 'flying' },
      { x: 3120, y: 440, range: 100 },
      { x: 3280, y: 440, range: 60, type: 'hammerbro' },
      { x: 3840, y: 440, range: 90 },
      { x: 4000, y: 440, range: 70 },
      { x: 4560, y: 440, range: 100, type: 'hammerbro' },
      { x: 4720, y: 440, range: 60 },
      { x: 4880, y: 440, range: 90 },
      { x: 5560, y: 440, range: 100 },
      { x: 5840, y: 440, range: 70, type: 'hammerbro' },
      { x: 6280, y: 440, range: 90 },
      { x: 6480, y: 440, range: 60 },
      { x: 1760, y: 260, range: 180, type: 'flying' },
      { x: 4640, y: 280, range: 200, type: 'flying-hammerbro' },
      { x: 6240, y: 260, range: 180, type: 'flying' },
    ],
  },
  {
    // First space level. The gravity-flip showcase section sits in the
    // middle of the map (see the 'g'/'k' pads and 'c' ceiling tiles in
    // level5Map); the reserved boss room right before the flag is still
    // just flat, empty floor - no boss here yet.
    map: level5Map,
    theme: 'space',
    bossType: null,
    bossName: null,
    checkpointX: 6600,
    // Space-native enemies only - no goombas/Hammer Bros/flying enemies
    // carried over from the original 4 (grass/sky) levels. Ground melee
    // roles use SpaceRobot, airborne roles (including small-range gap-
    // crossing hovers) use UFO instead. Robots marked `flipped: true`
    // patrol upside-down along the ceiling platforms in the gravity-flip
    // section (cols 85-119), exactly like a normal robot patrols the floor.
    enemyPositions: [
      { x: 853, y: 440, range: 100, type: 'robot' },
      { x: 986, y: 440, range: 100, type: 'robot' },
      { x: 1520, y: 440, range: 100, type: 'robot' },
      { x: 1640, y: 440, range: 110, type: 'robot' },
      { x: 2240, y: 440, range: 100, type: 'robot' },
      { x: 2360, y: 440, range: 110, type: 'robot' },
      { x: 3040, y: 440, range: 110, type: 'robot' },
      { x: 3200, y: 440, range: 110, type: 'robot' },
      // Ceiling patrol along the gravity-flip section's three walkable
      // segments (seg1 cols 85-91, seg2 cols 96-102, seg3 cols 106-112).
      { x: 3520, y: 40, range: 100, type: 'robot', flipped: true },
      { x: 3960, y: 40, range: 100, type: 'robot', flipped: true },
      { x: 4400, y: 40, range: 100, type: 'robot', flipped: true },
      { x: 4626, y: 440, range: 110, type: 'robot' },
      { x: 5560, y: 440, range: 110, type: 'robot' },
      { x: 6080, y: 440, range: 100, type: 'robot' },
      { x: 6186, y: 440, range: 110, type: 'robot' },
      { x: 6373, y: 440, range: 110, type: 'robot' },
      { x: 6400, y: 440, range: 100, type: 'robot' },
      { x: 2680, y: 440, range: 24, type: 'ufo' },
      { x: 5060, y: 440, range: 24, type: 'ufo' },
      { x: 1000, y: 250, range: 180, type: 'ufo' },
      { x: 1800, y: 280, range: 180, type: 'ufo' },
      { x: 2400, y: 300, range: 180, type: 'ufo' },
      { x: 5600, y: 260, range: 180, type: 'ufo' },
      // Hovers inside the gravity-flip pit itself, firing lasers across the
      // gap so crossing the upside-down ceiling path isn't risk-free.
      { x: 3800, y: 280, range: 160, type: 'ufo' },
    ],
  },
  {
    // Boss-testing arena only, reached via the "0" hotkey - not part of the
    // normal level progression (see REAL_LEVEL_COUNT). Sy Loophole didn't
    // fit the game's theme as a real level boss, so he lives here instead
    // for tuning/testing his attacks in isolation.
    map: bossTestMap,
    theme: 'test',
    isTest: true,
    bossType: 'lawyer',
    bossName: 'Sy Loophole',
    enemyPositions: [],
  },
];

// Real, in-order levels only (excludes the boss-testing arena) - used to
// decide when finishing a level should advance to the next one vs. show
// the "you won the game" screen.
const REAL_LEVEL_COUNT = LEVELS.filter(l => !l.isTest).length;
