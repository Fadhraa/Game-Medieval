"use strict";

class Unit extends Entity {
  constructor(config = {}) {
    super(config.start ?? 0, 0, config.depth ?? 0);

    this.kind = config.kind ?? "unit";
    this.side = config.side ?? 1; // 1 = Hero, -1 = Enemy
    this.cost = config.cost ?? 0;
    this.hp = config.hp ?? 50;
    this.maxHp = this.hp;
    this.damage = config.damage ?? 10;
    this.speed = config.speed ?? 20;
    this.attackEvery = config.attackEvery ?? 1;
    this.reach = config.reach ?? 15;

    // Combat & Animation states
    this.cooldown = 0.1;
    this.walk = 0;
    this.swing = 1;
    this.flash = 0;
    this.stunnedUntil = 0;
    this.slowedUntil = 0;
    this.frostStacks = 0;
    this.frozenUntil = 0;
    this.goblinQueenBuffUntil = 0;
    this.inMud = false;
    this.poisoned = false;
    this.poisonUntil = 0;
    this.mudTickTimer = 0;
    this.engaged = false;
    this.attackTarget = null;
    this.hasAttackSlot = false;
    this.moving = false;
    this.facing = this.side;
  }

  getRenderConfig() {
    return {
      frameWidth: 48,
      frameHeight: 48,
      originX: 20,
      feetOrigin: 43,
      scale: 1,
      nativeDirection: 1,
      barWidth: 18,
      barHeight: 3,
      barYOffset: 40,
      shadowWidth: 19
    };
  }

  findOpponent(battle, minimumDistance = -2) {
    let opponent = null;
    let distance = Infinity;
    const defendMelee =
      this.side === 1 &&
      Boolean(this.command) &&
      this.reach <= 45;

    for (const other of battle.units) {
      if (other === this || other.hp <= 0 || other.isUntargetable) continue;
      if (other.side === this.side) continue;
      const ahead = (other.x - this.x) * this.side;
      if (ahead >= minimumDistance && ahead < distance) {
        opponent = other;
        distance = ahead;
      } else if ((defendMelee || (this.side === 1 && this.reach <= 45 && other.kind === "hollowMask")) &&
          other.x >= Constants.BASES.hero.x - 12) {
        const absDist = Math.abs(other.x - this.x);
        if (absDist <= this.reach && absDist < distance) {
          opponent = other;
          distance = absDist;
        }
      }
    }

    const base = this.side === 1 ? Constants.BASES.enemy : Constants.BASES.hero;
    const baseDistance = (base.x - this.x) * this.side;

    return { opponent, distance, base, baseDistance };
  }

  findDefendThreat(battle, cmd) {
    const minGuardX = Constants.BASES.hero.x - 12;
    const maxGuardX = Math.max(cmd.flagX + Constants.DEFEND.detectRange, cmd.guardX + this.reach);
    let frontmost = null;
    let bestX = Infinity;
    let bestDist = Infinity;

    for (const other of battle.units) {
      if (other.side === this.side || other.hp <= 0 || other.isUntargetable) continue;
      if (other.x < minGuardX || other.x > maxGuardX) continue;
      const dist = Math.abs(other.x - this.x);
      if (other.x < bestX - 1 || (Math.abs(other.x - bestX) <= 1 && dist < bestDist)) {
        frontmost = other;
        bestX = other.x;
        bestDist = dist;
      }
    }

    return frontmost;
  }

  canAttackSlot(target, battle) {
    return true; // Subclasses can override (e.g. Knight slot limits)
  }

  hasGoblinQueenBuff(battle) {
    return this.goblinQueenBuffUntil > (battle?.elapsed ?? 0);
  }

  getAttackDamage(battle) {
    const multiplier = this.hasGoblinQueenBuff(battle) ? GoblinQueen.damageMultiplier : 1;
    return this.damage * multiplier;
  }

