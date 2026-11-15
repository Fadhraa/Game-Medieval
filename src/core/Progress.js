"use strict";

const Progress = {
  fileFormat: "roti-benteng-progress",
  fileVersion: 1,
  maxFileBytes: 16384,
  storageKey: "roti-benteng-progress-v1",
  victoryReward: 50,
  killReward: { goblin: 1, minotaur: 5, archer_goblin: 1, witcher: 10, commander: 50, rootGiant: 70, frostGolem: 90 },
  maxRank: 7,
  secondPlotCost: 80,
  historyLimit: 5,
  upgrades: {
    knight: {
      name: "Ksatria Pedang",
      stats: {
        hp: { base: 75, scale: 1.1, step: 3 },
        damage: { base: 10, scale: 1.1, step: 0.5 }
      }
    },
    wizard: {
      name: "Wizard Api",
      stats: {
        hp: { base: 45, scale: 1.1, step: 1 },
        damage: { base: 35, scale: 1.1, step: 2 },
        splashDamage: { base: Constants.FIREBALL_SPLASH, scale: 1.1, step: 0.5 }
      }
    },
    kira: {
      name: "Kira",
      stats: {
        hp: { base: 55, scale: 1.1, step: 3 },
        damage: { base: 20, scale: 1.1, step: 1 },
        healPercent: { base: 5, step: 0.5 }
      }
    },
    james: {
      name: "James · Tanker",
      stats: {
        hp: { base: 120, scale: 1.1, step: 3 },
        damage: { base: 7.5, scale: 1.1, step: 0.5 }
      }
    },
    lynce: {
      name: "Lynce · Marksman",
      stats: {
        hp: { base: 40, scale: 1.1, step: 2 },
        damage: { base: 25, scale: 1.1, step: 1.5 }
      }
    },
    farm: {
      name: "Petani Gandum",
      maxRank: 3,
      stats: { breadPerDelivery: { base: Constants.FARM.breadPerDelivery, step: 1 } }
    }
  },

  formatCoins(tenths) {
    return (tenths / 10).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  },

  maxRankFor(kind) {
    return this.upgrades[kind].maxRank ?? this.maxRank;
  },

  load() {
    let data;
    try {
      data = JSON.parse(localStorage.getItem(this.storageKey));
    } catch {
      // Storage may be denied or contain invalid data.
    }
    return this.normalize(data);
  },

  exportFile(profile) {
    return JSON.stringify({ format: this.fileFormat, version: this.fileVersion, profile }, null, 2);
  },

  importFile(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("File progres bukan JSON yang valid.");
    }
    if (data?.format !== this.fileFormat) throw new Error("Pilih file progres Roti & Benteng.");
    if (data.version !== this.fileVersion) throw new Error("Versi file progres ini belum didukung.");

    const profile = data.profile;
    const integer = (value, max = Number.MAX_SAFE_INTEGER) =>
      Number.isSafeInteger(value) && value >= 0 && value <= max;
    if (!integer(profile?.coins) || !integer(profile.clearedThrough, campaignStages.length) ||
        typeof profile.hasSecondPlot !== "boolean" ||
        (profile.hasSecondPlot && !this.canUnlockSecondPlot(profile)) ||
        !Object.keys(this.upgrades).every(kind => integer(profile.ranks?.[kind], this.maxRankFor(kind))) ||
        !Array.isArray(profile.matchHistory) || profile.matchHistory.length > this.historyLimit ||
        this.readMatchHistory(profile.matchHistory).length !== profile.matchHistory.length) {
      throw new Error("Isi file progres tidak valid.");
    }
    return this.normalize(profile);
  },

  normalize(data) {
    const ranks = {};
    for (const kind of Object.keys(this.upgrades)) {
      const rank = data?.ranks?.[kind];
      ranks[kind] = Number.isInteger(rank) && rank >= 0 && rank <= this.maxRankFor(kind) ? rank : 0;
    }
    const coins = data?.coins;
    const clearedThrough = data?.clearedThrough;
    return {
      coins: Number.isSafeInteger(coins) && coins >= 0 ? coins : 0,
      ranks,
      hasSecondPlot: data?.hasSecondPlot === true,
      clearedThrough: Number.isSafeInteger(clearedThrough)
        ? Math.min(campaignStages.length, Math.max(0, clearedThrough)) : 0,
      matchHistory: this.readMatchHistory(data?.matchHistory)
    };
  },

  save(profile) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(profile));
      return true;
    } catch {
      return false;
    }
  },

  readMatchHistory(history) {
    if (!Array.isArray(history)) return [];
    return history.slice(-this.historyLimit).filter(match =>
      ["knight", "wizard", "kira"].every(kind =>
        Number.isSafeInteger(match?.[kind]) && match[kind] >= 0
      ) && (match.james === undefined || Number.isSafeInteger(match.james) && match.james >= 0) &&
      (match.lynce === undefined || Number.isSafeInteger(match.lynce) && match.lynce >= 0)
    ).map(({ knight, wizard, kira, james = 0, lynce = 0 }) => ({ knight, wizard, kira, james, lynce }));
  },

  recordMatch(profile, recruits) {
    profile.matchHistory = this.readMatchHistory([...profile.matchHistory, recruits]);
  },

  resetUpgrades(profile) {
    profile.coins = 0;
    profile.hasSecondPlot = false;
    for (const kind of Object.keys(this.upgrades)) profile.ranks[kind] = 0;
  },

  cost(rank) {
    return 30 * (rank + 1);
  },

  stats(kind, rank = 0) {
    const definitions = this.upgrades[kind].stats;
    return Object.fromEntries(Object.entries(definitions).map(([stat, definition]) => {
      const { base, scale = 1, step } = definition;
      let value = base;
      for (let level = 0; level < rank; level++) value = value * scale + step;
      return [stat, value];
    }));
  },

  farmStats(rank = 0) {
    const harvestUpgrades = Number(rank >= 1) + Number(rank >= 3);
    return {
      ...this.stats("farm", rank),
      speed: Constants.FARM.speed * (rank >= 2 ? 1.1 : 1),
      harvestSeconds: Constants.FARM.harvestSeconds * 0.9 ** harvestUpgrades
    };
  },

  canUnlockSecondPlot(profile) {
    return this.isUnlocked(profile, Campaign[1].stages[0]);
  },

  buySecondPlot(profile) {
    if (profile.hasSecondPlot || !this.canUnlockSecondPlot(profile) || profile.coins < this.secondPlotCost) return false;
    profile.coins -= this.secondPlotCost;
    profile.hasSecondPlot = true;
    return true;
  },

  buy(profile, kind) {
    if (!Object.hasOwn(this.upgrades, kind)) return false;
    const rank = profile.ranks[kind];
    const cost = this.cost(rank);
    if (rank >= this.maxRankFor(kind) || profile.coins < cost) return false;
    profile.coins -= cost;
    profile.ranks[kind]++;
    return true;
  },

  isUnlocked(profile, stage) {
    return stage.id <= profile.clearedThrough + 1;
  },

  clearStage(profile, stage) {
    if (stage.id === profile.clearedThrough + 1) {
      profile.clearedThrough = stage.id;
      return campaignStages[stage.id] ?? null;
    }
    return null;
  },

  coinsForKills(kind, count) {
    return (this.killReward[kind] ?? 0) * (count ?? 0);
  },

  reward(mode, kills) {
    if (!["won", "lost", "draw"].includes(mode)) return 0;

    const victory = mode === "won" ? this.victoryReward : 0;
    return Object.keys(this.killReward).reduce((total, kind) =>
      total + this.coinsForKills(kind, kills[kind]), victory);
  }
};
