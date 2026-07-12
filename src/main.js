import * as THREE from "../vendor/three.module.js";
import { V2Runtime } from "./app/V2Runtime.ts";
import { ASSET_CATALOG, assetPath as v2AssetPath } from "./assets/AssetCatalog.ts";
import { updateAimRotation } from "./combat/AimCombat.ts";
import { resolveMeteorCollision } from "./meteors/MeteorCollision.ts";
import { assertComposition } from "./qa/ReleaseAssertions.ts";
import { BIOME_LABELS, SCENARIOS, WORLD_PROFILES, scenarioForStage } from "./world/ScenarioDefinitions.ts";
import { GravityFieldSystem } from "./world/GravityFieldSystem.ts";
import {
  AstronautVisualRig,
  BiomeVisualLighting,
  DirectionalThrusterSystem,
  RelicGem,
  ShieldFx,
  ShipMotionRig,
  ShipVisualRig,
} from "./visual/VisualPackRig.js";

const canvas = document.querySelector("#scene");
const stageButton = document.querySelector("#stageButton");
const stageLabel = document.querySelector("#stageLabel");
const speedButton = document.querySelector("#speedButton");
const missionTitle = document.querySelector("#missionTitle");
const missionSubtitle = document.querySelector("#missionSubtitle");
const missionStatus = document.querySelector("#missionStatus");
const missionProgress = document.querySelector("#missionProgress");
const gemHud = document.querySelector("#gemHud");
const gemBadge = document.querySelector("#gemBadge");
const shieldHud = document.querySelector("#shieldHud");
const regionHud = document.querySelector("#regionHud");
const robotPanel = document.querySelector("#robotPanel");
const robotStateLabel = document.querySelector("#robotStateLabel");
const robotGoal = document.querySelector("#robotGoal");
const robotAction = document.querySelector("#robotAction");
const robotTip = document.querySelector("#robotTip");
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
const v2Runtime = new V2Runtime();
const scenarioGravity = new GravityFieldSystem(SCENARIOS);
let scenarioGravitySample = { x: 0, y: 0, magnitude: 0, fieldId: null, fieldType: null };
const debugHudEnabled = params.get("debugHud") === "1";
document.body.classList.toggle("debug-hud", debugHudEnabled);

const WORLD_HEIGHT = 72;
const WORLD_MIN_Y = -18;
const WORLD_MAX_Y = WORLD_HEIGHT + 18;
const WORLD_HALF_WIDTH = 26;
const WORLD_WRAP_X = WORLD_HALF_WIDTH * 2;
const WORLD_WRAP_Y = WORLD_MAX_Y - WORLD_MIN_Y;
const EXPANDED_WORLD_WRAP_X = 1008;
const EXPANDED_WORLD_WRAP_Y = 1008;
const MISSION_ZONE_WRAP_SPAN = 1008;

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

const STAGE_TUNING = [
  {
    label: "Stage 1",
    shipMaxSpeed: 1.00,
    acceleration: 1.00,
    worldMoveSpeed: 1.00,
    parallaxSpeed: 1.00,
    targetSpeed: 1.00,
    debrisSpeed: 1.00,
    spawnDensity: 1.00,
    audioIntensity: 0.85,
    speedLines: 0.75,
  },
  {
    label: "Stage 2",
    shipMaxSpeed: 1.12,
    acceleration: 1.10,
    worldMoveSpeed: 1.16,
    parallaxSpeed: 1.14,
    targetSpeed: 1.10,
    debrisSpeed: 1.12,
    spawnDensity: 1.06,
    audioIntensity: 1.00,
    speedLines: 1.00,
  },
  {
    label: "Stage 3",
    shipMaxSpeed: 1.26,
    acceleration: 1.18,
    worldMoveSpeed: 1.34,
    parallaxSpeed: 1.30,
    targetSpeed: 1.18,
    debrisSpeed: 1.24,
    spawnDensity: 1.10,
    audioIntensity: 1.14,
    speedLines: 1.28,
  },
  {
    label: "Final",
    shipMaxSpeed: 1.34,
    acceleration: 1.22,
    worldMoveSpeed: 1.46,
    parallaxSpeed: 1.38,
    targetSpeed: 1.10,
    debrisSpeed: 1.20,
    spawnDensity: 1.02,
    audioIntensity: 1.22,
    speedLines: 1.45,
  },
];

const SPEED_MODES = [
  { label: "x1", multiplier: 1.0, audio: 1.0, streaks: 1.0 },
  { label: "x2", multiplier: 1.45, audio: 1.15, streaks: 1.25 },
  { label: "x3", multiplier: 1.85, audio: 1.30, streaks: 1.55 },
];

const requestedSpeedMode = Math.max(0, Math.min(SPEED_MODES.length - 1, Number(params.get("speed") || 1) - 1));
const speedState = {
  modeIndex: requestedSpeedMode,
  currentMultiplier: SPEED_MODES[requestedSpeedMode].multiplier,
  visualMultiplier: SPEED_MODES[requestedSpeedMode].multiplier,
  currentTuning: { ...STAGE_TUNING[initialStageIndex] },
  notificationTime: 0,
  turboActive: false,
  turboPulse: 0,
  turboLabel: "TURBO LIMITADO",
};

const TURBO_UNLOCKS = [
  { label: "TURBO LIMITADO", multiplier: 1.22, audio: 0.90, requiredGems: 0 },
  { label: "TURBO x2", multiplier: 1.55, audio: 1.08, requiredGems: 1 },
  { label: "TURBO x3", multiplier: 1.92, audio: 1.24, requiredGems: 2 },
  { label: "WARP PULSE", multiplier: 2.34, audio: 1.42, requiredGems: 3 },
];

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

const manifest = await fetch("/assets/runtime/manifest.json").then((response) => {
  if (!response.ok) throw new Error(`Runtime manifest unavailable: ${response.status}`);
  return response.json();
});

