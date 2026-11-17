"use strict";

window.setupCampaignUI = function setupCampaignUI(app) {
  const { ui, battle, renderer, showScreen } = app;
  let activeChapterIndex = 0;
  let activeSidebarStage = null;

  function getStageMonsters(stage) {
    const order = stage?.enemies?.order ?? "";
    const catalog = {
      goblin: { key: "goblin", name: "Goblin", role: "Penyerbu Cepat", isBoss: false },
      archer_goblin: { key: "archer_goblin", name: "Goblin Pemanah", role: "Jarak Jauh", isBoss: false },
      minotaur: { key: "minotaur", name: "Minotaur", role: "Tank Berat", isBoss: false },
      hollowMask: { key: "hollowMask", name: "Topeng Hampa", role: "Assassin Elite", isBoss: false },
      witcher: { key: "witcher", name: "Witcher", role: "Heal & Summon", isBoss: false },
      goblinQueen: { key: "goblinQueen", name: "Ratu Goblin", role: "Bos Chapter 2", isBoss: true },
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
    const profile = app.getProfile();
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
    const profile = app.getProfile();
    const chapter = Campaign[activeChapterIndex];
    const chapterNum = activeChapterIndex + 1;
    const clearedCount = chapter.stages.filter((s) => s.id <= profile.clearedThrough).length;
    const anyUnlocked = chapter.stages.some((s) => Progress.isUnlocked(profile, s));
    const allCleared = clearedCount === chapter.stages.length;

    ui.chapterList.replaceChildren();

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

    const book = document.createElement("div");
    book.className = "storybook-book";
    book.dataset.chapter = String(chapterNum);

    const spread = document.createElement("div");
    spread.className = "storybook-spread";

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

    const spine = document.createElement("div");
    spine.className = "storybook-spine";
    spine.setAttribute("aria-hidden", "true");

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
      const curProfile = app.getProfile();
      if (!activeSidebarStage || !Progress.isUnlocked(curProfile, activeSidebarStage)) return;
      app.setSelectedStage(activeSidebarStage);
      activeSidebarStage = null;
      app.startBattle();
    });

    ui.chapterList.append(bookmarks, book, backdrop, sidebar);
    syncCampaignSidebar();
    refreshCampaignCanvases();
  }

  function openCampaign() {
    const profile = app.getProfile();
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

  function resetNavigation() {
    activeChapterIndex = 0;
    activeSidebarStage = null;
  }

  function closeSidebarIfOpen() {
    if (!activeSidebarStage) return false;
    activeSidebarStage = null;
    syncCampaignSidebar();
    return true;
  }

  ui.enterBattle.addEventListener("click", openCampaign);
  ui.leaveCampaign.addEventListener("click", app.openLobby);
  ui.leaveBattle.addEventListener("click", openCampaign);

  return { openCampaign, refreshCampaignCanvases, closeSidebarIfOpen, resetNavigation };
};
