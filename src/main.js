import * as THREE from "../vendor/three.module.js";

const canvas = document.querySelector("#scene");
const params = new URLSearchParams(window.location.search);
const showShip = params.get("ship") === "1";

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: false,
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x02030a, 1);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
camera.position.z = 8;

const loader = new THREE.TextureLoader();

function loadTexture(path) {
  const texture = loader.load(new URL(path, import.meta.url).href);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const shipTexture = loadTexture("../assets/ship-no-fire.png");

const spaceSprites = {
  planetTechWhite: {
    texture: loadTexture("../assets/space/trimmed/planet-tech-white.png"),
    aspect: 319 / 287,
  },
  planetOceanCyber: {
    texture: loadTexture("../assets/space/trimmed/planet-ocean-cyber.png"),
    aspect: 310 / 287,
  },
  planetRingedWhite: {
    texture: loadTexture("../assets/space/trimmed/planet-ringed-white.png"),
    aspect: 360 / 283,
  },
  planetDarkMagenta: {
    texture: loadTexture("../assets/space/trimmed/planet-dark-magenta.png"),
    aspect: 317 / 292,
  },
  asteroidTechLeft: {
    texture: loadTexture("../assets/space/trimmed/asteroid-tech-left.png"),
    aspect: 234 / 224,
  },
  asteroidTechHollow: {
    texture: loadTexture("../assets/space/trimmed/asteroid-tech-hollow.png"),
    aspect: 267 / 235,
  },
  asteroidTechRound: {
    texture: loadTexture("../assets/space/trimmed/asteroid-tech-round.png"),
    aspect: 248 / 237,
  },
  asteroidDarkSmall: {
    texture: loadTexture("../assets/space/trimmed/asteroid-dark-small.png"),
    aspect: 228 / 211,
  },
  asteroidDarkTiny: {
    texture: loadTexture("../assets/space/trimmed/asteroid-dark-tiny.png"),
    aspect: 208 / 191,
  },
  meteorWhiteMagenta: {
    texture: loadTexture("../assets/space/trimmed/meteor-white-magenta.png"),
    aspect: 514 / 291,
  },
  meteorDarkCyan: {
    texture: loadTexture("../assets/space/trimmed/meteor-dark-cyan.png"),
    aspect: 481 / 281,
  },
  meteorIceCyan: {
    texture: loadTexture("../assets/space/trimmed/meteor-ice-cyan.png"),
    aspect: 473 / 291,
  },
};

const controls = {
  pointer: new THREE.Vector2(0, 0),
  smoothPointer: new THREE.Vector2(0, 0),
  scroll: new THREE.Vector2(0, 0),
  keys: new Set(),
};

const viewport = { width: 1, height: 1, aspect: 1 };
const clock = new THREE.Clock();

window.addEventListener("pointermove", (event) => {
  controls.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  controls.pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
});

window.addEventListener("pointerleave", () => {
  controls.pointer.set(0, 0);
});

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(event.key)) {
    controls.keys.add(event.key);
  }
});

window.addEventListener("keyup", (event) => {
  controls.keys.delete(event.key);
});

const backgroundUniforms = {
  uTime: { value: 0 },
  uAspect: { value: 1 },
  uDrift: { value: new THREE.Vector2(0, 0) },
};

