"use strict";

class LynceArrow extends Projectile {
  constructor(x, y, damage = Progress.stats("lynce").damage) {
    super(x, y, 275, damage, 1, 3);
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
          unit.x <= this.x + 8
      )
      .sort((a, b) => a.x - b.x)[0];

    if (collided || this.x >= Constants.BASES.enemy.x) {
      this.impact(battle, collided);
      this.life = 0;
      this.active = false;
    }

    if (this.life <= 0) {
      this.active = false;
    }
  }

  impact(battle, target) {
    const x = target?.x ?? Constants.BASES.enemy.x;
    if (target) {
      target.takeDamage(this.damage, battle, { type: "physical" });
    } else {
      battle.damageBase(this.side, this.damage);
    }
    battle.spawnArrowBurst(x, this.y, false);
    window.audioManager?.playHit("lynceHit");
  }

  draw(ctx, time, spriteSheet) {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return;
    const frame = Math.floor(time * 16) % 4;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      spriteSheet,
      frame * 32,
      0,
      32,
      32,
      Math.round(this.x - 16),
      Math.round(this.y - 16),
      32,
      32
    );
    ctx.restore();
  }
}

class LynceSkillArrow extends Projectile {
  static minFlightDistance = 125;
  static maxFlightDistance = 240;
  static formationGap = 95;
  static backClearance = 32;
  static defaultBaseScale = 0.25;
  static defaultFalloffPerEnemy = 0.02;
  static defaultMinScale = 0.05;

  constructor(
    x,
    y,
    sourceAtk = Progress.stats("lynce").damage,
    {
      baseScale = LynceSkillArrow.defaultBaseScale,
      falloffPerEnemy = LynceSkillArrow.defaultFalloffPerEnemy,
      minScale = LynceSkillArrow.defaultMinScale
    } = {}
  ) {
    super(x, y, 300, sourceAtk * baseScale, 1, 2.5);
    this.startX = x;
    this.sourceAtk = sourceAtk;
    this.baseScale = baseScale;
    this.falloffPerEnemy = falloffPerEnemy;
    this.minScale = minScale;
    this.hitUnits = new Set();
    this.hitBase = false;
  }

  getCurrentDamage() {
    const rawScale =
      Math.round((this.baseScale - this.falloffPerEnemy * this.hitUnits.size) * 10000) / 10000;
    const scale = Math.max(this.minScale, rawScale);
    return this.sourceAtk * scale;
  }

  computeFadeOutX(battle) {
    const aheadEnemies = battle.units
      .filter((unit) => unit.side === -1 && unit.hp > 0 && unit.x >= this.startX - 10)
      .sort((a, b) => a.x - b.x);

    let targetX = this.startX + LynceSkillArrow.minFlightDistance;
    if (aheadEnemies.length > 0) {
      let backRowX = aheadEnemies[0].x;
      for (let i = 1; i < aheadEnemies.length; i++) {
        if (aheadEnemies[i].x - backRowX > LynceSkillArrow.formationGap) break;
        backRowX = aheadEnemies[i].x;
      }
      targetX = Math.max(targetX, backRowX + LynceSkillArrow.backClearance);
    }

    return Math.min(
      Constants.BASES.enemy.x + 8,
      this.startX + LynceSkillArrow.maxFlightDistance,
      targetX
    );
  }

  update(delta, battle) {
    const beforeX = this.x;
    this.x = Math.min(Constants.BASES.enemy.x, beforeX + this.speed * delta);
    this.life -= delta;

    const piercedNow = battle.units
      .filter(
        (unit) =>
          unit.side === -1 &&
          unit.hp > 0 &&
          !unit.isUntargetable &&
          !this.hitUnits.has(unit) &&
          unit.x >= beforeX - 14 &&
          unit.x <= this.x + 10
      )
      .sort((a, b) => a.x - b.x);

    for (const unit of piercedNow) {
      const hitDamage = this.getCurrentDamage();
      this.hitUnits.add(unit);
      unit.takeDamage(hitDamage, battle, { type: "physical", heavy: true });
      for (let i = 0; i < 4; i++) {
        battle.spawnParticle(
          unit.x,
          this.y,
          (Math.random() - 0.3) * 58,
          -16 - Math.random() * 28,
          0.24 + Math.random() * 0.14,
          i % 2 ? "#ffd24d" : "#ff8524",
          1
        );
      }
      window.audioManager?.playHit("lynceSkillHit");
    }

    if (!this.hitBase && this.x >= Constants.BASES.enemy.x) {
      const baseDamage = this.getCurrentDamage();
      this.hitBase = true;
      battle.damageBase(this.side, baseDamage);
      window.audioManager?.playHit("lynceSkillHit");
    }

    const fadeOutX = this.computeFadeOutX(battle);
    if (this.x >= fadeOutX || this.x >= Constants.BASES.enemy.x || this.life <= 0) {
      battle.spawnArrowBurst(this.x, this.y, true);
      this.life = 0;
      this.active = false;
    }
  }

  draw(ctx, time, spriteSheet) {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return;
    const frame = Math.floor(time * 18) % 4;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      spriteSheet,
      frame * 32,
      0,
      32,
      32,
      Math.round(this.x - 16),
      Math.round(this.y - 16),
      32,
      32
    );
    ctx.restore();
  }
}

class LynceArrowBurst extends Entity {
  constructor(x, y, skill = false, life = 0.28) {
    super(x, y);
    this.skill = skill;
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
    const progress = Math.max(0, Math.min(1, (this.maxLife - this.life) / this.maxLife));
    const frame = Math.min(3, Math.floor(progress * 4));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      spriteSheet,
      frame * 32,
      32,
      32,
      32,
      Math.round(this.x - 16),
      Math.round(this.y - 16),
      32,
      32
    );
    ctx.restore();
  }
}

window.LynceArrow = LynceArrow;
window.LynceSkillArrow = LynceSkillArrow;
window.LynceArrowBurst = LynceArrowBurst;
