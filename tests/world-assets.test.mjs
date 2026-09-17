import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createSectorWorld, loadWorldAssets } from '../src/lowpoly/sector-world.js';
import { createExpedition } from '../src/lowpoly/expedition.js';

function assetFixture() {
  const assets = {}, releases = [];
  for (const name of ['beacon', 'rock', 'base']) {
    const root = new THREE.Group();
    const geometry = new THREE.BoxGeometry(2, 3, 1); geometry.translate(6, 8, -4);
    if (name === 'base') geometry.deleteAttribute('uv');
    const material = new THREE.MeshStandardMaterial({ color: name === 'rock' ? 0x7b4d2b : 0xaaaaaa });
    geometry.addEventListener('dispose', () => releases.push(name + ':geometry'));
    material.addEventListener('dispose', () => releases.push(name + ':material'));
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(2, -3, 1); root.add(mesh); assets[name] = root;
  }
  return { assets, releases };
}
const layout = () => createExpedition(620).state.layout;
const firstMesh = object => { let found; object.traverse(part => { if (!found && part.isMesh) found = part; }); return found; };

test('mission surfaces pulse only after discovery and preserve wrapped shading without lighting optional rocks',()=>{
 const mission=createExpedition(620),world=createSectorWorld(new THREE.Scene(),{assets:assetFixture().assets});world.load(mission.state.layout);
 const required=world.targets.filter(t=>t.kind==='small'),optional=world.targets.find(t=>t.kind==='breakable');
 const material=firstMesh(required[1].object.userData.body).material,other=firstMesh(optional.object.userData.body).material;
 const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>\n#include <roughnessmap_fragment>'};
 material.onBeforeCompile(shader,{});assert(shader.uniforms.rockSurface,'highlight must retain the wrapped surface shader');
 const optionalColor=other.emissive.clone(),optionalIntensity=other.emissiveIntensity;
 const state={...mission.state,phase:'small',discovered:[],destroyed:[]};world.sync(state,1);
 const emission=()=>new THREE.Vector3().fromArray(material.emissive.toArray()).multiplyScalar(material.emissiveIntensity);
 const before=emission();
 state.discovered=[required[1].id];world.sync(state,1);
 assert(emission().distanceTo(before)>.1,'discovered mandatory target must visibly separate from the rocks');
 assert(other.emissive.equals(optionalColor));assert.equal(other.emissiveIntensity,optionalIntensity);
 world.sync({...state,phase:'large'},1);assert(emission().distanceTo(before)<1e-6,'completed EVA phase must stop highlighting');
 world.dispose();
});

test('imported asteroid surfaces share geometry and remain inside their gameplay collision spheres', () => {
  const fixture = assetFixture(), world = createSectorWorld(new THREE.Scene(), { assets: fixture.assets });
  world.load(layout());
  const a = world.targets[1], b = world.targets[2];
  assert.equal(firstMesh(a.object.userData.body).geometry, firstMesh(b.object.userData.body).geometry, 'clones reuse normalized geometry');
  for (const record of [...world.targets, ...world.hazards]) {
    record.object.updateMatrixWorld(true);
    const center = record.object.getWorldPosition(new THREE.Vector3());
    record.object.userData.body.traverse(mesh => {
      if (!mesh.isMesh) return;
      const positions = mesh.geometry.attributes.position, point = new THREE.Vector3();
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
        assert.ok(point.distanceTo(center) <= record.radius + 1e-6, `${record.id} exceeds collision radius`);
      }
      assert.equal(mesh.userData.targetId, record.id);
    });
  }
  const before = world.hazards[0].position.clone();
  world.sync({ phase: 'small', destroyed: [a.id] }, 3, { reducedMotion: true });
  assert.equal(a.object.visible, false); assert.equal(b.object.visible, true);
  assert.ok(world.hazards[0].position.distanceTo(before) > .01);
  world.dispose();
});

test('normalization shares source geometry until world disposal and sector replacement retains templates', () => {
  const fixture = assetFixture(), world = createSectorWorld(new THREE.Scene(), { assets: fixture.assets });
  world.load(layout());
  const shared = firstMesh(world.targets[0].object.userData.body).geometry;
  let releases = 0; shared.addEventListener('dispose', () => releases++);
  world.load({ ...layout(), biomeId: 'umbra' });
  assert.equal(firstMesh(world.targets[0].object.userData.body).geometry, shared);
  assert.equal(releases, 0); assert.deepEqual(fixture.releases, [], 'the normalized source is still in use');
  world.dispose(); world.dispose();
  assert.equal(releases, 1);
  assert.equal(fixture.releases.length, 6);
});

