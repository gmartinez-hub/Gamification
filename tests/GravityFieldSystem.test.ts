import { describe, expect, it } from "vitest";
import { GravityFieldSystem } from "../src/world/GravityFieldSystem";
import { SCENARIOS } from "../src/world/ScenarioDefinitions";

describe("GravityFieldSystem", () => {
  it("pulls toward the Oceanic planet and follows its current", () => {
    const gravity = new GravityFieldSystem(SCENARIOS);
    const attract = gravity.sample(0, { x: 10, y: -2 }, 0);
    expect(attract.x).toBeGreaterThan(0);
    const current = gravity.sample(0, { x: 4, y: 12 }, 0);
    expect(current.y).toBeGreaterThan(0);
  });

  it("reduces applied force while the stabilizer is active", () => {
    const gravity = new GravityFieldSystem(SCENARIOS);
    const normalVelocity = { x: 0, y: 0 };
    gravity.apply(0, { x: 10, y: -2 }, normalVelocity, 0, 0.1);
    const normalForce = Math.hypot(normalVelocity.x, normalVelocity.y);
    expect(gravity.activateStabilizer()).toBe(true);
    const stabilizedVelocity = { x: 0, y: 0 };
    gravity.apply(0, { x: 10, y: -2 }, stabilizedVelocity, 0, 0.1);
    expect(Math.hypot(stabilizedVelocity.x, stabilizedVelocity.y)).toBeLessThan(normalForce * 0.3);
    expect(gravity.activateStabilizer()).toBe(false);
  });
});