function textureUrl(path) {
  return `/${String(path).replace(/^\/+/, "")}`;
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

function loadVisualDataTexture(path) {
  const texture = loader.load(textureUrl(path));
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function makeStripFrameTexture(texture, frame, frameCount = 4) {
  const frameTexture = texture.clone();
  frameTexture.repeat.set(1 / frameCount, 1);
  frameTexture.offset.set(frame / frameCount, 0);
  return frameTexture;
}

function makeStripFrameAssets(texture, frameCount = 4, aspect = 1) {
  return Array.from({ length: frameCount }, (_, frame) => ({
    texture: makeStripFrameTexture(texture, frame, frameCount),
    aspect,
    width: 1,
    height: 1,
  }));
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
  v2Ocean: loadWorldTexture(v2AssetPath("planet.ocean.albedo")),
  v2OceanNormal: loadWorldTexture(v2AssetPath("planet.ocean.normal"), { color: false }),
  v2OceanEmissive: loadWorldTexture(v2AssetPath("planet.ocean.emissive")),
  v2Mechanical: loadWorldTexture(v2AssetPath("planet.mechanical.albedo")),
  v2MechanicalNormal: loadWorldTexture(v2AssetPath("planet.mechanical.normal"), { color: false }),
  v2MechanicalEmissive: loadWorldTexture(v2AssetPath("planet.mechanical.emissive")),
  v2Synthetic: loadWorldTexture(v2AssetPath("planet.synthetic.albedo")),
  v2SyntheticNormal: loadWorldTexture(v2AssetPath("planet.synthetic.normal"), { color: false }),
  v2SyntheticEmissive: loadWorldTexture(v2AssetPath("planet.synthetic.emissive")),
  cyberEarth: loadWorldTexture("assets/runtime/three-textures/cyber-earth-dark-color.png"),
  oceanColor: loadWorldTexture("assets/runtime/three-textures/ocean-color.png"),
  oceanWorld: loadWorldTexture("assets/runtime/three-textures/ocean-world-bright-color.png"),
  gasGiant: loadWorldTexture("assets/runtime/three-textures/gas-giant-color.png"),
  oceanPrime: loadWorldTexture("assets/runtime/gravedad-zero/planets/planet_ocean_prime_albedo.png"),
  darkCraterPremium: loadWorldTexture("assets/runtime/gravedad-zero/planets/planet_dark_crater_albedo.png"),
  nebulaCore: loadWorldTexture("assets/runtime/gravedad-zero/planets/planet_nebula_core_albedo.png"),
  mechanicalMoonPremium: loadWorldTexture("assets/runtime/gravedad-zero/planets/planet_mechanical_moon_albedo.png"),
  auroraGas: loadWorldTexture("assets/runtime/gravedad-zero/planets/planet_aurora_gas_albedo.png"),
  deepDarkEmissiveOverlay: loadWorldTexture("assets/runtime/gravedad-zero/planets/planet_deep_dark_emissive_overlay.png"),
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
  toolBeam: loadTexture("assets/runtime/v2/projectiles/projectile_astronaut_tool_bolt_768x192.png"),
  toolMuzzle: loadTexture("assets/runtime/v2/projectiles/muzzle_charge_atlas_4x1_1024.png"),
  shipCore: loadTexture("assets/runtime/v2/projectiles/projectile_ship_energy_bolt_1024x256.png"),
  shipTrail: loadTexture("assets/runtime/v2/projectiles/projectile_long_trail_1024x256.png"),
  largeSpawnAura: loadTexture("assets/runtime/v2/mission-fx/large_obstacle_spawn_aura.png"),
  relicCore: loadTexture("assets/runtime/v2/mission-fx/relic_hologram_alpha_cropped.png"),
  relicGlow: loadTexture("assets/runtime/v2/mission-fx/relic_aura_glow.png"),
  relicRingA: loadTexture("assets/runtime/v2/mission-fx/relic_orbit_ring_01.png"),
  relicRingB: loadTexture("assets/runtime/v2/mission-fx/relic_orbit_ring_02.png"),
  relicScanlines: loadTexture("assets/runtime/v2/mission-fx/relic_scanlines_overlay.png"),
  stageUnlockFlash: loadTexture("assets/runtime/v2/mission-fx/stage_unlock_flash_glow.png"),
  stageUnlockShockwave: loadTexture("assets/runtime/v2/mission-fx/stage_unlock_shockwave_atlas_4x4.png"),
  energyBeam: loadTexture("assets/runtime/v2/mission-fx/energy_transfer_beam_vertical.png"),
  relicParticles: loadTexture("assets/runtime/v2/mission-fx/relic_particles_atlas_4x4.png"),
  astronautToolParticles: loadTexture("assets/runtime/v2/projectiles/impact_ring_atlas_4x1_1024.png"),
  genericEnergyHit: loadTexture("assets/runtime/v2/projectiles/impact_ring_atlas_4x1_1024.png"),
  targetLockReticle: loadTexture("assets/runtime/v2/projectiles/target_lock_ring_1024.png"),
  clickPulse: loadTexture("assets/runtime/v2/projectiles/target_lock_ring_1024.png"),
  slowMotionVignette: loadTexture("assets/runtime/v2/projectiles/target_lock_field_1024.png"),
  timeDilationField: loadTexture("assets/runtime/v2/projectiles/target_lock_field_1024.png"),
  zeroGRotationStreaks: loadTexture("assets/runtime/v2/projectiles/zero_g_stabilize_field_1024.png"),
  aimAssistLine: loadTexture("assets/runtime/v2/projectiles/zero_g_stabilize_field_1024.png"),
  fireReleaseFlash: loadTexture("assets/runtime/v2/projectiles/muzzle_charge_atlas_4x1_1024.png"),
  premiumGemBurst: loadTexture("assets/runtime/gravedad-zero/vfx/vfx_gem_pickup_burst_strip.png"),
  closingTargetLockRing: loadTexture("assets/runtime/gravedad-zero/aim-fx/target_lock_ring_1024.png"),
  closingTargetLockField: loadTexture("assets/runtime/gravedad-zero/aim-fx/target_lock_field_1024.png"),
  closingStabilizeField: loadTexture("assets/runtime/gravedad-zero/aim-fx/zero_g_stabilize_field_1024.png"),
  closingShipProjectile: loadTexture(v2AssetPath("projectile.pulse")),
  closingAstronautProjectile: loadTexture(v2AssetPath("projectile.tool")),
  closingLongTrail: loadTexture(v2AssetPath("projectile.trail.long")),
  closingShortTrail: loadTexture(v2AssetPath("projectile.trail.short")),
  closingMuzzleCharge: loadTexture(v2AssetPath("projectile.charge")),
};

const visualPackTextures = {
  thrusterCore: loadTexture("assets/runtime/v3/thrusters/thruster_core_color.png"),
  thrusterCone: loadTexture("assets/runtime/v3/thrusters/directional_cone_color.png"),
  thrusterWake: loadTexture("assets/runtime/v3/thrusters/clean_wake_color.png"),
  thrusterDistortion: loadVisualDataTexture("assets/runtime/v3/thrusters/distortion_noise.png"),
  chargedCore: loadTexture("assets/runtime/v3/combat/charged_core.png"),
  impactRing: loadTexture("assets/runtime/v3/combat/impact_ring_neutral.png"),
  sparkAtlas: loadTexture("assets/runtime/v3/combat/spark_atlas_4x1.png"),
  shieldRipple: loadTexture("assets/runtime/v3/shields/shield_ripple.png"),
  cockpitReflection: loadTexture("assets/runtime/v3/shields/cockpit_reflection.png"),
  scannerRing: loadTexture("assets/runtime/v3/discovery/scanner_ring.png"),
  gravityField: loadTexture("assets/runtime/v3/discovery/gravity_field_ring.png"),
  gemCore: loadTexture("assets/runtime/v3/gem/gem_internal_core.png"),
  gemFresnel: loadVisualDataTexture("assets/runtime/v3/gem/gem_fresnel_lut.png"),
  gemNoise: loadVisualDataTexture("assets/runtime/v3/gem/gem_crystal_noise.png"),
};

const derivedVisualTextureCache = new Map();

function derivedVisualTexture(stem, kind, color = false) {
  const path = `assets/runtime/v3-derived/${stem}/${kind}.png`;
  const key = `${path}:${color ? "color" : "data"}`;
  if (!derivedVisualTextureCache.has(key)) {
    derivedVisualTextureCache.set(key, color ? loadTexture(path) : loadVisualDataTexture(path));
  }
  return derivedVisualTextureCache.get(key);
}

function derivedVisualMaps(stem, asset) {
  return {
    albedo: asset.texture,
    normal: derivedVisualTexture(stem, "normal"),
    roughness: derivedVisualTexture(stem, "roughness"),
    emissive: derivedVisualTexture(stem, "emissive", true),
    cockpit: derivedVisualTexture(stem, "cockpit_mask"),
    depth: derivedVisualTexture(stem, "depth_mask"),
    aspect: asset.aspect,
  };
}

const premiumFxFrames = {
  gemBurst: makeStripFrameAssets(missionFxTextures.premiumGemBurst, 4),
  closingMuzzleCharge: makeStripFrameAssets(missionFxTextures.closingMuzzleCharge, 4),
};

const robotFxTextures = {
  idle: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_idle_2048.png"),
  ready: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_talk_2048.png"),
  alert: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_alert_2048.png"),
  hint: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_talk_2048.png"),
  stage_clear: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_success_2048.png"),
  glowCyan: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_idle_emissive_2048.png"),
  glowMagenta: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_alert_emissive_2048.png"),
};

const companionTextures = {
  frontAlbedo: loadTexture("assets/runtime/gravedad-zero/companion/companion_front_albedo_2048.png"),
  frontEmissive: loadTexture("assets/runtime/gravedad-zero/companion/companion_front_emissive_2048.png"),
  sidePanel: loadTexture("assets/runtime/gravedad-zero/companion/companion_side_panel_albedo_1024.png"),
  sidePanelEmissive: loadTexture("assets/runtime/gravedad-zero/companion/companion_side_panel_emissive_1024.png"),
  topAlbedo: loadTexture("assets/runtime/gravedad-zero/companion/companion_top_albedo_1024.png"),
  face: {
    idle: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_idle_2048.png"),
    talk: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_talk_2048.png"),
    alert: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_alert_2048.png"),
    success: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_success_2048.png"),
    blink: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_blink_2048.png"),
  },
  faceEmissive: {
    idle: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_idle_emissive_2048.png"),
    talk: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_talk_emissive_2048.png"),
    alert: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_alert_emissive_2048.png"),
    success: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_success_emissive_2048.png"),
    blink: loadTexture("assets/runtime/gravedad-zero/companion/companion_face_blink_emissive_2048.png"),
  },
};

function cropCompanionFaceTexture(texture) {
  texture.repeat.set(0.76, 0.58);
  texture.offset.set(0.12, 0.19);
}

Object.values(companionTextures.face).forEach(cropCompanionFaceTexture);
Object.values(companionTextures.faceEmissive).forEach(cropCompanionFaceTexture);

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
    path: "assets/runtime/v2/audio/aim_click_ping_01.wav",
    volume: 0.25,
  },
  aim_lock_confirm: {
    path: "assets/runtime/v2/audio/aim_lock_confirm_02.wav",
    volume: 0.28,
  },
  slow_motion_enter: {
    path: "assets/runtime/v2/audio/slow_motion_enter_03.wav",
    volume: 0.24,
  },
  zero_g_rotate_whoosh: {
    path: "assets/runtime/v2/audio/zero_g_rotate_whoosh_04.wav",
    volume: 0.24,
  },
  fire_release_snap: {
    path: "assets/runtime/v2/audio/fire_release_snap_05.wav",
    volume: 0.28,
  },
  astronaut_tool_fire_cue: {
    path: "assets/runtime/v2/audio/astronaut_tool_fire_cue_06.wav",
    volume: 0.30,
  },
  ship_heavy_fire_cue: {
    path: "assets/runtime/v2/audio/ship_heavy_fire_cue_07.wav",
    volume: 0.34,
  },
  invalid_target_blip: {
    path: "assets/runtime/v2/audio/invalid_target_blip_08.wav",
    volume: 0.18,
  },
  slow_motion_exit_snap: {
    path: "assets/runtime/v2/audio/slow_motion_exit_snap_09.wav",
    volume: 0.22,
  },
  robot_open_hint: {
    path: "assets/runtime/v2/audio/robot_open_hint_01.wav",
    volume: 0.24,
  },
  robot_close_hint: {
    path: "assets/runtime/v2/audio/robot_close_hint_02.wav",
    volume: 0.18,
  },
  robot_alert_ping: {
    path: "assets/runtime/v2/audio/robot_alert_ping_03.wav",
    volume: 0.24,
  },
  robot_stage_clear: {
    path: "assets/runtime/v2/audio/robot_stage_clear_chime_04.wav",
    volume: 0.28,
  },
  robot_item_update: {
    path: "assets/runtime/v2/audio/robot_item_update_05.wav",
    volume: 0.18,
  },
  long_travel_low_rumble: {
    path: "assets/runtime/v2/audio/ambient_space_low_loop_14.wav",
    volume: 0.055,
    loop: true,
  },
  route_detected_ping: {
    path: "assets/runtime/v2/audio/ui_hover_sonar_02.wav",
    volume: 0.18,
  },
  mission_zone_enter: {
    path: "assets/runtime/v2/audio/motion_liftoff_ignition_08.wav",
    volume: 0.22,
  },
  gem_acquired: {
    path: "assets/runtime/v2/audio/reward_unlock_sparkle_refined_13.wav",
    volume: 0.32,
  },
  gem_counter_update: {
    path: "assets/runtime/v2/audio/ui_mission_accept_refined_03.wav",
    volume: 0.22,
  },
  stage_route_unlocked: {
    path: "assets/runtime/v2/audio/reward_unlock_sparkle_refined_13.wav",
    volume: 0.26,
  },
  navigation_whoosh: {
    path: "assets/runtime/v2/audio/motion_speed_whoosh_refined_09.wav",
    volume: 0.15,
  },
  aim_stabilize: {
    path: "assets/runtime/v2/audio/zero_g_lock_stabilize.wav",
    volume: 0.20,
  },
  sector_beacon: {
    path: "assets/runtime/v2/audio/sector_beacon_far_ping.wav",
    volume: 0.18,
  },
  target_orbit_passby: {
    path: "assets/runtime/v2/audio/target_orbit_passby.wav",
    volume: 0.14,
  },
  turbo_ramp: {
    path: "assets/runtime/v2/audio/turbo_engine_ramp.wav",
    volume: 0.18,
  },
  micro_thruster_burst: {
    path: "assets/runtime/v2/audio/motion_speed_whoosh_refined_09.wav",
    volume: 0.14,
  },
  recoil_hit: {
    path: "assets/runtime/v2/audio/combat_shield_hit_refined_11.wav",
    volume: 0.18,
  },
  impact_hit_stop: {
    path: "assets/runtime/v2/audio/combat_shield_hit_refined_11.wav",
    volume: 0.16,
  },
  final_relic_touch: { file: "astronaut_touch_relic_11.wav", volume: 0.30 },
  final_core_collapse: { file: "large_obstacle_break_07.wav", volume: 0.34 },
  final_shockwave: { file: "stage_unlocked_arcade_13.wav", volume: 0.30 },
  final_energy_beam: { file: "energy_transfer_to_ship_12.wav", volume: 0.32 },
  final_signal_acquired: {
    path: "assets/runtime/v2/audio/reward_unlock_sparkle_refined_13.wav",
    volume: 0.35,
  },
  mission_complete_resolve: {
    path: "assets/runtime/v2/audio/ui_mission_accept_refined_03.wav",
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
  aim_stabilize: "aim_stabilize",
  sector_beacon: "sector_beacon",
  target_orbit_passby: "target_orbit_passby",
  turbo_ramp: "turbo_ramp",
  slow_motion_enter: "slow_motion_enter",
  zero_g_rotate_whoosh: "zero_g_rotate_whoosh",
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
    this.basePath = "assets/runtime/v2/audio";
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

  update(shipVelocity, transition, delta, intensity = 1) {
    if (!this.ready) return;
    const speed = THREE.MathUtils.clamp(shipVelocity.length() * (0.84 + intensity * 0.22), 0, 1);
    const move = THREE.MathUtils.smoothstep(speed, 0.07, 0.52);
    const boost = transition ? 1 : THREE.MathUtils.smoothstep(speed + Math.max(0, intensity - 1) * 0.18, 0.58, 1);

    this.fadeLoop("idle", this.loopItems.idle.volume * (0.88 - move * 0.42) * Math.min(1.18, intensity), delta);
    this.fadeLoop("move", this.loopItems.move.volume * move * (1 - boost * 0.30) * Math.min(1.30, intensity), delta);
    this.fadeLoop("boost", this.loopItems.boost.volume * boost * Math.min(1.42, intensity), delta);

    this.speedCueCooldown = Math.max(0, this.speedCueCooldown - delta);
    if (!transition && speed > 0.74 && this.speedCueCooldown <= 0) {
      this.playOneShot("speed");
      this.speedCueCooldown = THREE.MathUtils.clamp(1.8 - intensity * 0.44, 0.72, 1.4);
    }

    if (transition && !this.transitionWasActive) {
      this.playOneShot("warp");
    }
    this.transitionWasActive = Boolean(transition);
  }
}

const shipEngineAudio = new ShipEngineAudio();

function missionAssetUrl(path) {
  return `/${String(path).replace(/^\/+/, "")}`;
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

function fadeMissionLoop(id, targetVolume, delta) {
  const loop = missionAudio.loops[id];
  if (!loop) return;
  loop.volume = THREE.MathUtils.lerp(loop.volume, THREE.MathUtils.clamp(targetVolume, 0, 0.12), 1 - Math.pow(0.001, delta));
}

function currentAudioIntensity() {
  const mode = SPEED_MODES[speedState.modeIndex];
  const turbo = currentTurboUnlock();
  return speedState.currentTuning.audioIntensity *
    mode.audio *
    (0.92 + (speedState.currentMultiplier - 1) * 0.24 + speedState.turboPulse * turbo.audio * 0.20);
}

function updateShipEngineAudio(shipVelocity, transition, delta) {
  const intensity = currentAudioIntensity();
  shipEngineAudio.update(shipVelocity, transition, delta, intensity);
  if (missionAudio.ready) {
    playMissionAudio("long_travel_low_rumble");
    const speedAmount = THREE.MathUtils.clamp(shipVelocity.length() * speedState.currentMultiplier, 0, 1);
    const rumbleTarget = missionAudioItems.long_travel_low_rumble.volume * (0.42 + speedAmount * 0.58) * Math.min(1.55, intensity);
    fadeMissionLoop("long_travel_low_rumble", rumbleTarget, delta);
  }
}

function playMissionAudio(id) {
  const item = missionAudioItems[id];
  if (!item || !missionAudio.ready) return null;
  const source = item.path || `assets/runtime/v2/audio/${item.file}`;

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
  renderMissionProgress(progress);
  updateGemHud();
}

function makeHudCounterRow(label, value) {
  const row = document.createElement("div");
  row.className = "mission-counter-row";
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  const valueEl = document.createElement("strong");
  valueEl.textContent = value;
  row.append(labelEl, valueEl);
  return row;
}

function renderMissionProgress(progress = "") {
  missionProgress.replaceChildren();
  missionProgress.classList.remove("mission-progress-stack", "mission-progress-final");

  if (mission01.finalSignalAcquired || mission01.finalComplete) {
    missionProgress.classList.add("mission-progress-stack", "mission-progress-final");
    missionProgress.append(
      makeHudCounterRow("RUTA", "ESTABILIZADA"),
      makeHudCounterRow("ESTADO", mission01.finalComplete ? "MISSION COMPLETE" : "SEÑAL FINAL")
    );
    return;
  }

  if (mission01.started) {
    missionProgress.classList.add("mission-progress-stack");
    missionProgress.append(
      makeHudCounterRow("FRAGMENTOS", `${mission01.smallDestroyed}/${mission01.smallRequired}`),
      makeHudCounterRow("NÚCLEOS", `${mission01.largeDestroyed}/${mission01.largeRequired}`)
    );
    return;
  }

  missionProgress.textContent = progress;
}

function updateGemHud() {
  const gems = THREE.MathUtils.clamp(mission01.gems, 0, 3);
  if (mission01.finalSignalAcquired || mission01.finalComplete) {
    if (gemHud) gemHud.textContent = "SEÑAL FINAL ADQUIRIDA";
    if (gemBadge) {
      gemBadge.hidden = false;
      gemBadge.dataset.gems = "3";
      gemBadge.textContent = "◆◆◆ FINAL";
    }
    return;
  }
  if (gemHud) gemHud.textContent = `GEMAS ${gems}/3`;
  if (!gemBadge) return;
  gemBadge.hidden = !mission01.started && !mission01.finalStarted && !mission01.finalComplete;
  gemBadge.dataset.gems = String(gems);
  gemBadge.textContent = `${"◆".repeat(gems)}${"◇".repeat(3 - gems)} GEMAS ${gems}/3`;
}

function pulseGemBadge() {
  if (!gemBadge) return;
  gemBadge.classList.remove("is-pulsing");
  void gemBadge.offsetWidth;
  gemBadge.classList.add("is-pulsing");
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

function makeImpulseTexture() {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);

  const core = ctx.createLinearGradient(0, 64, 768, 64);
  core.addColorStop(0, "rgba(35,210,255,0)");
  core.addColorStop(0.18, "rgba(42,225,255,0.16)");
  core.addColorStop(0.54, "rgba(220,78,255,0.34)");
  core.addColorStop(0.82, "rgba(255,255,255,0.22)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  const edge = ctx.createRadialGradient(592, 64, 4, 592, 64, 104);
  edge.addColorStop(0, "rgba(255,255,255,0.36)");
  edge.addColorStop(0.42, "rgba(68,225,255,0.18)");
  edge.addColorStop(1, "rgba(68,225,255,0)");

  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.roundRect(32, 42, 680, 44, 22);
  ctx.fill();
  ctx.fillStyle = edge;
  ctx.fillRect(456, 0, 256, 128);

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

const configuredSeed = Number(params.get("seed"));
const random = seedRandom(Number.isFinite(configuredSeed) ? configuredSeed : 620);
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

function createIntegratedPlanet({
  kind,
  radius,
  position,
  routeY,
  opacity = 1,
  map = null,
  normalMap = null,
  emissiveMap = null,
  emissiveIntensity = null,
  unlit = false,
  profileStage = 0,
}) {
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
    profileStage,
    spawnStage: profileStage,
    materialLocked: true,
    identityKind: kind,
    radius,
    textureId: map?.uuid || `integrated:${kind}:${profileStage}`,
    worldCategory: "hero",
    worldSource: "integrated",
    worldWrapX: EXPANDED_WORLD_WRAP_X,
    worldWrapY: EXPANDED_WORLD_WRAP_Y,
  };

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 72, 48),
    unlit
      ? new THREE.MeshBasicMaterial({
          map: map || makePremiumPlanetTexture(kind),
          color: 0xffffff,
          transparent: false,
          opacity: 1,
        })
      : new THREE.MeshStandardMaterial({
          map: map || makePremiumPlanetTexture(kind),
          normalMap,
          emissiveMap,
          normalScale: new THREE.Vector2(0.28, 0.28),
          roughness: 0.78,
          metalness: 0.04,
          emissive: kind === "dark" ? 0x260a38 : 0x07325e,
          emissiveIntensity: emissiveIntensity ?? (kind === "dark" ? 0.30 : 0.24),
          transparent: false,
          opacity: 1,
        })
  );
  sphere.userData.baseOpacity = 1;
  sphere.userData.lockOpaque = true;
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
    worldWrapX: interactive ? MISSION_ZONE_WRAP_SPAN : EXPANDED_WORLD_WRAP_X,
    worldWrapY: interactive ? MISSION_ZONE_WRAP_SPAN : EXPANDED_WORLD_WRAP_Y,
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
    name: "BALIZA FRACTURADA",
    subtitle: "OCEANIC FRONTIER / BALIZA FRACTURADA",
    zoneName: "STAGE 1 ZONE",
    gemName: "GEMA 1",
    routeHint: "RUMBO NORTE",
    smallRequired: 3,
    largeRequired: 1,
    smallTargets: [
      { x: -2.22, y: -0.24, z: -2.10, radius: 0.20 },
      { x: 1.54, y: 0.48, z: -2.00, radius: 0.20 },
      { x: -1.16, y: -0.86, z: -2.18, radius: 0.19 },
    ],
    largeTargets: [{ x: 1.38, y: 0.98, z: -2.08, radius: 0.50 }],
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
      { x: -2.54, y: 0.28, z: -2.28, radius: 0.20 },
      { x: 1.92, y: -0.62, z: -2.06, radius: 0.20 },
      { x: -1.62, y: -0.10, z: -2.20, radius: 0.19 },
    ],
    largeTargets: [
      { x: 1.68, y: 0.92, z: -2.18, radius: 0.49 },
      { x: -2.08, y: 0.22, z: -2.24, radius: 0.52 },
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
      { x: -2.76, y: -0.56, z: -2.30, radius: 0.20 },
      { x: 2.12, y: 0.18, z: -2.10, radius: 0.20 },
      { x: -2.02, y: -0.74, z: -2.22, radius: 0.19 },
    ],
    largeTargets: [
      { x: -1.86, y: 0.94, z: -2.18, radius: 0.49 },
      { x: 1.82, y: 0.30, z: -2.24, radius: 0.52 },
      { x: 2.54, y: -0.42, z: -2.18, radius: 0.47 },
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
  if (config === missionStageConfigs[0]) {
    return `ESCANEÁ LA BALIZA / RECUPERÁ ${config.smallRequired} FRAGMENTOS / ${largeObjectiveLabel(config.largeRequired)}`;
  }
  return `RECUPERÁ ${config.smallRequired} FRAGMENTOS DE SEÑAL / ${largeObjectiveLabel(config.largeRequired)}`;
}

const TARGET_MOTION_PROFILES = [
  {
    name: "stage1_drift",
    orbitRadius: [0.14, 0.28],
    orbitSpeed: [0.24, 0.40],
    driftRadius: [0.05, 0.14],
    driftSpeed: [0.20, 0.30],
    predictionLead: 0.16,
    chaseRequired: false,
  },
  {
    name: "stage2_chase",
    orbitRadius: [0.34, 0.62],
    orbitSpeed: [0.58, 0.92],
    driftRadius: [0.22, 0.42],
    driftSpeed: [0.42, 0.66],
    predictionLead: 0.30,
    chaseRequired: true,
  },
  {
    name: "stage3_volatile",
    orbitRadius: [0.48, 0.82],
    orbitSpeed: [0.92, 1.38],
    driftRadius: [0.30, 0.56],
    driftSpeed: [0.62, 0.92],
    predictionLead: 0.42,
    chaseRequired: true,
  },
];

function rangeValue(range, seed) {
  const fraction = seed - Math.floor(seed);
  return THREE.MathUtils.lerp(range[0], range[1], fraction);
}

function assignMissionTargetMotion(target, stageIndex, role, index) {
  const profile = TARGET_MOTION_PROFILES[THREE.MathUtils.clamp(stageIndex, 0, TARGET_MOTION_PROFILES.length - 1)];
  const seed = (stageIndex + 1) * 0.173 + (index + 1) * 0.311 + (role === "large" ? 0.527 : 0.091);
  const roleScale = role === "large" ? 1.28 : 1;
  const direction = index % 2 === 0 ? 1 : -1;
  target.userData.motion = {
    name: profile.name,
    anchor: target.userData.base.clone(),
    phase: seed * Math.PI * 2,
    orbitRadius: new THREE.Vector2(
      rangeValue(profile.orbitRadius, seed * 3.17) * roleScale,
      rangeValue(profile.orbitRadius, seed * 5.23) * (role === "large" ? 0.82 : 0.70)
    ),
    orbitSpeed: rangeValue(profile.orbitSpeed, seed * 7.11) * direction,
    driftRadius: new THREE.Vector2(
      rangeValue(profile.driftRadius, seed * 2.13) * roleScale,
      rangeValue(profile.driftRadius, seed * 4.79) * 0.68
    ),
    driftSpeed: rangeValue(profile.driftSpeed, seed * 6.31) * -direction,
    predictionLead: profile.predictionLead * (role === "large" ? 1.25 : 1),
    chaseRequired: profile.chaseRequired,
  };
  target.userData.velocity2D = target.userData.velocity2D || new THREE.Vector2();
  target.userData.screenVelocity2D = target.userData.screenVelocity2D || new THREE.Vector2();
  target.userData.previousScreenPoint = null;
  target.userData.evasionOffset = target.userData.evasionOffset || new THREE.Vector2();
  target.userData.repulsionCooldown = 0;
  target.userData.vulnerable = stageIndex === 0;
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
  finalOrientation: 0,
  finalAngularVelocity: 0,
  finalFired: false,
  zoneIndex: initialStageIndex,
};

function dispatchV2Mission(type, payload = null) {
  return v2Runtime.mission.dispatch({ type, payload, at: clock.elapsedTime });
}

const aimAssist = {
  active: false,
  target: null,
  shooter: null,
  mode: "normal",
  phase: "idle",
  timing: null,
  clickPoint: new THREE.Vector2(),
  firePoint: new THREE.Vector2(),
  predictedPoint: new THREE.Vector2(),
  targetVelocity: new THREE.Vector2(),
  time: 0,
  duration: 1.04,
  fireTime: 0.54,
  impactTime: 0.76,
  projectileTravel: 0.45,
  fired: false,
  impacted: false,
  projectile: null,
  recoil: 0,
  recoilRoll: 0,
  orientationAngle: 0,
  angularVelocity: 0,
  targetRotation: 0,
  baseDirection: "right",
  hitStop: 0,
  distance: 0,
  maxRange: 1,
  successChance: 1,
  willHit: true,
  missPoint: new THREE.Vector2(),
  played: {},
};

const qaTelemetry = {
  aimAttempts: 0,
  realHits: 0,
  realMisses: 0,
  forcedHits: 0,
  forcedMisses: 0,
  lastAim: null,
  lastImpact: null,
  lastCompanionMessage: "",
};

const AIM_TIMINGS = {
  normal: {
    lock: 0.35,
    stabilize: 0.45,
    orient: 0.40,
    charge: 0.0,
    projectileTravel: 0.45,
    impactHold: 0.0,
    recover: 0.30,
  },
  major: {
    lock: 0.75,
    stabilize: 1.00,
    orient: 1.05,
    charge: 0.70,
    projectileTravel: 1.65,
    impactHold: 0.40,
    recover: 0.35,
  },
};

function aimTimingSchedule(mode) {
  const timing = AIM_TIMINGS[mode] || AIM_TIMINGS.normal;
  const fireTime = timing.lock + timing.stabilize + timing.orient + (timing.charge || 0);
  const impactTime = fireTime + timing.projectileTravel;
  return {
    ...timing,
    fireTime,
    impactTime,
    duration: impactTime + (timing.impactHold || 0) + timing.recover,
  };
}

const robotCompanion = {
  state: "idle",
  message: "RUMBO EN ESPERA",
  panelOpen: false,
  pulse: 0,
  blinkTimer: 3.8,
  blinkTime: 0,
  faceState: "idle",
  focus: null,
  focusTimer: 0,
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
    subtitle: "AUTOAIM + TURBO",
    body: ["WASD / FLECHAS", "CLICK / AUTOAIM", "F / TURBO", "ESC / PAUSA"],
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
  { kind: "ocean", radius: 2.8, position: new THREE.Vector3(8.4, 0, -11.2), routeY: -9.0, opacity: 1, map: worldTextures.v2Ocean, normalMap: worldTextures.v2OceanNormal, emissiveMap: worldTextures.v2OceanEmissive, profileStage: 0 },
  { kind: "dark", radius: 2.48, position: new THREE.Vector3(69.2, -0.05, -10.95), routeY: 51.8, opacity: 1, map: worldTextures.v2Mechanical, normalMap: worldTextures.v2MechanicalNormal, emissiveMap: worldTextures.v2MechanicalEmissive, profileStage: 1 },
  { kind: "dark", radius: 2.62, position: new THREE.Vector3(-72.5, -0.10, -10.85), routeY: 111.6, opacity: 1, map: worldTextures.v2Synthetic, normalMap: worldTextures.v2SyntheticNormal, emissiveMap: worldTextures.v2SyntheticEmissive, emissiveIntensity: 0.34, profileStage: 2 },
  { kind: "dark", radius: 1.72, position: new THREE.Vector3(-10.6, 0, -9.8), routeY: 4.6, opacity: 0.76, map: worldTextures.cyberEarth, profileStage: 1 },
  { kind: "ocean", radius: 1.35, position: new THREE.Vector3(11.8, 0, -14.0), routeY: 18.0, opacity: 0.78, map: worldTextures.nebulaCore, profileStage: 1 },
  { kind: "dark", radius: 2.25, position: new THREE.Vector3(-8.8, 0, -11.8), routeY: 32.5, opacity: 0.92, map: worldTextures.darkCraterPremium, emissiveMap: worldTextures.deepDarkEmissiveOverlay, emissiveIntensity: 0.36, unlit: true, profileStage: 2 },
  { kind: "ocean", radius: 1.72, position: new THREE.Vector3(9.6, 0, -10.6), routeY: 48.0, opacity: 0.82, map: worldTextures.auroraGas, profileStage: 1 },
  { kind: "dark", radius: 2.55, position: new THREE.Vector3(-12.6, 0, -12.4), routeY: 67.5, opacity: 0.94, map: worldTextures.darkCraterPremium, emissiveMap: worldTextures.deepDarkEmissiveOverlay, emissiveIntensity: 0.44, unlit: true, profileStage: 2 },
  { kind: "ocean", radius: 1.58, position: new THREE.Vector3(7.2, 0, -13.8), routeY: 82.0, opacity: 0.86, map: worldTextures.nebulaCore, emissiveMap: worldTextures.deepDarkEmissiveOverlay, emissiveIntensity: 0.38, unlit: true, profileStage: 3 },
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

function missionZoneSpecForStage(stageIndex) {
  return missionZoneSpecs[THREE.MathUtils.clamp(stageIndex, 0, missionZoneSpecs.length - 1)] || missionZoneSpecs[0];
}

const MISSION_ZONE_LAYOUT = [
  { stage: 0, name: "SECTOR_01", center: new THREE.Vector2(0, WORLD_MIN_Y + 10), targetRingRadius: 2.60, minDistanceFromPlayer: 1.85 },
  { stage: 1, name: "SECTOR_02", center: new THREE.Vector2(92, WORLD_MIN_Y + 78), targetRingRadius: 3.65, minDistanceFromPlayer: 2.80 },
  { stage: 2, name: "SECTOR_03", center: new THREE.Vector2(-96, WORLD_MIN_Y + 146), targetRingRadius: 4.70, minDistanceFromPlayer: 3.65 },
  { stage: 3, name: "FINAL", center: new THREE.Vector2(18, WORLD_MIN_Y + 214), targetRingRadius: 5.45, minDistanceFromPlayer: 4.25 },
];

function missionZoneLayoutForStage(stageIndex) {
  return MISSION_ZONE_LAYOUT[THREE.MathUtils.clamp(stageIndex, 0, MISSION_ZONE_LAYOUT.length - 1)] || MISSION_ZONE_LAYOUT[0];
}

function missionTargetParallax(z) {
  return THREE.MathUtils.mapLinear(z, -18, 2, 0.05, 0.50);
}

function missionTargetAnchor(stageIndex, spec, role, index) {
  const zone = missionZoneSpecForStage(stageIndex);
  const layout = missionZoneLayoutForStage(stageIndex);
  const parallax = missionTargetParallax(spec.z);
  const trackingX = layout.center.x * (0.78 + parallax * 0.28);
  const trackingY = layout.center.y * (0.88 + parallax * 0.16);
  const stageScale = 1 + stageIndex * 0.16;
  const roleScale = role === "large" ? 1.38 : 1.0;
  const angle = -Math.PI * 0.5 + index * 1.74 + stageIndex * 0.56 + (role === "large" ? 0.74 : 0);
  const radius =
    (layout.targetRingRadius + index * (role === "large" ? 0.36 : 0.22)) *
    stageScale *
    (role === "large" ? 1.10 : 1);
  const screenOffset = new THREE.Vector2(
    spec.x * 0.16 + Math.cos(angle) * radius * roleScale,
    spec.y * 0.16 + Math.sin(angle) * radius * 0.72
  );
  if (screenOffset.length() < layout.minDistanceFromPlayer) {
    screenOffset.setLength(layout.minDistanceFromPlayer + index * 0.18 + (role === "large" ? 0.30 : 0));
  }
  return {
    x: trackingX + screenOffset.x,
    y: trackingY + screenOffset.y,
    zone,
    layout,
    parallax,
  };
}

function placeMissionTarget(target, spec) {
  const stageIndex = target.userData.stageIndex ?? mission01.currentStageIndex ?? state.stageIndex;
  const role = target.userData.missionRole ?? "small";
  const index = target.userData.targetIndex ?? 0;
  const anchor = missionTargetAnchor(stageIndex, spec, role, index);
  target.userData.base.set(anchor.x, anchor.y, spec.z);
  target.userData.routeY = anchor.y;
  target.userData.zoneCenter = new THREE.Vector2(anchor.zone.x, anchor.zone.y);
  target.userData.sectorAnchor = anchor.layout.center.clone();
  target.userData.targetOrbitRing = anchor.layout.targetRingRadius;
  target.userData.targetSpawnMinDistance = anchor.layout.minDistanceFromPlayer;
  target.userData.parallax = anchor.parallax;
  target.userData.worldWrapX = MISSION_ZONE_WRAP_SPAN;
  target.userData.worldWrapY = MISSION_ZONE_WRAP_SPAN;
  target.position.copy(target.userData.base);
  target.userData.radius = spec.radius;
  target.userData.hitRadius = spec.radius * (target.userData.missionRole === "large" ? 3.45 : 3.7);
  target.userData.targetable = false;
  target.userData.discovery = {
    id: `stage-${stageIndex}-${role}-${index}`,
    position: { x: 0, y: 0 },
    state: "unknown",
    signalStrength: 0,
    scanProgress: 0,
  };
  assignMissionTargetMotion(
    target,
    target.userData.stageIndex ?? mission01.currentStageIndex ?? state.stageIndex,
    target.userData.missionRole ?? "small",
    target.userData.targetIndex ?? 0
  );
}

function spawnStageTargets(stageIndex) {
  const safeStageIndex = THREE.MathUtils.clamp(stageIndex, 0, missionStageConfigs.length - 1);
  const existing = mission01.stageTargets.get(safeStageIndex);
  if (existing) return existing;

  const config = currentMissionConfig(safeStageIndex);
  const layout = missionZoneLayoutForStage(safeStageIndex);
  const routeBase = layout.center.y;
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
    placeMissionTarget(target, spec);
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
    placeMissionTarget(target, spec);
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
    placeMissionTarget(target, config.smallTargets[index]);
    resetMissionTarget(target, false);
  });
  pool.large.forEach((target, index) => {
    placeMissionTarget(target, config.largeTargets[index]);
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
  for (const [index, target] of pool.small.entries()) {
    target.userData.targetable = false;
    target.userData.discovery = {
      id: `stage-${stageIndex}-small-${index}`,
      position: { x: 0, y: 0 },
      state: index === 0 ? "signal_detected" : "unknown",
      signalStrength: 0,
      scanProgress: index === 0 ? 0.08 : 0,
    };
  }
}

function startMissionForStage(stageIndex) {
  const safeStageIndex = THREE.MathUtils.clamp(stageIndex, 0, missionStageConfigs.length - 1);
  const config = currentMissionConfig(safeStageIndex);
  hideMenu();
  if (state.stageIndex !== safeStageIndex) applyStage(safeStageIndex);
  if (v2Runtime.mission.value.state === "boot") dispatchV2Mission("MISSION_STARTED");
  if (v2Runtime.mission.value.stage !== safeStageIndex) {
    dispatchV2Mission("NEXT_REGION_ENTERED", { stage: safeStageIndex });
  } else {
    dispatchV2Mission("ZONE_ENTERED", { stage: safeStageIndex });
  }
  if (mission01.finalComplete || mission01.finalStarted) return;
  if (params.get("autoMission") === "1" || params.get("qaZone") === "1") {
    const zone = missionZoneSpecForStage(safeStageIndex);
    state.worldOffset.set(zone.x, zone.y);
    state.routeProgress = routeProgressFromWorldY(state.worldOffset.y);
  }
  spawnStageTargets(safeStageIndex);
  clearPreviousStageTargets();
  resetStageMission(safeStageIndex);
  activateStageTargets(safeStageIndex);
  dispatchV2Mission("SMALL_TARGETS_REVEALED", { required: config.smallRequired });
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
    radius,
    textureId: map?.uuid || `orbital:${kind}:${routeY}`,
    worldCategory: kind === "planet" ? "medium" : "debris",
    worldSource: "orbital",
    profileStage: stageWeights.indexOf(Math.max(...stageWeights)),
  };
  if (kind === "planet") {
    object.material.transparent = false;
    object.material.opacity = 1;
    object.userData.baseOpacity = 1;
    object.userData.lockOpaque = true;
  }
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
  for (let i = 0; i < 24; i += 1) {
    const stageBias = i % 3;
    createOrbitalObject({
      kind: "debris",
      position: new THREE.Vector3((random() - 0.5) * 38, (random() - 0.5) * 5.8, -8 - random() * 12),
      routeY: WORLD_MIN_Y + random() * (WORLD_HEIGHT + 18),
      radius: 0.045 + random() * 0.16,
      map: asteroidTextureCycle[i % asteroidTextureCycle.length],
      opacity: 0.14 + random() * 0.20,
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
    "assets/runtime/v2/mission-fx/relic_hologram_alpha_cropped.png",
    "assets/runtime/v2/mission-fx/relic_scanlines_overlay.png",
    "assets/runtime/v2/mission-fx/relic_orbit_ring_01.png",
    "assets/runtime/v2/mission-fx/relic_aura_glow.png",
    "assets/runtime/v2/projectiles/target_lock_ring_1024.png",
    "assets/runtime/v2/projectiles/target_lock_field_1024.png",
    "assets/runtime/v2/projectiles/zero_g_stabilize_field_1024.png",
  ],
};

const proceduralWorld = {
  group: new THREE.Group(),
  chunks: new Map(),
  chunkIdentities: new Map(),
  chunkSize: 96,
  visibleRadius: 2,
  releaseRadius: 3,
  displayScale: 0.12,
  objects: [],
  audioCooldown: 0,
};
const ProceduralWorld = proceduralWorld;
backgroundScene.add(proceduralWorld.group);

const REGION_CONFIGS = {
  north: {
    name: "NORTH_REGION",
    accent: "#62edff",
    planetFamilies: ["planet_ocean_large", "planet_gas_far", "moon", "mechanical_moon"],
    syntheticFamilies: ["synthetic_core", "gravity_node", "orbital_station_body"],
    density: 1.06,
    debris: 0.72,
  },
  south: {
    name: "SOUTH_REGION",
    accent: "#8affc1",
    planetFamilies: ["planet_dark_giant", "planet_ocean_large", "tech_moon", "asteroid_belt_patch"],
    syntheticFamilies: ["broken_gate", "relic_fragment_cluster", "gravity_node"],
    density: 0.96,
    debris: 0.82,
  },
  east: {
    name: "EAST_REGION",
    accent: "#a36dff",
    planetFamilies: ["planet_gas_far", "planet_dark_giant", "mechanical_moon", "tech_moon"],
    syntheticFamilies: ["orbital_station_body", "synthetic_core", "broken_gate"],
    density: 1.12,
    debris: 0.66,
  },
  west: {
    name: "WEST_REGION",
    accent: "#ff5de1",
    planetFamilies: ["planet_dark_giant", "planet_gas_far", "moon", "planet_ocean_large"],
    syntheticFamilies: ["relic_fragment_cluster", "gravity_node", "synthetic_core"],
    density: 1.08,
    debris: 0.70,
  },
  final: {
    name: "FINAL_REGION",
    accent: "#ffffff",
    planetFamilies: ["planet_ocean_large", "planet_dark_giant", "mechanical_moon"],
    syntheticFamilies: ["gravity_node", "broken_gate", "orbital_station_body"],
    density: 1.00,
    debris: 0.58,
  },
};

const ORGANIC_SPAWN_BANDS = {
  offscreenNear: { min: 1.16, max: 1.72 },
  offscreenFar: { min: 1.78, max: 2.72 },
};

const STAGE_WORLD_PROFILES = WORLD_PROFILES;

const proceduralBodyTextures = {
  natural: [
    worldTextures.oceanPrime,
    worldTextures.auroraGas,
    worldTextures.mechanicalMoonPremium,
    worldTextures.nebulaCore,
    worldTextures.darkCraterPremium,
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
    loadTexture("assets/runtime/v2/projectiles/target_lock_field_1024.png"),
  ],
};

const proceduralPremiumTexturePools = {
  STAGE_1_CLEAN_OCEAN: {
    planet_ocean_large: [worldTextures.oceanPrime],
    planet_gas_far: [worldTextures.auroraGas, worldTextures.gasGiant],
    moon: [worldTextures.oceanWorld, worldTextures.oceanPrime],
  },
  STAGE_2_NETWORK_MECHANICAL: {
    planet_network: [worldTextures.mechanicalMoonPremium, worldTextures.networkPlanet],
    mechanical_moon: [worldTextures.mechanicalMoonPremium],
    planet_gas_far: [worldTextures.nebulaCore, worldTextures.auroraGas],
    gravity_node: [worldTextures.nebulaCore, missionFxTextures.timeDilationField],
    broken_gate: [worldTextures.mechanicalMoonPremium, missionFxTextures.relicScanlines],
    orbital_station_body: [worldTextures.mechanicalMoonPremium, worldTextures.nebulaCore],
  },
  STAGE_3_DARK_SYNTHETIC: {
    planet_crater_magenta: [worldTextures.darkCraterPremium],
    planet_dark_giant: [worldTextures.darkCraterPremium, worldTextures.deepDarkEmissiveOverlay],
    mechanical_moon: [worldTextures.mechanicalMoonPremium],
    synthetic_core: [worldTextures.deepDarkEmissiveOverlay, worldTextures.darkCraterPremium],
    relic_fragment_cluster: [worldTextures.deepDarkEmissiveOverlay, missionFxTextures.relicCore],
    gravity_node: [worldTextures.deepDarkEmissiveOverlay, missionFxTextures.timeDilationField],
  },
  FINAL_RELIC_ALIGNMENT: {
    planet_ocean_large: [worldTextures.nebulaCore],
    planet_dark_giant: [worldTextures.deepDarkEmissiveOverlay, worldTextures.darkCraterPremium],
    mechanical_moon: [worldTextures.mechanicalMoonPremium],
    relic_fragment_cluster: [worldTextures.nebulaCore, worldTextures.deepDarkEmissiveOverlay, missionFxTextures.relicGlow],
    orbital_station_body: [worldTextures.nebulaCore, worldTextures.mechanicalMoonPremium],
    gravity_node: [worldTextures.deepDarkEmissiveOverlay, missionFxTextures.relicRingA],
  },
};

function pickTexture(pool, rand) {
  return pool[Math.floor(rand() * pool.length)] || pool[0];
}

function premiumTextureForProceduralBody(kind, profile, rand) {
  const profilePool = proceduralPremiumTexturePools[profile.name]?.[kind];
  if (profilePool) return pickTexture(profilePool, rand);
  if (kind === "planet_ocean_large") return rand() > 0.42 ? worldTextures.oceanPrime : worldTextures.oceanWorld;
  if (kind === "planet_network") return rand() > 0.35 ? worldTextures.mechanicalMoonPremium : worldTextures.networkPlanet;
  if (kind === "planet_crater_magenta") return rand() > 0.35 ? worldTextures.darkCraterPremium : worldTextures.craterWorld;
  if (kind === "planet_dark_giant") return rand() > 0.5 ? worldTextures.darkCraterPremium : worldTextures.deepDarkEmissiveOverlay;
  if (kind === "planet_gas_far") return rand() > 0.5 ? worldTextures.auroraGas : worldTextures.gasGiant;
  if (kind === "mechanical_moon" || kind === "tech_moon") return worldTextures.mechanicalMoonPremium;
  return null;
}

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

function regionForChunk(chunkX, chunkY) {
  if (mission01.finalStarted || mission01.finalComplete) return REGION_CONFIGS.final;
  if (Math.abs(chunkY) >= Math.abs(chunkX)) return chunkY >= 0 ? REGION_CONFIGS.north : REGION_CONFIGS.south;
  return chunkX >= 0 ? REGION_CONFIGS.east : REGION_CONFIGS.west;
}

function currentWorldProfileIndex() {
  const blend = v2Runtime.updateBiome(state.worldOffset, mission01.gems);
  return THREE.MathUtils.clamp(v2Runtime.stageForBiome(blend.primary), 0, STAGE_WORLD_PROFILES.length - 1);
}

function currentWorldProfile() {
  return STAGE_WORLD_PROFILES[currentWorldProfileIndex()];
}

function visualRadiusForBody(object) {
  return THREE.MathUtils.clamp((object.userData.radius || 0.5) * 0.13, 0.10, 0.62);
}

function isOutsideViewportWithMargin(point, radius = 0, margin = 0.35) {
  return (
    point.x < -viewport.aspect - radius - margin ||
    point.x > viewport.aspect + radius + margin ||
    point.y < -1 - radius - margin ||
    point.y > 1 + radius + margin
  );
}

function centralBodyClearanceFade(position, radius = 0.24) {
  const distance = Math.hypot(position.x, position.y);
  const guard = THREE.MathUtils.clamp(0.78 + radius * 1.65, 0.92, 1.46);
  const fade = THREE.MathUtils.smoothstep(distance, guard * 0.74, guard);
  return fade * fade;
}

function screenPointForProceduralBase(base, parallax) {
  const span = proceduralWorld.chunkSize * (proceduralWorld.releaseRadius * 2 + 1);
  return new THREE.Vector2(
    wrapWorldDelta(base.x - state.worldOffset.x * (1 - parallax * 0.42), span) * proceduralWorld.displayScale,
    wrapWorldDelta(base.y - state.worldOffset.y * (1 - parallax * 0.32), span) * proceduralWorld.displayScale
  );
}

function placeProceduralBodyOffscreen(object, rand, bandName = "offscreenNear", forceBand = false) {
  const band = ORGANIC_SPAWN_BANDS[bandName] || ORGANIC_SPAWN_BANDS.offscreenNear;
  const radius = visualRadiusForBody(object);
  let point = screenPointForProceduralBase(object.userData.base, object.userData.parallax);
  const tooFarForUsefulEntry = isOutsideViewportWithMargin(point, radius, 3.2);
  if (forceBand || tooFarForUsefulEntry || !isOutsideViewportWithMargin(point, radius, 0.22)) {
    const side = Math.floor(rand() * 4);
    const span = band.min + rand() * (band.max - band.min);
    const xSign = rand() > 0.5 ? 1 : -1;
    const ySign = rand() > 0.5 ? 1 : -1;
    const desired = new THREE.Vector2(
      side < 2 ? xSign * (viewport.aspect + radius + span * 0.42) : (rand() * 2 - 1) * viewport.aspect * 0.86,
      side >= 2 ? ySign * (1 + radius + span * 0.34) : (rand() * 2 - 1) * 0.86
    );
    object.userData.base.x = desired.x / proceduralWorld.displayScale + state.worldOffset.x * (1 - object.userData.parallax * 0.42);
    object.userData.base.y = desired.y / proceduralWorld.displayScale + state.worldOffset.y * (1 - object.userData.parallax * 0.32);
    point = desired;
  }
  object.position.set(point.x, point.y, object.userData.base.z);
  object.userData.reveal = 0;
  object.userData.discovered = false;
  object.userData.spawnBand = bandName;
  object.scale.setScalar(0.92);
}

function proceduralStageTint(stageAffinity) {
  if (mission01.finalStarted || stageAffinity === 3) return new THREE.Color("#ffffff");
  if (stageAffinity === 2) return new THREE.Color("#ff5de1");
  if (stageAffinity === 1) return new THREE.Color("#a36dff");
  return new THREE.Color("#62edff");
}

function makeBodyMaterial({
  map,
  color = 0xffffff,
  emissive = 0x061426,
  emissiveMap = null,
  emissiveIntensity = 0.22,
  opacity = 0.78,
  metalness = 0.10,
}) {
  return new THREE.MeshStandardMaterial({
    map,
    color,
    roughness: 0.76,
    metalness,
    emissive,
    emissiveMap,
    emissiveIntensity,
    transparent: true,
    opacity,
  });
}

function createOrbitingShards(group, rand, radius, count, color) {
  for (let i = 0; i < count; i += 1) {
    const shard = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius * (0.08 + rand() * 0.075), 1),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.20 + rand() * 0.18,
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
  const count = 8 + Math.floor(rand() * 8);
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
      size: radius * 0.060,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
}

function createLineCage(rand, radius, color) {
  const group = new THREE.Group();
  const count = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < count; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * (0.80 + i * 0.18), radius * 0.010, 8, 72),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.16 + i * 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    ring.rotation.set(Math.PI * (0.34 + rand() * 0.18), rand() * Math.PI, rand() * Math.PI);
    ring.userData.baseOpacity = ring.material.opacity;
    group.add(ring);
  }
  return group;
}

function createProceduralBody(kind, chunkX, chunkY, rand, index, profileOverride = null, regionOverride = null) {
  const chunkSize = proceduralWorld.chunkSize;
  const region = regionOverride || regionForChunk(chunkX, chunkY);
  const profile = profileOverride || currentWorldProfile();
  const base = new THREE.Vector3(
    chunkX * chunkSize + (rand() - 0.5) * chunkSize * 0.92,
    chunkY * chunkSize + (rand() - 0.5) * chunkSize * 0.92,
    -6 - rand() * 22
  );
  const group = new THREE.Group();
  const stageAffinity = (Math.abs(chunkX) + Math.abs(chunkY) + index) % 4;
  const profileTint = new THREE.Color(profile.accent);
  const tint = new THREE.Color(region.accent).lerp(profileTint, 0.52).lerp(proceduralStageTint(stageAffinity), 0.18);
  const vividBody = profile.vividFamilies.includes(kind);
  const largePlanet =
    kind === "planet_far" ||
    kind === "planet_ocean_large" ||
    kind === "planet_dark_giant" ||
    kind === "planet_gas_far" ||
    kind === "planet_network" ||
    kind === "planet_crater_magenta";
  const midPlanet = kind === "planet_mid";
  const moonLike = kind === "moon" || kind === "tech_moon" || kind === "mechanical_moon";
  const radius =
    largePlanet
      ? 2.15 + rand() * 2.65
      : midPlanet
        ? 1.05 + rand() * 1.25
        : moonLike
          ? 0.46 + rand() * 0.62
          : kind === "debris_cluster" || kind === "foreground_shards" || kind === "asteroid_belt_patch"
            ? 0.12 + rand() * 0.22
            : 0.38 + rand() * 0.55;
  const premiumMap = premiumTextureForProceduralBody(kind, profile, rand);
  const naturalMap = premiumMap || proceduralBodyTextures.natural[Math.floor(rand() * proceduralBodyTextures.natural.length)];
  const syntheticMap = premiumMap || proceduralBodyTextures.synthetic[Math.floor(rand() * proceduralBodyTextures.synthetic.length)];
  const decorative =
    kind === "debris_cluster" ||
    kind === "foreground_shards" ||
    kind === "moon" ||
    kind === "asteroid_belt_patch";
  const opacity = largePlanet || midPlanet
    ? 1
    : vividBody
      ? 0.82 + rand() * 0.12
      : decorative
        ? 0.22 + rand() * 0.20
        : 0.48 + rand() * 0.24;

  group.userData = {
    kind,
    region: region.name,
    profile: profile.name,
    profileStage: STAGE_WORLD_PROFILES.indexOf(profile),
    spawnStage: stageAffinity,
    materialLocked: true,
    textureProfile: profile.name,
    textureId: naturalMap?.uuid || `${profile.name}:${kind}`,
    worldCategory: largePlanet ? "hero" : midPlanet || moonLike ? "medium" : depthKindCategory(kind),
    worldSource: "procedural",
    vividBody,
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

  if (largePlanet || midPlanet || kind === "moon") {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, largePlanet ? 72 : 44, largePlanet ? 42 : 26),
      makeBodyMaterial({
        map: naturalMap,
        color: 0xffffff,
        emissive: stageAffinity === 2 ? 0x31102a : 0x071932,
        emissiveMap: kind === "planet_crater_magenta" || kind === "planet_dark_giant" ? worldTextures.deepDarkEmissiveOverlay : null,
        emissiveIntensity: vividBody ? 0.34 : 0.20,
        opacity,
        metalness: 0.04,
      })
    );
    group.add(sphere);
    sphere.userData.lockOpaque = largePlanet || midPlanet;
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
    if (kind === "planet_ocean_large" || kind === "planet_gas_far" || kind === "planet_network" || kind === "planet_crater_magenta") {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.18, radius * 0.012, 8, 96),
        new THREE.MeshBasicMaterial({
          color: tint,
          transparent: true,
          opacity: 0.12,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      ring.rotation.x = Math.PI * (0.38 + rand() * 0.16);
      ring.rotation.y = rand() * Math.PI;
      group.add(ring);
    }
  } else if (kind === "fractured_beacon") {
    const mastMaterial = new THREE.MeshStandardMaterial({
      color: 0x526775,
      emissive: tint,
      emissiveIntensity: 0.08,
      roughness: 0.58,
      metalness: 0.64,
    });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.12, radius * 0.2, radius * 1.8, 8), mastMaterial);
    mast.rotation.z = -0.12;
    group.add(mast);
    const brokenArm = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.05, radius * 0.11, radius * 0.12), mastMaterial);
    brokenArm.position.set(radius * 0.22, radius * 0.42, 0);
    brokenArm.rotation.z = 0.36;
    group.add(brokenArm);
    for (let i = 0; i < 2; i += 1) {
      const signal = new THREE.Mesh(
        new THREE.TorusGeometry(radius * (0.72 + i * 0.32), radius * 0.025, 8, 72),
        new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.22 - i * 0.05, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      signal.rotation.x = Math.PI * 0.5;
      signal.position.y = radius * 0.62;
      group.add(signal);
    }
    createOrbitingShards(group, rand, radius * 0.72, 3, tint);
  } else if (kind === "orbital_ruins") {
    const ruinMaterial = new THREE.MeshStandardMaterial({
      color: 0x8497a8,
      emissive: tint,
      emissiveIntensity: 0.12,
      roughness: 0.56,
      metalness: 0.62,
    });
    for (let i = 0; i < 5; i += 1) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(radius * (0.82 + i * 0.055), radius * 0.055, 6, 20, Math.PI * (0.58 + rand() * 0.34)),
        ruinMaterial,
      );
      arc.rotation.set(rand() * 0.42, rand() * Math.PI, rand() * Math.PI * 2);
      arc.position.set((rand() - 0.5) * radius * 0.7, (rand() - 0.5) * radius * 0.55, (rand() - 0.5) * radius * 0.35);
      group.add(arc);
    }
    createOrbitingShards(group, rand, radius, 5, tint);
  } else if (kind === "synthetic_core" || kind === "signal_body" || kind === "tech_moon" || kind === "mechanical_moon" || kind === "orbital_station_body") {
    const core = new THREE.Mesh(
      kind === "tech_moon" || kind === "mechanical_moon"
        ? new THREE.SphereGeometry(radius, 38, 22)
        : new THREE.IcosahedronGeometry(radius, kind === "orbital_station_body" ? 3 : 2),
      makeBodyMaterial({
        map: syntheticMap,
        color: 0xffffff,
        emissive: tint,
        emissiveMap: kind === "synthetic_core" ? worldTextures.deepDarkEmissiveOverlay : null,
        emissiveIntensity: vividBody ? 0.40 : 0.28,
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
    if (kind === "orbital_station_body") createOrbitingShards(group, rand, radius, 2 + Math.floor(rand() * 3), tint);
    else createOrbitingShards(group, rand, radius, 2 + Math.floor(rand() * 3), tint);
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
  } else if (kind === "orbital_relic_fragment" || kind === "relic_fragment_cluster") {
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
    createOrbitingShards(group, rand, radius, kind === "relic_fragment_cluster" ? 5 : 3, tint);
  } else {
    const count = kind === "asteroid_belt_patch" ? 4 + Math.floor(rand() * 4) : kind === "debris_cluster" ? 2 + Math.floor(rand() * 3) : 1 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i += 1) {
      const shardRadius = radius * (0.35 + rand() * 0.65);
      const shard = new THREE.Mesh(
        createIntegratedAsteroidGeometry(shardRadius),
        makeBodyMaterial({
          map: i % 3 === 0 ? syntheticMap : naturalMap,
          color: i % 3 === 0 ? tint : 0xffffff,
          emissive: i % 3 === 0 ? tint : 0x071426,
          opacity: kind === "foreground_shards" ? 0.26 : 0.24,
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

function createAuthoredOceanicLandmark(kind, worldX, worldY, seedOffset) {
  let seed = 0x9e3779b9 ^ seedOffset;
  const rand = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed);
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296;
  };
  const body = createProceduralBody(kind, 0, 0, rand, seedOffset, STAGE_WORLD_PROFILES[0], REGION_CONFIGS.north);
  body.userData.base.set(worldX, worldY, 0.8 - seedOffset * 0.25);
  body.userData.profileStage = 0;
  body.userData.spawnStage = 0;
  body.userData.stageAffinity = 0;
  body.userData.worldCategory = "landmark";
  body.userData.worldSource = "authored-scenario";
  body.userData.textureId = `oceanic:${kind}`;
  body.userData.authoredLandmark = true;
  body.userData.radius = kind === "fractured_beacon" ? 0.46 : 0.72;
  body.userData.visualScale = kind === "fractured_beacon" ? 0.48 : 0.62;
  proceduralWorld.objects.push(body);
  return body;
}

const authoredOceanicLandmarks = [
  createAuthoredOceanicLandmark("fractured_beacon", 15, -1, 1),
  createAuthoredOceanicLandmark("orbital_ruins", -14, 6, 2),
];

const scenarioDiscoveryTargets = new Map(
  scenarioForStage(0).landmarks.map((landmark) => {
    const object = authoredOceanicLandmarks.find((candidate) => candidate.userData.kind === landmark.worldKind);
    const savedState = localStorage.getItem(`gz-discovery-${landmark.id}`);
    const restoredState = ["identified", "targetable"].includes(savedState) ? savedState : "unknown";
    return [landmark.id, {
      id: landmark.id,
      position: { x: object?.userData.base.x || 0, y: object?.userData.base.y || 0 },
      state: restoredState,
      signalStrength: 0,
      scanProgress: restoredState === "targetable" ? 1 : restoredState === "identified" ? 0.75 : 0,
      landmark,
      object,
    }];
  }),
);

let lastScenarioDiscoveryMessage = "";
const scenarioScannerState = { active: false, progress: 0 };
let scenarioScanTargetId = null;
let scenarioScanWasHeld = false;

function directionVector(direction) {
  const vectors = {
    up: { x: 0, y: 1 }, down: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
    up_left: { x: -0.707, y: 0.707 }, up_right: { x: 0.707, y: 0.707 },
    down_left: { x: -0.707, y: -0.707 }, down_right: { x: 0.707, y: -0.707 }, idle: { x: 1, y: 0 },
  };
  return vectors[direction] || vectors.idle;
}

function updateScenarioDiscovery(rawDelta) {
  const activeStage = currentWorldProfileIndex();
  const scanHeld = activeStage === 0 && (input.keys.has("e") || input.keys.has("E"));
  let strongestProgress = 0;
  let strongestSignal = 0;
  let activeTarget = null;

  if (activeStage === 0) {
    const player = state.controlMode === "astronaut" ? astronautState.position : state.position;
    const facing = directionVector(state.direction);
    const candidates = [...scenarioDiscoveryTargets].map(([id, entry]) => {
      const visualPosition = entry.object
        ? backgroundObjectScreenPoint(entry.object, new THREE.Vector2())
        : new THREE.Vector2(entry.position.x, entry.position.y);
      return { id, entry, visualPosition, distance: visualPosition.distanceTo(player) };
    });
    if (scanHeld && !scenarioScanWasHeld) {
      const available = candidates.filter(({ entry }) => entry.state !== "targetable");
      scenarioScanTargetId = [...(available.length ? available : candidates)]
        .sort((a, b) => {
          const missionPriority = Number(b.id === "fractured_beacon") - Number(a.id === "fractured_beacon");
          return missionPriority || a.distance - b.distance;
        })[0]?.id || null;
    } else if (!scanHeld) {
      scenarioScanTargetId = null;
    }
    const selected = candidates.find(({ id }) => id === scenarioScanTargetId) || null;

    for (const { id, entry, visualPosition } of candidates) {
      const previousState = entry.state;
      const dx = visualPosition.x - player.x;
      const dy = visualPosition.y - player.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const scansThisTarget = scanHeld && selected?.id === id;
      const scannerFacing = scansThisTarget ? { x: dx / distance, y: dy / distance } : facing;
      const next = v2Runtime.discovery.update(
        { ...entry, position: { x: visualPosition.x, y: visualPosition.y } },
        { player, facing: scannerFacing, scanHeld: scansThisTarget, delta: rawDelta },
      );
      Object.assign(entry, next);
      if (selected?.id === id) {
        strongestProgress = entry.scanProgress;
        strongestSignal = entry.signalStrength;
        activeTarget = entry;
      }
      const object = entry.object;
      if (object) {
        object.userData.discoveryState = entry.state;
        object.userData.scanProgress = entry.scanProgress;
        object.traverse((child) => {
          if (!child.material?.emissive) return;
          child.material.emissiveIntensity = 0.12 + entry.scanProgress * 0.42;
        });
      }
      const messageKey = `${id}:${entry.state}`;
      if (
        previousState !== entry.state &&
        (entry.state === "identified" || entry.state === "targetable") &&
        lastScenarioDiscoveryMessage !== messageKey
      ) {
        lastScenarioDiscoveryMessage = messageKey;
        localStorage.setItem(`gz-discovery-${id}`, entry.state);
        setCompanionAimFeedback(`${entry.landmark.name} · ${entry.state === "targetable" ? "IDENTIFICADA" : "SEÑAL PARCIAL"}`, true);
        playAudioEvent("route_detected_ping");
      }
    }
  }

  scenarioScannerState.active = scanHeld;
  scenarioScannerState.progress = strongestProgress;
  scenarioScanWasHeld = scanHeld;
  if (scanHeld && activeTarget && strongestSignal > 0.12) {
    robotCompanion.focus = "discovery";
    robotCompanion.focusTimer = Math.max(robotCompanion.focusTimer, 0.25);
    robotCompanion.message = `${activeTarget.landmark.name} · ESCANEO ${Math.round(strongestProgress * 100)}%`;
    qaTelemetry.lastCompanionMessage = robotCompanion.message;
  }
}

function spawnChunkObjects(chunkX, chunkY) {
  const key = getChunkKey(chunkX, chunkY);
  if (proceduralWorld.chunks.has(key)) return proceduralWorld.chunks.get(key);
  const region = regionForChunk(chunkX, chunkY);
  let identity = proceduralWorld.chunkIdentities.get(key);
  if (!identity) {
    identity = {
      profileIndex: currentWorldProfileIndex(),
      regionName: region.name,
    };
    proceduralWorld.chunkIdentities.set(key, identity);
  }
  const rand = seededRandom(chunkX, chunkY, identity.profileIndex);
  const profile = STAGE_WORLD_PROFILES[identity.profileIndex] || currentWorldProfile();
  const chunk = { key, x: chunkX, y: chunkY, region: region.name, profile: profile.name, group: new THREE.Group(), objects: [] };
  const density = region.density * profile.density * speedState.currentTuning.spawnDensity;
  const planetPool = [...profile.planetFamilies];
  const syntheticPool = [...profile.syntheticFamilies];
  const vividCount = profile.vividFamilies.length && rand() > 0.34 / density ? 1 : 0;
  const planetCount = 1 + (rand() > 0.58 / density ? 1 : 0) + (density > 1.18 && rand() > 0.72 ? 1 : 0);
  const syntheticCount = 1 + (rand() > 0.48 / density ? 1 : 0) + (density > 1.16 && rand() > 0.78 ? 1 : 0);
  const debrisCount = Math.max(1, Math.round((1.4 + Math.floor(rand() * 3)) * region.debris * profile.debris));
  const selections = [];
  for (let i = 0; i < vividCount; i += 1) {
    selections.push(profile.vividFamilies[Math.floor(rand() * profile.vividFamilies.length)]);
  }
  for (let i = 0; i < planetCount; i += 1) {
    selections.push(planetPool[Math.floor(rand() * planetPool.length)]);
  }
  for (let i = 0; i < syntheticCount; i += 1) {
    selections.push(syntheticPool[Math.floor(rand() * syntheticPool.length)]);
  }
  for (let i = 0; i < debrisCount; i += 1) {
    selections.push(rand() > 0.72 ? "asteroid_belt_patch" : rand() > 0.52 ? "foreground_shards" : "debris_cluster");
  }

  selections.forEach((kind, index) => {
    const body = createProceduralBody(kind, chunkX, chunkY, rand, index, profile, region);
    body.userData.chunkKey = key;
    placeProceduralBodyOffscreen(body, rand, body.userData.vividBody ? "offscreenFar" : "offscreenNear");
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

function depthKindCategory(kind) {
  if (kind?.startsWith("planet_")) return "hero";
  if (
    kind === "synthetic_core" ||
    kind === "fractured_beacon" ||
    kind === "orbital_ruins" ||
    kind === "gravity_node" ||
    kind === "broken_gate" ||
    kind === "relic_fragment_cluster" ||
    kind === "orbital_station_body"
  ) {
    return "landmark";
  }
  if (kind === "moon" || kind === "mechanical_moon" || kind === "tech_moon" || kind === "asteroid_belt_patch") {
    return "medium";
  }
  return "debris";
}

const worldCompositionTelemetry = {
  counts: { hero: 0, landmark: 0, medium: 0, debris: 0 },
  rejected: {},
  violations: [],
  biome: "oceanic",
  biomeMix: 0,
  candidates: 0,
};

function visibleDepthComposition() {
  return { ...worldCompositionTelemetry.counts };
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
    const visualRadius = visualRadiusForBody(object);
    const enteringView = !isOutsideViewportWithMargin(object.position, visualRadius, 0.08);
    if (enteringView) object.userData.discovered = true;
    const revealTarget = object.userData.discovered ? 1 : 0;
    object.userData.reveal = THREE.MathUtils.lerp(
      object.userData.reveal ?? 0,
      revealTarget,
      1 - Math.pow(0.0008, delta)
    );
    const reveal = THREE.MathUtils.smoothstep(object.userData.reveal, 0, 1);
    object.scale.setScalar((0.92 + reveal * 0.08) * (object.userData.visualScale || 1));
    object.rotation.x += delta * object.userData.spin * 0.65;
    object.rotation.y += delta * object.userData.spin;
    object.rotation.z += delta * object.userData.spin * 0.42;

    const finalBoost = mission01.finalStarted ? 0.22 : 0;
    const stageAffinity = object.userData.stageAffinity;
    const unlockedProfileStage = mission01.finalStarted ? 3 : Math.max(state.stageIndex, mission01.gems);
    const stageBlend =
      object.userData.vividBody || object.userData.profileStage <= unlockedProfileStage || stageAffinity === state.stageIndex
        ? 1
        : 0.62;
    const decorativeFade =
      object.userData.kind === "debris_cluster" || object.userData.kind === "foreground_shards" ? 0.58 : 1;
    const pulse = 0.88 + Math.sin(elapsed * (object.userData.kind === "gravity_node" ? 2.6 : 1.2) + object.userData.phase) * 0.12;
    const clearanceFade = centralBodyClearanceFade(object.position, visualRadius);
    object.traverse((child) => {
      if (!child.material || child.userData.baseOpacity === undefined) return;
      child.material.opacity = THREE.MathUtils.clamp(
        (child.userData.baseOpacity * stageBlend * pulse * decorativeFade * clearanceFade + finalBoost) * reveal,
        0,
        0.92
      );
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
  { label: "FINAL ZONE", subtitle: "RUMBO FINAL", x: 18, y: WORLD_MIN_Y + 214, color: 0xffffff },
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
      if (index === 3 && mission01.gems >= 3 && !mission01.finalStarted && !mission01.finalComplete) {
        startFinalSequence(new THREE.Vector2(zone.position.x, zone.position.y));
      } else if (
        mission01.state === "navigation" &&
        index < missionStageConfigs.length &&
        mission01.currentStageIndex === index &&
        !mission01.finalStarted &&
        !mission01.finalComplete
      ) {
        startMissionForStage(index);
      } else if (mission01.started && !mission01.finalComplete) {
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
    if (object.userData.lockOpaque) {
      object.material.transparent = false;
      object.material.opacity = 1;
      object.visible = opacity > 0.05;
      return;
    }
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

    const stageWeight = object.userData.stageWeights[currentWorldProfileIndex()] ?? 1;
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
  opacity: 0.006,
  blending: THREE.AdditiveBlending,
});
for (let i = 0; i < 10; i += 1) {
  const geometry = new THREE.BufferGeometry();
  const length = 0.22 + random() * 0.44;
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

const shipVisualRig = new ShipVisualRig(currentAsset().texture);
const shipSprite = shipVisualRig.surface;
shipVisualRig.setMaps(derivedVisualMaps(`${currentStage()}/directions/${state.direction}`, currentAsset()));
shipGroup.add(shipVisualRig);
const shipMotionRig = new ShipMotionRig();
const shipShieldFx = new ShieldFx(visualPackTextures.shieldRipple);
shipGroup.add(shipShieldFx);

const auraTexture = makeAuraTexture();
const impulseTexture = makeImpulseTexture();
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

const shipThrusters = new DirectionalThrusterSystem({
  core: visualPackTextures.thrusterCore,
  cone: visualPackTextures.thrusterCone,
  wake: visualPackTextures.thrusterWake,
  distortion: visualPackTextures.thrusterDistortion,
});
shipGroup.add(shipThrusters);

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

const astronautVisualRig = astronautInitialAsset
  ? new AstronautVisualRig(
      astronautInitialAsset.texture,
      visualPackTextures.shieldRipple,
      visualPackTextures.scannerRing,
      visualPackTextures.cockpitReflection,
    )
  : null;
const astronautSprite = astronautVisualRig?.surface || null;
if (astronautVisualRig && astronautInitialAsset) {
  astronautVisualRig.setMaps(derivedVisualMaps("astronaut/views/front_right", astronautInitialAsset));
  astronautGroup.add(astronautVisualRig);
}
const biomeVisualLighting = new BiomeVisualLighting(ambientLight, keyLight, magentaLight);

const interactionFx = new THREE.Group();
scene.add(interactionFx);
const activeShots = [];

function debugMissionTargetSummary() {
  const origin = state.controlMode === "ship" ? state.position : astronautState.position;
  return [...mission01.smallAsteroids, ...mission01.largeObstacles]
    .filter((target) => target.visible && target.userData.active && !target.userData.destroyed)
    .map((target) => {
      const screenPoint = backgroundObjectScreenPoint(target, new THREE.Vector2());
      const motion = target.userData.motion || {};
      const velocity = target.userData.screenVelocity2D || target.userData.velocity2D || new THREE.Vector2();
      return {
        role: target.userData.missionRole,
        stageIndex: target.userData.stageIndex,
        distance: Number(origin.distanceTo(screenPoint).toFixed(3)),
        screen: { x: Number(screenPoint.x.toFixed(3)), y: Number(screenPoint.y.toFixed(3)) },
        ring: Number((target.userData.targetOrbitRing || 0).toFixed(2)),
        minDistance: Number((target.userData.targetSpawnMinDistance || 0).toFixed(2)),
        motion: motion.name || "none",
        chaseRequired: !!motion.chaseRequired,
        velocity: Number(velocity.length().toFixed(3)),
      };
    });
}

if (params.has("qaCdp") || params.get("debugAim") === "1") {
  window.__gzDebug = () => ({
    aimActive: aimAssist.active,
    aimMode: aimAssist.mode,
    aimPhase: aimAssist.phase,
    aimTime: Number(aimAssist.time.toFixed(3)),
    aimFireTime: Number((aimAssist.fireTime || 0).toFixed(3)),
    aimImpactTime: Number((aimAssist.impactTime || 0).toFixed(3)),
    aimDuration: Number((aimAssist.duration || 0).toFixed(3)),
    aimFired: aimAssist.fired,
    aimImpacted: aimAssist.impacted,
    activeShots: activeShots.length,
    activeImpacts: activeImpacts.length,
    missionState: mission01.state,
    stageIndex: state.stageIndex,
    currentStageIndex: mission01.currentStageIndex,
    gems: mission01.gems,
    finalStarted: mission01.finalStarted,
    finalComplete: mission01.finalComplete,
    controlMode: state.controlMode,
    worldOffset: { x: Number(state.worldOffset.x.toFixed(2)), y: Number(state.worldOffset.y.toFixed(2)) },
    visibleDepth: visibleDepthComposition(),
    worldComposition: {
      ...worldCompositionTelemetry,
      counts: { ...worldCompositionTelemetry.counts },
      rejected: { ...worldCompositionTelemetry.rejected },
      violations: [...worldCompositionTelemetry.violations],
    },
    authoredLandmarks: proceduralWorld.objects
      .filter((object) => object.userData.authoredLandmark)
      .map((object) => {
        const bounds = projectedBoundsForWorldObject(object);
        return {
          kind: object.userData.kind,
          visible: object.visible,
          discovered: !!object.userData.discovered,
          reveal: Number((object.userData.reveal || 0).toFixed(3)),
          position: {
            x: Number(object.position.x.toFixed(3)),
            y: Number(object.position.y.toFixed(3)),
            z: Number(object.position.z.toFixed(3)),
          },
          bounds: Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, Number(value.toFixed(3))])),
        };
      }),
    scenarioGameplay: {
      gravity: {
        ...scenarioGravitySample,
        stabilizer: scenarioGravity.status,
      },
      discovery: [...scenarioDiscoveryTargets.values()].map((target) => ({
        id: target.id,
        state: target.state,
        signalStrength: Number(target.signalStrength.toFixed(3)),
        scanProgress: Number(target.scanProgress.toFixed(3)),
      })),
    },
    assetCatalogEntries: ASSET_CATALOG.length,
    shield: Number(v2Runtime.shield.value.toFixed(2)),
    visualPack: {
      version: "3.0",
      shipPhysicalMaterial: shipSprite.material.type,
      astronautPhysicalMaterial: astronautSprite?.material?.type || "none",
      thrusterVisible: shipThrusters.visible,
      thrusterLayers: shipThrusters.visible
        ? [shipThrusters.core, shipThrusters.cone, shipThrusters.wake, shipThrusters.distortion]
            .filter((layer) => layer.visible && layer.material.opacity > 0.001).length
        : 0,
      relicGeometry: relicVisual?.outer?.geometry?.type || "none",
      shipShieldVisible: shipShieldFx.visible,
      astronautShieldVisible: astronautVisualRig?.shield?.visible || false,
      scannerVisible: astronautVisualRig?.scanner?.visible || false,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      textures: renderer.info.memory.textures,
    },
    ambientMeteors: ambientMeteorLayer.meteors.filter((meteor) => meteor.visible && meteor.material.opacity > 0.02).length,
    smallTargets: mission01.smallAsteroids.filter((target) => target.visible && target.userData.active && !target.userData.destroyed).length,
    largeTargets: mission01.largeObstacles.filter((target) => target.visible && target.userData.active && !target.userData.destroyed).length,
    targets: debugMissionTargetSummary(),
    qaTelemetry: {
      ...qaTelemetry,
      lastAim: qaTelemetry.lastAim ? { ...qaTelemetry.lastAim } : null,
      lastImpact: qaTelemetry.lastImpact ? { ...qaTelemetry.lastImpact } : null,
    },
  });
}
const activeImpacts = [];

const ambientMeteorProfiles = [
  { count: 16, speed: [0.10, 0.22], scale: [0.026, 0.060], opacity: [0.16, 0.30], diagonal: 0.30 },
  { count: 30, speed: [0.16, 0.34], scale: [0.030, 0.074], opacity: [0.18, 0.34], diagonal: 0.48 },
  { count: 46, speed: [0.24, 0.48], scale: [0.034, 0.090], opacity: [0.20, 0.38], diagonal: 0.62 },
  { count: 22, speed: [0.14, 0.30], scale: [0.046, 0.120], opacity: [0.18, 0.34], diagonal: 0.40 },
];

const ambientMeteorLayer = {
  group: new THREE.Group(),
  meteors: [],
  maxPool: 56,
};
ambientMeteorLayer.group.renderOrder = 10;
scene.add(ambientMeteorLayer.group);

function ambientMeteorStageIndex() {
  if (mission01.finalStarted || mission01.finalComplete || mission01.gems >= 3) return 3;
  return THREE.MathUtils.clamp(currentWorldProfileIndex(), 0, 2);
}

function createAmbientMeteor(index) {
  const mapPool = [worldTextures.asteroidSurface, worldTextures.asteroidPlates, worldTextures.asteroidWide, worldTextures.darkCrater];
  const material = new THREE.MeshStandardMaterial({
    map: mapPool[index % mapPool.length],
    color: 0xffffff,
    emissive: index % 3 === 0 ? 0x120a22 : 0x071426,
    emissiveIntensity: 0.16,
    roughness: 0.82,
    metalness: 0.04,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const meteor = new THREE.Mesh(createIntegratedAsteroidGeometry(1), material);
  meteor.renderOrder = 10;
  meteor.visible = false;
  meteor.userData = {
    ambientMeteor: true,
    active: false,
    velocity: new THREE.Vector2(),
    spin: new THREE.Vector3(0.2 + random() * 0.5, 0.2 + random() * 0.5, 0.2 + random() * 0.5),
    age: 0,
    life: 6,
    fadeIn: 0.8,
    targetOpacity: 0.24,
    radius: 0.05,
    depth: 0.4 + random() * 0.6,
    entered: false,
    collisionCooldown: 0,
    size: "small",
  };
  ambientMeteorLayer.group.add(meteor);
  ambientMeteorLayer.meteors.push(meteor);
  return meteor;
}

for (let i = 0; i < ambientMeteorLayer.maxPool; i += 1) createAmbientMeteor(i);

function spawnAmbientMeteor(meteor, elapsed = 0) {
  const stageIndex = ambientMeteorStageIndex();
  const profile = ambientMeteorProfiles[stageIndex];
  const edge = Math.floor(random() * 4);
  const margin = 0.16 + random() * 0.26;
  const radius = THREE.MathUtils.lerp(profile.scale[0], profile.scale[1], random());
  const x =
    edge === 0
      ? -viewport.aspect - margin
      : edge === 1
        ? viewport.aspect + margin
        : THREE.MathUtils.lerp(-viewport.aspect, viewport.aspect, random());
  const y =
    edge === 2
      ? -1 - margin
      : edge === 3
        ? 1 + margin
        : THREE.MathUtils.lerp(-1, 1, random());
  const inward = new THREE.Vector2(-x / Math.max(0.1, viewport.aspect), -y).normalize();
  const diagonal = new THREE.Vector2(inward.y, -inward.x).multiplyScalar((random() > 0.5 ? 1 : -1) * profile.diagonal);
  const speed = THREE.MathUtils.lerp(profile.speed[0], profile.speed[1], random()) * (0.86 + speedState.currentMultiplier * 0.16);
  meteor.position.set(x, y, 0.02 - random() * 0.10);
  meteor.scale.setScalar(radius);
  meteor.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
  meteor.userData.velocity.copy(inward.add(diagonal).normalize().multiplyScalar(speed));
  meteor.userData.age = 0;
  meteor.userData.life = 4.6 + random() * 4.4;
  meteor.userData.fadeIn = 0.75 + random() * 0.55;
  meteor.userData.targetOpacity = THREE.MathUtils.lerp(profile.opacity[0], profile.opacity[1], random());
  meteor.userData.radius = radius;
  meteor.userData.size = radius > 0.085 ? "large" : radius > 0.052 ? "medium" : "small";
  meteor.userData.depth = 0.32 + random() * 0.68;
  meteor.userData.spawnedAt = elapsed;
  meteor.userData.entered = false;
  meteor.userData.collisionCooldown = 0;
  meteor.userData.active = true;
  meteor.visible = true;
  meteor.material.opacity = 0;
}

function updateAmbientMeteorLayer(delta, elapsed, travelVelocity) {
  const profile = ambientMeteorProfiles[ambientMeteorStageIndex()];
  const targetCount = profile.count;
  for (let i = 0; i < ambientMeteorLayer.meteors.length; i += 1) {
    const meteor = ambientMeteorLayer.meteors[i];
    if (i >= targetCount) {
      meteor.material.opacity = THREE.MathUtils.lerp(meteor.material.opacity, 0, 1 - Math.pow(0.0001, delta));
      if (meteor.material.opacity < 0.01) {
        meteor.visible = false;
        meteor.userData.active = false;
      }
      continue;
    }
    if (!meteor.userData.active) spawnAmbientMeteor(meteor, elapsed);
    meteor.userData.age += delta;
    meteor.userData.collisionCooldown = Math.max(0, meteor.userData.collisionCooldown - delta);
    meteor.position.x += (meteor.userData.velocity.x - travelVelocity.x * meteor.userData.depth * 0.035) * delta;
    meteor.position.y += (meteor.userData.velocity.y - travelVelocity.y * meteor.userData.depth * 0.026) * delta;
    meteor.rotation.x += meteor.userData.spin.x * delta;
    meteor.rotation.y += meteor.userData.spin.y * delta;
    meteor.rotation.z += meteor.userData.spin.z * delta;
    if (mission01.started && meteor.userData.collisionCooldown <= 0 && meteor.material.opacity > 0.10) {
      const player = state.controlMode === "astronaut" ? astronautState.position : state.position;
      const offset = player.clone().sub(new THREE.Vector2(meteor.position.x, meteor.position.y));
      const collisionRadius = meteor.userData.radius + (state.controlMode === "astronaut" ? 0.075 : 0.16);
      if (offset.lengthSq() < collisionRadius * collisionRadius) {
        const normal = offset.lengthSq() > 0.0001 ? offset.normalize() : new THREE.Vector2(1, 0);
        const collision = resolveMeteorCollision(
          meteor.userData.size,
          THREE.MathUtils.clamp(currentWorldProfileIndex(), 0, 3),
          { x: normal.x, y: normal.y },
          meteor.userData.velocity.length(),
        );
        const damage = v2Runtime.damageShield(collision.damage);
        if (damage > 0) {
          (state.controlMode === "astronaut" ? astronautVisualRig?.shield : shipShieldFx).trigger(1);
          const impulse = new THREE.Vector2(collision.impulse.x, collision.impulse.y);
          if (state.controlMode === "astronaut") astronautState.position.add(impulse);
          else state.position.add(impulse);
          input.velocity.addScaledVector(impulse, 0.45);
          spawnImpact(player, meteor.userData.size === "large");
          playAudioEvent("recoil_hit");
          setCompanionAimFeedback(`IMPACTO · ESCUDO ${Math.round(v2Runtime.shield.value)}%`);
        }
        meteor.userData.collisionCooldown = collision.invulnerabilitySeconds;
        spawnAmbientMeteor(meteor, elapsed);
        continue;
      }
    }
    const fadeIn = THREE.MathUtils.smoothstep(meteor.userData.age / meteor.userData.fadeIn, 0, 1);
    const fadeOut = 1 - THREE.MathUtils.smoothstep(meteor.userData.age, meteor.userData.life - 0.9, meteor.userData.life);
    meteor.material.opacity = meteor.userData.targetOpacity * fadeIn * fadeOut;
    if (!isOutsideViewportWithMargin(new THREE.Vector2(meteor.position.x, meteor.position.y), meteor.userData.radius, 0.04)) {
      meteor.userData.entered = true;
    }
    if (
      meteor.userData.age > 1.0 &&
      (meteor.userData.age >= meteor.userData.life ||
        (meteor.userData.entered &&
          isOutsideViewportWithMargin(new THREE.Vector2(meteor.position.x, meteor.position.y), meteor.userData.radius, 0.55)))
    ) {
      spawnAmbientMeteor(meteor, elapsed);
    }
  }
}

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

const relicVisual = new RelicGem({
  coreTexture: visualPackTextures.gemCore,
  noiseTexture: visualPackTextures.gemNoise,
  fresnelTexture: visualPackTextures.gemFresnel,
});
relicGroup.add(relicVisual);

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

const aimReticle = makeMissionSprite(missionFxTextures.closingTargetLockRing, { opacity: 0.0, renderOrder: 47 });
aimReticle.visible = false;
scene.add(aimReticle);

const aimClickPulse = makeMissionSprite(missionFxTextures.clickPulse, { opacity: 0.0, renderOrder: 46 });
aimClickPulse.visible = false;
scene.add(aimClickPulse);

const aimVignette = makeMissionSprite(missionFxTextures.slowMotionVignette, { opacity: 0.0, renderOrder: 44 });
aimVignette.visible = false;
scene.add(aimVignette);

const aimField = makeMissionSprite(missionFxTextures.closingStabilizeField, { opacity: 0.0, renderOrder: 45 });
aimField.visible = false;
scene.add(aimField);

const aimRotationStreaks = makeMissionSprite(visualPackTextures.gravityField, { opacity: 0.0, renderOrder: 46 });
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

const robotHudModel = new THREE.Group();
robotGroup.add(robotHudModel);

function makeRobotMaterial({
  color,
  map = null,
  emissive = 0x000000,
  emissiveIntensity = 0,
  roughness = 0.52,
  metalness = 0.04,
  opacity = 1,
}) {
  return new THREE.MeshStandardMaterial({
    map,
    color,
    emissive,
    emissiveIntensity,
    roughness,
    metalness,
    transparent: opacity < 1,
    opacity,
    depthWrite: false,
    depthTest: false,
  });
}

function makeRobotTube(points, color = 0x38215c, opacity = 0.90, radius = 0.0028) {
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 18, radius, 8, false),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: false,
    })
  );
  mesh.renderOrder = 55;
  return mesh;
}

function makeRobotArc(cx, cy, radius, color = 0x45206e, opacity = 0.94) {
  const points = [];
  for (let i = 0; i <= 12; i += 1) {
    const a = Math.PI * (0.10 + (i / 12) * 0.80);
    points.push(new THREE.Vector3(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius * 0.76, 0.086));
  }
  return makeRobotTube(points, color, opacity, 0.0032);
}

function makeRobotCapsule(length, radius, color, opacity = 1) {
  const capsule = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 14),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.20,
      roughness: 0.42,
      metalness: 0.06,
      transparent: opacity < 1,
      opacity,
      depthWrite: false,
      depthTest: false,
    })
  );
  capsule.rotation.z = Math.PI * 0.5;
  capsule.renderOrder = 55;
  return capsule;
}

const robotModelParts = {
  accent: [],
  body: [],
  glow: [],
};

const robotBodyMaterial = makeRobotMaterial({
  color: 0xf4f6ff,
  emissive: 0x111629,
  emissiveIntensity: 0.035,
  roughness: 0.62,
});
const robotFaceMaterial = makeRobotMaterial({
  color: 0xf9f6ff,
  emissive: 0x2c2254,
  emissiveIntensity: 0.05,
  roughness: 0.48,
});
const robotAccentMaterial = makeRobotMaterial({
  color: 0x5b34d6,
  emissive: 0x4c22b7,
  emissiveIntensity: 0.22,
  roughness: 0.30,
  metalness: 0.10,
});
const robotTipMaterial = makeRobotMaterial({
  color: 0xff8f45,
  emissive: 0xff7b30,
  emissiveIntensity: 0.34,
  roughness: 0.34,
});
const robotLensMaterial = makeRobotMaterial({
  color: 0xf8f4ff,
  emissive: 0x2b1b58,
  emissiveIntensity: 0.045,
  roughness: 0.34,
  opacity: 0.98,
});
const robotMouthMaterial = makeRobotMaterial({
  color: 0x7c879a,
  emissive: 0x111520,
  emissiveIntensity: 0.06,
  roughness: 0.42,
});
const robotGlowMaterial = new THREE.MeshBasicMaterial({
  color: 0xb58cff,
  transparent: true,
  opacity: 0.035,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: false,
});

const robotBody = new THREE.Mesh(new THREE.SphereGeometry(0.090, 48, 32), robotBodyMaterial);
robotBody.scale.set(1.16, 1.05, 0.98);
robotBody.renderOrder = 52;
robotHudModel.add(robotBody);
robotModelParts.body.push(robotBody);

const robotFace = new THREE.Mesh(new THREE.SphereGeometry(0.072, 40, 24), robotFaceMaterial);
robotFace.position.set(0, 0.002, 0.047);
robotFace.scale.set(1.00, 0.82, 0.18);
robotFace.renderOrder = 53;
robotHudModel.add(robotFace);
robotModelParts.body.push(robotFace);

const robotInnerGlow = new THREE.Mesh(new THREE.SphereGeometry(0.060, 32, 20), robotGlowMaterial);
robotInnerGlow.position.set(0, 0.006, 0.058);
robotInnerGlow.scale.set(0.94, 0.72, 0.12);
robotInnerGlow.renderOrder = 52;
robotHudModel.add(robotInnerGlow);
robotModelParts.glow.push(robotInnerGlow);

const robotFaceDecalMaterial = new THREE.MeshBasicMaterial({
  map: companionTextures.face.idle,
  transparent: true,
  opacity: 0.98,
  depthWrite: false,
  depthTest: false,
});
const robotFaceEmissiveMaterial = new THREE.MeshBasicMaterial({
  map: companionTextures.faceEmissive.idle,
  transparent: true,
  opacity: 0.028,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: false,
});
function createCurvedCompanionFaceGeometry(width, height) {
  const geometry = new THREE.PlaneGeometry(width, height, 24, 16);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index) / (width * 0.5);
    const y = positions.getY(index) / (height * 0.5);
    const curve = Math.max(0, 1 - x * x) * Math.max(0.28, 1 - y * y * 0.48);
    positions.setZ(index, curve * 0.018);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

const robotCurvedFaceGeometry = createCurvedCompanionFaceGeometry(0.178, 0.142);
const robotFaceDecal = new THREE.Mesh(robotCurvedFaceGeometry, robotFaceDecalMaterial);
robotFaceDecal.position.set(0, -0.004, 0.086);
robotFaceDecal.renderOrder = 56;
robotHudModel.add(robotFaceDecal);
const robotFaceEmissive = new THREE.Mesh(robotCurvedFaceGeometry.clone(), robotFaceEmissiveMaterial);
robotFaceEmissive.position.set(0, -0.004, 0.089);
robotFaceEmissive.renderOrder = 57;
robotHudModel.add(robotFaceEmissive);
robotModelParts.faceDecal = [robotFaceDecal, robotFaceEmissive];

const sidePanelMaterial = new THREE.MeshBasicMaterial({
  map: companionTextures.sidePanel,
  transparent: true,
  opacity: 0.78,
  depthWrite: false,
  depthTest: false,
});
const sidePanelGlowMaterial = new THREE.MeshBasicMaterial({
  map: companionTextures.sidePanelEmissive,
  transparent: true,
    opacity: 0.08,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: false,
});
for (const side of [-1, 1]) {
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.040, 0.070), sidePanelMaterial.clone());
  panel.position.set(side * 0.090, -0.004, 0.052);
  panel.rotation.y = side * -0.54;
  panel.renderOrder = 55;
  robotHudModel.add(panel);

  const panelGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.040, 0.070), sidePanelGlowMaterial.clone());
  panelGlow.position.copy(panel.position);
  panelGlow.position.z += 0.003;
  panelGlow.rotation.copy(panel.rotation);
  panelGlow.renderOrder = 56;
  robotHudModel.add(panelGlow);
  robotModelParts.glow.push(panelGlow);
}

