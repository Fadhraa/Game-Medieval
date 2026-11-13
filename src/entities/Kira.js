"use strict";

class Kira extends Healer {
  constructor(depth = 0) {
    super({
      kind: "kira",
      side: 1,
      cost: Constants.KIRA_COST,
      start: 83,
      depth,
      hp: 55,
      damage: 20,
      speed: 22,
      attackEvery: 2.25,
      reach: 155,
      healSpeed: 2.25,
      healPower: 0.05
    });
  }

  getRenderConfig() {
    return {
      frameWidth: 256,
      frameHeight: 256,
      originX: 135,
      feetOrigin: 248,
      scale: 0.19,
      nativeDirection: 1, // Menghadap ke kanan di sprite asli
      barWidth: 20,
      barHeight: 3,
      barYOffset: 46,
      shadowWidth: 20,
      portraitX: 13,
      portraitScale: 0.11
    };
  }

  performAttack(target, base, battle) {
    // Spawns lightning bolt tepat di depan posisi tangan/buku sihir Kira
    const feet = Constants.GROUND_Y + (this.depth ?? 0);
    battle.spawnProjectile(new LightningBolt(this.x + 28, feet - 23));
  }

  getPose(time) {
    const spriteRows = {
      idle: 0,   // Baris 1: Idle (5 frame)
      walk: 1,   // Baris 2: Berjalan (6 frame)
      heal: 2,   // Baris 3: Heal target (6 frame)
      attack: 3  // Baris 4: Menyerang (6 frame)
    };
    const walkFps = 7.5;

    // Row 2: Heal animation (6 frames)
    if (this.isHealing) {
      if (this.swing < 0.54) {
        const frame = Math.min(5, Math.floor((this.swing / 0.54) * 6));
        return [spriteRows.heal, frame];
      }
      if (this.healCooldown <= 0.25) return [spriteRows.heal, 0];
      return [spriteRows.heal, Math.floor(time * 3) % 6];
    }

    // Row 3: Attack animation (6 frames)
    if (this.swing < 0.48) {
      const frame = Math.min(5, Math.floor((this.swing / 0.48) * 6));
      return [spriteRows.attack, frame];
    }
    if (this.engaged && this.cooldown <= 0.2) {
      return [spriteRows.attack, 0];
    }

    // Row 1: Walk animation (6 frames)
    if (this.moving) {
      return [spriteRows.walk, Math.floor(this.walk * walkFps) % 6];
    }

    // Row 0: Idle animation (5 frames only, 6th column is empty)
    return [spriteRows.idle, Math.floor(time * 3.5) % 5];
  }

  drawProcedural(ctx, feet) {
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(feet));
    ctx.scale(this.side, 1);
    const draw = (c, a, b, w, h) => {
      ctx.fillStyle = c;
      ctx.fillRect(a, b, w, h);
    };

    draw("#4a4045", -6, -3, 5, 3);
    draw("#4a4045", 2, -3, 5, 3);
    draw("#5c4f48", -8, -22, 16, 18);
    draw("#786855", -6, -18, 12, 12);
    draw("#c0b0a0", -5, -28, 10, 8);
    draw("#e0d0c0", -3, -27, 6, 5);
    draw("#9090a0", -8, -16, 4, 10);
    draw("#70c8d8", 4, -18, 4, 4);
    ctx.restore();
  }
}

window.Kira = Kira;
