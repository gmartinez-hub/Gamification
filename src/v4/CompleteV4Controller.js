import "./styles-v4.css";
import { FloatingOrigin } from "./FloatingOrigin.js";
import { HybridWorldDirector } from "./HybridWorldDirector.js";
import { GravitySystem } from "./GravitySystem.js";
import { AstronautRecovery } from "./AstronautRecovery.js";
import { ActorCompositionDirector } from "./ActorCompositionDirector.js";
import { GemDirector } from "./GemDirector.js";
import { HolographicMap } from "./HolographicMap.js";
import { CompanionDirector } from "./CompanionDirector.js";
import { AudioDirector } from "./AudioDirector.js";
import { REGIONS } from "./config.js";
import { nearestRegionIndex, parseShieldPercent } from "./utils.js";

class CompleteV4Controller {
  constructor(context) {
    this.context = context;
    this.audio = new AudioDirector();
    const event = (name, options = {}) => this.handleEvent(name, options);
    this.floatingOrigin = new FloatingOrigin();
    this.world = new HybridWorldDirector(context);
    this.gravity = new GravitySystem({ ...context, onEvent: event });
    this.astronaut = new AstronautRecovery({ ...context, enterShipMode: context.callbacks?.enterShipMode });
    this.actorComposition = new ActorCompositionDirector(context);
    this.gem = new GemDirector(context);
    this.map = new HolographicMap({ ...context, onEvent: event });
    this.companion = new CompanionDirector({
      ...context,
      updateRobotPanel: context.callbacks?.updateRobotPanel,
      audioEvent: (name, intensity) => this.audio.event(name, intensity),
    });
    this.gravityIndicator = this.createGravityIndicator();
    this.routeIndicator = this.createRouteIndicator();
    this.elapsed = 0;
    this.started = false;
  }

  createGravityIndicator() {
    const root = document.createElement("div");
    root.className = "v4-gravity-indicator";
    root.innerHTML = `<img src="/assets/runtime/v4/gravity/gravity_vector_arc.png" alt="Vector gravitacional"><span>GRAVEDAD</span>`;
    document.body.appendChild(root);
    return root;
  }

  createRouteIndicator() {
    const root = document.createElement("div");
    root.className = "v4-route-indicator";
    root.innerHTML = `<span class="v4-route-arrow">▲</span><div><strong>RUMBO</strong><small></small></div>`;
    document.body.appendChild(root);
    return root;
  }

  handleEvent(name, options = {}) {
    if (!options.silent) this.companion?.emit?.(name, options);
    this.audio.event(name, options.priority || 1);
  }

  start() {
    this.started = true;
    this.floatingOrigin.update(this.context.state.worldOffset);
    document.body.classList.add("v4-composition-recovery");
  }

  beforeInput({ targetVelocity }) {
    if (this.map.open) targetVelocity.set(0, 0);
    this.astronaut.constrainInput(targetVelocity);
  }

  applyForces({ rawDelta, elapsed, inputVelocity }) {
    if (this.map.open) {
      inputVelocity.multiplyScalar(0.80);
      return this.gravity.lastSample;
    }
    return this.gravity.apply({ rawDelta, inputVelocity, controlMode: this.context.state.controlMode, elapsed });
  }

  actorScreenPoint() {
    const { viewport, state } = this.context;
    const aspect = Math.max(0.01, viewport.aspect || 1);
    return {
      x: ((state.position.x + aspect) / (aspect * 2)) * viewport.width,
      y: (1 - (state.position.y + 1) / 2) * viewport.height,
    };
  }

  updateGravityIndicator(sample) {
    const show = sample.magnitude > 0.035 && !this.map.open;
    this.gravityIndicator.classList.toggle("is-visible", show);
    if (!show) return;
    const angle = Math.atan2(sample.y, sample.x) + Math.PI / 2;
    const actor = this.actorScreenPoint();
    this.gravityIndicator.style.setProperty("--gravity-angle", `${angle}rad`);
    this.gravityIndicator.style.setProperty("--gravity-strength", String(Math.min(1, sample.magnitude / 0.22)));
    this.gravityIndicator.style.setProperty("--v4-gravity-x", `${Math.round(actor.x)}px`);
    this.gravityIndicator.style.setProperty("--v4-gravity-y", `${Math.round(actor.y)}px`);
    this.gravityIndicator.querySelector("span").textContent = this.gravity.stabilizerRemaining > 0 ? "ESTABILIZANDO" : "GRAVEDAD";
  }

  updateRouteIndicator() {
    const gems = Math.min(3, this.context.mission01.gems || 0);
    const targetIndex = Math.min(3, gems === 0 ? 0 : gems);
    const target = REGIONS[targetIndex].center;
    const player = this.context.state.worldOffset;
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const d = Math.hypot(dx, dy);
    const arrow = this.routeIndicator.querySelector(".v4-route-arrow");
    arrow.style.transform = `rotate(${Math.atan2(dy, dx) + Math.PI / 2}rad)`;
    this.routeIndicator.querySelector("small").textContent = `${REGIONS[targetIndex].name} · ${Math.round(d)} u`;
    this.routeIndicator.classList.toggle("is-visible", d > 10 && !this.map.open);
  }

  update({ rawDelta, delta, elapsed, shipVelocity, travelVelocity }) {
    if (!this.started) return;
    this.elapsed = elapsed;
    this.floatingOrigin.update(this.context.state.worldOffset);
    const regionIndex = nearestRegionIndex(this.context.state.worldOffset, REGIONS);
    this.world.update({
      floatingOrigin: this.floatingOrigin,
      elapsed,
      currentRegionIndex: regionIndex,
      gems: this.context.mission01.gems || 0,
    });
    this.astronaut.update({ delta: rawDelta, stageIndex: this.context.mission01.currentStageIndex });
    this.actorComposition.update();
    this.gem.update({ rawDelta, elapsed });
    this.map.update();
    this.updateGravityIndicator(this.gravity.lastSample);
    this.updateRouteIndicator();
    this.companion.observe({ elapsed, gravity: this.gravity.lastSample, scanning: this.gravity.scanning });
    const shield = parseShieldPercent(this.context.dom.shieldHud);
    this.audio.update({
      regionIndex,
      speed: travelVelocity?.length?.() || shipVelocity?.length?.() || 0,
      gravity: this.gravity.lastSample.magnitude,
      mapOpen: this.map.open,
      aimActive: this.context.aimAssist.active,
      shield,
    });
    this.context.dom.regionHud.textContent = REGIONS[regionIndex].name;
    document.body.dataset.v4Biome = REGIONS[regionIndex].id;
    document.body.classList.toggle("v4-scanning", this.gravity.scanning);
    document.body.classList.toggle("v4-stabilizing", this.gravity.stabilizerRemaining > 0);
  }
}

export function createCompleteV4Controller(context) {
  return new CompleteV4Controller(context);
}
