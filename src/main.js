import * as THREE from "../vendor/three.module.js";

const canvas = document.querySelector("#scene");
const stageButton = document.querySelector("#stageButton");
const stageLabel = document.querySelector("#stageLabel");
const missionTitle = document.querySelector("#missionTitle");
const missionSubtitle = document.querySelector("#missionSubtitle");
const missionStatus = document.querySelector("#missionStatus");
const missionProgress = document.querySelector("#missionProgress");
const gemHud = document.querySelector("#gemHud");
const robotPanel = document.querySelector("#robotPanel");
const robotStateLabel = document.querySelector("#robotStateLabel");
const robotMessage = document.querySelector("#robotMessage");
const robotSmallCounter = document.querySelector("#robotSmallCounter");
const robotLargeCounter = document.querySelector("#robotLargeCounter");
const robotRelicCounter = document.querySelector("#robotRelicCounter");
const gameMenu = document.querySelector("#gameMenu");
const menuEyebrow = document.querySelector("#menuEyebrow");
const menuTitle = document.querySelector("#menuTitle");
const menuSubtitle = document.querySelector("#menuSubtitle");
const menuBody = document.querySelector("#menuBody");
const menuActions = document.querySelector("#menuActions");
const startMissionButton = document.querySelector("#startMissionButton");
const controlsButton = document.querySelector("#controlsButton");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x02030a, 1);
renderer.autoClear = false;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
camera.position.z = 8;

const backgroundScene = new THREE.Scene();
backgroundScene.fog = new THREE.FogExp2(0x030513, 0.018);
const backgroundCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 90);
backgroundCamera.position.set(0, 0.12, 9.6);

const loader = new THREE.TextureLoader();
const clock = new THREE.Clock();
const viewport = { width: 1, height: 1, aspect: 1 };
const params = new URLSearchParams(window.location.search);

const WORLD_HEIGHT = 72;
const WORLD_MIN_Y = -18;
const WORLD_MAX_Y = WORLD_HEIGHT + 18;
const WORLD_HALF_WIDTH = 26;
const WORLD_WRAP_X = WORLD_HALF_WIDTH * 2;
const WORLD_WRAP_Y = WORLD_MAX_Y - WORLD_MIN_Y;

const STAGES = ["stage1", "stage2", "stage3"];
const DIRECTIONS = [
  "idle",
  "up",
  "down",
  "left",
  "right",
  "up_left",
  "up_right",
  "down_left",
  "down_right",
];

const input = {
  keys: new Set(),
  pointer: new THREE.Vector2(),
  smoothPointer: new THREE.Vector2(),
  aimPoint: new THREE.Vector2(),
  velocity: new THREE.Vector2(),
  debugDirection: DIRECTIONS.includes(params.get("dir")) ? params.get("dir") : null,
};

const initialStageIndex = Math.max(0, Math.min(STAGES.length - 1, Number(params.get("stage") || 1) - 1));
const initialDirection = input.debugDirection || "idle";

const state = {
  stageIndex: initialStageIndex,
  direction: initialDirection,
  position: new THREE.Vector2(0, -0.03),
  worldOffset: new THREE.Vector2(0, WORLD_MIN_Y + THREE.MathUtils.clamp(Number(params.get("progress") || 0.08), 0, 1) * WORLD_WRAP_Y),
  routeProgress: THREE.MathUtils.clamp(Number(params.get("progress") || 0.08), 0, 1),
  routeVelocity: 0,
  transition: null,
  controlMode: params.get("mode") === "astronaut" ? "astronaut" : "ship",
  hoveredTarget: null,
};

const manifest = await fetch(new URL("../assets/runtime/manifest.json", import.meta.url)).then((response) => response.json());

function textureUrl(path) {
  return new URL(`../${path}`, import.meta.url).href;
}

function loadTexture(path) {
  const texture = loader.load(textureUrl(path));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function loadWorldTexture(path, { color = true, repeat = [1, 1] } = {}) {
  const texture = loader.load(textureUrl(path));
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeAsset(entry) {
  return {
    texture: loadTexture(entry.path),
    aspect: entry.aspect,
    width: entry.width,
    height: entry.height,
  };
}

const stageAssets = Object.fromEntries(
  STAGES.map((stage) => [
    stage,
    Object.fromEntries(
      DIRECTIONS.map((direction) => [direction, makeAsset(manifest.directions[stage][direction])])
    ),
  ])
);

const fxFrames = {
  burst: manifest.fx.reward_burst.map(makeAsset),
  speed: manifest.fx.speed_streak.map(makeAsset),
  thruster: manifest.fx.thruster_flame.map(makeAsset),
};

const astronautAsset = manifest.astronaut?.float ? makeAsset(manifest.astronaut.float) : null;
const astronautViews = manifest.astronaut?.views
  ? Object.fromEntries(Object.entries(manifest.astronaut.views).map(([key, entry]) => [key, makeAsset(entry)]))
  : {};
const astronautAnimations = manifest.astronaut?.animations
  ? Object.fromEntries(
      Object.entries(manifest.astronaut.animations).map(([key, animation]) => [
        key,
        {
          fps: animation.fps,
          frames: animation.frames.map((frame) => ({
            right: makeAsset(frame.right),
            left: makeAsset(frame.left),
          })),
        },
      ])
    )
  : {};
const spaceAnimatedAssets = manifest.spaceAnimated
  ? Object.fromEntries(
      Object.entries(manifest.spaceAnimated).map(([key, animation]) => [
        key,
        {
          fps: animation.fps,
          frames: animation.frames.map(makeAsset),
        },
      ])
    )
  : {};
const spaceAssets = manifest.space
  ? Object.fromEntries(Object.entries(manifest.space).map(([key, entry]) => [key, makeAsset(entry)]))
  : {};

const worldTextures = {
  cyberEarth: loadWorldTexture("assets/runtime/three-textures/cyber-earth-dark-color.png"),
  oceanColor: loadWorldTexture("assets/runtime/three-textures/ocean-color.png"),
  oceanWorld: loadWorldTexture("assets/runtime/three-textures/ocean-world-bright-color.png"),
  gasGiant: loadWorldTexture("assets/runtime/three-textures/gas-giant-color.png"),
  networkPlanet: loadWorldTexture("assets/runtime/three-textures/network-planet-dark-color.png"),
  craterWorld: loadWorldTexture("assets/runtime/three-textures/asteroid-crater-magenta-color.png"),
  craterNormal: loadWorldTexture("assets/runtime/three-textures/asteroid-crater-magenta-normal.png", { color: false }),
  darkCrater: loadWorldTexture("assets/runtime/three-textures/dark-crater-color.png"),
  darkCraterNormal: loadWorldTexture("assets/runtime/three-textures/dark-crater-normal.png", { color: false }),
  asteroidSurface: loadWorldTexture("assets/runtime/three-textures/asteroid-surface-neon-close-color.png", {
    repeat: [1.6, 1.6],
  }),
  asteroidPlates: loadWorldTexture("assets/runtime/three-textures/asteroid-surface-plates-color.png", {
    repeat: [1.35, 1.35],
  }),
  asteroidWide: loadWorldTexture("assets/runtime/three-textures/asteroid-surface-wide-color.png", {
    repeat: [1.25, 1.25],
  }),
  nebulaWide: loadWorldTexture("assets/runtime/three-textures/nebula-wide-background.png"),
  nebulaFlow: loadWorldTexture("assets/runtime/three-textures/nebula-flow-background.png"),
  nebulaMagenta: loadWorldTexture("assets/runtime/three-textures/nebula-magenta-cyan-background.png"),
};

const missionFxTextures = {
  toolBeam: loadTexture("gravedad_zero_astronaut_projectiles_pack_v1/assets/vfx/astronaut/astronaut_tool_beam.png"),
  toolMuzzle: loadTexture("gravedad_zero_astronaut_projectiles_pack_v1/assets/vfx/astronaut/astronaut_tool_muzzle_flash.png"),
  shipCore: loadTexture("gravedad_zero_astronaut_projectiles_pack_v1/assets/vfx/ship/ship_heavy_projectile_core.png"),
  shipTrail: loadTexture("gravedad_zero_astronaut_projectiles_pack_v1/assets/vfx/ship/ship_heavy_projectile_trail.png"),
  largeSpawnAura: loadTexture("gravedad_zero_mission_01_completion_pack_v1/assets/vfx/asteroids/large_obstacle_spawn_aura.png"),
  relicCore: loadTexture("gravedad_zero_mission_01_completion_pack_v1/assets/hologram/relic_hologram_alpha_cropped.png"),
  relicGlow: loadTexture("gravedad_zero_mission_01_completion_pack_v1/assets/hologram/relic_aura_glow.png"),
  relicRingA: loadTexture("gravedad_zero_mission_01_completion_pack_v1/assets/hologram/relic_orbit_ring_01.png"),
  relicRingB: loadTexture("gravedad_zero_mission_01_completion_pack_v1/assets/hologram/relic_orbit_ring_02.png"),
  relicScanlines: loadTexture("gravedad_zero_mission_01_completion_pack_v1/assets/hologram/relic_scanlines_overlay.png"),
  stageUnlockFlash: loadTexture("gravedad_zero_mission_01_completion_pack_v1/assets/vfx/stage_unlock/stage_unlock_flash_glow.png"),
  stageUnlockShockwave: loadTexture("gravedad_zero_mission_01_completion_pack_v1/assets/vfx/stage_unlock/stage_unlock_shockwave_atlas_4x4.png"),
  energyBeam: loadTexture("gravedad_zero_mission_01_completion_pack_v1/assets/vfx/stage_unlock/energy_transfer_beam_vertical.png"),
  relicParticles: loadTexture("gravedad_zero_mission_01_completion_pack_v1/assets/hologram/relic_particles_atlas_4x4.png"),
  astronautToolParticles: loadTexture("gravedad_zero_astronaut_projectiles_pack_v1/assets/vfx/astronaut/astronaut_tool_particles_atlas_4x4.png"),
  genericEnergyHit: loadTexture("gravedad_zero_astronaut_projectiles_pack_v1/assets/vfx/projectiles/generic_energy_hit_atlas_4x4.png"),
  targetLockReticle: loadTexture("gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/target_lock_reticle.png"),
  clickPulse: loadTexture("gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/click_pulse_atlas_4x4.png"),
  slowMotionVignette: loadTexture("gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/slow_motion_vignette_overlay.png"),
  timeDilationField: loadTexture("gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/time_dilation_field.png"),
  zeroGRotationStreaks: loadTexture("gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/zero_g_rotation_streaks_overlay.png"),
  aimAssistLine: loadTexture("gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/aim_assist_line.png"),
  fireReleaseFlash: loadTexture("gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/projectiles/fire_release_flash.png"),
};

const robotFxTextures = {
  idle: loadTexture("gravedad_zero_robot_companion_hud_pack_v1/assets/ui/robot_companion/robot_idle.png"),
  ready: loadTexture("gravedad_zero_robot_companion_hud_pack_v1/assets/ui/robot_companion/robot_ready.png"),
  alert: loadTexture("gravedad_zero_robot_companion_hud_pack_v1/assets/ui/robot_companion/robot_alert.png"),
  hint: loadTexture("gravedad_zero_robot_companion_hud_pack_v1/assets/ui/robot_companion/robot_hint.png"),
  stage_clear: loadTexture("gravedad_zero_robot_companion_hud_pack_v1/assets/ui/robot_companion/robot_stage_clear.png"),
  glowCyan: loadTexture("gravedad_zero_robot_companion_hud_pack_v1/assets/ui/robot_companion/robot_glow_cyan.png"),
  glowMagenta: loadTexture("gravedad_zero_robot_companion_hud_pack_v1/assets/ui/robot_companion/robot_glow_magenta.png"),
  shadow: loadTexture("gravedad_zero_robot_companion_hud_pack_v1/assets/ui/robot_companion/robot_shadow.png"),
};

const missionAudioItems = {
  mission_start: { file: "mission_start_arcade_01.wav", volume: 0.30 },
  small_hit: { file: "small_asteroid_hit_03.wav", volume: 0.18 },
  small_break: { file: "small_asteroid_break_04.wav", volume: 0.24 },
  large_spawn: { file: "large_obstacle_spawn_05.wav", volume: 0.30 },
  large_hit: { file: "large_obstacle_hit_06.wav", volume: 0.20 },
  large_break: { file: "large_obstacle_break_07.wav", volume: 0.32 },
  relic_reveal: { file: "relic_reveal_08.wav", volume: 0.28 },
  relic_burst: { file: "relic_expansion_burst_09.wav", volume: 0.24 },
  relic_idle: { file: "relic_idle_clean_loop_10.wav", volume: 0.07, loop: true },
  relic_touch: { file: "astronaut_touch_relic_11.wav", volume: 0.24 },
  energy_transfer: { file: "energy_transfer_to_ship_12.wav", volume: 0.30 },
  stage_unlocked: { file: "stage_unlocked_arcade_13.wav", volume: 0.34 },
  aim_click_ping: {
    path: "gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/audio/aim_click_ping_01.wav",
    volume: 0.25,
  },
  aim_lock_confirm: {
    path: "gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/audio/aim_lock_confirm_02.wav",
    volume: 0.28,
  },
  slow_motion_enter: {
    path: "gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/audio/slow_motion_enter_03.wav",
    volume: 0.24,
  },
  zero_g_rotate_whoosh: {
    path: "gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/audio/zero_g_rotate_whoosh_04.wav",
    volume: 0.24,
  },
  fire_release_snap: {
    path: "gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/audio/fire_release_snap_05.wav",
    volume: 0.28,
  },
  astronaut_tool_fire_cue: {
    path: "gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/audio/astronaut_tool_fire_cue_06.wav",
    volume: 0.30,
  },
  ship_heavy_fire_cue: {
    path: "gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/audio/ship_heavy_fire_cue_07.wav",
    volume: 0.34,
  },
  invalid_target_blip: {
    path: "gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/audio/invalid_target_blip_08.wav",
    volume: 0.18,
  },
  slow_motion_exit_snap: {
    path: "gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/audio/slow_motion_exit_snap_09.wav",
    volume: 0.22,
  },
  robot_open_hint: {
    path: "gravedad_zero_robot_companion_hud_pack_v1/assets/audio/robot_open_hint_01.wav",
    volume: 0.24,
  },
  robot_close_hint: {
    path: "gravedad_zero_robot_companion_hud_pack_v1/assets/audio/robot_close_hint_02.wav",
    volume: 0.18,
  },
  robot_alert_ping: {
    path: "gravedad_zero_robot_companion_hud_pack_v1/assets/audio/robot_alert_ping_03.wav",
    volume: 0.24,
  },
  robot_stage_clear: {
    path: "gravedad_zero_robot_companion_hud_pack_v1/assets/audio/robot_stage_clear_chime_04.wav",
    volume: 0.28,
  },
  robot_item_update: {
    path: "gravedad_zero_robot_companion_hud_pack_v1/assets/audio/robot_item_update_05.wav",
    volume: 0.18,
  },
  long_travel_low_rumble: {
    path: "nave_three_audio_pack_v2_refined/ambient_space_low_loop_14.wav",
    volume: 0.055,
    loop: true,
  },
  route_detected_ping: {
    path: "nave_three_audio_pack_v2_refined/ui_hover_sonar_02.wav",
    volume: 0.18,
  },
  mission_zone_enter: {
    path: "nave_three_audio_pack_v2_refined/motion_liftoff_ignition_08.wav",
    volume: 0.22,
  },
  gem_acquired: {
    path: "nave_three_audio_pack_v2_refined/reward_unlock_sparkle_refined_13.wav",
    volume: 0.32,
  },
  gem_counter_update: {
    path: "nave_three_audio_pack_v2_refined/ui_mission_accept_refined_03.wav",
    volume: 0.22,
  },
  stage_route_unlocked: {
    path: "nave_three_audio_pack_v2_refined/reward_unlock_sparkle_refined_13.wav",
    volume: 0.26,
  },
  zero_g_orientation_spray: {
    path: "nave_three_audio_pack_v2_refined/motion_speed_whoosh_refined_09.wav",
    volume: 0.15,
  },
  micro_thruster_burst: {
    path: "nave_three_audio_pack_v2_refined/motion_speed_whoosh_refined_09.wav",
    volume: 0.14,
  },
  recoil_hit: {
    path: "nave_three_audio_pack_v2_refined/combat_shield_hit_refined_11.wav",
    volume: 0.18,
  },
  impact_hit_stop: {
    path: "nave_three_audio_pack_v2_refined/combat_shield_hit_refined_11.wav",
    volume: 0.16,
  },
  final_relic_touch: { file: "astronaut_touch_relic_11.wav", volume: 0.30 },
  final_core_collapse: { file: "large_obstacle_break_07.wav", volume: 0.34 },
  final_shockwave: { file: "stage_unlocked_arcade_13.wav", volume: 0.30 },
  final_energy_beam: { file: "energy_transfer_to_ship_12.wav", volume: 0.32 },
  final_signal_acquired: {
    path: "nave_three_audio_pack_v2_refined/reward_unlock_sparkle_refined_13.wav",
    volume: 0.35,
  },
  mission_complete_resolve: {
    path: "nave_three_audio_pack_v2_refined/ui_mission_accept_refined_03.wav",
    volume: 0.30,
  },
};

const audioEventMap = {
  engine_idle: "ship_engine_idle_loop",
  engine_move: "ship_engine_move_loop",
  engine_boost: "ship_engine_boost_loop",
  speed_whoosh: "ship_speed_whoosh",
  long_travel_low_rumble: "long_travel_low_rumble",
  route_detected_ping: "route_detected_ping",
  mission_zone_enter: "mission_zone_enter",
  fragment_collected: "small_break",
  core_hit: "large_hit",
  core_destroyed: "large_break",
  relic_reveal: "relic_reveal",
  gem_acquired: "gem_acquired",
  gem_counter_update: "gem_counter_update",
  stage_route_unlocked: "stage_route_unlocked",
  target_lock: "aim_lock_confirm",
  slow_motion_enter: "slow_motion_enter",
  zero_g_orientation_spray: "zero_g_orientation_spray",
  micro_thruster_burst: "micro_thruster_burst",
  fire_release: "fire_release_snap",
  recoil_hit: "recoil_hit",
  impact_hit_stop: "impact_hit_stop",
  slow_motion_exit: "slow_motion_exit_snap",
  synthetic_body_near_hum: "procedural_hum",
  gravity_node_pulse: "procedural_pulse",
  final_relic_touch: "final_relic_touch",
  final_core_collapse: "final_core_collapse",
  final_shockwave: "final_shockwave",
  final_energy_beam: "final_energy_beam",
  final_signal_acquired: "final_signal_acquired",
  mission_complete_resolve: "mission_complete_resolve",
};

const missionAudio = {
  context: null,
  buffers: {},
  loops: {},
  ready: false,
  loading: false,
};

class ShipEngineAudio {
  constructor() {
    this.ready = false;
    this.basePath = "nave_three_audio_pack_v2_refined";
    this.loops = {};
    this.transitionWasActive = false;
    this.speedCueCooldown = 0;
    this.loopItems = {
      idle: { file: "engine_idle_clean_loop_05.wav", volume: 0.055 },
      move: { file: "engine_move_clean_loop_06.wav", volume: 0.075 },
      boost: { file: "engine_boost_clean_loop_07.wav", volume: 0.105 },
    };
    this.oneShots = {
      speed: { file: "motion_speed_whoosh_refined_09.wav", volume: 0.20 },
      warp: { file: "motion_warp_jump_refined_10.wav", volume: 0.28 },
    };
  }

  ensure() {
    if (this.ready) return;
    for (const [id, item] of Object.entries(this.loopItems)) {
      const audio = new Audio(missionAssetUrl(`${this.basePath}/${item.file}`));
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;
      this.loops[id] = audio;
      audio.play().catch(() => {});
    }
    this.ready = true;
  }

  fadeLoop(id, targetVolume, delta) {
    const loop = this.loops[id];
    if (!loop) return;
    const item = this.loopItems[id];
    const target = THREE.MathUtils.clamp(targetVolume, 0, item.volume);
    loop.volume = THREE.MathUtils.lerp(loop.volume, target, 1 - Math.pow(0.001, delta));
    if (loop.paused && loop.volume > 0.002) loop.play().catch(() => {});
  }

  playOneShot(id) {
    if (!this.ready) return null;
    const item = this.oneShots[id];
    if (!item) return null;
    const audio = new Audio(missionAssetUrl(`${this.basePath}/${item.file}`));
    audio.volume = item.volume;
    audio.play().catch(() => {});
    return audio;
  }

  update(shipVelocity, transition, delta) {
    if (!this.ready) return;
    const speed = THREE.MathUtils.clamp(shipVelocity.length(), 0, 1);
    const move = THREE.MathUtils.smoothstep(speed, 0.08, 0.58);
    const boost = transition ? 1 : THREE.MathUtils.smoothstep(speed, 0.66, 1);

    this.fadeLoop("idle", this.loopItems.idle.volume * (0.88 - move * 0.42), delta);
    this.fadeLoop("move", this.loopItems.move.volume * move * (1 - boost * 0.36), delta);
    this.fadeLoop("boost", this.loopItems.boost.volume * boost, delta);

    this.speedCueCooldown = Math.max(0, this.speedCueCooldown - delta);
    if (!transition && speed > 0.84 && this.speedCueCooldown <= 0) {
      this.playOneShot("speed");
      this.speedCueCooldown = 1.4;
    }

    if (transition && !this.transitionWasActive) {
      this.playOneShot("warp");
    }
    this.transitionWasActive = Boolean(transition);
  }
}

const shipEngineAudio = new ShipEngineAudio();

function missionAssetUrl(path) {
  return new URL(`../${path}`, import.meta.url).href;
}

function ensureMissionAudio() {
  if (!missionAudio.context && (window.AudioContext || window.webkitAudioContext)) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    missionAudio.context = new AudioContextCtor();
  }
  if (missionAudio.context?.state === "suspended") {
    missionAudio.context.resume().catch(() => {});
  }
  missionAudio.ready = true;
  ensureShipAudio();
}

function ensureShipAudio() {
  shipEngineAudio.ensure();
}

function playShipOneShot(id) {
  shipEngineAudio.playOneShot(id);
}

function updateShipEngineAudio(shipVelocity, transition, delta) {
  shipEngineAudio.update(shipVelocity, transition, delta);
}

function playMissionAudio(id) {
  const item = missionAudioItems[id];
  if (!item || !missionAudio.ready) return null;
  const source = item.path || `gravedad_zero_mission_01_completion_pack_v1/assets/audio/${item.file}`;

  if (item.loop) {
    if (!missionAudio.loops[id]) {
      const loop = new Audio(missionAssetUrl(source));
      loop.loop = true;
      loop.volume = item.volume;
      missionAudio.loops[id] = loop;
    }
    missionAudio.loops[id].play().catch(() => {});
    return missionAudio.loops[id];
  }

  const audio = new Audio(missionAssetUrl(source));
  audio.volume = item.volume;
  audio.play().catch(() => {});
  return audio;
}

function playProceduralAudio(id, { frequency = 420, duration = 0.18, volume = 0.045, type = "sine" } = {}) {
  if (!missionAudio.ready || !missionAudio.context) return null;
  const context = missionAudio.context;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.58), now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
  return oscillator;
}

