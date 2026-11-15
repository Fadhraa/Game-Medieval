"use strict";

class Knight extends Unit {
  constructor(depth = 0, rank = 0) {
    super({
      kind: "knight",
      side: 1,
      cost: Constants.KNIGHT_COST,
      start: 83,
      depth,
      ...Progress.stats("knight", rank),
      speed: 24,
      attackEvery: 1,
      reach: 17,
    });
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
      shadowWidth: 19,
      portraitX: 11,
      portraitScale: 0.66,
    };
  }

  canAttackSlot(target, battle) {
    return this.cooldown === 0 && battle.takeKnightAttackSlot(target, this);
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

    draw("#2a3c39", -7, -11, 14, 6);
    draw("#354942", -7 + step, -6, 5, 5);
    draw("#394744", 2 - step, -6, 5, 5);
    draw("#242e2a", -8 + step, -2, 6, 2);
    draw("#242e2a", 2 - step, -2, 6, 2);
    draw("#243836", -10, -16, 5, 11);
    draw("#3f7f77", -9, -15, 4, 9);
    draw("#364b46", -7, -17, 14, 10);
    draw(this.flash > 0 ? "#fff1d2" : "#a7bbb2", -5, -16, 9, 7);
    draw("#ced7c1", -5, -16, 7, 2);
    draw("#c59a54", -5, -9, 10, 2);
    draw("#354642", -6, -25, 12, 9);
    draw("#9fb6ad", -5, -24, 11, 8);
    draw("#d3ddc9", -3, -24, 8, 2);
    draw("#35413c", 0, -21, 6, 3);
    draw("#c09e75", 1, -21, 4, 1);
    draw("#568b7e", -6, -27, 5, 3);
    draw("#78a796", -9, -26, 6, 2);
    draw("#727e72", 4, -15, 4, 6);
    draw("#d0af73", 7, -13, 3, 3);

    if (swing) {
      draw("#394c46", 9, -16, 2, 7);
      draw("#49584d", 11, -14, 13, 4);
      draw("#f7ecd4", 12, -14, 12, 2);
      draw("#f9e3b5", 23, -15, 2, 4);
    } else {
      draw("#354a44", 8, -23, 4, 12);
      draw("#edf0d8", 9, -24, 2, 10);
      draw("#aa874b", 6, -14, 7, 2);
    }
    ctx.restore();
  }
}

window.Knight = Knight;