for (const side of [-1, 1]) {
  const antennaBase = new THREE.Mesh(new THREE.SphereGeometry(0.014, 18, 10), robotAccentMaterial);
  antennaBase.position.set(side * 0.054, 0.069, 0.016);
  antennaBase.scale.set(1.20, 0.76, 0.72);
  antennaBase.renderOrder = 53;
  robotHudModel.add(antennaBase);
  robotModelParts.accent.push(antennaBase);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0037, 0.0046, 0.058, 14), robotAccentMaterial);
  stem.position.set(side * 0.058, 0.096, 0.014);
  stem.rotation.z = side * -0.42;
  stem.rotation.x = side * 0.10;
  stem.renderOrder = 52;
  robotHudModel.add(stem);
  robotModelParts.accent.push(stem);

  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 18, 12), robotTipMaterial);
  tip.position.set(side * 0.071, 0.123, 0.014);
  tip.scale.set(1.04, 0.92, 0.92);
  tip.renderOrder = 53;
  robotHudModel.add(tip);
}

const robotHudLight = new THREE.PointLight(0xb58cff, 0.16, 0.32);
robotHudLight.position.set(0, 0.02, 0.10);
robotHudModel.add(robotHudLight);

const robotReferenceMaterial = new THREE.SpriteMaterial({
  map: robotFxTextures.idle,
  transparent: true,
  opacity: 0.98,
  depthWrite: false,
  depthTest: false,
});
const robotReferenceSprite = new THREE.Sprite(robotReferenceMaterial);
robotReferenceSprite.renderOrder = 61;
robotReferenceSprite.scale.set(0.210, 0.210, 1);
robotReferenceSprite.position.set(0, -0.012, 0.118);
robotReferenceSprite.visible = false;
robotReferenceMaterial.opacity = 0;
robotHudModel.add(robotReferenceSprite);

