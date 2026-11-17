"use strict";

class ArenaBoss extends Unit {
  static skillWarningDuration = 3;

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
      skillReleaseAt: 0.36,
      skillWarning: "Tarikan Akar",
      magicResistance: 0.16,
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
      hp: 5000,
      damage: 45,
      speed: 14,
      attackEvery: 1.5,
      reach: 34,
      basicTargets: 3,
      skillInterval: 17,
      skillRange: 108,
      skillDamage: 140,
      skillType: "magic",
      skillReleaseAt: 0.48,
      skillWarning: "Frost Nova",
      physicalResistance: 0.10,
      skillSpread: 0.5,
      slowDuration: 3,
      freezeStacks: 3,
      freezeDuration: 1.5,
      freezeDamage: 200,
      indicator: "#70b2ff",
      spriteSheet: {
        frameWidth: 132,
        frameHeight: 116,
        originX: 76,
        feetOrigin: 104,
        frames: 6,
        frameSeconds: {
          idle: 0.16,
          walk: 0.14,
          attack1: 0.09,
          skill: 0.24,
          defeated: 0.15,
        },
      },
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
    this.novaHits = new Set();
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

  get skillWarningActive() {
    return this.action === "skill" && this.actionAge < ArenaBoss.skillWarningDuration;
  }

  get skillStartX() {
    return this.x - this.profile.skillRange;
  }

  skillAnimationAge(age = this.actionAge) {
    const windupHold = ArenaBoss.skillWarningDuration - this.profile.skillReleaseAt;
    return Math.max(0, age - windupHold);
  }

  takeDamage(amount, battle, { type = "physical", heavy = false } = {}) {
    if (this.hp <= 0) return;
    const resistance = type === "magic" ? this.profile.magicResistance
      : type === "physical" ? this.profile.physicalResistance
      : 0;
    super.takeDamage(amount * (1 - (resistance ?? 0)), battle, { heavy });
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

    this.updateFrostGolem(delta, battle);
  }

  updateFrostGolem(delta, battle) {
    const { distance, baseDistance } = this.findOpponent(battle, 0);
    const inReach = distance <= this.reach || baseDistance <= this.reach;
    const { skillRange, skillInterval, spriteSheet } = this.profile;
    const availableTargets = this.frostTargets(battle, skillRange, false);
    this.flash = Math.max(0, this.flash - delta);
    this.moving = false;
    if (availableTargets.length || inReach) this.skillTimer = Math.max(0, this.skillTimer - delta);
    this.cooldown = Math.max(0, this.cooldown - delta);

    if (this.action) {
      const previous = this.actionAge;
      const frameSeconds = spriteSheet.frameSeconds[this.action];
      this.actionAge += delta;
      if (this.action === "skill") {
        if (!this.skillWarningActive) this.updateFrostNova(battle, previous);
        if (this.skillAnimationAge() >= frameSeconds * spriteSheet.frames) this.setAction(null);
      } else {
        if (previous < frameSeconds * 3 && this.actionAge >= frameSeconds * 3) {
          this.hitWithFrostPunch(battle, baseDistance);
        }
        if (this.actionAge >= frameSeconds * spriteSheet.frames) this.setAction(null);
      }
      return;
    }

    if (this.cooldown <= 1e-8 && this.skillTimer <= 1e-8 && availableTargets.length) {
      this.setAction("skill");
      this.novaHits.clear();
      this.skillTimer = skillInterval;
      this.cooldown = this.attackEvery;
    } else if (inReach) {
      if (this.cooldown <= 1e-8) {
        this.setAction("attack1");
        this.cooldown = this.attackEvery;
      }
    } else {
      this.moving = true;
      this.x += delta * this.speed * this.side;
      this.walk += delta;
    }
  }

  frostTargets(battle, range, includeFarmer = true) {
    return battle.units.filter(unit => {
      const ahead = (unit.x - this.x) * this.side;
      return unit.side === 1 && unit.hp > 0 && ahead >= 0 && ahead <= range &&
        (includeFarmer || unit.kind !== "farmer");
    });
  }

  hitWithFrostPunch(battle, baseDistance) {
    const targets = this.frostTargets(battle, this.reach)
      .sort((a, b) => b.x - a.x)
      .slice(0, this.profile.basicTargets);
    if (!targets.length && baseDistance <= this.reach) battle.damageBase(this.side, this.damage);
    for (const hero of targets) {
      hero.takeDamage(this.damage, battle, { type: "physical" });
      this.applyFrost(hero, 1, battle);
    }
    if (targets.length || baseDistance <= this.reach) window.audioManager?.playHit("minotaur");
  }

  frostNovaProgress(age) {
    const elapsed = age - ArenaBoss.skillWarningDuration;
    return Math.max(0, Math.min(1, elapsed / this.profile.skillSpread));
  }

  frostNovaRange(age) {
    return this.profile.skillRange * (1 - (1 - this.frostNovaProgress(age)) ** 3);
  }

  updateFrostNova(battle, previousAge) {
    const release = ArenaBoss.skillWarningDuration;
    if (previousAge >= release + this.profile.skillSpread) return;
    if (previousAge < release) window.audioManager?.playHit("minotaur");
    const previousRange = this.frostNovaRange(previousAge);
    const { skillDamage, skillType, slowDuration } = this.profile;
    for (const hero of this.frostTargets(battle, this.frostNovaRange(this.actionAge), false)) {
      if (this.novaHits.has(hero) || (hero.x - this.x) * this.side < previousRange) continue;
      this.novaHits.add(hero);
      hero.takeDamage(skillDamage, battle, { type: skillType, heavy: true });
      hero.slowedUntil = Math.max(hero.slowedUntil, battle.elapsed + slowDuration);
      this.applyFrost(hero, 2, battle);
    }
  }

