import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, Vector3 } from '../vendor/three.module.js';
import { createAstronaut, createCompanion, createShip } from '../src/lowpoly/models.js';

test('a ship accumulates connected modules as its stage increases and can reset', () => {
  const ship = createShip();
  const cockpit = ship.group.getObjectByName('module-cockpit');
  const body = ship.group.getObjectByName('module-body');
  const propulsion = ship.group.getObjectByName('module-propulsion');
  assert.ok(cockpit.visible);
  assert.equal(body.visible, false);
  assert.equal(propulsion.visible, false);
  ship.setStage(2, false);
  assert.ok(cockpit.visible && body.visible);
  assert.equal(propulsion.visible, false);
  ship.setStage(3, false);
  assert.ok(cockpit.visible && body.visible && propulsion.visible);
  const length = new Box3().setFromObject(ship.group).getSize(new Vector3()).z;
  assert.ok(length >= 5 && length <= 7, `assembled length ${length} must fit the game scale`);
  ship.setStage(1, false);
  assert.ok(cockpit.visible);
  assert.equal(body.visible, false);
  assert.equal(propulsion.visible, false);
});

test('an attaching module settles at the same connection as an instant upgrade', () => {
  const instant = createShip();
  instant.setStage(3, false);
  const animated = createShip();
  animated.update(5);
  animated.setStage(3);
  const body = animated.group.getObjectByName('module-body');
  const target = instant.group.getObjectByName('module-body');
  assert.ok(body.visible);
  assert.ok(body.position.distanceTo(target.position) > 0.5);
  animated.update(7);
  assert.ok(body.position.distanceTo(target.position) < 0.001);
  assert.ok(body.scale.distanceTo(target.scale) < 0.001);
  assert.equal(animated.group.getObjectByName('module-propulsion').visible, true);
});

test('model animation preserves the transforms owned by game navigation', () => {
  for (const create of [createShip, createAstronaut, createCompanion]) {
    const model = create();
    model.group.position.set(12, 3, -8);
    model.group.rotation.set(0.15, 1.2, -0.1);
    const before = model.group.matrix.clone();
    model.group.updateMatrix();
    before.copy(model.group.matrix);
    model.update(0, { moving: 0 });
    model.update(1, { moving: 1, boost: true });
    model.update(100, { moving: 0.3 });
    model.group.updateMatrix();
    assert.deepEqual(model.group.matrix.elements, before.elements);
  }
});

test('stage input cannot leave the ship in a partially invalid configuration', () => {
  const ship = createShip();
  for (const stage of [0, 4, 1.5, NaN]) {
    assert.throws(() => ship.setStage(stage), RangeError);
  }
  assert.equal(ship.group.getObjectByName('module-body').visible, false);
});
