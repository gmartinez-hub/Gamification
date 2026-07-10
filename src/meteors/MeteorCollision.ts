import { COMBAT_TUNING } from "../config/CombatTuning";
import type { StageId, Vec2 } from "../domain/types";

export type MeteorSize = "small" | "medium" | "large";

export interface CollisionResult {
  damage: number;
  impulse: Vec2;
  invulnerabilitySeconds: number;
}

export function resolveMeteorCollision(
  size: MeteorSize,
  stage: StageId,
  normal: Vec2,
  relativeSpeed: number,
): CollisionResult {
  const damageRange =
    size === "small"
      ? COMBAT_TUNING.shield.damage.smallMeteor
      : size === "medium"
        ? COMBAT_TUNING.shield.damage.mediumMeteor
        : COMBAT_TUNING.shield.damage.largeMeteor;
  const stageScale = 1 + stage * 0.12;
  const damage = ((damageRange[0] + damageRange[1]) * 0.5) * stageScale;
  const repulsion =
    stage === 0
      ? COMBAT_TUNING.repulsion.stage1
      : stage === 1
        ? COMBAT_TUNING.repulsion.stage2
        : COMBAT_TUNING.repulsion.stage3;
  const magnitude = Math.min(
    COMBAT_TUNING.repulsion.clamp,
    repulsion * Math.max(0.35, relativeSpeed),
  );

  return {
    damage,
    impulse: { x: normal.x * magnitude, y: normal.y * magnitude },
    invulnerabilitySeconds: COMBAT_TUNING.shield.invulnerabilitySeconds,
  };
}
