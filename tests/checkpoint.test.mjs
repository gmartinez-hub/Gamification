import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpedition } from '../src/lowpoly/expedition.js';
import { createCheckpointStore, CHECKPOINT_KEY } from '../src/lowpoly/checkpoint.js';

function memory() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
const snapshot = { seed: 620, sector: 1, gemRecovered: false, complete: false };
test('sector checkpoint resumes a safe phase with matching ship, gems and deterministic layout', () => {
  const mission = createExpedition(1);
  assert.equal(mission.restoreCheckpoint(snapshot), true);
  assert.equal(mission.state.seed, 620);
  assert.equal(mission.state.moduleStage, 2);
  assert.equal(mission.state.gems, 1);
  assert.equal(mission.state.phase, 'scan');
  const other = createExpedition(2); other.restoreCheckpoint(snapshot);
  assert.deepEqual(mission.state.layout, other.state.layout);
});
test('recovered gem survives a reload and skips completed combat at a safe return point', () => {
  const mission = createExpedition();
  mission.restoreCheckpoint({ ...snapshot, sector: 2, gemRecovered: true });
  assert.equal(mission.state.gems, 3);
  assert.equal(mission.state.phase, 'return');
  assert.equal(mission.state.destroyed.length, 6);
  assert.equal(mission.enterCorridor('ship'), true);
  assert.equal(mission.finishTransit(), true);
  assert.equal(mission.state.phase, 'complete');
});
test('completed expedition remains complete after restore and invalid checkpoints cannot mutate a mission', () => {
  const mission = createExpedition(620);
  for (const invalid of [{ ...snapshot, sector: 3 }, { ...snapshot, seed: -1 }, { ...snapshot, complete: true }, null]) {
    assert.equal(mission.restoreCheckpoint(invalid), false);
    assert.equal(mission.state.sector, 0);
  }
  assert.equal(mission.restoreCheckpoint({ ...snapshot, sector: 2, complete: true, gemRecovered: true }), true);
  assert.equal(mission.state.phase, 'complete'); assert.equal(mission.state.gems, 3);
});
test('storage round-trips preferences, isolates URL seeds and clears old runs', () => {
  const storage = memory(), store = createCheckpointStore(storage);
  const mission = createExpedition(620); mission.restoreCheckpoint(snapshot);
  assert.equal(store.save(mission.state, { firstPerson: false, soundEnabled: true, effectsVolume: .6, ambienceVolume: .2 }), true);
  const loaded = store.load({ seed: 620 });
  assert.equal(loaded.sector, 1);
  assert.deepEqual(loaded.settings, { firstPerson: false, soundEnabled: true, effectsVolume: .6, ambienceVolume: .2, introSeen: false });
  assert.equal(store.load({ seed: 621 }), null);
  store.clear(); assert.equal(store.load(), null);
});
test('malformed or future saves and unavailable browser storage never prevent playing', () => {
  const storage = memory(), store = createCheckpointStore(storage);
  for (const raw of ['{broken', 'null', '[]', '{"version":999}', '{"version":1,"seed":620,"sector":-1}', 'x'.repeat(9000)]) {
    storage.setItem(CHECKPOINT_KEY, raw); assert.equal(store.load(), null);
  }
  const blocked = createCheckpointStore({ getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); }, removeItem() { throw Error('blocked'); } });
  assert.equal(blocked.load(), null);
  assert.equal(blocked.save(createExpedition().state, {}), false);
  assert.doesNotThrow(() => blocked.clear());
});
test('save clamps optional volume settings and rejects incompatible checkpoint versions', () => {
  const storage = memory(), store = createCheckpointStore(storage);
  store.save(createExpedition(620).state, { effectsVolume: 4, ambienceVolume: -2 });
  assert.equal(store.load().settings.effectsVolume, 1);
  assert.equal(store.load().settings.ambienceVolume, 0);
  const saved = JSON.parse(storage.getItem(CHECKPOINT_KEY)); saved.version = 99;
  storage.setItem(CHECKPOINT_KEY, JSON.stringify(saved)); assert.equal(store.load(), null);
});