function playAudioEvent(id, options = {}) {
  const mapped = audioEventMap[id] || id;
  if (mapped === "ship_speed_whoosh") return playShipOneShot("speed");
  if (mapped === "ship_engine_idle_loop" || mapped === "ship_engine_move_loop" || mapped === "ship_engine_boost_loop") {
    ensureShipAudio();
    return null;
  }
  if (mapped === "procedural_hum") {
    return playProceduralAudio(id, { frequency: 128, duration: 0.48, volume: 0.024, type: "triangle", ...options });
  }
  if (mapped === "procedural_pulse") {
    return playProceduralAudio(id, { frequency: 520, duration: 0.16, volume: 0.038, type: "sine", ...options });
  }
  return playMissionAudio(mapped);
}

function stopMissionAudio(id) {
  const loop = missionAudio.loops[id];
  if (!loop) return;
  loop.pause();
  loop.currentTime = 0;
}

function updateMissionHud(status, progress = "", subtitle = "") {
  if (!missionTitle || !missionSubtitle || !missionStatus || !missionProgress) return;
  missionTitle.textContent = "GRAVEDAD ZERO";
  if (subtitle) missionSubtitle.textContent = subtitle;
  missionStatus.textContent = status;
  missionProgress.textContent = progress;
  updateGemHud();
}

function updateGemHud() {
  if (!gemHud) return;
  if (mission01.finalSignalAcquired || mission01.finalComplete) {
    gemHud.textContent = "SEÑAL FINAL ADQUIRIDA";
    return;
  }
  gemHud.textContent = `GEMAS ${THREE.MathUtils.clamp(mission01.gems, 0, 3)}/3`;
}

function stageSectorLabel(stageIndex = state.stageIndex) {
  if (mission01.finalComplete) return "MISSION COMPLETE";
  if (mission01.finalStarted) return "FINAL";
  return `Sector ${stageIndex + 1}`;
}

function renderMenu(screenName) {
  const screen = menuScreens[screenName] || menuScreens.title_menu;
  if (!gameMenu || !menuEyebrow || !menuTitle || !menuSubtitle || !menuBody || !menuActions) return;
  gameMenu.dataset.screen = screenName;
  menuEyebrow.textContent = screen.eyebrow;
  menuTitle.textContent = screen.title;
  menuSubtitle.textContent = screen.subtitle;
  menuBody.replaceChildren(
    ...screen.body.map((item) => {
      const row = document.createElement("div");
      row.textContent = item;
      return row;
    })
  );
  menuActions.replaceChildren(
    ...screen.actions.map(([label, action, className]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.dataset.action = action;
      if (className) button.classList.add(className);
      return button;
    })
  );
}

function showMenu(screenName = "title_menu") {
  renderMenu(screenName);
  if (gameMenu) gameMenu.hidden = false;
}

function hideMenu() {
  if (gameMenu) gameMenu.hidden = true;
}

function handleMenuAction(action) {
  ensureMissionAudio();
  if (action === "start") {
    hideMenu();
    startMission01();
    return;
  }
  if (action === "controls") {
    showMenu("controls");
    return;
  }
  if (action === "title") {
    showMenu("title_menu");
    return;
  }
  if (action === "resume") {
    hideMenu();
  }
}

const stageDisplayName = {
  stage1: "Sector 1",
  stage2: "Sector 2",
  stage3: "Sector 3",
};

function makeSprite(asset, options = {}) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: asset.texture,
      transparent: true,
      opacity: options.opacity ?? 1,
      blending: options.blending ?? THREE.NormalBlending,
      depthWrite: false,
      depthTest: options.depthTest ?? true,
    })
  );
  sprite.userData.aspect = asset.aspect;
  sprite.renderOrder = options.renderOrder ?? 1;
  return sprite;
}

function makeCircleTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  for (let i = 0; i < 4; i += 1) {
    const inset = 72 + i * 20;
    const gradient = ctx.createLinearGradient(inset, inset, size - inset, size - inset);
    gradient.addColorStop(0, "rgba(35, 220, 255, 0.95)");
    gradient.addColorStop(0.5, "rgba(225, 58, 246, 0.95)");
    gradient.addColorStop(1, "rgba(120, 88, 255, 0.75)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 8 - i;
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2, size / 2 - inset, size / 2 - inset, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeDotTexture() {
  const size = 96;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(48, 48, 0, 48, 48, 44);
  g.addColorStop(0, "rgba(235,245,255,0.86)");
  g.addColorStop(0.22, "rgba(120,220,255,0.42)");
  g.addColorStop(0.72, "rgba(210,70,255,0.13)");
  g.addColorStop(1, "rgba(210,70,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeStreakTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 48, 512, 48);
  g.addColorStop(0, "rgba(0,210,255,0)");
  g.addColorStop(0.36, "rgba(0,210,255,0.15)");
  g.addColorStop(0.58, "rgba(255,48,200,0.32)");
  g.addColorStop(1, "rgba(255,48,200,0)");
  ctx.strokeStyle = g;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i += 1) {
    const y = 24 + i * 14;
    ctx.beginPath();
    ctx.moveTo(28 + i * 18, y);
    ctx.lineTo(482 - i * 16, y + 8);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeAuraTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 245);
  g.addColorStop(0, "rgba(255,255,255,0.16)");
  g.addColorStop(0.24, "rgba(40,230,255,0.23)");
  g.addColorStop(0.52, "rgba(222,52,255,0.18)");
  g.addColorStop(1, "rgba(100,60,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePlanetTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const base = ctx.createRadialGradient(160, 135, 20, 256, 256, 250);
  base.addColorStop(0, "#c8f6ff");
  base.addColorStop(0.22, "#45c5e8");
  base.addColorStop(0.55, "#2554ba");
  base.addColorStop(1, "#13183e");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.34;
  for (let y = -30; y < size + 40; y += 58) {
    const stripe = ctx.createLinearGradient(70, y, 470, y + 58);
    stripe.addColorStop(0, "rgba(255,55,204,0)");
    stripe.addColorStop(0.44, "rgba(255,55,204,0.45)");
    stripe.addColorStop(0.72, "rgba(50,220,255,0.28)");
    stripe.addColorStop(1, "rgba(50,220,255,0)");
    ctx.fillStyle = stripe;
    ctx.beginPath();
    ctx.ellipse(256, y + 20, 245, 18, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function seedRandom(seed) {
  let value = seed;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const backgroundUniforms = {
  uTime: { value: 0 },
  uAspect: { value: 1 },
  uThrust: { value: 0 },
  uRouteProgress: { value: state.routeProgress },
  uPointer: { value: new THREE.Vector2() },
  uWorldOffset: { value: state.worldOffset.clone() },
  uNebulaWide: { value: worldTextures.nebulaWide },
  uNebulaFlow: { value: worldTextures.nebulaFlow },
  uNebulaMagenta: { value: worldTextures.nebulaMagenta },
};

const backgroundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      uniforms: backgroundUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform float uAspect;
        uniform float uThrust;
        uniform float uRouteProgress;
        uniform vec2 uPointer;
        uniform vec2 uWorldOffset;
        uniform sampler2D uNebulaWide;
        uniform sampler2D uNebulaFlow;
        uniform sampler2D uNebulaMagenta;
        varying vec2 vUv;

        float hash(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 19.19);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float value = 0.0;
          float amp = 0.54;
          mat2 rot = mat2(0.86, -0.50, 0.50, 0.86);
          for (int i = 0; i < 5; i++) {
            value += noise(p) * amp;
            p = rot * p * 2.04 + 13.7;
            amp *= 0.50;
          }
          return value;
        }

        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          p.x *= uAspect;
          float route = clamp(uRouteProgress, 0.0, 1.0);
          vec2 drift = vec2(
            uPointer.x * 0.025 + uTime * 0.012,
            uTime * -0.018 - route * 1.72
          );
          vec2 mapDrift = vec2(uWorldOffset.x * 0.0028 + uTime * 0.002, -uWorldOffset.y * 0.0065);

          float nebulaA = fbm(vec2(p.x * 0.42, p.y * 0.78) + drift);
          float nebulaB = fbm(vec2(p.x * 1.15 - p.y * 0.12, p.y * 0.36) - drift * 0.8);
          vec3 wideTex = texture2D(uNebulaWide, fract(vUv + mapDrift * vec2(0.7, 1.0))).rgb;
          vec3 flowTex = texture2D(uNebulaFlow, fract(vUv * 1.08 + mapDrift * vec2(-0.5, 0.74))).rgb;
          vec3 magentaTex = texture2D(uNebulaMagenta, fract(vUv * 0.96 + mapDrift * vec2(0.36, 0.58))).rgb;
          float wideLum = dot(wideTex, vec3(0.2126, 0.7152, 0.0722));
          float flowLum = dot(flowTex, vec3(0.2126, 0.7152, 0.0722));
          float magentaLum = dot(magentaTex, vec3(0.2126, 0.7152, 0.0722));
          float depth = smoothstep(-1.0, 1.0, p.y);
          float upperRoute = smoothstep(0.42, 1.0, route);
          float objectiveRoute = smoothstep(0.76, 1.0, route);

          vec3 deep = vec3(0.004, 0.006, 0.026);
          vec3 blue = vec3(0.010, 0.030, 0.120);
          vec3 violet = vec3(0.160, 0.048, 0.340);
          vec3 magenta = vec3(0.570, 0.050, 0.360);
          vec3 cyan = vec3(0.020, 0.460, 0.600);

          vec3 color = mix(deep, blue, depth);
          color += violet * smoothstep(0.44, 0.92, nebulaA) * (0.30 + upperRoute * 0.12);
          color += magenta * smoothstep(0.62, 0.96, nebulaB) * (0.14 + objectiveRoute * 0.18);
          color += cyan * smoothstep(0.66, 0.98, nebulaA + nebulaB * 0.24) * (0.10 + upperRoute * 0.16);
          color += wideTex * smoothstep(0.045, 0.34, wideLum) * (0.065 + route * 0.035);
          color += flowTex * smoothstep(0.030, 0.28, flowLum) * (0.045 + uThrust * 0.025);
          color += magentaTex * smoothstep(0.035, 0.30, magentaLum) * (0.052 + upperRoute * 0.035);

          float corridor = smoothstep(0.70, 0.04, abs(p.x * 0.24 + p.y * 0.90 + 0.10));
          color += vec3(0.08, 0.24, 0.36) * corridor * (0.12 + uThrust * 0.12 + route * 0.08);
          color += vec3(0.32, 0.04, 0.30) * objectiveRoute * smoothstep(0.72, 0.05, abs(p.x - 0.18)) * 0.12;

          float vignette = smoothstep(1.75, 0.34, length(p / vec2(max(uAspect, 1.0), 1.0)));
          color *= 0.44 + vignette * 0.86;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
);
backgroundMesh.renderOrder = -100;
backgroundScene.add(backgroundMesh);

const nebulaLayers = new THREE.Group();
const nebulaBack = new THREE.Mesh(
  new THREE.PlaneGeometry(92, 46),
  new THREE.MeshBasicMaterial({
    map: worldTextures.nebulaWide,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  })
);
nebulaBack.position.set(0, 0.4, -44);
nebulaBack.userData = { drift: new THREE.Vector2(0.006, -0.002), parallax: 0.018 };
nebulaLayers.add(nebulaBack);

const nebulaFlow = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 38),
  new THREE.MeshBasicMaterial({
    map: worldTextures.nebulaFlow,
    transparent: true,
    opacity: 0.09,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  })
);
nebulaFlow.position.set(0, -0.25, -36);
nebulaFlow.userData = { drift: new THREE.Vector2(-0.004, -0.003), parallax: 0.026 };
nebulaLayers.add(nebulaFlow);
backgroundScene.add(nebulaLayers);
nebulaLayers.visible = false;

const ambientLight = new THREE.AmbientLight(0x7fa8ff, 1.15);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
keyLight.position.set(-1.8, 1.3, 4);
scene.add(keyLight);

const magentaLight = new THREE.PointLight(0xff48dc, 1.2, 6);
magentaLight.position.set(1.6, -0.55, 2.5);
scene.add(magentaLight);

const bgAmbientLight = new THREE.AmbientLight(0x8aa2ff, 0.94);
backgroundScene.add(bgAmbientLight);

const bgKeyLight = new THREE.DirectionalLight(0xffffff, 2.9);
bgKeyLight.position.set(-4.6, 3.3, 7.8);
backgroundScene.add(bgKeyLight);

const bgMagentaLight = new THREE.PointLight(0xff48dc, 2.8, 34);
bgMagentaLight.position.set(5.4, -2.9, 4.2);
backgroundScene.add(bgMagentaLight);

const bgCyanLight = new THREE.PointLight(0x31dcff, 2.0, 28);
bgCyanLight.position.set(-5.6, 2.5, 2.4);
backgroundScene.add(bgCyanLight);

const random = seedRandom(620);
const stars = new THREE.Group();
const speedLines = new THREE.Group();
const spaceObjects = new THREE.Group();
const deepSpace = new THREE.Group();
scene.add(stars);
scene.add(deepSpace);
scene.add(spaceObjects);
scene.add(speedLines);

const starTexture = makeDotTexture();
const streakTexture = makeStreakTexture();
const bgAuraTexture = makeAuraTexture();
const premiumBgColor = {
  cyan: new THREE.Color("#28dcff"),
  magenta: new THREE.Color("#f23bd6"),
};

stars.visible = false;
deepSpace.visible = false;
spaceObjects.visible = false;
speedLines.visible = false;

const integratedBackground = {
  planets: [],
  asteroids: [],
  stars: new THREE.Group(),
  streaks: new THREE.Group(),
};
backgroundScene.add(integratedBackground.stars);
backgroundScene.add(integratedBackground.streaks);
const routeLength = WORLD_HEIGHT;

function makePremiumPlanetTexture(kind) {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const base = ctx.createLinearGradient(0, 0, size, size);
  if (kind === "dark") {
    base.addColorStop(0, "#2d3147");
    base.addColorStop(0.46, "#171a2b");
    base.addColorStop(1, "#050711");
  } else {
    base.addColorStop(0, "#f2fdff");
    base.addColorStop(0.17, "#61dcf8");
    base.addColorStop(0.50, "#246ed1");
    base.addColorStop(1, "#08123d");
  }
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 38; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = 18 + random() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, kind === "dark" ? "rgba(242,55,214,0.44)" : "rgba(255,255,255,0.28)");
    g.addColorStop(0.55, "rgba(40,220,255,0.16)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = kind === "dark" ? 0.25 : 0.36;
  for (let y = -80; y < size + 120; y += 78) {
    const stripe = ctx.createLinearGradient(120, y, size - 80, y + 64);
    stripe.addColorStop(0, "rgba(255,70,210,0)");
    stripe.addColorStop(0.40, "rgba(255,70,210,0.58)");
    stripe.addColorStop(0.66, "rgba(40,220,255,0.50)");
    stripe.addColorStop(1, "rgba(40,220,255,0)");
    ctx.fillStyle = stripe;
    ctx.beginPath();
    ctx.ellipse(size / 2, y, size * 0.44, 18 + random() * 16, -0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function createIntegratedPlanet({ kind, radius, position, routeY, opacity = 1, map = null, normalMap = null }) {
  const group = new THREE.Group();
  const worldBase = new THREE.Vector3(position.x, routeY + position.y, position.z);
  group.position.copy(worldBase);
  group.userData = {
    base: worldBase,
    routeY,
    parallax: Math.abs(position.z) < 12 ? 0.18 : 0.09,
    spin: (kind === "dark" ? -0.085 : 0.064) * (0.8 + random() * 0.55),
    orbitRadius: new THREE.Vector2(0.48 + random() * 0.58, 0.24 + random() * 0.42),
    orbitSpeed: (kind === "dark" ? -0.18 : 0.14) * (0.7 + random() * 0.85),
    orbitPhase: random() * Math.PI * 2,
  };

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 72, 48),
    new THREE.MeshStandardMaterial({
      map: map || makePremiumPlanetTexture(kind),
      normalMap,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughness: 0.78,
      metalness: 0.04,
      emissive: kind === "dark" ? 0x260a38 : 0x07325e,
      emissiveIntensity: kind === "dark" ? 0.30 : 0.24,
      transparent: true,
      opacity,
    })
  );
  sphere.userData.baseOpacity = opacity;
  group.add(sphere);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.05, 72, 48),
    new THREE.MeshBasicMaterial({
      color: kind === "dark" ? 0xf23bd6 : 0x28dcff,
      transparent: true,
      opacity: kind === "dark" ? 0.18 : 0.20,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  atmosphere.userData.baseOpacity = kind === "dark" ? 0.18 : 0.20;
  group.add(atmosphere);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: bgAuraTexture,
      transparent: true,
      opacity: kind === "dark" ? 0.28 : 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  halo.scale.set(radius * 3.3, radius * 3.3, 1);
  halo.position.z = -0.08;
  halo.userData.baseOpacity = kind === "dark" ? 0.28 : 0.34;
  group.add(halo);

  backgroundScene.add(group);
  integratedBackground.planets.push(group);
  return group;
}

function createIntegratedAsteroidGeometry(radius) {
  const geometry = new THREE.IcosahedronGeometry(radius, 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const v = new THREE.Vector3().fromBufferAttribute(position, i);
    v.multiplyScalar(0.86 + random() * 0.24);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createIntegratedAsteroid({
  position,
  radius,
  routeY,
  objective = false,
  map = null,
  normalMap = null,
  size = "small",
  interactive = false,
  missionRole = null,
  active = true,
}) {
  const group = new THREE.Group();
  const worldBase = new THREE.Vector3(position.x, routeY + position.y, position.z);
  group.position.copy(worldBase);
  const maxHp = objective || size === "large" ? 3 : size === "medium" ? 2 : 1;
  group.userData = {
    base: worldBase,
    routeY,
    parallax: THREE.MathUtils.mapLinear(position.z, -18, 2, 0.05, 0.50),
    drift: new THREE.Vector3((random() - 0.5) * 0.05, -0.044 - random() * 0.05, 0),
    spin: new THREE.Vector3(0.28 + random() * 0.28, 0.34 + random() * 0.34, 0.14 + random() * 0.22),
    phase: random() * Math.PI * 2,
    orbitRadius: new THREE.Vector2(0.34 + random() * 0.52, 0.22 + random() * 0.40),
    orbitSpeed: (random() > 0.5 ? 1 : -1) * (0.18 + random() * 0.20),
    objective,
    interactive,
    missionRole,
    active,
    radius,
    size,
    maxHp,
    hp: maxHp,
    hitRadius: radius * (objective || size === "large" ? 2.1 : 2.65),
    destroyed: false,
    destroyTime: 0,
    hitPulse: 0,
  };

  const mesh = new THREE.Mesh(
    createIntegratedAsteroidGeometry(radius),
    new THREE.MeshStandardMaterial({
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.24, 0.24),
      color: objective ? 0x3a4057 : 0x30364a,
      roughness: 0.88,
      metalness: 0.10,
      emissive: objective ? 0x0b2638 : 0x101426,
      emissiveIntensity: objective ? 0.56 : 0.24,
      flatShading: false,
      transparent: true,
      opacity: 1,
    })
  );
  mesh.userData.baseOpacity = 1;
  group.add(mesh);

  const shardCount = objective ? 6 : 2 + Math.floor(random() * 3);
  for (let i = 0; i < shardCount; i += 1) {
    const shard = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.34, radius * 0.05, radius * 0.03),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? premiumBgColor.magenta : premiumBgColor.cyan,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    shard.position.set((random() - 0.5) * radius * 0.78, (random() - 0.5) * radius * 0.62, radius * 0.88);
    shard.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    shard.userData.baseOpacity = 0.82;
    group.add(shard);
  }

  if (objective) {
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: bgAuraTexture,
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.scale.set(radius * 5.6, radius * 5.6, 1);
    halo.userData.isObjectiveHalo = true;
    halo.userData.baseOpacity = 0.58;
    group.add(halo);
  }

  if (interactive) {
    const targetHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: bgAuraTexture,
        transparent: true,
        opacity: size === "large" ? 0.48 : 0.38,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    targetHalo.scale.set(radius * (size === "large" ? 5.8 : 4.9), radius * (size === "large" ? 5.8 : 4.9), 1);
    targetHalo.userData.isMissionTargetHalo = true;
    targetHalo.userData.baseOpacity = size === "large" ? 0.48 : 0.38;
    group.add(targetHalo);
  }

  backgroundScene.add(group);
  integratedBackground.asteroids.push(group);
  return group;
}

const missionStageConfigs = [
  {
    mission: "SECTOR 01",
    name: "CAMPO INESTABLE",
    subtitle: "RUMBO NORTE / CAMPO INESTABLE",
    zoneName: "STAGE 1 ZONE",
    gemName: "GEMA 1",
    routeHint: "RUMBO NORTE",
    smallRequired: 3,
    largeRequired: 1,
    smallTargets: [
      { x: -1.96, y: -0.14, z: -2.0, radius: 0.20 },
      { x: -1.42, y: 0.40, z: -1.9, radius: 0.20 },
      { x: -0.96, y: -0.76, z: -2.1, radius: 0.19 },
    ],
    largeTargets: [{ x: 0.35, y: 0.92, z: -2.0, radius: 0.50 }],
  },
  {
    mission: "SECTOR 02",
    name: "ÓRBITA FRACTURADA",
    subtitle: "RUMBO ESTE / ÓRBITA FRACTURADA",
    zoneName: "STAGE 2 ZONE",
    gemName: "GEMA 2",
    routeHint: "RUMBO ESTE",
    smallRequired: 3,
    largeRequired: 2,
    smallTargets: [
      { x: -2.02, y: 0.22, z: -2.15, radius: 0.20 },
      { x: -1.48, y: -0.54, z: -1.95, radius: 0.20 },
      { x: -0.90, y: -0.08, z: -2.05, radius: 0.19 },
    ],
    largeTargets: [
      { x: 0.24, y: 0.86, z: -2.05, radius: 0.49 },
      { x: 1.08, y: 0.18, z: -2.12, radius: 0.52 },
    ],
  },
  {
    mission: "SECTOR 03",
    name: "NÚCLEO DESCONOCIDO",
    subtitle: "RUMBO OESTE / NÚCLEO DESCONOCIDO",
    zoneName: "STAGE 3 ZONE",
    gemName: "GEMA 3",
    routeHint: "RUMBO OESTE",
    smallRequired: 3,
    largeRequired: 3,
    smallTargets: [
      { x: -2.04, y: -0.54, z: -2.12, radius: 0.20 },
      { x: -1.46, y: 0.14, z: -1.94, radius: 0.20 },
      { x: -0.86, y: -0.54, z: -2.04, radius: 0.19 },
    ],
    largeTargets: [
      { x: -0.18, y: 0.90, z: -2.06, radius: 0.49 },
      { x: 0.78, y: 0.28, z: -2.14, radius: 0.52 },
      { x: 1.46, y: -0.34, z: -2.08, radius: 0.47 },
    ],
  },
];

function currentMissionConfig(stageIndex = mission01.currentStageIndex ?? state.stageIndex) {
  return missionStageConfigs[THREE.MathUtils.clamp(stageIndex, 0, missionStageConfigs.length - 1)];
}

function largeObjectiveLabel(count) {
  return `ROMPÉ ${count} NÚCLEO${count === 1 ? "" : "S"} INESTABLE${count === 1 ? "" : "S"}`;
}

function largeObjectiveNoun(count) {
  return `NÚCLEO${count === 1 ? "" : "S"} INESTABLE${count === 1 ? "" : "S"}`;
}

function missionObjectiveCopy(config) {
  return `RECUPERÁ ${config.smallRequired} FRAGMENTOS DE SEÑAL / ${largeObjectiveLabel(config.largeRequired)}`;
}

const mission01 = {
  started: false,
  state: "boot",
  currentStageIndex: initialStageIndex,
  smallRequired: 3,
  smallDestroyed: 0,
  smallAsteroids: [],
  largeRequired: 1,
  largeDestroyed: 0,
  largeObstacle: null,
  largeObstacles: [],
  stageTargets: new Map(),
  relicGroup: null,
  relicState: "hidden",
  relicTouched: false,
  unlockStarted: false,
  revealTime: 0,
  relicDestroyTime: 0,
  gems: 0,
  finalSignalAcquired: false,
  finalStarted: false,
  finalComplete: false,
  finalTime: 0,
  zoneIndex: initialStageIndex,
};

const aimAssist = {
  active: false,
  target: null,
  shooter: null,
  clickPoint: new THREE.Vector2(),
  firePoint: new THREE.Vector2(),
  time: 0,
  duration: 0.90,
  fireTime: 0.40,
  impactTime: 0.60,
  fired: false,
  impacted: false,
  recoil: 0,
  hitStop: 0,
  played: {},
};

const robotCompanion = {
  state: "idle",
  message: "RUMBO EN ESPERA",
  panelOpen: false,
  pulse: 0,
  lastMissionState: "boot",
  smallCurrent: 0,
  largeCurrent: 0,
  relicCurrent: 0,
};

const menuScreens = {
  title_menu: {
    eyebrow: "SECTOR INICIAL",
    title: "GRAVEDAD ZERO",
    subtitle: "RECUPERÁ LAS GEMAS DE RUTA",
    body: [],
    actions: [
      ["INICIAR MISIÓN", "start"],
      ["CONTROLES", "controls", "secondary"],
    ],
  },
  mission_briefing: {
    eyebrow: "SECTOR 01",
    title: "CAMPO INESTABLE",
    subtitle: "RUMBO NORTE",
    body: ["RECUPERÁ 3 FRAGMENTOS DE SEÑAL", "ROMPÉ 1 NÚCLEO INESTABLE", "ACTIVÁ LA RELIQUIA"],
    actions: [["INICIAR MISIÓN", "start"]],
  },
  controls: {
    eyebrow: "GRAVEDAD ZERO",
    title: "CONTROLES",
    subtitle: "AUTO TARGET",
    body: ["WASD / FLECHAS", "CLICK / DISPARO", "ESC / PAUSA"],
    actions: [
      ["VOLVER", "title", "secondary"],
      ["INICIAR MISIÓN", "start"],
    ],
  },
  pause: {
    eyebrow: "GRAVEDAD ZERO",
    title: "PAUSA",
    subtitle: "RUTA EN CURSO",
    body: ["FRAGMENTOS Y NÚCLEOS", "SECTOR ACTUAL"],
    actions: [["CONTINUAR", "resume"]],
  },
  stage_unlocked: {
    eyebrow: "GRAVEDAD ZERO",
    title: "GEMA ADQUIRIDA",
    subtitle: "NUEVO RUMBO ESTABILIZADO",
    body: ["RUTA ABIERTA", "SIGUIENTE SECTOR"],
    actions: [["CONTINUAR", "resume"]],
  },
  mission_complete: {
    eyebrow: "GRAVEDAD ZERO",
    title: "MISSION COMPLETE",
    subtitle: "RUTA ESTABILIZADA",
    body: ["SEÑAL FINAL ADQUIRIDA", "GEMAS 3/3", "NAVE SINCRONIZADA"],
    actions: [["CONTINUAR", "resume"]],
  },
};

[
  { kind: "ocean", radius: 2.8, position: new THREE.Vector3(8.4, 0, -11.2), routeY: -9.0, opacity: 0.92, map: worldTextures.oceanWorld },
  { kind: "dark", radius: 1.72, position: new THREE.Vector3(-10.6, 0, -9.8), routeY: 4.6, opacity: 0.90, map: worldTextures.cyberEarth },
  { kind: "ocean", radius: 1.35, position: new THREE.Vector3(11.8, 0, -14.0), routeY: 18.0, opacity: 0.70, map: worldTextures.networkPlanet },
  { kind: "dark", radius: 2.25, position: new THREE.Vector3(-8.8, 0, -11.8), routeY: 32.5, opacity: 0.86, map: worldTextures.darkCrater, normalMap: worldTextures.darkCraterNormal },
  { kind: "ocean", radius: 1.72, position: new THREE.Vector3(9.6, 0, -10.6), routeY: 48.0, opacity: 0.80, map: worldTextures.gasGiant },
  { kind: "dark", radius: 2.55, position: new THREE.Vector3(-12.6, 0, -12.4), routeY: 67.5, opacity: 0.86, map: worldTextures.craterWorld, normalMap: worldTextures.craterNormal },
  { kind: "ocean", radius: 1.58, position: new THREE.Vector3(7.2, 0, -13.8), routeY: 82.0, opacity: 0.66, map: worldTextures.oceanColor },
].forEach((planet) => createIntegratedPlanet(planet));

const asteroidTextureCycle = [
  worldTextures.asteroidSurface,
  worldTextures.asteroidPlates,
  worldTextures.asteroidWide,
  worldTextures.darkCrater,
];

function resetMissionTarget(target, active = false) {
  target.userData.active = active;
  target.userData.destroyed = false;
  target.userData.destroyTime = 0;
  target.userData.hitPulse = 0;
  target.userData.hp = target.userData.maxHp;
  target.visible = active;
  target.scale.setScalar(1);
  setGroupOpacity(target, 1);
}

function placeMissionTarget(target, spec, routeY) {
  target.userData.base.set(spec.x, routeY + spec.y, spec.z);
  target.userData.routeY = routeY;
  target.position.copy(target.userData.base);
  target.userData.radius = spec.radius;
  target.userData.hitRadius = spec.radius * (target.userData.missionRole === "large" ? 3.45 : 3.7);
}

function spawnStageTargets(stageIndex) {
  const safeStageIndex = THREE.MathUtils.clamp(stageIndex, 0, missionStageConfigs.length - 1);
  const existing = mission01.stageTargets.get(safeStageIndex);
  if (existing) return existing;

  const config = currentMissionConfig(safeStageIndex);
  const routeBase = state.worldOffset.y * 0.944 + safeStageIndex * 0.18;
  const pool = { small: [], large: [] };

  config.smallTargets.forEach((spec, index) => {
    const target = createIntegratedAsteroid({
      position: new THREE.Vector3(spec.x, spec.y, spec.z),
      radius: spec.radius,
      routeY: routeBase + index * 0.34,
      size: "small",
      interactive: true,
      missionRole: "small",
      active: false,
      map: asteroidTextureCycle[(safeStageIndex + index + 1) % asteroidTextureCycle.length],
      normalMap: index === 1 ? worldTextures.craterNormal : null,
    });
    target.userData.stageIndex = safeStageIndex;
    target.userData.targetIndex = index;
    target.userData.maxHp = 1;
    target.userData.hp = 1;
    target.userData.hitRadius = spec.radius * 3.7;
    target.visible = false;
    pool.small.push(target);
  });

  config.largeTargets.forEach((spec, index) => {
    const target = createIntegratedAsteroid({
      position: new THREE.Vector3(spec.x, spec.y, spec.z),
      radius: spec.radius,
      routeY: routeBase + 1.42 + index * 0.36,
      objective: true,
      size: "large",
      interactive: true,
      missionRole: "large",
      active: false,
      map: asteroidTextureCycle[(safeStageIndex + index + 2) % asteroidTextureCycle.length],
      normalMap: worldTextures.craterNormal,
    });
    target.userData.stageIndex = safeStageIndex;
    target.userData.targetIndex = index;
    target.userData.maxHp = 2;
    target.userData.hp = 2;
    target.userData.hitRadius = spec.radius * 3.45;
    target.visible = false;
    pool.large.push(target);
  });

  mission01.stageTargets.set(safeStageIndex, pool);
  return pool;
}

function clearPreviousStageTargets() {
  for (const pool of mission01.stageTargets.values()) {
    for (const target of [...pool.small, ...pool.large]) {
      resetMissionTarget(target, false);
    }
  }
}

function resetStageMission(stageIndex) {
  const safeStageIndex = THREE.MathUtils.clamp(stageIndex, 0, missionStageConfigs.length - 1);
  const config = currentMissionConfig(safeStageIndex);
  const pool = spawnStageTargets(safeStageIndex);
  const routeBase = state.worldOffset.y * 0.944;

  mission01.started = true;
  mission01.state = "small_asteroids";
  mission01.currentStageIndex = safeStageIndex;
  mission01.smallRequired = config.smallRequired;
  mission01.largeRequired = config.largeRequired;
  mission01.smallDestroyed = 0;
  mission01.largeDestroyed = 0;
  mission01.smallAsteroids = pool.small;
  mission01.largeObstacles = pool.large;
  mission01.largeObstacle = pool.large[0] || null;
  mission01.relicTouched = false;
  mission01.unlockStarted = false;
  mission01.relicState = "hidden";
  mission01.revealTime = 0;
  mission01.relicDestroyTime = 0;
  mission01.zoneIndex = safeStageIndex;

  pool.small.forEach((target, index) => {
    placeMissionTarget(target, config.smallTargets[index], routeBase + index * 0.34);
    resetMissionTarget(target, false);
  });
  pool.large.forEach((target, index) => {
    placeMissionTarget(target, config.largeTargets[index], routeBase + 1.42 + index * 0.36);
    resetMissionTarget(target, false);
  });

  stopMissionAudio("relic_idle");
  if (mission01.relicGroup) mission01.relicGroup.visible = false;
  if (energyBeam) energyBeam.visible = false;
  if (unlockFlash) unlockFlash.visible = false;
  updateMissionHud(config.mission, missionObjectiveCopy(config), config.subtitle);
  updateRobotPanel();
}

function activateStageTargets(stageIndex) {
  const pool = spawnStageTargets(stageIndex);
  setMissionTargetsActive(pool.small, true);
  setMissionTargetsActive(pool.large, false);
}

function startMissionForStage(stageIndex) {
  const safeStageIndex = THREE.MathUtils.clamp(stageIndex, 0, missionStageConfigs.length - 1);
  const config = currentMissionConfig(safeStageIndex);
  hideMenu();
  if (state.stageIndex !== safeStageIndex) applyStage(safeStageIndex);
  if (mission01.finalComplete || mission01.finalStarted) return;
  spawnStageTargets(safeStageIndex);
  clearPreviousStageTargets();
  resetStageMission(safeStageIndex);
  activateStageTargets(safeStageIndex);
  updateMissionHud(config.mission, missionObjectiveCopy(config), config.subtitle);
  playMissionAudio("mission_start");
  playAudioEvent("long_travel_low_rumble");
  playAudioEvent("route_detected_ping");
  syncRobotCompanion("small_asteroids");
  enterAstronautMode();
}

const orbitalWorld = {
  group: new THREE.Group(),
  objects: [],
};
backgroundScene.add(orbitalWorld.group);

function createOrbitalObject({
  kind = "debris",
  position,
  radius = 0.24,
  routeY = 0,
  map = null,
  color = 0x9fdcff,
  opacity = 0.42,
  parallax = 0.20,
  stageWeights = [1, 1, 1],
  spin = 0.04,
  drift = new THREE.Vector2(),
  layer = "mid",
}) {
  let object;
  if (kind === "planet") {
    object = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 48, 32),
      new THREE.MeshStandardMaterial({
        map,
        roughness: 0.80,
        metalness: 0.02,
        emissive: color,
        emissiveIntensity: 0.16,
        transparent: true,
        opacity,
      })
    );
  } else if (kind === "crystal") {
    object = new THREE.Mesh(
      new THREE.TetrahedronGeometry(radius, 1),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
  } else {
    object = new THREE.Mesh(
      createIntegratedAsteroidGeometry(radius),
      new THREE.MeshStandardMaterial({
        map,
        roughness: 0.90,
        metalness: 0.06,
        emissive: 0x09172a,
        emissiveIntensity: 0.24,
        transparent: true,
        opacity,
      })
    );
  }

  const base = new THREE.Vector3(position.x, routeY + position.y, position.z);
  object.position.copy(base);
  object.userData = {
    base,
    baseOpacity: opacity,
    routeY,
    parallax,
    stageWeights,
    spin,
    drift,
    layer,
    phase: random() * Math.PI * 2,
    wrapX: WORLD_WRAP_X + 14 + Math.abs(position.z) * 0.8,
    wrapY: WORLD_WRAP_Y + 18 + Math.abs(position.z) * 0.7,
  };
  orbitalWorld.group.add(object);
  orbitalWorld.objects.push(object);
  return object;
}

function createPlanetLayer() {
  [
    {
      kind: "planet",
      position: new THREE.Vector3(-18.5, 1.6, -26),
      routeY: -6,
      radius: 1.55,
      map: worldTextures.gasGiant,
      color: 0x2ddcff,
      opacity: 0.38,
      parallax: 0.055,
      stageWeights: [0.9, 0.48, 0.62],
      spin: 0.018,
    },
    {
      kind: "planet",
      position: new THREE.Vector3(18.2, -1.0, -24),
      routeY: 24,
      radius: 1.12,
      map: worldTextures.networkPlanet,
      color: 0xff4fdd,
      opacity: 0.32,
      parallax: 0.065,
      stageWeights: [0.40, 0.95, 0.58],
      spin: -0.020,
    },
    {
      kind: "planet",
      position: new THREE.Vector3(-16.8, -1.4, -21),
      routeY: 55,
      radius: 1.34,
      map: worldTextures.craterWorld,
      color: 0xbf52ff,
      opacity: 0.34,
      parallax: 0.075,
      stageWeights: [0.50, 0.62, 1],
      spin: 0.022,
    },
  ].forEach(createOrbitalObject);
}

function createDebrisField() {
  for (let i = 0; i < 46; i += 1) {
    const stageBias = i % 3;
    createOrbitalObject({
      kind: "debris",
      position: new THREE.Vector3((random() - 0.5) * 38, (random() - 0.5) * 5.8, -8 - random() * 12),
      routeY: WORLD_MIN_Y + random() * (WORLD_HEIGHT + 18),
      radius: 0.045 + random() * 0.16,
      map: asteroidTextureCycle[i % asteroidTextureCycle.length],
      opacity: 0.20 + random() * 0.28,
      parallax: 0.12 + random() * 0.18,
      stageWeights: [stageBias === 0 ? 1 : 0.62, stageBias === 1 ? 1 : 0.62, stageBias === 2 ? 1 : 0.62],
      spin: (random() > 0.5 ? 1 : -1) * (0.10 + random() * 0.34),
      drift: new THREE.Vector2((random() - 0.5) * 0.025, -0.018 - random() * 0.018),
      layer: "mid",
    });
  }
}

function createCrystalCluster() {
  for (let i = 0; i < 18; i += 1) {
    createOrbitalObject({
      kind: "crystal",
      position: new THREE.Vector3((random() - 0.5) * 24, (random() - 0.5) * 3.4, -4.2 - random() * 3.2),
      routeY: 14 + i * 3.9,
      radius: 0.030 + random() * 0.045,
      color: i % 2 ? 0xff5de1 : 0x62edff,
      opacity: 0.22 + random() * 0.20,
      parallax: 0.26 + random() * 0.16,
      stageWeights: [0.44, 0.68, 1],
      spin: (random() > 0.5 ? 1 : -1) * (0.26 + random() * 0.36),
      drift: new THREE.Vector2((random() - 0.5) * 0.020, -0.010 - random() * 0.020),
      layer: "foreground",
    });
  }
}

const assetUsageAudit = {
  naturalBodies: [
    "assets/runtime/three-textures/ocean-color.png",
    "assets/runtime/three-textures/ocean-world-bright-color.png",
    "assets/runtime/three-textures/gas-giant-color.png",
    "assets/runtime/three-textures/network-planet-dark-color.png",
    "assets/runtime/three-textures/dark-crater-color.png",
    "assets/runtime/three-textures/asteroid-crater-magenta-color.png",
    "assets/runtime/three-textures/asteroid-surface-neon-close-color.png",
    "assets/runtime/three-textures/asteroid-surface-plates-color.png",
    "assets/runtime/three-textures/asteroid-surface-wide-color.png",
  ],
  syntheticBodies: [
    "gravedad_zero_mission_01_completion_pack_v1/assets/hologram/relic_hologram_alpha_cropped.png",
    "gravedad_zero_mission_01_completion_pack_v1/assets/hologram/relic_scanlines_overlay.png",
    "gravedad_zero_mission_01_completion_pack_v1/assets/hologram/relic_orbit_ring_01.png",
    "gravedad_zero_mission_01_completion_pack_v1/assets/hologram/relic_aura_glow.png",
    "gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/target_lock_reticle.png",
    "gravedad_zero_aim_assist_fx_contracts_pack_v1/assets/vfx/aim_assist/time_dilation_field.png",
    "gravedad_zero_astronaut_projectiles_pack_v1/assets/vfx/projectiles/generic_target_lock_glow.png",
  ],
};

const proceduralWorld = {
  group: new THREE.Group(),
  chunks: new Map(),
  chunkSize: 64,
  visibleRadius: 2,
  releaseRadius: 3,
  displayScale: 0.235,
  objects: [],
  audioCooldown: 0,
};
const ProceduralWorld = proceduralWorld;
backgroundScene.add(proceduralWorld.group);

const proceduralBodyTextures = {
  natural: [
    worldTextures.oceanColor,
    worldTextures.oceanWorld,
    worldTextures.gasGiant,
    worldTextures.networkPlanet,
    worldTextures.darkCrater,
    worldTextures.craterWorld,
    worldTextures.asteroidSurface,
    worldTextures.asteroidPlates,
    worldTextures.asteroidWide,
  ],
  synthetic: [
    missionFxTextures.relicCore,
    missionFxTextures.relicScanlines,
    missionFxTextures.relicRingA,
    missionFxTextures.relicGlow,
    missionFxTextures.targetLockReticle,
    missionFxTextures.timeDilationField,
    loadTexture("gravedad_zero_astronaut_projectiles_pack_v1/assets/vfx/projectiles/generic_target_lock_glow.png"),
  ],
};

function getChunkKey(chunkX, chunkY) {
  return `${chunkX}:${chunkY}`;
}

function seededRandom(chunkX, chunkY, stageIndex = state.stageIndex) {
  const seed =
    Math.imul(chunkX + 32768, 73856093) ^
    Math.imul(chunkY + 32768, 19349663) ^
    Math.imul(stageIndex + 17, 83492791) ^
    0x4f1bbcdd;
  return seedRandom(seed);
}

function currentChunkCoords() {
  return {
    x: Math.floor(state.worldOffset.x / proceduralWorld.chunkSize),
    y: Math.floor(state.worldOffset.y / proceduralWorld.chunkSize),
  };
}

function proceduralStageTint(stageAffinity) {
  if (mission01.finalStarted || stageAffinity === 3) return new THREE.Color("#ffffff");
  if (stageAffinity === 2) return new THREE.Color("#ff5de1");
  if (stageAffinity === 1) return new THREE.Color("#a36dff");
  return new THREE.Color("#62edff");
}

function makeBodyMaterial({ map, color = 0xffffff, emissive = 0x061426, opacity = 0.78, metalness = 0.10 }) {
  return new THREE.MeshStandardMaterial({
    map,
    color,
    roughness: 0.76,
    metalness,
    emissive,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity,
  });
}

function createOrbitingShards(group, rand, radius, count, color) {
  for (let i = 0; i < count; i += 1) {
    const shard = new THREE.Mesh(
      new THREE.TetrahedronGeometry(radius * (0.10 + rand() * 0.09), 0),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.46 + rand() * 0.24,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const angle = (i / count) * Math.PI * 2 + rand() * 0.4;
    const distance = radius * (1.35 + rand() * 0.85);
    shard.position.set(Math.cos(angle) * distance, Math.sin(angle) * distance * 0.62, (rand() - 0.5) * radius);
    shard.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    group.add(shard);
  }
}

function createSyntheticPoints(rand, radius, color) {
  const count = 18 + Math.floor(rand() * 16);
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const angle = rand() * Math.PI * 2;
    const distance = radius * (0.9 + rand() * 1.2);
    points.push(Math.cos(angle) * distance, Math.sin(angle) * distance, (rand() - 0.5) * radius * 0.8);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: starTexture,
      color,
      size: radius * 0.08,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
}

function createLineCage(rand, radius, color) {
  const points = [];
  const count = 6 + Math.floor(rand() * 4);
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const b = ((i + 2) / count) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius * 0.62, 0),
      new THREE.Vector3(Math.cos(b) * radius * 0.82, Math.sin(b) * radius, radius * 0.18)
    );
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
}

function createProceduralBody(kind, chunkX, chunkY, rand, index) {
  const chunkSize = proceduralWorld.chunkSize;
  const base = new THREE.Vector3(
    chunkX * chunkSize + (rand() - 0.5) * chunkSize * 0.92,
    chunkY * chunkSize + (rand() - 0.5) * chunkSize * 0.92,
    -6 - rand() * 22
  );
  const group = new THREE.Group();
  const stageAffinity = (Math.abs(chunkX) + Math.abs(chunkY) + index) % 4;
  const tint = proceduralStageTint(stageAffinity);
  const radius =
    kind === "planet_far"
      ? 1.7 + rand() * 2.2
      : kind === "planet_mid"
        ? 0.88 + rand() * 1.2
        : kind === "moon" || kind === "tech_moon"
          ? 0.36 + rand() * 0.48
          : kind === "debris_cluster" || kind === "foreground_shards"
            ? 0.12 + rand() * 0.22
            : 0.28 + rand() * 0.42;
  const naturalMap = proceduralBodyTextures.natural[Math.floor(rand() * proceduralBodyTextures.natural.length)];
  const syntheticMap = proceduralBodyTextures.synthetic[Math.floor(rand() * proceduralBodyTextures.synthetic.length)];
  const opacity = kind === "planet_far" ? 0.28 + rand() * 0.18 : 0.46 + rand() * 0.34;

  group.userData = {
    kind,
    chunkKey: getChunkKey(chunkX, chunkY),
    base,
    radius,
    baseOpacity: opacity,
    stageAffinity,
    parallax: THREE.MathUtils.mapLinear(Math.abs(base.z), 6, 28, 0.18, 0.045),
    drift: new THREE.Vector2((rand() - 0.5) * 0.018, (rand() - 0.5) * 0.018),
    orbitRadius: new THREE.Vector2(0.10 + rand() * 0.36, 0.08 + rand() * 0.24),
    orbitSpeed: (rand() > 0.5 ? 1 : -1) * (0.045 + rand() * 0.12),
    phase: rand() * Math.PI * 2,
    spin: (rand() > 0.5 ? 1 : -1) * (0.08 + rand() * 0.22),
  };

  if (kind === "planet_far" || kind === "planet_mid" || kind === "moon") {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, kind === "planet_far" ? 64 : 40, kind === "planet_far" ? 36 : 24),
      makeBodyMaterial({
        map: naturalMap,
        color: 0xffffff,
        emissive: stageAffinity === 2 ? 0x31102a : 0x071932,
        opacity,
        metalness: 0.04,
      })
    );
    group.add(sphere);
    if (kind !== "moon") {
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.045, 48, 24),
        new THREE.MeshBasicMaterial({
          color: tint,
          transparent: true,
          opacity: 0.10,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          depthWrite: false,
        })
      );
      group.add(atmosphere);
    }
  } else if (kind === "synthetic_core" || kind === "signal_body" || kind === "tech_moon") {
    const core = new THREE.Mesh(
      kind === "tech_moon" ? new THREE.SphereGeometry(radius, 36, 20) : new THREE.IcosahedronGeometry(radius, 2),
      makeBodyMaterial({
        map: syntheticMap,
        color: 0xffffff,
        emissive: tint,
        opacity: Math.min(0.86, opacity + 0.10),
        metalness: 0.34,
      })
    );
    group.add(core);
    const ringCount = kind === "signal_body" ? 2 : 1;
    for (let i = 0; i < ringCount; i += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * (1.24 + i * 0.38), radius * 0.018, 8, 84),
        new THREE.MeshBasicMaterial({
          map: proceduralBodyTextures.synthetic[(index + i) % proceduralBodyTextures.synthetic.length],
          color: tint,
          transparent: true,
          opacity: 0.20 + i * 0.06,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      ring.rotation.x = Math.PI * (0.34 + rand() * 0.22);
      ring.rotation.y = rand() * Math.PI;
      group.add(ring);
    }
    createOrbitingShards(group, rand, radius, 3 + Math.floor(rand() * 4), tint);
  } else if (kind === "gravity_node") {
    const node = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 1),
      makeBodyMaterial({
        map: syntheticMap,
        color: tint,
        emissive: tint,
        opacity: 0.76,
        metalness: 0.22,
      })
    );
    group.add(node);
    group.add(createSyntheticPoints(rand, radius * 1.8, tint));
    group.add(createLineCage(rand, radius * 1.9, tint));
  } else if (kind === "broken_gate") {
    for (let i = 0; i < 3; i += 1) {
      const gate = new THREE.Mesh(
        new THREE.TorusGeometry(radius * (1.15 + i * 0.12), radius * 0.045, 5, 18),
        new THREE.MeshStandardMaterial({
          map: syntheticMap,
          color: tint,
          emissive: tint,
          emissiveIntensity: 0.35,
          roughness: 0.48,
          metalness: 0.42,
          transparent: true,
          opacity: 0.30 + i * 0.08,
        })
      );
      gate.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      gate.scale.set(1, 0.26 + rand() * 0.18, 1);
      gate.position.set((rand() - 0.5) * radius * 0.34, (rand() - 0.5) * radius * 0.34, 0);
      group.add(gate);
    }
    createOrbitingShards(group, rand, radius, 5, tint);
  } else if (kind === "orbital_relic_fragment") {
    const fragment = new THREE.Mesh(
      new THREE.TetrahedronGeometry(radius, 1),
      makeBodyMaterial({
        map: syntheticMap,
        color: tint,
        emissive: tint,
        opacity: 0.70,
        metalness: 0.30,
      })
    );
    group.add(fragment);
    group.add(createLineCage(rand, radius * 1.5, tint));
  } else {
    const count = kind === "debris_cluster" ? 5 + Math.floor(rand() * 5) : 3 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i += 1) {
      const shardRadius = radius * (0.35 + rand() * 0.65);
      const shard = new THREE.Mesh(
        i % 2 ? new THREE.TetrahedronGeometry(shardRadius, 0) : createIntegratedAsteroidGeometry(shardRadius),
        makeBodyMaterial({
          map: i % 3 === 0 ? syntheticMap : naturalMap,
          color: i % 3 === 0 ? tint : 0xffffff,
          emissive: i % 3 === 0 ? tint : 0x071426,
          opacity: kind === "foreground_shards" ? 0.58 : 0.42,
          metalness: i % 3 === 0 ? 0.22 : 0.08,
        })
      );
      shard.position.set((rand() - 0.5) * radius * 4.2, (rand() - 0.5) * radius * 3.2, (rand() - 0.5) * radius);
      shard.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      group.add(shard);
    }
  }

  group.traverse((child) => {
    if (child.material) child.userData.baseOpacity = child.material.opacity ?? opacity;
  });
  proceduralWorld.group.add(group);
  return group;
}

