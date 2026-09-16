/** Three sequential pickups assemble one ship, then finish the exploration mission. */
export function createProgression() {
  const state = {
    gems: 0,
    stage: 1,
    complete: false,
    activeBeacon: "beacon-1",
  };

  function collect(id) {
    if (state.complete || id !== state.activeBeacon) return false;

    state.gems += 1;
    state.stage = Math.min(3, state.gems + 1);
    state.complete = state.gems === 3;
    state.activeBeacon = state.complete ? null : `beacon-${state.gems + 1}`;
    return true;
  }

  function reset() {
    Object.assign(state, {
      gems: 0,
      stage: 1,
      complete: false,
      activeBeacon: "beacon-1",
    });
  }

  return { state, collect, reset };
}