robotFace.visible = false;
robotInnerGlow.visible = false;
robotBody.visible = true;
for (const part of robotModelParts.accent) part.visible = true;
for (const part of robotModelParts.glow) {
  part.visible = part !== robotInnerGlow;
  if (part.material) part.material.opacity = Math.min(part.material.opacity ?? 0.12, 0.12);
}
for (const part of robotModelParts.faceDecal || []) part.visible = true;
robotFaceEmissiveMaterial.opacity = 0.026;
robotHudLight.intensity = 0.055;

function setSpriteAsset(sprite, asset) {
  sprite.material.map = asset.texture;
  sprite.userData.aspect = asset.aspect;
  if (textureHasImageData(asset.texture)) sprite.material.needsUpdate = true;
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
  const robotSize = viewport.aspect < 0.75 ? 0.165 : 0.145;
  robotGroup.position.set(viewport.aspect - robotSize * 0.82 - 0.055, 0.735, 0.22);
  robotHudModel.scale.setScalar(robotSize / 0.16);
}

function robotTutorialContent(missionState = mission01.state) {
  if (robotCompanion.focus === "turbo" && robotCompanion.focusTimer > 0) {
    const turbo = currentTurboUnlock();
    return {
      label: "TURBO DISPONIBLE",
      goal: `${turbo.label} · Gemas ${mission01.gems}/3.`,
      action: "Mantené F para acelerar.",
      tip: "Cada gema mejora el impulso sin perder control de rumbo.",
    };
  }

  if (robotCompanion.focus === "discovery" && robotCompanion.focusTimer > 0) {
    return {
      label: "COMPANION / ESCÁNER",
      goal: robotCompanion.message,
      action: "Mantené E para completar la lectura de la Baliza Fracturada.",
      tip: "El escáner bloquea una única señal por activación.",
    };
  }

  if (robotCompanion.focus === "aim" && robotCompanion.focusTimer > 0) {
    return {
      label: robotCompanion.message.startsWith("DESVÍO") ? "DESVÍO" : "COMPANION / AUTOAIM",
      goal: robotCompanion.message,
      action: robotCompanion.message.startsWith("DESVÍO")
        ? "Acercate o estabilizá antes del próximo disparo."
        : "Acercate al objetivo correcto antes de disparar.",
      tip: "Distancia, velocidad del target y stage modifican el porcentaje real.",
    };
  }

  if (robotCompanion.focus === "speed" && robotCompanion.focusTimer > 0) {
    return {
      label: "COMPANION / VELOCIDAD",
      goal: `Velocidad ${SPEED_MODES[speedState.modeIndex].label} activa.`,
      action: "Usá el control de velocidad para alternar crucero, impulso y warp corto.",
      tip: "Más velocidad acelera el viaje, pero reduce margen de reacción.",
    };
  }

  if (!mission01.started) {
    return {
      label: "SISTEMA ONLINE",
      goal: "La ruta está fracturada. Recuperá 3 gemas para abrir el corredor final.",
      action: "Mové la nave y usá el companion como guía de misión.",
      tip: "Clickeá objetivos marcados para activar autoaim.",
    };
  }

  if (mission01.finalSignalAcquired || mission01.finalComplete) {
    return {
      label: "COMPANION / FINAL",
      goal: "Gemas 3/3. Ruta estabilizada.",
      action: mission01.finalComplete ? "Misión completa." : "Activá la señal final para estabilizar la ruta.",
      tip: "La nave conserva el rumbo final; no vuelve al Sector 01.",
    };
  }

  if (mission01.gems >= 3 || mission01.finalStarted) {
    return {
      label: "COMPANION / FINAL",
      goal: "Gemas 3/3.",
      action: "Activá la señal final para estabilizar la ruta.",
      tip: "Usá velocidad x2 o x3 para acercarte a la zona final.",
    };
  }

  if (missionState === "small_asteroids") {
    const config = currentMissionConfig();
    return {
      label: `${config.mission} · ${config.name}`,
      goal: `Localizá ${mission01.smallRequired} fragmentos de señal y neutralizá el núcleo principal.`,
      action: "Usá el astronauta para fragmentos pequeños.",
      tip: "Clickeá cerca del fragmento: el autoaim corrige orientación y trayectoria.",
    };
  }

  if (missionState === "large_obstacle") {
    const config = currentMissionConfig();
    return {
      label: `${config.mission} · ${config.name}`,
      goal: `Rompé ${mission01.largeRequired} núcleo${mission01.largeRequired === 1 ? "" : "s"} inestable${mission01.largeRequired === 1 ? "" : "s"}.`,
      action: "Volvé a la nave y usá disparo pesado.",
      tip: mission01.currentStageIndex >= 2
        ? "Los targets se desplazan rápido. Anticipá trayectoria antes del lock."
        : "Los objetivos están en movimiento. Acercate, estabilizá y dispará.",
    };
  }

  if (missionState === "relic") {
    return {
      label: "COMPANION / RELIQUIA",
      goal: "Activá la reliquia liberada.",
      action: "Acercate con el astronauta y tocá la señal.",
      tip: "La reliquia queda visible hasta que el astronauta la active.",
    };
  }

  if (missionState === "unlocked") {
    return {
      label: "COMPANION / RUMBO",
      goal: "Nuevo sector detectado.",
      action: "Seguí el indicador de rumbo hasta la próxima zona.",
      tip: `Gemas ${mission01.gems}/3. La ruta abre cuerpos y amenazas nuevas por sector.`,
    };
  }

  return {
    label: "COMPANION / RUMBO",
    goal: `Gemas ${mission01.gems}/3. ${currentTurboUnlock().label}.`,
    action: "Explorá el espacio y seguí los marcadores de zona.",
    tip: "Los cuerpos nuevos se descubren viajando; no aparecen de golpe en la ruta.",
  };
}

