import * as THREE from '../../vendor/three.module.js';
import { SHIP_SCALE, COMPANION_SCALE } from './spatial.js';
import { palette } from './materials.js';

// All actors face -Z. Navigation owns the outer group; animation only moves
// its children. The shared palette keeps independently replaceable parts coherent.
const geometryCache = new Map();

function cachedGeometry(key, create) {
  if (!geometryCache.has(key)) geometryCache.set(key, create());
  return geometryCache.get(key);
}

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
  const chamfer = Math.min(...size) > .04 && Math.max(...size) > .12
    && [palette.ivory, palette.white, palette.teal, palette.graphite, palette.rubber, palette.copper].includes(material);
  const geometry = cachedGeometry(`${chamfer ? 'armor' : 'box'}:${size.join(',')}`, () => {
    if (!chamfer) return new THREE.BoxGeometry(...size);
    const [w, h, d] = size;
    const bevel = Math.min(Math.min(w, h, d) * .18, .045);
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + bevel, -h / 2 + bevel);
    shape.lineTo(w / 2 - bevel, -h / 2 + bevel);
    shape.lineTo(w / 2 - bevel, h / 2 - bevel);
    shape.lineTo(-w / 2 + bevel, h / 2 - bevel);
    shape.closePath();
    const result = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * bevel, bevelEnabled: true, bevelSegments: 1, bevelSize: bevel, bevelThickness: bevel, steps: 1, curveSegments: 1 });
    result.translate(0, 0, -d / 2 + bevel);
    return result;
  });
  return mesh(parent, name, geometry, material, position);
}

function cylinder(parent, name, radius, length, material, position, alongZ = false, radiusBack = radius) {
  const geometry = cachedGeometry(`cylinder:${radius},${radiusBack},${length}`, () => new THREE.CylinderGeometry(radius, radiusBack, length, 12));
  const part = mesh(parent, name, geometry, material, position);
  if (alongZ) part.rotation.x = Math.PI / 2;
  return part;
}

function ring(parent, name, radius, thickness, material, position, scaleY = 1) {
  const geometry = cachedGeometry(`ring:${radius},${thickness}`, () => new THREE.TorusGeometry(radius, thickness, 6, 16));
  const part = mesh(parent, name, geometry, material, position);
  part.scale.y = scaleY;
  return part;
}

