// ASCII level layouts and the LEVELS config array (per-level map,
// boss, enemy placements, checkpoint data, etc.)
// Level layout: 0 = empty, 1 = ground/brick, 2 = coin, 3 = flag(goal), 4 = pipe
const level1Map = [
"                                                                                                    ",
"                                                                                                    ",
"                                                                                                    ",
"                          2 2 2                                       2                            ",
"                        11111111                                                                    ",
"                                                                2 2 2                               ",
"                    2                          11                111                               ",
"                 111111              2 2 2                                                          ",
"                                  111111111   q             o                                  3    ",
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
"         2 2                       22        q            1111       o                  2 2                                   3   ",
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
"                         111111                                   q       o     111111             111111                                                          3  ",
"                        1      1                   11 11 11                                       1      1                                                            ",
"2 2 2 2   2 2 2        1        1 2 2 2 2                    2 2 2 2 2                  2 2 2 2  1        1 2 2 2 2 2         1 1 1  2 2 2 2 2                        ",
"                      1          1                                                              1          1                                     1                    ",
"11111111  111111 11111            11111111  1111111          111111111  111111          11111111            1111111111  111111       1111111111   11111111111111111111"
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
];
