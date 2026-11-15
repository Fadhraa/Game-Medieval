"use strict";

class Kira extends Healer {
  static spriteGeometry = { frameWidth: 48, frameHeight: 48, originX: 23, feetOrigin: 42 };

  constructor(depth = 0, rank = 0) {
    const { hp, damage, healPercent } = Progress.stats("kira", rank);
    super({
      kind: "kira",
      side: 1,
      cost: Constants.KIRA_COST,
      start: 83,
      depth,
      hp,
      damage,
      speed: 22,
      attackEvery: 2.25,
      reach: 155,
      healSpeed: 2.25,
      healPower: healPercent / 100
    });
    this.castRow = 3;
    this.lightningBolt = null;
  }

  getRenderConfig() {
    return {
      ...Kira.spriteGeometry,
      scale: 1,
      nativeDirection: 1, // Menghadap ke kanan di sprite asli
      barWidth: 20,
      barHeight: 3,
      barYOffset: 39,
      shadowWidth: 20
    };
  }

  healAmount() {
    return this.maxHp * this.healPower;
  }

  performHeal(target, battle) {
    super.performHeal(target, battle);
    this.castRow = 2;
  }

  performAttack(target, base, battle) {
    this.castRow = 3;
    const feet = Constants.GROUND_Y + (this.depth ?? 0);
    this.lightningBolt = new LightningBolt(this.x + 15, feet - 17, this.damage);
    battle.spawnProjectile(this.lightningBolt);
    window.audioManager?.playHit("lightningLaunch");
  }

  get castDuration() {
    return this.castRow === 2 ? 0.54 : 0.48;
  }

  update(delta, battle) {
    // Keep this cast exclusive until its animation and any launched bolt finish.
    if (this.hp > 0 && (this.swing < this.castDuration || this.lightningBolt?.active)) {
      const { attack } = this.getSpeedMultipliers(battle);
      this.swing += delta * attack;
      this.flash = Math.max(0, this.flash - delta);
      this.cooldown = Math.max(0, this.cooldown - delta * attack);
      this.healCooldown = Math.max(0, this.healCooldown - delta * attack);
      return;
    }

    this.lightningBolt = null;
    super.update(delta, battle);
  }

  getPose(time) {
    const frameCount = 6;
    const castDuration = this.castDuration;

    if (this.swing < castDuration) {
      return [this.castRow, Math.floor(this.swing * frameCount / castDuration)];
    }
    if (this.moving) {
      return [1, Math.floor(this.walk * 8) % frameCount];
    }
    return [0, Math.floor(time * 4.2) % frameCount];
  }

  drawProcedural(ctx, feet) {
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(feet));
    ctx.scale(this.facing ?? this.side, 1);
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
