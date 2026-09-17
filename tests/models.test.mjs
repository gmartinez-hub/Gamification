import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, PerspectiveCamera, Raycaster, Vector2, Vector3 } from '../vendor/three.module.js';
import { createAstronaut, createCompanion, createShip } from '../src/lowpoly/models.js';
import * as models from '../src/lowpoly/models.js';

// Box3.setFromObject also counts invisible modules: measure what the player sees.
function visibleBounds(root) {
  root.updateMatrixWorld(true);
  const result = new Box3();
  root.traverseVisible(part => {
    if (!part.isMesh || part.name.includes('plume')) return;
    if (part.isInstancedMesh) {
      part.computeBoundingBox();
      result.union(part.boundingBox.clone().applyMatrix4(part.matrixWorld));
    } else {
      if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
      result.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld));
    }
  });
  return result.getSize(new Vector3());
}

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
  const length = visibleBounds(ship.group).z;
  assert.ok(length >= 14 && length <= 16, `assembled length ${length} must fit the habitable ship scale`);
  ship.setStage(1, false);
  assert.ok(cockpit.visible);
  assert.equal(body.visible, false);
  assert.equal(propulsion.visible, false);
});

test('each visible ship stage is habitable beside the astronaut and the companion stays smaller', () => {
  const ship = createShip();
  const astronaut = visibleBounds(createAstronaut().group);
  const companion = visibleBounds(createCompanion().group);
  assert.ok(astronaut.y > 1.75 && astronaut.y < 2.1);
  for (const [stage, minLength, maxLength] of [[1, 5.8, 6.8], [2, 10.4, 11.4], [3, 14, 16]]) {
    ship.setStage(stage, false);
    const size = visibleBounds(ship.group);
    assert.ok(size.z >= minLength && size.z <= maxLength, `stage ${stage}: ${size.z}m long`);
    assert.ok(size.y > astronaut.y * 1.65, `stage ${stage} must contain an adult pilot`);
    assert.equal(ship.group.scale.x, 1, 'navigation units remain metres');
  }
  assert.ok(companion.x > .6 && companion.x < .8);
});

test('armor refinements preserve the calibrated longitudinal ship envelope', () => {
  const ship = createShip();
  for (const [stage, expected] of [[1, 6.18], [2, 10.96], [3, 14.53]]) {
    ship.setStage(stage, false);
    const length = visibleBounds(ship.group).z;
    assert.ok(Math.abs(length - expected) < .02, `stage ${stage}: ${length}m must preserve the ${expected}m envelope`);
  }
});

test('coasting turns thruster plumes off even when the actor still has velocity', () => {
  for (const create of [createShip, createAstronaut]) {
    const model = create();
    if (model.setStage) model.setStage(3, false);
    const plumeVisible = () => {
      let count = 0;
      model.group.traverseVisible(part => { if (part.name.includes('plume')) count++; });
      return count;
    };
    model.update(1, { moving: 1, thrust: new Vector3(0, 0, -1) });
    assert.ok(plumeVisible() > 0, 'thrust emits a visible jet');
    model.update(2, { moving: 1, thrust: new Vector3() });
    assert.equal(plumeVisible(), 0, 'inertial flight does not burn fuel visibly');
    model.update(3, { moving: 0, thrust: 0, braking: true });
    assert.ok(plumeVisible() > 0, 'stabilization visibly uses maneuver jets');
  }
});

test('astronaut keeps a floating pose while drifting instead of alternating walking strides', () => {
  const astronaut = createAstronaut();
  for (const time of [0, .3, .8, 1.4]) {
    astronaut.update(time, { moving: 1, thrust: 0 });
    const left = astronaut.group.getObjectByName('hip-pivot--1').rotation.x;
    const right = astronaut.group.getObjectByName('hip-pivot-1').rotation.x;
    assert.ok(Math.abs(left - right) < .15, 'legs float together rather than walking');
    for (const side of [-1, 1]) assert.ok(astronaut.group.getObjectByName(`knee-pivot-${side}`).rotation.x > .2);
  }
});

test('cockpit keeps the central sightline clear and preserves its camera-owned transform', () => {
  assert.equal(typeof models.createCockpit, 'function');
  const cockpit = models.createCockpit();
  cockpit.group.updateMatrixWorld(true);
  let forwardMeshes = 0;
  cockpit.group.traverseVisible(part => {
    if (!part.isMesh) return;
    assert.equal(part.castShadow, false, 'camera furniture must not cast moving shadows over the world');
    assert.equal(part.receiveShadow, false, 'camera furniture must not inherit world shadow artifacts');
    part.geometry.computeBoundingBox();
    const box = part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld);
    assert.ok(box.max.z < 0, `${part.name} belongs in front of the eye`);
    assert.ok(!(box.min.x < .08 && box.max.x > -.08 && box.min.y < .08 && box.max.y > -.08), `${part.name} must leave the target sightline clear`);
    forwardMeshes++;
  });
  assert.ok(forwardMeshes > 10 && forwardMeshes < 80);
  cockpit.group.position.set(1, 2, 3);
  cockpit.group.rotation.set(.1, .2, .3);
  cockpit.group.updateMatrix();
  const before = cockpit.group.matrix.clone();
  cockpit.update(2, { speed: 8, braking: true });
  cockpit.group.updateMatrix();
  assert.deepEqual(cockpit.group.matrix.elements, before.elements);
});

