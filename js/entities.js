// All game entity classes: Player, regular enemies, Hammer Bros and
// their hammers, fireballs, powerups/laser shots, and the three
// bosses (Bowser, King Boo, Kamek) with their projectiles/minions.
class Player {
  constructor() {
    this.gunAmmo = 0;
    this.reset();
  }
  reset() {
    this.x = spawnPoint.x;
    this.y = spawnPoint.y;
    this.w = 28;
    this.h = 36;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.dead = false;
    this.invuln = 0;
    this.jumpsUsed = 0;
    this.sprinting = false;
    // gunAmmo is intentionally left untouched here: dying and respawning
    // (the only caller of reset() outside of a fresh game) should not take
    // away shots the player already earned.
  }
  update() {
    if (this.dead) return;
    const speed = this.sprinting ? 6.6 : 4.2;
    const accel = this.sprinting ? 0.9 : 0.6;
    if (keys['ArrowLeft'] || keys['KeyA']) {
      this.vx -= accel;
      this.facing = -1;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
      this.vx += accel;
      this.facing = 1;
    }
    this.vx *= FRICTION;
    if (this.vx > speed) this.vx = speed;
    if (this.vx < -speed) this.vx = -speed;
    if (Math.abs(this.vx) < 0.05) this.vx = 0;

    if (jumpPressed && this.jumpsUsed < 2) {
      this.vy = this.jumpsUsed === 0 ? -13 : -11;
      this.onGround = false;
      this.jumpsUsed++;
    }
    jumpPressed = false;

    if (shootPressed && this.gunAmmo > 0) {
      this.gunAmmo--;
      updateHud();
      const shotX = this.facing > 0 ? this.x + this.w : this.x - 16;
      playerShots.push(new LaserShot(shotX, this.y + this.h * 0.55, this.facing));
    }
    shootPressed = false;

    this.vy += GRAVITY;
    if (this.vy > 15) this.vy = 15;

    // Horizontal move + collision
    this.x += this.vx;
    if (this.x < 0) this.x = 0;
    for (const t of solidTiles) {
      if (rectsOverlap(this, t)) {
        if (this.vx > 0) this.x = t.x - this.w;
        else if (this.vx < 0) this.x = t.x + t.w;
        this.vx = 0;
      }
    }

    // Vertical move + collision
    this.y += this.vy;
    this.onGround = false;
    for (const t of solidTiles) {
      if (rectsOverlap(this, t)) {
        if (this.vy > 0) {
          this.y = t.y - this.h;
          this.onGround = true;
          this.jumpsUsed = 0;
        } else if (this.vy < 0) {
          this.y = t.y + t.h;
          if (t.itemBlock && !t.used) {
            t.used = true;
            powerups.push(new PowerupItem(t.x, t.y));
          }
        }
        this.vy = 0;
      }
    }

    if (this.invuln > 0) this.invuln--;

    if (this.y > canvas.height + 200) {
      this.die();
    }
  }
  die() {
    if (this.dead) return;
    this.dead = true;
    spawnCrumble(this, crumbleColors(this));
    lives--;
    updateHud();
    if (lives <= 0) {
      showOverlay('GAME OVER - trykk R for å starte på nytt');
    } else {
      setTimeout(() => { this.reset(); updateHud(); }, 700);
      showOverlayBrief('Du døde! ' + lives + ' liv igjen');
    }
  }
  draw() {
    if (this.dead) return;
    if (this.invuln > 0 && Math.floor(this.invuln / 4) % 2 === 0) return;
    const sx = this.x - camX;
    // body
    ctx.fillStyle = '#e52521';
    ctx.fillRect(sx, this.y, this.w, this.h * 0.4);
    ctx.fillStyle = '#0033cc';
    ctx.fillRect(sx, this.y + this.h * 0.4, this.w, this.h * 0.6);
    // face
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(sx + (this.facing > 0 ? 10 : 0), this.y + 6, 18, 12);
    // laser gun held in hands while ammo remains
    if (this.gunAmmo > 0) {
      const gunY = this.y + this.h * 0.55;
      ctx.fillStyle = '#555';
      if (this.facing > 0) {
        ctx.fillRect(sx + this.w - 6, gunY, 18, 6);
      } else {
        ctx.fillRect(sx - 12, gunY, 18, 6);
      }
      ctx.fillStyle = '#ff3366';
      ctx.fillRect(sx + (this.facing > 0 ? this.w + 8 : -12), gunY + 1, 4, 4);
    }
  }
}

