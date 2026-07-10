import { GRAVITY_FIELDS, V4_TUNING } from "./config.js";
import { clamp, normalize } from "./utils.js";

export class GravitySystem {
  constructor({ state, astronautState, mission01, input, onEvent }) {
    this.state = state;
    this.astronautState = astronautState;
    this.mission01 = mission01;
    this.input = input;
    this.onEvent = onEvent;
    this.stabilizerRemaining = 0;
    this.stabilizerCooldown = 0;
    this.scanning = false;
    this.lastSample = { x: 0, y: 0, magnitude: 0, field: null };
    this.firstGravitySent = false;
    this.slingshotSent = false;
    this.bindInput();
  }

  bindInput() {
    window.addEventListener("keydown", (event) => {
      if (event.code === V4_TUNING.stabilizerCode) {
        event.preventDefault();
        this.activateStabilizer();
      }
      if (event.key?.toLowerCase() === V4_TUNING.scannerKey) this.scanning = true;
    });
    window.addEventListener("keyup", (event) => {
      if (event.key?.toLowerCase() === V4_TUNING.scannerKey) this.scanning = false;
    });
  }

  activateStabilizer() {
    if (this.stabilizerCooldown > 0 || this.stabilizerRemaining > 0) return false;
    this.stabilizerRemaining = V4_TUNING.stabilizerDuration;
    this.stabilizerCooldown = V4_TUNING.stabilizerCooldown;
    this.onEvent?.("stabilizer_used", { priority: 4 });
    return true;
  }

  stageUnlocked(field) {
    return field.stage <= Math.max(this.mission01.currentStageIndex || 0, this.mission01.gems || 0);
  }

  fieldForce(field, position, elapsed) {
    const dx = field.x - position.x;
    const dy = field.y - position.y;
    const dist = Math.max(0.001, Math.hypot(dx, dy));
    if (dist >= field.radius) return { x: 0, y: 0, weight: 0 };
    const falloff = Math.pow(1 - dist / field.radius, 1.35);
    const direction = { x: dx / dist, y: dy / dist };
    let x = 0; let y = 0;
    if (field.type === "attract") { x = direction.x; y = direction.y; }
    if (field.type === "repel") { x = -direction.x; y = -direction.y; }
    if (field.type === "tangential") { x = -direction.y; y = direction.x; }
    if (field.type === "current") {
      const n = normalize(field.direction || { x: 0, y: 1 }); x = n.x; y = n.y;
    }
    if (field.type === "pulse") {
      const pulse = 0.35 + Math.max(0, Math.sin((elapsed / (field.period || 5)) * Math.PI * 2)) * 0.95;
      x = -direction.x * pulse; y = -direction.y * pulse;
    }
    if (field.type === "unstable") {
      const angle = elapsed * (Math.PI * 2 / (field.period || 7));
      x = Math.cos(angle) * 0.72 + direction.x * 0.28;
      y = Math.sin(angle) * 0.72 + direction.y * 0.28;
    }
    return { x: x * field.strength * falloff, y: y * field.strength * falloff, weight: field.strength * falloff };
  }

  sample(position, elapsed) {
    let x = 0; let y = 0; let strongest = null; let maxWeight = 0;
    for (const field of GRAVITY_FIELDS) {
      if (!this.stageUnlocked(field)) continue;
      const force = this.fieldForce(field, position, elapsed);
      x += force.x; y += force.y;
      if (force.weight > maxWeight) { maxWeight = force.weight; strongest = field; }
    }
    const magnitude = Math.min(V4_TUNING.gravityMaxForce, Math.hypot(x, y));
    if (magnitude > V4_TUNING.gravityMaxForce) {
      const n = normalize({ x, y }); x = n.x * magnitude; y = n.y * magnitude;
    }
    return { x, y, magnitude, field: strongest };
  }

  apply({ rawDelta, inputVelocity, controlMode, elapsed }) {
    this.stabilizerRemaining = Math.max(0, this.stabilizerRemaining - rawDelta);
    this.stabilizerCooldown = Math.max(0, this.stabilizerCooldown - rawDelta);
    const sample = this.sample(this.state.worldOffset, elapsed);
    const stabilized = this.stabilizerRemaining > 0;
    const scale = stabilized ? 0.24 : 1;
    inputVelocity.x += sample.x * rawDelta * 2.2 * scale;
    inputVelocity.y += sample.y * rawDelta * 2.2 * scale;
    if (inputVelocity.length() > 1.15) inputVelocity.setLength(1.15);

    if (controlMode === "astronaut" && this.astronautState?.position) {
      this.astronautState.position.x += sample.x * rawDelta * V4_TUNING.astronautInfluence * scale;
      this.astronautState.position.y += sample.y * rawDelta * V4_TUNING.astronautInfluence * scale;
    }

    this.lastSample = sample;
    if (sample.magnitude > 0.055 && !this.firstGravitySent) {
      this.firstGravitySent = true;
      this.onEvent?.("gravity_first");
    }
    if (sample.field?.type === "tangential" && sample.magnitude > 0.075 && !this.slingshotSent) {
      this.slingshotSent = true;
      this.onEvent?.("slingshot");
    }
    return sample;
  }
}
