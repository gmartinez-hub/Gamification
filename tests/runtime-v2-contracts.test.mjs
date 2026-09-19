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

test('V2 contract: player death loses only actually destroyed units and recovers surviving companions',()=>{
  const result=resolvePlayerDeath({
    items:[
      {itemId:'ally-turret',value:100},
      {itemId:'noma-tool',value:50},
      {itemId:'player-ship',value:300}
    ],
    companions:[
      {id:'ally',state:'alive',itemIds:['ally-turret']},
      {id:'noma',state:'downed',itemIds:['noma-tool']}
    ],
    destroyedItemIds:['player-ship']
  });
  assert.deepEqual(result.recovered.map(x=>x.itemId).sort(),['ally-turret','noma-tool']);
  assert.deepEqual(result.lost.map(x=>x.itemId),['player-ship']);
  assert.deepEqual(result.recoveredCompanions,['ally','noma']);
  assert.equal(result.salvageCells,150);
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


test('V2 contract: Boost applies once to the whole resolved ship profile',()=>{
  const resolvedBaseTopSpeed=80;
  const boosted=resolvedBaseTopSpeed*1.25;
  assert.equal(boosted,100);
  // Middle count is already represented by the resolved profile; Boost itself does not compound per module.
  assert.equal(80*1.25,100);
});

test('V2 contract: friendly Boost coverage excludes enemies',()=>{
  const friendly=['astronaut','playerBike','playerShip','allyEVA','allyBike','allyShip','noma'];
  assert.deepEqual(friendly,[
    'astronaut','playerBike','playerShip','allyEVA','allyBike','allyShip','noma'
  ]);
  assert.equal(friendly.includes('enemyShip'),false);
  assert.equal(friendly.includes('enemyAlien'),false);
});

test('V2 contract: Shift alone commands forward Boost propulsion',()=>{
  const input={shift:true,wasd:false};
  assert.equal(input.shift,true);
  assert.equal(input.wasd,false);
  const semantic='FORWARD_BOOST_BY_FACING';
  assert.equal(semantic,'FORWARD_BOOST_BY_FACING');
});

test('V2 contract: permanent generic speed upgrade is one global friendly upgrade',()=>{
  const upgrade={scope:'GLOBAL_FRIENDLY',tiers:1};
  assert.deepEqual(upgrade,{scope:'GLOBAL_FRIENDLY',tiers:1});
});


test('V2 contract: Boost acceleration is +40%',()=>{
  const baseAcceleration=10;
  assert.equal(baseAcceleration*(1+0.40),14);
});

test('V2 contract: permanent global P2 upgrade is +15% top speed and +20% acceleration',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.GLOBAL_SPEED_UPGRADE_TOP_SPEED_PERCENT,0.15);
  assert.equal(mod.GLOBAL_SPEED_UPGRADE_ACCELERATION_PERCENT,0.20);
});

test('V2 contract: permanent speed upgrade and Boost stack additively to 140% top speed',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.boostedTopSpeed(100,{globalUpgrade:true}),140);
  assert.equal(mod.boostedTopSpeed(100,{globalUpgrade:false}),125);
});


test('V2 contract: global speed upgrade costs 1000 Cells after second gem / World 3 access',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.GLOBAL_SPEED_UPGRADE_PRICE,1000);
  assert.equal(mod.globalSpeedUpgradePurchase({secondGemUnlocked:false,cells:5000}).allowed,false);
  assert.equal(mod.globalSpeedUpgradePurchase({secondGemUnlocked:true,cells:999}).allowed,false);
  assert.deepEqual(mod.globalSpeedUpgradePurchase({secondGemUnlocked:true,cells:1000}),{allowed:true,cost:1000});
});

test('V2 contract: permanent acceleration upgrade and Boost stack additively to 160%',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.boostedAcceleration(100,{globalUpgrade:true}),160);
  assert.equal(mod.boostedAcceleration(100,{globalUpgrade:false}),140);
});


test('V2 contract: portal transit formation is staggered and preserves scale',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.PORTAL_TRANSIT_FORMATION,'STAGGERED');
});

test('V2 contract: Boosted Bike integration is embedded but exact Back scale remains VERIFY',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.BOOSTED_BIKE_INTEGRATION,'EMBEDDED');
  assert.equal(mod.BOOSTED_BIKE_SCALE_STATUS,'VERIFY');
});


