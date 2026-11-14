"use strict";

class ArenaBoss extends Unit {
  static profiles = {
    rootGiant: {
      name: "Raksasa Akar", threshold: 0.65, hp: 4600, damage: 85, speed: 15,
      attackEvery: 1.8, reach: 31, skillInterval: 12, skillRange: 72, skillDamage: 180,
      skillType: "physical", indicator: "#efac64"
    },
    frostGolem: {
      name: "Golem Es", threshold: 0.7, hp: 5900, damage: 100, speed: 14,
      attackEvery: 1.9, reach: 34, skillInterval: 12, skillRange: 108, skillDamage: 140,
      skillType: "magic", indicator: "#96efff"
    }
  };

  constructor(kind) {
    const profile = ArenaBoss.profiles[kind];
    super({ ...profile, kind, side: -1, start: Constants.BASES.enemy.x - 8 });
    this.profile = profile;
    this.name = profile.name;
    this.cooldown = this.attackEvery;
    this.skillTimer = profile.skillInterval;
    this.actionAge = 0;
    this.action = null;
  }

  getRenderConfig() {
    return { ...super.getRenderConfig(), barYOffset: 90 };
  }

  get defeatFinished() {
    return this.hp === 0 && this.actionAge >= 0.85;
  }

  takeDamage(amount, battle, options) {
    if (this.hp <= 0) return;
    super.takeDamage(amount, battle, options);
    if (this.hp === 0) {
      this.action = "defeated";
      this.actionAge = 0;
    }
  }

  update(delta, battle) {
    const { opponent, distance, base, baseDistance } = this.findOpponent(battle, 0);
    const inReach = distance <= this.reach || baseDistance <= this.reach;
    this.flash = Math.max(0, this.flash - delta);
    this.moving = false;
    if (inReach) this.skillTimer = Math.max(0, this.skillTimer - delta);
    this.cooldown = Math.max(0, this.cooldown - delta);

    if (this.action) {
      const previous = this.actionAge;
      this.actionAge += delta;
      const special = this.action === "skill";
      const release = special ? 0.9 : 0.25;
      if (previous < release && this.actionAge >= release) {
        if (special) this.performSkill(battle);
        else if (inReach) this.performAttack(distance <= this.reach ? opponent : null, base, battle);
      }
      if (this.actionAge >= (special ? 1.25 : 0.5)) this.action = null;
      return;
    }

    if (this.skillTimer === 0 && distance <= this.profile.skillRange) {
      this.action = "skill";
      this.actionAge = 0;
      this.skillTimer = this.profile.skillInterval;
    } else if (inReach) {
      if (this.cooldown === 0) {
        this.action = "attack";
        this.actionAge = 0;
        this.cooldown = this.attackEvery;
      }
    } else {
      this.moving = true;
      this.x += delta * this.speed * this.side;
    }
  }

  performSkill(battle) {
    const { skillRange, skillDamage, skillType } = this.profile;
    for (const hero of battle.units) {
      const distance = (hero.x - this.x) * this.side;
      if (hero.side === this.side || hero.hp <= 0 || hero.kind === "farmer" ||
          distance < 0 || distance > skillRange) continue;
      hero.takeDamage(skillDamage, battle, { type: skillType, heavy: true });
      if (skillType === "magic") hero.slowedUntil = Math.max(hero.slowedUntil, battle.elapsed + 3);
    }
    for (let i = 1; i <= 3; i++) battle.spawnImpact(this.x + this.side * skillRange * i / 4, true);
    window.audioManager?.playHit("minotaur");
  }

  draw(ctx, ground, time, sheet) {
    const feet = ground + this.depth;
    const x = Math.round(this.x);
    if (this.action === "skill") {
      ctx.save();
      ctx.globalAlpha = this.actionAge < 0.9 ? 0.42 + Math.sin(time * 22) * 0.2 : 0.72;
      ctx.fillStyle = this.profile.indicator;
      ctx.fillRect(x - this.profile.skillRange, feet - 3, this.profile.skillRange, 4);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, feet);
    if (this.action === "defeated") {
      const progress = Math.min(1, this.actionAge / 0.85);
      ctx.rotate(-0.35 * progress);
      ctx.scale(1, 1 - 0.52 * progress);
    } else if (this.action === "attack") {
      ctx.rotate(-Math.sin(Math.PI * Math.min(1, this.actionAge / 0.5)) * 0.15);
    } else if (this.moving) {
      ctx.translate(0, -Math.abs(Math.sin(time * 10)) * 3);
      ctx.rotate(Math.sin(time * 10) * 0.035);
    }
    if (this.flash > 0) ctx.filter = "brightness(1.55)";
    if (sheet?.naturalWidth) {
      const height = this.kind === "frostGolem" ? 82 : 76;
      const width = Math.round(height * sheet.naturalWidth / sheet.naturalHeight);
      ctx.drawImage(sheet, -Math.round(width / 2), -height, width, height);
    } else {
      this.drawProcedural(ctx, 0, 0);
    }
    ctx.restore();
  }

  drawHealth(ctx, ground) {
    if (!this.hp) return;
    const x = Math.round(this.x);
    const y = ground + this.depth - 96;
    ctx.save();
    ctx.fillStyle = "#241419";
    ctx.fillRect(x - 41, y, 82, 7);
    ctx.fillStyle = "#e15355";
    ctx.fillRect(x - 39, y + 2, Math.ceil(78 * this.hp / this.maxHp), 3);
    ctx.textAlign = "center";
    ctx.font = "bold 9px monospace";
    ctx.strokeStyle = "#231a20";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#fff0db";
    ctx.strokeText(this.name, x, y - 3);
    ctx.fillText(this.name, x, y - 3);
    ctx.restore();
  }
}
