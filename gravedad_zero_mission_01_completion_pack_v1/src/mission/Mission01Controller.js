// src/mission/Mission01Controller.js
// State machine sketch for the first playable mission.
// Integrate with the existing Three.js runtime without replacing the current stage/view mapping.

export class Mission01Controller {
  constructor({ audio, hud, vfx, ship, astronaut, world }) {
    this.audio = audio;
    this.hud = hud;
    this.vfx = vfx;
    this.ship = ship;
    this.astronaut = astronaut;
    this.world = world;

    this.stage = 1;
    this.smallDestroyed = 0;
    this.largeDestroyed = 0;
    this.requiredSmall = 3;
    this.requiredLarge = 1;
    this.state = "boot";
  }

  start() {
    this.setState("mission_start");
    this.audio?.playOneShot("mission_start");
    this.hud?.show("mission_start");
    this.spawnSmallAsteroids();
  }

  spawnSmallAsteroids() {
    this.setState("astronaut_phase");
    this.smallDestroyed = 0;
    this.hud?.show("astronaut_phase", { count: this.smallDestroyed });
    this.astronaut?.exitShip?.();
    this.audio?.playOneShot("astronaut_exit");
    this.world?.spawnSmallAsteroids?.(this.requiredSmall);
  }

  onSmallAsteroidHit(position) {
    this.audio?.playOneShot("small_asteroid_hit");
    this.vfx?.play?.("smallAsteroidHitFlash", position);
  }

  onSmallAsteroidDestroyed(position) {
    this.smallDestroyed += 1;
    this.audio?.playOneShot("small_asteroid_break");
    this.vfx?.playAtlas?.("smallAsteroidBreakAtlas", position);
    this.hud?.show("astronaut_phase", { count: this.smallDestroyed });

    if (this.smallDestroyed >= this.requiredSmall) {
      this.onSmallPhaseComplete();
    }
  }

  onSmallPhaseComplete() {
    this.setState("small_asteroids_complete");
    this.hud?.show("small_asteroids_complete");
    this.spawnLargeObstacle();
  }

  spawnLargeObstacle() {
    this.setState("large_obstacle_phase");
    this.hud?.show("large_obstacle_phase");
    this.audio?.playOneShot("large_obstacle_spawn");
    this.world?.spawnLargeObstacle?.({ stage: this.stage, index: this.largeDestroyed + 1 });
  }

  onLargeObstacleHit(position) {
    this.audio?.playOneShot("large_obstacle_hit");
    this.vfx?.play?.("largeObstacleCoreCracks", position);
  }

  onLargeObstacleDestroyed(position) {
    this.largeDestroyed += 1;
    this.audio?.playOneShot("large_obstacle_break");
    this.vfx?.playAtlas?.("largeObstacleBreakAtlas", position);

    if (this.largeDestroyed >= this.requiredLarge) {
      this.revealRelic(position);
    } else {
      this.spawnLargeObstacle();
    }
  }

  revealRelic(position) {
    this.setState("relic_reveal");
    this.hud?.show("relic_reveal");
    this.audio?.playOneShot("relic_reveal");
    this.vfx?.spawnRelic?.(position, { scaleRelativeToAstronaut: 1.5 });
    setTimeout(() => {
      this.audio?.playOneShot("relic_expansion_burst");
      this.vfx?.playAtlas?.("stageUnlockShockwaveAtlas", position);
      this.vfx?.setRelicState?.("idle_collectible");
      this.audio?.playLoop("relic_idle");
      this.hud?.show("relic_collectible");
      this.setState("relic_collectible");
    }, 1200);
  }

  onAstronautTouchRelic(position) {
    this.setState("stage_unlock");
    this.audio?.stopLoop("relic_idle");
    this.audio?.playOneShot("astronaut_touch_relic");
    this.vfx?.play?.("energyTransferBeam", position);
    this.audio?.playOneShot("energy_transfer_to_ship");

    setTimeout(() => {
      this.audio?.playOneShot("stage_unlocked");
      this.hud?.show("stage_unlock");
      this.ship?.setStage?.(2); // Use existing mapped stage views. Do not remap.
      this.vfx?.play?.("stageUnlockFlash", this.ship?.position);
    }, 700);
  }

  setState(nextState) {
    this.state = nextState;
  }
}
