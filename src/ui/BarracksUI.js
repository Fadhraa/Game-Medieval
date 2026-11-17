"use strict";

window.setupBarracksUI = function setupBarracksUI(app) {
  const { ui, saveProfile, syncCoins, showScreen } = app;

  const heroCards = {
    knight: { unit: Knight, cooldown: Constants.SUMMON_COOLDOWN, damageType: "Fisik", name: "Ksatria Pedang", role: "Fighter", summary: "Serangan cepat untuk menjaga garis depan." },
    wizard: { unit: Wizard, cooldown: Constants.WIZARD_COOLDOWN, damageType: "Sihir", name: "Wizard Api", role: "Wizard", summary: "Fireball melukai beberapa musuh sekaligus." },
    kira: { unit: Kira, cooldown: Constants.KIRA_COOLDOWN, damageType: "Sihir", name: "Kira", role: "Healer", summary: "Memulihkan rekan sesuai HP maks. Kira atau menyerang dengan petir." },
    james: { unit: James, cooldown: Constants.JAMES_COOLDOWN, damageType: "Fisik", name: "James", role: "Tanker", summary: "Perisainya membuat musuh terkena stun." },
    lynce: { unit: Lynce, cooldown: Constants.LYNCE_COOLDOWN, damageType: "Fisik", name: "Lynce", role: "Marksman", summary: "Tembakan ketiga menembus barisan musuh." }
  };

  const statLabels = { hp: "HP maks.", damage: "ATK", splashDamage: "Sebaran", healPercent: "Pemulihan" };
  const detailNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

  function formatHeroStat(stat, value) {
    const percent = stat === "healPercent";
    return value.toLocaleString("id-ID", { maximumFractionDigits: percent ? 1 : 0 }) + (percent ? "%" : "");
  }

  function openHeroInfo(kind) {
    const profile = app.getProfile();
    const hero = heroCards[kind];
    const locked = !Progress.canRecruit(kind, profile.unlockedHeroes);
    const rank = locked ? 0 : profile.ranks[kind];
    const unit = new hero.unit(0, rank);
    const number = (value) => detailNumber.format(value);
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
    const profile = app.getProfile();
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

  function refreshPlotUpgrade() {
    const profile = app.getProfile();
    const owned = profile.hasSecondPlot;
    const unlocked = Progress.canUnlockSecondPlot(profile);
    ui.plotCount.textContent = owned ? "2 petak · Maks. 2 petani" : "1 petak · Maks. 1 petani";
    ui.plotRequirement.textContent = owned ? "Panggil petani kedua dengan 1 roti." :
      unlocked ? "Tambah 1 petak dan naikkan batas menjadi 2 petani." :
        "Tersedia setelah Chapter 2 terbuka.";
    ui.buySecondPlot.disabled = owned || !unlocked || profile.coins < Progress.secondPlotCost;
    ui.buySecondPlot.textContent = owned ? "Sudah dibeli" : "Beli · " + Progress.formatCoins(Progress.secondPlotCost) + " koin";
  }

  function refreshUpgrades(container) {
    const profile = app.getProfile();
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
      if (app.getScreen() !== menu) return;
      const profile = app.getProfile();
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

  ui.enterBarracks.addEventListener("click", openBarracks);
  ui.leaveBarracks.addEventListener("click", app.openLobby);
  ui.enterGranary.addEventListener("click", () => {
    ui.granaryStatus.textContent = "";
    refreshUpgrades(ui.granaryCards);
    showScreen("granary", ui.granaryTitle);
  });
  ui.buySecondPlot.addEventListener("click", () => {
    const profile = app.getProfile();
    if (app.getScreen() !== "granary" || !Progress.buySecondPlot(profile)) return;
    saveProfile();
    refreshUpgrades(ui.granaryCards);
    ui.granaryStatus.textContent = "Petak kedua dibuka. Batas petani naik menjadi 2.";
  });
  ui.leaveGranary.addEventListener("click", app.openLobby);

  return { openBarracks, refreshUpgrades };
};
