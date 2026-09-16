import * as THREE from '../../vendor/three.module.js';

const TEXTURES = {
  ocean: new URL('../../assets/runtime/three-textures/ocean-world-bright-color.png', import.meta.url).href,
  moon: new URL('../../assets/runtime/three-textures/dark-crater-color.png', import.meta.url).href,
  rock: new URL('../../assets/runtime/three-textures/asteroid-surface-wide-color.png', import.meta.url).href,
};

const BIOMES = [
  { planet: 0xb7dbdc, atmosphere: 0x5fdbe5, rock: 0x7e929f, accent: 0x73e5de, texture: 'ocean' },
  { planet: 0xb4a6dd, atmosphere: 0xa892ef, rock: 0x827b94, accent: 0xb9a0ee, texture: 'moon' },
  { planet: 0xcfad9e, atmosphere: 0xfca68b, rock: 0x958078, accent: 0xf1b88d, texture: 'moon' },
];

// Cosmetic randomness has its own seed: adding a star never changes gameplay.
function randomForLayout(layout) {
  const text = `${layout.name}:${layout.beacon.x},${layout.beacon.y},${layout.beacon.z}`;
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619);
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const positionFrom = ({ x, y, z }) => new THREE.Vector3(x, y, z);

/** Presentation only. The layout remains immutable; public positions follow the
 * actual drifting objects so aiming and collision use the same visible location.
 */