function updateRobotPanel() {
  if (
    !robotPanel ||
    !robotStateLabel ||
    !robotGoal ||
    !robotAction ||
    !robotTip ||
    !robotMessage ||
    !robotSmallCounter ||
    !robotLargeCounter ||
    !robotRelicCounter
  ) {
    return;
  }
  const tutorial = robotTutorialContent(robotCompanion.lastMissionState);
  robotPanel.hidden = !robotCompanion.panelOpen;
  robotStateLabel.textContent = tutorial.label;
  robotGoal.textContent = tutorial.goal;
  robotAction.textContent = tutorial.action;
  robotTip.textContent = tutorial.tip;
  robotMessage.textContent = robotCompanion.message;
  robotSmallCounter.textContent = `${robotCompanion.smallCurrent}/${mission01.smallRequired}`;
  robotLargeCounter.textContent = `${robotCompanion.largeCurrent}/${mission01.largeRequired}`;
  robotRelicCounter.textContent = `${robotCompanion.relicCurrent}/1`;
}

function companionFaceForState(stateName) {
  if (robotCompanion.blinkTime > 0) return "blink";
  if (robotCompanion.panelOpen) return "talk";
  if (stateName === "alert") return "alert";
  if (stateName === "stage_clear") return "success";
  return "idle";
}

function setCompanionFaceTexture(faceState) {
  const nextFace = companionTextures.face[faceState] ? faceState : "idle";
  if (robotCompanion.faceState === nextFace) return;
  robotCompanion.faceState = nextFace;
  robotFaceDecalMaterial.map = companionTextures.face[nextFace];
  if (textureHasImageData(companionTextures.face[nextFace])) robotFaceDecalMaterial.needsUpdate = true;
  robotFaceEmissiveMaterial.map = companionTextures.faceEmissive[nextFace] || companionTextures.faceEmissive.idle;
  if (textureHasImageData(robotFaceEmissiveMaterial.map)) robotFaceEmissiveMaterial.needsUpdate = true;
}

function setRobotCompanionState(stateName, message) {
  const nextState = robotFxTextures[stateName] ? stateName : "idle";
  const changed = robotCompanion.state !== nextState;
  robotCompanion.state = nextState;
  robotCompanion.message = message || robotCompanion.message;
  robotCompanion.pulse = changed ? 1 : Math.max(robotCompanion.pulse, 0.28);
  const accent = nextState === "alert" ? 0xd842d7 : nextState === "stage_clear" ? 0xff8f45 : 0x5b34d6;
  const glow = nextState === "alert" ? 0xd842d7 : nextState === "stage_clear" ? 0xff8f45 : 0xb58cff;
  for (const part of robotModelParts.accent) {
    part.material.color.setHex(accent);
    part.material.emissive?.setHex(accent);
  }
  robotGlowMaterial.color.setHex(glow);
  robotHudLight.color.setHex(glow);
  robotReferenceMaterial.map = robotFxTextures[nextState] || robotFxTextures.idle;
  if (textureHasImageData(robotReferenceMaterial.map)) robotReferenceMaterial.needsUpdate = true;
  setCompanionFaceTexture(companionFaceForState(nextState));
  if (changed && nextState === "alert") playMissionAudio("robot_alert_ping");
  if (changed && nextState === "stage_clear") playMissionAudio("robot_stage_clear");
  updateRobotPanel();
}

