export class GravityFieldSystem {
  constructor({ scenarios, onEvent }) {
    this.scenarios = scenarios;
    this.onEvent = onEvent;
    this.stabilizerRemaining = 0;
    this.stabilizerCooldown = 0;
    this.firstGravitySent = false;
    this.lastSample = { x: 0, y: 0, magnitude: 0, field: null };
  }

  activateStabilizer() {
    if (this.stabilizerCooldown > 0 || this.stabilizerRemaining > 0) return false;
    this.stabilizerRemaining = 2.5;
    this.stabilizerCooldown = 8;
    this.onEvent?.("stabilizer_used");
    return true;
  }

  fieldForce(field, position, elapsed) {
    const dx = field.x - position.x;
    const dy = field.y - position.y;
    const dist = Math.max(0.001, Math.hypot(dx, dy));
    if (dist >= field.radius) return { x: 0, y: 0, weight: 0 };
    const falloff = Math.pow(1 - dist / field.radius, 1.35);
    const direction = { x: dx / dist, y: dy / dist };
    let x = 0;
    let y = 0;

    if (field.type === "attract") { x = direction.x; y = direction.y; }
    if (field.type === "repel") { x = -direction.x; y = -direction.y; }
    if (field.type === "tangential") { x = -direction.y; y = direction.x; }
    if (field.type === "current") {
      const d = field.direction || { x: 0, y: 1 };
      const m = Math.max(0.001, Math.hypot(d.x, d.y));
      x = d.x / m; y = d.y / m;
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

  sample(stageIndex, position, elapsed) {
    const scenario = this.scenarios[stageIndex];
    if (!scenario) return { x: 0, y: 0, magnitude: 0, field: null };
    let x = 0, y = 0, strongest = null, maxWeight = 0;
    for (const field of scenario.gravity || []) {
      const force = this.fieldForce(field, position, elapsed);
      x += force.x; y += force.y;
      if (force.weight > maxWeight) { strongest = field; maxWeight = force.weight; }
    }
    const magnitudeRaw = Math.hypot(x, y);
    const maxForce = 0.42;
    if (magnitudeRaw > maxForce) {
      x = x / magnitudeRaw * maxForce;
      y = y / magnitudeRaw * maxForce;
    }
    const sample = { x, y, magnitude: Math.min(maxForce, magnitudeRaw), field: strongest };
    this.lastSample = sample;
    if (sample.magnitude > 0.055 && !this.firstGravitySent) {
      this.firstGravitySent = true;
      this.onEvent?.("gravity_first", sample);
    }
    return sample;
  }

  updateTimers(rawDelta) {
    this.stabilizerRemaining = Math.max(0, this.stabilizerRemaining - rawDelta);
    this.stabilizerCooldown = Math.max(0, this.stabilizerCooldown - rawDelta);
  }

  apply({ stageIndex, position, velocity, astronautState, controlMode, elapsed, rawDelta }) {
    this.updateTimers(rawDelta);
    const sample = this.sample(stageIndex, position, elapsed);
    const scale = this.stabilizerRemaining > 0 ? 0.24 : 1;
    velocity.x += sample.x * rawDelta * 2.2 * scale;
    velocity.y += sample.y * rawDelta * 2.2 * scale;
    if (velocity.length?.() > 1.15) velocity.setLength(1.15);

    if (controlMode === "astronaut" && astronautState?.position) {
      astronautState.position.x += sample.x * rawDelta * 1.35 * scale;
      astronautState.position.y += sample.y * rawDelta * 1.35 * scale;
    }
    return sample;
  }
}