const background = new THREE.Mesh(
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
      uniform vec2 uDrift;
      varying vec2 vUv;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
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
        float amp = 0.5;
        mat2 rot = mat2(0.86, -0.50, 0.50, 0.86);

        for (int i = 0; i < 5; i++) {
          value += noise(p) * amp;
          p = rot * p * 2.03 + 17.1;
          amp *= 0.5;
        }

        return value;
      }

      void main() {
        vec2 uv = vUv;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= uAspect;

        vec2 drift = uDrift * 0.10;
        vec2 flowA = vec2(p.x * 0.28 - uTime * 0.006 + drift.x, p.y * 0.55 + uTime * 0.010 + drift.y);
        vec2 flowB = vec2(p.x * 0.76 + uTime * 0.007 - drift.x, p.y * 0.34 - uTime * 0.006);
        vec2 flowC = vec2(p.x * 0.46 - p.y * 0.20 + drift.x * 0.5, p.y * 0.82 + drift.y * 0.6);

        float mist = fbm(flowA * 2.10 + vec2(1.0, 4.0));
        float silk = fbm(flowB * 3.10 + vec2(8.0, 2.0));
        float haze = fbm(flowC * 4.00 + vec2(3.0, 9.0));

        float vertical = smoothstep(-1.18, 1.05, p.y);
        float lower = smoothstep(0.58, -1.0, p.y);
        vec3 deep = vec3(0.004, 0.007, 0.026);
        vec3 navy = vec3(0.012, 0.036, 0.112);
        vec3 violet = vec3(0.155, 0.050, 0.345);
        vec3 magenta = vec3(0.570, 0.060, 0.345);
        vec3 electric = vec3(0.018, 0.190, 0.390);
        vec3 cyan = vec3(0.050, 0.560, 0.700);

        vec3 color = mix(deep, navy, vertical * 0.85);
        color = mix(color, violet, lower * 0.34);
        color += electric * smoothstep(0.30, 0.88, mist) * 0.26;
        color += violet * smoothstep(0.40, 0.96, silk) * 0.24;
        color += magenta * smoothstep(0.50, 0.96, haze) * lower * 0.20;

        float ribbonA = smoothstep(0.82, 0.06, abs(p.y + p.x * 0.26 + 0.38));
        float ribbonB = smoothstep(0.68, 0.05, abs(p.y - p.x * 0.20 - 0.56));
        float upperGlow = smoothstep(1.62, -0.08, distance(p, vec2(uAspect * 0.62, 0.70)));
        float lowerGlow = smoothstep(1.20, -0.04, distance(p, vec2(-uAspect * 0.60, -0.92)));
        float centerDepth = smoothstep(1.10, 0.08, distance(p, vec2(0.10, -0.04)));

        color += magenta * ribbonA * 0.18;
        color += cyan * ribbonB * 0.07;
        color += violet * upperGlow * 0.18;
        color += electric * upperGlow * 0.12;
        color += magenta * lowerGlow * 0.19;
        color += cyan * centerDepth * 0.030;

        float vignette = smoothstep(1.76, 0.38, length(p / vec2(max(uAspect, 1.0), 1.0)));
        color *= 0.46 + vignette * 0.78;
        color += vec3(0.008, 0.006, 0.024) * (1.0 - vignette);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })
);
background.renderOrder = 0;
scene.add(background);

