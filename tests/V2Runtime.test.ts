import { describe, expect, it } from "vitest";
import { V2Runtime } from "../src/app/V2Runtime";

describe("V2Runtime", () => {
  it("unlocks biome access through gems and keeps transitions coordinate-based", () => {
    const runtime = new V2Runtime();
    expect(runtime.updateBiome({ x: 92, y: 60 }, 0).primary).toBe("oceanic");
    expect(runtime.updateBiome({ x: 92, y: 60 }, 1).primary).toBe("mechanical");
    expect(runtime.updateBiome({ x: -96, y: 128 }, 2).primary).toBe("synthetic");
  });

  it("applies invulnerability and recovers shield", () => {
    const runtime = new V2Runtime();
    expect(runtime.damageShield(8)).toBe(8);
    expect(runtime.damageShield(8)).toBe(0);
    runtime.updateShield(4);
    runtime.updateShield(1);
    expect(runtime.shield.value).toBeGreaterThan(92);
  });
});
