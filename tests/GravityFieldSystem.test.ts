import { describe, expect, it } from "vitest";
import { GravityFieldSystem, type GravityFieldDefinition } from "../src/world/GravityFieldSystem";
import { SCENARIOS } from "../src/world/ScenarioDefinitions";

describe("GravityFieldSystem", () => {
  it("produces a perceptible drift halfway inside a gravity field", () => {
    const gravity = new GravityFieldSystem([
      {
        gravityFields: [
          { id: "test-attractor", type: "attract", x: 10, y: 0, radius: 20, strength: 0.2 },
        ],
      },
    ]);
    const velocity = { x: 0, y: 0 };

    gravity.apply(0, { x: 0, y: 0 }, velocity, 0, 0.1);

    expect(velocity.x).toBeGreaterThanOrEqual(0.04);
    expect(velocity.y).toBeCloseTo(0);
  });

  it("keeps pulse gravity perceptible while giving it a distinct crest", () => {
    const gravity = new GravityFieldSystem([
      {
        gravityFields: [
          { id: "test-pulse", type: "pulse", x: 10, y: 0, radius: 20, strength: 0.2, period: 4 },
        ],
      },
    ]);
    const troughVelocity = { x: 0, y: 0 };
    const crestVelocity = { x: 0, y: 0 };

    gravity.apply(0, { x: 0, y: 0 }, troughVelocity, 3, 0.1);
    gravity.apply(0, { x: 0, y: 0 }, crestVelocity, 1, 0.1);

    expect(Math.abs(troughVelocity.x)).toBeGreaterThanOrEqual(0.025);
    expect(Math.abs(crestVelocity.x)).toBeGreaterThan(Math.abs(troughVelocity.x) * 2);
    expect(troughVelocity.x).toBeLessThan(0);
    expect(crestVelocity.x).toBeLessThan(0);
  });

  it("gives each gravity family a distinct directional signature", () => {
    const sampleFor = (field: GravityFieldDefinition, elapsed = 0) =>
      new GravityFieldSystem([{ gravityFields: [field] }]).sample(0, { x: 0, y: 0 }, elapsed);
    const baseField = { x: 10, y: 0, radius: 20, strength: 0.2 };

    const attract = sampleFor({ id: "attract", type: "attract", ...baseField });
    const repel = sampleFor({ id: "repel", type: "repel", ...baseField });
    const tangential = sampleFor({ id: "tangential", type: "tangential", ...baseField });
    const current = sampleFor({
      id: "current",
      type: "current",
      ...baseField,
      direction: { x: 0, y: -1 },
    });
    const unstableAtStart = sampleFor({ id: "unstable", type: "unstable", ...baseField, period: 4 });
    const unstableHalfCycle = sampleFor({ id: "unstable", type: "unstable", ...baseField, period: 4 }, 2);

    expect(attract.x).toBeGreaterThan(0);
    expect(repel.x).toBeLessThan(0);
    expect(tangential.y).toBeGreaterThan(0);
    expect(current.y).toBeLessThan(0);
    expect(unstableAtStart.x).toBeGreaterThan(0);
    expect(unstableHalfCycle.x).toBeLessThan(0);
  });

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

  it("applies exactly 24 percent gravity for the entire active window", () => {
    const normalGravity = new GravityFieldSystem(SCENARIOS);
    const stabilizedGravity = new GravityFieldSystem(SCENARIOS);
    const normalVelocity = { x: 0, y: 0 };
    const stabilizedVelocity = { x: 0, y: 0 };

    normalGravity.apply(0, { x: 10, y: -2 }, normalVelocity, 0, 2.5);
    expect(stabilizedGravity.activateStabilizer()).toBe(true);
    stabilizedGravity.apply(0, { x: 10, y: -2 }, stabilizedVelocity, 0, 2.5);

    const normalForce = Math.hypot(normalVelocity.x, normalVelocity.y);
    const stabilizedForce = Math.hypot(stabilizedVelocity.x, stabilizedVelocity.y);
    expect(stabilizedForce).toBeCloseTo(normalForce * 0.24, 8);
    expect(stabilizedGravity.status.active).toBe(false);
  });

  it("starts a full cooldown after stabilization and blocks reactivation until ready", () => {
    const gravity = new GravityFieldSystem(SCENARIOS);
    const velocity = { x: 0, y: 0 };

    expect(gravity.activateStabilizer()).toBe(true);
    gravity.apply(0, { x: 10, y: -2 }, velocity, 0, 2.5);

    expect(gravity.status).toEqual({ active: false, remaining: 0, cooldown: 8 });
    expect(gravity.activateStabilizer()).toBe(false);

    gravity.apply(0, { x: 10, y: -2 }, velocity, 0, 7.9);
    expect(gravity.status.cooldown).toBeCloseTo(0.1, 8);
    expect(gravity.activateStabilizer()).toBe(false);

    gravity.apply(0, { x: 10, y: -2 }, velocity, 0, 0.1);
    expect(gravity.status.cooldown).toBe(0);
    expect(gravity.activateStabilizer()).toBe(true);
  });

  it("integrates only the active portion of a frame at 24 percent gravity", () => {
    const normalGravity = new GravityFieldSystem(SCENARIOS);
    const stabilizedGravity = new GravityFieldSystem(SCENARIOS);
    const normalVelocity = { x: 0, y: 0 };
    const stabilizedVelocity = { x: 0, y: 0 };

    normalGravity.apply(0, { x: 10, y: -2 }, normalVelocity, 0, 3);
    expect(stabilizedGravity.activateStabilizer()).toBe(true);
    stabilizedGravity.apply(0, { x: 10, y: -2 }, stabilizedVelocity, 0, 3);

    const normalForce = Math.hypot(normalVelocity.x, normalVelocity.y);
    const stabilizedForce = Math.hypot(stabilizedVelocity.x, stabilizedVelocity.y);
    const expectedScale = (2.5 * 0.24 + 0.5) / 3;
    expect(stabilizedForce).toBeCloseTo(normalForce * expectedScale, 8);
    expect(stabilizedGravity.status.cooldown).toBeCloseTo(7.5, 8);
  });

  it("recharges the stabilizer immediately from cooldown", () => {
    const gravity = new GravityFieldSystem(SCENARIOS);
    const velocity = { x: 0, y: 0 };

    expect(gravity.activateStabilizer()).toBe(true);
    gravity.apply(0, { x: 10, y: -2 }, velocity, 0, 2.5);
    expect(gravity.status.cooldown).toBe(8);

    gravity.rechargeStabilizer();

    expect(gravity.status).toEqual({ active: false, remaining: 0, cooldown: 0 });
    expect(gravity.activateStabilizer()).toBe(true);
  });
});
