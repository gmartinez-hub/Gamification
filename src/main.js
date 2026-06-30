import * as THREE from "../vendor/three.module.js";

const canvas = document.querySelector("#scene");
const stageButton = document.querySelector("#stageButton");
const stageLabel = document.querySelector("#stageLabel");

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

const stageDisplayName = {
  stage1: "Stage 1",
  stage2: "Stage 2",
  stage3: "Stage 3",
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
          color += wideTex * smoothstep(0.045, 0.34, wideLum) * (0.10 + route * 0.05);
          color += flowTex * smoothstep(0.030, 0.28, flowLum) * (0.09 + uThrust * 0.05);
          color += magentaTex * smoothstep(0.035, 0.30, magentaLum) * (0.08 + upperRoute * 0.06);

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

function createIntegratedAsteroid({ position, radius, routeY, objective = false, map = null, normalMap = null, size = "small" }) {
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

  backgroundScene.add(group);
  integratedBackground.asteroids.push(group);
  return group;
}

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
  opacity: 0.08,
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

function setSpriteAsset(sprite, asset) {
  sprite.material.map = asset.texture;
  sprite.userData.aspect = asset.aspect;
  sprite.material.needsUpdate = true;
}

function scaleSprite(sprite, width) {
  sprite.scale.set(width, width / sprite.userData.aspect, 1);
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
  if (state.controlMode === "astronaut") {
    stageLabel.textContent = "Astronauta";
    stageButton.textContent = "Volver a nave";
    return;
  }

  const stage = currentStage();
  stageLabel.textContent = stageDisplayName[stage];
  const nextStage = STAGES[(state.stageIndex + 1) % STAGES.length];
  stageButton.textContent = `${stageDisplayName[stage]} -> ${stageDisplayName[nextStage]}`;
}

function startStageTransition() {
  if (state.transition) return;
  const from = state.stageIndex;
  const to = (from + 1) % STAGES.length;
  state.transition = {
    from,
    to,
    time: 0,
    duration: 1.05,
    applied: false,
  };
  stageButton.disabled = true;
}

function finishStageTransition() {
  state.transition = null;
  shipSprite.material.opacity = 1;
  portalSprite.visible = false;
  ringSprite.visible = false;
  transitionStreak.visible = false;
  stageButton.disabled = false;
  updateStageHud();
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
  return THREE.MathUtils.clamp((y - WORLD_MIN_Y) / WORLD_WRAP_Y, 0, 1);
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
    layer.position.x = input.smoothPointer.x * 0.24 + cameraWorld.x * parallax * -0.04;
    layer.position.y = input.smoothPointer.y * 0.10 + cameraWorld.y * parallax * -0.05;
  }

  backgroundCamera.position.x = input.smoothPointer.x * 0.34 + travelVelocity.x * 0.12;
  backgroundCamera.position.y = 0.12 + input.smoothPointer.y * 0.14 + ascentEnergy * 0.16;
  backgroundCamera.lookAt(travelVelocity.x * 0.12, travelVelocity.y * 0.08 + ascentEnergy * 0.18, -5);

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
      input.smoothPointer.x * parallax * 0.36 +
      orbitX;
    planet.position.y =
      relativeY +
      input.smoothPointer.y * parallax * 0.10 +
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
      input.smoothPointer.x * 0.12 * depth -
      travelVelocity.x * 0.08 * depth;
    star.position.y =
      star.userData.base.y -
      ((routeScroll + elapsed * (0.04 + speed * 0.32) * (0.45 + depth)) % 22);
    if (star.position.y < -11) star.position.y += 22;
    star.material.opacity =
      0.045 +
      depth * 0.13 +
      ascentEnergy * 0.06 +
      Math.sin(elapsed * 1.8 + star.userData.phase) * 0.020;
  }

  for (const asteroid of integratedBackground.asteroids) {
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
      input.smoothPointer.x * parallax * 0.18 +
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
    backgroundObjectScreenPoint(asteroid, targetScreenPoint);
    asteroid.userData.screenPoint = targetScreenPoint.clone();
  }

  for (const line of integratedBackground.streaks.children) {
    const depth = line.userData.depth;
    const routeScroll = cameraWorld.y * (0.34 + depth * 0.92);
    line.position.x =
      line.userData.base.x -
      cameraWorld.x * 0.08 * depth -
      travelVelocity.x * depth * 0.25 +
      input.smoothPointer.x * 0.10;
    line.position.y =
      line.userData.base.y -
      ((routeScroll + elapsed * (0.25 + speed * 1.25) * (0.9 + depth * 1.2)) % 11.5);
    if (line.position.y < -5.75) line.position.y += 11.5;
    line.scale.y = 0.48 + (speed + ascentEnergy) * (0.7 + depth * 1.3);
    line.material.opacity = Math.max(0, (speed + ascentEnergy - 0.05) * (0.040 + depth * 0.090));
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
    if (!asteroid.visible || asteroid.userData.destroyed) continue;
    const screenPoint = backgroundObjectScreenPoint(asteroid, targetScreenPoint);
    asteroid.getWorldPosition(targetWorldPoint);
    const distanceToCamera = Math.max(3.5, backgroundCamera.position.distanceTo(targetWorldPoint));
    const hitRadius = THREE.MathUtils.clamp((asteroid.userData.hitRadius / distanceToCamera) * 3.1, 0.055, 0.26);
    const distance = point.distanceTo(screenPoint);
    asteroid.userData.screenPoint = screenPoint.clone();
    asteroid.userData.screenHitRadius = hitRadius;
    if (distance < hitRadius && distance < bestDistance) {
      best = asteroid;
      bestDistance = distance;
    }
  }

  return best;
}