function seededRandom(seed) {
  let value = seed;
  return function random() {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSoftDotTexture() {
  const size = 128;
  const cnv = document.createElement("canvas");
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 58);
  gradient.addColorStop(0, "rgba(226,238,255,0.78)");
  gradient.addColorStop(0.22, "rgba(118,182,255,0.24)");
  gradient.addColorStop(0.58, "rgba(144,88,255,0.07)");
  gradient.addColorStop(1, "rgba(144,88,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeNebulaTexture(accent) {
  const size = 512;
  const cnv = document.createElement("canvas");
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext("2d");

  const base = ctx.createRadialGradient(256, 256, 18, 256, 256, 250);
  base.addColorStop(0, accent.core);
  base.addColorStop(0.34, accent.mid);
  base.addColorStop(0.72, accent.outer);
  base.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const secondary = ctx.createRadialGradient(190, 318, 8, 190, 318, 192);
  secondary.addColorStop(0, accent.secondary);
  secondary.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = secondary;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePlanetTexture(config) {
  const size = 1024;
  const cnv = document.createElement("canvas");
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;
  const radius = 280;

  const atmosphere = ctx.createRadialGradient(cx - 40, cy - 46, radius * 0.52, cx, cy, radius * 1.44);
  atmosphere.addColorStop(0, config.atmosphereInner);
  atmosphere.addColorStop(0.52, config.atmosphereMid);
  atmosphere.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = atmosphere;
  ctx.fillRect(0, 0, size, size);

  if (config.ring) {
    const backRing = ctx.createLinearGradient(128, 360, 880, 600);
    backRing.addColorStop(0, config.ringOuter);
    backRing.addColorStop(0.50, config.ringInner);
    backRing.addColorStop(1, config.ringOuter);
    ctx.strokeStyle = backRing;
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 32, 410, 92, config.ringAngle, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  const body = ctx.createRadialGradient(cx - 125, cy - 135, 20, cx, cy, radius);
  body.addColorStop(0, config.light);
  body.addColorStop(0.34, config.mid);
  body.addColorStop(0.70, config.shadow);
  body.addColorStop(1, config.edge);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = body;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  for (const band of config.bands) {
    const bandGradient = ctx.createLinearGradient(cx - radius, cy + band.y, cx + radius, cy + band.y);
    bandGradient.addColorStop(0, "rgba(255,255,255,0)");
    bandGradient.addColorStop(0.28, band.color);
    bandGradient.addColorStop(0.70, band.colorAlt);
    bandGradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = bandGradient;
    ctx.globalAlpha = band.alpha;
    ctx.beginPath();
    ctx.ellipse(cx + band.offset, cy + band.y, radius * 1.14, band.height, band.angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const terminator = ctx.createRadialGradient(cx + 115, cy + 105, 40, cx + 100, cy + 100, radius * 1.05);
  terminator.addColorStop(0, "rgba(4, 5, 18, 0)");
  terminator.addColorStop(0.62, "rgba(4, 5, 18, 0.18)");
  terminator.addColorStop(1, "rgba(4, 5, 18, 0.55)");
  ctx.fillStyle = terminator;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();

  const rim = ctx.createRadialGradient(cx - 36, cy - 48, radius * 0.86, cx, cy, radius * 1.08);
  rim.addColorStop(0, "rgba(255,255,255,0)");
  rim.addColorStop(0.78, "rgba(255,255,255,0)");
  rim.addColorStop(1, config.rim);
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
  ctx.fill();

  if (config.ring) {
    const frontRing = ctx.createLinearGradient(128, 360, 880, 600);
    frontRing.addColorStop(0, config.ringOuter);
    frontRing.addColorStop(0.50, config.ringInner);
    frontRing.addColorStop(1, config.ringOuter);
    ctx.strokeStyle = frontRing;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 32, 410, 92, config.ringAngle, 0, Math.PI);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeAsteroidTexture(seed) {
  const random = seededRandom(seed);
  const size = 256;
  const cnv = document.createElement("canvas");
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext("2d");
  const points = [];
  const count = 12;

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 62 + random() * 38;
    points.push({
      x: 128 + Math.cos(angle) * radius,
      y: 128 + Math.sin(angle) * radius,
    });
  }

  const rock = ctx.createLinearGradient(70, 64, 190, 205);
  rock.addColorStop(0, "rgba(138, 148, 165, 0.92)");
  rock.addColorStop(0.44, "rgba(78, 84, 104, 0.94)");
  rock.addColorStop(1, "rgba(34, 37, 52, 0.92)");
  ctx.fillStyle = rock;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(190, 215, 255, 0.22)";
  ctx.lineWidth = 3;
  ctx.stroke();

  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = `rgba(20, 24, 36, ${0.18 + random() * 0.18})`;
    ctx.beginPath();
    ctx.ellipse(78 + random() * 96, 74 + random() * 92, 8 + random() * 18, 5 + random() * 12, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const starTexture = makeSoftDotTexture();
const nebulaA = makeNebulaTexture({
  core: "rgba(166, 72, 255, 0.42)",
  mid: "rgba(104, 44, 208, 0.22)",
  outer: "rgba(50, 62, 180, 0.07)",
  secondary: "rgba(255, 66, 150, 0.16)",
});
const nebulaB = makeNebulaTexture({
  core: "rgba(60, 175, 255, 0.26)",
  mid: "rgba(76, 84, 230, 0.16)",
  outer: "rgba(75, 34, 165, 0.05)",
  secondary: "rgba(214, 72, 255, 0.12)",
});
const nebulaC = makeNebulaTexture({
  core: "rgba(255, 78, 165, 0.24)",
  mid: "rgba(142, 52, 218, 0.16)",
  outer: "rgba(44, 88, 210, 0.05)",
  secondary: "rgba(88, 220, 255, 0.08)",
});

const planetTextures = [
  makePlanetTexture({
    light: "rgba(120, 210, 255, 0.94)",
    mid: "rgba(62, 92, 220, 0.96)",
    shadow: "rgba(42, 26, 122, 0.98)",
    edge: "rgba(12, 14, 52, 0.98)",
    atmosphereInner: "rgba(75, 220, 255, 0.10)",
    atmosphereMid: "rgba(96, 86, 255, 0.28)",
    rim: "rgba(93, 226, 255, 0.38)",
    ring: true,
    ringAngle: -0.18,
    ringInner: "rgba(180, 96, 255, 0.30)",
    ringOuter: "rgba(72, 174, 255, 0.10)",
    bands: [
      { y: -70, height: 24, offset: -20, angle: -0.08, alpha: 0.22, color: "rgba(255,255,255,0.20)", colorAlt: "rgba(90,220,255,0.18)" },
      { y: 25, height: 34, offset: 18, angle: 0.06, alpha: 0.18, color: "rgba(255,76,190,0.20)", colorAlt: "rgba(115,120,255,0.16)" },
    ],
  }),
  makePlanetTexture({
    light: "rgba(255, 140, 212, 0.92)",
    mid: "rgba(166, 70, 225, 0.96)",
    shadow: "rgba(58, 32, 138, 0.98)",
    edge: "rgba(15, 12, 52, 0.98)",
    atmosphereInner: "rgba(255, 98, 190, 0.12)",
    atmosphereMid: "rgba(155, 82, 255, 0.26)",
    rim: "rgba(255, 126, 220, 0.34)",
    ring: false,
    bands: [
      { y: -42, height: 20, offset: -8, angle: 0.12, alpha: 0.20, color: "rgba(255,255,255,0.18)", colorAlt: "rgba(86,220,255,0.12)" },
      { y: 60, height: 24, offset: 20, angle: -0.10, alpha: 0.16, color: "rgba(45,210,255,0.18)", colorAlt: "rgba(255,85,180,0.16)" },
    ],
  }),
  makePlanetTexture({
    light: "rgba(92, 236, 255, 0.90)",
    mid: "rgba(38, 130, 220, 0.96)",
    shadow: "rgba(22, 38, 118, 0.98)",
    edge: "rgba(7, 10, 42, 0.98)",
    atmosphereInner: "rgba(80, 235, 255, 0.10)",
    atmosphereMid: "rgba(54, 124, 255, 0.22)",
    rim: "rgba(86, 232, 255, 0.34)",
    ring: true,
    ringAngle: 0.22,
    ringInner: "rgba(94, 230, 255, 0.26)",
    ringOuter: "rgba(255, 90, 190, 0.08)",
    bands: [
      { y: -12, height: 30, offset: 24, angle: -0.04, alpha: 0.19, color: "rgba(255,255,255,0.15)", colorAlt: "rgba(255,95,200,0.12)" },
      { y: 78, height: 18, offset: -28, angle: 0.08, alpha: 0.16, color: "rgba(135,255,255,0.18)", colorAlt: "rgba(80,90,255,0.14)" },
    ],
  }),
];

const worldGroup = new THREE.Group();
scene.add(worldGroup);

const nebulaGroup = new THREE.Group();
worldGroup.add(nebulaGroup);

const nebulaSprites = [
  {
    texture: nebulaA,
    position: new THREE.Vector3(-0.96, -0.70, -3.2),
    scale: new THREE.Vector3(2.72, 1.00, 1),
    rotation: -0.34,
    opacity: 0.80,
    drift: 0.018,
    depth: 0.18,
  },
  {
    texture: nebulaB,
    position: new THREE.Vector3(0.98, 0.48, -2.9),
    scale: new THREE.Vector3(2.22, 0.82, 1),
    rotation: 0.38,
    opacity: 0.58,
    drift: 0.012,
    depth: 0.30,
  },
  {
    texture: nebulaC,
    position: new THREE.Vector3(0.02, -0.12, -2.7),
    scale: new THREE.Vector3(3.00, 0.64, 1),
    rotation: -0.10,
    opacity: 0.38,
    drift: 0.010,
    depth: 0.24,
  },
];

for (const config of nebulaSprites) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: config.texture,
      transparent: true,
      opacity: config.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sprite.position.copy(config.position);
  sprite.scale.copy(config.scale);
  sprite.material.rotation = config.rotation;
  sprite.renderOrder = 1;
  sprite.userData = {
    base: config.position.clone(),
    drift: config.drift,
    depth: config.depth,
    phase: Math.random() * Math.PI * 2,
  };
  nebulaGroup.add(sprite);
}

const planetGroup = new THREE.Group();
worldGroup.add(planetGroup);

const planetConfigs = [
  { asset: spaceSprites.planetRingedWhite, x: 1.28, y: 0.66, scale: 0.92, depth: 0.78, opacity: 0.95, rotation: -0.03, anchor: "upperRight" },
  { asset: spaceSprites.planetOceanCyber, x: -3.20, y: -0.78, scale: 0.56, depth: 0.98, opacity: 0.86, rotation: 0.06 },
  { asset: spaceSprites.planetTechWhite, x: 3.90, y: -0.18, scale: 0.52, depth: 1.12, opacity: 0.82, rotation: -0.12 },
  { asset: spaceSprites.planetDarkMagenta, x: 6.80, y: 0.46, scale: 0.54, depth: 1.35, opacity: 0.80, rotation: 0.08 },
  { asset: spaceSprites.planetOceanCyber, x: -5.80, y: 0.20, scale: 0.38, depth: 1.48, opacity: 0.64, rotation: -0.18 },
];

for (const config of planetConfigs) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: config.asset.texture,
      transparent: true,
      opacity: config.opacity,
      depthWrite: false,
    })
  );
  const widthScale = config.scale * config.asset.aspect;
  sprite.position.set(config.x, config.y, -2.2);
  sprite.scale.set(widthScale, config.scale, 1);
  sprite.material.rotation = config.rotation;
  sprite.renderOrder = 2;
  sprite.userData = {
    base: new THREE.Vector3(config.x, config.y, -2.2),
    depth: config.depth,
    aspect: config.asset.aspect,
    baseScale: new THREE.Vector2(widthScale, config.scale),
    anchor: config.anchor || null,
    phase: Math.random() * Math.PI * 2,
  };
  planetGroup.add(sprite);
}

const starGroup = new THREE.Group();
scene.add(starGroup);

function addStarLayer({ count, opacity, minScale, maxScale, depth, spreadY }) {
  const group = new THREE.Group();
  group.userData = { depth };
  starGroup.add(group);

  for (let i = 0; i < count; i += 1) {
    const localDepth = Math.random();
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: starTexture,
        transparent: true,
        opacity: opacity * (0.35 + localDepth * 0.75),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    sprite.position.set((Math.random() - 0.5) * 7.0, (Math.random() - 0.5) * spreadY, -1.3);
    const scale = THREE.MathUtils.lerp(minScale, maxScale, localDepth);
    sprite.scale.set(scale, scale, 1);
    sprite.renderOrder = 3;
    sprite.userData = {
      baseX: sprite.position.x,
      baseY: sprite.position.y,
      phase: Math.random() * Math.PI * 2,
      drift: THREE.MathUtils.lerp(0.7, 1.35, localDepth),
    };
    group.add(sprite);
  }

  return group;
}

const farStars = addStarLayer({
  count: 70,
  opacity: 0.16,
  minScale: 0.003,
  maxScale: 0.008,
  depth: 0.24,
  spreadY: 4.2,
});
const midStars = addStarLayer({
  count: 20,
  opacity: 0.26,
  minScale: 0.008,
  maxScale: 0.019,
  depth: 0.48,
  spreadY: 3.7,
});

const asteroidGroup = new THREE.Group();
scene.add(asteroidGroup);

const asteroidSprites = [
  spaceSprites.asteroidTechLeft,
  spaceSprites.asteroidTechHollow,
  spaceSprites.asteroidTechRound,
  spaceSprites.asteroidDarkSmall,
  spaceSprites.asteroidDarkTiny,
];

for (let i = 0; i < 14; i += 1) {
  const asset = asteroidSprites[i % asteroidSprites.length];
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: asset.texture,
      transparent: true,
      opacity: 0.23 + (i % 4) * 0.045,
      depthWrite: false,
    })
  );
  const x = -5.2 + i * 0.92;
  const y = -0.90 + ((i * 37) % 160) / 100;
  const scale = 0.105 + ((i * 19) % 86) / 1000;
  sprite.position.set(x, y, 0.5);
  sprite.scale.set(scale * asset.aspect, scale, 1);
  sprite.material.rotation = i * 0.36;
  sprite.material.opacity = 0.42 + (i % 4) * 0.055;
  sprite.renderOrder = 4;
  sprite.userData = {
    base: new THREE.Vector3(x, y, 0.5),
    depth: 1.60 + (i % 5) * 0.18,
    spin: (i % 2 === 0 ? 1 : -1) * (0.010 + (i % 4) * 0.006),
    phase: i * 0.71,
    baseScale: new THREE.Vector2(scale * asset.aspect, scale),
  };
  asteroidGroup.add(sprite);
}

