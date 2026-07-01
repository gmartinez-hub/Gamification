// src/vfx/HologramRelicController.js
// Suggested Three.js structure. Requires THREE to be passed from runtime.

export function createHologramRelic({ THREE, textures, baseScale = 1 }) {
  const group = new THREE.Group();
  group.name = "HologramRelic";

  const makeSprite = (texture, { scale = 1, opacity = 1, blending = THREE.AdditiveBlending, depth = 0 } = {}) => {
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity,
      blending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale, scale, 1);
    sprite.position.z = depth;
    return sprite;
  };

  const glow = makeSprite(textures.relicGlow, { scale: baseScale * 2.3, opacity: 0.7, depth: -0.02 });
  const core = makeSprite(textures.relicCore, { scale: baseScale, opacity: 1, blending: THREE.NormalBlending, depth: 0.01 });
  const ringA = makeSprite(textures.relicRingA, { scale: baseScale * 1.7, opacity: 0.72, depth: 0.00 });
  const ringB = makeSprite(textures.relicRingB, { scale: baseScale * 1.35, opacity: 0.62, depth: 0.02 });
  const scan = makeSprite(textures.relicScanlines, { scale: baseScale * 1.2, opacity: 0.18, depth: 0.03 });

  group.add(glow, ringA, ringB, core, scan);
  group.userData = {
    state: "hidden",
    baseScale,
    glow,
    core,
    ringA,
    ringB,
    scan,
    phase: Math.random() * Math.PI * 2,
  };

  group.visible = false;

  group.update = (time, delta) => {
    const u = group.userData;
    if (!group.visible) return;

    group.position.y += Math.sin(time * 1.3 + u.phase) * 0.0008;
    group.rotation.y += delta * 0.32;
    group.rotation.z = Math.sin(time * 0.7) * 0.03;

    u.ringA.material.rotation += delta * 0.45;
    u.ringB.material.rotation -= delta * 0.72;
    u.scan.material.rotation += delta * 0.05;

    const pulse = 1 + Math.sin(time * 2.1) * 0.045;
    u.glow.scale.setScalar(baseScale * 2.3 * pulse);
    u.core.material.opacity = 0.88 + Math.sin(time * 8.0) * 0.06;
  };

  group.setState = (state) => {
    group.userData.state = state;
    group.visible = state !== "hidden";
    if (state === "reveal") group.scale.setScalar(0.15);
    if (state === "idle_collectible") group.scale.setScalar(1.5);
    if (state === "collected") group.scale.setScalar(2.2);
  };

  return group;
}