  performAttack(target, base, battle) {
    const damage = this.getAttackDamage(battle);
    if (target) {
      target.takeDamage(damage, battle, { type: "physical" });
    } else {
      battle.damageBase(this.side, damage);
    }
    window.audioManager?.playHit(this.kind);
  }

  takeDamage(amount, battle, { heavy = false } = {}) {
    const previousHp = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    battle.showCombatNumber(this, this.hp - previousHp);
    this.flash = 0.14;
    battle.spawnImpact(this.x, heavy);
    if (this.hp <= 0) {
      this.active = false;
    }
  }

  receiveHealing(amount, battle) {
    if (this.hp <= 0 || this.hp >= this.maxHp || amount <= 0) return 0;
    const restored = Math.min(amount, this.maxHp - this.hp);
    this.hp += restored;
    battle.showCombatNumber(this, restored);
    return restored;
  }

  getSpeedMultipliers(battle) {
    const buffed = battle?.hasBaseSpeedBuff?.(this);
    return {
      move:
        (this.slowedUntil > (battle?.elapsed ?? 0) ? 0.65 : 1) *
        (buffed ? Constants.BASE_SKILL.moveSpeedMultiplier : 1),
      attack: (buffed ? Constants.BASE_SKILL.attackSpeedMultiplier : 1) *
        (this.hasGoblinQueenBuff(battle) ? GoblinQueen.attackSpeedMultiplier : 1) *
        (this.poisoned ? Constants.SWAMP_MUD.attackSpeedMultiplier : 1)
    };
  }

  update(delta, battle) {
    if (this.hp <= 0) {
      this.active = false;
      return;
    }

    const { move, attack } = this.getSpeedMultipliers(battle);
    const { opponent, distance, base, baseDistance } = this.findOpponent(battle);
    const atBase = baseDistance <= this.reach;
    this.engaged = distance <= this.reach || atBase;

    const remainingCooldown = this.cooldown > 0 ? this.cooldown - delta * attack : 0;
    this.cooldown = Math.max(0, remainingCooldown);
    this.swing += delta * attack;
    this.flash = Math.max(0, this.flash - delta);
    this.moving = false;
    this.attackTarget = null;
    this.hasAttackSlot = false;

    const cmd = this.side === 1 ? this.command : null;

    if (cmd?.retreating) {
      const travel = Math.min(Math.max(0, this.x - cmd.guardX), this.speed * delta * move);
      this.x -= travel;
      this.walk += travel / this.speed;
      this.facing = -1;
      this.moving = travel > 0;
      this.engaged = false;
      if (this.x <= cmd.guardX) cmd.retreating = false;
      return;
    }

    if (this.engaged) {
      const target = distance <= this.reach ? opponent : null;
      this.facing = target
        ? target.x < this.x
          ? -1
          : target.x > this.x
          ? 1
          : this.side
        : this.side;
      this.attackTarget = target ?? base;
      this.hasAttackSlot = this.canAttackSlot(this.attackTarget, battle);

      if (this.hasAttackSlot && this.cooldown === 0) {
        this.performAttack(target, base, battle);
        this.cooldown = this.attackEvery + Math.min(0, remainingCooldown);
        this.swing = 0;
      }
    } else if (cmd) {
      const boss = battle.boss;
      const defendingOutsideWarning = boss?.skillWarningActive && cmd.guardX < boss.skillStartX;
      const threat = defendingOutsideWarning ? null : this.findDefendThreat(battle, cmd);
      const travel = this.speed * delta * move;
      if (threat) {
        if (threat.x < this.x) {
          this.facing = -1;
          this.moving = travel > 0;
          this.x -= travel;
          this.walk += travel / this.speed;
        } else {
          this.facing = 1;
          this.moving = travel > 0;
          this.x += travel;
          this.walk += travel / this.speed;
        }
      } else {
        const diff = cmd.guardX - this.x;
        if (Math.abs(diff) > 2 && travel > 0) {
          const dir = diff > 0 ? 1 : -1;
          const step = Math.min(Math.abs(diff), travel);
          this.facing = dir;
          this.moving = true;
          this.x += dir * step;
          this.walk += step / this.speed;
        } else {
          if (Math.abs(diff) <= 2) this.x = cmd.guardX;
          this.facing = this.side;
          this.moving = false;
        }
      }
    } else if (battle.outpost?.shouldHoldToCapture(this) && this !== battle.boss) {
      this.facing = this.side;
      this.moving = false;
    } else {
      this.facing = this.side;
      const travel = this.speed * delta * move;
      this.moving = travel > 0;
      this.x += travel * this.side;
      this.walk += travel / this.speed;
    }
  }