export function createSectorWorld(scene) {
  const root = new THREE.Group();
  root.name = 'expedition-sector';
  scene.add(root);
  const background = new THREE.Group();
  background.name = 'decorative-space';
  const playable = new THREE.Group();
  playable.name = 'playable-sector';
  const beacon = new THREE.Group();
  beacon.name = 'scan-beacon';
  const gem = new THREE.Group();
  gem.name = 'sector-gem';
  const gate = new THREE.Group();
  gate.name = 'transit-corridor';
  root.add(background, playable, beacon, gem, gate);
  const targets = [];
  const hazards = [];
  let resources = new Set();
  let generation = 0;
  let disposed = false;
  let currentLayout;
  let materials;
  let beaconSweep;
  let gemCrystal;
  let primaryPlanet;
  let gateRings = [];
  let sectorPalette;

  const own = resource => { resources.add(resource); return resource; };
  const geometry = (Constructor, ...args) => own(new Constructor(...args));
  const surface = (color, options = {}) => own(new THREE.MeshStandardMaterial({
    color, roughness: 0.78, metalness: 0.15, flatShading: true, ...options,
  }));
  const glow = (color, opacity = 1) => own(new THREE.MeshBasicMaterial({
    color, toneMapped: false, transparent: opacity < 1, opacity, depthWrite: opacity === 1,
  }));
  function addMesh(parent, shape, material, position = [0, 0, 0]) {
    const object = new THREE.Mesh(shape, material);
    object.position.set(...position);
    parent.add(object);
    return object;
  }
  function addRing(parent, radius, thickness, material, position = [0, 0, 0], horizontal = false, segments = 40) {
    const ring = addMesh(parent, geometry(THREE.TorusGeometry, radius, thickness, 4, segments), material, position);
    if (horizontal) ring.rotation.x = Math.PI / 2;
    return ring;
  }
  function texture(name, materialList) {
    // TextureLoader creates an HTML image. Geometry also works in Node and on
    // browsers where an optional texture fails to load.
    if (typeof document === 'undefined') return;
    const version = generation;
    const loaded = new THREE.TextureLoader().load(TEXTURES[name], image => {
      if (disposed || version !== generation) return;
      image.colorSpace = THREE.SRGBColorSpace;
      image.anisotropy = 2;
      for (const material of materialList) {
        material.map = image;
        material.needsUpdate = true;
      }
    }, undefined, () => {});
    own(loaded);
  }
  function clearSector() {
    generation++;
    for (const resource of resources) resource.dispose();
    resources.clear();
    for (const group of [background, playable, beacon, gem, gate]) group.clear();
    targets.length = 0;
    hazards.length = 0;
    gateRings = [];
  }

  function createBackground(random) {
    const stars = [];
    const colors = [];
    const starColor = new THREE.Color();
    for (let i = 0; i < 850; i++) {
      const azimuth = random() * Math.PI * 2;
      const elevation = random() * 2 - 1;
      const distance = 150 + random() * 80;
      const circumference = Math.sqrt(1 - elevation * elevation);
      stars.push(Math.cos(azimuth) * circumference * distance, elevation * distance, Math.sin(azimuth) * circumference * distance - 25);
      starColor.set(i % 9 === 0 ? sectorPalette.accent : 0xe5edf0).multiplyScalar(0.25 + random() * 0.5);
      colors.push(starColor.r, starColor.g, starColor.b);
    }
    const starGeometry = own(new THREE.BufferGeometry());
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const starField = new THREE.Points(starGeometry, own(new THREE.PointsMaterial({ size: 0.24, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false })));
    starField.name = 'distant-stars';
    background.add(starField);

    const planetMaterial = surface(sectorPalette.planet, { roughness: 1, metalness: 0, flatShading: false, emissive: sectorPalette.atmosphere, emissiveIntensity: 0.08 });
    primaryPlanet = addMesh(background, geometry(THREE.SphereGeometry, 26, 40, 28), planetMaterial, [-62, 12, -83]);
    primaryPlanet.name = 'biome-planet';
    primaryPlanet.rotation.z = -0.18;
    texture(sectorPalette.texture, [planetMaterial]);
    const atmosphere = own(new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color(sectorPalette.atmosphere) } },
      vertexShader: `varying vec3 n; varying vec3 v; void main(){ vec4 p = modelViewMatrix * vec4(position,1.0); n = normalize(normalMatrix * normal); v = -p.xyz; gl_Position = projectionMatrix * p; }`,
      fragmentShader: `uniform vec3 tint; varying vec3 n; varying vec3 v; void main(){ float rim = 1.0 - abs(dot(normalize(n), normalize(v))); gl_FragColor = vec4(tint, pow(rim, 3.5) * 0.29); }`,
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    }));
    const halo = addMesh(background, geometry(THREE.SphereGeometry, 26.6, 32, 20), atmosphere);
    halo.position.copy(primaryPlanet.position);
    const moonMaterial = surface(0x9aadb8, { roughness: 1, metalness: 0 });
    const moon = addMesh(background, geometry(THREE.IcosahedronGeometry, 11, 2), moonMaterial, [47, -9, -108]);
    moon.rotation.set(0.1, 1.8, 0.3);
    texture('moon', [moonMaterial]);

    const debris = own(new THREE.InstancedMesh(geometry(THREE.IcosahedronGeometry, 1, 0), materials.ambientRock, 190));
    debris.name = 'decorative-asteroid-belt';
    const transform = new THREE.Object3D();
    for (let i = 0; i < debris.count; i++) {
      // All decorative rocks stay below or beside the playable route.
      const side = random() < 0.5 ? -1 : 1;
      transform.position.set(side * (29 + random() * 48), -14 - random() * 24, 23 - random() * 142);
      transform.rotation.set(random() * 6, random() * 6, random() * 6);
      const size = 0.3 + random() ** 2 * 3.6;
      transform.scale.set(size, size * (0.5 + random() * 0.45), size * (0.65 + random() * 0.65));
      transform.updateMatrix();
      debris.setMatrixAt(i, transform.matrix);
    }
    debris.instanceMatrix.needsUpdate = true;
    background.add(debris);
  }

  function createTarget(spec, kind, random) {
    const object = new THREE.Group();
    object.name = spec.id;
    object.position.copy(positionFrom(spec.position));
    const radius = spec.radius;
    const isLarge = kind === 'large';
    const isHazard = kind === 'hazard';
    const body = addMesh(object, geometry(THREE.IcosahedronGeometry, radius * 0.89, isLarge ? 1 : 0), isHazard ? materials.hazardRock : materials.targetRock);
    body.rotation.set(random() * 2, random() * 2, random() * 2);
    body.scale.set(1, 0.88, 0.95);
    const oreMaterial = isHazard ? materials.hazard : isLarge ? materials.amber : materials.cyan;
    const ore = own(new THREE.InstancedMesh(geometry(THREE.OctahedronGeometry, radius * (isLarge ? 0.28 : 0.23), 0), oreMaterial, isLarge ? 5 : 3));
    const transform = new THREE.Object3D();
    for (let i = 0; i < ore.count; i++) {
      const angle = (i / ore.count) * Math.PI * 2;
      transform.position.set(Math.cos(angle) * radius * 0.65, Math.sin(angle) * radius * 0.56, radius * 0.37);
      transform.rotation.set(0, angle, angle * 0.5);
      transform.scale.set(0.65, isHazard ? 1.5 : 1.15, 0.8);
      transform.updateMatrix();
      ore.setMatrixAt(i, transform.matrix);
    }
    body.add(ore);
    if (!isHazard) {
      const marker = addRing(object, radius * 1.13, 0.018, isLarge ? materials.amberLine : materials.cyanLine, [0, 0, 0], false, isLarge ? 6 : 32);
      marker.rotation.set(0.2, 0.25, isLarge ? Math.PI / 6 : 0);
    }
    object.traverse(part => { part.userData.id = spec.id; part.userData.targetId = spec.id; part.userData.kind = kind; });
    object.userData.basePosition = object.position.clone();
    object.userData.driftPhase = random() * Math.PI * 2;
    object.userData.body = body;
    playable.add(object);
    const record = { id: spec.id, object, position: object.position, radius, kind };
    (isHazard ? hazards : targets).push(record);
  }

  function createBeacon() {
    beacon.position.copy(positionFrom(currentLayout.beacon));
    beacon.userData.kind = 'beacon';
    beacon.userData.scanProgress = 0;
    addMesh(beacon, geometry(THREE.CylinderGeometry, 0.75, 1.1, 0.35, 8), materials.graphite, [0, -0.85, 0]);
    addMesh(beacon, geometry(THREE.CylinderGeometry, 0.3, 0.42, 1.15, 6), materials.ivory, [0, -0.14, 0]);
    addMesh(beacon, geometry(THREE.CylinderGeometry, 0.51, 0.36, 0.2, 8), materials.copper, [0, 0.49, 0]);
    addMesh(beacon, geometry(THREE.OctahedronGeometry, 0.42), materials.beaconGlow, [0, 0.94, 0]);
    addRing(beacon, 0.76, 0.04, materials.ivory, [0, 0.94, 0], true, 12);
    addRing(beacon, 1.38, 0.025, materials.beaconGlow, [0, -0.73, 0], true);
    beaconSweep = addRing(beacon, 1.72, 0.018, materials.beaconLine, [0, 0.6, 0], true);
    const arms = own(new THREE.InstancedMesh(geometry(THREE.BoxGeometry, 0.17, 0.16, 1.12), materials.graphite, 3));
    const transform = new THREE.Object3D();
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3;
      transform.position.set(Math.sin(angle) * 0.85, -0.58, Math.cos(angle) * 0.85);
      transform.rotation.y = angle;
      transform.updateMatrix();
      arms.setMatrixAt(i, transform.matrix);
    }
    arms.instanceMatrix.needsUpdate = true;
    beacon.add(arms);
  }

  function createGem() {
    gem.position.copy(positionFrom(currentLayout.gem));
    gem.userData.kind = 'gem';
    gemCrystal = addMesh(gem, geometry(THREE.OctahedronGeometry, 0.66), materials.gem);
    gemCrystal.scale.set(0.72, 1.45, 0.72);
    addRing(gem, 1.22, 0.023, materials.cyanLine, [0, 0, 0], true);
    const outerRing = addRing(gem, 1.38, 0.017, materials.cyanLine);
    outerRing.rotation.y = Math.PI / 4;
  }

  function createCorridor() {
    gate.position.copy(positionFrom(currentLayout.gate));
    gate.userData.kind = 'gate';
    const corridorEnd = positionFrom(currentLayout.exit).sub(gate.position);
    const structuralShape = geometry(THREE.TorusGeometry, 6.1, 0.15, 4, 12);
    const illuminatedShape = geometry(THREE.TorusGeometry, 5.8, 0.035, 3, 48);
    for (let i = 0; i < 5; i++) {
      const ringPosition = corridorEnd.clone().multiplyScalar(i / 4);
      const structure = addMesh(gate, structuralShape, materials.graphite);
      structure.position.copy(ringPosition);
      structure.rotation.z = i % 2 * Math.PI / 12;
      const light = addMesh(gate, illuminatedShape, materials.gateLine);
      light.position.copy(ringPosition);
      gateRings.push(light);
    }
    const brackets = own(new THREE.InstancedMesh(geometry(THREE.BoxGeometry, 0.7, 0.31, 0.75), materials.ivory, 8));
    const transform = new THREE.Object3D();
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      transform.position.set(Math.sin(angle) * 6.1, Math.cos(angle) * 6.1, 0);
      transform.rotation.z = -angle;
      transform.updateMatrix();
      brackets.setMatrixAt(i, transform.matrix);
    }
    brackets.instanceMatrix.needsUpdate = true;
    gate.add(brackets);
    const guidePoints = [];
    for (const side of [-1, 1]) {
      guidePoints.push(new THREE.Vector3(side * 5.8, -0.35, 0), new THREE.Vector3(side * 5.8 + corridorEnd.x, corridorEnd.y - 0.35, corridorEnd.z));
    }
    const guides = new THREE.LineSegments(own(new THREE.BufferGeometry().setFromPoints(guidePoints)), own(new THREE.LineBasicMaterial({ color: sectorPalette.accent, transparent: true, opacity: 0.22, depthWrite: false })));
    gate.add(guides);
  }

  function load(layout) {
    if (disposed) throw new Error('Cannot load a disposed sector world.');
    clearSector();
    currentLayout = layout;
    // The authored encounter count identifies each biome without coupling this
    // module to mission state or relying on localized display names.
    sectorPalette = BIOMES[THREE.MathUtils.clamp(layout.large.length - 1, 0, 2)];
    const random = randomForLayout(layout);
    materials = {
      ivory: surface(0xe5e1cd), graphite: surface(0x22333e), copper: surface(0xba8154, { metalness: 0.55 }),
      ambientRock: surface(sectorPalette.rock, { roughness: 1, metalness: 0 }),
      targetRock: surface(0xa0b2b7, { roughness: 0.95, metalness: 0 }),
      hazardRock: surface(0x794d45, { roughness: 1, metalness: 0 }),
      cyan: surface(0x8de7ef, { emissive: 0x45cbd7, emissiveIntensity: 0.75, roughness: 0.3 }),
      amber: surface(0xffd180, { emissive: 0xffa52d, emissiveIntensity: 0.9, roughness: 0.3 }),
      hazard: surface(0xff8853, { emissive: 0xef4428, emissiveIntensity: 1.2 }),
      gem: surface(0xbbfff0, { emissive: 0x4de0c9, emissiveIntensity: 1.15, metalness: 0.4, roughness: 0.2 }),
      cyanLine: glow(0x7ee6e0, 0.55), amberLine: glow(0xffcd79, 0.6),
      beaconGlow: glow(0x7ff2e6), beaconLine: glow(0x7ff2e6, 0.5), gateLine: glow(0x496976, 0.45),
    };
    createBackground(random);
    texture('rock', [materials.ambientRock, materials.targetRock, materials.hazardRock]);
    for (const spec of layout.small) createTarget(spec, 'small', random);
    for (const spec of layout.large) createTarget(spec, 'large', random);
    for (const spec of layout.hazards) createTarget(spec, 'hazard', random);
    createBeacon();
    createGem();
    createCorridor();
    sync({ phase: 'scan', destroyed: [] }, 0);
  }

  function sync(state, time = 0) {
    if (!currentLayout || disposed) return;
    const destroyed = new Set(state.destroyed);
    const largeVisible = ['large', 'gem', 'return', 'transit', 'complete'].includes(state.phase);
    for (const record of [...targets, ...hazards]) {
      const { object, kind } = record;
      const phase = object.userData.driftPhase;
      object.position.copy(object.userData.basePosition);
      object.position.x += Math.sin(time * 0.31 + phase) * 0.16;
      object.position.y += Math.sin(time * 0.43 + phase) * 0.22;
      object.position.z += Math.cos(time * 0.27 + phase) * 0.12;
      object.userData.body.rotation.y = phase + time * (kind === 'hazard' ? 0.16 : 0.07);
      object.visible = !destroyed.has(record.id) && (kind !== 'large' || largeVisible);
      object.userData.active = kind === 'hazard' || kind === state.phase;
    }
    materials.cyan.emissiveIntensity = state.phase === 'small' ? 0.85 : 0.15;
    materials.cyanLine.opacity = state.phase === 'small' ? 0.6 : 0.18;
    const scanning = state.phase === 'scan';
    beacon.userData.active = scanning;
    materials.beaconGlow.color.set(scanning ? 0x83f4e5 : 0xc6a36d);
    materials.beaconLine.color.copy(materials.beaconGlow.color);
    materials.beaconLine.opacity = scanning ? 0.25 + Math.sin(time * 2) * 0.14 : 0.12;
    beaconSweep.position.y = scanning ? -0.2 + Math.sin(time * 1.4) * 0.9 : 0.6;
    beaconSweep.scale.setScalar(scanning ? 1 + Math.sin(time * 1.4) * 0.09 : 0.65);
    gem.visible = state.phase === 'gem';
    gem.userData.active = gem.visible;
    gem.position.copy(positionFrom(currentLayout.gem));
    gem.position.y += Math.sin(time * 1.7) * 0.17;
    gemCrystal.rotation.y = time * 0.55;
    gemCrystal.rotation.z = Math.sin(time * 0.7) * 0.12;
    const open = ['return', 'transit', 'complete'].includes(state.phase);
    gate.userData.active = open;
    materials.gateLine.color.set(open ? sectorPalette.accent : 0x496976);
    materials.gateLine.opacity = open ? 0.65 + Math.sin(time * 2) * 0.13 : 0.2;
    for (let i = 0; i < gateRings.length; i++) {
      gateRings[i].scale.setScalar(open ? 1 + Math.sin(time * 2 - i * 0.8) * 0.013 : 1);
    }
    primaryPlanet.rotation.y = -0.4 + time * 0.002;
  }

  function dispose() {
    if (disposed) return;
    clearSector();
    root.removeFromParent();
    disposed = true;
    currentLayout = undefined;
  }

  return { load, sync, targets, beacon, gem, gate, hazards, dispose };
}
