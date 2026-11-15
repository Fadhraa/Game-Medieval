"use strict";

/**
 * Healer - Base role class for healing units.
 * Extends Unit and provides ally-targeting, heal cooldowns,
 * and healing effects before falling back to attack/movement.
 */
class Healer extends Unit {
  constructor(config = {}) {
    super(config);

    this.healSpeed = config.healSpeed ?? 2.25;
    this.healCooldown = 0;
    this.healPower = config.healPower ?? 0.05;
    this.healTarget = null;
    this.isHealing = false;
    this.healReach = config.healReach ?? config.reach ?? 155; // Sama dengan jarak serangan
  }

  /**
   * Finds an allied hero ahead of this healer that needs healing.
   * Prioritizes the ally with the lowest current HP ratio (hp / maxHp).
   * Bisa mengheal siapa saja (ksatria, wizard, atau sesama kira) yang ada di depannya dalam jangkauan.
   */
  findHealTarget(battle) {
    let bestTarget = null;
    let lowestRatio = 1.0;

    for (const other of battle.units) {
      if (other === this || other.hp <= 0) continue;
      if (other.side !== this.side) continue; // Only allies
      if (other.hp >= other.maxHp) continue; // Already at full health

      // Must be positioned ahead in the direction of march within heal reach
      const ahead = (other.x - this.x) * this.side;
      if (ahead > 0 && ahead <= this.healReach) {
        const ratio = other.hp / other.maxHp;
        if (ratio < lowestRatio) {
          lowestRatio = ratio;
          bestTarget = other;
        }
      }
    }

    return bestTarget;
  }

  healAmount(target) {
    return target.maxHp * this.healPower;
  }

  /**
   * Applies healing to the target, triggers visual aura & particles,
   * and plays the healing audio effect.
   */
  performHeal(target, battle) {
    if (!target || !target.receiveHealing(this.healAmount(target), battle)) return;

    // Spawn green/cyan healing aura under the target's feet
    const targetFeet = Constants.GROUND_Y + (target.depth ?? 0);
    battle.spawnHealingAura(target);
    window.audioManager?.playHit("heal");

    // Spawn healing sparkles around target
    for (let i = 0; i < 7; i++) {
      battle.spawnParticle(
        target.x + (Math.random() - 0.5) * 22,
        targetFeet - 8 - Math.random() * 24,
        (Math.random() - 0.5) * 22,
        -18 - Math.random() * 24,
        0.45 + Math.random() * 0.25,
        i % 2 ? "#5ce8d8" : "#bbf5ff",
        1
      );
    }
  }

  update(delta, battle) {
    if (this.hp <= 0) {
      this.active = false;
      return;
    }

    const { attack } = this.getSpeedMultipliers(battle);
    this.healCooldown = Math.max(0, this.healCooldown - delta * attack);

    // Priority 1: Check if an ally ahead needs healing
    const targetToHeal = this.findHealTarget(battle);

    if (targetToHeal) {
      this.flash = Math.max(0, this.flash - delta);
      this.swing += delta * attack;
      this.isHealing = true;
      this.healTarget = targetToHeal;
      this.moving = false;
      this.engaged = true;

      if (this.healCooldown === 0) {
        this.performHeal(targetToHeal, battle);
        this.healCooldown = this.healSpeed;
        this.swing = 0; // Trigger heal animation
      }
      return; // Skip walking and attacking while channeling heal
    }

    // Priority 2: No allies need heal -> attack monster or march forward
    this.isHealing = false;
    this.healTarget = null;

    super.update(delta, battle);
  }
}

window.Healer = Healer;
