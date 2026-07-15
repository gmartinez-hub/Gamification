import * as THREE from "../../vendor/three.module.js";

function metal(accent, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color: 0xa9bac7,
    emissive: accent,
    emissiveIntensity: 0.10,
    metalness: 0.76,
    roughness: 0.30,
    transparent: opacity < 1,
    opacity,
  });
}

function darkMetal(accent, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color: 0x263545,
    emissive: accent,
    emissiveIntensity: 0.18,
    metalness: 0.82,
    roughness: 0.24,
    transparent: opacity < 1,
    opacity,
  });
}

function energy(color, opacity = 0.72) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function register(group, object, role, options = {}) {
  object.userData.landmarkRole = role;
  object.userData.baseOpacity = object.material?.opacity ?? 1;
  object.userData.baseScale = object.scale.clone();
  object.userData.basePosition = object.position.clone();
  Object.assign(object.userData, options);
  group.userData.parts.push(object);
  group.add(object);
  return object;
}

function addEncounterNodes(group, accent, id) {
  const layouts = {
    fractured_beacon: [[-0.62, -0.30], [0.08, 0.50], [0.66, 0.30]],
    orbital_ruins: [[-0.62, 0.22], [0.03, -0.42], [0.64, 0.18]],
    broken_ring: [[-0.68, -0.34], [0.02, 0.72], [0.70, -0.30]],
    scanner_array: [[-0.57, 0.62], [0, 0.37], [0.57, 0.62]],
    synthetic_rift: [[-0.44, -0.58], [0.40, 0.02], [-0.38, 0.58]],
    gravity_tower: [[-0.38, -0.54], [0.38, -0.06], [0, 0.74]],
  };
  const positions = layouts[id];
  if (!positions) return;
  positions.forEach(([x, y], index) => {
    mesh(
      group,
      new THREE.SphereGeometry(0.075, 20, 12),
      energy(accent, 0.12),
      "encounter-node",
      [x, y, 0.18],
      [0, 0, 0],
      [1, 1, 0.62],
      { encounterNode: index, pulse: true },
    );
  });
}

function mesh(group, geometry, material, role, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], options = {}) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  return register(group, object, role, options);
}

function arc(group, radius, tube, start, length, material, role, options = {}) {
  return mesh(
    group,
    new THREE.TorusGeometry(radius, tube, 10, 64, length),
    material,
    role,
    [0, 0, options.z || 0],
    [0, 0, start],
    options.scale || [1, 1, 1],
    options,
  );
}

function addFloatingDebris(group, accent, count, radius, phase = 0) {
  for (let index = 0; index < count; index += 1) {
    const angle = phase + (index / count) * Math.PI * 2;
    const distance = radius * (0.88 + (index % 3) * 0.12);
    mesh(
      group,
      new THREE.IcosahedronGeometry(0.055 + (index % 2) * 0.018, 1),
      darkMetal(accent, 0.92),
      "debris",
      [Math.cos(angle) * distance, Math.sin(angle) * distance * 0.72, (index % 3) * 0.025],
      [angle * 0.7, angle * 0.4, angle],
      [1, 1, 1],
      { orbitRadius: distance, orbitPhase: angle, orbitSpeed: (index % 2 ? -1 : 1) * (0.10 + index * 0.012) },
    );
  }
}

function addFracturedBeacon(group, accent) {
  // A broken orbital transponder: compact hub, asymmetric antenna arms and
  // separated solar vanes. Its silhouette must never read as a navigation arrow.
  mesh(group, new THREE.DodecahedronGeometry(0.30, 1), darkMetal(accent), "structure", [-0.06, 0, 0.02], [0.28, 0.18, -0.12], [1.16, 0.86, 0.72]);
  mesh(group, new THREE.CylinderGeometry(0.075, 0.075, 0.72, 10), metal(accent), "structure", [0.30, 0.12, 0.01], [0, 0, -1.14]);
  mesh(group, new THREE.CylinderGeometry(0.055, 0.055, 0.50, 10), metal(accent), "structure", [-0.34, 0.25, 0], [0, 0, 0.74]);
  mesh(group, new THREE.BoxGeometry(0.52, 0.25, 0.08), darkMetal(accent), "structure", [0.61, 0.38, -0.01], [0.08, -0.10, -0.20]);
  mesh(group, new THREE.BoxGeometry(0.38, 0.22, 0.08), darkMetal(accent), "structure", [-0.57, 0.46, -0.01], [-0.06, 0.12, 0.26]);
  mesh(group, new THREE.ConeGeometry(0.28, 0.16, 32, 1, true), metal(accent), "dish", [-0.55, -0.28, 0.04], [Math.PI / 2, 0, -0.72], [1, 1, 0.58], { scanSweep: -1 });
  mesh(group, new THREE.OctahedronGeometry(0.17, 1), energy(accent, 0.92), "core", [-0.04, 0.01, 0.15], [0, 0, 0], [1, 1.18, 0.68], { spin: -0.38 });
  arc(group, 0.54, 0.020, -0.58, Math.PI * 1.18, energy(accent, 0.42), "signal", { z: 0.07, spin: 0.18, scale: [1.12, 0.70, 1] });
  arc(group, 0.78, 0.013, 0.84, Math.PI * 0.88, energy(accent, 0.22), "signal", { z: 0.03, spin: -0.12, scale: [1.08, 0.66, 1] });
  addFloatingDebris(group, accent, 5, 0.92, 0.4);
}