function shooterForTarget(target) {
  if (!target) return "ship";
  return target.userData.objective || target.userData.size === "large" ? "ship" : "astronaut";
}

function createShotLine(origin, target, shooter) {
  const material = new THREE.LineBasicMaterial({
    color: shooter === "ship" ? 0x38dcff : 0xf54de3,
    transparent: true,
    opacity: 0.85,
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

function damageTarget(target, shooter) {
  if (!target || target.userData.destroyed) return;
  target.userData.hp -= shooter === "ship" ? 2 : 1;
  target.userData.hitPulse = 1;
  const impactPoint = target.userData.screenPoint || backgroundObjectScreenPoint(target, new THREE.Vector2()).clone();
  spawnImpact(impactPoint, target.userData.hp <= 0);
  if (target.userData.hp <= 0) {
    target.userData.destroyed = true;
    target.userData.destroyTime = 0;
  }
}

function fireAtTarget(target) {
  if (!target || state.transition) return;
  const shooter = shooterForTarget(target);
  if (shooter === "astronaut" && astronautSprite) enterAstronautMode();
  if (shooter === "ship") enterShipMode();

  const origin = shooter === "astronaut" ? astronautState.position.clone() : state.position.clone();
  const targetPoint = backgroundObjectScreenPoint(target, new THREE.Vector2()).clone();
  const shot = createShotLine(origin, targetPoint, shooter);
  shot.userData = { target, shooter, time: 0, duration: 0.18, origin };
  interactionFx.add(shot);
  activeShots.push(shot);
  damageTarget(target, shooter);
}

function updateInteractionFx(delta) {
  for (let i = activeShots.length - 1; i >= 0; i -= 1) {
    const shot = activeShots[i];
    shot.userData.time += delta;
    const t = shot.userData.time / shot.userData.duration;
    const targetPoint = shot.userData.target.userData.screenPoint || backgroundObjectScreenPoint(shot.userData.target, new THREE.Vector2());
    const origin = shot.userData.shooter === "astronaut" ? astronautState.position : state.position;
    const positions = shot.geometry.attributes.position;
    positions.setXYZ(0, origin.x, origin.y, 0.08);
    positions.setXYZ(1, targetPoint.x, targetPoint.y, 0.08);
    positions.needsUpdate = true;
    shot.material.opacity = Math.max(0, 0.85 * (1 - t));
    if (t >= 1) {
      interactionFx.remove(shot);
      shot.geometry.dispose();
      shot.material.dispose();
      activeShots.splice(i, 1);
    }
  }

  for (let i = activeImpacts.length - 1; i >= 0; i -= 1) {
    const impact = activeImpacts[i];
    impact.userData.time += delta;
    const t = impact.userData.time / impact.userData.duration;
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
      anchor.x + input.smoothPointer.x * 0.018,
      anchor.y + input.smoothPointer.y * 0.012 + float
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
  input.keys.add(event.key);
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (state.controlMode === "astronaut") triggerAstronautAction();
    else startStageTransition();
  }
  if (event.key === "Escape") enterShipMode();
});

window.addEventListener("keyup", (event) => {
  input.keys.delete(event.key);
});

window.addEventListener("pointermove", (event) => {
  input.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  input.pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
  input.aimPoint.copy(worldPointerFromEvent(event));
  state.hoveredTarget = findInteractiveTarget(input.aimPoint);
});

window.addEventListener("pointerleave", () => {
  input.pointer.set(0, 0);
  state.hoveredTarget = null;
});

window.addEventListener("pointerdown", (event) => {
  const point = worldPointerFromEvent(event);
  const astronautDistance = point.distanceTo(astronautState.position);
  const shipDistance = point.distanceTo(state.position);
  const target = findInteractiveTarget(point);

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
  if (state.controlMode === "astronaut") enterShipMode();
  else startStageTransition();
});

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
    : new THREE.Vector2(
        input.smoothPointer.x * 0.14,
        0.82 + Math.sin(elapsed * 0.7) * 0.05
      ).normalize();
  const behind = direction.clone().multiplyScalar(-1);
  const stageScale = { stage1: 0.82, stage2: 1, stage3: 1.16 }[currentStage()];
  const pulse = 0.5 + Math.sin(elapsed * 2.35) * 0.5;

  shipAura.material.opacity = 0.16 + pulse * 0.035 + speed * 0.20 + (state.transition ? 0.16 : 0);
  shipAura.rotation.z = elapsed * 0.16;

  velocityWake.visible = true;
  velocityWake.position.set(behind.x * 0.28 * stageScale, behind.y * 0.28 * stageScale, -0.01);
  velocityWake.material.rotation = Math.atan2(direction.y, direction.x);
  velocityWake.material.opacity = moving ? 0.12 + speed * 0.24 : 0.025 + pulse * 0.025;
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
    particle.material.opacity = moving ? (0.08 + speed * 0.20) * depth : 0.025 + pulse * 0.028;
    i += 1;
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  const keyX = keyAxis(["ArrowLeft", "a", "A"], ["ArrowRight", "d", "D"]);
  const keyY = keyAxis(["ArrowDown", "s", "S"], ["ArrowUp", "w", "W"]);
  const targetVelocity = new THREE.Vector2(keyX, keyY);
  if (targetVelocity.length() > 1) targetVelocity.normalize();

  input.smoothPointer.lerp(input.pointer, 1 - Math.pow(0.001, delta));
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
    state.worldOffset.x = THREE.MathUtils.clamp(
      state.worldOffset.x + input.velocity.x * worldMoveSpeed * delta,
      -WORLD_HALF_WIDTH,
      WORLD_HALF_WIDTH
    );
    state.worldOffset.y = THREE.MathUtils.clamp(
      state.worldOffset.y + input.velocity.y * worldMoveSpeed * 1.18 * delta,
      WORLD_MIN_Y,
      WORLD_MAX_Y
    );
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
  updateShipFx(elapsed, shipVelocity);
  updateTransition(delta, elapsed);
  updateAstronaut(delta, elapsed, input.velocity);
  updateInteractionFx(delta);
  updateTether(elapsed);

  renderer.clear();
  renderer.render(backgroundScene, backgroundCamera);
  renderer.clearDepth();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateStageHud();
window.addEventListener("resize", resize);
resize();
if (params.get("autoStage") === "1") {
  window.setTimeout(startStageTransition, 450);
}
animate();
