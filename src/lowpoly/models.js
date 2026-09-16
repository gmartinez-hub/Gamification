import * as THREE from '../../vendor/three.module.js';

// All actors face -Z. Navigation owns the outer group; animation only moves
// its children. The shared palette keeps independently replaceable parts coherent.
const palette = {
  ivory: new THREE.MeshStandardMaterial({ color: 0xe5e1cd, roughness: 0.58, metalness: 0.25, flatShading: true }),
  white: new THREE.MeshStandardMaterial({ color: 0xfff7df, roughness: 0.48, metalness: 0.2, flatShading: true }),
  graphite: new THREE.MeshStandardMaterial({ color: 0x222e37, roughness: 0.7, metalness: 0.45, flatShading: true }),
  seam: new THREE.MeshStandardMaterial({ color: 0x101c25, roughness: 0.8, metalness: 0.2 }),
  teal: new THREE.MeshStandardMaterial({ color: 0x287c82, roughness: 0.5, metalness: 0.38, flatShading: true }),
  copper: new THREE.MeshStandardMaterial({ color: 0xb87a46, roughness: 0.4, metalness: 0.7, flatShading: true }),
  glass: new THREE.MeshStandardMaterial({ color: 0x092b4b, emissive: 0x063657, emissiveIntensity: 0.32, roughness: 0.18, metalness: 0.8, flatShading: true }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x8de7ef, emissive: 0x39bfe9, emissiveIntensity: 2.4, roughness: 0.25, metalness: 0.15 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xffda7d, emissive: 0xffa72e, emissiveIntensity: 2, roughness: 0.25, metalness: 0.2 }),
  exhaust: new THREE.MeshStandardMaterial({ color: 0x9feaff, emissive: 0x2caeea, emissiveIntensity: 2.5, transparent: true, opacity: 0.66, depthWrite: false, flatShading: true }),
};

function mesh(parent, name, geometry, material, position = [0, 0, 0]) {
  const part = new THREE.Mesh(geometry, material);
  part.name = name;
  part.position.set(...position);
  part.castShadow = material !== palette.exhaust;
  part.receiveShadow = true;
  parent.add(part);
  return part;
}

function group(parent, name, position = [0, 0, 0]) {
  const part = new THREE.Group();
  part.name = name;
  part.position.set(...position);
  parent.add(part);
  return part;
}

function box(parent, name, size, material, position) {
  return mesh(parent, name, new THREE.BoxGeometry(...size), material, position);
}

function cylinder(parent, name, radius, length, material, position, alongZ = false, radiusBack = radius) {
  const part = mesh(parent, name, new THREE.CylinderGeometry(radius, radiusBack, length, 8), material, position);
  if (alongZ) part.rotation.x = Math.PI / 2;
  return part;
}

function ring(parent, name, radius, thickness, material, position, scaleY = 1) {
  const part = mesh(parent, name, new THREE.TorusGeometry(radius, thickness, 4, 8), material, position);
  part.scale.y = scaleY;
  return part;
}

// An eight-sided loft gives broad readable panels with bevels, without smooth
// plastic silhouettes or a large number of individual face meshes.
function hull(parent, name, sections, material) {
  const outline = [[0.68, 1], [-0.68, 1], [-1, 0.52], [-1, -0.52], [-0.68, -1], [0.68, -1], [1, -0.52], [1, 0.52]];
  const vertices = sections.map(({ z, w, h, y = 0 }) => outline.map(([x, sy]) => [x * w, sy * h + y, z]));
  const positions = [];
  const triangle = (a, b, c) => positions.push(...a, ...b, ...c);
  for (let s = 0; s < sections.length - 1; s++) {
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      triangle(vertices[s][i], vertices[s][j], vertices[s + 1][j]);
      triangle(vertices[s][i], vertices[s + 1][j], vertices[s + 1][i]);
    }
  }
  for (let i = 1; i < 7; i++) {
    triangle(vertices[0][0], vertices[0][i + 1], vertices[0][i]);
    const last = vertices.length - 1;
    triangle(vertices[last][0], vertices[last][i], vertices[last][i + 1]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return mesh(parent, name, geometry, material);
}

function fin(parent, name, points, thickness, material, position = [0, 0, 0]) {
  const shape = new THREE.Shape();
  shape.moveTo(...points[0]);
  for (const point of points.slice(1)) shape.lineTo(...point);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, steps: 1, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.025, bevelThickness: 0.025, curveSegments: 1 });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, thickness / 2, 0);
  return mesh(parent, name, geometry, material, position);
}

