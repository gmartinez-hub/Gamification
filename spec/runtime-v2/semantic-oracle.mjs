/**
 * Gravedad Zero Runtime V2 executable semantic oracle.
 *
 * CONTRACT-ONLY. The clean runtime MUST NOT import this module at runtime.
 * It exists to make approved product invariants executable before implementation.
 */

export const BOOSTED_BIKE_PRICE = 1500;

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

export function resolvePlayerDeath({items,companions}){
  const recoveredCompanionItems=new Set();
  for(const companion of companions||[]){
    if(!['alive','downed'].includes(companion.state))continue;
    for(const id of companion.itemIds||[])recoveredCompanionItems.add(id);
  }
  const recovered=[],lost=[];
  for(const item of items||[]){
    (recoveredCompanionItems.has(item.itemId)?recovered:lost).push(item);
  }
  const lostValue=lost.reduce((sum,item)=>sum+(Number(item.value)||0),0);
  return {recovered,lost,lostValue,salvageCells:lostValue*.5};
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
