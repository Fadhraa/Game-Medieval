"use strict";

class LightningBolt extends Projectile {
  constructor(x, y, damage = Progress.stats("kira").damage) {
    super(x, y, 220, damage, 1, 3);
    this.frameWidth = 443.5;
    this.frameHeight = 443.5;
  }

  update(delta, battle) {
    const beforeX = this.x;
    this.x = Math.min(Constants.BASES.enemy.x, beforeX + this.speed * delta);
    this.life -= delta;

    const collided = battle.units
      .filter(
        (unit) =>
          unit.side === -1 &&
          unit.hp > 0 &&
          !unit.isUntargetable &&
          unit.x >= beforeX - 14 &&
          unit.x <= this.x + 7
      )
      .sort((a, b) => a.x - b.x)[0];

    if (collided || this.x >= Constants.BASES.enemy.x) {
      this.explode(battle, collided);
      this.life = 0;
      this.active = false;
    }

    if (this.life <= 0) {
      this.active = false;
    }
  }

  explode(battle, target) {
    const x = target?.x ?? Constants.BASES.enemy.x;

    if (target) {
      target.takeDamage(this.damage, battle, { type: "magic" });
    } else {
      battle.damageBase(this.side, this.damage);
    }

    // Spawn electric lightning burst (single target, no splash)
    battle.spawnLightningBurst(x, this.y);
    battle.spawnImpact(x, false);
    window.audioManager?.playHit("lightning");
  }

  draw(ctx, time, spriteSheet) {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return;
    const frame = Math.floor(time * 16) % 4;
    const scale = 0.11;
    const drawW = Math.round(this.frameWidth * scale);
    const drawH = Math.round(this.frameHeight * scale);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      spriteSheet,
      Math.floor(frame * this.frameWidth),
      0, // Row 0: flying bolt
      Math.floor(this.frameWidth),
      Math.floor(this.frameHeight),
      Math.round(this.x - drawW / 2),
      Math.round(this.y - drawH / 2),
      drawW,
      drawH
    );
    ctx.restore();
  }
}

class LightningBurst extends Entity {
  constructor(x, y, life = 0.32) {
    super(x, y);
    this.life = life;
    this.maxLife = life;
    this.frameWidth = 443.5;
    this.frameHeight = 443.5;
  }

  update(delta) {
    this.life -= delta;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx, spriteSheet) {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return;
    const progress = Math.max(0, Math.min(1, (this.maxLife - this.life) / this.maxLife));
    const frame = Math.min(3, Math.floor(progress * 4));
    const scale = 0.15;
    const drawW = Math.round(this.frameWidth * scale);
    const drawH = Math.round(this.frameHeight * scale);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      spriteSheet,
      Math.floor(frame * this.frameWidth),
      Math.floor(this.frameHeight), // Row 1: burst explosion
      Math.floor(this.frameWidth),
      Math.floor(this.frameHeight),
      Math.round(this.x - drawW / 2),
      Math.round(this.y - drawH / 2),
      drawW,
      drawH
    );
    ctx.restore();
  }
}

class HealingAura extends Entity {
  constructor(target, life = 0.75) {
    super(target.x, Constants.GROUND_Y + (target.depth ?? 0));
    this.target = target;
    this.life = life;
    this.maxLife = life;
    this.frameWidth = 543;
    this.frameHeight = 724;
  }

  update(delta) {
    // Follow the healed ally while it advances; the effect is tied to its feet.
    if (this.target.hp > 0) {
      this.x = this.target.x;
      this.y = Constants.GROUND_Y + (this.target.depth ?? 0);
    }
    this.life -= delta;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx, spriteSheet, layer = "back") {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return;
    const progress = Math.max(0, Math.min(1, (this.maxLife - this.life) / this.maxLife));
    const frame = Math.min(3, Math.floor(progress * 4));
    const scale = 0.08;
    const drawW = Math.round(this.frameWidth * scale);
    // The upper half sits behind units; the near edge is painted over their feet.
    const circleTop = 480;
    const split = 565;
    const sourceTop = layer === "front" ? split : circleTop;
    const sourceBottom = layer === "front" ? this.frameHeight : split;
    const top = Math.round(this.y - 5) + Math.round((sourceTop - circleTop) * scale);
    const bottom = Math.round(this.y - 5) + Math.round((sourceBottom - circleTop) * scale);

    ctx.save();
    // Smooth fade in and fade out
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.95;
    ctx.imageSmoothingEnabled = false;

    // Center the rune on the actual foot position, not above the target's legs.
    ctx.drawImage(
      spriteSheet,
      frame * this.frameWidth,
      sourceTop,
      this.frameWidth,
      sourceBottom - sourceTop,
      Math.round(this.x - drawW / 2),
      top,
      drawW,
      bottom - top
    );
    ctx.restore();
  }
}

window.LightningBolt = LightningBolt;
window.LightningBurst = LightningBurst;
window.HealingAura = HealingAura;
