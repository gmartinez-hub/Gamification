import * as THREE from "../vendor/three.module.js";

const canvas = document.querySelector("#scene");
const params = new URLSearchParams(window.location.search);
const showShip = params.get("ship") !== "0";

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
const shipTexture = loader.load(new URL("../assets/ship-no-fire.png", import.meta.url).href);
shipTexture.colorSpace = THREE.SRGBColorSpace;

const backgroundUniforms = {
  uTime: { value: 0 },
  uAspect: { value: 1 },
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
          p = rot * p * 2.04 + 11.7;
          amp *= 0.5;
        }

        return value;
      }

      void main() {
        vec2 uv = vUv;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= uAspect;

        vec2 flowA = vec2(p.x * 0.34 - uTime * 0.012, p.y * 0.58 + uTime * 0.026);
        vec2 flowB = vec2(p.x * 0.92 + uTime * 0.017, p.y * 0.42 - uTime * 0.015);
        vec2 flowC = vec2(p.x * 0.54 - p.y * 0.22 + uTime * 0.007, p.y * 0.75 + uTime * 0.021);
        float mist = fbm(flowA * 2.05 + vec2(1.0, 4.0));
        float silk = fbm(flowB * 3.65 + vec2(8.0, 2.0));
        float haze = fbm(flowC * 5.10 + vec2(3.0, 9.0));

        float vertical = smoothstep(-1.16, 1.08, p.y);
        float lower = smoothstep(0.58, -1.0, p.y);
        vec3 deep = vec3(0.004, 0.007, 0.026);
        vec3 navy = vec3(0.014, 0.030, 0.096);
        vec3 violet = vec3(0.170, 0.058, 0.340);
        vec3 magenta = vec3(0.650, 0.075, 0.360);
        vec3 electric = vec3(0.030, 0.210, 0.430);
        vec3 cyan = vec3(0.080, 0.600, 0.760);

        vec3 color = mix(deep, navy, vertical * 0.86);
        color = mix(color, violet, lower * 0.36);
        color += electric * smoothstep(0.24, 0.86, mist) * 0.34;
        color += violet * smoothstep(0.30, 0.92, silk) * 0.32;
        color += magenta * smoothstep(0.44, 0.96, haze) * lower * 0.22;

        float ribbonA = smoothstep(0.72, 0.05, abs(p.y + p.x * 0.30 + 0.42));
        float ribbonB = smoothstep(0.52, 0.04, abs(p.y - p.x * 0.18 - 0.54));
        float upperGlow = smoothstep(1.45, -0.08, distance(p, vec2(uAspect * 0.64, 0.70)));
        float lowerGlow = smoothstep(1.18, -0.04, distance(p, vec2(-uAspect * 0.62, -0.92)));
        float centerDepth = smoothstep(1.10, 0.08, distance(p, vec2(0.08, -0.04)));

        color += magenta * ribbonA * 0.26;
        color += cyan * ribbonB * 0.09;
        color += violet * upperGlow * 0.24;
        color += electric * upperGlow * 0.12;
        color += magenta * lowerGlow * 0.22;
        color += cyan * centerDepth * 0.035;

        float vignette = smoothstep(1.72, 0.36, length(p / vec2(max(uAspect, 1.0), 1.0)));
        color *= 0.46 + vignette * 0.76;
        color += vec3(0.008, 0.006, 0.024) * (1.0 - vignette);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })
);
background.position.z = -5;
scene.add(background);

