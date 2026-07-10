import { REGIONS, V4_TUNING } from "./config.js";
import { clamp, distance } from "./utils.js";

export class HybridWorldDirector {
  constructor({ THREE, scene, backgroundScene, state }) {
    this.THREE = THREE;
    this.scene = scene;
    this.backgroundScene = backgroundScene;
    this.state = state;
    this.group = new THREE.Group();
    this.group.name = "v4:hybrid-world";
    this.group.renderOrder = -30;
    scene.add(this.group);
    this.loader = new THREE.TextureLoader();
    this.planets = REGIONS.map((region) => this.createPlanet(region));
    this.landmarks = REGIONS.map((region) => this.createLandmark(region));
    this.lastCleanup = -Infinity;
  }

  createPlanet(region) {
    const texture = this.loader.load(region.hero.texture);
    texture.colorSpace = this.THREE.SRGBColorSpace;
    const sprite = new this.THREE.Sprite(new this.THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      depthTest: true,
    }));
    sprite.name = `v4:planet:${region.id}`;
    sprite.position.z = -3.8;
    sprite.renderOrder = -25;
    sprite.userData.v4World = { x: region.hero.x, y: region.hero.y };
    sprite.userData.v4BaseScale = region.hero.scale;
    this.group.add(sprite);
    return { region, object: sprite };
  }

  material(color, opacity = 0.9) {
    return new this.THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: this.THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  createLandmark(region) {
    const THREE = this.THREE;
    const root = new THREE.Group();
    root.name = `v4:landmark:${region.landmark.id}`;
    root.position.z = -2.7;
    const cyan = this.material(0x67e9ff, 0.78);
    const magenta = this.material(0xec58ff, 0.62);
    const white = this.material(0xf2f5ff, 0.72);
    if (region.landmark.kind === "beacon") {
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), magenta);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.012, 8, 48), cyan);
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.02), white);
      root.add(ring, core, stem);
    } else if (region.landmark.kind === "ring") {
      const arcA = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.026, 10, 64, Math.PI * 1.20), white);
      const arcB = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.014, 8, 64, Math.PI * 0.50), magenta);
      arcA.rotation.z = 0.3; arcB.rotation.z = 3.65;
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), cyan);
      root.add(arcA, arcB, core);
    } else if (region.landmark.kind === "rift") {
      for (let i = 0; i < 3; i += 1) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18 + i * 0.065, 0.009, 8, 56), i % 2 ? cyan : magenta);
        ring.rotation.x = i * 0.35;
        root.add(ring);
      }
      root.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 1), magenta));
    } else {
      for (let i = 0; i < 3; i += 1) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19 + i * 0.08, 0.012, 8, 64), i === 1 ? magenta : white);
        ring.rotation.z = i * 0.65;
        ring.rotation.x = 0.3 + i * 0.2;
        root.add(ring);
      }
      root.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 1), cyan));
    }
    root.userData.v4World = { x: region.landmark.x, y: region.landmark.y };
    root.userData.v4Region = region.id;
    this.group.add(root);
    return { region, object: root };
  }

  suppressLegacyWorld(elapsed) {
    if (elapsed - this.lastCleanup < 0.35) return;
    this.lastCleanup = elapsed;
    const suppress = (object) => {
      if (object === this.group || object.parent === this.group) return;
      const data = object.userData || {};
      const isMission = data.missionRole || data.interactive || data.objective;
      const isLegacyBody =
        (data.materialLocked && data.identityKind) ||
        data.worldDepthRole === "hero" ||
        data.worldDepthSlot ||
        data.compositionRole === "hero";
      if (isLegacyBody && !isMission) object.visible = false;
    };
    this.backgroundScene?.traverse?.(suppress);
  }

  update({ floatingOrigin, elapsed }) {
    this.suppressLegacyWorld(elapsed);
    const player = this.state.worldOffset;
    const ranked = this.planets
      .map((entry) => ({ ...entry, distance: distance(player, entry.object.userData.v4World) }))
      .filter((entry) => entry.distance < V4_TUNING.planetVisibilityRadius)
      .sort((a, b) => a.distance - b.distance);
    const visiblePlanets = new Set(ranked.slice(0, V4_TUNING.maxHeroPlanets).map((entry) => entry.object));

    this.planets.forEach(({ object }) => {
      const world = object.userData.v4World;
      const d = distance(player, world);
      object.visible = visiblePlanets.has(object);
      if (!object.visible) return;
      const p = floatingOrigin.toRender(world);
      object.position.x = p.x;
      object.position.y = p.y;
      const base = object.userData.v4BaseScale;
      const depthScale = clamp(1.05 - d / 300, 0.62, 1.02);
      object.scale.set(base * depthScale, base * depthScale, 1);
      object.material.opacity = clamp(1.02 - d / 230, 0.54, 0.96);
      object.material.rotation = elapsed * 0.004;
    });

    this.landmarks.forEach(({ object, region }, index) => {
      const world = object.userData.v4World;
      const d = distance(player, world);
      object.visible = d < V4_TUNING.landmarkVisibilityRadius;
      if (!object.visible) return;
      const p = floatingOrigin.toRender(world);
      object.position.x = p.x;
      object.position.y = p.y;
      const scale = clamp(0.72 - d / 260, 0.32, 0.68);
      object.scale.setScalar(scale);
      object.rotation.z += 0.002 + index * 0.00025;
      object.children.forEach((child, childIndex) => {
        child.rotation.z += (childIndex % 2 ? -1 : 1) * 0.0015;
      });
    });
  }
}