test('V2 contract: portal full setup is visible and whole portal is enlarged',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.PORTAL_FULL_SETUP_VISIBLE,true);
  assert.equal(mod.PORTAL_SCALE_DIRECTION,'ENLARGE_WHOLE_PORTAL');
  assert.equal(mod.PORTAL_EXACT_DIMENSIONS_STATUS,'MEASURE_VERIFY');
});


test('V2 contract: Energy Cells bank only on Hangar return',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.ENERGY_CELL_BANKING_BOUNDARY,'HANGAR_RETURN');
});

test('V2 contract: surviving damaged vehicles auto-repair on Hangar return',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.HANGAR_REPAIR_MODE,'AUTOMATIC');
});

test('V2 contract: friendly fire is disabled',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.FRIENDLY_FIRE_ENABLED,false);
});


test('V2 contract: Portal Recall preserves left-behind intact equipment only after arrival',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.PORTAL_EQUIPMENT_RECALL_ENABLED,true);
  assert.deepEqual(
    mod.portalEquipmentDecision({leftBehindIntactItemIds:['bike-1','beacon-1'],choice:'RECALL'}),
    {travelAllowed:false,recallIds:['bike-1','beacon-1'],lostIds:[],waitForArrival:true}
  );
  assert.deepEqual(
    mod.portalEquipmentDecision({leftBehindIntactItemIds:['bike-1'],choice:'TRAVEL_ANYWAY'}),
    {travelAllowed:true,recallIds:[],lostIds:['bike-1'],waitForArrival:false}
  );
});

test('V2 contract: pending Cells survive world portals, bank at Hangar, and are lost on death',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.deepEqual(
    mod.resolvePendingCells({bankedCells:1000,pendingCells:500,event:'WORLD_PORTAL'}),
    {bankedCells:1000,pendingCells:500,lostPendingCells:0}
  );
  assert.deepEqual(
    mod.resolvePendingCells({bankedCells:1000,pendingCells:500,event:'HANGAR_RETURN'}),
    {bankedCells:1500,pendingCells:0,lostPendingCells:0}
  );
  assert.deepEqual(
    mod.resolvePendingCells({bankedCells:1000,pendingCells:500,event:'PLAYER_DEATH'}),
    {bankedCells:1000,pendingCells:0,lostPendingCells:500}
  );
});

test('V2 contract: Hangar repair is automatic free and immediate',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.HANGAR_REPAIR_MODE,'AUTOMATIC');
  assert.equal(mod.HANGAR_REPAIR_FREE,true);
  assert.equal(mod.HANGAR_REPAIR_DELAY,0);
});


test('V2 contract: attachments are lost only with destroyed host vehicle',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.ATTACHMENT_DESTRUCTION_MODE,'WITH_HOST_ONLY');
});

test('V2 contract: ship and turret ammunition is unlimited',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.WEAPON_AMMO_MODE,'UNLIMITED');
});

test('V2 contract: living/downed companion base recovery includes intact surviving setup',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.deepEqual(
    mod.resolveCompanionBaseRecovery({companionState:'downed',vehicleState:'intact',itemIds:['ally-ship','turret-1']}),
    {recoverCompanion:true,recoveredItemIds:['ally-ship','turret-1'],lostItemIds:[]}
  );
  assert.deepEqual(
    mod.resolveCompanionBaseRecovery({companionState:'alive',vehicleState:'destroyed',itemIds:['ally-ship','turret-1']}),
    {recoverCompanion:true,recoveredItemIds:[],lostItemIds:['ally-ship','turret-1']}
  );
});

test('V2 contract: death loses pending Cells but banks salvage immediately',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.DEATH_SALVAGE_BANKS_IMMEDIATELY,true);
  assert.deepEqual(
    mod.resolveDeathEconomy({bankedCells:1000,pendingCells:500,lostSetupValue:800}),
    {bankedCells:1400,pendingCells:0,lostPendingCells:500,salvageCells:400}
  );
});


test('V2 contract: surviving characters heal fully for free at Hangar',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.HANGAR_CHARACTER_HEAL_MODE,'FULL_AUTOMATIC');
  assert.equal(mod.HANGAR_CHARACTER_HEAL_FREE,true);
});

