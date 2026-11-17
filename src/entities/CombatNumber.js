"use strict";

class CombatNumber extends Entity {
  static formatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
  static badgeW = 64;
  static badgeH = 18;
  static badgeScale = 3;

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
    this.badge = this.renderBadge();
  }

  renderBadge() {
    if (typeof document === "undefined") return null;
    const w = CombatNumber.badgeW;
    const h = CombatNumber.badgeH;
    const s = CombatNumber.badgeScale;
    const canvas = document.createElement("canvas");
    canvas.width = w * s;
    canvas.height = h * s;
    const bctx = canvas.getContext("2d");
    bctx.scale(s, s);
    bctx.font = "bold 9px monospace";
    bctx.textAlign = "center";
    bctx.lineWidth = 2;
    bctx.strokeStyle = "#241e21";
    bctx.fillStyle = this.healing ? "#88f0a1" : "#ff9290";
    bctx.strokeText(this.label, w / 2, h - 4);
    bctx.fillText(this.label, w / 2, h - 4);
    return canvas;
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
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    if (this.badge) {
      const w = CombatNumber.badgeW;
      const h = CombatNumber.badgeH;
      ctx.drawImage(this.badge, x - w / 2, y - h + 4, w, h);
    } else {
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#241e21";
      ctx.fillStyle = this.healing ? "#88f0a1" : "#ff9290";
      ctx.strokeText(this.label, x, y);
      ctx.fillText(this.label, x, y);
    }
    ctx.restore();
  }
}