  applyFrost(hero, stacks, battle) {
    if (hero.kind === "farmer" || hero.hp <= 0 || hero.frozenUntil > battle.elapsed) return;
    hero.frostStacks += stacks;
    if (hero.frostStacks < this.profile.freezeStacks) return;
    hero.frostStacks = 0;
    hero.frozenUntil = battle.elapsed + this.profile.freezeDuration;
    hero.moving = false;
    battle.frostPrisons.push(new FrostPrison(hero, battle.elapsed, hero.frozenUntil));
    hero.takeDamage(this.profile.freezeDamage, battle, { type: "magic", heavy: true });
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
      const latchAt = this.profile.skillReleaseAt;
      const slamAt = 0.92;
      const totalDuration = ss.frames * ss.frameSeconds.skill;
      const age = this.skillAnimationAge();

      if (!this.skillLatched && !this.skillWarningActive) {
        this.skillLatched = true;
        const caught = battle.units
          .filter(
            (hero) =>
              hero.side === 1 &&
              hero.hp > 0 &&
              hero.kind !== "farmer" &&
              hero.x >= this.skillStartX &&
              hero.x <= this.x,
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
            battle.elapsed + Math.max(0, slamAt - age),
          );
        }
      }

      if (this.skillLatched && !this.skillHitDone) {
        const progress = Math.min(
          1,
          Math.max(0, (age - latchAt) / (slamAt - latchAt)),
        );
        const ease = progress * progress * (3 - 2 * progress);
        for (const entry of this.pulledHeroes) {
          if (entry.unit.hp > 0) {
            entry.unit.x = entry.startX + (entry.targetX - entry.startX) * ease;
            entry.unit.moving = false;
          }
        }
      }

      if (!this.skillHitDone && age >= slamAt) {
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

      if (age >= totalDuration) {
        this.pulledHeroes = [];
        this.setAction(null);
      }
    }
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
    if (this.kind === "frostGolem") {
      rows.skill = 3;
      rows.defeated = 4;
    }
    if (this.action) {
      const frameSec = ss.frameSeconds[this.action] ?? 0.1;
      const age = this.action === "skill" ? this.skillAnimationAge() : this.actionAge;
      const frame = Math.min(
        ss.frames - 1,
        Math.floor(age / frameSec),
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
    const age = this.skillAnimationAge();
    if (age <= 0) return;

    ctx.save();
    // The root erupts in front of the boss just before it snares units.
    const reachProgress = Math.min(1, age / 0.32);
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
      if (this.skillLatched && age <= 1.05) {
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

      if (this.skillLatched && age <= 1.05) {
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

    ctx.restore();
  }

  drawFrostNova(ctx, feet, novaSheet) {
    const x = Math.round(this.x);
    if (this.skillWarningActive || !novaSheet?.naturalWidth) return;
    const range = this.profile.skillRange;
    const visualProgress = Math.min(1, (this.actionAge - ArenaBoss.skillWarningDuration) / 0.8);
    const frame = Math.min(19, Math.floor(visualProgress * 20));
    const reached = Math.ceil(this.frostNovaRange(this.actionAge));
    if (reached === 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1 - Math.max(0, visualProgress - 0.75) * 4;
    ctx.drawImage(novaSheet, (frame % 5) * range + range - reached,
      Math.floor(frame / 5) * 59, reached, 59,
      x - reached, Math.round(feet - 47), reached, 59);
    ctx.restore();
  }

  draw(ctx, ground, time, sheet, effectSheet) {
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
        if (this.kind === "frostGolem") this.drawFrostNova(ctx, feet, effectSheet);
        else this.drawRootPull(ctx, ground, time, effectSheet);
      }

      ctx.save();
      ctx.translate(x, Math.round(feet));
      ctx.imageSmoothingEnabled = false;
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

    ctx.save();
    ctx.translate(x, feet);
    if (this.action === "defeated") {
      const progress = Math.min(1, this.actionAge / 0.85);
      ctx.rotate(-0.35 * progress);
      ctx.scale(1, 1 - 0.52 * progress);
    } else if (this.action === "attack1") {
      ctx.rotate(-Math.sin(Math.PI * Math.min(1, this.actionAge / 0.5)) * 0.15);
    } else if (this.moving) {
      ctx.translate(0, -Math.abs(Math.sin(time * 10)) * 3);
      ctx.rotate(Math.sin(time * 10) * 0.035);
    }
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


class FrostPrison {
  static shatterDuration = 0.45;

  constructor(hero, startedAt, frozenUntil) {
    this.x = hero.x;
    this.depth = hero.depth;
    this.startedAt = startedAt;
    this.frozenUntil = frozenUntil;
    this.endsAt = frozenUntil + FrostPrison.shatterDuration;
  }

  draw(ctx, ground, elapsed, sheet) {
    if (!sheet?.naturalWidth || elapsed >= this.endsAt) return;
    const frame = elapsed < this.frozenUntil
      ? Math.min(23, Math.floor(24 * (elapsed - this.startedAt) / (this.frozenUntil - this.startedAt)))
      : 24 + Math.min(7, Math.floor(8 * (elapsed - this.frozenUntil) / FrostPrison.shatterDuration));
    ctx.drawImage(sheet, (frame % 8) * 110, Math.floor(frame / 8) * 75, 110, 75,
      Math.round(this.x - 41), Math.round(ground + this.depth - 50), 82, 57);
  }
}
