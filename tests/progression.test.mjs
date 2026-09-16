import test from "node:test";
import assert from "node:assert/strict";
import { createProgression } from "../src/lowpoly/progression.js";

test("collecting the three beacons unlocks modules before completing the mission", () => {
  const progression = createProgression();
  const state = progression.state;

  assert.deepEqual(state, {
    gems: 0, stage: 1, complete: false, activeBeacon: "beacon-1",
  });
  assert.equal(progression.collect("beacon-1"), true);
  assert.deepEqual(state, {
    gems: 1, stage: 2, complete: false, activeBeacon: "beacon-2",
  });
  assert.equal(progression.collect("beacon-2"), true);
  assert.deepEqual(state, {
    gems: 2, stage: 3, complete: false, activeBeacon: "beacon-3",
  });
  assert.equal(progression.collect("beacon-3"), true);
  assert.deepEqual(state, {
    gems: 3, stage: 3, complete: true, activeBeacon: null,
  });
  assert.equal(progression.state, state);
});

test("duplicate and out-of-order pickups cannot skip a beacon", () => {
  const progression = createProgression();

  for (const id of ["beacon-2", "beacon-3"]) {
    assert.equal(progression.collect(id), false);
  }
  assert.equal(progression.collect("beacon-1"), true);
  for (const id of ["beacon-1", "beacon-3"]) {
    assert.equal(progression.collect(id), false);
  }
  assert.deepEqual(progression.state, {
    gems: 1, stage: 2, complete: false, activeBeacon: "beacon-2",
  });
  assert.equal(progression.collect("beacon-2"), true);
  assert.equal(progression.collect("beacon-2"), false);
  assert.deepEqual(progression.state, {
    gems: 2, stage: 3, complete: false, activeBeacon: "beacon-3",
  });
});

test("malformed identifiers never collect a gem or alter the active beacon", () => {
  const progression = createProgression();
  const invalidIds = [
    undefined, null, 1, {}, ["beacon-1"], new String("beacon-1"),
    "", "beacon-0", "beacon-4", "beacon-01", "BEACON-1", " beacon-1", "beacon-1 ",
  ];

  for (const id of invalidIds) {
    assert.equal(progression.collect(id), false);
    assert.deepEqual(progression.state, {
      gems: 0, stage: 1, complete: false, activeBeacon: "beacon-1",
    });
  }
  assert.equal(progression.collect("beacon-1"), true);
});

test("a completed mission rejects further pickups, including null", () => {
  const progression = createProgression();
  progression.collect("beacon-1");
  progression.collect("beacon-2");
  progression.collect("beacon-3");

  for (const id of ["beacon-1", "beacon-2", "beacon-3", "beacon-4", null, undefined]) {
    assert.equal(progression.collect(id), false);
  }
  assert.deepEqual(progression.state, {
    gems: 3, stage: 3, complete: true, activeBeacon: null,
  });
});

test("reset restarts partial or complete progress without replacing shared state", () => {
  for (const pickups of [["beacon-1"], ["beacon-1", "beacon-2", "beacon-3"]]) {
    const progression = createProgression();
    const state = progression.state;
    pickups.forEach(progression.collect);

    progression.reset();

    assert.equal(progression.state, state);
    assert.deepEqual(state, {
      gems: 0, stage: 1, complete: false, activeBeacon: "beacon-1",
    });
    assert.equal(progression.collect("beacon-1"), true);
    assert.deepEqual(state, {
      gems: 1, stage: 2, complete: false, activeBeacon: "beacon-2",
    });
  }
});

test("progression instances do not share mission progress", () => {
  const first = createProgression();
  const second = createProgression();
  first.collect("beacon-1");

  assert.notEqual(first.state, second.state);
  assert.deepEqual(second.state, {
    gems: 0, stage: 1, complete: false, activeBeacon: "beacon-1",
  });
  assert.equal(second.collect("beacon-2"), false);
});
