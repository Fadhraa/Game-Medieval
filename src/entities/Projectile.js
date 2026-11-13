"use strict";

class Projectile extends Entity {
  constructor(x, y, speed, damage = 0, side = 1, life = 3) {
    super(x, y);
    this.speed = speed;
    this.damage = damage;
    this.side = side;
    this.life = life;
  }

  update(delta, battle) {}

  draw(ctx, time, spriteSheet) {}
}

class Fireball extends Projectile {
  constructor(x, y) {
    super(x, y, Constants.FIREBALL_SPEED, 75, 1, 3);
    this.splashDamage = Constants.FIREBALL_SPLASH;
    this.splashRadius = Constants.FIREBALL_RADIUS;
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
      target.takeDamage(this.damage, battle, true);
    } else {
      battle.damageBase(-1, this.damage);
    }

    // Splash damage
    for (const other of battle.units) {
      if (
        other.side === -1 &&
        other !== target &&
        other.hp > 0 &&
        Math.abs(other.x - x) <= this.splashRadius
      ) {
        other.takeDamage(this.splashDamage, battle, false);
      }
    }

    battle.spawnBurst(x, this.y);
    battle.spawnImpact(x, true);
    window.audioManager?.playHit("fireball");
  }

  draw(ctx, time, spriteSheet) {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return;
    const frame = Math.floor(time * 14) % 4;
    ctx.drawImage(
      spriteSheet,
      frame * 32,
      0, // Row 0 is flying projectile
      32,
      32,
      Math.round(this.x - 16),
      Math.round(this.y - 16),
      32,
      32
    );
  }
}

window.Projectile = Projectile;
window.Fireball = Fireball;