  getPose(time) {
    const spriteRows = { idle: 0, walk: 1, attack: 2 };
    const walkFps = 7.5;

    // Slash damage is dealt as swing resets to 0
    if (this.swing < 0.08) return [spriteRows.attack, 1];
    if (this.swing < 0.17) return [spriteRows.attack, 2];
    if (this.swing < 0.27) return [spriteRows.attack, 3];
    if (this.hasAttackSlot && this.cooldown <= 0.13) return [spriteRows.attack, 0];
    if (this.moving) return [spriteRows.walk, Math.floor(this.walk * walkFps) % 4];
    return [spriteRows.idle, Math.floor(time * 4) % 4];
  }

  draw(ctx, ground, time, spriteSheet) {
    const feet = ground + (this.depth ?? 0);
    const cfg = this.getRenderConfig();
    const hasSheet =
      spriteSheet instanceof HTMLCanvasElement
        ? spriteSheet.width > 0
        : Boolean(spriteSheet?.complete && spriteSheet.naturalWidth > 0);

    if (hasSheet) {
      const [row, frame] = this.getPose(time);
      const direction = (this.facing ?? this.side) === (cfg.nativeDirection ?? 1) ? 1 : -1;

      // Ground shadow
      ctx.fillStyle = "#5e6040";
      ctx.fillRect(
        Math.round(this.x - cfg.shadowWidth / 2),
        Math.round(feet - 1),
        cfg.shadowWidth,
        2
      );

      // Draw sprite
      ctx.save();
      ctx.translate(Math.round(this.x), Math.round(feet));
      ctx.scale(direction * cfg.scale, cfg.scale);
      ctx.imageSmoothingEnabled = false;

      ctx.drawImage(
        spriteSheet,
        frame * cfg.frameWidth,
        row * cfg.frameHeight,
        cfg.frameWidth,
        cfg.frameHeight,
        -cfg.originX,
        -cfg.feetOrigin,
        cfg.frameWidth,
        cfg.frameHeight
      );
      ctx.restore();
    } else {
      this.drawProcedural(ctx, feet);
    }

    // Health Bar
    if (cfg.barWidth > 0 && this.hp < this.maxHp) {
      const barY = feet - cfg.barYOffset;
      const barW = cfg.barWidth;
      ctx.fillStyle = "#30362b";
      ctx.fillRect(Math.round(this.x - barW / 2), Math.round(barY), barW, cfg.barHeight);

      ctx.fillStyle = this.side === 1 ? "#94c8a7" : "#ef9a6e";
      const fillW = Math.ceil((this.hp / this.maxHp) * (barW - 2));
      ctx.fillRect(Math.round(this.x - barW / 2 + 1), Math.round(barY + 1), fillW, 1);
    }
  }

  drawProcedural(ctx, feet) {
    // Basic fallback box
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(feet));
    ctx.fillStyle = this.flash > 0 ? "#fff1d2" : this.poisoned ? "#638c3f" : this.side === 1 ? "#4a7568" : "#805842";
    ctx.fillRect(-6, -20, 12, 20);
    ctx.restore();
  }
}

window.Unit = Unit;

