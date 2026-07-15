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
    normal: { core: 0.24, cone: 0.13, wake: 0, distortion: 0 },
    turbo: { core: 0.58, cone: 0.38, wake: 0, distortion: 0 },
    warp: { core: 0.76, cone: 0.54, wake: 0, distortion: 0 },
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
