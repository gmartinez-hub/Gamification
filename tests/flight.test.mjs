import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from '../vendor/three.module.js';
import { createFlight } from '../src/lowpoly/flight.js';
import { shipCollisionSpheres } from '../src/lowpoly/spatial.js';

function advance(flight, seconds, direction = new Vector3(), boost = false, options = {}, fps = 60) {
  for (let i = 0; i < seconds * fps; i++) flight.update(1 / fps, direction, boost, options);
}
function aboard() { const flight = createFlight(); flight.reset({ aboard: true }); return flight; }

test('astronaut translates vertically while the ship stays anchored', () => {
  const flight = createFlight(), initial = flight.position.clone();
  advance(flight, 1.5, new Vector3(0, 1, 0));
  assert.ok(flight.position.y > initial.y + 2);
  assert.deepEqual(flight.shipPosition.toArray(), [0, 0, 10]);
  assert.equal(flight.position.x, initial.x);
});

test('ship builds speed gradually and release preserves visible zero-gravity drift', () => {
  const flight = aboard();
  advance(flight, .1, new Vector3(1, 0, 0));
  assert.ok(flight.velocity.length() < .5);
  advance(flight, 2.9, new Vector3(1, 0, 0));
  const position = flight.position.clone();
  advance(flight, .6);
  assert.ok(flight.velocity.length() > 6);
  assert.ok(flight.position.distanceTo(position) > 3);
  assert.equal(flight.thrust.length(), 0);
});

test('explicit braking stops drift through counter-thrust without an instant stop', () => {
  const flight = aboard();
  flight.velocity.set(8, 0, 0);
  const start = flight.position.clone();
  flight.update(.1, undefined, false, { brake: true });
  assert.ok(flight.velocity.x > 6 && flight.velocity.x < 8);
  assert.ok(flight.thrust.x < 0);
  assert.equal(flight.braking, true);
  advance(flight, 1.4, undefined, false, { brake: true });
  assert.ok(flight.velocity.length() < .01);
  assert.ok(flight.position.distanceTo(start) > 4 && flight.position.distanceTo(start) < 6);
});

test('reverse thrust cancels previous momentum before travel reverses', () => {
  const flight = aboard(); flight.velocity.set(8, 0, 0);
  advance(flight, .2, new Vector3(-1, 0, 0));
  assert.ok(flight.velocity.x > 7);
  advance(flight, 3, new Vector3(-1, 0, 0));
  assert.ok(flight.velocity.x < 0);
});

test('releasing boost with thrust held never snaps velocity to the normal speed cap', () => {
  const flight = aboard(); flight.velocity.set(0, 0, -12);
  flight.update(1 / 60, new Vector3(0, 0, -1), false);
  assert.ok(flight.velocity.z < -11.8);
});

test('navigation removes lateral momentum and settles before the target', () => {
  const flight = aboard(); flight.velocity.set(0, 4, 6);
  const target = new Vector3(20, 4, -10);
  let nearest = Infinity;
  for (let frame = 0; frame < 25 * 60; frame++) {
    flight.update(1 / 60, undefined, false, { navigationTarget: target, arrivalRadius: 2.5 });
    nearest = Math.min(nearest, flight.position.distanceTo(target));
    if (flight.arrived) break;
  }
  assert.equal(flight.arrived, true);
  assert.ok(flight.position.distanceTo(target) < 2.75);
  assert.ok(nearest > 2);
  assert.ok(flight.velocity.length() < .25);
  const nose = new Vector3(0, 0, -1).applyQuaternion(flight.shipQuaternion);
  assert.ok(nose.dot(target.clone().sub(flight.position).normalize()) > .95);
});

test('hold stabilizes aim without resetting momentum on the first frame', () => {
  const flight = aboard(); flight.velocity.set(0, 0, -8);
  flight.update(1 / 60, new Vector3(0, 0, -1), true, { hold: true });
  assert.ok(flight.velocity.length() > 7);
  advance(flight, 2, undefined, false, { hold: true });
  assert.ok(flight.velocity.length() < .01);
});

test('heading has angular inertia and reverse translation cannot flip the nose', () => {
  const flight = aboard();
  flight.update(.1, undefined, false, { lookYaw: Math.PI / 2, lookPitch: .4 });
  assert.ok(flight.shipYaw > 0 && flight.shipYaw < .1);
  assert.ok(flight.shipPitch > 0 && flight.shipPitch < .1);
  advance(flight, 4, undefined, false, { lookYaw: Math.PI / 2, lookPitch: .4 });
  assert.ok(Math.abs(flight.shipYaw - Math.PI / 2) < .02);
  assert.ok(Math.abs(flight.shipPitch - .4) < .02);
  const direction = new Vector3(0, 0, -1).applyQuaternion(flight.shipQuaternion);
  assert.ok(direction.x < -.8 && direction.y > .3);
  advance(flight, 1, new Vector3(1, 0, 0));
  assert.ok(Math.abs(flight.shipYaw - Math.PI / 2) < .02);
});