function spawnChunkObjects(chunkX, chunkY) {
  const key = getChunkKey(chunkX, chunkY);
  if (proceduralWorld.chunks.has(key)) return proceduralWorld.chunks.get(key);
  const rand = seededRandom(chunkX, chunkY, state.stageIndex);
  const chunk = { key, x: chunkX, y: chunkY, group: new THREE.Group(), objects: [] };
  const bodyKinds = [
    "planet_far",
    "planet_mid",
    "moon",
    "synthetic_core",
    "signal_body",
    "orbital_relic_fragment",
    "broken_gate",
    "tech_moon",
    "gravity_node",
    "debris_cluster",
    "foreground_shards",
  ];
  const planetCount = 1 + (rand() > 0.56 ? 1 : 0);
  const syntheticCount = 2 + Math.floor(rand() * 4);
  const debrisCount = 6 + Math.floor(rand() * 6);
  const selections = [];
  for (let i = 0; i < planetCount; i += 1) selections.push(bodyKinds[Math.floor(rand() * 3)]);
  for (let i = 0; i < syntheticCount; i += 1) selections.push(bodyKinds[3 + Math.floor(rand() * 6)]);
  for (let i = 0; i < debrisCount; i += 1) selections.push(bodyKinds[9 + Math.floor(rand() * 2)]);

  selections.forEach((kind, index) => {
    const body = createProceduralBody(kind, chunkX, chunkY, rand, index);
    body.userData.chunkKey = key;
    chunk.objects.push(body);
    proceduralWorld.objects.push(body);
  });

  proceduralWorld.chunks.set(key, chunk);
  return chunk;
}

function releaseFarChunks(centerX, centerY) {
  for (const [key, chunk] of proceduralWorld.chunks) {
    if (
      Math.abs(chunk.x - centerX) <= proceduralWorld.releaseRadius &&
      Math.abs(chunk.y - centerY) <= proceduralWorld.releaseRadius
    ) {
      continue;
    }
    for (const object of chunk.objects) {
      proceduralWorld.group.remove(object);
      object.traverse((child) => {
        child.geometry?.dispose?.();
        child.material?.dispose?.();
      });
      const index = proceduralWorld.objects.indexOf(object);
      if (index >= 0) proceduralWorld.objects.splice(index, 1);
    }
    proceduralWorld.chunks.delete(key);
  }
}

function ensureChunksAroundPlayer() {
  const center = currentChunkCoords();
  for (let y = center.y - proceduralWorld.visibleRadius; y <= center.y + proceduralWorld.visibleRadius; y += 1) {
    for (let x = center.x - proceduralWorld.visibleRadius; x <= center.x + proceduralWorld.visibleRadius; x += 1) {
      spawnChunkObjects(x, y);
    }
  }
  releaseFarChunks(center.x, center.y);
}

function wrapWorldObject(object) {
  const base = object.userData.base;
  const parallax = object.userData.parallax;
  const span = proceduralWorld.chunkSize * (proceduralWorld.releaseRadius * 2 + 1);
  return {
    x: wrapWorldDelta(base.x - state.worldOffset.x * (1 - parallax * 0.42), span) * proceduralWorld.displayScale,
    y: wrapWorldDelta(base.y - state.worldOffset.y * (1 - parallax * 0.32), span) * proceduralWorld.displayScale,
  };
}

function updateChunkObjects(delta, elapsed, travelVelocity) {
  ensureChunksAroundPlayer();
  proceduralWorld.audioCooldown = Math.max(0, proceduralWorld.audioCooldown - delta);
  let nearestSynthetic = Infinity;
  for (const object of proceduralWorld.objects) {
    const wrapped = wrapWorldObject(object);
    const phase = elapsed * object.userData.orbitSpeed + object.userData.phase;
    const drift = object.userData.drift;
    object.position.x =
      wrapped.x +
      Math.cos(phase) * object.userData.orbitRadius.x -
      travelVelocity.x * object.userData.parallax * 0.40 +
      drift.x * elapsed;
    object.position.y =
      wrapped.y +
      Math.sin(phase * 0.83) * object.userData.orbitRadius.y -
      travelVelocity.y * object.userData.parallax * 0.22 +
      drift.y * elapsed;
    object.position.z = object.userData.base.z + Math.sin(phase * 0.52) * 0.34;
    object.rotation.x += delta * object.userData.spin * 0.65;
    object.rotation.y += delta * object.userData.spin;
    object.rotation.z += delta * object.userData.spin * 0.42;

    const finalBoost = mission01.finalStarted ? 0.22 : 0;
    const stageAffinity = object.userData.stageAffinity;
    const stageBlend = stageAffinity === 3 || stageAffinity === state.stageIndex ? 1 : 0.62;
    const pulse = 0.88 + Math.sin(elapsed * (object.userData.kind === "gravity_node" ? 2.6 : 1.2) + object.userData.phase) * 0.12;
    object.traverse((child) => {
      if (!child.material || child.userData.baseOpacity === undefined) return;
      child.material.opacity = THREE.MathUtils.clamp(child.userData.baseOpacity * stageBlend * pulse + finalBoost, 0, 0.92);
    });

    const isSynthetic =
      object.userData.kind === "synthetic_core" ||
      object.userData.kind === "signal_body" ||
      object.userData.kind === "gravity_node" ||
      object.userData.kind === "broken_gate" ||
      object.userData.kind === "orbital_relic_fragment";
    if (isSynthetic) nearestSynthetic = Math.min(nearestSynthetic, Math.hypot(object.position.x, object.position.y));
  }
  if (nearestSynthetic < 1.75 && proceduralWorld.audioCooldown <= 0) {
    playAudioEvent(nearestSynthetic < 0.92 ? "gravity_node_pulse" : "synthetic_body_near_hum");
    proceduralWorld.audioCooldown = nearestSynthetic < 0.92 ? 1.4 : 3.2;
  }
}

const missionZones = {
  group: new THREE.Group(),
  zones: [],
  lastEntered: null,
};
backgroundScene.add(missionZones.group);

const missionZoneSpecs = [
  { label: "STAGE 1 ZONE", subtitle: "RUMBO NORTE", x: 0, y: WORLD_MIN_Y + 10, color: 0x62edff },
  { label: "STAGE 2 ZONE", subtitle: "RUMBO ESTE", x: 92, y: WORLD_MIN_Y + 78, color: 0xa36dff },
  { label: "STAGE 3 ZONE", subtitle: "RUMBO OESTE", x: -96, y: WORLD_MIN_Y + 146, color: 0xff5de1 },
  { label: "FINAL ZONE", subtitle: "RUMBO FINAL", x: 0, y: WORLD_MIN_Y + 214, color: 0xffffff },
];

function createMissionZone(index, spec) {
  const group = new THREE.Group();
  group.userData = {
    kind: "mission_zone",
    index,
    label: spec.label,
    subtitle: spec.subtitle,
    base: new THREE.Vector3(spec.x, spec.y, -3.4),
    parallax: 0.10,
    phase: index * 1.37,
    baseOpacity: 0.42,
  };

  const color = new THREE.Color(spec.color);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 32, 18),
    new THREE.MeshStandardMaterial({
      map: index === 3 ? missionFxTextures.relicCore : proceduralBodyTextures.synthetic[index % proceduralBodyTextures.synthetic.length],
      color,
      emissive: color,
      emissiveIntensity: 0.42,
      roughness: 0.42,
      metalness: 0.18,
      transparent: true,
      opacity: 0.56,
    })
  );
  core.userData.baseOpacity = 0.56;
  group.add(core);

  const gate = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.018, 8, 96),
    new THREE.MeshBasicMaterial({
      map: missionFxTextures.relicRingA,
      color,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  gate.rotation.x = Math.PI * 0.48;
  gate.userData.baseOpacity = 0.36;
  group.add(gate);

  const cage = createLineCage(() => 0.42, 0.82, color);
  cage.userData.baseOpacity = 0.30;
  group.add(cage);

  missionZones.group.add(group);
  missionZones.zones.push(group);
  return group;
}

missionZoneSpecs.forEach((spec, index) => createMissionZone(index, spec));

function updateMissionZones(delta, elapsed) {
  const activeIndex = mission01.gems >= 3 ? 3 : mission01.gems;
  for (const zone of missionZones.zones) {
    const index = zone.userData.index;
    const unlocked = index <= activeIndex;
    const completed = index < mission01.gems;
    const relative = wrapWorldDelta(zone.userData.base.x - state.worldOffset.x, proceduralWorld.chunkSize * 6);
    const relativeY = wrapWorldDelta(zone.userData.base.y - state.worldOffset.y, proceduralWorld.chunkSize * 6);
    zone.position.set(relative * proceduralWorld.displayScale, relativeY * proceduralWorld.displayScale, zone.userData.base.z);
    zone.visible = unlocked || completed;
    zone.rotation.y += delta * (0.14 + index * 0.03);
    zone.rotation.z += delta * (completed ? 0.05 : 0.18);
    const distance = Math.hypot(zone.position.x, zone.position.y);
    const zonePulse = completed ? 0.48 : index === activeIndex ? 1 : 0.62;
    const pulse = zonePulse * (0.78 + Math.sin(elapsed * 2.0 + zone.userData.phase) * 0.18);
    zone.traverse((child) => {
      if (!child.material || child.userData.baseOpacity === undefined) return;
      child.material.opacity = child.userData.baseOpacity * pulse;
    });
    if (index === activeIndex && distance < 1.55 && missionZones.lastEntered !== index) {
      missionZones.lastEntered = index;
      playAudioEvent("mission_zone_enter");
      playAudioEvent("route_detected_ping");
      if (mission01.started && !mission01.finalComplete) {
        const subtitle = index === 3 ? "RUMBO FINAL / ZONA FINAL" : currentMissionConfig().subtitle;
        const status = index === 3 ? "FINAL ZONE" : `SECTOR ${index + 1}`;
        updateMissionHud(status, index === 3 ? "ACTIVÁ LA SEÑAL FINAL" : missionObjectiveCopy(currentMissionConfig()), subtitle);
      }
    }
    if (distance >= 2.1 && missionZones.lastEntered === index) missionZones.lastEntered = null;
  }
}

function wrapOrbitalObject(object, cameraWorld = state.worldOffset) {
  const base = object.userData.base;
  const parallax = object.userData.parallax;
  return {
    x: wrapWorldDelta(base.x - cameraWorld.x * (0.62 + parallax * 0.55), object.userData.wrapX),
    y: wrapWorldDelta(base.y - cameraWorld.y * (0.76 + parallax * 0.34), object.userData.wrapY),
  };
}

function setOrbitalOpacity(object, opacity) {
  if (object.material) {
    object.material.transparent = true;
    object.material.opacity = opacity;
  }
}

function updateOrbitalObjects(delta, elapsed, travelVelocity) {
  const cameraWorld = state.worldOffset;
  const speed = travelVelocity.length();
  for (const object of orbitalWorld.objects) {
    const wrapped = wrapOrbitalObject(object, cameraWorld);
    const parallax = object.userData.parallax;
    const phase = elapsed * (0.18 + parallax) + object.userData.phase;
    const drift = object.userData.drift;
    object.position.x = wrapped.x + Math.cos(phase) * parallax * 0.82 - travelVelocity.x * parallax * 0.42;
    object.position.y = wrapped.y + Math.sin(phase * 0.74) * parallax * 0.54 + drift.y * elapsed;
    object.position.z = object.userData.base.z + Math.sin(phase * 0.42) * 0.18;
    object.rotation.x += delta * object.userData.spin * 0.72;
    object.rotation.y += delta * object.userData.spin;
    object.rotation.z += delta * object.userData.spin * 0.42;

    const stageWeight = object.userData.stageWeights[state.stageIndex] ?? 1;
    const foregroundLift = object.userData.layer === "foreground" ? Math.max(0, speed - 0.12) * 0.18 : 0;
    const shimmer = 0.86 + Math.sin(elapsed * 1.7 + object.userData.phase) * 0.14;
    setOrbitalOpacity(object, object.userData.baseOpacity * stageWeight * shimmer + foregroundLift);
    object.visible = stageWeight > 0.08;
  }
}

[
  [-7.4, -0.8, -5.2, 0.28, -12.0, "medium"],
  [6.9, 0.4, -5.9, 0.22, -6.4, "small"],
  [-13.2, -0.1, -6.8, 0.42, 0.8, "large"],
  [13.4, 0.5, -7.0, 0.20, 7.6, "small"],
  [-4.6, -0.4, -4.4, 0.24, 13.8, "small"],
  [7.0, 0.6, -7.4, 0.32, 20.6, "medium"],
  [-10.4, 0.1, -5.2, 0.36, 25.2, "medium"],
  [11.5, -0.2, -7.2, 0.25, 31.4, "small"],
  [-2.2, 0.7, -4.8, 0.50, 38.2, "large"],
  [14.2, -0.6, -6.5, 0.26, 44.0, "small"],
  [-14.8, 0.4, -7.8, 0.30, 50.4, "medium"],
  [4.8, -0.1, -4.9, 0.42, 56.0, "large"],
  [-8.0, -0.3, -6.9, 0.22, 62.5, "small"],
  [12.7, 0.2, -6.2, 0.33, 70.2, "medium"],
  [-12.4, 0.8, -5.7, 0.24, 78.6, "small"],
  [6.1, -0.5, -4.6, 0.40, 87.0, "large"],
].forEach(([x, y, z, radius, routeY, size], index) =>
  createIntegratedAsteroid({
    position: new THREE.Vector3(x, y, z),
    radius,
    routeY,
    size,
    map: asteroidTextureCycle[index % asteroidTextureCycle.length],
    normalMap: index % 3 === 0 ? worldTextures.craterNormal : null,
  })
);
createIntegratedAsteroid({
  position: new THREE.Vector3(1.9, 0, -1.7),
  radius: 0.62,
  routeY: 41.5,
  objective: true,
  size: "large",
  map: worldTextures.asteroidPlates,
  normalMap: worldTextures.craterNormal,
});

createPlanetLayer();
createDebrisField();
createCrystalCluster();
spawnStageTargets(initialStageIndex);

for (let i = 0; i < 420; i += 1) {
  const star = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: starTexture,
      transparent: true,
      opacity: 0.05 + random() * 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const z = -6 - random() * 32;
  const size = 0.016 + random() * 0.046;
  star.position.set((random() - 0.5) * 28, (random() - 0.5) * 18, z);
  star.scale.set(size, size, 1);
  star.userData = {
    base: star.position.clone(),
    depth: (Math.abs(z) - 6) / 32,
    phase: random() * Math.PI * 2,
  };
  integratedBackground.stars.add(star);
}

const integratedStreakMaterial = new THREE.LineBasicMaterial({
  color: 0x4bdcff,
  transparent: true,
  opacity: 0.018,
  blending: THREE.AdditiveBlending,
});
for (let i = 0; i < 26; i += 1) {
  const geometry = new THREE.BufferGeometry();
  const length = 0.46 + random() * 0.96;
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, -length, 0, 0, length, 0], 3));
  const line = new THREE.Line(geometry, integratedStreakMaterial.clone());
  line.position.set((random() - 0.5) * 13, (random() - 0.5) * 9, -2 - random() * 12);
  line.rotation.z = (random() - 0.5) * 0.18;
  line.userData = {
    base: line.position.clone(),
    depth: random(),
    phase: random(),
  };
  integratedBackground.streaks.add(line);
}

for (let i = 0; i < 140; i += 1) {
  const star = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: starTexture,
      transparent: true,
      opacity: 0.08 + random() * 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const size = 0.004 + random() * 0.018;
  star.scale.set(size, size, 1);
  star.userData = {
    x: (random() - 0.5) * 4.8,
    y: (random() - 0.5) * 2.25,
    depth: 0.25 + random() * 0.75,
  };
  star.renderOrder = 2;
  stars.add(star);
}

for (let i = 0; i < 10; i += 1) {
  const line = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: streakTexture,
      transparent: true,
      opacity: 0.04 + random() * 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  line.material.rotation = -1.48 + (random() - 0.5) * 0.10;
  line.userData = {
    x: (random() - 0.5) * 3.6,
    y: (random() - 0.5) * 1.95,
    size: 0.25 + random() * 0.24,
  };
  line.renderOrder = 3;
  speedLines.add(line);
}

