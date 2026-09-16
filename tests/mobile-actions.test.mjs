import test from 'node:test';
import assert from 'node:assert/strict';
import { getMobileAction } from '../src/lowpoly/mobile-actions.js';

const snapshot = (overrides = {}) => ({
  phase: 'scan', actor: 'astronaut', navigating: false, returning: false,
  scanning: false, shotActive: false, cooldown: 0, blocked: false,
  actionDistance: 10, targetDistance: Infinity, weaponRange: 30,
  chance: .82, assemblyLocked: false, ...overrides,
});

test('beacon action follows deployment, approach and scan reach', () => {
  assert.equal(getMobileAction(snapshot({ actor: 'ship' })).action, 'deploy');
  assert.equal(getMobileAction(snapshot()).action, 'navigate');
  const scanning = getMobileAction(snapshot({ actionDistance: 3.8 }));
  assert.equal(scanning.action, 'interact');
  assert.equal(scanning.disabled, false);
  assert.match(scanning.label, /Escanear/);
  assert.equal(getMobileAction(snapshot({ actionDistance: 3.81 })).action, 'navigate');
});

test('an active guide can be stopped, then yields to a reachable action', () => {
  const guiding = getMobileAction(snapshot({ navigating: true }));
  assert.equal(guiding.action, 'navigate');
  assert.equal(guiding.disabled, false);
  assert.match(guiding.label, /Detener/);
  assert.equal(getMobileAction(snapshot({ navigating: true, actionDistance: 2 })).action, 'interact');
  const aiming = getMobileAction(snapshot({ phase: 'small', navigating: true, targetDistance: 20 }));
  assert.equal(aiming.action, 'fire');
});

test('an ongoing scan stays visible without offering a conflicting action', () => {
  const action = getMobileAction(snapshot({ scanning: true, actionDistance: 3 }));
  assert.equal(action.action, 'interact');
  assert.equal(action.disabled, true);
  assert.match(action.label, /Escaneando/);
});

test('small and large targets require the appropriate pilot and weapon range', () => {
  assert.equal(getMobileAction(snapshot({ phase: 'small', actor: 'ship', targetDistance: 20 })).action, 'deploy');
  assert.equal(getMobileAction(snapshot({ phase: 'large', targetDistance: 20 })).action, 'return');
  assert.equal(getMobileAction(snapshot({ phase: 'small', actor: 'ship', targetDistance: 20 })).secondary, 'target');
  assert.equal(getMobileAction(snapshot({ phase: 'large', targetDistance: 20 })).secondary, 'target');
  for (const [phase, actor, weaponRange] of [['small', 'astronaut', 30], ['large', 'ship', 70]]) {
    const ready = getMobileAction(snapshot({ phase, actor, weaponRange, targetDistance: weaponRange }));
    assert.equal(ready.action, 'fire');
    assert.equal(ready.disabled, false);
    assert.equal(ready.secondary, 'target');
    assert.match(ready.hint, /82%/);
    const far = getMobileAction(snapshot({ phase, actor, weaponRange, targetDistance: weaponRange + .01 }));
    assert.equal(far.action, 'navigate');
    assert.equal(far.secondary, 'target');
  }
});

test('cooldown prevents repeat firing but preserves the selected target context', () => {
  const action = getMobileAction(snapshot({ phase: 'small', targetDistance: 20, cooldown: .3 }));
  assert.equal(action.action, 'fire');
  assert.equal(action.disabled, true);
  assert.match(action.label, /Recargando/);
  assert.equal(action.secondary, 'target');
  assert.equal(getMobileAction(snapshot({ phase: 'small', targetDistance: 20, cooldown: 0 })).disabled, false);
});

test('missing or invalid targets cannot expose a working fire or target switch button', () => {
  for (const targetDistance of [undefined, NaN, Infinity, -1]) {
    const action = getMobileAction(snapshot({ phase: 'small', targetDistance }));
    assert.equal(action.disabled, true);
    assert.equal(action.action, 'none');
    assert.equal(action.secondary, undefined);
  }
});

test('gem approach uses the existing guide that deploys from a nearby ship', () => {
  const nearShip = getMobileAction(snapshot({ phase: 'gem', actor: 'ship', actionDistance: 11.9 }));
  assert.equal(nearShip.action, 'navigate');
  assert.match(nearShip.label, /Salir por la gema/);
  assert.match(getMobileAction(snapshot({ phase: 'gem', actor: 'ship', actionDistance: 12 })).label, /Guiar/);
  assert.equal(getMobileAction(snapshot({ phase: 'gem', actionDistance: 3 })).action, 'interact');
  assert.equal(getMobileAction(snapshot({ phase: 'gem', actionDistance: 3.01 })).action, 'navigate');
});

test('return objective boards before navigating to the corridor', () => {
  assert.equal(getMobileAction(snapshot({ phase: 'return' })).action, 'return');
  const aboard = getMobileAction(snapshot({ phase: 'return', actor: 'ship' }));
  assert.equal(aboard.action, 'navigate');
  assert.match(aboard.label, /corredor/);
  assert.match(getMobileAction(snapshot({ phase: 'return', actor: 'ship', navigating: true })).label, /Detener/);
});

test('transitions, returning, aiming and blocked controls offer no conflicting secondary action', () => {
  for (const extra of [
    { phase: 'transit' }, { assemblyLocked: true }, { blocked: true },
    { returning: true }, { shotActive: true },
  ]) {
    const action = getMobileAction(snapshot({ phase: 'small', targetDistance: 20, ...extra }));
    assert.equal(action.disabled, true);
    assert.equal(action.secondary, undefined);
  }
  assert.match(getMobileAction(snapshot({ assemblyLocked: true, blocked: true })).label, /Ensamblando/);
  assert.match(getMobileAction(snapshot({ phase: 'transit', blocked: true })).label, /Viajando/);
});

test('completed expedition offers a restart, while paused completion remains blocked', () => {
  assert.deepEqual(getMobileAction(snapshot({ phase: 'complete' })), {
    action: 'restart', label: 'Nueva expedición', disabled: false,
  });
  assert.equal(getMobileAction(snapshot({ phase: 'complete', blocked: true })).disabled, true);
});

test('action selection leaves the input state untouched', () => {
  const state = Object.freeze(snapshot({ phase: 'large', actor: 'ship', targetDistance: 40, weaponRange: 70 }));
  assert.equal(getMobileAction(state).action, 'fire');
  assert.equal(state.phase, 'large');
});
