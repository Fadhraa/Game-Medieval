"use strict";

const arenaExtension = 464;

const Constants = {
  CANVAS_WIDTH: 576,
  WORLD_WIDTH: 576 + arenaExtension,
  CANVAS_HEIGHT: 247,
  GROUND_Y: 209,

  FARM: {
    cost: 1,
    hp: 40,
    homeX: 126,
    workX: 155,
    plotX: 193,
    speed: 35,
    plantSeconds: 1.1,
    growthSeconds: 3.8,
    harvestSeconds: 1.2,
    deliverySeconds: 0.8,
    breadPerDelivery: 4
  },
  KNIGHT_COST: 2,
  SUMMON_COOLDOWN: 1.5,
  WIZARD_COST: 8,
  WIZARD_COOLDOWN: 5,
  KIRA_COST: 6,
  KIRA_COOLDOWN: 5,

  FIREBALL_SPEED: 220,
  FIREBALL_SPLASH: 5,
  FIREBALL_RADIUS: 34,

  KNIGHTS_PER_TARGET: 2,
  TROOP_DEPTHS: [0, 4, -3],

  BASES: {
    hero: { x: 109, hp: 360 },
    enemy: { x: 476 + arenaExtension, spawnX: 501 + arenaExtension, hp: 300 }
  },

  ASSETS: {
    sprites: {
      farmer: "assets/sprites/units/farmer-v2.png",
      farmPlot: "assets/sprites/farm/plot.png",
      wheatSprout: "assets/sprites/farm/wheat-sprout.png",
      wheatRipe: "assets/sprites/farm/wheat-ripe.png",
      knight: "assets/sprites/units/knight.png",
      wizard: "assets/sprites/units/wizard.png",
      goblin: "assets/sprites/units/goblin.png",
      archer_goblin: "assets/sprites/units/archer-goblin.png",
      minotaur: "assets/sprites/units/minotaur.png",
      kira: "assets/sprites/units/kira-chibi.png",
      fireball: "assets/sprites/projectiles/fireball.png",
      goblinBolt: "assets/sprites/projectiles/goblin-bolt.png",
      lightning: "assets/sprites/projectiles/lightning_kira.png",
      healingAura: "assets/sprites/projectiles/healing_kira.png"
    },
    sfx: {
      knight: "assets/sfx/knight-slash.wav",
      fireball: "assets/sfx/fireball-explode.wav",
      lightningLaunch: "assets/sfx/lightning-launch.wav",
      lightning: "assets/sfx/lightning-impact.wav",
      heal: "assets/sfx/heal-receive.wav"
    },
    bgm: {
      main: "assets/Back_sound/1.mp3"
    }
  }
};

window.Constants = Constants;