test('late model loading releases resources after world disposal and never rebuilds the scene', async () => {
  const fixture = assetFixture(), scene = new THREE.Scene();
  let finish;
  const world = createSectorWorld(scene, { assetLoader: () => new Promise(resolve => { finish = resolve; }) });
  assert.equal(typeof world.loadAssets, 'function');
  const first = world.loadAssets(), second = world.loadAssets();
  assert.equal(first, second, 'concurrent startup uses one load');
  world.dispose(); finish(fixture.assets);
  await assert.rejects(first, /disposed/i);
  assert.equal(scene.children.length, 0);
  assert.equal(fixture.releases.length, 6);
});

test('decorative rock shading stays continuous across duplicated triangle vertices', () => {
  const scene = new THREE.Scene(), world = createSectorWorld(scene);
  world.load(layout());
  const rock = scene.getObjectByName('authored-rock-formations');
  assert.equal(rock.material.flatShading, false);
  const { position, normal } = rock.geometry.attributes, seen = new Map();
  let joined = 0;
  for (let i = 0; i < position.count; i++) {
    const key = [position.getX(i), position.getY(i), position.getZ(i)].map(n => Math.round(n * 1e5)).join(',');
    const direction = new THREE.Vector3().fromBufferAttribute(normal, i);
    assert.ok(Number.isFinite(direction.length()) && Math.abs(direction.length() - 1) < 1e-5);
    if (seen.has(key)) { assert.ok(direction.dot(seen.get(key)) > .9999, 'a shared surface vertex has a visible normal seam'); joined++; }
    else seen.set(key, direction);
  }
  assert.ok(joined > 0);
  world.dispose();
});

test('optional rocks hide on destruction, return on a new generation and never become mission targets', () => {
  const mission = createExpedition(620), world = createSectorWorld(new THREE.Scene(), { assets: assetFixture().assets });
  world.load(mission.state.layout);
  const rock = world.targets.find(record => record.kind === 'breakable');
  assert.ok(rock, 'optional breakables must be rendered and targetable');
  let status = { destroyed: true, generation: 0 };
  world.sync(mission.state, 8, { optionalState: id => id === rock.id ? status : undefined });
  assert.equal(rock.object.visible, false); assert.equal(rock.object.userData.active, false);
  status = { destroyed: false, generation: 1 };
  world.sync(mission.state, 12, { optionalState: id => id === rock.id ? status : undefined });
  assert.equal(rock.object.visible, true); assert.equal(rock.object.userData.active, true);
  assert.equal(rock.generation, 1);
  assert.equal(world.hazards.length, mission.state.layout.hazards.length);
  assert.ok(world.targets.includes(world.hazards[0]));
  assert.deepEqual(mission.state.destroyed, []);
  world.dispose();
});

test('world movement is deterministic across construction, includes mission rocks and dust, and hides the legacy gate', () => {
  const scenes = [new THREE.Scene(), new THREE.Scene()];
  const worlds = scenes.map(scene => createSectorWorld(scene, { assets: assetFixture().assets }));
  worlds.forEach(world => world.load(layout()));
  const before = worlds[0].targets[0].position.clone();
  const dust = scenes[0].getObjectByName('nearby-space-dust');
  const dustBefore = dust.geometry.attributes.position.array.slice();
  worlds.forEach(world => world.sync({phase:'small',destroyed:[]}, 10));
  assert.ok(worlds[0].targets[0].position.distanceTo(before) > .5, 'use authored mission trajectory');
  assert.deepEqual(worlds[0].targets.map(r => r.position.toArray()), worlds[1].targets.map(r => r.position.toArray()));
  assert.notDeepEqual(dust.geometry.attributes.position.array, dustBefore, 'dust must translate, not only pulse opacity');
  assert.equal(worlds[0].gate.visible, false, 'no corridor during exploration');
  worlds.forEach(world => world.dispose());
});

