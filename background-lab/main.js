import * as THREE from "../vendor/three.module.js";

const canvas = document.querySelector("#labScene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x030513, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030513, 0.016);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 90);
camera.position.set(0, 0.15, 9.5);

const clock = new THREE.Clock();
const viewport = { width: 1, height: 1, aspect: 1 };

const input = {
  keys: new Set(),
  pointer: new THREE.Vector2(),
  smoothPointer: new THREE.Vector2(),
  velocity: new THREE.Vector2(0, 0.24),
};

const labState = {
  travel: 0,
  thrust: 0.24,
};

const COLOR = {
  cyan: new THREE.Color("#28dcff"),
  magenta: new THREE.Color("#f23bd6"),
  violet: new THREE.Color("#835cff"),
  graphite: new THREE.Color("#202536"),
};

function seedRandom(seed) {
  let value = seed;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seedRandom(2906);

function makeNebulaMaterial() {
  return new THREE.ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uPointer: { value: new THREE.Vector2() },
      uThrust: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uAspect;
      uniform float uThrust;
      uniform vec2 uPointer;
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
        float amp = 0.56;
        mat2 rot = mat2(0.86, -0.50, 0.50, 0.86);
        for (int i = 0; i < 5; i++) {
          value += noise(p) * amp;
          p = rot * p * 2.03 + 11.4;
          amp *= 0.50;
        }
        return value;
      }

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        p.x *= uAspect;

        vec2 drift = vec2(uTime * 0.010 + uPointer.x * 0.018, -uTime * 0.014 + uPointer.y * 0.010);
        float vertical = smoothstep(-1.1, 1.0, p.y);
        float n1 = fbm(vec2(p.x * 0.36, p.y * 0.78) + drift);
        float n2 = fbm(vec2(p.x * 0.90 - p.y * 0.20, p.y * 0.34) - drift * 0.72);
        float corridor = smoothstep(0.62, 0.05, abs(p.x * 0.30 + p.y * 0.92 + 0.08));

        vec3 deep = vec3(0.004, 0.006, 0.028);
        vec3 navy = vec3(0.010, 0.026, 0.090);
        vec3 violet = vec3(0.135, 0.045, 0.315);
        vec3 magenta = vec3(0.470, 0.052, 0.330);
        vec3 cyan = vec3(0.025, 0.350, 0.500);

        vec3 color = mix(deep, navy, vertical * 0.72);
      color += violet * smoothstep(0.45, 0.92, n1) * 0.44;
      color += magenta * smoothstep(0.61, 0.97, n2) * 0.20;
      color += cyan * smoothstep(0.63, 1.0, n1 + n2 * 0.25) * 0.16;
      color += vec3(0.065, 0.210, 0.310) * corridor * (0.17 + uThrust * 0.16);

        float vignette = smoothstep(1.70, 0.35, length(p / vec2(max(uAspect, 1.0), 1.0)));
        color *= 0.48 + vignette * 0.94;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

const nebulaMaterial = makeNebulaMaterial();
const nebula = new THREE.Mesh(new THREE.PlaneGeometry(60, 38), nebulaMaterial);
nebula.position.set(0, 0, -28);
scene.add(nebula);

const ambientLight = new THREE.AmbientLight(0x8ba2ff, 0.98);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
keyLight.position.set(-4.2, 3.4, 7.5);
scene.add(keyLight);

const rimLight = new THREE.PointLight(0xff4edc, 2.6, 30);
rimLight.position.set(5.2, -2.8, 3.8);
scene.add(rimLight);

const cyanLight = new THREE.PointLight(0x31dcff, 1.8, 26);
cyanLight.position.set(-5.5, 2.6, 2.2);
scene.add(cyanLight);

function makeRadialTexture(stops) {
  const size = 512;
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = size;
  canvasTexture.height = size;
  const ctx = canvasTexture.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [position, color] of stops) gradient.addColorStop(position, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const starTexture = makeRadialTexture([
  [0, "rgba(255,255,255,0.86)"],
  [0.22, "rgba(90,220,255,0.48)"],
  [0.68, "rgba(180,80,255,0.14)"],
  [1, "rgba(180,80,255,0)"],
]);

const haloTexture = makeRadialTexture([
  [0, "rgba(255,255,255,0.14)"],
  [0.22, "rgba(60,225,255,0.28)"],
  [0.54, "rgba(238,55,220,0.18)"],
  [1, "rgba(70,35,180,0)"],
]);

function makePlanetTexture(kind) {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");

  const base = ctx.createLinearGradient(0, 0, size, size);
  if (kind === "dark") {
    base.addColorStop(0, "#1c2236");
    base.addColorStop(0.45, "#151827");
    base.addColorStop(1, "#050711");
  } else {
    base.addColorStop(0, "#e9fbff");
    base.addColorStop(0.16, "#5ed9f7");
    base.addColorStop(0.48, "#236bcf");
    base.addColorStop(1, "#0a1239");
  }
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 34; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = 18 + random() * 110;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const alpha = kind === "dark" ? 0.40 : 0.26;
    g.addColorStop(0, kind === "dark" ? `rgba(242,55,214,${alpha})` : `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.55, kind === "dark" ? "rgba(40,220,255,0.15)" : "rgba(40,220,255,0.14)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = kind === "dark" ? 0.24 : 0.34;
  for (let y = -80; y < size + 120; y += 78) {
    const stripe = ctx.createLinearGradient(120, y, size - 80, y + 60);
    stripe.addColorStop(0, "rgba(255,70,210,0)");
    stripe.addColorStop(0.40, "rgba(255,70,210,0.58)");
    stripe.addColorStop(0.64, "rgba(40,220,255,0.50)");
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

function createPlanet({ kind, radius, position, opacity = 1 }) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData.base = position.clone();
  group.userData.parallax = Math.abs(position.z) < 12 ? 0.16 : 0.08;
  group.userData.spin = kind === "dark" ? -0.028 : 0.020;

  const material = new THREE.MeshStandardMaterial({
    map: makePlanetTexture(kind),
    roughness: 0.78,
    metalness: 0.04,
    emissive: kind === "dark" ? 0x220a38 : 0x062f5e,
    emissiveIntensity: kind === "dark" ? 0.30 : 0.24,
    transparent: opacity < 1,
    opacity,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 72, 48), material);
  group.add(sphere);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.045, 72, 48),
    new THREE.MeshBasicMaterial({
      color: kind === "dark" ? 0xf23bd6 : 0x28dcff,
      transparent: true,
      opacity: kind === "dark" ? 0.18 : 0.20,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  group.add(atmosphere);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: haloTexture,
      transparent: true,
      opacity: kind === "dark" ? 0.28 : 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  halo.scale.set(radius * 3.2, radius * 3.2, 1);
  halo.position.z = -0.08;
  group.add(halo);

  scene.add(group);
  return group;
}

const planets = [
  createPlanet({
    kind: "ocean",
    radius: 1.92,
    position: new THREE.Vector3(5.75, 2.42, -10.4),
  }),
  createPlanet({
    kind: "dark",
    radius: 1.70,
    position: new THREE.Vector3(-5.65, -3.03, -9.2),
    opacity: 0.96,
  }),
  createPlanet({
    kind: "ocean",
    radius: 0.62,
    position: new THREE.Vector3(-6.35, 2.72, -14.8),
    opacity: 0.64,
  }),
];

const stars = new THREE.Group();
scene.add(stars);
for (let i = 0; i < 520; i += 1) {
  const star = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: starTexture,
      transparent: true,
      opacity: 0.05 + random() * 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const z = -6 - random() * 32;
  const size = 0.018 + random() * 0.055;
  star.position.set((random() - 0.5) * 28, (random() - 0.5) * 18, z);
  star.scale.set(size, size, 1);
  star.userData = {
    base: star.position.clone(),
    depth: (Math.abs(z) - 6) / 32,
    phase: random() * Math.PI * 2,
  };
  stars.add(star);
}

function createAsteroidGeometry(radius) {
  const geometry = new THREE.DodecahedronGeometry(radius, 1);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const v = new THREE.Vector3().fromBufferAttribute(position, i);
    const factor = 0.84 + random() * 0.28;
    v.multiplyScalar(factor);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function createTechShard(color, radius) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shard = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.34, radius * 0.050, radius * 0.030), material);
  shard.position.set((random() - 0.5) * radius * 0.78, (random() - 0.5) * radius * 0.62, radius * 0.88);
  shard.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
  return shard;
}

function createAsteroid({ position, radius, objective = false }) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData = {
    base: position.clone(),
    parallax: THREE.MathUtils.mapLinear(position.z, -18, 2, 0.05, 0.50),
    drift: new THREE.Vector3((random() - 0.5) * 0.055, -0.045 - random() * 0.050, 0),
    spin: new THREE.Vector3(0.10 + random() * 0.14, 0.13 + random() * 0.18, 0.05 + random() * 0.08),
    phase: random() * Math.PI * 2,
    objective,
  };

  const material = new THREE.MeshStandardMaterial({
    color: objective ? 0x3a4057 : 0x30364a,
    roughness: 0.88,
    metalness: 0.10,
    emissive: objective ? 0x0b2638 : 0x101426,
    emissiveIntensity: objective ? 0.56 : 0.24,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(createAsteroidGeometry(radius), material);
  group.add(mesh);

  const shardCount = objective ? 6 : 2 + Math.floor(random() * 3);
  for (let i = 0; i < shardCount; i += 1) {
    group.add(createTechShard(i % 2 ? COLOR.magenta : COLOR.cyan, radius));
  }

  if (objective) {
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTexture,
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    halo.scale.set(radius * 5.6, radius * 5.6, 1);
    halo.userData.isHalo = true;
    group.add(halo);
  }

  scene.add(group);
  return group;
}

const asteroids = [
  createAsteroid({ position: new THREE.Vector3(-3.6, 1.45, -4.4), radius: 0.20 }),
  createAsteroid({ position: new THREE.Vector3(4.25, 0.84, -5.0), radius: 0.17 }),
  createAsteroid({ position: new THREE.Vector3(-4.9, -1.66, -6.4), radius: 0.29 }),
  createAsteroid({ position: new THREE.Vector3(5.35, -2.12, -5.6), radius: 0.22 }),
  createAsteroid({ position: new THREE.Vector3(-1.15, -3.0, -3.6), radius: 0.15 }),
  createAsteroid({ position: new THREE.Vector3(1.95, 2.62, -7.2), radius: 0.14 }),
  createAsteroid({ position: new THREE.Vector3(0.98, -0.78, -1.05), radius: 0.30, objective: true }),
];

const streaks = new THREE.Group();
scene.add(streaks);
const streakMaterial = new THREE.LineBasicMaterial({
  color: 0x4bdcff,
  transparent: true,
  opacity: 0.10,
  blending: THREE.AdditiveBlending,
});
for (let i = 0; i < 34; i += 1) {
  const geometry = new THREE.BufferGeometry();
  const length = 0.50 + random() * 1.10;
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, -length, 0, 0, length, 0], 3)
  );
  const line = new THREE.Line(geometry, streakMaterial.clone());
  line.position.set((random() - 0.5) * 13, (random() - 0.5) * 9, -2 - random() * 12);
  line.rotation.z = (random() - 0.5) * 0.18;
  line.userData = {
    base: line.position.clone(),
    depth: random(),
    length,
    phase: random(),
  };
  streaks.add(line);
}

function keyAxis(negative, positive) {
  let value = 0;
  for (const key of negative) if (input.keys.has(key)) value -= 1;
  for (const key of positive) if (input.keys.has(key)) value += 1;
  return value;
}

function wrapVertical(object, margin = 5.2) {
  const yLimit = 5.2 + margin * object.userData.parallax;
  if (object.position.y < -yLimit) object.position.y += yLimit * 2.0;
  if (object.position.y > yLimit) object.position.y -= yLimit * 2.0;
}

function resize() {
  viewport.width = window.innerWidth;
  viewport.height = window.innerHeight;
  viewport.aspect = viewport.width / viewport.height;
  renderer.setSize(viewport.width, viewport.height, false);
  camera.aspect = viewport.aspect;
  camera.updateProjectionMatrix();
  nebulaMaterial.uniforms.uAspect.value = viewport.aspect;
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;
  const keyX = keyAxis(["ArrowLeft", "a", "A"], ["ArrowRight", "d", "D"]);
  const keyY = keyAxis(["ArrowDown", "s", "S"], ["ArrowUp", "w", "W"]);
  const targetVelocity = new THREE.Vector2(keyX * 0.55, 0.20 + Math.max(0, keyY) * 0.76 + Math.min(0, keyY) * 0.22);

  input.velocity.lerp(targetVelocity, 1 - Math.pow(0.012, delta));
  input.smoothPointer.lerp(input.pointer, 1 - Math.pow(0.001, delta));

  const speed = input.velocity.length();
  labState.thrust = THREE.MathUtils.lerp(labState.thrust, THREE.MathUtils.clamp(speed, 0.10, 1.15), 0.05);
  labState.travel += (0.38 + labState.thrust * 0.42) * delta;

  camera.position.x = input.smoothPointer.x * 0.34 + input.velocity.x * 0.12;
  camera.position.y = 0.15 + input.smoothPointer.y * 0.14;
  camera.lookAt(input.velocity.x * 0.12, input.velocity.y * 0.10, -5);

  nebulaMaterial.uniforms.uTime.value = elapsed;
  nebulaMaterial.uniforms.uPointer.value.copy(input.smoothPointer);
  nebulaMaterial.uniforms.uThrust.value = labState.thrust;

  for (const planet of planets) {
    const base = planet.userData.base;
    const parallax = planet.userData.parallax;
    planet.position.x = base.x + input.smoothPointer.x * parallax * 1.2 - input.velocity.x * parallax * 0.45;
    planet.position.y = base.y - labState.travel * parallax * 0.16 + input.smoothPointer.y * parallax * 0.42;
    planet.rotation.y += delta * planet.userData.spin;
    planet.rotation.z += delta * planet.userData.spin * 0.20;
  }

  for (const star of stars.children) {
    const depth = star.userData.depth;
    star.position.x = star.userData.base.x + input.smoothPointer.x * 0.12 * depth - input.velocity.x * 0.06 * depth;
    star.position.y = star.userData.base.y - (labState.travel * (0.26 + depth * 0.35)) % 18;
    if (star.position.y < -9) star.position.y += 18;
    star.material.opacity = 0.055 + depth * 0.13 + Math.sin(elapsed * 1.8 + star.userData.phase) * 0.025;
  }

  for (const asteroid of asteroids) {
    const base = asteroid.userData.base;
    const parallax = asteroid.userData.parallax;
    const orbital = Math.sin(elapsed * 0.42 + asteroid.userData.phase) * 0.10;
    asteroid.position.x = base.x - input.velocity.x * parallax * 0.55 + input.smoothPointer.x * parallax * 0.44 + orbital;
    asteroid.position.y += (-input.velocity.y * 0.54 + asteroid.userData.drift.y) * delta * parallax;
    asteroid.position.z = base.z + Math.sin(elapsed * 0.22 + asteroid.userData.phase) * 0.18;
    asteroid.rotation.x += asteroid.userData.spin.x * delta;
    asteroid.rotation.y += asteroid.userData.spin.y * delta;
    asteroid.rotation.z += asteroid.userData.spin.z * delta;
    if (asteroid.userData.objective) {
      const halo = asteroid.children.find((child) => child.userData.isHalo);
      if (halo) {
        halo.material.opacity = 0.34 + Math.sin(elapsed * 2.8) * 0.08;
        halo.scale.setScalar(1.18 + Math.sin(elapsed * 2.1) * 0.055);
      }
    }
    wrapVertical(asteroid);
  }

  for (const line of streaks.children) {
    const depth = line.userData.depth;
    line.position.x = line.userData.base.x - input.velocity.x * depth * 0.25 + input.smoothPointer.x * 0.10;
    line.position.y = line.userData.base.y - (labState.travel * (0.9 + depth * 1.2)) % 11.5;
    if (line.position.y < -5.75) line.position.y += 11.5;
    line.scale.y = 0.48 + labState.thrust * (0.7 + depth * 1.3);
    line.material.opacity = Math.max(0, (labState.thrust - 0.10) * (0.055 + depth * 0.10));
    line.material.color.lerpColors(COLOR.cyan, COLOR.magenta, 0.35 + Math.sin(elapsed + line.userData.phase * 6.28) * 0.18);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => input.keys.add(event.key));
window.addEventListener("keyup", (event) => input.keys.delete(event.key));
window.addEventListener("pointermove", (event) => {
  input.pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  input.pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
});
window.addEventListener("pointerleave", () => input.pointer.set(0, 0));

resize();
animate();
