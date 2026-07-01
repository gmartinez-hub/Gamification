// src/fx/ProjectileSystem.js
// Lightweight Projectile/Fx wrapper for Three.js.
// This is intentionally modular so it can be integrated without rewriting main.js.

export class ProjectileSystem {
  constructor({ THREE, scene, makeSprite, textures, playAtlas }) {
    this.THREE = THREE;
    this.scene = scene;
    this.makeSprite = makeSprite;
    this.textures = textures;
    this.playAtlas = playAtlas;
    this.items = [];
  }

  spawnAstronautToolPulse({ from, to, onComplete }) {
    const THREE = this.THREE;
    const direction = new THREE.Vector2(to.x - from.x, to.y - from.y);
    const length = Math.max(0.05, direction.length());
    const angle = Math.atan2(direction.y, direction.x);

    const beam = this.makeSprite(this.textures.astronautToolBeam, {
      blending: THREE.AdditiveBlending,
      opacity: 0.86,
      renderOrder: 40,
      depthWrite: false,
    });

    beam.position.set((from.x + to.x) * 0.5, (from.y + to.y) * 0.5, 0.08);
    beam.scale.set(length, 0.12, 1);
    beam.material.rotation = angle;

    const muzzle = this.makeSprite(this.textures.astronautMuzzleFlash, {
      blending: THREE.AdditiveBlending,
      opacity: 0.92,
      renderOrder: 41,
      depthWrite: false,
    });
    muzzle.position.set(from.x, from.y, 0.09);
    muzzle.scale.set(0.14, 0.14, 1);

    this.scene.add(beam);
    this.scene.add(muzzle);

    this.items.push({
      type: "tool_pulse",
      age: 0,
      duration: 0.18,
      nodes: [beam, muzzle],
      onComplete,
      to,
    });
  }

  spawnShipHeavyShot({ from, to, onImpact }) {
    const THREE = this.THREE;
    const projectile = this.makeSprite(this.textures.shipHeavyProjectileCore, {
      blending: THREE.AdditiveBlending,
      opacity: 0.96,
      renderOrder: 42,
      depthWrite: false,
    });
    projectile.position.set(from.x, from.y, 0.1);
    projectile.scale.set(0.16, 0.16, 1);

    const trail = this.makeSprite(this.textures.shipHeavyProjectileTrail, {
      blending: THREE.AdditiveBlending,
      opacity: 0.62,
      renderOrder: 41,
      depthWrite: false,
    });
    trail.position.set(from.x, from.y, 0.09);
    trail.scale.set(0.45, 0.16, 1);

    this.scene.add(trail);
    this.scene.add(projectile);

    this.items.push({
      type: "ship_heavy_shot",
      age: 0,
      duration: 0.32,
      from: from.clone ? from.clone() : { ...from },
      to: to.clone ? to.clone() : { ...to },
      projectile,
      trail,
      nodes: [projectile, trail],
      onImpact,
    });
  }

  update(delta) {
    const THREE = this.THREE;

    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      item.age += delta;
      const t = Math.min(1, item.age / item.duration);

      if (item.type === "tool_pulse") {
        const fade = 1 - t;
        for (const node of item.nodes) {
          node.material.opacity *= fade;
          node.scale.multiplyScalar(1 + delta * 0.8);
        }
      }

      if (item.type === "ship_heavy_shot") {
        const ease = t * t * (3 - 2 * t);
        const x = THREE.MathUtils.lerp(item.from.x, item.to.x, ease);
        const y = THREE.MathUtils.lerp(item.from.y, item.to.y, ease);
        item.projectile.position.set(x, y, 0.1);
        item.trail.position.set(x - (item.to.x - item.from.x) * 0.12, y - (item.to.y - item.from.y) * 0.12, 0.09);
        item.trail.material.rotation = Math.atan2(item.to.y - item.from.y, item.to.x - item.from.x);
      }

      if (t >= 1) {
        for (const node of item.nodes) this.scene.remove(node);
        if (item.type === "tool_pulse") item.onComplete?.(item.to);
        if (item.type === "ship_heavy_shot") item.onImpact?.(item.to);
        this.items.splice(i, 1);
      }
    }
  }
}
