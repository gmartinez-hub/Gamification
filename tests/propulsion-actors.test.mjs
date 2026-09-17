import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Scene, Vector3, Quaternion } from '../vendor/three.module.js';
import { createAssetShip, createAssetCompanion } from '../src/lowpoly/asset-actors.js';
const fixture=()=>createAssetShip(Object.fromEntries(['capsula','habitat','propulsion'].map(name=>[name,{scene:new Group()}])));
test('eight real peripheral bells and stage-two nozzles obey occlusion',()=>{
 const ship=fixture();ship.setStage(2,false);ship.update(1,{thrust:1});
 const nozzles=[];ship.group.traverse(o=>{if(o.name.endsWith('-exhaust'))nozzles.push(o);});
 assert.equal(nozzles.filter(o=>o.name.startsWith('main-ring')).length,8);
 assert.equal(nozzles.filter(o=>o.name.startsWith('habitat-')&&o.userData.power>0).length,4);
 ship.setStage(3,false);ship.update(2,{thrust:1});
 assert(nozzles.filter(o=>o.name.startsWith('habitat-')).every(o=>o.userData.power===0));
 assert.equal(nozzles.filter(o=>o.name.startsWith('main-ring')&&o.userData.power>0).length,8);
});
test('physical acceleration normalizes throttle; braking uses acceleration, never velocity magnitude',()=>{
 const ship=fixture();ship.setStage(3,false);
 ship.update(1,{acceleration:new Vector3(0,0,-3),maxAcceleration:12,velocity:new Vector3(0,0,-80)});
 assert.equal(ship.group.getObjectByName('main-ring-0-exhaust').userData.power,.25);
 ship.update(2,{acceleration:new Vector3(0,0,6),maxAcceleration:12,braking:true});
 assert.equal(ship.group.getObjectByName('main-ring-0-exhaust').userData.power,0);
 assert.equal(ship.group.getObjectByName('rcs-z-1-exhaust').userData.power,.5);
});
test('emitted history survives turning and throttle cutoff in world coordinates; reset and dispose release it',()=>{
 const ship=fixture(),scene=new Scene();scene.add(ship.group);ship.setStage(3,false);
 ship.update(1,{thrust:1,dt:.05});const history=ship.exhaust.history;
 assert(history.activeCount>0);const before=history.positions.slice();
 ship.group.position.set(100,20,30);ship.group.rotation.y=1.5;
 ship.update(1,{thrust:0,dt:0});assert.deepEqual(history.positions,before);
 ship.update(1.05,{thrust:0,dt:.05});assert(history.activeCount>0);
 ship.reset();assert.equal(history.activeCount,0);ship.dispose();ship.dispose();assert.equal(history.points.parent,null);
});
test('visual inertia leaves navigation quaternion intact and is suppressed by reduced motion',()=>{
 const ship=fixture(),q=ship.group.quaternion.clone();
 ship.update(1,{thrust:new Vector3(1,.3,0),dt:.1});assert(ship.visual.rotation.z<0);assert(ship.group.quaternion.equals(q));
 ship.update(2,{thrust:new Vector3(1,.3,0),reducedMotion:true,dt:.1});assert.equal(ship.visual.rotation.z,0);
});
test('companion follows a supplied side slot with damped motion, propels and resets',()=>{
 const companion=createAssetCompanion({robot:{scene:new Group()}}),scene=new Scene();scene.add(companion.group);
 companion.update(1,{targetPosition:new Vector3(3,1,-1),targetQuaternion:new Quaternion(),dt:.05,state:'danger'});
 assert(companion.group.position.x>0&&companion.group.position.x<3);assert.equal(companion.group.userData.state,'danger');
 assert(companion.exhaust.history.activeCount>0);
 companion.reset();assert.equal(companion.exhaust.history.activeCount,0);companion.dispose();
});
test('companion keeps its formation beside a fast boosting bike',()=>{
 const companion=createAssetCompanion({robot:{scene:new Group()}}),target=new Vector3(1.8,1.6,0),velocity=new Vector3(0,0,-25);
 companion.group.position.copy(target);
 for(let frame=0;frame<1200;frame++){target.addScaledVector(velocity,1/60);companion.update(frame/60,{dt:1/60,targetPosition:target,targetVelocity:velocity});}
 assert(companion.group.position.distanceTo(target)<1.5,'Nóma must not be stranded at its old 3 m/s cap');companion.dispose();
});
test('reset extinguishes volumes and lights immediately and disposing twice releases owned ports once',()=>{
 const ship=fixture();ship.setStage(3,false);ship.update(1,{thrust:1,dt:.05});
 const engine=ship.modules[2].children.find(o=>o.name.startsWith('plasma-engine-'));assert(engine.visible);
 let disposed=0;ship.group.getObjectByName('main-ring-0-exhaust').geometry.addEventListener('dispose',()=>disposed++);
 ship.reset();assert.equal(engine.visible,false);assert.equal(engine.children.find(o=>o.isPointLight).intensity,0);
 ship.dispose();ship.dispose();assert.equal(disposed,1);
});
test('real astronaut backpack emitters follow the chest rig and respond separately to reverse/lateral force',async()=>{
 const {readFile}=await import('node:fs/promises');const {GLTFLoader}=await import('../vendor/GLTFLoader.js');const {createAssetAstronaut}=await import('../src/lowpoly/asset-actors.js');
 const bytes=await readFile(new URL('../assets/runtime/models/astronauta-armado.glb',import.meta.url));const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
 // Preserve the full source skeleton, geometry, animations; omit images for CPU-only tests.
 delete json.images;delete json.textures;delete json.materials;for(const mesh of json.meshes)for(const p of mesh.primitives)delete p.material;
 json.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+length).toString('base64');
 globalThis.ProgressEvent??=class ProgressEvent {constructor(type,data){this.type=type;Object.assign(this,data);}};
 const gltf=await new GLTFLoader().parseAsync(JSON.stringify(json),'');const actor=createAssetAstronaut({'astronauta-armado':gltf});
 const jets=actor.group.getObjectByName('backpack-propulsion');assert.equal(jets.parent.name,'chest');const local=jets.position.clone();
 actor.update(1,{thrust:new Vector3(0,0,1),braking:true,dt:.05});
 assert.equal(actor.group.getObjectByName('eva-left-exhaust').userData.power,0);assert.equal(actor.group.getObjectByName('eva-rcs-z-1-exhaust').userData.power,1);
 actor.update(2,{thrust:new Vector3(1,0,0),aiming:true,dt:.05});assert(jets.position.equals(local));assert.equal(actor.group.getObjectByName('eva-rcs-x-1-exhaust').userData.power,1);assert(actor.muzzle);actor.dispose();
});
test('companion underslung nozzles never pretend to generate a downward force',()=>{
 const companion=createAssetCompanion({robot:{scene:new Group()}});
 companion.update(1,{acceleration:new Vector3(0,-8,0),maxAcceleration:8,dt:.05});
 assert.equal(companion.group.getObjectByName('companion--1-exhaust').userData.power,0);
 companion.update(2,{acceleration:new Vector3(0,8,0),maxAcceleration:8,dt:.05});
 assert.equal(companion.group.getObjectByName('companion--1-exhaust').userData.power,1);companion.dispose();
});
test('scalar thrust stays actor-local after rotation while world acceleration is transformed',async()=>{
 const {localThrottle}=await import('../src/lowpoly/actor-motion.js');const group=new Group();group.rotation.y=Math.PI/2;
 assert.ok(localThrottle(group,{thrust:1}).distanceTo(new Vector3(0,0,-1))<1e-8);
 assert.ok(localThrottle(group,{acceleration:new Vector3(-12,0,0),maxAcceleration:12}).distanceTo(new Vector3(0,0,-1))<1e-8);
 const ship=fixture();ship.group.rotation.y=Math.PI/2;ship.update(1,{thrust:1});
 assert.equal(ship.group.getObjectByName('pod-0-exhaust').userData.power,1);assert.equal(ship.group.getObjectByName('rcs-x-1-exhaust').userData.power,0);ship.dispose();
});
