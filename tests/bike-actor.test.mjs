import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.mjs';
import { createBikeActor, BIKE_ANCHORS } from '../src/lowpoly/bike-actor.js';

let fixture;
async function assets() {
  if (!fixture) fixture = (async () => {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    loader.register(() => ({ name: 'BikeGeometryOnlyTest', loadTexture: () => Promise.resolve(null) }));
    const load = async path => { const b = await readFile(new URL(path, import.meta.url)); return loader.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), ''); };
    const [bike, riderClips, human] = await Promise.all([
      load('../assets/runtime/encounter-models/bike.glb'),
      load('../assets/runtime/encounter-models/bike-rider.glb'),
      load('../assets/runtime/models/astronauta-armado.glb'),
    ]);
    return { bike, riderClips, human };
  })();
  return fixture;
}
const make = a => createBikeActor(a, a.human);
function settle(actor, options, start = 0) { for (let i = 0; i < 180; i++) actor.update(start + i / 60, { dt: 1 / 60, ...options }); }
const palm = (actor, side) => actor.visual.worldToLocal(actor.rider.getObjectByName('hand' + side).localToWorld(new THREE.Vector3(0, .105, 0)));

test('rider clips preserve the original human skeleton and physically reach the measured grips', async () => {
  const a = await assets(), actor = make(a), originalPose = [];
  a.human.scene.traverse(node => { if (node.isBone) originalPose.push([node, node.quaternion.toArray()]); });
  for (const clip of a.riderClips.animations) for (const track of clip.tracks) assert(actor.rider.getObjectByName(track.name.slice(0, track.name.lastIndexOf('.'))), 'Every authored bone track must bind');
  let start = 0;
  for (const options of [{}, { thrust: 1, boost: true }, { braking: true }, { aiming: true }]) {
    settle(actor, options, start); start += 3;
    assert(palm(actor, 'L').distanceTo(new THREE.Vector3(...BIKE_ANCHORS.leftGrip)) < .001, 'Left palm stays on the real handlebar while aiming');
    if (!options.aiming) assert(palm(actor, 'R').distanceTo(new THREE.Vector3(...BIKE_ANCHORS.rightGrip)) < .001, 'Right hand grips the bar while riding');
    for (const side of ['L', 'R']) {
      const ankle = actor.visual.worldToLocal(actor.rider.getObjectByName('foot' + side).getWorldPosition(new THREE.Vector3()));
      assert(ankle.distanceTo(new THREE.Vector3(...BIKE_ANCHORS[side === 'L' ? 'leftAnkle' : 'rightAnkle'])) < .001, 'Boots do not drift off the side supports');
    }
  }
  const muzzle = actor.muzzle.getWorldPosition(new THREE.Vector3()); assert(muzzle.z < -.9 && muzzle.y > 1.3, 'Shot must emerge from the held pistol ahead of the bike');
  assert(palm(actor, 'L').x < 0 && palm(actor, 'R').x > 0, 'Hands preserve anatomical left and right');
  for (const [bone, q] of originalPose) assert.deepEqual(bone.quaternion.toArray(), q, 'Riding must not change the source EVA pose');
  actor.dispose();
});

test('first-person riding shows original detailed arms and pistol without helmet/body occlusion', async () => {
  const actor = make(await assets()); settle(actor, { aiming: true, firstPerson: true });
  assert(actor.rider.visible); assert(actor.body.every(mesh => !mesh.visible)); assert(actor.arms.every(mesh => mesh.visible));
  assert(actor.arms[0].geometry.index.count > 1000); assert.equal(actor.arms[0].geometry.attributes.position, actor.body[0].geometry.attributes.position);
  assert.equal(actor.arms[0].material, actor.body[0].material); assert.equal(actor.arms[0].skeleton, actor.body[0].skeleton);
  assert(actor.rider.getObjectByName('Nova_Pulse_Gun').visible);
  const eye = actor.eye.getWorldPosition(new THREE.Vector3()); assert(eye.y > 1.5 && eye.y < 1.85); assert.equal(actor.eye.parent.name, 'head');
  actor.update(4, { mounted: true, firstPerson: false }); assert(actor.body.every(mesh => mesh.visible)); assert(actor.arms.every(mesh => !mesh.visible));
  actor.update(4.1, { mounted: false }); assert(!actor.rider.visible); assert(actor.model.visible, 'Parked bike remains in the map');
  actor.dispose();
});

test('all four bike exhausts follow measured engine mouths through actor motion and boost', async () => {
  const actor = make(await assets()), scene = new THREE.Scene(); scene.add(actor.group);
  actor.group.position.set(4, 2, -6); actor.group.rotation.y = .8; settle(actor, { thrust: 1, boost: true, velocity: new THREE.Vector3(3, 0, -8) });
  assert.equal(actor.exhaust.stats.engines, 4); assert(actor.exhaust.history.activeCount > 0);
  const engines = []; actor.group.traverse(node => { if (/^plasma-engine-/.test(node.name)) engines.push(node); });
  assert.equal(engines.length, 4);
  engines.forEach((engine, i) => {
    assert(engine.visible);
    const origin = actor.visual.localToWorld(new THREE.Vector3(...BIKE_ANCHORS.nozzles[i].position));
    assert(engine.getWorldPosition(new THREE.Vector3()).distanceTo(origin) < 1e-6, 'Flame exit cannot move relative to the original nozzle');
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(engine.getWorldQuaternion(new THREE.Quaternion()));
    const expected = new THREE.Vector3(0, 0, 1).applyQuaternion(actor.visual.getWorldQuaternion(new THREE.Quaternion()));
    assert(direction.dot(expected) > .9999, 'Flames exhaust backward, independently of camera yaw');
  });
  actor.update(4, { mounted: false, dt: .1 }); assert(engines.every(engine => !engine.visible));
  actor.reset(); assert.equal(actor.exhaust.history.activeCount, 0); actor.dispose();
});

test('bike actor disposal releases private skeleton and FP geometry once without damaging shared source assets', async () => {
  const a = await assets(), actor = make(a), source = [];
  for (const root of [a.bike.scene, a.human.scene]) root.traverse(node => { if (node.isMesh) source.push(node); });
  let sourceDisposals = 0, armDisposals = 0, skeletonDisposals = 0;
  for (const mesh of source) { mesh.geometry.addEventListener('dispose', () => sourceDisposals++); for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.addEventListener('dispose', () => sourceDisposals++); }
  for (const arm of actor.arms) arm.geometry.addEventListener('dispose', () => armDisposals++);
  const skeleton = actor.body[0].skeleton; skeleton.computeBoneTexture(); skeleton.boneTexture.addEventListener('dispose', () => skeletonDisposals++);
  actor.dispose(); actor.dispose(); assert.equal(sourceDisposals, 0); assert.equal(armDisposals, actor.arms.length); assert.equal(skeletonDisposals, 1);
});
