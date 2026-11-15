"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const ui = Object.fromEntries(
    [
      "scene",
      "courtyardArt", "lobbyScreen", "lobbyTitle", "enterBattle", "enterBarracks",
      "campaignScreen", "campaignTitle", "leaveCampaign", "chapterList", "battleBriefing",
      "barracksScreen", "barracksTitle", "leaveBarracks", "upgradeCards", "upgradeStatus",
      "heroInfoDialog", "heroInfoTitle", "heroInfoContext", "heroInfoStats", "heroInfoAbility",
      "resultDialog", "resultTitle", "resultDetails", "resultLobby", "resultBarracks", "resultProgress", "resultLevels", "resultNext", "resultRetry",
      "granaryScreen", "granaryTitle", "enterGranary", "leaveGranary", "granaryCards", "granaryStatus",
      "plotUpgrade", "plotCount", "plotRequirement", "buySecondPlot",
      "lobbyProgress", "progressStatus", "resetProgress", "resetDialog", "cancelReset", "confirmReset",
      "exportProgress", "importProgress", "progressFile", "importDialog", "importDetails", "confirmImport", "cancelImport",
      "saveStatus", "battleScreen", "title", "leaveBattle", "coinBalance",
      "summonJames", "jamesLabel", "summonLynce", "lynceLabel",
      "baseSkillButton", "baseSkillLabel",
      "cameraPosition",
      "cameraHome",
      "cameraEnemy",
      "selectModeToggle",
      "deployCards",
      "selectionCommandBar",
      "selectionSummary",
      "cmdAdvance",
      "cmdDefend",
      "cmdClearSelect",
      "field",
      "pause",
      "fullscreenBattle",
      "openSettings", "settingsDialog", "closeSettings", "testEffects",
      "musicVolume", "musicVolumeValue", "effectsVolume", "effectsVolumeValue",
      "overlay",
      "missionTitle",
      "missionText",
      "play",
      "restart",
      "summon",
      "summonLabel",
      "summonWizard",
      "wizardLabel",
      "summonKira",
      "kiraLabel",
      "status",
      "heroHp",
      "heroBar",
      "enemyHp",
      "enemyBar",
      "clock",
      "breadCount",
      "farmStatus",
      "summonFarmer",
      "farmerLabel",
      "unitCount"
    ].map((id) => [id, document.getElementById(id)])
  );

  const battle = new Battle("ready");
  const renderer = new Renderer(ui.scene);
  let profile = Progress.load();
  let screen = "lobby";
  let selectedStage = campaignStages[0];
  let activeChapterIndex = 0;
  let activeSidebarStage = null;
  const battleUiState = {
    boxSelectMode: false,
    selectionBox: null,
    placingFlag: false,
    hoverWorld: null,
    invalidFlagUntil: 0,
    invalidWorld: null
  };
  let lastFrame = performance.now();

  renderer.onSpritesUpdated = () => {
    if (screen === "campaign") refreshCampaignCanvases();
  };

  function saveProfile() {
    const saved = Progress.save(profile);
    ui.saveStatus.hidden = saved;
    return saved;
  }

  function syncCoins() {
    ui.coinBalance.textContent = Progress.formatCoins(profile.coins);
  }

  function showScreen(name, heading) {
    screen = name;
    if (name !== "battle") {
      leaveFullscreen();
      window.audioManager?.playLobbyBgm();
    }
    for (const key of ["lobby", "campaign", "barracks", "granary", "battle"]) {
      ui[key + "Screen"].hidden = key !== name;
    }
    document.body.classList.toggle("battle-view", name === "battle");
    ui.lobbyProgress.hidden = name !== "lobby";
    syncCoins();
    if (heading) {
      window.scrollTo({ top: 0, behavior: "instant" });
      heading.focus({ preventScroll: true });
    }
  }

  const heroCards = {
    knight: { unit: Knight, cooldown: Constants.SUMMON_COOLDOWN, damageType: "Fisik", name: "Ksatria Pedang", role: "Fighter", summary: "Serangan cepat untuk menjaga garis depan." },
    wizard: { unit: Wizard, cooldown: Constants.WIZARD_COOLDOWN, damageType: "Sihir", name: "Wizard Api", role: "Wizard", summary: "Fireball melukai beberapa musuh sekaligus." },
    kira: { unit: Kira, cooldown: Constants.KIRA_COOLDOWN, damageType: "Sihir", name: "Kira", role: "Healer", summary: "Memulihkan rekan sesuai HP maks. Kira atau menyerang dengan petir." },
    james: { unit: James, cooldown: Constants.JAMES_COOLDOWN, damageType: "Fisik", name: "James", role: "Tanker", summary: "Perisainya membuat musuh terkena stun." },
    lynce: { unit: Lynce, cooldown: Constants.LYNCE_COOLDOWN, damageType: "Fisik", name: "Lynce", role: "Marksman", summary: "Tembakan ketiga menembus barisan musuh." }
  };

  const statLabels = { hp: "HP maks.", damage: "ATK", splashDamage: "Sebaran", healPercent: "Pemulihan" };

  function formatHeroStat(stat, value) {
    const percent = stat === "healPercent";
    return value.toLocaleString("id-ID", { maximumFractionDigits: percent ? 1 : 0 }) + (percent ? "%" : "");
  }

  const detailNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

  function openHeroInfo(kind) {
    const hero = heroCards[kind];
    const locked = !Progress.canRecruit(kind, profile.unlockedHeroes);
    const rank = locked ? 0 : profile.ranks[kind];
    const unit = new hero.unit(0, rank);
    const number = value => detailNumber.format(value);
    const rows = [
      ["Biaya panggil", unit.cost + " roti"],
      ["Jeda panggil", number(hero.cooldown) + " dtk"],
      ["HP maksimum", kind === "james" ? formatHeroStat("hp", unit.maxHp) : number(unit.maxHp)],
      ["ATK", kind === "james" ? formatHeroStat("damage", unit.damage) : number(unit.damage)],
      ["Jenis damage", hero.damageType],
      ["Jangkauan serang", number(unit.reach) + " px"],
      ["Interval serangan dasar", number(unit.attackEvery) + " dtk"],
      ["Kecepatan serang dasar", number(1 / unit.attackEvery) + " serangan/dtk"],
      ["Kecepatan jalan", number(unit.speed) + " px/dtk"]
    ];
    let ability = hero.summary;
    if (kind === "knight") {
      ability = "Maksimal " + Constants.KNIGHTS_PER_TARGET + " Ksatria dapat menyerang target yang sama dalam satu interval.";
    } else if (kind === "wizard") {
      rows.push(["Damage sebaran", number(unit.splashDamage)], ["Radius sebaran", Constants.FIREBALL_RADIUS + " px"]);
      ability = "Fireball memberi damage utama pada target pertama dan damage sebaran pada musuh lain di dekatnya.";
    } else if (kind === "kira") {
      rows.push(
        ["Jangkauan heal", number(unit.healReach) + " px"],
        ["Interval heal dasar", number(unit.healSpeed) + " dtk"],
        ["Pemulihan per heal", number(unit.healAmount()) + " HP · " + number(unit.healPower * 100) + "% HP Kira"]
      );
      ability = "Memprioritaskan satu rekan terluka di depan. Kira menembakkan petir saat tidak perlu menyembuhkan.";
    } else if (kind === "james") {
      ability = "Setelah tiga serangan yang melukai musuh, serangan berikutnya memberi stun selama 1 detik.";
    } else if (kind === "lynce") {
      const first = number(Lynce.skillDamageScale * 100);
      const falloff = number(Lynce.skillFalloffPerEnemy * 100);
      const minimum = number(Lynce.skillMinDamageScale * 100);
      ability = "Tembakan ketiga menembus barisan. Target pertama menerima " + first +
        "% dari ATK. Damage turun " + falloff +
        " poin persentase per target, dengan batas bawah " + minimum + "% dari ATK.";
    }

    ui.heroInfoTitle.textContent = hero.name;
    ui.heroInfoContext.textContent = hero.role + " · Level " + (rank + 1) + (locked ? " · Terkunci" : "");
    ui.heroInfoStats.replaceChildren(...rows.map(([name, value]) => {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = name;
      detail.textContent = value;
      row.append(term, detail);
      return row;
    }));
    ui.heroInfoAbility.textContent = ability;
    ui.heroInfoDialog.showModal();
  }

  function refreshHeroCard(card, kind, rank) {
    const locked = !Progress.canRecruit(kind, profile.unlockedHeroes);
    const maxRank = Progress.maxRankFor(kind);
    const max = rank === maxRank;
    const cost = locked ? Progress.heroUnlockCosts[kind] : Progress.cost(rank);
    card.classList.toggle("is-locked", locked);
    card.querySelector(".hero-level").textContent = locked ? "Terkunci" : "Level " + (rank + 1) + " / " + (maxRank + 1);
    const progress = card.querySelector("progress");
    progress.hidden = locked;
    progress.max = maxRank + 1;
    progress.value = rank + 1;
    const stats = Progress.stats(kind, locked ? 0 : rank);
    const next = locked || max ? null : Progress.stats(kind, rank + 1);
    card.querySelector(".hero-stat-heading").textContent = locked ? "Atribut level 1" : next ? "Atribut · Sekarang → Berikutnya" : "Atribut maksimum";
    const statList = card.querySelector(".hero-stats");
    const rows = Object.entries(stats).map(([stat, value]) => {
      const row = document.createElement("div");
      const label = document.createElement("dt");
      const values = document.createElement("dd");
      label.textContent = statLabels[stat];
      values.textContent = formatHeroStat(stat, value);
      if (next) {
        const upgrade = document.createElement("span");
        upgrade.textContent = " → " + formatHeroStat(stat, next[stat]);
        values.append(upgrade);
      }
      row.append(label, values);
      return row;
    });
    statList.replaceChildren(...rows);
    const button = card.querySelector(".hero-button");
    const action = locked ? "Buka hero" : max ? "Level maksimum" : "Upgrade";
    button.querySelector(".hero-action").textContent = action;
    const price = button.querySelector(".hero-price");
    price.hidden = !locked && max;
    price.textContent = Progress.formatCoins(cost) + " koin";
    button.setAttribute("aria-label", action + " " + heroCards[kind].name + (price.hidden ? "" : " · " + price.textContent));
    button.disabled = (!locked && max) || profile.coins < cost;
  }

  function farmStatText(rank) {
    const { breadPerDelivery, speed, harvestSeconds } = Progress.farmStats(rank);
    const speedBonus = Math.round((speed / Constants.FARM.speed - 1) * 100);
    const harvestBonus = Math.round((1 - harvestSeconds / Constants.FARM.harvestSeconds) * 100);
    const stats = [breadPerDelivery + " roti per setoran"];
    if (speedBonus) stats.push("Kecepatan jalan +" + speedBonus + "%");
    if (harvestBonus) stats.push("Durasi panen −" + harvestBonus + "%");
    return stats.join(" · ");
  }

  function refreshUpgrades(container) {
    for (const card of container.querySelectorAll("[data-kind]")) {
      const kind = card.dataset.kind;
      const rank = profile.ranks[kind];
      if (kind !== "farm") {
        refreshHeroCard(card, kind, rank);
        continue;
      }
      const cost = Progress.cost(rank);
      const maxRank = Progress.maxRankFor(kind);
      const max = rank === maxRank;
      card.querySelector(".rank").textContent = "Level " + (rank + 1) + " / " + (maxRank + 1);
      card.querySelector(".current-stat").textContent = farmStatText(rank);
      card.querySelector(".next-stat").textContent = max ? "Level maksimum" : "Berikutnya: " + farmStatText(rank + 1);
      const button = card.querySelector("button");
      button.disabled = max || profile.coins < cost;
      button.textContent = max ? "Maksimum" : "Upgrade · " + Progress.formatCoins(cost) + " koin";
    }
    if (container === ui.granaryCards) refreshPlotUpgrade();
    syncCoins();
  }

  function refreshPlotUpgrade() {
    const owned = profile.hasSecondPlot;
    const unlocked = Progress.canUnlockSecondPlot(profile);
    ui.plotCount.textContent = owned ? "2 petak · Maks. 2 petani" : "1 petak · Maks. 1 petani";
    ui.plotRequirement.textContent = owned ? "Panggil petani kedua dengan 1 roti." :
      unlocked ? "Tambah 1 petak dan naikkan batas menjadi 2 petani." :
        "Tersedia setelah Chapter 2 terbuka.";
    ui.buySecondPlot.disabled = owned || !unlocked || profile.coins < Progress.secondPlotCost;
    ui.buySecondPlot.textContent = owned ? "Sudah dibeli" : "Beli · " + Progress.formatCoins(Progress.secondPlotCost) + " koin";
  }

  for (const [kind, upgrade] of Object.entries(Progress.upgrades)) {
    const card = document.createElement("article");
    card.className = "upgrade-card";
    card.dataset.kind = kind;
    const isFarm = kind === "farm";
    const hero = heroCards[kind];
    if (isFarm) {
      card.innerHTML = '<div class="upgrade-header"><canvas width="24" height="24" aria-hidden="true"></canvas><h2></h2></div><p class="rank"></p><p class="current-stat"></p><p class="next-stat"></p><button class="gold-button" type="button"></button>';
    } else {
      card.classList.add("hero-card");
      card.innerHTML = `
        <div class="hero-portrait">
          <span class="hero-level"></span>
          <canvas width="144" height="144" aria-hidden="true"></canvas>
        </div>
        <div class="hero-card-body">
          <p class="hero-role"></p>
          <h2></h2>
          <div class="hero-meta">
            <span class="hero-bread"><canvas width="24" height="24" data-art="bread" aria-hidden="true"></canvas><span></span></span>
            <button class="secondary hero-info-button" type="button" aria-haspopup="dialog">Info</button>
          </div>
          <progress aria-label="Level hero"></progress>
          <p class="hero-summary"></p>
          <p class="hero-stat-heading"></p>
          <dl class="hero-stats"></dl>
          <button class="gold-button hero-button" type="button">
            <span class="hero-action"></span><span class="hero-price"></span>
          </button>
        </div>`;
      card.querySelector(".hero-role").textContent = hero.role;
      card.querySelector(".hero-summary").textContent = hero.summary;
      card.querySelector(".hero-bread span").textContent = "Panggil · " + new hero.unit().cost + " roti";
      const info = card.querySelector(".hero-info-button");
      info.setAttribute("aria-label", "Info " + hero.name);
      info.addEventListener("click", () => openHeroInfo(kind));
    }
    const menu = isFarm ? "granary" : "barracks";
    const container = isFarm ? ui.granaryCards : ui.upgradeCards;
    const status = isFarm ? ui.granaryStatus : ui.upgradeStatus;
    const art = kind === "kira" ? "kiraPortrait" : kind;
    card.querySelector("canvas").dataset.art = isFarm ? "farmer" : art;
    card.querySelector("h2").textContent = hero?.name ?? upgrade.name;
    card.querySelector(".gold-button").addEventListener("click", () => {
      if (screen !== menu) return;
      const unlock = !isFarm && !Progress.canRecruit(kind, profile.unlockedHeroes);
      if (!(unlock ? Progress.buyHero(profile, kind) : Progress.buy(profile, kind))) return;
      saveProfile();
      refreshUpgrades(container);
      status.textContent = unlock ? upgrade.name + " siap dipanggil di medan pertempuran." :
        upgrade.name + " naik ke level " + (profile.ranks[kind] + 1) + ".";
    });
    if (isFarm) ui.plotUpgrade.before(card);
    else container.append(card);
  }

  function openBarracks() {
    ui.upgradeStatus.textContent = "";
    refreshUpgrades(ui.upgradeCards);
    showScreen("barracks", ui.barracksTitle);
  }

  function openLobby() {
    battle.mode = "ready";
    showScreen("lobby", ui.lobbyTitle);
  }

  function getStageMonsters(stage) {
    const order = stage?.enemies?.order ?? "";
    const catalog = {
      goblin: { key: "goblin", name: "Goblin", role: "Penyerbu Cepat", isBoss: false },
      archer_goblin: { key: "archer_goblin", name: "Goblin Pemanah", role: "Jarak Jauh", isBoss: false },
      minotaur: { key: "minotaur", name: "Minotaur", role: "Tank Berat", isBoss: false },
      hollowMask: { key: "hollowMask", name: "Topeng Hampa", role: "Assassin Elite", isBoss: false },
      witcher: { key: "witcher", name: "Witcher", role: "Heal & Summon", isBoss: false },
      commander: { key: "commander", name: "Panglima Mahkota Retak", role: "Bos Chapter 4", isBoss: true },
      rootGiant: { key: "rootGiant", name: "Raksasa Akar", role: "Bos Chapter 5", isBoss: true },
      frostGolem: { key: "frostGolem", name: "Golem Es", role: "Bos Chapter 6", isBoss: true }
    };
    const list = [];
    if (order.includes("G")) list.push(catalog.goblin);
    if (order.includes("A")) list.push(catalog.archer_goblin);
    if (order.includes("M")) list.push(catalog.minotaur);
    if (stage?.enemies?.witcherFirst !== undefined || (stage?.id ?? 0) >= 6) {
      list.push(catalog.witcher);
    }
    if (stage?.enemies?.hollowMaskFirst !== undefined) list.push(catalog.hollowMask);
    if (stage?.boss && catalog[stage.boss]) {
      list.push(catalog[stage.boss]);
    }
    return list;
  }

  function refreshCampaignCanvases() {
    const chapter = Campaign[activeChapterIndex];
    const chapterCanvas = ui.chapterList.querySelector(".chapter-canvas");
    if (chapterCanvas && chapter) {
      renderer.drawChapterIllustration(chapterCanvas, chapter);
    }
    const arenaCanvas = ui.chapterList.querySelector(".sidebar-arena-canvas");
    if (arenaCanvas && chapter && activeSidebarStage) {
      renderer.drawStagePreview(arenaCanvas, chapter, activeSidebarStage);
    }
    renderer.renderIcons();
  }

  function syncCampaignSidebar() {
    const backdrop = ui.chapterList.querySelector(".stage-sidebar-backdrop");
    const sidebar = ui.chapterList.querySelector(".stage-sidebar");
    if (!backdrop || !sidebar) return;

    for (const item of ui.chapterList.querySelectorAll(".storybook-stage-item")) {
      const stageId = Number(item.dataset.stageId);
      item.classList.toggle("is-selected", Boolean(activeSidebarStage && stageId === activeSidebarStage.id));
    }

    if (!activeSidebarStage) {
      sidebar.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      sidebar.setAttribute("aria-hidden", "true");
      backdrop.hidden = true;
      return;
    }

    const chapter = Campaign[activeChapterIndex];
    const stage = activeSidebarStage;
    const cleared = stage.id <= profile.clearedThrough;
    const unlocked = Progress.isUnlocked(profile, stage);
    const monsters = getStageMonsters(stage);

    sidebar.querySelector(".sidebar-arena-label").textContent = chapter.name;
    const statusEl = sidebar.querySelector(".sidebar-stage-status");
    statusEl.textContent = "Level " + stage.id + (cleared ? " · Selesai" : unlocked ? " · Terbuka" : " · Terkunci");
    statusEl.className = "sidebar-stage-status " + (cleared ? "is-cleared" : unlocked ? "is-unlocked" : "is-locked");
    sidebar.querySelector(".sidebar-stage-title").textContent = stage.name;
    sidebar.querySelector(".sidebar-briefing").textContent = stage.briefing;
    sidebar.querySelector(".sidebar-reward").textContent =
      (cleared ? "Hadiah menang ulang · " : "Hadiah menang pertama · ") +
      Progress.formatCoins(Progress.victoryCoins(stage, !cleared)) + " koin";

    const monsterGrid = sidebar.querySelector(".monster-list");
    monsterGrid.replaceChildren();
    for (const monster of monsters) {
      const chip = document.createElement("div");
      chip.className = "monster-chip" + (monster.isBoss ? " is-boss" : "");
      chip.innerHTML =
        '<div class="monster-portrait"><canvas width="36" height="36"></canvas></div>' +
        '<div class="monster-info"><strong></strong><span></span></div>';
      chip.querySelector("canvas").dataset.art = monster.key;
      chip.querySelector("strong").textContent = monster.name;
      chip.querySelector("span").textContent = monster.role;
      monsterGrid.append(chip);
    }

    const playBtn = sidebar.querySelector(".sidebar-play-btn");
    playBtn.disabled = !unlocked;
    playBtn.textContent = cleared ? "Main Ulang Pertempuran" : unlocked ? "Mulai Pertempuran" : "Level Masih Terkunci";
    playBtn.setAttribute("aria-label", playBtn.textContent + " level " + stage.id + " " + stage.name);

    backdrop.hidden = false;
    sidebar.setAttribute("aria-hidden", "false");
    refreshCampaignCanvases();
    requestAnimationFrame(() => {
      backdrop.classList.add("is-open");
      sidebar.classList.add("is-open");
    });
  }

  function renderCampaignBook() {
    const chapter = Campaign[activeChapterIndex];
    const chapterNum = activeChapterIndex + 1;
    const clearedCount = chapter.stages.filter((s) => s.id <= profile.clearedThrough).length;
    const anyUnlocked = chapter.stages.some((s) => Progress.isUnlocked(profile, s));
    const allCleared = clearedCount === chapter.stages.length;

    ui.chapterList.replaceChildren();

    // Bookmark ribbons for Chapters 1..6
    const bookmarks = document.createElement("nav");
    bookmarks.className = "storybook-bookmarks";
    bookmarks.setAttribute("aria-label", "Navigasi Bab");
    for (let i = 0; i < Campaign.length; i++) {
      const ch = Campaign[i];
      const chCleared = ch.stages.filter((s) => s.id <= profile.clearedThrough).length;
      const chUnlocked = ch.stages.some((s) => Progress.isUnlocked(profile, s));
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className =
        "bookmark-tab" +
        (i === activeChapterIndex ? " is-active" : "") +
        (chCleared === ch.stages.length ? " is-complete" : !chUnlocked ? " is-locked" : "");
      tab.dataset.chapter = String(i + 1);
      tab.textContent = "Bab " + (i + 1);
      if (chCleared === ch.stages.length) {
        const mark = document.createElement("span");
        mark.className = "bookmark-mark";
        mark.textContent = "✓";
        tab.append(mark);
      } else if (!chUnlocked) {
        const mark = document.createElement("span");
        mark.className = "bookmark-mark";
        mark.textContent = "Terkunci";
        tab.append(mark);
      }
      tab.setAttribute("aria-current", i === activeChapterIndex ? "page" : "false");
      tab.addEventListener("click", () => {
        activeChapterIndex = i;
        activeSidebarStage = null;
        renderCampaignBook();
      });
      bookmarks.append(tab);
    }

    // Open two-page Storybook container
    const book = document.createElement("div");
    book.className = "storybook-book";
    book.dataset.chapter = String(chapterNum);

    const spread = document.createElement("div");
    spread.className = "storybook-spread";

    // Left Page: Chapter Illustration & Lore
    const leftPage = document.createElement("section");
    leftPage.className = "storybook-page page-left";
    leftPage.innerHTML =
      '<div class="chapter-meta-row">' +
      '<span class="chapter-badge"></span>' +
      '<span class="chapter-progress"></span>' +
      "</div>" +
      '<h2 class="chapter-heading"></h2>' +
      '<p class="chapter-subtitle"></p>' +
      '<div class="chapter-plate"><canvas class="chapter-canvas" width="360" height="200"></canvas></div>' +
      '<p class="chapter-lore"></p>' +
      '<div class="storybook-page-footer">' +
      '<button type="button" class="page-turn-btn page-prev">‹ Bab Sebelumnya</button>' +
      '<span class="page-indicator"></span>' +
      "</div>";

    leftPage.querySelector(".chapter-badge").textContent = "Chapter " + chapterNum;
    const progressEl = leftPage.querySelector(".chapter-progress");
    progressEl.textContent = allCleared
      ? clearedCount + "/" + chapter.stages.length + " Selesai"
      : anyUnlocked
      ? clearedCount + "/" + chapter.stages.length + " Terbuka"
      : "Terkunci";
    if (allCleared) progressEl.classList.add("is-complete");
    else if (!anyUnlocked) progressEl.classList.add("is-locked");

    leftPage.querySelector(".chapter-heading").textContent = chapter.name;
    leftPage.querySelector(".chapter-subtitle").textContent = chapter.subtitle ?? "";
    leftPage.querySelector(".chapter-lore").textContent = chapter.lore ?? "";
    leftPage.querySelector(".page-indicator").textContent = "Halaman " + chapterNum + " dari " + Campaign.length;
    const prevBtn = leftPage.querySelector(".page-prev");
    prevBtn.disabled = activeChapterIndex === 0;
    prevBtn.addEventListener("click", () => {
      if (activeChapterIndex <= 0) return;
      activeChapterIndex -= 1;
      activeSidebarStage = null;
      renderCampaignBook();
    });

    // Center Spine
    const spine = document.createElement("div");
    spine.className = "storybook-spine";
    spine.setAttribute("aria-hidden", "true");

    // Right Page: Chapter Stages List
    const rightPage = document.createElement("section");
    rightPage.className = "storybook-page page-right";
    rightPage.innerHTML =
      '<div class="right-page-header">' +
      "<h3>Daftar Pertempuran</h3>" +
      '<p class="right-page-hint">Pilih level untuk melihat latar arena, daftar monster & tombol mulai.</p>' +
      "</div>" +
      '<div class="storybook-stage-list"></div>' +
      '<div class="storybook-page-footer">' +
      '<span class="page-indicator"></span>' +
      '<button type="button" class="page-turn-btn page-next">Bab Berikutnya ›</button>' +
      "</div>";

    const stageList = rightPage.querySelector(".storybook-stage-list");
    for (let sIdx = 0; sIdx < chapter.stages.length; sIdx++) {
      const stage = chapter.stages[sIdx];
      const cleared = stage.id <= profile.clearedThrough;
      const unlocked = Progress.isUnlocked(profile, stage);
      const isBossStage = Boolean(stage.boss) || sIdx === chapter.stages.length - 1;
      const monsters = getStageMonsters(stage);

      const item = document.createElement("button");
      item.type = "button";
      item.dataset.stageId = String(stage.id);
      item.className =
        "storybook-stage-item " +
        (cleared ? "is-cleared" : unlocked ? "is-unlocked" : "is-locked") +
        (isBossStage ? " is-boss" : "");

      item.innerHTML =
        '<div class="stage-item-top">' +
        '<span class="stage-node-pin" aria-hidden="true"></span>' +
        '<div class="stage-item-titles">' +
        '<span class="stage-status"></span>' +
        "<h4></h4>" +
        "</div>" +
        (stage.boss ? '<span class="stage-boss-badge">Bos</span>' : "") +
        "</div>" +
        '<p class="stage-teaser"></p>' +
        '<div class="stage-item-foot">' +
        '<span class="stage-monster-count"></span>' +
        '<span class="stage-cta">Lihat Misi ›</span>' +
        "</div>";

      item.querySelector(".stage-node-pin").textContent = cleared ? "✓" : String(stage.id);
      item.querySelector(".stage-status").textContent =
        "Level " + stage.id + (cleared ? " · Selesai" : unlocked ? " · Terbuka" : " · Terkunci");
      item.querySelector("h4").textContent = stage.name;
      item.querySelector(".stage-teaser").textContent = stage.briefing;
      item.querySelector(".stage-monster-count").textContent = monsters.length + " Jenis Musuh";

      item.addEventListener("click", () => {
        activeSidebarStage = stage;
        syncCampaignSidebar();
        ui.chapterList.querySelector(".sidebar-close-btn")?.focus();
      });
      stageList.append(item);
    }

    rightPage.querySelector(".page-indicator").textContent =
      clearedCount + "/" + chapter.stages.length + " Misi Selesai";
    const nextBtn = rightPage.querySelector(".page-next");
    nextBtn.disabled = activeChapterIndex >= Campaign.length - 1;
    nextBtn.addEventListener("click", () => {
      if (activeChapterIndex >= Campaign.length - 1) return;
      activeChapterIndex += 1;
      activeSidebarStage = null;
      renderCampaignBook();
    });

    spread.append(leftPage, spine, rightPage);
    book.append(spread);

    // Slide-Over Stage Detail Sidebar + Backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "stage-sidebar-backdrop";
    backdrop.hidden = true;
    backdrop.addEventListener("click", () => {
      activeSidebarStage = null;
      syncCampaignSidebar();
    });

    const sidebar = document.createElement("aside");
    sidebar.className = "stage-sidebar";
    sidebar.setAttribute("aria-label", "Detail Level");
    sidebar.setAttribute("aria-hidden", "true");
    sidebar.innerHTML =
      '<div class="sidebar-arena-preview">' +
      '<canvas class="sidebar-arena-canvas" width="340" height="148"></canvas>' +
      '<span class="sidebar-arena-label"></span>' +
      '<button type="button" class="sidebar-close-btn" aria-label="Tutup detail level">×</button>' +
      "</div>" +
      '<div class="sidebar-body">' +
      '<p class="sidebar-stage-status"></p>' +
      '<h3 class="sidebar-stage-title"></h3>' +
      '<p class="sidebar-briefing"></p><p class="sidebar-reward"></p>' +
      '<div class="sidebar-monsters">' +
      "<h4>Monster yang Muncul</h4>" +
      '<div class="monster-list"></div>' +
      "</div>" +
      "</div>" +
      '<div class="sidebar-footer">' +
      '<button type="button" class="gold-button sidebar-play-btn"></button>' +
      "</div>";

    sidebar.querySelector(".sidebar-close-btn").addEventListener("click", () => {
      activeSidebarStage = null;
      syncCampaignSidebar();
    });

    sidebar.querySelector(".sidebar-play-btn").addEventListener("click", () => {
      if (!activeSidebarStage || !Progress.isUnlocked(profile, activeSidebarStage)) return;
      selectedStage = activeSidebarStage;
      activeSidebarStage = null;
      startBattle();
    });

    ui.chapterList.append(bookmarks, book, backdrop, sidebar);
    syncCampaignSidebar();
    refreshCampaignCanvases();
  }

  function openCampaign() {
    battle.mode = "ready";
    let targetChapter = 0;
    for (let i = 0; i < Campaign.length; i++) {
      if (Campaign[i].stages.some((s) => Progress.isUnlocked(profile, s))) {
        targetChapter = i;
      }
    }
    activeChapterIndex = targetChapter;
    activeSidebarStage = null;
    renderCampaignBook();
    showScreen("campaign", ui.campaignTitle);
  }

  function finishBattle() {
    const mode = battle.mode;
    const victory = mode === "won";
    const firstClear = victory && selectedStage.id === profile.clearedThrough + 1;
    const reward = Progress.reward(mode, battle.kills, selectedStage, firstClear);
    const unlockedStage = victory ? Progress.clearStage(profile, selectedStage) : null;
    profile.coins += reward;
    Progress.recordMatch(profile, battle.recruits);
    saveProfile();
    window.audioManager?.pauseBgm();
    ui.resultTitle.textContent = mode === "won" ? "Kerajaan Menang!" :
      mode === "lost" ? "Benteng Kerajaan Runtuh" : "Pertempuran Imbang";
    ui.resultDetails.replaceChildren();
    ui.resultProgress.textContent = unlockedStage ? "Level " + unlockedStage.id + " " + unlockedStage.name + " terbuka." :
      firstClear ? "Semua chapter selesai." : "";
    const next = campaignStages[selectedStage.id];
    ui.resultNext.hidden = !victory || !next || !Progress.isUnlocked(profile, next);
    ui.resultRetry.hidden = victory;
    const rows = [
      [firstClear ? "Hadiah menang pertama" : victory ? "Hadiah menang ulang" : "Hadiah kemenangan",
        victory ? Progress.victoryCoins(selectedStage, firstClear) : 0],
      [battle.kills.goblin + " Goblin dikalahkan", Progress.coinsForKills("goblin", battle.kills.goblin)],
      [battle.kills.minotaur + " Minotaur dikalahkan", Progress.coinsForKills("minotaur", battle.kills.minotaur)],
      ["Total diterima", reward]
    ];
    if (battle.kills.archer_goblin > 0) {
      const count = battle.kills.archer_goblin;
      rows.splice(-1, 0, [count + " Goblin Pemanah dikalahkan", Progress.coinsForKills("archer_goblin", count)]);
    }
    if (battle.kills.witcher > 0) {
      const count = battle.kills.witcher;
      rows.splice(-1, 0, [count + " Witcher dikalahkan", Progress.coinsForKills("witcher", count)]);
    }
    if (battle.kills.hollowMask > 0) {
      const count = battle.kills.hollowMask;
      rows.splice(-1, 0, [count + " Topeng Hampa dikalahkan", Progress.coinsForKills("hollowMask", count)]);
    }
    if (battle.boss && battle.kills[battle.boss.kind] > 0) {
      rows.splice(-1, 0, [battle.boss.name + " dikalahkan", Progress.coinsForKills(battle.boss.kind, 1)]);
    }
    for (const [label, amount] of rows) {
      const row = document.createElement("div");
      const title = document.createElement("dt");
      const value = document.createElement("dd");
      title.textContent = label;
      value.textContent = Progress.formatCoins(amount) + " koin";
      row.append(title, value);
      ui.resultDetails.append(row);
    }
    syncCoins();
    ui.resultDialog.showModal();
    (ui.resultNext.hidden ? (victory ? ui.resultLevels : ui.resultRetry) : ui.resultNext).focus();
  }

  ui.enterBattle.addEventListener("click", openCampaign);
  ui.leaveCampaign.addEventListener("click", openLobby);
  ui.resultNext.addEventListener("click", () => {
    const next = campaignStages[selectedStage.id];
    if (battle.mode !== "won" || !next || !Progress.isUnlocked(profile, next)) return;
    ui.resultDialog.close();
    selectedStage = next;
    startBattle();
  });
  ui.resultRetry.addEventListener("click", () => {
    ui.resultDialog.close();
    startBattle();
  });
  ui.resultLevels.addEventListener("click", () => {
    ui.resultDialog.close();
    openCampaign();
  });
  ui.enterBarracks.addEventListener("click", openBarracks);
  ui.leaveBarracks.addEventListener("click", openLobby);
  ui.enterGranary.addEventListener("click", () => {
    ui.granaryStatus.textContent = "";
    refreshUpgrades(ui.granaryCards);
    showScreen("granary", ui.granaryTitle);
  });
  ui.buySecondPlot.addEventListener("click", () => {
    if (screen !== "granary" || !Progress.buySecondPlot(profile)) return;
    saveProfile();
    refreshUpgrades(ui.granaryCards);
    ui.granaryStatus.textContent = "Petak kedua dibuka. Batas petani naik menjadi 2.";
  });
  ui.leaveGranary.addEventListener("click", openLobby);
  ui.resultDialog.addEventListener("cancel", (event) => event.preventDefault());
  ui.resultLobby.addEventListener("click", () => {
    ui.resultDialog.close();
    openLobby();
  });
  ui.resultBarracks.addEventListener("click", () => {
    ui.resultDialog.close();
    battle.mode = "ready";
    openBarracks();
  });
  let pendingImport = null;
  ui.exportProgress.addEventListener("click", () => {
    const blob = new Blob([Progress.exportFile(profile)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "roti-benteng-progress.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    ui.progressStatus.textContent = "File progres siap diunduh.";
  });

  ui.importProgress.addEventListener("click", () => ui.progressFile.click());
  ui.progressFile.addEventListener("change", async () => {
    const file = ui.progressFile.files[0];
    ui.progressFile.value = "";
    if (!file) return;
    ui.progressStatus.textContent = "";
    ui.importProgress.disabled = true;
    try {
      if (file.size > Progress.maxFileBytes) {
        ui.progressStatus.textContent = "File progres terlalu besar.";
        return;
      }
      const text = await file.text().catch(() => null);
      if (text === null) {
        ui.progressStatus.textContent = "File progres tidak bisa dibaca.";
        return;
      }
      pendingImport = Progress.importFile(text);
      if (screen !== "lobby") return;
      ui.importDetails.textContent = Progress.formatCoins(pendingImport.coins) +
        " koin · " + pendingImport.clearedThrough + " dari " + campaignStages.length + " level selesai";
      ui.importDialog.showModal();
    } catch (error) {
      ui.progressStatus.textContent = error.message;
    } finally {
      ui.importProgress.disabled = false;
    }
  });
  ui.cancelImport.addEventListener("click", () => ui.importDialog.close());
  ui.importDialog.addEventListener("close", () => {
    pendingImport = null;
    ui.importProgress.focus();
  });
  ui.confirmImport.addEventListener("click", () => {
    if (!pendingImport || !ui.importDialog.open) return;
    profile = pendingImport;
    const saved = saveProfile();
    syncCoins();
    ui.importDialog.close();
    ui.progressStatus.textContent = saved ? "Progres berhasil diimpor." :
      "Progres diimpor untuk sesi ini. Browser tidak dapat menyimpannya.";
  });

  ui.resetProgress.addEventListener("click", () => {
    ui.progressStatus.textContent = "";
    ui.resetDialog.showModal();
  });
  ui.cancelReset.addEventListener("click", () => ui.resetDialog.close());
  ui.confirmReset.addEventListener("click", () => {
    profile = Progress.normalize();
    selectedStage = campaignStages[0];
    activeChapterIndex = 0;
    activeSidebarStage = null;
    const saved = saveProfile();
    syncCoins();
    ui.progressStatus.textContent = saved
      ? "Progres direset. Chapter 1, Level 1 siap dimainkan dengan Petani dan Ksatria."
      : "Progres direset untuk sesi ini. Browser tidak dapat menyimpannya.";
    ui.resetDialog.close();
    ui.resetProgress.focus();
  });
  ui.leaveBattle.addEventListener("click", openCampaign);
  syncCoins();
  let maxCameraX = Constants.WORLD_WIDTH - Constants.CANVAS_WIDTH;
  let cameraX = 0;

  function moveCamera(x) {
    cameraX = Math.min(maxCameraX, Math.max(0, Math.round(x)));
    ui.cameraPosition.value = cameraX;
  }

  ui.cameraPosition.max = maxCameraX;
  ui.cameraPosition.addEventListener("input", () => moveCamera(Number(ui.cameraPosition.value)));
  ui.cameraHome.addEventListener("click", () => moveCamera(0));
  ui.cameraEnemy.addEventListener("click", () => moveCamera(maxCameraX));
  ui.selectModeToggle?.addEventListener("click", () => {
    if (battle.mode !== "playing") return;
    battleUiState.boxSelectMode = !battleUiState.boxSelectMode;
    if (battleUiState.boxSelectMode && battleUiState.placingFlag) {
      cancelFlagPlacement();
    }
    syncFlagPlacementCursor();
    renderer.syncHud(battle, ui, battleUiState);
  });

  function isImmersive() {
    return document.fullscreenElement === ui.battleScreen ||
      ui.battleScreen.classList.contains("immersive-fallback");
  }

  function resizeBattleView() {
    const immersive = isImmersive();
    const { clientWidth, clientHeight } = ui.field;
    const baseWidth = Constants.CANVAS_WIDTH;
    const width = immersive && clientHeight > 0
      ? Math.min(Constants.WORLD_WIDTH, Math.max(baseWidth,
        Math.round(clientWidth * Constants.CANVAS_HEIGHT / clientHeight)))
      : baseWidth;
    if (renderer.viewWidth === width) return;

    const nextMax = Constants.WORLD_WIDTH - width;
    // Keep the existing camera focus, including a view pinned to either base.
    const nextX = cameraX === 0 ? 0 : cameraX === maxCameraX ? nextMax :
      cameraX + (renderer.viewWidth - width) / 2;
    renderer.resizeView(width);
    maxCameraX = nextMax;
    ui.cameraPosition.max = nextMax;
    ui.cameraPosition.disabled = nextMax === 0;
    ui.cameraHome.disabled = nextMax === 0;
    ui.cameraEnemy.disabled = nextMax === 0;
    moveCamera(nextX);
  }

  function syncFullscreen() {
    const immersive = isImmersive();
    ui.fullscreenBattle.textContent = immersive ? "Keluar Layar Penuh" : "Layar Penuh";
    ui.fullscreenBattle.setAttribute("aria-pressed", String(immersive));
    resizeBattleView();
  }

  function leaveFullscreen() {
    ui.battleScreen.classList.remove("immersive-fallback");
    if (document.fullscreenElement === ui.battleScreen) {
      document.exitFullscreen().catch(() => {});
    }
    syncFullscreen();
  }

  let fullscreenPending = false;
  async function toggleFullscreen() {
    if (fullscreenPending) return;
    if (isImmersive()) {
      leaveFullscreen();
      return;
    }
    fullscreenPending = true;
    try {
      await ui.battleScreen.requestFullscreen();
      if (screen !== "battle") leaveFullscreen();
    } catch {
      if (screen === "battle") ui.battleScreen.classList.add("immersive-fallback");
    } finally {
      fullscreenPending = false;
      syncFullscreen();
    }
  }

  new ResizeObserver(resizeBattleView).observe(ui.field);
  document.addEventListener("fullscreenchange", syncFullscreen);
  ui.fullscreenBattle.addEventListener("click", toggleFullscreen);

  function getSceneWorldPoint(clientX, clientY) {
    const rect = ui.scene.getBoundingClientRect();
    const scale = Math.min(rect.width / renderer.viewWidth, rect.height / renderer.height);
    const insetX = (rect.width - renderer.viewWidth * scale) / 2;
    const insetY = (rect.height - renderer.height * scale) / 2;
    const canvasX = (clientX - rect.left - insetX) / scale;
    const canvasY = (clientY - rect.top - insetY) / scale;
    return { x: canvasX + cameraX, y: canvasY };
  }

  function syncFlagPlacementCursor() {
    const placing = Boolean(battleUiState.placingFlag);
    const boxMode = Boolean(battleUiState.boxSelectMode) && !placing;
    ui.scene.classList.toggle("placing-flag", placing);
    ui.scene.classList.toggle("box-select-mode", boxMode);
    if (!placing) {
      battleUiState.hoverWorld = null;
    } else if (ui.status) {
      ui.status.textContent = "Klik tanah jalur pertempuran untuk memasang bendera bertahan (Esc batal).";
    }
  }

  function cancelFlagPlacement() {
    if (!battleUiState.placingFlag) return;
    battleUiState.placingFlag = false;
    syncFlagPlacementCursor();
    if (battle.mode === "playing" && ui.status) {
      ui.status.textContent = "Pertempuran berlangsung";
    }
    renderer.syncHud(battle, ui, battleUiState);
  }

  function findCombatHeroAt(worldX, worldY) {
    if (battle.mode !== "playing") return null;
    let best = null;
    let bestDist = Infinity;
    for (const unit of battle.units) {
      if (unit.side !== 1 || unit.hp <= 0 || unit.kind === "farmer") continue;
      const footY = renderer.ground + (unit.depth ?? 0);
      const dx = Math.abs(worldX - unit.x);
      const dy = worldY - footY;
      if (dx <= 14 && dy >= -28 && dy <= 10) {
        const d = Math.hypot(dx, dy + 10);
        if (d < bestDist) {
          best = unit;
          bestDist = d;
        }
      }
    }
    return best;
  }

  function findCombatHeroesInBox(box) {
    const minX = Math.min(box.startX, box.endX);
    const maxX = Math.max(box.startX, box.endX);
    const minY = Math.min(box.startY, box.endY);
    const maxY = Math.max(box.startY, box.endY);
    return battle.units.filter((unit) => {
      if (unit.side !== 1 || unit.hp <= 0 || unit.kind === "farmer") return false;
      const footY = renderer.ground + (unit.depth ?? 0);
      const centerY = footY - 10;
      return unit.x + 8 >= minX && unit.x - 8 <= maxX && footY >= minY && centerY - 12 <= maxY;
    });
  }

  let drag = null;
  ui.scene.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary) return;
    if (event.button === 2) {
      if (battle.mode !== "playing") return;
      const startWorld = getSceneWorldPoint(event.clientX, event.clientY);
      drag = {
        id: event.pointerId,
        mode: "box",
        button: 2,
        startX: event.clientX,
        startY: event.clientY,
        startWorld,
        cameraX,
        moved: false
      };
      ui.scene.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) return;
    if (battleUiState.boxSelectMode && battle.mode === "playing" && !battleUiState.placingFlag) {
      const startWorld = getSceneWorldPoint(event.clientX, event.clientY);
      drag = {
        id: event.pointerId,
        mode: "box",
        button: 0,
        startX: event.clientX,
        startY: event.clientY,
        startWorld,
        cameraX,
        moved: false
      };
    } else {
      drag = {
        id: event.pointerId,
        mode: "pan",
        button: 0,
        startX: event.clientX,
        startY: event.clientY,
        cameraX,
        moved: false
      };
    }
    ui.scene.setPointerCapture(event.pointerId);
  });
  ui.scene.addEventListener("pointermove", (event) => {
    const worldPt = getSceneWorldPoint(event.clientX, event.clientY);
    if (battleUiState.placingFlag) {
      battleUiState.hoverWorld = worldPt;
    }
    if (drag?.id !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) {
      drag.moved = true;
    }
    if (!drag.moved) return;
    if (drag.mode === "box") {
      battleUiState.selectionBox = {
        startX: drag.startWorld.x,
        startY: drag.startWorld.y,
        endX: worldPt.x,
        endY: worldPt.y
      };
    } else {
      const { width, height } = ui.scene.getBoundingClientRect();
      const scale = Math.max(renderer.viewWidth / width, renderer.height / height);
      moveCamera(drag.cameraX + (drag.startX - event.clientX) * scale);
    }
  });
  ui.scene.addEventListener("pointerup", (event) => {
    if (drag?.id !== event.pointerId) return;
    const currentDrag = drag;
    drag = null;
    battleUiState.selectionBox = null;

    if (battle.mode !== "playing") return;
    const pt = getSceneWorldPoint(event.clientX, event.clientY);

    if (currentDrag.mode === "box") {
      if (currentDrag.moved) {
        const inBox = findCombatHeroesInBox({
          startX: currentDrag.startWorld.x,
          startY: currentDrag.startWorld.y,
          endX: pt.x,
          endY: pt.y
        });
        if (event.shiftKey) {
          const merged = [...battle.getSelectedUnits()];
          for (const unit of inBox) {
            if (!merged.includes(unit)) merged.push(unit);
          }
          battle.setSelectedUnits(merged);
        } else {
          battle.setSelectedUnits(inBox);
        }
        battleUiState.placingFlag = false;
        if (currentDrag.button === 0 && battleUiState.boxSelectMode) {
          battleUiState.boxSelectMode = false;
        }
        syncFlagPlacementCursor();
        const total = battle.getSelectedUnits().length;
        if (ui.status) {
          ui.status.textContent = total > 0
            ? `${total} pasukan dipilih. Pilih perintah di bawah.`
            : "Tidak ada pasukan di area pilihan.";
        }
        renderer.syncHud(battle, ui, battleUiState);
        return;
      }
      if (currentDrag.button === 2) {
        if (battleUiState.placingFlag) {
          cancelFlagPlacement();
        } else if (battle.getSelectedUnits().length > 0) {
          battle.clearSelection();
          if (ui.status) ui.status.textContent = "Pertempuran berlangsung";
          renderer.syncHud(battle, ui, battleUiState);
        }
        return;
      }
    }

    if (currentDrag.moved) return;

    if (battleUiState.placingFlag) {
      if (renderer.isValidFlagPoint(pt.x, pt.y)) {
        battle.commandSelectedDefend(pt.x);
        battle.spawnImpact(pt.x, false);
        battleUiState.placingFlag = false;
        syncFlagPlacementCursor();
        if (ui.status) ui.status.textContent = "Bendera bertahan dipasang & formasi diatur otomatis.";
        renderer.syncHud(battle, ui, battleUiState);
      } else {
        battleUiState.invalidFlagUntil = performance.now() + 900;
        battleUiState.invalidWorld = pt;
        const onLaneY =
          pt.y >= Constants.GROUND_Y - Constants.DEFEND.groundToleranceTop &&
          pt.y <= Constants.GROUND_Y + Constants.DEFEND.groundToleranceBottom;
        if (ui.status) {
          ui.status.textContent = onLaneY
            ? "Posisi bendera harus di antara depan benteng dan sebelum markas musuh."
            : "Klik area tanah jalur pertempuran, bukan langit atau gunung.";
        }
      }
      return;
    }

    const hit = findCombatHeroAt(pt.x, pt.y);
    if (hit) {
      if (event.shiftKey) {
        const cur = battle.getSelectedUnits();
        const next = cur.includes(hit) ? cur.filter((u) => u !== hit) : [...cur, hit];
        battle.setSelectedUnits(next);
      } else {
        battle.setSelectedUnits([hit]);
      }
      if (ui.status) ui.status.textContent = `${battle.getSelectedUnits().length} pasukan dipilih.`;
      renderer.syncHud(battle, ui, battleUiState);
    } else if (battle.getSelectedUnits().length > 0) {
      battle.clearSelection();
      if (ui.status) ui.status.textContent = "Pertempuran berlangsung";
      renderer.syncHud(battle, ui, battleUiState);
    }
  });
  ui.scene.addEventListener("pointerleave", () => {
    battleUiState.hoverWorld = null;
  });
  ui.scene.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
  ui.scene.addEventListener("lostpointercapture", () => {
    drag = null;
    battleUiState.selectionBox = null;
  });

  renderer.renderIcons();

  function togglePause() {
    if (battle.mode === "playing") {
      battleUiState.placingFlag = false;
      battleUiState.boxSelectMode = false;
      battleUiState.selectionBox = null;
      syncFlagPlacementCursor();
      battle.pause();
      window.audioManager?.pauseBgm();
    } else if (battle.mode === "paused") {
      window.audioManager?.unlock();
      window.audioManager?.resumeBgm();
      battle.resume();
      lastFrame = performance.now();
    }
    renderer.syncHud(battle, ui, battleUiState);
    if (battle.mode === "playing") {
      (ui.summon.disabled ? ui.field : ui.summon).focus({ preventScroll: true });
    }
  }

  function startBattle() {
    window.audioManager?.unlock();
    window.audioManager?.playBgm();
    battleUiState.placingFlag = false;
    battleUiState.boxSelectMode = false;
    battleUiState.selectionBox = null;
    syncFlagPlacementCursor();
    ui.title.textContent = "Level " + selectedStage.id + " · " + selectedStage.name;
    ui.battleBriefing.textContent = selectedStage.briefing;
    showScreen("battle");
    battle.start(profile.ranks, profile.matchHistory, selectedStage, profile.hasSecondPlot, profile.unlockedHeroes);
    moveCamera(0);
    lastFrame = performance.now();
    renderer.syncHud(battle, ui, battleUiState);
    window.scrollTo({ top: 0, behavior: "instant" });
    (isImmersive() ? ui.field : ui.title).focus({ preventScroll: true });
  }

  const summonSlots = [
    ["farmer", ui.summonFarmer],
    ["knight", ui.summon],
    ["wizard", ui.summonWizard],
    ["kira", ui.summonKira],
    ["james", ui.summonJames],
    ["lynce", ui.summonLynce]
  ];

  function summon(kind) {
    if (battle.recruit(kind)) renderer.syncHud(battle, ui, battleUiState);
  }

  ui.play.addEventListener("click", () => {
    battle.mode === "paused" ? togglePause() : startBattle();
  });
  ui.restart.addEventListener("click", startBattle);
  ui.pause.addEventListener("click", togglePause);
  const audio = window.audioManager;
  for (const [kind, slider, output] of [
    ["music", ui.musicVolume, ui.musicVolumeValue],
    ["effects", ui.effectsVolume, ui.effectsVolumeValue]
  ]) {
    const syncSlider = () => {
      output.value = slider.value + "%";
      slider.setAttribute("aria-valuetext", output.value);
      ui.testEffects.disabled = audio.volume.effects === 0;
    };
    slider.value = audio.volume[kind];
    syncSlider();
    slider.addEventListener("input", () => {
      audio.setVolume(kind, slider.valueAsNumber);
      syncSlider();
    });
  }
  ui.openSettings.addEventListener("click", () => ui.settingsDialog.showModal());
  ui.closeSettings.addEventListener("click", () => ui.settingsDialog.close());
  ui.testEffects.addEventListener("click", () => audio.playHit("knight"));
  for (const [kind, button] of summonSlots) {
    button.addEventListener("click", () => summon(kind));
  }
  ui.cmdAdvance?.addEventListener("click", () => {
    if (battle.mode !== "playing") return;
    battleUiState.placingFlag = false;
    syncFlagPlacementCursor();
    const count = battle.commandSelectedAdvance();
    if (ui.status && count > 0) {
      ui.status.textContent = `${count} pasukan diperintahkan menyerang maju.`;
    }
    renderer.syncHud(battle, ui, battleUiState);
  });
  ui.cmdDefend?.addEventListener("click", () => {
    if (battle.mode !== "playing" || battle.getSelectedUnits().length === 0) return;
    battleUiState.placingFlag = !battleUiState.placingFlag;
    battleUiState.boxSelectMode = false;
    syncFlagPlacementCursor();
    if (!battleUiState.placingFlag && ui.status) {
      ui.status.textContent = `${battle.getSelectedUnits().length} pasukan dipilih.`;
    }
    renderer.syncHud(battle, ui, battleUiState);
  });
  ui.cmdClearSelect?.addEventListener("click", () => {
    battleUiState.placingFlag = false;
    battle.clearSelection();
    syncFlagPlacementCursor();
    if (battle.mode === "playing" && ui.status) {
      ui.status.textContent = "Pertempuran berlangsung";
    }
    renderer.syncHud(battle, ui, battleUiState);
  });
  ui.baseSkillButton.addEventListener("click", () => {
    if (battle.activateBaseSkill()) renderer.syncHud(battle, ui, battleUiState);
  });

  document.addEventListener("keydown", (event) => {
    if (screen === "campaign" && event.code === "Escape" && activeSidebarStage) {
      activeSidebarStage = null;
      syncCampaignSidebar();
      return;
    }
    if (screen !== "battle" || ui.resultDialog.open || ui.settingsDialog.open ||
        event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === "Escape" && battleUiState.placingFlag) {
      event.preventDefault();
      cancelFlagPlacement();
      return;
    }
    if (event.code === "Escape" && battle.getSelectedUnits().length > 0) {
      event.preventDefault();
      battle.clearSelection();
      if (battle.mode === "playing" && ui.status) ui.status.textContent = "Pertempuran berlangsung";
      renderer.syncHud(battle, ui, battleUiState);
      return;
    }
    if (event.code === "Escape" && ui.battleScreen.classList.contains("immersive-fallback")) {
      leaveFullscreen();
      return;
    }
    if (event.target !== ui.cameraPosition && (event.code === "ArrowLeft" || event.code === "ArrowRight")) {
      event.preventDefault();
      moveCamera(cameraX + (event.code === "ArrowLeft" ? -32 : 32));
    }
    if (event.repeat) return;
    if (event.code === "KeyP") togglePause();
    if (battle.mode !== "playing" || event.target.closest("input:not([type='range']), textarea, select, [contenteditable]")) return;
    if (event.code === "KeyQ") {
      if (battle.activateBaseSkill()) {
        event.preventDefault();
        renderer.syncHud(battle, ui, battleUiState);
      }
      return;
    }
    const numberKey = /^(?:Digit|Numpad)([1-6])$/.exec(event.code);
    const slot = numberKey ? summonSlots[Number(numberKey[1]) - 1] :
      event.code === "KeyW" ? summonSlots[2] :
      event.code === "Space" && !event.target.closest("button, input") ? summonSlots[1] : null;
    if (slot) {
      event.preventDefault();
      summon(slot[0]);
    }
  });

  const unlockScreenAudio = () => {
    const audioManager = window.audioManager;
    if (!audioManager) return;
    if (screen !== "battle" && audioManager.lobbyBgm?.paused !== false) {
      audioManager.unlock();
    } else if (screen === "battle" && battle.mode === "playing" && audioManager.bgm?.paused !== false) {
      audioManager.unlock();
      audioManager.playBgm();
    }
  };
  document.addEventListener("pointerdown", unlockScreenAudio);
  document.addEventListener("keydown", unlockScreenAudio);
  window.audioManager?.playLobbyBgm();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && battle.mode === "playing") {
      togglePause();
    }
  });

  // Game Loop
  function frame(now) {
    const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;

    if (screen === "battle") {
      const wasPlaying = battle.mode === "playing";
      battle.update(delta);
      renderer.syncHud(battle, ui, battleUiState);
      renderer.render(battle, battle.elapsed, cameraX, battleUiState);
      if (wasPlaying && ["won", "lost", "draw"].includes(battle.mode)) {
        battleUiState.placingFlag = false;
        battleUiState.boxSelectMode = false;
        battleUiState.selectionBox = null;
        syncFlagPlacementCursor();
        finishBattle();
      }
    } else if (screen === "lobby") {
      renderer.render(battle, now / 1000, 0);
      ui.courtyardArt.getContext("2d").drawImage(ui.scene, 0, 0,
        Constants.CANVAS_WIDTH * renderer.pixelScale, Constants.CANVAS_HEIGHT * renderer.pixelScale,
        0, 0, Constants.CANVAS_WIDTH, Constants.CANVAS_HEIGHT);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
});
