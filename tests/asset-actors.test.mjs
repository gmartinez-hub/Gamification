import test from 'node:test';import assert from 'node:assert/strict';
import { Group, Vector3 } from '../vendor/three.module.js';
import { createAssetShip } from '../src/lowpoly/asset-actors.js';
const fixture=()=>createAssetShip(Object.fromEntries(['capsula','habitat','propulsion'].map(name=>[name,{scene:new Group()}])));
test('new ship accumulates modules, finishes attachment, and resets without a drifting joint',()=>{
 const ship=fixture();ship.update(10);ship.setStage(3,true);ship.update(11);
 assert(ship.modules.every(m=>m.visible));const moving=ship.modules[2].position.clone();
 ship.update(14);const attached=ship.modules[2].position.clone();assert(moving.distanceTo(attached)>.01);
 ship.update(18);assert(ship.modules[2].position.equals(attached));
 ship.setStage(1,false);assert.deepEqual(ship.modules.map(m=>m.visible),[true,false,false]);
 ship.setStage(3,false);assert(ship.modules[2].position.equals(attached));
});
test('main exhaust stops in drift/reverse and RCS fires on the opposite side of applied force',()=>{
 const ship=fixture();ship.setStage(3,false);
 const main=ship.group.getObjectByName('main-ring-0-exhaust'),reverse=ship.group.getObjectByName('rcs-z-1-exhaust');
 ship.update(1,{thrust:new Vector3(0,0,-1)});assert.equal(main.userData.power,1);assert.equal(reverse.userData.power,0);
 ship.update(2,{thrust:new Vector3()});assert.equal(main.userData.power,0);
 ship.update(3,{thrust:new Vector3(0,0,1),braking:true});assert.equal(main.userData.power,0);assert.equal(reverse.userData.power,1);
 ship.group.rotation.y=Math.PI/2;ship.update(4,{thrust:new Vector3(-1,0,0)});assert(Math.abs(main.userData.power-1)<1e-6);
 ship.group.updateMatrixWorld(true);const v=ship.muzzle.getWorldPosition(new Vector3());assert(v.toArray().every(Number.isFinite));
});

test('ship loads future modules on demand without changing attachment planes or duplicating models',()=>{
 const ship=createAssetShip({capsula:{scene:new Group()}});
 assert(ship.hasStage(1));assert(!ship.hasStage(2));
 const habitat={scene:new Group()};ship.install({habitat});assert(ship.hasStage(2));assert(!ship.hasStage(3));
 assert.equal(ship.modules[1].visible,false);ship.setStage(2,false);assert.equal(ship.modules[1].visible,true);
 const children=ship.modules[1].children.length;ship.install({habitat});assert.equal(ship.modules[1].children.length,children);
 assert.equal(ship.modules[1].position.z,.575);assert.equal(habitat.scene.scale.x,2.5);
});

test('turbo expands main plasma, illuminates active stage-three nozzles, and drift extinguishes it',()=>{
 const ship=fixture();ship.setStage(3,false);
 ship.update(1,{thrust:new Vector3(0,0,-1)});
 const engine=ship.modules[2].children.find(o=>o.name.startsWith('plasma-engine-'));
 const core=engine.children.find(o=>o.isMesh),light=engine.children.find(o=>o.isPointLight);
 const normal=core.material.uniforms.length.value;assert(light.intensity>0);
 ship.update(2,{thrust:new Vector3(0,0,-1),boost:true});assert(core.material.uniforms.length.value>normal*1.5);
 assert(engine.getObjectByName('exhaust-plasma-motes'));
 ship.update(3,{thrust:new Vector3()});assert.equal(engine.visible,false);assert.equal(light.intensity,0);
});

test('ship renders compact and repeated-middle compositions from owned instance ids',()=>{
 const ship=fixture();ship.setStage(3,false);
 let roots=ship.setComposition(['front-1','final-1']);assert.equal(roots.length,2);assert.deepEqual(ship.group.userData.composition,['front-1','final-1']);
 roots=ship.setComposition(['front-1','middle-1','middle-2','final-1']);assert.equal(roots.length,4);assert.equal(ship.visual.children.filter(child=>child.name.startsWith('module-body-repeat')).length,1);
 assert.throws(()=>ship.setComposition(['front-1','final-1','middle-1']),/invalid/i);
});
