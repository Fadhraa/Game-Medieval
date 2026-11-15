"use strict";

class ArenaBoss extends Unit {
  static profiles = {
    rootGiant: {
      name: "Raksasa Akar",
      threshold: 0.65,
      hp: 4600,
      damage: 45,
      attack2Damage: 75,
      speed: 15,
      attackEvery: 2,
      reach: 31,
      skillInterval: 12,
      skillRange: 125,
      skillDamage: 50,
      stunDuration: 0.8,
      skillType: "physical",
      indicator: "#efac64",
      spriteSheet: {
        frameWidth: 96,
        frameHeight: 88,
        originX: 48,
        feetOrigin: 82,
        frames: 8,
        frameSeconds: {
          idle: 0.14,
          walk: 0.11,
          attack1: 0.075,
          attack2: 0.08,
          skill: 0.16,
          defeated: 0.12,
        },
      },
    },
    frostGolem: {
      name: "Golem Es",
      threshold: 0.7,
      hp: 5900,
      damage: 100,
      speed: 14,
      attackEvery: 1.9,
      reach: 34,
      skillInterval: 12,
      skillRange: 108,
      skillDamage: 140,
      skillType: "magic",
      indicator: "#96efff",
    },
  };

  constructor(kind) {
    const profile = ArenaBoss.profiles[kind];
    super({ ...profile, kind, side: -1, start: Constants.BASES.enemy.x - 8 });
    this.profile = profile;
    this.name = profile.name;
    this.cooldown = this.attackEvery;
    this.skillTimer = profile.skillInterval;
    this.actionAge = 0;
    this.action = null;
    this.walk = 0;
    this.attackHitDone = false;
    this.skillLatched = false;
    this.skillHitDone = false;
    this.pulledHeroes = [];
  }

  getRenderConfig() {
    const ss = this.profile.spriteSheet;
    if (ss) {
      return {
        ...super.getRenderConfig(),
        ...ss,
        nativeDirection: -1,
        barYOffset: 90,
        shadowWidth: 52,
      };
    }
    return { ...super.getRenderConfig(), barYOffset: 90 };
  }

  get defeatFinished() {
    if (this.hp !== 0) return false;
    const ss = this.profile.spriteSheet;
    return ss
      ? this.actionAge >= ss.frames * ss.frameSeconds.defeated
      : this.actionAge >= 0.85;
  }

  setAction(action) {
    this.action = action;
    this.actionAge = 0;
    this.moving = false;
    this.attackHitDone = false;
    if (action === "skill") {
      this.skillLatched = false;
      this.skillHitDone = false;
      this.pulledHeroes = [];
    }
  }

  takeDamage(amount, battle, options) {
    if (this.hp <= 0) return;
    super.takeDamage(amount, battle, options);
    if (this.hp === 0) {
      this.setAction("defeated");
      this.pulledHeroes = [];
      this.flash = 0;
    }
  }

  update(delta, battle) {
    if (this.kind === "rootGiant") {
      this.updateRootGiant(delta, battle);
      return;
    }

    const { opponent, distance, base, baseDistance } = this.findOpponent(
      battle,
      0,
    );
    const inReach = distance <= this.reach || baseDistance <= this.reach;
    this.flash = Math.max(0, this.flash - delta);
    this.moving = false;
    if (inReach) this.skillTimer = Math.max(0, this.skillTimer - delta);
    this.cooldown = Math.max(0, this.cooldown - delta);

    if (this.action) {
      const previous = this.actionAge;
      this.actionAge += delta;
      const special = this.action === "skill";
      const release = special ? 0.9 : 0.25;
      if (previous < release && this.actionAge >= release) {
        if (special) this.performSkill(battle);
        else if (inReach)
          this.performAttack(
            distance <= this.reach ? opponent : null,
            base,
            battle,
          );
      }
      if (this.actionAge >= (special ? 1.25 : 0.5)) this.action = null;
      return;
    }

    if (this.skillTimer === 0 && distance <= this.profile.skillRange) {
      this.action = "skill";
      this.actionAge = 0;
      this.skillTimer = this.profile.skillInterval;
    } else if (inReach) {
      if (this.cooldown === 0) {
        this.action = "attack";
        this.actionAge = 0;
        this.cooldown = this.attackEvery;
      }
    } else {
      this.moving = true;
      this.x += delta * this.speed * this.side;
    }
  }