function syncRobotCompanion(missionState = mission01.state) {
  if (robotCompanion.lastMissionState !== missionState && robotCompanion.focus !== "speed") {
    robotCompanion.focus = null;
    robotCompanion.focusTimer = 0;
  }
  robotCompanion.lastMissionState = missionState;
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

  if (missionState === "navigation") {
    const zone = missionZoneSpecForStage(mission01.zoneIndex);
    setRobotCompanionState("hint", `${zone.subtitle}. ZONA ABIERTA`);
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
  setCompanionFaceTexture(companionFaceForState(robotCompanion.state));
  updateRobotPanel();
}

function updateRobotCompanion(delta, elapsed) {
  robotCompanion.pulse = Math.max(0, robotCompanion.pulse - delta * 2.4);
  robotCompanion.blinkTimer -= delta;
  if (robotCompanion.blinkTimer <= 0 && robotCompanion.state !== "alert") {
    robotCompanion.blinkTime = 0.16;
    robotCompanion.blinkTimer = 4.2 + random() * 2.8;
  }
  if (robotCompanion.blinkTime > 0) {
    robotCompanion.blinkTime = Math.max(0, robotCompanion.blinkTime - delta);
  }
  setCompanionFaceTexture(companionFaceForState(robotCompanion.state));
  if (robotCompanion.focusTimer > 0) {
    robotCompanion.focusTimer = Math.max(0, robotCompanion.focusTimer - delta);
    if (robotCompanion.focusTimer <= 0) robotCompanion.focus = null;
    if (robotCompanion.panelOpen) updateRobotPanel();
  }
  const bob = Math.sin(elapsed * 2.0) * 0.006;
  const pulse = robotCompanion.pulse;
  const pointerDelta = input.aimPoint.clone().sub(new THREE.Vector2(robotGroup.position.x, robotGroup.position.y));
  const pointerPull = THREE.MathUtils.clamp(1 - pointerDelta.length() / 0.48, 0, 1);
  robotHudModel.position.x = pointerDelta.x * 0.008 * pointerPull;
  robotHudModel.position.y = bob + pointerDelta.y * 0.006 * pointerPull;
  robotHudModel.rotation.x = pointerDelta.y * -0.075 * pointerPull + Math.sin(elapsed * 1.3) * 0.010;
  robotHudModel.rotation.y = pointerDelta.x * 0.085 * pointerPull + Math.sin(elapsed * 1.0) * 0.010;
  robotHudModel.rotation.z =
    Math.sin(elapsed * 1.25) * 0.008 +
    pointerDelta.x * 0.018 * pointerPull +
    (robotCompanion.state === "alert" ? Math.sin(elapsed * 5.0) * 0.014 : 0);
  robotGlowMaterial.opacity =
    robotCompanion.state === "alert"
      ? 0.040 + Math.sin(elapsed * 7.2) * 0.010 + pulse * 0.025
      : 0.024 + Math.sin(elapsed * 3.0) * 0.006 + pulse * 0.018;
  const baseScale = viewport.aspect < 0.75 ? 0.165 : 0.145;
  robotHudModel.scale.setScalar((baseScale / 0.16) * (1 + pulse * 0.028));
  robotHudLight.intensity = robotCompanion.state === "alert" ? 0.075 + pulse * 0.030 : 0.035 + pulse * 0.018;
}

function validTargetForMissionPhase(target) {
  if (!target?.userData?.missionRole || !mission01.started) return false;
  if (target.userData.active === false || target.userData.destroyed) return false;
  if (target.userData.targetable === false) return false;
  if (target.userData.missionRole === "small") return mission01.state === "small_asteroids";
  if (target.userData.missionRole === "large") return mission01.state === "large_obstacle";
  return false;
}

function aimRangeForTarget(target, shooter) {
  const gemBoost = mission01.gems * 0.08;
  if (target?.userData?.missionRole === "small" || shooter === "astronaut") return 1.90 + gemBoost;
  return 1.72 + gemBoost * 1.2;
}

function aimSuccessForDistance(distance, maxRange, target, shooter) {
  const rangeT = THREE.MathUtils.clamp(distance / Math.max(0.01, maxRange), 0, 1);
  const base = shooter === "ship" ? 0.86 : 0.80;
  const largePenalty = target?.userData?.missionRole === "large" ? 0.08 : 0;
  const velocity = target?.userData?.screenVelocity2D || target?.userData?.velocity2D || new THREE.Vector2();
  const velocityPenalty = THREE.MathUtils.clamp(velocity.length() * 0.22, 0, 0.28);
  const stagePenalty = Math.max(0, mission01.currentStageIndex || 0) * 0.035;
  const gemBonus = mission01.gems * 0.025;
  const chasePenalty = target?.userData?.motion?.chaseRequired ? 0.035 : 0;
  const vulnerabilityBonus = target?.userData?.vulnerable ? 0.16 : -0.05;
  const stabilityBonus = (target?.userData?.discovery?.scanProgress || 0) * 0.06;
  const chance =
    base - rangeT * 0.50 - largePenalty - velocityPenalty - stagePenalty - chasePenalty + gemBonus + vulnerabilityBonus + stabilityBonus;
  return THREE.MathUtils.clamp(chance, 0.16, 0.96);
}

function aimModeForTarget(target) {
  if (params.get("aimCinematic") === "1") return "major";
  if (target?.userData?.missionRole === "large") return "major";
  return "normal";
}

function predictionLeadForTarget(target, mode) {
  if (target?.userData?.motion?.predictionLead) return target.userData.motion.predictionLead;
  return mode === "major" ? 0.34 : 0.16;
}

function predictedTargetPoint(target, mode) {
  const point = backgroundObjectScreenPoint(target, new THREE.Vector2()).clone();
  const velocity = target?.userData?.screenVelocity2D || target?.userData?.velocity2D || new THREE.Vector2();
  return point.add(velocity.clone().multiplyScalar(predictionLeadForTarget(target, mode)));
}

function configureAimAssistTiming(mode) {
  const timing = aimTimingSchedule(mode);
  aimAssist.mode = mode;
  aimAssist.timing = timing;
  aimAssist.fireTime = timing.fireTime;
  aimAssist.impactTime = timing.impactTime;
  aimAssist.projectileTravel = timing.projectileTravel;
  aimAssist.duration = Math.min(8.0, timing.duration);
}

function setCompanionAimFeedback(message, openPanel = false) {
  robotCompanion.focus = "aim";
  robotCompanion.focusTimer = 4.8;
  robotCompanion.message = message;
  robotCompanion.pulse = 1;
  qaTelemetry.lastCompanionMessage = message;
  if (openPanel) robotCompanion.panelOpen = true;
  updateRobotPanel();
}

function showInvalidAim(point, message = "OBJETIVO FUERA DE RANGO") {
  if (aimAssist.active) return;
  playMissionAudio("invalid_target_blip");
  spawnMissSpark(point, new THREE.Vector2(1, 0));
  setCompanionAimFeedback(message, true);
}

function missFeedbackForAim(successChance, distance, maxRange, target) {
  const velocity = target?.userData?.screenVelocity2D || target?.userData?.velocity2D || new THREE.Vector2();
  if (distance / Math.max(0.01, maxRange) > 0.72) return "DESVÍO · MUY LEJOS";
  if (velocity.length() > 0.36) return "DESVÍO · OBJETIVO MÓVIL";
  if (successChance < 0.50) return "DESVÍO · FUERA DE ESTABILIDAD";
  return `LOCK ${Math.round(successChance * 100)}% · RIESGO DE FALLO`;
}

function beginAimAssistTarget(target, clickPoint) {
  if (!validTargetForMissionPhase(target) || aimAssist.active || state.transition) {
    showInvalidAim(clickPoint);
    return;
  }

  const shooter = shooterForTarget(target);
  if (shooter === "astronaut" && astronautSprite) enterAstronautMode();
  if (shooter === "ship") enterShipMode();
  const mode = aimModeForTarget(target);
  const origin = shooter === "astronaut" ? astronautState.position : state.position;
  const targetPoint = predictedTargetPoint(target, mode);
  const distance = origin.distanceTo(targetPoint);
  const maxRange = aimRangeForTarget(target, shooter);
  if (distance > maxRange) {
    const meters = Math.round((distance / maxRange) * 100);
    showInvalidAim(clickPoint, `FUERA DE RANGO · ${meters}% DEL ALCANCE`);
    return;
  }
  const successChance = aimSuccessForDistance(distance, maxRange, target, shooter);
  const forcedMiss = params.get("forceMiss") === "1";
  const forcedHit = params.get("forceHit") === "1";
  const willHit = forcedMiss ? false : forcedHit ? true : random() < successChance;
  const forced = forcedMiss || forcedHit;
  const missSide = new THREE.Vector2(-(targetPoint.y - origin.y), targetPoint.x - origin.x).normalize();
  const missAmount = THREE.MathUtils.lerp(0.14, 0.30, 1 - successChance);
  const missPoint = targetPoint.clone().add(missSide.multiplyScalar((random() > 0.5 ? 1 : -1) * missAmount));
  const feedback = willHit ? `LOCK ${Math.round(successChance * 100)}%` : missFeedbackForAim(successChance, distance, maxRange, target);
  qaTelemetry.aimAttempts += 1;
  if (forcedHit) qaTelemetry.forcedHits += 1;
  if (forcedMiss) qaTelemetry.forcedMisses += 1;
  if (!forced && willHit) qaTelemetry.realHits += 1;
  if (!forced && !willHit) qaTelemetry.realMisses += 1;
  qaTelemetry.lastAim = {
    forced,
    willHit,
    feedback,
    shooter,
    role: target?.userData?.missionRole || "unknown",
    stageIndex: mission01.currentStageIndex,
    distance: Number(distance.toFixed(3)),
    maxRange: Number(maxRange.toFixed(3)),
    successChance: Number(successChance.toFixed(3)),
    velocity: Number((target?.userData?.screenVelocity2D || target?.userData?.velocity2D || new THREE.Vector2()).length().toFixed(3)),
  };
  setCompanionAimFeedback(feedback);
  configureAimAssistTiming(mode);

  aimAssist.active = true;
  if (target.userData.discovery) target.userData.discovery.state = "engaged";
  aimAssist.phase = "lock";
  aimAssist.kind = "target";
  aimAssist.target = target;
  aimAssist.shooter = shooter;
  aimAssist.clickPoint.copy(clickPoint);
  aimAssist.firePoint.copy(targetPoint);
  aimAssist.predictedPoint.copy(targetPoint);
  aimAssist.targetVelocity.copy(target.userData.screenVelocity2D || target.userData.velocity2D || new THREE.Vector2());
  aimAssist.time = 0;
  aimAssist.fired = false;
  aimAssist.impacted = false;
  aimAssist.projectile = null;
  aimAssist.distance = distance;
  aimAssist.maxRange = maxRange;
  aimAssist.successChance = successChance;
  aimAssist.willHit = willHit;
  aimAssist.missPoint.copy(missPoint);
  aimAssist.recoil = 0;
  aimAssist.recoilRoll = 0;
  aimAssist.orientationAngle = shooter === "astronaut" ? astronautGroup.rotation.z : shipGroup.rotation.z;
  aimAssist.angularVelocity = 0;
  aimAssist.targetRotation = aimAssist.orientationAngle;
  aimAssist.baseDirection = state.direction !== "idle" ? state.direction : "right";
  aimAssist.played = { click: true };
  aimReticle.visible = true;
  aimClickPulse.visible = true;
  aimVignette.visible = true;
  aimField.visible = true;
  aimRotationStreaks.visible = true;
  aimGuideLine.visible = false;
  aimGuideLine.material.opacity = 0;
  playMissionAudio("aim_click_ping");
}

function beginAimAssistRelic(clickPoint) {
  if (mission01.relicState !== "collectible" || aimAssist.active || state.transition) {
    showInvalidAim(clickPoint);
    return;
  }
  enterAstronautMode();
  configureAimAssistTiming(params.get("aimCinematic") === "1" ? "major" : "major");
  aimAssist.active = true;
  aimAssist.phase = "lock";
  aimAssist.kind = "relic";
  aimAssist.target = null;
  aimAssist.shooter = "astronaut";
  aimAssist.clickPoint.copy(clickPoint);
  aimAssist.firePoint.set(relicGroup.position.x, relicGroup.position.y);
  aimAssist.predictedPoint.copy(aimAssist.firePoint);
  aimAssist.targetVelocity.set(0, 0);
  aimAssist.time = 0;
  aimAssist.fired = false;
  aimAssist.impacted = false;
  aimAssist.projectile = null;
  aimAssist.recoil = 0;
  aimAssist.recoilRoll = 0;
  aimAssist.orientationAngle = astronautGroup.rotation.z;
  aimAssist.angularVelocity = 0;
  aimAssist.targetRotation = aimAssist.orientationAngle;
  aimAssist.baseDirection = "right";
  aimAssist.played = { click: true };
  aimReticle.visible = true;
  aimClickPulse.visible = true;
  aimVignette.visible = true;
  aimField.visible = true;
  aimRotationStreaks.visible = true;
  aimGuideLine.visible = false;
  aimGuideLine.material.opacity = 0;
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
  aimAssist.phase = "idle";
  aimAssist.target = null;
  aimAssist.projectile = null;
  aimAssist.recoil = 0;
  aimAssist.recoilRoll = 0;
  aimAssist.angularVelocity = 0;
}

function updateAimAssist(delta, elapsed) {
  if (!aimAssist.active) {
    astronautGroup.rotation.z = THREE.MathUtils.lerp(astronautGroup.rotation.z, 0, 0.12);
    backgroundCamera.position.z = THREE.MathUtils.lerp(backgroundCamera.position.z, 9.6, 0.08);
    backgroundCamera.rotation.z = THREE.MathUtils.lerp(backgroundCamera.rotation.z, 0, 0.10);
    return;
  }
  aimAssist.time += delta;
  const t = aimAssist.time;
  const progress = THREE.MathUtils.clamp(t / aimAssist.duration, 0, 1);
  const timing = aimAssist.timing || AIM_TIMINGS.normal;
  const lockEnd = timing.lock;
  const stabilizeEnd = lockEnd + timing.stabilize;
  const orientEnd = stabilizeEnd + timing.orient;
  const fireWindow = aimAssist.fireTime;
  aimAssist.phase =
    t < lockEnd
      ? "lock"
      : t < stabilizeEnd
        ? "stabilize"
        : t < orientEnd
          ? "rotate"
          : t < fireWindow
            ? "align"
            : !aimAssist.fired
              ? "fire"
            : !aimAssist.impacted
              ? "projectile_travel"
              : t < aimAssist.impactTime + (timing.impactHold || 0)
                ? "impact"
                : "recover";
  const targetPoint =
    aimAssist.kind === "target" && aimAssist.target
      ? predictedTargetPoint(aimAssist.target, aimAssist.mode)
      : aimAssist.firePoint.clone();
  aimAssist.firePoint.copy(targetPoint);
  aimAssist.predictedPoint.copy(targetPoint);
  const origin = aimAssist.shooter === "astronaut" ? astronautState.position : state.position;
  const aimVector = targetPoint.clone().sub(origin);
  const aimAngle = Math.atan2(aimVector.y, aimVector.x);
  const aimDirection = aimVector.lengthSq() > 0.0001 ? aimVector.clone().normalize() : new THREE.Vector2(1, 0);
  const settledDirection = directionFromAngle(aimAngle);
  const baseDirection = t < Math.min(0.42, lockEnd * 0.72) ? aimAssist.baseDirection : settledDirection;
  const baseAngle = directionAngles[baseDirection] ?? 0;
  const desiredRotation = normalizeAngle(aimAngle - baseAngle);
  const orientationIn = THREE.MathUtils.smoothstep(t, lockEnd * 0.55, stabilizeEnd + timing.orient * 0.35);
  const orientationOut = 1 - THREE.MathUtils.smoothstep(t, aimAssist.impactTime + (timing.impactHold || 0), aimAssist.duration);
  const orientation = orientationIn * orientationOut;
  const rotationState = updateAimRotation(
    {
      phase: "align",
      elapsed: t,
      rawDuration: aimAssist.duration,
      angle: aimAssist.orientationAngle,
      angularVelocity: aimAssist.angularVelocity,
      targetAngle: desiredRotation,
      alignmentError: Math.abs(shortestAngle(aimAssist.orientationAngle, desiredRotation)),
      fired: aimAssist.fired,
    },
    delta,
    aimAssist.shooter === "ship"
      ? { angularAcceleration: 8.4, angularDamping: 7.0, maxAngularVelocity: 3.4, fireTolerance: 0.075 }
      : { angularAcceleration: 6.8, angularDamping: 6.2, maxAngularVelocity: 2.8, fireTolerance: 0.095 },
  );
  aimAssist.angularVelocity = rotationState.angularVelocity;
  aimAssist.orientationAngle = normalizeAngle(rotationState.angle);
  aimAssist.targetRotation = desiredRotation;
  aimAssist.baseDirection = baseDirection;
  const recoilOffset = aimDirection.clone().multiplyScalar(-aimAssist.recoil);
  const sideVector = new THREE.Vector2(-aimDirection.y, aimDirection.x);
  const recoilRoll = THREE.MathUtils.clamp(-Math.sin(aimAngle) * aimAssist.recoil * 3.8, -0.18, 0.18);
  aimAssist.recoilRoll = THREE.MathUtils.lerp(aimAssist.recoilRoll, recoilRoll, 0.34);
  backgroundCamera.position.z = THREE.MathUtils.lerp(backgroundCamera.position.z, 9.35 - orientation * 0.26, 0.22);
  backgroundCamera.rotation.z = THREE.MathUtils.lerp(backgroundCamera.rotation.z, sideVector.x * orientation * 0.020, 0.18);

  if (aimAssist.shooter === "ship") {
    setDirection(baseDirection);
    shipGroup.rotation.z = aimAssist.orientationAngle + aimAssist.recoilRoll;
    shipGroup.position.x += recoilOffset.x;
    shipGroup.position.y += recoilOffset.y;
  } else {
    setAstronautViewFrame(astronautViewFromAimDirection(baseDirection));
    const astronautAimLean = THREE.MathUtils.clamp(shortestAngle(0, aimAngle) * 0.16 * orientation, -0.16, 0.16);
    astronautGroup.rotation.z = aimAssist.orientationAngle * 1.14 + aimAssist.recoilRoll + astronautAimLean;
    if (astronautSprite) {
      astronautSprite.rotation.z += astronautAimLean * 0.72 - aimAssist.recoil * 0.34;
      astronautSprite.position.x += recoilOffset.x * 1.25 + sideVector.x * 0.022 * orientation;
      astronautSprite.position.y += recoilOffset.y * 1.25 + sideVector.y * 0.018 * orientation + Math.sin(progress * Math.PI) * 0.010;
    }
  }
  aimAssist.recoil = Math.max(0, aimAssist.recoil - delta * 0.42);
  aimAssist.recoilRoll = THREE.MathUtils.lerp(aimAssist.recoilRoll, 0, 0.10);

  if (!aimAssist.played.lock && t >= 0.04) {
    aimAssist.played.lock = true;
    playAudioEvent("target_lock");
  }
  if (!aimAssist.played.slow && t >= lockEnd * 0.25) {
    aimAssist.played.slow = true;
    playAudioEvent("slow_motion_enter");
  }
  if (!aimAssist.played.stabilize && t >= lockEnd) {
    aimAssist.played.stabilize = true;
    playAudioEvent("aim_stabilize");
  }
  if (!aimAssist.played.orient && t >= stabilizeEnd * 0.72) {
    aimAssist.played.orient = true;
    playAudioEvent("zero_g_rotate_whoosh");
    spawnOrientationBurst(origin, aimDirection, aimAssist.shooter);
  }

  aimReticle.position.set(targetPoint.x, targetPoint.y, 0.18);
  aimReticle.scale.setScalar((aimAssist.mode === "major" ? 0.19 : 0.16) + Math.sin(elapsed * 9.0) * 0.015 + progress * 0.04);
  aimReticle.material.rotation = elapsed * 0.9;
  aimReticle.material.opacity = 0.86 * (1 - THREE.MathUtils.smoothstep(progress, 0.84, 1));

  aimClickPulse.position.set(aimAssist.clickPoint.x, aimAssist.clickPoint.y, 0.17);
  aimClickPulse.scale.setScalar(0.12 + progress * 0.42);
  aimClickPulse.material.opacity = Math.max(0, 0.70 * (1 - progress * 1.3));

  aimVignette.material.opacity = (aimAssist.mode === "major" ? 0.26 : 0.20) * Math.sin(Math.PI * Math.min(1, progress));
  aimField.material.opacity = (aimAssist.mode === "major" ? 0.20 : 0.12) * Math.sin(Math.PI * Math.min(1, progress));
  aimField.material.rotation = -elapsed * 0.16;

  aimRotationStreaks.position.set(origin.x, origin.y, 0.17);
  aimRotationStreaks.scale.set(0.30 + orientation * 0.26, 0.075 + orientation * 0.040, 1);
  aimRotationStreaks.material.rotation = aimAngle + elapsed * (aimAssist.shooter === "ship" ? -0.7 : 0.9);
  aimRotationStreaks.material.opacity = 0.12 * orientation;

  aimGuideLine.visible = false;
  aimGuideLine.material.opacity = 0;

  const alignmentError = Math.abs(shortestAngle(aimAssist.orientationAngle, aimAssist.targetRotation));
  if (!aimAssist.fired && t >= fireWindow && alignmentError < (aimAssist.shooter === "ship" ? 0.075 : 0.095)) {
    aimAssist.fired = true;
    fireReleaseFlash.visible = true;
    fireReleaseFlash.position.set(origin.x, origin.y, 0.19);
    fireReleaseFlash.scale.setScalar(aimAssist.shooter === "ship" ? 0.28 : 0.18);
    fireReleaseFlash.material.opacity = 0.82;
    aimAssist.recoil = aimAssist.shooter === "ship" ? 0.105 : 0.064;
    playAudioEvent("fire_release");
    playAudioEvent("micro_thruster_burst");
    playMissionAudio(aimAssist.shooter === "ship" ? "ship_heavy_fire_cue" : "astronaut_tool_fire_cue");
    spawnOrientationBurst(origin, aimDirection, aimAssist.shooter);
    if (aimAssist.kind === "target" && aimAssist.target) {
      aimAssist.projectile = aimAssist.willHit
        ? launchShotAtTarget(aimAssist.target, aimAssist.shooter, { mode: aimAssist.mode })
        : launchShotAtPoint(aimAssist.missPoint, aimAssist.shooter, { mode: aimAssist.mode, miss: true });
    }
    if (aimAssist.kind === "relic") {
      aimAssist.projectile = launchShotAtPoint(aimAssist.firePoint, aimAssist.shooter, {
        mode: aimAssist.mode,
        miss: false,
        relic: true,
      });
    }
    if (aimAssist.shooter === "astronaut") triggerAstronautAction();
  }

  if (fireReleaseFlash.visible) {
    fireReleaseFlash.scale.multiplyScalar(1 + delta * 2.2);
    fireReleaseFlash.material.opacity = Math.max(0, fireReleaseFlash.material.opacity - delta * 4.6);
    if (fireReleaseFlash.material.opacity <= 0.01) fireReleaseFlash.visible = false;
  }

  if (!aimAssist.impacted && t >= aimAssist.impactTime + 0.45 && !aimAssist.projectile) {
    aimAssist.impacted = true;
  }

  if (!aimAssist.played.exit && t >= Math.max(0.60, aimAssist.impactTime)) {
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
  shipVisualRig.setSize(width, asset.aspect);
  shipShieldFx.setBaseScale(width * 0.62, (width / asset.aspect) * 0.68, width * 0.50);
  shipAura.scale.set(width * 1.72, width * 1.16, 1);
}

function astronautWidth() {
  return viewport.aspect < 0.75 ? 0.15 : 0.13;
}

function resizeAstronaut() {
  if (!astronautSprite || !astronautVisualRig) return;
  astronautVisualRig.setSize(astronautWidth(), astronautSprite.userData.aspect);
}

function currentAstronautAnchor() {
  astronautState.anchor.set(-Math.min(0.58, viewport.aspect * 0.34), 0.21);
  return astronautState.anchor;
}

function setDirection(direction) {
  if (!DIRECTIONS.includes(direction) || direction === state.direction) return;
  state.direction = direction;
  shipVisualRig.setMaps(derivedVisualMaps(`${currentStage()}/directions/${state.direction}`, currentAsset()));
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

const directionAngles = {
  right: 0,
  up_right: Math.PI * 0.25,
  up: Math.PI * 0.5,
  up_left: Math.PI * 0.75,
  left: Math.PI,
  down_left: -Math.PI * 0.75,
  down: -Math.PI * 0.5,
  down_right: -Math.PI * 0.25,
};

const aimDirectionOrder = ["right", "up_right", "up", "up_left", "left", "down_left", "down", "down_right"];

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function shortestAngle(current, target) {
  return normalizeAngle(target - current);
}

function directionFromAngle(angle) {
  let best = "right";
  let bestDelta = Infinity;
  for (const direction of aimDirectionOrder) {
    const delta = Math.abs(shortestAngle(directionAngles[direction], angle));
    if (delta < bestDelta) {
      best = direction;
      bestDelta = delta;
    }
  }
  return best;
}

function textureHasImageData(texture) {
  const image = texture?.image;
  return Boolean(image && (image.width || image.naturalWidth || image.videoWidth));
}

function astronautViewFromAimDirection(direction) {
  return {
    up: "rear",
    down: "front",
    left: "side_left",
    right: "side_right",
    up_left: "rear_left",
    up_right: "rear_right",
    down_left: "front_left",
    down_right: "front_right",
  }[direction] || "front_right";
}

function targetStageTuning() {
  if (mission01.finalStarted || mission01.finalComplete) return STAGE_TUNING[3];
  return STAGE_TUNING[THREE.MathUtils.clamp(state.stageIndex, 0, STAGE_TUNING.length - 2)];
}

function currentTurboUnlock() {
  const gemTier = THREE.MathUtils.clamp(mission01.gems, 0, TURBO_UNLOCKS.length - 1);
  return TURBO_UNLOCKS[gemTier];
}

function turboKeyHeld() {
  return input.keys.has("f") || input.keys.has("F");
}

function updateSpeedButton() {
  if (!speedButton) return;
  const mode = SPEED_MODES[speedState.modeIndex];
  speedButton.textContent = `VELOCIDAD ${mode.label}`;
  speedButton.dataset.speed = String(speedState.modeIndex + 1);
}

function cycleSpeedMode() {
  speedState.modeIndex = (speedState.modeIndex + 1) % SPEED_MODES.length;
  speedState.notificationTime = 6;
  robotCompanion.focus = "speed";
  robotCompanion.focusTimer = 6;
  robotCompanion.pulse = 1;
  updateSpeedButton();
  updateRobotPanel();
  playAudioEvent("speed_whoosh");
  playAudioEvent("route_detected_ping");
}

function updateSpeedState(delta) {
  const target = targetStageTuning();
  for (const key of Object.keys(target)) {
    if (typeof target[key] !== "number") continue;
    speedState.currentTuning[key] = THREE.MathUtils.lerp(
      speedState.currentTuning[key] ?? target[key],
      target[key],
      1 - Math.pow(0.001, delta)
    );
  }
  speedState.currentTuning.label = target.label;
  const mode = SPEED_MODES[speedState.modeIndex];
  const turbo = currentTurboUnlock();
  const turboRequested = turboKeyHeld() && !state.transition && !aimAssist.active;
  const turboWasActive = speedState.turboActive;
  speedState.turboActive = turboRequested;
  speedState.turboLabel = turbo.label;
  speedState.turboPulse = THREE.MathUtils.lerp(speedState.turboPulse, turboRequested ? 1 : 0, 1 - Math.pow(0.001, delta));
  if (turboRequested && !turboWasActive) {
    robotCompanion.focus = "turbo";
    robotCompanion.focusTimer = 3.2;
    robotCompanion.pulse = 1;
    playAudioEvent("speed_whoosh");
    playAudioEvent("micro_thruster_burst");
    playAudioEvent("turbo_ramp");
  }
  const targetMultiplier = mode.multiplier * (turboRequested ? turbo.multiplier : 1);
  speedState.currentMultiplier = THREE.MathUtils.lerp(
    speedState.currentMultiplier,
    targetMultiplier,
    1 - Math.pow(0.001, delta)
  );
  speedState.visualMultiplier = THREE.MathUtils.lerp(
    speedState.visualMultiplier,
    mode.multiplier * mode.streaks * speedState.currentTuning.speedLines * (1 + speedState.turboPulse * turbo.audio * 0.48),
    1 - Math.pow(0.002, delta)
  );
  speedState.notificationTime = Math.max(0, speedState.notificationTime - delta);
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
  shipVisualRig.setOpacity(1);
  portalSprite.visible = false;
  ringSprite.visible = false;
  transitionStreak.visible = false;
  stageButton.disabled = false;
  updateStageHud();
  beginStageNavigation(state.stageIndex);
}

function beginStageNavigation(stageIndex) {
  const finalZoneIndex = missionZoneSpecs.length - 1;
  const safeZoneIndex = THREE.MathUtils.clamp(stageIndex, 0, finalZoneIndex);
  const missionStageIndex = THREE.MathUtils.clamp(safeZoneIndex, 0, missionStageConfigs.length - 1);
  const config = safeZoneIndex < missionStageConfigs.length ? currentMissionConfig(missionStageIndex) : null;
  clearPreviousStageTargets();
  mission01.started = true;
  mission01.state = "navigation";
  mission01.currentStageIndex = missionStageIndex;
  mission01.zoneIndex = safeZoneIndex;
  mission01.smallRequired = config?.smallRequired ?? 0;
  mission01.largeRequired = config?.largeRequired ?? 0;
  mission01.smallDestroyed = 0;
  mission01.largeDestroyed = 0;
  mission01.smallAsteroids = [];
  mission01.largeObstacles = [];
  mission01.largeObstacle = null;
  mission01.relicTouched = false;
  mission01.unlockStarted = false;
  mission01.relicState = "hidden";
  mission01.revealTime = 0;
  mission01.relicDestroyTime = 0;
  missionZones.lastEntered = null;
  if (mission01.relicGroup) mission01.relicGroup.visible = false;
  if (energyBeam) energyBeam.visible = false;
  if (unlockFlash) unlockFlash.visible = false;
  enterShipMode();
  const zone = missionZoneSpecForStage(safeZoneIndex);
  const objective = safeZoneIndex === finalZoneIndex ? "ALCANZÁ LA ZONA FINAL" : "NAVEGÁ HASTA LA ZONA DE MISIÓN";
  updateMissionHud(zone.label, objective, zone.subtitle);
  updateGemHud();
  updateStageHud();
  syncRobotCompanion("navigation");
  playAudioEvent("route_detected_ping");
}

function applyStage(stageIndex) {
  state.stageIndex = stageIndex;
  shipVisualRig.setMaps(derivedVisualMaps(`${currentStage()}/directions/${state.direction}`, currentAsset()));
  resizeShip();
}

function updateTransition(delta, elapsed) {
  const transition = state.transition;
  if (!transition) {
    portalSprite.visible = false;
    ringSprite.visible = false;
    transitionStreak.visible = false;
    shipVisualRig.setOpacity(state.controlMode === "astronaut" ? 0.56 : 1);
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
    shipVisualRig.setOpacity(1);
    ringSprite.material.opacity = THREE.MathUtils.smoothstep(t, 0.02, 0.28) * 0.52;
    ringSprite.scale.setScalar(0.72 + t * 1.1);
    portalSprite.material.opacity = 0;
  } else if (t < 0.46) {
    const local = THREE.MathUtils.smoothstep(t, 0.28, 0.46);
    shipVisualRig.setOpacity(1 - local);
    ringSprite.material.opacity = 0.50 - local * 0.18;
    ringSprite.scale.setScalar(0.98 + local * 0.62);
    portalSprite.material.opacity = local * 0.52;
    scaleSprite(portalSprite, 0.62 + local * 0.12);
  } else if (t < 0.62) {
    shipVisualRig.setOpacity(0);
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
    shipVisualRig.setOpacity(local);
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
    if (child.userData.lockOpaque) {
      child.material.transparent = false;
      child.material.opacity = 1;
      child.visible = opacity > 0.05;
      return;
    }
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
    const profilePresence = planet.userData.profileStage === currentWorldProfileIndex() ? 1 : 0;
    planet.visible = true;
    const base = planet.userData.base;
    const parallax = planet.userData.parallax;
    const orbitAngle = elapsed * planet.userData.orbitSpeed + planet.userData.orbitPhase;
    const orbitX = Math.cos(orbitAngle) * planet.userData.orbitRadius.x;
    const orbitY = Math.sin(orbitAngle * 0.82) * planet.userData.orbitRadius.y;
    const relativeX = wrapWorldDelta(base.x - cameraWorld.x * (0.74 + parallax * 0.30), planet.userData.worldWrapX || WORLD_WRAP_X);
    const relativeY = wrapWorldDelta(base.y - cameraWorld.y * (0.84 + parallax * 0.18), planet.userData.worldWrapY || WORLD_WRAP_Y);
    planet.position.x =
      relativeX +
      orbitX;
    planet.position.y =
      relativeY +
      orbitY;
    planet.position.z = base.z + Math.sin(orbitAngle * 0.55) * planet.userData.orbitRadius.y * 0.38;
    planet.rotation.y += delta * planet.userData.spin;
    planet.rotation.z += delta * planet.userData.spin * 0.20;
    setGroupOpacity(planet, profilePresence);
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
    if (!asteroid.userData.screenVelocity2D) asteroid.userData.screenVelocity2D = new THREE.Vector2();
    if (!asteroid.userData.velocity2D) asteroid.userData.velocity2D = new THREE.Vector2();
    const previousScreenPoint = asteroid.userData.screenPoint?.clone?.() || null;
    const motion = asteroid.userData.motion;
    const orbitAngle = elapsed * (motion?.orbitSpeed ?? asteroid.userData.orbitSpeed) + (motion?.phase ?? asteroid.userData.phase);
    const orbitRadius = motion?.orbitRadius ?? asteroid.userData.orbitRadius;
    const driftRadius = motion?.driftRadius ?? new THREE.Vector2(0, 0);
    const driftSpeed = motion?.driftSpeed ?? 0;
    const missionPlayer = state.controlMode === "astronaut" ? astronautState.position : state.position;
    const lastScreenPoint = asteroid.userData.screenPoint;
    const evasionOffset = asteroid.userData.evasionOffset || new THREE.Vector2();
    const vulnerabilityWave = Math.sin(elapsed * (0.72 + (asteroid.userData.stageIndex || 0) * 0.14) + (motion?.phase || 0));
    asteroid.userData.vulnerable = !motion?.chaseRequired || vulnerabilityWave < -0.18;
    if (motion?.chaseRequired && lastScreenPoint && asteroid.userData.active && !asteroid.userData.destroyed) {
      const escape = lastScreenPoint.clone().sub(missionPlayer);
      const distance = escape.length();
      const pressure = THREE.MathUtils.clamp(1 - distance / 1.65, 0, 1) * (asteroid.userData.vulnerable ? 0.18 : 1);
      if (escape.lengthSq() > 0.0001) escape.normalize();
      const stageRepulsion = [0.12, 0.24, 0.38][THREE.MathUtils.clamp(asteroid.userData.stageIndex || 0, 0, 2)];
      evasionOffset.lerp(escape.multiplyScalar(stageRepulsion * pressure), 1 - Math.pow(0.008, delta));
    } else {
      evasionOffset.lerp(new THREE.Vector2(), 1 - Math.pow(0.02, delta));
    }
    asteroid.userData.evasionOffset = evasionOffset;
    const orbitX =
      Math.cos(orbitAngle) * orbitRadius.x +
      Math.sin(elapsed * driftSpeed + (motion?.phase ?? 0) * 1.7) * driftRadius.x;
    const orbitY =
      Math.sin(orbitAngle * 0.74) * orbitRadius.y +
      Math.cos(elapsed * driftSpeed * 0.86 + (motion?.phase ?? 0) * 0.9) * driftRadius.y;
    const relativeX = wrapWorldDelta(base.x - cameraWorld.x * (0.78 + parallax * 0.28), asteroid.userData.worldWrapX || WORLD_WRAP_X);
    const relativeY = wrapWorldDelta(base.y - cameraWorld.y * (0.88 + parallax * 0.16), asteroid.userData.worldWrapY || WORLD_WRAP_Y);
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
      orbitX +
      evasionOffset.x;
    asteroid.position.y =
      relativeY +
      orbitY +
      evasionOffset.y;
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
    if (previousScreenPoint && delta > 0) {
      asteroid.userData.screenVelocity2D.set(
        (targetScreenPoint.x - previousScreenPoint.x) / delta,
        (targetScreenPoint.y - previousScreenPoint.y) / delta
      );
      asteroid.userData.velocity2D.copy(asteroid.userData.screenVelocity2D);
    } else {
      asteroid.userData.screenVelocity2D?.set?.(0, 0);
      asteroid.userData.velocity2D?.set?.(0, 0);
    }
    asteroid.userData.screenPoint = targetScreenPoint.clone();
    asteroid.userData.repulsionCooldown = Math.max(0, (asteroid.userData.repulsionCooldown || 0) - delta);
    if (asteroid.userData.interactive && asteroid.userData.active && asteroid.userData.repulsionCooldown <= 0) {
      const player = state.controlMode === "astronaut" ? astronautState.position : state.position;
      const offset = player.clone().sub(targetScreenPoint);
      const collisionRadius = asteroid.userData.missionRole === "large" ? 0.34 : 0.20;
      if (offset.lengthSq() < collisionRadius * collisionRadius) {
        const normal = offset.lengthSq() > 0.0001 ? offset.normalize() : new THREE.Vector2(1, 0);
        const collision = resolveMeteorCollision(
          asteroid.userData.missionRole === "large" ? "large" : "medium",
          THREE.MathUtils.clamp(asteroid.userData.stageIndex || 0, 0, 3),
          { x: normal.x, y: normal.y },
          Math.max(0.5, asteroid.userData.screenVelocity2D?.length?.() || 0.5),
        );
        const damage = v2Runtime.damageShield(collision.damage);
        const impulse = new THREE.Vector2(collision.impulse.x, collision.impulse.y);
        if (state.controlMode === "astronaut") astronautState.position.add(impulse);
        else state.position.add(impulse);
        if (damage > 0) {
          (state.controlMode === "astronaut" ? astronautVisualRig?.shield : shipShieldFx).trigger(1);
          spawnImpact(player, asteroid.userData.missionRole === "large");
          setCompanionAimFeedback(`REPULSIÓN · ESCUDO ${Math.round(v2Runtime.shield.value)}%`);
        }
        asteroid.userData.repulsionCooldown = collision.invulnerabilitySeconds;
      }
    }
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
    line.material.opacity = Math.max(0, (speed + ascentEnergy - 0.18) * (0.002 + depth * 0.006));
    line.material.color.lerpColors(
      premiumBgColor.cyan,
      premiumBgColor.magenta,
      0.35 + Math.sin(elapsed + line.userData.phase * 6.28) * 0.18
    );
  }
}

const compositionCenter = new THREE.Vector3();
const compositionEdgeX = new THREE.Vector3();
const compositionEdgeY = new THREE.Vector3();
const compositionShip = new THREE.Vector3();
const compositionAstronaut = new THREE.Vector3();
function projectedBoundsForWorldObject(object) {
  object.getWorldPosition(compositionCenter);
  const radius = Math.max(0.04, (object.userData.radius || 0.22) * object.scale.x);
  compositionEdgeX.copy(compositionCenter).add(new THREE.Vector3(radius, 0, 0));
  compositionEdgeY.copy(compositionCenter).add(new THREE.Vector3(0, radius, 0));
  compositionCenter.project(backgroundCamera);
  compositionEdgeX.project(backgroundCamera);
  compositionEdgeY.project(backgroundCamera);
  const radiusX = Math.max(0.025, Math.abs(compositionEdgeX.x - compositionCenter.x));
  const radiusY = Math.max(0.025, Math.abs(compositionEdgeY.y - compositionCenter.y));
  return {
    x: compositionCenter.x - radiusX,
    y: compositionCenter.y - radiusY,
    width: radiusX * 2,
    height: radiusY * 2,
  };
}

function compositionSafeZone() {
  shipGroup.getWorldPosition(compositionShip).project(camera);
  const points = [compositionShip];
  if (astronautSprite) {
    astronautGroup.getWorldPosition(compositionAstronaut).project(camera);
    points.push(compositionAstronaut);
  }
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const paddingX = state.controlMode === "astronaut" ? 0.22 : 0.18;
  const paddingY = state.controlMode === "astronaut" ? 0.24 : 0.20;
  return {
    x: minX - paddingX,
    y: minY - paddingY,
    width: maxX - minX + paddingX * 2,
    height: maxY - minY + paddingY * 2,
  };
}

function boundsTouchViewport(bounds, margin = 0.16) {
  return (
    bounds.x + bounds.width >= -1 - margin &&
    bounds.x <= 1 + margin &&
    bounds.y + bounds.height >= -1 - margin &&
    bounds.y <= 1 + margin
  );
}

function biomeForStage(stageIndex) {
  return ["oceanic", "mechanical", "synthetic", "relic"][THREE.MathUtils.clamp(stageIndex || 0, 0, 3)];
}

function worldCompositionCandidate(object, index) {
  const category = object.userData.worldCategory || depthKindCategory(object.userData.kind);
  const stageAffinity = THREE.MathUtils.clamp(object.userData.profileStage ?? object.userData.spawnStage ?? 0, 0, 3);
  const bounds = projectedBoundsForWorldObject(object);
  if (!boundsTouchViewport(bounds)) return null;
  return {
    object,
    record: {
      id: object.uuid,
      biome: biomeForStage(stageAffinity),
      stageAffinity,
      kind: category,
      textureId: object.userData.textureId || `${object.userData.worldSource || "world"}:${object.userData.kind || index}`,
      coordinate: { x: object.userData.base?.x || 0, y: object.userData.base?.y || 0 },
      radius: object.userData.radius || 0.22,
      axialSpeed: Math.abs(object.userData.spin?.y ?? object.userData.spin ?? 0.01),
      translationPhase: object.userData.phase ?? object.userData.orbitPhase ?? 0,
      materialLocked: object.userData.materialLocked !== false,
      discovered: object.userData.discovered !== false,
    },
    bounds,
    depth: Math.abs(object.position.z || 0),
  };
}

function updateWorldCompositionAuthority(rawDelta) {
  const blend = v2Runtime.updateBiome(state.worldOffset, mission01.gems);
  const primaryStage = v2Runtime.stageForBiome(blend.primary);
  const secondaryStage = blend.secondary ? v2Runtime.stageForBiome(blend.secondary) : null;
  const allowedStages = new Set([primaryStage]);
  if (secondaryStage !== null && blend.mix > 0.10) allowedStages.add(secondaryStage);

  const worldObjects = [
    ...integratedBackground.planets,
    ...orbitalWorld.objects.filter((object) => object.userData.worldCategory),
    ...proceduralWorld.objects,
  ];
  const candidates = [];
  worldObjects.forEach((object, index) => {
    const stageAffinity = object.userData.profileStage ?? object.userData.spawnStage ?? 0;
    const stageAllowed = allowedStages.has(THREE.MathUtils.clamp(stageAffinity, 0, 3));
    const revealed = object.userData.reveal === undefined || object.userData.reveal > 0.12;
    if (stageAllowed && revealed) {
      const candidate = worldCompositionCandidate(object, index);
      if (candidate) candidates.push(candidate);
    }
    object.visible = false;
  });

  const result = v2Runtime.composeWorld(candidates, compositionSafeZone());
  for (const candidate of result.accepted) candidate.object.visible = true;
  const counts = { hero: 0, landmark: 0, medium: 0, debris: 0 };
  for (const candidate of result.accepted) counts[candidate.record.kind] += 1;
  const rejected = {};
  for (const item of result.rejected) rejected[item.reason] = (rejected[item.reason] || 0) + 1;
  const previousBiome = worldCompositionTelemetry.biome;
  worldCompositionTelemetry.counts = counts;
  worldCompositionTelemetry.rejected = rejected;
  worldCompositionTelemetry.violations = assertComposition(result);
  worldCompositionTelemetry.biome = blend.primary;
  worldCompositionTelemetry.biomeMix = Number(blend.mix.toFixed(3));
  worldCompositionTelemetry.candidates = candidates.length;
  biomeVisualLighting.apply(blend.primary, shipVisualRig, astronautVisualRig);
  if (mission01.started && previousBiome && previousBiome !== blend.primary) {
    playAudioEvent("sector_beacon");
    setCompanionAimFeedback(`REGIÓN DETECTADA · ${BIOME_LABELS[blend.primary]}`);
  }

  const shield = v2Runtime.updateShield(rawDelta);
  if (shieldHud) {
    shieldHud.textContent = `ESCUDO ${Math.round(shield.value)}%`;
    shieldHud.classList.toggle("is-low", shield.value < 30);
  }
  if (regionHud) {
    const secondary = blend.secondary && blend.mix > 0.08 ? ` / ${BIOME_LABELS[blend.secondary]}` : "";
    regionHud.textContent = `${BIOME_LABELS[blend.primary]}${secondary}`;
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

const DISCOVERY_OPACITY = {
  unknown: 0.04,
  signal_detected: 0.14,
  scanning: 0.28,
  partially_revealed: 0.48,
  identified: 0.74,
  targetable: 1,
  engaged: 1,
  destroyed: 0,
};

function updateTargetDiscovery(delta) {
  if (scenarioScannerState.active) {
    astronautVisualRig?.setScan(true, scenarioScannerState.progress);
    return;
  }
  if (!mission01.started || !["small_asteroids", "large_obstacle"].includes(mission01.state)) {
    astronautVisualRig?.setScan(scenarioScannerState.active, scenarioScannerState.progress);
    return;
  }
  const targets = [...mission01.smallAsteroids, ...mission01.largeObstacles];
  const player = state.controlMode === "astronaut" ? astronautState.position : state.position;
  let scanActive = false;
  let scanProgress = 0;
  for (const target of targets) {
    if (!target.userData.active || target.userData.destroyed || !target.userData.discovery) continue;
    const point = backgroundObjectScreenPoint(target, new THREE.Vector2());
    const toTarget = point.clone().sub(player);
    const distance = toTarget.length();
    const facing = input.velocity.lengthSq() > 0.02 ? input.velocity.clone().normalize() : toTarget.clone().normalize();
    const scanHeld =
      input.keys.has("e") ||
      input.keys.has("E") ||
      input.keys.has(" ") ||
      distance < (target.userData.missionRole === "large" ? 2.2 : 1.9) ||
      params.has("qaCdp");
    const previousState = target.userData.discovery.state;
    target.userData.discovery = v2Runtime.discovery.update(
      { ...target.userData.discovery, position: { x: point.x, y: point.y } },
      {
        player: { x: player.x, y: player.y },
        facing: { x: facing.x || 1, y: facing.y || 0 },
        scanHeld,
        delta,
      },
    );
    const discovery = target.userData.discovery;
    if (discovery.state === "scanning" || discovery.state === "partially_revealed") {
      scanActive = true;
      scanProgress = Math.max(scanProgress, discovery.scanProgress);
    }
    target.userData.targetable = discovery.state === "targetable" || discovery.state === "engaged";
    setGroupOpacity(target, DISCOVERY_OPACITY[discovery.state] ?? 0.04);
    const missionHalo = target.children.find((child) => child.userData.isMissionTargetHalo);
    if (missionHalo) {
      missionHalo.material.opacity = Math.max(
        missionHalo.material.opacity,
        0.06 + discovery.signalStrength * 0.20 + discovery.scanProgress * 0.24,
      );
    }
    if (previousState !== discovery.state && discovery.state === "signal_detected") {
      playAudioEvent("route_detected_ping");
      setCompanionAimFeedback("SEÑAL DETECTADA · ACERCATE PARA ESCANEAR");
    }
    if (previousState !== discovery.state && discovery.state === "targetable") {
      playAudioEvent("target_lock");
      playAudioEvent("target_orbit_passby");
      setCompanionAimFeedback("OBJETIVO IDENTIFICADO · AUTOAIM DISPONIBLE");
    }
  }
  astronautVisualRig?.setScan(
    scanActive || scenarioScannerState.active,
    Math.max(scanProgress, scenarioScannerState.progress),
  );
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

function makeProjectileSprite(texture, opacity, renderOrder) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );
  sprite.renderOrder = renderOrder;
  return sprite;
}

function currentProjectileTargetPoint(shot) {
  if (shot.userData.target && !shot.userData.miss) {
    return predictedTargetPoint(shot.userData.target, shot.userData.mode);
  }
  return shot.userData.targetPoint.clone();
}

function createProjectileShot(origin, targetPoint, shooter, { target = null, miss = false, mode = "normal", relic = false } = {}) {
  const group = new THREE.Group();
  const isMajor = mode === "major";
  const coreTexture =
    isMajor
      ? visualPackTextures.chargedCore
      : shooter === "ship"
        ? missionFxTextures.closingShipProjectile
        : missionFxTextures.closingAstronautProjectile;
  const trailTexture =
    shooter === "ship" || isMajor ? missionFxTextures.closingLongTrail : missionFxTextures.closingShortTrail;
  const projectileTone = shooter === "astronaut" ? 0.72 : 1;
  const trail = makeProjectileSprite(trailTexture, (isMajor ? 0.20 : 0.12) * projectileTone, 34);
  const core = makeProjectileSprite(coreTexture, (isMajor ? 0.56 : 0.42) * projectileTone, 35);
  group.add(trail, core);
  group.position.set(origin.x, origin.y, 0.13);
  group.userData = {
    isProjectile: true,
    shooter,
    target,
    targetPoint: targetPoint.clone(),
    origin: origin.clone(),
    miss,
    relic,
    mode,
    time: 0,
    duration: aimTimingSchedule(mode).projectileTravel,
    damageApplied: false,
    core,
    trail,
    projectileTone,
  };
  return group;
}

function spawnMuzzle(point, shooter) {
  const baseOpacity = shooter === "ship" ? 0.42 : 0.34;
  const baseScale = shooter === "ship" ? 0.145 : 0.090;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: premiumFxFrames.closingMuzzleCharge[0].texture,
      transparent: true,
      opacity: baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );
  sprite.position.set(point.x, point.y, 0.1);
  sprite.scale.setScalar(baseScale);
  sprite.renderOrder = 32;
  sprite.userData = {
    time: 0,
    duration: 0.16,
    strong: shooter === "ship",
    stripFrames: premiumFxFrames.closingMuzzleCharge,
    baseScale,
    baseOpacity,
  };
  interactionFx.add(sprite);
  activeImpacts.push(sprite);
}

function spawnOrientationBurst(origin, aimDirection, shooter) {
  const side = new THREE.Vector2(-aimDirection.y, aimDirection.x);
  const backward = aimDirection.clone().multiplyScalar(shooter === "ship" ? -0.050 : -0.034);
  const lateral = shooter === "ship" ? 0.006 : 0.003;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: impulseTexture,
      transparent: true,
      opacity: shooter === "ship" ? 0.040 : 0.030,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );
  sprite.renderOrder = 33;
  sprite.position.set(
    origin.x + side.x * lateral + backward.x,
    origin.y + side.y * lateral + backward.y,
    0.12
  );
  sprite.material.rotation = Math.atan2(-aimDirection.y, -aimDirection.x);
  sprite.scale.set(shooter === "ship" ? 0.060 : 0.042, shooter === "ship" ? 0.010 : 0.007, 1);
  sprite.userData = {
    time: 0,
    duration: shooter === "ship" ? 0.13 : 0.10,
    burst: true,
    strong: false,
    drift: new THREE.Vector2(backward.x * 0.12, backward.y * 0.12),
    baseScale: sprite.scale.x,
    baseScaleX: sprite.scale.x,
    baseScaleY: sprite.scale.y,
    baseOpacity: sprite.material.opacity,
  };
  interactionFx.add(sprite);
  activeImpacts.push(sprite);
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
  const baseScale = strong ? 0.42 : 0.22;
  const baseOpacity = strong ? 0.92 : 0.62;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: visualPackTextures.impactRing,
      transparent: true,
      opacity: baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );
  sprite.position.set(point.x, point.y, 0.09);
  sprite.scale.setScalar(baseScale);
  sprite.renderOrder = 32;
  sprite.userData = {
    time: 0,
    duration: strong ? 0.60 : 0.38,
    strong,
    baseScale,
    baseOpacity,
  };
  interactionFx.add(sprite);
  activeImpacts.push(sprite);
}

function spawnMissSpark(point, direction = new THREE.Vector2(1, 0)) {
  const side = direction.lengthSq() > 0.0001 ? new THREE.Vector2(-direction.y, direction.x).normalize() : new THREE.Vector2(0, 1);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeStripFrameTexture(visualPackTextures.sparkAtlas, 0, 4),
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );
  sprite.position.set(point.x + side.x * 0.030, point.y + side.y * 0.030, 0.10);
  sprite.scale.set(0.13, 0.13, 1);
  sprite.renderOrder = 34;
  sprite.userData = {
    time: 0,
    duration: 0.30,
    burst: true,
    strong: false,
    drift: new THREE.Vector2(side.x * 0.12 + direction.x * 0.035, side.y * 0.12 + direction.y * 0.035),
    baseScale: 0.13,
    baseOpacity: 0.72,
  };
  interactionFx.add(sprite);
  activeImpacts.push(sprite);
}