test('world reuses the supplied mission gem without disposing its shared geometry or materials', () => {
  const gemModel = new THREE.Group(), shape = new THREE.OctahedronGeometry(.34), material = new THREE.MeshStandardMaterial();
  gemModel.add(new THREE.Mesh(shape, material)); gemModel.name = 'aether-shard';
  let disposed = 0; shape.addEventListener('dispose', () => disposed++); material.addEventListener('dispose', () => disposed++);
  const world = createSectorWorld(new THREE.Scene(), { assets: assetFixture().assets, gemModel });
  world.load(layout());
  const borrowed = world.gem.getObjectByName('aether-shard');
  assert.ok(borrowed, 'the actual new gem must replace the procedural relic');
  assert.equal(firstMesh(borrowed).geometry, shape);
  world.load({...layout(),biomeId:'umbra'}); world.dispose();
  assert.equal(disposed, 0, 'mission asset templates own the borrowed materials and geometry');
});

test('biome preparation waits for surfaces before replacing the world and releases late loads after disposal', async () => {
  const pending = [], loaded = [], scene = new THREE.Scene();
  const textureLoader = url => new Promise(resolve => pending.push(() => {
    const texture = new THREE.Texture(); texture.name = url; let releases=0;
    texture.addEventListener('dispose', () => releases++);
    loaded.push({texture, releases: () => releases}); resolve(texture);
  }));
  const world = createSectorWorld(scene, { assets: assetFixture().assets, textureLoader });
  assert.equal(typeof world.prepareBiome, 'function');
  const first = world.prepareBiome(layout()), second = world.prepareBiome(layout());
  assert.equal(first, second, 'one in-flight preparation per biome');
  let ready = false; first.then(() => ready=true,()=>{});
  await Promise.resolve(); assert.equal(ready,false);
  world.dispose();
  while(pending.length) { pending.shift()(); await new Promise(resolve => setImmediate(resolve)); }
  await assert.rejects(first,/disposed/i);
  assert.equal(scene.children.length,0);
  assert.ok(loaded.length>0); assert.ok(loaded.every(record => record.releases()===1));
});

test('prepared surface maps are reused across sectors and a failed biome can be retried', async () => {
  let fail=true, count=0; const textures=[];
  const world=createSectorWorld(new THREE.Scene(),{assets:assetFixture().assets,textureLoader:async()=>{
    if(fail) throw new Error('network offline');
    count++; const texture=new THREE.Texture(); textures.push(texture); return texture;
  }});
  assert.equal(typeof world.prepareBiome,'function');
  await assert.rejects(world.prepareBiome('nereida'),/network offline/);
  fail=false; await world.prepareBiome('nereida'); world.load(layout());
  const original=count;
  await world.prepareBiome('nereida'); assert.equal(count,original);
  await world.prepareBiome('vesper'); world.load({...layout(),biomeId:'vesper'});
  const coats=new Set(); world.targets.forEach(record=>record.object.traverse(object=>{if(object.material?.userData.surface) coats.add(object.material.userData.surface);}));
  assert.ok(coats.size>=5,'multiple approved surfaces must coexist in one biome independent of role');
  world.dispose();
});


test('mobile world loads the full source once and never substitutes a fracture proxy', async () => {
  const fixture=assetFixture(), urls=[];
  const loader={async loadAsync(url) {
    urls.push(url);
    const key=url.includes('baliza')?'beacon':url.includes('marron')?'rock':'base';
    return {scene:fixture.assets[key],animations:[]};
  }};
  const assets=await loadWorldAssets({mobile:true,loader});
  assert.equal(urls.length,3,'one full source per visible model, with no second fracture download');
  assert.ok(urls.every(url=>url.includes('/streamed-models/')));
  const world=createSectorWorld(new THREE.Scene(),{assets});world.load(layout());
  for(const target of world.targets) target.object.traverse(mesh=>{
    if(!mesh.isMesh)return;
    assert.ok(!mesh.userData.fractureGeometry || mesh.userData.fractureGeometry===mesh.geometry,'fracture uses the actual visible source geometry');
  });
  world.dispose();assert.equal(fixture.releases.length,6);
});

test('a failed second world download releases the loaded first model and does not request the third', async () => {
  const fixture=assetFixture(), urls=[];
  const loader={async loadAsync(url) {
    urls.push(url);
    if(url.includes('marron'))throw new Error('second model network failure');
    return {scene:fixture.assets.beacon,animations:[]};
  }};
  await assert.rejects(loadWorldAssets({mobile:true,loader}),/second model network failure/);
  assert.equal(urls.length,2);
  assert.deepEqual(fixture.releases,['beacon:geometry','beacon:material']);
});