  updateRootGiant(delta, battle) {
    const ss = this.profile.spriteSheet;
    const { opponent, distance, base, baseDistance } = this.findOpponent(
      battle,
      0,
    );
    const inReach = distance <= this.reach || baseDistance <= this.reach;

    this.flash = Math.max(0, this.flash - delta);
    this.moving = false;
    if (inReach || distance <= this.profile.skillRange) {
      this.skillTimer = Math.max(0, this.skillTimer - delta);
    }
    this.cooldown = Math.max(0, this.cooldown - delta);

    if (this.action) {
      this.updateRootGiantAction(delta, battle, ss);
      return;
    }

    if (this.skillTimer === 0 && distance <= this.profile.skillRange) {
      this.setAction("skill");
      this.skillTimer = this.profile.skillInterval;
      window.audioManager?.playHit("rootGiantSkill");
    } else if (inReach) {
      if (this.cooldown === 0) {
        this.setAction("attack1");
        this.cooldown = this.attackEvery;
      }
    } else {
      this.moving = true;
      this.x += delta * this.speed * this.side;
      this.walk += delta;
    }
  }

  updateRootGiantAction(delta, battle, ss) {
    this.actionAge += delta;

    if (this.action === "attack1" || this.action === "attack2") {
      const frameSec = ss.frameSeconds[this.action];
      const hitAt = 3 * frameSec;
      if (!this.attackHitDone && this.actionAge >= hitAt) {
        this.attackHitDone = true;
        const hitDamage =
          this.action === "attack2"
            ? (this.profile.attack2Damage ?? this.damage)
            : this.damage;
        const { opponent, distance, baseDistance } = this.findOpponent(
          battle,
          0,
        );
        const target = distance <= this.reach ? opponent : null;
        if (target) {
          target.takeDamage(hitDamage, battle, {
            type: "physical",
            heavy: this.action === "attack2",
          });
        } else if (baseDistance <= this.reach) {
          battle.damageBase(this.side, hitDamage);
        }
        window.audioManager?.playHit(
          this.action === "attack2" ? "rootGiantAttack2" : "rootGiantAttack1",
        );
      }

      if (this.actionAge >= ss.frames * frameSec) {
        if (this.action === "attack1") {
          this.setAction("attack2");
        } else {
          this.setAction(null);
        }
      }
      return;
    }

    if (this.action === "skill") {
      const latchAt = 0.36;
      const slamAt = 0.92;
      const totalDuration = ss.frames * ss.frameSeconds.skill;

      if (!this.skillLatched && this.actionAge >= latchAt) {
        this.skillLatched = true;
        const caught = battle.units
          .filter(
            (hero) =>
              hero.side === 1 &&
              hero.hp > 0 &&
              hero.kind !== "farmer" &&
              this.x - hero.x >= 0 &&
              this.x - hero.x <= this.profile.skillRange,
          )
          .sort((a, b) => b.x - a.x);

        this.pulledHeroes = caught.map((hero, idx) => ({
          unit: hero,
          startX: hero.x,
          targetX: Math.max(
            Constants.BASES.hero.x + 14,
            this.x - (22 + (idx % 3) * 4),
          ),
        }));

        for (const entry of this.pulledHeroes) {
          entry.unit.moving = false;
          entry.unit.stunnedUntil = Math.max(
            entry.unit.stunnedUntil,
            battle.elapsed + (slamAt - latchAt),
          );
        }
      }

      if (this.skillLatched && !this.skillHitDone) {
        const progress = Math.min(
          1,
          Math.max(0, (this.actionAge - latchAt) / (slamAt - latchAt)),
        );
        const ease = progress * progress * (3 - 2 * progress);
        for (const entry of this.pulledHeroes) {
          if (entry.unit.hp > 0) {
            entry.unit.x = entry.startX + (entry.targetX - entry.startX) * ease;
            entry.unit.moving = false;
          }
        }
      }

      if (!this.skillHitDone && this.actionAge >= slamAt) {
        this.skillHitDone = true;
        const impacted = new Set();
        for (const entry of this.pulledHeroes) {
          const hero = entry.unit;
          if (hero.hp <= 0) continue;
          hero.x = entry.targetX;
          hero.moving = false;
          hero.takeDamage(this.profile.skillDamage, battle, {
            type: this.profile.skillType,
            heavy: true,
          });
          if (hero.hp > 0) {
            hero.stunnedUntil = Math.max(
              hero.stunnedUntil,
              battle.elapsed + this.profile.stunDuration,
            );
          }
          impacted.add(hero);
        }

        for (const hero of battle.units) {
          if (
            impacted.has(hero) ||
            hero.side === this.side ||
            hero.hp <= 0 ||
            hero.kind === "farmer"
          )
            continue;
          const dist = (hero.x - this.x) * this.side;
          if (dist >= 0 && dist <= this.reach) {
            hero.takeDamage(this.profile.skillDamage, battle, {
              type: this.profile.skillType,
              heavy: true,
            });
            if (hero.hp > 0) {
              hero.stunnedUntil = Math.max(
                hero.stunnedUntil,
                battle.elapsed + this.profile.stunDuration,
              );
            }
          }
        }

        for (let i = 1; i <= 4; i++) {
          battle.spawnImpact(
            this.x + (this.side * this.profile.skillRange * i) / 5,
            true,
          );
        }
      }

      if (this.actionAge >= totalDuration) {
        this.pulledHeroes = [];
        this.setAction(null);
      }
    }
  }

