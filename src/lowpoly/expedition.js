// Mission rules use world-space metres and plain data, independently of camera or renderer.
export const AIM_RANGES = Object.freeze({ astronaut: 30, ship: 70 });

const SECTORS = [
  { name: "Nereida · Campo inestable", color: 0x66d8df },
  { name: "Vesper · Órbita fracturada", color: 0xb299ef },
  { name: "Umbra · Núcleo desconocido", color: 0xf397b5 },
];
const LAUNCH = { x: 2, y: 0, z: 10 };
const SHIP_START = { x: 0, y: 0, z: 10 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

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
  const hazardRandom = createRandom(`${seed}:hazards:${sector}`);
  const occupied = [];
  const beacon = pointInVolume(random, { x: -6, y: 3, z: 1 }, { x: 3, y: 2, z: 3 });
  occupied.push({ position: beacon, radius: 1.2 });

  function target(kind, index, center, halfSize) {
    const radius = kind === "small" ? 1.1 + random() * .5 : 2.1 + random() * .7;
    const position = pointInVolume(random, center, halfSize, candidate =>
      (kind !== "small" || distance(candidate, LAUNCH) <= 24) &&
      occupied.every(other => distance(candidate, other.position) > radius + other.radius + 2)
    );
    const result = { id: `sector-${sector + 1}-${kind}-${index + 1}`, position, radius };
    occupied.push(result);
    return result;
  }

  const small = [
    { x: -11, y: -2, z: -1 },
    { x: 10, y: 5, z: -4 },
    { x: 1, y: -6, z: -10 },
  ].map((center, index) => target("small", index, center, { x: 2.5, y: 1.5, z: 1.5 }));

  const large = [
    { x: -7, y: 3, z: -27 },
    { x: 8, y: -4, z: -31 },
    { x: 0, y: 6, z: -36 },
  ].slice(0, sector + 1).map((center, index) =>
    target("large", index, center, { x: 2, y: 1.5, z: 1.5 })
  );
  const finalCore = large.at(-1);
  const gem = {
    x: finalCore.position.x + finalCore.radius + 2,
    y: finalCore.position.y,
    z: finalCore.position.z,
  };
  const gate = { x: 0, y: 0, z: -56 };
  const exit = { x: 0, y: 0, z: -80 };

  const hazards = [3, -9, -19, -27, -37, -45].map((z, index) => {
    const radius = 1.25 + hazardRandom() * .8;
    const position = pointInVolume(
      hazardRandom,
      { x: index % 2 ? 16 : -16, y: index % 3 === 0 ? 7 : -3, z },
      { x: 5, y: 4, z: 3 },
      candidate => distance(candidate, SHIP_START) > radius + 5 &&
        [beacon, gem, gate].every(point => distance(candidate, point) > radius + 4) &&
        occupied.every(other => distance(candidate, other.position) > radius + other.radius + 2) &&
        (candidate.z >= -44 || Math.hypot(candidate.x, candidate.y) > radius + 6)
    );
    const result = { id: `sector-${sector + 1}-hazard-${index + 1}`, position, radius };
    occupied.push(result);
    return result;
  });

  return { ...SECTORS[sector], beacon, small, large, hazards, gem, gate, exit };
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

  function reset(nextSeed = state.seed ?? seed) {
    const normalizedSeed = seedNumber(nextSeed);
    Object.assign(state, {
      seed: normalizedSeed,
      sector: 0,
      moduleStage: 1,
      phase: "scan",
      gems: 0,
      destroyed: [],
      layout: createLayout(normalizedSeed, 0),
    });
    return true;
  }

  function scan() {
    if (state.phase !== "scan") return false;
    state.phase = "small";
    return true;
  }

  function hit(id, actor) {
    const kind = state.phase;
    if (kind !== "small" && kind !== "large") return false;
    if (actor !== (kind === "small" ? "astronaut" : "ship")) return false;
    const targets = state.layout[kind];
    if (!targets.some(target => target.id === id) || state.destroyed.includes(id)) return false;
    state.destroyed.push(id);
    if (targets.every(target => state.destroyed.includes(target.id))) {
      state.phase = kind === "small" ? "large" : "gem";
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
      state.destroyed = [];
      state.layout = createLayout(state.seed, state.sector);
    }
    return true;
  }

  reset(seed);
  return { state, scan, hit, collectGem, enterCorridor, finishTransit, reset };
}
