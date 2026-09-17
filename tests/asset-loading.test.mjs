import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, Mesh, MeshStandardMaterial, Scene, Texture } from '../vendor/three.module.js';
import { encounterModelDirectory, loadModelSet, releaseModelAssets, usesMobileAssets } from '../src/lowpoly/asset-loading.js';

const entries = Array.from({ length: 5 }, (_, i) => [String(i), `model-${i}`]);
test('touch phones and iPad desktop mode choose the mobile bundle; Mac keeps full detail', () => {
  assert.equal(usesMobileAssets({ coarsePointer: true }), true);
  assert.equal(usesMobileAssets({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }), true);
  assert.equal(usesMobileAssets({ platform: 'MacIntel', maxTouchPoints: 5 }), true);
  assert.equal(usesMobileAssets({ platform: 'MacIntel', maxTouchPoints: 0 }), false);
  assert.equal(usesMobileAssets({ platform: 'Win32', maxTouchPoints: 0 }), false);
});
test('encounter models resolve to the bounded mobile package only on mobile GPUs', () => {
  assert.equal(encounterModelDirectory(true), 'encounter-models-mobile');
  assert.equal(encounterModelDirectory(false), 'encounter-models');
  assert.equal(encounterModelDirectory(), 'encounter-models');
});
for (const mobile of [true, false]) test(`${mobile ? 'mobile' : 'desktop'} model decoding is bounded and drops parser backing buffers`, async () => {
  let active = 0, maximum = 0;
  const urls = [], progress = [];
  const loader = { async loadAsync(url) {
    urls.push(url); maximum = Math.max(maximum, ++active);
    await new Promise(resolve => setTimeout(resolve, 5)); active--;
    return { scene: new Scene(), animations: ['clip'], parser: { binary: new ArrayBuffer(100) } };
  } };
  const assets = await loadModelSet(entries, { mobile, loader, onProgress: (n, total) => progress.push([n, total]) });
  assert.equal(maximum, mobile ? 1 : 3);
  assert(urls.every(url => url.includes('/streamed-models/')));
  assert.deepEqual(progress, entries.map((_, i) => [i + 1, 5]));
  assert.equal(Object.keys(assets).length, 5);
  for (const asset of Object.values(assets)) { assert.equal(asset.parser, undefined); assert.deepEqual(asset.animations, ['clip']); }
});
test('failed loading settles in-flight work and releases every loaded resource exactly once', async () => {
  let calls = 0, released = 0, closed = 0;
  const loader = { async loadAsync() {
    const index = calls++;
    await new Promise(resolve => setTimeout(resolve, index === 1 ? 1 : 8));
    if (index === 1) throw new Error('missing model');
    const scene = new Scene(), geometry = new BoxGeometry(), material = new MeshStandardMaterial();
    const map = new Texture({ close() { closed++; } }); material.map = map; material.emissiveMap = map;
    for (const resource of [geometry, material, map]) resource.addEventListener('dispose', () => released++);
    scene.add(new Mesh(geometry, material));
    return { scene, animations: [] };
  } };
  await assert.rejects(loadModelSet(entries, { loader }), /missing model/);
  assert.equal(calls, 3); assert.equal(released, 6); assert.equal(closed, 2);
});

test('releasing one view keeps shared geometry and image alive until its last owner leaves', async () => {
  let geometryReleased = 0, materialReleased = 0, textureReleased = 0, imageClosed = 0;
  const geometry = new BoxGeometry(), texture = new Texture({ close() { imageClosed++; } });
  const material = new MeshStandardMaterial({ map: texture });
  geometry.addEventListener('dispose', () => geometryReleased++);
  material.addEventListener('dispose', () => materialReleased++);
  texture.addEventListener('dispose', () => textureReleased++);
  const loader = { async loadAsync() {
    const scene = new Scene(); scene.add(new Mesh(geometry, material));
    return { scene, animations: [] };
  } };
  const first = await loadModelSet([['first','first']], { loader });
  const second = await loadModelSet([['second','second']], { loader });
  releaseModelAssets(first);
  assert.deepEqual([geometryReleased, materialReleased, textureReleased, imageClosed], [0,0,0,0]);
  releaseModelAssets(second);
  assert.deepEqual([geometryReleased, materialReleased, textureReleased, imageClosed], [1,1,1,1]);
  releaseModelAssets(second); releaseModelAssets(first);
  assert.deepEqual([geometryReleased, materialReleased, textureReleased, imageClosed], [1,1,1,1], 'repeated cleanup is safe');
});

test('one failed batch cannot dispose resources still used by a loaded view', async () => {
  let released = 0, closed = 0;
  const geometry = new BoxGeometry(), texture = new Texture({ close() { closed++; } });
  const material = new MeshStandardMaterial({ map: texture });
  geometry.addEventListener('dispose', () => released++);
  const loader = { async loadAsync(url) {
    if (url.includes('missing')) throw new Error('missing');
    const scene = new Scene(); scene.add(new Mesh(geometry, material)); return { scene, animations: [] };
  } };
  const active = await loadModelSet([['active','active']], { loader });
  await assert.rejects(loadModelSet([['shared','shared'],['missing','missing']], { loader }), /missing/);
  assert.equal(released, 0); assert.equal(closed, 0);
  releaseModelAssets(active);
  assert.equal(released, 1); assert.equal(closed, 1);
});
test('shared skeleton releases a late-created bone texture only after its final loaded owner',async()=>{
 const {SkinnedMesh,Skeleton,Bone}=await import('../vendor/three.module.js');const bone=new Bone(),skeleton=new Skeleton([bone]);
 const geometry=new BoxGeometry(),material=new MeshStandardMaterial();
 const loader={async loadAsync(){const scene=new Scene();const a=new SkinnedMesh(geometry,material),b=new SkinnedMesh(geometry,material);a.bind(skeleton);b.bind(skeleton);scene.add(a,b);return{scene,animations:[]};}};
 const first=await loadModelSet([['one','one']],{loader}),second=await loadModelSet([['two','two']],{loader});
 // The renderer allocates this AFTER loadModelSet has retained the scene.
 skeleton.computeBoneTexture();let disposed=0;skeleton.boneTexture.addEventListener('dispose',()=>disposed++);
 releaseModelAssets(first);assert.equal(disposed,0);assert.ok(skeleton.boneTexture);
 releaseModelAssets(second);assert.equal(disposed,1);assert.equal(skeleton.boneTexture,null);
 releaseModelAssets(first);releaseModelAssets(second);assert.equal(disposed,1);
});
