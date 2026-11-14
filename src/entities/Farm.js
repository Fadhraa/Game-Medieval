"use strict";

class Farm extends Unit {
  constructor(rank = 0) {
    super({ kind: "farmer", side: 1, start: Constants.FARM.homeX, depth: 6, hp: Constants.FARM.hp });
    this.breadPerDelivery = Progress.stats("farm", rank).breadPerDelivery;
    this.phase = "outbound";
    this.phaseTime = 0;
  }

  get crop() {
    if (this.phase === "growing") {
      return this.phaseTime >= Constants.FARM.growthSeconds - 0.75
        ? "wheatRipe" : "wheatSprout";
    }
    return null;
  }

  get status() {
    switch (this.phase) {
      case "outbound": return "Petani menuju ladang";
      case "planting": return "Menanam 3 rumpun";
      case "growing": return this.crop === "wheatRipe" ? "Gandum matang" : "Gandum tumbuh";
      case "harvesting": return "Memanen 3 rumpun";
      case "returning": return "Membawa gandum";
      case "delivered": return "Setoran +" + this.breadPerDelivery + " roti";
    }
  }

  enter(phase) {
    this.phase = phase;
    this.phaseTime = 0;
  }

  update(delta, battle) {
    this.flash = Math.max(0, this.flash - delta);
    const config = Constants.FARM;
    this.phaseTime += delta;
    switch (this.phase) {
      case "outbound":
        this.x = Math.min(config.workX, this.x + config.speed * delta);
        if (this.x === config.workX) this.enter("planting");
        break;
      case "planting":
        if (this.phaseTime >= config.plantSeconds) this.enter("growing");
        break;
      case "growing":
        if (this.phaseTime >= config.growthSeconds) this.enter("harvesting");
        break;
      case "harvesting":
        if (this.phaseTime >= config.harvestSeconds) this.enter("returning");
        break;
      case "returning":
        this.x = Math.max(config.homeX, this.x - config.speed * delta);
        if (this.x === config.homeX) {
          battle.bread += this.breadPerDelivery;
          this.enter("delivered");
        }
        break;
      case "delivered":
        if (this.phaseTime >= config.deliverySeconds) this.enter("outbound");
        break;
    }
  }

  getRenderConfig() {
    return {
      ...super.getRenderConfig(),
      originX: 24,
      feetOrigin: 42,
      barYOffset: 38,
      nativeDirection: this.phase === "returning" ? -1 : 1
    };
  }

  getPose() {
    const config = Constants.FARM;
    let row = 0;
    let frame = 0;
    if (this.phase === "outbound") frame = Math.floor(this.phaseTime * 8) % 6;
    if (this.phase === "planting") {
      row = 1;
      frame = Math.min(5, Math.floor(this.phaseTime * 6 / config.plantSeconds));
    }
    if (this.phase === "harvesting") {
      row = 2;
      frame = Math.min(5, Math.floor(this.phaseTime * 6 / config.harvestSeconds));
    }
    if (this.phase === "returning") {
      row = 3;
      frame = Math.floor(this.phaseTime * 8) % 6;
    }

    return [row, frame];
  }
}

window.Farm = Farm;
