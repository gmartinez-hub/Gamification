export type ScenarioId = "oceanic" | "mechanical" | "dark_crater" | "relic_core";
export type RuntimeBiome = "oceanic" | "mechanical" | "synthetic" | "relic";

export interface ScenarioLandmark {
  id: string;
  name: string;
  role: "primary" | "secondary";
  worldKind: string;
  x: number;
  y: number;
  texture: string;
  scale: number;
}

export interface ScenarioBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ScenarioGate {
  x: number;
  y: number;
  to: number;
  name: string;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  biome: RuntimeBiome;
  stageIndex: number;
  name: string;
  accent: string;
  direction: string;
  prohibitedMotifs: readonly string[];
  center: { x: number; y: number };
  bounds: ScenarioBounds;
  hero: {
    texture: string;
    worldKind: string;
    x: number;
    y: number;
    scale: number;
  };
  gate?: ScenarioGate;
  backGate?: ScenarioGate;
  worldProfile: {
    name: string;
    density: number;
    planetFamilies: readonly string[];
    syntheticFamilies: readonly string[];
    vividFamilies: readonly string[];
    debris: number;
  };
  landmarks: readonly ScenarioLandmark[];
  gravityFields: readonly import("./GravityFieldSystem").GravityFieldDefinition[];
}

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: "oceanic",
    biome: "oceanic",
    stageIndex: 0,
    name: "OCEANIC FRONTIER",
    accent: "#62edff",
    direction: "Open orbital frontier around natural ocean worlds, terrestrial cloud systems and sparse human infrastructure.",
    prohibitedMotifs: ["aquatic fauna", "whales", "fish", "jellyfish", "coral", "underwater scenery"],
    center: { x: 0, y: -8 },
    bounds: { minX: -34, maxX: 34, minY: -40, maxY: 26 },
    hero: { texture: "assets/runtime/gravedad-zero/planets/planet_ocean_prime_albedo.png", worldKind: "planet_ocean_large", x: 22, y: -2, scale: 8.8 },
    gate: { x: 0, y: 23, to: 1, name: "CORREDOR ORBITAL" },
    worldProfile: {
      name: "STAGE_1_CLEAN_OCEAN",
      density: 0.82,
      planetFamilies: ["planet_ocean_large", "moon", "planet_gas_far"],
      syntheticFamilies: ["fractured_beacon", "orbital_ruins"],
      vividFamilies: ["planet_ocean_large"],
      debris: 0.55,
    },
    landmarks: [
      { id: "fractured_beacon", name: "BALIZA FRACTURADA", role: "primary", worldKind: "fractured_beacon", x: -17, y: 1, texture: "assets/runtime/final-showable/textures/beacon.png", scale: 3.2 },
      { id: "orbital_ruins", name: "RUINAS ORBITALES", role: "secondary", worldKind: "orbital_ruins", x: 5, y: 15, texture: "assets/runtime/final-showable/textures/orbital_ruins.png", scale: 2.7 },
    ],
    gravityFields: [
      { id: "ocean_attractor", type: "attract", x: 22, y: -2, radius: 28, strength: 0.18 },
      { id: "ocean_current", type: "current", x: 4, y: 12, radius: 22, strength: 0.075, direction: { x: 0.34, y: 0.94 } },
    ],
  },
  {
    id: "mechanical",
    biome: "mechanical",
    stageIndex: 1,
    name: "MECHANICAL NETWORK",
    accent: "#a36dff",
    direction: "Dense orbital infrastructure, mechanical bodies and technological debris.",
    prohibitedMotifs: [],
    center: { x: 92, y: 60 },
    bounds: { minX: 55, maxX: 130, minY: 27, maxY: 96 },
    hero: { texture: "assets/runtime/gravedad-zero/planets/planet_mechanical_moon_albedo.png", worldKind: "mechanical_moon", x: 112, y: 65, scale: 8.4 },
    gate: { x: 92, y: 94, to: 2, name: "FRONTERA FRACTURADA" },
    backGate: { x: 92, y: 29, to: 0, name: "RETORNO OCEANIC" },
    worldProfile: {
      name: "STAGE_2_NETWORK_MECHANICAL",
      density: 1.04,
      planetFamilies: ["planet_network", "mechanical_moon", "planet_gas_far"],
      syntheticFamilies: ["broken_gate", "orbital_station_body", "gravity_node"],
      vividFamilies: ["planet_network", "mechanical_moon"],
      debris: 0.7,
    },
    landmarks: [
      { id: "broken_ring", name: "ANILLO ORBITAL ROTO", role: "primary", worldKind: "broken_gate", x: 81, y: 69, texture: "assets/runtime/final-showable/textures/broken_ring.png", scale: 3.8 },
      { id: "scanner_array", name: "SCANNER ARRAY", role: "secondary", worldKind: "orbital_station_body", x: 105, y: 43, texture: "assets/runtime/final-showable/textures/scanner_array.png", scale: 2.8 },
    ],
    gravityFields: [
      { id: "mechanical_ring", type: "tangential", x: 81, y: 69, radius: 34, strength: 0.26 },
      { id: "mechanical_well", type: "attract", x: 112, y: 65, radius: 27, strength: 0.17 },
    ],
  },
  {
    id: "dark_crater",
    biome: "synthetic",
    stageIndex: 2,
    name: "DARK CRATER",
    accent: "#ff5de1",
    direction: "Hostile crater world with synthetic fractures, magenta-cyan hazards and unstable gravity.",
    prohibitedMotifs: [],
    center: { x: -96, y: 128 },
    bounds: { minX: -134, maxX: -58, minY: 94, maxY: 162 },
    hero: { texture: "assets/runtime/gravedad-zero/planets/planet_dark_crater_albedo.png", worldKind: "planet_dark_giant", x: -116, y: 132, scale: 9.2 },
    gate: { x: -96, y: 160, to: 3, name: "RIFT ESTABILIZADO" },
    backGate: { x: -96, y: 96, to: 1, name: "RETORNO MECHANICAL" },
    worldProfile: {
      name: "STAGE_3_DARK_SYNTHETIC",
      density: 1.22,
      planetFamilies: ["planet_crater_magenta", "planet_dark_giant", "mechanical_moon"],
      syntheticFamilies: ["synthetic_core", "relic_fragment_cluster", "gravity_node"],
      vividFamilies: ["planet_crater_magenta", "synthetic_core"],
      debris: 0.82,
    },
    landmarks: [
      { id: "synthetic_rift", name: "SYNTHETIC RIFT", role: "primary", worldKind: "synthetic_core", x: -84, y: 140, texture: "assets/runtime/final-showable/textures/synthetic_rift.png", scale: 4.0 },
      { id: "gravity_tower", name: "GRAVITY TOWER", role: "secondary", worldKind: "gravity_node", x: -108, y: 108, texture: "assets/runtime/final-showable/textures/gravity_tower.png", scale: 3.0 },
    ],
    gravityFields: [
      { id: "synthetic_rift", type: "pulse", x: -84, y: 140, radius: 32, strength: 0.31, period: 5.2 },
      { id: "synthetic_shift", type: "unstable", x: -116, y: 132, radius: 30, strength: 0.22, period: 7.4 },
      { id: "crater_repel", type: "repel", x: -104, y: 116, radius: 20, strength: 0.18 },
    ],
  },
  {
    id: "relic_core",
    biome: "relic",
    stageIndex: 3,
    name: "RELIC CORE",
    accent: "#ffffff",
    direction: "Clean ceremonial resolution space focused on the portal and three gravity nodes.",
    prohibitedMotifs: [],
    center: { x: 18, y: 196 },
    bounds: { minX: -18, maxX: 54, minY: 168, maxY: 226 },
    hero: { texture: "assets/runtime/gravedad-zero/planets/planet_nebula_core_albedo.png", worldKind: "planet_ocean_large", x: 36, y: 203, scale: 8.0 },
    backGate: { x: 18, y: 170, to: 2, name: "RETORNO DARK CRATER" },
    worldProfile: {
      name: "FINAL_RELIC_ALIGNMENT",
      density: 1.12,
      planetFamilies: ["planet_ocean_large", "planet_dark_giant", "mechanical_moon"],
      syntheticFamilies: ["relic_fragment_cluster", "orbital_station_body", "gravity_node"],
      vividFamilies: ["relic_fragment_cluster", "orbital_station_body"],
      debris: 0.46,
    },
    landmarks: [
      { id: "relic_portal", name: "PORTAL DE RELIQUIA", role: "primary", worldKind: "relic_fragment_cluster", x: 18, y: 196, texture: "assets/runtime/final-showable/textures/relic_portal.png", scale: 4.4 },
      { id: "gravity_node_a", name: "NODO ATTRACT", role: "secondary", worldKind: "gravity_node", x: 7, y: 191, texture: "assets/runtime/final-showable/textures/gravity_node.png", scale: 2.0 },
      { id: "gravity_node_b", name: "NODO REPEL", role: "secondary", worldKind: "gravity_node", x: 29, y: 191, texture: "assets/runtime/final-showable/textures/gravity_node.png", scale: 2.0 },
      { id: "gravity_node_c", name: "NODO PULSE", role: "secondary", worldKind: "gravity_node", x: 18, y: 207, texture: "assets/runtime/final-showable/textures/gravity_node.png", scale: 2.0 },
    ],
    gravityFields: [
      { id: "relic_node_a", type: "attract", x: 7, y: 191, radius: 19, strength: 0.22 },
      { id: "relic_node_b", type: "repel", x: 29, y: 191, radius: 19, strength: 0.22 },
      { id: "relic_node_c", type: "pulse", x: 18, y: 207, radius: 21, strength: 0.27, period: 4.6 },
    ],
  },
] as const;

// Projection constants copied from the release package. Manifest scales are world
// authoring units, not direct screen-space sprite sizes.
export const AUTHORED_WORLD_SCALE = 0.072;
export const AUTHORED_SPRITE_SCALE = 0.24;
export const AUTHORED_GATE_SCALE = 2.7;

export function scenarioForStage(stageIndex: number): ScenarioDefinition {
  const safeIndex = Math.max(0, Math.min(SCENARIOS.length - 1, Math.trunc(stageIndex || 0)));
  return SCENARIOS[safeIndex]!;
}

export const WORLD_PROFILES = SCENARIOS.map((scenario) => ({
  ...scenario.worldProfile,
  accent: scenario.accent,
  planetFamilies: [...scenario.worldProfile.planetFamilies],
  syntheticFamilies: [...scenario.worldProfile.syntheticFamilies],
  vividFamilies: [...scenario.worldProfile.vividFamilies],
}));

export const BIOME_LABELS = Object.fromEntries(
  SCENARIOS.map((scenario) => [scenario.biome, scenario.name]),
) as Record<RuntimeBiome, string>;
