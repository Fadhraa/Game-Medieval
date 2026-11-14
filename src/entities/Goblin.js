"use strict";

class Goblin extends Unit {
  constructor(depth = 0) {
    super({
      kind: "goblin",
      side: -1,
      start: Constants.BASES.enemy.spawnX,
      depth,
      hp: 50,
      damage: 15,
      speed: 26,
      attackEvery: 0.8,
      reach: 14
    });
  }

  getRenderConfig() {
    return {
      frameWidth: 48,
      frameHeight: 48,
      originX: 28,
      feetOrigin: 43,
      scale: 1,
      nativeDirection: -1,
      barWidth: 18,
      barHeight: 3,
      barYOffset: 40,
      shadowWidth: 19,
      portraitX: 13,
      portraitScale: 0.72
    };
  }

  drawProcedural(ctx, feet) {
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(feet));
    ctx.scale(this.side, 1);
    const step = this.engaged ? 0 : Math.floor(this.walk * 7.5) % 4;
    const bob = step % 2;
    const swing = this.engaged && this.swing < 0.24;
    const draw = (c, a, b, w, h) => {
      ctx.fillStyle = c;
      ctx.fillRect(a, b - bob, w, h);
    };

    draw("#3d492d", -6 + step, -7, 5, 6);
    draw("#3d492d", 2 - step, -7, 5, 6);
    draw("#30422a", -7 + step, -2, 6, 2);
    draw("#30422a", 2 - step, -2, 6, 2);
    draw("#35452b", -7, -15, 13, 10);
    draw(this.flash > 0 ? "#fff1d2" : "#789348", -6, -14, 11, 7);
    draw("#815a3a", -5, -10, 11, 4);
    draw("#4d392a", -5, -7, 10, 2);
    draw("#385230", -7, -22, 15, 8);
    draw("#91a758", -5, -23, 11, 8);
    draw("#637d40", -9, -21, 4, 4);
    draw("#a9b66a", 6, -21, 4, 3);
    draw("#362e21", 1, -20, 5, 2);
    draw("#e7b66a", 4, -20, 2, 1);
    draw("#c8bd81", 5, -16, 3, 2);
    draw("#89a157", 5, -13, 5, 4);
    draw("#47382a", 9, -15, 3, 6);
    draw("#85603b", swing ? 11 : 8, swing ? -14 : -22, swing ? 8 : 5, swing ? 4 : 8);
    draw("#af824c", swing ? 13 : 9, swing ? -14 : -22, 4, 2);
    ctx.restore();
  }
}

window.Goblin = Goblin;

