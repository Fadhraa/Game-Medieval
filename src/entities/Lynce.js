"use strict";

class Lynce extends Unit {
  static spriteGeometry = {
    frameWidth: 96,
    frameHeight: 96,
    originX: 46,
    feetOrigin: 84,
  };
  static frameSeconds = 0.075;
  static skillDamageScale = 0.25;
  static skillFalloffPerEnemy = 0.02;
  static skillMinDamageScale = 0.05;

  constructor(depth = 0, rank = 0) {
    super({
      kind: "lynce",
      side: 1,
      cost: Constants.LYNCE_COST,
      start: 83,
      depth,
      ...Progress.stats("lynce", rank),
      speed: 24,
      attackEvery: 1.5,
      reach: 80,
    });
    this.normalShots = 0;
    this.shot = null;
  }

  getRenderConfig() {
    return {
      ...super.getRenderConfig(),
      ...Lynce.spriteGeometry,
      scale: 0.5,
      nativeDirection: 1,
      barWidth: 18,
      barHeight: 3,
      barYOffset: 38,
      shadowWidth: 18,
    };
  }

  performAttack() {
    this.shot = {
      skill: this.normalShots >= 2,
      fired: false,
    };
  }

  update(delta, battle) {
    if (!this.shot) {
      super.update(delta, battle);
      return;
    }

    const { attack } = this.getSpeedMultipliers(battle);
    this.swing += delta * attack;
    this.cooldown = Math.max(0, this.cooldown - delta * attack);
    this.flash = Math.max(0, this.flash - delta);

    if (!this.shot.fired && this.swing >= 4 * Lynce.frameSeconds) {
      this.shot.fired = true;
      const feet = Constants.GROUND_Y + (this.depth ?? 0);
      const muzzleX = this.x + 15;
      const muzzleY = feet - 16;

      if (this.shot.skill) {
        this.normalShots = 0;
        battle.spawnProjectile(
          new LynceSkillArrow(muzzleX, muzzleY, this.damage, {
            baseScale: Lynce.skillDamageScale,
            falloffPerEnemy: Lynce.skillFalloffPerEnemy,
            minScale: Lynce.skillMinDamageScale,
          }),
        );
        window.audioManager?.playHit("lynceSkillLaunch");
      } else {
        this.normalShots++;
        battle.spawnProjectile(new LynceArrow(muzzleX, muzzleY, this.damage));
        window.audioManager?.playHit("lynceLaunch");
      }
    }

    if (this.swing >= 6 * Lynce.frameSeconds) {
      this.shot = null;
    }
  }

  getPose(time) {
    if (this.shot) {
      const frame = Math.min(5, Math.floor(this.swing / Lynce.frameSeconds));
      return [this.shot.skill ? 3 : 2, frame];
    }
    if (this.moving) {
      return [1, Math.floor(this.walk * 8) % 6];
    }
    return [0, Math.floor(time * 4.5) % 6];
  }
}

window.Lynce = Lynce;
