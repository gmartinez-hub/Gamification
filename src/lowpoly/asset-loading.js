import { GLTFLoader } from '../../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/meshopt_decoder.mjs';

const sharedSources = new Map();
const resourceOwners = new WeakMap(), imageOwners = new Map(), sceneOwners = new WeakMap();
const releasedScenes = new WeakSet(), releasedBundles = new WeakSet();

function resourcesFor(scene) {
  const resources = new Set(), images = new Set();
  scene.traverse(object => {
    if (!object.isMesh) return;
    resources.add(object.geometry);
    // Retain the skeleton, not its current texture: renderer creates boneTexture
    // lazily after load, and shared skinned meshes must release it only once.
    if (object.isSkinnedMesh && object.skeleton) resources.add(object.skeleton);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) {
        resources.add(value);
        if (value.source?.data) images.add(value.source.data);
      }
    }
  });
  return { resources, images };
}

function retainScene(scene) {
  const owner = sceneOwners.get(scene) || { ...resourcesFor(scene), count: 0 };
  owner.count++; sceneOwners.set(scene, owner); releasedScenes.delete(scene);
  for (const resource of owner.resources) resourceOwners.set(resource, (resourceOwners.get(resource) || 0) + 1);
  for (const image of owner.images) imageOwners.set(image, (imageOwners.get(image) || 0) + 1);
}
function createLoader() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  loader.register(parser => ({ name: 'SharedOriginalImages', afterRoot(result) {
    const replaced = new Set();
    result.scene.traverse(object => {
      if (!object.isMesh) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const texture of Object.values(material)) {
          if (!texture?.isTexture) continue;
          texture.anisotropy = 8;
          const index = parser.associations.get(texture)?.textures;
          const uri = parser.json.images?.[parser.json.textures?.[index]?.source]?.uri;
          if (!uri) continue;
          const key = new URL(uri, parser.options.path).href;
          if (sharedSources.has(key)) {
            const source = sharedSources.get(key);
            if (source.data !== texture.source.data) replaced.add(texture.source.data);
            texture.source = source;
          } else sharedSources.set(key, texture.source);
        }
      }
    });
    for (const image of replaced) image.close?.();
  }}));
  return loader;
}

// Identify mobile scheduling before requests, including iPad desktop mode.
// Both profiles use identical visible meshes and original texture resolution.
export function usesMobileAssets({ coarsePointer = false, userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
  return coarsePointer || /Android|iPhone|iPad|iPod/i.test(userAgent)
    || (/Mac/i.test(platform) && maxTouchPoints > 1);
}

export function encounterModelDirectory(mobile = false) {
  return mobile ? 'encounter-models-mobile' : 'encounter-models';
}

export function releaseModelAssets(assets) {
  if (releasedBundles.has(assets)) return;
  releasedBundles.add(assets);
  for (const { scene } of Object.values(assets)) {
    if (!scene || releasedScenes.has(scene)) continue;
    const owner = sceneOwners.get(scene) || { ...resourcesFor(scene), count: 1 };
    for (const resource of owner.resources) {
      const remaining = Math.max(0, (resourceOwners.get(resource) || 1) - 1);
      if (remaining) resourceOwners.set(resource, remaining);
      else { resourceOwners.delete(resource); resource.dispose(); }
    }
    for (const image of owner.images) {
      const remaining = Math.max(0, (imageOwners.get(image) || 1) - 1);
      if (remaining) imageOwners.set(image, remaining);
      else {
        imageOwners.delete(image);
        for (const [key, source] of sharedSources) if (source.data === image) sharedSources.delete(key);
        image.close?.();
      }
    }
    if (--owner.count <= 0) { sceneOwners.delete(scene); releasedScenes.add(scene); }
  }
}

// Bound downloads AND glTF decoding. Merely staggering fetches still permits
// every large image/geometry buffer to be decoded at once on mobile Safari.
export async function loadModelSet(entries, { mobile = false, directory = 'streamed-models', onProgress = () => {}, loader = createLoader() } = {}) {
  const assets = {};
  const concurrency = mobile ? 1 : 3;
  let cursor = 0, complete = 0, failure;
  async function worker() {
    while (!failure && cursor < entries.length) {
      const [key, file] = entries[cursor++];
      try {
        const { scene, animations } = await loader.loadAsync(new URL(`../../assets/runtime/${directory}/${file}.glb`, import.meta.url).href);
        // GLTFParser retains the original BIN and decode caches. Gameplay owns
        // just scene + clips; releasing the parser avoids a second asset copy.
        retainScene(scene); assets[key] = { scene, animations };
        onProgress(++complete, entries.length);
      } catch (error) { failure ||= error; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker));
  if (failure) { releaseModelAssets(assets); throw failure; }
  return assets;
}
