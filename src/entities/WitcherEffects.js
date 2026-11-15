"use strict";

class WitcherBolt extends GoblinBolt {
  get damageType() {
    return "magic";
  }

  update(delta, battle) {
    const wasImpacting = this.impactAge !== null;
    super.update(delta, battle);
    if (!wasImpacting && this.impactAge !== null) {
      window.audioManager?.playHit("witcherImpact");
    }
  }

  draw(ctx, time, sheet) {
    if (this.impactAge !== null || !sheet?.complete || !sheet.naturalWidth) return;
    const frame = Math.floor(this.age * 16) % 4;
    ctx.drawImage(sheet, frame * 96, 0, 96, 64,
      Math.round(this.x - 24), Math.round(this.y - 16), 48, 32);
  }
}

class WitcherCircle extends Entity {
  constructor(x, y, row, target = null) {
    super(x, y);
    this.row = row;
    this.target = target;
    this.age = 0;
    this.duration = row === 2 ? 0.8 : 0.64;
  }

  update(delta) {
    this.age += delta;
    this.active = this.age < this.duration;
    if (this.target?.hp > 0) {
      this.x = this.target.x;
      this.y = Constants.GROUND_Y + this.target.depth;
    }
  }

  draw(ctx, sheet, progress = this.age / this.duration) {
    if (!sheet?.complete || !sheet.naturalWidth) return;
    const frame = Math.min(3, Math.floor(progress * 4));
    const scale = this.row === 2 ? 0.9 : 0.72;
    ctx.drawImage(sheet, frame * 96, this.row * 64, 96, 64,
      Math.round(this.x - 48 * scale), Math.round(this.y - 42 * scale), 96 * scale, 64 * scale);
  }
}
