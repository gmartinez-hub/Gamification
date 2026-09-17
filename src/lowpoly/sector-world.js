import * as THREE from '../../vendor/three.module.js';
import { sampleHazard } from './hazards.js';
import { loadModelSet, releaseModelAssets } from './asset-loading.js';
import { createWorldTextureLibrary, ROCK_SURFACES } from './world-textures.js';

const BIOMES = {
  nereida: {
    planet: 0xd7eaff, atmosphere: 0x389aef, rock: 0x827d76, accent: 0x73e5de, texture: 'ocean',
    sky: 0x020711, haze: 0x1a345d, warmHaze: 0x62412a, sun: 0xffd4a0, fill: 0x90c7dc, exposure: 1.0,
    planetPosition: [118, -72, -390], planetRadius: 165, moonPosition: [-200, 142, -610], moonRadius: 25,
  },
  vesper: {
    planet: 0xb4accf, atmosphere: 0xa393dc, rock: 0x827e92, accent: 0xb9a0ee, texture: 'gas',
    sky: 0x040512, haze: 0x31204f, warmHaze: 0x1a3449, sun: 0xcbd8ff, fill: 0xbcc7ed, exposure: 1.18,
    planetPosition: [-138, 42, -575], planetRadius: 105, moonPosition: [196, -75, -560], moonRadius: 19,
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

function sourceBundle(models) {
  return Object.fromEntries(Object.entries(models).map(([name,scene])=>[name,{scene}]));
}

/** Load once before world.load(). Ownership transfers to the world supplied
 * with this bundle; imported resources survive sector changes. */
export async function loadWorldAssets(options = {}) {
  const models = await loadModelSet(Object.entries(MODEL_FILES), options);
  return Object.fromEntries(Object.entries(models).map(([name, gltf]) => [name, gltf.scene]));
}

/** Presentation only. The layout remains immutable; public positions follow the
 * actual drifting objects so aiming and collision use the same visible location.
 */
export function createSectorWorld(scene, { assets = null, assetLoader = loadWorldAssets, gemModel = null, textureLoader } = {}) {
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
  const hazards = [], decoration = [];
  const textureLibrary = createWorldTextureLibrary({ loader:textureLoader });
  const preparations = new Map();
  let ownedAssetBundle;
  let missionGem = gemModel;
  let dustBase, dustSpeeds;
  const ambientInstances = [];
  let resources = new Set();
  let generation = 0;
  let disposed = false;
  let currentLayout;
  let materials;
  let gemCrystal;
  let primaryPlanet;
  let clouds;
  let dust;
  let sectorPalette;
  let beaconSignal;
  let beaconLight;
  let beaconScan;
  let assetPromise;
  let assetTemplates;

  function installAssets(models) {
    ownedAssetBundle = sourceBundle(models);
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
        const shape = part.geometry.applyMatrix4(part.matrixWorld).translate(-center.x, -center.y, -center.z);
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
    // This world owns the source bundle. Normalize its geometry in memory once
    // (no exported asset changes), then share it across every sector instance.
    assetTemplates = templates;
  }

  function loadAssets() {
    if (disposed) return Promise.reject(new Error('Cannot load assets into a disposed world.'));
    if (assetTemplates) return assetPromise ||= Promise.resolve(assetTemplates);
    if (!assetPromise) {
      assetPromise = Promise.resolve(assetLoader()).then(models => {
        if (disposed) {
          releaseModelAssets(sourceBundle(models));
          throw new Error('Sector world was disposed while models loaded.');
        }
        try { installAssets(models); }
        catch (error) { releaseModelAssets(ownedAssetBundle); ownedAssetBundle=undefined; throw error; }
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
  function rockCoating(name) {
    const material=surface(new THREE.Color(0xffffff).lerp(new THREE.Color(sectorPalette.rock),.07),{
      flatShading:false,roughness:.88,metalness:.07,envMapIntensity:.5,
    });
    material.name='wrapped-'+name; material.userData.surface=name;
    const map={value:null};
    const placeholder=own(new THREE.DataTexture(new Uint8Array([158,164,173,255]),1,1));
    placeholder.needsUpdate=true; map.value=placeholder;
    texture(name,[],{onLoad:image=>{map.value=image;}});
    material.onBeforeCompile=shader=>{
      shader.uniforms.rockSurface=map;
      shader.vertexShader=shader.vertexShader.replace('#include <common>',
        '#include <common>\nvarying vec3 rockPosition; varying vec3 rockNormal;')
        .replace('#include <begin_vertex>','#include <begin_vertex>\nrockPosition=transformed;rockNormal=normal;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
        '#include <common>\nuniform sampler2D rockSurface; varying vec3 rockPosition; varying vec3 rockNormal;')
        .replace('#include <map_fragment>',`
          vec3 w=pow(abs(normalize(rockNormal)),vec3(6.));w/=max(dot(w,vec3(1.)),.0001);
          vec3 p=rockPosition*.83;
          vec3 mineral=texture2D(rockSurface,p.yz).rgb*w.x+texture2D(rockSurface,p.zx).rgb*w.y+texture2D(rockSurface,p.xy).rgb*w.z;
          diffuseColor.rgb*=mineral;
          float grain=dot(mineral,vec3(.2126,.7152,.0722));`)
        .replace('#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(grain-.5)*.18,.68,.98);');
    };
    material.customProgramCacheKey=()=> 'approved-surface-triplanar-v1';
    return material;
  }
  function addMesh(parent, shape, material, position = [0, 0, 0]) {
    const object = new THREE.Mesh(shape, material);
    object.position.set(...position);
    parent.add(object);
    return object;
  }
  function textureNames(biome) {
    return [...ROCK_SURFACES,'nebula',(BIOMES[biome] || BIOMES.nereida).texture];
  }
  function prepareBiome(layoutOrId) {
    if(disposed) return Promise.reject(new Error('Cannot prepare a disposed world.'));
    const biome = typeof layoutOrId==='string' ? layoutOrId : layoutOrId.biomeId;
    if(!preparations.has(biome)) {
      const promise=textureLibrary.prepare(textureNames(biome)).then(()=>{
        if(disposed) throw new Error('Cannot prepare a disposed world.');
        return {biomeId:biome,ready:true};
      }).catch(error=>{preparations.delete(biome);throw error;});
      preparations.set(biome,promise);
    }
    return preparations.get(biome);
  }
  function setMissionAssets(templates) {
    missionGem = templates?.createGem ? templates.createGem() : templates;
    if(currentLayout) { gem.clear(); createGem(); }
  }
  function texture(name, materialList, { slot = 'map', repeat = 1, bump = 0, onLoad } = {}) {
    const version = generation;
    const bind = source => {
      if(!source || disposed || version!==generation) return;
      const image=own(source.clone()); image.needsUpdate=true;
      image.colorSpace=slot==='normalMap' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
      image.repeat.set(repeat,repeat);
      let height;
      if(bump) { height=own(image.clone()); height.colorSpace=THREE.NoColorSpace; height.needsUpdate=true; }
      for(const material of materialList) {
        material[slot]=image;
        if(height) { material.bumpMap=height; material.bumpScale=bump; }
        if(slot==='normalMap') material.normalScale.set(.17,.17);
        material.needsUpdate=true;
      }
      onLoad?.(image);
    };
    const ready=textureLibrary.get(name);
    if(ready) bind(ready);
    else textureLibrary.load(name).then(bind).catch(()=>{});
  }
  function clearSector() {
    generation++;
    for (const resource of resources) resource.dispose();
    resources.clear();
    for (const group of [background, playable, beacon, gem, gate, celestial]) group.clear();
    clouds = undefined; dust = undefined;
    targets.length = 0;
    hazards.length = 0; decoration.length=0; ambientInstances.length=0;
    dustBase=dustSpeeds=undefined; beaconScan=undefined;
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
            float panoramaU=fract(skyUV.x+.18);
            // The approved panorama has different left/right borders. Crossfade
            // to its opposite half only at the join, preserving continuous sky.
            float seamBlend=smoothstep(0.,.16,panoramaU)*(1.-smoothstep(.84,1.,panoramaU));
            vec3 archiveCloud=mix(texture2D(skyMap,vec2(fract(panoramaU+.5),skyUV.y)).rgb,
              texture2D(skyMap,vec2(panoramaU,skyUV.y)).rgb,seamBlend);
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
      texture('ocean', [], {onLoad:image=>{cloudMaterial.uniforms.cloudMap.value=image;cloudMaterial.uniforms.cloudReady.value=1;}});
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
      planetaryRing.rotation.set(1.28, -.12, -.3); planetaryRing.scale.setScalar(.83);
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
    createRockFormations(random);
    const dustPoints=[],dustColors=[],speeds=[],moteColor=new THREE.Color();
    const point=(x,y,z,color,intensity=1)=>{
      dustPoints.push(x,y,z); moteColor.set(color).multiplyScalar(intensity);
      dustColors.push(moteColor.r,moteColor.g,moteColor.b); speeds.push(.3+random());
    };
    // Three overlapping physical depths extend throughout the expanded route.
    // Nearby flecks communicate motion; distant fine dust never forms a fog wall.
    for(let layer=0;layer<3;layer++) for(let i=0;i<150;i++) {
      const width=[85,175,330][layer],height=[50,95,145][layer];
      point((random()-.5)*width,(random()-.5)*height,25-random()*340,
        i%6===0?sectorPalette.sun:sectorPalette.accent,(.3+random()*.4)/(1+layer*.3));
    }
    for(const region of currentLayout.regions || [currentLayout.beacon]) for(let i=0;i<36;i++) {
      const a=random()*Math.PI*2,r=5+random()*23;
      point(region.x+Math.cos(a)*r,region.y+(random()-.5)*25,region.z+Math.sin(a)*r,sectorPalette.accent,.65);
    }
    dustBase=new Float32Array(dustPoints); dustSpeeds=new Float32Array(speeds);
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
    const biome=currentLayout.biomeId;
    const style=biome==='nereida'?'mesa':biome==='umbra'?'shard':'boulder';
    // Only these large, composed silhouettes use the full imported source.
    // Fine distant chips are newly authored geometry, never decimated GLB assets.
    const source=assetTemplates?.base.children.find(object=>object.isMesh)?.geometry;
    const detail=source || rockGeometry(style,22,.6);
    const locations=[[-266,-60,-115],[270,25,-160],[-282,63,-280],[275,-80,-335],[-252,-122,-425],[279,110,-475]];
    locations.forEach(([x,y,z],i)=>{
      const size=28+random()*12, rotation=new THREE.Euler(.3+i*.7,.6+i*1.4,i*.4);
      const group=new THREE.Group();group.name='mineral-composition-'+i;group.position.set(x,y,z);
      const core=new THREE.Mesh(detail,materials.coatings[(i+(biome==='vesper'?2:biome==='umbra'?4:0))%7]);
      core.scale.setScalar(size);core.rotation.copy(rotation);group.add(core);
      // A second rotated mass changes the silhouette without stretching the source.
      const satellite=new THREE.Mesh(detail,materials.coatings[(i+3)%7]);
      satellite.scale.setScalar(size*.42);satellite.position.set(i%2?size*.6:-size*.6,size*.28,-size*.12);
      satellite.rotation.set(rotation.z+1.4,rotation.y+.8,rotation.x);group.add(satellite);
      group.traverse(object=>{if(object.isMesh){object.receiveShadow=true;object.castShadow=false;}});
      group.userData.layer='far';background.add(group);
      group.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(group);
      group.position.x+=x<0?Math.min(0,-225-bounds.max.x):Math.max(0,225-bounds.min.x);
    });
    const chips=rockGeometry(style,18,2.3);
    for(let surfaceIndex=0;surfaceIndex<7;surfaceIndex++) {
      const batch=own(new THREE.InstancedMesh(chips,materials.coatings[surfaceIndex],8));
      batch.name=surfaceIndex===0?'authored-rock-formations':'mineral-debris-'+surfaceIndex;
      batch.userData.layer='far'; batch.userData.forms=[];
      for(let i=0;i<batch.count;i++) {
        const z=-90-random()*425,sign=i%2?1:-1;
        const size=1.2+random()**2*8;
        // All decorative envelopes stay outside the navigable x±220 volume.
        const position=new THREE.Vector3(sign*(245+random()*100),-75+random()*160,z);
        const rotation=new THREE.Euler(random()*6,random()*6,random()*6);
        const scale=new THREE.Vector3(size,size*(biome==='umbra'?1.25:.83),size*.94);
        const transform=new THREE.Object3D();transform.position.copy(position);transform.rotation.copy(rotation);transform.scale.copy(scale);transform.updateMatrix();
        batch.setMatrixAt(i,transform.matrix);batch.userData.forms.push({position,rotation,scale,phase:random()*6});
      }
      batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.instanceMatrix.needsUpdate=true;
      batch.computeBoundingSphere(); background.add(batch);ambientInstances.push(batch);
    }
  }

  function createDecoration(spec,random) {
    const object=new THREE.Group();object.name=spec.id;object.position.copy(positionFrom(spec.position));
    const shape=ambientInstances[0].geometry;
    const body=new THREE.Mesh(shape,materials.coatings[Math.floor(random()*7)]);
    body.scale.setScalar(spec.radius/(shape.boundingSphere.radius+shape.boundingSphere.center.length()));
    body.rotation.set(random()*6,random()*6,random()*6);object.add(body);
    object.userData.kind='decoration';object.userData.body=body;object.userData.driftPhase=random()*6;
    object.userData.active=false; background.add(object);
    decoration.push({id:spec.id,kind:'decoration',spec,object,position:object.position,radius:spec.radius,
      previousPosition:object.position.clone(),velocity:new THREE.Vector3()});
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
      const appearance=targets.length;
      const originalBrown=kind==='small' && appearance%3===0;
      body = assetTemplates[originalBrown?'rock':'base'].clone(true);
      body.scale.setScalar(radius * .94);
      body.traverse(part => {
        if (!part.isMesh) return;
        if(!originalBrown) part.material=materials.coatings[(appearance+(currentLayout.biomeId==='vesper'?2:currentLayout.biomeId==='umbra'?4:0))%7];
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
    // A discovered mission rock carries a small surface pulse; optional rocks
    // keep their original mineral appearance and all meshes retain their maps.
    const missionSurfaces=[];
    if(kind==='small'||kind==='large')body.traverse(part=>{
      if(!part.isMesh)return;
      const adapt=source=>{
        if(!source.emissive)return source;
        const material=own(source.clone());
        material.onBeforeCompile=(shader,renderer)=>{
          source.onBeforeCompile(shader,renderer);
          shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
            float missionRim=pow(1.0-abs(dot(normalize(vViewPosition),normal)),2.0);
            totalEmissiveRadiance*=0.10+0.90*missionRim;`);
        };
        material.customProgramCacheKey=()=>source.customProgramCacheKey()+'-mission-rim-v1';
        missionSurfaces.push({material,color:source.emissive.clone(),intensity:source.emissiveIntensity});
        return material;
      };
      part.material=Array.isArray(part.material)?part.material.map(adapt):adapt(part.material);
    });
    object.userData.missionSurfaces=missionSurfaces;
    // The imported surface itself defines the target: no floating ore pieces or
    // decorative circles extend beyond the unchanged collision sphere.
    object.traverse(part => { part.userData.id = spec.id; part.userData.targetId = spec.id; part.userData.kind = kind; });
    object.userData.basePosition = object.position.clone();
    object.userData.driftPhase = random() * Math.PI * 2;
    object.userData.body = body;
    playable.add(object);
    const record = { id: spec.id, object, position: object.position, radius, kind, spec, previousPosition: object.position.clone(), velocity: new THREE.Vector3() };
    if(spec.motion) sampleHazard(spec,0,record.position,record.velocity);
    record.previousPosition.copy(record.position);
    targets.push(record);
    if(isHazard) hazards.push(record);
  }

  function installBeaconScan() {
    beacon.updateWorldMatrix(true,true);
    const bounds=new THREE.Box3().setFromObject(beacon,true);
    beaconScan={beaconScanProgress:{value:0},beaconScanning:{value:0},beaconScanComplete:{value:0},
      beaconScanBounds:{value:new THREE.Vector2(bounds.min.y,Math.max(.01,bounds.max.y-bounds.min.y))}};
    const clones=new Map();
    function scanMaterial(source) {
      if(clones.has(source))return clones.get(source);
      // Borrow every original PBR map and glyph. Only this sector's material and
      // uniforms change; disposing it must never dispose the shared source maps.
      const material=own(source.clone()),prior=source.onBeforeCompile,priorKey=source.customProgramCacheKey();
      material.name=(source.name||'beacon')+'-surface-scan';
      material.onBeforeCompile=(shader,renderer)=>{
        prior.call(material,shader,renderer);Object.assign(shader.uniforms,beaconScan);
        shader.vertexShader=shader.vertexShader.replace('#include <common>',
          '#include <common>\nuniform vec2 beaconScanBounds; varying float beaconSurfaceHeight;')
          .replace('#include <begin_vertex>','#include <begin_vertex>\nbeaconSurfaceHeight=((modelMatrix*vec4(transformed,1.)).y-beaconScanBounds.x)/beaconScanBounds.y;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
          '#include <common>\nuniform float beaconScanProgress; uniform float beaconScanning; uniform float beaconScanComplete; varying float beaconSurfaceHeight;')
          .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
            float scanHead=mix(.018,.982,beaconScanProgress);
            float scanDistance=abs(beaconSurfaceHeight-scanHead);
            float scanBand=1.-smoothstep(.009,.026,scanDistance);
            float scanFeather=(1.-smoothstep(.016,.065,scanDistance))*.13;
            float scanTrace=step(beaconSurfaceHeight,scanHead)*beaconScanProgress*.018;
            totalEmissiveRadiance+=vec3(.08,.78,1.)*((scanBand+scanFeather)*(beaconScanning*1.05+beaconScanComplete*.28)+scanTrace);`);
      };
      material.customProgramCacheKey=()=>priorKey+'beacon-surface-progress-v1';
      clones.set(source,material);return material;
    }
    beacon.traverse(mesh=>{if(mesh.isMesh)mesh.material=Array.isArray(mesh.material)?mesh.material.map(scanMaterial):scanMaterial(mesh.material);});
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
    installBeaconScan();
    // A compact navigation lamp on the upper housing communicates scanning;
    // it is geometry on the beacon, not a screen-facing halo or orbiting ring.
    beaconSignal = addMesh(beacon, geometry(THREE.SphereGeometry, .026, 12, 8), materials.beaconGlow, [0, 1.208, 0]);
    beaconSignal.name = 'beacon-signal-lamp';
    beaconLight = new THREE.PointLight(0x83f4e5, 1.2, 3.5, 2); beaconLight.position.copy(beaconSignal.position); beacon.add(beaconLight);
  }

  function createGem() {
    if(missionGem) {
      gem.position.copy(positionFrom(currentLayout.gem)); gem.userData.kind='gem';
      gemCrystal=missionGem.clone(true); gem.add(gemCrystal); return;
    }
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
    // Compatibility anchor only. Cinematics owns the physical travel sequence;
    // exploration never renders the old permanent rings or a manual destination.
    gate.position.copy(positionFrom(currentLayout.gate)); gate.userData.kind='gate'; gate.visible=false;
  }

  function load(layout) {
    if (disposed) throw new Error('Cannot load a disposed sector world.');
    clearSector();
    currentLayout = layout;
    textureLibrary.retainOnly(textureNames(layout.biomeId));
    for(const key of preparations.keys()) if(key!==layout.biomeId) preparations.delete(key);
    sectorPalette = BIOMES[layout.biomeId] || BIOMES.nereida;
    Object.assign(lighting, { sun: sectorPalette.sun, fill: sectorPalette.fill, exposure: sectorPalette.exposure });
    skySun.color.set(sectorPalette.sun); skyFill.color.set(sectorPalette.fill); skyFill.intensity = layout.biomeId === 'vesper' ? .8 : .48;
    const random = randomForLayout(layout);
    materials = {
      ivory: surface(0xe5e1cd), graphite: surface(0x22333e), copper: surface(0xba8154, { metalness: 0.55 }),
      targetRock: mineral(0x859294),
      hazardRock: mineral(0x765646),
      cyan: surface(0x8de7ef, { emissive: 0x45cbd7, emissiveIntensity: 0.75, roughness: 0.3 }),
      amber: surface(0xffd180, { emissive: 0xffa52d, emissiveIntensity: 0.9, roughness: 0.3 }),
      hazard: surface(0xff8853, { emissive: 0xef4428, emissiveIntensity: 1.2 }),
      gem: own(new THREE.MeshPhysicalMaterial({ color: 0x94efd9, emissive: 0x167c74, emissiveIntensity: .22,
        metalness: .08, roughness: .12, clearcoat: 1, clearcoatRoughness: .08, ior: 1.46,
        transparent: true, opacity: .83, depthWrite: false, flatShading: true })),
      gemHeart: surface(0xd7fff2, { emissive: 0x54d9bf, emissiveIntensity: .95, roughness: .24, metalness: .15 }),
      cyanLine: glow(0x7ee6e0, 0.55), amberLine: glow(0xffcd79, 0.6),
      beaconGlow: surface(0x7ff2e6, { emissive: 0x7ff2e6, emissiveIntensity: 1.8, roughness: .22, metalness: .05, flatShading: false }),
      beaconLine: glow(0x7ff2e6, 0.5),
    };
    materials.coatings=ROCK_SURFACES.map(rockCoating);
    createBackground(random);
    for (const material of [materials.targetRock,materials.hazardRock]) material.vertexColors = true;
    texture('rock', [materials.targetRock,materials.hazardRock], {repeat:1.2,bump:.16});
    for (const spec of layout.small) createTarget(spec, 'small', random);
    for (const spec of layout.large) createTarget(spec, 'large', random);
    for (const spec of layout.hazards) createTarget(spec, 'hazard', random);
    for (const spec of layout.breakables || []) createTarget(spec, 'breakable', random);
    for (const spec of layout.decoration || []) createDecoration(spec, random);
    createBeacon();
    createGem();
    createCorridor();
    for (const group of [beacon,gem,gate]) group.traverse(object => {
      if (object.isMesh && object.material.isMeshStandardMaterial) { object.castShadow = true; object.receiveShadow = true; }
    });
    sync({ phase: 'scan', destroyed: [] }, 0);
  }

  function sync(state, time = 0, { reducedMotion = false, optionalState = () => undefined, scanning = false } = {}) {
    if (!currentLayout || disposed) return;
    const destroyed = new Set(state.destroyed);
    const largeVisible = ['large', 'gem', 'return', 'transit', 'complete'].includes(state.phase);
    for (const record of [...targets, ...decoration]) {
      const { object, kind } = record;
      const phase=object.userData.driftPhase;
      record.previousPosition.copy(record.position);
      if(record.spec.motion) sampleHazard(record.spec,time,record.position,record.velocity);
      const body=object.userData.body, spin=record.spec.motion?.spin;
      object.userData.spinBaseX ??= body.rotation.x;
      const spinTime=time*(reducedMotion?.2:1);
      body.rotation.y=phase+spinTime*(spin?.y ?? (kind==='hazard'?.12:.045));
      body.rotation.x=object.userData.spinBaseX+spinTime*(spin?.x ?? 0);
      const optional=optionalState(record.id);
      record.generation=optional?.generation || 0;
      object.visible=!destroyed.has(record.id) && !optional?.destroyed && (kind!=='large'||largeVisible);
      object.userData.active=object.visible && (kind==='hazard'||kind==='breakable'||kind===state.phase);
      const identified=object.visible&&kind===state.phase&&state.discovered?.includes(record.id);
      for(const {material,color,intensity}of object.userData.missionSurfaces||[]){
        material.emissive.copy(color);material.emissiveIntensity=intensity;
        if(identified){material.emissive.setHex(kind==='large'?0xffbd66:0x65e9e1);material.emissiveIntensity=.18+(reducedMotion?.07:.14*(.5+.5*Math.sin(time*2.2+phase)));}
      }
    }
    materials.cyan.emissiveIntensity = state.phase === 'small' ? 0.85 : 0.15;
    materials.cyanLine.opacity = state.phase === 'small' ? 0.6 : 0.18;
    const scanAvailable=state.phase==='scan',scanComplete=!scanAvailable || state.scanProgress>=1;
    const scanActive=scanAvailable && scanning && !scanComplete;
    const progress=scanComplete?1:THREE.MathUtils.clamp(Number(state.scanProgress)||0,0,1);
    beacon.userData.active=scanAvailable;beacon.userData.scanProgress=progress;beacon.userData.scanning=scanActive;
    beaconScan.beaconScanProgress.value=progress;beaconScan.beaconScanning.value=Number(scanActive);beaconScan.beaconScanComplete.value=Number(scanComplete);
    materials.beaconGlow.color.set(scanActive?0x83f4e5:scanComplete?0x97d9cf:0x5e9cbd);
    const pulse=reducedMotion?0:Math.sin(time*(scanActive?6:2.8));
    const signal=scanActive?.8+pulse*.12:scanComplete?.28:.13+pulse*.035;
    beaconSignal.material.emissive.copy(materials.beaconGlow.color);
    beaconSignal.material.emissiveIntensity=.45+signal*1.55;
    beaconLight.color.copy(materials.beaconGlow.color);beaconLight.intensity=signal*1.35;
    gem.visible = state.phase === 'gem';
    gem.userData.active = gem.visible;
    gem.position.copy(positionFrom(currentLayout.gem));
    gem.position.y += Math.sin(time * 1.7) * 0.17;
    gemCrystal.rotation.y = time * 0.55;
    gemCrystal.rotation.z = Math.sin(time * 0.7) * 0.12;
    gate.visible=false; gate.userData.active=false;
    primaryPlanet.rotation.y = -.4 + time * .00065;
    if (clouds) clouds.rotation.y = -.4 + time * .00092;
    if(dust) {
      const positions=dust.geometry.attributes.position;
      for(let i=0;i<positions.count;i++) {
        const offset=i*3, speed=dustSpeeds[i], t=reducedMotion?0:time;
        positions.setXYZ(i,dustBase[offset]+Math.sin(t*.12+speed*7)*(.7+speed),
          dustBase[offset+1]+Math.cos(t*.09+speed*11)*(.4+speed*.45),
          dustBase[offset+2]+Math.sin(t*.07+speed*5)*(.8+speed*1.3));
      }
      positions.needsUpdate=true;
      dust.material.opacity=reducedMotion?.35:.39+Math.sin(time*.25)*.025;
    }
    for(const batch of ambientInstances) {
      const transform=new THREE.Object3D();
      batch.userData.forms.forEach((form,index)=>{
        const variation=.5+.5*Math.sin(form.phase*2.3+index*1.7);
        transform.position.copy(form.position); transform.position.y+=Math.sin(time*(.08+variation*.035)+form.phase)*.9;
        transform.rotation.copy(form.rotation); transform.rotation.y+=reducedMotion?0:time*(.014+variation*.006)*(index%2?-1:1);
        transform.scale.copy(form.scale); transform.updateMatrix(); batch.setMatrixAt(index,transform.matrix);
      });
      batch.instanceMatrix.needsUpdate=true;
    }
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
    if(ownedAssetBundle) releaseModelAssets(ownedAssetBundle);
    ownedAssetBundle=undefined; textureLibrary.dispose(); preparations.clear();
    assetTemplates = undefined;
    root.removeFromParent();
    disposed = true;
    currentLayout = undefined;
  }

  function createRockProjectile(radius=.28) {
    if(!assetTemplates)return null;
    const rock=assetTemplates.base.clone(true);rock.name='claw-mineral-projectile';rock.scale.setScalar(radius);
    rock.traverse(part=>{if(part.isMesh){part.material=materials.coatings[2];part.castShadow=false;part.receiveShadow=false;}});
    return rock;
  }
  return { createRockProjectile, loadAssets, prepareBiome, setMissionAssets, load, sync, targets, beacon, gem, gate, hazards, decoration, skyScene, skyCamera, updateSky, lighting, dispose };
}
