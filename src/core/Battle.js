"use strict";

class Battle {
  constructor(mode = "ready") {
    this.mode = mode;
    this.elapsed = 0;

    this.bread = 4;
    this.farmerLimit = 1;
    this.nextSummon = 0;
    this.nextWizard = 0;
    this.nextKira = 0;
    this.nextJames = 0;
    this.knightsRecruited = 0;
    this.recruits = { knight: 0, wizard: 0, kira: 0, james: 0 };
    this.goblinsSpawned = 0;
    this.archersSpawned = 0;
    this.minotaursSpawned = 0;

    this.heroHp = Constants.BASES.hero.hp;
    this.enemyHp = Constants.BASES.enemy.hp;

    this.units = [];
    this.kills = {};
    this.boss = null;
    this.projectiles = [];
    this.bursts = [];
    this.particles = [];
    this.healingAuras = [];
    this.lightningBursts = [];
    this.witcherCircles = [];
    this.combatNumbers = [];
    this.knightAttackQueues = new Map();
  }

  start(ranks = {}, matchHistory = [], stage = campaignStages[0], hasSecondPlot = false) {
    this.enemyDirector = new EnemyDirector(stage, matchHistory);
    this.ranks = { ...ranks };
    this.mode = "playing";
    this.elapsed = 0;
    this.bread = 4;
    this.farmerLimit = hasSecondPlot ? Constants.FARM.plots.length : 1;
    this.nextSummon = 0;
    this.nextWizard = 0;
    this.nextKira = 0;
    this.nextJames = 0;
    this.knightsRecruited = 0;
    this.recruits = { knight: 0, wizard: 0, kira: 0, james: 0 };
    this.goblinsSpawned = 0;
    this.archersSpawned = 0;
    this.minotaursSpawned = 0;
    this.heroHp = Constants.BASES.hero.hp;
    this.enemyHp = Constants.BASES.enemy.hp;
    this.units = [];
    this.kills = Object.fromEntries(Object.keys(Progress.killReward).map(kind => [kind, 0]));
    this.bossKind = stage.boss;
    this.boss = null;
    this.arena = Campaign.find(chapter => chapter.stages.some(item => item.id === stage.id))?.arena;
    this.projectiles = [];
    this.bursts = [];
    this.particles = [];
    this.healingAuras = [];
    this.lightningBursts = [];
    this.witcherCircles = [];
    this.combatNumbers = [];
    this.knightAttackQueues.clear();
  }

  pause() {
    if (this.mode === "playing") this.mode = "paused";
  }

  resume() {
    if (this.mode === "paused") this.mode = "playing";
  }

  spawnUnit(kind, { x, empowered = false } = {}) {
    let spawnIndex = 0;
    if (kind === "knight") spawnIndex = this.knightsRecruited++;
    else if (kind === "wizard") spawnIndex = this.knightsRecruited++;
    else if (kind === "kira" || kind === "james") spawnIndex = this.knightsRecruited++;
    else if (kind === "minotaur") spawnIndex = this.minotaursSpawned++;
    else if (kind === "goblin") spawnIndex = this.goblinsSpawned++;
    else if (kind === "archer_goblin") spawnIndex = this.archersSpawned++;

    const depth =
      Constants.TROOP_DEPTHS[spawnIndex % Constants.TROOP_DEPTHS.length];
    let unit;

    switch (kind) {
      case "knight":
        unit = new Knight(depth, this.ranks?.knight);
        break;
      case "wizard":
        unit = new Wizard(depth, this.ranks?.wizard);
        break;
      case "kira":
        unit = new Kira(depth, this.ranks?.kira);
        break;
      case "james":
        unit = new James(depth, this.ranks?.james);
        break;
      case "goblin":
        unit = new Goblin(depth);
        break;
      case "archer_goblin":
        unit = new ArcherGoblin(depth);
        break;
      case "minotaur":
        unit = new Minotaur(depth, empowered);
        break;
      case "witcher":
        unit = new Witcher(depth);
        break;
      default:
        console.warn(`Unknown unit kind: ${kind}`);
        return null;
    }

    if (x !== undefined) unit.x = x;
    this.units.push(unit);
    return unit;
  }