function makeSoftDotTexture() {
  const size = 128;
  const cnv = document.createElement("canvas");
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
  gradient.addColorStop(0, "rgba(226,238,255,0.82)");
  gradient.addColorStop(0.24, "rgba(118,182,255,0.28)");
  gradient.addColorStop(0.58, "rgba(144,88,255,0.09)");
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
  base.addColorStop(0.35, accent.mid);
  base.addColorStop(0.7, accent.outer);
  base.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const secondary = ctx.createRadialGradient(185, 320, 8, 185, 320, 190);
  secondary.addColorStop(0, accent.secondary);
  secondary.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = secondary;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePlanetTexture() {
  const size = 768;
  const cnv = document.createElement("canvas");
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext("2d");

  const atmosphere = ctx.createRadialGradient(360, 350, 170, 384, 384, 378);
  atmosphere.addColorStop(0, "rgba(75, 212, 255, 0.08)");
  atmosphere.addColorStop(0.38, "rgba(82, 96, 255, 0.22)");
  atmosphere.addColorStop(0.72, "rgba(182, 66, 255, 0.18)");
  atmosphere.addColorStop(1, "rgba(142, 68, 255, 0)");
  ctx.fillStyle = atmosphere;
  ctx.fillRect(0, 0, size, size);

  const body = ctx.createRadialGradient(260, 235, 32, 384, 384, 285);
  body.addColorStop(0, "rgba(96, 174, 255, 0.70)");
  body.addColorStop(0.30, "rgba(61, 80, 188, 0.78)");
  body.addColorStop(0.62, "rgba(48, 28, 118, 0.76)");
  body.addColorStop(0.86, "rgba(13, 13, 54, 0.70)");
  body.addColorStop(1, "rgba(5, 6, 20, 0.0)");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(384, 384, 278, 0, Math.PI * 2);
  ctx.fill();

  const innerRing = ctx.createLinearGradient(80, 300, 690, 500);
  innerRing.addColorStop(0, "rgba(50, 205, 255, 0.06)");
  innerRing.addColorStop(0.45, "rgba(230, 95, 255, 0.24)");
  innerRing.addColorStop(1, "rgba(98, 126, 255, 0.06)");
  ctx.strokeStyle = innerRing;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(384, 410, 330, 72, -0.22, 0, Math.PI * 2);
  ctx.stroke();

  const outerRing = ctx.createLinearGradient(70, 300, 700, 510);
  outerRing.addColorStop(0, "rgba(52, 220, 255, 0.04)");
  outerRing.addColorStop(0.52, "rgba(102, 100, 255, 0.18)");
  outerRing.addColorStop(1, "rgba(255, 80, 185, 0.06)");
  ctx.strokeStyle = outerRing;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.ellipse(384, 415, 368, 88, -0.22, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const starTexture = makeSoftDotTexture();
const nebulaA = makeNebulaTexture({
  core: "rgba(166, 72, 255, 0.42)",
  mid: "rgba(104, 44, 208, 0.24)",
  outer: "rgba(50, 62, 180, 0.08)",
  secondary: "rgba(255, 66, 150, 0.18)",
});
const nebulaB = makeNebulaTexture({
  core: "rgba(60, 175, 255, 0.28)",
  mid: "rgba(76, 84, 230, 0.18)",
  outer: "rgba(75, 34, 165, 0.06)",
  secondary: "rgba(214, 72, 255, 0.14)",
});
const nebulaC = makeNebulaTexture({
  core: "rgba(255, 78, 165, 0.26)",
  mid: "rgba(142, 52, 218, 0.18)",
  outer: "rgba(44, 88, 210, 0.05)",
  secondary: "rgba(88, 220, 255, 0.10)",
});
const planetTexture = makePlanetTexture();

const worldGroup = new THREE.Group();
scene.add(worldGroup);

const planet = new THREE.Sprite(
  new THREE.SpriteMaterial({
    map: planetTexture,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  })
);
planet.position.set(1.25, 0.78, -3.7);
worldGroup.add(planet);

const nebulaGroup = new THREE.Group();
worldGroup.add(nebulaGroup);

const nebulaSprites = [
  {
    texture: nebulaA,
    position: new THREE.Vector3(-0.92, -0.66, -3.2),
    scale: new THREE.Vector3(2.70, 0.98, 1),
    rotation: -0.34,
    opacity: 0.82,
    drift: 0.018,
  },
  {
    texture: nebulaB,
    position: new THREE.Vector3(0.94, 0.46, -2.9),
    scale: new THREE.Vector3(2.24, 0.80, 1),
    rotation: 0.38,
    opacity: 0.64,
    drift: 0.012,
  },
  {
    texture: nebulaC,
    position: new THREE.Vector3(0.05, -0.10, -2.7),
    scale: new THREE.Vector3(2.95, 0.62, 1),
    rotation: -0.10,
    opacity: 0.42,
    drift: 0.010,
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
  sprite.userData = {
    base: config.position.clone(),
    drift: config.drift,
    phase: Math.random() * Math.PI * 2,
  };
  nebulaGroup.add(sprite);
}

function addStarLayer({ count, z, opacity, minScale, maxScale, speed, spreadY }) {
  const group = new THREE.Group();
  group.userData = { speed };
  scene.add(group);

  for (let i = 0; i < count; i += 1) {
    const depth = Math.random();
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: starTexture,
        transparent: true,
        opacity: opacity * (0.45 + depth * 0.7),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    sprite.position.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * spreadY, z);
    const scale = THREE.MathUtils.lerp(minScale, maxScale, depth);
    sprite.scale.set(scale, scale, 1);
    sprite.userData = {
      baseX: sprite.position.x,
      baseY: sprite.position.y,
      phase: Math.random() * Math.PI * 2,
      drift: THREE.MathUtils.lerp(0.65, 1.4, depth),
    };
    group.add(sprite);
  }

  return group;
}

const farStars = addStarLayer({
  count: 105,
  z: -2.6,
  opacity: 0.22,
  minScale: 0.003,
  maxScale: 0.009,
  speed: 0.014,
  spreadY: 4.2,
});
const midStars = addStarLayer({
  count: 34,
  z: -1.2,
  opacity: 0.36,
  minScale: 0.007,
  maxScale: 0.022,
  speed: 0.030,
  spreadY: 3.8,
});
const nearDust = addStarLayer({
  count: 8,
  z: 0.9,
  opacity: 0.10,
  minScale: 0.020,
  maxScale: 0.055,
  speed: 0.044,
  spreadY: 2.8,
});

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
shipGroup.add(ship);

const clock = new THREE.Clock();
let viewport = { width: 1, height: 1, aspect: 1 };

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);

  const aspect = width / height;
  viewport = { width, height, aspect };
  camera.left = -aspect;
  camera.right = aspect;
  camera.top = 1;
  camera.bottom = -1;
  camera.updateProjectionMatrix();

  backgroundUniforms.uAspect.value = aspect;

  planet.position.x = aspect * 0.74;
  planet.position.y = 0.72;
  planet.scale.set(1.42, 1.42, 1);

  for (const layer of [farStars, midStars, nearDust]) {
    for (const star of layer.children) {
      star.userData.baseX = THREE.MathUtils.clamp(
        star.userData.baseX,
        -aspect - 0.5,
        aspect + 0.5
      );
    }
  }

  const shipWidth = aspect < 0.75 ? 1.15 : 1.36;
  ship.scale.set(shipWidth, shipWidth * 0.64, 1);
}

function smoothLoop(t) {
  return (1 - Math.cos(t * Math.PI * 2)) * 0.5;
}

function animateStarLayer(group, elapsed) {
  const speed = group.userData.speed;

  for (const star of group.children) {
    const { baseX, baseY, phase, drift } = star.userData;
    star.position.x = baseX - elapsed * speed * drift;
    star.position.x += Math.sin(elapsed * 0.10 + phase) * 0.024 * drift;
    star.position.y = baseY + Math.cos(elapsed * 0.07 + phase) * 0.018 * drift;

    if (star.position.x < -viewport.aspect - 0.35) {
      star.userData.baseX += viewport.aspect * 2 + 0.7;
    }
  }
}

function animate() {
  const elapsed = clock.getElapsedTime();
  const cycle = (elapsed % 12) / 12;
  const floatA = Math.sin(elapsed * 0.58);
  const floatB = Math.sin(elapsed * 0.92 + 1.2);
  const travel = smoothLoop(cycle);

  backgroundUniforms.uTime.value = elapsed;

  planet.position.y = 0.72 + Math.sin(elapsed * 0.06) * 0.025;
  planet.material.opacity = 0.52 + Math.sin(elapsed * 0.11) * 0.06;

  for (const nebula of nebulaGroup.children) {
    const { base, drift, phase } = nebula.userData;
    nebula.position.x = base.x + Math.sin(elapsed * drift + phase) * 0.045;
    nebula.position.y = base.y + Math.cos(elapsed * drift * 1.7 + phase) * 0.030;
    nebula.material.rotation += 0.00016;
  }

  animateStarLayer(farStars, elapsed);
  animateStarLayer(midStars, elapsed);
  animateStarLayer(nearDust, elapsed);

  shipGroup.position.x = -0.13 + Math.sin(cycle * Math.PI * 2) * 0.055 + (travel - 0.5) * 0.10;
  shipGroup.position.y = -0.02 + floatA * 0.045 + floatB * 0.014;
  shipGroup.rotation.z = -0.035 + Math.sin(elapsed * 0.48) * 0.016;
  shipGroup.rotation.x = Math.sin(elapsed * 0.33) * 0.025;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
resize();
animate();
