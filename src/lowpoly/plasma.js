import * as THREE from '../../vendor/three.module.js';

// Local, analytic plasma. One tube geometry is shared by both engines and all
// three layers; no texture downloads, history buffers or frame allocations.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const vertexShader = /* glsl */`
uniform float time; uniform float power; uniform float length;
uniform float radius; uniform float motion; uniform float seed;
varying vec2 plasmaUv; varying vec3 plasmaNormal; varying vec3 plasmaWorld;
void main() {
  plasmaUv = uv;
  float t = uv.y;
  float wave = sin(t * 32.0 - time * 15.0 + seed + uv.x * 12.56637);
  float tail = pow(max(.001, 1.0 - t), .74);
  float taper = (.84 + .16 * exp(-t * 12.0)) * tail;
  vec3 p = position;
  p.xy *= radius * taper * (1.0 + wave * .035 * motion);
  p.xy += vec2(sin(t * 21.0 - time * 8.0 + seed), cos(t * 17.0 - time * 7.0 + seed))
    * t * t * .024 * motion * power;
  p.z *= length;
  vec4 world = modelMatrix * vec4(p, 1.0);
  plasmaWorld = world.xyz;
  plasmaNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
const fragmentShader = /* glsl */`
uniform float time; uniform float power; uniform float motion;
uniform float layer; uniform float seed; uniform float gain;
varying vec2 plasmaUv; varying vec3 plasmaNormal; varying vec3 plasmaWorld;
void main() {
  float t = plasmaUv.y, a = plasmaUv.x * 6.2831853;
  float clock = time * motion;
  float longitudinal = 1.0 - smoothstep(.40, 1.0, t);
  float base = smoothstep(0.0, .035, t);
  float facing = abs(dot(normalize(plasmaNormal), normalize(cameraPosition - plasmaWorld)));
  float strand = pow(.5 + .5 * sin(a * 7.0 + t * 23.0 - clock * 14.0 + seed), 7.0);
  float fine = .5 + .5 * sin(a * 19.0 - t * 71.0 + clock * 23.0 + seed * 3.0);
  float diamonds = pow(.5 + .5 * sin(t * 38.0 - clock * 4.0 + seed), 10.0);
  vec3 color; float opacity;
  if (layer < .5) {
    color = mix(vec3(.15, 1.4, 3.8), vec3(1.9, 3.1, 3.5), exp(-t * 4.5));
    color += vec3(.35, .65, .75) * diamonds * .55;
    opacity = (.36 + .24 * facing) * (.86 + .14 * fine);
  } else if (layer < 1.5) {
    color = mix(vec3(.035, .24, 1.6), vec3(.10, 1.8, 3.0), strand);
    opacity = (.07 + .30 * strand + .075 * diamonds) * (.45 + .55 * facing);
  } else {
    color = vec3(.02, .42, 1.8);
    opacity = .075 * pow(facing, .65);
  }
  opacity *= longitudinal * base * smoothstep(0.0, .12, power) * gain;
  if (opacity < .001) discard;
  gl_FragColor = vec4(color * (.62 + power * .38), opacity);
}`;

/** Call after ship.update(), which still drives the approved legacy exhausts. */
export function createPropulsion(shipGroup, { gain = 1 } = {}) {
  const sources = [];
  shipGroup?.traverse(object => { if (object.isMesh && /-exhaust$/.test(object.name)) sources.push(object); });
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 24, 32, true);
  geometry.rotateX(Math.PI / 2); geometry.translate(0, 0, .5);
  const level = Number.isFinite(gain) ? clamp(gain, 0, 2) : 1;
  const engines = [], materials = [], forward = new THREE.Vector3(0, 0, 1);
  const stats = { engines: sources.length, layers: sources.length * 3, lights: Math.min(2, sources.length), triangles: sources.length * 3 * 24 * 32 * 2 };
  for (let i = 0; i < sources.length; i++) {
    const original = sources[i], parent = original.parent;
    original.updateMatrix();
    // A ConeGeometry has its base at -height/2 along local Y. Its factory moves
    // and scales it about a fixed exit plane; recover that plane from the mesh.
    const height = original.geometry.parameters?.height || 2.3;
    const base = new THREE.Vector3(0, -height / 2, 0).applyMatrix4(original.matrix);
    const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(original.quaternion).normalize();
    const root = new THREE.Group(); root.name = `plasma-engine-${i}`;
    root.position.copy(base); root.quaternion.setFromUnitVectors(forward, direction); parent.add(root);
    const layers = [];
    for (let layer = 0; layer < 3; layer++) {
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, power: { value: 0 }, length: { value: 1 }, radius: { value: .3 }, motion: { value: 1 }, seed: { value: i * 1.71 }, layer: { value: layer }, gain: { value: level } },
        vertexShader, fragmentShader, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.FrontSide, toneMapped: false,
      });
      const mesh = new THREE.Mesh(geometry, material); mesh.name = `plasma-${['core', 'filaments', 'halo'][layer]}-${i}`;
      mesh.frustumCulled = false; mesh.renderOrder = 3 + layer; root.add(mesh);
      layers.push(material.uniforms); materials.push(material);
    }
    let light;
    if (i < 2) { light = new THREE.PointLight(0x40bcff, 0, 5.5, 2); light.position.z = .18; root.add(light); }
    engines.push({ original, priorVisible: original.visible, root, layers, light });
    original.visible = false; root.visible = false;
  }
  let disposed = false;
  function update(time = 0, { thrust = 0, reducedMotion = false } = {}) {
    if (disposed) return;
    const t = Number.isFinite(time) ? time : 0, power = clamp(Number(thrust) || 0);
    for (let i = 0; i < engines.length; i++) {
      const engine = engines[i]; engine.original.visible = false;
      const power = clamp(engine.original.userData.power ?? thrust);
      engine.root.visible = power > .015 && level > 0;
      const breathe = reducedMotion ? 1 : 1 + Math.sin(t * 17 + i * 1.7) * .018;
      for (let j = 0; j < engine.layers.length; j++) {
        const u = engine.layers[j];
        u.time.value = t; u.power.value = power; u.motion.value = reducedMotion ? 0 : 1;
        u.length.value = (.34 + power * 4.2) * (j === 0 ? .82 : j === 1 ? 1 : 1.06) * breathe;
        u.radius.value = (.19 + power * .19) * (j === 0 ? .61 : j === 1 ? 1 : 1.32);
      }
      if (engine.light) engine.light.intensity = power * level * (reducedMotion ? 1.15 : 2.1);
    }
  }
  function dispose() {
    if (disposed) return; disposed = true;
    for (const engine of engines) { engine.root.removeFromParent(); engine.original.visible = engine.priorVisible; }
    for (const material of materials) material.dispose(); geometry.dispose();
  }
  return { update, dispose, stats };
}
