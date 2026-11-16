"use strict";

class GoblinQueen extends Unit {
  static summonThreshold = 0.65;
  static buffInterval = 20;
  static buffDuration = 6;
  static damageMultiplier = 1.20;
  static attackSpeedMultiplier = 1.15;
  static spriteGeometry = { frameWidth: 160, frameHeight: 128, originX: 74, feetOrigin: 109 };
  static muzzle = { x: 28, y: -59 };
  static frames = {
    idle: [230, 205, 200, 90, 200, 230],
    walk: [100, 90, 95, 115, 100, 90, 95, 115],
    attack: [120, 100, 150, 75, 75, 105, 140, 175],
    buff: [120, 120, 130, 140, 150, 160, 170, 200, 260, 250, 240, 210],
    defeated: [110, 130, 120, 140, 130, 110, 190, 520]
  };
  static releaseFrames = { attack: 3, buff: 7 };

  constructor() {
    super({
      kind: "goblinQueen", side: -1, start: Constants.BASES.enemy.x - 8,
      hp: 1000, damage: 35, speed: 18, attackEvery: 2.5, reach: 120
    });
    this.name = "Ratu Goblin";
    this.cooldown = this.attackEvery;
    this.nextBuffAt = null;
    this.action = null;
    this.actionAge = 0;
    this.idleAge = 0;
  }

  static frameAt(milliseconds, delays) {
    let frame = 0;
    while (frame < delays.length - 1 && milliseconds + 1e-6 >= delays[frame]) {
      milliseconds -= delays[frame];
      frame++;
    }
    return frame;
  }

  static durationOf(delays) {
    return delays.reduce((total, delay) => total + delay, 0);
  }

  getRenderConfig() {
    return {
      ...super.getRenderConfig(), ...GoblinQueen.spriteGeometry,
      scale: 0.88, nativeDirection: -1, barWidth: 0, shadowWidth: 34
    };
  }

  setAction(action) {
    this.action = action;
    this.actionAge = 0;
    this.idleAge = 0;
    this.moving = false;
  }

  takeDamage(amount, battle, options) {
    if (this.hp <= 0) return;
    super.takeDamage(amount, battle, options);
    if (this.hp === 0) {
      this.setAction("defeated");
      this.flash = 0;
    }
  }

  get defeatFinished() {
    return this.action === "defeated" &&
      this.actionAge * 1000 >= GoblinQueen.durationOf(GoblinQueen.frames.defeated);
  }

  update(delta, battle) {
    this.flash = Math.max(0, this.flash - delta);
    this.cooldown = Math.max(0, this.cooldown - delta);
    const { distance, baseDistance } = this.findOpponent(battle, 0);
    const inReach = Math.min(distance, baseDistance) <= this.reach;

    if (this.action) {
      const action = this.action;
      const delays = GoblinQueen.frames[action];
      const previous = this.actionAge * 1000;
      this.actionAge += delta;
      const elapsed = this.actionAge * 1000;
      const releaseFrame = GoblinQueen.releaseFrames[action];
      const releaseAt = GoblinQueen.durationOf(delays.slice(0, releaseFrame));
      if (previous + 1e-6 < releaseAt && elapsed + 1e-6 >= releaseAt) {
        if (action === "attack") this.releaseProjectile(battle);
        else if (action === "buff") this.grantBuff(battle);
      }
      if (elapsed + 1e-6 >= GoblinQueen.durationOf(delays)) this.setAction(null);
      return;
    }

    this.moving = !inReach;
    if (this.moving) {
      this.idleAge = 0;
      this.x += this.side * this.speed * delta;
      this.walk += delta;
      return;
    }

    this.nextBuffAt ??= battle.elapsed + GoblinQueen.buffInterval;
    if (battle.elapsed + 1e-8 >= this.nextBuffAt &&
        battle.units.some(unit => this.canBuff(unit))) {
      this.setAction("buff");
      this.nextBuffAt = battle.elapsed + GoblinQueen.buffInterval;
    } else if (this.cooldown <= 1e-8) {
      this.setAction("attack");
      this.cooldown = this.attackEvery;
    } else {
      const duration = GoblinQueen.durationOf(GoblinQueen.frames.idle) / 1000;
      this.idleAge = (this.idleAge + delta) % duration;
    }
  }

  canBuff(unit) {
    return unit !== this && unit.side === this.side && unit.hp > 0 && unit.active;
  }

  grantBuff(battle) {
    const expiresAt = battle.elapsed + GoblinQueen.buffDuration;
    for (const unit of battle.units) {
      if (this.canBuff(unit)) unit.goblinQueenBuffUntil = expiresAt;
    }
    window.audioManager?.playHit("witcherHeal");
  }

  releaseProjectile(battle) {
    const { opponent, distance } = this.findOpponent(battle, 0);
    const target = distance <= this.reach ? opponent : Constants.BASES.hero;
    const scale = this.getRenderConfig().scale;
    const x = this.x + GoblinQueen.muzzle.x * scale;
    const y = Constants.GROUND_Y + this.depth + GoblinQueen.muzzle.y * scale;
    const hitY = Constants.GROUND_Y + (target.depth ?? 0) - 2;
    battle.spawnProjectile(new GoblinQueenMissile(x, y, this.damage, target.x, hitY));
    window.audioManager?.playHit("witcherLaunch");
  }

