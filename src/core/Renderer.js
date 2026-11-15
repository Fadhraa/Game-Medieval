"use strict";

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = Constants.CANVAS_WIDTH;
    this.height = Constants.CANVAS_HEIGHT;
    this.ground = Constants.GROUND_Y;

    this.sprites = {};
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
      ready: ["Rebut Markas Goblin", "Panggil petani dengan 1 roti. Setorkan gandum di benteng untuk mendapatkan roti.", "Mulai Pertempuran", "Siap bertempur"],
      paused: ["Pertempuran Dijeda", "Produksi roti dan pergerakan pasukan ikut berhenti.", "Lanjutkan", "Dijeda"],
      won: ["Kerajaan Menang!", "Pasukanmu berhasil menghancurkan markas goblin.", "Main Lagi", "Menang"],
      lost: ["Benteng Kerajaan Runtuh", "Goblin berhasil menghancurkan bentengmu.", "Coba Lagi", "Kalah"],
      draw: ["Kedua Markas Runtuh", "Pertempuran berakhir imbang.", "Main Lagi", "Imbang"]
    };
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

  drawRidge(ctx, key, y, height) {
    const sprite = this.sprites[key];
    if (sprite?.complete && sprite.naturalWidth) {
      ctx.drawImage(sprite, 0, y, Constants.WORLD_WIDTH, height);
    }
  }

  randomFrom(seed) {
    return () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  drawTree(ctx, key, x, ground, height) {
    const tree = this.sprites[key];
    if (!tree?.complete || !tree.naturalWidth) return;

    const width = height * tree.naturalWidth / tree.naturalHeight;
    const worldX = x * Constants.WORLD_WIDTH / this.width;
    ctx.drawImage(tree, Math.round(worldX - width / 2), Math.round(ground - height),
      Math.round(width), Math.round(height));
  }

  buildSky(ctx) {
    const sky = ["#acc9bc","#b5cebc","#bdd2bd","#c7d5bc","#d2d9be","#dfdabd","#eadab9","#f0dbb9","#f5dfb8"];
    sky.forEach((color, i) => this.rect(ctx, color, 0, i * 19, Constants.WORLD_WIDTH, 19));
    for (let y = -24; y <= 24; y += 2) {
      const span = Math.floor(Math.sqrt(625 - y * y));
      this.rect(ctx, "#ffeac0", 413 - span, 62 + y, span * 2, 2);
    }
  }

  drawSkySprites(ctx, time, cameraX) {
    const worldWidth = Constants.WORLD_WIDTH;
    const clouds = [
      ["cloud", 28, 36, 109], ["cloudWispy", 177, 72, 73],
      ["cloud", 302, 57, 141], ["cloudWispy", 479, 28, 106],
      ["cloud", 608, 77, 139], ["cloudWispy", 797, 41, 114],
      ["cloud", 928, 62, 104]
    ];
    const cloudTravel = worldWidth + 240;
    for (const [key, origin, y, width] of clouds) {
      const cloud = this.sprites[key];
      if (!cloud?.complete || !cloud.naturalWidth) continue;
      const x = (origin + 64 + time * 2.4) % cloudTravel - 144 - cameraX * 0.34;
      const height = width * cloud.naturalHeight / cloud.naturalWidth;
      ctx.drawImage(cloud, Math.round(x), y, width, Math.round(height));
    }

    const bird = this.sprites.swallow;
    if (!bird?.complete || !bird.naturalWidth) return;
    const frameWidth = bird.naturalWidth / 4;
    const flockTravel = worldWidth + 216;
    for (const [startX, altitude, speed] of [[218, 65, 17], [720, 54, 20]]) {
      const flightX = (startX + time * speed) % flockTravel - 84 - cameraX * 0.62;
      for (let i = 0; i < 3; i++) {
        const frame = Math.floor(time * 9 + i) % 4;
        const y = altitude + i * 5 + Math.sin(time * 1.8 + i) * 2;
        ctx.drawImage(bird, frame * frameWidth, 0, frameWidth, bird.naturalHeight,
          Math.round(flightX - i * 16), Math.round(y), 18, 12);
      }
    }
  }

  buildBackground(ctx) {
    const rand = this.randomFrom(1629);
    ctx.clearRect(0, 0, Constants.WORLD_WIDTH, this.height);
    ctx.imageSmoothingEnabled = false;

    this.drawRidge(ctx, "mountainRidge", 46, 143);
    this.drawRidge(ctx, "rollingHills", 111, 83);

    ctx.globalAlpha = 0.69;
    for (let x = -5; x < this.width + 6; x += 5 + rand() * 3) {
      const y = 167 + Math.sin(x / 31) * 7 + rand() * 6;
      this.drawTree(ctx, "distantPine", x, y, 17 + rand() * 27);
    }
    ctx.globalAlpha = 1;

    ctx.globalAlpha = 0.82;
    for (let x = -4; x < this.width + 9; x += 7 + rand() * 7) {
      const y = 181 + Math.sin(x / 24) * 5 + rand() * 8;
      this.drawTree(ctx, "woodlandPine", x, y, 22 + rand() * 30);
    }
    ctx.globalAlpha = 1;

    const oaks = [[11,189,44],[35,189,29],[134,185,39],[153,185,26],[211,187,34],[275,186,25],[365,187,34],[440,187,41],[557,190,46],[574,191,32]];
    for (const [x, y, height] of oaks) {
      this.drawTree(ctx, x > 330 ? "autumnOak" : "woodlandOak", x, y, height);
    }

    const ground = this.sprites.groundPath;
    const groundTop = 185;
    if (ground?.complete && ground.naturalWidth) {
      for (let x = 0; x < Constants.WORLD_WIDTH; x += ground.naturalWidth) {
        ctx.drawImage(ground, x, groundTop);
      }
    } else {
      this.rect(ctx, "#587747", 0, groundTop, Constants.WORLD_WIDTH, this.height - groundTop);
    }
  }

  masonry(ctx, x, y, w, h, colors) {
    this.rect(ctx, colors[0], x, y, w, h);
    for (let row = 0; row < h; row += 6) {
      for (let col = row % 12 === 0 ? -4 : 0; col < w; col += 8) {
        const left = Math.max(0, col);
        const right = Math.min(col + 7, w);
        const shade = 1 + Math.abs((row * 11 + col * 7 + x) % (colors.length - 1));
        this.rect(ctx, colors[shade], x + left, y + row, right - left, Math.min(5, h - row));
      }
    }
  }

  flag(ctx, x, y, time, side, colors) {
    const flutter = Math.floor(Math.sin(time * 4 + x) * 2);
    this.rect(ctx, "#3a382c", x, y - 3, 2, 23);
    this.rect(ctx, "#d9b467", x, y - 5, 2, 2);
    ctx.save();
    ctx.translate(x + (side > 0 ? 2 : 0), y);
    ctx.scale(side, 1);
    this.rect(ctx, colors[0], 0, 0, 10, 9);
    this.rect(ctx, colors[0], 10, flutter, 8, 8);
    this.rect(ctx, colors[1], 0, 0, 10, 2);
    this.rect(ctx, colors[1], 10, flutter, 6, 2);
    this.rect(ctx, colors[2], 5, 3, 3, 3);
    ctx.restore();
  }

  drawCastle(ctx, time) {
    const stone = ["#424b46","#7d8581","#8e9690","#969f94","#a8a99a"];
    const shade = ["#414b47","#66736d","#748178","#899087"];
    this.rect(ctx, "#425445", 19, 205, 102, 5);
    this.masonry(ctx, 47, 132, 54, 74, stone);
    this.masonry(ctx, 63, 106, 26, 50, stone);
    for (let i = 0; i < 4; i++) this.rect(ctx, "#9da596", 63 + i * 7, 101, 5, 8);
    this.rect(ctx, "#c5c7aa", 63, 107, 26, 2);
    this.rect(ctx, "#3a4440", 73, 115, 6, 12);
    this.rect(ctx, "#748e84", 74, 115, 2, 8);
    for (const [x, y, colors] of [[24,137,shade],[91,145,stone]]) {
      this.masonry(ctx, x, y, 24, 62 - (y - 137), colors);
      for (let i = 0; i < 4; i++) this.rect(ctx, colors[3], x - 1 + i * 7, y - 5, 5, 9);
      this.rect(ctx, "#aab39f", x - 2, y + 3, 28, 2);
      this.rect(ctx, "#343d38", x + 10, y + 12, 4, 11);
      this.rect(ctx, "#a9a999", x + 8, y + 23, 8, 2);
      this.masonry(ctx, x - 2, 194, 28, 11, colors);
    }
    this.rect(ctx, "#515d53", 42, 198, 56, 8);
    this.rect(ctx, "#b2a78a", 42, 204, 59, 3);
    this.rect(ctx, "#43554d", 48, 139, 13, 28);
    this.rect(ctx, "#587f79", 50, 139, 10, 24);
    this.rect(ctx, "#add1a6", 54, 147, 3, 7);
    this.rect(ctx, "#add1a6", 52, 149, 7, 3);
    this.rect(ctx, "#c3a97d", 59, 181, 26, 23);
    this.rect(ctx, "#c3a97d", 63, 174, 18, 12);
    this.rect(ctx, "#222f2c", 62, 184, 20, 20);
    this.rect(ctx, "#222f2c", 66, 177, 12, 9);
    for (let i = 0; i < 4; i++) this.rect(ctx, i % 2 ? "#514434" : "#594c38", 64 + i * 4, 186, 3, 18);
    this.rect(ctx, "#b18a55", 65, 191, 14, 2);
    this.flag(ctx, 75, 80, time, 1, ["#497e79","#7aaf9b","#f1d695"]);
    this.flag(ctx, 33, 115, time, -1, ["#497e79","#7aaf9b","#f1d695"]);
  }

  drawCamp(ctx, time) {
    const rock = ["#4a4035","#6a5544","#7a6450","#8c6d53","#947b5c"];
    this.rect(ctx, "#4f4935", 453, 204, 107, 6);
    this.masonry(ctx, 482, 144, 62, 61, rock);
    for (const [x, y, h] of [[468,151,53],[533,141,63]]) {
      this.masonry(ctx, x, y, 21, h, rock);
      for (let j = 0; j < 3; j++) {
        const px = x - 1 + j * 8;
        this.rect(ctx, "#68513b", px, y - 5, 6, 9);
        this.rect(ctx, "#9c7651", px + 1, y - 7 - (j % 2) * 2, 4, 4);
      }
      this.rect(ctx, "#3e362a", x + 7, y + 15, 6, 13);
      this.rect(ctx, "#c28447", x + 9, y + 23, 2, 3);
    }
    for (let j = 0; j < 7; j++) {
      const x = 483 + j * 7;
      const y = 149 - (j % 2) * 5;
      this.rect(ctx, "#5a4432", x, y - 8, 5, 21);
      this.rect(ctx, "#b48455", x, y - 8, 2, 15);
      this.rect(ctx, "#795638", x + 1, y - 11, 3, 4);
    }
    this.rect(ctx, "#3c2e25", 496, 179, 32, 26);
    this.rect(ctx, "#3c2e25", 501, 171, 22, 12);
    this.rect(ctx, "#986f46", 494, 177, 4, 28);
    this.rect(ctx, "#986f46", 526, 177, 4, 28);
    this.rect(ctx, "#a78151", 497, 173, 30, 4);
    this.rect(ctx, "#755437", 501, 167, 22, 6);
    this.rect(ctx, "#563d2c", 499, 184, 26, 18);
    for (let i = 0; i < 5; i++) this.rect(ctx, "#624733", 500 + i * 5, 181, 2, 24);
    this.rect(ctx, "#833c2e", 507, 148, 12, 18);
    this.rect(ctx, "#af6245", 508, 148, 9, 15);
    this.rect(ctx, "#e2b47e", 510, 151, 5, 4);
    this.rect(ctx, "#71372b", 511, 152, 1, 1);
    this.rect(ctx, "#71372b", 514, 152, 1, 1);
    this.rect(ctx, "#e2b47e", 511, 155, 3, 2);
    this.flag(ctx, 543, 119, time, -1, ["#903f31","#bd6248","#e7ba78"]);
    this.flag(ctx, 476, 129, time, -1, ["#903f31","#bd6248","#e7ba78"]);

    for (const x of [485, 536]) {
      const flicker = Math.floor(Math.sin(time * 11 + x) * 2);
      this.rect(ctx, "#44332a", x, 189, 2, 13);
      this.rect(ctx, "#d1713d", x - 2, 184 + flicker, 6, 6 - flicker);
      this.rect(ctx, "#f6b759", x, 185 + flicker, 2, 4);
    }
  }

  drawFarm(ctx, farm, plotX) {
    const plot = this.sprites.farmPlot;
    if (plot?.complete && plot.naturalWidth) {
      ctx.drawImage(plot, plotX - 32, this.ground - 8);
    }

    // The farmer's harvest animation already shows the wheat being cut.
    const crop = farm?.crop ? this.sprites[farm.crop] : null;
    if (crop?.complete && crop.naturalWidth) {
      for (const offset of [-18, 0, 18]) {
        ctx.drawImage(crop, plotX + offset - crop.naturalWidth / 2, this.ground - crop.naturalHeight + 3);
      }
    }
  }

  render(battle, time, cameraX = 0) {
    const ctx = this.ctx;

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
    ctx.drawImage(arena?.naturalWidth ? arena : this.backdrop, 0, 0, Constants.WORLD_WIDTH, this.height);

    this.drawCastle(ctx, time);
    ctx.save();
    ctx.translate(Constants.WORLD_WIDTH - this.width, 0);
    this.drawCamp(ctx, time);
    ctx.restore();
    for (const [index, farmer] of battle.farmersByPlot.entries()) {
      this.drawFarm(ctx, farmer, Constants.FARM.plots[index].x);
    }

    // Far half of each healing rune goes behind the units.
    const healSheet = this.sprites.healingAura;
    for (const aura of battle.healingAuras) {
      aura.draw(ctx, healSheet, "back");
    }
    const witcherEffects = this.sprites.witcherEffects;
    for (const circle of battle.witcherCircles) circle.draw(ctx, witcherEffects);

    // Units sorted by depth
    const units =
      battle.mode === "ready"
        ? [new Knight(), new Goblin()]
        : [...battle.units, ...(battle.boss?.hp === 0 ? [battle.boss] : [])]
          .sort((a, b) => a.depth - b.depth);

    if (battle.mode === "ready") {
      units[0].x = 143;
      units[1].x = Constants.BASES.enemy.x - 42;
    }

    const speedAuraSheet = this.sprites.baseSpeedAura;
    for (const unit of units) {
      const sheet = this.sprites[unit.kind];
      if (battle.hasBaseSpeedBuff(unit)) {
        this.drawBaseSpeedAura(ctx, unit, time, speedAuraSheet, "back");
      }
      if (unit instanceof Witcher) {
        unit.drawSummon(ctx, this.ground, time, this.sprites.minotaur, witcherEffects);
      }
      unit.draw(ctx, this.ground, time, sheet, this.sprites.rootGiantRoots);
      if (battle.hasBaseSpeedBuff(unit)) {
        this.drawBaseSpeedAura(ctx, unit, time, speedAuraSheet, "front");
      }
      if (unit instanceof Commander) unit.drawShieldImpact(ctx, this.ground, this.sprites.commanderImpact);
      if (unit.stunnedUntil > battle.elapsed) this.drawStun(ctx, unit, time);
    }

    // Near edge sits in front of feet, so overlapping enemies cannot hide
    // which ally the ground rune belongs to.
    for (const aura of battle.healingAuras) {
      aura.draw(ctx, healSheet, "front");
    }

    // Use the atlas associated with each projectile type.
    const fireballSheet = this.sprites.fireball;
    const lightningSheet = this.sprites.lightning;
    const goblinBoltSheet = this.sprites.goblinBolt;
    const lynceArrowSheet = this.sprites.lynceArrow;
    const lynceSkillArrowSheet = this.sprites.lynceSkillArrow;
    for (const projectile of battle.projectiles) {
      if (projectile instanceof LightningBolt) {
        projectile.draw(ctx, time, lightningSheet);
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

    // Fireball & arrow bursts
    for (const burst of battle.bursts) {
      burst.draw(ctx, fireballSheet);
    }
    for (const burst of battle.arrowBursts) {
      burst.draw(ctx, burst.skill ? lynceSkillArrowSheet : lynceArrowSheet);
    }

    // Lightning bursts
    for (const lb of battle.lightningBursts) {
      lb.draw(ctx, lightningSheet);
    }

    // Particles
    for (const particle of battle.particles) {
      particle.draw(ctx);
    }
    for (const number of battle.combatNumbers) number.draw(ctx);
    if (battle.mode !== "ready") battle.boss?.drawHealth(ctx, this.ground);
    ctx.restore();
  }

  syncHud(battle, ui) {
    const textValue = (el, val) => {
      if (el && el.textContent !== val) el.textContent = val;
    };

    if (battle.mode !== this.previousMode) {
      const active = battle.mode === "playing";
      const paused = battle.mode === "paused";
      ui.pause.disabled = !active && !paused;
      textValue(ui.pause, paused ? "Lanjut" : "Jeda");
      ui.pause.setAttribute("aria-label", paused ? "Lanjutkan pertempuran" : "Jeda pertempuran");
      ui.overlay.hidden = !paused && battle.mode !== "ready";
      ui.restart.hidden = !paused;
      ui.openSettings.hidden = !paused;

      if (active) {
        textValue(ui.status, "Pertempuran berlangsung");
      } else {
        const [heading, explanation, action, status] = this.messages[battle.mode];
        textValue(ui.missionTitle, heading);
        textValue(ui.missionText, explanation);
        ui.play.replaceChildren(action + " ");
        const arrow = document.createElement("span");
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "▸";
        ui.play.append(arrow);
        textValue(ui.status, status);
        if (this.previousMode && !ui.overlay.hidden) ui.play.focus({ preventScroll: true });
      }
      this.previousMode = battle.mode;
    }

    const updateBase = (hp, max, label, bar) => {
      const displayHp = Math.ceil(hp);
      textValue(label, displayHp + " / " + max);
      bar.firstElementChild.style.width = (100 * hp) / max + "%";
      if (bar.getAttribute("aria-valuenow") !== String(displayHp)) {
        bar.setAttribute("aria-valuenow", displayHp);
      }
    };

    updateBase(battle.heroHp, Constants.BASES.hero.hp, ui.heroHp, ui.heroBar);
    updateBase(battle.enemyHp, Constants.BASES.enemy.hp, ui.enemyHp, ui.enemyBar);

    const seconds = Math.floor(battle.elapsed);
    const clock = [Math.floor(seconds / 60), seconds % 60]
      .map((v) => String(v).padStart(2, "0"))
      .join(":");
    textValue(ui.clock, clock);
    const witcherHidden = !battle.activeWitcher;
    if (ui.cameraWitcher.hidden !== witcherHidden) ui.cameraWitcher.hidden = witcherHidden;

    textValue(ui.breadCount, String(battle.bread));
    const farmers = battle.farmersByPlot;
    const farmerCount = farmers.filter(Boolean).length;
    const farmStatus = farmerCount === 0 ? "1 roti untuk petani" :
      farmers.filter(Boolean).map(farmer => farmer.status).join(" · ");
    textValue(ui.farmStatus, farmStatus);
    textValue(ui.farmerLabel, `${farmerCount}/${farmers.length} aktif`);
    ui.summonFarmer.disabled = battle.openFarmPlot === -1;

    // Unit counts
    const knights = battle.units.filter((u) => u.kind === "knight").length;
    const wizards = battle.units.filter((u) => u.kind === "wizard").length;
    const kiras = battle.units.filter((u) => u.kind === "kira").length;
    const james = battle.units.filter((u) => u.kind === "james").length;
    const lynces = battle.units.filter((u) => u.kind === "lynce").length;
    const monsters = battle.units.filter((unit) => unit.side === -1).length;
    textValue(ui.unitCount, `${knights} ksatria · ${wizards} wizard · ${kiras} kira · ${james} James · ${lynces} Lynce · ${monsters} monster di medan`);

    const active = battle.mode === "playing";
    const availableBread = battle.availableTroopBread;
    const updateSummon = (button, label, cost, next) => {
      const remaining = Math.max(0, next - battle.elapsed);
      const needsBread = availableBread < cost;
      const countdown = Math.ceil(remaining * 10) / 10;
      textValue(label, remaining > 0 ? countdown.toFixed(1).replace(".", ",") + " dtk" :
        !active ? "Panggil" : needsBread ? "Kurang roti" : "Panggil");
      button.disabled = !active || needsBread || remaining > 0;
    };

    updateSummon(ui.summon, ui.summonLabel, Constants.KNIGHT_COST, battle.nextSummon);
    updateSummon(ui.summonWizard, ui.wizardLabel, Constants.WIZARD_COST, battle.nextWizard);
    updateSummon(ui.summonKira, ui.kiraLabel, Constants.KIRA_COST, battle.nextKira);
    updateSummon(ui.summonJames, ui.jamesLabel, Constants.JAMES_COST, battle.nextJames);
    updateSummon(ui.summonLynce, ui.lynceLabel, Constants.LYNCE_COST, battle.nextLynce);

    if (ui.baseSkillButton && ui.baseSkillLabel) {
      const unlocked = battle.isBaseSkillUnlocked();
      ui.baseSkillButton.hidden = !unlocked;
      if (unlocked) {
        const skillActive = battle.baseSkillActiveUntil > battle.elapsed;
        const skillCooldown = !skillActive && battle.baseSkillCooldownUntil > battle.elapsed;
        ui.baseSkillButton.classList.toggle("is-active", skillActive);
        ui.baseSkillButton.classList.toggle("is-cooldown", skillCooldown);
        if (skillActive) {
          const secs = Math.ceil(battle.baseSkillActiveUntil - battle.elapsed);
          textValue(ui.baseSkillLabel, `Aktif ${secs}d`);
        } else if (skillCooldown) {
          const secs = Math.ceil(battle.baseSkillCooldownUntil - battle.elapsed);
          textValue(ui.baseSkillLabel, `Jeda ${secs}d`);
        } else {
          textValue(ui.baseSkillLabel, "Siap [Q]");
        }
        ui.baseSkillButton.disabled = !active || skillActive || skillCooldown;
      }
    }
  }

  drawBaseSpeedAura(ctx, unit, time, spriteSheet, layer = "back") {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return;
    const frameW = 32;
    const frameH = 24;
    const split = 16;
    const frame = Math.floor(time * 10) % 6;
    const srcY = layer === "front" ? split : 0;
    const srcH = layer === "front" ? frameH - split : split;
    const feet = this.ground + (unit.depth ?? 0);
    const destX = Math.round(unit.x - frameW / 2);
    const destY = Math.round(feet - 17) + srcY;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      spriteSheet,
      frame * frameW,
      srcY,
      frameW,
      srcH,
      destX,
      destY,
      frameW,
      srcH
    );
    ctx.restore();
  }

  drawStun(ctx, unit, time) {
    const x = Math.round(unit.x);
    const y = this.ground + unit.depth - unit.getRenderConfig().barYOffset - 7;
    const bob = Math.round(2 * Math.sin(time * 12));
    this.rect(ctx, "#9d643a", x - 1, y - bob - 2, 3, 7);
    this.rect(ctx, "#fff09a", x - 2, y - bob, 5, 2);
    this.rect(ctx, "#fff09a", x, y - bob - 2, 1, 6);
    this.rect(ctx, "#e9b551", x - 6, y + bob + 1, 2, 2);
    this.rect(ctx, "#e9b551", x + 5, y + bob + 1, 2, 2);
  }

  renderIcons() {
    for (const item of document.querySelectorAll("[data-art]")) {
      const ctx = item.getContext("2d");
      const art = item.dataset.art;

      if (art === "bread") {
        this.rect(ctx, "#875331", 2, 10, 20, 9);
        this.rect(ctx, "#875331", 5, 7, 14, 13);
        this.rect(ctx, "#d88f3c", 3, 10, 18, 7);
        this.rect(ctx, "#e6a64f", 6, 8, 12, 8);
        this.rect(ctx, "#f7cd75", 7, 8, 10, 2);
        for (let i = 0; i < 3; i++) {
          this.rect(ctx, "#ffdf93", 6 + i * 5, 10, 2, 4);
          this.rect(ctx, "#a76432", 7 + i * 5, 13, 2, 2);
        }
        this.rect(ctx, "#ae6b35", 5, 17, 14, 2);
      } else if (art === "crest") {
        this.rect(ctx, "#30483f", 3, 3, 18, 12);
        this.rect(ctx, "#30483f", 6, 15, 12, 4);
        this.rect(ctx, "#30483f", 10, 19, 4, 2);
        this.rect(ctx, "#6ba393", 5, 5, 14, 10);
        this.rect(ctx, "#6ba393", 8, 15, 8, 3);
        this.rect(ctx, "#efcd83", 11, 7, 2, 9);
        this.rect(ctx, "#efcd83", 8, 11, 8, 2);
      } else {
        const sprite = this.sprites[art];
        ctx.clearRect(0, 0, item.width, item.height);
        if (sprite?.complete && sprite.naturalWidth > 0) {
          if (art === "frostGolem") {
            const drawH = item.height * 0.86;
            const drawW = drawH * sprite.naturalWidth / sprite.naturalHeight;
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
              sprite,
              Math.round((item.width - drawW) / 2),
              Math.round(item.height - drawH - 2),
              Math.round(drawW),
              Math.round(drawH)
            );
            ctx.restore();
            continue;
          }
          const cfg = this.getPortraitConfig(art);
          const ratio = item.width / 24;
          ctx.save();
          ctx.translate(Math.round(cfg.portraitX * ratio), Math.round(22 * item.height / 24));
          ctx.scale(cfg.portraitScale * ratio, cfg.portraitScale * ratio);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            sprite,
            0,
            0,
            cfg.frameWidth,
            cfg.frameHeight,
            -cfg.originX,
            -cfg.feetOrigin,
            cfg.frameWidth,
            cfg.frameHeight
          );
          ctx.restore();
        }
      }
    }
  }

  getPortraitConfig(kind) {
    if (kind === "wizard") {
      return { frameWidth: 48, frameHeight: 48, originX: 23, feetOrigin: 43, portraitX: 12, portraitScale: 0.55 };
    }
    if (kind === "goblin") {
      return { frameWidth: 48, frameHeight: 48, originX: 28, feetOrigin: 43, portraitX: 13, portraitScale: 0.72 };
    }
    if (kind === "archer_goblin") {
      return { frameWidth: 48, frameHeight: 48, originX: 24, feetOrigin: 43, portraitX: 13, portraitScale: 0.72 };
    }
    if (kind === "minotaur") {
      return { frameWidth: 316, frameHeight: 311, originX: 148, feetOrigin: 298, portraitX: 18, portraitScale: 0.13 };
    }
    if (kind === "witcher") {
      return { frameWidth: 64, frameHeight: 64, originX: 34, feetOrigin: 55, portraitX: 13, portraitScale: 0.56 };
    }
    if (kind === "commander") {
      return { frameWidth: 128, frameHeight: 120, originX: 64, feetOrigin: 106, portraitX: 13, portraitScale: 0.30 };
    }
    if (kind === "rootGiant") {
      return { frameWidth: 96, frameHeight: 88, originX: 48, feetOrigin: 82, portraitX: 13, portraitScale: 0.36 };
    }
    if (kind === "farmer") {
      return { frameWidth: 48, frameHeight: 48, originX: 24, feetOrigin: 42, portraitX: 12, portraitScale: 0.62 };
    }
    if (kind === "james") {
      return { ...James.spriteGeometry, portraitX: 11, portraitScale: 0.39 };
    }
    if (kind === "kira") {
      return { ...Kira.spriteGeometry, portraitX: 12, portraitScale: 0.62 };
    }
    if (kind === "lynce") {
      return { ...Lynce.spriteGeometry, portraitX: 11, portraitScale: 0.62 };
    }
    return { frameWidth: 48, frameHeight: 48, originX: 20, feetOrigin: 43, portraitX: 11, portraitScale: 0.66 };
  }

  ensureBackdropReady() {
    if (this.backdropDirty) {
      this.buildBackground(this.backdrop.getContext("2d"));
      this.backdropDirty = false;
    }
    if (!this.previewBuffer) {
      this.previewBuffer = document.createElement("canvas");
    }
  }

  renderArenaSceneToBuffer(bufW, bufH, chapter, cropX) {
    this.ensureBackdropReady();
    this.previewBuffer.width = bufW;
    this.previewBuffer.height = bufH;
    const bctx = this.previewBuffer.getContext("2d");
    bctx.imageSmoothingEnabled = false;
    bctx.clearRect(0, 0, bufW, bufH);

    const arena = chapter?.arena ? this.sprites[chapter.arena] : null;
    if (!arena?.naturalWidth) {
      bctx.drawImage(this.sky, -Math.round(cropX * 0.34), 0);
      this.drawSkySprites(bctx, 0.5, cropX);
    }

    bctx.save();
    bctx.translate(-Math.round(cropX), 0);
    bctx.drawImage(arena?.naturalWidth ? arena : this.backdrop, 0, 0, Constants.WORLD_WIDTH, this.height);
    this.drawCastle(bctx, 0.5);
    bctx.save();
    bctx.translate(Constants.WORLD_WIDTH - this.width, 0);
    this.drawCamp(bctx, 0.5);
    bctx.restore();
    bctx.restore();
    return bctx;
  }

  drawDioramaUnit(ctx, kind, x, groundY) {
    const sprite = this.sprites[kind];
    if (!sprite?.complete || !sprite.naturalWidth) return;

    const specs = {
      knight: { frameWidth: 48, frameHeight: 48, originX: 20, feetOrigin: 43, scale: 1 },
      goblin: { frameWidth: 48, frameHeight: 48, originX: 28, feetOrigin: 43, scale: 1 },
      archer_goblin: { frameWidth: 48, frameHeight: 48, originX: 24, feetOrigin: 43, scale: 0.85 },
      minotaur: { frameWidth: 316, frameHeight: 311, originX: 148, feetOrigin: 298, scale: 0.19 },
      witcher: { frameWidth: 64, frameHeight: 64, originX: 34, feetOrigin: 55, scale: 1.12 },
      commander: { frameWidth: 128, frameHeight: 120, originX: 64, feetOrigin: 106, scale: 1 },
      rootGiant: { frameWidth: 96, frameHeight: 88, originX: 48, feetOrigin: 82, scale: 1 }
    };

    ctx.fillStyle = "rgba(44, 34, 22, 0.28)";
    ctx.fillRect(Math.round(x - 16), Math.round(groundY - 2), 32, 3);

    ctx.save();
    ctx.translate(Math.round(x), Math.round(groundY));
    ctx.imageSmoothingEnabled = false;
    if (kind === "frostGolem") {
      const h = 82;
      const w = Math.round(h * sprite.naturalWidth / sprite.naturalHeight);
      ctx.drawImage(sprite, -Math.round(w / 2), -h, w, h);
    } else {
      const cfg = specs[kind] ?? specs.goblin;
      ctx.scale(cfg.scale, cfg.scale);
      ctx.drawImage(
        sprite,
        0,
        0,
        cfg.frameWidth,
        cfg.frameHeight,
        -cfg.originX,
        -cfg.feetOrigin,
        cfg.frameWidth,
        cfg.frameHeight
      );
    }
    ctx.restore();
  }

  drawStagePreview(canvas, chapter, stage) {
    if (!canvas) return;
    const cropX = Math.max(0, Math.min(Constants.WORLD_WIDTH - this.width, chapter?.cameraCropX ?? 220));
    this.renderArenaSceneToBuffer(this.width, this.height, chapter, cropX);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.previewBuffer, 0, 0, canvas.width, canvas.height);

    // Subtle atmospheric vignette border inside the battlefield banner
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "rgba(24, 18, 12, 0.14)");
    grad.addColorStop(0.7, "rgba(24, 18, 12, 0)");
    grad.addColorStop(1, "rgba(24, 18, 12, 0.42)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawChapterIllustration(canvas, chapter) {
    if (!canvas) return;
    const viewW = Math.round(this.height * canvas.width / canvas.height);
    const maxCrop = Math.max(0, Constants.WORLD_WIDTH - viewW);
    const cropX = Math.max(0, Math.min(maxCrop, chapter?.cameraCropX ?? 220));
    const bctx = this.renderArenaSceneToBuffer(viewW, this.height, chapter, cropX);

    const featured = chapter?.featuredUnits ?? ["goblin"];
    this.drawDioramaUnit(bctx, "knight", Math.round(viewW * 0.25), this.ground + 3);
    if (featured[0]) {
      this.drawDioramaUnit(bctx, featured[0], Math.round(viewW * 0.64), this.ground + 2);
    }
    if (featured[1]) {
      this.drawDioramaUnit(bctx, featured[1], Math.round(viewW * 0.80), this.ground + 5);
    }

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.previewBuffer, 0, 0, canvas.width, canvas.height);

    const vignette = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      canvas.height * 0.3,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.72
    );
    vignette.addColorStop(0, "rgba(45, 29, 14, 0)");
    vignette.addColorStop(1, "rgba(45, 29, 14, 0.26)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

window.Renderer = Renderer;
