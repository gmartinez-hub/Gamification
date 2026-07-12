import { describe, expect, it } from "vitest";
import { SCENARIOS } from "../../src/final-showable/scenarios.js";

describe("final showable scenarios", () => {
  it("defines exactly four authored scenarios", () => {
    expect(SCENARIOS).toHaveLength(4);
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      "oceanic",
      "mechanical",
      "dark_crater",
      "relic_core",
    ]);
  });

  it("keeps adjacent gates bidirectional once unlocked", () => {
    expect(SCENARIOS[0].gate.to).toBe(1);
    expect(SCENARIOS[1].backGate.to).toBe(0);
    expect(SCENARIOS[1].gate.to).toBe(2);
    expect(SCENARIOS[2].backGate.to).toBe(1);
    expect(SCENARIOS[2].gate.to).toBe(3);
    expect(SCENARIOS[3].backGate.to).toBe(2);
  });

  it("contains the required gravity language", () => {
    const types = new Set(SCENARIOS.flatMap((s) => s.gravity.map((f) => f.type)));
    for (const type of ["attract", "repel", "tangential", "current", "pulse", "unstable"]) {
      expect(types.has(type)).toBe(true);
    }
  });

  it("has one primary landmark per biome and secondary content", () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.landmarks.filter((x) => x.primary)).toHaveLength(1);
      expect(scenario.landmarks.some((x) => x.secondary)).toBe(true);
    }
  });
});
