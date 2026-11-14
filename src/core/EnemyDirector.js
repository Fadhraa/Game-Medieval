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
    this.waves = stage.waves;
    this.groupGap = stage.groupGap ?? 7;
    this.waveIndex = 0;
    this.groupIndex = 0;
    this.unitIndex = 0;
    this.waveStart = this.waves[0][0];
  }

  static readStyle(history) {
    const matches = history.map(match => ({
      ...match,
      knight: match.knight + (match.james ?? 0),
      total: match.knight + match.wizard + match.kira + (match.james ?? 0)
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

  pace(groups, heroHp) {
    // Give the player time to recover when the castle is under pressure.
    if (heroHp <= Constants.BASES.hero.hp * 0.25) return 1.12;
    const adjustments = EnemyDirector.adjustments[this.style];
    if (!adjustments) return 1;
    const monsters = groups.join("");
    const sum = [...monsters].reduce((total, monster) =>
      total + (adjustments[EnemyDirector.monsterKinds[monster]] ?? adjustments.goblin), 0);
    return Math.min(1.12, Math.max(0.88, sum / monsters.length));
  }

  update(battle) {
    // Stagger units within each group while keeping each wave’s formation.
    while (this.waveIndex < this.waves.length) {
      const group = this.waves[this.waveIndex][this.groupIndex + 1];
      const groupStart = this.waveStart + this.groupIndex * this.groupGap;
      const nextSpawn = groupStart + this.unitIndex * 0.45;
      if (battle.elapsed < nextSpawn) break;

      battle.spawnUnit(EnemyDirector.monsterKinds[group[this.unitIndex]]);
      if (++this.unitIndex < group.length) continue;

      this.unitIndex = 0;
      if (++this.groupIndex + 1 < this.waves[this.waveIndex].length) continue;

      this.groupIndex = 0;
      const nextWave = this.waves[++this.waveIndex];
      if (nextWave) {
        const [delay, ...groups] = nextWave;
        this.waveStart += delay * this.pace(groups, battle.heroHp);
      }
    }
  }
}
