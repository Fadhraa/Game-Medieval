"use strict";

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = Constants.CANVAS_WIDTH;
    this.height = Constants.CANVAS_HEIGHT;
    this.ground = Constants.GROUND_Y;

    this.sprites = {};
    this.loadSpriteSheets();

    // Cache procedural landscape background
    this.backdrop = document.createElement("canvas");
    this.backdrop.width = Constants.WORLD_WIDTH;
    this.backdrop.height = this.height;
    this.buildBackground(this.backdrop.getContext("2d"));

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
      img.src = path;
      img.addEventListener("load", () => {
        this.renderIcons();
      });
      this.sprites[key] = img;
    }
  }

  rect(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  poly(ctx, color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  }

  randomFrom(seed) {
    return () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  pine(ctx, x, y, size, shadow, light) {
    this.rect(ctx, shadow, x - 1, y - size + 2, 3, size);
    for (let row = 4; row < size - 1; row += 2) {
      const spread = Math.max(1, Math.floor(row * 0.26 + (row % 7) * 0.68));
      this.rect(ctx, shadow, x - spread, y - size + row, spread * 2 + 1, 2);
      if (row % 4 === 0) this.rect(ctx, light, x - spread + 1, y - size + row, spread, 1);
    }
  }

  broadleaf(ctx, x, y, size, shade, mid, light) {
    this.rect(ctx, "#4b4231", x - 2, y - size + 11, 5, size - 11);
    this.rect(ctx, "#6a5538", x, y - size + 18, 2, size - 19);
    const rand = this.randomFrom(x * 317 + y);
    for (let i = 0; i < 24; i++) {
      const dx = Math.round((rand() - 0.5) * size * 0.85);
      const dy = Math.round((rand() - 0.5) * size * 0.5);
      const w = Math.floor(size * (0.21 + rand() * 0.23));
      this.rect(ctx, shade, x + dx - w / 2, y - size + dy, w, 8);
      this.rect(ctx, mid, x + dx - w / 2 + 1, y - size + dy, w - 3, 4);
      if (dy < 0) this.rect(ctx, light, x + dx - w / 2 + 2, y - size + dy, w - 6, 2);
    }
  }

  buildBackground(ctx) {
    const rand = this.randomFrom(1629);
    ctx.save();
    ctx.scale(Constants.WORLD_WIDTH / this.width, 1);
    const sky = ["#acc9bc","#b5cebc","#bdd2bd","#c7d5bc","#d2d9be","#dfdabd","#eadab9","#f0dbb9","#f5dfb8"];
    sky.forEach((color, i) => this.rect(ctx, color, 0, i * 19, this.width, 19));

    ctx.save();
    ctx.translate(413, 0);
    ctx.scale(this.width / Constants.WORLD_WIDTH, 1);
    for (let y = -24; y <= 24; y += 2) {
      const span = Math.floor(Math.sqrt(625 - y * y));
      this.rect(ctx, "#ffeac0", -span, 62 + y, span * 2, 2);
    }
    ctx.restore();

    const clouds = [[42,35,71],[172,60,89],[287,29,65],[410,91,105],[498,45,55],[90,80,45],[332,73,46]];
    for (const [x, y, w] of clouds) {
      this.rect(ctx, "#d8debf", x - 10, y + 7, w + 27, 3);
      this.rect(ctx, "#e9e3c5", x, y + 3, w, 5);
      this.rect(ctx, "#f0e8ca", x + 11, y, w - 20, 4);
      this.rect(ctx, "#f0e8ca", x + 22, y - 3, Math.floor(w / 3), 4);
    }

    const peaks = [
      [0,109,83,52,152,124],[72,128,166,69,270,139],[190,137,268,84,358,134],
      [254,141,339,74,446,141],[367,140,490,79,576,121],[475,140,546,62,611,127]
    ];
    for (const [x0, y0, x1, y1, x2, y2] of peaks) {
      this.poly(ctx, "#96a99d", [[x0,y0],[x1,y1],[x2,y2],[x2,174],[x0,174]]);
      this.poly(ctx, "#aab8a9", [[x0,y0],[x1,y1],[x1-5,y1+22],[x1+10,y1+47],[x1-30,165],[x0,167]]);
      this.poly(ctx, "#c4cbb3", [[x1-17,y1+15],[x1,y1],[x1+23,y1+16],[x1+5,y1+12],[x1+10,y1+25],[x1-4,y1+13]]);
    }

    this.poly(ctx, "#899e86", [[0,124],[32,117],[69,126],[115,112],[151,131],[197,135],[234,116],[274,119],[318,141],[350,126],[397,115],[435,130],[475,121],[519,111],[576,133],[576,187],[0,187]]);
    for (let x = -5; x < this.width + 6; x += 4) {
      const y = 147 + Math.sin(x / 31) * 7 + rand() * 6;
      this.pine(ctx, x, y + 22, 15 + rand() * 25, "#758d76", "#8ba083");
    }

    this.poly(ctx, "#6c876a", [[0,164],[55,156],[123,169],[183,159],[225,166],[280,159],[355,163],[403,150],[460,162],[517,150],[576,158],[576,215],[0,215]]);
    for (let x = -4; x < this.width + 9; x += 8 + rand() * 6) {
      const y = 178 + Math.sin(x / 24) * 5 + rand() * 9;
      const color = x < 349 ? "#526f58" : "#687153";
      this.pine(ctx, x, y, 16 + rand() * 27, color, x < 349 ? "#648166" : "#7e8059");
    }

    const broads = [[11,189,42],[35,189,27],[134,185,33],[153,185,23],[211,187,30],[365,187,27],[440,187,37],[557,190,44],[574,191,31]];
    for (const [x, y, size] of broads) {
      const autumn = x > 330;
      this.broadleaf(ctx, x, y, size, autumn ? "#6b5a39" : "#3e604a", autumn ? "#8c7141" : "#507652", autumn ? "#a28249" : "#729064");
    }

    ctx.restore();

    const worldWidth = Constants.WORLD_WIDTH;
    const density = worldWidth / this.width;
    this.rect(ctx, "#668254", 0, 185, worldWidth, 24);
    for (let i = 0; i < 650 * density; i++) {
      const x = rand() * worldWidth;
      const y = 182 + rand() * 25;
      const tones = ["#4f714e", "#75925b", "#8b995e", "#5e7d4f"];
      this.rect(ctx, tones[i % 4], x, y, 1 + Math.floor(rand() * 5), 1);
      if (i % 9 === 0) this.rect(ctx, "#a5a165", x + 1, y - 1, 1, 1);
    }

    for (let x = 0; x < worldWidth; x += 4) {
      const y = Math.floor(200 + Math.sin(x / 18) * 1.5 + rand() * 3);
      this.rect(ctx, "#938052", x, y, 4, 15);
      this.rect(ctx, "#c5aa72", x, y + 2, 4, 11);
      this.rect(ctx, "#a58b56", x, y + 11, 4, 4);
    }

    this.rect(ctx, "#587747", 0, 216, worldWidth, 31);
    this.rect(ctx, "#779458", 0, 215, worldWidth, 3);
    this.rect(ctx, "#476b46", 0, 235, worldWidth, 12);
    for (let i = 0; i < 940 * density; i++) {
      const x = rand() * worldWidth;
      const y = 203 + rand() * 44;
      const colors = y < 215 ? ["#b09762","#d1b683","#987e55"] : ["#547249","#668652","#7e965b","#3e6344"];
      this.rect(ctx, colors[i % colors.length], x, y, 1 + Math.floor(rand() * 4), 1);
      if (i % 17 === 0 && y > 220) {
        this.rect(ctx, "#81995c", x, y - 2, 1, 3);
        this.rect(ctx, i % 2 ? "#dfc17d" : "#eee0a7", x - 1, y - 3, 3, 1);
      }
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

  drawFarm(ctx, farm) {
    const plotX = Constants.FARM.plotX;
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

    ctx.save();
    ctx.translate(-Math.round(cameraX), 0);
    ctx.drawImage(this.backdrop, 0, 0);

    for (let i = 0; i < 4; i++) {
      const x = Math.floor(187 + i * 10 + (time * 7) % 76);
      const y = 59 + (i % 2) * 4 + Math.floor(Math.sin(time * 3 + i) * 2);
      this.rect(ctx, "#5d6b5d", x, y, 3, 1);
      this.rect(ctx, "#5d6b5d", x - 2, y - 1, 2, 1);
      this.rect(ctx, "#5d6b5d", x + 3, y - 1, 2, 1);
    }

    this.drawCastle(ctx, time);
    ctx.save();
    ctx.translate(Constants.WORLD_WIDTH - this.width, 0);
    this.drawCamp(ctx, time);
    ctx.restore();
    this.drawFarm(ctx, battle.farm);

    // Far half of each healing rune goes behind the units.
    const healSheet = this.sprites.healingAura;
    for (const aura of battle.healingAuras) {
      aura.draw(ctx, healSheet, "back");
    }

    // Units sorted by depth
    const units =
      battle.mode === "ready"
        ? [new Knight(), new Goblin()]
        : [...battle.units].sort((a, b) => a.depth - b.depth);

    if (battle.mode === "ready") {
      units[0].x = 143;
      units[1].x = Constants.BASES.enemy.x - 42;
    }

    for (const unit of units) {
      const sheet = this.sprites[unit.kind];
      unit.draw(ctx, this.ground, time, sheet);
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
    for (const projectile of battle.projectiles) {
      if (projectile instanceof LightningBolt) {
        projectile.draw(ctx, time, lightningSheet);
      } else if (projectile instanceof GoblinBolt) {
        projectile.draw(ctx, time, goblinBoltSheet);
      } else {
        projectile.draw(ctx, time, fireballSheet);
      }
    }

    // Fireball bursts
    for (const burst of battle.bursts) {
      burst.draw(ctx, fireballSheet);
    }

    // Lightning bursts
    for (const lb of battle.lightningBursts) {
      lb.draw(ctx, lightningSheet);
    }

    // Particles
    for (const particle of battle.particles) {
      particle.draw(ctx);
    }
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

    textValue(ui.breadCount, String(battle.bread));
    textValue(ui.farmStatus, battle.farm?.status ?? "Panggil petani untuk panen");
    textValue(ui.farmerLabel, battle.farm ? "Aktif" : "Panggil");
    textValue(ui.farmerCount, battle.farm ? "1/1 petani" : "0/1 petani");
    ui.summonFarmer.disabled = !battle.canRecruitFarmer;

    // Unit counts
    const knights = battle.units.filter((u) => u.kind === "knight").length;
    const wizards = battle.units.filter((u) => u.kind === "wizard").length;
    const kiras = battle.units.filter((u) => u.kind === "kira").length;
    const monsters = battle.units.filter((unit) => unit.side === -1).length;
    textValue(ui.unitCount, `${knights} ksatria · ${wizards} wizard · ${kiras} kira · ${monsters} monster di medan`);

    // Knight button
    const summonRemaining = Math.max(0, battle.nextSummon - battle.elapsed);
    textValue(
      ui.summonLabel,
      summonRemaining > 0
        ? "Tunggu " + (Math.ceil(summonRemaining * 10) / 10).toFixed(1).replace(".", ",") + " dtk"
        : "Panggil"
    );
    ui.summon.disabled =
      battle.mode !== "playing" ||
      battle.availableTroopBread < Constants.KNIGHT_COST ||
      summonRemaining > 0;

    // Wizard button
    const wizardRemaining = Math.max(0, battle.nextWizard - battle.elapsed);
    textValue(
      ui.wizardLabel,
      wizardRemaining > 0
        ? "Tunggu " + (Math.ceil(wizardRemaining * 10) / 10).toFixed(1).replace(".", ",") + " dtk"
        : "Panggil"
    );
    ui.summonWizard.disabled =
      battle.mode !== "playing" ||
      battle.availableTroopBread < Constants.WIZARD_COST ||
      wizardRemaining > 0;

    // Kira button
    if (ui.summonKira) {
      const kiraRemaining = Math.max(0, battle.nextKira - battle.elapsed);
      textValue(
        ui.kiraLabel,
        kiraRemaining > 0
          ? "Tunggu " + (Math.ceil(kiraRemaining * 10) / 10).toFixed(1).replace(".", ",") + " dtk"
          : "Panggil"
      );
      ui.summonKira.disabled =
        battle.mode !== "playing" ||
        battle.availableTroopBread < Constants.KIRA_COST ||
        kiraRemaining > 0;
    }
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
          const cfg = this.getPortraitConfig(art);
          ctx.save();
          ctx.translate(Math.round(cfg.portraitX), 22);
          ctx.scale(cfg.portraitScale, cfg.portraitScale);
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
    if (kind === "minotaur") {
      return { frameWidth: 316, frameHeight: 311, originX: 148, feetOrigin: 298, portraitX: 18, portraitScale: 0.13 };
    }
    if (kind === "farmer") {
      return { frameWidth: 48, frameHeight: 48, originX: 24, feetOrigin: 42, portraitX: 12, portraitScale: 0.62 };
    }
    if (kind === "kira") {
      return { ...Kira.spriteGeometry, portraitX: 12, portraitScale: 0.62 };
    }
    return { frameWidth: 48, frameHeight: 48, originX: 20, feetOrigin: 43, portraitX: 11, portraitScale: 0.66 };
  }
}

window.Renderer = Renderer;
