/**
 * Gravedad Zero Runtime V2 executable semantic oracle.
 *
 * CONTRACT-ONLY. The clean runtime MUST NOT import this module at runtime.
 * It exists to make approved product invariants executable before implementation.
 */

export const BOOSTED_BIKE_PRICE = 1500;
export const PORTAL_TRANSIT_FORMATION = 'STAGGERED';
export const PORTAL_FULL_SETUP_VISIBLE = true;
export const PORTAL_SCALE_DIRECTION = 'ENLARGE_WHOLE_PORTAL';
export const PORTAL_EXACT_DIMENSIONS_STATUS = 'MEASURE_VERIFY';
export const BOOSTED_BIKE_INTEGRATION = 'EMBEDDED';
export const BOOSTED_BIKE_SCALE_STATUS = 'VERIFY';
export const BOOST_TOP_SPEED_PERCENT = 0.25;
export const BOOST_ACCELERATION_PERCENT = 0.40;
export const GLOBAL_SPEED_UPGRADE_TOP_SPEED_PERCENT = 0.15;
export const GLOBAL_SPEED_UPGRADE_ACCELERATION_PERCENT = 0.20;
export const GLOBAL_SPEED_UPGRADE_PRICE = 1000;
export const ENERGY_CELL_BANKING_BOUNDARY = 'HANGAR_RETURN';
export const HANGAR_REPAIR_MODE = 'AUTOMATIC';
export const FRIENDLY_FIRE_ENABLED = false;
export const PORTAL_EQUIPMENT_RECALL_ENABLED = true;
export const PORTAL_TRAVEL_ANYWAY_ABANDONS_EQUIPMENT = true;
export const PENDING_CELLS_BANK_AT = 'HANGAR_RETURN';
export const PENDING_CELLS_LOST_ON_PLAYER_DEATH = true;
export const PENDING_CELLS_PERSIST_ACROSS_WORLD_PORTAL = true;
export const HANGAR_REPAIR_FREE = true;
export const HANGAR_REPAIR_DELAY = 0;
export const ATTACHMENT_DESTRUCTION_MODE = 'WITH_HOST_ONLY';
export const WEAPON_AMMO_MODE = 'UNLIMITED';
export const COMPANION_RECOVERY_INCLUDES_INTACT_SETUP = true;
export const DEATH_SALVAGE_BANKS_IMMEDIATELY = true;
export const HANGAR_CHARACTER_HEAL_MODE = 'FULL_AUTOMATIC';
export const HANGAR_CHARACTER_HEAL_FREE = true;
export const PLAYER_DOWNED_STATE_ENABLED = false;
export const BASELINE_RECOVERY_BIKE_PERMANENT = true;
export const PORTAL_REVIEW_UI = 'UNIFIED_PARTY_EQUIPMENT_SECTIONS';
export const SESSION_RESUME_MODE = 'RETURN_TO_HANGAR';
export const SESSION_INTERRUPTION_LOSES_PENDING_CELLS = true;
export const PLAYER_DEATH_DESTINATION = 'HANGAR';
export const DEAD_ALLY_INTACT_SETUP_RECOVERY = 'AUTO_HANGAR';
export const SESSION_INTERRUPTION_RECOVERS_INTACT_SETUP = true;
export const PLAYER_DEATH_LOSS_MODE = 'DESTROYED_ONLY';
export const PLAYER_DEATH_AUTO_RECOVERS_SURVIVING_COMPANIONS = true;

export function boostedTopSpeed(baseTopSpeed,{globalUpgrade=false}={}){
  if(!Number.isFinite(baseTopSpeed)||baseTopSpeed<0)throw new Error('INVALID_BASE_TOP_SPEED');
  const permanent=globalUpgrade?GLOBAL_SPEED_UPGRADE_TOP_SPEED_PERCENT:0;
  return baseTopSpeed*(1+permanent+BOOST_TOP_SPEED_PERCENT);
}

export function boostedAcceleration(baseAcceleration,{globalUpgrade=false}={}){
  if(!Number.isFinite(baseAcceleration)||baseAcceleration<0)throw new Error('INVALID_BASE_ACCELERATION');
  const permanent=globalUpgrade?GLOBAL_SPEED_UPGRADE_ACCELERATION_PERCENT:0;
  return baseAcceleration*(1+permanent+BOOST_ACCELERATION_PERCENT);
}

