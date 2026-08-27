# Super Mario-lignende spill

A small single-player, browser-based Mario-style platformer built with plain
HTML5 Canvas and vanilla JavaScript (no build step, no dependencies, no
frameworks). It runs entirely client-side and can be opened directly from
disk or served as static files.

## Running it

Just open `index.html` in a browser. That's it - there is nothing to install
or build.

If you prefer a local static server (some browsers restrict things like
relative script loading over `file://`), any of these work fine from the
project root:

```
npx serve .
# or
python -m http.server 8000
```

Then visit `http://localhost:<port>/index.html`.

## Project structure

```
index.html           Page markup only: HUD, canvas, overlay, and <script> tags
style.css             All CSS (HUD layout, canvas styling, overlay/hint text)
js/
  constants.js        Canvas/HUD element refs, physics constants (gravity,
                       friction, tile size), and raw keyboard input handling
                       (movement, jump, shoot, sprint double-tap, cheats,
                       level-select hotkeys, hint toggle)
  levels-data.js       ASCII level layouts (level1Map/level2Map/level3Map) and
                       the LEVELS config array (per-level enemy placements,
                       boss name, checkpoint data, etc.)
  entities.js          All game entity classes: Player, regular enemies,
                       Hammer Bros + their hammers, fireballs, powerups/laser
                       shots, and the three bosses (Bowser, King Boo, Kamek)
                       with their projectiles/minions
  game.js              Level building (tiles/pipes/hidden vaults), global
                       game state, all collision/scoring checks, HUD/overlay
                       helpers, and the main render loop. Loaded last, and
                       kicks the game off at the very end of the file.
```

### Why plain `<script src>` tags instead of ES modules or a bundler

The game intentionally has no build step. All four JS files are loaded as
classic (non-module) scripts, in the order listed above, and share one global
scope - exactly as if they were still one file. That means:

- Declaration order across files matters the same way it would within a
  single file: `constants.js` must load before anything that uses `TILE`,
  `GRAVITY`, `canvas`, etc.; `entities.js` (class declarations) must load
  before `game.js`, which does `let player = new Player();` at its top level.
- Inside function/method bodies, forward references across files are fine
  (e.g. a class defined in `entities.js` can freely call a function defined
  later in `game.js`), because those bodies only run after every script has
  finished loading.

If this ever needs real modularity (imports/exports, tree-shaking, TS, a
bundler, etc.), the natural next step is converting these to ES modules
(`<script type="module">` + explicit `import`/`export`), but that isn't
necessary at the current size.

## Development workflow

- This is a plain static site - edit a file, refresh the browser, done.
- There's no automated test suite. Manual verification during development
  has relied on quick Node.js scripts that extract/concatenate the JS files,
  stub out `document`/`window`/canvas 2D context, and simulate a few frames
  of game logic (physics, collisions, scoring) to sanity-check changes
  before they're committed. These are throwaway scripts, not part of the
  repo.
- Commit your changes with git as you go; nothing here auto-pushes.

## Controls (in-game, also shown by pressing `I`)

- Arrow keys / `A`,`D`: move (double-tap a direction to sprint)
- Space / Arrow Up: jump (double jump available)
- Arrow Down / `S` on a green pipe: warp
- `W`: fire the laser gun (if you've picked one up)
- `R`: restart
- `1`-`6`: jump to the start/boss of levels 1-3 (debug/testing shortcut)
- `I`: toggle the on-screen hint text
- `Shift`+`G`: secret cheat, grants a fresh laser gun with 5 shots

## Gameplay overview

Three levels, each ending in a boss fight (Bowser, King Boo, Kamek), with
increasing platforming difficulty, more Hammer Bros throwing hammers, hidden
warp pipes leading to bonus star vaults, checkpoints, and a "?" item block
per level that spawns a laser gun powerup.
