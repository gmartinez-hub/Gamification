import * as THREE from '../../vendor/three.module.js';

const PALETTE = {
  navy: 0x101e2d,
  rock: 0x8b98a7,
  ivory: 0xe3e2d5,
  cyan: 0x71e4e3,
  teal: 0x206675,
  copper: 0xd19b62,
  dormant: 0x314856,
};

const TEXTURES = {
  ocean: new URL('../../assets/runtime/three-textures/ocean-world-bright-color.png', import.meta.url).href,
  moon: new URL('../../assets/runtime/three-textures/dark-crater-color.png', import.meta.url).href,
  rock: new URL('../../assets/runtime/three-textures/asteroid-surface-wide-color.png', import.meta.url).href,
};

function randomGenerator(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function surface(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.12, ...options });
}

function mesh(geometry, material, parent, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  parent.add(object);
  return object;
}

function horizontalRing(parent, radius, thickness, material, y = 0, segments = 80) {
  const ring = mesh(new THREE.TorusGeometry(radius, thickness, 5, segments), material, parent, [0, y, 0]);
  ring.rotation.x = Math.PI / 2;
  return ring;
}

// A failed optional texture keeps the already-visible colored material intact.
function loadColorTexture(loader, url, materials, repeat = 1) {
  loader.load(url, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    if (repeat !== 1) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeat, repeat);
    }
    for (const material of materials) {
      material.map = texture;
      material.needsUpdate = true;
    }
  }, undefined, () => {
    // Local assets are cosmetic; exploration also works without them.
  });
}

function addStars(parent, random) {
  const positions = [];
  const colors = [];
  const color = new THREE.Color();
  for (let index = 0; index < 1000; index += 1) {
    const azimuth = random() * Math.PI * 2;
    const elevation = random() * 2 - 1;
    const radius = 100 + random() * 90;
    const circumference = Math.sqrt(1 - elevation * elevation);
    positions.push(Math.cos(azimuth) * circumference * radius, elevation * radius, Math.sin(azimuth) * circumference * radius);
    const brightness = random() < 0.08 ? 0.85 : 0.14 + random() * 0.37;
    color.set(random() < 0.15 ? 0x80d9e1 : 0xdfe8f2).multiplyScalar(brightness);
    colors.push(color.r, color.g, color.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    size: 0.17,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    toneMapped: false,
  }));
  points.name = 'distant-star-field';
  parent.add(points);
}

function addPlanets(parent, loader) {
  const oceanMaterial = surface(0x8ab0c6, {
    roughness: 0.96,
    metalness: 0,
    emissive: 0x163b57,
    emissiveIntensity: 0.16,
  });
  const ocean = mesh(new THREE.SphereGeometry(17, 64, 40), oceanMaterial, parent, [-42, 1, -32]);
  ocean.name = 'ocean-prime';
  ocean.rotation.set(0.08, -0.4, -0.15);
  loadColorTexture(loader, TEXTURES.ocean, [oceanMaterial]);

  const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(0x4cbcdf) } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 positionView = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -positionView.xyz;
        gl_Position = projectionMatrix * positionView;
      }
    `,
    fragmentShader: `
      uniform vec3 tint;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float edge = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
        gl_FragColor = vec4(tint, pow(edge, 4.5) * 0.20);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  const atmosphere = mesh(new THREE.SphereGeometry(17.45, 48, 32), atmosphereMaterial, parent);
  atmosphere.position.copy(ocean.position);
  atmosphere.name = 'ocean-atmosphere';

  const moonMaterial = surface(0x626f80, { roughness: 1, metalness: 0, emissive: 0x0c1626, emissiveIntensity: 0.2 });
  const moon = mesh(new THREE.IcosahedronGeometry(7.4, 3), moonMaterial, parent, [27, -1, -45]);
  moon.name = 'far-dark-moon';
  moon.rotation.set(0.4, 1.8, 0.2);
  loadColorTexture(loader, TEXTURES.moon, [moonMaterial]);

  return { ocean, moon };
}