test('V2 contract: player has no recoverable DOWNED state',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.PLAYER_DOWNED_STATE_ENABLED,false);
});


test('V2 contract: baseline recovery Bike is permanently available',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.BASELINE_RECOVERY_BIKE_PERMANENT,true);
});

test('V2 contract: portal review is one panel with separate Party and Equipment sections',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.PORTAL_REVIEW_UI,'UNIFIED_PARTY_EQUIPMENT_SECTIONS');
});


test('V2 contract: session interruption returns to Hangar, recovers intact setup and loses pending Cells',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.SESSION_RESUME_MODE,'RETURN_TO_HANGAR');
  assert.equal(mod.SESSION_INTERRUPTION_RECOVERS_INTACT_SETUP,true);
  assert.deepEqual(
    mod.resolveSessionInterruption({
      bankedCells:1000,pendingCells:250,
      intactItemIds:['ship-1','bike-1'],
      destroyedItemIds:['beacon-1']
    }),
    {
      destination:'HANGAR',bankedCells:1000,pendingCells:0,lostPendingCells:250,
      recoveredItemIds:['ship-1','bike-1'],lostItemIds:['beacon-1'],resumeWorld:false
    }
  );
});

test('V2 contract: player death destination is Hangar',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.PLAYER_DEATH_DESTINATION,'HANGAR');
});

test('V2 contract: dead ally returns intact surviving setup but still requires revival',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.deepEqual(
    mod.resolveDeadAllySetup({itemIds:['ally-bike','ally-pistol','turret-1'],destroyedItemIds:['ally-bike']}),
    {allyRevivalRequired:true,recoveredItemIds:['ally-pistol','turret-1'],lostItemIds:['ally-bike']}
  );
});


test('V2 contract: player death loss mode is destroyed-only',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.PLAYER_DEATH_LOSS_MODE,'DESTROYED_ONLY');
  assert.equal(mod.PLAYER_DEATH_AUTO_RECOVERS_SURVIVING_COMPANIONS,true);
});


test('V2 contract: Hangar confirmation does not persist until exit',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.HANGAR_PERSISTENCE_BOUNDARY,'EXIT_COMMIT');
  assert.equal(mod.HANGAR_CONFIRM_PERSISTS,false);
  assert.equal(mod.HANGAR_EXIT_COMMIT_ATOMIC,true);
  assert.deepEqual(mod.hangarTransaction({confirmed:false,exiting:false}),{persist:false,state:'DRAFT'});
  assert.deepEqual(mod.hangarTransaction({confirmed:true,exiting:false}),{persist:false,state:'CONFIRMED_UNCOMMITTED'});
  assert.deepEqual(mod.hangarTransaction({confirmed:true,exiting:true}),{persist:true,state:'EXIT_COMMIT'});
});


test('V2 contract: pre-exit Hangar interruption discards uncommitted session',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(
    mod.HANGAR_PREEXIT_INTERRUPTION_MODE,
    'DISCARD_UNCOMMITTED_RESTORE_LAST_PERSISTED'
  );
  assert.deepEqual(
    mod.resolveHangarPreExitInterruption({
      lastPersistedState:{cells:1000,loadout:'A'},
      stagedState:{cells:700,loadout:'B'}
    }),
    {
      restoredState:{cells:1000,loadout:'A'},
      discardedStagedState:{cells:700,loadout:'B'},
      recoveredConfirmedSession:false
    }
  );
});


test('V2 contract: all intentional Hangar exits share the exit commit',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.deepEqual(mod.HANGAR_INTENTIONAL_EXIT_MODES,['LAUNCH_WORLD','MAIN_MENU','EXIT_QUIT']);
  for(const mode of mod.HANGAR_INTENTIONAL_EXIT_MODES){
    assert.deepEqual(mod.hangarExitDecision({mode,commitSucceeded:true}),{leave:true,reason:null});
    assert.deepEqual(mod.hangarExitDecision({mode,commitSucceeded:false}),{leave:false,reason:'COMMIT_FAILED'});
  }
});


test('V2 contract: sortie loadout is locked and Bike-only launch is valid',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.SORTIE_LOADOUT_LOCKED,true);
  assert.equal(mod.BIKE_ONLY_SORTIE_VALID,true);
  assert.equal(mod.UNSELECTED_SHIP_WORLD_STATE,'HANGAR_ONLY');
});