class Enemy {
  constructor(x, y, range) {
    this.startX = x;
    this.x = x;
    this.y = y;
    this.w = 30;
    this.h = 28;
    this.vx = 1.2;
    this.vy = 0;
    this.range = range;
    this.alive = true;
  }
  update() {
    if (!this.alive) return;
    this.vy += GRAVITY;
    if (this.vy > 15) this.vy = 15;
    this.x += this.vx;
    this.y += this.vy;
    this.onGround = false;
    for (const t of solidTiles) {
      if (rectsOverlap(this, t)) {
        if (this.vy > 0) { this.y = t.y - this.h; this.onGround = true; this.vy = 0; }
        else if (this.vy < 0) { this.y = t.y + t.h; this.vy = 0; }
      }
    }
    if (this.x < this.startX - this.range || this.x > this.startX + this.range) {
      this.vx *= -1;
    }
  }
  draw() {
    if (!this.alive) return;
    const sx = this.x - camX;
    if (sx < -50 || sx > canvas.width + 50) return;
    drawGoombaBody(sx, this.y, this.w, this.h);
  }
}

// Shared sprite pieces so the flying variants can reuse the exact same
// body art as their ground-based counterparts and just add wings.
function drawGoombaBody(sx, y, w, h) {
  ctx.fillStyle = '#7b4a12';
  ctx.fillRect(sx, y, w, h);
  ctx.fillStyle = 'white';
  ctx.fillRect(sx + 4, y + 6, 6, 6);
  ctx.fillRect(sx + w - 10, y + 6, 6, 6);
  ctx.fillStyle = 'black';
  ctx.fillRect(sx + 6, y + 8, 3, 3);
  ctx.fillRect(sx + w - 8, y + 8, 3, 3);
}

function drawHammerBroBody(sx, y, w, h) {
  ctx.fillStyle = '#2e8b2e';
  ctx.fillRect(sx, y + 10, w, h - 10);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(sx + 3, y, w - 6, 13);
  ctx.fillStyle = 'white';
  ctx.fillRect(sx + 5, y + 15, 6, 6);
  ctx.fillRect(sx + w - 11, y + 15, 6, 6);
  ctx.fillStyle = 'black';
  ctx.fillRect(sx + 7, y + 17, 3, 3);
  ctx.fillRect(sx + w - 9, y + 17, 3, 3);
}

