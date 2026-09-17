import test from 'node:test';
import assert from 'node:assert/strict';
const path = '../src/lowpoly/cabin-controller.js';
let mod; try { mod = await import(path); } catch(error) { if(error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const create=options=>{assert.equal(typeof mod?.createCabinController,'function','walkable cabin controller is not implemented');return mod.createCabinController(options);};
function step(c,seconds,input={}){for(let t=0;t<seconds;t+=1/60)c.update(1/60,input);}
test('standing waits for stabilization before leaving the pilot seat',()=>{
 const c=create({aboard:true});assert.equal(c.state.mode,'piloting');assert(c.stand());
 step(c,2,{shipSpeed:4});assert.equal(c.state.mode,'stabilizing');assert(c.needsStabilization);assert(!c.canPilot);
 step(c,2,{shipSpeed:0,shipAngularSpeed:0});assert.equal(c.state.mode,'standing');assert.equal(c.state.position.y,0);assert(c.inside);
});
test('standing is a fixed short approach; movement does not create free roaming',()=>{
 const c=create({aboard:true});c.stand();step(c,3);assert.equal(c.state.mode,'standing');const position={...c.state.position};
 step(c,10,{x:1,z:-1});assert.deepEqual(c.state.position,position);assert(c.canSit);assert(c.sit());step(c,2);assert(c.canPilot);
});
test('boarding approaches and sits, while EVA exit first brakes and stands',()=>{
 const c=create();assert(c.enter({autoSeat:true}));step(c,3);assert.equal(c.state.mode,'piloting');
 assert(c.exit());step(c,2,{shipSpeed:3});assert.equal(c.state.mode,'stabilizing');assert(!c.consumeExit());
 step(c,3,{shipSpeed:0});assert.equal(c.state.mode,'eva');assert(c.consumeExit());assert(!c.consumeExit());
 c.enter();step(c,1);assert.equal(c.state.mode,'standing');assert(c.canSit);assert(c.exit());step(c,1);assert(c.consumeExit());
});
test('pause freezes transition and invalid timing/input cannot corrupt local pose',()=>{
 const c=create({aboard:true});c.stand();const before=JSON.stringify(c.state);c.update(8,{paused:true});assert.equal(JSON.stringify(c.state),before);
 for(const dt of [NaN,-1,Infinity])c.update(dt,{x:NaN,z:Infinity});assert(c.state.position.x===0);assert(c.state.position.z===mod.CABIN_LAYOUT.seat.z);
});
test('approved GLB pilot has two contact hands, boot contact, holstered weapon and both FP arms',async()=>{
 const {readFile}=await import('node:fs/promises');const {GLTFLoader}=await import('../vendor/GLTFLoader.js');const {Vector3,Box3,PerspectiveCamera,Raycaster,Vector2}=await import('../vendor/three.module.js');
 const {createWalkableCabin}=await import('../src/lowpoly/cabin.js');
 const loader=new GLTFLoader();loader.register(()=>({name:'GeometryOnlyTest',loadTexture:()=>Promise.resolve(null)}));
 const assets={};for(const name of['astronauta-armado','cabina-integrada']){const b=await readFile(new URL('../assets/runtime/models/'+name+'.glb',import.meta.url));assets[name]=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
 const {createAssetAstronaut}=await import('../src/lowpoly/asset-actors.js');const eva=createAssetAstronaut(assets);eva.update(1,{thrust:1,dt:.05});
 const cabin=createWalkableCabin(assets),c=create({aboard:true});assert(!cabin.pilot.getObjectByName('backpack-propulsion'),'pilot must not clone live EVA effects');cabin.update(0,c.state);cabin.group.updateMatrixWorld(true);
 const contacts=cabin.contacts();assert(contacts.L.error<.065,JSON.stringify(contacts));assert(contacts.R.error<.065,JSON.stringify(contacts));assert(contacts.L.palm[0]<0&&contacts.R.palm[0]>0,'anatomical left/right must match pilot FP sides');
 assert(cabin.rig.weapon.visible===false);assert(cabin.group.getObjectByName('cabin-weapon-holster').children.length>1);
 const body=cabin.rig.body[0];body.skeleton.update();body.computeBoundingBox();const box=body.boundingBox.clone().applyMatrix4(body.matrixWorld);assert(box.min.y>=CABIN_FLOOR()-0.035&&box.min.y<CABIN_FLOOR()+.06,'seated soles should contact floor: '+box.min.y);
 const wrap=cabin.group.getObjectByName('retained-cabin-ceiling-and-sides');assert(wrap,'retain original ceiling and upper sides');const fp=cabin.cameraPose(c.state,{firstPerson:true,aspect:1.6}),eye=new PerspectiveCamera(fp.fov,1.6,fp.near,100);eye.position.copy(cabin.group.localToWorld(fp.position.clone()));eye.lookAt(cabin.group.localToWorld(fp.target.clone()));eye.updateMatrixWorld(true);const ray=new Raycaster();ray.setFromCamera(new Vector2(0,.95),eye);assert(ray.intersectObject(wrap,true).length>0,'upper pilot view must meet roof, not empty space');ray.setFromCamera(new Vector2(0,0),eye);assert.equal(ray.intersectObject(wrap,true).length,0,'roof must leave the main outside view clear');
 const camera=cabin.cameraPose(c.state,{firstPerson:false,aspect:.5});assert(camera.position.toArray().every(Number.isFinite));
 cabin.update(0,c.state,{firstPerson:true});assert(cabin.rig.body.every(m=>!m.visible));assert(cabin.rig.arms.every(m=>m.visible));assert(cabin.rig.arms[0].geometry.index.count>1000);
 assert(cabin.rig.bones.handL&&cabin.rig.bones.handR);assert.notEqual(cabin.rig.body[0].skeleton.bones[0],assets['astronauta-armado'].scene.getObjectByName(cabin.rig.body[0].skeleton.bones[0].name));
 let boneDisposed=0;body.skeleton.computeBoneTexture();body.skeleton.boneTexture.addEventListener('dispose',()=>boneDisposed++);
 let sourceDisposed=0,ownDisposed=0;body.geometry.addEventListener('dispose',()=>sourceDisposed++);cabin.group.getObjectByName('seat-cushion').geometry.addEventListener('dispose',()=>ownDisposed++);cabin.dispose();cabin.dispose();assert.equal(sourceDisposed,0);assert.equal(ownDisposed,1);assert.equal(boneDisposed,1,'dispose the private pilot skeleton GPU texture');eva.dispose();
 function CABIN_FLOOR(){return mod.CABIN_LAYOUT.origin.y;}
});
