import assert from 'node:assert/strict';
import test from 'node:test';
import * as effects from '../src/lowpoly/effects.js';

test('impact atlas advances in top-left row order without wrapping on its final frame', () => {
  assert.equal(typeof effects.atlasFrame, 'function');
  const frame = {};
  const sample = progress => effects.atlasFrame(4, 4, progress, frame);
  assert.equal(sample(0), frame, 'reuse the supplied frame object');
  assert.deepEqual(frame, { frame: 0, x: 0, y: .75, width: .25, height: .25 });
  assert.deepEqual(sample(.26), { frame: 4, x: 0, y: .5, width: .25, height: .25 });
  assert.deepEqual(sample(.999), { frame: 15, x: .75, y: 0, width: .25, height: .25 });
  assert.deepEqual(sample(1), { frame: 15, x: .75, y: 0, width: .25, height: .25 });
});

test('scan strips use horizontal quarters and clamp pre-start or late samples', () => {
  const frame = {};
  assert.deepEqual(effects.atlasFrame(4, 1, -.1, frame), { frame: 0, x: 0, y: 0, width: .25, height: 1 });
  assert.deepEqual(effects.atlasFrame(4, 1, .5, frame), { frame: 2, x: .5, y: 0, width: .25, height: 1 });
  assert.deepEqual(effects.atlasFrame(4, 1, 2, frame), { frame: 3, x: .75, y: 0, width: .25, height: 1 });
});