const planetTexture = makePlanetTexture();
const planetMaterial = new THREE.MeshStandardMaterial({
  map: planetTexture,
  color: 0x9fc8ff,
  emissive: 0x142765,
  emissiveIntensity: 0.34,
  roughness: 0.72,
  metalness: 0.02,
  transparent: true,
  opacity: 0.74,
});

const mainPlanet = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), planetMaterial);
mainPlanet.renderOrder = 4;
mainPlanet.scale.set(0.38, 0.38, 0.38);
mainPlanet.position.set(0.62, 0.44, -1.5);
mainPlanet.userData = {
  base: mainPlanet.position.clone(),
  parallax: 0.055,
  spin: 0.035,
};
deepSpace.add(mainPlanet);

const planetRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.95, 0.018, 8, 96),
  new THREE.MeshBasicMaterial({
    color: 0x54d7ff,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
planetRing.renderOrder = 5;
planetRing.scale.set(0.66, 0.15, 1);
planetRing.position.copy(mainPlanet.position);
planetRing.userData = {
  base: planetRing.position.clone(),
  parallax: 0.055,
  spin: -0.018,
};
deepSpace.add(planetRing);

const asteroidGeometry = new THREE.IcosahedronGeometry(1, 1);
for (let i = 0; i < 7; i += 1) {
  const asteroid = new THREE.Mesh(
    asteroidGeometry,
    new THREE.MeshStandardMaterial({
      color: i % 2 ? 0x38445c : 0x293042,
      emissive: i % 3 === 0 ? 0x24134c : 0x071426,
      emissiveIntensity: 0.22,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
      transparent: true,
      opacity: 0.55 + random() * 0.22,
    })
  );
  const depth = 0.12 + random() * 0.28;
  const scale = 0.026 + random() * 0.07;
  asteroid.scale.set(scale * (0.82 + random() * 0.7), scale, scale * (0.8 + random() * 0.55));
  asteroid.position.set((random() - 0.5) * 4.4, (random() - 0.5) * 2.1, -0.4 - random());
  asteroid.renderOrder = 6;
  asteroid.userData = {
    base: asteroid.position.clone(),
    parallax: depth,
    spin: 0.18 + random() * 0.24,
    drift: new THREE.Vector2((random() - 0.5) * 0.018, -0.018 - random() * 0.018),
  };
  spaceObjects.add(asteroid);
}

for (let i = 0; i < 4; i += 1) {
  const comet = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: streakTexture,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  comet.renderOrder = 7;
  comet.material.rotation = -0.54 + random() * 0.22;
  comet.userData = {
    base: new THREE.Vector2((random() - 0.5) * 4.2, (random() - 0.5) * 2.3),
    size: 0.36 + random() * 0.38,
    parallax: 0.28 + random() * 0.18,
    speed: 0.10 + random() * 0.09,
    phase: random(),
  };
  comet.scale.set(comet.userData.size, comet.userData.size * 0.16, 1);
  spaceObjects.add(comet);
}

const animatedSpaceSprites = [];

function addAnimatedSpace(key, group, options) {
  const animation = spaceAnimatedAssets[key];
  if (!animation) return null;

  const sprite = makeSprite(animation.frames[0], {
    opacity: options.opacity ?? 0.82,
    blending: options.blending ?? THREE.NormalBlending,
    renderOrder: options.renderOrder ?? 7,
  });
  sprite.userData = {
    animation,
    frameWidth: options.width,
    framePhase: options.phase ?? random(),
    frameSequence: options.sequence ?? [0, 1, 2, 1],
    base: new THREE.Vector3(options.x, options.y, options.z ?? -0.8),
    parallax: options.parallax ?? 0.16,
    spin: options.spin ?? 0.02,
    drift: options.drift ?? new THREE.Vector2(0, 0),
    speed: options.speed ?? 0,
  };
  sprite.position.copy(sprite.userData.base);
  sprite.material.rotation = options.rotation ?? 0;
  scaleSprite(sprite, options.width);
  group.add(sprite);
  animatedSpaceSprites.push(sprite);
  return sprite;
}

deepSpace.clear();
spaceObjects.clear();

addAnimatedSpace("planet_ocean", deepSpace, {
  x: 0.92,
  y: 0.50,
  z: -1.4,
  width: 0.48,
  parallax: 0.050,
  opacity: 0.78,
  spin: 0.010,
  renderOrder: 4,
});
addAnimatedSpace("planet_dark", deepSpace, {
  x: -1.12,
  y: -0.78,
  z: -1.5,
  width: 0.38,
  parallax: 0.045,
  opacity: 0.56,
  spin: -0.012,
  renderOrder: 4,
});
addAnimatedSpace("planet_tech", deepSpace, {
  x: -1.32,
  y: 0.68,
  z: -1.5,
  width: 0.22,
  parallax: 0.040,
  opacity: 0.48,
  spin: 0.014,
  renderOrder: 4,
});

[
  ["asteroid_core", -0.78, 0.32, 0.13, 0.16, 0.72],
  ["asteroid_hollow", 1.24, 0.08, 0.11, 0.19, 0.64],
  ["asteroid_ring", -1.18, -0.34, 0.12, 0.21, 0.62],
  ["asteroid_blue", 1.34, -0.52, 0.10, 0.24, 0.58],
  ["asteroid_magenta", -0.28, -0.84, 0.09, 0.18, 0.62],
].forEach(([key, x, y, width, parallax, opacity], index) => {
  addAnimatedSpace(key, spaceObjects, {
    x,
    y,
    width,
    parallax,
    opacity,
    spin: 0.08 + index * 0.012,
    drift: new THREE.Vector2((index % 2 ? -1 : 1) * 0.012, -0.012 - index * 0.003),
    renderOrder: 6,
  });
});

addAnimatedSpace("meteor_neon", spaceObjects, {
  x: -1.4,
  y: 0.90,
  width: 0.34,
  parallax: 0.34,
  opacity: 0.58,
  speed: 0.115,
  rotation: -0.20,
  renderOrder: 8,
});
addAnimatedSpace("meteor_neon", spaceObjects, {
  x: 0.44,
  y: -0.92,
  width: 0.28,
  parallax: 0.30,
  opacity: 0.40,
  speed: 0.085,
  phase: 0.42,
  rotation: -0.20,
  renderOrder: 8,
});

const shipGroup = new THREE.Group();
scene.add(shipGroup);

const currentStage = () => STAGES[state.stageIndex];
const currentAsset = () => stageAssets[currentStage()][state.direction];

const shipSprite = makeSprite(currentAsset(), { renderOrder: 20 });
shipGroup.add(shipSprite);

const auraTexture = makeAuraTexture();
const shipAura = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: auraTexture,
    transparent: true,
    opacity: 0.26,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
shipAura.renderOrder = 18;
shipGroup.add(shipAura);

const velocityWake = makeSprite(fxFrames.speed[1], {
  opacity: 0,
  blending: THREE.AdditiveBlending,
  renderOrder: 17,
});
velocityWake.visible = false;
shipGroup.add(velocityWake);

const motionParticles = new THREE.Group();
shipGroup.add(motionParticles);
for (let i = 0; i < 18; i += 1) {
  const particle = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: starTexture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  particle.renderOrder = 19;
  particle.userData.phase = random() * Math.PI * 2;
  particle.userData.radius = 0.08 + random() * 0.28;
  particle.userData.depth = 0.5 + random() * 0.5;
  motionParticles.add(particle);
}

const astronautGroup = new THREE.Group();
scene.add(astronautGroup);

const astronautInitialAsset =
  astronautViews.front_right || astronautAnimations.idle_hover?.frames[0]?.right || astronautAsset;
const astronautState = {
  position: new THREE.Vector2(-0.42, 0.12),
  anchor: new THREE.Vector2(-0.52, 0.20),
  velocity: new THREE.Vector2(),
  facing: "right",
  viewName: "front_right",
  animation: "idle_hover",
  actionName: "wave",
  actionIndex: 0,
  animationTime: 0,
  actionTime: 0,
  returnPulse: 0,
};

const astronautHalo = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: auraTexture,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
astronautHalo.renderOrder = 18;
astronautGroup.add(astronautHalo);

const astronautSprite = astronautInitialAsset
  ? makeSprite(astronautInitialAsset, {
      opacity: 0.94,
      renderOrder: 22,
    })
  : null;
if (astronautSprite) astronautGroup.add(astronautSprite);

const interactionFx = new THREE.Group();
scene.add(interactionFx);
const activeShots = [];
const activeImpacts = [];
const targetScreenPoint = new THREE.Vector2();
const targetWorldPoint = new THREE.Vector3();
const tetherPointCount = 10;
const tetherGeometry = new THREE.BufferGeometry().setFromPoints(
  Array.from({ length: tetherPointCount }, () => new THREE.Vector3())
);
const tetherLine = new THREE.Line(
  tetherGeometry,
  new THREE.LineBasicMaterial({
    color: 0x8eeeff,
    transparent: true,
    opacity: 0.30,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
tetherLine.renderOrder = 16;
scene.add(tetherLine);

const portalSprite = makeSprite(fxFrames.burst[0], {
  opacity: 0,
  blending: THREE.AdditiveBlending,
  renderOrder: 25,
});
portalSprite.visible = false;
shipGroup.add(portalSprite);

const ringSprite = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: makeCircleTexture(),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
ringSprite.visible = false;
ringSprite.renderOrder = 24;
shipGroup.add(ringSprite);

const transitionStreak = makeSprite(fxFrames.speed[2], {
  opacity: 0,
  blending: THREE.AdditiveBlending,
  renderOrder: 23,
});
transitionStreak.visible = false;
transitionStreak.material.rotation = -0.35;
shipGroup.add(transitionStreak);

const relicGroup = new THREE.Group();
relicGroup.visible = false;
relicGroup.renderOrder = 34;
scene.add(relicGroup);
mission01.relicGroup = relicGroup;

function makeMissionSprite(texture, { opacity = 1, renderOrder = 34, blending = THREE.AdditiveBlending } = {}) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity,
      blending,
      depthWrite: false,
      depthTest: false,
    })
  );
  sprite.renderOrder = renderOrder;
  return sprite;
}

const relicGlow = makeMissionSprite(missionFxTextures.relicGlow, { opacity: 0.0, renderOrder: 33 });
const relicRingA = makeMissionSprite(missionFxTextures.relicRingA, { opacity: 0.0, renderOrder: 34 });
const relicRingB = makeMissionSprite(missionFxTextures.relicRingB, { opacity: 0.0, renderOrder: 35 });
const relicCore = makeMissionSprite(missionFxTextures.relicCore, {
  opacity: 0.0,
  renderOrder: 36,
  blending: THREE.NormalBlending,
});
const relicScanlines = makeMissionSprite(missionFxTextures.relicScanlines, { opacity: 0.0, renderOrder: 37 });
relicGroup.add(relicGlow, relicRingA, relicRingB, relicCore, relicScanlines);

const unlockFlash = makeMissionSprite(missionFxTextures.stageUnlockFlash, { opacity: 0.0, renderOrder: 42 });
unlockFlash.visible = false;
scene.add(unlockFlash);

const energyBeam = makeMissionSprite(missionFxTextures.energyBeam, { opacity: 0.0, renderOrder: 41 });
energyBeam.visible = false;
scene.add(energyBeam);

const finalFxGroup = new THREE.Group();
finalFxGroup.visible = false;
finalFxGroup.renderOrder = 58;
scene.add(finalFxGroup);

const finalCore = makeMissionSprite(missionFxTextures.relicCore, {
  opacity: 0,
  renderOrder: 56,
  blending: THREE.NormalBlending,
});
finalFxGroup.add(finalCore);

const finalShockwave = makeMissionSprite(missionFxTextures.stageUnlockShockwave, { opacity: 0, renderOrder: 57 });
finalFxGroup.add(finalShockwave);

const finalFlash = makeMissionSprite(missionFxTextures.stageUnlockFlash, { opacity: 0, renderOrder: 58 });
finalFxGroup.add(finalFlash);

const finalBeamSprites = Array.from({ length: 4 }, () => {
  const sprite = makeMissionSprite(missionFxTextures.energyBeam, { opacity: 0, renderOrder: 57 });
  sprite.userData.thickness = 0.055;
  finalFxGroup.add(sprite);
  return sprite;
});

const finalParticleCount = 80;
const finalParticleGeometry = new THREE.BufferGeometry();
finalParticleGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(new Array(finalParticleCount * 3).fill(0), 3)
);
const finalParticles = new THREE.Points(
  finalParticleGeometry,
  new THREE.PointsMaterial({
    map: starTexture,
    color: 0x9ff4ff,
    size: 0.024,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  })
);
finalParticles.renderOrder = 57;
finalFxGroup.add(finalParticles);

const aimReticle = makeMissionSprite(missionFxTextures.targetLockReticle, { opacity: 0.0, renderOrder: 47 });
aimReticle.visible = false;
scene.add(aimReticle);

const aimClickPulse = makeMissionSprite(missionFxTextures.clickPulse, { opacity: 0.0, renderOrder: 46 });
aimClickPulse.visible = false;
scene.add(aimClickPulse);

const aimVignette = makeMissionSprite(missionFxTextures.slowMotionVignette, { opacity: 0.0, renderOrder: 44 });
aimVignette.visible = false;
scene.add(aimVignette);

const aimField = makeMissionSprite(missionFxTextures.timeDilationField, { opacity: 0.0, renderOrder: 45 });
aimField.visible = false;
scene.add(aimField);

const aimRotationStreaks = makeMissionSprite(missionFxTextures.zeroGRotationStreaks, { opacity: 0.0, renderOrder: 46 });
aimRotationStreaks.visible = false;
scene.add(aimRotationStreaks);

const aimGuideLine = makeMissionSprite(missionFxTextures.aimAssistLine, { opacity: 0.0, renderOrder: 46 });
aimGuideLine.visible = false;
aimGuideLine.userData.thickness = 0.026;
scene.add(aimGuideLine);

const fireReleaseFlash = makeMissionSprite(missionFxTextures.fireReleaseFlash, { opacity: 0.0, renderOrder: 48 });
fireReleaseFlash.visible = false;
scene.add(fireReleaseFlash);

const robotGroup = new THREE.Group();
robotGroup.renderOrder = 52;
scene.add(robotGroup);

const robotShadow = makeMissionSprite(robotFxTextures.shadow, {
  opacity: 0.34,
  renderOrder: 50,
  blending: THREE.NormalBlending,
});
robotShadow.position.set(0.012, -0.065, -0.01);
robotShadow.visible = false;
robotGroup.add(robotShadow);

const robotGlow = makeMissionSprite(robotFxTextures.glowCyan, { opacity: 0.34, renderOrder: 51 });
robotGroup.add(robotGlow);

const robotSprite = makeMissionSprite(robotFxTextures.idle, {
  opacity: 0.96,
  renderOrder: 52,
  blending: THREE.NormalBlending,
});
robotGroup.add(robotSprite);

const robotOrbitRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.104, 0.003, 8, 96),
  new THREE.MeshBasicMaterial({
    color: 0x65ecff,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  })
);
robotOrbitRing.renderOrder = 51;
robotOrbitRing.rotation.x = Math.PI * 0.46;
robotOrbitRing.visible = false;
robotGroup.add(robotOrbitRing);

const robotParticleBases = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * Math.PI * 2;
  const radius = 0.090 + random() * 0.044;
  return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.004);
});
const robotParticleGeometry = new THREE.BufferGeometry();
robotParticleGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(robotParticleBases.flatMap((point) => [point.x, point.y, point.z]), 3)
);
const robotParticles = new THREE.Points(
  robotParticleGeometry,
  new THREE.PointsMaterial({
    map: starTexture,
    color: 0x7eeaff,
    size: 0.018,
    transparent: true,
    opacity: 0.40,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  })
);
robotParticles.renderOrder = 51;
robotParticles.visible = false;
robotGroup.add(robotParticles);

function setSpriteAsset(sprite, asset) {
  sprite.material.map = asset.texture;
  sprite.userData.aspect = asset.aspect;
  sprite.material.needsUpdate = true;
}

function scaleSprite(sprite, width) {
  sprite.scale.set(width, width / sprite.userData.aspect, 1);
}

function positionHudSprites() {
  const fullscreenWidth = viewport.aspect * 2.08;
  aimVignette.position.set(0, 0, 0.18);
  aimVignette.scale.set(fullscreenWidth, 2.08, 1);
  aimField.position.set(0, 0, 0.19);
  aimField.scale.set(Math.min(1.46, viewport.aspect * 1.04), Math.min(1.46, viewport.aspect * 1.04), 1);
  const robotSize = viewport.aspect < 0.75 ? 0.18 : 0.16;
  robotGroup.position.set(viewport.aspect - robotSize * 0.90 - 0.055, 0.77, 0.22);
  robotSprite.scale.set(robotSize, robotSize, 1);
  robotGlow.scale.set(robotSize * 1.12, robotSize * 1.12, 1);
  robotShadow.scale.set(robotSize * 1.18, robotSize * 0.62, 1);
  robotOrbitRing.visible = false;
  robotParticles.visible = false;
}

function updateRobotPanel() {
  if (!robotPanel || !robotStateLabel || !robotMessage || !robotSmallCounter || !robotLargeCounter || !robotRelicCounter) {
    return;
  }
  robotPanel.hidden = !robotCompanion.panelOpen;
  robotStateLabel.textContent = `COMPANION / ${robotCompanion.state.toUpperCase()}`;
  robotMessage.textContent = robotCompanion.message;
  robotSmallCounter.textContent = `${robotCompanion.smallCurrent}/${mission01.smallRequired}`;
  robotLargeCounter.textContent = `${robotCompanion.largeCurrent}/${mission01.largeRequired}`;
  robotRelicCounter.textContent = `${robotCompanion.relicCurrent}/1`;
}

function setRobotCompanionState(stateName, message) {
  const nextState = robotFxTextures[stateName] ? stateName : "idle";
  const changed = robotCompanion.state !== nextState;
  robotCompanion.state = nextState;
  robotCompanion.message = message || robotCompanion.message;
  robotCompanion.pulse = changed ? 1 : Math.max(robotCompanion.pulse, 0.28);
  robotSprite.material.map = robotFxTextures[nextState];
  robotGlow.material.map = nextState === "alert" ? robotFxTextures.glowMagenta : robotFxTextures.glowCyan;
  robotSprite.material.needsUpdate = true;
  robotGlow.material.needsUpdate = true;
  if (changed && nextState === "alert") playMissionAudio("robot_alert_ping");
  if (changed && nextState === "stage_clear") playMissionAudio("robot_stage_clear");
  updateRobotPanel();
}

function syncRobotCompanion(missionState = mission01.state) {
  robotCompanion.smallCurrent = mission01.smallDestroyed;
  robotCompanion.largeCurrent = mission01.largeDestroyed;
  robotCompanion.relicCurrent = mission01.relicTouched ? 1 : 0;

  if (!mission01.started) {
    setRobotCompanionState("idle", "RUMBO EN ESPERA");
    return;
  }

  if (missionState === "small_asteroids") {
    const remaining = Math.max(0, mission01.smallRequired - mission01.smallDestroyed);
    setRobotCompanionState("ready", `${currentMissionConfig().routeHint}. FALTAN ${remaining} FRAGMENTOS`);
    return;
  }

  if (missionState === "large_obstacle") {
    const remaining = Math.max(0, mission01.largeRequired - mission01.largeDestroyed);
    setRobotCompanionState("alert", `SECTOR ACTIVO. FALTAN ${remaining} NÚCLEOS`);
    return;
  }

  if (missionState === "relic") {
    setRobotCompanionState("hint", "SEÑAL LIBERADA. ACTIVÁ LA RELIQUIA");
    return;
  }

  if (missionState === "unlocked") {
    setRobotCompanionState("stage_clear", `GEMA ${mission01.gems}/3 ADQUIRIDA`);
    return;
  }

  if (missionState === "final") {
    setRobotCompanionState("stage_clear", "RUTA ESTABILIZADA");
    return;
  }

  setRobotCompanionState("ready", "RUMBO ACTIVO");
}

function isRobotCompanionHit(point) {
  const robotPoint = new THREE.Vector2(robotGroup.position.x, robotGroup.position.y);
  return point.distanceTo(robotPoint) < (viewport.aspect < 0.75 ? 0.18 : 0.15);
}

function toggleRobotPanel() {
  robotCompanion.panelOpen = !robotCompanion.panelOpen;
  playMissionAudio(robotCompanion.panelOpen ? "robot_open_hint" : "robot_close_hint");
  robotCompanion.pulse = 1;
  updateRobotPanel();
}

function updateRobotCompanion(delta, elapsed) {
  robotCompanion.pulse = Math.max(0, robotCompanion.pulse - delta * 2.4);
  const bob = Math.sin(elapsed * 2.2) * 0.014;
  const pulse = robotCompanion.pulse;
  const pointerDelta = input.aimPoint.clone().sub(new THREE.Vector2(robotGroup.position.x, robotGroup.position.y));
  const pointerPull = THREE.MathUtils.clamp(1 - pointerDelta.length() / 0.48, 0, 1);
  robotSprite.position.x = pointerDelta.x * 0.018 * pointerPull;
  robotSprite.position.y = bob + pointerDelta.y * 0.014 * pointerPull;
  robotSprite.rotation.z = Math.sin(elapsed * 1.35) * 0.035 + pointerDelta.x * 0.055 * pointerPull;
  robotSprite.material.opacity = 0.92 + Math.sin(elapsed * 2.8) * 0.04;
  robotGlow.position.y = bob * 0.55;
  robotGlow.material.opacity =
    robotCompanion.state === "alert"
      ? 0.16 + Math.sin(elapsed * 7.2) * 0.04 + pulse * 0.08
      : 0.10 + Math.sin(elapsed * 3.0) * 0.025 + pulse * 0.06;
  const baseScale = viewport.aspect < 0.75 ? 0.18 : 0.16;
  robotSprite.scale.setScalar(baseScale * (1 + pulse * 0.10));
  robotOrbitRing.visible = false;
  robotParticles.visible = false;
}

function validTargetForMissionPhase(target) {
  if (!target?.userData?.missionRole || !mission01.started) return false;
  if (target.userData.active === false || target.userData.destroyed) return false;
  if (target.userData.missionRole === "small") return mission01.state === "small_asteroids";
  if (target.userData.missionRole === "large") return mission01.state === "large_obstacle";
  return false;
}

function showInvalidAim(point) {
  if (aimAssist.active) return;
  playMissionAudio("invalid_target_blip");
  spawnImpact(point, false);
}

