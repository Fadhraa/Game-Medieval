"use strict";

window.setupBattleInput = function setupBattleInput(app) {
  const { ui, battle, renderer, battleUiState } = app;
  let maxCameraX = Constants.WORLD_WIDTH - Constants.CANVAS_WIDTH;
  let drag = null;
  let fullscreenPending = false;

  function moveCamera(x) {
    const clamped = Math.min(maxCameraX, Math.max(0, Math.round(x)));
    app.setCameraX(clamped);
    ui.cameraPosition.value = clamped;
  }

  ui.cameraPosition.max = maxCameraX;
  ui.cameraPosition.addEventListener("input", () => moveCamera(Number(ui.cameraPosition.value)));
  ui.cameraHome.addEventListener("click", () => moveCamera(0));
  ui.cameraEnemy.addEventListener("click", () => moveCamera(maxCameraX));

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

    const cameraX = app.getCameraX();
    const nextMax = Constants.WORLD_WIDTH - width;
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

  async function toggleFullscreen() {
    if (fullscreenPending) return;
    if (isImmersive()) {
      leaveFullscreen();
      return;
    }
    fullscreenPending = true;
    try {
      await ui.battleScreen.requestFullscreen();
      if (app.getScreen() !== "battle") leaveFullscreen();
    } catch {
      if (app.getScreen() === "battle") ui.battleScreen.classList.add("immersive-fallback");
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
    return { x: canvasX + app.getCameraX(), y: canvasY };
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

  ui.selectModeToggle?.addEventListener("click", () => {
    if (battle.mode !== "playing") return;
    battleUiState.boxSelectMode = !battleUiState.boxSelectMode;
    if (battleUiState.boxSelectMode && battleUiState.placingFlag) {
      cancelFlagPlacement();
    }
    syncFlagPlacementCursor();
    renderer.syncHud(battle, ui, battleUiState);
  });

  ui.scene.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary) return;
    if (event.button === 2) {
      if (battle.mode !== "playing") return;
      drag = {
        id: event.pointerId,
        mode: "box",
        button: 2,
        startX: event.clientX,
        startY: event.clientY,
        startWorld: getSceneWorldPoint(event.clientX, event.clientY),
        cameraX: app.getCameraX(),
        moved: false
      };
      ui.scene.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) return;
    if (battleUiState.boxSelectMode && battle.mode === "playing" && !battleUiState.placingFlag) {
      drag = {
        id: event.pointerId,
        mode: "box",
        button: 0,
        startX: event.clientX,
        startY: event.clientY,
        startWorld: getSceneWorldPoint(event.clientX, event.clientY),
        cameraX: app.getCameraX(),
        moved: false
      };
    } else {
      drag = {
        id: event.pointerId,
        mode: "pan",
        button: 0,
        startX: event.clientX,
        startY: event.clientY,
        cameraX: app.getCameraX(),
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

  ui.scene.addEventListener("pointerleave", () => { battleUiState.hoverWorld = null; });
  ui.scene.addEventListener("contextmenu", (event) => { event.preventDefault(); });
  ui.scene.addEventListener("lostpointercapture", () => {
    drag = null;
    battleUiState.selectionBox = null;
  });

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
      app.resetLastFrame();
    }
    renderer.syncHud(battle, ui, battleUiState);
    if (battle.mode === "playing") {
      (ui.summon.disabled ? ui.field : ui.summon).focus({ preventScroll: true });
    }
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
    battle.mode === "paused" ? togglePause() : app.startBattle();
  });
  ui.restart.addEventListener("click", app.startBattle);
  ui.pause.addEventListener("click", togglePause);
  for (const [kind, button] of summonSlots) {
    button.addEventListener("click", () => summon(kind));
  }

  function applyQuickRoleSelect(role, additive = false) {
    if (battle.mode !== "playing") return;
    const roleLabels = { all: "Semua pasukan", melee: "Barisan depan (Melee)", ranged: "Barisan belakang (Ranged)" };
    const selected = battle.selectRoleGroup(role, { additive });
    if (selected.length === 0) {
      battleUiState.placingFlag = false;
      syncFlagPlacementCursor();
      if (ui.status) {
        const available = battle.getCombatHeroesByRole(role).length;
        ui.status.textContent = available > 0
          ? "Pilihan pasukan dibatalkan."
          : `Belum ada ${roleLabels[role]?.toLowerCase() ?? "pasukan"} yang hidup.`;
      }
    } else if (ui.status) {
      ui.status.textContent = `${selected.length} pasukan dipilih (${roleLabels[role] ?? role}).`;
    }
    renderer.syncHud(battle, ui, battleUiState);
  }

  ui.selectAllHeroes?.addEventListener("click", (event) => applyQuickRoleSelect("all", event.shiftKey));
  ui.selectMeleeHeroes?.addEventListener("click", (event) => applyQuickRoleSelect("melee", event.shiftKey));
  ui.selectRangedHeroes?.addEventListener("click", (event) => applyQuickRoleSelect("ranged", event.shiftKey));

  ui.cmdAdvance?.addEventListener("click", () => {
    if (battle.mode !== "playing") return;
    battleUiState.placingFlag = false;
    syncFlagPlacementCursor();
    const selectedCount = battle.getSelectedUnits().length;
    if (battle.commandSelectedAdvance() && ui.status) {
      ui.status.textContent = `${selectedCount} pasukan diperintahkan menyerang maju.`;
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
    if (app.getScreen() === "campaign" && event.code === "Escape" && app.closeCampaignSidebar()) {
      return;
    }
    if (app.getScreen() !== "battle" || ui.resultDialog.open || ui.settingsDialog.open ||
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
      moveCamera(app.getCameraX() + (event.code === "ArrowLeft" ? -32 : 32));
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
    const quickRoleKey = event.code === "KeyA" ? "all"
      : event.code === "KeyZ" ? "melee"
      : event.code === "KeyX" ? "ranged"
      : null;
    if (quickRoleKey) {
      event.preventDefault();
      applyQuickRoleSelect(quickRoleKey, event.shiftKey);
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
    if (app.getScreen() !== "battle" && audioManager.lobbyBgm?.paused !== false) {
      audioManager.unlock();
    } else if (app.getScreen() === "battle" && battle.mode === "playing" && audioManager.bgm?.paused !== false) {
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

  return { moveCamera, leaveFullscreen, syncFlagPlacementCursor, isImmersive };
};