function engine(parent, name, position, radius = 0.27, length = 0.42) {
  const assembly = group(parent, name, position);
  cylinder(assembly, `${name}-housing`, radius * 1.12, length, palette.graphite, [0, 0, 0], true);
  ring(assembly, `${name}-copper-rim`, radius, 0.045, palette.copper, [0, 0, length / 2]);
  cylinder(assembly, `${name}-recess`, radius * 0.8, 0.035, palette.seam, [0, 0, length / 2 + 0.005], true);
  cylinder(assembly, `${name}-core`, radius * 0.53, 0.045, palette.cyan, [0, 0, length / 2 + 0.035], true);
  const flame = group(assembly, `${name}-exhaust`, [0, 0, length / 2 + 0.055]);
  const jet = mesh(flame, `${name}-plume`, new THREE.ConeGeometry(radius * 0.56, 0.72, 6), palette.exhaust, [0, 0, 0.36]);
  jet.rotation.x = Math.PI / 2;
  return flame;
}

export function createShip() {
  const root = new THREE.Group();
  root.name = 'modular-spacecraft';
  root.userData.kind = 'ship';
  const visual = group(root, 'ship-visual');
  const cockpit = group(visual, 'module-cockpit', [0, 0, -1.5]);
  const body = group(visual, 'module-body', [0, 0, 0.7]);
  const propulsion = group(visual, 'module-propulsion', [0, 0, 2.3]);
  const modules = [cockpit, body, propulsion];
  const anchors = modules.map(part => part.position.clone());
  modules.forEach((part, i) => { part.userData = { stage: i + 1, module: ['Cabina', 'Hábitat', 'Propulsión'][i] }; });
  root.userData.modules = modules.map(part => part.name);

  hull(cockpit, 'cockpit-pressure-shell', [
    { z: -1.1, w: 0.42, h: 0.35, y: -0.02 },
    { z: -0.48, w: 0.84, h: 0.4, y: -0.16 },
    { z: 0.78, w: 0.9, h: 0.63 },
    { z: 1, w: 0.69, h: 0.5 },
  ], palette.ivory);
  hull(cockpit, 'panoramic-canopy-frame', [
    { z: -0.97, w: 0.37, h: 0.1, y: 0.18 },
    { z: -0.48, w: 0.75, h: 0.13, y: 0.3 },
    { z: 0.23, w: 0.74, h: 0.13, y: 0.34 },
  ], palette.graphite);
  hull(cockpit, 'panoramic-canopy-glass', [
    { z: -0.94, w: 0.34, h: 0.14, y: 0.235 },
    { z: -0.47, w: 0.705, h: 0.235, y: 0.385 },
    { z: 0.16, w: 0.695, h: 0.208, y: 0.414 },
  ], palette.glass);
  box(cockpit, 'canopy-spine', [0.065, 0.055, 0.7], palette.ivory, [0, 0.649, -0.14]);
  const windshieldMullion = box(cockpit, 'windshield-mullion', [0.052, 0.035, 0.535], palette.ivory, [0, 0.512, -0.713]);
  windshieldMullion.rotation.x = -0.48;
  box(cockpit, 'canopy-rear-frame', [1.4, 0.06, 0.065], palette.copper, [0, 0.635, 0.2]);
  box(cockpit, 'nose-dark-inset', [0.43, 0.13, 0.035], palette.graphite, [0, -0.13, -1.107]);
  box(cockpit, 'nose-navigation-light', [0.22, 0.028, 0.045], palette.cyan, [0, -0.12, -1.13]);
  ring(cockpit, 'cockpit-docking-ring', 0.66, 0.055, palette.copper, [0, 0, 1.04], 0.79);
  cylinder(cockpit, 'cockpit-docking-collar', 0.56, 0.4, palette.graphite, [0, 0, 1.12], true);
  for (const side of [-1, 1]) {
    box(cockpit, `cockpit-side-panel-${side}`, [0.055, 0.24, 0.66], palette.teal, [side * 0.897, -0.12, 0.28]);
    box(cockpit, `cockpit-panel-sill-${side}`, [0.07, 0.04, 0.65], palette.copper, [side * 0.899, -0.265, 0.28]);
    box(cockpit, `cockpit-aft-seam-${side}`, [0.026, 0.45, 0.028], palette.graphite, [side * 0.893, 0, 0.67]);
    box(cockpit, `cockpit-running-light-${side}`, [0.06, 0.055, 0.16], palette.cyan, [side * 0.9, 0.07, 0.45]);
    const skid = box(cockpit, `cockpit-landing-skid-${side}`, [0.15, 0.09, 1.12], palette.graphite, [side * 0.49, -0.66, 0.1]);
    skid.rotation.x = -0.035;
    box(cockpit, `cockpit-skid-strut-${side}`, [0.1, 0.21, 0.12], palette.copper, [side * 0.49, -0.53, 0.4]);
  }
  const podJets = [-1, 1].map(side => engine(cockpit, `pod-maneuver-engine-${side}`, [side * 0.59, -0.32, 0.77], 0.12, 0.23));

  hull(body, 'habitat-pressure-shell', [
    { z: -0.94, w: 0.7, h: 0.54 },
    { z: -0.73, w: 1.0, h: 0.68 },
    { z: 0.68, w: 1.0, h: 0.68 },
    { z: 0.9, w: 0.71, h: 0.54 },
  ], palette.ivory);
  ring(body, 'habitat-front-seal', 0.71, 0.05, palette.copper, [0, 0, -0.95], 0.79);
  ring(body, 'habitat-rear-seal', 0.72, 0.055, palette.copper, [0, 0, 0.92], 0.79);
  box(body, 'habitat-roof-service-panel', [1.02, 0.055, 1.03], palette.graphite, [0, 0.705, 0.03]);
  box(body, 'habitat-roof-inlay', [0.75, 0.035, 0.64], palette.teal, [0, 0.749, 0.02]);
  for (const side of [-1, 1]) {
    box(body, `habitat-window-surround-${side}`, [0.07, 0.48, 1.32], palette.graphite, [side * 1.0, 0.04, -0.02]);
    for (let pane = 0; pane < 3; pane++) {
      box(body, `habitat-window-${side}-${pane}`, [0.081, 0.36, 0.34], palette.glass, [side * 1.006, 0.065, -0.47 + pane * 0.43]);
      box(body, `habitat-window-status-${side}-${pane}`, [0.09, 0.025, 0.19], palette.amber, [side * 1.008, -0.125, -0.47 + pane * 0.43]);
    }
    box(body, `habitat-lower-panel-${side}`, [0.065, 0.18, 1.16], palette.teal, [side * 0.96, -0.39, -0.01]);
    box(body, `habitat-roof-rail-${side}`, [0.075, 0.12, 1.08], palette.ivory, [side * 0.46, 0.79, 0.02]);
    box(body, `habitat-keel-${side}`, [0.14, 0.07, 1.26], palette.graphite, [side * 0.47, -0.72, 0.02]);
  }

  hull(propulsion, 'propulsion-core-shell', [
    { z: -0.73, w: 0.71, h: 0.54 },
    { z: -0.5, w: 0.87, h: 0.62 },
    { z: 0.52, w: 0.76, h: 0.56 },
    { z: 0.65, w: 0.61, h: 0.46 },
  ], palette.ivory);
  box(propulsion, 'reactor-spine', [0.5, 0.14, 0.91], palette.graphite, [0, 0.65, 0]);
  box(propulsion, 'reactor-power-strip', [0.17, 0.03, 0.58], palette.cyan, [0, 0.736, -0.04]);
  const mainJets = [];
  for (const side of [-1, 1]) {
    const wing = fin(propulsion, `swept-wing-${side}`, [[0.62, -0.44], [1.28, -0.24], [2.12, 0.44], [2.03, 0.69], [0.6, 0.46]], 0.1, palette.ivory, [0, -0.18, 0]);
    wing.scale.x = side;
    const inlay = fin(propulsion, `wing-teal-inlay-${side}`, [[0.93, -0.25], [1.23, -0.12], [1.91, 0.44], [1.7, 0.45]], 0.025, palette.teal, [0, -0.09, 0]);
    inlay.scale.x = side;
    box(propulsion, `wingtip-running-light-${side}`, [0.1, 0.055, 0.14], palette.cyan, [side * 2.01, -0.09, 0.47]);
    box(propulsion, `engine-mount-${side}`, [0.32, 0.38, 0.86], palette.graphite, [side * 0.82, -0.12, 0.22]);
    mainJets.push(engine(propulsion, `main-engine-${side}`, [side * 0.9, -0.13, 0.52], 0.29, 0.56));
    box(propulsion, `engine-armored-cowl-${side}`, [0.42, 0.12, 0.55], palette.ivory, [side * 0.9, 0.21, 0.39]);
    for (let vent = 0; vent < 3; vent++) {
      box(propulsion, `reactor-vent-${side}-${vent}`, [0.045, 0.25, 0.085], palette.graphite, [side * 0.858, 0.05, -0.31 + vent * 0.16]);
    }
  }

  let stage = 1;
  let lastTime = 0;
  const attachments = new Map();
  const duration = 1.25;
  function setStage(nextStage, animate = true) {
    if (!Number.isInteger(nextStage) || nextStage < 1 || nextStage > 3) throw new RangeError('Ship stage must be 1, 2 or 3.');
    modules.forEach((part, index) => {
      const newlyVisible = index >= stage && index < nextStage;
      part.visible = index < nextStage;
      if (!part.visible || !animate) attachments.delete(part);
      if (newlyVisible && animate) {
        const start = anchors[index].clone().add(new THREE.Vector3(index === 1 ? -2.6 : 2.6, 1.15, 2.0));
        attachments.set(part, { start, started: lastTime, index });
        part.position.copy(start);
        part.scale.setScalar(0.82);
        part.rotation.set(0.08, index === 1 ? -0.24 : 0.24, 0.14);
      } else if (!attachments.has(part)) {
        part.position.copy(anchors[index]);
        part.rotation.set(0, 0, 0);
        part.scale.setScalar(1);
      }
    });
    stage = nextStage;
    root.userData.stage = stage;
  }
  setStage(1, false);
  function update(time, { moving = 0, boost = false } = {}) {
    lastTime = time;
    const motion = Math.min(1, Math.max(0, Number(moving) || 0));
    visual.position.y = Math.sin(time * 1.25) * 0.045;
    visual.rotation.z = Math.sin(time * 0.8) * 0.012;
    for (const [part, attachment] of attachments) {
      const progress = Math.min(1, Math.max(0, (time - attachment.started) / duration));
      const ease = 1 - Math.pow(1 - progress, 3);
      part.position.lerpVectors(attachment.start, anchors[attachment.index], ease);
      part.scale.setScalar(0.82 + 0.18 * ease);
      part.rotation.set(0.08 * (1 - ease), (attachment.index === 1 ? -0.24 : 0.24) * (1 - ease), 0.14 * (1 - ease));
      if (progress === 1) attachments.delete(part);
    }
    [...podJets, ...mainJets].forEach((jet, index) => {
      const pulse = 1 + Math.sin(time * 24 + index * 1.6) * 0.09;
      jet.scale.set(1, 1, (boost ? 1.28 : 0.28 + motion * 0.66) * pulse);
    });
  }
  return { group: root, setStage, update };
}

