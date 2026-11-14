"use strict";

class CombatNumber extends Entity {
  static formatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

  constructor(unit, amount) {
    const feet = Constants.GROUND_Y + unit.depth;
    super(unit.x, feet - unit.getRenderConfig().barYOffset - 6);
    this.age = 0;
    this.duration = 0.85;
    this.healing = amount > 0;
    const magnitude = Math.abs(amount);
    const value = magnitude < 0.05 ? "<0,1" : CombatNumber.formatter.format(magnitude);
    this.label = (this.healing ? "+" : "−") + value;
    this.velocityX = this.healing ? 9 : -9;
  }

  update(delta) {
    this.age += delta;
    this.active = this.age < this.duration;
    this.y -= 22 * delta;
    this.x += this.velocityX * delta;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (this.duration - this.age) / 0.28);
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#241e21";
    ctx.fillStyle = this.healing ? "#88f0a1" : "#ff9290";
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    ctx.strokeText(this.label, x, y);
    ctx.fillText(this.label, x, y);
    ctx.restore();
  }
}
