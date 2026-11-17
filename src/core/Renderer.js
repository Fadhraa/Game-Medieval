"use strict";

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = Constants.CANVAS_WIDTH;
    this.height = Constants.CANVAS_HEIGHT;
    this.ground = Constants.GROUND_Y;
    this.pixelScale = 3;
    this.resizeView(this.width);

    this.sprites = {};
    this.tintedSprites = {
      poison: new Map(),
      flash: new Map(),
      poisonFlash: new Map(),
    };
    this.arenaCache = new Map();
    this.castleCanvas = null;
    this.campCanvas = null;
    this.readyUnits = null;
    this.sky = document.createElement("canvas");
    this.backdrop = document.createElement("canvas");
    for (const layer of [this.sky, this.backdrop]) {
      layer.width = Constants.WORLD_WIDTH;
      layer.height = this.height;
    }
    this.buildSky(this.sky.getContext("2d"));
    this.backdropDirty = true;
    this.loadSpriteSheets();

    this.previousMode = null;
    this.messages = {
      ready: [
        "Rebut Markas Goblin",
        "Panggil petani dengan 1 roti. Setorkan gandum di benteng untuk mendapatkan roti.",
        "Mulai Pertempuran",
        "Siap bertempur",
      ],
      paused: [
        "Pertempuran Dijeda",
        "Produksi roti dan pergerakan pasukan ikut berhenti.",
        "Lanjutkan",
        "Dijeda",
      ],
      won: [
        "Kerajaan Menang!",
        "Pasukanmu berhasil menghancurkan markas goblin.",
        "Main Lagi",
        "Menang",
      ],
      lost: [
        "Benteng Kerajaan Runtuh",
        "Goblin berhasil menghancurkan bentengmu.",
        "Coba Lagi",
        "Kalah",
      ],
      draw: [
        "Kedua Markas Runtuh",
        "Pertempuran berakhir imbang.",
        "Main Lagi",
        "Imbang",
      ],
    };
  }

  resizeView(width) {
    this.viewWidth = width;
    this.canvas.width = width * this.pixelScale;
    this.canvas.height = this.height * this.pixelScale;
  }

  loadSpriteSheets() {
    const urls = Constants.ASSETS.sprites;
    for (const [key, path] of Object.entries(urls)) {
      const img = new Image();
      img.addEventListener("load", () => {
        if (path.includes("/background/")) this.backdropDirty = true;
        this.renderIcons();
        this.onSpritesUpdated?.();
      });
      this.sprites[key] = img;
      img.src = path;
    }
  }

  rect(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }
  drawVolcanoOverlay(ctx, time) {
    const overlay = this.sprites.volcanoOverlay;
    if (!overlay?.naturalWidth) return;
    const frameWidth = 64;
    const frameHeight = 64;
    const frameCount = 4;
    const frame = Math.floor(time * 5) % frameCount;
    // Posisi kawah gunung berapi pada peta 1040×247 (bisa kamu geser sedikit kalau kurang pas)
    const destX = 688;
    const destY = 18;
    ctx.drawImage(
      overlay,
      frame * frameWidth,
      0,
      frameWidth,
      frameHeight,
      destX,
      destY,
      frameWidth,
      frameHeight,
    );
  }

  render(battle, time, cameraX = 0, uiState = null) {
    const ctx = this.ctx;
    ctx.setTransform(this.pixelScale, 0, 0, this.pixelScale, 0, 0);

    if (this.backdropDirty) {
      this.buildBackground(this.backdrop.getContext("2d"));
      this.backdropDirty = false;
    }

    ctx.imageSmoothingEnabled = false;
    const arena = battle.mode === "ready" ? null : this.sprites[battle.arena];
    if (!arena?.naturalWidth) {
      ctx.drawImage(this.sky, -Math.round(cameraX * 0.34), 0);
      this.drawSkySprites(ctx, time, cameraX);
    }

    ctx.save();
    ctx.translate(-Math.round(cameraX), 0);
    const arenaSource = arena?.naturalWidth
      ? this.getArenaBackdrop(arena)
      : this.backdrop;
    ctx.drawImage(arenaSource, 0, 0);
    if (battle.arena === "volcano") {
      this.drawVolcanoSkyEffects(ctx, time);
      this.drawVolcanoOverlay(ctx, time);
    }

    this.drawCastle(ctx, time);
    ctx.save();

    ctx.translate(Constants.WORLD_WIDTH - this.width, 0);
    this.drawCamp(ctx, time);
    ctx.restore();
    if (battle.mode !== "ready" && battle.outpost) {
      battle.outpost.draw(ctx, this.ground, time, this.sprites);
    }
    for (const [index, farmer] of battle.farmersByPlot.entries()) {
      this.drawFarm(ctx, farmer, Constants.FARM.plots[index].x);
    }
    if (battle.mode !== "ready" && battle.mudPits?.length) {
      this.drawSwampMudPits(ctx, battle, time);
    }

    if (battle.mode !== "ready") {
      if (battle.boss?.skillWarningActive)
        this.drawBossSkillWarning(ctx, battle.boss);
      this.drawGuardFlags(ctx, battle, time, uiState);
    }

    const healSheet = this.sprites.healingAura;
    for (const aura of battle.healingAuras) {
      aura.draw(ctx, healSheet, "back");
    }
    const witcherEffects = this.sprites.witcherEffects;
    for (const circle of battle.witcherCircles)
      circle.draw(ctx, witcherEffects);

    if (battle.mode === "ready" && !this.readyUnits) {
      const rk = new Knight();
      rk.x = 143;
      const rg = new Goblin();
      rg.x = Constants.BASES.enemy.x - 42;
      this.readyUnits = [rk, rg];
    }
    const units =
      battle.mode === "ready"
        ? this.readyUnits
        : [
            ...battle.units,
            ...(battle.boss?.hp === 0 ? [battle.boss] : []),
          ].sort((a, b) => a.depth - b.depth);

    const speedAuraSheet = this.sprites.baseSpeedAura;
    if (battle.mode !== "ready") {
      this.drawSelectionHighlights(ctx, battle, time);
    }
    for (const unit of units) {
      const frostBoss = unit.kind === "frostGolem";
      const baseSheet =
        frostBoss && this.sprites.frostGolemAnimation?.naturalWidth
          ? this.sprites.frostGolemAnimation
          : this.sprites[unit.kind];
      const sheet = this.getUnitSprite(baseSheet, unit);
      if (battle.hasBaseSpeedBuff(unit)) {
        this.drawBaseSpeedAura(ctx, unit, time, speedAuraSheet, "back");
      }
      if (unit instanceof Witcher) {
        unit.drawSummon(
          ctx,
          this.ground,
          time,
          this.sprites.minotaur,
          witcherEffects,
        );
      }
      const poseTime =
        unit.frozenUntil > battle.elapsed ? unit.frozenUntil : time;
      const effectSheet =
        unit instanceof GoblinQueen
          ? this.sprites.goblinQueenBuff
          : frostBoss
            ? this.sprites.frostNova
            : this.sprites.rootGiantRoots;
      if (unit.hasGoblinQueenBuff(battle))
        this.drawGoblinQueenBuff(ctx, unit, battle.elapsed);
      unit.draw(ctx, this.ground, poseTime, sheet, effectSheet);
      if (unit.inMud || unit.poisoned) {
        this.drawSwampMudDebuff(ctx, unit, time);
      }
      if (battle.hasBaseSpeedBuff(unit)) {
        this.drawBaseSpeedAura(ctx, unit, time, speedAuraSheet, "front");
      }
      if (unit instanceof Commander)
        unit.drawShieldImpact(ctx, this.ground, this.sprites.commanderImpact);
      if (unit.stunnedUntil > battle.elapsed) this.drawStun(ctx, unit, time);
      if (unit.frostStacks > 0) this.drawFrostStacks(ctx, unit);
    }
    if (battle.mode !== "ready") {
      this.drawSelectionBox(ctx, uiState);
    }

    for (const aura of battle.healingAuras) {
      aura.draw(ctx, healSheet, "front");
    }

    const fireballSheet = this.sprites.fireball;
    const lightningSheet = this.sprites.lightning;
    const goblinBoltSheet = this.sprites.goblinBolt;
    const lynceArrowSheet = this.sprites.lynceArrow;
    const lynceSkillArrowSheet = this.sprites.lynceSkillArrow;
    for (const projectile of battle.projectiles) {
      if (projectile instanceof LightningBolt) {
        projectile.draw(ctx, time, lightningSheet);
      } else if (projectile instanceof GoblinQueenMissile) {
        projectile.draw(
          ctx,
          time,
          this.sprites.goblinQueenMissile,
          this.sprites.goblinQueenImpact,
        );
      } else if (projectile instanceof WitcherBolt) {
        projectile.draw(ctx, time, witcherEffects);
      } else if (projectile instanceof GoblinBolt) {
        projectile.draw(ctx, time, goblinBoltSheet);
      } else if (projectile instanceof LynceSkillArrow) {
        projectile.draw(ctx, time, lynceSkillArrowSheet);
      } else if (projectile instanceof LynceArrow) {
        projectile.draw(ctx, time, lynceArrowSheet);
      } else {
        projectile.draw(ctx, time, fireballSheet);
      }
    }

    for (const burst of battle.bursts) {
      burst.draw(ctx, this.sprites[burst.spriteKey]);
    }
    for (const burst of battle.arrowBursts) {
      burst.draw(ctx, burst.skill ? lynceSkillArrowSheet : lynceArrowSheet);
    }
    for (const lb of battle.lightningBursts) {
      lb.draw(ctx, lightningSheet);
    }
    for (const prison of battle.frostPrisons) {
      prison.draw(ctx, this.ground, battle.elapsed, this.sprites.frostPrison);
    }
    for (const particle of battle.particles) {
      particle.draw(ctx);
    }
    for (const number of battle.combatNumbers) number.draw(ctx);
    if (battle.mode !== "ready") battle.boss?.drawHealth(ctx, this.ground);
    ctx.restore();
  }
  drawVolcanoOverlay(ctx, time) {
    const overlay = this.sprites.volcanoOverlay;
    if (!overlay?.naturalWidth) return;

    const frameWidth = 64;
    const frameHeight = 64;
    const frameCount = 4;
    const frame = Math.floor(time * 5) % frameCount;

    // Posisikan tepat di mulut kawah + gerak mengambang pelan
    const destX = 885 + Math.round(Math.sin(time * 1.4) * 3);
    const destY = 46 - Math.round((time * 8) % 10);

    ctx.drawImage(
      overlay,
      frame * frameWidth,
      0,
      frameWidth,
      frameHeight,
      destX,
      destY,
      frameWidth,
      frameHeight,
    );
  }

  drawVolcanoSkyEffects(ctx, time) {
    // 1. Gumpalan awan abu tipis bergerak pelan ke kiri di langit
    ctx.fillStyle = "#3b2c35";
    for (let i = 0; i < 6; i++) {
      const w = 72 + (i % 3) * 28;
      const speed = 6 + (i % 3) * 2.5;
      const x =
        Constants.WORLD_WIDTH -
        ((time * speed + i * 185) % (Constants.WORLD_WIDTH + w));
      const y = 20 + (i % 4) * 24;
      ctx.globalAlpha = 0.24;
      ctx.fillRect(Math.round(x), y, w, 6);
      ctx.fillRect(Math.round(x) + 12, y - 4, w - 24, 4);
    }

    // 2. Bara api & abu vulkanik melayang naik tertiup angin
    const worldWidth = Constants.WORLD_WIDTH;
    for (let i = 0; i < 18; i++) {
      const life = (time * (0.25 + (i % 4) * 0.06) + i / 18) % 1;
      const rawX =
        940 - life * 520 + Math.sin(time * 2 + i * 1.7) * 12 + i * 61;
      const x = ((rawX % worldWidth) + worldWidth) % worldWidth;
      const y = 180 - life * 165;
      ctx.globalAlpha = (1 - life) * 0.85;
      ctx.fillStyle =
        i % 3 === 0 ? "#ffd166" : i % 3 === 1 ? "#ff6b35" : "#8d7b78";
      ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }

    ctx.globalAlpha = 1;
  }
}

window.Renderer = Renderer;