export function createAstronaut() {
  const root = new THREE.Group();
  root.name = 'astronaut';
  root.userData.kind = 'astronaut';
  const suit = group(root, 'astronaut-rig');
  box(suit, 'waist-flexible-seal', [0.43, 0.2, 0.31], palette.graphite, [0, 0.82, 0]);
  hull(suit, 'torso-armor', [
    { z: -0.23, w: 0.25, h: 0.22, y: 1.095 },
    { z: -0.15, w: 0.33, h: 0.25, y: 1.095 },
    { z: 0.2, w: 0.29, h: 0.24, y: 1.095 },
  ], palette.ivory);
  box(suit, 'chest-console-surround', [0.32, 0.25, 0.05], palette.graphite, [0, 1.1, -0.247]);
  box(suit, 'chest-teal-panel', [0.26, 0.19, 0.03], palette.teal, [0, 1.115, -0.287]);
  box(suit, 'chest-telemetry', [0.14, 0.026, 0.012], palette.cyan, [0, 1.165, -0.31]);
  for (const side of [-1, 1]) {
    box(suit, `chest-harness-${side}`, [0.052, 0.36, 0.07], palette.copper, [side * 0.235, 1.09, -0.205]);
    box(suit, `utility-pouch-${side}`, [0.14, 0.14, 0.16], palette.teal, [side * 0.27, 0.865, -0.03]);
  }
  cylinder(suit, 'helmet-locking-ring', 0.235, 0.105, palette.copper, [0, 1.335, 0]);
  const helmet = mesh(suit, 'faceted-helmet', new THREE.DodecahedronGeometry(0.345, 0), palette.white, [0, 1.58, 0]);
  helmet.scale.set(1, 1.03, 0.98);
  const visor = mesh(suit, 'panoramic-dark-blue-visor', new THREE.SphereGeometry(0.352, 9, 4, Math.PI * 1.05, Math.PI * 0.9, 0.83, 1.47), palette.glass, [0, 1.58, -0.004]);
  visor.scale.set(1.01, 1.02, 1.01);
  mesh(suit, 'visor-upper-copper-edge', new THREE.SphereGeometry(0.36, 9, 1, Math.PI * 1.05, Math.PI * 0.9, 0.81, 0.055), palette.copper, [0, 1.58, -0.004]);
  for (const side of [-1, 1]) {
    const earpiece = cylinder(suit, `helmet-comm-${side}`, 0.108, 0.06, palette.graphite, [side * 0.324, 1.565, 0]);
    earpiece.rotation.z = Math.PI / 2;
    const cap = cylinder(suit, `helmet-comm-cap-${side}`, 0.067, 0.075, palette.copper, [side * 0.337, 1.565, 0]);
    cap.rotation.z = Math.PI / 2;
  }
  box(suit, 'helmet-crown-panel', [0.13, 0.035, 0.19], palette.teal, [0, 1.901, 0.01]);
  const pack = group(suit, 'life-support-backpack', [0, 1.09, 0.26]);
  box(pack, 'backpack-core', [0.46, 0.51, 0.23], palette.graphite, [0, 0, 0.065]);
  box(pack, 'backpack-shell', [0.37, 0.45, 0.12], palette.ivory, [0, 0.01, 0.215]);
  box(pack, 'backpack-teal-spine', [0.11, 0.32, 0.03], palette.teal, [0, 0.02, 0.286]);
  box(pack, 'backpack-charge-light', [0.045, 0.13, 0.016], palette.cyan, [0, 0.08, 0.31]);
  const jets = [];
  for (const side of [-1, 1]) {
    cylinder(pack, `oxygen-tank-${side}`, 0.105, 0.38, palette.ivory, [side * 0.245, 0.04, 0.14]);
    cylinder(pack, `oxygen-tank-band-${side}`, 0.113, 0.07, palette.copper, [side * 0.245, -0.03, 0.14]);
    const jetMount = group(pack, `jetpack-thruster-${side}`, [side * 0.23, -0.27, 0.13]);
    jetMount.rotation.x = Math.PI / 2;
    jets.push(engine(jetMount, `jetpack-engine-${side}`, [0, 0, 0], 0.09, 0.13));
  }
  const arms = [];
  const forearms = [];
  const legs = [];
  const shins = [];
  for (const side of [-1, 1]) {
    const arm = group(suit, `shoulder-pivot-${side}`, [side * 0.37, 1.265, 0]);
    mesh(arm, `shoulder-joint-${side}`, new THREE.IcosahedronGeometry(0.145, 0), palette.graphite);
    box(arm, `shoulder-plate-${side}`, [0.26, 0.16, 0.29], palette.ivory, [side * 0.018, -0.015, -0.006]);
    box(arm, `upper-arm-${side}`, [0.18, 0.22, 0.2], palette.ivory, [0, -0.18, 0]);
    const elbow = group(arm, `elbow-pivot-${side}`, [0, -0.32, 0]);
    mesh(elbow, `elbow-seal-${side}`, new THREE.IcosahedronGeometry(0.105, 0), palette.graphite);
    box(elbow, `forearm-plate-${side}`, [0.19, 0.23, 0.22], palette.ivory, [0, -0.135, -0.012]);
    box(elbow, `forearm-teal-inlay-${side}`, [0.12, 0.13, 0.025], palette.teal, [0, -0.125, -0.13]);
    cylinder(elbow, `wrist-copper-lock-${side}`, 0.099, 0.055, palette.copper, [0, -0.26, 0]);
    box(elbow, `glove-${side}`, [0.16, 0.14, 0.18], palette.graphite, [0, -0.345, -0.005]);
    box(elbow, `glove-thumb-${side}`, [0.075, 0.1, 0.09], palette.graphite, [-side * 0.093, -0.325, -0.03]);
    const leg = group(suit, `hip-pivot-${side}`, [side * 0.175, 0.78, 0]);
    box(leg, `thigh-armor-${side}`, [0.24, 0.3, 0.27], palette.ivory, [0, -0.15, 0]);
    box(leg, `thigh-teal-panel-${side}`, [0.135, 0.17, 0.025], palette.teal, [0, -0.14, -0.149]);
    const knee = group(leg, `knee-pivot-${side}`, [0, -0.345, 0]);
    mesh(knee, `knee-joint-${side}`, new THREE.IcosahedronGeometry(0.13, 0), palette.graphite);
    box(knee, `knee-front-guard-${side}`, [0.17, 0.13, 0.055], palette.copper, [0, 0, -0.135]);
    box(knee, `shin-armor-${side}`, [0.235, 0.26, 0.245], palette.ivory, [0, -0.15, 0]);
    cylinder(knee, `ankle-lock-${side}`, 0.116, 0.05, palette.copper, [0, -0.3, 0]);
    box(knee, `boot-${side}`, [0.265, 0.13, 0.35], palette.graphite, [0, -0.36, -0.045]);
    box(knee, `boot-armored-toe-${side}`, [0.245, 0.07, 0.17], palette.ivory, [0, -0.32, -0.115]);
    arms.push(arm);
    forearms.push(elbow);
    legs.push(leg);
    shins.push(knee);
  }
  function update(time, { moving = 0, boost = false } = {}) {
    const motion = Math.min(1, Math.max(0, Number(moving) || 0));
    const gait = time * (boost ? 10 : 7);
    suit.position.y = 0.025 + Math.sin(time * 2.1) * 0.025 + (boost ? 0.1 : 0);
    suit.rotation.x = motion * (boost ? -0.28 : -0.08);
    suit.rotation.z = Math.sin(gait * 0.5) * motion * 0.025;
    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? -1 : 1;
      const step = Math.sin(gait + i * Math.PI);
      arms[i].rotation.z = -sign * (0.14 + motion * 0.1);
      arms[i].rotation.x = step * motion * 0.36 - (boost ? 0.3 : 0.07);
      forearms[i].rotation.x = -0.2 - motion * 0.16;
      legs[i].rotation.x = -step * motion * (boost ? 0.19 : 0.44) + (boost ? 0.22 : 0);
      shins[i].rotation.x = Math.max(0, step) * motion * 0.46 + (boost ? 0.22 : 0.025);
      jets[i].scale.z = (boost ? 1.35 : 0.16 + motion * 0.4) * (1 + Math.sin(time * 23 + i) * 0.12);
    }
  }
  update(0);
  return { group: root, update };
}

