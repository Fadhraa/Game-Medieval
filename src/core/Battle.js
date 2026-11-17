"use strict";

class Battle {
  constructor(mode = "ready") {
    this.mode = mode;
    this.unlockedHeroes = {};
    this.elapsed = 0;

    this.bread = 4;
    this.farmerLimit = 1;
    this.nextSummon = 0;
    this.nextWizard = 0;
    this.nextKira = 0;
    this.nextJames = 0;
    this.nextLynce = 0;
    this.knightsRecruited = 0;
    this.recruits = { knight: 0, wizard: 0, kira: 0, james: 0, lynce: 0 };
    this.goblinsSpawned = 0;
    this.archersSpawned = 0;
    this.minotaursSpawned = 0;

    this.heroHp = Constants.BASES.hero.hp;
    this.enemyHp = Constants.BASES.enemy.hp;
    this.chapterIndex = 0;
    this.baseSkillActiveUntil = 0;
    this.baseSkillCooldownUntil = 0;
    this.selectedUnits = [];
    this.guardFlags = [];
    this.nextFlagId = 0;

    this.units = [];
    this.kills = {};
    this.boss = null;
    this.outpost = null;
    this.mudPits = [];
    this.projectiles = [];
    this.bursts = [];
    this.arrowBursts = [];
    this.particles = [];
    this.healingAuras = [];
    this.lightningBursts = [];
    this.witcherCircles = [];
    this.combatNumbers = [];
    this.frostPrisons = [];
    this.knightAttackQueues = new Map();
  }

