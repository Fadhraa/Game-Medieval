"use strict";

Object.assign(Renderer.prototype, {
  syncHud(battle, ui, uiState = null) {
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

    const heroPct = (battle.heroHp / Constants.BASES.hero.hp) * 100;
    const enemyPct = (battle.enemyHp / Constants.BASES.enemy.hp) * 100;
    textValue(ui.heroHp, `${Math.ceil(battle.heroHp)} / ${Constants.BASES.hero.hp}`);
    textValue(ui.enemyHp, `${Math.ceil(battle.enemyHp)} / ${Constants.BASES.enemy.hp}`);

    ui.heroBar.firstElementChild.style.width = heroPct + "%";
    ui.enemyBar.firstElementChild.style.width = enemyPct + "%";
    ui.heroBar.setAttribute("aria-valuenow", String(Math.ceil(battle.heroHp)));
    ui.enemyBar.setAttribute("aria-valuenow", String(Math.ceil(battle.enemyHp)));

    const seconds = Math.floor(battle.elapsed);
    const clock = [Math.floor(seconds / 60), seconds % 60]
      .map((v) => String(v).padStart(2, "0"))
      .join(":");
    textValue(ui.clock, clock);
    if (ui.selectModeToggle) {
      const boxMode = Boolean(uiState?.boxSelectMode);
      ui.selectModeToggle.classList.toggle("is-active", boxMode);
      ui.selectModeToggle.setAttribute("aria-pressed", String(boxMode));
    }

    textValue(ui.breadCount, String(battle.bread));
    const farmers = battle.farmersByPlot;
    const farmerCount = farmers.filter(Boolean).length;
    const farmStatus = farmerCount === 0 ? "1 roti untuk petani" :
      farmers.filter(Boolean).map(farmer => farmer.status).join(" · ");
    textValue(ui.farmStatus, farmStatus);
    textValue(ui.farmerLabel, `${farmerCount}/${farmers.length} aktif`);
    ui.summonFarmer.disabled = battle.openFarmPlot === -1;

    let knights = 0, wizards = 0, kiras = 0, james = 0, lynces = 0, monsters = 0;
    for (const u of battle.units) {
      if (u.side === -1) monsters++;
      else if (u.kind === "knight") knights++;
      else if (u.kind === "wizard") wizards++;
      else if (u.kind === "kira") kiras++;
      else if (u.kind === "james") james++;
      else if (u.kind === "lynce") lynces++;
    }
    textValue(ui.unitCount, `${knights} ksatria · ${wizards} wizard · ${kiras} kira · ${james} James · ${lynces} Lynce · ${monsters} monster di medan`);

    const active = battle.mode === "playing";
    const availableBread = battle.availableTroopBread;
    const updateSummon = (kind, button, label, cost, next) => {
      const unlocked = Progress.canRecruit(kind, battle.unlockedHeroes);
      button.hidden = !unlocked;
      const remaining = Math.max(0, next - battle.elapsed);
      const needsBread = availableBread < cost;
      const countdown = Math.ceil(remaining * 10) / 10;
      textValue(label, remaining > 0 ? countdown.toFixed(1).replace(".", ",") + " dtk" :
        !active ? "Panggil" : needsBread ? "Kurang roti" : "Panggil");
      button.disabled = !unlocked || !active || needsBread || remaining > 0;
    };

    updateSummon("knight", ui.summon, ui.summonLabel, Constants.KNIGHT_COST, battle.nextSummon);
    updateSummon("wizard", ui.summonWizard, ui.wizardLabel, Constants.WIZARD_COST, battle.nextWizard);
    updateSummon("kira", ui.summonKira, ui.kiraLabel, Constants.KIRA_COST, battle.nextKira);
    updateSummon("james", ui.summonJames, ui.jamesLabel, Constants.JAMES_COST, battle.nextJames);
    updateSummon("lynce", ui.summonLynce, ui.lynceLabel, Constants.LYNCE_COST, battle.nextLynce);

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

    const selectedUnits = active ? battle.getSelectedUnits?.() ?? [] : [];
    const roleCounts = battle.getAliveRoleCounts?.() ?? { combat: 0, melee: 0, ranged: 0, farmers: 0, total: 0 };
    if (ui.countAllHeroes) textValue(ui.countAllHeroes, String(roleCounts.combat));
    if (ui.countMeleeHeroes) textValue(ui.countMeleeHeroes, String(roleCounts.melee));
    if (ui.countRangedHeroes) textValue(ui.countRangedHeroes, String(roleCounts.ranged));
    if (ui.aliveSummary) textValue(ui.aliveSummary, `Hidup: ${roleCounts.total} (${roleCounts.farmers} Petani)`);
    for (const [btn, role, count] of [
      [ui.selectAllHeroes, "all", roleCounts.combat],
      [ui.selectMeleeHeroes, "melee", roleCounts.melee],
      [ui.selectRangedHeroes, "ranged", roleCounts.ranged]
    ]) {
      if (!btn) continue;
      const isActive = active && Boolean(battle.matchesSelectedRole?.(role));
      btn.disabled = !active || count === 0;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    }

    const showCmdBar = active && selectedUnits.length > 0;
    if (ui.deployCards && ui.selectionCommandBar) {
      ui.deployCards.hidden = showCmdBar;
      ui.selectionCommandBar.hidden = !showCmdBar;
      if (showCmdBar) {
        const counts = new Map();
        for (const u of selectedUnits) {
          counts.set(u.kind, (counts.get(u.kind) ?? 0) + 1);
        }
        const names = { knight: "Ksatria", james: "James", lynce: "Lynce", wizard: "Wizard", kira: "Kira" };
        const breakdown = [...counts.entries()]
          .map(([kind, count]) => `${count} ${names[kind] ?? kind}`)
          .join(" · ");
        textValue(ui.selectionSummary, `${selectedUnits.length} dipilih (${breakdown})`);
        if (ui.cmdDefend) {
          const isPlacing = Boolean(uiState?.placingFlag);
          ui.cmdDefend.classList.toggle("is-placing", isPlacing);
          textValue(ui.cmdDefend, isPlacing ? "📍 Klik Tanah Bertahan" : "🛡 Bertahan (Bendera)");
        }
      }
    }
  },

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
          if (art === "kiraPortrait") {
            const scale = Math.min(item.width / sprite.naturalWidth, item.height / sprite.naturalHeight);
            const w = Math.round(sprite.naturalWidth * scale);
            const h = Math.round(sprite.naturalHeight * scale);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sprite, Math.round((item.width - w) / 2), item.height - h, w, h);
            continue;
          }
          if (art === "frostGolem") {
            const drawH = item.height * 0.86;
            const drawW = drawH * sprite.naturalWidth / sprite.naturalHeight;
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sprite, Math.round((item.width - drawW) / 2), Math.round(item.height - drawH - 2), Math.round(drawW), Math.round(drawH));
            ctx.restore();
            continue;
          }
          const cfg = this.getPortraitConfig(art);
          const ratio = item.width / 24;
          ctx.save();
          ctx.translate(Math.round(cfg.portraitX * ratio), Math.round(22 * item.height / 24));
          ctx.scale(cfg.portraitScale * ratio, cfg.portraitScale * ratio);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(sprite, 0, 0, cfg.frameWidth, cfg.frameHeight, -cfg.originX, -cfg.feetOrigin, cfg.frameWidth, cfg.frameHeight);
          ctx.restore();
        }
      }
    }
  },

  getPortraitConfig(kind) {
    if (kind === "goblinQueen") return { ...GoblinQueen.spriteGeometry, portraitX: 10, portraitScale: 0.21 };
    if (kind === "wizard") return { frameWidth: 48, frameHeight: 48, originX: 23, feetOrigin: 43, portraitX: 12, portraitScale: 0.55 };
    if (kind === "goblin") return { frameWidth: 48, frameHeight: 48, originX: 28, feetOrigin: 43, portraitX: 13, portraitScale: 0.72 };
    if (kind === "archer_goblin") return { frameWidth: 48, frameHeight: 48, originX: 24, feetOrigin: 43, portraitX: 13, portraitScale: 0.72 };
    if (kind === "minotaur") return { frameWidth: 316, frameHeight: 311, originX: 148, feetOrigin: 298, portraitX: 18, portraitScale: 0.13 };
    if (kind === "hollowMask") return { ...HollowMask.spriteGeometry, portraitX: 12, portraitScale: 0.34 };
    if (kind === "witcher") return { frameWidth: 64, frameHeight: 64, originX: 34, feetOrigin: 55, portraitX: 13, portraitScale: 0.56 };
    if (kind === "commander") return { frameWidth: 128, frameHeight: 120, originX: 64, feetOrigin: 106, portraitX: 13, portraitScale: 0.30 };
    if (kind === "rootGiant") return { frameWidth: 96, frameHeight: 88, originX: 48, feetOrigin: 82, portraitX: 13, portraitScale: 0.36 };
    if (kind === "farmer") return { frameWidth: 48, frameHeight: 48, originX: 24, feetOrigin: 42, portraitX: 12, portraitScale: 0.62 };
    if (kind === "james") return { ...James.spriteGeometry, portraitX: 11, portraitScale: 0.39 };
    if (kind === "kira") return { ...Kira.spriteGeometry, portraitX: 12, portraitScale: 0.62 };
    if (kind === "lynce") return { ...Lynce.spriteGeometry, portraitX: 12, portraitScale: 0.31 };
    return { frameWidth: 48, frameHeight: 48, originX: 20, feetOrigin: 43, portraitX: 11, portraitScale: 0.66 };
  },

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
      ctx.drawImage(sprite, 0, 0, cfg.frameWidth, cfg.frameHeight, -cfg.originX, -cfg.feetOrigin, cfg.frameWidth, cfg.frameHeight);
    }
    ctx.restore();
  },

  drawStagePreview(canvas, chapter, stage) {
    if (!canvas) return;
    const cropX = Math.max(0, Math.min(Constants.WORLD_WIDTH - this.width, chapter?.cameraCropX ?? 220));
    this.renderArenaSceneToBuffer(this.width, this.height, chapter, cropX);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.previewBuffer, 0, 0, canvas.width, canvas.height);

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "rgba(24, 18, 12, 0.14)");
    grad.addColorStop(0.7, "rgba(24, 18, 12, 0)");
    grad.addColorStop(1, "rgba(24, 18, 12, 0.42)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  },

  drawChapterIllustration(canvas, chapter) {
    if (!canvas) return;
    const viewW = Math.round(this.height * canvas.width / canvas.height);
    const maxCrop = Math.max(0, Constants.WORLD_WIDTH - viewW);
    const cropX = Math.max(0, Math.min(maxCrop, chapter?.cameraCropX ?? 220));
    const bctx = this.renderArenaSceneToBuffer(viewW, this.height, chapter, cropX);

    const featured = chapter?.featuredUnits ?? ["goblin"];
    this.drawDioramaUnit(bctx, "knight", Math.round(viewW * 0.25), this.ground + 3);
    if (featured[0]) this.drawDioramaUnit(bctx, featured[0], Math.round(viewW * 0.64), this.ground + 2);
    if (featured[1]) this.drawDioramaUnit(bctx, featured[1], Math.round(viewW * 0.80), this.ground + 5);

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.previewBuffer, 0, 0, canvas.width, canvas.height);

    const vignette = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.72
    );
    vignette.addColorStop(0, "rgba(45, 29, 14, 0)");
    vignette.addColorStop(1, "rgba(45, 29, 14, 0.26)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
});