const meteorGroup = new THREE.Group();
scene.add(meteorGroup);

const meteorConfigs = [
  { asset: spaceSprites.meteorDarkCyan, x: 2.90, y: 0.82, scale: 0.34, depth: 1.86, speed: 0.32, opacity: 0.55, phase: 0.10 },
  { asset: spaceSprites.meteorWhiteMagenta, x: -1.10, y: -0.88, scale: 0.28, depth: 1.70, speed: 0.24, opacity: 0.48, phase: 2.70 },
  { asset: spaceSprites.meteorIceCyan, x: 5.20, y: -0.34, scale: 0.31, depth: 2.02, speed: 0.28, opacity: 0.45, phase: 5.40 },
];

for (const config of meteorConfigs) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: config.asset.texture,
      transparent: true,
      opacity: config.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const widthScale = config.scale * config.asset.aspect;
  sprite.position.set(config.x, config.y, 0.75);
  sprite.scale.set(widthScale, config.scale, 1);
  sprite.renderOrder = 5;
  sprite.userData = {
    base: new THREE.Vector3(config.x, config.y, 0.75),
    depth: config.depth,
    speed: config.speed,
    phase: config.phase,
    baseScale: new THREE.Vector2(widthScale, config.scale),
  };
  meteorGroup.add(sprite);
}