function addOrbitalRuins(group, accent) {
  // A recognizable derelict station rather than another abstract ring.
  mesh(group, new THREE.BoxGeometry(0.82, 0.24, 0.20), darkMetal(accent), "structure", [0, 0, 0.01], [0.08, -0.10, -0.08]);
  mesh(group, new THREE.CylinderGeometry(0.17, 0.21, 0.62, 12), metal(accent), "structure", [-0.46, 0.03, 0.02], [0, 0, Math.PI * 0.5]);
  mesh(group, new THREE.CylinderGeometry(0.14, 0.18, 0.46, 12), metal(accent), "structure", [0.48, -0.12, 0.02], [0, 0, Math.PI * 0.5]);
  mesh(group, new THREE.BoxGeometry(0.78, 0.075, 0.08), metal(accent), "structure", [0.02, 0.32, 0], [0, 0, -0.14]);
  mesh(group, new THREE.BoxGeometry(0.50, 0.28, 0.05), darkMetal(accent), "structure", [-0.42, 0.50, -0.01], [0.04, 0.06, -0.20]);
  mesh(group, new THREE.BoxGeometry(0.36, 0.24, 0.05), darkMetal(accent), "structure", [0.46, 0.46, -0.01], [-0.04, -0.06, 0.24]);
  mesh(group, new THREE.OctahedronGeometry(0.13, 1), energy(accent, 0.62), "core", [0.03, 0.02, 0.15], [0, 0, 0], [1, 1, 0.7], { spin: 0.42 });
  arc(group, 0.38, 0.012, 0.20, Math.PI * 1.45, energy(accent, 0.22), "signal", { z: 0.10, spin: -0.12, scale: [1, 0.46, 1] });
  addFloatingDebris(group, accent, 7, 1.02, 0.1);
}

function addBrokenRing(group, accent) {
  arc(group, 0.78, 0.12, 0.10, 1.52, metal(accent), "structure", { z: 0.01, spin: 0.055 });
  arc(group, 0.78, 0.12, 2.24, 1.20, darkMetal(accent), "structure", { z: 0.02, spin: 0.055 });
  arc(group, 0.78, 0.12, 4.02, 1.56, metal(accent), "structure", { z: 0.03, spin: 0.055 });
  arc(group, 0.58, 0.022, 0, Math.PI * 2, energy(accent, 0.62), "signal", { z: 0.08, spin: -0.22, scale: [1, 0.72, 1] });
  mesh(group, new THREE.IcosahedronGeometry(0.24, 2), darkMetal(accent), "structure", [0, 0, 0.03]);
  mesh(group, new THREE.OctahedronGeometry(0.15, 1), energy(accent, 0.96), "core", [0, 0, 0.14], [0, 0, 0], [1, 1.25, 0.7], { spin: 0.48 });
  for (const angle of [-2.35, -0.72, 1.42]) {
    mesh(
      group,
      new THREE.BoxGeometry(0.18, 0.42, 0.16),
      darkMetal(accent),
      "structure",
      [Math.cos(angle) * 0.84, Math.sin(angle) * 0.84, 0.01],
      [0, 0, angle - Math.PI * 0.5],
    );
  }
  addFloatingDebris(group, accent, 5, 1.04, 0.8);
}

