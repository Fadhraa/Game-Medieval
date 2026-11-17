"use strict";

Object.assign(Renderer.prototype, {
  drawRidge(ctx, key, y, height) {
    const sprite = this.sprites[key];
    if (sprite?.complete && sprite.naturalWidth) {
      ctx.drawImage(sprite, 0, y, Constants.WORLD_WIDTH, height);
    }
  },

  randomFrom(seed) {
    return () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  },

  drawTree(ctx, key, x, ground, height) {
    const tree = this.sprites[key];
    if (!tree?.complete || !tree.naturalWidth) return;

    const width = height * tree.naturalWidth / tree.naturalHeight;
    const worldX = x * Constants.WORLD_WIDTH / this.width;
    ctx.drawImage(tree, Math.round(worldX - width / 2), Math.round(ground - height),
      Math.round(width), Math.round(height));
  },

  buildSky(ctx) {
    const sky = ["#acc9bc","#b5cebc","#bdd2bd","#c7d5bc","#d2d9be","#dfdabd","#eadab9","#f0dbb9","#f5dfb8"];
    sky.forEach((color, i) => this.rect(ctx, color, 0, i * 19, Constants.WORLD_WIDTH, 19));
    for (let y = -24; y <= 24; y += 2) {
      const span = Math.floor(Math.sqrt(625 - y * y));
      this.rect(ctx, "#ffeac0", 413 - span, 62 + y, span * 2, 2);
    }
  },

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
  },

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
  },

  getArenaBackdrop(arena) {
    const cached = this.arenaCache.get(arena);
    if (cached) return cached;
    const canvas = document.createElement("canvas");
    canvas.width = Constants.WORLD_WIDTH;
    canvas.height = this.height;
    const actx = canvas.getContext("2d");
    actx.imageSmoothingEnabled = false;
    actx.drawImage(arena, 0, 0, Constants.WORLD_WIDTH, this.height);
    this.arenaCache.set(arena, canvas);
    return canvas;
  },

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
  },

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
  },

  buildCastleBase() {
    const canvas = document.createElement("canvas");
    canvas.width = 130;
    canvas.height = 120;
    const bctx = canvas.getContext("2d");
    bctx.translate(-15, -95);
    const stone = ["#424b46","#7d8581","#8e9690","#969f94","#a8a99a"];
    const shade = ["#414b47","#66736d","#748178","#899087"];
    this.rect(bctx, "#425445", 19, 205, 102, 5);
    this.masonry(bctx, 47, 132, 54, 74, stone);
    this.masonry(bctx, 63, 106, 26, 50, stone);
    for (let i = 0; i < 4; i++) this.rect(bctx, "#9da596", 63 + i * 7, 101, 5, 8);
    this.rect(bctx, "#c5c7aa", 63, 107, 26, 2);
    this.rect(bctx, "#3a4440", 73, 115, 6, 12);
    this.rect(bctx, "#748e84", 74, 115, 2, 8);
    for (const [x, y, colors] of [[24,137,shade],[91,145,stone]]) {
      this.masonry(bctx, x, y, 24, 62 - (y - 137), colors);
      for (let i = 0; i < 4; i++) this.rect(bctx, colors[3], x - 1 + i * 7, y - 5, 5, 9);
      this.rect(bctx, "#aab39f", x - 2, y + 3, 28, 2);
      this.rect(bctx, "#343d38", x + 10, y + 12, 4, 11);
      this.rect(bctx, "#a9a999", x + 8, y + 23, 8, 2);
      this.masonry(bctx, x - 2, 194, 28, 11, colors);
    }
    this.rect(bctx, "#515d53", 42, 198, 56, 8);
    this.rect(bctx, "#b2a78a", 42, 204, 59, 3);
    this.rect(bctx, "#43554d", 48, 139, 13, 28);
    this.rect(bctx, "#587f79", 50, 139, 10, 24);
    this.rect(bctx, "#add1a6", 54, 147, 3, 7);
    this.rect(bctx, "#add1a6", 52, 149, 7, 3);
    this.rect(bctx, "#c3a97d", 59, 181, 26, 23);
    this.rect(bctx, "#c3a97d", 63, 174, 18, 12);
    this.rect(bctx, "#222f2c", 62, 184, 20, 20);
    this.rect(bctx, "#222f2c", 66, 177, 12, 9);
    for (let i = 0; i < 4; i++) this.rect(bctx, i % 2 ? "#514434" : "#594c38", 64 + i * 4, 186, 3, 18);
    this.rect(bctx, "#b18a55", 65, 191, 14, 2);
    return canvas;
  },

  drawCastle(ctx, time) {
    this.castleCanvas ??= this.buildCastleBase();
    ctx.drawImage(this.castleCanvas, 15, 95);
    this.flag(ctx, 75, 80, time, 1, ["#497e79","#7aaf9b","#f1d695"]);
    this.flag(ctx, 33, 115, time, -1, ["#497e79","#7aaf9b","#f1d695"]);
  },

  buildCampBase() {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 90;
    const bctx = canvas.getContext("2d");
    bctx.translate(-450, -125);
    const rock = ["#4a4035","#6a5544","#7a6450","#8c6d53","#947b5c"];
    this.rect(bctx, "#4f4935", 453, 204, 107, 6);
    this.masonry(bctx, 482, 144, 62, 61, rock);
    for (const [x, y, h] of [[468,151,53],[533,141,63]]) {
      this.masonry(bctx, x, y, 21, h, rock);
      for (let j = 0; j < 3; j++) {
        const px = x - 1 + j * 8;
        this.rect(bctx, "#68513b", px, y - 5, 6, 9);
        this.rect(bctx, "#9c7651", px + 1, y - 7 - (j % 2) * 2, 4, 4);
      }
      this.rect(bctx, "#3e362a", x + 7, y + 15, 6, 13);
      this.rect(bctx, "#c28447", x + 9, y + 23, 2, 3);
    }
    for (let j = 0; j < 7; j++) {
      const x = 483 + j * 7;
      const y = 149 - (j % 2) * 5;
      this.rect(bctx, "#5a4432", x, y - 8, 5, 21);
      this.rect(bctx, "#b48455", x, y - 8, 2, 15);
      this.rect(bctx, "#795638", x + 1, y - 11, 3, 4);
    }
    this.rect(bctx, "#3c2e25", 496, 179, 32, 26);
    this.rect(bctx, "#3c2e25", 501, 171, 22, 12);
    this.rect(bctx, "#986f46", 494, 177, 4, 28);
    this.rect(bctx, "#986f46", 526, 177, 4, 28);
    this.rect(bctx, "#a78151", 497, 173, 30, 4);
    this.rect(bctx, "#755437", 501, 167, 22, 6);
    this.rect(bctx, "#563d2c", 499, 184, 26, 18);
    for (let i = 0; i < 5; i++) this.rect(bctx, "#624733", 500 + i * 5, 181, 2, 24);
    this.rect(bctx, "#833c2e", 507, 148, 12, 18);
    this.rect(bctx, "#af6245", 508, 148, 9, 15);
    this.rect(bctx, "#e2b47e", 510, 151, 5, 4);
    this.rect(bctx, "#71372b", 511, 152, 1, 1);
    this.rect(bctx, "#71372b", 514, 152, 1, 1);
    this.rect(bctx, "#e2b47e", 511, 155, 3, 2);
    return canvas;
  },

  drawCamp(ctx, time) {
    this.campCanvas ??= this.buildCampBase();
    ctx.drawImage(this.campCanvas, 450, 125);
    this.flag(ctx, 543, 119, time, -1, ["#903f31","#bd6248","#e7ba78"]);
    this.flag(ctx, 476, 129, time, -1, ["#903f31","#bd6248","#e7ba78"]);

    for (const x of [485, 536]) {
      const flicker = Math.floor(Math.sin(time * 11 + x) * 2);
      this.rect(ctx, "#44332a", x, 189, 2, 13);
      this.rect(ctx, "#d1713d", x - 2, 184 + flicker, 6, 6 - flicker);
      this.rect(ctx, "#f6b759", x, 185 + flicker, 2, 4);
    }
  },

  drawFarm(ctx, farm, plotX) {
    const plot = this.sprites.farmPlot;
    if (plot?.complete && plot.naturalWidth) {
      ctx.drawImage(plot, plotX - 32, this.ground - 8);
    }

    const crop = farm?.crop ? this.sprites[farm.crop] : null;
    if (crop?.complete && crop.naturalWidth) {
      for (const offset of [-18, 0, 18]) {
        ctx.drawImage(crop, plotX + offset - crop.naturalWidth / 2, this.ground - crop.naturalHeight + 3);
      }
    }
  },

  ensureBackdropReady() {
    if (this.backdropDirty) {
      this.buildBackground(this.backdrop.getContext("2d"));
      this.backdropDirty = false;
    }
    if (!this.previewBuffer) {
      this.previewBuffer = document.createElement("canvas");
    }
  },

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
    bctx.drawImage(arena?.naturalWidth ? this.getArenaBackdrop(arena) : this.backdrop, 0, 0);
    this.drawCastle(bctx, 0.5);
    bctx.save();
    bctx.translate(Constants.WORLD_WIDTH - this.width, 0);
    this.drawCamp(bctx, 0.5);
    bctx.restore();
    bctx.restore();
    return bctx;
  }
});
