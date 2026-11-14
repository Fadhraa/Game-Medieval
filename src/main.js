"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const ui = Object.fromEntries(
    [
      "scene",
      "courtyardArt", "lobbyScreen", "lobbyTitle", "enterBattle", "enterBarracks",
      "campaignScreen", "campaignTitle", "leaveCampaign", "chapterList", "battleBriefing",
      "barracksScreen", "barracksTitle", "leaveBarracks", "upgradeCards", "upgradeStatus",
      "resultDialog", "resultTitle", "resultDetails", "resultLobby", "resultBarracks", "resultProgress", "resultLevels", "resultNext", "resultRetry",
      "granaryScreen", "granaryTitle", "enterGranary", "leaveGranary", "granaryCards", "granaryStatus", "farmStats",
      "lobbyProgress", "resetStatus", "resetProgress", "resetDialog", "cancelReset", "confirmReset",
      "saveStatus", "battleScreen", "title", "leaveBattle", "coinBalance",
      "knightStats", "wizardStats", "kiraStats",
      "cameraPosition",
      "cameraHome",
      "cameraEnemy",
      "field",
      "pause",
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
      "farmerCount",
      "unitCount"
    ].map((id) => [id, document.getElementById(id)])
  );

  const battle = new Battle("ready");
  const renderer = new Renderer(ui.scene);
  const profile = Progress.load();
  let screen = "lobby";
  let selectedStage = campaignStages[0];
  let lastFrame = performance.now();

  function saveProfile() {
    ui.saveStatus.hidden = Progress.save(profile);
  }

  function syncCoins() {
    ui.coinBalance.textContent = Progress.formatCoins(profile.coins);
  }

  function showScreen(name, heading) {
    screen = name;
    for (const key of ["lobby", "campaign", "barracks", "granary", "battle"]) {
      ui[key + "Screen"].hidden = key !== name;
    }
    ui.pause.hidden = name !== "battle";
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
    healPercent: "Pemulihan HP maks. target",
    breadPerDelivery: "Roti per setoran"
  };

  function statText(kind, rank) {
    return Object.entries(Progress.stats(kind, rank)).map(([stat, value]) => {
      const percent = stat === "healPercent";
      const rounded = value.toLocaleString("id-ID", { maximumFractionDigits: percent ? 1 : 0 });
      return statLabels[stat] + " " + rounded + (percent ? "%" : "");
    }).join(" · ");
  }

  function refreshUpgrades(container) {
    for (const card of container.children) {
      const kind = card.dataset.kind;
      const rank = profile.ranks[kind];
      const cost = Progress.cost(rank);
      const max = rank === Progress.maxRank;
      card.querySelector(".rank").textContent = "Level " + (rank + 1) + " / " + (Progress.maxRank + 1);
      card.querySelector(".current-stat").textContent = statText(kind, rank);
      card.querySelector(".next-stat").textContent = max ? "Level maksimum" : "Berikutnya: " + statText(kind, rank + 1);
      const button = card.querySelector("button");
      button.disabled = max || profile.coins < cost;
      button.textContent = max ? "Maksimum" : "Upgrade · " + Progress.formatCoins(cost) + " koin";
    }
    syncCoins();
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
    container.append(card);
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
      heading.textContent = chapter.name;
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
      firstClear ? "Kedua chapter selesai." : "";
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
  ui.resetProgress.addEventListener("click", () => {
    ui.resetStatus.textContent = "";
    ui.resetDialog.showModal();
  });
  ui.cancelReset.addEventListener("click", () => ui.resetDialog.close());
  ui.confirmReset.addEventListener("click", () => {
    Progress.resetUpgrades(profile);
    saveProfile();
    syncCoins();
    ui.resetStatus.textContent = "Karakter dan Lumbung kembali ke level 1. Saldo: 0 koin.";
    ui.resetDialog.close();
  });
  ui.leaveBattle.addEventListener("click", openCampaign);
  syncCoins();
  const maxCameraX = Constants.WORLD_WIDTH - Constants.CANVAS_WIDTH;
  let cameraX = 0;

  function moveCamera(x) {
    cameraX = Math.min(maxCameraX, Math.max(0, Math.round(x)));
    ui.cameraPosition.value = cameraX;
  }

  ui.cameraPosition.max = maxCameraX;
  ui.cameraPosition.addEventListener("input", () => moveCamera(Number(ui.cameraPosition.value)));
  ui.cameraHome.addEventListener("click", () => moveCamera(0));
  ui.cameraEnemy.addEventListener("click", () => moveCamera(maxCameraX));

  let drag = null;
  ui.scene.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    drag = { id: event.pointerId, startX: event.clientX, cameraX };
    ui.scene.setPointerCapture(event.pointerId);
  });
  ui.scene.addEventListener("pointermove", (event) => {
    if (drag?.id !== event.pointerId) return;
    const scale = Constants.CANVAS_WIDTH / ui.scene.getBoundingClientRect().width;
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
    battle.start(profile.ranks, profile.matchHistory, selectedStage);
    ui.farmStats.textContent = Constants.FARM.hp + " HP · +" + Progress.stats("farm", profile.ranks.farm).breadPerDelivery + " roti per setoran";
    ui.knightStats.textContent = statText("knight", profile.ranks.knight);
    ui.wizardStats.textContent = statText("wizard", profile.ranks.wizard);
    ui.kiraStats.textContent = statText("kira", profile.ranks.kira);
    moveCamera(0);
    lastFrame = performance.now();
    renderer.syncHud(battle, ui);
    window.scrollTo({ top: 0, behavior: "instant" });
    ui.title.focus({ preventScroll: true });
  }

  function summonKnight() {
    if (battle.recruit("knight")) {
      renderer.syncHud(battle, ui);
    }
  }

  function summonWizard() {
    if (battle.recruit("wizard")) {
      renderer.syncHud(battle, ui);
    }
  }

  function summonKira() {
    if (battle.recruit("kira")) {
      renderer.syncHud(battle, ui);
    }
  }

  // Event Listeners
  ui.play.addEventListener("click", () => {
    battle.mode === "paused" ? togglePause() : startBattle();
  });
  ui.restart.addEventListener("click", startBattle);
  ui.pause.addEventListener("click", togglePause);
  ui.summon.addEventListener("click", summonKnight);
  ui.summonWizard.addEventListener("click", summonWizard);
  ui.summonFarmer.addEventListener("click", () => {
    if (battle.recruit("farmer")) renderer.syncHud(battle, ui);
  });
  if (ui.summonKira) {
    ui.summonKira.addEventListener("click", summonKira);
  }

  document.addEventListener("keydown", (event) => {
    if (screen !== "battle" || ui.resultDialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target !== ui.cameraPosition && (event.code === "ArrowLeft" || event.code === "ArrowRight")) {
      event.preventDefault();
      moveCamera(cameraX + (event.code === "ArrowLeft" ? -32 : 32));
    }
    if (event.repeat) return;
    if (event.code === "KeyP") togglePause();
    if (event.code === "Space" && battle.mode === "playing" && !event.target.closest("button, input")) {
      event.preventDefault();
      summonKnight();
    }
    if (event.code === "KeyW" && battle.mode === "playing") {
      summonWizard();
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
      ui.courtyardArt.getContext("2d").drawImage(ui.scene, 0, 0);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
});
