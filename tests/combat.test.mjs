import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/lowpoly/combat.js';

const shot = { id: 'small-1', actor: 'astronaut', kind: 'small', distance: 10, chance: .8, origin: { x: 0, y: 0, z: 0 } };
test('wrong weapon and out-of-range attempts do not spend a shot', () => {
  const combat = createCombat(() => 0);
  assert.equal(combat.start({ ...shot, actor: 'ship' }), false);
  assert.equal(combat.start({ ...shot, distance: 100 }), false);
  assert.equal(combat.stats.attempts, 0);
});
test('invalid probability cannot spend a shot or turn a valid retry into a guaranteed miss', () => {
  const combat = createCombat(() => 0);
  for (const chance of [NaN, undefined, Infinity, -Infinity]) {
    assert.equal(combat.start({ ...shot, chance }), false);
    assert.equal(combat.shot, null);
    assert.equal(combat.stats.attempts, 0);
  }
  assert.equal(combat.start(shot), true);
  assert.equal(combat.update(2).hit, true);
  assert.equal(combat.stats.hits, 1);
  assert.equal(combat.stats.misses, 0);
});
test('a hit resolves once, after lock and projectile travel', () => {
  const combat = createCombat(() => 0);
  assert.equal(combat.start(shot), true);
  assert.equal(combat.update(.5), null);
  assert.equal(combat.shot.phase, 'lock');
  assert.equal(combat.update(.65), null);
  assert.equal(combat.shot.phase, 'travel');
  assert.equal(combat.update(.55), null, 'the visible projectile must still be travelling before impact');
  assert.deepEqual(combat.update(.2), { id: 'small-1', actor: 'astronaut', hit: true });
  assert.equal(combat.update(1), null);
  assert.equal(combat.stats.hits, 1);
});
test('a miss can be retried after recovery and never grants damage', () => {
  let roll = 1;
  const combat = createCombat(() => roll);
  combat.start(shot);
  assert.equal(combat.start(shot), false);
  assert.equal(combat.update(2).hit, false);
  assert.equal(combat.start(shot), false);
  combat.update(1);
  roll = 0;
  assert.equal(combat.start(shot), true);
  assert.equal(combat.update(2).hit, true);
  assert.equal(combat.stats.misses, 1);
  assert.equal(combat.stats.hits, 1);
});
test('reset clears an in-flight shot and accumulated counters', () => {
  const combat = createCombat(() => 0);
  combat.start(shot);
  combat.update(1.2);
  combat.reset();
  assert.equal(combat.shot, null);
  assert.equal(combat.update(3), null);
  assert.equal(combat.stats.attempts, 0);
});

function resolve(combat, options = shot) {
  combat.update(1);
  assert.equal(combat.start(options), true);
  return combat.update(4);
}
test('two misses grant the next valid shot on that target, then assistance resets', () => {
  const combat = createCombat(() => 1);
  assert.equal(resolve(combat).hit, false);
  assert.equal(resolve(combat).hit, false);
  assert.equal(resolve(combat).hit, true);
  assert.equal(resolve(combat).hit, false);
});
test('invalid shots cannot consume or grant recovery assistance and other targets do not inherit it', () => {
  const combat = createCombat(() => 1);
  resolve(combat); resolve(combat); combat.update(1);
  assert.equal(combat.start({ ...shot, distance: 80 }), false);
  assert.equal(resolve(combat, { ...shot, id: 'small-2' }).hit, false);
  assert.equal(resolve(combat, { ...shot, actor: 'ship', kind: 'large' }).hit, false);
  assert.equal(resolve(combat).hit, true);
});
test('reported chance agrees with recovery assistance and reset clears target streaks', () => {
  const combat = createCombat(() => 1);
  resolve(combat); resolve(combat);
  assert.equal(combat.chanceFor(shot), 1);
  assert.equal(combat.chanceFor({ ...shot, id: 'new-target' }), .8);
  combat.reset();
  assert.equal(combat.chanceFor(shot), .8);
  assert.equal(resolve(combat).hit, false);
});