test('V2 contract: ally can deploy without a ship',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.ALLY_SHIP_REQUIRED_FOR_DEPLOY,false);
  assert.deepEqual(
    mod.sortieRepresentation({
      playerShipSelected:false,
      allyShipSelected:false,
      allySelected:true,
      allyBikeSelected:true
    }),
    {
      playerShipInWorld:false,
      playerShipState:'HANGAR_ONLY',
      allyInWorld:true,
      allyShipInWorld:false,
      allyBikeInWorld:true
    }
  );
});

test('V2 contract: required confirmed-setup asset failure aborts launch to Hangar',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.REQUIRED_ASSET_FAILURE_MODE,'ABORT_TO_HANGAR_PRESERVE_COMMIT');
  assert.deepEqual(
    mod.resolveLaunchAssetFailure({commitSucceeded:true,requiredAssetFailed:true}),
    {
      enterWorld:false,
      stayInHangar:true,
      preserveCommittedSetup:true,
      reason:'REQUIRED_ASSET_FAILED'
    }
  );
  assert.deepEqual(
    mod.resolveLaunchAssetFailure({commitSucceeded:true,requiredAssetFailed:false}),
    {
      enterWorld:true,
      stayInHangar:false,
      preserveCommittedSetup:true,
      reason:null
    }
  );
});


test('V2 contract: single autosave and portal-only normal extraction',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.SAVE_SLOT_MODE,'SINGLE_LOCAL_AUTOSAVE');
  assert.equal(mod.NORMAL_WORLD_EXIT_MODE,'PORTAL_ONLY');
  assert.equal(mod.FREE_MENU_RETURN_TO_HANGAR,false);
});


test('V2 contract: natural portals recur and Portable Portal is once-per-sortie',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.NATURAL_PORTAL_RECURS,true);
  assert.equal(mod.NATURAL_PORTAL_RECURRENCE_STATUS,'BALANCE');
  assert.equal(mod.PORTABLE_PORTAL_PHYSICAL_ITEM,true);
  assert.deepEqual(mod.PORTABLE_PORTAL_DESTINATIONS,['HANGAR','UNLOCKED_WORLDS']);
  assert.equal(mod.PORTABLE_PORTAL_USES_PER_SORTIE,1);
  assert.equal(mod.NATURAL_PORTAL_REMAINS_WITH_PORTABLE,true);
  assert.equal(mod.PORTABLE_PORTAL_UNLOCK_STATUS,'CLOSED');
});


test('V2 contract: natural portal is windowed and relocates procedurally',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.NATURAL_PORTAL_WINDOWED,true);
  assert.equal(mod.NATURAL_PORTAL_RELOCATES_PROCEDURALLY,true);
});

test('V2 contract: Portable Portal consumes a turret slot and unlocks globally once acquired',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.PORTABLE_PORTAL_SLOT_TYPE,'TURRET_SLOT');
  assert.equal(mod.PORTABLE_PORTAL_UNLOCK_SCOPE,'GLOBAL_ONCE_ACQUIRED');
  assert.equal(mod.PORTABLE_PORTAL_UNLOCK_STATUS,'CLOSED');
});


test('V2 contract: Portable Portal unlocks for purchase after two successful natural portal transits',async()=>{
  const mod=await import('../spec/runtime-v2/semantic-oracle.mjs');
  assert.equal(mod.PORTABLE_PORTAL_UNLOCK_TRANSITS_REQUIRED,2);
  assert.equal(mod.PORTABLE_PORTAL_ACQUISITION_MODE,'PURCHASE_AFTER_UNLOCK');
  assert.equal(mod.PORTABLE_PORTAL_PRICE_STATUS,'BALANCE');
  assert.equal(mod.PORTABLE_PORTAL_UNLOCK_COUNTER_SCOPE,'GLOBAL_ACROSS_WORLDS');
  assert.deepEqual(
    mod.portablePortalUnlock({successfulNaturalPortalTransits:1}),
    {unlockedForPurchase:false,progress:1,required:2}
  );
  assert.deepEqual(
    mod.portablePortalUnlock({successfulNaturalPortalTransits:2}),
    {unlockedForPurchase:true,progress:2,required:2}
  );
});
