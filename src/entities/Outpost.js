"use strict";

class OutpostArrow extends Projectile {
  constructor(x, y, target, damage, side) {
    super(x, y, 270, damage, side, 1.5);
    this.target = target;
    const dx = target.x - x;
    const dy = (Constants.GROUND_Y + (target.depth ?? 0) - 16) - y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;
  }

  update(delta, battle) {
    this.x += this.vx * delta;
    this.y += this.vy * delta;
    this.life -= delta;

    // Retarget check against live opposing non-farmer units along the arrow path
    const hit = battle.units.find(
      (unit) =>
        unit.side !== this.side &&
        unit.kind !== "farmer" &&
        unit.hp > 0 &&
        unit.active !== false &&
        !unit.isUntargetable &&
        Math.abs(unit.x - this.x) <= 10 &&
        Math.abs((Constants.GROUND_Y + (unit.depth ?? 0) - 15) - this.y) <= 18
    );

    if (hit) {
      hit.takeDamage(this.damage, battle, { type: "physical" });
      for (let i = 0; i < 4; i++) {
        battle.spawnParticle(
          this.x,
          this.y,
          (Math.random() - 0.5) * 40,
          -20 - Math.random() * 25,
          0.22,
          this.side === 1 ? "#9bf2d8" : "#ff9b75",
          1.5
        );
      }
      window.audioManager?.playHit("lynceHit");
      this.active = false;
      return;
    }

    if (this.y >= Constants.GROUND_Y + 8 || this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    const angle = Math.atan2(this.vy, this.vx);
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.rotate(angle);
    ctx.fillStyle = "#5c3d22";
    ctx.fillRect(-5, -1, 8, 2);
    ctx.fillStyle = this.side === 1 ? "#f1d695" : "#e86e56";
    ctx.fillRect(3, -1.5, 3, 3);
    ctx.fillStyle = this.side === 1 ? "#7aaf9b" : "#bd6248";
    ctx.fillRect(-6, -2, 2, 4);
    ctx.restore();
  }
}

class Outpost {
  static drawScale = 1.28;
  static backOffsetY = 13;
  static sheetConfig = {
    0: { key: "outpostNeutral", frameWidth: 42, frameHeight: 92 },
    1: { key: "outpostHero", frameWidth: 41, frameHeight: 92 },
    [-1]: { key: "outpostEnemy", frameWidth: 47, frameHeight: 92 }
  };

  constructor() {
    this.x = Constants.OUTPOST.x;
    this.owner = 0;       // 0 = neutral, 1 = hero, -1 = enemy
    this.progress = 0;    // -1 (enemy) .. 0 (neutral) .. +1 (hero)
    this.contested = false;
    this.capturingSide = 0;
    this.attackCooldown = 0;
  }

  shouldHoldToCapture(unit) {
    if (!unit || unit.kind === "farmer" || unit.hp <= 0 || unit.active === false) return false;
    if (this.owner === unit.side || this.contested) return false;
    if (unit.side === 1) {
      return unit.x >= this.x - 24 && unit.x <= this.x + Constants.OUTPOST.captureRadius;
    }
    return unit.x <= this.x + 24 && unit.x >= this.x - Constants.OUTPOST.captureRadius;
  }

  update(delta, battle) {
    const cfg = Constants.OUTPOST;
    let heroCount = 0;
    let enemyCount = 0;

    for (const unit of battle.units) {
      if (unit.hp <= 0 || unit.active === false) continue;
      if (Math.abs(unit.x - this.x) > cfg.captureRadius) continue;
      if (unit.side === 1 && unit.kind !== "farmer") heroCount++;
      else if (unit.side === -1) enemyCount++;
    }

    if (heroCount > 0 && enemyCount > 0) {
      this.contested = true;
      this.capturingSide = 0;
    } else if (heroCount > 0) {
      this.contested = false;
      if (this.owner !== 1 || this.progress < 1) {
        this.capturingSide = 1;
        const speedMult = 1 + Math.min(2, heroCount - 1) * 0.25;
        const decaptureMult = this.owner === -1 ? 1.6 : 1;
        this.progress = Math.min(1, this.progress + (delta * speedMult * decaptureMult) / cfg.captureSeconds);
        if (this.owner === -1 && this.progress >= 0) {
          this.owner = 0;
        }
        if (this.progress >= 1 && this.owner !== 1) {
          this.owner = 1;
          this.attackCooldown = 0.25;
          this.spawnCaptureBurst(battle, 1);
        }
      } else {
        this.capturingSide = 0;
      }
    } else if (enemyCount > 0) {
      this.contested = false;
      if (this.owner !== -1 || this.progress > -1) {
        this.capturingSide = -1;
        const speedMult = 1 + Math.min(2, enemyCount - 1) * 0.25;
        const decaptureMult = this.owner === 1 ? 1.6 : 1;
        this.progress = Math.max(-1, this.progress - (delta * speedMult * decaptureMult) / cfg.captureSeconds);
        if (this.owner === 1 && this.progress <= 0) {
          this.owner = 0;
        }
        if (this.progress <= -1 && this.owner !== -1) {
          this.owner = -1;
          this.attackCooldown = 0.25;
          this.spawnCaptureBurst(battle, -1);
        }
      } else {
        this.capturingSide = 0;
      }
    } else {
      this.contested = false;
      this.capturingSide = 0;
    }

    if (this.owner !== 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - delta);
      if (this.attackCooldown <= 0) {
        const target = this.findArrowTarget(battle, cfg.attackRange);
        if (target) {
          const muzzleY = Constants.GROUND_Y - Outpost.backOffsetY - Math.round(68 * Outpost.drawScale);
          battle.spawnProjectile(
            new OutpostArrow(this.x, muzzleY, target, cfg.damage, this.owner)
          );
          this.attackCooldown = cfg.attackInterval;
        }
      }
    }
  }

