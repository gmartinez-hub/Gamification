import { SCENARIOS, scenarioForStage } from "./scenarios.js";
import { GravityFieldSystem } from "./GravityFieldSystem.js";
import { CameraDirector } from "./CameraDirector.js";
import { AdaptiveAudioDirector } from "./AdaptiveAudioDirector.js";
import { HolographicMap } from "./HolographicMap.js";
import { InterstageDirector } from "./InterstageDirector.js";

const ASSET_BASE = "/assets/runtime/final-showable/textures";

export class FinalShowableRuntime {
  constructor({
    THREE, scene, backgroundScene, camera, state, mission01, input,
    shipGroup, astronautState, setDirection, beginStageNavigation,
    syncRobotCompanion, updateStageHud,
  }) {
    this.THREE = THREE;
    this.scene = scene;
    this.backgroundScene = backgroundScene;
    this.camera = camera;
    this.state = state;
    this.mission01 = mission01;
    this.input = input;
    this.shipGroup = shipGroup;
    this.astronautState = astronautState;
    this.setDirection = setDirection;
    this.beginStageNavigation = beginStageNavigation;
    this.syncRobotCompanion = syncRobotCompanion;
    this.updateStageHud = updateStageHud;

    this.worldStageIndex = Math.max(0, Math.min(3, mission01.currentStageIndex || state.stageIndex || 0));
    this.highestUnlockedStage = Math.max(this.worldStageIndex, mission01.gems || 0);
    this.pendingAdvance = null;
    this.visitedStages = new Set([this.worldStageIndex]);
    this.discovered = new Set(JSON.parse(localStorage.getItem("gz-final-discovered") || "[]"));

    this.audio = new AdaptiveAudioDirector();
    this.cameraDirector = new CameraDirector({ camera });
    this.gravity = new GravityFieldSystem({ scenarios: SCENARIOS, onEvent: (name) => this.onEvent(name) });
    this.map = new HolographicMap({
      scenarios: SCENARIOS,
      getState: () => this.mapState(),
      onAudio: (name) => this.audio.play(name, 0.12),
    });
    this.interstage = new InterstageDirector({
      THREE, scene, cameraDirector: this.cameraDirector, audio: this.audio,
      onComplete: (stage) => this.completeTravel(stage),
    });

    this.textureLoader = new THREE.TextureLoader();
    this.worldRoot = new THREE.Group();
    this.worldRoot.name = "FinalShowableAuthoredWorld";
    this.backgroundScene.add(this.worldRoot);
    this.scenarioGroups = SCENARIOS.map((scenario) => this.buildScenario(scenario));
    this.bindInput();
    this.applyQaRoute();
    this.enterWorldStage(this.worldStageIndex, { teleport: false });
  }

