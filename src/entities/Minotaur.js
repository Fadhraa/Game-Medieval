"use strict";

class Minotaur extends Unit {
  constructor(depth = 0) {
    super({
      kind: "minotaur",
      side: -1,
      start: 501,
      depth,
      hp: 124,
      damage: 20,
      speed: 20,
      attackEvery: 2.5,
      reach: 15,
    });

    this.healed = false;
    this.healingTimer = 0;
  }

  getRenderConfig() {
    return {
      frameWidth: 316,
      frameHeight: 311,
      originX: 148,
      feetOrigin: 298,
      scale: 0.19,
      nativeDirection: -1,
      barWidth: 26,
      barHeight: 3,
      barYOffset: 58,
      shadowWidth: 28,
      portraitX: 18,
      portraitScale: 0.13,
    };
  }

  takeDamage(amount, battle, isHeavy = false) {
    // Invulnerable while channeling healing
    if (this.healingTimer > 0) return;

    // Passive trigger: when damage reduces HP to < 25% (<= 31 HP)
    if (!this.healed && this.hp - amount <= this.maxHp * 0.25) {
      this.hp = Math.max(1, this.hp - amount); // Clamped so fatal blow doesn't kill
      this.healed = true;
      this.healingTimer = 1.0; // 1 second channeling
      this.flash = 0.25;
      battle.spawnImpact(this.x, true);
      return;
    }

    super.takeDamage(amount, battle, isHeavy);
  }

  update(delta, battle) {
    if (this.healingTimer > 0) {
      this.healingTimer = Math.max(0, this.healingTimer - delta);
      this.moving = false;
      this.engaged = true;
      this.swing = 1;
      this.cooldown = Math.max(this.cooldown, 0.5);

      if (this.healingTimer === 0) {
        this.hp = Math.round(this.maxHp * 0.5); // Restored to 50% HP (62 HP)
        // Spawn green healing sparkle particles
        for (let i = 0; i < 14; i++) {
          battle.spawnParticle(
            this.x + (Math.random() - 0.5) * 24,
            195 - Math.random() * 32,
            (Math.random() - 0.5) * 36,
            -25 - Math.random() * 35,
            0.45 + Math.random() * 0.25,
            i % 2 ? "#55d688" : "#b0f7c2",
            2,
          );
        }
      }
      return; // Skip normal movement and attacks while channeling
    }

    super.update(delta, battle);
  }

  getPose(time) {
    if (this.healingTimer > 0) {
      // 4th row (index 3) exclusively for healing animation
      const healProgress = Math.max(
        0,
        Math.min(1, 1 - this.healingTimer / 1.0),
      );
      const healFrame = Math.min(3, Math.floor(healProgress * 4));
      return [3, healFrame];
    }
    return super.getPose(time);
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
        2,
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
        cfg.frameHeight,
      );
      ctx.restore();
    } else {
      this.drawProcedural(ctx, feet);
    }

    // Health Bar with green color during healing
    if (this.hp < this.maxHp) {
      const barY = feet - cfg.barYOffset;
      const barW = cfg.barWidth;
      ctx.fillStyle = "#30362b";
      ctx.fillRect(
        Math.round(this.x - barW / 2),
        Math.round(barY),
        barW,
        cfg.barHeight,
      );

      ctx.fillStyle = this.healingTimer > 0 ? "#55d688" : "#ef9a6e";
      const fillW = Math.ceil((this.hp / this.maxHp) * (barW - 2));
      ctx.fillRect(
        Math.round(this.x - barW / 2 + 1),
        Math.round(barY + 1),
        fillW,
        1,
      );
    }
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

    draw("#513829", -10 + step, -10, 8, 8);
    draw("#513829", 3 - step, -10, 8, 8);
    draw("#382317", -11 + step, -3, 9, 3);
    draw("#382317", 3 - step, -3, 9, 3);
    draw("#6d4c38", -12, -26, 24, 18);
    draw(this.flash > 0 ? "#fff1d2" : "#805842", -10, -24, 20, 14);
    draw("#3d291e", -12, -38, 22, 14);
    draw("#805842", -10, -36, 18, 12);
    draw("#d4c398", -14, -42, 6, 8);
    draw("#d4c398", 8, -42, 6, 8);
    draw("#20120b", -4, -30, 8, 4);
    draw("#5a4030", swing ? 16 : 12, swing ? -24 : -36, 4, 24);
    draw("#7a8288", swing ? 12 : 8, swing ? -28 : -42, 12, 10);
    ctx.restore();
  }
}

window.Minotaur = Minotaur;
