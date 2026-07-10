export type StageId = 0 | 1 | 2 | 3;
export type BiomeId = "oceanic" | "mechanical" | "synthetic" | "relic";
export type TargetState =
  | "unknown"
  | "signal_detected"
  | "scanning"
  | "partially_revealed"
  | "identified"
  | "targetable"
  | "engaged"
  | "destroyed";

export interface Vec2 {
  x: number;
  y: number;
}

export interface WorldCoordinate extends Vec2 {}

export interface ProjectedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CelestialBodyRecord {
  id: string;
  biome: BiomeId;
  stageAffinity: StageId;
  kind: "hero" | "landmark" | "medium" | "debris";
  textureId: string;
  coordinate: WorldCoordinate;
  radius: number;
  axialSpeed: number;
  translationPhase: number;
  materialLocked: boolean;
  discovered: boolean;
}

export interface GameEvent<T = unknown> {
  type: string;
  payload: T;
  at: number;
}
