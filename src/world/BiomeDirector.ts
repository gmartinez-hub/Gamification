import type { BiomeId, WorldCoordinate } from "../domain/types";
import { WORLD_TUNING } from "../config/WorldTuning";

export interface BiomeBlend {
  primary: BiomeId;
  secondary?: BiomeId;
  mix: number;
}

const BIOMES: BiomeId[] = ["oceanic", "mechanical", "synthetic", "relic"];

export class BiomeDirector {
  resolve(position: WorldCoordinate, unlockedRegions: number): BiomeBlend {
    const available = Math.max(1, Math.min(BIOMES.length, unlockedRegions + 1));
    let best = 0;
    let second = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    let secondDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < available; i += 1) {
      const center = WORLD_TUNING.stageRegionCenters[i]!;
      const distance = Math.hypot(position.x - center.x, position.y - center.y);
      if (distance < bestDistance) {
        second = best;
        secondDistance = bestDistance;
        best = i;
        bestDistance = distance;
      } else if (distance < secondDistance) {
        second = i;
        secondDistance = distance;
      }
    }

    const boundary = Math.max(1, secondDistance - bestDistance);
    const mix = Math.max(0, Math.min(1, 1 - boundary / WORLD_TUNING.transitionBandWidth));
    const result: BiomeBlend = {
      primary: BIOMES[best]!,
      mix,
    };
    if (mix > 0.01 && second !== best) result.secondary = BIOMES[second]!;
    return result;
  }
}
