import type { TargetState, Vec2 } from "../domain/types";

export interface DiscoveryTarget {
  id: string;
  position: Vec2;
  state: TargetState;
  signalStrength: number;
  scanProgress: number;
}

export interface DiscoveryContext {
  player: Vec2;
  facing: Vec2;
  scanHeld: boolean;
  delta: number;
}

export class TargetDiscovery {
  update(target: DiscoveryTarget, context: DiscoveryContext): DiscoveryTarget {
    if (target.state === "destroyed") return target;
    const dx = target.position.x - context.player.x;
    const dy = target.position.y - context.player.y;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const direction = { x: dx / distance, y: dy / distance };
    const facingDot = context.facing.x * direction.x + context.facing.y * direction.y;
    const signal = Math.max(0, Math.min(1, 1 - distance / 8)) * Math.max(0.2, facingDot);

    let state = target.state;
    let scanProgress = target.scanProgress;

    if (signal > 0.12 && state === "unknown") state = "signal_detected";
    if (signal > 0.28 && context.scanHeld) {
      state = "scanning";
      scanProgress = Math.min(1, scanProgress + context.delta * signal * 1.15);
    }
    if (scanProgress > 0.35) state = "partially_revealed";
    if (scanProgress > 0.72) state = "identified";
    if (scanProgress >= 1) state = "targetable";

    return { ...target, state, signalStrength: signal, scanProgress };
  }
}
