import * as THREE from "../../vendor/three.module.js";
import { VISUAL_PACK_TUNING } from "../config/VisualPackTuning.ts";

const BIOME_PROFILES = {
  oceanic: { rim: 0x62e8ff, key: 0xb9f5ff, ambient: 0x789ad8, emissive: 0.42 },
  mechanical: { rim: 0xc77dff, key: 0xe2d1ff, ambient: 0x8b79ba, emissive: 0.50 },
  synthetic: { rim: 0xff65dc, key: 0xffd2f5, ambient: 0x9e6795, emissive: 0.56 },
  relic: { rim: 0xe9e3ff, key: 0xffffff, ambient: 0xa4a1cf, emissive: 0.62 },
};

function makePhysicalPlane(texture, renderOrder, emissiveIntensity) {
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.015,
    depthWrite: false,
    roughness: 0.58,
    metalness: 0.05,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.renderOrder = renderOrder;
  return mesh;
}

function makeOverlay(renderOrder, blending = THREE.AdditiveBlending) {
  const material = new THREE.SpriteMaterial({
    transparent: true,
    opacity: 0,
    blending,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = renderOrder;
  return sprite;
}

export class ShipVisualRig extends THREE.Group {
  constructor(texture) {
    super();
    this.surface = makePhysicalPlane(texture, 20, VISUAL_PACK_TUNING.ship.emissiveIntensity);
    this.surface.userData.aspect = 1;
    this.depthShell = makeOverlay(19, THREE.NormalBlending);
    this.depthShell.material.color.set(0x28324a);
    this.depthShell.material.opacity = 0.16;
    this.depthShell.position.set(0.006, -0.008, -0.012);
    this.cockpit = makeOverlay(21);
    this.cockpit.material.color.set(0xb9f7ff);
    this.cockpit.material.opacity = 0.10;
    this.add(this.depthShell, this.surface, this.cockpit);
  }

  setMaps({ albedo, normal, roughness, emissive, cockpit, depth, aspect }) {
    const material = this.surface.material;
    const materialChanged =
      material.map !== albedo ||
      material.normalMap !== normal ||
      material.roughnessMap !== roughness ||
      material.emissiveMap !== emissive;
    material.map = albedo;
    material.normalMap = normal;
    material.roughnessMap = roughness;
    material.emissiveMap = emissive;
    if (materialChanged) material.needsUpdate = true;
    this.surface.userData.aspect = aspect;
    const depthChanged = this.depthShell.material.map !== depth;
    this.depthShell.material.map = depth;
    this.depthShell.material.alphaMap = depth;
    if (depthChanged) this.depthShell.material.needsUpdate = true;
    const cockpitChanged = this.cockpit.material.map !== cockpit;
    this.cockpit.material.map = cockpit;
    if (cockpitChanged) this.cockpit.material.needsUpdate = true;
  }

  setSize(width, aspect) {
    const height = width / aspect;
    this.surface.scale.set(width, height, 1);
    this.depthShell.scale.set(width * 1.018, height * 1.026, 1);
    this.cockpit.scale.set(width, height, 1);
  }

  setOpacity(opacity) {
    this.surface.material.opacity = opacity;
    this.depthShell.material.opacity = opacity * 0.16;
    this.cockpit.material.opacity = opacity * 0.10;
  }

  applyBiome(biome) {
    const profile = BIOME_PROFILES[biome] || BIOME_PROFILES.oceanic;
    this.surface.material.emissiveIntensity = profile.emissive;
    this.cockpit.material.color.set(profile.rim);
  }
}

export class ShipMotionRig {
  constructor() {
    this.roll = 0;
    this.pitch = 0;
  }

  update(root, velocity, delta, recoil = 0, impact = 0) {
    const tuning = VISUAL_PACK_TUNING.ship;
    const targetRoll = THREE.MathUtils.clamp(-velocity.x * tuning.maxRoll, -tuning.maxRoll, tuning.maxRoll);
    const targetPitch = THREE.MathUtils.clamp(-velocity.y * tuning.maxPitch, -tuning.maxPitch, tuning.maxPitch);
    const blend = 1 - Math.exp(-tuning.spring * delta);
    this.roll = THREE.MathUtils.lerp(this.roll, targetRoll + impact * 0.035, blend);
    this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch + recoil * 0.022, blend);
    root.rotation.z = this.roll;
    root.rotation.x = this.pitch;
  }
}

export class ShieldFx extends THREE.Mesh {
  constructor(texture, color = 0x62edff) {
    super(
      new THREE.SphereGeometry(0.5, 24, 14),
      new THREE.MeshBasicMaterial({
        map: texture,
        alphaMap: texture,
        color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    );
    this.pulse = 0;
    this.baseScale = new THREE.Vector3(1, 1, 1);
    this.visible = false;
    this.renderOrder = 24;
  }

  trigger(strength = 1) {
    this.pulse = Math.max(this.pulse, strength);
    this.visible = true;
  }

  setBaseScale(x, y, z) {
    this.baseScale.set(x, y, z);
    this.scale.copy(this.baseScale);
  }

  update(delta) {
    this.pulse = Math.max(0, this.pulse - delta * 2.8);
    this.material.opacity = this.pulse * 0.24;
    this.scale.copy(this.baseScale).multiplyScalar(1 + (1 - this.pulse) * 0.12);
    if (this.pulse <= 0) this.visible = false;
  }
}

export class AstronautVisualRig extends THREE.Group {
  constructor(texture, shieldTexture, scannerTexture, reflectionTexture) {
    super();
    this.surface = makePhysicalPlane(texture, 22, VISUAL_PACK_TUNING.astronaut.emissiveIntensity);
    this.surface.userData.aspect = 1;
    this.depthShell = makeOverlay(21, THREE.NormalBlending);
    this.depthShell.material.color.set(0x313750);
    this.depthShell.material.opacity = 0.12;
    this.depthShell.position.set(0.003, -0.004, -0.008);
    this.visor = makeOverlay(23);
    this.visor.material.map = reflectionTexture;
    this.visor.material.color.set(0xc9a7ff);
    this.visor.material.opacity = 0.07;
    this.scanner = makeOverlay(20);
    this.scanner.material.map = scannerTexture;
    this.scanner.material.color.set(0x76eaff);
    this.scanner.visible = false;
    this.scannerBaseScale = 1;
    this.shield = new ShieldFx(shieldTexture);
    this.add(this.depthShell, this.surface, this.visor, this.scanner, this.shield);
  }

  setMaps({ albedo, normal, roughness, emissive, cockpit, depth, aspect }) {
    const material = this.surface.material;
    const materialChanged =
      material.map !== albedo ||
      material.normalMap !== normal ||
      material.roughnessMap !== roughness ||
      material.emissiveMap !== emissive;
    material.map = albedo;
    material.normalMap = normal;
    material.roughnessMap = roughness;
    material.emissiveMap = emissive;
    if (materialChanged) material.needsUpdate = true;
    this.surface.userData.aspect = aspect;
    const depthChanged = this.depthShell.material.map !== depth;
    this.depthShell.material.map = depth;
    this.depthShell.material.alphaMap = depth;
    if (depthChanged) this.depthShell.material.needsUpdate = true;
    const visorChanged = this.visor.material.alphaMap !== cockpit;
    this.visor.material.alphaMap = cockpit;
    if (visorChanged) this.visor.material.needsUpdate = true;
  }

  setSize(width, aspect) {
    const height = width / aspect;
    this.surface.scale.set(width, height, 1);
    this.depthShell.scale.set(width * 1.02, height * 1.03, 1);
    this.visor.scale.set(width, height, 1);
    this.scannerBaseScale = width * 2.05;
    this.scanner.scale.setScalar(this.scannerBaseScale);
    this.shield.setBaseScale(width * 1.18, height * 1.16, Math.min(width, height));
  }

  setScan(active, progress = 0) {
    this.scanner.visible = active;
    this.scanner.material.opacity = active ? 0.08 + progress * 0.18 : 0;
  }

  setOpacity(opacity) {
    this.surface.material.opacity = opacity;
    this.depthShell.material.opacity = opacity * 0.12;
    this.visor.material.opacity = opacity * 0.07;
  }

  update(delta, elapsed) {
    this.shield.update(delta);
    if (this.scanner.visible) {
      this.scanner.material.rotation = elapsed * 0.45;
      this.scanner.scale.setScalar(this.scannerBaseScale * (1 + Math.sin(elapsed * 2.4) * 0.04));
    }
  }

  applyBiome(biome) {
    const profile = BIOME_PROFILES[biome] || BIOME_PROFILES.oceanic;
    this.surface.material.emissiveIntensity = profile.emissive * 0.65;
    this.visor.material.color.set(profile.rim);
  }
}

function cleanPlumeMaterial(color, profile = "plume") {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0 },
      uProfile: { value: profile === "core" ? 1 : 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uProfile;
      varying vec2 vUv;
      void main() {
        float nozzle = smoothstep(0.0, 0.12, vUv.x);
        float tailFade = smoothstep(0.0, 0.36, vUv.x);
        float halfWidth = mix(0.46, mix(0.13, 0.22, uProfile), vUv.x);
        float edge = 1.0 - smoothstep(halfWidth * 0.52, halfWidth, abs(vUv.y - 0.5));
        float lengthFade = mix(tailFade, pow(tailFade, 0.55), uProfile);
        float hot = mix(0.72, 1.0, smoothstep(0.55, 1.0, vUv.x));
        float alpha = uOpacity * nozzle * edge * lengthFade;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(uColor * hot, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });
}

export class DirectionalThrusterSystem extends THREE.Group {
  constructor(options = {}) {
    super();
    this.sizeMultiplier = options.sizeMultiplier || 1;
    this.plume = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cleanPlumeMaterial(options.plumeColor || 0x7c83ff));
    this.core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cleanPlumeMaterial(options.coreColor || 0x98f5ff, "core"));
    this.plume.renderOrder = 17;
    this.core.renderOrder = 18;
    this.add(this.plume, this.core);
    this.visible = false;
  }

  setState(direction, level, width, height, tier = 0) {
    if (direction === "idle" || level === "idle") {
      this.visible = false;
      return;
    }
    const angleByDirection = {
      right: 0,
      up_right: Math.PI * 0.25,
      up: Math.PI * 0.5,
      up_left: Math.PI * 0.75,
      left: Math.PI,
      down_left: -Math.PI * 0.75,
      down: -Math.PI * 0.5,
      down_right: -Math.PI * 0.25,
    };
    const angle = angleByDirection[direction] ?? Math.PI * 0.5;
    const intensity = VISUAL_PACK_TUNING.thruster[level];
    const socketDistance = Math.max(width, height) * (0.34 + tier * 0.015);
    const shipSize = Math.max(width, height);
    const boost = level === "turbo" ? 1 : level === "warp" ? 1.28 : 0.54;
    const plumeLength = shipSize * (0.44 + tier * 0.018) * boost * this.sizeMultiplier;
    const coreLength = plumeLength * 0.58;
    this.position.set(0, 0, 0.018);
    this.rotation.z = angle;
    this.visible = true;
    this.plume.material.uniforms.uOpacity.value = intensity.cone * (level === "normal" ? 0.68 : 0.86);
    this.core.material.uniforms.uOpacity.value = intensity.core * 0.92;
    this.plume.position.set(-socketDistance - plumeLength * 0.5, 0, 0);
    this.core.position.set(-socketDistance - coreLength * 0.5, 0, 0.002);
    this.plume.scale.set(plumeLength, Math.max(height * 0.16, shipSize * 0.055) * Math.sqrt(this.sizeMultiplier), 1);
    this.core.scale.set(coreLength, Math.max(height * 0.065, shipSize * 0.022) * Math.sqrt(this.sizeMultiplier), 1);
  }
}

export class StabilizerFieldFx extends THREE.Group {
  constructor() {
    super();
    const ringMaterial = (color, opacity) => new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    this.outer = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.006, 8, 64), ringMaterial(0x7cecff, 0));
    this.inner = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.004, 8, 56), ringMaterial(0xb678ff, 0));
    this.field = new THREE.Mesh(new THREE.CircleGeometry(0.205, 64), ringMaterial(0x70dfff, 0));
    this.vector = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.006), ringMaterial(0xe5fbff, 0));
    this.vector.geometry.translate(0.09, 0, 0);
    this.field.position.z = -0.004;
    this.vector.position.z = 0.006;
    this.add(this.field, this.outer, this.inner, this.vector);
    this.visibility = 0;
    this.visible = false;
    this.renderOrder = 31;
  }

  update(delta, elapsed, status, gravitySample, actorPosition) {
    const target = status?.active ? 1 : 0;
    this.visibility = THREE.MathUtils.lerp(this.visibility, target, 1 - Math.pow(0.0008, delta));
    this.visible = this.visibility > 0.01;
    if (!this.visible) return;
    this.position.set(actorPosition.x, actorPosition.y, 0.085);
    const pulse = 1 + Math.sin(elapsed * 5.2) * 0.035;
    this.scale.setScalar(pulse);
    this.outer.rotation.z += delta * 0.72;
    this.inner.rotation.z -= delta * 0.94;
    this.outer.material.opacity = this.visibility * 0.44;
    this.inner.material.opacity = this.visibility * 0.34;
    this.field.material.opacity = this.visibility * 0.055;
    const magnitude = THREE.MathUtils.clamp((gravitySample?.magnitude || 0) / 0.42, 0, 1);
    this.vector.visible = magnitude > 0.04;
    this.vector.material.opacity = this.visibility * (0.18 + magnitude * 0.34);
    this.vector.rotation.z = Math.atan2(-(gravitySample?.y || 0), -(gravitySample?.x || 0));
    this.vector.scale.x = 0.55 + magnitude * 0.85;
  }
}

