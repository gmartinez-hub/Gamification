import type { Vec2 } from "../domain/types";

export type GravityFieldType = "attract" | "repel" | "current" | "tangential" | "pulse" | "unstable";

export interface GravityFieldDefinition {
  id: string;
  type: GravityFieldType;
  x: number;
  y: number;
  radius: number;
  strength: number;
  direction?: Vec2;
  period?: number;
}

export interface GravitySample extends Vec2 {
  magnitude: number;
  fieldId: string | null;
  fieldType: GravityFieldType | null;
}

interface ScenarioWithGravity {
  gravityFields: readonly GravityFieldDefinition[];
}

const GRAVITY_VELOCITY_RESPONSE = 5.2;
const STABILIZER_ACTIVE_SECONDS = 2.5;
const STABILIZER_COOLDOWN_SECONDS = 8;
const STABILIZER_GRAVITY_SCALE = 0.24;

export class GravityFieldSystem {
  private stabilizerRemaining = 0;
  private stabilizerCooldown = 0;

  constructor(private readonly scenarios: readonly ScenarioWithGravity[]) {}

  activateStabilizer(): boolean {
    if (this.stabilizerRemaining > 0 || this.stabilizerCooldown > 0) return false;
    this.stabilizerRemaining = STABILIZER_ACTIVE_SECONDS;
    this.stabilizerCooldown = STABILIZER_COOLDOWN_SECONDS;
    return true;
  }

  rechargeStabilizer(): void {
    this.stabilizerRemaining = 0;
    this.stabilizerCooldown = 0;
  }

  get status() {
    return {
      active: this.stabilizerRemaining > 0,
      remaining: this.stabilizerRemaining,
      cooldown: this.stabilizerCooldown,
    };
  }

  sample(stageIndex: number, position: Vec2, elapsed: number): GravitySample {
    const fields = this.scenarios[stageIndex]?.gravityFields || [];
    let x = 0;
    let y = 0;
    let strongest: GravityFieldDefinition | null = null;
    let strongestWeight = 0;

    for (const field of fields) {
      const dx = field.x - position.x;
      const dy = field.y - position.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      if (distance >= field.radius) continue;
      const falloff = Math.pow(1 - distance / field.radius, 1.35);
      const radial = { x: dx / distance, y: dy / distance };
      let direction = { x: 0, y: 0 };
      if (field.type === "attract") direction = radial;
      if (field.type === "repel") direction = { x: -radial.x, y: -radial.y };
      if (field.type === "tangential") direction = { x: -radial.y, y: radial.x };
      if (field.type === "current") {
        const current = field.direction || { x: 0, y: 1 };
        const length = Math.max(0.001, Math.hypot(current.x, current.y));
        direction = { x: current.x / length, y: current.y / length };
      }
      if (field.type === "pulse") {
        const phase = (elapsed / (field.period || 5)) * Math.PI * 2;
        const pulse = 0.65 + (Math.sin(phase) + 1) * 0.45;
        direction = { x: -radial.x * pulse, y: -radial.y * pulse };
      }
      if (field.type === "unstable") {
        const angle = elapsed * (Math.PI * 2 / (field.period || 7));
        direction = { x: Math.cos(angle) * 0.72 + radial.x * 0.28, y: Math.sin(angle) * 0.72 + radial.y * 0.28 };
      }
      const weight = field.strength * falloff;
      x += direction.x * weight;
      y += direction.y * weight;
      if (weight > strongestWeight) {
        strongest = field;
        strongestWeight = weight;
      }
    }

    const rawMagnitude = Math.hypot(x, y);
    const maxForce = 0.42;
    if (rawMagnitude > maxForce) {
      x = (x / rawMagnitude) * maxForce;
      y = (y / rawMagnitude) * maxForce;
    }
    return {
      x,
      y,
      magnitude: Math.min(maxForce, rawMagnitude),
      fieldId: strongest?.id || null,
      fieldType: strongest?.type || null,
    };
  }

  apply(stageIndex: number, position: Vec2, velocity: Vec2, elapsed: number, rawDelta: number, actorScale = 1): GravitySample {
    const activeSeconds = Math.min(this.stabilizerRemaining, rawDelta);
    const gravityDelta = activeSeconds * STABILIZER_GRAVITY_SCALE + (rawDelta - activeSeconds);
    this.stabilizerRemaining = Math.max(0, this.stabilizerRemaining - rawDelta);
    this.stabilizerCooldown = Math.max(0, this.stabilizerCooldown - (rawDelta - activeSeconds));
    const sample = this.sample(stageIndex, position, elapsed);
    velocity.x += sample.x * gravityDelta * GRAVITY_VELOCITY_RESPONSE * actorScale;
    velocity.y += sample.y * gravityDelta * GRAVITY_VELOCITY_RESPONSE * actorScale;
    return sample;
  }
}
