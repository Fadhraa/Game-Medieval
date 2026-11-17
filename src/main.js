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
      "fpsCounter",
      "selectModeToggle",
      "selectAllHeroes",
      "selectMeleeHeroes",
      "selectRangedHeroes",
      "countAllHeroes",
      "countMeleeHeroes",
      "countRangedHeroes",
      "aliveSummary",
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
  let cameraX = 0;
  const battleUiState = {
    boxSelectMode: false,
    selectionBox: null,
    placingFlag: false,
    hoverWorld: null,
    invalidFlagUntil: 0,
    invalidWorld: null
  };
  let lastFrame = performance.now();

  let barracks;
  let campaign;
  let battleInput;

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
      battleInput?.leaveFullscreen();
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

  function openLobby() {
    battle.mode = "ready";
    showScreen("lobby", ui.lobbyTitle);
  }

  function startBattle() {
    window.audioManager?.unlock();
    window.audioManager?.playBgm();
    battleUiState.placingFlag = false;
    battleUiState.boxSelectMode = false;
    battleUiState.selectionBox = null;
    battleInput.syncFlagPlacementCursor();
    ui.title.textContent = "Level " + selectedStage.id + " · " + selectedStage.name;
    ui.battleBriefing.textContent = selectedStage.briefing;
    showScreen("battle");
    battle.start(profile.ranks, profile.matchHistory, selectedStage, profile.hasSecondPlot, profile.unlockedHeroes);
    battleInput.moveCamera(0);
    lastFrame = performance.now();
    renderer.syncHud(battle, ui, battleUiState);
    window.scrollTo({ top: 0, behavior: "instant" });
    (battleInput.isImmersive() ? ui.field : ui.title).focus({ preventScroll: true });
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

  const app = {
    ui,
    battle,
    renderer,
    battleUiState,
    getProfile: () => profile,
    setProfile: (nextProfile) => { profile = nextProfile; },
    getScreen: () => screen,
    getSelectedStage: () => selectedStage,
    setSelectedStage: (nextStage) => { selectedStage = nextStage; },
    getCameraX: () => cameraX,
    setCameraX: (x) => { cameraX = x; },
    saveProfile,
    syncCoins,
    showScreen,
    openLobby,
    openBarracks: () => barracks.openBarracks(),
    openCampaign: () => campaign.openCampaign(),
    startBattle,
    finishBattle,
    closeCampaignSidebar: () => campaign.closeSidebarIfOpen(),
    resetCampaignNavigation: () => campaign.resetNavigation(),
    resetLastFrame: () => { lastFrame = performance.now(); }
  };

  barracks = setupBarracksUI(app);
  campaign = setupCampaignUI(app);
  setupProgressUI(app);
  battleInput = setupBattleInput(app);

  renderer.onSpritesUpdated = () => {
    if (screen === "campaign") campaign.refreshCampaignCanvases();
  };

  let fpsFrames = 0;
  let fpsWindowStart = performance.now();
  let lastHudSyncAt = 0;

  function frame(now) {
    const rawDelta = Math.max(0, (now - lastFrame) / 1000);
    const delta = Math.min(0.05, rawDelta);
    lastFrame = now;

    fpsFrames++;
    const fpsElapsed = now - fpsWindowStart;
    if (fpsElapsed >= 500) {
      const fps = Math.round((fpsFrames * 1000) / fpsElapsed);
      if (ui.fpsCounter) ui.fpsCounter.textContent = `${fps} FPS`;
      fpsFrames = 0;
      fpsWindowStart = now;
    }

    if (screen === "battle") {
      const wasPlaying = battle.mode === "playing";
      battle.update(delta);
      if (now - lastHudSyncAt >= 100 || battle.mode !== renderer.previousMode) {
        renderer.syncHud(battle, ui, battleUiState);
        lastHudSyncAt = now;
      }
      renderer.render(battle, battle.elapsed, cameraX, battleUiState);
      if (wasPlaying && ["won", "lost", "draw"].includes(battle.mode)) {
        battleUiState.placingFlag = false;
        battleUiState.boxSelectMode = false;
        battleUiState.selectionBox = null;
        battleInput.syncFlagPlacementCursor();
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
