export const COLORS = {
  cyan: 0x66eaff,
  magenta: 0xed59ff,
  violet: 0x855cff,
  white: 0xf4f7ff,
  dark: 0x05091b,
};

export const REGIONS = [
  {
    id: "oceanic",
    name: "OCEANIC FRONTIER",
    center: { x: 0, y: 0 },
    hero: { x: 360, y: 60, texture: "/assets/runtime/space/planet_ocean_cyber.png", scale: 1.18 },
    secondary: { x: 145, y: 245, texture: "/assets/runtime/space-animated/planet_ocean/01.png", scale: 0.28 },
    landmark: { id: "fractured_beacon", kind: "beacon", name: "BALIZA FRACTURADA", x: -260, y: 65 },
    gravity: [
      { type: "attract", x: 360, y: 60, radius: 460, strength: 18 },
      { type: "current", x: 80, y: 80, radius: 300, strength: 9, direction: { x: 0.34, y: 0.94 } },
    ],
    environment: ["ocean_eclipse", "ocean_current", "ocean_fragments"],
    mission: { small: 3, coreHp: 3 },
  },
  {
    id: "mechanical",
    name: "MECHANICAL NETWORK",
    center: { x: 900, y: 260 },
    hero: { x: 1210, y: 320, texture: "/assets/runtime/space/planet_tech_white.png", scale: 1.12 },
    secondary: { x: 1010, y: 520, texture: "/assets/runtime/space-animated/planet_tech/01.png", scale: 0.25 },
    landmark: { id: "broken_ring", kind: "ring", name: "ANILLO ORBITAL ROTO", x: 720, y: 350 },
    auxiliary: { id: "partial_station", kind: "station", name: "ESTACIÓN PARCIAL", x: 1040, y: 160 },
    gravity: [
      { type: "tangential", x: 720, y: 350, radius: 390, strength: 24 },
      { type: "attract", x: 1210, y: 320, radius: 440, strength: 17 },
    ],
    environment: ["mechanical_pulse", "mechanical_belt", "mechanical_station"],
    mission: { small: 4, coreHp: 4 },
  },
  {
    id: "synthetic",
    name: "SYNTHETIC DARK ZONE",
    center: { x: -650, y: 1200 },
    hero: { x: -980, y: 1280, texture: "/assets/runtime/space/planet_dark_magenta.png", scale: 1.16 },
    secondary: { x: -520, y: 1430, texture: "/assets/runtime/space-animated/planet_dark/01.png", scale: 0.25 },
    landmark: { id: "synthetic_rift", kind: "rift", name: "RIFT SINTÉTICO", x: -410, y: 1290 },
    auxiliary: { id: "gravity_node", kind: "node", name: "NODO GRAVITACIONAL", x: -760, y: 1050 },
    gravity: [
      { type: "pulse", x: -410, y: 1290, radius: 400, strength: 29, period: 5.2 },
      { type: "unstable", x: -980, y: 1280, radius: 440, strength: 21, period: 7.4 },
    ],
    environment: ["synthetic_interference", "synthetic_shift", "synthetic_eject"],
    mission: { small: 4, coreHp: 5 },
  },
  {
    id: "relic",
    name: "RELIC ANOMALY",
    center: { x: 100, y: 1950 },
    hero: { x: 430, y: 2050, texture: "/assets/runtime/space/planet_ringed_white.png", scale: 1.03 },
    secondary: { x: -120, y: 2150, texture: "/assets/runtime/space-animated/planet_dark/03.png", scale: 0.22 },
    landmark: { id: "relic_portal", kind: "portal", name: "PORTAL DE RELIQUIA", x: 100, y: 1950 },
    gravity: [
      { type: "attract", x: 0, y: 1900, radius: 260, strength: 22 },
      { type: "repel", x: 200, y: 1900, radius: 260, strength: 22 },
      { type: "pulse", x: 100, y: 2070, radius: 280, strength: 27, period: 4.6 },
    ],
    environment: ["relic_collapse"],
    mission: { small: 0, coreHp: 0 },
    finalNodes: [
      { id: "node_a", x: -20, y: 1890 },
      { id: "node_b", x: 220, y: 1890 },
      { id: "node_c", x: 100, y: 2090 },
    ],
  },
];

