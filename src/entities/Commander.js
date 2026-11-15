"use strict";

class Commander extends Unit {
  static nameplate = "Panglima Mahkota Retak";
  static summonThreshold = 0.6;
  static skillInterval = 20;
  static shieldDuration = 3;
  static sweepReach = 56;
  static sweepDamage = 300;
  static magicResistance = 0.2;
  static frameSeconds = {
    plant: 0.1,
    sweep: 0.13,
    attack: 0.09,
    defeated: 0.14,
  };

  constructor() {
    super({
      kind: "commander",
      side: -1,
      start: Constants.BASES.enemy.x - 8,
      depth: 0,
      hp: 2000,
      damage: 100,
      speed: 18,
      attackEvery: 1,
      reach: 28,
    });
    this.name = Commander.nameplate;
    this.cooldown = this.attackEvery;
    this.combatTime = 0;
    this.action = null;
    this.actionAge = 0;
  }

  getRenderConfig() {
    return {
      ...super.getRenderConfig(),
      frameWidth: 128,
      frameHeight: 120,
      originX: 64,
      feetOrigin: 106,
      nativeDirection: -1,
      barWidth: 0,
      barYOffset: 97,
      shadowWidth: 39,
    };
  }

  takeDamage(amount, battle, options) {
    if (this.hp <= 0) return;
    const magicMultiplier =
      options?.type === "magic" ? 1 - Commander.magicResistance : 1;
    const guardMultiplier = this.action === "guard" ? 0.7 : 1;
    super.takeDamage(
      amount * magicMultiplier * guardMultiplier,
      battle,
      options,
    );
    if (this.hp === 0) {
      this.setAction("defeated");
      this.flash = 0;
    }
  }

  setAction(action) {
    this.action = action;
    this.actionAge = 0;
    this.moving = false;
  }

  get defeatFinished() {
    return (
      this.action === "defeated" &&
      this.actionAge >= 8 * Commander.frameSeconds.defeated
    );
  }

  update(delta, battle) {
    this.flash = Math.max(0, this.flash - delta);
    const { distance, baseDistance } = this.findOpponent(battle, 0);
    const inReach = distance <= this.reach || baseDistance <= this.reach;

    if (this.action) {
      this.updateAction(delta, battle, inReach, baseDistance <= this.reach);
      return;
    }

    this.moving = !inReach;
    if (!inReach) {
      this.x += this.side * this.speed * delta;
      this.walk += delta;
      return;
    }

    this.combatTime += delta;
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (this.combatTime + 1e-8 >= Commander.skillInterval) {
      this.setAction("plant");
    } else if (this.cooldown <= 1e-8) {
      this.setAction("attack");
      this.cooldown = this.attackEvery;
    }
  }

  updateAction(delta, battle, inReach, atBase) {
    const previousAge = this.actionAge;
    this.actionAge += delta;
    if (this.action === "guard") {
      if (this.actionAge + 1e-8 >= Commander.shieldDuration)
        this.setAction("sweep");
      return;
    }

    const frameSeconds = Commander.frameSeconds[this.action];
    const hitFrame = this.action === "sweep" ? 5 : this.action === "plant" ? 4 : 3;
    const hitAt = hitFrame * frameSeconds;
    const hit = previousAge < hitAt && this.actionAge >= hitAt;
    if (this.action === "attack") {
      if (inReach) this.combatTime += delta;
      this.cooldown = Math.max(0, this.cooldown - delta);
      if (hit && inReach) {
        const hitUnits = this.hitFront(battle, this.reach, this.damage);
        if (!hitUnits && atBase) battle.damageBase(this.side, this.damage);
        window.audioManager?.playHit(this.kind);
      }
    } else if (this.action === "plant" && hit) {
      window.audioManager?.playHit("commanderPlant");
    } else if (this.action === "sweep" && hit) {
      this.hitFront(battle, Commander.sweepReach, Commander.sweepDamage, {
        heavy: true,
        heroesOnly: true,
      });
      window.audioManager?.playHit("commanderSweep");
    }

    if (this.actionAge + 1e-8 < 8 * frameSeconds) return;
    if (this.action === "plant") {
      this.setAction("guard");
    } else {
      if (this.action === "sweep") {
        this.combatTime = 0;
        this.cooldown = this.attackEvery;
      }
      this.setAction(null);
    }
  }

  hitFront(battle, reach, damage, { heavy = false, heroesOnly = false } = {}) {
    let hitUnits = false;
    for (const unit of battle.units) {
      const distance = (unit.x - this.x) * this.side;
      if (
        unit.side === this.side ||
        unit.hp <= 0 ||
        distance < 0 ||
        distance > reach ||
        (heroesOnly && unit.kind === "farmer")
      )
        continue;
      unit.takeDamage(damage, battle, { type: "physical", heavy });
      hitUnits = true;
    }
    return hitUnits;
  }

  getPose(time) {
    if (this.action === "guard") return [2, 7];
    const rows = { plant: 2, sweep: 3, attack: 4, defeated: 5 };
    if (this.action) {
      const frame = Math.min(
        7,
        Math.floor(this.actionAge / Commander.frameSeconds[this.action]),
      );
      return [rows[this.action], frame];
    }
    return this.moving
      ? [1, Math.floor(this.walk * 9) % 8]
      : [0, Math.floor(time * 6) % 8];
  }

  drawHealth(ctx, ground) {
    if (this.hp <= 0) return;
    const x = Math.round(this.x);
    const y = ground + this.depth - 98;
    ctx.save();
    ctx.fillStyle = "#2a171a";
    ctx.fillRect(x - 42, y, 84, 7);
    ctx.fillStyle = "#ff544f";
    ctx.fillRect(x - 40, y + 2, Math.ceil((80 * this.hp) / this.maxHp), 3);
    ctx.textAlign = "center";
    ctx.font = "bold 8px monospace";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#291518";
    ctx.fillStyle = "#fff0d8";
    ctx.strokeText(Commander.nameplate, x, y - 3);
    ctx.fillText(Commander.nameplate, x, y - 3);
    ctx.restore();
  }

  drawShieldImpact(ctx, ground, sprite) {
    if (
      this.action !== "plant" ||
      this.actionAge < 0.4 ||
      !sprite?.naturalWidth
    )
      return;
    const width = 30;
    const height = Math.round(
      (width * sprite.naturalHeight) / sprite.naturalWidth,
    );
    ctx.save();
    ctx.globalAlpha = 1 - (this.actionAge - 0.4) / 0.4;
    ctx.drawImage(
      sprite,
      Math.round(this.x) - 27,
      ground + this.depth + 3 - height,
      width,
      height,
    );
    ctx.restore();
  }
}