export class RelicGem extends THREE.Group {
  constructor({ coreTexture, noiseTexture, fresnelTexture }, color = 0xb23cff) {
    super();
    const outerGeometry = new THREE.IcosahedronGeometry(0.18, 1);
    this.outer = new THREE.Mesh(
      outerGeometry,
      new THREE.MeshPhysicalMaterial({
        color: 0xdcecff,
        roughnessMap: noiseTexture,
        roughness: 0.16,
        metalness: 0.04,
        transmission: 0.28,
        thickness: 0.12,
        transparent: true,
        opacity: 0,
        emissive: color,
        emissiveMap: fresnelTexture,
        emissiveIntensity: 0.24,
      }),
    );
    this.inner = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.085, 1),
      new THREE.MeshBasicMaterial({
        map: coreTexture,
        color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.ringA = new THREE.Mesh(
      new THREE.TorusGeometry(0.23, 0.006, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x74eaff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }),
    );
    this.ringB = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.004, 8, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }),
    );
    this.ringA.rotation.x = 0.82;
    this.ringB.rotation.x = 1.08;
    this.ringB.rotation.y = 0.48;
    this.glow = makeOverlay(32);
    this.glow.material.map = coreTexture;
    this.glow.material.color.set(color);
    this.glow.scale.setScalar(0.46);

    const count = VISUAL_PACK_TUNING.gem.maxParticles;
    const positions = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.25 + (i % 4) * 0.009;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.64, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    this.particles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color,
        size: 0.012,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.add(this.glow, this.ringA, this.ringB, this.outer, this.inner, this.particles);
  }

  setReveal(reveal, destroyFade, elapsed) {
    const pulse = 0.5 + Math.sin(elapsed * VISUAL_PACK_TUNING.gem.pulseSpeed) * 0.5;
    const opacity = reveal * destroyFade;
    this.outer.material.opacity = 0.88 * opacity;
    this.inner.material.opacity = 0.86 * opacity;
    this.ringA.material.opacity = 0.30 * opacity;
    this.ringB.material.opacity = 0.20 * opacity;
    this.glow.material.opacity = (0.12 + pulse * 0.08) * opacity;
    this.particles.material.opacity = 0.42 * opacity;
    const expand = 1 + (1 - destroyFade) * 0.34;
    this.scale.setScalar(expand);
  }

  update(delta, elapsed) {
    const tuning = VISUAL_PACK_TUNING.gem;
    this.outer.rotation.y += delta * tuning.rotationSpeed;
    this.outer.rotation.x += delta * tuning.rotationSpeed * 0.55;
    this.inner.rotation.y += delta * tuning.shellCounterRotation;
    this.ringA.rotation.z += delta * 0.44;
    this.ringB.rotation.z -= delta * 0.32;
    this.particles.rotation.z -= delta * 0.26;
    const pulse = 1 + Math.sin(elapsed * tuning.pulseSpeed) * 0.04;
    this.inner.scale.setScalar(pulse);
  }
}

export class BiomeVisualLighting {
  constructor(ambient, key, rim) {
    this.ambient = ambient;
    this.key = key;
    this.rim = rim;
  }

  apply(biome, shipRig, astronautRig) {
    const profile = BIOME_PROFILES[biome] || BIOME_PROFILES.oceanic;
    this.ambient.color.set(profile.ambient);
    this.key.color.set(profile.key);
    this.rim.color.set(profile.rim);
    shipRig.applyBiome(biome);
    astronautRig.applyBiome(biome);
  }
}
