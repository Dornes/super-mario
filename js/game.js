// Level building (tiles/pipes/vaults), global game state, the main
// collision/scoring checks, HUD/overlay helpers, and the render loop.
// This is the last script loaded, so it can reference everything
// declared in constants.js, levels-data.js, and entities.js, and it
// kicks off the game at the very end.
let currentLevelIndex = 0;

let camX = 0;
let coinTiles = [];
let solidTiles = [];
let flagTile = null;
let levelWidth = 0;
let stars = [];
let pipeWarps = [];
let warpCooldown = 0;
let powerups = [];
let gravityPads = [];
let computerTile = null;
let bossMenuOpen = false;
let bossMenuIndex = 0;
let bossMenuSelected = new Set();

function buildLevel() {
  coinTiles = [];
  solidTiles = [];
  flagTile = null;
  stars = [];
  pipeWarps = [];
  warpCooldown = 0;
  powerups = [];
  gravityPads = [];
  computerTile = null;
  const levelMap = LEVELS[currentLevelIndex].map;
  levelWidth = levelMap[0].length * TILE;
  let flagCol = null;
  for (let row = 0; row < levelMap.length; row++) {
    for (let col = 0; col < levelMap[row].length; col++) {
      const ch = levelMap[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (ch === '1' || ch === '4') {
        solidTiles.push({x, y, w: TILE, h: TILE, pipe: ch === '4'});
      } else if (ch === 'c') {
        // Ceiling platform tile (space levels' gravity-flip sections):
        // collides exactly like '1', just rendered upside-down (see
        // drawTiles' spaceTheme branch) since its walkable/exposed face is
        // the underside, not the top.
        solidTiles.push({x, y, w: TILE, h: TILE, pipe: false, ceiling: true});
      } else if (ch === 'q') {
        solidTiles.push({x, y, w: TILE, h: TILE, pipe: false, itemBlock: true, used: false});
      } else if (ch === '2') {
        coinTiles.push({x: x + 8, y: y + 8, w: 24, h: 24, taken: false});
      } else if (ch === '5') {
        // Star placed directly in the ASCII map (in addition to the ones
        // programmatically added in buildPipesAndVault for hidden vaults).
        stars.push({x: x + 6, y: y + 6, w: 28, h: 28, taken: false});
      } else if (ch === '3') {
        flagCol = col;
      } else if (ch === 'g' || ch === 'k') {
        // Gravity-flip pad: 'g' flips the player to upside-down gravity,
        // 'k' flips it back to normal. Each pad only triggers when the
        // player's current gravity state doesn't already match its target,
        // so standing on it afterward doesn't re-trigger every frame.
        gravityPads.push({x, y: y + 4, w: TILE, h: TILE - 8, target: ch === 'g'});
      } else if (ch === 'm') {
        // Old-school computer terminal (boss-testing arena only): walk up
        // and press Enter to open the boss-select menu.
        computerTile = {x, y: y + 4, w: TILE, h: TILE - 4};
      }
    }
  }
  // Toggle a class on <html> and <body> so the page background (outside
  // the canvas) goes dark on space-themed levels instead of the default
  // sky blue. Both elements are toggled since body's box may not always
  // cover the full viewport height, leaving html's background visible.
  const isSpace = LEVELS[currentLevelIndex].theme === 'space';
  document.documentElement.classList.toggle('space-theme', isSpace);
  document.body.classList.toggle('space-theme', isSpace);
  if (flagCol !== null) {
    // Find the actual ground surface below the flag marker (the topmost
    // solid tile in that column) so the pole always reaches down to it,
    // instead of stopping wherever the '3' marker happened to be placed.
    const flagX = flagCol * TILE;
    let surfaceY = levelMap.length * TILE; // fallback: bottom of the map
    for (let row = 0; row < levelMap.length; row++) {
      const ch = levelMap[row][flagCol];
      if (ch === '1' || ch === '4') { surfaceY = row * TILE; break; }
    }
    const poleHeight = 200;
    flagTile = {x: flagX + 16, y: surfaceY - poleHeight, w: 8, h: poleHeight};
  }
  buildPipesAndVault();
}

// Adds warp-pipe connections and a hidden vault room (with stars) for the
// current level. Existing pipe tiles from the ASCII map are flagged as warp
// mouths where relevant; extra pipes/vault tiles are added programmatically.
function buildPipesAndVault() {
  function markWarpTop(x, y) {
    const t = solidTiles.find(t => t.pipe && t.x === x && t.y === y);
    if (t) t.warp = true;
  }
  function addPipe(x, y) {
    // 2-tile-wide, 2-tile-tall pipe sitting on the ground, top row flagged as a warp mouth
    solidTiles.push({ x, y, w: TILE, h: TILE, pipe: true, warp: true });
    solidTiles.push({ x: x + TILE, y, w: TILE, h: TILE, pipe: true, warp: true });
    solidTiles.push({ x, y: y + TILE, w: TILE, h: TILE, pipe: true });
    solidTiles.push({ x: x + TILE, y: y + TILE, w: TILE, h: TILE, pipe: true });
  }
  function addMouth(x, y, w, toX, toY, msg) {
    pipeWarps.push({ x, y: y - 10, w, h: 20, toX, toY, msg });
  }
  function addStar(x, y) {
    stars.push({ x, y, w: 28, h: 28, taken: false });
  }

  if (currentLevelIndex === 0) {
    // Level 1: two-way shortcut pipes + a hidden vault with a star
    const pipeA = { x: 24 * TILE, y: 10 * TILE }; // early shortcut entrance
    const pipeB = { x: 62 * TILE, y: 10 * TILE }; // shortcut exit, further along
    const pipeC = { x: 28 * TILE, y: 10 * TILE }; // leads to the hidden vault
    addPipe(pipeA.x, pipeA.y);
    addPipe(pipeB.x, pipeB.y);
    addPipe(pipeC.x, pipeC.y);
    addMouth(pipeA.x, pipeA.y, TILE * 2, pipeB.x + TILE * 2 + 10, 440, '🟢 Warp fremover!');
    addMouth(pipeB.x, pipeB.y, TILE * 2, pipeA.x + TILE * 2 + 10, 440, '🟢 Warp tilbake!');

    // Hidden vault box (walled off, only reachable via pipeC's warp)
    const vx = 47 * TILE, vy = 0, vCols = 5, vRows = 5; // cols47-51, rows0-4
    for (let r = 0; r < vRows; r++) {
      for (let c = 0; c < vCols; c++) {
        const isBorder = r === 0 || r === vRows - 1 || c === 0 || c === vCols - 1;
        if (isBorder) solidTiles.push({ x: vx + c * TILE, y: vy + r * TILE, w: TILE, h: TILE, pipe: false });
      }
    }
    const vaultPipeX = vx + 2 * TILE; // col49
    const vaultPipeTopY = vy + 2 * TILE; // row2
    solidTiles.push({ x: vaultPipeX, y: vaultPipeTopY, w: TILE, h: TILE, pipe: true, warp: true });
    solidTiles.push({ x: vaultPipeX, y: vaultPipeTopY + TILE, w: TILE, h: TILE, pipe: true });
    addMouth(pipeC.x, pipeC.y, TILE * 2, vx + TILE, vy + 4 * TILE - 36, '⭐ Hemmelig rom!');
    addMouth(vaultPipeX, vaultPipeTopY, TILE, pipeC.x + TILE * 2 + 10, 440, '🟢 Tilbake til bane!');
    addStar(vx + 1.5 * TILE, vy + 1 * TILE + 4);
  } else if (currentLevelIndex === 1) {
    // Level 2: reuse the 3 existing pipe pairs from the map as warps
    const pipe1 = { x: 28 * TILE, y: 10 * TILE };
    const pipe2 = { x: 66 * TILE, y: 10 * TILE };
    const pipe3 = { x: 108 * TILE, y: 10 * TILE };
    markWarpTop(pipe1.x, pipe1.y); markWarpTop(pipe1.x + TILE, pipe1.y);
    markWarpTop(pipe2.x, pipe2.y); markWarpTop(pipe2.x + TILE, pipe2.y);
    markWarpTop(pipe3.x, pipe3.y); markWarpTop(pipe3.x + TILE, pipe3.y);
    addMouth(pipe1.x, pipe1.y, TILE * 2, pipe2.x + TILE * 2 + 10, 440, '🟢 Warp fremover!');
    addMouth(pipe2.x, pipe2.y, TILE * 2, pipe1.x + TILE * 2 + 10, 440, '🟢 Warp tilbake!');

    // Hidden vault box reached only through pipe3
    const vx = 75 * TILE, vy = 0, vCols = 5, vRows = 5; // cols75-79, rows0-4
    for (let r = 0; r < vRows; r++) {
      for (let c = 0; c < vCols; c++) {
        const isBorder = r === 0 || r === vRows - 1 || c === 0 || c === vCols - 1;
        if (isBorder) solidTiles.push({ x: vx + c * TILE, y: vy + r * TILE, w: TILE, h: TILE, pipe: false });
      }
    }
    const vaultPipeX = vx + 2 * TILE; // col77
    const vaultPipeTopY = vy + 2 * TILE; // row2
    solidTiles.push({ x: vaultPipeX, y: vaultPipeTopY, w: TILE, h: TILE, pipe: true, warp: true });
    solidTiles.push({ x: vaultPipeX, y: vaultPipeTopY + TILE, w: TILE, h: TILE, pipe: true });
    addMouth(pipe3.x, pipe3.y, TILE * 2, vx + TILE, vy + 4 * TILE - 36, '⭐ Hemmelig rom!');
    addMouth(vaultPipeX, vaultPipeTopY, TILE, pipe3.x + TILE * 2 + 10, 440, '🟢 Tilbake til bane!');
    addStar(vx + 1.5 * TILE, vy + 1 * TILE + 4);
  } else if (currentLevelIndex === 2) {
    // Level 3: two-way shortcut pipes + a hidden vault with a star, plus a
    // teleport pipe near the Kamek fight (fitting, since he teleports too)
    const pipeA = { x: 37 * TILE, y: 10 * TILE };
    const pipeB = { x: 112 * TILE, y: 10 * TILE };
    const pipeC = { x: 122 * TILE, y: 10 * TILE };
    addPipe(pipeA.x, pipeA.y);
    addPipe(pipeB.x, pipeB.y);
    addPipe(pipeC.x, pipeC.y);
    addMouth(pipeA.x, pipeA.y, TILE * 2, pipeB.x + TILE * 2 + 10, 440, '🟢 Warp fremover!');
    addMouth(pipeB.x, pipeB.y, TILE * 2, pipeA.x + TILE * 2 + 10, 440, '🟢 Warp tilbake!');

    const vx = 140 * TILE, vy = 0, vCols = 5, vRows = 5; // cols140-144, rows0-4
    for (let r = 0; r < vRows; r++) {
      for (let c = 0; c < vCols; c++) {
        const isBorder = r === 0 || r === vRows - 1 || c === 0 || c === vCols - 1;
        if (isBorder) solidTiles.push({ x: vx + c * TILE, y: vy + r * TILE, w: TILE, h: TILE, pipe: false });
      }
    }
    const vaultPipeX = vx + 2 * TILE;
    const vaultPipeTopY = vy + 2 * TILE;
    solidTiles.push({ x: vaultPipeX, y: vaultPipeTopY, w: TILE, h: TILE, pipe: true, warp: true });
    solidTiles.push({ x: vaultPipeX, y: vaultPipeTopY + TILE, w: TILE, h: TILE, pipe: true });
    addMouth(pipeC.x, pipeC.y, TILE * 2, vx + TILE, vy + 4 * TILE - 36, '⭐ Hemmelig rom!');
    addMouth(vaultPipeX, vaultPipeTopY, TILE, pipeC.x + TILE * 2 + 10, 440, '🟢 Tilbake til bane!');
    addStar(vx + 1.5 * TILE, vy + 1 * TILE + 4);
  }

  // Drop any coin tiles that ended up overlapping a pipe/vault tile added above
  coinTiles = coinTiles.filter(c => !solidTiles.some(t => rectsOverlap(c, t)));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

let spawnPoint = { x: 40, y: 300 };
let player = new Player();
let enemies = [];
let fireballs = [];
let playerShots = [];
let hammers = [];
let deathParticles = [];
let lawyerCars = [];
let sunroofDrops = [];

// Boss theme for Sy Loophole (level 4). Starts on the last 3 seconds of the
// track the moment he first scrolls into view (not the instant he spawns
// off-screen), then loops the full track from the top for as long as he's
// alive.
const bossMusic = new Audio('sounds/lawyer-boss-theme.mp3');
let bossMusicActive = false;
bossMusic.addEventListener('ended', () => {
  if (bosses.some(b => b instanceof LawyerBoss && b.alive)) {
    bossMusic.currentTime = 0;
    bossMusic.play().catch(() => {});
  }
});
function startBossMusic() {
  bossMusic.pause();
  const playNearEnd = () => {
    bossMusic.currentTime = Math.max(0, (bossMusic.duration || 3) - 3);
    bossMusic.play().catch(() => {});
  };
  if (bossMusic.readyState >= 1) {
    playNearEnd();
  } else {
    bossMusic.addEventListener('loadedmetadata', playNearEnd, { once: true });
  }
}
function stopBossMusic() {
  bossMusicActive = false;
  bossMusic.pause();
  bossMusic.currentTime = 0;
}
// Kicks off the boss theme the first time Sy Loophole is actually visible
// within the camera's view, rather than as soon as he's spawned off-screen.
function updateBossMusicTrigger() {
  if (bossMusicActive) return;
  const lawyer = bosses.find(b => b instanceof LawyerBoss && b.alive);
  if (!lawyer) return;
  const sx = lawyer.x - camX;
  if (sx + lawyer.w > 0 && sx < canvas.width) {
    bossMusicActive = true;
    startBossMusic();
  }
}

// spawns a short crumble-apart animation of small debris chunks at an
// entity's position, using the given colors to roughly match its sprite
function spawnCrumble(entity, colors) {
  const cx = entity.x + entity.w / 2;
  const cy = entity.y + entity.h / 2;
  const count = Math.min(28, Math.max(10, Math.round((entity.w * entity.h) / 150)));
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 2.4;
    deathParticles.push({
      x: cx + (Math.random() - 0.5) * entity.w * 0.6,
      y: cy + (Math.random() - 0.5) * entity.h * 0.6,
      vx: Math.cos(ang) * speed,
      vy: -Math.random() * 3 - 1.5,
      size: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 22 + Math.floor(Math.random() * 10),
      maxLife: 30
    });
  }
}

function crumbleColors(entity) {
  if (entity instanceof HammerBro) return ['#2e8b2e', '#8a5a2b', 'white'];
  if (entity instanceof SpaceRobot) return ['#9aa0ab', '#5a5f68', '#ff3b3b'];
  if (entity instanceof UFO) return ['#8a8fa0', '#6fd6ff', '#4a4f5a'];
  if (entity instanceof Enemy) return ['#7b4a12', 'white', 'black'];
  if (entity instanceof Bowser) return ['#3a8f3a', '#c46f2a', 'white'];
  if (entity instanceof KingBoo) return ['#f5f5f5', '#dedede', 'black'];
  if (entity instanceof Kamek) return ['#3a4fb0', '#e8d24a', '#c46f2a'];
  if (entity instanceof LawyerBoss) return ['#f2c229', '#3a3a3a', '#e8b98a'];
  if (entity instanceof HammerSquadBoss) return ['#8a6a3a', '#6b6b6b', '#2e8b2e'];
  if (entity instanceof Player) return ['#e52521', '#0033cc', '#ffcc99'];
  return ['#999', '#666'];
}

// shared "final hit" path: hides Mario, bursts him into crumble debris,
// and shows the game over overlay - used by every source of fatal damage
function killPlayerGameOver() {
  player.dead = true;
  spawnCrumble(player, crumbleColors(player));
  showOverlay('GAME OVER - trykk R for å starte på nytt');
}
let bosses = [];
let checkpoint = null;
let lives = 3;
let score = 0;
let coins = 0;
let won = false;

// Builds a boss instance of the given bossType, positioned relative to an
// x anchor exactly like each boss was originally hand-placed just before a
// level's flag (anchorX plays the role flagTile.x used to). Shared by the
// normal per-level spawn in initEnemies() and the boss-testing computer's
// select menu (see spawnSelectedBosses below), so picking a boss from the
// menu lands it the same way it'd sit in a real level.
function createBoss(bossType, anchorX, groundY) {
  if (bossType === 'kingboo') return new KingBoo(anchorX - 200, groundY - 160);
  if (bossType === 'kamek') return new Kamek(anchorX - 190, groundY - 170);
  if (bossType === 'lawyer') return new LawyerBoss(anchorX - 160, groundY - 80);
  if (bossType === 'hammersquad') return new HammerSquadBoss(anchorX - 220, groundY - 190);
  return new Bowser(anchorX - 150, groundY - 80);
}

// x anchor bosses are placed relative to: a real level's flag if it has
// one, otherwise the boss-testing arena's configured arena position.
function bossAnchorX(level) {
  if (flagTile) return flagTile.x;
  if (level.bossArenaX != null) return level.bossArenaX;
  return 400;
}

// True while the player is standing close enough to the boss-testing
// computer terminal to interact with it.
function nearComputer() {
  if (!computerTile) return false;
  const zone = { x: computerTile.x - 24, y: computerTile.y - 30, w: computerTile.w + 48, h: computerTile.h + 50 };
  return rectsOverlap(player, zone);
}

function openBossMenu() {
  bossMenuOpen = true;
}

function closeBossMenu() {
  bossMenuOpen = false;
  bossMenuSelected.clear();
}

// Spawns either every boss checked off in the menu (spread out left to
// right so they don't stack on top of each other), or - if nothing is
// checked - just whichever boss is currently highlighted. Replaces
// whatever bosses are already out and clears their still-flying
// projectiles/minions so switching mid-fight doesn't leave stray hazards
// behind.
function spawnSelectedBosses() {
  const level = LEVELS[currentLevelIndex];
  const groundY = (level.map.length - 1) * TILE;
  const anchorX = bossAnchorX(level);
  const spacing = level.bossArenaSpacing != null ? level.bossArenaSpacing : 260;
  const indices = bossMenuSelected.size > 0
    ? Array.from(bossMenuSelected).sort((a, b) => a - b)
    : [bossMenuIndex];
  fireballs = [];
  hammers = [];
  lawyerCars = [];
  sunroofDrops = [];
  bosses = indices.map((idx, i) => createBoss(BOSS_LIST[idx].type, anchorX + i * spacing, groundY));
  if (bosses.some(b => b instanceof LawyerBoss)) {
    bossMusicActive = false; // wait until he's actually on screen (see updateBossMusicTrigger)
  } else {
    stopBossMusic();
  }
  bossMenuSelected.clear();
  bossMenuOpen = false;
  const names = indices.map(idx => BOSS_LIST[idx].name).join(', ');
  showOverlayBrief('🖥️ Spawner ' + names + '!');
}

function initEnemies() {
  const level = LEVELS[currentLevelIndex];
  enemies = level.enemyPositions.map(p => {
    let e;
    if (p.type === 'hammerbro') e = new HammerBro(p.x, p.y, p.range);
    else if (p.type === 'flying') e = new FlyingEnemy(p.x, p.y, p.range);
    else if (p.type === 'flying-hammerbro') e = new FlyingHammerBro(p.x, p.y, p.range);
    else if (p.type === 'robot') e = new SpaceRobot(p.x, p.y, p.range);
    else if (p.type === 'ufo') e = new UFO(p.x, p.y, p.range);
    else e = new Enemy(p.x, p.y, p.range);
    // Ceiling-patrol enemies in a space level's gravity-flip section: walk
    // upside down on the underside of the ceiling platforms, same as they'd
    // patrol a normal floor, just with gravity/collision mirrored.
    if (p.flipped) e.gravityFlipped = true;
    return e;
  });
  fireballs = [];
  playerShots = [];
  hammers = [];
  deathParticles = [];
  lawyerCars = [];
  sunroofDrops = [];
  const groundY = (level.map.length - 1) * TILE;
  // Place the boss just before the flag. Levels with no bossType yet (e.g.
  // a level whose boss hasn't been designed) simply have no boss fight —
  // reaching the flag clears the level immediately. The boss-testing arena
  // never sets bossType, so it always starts empty until the player picks
  // one or more from the computer's menu.
  bosses = (flagTile && level.bossType) ? [createBoss(level.bossType, flagTile.x, groundY)] : [];
  if (bosses.some(b => b instanceof LawyerBoss)) {
    bossMusicActive = false; // wait until he's actually on screen to start the music
  } else {
    stopBossMusic();
  }
  // Checkpoint right before the boss — placed before any elevated platform
  // near the boss so it doesn't render underneath/inside one. Bossless
  // levels (and the boss-testing arena) use an explicit checkpointX from
  // the level config instead.
  let checkpointX = null;
  if (bosses.length) {
    checkpointX = computeCheckpointX(bosses[0].homeX, groundY);
  } else if (level.checkpointX != null) {
    checkpointX = level.checkpointX;
  }
  checkpoint = checkpointX != null ? {
    x: checkpointX,
    y: groundY - 90,
    w: 14,
    h: 90,
    activated: false
  } : null;
}

function computeCheckpointX(bossHomeX, groundY) {
  const searchStart = bossHomeX - 400;
  const searchEnd = bossHomeX - 20;
  let minObstacleX = bossHomeX;
  for (const t of solidTiles) {
    if (t.y < groundY && t.x >= searchStart && t.x <= searchEnd && t.x < minObstacleX) {
      minObstacleX = t.x;
    }
  }
  if (minObstacleX < bossHomeX) {
    return Math.max(40, minObstacleX - 65);
  }
  return bossHomeX - 145;
}

function updateHud() {
  livesEl.textContent = lives;
  scoreEl.textContent = score;
  coinsEl.textContent = coins;
  // Space levels swap the coin icon for a small icon that mirrors the
  // in-level glowing cyan energy-crystal coin (see drawCoins' spaceTheme
  // branch) instead of the default gold-coin emoji; tracker text stays
  // plain white like every other level.
  const spaceTheme = LEVELS[currentLevelIndex].theme === 'space';
  coinIconEl.innerHTML = spaceTheme
    ? '<svg width="16" height="16" viewBox="0 0 16 16" style="vertical-align:-3px;"><circle cx="8" cy="8" r="7" fill="#5fe6e6" stroke="#146470" stroke-width="1.5"/><circle cx="5.8" cy="5.8" r="2" fill="rgba(255,255,255,0.55)"/></svg>'
    : '🪙';
  const ammoRow = document.getElementById('ammoRow');
  const ammoEl = document.getElementById('ammo');
  if (player.gunAmmo > 0) {
    ammoRow.style.display = 'block';
    ammoEl.textContent = player.gunAmmo;
  } else {
    ammoRow.style.display = 'none';
  }
}

function showOverlay(text) {
  overlay.style.display = 'block';
  overlay.textContent = text;
}
function showOverlayBrief(text) {
  overlay.style.display = 'block';
  overlay.textContent = text;
  setTimeout(() => { if (!won && lives > 0) overlay.style.display = 'none'; }, 900);
}

// Default level-start spawn point: level.spawnX/spawnY override the
// generic (40, 300) fallback when a level needs a specific start position
// (e.g. the boss-testing arena spawns right next to its computer terminal).
function defaultSpawnForLevel(levelIdx) {
  const lvl = LEVELS[levelIdx];
  return { x: lvl.spawnX != null ? lvl.spawnX : 40, y: lvl.spawnY != null ? lvl.spawnY : 300 };
}

function restart() {
  // After fully winning the game, R starts a brand new game from level 1.
  // Otherwise (died / game over), respawn on the level the player was on,
  // keeping their checkpoint and progress.
  const fullReset = won;
  const hadCheckpoint = !fullReset && checkpoint && checkpoint.activated;
  // In the boss-testing arena, dying and respawning shouldn't wipe out
  // whatever boss(es) were already spawned from the computer's menu - that'd
  // mean walking back to the PC and re-selecting them after every death.
  // Keep the existing instances (with whatever hp/alive state they're in)
  // instead of letting initEnemies() below reset them to none.
  const isTestArena = !fullReset && LEVELS[currentLevelIndex] && LEVELS[currentLevelIndex].isTest;
  const survivingBosses = isTestArena ? bosses : null;
  lives = 3;
  won = false;
  if (fullReset) {
    currentLevelIndex = 0;
    score = 0;
    coins = 0;
    player.gunAmmo = 0;
  }
  buildLevel();
  initEnemies();
  if (survivingBosses) {
    bosses = survivingBosses;
    if (bosses.some(b => b instanceof LawyerBoss && b.alive)) {
      bossMusicActive = false; // wait until he's actually on screen again
    } else {
      stopBossMusic();
    }
  }
  if (hadCheckpoint && checkpoint) {
    checkpoint.activated = true;
    spawnPoint = { x: checkpoint.x, y: checkpoint.y };
  } else {
    spawnPoint = defaultSpawnForLevel(currentLevelIndex);
  }
  player.reset();
  overlay.style.display = 'none';
  updateHud();
}

function nextLevel() {
  currentLevelIndex++;
  spawnPoint = defaultSpawnForLevel(currentLevelIndex);
  buildLevel();
  initEnemies();
  player.reset();
  camX = 0;
  updateHud();
  showOverlayBrief('➡️ Bane ' + (currentLevelIndex + 1) + '!');
}

function teleportToBoss(levelIdx) {
  if (levelIdx < 0 || levelIdx >= LEVELS.length) return;
  currentLevelIndex = levelIdx;
  won = false;
  if (lives <= 0) lives = 3;
  buildLevel();
  initEnemies();
  if (LEVELS[levelIdx].isTest) {
    // No fixed boss/checkpoint fight here anymore - drop the player right
    // next to the computer terminal so they can pick a boss from the menu.
    spawnPoint = defaultSpawnForLevel(levelIdx);
  } else if (checkpoint) {
    spawnPoint = { x: checkpoint.x + 20, y: checkpoint.y };
  } else {
    spawnPoint = defaultSpawnForLevel(levelIdx);
  }
  player.reset();
  camX = Math.max(0, Math.min(spawnPoint.x - canvas.width / 2, levelWidth - canvas.width));
  overlay.style.display = 'none';
  updateHud();
  if (LEVELS[levelIdx].isTest) {
    showOverlayBrief('🖥️ Teleportert til boss-testarenaen!');
  } else if (bosses.length) {
    showOverlayBrief('👑 Teleportert til sjefsfighten på bane ' + (levelIdx + 1) + '!');
  } else {
    showOverlayBrief('🚩 Teleportert til sjekkpunktet på bane ' + (levelIdx + 1) + '!');
  }
}

function teleportToLevelStart(levelIdx) {
  if (levelIdx < 0 || levelIdx >= LEVELS.length) return;
  currentLevelIndex = levelIdx;
  won = false;
  if (lives <= 0) lives = 3;
  buildLevel();
  initEnemies();
  spawnPoint = defaultSpawnForLevel(levelIdx);
  player.reset();
  camX = Math.max(0, Math.min(spawnPoint.x - canvas.width / 2, levelWidth - canvas.width));
  overlay.style.display = 'none';
  updateHud();
  showOverlayBrief('🚩 Teleportert til starten av bane ' + (levelIdx + 1) + '!');
}

// A few hand-designed cloud shapes (lists of [dx, dy, rx, ry] ellipse puffs,
// relative to the cloud's center) so the sky doesn't just show one repeated
// blob. Bigger and more clearly defined than the old single 3-puff cloud.
const CLOUD_VARIANTS = [
  // classic wide cloud
  [[-46, 10, 34, 20], [0, -8, 40, 26], [46, 8, 34, 20], [14, 18, 26, 16]],
  // long, stretched-out cloud
  [[-62, 10, 28, 17], [-26, -8, 34, 22], [16, -4, 38, 24], [52, 8, 30, 18], [78, 16, 20, 13]],
  // small, round, extra-puffy cloud with a bump on top
  [[-30, 8, 28, 18], [0, -16, 26, 20], [30, 8, 28, 18], [0, 14, 22, 13]],
];

function drawCloud(cx, cy, scale, variant) {
  const puffs = CLOUD_VARIANTS[variant % CLOUD_VARIANTS.length];
  ctx.save();
  ctx.translate(cx, cy);
  if (scale !== 1) ctx.scale(scale, scale);
  // soft shaded under-layer, offset slightly down/right, gives the cloud a
  // bit of depth and a clearer silhouette against the sky
  ctx.fillStyle = 'rgba(188,208,232,0.85)';
  for (const [dx, dy, rx, ry] of puffs) {
    ctx.beginPath();
    ctx.ellipse(dx + 3, dy + 6, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // bright top puffs with a light outline so edges read clearly
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.strokeStyle = 'rgba(160,188,222,0.7)';
  ctx.lineWidth = 2;
  for (const [dx, dy, rx, ry] of puffs) {
    ctx.beginPath();
    ctx.ellipse(dx, dy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackground() {
  const testTheme = LEVELS[currentLevelIndex].theme === 'test';
  const spaceTheme = LEVELS[currentLevelIndex].theme === 'space';
  if (spaceTheme) {
    // Deep-space backdrop: near-black gradient sky with a scrolling
    // twinkling starfield and a couple of distant parallax planets.
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, '#050015');
    skyGrad.addColorStop(1, '#140030');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 90; i++) {
      const sx = (i * 137 - camX * 0.15) % (canvas.width + 200);
      const wx = sx < 0 ? sx + canvas.width + 200 : sx;
      const sy = (i * 71) % canvas.height;
      const twinkle = 0.5 + 0.5 * Math.sin(i * 13 + Date.now() / 400);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + 0.5 * twinkle) + ')';
      const r = 1 + (i % 3);
      ctx.fillRect(wx, sy, r, r);
    }
    const planetColors = ['#fae38e', '#e8e8f0', '#c44f8a'];
    for (let i = 0; i < 3; i++) {
      const px = (i * 500 + 200 - camX * 0.05) % (levelWidth + 500);
      const wx = px < 0 ? px + levelWidth + 500 : px;
      ctx.fillStyle = planetColors[i % planetColors.length];
      ctx.beginPath();
      ctx.arc(wx, 80 + (i % 2) * 60, 26 - i * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (testTheme) {
    // Neutral gray "test chamber" backdrop - deliberately not the game's
    // normal sky/grass look, so this reads as an out-of-theme testing area.
    ctx.fillStyle = '#3a3f44';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    const gridStep = 80;
    for (let gx = -((camX * 0.3) % gridStep); gx < canvas.width; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, canvas.height);
      ctx.stroke();
    }
    for (let gy = 0; gy < canvas.height; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(canvas.width, gy);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // clouds: bigger than before, cycling through a few distinct shapes/sizes
    for (let i = 0; i < 6; i++) {
      const cx = (i * 300 - camX * 0.3) % (levelWidth + 300);
      const variant = i % CLOUD_VARIANTS.length;
      const scale = 1.1 + (i % 3) * 0.2;
      drawCloud(cx + 100, 60 + (i % 3) * 20, scale, variant);
    }
  }
  // Dark "void" band at the level of the main ground row, drawn behind the
  // tiles: solid ground tiles draw over it, but pits/gaps show this instead
  // of plain sky, so holes in the floor are obvious at a glance.
  const groundY = (LEVELS[currentLevelIndex].map.length - 1) * TILE;
  const grad = ctx.createLinearGradient(0, groundY, 0, canvas.height);
  if (testTheme) {
    grad.addColorStop(0, '#1c1f22');
    grad.addColorStop(1, '#050607');
  } else if (spaceTheme) {
    grad.addColorStop(0, '#0a0018');
    grad.addColorStop(1, '#000000');
  } else {
    grad.addColorStop(0, '#241505');
    grad.addColorStop(1, '#050208');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
}

function drawTiles() {
  // Quick lookup so we can tell which tiles have a neighbor above them
  // (used to draw a grass cap only on exposed top surfaces).
  if (!drawTiles._set || drawTiles._level !== currentLevelIndex) {
    const set = new Set();
    for (const t of solidTiles) if (!t.pipe && !t.itemBlock) set.add(t.x + ',' + t.y);
    drawTiles._set = set;
    drawTiles._level = currentLevelIndex;
  }
  const groundSet = drawTiles._set;
  const testTheme = LEVELS[currentLevelIndex].theme === 'test';
  const spaceTheme = LEVELS[currentLevelIndex].theme === 'space';
  for (const t of solidTiles) {
    const sx = t.x - camX;
    if (sx < -TILE || sx > canvas.width) continue;
    if (t.itemBlock) {
      if (t.used) {
        ctx.fillStyle = spaceTheme ? '#3a4550' : '#8a7a6a';
        ctx.fillRect(sx, t.y, t.w, t.h);
        ctx.strokeStyle = spaceTheme ? '#1e2530' : '#5a4d40';
        ctx.strokeRect(sx, t.y, t.w, t.h);
      } else {
        // Space level swaps the classic orange "?" block for a cyan
        // metallic one, matching the space-station platform palette.
        ctx.fillStyle = spaceTheme ? '#2fb8c9' : '#f2a71b';
        ctx.fillRect(sx, t.y, t.w, t.h);
        ctx.strokeStyle = spaceTheme ? '#146470' : '#a56c0a';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, t.y + 1, t.w - 2, t.h - 2);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', sx + t.w / 2, t.y + t.h - 10);
      }
    } else if (t.pipe) {
      ctx.fillStyle = '#0a8f0a';
      ctx.fillRect(sx, t.y, t.w, t.h);
      ctx.strokeStyle = '#065906';
      ctx.strokeRect(sx, t.y, t.w, t.h);
      if (t.warp) {
        // downward arrow hint: press Down to warp
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(sx + t.w / 2 - 8, t.y + 8);
        ctx.lineTo(sx + t.w / 2 + 8, t.y + 8);
        ctx.lineTo(sx + t.w / 2, t.y + 20);
        ctx.fill();
      }
    } else if (testTheme) {
      // Plain neutral gray blocks for the boss-testing arena - no
      // grass/dirt texture, just a flat gray slab with a faint top edge.
      ctx.fillStyle = '#5a6168';
      ctx.fillRect(sx, t.y, t.w, t.h);
      ctx.strokeStyle = '#33383d';
      ctx.strokeRect(sx, t.y, t.w, t.h);
      const hasAbove = groundSet.has(t.x + ',' + (t.y - TILE));
      if (!hasAbove) {
        ctx.fillStyle = '#787f86';
        ctx.fillRect(sx, t.y, t.w, 6);
      }
    } else if (spaceTheme) {
      // Metallic space-station platform: dark plating with a glowing cyan
      // top edge on exposed surfaces, instead of the grass/dirt look.
      ctx.fillStyle = '#3a3f52';
      ctx.fillRect(sx, t.y, t.w, t.h);
      ctx.strokeStyle = '#1e2130';
      ctx.strokeRect(sx, t.y, t.w, t.h);
      if (t.ceiling) {
        // Ceiling platform: the exact same plating, but mirrored - the
        // faint highlight strip and glowing edge sit on the BOTTOM (the
        // side facing the gravity-flipped player walking underneath),
        // instead of the top.
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(sx + 4, t.y + t.h - 7, t.w - 8, 3);
        ctx.fillStyle = '#5fe6e6';
        ctx.fillRect(sx, t.y + t.h - 5, t.w, 5);
        ctx.fillStyle = 'rgba(95,230,230,0.35)';
        ctx.fillRect(sx, t.y + t.h - 9, t.w, 4);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(sx + 4, t.y + 4, t.w - 8, 3);
        const hasAbove = groundSet.has(t.x + ',' + (t.y - TILE));
        if (!hasAbove) {
          ctx.fillStyle = '#5fe6e6';
          ctx.fillRect(sx, t.y, t.w, 5);
          ctx.fillStyle = 'rgba(95,230,230,0.35)';
          ctx.fillRect(sx, t.y + 5, t.w, 4);
        }
      }
    } else {
      ctx.fillStyle = '#c2701d';
      ctx.fillRect(sx, t.y, t.w, t.h);
      ctx.strokeStyle = '#8a4c0f';
      ctx.strokeRect(sx, t.y, t.w, t.h);
      // Grass cap on any exposed top surface — makes solid ground pop
      // clearly against the void/sky, so gaps are unmistakable.
      const hasAbove = groundSet.has(t.x + ',' + (t.y - TILE));
      if (!hasAbove) {
        ctx.fillStyle = '#4fc430';
        ctx.fillRect(sx, t.y, t.w, 7);
        ctx.fillStyle = '#2f8a1f';
        ctx.fillRect(sx, t.y + 5, t.w, 3);
        // little tufts for texture
        ctx.fillStyle = '#3fae2a';
        ctx.fillRect(sx + 4, t.y - 3, 4, 5);
        ctx.fillRect(sx + t.w - 8, t.y - 3, 4, 5);
      }
      // Darker edge highlight where a tile has no left/right neighbor at the
      // same height — marks the lip of a drop-off / pit edge.
      const hasLeft = groundSet.has((t.x - TILE) + ',' + t.y);
      const hasRight = groundSet.has((t.x + TILE) + ',' + t.y);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      if (!hasLeft) ctx.fillRect(sx, t.y, 5, t.h);
      if (!hasRight) ctx.fillRect(sx + t.w - 5, t.y, 5, t.h);
    }
  }
}

function drawStars() {
  for (const s of stars) {
    if (s.taken) continue;
    const sx = s.x - camX;
    if (sx < -30 || sx > canvas.width + 30) continue;
    const cx = sx + s.w / 2;
    const cy = s.y + s.h / 2;
    const r = s.w / 2;
    ctx.fillStyle = '#ffe135';
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = -Math.PI / 2 + i * (2 * Math.PI / 5);
      const innerAngle = outerAngle + Math.PI / 5;
      const ox = cx + Math.cos(outerAngle) * r;
      const oy = cy + Math.sin(outerAngle) * r;
      const ix = cx + Math.cos(innerAngle) * r * 0.45;
      const iy = cy + Math.sin(innerAngle) * r * 0.45;
      if (i === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawCoins() {
  const spaceTheme = LEVELS[currentLevelIndex].theme === 'space';
  for (const c of coinTiles) {
    if (c.taken) continue;
    const sx = c.x - camX;
    if (sx < -30 || sx > canvas.width) continue;
    if (spaceTheme) {
      // Glowing cyan energy crystal instead of a gold coin, matching the
      // space-station platform/item-block palette.
      ctx.fillStyle = '#5fe6e6';
      ctx.beginPath();
      ctx.arc(sx + c.w / 2, c.y + c.h / 2, c.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#146470';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(sx + c.w / 2 - 3, c.y + c.h / 2 - 3, c.w / 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(sx + c.w / 2, c.y + c.h / 2, c.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b8860b';
      ctx.stroke();
    }
  }
}

function drawGravityPads() {
  // Glowing pad with an arrow pointing whichever way it will send gravity
  // ('g' pads point away from the current floor, 'k' pads point back).
  for (const p of gravityPads) {
    const sx = p.x - camX;
    if (sx < -TILE || sx > canvas.width) continue;
    const flipToUp = p.target; // true = pad flips gravity so the player falls upward
    ctx.fillStyle = flipToUp ? 'rgba(95,230,230,0.28)' : 'rgba(242,167,27,0.28)';
    ctx.fillRect(sx, p.y, p.w, p.h);
    ctx.strokeStyle = flipToUp ? '#5fe6e6' : '#f2a71b';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, p.y + 1, p.w - 2, p.h - 2);
    const cx = sx + p.w / 2;
    const cy = p.y + p.h / 2;
    ctx.fillStyle = flipToUp ? '#5fe6e6' : '#f2a71b';
    ctx.beginPath();
    if (flipToUp) {
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx - 8, cy + 6);
      ctx.lineTo(cx + 8, cy + 6);
    } else {
      ctx.moveTo(cx, cy + 8);
      ctx.lineTo(cx - 8, cy - 6);
      ctx.lineTo(cx + 8, cy - 6);
    }
    ctx.closePath();
    ctx.fill();
  }
}

function drawFlag() {
  if (!flagTile) return;
  const sx = flagTile.x - camX;
  ctx.fillStyle = '#cccccc';
  ctx.fillRect(sx, flagTile.y, 6, flagTile.h);
  ctx.fillStyle = '#2ecc71';
  ctx.beginPath();
  ctx.moveTo(sx + 6, flagTile.y + 10);
  ctx.lineTo(sx + 46, flagTile.y + 25);
  ctx.lineTo(sx + 6, flagTile.y + 40);
  ctx.fill();
}

// Old-school beige CRT terminal prop for the boss-testing arena. Shows a
// glowing green "ENTER" prompt above it whenever the player is close enough
// to interact, unless the boss-select menu is already open.
function drawComputer() {
  if (!computerTile) return;
  const sx = computerTile.x - camX;
  if (sx < -60 || sx > canvas.width + 60) return;
  const t = computerTile;
  // monitor body
  ctx.fillStyle = '#d8d2c0';
  ctx.fillRect(sx + 2, t.y + 6, t.w - 4, t.h - 6);
  ctx.strokeStyle = '#8a8370';
  ctx.strokeRect(sx + 2, t.y + 6, t.w - 4, t.h - 6);
  // screen
  const flicker = 0.75 + 0.25 * Math.sin(Date.now() / 250);
  ctx.fillStyle = 'rgba(40, 220, 100, ' + flicker.toFixed(2) + ')';
  ctx.fillRect(sx + 7, t.y + 11, t.w - 14, t.h * 0.55);
  ctx.fillStyle = '#3a3427';
  ctx.fillRect(sx + t.w / 2 - 5, t.y + t.h - 8, 10, 8); // stand
  ctx.fillRect(sx + 2, t.y + t.h, t.w - 4, 5); // base
  if (!bossMenuOpen && nearComputer()) {
    ctx.fillStyle = '#39ff6a';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENTER', sx + t.w / 2, t.y - 8);
  }
}

function drawCheckpoint() {
  if (!checkpoint) return;
  const sx = checkpoint.x - camX;
  if (sx < -30 || sx > canvas.width + 30) return;
  ctx.fillStyle = '#888888';
  ctx.fillRect(sx, checkpoint.y, 6, checkpoint.h);
  ctx.fillStyle = checkpoint.activated ? '#2ecc71' : '#999999';
  ctx.beginPath();
  ctx.moveTo(sx + 6, checkpoint.y + 6);
  ctx.lineTo(sx + 32, checkpoint.y + 16);
  ctx.lineTo(sx + 6, checkpoint.y + 26);
  ctx.fill();
}

function checkCheckpoint() {
  if (!checkpoint || checkpoint.activated) return;
  if (rectsOverlap(player, checkpoint)) {
    checkpoint.activated = true;
    spawnPoint = { x: checkpoint.x, y: checkpoint.y };
    showOverlayBrief('✅ Checkpoint nådd!');
  }
}

function checkPipeWarp() {
  if (warpCooldown > 0) { warpCooldown--; return; }
  if (!player.onGround) return;
  if (!(keys['ArrowDown'] || keys['KeyS'])) return;
  for (const p of pipeWarps) {
    if (rectsOverlap(player, p)) {
      player.x = p.toX;
      player.y = p.toY;
      player.vx = 0;
      player.vy = 0;
      warpCooldown = 20;
      showOverlayBrief(p.msg || '🟢 Warp!');
      break;
    }
  }
}

function checkStars() {
  for (const s of stars) {
    if (s.taken) continue;
    if (rectsOverlap(player, s)) {
      s.taken = true;
      score += 5000;
      updateHud();
      showOverlayBrief('⭐ STJERNE! +5000 poeng!');
    }
  }
}

function checkCoins() {
  for (const c of coinTiles) {
    if (c.taken) continue;
    if (rectsOverlap(player, c)) {
      c.taken = true;
      coins++;
      score += 100;
      updateHud();
    }
  }
}

function checkGravityPads() {
  for (const p of gravityPads) {
    if (player.gravityFlipped === p.target) continue;
    if (rectsOverlap(player, p)) {
      player.gravityFlipped = p.target;
      player.vy = 0;
      player.onGround = false;
      player.jumpsUsed = 0;
    }
  }
}

function checkEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue;
    if (rectsOverlap(player, e)) {
      // Stomping direction/proximity mirrors the enemy's own orientation:
      // a normal floor enemy is only exposed on top (player must be
      // falling downward and land near its top), while a ceiling-walking
      // enemy in a space level's gravity-flip section is only exposed on
      // its underside (player must be "falling" upward toward the
      // ceiling and land near its bottom).
      const falling = e.gravityFlipped
        ? player.vy < 0 && (e.y + e.h) - player.y < 20
        : player.vy > 0 && (player.y + player.h) - e.y < 20;
      if (falling) {
        e.alive = false;
        spawnCrumble(e, crumbleColors(e));
        player.vy = e.gravityFlipped ? 9 : -9;
        player.jumpsUsed = 0;
        score += 200;
        updateHud();
      } else if (player.invuln === 0) {
        player.invuln = 90;
        player.vx = player.facing > 0 ? -6 : 6;
        // Knockback is away from the surface the player is currently
        // standing on - upward normally, downward while gravity-flipped
        // (walking upside down on a ceiling), matching the stomp bounce.
        player.vy = player.gravityFlipped ? 6 : -6;
        lives--;
        updateHud();
        if (lives <= 0) killPlayerGameOver();
      }
    }
  }
}

function checkWin() {
  if (won || !flagTile) return;
  if (bosses.some(b => b.alive)) return; // must defeat every boss first
  if (player.x + player.w > flagTile.x) {
    const level = LEVELS[currentLevelIndex];
    if (currentLevelIndex < REAL_LEVEL_COUNT - 1) {
      nextLevel();
      return;
    }
    won = true;
    score += 1000;
    updateHud();
    const bossName = level.bossName;
    if (bossName) {
      showOverlay('🎉 Du beseiret ' + bossName + ' og vant hele spillet! Poeng: ' + score + '  (trykk R for å spille igjen)');
    } else {
      showOverlay('🏁 Bane ' + (currentLevelIndex + 1) + ' fullført! Poeng: ' + score + '  (trykk R for å spille igjen)');
    }
  }
}

function checkBosses() {
  for (const b of bosses) {
    if (!b.alive) continue;
    // Once a HammerSquadBoss has broken apart it has no body left to
    // collide with - its three dropped riders are plain enemies from here
    // on, handled by checkEnemies()/checkPlayerShots() like any other foe.
    const hittable = !b.broken && (b.visible === undefined || b.visible);
    if (!b.broken && rectsOverlap(player, b)) {
      const falling = player.vy > 0 && (player.y + player.h) - b.y < 24;
      if (falling && b.invuln === 0 && hittable) {
        b.hp--;
        b.invuln = 60;
        player.vy = -10;
        player.jumpsUsed = 0;
        score += 300;
        updateHud();
        if (b.hp <= 0) {
          if (b instanceof HammerSquadBoss) {
            b.breakApart();
          } else {
            b.alive = false;
            spawnCrumble(b, crumbleColors(b));
          }
          score += 2000;
          updateHud();
          if (b instanceof LawyerBoss) stopBossMusic();
        }
      } else if (player.invuln === 0 && hittable) {
        player.invuln = 90;
        player.vx = player.x < b.x ? -7 : 7;
        player.vy = -6;
        lives--;
        updateHud();
        if (lives <= 0) killPlayerGameOver();
      }
    }
    if (b.breathHitbox && player.invuln === 0 && rectsOverlap(player, b.breathHitbox)) {
      player.invuln = 90;
      player.vx = player.x < b.x ? -7 : 7;
      player.vy = -6;
      // Getting caught in Bowser's full fire breath is instantly fatal
      lives = 0;
      updateHud();
      killPlayerGameOver();
    }
  }
  // Shared projectile/minion hazards below aren't tied to any one boss
  // instance, so they're only checked once per frame regardless of how
  // many bosses are currently out.
  for (const f of fireballs) {
    if (!f.dead && player.invuln === 0 && rectsOverlap(player, f)) {
      f.dead = true;
      player.invuln = 90;
      player.vx = player.x < f.x ? -7 : 7;
      player.vy = -6;
      lives--;
      updateHud();
      if (lives <= 0) killPlayerGameOver();
    }
  }
  for (const c of lawyerCars) {
    if (!c.dead && player.invuln === 0 && rectsOverlap(player, c)) {
      player.invuln = 90;
      player.vx = player.x < c.x ? -7 : 7;
      player.vy = -6;
      lives--;
      updateHud();
      if (lives <= 0) killPlayerGameOver();
    }
  }
  for (const d of sunroofDrops) {
    if (!d.dead && !d.landed && player.invuln === 0 && rectsOverlap(player, d)) {
      d.landed = true;
      d.splat = 26;
      player.invuln = 90;
      player.vx = player.x < d.x ? -7 : 7;
      player.vy = -6;
      lives--;
      updateHud();
      if (lives <= 0) killPlayerGameOver();
    }
  }
}

function checkPowerups() {
  for (const p of powerups) {
    if (p.taken) continue;
    if (rectsOverlap(player, p)) {
      p.taken = true;
      player.gunAmmo = 5;
      updateHud();
      showOverlayBrief('🔫 Laserpistol! 5 skudd - trykk W for å skyte!');
    }
  }
  powerups = powerups.filter(p => !p.taken);
}

function checkPlayerShots() {
  for (const s of playerShots) {
    if (s.dead) continue;
    for (const e of enemies) {
      if (e.alive && rectsOverlap(s, e)) {
        e.alive = false;
        spawnCrumble(e, crumbleColors(e));
        s.dead = true;
        break;
      }
    }
    if (s.dead) continue;
    for (const b of bosses) {
      if (!b.alive || b.broken) continue;
      const hittable = b.visible === undefined || b.visible;
      if (hittable && b.invuln === 0 && rectsOverlap(s, b)) {
        b.hp--;
        s.dead = true;
        if (b.hp <= 0) {
          if (b instanceof HammerSquadBoss) {
            b.breakApart();
          } else {
            b.alive = false;
            spawnCrumble(b, crumbleColors(b));
          }
          if (b instanceof LawyerBoss) stopBossMusic();
        }
        break;
      }
    }
    if (s.dead) continue;
    for (const h of hammers) {
      if (!h.dead && rectsOverlap(s, h)) {
          h.dead = true;
          s.dead = true;
          break;
      }
    }
  }
}

function checkHammers() {
  for (const h of hammers) {
    if (!h.dead && player.invuln === 0 && rectsOverlap(player, h)) {
      h.dead = true;
      player.invuln = 90;
      player.vx = player.x < h.x ? -7 : 7;
      player.vy = -6;
      lives--;
      updateHud();
      if (lives <= 0) killPlayerGameOver();
    }
  }
}

// Draws the boss-testing computer's boss-select menu: a retro green-on-
// black terminal box listing BOSS_LIST, highlighting the current cursor
// row and checking off any rows added to the multi-select set.
function drawBossMenu() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const headerH = 44;
  const rowH = 30;
  const footerH = 58;
  const boxW = 380;
  const boxH = headerH + BOSS_LIST.length * rowH + footerH;
  const boxX = canvas.width / 2 - boxW / 2;
  const boxY = canvas.height / 2 - boxH / 2;
  ctx.fillStyle = '#0a120a';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#39ff6a';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.fillStyle = '#39ff6a';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('-- SELECT BOSS(ES) --', canvas.width / 2, boxY + 28);
  ctx.font = '14px monospace';
  BOSS_LIST.forEach((b, i) => {
    const rowY = boxY + headerH + i * rowH;
    const selected = bossMenuSelected.has(i);
    if (i === bossMenuIndex) {
      ctx.fillStyle = 'rgba(57, 255, 106, 0.25)';
      ctx.fillRect(boxX + 8, rowY, boxW - 16, rowH - 6);
    }
    ctx.fillStyle = selected ? '#ffd93d' : (i === bossMenuIndex ? '#c8ffd8' : '#39ff6a');
    ctx.textAlign = 'left';
    const cursor = i === bossMenuIndex ? '> ' : '  ';
    const checkbox = selected ? '[x] ' : '[ ] ';
    ctx.fillText(cursor + checkbox + b.name, boxX + 16, rowY + rowH - 14);
  });
  ctx.strokeStyle = 'rgba(57, 255, 106, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boxX + 8, boxY + headerH + BOSS_LIST.length * rowH + 6);
  ctx.lineTo(boxX + boxW - 8, boxY + headerH + BOSS_LIST.length * rowH + 6);
  ctx.stroke();
  ctx.fillStyle = '#8fd8a0';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('↑↓ Move   ←→ Unselect/Select', canvas.width / 2, boxY + boxH - 32);
  const enterHint = bossMenuSelected.size > 0 ? 'ENTER Spawn selected   ESC Cancel' : 'ENTER Spawn highlighted   ESC Cancel';
  ctx.fillText(enterHint, canvas.width / 2, boxY + boxH - 14);
}

function loop() {
  if (!won && lives > 0 && !bossMenuOpen) {
    player.update();
    for (const e of enemies) e.update();
    for (const b of bosses) b.update();
    for (const f of fireballs) f.update();
    fireballs = fireballs.filter(f => !f.dead);
    for (const c of lawyerCars) c.update();
    lawyerCars = lawyerCars.filter(c => !c.dead);
    for (const d of sunroofDrops) d.update();
    sunroofDrops = sunroofDrops.filter(d => !d.dead);
    for (const p of powerups) p.update();
    for (const s of playerShots) s.update();
    playerShots = playerShots.filter(s => !s.dead);
    for (const h of hammers) h.update();
    hammers = hammers.filter(h => !h.dead);
    checkCoins();
    checkGravityPads();
    checkCheckpoint();
    checkPipeWarp();
    checkStars();
    checkPowerups();
    checkEnemies();
    checkBosses();
    checkPlayerShots();
    checkHammers();
    checkWin();

    camX = player.x - canvas.width / 2 + player.w / 2;
    if (camX < 0) camX = 0;
    if (camX > levelWidth - canvas.width) camX = levelWidth - canvas.width;
    updateBossMusicTrigger();
  }

  for (const dp of deathParticles) {
    dp.vy += GRAVITY * 0.4;
    dp.x += dp.vx;
    dp.y += dp.vy;
    dp.rot += dp.vrot;
    dp.life--;
  }
  deathParticles = deathParticles.filter(dp => dp.life > 0);

  drawBackground();
  drawTiles();
  drawCoins();
  drawGravityPads();
  drawStars();
  drawCheckpoint();
  drawFlag();
  drawComputer();
  for (const p of powerups) p.draw();
  for (const e of enemies) e.draw();
  for (const b of bosses) b.draw();
  for (const f of fireballs) f.draw();
  for (const c of lawyerCars) c.draw();
  for (const d of sunroofDrops) d.draw();
  for (const s of playerShots) s.draw();
  for (const h of hammers) h.draw();
  for (const dp of deathParticles) {
    const sx = dp.x - camX;
    if (sx < -30 || sx > canvas.width + 30) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, dp.life / dp.maxLife);
    ctx.translate(sx, dp.y);
    ctx.rotate(dp.rot);
    ctx.fillStyle = dp.color;
    ctx.fillRect(-dp.size / 2, -dp.size / 2, dp.size, dp.size);
    ctx.restore();
  }
  player.draw();
  if (bossMenuOpen) drawBossMenu();

  requestAnimationFrame(loop);
}

buildLevel();
initEnemies();
updateHud();
loop();
