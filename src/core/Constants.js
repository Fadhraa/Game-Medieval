"use strict";

const Constants = {
  CANVAS_WIDTH: 576,
  CANVAS_HEIGHT: 247,
  GROUND_Y: 209,

  BREAD_INTERVAL: 3,
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
    enemy: { x: 476, hp: 300 }
  },

  ASSETS: {
    sprites: {
      knight: "assets/sprites/units/knight.png",
      wizard: "assets/sprites/units/wizard.png",
      goblin: "assets/sprites/units/goblin.png",
      minotaur: "assets/sprites/units/minotaur.png",
      kira: "assets/sprites/units/kira.png",
      fireball: "assets/sprites/projectiles/fireball.png",
      lightning: "assets/sprites/projectiles/lightning_kira.png",
      healingAura: "assets/sprites/projectiles/healing_kira.png"
    },
    sfx: {
      knight: "assets/sfx/knight-slash.wav",
      fireball: "assets/sfx/fireball-explode.wav"
    },
    bgm: {
      main: "assets/Back_sound/1.mp3"
    }
  }
};

window.Constants = Constants;