export function createCompanion() {
  const root = new THREE.Group();
  root.name = 'companion';
  root.userData.kind = 'companion';
  const orb = group(root, 'companion-visual');
  mesh(orb, 'faceted-orb-core', new THREE.IcosahedronGeometry(0.35, 0), palette.graphite);
  const shell = mesh(orb, 'faceted-ivory-shell', new THREE.DodecahedronGeometry(0.37, 0), palette.ivory);
  shell.scale.set(1, 1.03, 0.88);
  cylinder(orb, 'eye-dark-socket', 0.215, 0.08, palette.graphite, [0, 0, -0.303], true);
  ring(orb, 'eye-copper-rim', 0.178, 0.033, palette.copper, [0, 0, -0.355]);
  const eye = mesh(orb, 'amber-optic', new THREE.IcosahedronGeometry(0.139, 1), palette.amber, [0, 0, -0.371]);
  eye.scale.z = 0.47;
  const iris = mesh(orb, 'optic-highlight', new THREE.IcosahedronGeometry(0.042, 0), palette.white, [-0.035, 0.03, -0.437]);
  iris.scale.z = 0.3;
  for (const side of [-1, 1]) {
    const vane = fin(orb, `steering-fin-${side}`, [[0.29, -0.09], [0.47, 0.08], [0.43, 0.28], [0.31, 0.19]], 0.055, palette.ivory);
    vane.scale.x = side;
    vane.rotation.z = side * 0.22;
    box(orb, `fin-teal-cap-${side}`, [0.045, 0.07, 0.14], palette.teal, [side * 0.43, 0.1, 0.14]);
  }
  cylinder(orb, 'antenna-stalk', 0.024, 0.16, palette.graphite, [0.12, 0.389, 0.03]);
  mesh(orb, 'antenna-signal', new THREE.IcosahedronGeometry(0.044, 0), palette.cyan, [0.12, 0.49, 0.03]);
  const thruster = group(orb, 'companion-hover-thruster', [0, -0.315, 0.04]);
  thruster.rotation.x = Math.PI / 2;
  const jet = engine(thruster, 'companion-engine', [0, 0, 0], 0.083, 0.12);
  function update(time, { moving = 0, boost = false } = {}) {
    const motion = Math.min(1, Math.max(0, Number(moving) || 0));
    orb.position.y = Math.sin(time * 2.7 + 1) * 0.07;
    orb.rotation.z = Math.sin(time * 1.5) * 0.065;
    orb.rotation.x = -motion * 0.15;
    jet.scale.z = (boost ? 0.9 : 0.32 + motion * 0.22) * (1 + Math.sin(time * 21) * 0.1);
  }
  return { group: root, update };
}