function spawnGemPickupBurst(point) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: premiumFxFrames.gemBurst[0].texture,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );
  sprite.position.set(point.x, point.y, 0.15);
  sprite.scale.setScalar(0.22);
  sprite.renderOrder = 38;
  sprite.userData = {
    time: 0,
    duration: 0.44,
    strong: true,
    stripFrames: premiumFxFrames.gemBurst,
    baseScale: 0.22,
    baseOpacity: 0.88,
  };
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
  dispatchV2Mission("LARGE_TARGETS_REVEALED", { required: mission01.largeRequired });
  const config = currentMissionConfig();
  updateMissionHud("NÚCLEOS DETECTADOS", largeObjectiveLabel(mission01.largeRequired), config.subtitle);
  playAudioEvent("mission_zone_enter");
  playMissionAudio("large_spawn");
  syncRobotCompanion("large_obstacle");
  for (const [index, obstacle] of mission01.largeObstacles.entries()) {
    obstacle.userData.active = true;
    obstacle.userData.destroyed = false;
    obstacle.userData.destroyTime = 0;
    obstacle.userData.hitPulse = 1;
    obstacle.visible = true;
    obstacle.userData.targetable = false;
    obstacle.userData.discovery = {
      id: `stage-${mission01.currentStageIndex}-large-${index}`,
      position: { x: 0, y: 0 },
      state: index === 0 ? "signal_detected" : "unknown",
      signalStrength: 0,
      scanProgress: index === 0 ? 0.12 : 0,
    };
    const aura = obstacle.children.find((child) => child.userData.isObjectiveHalo);
    if (aura) aura.material.map = missionFxTextures.largeSpawnAura;
  }
  enterShipMode();
}

function revealMissionRelic(sourceTarget) {
  if (mission01.state === "relic" || mission01.state === "unlocked") return;
  const config = currentMissionConfig();
  mission01.state = "relic";
  dispatchV2Mission("RELIC_REVEALED");
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
  relicVisual.setReveal(0, 1, 0);
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
    dispatchV2Mission("GEM_ACQUIRED");
    playAudioEvent("gem_acquired");
    playAudioEvent("gem_counter_update");
    pulseGemBadge();
    const burstPoint = relicGroup.visible
      ? new THREE.Vector2(relicGroup.position.x, relicGroup.position.y)
      : state.position.clone();
    spawnGemPickupBurst(burstPoint);
  }
  updateGemHud();
}

function startFinalSequence(anchorPoint = null) {
  if (mission01.finalStarted || mission01.finalComplete) return;
  mission01.finalStarted = true;
  dispatchV2Mission("FINAL_STARTED");
  mission01.finalTime = 0;
  mission01.finalOrientation = astronautGroup.rotation.z;
  mission01.finalAngularVelocity = 0;
  mission01.finalFired = false;
  mission01.state = "final";
  mission01.finalSignalAcquired = false;
  finalFxGroup.visible = true;
  finalFxGroup.position.set(0, 0, 0.18);
  const finalPoint = anchorPoint || new THREE.Vector2(relicGroup.position.x || 0, relicGroup.position.y || 0.1);
  finalCore.position.set(finalPoint.x, finalPoint.y, 0.2);
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
  dispatchV2Mission("GEM_TRANSFER_STARTED");
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
      beginStageNavigation(3);
      return;
    }
    beginStageNavigation(mission01.currentStageIndex + 1);
  }, 760);
}

function handleMissionTargetDestroyed(target, shooter) {
  if (!target?.userData.missionRole) return;
  const config = currentMissionConfig();
  if (target.userData.missionRole === "small") {
    dispatchV2Mission("SMALL_TARGET_DESTROYED");
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
    dispatchV2Mission("LARGE_TARGET_DESTROYED");
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
    if (target.userData.discovery) target.userData.discovery.state = "destroyed";
    target.userData.destroyTime = 0;
    handleMissionTargetDestroyed(target, shooter);
  }
}

