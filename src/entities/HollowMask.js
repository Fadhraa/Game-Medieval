"use strict";

class HollowMask extends Unit {
  static spriteGeometry = { frameWidth: 136, frameHeight: 104, originX: 66, feetOrigin: 83 };
  static rangedKinds = new Set(["wizard", "kira", "lynce"]);
  static sinkDuration = 0.46;
  static transitDuration = 0.22;
  static riseDuration = 0.48;
  static slashFrameSeconds = 0.09;
  static spawnInterval = 52;

  constructor(depth = 0) {
    super({ kind: "hollowMask", side: -1, start: Constants.BASES.enemy.spawnX,
      depth, hp: 100, damage: 75, speed: 29, attackEvery: 1.6, reach: 18 });
    this.usedShadowStep = false;
    this.shadow = null;
    this.slash = null;
  }

  get isUntargetable() {
    return Boolean(this.shadow && (this.shadow.phase === "transit" || this.shadow.phase === "rise"));
  }

  takeDamage(amount, battle, options) {
    if (this.isUntargetable) return;
    super.takeDamage(amount, battle, options);
  }

  getRenderConfig() {
    return { ...super.getRenderConfig(), ...HollowMask.spriteGeometry, nativeDirection: -1,
      barYOffset: 62, shadowWidth: 18 };
  }

  selectShadowTarget(battle) {
    const safeX = Constants.BASES.hero.x + 17;
    const targets = battle.units.filter(unit => unit.side === 1 && unit.hp > 0 &&
      unit.kind !== "farmer" && unit.x >= safeX && unit.x <= this.x);
    const ranged = targets.filter(unit => HollowMask.rangedKinds.has(unit.kind));
    const candidates = ranged.length ? ranged : targets;
    const range = ranged.length ? 160 : 45;
    return candidates.filter(unit => this.x - unit.x <= range).sort((a, b) => a.x - b.x)[0];
  }

  findOpponent(battle) {
    const result = super.findOpponent(battle);
    for (const unit of battle.units) {
      const distance = Math.abs(this.x - unit.x);
      if (unit.side === 1 && unit.hp > 0 && distance <= this.reach && distance < result.distance) {
        result.opponent = unit;
        result.distance = distance;
      }
    }
    return result;
  }

  performAttack(target) {
    this.slash = { target, age: 0, hit: false };
  }

  update(delta, battle) {
    if (this.shadow) {
      this.updateShadowStep(delta);
      return;
    }
    if (this.slash) {
      this.updateSlash(delta, battle);
      return;
    }
    const target = !this.usedShadowStep && this.selectShadowTarget(battle);
    if (target) {
      this.usedShadowStep = true;
      this.moving = false;
      this.shadow = { phase: "sink", age: 0, target, exit: target.x - 13 };
      return;
    }
    super.update(delta, battle);
  }

  updateShadowStep(delta) {
    const shadow = this.shadow;
    this.flash = Math.max(0, this.flash - delta);
    shadow.age += delta;
    if (shadow.phase !== "rise" && shadow.target.hp > 0) {
      shadow.exit = Math.max(Constants.BASES.hero.x + 4, shadow.target.x - 13);
    }
    if (shadow.phase === "sink" && shadow.age >= HollowMask.sinkDuration) {
      shadow.phase = "transit";
      shadow.age -= HollowMask.sinkDuration;
    }
    if (shadow.phase === "transit" && shadow.age >= HollowMask.transitDuration) {
      if (shadow.target.hp <= 0 || shadow.target.active === false) {
        this.shadow = null;
        return;
      }
      this.x = shadow.exit;
      this.depth = shadow.target.depth;
      this.facing = 1;
      shadow.phase = "rise";
      shadow.age -= HollowMask.transitDuration;
    }
    if (shadow.phase === "rise" && shadow.age >= HollowMask.riseDuration) {
      this.slash = { target: shadow.target, age: shadow.age - HollowMask.riseDuration,
        hit: false, ambush: true, origin: this.x };
      this.cooldown = this.attackEvery;
      this.shadow = null;
    }
  }

