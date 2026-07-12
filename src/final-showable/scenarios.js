export const SCENARIOS = [
  {
    id: "oceanic",
    name: "OCEANIC FRONTIER",
    stage: 0,
    center: { x: 0, y: -8 },
    bounds: { minX: -34, maxX: 34, minY: -40, maxY: 26 },
    hero: { texture: "assets/runtime/gravedad-zero/planets/planet_ocean_prime_albedo.png", x: 22, y: -2, scale: 8.8 },
    landmarks: [
      { id: "fractured_beacon", name: "BALIZA FRACTURADA", x: -17, y: 1, texture: "beacon.png", scale: 3.2, primary: true },
      { id: "orbital_ruins", name: "RUINAS ORBITALES", x: 5, y: 15, texture: "orbital_ruins.png", scale: 2.7, secondary: true },
    ],
    gravity: [
      { id: "ocean_attractor", type: "attract", x: 22, y: -2, radius: 28, strength: 0.18 },
      { id: "ocean_current", type: "current", x: 4, y: 12, radius: 22, strength: 0.075, direction: { x: 0.34, y: 0.94 } },
    ],
    gate: { x: 0, y: 23, to: 1, name: "CORREDOR ORBITAL" },
    audio: "ambient_oceanic_45s.wav",
    palette: { primary: "#5ce9ff", secondary: "#315bff" },
  },
  {
    id: "mechanical",
    name: "MECHANICAL NETWORK",
    stage: 1,
    center: { x: 92, y: 60 },
    bounds: { minX: 55, maxX: 130, minY: 27, maxY: 96 },
    hero: { texture: "assets/runtime/gravedad-zero/planets/planet_mechanical_moon_albedo.png", x: 112, y: 65, scale: 8.4 },
    landmarks: [
      { id: "broken_ring", name: "ANILLO ORBITAL ROTO", x: 81, y: 69, texture: "broken_ring.png", scale: 3.8, primary: true },
      { id: "scanner_array", name: "SCANNER ARRAY", x: 105, y: 43, texture: "scanner_array.png", scale: 2.8, secondary: true },
    ],
    gravity: [
      { id: "mechanical_ring", type: "tangential", x: 81, y: 69, radius: 34, strength: 0.26 },
      { id: "mechanical_well", type: "attract", x: 112, y: 65, radius: 27, strength: 0.17 },
    ],
    gate: { x: 92, y: 94, to: 2, name: "FRONTERA FRACTURADA" },
    backGate: { x: 92, y: 29, to: 0, name: "RETORNO OCEANIC" },
    audio: "ambient_mechanical_45s.wav",
    palette: { primary: "#ac82ff", secondary: "#ed55ff" },
  },
  {
    id: "dark_crater",
    name: "DARK CRATER",
    stage: 2,
    center: { x: -96, y: 128 },
    bounds: { minX: -134, maxX: -58, minY: 94, maxY: 162 },
    hero: { texture: "assets/runtime/gravedad-zero/planets/planet_dark_crater_albedo.png", x: -116, y: 132, scale: 9.2 },
    landmarks: [
      { id: "synthetic_rift", name: "SYNTHETIC RIFT", x: -84, y: 140, texture: "synthetic_rift.png", scale: 4.0, primary: true },
      { id: "gravity_tower", name: "GRAVITY TOWER", x: -108, y: 108, texture: "gravity_tower.png", scale: 3.0, secondary: true },
    ],
    gravity: [
      { id: "synthetic_rift", type: "pulse", x: -84, y: 140, radius: 32, strength: 0.31, period: 5.2 },
      { id: "synthetic_shift", type: "unstable", x: -116, y: 132, radius: 30, strength: 0.22, period: 7.4 },
      { id: "crater_repel", type: "repel", x: -104, y: 116, radius: 20, strength: 0.18 },
    ],
    gate: { x: -96, y: 160, to: 3, name: "RIFT ESTABILIZADO" },
    backGate: { x: -96, y: 96, to: 1, name: "RETORNO MECHANICAL" },
    audio: "ambient_dark_crater_45s.wav",
    palette: { primary: "#ff5bdc", secondary: "#7a55ff" },
  },
  {
    id: "relic_core",
    name: "RELIC CORE",
    stage: 3,
    center: { x: 18, y: 196 },
    bounds: { minX: -18, maxX: 54, minY: 168, maxY: 226 },
    hero: { texture: "assets/runtime/gravedad-zero/planets/planet_nebula_core_albedo.png", x: 36, y: 203, scale: 8.0 },
    landmarks: [
      { id: "relic_portal", name: "PORTAL DE RELIQUIA", x: 18, y: 196, texture: "relic_portal.png", scale: 4.4, primary: true },
      { id: "gravity_node_a", name: "NODO ATTRACT", x: 7, y: 191, texture: "gravity_node.png", scale: 2.0, secondary: true },
      { id: "gravity_node_b", name: "NODO REPEL", x: 29, y: 191, texture: "gravity_node.png", scale: 2.0, secondary: true },
      { id: "gravity_node_c", name: "NODO PULSE", x: 18, y: 207, texture: "gravity_node.png", scale: 2.0, secondary: true },
    ],
    gravity: [
      { id: "relic_node_a", type: "attract", x: 7, y: 191, radius: 19, strength: 0.22 },
      { id: "relic_node_b", type: "repel", x: 29, y: 191, radius: 19, strength: 0.22 },
      { id: "relic_node_c", type: "pulse", x: 18, y: 207, radius: 21, strength: 0.27, period: 4.6 },
    ],
    backGate: { x: 18, y: 170, to: 2, name: "RETORNO DARK CRATER" },
    audio: "ambient_relic_core_45s.wav",
    palette: { primary: "#f2efff", secondary: "#bd62ff" },
  },
];

export function scenarioForStage(index) {
  return SCENARIOS[Math.max(0, Math.min(SCENARIOS.length - 1, index | 0))];
}