function beginAimAssistTarget(target, clickPoint) {
  if (!validTargetForMissionPhase(target) || aimAssist.active || state.transition) {
    showInvalidAim(clickPoint);
    return;
  }

  const shooter = shooterForTarget(target);
  if (shooter === "astronaut" && astronautSprite) enterAstronautMode();
  if (shooter === "ship") enterShipMode();

  aimAssist.active = true;
  aimAssist.kind = "target";
  aimAssist.target = target;
  aimAssist.shooter = shooter;
  aimAssist.clickPoint.copy(clickPoint);
  aimAssist.firePoint.copy(backgroundObjectScreenPoint(target, new THREE.Vector2()));
  aimAssist.time = 0;
  aimAssist.fired = false;
  aimAssist.impacted = false;
  aimAssist.recoil = 0;
  aimAssist.played = { click: true };
  aimReticle.visible = true;
  aimClickPulse.visible = true;
  aimVignette.visible = true;
  aimField.visible = true;
  aimRotationStreaks.visible = true;
  aimGuideLine.visible = true;
  playMissionAudio("aim_click_ping");
}

function beginAimAssistRelic(clickPoint) {
  if (mission01.relicState !== "collectible" || aimAssist.active || state.transition) {
    showInvalidAim(clickPoint);
    return;
  }
  enterAstronautMode();
  aimAssist.active = true;
  aimAssist.kind = "relic";
  aimAssist.target = null;
  aimAssist.shooter = "astronaut";
  aimAssist.clickPoint.copy(clickPoint);
  aimAssist.firePoint.set(relicGroup.position.x, relicGroup.position.y);
  aimAssist.time = 0;
  aimAssist.fired = false;
  aimAssist.impacted = false;
  aimAssist.recoil = 0;
  aimAssist.played = { click: true };
  aimReticle.visible = true;
  aimClickPulse.visible = true;
  aimVignette.visible = true;
  aimField.visible = true;
  aimRotationStreaks.visible = true;
  aimGuideLine.visible = true;
  playMissionAudio("aim_click_ping");
}

function clearAimAssistSprites() {
  aimReticle.visible = false;
  aimClickPulse.visible = false;
  aimVignette.visible = false;
  aimField.visible = false;
  aimRotationStreaks.visible = false;
  aimGuideLine.visible = false;
  fireReleaseFlash.visible = false;
  aimAssist.active = false;
  aimAssist.target = null;
  aimAssist.recoil = 0;
}

function updateAimAssist(delta, elapsed) {
  if (!aimAssist.active) {
    astronautGroup.rotation.z = THREE.MathUtils.lerp(astronautGroup.rotation.z, 0, 0.12);
    backgroundCamera.position.z = THREE.MathUtils.lerp(backgroundCamera.position.z, 9.6, 0.08);
    return;
  }
  aimAssist.time += delta;
  const t = aimAssist.time;
  const progress = THREE.MathUtils.clamp(t / aimAssist.duration, 0, 1);
  const targetPoint =
    aimAssist.kind === "target" && aimAssist.target
      ? backgroundObjectScreenPoint(aimAssist.target, new THREE.Vector2()).clone()
      : aimAssist.firePoint.clone();
  aimAssist.firePoint.copy(targetPoint);
  const origin = aimAssist.shooter === "astronaut" ? astronautState.position : state.position;
  const aimVector = targetPoint.clone().sub(origin);
  const aimAngle = Math.atan2(aimVector.y, aimVector.x);
  const aimDirection = aimVector.lengthSq() > 0.0001 ? aimVector.clone().normalize() : new THREE.Vector2(1, 0);
  const orientationIn = THREE.MathUtils.smoothstep(t, 0.12, 0.32);
  const orientationOut = 1 - THREE.MathUtils.smoothstep(t, 0.60, 0.78);
  const orientation = orientationIn * orientationOut;
  const aimTilt = THREE.MathUtils.clamp(Math.sin(aimAngle) * 0.18 - Math.cos(aimAngle) * 0.05, -0.24, 0.24);
  const recoilOffset = aimDirection.clone().multiplyScalar(-aimAssist.recoil);
  const sideVector = new THREE.Vector2(-aimDirection.y, aimDirection.x);
  backgroundCamera.position.z = THREE.MathUtils.lerp(backgroundCamera.position.z, 9.35 - orientation * 0.26, 0.22);
  backgroundCamera.rotation.z += aimTilt * orientation * 0.020;

  if (aimAssist.shooter === "ship") {
    shipGroup.rotation.z += aimTilt * orientation * 0.42;
    shipGroup.position.x += recoilOffset.x;
    shipGroup.position.y += recoilOffset.y;
  } else {
    astronautGroup.rotation.z = THREE.MathUtils.lerp(astronautGroup.rotation.z, aimTilt * 1.45 * orientation, 0.24);
    if (astronautSprite) {
      astronautSprite.position.x += recoilOffset.x + sideVector.x * 0.012 * orientation;
      astronautSprite.position.y += recoilOffset.y + sideVector.y * 0.012 * orientation;
    }
  }
  aimAssist.recoil = Math.max(0, aimAssist.recoil - delta * 0.42);

  if (!aimAssist.played.lock && t >= 0.04) {
    aimAssist.played.lock = true;
    playAudioEvent("target_lock");
  }
  if (!aimAssist.played.slow && t >= 0.08) {
    aimAssist.played.slow = true;
    playAudioEvent("slow_motion_enter");
  }
  if (!aimAssist.played.orient && t >= 0.12) {
    aimAssist.played.orient = true;
    playAudioEvent("zero_g_orientation_spray");
    spawnOrientationSpray(origin, aimDirection, aimAssist.shooter);
  }

  aimReticle.position.set(targetPoint.x, targetPoint.y, 0.18);
  aimReticle.scale.setScalar(0.16 + Math.sin(elapsed * 9.0) * 0.015 + progress * 0.04);
  aimReticle.material.rotation = elapsed * 0.9;
  aimReticle.material.opacity = 0.82 * (1 - THREE.MathUtils.smoothstep(progress, 0.72, 1));

  aimClickPulse.position.set(aimAssist.clickPoint.x, aimAssist.clickPoint.y, 0.17);
  aimClickPulse.scale.setScalar(0.12 + progress * 0.42);
  aimClickPulse.material.opacity = Math.max(0, 0.70 * (1 - progress * 1.3));

  aimVignette.material.opacity = 0.26 * Math.sin(Math.PI * Math.min(1, progress));
  aimField.material.opacity = 0.20 * Math.sin(Math.PI * Math.min(1, progress));
  aimField.material.rotation = -elapsed * 0.16;

  aimRotationStreaks.position.set(origin.x, origin.y, 0.17);
  aimRotationStreaks.scale.setScalar(0.42 + progress * 0.18);
  aimRotationStreaks.material.rotation = aimAngle + elapsed * (aimAssist.shooter === "ship" ? -0.7 : 0.9);
  aimRotationStreaks.material.opacity = 0.30 * Math.sin(Math.PI * Math.min(1, progress));

  placeBeamSprite(aimGuideLine, origin, targetPoint);
  aimGuideLine.material.opacity = 0.25 * (1 - THREE.MathUtils.smoothstep(progress, 0.60, 0.96));

  if (!aimAssist.fired && t >= aimAssist.fireTime) {
    aimAssist.fired = true;
    fireReleaseFlash.visible = true;
    fireReleaseFlash.position.set(origin.x, origin.y, 0.19);
    fireReleaseFlash.scale.setScalar(aimAssist.shooter === "ship" ? 0.28 : 0.18);
    fireReleaseFlash.material.opacity = 0.82;
    aimAssist.recoil = aimAssist.shooter === "ship" ? 0.105 : 0.064;
    playAudioEvent("fire_release");
    playAudioEvent("micro_thruster_burst");
    playMissionAudio(aimAssist.shooter === "ship" ? "ship_heavy_fire_cue" : "astronaut_tool_fire_cue");
    spawnOrientationSpray(origin, aimDirection, aimAssist.shooter);
    if (aimAssist.kind === "target" && aimAssist.target) launchShotAtTarget(aimAssist.target, aimAssist.shooter);
    if (aimAssist.shooter === "astronaut") triggerAstronautAction();
  }

  if (fireReleaseFlash.visible) {
    fireReleaseFlash.scale.multiplyScalar(1 + delta * 2.2);
    fireReleaseFlash.material.opacity = Math.max(0, fireReleaseFlash.material.opacity - delta * 4.6);
    if (fireReleaseFlash.material.opacity <= 0.01) fireReleaseFlash.visible = false;
  }

  if (!aimAssist.impacted && t >= aimAssist.impactTime) {
    aimAssist.impacted = true;
    aimAssist.hitStop = Math.max(aimAssist.hitStop, 0.12);
    if (aimAssist.kind === "target" && aimAssist.target) damageTarget(aimAssist.target, aimAssist.shooter);
    if (aimAssist.kind === "relic") touchMissionRelic();
  }

  if (!aimAssist.played.exit && t >= 0.60) {
    aimAssist.played.exit = true;
    playAudioEvent("slow_motion_exit");
  }

  if (t >= aimAssist.duration) clearAimAssistSprites();
}

function stageWidth(stage, direction) {
  const base = {
    stage1: 0.58,
    stage2: 0.86,
    stage3: 1.12,
  }[stage];

  if (direction === "idle") return base * 0.95;
  if (direction === "left" || direction === "right") return base * 0.96;
  if (direction === "up" || direction === "down") return base * 0.68;
  return base;
}

function maxShipHeight(stage) {
  if (viewport.aspect < 0.75) {
    return {
      stage1: 0.56,
      stage2: 0.62,
      stage3: 0.70,
    }[stage];
  }
  return {
    stage1: 0.66,
    stage2: 0.74,
    stage3: 0.86,
  }[stage];
}

function resizeShip() {
  const stage = currentStage();
  const asset = currentAsset();
  const maxHeight = maxShipHeight(stage);
  const wantedWidth = stageWidth(stage, state.direction);
  const width = Math.min(wantedWidth, maxHeight * asset.aspect);
  scaleSprite(shipSprite, width);
  shipAura.scale.set(width * 1.72, width * 1.16, 1);
  scaleSprite(velocityWake, width * 1.34);
}

function astronautWidth() {
  return viewport.aspect < 0.75 ? 0.15 : 0.13;
}

function resizeAstronaut() {
  if (!astronautSprite) return;
  scaleSprite(astronautSprite, astronautWidth());
  astronautHalo.scale.set(0.23, 0.23, 1);
}

function currentAstronautAnchor() {
  astronautState.anchor.set(-Math.min(0.58, viewport.aspect * 0.34), 0.21);
  return astronautState.anchor;
}

function setDirection(direction) {
  if (!DIRECTIONS.includes(direction) || direction === state.direction) return;
  state.direction = direction;
  setSpriteAsset(shipSprite, currentAsset());
  resizeShip();
}

function resolveDirection(x, y) {
  if (Math.hypot(x, y) < 0.12) return "idle";
  const diagonal = Math.abs(x) > 0.28 && Math.abs(y) > 0.28;
  if (diagonal && y > 0 && x < 0) return "up_left";
  if (diagonal && y > 0 && x > 0) return "up_right";
  if (diagonal && y < 0 && x < 0) return "down_left";
  if (diagonal && y < 0 && x > 0) return "down_right";
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? "right" : "left";
  return y > 0 ? "up" : "down";
}

function updateStageHud() {
  if (mission01.finalComplete) {
    stageLabel.textContent = "Final";
    stageButton.textContent = "MISSION COMPLETE";
    stageButton.disabled = true;
    return;
  }
  if (mission01.finalStarted) {
    stageLabel.textContent = "Final";
    stageButton.textContent = "Señal final";
    stageButton.disabled = true;
    return;
  }
  if (!state.transition) stageButton.disabled = false;
  if (state.controlMode === "astronaut") {
    stageLabel.textContent = "Astronauta";
    stageButton.textContent = "Volver a nave";
    return;
  }

  const stage = currentStage();
  stageLabel.textContent = stageDisplayName[stage];
  const nextStage = STAGES[Math.min(state.stageIndex + 1, STAGES.length - 1)];
  stageButton.textContent =
    state.stageIndex >= STAGES.length - 1
      ? `${stageDisplayName[stage]} -> Final`
      : `${stageDisplayName[stage]} -> ${stageDisplayName[nextStage]}`;
}

function startStageTransition() {
  if (state.transition || mission01.finalStarted || mission01.finalComplete) return;
  const from = state.stageIndex;
  const to = Math.min(from + 1, STAGES.length - 1);
  if (to === from) return;
  state.transition = {
    from,
    to,
    time: 0,
    duration: 1.05,
    applied: false,
  };
  stageButton.disabled = true;
  playShipOneShot("warp");
}

function finishStageTransition() {
  state.transition = null;
  shipSprite.material.opacity = 1;
  portalSprite.visible = false;
  ringSprite.visible = false;
  transitionStreak.visible = false;
  stageButton.disabled = false;
  updateStageHud();
  startMissionForStage(state.stageIndex);
}

function applyStage(stageIndex) {
  state.stageIndex = stageIndex;
  setSpriteAsset(shipSprite, currentAsset());
  resizeShip();
}

function updateTransition(delta, elapsed) {
  const transition = state.transition;
  if (!transition) {
    portalSprite.visible = false;
    ringSprite.visible = false;
    transitionStreak.visible = false;
    shipSprite.material.opacity = state.controlMode === "astronaut" ? 0.56 : 1;
    return;
  }

  transition.time += delta;
  const t = Math.min(transition.time / transition.duration, 1);
  const burstFrame = Math.min(fxFrames.burst.length - 1, Math.floor(t * fxFrames.burst.length));
  setSpriteAsset(portalSprite, fxFrames.burst[burstFrame]);

  ringSprite.visible = t < 0.62;
  portalSprite.visible = t >= 0.34 && t <= 0.76;
  transitionStreak.visible = t > 0.70;

  if (t < 0.28) {
    shipSprite.material.opacity = 1;
    ringSprite.material.opacity = THREE.MathUtils.smoothstep(t, 0.02, 0.28) * 0.52;
    ringSprite.scale.setScalar(0.72 + t * 1.1);
    portalSprite.material.opacity = 0;
  } else if (t < 0.46) {
    const local = THREE.MathUtils.smoothstep(t, 0.28, 0.46);
    shipSprite.material.opacity = 1 - local;
    ringSprite.material.opacity = 0.50 - local * 0.18;
    ringSprite.scale.setScalar(0.98 + local * 0.62);
    portalSprite.material.opacity = local * 0.52;
    scaleSprite(portalSprite, 0.62 + local * 0.12);
  } else if (t < 0.62) {
    shipSprite.material.opacity = 0;
    ringSprite.material.opacity = 0.22;
    portalSprite.material.opacity = 0.62;
    scaleSprite(portalSprite, 0.74 + Math.sin(elapsed * 16) * 0.025);
  } else {
    if (!transition.applied) {
      applyStage(transition.to);
      transition.applied = true;
      updateStageHud();
    }
    const local = THREE.MathUtils.smoothstep(t, 0.62, 0.92);
    shipSprite.material.opacity = local;
    portalSprite.material.opacity = Math.max(0, 0.42 * (1 - local));
    transitionStreak.material.opacity = Math.max(0, 0.28 * (1 - local));
    scaleSprite(portalSprite, 0.64 - local * 0.10);
    scaleSprite(transitionStreak, 0.80);
    transitionStreak.position.set(0.12, -0.02, 0);
  }

  ringSprite.rotation.z = elapsed * 0.5;

  if (t >= 1) finishStageTransition();
}

function keyAxis(negative, positive) {
  let value = 0;
  for (const key of negative) if (input.keys.has(key)) value -= 1;
  for (const key of positive) if (input.keys.has(key)) value += 1;
  return value;
}

function wrapSprite(sprite) {
  const marginX = viewport.aspect + 0.55;
  const marginY = 1.28;
  if (sprite.position.x > marginX) sprite.position.x = -marginX;
  if (sprite.position.x < -marginX) sprite.position.x = marginX;
  if (sprite.position.y > marginY) sprite.position.y = -marginY;
  if (sprite.position.y < -marginY) sprite.position.y = marginY;
}

function wrapIntegratedObject(object, margin = 5.2) {
  const yLimit = 5.2 + margin * object.userData.parallax;
  if (object.position.y < -yLimit) object.position.y += yLimit * 2.0;
  if (object.position.y > yLimit) object.position.y -= yLimit * 2.0;
}

function wrapWorldDelta(delta, span) {
  return ((((delta + span * 0.5) % span) + span) % span) - span * 0.5;
}

function routeProgressFromWorldY(y) {
  return ((((y - WORLD_MIN_Y) / WORLD_WRAP_Y) % 1) + 1) % 1;
}

function routeViewY(routeY) {
  return routeY - state.routeProgress * routeLength;
}

function routeFade(viewY) {
  const fadeIn = THREE.MathUtils.smoothstep(viewY, -5.8, -4.2);
  const fadeOut = 1 - THREE.MathUtils.smoothstep(viewY, 4.2, 5.8);
  return THREE.MathUtils.clamp(fadeIn * fadeOut, 0, 1);
}

function setGroupOpacity(group, opacity) {
  group.traverse((child) => {
    if (!child.material || child.userData.baseOpacity === undefined) return;
    child.material.transparent = true;
    child.material.opacity = child.userData.baseOpacity * opacity;
  });
}

function updateIntegratedBackground(delta, elapsed, travelVelocity) {
  const speed = travelVelocity.length();
  const ascentEnergy = Math.max(0, state.routeVelocity);
  const cameraWorld = state.worldOffset;
  worldTextures.nebulaWide.offset.set(cameraWorld.x * 0.002 + elapsed * 0.004, cameraWorld.y * 0.0015);
  worldTextures.nebulaFlow.offset.set(cameraWorld.x * -0.0015, cameraWorld.y * 0.002 + elapsed * 0.003);

  for (const layer of nebulaLayers.children) {
    const parallax = layer.userData.parallax;
    layer.position.x = cameraWorld.x * parallax * -0.04;
    layer.position.y = cameraWorld.y * parallax * -0.05;
  }

  backgroundCamera.position.x = travelVelocity.x * 0.045;
  backgroundCamera.position.y = 0.12 + ascentEnergy * 0.12;
  backgroundCamera.lookAt(travelVelocity.x * 0.045, travelVelocity.y * 0.05 + ascentEnergy * 0.14, -5);

  for (const planet of integratedBackground.planets) {
    const base = planet.userData.base;
    const parallax = planet.userData.parallax;
    const orbitAngle = elapsed * planet.userData.orbitSpeed + planet.userData.orbitPhase;
    const orbitX = Math.cos(orbitAngle) * planet.userData.orbitRadius.x;
    const orbitY = Math.sin(orbitAngle * 0.82) * planet.userData.orbitRadius.y;
    const relativeX = wrapWorldDelta(base.x - cameraWorld.x * (0.74 + parallax * 0.30), WORLD_WRAP_X);
    const relativeY = wrapWorldDelta(base.y - cameraWorld.y * (0.84 + parallax * 0.18), WORLD_WRAP_Y);
    planet.visible = true;
    planet.position.x =
      relativeX +
      orbitX;
    planet.position.y =
      relativeY +
      orbitY;
    planet.position.z = base.z + Math.sin(orbitAngle * 0.55) * planet.userData.orbitRadius.y * 0.38;
    planet.rotation.y += delta * planet.userData.spin;
    planet.rotation.z += delta * planet.userData.spin * 0.20;
    setGroupOpacity(planet, 1);
  }

  for (const star of integratedBackground.stars.children) {
    const depth = star.userData.depth;
    const routeScroll = cameraWorld.y * (0.62 + depth * 0.92);
    star.position.x =
      star.userData.base.x -
      cameraWorld.x * 0.16 * depth +
      travelVelocity.x * 0.08 * depth;
    star.position.y =
      star.userData.base.y -
      ((routeScroll + elapsed * (0.04 + speed * 0.32) * (0.45 + depth)) % 22);
    if (star.position.y < -11) star.position.y += 22;
    star.material.opacity =
      0.026 +
      depth * 0.075 +
      ascentEnergy * 0.028 +
      Math.sin(elapsed * 1.8 + star.userData.phase) * 0.010;
  }

  for (const asteroid of integratedBackground.asteroids) {
    if (asteroid.userData.active === false && !asteroid.userData.destroyed) {
      asteroid.visible = false;
      continue;
    }
    const base = asteroid.userData.base;
    const parallax = asteroid.userData.parallax;
    const orbitAngle = elapsed * asteroid.userData.orbitSpeed + asteroid.userData.phase;
    const orbitX = Math.cos(orbitAngle) * asteroid.userData.orbitRadius.x;
    const orbitY = Math.sin(orbitAngle * 0.74) * asteroid.userData.orbitRadius.y;
    const relativeX = wrapWorldDelta(base.x - cameraWorld.x * (0.78 + parallax * 0.28), WORLD_WRAP_X);
    const relativeY = wrapWorldDelta(base.y - cameraWorld.y * (0.88 + parallax * 0.16), WORLD_WRAP_Y);
    if (asteroid.userData.destroyed) asteroid.userData.destroyTime += delta;
    asteroid.userData.hitPulse = Math.max(0, asteroid.userData.hitPulse - delta * 2.8);
    const destroyedFade = asteroid.userData.destroyed
      ? 1 - THREE.MathUtils.smoothstep(asteroid.userData.destroyTime, 0.0, 0.62)
      : 1;
    const hoverPulse = state.hoveredTarget === asteroid ? 0.22 + Math.sin(elapsed * 10) * 0.06 : 0;
    const hitPulse = asteroid.userData.hitPulse * 0.28;
    asteroid.visible = true;
    asteroid.position.x =
      relativeX -
      travelVelocity.x * parallax * 0.18 +
      orbitX;
    asteroid.position.y =
      relativeY +
      orbitY;
    asteroid.position.z = base.z + Math.sin(orbitAngle * 0.62) * 0.18;
    asteroid.rotation.x += asteroid.userData.spin.x * delta;
    asteroid.rotation.y += asteroid.userData.spin.y * delta;
    asteroid.rotation.z += asteroid.userData.spin.z * delta;
    asteroid.scale.setScalar(1 + hitPulse + hoverPulse);
    setGroupOpacity(asteroid, destroyedFade);
    if (destroyedFade <= 0.01) asteroid.visible = false;

    if (asteroid.userData.objective) {
      const halo = asteroid.children.find((child) => child.userData.isObjectiveHalo);
      if (halo) {
        halo.material.opacity = (0.40 + Math.sin(elapsed * 2.8) * 0.08 + hoverPulse) * destroyedFade;
        halo.scale.setScalar(1.18 + Math.sin(elapsed * 2.1) * 0.055);
      }
    }
    const missionHalo = asteroid.children.find((child) => child.userData.isMissionTargetHalo);
    if (missionHalo) {
      missionHalo.material.opacity =
        (missionHalo.userData.baseOpacity + Math.sin(elapsed * 3.4 + asteroid.userData.phase) * 0.05 + hoverPulse) *
        destroyedFade;
    }
    backgroundObjectScreenPoint(asteroid, targetScreenPoint);
    asteroid.userData.screenPoint = targetScreenPoint.clone();
  }

  for (const line of integratedBackground.streaks.children) {
    const depth = line.userData.depth;
    const routeScroll = cameraWorld.y * (0.34 + depth * 0.92);
    line.position.x =
      line.userData.base.x -
      cameraWorld.x * 0.08 * depth -
      travelVelocity.x * depth * 0.18;
    line.position.y =
      line.userData.base.y -
      ((routeScroll + elapsed * (0.25 + speed * 1.25) * (0.9 + depth * 1.2)) % 11.5);
    if (line.position.y < -5.75) line.position.y += 11.5;
    line.scale.y = 0.48 + (speed + ascentEnergy) * (0.7 + depth * 1.3);
    line.material.opacity = Math.max(0, (speed + ascentEnergy - 0.12) * (0.006 + depth * 0.016));
    line.material.color.lerpColors(
      premiumBgColor.cyan,
      premiumBgColor.magenta,
      0.35 + Math.sin(elapsed + line.userData.phase * 6.28) * 0.18
    );
  }
}

