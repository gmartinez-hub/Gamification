import type { BiomeId, ProjectedBounds, StageId, WorldCoordinate } from "../domain/types";
import { BiomeDirector, type BiomeBlend } from "../world/BiomeDirector";
import { WorldComposition, type CompositionCandidate, type CompositionResult } from "../world/WorldComposition";
import { TargetDiscovery } from "../discovery/TargetDiscovery";
import { COMBAT_TUNING } from "../config/CombatTuning";

export interface ShieldSnapshot {
  value: number;
  invulnerability: number;
  recoveryDelay: number;
}

export class V2Runtime {
  readonly composition = new WorldComposition();
  readonly biomes = new BiomeDirector();
  readonly discovery = new TargetDiscovery();
  readonly shield: ShieldSnapshot = {
    value: COMBAT_TUNING.shield.max,
    invulnerability: 0,
    recoveryDelay: 0,
  };
  biome: BiomeBlend = { primary: "oceanic", mix: 0 };

  updateBiome(position: WorldCoordinate, gems: number): BiomeBlend {
    this.biome = this.biomes.resolve(position, gems);
    return this.biome;
  }

  composeWorld(candidates: CompositionCandidate[], safeZone: ProjectedBounds | ProjectedBounds[]): CompositionResult {
    return this.composition.compose(candidates, safeZone);
  }

  damageShield(amount: number): number {
    if (this.shield.invulnerability > 0) return 0;
    const applied = Math.min(this.shield.value, Math.max(0, amount));
    this.shield.value -= applied;
    this.shield.invulnerability = COMBAT_TUNING.shield.invulnerabilitySeconds;
    this.shield.recoveryDelay = COMBAT_TUNING.shield.recoveryDelaySeconds;
    return applied;
  }

  updateShield(rawDelta: number): ShieldSnapshot {
    this.shield.invulnerability = Math.max(0, this.shield.invulnerability - rawDelta);
    this.shield.recoveryDelay = Math.max(0, this.shield.recoveryDelay - rawDelta);
    if (this.shield.recoveryDelay <= 0 && this.shield.value < COMBAT_TUNING.shield.max) {
      this.shield.value = Math.min(
        COMBAT_TUNING.shield.max,
        this.shield.value + COMBAT_TUNING.shield.recoveryPerSecond * rawDelta,
      );
    }
    return this.shield;
  }

  stageForBiome(biome: BiomeId): StageId {
    return ({ oceanic: 0, mechanical: 1, synthetic: 2, relic: 3 } as const)[biome];
  }
}
