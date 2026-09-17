export const CHECKPOINT_KEY = 'gravedad-zero:expedition:v4';
export const DEFAULT_SETTINGS = Object.freeze({ firstPerson: true, soundEnabled: false, effectsVolume: .75, ambienceVolume: .4, introSeen: false, touchLayout: 'joystick' });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validCheckpoint(value) {
  return object(value) && Number.isInteger(value.seed) && value.seed >= 0 && value.seed <= 0xffffffff &&
    Number.isInteger(value.sector) && value.sector >= 0 && value.sector <= 2 &&
    typeof value.gemRecovered === 'boolean' && typeof value.complete === 'boolean' &&
    (value.version === undefined || [1,2].includes(value.version)) &&
    (value.scanned === undefined || typeof value.scanned === 'boolean') &&
    (value.scanProgress === undefined || Number.isFinite(value.scanProgress) && value.scanProgress >= 0 && value.scanProgress <= 1) &&
    ['destroyed','discovered'].every(key => value[key] === undefined || Array.isArray(value[key]) && value[key].length <= 64 && value[key].every(id=>typeof id === 'string' && id.length < 100)) &&
    (value.lastCorePosition == null || object(value.lastCorePosition) && ['x','y','z'].every(k=>Number.isFinite(value.lastCorePosition[k]) && Math.abs(value.lastCorePosition[k]) < 10000)) &&
    (!value.complete || (value.sector === 2 && value.gemRecovered));
}

function settingsFrom(value) {
  const source = object(value) ? value : {};
  const volume = (key, fallback) => Number.isFinite(source[key]) ? Math.max(0, Math.min(1, source[key])) : fallback;
  return {
    firstPerson: typeof source.firstPerson === 'boolean' ? source.firstPerson : true,
    soundEnabled: source.soundEnabled === true,
    effectsVolume: volume('effectsVolume', .75), ambienceVolume: volume('ambienceVolume', .4),
    introSeen: source.introSeen === true, touchLayout: source.touchLayout === 'arrows' ? 'arrows' : 'joystick',
  };
}

function partialFrom(record) {
  return {scanned: record.scanned === true, scanProgress: record.scanProgress ?? 0,
    destroyed: [...(record.destroyed || [])], discovered: [...(record.discovered || [])],
    lastCorePosition: record.lastCorePosition ? {...record.lastCorePosition} : null};
}

/** Sector checkpoints contain no arbitrary positions: resume at a safe dock.
 * A gem already collected remains earned even if Safari closes before transit. */
export function createCheckpointStore(storage) {
  if (storage === undefined) { try { storage = globalThis.localStorage; } catch { storage = null; } }
  return {
    load({ seed } = {}) {
      try {
        const raw = storage?.getItem(CHECKPOINT_KEY);
        if (!raw || raw.length > 8192) return null;
        const record = JSON.parse(raw);
        if (!validCheckpoint(record) || ![1,2].includes(record.version) || (seed !== undefined && seed !== record.seed)) return null;
        return { ...partialFrom(record), version: record.version, seed: record.seed, sector: record.sector, complete: record.complete,
          gemRecovered: record.gemRecovered, settings: settingsFrom(record.settings) };
      } catch { return null; }
    },
    save(state, settings) {
      try {
        const record = { ...partialFrom({ ...state, scanned: state.phase !== 'scan' }), version: 2, seed: state.seed, sector: state.sector,
          complete: state.phase === 'complete', gemRecovered: ['return', 'transit', 'complete'].includes(state.phase),
          settings: settingsFrom(settings) };
        if (!validCheckpoint(record) || !storage) return false;
        storage.setItem(CHECKPOINT_KEY, JSON.stringify(record));
        return true;
      } catch { return false; }
    },
    clear() { try { storage?.removeItem(CHECKPOINT_KEY); } catch { /* Private mode / quota never blocks play. */ } },
  };
}