function addAsteroids(parent, rockMaterial, random) {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const belt = new THREE.InstancedMesh(geometry, rockMaterial, 220);
  belt.name = 'outer-asteroid-belt';
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  for (let index = 0; index < belt.count; index += 1) {
    // Most debris stays behind and below the playable flight plane.
    const angle = random() * Math.PI * 2;
    const distance = 31 + random() * 29;
    const scale = 0.20 + random() ** 2 * 1.45;
    transform.position.set(Math.cos(angle) * distance, -8 - random() * 9, Math.sin(angle) * distance * 0.60 - 9);
    transform.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    transform.scale.set(scale * (0.7 + random()), scale * (0.5 + random()), scale * (0.6 + random()));
    transform.updateMatrix();
    belt.setMatrixAt(index, transform.matrix);
    color.set(random() < 0.17 ? 0x89929a : 0x65717f).multiplyScalar(0.55 + random() * 0.4);
    belt.setColorAt(index, color);
  }
  belt.instanceMatrix.needsUpdate = true;
  parent.add(belt);

  const foreground = [];
  const placements = [
    [-19, -4.8, 9, 3.2],
    [17, -4, 15, 2.4],
    [-11, -6, 17, 2.0],
    [23, -7, -9, 2.7],
    [-17, -5, -13, 1.6],
    [8, -5.5, -19, 1.6],
  ];
  for (const [x, y, z, size] of placements) {
    const rock = mesh(geometry, rockMaterial, parent, [x, y, z]);
    rock.scale.set(size, size * 0.67, size * 0.82);
    rock.rotation.set(random() * 3, random() * 3, random() * 3);
    foreground.push({ object: rock, baseY: y, baseRotation: rock.rotation.y, phase: random() * Math.PI * 2 });
  }
  return foreground;
}

function addPlatform(parent, materials) {
  const platform = new THREE.Group();
  platform.name = 'central-assembly-platform';
  platform.position.set(0, 0, 4);
  parent.add(platform);

  const base = mesh(new THREE.IcosahedronGeometry(1, 1), materials.rock, platform, [0, -2.9, 0]);
  base.scale.set(6.0, 2.7, 5.3);
  base.rotation.y = 0.25;
  const underDeck = mesh(new THREE.CylinderGeometry(4.5, 3.5, 0.7, 12), materials.navy, platform, [0, -0.5, 0]);
  underDeck.receiveShadow = true;
  const deck = mesh(new THREE.CylinderGeometry(4.2, 4.45, 0.24, 12), materials.deck, platform, [0, -0.13, 0]);
  deck.receiveShadow = true;
  horizontalRing(platform, 3.78, 0.035, materials.cyan, 0.005, 72);
  horizontalRing(platform, 1.85, 0.018, materials.line, 0.015, 64);

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const marker = mesh(new THREE.BoxGeometry(0.12, 0.025, index % 3 === 0 ? 0.54 : 0.23), materials.copper, platform,
      [Math.sin(angle) * 3.5, 0.02, Math.cos(angle) * 3.5]);
    marker.rotation.y = angle;
    if (index % 3 === 0) {
      const support = mesh(new THREE.BoxGeometry(0.42, 0.5, 0.85), materials.navy, platform,
        [Math.sin(angle) * 4.23, -0.15, Math.cos(angle) * 4.23]);
      support.rotation.y = angle;
      mesh(new THREE.BoxGeometry(0.18, 0.10, 0.32), materials.cyan, support, [0, 0.28, 0]);
    }
  }

  // Radial inlays read as a landing/assembly pad without a floor or grid.
  const seamPoints = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    seamPoints.push(new THREE.Vector3(Math.sin(angle) * 2.05, 0.008, Math.cos(angle) * 2.05));
    seamPoints.push(new THREE.Vector3(Math.sin(angle) * 3.3, 0.008, Math.cos(angle) * 3.3));
  }
  platform.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seamPoints),
    new THREE.LineBasicMaterial({ color: 0x567079, transparent: true, opacity: 0.5 })));
}

