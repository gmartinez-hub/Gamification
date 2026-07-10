import type { Vec2 } from "../domain/types";

export type AimPhase =
  | "idle"
  | "detect"
  | "lock"
  | "stabilize"
  | "rotate"
  | "align"
  | "charge"
  | "fire"
  | "projectile_travel"
  | "impact_or_miss"
  | "recover";

export interface AimState {
  phase: AimPhase;
  elapsed: number;
  rawDuration: number;
  angle: number;
  angularVelocity: number;
  targetAngle: number;
  alignmentError: number;
  fired: boolean;
}

export interface AimTuning {
  angularAcceleration: number;
  angularDamping: number;
  maxAngularVelocity: number;
  fireTolerance: number;
}

function shortestAngle(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function updateAimRotation(
  state: AimState,
  rawDelta: number,
  tuning: AimTuning,
): AimState {
  const error = shortestAngle(state.angle, state.targetAngle);
  const desiredVelocity = Math.max(
    -tuning.maxAngularVelocity,
    Math.min(tuning.maxAngularVelocity, error * tuning.angularAcceleration),
  );
  const blend = 1 - Math.exp(-tuning.angularDamping * rawDelta);
  const angularVelocity =
    state.angularVelocity + (desiredVelocity - state.angularVelocity) * blend;
  const angle = state.angle + angularVelocity * rawDelta;
  const alignmentError = Math.abs(shortestAngle(angle, state.targetAngle));

  return {
    ...state,
    elapsed: state.elapsed + rawDelta,
    angle,
    angularVelocity,
    alignmentError,
    phase:
      alignmentError <= tuning.fireTolerance && state.phase === "align"
        ? "charge"
        : state.phase,
  };
}

export function predictIntercept(
  origin: Vec2,
  target: Vec2,
  velocity: Vec2,
  leadSeconds: number,
): Vec2 {
  return {
    x: target.x + velocity.x * leadSeconds,
    y: target.y + velocity.y * leadSeconds,
  };
}
