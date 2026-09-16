import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from '../vendor/three.module.js';
import { createFlight } from '../src/lowpoly/flight.js';

function advance(flight, seconds, direction = new Vector3(), boost = false, fps = 60) {
  for (let i = 0; i < seconds * fps; i += 1) flight.update(1 / fps, direction, boost);
}

test('astronaut can translate vertically while the ship stays anchored', () => {
  const flight = createFlight();
  advance(flight, 1, new Vector3(0, 1, 0));
  assert.ok(flight.position.y > 2);
  assert.deepEqual(flight.shipPosition.toArray(), [0, 0, 10]);
  assert.equal(flight.position.x, 2);
});

test('sustained outward boost cannot exceed the tether, and inward input releases tension', () => {
  const flight = createFlight();
  advance(flight, 10, new Vector3(1, 0, 0), true);
  assert.ok(flight.astronautPosition.distanceTo(flight.shipPosition) <= 26.00001);
  assert.ok(flight.tetherLength > 25.9);
  assert.ok(flight.tension > 0.95);
  assert.ok(flight.velocity.x < 0.001, 'the taut cable removes outward velocity');
  advance(flight, 1, new Vector3(-1, 0, 0));
  assert.ok(flight.tetherLength < 24);
  assert.ok(flight.tension < 0.9);
});

test('return moves visibly and keeps astronaut control until physically at the access point', () => {
  const flight = createFlight();
  flight.astronautPosition.set(20, 4, 10);
  assert.equal(flight.returnToShip(), true);
  assert.equal(flight.actor, 'astronaut');
  assert.equal(flight.returning, true);
  flight.update(1 / 60, new Vector3(1, 0, 0), true);
  assert.equal(flight.actor, 'astronaut');
  assert.ok(flight.position.x > 19);
  assert.ok(flight.position.x < 20);
  advance(flight, 6);
  assert.equal(flight.actor, 'ship');
  assert.equal(flight.returning, false);
  assert.ok(flight.astronautPosition.distanceTo(new Vector3(2, 0, 10)) < 0.25);
  assert.equal(flight.tetherLength, 0);
  assert.equal(flight.tension, 0);
});

test('deploying cannot bypass return, then places the astronaut beside the relocated ship', () => {
  const flight = createFlight();
  flight.astronautPosition.set(15, 0, 10);
  flight.returnToShip();
  assert.equal(flight.deploy(), false);
  assert.equal(flight.returning, true);
  advance(flight, 4);
  advance(flight, 1, new Vector3(0, 0, -1));
  assert.ok(flight.shipPosition.z < 7);
  assert.equal(flight.deploy(), true);
  assert.equal(flight.actor, 'astronaut');
  assert.ok(flight.astronautPosition.distanceTo(flight.shipPosition) <= 2.01);
  assert.equal(flight.astronautPosition.z, flight.shipPosition.z);
  assert.equal(flight.velocity.length(), 0);
  const shipAtDeploy = flight.shipPosition.clone();
  advance(flight, 1, new Vector3(0, 1, 0));
  assert.ok(flight.shipPosition.equals(shipAtDeploy));
});

test('releasing propulsion brakes flight instead of drifting indefinitely', () => {
  const flight = createFlight();
  advance(flight, 1, new Vector3(1, 0, 0));
  const atRelease = flight.position.clone();
  advance(flight, 2);
  assert.ok(flight.velocity.length() < 0.01);
  assert.ok(flight.position.distanceTo(atRelease) < 2);
});

test('an omitted direction releases propulsion rather than reusing last input', () => {
  const flight = createFlight();
  advance(flight, 0.5, new Vector3(1, 0, 0));
  const speedBefore = flight.velocity.length();
  flight.update(1 / 60);
  assert.ok(flight.velocity.length() < speedBefore);
});

test('diagonal input cannot exceed straight-line travel speed', () => {
  const axial = createFlight();
  const diagonal = createFlight();
  const start = axial.position.clone();
  advance(axial, 1, new Vector3(1, 0, 0));
  advance(diagonal, 1, new Vector3(1, 1, 1));
  assert.ok(Math.abs(axial.position.distanceTo(start) - diagonal.position.distanceTo(start)) < 0.001);
});

test('the world bounds constrain a piloted ship and still permit redeploying inside the map', () => {
  const flight = createFlight();
  flight.returnToShip();
  advance(flight, 1);
  advance(flight, 20, new Vector3(1, 1, -1), true);
  assert.ok(flight.shipPosition.x <= 50);
  assert.ok(flight.shipPosition.y <= 22);
  assert.ok(flight.shipPosition.z >= -90);
  assert.equal(flight.deploy(), true);
  assert.ok(flight.position.x <= 50);
  assert.ok(flight.position.y <= 22);
  assert.ok(flight.position.z >= -90);
});

test('reset preserves position references and clears a return in progress', () => {
  const flight = createFlight();
  const shipReference = flight.shipPosition;
  const astronautReference = flight.astronautPosition;
  flight.astronautPosition.set(15, 8, 0);
  flight.returnToShip();
  advance(flight, 0.2);
  assert.ok(flight.velocity.length() > 0);
  flight.reset();
  assert.equal(flight.actor, 'astronaut');
  assert.equal(flight.returning, false);
  assert.equal(flight.velocity.length(), 0);
  assert.equal(flight.shipPosition, shipReference);
  assert.equal(flight.astronautPosition, astronautReference);
  assert.deepEqual(flight.shipPosition.toArray(), [0, 0, 10]);
  assert.deepEqual(flight.astronautPosition.toArray(), [2, 0, 10]);
});

test('flight distance is consistent at desktop and lower mobile frame rates', () => {
  const desktop = createFlight();
  const mobile = createFlight();
  advance(desktop, 2, new Vector3(0, 0, -1), false, 60);
  advance(mobile, 2, new Vector3(0, 0, -1), false, 20);
  assert.ok(desktop.position.distanceTo(mobile.position) < 0.01);
});

test('a paused or invalid time step cannot move the actor', () => {
  const flight = createFlight();
  const before = flight.position.clone();
  for (const dt of [0, -1, NaN, Infinity]) flight.update(dt, new Vector3(1, 0, 0));
  assert.ok(flight.position.equals(before));
  assert.ok(flight.velocity.length() === 0);
});
