export const COMBAT_TUNING = {
  aimDurations: {
    minor: [1.8, 2.2],
    major: [5.0, 6.0],
    final: [7.5, 8.0],
  },
  shield: {
    max: 100,
    invulnerabilitySeconds: 0.7,
    recoveryDelaySeconds: 3,
    recoveryPerSecond: 10,
    damage: {
      smallMeteor: [2, 3],
      mediumMeteor: [4, 6],
      largeMeteor: [8, 8],
    },
  },
  repulsion: {
    stage1: 0.18,
    stage2: 0.34,
    stage3: 0.52,
    clamp: 0.70,
  },
} as const;
