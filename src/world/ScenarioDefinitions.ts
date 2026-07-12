export type ScenarioId = "oceanic" | "mechanical" | "dark_crater" | "relic_core";
export type RuntimeBiome = "oceanic" | "mechanical" | "synthetic" | "relic";

export interface ScenarioLandmark {
  id: string;
  name: string;
  role: "primary" | "secondary";
  worldKind: string;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  biome: RuntimeBiome;
  stageIndex: number;
  name: string;
  accent: string;
  direction: string;
  prohibitedMotifs: readonly string[];
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
    worldProfile: {
      name: "STAGE_1_CLEAN_OCEAN",
      density: 0.82,
      planetFamilies: ["planet_ocean_large", "moon", "planet_gas_far"],
      syntheticFamilies: ["fractured_beacon", "orbital_ruins"],
      vividFamilies: ["planet_ocean_large"],
      debris: 0.55,
    },
    landmarks: [
      { id: "fractured_beacon", name: "BALIZA FRACTURADA", role: "primary", worldKind: "fractured_beacon" },
      { id: "orbital_ruins", name: "RUINAS ORBITALES", role: "secondary", worldKind: "orbital_ruins" },
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
    worldProfile: {
      name: "STAGE_2_NETWORK_MECHANICAL",
      density: 1.04,
      planetFamilies: ["planet_network", "mechanical_moon", "planet_gas_far"],
      syntheticFamilies: ["broken_gate", "orbital_station_body", "gravity_node"],
      vividFamilies: ["planet_network", "mechanical_moon"],
      debris: 0.7,
    },
    landmarks: [
      { id: "broken_ring", name: "ANILLO ORBITAL ROTO", role: "primary", worldKind: "broken_gate" },
      { id: "scanner_array", name: "SCANNER ARRAY", role: "secondary", worldKind: "orbital_station_body" },
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
    worldProfile: {
      name: "STAGE_3_DARK_SYNTHETIC",
      density: 1.22,
      planetFamilies: ["planet_crater_magenta", "planet_dark_giant", "mechanical_moon"],
      syntheticFamilies: ["synthetic_core", "relic_fragment_cluster", "gravity_node"],
      vividFamilies: ["planet_crater_magenta", "synthetic_core"],
      debris: 0.82,
    },
    landmarks: [
      { id: "synthetic_rift", name: "SYNTHETIC RIFT", role: "primary", worldKind: "synthetic_core" },
      { id: "gravity_tower", name: "GRAVITY TOWER", role: "secondary", worldKind: "gravity_node" },
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
    worldProfile: {
      name: "FINAL_RELIC_ALIGNMENT",
      density: 1.12,
      planetFamilies: ["planet_ocean_large", "planet_dark_giant", "mechanical_moon"],
      syntheticFamilies: ["relic_fragment_cluster", "orbital_station_body", "gravity_node"],
      vividFamilies: ["relic_fragment_cluster", "orbital_station_body"],
      debris: 0.46,
    },
    landmarks: [
      { id: "relic_portal", name: "RELIC PORTAL", role: "primary", worldKind: "relic_fragment_cluster" },
      { id: "gravity_nodes", name: "GRAVITY NODES", role: "secondary", worldKind: "gravity_node" },
    ],
    gravityFields: [
      { id: "relic_node_a", type: "attract", x: 7, y: 191, radius: 19, strength: 0.22 },
      { id: "relic_node_b", type: "repel", x: 29, y: 191, radius: 19, strength: 0.22 },
      { id: "relic_node_c", type: "pulse", x: 18, y: 207, radius: 21, strength: 0.27, period: 4.6 },
    ],
  },
] as const;

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
