"use strict";

Object.assign(Renderer.prototype, {
  getUnitSprite(spriteSheet, unit) {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return spriteSheet;
    const poisoned = Boolean(unit.poisoned);
    const flashing = unit.flash > 0;
    if (!poisoned && !flashing) return spriteSheet;
    const mode = poisoned && flashing ? "poisonFlash" : flashing ? "flash" : "poison";
    return this.getTintedSprite(spriteSheet, mode);
  },

  getPoisonedSprite(spriteSheet) {
    return this.getTintedSprite(spriteSheet, "poison");
  },

  getTintedSprite(spriteSheet, mode = "poison") {
    if (!spriteSheet?.complete || !spriteSheet.naturalWidth) return spriteSheet;
    const store = this.tintedSprites?.[mode] ?? this.poisonedSprites;
    const cached = store?.get(spriteSheet);
    if (cached) return cached;

    const w = spriteSheet.naturalWidth;
    const h = spriteSheet.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.complete = true;
    canvas.naturalWidth = w;
    canvas.naturalHeight = h;
    const cctx = canvas.getContext("2d");
    cctx.drawImage(spriteSheet, 0, 0);
    const applyPoison = mode === "poison" || mode === "poisonFlash";
    const applyFlash = mode === "flash" || mode === "poisonFlash";
    try {
      const img = cctx.getImageData(0, 0, w, h);
      const data = img.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        if (applyPoison) {
          r = r * 0.56 + 22;
          g = g * 0.88 + 46;
          b = b * 0.44 + 14;
        }
        if (applyFlash) {
          r *= 1.55;
          g *= 1.55;
          b *= 1.55;
        }
        data[i] = Math.min(255, Math.round(r));
        data[i + 1] = Math.min(255, Math.round(g));
        data[i + 2] = Math.min(255, Math.round(b));
      }
      cctx.putImageData(img, 0, 0);
    } catch {
      cctx.globalCompositeOperation = "source-atop";
      if (applyPoison) {
        cctx.fillStyle = "rgba(88, 152, 54, 0.48)";
        cctx.fillRect(0, 0, w, h);
      }
      if (applyFlash) {
        cctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        cctx.fillRect(0, 0, w, h);
      }
    }
    store?.set(spriteSheet, canvas);
    return canvas;
  },

  drawSwampMudPits(ctx, battle, time) {
    const sheet = this.sprites.swampMudPit;
    if (!sheet?.complete || !sheet.naturalWidth) return;
    const fw = 56;
    const fh = 20;
    for (const pit of battle.mudPits) {
      const frame = Math.floor(time * 4.5 + (pit.phase ?? 0)) % 4;
      ctx.drawImage(sheet, frame * fw, 0, fw, fh, Math.round(pit.x - fw / 2), this.ground - 9, fw, fh);
    }
  },

  drawSwampMudDebuff(ctx, unit, time) {
    const sheet = this.sprites.swampMudDebuff;
    if (!sheet?.complete || !sheet.naturalWidth) return;
    const fw = 28;
    const fh = 24;
    const frame = Math.floor(time * 7 + unit.x * 0.1) % 4;
    const footY = Math.round(this.ground + (unit.depth ?? 0));
    ctx.drawImage(sheet, frame * fw, 0, fw, fh, Math.round(unit.x - fw / 2), footY - fh + 3, fw, fh);
  },

  drawGoblinQueenBuff(ctx, unit, time) {
    const x = Math.round(unit.x);
    const y = Math.round(this.ground + unit.depth + 1);
    const radius = Math.max(7, Math.round(unit.getRenderConfig().shadowWidth / 2));
    const fade = Math.min(1, (unit.goblinQueenBuffUntil - time) * 3);
    ctx.save();
    ctx.globalAlpha = fade * (0.78 + 0.16 * Math.sin(time * 8));
    ctx.strokeStyle = "#8ef4af";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, 4, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = "#ffe08a";
    ctx.fillRect(x - 1, y + 3, 3, 2);
    ctx.restore();
  },

  drawBossSkillWarning(ctx, boss) {
    const start = Math.round(boss.skillStartX);
    const end = Math.round(boss.x);
    const width = end - start;
    const y = this.ground - 4;
    const remaining = ArenaBoss.skillWarningDuration - boss.actionAge;

    ctx.save();
    ctx.fillStyle = boss.profile.indicator;
    ctx.globalAlpha = 0.24 + (1 - remaining / ArenaBoss.skillWarningDuration) * 0.25;
    ctx.fillRect(start, y, width, 19);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#251c27";
    ctx.lineWidth = 3;
    ctx.strokeRect(start, y, width, 19);
    ctx.strokeStyle = boss.profile.indicator;
    ctx.lineWidth = 1;
    ctx.strokeRect(start, y, width, 19);
    ctx.fillRect(start - 1, y - 3, 3, 25);
    ctx.fillRect(end - 1, y - 3, 3, 25);
    ctx.fillRect(start, y + 17, width * remaining / ArenaBoss.skillWarningDuration, 2);

    ctx.textAlign = "center";
    ctx.font = "bold 10px monospace";
    ctx.strokeStyle = "#191621";
    ctx.lineWidth = 3;
    ctx.fillStyle = "#fff9ec";
    ctx.strokeText(boss.profile.skillWarning, start + width / 2, y + 31);
    ctx.fillText(boss.profile.skillWarning, start + width / 2, y + 31);
    ctx.restore();
  },

  isValidFlagPoint(worldX, worldY) {
    const def = Constants.DEFEND;
    const maxX = Constants.BASES.enemy.x - def.maxMarginFromEnemyBase;
    const minY = this.ground - def.groundToleranceTop;
    const maxY = this.ground + def.groundToleranceBottom;
    return worldX >= def.minX && worldX <= maxX && worldY >= minY && worldY <= maxY;
  },

  drawSingleFlag(ctx, x, y, color, tag, time, ghost = false) {
    const px = Math.round(x);
    const py = Math.round(y);
    const flutter = Math.round(Math.sin(time * 7 + x * 0.05));

    ctx.save();
    if (ghost) ctx.globalAlpha = 0.72;
    ctx.fillStyle = "rgba(32, 26, 18, 0.35)";
    ctx.fillRect(px - 5, py - 1, 10, 2);

    const detectEnd = Math.min(Constants.BASES.enemy.x - 18, px + Constants.DEFEND.detectRange);
    ctx.strokeStyle = color;
    ctx.globalAlpha = ghost ? 0.55 : 0.34;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(detectEnd, py);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = ghost ? 0.8 : 1;
    ctx.fillStyle = "#3b2817";
    ctx.fillRect(px - 1, py - 24, 3, 24);
    ctx.fillStyle = "#7a5330";
    ctx.fillRect(px, py - 23, 1, 22);
    ctx.fillStyle = "#f4cf7a";
    ctx.fillRect(px - 1, py - 25, 3, 2);

    ctx.fillStyle = "#2b1d10";
    ctx.fillRect(px + 2, py - 23, 13, 10);
    ctx.fillStyle = color;
    ctx.fillRect(px + 2, py - 22, 11, 8);
    ctx.fillRect(px + 13, py - 21 + flutter, 3, 5);

    ctx.fillStyle = "#20170e";
    ctx.font = "bold 7px monospace";
    ctx.textAlign = "left";
    ctx.fillText(tag, px + 4, py - 15);
    ctx.restore();
  },

  drawSelectionHighlights(ctx, battle, time) {
    const selected = battle.getSelectedUnits?.() ?? [];
    if (selected.length === 0) return;

    const pulse = 0.72 + Math.sin(time * 6) * 0.28;
    ctx.save();
    for (const unit of selected) {
      const x = Math.round(unit.x);
      const footY = Math.round(this.ground + (unit.depth ?? 0) + 1);
      ctx.fillStyle = "rgba(120, 240, 156, 0.22)";
      ctx.strokeStyle = `rgba(138, 255, 168, ${pulse.toFixed(2)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x, footY, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  },

  drawSelectionBox(ctx, uiState) {
    const box = uiState?.selectionBox;
    if (!box) return;
    const x = Math.round(Math.min(box.startX, box.endX));
    const y = Math.round(Math.min(box.startY, box.endY));
    const w = Math.round(Math.abs(box.endX - box.startX));
    const h = Math.round(Math.abs(box.endY - box.startY));
    if (w < 2 && h < 2) return;

    ctx.save();
    ctx.fillStyle = "rgba(116, 222, 132, 0.16)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#8df5a0";
    ctx.lineWidth = 1.25;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.restore();
  },

  drawGuardFlags(ctx, battle, time, uiState) {
    const def = Constants.DEFEND;

    if (uiState?.placingFlag) {
      const minX = def.minX;
      const maxX = Constants.BASES.enemy.x - def.maxMarginFromEnemyBase;
      const minY = this.ground - def.groundToleranceTop;
      const bandH = def.groundToleranceTop + def.groundToleranceBottom;

      ctx.save();
      ctx.fillStyle = "rgba(116, 222, 132, 0.18)";
      ctx.fillRect(minX, minY, maxX - minX, bandH);
      ctx.strokeStyle = "rgba(166, 250, 176, 0.72)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(minX + 0.5, minY + 0.5, maxX - minX - 1, bandH - 1);
      ctx.setLineDash([]);

      if (uiState.hoverWorld) {
        const hx = Math.round(uiState.hoverWorld.x);
        const hy = Math.round(uiState.hoverWorld.y);
        if (this.isValidFlagPoint(hx, hy)) {
          this.drawSingleFlag(ctx, hx, this.ground + 3, "#ffcf75", "B", time, true);
          const selected = battle.getSelectedUnits?.() ?? [];
          const seenKinds = new Set();
          for (const unit of selected) {
            if (seenKinds.has(unit.kind)) continue;
            seenKinds.add(unit.kind);
            const back = def.formationBackOffsets?.[unit.kind] ?? 0;
            const slotX = Math.round(Math.max(Constants.BASES.hero.x + 10, hx - back));
            ctx.fillStyle = def.colors?.[unit.kind] ?? "#ffcf75";
            ctx.globalAlpha = 0.78;
            ctx.beginPath();
            ctx.arc(slotX, this.ground + 2, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        } else {
          ctx.strokeStyle = "#ff6859";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(hx - 5, hy - 5);
          ctx.lineTo(hx + 5, hy + 5);
          ctx.moveTo(hx + 5, hy - 5);
          ctx.lineTo(hx - 5, hy + 5);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    if (uiState?.invalidFlagUntil > performance.now() && uiState.invalidWorld) {
      const ix = Math.round(uiState.invalidWorld.x);
      const iy = Math.round(uiState.invalidWorld.y);
      const alpha = Math.max(0, Math.min(1, (uiState.invalidFlagUntil - performance.now()) / 900));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#ff5a4c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ix - 7, iy - 7);
      ctx.lineTo(ix + 7, iy + 7);
      ctx.moveTo(ix + 7, iy - 7);
      ctx.lineTo(ix - 7, iy + 7);
      ctx.stroke();
      ctx.restore();
    }

    const placedCounts = new Map();
    for (const flag of battle.guardFlags ?? []) {
      const bucket = Math.round(flag.x / 6);
      const offsetIdx = placedCounts.get(bucket) ?? 0;
      placedCounts.set(bucket, offsetIdx + 1);
      const drawX = flag.x + offsetIdx * 4;
      const drawY = this.ground + 3 - (offsetIdx % 3) * 3;
      const tag = flag.count > 1 ? String(flag.count) : "B";
      this.drawSingleFlag(ctx, drawX, drawY, flag.color ?? "#ffcf75", tag, time, false);
    }
  },

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
    ctx.drawImage(spriteSheet, frame * frameW, srcY, frameW, srcH, destX, destY, frameW, srcH);
    ctx.restore();
  },

  drawFrostStacks(ctx, unit) {
    const x = Math.round(unit.x - (unit.frostStacks * 5 - 1) / 2);
    const y = Math.round(this.ground + unit.depth - unit.getRenderConfig().barYOffset - 7);
    for (let i = 0; i < unit.frostStacks; i++) {
      this.rect(ctx, "#224263", x + i * 5, y, 4, 5);
      this.rect(ctx, "#a5efff", x + i * 5 + 1, y + 1, 2, 3);
    }
  },

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
});
