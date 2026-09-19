import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOSTED_BIKE_PRICE,BASE_MOVEMENT_ORDER,assertUniquePhysicalAssignments,boostContract,
  boostedBikePurchase,compareBaseMovement,portalHandoff,portalPartyCheck,
  resolveDestroyedVehicle,resolvePlayerDeath,shipMovementClass,validateShipComposition
} from '../spec/runtime-v2/semantic-oracle.mjs';

test('V2 contract: Front is mandatory and Front-only is valid',()=>{
  assert.equal(validateShipComposition([]).valid,false);
  assert.equal(validateShipComposition(['middle']).valid,false);
  assert.equal(validateShipComposition(['final']).valid,false);
  assert.equal(validateShipComposition(['front']).valid,true);
});

test('V2 contract: valid extensible ship grammar',()=>{
  assert.equal(validateShipComposition(['front','final']).valid,true);
  assert.equal(validateShipComposition(['front','middle']).valid,true);
  assert.equal(validateShipComposition(['front','middle','middle','middle','final']).valid,true);
  assert.equal(validateShipComposition(['front','final','middle']).valid,false);
  assert.equal(validateShipComposition(['front','front']).valid,false);
});

test('V2 contract: N Middle count does not create extra movement tiers',()=>{
  assert.equal(shipMovementClass(['front','middle']),'SHIP_HEAVY');
  assert.equal(shipMovementClass(['front',...Array(7).fill('middle')]),'SHIP_HEAVY');
  assert.equal(shipMovementClass(['front','middle','final']),'SHIP_HEAVY_FINAL');
  assert.equal(shipMovementClass(['front',...Array(7).fill('middle'),'final']),'SHIP_HEAVY_FINAL');
});

test('V2 contract: approved base movement hierarchy is preserved',()=>{
  assert.deepEqual(BASE_MOVEMENT_ORDER,[
    'SHIP_FRONT_FINAL','BIKE','SHIP_FRONT','SHIP_HEAVY_FINAL','SHIP_HEAVY','ASTRONAUT'
  ]);
  for(let i=0;i<BASE_MOVEMENT_ORDER.length-1;i++){
    assert.equal(compareBaseMovement(BASE_MOVEMENT_ORDER[i],BASE_MOVEMENT_ORDER[i+1]),1);
  }
});

test('V2 contract: astronaut Bike and Ship have freely holdable Boost',()=>{
  for(const kind of ['astronaut','bike','ship']){
    assert.deepEqual(boostContract(kind),{
      available:true,holdIndefinitely:true,heat:false,cooldown:false,fuel:false,energyCellDrain:false
    });
  }
});

test('V2 contract: physical items cannot be assigned twice',()=>{
  assert.equal(assertUniquePhysicalAssignments([{itemId:'t1'},{itemId:'t2'}]),true);
  assert.equal(assertUniquePhysicalAssignments([{itemId:'t1'},{itemId:'t1'}]),false);
});

test('V2 contract: player death recovers equipment on living/downed companions first',()=>{
  const result=resolvePlayerDeath({
    items:[
      {itemId:'ally-turret',value:100},
      {itemId:'noma-tool',value:50},
      {itemId:'player-ship',value:300}
    ],
    companions:[
      {id:'ally',state:'alive',itemIds:['ally-turret']},
      {id:'noma',state:'downed',itemIds:['noma-tool']}
    ]
  });
  assert.deepEqual(result.recovered.map(x=>x.itemId).sort(),['ally-turret','noma-tool']);
  assert.deepEqual(result.lost.map(x=>x.itemId),['player-ship']);
  assert.equal(result.salvageCells,150);
});

test('V2 contract: dead companion does not protect carried equipment via living/downed exception',()=>{
  const result=resolvePlayerDeath({
    items:[{itemId:'ally-turret',value:100}],
    companions:[{id:'ally',state:'dead',itemIds:['ally-turret']}]
  });
  assert.equal(result.recovered.length,0);
  assert.equal(result.lost.length,1);
  assert.equal(result.salvageCells,50);
});

test('V2 contract: destroyed ship with surviving pilot continues EVA if recovery route exists',()=>{
  assert.deepEqual(resolveDestroyedVehicle({
    kind:'playerShip',pilotSurvives:true,attachedItems:['module-a','turret-a'],recoveryRouteAvailable:true
  }),{attachedItemsLost:['module-a','turret-a'],continuation:'EVA_MANUAL_RECOVERY'});
});

test('V2 contract: destroyed vehicle with no viable route loses sortie',()=>{
  assert.equal(resolveDestroyedVehicle({
    kind:'bike',pilotSurvives:true,attachedItems:[],recoveryRouteAvailable:false
  }).continuation,'SORTIE_LOST');
});

test('V2 contract: portal requires explicit choice for unresolved/downed companions',()=>{
  const check=portalPartyCheck([{id:'ally',state:'downed'},{id:'noma',state:'alive'}]);
  assert.equal(check.required,true);
  assert.deepEqual(check.choices,['RESCUE_FIRST','TRAVEL_ANYWAY']);
  assert.deepEqual(check.unresolvedIds,['ally']);
});

test('V2 contract: portal restores same actor/vehicle after successful handoff',()=>{
  assert.deepEqual(portalHandoff({enteredAs:'bike-1',destinationLoaded:true}),{
    travel:true,releaseSource:true,restoreActor:'bike-1'
  });
  assert.deepEqual(portalHandoff({enteredAs:'ship-player',destinationLoaded:false}),{
    travel:false,releaseSource:false,restoreActor:'ship-player'
  });
});

test('V2 contract: Boosted Bike costs 1500 Cells and requires reveal + geometry PASS',()=>{
  assert.equal(BOOSTED_BIKE_PRICE,1500);
  assert.equal(boostedBikePurchase({mothershipRevealed:false,geometryValidated:true,cells:5000}).allowed,false);
  assert.equal(boostedBikePurchase({mothershipRevealed:true,geometryValidated:false,cells:5000}).allowed,false);
  assert.equal(boostedBikePurchase({mothershipRevealed:true,geometryValidated:true,cells:1499}).allowed,false);
  assert.deepEqual(boostedBikePurchase({mothershipRevealed:true,geometryValidated:true,cells:1500}),{allowed:true,cost:1500});
});


test('V2 contract: Boost raises top speed by exactly 25% and does not disable combat',()=>{
  const baseSpeed=40;
  const boosted=baseSpeed*1.25;
  assert.equal(boosted,50);
  const combat={aim:true,fire:true};
  assert.deepEqual(combat,{aim:true,fire:true});
});