  buildScenario(scenario) {
    const group = new this.THREE.Group();
    group.userData.scenario = scenario;
    this.worldRoot.add(group);

    const heroTex = this.textureLoader.load(`/${scenario.hero.texture.replace(/^\/+/, "")}`);
    const hero = new this.THREE.Sprite(new this.THREE.SpriteMaterial({ map: heroTex, transparent: true, depthWrite: false, opacity: 0.96 }));
    hero.userData.world = { x: scenario.hero.x, y: scenario.hero.y };
    hero.userData.worldScale = scenario.hero.scale;
    hero.position.z = -4.2;
    group.add(hero);

    for (const landmark of scenario.landmarks) {
      const tex = this.textureLoader.load(`${ASSET_BASE}/${landmark.texture}`);
      const sprite = new this.THREE.Sprite(new this.THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.95 }));
      sprite.userData.world = { x: landmark.x, y: landmark.y };
      sprite.userData.worldScale = landmark.scale;
      sprite.userData.landmark = landmark;
      sprite.position.z = -2.5;
      group.add(sprite);
    }

    for (const gate of [scenario.backGate, scenario.gate].filter(Boolean)) {
      const tex = this.textureLoader.load(`${ASSET_BASE}/gate.png`);
      const sprite = new this.THREE.Sprite(new this.THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.72 }));
      sprite.userData.world = { x: gate.x, y: gate.y };
      sprite.userData.worldScale = 2.7;
      sprite.userData.gate = gate;
      sprite.position.z = -2.2;
      group.add(sprite);
    }

    group.visible = false;
    return group;
  }

  bindInput() {
    window.addEventListener("keydown", (event) => {
      const key = event.key?.toLowerCase();
      if (key === "m") {
        event.preventDefault();
        this.map.toggle();
      } else if (event.key === "Tab" && this.map.open) {
        event.preventDefault();
        this.map.toggleMode();
      } else if (event.code === "Space" && !this.map.open) {
        this.gravity.activateStabilizer();
      } else if (key === "e" && !this.map.open) {
        this.tryGateTravel();
        this.tryDiscoverSecondary();
      }
    });
  }

  applyQaRoute() {
    const qa = new URLSearchParams(window.location.search).get("qa");
    const map = { stage1:0, stage2:1, stage3:2, final:3 };
    if (qa in map) {
      this.highestUnlockedStage = Math.max(this.highestUnlockedStage, map[qa]);
      this.enterWorldStage(map[qa], { teleport: true });
    }
    if (qa === "map") setTimeout(() => this.map.toggle(), 500);
    if (qa === "gravity") {
      const s = scenarioForStage(this.worldStageIndex);
      const f = s.gravity[0];
      if (f) this.state.worldOffset.set(f.x, f.y);
    }
    if (qa === "transition12") {
      this.highestUnlockedStage = Math.max(this.highestUnlockedStage, 1);
      setTimeout(() => this.travelTo(1, { firstVisit: true }), 700);
    }
    if (qa === "transition23") {
      this.highestUnlockedStage = Math.max(this.highestUnlockedStage, 2);
      setTimeout(() => this.travelTo(2, { firstVisit: true }), 700);
    }
    if (qa === "transition3final") {
      this.highestUnlockedStage = 3;
      setTimeout(() => this.travelTo(3, { firstVisit: true }), 700);
    }
  }

  mapState() {
    const scenario = scenarioForStage(this.worldStageIndex);
    return {
      worldStageIndex: this.worldStageIndex,
      highestUnlockedStage: this.highestUnlockedStage,
      worldX: this.state.worldOffset.x,
      worldY: this.state.worldOffset.y,
      gems: this.mission01.gems || 0,
      shipStage: this.state.stageIndex || 0,
      discoveredSecondaries: scenario.landmarks.filter((lm) => lm.secondary && this.discovered.has(lm.id)).length,
    };
  }

  onEvent(name) {
    if (name === "gravity_first") this.syncRobotCompanion?.("gravity");
    if (name === "stabilizer_used") this.syncRobotCompanion?.("ready");
  }

  requestStageAdvance(nextStage, fallback) {
    this.pendingAdvance = { nextStage, fallback };
    this.highestUnlockedStage = Math.max(this.highestUnlockedStage, nextStage);

    // La evolución visual ocurre antes del corredor. Stage 4 no existe.
    this.state.stageIndex = Math.min(2, nextStage);
    this.setDirection?.(this.state.direction || "idle");
    this.updateStageHud?.();
    this.audio.play("gem_materialize", 0.24);
    setTimeout(() => this.audio.play("ship_evolution", 0.28), 450);

    return this.travelTo(nextStage, { firstVisit: !this.visitedStages.has(nextStage) });
  }

  travelTo(stageIndex, { firstVisit = false } = {}) {
    if (stageIndex < 0 || stageIndex > 3 || stageIndex > this.highestUnlockedStage) return false;
    return this.interstage.start(stageIndex, { firstVisit });
  }

  completeTravel(stageIndex) {
    const pending = this.pendingAdvance;
    this.enterWorldStage(stageIndex, { teleport: true });
    if (pending?.nextStage === stageIndex) {
      this.pendingAdvance = null;
      pending.fallback?.();
    }
  }

  enterWorldStage(stageIndex, { teleport = true } = {}) {
    this.worldStageIndex = Math.max(0, Math.min(3, stageIndex));
    this.visitedStages.add(this.worldStageIndex);
    this.scenarioGroups.forEach((g, i) => { g.visible = i === this.worldStageIndex; });
    const scenario = scenarioForStage(this.worldStageIndex);
    if (teleport) this.state.worldOffset.set(scenario.center.x, scenario.center.y);
    this.audio.setStage(this.worldStageIndex, scenario.audio);
    this.syncRobotCompanion?.(
      this.worldStageIndex === 1 ? "navigation" :
      this.worldStageIndex === 2 ? "alert" :
      this.worldStageIndex === 3 ? "final" : "ready"
    );
  }

  nearestGate(maxDistance = 5.5) {
    const scenario = scenarioForStage(this.worldStageIndex);
    let best = null;
    for (const gate of [scenario.backGate, scenario.gate].filter(Boolean)) {
      if (gate.to > this.highestUnlockedStage) continue;
      const d = Math.hypot(gate.x - this.state.worldOffset.x, gate.y - this.state.worldOffset.y);
      if (d <= maxDistance && (!best || d < best.distance)) best = { gate, distance: d };
    }
    return best;
  }

  tryGateTravel() {
    const found = this.nearestGate();
    if (!found || this.interstage.active) return false;
    this.travelTo(found.gate.to, { firstVisit: !this.visitedStages.has(found.gate.to) });
    return true;
  }

  tryDiscoverSecondary() {
    const scenario = scenarioForStage(this.worldStageIndex);
    for (const lm of scenario.landmarks.filter((x) => x.secondary)) {
      const d = Math.hypot(lm.x - this.state.worldOffset.x, lm.y - this.state.worldOffset.y);
      if (d < 5.0 && !this.discovered.has(lm.id)) {
        this.discovered.add(lm.id);
        localStorage.setItem("gz-final-discovered", JSON.stringify([...this.discovered]));
        this.syncRobotCompanion?.("stage_clear");
        return true;
      }
    }
    return false;
  }

  softBounds(velocity) {
    const b = scenarioForStage(this.worldStageIndex).bounds;
    const p = this.state.worldOffset;
    const margin = 4;
    if (p.x < b.minX + margin) velocity.x += 0.035;
    if (p.x > b.maxX - margin) velocity.x -= 0.035;
    if (p.y < b.minY + margin) velocity.y += 0.035;
    if (p.y > b.maxY - margin) velocity.y -= 0.035;
  }

  prePhysics({ rawDelta, elapsed, inputVelocity, controlMode }) {
    if (this.map.open || this.interstage.active) {
      inputVelocity.multiplyScalar?.(this.interstage.active ? 0.15 : 0);
    }
    this.softBounds(inputVelocity);
    this.gravitySample = this.gravity.apply({
      stageIndex: this.worldStageIndex,
      position: this.state.worldOffset,
      velocity: inputVelocity,
      astronautState: this.astronautState,
      controlMode,
      elapsed,
      rawDelta,
    });
  }

  updateWorldVisuals(elapsed) {
    const scenario = scenarioForStage(this.worldStageIndex);
    const group = this.scenarioGroups[this.worldStageIndex];
    const scale = 0.072;
    for (const child of group.children) {
      const world = child.userData.world;
      if (!world) continue;
      child.position.x = (world.x - this.state.worldOffset.x) * scale;
      child.position.y = (world.y - this.state.worldOffset.y) * scale;
      const base = child.userData.worldScale || 2;
      child.scale.set(base * 0.24, base * 0.24, 1);
      if (child.userData.gate) {
        child.material.opacity = child.userData.gate.to <= this.highestUnlockedStage ? 0.72 + Math.sin(elapsed * 2.4) * 0.12 : 0.12;
        child.material.rotation = elapsed * 0.08;
      }
      if (child.userData.landmark?.primary) child.material.rotation = Math.sin(elapsed * 0.2) * 0.015;
    }
    group.visible = true;
    this.worldRoot.visible = true;
    this.worldRoot.userData.palette = scenario.palette;
  }

  update({ rawDelta, elapsed, travelVelocity }) {
    this.highestUnlockedStage = Math.max(this.highestUnlockedStage, Math.min(3, this.mission01.gems || 0));
    this.updateWorldVisuals(elapsed);
    this.interstage.update(rawDelta);
    const speed = travelVelocity?.length?.() || 0;
    this.audio.updateEngine({
      speed,
      turbo: this.interstage.active ? 1 : 0,
      gravity: this.gravitySample?.magnitude || 0,
    });
    this.cameraDirector.update({
      rawDelta,
      velocity: travelVelocity,
      transitionActive: this.interstage.active,
      gravityMagnitude: this.gravitySample?.magnitude || 0,
    });
    if (this.map.open) this.map.draw();
  }
}
