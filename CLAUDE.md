# CLAUDE.md

Context for AI agents (Claude, Copilot, etc.) working in this repository.

## What this project is

A single-player, browser-based Mario-style 2D platformer built with plain
HTML5 Canvas and vanilla JavaScript. No build step, no bundler, no package
manager, no dependencies, no framework. Runs entirely client-side; open
`index.html` directly or serve the folder statically (`npx serve .` /
`python -m http.server 8000`).

## File layout

```
index.html      Page markup only: HUD, canvas, overlay/hint text, <script> tags
style.css       All CSS (HUD layout, canvas styling, overlay/hint text)
js/
  constants.js  Canvas/HUD element refs, physics constants (gravity, friction,
                tile size), and raw keyboard input handling (movement, jump,
                shoot, sprint double-tap, cheats, level-select hotkeys, hint
                toggle)
  levels-data.js  ASCII level layouts (level1Map..level5Map, bossTestMap) and
                the LEVELS config array (per-level map, theme, boss info,
                checkpoint, enemy placements)
  entities.js   All game entity classes: Player, regular enemies, Hammer Bros
                + hammers, fireballs, space enemies (SpaceRobot, UFO,
                LaserBolt), powerups/laser shots, and the bosses (Bowser,
                King Boo, Kamek, Sy Loophole) with their projectiles/minions
  game.js       Level building (tiles/pipes/hidden vaults), theme-based
                rendering (grass/sky, space, test-arena), global game state,
                all collision/scoring checks, HUD/overlay helpers, and the
                main render loop. Loaded last; kicks the game off at the very
                end of the file.
sounds/         Audio assets
```

### Why plain `<script src>` tags instead of ES modules or a bundler

All four JS files load as classic (non-module) scripts, in the order listed
above, sharing one global scope - exactly as if they were one file. That
means:

- Declaration order across files matters the same way it would within a
  single file: `constants.js` must load before anything using `TILE`,
  `GRAVITY`, `canvas`, etc.; `entities.js` (class declarations) must load
  before `game.js`, which does `let player = new Player();` at its top level.
- Inside function/method bodies, forward references across files are fine
  (a class in `entities.js` can call a function defined later in `game.js`),
  because those bodies only run after every script has finished loading.

If real modularity is ever needed (imports/exports, tree-shaking, TS, a
bundler), convert to ES modules (`<script type="module">`), but that isn't
necessary at the current size.

## Gameplay overview (current state)

Five real levels plus one boss-testing arena reached only via a debug hotkey:

1. **Level 1** - grass/sky theme. Boss: Bowser.
2. **Level 2** - grass/sky theme. Boss: King Boo.
3. **Level 3** - grass/sky theme. Boss: Kamek.
4. **Level 4** - grass/sky theme, no boss. Hardest "bare gauntlet" level:
   bigger gaps, more enemies, checkpoint, two gaps wide enough that they
   require stomping a hovering flying enemy mid-air (resets the double jump)
   to chain jumps across.
5. **Level 5** - first **space-themed** level (`theme: 'space'` on the level
   config; see `drawBackground`/`drawTiles` space branches in `game.js` for
   starfield/parallax planets and metallic cyan-edged platforms). No boss
   yet - the flat stretch right before the flag is a deliberately empty
   reserved boss room. Introduces two new enemy types (see below). More
   space-themed levels are expected to follow.
6. **Boss-testing arena** (`isTest: true`, `theme: 'test'`) - not a real
   level, not reachable via normal progression (excluded via
   `REAL_LEVEL_COUNT` in `levels-data.js`, which filters out `isTest`
   entries). Reached only with `Shift+0`. Hosts "Sy Loophole", a boss that
   didn't fit the game's theme as a real level boss, kept here for
   tuning/testing in isolation.

Each real level has enemies, a "?" item block spawning a laser gun powerup,
hidden warp pipes to bonus star vaults, and (levels 4-5 onward) a
mid-level checkpoint (`checkpointX`).

### Enemy types (`type` field in `enemyPositions`, mapped in
`initEnemies()` in `game.js`)

- default (no `type`) - basic ground Goomba-like patroller
- `hammerbro` - throws hammers
- `flying` - hovering enemy, can be stomped mid-air (resets double jump)
- `flying-hammerbro` - hovering + throws hammers
- `robot` (`SpaceRobot`, added for level 5) - ground patroller with a
  metallic sprite, space-themed reskin of the basic enemy
- `ufo` (`UFO`, added for level 5) - hovers and fires `LaserBolt`
  projectiles (reuses the existing `hammers` array/collision system)

When placing enemies on wide mandatory-jump gaps, prefer non-shooting
`flying`/`flying-hammerbro` over `ufo` so the required jump stays reliably
timeable (lasers can interrupt the stomp-bounce timing).

### Controls (also shown in-game via `I`)

- Arrow keys / `A`,`D`: move (double-tap a direction to sprint)
- Space / Arrow Up: jump (double jump available)
- Arrow Down / `S` on a green pipe: warp
- `W`: fire the laser gun (if picked up)
- `R`: restart
- `1`-`5`: jump to the start of levels 1-5; `Shift`+`1`-`5`: jump to that
  level's boss/checkpoint area (`teleportToLevelStart` / `teleportToBoss` in
  `constants.js`)
- `Shift`+`0`: jump to the boss-testing arena
- `I`: toggle the on-screen hint text
- `Shift`+`G`: secret cheat, grants a fresh laser gun with 5 shots

## Development workflow

- Plain static site - edit a file, refresh the browser, done.
- No automated test suite in the repo. Manual verification during
  development typically uses a throwaway Node.js script that stubs
  `document`/`window`/canvas 2D context via the `vm` module, builds each
  level, and runs the main loop for a number of ticks to sanity-check
  physics/collisions/scoring before committing. These scripts are not part
  of the repo - write one to a temp file if needed, then delete it once
  verification is done.

## Git workflow rules for agents - READ CAREFULLY

- **Never create new branches unless the user explicitly asks for one.**
- **Always commit finished work directly to `main` locally**, with a clear,
  appropriately-scoped commit message. The user handles pushing to `origin`
  themselves - do not push unless explicitly asked.
- If you are running in a git worktree whose checked-out branch is not
  `main` (common for agent sessions), and `main` is already checked out in
  another worktree of the same repository, you **cannot** `git checkout
  main` there (git refuses to have the same branch checked out in two
  worktrees at once). In that situation, stop and tell the user about the
  conflict instead of creating a new branch as a workaround - let them
  decide (e.g. they may merge your branch into `main` themselves, or ask for
  a session/workspace directly on `main`).

## Known accounts/environment quirks (for agents, not gameplay)

- PR/fork creation via GitHub's API can be blocked for this GitHub account by
  an Enterprise Managed User restriction (403 "As an Enterprise Managed
  User, you cannot access this content"), affecting both the
  `create_pull_request` tool and `gh pr create`/`gh api`. If that happens,
  push the branch and tell the user to open the PR manually from GitHub's
  compare/PR-new URL.
