import test from "node:test";
import assert from "node:assert/strict";
import { createExpedition, createRandom, aimChance, AIM_RANGES } from "../src/lowpoly/expedition.js";

function clearEncounter(expedition) {
  assert.equal(expedition.scan(), true);
  for (const target of expedition.state.layout.small) {
    assert.equal(expedition.hit(target.id, "astronaut"), true);
  }
  for (const target of expedition.state.layout.large) {
    assert.equal(expedition.hit(target.id, "ship"), true);
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

test("scan gates asteroid combat and each target requires its own actor", () => {
  const mission = createExpedition(21);
  const { state } = mission;
  const small = state.layout.small;
  const large = state.layout.large;

  assert.equal(state.phase, "scan");
  assert.equal(mission.hit(small[0].id, "astronaut"), false);
  assert.equal(mission.collectGem(), false);
  assert.equal(mission.enterCorridor("ship"), false);
  assert.equal(mission.finishTransit(), false);
  assert.equal(mission.scan(), true);
  assert.equal(mission.scan(), false);
  assert.equal(mission.hit(small[0].id, "ship"), false);
  assert.equal(mission.hit(large[0].id, "ship"), false);
  assert.equal(mission.hit("unknown", "astronaut"), false);
  assert.equal(mission.hit(small[0].id, "astronaut"), true);
  assert.equal(mission.hit(small[0].id, "astronaut"), false);
  assert.equal(mission.hit(small[1].id, "astronaut"), true);
  assert.equal(state.phase, "small");
  assert.equal(mission.hit(small[2].id, "astronaut"), true);
  assert.equal(state.phase, "large");
  assert.equal(mission.hit(large[0].id, "astronaut"), false);
  assert.equal(mission.hit(large[0].id, "ship"), true);
  assert.equal(state.phase, "gem");
  assert.equal(state.destroyed.length, 4);
});

test("three sectors grow the ship only after their corridor and finish after the third", () => {
  const mission = createExpedition(620);
  const sharedState = mission.state;

  for (let sector = 0; sector < 3; sector++) {
    const { state } = mission;
    assert.equal(state.sector, sector);
    assert.equal(state.moduleStage, sector + 1);
    assert.equal(state.layout.small.length, 3);
    assert.equal(state.layout.large.length, sector + 1);
    clearEncounter(mission);
    assert.equal(state.phase, "gem");
    assert.equal(mission.enterCorridor("ship"), false);
    assert.equal(mission.collectGem(), true);
    assert.equal(mission.collectGem(), false);
    assert.equal(state.gems, sector + 1);
    assert.equal(state.moduleStage, sector + 1);
    assert.equal(state.phase, "return");
    assert.equal(mission.finishTransit(), false);
    assert.equal(mission.enterCorridor("astronaut"), false);
    assert.equal(mission.enterCorridor(undefined), false);
    assert.equal(mission.enterCorridor("ship"), true);
    assert.equal(mission.enterCorridor("ship"), false);
    assert.equal(state.moduleStage, sector + 1);
    assert.equal(mission.finishTransit(), true);
    assert.equal(mission.state, sharedState);
    if (sector < 2) {
      assert.equal(state.phase, "scan");
      assert.equal(state.moduleStage, sector + 2);
      assert.deepEqual(state.destroyed, []);
    }
  }

  assert.equal(sharedState.phase, "complete");
  assert.equal(sharedState.sector, 2);
  assert.equal(sharedState.moduleStage, 3);
  assert.equal(mission.finishTransit(), false);
  assert.equal(mission.scan(), false);
  assert.equal(mission.collectGem(), false);
});

test("out-of-order large kills do not release a gem early", () => {
  const mission = createExpedition(31);
  for (let sector = 0; sector < 2; sector++) {
    clearEncounter(mission);
    mission.collectGem();
    mission.enterCorridor("ship");
    mission.finishTransit();
  }
  mission.scan();
  for (const target of mission.state.layout.small) mission.hit(target.id, "astronaut");
  const [a, b, c] = mission.state.layout.large;
  assert.equal(mission.hit(c.id, "ship"), true);
  assert.equal(mission.hit(a.id, "ship"), true);
  assert.equal(mission.state.phase, "large");
  assert.equal(mission.collectGem(), false);
  assert.equal(mission.hit(b.id, "ship"), true);
  assert.equal(mission.state.phase, "gem");
});

test("reset keeps the shared state and reproducible layout while clearing progress", () => {
  const mission = createExpedition(712069);
  const state = mission.state;
  const originalLayout = structuredClone(state.layout);
  clearEncounter(mission);
  mission.collectGem();
  mission.enterCorridor("ship");
  mission.finishTransit();

  assert.equal(mission.reset(712069), true);
  assert.equal(mission.state, state);
  assert.equal(state.sector, 0);
  assert.equal(state.moduleStage, 1);
  assert.equal(state.gems, 0);
  assert.equal(state.phase, "scan");
  assert.deepEqual(state.destroyed, []);
  assert.deepEqual(state.layout, originalLayout);
  assert.equal(mission.reset(712070), true);
  assert.notDeepEqual(state.layout, originalLayout);
  const newLayout = structuredClone(state.layout);
  assert.equal(mission.reset(), true);
  assert.deepEqual(state.layout, newLayout);
});

test("random streams and mission instances do not consume one another's randomness", () => {
  const first = createRandom("layout:620");
  const second = createRandom("layout:620");
  const visual = createRandom("visual:620");
  for (let index = 0; index < 100; index++) {
    visual(); visual();
    const value = first();
    assert.equal(value, second());
    assert.ok(value >= 0 && value < 1);
  }
  const mission = createExpedition(0);
  const independent = createExpedition(0);
  assert.deepEqual(mission.state.layout, independent.state.layout);
  mission.scan();
  assert.equal(independent.state.phase, "scan");
  assert.notDeepEqual(createExpedition(1).state.layout, independent.state.layout);
});

test("procedural layouts remain reachable and keep hazards clear across seeds and sectors", () => {
  const launch = { x: 2, y: 0, z: 10 };
  const ship = { x: 0, y: 0, z: 10 };
  for (let seed = 0; seed < 100; seed++) {
    const mission = createExpedition(seed);
    for (let sector = 0; sector < 3; sector++) {
      const layout = mission.state.layout;
      assert.ok(distance(layout.beacon, launch) <= 24, `unreachable beacon seed ${seed}`);
      for (const target of layout.small) assert.ok(distance(target.position, launch) <= 24);
      for (const target of layout.large) assert.ok(target.position.z <= -25 && target.position.z >= -38);
      assert.ok(distance(layout.gem, layout.large.at(-1).position) <= 7);
      assert.deepEqual(layout.gate, { x: 0, y: 0, z: -56 });
      assert.deepEqual(layout.exit, { x: 0, y: 0, z: -80 });
      const allTargets = [...layout.small, ...layout.large, ...layout.hazards];
      assert.equal(new Set(allTargets.map(target => target.id)).size, allTargets.length);
      for (const target of allTargets) {
        for (const value of Object.values(target.position)) assert.ok(Number.isFinite(value));
        assert.ok(target.radius > 0);
      }
      assert.ok(layout.hazards.length >= 4);
      for (const hazard of layout.hazards) {
        assert.ok(distance(hazard.position, ship) > hazard.radius + 5);
        for (const point of [layout.beacon, layout.gem, layout.gate]) {
          assert.ok(distance(hazard.position, point) > hazard.radius + 4);
        }
        for (const target of [...layout.small, ...layout.large]) {
          assert.ok(distance(hazard.position, target.position) > hazard.radius + target.radius + 2);
        }
        if (hazard.position.z < -44) assert.ok(Math.hypot(hazard.position.x, hazard.position.y) > hazard.radius + 6);
      }
      clearEncounter(mission);
      mission.collectGem(); mission.enterCorridor("ship"); mission.finishTransit();
    }
  }
});

test("aim chance rewards closing distance and steady flight without allowing unwinnable shots", () => {
  for (const actor of ["astronaut", "ship"]) {
    const near = aimChance({ distance: 2, actor, sector: 0, speed: 0 });
    const far = aimChance({ distance: AIM_RANGES[actor], actor, sector: 0, speed: 0 });
    const moving = aimChance({ distance: 2, actor, sector: 0, speed: 6 });
    const later = aimChance({ distance: 2, actor, sector: 2, speed: 0 });
    assert.ok(near > far);
    assert.ok(near > moving);
    assert.ok(near > later);
    for (const chance of [near, far, moving, later, aimChance({ distance: 1000, actor, sector: 2, speed: 1000 })]) {
      assert.ok(chance >= .35 && chance <= .95);
    }
  }
});

test('biomes have explicit identities and moving hazard routes protect all mandatory interactions', () => {
  const spawn = { x: 0, y: 0, z: 10 };
  const eva = { x: 4.5, y: -.85, z: 7.5 };
  const tether = { x: 2.4, y: .05, z: 7.5 };
  for (let seed = 0; seed < 100; seed++) {
    const mission = createExpedition(seed);
    for (let sector = 0; sector < 3; sector++) {
      const layout = mission.state.layout;
      assert.equal(layout.biomeId, ['nereida', 'vesper', 'umbra'][sector]);
      assert.ok(distance(layout.beacon, tether) < 24);
      for (const target of layout.small) assert.ok(distance(target.position, eva) < 26);
      for (const hazard of layout.hazards) {
        const { axis, amplitude, period, phase } = hazard.motion;
        assert.ok(amplitude >= 4 && amplitude <= 7.5);
        assert.ok(Math.abs(Math.hypot(axis.x, axis.y, axis.z) - 1) < 1e-8);
        assert.ok(amplitude * Math.PI * 2 / period >= 1);
        assert.ok(amplitude * Math.PI * 2 / period <= 3);
        for (let step = 0; step < 80; step++) {
          const displacement = Math.sin(step / 80 * Math.PI * 2 + phase) * amplitude;
          const point = {
            x: hazard.position.x + axis.x * displacement,
            y: hazard.position.y + axis.y * displacement,
            z: hazard.position.z + axis.z * displacement,
          };
          assert.ok(distance(point, spawn) > hazard.radius + 8, `unsafe spawn route: seed ${seed}`);
          for (const interaction of [layout.beacon, layout.gem]) {
            assert.ok(distance(point, interaction) > hazard.radius + 6, `unsafe interaction route: seed ${seed}`);
          }
          const corridorPoint = { x: 0, y: 0, z: Math.max(-84, Math.min(-47, point.z)) };
          assert.ok(distance(point, corridorPoint) > hazard.radius + 9, `unsafe corridor: seed ${seed}`);
          for (const target of [...layout.small, ...layout.large]) {
            assert.ok(distance(point, target.position) > hazard.radius + target.radius + 2);
          }
        }
      }
      clearEncounter(mission);
      mission.collectGem(); mission.enterCorridor('ship'); mission.finishTransit();
    }
  }
});