function updateAnimatedSpaceSprite(sprite, elapsed) {
  const animation = sprite.userData.animation;
  if (!animation) return;
  const sequence = sprite.userData.frameSequence;
  const frameSlot = Math.floor((elapsed + sprite.userData.framePhase) * animation.fps) % sequence.length;
  const frameIndex = sequence[frameSlot];
  setSpriteAsset(sprite, animation.frames[frameIndex]);
  scaleSprite(sprite, sprite.userData.frameWidth);
}

function worldPointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  return new THREE.Vector2(x * viewport.aspect, y);
}

function backgroundObjectScreenPoint(object, out = new THREE.Vector2()) {
  object.getWorldPosition(targetWorldPoint);
  const projected = targetWorldPoint.project(backgroundCamera);
  out.set(projected.x * viewport.aspect, projected.y);
  return out;
}

function findInteractiveTarget(point) {
  let best = null;
  let bestDistance = Infinity;

  for (const asteroid of integratedBackground.asteroids) {
    if (
      !asteroid.userData.interactive ||
      !asteroid.visible ||
      asteroid.userData.active === false ||
      asteroid.userData.destroyed ||
      !validTargetForMissionPhase(asteroid)
    ) {
      continue;
    }
    const screenPoint = backgroundObjectScreenPoint(asteroid, targetScreenPoint);
    asteroid.getWorldPosition(targetWorldPoint);
    const distanceToCamera = Math.max(3.5, backgroundCamera.position.distanceTo(targetWorldPoint));
    const hitRadius = THREE.MathUtils.clamp((asteroid.userData.hitRadius / distanceToCamera) * 4.4, 0.090, 0.36);
    const snapRadius = hitRadius + (asteroid.userData.missionRole === "large" ? 0.20 : 0.16);
    const distance = point.distanceTo(screenPoint);
    asteroid.userData.screenPoint = screenPoint.clone();
    asteroid.userData.screenHitRadius = hitRadius;
    if (distance < snapRadius && distance < bestDistance) {
      best = asteroid;
      bestDistance = distance;
    }
  }

  return best;
}

function shooterForTarget(target) {
  if (!target) return "ship";
  if (target.userData.missionRole === "small") return "astronaut";
  if (target.userData.missionRole === "large") return "ship";
  return target.userData.objective || target.userData.size === "large" ? "ship" : "astronaut";
}

function placeBeamSprite(sprite, origin, target) {
  const midpoint = origin.clone().lerp(target, 0.5);
  const delta = target.clone().sub(origin);
  const length = Math.max(0.04, delta.length());
  sprite.position.set(midpoint.x, midpoint.y, 0.08);
  sprite.material.rotation = Math.atan2(delta.y, delta.x);
  sprite.scale.set(length, sprite.userData.thickness, 1);
}

function createShotLine(origin, target, shooter) {
  const texture = shooter === "ship" ? missionFxTextures.shipTrail : missionFxTextures.toolBeam;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: shooter === "ship" ? 0.78 : 0.70,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );
  sprite.renderOrder = 31;
  sprite.userData.isBeam = true;
  sprite.userData.thickness = shooter === "ship" ? 0.090 : 0.040;
  placeBeamSprite(sprite, origin, target);
  return sprite;
}

function spawnMuzzle(point, shooter) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: shooter === "ship" ? missionFxTextures.shipCore : missionFxTextures.toolMuzzle,
      transparent: true,
      opacity: shooter === "ship" ? 0.70 : 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );
  sprite.position.set(point.x, point.y, 0.1);
  sprite.scale.setScalar(shooter === "ship" ? 0.18 : 0.11);
  sprite.renderOrder = 32;
  sprite.userData = { time: 0, duration: 0.16, strong: shooter === "ship" };
  interactionFx.add(sprite);
  activeImpacts.push(sprite);
}

function spawnOrientationSpray(origin, aimDirection, shooter) {
  const side = new THREE.Vector2(-aimDirection.y, aimDirection.x);
  const frameSet = fxFrames.thruster.length ? fxFrames.thruster : fxFrames.speed;
  const count = shooter === "ship" ? 7 : 5;
  for (let i = 0; i < count; i += 1) {
    const frame = frameSet[i % frameSet.length];
    const sprite = makeSprite(frame, {
      opacity: shooter === "ship" ? 0.36 : 0.30,
      blending: THREE.AdditiveBlending,
      renderOrder: 33,
      depthTest: false,
    });
    const lateral = (i - (count - 1) * 0.5) * (shooter === "ship" ? 0.030 : 0.020);
    const backward = aimDirection.clone().multiplyScalar(shooter === "ship" ? -0.14 : -0.08);
    sprite.position.set(
      origin.x + side.x * lateral + backward.x,
      origin.y + side.y * lateral + backward.y,
      0.12
    );
    sprite.material.rotation = Math.atan2(-aimDirection.y, -aimDirection.x) + (i % 2 ? 0.16 : -0.16);
    scaleSprite(sprite, shooter === "ship" ? 0.16 + i * 0.010 : 0.10 + i * 0.006);
    sprite.userData = {
      time: 0,
      duration: shooter === "ship" ? 0.40 : 0.32,
      spray: true,
      strong: shooter === "ship",
      drift: new THREE.Vector2(backward.x * 0.55 + side.x * lateral * 1.8, backward.y * 0.55 + side.y * lateral * 1.8),
      baseScale: sprite.scale.x,
      baseOpacity: sprite.material.opacity,
    };
    interactionFx.add(sprite);
    activeImpacts.push(sprite);
  }
}

function createLegacyShotLine(origin, target, shooter) {
  const material = new THREE.LineBasicMaterial({
    color: shooter === "ship" ? 0x38dcff : 0xf54de3,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(origin.x, origin.y, 0.08),
    new THREE.Vector3(target.x, target.y, 0.08),
  ]);
  const line = new THREE.Line(geometry, material);
  line.renderOrder = 31;
  return line;
}

function spawnImpact(point, strong = false) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: bgAuraTexture,
      transparent: true,
      opacity: strong ? 0.95 : 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sprite.position.set(point.x, point.y, 0.09);
  sprite.scale.setScalar(strong ? 0.34 : 0.20);
  sprite.renderOrder = 32;
  sprite.userData = { time: 0, duration: strong ? 0.48 : 0.30, strong };
  interactionFx.add(sprite);
  activeImpacts.push(sprite);
}

function setMissionTargetsActive(targets, active) {
  for (const target of targets) {
    target.userData.active = active;
    target.visible = active;
  }
}

function startMission01() {
  if (mission01.started) return;
  startMissionForStage(state.stageIndex);
}

function completeSmallMissionTargets() {
  if (mission01.state !== "small_asteroids") return;
  mission01.state = "large_obstacle";
  const config = currentMissionConfig();
  updateMissionHud("NÚCLEOS DETECTADOS", largeObjectiveLabel(mission01.largeRequired), config.subtitle);
  playAudioEvent("mission_zone_enter");
  playMissionAudio("large_spawn");
  syncRobotCompanion("large_obstacle");
  for (const obstacle of mission01.largeObstacles) {
    obstacle.userData.active = true;
    obstacle.userData.destroyed = false;
    obstacle.userData.destroyTime = 0;
    obstacle.userData.hitPulse = 1;
    obstacle.visible = true;
    const aura = obstacle.children.find((child) => child.userData.isObjectiveHalo);
    if (aura) aura.material.map = missionFxTextures.largeSpawnAura;
  }
  enterShipMode();
}

function revealMissionRelic(sourceTarget) {
  if (mission01.state === "relic" || mission01.state === "unlocked") return;
  const config = currentMissionConfig();
  mission01.state = "relic";
  mission01.relicState = "revealing";
  mission01.revealTime = 0;
  const point = sourceTarget?.userData.screenPoint || new THREE.Vector2(0.2, 0.2);
  relicGroup.position.set(
    THREE.MathUtils.clamp(point.x, -viewport.aspect + 0.20, viewport.aspect - 0.20),
    THREE.MathUtils.clamp(point.y, -0.70, 0.72),
    0.12
  );
  relicGroup.scale.setScalar(0.62);
  relicGroup.visible = true;
  relicGlow.material.opacity = 0;
  relicRingA.material.opacity = 0;
  relicRingB.material.opacity = 0;
  relicCore.material.opacity = 0;
  relicScanlines.material.opacity = 0;
  updateMissionHud("SEÑAL LIBERADA", "RELIQUIA ACTIVADA", config.subtitle);
  playAudioEvent("core_destroyed");
  syncRobotCompanion("relic");
  window.setTimeout(() => {
    if (mission01.state !== "relic" || mission01.unlockStarted) return;
    playMissionAudio("relic_reveal");
    playMissionAudio("relic_burst");
    playMissionAudio("relic_idle");
    enterAstronautMode();
    mission01.relicState = "collectible";
    updateMissionHud("ACTIVÁ LA RELIQUIA", "TOCÁ LA SEÑAL", config.subtitle);
    syncRobotCompanion("relic");
  }, 520);
}

function acquireStageGem() {
  const nextGemCount = THREE.MathUtils.clamp(mission01.currentStageIndex + 1, 1, 3);
  if (mission01.gems < nextGemCount) {
    mission01.gems = nextGemCount;
    playAudioEvent("gem_acquired");
    playAudioEvent("gem_counter_update");
  }
  updateGemHud();
}

function startFinalSequence() {
  if (mission01.finalStarted || mission01.finalComplete) return;
  mission01.finalStarted = true;
  mission01.finalTime = 0;
  mission01.state = "final";
  mission01.finalSignalAcquired = false;
  finalFxGroup.visible = true;
  finalFxGroup.position.set(0, 0, 0.18);
  finalCore.position.set(relicGroup.position.x || 0, relicGroup.position.y || 0.1, 0.2);
  finalCore.scale.setScalar(0.34);
  finalCore.material.opacity = 0.82;
  finalShockwave.position.copy(finalCore.position);
  finalShockwave.scale.setScalar(0.20);
  finalShockwave.material.opacity = 0;
  finalFlash.position.copy(finalCore.position);
  finalFlash.scale.setScalar(0.24);
  finalFlash.material.opacity = 0;
  finalParticles.material.opacity = 0;
  finalBeamSprites.forEach((beam) => {
    beam.visible = true;
    beam.material.opacity = 0;
  });
  playAudioEvent("final_relic_touch");
  playAudioEvent("final_core_collapse");
  updateMissionHud("FINAL ZONE", "ACTIVÁ LA SEÑAL FINAL", "RUMBO FINAL / ZONA FINAL");
  syncRobotCompanion("final");
  enterAstronautMode();
  updateStageHud();
}

function touchMissionRelic() {
  if (mission01.relicState !== "collectible" || mission01.unlockStarted) return;
  mission01.unlockStarted = true;
  mission01.relicTouched = true;
  mission01.state = "unlocked";
  mission01.relicState = "destroying";
  mission01.relicDestroyTime = 0;
  stopMissionAudio("relic_idle");
  playMissionAudio("relic_touch");
  playMissionAudio("energy_transfer");
  triggerAstronautAction();
  acquireStageGem();
  const config = currentMissionConfig();
  const isFinalStageGem = mission01.currentStageIndex >= missionStageConfigs.length - 1;
  updateMissionHud(
    `${config.gemName} ADQUIRIDA`,
    isFinalStageGem ? "FINAL ZONE ACTIVADA" : "NUEVO RUMBO ESTABILIZADO",
    isFinalStageGem ? "RUMBO FINAL / ZONA FINAL" : config.subtitle
  );
  syncRobotCompanion("unlocked");

  const from = relicGroup.position;
  const to = shipGroup.position;
  const mid = new THREE.Vector3((from.x + to.x) * 0.5, (from.y + to.y) * 0.5, 0.11);
  const distance = Math.max(0.18, new THREE.Vector2(from.x - to.x, from.y - to.y).length());
  energyBeam.visible = true;
  energyBeam.position.copy(mid);
  energyBeam.scale.set(0.16, distance, 1);
  energyBeam.material.rotation = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI * 0.5;
  energyBeam.material.opacity = 0.64;
  unlockFlash.visible = true;
  unlockFlash.position.set(shipGroup.position.x, shipGroup.position.y, 0.12);
  unlockFlash.scale.setScalar(0.88);
  unlockFlash.material.opacity = 0.82;

  window.setTimeout(() => {
    playAudioEvent("stage_route_unlocked");
    if (isFinalStageGem) {
      startFinalSequence();
      return;
    }
    if (!state.transition) startStageTransition();
  }, 760);
}

function handleMissionTargetDestroyed(target, shooter) {
  if (!target?.userData.missionRole) return;
  const config = currentMissionConfig();
  if (target.userData.missionRole === "small") {
    playAudioEvent("fragment_collected");
    mission01.smallDestroyed = Math.min(mission01.smallRequired, mission01.smallDestroyed + 1);
    updateMissionHud(
      "RECUPERANDO FRAGMENTOS",
      `${mission01.smallDestroyed}/${mission01.smallRequired} FRAGMENTOS DE SEÑAL`,
      config.subtitle
    );
    playMissionAudio("robot_item_update");
    syncRobotCompanion("small_asteroids");
    if (mission01.smallDestroyed >= mission01.smallRequired) {
      window.setTimeout(completeSmallMissionTargets, 420);
    }
  }
  if (target.userData.missionRole === "large") {
    playAudioEvent("core_destroyed");
    mission01.largeDestroyed = Math.min(mission01.largeRequired, mission01.largeDestroyed + 1);
    updateMissionHud(
      "ROMPIENDO NÚCLEOS",
      `${mission01.largeDestroyed}/${mission01.largeRequired} ${largeObjectiveNoun(mission01.largeRequired)}`,
      config.subtitle
    );
    playMissionAudio("robot_item_update");
    syncRobotCompanion("large_obstacle");
    if (mission01.largeDestroyed >= mission01.largeRequired) {
      window.setTimeout(() => revealMissionRelic(target), 380);
    }
  }
}

function damageTarget(target, shooter) {
  if (!target || target.userData.destroyed) return;
  if (target.userData.missionRole === "small") playMissionAudio("small_hit");
  if (target.userData.missionRole === "large") playAudioEvent("core_hit");
  target.userData.hp -= shooter === "ship" ? 2 : 1;
  target.userData.hitPulse = 1;
  const impactPoint = target.userData.screenPoint || backgroundObjectScreenPoint(target, new THREE.Vector2()).clone();
  spawnImpact(impactPoint, target.userData.hp <= 0);
  playAudioEvent(target.userData.hp <= 0 ? "impact_hit_stop" : "recoil_hit");
  if (target.userData.hp <= 0) {
    target.userData.destroyed = true;
    target.userData.destroyTime = 0;
    handleMissionTargetDestroyed(target, shooter);
  }
}

function launchShotAtTarget(target, shooter = shooterForTarget(target)) {
  if (!target || state.transition) return;
  if (shooter === "astronaut" && astronautSprite) enterAstronautMode();
  if (shooter === "ship") enterShipMode();

  const origin = shooter === "astronaut" ? astronautState.position.clone() : state.position.clone();
  const targetPoint = backgroundObjectScreenPoint(target, new THREE.Vector2()).clone();
  const shot = createShotLine(origin, targetPoint, shooter);
  shot.userData = { ...shot.userData, target, shooter, time: 0, duration: 0.18, origin };
  spawnMuzzle(origin, shooter);
  interactionFx.add(shot);
  activeShots.push(shot);
}

function fireAtTarget(target) {
  if (!target) return;
  const point = target.userData.screenPoint || backgroundObjectScreenPoint(target, new THREE.Vector2()).clone();
  beginAimAssistTarget(target, point);
}

function updateInteractionFx(delta) {
  for (let i = activeShots.length - 1; i >= 0; i -= 1) {
    const shot = activeShots[i];
    shot.userData.time += delta;
    const t = shot.userData.time / shot.userData.duration;
    const targetPoint = shot.userData.target.userData.screenPoint || backgroundObjectScreenPoint(shot.userData.target, new THREE.Vector2());
    const origin = shot.userData.shooter === "astronaut" ? astronautState.position : state.position;
    if (shot.userData.isBeam) {
      placeBeamSprite(shot, origin, targetPoint);
    } else {
      const positions = shot.geometry.attributes.position;
      positions.setXYZ(0, origin.x, origin.y, 0.08);
      positions.setXYZ(1, targetPoint.x, targetPoint.y, 0.08);
      positions.needsUpdate = true;
    }
    const baseOpacity = shot.userData.shooter === "ship" ? 0.78 : 0.70;
    shot.material.opacity = Math.max(0, baseOpacity * (1 - t));
    if (t >= 1) {
      interactionFx.remove(shot);
      if (shot.geometry?.dispose) shot.geometry.dispose();
      shot.material.dispose();
      activeShots.splice(i, 1);
    }
  }

  for (let i = activeImpacts.length - 1; i >= 0; i -= 1) {
    const impact = activeImpacts[i];
    impact.userData.time += delta;
    const t = impact.userData.time / impact.userData.duration;
    if (impact.userData.spray) {
      impact.position.x += impact.userData.drift.x * delta;
      impact.position.y += impact.userData.drift.y * delta;
      impact.scale.setScalar(impact.userData.baseScale * (1 + t * (impact.userData.strong ? 1.8 : 1.25)));
      impact.material.opacity = Math.max(0, impact.userData.baseOpacity * (1 - t));
      if (t >= 1) {
        interactionFx.remove(impact);
        impact.material.dispose();
        activeImpacts.splice(i, 1);
      }
      continue;
    }
    const scale = impact.userData.strong ? 0.34 + t * 0.42 : 0.20 + t * 0.22;
    impact.scale.setScalar(scale);
    impact.material.opacity = Math.max(0, (impact.userData.strong ? 0.95 : 0.62) * (1 - t));
    if (t >= 1) {
      interactionFx.remove(impact);
      impact.material.dispose();
      activeImpacts.splice(i, 1);
    }
  }
}

function updateTether(elapsed) {
  if (!astronautSprite) {
    tetherLine.visible = false;
    return;
  }
  tetherLine.visible = true;
  const from = new THREE.Vector2(shipGroup.position.x - shipSprite.scale.x * 0.10, shipGroup.position.y + shipSprite.scale.y * 0.10);
  const to = astronautState.position;
  const distance = from.distanceTo(to);
  const side = new THREE.Vector2(-(to.y - from.y), to.x - from.x).normalize();
  const positions = tetherGeometry.attributes.position;
  for (let i = 0; i < tetherPointCount; i += 1) {
    const t = i / (tetherPointCount - 1);
    const sag = Math.sin(t * Math.PI) * (0.018 + distance * 0.018);
    const wave = Math.sin(elapsed * 2.4 + t * Math.PI * 2.0) * 0.010 * Math.sin(t * Math.PI);
    const x = THREE.MathUtils.lerp(from.x, to.x, t) + side.x * (sag + wave);
    const y = THREE.MathUtils.lerp(from.y, to.y, t) + side.y * (sag + wave);
    positions.setXYZ(i, x, y, 0.015);
  }
  positions.needsUpdate = true;
  tetherLine.material.opacity = THREE.MathUtils.clamp(0.18 + distance * 0.12, 0.16, 0.42);
}

function updateMission01(delta, elapsed) {
  if (mission01.relicGroup?.visible) {
    mission01.revealTime += delta;
    const reveal = THREE.MathUtils.clamp(mission01.revealTime / 0.75, 0, 1);
    const pulse = 0.5 + Math.sin(elapsed * 3.1) * 0.5;
    const destroyFade =
      mission01.relicState === "destroying"
        ? 1 - THREE.MathUtils.smoothstep(mission01.relicDestroyTime, 0.10, 0.85)
        : 1;
    const coreScale = 0.18 + reveal * 0.10 + pulse * 0.012;
    if (mission01.relicState === "destroying") mission01.relicDestroyTime += delta;
    relicGlow.scale.setScalar((0.64 + pulse * 0.08) * (1 + (1 - destroyFade) * 0.44));
    relicRingA.scale.setScalar((0.36 + reveal * 0.10) * (1 + (1 - destroyFade) * 0.62));
    relicRingB.scale.setScalar((0.44 + reveal * 0.14) * (1 + (1 - destroyFade) * 0.50));
    relicCore.scale.setScalar(coreScale * (1 + (1 - destroyFade) * 0.35));
    relicScanlines.scale.setScalar((0.26 + reveal * 0.08) * (1 + (1 - destroyFade) * 0.28));
    relicRingA.material.rotation = elapsed * 0.72;
    relicRingB.material.rotation = -elapsed * 0.48;
    relicScanlines.material.rotation = Math.sin(elapsed * 0.7) * 0.08;
    relicGlow.material.opacity = (0.36 + pulse * 0.12) * reveal * destroyFade;
    relicRingA.material.opacity = 0.50 * reveal * destroyFade;
    relicRingB.material.opacity = 0.36 * reveal * destroyFade;
    relicCore.material.opacity = Math.min(0.96, reveal * 1.2) * destroyFade;
    relicScanlines.material.opacity = 0.22 * reveal * destroyFade;

    if (mission01.relicState === "collectible" && astronautSprite) {
      const relicPoint = new THREE.Vector2(relicGroup.position.x, relicGroup.position.y);
      if (astronautState.position.distanceTo(relicPoint) < 0.14) touchMissionRelic();
    }

    if (mission01.relicState === "destroying" && destroyFade <= 0.01) {
      relicGroup.visible = false;
      mission01.relicState = "destroyed";
    }
  }

  if (unlockFlash.visible) {
    unlockFlash.material.opacity = Math.max(0, unlockFlash.material.opacity - delta * 0.78);
    unlockFlash.scale.multiplyScalar(1 + delta * 1.1);
    if (unlockFlash.material.opacity <= 0.01) unlockFlash.visible = false;
  }

  if (energyBeam.visible) {
    energyBeam.material.opacity = Math.max(0, energyBeam.material.opacity - delta * 0.52);
    if (energyBeam.material.opacity <= 0.01) energyBeam.visible = false;
  }
}

