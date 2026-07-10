export const COMPOSITION_PROFILES = [
  {
    id: "oceanic",
    heroScale: 1.18,
    heroOpacity: 0.94,
    heroRotationSpeed: 0.0032,
    moonOffset: { x: 16, y: 24 },
    moonScale: 0.27,
    landmarkScale: 0.62,
    landmarkFloat: 0.035,
    atmosphere: 0x54e7ff,
    atmosphereOpacity: 0.20,
    safeRadius: 0.42,
  },
  {
    id: "mechanical",
    heroScale: 1.10,
    heroOpacity: 0.93,
    heroRotationSpeed: -0.0026,
    moonOffset: { x: -20, y: 22 },
    moonScale: 0.24,
    landmarkScale: 0.68,
    landmarkFloat: 0.030,
    atmosphere: 0xb377ff,
    atmosphereOpacity: 0.17,
    safeRadius: 0.44,
  },
  {
    id: "synthetic",
    heroScale: 1.16,
    heroOpacity: 0.92,
    heroRotationSpeed: 0.0038,
    moonOffset: { x: 21, y: -18 },
    moonScale: 0.25,
    landmarkScale: 0.70,
    landmarkFloat: 0.045,
    atmosphere: 0xff58dc,
    atmosphereOpacity: 0.20,
    safeRadius: 0.46,
  },
  {
    id: "relic",
    heroScale: 1.04,
    heroOpacity: 0.91,
    heroRotationSpeed: -0.0022,
    moonOffset: { x: -18, y: 18 },
    moonScale: 0.22,
    landmarkScale: 0.76,
    landmarkFloat: 0.028,
    atmosphere: 0xe8e7ff,
    atmosphereOpacity: 0.18,
    safeRadius: 0.48,
  },
];

export const COMPOSITION_RECOVERY = {
  legacyRescanSeconds: 0.75,
  transitionRevealRadius: 94,
  transitionDifferenceWindow: 54,
  landmarkVisibleRadius: 72,
  moonVisibleRadius: 82,
  actorAstronautScale: 1.24,
  actorAstronautScaleInShipMode: 1.18,
  gravityIndicatorSize: 78,
};

export function compositionProfile(index) {
  return COMPOSITION_PROFILES[Math.max(0, Math.min(COMPOSITION_PROFILES.length - 1, index))];
}
