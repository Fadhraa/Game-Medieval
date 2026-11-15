"use strict";

class Witcher extends Healer {
  static frameSeconds = 0.1;
  static summonDuration = 3;
  static castRows = { attack: 2, heal: 3, summon: 4 };

  constructor(depth = 0) {
    super({
      kind: "witcher",
      side: -1,
      start: Constants.BASES.enemy.spawnX,
      depth,
      hp: 40,
      damage: 50,
      speed: 25,
      attackEvery: 3,
      reach: 150,
      healSpeed: 5,
      healPower: 0.12
    });
    this.cast = null;
    this.summonCooldown = 6;
    this.guard = null;
  }

  getRenderConfig() {
    return {
      ...super.getRenderConfig(),
      frameWidth: 64,
      frameHeight: 64,
      originX: 34,
      feetOrigin: 55,
      scale: 1.12,
      nativeDirection: -1,
      barYOffset: 46
    };
  }

  allyInReach(ally) {
    const ahead = (ally.x - this.x) * this.side;
    return ally.hp > 0 && ahead > 0 && ahead <= this.healReach;
  }

  update(delta, battle) {
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.healCooldown = Math.max(0, this.healCooldown - delta);
    this.summonCooldown = Math.max(0, this.summonCooldown - delta);
    this.flash = Math.max(0, this.flash - delta);
    this.moving = false;

    if (this.cast) {
      const previousAge = this.cast.age;
      this.cast.age += delta;
      const summoning = this.cast.kind === "summon";
      const duration = summoning ? Witcher.summonDuration : 6 * Witcher.frameSeconds;
      const finished = this.cast.age + 1e-8 >= duration;
      const release = 3 * Witcher.frameSeconds;
      if (summoning ? finished : previousAge < release && this.cast.age >= release) {
        this.releaseSpell(battle);
      }
      if (finished) this.cast = null;
      return;
    }

    const { opponent, distance, baseDistance } = this.findOpponent(battle);
    const inCombat = distance <= this.reach || baseDistance <= this.reach;
    if (inCombat && this.summonCooldown === 0 && !(this.guard?.hp > 0)) {
      const minotaur = new Minotaur(this.depth, true);
      minotaur.x = Math.max(Constants.BASES.hero.x + 28, this.x - 26);
      const circle = new WitcherCircle(minotaur.x, Constants.GROUND_Y + minotaur.depth, 2);
      this.cast = { kind: "summon", age: 0, minotaur, circle };
      this.summonCooldown = 16;
      window.audioManager?.playHit("witcherSummonStart");
      return;
    }

    const ally = this.healCooldown === 0 ? this.findHealTarget(battle) : null;
    if (ally) {
      this.cast = { kind: "heal", age: 0, ally };
      this.healCooldown = this.healSpeed;
      return;
    }

    if (inCombat) {
      if (this.cooldown === 0) {
        this.cast = { kind: "attack", age: 0 };
        this.cooldown = this.attackEvery;
      }
      return;
    }

    // Stay behind nearby allies while advancing. Heroes can still hit her normally.
    let frontX = Infinity;
    for (const unit of battle.units) {
      if (unit === this || unit.side !== this.side || unit.kind === this.kind || unit.hp <= 0) continue;
      if (unit.x < this.x && this.x - unit.x <= 220) {
        frontX = Math.min(frontX, unit.x);
      }
    }
    const travel = this.speed * delta;
    const distanceToWalk = Number.isFinite(frontX) ? Math.min(travel, Math.max(0, this.x - frontX - 38)) : travel;
    this.x -= distanceToWalk;
    this.walk += distanceToWalk / this.speed;
    this.moving = distanceToWalk > 0;
  }

  healAmount() {
    return this.maxHp * this.healPower + 50;
  }

  releaseSpell(battle) {
    const feet = Constants.GROUND_Y + this.depth;
    if (this.cast.kind === "summon") {
      this.guard = this.cast.minotaur;
      battle.units.push(this.guard);
      window.audioManager?.playHit("witcherSummonComplete");
    } else if (this.cast.kind === "heal") {
      const ally = this.cast.ally;
      if (this.allyInReach(ally) && ally.receiveHealing(this.healAmount(), battle) > 0) {
        battle.witcherCircles.push(new WitcherCircle(ally.x, Constants.GROUND_Y + ally.depth, 1, ally));
        window.audioManager?.playHit("witcherHeal");
      }
    } else {
      const { opponent, distance, baseDistance } = this.findOpponent(battle);
      if (distance > this.reach && baseDistance > this.reach) return;
      const targetX = distance <= this.reach ? opponent.x : Constants.BASES.hero.x;
      const muzzleX = Math.min(this.x, Math.max(targetX, this.x - 20));
      battle.spawnProjectile(new WitcherBolt(muzzleX, feet - 23, this.damage));
      window.audioManager?.playHit("witcherLaunch");
    }
  }

  drawSummon(ctx, ground, time, minotaurSheet, effectsSheet) {
    if (this.hp <= 0 || this.cast?.kind !== "summon") return;

    const { age, minotaur, circle } = this.cast;
    const progress = Math.min(1, age / Witcher.summonDuration);
    circle.draw(ctx, effectsSheet, progress);
    minotaur.drawEmerging(ctx, ground, time, minotaurSheet, progress);
  }

  getPose(time) {
    if (this.cast) {
      const frameSeconds = this.cast.kind === "summon" ? Witcher.summonDuration / 6 : Witcher.frameSeconds;
      const frame = Math.min(5, Math.floor(this.cast.age / frameSeconds));
      return [Witcher.castRows[this.cast.kind], frame];
    }
    return this.moving ? [1, Math.floor(this.walk * 8) % 6] : [0, Math.floor(time * 5) % 6];
  }
}