  updateSlash(delta, battle) {
    const slash = this.slash;
    this.flash = Math.max(0, this.flash - delta);
    const { attack } = this.getSpeedMultipliers(battle);
    this.cooldown = Math.max(0, this.cooldown - delta * attack);
    slash.age += delta * attack;
    if (slash.ambush && !slash.hit && slash.target.hp > 0) {
      const xLimit = Math.min(slash.origin + 15, slash.target.x - 8);
      this.x = Math.max(this.x, Math.min(xLimit, this.x + 58 * delta));
    }
    if (slash.age >= 3 * HollowMask.slashFrameSeconds && !slash.hit) {
      slash.hit = true;
      const target = slash.target;
      if (target?.hp > 0 && Math.abs(target.x - this.x) <= this.reach) {
        target.takeDamage(this.getAttackDamage(battle), battle, { type: "physical" });
        for (let i = 0; i < 8; i++) {
          battle.spawnParticle(target.x, Constants.GROUND_Y + target.depth - 18,
            this.facing * (10 + i * 7), -55 + i * 8, 0.19 + i * 0.018,
            i % 3 === 0 ? "#f6dfff" : "#b96df9", i % 3 === 0 ? 2 : 1);
        }
      } else if (!target && this.findOpponent(battle).baseDistance <= this.reach) {
        battle.damageBase(this.side, this.getAttackDamage(battle));
      }
    }
    if (slash.age >= 6 * HollowMask.slashFrameSeconds) this.slash = null;
  }

  getPose(time) {
    if (this.shadow?.phase === "sink") return [3, Math.min(5, Math.floor(this.shadow.age * 6 / HollowMask.sinkDuration))];
    if (this.shadow?.phase === "rise") return [4, Math.min(5, Math.floor(this.shadow.age * 6 / HollowMask.riseDuration))];
    if (this.slash) return [2, Math.min(5, Math.floor(this.slash.age / HollowMask.slashFrameSeconds))];
    if (this.moving) return [1, Math.floor(this.walk * 9) % 6];
    return [0, Math.floor(time * 5) % 6];
  }

  drawPortal(ctx, x, y, time, size, front = false) {
    if (size <= 0) return;
    const width = 19 * size;
    const height = 5 * size;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (!front) {
      ctx.beginPath();
      ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#160e23";
      ctx.fill();
      ctx.strokeStyle = "#8145bc";
      ctx.stroke();
      for (let arm = 0; arm < 3; arm++) {
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) {
          const u = i / 16;
          const t = time * 9 + arm * Math.PI * 2 / 3 + u * 5;
          const r = 0.16 + u * 0.76;
          const px = Math.round(Math.cos(t) * r * width);
          const py = Math.round(Math.sin(t) * r * height);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = arm === 0 ? "#c36cfc" : "#643696";
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, width, height, 0, 0, Math.PI);
      ctx.strokeStyle = "#d48fff";
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const t = time * 2 + i * Math.PI * 2 / 7;
      if ((Math.sin(t) > 0) !== front) continue;
      const px = Math.round(Math.cos(t) * (width + 3));
      const py = Math.round(Math.sin(t) * (height + 2));
      ctx.fillStyle = i % 2 ? "#e5acff" : "#8f51c9";
      ctx.fillRect(px, py, 2, 1);
    }
    ctx.restore();
  }

  draw(ctx, ground, time, sheet) {
    if (!this.shadow) {
      super.draw(ctx, ground, time, sheet);
      return;
    }
    const { phase, age, target, exit } = this.shadow;
    const feet = ground + this.depth;
    const size = phase === "sink" ? Math.min(1, age / 0.13) : 1;
    const destinationSize = phase === "sink" ? Math.max(0, (age - 0.18) / 0.28)
      : phase === "rise" ? Math.min(1, (HollowMask.riseDuration - age) / 0.15) : 1;
    const showEntrance = phase === "sink" || phase === "transit";
    if (showEntrance) this.drawPortal(ctx, this.x, feet, time, phase === "transit" ? 1 - age / HollowMask.transitDuration : size);
    this.drawPortal(ctx, exit, ground + target.depth, time, destinationSize);
    if (phase !== "transit") super.draw(ctx, ground, time, sheet);
    if (showEntrance) this.drawPortal(ctx, this.x, feet, time, phase === "transit" ? 1 - age / HollowMask.transitDuration : size, true);
    this.drawPortal(ctx, exit, ground + target.depth, time, destinationSize, true);
  }

}

window.HollowMask = HollowMask;
