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

        vec2 flowA = vec2(p.x * 0.38 - uTime * 0.010, p.y * 0.52 + uTime * 0.030);
        vec2 flowB = vec2(p.x * 0.82 + uTime * 0.014, p.y * 0.35 - uTime * 0.018);
        float mist = fbm(flowA * 2.2 + vec2(1.0, 4.0));
        float fine = fbm(flowB * 4.4 + vec2(8.0, 2.0));

        float vertical = smoothstep(-1.1, 1.1, p.y);
        vec3 deep = vec3(0.006, 0.008, 0.030);
        vec3 ink = vec3(0.018, 0.025, 0.082);
        vec3 violet = vec3(0.115, 0.046, 0.230);
        vec3 electric = vec3(0.050, 0.125, 0.300);
        vec3 rose = vec3(0.560, 0.095, 0.390);

        vec3 color = mix(deep, ink, vertical * 0.72);
        color += electric * smoothstep(0.18, 0.82, mist) * 0.42;
        color += violet * smoothstep(0.32, 0.92, fine) * 0.34;

        float diagonalBand = smoothstep(0.88, 0.08, abs(p.y + p.x * 0.28 + 0.52));
        float upperGlow = smoothstep(1.35, -0.18, distance(p, vec2(uAspect * 0.68, 0.68)));
        float lowerGlow = smoothstep(1.15, -0.05, distance(p, vec2(-uAspect * 0.55, -0.95)));
        color += rose * diagonalBand * 0.18;
        color += violet * upperGlow * 0.20;
        color += electric * lowerGlow * 0.22;

        float vignette = smoothstep(1.65, 0.38, length(p / vec2(max(uAspect, 1.0), 1.0)));
        color *= 0.50 + vignette * 0.70;
        color += vec3(0.006, 0.004, 0.018) * (1.0 - vignette);

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
  gradient.addColorStop(0, "rgba(255,255,255,0.94)");
  gradient.addColorStop(0.28, "rgba(176,197,255,0.42)");
  gradient.addColorStop(0.62, "rgba(129,80,255,0.13)");
  gradient.addColorStop(1, "rgba(129,80,255,0)");
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

  const atmosphere = ctx.createRadialGradient(384, 384, 235, 384, 384, 365);
  atmosphere.addColorStop(0, "rgba(115, 95, 255, 0.06)");
  atmosphere.addColorStop(0.52, "rgba(142, 68, 255, 0.11)");
  atmosphere.addColorStop(1, "rgba(142, 68, 255, 0)");
  ctx.fillStyle = atmosphere;
  ctx.fillRect(0, 0, size, size);

  const body = ctx.createRadialGradient(250, 230, 60, 384, 384, 275);
  body.addColorStop(0, "rgba(56, 72, 140, 0.52)");
  body.addColorStop(0.42, "rgba(31, 37, 99, 0.62)");
  body.addColorStop(0.78, "rgba(15, 16, 49, 0.68)");
  body.addColorStop(1, "rgba(5, 6, 20, 0.0)");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(384, 384, 278, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(215, 182, 255, 0.16)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(384, 410, 330, 72, -0.22, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(97, 171, 255, 0.08)";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.ellipse(384, 415, 368, 88, -0.22, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const starTexture = makeSoftDotTexture();
const nebulaA = makeNebulaTexture({
  core: "rgba(139, 69, 255, 0.34)",
  mid: "rgba(92, 40, 180, 0.18)",
  outer: "rgba(40, 50, 150, 0.06)",
  secondary: "rgba(255, 80, 150, 0.12)",
});
const nebulaB = makeNebulaTexture({
  core: "rgba(60, 145, 255, 0.22)",
  mid: "rgba(74, 74, 210, 0.13)",
  outer: "rgba(70, 30, 140, 0.04)",
  secondary: "rgba(195, 80, 255, 0.10)",
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
    position: new THREE.Vector3(-0.88, -0.74, -3.2),
    scale: new THREE.Vector3(2.25, 0.82, 1),
    rotation: -0.28,
    opacity: 0.72,
    drift: 0.020,
  },
  {
    texture: nebulaB,
    position: new THREE.Vector3(0.82, 0.42, -3.0),
    scale: new THREE.Vector3(2.0, 0.68, 1),
    rotation: 0.42,
    opacity: 0.52,
    drift: 0.014,
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
  count: 150,
  z: -2.6,
  opacity: 0.34,
  minScale: 0.004,
  maxScale: 0.012,
  speed: 0.038,
  spreadY: 4.2,
});
const midStars = addStarLayer({
  count: 72,
  z: -1.2,
  opacity: 0.46,
  minScale: 0.008,
  maxScale: 0.024,
  speed: 0.082,
  spreadY: 3.8,
});
const nearDust = addStarLayer({
  count: 26,
  z: 0.9,
  opacity: 0.18,
  minScale: 0.018,
  maxScale: 0.060,
  speed: 0.18,
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
  const top = 1.25;
  const bottom = -1.25;

  for (const star of group.children) {
    const { baseX, baseY, phase, drift } = star.userData;
    star.position.x = baseX + Math.sin(elapsed * 0.12 + phase) * 0.035 * drift;
    star.position.y = baseY - elapsed * speed * drift;
    star.position.x -= elapsed * speed * 0.18;

    if (star.position.y < bottom) {
      star.userData.baseY += top - bottom + Math.random() * 0.45;
      star.userData.baseX = (Math.random() - 0.5) * (viewport.aspect * 2.7);
      star.position.y = star.userData.baseY;
      star.position.x = star.userData.baseX;
    }

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
