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
export const HANGAR_PERSISTENCE_BOUNDARY = 'EXIT_COMMIT';
export const HANGAR_CONFIRM_PERSISTS = false;
export const HANGAR_EXIT_COMMIT_ATOMIC = true;
export const HANGAR_PREEXIT_INTERRUPTION_MODE = 'DISCARD_UNCOMMITTED_RESTORE_LAST_PERSISTED';
export const SORTIE_LOADOUT_LOCKED = true;
export const BIKE_ONLY_SORTIE_VALID = true;
export const UNSELECTED_SHIP_WORLD_STATE = 'HANGAR_ONLY';
export const ALLY_SHIP_REQUIRED_FOR_DEPLOY = false;
export const REQUIRED_ASSET_FAILURE_MODE = 'ABORT_TO_HANGAR_PRESERVE_COMMIT';
export const SAVE_SLOT_MODE = 'SINGLE_LOCAL_AUTOSAVE';
export const NORMAL_WORLD_EXIT_MODE = 'PORTAL_ONLY';
export const FREE_MENU_RETURN_TO_HANGAR = false;
export const NATURAL_PORTAL_RECURS = true;
export const NATURAL_PORTAL_RECURRENCE_STATUS = 'BALANCE';
export const PORTABLE_PORTAL_PHYSICAL_ITEM = true;
export const PORTABLE_PORTAL_DESTINATIONS = Object.freeze(['HANGAR','UNLOCKED_WORLDS']);
export const PORTABLE_PORTAL_USES_PER_SORTIE = 1;
export const NATURAL_PORTAL_REMAINS_WITH_PORTABLE = true;
export const PORTABLE_PORTAL_UNLOCK_STATUS = 'CLOSED';
export const PORTABLE_PORTAL_UNLOCK_TRANSITS_REQUIRED = 2;
export const PORTABLE_PORTAL_ACQUISITION_MODE = 'PURCHASE_AFTER_UNLOCK';
export const PORTABLE_PORTAL_PRICE_STATUS = 'BALANCE';
export const PORTABLE_PORTAL_UNLOCK_COUNTER_SCOPE = 'GLOBAL_ACROSS_WORLDS';
export const PORTABLE_PORTAL_INVENTORY_HOST = 'PLAYER_ASTRONAUT';
export const PORTABLE_PORTAL_ACTIVATION_AUTHORITY = 'PLAYER_ONLY';
export const PORTABLE_PORTAL_DYNAMIC_APERTURE = true;
export const PORTABLE_PORTAL_SORTIE_RESET = 'HANGAR_OR_DEATH_OR_INTERRUPTION';
export const PORTABLE_PORTAL_RESETS_ON_WORLD_TRANSIT = false;
export const PORTABLE_PORTAL_USES_STANDARD_PARTY_EQUIPMENT_CHECK = true;
export const PORTABLE_PORTAL_SLOT_ACCOUNTING_STATUS = 'SEMANTIC_QUESTION';
export const NATURAL_PORTAL_PRIMARY_FINDER = 'NOMA';
export const NATURAL_PORTAL_PLAYER_DETECTION = true;
export const NATURAL_PORTAL_ALLY_FALLBACK_DETECTION = true;
export const NATURAL_PORTAL_COUNTDOWN_REQUIRED = true;
export const NATURAL_PORTAL_MAX_ACTIVE = 1;
export const PORTAL_CURRENT_WORLD_DESTINATION_ALLOWED = false;
export const FAILED_NATURAL_PORTAL_RETRY_AVAILABLE = true;
export const FAILED_PORTABLE_PORTAL_CONSUMES_USE = false;
export const PORTAL_RECALL_GUARANTEED = true;
export const NATURAL_PORTAL_WINDOWED = true;
export const NATURAL_PORTAL_RELOCATES_PROCEDURALLY = true;
export const PORTABLE_PORTAL_SLOT_TYPE = 'TURRET_SLOT';
export const PORTABLE_PORTAL_UNLOCK_SCOPE = 'GLOBAL_ONCE_ACQUIRED';
export const HANGAR_INTENTIONAL_EXIT_MODES = Object.freeze(['LAUNCH_WORLD','MAIN_MENU','EXIT_QUIT']);

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


export function hangarTransaction({confirmed,exiting}){
  if(!confirmed)return {persist:false,state:'DRAFT'};
  if(!exiting)return {persist:false,state:'CONFIRMED_UNCOMMITTED'};
  return {persist:true,state:'EXIT_COMMIT'};
}


export function resolveHangarPreExitInterruption({lastPersistedState,stagedState}){
  return {
    restoredState:lastPersistedState,
    discardedStagedState:stagedState,
    recoveredConfirmedSession:false
  };
}


export function hangarExitDecision({mode,commitSucceeded}){
  if(!HANGAR_INTENTIONAL_EXIT_MODES.includes(mode))return {leave:false,reason:'NOT_INTENTIONAL_EXIT'};
  if(!commitSucceeded)return {leave:false,reason:'COMMIT_FAILED'};
  return {leave:true,reason:null};
}


export function resolveLaunchAssetFailure({commitSucceeded,requiredAssetFailed}){
  if(!commitSucceeded)return {enterWorld:false,stayInHangar:true,preserveCommittedSetup:false,reason:'COMMIT_REQUIRED'};
  if(requiredAssetFailed)return {enterWorld:false,stayInHangar:true,preserveCommittedSetup:true,reason:'REQUIRED_ASSET_FAILED'};
  return {enterWorld:true,stayInHangar:false,preserveCommittedSetup:true,reason:null};
}

export function sortieRepresentation({playerShipSelected,allyShipSelected,allySelected,allyBikeSelected}){
  return {
    playerShipInWorld:!!playerShipSelected,
    playerShipState:playerShipSelected?'DEPLOYED':'HANGAR_ONLY',
    allyInWorld:!!allySelected,
    allyShipInWorld:!!allySelected&&!!allyShipSelected,
    allyBikeInWorld:!!allySelected&&!!allyBikeSelected
  };
}


export function portablePortalUnlock({successfulNaturalPortalTransits}){
  const count=Number(successfulNaturalPortalTransits)||0;
  return {
    unlockedForPurchase:count>=PORTABLE_PORTAL_UNLOCK_TRANSITS_REQUIRED,
    progress:Math.max(0,Math.min(count,PORTABLE_PORTAL_UNLOCK_TRANSITS_REQUIRED)),
    required:PORTABLE_PORTAL_UNLOCK_TRANSITS_REQUIRED
  };
}


export function portalAttemptResolution({portable=false,handoffSucceeded}){
  if(handoffSucceeded){
    return {
      returnToSource:false,
      retryAvailable:false,
      consumePortableUse:!!portable,
      successfulTransit:true
    };
  }
  return {
    returnToSource:true,
    retryAvailable:true,
    consumePortableUse:false,
    successfulTransit:false
  };
}

export function portalDestinationAllowed({currentWorldId,destinationWorldId,destinationType}){
  if(destinationType==='HANGAR')return true;
  if(destinationType!=='WORLD')return false;
  return destinationWorldId!==currentWorldId;
}