  start(ranks = {}, matchHistory = [], stage = campaignStages[0], hasSecondPlot = false, unlockedHeroes = {}) {
    this.unlockedHeroes = { ...unlockedHeroes };
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
    this.nextLynce = 0;
    this.knightsRecruited = 0;
    this.recruits = { knight: 0, wizard: 0, kira: 0, james: 0, lynce: 0 };
    this.goblinsSpawned = 0;
    this.archersSpawned = 0;
    this.minotaursSpawned = 0;
    this.heroHp = Constants.BASES.hero.hp;
    this.enemyHp = Constants.BASES.enemy.hp;
    this.chapterIndex = 0;
    this.baseSkillActiveUntil = 0;
    this.baseSkillCooldownUntil = 0;
    this.selectedUnits = [];
    this.guardFlags = [];
    this.nextFlagId = 0;
    this.units = [];
    this.kills = Object.fromEntries(Object.keys(Progress.killReward).map(kind => [kind, 0]));
    this.bossKind = stage.boss;
    this.boss = null;
    const chapterIndex = Campaign.findIndex(chapter => chapter.stages.some(item => item.id === stage.id));
    this.chapterIndex = chapterIndex >= 0 ? chapterIndex : 0;
    this.arena = Campaign[this.chapterIndex]?.arena;
    this.outpost = this.chapterIndex >= Constants.OUTPOST.unlockChapterIndex && typeof Outpost === "function"
      ? new Outpost()
      : null;
    this.mudPits = this.arena === "swamp" ? this.generateSwampMudPits() : [];
    this.baseSkillActiveUntil = 0;
    this.baseSkillCooldownUntil = 0;
    this.projectiles = [];
    this.bursts = [];
    this.arrowBursts = [];
    this.particles = [];
    this.healingAuras = [];
    this.lightningBursts = [];
    this.witcherCircles = [];
    this.combatNumbers = [];
    this.frostPrisons = [];
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
    else if (kind === "kira" || kind === "james" || kind === "lynce") spawnIndex = this.knightsRecruited++;
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
      case "lynce":
        unit = new Lynce(depth, this.ranks?.lynce);
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
      case "hollowMask":
        unit = new HollowMask(depth);
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

  generateSwampMudPits() {
    const cfg = Constants.SWAMP_MUD;
    const pits = [];
    const isValidX = (x) => {
      if (x < cfg.minX || x > cfg.maxX) return false;
      if (this.outpost && Math.abs(x - this.outpost.x) < cfg.outpostClearance) return false;
      return pits.every((p) => Math.abs(x - p.x) >= cfg.minSpacing);
    };

    for (let i = 0; i < cfg.count; i++) {
      let chosen = null;
      for (let attempt = 0; attempt < 40; attempt++) {
        const candidate = Math.round(cfg.minX + Math.random() * (cfg.maxX - cfg.minX));
        if (isValidX(candidate)) {
          chosen = candidate;
          break;
        }
      }
      if (chosen === null) {
        for (let x = cfg.minX; x <= cfg.maxX; x += 20) {
          if (isValidX(x)) {
            chosen = x;
            break;
          }
        }
      }
      if (chosen !== null) {
        pits.push({ x: chosen, radius: cfg.radius, phase: Math.random() * 4 });
      }
    }
    return pits;
  }

  updateSwampMud(delta) {
    const cfg = Constants.SWAMP_MUD;
    for (const unit of this.units) {
      if (!unit || unit.side !== 1 || unit.kind === "farmer" || unit.hp <= 0 || unit.active === false) {
        if (unit) {
          unit.inMud = false;
          unit.poisoned = false;
          unit.poisonUntil = 0;
        }
        continue;
      }
      const stepping = this.mudPits.some((pit) => Math.abs(unit.x - pit.x) <= pit.radius);
      if (stepping) {
        unit.inMud = true;
        unit.poisonUntil = this.elapsed + cfg.poisonDuration;
      } else {
        unit.inMud = false;
      }

      unit.poisoned = unit.poisonUntil > this.elapsed;
      if (unit.poisoned) {
        unit.mudTickTimer = (unit.mudTickTimer ?? 0) + delta;
        while (unit.mudTickTimer >= cfg.tickInterval && unit.hp > 0) {
          unit.mudTickTimer -= cfg.tickInterval;
          unit.takeDamage(cfg.damage, this, { type: "magic" });
        }
      } else {
        unit.mudTickTimer = 0;
      }
    }
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
    if (!Progress.canRecruit(kind, this.unlockedHeroes)) return false;
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
      case "lynce":
        cost = Constants.LYNCE_COST;
        nextKey = "nextLynce";
        cooldown = Constants.LYNCE_COOLDOWN;
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

  clampGuardX(x) {
    const minX = Constants.DEFEND.minX;
    const maxX = Constants.BASES.enemy.x - Constants.DEFEND.maxMarginFromEnemyBase;
    return Math.round(Math.max(minX, Math.min(maxX, x)));
  }

  getSelectedUnits() {
    this.selectedUnits = this.selectedUnits.filter(
      (unit) => unit && unit.hp > 0 && unit.active !== false
    );
    return this.selectedUnits;
  }

  setSelectedUnits(units) {
    const seen = new Set();
    const valid = [];
    for (const unit of units) {
      if (
        !unit ||
        seen.has(unit) ||
        unit.side !== 1 ||
        unit.kind === "farmer" ||
        unit.hp <= 0 ||
        unit.active === false
      ) {
        continue;
      }
      seen.add(unit);
      valid.push(unit);
    }
    this.selectedUnits = valid;
    return valid;
  }

  clearSelection() {
    this.selectedUnits = [];
  }

  getCombatHeroesByRole(role = "all") {
    const groups = Constants.DEFEND.roleGroups;
    const kinds = role === "melee" ? groups.melee : role === "ranged" ? groups.ranged : null;
    return this.units.filter((unit) => {
      if (!unit || unit.side !== 1 || unit.kind === "farmer" || unit.hp <= 0 || unit.active === false) {
        return false;
      }
      return !kinds || kinds.includes(unit.kind);
    });
  }

  matchesSelectedRole(role) {
    const selected = this.getSelectedUnits();
    const group = this.getCombatHeroesByRole(role);
    if (!group.length || selected.length !== group.length) return false;
    const set = new Set(selected);
    return group.every((unit) => set.has(unit));
  }

  selectRoleGroup(role = "all", { additive = false } = {}) {
    const group = this.getCombatHeroesByRole(role);
    if (!group.length) {
      if (!additive) this.clearSelection();
      return this.getSelectedUnits();
    }
    if (additive) {
      const current = this.getSelectedUnits();
      const currentSet = new Set(current);
      const allSelected = group.every((unit) => currentSet.has(unit));
      if (allSelected) {
        const removeSet = new Set(group);
        return this.setSelectedUnits(current.filter((unit) => !removeSet.has(unit)));
      }
      return this.setSelectedUnits([...current, ...group]);
    }
    if (this.matchesSelectedRole(role)) {
      this.clearSelection();
      return [];
    }
    return this.setSelectedUnits(group);
  }

  getAliveRoleCounts() {
    let melee = 0;
    let ranged = 0;
    let farmers = 0;
    const groups = Constants.DEFEND.roleGroups;
    for (const unit of this.units) {
      if (!unit || unit.side !== 1 || unit.hp <= 0 || unit.active === false) continue;
      if (unit.kind === "farmer") farmers++;
      else if (groups.melee.includes(unit.kind)) melee++;
      else if (groups.ranged.includes(unit.kind)) ranged++;
    }
    const combat = melee + ranged;
    return { combat, melee, ranged, farmers, total: combat + farmers };
  }

  pruneGuardFlags() {
    const activeIds = new Set();
    for (const unit of this.units) {
      if (unit.side === 1 && unit.hp > 0 && unit.command?.flagId) {
        activeIds.add(unit.command.flagId);
      }
    }
    this.guardFlags = this.guardFlags.filter((flag) => activeIds.has(flag.id));
  }

  commandSelectedAdvance() {
    const selected = this.getSelectedUnits();
    if (!selected.length) return false;
    for (const unit of selected) {
      unit.command = null;
    }
    this.pruneGuardFlags();
    return true;
  }

  commandSelectedDefend(rawFlagX) {
    const selected = this.getSelectedUnits();
    if (!selected.length) return false;
    const flagX = this.clampGuardX(rawFlagX);
    const flagId = ++this.nextFlagId;
    const roleCounts = new Map();
    const assignedColors = new Set();

    for (const unit of selected) {
      const roleIdx = roleCounts.get(unit.kind) ?? 0;
      roleCounts.set(unit.kind, roleIdx + 1);
      const backOffset = Constants.DEFEND.formationBackOffsets[unit.kind] ?? 0;
      const stagger = (roleIdx % 4) * 5;
      const guardX = Math.max(
        Constants.BASES.hero.x + 10,
        flagX - backOffset - stagger
      );
      unit.command = { flagId, flagX, guardX, retreating: guardX < unit.x - 2 };
      assignedColors.add(Constants.DEFEND.colors[unit.kind] ?? "#ffcf75");
    }

    this.guardFlags.push({
      id: flagId,
      x: flagX,
      color: assignedColors.size === 1 ? [...assignedColors][0] : "#ffcf75",
      count: selected.length
    });
    this.pruneGuardFlags();
    return true;
  }

  isBaseSkillUnlocked() {
    return this.chapterIndex >= Constants.BASE_SKILL.unlockChapterIndex;
  }

  hasBaseSpeedBuff(unit) {
    return Boolean(
      unit &&
      unit.side === 1 &&
      unit.kind !== "farmer" &&
      this.baseSkillActiveUntil > this.elapsed
    );
  }

  activateBaseSkill() {
    if (
      this.mode !== "playing" ||
      !this.isBaseSkillUnlocked() ||
      this.elapsed < this.baseSkillActiveUntil ||
      this.elapsed < this.baseSkillCooldownUntil
    ) {
      return false;
    }

    this.baseSkillActiveUntil = this.elapsed + Constants.BASE_SKILL.duration;
    this.baseSkillCooldownUntil = this.baseSkillActiveUntil + Constants.BASE_SKILL.cooldown;

    for (let i = 0; i < 14; i++) {
      this.spawnParticle(
        Constants.BASES.hero.x + (Math.random() - 0.5) * 32,
        Constants.GROUND_Y - 10 - Math.random() * 44,
        (Math.random() - 0.5) * 48,
        -24 - Math.random() * 34,
        0.45 + Math.random() * 0.25,
        i % 2 ? "#7ae6ff" : "#3b9eff",
        2
      );
    }
    window.audioManager?.playHit("baseSkill");
    return true;
  }

  spawnProjectile(projectile) {
    this.projectiles.push(projectile);
  }

  spawnBurst(x, y) {
    this.bursts.push(new BurstEffect(x, y));
  }

  spawnShieldBashImpact(x, y) {
    this.bursts.push(new ShieldBashImpact(x, y));
  }

  spawnArrowBurst(x, y, skill = false) {
    this.arrowBursts.push(new LynceArrowBurst(x, y, skill));
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
    const Boss = { commander: Commander, goblinQueen: GoblinQueen }[this.bossKind];
    const threshold = Boss?.summonThreshold ?? ArenaBoss.profiles[this.bossKind].threshold;
    if (this.enemyHp <= Constants.BASES.enemy.hp * threshold + 1e-8) {
      this.boss = Boss ? new Boss() : new ArenaBoss(this.bossKind);
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
    const interval = this.hasBaseSpeedBuff(knight)
      ? knight.attackEvery / Constants.BASE_SKILL.attackSpeedMultiplier
      : knight.attackEvery;
    state.occupiedUntil.push(this.elapsed + interval);
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
      if (unit.hp > 0 && !(unit.stunnedUntil > this.elapsed) && !(unit.frozenUntil > this.elapsed)) unit.update(delta, this);
    }
    if (this.mudPits.length > 0) {
      this.updateSwampMud(delta);
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

    // Update projectiles & outpost
    if (this.outpost) this.outpost.update(delta, this);
    for (const projectile of this.projectiles) {
      projectile.update(delta, this);
    }

    // Update bursts
    for (const burst of this.bursts) {
      burst.update(delta);
    }
    for (const burst of this.arrowBursts) {
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
      if (unit.hp <= 0) {
        if (Object.hasOwn(this.kills, unit.kind)) this.kills[unit.kind]++;
        if (unit !== this.boss) {
          const y = Constants.GROUND_Y + (unit.depth ?? 0);
          if (unit.side === 1 && typeof HeroDefeatSoul === "function") {
            this.bursts.push(new HeroDefeatSoul(unit.x, y));
          } else if (unit.side === -1 && typeof EnemyDefeatPoof === "function") {
            this.bursts.push(new EnemyDefeatPoof(unit.x, y, unit.kind === "minotaur" ? 1.25 : 1));
          }
        }
      }
      return false;
    });
    this.getSelectedUnits();
    this.pruneGuardFlags();
    this.projectiles = this.projectiles.filter((p) => p.active);
    this.bursts = this.bursts.filter((b) => b.active);
    this.arrowBursts = this.arrowBursts.filter((b) => b.active);
    this.particles = this.particles.filter((p) => p.active);
    this.healingAuras = this.healingAuras.filter((a) => a.active);
    this.lightningBursts = this.lightningBursts.filter((lb) => lb.active);
    this.witcherCircles = this.witcherCircles.filter(circle => circle.active);
    this.combatNumbers = this.combatNumbers.filter(number => number.active);
    this.frostPrisons = this.frostPrisons.filter(prison => prison.endsAt > this.elapsed);

    // Win/Loss conditions
    const objectivesCleared = !this.enemyHp &&
      (!this.bossKind || this.boss?.hp === 0);
    if (objectivesCleared && !this.heroHp) this.mode = "draw";
    else if (objectivesCleared && (!this.bossKind || this.boss.defeatFinished)) this.mode = "won";
    else if (!this.heroHp) this.mode = "lost";
  }
}

window.Battle = Battle;
