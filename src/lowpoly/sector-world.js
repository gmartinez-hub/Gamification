import * as THREE from '../../vendor/three.module.js';
import { sampleHazard } from './hazards.js';

const TEXTURES = {
  ocean: new URL('../../assets/runtime/lowpoly-textures/ocean.jpg', import.meta.url).href,
  moon: new URL('../../assets/runtime/lowpoly-textures/moon.jpg', import.meta.url).href,
  moonNormal: new URL('../../assets/runtime/lowpoly-textures/moon-normal.png', import.meta.url).href,
  rock: new URL('../../assets/runtime/lowpoly-textures/rock.jpg', import.meta.url).href,
  nebula: new URL('../../assets/runtime/lowpoly-textures/nebula.jpg', import.meta.url).href,
};

const BIOMES = {
  nereida: {
    planet: 0xb9d9f9, atmosphere: 0x4aa9fa, rock: 0x817362, accent: 0x73e5de, texture: 'ocean',
    sky: 0x0a1425, haze: 0x223a62, warmHaze: 0x71513a, sun: 0xffd5a0, fill: 0x93cbdc, exposure: 1.02,
    planetPosition: [400, -30, -160], planetRadius: 138, moonPosition: [-188, 126, -470], moonRadius: 29,
  },
  vesper: {
    planet: 0x9f99b4, atmosphere: 0x867ac5, rock: 0x595166, accent: 0xb9a0ee, texture: 'moon',
    sky: 0x070919, haze: 0x40315b, warmHaze: 0x213f53, sun: 0xccd8ff, fill: 0x9584c9, exposure: 1.08,
    planetPosition: [-150, 75, -405], planetRadius: 100, moonPosition: [230, -35, -520], moonRadius: 26,
  },
  umbra: {
    planet: 0x574644, atmosphere: 0xe88162, rock: 0x493c3c, accent: 0xed9ab3, texture: 'moon',
    sky: 0x0c0914, haze: 0x472740, warmHaze: 0x773e29, sun: 0xffb488, fill: 0x9d84ac, exposure: 1.05,
    planetPosition: [148, -45, -405], planetRadius: 130, moonPosition: [-190, 132, -540], moonRadius: 18,
  },
};

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
  const skyScene = new THREE.Scene();
  skyScene.name = 'distant-celestial-layer';
  const skyCamera = new THREE.PerspectiveCamera(52, 1, 1, 1600);
  const lighting = { sun: 0xffd5a0, fill: 0x93cbdc, exposure: 1.02 };
  const celestial = new THREE.Group();
  skyScene.add(celestial);
  const skySun = new THREE.DirectionalLight(0xffe3c4, 3.1);
  skySun.position.set(-180, 170, 200);
  const skyFill = new THREE.HemisphereLight(0x698bad, 0x010209, .7);
  skyScene.add(skySun, skyFill);
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
  let clouds;
  let dust;
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
  function mineral(color, floor = .78, contrast = .65) {
    const material = surface(color, { roughness: .94, metalness: 0 });
    // Reuse the original rock asset as restrained mineral variation, without its
    // old magenta/cyan paint turning every background island into an objective.
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec3 grain = texture2D(map, vMapUv).rgb;
          float mineralValue = dot(grain, vec3(.2126,.7152,.0722));
          diffuseColor.rgb *= ${floor.toFixed(2)} + mineralValue * ${contrast.toFixed(2)};
        #endif
      `);
    };
    material.customProgramCacheKey = () => `mineral-luminance-v1:${floor}:${contrast}`;
    return material;
  }
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
  function texture(name, materialList, { slot = 'map', repeat = 1, bump = 0, onLoad } = {}) {
    // TextureLoader creates an HTML image. Geometry also works in Node and on
    // browsers where an optional texture fails to load.
    if (typeof document === 'undefined') return;
    const version = generation;
    const loaded = new THREE.TextureLoader().load(TEXTURES[name], image => {
      if (disposed || version !== generation) return;
      image.colorSpace = slot === 'normalMap' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      image.anisotropy = 2;
      image.wrapS = THREE.RepeatWrapping;
      if (repeat > 1) image.wrapT = THREE.RepeatWrapping;
      image.repeat.set(repeat, repeat);
      let height;
      if (bump) {
        // Reuse the image data with a linear interpretation for shallow surface relief.
        height = own(image.clone()); height.colorSpace = THREE.NoColorSpace; height.needsUpdate = true;
      }
      for (const material of materialList) {
        material[slot] = image;
        if (height) { material.bumpMap = height; material.bumpScale = bump; }
        if (slot === 'normalMap') material.normalScale.set(.17, .17);
        material.needsUpdate = true;
      }
      onLoad?.(image);
    }, undefined, () => {});
    own(loaded);
  }
  function clearSector() {
    generation++;
    for (const resource of resources) resource.dispose();
    resources.clear();
    for (const group of [background, playable, beacon, gem, gate, celestial]) group.clear();
    clouds = undefined; dust = undefined;
    targets.length = 0;
    hazards.length = 0;
    gateRings = [];
  }

  function createBackground(random) {
    // A separate celestial scene makes a short EVA traverse read as metres, not a planetary orbit.
    skyScene.background = new THREE.Color(sectorPalette.sky);
    const nebula = own(new THREE.ShaderMaterial({
      uniforms: {
        base: { value: new THREE.Color(sectorPalette.sky) },
        cool: { value: new THREE.Color(sectorPalette.haze) },
        warm: { value: new THREE.Color(sectorPalette.warmHaze) },
        skyMap: { value: null }, skyReady: { value: 0 },
      },
      vertexShader: `varying vec3 direction; varying vec2 skyUV; void main(){ direction = normalize(position); skyUV = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `
        uniform vec3 base; uniform vec3 cool; uniform vec3 warm; uniform sampler2D skyMap; uniform float skyReady;
        varying vec3 direction; varying vec2 skyUV;
        void main(){
          vec3 d = normalize(direction);
          float bands = sin(d.x * 13. + d.y * 7. + sin(d.z * 9.)) * .5 + .5;
          float wisps = sin(d.y * 32. + d.x * 11. + sin(d.z * 21.) * 2.) * .5 + .5;
          float belt = pow(max(0., 1. - abs(d.y + d.x * .3 - .16)), 10.);
          float dawn = pow(max(0., dot(d, normalize(vec3(.4,.18,-.8)))), 12.);
          vec3 color = base + cool * belt * (.05 + .16 * bands * wisps) + warm * dawn * .34;
          if (skyReady > .5) {
            vec3 archiveCloud = texture2D(skyMap, vec2(fract(skyUV.x + .18), skyUV.y)).rgb;
            color += archiveCloud * mix(vec3(.65), cool * 4., .4) * .22;
          }
          gl_FragColor = vec4(color, 1.);
        }`,
      side: THREE.BackSide, depthWrite: false,
    }));
    const dome = addMesh(celestial, geometry(THREE.SphereGeometry, 1050, 24, 16), nebula);
    dome.name = 'nebula-sky'; dome.renderOrder = -20;
    texture('nebula', [], { onLoad: image => { nebula.uniforms.skyMap.value = image; nebula.uniforms.skyReady.value = 1; } });

    const stars = [], colors = [];
    const starColor = new THREE.Color();
    for (let i = 0; i < 1250; i++) {
      const azimuth = random() * Math.PI * 2;
      const elevation = random() * 2 - 1;
      const distance = 680 + random() * 180;
      const circumference = Math.sqrt(1 - elevation * elevation);
      stars.push(Math.cos(azimuth) * circumference * distance, elevation * distance, Math.sin(azimuth) * circumference * distance);
      starColor.set(i % 11 === 0 ? sectorPalette.accent : i % 17 === 0 ? 0xffc697 : 0xd7e8ff).multiplyScalar(.2 + random() * .62);
      colors.push(starColor.r, starColor.g, starColor.b);
    }
    const starGeometry = own(new THREE.BufferGeometry());
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const starField = new THREE.Points(starGeometry, own(new THREE.PointsMaterial({ size: 1.25, vertexColors: true, transparent: true, opacity: .85, depthWrite: false, toneMapped: false })));
    starField.name = 'distant-stars'; starField.renderOrder = -10;
    celestial.add(starField);

    const planetMaterial = sectorPalette.texture === 'ocean'
      ? surface(sectorPalette.planet, { roughness: 1, metalness: 0, flatShading: false, emissive: sectorPalette.atmosphere, emissiveIntensity: .018 })
      : mineral(sectorPalette.planet, .38, 1.45);
    if (sectorPalette.texture === 'ocean') {
      planetMaterial.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #ifdef USE_MAP
            vec3 oceanColor = texture2D(map, vMapUv).rgb * vec3(.88,.96,1.03);
            diffuseColor.rgb *= mix(vec3(.06,.15,.28), oceanColor, .86);
          #endif
        `);
      };
      planetMaterial.customProgramCacheKey = () => 'natural-ocean-v2';
    }
    planetMaterial.flatShading = false;
    const radius = sectorPalette.planetRadius;
    primaryPlanet = addMesh(celestial, geometry(THREE.SphereGeometry, radius, 64, 40), planetMaterial, sectorPalette.planetPosition);
    primaryPlanet.name = 'biome-planet'; primaryPlanet.rotation.z = -.18;
    texture(sectorPalette.texture, [planetMaterial], {
      onLoad: image => {
        if (clouds) { clouds.material.uniforms.cloudMap.value = image; clouds.material.uniforms.cloudReady.value = 1; }
      },
    });
    if (sectorPalette.texture === 'moon') texture('moonNormal', [planetMaterial], { slot: 'normalMap' });
    const atmosphere = own(new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color(sectorPalette.atmosphere) } },
      vertexShader: `varying vec3 n; varying vec3 v; void main(){ vec4 p = modelViewMatrix * vec4(position,1.0); n = normalize(normalMatrix * normal); v = -p.xyz; gl_Position = projectionMatrix * p; }`,
      fragmentShader: `uniform vec3 tint; varying vec3 n; varying vec3 v; void main(){ float rim = 1.0 - abs(dot(normalize(n), normalize(v))); gl_FragColor = vec4(tint, pow(rim, 5.) * .48); }`,
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    }));
    const halo = addMesh(celestial, geometry(THREE.SphereGeometry, radius * 1.018, 48, 32), atmosphere);
    halo.position.copy(primaryPlanet.position);
    if (currentLayout.biomeId === 'nereida') {
      const cloudMaterial = own(new THREE.ShaderMaterial({
        uniforms: { cloudMap: { value: null }, cloudReady: { value: 0 } },
        vertexShader: `varying vec2 cloudUV; varying vec3 n; void main(){cloudUV=uv;n=normalMatrix*normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform sampler2D cloudMap; uniform float cloudReady; varying vec2 cloudUV; varying vec3 n; void main(){
          vec3 archivedCloud=texture2D(cloudMap,cloudUV).rgb;
          float cloud=smoothstep(.32,.72,min(min(archivedCloud.r,archivedCloud.g),archivedCloud.b))*.13*cloudReady;
          float daylight=.2+.8*max(0.,dot(normalize(n),normalize(vec3(-.5,.6,.8))));
          gl_FragColor=vec4(vec3(.86,.93,1.)*daylight,cloud);
        }`, transparent: true, depthWrite: false,
      }));
      clouds = addMesh(celestial, geometry(THREE.SphereGeometry, radius * 1.003, 48, 32), cloudMaterial);
      clouds.position.copy(primaryPlanet.position); clouds.rotation.z = -.18;
    } else if (currentLayout.biomeId === 'vesper') {
      const ringMaterial = own(new THREE.ShaderMaterial({
        uniforms: { tint: { value: new THREE.Color(0x827794) } },
        vertexShader: `varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform vec3 tint;varying vec3 p;void main(){float r=length(p.xy);float band=.15+.25*(sin(r*1.8)*.5+.5);float edge=smoothstep(146.,153.,r)*(1.-smoothstep(206.,220.,r));gl_FragColor=vec4(tint,band*edge);}`,
        side: THREE.DoubleSide, transparent: true, depthWrite: false,
      }));
      const planetaryRing = addMesh(celestial, geometry(THREE.RingGeometry, 146, 220, 96, 1), ringMaterial);
      planetaryRing.name = 'fractured-orbital-ring'; planetaryRing.position.copy(primaryPlanet.position);
      planetaryRing.rotation.set(1.08, .24, -.55);
    }
    const moonMaterial = mineral(currentLayout.biomeId === 'umbra' ? 0xb8a3a0 : 0xa1a7b1, .38, 1.45);
    moonMaterial.flatShading = false;
    const moon = addMesh(celestial, geometry(THREE.IcosahedronGeometry, sectorPalette.moonRadius, 3), moonMaterial, sectorPalette.moonPosition);
    moon.name = 'distant-moon'; moon.rotation.set(.1, 1.8, .3); texture('moon', [moonMaterial]);
    texture('moonNormal', [moonMaterial], { slot: 'normalMap' });

    // Dust and rocks occupy real metres. This parallax supplies speed cues in inertial flight.
    const dustPoints = [];
    for (let i = 0; i < 190; i++) dustPoints.push((random()-.5)*100, (random()-.5)*55, 30-random()*145);
    const dustGeometry = own(new THREE.BufferGeometry());
    dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustPoints, 3));
    dust = new THREE.Points(dustGeometry, own(new THREE.PointsMaterial({ color: sectorPalette.accent, size: .045, transparent: true, opacity: .23, depthWrite: false })));
    dust.name = 'nearby-space-dust'; background.add(dust);
    createRockFormations(random);
  }

  function rockGeometry(flatTop = false) {
    const shape = geometry(THREE.IcosahedronGeometry, 1, flatTop ? 2 : 1);
    const positions = shape.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const bump = 1 + .12 * Math.sin(x * 17 + y * 13 + z * 23) + .065 * Math.sin(x * 31 - z * 11);
      positions.setXYZ(i, x * bump, flatTop && y > .3 ? .47 + (y - .3) * .15 : y * bump, z * bump);
    }
    shape.computeVertexNormals();
    return shape;
  }

  function createRockFormations(random) {
    const biome = currentLayout.biomeId;
    const transform = new THREE.Object3D();
    const mesa = rockGeometry(biome === 'nereida');
    const formations = own(new THREE.InstancedMesh(mesa, materials.ambientRock, 13));
    formations.name = 'authored-rock-formations';
    const islands = [
      [-58,-49,12,7,10,9], [66,-52,-6,8,11,10],
      [-30,-48,-91,10,15,12], [37,-49,-124,12,17,14], [-42,-54,-159,12,20,14],
      [-98,-11,-142,8,17,13], [110,-19,-184,9,18,15],
      [-65,-65,-202,16,19,17], [58,-67,-224,17,18,19],
      [-124,16,-251,13,25,18], [137,7,-277,17,18,22],
      [-18,-89,-302,23,20,22], [84,-73,-343,23,19,21],
    ];
    for (let i = 0; i < islands.length; i++) {
      const [x,y,z,sx,sy,sz] = islands[i];
      transform.position.set(x,y,z);
      // All forms remain below/beside the flight bounds, even with their detail chunks.
      if (biome === 'vesper') {
        transform.scale.set(sx * .72, sy * .7, sz * 1.25);
        if (y < -20) transform.position.y -= 6;
        transform.rotation.set(.12, .12, x < 0 ? -.25 : .25);
      } else if (biome === 'umbra') {
        transform.scale.set(sx * .7, sy * 1.12, sz * .7);
        transform.position.y -= 12;
        transform.rotation.set(.06, .6, .1);
      } else { transform.scale.set(sx,sy,sz); transform.rotation.set(0,.2+i*.71,0); }
      transform.updateMatrix(); formations.setMatrixAt(i, transform.matrix);
    }
    formations.instanceMatrix.needsUpdate = true; background.add(formations);

    const debris = own(new THREE.InstancedMesh(rockGeometry(), materials.ambientRock, 140));
    debris.name = biome === 'vesper' ? 'diagonal-fracture-belt' : 'decorative-asteroid-belt';
    for (let i = 0; i < debris.count; i++) {
      const side = random() < .5 ? -1 : 1;
      const z = -28 - random() * 300;
      const size = .18 + random() ** 2 * 2.2;
      if (biome === 'vesper') {
        const spread = random() * 2 - 1;
        transform.position.set(side*(70+random()*58), spread*20 + side*17, z);
      } else transform.position.set(side*(43+random()*80), -41-random()*38, z);
      transform.rotation.set(random()*6,random()*6,random()*6);
      transform.scale.set(size,size*(.55+random()*.55),size*(.65+random()*.55));
      transform.updateMatrix(); debris.setMatrixAt(i, transform.matrix);
    }
    debris.instanceMatrix.needsUpdate = true; background.add(debris);

    // Two tones in fractured ledges give the distant forms depth without texture or draw-call cost.
    const chips = own(new THREE.InstancedMesh(geometry(THREE.IcosahedronGeometry, 1, 0), materials.rockEdges, 32));
    chips.name = 'rock-strata';
    for (let i=0;i<chips.count;i++) {
      const source = islands[i % islands.length];
      transform.position.set(source[0]+(random()-.5)*source[3]*1.1, source[1]+(random()-.5)*source[4]*.65, source[2]+(random()-.5)*source[5]*1.1);
      const size = .5 + random()*1.4;
      transform.scale.set(size*1.8,size*.38,size);
      transform.rotation.set(.2,random()*6,(random()-.5)*.3);
      transform.updateMatrix(); chips.setMatrixAt(i,transform.matrix);
    }
    chips.instanceMatrix.needsUpdate = true; background.add(chips);
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
    const record = { id: spec.id, object, position: object.position, radius, kind, spec, previousPosition: object.position.clone(), velocity: new THREE.Vector3() };
    if (isHazard) {
      sampleHazard(spec, 0, record.position, record.velocity);
      record.previousPosition.copy(record.position);
      const trail = new THREE.Line(own(new THREE.BufferGeometry().setFromPoints([
        positionFrom(spec.position).addScaledVector(positionFrom(spec.motion.axis), -spec.motion.amplitude),
        positionFrom(spec.position).addScaledVector(positionFrom(spec.motion.axis), spec.motion.amplitude),
      ])), materials.hazardTrail);
      trail.name = `${spec.id}-trajectory`; playable.add(trail);
    }
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
    const structuralShape = geometry(THREE.TorusGeometry, 9, 0.2, 4, 12);
    const illuminatedShape = geometry(THREE.TorusGeometry, 8.7, 0.045, 3, 48);
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
      transform.position.set(Math.sin(angle) * 9, Math.cos(angle) * 9, 0);
      transform.rotation.z = -angle;
      transform.updateMatrix();
      brackets.setMatrixAt(i, transform.matrix);
    }
    brackets.instanceMatrix.needsUpdate = true;
    gate.add(brackets);
    const guidePoints = [];
    for (const side of [-1, 1]) {
      guidePoints.push(new THREE.Vector3(side * 8.7, -0.35, 0), new THREE.Vector3(side * 8.7 + corridorEnd.x, corridorEnd.y - 0.35, corridorEnd.z));
    }
    const guides = new THREE.LineSegments(own(new THREE.BufferGeometry().setFromPoints(guidePoints)), own(new THREE.LineBasicMaterial({ color: sectorPalette.accent, transparent: true, opacity: 0.22, depthWrite: false })));
    gate.add(guides);
  }

  function load(layout) {
    if (disposed) throw new Error('Cannot load a disposed sector world.');
    clearSector();
    currentLayout = layout;
    sectorPalette = BIOMES[layout.biomeId] || BIOMES.nereida;
    Object.assign(lighting, { sun: sectorPalette.sun, fill: sectorPalette.fill, exposure: sectorPalette.exposure });
    skySun.color.set(sectorPalette.sun); skyFill.color.set(sectorPalette.fill);
    const random = randomForLayout(layout);
    materials = {
      ivory: surface(0xe5e1cd), graphite: surface(0x22333e), copper: surface(0xba8154, { metalness: 0.55 }),
      ambientRock: mineral(sectorPalette.rock),
      rockEdges: surface(new THREE.Color(sectorPalette.rock).multiplyScalar(1.26), { roughness: .96, metalness: 0 }),
      hazardTrail: own(new THREE.LineBasicMaterial({ color: 0xb67957, transparent: true, opacity: .16, depthWrite: false })),
      targetRock: mineral(0x859294),
      hazardRock: mineral(0x765646),
      cyan: surface(0x8de7ef, { emissive: 0x45cbd7, emissiveIntensity: 0.75, roughness: 0.3 }),
      amber: surface(0xffd180, { emissive: 0xffa52d, emissiveIntensity: 0.9, roughness: 0.3 }),
      hazard: surface(0xff8853, { emissive: 0xef4428, emissiveIntensity: 1.2 }),
      gem: surface(0xbbfff0, { emissive: 0x4de0c9, emissiveIntensity: 1.15, metalness: 0.4, roughness: 0.2 }),
      cyanLine: glow(0x7ee6e0, 0.55), amberLine: glow(0xffcd79, 0.6),
      beaconGlow: glow(0x7ff2e6), beaconLine: glow(0x7ff2e6, 0.5), gateLine: glow(0x496976, 0.45),
    };
    createBackground(random);
    texture('rock', [materials.ambientRock, materials.targetRock, materials.hazardRock], { repeat: 2.5, bump: .16 });
    for (const spec of layout.small) createTarget(spec, 'small', random);
    for (const spec of layout.large) createTarget(spec, 'large', random);
    for (const spec of layout.hazards) createTarget(spec, 'hazard', random);
    createBeacon();
    createGem();
    createCorridor();
    sync({ phase: 'scan', destroyed: [] }, 0);
  }

  function sync(state, time = 0, { reducedMotion = false } = {}) {
    if (!currentLayout || disposed) return;
    const destroyed = new Set(state.destroyed);
    const largeVisible = ['large', 'gem', 'return', 'transit', 'complete'].includes(state.phase);
    for (const record of [...targets, ...hazards]) {
      const { object, kind } = record;
      const phase = object.userData.driftPhase;
      record.previousPosition.copy(record.position);
      if (kind === 'hazard') sampleHazard(record.spec, time, record.position, record.velocity);
      else {
        object.position.copy(object.userData.basePosition);
        object.position.x += Math.sin(time * .31 + phase) * .16;
        object.position.y += Math.sin(time * .43 + phase) * .22;
        object.position.z += Math.cos(time * .27 + phase) * .12;
        record.velocity.set(Math.cos(time*.31+phase)*.16*.31, Math.cos(time*.43+phase)*.22*.43, -Math.sin(time*.27+phase)*.12*.27);
      }
      object.userData.body.rotation.y = phase + time * (kind === 'hazard' ? .16 : .07) * (reducedMotion ? .2 : 1);
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
    primaryPlanet.rotation.y = -.4 + time * .00065;
    if (clouds) clouds.rotation.y = -.4 + time * .00092;
    if (dust) dust.rotation.y = reducedMotion ? 0 : Math.sin(time * .015) * .005;
  }

  function updateSky(camera) {
    skyCamera.position.copy(camera.position).multiplyScalar(.015);
    skyCamera.quaternion.copy(camera.quaternion);
    if (skyCamera.fov !== camera.fov || skyCamera.aspect !== camera.aspect) {
      skyCamera.fov = camera.fov; skyCamera.aspect = camera.aspect; skyCamera.updateProjectionMatrix();
    }
  }

  function dispose() {
    if (disposed) return;
    clearSector();
    root.removeFromParent();
    disposed = true;
    currentLayout = undefined;
  }

  return { load, sync, targets, beacon, gem, gate, hazards, skyScene, skyCamera, updateSky, lighting, dispose };
}