export function globalSpeedUpgradePurchase({secondGemUnlocked,cells}){
  if(!secondGemUnlocked)return {allowed:false,reason:'SECOND_GEM_REQUIRED'};
  if(cells<GLOBAL_SPEED_UPGRADE_PRICE)return {allowed:false,reason:'INSUFFICIENT_CELLS'};
  return {allowed:true,cost:GLOBAL_SPEED_UPGRADE_PRICE};
}

export function validateShipComposition(types){
  if(!Array.isArray(types)||types.length===0)return {valid:false,reason:'FRONT_REQUIRED'};
  if(types[0]!=='front')return {valid:false,reason:'FRONT_REQUIRED'};
  if(types.filter(x=>x==='front').length!==1)return {valid:false,reason:'ONE_FRONT_ONLY'};
  const finals=types.filter(x=>x==='final').length;
  if(finals>1)return {valid:false,reason:'ONE_FINAL_MAX'};
  if(finals===1&&types.at(-1)!=='final')return {valid:false,reason:'FINAL_MUST_BE_LAST'};
  const body=types.slice(1,finals? -1:undefined);
  if(body.some(x=>x!=='middle'))return {valid:false,reason:'MIDDLE_ONLY_BETWEEN_FRONT_FINAL'};
  return {valid:true,reason:null};
}

export function shipMovementClass(types){
  const v=validateShipComposition(types);
  if(!v.valid)throw new Error(v.reason);
  const middleCount=types.filter(x=>x==='middle').length;
  const hasFinal=types.at(-1)==='final';
  if(middleCount===0&&hasFinal)return 'SHIP_FRONT_FINAL';
  if(middleCount===0)return 'SHIP_FRONT';
  return hasFinal?'SHIP_HEAVY_FINAL':'SHIP_HEAVY';
}

export const BASE_MOVEMENT_ORDER=Object.freeze([
  'SHIP_FRONT_FINAL',
  'BIKE',
  'SHIP_FRONT',
  'SHIP_HEAVY_FINAL',
  'SHIP_HEAVY',
  'ASTRONAUT'
]);

export function compareBaseMovement(a,b){
  const ia=BASE_MOVEMENT_ORDER.indexOf(a),ib=BASE_MOVEMENT_ORDER.indexOf(b);
  if(ia<0||ib<0)throw new Error('UNKNOWN_MOVEMENT_CLASS');
  return Math.sign(ib-ia); // +1 means a is faster/higher-ranked.
}

export function boostContract(actorKind){
  const allowed=new Set(['astronaut','bike','ship']);
  if(!allowed.has(actorKind))return {available:false};
  return {available:true,holdIndefinitely:true,heat:false,cooldown:false,fuel:false,energyCellDrain:false};
}

export function assertUniquePhysicalAssignments(assignments){
  const ids=assignments.filter(Boolean).map(x=>x.itemId);
  return new Set(ids).size===ids.length;
}

export function resolvePlayerDeath({items,companions,destroyedItemIds=[]}){
  const destroyed=new Set(destroyedItemIds);
  const recovered=[],lost=[];
  for(const item of items||[]){
    (destroyed.has(item.itemId)?lost:recovered).push(item);
  }
  const recoveredCompanions=(companions||[])
    .filter(c=>['alive','downed'].includes(c.state))
    .map(c=>c.id);
  const lostValue=lost.reduce((sum,item)=>sum+(Number(item.value)||0),0);
  return {recovered,lost,recoveredCompanions,lostValue,salvageCells:lostValue*.5};
}

export function resolveDestroyedVehicle({kind,pilotSurvives,attachedItems=[],recoveryRouteAvailable}){
  if(!['bike','playerShip','allyShip'].includes(kind))throw new Error('UNKNOWN_VEHICLE_KIND');
  if(!pilotSurvives)return {attachedItemsLost:attachedItems,continuation:'DEATH_RESOLUTION'};
  return {
    attachedItemsLost:attachedItems,
    continuation:recoveryRouteAvailable?'EVA_MANUAL_RECOVERY':'SORTIE_LOST'
  };
}

export function portalPartyCheck(companions){
  const unresolved=(companions||[]).filter(c=>['downed','unresolved'].includes(c.state));
  return unresolved.length
    ? {required:true,choices:['RESCUE_FIRST','TRAVEL_ANYWAY'],unresolvedIds:unresolved.map(c=>c.id)}
    : {required:false,choices:['TRAVEL'],unresolvedIds:[]};
}