const shipGroup = new THREE.Group();
shipGroup.visible = showShip;
scene.add(shipGroup);

const ship = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: shipTexture,
    transparent: true,
    depthWrite: false,
  })
);
ship.renderOrder = 10;
shipGroup.add(ship);

function keyAxis(negativeKeys, positiveKeys) {
  let value = 0;
  for (const key of negativeKeys) {
    if (controls.keys.has(key)) value -= 1;
  }
  for (const key of positiveKeys) {
    if (controls.keys.has(key)) value += 1;
  }
  return value;
}

function wrapCentered(value, span) {
  return ((((value + span / 2) % span) + span) % span) - span / 2;
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);

  viewport.width = width;
  viewport.height = height;
  viewport.aspect = width / height;

  camera.left = -viewport.aspect;
  camera.right = viewport.aspect;
  camera.top = 1;
  camera.bottom = -1;
  camera.updateProjectionMatrix();

  backgroundUniforms.uAspect.value = viewport.aspect;

  const shipWidth = viewport.aspect < 0.75 ? 1.15 : 1.36;
  ship.scale.set(shipWidth, shipWidth * 0.64, 1);

  for (const planet of planetGroup.children) {
    if (planet.userData.anchor === "upperRight") {
      const mobile = viewport.aspect < 0.75;
      planet.userData.base.x = viewport.aspect * (mobile ? 0.54 : 0.72);
      planet.userData.base.y = mobile ? 0.70 : 0.72;
      const baseHeight = mobile ? 0.58 : 0.78;
      planet.userData.baseScale.set(baseHeight * planet.userData.aspect, baseHeight);
      planet.scale.set(planet.userData.baseScale.x, planet.userData.baseScale.y, 1);
    }
  }
}

