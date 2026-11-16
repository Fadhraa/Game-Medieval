"use strict";

class Particle extends Entity {
  constructor(x, y, vx, vy, life, color, size = 1) {
    super(x, y);
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
  }

  update(delta) {
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.vy += 115 * delta; // Gravity
    this.life -= delta;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
  }
}

class BurstEffect extends Entity {
  spriteKey = "fireball";

  constructor(x, y, life = 0.3) {
    super(x, y);
    this.life = life;
    this.maxLife = life;
  }

  update(delta) {
    this.life -= delta;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx, spriteSheet) {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return;
    const frame = Math.min(3, Math.floor(((this.maxLife - this.life) / this.maxLife) * 4));
    ctx.drawImage(
      spriteSheet,
      frame * 32,
      32, // Row 1 is explosion
      32,
      32,
      Math.round(this.x - 16),
      Math.round(this.y - 16),
      32,
      32
    );
  }
}

class ShieldBashImpact extends BurstEffect {
  spriteKey = "jamesShieldBash";

  constructor(x, y) {
    super(x, y, 0.6);
  }

  draw(ctx, spriteSheet) {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return;
    const width = 74;
    const height = 52;
    const frame = Math.min(22, Math.floor(23 * (1 - this.life / this.maxLife)));
    ctx.drawImage(
      spriteSheet,
      (frame % 5) * width,
      Math.floor(frame / 5) * height,
      width,
      height,
      Math.round(this.x - 33),
      Math.round(this.y - 34),
      width,
      height
    );
  }
}

class EnemyDefeatPoof extends BurstEffect {
  spriteKey = "enemyDefeatPoof";

  constructor(x, y, scale = 1) {
    super(x, y, 1.1);
    this.scale = scale;
  }

  draw(ctx, spriteSheet) {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return;
    const width = 56;
    const height = 46;
    const frame = Math.min(21, Math.floor(22 * (1 - this.life / this.maxLife)));
    const drawW = Math.round(width * this.scale);
    const drawH = Math.round(height * this.scale);
    ctx.drawImage(
      spriteSheet,
      (frame % 6) * width,
      Math.floor(frame / 6) * height,
      width,
      height,
      Math.round(this.x - 28 * this.scale),
      Math.round(this.y - 40 * this.scale),
      drawW,
      drawH
    );
  }
}

class HeroDefeatSoul extends BurstEffect {
  spriteKey = "heroDefeatSoul";

  constructor(x, y) {
    super(x, y, 1.6);
  }

  draw(ctx, spriteSheet) {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return;
    const width = 48;
    const height = 70;
    const frame = Math.min(27, Math.floor(28 * (1 - this.life / this.maxLife)));
    ctx.drawImage(
      spriteSheet,
      (frame % 7) * width,
      Math.floor(frame / 7) * height,
      width,
      height,
      Math.round(this.x - 24),
      Math.round(this.y - 63),
      width,
      height
    );
  }
}

window.Particle = Particle;
window.BurstEffect = BurstEffect;
window.EnemyDefeatPoof = EnemyDefeatPoof;
window.HeroDefeatSoul = HeroDefeatSoul;

