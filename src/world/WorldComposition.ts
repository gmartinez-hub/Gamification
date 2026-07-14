import type { CelestialBodyRecord, ProjectedBounds } from "../domain/types";
import { WORLD_TUNING } from "../config/WorldTuning";

export interface CompositionCandidate {
  record: CelestialBodyRecord;
  bounds: ProjectedBounds;
  depth: number;
  priority?: number;
  protectedFromSafeZone?: boolean;
}

export interface CompositionResult {
  accepted: CompositionCandidate[];
  rejected: Array<{ candidate: CompositionCandidate; reason: string }>;
}

export function overlapRatio(a: ProjectedBounds, b: ProjectedBounds): number {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= left || bottom <= top) return 0;
  const overlap = (right - left) * (bottom - top);
  return overlap / Math.max(1e-6, Math.min(a.width * a.height, b.width * b.height));
}

export class WorldComposition {
  compose(
    candidates: CompositionCandidate[],
    safeZone: ProjectedBounds | ProjectedBounds[],
  ): CompositionResult {
    const accepted: CompositionCandidate[] = [];
    const rejected: Array<{ candidate: CompositionCandidate; reason: string }> = [];
    let heroCount = 0;
    let mediumCount = 0;
    let landmarkCount = 0;
    let debrisCount = 0;
    const heroTextures = new Set<string>();
    const kindPriority: Record<CelestialBodyRecord["kind"], number> = {
      landmark: 0,
      hero: 1,
      medium: 2,
      debris: 3,
    };

    for (const candidate of [...candidates].sort(
      (a, b) =>
        (a.priority ?? kindPriority[a.record.kind]) -
          (b.priority ?? kindPriority[b.record.kind]) ||
        a.depth - b.depth,
    )) {
      const { record, bounds } = candidate;

      const safeZones = Array.isArray(safeZone) ? safeZone : [safeZone];
      if (!candidate.protectedFromSafeZone && safeZones.some((zone) => overlapRatio(bounds, zone) > 0)) {
        rejected.push({ candidate, reason: "gameplay-safe-zone" });
        continue;
      }
      if (record.kind === "medium" && mediumCount >= WORLD_TUNING.maxMediumVisible) {
        rejected.push({ candidate, reason: "medium-budget" });
        continue;
      }
      if (record.kind === "landmark" && landmarkCount >= WORLD_TUNING.maxLandmarkVisible) {
        rejected.push({ candidate, reason: "landmark-budget" });
        continue;
      }
      if (record.kind === "debris" && debrisCount >= WORLD_TUNING.maxDebrisVisible) {
        rejected.push({ candidate, reason: "debris-budget" });
        continue;
      }
      if (record.kind === "hero" && heroTextures.has(record.textureId)) {
        rejected.push({ candidate, reason: "duplicate-hero-texture" });
        continue;
      }
      if (
        record.kind === "hero" &&
        accepted.some(
          (other) =>
            other.record.kind === "hero" &&
            overlapRatio(bounds, other.bounds) > WORLD_TUNING.heroOverlapRatioMax,
        )
      ) {
        rejected.push({ candidate, reason: "hero-overlap" });
        continue;
      }
      if (record.kind === "hero" && heroCount >= WORLD_TUNING.maxHeroVisible) {
        rejected.push({ candidate, reason: "hero-budget" });
        continue;
      }
      if (
        record.kind === "medium" &&
        accepted.some(
          (other) => other.record.kind === "hero" && overlapRatio(bounds, other.bounds) > 0.18,
        )
      ) {
        rejected.push({ candidate, reason: "medium-hero-overlap" });
        continue;
      }

      accepted.push(candidate);
      if (record.kind === "hero") {
        heroCount += 1;
        heroTextures.add(record.textureId);
      }
      if (record.kind === "medium") mediumCount += 1;
      if (record.kind === "landmark") landmarkCount += 1;
      if (record.kind === "debris") debrisCount += 1;
    }

    return { accepted, rejected };
  }
}
