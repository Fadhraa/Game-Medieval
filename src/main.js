"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const ui = Object.fromEntries(
    [
      "scene",
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
      "breadTime",
      "bakeFill",
      "unitCount"
    ].map((id) => [id, document.getElementById(id)])
  );

  const battle = new Battle("ready");
  const renderer = new Renderer(ui.scene);
  let lastFrame = performance.now();

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
    battle.start();
    lastFrame = performance.now();
    renderer.syncHud(battle, ui);
    ui.summon.focus({ preventScroll: true });
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
  if (ui.summonKira) {
    ui.summonKira.addEventListener("click", summonKira);
  }

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    if (event.code === "KeyP") togglePause();
    if (event.code === "Space" && battle.mode === "playing" && event.target !== ui.pause) {
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

    battle.update(delta);
    renderer.syncHud(battle, ui);
    renderer.render(battle, battle.mode === "ready" ? now / 1000 : battle.elapsed);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
});