  getPose() {
    const { frames } = GoblinQueen;
    if (this.action === "buff") {
      const frame = GoblinQueen.frameAt(this.actionAge * 1000, frames.buff);
      return [Math.floor(frame / 4), frame % 4];
    }
    if (this.action === "attack" || this.action === "defeated") {
      return [this.action === "attack" ? 1 : 2,
        GoblinQueen.frameAt(this.actionAge * 1000, frames[this.action])];
    }
    if (this.moving) {
      const age = this.walk * 1000 % GoblinQueen.durationOf(frames.walk);
      return [0, GoblinQueen.frameAt(age, frames.walk)];
    }
    return [3, GoblinQueen.frameAt(this.idleAge * 1000, frames.idle)];
  }

  draw(ctx, ground, time, sheet, buffSheet) {
    super.draw(ctx, ground, time, this.action === "buff" ? buffSheet : sheet);
  }

  drawHealth(ctx, ground) {
    if (this.hp <= 0) return;
    const x = Math.round(this.x);
    const y = ground + this.depth - 96;
    ctx.save();
    ctx.fillStyle = "#241419";
    ctx.fillRect(x - 41, y, 82, 7);
    ctx.fillStyle = "#e15355";
    ctx.fillRect(x - 39, y + 2, Math.ceil(78 * this.hp / this.maxHp), 3);
    ctx.textAlign = "center";
    ctx.font = "bold 9px monospace";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#231a20";
    ctx.fillStyle = "#fff0db";
    ctx.strokeText(this.name, x, y - 3);
    ctx.fillText(this.name, x, y - 3);
    ctx.restore();
  }
}

class GoblinQueenMissile extends Projectile {
  static flightFrames = [60, 70, 60, 70, 60, 70, 60, 70];
  static impactFrames = [50, 50, 60, 70, 80, 90, 90, 100];
  static splashDamage = 15;

  constructor(x, y, damage, targetX, targetY) {
    super(x, y, Constants.FIREBALL_SPEED, damage, -1, 5);
    this.startX = x;
    this.startY = y;
    this.targetY = targetY;
    this.aimDistance = Math.max(1, x - targetX);
    this.age = 0;
    this.impactAge = null;
  }

  update(delta, battle) {
    if (!this.active) return;
    if (this.impactAge !== null) {
      this.impactAge += delta;
      this.active = this.impactAge * 1000 < GoblinQueen.durationOf(GoblinQueenMissile.impactFrames);
      return;
    }

    const previousX = this.x;
    const baseX = Constants.BASES.hero.x;
    this.x = Math.max(baseX, this.x - this.speed * delta);
    this.age += delta;
    this.life -= delta;
    const progress = Math.min(1, (this.startX - this.x) / this.aimDistance);
    this.y = this.startY + (this.targetY - this.startY) * progress;

    let target = null;
    for (const unit of battle.units) {
      if (unit.side === this.side || unit.hp <= 0 || !unit.active ||
          unit.x > previousX + 2 || unit.x < Math.max(baseX, this.x - 4)) continue;
      if (!target || unit.x > target.x) target = unit;
    }

    if (target || this.x === baseX) this.impact(battle, target);
    else if (this.life <= 0) this.active = false;
  }

  impact(battle, target) {
    if (target) {
      this.x = target.x;
      target.takeDamage(this.damage, battle, { type: "magic", heavy: true });
    } else {
      battle.damageBase(this.side, this.damage);
    }

    for (const unit of battle.units) {
      if (unit === target || unit.side === this.side || unit.hp <= 0 || !unit.active ||
          Math.abs(unit.x - this.x) > Constants.FIREBALL_RADIUS) continue;
      unit.takeDamage(GoblinQueenMissile.splashDamage, battle, { type: "magic" });
    }
    this.y = Constants.GROUND_Y + (target?.depth ?? 0);
    this.impactAge = 0;
    window.audioManager?.playHit("witcherImpact");
  }

  draw(ctx, time, flightSheet, impactSheet) {
    const hit = this.impactAge !== null;
    const sheet = hit ? impactSheet : flightSheet;
    if (!sheet?.complete || !sheet.naturalWidth) return;
    const delays = hit ? GoblinQueenMissile.impactFrames : GoblinQueenMissile.flightFrames;
    const age = hit ? this.impactAge * 1000 : this.age * 1000 % GoblinQueen.durationOf(delays);
    const frame = GoblinQueen.frameAt(age, delays);
    const width = hit ? 80 : 48;
    const height = hit ? 48 : 24;
    const ox = hit ? 40 : 14;
    const oy = hit ? 36 : 12;
    ctx.drawImage(sheet, frame * width, 0, width, height,
      Math.round(this.x - ox), Math.round(this.y - oy), width, height);
  }
}