test('deployment follows the rotated hatch and freezes the anchored ship orientation', () => {
  const flight = aboard();
  advance(flight, 4, undefined, false, { lookYaw: Math.PI / 2 });
  const before = flight.shipQuaternion.clone();
  assert.equal(flight.deploy(), true);
  assert.ok(Math.abs(flight.position.x + 2.5) < .02);
  assert.ok(Math.abs(flight.position.z - 5.5) < .02);
  advance(flight, 1, new Vector3(0, 1, 0), false, { lookYaw: -1, lookPitch: 1 });
  assert.ok(flight.shipQuaternion.angleTo(before) < 1e-8);
  assert.deepEqual(flight.shipPosition.toArray(), [0, 0, 10]);
});

test('tether tightens progressively and bounds distance from the physical port', () => {
  const flight = createFlight();
  advance(flight, 10, new Vector3(1, 0, 0), true);
  assert.ok(flight.position.clone().add(new Vector3(0, .85, 0)).distanceTo(flight.tetherPosition) <= 26.00001);
  assert.ok(flight.tetherLength > 22);
  assert.ok(flight.tension > .05);
  const stretched = flight.tetherLength;
  advance(flight, 2, new Vector3(-1, 0, 0));
  assert.ok(flight.tetherLength < stretched);
});

test('taut cable removes outward drift while preserving tangential movement', () => {
  const flight = createFlight();
  flight.astronautPosition.copy(flight.tetherPosition).add(new Vector3(26, -.85, 0));
  flight.velocity.set(5, 0, 2); flight.update(1 / 60);
  assert.ok(flight.tetherLength <= 26.00001);
  assert.ok(flight.velocity.z > 1.8);
  assert.ok(flight.velocity.x < .1);
});

test('return travels around the full hull and boards only at the physical hatch', () => {
  const flight = createFlight(); flight.setStage(3);
  flight.astronautPosition.set(-9, 0, 6.5);
  assert.equal(flight.returnToShip(), true);
  flight.update(1 / 60);
  assert.equal(flight.actor, 'astronaut');
  assert.ok(flight.velocity.length() < .2);
  for (let frame = 0; frame < 30 * 60 && flight.actor === 'astronaut'; frame++) {
    const previous = flight.position.clone(); flight.update(1 / 60);
    const local = flight.astronautPosition.clone().add(new Vector3(0, .85, 0)).sub(flight.shipPosition).applyQuaternion(flight.shipQuaternion.clone().invert());
    for (const sphere of shipCollisionSpheres(3)) {
      assert.ok(local.distanceTo(new Vector3().copy(sphere.center)) >= sphere.radius + .64, 'return path intersects the hull');
    }
    assert.ok(previous.distanceTo(flight.astronautPosition) < .2, 'return cannot teleport');
  }
  assert.equal(flight.actor, 'ship');
  assert.equal(flight.returning, false);
  assert.ok(flight.astronautPosition.distanceTo(flight.dockPosition) < .01);
  assert.equal(flight.tetherLength, 0);
});

test('EVA guidance reaches a beacon across the cockpit without intersecting the hull', () => {
  const flight = createFlight(), target = new Vector3(-6, 3, 1);
  for (let frame = 0; frame < 25 * 60; frame++) {
    flight.update(1 / 60, undefined, false, { navigationTarget: target, arrivalRadius: 2.5 });
    for (const sphere of shipCollisionSpheres(1)) {
      const center = new Vector3().copy(sphere.center).add(flight.shipPosition);
      assert.ok(flight.position.clone().add(new Vector3(0, .85, 0)).distanceTo(center) >= sphere.radius + .64);
    }
    if (flight.arrived) break;
  }
  assert.equal(flight.arrived, true);
  assert.ok(flight.position.distanceTo(target) < 2.75);
});

test('return from immediately beside the hull cannot teleport into the hatch', () => {
  const flight = createFlight(); flight.astronautPosition.set(2.81, -.85, 6.5);
  flight.returnToShip(); const initial = flight.position.clone(); flight.update(1 / 60);
  assert.equal(flight.actor, 'astronaut');
  assert.ok(flight.position.distanceTo(initial) < .05);
  for (let frame = 0; frame < 15 * 60 && flight.returning; frame++) flight.update(1 / 60);
  assert.equal(flight.actor, 'ship');
  assert.ok(flight.astronautPosition.distanceTo(flight.dockPosition) < .01);
});

