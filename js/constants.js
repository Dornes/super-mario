// Canvas/HUD element refs, tunable physics constants, and raw keyboard
// input handling (movement keys, jump, shoot, sprint double-tap,
// cheats, level-select hotkeys, hint toggle).
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const livesEl = document.getElementById('lives');
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');
const coinIconEl = document.getElementById('coinIcon');

const GRAVITY = 0.6;
const FRICTION = 0.8;
const TILE = 40;

let keys = {};
let jumpPressed = false;
let shootPressed = false;
let hintVisible = false;
const jumpKeys = ['Space', 'ArrowUp'];
const DOUBLE_TAP_MS = 300;
let lastTap = { left: 0, right: 0 };
window.addEventListener('keydown', e => {
  if (!keys[e.code] && jumpKeys.includes(e.code) && !bossMenuOpen) jumpPressed = true;
  if (!keys[e.code] && e.code === 'KeyW') shootPressed = true;
  if (!keys[e.code] && (e.code === 'ArrowLeft' || e.code === 'KeyA') && !bossMenuOpen) {
    const now = Date.now();
    if (now - lastTap.left < DOUBLE_TAP_MS) player.sprinting = true;
    lastTap.left = now;
  }
  if (!keys[e.code] && (e.code === 'ArrowRight' || e.code === 'KeyD') && !bossMenuOpen) {
    const now = Date.now();
    if (now - lastTap.right < DOUBLE_TAP_MS) player.sprinting = true;
    lastTap.right = now;
  }
  keys[e.code] = true;
  // Boss-testing computer: Enter opens the boss-select menu when standing
  // near it (or spawns the selected/highlighted boss(es) while the menu is
  // open), Up/Down navigate the list, Left/Right unselect/select the
  // highlighted boss for multi-spawn, and Escape backs out without spawning.
  if (bossMenuOpen) {
    if (e.code === 'ArrowUp') bossMenuIndex = (bossMenuIndex - 1 + BOSS_LIST.length) % BOSS_LIST.length;
    if (e.code === 'ArrowDown') bossMenuIndex = (bossMenuIndex + 1) % BOSS_LIST.length;
    if (e.code === 'ArrowRight') bossMenuSelected.add(bossMenuIndex);
    if (e.code === 'ArrowLeft') bossMenuSelected.delete(bossMenuIndex);
    if (e.code === 'Enter') spawnSelectedBosses();
    if (e.code === 'Escape') closeBossMenu();
    return;
  }
  if (e.code === 'Enter' && !won && lives > 0 && nearComputer()) { openBossMenu(); return; }
  if (e.code === 'KeyR') restart();
  // Level-select hotkeys: N = start of level N, Shift+N = that level's
  // boss checkpoint. 0 = the boss-testing arena (not a real level).
  if (e.code === 'Digit1') { if (e.shiftKey) teleportToBoss(0); else teleportToLevelStart(0); }
  if (e.code === 'Digit2') { if (e.shiftKey) teleportToBoss(1); else teleportToLevelStart(1); }
  if (e.code === 'Digit3') { if (e.shiftKey) teleportToBoss(2); else teleportToLevelStart(2); }
  if (e.code === 'Digit4') { if (e.shiftKey) teleportToBoss(3); else teleportToLevelStart(3); }
  if (e.code === 'Digit5') { if (e.shiftKey) teleportToBoss(4); else teleportToLevelStart(4); }
  if (e.code === 'Digit0') teleportToBoss(5);
  // secret cheat: Shift+G equips a fresh laser gun with 5 shots
  if (e.shiftKey && e.code === 'KeyG' && !won && lives > 0) {
    player.gunAmmo = 5;
    updateHud();
    showOverlayBrief('🔫 Ny laserpistol! 5 skudd!');
  }
  if (e.code === 'KeyI') {
    hintVisible = !hintVisible;
    document.getElementById('hint').style.display = hintVisible ? 'block' : 'none';
  }
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (['ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD'].includes(e.code)) {
    if (!keys['ArrowLeft'] && !keys['KeyA'] && !keys['ArrowRight'] && !keys['KeyD']) {
      player.sprinting = false;
    }
  }
});