// Draws a simple pair of flapping wings beside a body, driven by
// wingPhase (radians, incremented every frame by the caller).
function drawFlapWings(sx, y, w, h, wingPhase, fillColor, strokeColor) {
  const flap = Math.sin(wingPhase);
  const lift = flap * 6;
  const midY = y + h * 0.4;
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.beginPath();
  ctx.moveTo(sx + 2, midY);
  ctx.lineTo(sx - 12, midY - 6 - lift);
  ctx.lineTo(sx + 2, midY + 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx + w - 2, midY);
  ctx.lineTo(sx + w + 12, midY - 6 - lift);
  ctx.lineTo(sx + w - 2, midY + 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Flying goomba: hovers and bobs gently instead of falling, patrolling
// back and forth over its range just like the regular Enemy.
class FlyingEnemy extends Enemy {
  constructor(x, y, range) {
    super(x, y, range);
    this.baseY = y;
    this.vx = 1.4;
    this.flying = true;
    this.wingPhase = Math.random() * Math.PI * 2;
  }
  update() {
    if (!this.alive) return;
    this.x += this.vx;
    this.wingPhase += 0.3;
    this.y = this.baseY + Math.sin(this.wingPhase * 0.5) * 10;
    if (this.x < this.startX - this.range || this.x > this.startX + this.range) {
      this.vx *= -1;
    }
  }
  draw() {
    if (!this.alive) return;
    const sx = this.x - camX;
    if (sx < -50 || sx > canvas.width + 50) return;
    drawFlapWings(sx, this.y, this.w, this.h, this.wingPhase, '#eaeaea', '#999');
    drawGoombaBody(sx, this.y, this.w, this.h);
  }
}

class Hammer {
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.vx = dir * 3.6;
    this.vy = -9;
    this.rot = 0;
    this.dead = false;
  }
  update() {
    this.vy += GRAVITY * 0.45;
    this.x += this.vx;
    this.y += this.vy;
    this.rot += 0.35;
    for (const t of solidTiles) {
      if (rectsOverlap(this, t)) {
        this.dead = true;
      }
    }
    if (this.y > canvas.height + 100 || this.x < camX - 300 || this.x > camX + canvas.width + 300) {
      this.dead = true;
    }
  }
  draw() {
    const sx = this.x - camX;
    if (sx < -50 || sx > canvas.width + 50) return;
    ctx.save();
    ctx.translate(sx + this.w / 2, this.y + this.h / 2);
    ctx.rotate(this.rot);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(-2, -9, 4, 18);
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(-9, -6, 18, 8);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(-9, -6, 18, 8);
    ctx.restore();
  }
}

class HammerBro extends Enemy {
  constructor(x, y, range) {
    super(x, y, range);
    this.w = 32;
    this.h = 34;
    this.vx = 0.5;
    this.throwEvery = 90; // 1.5s at 60fps, same for every level
    // stagger the first throw so several hammer bros don't fire in sync
    this.throwTimer = Math.floor(Math.random() * this.throwEvery);
  }
  update() {
    if (!this.alive) return;
    super.update();
    this.throwTimer++;
    if (this.throwTimer >= this.throwEvery) {
      this.throwTimer = 0;
      const dir = player.x < this.x ? -1 : 1;
      hammers.push(new Hammer(this.x + this.w / 2 - 8, this.y - 4, dir));
    }
  }
  draw() {
    if (!this.alive) return;
    const sx = this.x - camX;
    if (sx < -50 || sx > canvas.width + 50) return;
    drawHammerBroBody(sx, this.y, this.w, this.h);
  }
}

// Flying Hammer Bro: same throwing behavior as HammerBro, but hovers and
// bobs like FlyingEnemy instead of falling/standing on the ground.
class FlyingHammerBro extends HammerBro {
  constructor(x, y, range) {
    super(x, y, range);
    this.baseY = y;
    this.vx = 1.0;
    this.flying = true;
    this.wingPhase = Math.random() * Math.PI * 2;
  }
  update() {
    if (!this.alive) return;
    this.x += this.vx;
    this.wingPhase += 0.26;
    this.y = this.baseY + Math.sin(this.wingPhase * 0.5) * 10;
    if (this.x < this.startX - this.range || this.x > this.startX + this.range) {
      this.vx *= -1;
    }
    this.throwTimer++;
    if (this.throwTimer >= this.throwEvery) {
      this.throwTimer = 0;
      const dir = player.x < this.x ? -1 : 1;
      hammers.push(new Hammer(this.x + this.w / 2 - 8, this.y - 4, dir));
    }
  }
  draw() {
    if (!this.alive) return;
    const sx = this.x - camX;
    if (sx < -50 || sx > canvas.width + 50) return;
    drawFlapWings(sx, this.y, this.w, this.h, this.wingPhase, '#cfe8cf', '#8ab08a');
    drawHammerBroBody(sx, this.y, this.w, this.h);
  }
}

class Fireball {
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;
    this.w = 14;
    this.h = 14;
    this.vx = dir * 7;
    this.vy = -6;
    this.dead = false;
  }
  update() {
    this.vy += GRAVITY * 0.5;
    this.x += this.vx;
    this.y += this.vy;
    for (const t of solidTiles) {
      if (rectsOverlap(this, t)) {
        this.vy = -8;
      }
    }
    if (this.y > canvas.height + 100 || this.x < camX - 200 || this.x > camX + canvas.width + 200) {
      this.dead = true;
    }
  }
  draw() {
    const sx = this.x - camX;
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(sx + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cc3300';
    ctx.stroke();
  }
}

class PowerupItem {
  constructor(x, y) {
    this.x = x + TILE / 2 - 10;
    this.y = y - 24;
    this.w = 20;
    this.h = 20;
    this.taken = false;
    this.bob = Math.random() * Math.PI * 2;
  }
  update() {
    this.bob += 0.12;
  }
  draw() {
    if (this.taken) return;
    const sx = this.x - camX;
    if (sx < -50 || sx > canvas.width + 50) return;
    const bobY = this.y + Math.sin(this.bob) * 3;
    ctx.fillStyle = '#444';
    ctx.fillRect(sx, bobY + 6, this.w, 8);
    ctx.fillStyle = '#666';
    ctx.fillRect(sx + this.w - 6, bobY, 10, 8);
    ctx.fillStyle = '#ff3366';
    ctx.fillRect(sx + this.w + 2, bobY + 1, 4, 4);
    ctx.fillStyle = '#222';
    ctx.fillRect(sx + 2, bobY + 12, 6, 8);
  }
}

class LaserShot {
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 5;
    this.vx = dir * 11;
    this.dir = dir;
    this.dead = false;
  }
  update() {
    this.x += this.vx;
    for (const t of solidTiles) {
      if (rectsOverlap(this, t)) {
        this.dead = true;
      }
    }
    if (this.x < camX - 200 || this.x > camX + canvas.width + 200) {
      this.dead = true;
    }
  }
  draw() {
    const sx = this.x - camX;
    ctx.fillStyle = '#ff3366';
    ctx.fillRect(sx, this.y, this.w, this.h);
    ctx.fillStyle = '#ffccdd';
    ctx.fillRect(sx + (this.dir > 0 ? this.w - 4 : 0), this.y - 1, 4, this.h + 2);
  }
}

