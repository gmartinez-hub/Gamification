import type { CompositionResult } from "../world/WorldComposition";
import { WORLD_TUNING } from "../config/WorldTuning";

export interface ReleaseViolation {
  code: string;
  message: string;
}

export function assertComposition(result: CompositionResult): ReleaseViolation[] {
  const hero = result.accepted.filter((item) => item.record.kind === "hero");
  const medium = result.accepted.filter((item) => item.record.kind === "medium");
  const landmarks = result.accepted.filter((item) => item.record.kind === "landmark");
  const violations: ReleaseViolation[] = [];
  if (hero.length > WORLD_TUNING.maxHeroVisible) {
    violations.push({ code: "hero-budget", message: `Hero bodies: ${hero.length}` });
  }
  if (medium.length > WORLD_TUNING.maxMediumVisible) {
    violations.push({ code: "medium-budget", message: `Medium bodies: ${medium.length}` });
  }
  if (landmarks.length < WORLD_TUNING.minLandmarkVisible) {
    violations.push({ code: "landmark-minimum", message: "No landmark visible" });
  }
  if (new Set(hero.map((item) => item.record.textureId)).size !== hero.length) {
    violations.push({ code: "hero-identity", message: "Duplicate hero texture" });
  }
  return violations;
}