function smoothLoop(t) {
  return (1 - Math.cos(t * Math.PI * 2)) * 0.5;
}

function animateWrappedSprite(sprite, elapsed, span, verticalFactor = 0.12) {
  const { base, depth, phase, baseScale } = sprite.userData;
  const x = wrapCentered(base.x - controls.scroll.x * depth, span);
  const y = base.y - controls.scroll.y * depth * verticalFactor;
  sprite.position.x = x + controls.smoothPointer.x * 0.10 * depth;
  sprite.position.y = y + controls.smoothPointer.y * 0.06 * depth + Math.sin(elapsed * 0.18 + phase) * 0.018;
  if (baseScale) {
    const pulse = 1 + Math.sin(elapsed * 0.22 + phase) * 0.015;
    if (baseScale.isVector2) {
      sprite.scale.set(baseScale.x * pulse, baseScale.y * pulse, 1);
    } else {
      sprite.scale.set(baseScale * pulse, baseScale * pulse, 1);
    }
  }
}

function animateStars(group, elapsed, span) {
  const depth = group.userData.depth;
  for (const star of group.children) {
    const { baseX, baseY, phase, drift } = star.userData;
    star.position.x = wrapCentered(baseX - controls.scroll.x * depth * drift, span);
    star.position.x += Math.sin(elapsed * 0.09 + phase) * 0.018 * drift;
    star.position.y = baseY + controls.smoothPointer.y * 0.025 * depth + Math.cos(elapsed * 0.07 + phase) * 0.014 * drift;
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;
  const cycle = (elapsed % 12) / 12;
  const travel = smoothLoop(cycle);

  const keyX = keyAxis(["ArrowLeft", "a"], ["ArrowRight", "d"]);
  const keyY = keyAxis(["ArrowDown", "s"], ["ArrowUp", "w"]);
  controls.smoothPointer.lerp(controls.pointer, 1 - Math.pow(0.001, delta));

  controls.scroll.x += (keyX * 0.92 + controls.smoothPointer.x * 0.18) * delta;
  controls.scroll.y += (keyY * 0.48 + controls.smoothPointer.y * 0.08) * delta;

  backgroundUniforms.uTime.value = elapsed;
  backgroundUniforms.uDrift.value.copy(controls.scroll).multiplyScalar(0.12);

  const span = viewport.aspect * 2 + 7.6;

  for (const nebula of nebulaGroup.children) {
    const { base, drift, depth, phase } = nebula.userData;
    nebula.position.x = base.x - controls.scroll.x * depth + Math.sin(elapsed * drift + phase) * 0.040;
    nebula.position.y = base.y - controls.scroll.y * depth * 0.12 + Math.cos(elapsed * drift * 1.7 + phase) * 0.028;
    nebula.material.rotation += 0.00010;
  }

  for (const planet of planetGroup.children) {
    animateWrappedSprite(planet, elapsed, span, 0.18);
  }

  animateStars(farStars, elapsed, span);
  animateStars(midStars, elapsed, span);

  for (const asteroid of asteroidGroup.children) {
    animateWrappedSprite(asteroid, elapsed, span, 0.28);
    asteroid.material.rotation += asteroid.userData.spin;
  }

  for (const meteor of meteorGroup.children) {
    const { base, depth, phase, speed, baseScale } = meteor.userData;
    const meteorSpan = span + 3.8;
    const travel = elapsed * speed + phase;
    meteor.position.x = wrapCentered(base.x - controls.scroll.x * depth - travel, meteorSpan);
    meteor.position.y = base.y - controls.scroll.y * depth * 0.16 - Math.sin(travel * 0.72) * 0.045;
    meteor.position.x += controls.smoothPointer.x * 0.08 * depth;
    meteor.position.y += controls.smoothPointer.y * 0.04 * depth;

    const pulse = 1 + Math.sin(elapsed * 0.42 + phase) * 0.025;
    meteor.scale.set(baseScale.x * pulse, baseScale.y * pulse, 1);
  }

  shipGroup.position.x = -0.13 + Math.sin(cycle * Math.PI * 2) * 0.050 + (travel - 0.5) * 0.08;
  shipGroup.position.y = -0.02 + Math.sin(elapsed * 0.58) * 0.040 + Math.sin(elapsed * 0.92 + 1.2) * 0.012;
  shipGroup.rotation.z = -0.035 + Math.sin(elapsed * 0.48) * 0.016 + controls.smoothPointer.x * 0.015;
  shipGroup.rotation.x = Math.sin(elapsed * 0.33) * 0.022;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
resize();
animate();
