"use strict";

class James extends Unit {
  static spriteGeometry = { frameWidth: 64, frameHeight: 64, originX: 31, feetOrigin: 60 };
  static frameSeconds = 0.08;

  constructor(depth = 0, rank = 0) {
    super({
      kind: "james",
      side: 1,
      cost: Constants.JAMES_COST,
      start: 83,
      depth,
      ...Progress.stats("james", rank),
      speed: 20,
      attackEvery: 2,
      reach: 15
    });
    this.hits = 0;
    this.strike = null;
  }

  getRenderConfig() {
    return {
      ...super.getRenderConfig(),
      ...James.spriteGeometry,
      scale: 0.625,
      barYOffset: 39,
      barWidth: 19,
      shadowWidth: 17
    };
  }

  findOpponent(battle) {
    return super.findOpponent(battle, 0);
  }

  performAttack(target) {
    this.strike = {
      shieldBash: this.hits === 3 && Boolean(target),
      hit: false
    };
  }

  update(delta, battle) {
    if (!this.strike) {
      super.update(delta, battle);
      return;
    }

    const { attack } = this.getSpeedMultipliers(battle);
    this.swing += delta * attack;
    this.cooldown = Math.max(0, this.cooldown - delta * attack);
    this.flash = Math.max(0, this.flash - delta);

    if (!this.strike.hit && this.swing >= 3 * James.frameSeconds) {
      this.strike.hit = true;
      const { opponent, distance, baseDistance } = this.findOpponent(battle);
      if (opponent && distance <= this.reach) {
        const previousHp = opponent.hp;
        super.performAttack(opponent, null, battle);
        if (this.strike.shieldBash) {
          this.hits = 0;
          if (opponent.hp > 0) {
            opponent.stunnedUntil = Math.max(opponent.stunnedUntil, battle.elapsed + 1);
            opponent.moving = false;
          }
        } else if (opponent.hp < previousHp) {
          this.hits = Math.min(3, this.hits + 1);
        }
      } else if (!this.strike.shieldBash && baseDistance <= this.reach) {
        super.performAttack(null, null, battle);
      }
    }

    if (this.swing >= 6 * James.frameSeconds) this.strike = null;
  }

  getPose(time) {
    if (this.strike) {
      const frame = Math.min(5, Math.floor(this.swing / James.frameSeconds));
      return [this.strike.shieldBash ? 3 : 2, frame];
    }
    if (this.moving) return [1, Math.floor(this.walk * 8) % 6];
    return [0, Math.floor(time * 5) % 6];
  }
}

window.James = James;
