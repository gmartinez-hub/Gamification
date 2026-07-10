export const V4_BASELINE_SHA = "e479b52fca72ab7e2816d4620309095535a397ae";

export const REGIONS = [
  {
    id: "oceanic",
    stage: 0,
    name: "OCEANIC FRONTIER",
    center: { x: 0, y: -8 },
    hero: { x: 52, y: 2, texture: "/assets/runtime/space/planet_ocean_cyber.png", scale: 1.18 },
    landmark: { id: "fractured_beacon", name: "BALIZA FRACTURADA", x: -28, y: 3, kind: "beacon" },
    light: { primary: "#5ce9ff", secondary: "#315bff" },
  },
  {
    id: "mechanical",
    stage: 1,
    name: "MECHANICAL NETWORK",
    center: { x: 92, y: 60 },
    hero: { x: 145, y: 68, texture: "/assets/runtime/space/planet_tech_white.png", scale: 1.10 },
    landmark: { id: "broken_ring", name: "ANILLO ORBITAL ROTO", x: 63, y: 70, kind: "ring" },
    light: { primary: "#ac82ff", secondary: "#ed55ff" },
  },
  {
    id: "synthetic",
    stage: 2,
    name: "SYNTHETIC DARK ZONE",
    center: { x: -96, y: 128 },
    hero: { x: -149, y: 138, texture: "/assets/runtime/space/planet_dark_magenta.png", scale: 1.16 },
    landmark: { id: "synthetic_rift", name: "RIFT SINTÉTICO", x: -65, y: 141, kind: "rift" },
    light: { primary: "#ff5bdc", secondary: "#7a55ff" },
  },
  {
    id: "relic",
    stage: 3,
    name: "RELIC ANOMALY",
    center: { x: 18, y: 196 },
    hero: { x: 68, y: 208, texture: "/assets/runtime/space/planet_ringed_white.png", scale: 1.04 },
    landmark: { id: "relic_portal", name: "PORTAL DE RELIQUIA", x: 18, y: 196, kind: "portal" },
    light: { primary: "#f2efff", secondary: "#bd62ff" },
  },
];

export const ROUTES = [
  { from: 0, to: 1, unlockGem: 1, name: "CORREDOR ORBITAL" },
  { from: 1, to: 2, unlockGem: 2, name: "FRONTERA FRACTURADA" },
  { from: 2, to: 3, unlockGem: 3, name: "RIFT ESTABILIZADO" },
];

export const GRAVITY_FIELDS = [
  { id: "ocean_attractor", stage: 0, type: "attract", x: 52, y: 2, radius: 64, strength: 0.15 },
  { id: "ocean_current", stage: 0, type: "current", x: 18, y: 13, radius: 34, strength: 0.075, direction: { x: 0.34, y: 0.94 } },
  { id: "mechanical_ring", stage: 1, type: "tangential", x: 63, y: 70, radius: 36, strength: 0.26 },
  { id: "mechanical_well", stage: 1, type: "attract", x: 145, y: 68, radius: 59, strength: 0.16 },
  { id: "synthetic_rift", stage: 2, type: "pulse", x: -65, y: 141, radius: 34, strength: 0.31, period: 5.2 },
  { id: "synthetic_shift", stage: 2, type: "unstable", x: -149, y: 138, radius: 61, strength: 0.20, period: 7.4 },
  { id: "relic_node_a", stage: 3, type: "attract", x: 7, y: 191, radius: 19, strength: 0.22 },
  { id: "relic_node_b", stage: 3, type: "repel", x: 29, y: 191, radius: 19, strength: 0.22 },
  { id: "relic_node_c", stage: 3, type: "pulse", x: 18, y: 207, radius: 21, strength: 0.27, period: 4.6 },
];

export const V4_TUNING = {
  worldToScreen: 0.021,
  planetVisibilityRadius: 126,
  landmarkVisibilityRadius: 112,
  maxHeroPlanets: 2,
  astronautMaxDistance: 0.60,
  astronautInfluence: 1.35,
  gravityMaxForce: 0.42,
  stabilizerDuration: 2.5,
  stabilizerCooldown: 8.0,
  companionNormalCooldown: 10,
  mapKey: "m",
  scannerKey: "e",
  stabilizerCode: "Space",
};

export const COMPANION_MESSAGES = {
  gravity_first: { priority: 4, face: "gravity", text: "CAMPO GRAVITACIONAL DETECTADO", detail: "El arco cyan indica hacia dónde vas a derivar." },
  stabilizer_first: { priority: 3, face: "scan", text: "ESTABILIZADOR DISPONIBLE", detail: "Presioná ESPACIO para reducir drift y repulsión." },
  damage_first: { priority: 6, face: "damage", text: "IMPACTO AMBIENTAL", detail: "Los meteoritos pueden dañar el escudo y alterar tu trayectoria." },
  shield_low: { priority: 8, face: "critical", text: "ESCUDO CRÍTICO", detail: "Evitá el cinturón mientras el escudo se recupera." },
  scan_first: { priority: 3, face: "scan", text: "ESCÁNER ACTIVO", detail: "Mantené E cerca de una señal para revelar el objetivo." },
  region_mechanical: { priority: 5, face: "alert", text: "MECHANICAL NETWORK", detail: "Las órbitas están fracturadas. Usá la gravedad para ganar velocidad." },
  region_synthetic: { priority: 5, face: "gravity", text: "SYNTHETIC DARK ZONE", detail: "Los vectores cambian. Estabilizá antes de apuntar." },
  region_relic: { priority: 6, face: "gem", text: "RELIC ANOMALY", detail: "Las tres gemas pueden estabilizar el colapso." },
  gem_ready: { priority: 7, face: "gem", text: "GEMA MATERIALIZADA", detail: "Acercate y activala para desbloquear la siguiente región." },
  route_unlocked: { priority: 7, face: "success", text: "FRONTERA DESBLOQUEADA", detail: "Abrí el mapa con M para consultar el próximo rumbo." },
  slingshot: { priority: 4, face: "gravity", text: "SLINGSHOT DISPONIBLE", detail: "Entrá de forma lateral y salí con turbo." },
  map_first: { priority: 2, face: "idle", text: "MAPA HOLOGRÁFICO", detail: "Muestra regiones, landmarks y rutas ya descubiertas." },
};
