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

function buildLevel() {
  coinTiles = [];
  solidTiles = [];
  flagTile = null;
  stars = [];
  pipeWarps = [];
  warpCooldown = 0;
  powerups = [];
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
      } else if (ch === 'q') {
        solidTiles.push({x, y, w: TILE, h: TILE, pipe: false, itemBlock: true, used: false});
      } else if (ch === '2') {
        coinTiles.push({x: x + 8, y: y + 8, w: 24, h: 24, taken: false});
      } else if (ch === '3') {
        flagCol = col;
      }
    }
  }
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
  if (boss instanceof LawyerBoss && boss.alive) {
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
  if (bossMusicActive || !(boss instanceof LawyerBoss) || !boss.alive) return;
  const sx = boss.x - camX;
  if (sx + boss.w > 0 && sx < canvas.width) {
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
let boss = null;
let checkpoint = null;
let lives = 3;
let score = 0;
let coins = 0;
let won = false;

function initEnemies() {
  const level = LEVELS[currentLevelIndex];
  enemies = level.enemyPositions.map(p => {
    if (p.type === 'hammerbro') return new HammerBro(p.x, p.y, p.range);
    if (p.type === 'flying') return new FlyingEnemy(p.x, p.y, p.range);
    if (p.type === 'flying-hammerbro') return new FlyingHammerBro(p.x, p.y, p.range);
    if (p.type === 'robot') return new SpaceRobot(p.x, p.y, p.range);
    if (p.type === 'ufo') return new UFO(p.x, p.y, p.range);
    return new Enemy(p.x, p.y, p.range);
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
  // reaching the flag clears the level immediately.
  if (flagTile && level.bossType) {
    if (level.bossType === 'kingboo') {
      boss = new KingBoo(flagTile.x - 200, flagTile.y + flagTile.h - 160);
    } else if (level.bossType === 'kamek') {
      boss = new Kamek(flagTile.x - 190, groundY - 170);
    } else if (level.bossType === 'lawyer') {
      boss = new LawyerBoss(flagTile.x - 160, flagTile.y + flagTile.h - 80);
    } else if (level.bossType === 'hammersquad') {
      boss = new HammerSquadBoss(flagTile.x - 220, flagTile.y + flagTile.h - 190);
    } else {
      boss = new Bowser(flagTile.x - 150, flagTile.y + flagTile.h - 80);
    }
  } else {
    boss = null;
  }
  if (boss instanceof LawyerBoss) {
    bossMusicActive = false; // wait until he's actually on screen to start the music
  } else {
    stopBossMusic();
  }
  // Checkpoint right before the boss — placed before any elevated platform
  // near the boss so it doesn't render underneath/inside one. Bossless
  // levels use an explicit checkpointX from the level config instead.
  let checkpointX = null;
  if (boss) {
    checkpointX = computeCheckpointX(boss.homeX, groundY);
  } else if (flagTile && level.checkpointX != null) {
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

function restart() {
  // After fully winning the game, R starts a brand new game from level 1.
  // Otherwise (died / game over), respawn on the level the player was on,
  // keeping their checkpoint and progress.
  const fullReset = won;
  const hadCheckpoint = !fullReset && checkpoint && checkpoint.activated;
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
  if (hadCheckpoint && checkpoint) {
    checkpoint.activated = true;
    spawnPoint = { x: checkpoint.x, y: checkpoint.y };
  } else {
    spawnPoint = { x: 40, y: 300 };
  }
  player.reset();
  overlay.style.display = 'none';
  updateHud();
}

function nextLevel() {
  currentLevelIndex++;
  spawnPoint = { x: 40, y: 300 };
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
  if (checkpoint) {
    spawnPoint = { x: checkpoint.x + 20, y: checkpoint.y };
  } else {
    spawnPoint = { x: 40, y: 300 };
  }
  player.reset();
  camX = Math.max(0, Math.min(spawnPoint.x - canvas.width / 2, levelWidth - canvas.width));
  overlay.style.display = 'none';
  updateHud();
  if (boss) {
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
  spawnPoint = { x: 40, y: 300 };
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
    const planetColors = ['#c46f2a', '#4fc4c4', '#c44f8a'];
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
        ctx.fillStyle = '#8a7a6a';
        ctx.fillRect(sx, t.y, t.w, t.h);
        ctx.strokeStyle = '#5a4d40';
        ctx.strokeRect(sx, t.y, t.w, t.h);
      } else {
        ctx.fillStyle = '#f2a71b';
        ctx.fillRect(sx, t.y, t.w, t.h);
        ctx.strokeStyle = '#a56c0a';
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
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(sx + 4, t.y + 4, t.w - 8, 3);
      const hasAbove = groundSet.has(t.x + ',' + (t.y - TILE));
      if (!hasAbove) {
        ctx.fillStyle = '#5fe6e6';
        ctx.fillRect(sx, t.y, t.w, 5);
        ctx.fillStyle = 'rgba(95,230,230,0.35)';
        ctx.fillRect(sx, t.y + 5, t.w, 4);
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
  for (const c of coinTiles) {
    if (c.taken) continue;
    const sx = c.x - camX;
    if (sx < -30 || sx > canvas.width) continue;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(sx + c.w / 2, c.y + c.h / 2, c.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.stroke();
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

function checkEnemies() {
  for (const e of enemies) {
    if (!e.alive) continue;
    if (rectsOverlap(player, e)) {
      const falling = player.vy > 0 && (player.y + player.h) - e.y < 20;
      if (falling) {
        e.alive = false;
        spawnCrumble(e, crumbleColors(e));
        player.vy = -9;
        player.jumpsUsed = 0;
        score += 200;
        updateHud();
      } else if (player.invuln === 0) {
        player.invuln = 90;
        player.vx = player.facing > 0 ? -6 : 6;
        player.vy = -6;
        lives--;
        updateHud();
        if (lives <= 0) killPlayerGameOver();
      }
    }
  }
}

function checkWin() {
  if (won || !flagTile) return;
  if (boss && boss.alive) return; // must defeat the boss first
  if (player.x + player.w > flagTile.x) {
    const level = LEVELS[currentLevelIndex];
    if (level.isTest) {
      // Boss-testing arena: never chains into another level or the
      // "you won the game" screen, it just confirms the run.
      won = true;
      score += 1000;
      updateHud();
      showOverlay('🧪 Boss-test fullført! Poeng: ' + score + '  (trykk R for å restarte)');
      return;
    }
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

function checkBoss() {
  if (!boss || !boss.alive) return;
  // Once a HammerSquadBoss has broken apart it has no body left to
  // collide with - its three dropped riders are plain enemies from here
  // on, handled by checkEnemies()/checkPlayerShots() like any other foe.
  const hittable = !boss.broken && (boss.visible === undefined || boss.visible);
  if (!boss.broken && rectsOverlap(player, boss)) {
    const falling = player.vy > 0 && (player.y + player.h) - boss.y < 24;
    if (falling && boss.invuln === 0 && hittable) {
      boss.hp--;
      boss.invuln = 60;
      player.vy = -10;
      player.jumpsUsed = 0;
      score += 300;
      updateHud();
      if (boss.hp <= 0) {
        if (boss instanceof HammerSquadBoss) {
          boss.breakApart();
        } else {
          boss.alive = false;
          spawnCrumble(boss, crumbleColors(boss));
        }
        score += 2000;
        updateHud();
        if (boss instanceof LawyerBoss) stopBossMusic();
      }
    } else if (player.invuln === 0 && hittable) {
      player.invuln = 90;
      player.vx = player.x < boss.x ? -7 : 7;
      player.vy = -6;
      lives--;
      updateHud();
      if (lives <= 0) killPlayerGameOver();
    }
  }
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
  if (boss.breathHitbox && player.invuln === 0 && rectsOverlap(player, boss.breathHitbox)) {
    player.invuln = 90;
    player.vx = player.x < boss.x ? -7 : 7;
    player.vy = -6;
    lives--;
    updateHud();
    if (lives <= 0) killPlayerGameOver();
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
    if (boss && boss.alive && !boss.broken) {
      const hittable = boss.visible === undefined || boss.visible;
      if (hittable && boss.invuln === 0 && rectsOverlap(s, boss)) {
        boss.hp--;
        s.dead = true;
        if (boss.hp <= 0) {
          if (boss instanceof HammerSquadBoss) {
            boss.breakApart();
          } else {
            boss.alive = false;
            spawnCrumble(boss, crumbleColors(boss));
          }
          if (boss instanceof LawyerBoss) stopBossMusic();
        }
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

function loop() {
  if (!won && lives > 0) {
    player.update();
    for (const e of enemies) e.update();
    if (boss) boss.update();
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
    checkCheckpoint();
    checkPipeWarp();
    checkStars();
    checkPowerups();
    checkEnemies();
    checkBoss();
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
  drawStars();
  drawCheckpoint();
  drawFlag();
  for (const p of powerups) p.draw();
  for (const e of enemies) e.draw();
  if (boss) boss.draw();
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

  requestAnimationFrame(loop);
}

buildLevel();
initEnemies();
updateHud();
loop();
