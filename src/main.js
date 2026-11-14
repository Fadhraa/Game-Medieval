"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const ui = Object.fromEntries(
    [
      "scene",
      "courtyardArt", "lobbyScreen", "lobbyTitle", "enterBattle", "enterBarracks",
      "campaignScreen", "campaignTitle", "leaveCampaign", "chapterList", "battleBriefing",
      "barracksScreen", "barracksTitle", "leaveBarracks", "upgradeCards", "upgradeStatus",
      "resultDialog", "resultTitle", "resultDetails", "resultLobby", "resultBarracks", "resultProgress", "resultLevels", "resultNext", "resultRetry",
      "granaryScreen", "granaryTitle", "enterGranary", "leaveGranary", "granaryCards", "granaryStatus",
      "plotUpgrade", "plotCount", "plotRequirement", "buySecondPlot",
      "lobbyProgress", "progressStatus", "resetProgress", "resetDialog", "cancelReset", "confirmReset",
      "exportProgress", "importProgress", "progressFile", "importDialog", "importDetails", "confirmImport", "cancelImport",
      "saveStatus", "battleScreen", "title", "leaveBattle", "coinBalance",
      "summonJames", "jamesLabel",
      "cameraPosition",
      "cameraHome",
      "cameraEnemy",
      "cameraWitcher",
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
  let lastFrame = performance.now();

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
    if (name !== "battle") leaveFullscreen();
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

  const statLabels = {
    hp: "HP maks.",
    damage: "ATK",
    splashDamage: "Damage sebaran",
    breadPerDelivery: "Roti per setoran"
  };

  function statText(kind, rank) {
    if (kind === "farm") {
      const { breadPerDelivery, speed, harvestSeconds } = Progress.farmStats(rank);
      const speedBonus = Math.round((speed / Constants.FARM.speed - 1) * 100);
      const harvestBonus = Math.round((1 - harvestSeconds / Constants.FARM.harvestSeconds) * 100);
      const stats = [breadPerDelivery + " roti per setoran"];
      if (speedBonus) stats.push("Kecepatan jalan +" + speedBonus + "%");
      if (harvestBonus) stats.push("Durasi panen −" + harvestBonus + "%");
      return stats.join(" · ");
    }
    return Object.entries(Progress.stats(kind, rank)).map(([stat, value]) => {
      const percent = stat === "healPercent";
      const rounded = value.toLocaleString("id-ID", { maximumFractionDigits: percent ? 1 : 0 });
      return percent ? "Pemulihan " + rounded + "% dari HP maks. Kira" : statLabels[stat] + " " + rounded;
    }).join(" · ");
  }

  function refreshUpgrades(container) {
    for (const card of container.querySelectorAll("[data-kind]")) {
      const kind = card.dataset.kind;
      const rank = profile.ranks[kind];
      const cost = Progress.cost(rank);
      const maxRank = Progress.maxRankFor(kind);
      const max = rank === maxRank;
      card.querySelector(".rank").textContent = "Level " + (rank + 1) + " / " + (maxRank + 1);
      card.querySelector(".current-stat").textContent = statText(kind, rank);
      card.querySelector(".next-stat").textContent = max ? "Level maksimum" : "Berikutnya: " + statText(kind, rank + 1);
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
    card.innerHTML = '<div class="upgrade-header"><canvas width="24" height="24" aria-hidden="true"></canvas><h2></h2></div><p class="rank"></p><p class="current-stat"></p><p class="next-stat"></p><button class="gold-button" type="button"></button>';
    const isFarm = kind === "farm";
    const menu = isFarm ? "granary" : "barracks";
    const container = isFarm ? ui.granaryCards : ui.upgradeCards;
    const status = isFarm ? ui.granaryStatus : ui.upgradeStatus;
    card.querySelector("canvas").dataset.art = isFarm ? "farmer" : kind;
    card.querySelector("h2").textContent = upgrade.name;
    card.querySelector("button").addEventListener("click", () => {
      if (screen !== menu || !Progress.buy(profile, kind)) return;
      saveProfile();
      refreshUpgrades(container);
      status.textContent = upgrade.name + " naik ke level " + (profile.ranks[kind] + 1) + ".";
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
    window.audioManager?.pauseBgm();
    showScreen("lobby", ui.lobbyTitle);
  }

  function openCampaign() {
    battle.mode = "ready";
    window.audioManager?.pauseBgm();
    ui.chapterList.replaceChildren();
    for (const chapter of Campaign) {
      const section = document.createElement("section");
      section.className = "chapter";
      const heading = document.createElement("h2");
      heading.textContent = "Chapter " + (Campaign.indexOf(chapter) + 1) + " · " + chapter.name;
      const cards = document.createElement("div");
      cards.className = "campaign-grid";

      for (const stage of chapter.stages) {
        const card = document.createElement("article");
        card.className = "stage-card";
        const cleared = stage.id <= profile.clearedThrough;
        const unlocked = Progress.isUnlocked(profile, stage);
        card.innerHTML = '<p class="stage-status"></p><h3></h3><p class="stage-briefing"></p><button class="gold-button" type="button"></button>';
        card.querySelector(".stage-status").textContent = "Level " + stage.id +
          (cleared ? " · Selesai" : unlocked ? " · Terbuka" : " · Terkunci");
        card.querySelector("h3").textContent = stage.name;
        card.querySelector(".stage-briefing").textContent = stage.briefing;
        const button = card.querySelector("button");
        button.disabled = !unlocked;
        button.textContent = cleared ? "Main ulang" : unlocked ? "Mulai" : "Terkunci";
        button.setAttribute("aria-label", button.textContent + " level " + stage.id + " " + stage.name);
        button.addEventListener("click", () => {
          if (!Progress.isUnlocked(profile, stage)) return;
          selectedStage = stage;
          startBattle();
        });
        cards.append(card);
      }

      section.append(heading, cards);
      ui.chapterList.append(section);
    }
    showScreen("campaign", ui.campaignTitle);
  }

  function finishBattle() {
    const mode = battle.mode;
    const reward = Progress.reward(mode, battle.kills);
    const victory = mode === "won";
    const firstClear = victory && selectedStage.id === profile.clearedThrough + 1;
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
      ["Hadiah kemenangan", victory ? Progress.victoryReward : 0],
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
    Progress.resetUpgrades(profile);
    saveProfile();
    syncCoins();
    ui.progressStatus.textContent = "Karakter dan Lumbung kembali ke level 1. Ladang kembali menjadi 1 petak dan saldo menjadi 0 koin.";
    ui.resetDialog.close();
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
  ui.cameraWitcher.addEventListener("click", () => {
    const witcher = battle.activeWitcher;
    if (witcher) moveCamera(witcher.x - ui.scene.width / 2);
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
    if (ui.scene.width === width) return;

    const nextMax = Constants.WORLD_WIDTH - width;
    // Keep the existing camera focus, including a view pinned to either base.
    const nextX = cameraX === 0 ? 0 : cameraX === maxCameraX ? nextMax :
      cameraX + (ui.scene.width - width) / 2;
    ui.scene.width = width;
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

  let drag = null;
  ui.scene.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    drag = { id: event.pointerId, startX: event.clientX, cameraX };
    ui.scene.setPointerCapture(event.pointerId);
  });
  ui.scene.addEventListener("pointermove", (event) => {
    if (drag?.id !== event.pointerId) return;
    const { width, height } = ui.scene.getBoundingClientRect();
    const scale = Math.max(ui.scene.width / width, ui.scene.height / height);
    moveCamera(drag.cameraX + (drag.startX - event.clientX) * scale);
  });
  ui.scene.addEventListener("lostpointercapture", () => { drag = null; });

  renderer.renderIcons();

  function togglePause() {
    if (battle.mode === "playing") {
      battle.pause();
      window.audioManager?.pauseBgm();
    } else if (battle.mode === "paused") {
      window.audioManager?.unlock();
      window.audioManager?.resumeBgm();
      battle.resume();
      lastFrame = performance.now();
    }
    renderer.syncHud(battle, ui);
    if (battle.mode === "playing") {
      (ui.summon.disabled ? ui.field : ui.summon).focus({ preventScroll: true });
    }
  }

  function startBattle() {
    window.audioManager?.unlock();
    window.audioManager?.resumeBgm();
    ui.title.textContent = "Level " + selectedStage.id + " · " + selectedStage.name;
    ui.battleBriefing.textContent = selectedStage.briefing;
    showScreen("battle");
    battle.start(profile.ranks, profile.matchHistory, selectedStage, profile.hasSecondPlot);
    moveCamera(0);
    lastFrame = performance.now();
    renderer.syncHud(battle, ui);
    window.scrollTo({ top: 0, behavior: "instant" });
    (isImmersive() ? ui.field : ui.title).focus({ preventScroll: true });
  }

  const summonSlots = [
    ["farmer", ui.summonFarmer],
    ["knight", ui.summon],
    ["wizard", ui.summonWizard],
    ["kira", ui.summonKira],
    ["james", ui.summonJames]
  ];

  function summon(kind) {
    if (battle.recruit(kind)) renderer.syncHud(battle, ui);
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

  document.addEventListener("keydown", (event) => {
    if (screen !== "battle" || ui.resultDialog.open || ui.settingsDialog.open ||
        event.altKey || event.ctrlKey || event.metaKey) return;
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
    const numberKey = /^(?:Digit|Numpad)([1-5])$/.exec(event.code);
    const slot = numberKey ? summonSlots[Number(numberKey[1]) - 1] :
      event.code === "KeyW" ? summonSlots[2] :
      event.code === "Space" && !event.target.closest("button, input") ? summonSlots[1] : null;
    if (slot) {
      event.preventDefault();
      summon(slot[0]);
    }
  });

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
      renderer.syncHud(battle, ui);
      renderer.render(battle, battle.elapsed, cameraX);
      if (wasPlaying && ["won", "lost", "draw"].includes(battle.mode)) finishBattle();
    } else if (screen === "lobby") {
      renderer.render(battle, now / 1000, 0);
      ui.courtyardArt.getContext("2d").drawImage(ui.scene, 0, 0, Constants.CANVAS_WIDTH,
        Constants.CANVAS_HEIGHT, 0, 0, Constants.CANVAS_WIDTH, Constants.CANVAS_HEIGHT);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
});
