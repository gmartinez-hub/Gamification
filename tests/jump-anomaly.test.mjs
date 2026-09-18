import test from 'node:test';
import assert from 'node:assert/strict';
import { createJumpAnomaly } from '../src/lowpoly/jump-anomaly.js';

test('jump anomaly is a reusable 3D effect with reduced-motion support', () => {
  const anomaly=createJumpAnomaly();
  assert.equal(anomaly.group.visible,false);
  anomaly.setActive(true);anomaly.update(1,.1,{reducedMotion:false});
  assert.equal(anomaly.group.visible,true);
  assert.ok(anomaly.group.getObjectByName('jump-event-horizon'));
  const rotation=anomaly.group.rotation.z;
  anomaly.update(2,.1,{reducedMotion:true});
  assert.equal(anomaly.group.rotation.z,rotation);
  anomaly.dispose();
});
