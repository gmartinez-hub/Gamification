import * as THREE from '../../vendor/three.module.js';

// One shared set for all actors. Paint catches broad soft light; seals stay
// dark and diffuse while copper and coated glass carry sharper highlights.
export const palette = {
  ivory: new THREE.MeshStandardMaterial({ color: 0xeee9dc, roughness: .73, metalness: .075, flatShading: true }),
  white: new THREE.MeshStandardMaterial({ color: 0xfff6e8, roughness: .65, metalness: .06, flatShading: true }),
  graphite: new THREE.MeshStandardMaterial({ color: 0x26343c, roughness: .53, metalness: .48, flatShading: true }),
  seam: new THREE.MeshStandardMaterial({ color: 0x111b22, roughness: .92, metalness: .02 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1b242b, roughness: .94, metalness: 0, flatShading: true }),
  teal: new THREE.MeshStandardMaterial({ color: 0x236d77, roughness: .65, metalness: .12, flatShading: true }),
  copper: new THREE.MeshStandardMaterial({ color: 0xc18b59, roughness: .32, metalness: .65, flatShading: true }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x06234d, emissive: 0x041e42, emissiveIntensity: .25, roughness: .075, metalness: .16, clearcoat: .9, clearcoatRoughness: .045, specularColor: 0x8fc8ff, envMapIntensity: .8 }),
  glassReflection: new THREE.MeshBasicMaterial({ color: 0x54c2ef, transparent: true, opacity: .32, depthWrite: false, toneMapped: false }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x8de7ef, emissive: 0x39bfe9, emissiveIntensity: 1.55, roughness: .25, metalness: .15 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xffda7d, emissive: 0xffa72e, emissiveIntensity: 1.6, roughness: .25, metalness: .2 }),
  exhaust: new THREE.MeshStandardMaterial({ color: 0x9feaff, emissive: 0x2caeea, emissiveIntensity: 2.5, transparent: true, opacity: .66, depthWrite: false, flatShading: true }),
  display: new THREE.MeshBasicMaterial({ color: 0x082b38 }),
  readout: new THREE.MeshBasicMaterial({ color: 0x8ee9df, toneMapped: false }),
  warning: new THREE.MeshBasicMaterial({ color: 0xffc58d, toneMapped: false }),
};

// Node can construct and validate every mesh without a DOM or image loader.
// Failure keeps the base paint usable instead of blocking the expedition.
if (typeof document !== 'undefined' && typeof document.createElementNS === 'function') {
  new THREE.TextureLoader().load(new URL('../../assets/runtime/lowpoly-textures/paint-detail.jpg', import.meta.url).href, texture => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    texture.anisotropy = 4;
    for (const material of [palette.ivory, palette.white, palette.teal]) {
      // This is a gray surface-detail image, not the paint's albedo. Multiplying
      // it into ivory would turn the entire suit and ship into dull beige.
      material.bumpMap = texture;
      material.bumpScale = .0025;
      material.roughnessMap = texture;
      material.needsUpdate = true;
    }
  }, undefined, () => {});
}
