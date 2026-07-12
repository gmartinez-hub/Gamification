import { describe, expect, it } from "vitest";
import { BIOME_LABELS, SCENARIOS, WORLD_PROFILES, scenarioForStage } from "../src/world/ScenarioDefinitions";

describe("authored scenario definitions", () => {
  it("defines the four connected game regions in stage order", () => {
    expect(SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "oceanic",
      "mechanical",
      "dark_crater",
      "relic_core",
    ]);
    expect(SCENARIOS.map((scenario) => scenario.stageIndex)).toEqual([0, 1, 2, 3]);
  });

  it("keeps Oceanic orbital and free of aquatic-fauna motifs", () => {
    const oceanic = scenarioForStage(0);
    expect(oceanic.worldProfile.planetFamilies).toContain("planet_ocean_large");
    expect(oceanic.direction).toMatch(/orbital.+ocean worlds/i);
    expect(oceanic.prohibitedMotifs).toEqual(expect.arrayContaining(["whales", "fish", "jellyfish", "coral"]));
    expect(oceanic.landmarks.map((landmark) => landmark.id)).toEqual(["fractured_beacon", "orbital_ruins"]);
  });

  it("drives runtime profiles and UI labels from the same source", () => {
    const oceanic = SCENARIOS[0]!;
    const relic = SCENARIOS[3]!;
    expect(WORLD_PROFILES).toHaveLength(SCENARIOS.length);
    expect(WORLD_PROFILES[0]!.name).toBe(oceanic.worldProfile.name);
    expect(BIOME_LABELS.oceanic).toBe(oceanic.name);
    expect(BIOME_LABELS.relic).toBe(relic.name);
  });
});