  get farmersByPlot() {
    const farmers = Array(this.farmerLimit).fill(null);
    for (const unit of this.units) {
      if (unit.kind === "farmer" && unit.hp > 0) farmers[unit.plotIndex] = unit;
    }
    return farmers;
  }

  get activeWitcher() {
    return this.units.find(unit => unit.kind === "witcher" && unit.hp > 0);
  }

  get availableTroopBread() {
    // An active farmer can replenish the stock without keeping a recruitment reserve.
    const reserve = this.farmersByPlot.some(Boolean) ? 0 : Constants.FARM.cost;
    return Math.max(0, this.bread - reserve);
  }

  get openFarmPlot() {
    if (this.mode !== "playing" || this.bread < Constants.FARM.cost) return -1;
    return this.farmersByPlot.indexOf(null);
  }

  recruit(kind = "knight") {
    if (kind === "farmer") {
      const plotIndex = this.openFarmPlot;
      if (plotIndex === -1) return false;
      this.bread -= Constants.FARM.cost;
      this.units.push(new Farm(this.ranks?.farm, plotIndex));
      return true;
    }

    let cost, nextKey, cooldown;

    switch (kind) {
      case "wizard":
        cost = Constants.WIZARD_COST;
        nextKey = "nextWizard";
        cooldown = Constants.WIZARD_COOLDOWN;
        break;
      case "kira":
        cost = Constants.KIRA_COST;
        nextKey = "nextKira";
        cooldown = Constants.KIRA_COOLDOWN;
        break;
      case "james":
        cost = Constants.JAMES_COST;
        nextKey = "nextJames";
        cooldown = Constants.JAMES_COOLDOWN;
        break;
      default:
        cost = Constants.KNIGHT_COST;
        nextKey = "nextSummon";
        cooldown = Constants.SUMMON_COOLDOWN;
        break;
    }

    if (
      this.mode !== "playing" ||
      this.availableTroopBread < cost ||
      this.elapsed < this[nextKey]
    ) {
      return false;
    }

    this.bread -= cost;
    this[nextKey] = this.elapsed + cooldown;
    const unit = this.spawnUnit(kind);
    if (unit) this.recruits[unit.kind]++;
    return true;
  }

  spawnProjectile(projectile) {
    this.projectiles.push(projectile);
  }

  spawnBurst(x, y) {
    this.bursts.push(new BurstEffect(x, y));
  }

  spawnLightningBurst(x, y) {
    this.lightningBursts.push(new LightningBurst(x, y));
  }

  spawnHealingAura(target) {
    this.healingAuras.push(new HealingAura(target));
  }

  spawnParticle(x, y, vx, vy, life, color, size = 1) {
    this.particles.push(new Particle(x, y, vx, vy, life, color, size));
  }

  spawnImpact(x, heavy = false) {
    const count = heavy ? 9 : 5;
    for (let i = 0; i < count; i++) {
      this.spawnParticle(
        x,
        194,
        (Math.random() - 0.5) * 64,
        -12 - Math.random() * 33,
        0.28 + Math.random() * 0.19,
        i % 2 ? "#fff1c6" : "#e6a15c",
        heavy ? 2 : 1,
      );
    }
  }

  damageBase(attackerSide, amount) {
    if (attackerSide === 1) {
      this.enemyHp = Math.max(0, this.enemyHp - amount);
      this.spawnImpact(Constants.BASES.enemy.x, true);
      this.checkBossArrival();
    } else {
      this.heroHp = Math.max(0, this.heroHp - amount);
      this.spawnImpact(Constants.BASES.hero.x, true);
    }
  }

