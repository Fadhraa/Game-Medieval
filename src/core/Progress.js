"use strict";

const Progress = {
  storageKey: "roti-benteng-progress-v1",
  victoryReward: 50,
  killReward: { goblin: 1, minotaur: 5, archer_goblin: 1 },
  maxRank: 3,
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
    farm: {
      name: "Hasil Setoran",
      stats: { breadPerDelivery: { base: Constants.FARM.breadPerDelivery, step: 1 } }
    }
  },

  formatCoins(tenths) {
    return (tenths / 10).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  },

  load() {
    let data;
    try {
      data = JSON.parse(localStorage.getItem(this.storageKey));
    } catch {
      // Storage may be denied or contain invalid data.
    }
    const ranks = {};
    for (const kind of Object.keys(this.upgrades)) {
      const rank = data?.ranks?.[kind];
      ranks[kind] = Number.isInteger(rank) && rank >= 0 && rank <= this.maxRank ? rank : 0;
    }
    const coins = data?.coins;
    const clearedThrough = data?.clearedThrough;
    return {
      coins: Number.isSafeInteger(coins) && coins >= 0 ? coins : 0,
      ranks,
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
      )
    ).map(({ knight, wizard, kira }) => ({ knight, wizard, kira }));
  },

  recordMatch(profile, recruits) {
    profile.matchHistory = this.readMatchHistory([...profile.matchHistory, recruits]);
  },

  resetUpgrades(profile) {
    profile.coins = 0;
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

  buy(profile, kind) {
    if (!Object.hasOwn(this.upgrades, kind)) return false;
    const rank = profile.ranks[kind];
    const cost = this.cost(rank);
    if (rank >= this.maxRank || profile.coins < cost) return false;
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