// An eight-sided loft gives broad readable panels with bevels, without smooth
// plastic silhouettes or a large number of individual face meshes.
function hull(parent, name, sections, material) {
  const outline = [[0.68, 1], [-0.68, 1], [-1, 0.52], [-1, -0.52], [-0.68, -1], [0.68, -1], [1, -0.52], [1, 0.52]];
  const vertices = sections.map(({ z, w, h, y = 0 }) => outline.map(([x, sy]) => [x * w, sy * h + y, z]));
  const positions = [];
  const uvs = [];
  const triangle = (a, b, c, ta, tb, tc) => { positions.push(...a, ...b, ...c); uvs.push(...ta, ...tb, ...tc); };
  // One continuous strip around the octagonal body, measured in model units.
  // Caps use planar coordinates; neither bevels nor end faces collapse their UVs.
  const perimeter = [0];
  for (let i = 0; i < 8; i++) {
    const a = vertices[0][i]; const b = vertices[0][(i + 1) % 8];
    perimeter.push(perimeter[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  for (let s = 0; s < sections.length - 1; s++) {
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      const a = [perimeter[i], sections[s].z]; const b = [perimeter[i + 1], sections[s].z];
      const c = [perimeter[i + 1], sections[s + 1].z]; const d = [perimeter[i], sections[s + 1].z];
      triangle(vertices[s][i], vertices[s][j], vertices[s + 1][j], a, b, c);
      triangle(vertices[s][i], vertices[s + 1][j], vertices[s + 1][i], a, c, d);
    }
  }
  for (let i = 1; i < 7; i++) {
    const front = [vertices[0][0], vertices[0][i + 1], vertices[0][i]];
    triangle(...front, ...front.map(v => [v[0], v[1]]));
    const last = vertices.length - 1;
    const back = [vertices[last][0], vertices[last][i], vertices[last][i + 1]];
    triangle(...back, ...back.map(v => [v[0], v[1]]));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return mesh(parent, name, geometry, material);
}

// Flat polygon panels retain deliberate hard edges and real, non-overlapping
// glazing. Frame strips and bevels can be merged into a single material draw.
function panelGeometry(polygons) {
  const positions = [], uvs = [];
  for (const polygon of polygons) {
    const points = polygon.map(p => new THREE.Vector3(...p));
    const axisU = points[1].clone().sub(points[0]).normalize();
    const normal = axisU.clone().cross(points[2].clone().sub(points[0])).normalize();
    const axisV = normal.clone().cross(axisU);
    const coordinates = points.map(p => { const relative = p.clone().sub(points[0]); return [relative.dot(axisU), relative.dot(axisV)]; });
    for (let i = 1; i < points.length - 1; i++) for (const index of [0, i, i + 1]) {
      positions.push(...points[index].toArray()); uvs.push(...coordinates[index]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function beam(parent, name, start, end, radius, material) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const part = cylinder(parent, name, radius, direction.length(), material, a.add(b).multiplyScalar(.5).toArray());
  part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return part;
}

function glazedCanopy(parent) {
  const front = [[-.57, .13, -1.095], [-.47, .60, -.72], [.47, .60, -.72], [.57, .13, -1.095]];
  const starboard = [[.57, .13, -1.095], [.47, .60, -.72], [.60, .64, .20], [.885, .16, .22]];
  const port = starboard.map(([x, y, z]) => [-x, y, z]).reverse();
  const glass = [], seams = [], frames = [];
  for (const pane of [front, starboard, port]) {
    const points = pane.map(p => new THREE.Vector3(...p));
    const center = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(.25);
    const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
    const edge = points.map(p => p.clone().lerp(center, .07).addScaledVector(normal, .008));
    const inner = points.map(p => p.clone().lerp(center, .11).addScaledVector(normal, .01));
    glass.push(inner.map(p => p.toArray()));
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      frames.push([points[i], points[j], edge[j], edge[i]].map(p => p.toArray()));
      seams.push([edge[i], edge[j], inner[j], inner[i]].map(p => p.toArray()));
    }
  }
  mesh(parent, 'panoramic-canopy-frame', panelGeometry(frames), palette.ivory);
  mesh(parent, 'canopy-pressure-gaskets', panelGeometry(seams), palette.rubber);
  mesh(parent, 'panoramic-canopy-glass', panelGeometry(glass), palette.glass);
  mesh(parent, 'canopy-armored-roof', panelGeometry([[
    [-.47, .60, -.72], [-.60, .64, .20], [.60, .64, .20], [.47, .60, -.72],
  ]]), palette.white);
  beam(parent, 'windshield-mullion', [0, .148, -1.078], [0, .587, -.728], .011, palette.graphite);
  for (const side of [-1, 1]) {
    beam(parent, `canopy-aft-copper-seal-${side}`, [side * .607, .637, .206], [side * .88, .17, .228], .017, palette.copper);
    beam(parent, `canopy-blue-edge-reflection-${side}`, [side * .49, .568, -.745], [side * .62, .585, .125], .005, palette.glassReflection);
  }
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
  flame.visible = false;
  const jet = mesh(flame, `${name}-plume`, new THREE.ConeGeometry(radius * 0.56, 0.72, 6), palette.exhaust, [0, 0, 0.36]);
  jet.rotation.x = Math.PI / 2;
  return flame;
}

function thrustAmount(thrust, moving) {
  const value = thrust === undefined ? moving : typeof thrust === 'number' ? thrust : Math.hypot(thrust.x || 0, thrust.y || 0, thrust.z || 0);
  return THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
}

function animateJet(jet, amount, time, index, boost = false) {
  jet.visible = amount > .025;
  jet.scale.set(1, 1, Math.max(.01, amount * (boost ? 1.25 : .85)) * (1 + Math.sin(time * 24 + index * 1.6) * .07));
}

// Repeating fasteners share one draw call and one very small geometry.
function fasteners(parent, name, points, radius = .022) {
  const bolts = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(radius, 0), palette.copper, points.length);
  bolts.name = name;
  const transform = new THREE.Object3D();
  points.forEach((point, index) => {
    transform.position.set(...point);
    transform.updateMatrix();
    bolts.setMatrixAt(index, transform.matrix);
  });
  bolts.castShadow = true;
  bolts.instanceMatrix.needsUpdate = true;
  parent.add(bolts);
}

export function createShip() {
  const root = new THREE.Group();
  root.name = 'modular-spacecraft';
  root.userData.kind = 'ship';
  const visual = group(root, 'ship-visual');
  visual.scale.setScalar(SHIP_SCALE);
  const cockpit = group(visual, 'module-cockpit', [0, 0, -1.5]);
  const body = group(visual, 'module-body', [0, 0, 0.7]);
  const propulsion = group(visual, 'module-propulsion', [0, 0, 2.3]);
  const modules = [cockpit, body, propulsion];
  const anchors = modules.map(part => part.position.clone());
  modules.forEach((part, i) => { part.userData = { stage: i + 1, module: ['Cabina', 'Hábitat', 'Propulsión'][i] }; });
  root.userData.modules = modules.map(part => part.name);

  hull(cockpit, 'cockpit-pressure-shell', [
    { z: -1.1, w: .60, h: .285, y: -.135 },
    { z: -.48, w: .86, h: .365, y: -.205 },
    { z: .25, w: .90, h: .39, y: -.23 },
    { z: .49, w: .90, h: .625 },
    { z: .78, w: .90, h: .63 },
    { z: 1, w: .69, h: .50 },
  ], palette.ivory);
  glazedCanopy(cockpit);
  hull(cockpit, 'cockpit-copper-coupling-band', [
    { z: .91, w: .785, h: .562 }, { z: 1.04, w: .722, h: .524 },
  ], palette.copper);
  box(cockpit, 'nose-dark-inset', [0.43, 0.13, 0.035], palette.graphite, [0, -0.13, -1.107]);
  box(cockpit, 'nose-navigation-light', [0.22, 0.028, 0.045], palette.cyan, [0, -0.12, -1.13]);
  ring(cockpit, 'cockpit-docking-ring', 0.66, 0.055, palette.copper, [0, 0, 1.04], 0.79);
  cylinder(cockpit, 'cockpit-docking-collar', 0.56, 0.36, palette.graphite, [0, 0, 1.12], true);
  cylinder(cockpit, 'docking-pressure-bulkhead', .47, .018, palette.ivory, [0, 0, 1.305], true);
  ring(cockpit, 'docking-bulkhead-seal', .415, .004, palette.seam, [0, 0, 1.316]);
  box(cockpit, 'docking-bulkhead-crossbar', [.45, .078, .006], palette.copper, [0, -.03, 1.317]);
  box(cockpit, 'docking-bulkhead-telemetry', [.18, .055, .006], palette.teal, [0, .22, 1.317]);
  for (const side of [-1, 1]) {
    const chin = box(cockpit, `nose-chin-armor-${side}`, [.32, .075, .60], palette.white, [side * .46, -.375, -.55]);
    chin.rotation.z = side * .25;
    box(cockpit, `cockpit-side-panel-${side}`, [0.055, 0.24, 0.66], palette.teal, [side * 0.897, -0.12, 0.28]);
    box(cockpit, `cockpit-panel-sill-${side}`, [0.07, 0.04, 0.65], palette.copper, [side * 0.899, -0.265, 0.28]);
    box(cockpit, `cockpit-aft-seam-${side}`, [0.026, 0.45, 0.028], palette.graphite, [side * 0.893, 0, 0.67]);
    box(cockpit, `cockpit-running-light-${side}`, [0.06, 0.055, 0.16], palette.cyan, [side * 0.9, 0.07, 0.45]);
    const skid = box(cockpit, `cockpit-landing-skid-${side}`, [0.15, 0.09, 1.12], palette.graphite, [side * 0.49, -0.66, 0.1]);
    skid.rotation.x = -0.035;
    box(cockpit, `cockpit-skid-strut-${side}`, [0.1, 0.21, 0.12], palette.copper, [side * 0.49, -0.53, 0.4]);
  }
  const podJets = [-1, 1].map(side => engine(cockpit, `pod-maneuver-engine-${side}`, [side * 0.59, -0.32, 0.77], 0.12, 0.23));

  // The visible starboard airlock matches the shared tether/hatch anchors.
  const airlock = group(cockpit, 'starboard-airlock', [.94, .02, .5]);
  airlock.rotation.y = Math.PI / 2;
  cylinder(airlock, 'airlock-pressure-door', .34, .055, palette.graphite, [0, 0, 0], true);
  ring(airlock, 'airlock-copper-seal', .305, .028, palette.copper, [0, 0, .045]);
  cylinder(airlock, 'airlock-inner-door', .258, .035, palette.ivory, [0, 0, .047], true);
  cylinder(airlock, 'airlock-viewport-rim', .10, .04, palette.graphite, [0, .09, .065], true);
  cylinder(airlock, 'airlock-viewport', .073, .045, palette.glass, [0, .09, .078], true);
  box(airlock, 'airlock-handle', [.14, .033, .042], palette.copper, [.025, -.10, .085]);
  box(airlock, 'tether-reel-cover', [.12, .15, .08], palette.teal, [-.22, -.10, .10]);
  fasteners(airlock, 'airlock-fasteners', [[-.21, .20, .075], [.21, .20, .075], [-.21, -.20, .075], [.21, -.20, .075]], .025);

  const maneuverJets = [];
  for (const side of [-1, 1]) {
    const mount = group(cockpit, `rcs-cluster-${side}`, [side * .77, -.25, -.45]);
    mount.rotation.y = side * Math.PI / 2;
    maneuverJets.push(engine(mount, `lateral-rcs-${side}`, [0, 0, 0], .07, .10));
    const brakingMount = group(cockpit, `brake-cluster-${side}`, [side * .45, -.26, -.78]);
    brakingMount.rotation.y = Math.PI;
    maneuverJets.push(engine(brakingMount, `braking-rcs-${side}`, [0, 0, 0], .058, .10));
    box(cockpit, `cockpit-service-hatch-${side}`, [.035, .19, .29], palette.graphite, [side * .848, -.27, -.17]);
    box(cockpit, `cockpit-service-inset-${side}`, [.044, .13, .19], palette.teal, [side * .85, -.27, -.17]);
    fasteners(cockpit, `cockpit-panel-fasteners-${side}`, [[side * .906, .18, .69], [side * .906, -.22, .69], [side * .857, -.31, -.30], [side * .857, -.31, -.03]]);
  }

  hull(body, 'habitat-pressure-shell', [
    { z: -0.94, w: 0.7, h: 0.54 },
    { z: -0.73, w: 1.0, h: 0.68 },
    { z: 0.68, w: 1.0, h: 0.68 },
    { z: 0.9, w: 0.71, h: 0.54 },
  ], palette.ivory);
  for (const z of [-.76, .71]) {
    hull(body, `habitat-octagonal-belt-${z}`, [
      { z: z - .045, w: 1.018, h: .692 }, { z: z + .045, w: 1.018, h: .692 },
    ], palette.graphite);
  }
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
    for (const z of [-.72, .69]) {
      box(body, `habitat-frame-${side}-${z}`, [.07, .54, .065], palette.ivory, [side * 1.024, .035, z]);
      box(body, `habitat-frame-seal-${side}-${z}`, [.078, .36, .025], palette.copper, [side * 1.033, .025, z]);
    }
    fasteners(body, `habitat-panel-fasteners-${side}`, [-.60, -.19, .23, .60].flatMap(z => [[side * 1.047, .315, z], [side * 1.01, -.48, z]]));
  }
  // Dark collars and copper locks keep the construction narrative readable.
  for (const z of [-.96, .93]) {
    cylinder(body, `habitat-transfer-collar-${z}`, .59, .15, palette.graphite, [0, 0, z], true);
    for (const side of [-1, 1]) {
      box(body, `habitat-coupling-lock-${z}-${side}`, [.15, .20, .20], palette.copper, [side * .63, -.07, z]);
    }
  }

  hull(propulsion, 'propulsion-core-shell', [
    { z: -0.73, w: 0.71, h: 0.54 },
    { z: -0.5, w: 0.87, h: 0.62 },
    { z: 0.52, w: 0.76, h: 0.56 },
    { z: 0.65, w: 0.61, h: 0.46 },
  ], palette.ivory);
  hull(propulsion, 'propulsion-octagonal-belt', [
    { z: -.46, w: .885, h: .63 }, { z: -.36, w: .885, h: .63 },
  ], palette.graphite);
  box(propulsion, 'reactor-spine', [0.5, 0.14, 0.91], palette.graphite, [0, 0.65, 0]);
  box(propulsion, 'reactor-power-strip', [0.17, 0.03, 0.58], palette.cyan, [0, 0.736, -0.04]);
  const mainJets = [];
  for (const side of [-1, 1]) {
    const wing = fin(propulsion, `swept-wing-${side}`, [[0.62, -0.44], [1.15, -0.24], [1.70, 0.44], [1.64, 0.69], [0.6, 0.46]], 0.1, palette.ivory, [0, -0.18, 0]);
    wing.scale.x = side;
    const inlay = fin(propulsion, `wing-teal-inlay-${side}`, [[0.93, -0.25], [1.10, -0.12], [1.52, 0.44], [1.35, 0.45]], 0.025, palette.teal, [0, -0.09, 0]);
    inlay.scale.x = side;
    box(propulsion, `wingtip-running-light-${side}`, [0.1, 0.055, 0.14], palette.cyan, [side * 1.62, -0.09, 0.47]);
    box(propulsion, `engine-mount-${side}`, [0.32, 0.38, 0.86], palette.graphite, [side * 0.82, -0.12, 0.22]);
    mainJets.push(engine(propulsion, `main-engine-${side}`, [side * 0.9, -0.13, 0.52], 0.29, 0.56));
    box(propulsion, `engine-armored-cowl-${side}`, [0.42, 0.12, 0.55], palette.ivory, [side * 0.9, 0.21, 0.39]);
    const armor = box(propulsion, `reactor-lower-teal-armor-${side}`, [.068, .24, .50], palette.teal, [side * .786, -.275, .02]);
    armor.rotation.z = side * .24;
    for (let vent = 0; vent < 3; vent++) {
      box(propulsion, `reactor-vent-${side}-${vent}`, [0.045, 0.25, 0.085], palette.graphite, [side * 0.858, 0.05, -0.31 + vent * 0.16]);
    }
    fasteners(propulsion, `engine-cowl-fasteners-${side}`, [[side * .76, .28, .18], [side * 1.04, .28, .18], [side * .76, .28, .60], [side * 1.04, .28, .60]]);
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
  const localThrust = new THREE.Vector3();
  const inverseRotation = new THREE.Quaternion();
  function update(time, { moving = 0, boost = false, thrust, braking = false } = {}) {
    lastTime = time;
    const motion = thrustAmount(thrust, moving);
    let forward = motion;
    let lateral = motion * .2;
    if (thrust && typeof thrust === 'object') {
      inverseRotation.copy(root.quaternion).invert();
      localThrust.copy(thrust).applyQuaternion(inverseRotation);
      forward = THREE.MathUtils.clamp(-localThrust.z, 0, 1);
      lateral = THREE.MathUtils.clamp(Math.hypot(localThrust.x, localThrust.y) + Math.max(0, localThrust.z), 0, 1);
    }
    for (const [part, attachment] of attachments) {
      const progress = Math.min(1, Math.max(0, (time - attachment.started) / duration));
      const ease = 1 - Math.pow(1 - progress, 3);
      part.position.lerpVectors(attachment.start, anchors[attachment.index], ease);
      part.scale.setScalar(0.82 + 0.18 * ease);
      part.rotation.set(0.08 * (1 - ease), (attachment.index === 1 ? -0.24 : 0.24) * (1 - ease), 0.14 * (1 - ease));
      if (progress === 1) attachments.delete(part);
    }
    [...podJets, ...mainJets].forEach((jet, index) => animateJet(jet, braking ? 0 : forward, time, index, boost));
    maneuverJets.forEach((jet, index) => animateJet(jet, braking ? .7 : lateral, time, index));
  }
  return { group: root, setStage, update };
}

export function createAstronaut() {
  const root = new THREE.Group();
  root.name = 'astronaut';
  root.userData.kind = 'astronaut';
  const suit = group(root, 'astronaut-rig');
  box(suit, 'waist-flexible-seal', [0.43, 0.2, 0.31], palette.rubber, [0, 0.82, 0]);
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
  const helmet = mesh(suit, 'faceted-helmet', new THREE.DodecahedronGeometry(0.33, 1), palette.white, [0, 1.58, 0]);
  helmet.scale.set(1, 1.03, 0.98);
  const visor = mesh(suit, 'panoramic-dark-blue-visor', new THREE.SphereGeometry(0.352, 12, 6, Math.PI * 1.05, Math.PI * 0.9, 0.83, 1.47), palette.glass, [0, 1.58, -0.004]);
  visor.scale.set(1.01, 1.02, 1.01);
  mesh(suit, 'visor-upper-copper-edge', new THREE.SphereGeometry(0.36, 9, 1, Math.PI * 1.05, Math.PI * 0.9, 0.81, 0.055), palette.copper, [0, 1.58, -0.004]);
  mesh(suit, 'visor-lower-seal', new THREE.SphereGeometry(0.36, 9, 1, Math.PI * 1.05, Math.PI * .9, 2.245, .055), palette.rubber, [0, 1.58, -.004]);
  mesh(suit, 'visor-sky-reflection', new THREE.SphereGeometry(.358, 4, 1, Math.PI * 1.42, .32, .99, .055), palette.glassReflection, [0, 1.58, -.004]);
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
  cylinder(pack, 'backpack-tether-socket', .058, .045, palette.copper, [0, -.14, .31], true);
  box(pack, 'backpack-top-handle', [.23, .045, .065], palette.copper, [0, .27, .17]);
  fasteners(pack, 'backpack-shell-fasteners', [[-.13, .18, .281], [.13, .18, .281], [-.13, -.17, .281], [.13, -.17, .281]], .012);
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
    mesh(arm, `shoulder-joint-${side}`, new THREE.IcosahedronGeometry(0.145, 0), palette.rubber);
    box(arm, `shoulder-plate-${side}`, [0.26, 0.16, 0.29], palette.ivory, [side * 0.018, -0.015, -0.006]);
    const upperArm = cylinder(arm, `upper-arm-${side}`, .12, .22, palette.ivory, [0, -.18, 0], false, .10);
    upperArm.scale.x = .88;
    const elbow = group(arm, `elbow-pivot-${side}`, [0, -0.32, 0]);
    mesh(elbow, `elbow-seal-${side}`, new THREE.IcosahedronGeometry(0.105, 0), palette.rubber);
    const forearm = cylinder(elbow, `forearm-plate-${side}`, .124, .23, palette.ivory, [0, -.135, -.012], false, .102);
    forearm.scale.x = .88;
    box(elbow, `forearm-teal-inlay-${side}`, [0.12, 0.13, 0.025], palette.teal, [0, -0.125, -0.13]);
    cylinder(elbow, `wrist-copper-lock-${side}`, 0.099, 0.055, palette.copper, [0, -0.26, 0]);
    box(elbow, `glove-${side}`, [0.16, 0.14, 0.18], palette.rubber, [0, -0.345, -0.005]);
    box(elbow, `glove-thumb-${side}`, [0.075, 0.1, 0.09], palette.rubber, [-side * 0.093, -0.325, -0.03]);
    const leg = group(suit, `hip-pivot-${side}`, [side * 0.175, 0.78, 0]);
    const thigh = cylinder(leg, `thigh-armor-${side}`, .155, .30, palette.ivory, [0, -.15, 0], false, .13);
    thigh.scale.x = .88;
    box(leg, `thigh-teal-panel-${side}`, [0.135, 0.17, 0.025], palette.teal, [0, -0.14, -0.149]);
    const knee = group(leg, `knee-pivot-${side}`, [0, -0.345, 0]);
    mesh(knee, `knee-joint-${side}`, new THREE.IcosahedronGeometry(0.13, 0), palette.rubber);
    box(knee, `knee-front-guard-${side}`, [0.17, 0.13, 0.055], palette.copper, [0, 0, -0.135]);
    const shin = cylinder(knee, `shin-armor-${side}`, .14, .26, palette.ivory, [0, -.15, 0], false, .119);
    shin.scale.x = .92;
    cylinder(knee, `ankle-lock-${side}`, 0.116, 0.05, palette.copper, [0, -0.3, 0]);
    box(knee, `boot-${side}`, [0.265, 0.13, 0.35], palette.rubber, [0, -0.36, -0.045]);
    box(knee, `boot-armored-toe-${side}`, [0.245, 0.07, 0.17], palette.ivory, [0, -0.32, -0.115]);
    arms.push(arm);
    forearms.push(elbow);
    legs.push(leg);
    shins.push(knee);
  }
  function update(time, { moving = 0, boost = false, thrust, braking = false } = {}) {
    const motion = thrustAmount(thrust, moving);
    const float = Math.sin(time * .8);
    suit.position.y = .025 + float * .012;
    suit.rotation.x = motion * (boost ? -.22 : -.10);
    suit.rotation.z = Math.sin(time * .53) * .012;
    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? -1 : 1;
      arms[i].rotation.z = -sign * (.24 + (braking ? .08 : 0) + Math.sin(time * .7 + i) * .018);
      arms[i].rotation.x = -.22 - motion * .12 + Math.sin(time * .6 + i) * .025;
      forearms[i].rotation.x = -.43 - motion * .15;
      legs[i].rotation.x = -.12 - motion * .10 + Math.sin(time * .55 + i) * .023;
      shins[i].rotation.x = .38 + motion * .10 + float * .025;
      animateJet(jets[i], braking ? .7 : motion, time, i, boost);
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
  orb.scale.setScalar(COMPANION_SCALE);
  mesh(orb, 'faceted-orb-core', new THREE.IcosahedronGeometry(0.35, 0), palette.graphite);
  const shell = mesh(orb, 'faceted-ivory-shell', new THREE.DodecahedronGeometry(0.37, 0), palette.ivory);
  shell.scale.set(1, 1.03, 0.88);
  cylinder(orb, 'eye-dark-socket', 0.215, 0.08, palette.graphite, [0, 0, -0.303], true);
  ring(orb, 'eye-copper-rim', 0.178, 0.033, palette.copper, [0, 0, -0.355]);
  ring(orb, 'optic-rubber-seal', .217, .017, palette.rubber, [0, 0, -.332]);
  const eye = mesh(orb, 'amber-optic', new THREE.IcosahedronGeometry(0.139, 1), palette.amber, [0, 0, -0.371]);
  eye.scale.z = 0.47;
  const iris = mesh(orb, 'optic-highlight', new THREE.IcosahedronGeometry(0.042, 0), palette.white, [-0.035, 0.03, -0.437]);
  iris.scale.z = 0.3;
  fasteners(orb, 'optic-fasteners', [[-.23, .18, -.275], [.23, .18, -.275], [-.23, -.18, -.275], [.23, -.18, -.275]], .015);
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
    jet.visible = true;
  }
  return { group: root, update };
}

/** Camera-local cockpit: the eye is the origin and the windshield faces -Z.
 * Keep the centre clear so both portrait and landscape can aim through it. */
export function createCockpit() {
  const root = new THREE.Group();
  root.name = 'pilot-cockpit';
  const frame = group(root, 'cockpit-interior');
  frame.position.y = .20;
  const screenMaterial = palette.display;
  const illuminated = palette.readout;
  const warning = palette.warning;

  // Recessed instrument brow sits below the flight sightline.
  hull(frame, 'instrument-brow', [
    { z: -1.32, w: .77, h: .11, y: -.53 },
    { z: -1.08, w: .71, h: .13, y: -.57 },
    { z: -.82, w: .60, h: .11, y: -.64 },
  ], palette.ivory);
  box(frame, 'brow-ivory-trim', [1.36, .034, .055], palette.ivory, [0, -.426, -1.20]);
  box(frame, 'brow-copper-seam', [1.19, .013, .030], palette.copper, [0, -.405, -1.22]);
  box(frame, 'console-lower-teal-apron', [1.06, .13, .14], palette.teal, [0, -.67, -.88]);
  box(frame, 'console-lower-pressure-seal', [.94, .03, .035], palette.rubber, [0, -.727, -.8]);
  box(frame, 'flight-display-surround', [.44, .20, .035], palette.seam, [0, -.54, -.94]);
  box(frame, 'flight-display-glass', [.40, .16, .013], screenMaterial, [0, -.54, -.916]);
  box(frame, 'display-horizon', [.27, .008, .008], illuminated, [0, -.515, -.905]);
  const speedBars = [];
  for (let i = 0; i < 7; i++) {
    speedBars.push(box(frame, `display-speed-${i}`, [.031, .019, .008], illuminated, [-.129 + i * .043, -.567, -.904]));
  }
  const brakeLamp = box(frame, 'brake-indicator', [.045, .012, .01], warning, [.155, -.483, -.903]);
  for (const side of [-1, 1]) {
    box(frame, `side-console-armor-${side}`, [.25, .22, .065], palette.teal, [side * .40, -.47, -.78]);
    box(frame, `side-console-copper-edge-${side}`, [.23, .011, .020], palette.copper, [side * .40, -.345, -.736]);
    const console = box(frame, `side-instrument-panel-${side}`, [.19, .13, .025], screenMaterial, [side * .39, -.56, -.95]);
    console.rotation.z = -side * .06;
    box(frame, `side-readout-${side}`, [.12, .010, .015], illuminated, [side * .39, -.54, -.93]);
    box(frame, `side-secondary-readout-${side}`, [.075, .007, .015], palette.copper, [side * .405, -.58, -.93]);
    const pillar = box(frame, `canopy-pillar-${side}`, [.07, .90, .09], palette.ivory, [side * .77, -.02, -1.40]);
    pillar.rotation.z = -side * .15;
    const seal = box(frame, `canopy-pillar-seal-${side}`, [.022, .87, .10], palette.graphite, [side * .728, -.02, -1.395]);
    seal.rotation.z = -side * .15;
    box(frame, `canopy-lower-joint-${side}`, [.12, .14, .12], palette.copper, [side * .70, -.39, -1.40]);
    const grip = box(frame, `pilot-grip-${side}`, [.06, .15, .09], palette.graphite, [side * .56, -.63, -.75]);
    grip.rotation.z = -side * .22;
    box(frame, `grip-trigger-${side}`, [.038, .025, .02], palette.copper, [side * .55, -.59, -.695]);
  }
  // Instruments sit in front of the solid brow, within the vertical field of view.
  // Mounting them behind its forward lip would leave only blank glass visible.
  for (const part of frame.children) {
    if (/^(flight-display|display-|brake-indicator|side-instrument|side-readout|side-secondary)/.test(part.name)) {
      part.position.z += .18; part.position.y += .09;
    }
  }
  const attitude = ring(frame, 'attitude-ring', .043, .003, illuminated, [-.39, -.442, -.73]);
  box(frame, 'attitude-center', [.055, .003, .007], illuminated, [-.39, -.442, -.724]);
  for (let i = 0; i < 3; i++) box(frame, `systems-status-${i}`, [.013, .018, .008], i === 2 ? warning : illuminated, [.35 + i * .031, -.442, -.725]);
  box(frame, 'canopy-overhead-frame', [1.75, .065, .10], palette.ivory, [0, .52, -1.54]);
  box(frame, 'canopy-overhead-seal', [1.62, .021, .105], palette.graphite, [0, .474, -1.536]);
  root.traverse(part => { if (part.isMesh) { part.castShadow = false; part.receiveShadow = false; } });
  function update(time, { speed = 0, braking = false, aspect = 1.6 } = {}) {
    frame.scale.x = THREE.MathUtils.clamp(aspect / 1.55, .28, 1.4);
    const level = THREE.MathUtils.clamp(speed / 12, 0, 1);
    speedBars.forEach((bar, index) => { bar.visible = index / speedBars.length < level; });
    brakeLamp.visible = braking;
  }
  update(0);
  return { group: root, update };
}

/** The camera owns visibility and world pose. The helmet only touches the
 * perimeter; the hand/tool is deliberately below and right of the target. */
export function createVisorRig() {
  const root = new THREE.Group();
  root.name = 'eva-visor';
  root.visible = false;
  const border = group(root, 'helmet-interior-border');
  const rim = (name, inner, outer, material, z) => mesh(border, name,
    cachedGeometry(`visor-rim:${inner}:${outer}`, () => new THREE.RingGeometry(inner, outer, 8, 1, Math.PI / 8)), material, [0, 0, z]);
  rim('helmet-inner-rubber-seal', .479, .511, palette.rubber, -.95);
  rim('helmet-ivory-shell-edge', .512, .540, palette.ivory, -.953);
  rim('helmet-copper-pressure-ring', .508, .512, palette.copper, -.949);
  for (const side of [-1, 1]) {
    const cheek = box(border, `helmet-cheek-pad-${side}`, [.125, .058, .045], palette.rubber, [side * .307, -.382, -.91]);
    cheek.rotation.z = side * .36;
    const status = box(border, `helmet-status-${side}`, [.033, .005, .008], side < 0 ? palette.readout : palette.warning, [side * .332, -.365, -.883]);
    status.rotation.z = side * .36;
  }

  const tool = group(root, 'eva-hand-tool');
  const wrist = cylinder(tool, 'tool-wrist-copper-lock', .052, .075, palette.copper, [0, -.085, .09]);
  wrist.rotation.x = -.55;
  const forearm = box(tool, 'tool-forearm-armor', [.10, .18, .11], palette.ivory, [0, -.176, .14]);
  forearm.rotation.x = -.55;
  box(tool, 'tool-glove-palm', [.092, .09, .095], palette.rubber, [0, -.035, .07]);
  box(tool, 'tool-grip', [.049, .12, .054], palette.graphite, [0, -.026, .025]);
  box(tool, 'tool-glove-thumb', [.041, .056, .046], palette.rubber, [-.044, -.023, .013]);
  box(tool, 'tool-pressure-body', [.12, .092, .24], palette.ivory, [0, .025, -.044]);
  box(tool, 'tool-teal-side-panel', [.018, .051, .13], palette.teal, [-.067, .028, -.047]);
  box(tool, 'tool-top-service-panel', [.062, .015, .11], palette.graphite, [0, .077, -.045]);
  cylinder(tool, 'tool-copper-nozzle', .045, .085, palette.copper, [0, .025, -.202], true);
  cylinder(tool, 'tool-dark-aperture', .031, .013, palette.seam, [0, .025, -.25], true);
  const indicator = box(tool, 'tool-charge-indicator', [.012, .008, .065], palette.readout, [0, .088, -.03]);
  const brakeStatus = border.getObjectByName('helmet-status-1');
  root.traverse(part => { if (part.isMesh) { part.castShadow = false; part.receiveShadow = false; } });
  function update(time, { speed = 0, aiming = false, interacting = false, braking = false, aspect = 1.6 } = {}) {
    const width = THREE.MathUtils.clamp(Number(aspect) || 1.6, .3, 3);
    border.scale.x = width;
    border.position.y = Math.sin(time * .8) * .0012;
    brakeStatus.material = braking ? palette.warning : palette.readout;
    tool.visible = Boolean(aiming || interacting);
    const portrait = Math.min(1, width / .85);
    tool.scale.setScalar(.78 * portrait);
    tool.position.set(width * .192, -.205, -.63);
    tool.position.y += Math.sin(time * 1.5) * .002 * (1 + Math.min(1, Math.max(0, speed) / 12));
    tool.rotation.set(interacting ? -.1 : .035, -.12, interacting ? -.10 : -.045);
    indicator.material = interacting ? palette.warning : palette.readout;
  }
  update(0);
  return { group: root, update };
}
