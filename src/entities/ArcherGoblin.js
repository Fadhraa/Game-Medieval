"use strict";

class ArcherGoblin extends Unit {
  constructor(depth = 0) {
    super({
      kind: "archer_goblin",
      side: -1,
      start: Constants.BASES.enemy.spawnX,
      depth,
      hp: 35,
      damage: 20,
      speed: 26,
      attackEvery: 2.75,
      reach: 140
    });
  }

  getRenderConfig() {
    return {
      ...super.getRenderConfig(),
      originX: 24,
      scale: 0.85,
      nativeDirection: -1
    };
  }

  update(delta, battle) {
    this.wasEngaged = this.engaged;
    super.update(delta, battle);
  }

  canAttackSlot() {
    if (!this.wasEngaged) this.cooldown = Math.max(this.cooldown, 0.24);
    return true;
  }

  performAttack(target, base, battle) {
    const muzzleX = Math.min(this.x, Math.max(target?.x ?? base.x, this.x - 11));
    const muzzleY = Constants.GROUND_Y + this.depth - 18;
    battle.spawnProjectile(new GoblinBolt(muzzleX, muzzleY, this.getAttackDamage(battle)));
  }

  getPose(time) {
    if (this.swing < 0.08) return [1, 2];
    if (this.swing < 0.2) return [1, 3];
    if (this.swing < 0.42) return [1, 4];
    if (this.swing < 0.55) return [1, 5];
    if (this.hasAttackSlot && this.cooldown <= 0.24) return [1, this.cooldown > 0.12 ? 0 : 1];
    if (this.moving) return [0, Math.floor(this.walk * 7.5) % 6];
    return [2, Math.floor(time * 5) % 6];
  }
}
