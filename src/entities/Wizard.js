"use strict";

class Wizard extends Unit {
  constructor(depth = 0, rank = 0) {
    const { hp, damage, splashDamage } = Progress.stats("wizard", rank);
    super({
      kind: "wizard",
      side: 1,
      cost: Constants.WIZARD_COST,
      start: 83,
      depth,
      hp,
      damage,
      speed: 20,
      attackEvery: 2.5,
      reach: 120
    });
    this.splashDamage = splashDamage;
  }

  getRenderConfig() {
    return {
      frameWidth: 48,
      frameHeight: 48,
      originX: 23,
      feetOrigin: 43,
      scale: 0.82,
      nativeDirection: 1,
      barWidth: 18,
      barHeight: 3,
      barYOffset: 38,
      shadowWidth: 19,
      portraitX: 12,
      portraitScale: 0.55
    };
  }

  performAttack(target, base, battle) {
    // Spawns fireball projectile instead of direct melee strike
    battle.spawnProjectile(new Fireball(this.x + 10, 190 + (this.depth ?? 0), this.damage, this.splashDamage));
  }

  drawProcedural(ctx, feet) {
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(feet));
    ctx.scale(this.facing ?? this.side, 1);
    const step = this.engaged ? 0 : Math.floor(this.walk * 7.5) % 4;
    const bob = step % 2;
    const swing = this.engaged && this.swing < 0.24;
    const draw = (c, a, b, w, h) => {
      ctx.fillStyle = c;
      ctx.fillRect(a, b - bob, w, h);
    };

    draw("#20203c", -5 + step, -2, 4, 2);
    draw("#20203c", 2 - step, -2, 4, 2);
    draw("#444a88", -9, -23, 19, 22);
    draw("#6871b3", -7, -20, 13, 14);
    draw("#e7e7ec", -7, -30, 14, 12);
    draw("#f0c8b2", -3, -29, 8, 6);
    draw("#1b1b38", -13, -34, 28, 5);
    draw("#272a54", -5, -40, 17, 8);
    draw("#4d559b", -12, -34, 13, 3);
    draw("#ad733b", 9, -25, 2, 10);
    if (swing) draw("#ffb732", 10, -27, 5, 5);
    ctx.restore();
  }
}

window.Wizard = Wizard;

