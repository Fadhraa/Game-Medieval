"use strict";

class Entity {
  constructor(x = 0, y = 0, depth = 0) {
    this.x = x;
    this.y = y;
    this.depth = depth;
    this.active = true;
  }

  update(delta, battle) {}

  draw(ctx, ground, time, assets) {}
}

window.Entity = Entity;

