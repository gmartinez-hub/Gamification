import { describe, expect, it } from "vitest";
import { updateAimRotation, type AimState } from "../src/combat/AimCombat";

describe("AimCombat", () => {
  it("converges through angular velocity instead of snapping", () => {
    let state: AimState = {
      phase: "align" as const,
      elapsed: 0,
      rawDuration: 2,
      angle: 0,
      angularVelocity: 0,
      targetAngle: Math.PI / 2,
      alignmentError: Math.PI / 2,
      fired: false,
    };
    const tuning = {
      angularAcceleration: 8.4,
      angularDamping: 7,
      maxAngularVelocity: 3.4,
      fireTolerance: 0.075,
    };
    state = updateAimRotation(state, 1 / 60, tuning);
    expect(state.angle).toBeGreaterThan(0);
    expect(state.angle).toBeLessThan(Math.PI / 2);
    for (let index = 0; index < 180; index += 1) state = updateAimRotation(state, 1 / 60, tuning);
    expect(state.alignmentError).toBeLessThan(0.08);
  });
});
