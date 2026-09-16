import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, PerspectiveCamera, Vector3 } from '../vendor/three.module.js';
import { createExpedition } from '../src/lowpoly/expedition.js';
import { createSectorWorld } from '../src/lowpoly/sector-world.js';

test('dangerous rocks traverse several metres even when cosmetic motion is reduced', () => {
  const mission = createExpedition(712069);
  const world = createSectorWorld(new Scene());
  world.load(mission.state.layout);
  const record = world.hazards[0];
  const original = record.position.clone();
  const reference = record.position;
  world.sync(mission.state, 4, { reducedMotion: true });
  assert.equal(record.position, reference);
  assert.ok(record.position.distanceTo(original) > 1, 'moving danger remains part of gameplay');
  assert.ok(record.previousPosition.distanceTo(original) < 1e-8);
  assert.ok(record.velocity.length() > 0.01);
  world.dispose();
});

test('celestial layer keeps its angular scale across a whole sector journey', () => {
  const world = createSectorWorld(new Scene());
  world.load(createExpedition(7).state.layout);
  assert.ok(world.skyScene instanceof Scene);
  assert.ok(world.skyCamera instanceof PerspectiveCamera);
  const camera = new PerspectiveCamera(52, 1.6, .1, 600);
  camera.position.set(0, 0, 10);
  camera.rotation.set(.15, .5, 0);
  world.updateSky(camera);
  const planet = world.skyScene.getObjectByName('biome-planet');
  const firstDistance = planet.position.distanceTo(world.skyCamera.position);
  camera.position.set(30, 15, -80);
  world.updateSky(camera);
  const secondDistance = planet.position.distanceTo(world.skyCamera.position);
  assert.ok(Math.abs(secondDistance / firstDistance - 1) < .02);
  assert.ok(world.skyCamera.quaternion.angleTo(camera.quaternion) < 1e-8);
  assert.equal(world.skyCamera.fov, camera.fov);
  assert.equal(world.skyCamera.aspect, camera.aspect);
  world.dispose();
});

test('relative swept collision catches a crossing between separated endpoints', async () => {
  const { sweptSphereHit } = await import('../src/lowpoly/hazards.js');
  const p = (x, y = 0, z = 0) => ({ x, y, z });
  assert.equal(sweptSphereHit(p(-10), p(10), p(10), p(-10), 2), true);
  assert.equal(sweptSphereHit(p(-10, 3), p(10, 3), p(10), p(-10), 2), false);
  assert.equal(sweptSphereHit(p(0), p(0), p(1), p(1), 2), true);
  assert.equal(sweptSphereHit(p(0), p(0), p(5), p(5), 2), false);
  assert.equal(sweptSphereHit(p(-10, 2), p(10, 2), p(0), p(0), 2), true);
});

test('trajectory samples are deterministic and velocity predicts short-term movement', async () => {
  const { sampleHazard } = await import('../src/lowpoly/hazards.js');
  const spec = { position: { x: 10, y: 2, z: -8 }, motion: { axis: { x: .6, y: .8, z: 0 }, amplitude: 6, period: 24, phase: .3 } };
  const position = new Vector3(), velocity = new Vector3(), later = new Vector3(), again = new Vector3();
  sampleHazard(spec, 7, position, velocity);
  sampleHazard(spec, 7.001, later, new Vector3());
  sampleHazard(spec, 7, again, new Vector3());
  assert.ok(again.equals(position));
  assert.ok(later.sub(position).multiplyScalar(1000).distanceTo(velocity) < .001);
  const limits = [Infinity, -Infinity];
  for (let t = 0; t <= 24; t += .1) {
    sampleHazard(spec, t, later, velocity);
    limits[0] = Math.min(limits[0], later.x); limits[1] = Math.max(limits[1], later.x);
    assert.ok(later.distanceTo(new Vector3(10, 2, -8)) <= 6.000001);
    assert.ok(velocity.length() <= 2);
  }
  assert.ok(limits[1] - limits[0] > 7);
});

test('collision warning distinguishes approaching, receding and stationary neighbours', async () => {
  const { closestApproach } = await import('../src/lowpoly/hazards.js');
  const p = (x, y = 0, z = 0) => ({ x, y, z });
  assert.deepEqual(closestApproach(p(8, 2), p(-4), 3), { time: 2, distance: 2 });
  assert.deepEqual(closestApproach(p(8), p(4), 3), { time: 0, distance: 8 });
  assert.deepEqual(closestApproach(p(8), p(0), 3), { time: 0, distance: 8 });
  assert.deepEqual(closestApproach(p(20), p(-4), 2), { time: 2, distance: 12 });
});

test('contact returns an entry normal and separation even when a fast body crosses the whole rock', async () => {
  const { sweptSphereContact } = await import('../src/lowpoly/hazards.js');
  const zero = { x: 0, y: 0, z: 0 };
  const hit = sweptSphereContact({ x: -5, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }, zero, zero, 2);
  assert.ok(hit); assert.ok(hit.normal.x < -.99); assert.ok(hit.depth >= 7);
  assert.equal(sweptSphereContact({ x: -5, y: 3, z: 0 }, { x: 5, y: 3, z: 0 }, zero, zero, 2), null);
});

test('stationary overlap can be separated with finite contact data', async () => {
  const { sweptSphereContact } = await import('../src/lowpoly/hazards.js');
  const zero = { x: 0, y: 0, z: 0 };
  const hit = sweptSphereContact(zero, zero, zero, zero, 2);
  assert.ok(hit && hit.depth >= 2);
  assert.equal(Math.hypot(hit.normal.x, hit.normal.y, hit.normal.z), 1);
});