  performSkill(battle) {
    const { skillRange, skillDamage, skillType } = this.profile;
    for (const hero of battle.units) {
      const distance = (hero.x - this.x) * this.side;
      if (
        hero.side === this.side ||
        hero.hp <= 0 ||
        hero.kind === "farmer" ||
        distance < 0 ||
        distance > skillRange
      )
        continue;
      hero.takeDamage(skillDamage, battle, { type: skillType, heavy: true });
      if (skillType === "magic")
        hero.slowedUntil = Math.max(hero.slowedUntil, battle.elapsed + 3);
    }
    for (let i = 1; i <= 3; i++)
      battle.spawnImpact(this.x + (this.side * skillRange * i) / 4, true);
    window.audioManager?.playHit("minotaur");
  }

  getPose(time) {
    const ss = this.profile.spriteSheet;
    if (!ss) return [0, 0];
    const rows = {
      idle: 0,
      walk: 1,
      attack1: 2,
      attack2: 3,
      skill: 4,
      defeated: 5,
    };
    if (this.action) {
      const frameSec = ss.frameSeconds[this.action] ?? 0.1;
      const frame = Math.min(
        ss.frames - 1,
        Math.floor(this.actionAge / frameSec),
      );
      return [rows[this.action], frame];
    }
    if (this.moving) {
      return [
        rows.walk,
        Math.floor(this.walk / ss.frameSeconds.walk) % ss.frames,
      ];
    }
    return [rows.idle, Math.floor(time / ss.frameSeconds.idle) % ss.frames];
  }

