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
    this.engaged = false;
    this.attackTarget = null;
    this.hasAttackSlot = false;
    this.moving = false;
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

    for (const other of battle.units) {
      if (other === this || other.hp <= 0) continue;
      const ahead = (other.x - this.x) * this.side;
      if (other.side !== this.side && ahead >= minimumDistance && ahead < distance) {
        opponent = other;
        distance = ahead;
      }
    }

    const base = this.side === 1 ? Constants.BASES.enemy : Constants.BASES.hero;
    const baseDistance = (base.x - this.x) * this.side;

    return { opponent, distance, base, baseDistance };
  }

  canAttackSlot(target, battle) {
    return true; // Subclasses can override (e.g. Knight slot limits)
  }

  performAttack(target, base, battle) {
    if (target) {
      target.takeDamage(this.damage, battle, { type: "physical" });
    } else {
      battle.damageBase(this.side, this.damage);
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

  update(delta, battle) {
    if (this.hp <= 0) {
      this.active = false;
      return;
    }

    const { opponent, distance, base, baseDistance } = this.findOpponent(battle);
    const atBase = baseDistance <= this.reach;
    this.engaged = distance <= this.reach || atBase;

    const remainingCooldown = this.cooldown > 0 ? this.cooldown - delta : 0;
    this.cooldown = Math.max(0, remainingCooldown);
    this.swing += delta;
    this.flash = Math.max(0, this.flash - delta);
    this.moving = false;
    this.attackTarget = null;
    this.hasAttackSlot = false;

    if (this.engaged) {
      const target = distance <= this.reach ? opponent : null;
      this.attackTarget = target ?? base;
      this.hasAttackSlot = this.canAttackSlot(this.attackTarget, battle);

      if (this.hasAttackSlot && this.cooldown === 0) {
        this.performAttack(target, base, battle);
        this.cooldown = this.attackEvery + Math.min(0, remainingCooldown);
        this.swing = 0;
      }
    } else {
      const travel = this.speed * delta * (this.slowedUntil > battle.elapsed ? 0.65 : 1);
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
    const hasSheet = spriteSheet?.complete && spriteSheet.naturalWidth > 0;

    if (hasSheet) {
      const [row, frame] = this.getPose(time);
      const direction = this.side === (cfg.nativeDirection ?? 1) ? 1 : -1;

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
      if (this.flash > 0) ctx.filter = "brightness(1.55)";

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
    ctx.fillStyle = this.side === 1 ? "#4a7568" : "#805842";
    ctx.fillRect(-6, -20, 12, 20);
    ctx.restore();
  }
}

window.Unit = Unit;

