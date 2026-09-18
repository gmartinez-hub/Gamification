import test from 'node:test';
import assert from 'node:assert/strict';
import { activatePreset, awardCharge, createLoadoutState, installComposition, placeTurret, purchaseEquipment, savePreset, unlockRoutePieces } from '../src/lowpoly/loadout.js';

const fixtures = () => createLoadoutState({
  charge: 8,
  unlocked: ['front', 'middle', 'final', 'turret'],
  modules: [
    { id: 'front-1', type: 'front' },
    { id: 'middle-1', type: 'middle' },
    { id: 'middle-2', type: 'middle' },
    { id: 'final-1', type: 'final' },
  ],
  turrets: [{ id: 'turret-1' }, { id: 'turret-2' }, { id: 'turret-3' }],
});

test('composition supports compact and repeated-middle ships without coupling to route stage', () => {
  let state = fixtures();
  state = installComposition(state, ['front-1', 'final-1']);
  assert.deepEqual(state.activeComposition, ['front-1', 'final-1']);
  state = installComposition(state, ['front-1', 'middle-1', 'middle-2', 'final-1']);
  assert.deepEqual(state.activeComposition, ['front-1', 'middle-1', 'middle-2', 'final-1']);
  assert.throws(() => installComposition(state, ['front-1', 'final-1', 'middle-1']), /final/i);
});

test('turret placement is transactional and moving an owned turret does not charge twice', () => {
  let state = fixtures();
  state = placeTurret(state, { turretId: 'turret-1', hostId: 'middle-1', position: [0.2, 0.8, 0.1], rotation: [0, 0.3, 0], cost: 3 });
  assert.equal(state.charge, 5);
  assert.equal(state.placements['turret-1'].hostId, 'middle-1');
  state = placeTurret(state, { turretId: 'turret-1', hostId: 'bike-1', position: [0, 0.6, 0], rotation: [0, 0, 0], cost: 3 });
  assert.equal(state.charge, 5);
  assert.equal(state.placements['turret-1'].hostId, 'bike-1');
  assert.throws(() => placeTurret(state, { turretId: 'turret-2', hostId: 'noma-1', position: [99, 0, 0], rotation: [0, 0, 0], cost: 2 }), /surface/i);
});

test('presets reuse physical units and restore host-local placements', () => {
  let state = fixtures();
  state = installComposition(state, ['front-1', 'middle-1', 'final-1']);
  state = placeTurret(state, { turretId: 'turret-1', hostId: 'middle-1', position: [0, 0.8, 0], rotation: [0, 0, 0], cost: 1 });
  state = savePreset(state, 'Exploración');
  state = installComposition(state, ['front-1', 'final-1']);
  state = savePreset(state, 'Compacta');
  assert.equal(state.presets.length, 2);
  assert.equal(state.turrets.length, 3);
  state = activatePreset(state, state.presets[0].id);
  assert.deepEqual(state.activeComposition, ['front-1', 'middle-1', 'final-1']);
  assert.equal(state.placements['turret-1'].hostId, 'middle-1');
});

test('route unlocks grant canonical pieces once while purchases spend charge atomically', () => {
  let state=unlockRoutePieces(createLoadoutState({charge:20}),3);
  state=unlockRoutePieces(state,3);
  assert.deepEqual(state.modules.map(module=>module.id),['front-1','middle-1','final-1']);
  state=purchaseEquipment(state,'middle');
  state=purchaseEquipment(state,'turret');
  assert.equal(state.charge,11);
  assert.deepEqual(state.modules.map(module=>module.id),['front-1','middle-1','final-1','middle-2']);
  assert.deepEqual(state.turrets.map(turret=>turret.id),['turret-1']);
});

test('combat rewards charge without touching route gems', () => {
  const state=awardCharge(createLoadoutState({charge:2,routeGems:1}),'enemyShip');
  assert.equal(state.charge,6);assert.equal(state.routeGems,1);
});
