import test from 'node:test';
import assert from 'node:assert/strict';
import { Quaternion, Vector3 } from '../vendor/three.module.js';
import { shipPoint, shipCollisionSpheres, shipFrameRadius } from '../src/lowpoly/spatial.js';

test('the hatch follows ship orientation instead of remaining at world-right', () => {
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
  const dock = shipPoint('dock', new Vector3(10, 2, 20), q);
  assert.ok(dock.distanceTo(new Vector3(7.5, 1.15, 16.7)) < 1e-6);
});
test('each stage adds physical hull coverage and an appropriate inspection frame', () => {
  assert.ok(shipCollisionSpheres(1).every(s => s.center.z < 0));
  assert.ok(shipCollisionSpheres(2).some(s => s.center.z > 0));
  assert.ok(shipCollisionSpheres(3).some(s => s.center.z > 5));
  assert.ok(shipFrameRadius(3) > shipFrameRadius(1) * 1.5);
});
