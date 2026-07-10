export type AssetBiome = "shared" | "oceanic" | "mechanical" | "synthetic" | "relic";

export interface AssetEntry {
  id: string;
  path: string;
  type: "texture" | "audio" | "json";
  biome: AssetBiome;
  preload: "boot" | "current-biome" | "next-biome" | "on-demand";
  dispose: "persistent" | "region-exit" | "after-use";
  related?: string[];
}

export const ASSET_CATALOG: AssetEntry[] = [
  {
    id: "planet.ocean.albedo",
    path: "/assets/runtime/v2/biomes/oceanic/planet_ocean_albedo.png",
    type: "texture",
    biome: "oceanic",
    preload: "current-biome",
    dispose: "region-exit",
    related: ["planet.ocean.normal", "planet.ocean.emissive"],
  },
  {
    id: "planet.ocean.normal",
    path: "/assets/runtime/v2/biomes/oceanic/planet_ocean_normal.png",
    type: "texture",
    biome: "oceanic",
    preload: "current-biome",
    dispose: "region-exit",
  },
  {
    id: "planet.ocean.emissive",
    path: "/assets/runtime/v2/biomes/oceanic/planet_ocean_emissive.png",
    type: "texture",
    biome: "oceanic",
    preload: "current-biome",
    dispose: "region-exit",
  },
  {
    id: "planet.mechanical.albedo",
    path: "/assets/runtime/v2/biomes/mechanical/asteroid_mech_albedo_tile.png",
    type: "texture",
    biome: "mechanical",
    preload: "next-biome",
    dispose: "region-exit",
    related: ["planet.mechanical.normal", "planet.mechanical.emissive"],
  },
  {
    id: "planet.mechanical.normal",
    path: "/assets/runtime/v2/biomes/mechanical/asteroid_mech_normal_tile.png",
    type: "texture",
    biome: "mechanical",
    preload: "next-biome",
    dispose: "region-exit",
  },
  {
    id: "planet.mechanical.emissive",
    path: "/assets/runtime/v2/biomes/mechanical/asteroid_mech_emissive_tile.png",
    type: "texture",
    biome: "mechanical",
    preload: "next-biome",
    dispose: "region-exit",
  },
  {
    id: "planet.synthetic.albedo",
    path: "/assets/runtime/v2/biomes/synthetic/planet_darkcrater_albedo.png",
    type: "texture",
    biome: "synthetic",
    preload: "next-biome",
    dispose: "region-exit",
    related: ["planet.synthetic.normal", "planet.synthetic.emissive"],
  },
  {
    id: "planet.synthetic.normal",
    path: "/assets/runtime/v2/biomes/synthetic/planet_darkcrater_normal.png",
    type: "texture",
    biome: "synthetic",
    preload: "next-biome",
    dispose: "region-exit",
  },
  {
    id: "planet.synthetic.emissive",
    path: "/assets/runtime/v2/biomes/synthetic/planet_darkcrater_emissive.png",
    type: "texture",
    biome: "synthetic",
    preload: "next-biome",
    dispose: "region-exit",
  },
  {
    id: "projectile.pulse",
    path: "/assets/runtime/v2/projectiles/projectile_ship_energy_bolt_1024x256.png",
    type: "texture",
    biome: "shared",
    preload: "boot",
    dispose: "persistent",
  },
  {
    id: "projectile.tool",
    path: "/assets/runtime/v2/projectiles/projectile_astronaut_tool_bolt_768x192.png",
    type: "texture",
    biome: "shared",
    preload: "boot",
    dispose: "persistent",
  },
  {
    id: "projectile.trail.short",
    path: "/assets/runtime/v2/projectiles/projectile_short_trail_768x192.png",
    type: "texture",
    biome: "shared",
    preload: "boot",
    dispose: "persistent",
  },
  {
    id: "projectile.trail.long",
    path: "/assets/runtime/v2/projectiles/projectile_long_trail_1024x256.png",
    type: "texture",
    biome: "shared",
    preload: "on-demand",
    dispose: "persistent",
  },
  {
    id: "projectile.miss",
    path: "/assets/runtime/v2/projectiles/miss_spark_512.png",
    type: "texture",
    biome: "shared",
    preload: "boot",
    dispose: "persistent",
  },
  {
    id: "projectile.impact",
    path: "/assets/runtime/v2/projectiles/impact_ring_atlas_4x1_1024.png",
    type: "texture",
    biome: "shared",
    preload: "on-demand",
    dispose: "persistent",
  },
  {
    id: "projectile.charge",
    path: "/assets/runtime/v2/projectiles/muzzle_charge_atlas_4x1_1024.png",
    type: "texture",
    biome: "shared",
    preload: "on-demand",
    dispose: "persistent",
  },
  {
    id: "aim.lock-ring",
    path: "/assets/runtime/v2/projectiles/target_lock_ring_1024.png",
    type: "texture",
    biome: "shared",
    preload: "boot",
    dispose: "persistent",
  },
  {
    id: "aim.lock-field",
    path: "/assets/runtime/v2/projectiles/target_lock_field_1024.png",
    type: "texture",
    biome: "shared",
    preload: "boot",
    dispose: "persistent",
  },
  {
    id: "aim.stabilize-field",
    path: "/assets/runtime/v2/projectiles/zero_g_stabilize_field_1024.png",
    type: "texture",
    biome: "shared",
    preload: "boot",
    dispose: "persistent",
  },
  {
    id: "audio.aim.stabilize",
    path: "/assets/runtime/v2/audio/zero_g_lock_stabilize.wav",
    type: "audio",
    biome: "shared",
    preload: "on-demand",
    dispose: "persistent",
  },
];

const catalogById = new Map(ASSET_CATALOG.map((entry) => [entry.id, entry]));

export function assetPath(id: string): string {
  const entry = catalogById.get(id);
  if (!entry) throw new Error(`Unknown V2 asset: ${id}`);
  return entry.path.replace(/^\//, "");
}
