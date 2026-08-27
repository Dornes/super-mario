// Canvas/HUD element refs, tunable physics constants, and raw keyboard
// input handling (movement keys, jump, shoot, sprint double-tap,
// cheats, level-select hotkeys, hint toggle).
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const livesEl = document.getElementById('lives');
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');

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
  if (!keys[e.code] && jumpKeys.includes(e.code)) jumpPressed = true;
  if (!keys[e.code] && e.code === 'KeyW') shootPressed = true;
  if (!keys[e.code] && (e.code === 'ArrowLeft' || e.code === 'KeyA')) {
    const now = Date.now();
    if (now - lastTap.left < DOUBLE_TAP_MS) player.sprinting = true;
    lastTap.left = now;
  }
  if (!keys[e.code] && (e.code === 'ArrowRight' || e.code === 'KeyD')) {
    const now = Date.now();
    if (now - lastTap.right < DOUBLE_TAP_MS) player.sprinting = true;
    lastTap.right = now;
  }
  keys[e.code] = true;
  if (e.code === 'KeyR') restart();
  if (e.code === 'Digit1') teleportToLevelStart(0);
  if (e.code === 'Digit2') teleportToBoss(0);
  if (e.code === 'Digit3') teleportToLevelStart(1);
  if (e.code === 'Digit4') teleportToBoss(1);
  if (e.code === 'Digit5') teleportToLevelStart(2);
  if (e.code === 'Digit6') teleportToBoss(2);
  if (e.code === 'Digit7') teleportToLevelStart(3);
  if (e.code === 'Digit8') teleportToBoss(3);
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