function addScannerArray(group, accent) {
  mesh(group, new THREE.CylinderGeometry(0.18, 0.28, 1.22, 12), darkMetal(accent), "structure", [0, -0.05, 0]);
  mesh(group, new THREE.BoxGeometry(1.10, 0.13, 0.18), metal(accent), "structure", [0, 0.15, 0.02]);
  for (const side of [-1, 1]) {
    mesh(group, new THREE.CylinderGeometry(0.05, 0.12, 0.42, 12), metal(accent), "structure", [side * 0.48, 0.35, 0.02], [0, 0, side * -0.22]);
    mesh(group, new THREE.ConeGeometry(0.28, 0.18, 32, 1, true), metal(accent), "dish", [side * 0.58, 0.63, 0.03], [Math.PI / 2, 0, side * 0.16], [1, 1, 0.55], { scanSweep: side });
  }
  mesh(group, new THREE.SphereGeometry(0.16, 24, 16), energy(accent, 0.94), "core", [0, 0.38, 0.12], [0, 0, 0], [1, 1, 0.7], { spin: 0.55 });
  arc(group, 0.70, 0.020, 0, Math.PI * 2, energy(accent, 0.34), "signal", { z: 0.08, spin: -0.32, scale: [1, 0.28, 1] });
  arc(group, 0.95, 0.012, 0, Math.PI * 2, energy(accent, 0.18), "signal", { z: 0.06, spin: 0.20, scale: [1, 0.18, 1] });
}

function addSyntheticRift(group, accent) {
  arc(group, 0.72, 0.055, 0.22, 2.18, metal(accent), "structure", { z: 0.02, spin: 0.08, scale: [0.70, 1.28, 1] });
  arc(group, 0.72, 0.055, 3.38, 2.12, darkMetal(accent), "structure", { z: 0.03, spin: -0.06, scale: [0.70, 1.28, 1] });
  arc(group, 0.50, 0.024, 0, Math.PI * 2, energy(accent, 0.80), "signal", { z: 0.10, spin: -0.34, scale: [0.54, 1.34, 1] });
  mesh(group, new THREE.OctahedronGeometry(0.23, 1), energy(0x6feaff, 0.82), "core", [0, 0, 0.13], [0, 0, 0], [0.58, 1.65, 0.65], { spin: 0.48 });
  addFloatingDebris(group, accent, 7, 1.04, 0.2);
}

function addGravityTower(group, accent) {
  mesh(group, new THREE.CylinderGeometry(0.15, 0.34, 1.42, 12), darkMetal(accent), "structure", [0, -0.10, 0]);
  mesh(group, new THREE.CylinderGeometry(0.34, 0.42, 0.18, 12), metal(accent), "structure", [0, -0.84, 0]);
  for (const y of [-0.34, 0.10, 0.48]) {
    arc(group, 0.46 - y * 0.08, 0.025, 0, Math.PI * 2, energy(accent, 0.36), "signal", { z: 0.06, spin: y < 0 ? -0.22 : 0.28, scale: [1, 0.34, 1] }).position.y = y;
  }
  mesh(group, new THREE.OctahedronGeometry(0.22, 1), energy(accent, 0.94), "core", [0, 0.78, 0.11], [0, 0, 0], [1, 1.34, 0.72], { spin: -0.44 });
  arc(group, 0.62, 0.018, 0.25, Math.PI * 1.55, energy(0x7beaff, 0.30), "signal", { z: 0.05, spin: 0.16 });
}

function addRelicPortal(group, accent, textures) {
  arc(group, 0.90, 0.085, 0.10, 2.54, metal(accent), "structure", { z: 0.01, spin: 0.06 });
  arc(group, 0.90, 0.085, 3.30, 2.52, darkMetal(accent), "structure", { z: 0.02, spin: 0.06 });
  arc(group, 0.72, 0.025, 0, Math.PI * 2, energy(0x72eaff, 0.56), "signal", { z: 0.08, spin: -0.24 });
  arc(group, 0.56, 0.018, 0, Math.PI * 2, energy(0xff6fe8, 0.48), "signal", { z: 0.10, spin: 0.34, scale: [0.82, 1, 1] });
  if (textures?.relicCore) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.relicCore,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }));
    sprite.scale.set(1.18, 1.18, 1);
    sprite.position.z = 0.16;
    register(group, sprite, "core", { pulse: true });
  } else {
    mesh(group, new THREE.OctahedronGeometry(0.32, 1), energy(accent, 0.92), "core", [0, 0, 0.12], [0, 0, 0], [0.74, 1.48, 0.72], { spin: 0.38 });
  }
}

