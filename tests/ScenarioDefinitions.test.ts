import { describe, expect, it } from "vitest";
import {
  AUTHORED_GATE_SCALE,
  AUTHORED_GATE_POSITION_SCALE,
  AUTHORED_HERO_POSITION_SCALE,
  AUTHORED_LANDMARK_POSITION_SCALE,
  AUTHORED_SECONDARY_POSITION_SCALE,
  AUTHORED_SPRITE_SCALE,
  AUTHORED_TARGET_POSITION_SCALE,
  AUTHORED_WORLD_SCALE,
  BIOME_LABELS,
  SCENARIOS,
  WORLD_PROFILES,
  scenarioForStage,
} from "../src/world/ScenarioDefinitions";

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

  it("keeps the authored map scale and final-showable landmark textures", () => {
    const oceanic = scenarioForStage(0);
    expect(oceanic.bounds).toEqual({ minX: -34, maxX: 34, minY: -40, maxY: 26 });
    expect(oceanic.landmarks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "fractured_beacon",
        texture: "assets/runtime/final-showable/textures/beacon.png",
        scale: 3.2,
      }),
      expect.objectContaining({
        id: "orbital_ruins",
        texture: "assets/runtime/final-showable/textures/orbital_ruins.png",
        scale: 2.7,
      }),
    ]));
  });

  it("projects fixed authored sectors with coherent depth scales", () => {
    expect(AUTHORED_WORLD_SCALE).toBe(0.072);
    expect(AUTHORED_SPRITE_SCALE).toBe(0.24);
    expect(AUTHORED_GATE_SCALE).toBe(2.7);
    expect(AUTHORED_HERO_POSITION_SCALE).toBe(0.34);
    expect(AUTHORED_SECONDARY_POSITION_SCALE).toBe(0.46);
    expect(AUTHORED_LANDMARK_POSITION_SCALE).toBe(0.34);
    expect(AUTHORED_GATE_POSITION_SCALE).toBe(0.34);
    expect(AUTHORED_TARGET_POSITION_SCALE).toBe(0.34);
    expect(scenarioForStage(1).hero).toEqual(expect.objectContaining({
      texture: "assets/runtime/gravedad-zero/planets/planet_mechanical_moon_albedo.png",
      scale: 8.4,
    }));
  });

  it("keeps the Oceanic secondary moon opposite the hero planet", () => {
    const oceanic = scenarioForStage(0);
    expect(oceanic.secondaryBodies).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "oceanic_moon", x: -24, radius: 0.64 }),
      expect.objectContaining({ id: "oceanic_sw", x: -27, y: -34 }),
      expect.objectContaining({ id: "oceanic_ne", x: 27, y: 19 }),
    ]));
    expect(Math.sign(oceanic.secondaryBodies![0]!.x - oceanic.center.x)).not.toBe(
      Math.sign(oceanic.hero.x - oceanic.center.x),
    );
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
