import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, Mesh, MeshStandardMaterial, Scene, Texture } from '../vendor/three.module.js';
import { loadModelSet, usesMobileAssets } from '../src/lowpoly/asset-loading.js';

const entries = Array.from({ length: 5 }, (_, i) => [String(i), `model-${i}`]);
test('touch phones and iPad desktop mode choose the mobile bundle; Mac keeps full detail', () => {
  assert.equal(usesMobileAssets({ coarsePointer: true }), true);
  assert.equal(usesMobileAssets({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }), true);
  assert.equal(usesMobileAssets({ platform: 'MacIntel', maxTouchPoints: 5 }), true);
  assert.equal(usesMobileAssets({ platform: 'MacIntel', maxTouchPoints: 0 }), false);
  assert.equal(usesMobileAssets({ platform: 'Win32', maxTouchPoints: 0 }), false);
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
