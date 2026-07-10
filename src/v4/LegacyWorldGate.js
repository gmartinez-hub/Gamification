const CELESTIAL_TEXTURE_PATTERN = /(planet|cyber-earth|earth-dark|gas[-_ ]?giant|network[-_ ]?planet|dark[-_ ]?crater|ocean[-_ ]?world|mechanical[-_ ]?moon|aurora[-_ ]?gas|nebula[-_ ]?core|ringed[-_ ]?white)/i;
const CELESTIAL_NAME_PATTERN = /(^|[:_ -])(planet|hero[-_ ]?body|world[-_ ]?body|moon)([:_ -]|$)/i;

function materialsOf(object) {
  if (!object?.material) return [];
  return Array.isArray(object.material) ? object.material : [object.material];
}

function sourceOf(texture) {
  const image = texture?.image;
  return String(image?.currentSrc || image?.src || texture?.source?.data?.currentSrc || texture?.source?.data?.src || "");
}

function textureSources(object) {
  const keys = ["map", "alphaMap", "emissiveMap"];
  const sources = [];
  for (const material of materialsOf(object)) {
    for (const key of keys) {
      const source = sourceOf(material?.[key]);
      if (source) sources.push(source);
    }
  }
  return sources;
}

function isV4Owned(object) {
  let current = object;
  while (current) {
    if (current.userData?.v4Owned || String(current.name || "").startsWith("v4:")) return true;
    current = current.parent;
  }
  return false;
}

function isMissionObject(object) {
  let current = object;
  while (current) {
    const data = current.userData || {};
    if (
      data.missionRole || data.interactive || data.objective || data.isMissionTargetHalo ||
      data.isObjectiveHalo || data.relic || data.projectile || data.isProjectile
    ) return true;
    current = current.parent;
  }
  return false;
}

function metadataSaysHero(object) {
  const data = object?.userData || {};
  return Boolean(
    data.worldDepthRole === "hero" ||
    data.worldDepthSlot ||
    data.compositionRole === "hero" ||
    (data.materialLocked && data.identityKind) ||
    data.heroBody ||
    data.planetIdentity
  );
}

function geometryLooksCelestial(object, rootKind) {
  if (rootKind !== "background") return false;
  const type = String(object?.geometry?.type || "");
  if (!/(Sphere|Circle)/i.test(type)) return false;
  const size = Math.max(Math.abs(object.scale?.x || 0), Math.abs(object.scale?.y || 0));
  return size > 0.18;
}

export class LegacyWorldGate {
  constructor({ scene, backgroundScene }) {
    this.scene = scene;
    this.backgroundScene = backgroundScene;
    this.hidden = new Set();
    this.lastScan = -Infinity;
    this.scan();
  }

  candidate(object, rootKind) {
    if (!object || isV4Owned(object) || isMissionObject(object)) return false;
    if (metadataSaysHero(object)) return true;
    if (CELESTIAL_NAME_PATTERN.test(String(object.name || ""))) return true;
    if (textureSources(object).some((source) => CELESTIAL_TEXTURE_PATTERN.test(source))) return true;
    return geometryLooksCelestial(object, rootKind);
  }

  scanRoot(root, rootKind) {
    root?.traverse?.((object) => {
      if (this.candidate(object, rootKind)) this.hidden.add(object);
    });
  }

  scan() {
    this.scanRoot(this.backgroundScene, "background");
    this.scanRoot(this.scene, "scene");
  }

  update(elapsed) {
    for (const object of this.hidden) {
      if (object && !isV4Owned(object) && !isMissionObject(object)) object.visible = false;
    }
    if (elapsed - this.lastScan >= 0.75) {
      this.lastScan = elapsed;
      this.scan();
    }
  }
}

export function markV4Owned(root) {
  root?.traverse?.((object) => {
    object.userData = object.userData || {};
    object.userData.v4Owned = true;
  });
  if (root) {
    root.userData = root.userData || {};
    root.userData.v4Owned = true;
  }
  return root;
}