  drawRootPull(ctx, ground, time, rootSheet) {
    const feet = ground + this.depth;
    const bossX = Math.round(this.x);
    const maxX = bossX - this.profile.skillRange;
    const age = this.actionAge;

    ctx.save();
    // 1) Telegraph / underground root eruption along ground up to 125px in front (Wizard max reach)
    const reachProgress = age < 0.36 ? Math.min(1, age / 0.32) : 1;
    const tipX = Math.round(
      bossX - 18 - (this.profile.skillRange - 18) * reachProgress,
    );
    const alpha = age > 0.96 ? Math.max(0, 1 - (age - 0.96) / 0.32) : 0.92;
    ctx.globalAlpha = alpha;

    const hasRootSprite =
      rootSheet?.complete &&
      rootSheet.naturalWidth >= 192 &&
      rootSheet.naturalHeight >= 96;

    if (hasRootSprite) {
      const fw = 48;
      const fh = 32;
      const col = Math.floor(time * 12) % 4;
      ctx.imageSmoothingEnabled = false;

      // Ground braided root tether extending from boss toward spear tip
      const cableStartX = tipX + 30;
      const cableEndX = bossX - 16;
      if (cableEndX > cableStartX && age < 0.96) {
        let curX = cableStartX;
        let idx = 0;
        while (curX < cableEndX) {
          const seg = Math.min(fw, cableEndX - curX);
          const tileCol = (col + idx) % 4;
          ctx.drawImage(
            rootSheet,
            tileCol * fw,
            fh,
            seg,
            fh,
            Math.round(curX),
            Math.round(feet - 20),
            seg,
            fh,
          );
          curX += seg;
          idx++;
        }
      }

      // Row 0: Erupting Root Spear Head facing LEFT
      if (age < 0.85) {
        ctx.drawImage(
          rootSheet,
          col * fw,
          0,
          fw,
          fh,
          Math.round(tipX - 6),
          Math.round(feet - 28),
          fw,
          fh,
        );
      }

      // 2) Taut pulling root cables + root bindings around each latched hero during yank
      if (age >= 0.36 && age <= 1.05) {
        const handX = bossX - 20;
        const handY = Math.round(feet - 22);
        for (const entry of this.pulledHeroes) {
          const hero = entry.unit;
          if (hero.hp <= 0) continue;
          const heroFeet = ground + (hero.depth ?? 0);
          const hx = Math.round(hero.x);
          const hy = Math.round(heroFeet - 8);
          const dx = handX - hx;
          const dy = handY - hy;
          const dist = Math.hypot(dx, dy);

          if (dist > 4) {
            ctx.save();
            ctx.translate(hx, hy);
            ctx.rotate(Math.atan2(dy, dx));
            ctx.imageSmoothingEnabled = false;
            let drawn = 0;
            let tileIdx = 0;
            while (drawn < dist) {
              const seg = Math.min(fw, dist - drawn);
              const tileCol = (col + tileIdx) % 4;
              ctx.drawImage(
                rootSheet,
                tileCol * fw,
                fh,
                Math.max(1, Math.round(seg)),
                fh,
                Math.round(drawn),
                -16,
                Math.ceil(seg),
                fh,
              );
              drawn += seg;
              tileIdx++;
            }
            ctx.restore();
          }

          // Row 2: Entangling Hero Root Snare Coils
          const snareCol = (col + (Math.abs(hx) % 4)) % 4;
          ctx.drawImage(
            rootSheet,
            snareCol * fw,
            fh * 2,
            fw,
            fh,
            Math.round(hero.x - 24),
            Math.round(heroFeet - 26),
            fw,
            fh,
          );
        }
      }
    } else {
      // Procedural fallback if root-giant-roots.png has not loaded yet
      ctx.fillStyle = "#3c2618";
      ctx.fillRect(tipX, Math.round(feet - 3), bossX - 16 - tipX, 4);
      ctx.fillStyle = "#6e4728";
      ctx.fillRect(tipX, Math.round(feet - 2), bossX - 16 - tipX, 2);

      const pulseShift = Math.floor(time * 16) % 8;
      for (let sx = bossX - 22; sx >= tipX; sx -= 9) {
        const spikeH = 3 + (Math.abs(sx + pulseShift) % 5 === 0 ? 3 : 1);
        ctx.fillStyle = "#52341e";
        ctx.fillRect(sx, Math.round(feet - spikeH - 2), 3, spikeH);
        ctx.fillStyle = "#91b03e";
        ctx.fillRect(sx + 1, Math.round(feet - spikeH - 3), 2, 2);
        if ((sx + pulseShift) % 18 === 0) {
          ctx.fillStyle = "#a8f466";
          ctx.fillRect(sx, Math.round(feet - spikeH - 4), 2, 1);
        }
      }

      if (age >= 0.36 && age <= 1.05) {
        const handX = bossX - 20;
        const handY = Math.round(feet - 22);
        for (const entry of this.pulledHeroes) {
          const hero = entry.unit;
          if (hero.hp <= 0) continue;
          const hx = Math.round(hero.x);
          const hy = Math.round(ground + (hero.depth ?? 0) - 6);
          const steps = Math.max(6, Math.round(Math.abs(handX - hx) / 6));
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const rx = Math.round(hx + (handX - hx) * t);
            const sag = Math.round(
              Math.sin(t * Math.PI) * (age < 0.72 ? 4 : 1),
            );
            const ry = Math.round(hy + (handY - hy) * t + sag);
            ctx.fillStyle = "#3a2416";
            ctx.fillRect(rx - 1, ry - 1, 4, 3);
            ctx.fillStyle = i % 3 === 0 ? "#8faa3c" : "#784c2c";
            ctx.fillRect(rx, ry, 3, 2);
          }
          ctx.fillStyle = "#4e311d";
          ctx.fillRect(hx - 7, hy - 3, 14, 5);
          ctx.fillStyle = "#8faa3c";
          ctx.fillRect(hx - 6, hy - 2, 12, 2);
          ctx.fillStyle = "#a8f466";
          ctx.fillRect(hx - 2, hy - 4, 4, 1);
        }
      }
    }