  checkBossArrival() {
    if (!this.bossKind || this.boss) return;
    const threshold = this.bossKind === "commander" ? Commander.summonThreshold :
      ArenaBoss.profiles[this.bossKind].threshold;
    if (this.enemyHp <= Constants.BASES.enemy.hp * threshold + 1e-8) {
      this.boss = this.bossKind === "commander" ? new Commander() : new ArenaBoss(this.bossKind);
      this.units.push(this.boss);
    }
  }

  showCombatNumber(unit, amount) {
    if (amount !== 0) this.combatNumbers.push(new CombatNumber(unit, amount));
  }

  takeKnightAttackSlot(target, knight) {
    let state = this.knightAttackQueues.get(target);
    if (!state) {
      state = { waiting: new Set(), occupiedUntil: [] };
      this.knightAttackQueues.set(target, state);
    }

    state.waiting.add(knight);
    if (state.waiting.values().next().value !== knight ||
        state.occupiedUntil.length >= Constants.KNIGHTS_PER_TARGET) {
      return false;
    }

    state.waiting.delete(knight);
    // Keep the slot for one attack interval so a stack cannot burst past the cap.
    state.occupiedUntil.push(this.elapsed + knight.attackEvery);
    return true;
  }

  update(delta) {
    if (this.mode !== "playing") return;

    this.elapsed += delta;

    this.checkBossArrival();
    if (this.boss?.hp === 0) this.boss.actionAge += delta;
    this.enemyDirector.update(this);

    for (const state of this.knightAttackQueues.values()) {
      state.occupiedUntil = state.occupiedUntil.filter(time => time > this.elapsed + 1e-8);
    }

    // Update units
    for (const unit of this.units) {
      if (unit.hp > 0 && !(unit.stunnedUntil > this.elapsed)) unit.update(delta, this);
    }

    for (const [target, state] of this.knightAttackQueues) {
      for (const knight of state.waiting) {
        if (knight.hp <= 0 || knight.attackTarget !== target) state.waiting.delete(knight);
      }
      if ((target instanceof Unit && target.hp <= 0) ||
          (state.waiting.size === 0 && state.occupiedUntil.length === 0)) {
        this.knightAttackQueues.delete(target);
      }
    }

    // Update projectiles
    for (const projectile of this.projectiles) {
      projectile.update(delta, this);
    }

    // Update bursts
    for (const burst of this.bursts) {
      burst.update(delta);
    }

    // Update particles
    for (const particle of this.particles) {
      particle.update(delta);
    }

    // Update healing auras
    for (const aura of this.healingAuras) {
      aura.update(delta);
    }

    // Update lightning bursts
    for (const lb of this.lightningBursts) {
      lb.update(delta);
    }
    for (const circle of this.witcherCircles) circle.update(delta);
    for (const number of this.combatNumbers) number.update(delta);

    // Garbage collection of dead/inactive entities
    this.units = this.units.filter((unit) => {
      if (unit.active && unit.hp > 0) return true;
      if (unit.hp <= 0 && Object.hasOwn(this.kills, unit.kind)) this.kills[unit.kind]++;
      return false;
    });
    this.projectiles = this.projectiles.filter((p) => p.active);
    this.bursts = this.bursts.filter((b) => b.active);
    this.particles = this.particles.filter((p) => p.active);
    this.healingAuras = this.healingAuras.filter((a) => a.active);
    this.lightningBursts = this.lightningBursts.filter((lb) => lb.active);
    this.witcherCircles = this.witcherCircles.filter(circle => circle.active);
    this.combatNumbers = this.combatNumbers.filter(number => number.active);

    // Win/Loss conditions
    const objectivesCleared = !this.enemyHp &&
      (!this.bossKind || this.boss?.hp === 0);
    if (objectivesCleared && !this.heroHp) this.mode = "draw";
    else if (objectivesCleared && (!this.bossKind || this.boss.defeatFinished)) this.mode = "won";
    else if (!this.heroHp) this.mode = "lost";
  }
}

window.Battle = Battle;