class Bowser {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 70;
    this.h = 80;
    this.vx = 0.8;
    this.vy = 0;
    this.homeX = x;
    this.homeY = y;
    this.range = 90;
    this.hp = 3;
    this.maxHp = 3;
    this.alive = true;
    this.invuln = 0;
    this.fireTimer = 60;
    this.facing = -1;
    this.breathCooldown = 60;
    this.breathWarmup = 0;
    this.breathing = 0;
    this.breathAnim = 0;
    this.breathHitbox = null;
  }
  update() {
    if (!this.alive) return;
    this.vy += GRAVITY;
    if (this.vy > 15) this.vy = 15;
    this.x += this.vx;
    this.y += this.vy;
    for (const t of solidTiles) {
      if (rectsOverlap(this, t)) {
        if (this.vy > 0) { this.y = t.y - this.h; this.vy = 0; }
        else if (this.vy < 0) { this.y = t.y + t.h; this.vy = 0; }
      }
    }
    const locked = this.breathWarmup > 0 || this.breathing > 0;
    if (!locked && (this.x < this.homeX - this.range || this.x > this.homeX + this.range)) {
      this.vx *= -1;
    }
    if (!locked) this.facing = this.vx < 0 ? -1 : 1;
    if (this.invuln > 0) this.invuln--;

    this.fireTimer--;
    if (this.fireTimer <= 0 && !locked) {
      this.fireTimer = 65;
      fireballs.push(new Fireball(this.x + this.w / 2, this.y + this.h / 2, this.facing));
    }

    // Short-range flame breath when Mario is close
    const dx = player.x - this.x;
    const dy = Math.abs(player.y - this.y);
    const closeRange = Math.abs(dx) < 160 && dy < 90;

    if (this.breathWarmup > 0) {
      // Telegraph: Bowser stops, faces Mario, and winds up before breathing fire
      this.breathWarmup--;
      this.breathAnim++;
      if (this.breathWarmup <= 0) {
        this.breathing = 50;
        this.breathAnim = 0;
      }
    } else if (this.breathing > 0) {
      this.breathing--;
      this.breathAnim++;
      const dir = this.facing;
      const bx = dir > 0 ? this.x + this.w : this.x - 140;
      this.breathHitbox = { x: bx, y: this.y + this.h * 0.22, w: 140, h: this.h * 0.56 };
      if (this.breathing <= 0) {
        this.breathHitbox = null;
        this.breathCooldown = 100;
      }
    } else {
      this.breathCooldown--;
      if (this.breathCooldown <= 0 && closeRange) {
        this.facing = dx < 0 ? -1 : 1;
        this.breathWarmup = 24;
        this.breathAnim = 0;
        this.vx = 0;
      }
    }
  }
  draw() {
    if (!this.alive) return;
    const sx = this.x - camX;
    if (sx < -100 || sx > canvas.width + 100) return;
    if (this.invuln > 0 && Math.floor(this.invuln / 4) % 2 === 0) return;
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(sx, this.y + this.h * 0.3, this.w, this.h * 0.7);
    ctx.fillStyle = '#ffcf40';
    ctx.fillRect(sx + 6, this.y, this.w - 12, this.h * 0.4);
    // spikes
    ctx.fillStyle = '#c0392b';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + 8 + i * 15, this.y + this.h * 0.3);
      ctx.lineTo(sx + 15 + i * 15, this.y + this.h * 0.3 - 12);
      ctx.lineTo(sx + 22 + i * 15, this.y + this.h * 0.3);
      ctx.fill();
    }
    // eyes
    ctx.fillStyle = 'white';
    ctx.fillRect(sx + 14, this.y + 10, 10, 10);
    ctx.fillRect(sx + this.w - 24, this.y + 10, 10, 10);
    ctx.fillStyle = 'red';
    ctx.fillRect(sx + 17, this.y + 13, 4, 4);
    ctx.fillRect(sx + this.w - 21, this.y + 13, 4, 4);

    // Wind-up telegraph: glowing mouth before he breathes fire
    if (this.breathWarmup > 0) {
      const mouthX = sx + (this.facing > 0 ? this.w - 6 : 6);
      const mouthY = this.y + this.h * 0.5;
      const pulse = 6 + Math.sin(this.breathAnim * 0.6) * 3 + (24 - this.breathWarmup) * 0.3;
      const glow = ctx.createRadialGradient(mouthX, mouthY, 0, mouthX, mouthY, pulse * 2.2);
      glow.addColorStop(0, 'rgba(255,255,180,0.95)');
      glow.addColorStop(0.5, 'rgba(255,140,30,0.7)');
      glow.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mouthX, mouthY, pulse * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Animated flame breath
    if (this.breathHitbox) {
      const hb = this.breathHitbox;
      const hbx = hb.x - camX;
      const dir = this.facing;
      const tipX = dir > 0 ? hbx + hb.w : hbx;
      const rootX = dir > 0 ? hbx : hbx + hb.w;
      const midY = hb.y + hb.h / 2;
      const t = this.breathAnim;

      // Outer flickering glow cone
      const grad = ctx.createLinearGradient(rootX, 0, tipX, 0);
      grad.addColorStop(0, 'rgba(255,230,120,0.95)');
      grad.addColorStop(0.4, 'rgba(255,140,20,0.85)');
      grad.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(rootX, hb.y);
      const segments = 6;
      for (let i = 0; i <= segments; i++) {
        const p = i / segments;
        const px = rootX + (tipX - rootX) * p;
        const wobble = Math.sin(t * 0.9 + i * 1.3) * (hb.h * 0.18) * (1 - p * 0.6);
        ctx.lineTo(px, midY - (hb.h / 2) * (1 - p * 0.5) + wobble);
      }
      for (let i = segments; i >= 0; i--) {
        const p = i / segments;
        const px = rootX + (tipX - rootX) * p;
        const wobble = Math.sin(t * 0.9 + i * 1.3 + 2) * (hb.h * 0.18) * (1 - p * 0.6);
        ctx.lineTo(px, midY + (hb.h / 2) * (1 - p * 0.5) + wobble);
      }
      ctx.closePath();
      ctx.fill();

      // Inner hotter core
      ctx.fillStyle = 'rgba(255,255,210,0.85)';
      ctx.beginPath();
      ctx.moveTo(rootX, midY - hb.h * 0.12);
      for (let i = 0; i <= segments; i++) {
        const p = i / segments;
        const px = rootX + (tipX - rootX) * p * 0.7;
        const wobble = Math.sin(t * 1.4 + i * 1.7) * (hb.h * 0.08);
        ctx.lineTo(px, midY - (hb.h * 0.12) * (1 - p) + wobble);
      }
      for (let i = segments; i >= 0; i--) {
        const p = i / segments;
        const px = rootX + (tipX - rootX) * p * 0.7;
        const wobble = Math.sin(t * 1.4 + i * 1.7 + 2) * (hb.h * 0.08);
        ctx.lineTo(px, midY + (hb.h * 0.12) * (1 - p) + wobble);
      }
      ctx.closePath();
      ctx.fill();

      // Drifting embers
      for (let i = 0; i < 5; i++) {
        const p = (i / 5 + (t * 0.02)) % 1;
        const ex = rootX + (tipX - rootX) * p;
        const ey = midY + Math.sin(t * 0.5 + i * 2) * (hb.h * 0.3);
        const size = 3 + Math.sin(t * 0.7 + i) * 1.5;
        ctx.fillStyle = 'rgba(255,' + (180 + Math.floor(Math.sin(t + i) * 40)) + ',60,' + (0.8 - p * 0.6) + ')';
        ctx.beginPath();
        ctx.arc(ex, ey, Math.max(1, size), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // HP bar
    ctx.fillStyle = 'black';
    ctx.fillRect(sx, this.y - 14, this.w, 8);
    ctx.fillStyle = 'lime';
    ctx.fillRect(sx, this.y - 14, this.w * (this.hp / this.maxHp), 8);
  }
}

class Boo {
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    const dx = targetX - x, dy = targetY - y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    this.vx = (dx / dist) * 4;
    this.vy = (dy / dist) * 4;
    this.dead = false;
    this.life = 200;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    if (this.life <= 0) this.dead = true;
    if (this.x < camX - 200 || this.x > camX + canvas.width + 200) this.dead = true;
  }
  draw() {
    const sx = this.x - camX;
    ctx.fillStyle = 'rgba(220,200,255,0.9)';
    ctx.beginPath();
    ctx.arc(sx + this.w / 2, this.y + this.h / 2, this.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8855cc';
    ctx.stroke();
  }
}

class KingBoo {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.w = 60;
    this.h = 60;
    this.hp = 4;
    this.maxHp = 4;
    this.alive = true;
    this.invuln = 0;
    this.t = 0;
    this.visible = true;
    this.visTimer = 180;
    this.fireTimer = 100;
    this.facing = -1;
  }
  update() {
    if (!this.alive) return;
    this.t += 0.04;
    // floats in a lazy figure pattern, no gravity
    this.x = this.homeX + Math.sin(this.t) * 110;
    this.y = this.homeY + Math.sin(this.t * 1.7) * 40;
    this.facing = Math.cos(this.t) < 0 ? -1 : 1;
    if (this.invuln > 0) this.invuln--;

    this.visTimer--;
    if (this.visTimer <= 0) {
      this.visible = !this.visible;
      this.visTimer = this.visible ? 180 : 90;
    }

    this.fireTimer--;
    if (this.fireTimer <= 0 && this.visible) {
      this.fireTimer = 140;
      fireballs.push(new Boo(this.x + this.w / 2, this.y + this.h / 2, player.x + player.w / 2, player.y + player.h / 2));
    }
  }
  draw() {
    if (!this.alive) return;
    const sx = this.x - camX;
    if (sx < -100 || sx > canvas.width + 100) return;
    if (this.invuln > 0 && Math.floor(this.invuln / 4) % 2 === 0) return;
    ctx.globalAlpha = this.visible ? 1 : 0.25;
    // ghost body
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(sx + this.w / 2, this.y + this.h * 0.45, this.w / 2, Math.PI, 0);
    ctx.lineTo(sx + this.w, this.y + this.h);
    for (let i = 0; i < 4; i++) {
      const bx = sx + this.w - (i * (this.w / 4));
      ctx.lineTo(bx - this.w / 8, this.y + this.h * 0.75);
      ctx.lineTo(bx - this.w / 4, this.y + this.h);
    }
    ctx.lineTo(sx, this.y + this.h * 0.45);
    ctx.fill();
    // crown
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(sx + this.w * 0.25, this.y - 12, this.w * 0.5, 10);
    ctx.beginPath();
    ctx.moveTo(sx + this.w * 0.25, this.y - 12);
    ctx.lineTo(sx + this.w * 0.35, this.y - 22);
    ctx.lineTo(sx + this.w * 0.45, this.y - 12);
    ctx.lineTo(sx + this.w * 0.55, this.y - 22);
    ctx.lineTo(sx + this.w * 0.65, this.y - 12);
    ctx.lineTo(sx + this.w * 0.75, this.y - 22);
    ctx.fill();
    // eyes/eyebrows (mischievous)
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(sx + this.w * 0.35, this.y + this.h * 0.4, 6, 0, Math.PI * 2);
    ctx.arc(sx + this.w * 0.65, this.y + this.h * 0.4, 6, 0, Math.PI * 2);
    ctx.fill();
    // mouth
    ctx.fillStyle = '#7733aa';
    ctx.beginPath();
    ctx.ellipse(sx + this.w / 2, this.y + this.h * 0.62, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // HP bar
    ctx.fillStyle = 'black';
    ctx.fillRect(sx, this.y - 34, this.w, 8);
    ctx.fillStyle = '#a866ff';
    ctx.fillRect(sx, this.y - 34, this.w * (this.hp / this.maxHp), 8);
  }
}

class MagicBolt {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.w = 14;
    this.h = 14;
    this.vx = vx;
    this.vy = vy;
    this.dead = false;
    this.life = 160;
    this.spin = 0;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.spin += 0.3;
    this.life--;
    if (this.life <= 0) this.dead = true;
    if (this.x < camX - 200 || this.x > camX + canvas.width + 200 || this.y > canvas.height + 200) {
      this.dead = true;
    }
  }
  draw() {
    const sx = this.x - camX;
    const cx = sx + this.w / 2, cy = this.y + this.h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.spin);
    ctx.fillStyle = '#b266ff';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = -Math.PI / 2 + i * (2 * Math.PI / 5);
      const innerAngle = outerAngle + Math.PI / 5;
      const r = this.w / 2;
      const ox = Math.cos(outerAngle) * r, oy = Math.sin(outerAngle) * r;
      const ix = Math.cos(innerAngle) * r * 0.45, iy = Math.sin(innerAngle) * r * 0.45;
      if (i === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#5b1e9e';
    ctx.stroke();
    ctx.restore();
  }
}

// Kamek: Bowser's magikoopa advisor. Shoots a homing 3-way spread of magic
// bolts, and — unlike Bowser's melee breath or King Boo's invisibility —
// his unique mechanic is teleport evasion: he telegraphs (spins/flickers),
// vanishes in a poof, and reappears at a new spot, dodging stomp attempts
// and generally moving unpredictably around his platform.
class Kamek {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.w = 46;
    this.h = 52;
    this.rangeX = 170;
    this.rangeY = 80;
    this.hp = 4;
    this.maxHp = 4;
    this.alive = true;
    this.invuln = 30;
    this.t = 0;
    this.facing = -1;
    this.fireTimer = 110;
    this.visible = true;
    this.state = 'idle'; // idle -> warn -> hidden -> idle
    this.teleportTimer = 150; // autonomous teleport countdown while idle
    this.warnTimer = 0;
    this.hiddenTimer = 0;
    this.vanishX = x; this.vanishY = y;
    this.pendingX = x; this.pendingY = y;
  }
  update() {
    if (!this.alive) return;
    this.t += 0.05;
    if (this.invuln > 0) this.invuln--;

    const dxp = player.x - this.x;
    const dyp = player.y - this.y;
    const stompThreat = this.visible && this.invuln === 0 && player.vy > 0 &&
      Math.abs(dxp) < 65 && dyp > -70 && dyp < 30;

    if (this.state === 'idle') {
      this.y = this.homeY + Math.sin(this.t * 1.3) * 18;
      this.facing = dxp < 0 ? -1 : 1;
      this.teleportTimer--;

      this.fireTimer--;
      if (this.fireTimer <= 0) {
        this.fireTimer = 105;
        this.shootSpread();
      }

      if (stompThreat || this.teleportTimer <= 0) {
        this.state = 'warn';
        this.warnTimer = 16;
      }
    } else if (this.state === 'warn') {
      this.warnTimer--;
      this.facing = dxp < 0 ? -1 : 1;
      if (this.warnTimer <= 0) {
        this.state = 'hidden';
        this.hiddenTimer = 26;
        this.visible = false;
        this.vanishX = this.x;
        this.vanishY = this.y;
        this.pendingX = this.homeX + (Math.random() * 2 - 1) * this.rangeX;
        this.pendingY = this.homeY + (Math.random() * 2 - 1) * this.rangeY;
      }
    } else if (this.state === 'hidden') {
      this.hiddenTimer--;
      if (this.hiddenTimer === 13) {
        this.x = this.pendingX;
        this.y = this.pendingY;
      }
      if (this.hiddenTimer <= 0) {
        this.visible = true;
        this.state = 'idle';
        this.teleportTimer = 170;
        this.invuln = 30; // brief grace period so it isn't a free hit right on arrival
      }
    }
  }
  shootSpread() {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const tx = player.x + player.w / 2, ty = player.y + player.h / 2;
    const baseAngle = Math.atan2(ty - cy, tx - cx);
    const speed = 5.2;
    for (const off of [-0.3, 0, 0.3]) {
      const a = baseAngle + off;
      fireballs.push(new MagicBolt(cx, cy, Math.cos(a) * speed, Math.sin(a) * speed));
    }
  }
  draw() {
    if (!this.alive) return;
    const sx = this.x - camX;
    if (sx < -100 || sx > canvas.width + 100) return;

    if (!this.visible) {
      // poof particles at the vanish point (fading out) and appear point (fading in)
      const vsx = this.vanishX - camX, psx = this.pendingX - camX;
      const fadeOut = Math.max(0, this.hiddenTimer - 13) / 13;
      const fadeIn = Math.max(0, 13 - this.hiddenTimer) / 13;
      if (fadeOut > 0) this.drawPoof(vsx, this.vanishY, fadeOut);
      if (fadeIn > 0) this.drawPoof(psx, this.pendingY, fadeIn);
      return;
    }

    if (this.invuln > 0 && this.state !== 'warn' && Math.floor(this.invuln / 4) % 2 === 0) {
      return;
    }

    const warnFlicker = this.state === 'warn' && Math.floor(this.warnTimer / 3) % 2 === 0;
    if (warnFlicker) {
      ctx.save();
      ctx.globalAlpha = 0.5;
    }

    // robe
    ctx.fillStyle = '#2a6bd6';
    ctx.beginPath();
    ctx.moveTo(sx + this.w * 0.15, this.y + this.h);
    ctx.lineTo(sx + this.w * 0.1, this.y + this.h * 0.4);
    ctx.quadraticCurveTo(sx + this.w / 2, this.y - this.h * 0.05, sx + this.w * 0.9, this.y + this.h * 0.4);
    ctx.lineTo(sx + this.w * 0.85, this.y + this.h);
    ctx.fill();
    // belly (koopa shell peek)
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.ellipse(sx + this.w / 2, this.y + this.h * 0.75, this.w * 0.22, this.h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // glasses
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx + this.w * 0.35, this.y + this.h * 0.3, 8, 0, Math.PI * 2);
    ctx.arc(sx + this.w * 0.65, this.y + this.h * 0.3, 8, 0, Math.PI * 2);
    ctx.moveTo(sx + this.w * 0.43, this.y + this.h * 0.3);
    ctx.lineTo(sx + this.w * 0.57, this.y + this.h * 0.3);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(sx + this.w * 0.35, this.y + this.h * 0.3, 6, 0, Math.PI * 2);
    ctx.arc(sx + this.w * 0.65, this.y + this.h * 0.3, 6, 0, Math.PI * 2);
    ctx.fill();
    // hat
    ctx.fillStyle = '#2a6bd6';
    ctx.beginPath();
    ctx.moveTo(sx + this.w * 0.2, this.y + this.h * 0.05);
    ctx.lineTo(sx + this.w * 0.5, this.y - this.h * 0.35);
    ctx.lineTo(sx + this.w * 0.8, this.y + this.h * 0.05);
    ctx.fill();
    // wand
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = 4;
    const wandX = sx + (this.facing > 0 ? this.w + 4 : -4);
    ctx.beginPath();
    ctx.moveTo(sx + this.w * (this.facing > 0 ? 0.9 : 0.1), this.y + this.h * 0.5);
    ctx.lineTo(wandX, this.y + this.h * 0.3);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ffe135';
    ctx.beginPath();
    ctx.arc(wandX, this.y + this.h * 0.3, 4, 0, Math.PI * 2);
    ctx.fill();

    if (warnFlicker) {
      ctx.restore();
    }

    // HP bar
    ctx.fillStyle = 'black';
    ctx.fillRect(sx, this.y - 14, this.w, 8);
    ctx.fillStyle = '#b266ff';
    ctx.fillRect(sx, this.y - 14, this.w * (this.hp / this.maxHp), 8);
  }
  drawPoof(sx, y, alpha) {
    ctx.fillStyle = 'rgba(178,102,255,' + (alpha * 0.8) + ')';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 18 * (1 - alpha) + 6;
      ctx.beginPath();
      ctx.arc(sx + this.w / 2 + Math.cos(a) * r, y + this.h / 2 + Math.sin(a) * r, 5 * alpha + 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