function updateFinalSequence(delta, elapsed) {
  if (!mission01.finalStarted) {
    finalFxGroup.visible = false;
    return;
  }

  mission01.finalTime += delta;
  const t = mission01.finalTime;
  finalFxGroup.visible = true;
  const corePoint = new THREE.Vector2(finalCore.position.x, finalCore.position.y);
  const shipPoint = new THREE.Vector2(shipGroup.position.x, shipGroup.position.y);
  const collapse = THREE.MathUtils.smoothstep(t, 0.05, 0.90);
  const release = THREE.MathUtils.smoothstep(t, 0.70, 1.28);
  const resolve = THREE.MathUtils.smoothstep(t, 2.40, 3.70);

  finalCore.rotation.z = elapsed * (1.2 + collapse * 1.8);
  finalCore.scale.setScalar(THREE.MathUtils.lerp(0.34, 0.07, collapse) + Math.sin(elapsed * 16) * 0.006);
  finalCore.material.opacity = Math.max(0, 0.86 * (1 - THREE.MathUtils.smoothstep(t, 0.86, 1.42)));

  finalFlash.position.copy(finalCore.position);
  finalFlash.scale.setScalar(0.22 + release * 1.15);
  finalFlash.material.opacity = Math.max(0, Math.sin(Math.PI * release) * 0.86 * (1 - resolve));

  finalShockwave.position.copy(finalCore.position);
  finalShockwave.scale.setScalar(0.20 + release * 1.72);
  finalShockwave.material.rotation = elapsed * 0.36;
  finalShockwave.material.opacity = Math.max(0, 0.62 * Math.sin(Math.PI * release) * (1 - resolve * 0.8));

  const positions = finalParticleGeometry.attributes.position;
  for (let i = 0; i < finalParticleCount; i += 1) {
    const slot = i / finalParticleCount;
    const angle = elapsed * (2.4 + slot * 2.0) + slot * Math.PI * 10;
    const radius = (0.04 + slot * 0.76) * (0.35 + release * 1.25);
    const spiral = Math.sin(release * Math.PI) * (1 - resolve * 0.6);
    positions.setXYZ(
      i,
      Math.cos(angle) * radius * spiral,
      Math.sin(angle) * radius * spiral,
      0.18 + slot * 0.04
    );
  }
  positions.needsUpdate = true;
  finalParticles.position.copy(finalCore.position);
  finalParticles.material.opacity = Math.max(0, 0.50 * Math.sin(Math.PI * release) * (1 - resolve));

  finalBeamSprites.forEach((beam, index) => {
    const angle = (index / finalBeamSprites.length) * Math.PI * 2 + elapsed * 0.36;
    const from = new THREE.Vector2(
      corePoint.x + Math.cos(angle) * (0.08 + release * 0.10),
      corePoint.y + Math.sin(angle) * (0.08 + release * 0.10)
    );
    placeBeamSprite(beam, from, shipPoint);
    beam.material.opacity = Math.max(0, release * 0.52 * (1 - resolve * 0.7));
  });

  shipAura.material.opacity = Math.max(shipAura.material.opacity, 0.24 + release * 0.38);
  shipAura.scale.set(shipSprite.scale.x * (1.76 + release * 0.40), shipSprite.scale.y * (1.20 + release * 0.30), 1);
  unlockFlash.visible = release > 0.42 && !mission01.finalComplete;
  if (unlockFlash.visible) {
    unlockFlash.position.set(shipGroup.position.x, shipGroup.position.y, 0.13);
    unlockFlash.scale.setScalar(0.66 + release * 0.72);
    unlockFlash.material.opacity = Math.max(unlockFlash.material.opacity, 0.18 + release * 0.32);
  }

  if (!mission01.finalSignalAcquired && t >= 1.18) {
    mission01.finalSignalAcquired = true;
    mission01.gems = 3;
    playAudioEvent("final_shockwave");
    playAudioEvent("final_energy_beam");
    playAudioEvent("final_signal_acquired");
    updateMissionHud("SEÑAL FINAL ADQUIRIDA", "RUTA ESTABILIZADA", "RUMBO FINAL / ZONA FINAL");
    syncRobotCompanion("final");
  }

  if (!mission01.finalComplete && t >= 3.15) {
    mission01.finalComplete = true;
    playAudioEvent("mission_complete_resolve");
    updateMissionHud("MISSION COMPLETE", "SEÑAL FINAL ADQUIRIDA / RUTA ESTABILIZADA", "GRAVEDAD ZERO");
    syncRobotCompanion("final");
    updateStageHud();
  }

  if (mission01.finalComplete && resolve >= 0.98) {
    finalFxGroup.visible = false;
  }
}

function enterAstronautMode() {
  if (!astronautSprite || state.transition) return;
  state.controlMode = "astronaut";
  astronautState.actionTime = 0;
  astronautState.returnPulse = 0;
  updateStageHud();
}

function enterShipMode() {
  state.controlMode = "ship";
  astronautState.actionTime = 0;
  astronautState.returnPulse = 0.6;
  updateStageHud();
}

function triggerAstronautAction() {
  if (!astronautSprite) return;
  const actions = ["wave", "thumbs_up"].filter((key) => astronautAnimations[key]);
  astronautState.actionName = actions[astronautState.actionIndex % Math.max(1, actions.length)] || "wave";
  astronautState.actionIndex += 1;
  astronautState.actionTime = 1.05;
  setAstronautAnimation(astronautState.actionName);
}

function setAstronautAnimation(animationName) {
  const nextAnimation = astronautAnimations[animationName] ? animationName : "idle_hover";
  if (astronautState.animation === nextAnimation) return;
  astronautState.animation = nextAnimation;
  astronautState.animationTime = 0;
}

function resolveAstronautView(velocity) {
  const direction = resolveDirection(velocity.x, velocity.y);
  const map = {
    idle: astronautState.viewName || "front_right",
    up: "rear",
    down: "front",
    left: "side_left",
    right: "side_right",
    up_left: "rear_left",
    up_right: "rear_right",
    down_left: "front_left",
    down_right: "front_right",
  };
  return map[direction] || "front_right";
}

function setAstronautViewFrame(viewName) {
  const asset = astronautViews[viewName] || astronautViews.front_right || astronautViews.front || astronautAsset;
  if (!asset) return;
  astronautState.viewName = viewName;
  setSpriteAsset(astronautSprite, asset);
  scaleSprite(astronautSprite, astronautWidth());
}

function setAstronautFrame() {
  if (!astronautSprite) return;
  const animation = astronautAnimations[astronautState.animation] || astronautAnimations.idle_hover;
  if (!animation?.frames?.length) return;

  const frameIndex = Math.floor(astronautState.animationTime * animation.fps) % animation.frames.length;
  const frame = animation.frames[frameIndex];
  const asset = frame[astronautState.facing] || frame.right || frame.left;
  if (!asset) return;

  setSpriteAsset(astronautSprite, asset);
  scaleSprite(astronautSprite, astronautWidth());
}

function updateAstronaut(delta, elapsed, controlVelocity) {
  if (!astronautSprite) return;

  const isControlled = state.controlMode === "astronaut";
  if (isControlled) {
    astronautState.velocity.lerp(controlVelocity, 1 - Math.pow(0.004, delta));
    const moveSpeed = 0.58;
    astronautState.position.x = THREE.MathUtils.clamp(
      astronautState.position.x + astronautState.velocity.x * moveSpeed * delta,
      -viewport.aspect + 0.10,
      viewport.aspect - 0.10
    );
    astronautState.position.y = THREE.MathUtils.clamp(
      astronautState.position.y + astronautState.velocity.y * moveSpeed * delta,
      -0.84,
      0.84
    );
  } else {
    const float = Math.sin(elapsed * 0.86) * 0.022;
    const anchor = currentAstronautAnchor();
    const target = new THREE.Vector2(
      anchor.x,
      anchor.y + float
    );
    const previous = astronautState.position.clone();
    astronautState.position.lerp(target, 1 - Math.pow(0.018, delta));
    astronautState.velocity
      .copy(astronautState.position)
      .sub(previous)
      .multiplyScalar(Math.min(60, 1 / Math.max(delta, 0.001)));
  }

  if (astronautState.velocity.x > 0.035) astronautState.facing = "right";
  if (astronautState.velocity.x < -0.035) astronautState.facing = "left";

  if (astronautState.actionTime > 0) {
    astronautState.actionTime = Math.max(0, astronautState.actionTime - delta);
    setAstronautAnimation(astronautState.actionName);
  } else if (isControlled && astronautState.velocity.length() > 0.18) {
    setAstronautAnimation("idle_hover");
  } else {
    setAstronautAnimation("idle_hover");
  }

  astronautState.animationTime += delta;
  astronautState.returnPulse = Math.max(0, astronautState.returnPulse - delta);
  if (isControlled && astronautState.actionTime <= 0 && astronautState.velocity.length() > 0.14) {
    setAstronautViewFrame(resolveAstronautView(astronautState.velocity));
  } else {
    setAstronautFrame();
  }

  const controlledPulse = isControlled ? 0.08 + Math.sin(elapsed * 4.2) * 0.025 : 0;
  const returnPulse = astronautState.returnPulse * 0.18;
  astronautGroup.position.set(astronautState.position.x, astronautState.position.y, 0.04);
  astronautSprite.position.set(0, 0, 0.02);
  astronautSprite.rotation.z = Math.sin(elapsed * 0.72) * 0.035 - astronautState.velocity.x * 0.035;
  astronautSprite.material.opacity = state.transition ? 0.24 : isControlled ? 0.98 : 0.84;
  astronautHalo.material.opacity = state.transition
    ? 0.05
    : 0.10 + controlledPulse + returnPulse;
}

window.addEventListener("keydown", (event) => {
  ensureMissionAudio();
  input.keys.add(event.key);
  if (event.key === "Escape") {
    event.preventDefault();
    if (gameMenu && !gameMenu.hidden) hideMenu();
    else showMenu("pause");
    return;
  }
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (gameMenu && !gameMenu.hidden) {
      handleMenuAction("start");
      return;
    }
    if (!mission01.started) {
      startMission01();
      return;
    }
    if (state.controlMode === "astronaut") triggerAstronautAction();
    else startStageTransition();
  }
});

window.addEventListener("keyup", (event) => {
  input.keys.delete(event.key);
});

window.addEventListener("pointermove", (event) => {
  input.aimPoint.copy(worldPointerFromEvent(event));
  state.hoveredTarget = findInteractiveTarget(input.aimPoint);
});

window.addEventListener("pointerleave", () => {
  state.hoveredTarget = null;
});

window.addEventListener("pointerdown", (event) => {
  if (event.target?.closest?.("button, .game-menu")) return;
  ensureMissionAudio();
  const point = worldPointerFromEvent(event);
  if (isRobotCompanionHit(point)) {
    toggleRobotPanel();
    return;
  }
  if (gameMenu && !gameMenu.hidden) return;
  if (!mission01.started) {
    startMission01();
    return;
  }
  const astronautDistance = point.distanceTo(astronautState.position);
  const shipDistance = point.distanceTo(state.position);
  const target = findInteractiveTarget(point);
  const relicPoint = new THREE.Vector2(relicGroup.position.x, relicGroup.position.y);

  if (mission01.relicState === "collectible" && point.distanceTo(relicPoint) < 0.18) {
    beginAimAssistRelic(point);
    return;
  }

  if (state.controlMode === "ship" && astronautDistance < 0.16) {
    enterAstronautMode();
    return;
  }

  if (state.controlMode === "astronaut" && shipDistance < 0.24) {
    enterShipMode();
    return;
  }

  if (target) {
    fireAtTarget(target);
    return;
  }

  if (state.controlMode === "astronaut") triggerAstronautAction();
});

stageButton.addEventListener("click", () => {
  ensureMissionAudio();
  if (!mission01.started) {
    startMission01();
    return;
  }
  if (state.controlMode === "astronaut") enterShipMode();
  else startStageTransition();
});

menuActions?.addEventListener("click", (event) => {
  const button = event.target?.closest?.("button[data-action]");
  if (!button) return;
  handleMenuAction(button.dataset.action);
});

startMissionButton?.addEventListener("click", () => handleMenuAction("start"));
controlsButton?.addEventListener("click", () => handleMenuAction("controls"));

function resize() {
  viewport.width = window.innerWidth;
  viewport.height = window.innerHeight;
  viewport.aspect = viewport.width / viewport.height;
  renderer.setSize(viewport.width, viewport.height, false);
  camera.left = -viewport.aspect;
  camera.right = viewport.aspect;
  camera.top = 1;
  camera.bottom = -1;
  camera.updateProjectionMatrix();
  backgroundCamera.aspect = viewport.aspect;
  backgroundCamera.updateProjectionMatrix();
  backgroundUniforms.uAspect.value = viewport.aspect;
  resizeShip();
  resizeAstronaut();
  positionHudSprites();
}

function animateBackdrop(delta, elapsed, travelVelocity) {
  for (const object of deepSpace.children) {
    updateAnimatedSpaceSprite(object, elapsed);
    const base = object.userData.base;
    const parallax = object.userData.parallax;
    const aspectBias = Math.max(1, viewport.aspect / 1.45);
    object.position.x = base.x * aspectBias + input.smoothPointer.x * parallax * 0.22 - state.position.x * parallax * 0.28;
    object.position.y = base.y - state.position.y * parallax * 0.42 + input.smoothPointer.y * parallax * 0.08;
    object.rotation.y += delta * object.userData.spin;
    object.rotation.z += delta * object.userData.spin * 0.35;
  }

  for (const star of stars.children) {
    const depth = star.userData.depth;
    star.position.x = star.userData.x * viewport.aspect + input.smoothPointer.x * 0.010 * depth;
    star.position.y = star.userData.y - state.position.y * 0.04 * depth;
    star.material.opacity = 0.08 + Math.sin(elapsed * 1.4 + depth * 12) * 0.025 + depth * 0.08;
  }

  const speedAmount = Math.min(1, travelVelocity.length());
  for (const line of speedLines.children) {
    const size = line.userData.size;
    line.position.x = line.userData.x * viewport.aspect + input.smoothPointer.x * 0.012;
    line.position.y = line.userData.y;
    line.scale.set(size * (1 + speedAmount * 0.32), size * 0.22, 1);
    line.material.opacity = (0.025 + speedAmount * 0.08) * (0.8 + Math.sin(elapsed * 2 + size * 9) * 0.2);
  }

  for (const sprite of spaceObjects.children) {
    updateAnimatedSpaceSprite(sprite, elapsed);
    const parallax = sprite.userData.parallax;
    if (sprite.userData.speed) {
      const travel = ((elapsed * sprite.userData.speed + sprite.userData.phase) % 1) * 4.6;
      sprite.position.x = sprite.userData.base.x * viewport.aspect + travel - 2.3 * viewport.aspect;
      sprite.position.y = sprite.userData.base.y - travel * 0.22 - state.position.y * parallax * 0.55;
      sprite.material.opacity = 0.06 + travelVelocity.length() * 0.12;
    } else {
      sprite.position.x += (-travelVelocity.x * 0.36 + sprite.userData.drift.x) * delta * parallax;
      sprite.position.y += (-travelVelocity.y * 0.44 + sprite.userData.drift.y) * delta * parallax;
      sprite.position.x += input.smoothPointer.x * delta * 0.006;
      sprite.rotation.x += delta * sprite.userData.spin;
      sprite.rotation.y += delta * sprite.userData.spin * 0.74;
      sprite.rotation.z += delta * 0.018 * parallax;
    }
    wrapSprite(sprite);
  }
}

function updateShipFx(elapsed, shipVelocity) {
  const speed = Math.min(1, shipVelocity.length());
  const moving = speed > 0.08;
  const direction = moving
    ? shipVelocity.clone().normalize()
    : new THREE.Vector2(0, 0.82 + Math.sin(elapsed * 0.7) * 0.05).normalize();
  const behind = direction.clone().multiplyScalar(-1);
  const stageScale = { stage1: 0.82, stage2: 1, stage3: 1.16 }[currentStage()];
  const pulse = 0.5 + Math.sin(elapsed * 2.35) * 0.5;

  shipAura.material.opacity = 0.16 + pulse * 0.035 + speed * 0.20 + (state.transition ? 0.16 : 0);
  shipAura.rotation.z = elapsed * 0.16;

  velocityWake.visible = false;
  velocityWake.position.set(behind.x * 0.28 * stageScale, behind.y * 0.28 * stageScale, -0.01);
  velocityWake.material.rotation = Math.atan2(direction.y, direction.x);
  velocityWake.material.opacity = 0;
  scaleSprite(velocityWake, shipSprite.scale.x * 1.34 * (1 + speed * 0.22));

  let i = 0;
  for (const particle of motionParticles.children) {
    const depth = particle.userData.depth;
    const phase = particle.userData.phase + elapsed * (0.85 + speed * 2.2);
    const side = new THREE.Vector2(-direction.y, direction.x);
    const trail = (0.08 + (i % 6) * 0.034) * (0.9 + speed * 1.5) * stageScale;
    const spread = Math.sin(phase) * (0.025 + speed * 0.048) * depth;
    const orbit = Math.cos(phase * 0.63) * (0.012 + depth * 0.012);
    particle.position.set(
      behind.x * trail + side.x * spread + direction.x * orbit,
      behind.y * trail + side.y * spread + direction.y * orbit,
      0.015
    );
    const particleSize = (0.007 + depth * 0.010 + speed * 0.008) * stageScale;
    particle.scale.set(particleSize, particleSize, 1);
    particle.material.opacity = moving ? (0.030 + speed * 0.075) * depth : 0.010 + pulse * 0.012;
    i += 1;
  }
}

function animate() {
  const rawDelta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;
  const hitStopped = aimAssist.hitStop > 0;
  if (hitStopped) aimAssist.hitStop = Math.max(0, aimAssist.hitStop - rawDelta);
  const finalSlow = mission01.finalStarted && !mission01.finalComplete && mission01.finalTime < 2.4;
  const delta = rawDelta * (hitStopped ? 0.04 : aimAssist.active ? 0.40 : finalSlow ? 0.48 : 1);

  const keyX = keyAxis(["ArrowLeft", "a", "A"], ["ArrowRight", "d", "D"]);
  const keyY = keyAxis(["ArrowDown", "s", "S"], ["ArrowUp", "w", "W"]);
  const targetVelocity = new THREE.Vector2(keyX, keyY);
  if (targetVelocity.length() > 1) targetVelocity.normalize();

  input.smoothPointer.set(0, 0);
  input.velocity.lerp(targetVelocity, 1 - Math.pow(0.004, delta));

  const shipVelocity = state.controlMode === "ship" ? input.velocity : new THREE.Vector2();

  if (state.controlMode === "ship") {
    setDirection(input.debugDirection || resolveDirection(input.velocity.x, input.velocity.y));

    const moveSpeed = state.transition ? 0.18 : 0.74;
    state.position.x = THREE.MathUtils.clamp(
      state.position.x + input.velocity.x * moveSpeed * delta,
      -viewport.aspect + 0.42,
      viewport.aspect - 0.42
    );
    state.position.y = THREE.MathUtils.clamp(
      state.position.y + input.velocity.y * moveSpeed * delta,
      -0.64,
      0.64
    );

    const ascentIntent = Math.max(0, input.velocity.y) - Math.max(0, -input.velocity.y) * 0.55;
    state.routeVelocity = THREE.MathUtils.lerp(
      state.routeVelocity,
      ascentIntent,
      1 - Math.pow(0.006, delta)
    );
    const worldMoveSpeed = state.transition ? 0.72 : 1.72;
    state.worldOffset.x += input.velocity.x * worldMoveSpeed * delta;
    state.worldOffset.y += input.velocity.y * worldMoveSpeed * 1.18 * delta;
    state.routeProgress = routeProgressFromWorldY(state.worldOffset.y);
  } else {
    setDirection(input.debugDirection || "idle");
    state.routeVelocity = THREE.MathUtils.lerp(state.routeVelocity, 0, 1 - Math.pow(0.006, delta));
  }

  const drift = Math.sin(elapsed * 1.04) * 0.018 + Math.sin(elapsed * 1.72 + 0.7) * 0.008;
  shipGroup.position.x = state.position.x;
  shipGroup.position.y = state.position.y + drift;
  shipGroup.rotation.z = THREE.MathUtils.lerp(shipGroup.rotation.z, shipVelocity.x * -0.035, 0.08);

  backgroundUniforms.uTime.value = elapsed;
  backgroundUniforms.uThrust.value =
    shipVelocity.length() + (state.controlMode === "astronaut" ? input.velocity.length() * 0.22 : 0);
  backgroundUniforms.uRouteProgress.value = state.routeProgress;
  backgroundUniforms.uPointer.value.copy(input.smoothPointer);
  backgroundUniforms.uWorldOffset.value.copy(state.worldOffset);

  updateIntegratedBackground(delta, elapsed, shipVelocity);
  updateChunkObjects(delta, elapsed, shipVelocity);
  updateOrbitalObjects(delta, elapsed, shipVelocity);
  updateMissionZones(delta, elapsed);
  updateShipEngineAudio(shipVelocity, state.transition, rawDelta);
  updateShipFx(elapsed, shipVelocity);
  updateTransition(delta, elapsed);
  updateAstronaut(delta, elapsed, input.velocity);
  updateInteractionFx(delta);
  updateAimAssist(rawDelta, elapsed);
  updateMission01(delta, elapsed);
  updateFinalSequence(rawDelta, elapsed);
  updateRobotCompanion(delta, elapsed);
  updateTether(elapsed);

  renderer.clear();
  renderer.render(backgroundScene, backgroundCamera);
  renderer.clearDepth();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateStageHud();
updateMissionHud("TOMA EL CONTROL", "CLICK O ENTER PARA INICIAR", "SECTOR INICIAL");
syncRobotCompanion("boot");
window.addEventListener("resize", resize);
resize();
showMenu("title_menu");
if (params.get("autoStage") === "1") {
  window.setTimeout(startStageTransition, 450);
}
if (params.get("autoMission") === "1") {
  hideMenu();
  window.setTimeout(startMission01, 350);
}
animate();
