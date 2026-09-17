import * as THREE from '../../vendor/three.module.js';
import { sampleHazard } from './hazards.js';
import { loadModelSet } from './asset-loading.js';

const TEXTURES = {
  ocean: new URL('../../assets/runtime/lowpoly-textures/ocean.jpg', import.meta.url).href,
  moon: new URL('../../assets/runtime/lowpoly-textures/moon.jpg', import.meta.url).href,
  gas: new URL('../../assets/runtime/three-textures/gas-giant-color.png', import.meta.url).href,
  rock: new URL('../../assets/runtime/lowpoly-textures/rock-mineral.jpg', import.meta.url).href,
  nebula: new URL('../../assets/runtime/lowpoly-textures/nebula.jpg', import.meta.url).href,
};

const BIOMES = {
  nereida: {
    planet: 0xd7eaff, atmosphere: 0x389aef, rock: 0x827d76, accent: 0x73e5de, texture: 'ocean',
    sky: 0x020711, haze: 0x1a345d, warmHaze: 0x62412a, sun: 0xffd4a0, fill: 0x90c7dc, exposure: 1.0,
    planetPosition: [118, -72, -390], planetRadius: 165, moonPosition: [-200, 142, -610], moonRadius: 25,
  },
  vesper: {
    planet: 0xb4accf, atmosphere: 0xa393dc, rock: 0x827e92, accent: 0xb9a0ee, texture: 'gas',
    sky: 0x040512, haze: 0x31204f, warmHaze: 0x1a3449, sun: 0xcbd8ff, fill: 0xbcc7ed, exposure: 1.18,
    planetPosition: [-94, 26, -430], planetRadius: 108, moonPosition: [196, -75, -560], moonRadius: 19,
  },
  umbra: {
    planet: 0x615054, atmosphere: 0xd98a5e, rock: 0x6d6262, accent: 0xd49479, texture: 'moon',
    sky: 0x07040a, haze: 0x302035, warmHaze: 0x612d1a, sun: 0xffba8c, fill: 0x8a88ab, exposure: .98,
    planetPosition: [104, -46, -410], planetRadius: 148, moonPosition: [-179, 111, -580], moonRadius: 20,
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

const MODEL_FILES = { beacon: 'baliza', rock: 'asteroide-marron', base: 'asteroide-base' };

function collectModelResources(models) {
  const resources = new Set();
  for (const model of Object.values(models)) model?.traverse(object => {
    if (!object.isMesh) return;
    resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  return resources;
}

/** Load once before world.load(). Ownership transfers to the world supplied
 * with this bundle; imported resources survive sector changes. */
export async function loadWorldAssets(options = {}) {
  const models = await loadModelSet(Object.entries(MODEL_FILES), options);
  if (options.mobile) Object.assign(models, await loadModelSet([['fractureRock','asteroide-marron'],['fractureBase','asteroide-base']], { mobile:true, directory:'fracture-proxies' }));
  return Object.fromEntries(Object.entries(models).map(([name, gltf]) => [name, gltf.scene]));
}

/** Presentation only. The layout remains immutable; public positions follow the
 * actual drifting objects so aiming and collision use the same visible location.
 */
export function createSectorWorld(scene, { assets = null, assetLoader = loadWorldAssets } = {}) {
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
  const skySun = new THREE.DirectionalLight(0xffe3c4, 2.8);
  skySun.position.set(-220, 210, 160);
  const skyFill = new THREE.HemisphereLight(0x698bad, 0x010209, .32);
  skyScene.add(skySun, skyFill);
  const targets = [];
  const hazards = [];
  let resources = new Set();
  let generation = 0;
  let disposed = false;
  let currentLayout;
  let materials;
  let gemCrystal;
  let primaryPlanet;
  let clouds;
  let dust;
  let gateRings = [];
  let transitStreaks;
  let gateStructure;
  let sectorPalette;
  let beaconSignal;
  let beaconLight;
  let assetPromise;
  let assetTemplates;
  const assetResources = new Set();
  const mineralMap = { value: null };

  function installAssets(models) {
    for (const resource of collectModelResources(models)) assetResources.add(resource);
    const templates = {};
    for (const name of Object.keys(models)) {
      const source = models[name];
      if (!source?.isObject3D) throw new Error(`Missing world model: ${name}`);
      source.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(source, true);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      if (![size.x, size.y, size.z].every(value => Number.isFinite(value) && value > 0)) throw new Error(`Invalid world model bounds: ${name}`);
      const template = new THREE.Group(); template.name = `meshy-${name}`;
      let radius = 0;
      const point = new THREE.Vector3();
      source.traverse(part => {
        if (!part.isMesh) return;
        const shape = part.geometry.clone().applyMatrix4(part.matrixWorld).translate(-center.x, -center.y, -center.z);
        assetResources.add(shape);
        const positions = shape.attributes.position;
        for (let i = 0; i < positions.count; i++) radius = Math.max(radius, point.fromBufferAttribute(positions, i).length());
        const mesh = new THREE.Mesh(shape, part.material);
        mesh.name = `meshy-${name}-surface`; mesh.castShadow = true; mesh.receiveShadow = true;
        template.add(mesh);
      });
      if (!template.children.length || radius <= 0) throw new Error(`Empty world model: ${name}`);
      const scale = name === 'beacon' ? 2.4 / size.y : 1 / radius;
      for (const mesh of template.children) { mesh.geometry.scale(scale, scale, scale); mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere(); }
      template.userData.model = MODEL_FILES[name];
      templates[name] = template;
    }
    // Templates own normalized clones. The imported meshes were never rendered;
    // their original geometry is no longer needed after normalization.
    for (const model of Object.values(models)) model.traverse(part => {
      if (part.isMesh && assetResources.delete(part.geometry)) part.geometry.dispose();
    });
    assetTemplates = templates;
  }

  function loadAssets() {
    if (disposed) return Promise.reject(new Error('Cannot load assets into a disposed world.'));
    if (assetTemplates) return assetPromise ||= Promise.resolve(assetTemplates);
    if (!assetPromise) {
      assetPromise = Promise.resolve(assetLoader()).then(models => {
        if (disposed) {
          for (const resource of collectModelResources(models)) resource.dispose();
          throw new Error('Sector world was disposed while models loaded.');
        }
        try { installAssets(models); }
        catch (error) { for (const resource of assetResources) resource.dispose(); assetResources.clear(); throw error; }
        return assetTemplates;
      }).catch(error => { assetPromise = null; throw error; });
    }
    return assetPromise;
  }
  if (assets) installAssets(assets);

  const own = resource => { resources.add(resource); return resource; };
  const geometry = (Constructor, ...args) => own(new Constructor(...args));
  const surface = (color, options = {}) => own(new THREE.MeshStandardMaterial({
    color, roughness: 0.78, metalness: 0.15, flatShading: true, ...options,
  }));
  const glow = (color, opacity = 1) => own(new THREE.MeshBasicMaterial({
    color, toneMapped: false, transparent: opacity < 1, opacity, depthWrite: opacity === 1,
  }));
  function mineral(color, floor = .26, contrast = 2.35) {
    const material = surface(color, { roughness: .92, metalness: .04 });
    // Neutral minerals preserve the surface palette; the map carries fine grain,
    // while geometry and directional light carry the large fractures.
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec3 grain = texture2D(map, vMapUv).rgb;
          float mineralValue = dot(grain, vec3(.2126,.7152,.0722));
          diffuseColor.rgb *= ${floor.toFixed(2)} + mineralValue * ${contrast.toFixed(2)};
        #endif
      `);
    };
    material.customProgramCacheKey = () => `mineral-v4:${floor}:${contrast}`;
    return material;
  }
  function triplanarMineral(color, accent, emissiveIntensity = .16) {
    const material = surface(color, { flatShading: false, roughness: .91, metalness: .03, emissive: accent, emissiveIntensity });
    material.name = 'biome-triplanar-mineral';
    material.onBeforeCompile = shader => {
      shader.uniforms.mineralMap = mineralMap;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 mineralPosition; varying vec3 mineralNormal;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nmineralPosition = transformed; mineralNormal = normal;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D mineralMap; varying vec3 mineralPosition; varying vec3 mineralNormal;')
        .replace('#include <map_fragment>', `
          vec3 mineralWeights = pow(abs(normalize(mineralNormal)), vec3(4.));
          mineralWeights /= max(dot(mineralWeights, vec3(1.)), .0001);
          vec3 mineralSamples = vec3(texture2D(mineralMap, mineralPosition.yz * 1.9).r,
            texture2D(mineralMap, mineralPosition.zx * 1.9).r, texture2D(mineralMap, mineralPosition.xy * 1.9).r);
          float mineralGrain = dot(mineralSamples, mineralWeights);
          diffuseColor.rgb *= .46 + mineralGrain * 1.32;
        `).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (mineralGrain - .5) * .13, .72, .98);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= smoothstep(.63, .9, mineralGrain);');
    };
    material.customProgramCacheKey = () => 'biome-triplanar-mineral-v1';
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
      if (disposed || version !== generation) { image.dispose(); return; }
      image.colorSpace = slot === 'normalMap' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      image.anisotropy = 8;
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
    clouds = undefined; dust = undefined; transitStreaks = undefined;
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
          vec3 color = base + cool * belt * (.07 + .22 * bands * wisps) + warm * dawn * .15;
          if (skyReady > .5) {
            vec3 archiveCloud = texture2D(skyMap, vec2(fract(skyUV.x + .18), skyUV.y)).rgb;
            float cloudValue = dot(archiveCloud, vec3(.2126,.7152,.0722));
            vec3 cloudTint = mix(vec3(.08,.30,.84), normalize(cool + vec3(.005)) * .65, .35);
            color += cloudTint * pow(cloudValue, .72) * .28 + archiveCloud * vec3(.18,.08,.24) * .055;
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
    for (let i = 0; i < 1950; i++) {
      const azimuth = random() * Math.PI * 2;
      const elevation = random() * 2 - 1;
      const distance = 680 + random() * 180;
      const circumference = Math.sqrt(1 - elevation * elevation);
      stars.push(Math.cos(azimuth) * circumference * distance, elevation * distance, Math.sin(azimuth) * circumference * distance);
      starColor.set(i % 11 === 0 ? sectorPalette.accent : i % 17 === 0 ? 0xffc697 : 0xd7e8ff).multiplyScalar(.42 + random() * .95);
      colors.push(starColor.r, starColor.g, starColor.b);
    }
    const starGeometry = own(new THREE.BufferGeometry());
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const starField = new THREE.Points(starGeometry, own(new THREE.PointsMaterial({ size: 1.85, vertexColors: true, transparent: true, opacity: .85, depthWrite: false, toneMapped: false })));
    starField.name = 'distant-stars'; starField.renderOrder = -10;
    celestial.add(starField);

    const planetMaterial = sectorPalette.texture === 'moon' ? mineral(sectorPalette.planet, .25, 2.25) : surface(sectorPalette.planet, {
      roughness: sectorPalette.texture === 'ocean' ? .77 : .94, metalness: 0, flatShading: false,
    });
    if (sectorPalette.texture === 'ocean') {
      planetMaterial.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #ifdef USE_MAP
            vec3 oceanColor = texture2D(map, vMapUv).rgb;
            diffuseColor.rgb *= oceanColor * vec3(.8,.96,1.12);
          #endif
        `);
      };
      planetMaterial.customProgramCacheKey = () => 'natural-ocean-v4';
    } else if (sectorPalette.texture === 'gas') {
      planetMaterial.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          #ifdef USE_MAP
            vec3 bands = texture2D(map, vMapUv).rgb;
            float value = dot(bands, vec3(.2126,.7152,.0722));
            diffuseColor.rgb *= mix(vec3(value), bands, .25) * vec3(.92,.95,1.14);
          #endif
        `);
      };
      planetMaterial.customProgramCacheKey = () => 'cold-gas-v4';
    }
    planetMaterial.flatShading = false;
    const radius = sectorPalette.planetRadius;
    primaryPlanet = addMesh(celestial, geometry(THREE.SphereGeometry, radius, 72, 48), planetMaterial, sectorPalette.planetPosition);
    primaryPlanet.name = 'biome-planet'; primaryPlanet.rotation.z = currentLayout.biomeId === 'vesper' ? -.48 : -.18;
    texture(sectorPalette.texture, [planetMaterial], {
      bump: sectorPalette.texture === 'moon' ? .15 : 0,
      onLoad: image => {
        if (clouds) { clouds.material.uniforms.cloudMap.value = image; clouds.material.uniforms.cloudReady.value = 1; }
      },
    });
    const lightDirection = skySun.position.clone().normalize();
    const atmosphere = own(new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color(sectorPalette.atmosphere).multiplyScalar(currentLayout.biomeId === 'nereida' ? 2.3 : 1.5) }, sunlight: { value: lightDirection }, strength: { value: currentLayout.biomeId === 'umbra' ? .45 : .88 } },
      vertexShader: `varying vec3 n; varying vec3 v; varying vec3 wn;
        void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);wn=normalize(mat3(modelMatrix)*normal);v=-p.xyz;gl_Position=projectionMatrix*p;}`,
      fragmentShader: `uniform vec3 tint;uniform vec3 sunlight;uniform float strength;varying vec3 n;varying vec3 v;varying vec3 wn;
        void main(){float rim=1.-abs(dot(normalize(n),normalize(v)));float day=.38+.62*max(0.,dot(normalize(wn),sunlight));gl_FragColor=vec4(tint,pow(rim,5.)*strength*day);}`,
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    }));
    const halo = addMesh(celestial, geometry(THREE.SphereGeometry, radius * 1.021, 64, 48), atmosphere);
    halo.name = 'planet-atmosphere'; halo.position.copy(primaryPlanet.position);
    if (currentLayout.biomeId === 'nereida') {
      const cloudMaterial = own(new THREE.ShaderMaterial({
        uniforms: { cloudMap: { value: null }, cloudReady: { value: 0 }, sunlight: { value: lightDirection } },
        vertexShader: `varying vec2 cloudUV;varying vec3 wn;void main(){cloudUV=uv;wn=mat3(modelMatrix)*normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform sampler2D cloudMap;uniform float cloudReady;uniform vec3 sunlight;varying vec2 cloudUV;varying vec3 wn;
          void main(){vec3 archive=texture2D(cloudMap,cloudUV).rgb;float cloud=smoothstep(.45,.8,min(min(archive.r,archive.g),archive.b))*.19*cloudReady;
          float day=.09+.91*max(0.,dot(normalize(wn),sunlight));gl_FragColor=vec4(vec3(.88,.94,1.)*day,cloud);}`,
        transparent: true, depthWrite: false,
      }));
      clouds = addMesh(celestial, geometry(THREE.SphereGeometry, radius * 1.004, 56, 40), cloudMaterial);
      clouds.position.copy(primaryPlanet.position); clouds.rotation.z = -.18;
    } else if (currentLayout.biomeId === 'vesper') {
      const ringMaterial = own(new THREE.ShaderMaterial({
        uniforms: { tint: { value: new THREE.Color(0xb5abc9) } },
        vertexShader: `varying vec3 p;varying vec3 wp;void main(){p=position;wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `uniform vec3 tint;varying vec3 p;varying vec3 wp;
          void main(){float r=length(p.xy);float grain=.72+.18*sin(r*2.9)+.10*sin(r*9.1);
          float bands=mix(.16,.54,smoothstep(.1,.8,sin(r*.22)*.5+.5));
          float gap=1.-.84*exp(-pow((r-188.)*.48,2.));float edge=smoothstep(141.,148.,r)*(1.-smoothstep(229.,238.,r));
          float lit=.65+.35*smoothstep(-180.,120.,-p.x+p.y*.3);gl_FragColor=vec4(tint*lit,grain*bands*gap*edge);}`,
        side: THREE.DoubleSide, transparent: true, depthWrite: false,
      }));
      const planetaryRing = addMesh(celestial, geometry(THREE.RingGeometry, 141, 238, 128, 1), ringMaterial);
      planetaryRing.name = 'fractured-orbital-ring'; planetaryRing.position.copy(primaryPlanet.position);
      planetaryRing.rotation.set(1.05, -.21, -.48);
    }
    const moonMaterial = mineral(currentLayout.biomeId === 'umbra' ? 0xc0a897 : 0xc0c5d1, .45, 1.05);
    moonMaterial.flatShading = false;
    const moon = addMesh(celestial, geometry(THREE.SphereGeometry, sectorPalette.moonRadius, 36, 24), moonMaterial, sectorPalette.moonPosition);
    moon.name = 'distant-moon'; moon.rotation.set(.1, 1.8, .3); texture('moon', [moonMaterial], { bump: .09 });

    // A small luminous sun stays on the celestial layer, so a short traverse
    // cannot sweep the light source across the player's view.
    const sunlight = own(new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color(sectorPalette.sun) } },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform vec3 tint;varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float core=1.-smoothstep(.025,.09,r);float corona=exp(-r*8.)*.28;gl_FragColor=vec4(tint*(1.4+core*2.),(core+corona)*(1.-smoothstep(.7,1.,r)));}`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    const sunDisc = addMesh(celestial, geometry(THREE.PlaneGeometry, 220, 220), sunlight, [-355, 215, -640]);
    sunDisc.name = 'distant-sun'; sunDisc.lookAt(0,0,0);

    // Metre-scale dust has real parallax. Mineral motes and beacon flecks share
    // this single, depth-tested point draw instead of stacking transparent fog.
    const forms = createRockFormations(random);
    const dustPoints = [], dustColors = [], moteColor = new THREE.Color();
    const point = (x,y,z,color,intensity=1) => {
      dustPoints.push(x,y,z); moteColor.set(color).multiplyScalar(intensity); dustColors.push(moteColor.r,moteColor.g,moteColor.b);
    };
    for (let i=0;i<210;i++) point((random()-.5)*100,(random()-.5)*48,25-random()*140,sectorPalette.accent,.42+random()*.3);
    const mote = new THREE.Vector3();
    for (const form of forms) for (let i=0;i<12;i++) {
      mote.set((random()-.5)*2.5,.25+(random()-.5)*1.3,(random()-.5)*2.5).applyMatrix4(form.matrix);
      point(mote.x,mote.y,mote.z,sectorPalette.sun,.4+random()*.6);
    }
    for (let i=0;i<18;i++) {
      const angle=random()*Math.PI*2, radius=1.6+random()*1.1;
      point(currentLayout.beacon.x+Math.cos(angle)*radius,currentLayout.beacon.y+(random()-.5)*2.5,currentLayout.beacon.z+Math.sin(angle)*radius,0x94f5e0,.7);
    }
    const dustGeometry = own(new THREE.BufferGeometry());
    dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(dustPoints,3));
    dustGeometry.setAttribute('color',new THREE.Float32BufferAttribute(dustColors,3));
    const dustMaterial = own(new THREE.PointsMaterial({ vertexColors:true,size:.075,transparent:true,opacity:.42,depthWrite:false,toneMapped:false }));
    dustMaterial.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_particle_fragment>', `
        #include <map_particle_fragment>
        float dustRadius = length(gl_PointCoord * 2. - 1.);
        if (dustRadius >= 1.) discard;
        diffuseColor.a *= pow(1. - smoothstep(.06, 1., dustRadius), 1.5);
      `);
    };
    dustMaterial.customProgramCacheKey = () => 'soft-mineral-dust-v1';
    dust = new THREE.Points(dustGeometry, dustMaterial);
    dust.name='nearby-space-dust';background.add(dust);
  }

  function rockGeometry(style = 'boulder', detail = 1, variation = 0) {
    const shape = geometry(THREE.IcosahedronGeometry, 1, detail);
    const positions = shape.attributes.position;
    const softCut = (a, b) => Math.min(a, b) - Math.max(.16 - Math.abs(a - b), 0) ** 2 / .64;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const grain = .038 * Math.sin(x * 14.7 + z * 6.2 + variation) * Math.cos(y * 12.1 - z * 3.7);
      const fracture = 1 + .16 * Math.sin(x * 4.6 + y * 3.1 + variation) + .09 * Math.sin(z * 7.2 - y * 2.4 + variation*.7) + grain;
      let px=x*fracture, py=y*fracture, pz=z*fracture;
      if (style === 'mesa') {
        // Eroded fracture planes keep the asymmetric silhouette while rounding
        // their joins; shallow relief prevents broad surfaces reading as slabs.
        px=softCut(px,.74+y*.12+z*.16+grain);
        py=softCut(py,.62+x*.24-z*.13+grain);
        pz=-softCut(-pz,.79-x*.17+y*.11-grain);
        px += Math.max(0,-y)*.09*Math.sin(variation+1.2);
      } else if (style === 'shard') {
        px*=.78+.18*Math.cos(y*3.+variation);pz*=.87+.13*Math.sin(y*2.7+variation);
        py=softCut(py,.89+x*.2+grain);
      }
      positions.setXYZ(i,px,py,pz);
    }
    shape.computeVertexNormals();
    // Each cut receives a coherent planar UV patch. Flattening the island tops
    // therefore cannot stretch the old spherical UVs across an entire ledge.
    const normal = shape.attributes.normal, uv = shape.attributes.uv;
    const colors = [];
    for (let i = 0; i < positions.count; i += 3) {
      const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i)), nz = Math.abs(normal.getZ(i));
      for (let j = 0; j < 3; j++) {
        const vertex = i + j;
        const u = nx > ny && nx > nz ? positions.getZ(vertex) : positions.getX(vertex);
        const v = ny > nx && ny > nz ? positions.getZ(vertex) : positions.getY(vertex);
        uv.setXY(vertex, u * .5 + .5, v * .5 + .5);
        const shade = .93 + .04 * Math.sin(positions.getX(vertex) * 4.3 + positions.getY(vertex) * 5.7 + variation * 7.1);
        colors.push(shade, shade * .985, shade * .97);
      }
    }
    // IcosahedronGeometry duplicates its vertices for UV islands. Average their
    // normals by position, so those seams never appear as giant flat triangles.
    const joins = new Map(), keys = [];
    for (let i = 0; i < positions.count; i++) {
      const key = [positions.getX(i), positions.getY(i), positions.getZ(i)].map(n => Math.round(n * 1e5)).join(',');
      keys.push(key);
      if (!joins.has(key)) joins.set(key, new THREE.Vector3());
      joins.get(key).add(new THREE.Vector3().fromBufferAttribute(normal, i));
    }
    for (const vector of joins.values()) vector.normalize();
    for (let i = 0; i < positions.count; i++) {
      const vector = joins.get(keys[i]); normal.setXYZ(i, vector.x, vector.y, vector.z);
    }
    shape.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    shape.computeBoundingBox(); shape.computeBoundingSphere();
    return shape;
  }

  function createRockFormations(random) {
    const biome = currentLayout.biomeId;
    const transform = new THREE.Object3D();
    const style = biome === 'nereida' ? 'mesa' : biome === 'umbra' ? 'shard' : 'boulder';
    const shapes = [0,1.8,4.1].map(variation=>rockGeometry(style,9,variation));
    const secondary = rockGeometry(style, 4, 1.7);
    // Nearby silhouettes stay beyond the playable envelope (x ±50, y ±22,
    // z -90..35). Their tops enter the lower frame, never a mandatory route.
    // The central formations are beyond the corridor exit at z=-80.
    const islands = [
      [-49,-43,-35,21,21,17], [58,-45,-53,17,20,16],
      [-31,-41,-78,17,16,15], [41,-47,-98,19,17,17],
      [-71,7,-69,18,24,18], [76,-7,-108,17,23,17],
      [-85,-24,-145,26,22,22], [103,-29,-183,25,23,25],
      [-112,38,-226,23,18,19], [51,-81,-239,25,25,28],
      [-150,4,-267,34,31,29], [169,-17,-291,32,26,28],
      [-49,-105,-329,39,31,32], [149,60,-351,25,23,28],
    ];
    const forms = [];
    const batches=shapes.map((shape,index)=>{
      const batch=own(new THREE.InstancedMesh(shape,materials.ambientRock,Math.ceil((islands.length-index)/3)));
      batch.name=index===0?'authored-rock-formations':`fractured-rock-formations-${index}`;
      batch.castShadow=true;batch.receiveShadow=true;background.add(batch);return batch;
    });
    const color = new THREE.Color();
    for (let i = 0; i < islands.length; i++) {
      const [x,y,z,sx,sy,sz] = islands[i];
      transform.position.set(x,y,z); transform.rotation.set(0, .22+i*.71, 0);
      if (biome === 'vesper') {
        transform.scale.set(sx*.9, sy*.64, sz*1.18);
        transform.rotation.set(.14,.12,x<0 ? -.31 : .31);
        if (z < -120) transform.position.y += x * .3 + 13;
      } else if (biome === 'umbra') {
        transform.scale.set(sx*.74, sy*1.25, sz*.82);
        transform.rotation.set(.08,.6,i%2 ? -.12 : .1);
      } else transform.scale.set(sx,sy,sz);
      // Bound the rotated vertices, rather than assuming a particular shape's
      // height, so even the tilted Vesper plates cannot breach the flight volume.
      transform.updateMatrix();
      const shape=shapes[i%3],formations=batches[i%3];
      const bound = shape.boundingBox.clone().applyMatrix4(transform.matrix);
      if (bound.max.z > -94) {
        if (i === 4 || i === 5) {
          const shift = x < 0 ? -52-bound.max.x : 52-bound.min.x;
          transform.position.x += shift;
        } else transform.position.y -= Math.max(0, bound.max.y + 24);
      }
      transform.updateMatrix(); formations.setMatrixAt(Math.floor(i/3), transform.matrix);
      color.setScalar(.83 + random()*.25); formations.setColorAt(Math.floor(i/3),color);
      forms.push({ matrix: transform.matrix.clone(), scale: transform.scale.clone() });
    }
    for(const batch of batches)batch.instanceMatrix.needsUpdate=true;

    // Satellite slabs stay attached to the same transforms and material family,
    // giving every large island a broken silhouette in a single additional draw.
    const chips = own(new THREE.InstancedMesh(secondary, materials.rockEdges, 28));
    chips.name = 'rock-strata'; chips.receiveShadow = true;
    const local = new THREE.Object3D(), matrix = new THREE.Matrix4();
    for (let i=0;i<chips.count;i++) {
      const form = forms[i % forms.length];
      local.position.set((random()-.5)*.8, -.27-random()*.35, (random()-.5)*.8);
      local.scale.set(.17+random()*.18,.13+random()*.13,.19+random()*.16);
      local.rotation.set(.12,random()*6,.08);
      local.updateMatrix(); matrix.multiplyMatrices(form.matrix,local.matrix);
      chips.setMatrixAt(i,matrix);
    }
    chips.instanceMatrix.needsUpdate = true; background.add(chips);

    const debris = own(new THREE.InstancedMesh(secondary, materials.ambientRock, 176));
    debris.name = biome === 'vesper' ? 'diagonal-fracture-belt' : 'decorative-asteroid-belt';
    debris.receiveShadow = false;
    for (let i = 0; i < debris.count; i++) {
      const z = -105-random()*260;
      const size = .28+random()**2*3.2;
      const x = (random()-.5)*225;
      if (biome === 'vesper') transform.position.set(x, x*.28-9+(random()-.5)*24,z);
      else transform.position.set(x,-27-random()*43,z);
      transform.rotation.set(random()*6,random()*6,random()*6);
      transform.scale.set(size,size*(biome === 'umbra' ? 1.5 : .7),size*(.7+random()*.5));
      transform.updateMatrix(); debris.setMatrixAt(i,transform.matrix);
      color.setScalar(.72+random()*.4); debris.setColorAt(i,color);
    }
    debris.instanceMatrix.needsUpdate = true; background.add(debris);
    return forms;
  }

  function createTarget(spec, kind, random) {
    const object = new THREE.Group();
    object.name = spec.id;
    object.position.copy(positionFrom(spec.position));
    const radius = spec.radius;
    const isLarge = kind === 'large';
    const isHazard = kind === 'hazard';
    let body;
    if (assetTemplates) {
      body = assetTemplates[isHazard || isLarge ? 'base' : 'rock'].clone(true);
      body.scale.setScalar(radius * .94);
      body.traverse(part => {
        if (!part.isMesh) return;
        const proxy = assetTemplates[isHazard || isLarge ? 'fractureBase' : 'fractureRock'];
        if (proxy) part.userData.fractureGeometry = proxy.children[0].geometry;
        if (isHazard || isLarge) part.material = isHazard ? materials.importedHazard : materials.importedCore;
      });
      object.add(body);
    } else {
      const shape = rockGeometry(isHazard ? 'shard' : 'boulder', isLarge ? 2 : 1, random() * 6);
      const bodyScale = radius * .94 / (shape.boundingSphere.radius + shape.boundingSphere.center.length());
      shape.scale(bodyScale, bodyScale, bodyScale);
      body = addMesh(object, shape, isHazard ? materials.hazardRock : materials.targetRock);
      body.castShadow = true; body.receiveShadow = true;
    }
    body.rotation.set(random() * 2, random() * 2, random() * 2);
    // The imported surface itself defines the target: no floating ore pieces or
    // decorative circles extend beyond the unchanged collision sphere.
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
    if (assetTemplates) beacon.add(assetTemplates.beacon.clone(true));
    else {
      addMesh(beacon, geometry(THREE.CylinderGeometry, .30, .40, 1.45, 8), materials.ivory, [0, -.18, 0]);
      addMesh(beacon, geometry(THREE.CylinderGeometry, .45, .34, .24, 8), materials.copper, [0, .64, 0]);
      for (let i = 0; i < 3; i++) {
        const angle = i * Math.PI * 2 / 3;
        const leg = addMesh(beacon, geometry(THREE.BoxGeometry, .15, .15, 1.15), materials.graphite,
          [Math.sin(angle) * .62, -.96, Math.cos(angle) * .62]);
        leg.rotation.y = angle;
      }
    }
    // A compact navigation lamp on the upper housing communicates scanning;
    // it is geometry on the beacon, not a screen-facing halo or orbiting ring.
    beaconSignal = addMesh(beacon, geometry(THREE.SphereGeometry, .026, 12, 8), materials.beaconGlow, [0, 1.208, 0]);
    beaconSignal.name = 'beacon-signal-lamp';
    beaconLight = new THREE.PointLight(0x83f4e5, 1.2, 3.5, 2); beaconLight.position.copy(beaconSignal.position); beacon.add(beaconLight);
  }

  function createGem() {
    gem.position.copy(positionFrom(currentLayout.gem));
    gem.userData.kind = 'gem';
    const rings = [[-.66, 0], [-.27, .30], [.19, .38], [.47, .23], [.68, 0]], positions = [];
    const vertex = (ring, side) => {
      const [y, radius] = rings[ring], angle = side * Math.PI / 3;
      return [Math.cos(angle) * radius, y, Math.sin(angle) * radius * .86];
    };
    for (let row = 0; row < rings.length - 1; row++) for (let side = 0; side < 6; side++) {
      const a = vertex(row, side), b = vertex(row, side + 1), c = vertex(row + 1, side), d = vertex(row + 1, side + 1);
      if (rings[row][1] > 0) positions.push(...a, ...c, ...b);
      if (rings[row + 1][1] > 0) positions.push(...b, ...c, ...d);
    }
    const crystalShape = own(new THREE.BufferGeometry());
    crystalShape.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); crystalShape.computeVertexNormals();
    gemCrystal = new THREE.Group(); gemCrystal.name = 'faceted-relic-crystal'; gem.add(gemCrystal);
    const shell = addMesh(gemCrystal, crystalShape, materials.gem); shell.renderOrder = 2;
    const heart = addMesh(gemCrystal, geometry(THREE.OctahedronGeometry, .19), materials.gemHeart);
    heart.scale.set(.8, 1.5, .7); heart.rotation.y = Math.PI / 6;
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
    const railPoints=[];
    for (let i=0;i<12;i++) {
      const angle=i*Math.PI/6;const x=Math.cos(angle)*8.7,y=Math.sin(angle)*8.7;
      railPoints.push(new THREE.Vector3(x,y,0),new THREE.Vector3(x,y,0).add(corridorEnd));
    }
    const rails=new THREE.LineSegments(own(new THREE.BufferGeometry().setFromPoints(railPoints)),materials.gateRail);
    rails.name='corridor-depth-rails';gate.add(rails);
    const streakPositions=new Float32Array(48*6);
    const streakGeometry=own(new THREE.BufferGeometry());
    streakGeometry.setAttribute('position',new THREE.BufferAttribute(streakPositions,3).setUsage(THREE.DynamicDrawUsage));
    transitStreaks=new THREE.LineSegments(streakGeometry,own(new THREE.LineBasicMaterial({ color:sectorPalette.accent,transparent:true,opacity:.55,depthWrite:false,toneMapped:false })));
    transitStreaks.name='transit-star-streaks';transitStreaks.visible=false;transitStreaks.frustumCulled=false;gate.add(transitStreaks);
  }

  function load(layout) {
    if (disposed) throw new Error('Cannot load a disposed sector world.');
    clearSector();
    currentLayout = layout;
    sectorPalette = BIOMES[layout.biomeId] || BIOMES.nereida;
    Object.assign(lighting, { sun: sectorPalette.sun, fill: sectorPalette.fill, exposure: sectorPalette.exposure });
    skySun.color.set(sectorPalette.sun); skyFill.color.set(sectorPalette.fill); skyFill.intensity = layout.biomeId === 'vesper' ? .8 : .48;
    const random = randomForLayout(layout);
    materials = {
      ivory: surface(0xe5e1cd), graphite: surface(0x22333e), copper: surface(0xba8154, { metalness: 0.55 }),
      ambientRock: triplanarMineral(sectorPalette.rock, 0x000000, 0),
      rockEdges: triplanarMineral(new THREE.Color(sectorPalette.rock).multiplyScalar(1.07), 0x000000, 0),
      hazardTrail: own(new THREE.LineBasicMaterial({ color: 0xb67957, transparent: true, opacity: .16, depthWrite: false })),
      targetRock: mineral(0x859294),
      hazardRock: mineral(0x765646),
      cyan: surface(0x8de7ef, { emissive: 0x45cbd7, emissiveIntensity: 0.75, roughness: 0.3 }),
      amber: surface(0xffd180, { emissive: 0xffa52d, emissiveIntensity: 0.9, roughness: 0.3 }),
      hazard: surface(0xff8853, { emissive: 0xef4428, emissiveIntensity: 1.2 }),
      gem: own(new THREE.MeshPhysicalMaterial({ color: 0x94efd9, emissive: 0x167c74, emissiveIntensity: .22,
        metalness: .08, roughness: .12, clearcoat: 1, clearcoatRoughness: .08, ior: 1.46,
        transparent: true, opacity: .83, depthWrite: false, flatShading: true })),
      gemHeart: surface(0xd7fff2, { emissive: 0x54d9bf, emissiveIntensity: .95, roughness: .24, metalness: .15 }),
      importedCore: triplanarMineral(new THREE.Color(sectorPalette.rock).multiplyScalar(1.14), sectorPalette.accent),
      importedHazard: triplanarMineral(new THREE.Color(sectorPalette.rock).lerp(new THREE.Color(0x9b6144), .28), 0xb46839),
      cyanLine: glow(0x7ee6e0, 0.55), amberLine: glow(0xffcd79, 0.6),
      beaconGlow: surface(0x7ff2e6, { emissive: 0x7ff2e6, emissiveIntensity: 1.8, roughness: .22, metalness: .05, flatShading: false }),
      beaconLine: glow(0x7ff2e6, 0.5), gateLine: glow(0x496976, 0.45),
      gateRail: own(new THREE.LineBasicMaterial({ color:sectorPalette.accent,transparent:true,opacity:.07,depthWrite:false })),
    };
    createBackground(random);
    for (const material of [materials.ambientRock,materials.rockEdges,materials.targetRock,materials.hazardRock]) material.vertexColors = true;
    const neutralGrain = own(new THREE.DataTexture(new Uint8Array([155, 155, 155, 255]), 1, 1));
    neutralGrain.needsUpdate = true; mineralMap.value = neutralGrain;
    texture('rock', [materials.targetRock,materials.hazardRock], {
      repeat: 1.2, bump: .16, onLoad: image => { image.wrapS = image.wrapT = THREE.RepeatWrapping; mineralMap.value = image; },
    });
    for (const spec of layout.small) createTarget(spec, 'small', random);
    for (const spec of layout.large) createTarget(spec, 'large', random);
    for (const spec of layout.hazards) createTarget(spec, 'hazard', random);
    createBeacon();
    createGem();
    createCorridor();
    for (const group of [beacon,gem,gate]) group.traverse(object => {
      if (object.isMesh && object.material.isMeshStandardMaterial) { object.castShadow = true; object.receiveShadow = true; }
    });
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
    const signal = scanning ? .65 + Math.sin(time * 2.8) * .25 : .24;
    beaconSignal.material.emissive.copy(materials.beaconGlow.color);
    beaconSignal.material.emissiveIntensity = .8 + signal * 1.8;
    beaconLight.color.set(scanning ? 0x83f4e5 : 0xc6a36d); beaconLight.intensity = signal * 1.35;
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
    materials.gateRail.opacity = open ? .24 : .045;
    for (let i = 0; i < gateRings.length; i++) {
      gateRings[i].scale.setScalar(open && !reducedMotion ? 1 + Math.sin(time * 2 - i * 0.8) * 0.013 : 1);
    }
    transitStreaks.visible = state.phase === 'transit' && !reducedMotion;
    if (transitStreaks.visible) {
      const points=transitStreaks.geometry.attributes.position;
      for (let i=0;i<48;i++) {
        const angle=i*2.399963, radius=6.2+(i%7)*.22;
        const z=-((time*18+i*2.13)%38)+6;
        const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
        points.setXYZ(i*2,x,y,z);points.setXYZ(i*2+1,x,y,z-1.1-(i%4)*.35);
      }
      points.needsUpdate=true;
    }
    primaryPlanet.rotation.y = -.4 + time * .00065;
    if (clouds) clouds.rotation.y = -.4 + time * .00092;
    if (dust) dust.material.opacity = reducedMotion ? .37 : .39+Math.sin(time*.45)*.025;
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
    for (const resource of assetResources) resource.dispose();
    assetResources.clear(); assetTemplates = undefined; mineralMap.value = null;
    root.removeFromParent();
    disposed = true;
    currentLayout = undefined;
  }

  return { loadAssets, load, sync, targets, beacon, gem, gate, hazards, skyScene, skyCamera, updateSky, lighting, dispose };
}
