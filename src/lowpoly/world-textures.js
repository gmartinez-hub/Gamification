import * as THREE from '../../vendor/three.module.js';

export const WORLD_TEXTURES = {
  ocean: new URL('../../assets/runtime/lowpoly-textures/ocean.jpg', import.meta.url).href,
  moon: new URL('../../assets/runtime/lowpoly-textures/moon.jpg', import.meta.url).href,
  gas: new URL('../../assets/runtime/three-textures/gas-giant-color.png', import.meta.url).href,
  rock: new URL('../../assets/runtime/lowpoly-textures/rock-mineral.jpg', import.meta.url).href,
  nebula: new URL('../../assets/runtime/lowpoly-textures/nebula.jpg', import.meta.url).href,
  plates: new URL('../../assets/runtime/three-textures/asteroid-surface-plates-color.png', import.meta.url).href,
  dark: new URL('../../assets/runtime/three-textures/dark-crater-color.png', import.meta.url).href,
  magenta: new URL('../../assets/runtime/three-textures/asteroid-crater-magenta-color.png', import.meta.url).href,
  wide: new URL('../../assets/runtime/three-textures/asteroid-surface-wide-color.png', import.meta.url).href,
  cyan: new URL('../../assets/runtime/three-textures/asteroid-surface-neon-close-color.png', import.meta.url).href,
};
export const ROCK_SURFACES = ['rock', 'moon', 'plates', 'dark', 'magenta', 'wide', 'cyan'];

// One world owns this small cache. Decode concurrency is bounded across all
// simultaneous preparation requests, not separately for every biome request.
export function createWorldTextureLibrary({ loader, concurrency = 2 } = {}) {
  const canLoad = loader || typeof document !== 'undefined';
  const decode = loader || (url => new THREE.TextureLoader().loadAsync(url));
  const records = new Map(), queue = [];
  let disposed = false, active = 0;
  function retire(texture) { texture.dispose(); texture.source?.data?.close?.(); }
  function pump() {
    while (!disposed && active < concurrency && queue.length) {
      const record = queue.shift(); active++;
      Promise.resolve().then(() => decode(WORLD_TEXTURES[record.name])).then(texture => {
        if (disposed || records.get(record.name) !== record) {
          retire(texture); throw new Error('World texture preparation was disposed.');
        }
        texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        record.texture = texture; record.resolve(texture);
      }).catch(error => {
        if (records.get(record.name) === record) records.delete(record.name);
        record.reject(error);
      }).finally(() => { active--; pump(); });
    }
  }
  function load(name) {
    if (disposed) return Promise.reject(new Error('World texture preparation was disposed.'));
    if (!WORLD_TEXTURES[name]) return Promise.reject(new Error('Unknown world texture: '+name));
    if (!canLoad) return Promise.resolve(null);
    if (!records.has(name)) {
      const record = { name };
      record.promise = new Promise((resolve,reject) => { record.resolve=resolve; record.reject=reject; });
      records.set(name,record); queue.push(record); pump();
    }
    return records.get(name).promise;
  }
  return {
    load, get:name => records.get(name)?.texture,
    async prepare(names) {
      const results=await Promise.allSettled([...new Set(names)].map(load));
      const failure=results.find(result=>result.status==='rejected');
      if(failure) throw failure.reason;
      return results.map(result=>result.value);
    },
    retainOnly(names) {
      const retained = new Set(names);
      for (const [name,record] of records) if (!retained.has(name) && record.texture) {
        retire(record.texture); records.delete(name);
      }
    },
    dispose() {
      if(disposed) return; disposed=true;
      for(const record of records.values()) {
        if(record.texture) retire(record.texture);
        else record.reject(new Error('World texture preparation was disposed.'));
      }
      queue.length=0; records.clear();
    },
  };
}
