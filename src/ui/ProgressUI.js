"use strict";

window.setupProgressUI = function setupProgressUI(app) {
  const { ui, battle, saveProfile, syncCoins } = app;
  let pendingImport = null;

  ui.resultDialog.addEventListener("cancel", (event) => event.preventDefault());
  ui.resultNext.addEventListener("click", () => {
    const selectedStage = app.getSelectedStage();
    const next = campaignStages[selectedStage.id];
    if (battle.mode !== "won" || !next || !Progress.isUnlocked(app.getProfile(), next)) return;
    ui.resultDialog.close();
    app.setSelectedStage(next);
    app.startBattle();
  });
  ui.resultRetry.addEventListener("click", () => {
    ui.resultDialog.close();
    app.startBattle();
  });
  ui.resultLevels.addEventListener("click", () => {
    ui.resultDialog.close();
    app.openCampaign();
  });
  ui.resultLobby.addEventListener("click", () => {
    ui.resultDialog.close();
    app.openLobby();
  });
  ui.resultBarracks.addEventListener("click", () => {
    ui.resultDialog.close();
    battle.mode = "ready";
    app.openBarracks();
  });

  ui.exportProgress.addEventListener("click", () => {
    const blob = new Blob([Progress.exportFile(app.getProfile())], { type: "application/json" });
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
      if (app.getScreen() !== "lobby") return;
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
    app.setProfile(pendingImport);
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
    app.setProfile(Progress.normalize());
    app.setSelectedStage(campaignStages[0]);
    app.resetCampaignNavigation();
    const saved = saveProfile();
    syncCoins();
    ui.progressStatus.textContent = saved
      ? "Progres direset. Chapter 1, Level 1 siap dimainkan dengan Petani dan Ksatria."
      : "Progres direset untuk sesi ini. Browser tidak dapat menyimpannya.";
    ui.resetDialog.close();
    ui.resetProgress.focus();
  });

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
};
