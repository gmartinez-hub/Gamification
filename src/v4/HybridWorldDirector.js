import { REGIONS, ROUTES } from "./config.js";
import { COMPOSITION_RECOVERY, compositionProfile } from "./compositionProfiles.js";
import { LegacyWorldGate, markV4Owned } from "./LegacyWorldGate.js";
import { clamp, distance } from "./utils.js";

function adjacentRoute(a, b) {
  return ROUTES.find((route) =>
    (route.from === a && route.to === b) || (route.from === b && route.to === a)
  ) || null;
}

export class HybridWorldDirector {
  constructor({ THREE, scene, backgroundScene, state }) {
    this.THREE = THREE;
    this.scene = scene;
    this.backgroundScene = backgroundScene;
    this.state = state;
    this.loader = new THREE.TextureLoader();
    this.group = markV4Owned(new THREE.Group());
    this.group.name = "v4:composition-authority";
    this.group.renderOrder = -100;
    scene.add(this.group);
    this.legacyGate = new LegacyWorldGate({ scene, backgroundScene });
    this.regions = REGIONS.map((region, index) => this.createRegion(region, index));
  }

  basic(color, opacity = 1, additive = false) {
    return new this.THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      blending: additive ? this.THREE.AdditiveBlending : this.THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,
      side: this.THREE.DoubleSide,
      toneMapped: false,
    });
  }

  spriteMaterial(path, opacity = 1) {
    const texture = this.loader.load(path);
    texture.colorSpace = this.THREE.SRGBColorSpace;
    const material = new this.THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    return material;
  }

  createPlanet(region, index) {
    const THREE = this.THREE;
    const profile = compositionProfile(index);
    const root = markV4Owned(new THREE.Group());
    root.name = `v4:hero-planet:${region.id}`;
    root.renderOrder = -92;

    const atmosphere = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.53, 96),
      this.basic(profile.atmosphere, profile.atmosphereOpacity, true),
    );
    atmosphere.position.z = -5.62;
    atmosphere.renderOrder = -94;

    const sprite = new THREE.Sprite(this.spriteMaterial(region.hero.texture, profile.heroOpacity));
    sprite.position.z = -5.55;
    sprite.renderOrder = -93;
    sprite.scale.set(1, 1, 1);

    root.add(atmosphere, sprite);
    root.position.z = -5.5;
    root.userData.v4World = { x: region.hero.x, y: region.hero.y };
    root.userData.profile = profile;
    root.userData.sprite = sprite;
    root.userData.atmosphere = atmosphere;
    this.group.add(root);
    return root;
  }

  createMoon(region, index) {
    const profile = compositionProfile(index);
    const root = markV4Owned(new this.THREE.Group());
    root.name = `v4:secondary-body:${region.id}`;
    root.renderOrder = -90;
    const sprite = new this.THREE.Sprite(this.spriteMaterial(region.hero.texture, 0.62));
    sprite.material.color.set(index === 0 ? 0x94b7c9 : index === 1 ? 0xb7a8dc : index === 2 ? 0x8c72ad : 0xb9bbd3);
    sprite.position.z = -5.34;
    sprite.renderOrder = -90;
    root.add(sprite);
    root.position.z = -5.3;
    root.userData.v4World = {
      x: region.center.x + profile.moonOffset.x,
      y: region.center.y + profile.moonOffset.y,
    };
    root.userData.profile = profile;
    root.userData.sprite = sprite;
    this.group.add(root);
    return root;
  }

  panelMaterial(color, opacity = 1) {
    return this.basic(color, opacity, false);
  }

  emissiveMaterial(color, opacity = 1) {
    return this.basic(color, opacity, true);
  }

  addPanel(root, x, y, width, height, rotation = 0, color = 0xd9e5ec) {
    const panel = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(width, height, 0.035),
      this.panelMaterial(color, 0.92),
    );
    panel.position.set(x, y, 0.02);
    panel.rotation.z = rotation;
    root.add(panel);
    return panel;
  }

  addArc(root, radius, tube, start, length, color, opacity = 0.8, z = 0.05) {
    const arc = new this.THREE.Mesh(
      new this.THREE.TorusGeometry(radius, tube, 10, 72, length),
      this.emissiveMaterial(color, opacity),
    );
    arc.rotation.z = start;
    arc.position.z = z;
    root.add(arc);
    return arc;
  }

  createBeacon(root) {
    const THREE = this.THREE;
    const dark = this.panelMaterial(0x263247, 0.95);
    const coreShell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), dark);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 1), this.emissiveMaterial(0xf250ff, 0.96));
    root.add(coreShell, core);
    this.addArc(root, 0.25, 0.018, 0.28, Math.PI * 1.22, 0x66eaff, 0.86);
    this.addArc(root, 0.34, 0.026, 2.80, Math.PI * 0.78, 0xe8f1f6, 0.90, 0.01);
    this.addArc(root, 0.43, 0.019, 5.08, Math.PI * 0.62, 0xb9c7d5, 0.76, -0.01);
    this.addPanel(root, -0.38, 0.18, 0.18, 0.10, 0.50);
    this.addPanel(root, 0.35, 0.22, 0.22, 0.11, -0.38, 0xc6d5df);
    this.addPanel(root, -0.32, -0.27, 0.17, 0.09, -0.62, 0x9eafbd);
    this.addPanel(root, 0.28, -0.34, 0.20, 0.08, 0.72, 0xe7edf0);
    for (let i = 0; i < 7; i += 1) {
      const fragment = new THREE.Mesh(
        new THREE.BoxGeometry(0.045 + (i % 3) * 0.012, 0.018, 0.012),
        this.panelMaterial(i % 2 ? 0xbfd0da : 0x4f5d72, 0.78),
      );
      const angle = i * 0.91 + 0.24;
      fragment.position.set(Math.cos(angle) * (0.48 + (i % 2) * 0.08), Math.sin(angle) * (0.42 + (i % 3) * 0.035), 0.03);
      fragment.rotation.z = angle + 0.35;
      fragment.userData.fragment = true;
      root.add(fragment);
    }
  }

  createBrokenRing(root) {
    this.createBeacon(root);
    this.addArc(root, 0.54, 0.036, 0.12, Math.PI * 1.05, 0xdfe8ef, 0.82, -0.03);
    this.addArc(root, 0.54, 0.022, 3.55, Math.PI * 0.48, 0xa164ff, 0.74, 0.02);
    this.addPanel(root, -0.54, 0.05, 0.24, 0.13, 1.12, 0x8c9caa);
    this.addPanel(root, 0.52, -0.13, 0.26, 0.12, -1.0, 0xe2e9ed);
  }

  createRift(root) {
    const THREE = this.THREE;
    for (let i = 0; i < 4; i += 1) {
      this.addArc(root, 0.20 + i * 0.085, 0.012 + i * 0.002, i * 1.35, Math.PI * (0.68 + i * 0.08), i % 2 ? 0x66eaff : 0xff58dc, 0.78 - i * 0.08, i * -0.01);
    }
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.115, 1), this.emissiveMaterial(0xf05bff, 0.92));
    root.add(core);
    for (let i = 0; i < 6; i += 1) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.035 + i * 0.003), this.panelMaterial(i % 2 ? 0x9cb0bd : 0xdce6eb, 0.82));
      const angle = i * Math.PI / 3 + 0.4;
      shard.position.set(Math.cos(angle) * 0.48, Math.sin(angle) * 0.36, 0.02);
      shard.rotation.z = angle;
      root.add(shard);
    }
  }

  createPortal(root) {
    const THREE = this.THREE;
    for (let i = 0; i < 4; i += 1) {
      const ring = this.addArc(root, 0.22 + i * 0.09, 0.014, i * 0.75, Math.PI * (1.18 - i * 0.08), i === 1 ? 0xff5be6 : 0xe8efff, 0.82 - i * 0.08, -i * 0.008);
      ring.rotation.x = 0.08 + i * 0.07;
    }
    root.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.135, 1), this.emissiveMaterial(0x70ecff, 0.94)));
    [-1, 0, 1].forEach((slot) => {
      const node = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 1), this.emissiveMaterial(slot === 0 ? 0x66eaff : slot === 1 ? 0xffffff : 0xff58dc, 0.88));
      node.position.set(slot * 0.22, -0.37, 0.03);
      root.add(node);
    });
  }

  createLandmark(region, index) {
    const THREE = this.THREE;
    const profile = compositionProfile(index);
    const root = markV4Owned(new THREE.Group());
    root.name = `v4:landmark:${region.landmark.id}`;
    root.position.z = -2.8;
    root.renderOrder = -30;
    root.userData.v4World = { x: region.landmark.x, y: region.landmark.y };
    root.userData.profile = profile;
    root.userData.baseScale = profile.landmarkScale;
    root.userData.phase = index * 1.7;

    if (region.landmark.kind === "beacon") this.createBeacon(root);
    else if (region.landmark.kind === "ring") this.createBrokenRing(root);
    else if (region.landmark.kind === "rift") this.createRift(root);
    else this.createPortal(root);

    const pulse = new THREE.Mesh(
      new THREE.RingGeometry(0.56, 0.57, 96),
      this.emissiveMaterial(index === 2 ? 0xff59dc : 0x67eaff, 0.18),
    );
    pulse.position.z = -0.04;
    pulse.userData.signalPulse = true;
    root.add(pulse);
    this.group.add(root);
    return root;
  }

  createRegion(region, index) {
    return {
      region,
      index,
      profile: compositionProfile(index),
      planet: this.createPlanet(region, index),
      moon: this.createMoon(region, index),
      landmark: this.createLandmark(region, index),
    };
  }

  transitionState(player, currentIndex, gems) {
    const candidates = REGIONS
      .map((region, index) => ({ index, distance: distance(player, region.center) }))
      .filter((entry) => entry.index !== currentIndex)
      .sort((a, b) => a.distance - b.distance);
    const next = candidates[0];
    if (!next) return { index: -1, alpha: 0 };
    const route = adjacentRoute(currentIndex, next.index);
    if (!route || gems < route.unlockGem) return { index: -1, alpha: 0 };
    const currentDistance = distance(player, REGIONS[currentIndex].center);
    const difference = Math.abs(currentDistance - next.distance);
    if (next.distance > COMPOSITION_RECOVERY.transitionRevealRadius || difference > COMPOSITION_RECOVERY.transitionDifferenceWindow) {
      return { index: -1, alpha: 0 };
    }
    const alpha = clamp(1 - difference / COMPOSITION_RECOVERY.transitionDifferenceWindow, 0, 1);
    return { index: next.index, alpha };
  }

  positionObject(object, floatingOrigin) {
    const point = floatingOrigin.toRender(object.userData.v4World);
    object.position.x = point.x;
    object.position.y = point.y;
  }

  updatePlanet(entry, floatingOrigin, elapsed, mode, transitionAlpha = 0) {
    const { planet, profile } = entry;
    const visible = mode !== "hidden";
    planet.visible = visible;
    if (!visible) return;
    this.positionObject(planet, floatingOrigin);
    const alpha = mode === "current" ? 1 : transitionAlpha;
    const scale = profile.heroScale * (mode === "current" ? 1 : 0.78 + alpha * 0.14);
    planet.scale.setScalar(scale);
    planet.userData.sprite.material.opacity = profile.heroOpacity * (mode === "current" ? 1 : 0.16 + alpha * 0.46);
    planet.userData.atmosphere.material.opacity = profile.atmosphereOpacity * (mode === "current" ? 1 : 0.24 + alpha * 0.54);
    planet.userData.sprite.material.rotation = elapsed * profile.heroRotationSpeed;
    planet.userData.atmosphere.rotation.z = -elapsed * profile.heroRotationSpeed * 1.8;
  }

  updateMoon(entry, floatingOrigin, current, player, elapsed) {
    const { moon, profile } = entry;
    const d = distance(player, moon.userData.v4World);
    moon.visible = current && d < COMPOSITION_RECOVERY.moonVisibleRadius;
    if (!moon.visible) return;
    this.positionObject(moon, floatingOrigin);
    const scale = profile.moonScale * clamp(1.06 - d / 190, 0.72, 1);
    moon.scale.setScalar(scale);
    moon.userData.sprite.material.opacity = clamp(0.72 - d / 240, 0.42, 0.65);
    moon.userData.sprite.material.rotation = elapsed * profile.heroRotationSpeed * -0.65;
  }

  updateLandmark(entry, floatingOrigin, current, player, elapsed) {
    const { landmark, profile, index } = entry;
    const d = distance(player, landmark.userData.v4World);
    landmark.visible = current && d < COMPOSITION_RECOVERY.landmarkVisibleRadius;
    if (!landmark.visible) return;
    this.positionObject(landmark, floatingOrigin);
    landmark.position.y += Math.sin(elapsed * 0.72 + landmark.userData.phase) * profile.landmarkFloat;
    const scale = landmark.userData.baseScale * clamp(1.10 - d / 150, 0.72, 1.02);
    landmark.scale.setScalar(scale);
    landmark.rotation.z += (index % 2 ? -1 : 1) * 0.0018;
    landmark.children.forEach((child, childIndex) => {
      if (child.userData?.signalPulse) {
        const pulse = 0.5 + Math.sin(elapsed * 1.9 + index) * 0.5;
        child.scale.setScalar(0.92 + pulse * 0.18);
        child.material.opacity = 0.08 + pulse * 0.14;
      } else if (child.userData?.fragment) {
        child.rotation.z += (childIndex % 2 ? -1 : 1) * 0.0025;
      }
    });
  }

  update({ floatingOrigin, elapsed, currentRegionIndex, gems = 0 }) {
    this.legacyGate.update(elapsed);
    const player = this.state.worldOffset;
    const transition = this.transitionState(player, currentRegionIndex, gems);

    for (const entry of this.regions) {
      const current = entry.index === currentRegionIndex;
      const transitioning = entry.index === transition.index;
      this.updatePlanet(entry, floatingOrigin, elapsed, current ? "current" : transitioning ? "transition" : "hidden", transition.alpha);
      this.updateMoon(entry, floatingOrigin, current, player, elapsed);
      this.updateLandmark(entry, floatingOrigin, current, player, elapsed);
    }
  }
}