export const ROUTES = [
  { from: 0, to: 1, requiredGems: 1 },
  { from: 1, to: 2, requiredGems: 2 },
  { from: 2, to: 3, requiredGems: 3 },
];

export const WORLD = {
  unitsPerScene: 175,
  baseSpeed: 52,
  turboMultiplier: 2.25,
  maxAstronautDistanceScene: 0.68,
  regionEnterRadius: 360,
  planetVisibleRadius: 650,
  landmarkVisibleRadius: 500,
  meteorVisibleRadius: 650,
  scanRadius: 175,
  interactionRadius: 75,
};

export const STAGE_NAMES = ["stage1", "stage2", "stage3"];

export const EVENT_DEFS = {
  ocean_eclipse: { title: "ECLIPSE GRAVITACIONAL", detail: "La señal permanece visible aunque baje la iluminación.", duration: 9, className: "eclipse" },
  ocean_current: { title: "CORRIENTE GRAVITACIONAL", detail: "Corregí el rumbo o aprovechá el impulso.", duration: 10, className: "current", force: { x: 8, y: 12 } },
  ocean_fragments: { title: "LLUVIA DE FRAGMENTOS", detail: "Evitá las trayectorias marcadas.", duration: 8, className: "fragments" },
  mechanical_pulse: { title: "PULSO ORBITAL", detail: "La red mecánica libera una onda de repulsión.", duration: 8, className: "pulse", force: { x: -12, y: 6 } },
  mechanical_belt: { title: "CINTURÓN EN DESPLAZAMIENTO", detail: "Los fragmentos cambian de órbita.", duration: 11, className: "fragments", force: { x: 9, y: -4 } },
  mechanical_station: { title: "ESTACIÓN ACTIVADA", detail: "El scanner obtiene alcance adicional.", duration: 9, className: "station", bonus: "scanner" },
  synthetic_interference: { title: "INTERFERENCIA SINTÉTICA", detail: "Las señales falsas alteran el rumbo.", duration: 10, className: "interference" },
  synthetic_shift: { title: "CAMBIO DE VECTOR", detail: "Estabilizá antes de apuntar.", duration: 10, className: "shift", rotatingForce: 14 },
  synthetic_eject: { title: "EXPULSIÓN DEL RIFT", detail: "Una onda de repulsión cruza el sector.", duration: 9, className: "pulse", force: { x: -8, y: -14 } },
  relic_collapse: { title: "COLAPSO DE RELIQUIA", detail: "Estabilizá los tres nodos.", duration: 12, className: "relic", rotatingForce: 16 },
};

export const COMPANION = {
  start: ["SISTEMAS ONLINE", "Usá WASD o las flechas para navegar."],
  scan: ["SEÑAL DETECTADA", "Mantené E cerca del objetivo para revelarlo."],
  stabilize: ["DERIVA GRAVITACIONAL", "Presioná ESPACIO para estabilizar."],
  turbo: ["RUTA ABIERTA", "Usá F para activar el turbo."],
  map: ["MAPA HOLOGRÁFICO", "Presioná M para consultar regiones y rutas."],
  damage: ["IMPACTO AMBIENTAL", "Los meteoritos dañan el escudo y empujan."],
  lowShield: ["ESCUDO CRÍTICO", "Alejate del cinturón mientras se recupera."],
  help: ["RUMBO SUGERIDO", "Te marco el próximo landmark."],
  core: ["NÚCLEO REVELADO", "Volvé a la nave y rompelo con el disparo principal."],
  gem: ["GEMA MATERIALIZADA", "Acercate y mantené E para sincronizarla."],
  route: ["FRONTERA DESBLOQUEADA", "Navegá físicamente hacia la siguiente región."],
  final: ["COLAPSO FINAL", "Activá los tres nodos antes del disparo final."],
};
