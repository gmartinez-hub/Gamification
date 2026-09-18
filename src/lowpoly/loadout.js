const copy = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const finiteVector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

export const LOADOUT_BALANCE = Object.freeze({
  turretCost:3,middleModuleCost:6,salvoCooldown:4,
  rewards:Object.freeze({asteroid:1,core:2,enemy:2,enemyShip:4}),
});

export function awardCharge(current, source) {
  const amount=LOADOUT_BALANCE.rewards[source];
  if(!Number.isFinite(amount))throw new Error('Unknown charge source');
  const state=createLoadoutState(current);state.charge+=amount;return state;
}

export function unlockRoutePieces(current, moduleStage) {
  const state=createLoadoutState(current);
  const grants=[['front','front-1'],['middle','middle-1'],['final','final-1']];
  for(const [type,id] of grants.slice(0,Math.max(1,Math.min(3,Number(moduleStage)||1)))){
    if(!state.unlocked.includes(type))state.unlocked.push(type);
    if(!state.modules.some(module=>module.id===id))state.modules.push({id,type});
  }
  if(Number(moduleStage)>=2&&!state.unlocked.includes('turret'))state.unlocked.push('turret');
  if(!state.activeComposition.length)state.activeComposition=['front-1'];
  return state;
}

export function purchaseEquipment(current, type) {
  const state=createLoadoutState(current);
  const normalized=type==='middle'?'middle':type==='turret'?'turret':null;
  if(!normalized)throw new Error('Unknown equipment type');
  if(!state.unlocked.includes(normalized))throw new Error('Equipment is still locked');
  const cost=normalized==='middle'?LOADOUT_BALANCE.middleModuleCost:LOADOUT_BALANCE.turretCost;
  if(state.charge<cost)throw new Error('Insufficient charge');
  const collection=normalized==='middle'?state.modules:state.turrets;
  const count=normalized==='middle'?state.modules.filter(item=>item.type==='middle').length:state.turrets.length;
  collection.push(normalized==='middle'?{id:`middle-${count+1}`,type:'middle'}:{id:`turret-${count+1}`});
  state.charge-=cost;
  return state;
}

export function createLoadoutState(source = {}) {
  const modules = (source.modules || [{ id: 'front-1', type: 'front' }]).map(module => ({ ...module }));
  const turrets = (source.turrets || []).map(turret => ({ ...turret }));
  return {
    version: 1,
    charge: Math.max(0, Number.isFinite(source.charge) ? source.charge : 0),
    routeGems: Math.max(0, Number.isInteger(source.routeGems) ? source.routeGems : 0),
    unlocked: [...new Set(source.unlocked || ['front'])],
    modules,
    turrets,
    activeComposition: [...(source.activeComposition || [modules[0]?.id].filter(Boolean))],
    placements: copy(source.placements || {}),
    presets: copy(source.presets || []),
    bike: { id: 'bike-1', ...(source.bike || {}) },
    noma: { id: 'noma-1', ...(source.noma || {}) },
    crew: { greenAlly: false, ...(source.crew || {}) },
  };
}

export function installComposition(current, ids) {
  const state = createLoadoutState(current);
  if (!Array.isArray(ids) || ids.length < 1 || new Set(ids).size !== ids.length) throw new Error('Composition must use unique owned modules');
  const modules = ids.map(id => state.modules.find(module => module.id === id));
  if (modules.some(module => !module)) throw new Error('Composition contains an unowned module');
  if (modules[0].type !== 'front') throw new Error('Composition must begin with the front module');
  const finalIndex = modules.findIndex(module => module.type === 'final');
  if (finalIndex >= 0 && finalIndex !== modules.length - 1) throw new Error('Final module must close the composition');
  if (modules.slice(1, finalIndex < 0 ? undefined : -1).some(module => module.type !== 'middle')) throw new Error('Only middle modules may repeat between front and final');
  state.activeComposition = [...ids];
  return state;
}

export function placeTurret(current, { turretId, hostId, position, rotation, cost = 0 }) {
  const state = createLoadoutState(current);
  const turret = state.turrets.find(item => item.id === turretId);
  if (!turret) throw new Error('Turret is not owned');
  const hosts = new Set([...state.modules.map(module => module.id), state.bike.id, state.noma.id]);
  if (!hosts.has(hostId)) throw new Error('Turret host is not owned');
  if (!finiteVector(position) || !finiteVector(rotation) || position.some(value => Math.abs(value) > 2)) throw new Error('Position is outside a compatible mounting surface');
  const firstPlacement = !state.placements[turretId];
  if (firstPlacement && state.charge < cost) throw new Error('Insufficient charge');
  state.placements[turretId] = { hostId, position: [...position], rotation: [...rotation] };
  if (firstPlacement) state.charge -= cost;
  return state;
}

export function savePreset(current, name) {
  const state = createLoadoutState(current);
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Preset name is required');
  const existing = state.presets.find(preset => preset.name === trimmed);
  const preset = {
    id: existing?.id || `preset-${state.presets.length + 1}`,
    name: trimmed,
    composition: [...state.activeComposition],
    placements: copy(state.placements),
  };
  state.presets = [...state.presets.filter(item => item.id !== preset.id), preset].slice(-3);
  return state;
}

export function activatePreset(current, presetId) {
  const state = createLoadoutState(current);
  const preset = state.presets.find(item => item.id === presetId);
  if (!preset) throw new Error('Preset not found');
  const activated = installComposition(state, preset.composition);
  activated.placements = copy(preset.placements);
  return activated;
}
