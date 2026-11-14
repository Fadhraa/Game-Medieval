"use strict";

class Battle {
  constructor(mode = "ready") {
    this.mode = mode;
    this.elapsed = 0;

    this.bread = 4;
    this.nextSummon = 0;
    this.nextWizard = 0;
    this.nextKira = 0;
    this.knightsRecruited = 0;
    this.recruits = { knight: 0, wizard: 0, kira: 0 };
    this.goblinsSpawned = 0;
    this.archersSpawned = 0;
    this.minotaursSpawned = 0;

    this.heroHp = Constants.BASES.hero.hp;
    this.enemyHp = Constants.BASES.enemy.hp;

    this.units = [];
    this.kills = { goblin: 0, minotaur: 0, archer_goblin: 0 };
    this.projectiles = [];
    this.bursts = [];
    this.particles = [];
    this.healingAuras = [];
    this.lightningBursts = [];
    this.knightAttackQueues = new Map();
  }

  start(ranks = {}, matchHistory = [], stage = campaignStages[0]) {
    this.enemyDirector = new EnemyDirector(stage, matchHistory);
    this.ranks = { ...ranks };
    this.mode = "playing";
    this.elapsed = 0;
    this.bread = 4;
    this.nextSummon = 0;
    this.nextWizard = 0;
    this.nextKira = 0;
    this.knightsRecruited = 0;
    this.recruits = { knight: 0, wizard: 0, kira: 0 };
    this.goblinsSpawned = 0;
    this.archersSpawned = 0;
    this.minotaursSpawned = 0;
    this.heroHp = Constants.BASES.hero.hp;
    this.enemyHp = Constants.BASES.enemy.hp;
    this.units = [];
    this.kills = { goblin: 0, minotaur: 0, archer_goblin: 0 };
    this.projectiles = [];
    this.bursts = [];
    this.particles = [];
    this.healingAuras = [];
    this.lightningBursts = [];
    this.knightAttackQueues.clear();
  }

  pause() {
    if (this.mode === "playing") this.mode = "paused";
  }

  resume() {
    if (this.mode === "paused") this.mode = "playing";
  }

  spawnUnit(kind) {
    let spawnIndex = 0;
    if (kind === "knight") spawnIndex = this.knightsRecruited++;
    else if (kind === "wizard") spawnIndex = this.knightsRecruited++;
    else if (kind === "kira") spawnIndex = this.knightsRecruited++;
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
      case "goblin":
        unit = new Goblin(depth);
        break;
      case "archer_goblin":
        unit = new ArcherGoblin(depth);
        break;
      case "minotaur":
        unit = new Minotaur(depth);
        break;
      default:
        console.warn(`Unknown unit kind: ${kind}`);
        return null;
    }

    this.units.push(unit);
    return unit;
  }

  get farm() {
    return this.units.find(unit => unit.kind === "farmer" && unit.hp > 0) ?? null;
  }

  get availableTroopBread() {
    return Math.max(0, this.bread - Constants.FARM.cost);
  }

  get canRecruitFarmer() {
    return this.mode === "playing" && !this.farm && this.bread >= Constants.FARM.cost;
  }

  recruit(kind = "knight") {
    if (kind === "farmer") {
      if (!this.canRecruitFarmer) return false;
      this.bread -= Constants.FARM.cost;
      this.units.push(new Farm(this.ranks?.farm));
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
    } else {
      this.heroHp = Math.max(0, this.heroHp - amount);
      this.spawnImpact(Constants.BASES.hero.x, true);
    }
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

    this.enemyDirector.update(this);

    for (const state of this.knightAttackQueues.values()) {
      state.occupiedUntil = state.occupiedUntil.filter(time => time > this.elapsed + 1e-8);
    }

    // Update units
    for (const unit of this.units) {
      if (unit.hp > 0) unit.update(delta, this);
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

    // Win/Loss conditions
    if (!this.enemyHp && !this.heroHp) this.mode = "draw";
    else if (!this.enemyHp) this.mode = "won";
    else if (!this.heroHp) this.mode = "lost";
  }
}

window.Battle = Battle;
