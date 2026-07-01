// src/astronaut/AstronautActionMap.js
// Mapping for Mission 01. Uses existing animations first; future animations can replace placeholders.

export const astronautDirectionMap = {
  idle: "front_right",
  up: "rear",
  down: "front",
  left: "side_left",
  right: "side_right",
  up_left: "rear_left",
  up_right: "rear_right",
  down_left: "front_left",
  down_right: "front_right",
};

export const astronautActionMap = {
  idle_float: {
    animation: "idle_hover",
  },
  move_float: {
    mode: "directional_static_views",
    optionalAnimation: "jetpack_boost",
  },
  tool_pulse: {
    placeholderAnimation: "wave",
    finalAnimation: "tool_hit",
  },
  touch_relic: {
    placeholderAnimation: "thumbs_up",
    finalAnimation: "touch_relic",
  },
  energy_absorb: {
    placeholderAnimation: "idle_hover",
    finalAnimation: "energy_absorb",
  },
};
