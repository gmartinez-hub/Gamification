export const VISUAL_PACK_TUNING = {
  ship: {
    maxRoll: 0.12,
    maxPitch: 0.07,
    spring: 9.5,
    emissiveIntensity: 0.48,
  },
  astronaut: {
    maxTilt: 0.10,
    spring: 8.0,
    emissiveIntensity: 0.30,
  },
  thruster: {
    normal: { core: 0.28, cone: 0.18, wake: 0.055, distortion: 0 },
    turbo: { core: 0.62, cone: 0.46, wake: 0.24, distortion: 0.10 },
    warp: { core: 0.82, cone: 0.66, wake: 0.42, distortion: 0.18 },
  },
  gem: {
    rotationSpeed: 0.22,
    shellCounterRotation: -0.14,
    pulseSpeed: 1.8,
    maxParticles: 24,
  },
  budgets: {
    maxVisualParticles: 120,
    maxDynamicPointLights: 3,
    maxProjectileLights: 1,
  },
} as const;
