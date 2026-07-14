import { describe, expect, it } from "vitest";
import {
  FIRST_VISIT_CORRIDOR_SECONDS,
  RETURN_CORRIDOR_SECONDS,
  evolvedShipStageForGems,
  planGateTravel,
} from "../src/missions/ProgressionRules";

describe("showable progression rules", () => {
  it("evolves the ship before Oceanic can travel forward", () => {
    expect(evolvedShipStageForGems(0)).toBe(0);
    expect(evolvedShipStageForGems(1)).toBe(1);
    expect(planGateTravel(0, 1, 0).allowed).toBe(false);
    expect(planGateTravel(0, 1, 1)).toEqual({
      allowed: true,
      direction: "forward",
      duration: FIRST_VISIT_CORRIDOR_SECONDS,
    });
  });

  it("uses the short corridor for backtracking without changing ship evolution", () => {
    expect(planGateTravel(1, 0, 1)).toEqual({
      allowed: true,
      direction: "back",
      duration: RETURN_CORRIDOR_SECONDS,
    });
    expect(evolvedShipStageForGems(1)).toBe(1);
  });
});
