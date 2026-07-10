import { describe, expect, it } from "vitest";
import { MissionSimulation } from "../src/missions/MissionSimulation";

describe("MissionSimulation", () => {
  it("never returns to stage 0 after final completion", () => {
    const mission = new MissionSimulation();
    mission.dispatch({ type: "MISSION_STARTED", payload: null, at: 0 });

    for (let i = 0; i < 3; i += 1) {
      mission.dispatch({ type: "GEM_ACQUIRED", payload: null, at: i + 1 });
      mission.dispatch({ type: "NEXT_REGION_ENTERED", payload: null, at: i + 1.5 });
    }
    mission.dispatch({ type: "FINAL_COMPLETE", payload: null, at: 10 });

    expect(mission.value.state).toBe("complete");
    expect(mission.value.gems).toBe(3);
    expect(mission.value.stage).toBe(3);
  });
});
