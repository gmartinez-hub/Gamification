import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const manifestURL = new URL('../assets/runtime/closeout-models/manifest.json', import.meta.url);

test('closeout asset package contains the four canonical traced GLBs', async () => {
  const manifest = JSON.parse(await readFile(manifestURL, 'utf8'));
  assert.equal(manifest.version, 1);
  assert.deepEqual(manifest.assets.map(asset => asset.id), [
    'green-ally', 'energy-cell', 'modular-turret', 'orbital-service-bay',
  ]);
  for (const asset of manifest.assets) {
    assert.match(asset.sourceSha256, /^[a-f0-9]{64}$/);
    assert.ok(asset.triangles > 0);
    assert.ok(asset.meshes > 0);
    assert.ok(asset.materials > 0);
    assert.deepEqual(asset.textureSizes, [[2048, 2048], [2048, 2048], [2048, 2048]]);
    const url = new URL(asset.file, manifestURL);
    await access(url);
    assert.ok((await stat(url)).size > 1024);
    const bytes = await readFile(url);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'glTF');
  }
});
