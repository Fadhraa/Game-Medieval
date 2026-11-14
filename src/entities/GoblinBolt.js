"use strict";

class GoblinBolt extends Projectile {
  constructor(x, y, damage) {
    super(x, y, 205, damage, -1, 3);
    this.age = 0;
    this.impactAge = null;
  }

  update(delta, battle) {
    if (!this.active) return;

    if (this.impactAge !== null) {
      this.impactAge += delta;
      this.active = this.impactAge < 0.24;
      return;
    }

    this.age += delta;
    this.life -= delta;
    const baseX = Constants.BASES.hero.x;
    const previousX = this.x;
    this.x = Math.max(baseX, previousX - this.speed * delta);
    let target = null;
    for (const unit of battle.units) {
      if (unit.side === this.side || unit.hp <= 0 ||
          unit.x > previousX + 2 || unit.x < Math.max(baseX, this.x - 4)) continue;
      if (!target || unit.x > target.x) target = unit;
    }

    if (target || this.x === baseX) {
      if (target) {
        this.x = target.x;
        target.takeDamage(this.damage, battle);
      } else {
        battle.damageBase(this.side, this.damage);
      }
      this.impactAge = 0;
    } else if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx, time, spriteSheet) {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return;
    const hit = this.impactAge !== null;
    const frame = hit ? Math.min(3, Math.floor(this.impactAge / 0.06)) : Math.floor(this.age * 14) % 4;
    ctx.drawImage(spriteSheet, frame * 32, hit ? 24 : 0, 32, 24,
      Math.round(this.x - 8), Math.round(this.y - 12), 32, 24);
  }
}