test('hull avoidance protects the body and helmet when passing below a cabin', () => {
  const flight = createFlight(); flight.astronautPosition.set(0, -2.8, 6.5);
  flight.update(1 / 60, undefined, false, { hold: true });
  const cabinCenter = new Vector3(0, 0, 6.5);
  assert.ok(flight.position.clone().add(new Vector3(0, .85, 0)).distanceTo(cabinCenter) >= 2.8);
  assert.ok(flight.position.clone().add(new Vector3(0, 1.58, 0)).distanceTo(cabinCenter) >= 2.50);
  flight.returnToShip();
  for (let frame = 0; frame < 20 * 60 && flight.returning; frame++) flight.update(1 / 60);
  assert.equal(flight.actor, 'ship', 'helmet clearance must not block the real hatch');
});

test('corridor heading changes preserve position and velocity and converge without snapping', () => {
  const flight = aboard();
  advance(flight, 4, undefined, false, { lookYaw: 1, lookPitch: .5 });
  flight.velocity.set(2, 3, -4);
  const position = flight.position.clone(), velocity = flight.velocity.clone(), yaw = flight.shipYaw;
  flight.updateHeading(1 / 60, { lookYaw: 0, lookPitch: 0 });
  assert.ok(Math.abs(flight.shipYaw - yaw) < .03);
  for (let i = 0; i < 5 * 60; i++) flight.updateHeading(1 / 60, { lookYaw: 0, lookPitch: 0 });
  assert.ok(Math.abs(flight.shipYaw) < .001 && Math.abs(flight.shipPitch) < .001);
  assert.ok(flight.position.equals(position)); assert.ok(flight.velocity.equals(velocity));
  for (const dt of [0, -1, NaN, Infinity]) flight.updateHeading(dt, { lookYaw: 1 });
  assert.ok(Math.abs(flight.shipYaw) < .001);
  flight.deploy(); const quaternion = flight.shipQuaternion.clone();
  flight.updateHeading(.1, { lookYaw: 1, lookPitch: 1 });
  assert.ok(flight.shipQuaternion.equals(quaternion), 'anchored EVA vessel cannot rotate');
});

test('manual input cannot bypass an in-progress physical return', () => {
  const flight = createFlight(); flight.astronautPosition.set(17, 5, 10);
  flight.returnToShip(); assert.equal(flight.deploy(), false);
  for (let frame = 0; frame < 12 * 60 && flight.returning; frame++) flight.update(1 / 60, new Vector3(1, 0, 0), true);
  assert.equal(flight.actor, 'ship');
});

test('reset preserves vector identities, clears inertia and can arrive aboard', () => {
  const flight = createFlight();
  const ship = flight.shipPosition, astronaut = flight.astronautPosition, velocity = flight.velocity;
  flight.astronautPosition.set(15, 8, 0); flight.returnToShip(); advance(flight, .2);
  flight.reset({ aboard: true });
  assert.equal(flight.actor, 'ship'); assert.equal(flight.returning, false);
  assert.equal(flight.velocity.length(), 0);
  assert.equal(flight.shipPosition, ship); assert.equal(flight.astronautPosition, astronaut); assert.equal(flight.velocity, velocity);
  assert.equal(flight.shipQuaternion.w, 1);
  flight.reset(); assert.equal(flight.actor, 'astronaut');
  assert.deepEqual(flight.astronautPosition.toArray(), [4.5, -.85, 7.5]);
});

test('flight and steering remain consistent at desktop and lower mobile frame rates', () => {
  const desktop = aboard(), mobile = aboard(), input = new Vector3(.8, .3, -.5);
  const options = { lookYaw: 1, lookPitch: .3 };
  advance(desktop, 2, input, false, options, 60); advance(mobile, 2, input, false, options, 20);
  advance(desktop, 1, undefined, false, {}, 60); advance(mobile, 1, undefined, false, {}, 20);
  assert.ok(desktop.position.distanceTo(mobile.position) < .01);
  assert.ok(desktop.velocity.distanceTo(mobile.velocity) < .01);
  assert.ok(desktop.shipQuaternion.angleTo(mobile.shipQuaternion) < .001);
});

