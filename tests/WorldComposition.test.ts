import { describe, expect, it } from "vitest";
import { WorldComposition } from "../src/world/WorldComposition";

describe("WorldComposition", () => {
  it("limits hero planets and protects gameplay safe zone", () => {
    const system = new WorldComposition();
    const candidate = (id: string, x: number, textureId = id) => ({
      record: {
        id,
        biome: "oceanic" as const,
        stageAffinity: 0 as const,
        kind: "hero" as const,
        textureId,
        coordinate: { x: 0, y: 0 },
        radius: 2,
        axialSpeed: 0.01,
        translationPhase: 0,
        materialLocked: true,
        discovered: true,
      },
      bounds: { x, y: 0, width: 0.3, height: 0.3 },
      depth: 10,
    });

    const result = system.compose(
      [candidate("a", -0.9), candidate("b", 0.55), candidate("c", 0.9)],
      { x: -0.25, y: -0.25, width: 0.5, height: 0.5 },
    );

    expect(result.accepted.length).toBeLessThanOrEqual(1);
    expect(result.accepted.every((item) => item.bounds.x + item.bounds.width <= -0.25 || item.bounds.x >= 0.25)).toBe(true);
  });

  it("rejects duplicate hero textures and excessive overlap", () => {
    const system = new WorldComposition();
    const hero = (id: string, textureId: string, x: number) => ({
      record: {
        id,
        biome: "oceanic" as const,
        stageAffinity: 0 as const,
        kind: "hero" as const,
        textureId,
        coordinate: { x: 0, y: 0 },
        radius: 2,
        axialSpeed: 0.01,
        translationPhase: 0,
        materialLocked: true,
        discovered: true,
      },
      bounds: { x, y: 0.55, width: 0.5, height: 0.5 },
      depth: 10,
    });
    const result = system.compose(
      [hero("a", "ocean", -0.9), hero("b", "ocean", 0.2), hero("c", "dark", -0.72)],
      { x: -0.2, y: -0.2, width: 0.4, height: 0.4 },
    );
    expect(result.rejected.some((item) => item.reason === "duplicate-hero-texture")).toBe(true);
    expect(result.rejected.some((item) => item.reason === "hero-overlap")).toBe(true);
  });

  it("keeps authored landmarks out of the gameplay safe zone", () => {
    const system = new WorldComposition();
    const result = system.compose([
      {
        record: {
          id: "fractured_beacon",
          biome: "oceanic",
          stageAffinity: 0,
          kind: "landmark",
          textureId: "assets/runtime/final-showable/textures/beacon.png",
          coordinate: { x: -17, y: 1 },
          radius: 1.6,
          axialSpeed: 0,
          translationPhase: 0,
          materialLocked: true,
          discovered: true,
        },
        bounds: { x: -0.82, y: -0.24, width: 0.30, height: 0.30 },
        depth: 1,
      },
    ], { x: -0.2, y: -0.2, width: 0.4, height: 0.4 });

    expect(result.accepted.map((candidate) => candidate.record.id)).toEqual(["fractured_beacon"]);
  });
});
