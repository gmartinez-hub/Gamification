// Pseudocode only.

const TARGET_MOTION_PROFILES = [
  { name: "intro_drift", orbitSpeed: [0.22, 0.38], orbitRadius: [0.08, 0.18], driftSpeed: [0.02, 0.05], chaseRequired: false, predictionLead: 0.10 },
  { name: "fractured_orbit", orbitSpeed: [0.42, 0.72], orbitRadius: [0.18, 0.36], driftSpeed: [0.06, 0.12], chaseRequired: true, predictionLead: 0.18 },
  { name: "unstable_core", orbitSpeed: [0.72, 1.12], orbitRadius: [0.26, 0.52], driftSpeed: [0.10, 0.20], chaseRequired: true, predictionLead: 0.26 },
];

function updateMissionTargetOrbit(target, delta, elapsed) {
  const m = target.userData.motion;
  const prev = target.position.clone();
  const orbit = new THREE.Vector2(Math.cos(elapsed * m.orbitSpeed + m.phase) * m.orbitRadius.x, Math.sin(elapsed * m.orbitSpeed * 0.82 + m.phase) * m.orbitRadius.y);
  target.position.x = m.anchor.x + orbit.x + m.drift.x * elapsed;
  target.position.y = m.anchor.y + orbit.y + m.drift.y * elapsed;
  target.userData.velocity2D = new THREE.Vector2(target.position.x - prev.x, target.position.y - prev.y).multiplyScalar(1 / Math.max(delta, 0.001));
}
