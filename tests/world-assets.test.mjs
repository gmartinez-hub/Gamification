import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createSectorWorld } from '../src/lowpoly/sector-world.js';
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

test('imported asteroid surfaces share geometry and remain inside their gameplay collision spheres', () => {
  const fixture = assetFixture(), world = createSectorWorld(new THREE.Scene(), { assets: fixture.assets });
  world.load(layout());
  const a = world.targets[0], b = world.targets[1];
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

test('normalization releases source geometry while sector replacement retains shared templates', () => {
  const fixture = assetFixture(), world = createSectorWorld(new THREE.Scene(), { assets: fixture.assets });
  world.load(layout());
  const shared = firstMesh(world.targets[0].object.userData.body).geometry;
  let releases = 0; shared.addEventListener('dispose', () => releases++);
  world.load({ ...layout(), biomeId: 'umbra' });
  assert.equal(firstMesh(world.targets[0].object.userData.body).geometry, shared);
  assert.equal(releases, 0); assert.deepEqual(fixture.releases.sort(), ['base:geometry', 'beacon:geometry', 'rock:geometry']);
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