test('diagonal propulsion cannot exceed straight-line travel speed', () => {
  const axial = aboard(), diagonal = aboard(), start = axial.position.clone();
  advance(axial, 2, new Vector3(1, 0, 0)); advance(diagonal, 2, new Vector3(1, 1, 1));
  assert.ok(Math.abs(axial.position.distanceTo(start) - diagonal.position.distanceTo(start)) < .001);
});

test('world bounds constrain travel and permit deploying inside the map', () => {
  const flight = aboard(); advance(flight, 30, new Vector3(1, 1, -1), true);
  assert.ok(flight.position.x <= 220 && flight.position.y <= 100 && flight.position.z >= -300);
  assert.equal(flight.deploy(), true);
  assert.ok(flight.position.x <= 220 && flight.position.y <= 100 && flight.position.z >= -300);
});

test('paused and invalid time steps cannot move translation or orientation', () => {
  const flight = aboard(), before = flight.position.clone();
  for (const dt of [0, -1, NaN, Infinity]) flight.update(dt, new Vector3(1, 0, 0), false, { lookYaw: 1 });
  assert.ok(flight.position.equals(before)); assert.equal(flight.velocity.length(), 0); assert.equal(flight.shipQuaternion.w, 1);
});

test('impact separates a ship and reflects only the incoming relative normal velocity', () => {
  const flight = aboard(); flight.velocity.set(-8, 3, 2);
  flight.applyImpact(new Vector3(2, 0, 0), 2, new Vector3(-2, 1, -1));
  assert.equal(flight.position.x, 2);
  assert.ok(Math.abs(flight.velocity.x + 1.1) < 1e-10, 'restitution is relative to the moving obstacle');
  assert.equal(flight.velocity.y, 3); assert.equal(flight.velocity.z, 2);
  assert.equal(flight.thrust.length(), 0, 'collision impulses are not thruster input');
});

test('separating contact never reflects an already outgoing velocity', () => {
  const flight = aboard(); flight.velocity.set(3, 2, -1);
  flight.applyImpact(new Vector3(1, 0, 0), .5, new Vector3(1, 0, 0));
  assert.deepEqual(flight.velocity.toArray(), [3, 2, -1]);
  assert.equal(flight.position.x, .5);
});

test('an impact cannot push EVA beyond the cable and preserves tangential velocity', () => {
  const flight = createFlight();
  flight.astronautPosition.copy(flight.tetherPosition).add(new Vector3(25.9, -.85, 0));
  flight.velocity.set(2, 0, 1);
  flight.applyImpact(new Vector3(1, 0, 0), 4, new Vector3());
  assert.ok(flight.tetherLength <= 26.00001 && flight.tetherLength > 25.99);
  assert.ok(Math.abs(flight.velocity.x) < .001);
  assert.equal(flight.velocity.z, 1);
});

test('impact separation reapplies the EVA hull envelope and the ship world boundary', () => {
  const flight = createFlight(); flight.astronautPosition.set(3.5, -.85, 6.5);
  flight.applyImpact(new Vector3(-1, 0, 0), 2, new Vector3());
  assert.ok(flight.position.clone().add(new Vector3(0, .85, 0)).distanceTo(new Vector3(0, 0, 6.5)) >= 2.8);
  flight.reset({ aboard: true }); flight.shipPosition.set(215, 0, 10); flight.velocity.set(3, 2, 0);
  flight.applyImpact(new Vector3(1, 0, 0), 10, new Vector3());
  assert.ok(flight.position.x < 220); assert.equal(flight.velocity.x, 0); assert.equal(flight.velocity.y, 2);
  flight.deploy(); assert.ok(flight.position.x <= 220);
});

test('invalid contact data cannot corrupt flight position or velocity', () => {
  const flight = aboard(), position = flight.position.clone(); flight.velocity.set(1, 2, 3);
  for (const normal of [undefined, new Vector3(), { x: NaN, y: 1, z: 0 }]) flight.applyImpact(normal, 4);
  flight.applyImpact(new Vector3(1, 0, 0), Infinity);
  assert.ok(flight.position.equals(position)); assert.deepEqual(flight.velocity.toArray(), [1, 2, 3]);
});

test('the extended route is reachable before deploying an EVA with its full tether',()=>{
 const flight=aboard(), destination=new Vector3(-35,28,-211);
 advance(flight,65,new Vector3(),false,{navigationTarget:destination,arrivalRadius:0});
 assert.ok(flight.position.distanceTo(destination)<.2,'third search region must not be clamped by old prototype bounds');
 flight.deploy();flight.update(.02,new Vector3(1,0,0));assert.ok(flight.tetherLength<26);
});