function createBeacon(parent, materials, x, z, index) {
  const group = new THREE.Group();
  group.name = `beacon-${index + 1}`;
  group.position.set(x, 0, z);
  parent.add(group);

  const rock = mesh(new THREE.IcosahedronGeometry(1, 1), materials.rock, group, [0, -2.05, 0]);
  rock.scale.set(2.65, 1.4, 2.25);
  rock.rotation.set(0.13, index * 1.71, 0.07);

  mesh(new THREE.CylinderGeometry(1.25, 1.47, 0.28, 8), materials.navy, group, [0, -0.61, 0]);
  mesh(new THREE.CylinderGeometry(1.16, 1.24, 0.14, 8), materials.deck, group, [0, -0.40, 0]);
  const indicatorMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.dormant, toneMapped: false });
  horizontalRing(group, 1.16, 0.037, indicatorMaterial, -0.30, 48);
  const orbit = horizontalRing(group, 1.8, 0.013, indicatorMaterial, -0.35, 64);

  mesh(new THREE.CylinderGeometry(0.27, 0.47, 0.28, 6), materials.copper, group, [0, -0.18, 0]);
  mesh(new THREE.CylinderGeometry(0.21, 0.30, 0.9, 6), materials.navy, group, [0, 0.36, 0]);
  mesh(new THREE.CylinderGeometry(0.42, 0.24, 0.18, 6), materials.ivory, group, [0, 0.90, 0]);
  horizontalRing(group, 0.39, 0.035, indicatorMaterial, 1.00, 32);
  for (let tick = 0; tick <= index; tick += 1) {
    const marker = mesh(new THREE.BoxGeometry(0.11, 0.03, 0.31), indicatorMaterial, group,
      [(tick - index / 2) * 0.24, -0.31, 0.88]);
    marker.name = 'beacon-number-mark';
  }

  const gem = new THREE.Group();
  gem.name = 'collectible-core';
  gem.position.y = 1.8;
  group.add(gem);
  const crystal = mesh(new THREE.OctahedronGeometry(0.6, 0), surface(0x9af9ed, {
    emissive: 0x39c4c8,
    emissiveIntensity: 0.8,
    metalness: 0.22,
    roughness: 0.18,
    flatShading: true,
  }), gem);
  crystal.scale.set(0.72, 1.12, 0.72);
  const crystalEdges = new THREE.LineSegments(new THREE.EdgesGeometry(crystal.geometry),
    new THREE.LineBasicMaterial({ color: 0xd5ffec, transparent: true, opacity: 0.65, toneMapped: false }));
  crystalEdges.scale.copy(crystal.scale);
  gem.add(crystalEdges);

  const halo = horizontalRing(group, 0.90, 0.018, indicatorMaterial, 1.45, 48);
  const light = new THREE.PointLight(PALETTE.cyan, 1.5, 5, 2);
  light.position.y = 1.6;
  group.add(light);

  return {
    id: group.name,
    group,
    position: new THREE.Vector3(x, 1.6, z),
    gem,
    indicatorMaterial,
    halo,
    orbit,
    light,
    status: 'dormant',
    phase: index * 1.8,
  };
}

function addRoutes(parent, beacons) {
  const routes = [];
  let previous = new THREE.Vector3(-4.3, -0.36, 4);
  for (const [index, beacon] of beacons.entries()) {
    const target = new THREE.Vector3(beacon.position.x, -0.36, beacon.position.z);
    const direction = target.clone().sub(previous).normalize();
    const start = previous.clone().addScaledVector(direction, index === 0 ? 0.15 : 2.1);
    const end = target.clone().addScaledVector(direction, -2.1);
    const midpoint = start.clone().lerp(end, 0.5);
    midpoint.z -= index === 1 ? 1.5 : 0.4;
    const curve = new THREE.QuadraticBezierCurve3(start, midpoint, end);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(56)),
      new THREE.LineDashedMaterial({ color: PALETTE.dormant, dashSize: 0.19, gapSize: 0.21, transparent: true, opacity: 0.38 }));
    line.name = `route-to-${beacon.id}`;
    line.computeLineDistances();
    parent.add(line);
    routes.push(line);
    previous = target;
  }
  return routes;
}

