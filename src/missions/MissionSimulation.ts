import type { GameEvent, StageId } from "../domain/types";

export type MissionState =
  | "boot"
  | "navigation"
  | "discovery"
  | "small_targets"
  | "large_targets"
  | "relic"
  | "gem_transfer"
  | "region_unlocked"
  | "final_navigation"
  | "final_sequence"
  | "complete";

export interface MissionSnapshot {
  state: MissionState;
  stage: StageId;
  gems: number;
  smallDestroyed: number;
  largeDestroyed: number;
  smallRequired: number;
  largeRequired: number;
}

export class MissionSimulation {
  private snapshot: MissionSnapshot = {
    state: "boot",
    stage: 0,
    gems: 0,
    smallDestroyed: 0,
    largeDestroyed: 0,
    smallRequired: 3,
    largeRequired: 1,
  };

  get value(): Readonly<MissionSnapshot> {
    return this.snapshot;
  }

  reset(stage: StageId = 0): Readonly<MissionSnapshot> {
    this.snapshot = {
      state: "boot",
      stage,
      gems: 0,
      smallDestroyed: 0,
      largeDestroyed: 0,
      smallRequired: 3,
      largeRequired: 1,
    };
    return this.snapshot;
  }

  dispatch(event: GameEvent): MissionSnapshot {
    switch (event.type) {
      case "MISSION_STARTED":
        this.snapshot = { ...this.snapshot, state: "navigation" };
        break;
      case "ZONE_ENTERED":
        this.snapshot = {
          ...this.snapshot,
          stage: ((event.payload as { stage?: StageId } | null)?.stage ?? this.snapshot.stage),
          state: "discovery",
          smallDestroyed: 0,
          largeDestroyed: 0,
        };
        break;
      case "SMALL_TARGETS_REVEALED":
        this.snapshot = {
          ...this.snapshot,
          state: "small_targets",
          smallRequired:
            (event.payload as { required?: number } | null)?.required ?? this.snapshot.smallRequired,
        };
        break;
      case "SMALL_TARGET_DESTROYED":
        this.snapshot = {
          ...this.snapshot,
          smallDestroyed: this.snapshot.smallDestroyed + 1,
        };
        break;
      case "LARGE_TARGETS_REVEALED":
        this.snapshot = {
          ...this.snapshot,
          state: "large_targets",
          largeRequired:
            (event.payload as { required?: number } | null)?.required ?? this.snapshot.largeRequired,
        };
        break;
      case "LARGE_TARGET_DESTROYED":
        this.snapshot = {
          ...this.snapshot,
          largeDestroyed: this.snapshot.largeDestroyed + 1,
        };
        break;
      case "RELIC_REVEALED":
        this.snapshot = { ...this.snapshot, state: "relic" };
        break;
      case "GEM_TRANSFER_STARTED":
        this.snapshot = { ...this.snapshot, state: "gem_transfer" };
        break;
      case "GEM_ACQUIRED": {
        const gems = Math.min(3, this.snapshot.gems + 1);
        this.snapshot = {
          ...this.snapshot,
          gems,
          state: gems >= 3 ? "final_navigation" : "region_unlocked",
        };
        break;
      }
      case "NEXT_REGION_ENTERED":
        this.snapshot = {
          ...this.snapshot,
          stage:
            (event.payload as { stage?: StageId } | null)?.stage ??
            (Math.min(3, this.snapshot.stage + 1) as StageId),
          state: this.snapshot.gems >= 3 ? "final_sequence" : "discovery",
          smallDestroyed: 0,
          largeDestroyed: 0,
        };
        break;
      case "FINAL_STARTED":
        this.snapshot = { ...this.snapshot, stage: 3, state: "final_sequence" };
        break;
      case "FINAL_COMPLETE":
        this.snapshot = { ...this.snapshot, state: "complete" };
        break;
      default:
        break;
    }
    return this.snapshot;
  }
}