test('painted hull surfaces provide finite non-collapsed UV triangles for material detail', () => {
  for (const create of [createShip, createAstronaut, models.createCockpit]) {
    const model = create();
    let hulls = 0;
    model.group.traverse(part => {
      if (!part.isMesh || part.geometry.type !== 'BufferGeometry') return;
      const uv = part.geometry.getAttribute('uv');
      const position = part.geometry.getAttribute('position');
      assert.ok(uv, `${part.name} must accept its material texture`);
      assert.equal(uv.count, position.count);
      assert.ok([...uv.array].every(Number.isFinite));
      for (let i = 0; i < uv.count; i += 3) {
        const area = (uv.getX(i + 1) - uv.getX(i)) * (uv.getY(i + 2) - uv.getY(i))
          - (uv.getY(i + 1) - uv.getY(i)) * (uv.getX(i + 2) - uv.getX(i));
        assert.ok(Math.abs(area) > 1e-8, `${part.name} triangle ${i / 3} must not sample a single texture line`);
      }
      hulls++;
    });
    assert.ok(hulls > 0);
  }
});

test('visor tool appears for aiming or interaction and leaves the central view open in both orientations', () => {
  assert.equal(typeof models.createVisorRig, 'function');
  const visor = models.createVisorRig();
  assert.equal(visor.group.visible, false, 'the camera owner decides when to show the visor');
  visor.group.visible = true;
  const tool = visor.group.getObjectByName('eva-hand-tool');
  assert.ok(tool);
  const camera = new PerspectiveCamera(52, 1, .1, 100);
  const raycaster = new Raycaster();
  for (const aspect of [390 / 844, 844 / 390, 16 / 10]) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    for (const state of [{}, { aiming: true }, { interacting: true }, { braking: true }]) {
      visor.update(3, { aspect, speed: 12, ...state });
      assert.equal(tool.visible, Boolean(state.aiming || state.interacting));
      visor.group.updateMatrixWorld(true);
      const visible = [];
      visor.group.traverseVisible(part => {
        if (!part.isMesh) return;
        assert.equal(part.castShadow, false, 'camera-local helmet and tool must not cast shadows over the world');
        assert.equal(part.receiveShadow, false, 'camera-local helmet and tool remain free of world shadow artifacts');
        visible.push(part);
      });
      for (const x of [-.22, 0, .22]) for (const y of [-.2, 0, .3]) {
        raycaster.setFromCamera(new Vector2(x, y), camera);
        assert.equal(raycaster.intersectObjects(visible, false).length, 0, `clear visor at ${aspect} / ${x}, ${y}`);
      }
      if (tool.visible) {
        const center = new Box3().setFromObject(tool).getCenter(new Vector3()).project(camera);
        assert.ok(center.x > .2 && center.x < 1 && center.y < -.25 && center.y > -1, 'tool stays visible at the lower right');
      }
    }
  }
  visor.group.position.set(3, 4, 5);
  visor.group.rotation.set(.2, .3, .4);
  visor.group.updateMatrix();
  const before = visor.group.matrix.clone();
  visor.update(4, { aiming: true, aspect: .46 });
  visor.group.updateMatrix();
  assert.deepEqual(visor.group.matrix.elements, before.elements);
});

test('cockpit leaves a usable target window in portrait and landscape', () => {
  const cockpit = models.createCockpit();
  const camera = new PerspectiveCamera(52, 1, .1, 100);
  const raycaster = new Raycaster();
  for (const aspect of [390 / 844, 844 / 390, 16 / 10]) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    cockpit.update(4, { speed: 12, braking: true, aspect });
    cockpit.group.updateMatrixWorld(true);
    const visible = [];
    cockpit.group.traverseVisible(part => { if (part.isMesh) visible.push(part); });
    for (const x of [-.22, 0, .22]) for (const y of [-.2, 0, .3]) {
      raycaster.setFromCamera(new Vector2(x, y), camera);
      assert.equal(raycaster.intersectObjects(visible, false).length, 0, `clear cockpit at ${aspect} / ${x}, ${y}`);
    }
  }
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