/** Build the set dressing. Actor motion and the camera remain owned by main.js. */
export function createEnvironment(scene) {
  const root = new THREE.Group();
  root.name = 'low-poly-environment';
  scene.add(root);
  const loader = new THREE.TextureLoader();
  const random = randomGenerator(712069);
  const materials = {
    rock: surface(PALETTE.rock, {
      flatShading: true,
      roughness: 1,
      metalness: 0.04,
      emissive: 0x1a2b40,
      emissiveIntensity: 0.34,
    }),
    navy: surface(PALETTE.navy, { roughness: 0.62, metalness: 0.32 }),
    deck: surface(0x536874, { roughness: 0.73, metalness: 0.3 }),
    ivory: surface(PALETTE.ivory, { roughness: 0.65 }),
    copper: surface(PALETTE.copper, { metalness: 0.55, roughness: 0.45 }),
    cyan: new THREE.MeshBasicMaterial({ color: PALETTE.cyan, toneMapped: false }),
    line: new THREE.MeshBasicMaterial({ color: 0x718d93, transparent: true, opacity: 0.5 }),
  };
  loadColorTexture(loader, TEXTURES.rock, [materials.rock]);
  addStars(root, random);
  const planets = addPlanets(root, loader);
  const foreground = addAsteroids(root, materials.rock, random);
  addPlatform(root, materials);
  const beacons = [[-10, 0], [5, -12], [14, 2]].map(([x, z], index) => createBeacon(root, materials, x, z, index));
  const routes = addRoutes(root, beacons);

  function setProgress(collectedCount) {
    const count = THREE.MathUtils.clamp(Math.floor(Number(collectedCount) || 0), 0, beacons.length);
    beacons.forEach((beacon, index) => {
      const completed = index < count;
      const active = index === count;
      beacon.status = completed ? 'collected' : active ? 'active' : 'dormant';
      beacon.group.userData.status = beacon.status;
      beacon.gem.visible = active;
      beacon.halo.visible = active;
      beacon.indicatorMaterial.color.set(completed ? PALETTE.copper : active ? PALETTE.cyan : PALETTE.dormant);
      beacon.light.color.set(completed ? PALETTE.copper : PALETTE.cyan);
      beacon.light.intensity = active ? 1.5 : completed ? 0.35 : 0;
      routes[index].material.color.set(completed ? PALETTE.copper : active ? PALETTE.cyan : PALETTE.dormant);
      routes[index].material.opacity = active ? 0.66 : completed ? 0.28 : 0.24;
    });
  }

  function update(time) {
    planets.ocean.rotation.y = -0.4 + time * 0.004;
    planets.moon.rotation.y = 1.8 + time * 0.008;
    for (const item of foreground) {
      item.object.rotation.y = item.baseRotation + time * 0.015;
      item.object.position.y = item.baseY + Math.sin(time * 0.2 + item.phase) * 0.14;
    }
    for (const beacon of beacons) {
      beacon.gem.rotation.y = time * 0.52 + beacon.phase;
      beacon.gem.position.y = 1.80 + Math.sin(time * 1.5 + beacon.phase) * 0.16;
      beacon.halo.rotation.z = time * 0.3;
      const pulse = 1 + Math.sin(time * 1.8 + beacon.phase) * 0.035;
      beacon.orbit.scale.setScalar(beacon.status === 'active' ? pulse : 1);
      if (beacon.status === 'active') beacon.light.intensity = 1.5 + Math.sin(time * 2.1) * 0.3;
    }
  }

  setProgress(0);
  return { beacons, update, setProgress };
}