function launchShotAtTarget(target, shooter = shooterForTarget(target), options = {}) {
  if (!target || state.transition) return;
  if (shooter === "astronaut" && astronautSprite) enterAstronautMode();
  if (shooter === "ship") enterShipMode();

  const origin = shooter === "astronaut" ? astronautState.position.clone() : state.position.clone();
  const mode = options.mode || aimModeForTarget(target);
  const targetPoint = predictedTargetPoint(target, mode);
  const shot = createProjectileShot(origin, targetPoint, shooter, { target, mode });
  spawnMuzzle(origin, shooter);
  interactionFx.add(shot);
  activeShots.push(shot);
  return shot;
}

function launchShotAtPoint(point, shooter = "ship", options = {}) {
  if (state.transition) return;
  if (shooter === "astronaut" && astronautSprite) enterAstronautMode();
  if (shooter === "ship") enterShipMode();

  const origin = shooter === "astronaut" ? astronautState.position.clone() : state.position.clone();
  const shot = createProjectileShot(origin, point, shooter, {
    miss: options.miss ?? true,
    mode: options.mode || "normal",
    relic: options.relic || false,
  });
  spawnMuzzle(origin, shooter);
  interactionFx.add(shot);
  activeShots.push(shot);
  return shot;
}

function fireAtTarget(target) {
  if (!target) return;
  const point = target.userData.screenPoint || backgroundObjectScreenPoint(target, new THREE.Vector2()).clone();
  beginAimAssistTarget(target, point);
}

function nearestActiveMissionTarget(targets, origin) {
  let best = null;
  let bestDistance = Infinity;
  for (const target of targets) {
    if (!target?.userData.active || target.userData.destroyed || !target.visible) continue;
    const point = target.userData.screenPoint || backgroundObjectScreenPoint(target, new THREE.Vector2()).clone();
    const distance = point.distanceTo(origin);
    if (distance < bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }
  return best;
}

function activeMissionTargetByIndex(targets, index, origin) {
  if (!Number.isFinite(index)) return nearestActiveMissionTarget(targets, origin);
  const activeTargets = targets
    .filter((target) => target?.userData.active && !target.userData.destroyed && target.visible)
    .sort((a, b) => (a.userData.targetIndex ?? 0) - (b.userData.targetIndex ?? 0));
  if (!activeTargets.length) return null;
  return activeTargets[THREE.MathUtils.clamp(Math.round(index), 0, activeTargets.length - 1)];
}

function updateInteractionFx(delta) {
  for (let i = activeShots.length - 1; i >= 0; i -= 1) {
    const shot = activeShots[i];
    shot.userData.time += delta;
    const t = THREE.MathUtils.clamp(shot.userData.time / shot.userData.duration, 0, 1);
    const origin = shot.userData.origin;
    const targetPoint = currentProjectileTargetPoint(shot);
    const eased = THREE.MathUtils.smoothstep(t, 0, 1);
    const current = origin.clone().lerp(targetPoint, eased);
    const deltaPoint = targetPoint.clone().sub(origin);
    const direction = deltaPoint.lengthSq() > 0.0001 ? deltaPoint.normalize() : new THREE.Vector2(1, 0);
    const angle = Math.atan2(direction.y, direction.x);
    const lead = 0.04 + t * 0.06;
    const projectileTone = shot.userData.projectileTone ?? 1;
    const projectileScale = shot.userData.shooter === "astronaut" ? 0.70 : 0.86;
    shot.position.set(current.x, current.y, 0.13);
    shot.userData.core.position.set(direction.x * lead, direction.y * lead, 0);
    shot.userData.trail.position.set(-direction.x * (0.08 + t * 0.07), -direction.y * (0.08 + t * 0.07), -0.01);
    shot.userData.core.material.rotation = angle;
    shot.userData.trail.material.rotation = angle;
    const majorScale = shot.userData.mode === "major" ? 1.24 : 1.0;
    const pulse = 1 + Math.sin((shot.userData.time + t) * 18) * 0.025;
    shot.userData.core.scale.set(0.095 * majorScale * pulse * projectileScale, 0.024 * majorScale * projectileScale, 1);
    shot.userData.trail.scale.set((0.105 + t * 0.055) * majorScale * projectileScale, 0.020 * majorScale * projectileScale, 1);
    shot.userData.core.material.opacity = (shot.userData.mode === "major" ? 0.58 : 0.42) * (1 - t * 0.12) * projectileTone;
    shot.userData.trail.material.opacity = (shot.userData.mode === "major" ? 0.20 : 0.12) * (1 - t * 0.28) * projectileTone;
    if (t >= 1) {
      if (!shot.userData.damageApplied) {
        shot.userData.damageApplied = true;
        if (shot.userData.relic) {
          touchMissionRelic();
        } else if (shot.userData.target && !shot.userData.miss) {
          qaTelemetry.lastImpact = {
            hit: true,
            miss: false,
            forced: qaTelemetry.lastAim?.forced || false,
            role: shot.userData.target.userData.missionRole || "unknown",
            shooter: shot.userData.shooter,
            mode: shot.userData.mode,
          };
          damageTarget(shot.userData.target, shot.userData.shooter);
        } else {
          qaTelemetry.lastImpact = {
            hit: false,
            miss: true,
            forced: qaTelemetry.lastAim?.forced || false,
            shooter: shot.userData.shooter,
            mode: shot.userData.mode,
          };
          spawnMissSpark(targetPoint, direction);
          playMissionAudio("invalid_target_blip");
          setCompanionAimFeedback(`DESVÍO · AUTOAIM ${Math.round(aimAssist.successChance * 100)}%`);
        }
        if (aimAssist.projectile === shot) {
          aimAssist.impacted = true;
          aimAssist.hitStop = Math.max(aimAssist.hitStop, shot.userData.mode === "major" ? 0.18 : 0.10);
        }
      }
      interactionFx.remove(shot);
      for (const child of shot.children) {
        child.geometry?.dispose?.();
        child.material?.dispose?.();
      }
      activeShots.splice(i, 1);
    }
  }

  for (let i = activeImpacts.length - 1; i >= 0; i -= 1) {
    const impact = activeImpacts[i];
    impact.userData.time += delta;
    const t = impact.userData.time / impact.userData.duration;
    if (impact.userData.stripFrames?.length) {
      const frameIndex = Math.min(
        impact.userData.stripFrames.length - 1,
        Math.floor(t * impact.userData.stripFrames.length)
      );
      const frame = impact.userData.stripFrames[frameIndex];
      if (frame?.texture && impact.material.map !== frame.texture) {
        impact.material.map = frame.texture;
        if (textureHasImageData(frame.texture)) impact.material.needsUpdate = true;
      }
    }
    if (impact.userData.burst) {
      impact.position.x += impact.userData.drift.x * delta;
      impact.position.y += impact.userData.drift.y * delta;
      const burstScale = 1 + t * (impact.userData.strong ? 1.8 : 1.25);
      impact.scale.set(
        (impact.userData.baseScaleX ?? impact.userData.baseScale) * burstScale,
        (impact.userData.baseScaleY ?? impact.userData.baseScale) * burstScale,
        1
      );
      impact.material.opacity = Math.max(0, impact.userData.baseOpacity * (1 - t));
      if (t >= 1) {
        interactionFx.remove(impact);
        impact.material.dispose();
        activeImpacts.splice(i, 1);
      }
      continue;
    }
    const scale = (impact.userData.baseScale ?? (impact.userData.strong ? 0.26 : 0.16)) * (1 + t * (impact.userData.strong ? 1.65 : 1.25));
    impact.scale.setScalar(scale);
    impact.material.opacity = Math.max(0, (impact.userData.baseOpacity ?? (impact.userData.strong ? 0.88 : 0.58)) * (1 - t));
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
    const destroyFade =
      mission01.relicState === "destroying"
        ? 1 - THREE.MathUtils.smoothstep(mission01.relicDestroyTime, 0.10, 0.85)
        : 1;
    if (mission01.relicState === "destroying") mission01.relicDestroyTime += delta;
    relicVisual.setReveal(reveal, destroyFade, elapsed);
    relicVisual.update(delta, elapsed);

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
  const collapse = THREE.MathUtils.smoothstep(t, 3.25, 4.55);
  const release = THREE.MathUtils.smoothstep(t, 3.80, 5.45);
  const resolve = THREE.MathUtils.smoothstep(t, 6.15, 7.80);

  const finalAimVector = corePoint.clone().sub(astronautState.position);
  const finalAimAngle = Math.atan2(finalAimVector.y, finalAimVector.x);
  const finalRotation = updateAimRotation(
    {
      phase: "align",
      elapsed: t,
      rawDuration: 7.8,
      angle: mission01.finalOrientation,
      angularVelocity: mission01.finalAngularVelocity,
      targetAngle: finalAimAngle,
      alignmentError: Math.abs(shortestAngle(mission01.finalOrientation, finalAimAngle)),
      fired: mission01.finalFired,
    },
    delta,
    { angularAcceleration: 5.2, angularDamping: 5.4, maxAngularVelocity: 2.1, fireTolerance: 0.055 },
  );
  mission01.finalOrientation = finalRotation.angle;
  mission01.finalAngularVelocity = finalRotation.angularVelocity;
  if (t < 6.1) astronautGroup.rotation.z = finalRotation.angle;
  if (!mission01.finalFired && t >= 3.75 && finalRotation.alignmentError < 0.075) {
    mission01.finalFired = true;
    playAudioEvent("zero_g_rotate_whoosh");
    playAudioEvent("fire_release");
    spawnOrientationBurst(astronautState.position, finalAimVector.normalize(), "astronaut");
  }

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

  if (!mission01.finalSignalAcquired && t >= 5.25) {
    mission01.finalSignalAcquired = true;
    mission01.gems = 3;
    playAudioEvent("final_shockwave");
    playAudioEvent("final_energy_beam");
    playAudioEvent("final_signal_acquired");
    updateMissionHud("SEÑAL FINAL ADQUIRIDA", "RUTA ESTABILIZADA", "RUMBO FINAL / ZONA FINAL");
    syncRobotCompanion("final");
  }

  if (!mission01.finalComplete && t >= 7.45) {
    mission01.finalComplete = true;
    dispatchV2Mission("FINAL_COMPLETE");
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
  astronautVisualRig?.setMaps(derivedVisualMaps(`astronaut/views/${viewName}`, asset));
  astronautVisualRig?.setSize(astronautWidth(), asset.aspect);
}

function setAstronautFrame() {
  if (!astronautSprite) return;
  const animation = astronautAnimations[astronautState.animation] || astronautAnimations.idle_hover;
  if (!animation?.frames?.length) return;

  const frameIndex = Math.floor(astronautState.animationTime * animation.fps) % animation.frames.length;
  const frame = animation.frames[frameIndex];
  const asset = frame[astronautState.facing] || frame.right || frame.left;
  if (!asset) return;

  astronautVisualRig?.setMaps(derivedVisualMaps("astronaut/float", asset));
  astronautVisualRig?.setSize(astronautWidth(), asset.aspect);
}

function updateAstronaut(delta, elapsed, controlVelocity) {
  if (!astronautSprite) return;

  const isControlled = state.controlMode === "astronaut";
  if (isControlled) {
    astronautState.velocity.lerp(controlVelocity, 1 - Math.pow(0.004, delta));
    const moveSpeed = 0.58 * (1 + speedState.turboPulse * 0.58);
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

  if (isControlled) {
    const tetherAnchor = currentAstronautAnchor();
    const tetherOffset = astronautState.position.clone().sub(tetherAnchor);
    const maxTetherDistance = 0.78;
    if (tetherOffset.length() > maxTetherDistance) {
      tetherOffset.setLength(maxTetherDistance);
      astronautState.position.copy(tetherAnchor).add(tetherOffset);
      astronautState.velocity.multiplyScalar(0.22);
      astronautState.returnPulse = Math.max(astronautState.returnPulse, 0.35);
    }
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

  astronautGroup.position.set(astronautState.position.x, astronautState.position.y, 0.04);
  astronautSprite.position.set(0, 0, 0.02);
  astronautVisualRig.rotation.z = Math.sin(elapsed * (0.72 + speedState.turboPulse * 0.42)) * 0.025 - astronautState.velocity.x * 0.055;
  astronautVisualRig.setOpacity(state.transition ? 0.24 : isControlled ? 0.98 : 0.84);
  astronautVisualRig.update(delta, elapsed);
}

window.addEventListener("keydown", (event) => {
  ensureMissionAudio();
  input.keys.add(event.key);
  if (event.key === "v" || event.key === "V") {
    event.preventDefault();
    cycleSpeedMode();
    return;
  }
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
    if (event.key === " ") {
      if (scenarioGravity.activateStabilizer()) {
        if (state.controlMode === "astronaut") astronautVisualRig?.shield.trigger(1);
        else shipShieldFx.trigger(1);
        setCompanionAimFeedback("ESTABILIZADOR ACTIVO · GRAVEDAD REDUCIDA", true);
        playAudioEvent("aim_stabilize");
      } else {
        setCompanionAimFeedback(`ESTABILIZADOR · RECARGA ${Math.ceil(scenarioGravity.status.cooldown)}s`, true);
      }
      return;
    }
    if (state.controlMode === "astronaut") triggerAstronautAction();
    else setCompanionAimFeedback("SECTOR BLOQUEADO · RECUPERÁ LA GEMA", true);
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
  else if (mission01.state === "navigation") {
    const zone = missionZoneSpecForStage(mission01.zoneIndex);
    updateMissionHud(zone.label, mission01.zoneIndex === 3 ? "ALCANZÁ LA ZONA FINAL" : "NAVEGÁ HASTA LA ZONA DE MISIÓN", zone.subtitle);
    robotCompanion.panelOpen = true;
    robotCompanion.focus = "mission";
    robotCompanion.focusTimer = 4;
    updateRobotPanel();
    playAudioEvent("route_detected_ping");
  }
  else startStageTransition();
});

speedButton?.addEventListener("click", () => {
  ensureMissionAudio();
  cycleSpeedMode();
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

  const speedAmount = Math.min(1.35, travelVelocity.length() * (0.82 + speedState.visualMultiplier * 0.12));
  for (const line of speedLines.children) {
    const size = line.userData.size;
    line.position.x = line.userData.x * viewport.aspect + input.smoothPointer.x * 0.012;
    line.position.y = line.userData.y;
    line.scale.set(size * (1 + speedAmount * 0.58), size * 0.20, 1);
    line.material.opacity =
      (0.018 + speedAmount * 0.072) *
      speedState.currentTuning.speedLines *
      (0.8 + Math.sin(elapsed * 2 + size * 9) * 0.2);
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
  const turbo = speedState.turboPulse;
  const pulse = 0.5 + Math.sin(elapsed * 2.35) * 0.5;

  shipAura.material.opacity = 0.055 + pulse * 0.014 + speed * 0.045 + turbo * 0.025 + (state.transition ? 0.08 : 0);
  shipAura.rotation.z = elapsed * (0.08 + turbo * 0.04);
  shipAura.scale.set(
    shipSprite.scale.x * (1.30 + turbo * 0.05),
    shipSprite.scale.y * (1.01 + turbo * 0.04),
    1
  );

  const turboTier = THREE.MathUtils.clamp(mission01.gems, 0, 3);
  const directionName = moving ? directionFromAngle(Math.atan2(shipVelocity.y, shipVelocity.x)) : "idle";
  const level = state.transition ? "warp" : turbo > 0.08 ? "turbo" : "normal";
  shipThrusters.setState(
    directionName,
    moving || state.transition ? level : "idle",
    shipSprite.scale.x,
    shipSprite.scale.y,
    turboTier,
  );
}

function animate() {
  const rawDelta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;
  const hitStopped = aimAssist.hitStop > 0;
  if (hitStopped) aimAssist.hitStop = Math.max(0, aimAssist.hitStop - rawDelta);
  const finalSlow = mission01.finalStarted && !mission01.finalComplete && mission01.finalTime < 2.4;
  const delta = rawDelta * (hitStopped ? 0.04 : aimAssist.active ? 0.40 : finalSlow ? 0.48 : 1);
  updateSpeedState(rawDelta);

  const keyX = keyAxis(["ArrowLeft", "a", "A"], ["ArrowRight", "d", "D"]);
  const keyY = keyAxis(["ArrowDown", "s", "S"], ["ArrowUp", "w", "W"]);
  const targetVelocity = new THREE.Vector2(keyX, keyY);
  if (targetVelocity.length() > 1) targetVelocity.normalize();

  input.smoothPointer.set(0, 0);
  input.velocity.lerp(targetVelocity, 1 - Math.pow(0.004, delta * speedState.currentTuning.acceleration));
  const activeScenarioStage = currentWorldProfileIndex();
  scenarioGravitySample = scenarioGravity.apply(
    activeScenarioStage,
    state.worldOffset,
    input.velocity,
    elapsed,
    rawDelta,
    state.controlMode === "astronaut" ? 1.35 : 1,
  );
  if (input.velocity.length() > 1.15) input.velocity.setLength(1.15);
  updateScenarioDiscovery(rawDelta);

  const shipVelocity = state.controlMode === "ship" ? input.velocity : new THREE.Vector2();
  const travelVelocity = shipVelocity.clone().multiplyScalar(speedState.visualMultiplier);

  if (state.controlMode === "ship") {
    setDirection(input.debugDirection || resolveDirection(input.velocity.x, input.velocity.y));

    const controlSpeed =
      (state.transition ? 0.18 : 0.74) *
      speedState.currentTuning.shipMaxSpeed *
      (0.90 + (speedState.currentMultiplier - 1) * 0.18);
    state.position.x = THREE.MathUtils.clamp(
      state.position.x + input.velocity.x * controlSpeed * delta,
      -viewport.aspect + 0.42,
      viewport.aspect - 0.42
    );
    state.position.y = THREE.MathUtils.clamp(
      state.position.y + input.velocity.y * controlSpeed * delta,
      -0.64,
      0.64
    );

    const ascentIntent = Math.max(0, input.velocity.y) - Math.max(0, -input.velocity.y) * 0.55;
    state.routeVelocity = THREE.MathUtils.lerp(
      state.routeVelocity,
      ascentIntent,
      1 - Math.pow(0.006, delta)
    );
    const worldMoveSpeed =
      (state.transition ? 0.72 : 1.72) *
      speedState.currentTuning.worldMoveSpeed *
      speedState.currentMultiplier;
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
  if (!aimAssist.active) shipGroup.rotation.z = THREE.MathUtils.lerp(shipGroup.rotation.z, 0, 0.08);
  shipMotionRig.update(shipVisualRig, shipVelocity, delta, aimAssist.recoil, aimAssist.hitStop);
  shipShieldFx.update(rawDelta);

  backgroundUniforms.uTime.value = elapsed;
  backgroundUniforms.uThrust.value =
    travelVelocity.length() + (state.controlMode === "astronaut" ? input.velocity.length() * 0.22 : 0);
  backgroundUniforms.uRouteProgress.value = state.routeProgress;
  backgroundUniforms.uPointer.value.copy(input.smoothPointer);
  backgroundUniforms.uWorldOffset.value.copy(state.worldOffset);

  updateIntegratedBackground(delta, elapsed, travelVelocity);
  updateTargetDiscovery(rawDelta);
  updateChunkObjects(delta, elapsed, travelVelocity);
  updateAmbientMeteorLayer(delta, elapsed, travelVelocity);
  updateOrbitalObjects(delta, elapsed, travelVelocity);
  updateWorldCompositionAuthority(rawDelta);
  updateMissionZones(delta, elapsed);
  updateShipEngineAudio(travelVelocity, state.transition, rawDelta);
  updateShipFx(elapsed, travelVelocity);
  updateTransition(delta, elapsed);
  updateAstronaut(delta, elapsed, input.velocity);
  updateInteractionFx(rawDelta);
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
updateSpeedButton();
updateMissionHud("TOMA EL CONTROL", "CLICK O ENTER PARA INICIAR", "SECTOR INICIAL");
syncRobotCompanion("boot");
if (params.get("robotPanel") === "1") {
  robotCompanion.panelOpen = true;
  updateRobotPanel();
}
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
if (params.get("autoTurbo") === "1") {
  hideMenu();
  window.setTimeout(() => {
    if (!mission01.started) {
      mission01.started = true;
      mission01.state = "navigation";
      updateMissionHud("RUTA ABIERTA", "TURBO DE NAVE ACTIVO", "QA / PROPULSIÓN 8 DIRECCIONES");
    }
    enterShipMode();
    const previewGems = Number(params.get("gems"));
    if (Number.isFinite(previewGems)) {
      mission01.gems = THREE.MathUtils.clamp(Math.round(previewGems), 0, 3);
      updateGemHud();
    }
    input.keys.add("f");
    const turboPreviewKeyMap = {
      up: ["w"],
      up_right: ["w", "d"],
      right: ["d"],
      down_right: ["s", "d"],
      down: ["s"],
      down_left: ["s", "a"],
      left: ["a"],
      up_left: ["w", "a"],
    };
    const turboPreviewKeys = turboPreviewKeyMap[params.get("turboDir") || "up"] || ["w"];
    turboPreviewKeys.forEach((key) => input.keys.add(key));
    robotCompanion.focus = "turbo";
    robotCompanion.focusTimer = 4;
    robotCompanion.pulse = 1;
    updateRobotPanel();
  }, 450);
}

if (params.get("autoFinal") === "1") {
  hideMenu();
  window.setTimeout(() => {
    mission01.started = true;
    mission01.state = "final";
    mission01.gems = 3;
    mission01.currentStageIndex = missionStageConfigs.length - 1;
    state.stageIndex = missionStageConfigs.length - 1;
    state.worldOffset.set(missionZoneSpecs[3].x, missionZoneSpecs[3].y);
    state.routeProgress = routeProgressFromWorldY(state.worldOffset.y);
    updateGemHud();
    updateStageHud();
    enterShipMode();
    startFinalSequence(new THREE.Vector2(0.22, 0.08));
  }, 520);
}

function centerQaViewOnTarget(target) {
  if (!target?.userData?.base) return;
  const parallax = target.userData.parallax ?? missionTargetParallax(target.userData.base.z || -2);
  const desired = new THREE.Vector2(0.34, 0.02);
  state.worldOffset.x = (target.userData.base.x - desired.x) / (0.78 + parallax * 0.28);
  state.worldOffset.y = (target.userData.base.y - desired.y) / (0.88 + parallax * 0.16);
  state.routeProgress = routeProgressFromWorldY(state.worldOffset.y);
}

function positionQaShooterForTarget(target) {
  if (!target) return;
  const shooter = shooterForTarget(target);
  const mode = aimModeForTarget(target);
  const targetPoint = predictedTargetPoint(target, mode);
  const maxRange = aimRangeForTarget(target, shooter);
  const requestedDistance = Number(params.get("qaAimDistance"));
  const distance = Number.isFinite(requestedDistance)
    ? requestedDistance
    : maxRange * (mission01.currentStageIndex >= 2 ? 0.78 : 0.68);
  const offset = new THREE.Vector2(-0.86, 0.24).normalize().multiplyScalar(distance);
  if (shooter === "astronaut") {
    enterAstronautMode();
    astronautState.position.copy(targetPoint.clone().add(offset));
  } else {
    enterShipMode();
    state.position.copy(targetPoint.clone().add(offset));
  }
}

if (params.get("autoAim")) {
  hideMenu();
  window.setTimeout(() => {
    if (!mission01.started) startMission01();
    const mode = params.get("autoAim");
    const qaTargetIndex = Number(params.get("qaTargetIndex"));
    const fireWhenReady = (selectTarget, attempts = 24) => {
      const target = selectTarget();
      if (target && target.visible && target.userData.active !== false && !target.userData.destroyed) {
        if (params.get("qaApproachTarget") === "1") {
          centerQaViewOnTarget(target);
          window.setTimeout(() => {
            positionQaShooterForTarget(target);
            fireAtTarget(target);
          }, 180);
          return;
        }
        fireAtTarget(target);
        return;
      }
      if (attempts > 0) window.setTimeout(() => fireWhenReady(selectTarget, attempts - 1), 220);
    };
    if (mode === "ship") {
      completeSmallMissionTargets();
      window.setTimeout(() => {
        fireWhenReady(() => activeMissionTargetByIndex(mission01.largeObstacles, qaTargetIndex, state.position));
      }, 360);
      return;
    }
    fireWhenReady(() => {
      if (!mission01.smallAsteroids.some((asteroid) => asteroid.userData.active && !asteroid.userData.destroyed)) {
        setMissionTargetsActive(mission01.smallAsteroids, true);
      }
      return activeMissionTargetByIndex(mission01.smallAsteroids, qaTargetIndex, astronautState.position);
    });
  }, 1150);
}
animate();