function addGravityNode(group, accent) {
  mesh(group, new THREE.IcosahedronGeometry(0.27, 1), darkMetal(accent), "structure", [0, 0, 0.02], [0.2, 0.3, 0.1], [0.82, 1.08, 0.72]);
  mesh(group, new THREE.OctahedronGeometry(0.20, 1), energy(accent, 0.94), "core", [0, 0, 0.14], [0, 0, 0], [0.78, 1.34, 0.66], { spin: 0.52, pulse: true });
  arc(group, 0.46, 0.026, 0.18, Math.PI * 1.44, metal(accent), "structure", { z: 0.03, spin: 0.12, scale: [1, 0.68, 1] });
  arc(group, 0.46, 0.026, 3.36, Math.PI * 1.34, darkMetal(accent), "structure", { z: 0.04, spin: 0.12, scale: [1, 0.68, 1] });
  arc(group, 0.59, 0.015, 0, Math.PI * 2, energy(accent, 0.44), "signal", { z: 0.09, spin: -0.34, scale: [1, 0.46, 1] });
  addFloatingDebris(group, accent, 3, 0.70, 0.5);
}

export function createAuthoredLandmarkVisual(id, accentInput, textures = {}) {
  const accent = new THREE.Color(accentInput);
  const group = new THREE.Group();
  group.name = `PREMIUM_LANDMARK_${id}`;
  group.userData.parts = [];
  group.userData.activation = 0;
  group.userData.activationTarget = 0;

  if (id === "fractured_beacon") addFracturedBeacon(group, accent);
  else if (id === "orbital_ruins") addOrbitalRuins(group, accent);
  else if (id === "broken_ring") addBrokenRing(group, accent);
  else if (id === "scanner_array") addScannerArray(group, accent);
  else if (id === "synthetic_rift") addSyntheticRift(group, accent);
  else if (id === "gravity_tower") addGravityTower(group, accent);
  else if (id === "relic_portal") addRelicPortal(group, accent, textures);
  else addGravityNode(group, accent);

  addEncounterNodes(group, accent, id);

  return group;
}

export function setAuthoredLandmarkActive(group, active) {
  if (!group) return;
  group.userData.activationTarget = active ? 1 : 0;
}

export function updateAuthoredLandmarkVisual(group, delta, elapsed, scanProgress = 0) {
  if (!group?.userData?.parts) return;
  const target = Math.max(group.userData.activationTarget || 0, scanProgress || 0);
  group.userData.activation = THREE.MathUtils.lerp(
    group.userData.activation || 0,
    target,
    1 - Math.pow(0.004, delta),
  );
  const activation = group.userData.activation;
  for (const part of group.userData.parts) {
    const data = part.userData;
    if (data.spin) part.rotation.z += delta * data.spin * (1 + activation * 1.35);
    if (data.orbitRadius) {
      const angle = data.orbitPhase + elapsed * data.orbitSpeed;
      part.position.x = Math.cos(angle) * data.orbitRadius;
      part.position.y = Math.sin(angle) * data.orbitRadius * 0.72;
      part.rotation.z += delta * data.orbitSpeed * 1.7;
    }
    if (data.scanSweep) part.rotation.z = data.scanSweep * 0.16 + Math.sin(elapsed * 0.72) * 0.22;
    if (data.pulse) {
      const pulse = 0.96 + Math.sin(elapsed * 2.5) * (0.025 + activation * 0.035);
      part.scale.copy(data.baseScale).multiplyScalar(pulse);
    }
    if (data.encounterNode !== undefined) {
      const threshold = (data.encounterNode + 1) / 3;
      const nodeCharge = THREE.MathUtils.smoothstep(scanProgress || activation, threshold - 0.30, threshold);
      part.material.opacity = 0.10 + nodeCharge * 0.82;
      part.scale.copy(data.baseScale).multiplyScalar(0.88 + nodeCharge * 0.30);
      part.rotation.z += delta * (0.25 + nodeCharge * 1.15);
      continue;
    }
    if (part.material && data.baseOpacity !== undefined) {
      const roleBoost = data.landmarkRole === "signal" || data.landmarkRole === "core" ? 0.34 * activation : 0;
      part.material.opacity = Math.min(1, data.baseOpacity + roleBoost);
    }
  }
  group.rotation.z = Math.sin(elapsed * 0.18) * 0.018;
}
