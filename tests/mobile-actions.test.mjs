import test from 'node:test';
import assert from 'node:assert/strict';
import {getMobileAction} from '../src/lowpoly/mobile-actions.js';
const snapshot=(extra={})=>({phase:'scan',actor:'astronaut',actionDistance:10,targetDistance:Infinity,weaponRange:22,chance:.8,...extra});
test('beacon and gem interactions appear only within physical reach',()=>{
 assert.equal(getMobileAction(snapshot({actionDistance:3.8})).action,'interact');
 assert.equal(getMobileAction(snapshot({actionDistance:3.81})).action,'navigate');
 assert.equal(getMobileAction(snapshot({phase:'gem',actionDistance:3})).action,'interact');
 assert.equal(getMobileAction(snapshot({phase:'gem',actionDistance:3.01})).action,'navigate');
});
test('mission targets preserve EVA and ship roles, while exploration requires repositioning',()=>{
 assert.equal(getMobileAction(snapshot({phase:'small',actor:'ship',targetDistance:18})).action,'deploy');
 assert.equal(getMobileAction(snapshot({phase:'small',actor:'ship',targetDistance:35})).action,'navigate');
 assert.equal(getMobileAction(snapshot({phase:'small',targetDistance:18})).action,'fire');
 assert.equal(getMobileAction(snapshot({phase:'small',targetDistance:35})).action,'return');
 assert.equal(getMobileAction(snapshot({phase:'large',targetDistance:18})).action,'return');
 assert.equal(getMobileAction(snapshot({phase:'large',actor:'ship',targetDistance:30,weaponRange:48})).action,'fire');
});
test('optional targets are actionable with either weapon without requiring a mission phase',()=>{
 for(const actor of ['astronaut','ship'])for(const targetKind of ['hazard','breakable']){
  assert.equal(getMobileAction(snapshot({actor,targetKind,targetDistance:18})).action,'fire');
 }
 assert.equal(getMobileAction(snapshot({targetKind:'hazard',targetDistance:18,actionDistance:3})).action,'interact');
});
test('no manual corridor or remote automatic action is offered after collection',()=>{
 for(const actor of ['ship','astronaut'])assert.equal(getMobileAction(snapshot({phase:'return',actor})).disabled,true);
 for(const extra of [{sequence:true},{phase:'transit'},{assemblyLocked:true},{shotActive:true},{returning:true},{blocked:true}]){
  const action=getMobileAction(snapshot({phase:'small',targetDistance:18,...extra}));assert.equal(action.disabled,true);assert.equal(action.secondary,undefined);
 }
});
test('cabin context replaces flight prompts and retains seating when flight is held',()=>{
 assert.equal(getMobileAction(snapshot({cabinMode:'standing',canSit:true,blocked:true})).action,'cabin');
 assert.equal(getMobileAction(snapshot({cabinMode:'stabilizing',blocked:true})).disabled,true);
});
test('reload and cooldown cannot expose an invalid shot',()=>{
 assert.equal(getMobileAction(snapshot({phase:'small',targetDistance:18,cooldown:.3})).disabled,true);
 for(const targetDistance of [NaN,-1,Infinity])assert.notEqual(getMobileAction(snapshot({phase:'small',targetDistance})).action,'fire');
 assert.equal(getMobileAction(snapshot({phase:'complete'})).action,'restart');
 assert.equal(getMobileAction(snapshot({phase:'complete',blocked:true})).disabled,true);
});
test('free aiming leaves a separate fire button and nearby actions usable from bike',()=>{
  assert.equal(getMobileAction({phase:'scan',actor:'bike',freeAim:true,shipDiscovered:false}).label,'Encontrar la nave');
  assert.equal(getMobileAction({phase:'scan',actor:'bike',freeAim:true,actionDistance:10}).action,'deploy');
  assert.equal(getMobileAction({phase:'small',actor:'bike',freeAim:true,canBoardShip:true}).action,'return');
  assert.equal(getMobileAction({phase:'small',actor:'astronaut',freeAim:true,base:'bike'}).label,'Volver a la moto');
  assert.equal(getMobileAction({phase:'gem',actor:'astronaut',freeAim:true,actionDistance:2,base:'bike'}).action,'interact');
});
