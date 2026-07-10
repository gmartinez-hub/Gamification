export class GemDirector {
  constructor({ THREE, relicGroup, mission01, renderer }) {
    this.THREE = THREE;
    this.relicGroup = relicGroup;
    this.mission01 = mission01;
    this.renderer = renderer;
    this.root = new THREE.Group();
    this.root.name = "v4:premium-gem";
    this.root.visible = false;
    this.previousState = mission01.relicState;
    this.materialize = 0;
    this.build();
    this.hideLegacy();
    relicGroup.add(this.root);
  }

  hideLegacy() {
    for (const child of this.relicGroup.children) {
      if (child === this.root) continue;
      child.userData.v4LegacyRelic = true;
      child.visible = false;
    }
  }

  build() {
    const THREE = this.THREE;
    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xe9efff,
      emissive: 0x7b2dff,
      emissiveIntensity: 0.32,
      roughness: 0.12,
      metalness: 0.03,
      transmission: 0.34,
      thickness: 0.22,
      transparent: true,
      opacity: 0.92,
      clearcoat: 0.82,
      clearcoatRoughness: 0.18,
    });
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x56e7ff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.shell = new THREE.Mesh(new THREE.OctahedronGeometry(0.145, 1), shellMaterial);
    this.shell.scale.y = 1.55;
    this.core = new THREE.Mesh(new THREE.OctahedronGeometry(0.072, 1), coreMaterial);
    this.core.scale.y = 1.7;
    this.rings = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.20 + i * 0.036, 0.006, 6, 48),
        new THREE.MeshBasicMaterial({
          color: i === 1 ? 0xf05bff : 0x73edff,
          transparent: true,
          opacity: 0.52 - i * 0.08,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.rotation.x = 0.35 + i * 0.48;
      ring.rotation.z = i * 0.7;
      this.rings.add(ring);
    }
    this.fragments = new THREE.Group();
    for (let i = 0; i < 10; i += 1) {
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.014 + (i % 3) * 0.004, 0),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xf05bff : 0x73edff, transparent: true, opacity: 0.72 }),
      );
      shard.userData.angle = (i / 10) * Math.PI * 2;
      shard.userData.radius = 0.25 + (i % 3) * 0.022;
      this.fragments.add(shard);
    }
    this.root.add(this.rings, this.shell, this.core, this.fragments);
  }

  update({ rawDelta, elapsed }) {
    const state = this.mission01.relicState;
    if (state !== this.previousState) {
      if (state === "collectible") this.materialize = 0.001;
      this.previousState = state;
    }
    const shouldShow = state !== "hidden" && state !== "collected" && this.relicGroup.visible !== false;
    this.root.visible = shouldShow;
    if (!shouldShow) return;
    this.hideLegacy();
    if (this.materialize > 0 && this.materialize < 1) this.materialize = Math.min(1, this.materialize + rawDelta * 0.85);
    const t = this.materialize || 1;
    const eased = 1 - Math.pow(1 - t, 3);
    this.root.scale.setScalar(0.55 + eased * 0.45);
    this.root.rotation.y += rawDelta * 0.34;
    this.shell.rotation.x += rawDelta * 0.17;
    this.core.rotation.y -= rawDelta * 0.48;
    this.rings.rotation.z += rawDelta * 0.22;
    const pulse = 1 + Math.sin(elapsed * 2.2) * 0.055;
    this.core.scale.set(1, 1.7 * pulse, 1);
    this.fragments.children.forEach((fragment, index) => {
      const angle = fragment.userData.angle + elapsed * (0.34 + index * 0.003);
      const radius = fragment.userData.radius;
      fragment.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.64, Math.sin(angle * 1.7) * 0.04);
      fragment.rotation.x += rawDelta * 0.6;
      fragment.rotation.z += rawDelta * 0.4;
      fragment.scale.setScalar(0.2 + eased * 0.8);
    });
  }
}