  findArrowTarget(battle, range) {
    let best = null;
    let bestDist = Infinity;
    for (const unit of battle.units) {
      if (unit.side === this.owner || unit.kind === "farmer" || unit.hp <= 0 || unit.active === false || unit.isUntargetable) {
        continue;
      }
      const dist = Math.abs(unit.x - this.x);
      if (dist <= range && dist < bestDist) {
        best = unit;
        bestDist = dist;
      }
    }
    return best;
  }

  spawnCaptureBurst(battle, side) {
    const colorA = side === 1 ? "#78f0c8" : "#ff8866";
    const colorB = side === 1 ? "#ffdf9c" : "#d94f3d";
    for (let i = 0; i < 14; i++) {
      battle.spawnParticle(
        this.x + (Math.random() - 0.5) * 26,
        Constants.GROUND_Y - 20 - Math.random() * 55,
        (Math.random() - 0.5) * 55,
        -35 - Math.random() * 45,
        0.45 + Math.random() * 0.25,
        i % 2 === 0 ? colorA : colorB,
        2
      );
    }
    window.audioManager?.playHit("baseSkill");
  }

  draw(ctx, ground, time, sprites) {
    const cfg = Constants.OUTPOST;
    const sheetInfo = Outpost.sheetConfig[this.owner] ?? Outpost.sheetConfig[0];
    const sprite = sprites[sheetInfo.key];

    // Subtle ground capture zone boundary
    const zoneColor = this.contested
      ? "rgba(255, 207, 117, 0.55)"
      : this.owner === 1
      ? "rgba(107, 194, 168, 0.48)"
      : this.owner === -1
      ? "rgba(218, 102, 76, 0.48)"
      : "rgba(232, 224, 198, 0.38)";
    const leftX = Math.round(this.x - cfg.captureRadius);
    const rightX = Math.round(this.x + cfg.captureRadius);
    ctx.save();
    ctx.strokeStyle = zoneColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(leftX, ground + 2);
    ctx.lineTo(rightX, ground + 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = zoneColor;
    ctx.fillRect(leftX, ground - 2, 2, 5);
    ctx.fillRect(rightX - 1, ground - 2, 2, 5);

    const drawW = Math.round(sheetInfo.frameWidth * Outpost.drawScale);
    const drawH = Math.round(sheetInfo.frameHeight * Outpost.drawScale);
    const baseY = ground - Outpost.backOffsetY;
    const topY = baseY - drawH;

    if (sprite?.complete && sprite.naturalWidth) {
      const frame = Math.floor(time * 6) % 4;
      const fw = sheetInfo.frameWidth;
      const fh = sheetInfo.frameHeight;
      ctx.drawImage(
        sprite,
        frame * fw,
        0,
        fw,
        fh,
        Math.round(this.x - drawW / 2),
        topY,
        drawW,
        drawH
      );
    }

    // Capture progress bar & status tag above the tower
    const showBar = this.contested || this.capturingSide !== 0 || (this.owner === 0 && Math.abs(this.progress) > 0.01);
    const barW = 36;
    const barH = 4;
    const barX = Math.round(this.x - barW / 2);
    const barY = topY - 7;
    if (showBar) {
      ctx.fillStyle = "rgba(24, 28, 22, 0.85)";
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      const fillRatio = Math.abs(this.progress);
      ctx.fillStyle = this.contested
        ? "#ffcf75"
        : this.progress >= 0
        ? "#6fd4b5"
        : "#e36c54";
      ctx.fillRect(barX, barY, Math.round(barW * fillRatio), barH);
    }

    let label = "";
    let labelColor = "#e7dec4";
    if (this.contested) {
      label = "Diperebutkan!";
      labelColor = "#ffcf75";
    } else if (this.capturingSide === 1) {
      label = "Direbut Hero...";
      labelColor = "#92f2d2";
    } else if (this.capturingSide === -1) {
      label = "Direbut Monster...";
      labelColor = "#ff9f87";
    } else if (this.owner === 1) {
      label = "Pos Kerajaan";
      labelColor = "#92f2d2";
    } else if (this.owner === -1) {
      label = "Pos Goblin";
      labelColor = "#ff9f87";
    }
    if (label) {
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#1c2019";
      ctx.lineWidth = 2;
      const labelY = showBar ? barY - 4 : barY + 2;
      ctx.strokeText(label, Math.round(this.x), labelY);
      ctx.fillStyle = labelColor;
      ctx.fillText(label, Math.round(this.x), labelY);
    }
    ctx.restore();
  }
}

window.OutpostArrow = OutpostArrow;
window.Outpost = Outpost;
