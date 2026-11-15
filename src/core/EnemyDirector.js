"use strict";

class EnemyDirector {
  static monsterKinds = { G: "goblin", M: "minotaur", A: "archer_goblin" };

  static adjustments = {
    wizard: { goblin: 1.15, minotaur: 0.9 },
    knight: { goblin: 0.85, minotaur: 1.05 },
    kira: { goblin: 0.85, minotaur: 1.05 }
  };

  constructor(stage, history) {
    this.style = EnemyDirector.readStyle(history);
    const { first, interval, order } = stage.enemies;
    this.nextSpawn = first;
    this.interval = interval;
    this.order = order;
    this.index = 0;
    this.nextHollowMask = stage.enemies.hollowMaskFirst ?? Infinity;
    this.nextWitcher = stage.enemies.witcherFirst ?? (stage.id >= 6 ? 24 : Infinity);
  }

  static readStyle(history) {
    const matches = history.map(match => ({
      ...match,
      knight: match.knight + (match.james ?? 0),
      total: match.knight + match.wizard + match.kira + (match.james ?? 0) + (match.lynce ?? 0)
    })).filter(match => match.total >= 3);

    if (matches.length < 2) return "balanced";

    const share = (kind) => {
      let total = 0;
      let weight = 0;
      for (const [index, match] of matches.entries()) {
        total += (index + 1) * match[kind] / match.total;
        weight += index + 1;
      }
      return total / weight;
    };

    if (share("wizard") >= 0.45) return "wizard";
    if (share("knight") >= 0.65) return "knight";
    if (share("kira") >= 0.35) return "kira";
    return "balanced";
  }

  pace(kind, heroHp) {
    if (heroHp <= Constants.BASES.hero.hp * 0.25) return 1.12;
    const adjustments = EnemyDirector.adjustments[this.style];
    const multiplier = adjustments?.[kind] ?? adjustments?.goblin ?? 1;
    return Math.min(1.12, Math.max(0.88, multiplier));
  }

  update(battle) {
    if (battle.elapsed >= this.nextWitcher && !battle.activeWitcher) {
      battle.spawnUnit("witcher");
      this.nextWitcher = battle.elapsed + 40;
    }
    if (battle.elapsed >= this.nextHollowMask &&
        !battle.units.some(unit => unit.kind === "hollowMask" && unit.hp > 0)) {
      battle.spawnUnit("hollowMask");
      this.nextHollowMask = battle.elapsed + HollowMask.spawnInterval;
    }
    if (battle.elapsed < this.nextSpawn) return;

    const kind = EnemyDirector.monsterKinds[this.order[this.index]];
    battle.spawnUnit(kind);
    this.index = (this.index + 1) % this.order.length;
    const pressure = Math.min(1, Math.max(0, (battle.elapsed - 60) / 120));
    this.nextSpawn = battle.elapsed + this.interval * (1 - pressure * 0.1) * this.pace(kind, battle.heroHp);
  }
}