    // Subtle ground range marker at the outer 125px edge during windup
    if (age < 0.38) {
      ctx.fillStyle = this.profile.indicator;
      ctx.globalAlpha = 0.45 + Math.sin(time * 24) * 0.2;
      ctx.fillRect(maxX, Math.round(feet - 1), bossX - maxX, 2);
    }
    ctx.restore();
  }

  draw(ctx, ground, time, sheet, rootSheet) {
    const feet = ground + this.depth;
    const x = Math.round(this.x);
    const ss = this.profile.spriteSheet;

    if (
      ss &&
      sheet?.complete &&
      sheet.naturalWidth >= ss.frameWidth * ss.frames
    ) {
      const cfg = this.getRenderConfig();
      const [row, frame] = this.getPose(time);

      // Ground shadow
      ctx.fillStyle = "#494d34";
      ctx.fillRect(
        Math.round(this.x - cfg.shadowWidth / 2),
        Math.round(feet - 2),
        cfg.shadowWidth,
        3,
      );

      if (this.action === "skill") {
        this.drawRootPull(ctx, ground, time, rootSheet);
      }

      ctx.save();
      ctx.translate(x, Math.round(feet));
      ctx.imageSmoothingEnabled = false;
      if (this.flash > 0) ctx.filter = "brightness(1.55)";
      ctx.drawImage(
        sheet,
        frame * ss.frameWidth,
        row * ss.frameHeight,
        ss.frameWidth,
        ss.frameHeight,
        -ss.originX,
        -ss.feetOrigin,
        ss.frameWidth,
        ss.frameHeight,
      );
      ctx.restore();
      return;
    }

    if (this.action === "skill") {
      ctx.save();
      ctx.globalAlpha =
        this.actionAge < 0.9 ? 0.42 + Math.sin(time * 22) * 0.2 : 0.72;
      ctx.fillStyle = this.profile.indicator;
      ctx.fillRect(
        x - this.profile.skillRange,
        feet - 3,
        this.profile.skillRange,
        4,
      );
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, feet);
    if (this.action === "defeated") {
      const progress = Math.min(1, this.actionAge / 0.85);
      ctx.rotate(-0.35 * progress);
      ctx.scale(1, 1 - 0.52 * progress);
    } else if (this.action === "attack") {
      ctx.rotate(-Math.sin(Math.PI * Math.min(1, this.actionAge / 0.5)) * 0.15);
    } else if (this.moving) {
      ctx.translate(0, -Math.abs(Math.sin(time * 10)) * 3);
      ctx.rotate(Math.sin(time * 10) * 0.035);
    }
    if (this.flash > 0) ctx.filter = "brightness(1.55)";
    if (sheet?.naturalWidth) {
      const height = this.kind === "frostGolem" ? 82 : 76;
      const width = Math.round(
        (height * sheet.naturalWidth) / sheet.naturalHeight,
      );
      ctx.drawImage(sheet, -Math.round(width / 2), -height, width, height);
    } else {
      this.drawProcedural(ctx, 0, 0);
    }
    ctx.restore();
  }

  drawHealth(ctx, ground) {
    if (!this.hp) return;
    const x = Math.round(this.x);
    const y = ground + this.depth - 96;
    ctx.save();
    ctx.fillStyle = "#241419";
    ctx.fillRect(x - 41, y, 82, 7);
    ctx.fillStyle = "#e15355";
    ctx.fillRect(x - 39, y + 2, Math.ceil((78 * this.hp) / this.maxHp), 3);
    ctx.textAlign = "center";
    ctx.font = "bold 9px monospace";
    ctx.strokeStyle = "#231a20";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#fff0db";
    ctx.strokeText(this.name, x, y - 3);
    ctx.fillText(this.name, x, y - 3);
    ctx.restore();
  }
}