export function portalHandoff({enteredAs,destinationLoaded,choice='TRAVEL'}){
  if(choice==='RESCUE_FIRST')return {travel:false,releaseSource:false,restoreActor:enteredAs};
  if(!destinationLoaded)return {travel:false,releaseSource:false,restoreActor:enteredAs};
  return {travel:true,releaseSource:true,restoreActor:enteredAs};
}

export function boostedBikePurchase({mothershipRevealed,geometryValidated,cells}){
  if(!mothershipRevealed)return {allowed:false,reason:'WORLD3_REVEAL_REQUIRED'};
  if(!geometryValidated)return {allowed:false,reason:'GEOMETRY_VALIDATION_REQUIRED'};
  if(cells<BOOSTED_BIKE_PRICE)return {allowed:false,reason:'INSUFFICIENT_CELLS'};
  return {allowed:true,cost:BOOSTED_BIKE_PRICE};
}


export function resolvePendingCells({bankedCells,pendingCells,event}){
  if(!Number.isFinite(bankedCells)||bankedCells<0)throw new Error('INVALID_BANKED_CELLS');
  if(!Number.isFinite(pendingCells)||pendingCells<0)throw new Error('INVALID_PENDING_CELLS');
  if(event==='PLAYER_DEATH')return {bankedCells,pendingCells:0,lostPendingCells:pendingCells};
  if(event==='WORLD_PORTAL')return {bankedCells,pendingCells,lostPendingCells:0};
  if(event==='HANGAR_RETURN')return {bankedCells:bankedCells+pendingCells,pendingCells:0,lostPendingCells:0};
  throw new Error('UNKNOWN_PENDING_CELLS_EVENT');
}

export function portalEquipmentDecision({leftBehindIntactItemIds=[],choice}){
  const ids=[...leftBehindIntactItemIds];
  if(ids.length===0)return {travelAllowed:true,recallIds:[],lostIds:[],waitForArrival:false};
  if(choice==='RECALL')return {travelAllowed:false,recallIds:ids,lostIds:[],waitForArrival:true};
  if(choice==='TRAVEL_ANYWAY')return {travelAllowed:true,recallIds:[],lostIds:ids,waitForArrival:false};
  if(choice==='RECOVER_MANUALLY')return {travelAllowed:false,recallIds:[],lostIds:[],waitForArrival:false};
  return {travelAllowed:false,recallIds:[],lostIds:[],waitForArrival:false};
}


export function resolveCompanionBaseRecovery({companionState,vehicleState,itemIds=[]}){
  if(!['alive','downed'].includes(companionState))return {recoverCompanion:false,recoveredItemIds:[],lostItemIds:itemIds};
  if(vehicleState==='destroyed')return {recoverCompanion:true,recoveredItemIds:[],lostItemIds:itemIds};
  return {recoverCompanion:true,recoveredItemIds:[...itemIds],lostItemIds:[]};
}

export function resolveDeathEconomy({bankedCells,pendingCells,lostSetupValue}){
  if(!Number.isFinite(bankedCells)||bankedCells<0)throw new Error('INVALID_BANKED_CELLS');
  if(!Number.isFinite(pendingCells)||pendingCells<0)throw new Error('INVALID_PENDING_CELLS');
  if(!Number.isFinite(lostSetupValue)||lostSetupValue<0)throw new Error('INVALID_LOST_SETUP_VALUE');
  const salvageCells=lostSetupValue*0.5;
  return {
    bankedCells:bankedCells+salvageCells,
    pendingCells:0,
    lostPendingCells:pendingCells,
    salvageCells
  };
}


export function resolveSessionInterruption({bankedCells,pendingCells,intactItemIds=[],destroyedItemIds=[]}){
  if(!Number.isFinite(bankedCells)||bankedCells<0)throw new Error('INVALID_BANKED_CELLS');
  if(!Number.isFinite(pendingCells)||pendingCells<0)throw new Error('INVALID_PENDING_CELLS');
  return {
    destination:'HANGAR',
    bankedCells,
    pendingCells:0,
    lostPendingCells:pendingCells,
    recoveredItemIds:[...intactItemIds],
    lostItemIds:[...destroyedItemIds],
    resumeWorld:false
  };
}

export function resolveDeadAllySetup({itemIds=[],destroyedItemIds=[]}){
  const destroyed=new Set(destroyedItemIds);
  const recovered=itemIds.filter(id=>!destroyed.has(id));
  const lost=itemIds.filter(id=>destroyed.has(id));
  return {allyRevivalRequired:true,recoveredItemIds:recovered,lostItemIds:lost};
}