test('beacon scan follows real progress, pauses and resumes without changing its imported PBR maps', () => {
  const fixture=assetFixture(),source=firstMesh(fixture.assets.beacon).material;
  source.map=new THREE.Texture();source.normalMap=new THREE.Texture();source.roughness=.37;source.metalness=.41;
  const world=createSectorWorld(new THREE.Scene(),{assets:fixture.assets});world.load(layout());
  const material=firstMesh(world.beacon).material;
  assert.notEqual(material,source,'the source material is never changed by sector scan state');
  assert.equal(material.map,source.map);assert.equal(material.normalMap,source.normalMap);
  assert.equal(material.roughness,.37);assert.equal(material.metalness,.41);
  const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <emissivemap_fragment>'};
  material.onBeforeCompile(shader,{});
  const uniforms=shader.uniforms;
  assert.ok(uniforms.beaconScanProgress && uniforms.beaconScanning && uniforms.beaconScanComplete,'live uniforms reach the actual source surface shader');
  world.sync({phase:'scan',destroyed:[],scanProgress:.1},1,{scanning:true});
  assert.equal(uniforms.beaconScanProgress.value,.1);assert.equal(uniforms.beaconScanning.value,1);
  const activeLamp=world.beacon.getObjectByName('beacon-signal-lamp').material.emissiveIntensity;
  world.sync({phase:'scan',destroyed:[],scanProgress:.7},1,{scanning:false});
  assert.equal(uniforms.beaconScanProgress.value,.7);assert.equal(uniforms.beaconScanning.value,0);
  assert.ok(world.beacon.getObjectByName('beacon-signal-lamp').material.emissiveIntensity<activeLamp,'cancel dims the lamp while retaining progress');
  world.sync({phase:'scan',destroyed:[],scanProgress:.7},1,{scanning:true});
  assert.equal(uniforms.beaconScanning.value,1);assert.equal(uniforms.beaconScanProgress.value,.7);
  world.sync({phase:'small',destroyed:[],scanProgress:1},2);
  assert.equal(uniforms.beaconScanProgress.value,1);assert.equal(uniforms.beaconScanComplete.value,1);assert.equal(uniforms.beaconScanning.value,0);
  assert.equal(world.beacon.userData.scanProgress,1);
  assert.ok(shader.vertexShader.includes('modelMatrix'),'height follows the actual surface vertices');
  assert.ok(shader.fragmentShader.includes('totalEmissiveRadiance'),'scan retains physically based diffuse and glyph textures');
  world.dispose();
});

test('beacon sector materials are disposed once while shared source textures survive replacement', () => {
  const fixture=assetFixture(),source=firstMesh(fixture.assets.beacon).material;
  const texture=source.map=new THREE.Texture();let textureReleases=0;
  texture.addEventListener('dispose',()=>textureReleases++);
  const world=createSectorWorld(new THREE.Scene(),{assets:fixture.assets});world.load(layout());
  const old=firstMesh(world.beacon).material;let oldReleases=0;old.addEventListener('dispose',()=>oldReleases++);
  world.load({...layout(),biomeId:'vesper'});
  assert.equal(oldReleases,1,'release the previous sector scan material');
  assert.equal(textureReleases,0,'source texture remains borrowed during sector replacement');
  const next=firstMesh(world.beacon).material;let nextReleases=0;next.addEventListener('dispose',()=>nextReleases++);
  assert.notEqual(old,next);assert.equal(next.map,texture);
  world.dispose();world.dispose();
  assert.equal(oldReleases,1);assert.equal(nextReleases,1);assert.equal(textureReleases,1);
});

test('large decorative compositions remain entirely beyond the navigable route', () => {
  for(const biomeId of ['nereida','vesper','umbra']) {
    const scene=new THREE.Scene(),world=createSectorWorld(scene,{assets:assetFixture().assets});
    world.load({...layout(),biomeId});
    scene.updateMatrixWorld(true);
    scene.traverse(object=>{
      if(!object.name.startsWith('mineral-composition-')) return;
      const bounds=new THREE.Box3().setFromObject(object);
      assert.ok(bounds.max.x < -220 || bounds.min.x > 220,object.name+' intrudes into the route');
    });
    world.dispose();
  }
});
