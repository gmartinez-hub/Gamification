import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from '../vendor/three.module.js';
import { createVehicles } from '../src/lowpoly/vehicles.js';
const advance=(v,n,dir,boost,options)=>{for(let i=0;i<n*60;i++)v.update(1/60,dir,boost,options);};
test('starts riding; fast boost retains inertial braking and hidden tether',()=>{
  const v=createVehicles();assert.equal(v.actor,'bike');assert.equal(v.shipDiscovered,false);assert.equal(v.tetherLength,0);
  advance(v,3,new Vector3(0,0,-1),true);assert.ok(v.velocity.length()>20);
  const speed=v.velocity.length();v.update(1/60,undefined,false,{brake:true});assert.ok(v.velocity.length()<speed&&v.velocity.length()>speed-.3);
});
test('dismount anchors cable at bike, and remount never teleports',()=>{
  const v=createVehicles();v.bikePosition.set(40,0,-100);assert.ok(v.deploy());assert.equal(v.base,'bike');
  const ship=v.shipPosition.clone();advance(v,8,new Vector3(1,0,0),true);assert.ok(v.tetherLength<=26.0001);assert.ok(v.tetherLength>20);assert.ok(v.shipPosition.equals(ship));
  assert.ok(v.returnToShip());advance(v,15);assert.equal(v.actor,'bike');assert.equal(v.tetherLength,0);
});
test('discover and board the ship with a physical EVA transfer',()=>{
  const v=createVehicles();v.bikePosition.copy(v.shipPosition).add(new Vector3(8,0,0));v.update(1/60);
  assert.equal(v.shipDiscovered,true);assert.ok(v.canBoardShip);assert.ok(v.returnToShip());assert.equal(v.actor,'astronaut');
  advance(v,20);assert.equal(v.actor,'ship');assert.equal(v.base,'ship');assert.equal(v.tetherLength,0);
  assert.ok(v.mountBike());assert.equal(v.actor,'bike');assert.ok(v.position.distanceTo(v.shipPosition)<15);
});
test('gem return brings remote bike back, then boards actual ship',()=>{
  const v=createVehicles();v.bikePosition.set(30,10,-70);v.deploy();v.astronautPosition.add(new Vector3(8,0,0));
  assert.ok(v.returnToShip({automatic:true}));let largest=0;
  for(let i=0;i<60*90&&v.actor!=='ship';i++){const prior=v.position.clone();v.update(1/60);if(v.actor!=='ship')largest=Math.max(largest,prior.distanceTo(v.position));}
  assert.equal(v.actor,'ship');assert.equal(v.returning,false);assert.ok(largest<3,'only the small dismount offset is allowed');
});
test('integrity is independent and recovery keeps discovery and stage',()=>{
  const v=createVehicles();v.setStage(3);v.damage(25);assert.equal(v.health.bike,75);assert.equal(v.health.ship,100);
  v.deploy();assert.equal(v.integrity,100);assert.ok(v.damage(100));v.recover();assert.equal(v.integrity,100);assert.equal(v.actor,'astronaut');
  v.reset({aboard:true});v.setStage(3);v.damage(100);v.recover();assert.equal(v.actor,'ship');assert.equal(v.shipDiscovered,true);assert.ok(v.mountBike());
});
test('boarding beside an overlapping hull resolves before caching the return path',()=>{
  for(const stage of [1,2,3]){
    const v=createVehicles();v.setStage(stage);v.bikePosition.copy(v.shipPosition).add(new Vector3(0,0,-4));v.update(1/60);
    assert.ok(v.returnToShip());advance(v,40);assert.equal(v.actor,'ship');assert.equal(v.returning,false);
  }
});
test('EVA recovery preserves its original base and the other vehicles integrity',()=>{
  const v=createVehicles();v.reset({aboard:true});v.setStage(3);v.health.ship=62;v.health.bike=73;
  v.deploy();v.damage(100);v.recover();assert.equal(v.actor,'astronaut');assert.equal(v.base,'ship');
  assert.equal(v.health.astronaut,100);assert.equal(v.health.ship,62);assert.equal(v.health.bike,73);
});
