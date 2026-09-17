import { sampleHazard } from './hazards.js';
import { validCheckpoint } from './checkpoint.js';

// Mission rules use world-space metres and plain data, independently of camera or renderer.
export const AIM_RANGES = Object.freeze({ astronaut: 22, ship: 48 });

const SECTORS = [
  { biomeId: 'nereida', name: "Nereida · Campo inestable", color: 0x66d8df },
  { biomeId: 'vesper', name: "Vesper · Órbita fracturada", color: 0xb299ef },
  { biomeId: 'umbra', name: "Umbra · Núcleo desconocido", color: 0xf397b5 },
];
const SHIP_START = { x: 0, y: 0, z: 10 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
// Conservative sphere enclosing every point of all authored motion families.
const motionReach = spec => (spec.motion?.amplitude || 0) * 1.5;
const envelopeRadius = spec => spec.radius + motionReach(spec);
function safeCorePosition(core, position) {
  return position && ['x','y','z'].every(k=>Number.isFinite(position[k])) &&
    distance(core.position, position) <= motionReach(core) + 1e-6 ? {...position} : {...core.position};
}

function seedNumber(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  const text = String(seed ?? 712069);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

/** Each stream owns its state; effects and combat cannot advance the layout stream. */
export function createRandom(seed = 712069) {
  let value = seedNumber(seed);
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(value ^ (value >>> 15), value | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// A designed route remains legible; random positions vary inside its authored volumes.
function pointInVolume(random, center, halfSize, valid = () => true) {
  const point = (x, y, z) => ({
    x: center.x + x * halfSize.x,
    y: center.y + y * halfSize.y,
    z: center.z + z * halfSize.z,
  });
  for (let attempt = 0; attempt < 96; attempt++) {
    const candidate = point(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1);
    if (valid(candidate)) return candidate;
  }
  // Deterministic fallback retains all safety constraints if rejection sampling is unlucky.
  for (let x = -1; x <= 1; x += .5) {
    for (let y = -1; y <= 1; y += .5) {
      for (let z = -1; z <= 1; z += .5) {
        const candidate = point(x, y, z);
        if (valid(candidate)) return candidate;
      }
    }
  }
  throw new Error("Authored sector volume has no safe placement");
}

function createLayout(seed, sector) {
  const random = createRandom(`${seed}:layout:${sector}`);
  const jitter = (n) => (random() * 2 - 1) * n;
  const beacon = { x: -6 + jitter(3), y: 3 + jitter(2), z: 1 + jitter(3) };
  const regions = [
    { x: -42 + jitter(9), y: 12 + jitter(5), z: -52 + jitter(8) },
    { x: 49 + jitter(9), y: -16 + jitter(5), z: -125 + jitter(8) },
    { x: -35 + jitter(9), y: 28 + jitter(5), z: -211 + jitter(8) },
  ];
  function motion(index, amplitude = 2) {
    return { type: ['crossing', 'orbit', 'drift'][index % 3], axis: { x: 1, y: 0, z: 0 },
      secondary: { x: 0, y: .6, z: .8 }, amplitude, period: amplitude * Math.PI * 2 / 1.25,
      phase: random() * Math.PI * 2 };
  }
  const small = regions.map((center, index) => ({
    id: `sector-${sector + 1}-small-${index + 1}`, role: 'eva', radius: 1.1 + random() * .5,
    position: { x: center.x + 10, y: center.y + 3, z: center.z - 3 },
    approach: { ...center }, region: index, motion: motion(index, 1.5),
  }));
  const large = regions.slice(0, sector + 1).map((center, index) => ({
    id: `sector-${sector + 1}-large-${index + 1}`, role: 'core', radius: 2.1 + random() * .7,
    position: { x: center.x - 17, y: center.y + 10, z: center.z - 28 },
    region: index, motion: motion(index + 1, 2),
  }));
  const gem = { ...large.at(-1).position };
  const gate = { x: 0, y: 0, z: -56 }, exit = { x: 0, y: 0, z: -80 };
  const protectedVolumes = [ {position: SHIP_START, radius: 8}, {position: beacon, radius: 6},
    ...regions.map(position => ({position, radius: 15})),
    ...small.concat(large).map(t => ({position:t.position, radius:envelopeRadius(t) + 4})) ];
  const placed = [];
  function population(role, count) {
    return Array.from({length: count}, (_, index) => {
      const radius = 1.25 + random() * 2;
      const m = motion(index, 4.5 + random() * 2);
      const region = regions[index % 3];
      // Decoration belongs beyond the playable route's x±220 envelope, never in an EVA window.
      const center = role === 'decoration'
        ? {x:(index % 2 ? 1 : -1) * 275, y:region.y, z:region.z}
        : {x:region.x + (index % 2 ? 38 : -38), y:region.y, z:region.z};
      const reach = radius + motionReach({motion:m});
      const position = pointInVolume(random, center, {x:22,y:30,z:34}, p =>
        (role !== 'decoration' || Math.abs(p.x) - reach > 220) &&
        distance(p, {x:0,y:0,z:clamp(p.z,-87,-47)}) > reach + 10 &&
        protectedVolumes.every(v => distance(p,v.position) > reach + v.radius) &&
        placed.every(other => distance(p,other.position) > reach + envelopeRadius(other) + 2));
      const spec = {id:`sector-${sector + 1}-${role}-${index + 1}`,role,position,radius,motion:m,health:Math.ceil(radius)};
      placed.push(spec);
      return spec;
    });
  }
  const hazards = population('hazard', 9), breakables = population('breakable', 9);
  const decoration = population('decoration', 12);
  return { ...SECTORS[sector], beacon, small, large, hazards, breakables, decoration, regions, gem, gate, exit };
}

/** Friendly assisted aiming: targeting distance and shooter speed matter, never the camera view. */
export function aimChance({ distance: shotDistance = 0, actor = "astronaut", sector = 0, speed = 0 } = {}) {
  const range = AIM_RANGES[actor];
  if (!range) return 0;
  const rangePenalty = clamp(Math.max(0, Number(shotDistance) || 0) / range, 0, 1) * .4;
  const speedPenalty = clamp(Math.abs(Number(speed) || 0) * .012, 0, .15);
  const sectorPenalty = clamp(Number(sector) || 0, 0, 2) * .035;
  return clamp((actor === "ship" ? .9 : .94) - rangePenalty - speedPenalty - sectorPenalty, .35, .95);
}

export function createExpedition(seed = 712069) {
  const state = {};
  let optional = new Map(), nextRespawn = 0;
  function resetPopulations() {
    optional = new Map([...state.layout.hazards, ...state.layout.breakables].map(spec =>
      [spec.id, {health: spec.health, destroyed: false, respawnAt: 0, generation: 0}]));
    nextRespawn = 0;
  }
  function discover(position, radius = 38) {
    const found = [];
    for (const target of [...state.layout.small, ...state.layout.large, ...state.layout.hazards, ...state.layout.breakables]) {
      if (!state.discovered.includes(target.id) && distance(position, target.position) <= radius) {
        state.discovered.push(target.id); found.push(target.id);
      }
    }
    return found;
  }
  function damageOptional(id, actor, time = 0) {
    const item = optional.get(id);
    if (!item || item.destroyed || !['astronaut', 'ship'].includes(actor)) return false;
    item.health = Math.max(0, item.health - (actor === 'ship' ? 3 : 1));
    if (!item.health) { item.destroyed = true; item.respawnAt = time + 24; }
    return {id, health:item.health, destroyed:item.destroyed};
  }
  function updatePopulations(time, {playerPosition, isVisible, exclusionRadius = 45} = {}) {
    if (!Number.isFinite(time) || time < nextRespawn || !playerPosition || typeof isVisible !== 'function') return [];
    for (const spec of [...state.layout.hazards, ...state.layout.breakables]) {
      const item = optional.get(spec.id);
      if (!item.destroyed || time < item.respawnAt) continue;
      // Keep the whole future trajectory outside the exclusion sphere, not just its spawn sample.
      const margin = spec.radius + spec.motion.amplitude * 1.5;
      const point = {}; sampleHazard(spec,time,point,{});
      if (distance(spec.position, playerPosition) <= exclusionRadius + margin || isVisible(point, margin)) continue;
      item.health = spec.health; item.destroyed = false; item.generation++;
      state.discovered = state.discovered.filter(id => id !== spec.id);
      nextRespawn = time + 4;
      return [spec.id];
    }
    return [];
  }
  function setScanProgress(value) {
    if (state.phase !== 'scan' || !Number.isFinite(value)) return false;
    state.scanProgress = clamp(value, 0, 1); return true;
  }

  function reset(nextSeed = state.seed ?? seed) {
    const normalizedSeed = seedNumber(nextSeed);
    Object.assign(state, {
      seed: normalizedSeed,
      sector: 0,
      moduleStage: 1,
      phase: "scan",
      gems: 0,
      destroyed: [], discovered: [], scanProgress: 0, lastCorePosition: null,
      layout: createLayout(normalizedSeed, 0),
    });
    resetPopulations();
    return true;
  }

  function scan() {
    if (state.phase !== "scan") return false;
    state.phase = "small"; state.scanProgress = 1;
    return true;
  }

  function restoreCheckpoint(saved) {
    if (!validCheckpoint(saved)) return false;
    const layout = createLayout(saved.seed, saved.sector);
    const ids = new Set([...layout.small, ...layout.large].map(t => t.id));
    const allIds = new Set([...ids, ...layout.hazards.map(t=>t.id), ...layout.breakables.map(t=>t.id)]);
    const destroyed = saved.gemRecovered ? [...ids] : [...new Set(saved.destroyed || [])].filter(id => ids.has(id));
    const smallDone = layout.small.every(t=>destroyed.includes(t.id));
    // Invalid out-of-order large progress is ignored instead of unlocking rewards.
    if (!smallDone && !saved.gemRecovered) for (const t of layout.large) {
      const i=destroyed.indexOf(t.id); if(i>=0)destroyed.splice(i,1);
    }
    const scanned = saved.scanned === true || destroyed.length > 0;
    const largeDone = layout.large.every(t=>destroyed.includes(t.id));
    // Destruction order identifies the actual last core; v1 has no ordered partial history.
    const lastCoreId = [...(saved.destroyed || destroyed)].reverse().find(id =>
      destroyed.includes(id) && layout.large.some(core => core.id === id));
    const lastCore = layout.large.find(core => core.id === lastCoreId);
    const lastCorePosition = lastCore ? safeCorePosition(lastCore, saved.lastCorePosition) : null;
    if (largeDone && lastCorePosition) layout.gem = {...lastCorePosition};
    Object.assign(state, { seed: saved.seed, sector: saved.sector, moduleStage: saved.sector + 1,
      gems: saved.complete ? 3 : saved.sector + Number(saved.gemRecovered),
      phase: saved.complete ? 'complete' : saved.gemRecovered ? 'return' : largeDone ? 'gem' : smallDone ? 'large' : scanned ? 'small' : 'scan',
      destroyed, discovered: [...new Set(saved.discovered || [])].filter(id=>allIds.has(id)),
      scanProgress: scanned ? 1 : saved.scanProgress || 0, lastCorePosition, layout });
    resetPopulations();
    return true;
  }

  function hit(id, actor, position) {
    const kind = state.phase;
    if (kind !== "small" && kind !== "large") return false;
    if (actor !== (kind === "small" ? "astronaut" : "ship")) return false;
    const targets = state.layout[kind];
    if (!targets.some(target => target.id === id) || state.destroyed.includes(id)) return false;
    state.destroyed.push(id);
    if (kind === 'large') {
      const target = targets.find(t => t.id === id);
      state.lastCorePosition = safeCorePosition(target, position);
    }
    if (targets.every(target => state.destroyed.includes(target.id))) {
      state.phase = kind === "small" ? "large" : "gem";
      if (kind === "large") state.layout.gem = {...state.lastCorePosition};
    }
    return true;
  }

  function collectGem() {
    if (state.phase !== "gem") return false;
    state.gems++;
    state.phase = "return";
    return true;
  }

  function enterCorridor(actor) {
    if (state.phase !== "return" || actor !== "ship") return false;
    state.phase = "transit";
    return true;
  }

  function finishTransit() {
    if (state.phase !== "transit") return false;
    if (state.sector === 2) {
      state.phase = "complete";
    } else {
      state.sector++;
      state.moduleStage = state.sector + 1;
      state.phase = "scan";
      state.destroyed = []; state.discovered = []; state.scanProgress = 0; state.lastCorePosition = null;
      state.layout = createLayout(state.seed, state.sector);
      resetPopulations();
    }
    return true;
  }

  reset(seed);
  return { state, discover, setScanProgress, damageOptional, optionalState: id => optional.get(id), updatePopulations, scan, hit, collectGem, enterCorridor, finishTransit, reset, restoreCheckpoint };
}
