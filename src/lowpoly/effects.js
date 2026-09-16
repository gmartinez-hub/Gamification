import * as THREE from '../../vendor/three.module.js';

const NO_OPTIONS = Object.freeze({});
const ATLAS_FILES = Object.freeze({
  scan: 'scan-atlas.png',
  ship: 'ship-impact.png',
  eva: 'eva-impact.png',
});
const EFFECTS = Object.freeze({
  scan: { atlas: 'scan', columns: 4, rows: 1, duration: .9, scale: 2.2, color: 0xa5ffe8, opacity: .72 },
  ship: { atlas: 'ship', columns: 4, rows: 4, duration: 1.05, scale: 5, color: 0xffdab0, opacity: .88 },
  eva: { atlas: 'eva', columns: 4, rows: 4, duration: .8, scale: 2.6, color: 0xb6f5ff, opacity: .8 },
  // The legacy gem strip has inconsistent frame metadata. Reuse the verified
  // ring sequence until its original registration can be recovered.
  gem: { atlas: 'scan', columns: 4, rows: 1, duration: 1.1, scale: 3.4, color: 0xddb7ff, opacity: .85 },
});

/** Atlas files run left-to-right, top-to-bottom; texture UVs start below.
 * The caller supplies scratch storage so frame sampling never allocates. */
export function atlasFrame(columns, rows, progress, out) {
  const count = columns * rows;
  const frame = Math.min(count - 1, Math.max(0, Math.floor(progress * count)));
  out.frame = frame;
  out.x = (frame % columns) / columns;
  out.y = 1 - (Math.floor(frame / columns) + 1) / rows;
  out.width = 1 / columns;
  out.height = 1 / rows;
  return out;
}

function prepareTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** Four reusable, depth-tested billboards. Failed/pending image loads leave only
 * their effects hidden and never block the world or an interaction. */
export function createEffects(scene) {
  const root = new THREE.Group();
  root.name = 'legacy-atlas-effects';
  scene.add(root);
  const loader = new THREE.TextureLoader();
  const sources = {};
  let disposed = false;
  let cursor = 0;

  for (const kind of Object.keys(ATLAS_FILES)) {
    const source = { ready: false, texture: null };
    sources[kind] = source;
    const url = new URL(`../../assets/runtime/lowpoly-textures/${ATLAS_FILES[kind]}`, import.meta.url);
    source.texture = prepareTexture(loader.load(url.href, texture => {
      if (disposed) { texture.dispose(); return; }
      source.ready = true;
    }, undefined, () => { source.ready = false; }));
  }

  const slots = Array.from({ length: 4 }, (_, index) => {
    const texture = prepareTexture(new THREE.Texture());
    const material = new THREE.SpriteMaterial({
      map: texture, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthTest: true, depthWrite: false,
      toneMapped: false, fog: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = `atlas-burst-${index}`;
    sprite.visible = false;
    root.add(sprite);
    return { sprite, material, texture, active: false, attached: false, config: EFFECTS.eva, start: 0, uv: {} };
  });

  function burst(position, kind, time) {
    const config = EFFECTS[kind];
    if (disposed || !config || !Number.isFinite(time)) return false;
    const slot = slots[cursor];
    cursor = (cursor + 1) % slots.length;
    slot.active = true;
    slot.attached = false;
    slot.config = config;
    slot.start = time;
    slot.sprite.position.copy(position);
    slot.sprite.scale.setScalar(config.scale);
    slot.sprite.visible = false;
    slot.material.color.setHex(config.color);
    return true;
  }

  // THREE.Sprite faces the rendering camera itself; accepting camera here keeps
  // the effect API symmetric with other presentation systems without copying it.
  function update(time, camera, options = NO_OPTIONS) {
    if (disposed) return;
    for (const slot of slots) {
      if (!slot.active) continue;
      const config = slot.config;
      const age = time - slot.start;
      if (age >= config.duration) {
        slot.active = false;
        slot.sprite.visible = false;
        continue;
      }
      const source = sources[config.atlas];
      if (age < 0 || !source.ready) { slot.sprite.visible = false; continue; }
      if (!slot.attached) {
        // Each slot owns its UV transform but shares the decoded source image.
        slot.texture.source = source.texture.source;
        slot.texture.needsUpdate = true;
        slot.attached = true;
      }
      const progress = age / config.duration;
      atlasFrame(config.columns, config.rows, options.reducedMotion ? .55 : progress, slot.uv);
      slot.texture.repeat.set(slot.uv.width, slot.uv.height);
      slot.texture.offset.set(slot.uv.x, slot.uv.y);
      slot.material.opacity = config.opacity * (options.reducedMotion ? .3 : 1) * Math.pow(1 - progress, .6);
      slot.sprite.visible = true;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    for (const slot of slots) { slot.texture.dispose(); slot.material.dispose(); }
    for (const source of Object.values(sources)) source.texture.dispose();
  }
  return { burst, update, dispose };
}
