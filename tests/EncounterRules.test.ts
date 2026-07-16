import { describe, expect, it } from "vitest";
import { reachableRelicPoint, selectScanTarget } from "../src/missions/EncounterRules";

describe("EncounterRules", () => {
  it("keeps a released relic inside the EVA collection radius", () => {
    const anchor = { x: -0.28, y: 0.11 };
    const point = reachableRelicPoint({ x: 1.4, y: 0.7 }, anchor, 0.32, 1.4, 0.7);
    expect(Math.hypot(point.x - anchor.x, point.y - anchor.y)).toBeLessThanOrEqual(0.320001);
  });

  it("preserves a nearby relic position", () => {
    expect(reachableRelicPoint({ x: 0.1, y: 0.2 }, { x: 0, y: 0 }, 0.32)).toEqual({ x: 0.1, y: 0.2 });
  });

  it("follows the guided primary when no landmark is in range", () => {
    expect(selectScanTarget([
      { id: "secondary", distance: 1.2, range: 0.8, primary: false },
      { id: "primary", distance: 1.5, range: 0.9, primary: true },
    ], "primary")).toBe("primary");
  });

  it("switches responsively to the landmark the player can actually scan", () => {
    expect(selectScanTarget([
      { id: "secondary", distance: 0.4, range: 0.8, primary: false },
      { id: "primary", distance: 1.5, range: 0.9, primary: true },
    ], "primary")).toBe("secondary");
  });
});
