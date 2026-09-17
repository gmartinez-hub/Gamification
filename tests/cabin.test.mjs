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

let cameraFixture;
async function cameras(){
 if(!cameraFixture)cameraFixture=(async()=>{const {readFile}=await import('node:fs/promises'),{GLTFLoader}=await import('../vendor/GLTFLoader.js'),T=await import('../vendor/three.module.js'),{createWalkableCabin}=await import('../src/lowpoly/cabin.js');const loader=new GLTFLoader();loader.register(()=>({name:'CameraGeometryOnly',loadTexture:()=>Promise.resolve(null)}));const assets={};for(const name of['astronauta-armado','cabina-integrada']){const b=await readFile(new URL('../assets/runtime/models/'+name+'.glb',import.meta.url));assets[name]=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}return{T,make:()=>createWalkableCabin(assets)};})();return cameraFixture;
}
test('standing FP looks through the real window while seated FP keeps its approved framing',async()=>{
 const {T,make}=await cameras(),cabin=make(),c=create({aboard:true});
 for(const aspect of[1.6,390/844]){const seated=cabin.cameraPose(c.state,{firstPerson:true,aspect});assert.deepEqual(seated.position.toArray(),[0,1.38,1.08+(aspect<.85?.34:.06)]);assert.equal(seated.fov,aspect<.85?96:70);}
 c.stand();step(c,3);cabin.update(0,c.state,{firstPerson:true});cabin.group.updateMatrixWorld(true);
 const glass=cabin.dashboard.getObjectByName('Central_transparent_cockpit_glass'),center=new T.Box3().setFromObject(glass).getCenter(new T.Vector3());
 for(const aspect of[1.6,390/844]){const view=cabin.cameraPose(c.state,{firstPerson:true,aspect}),camera=new T.PerspectiveCamera(view.fov,aspect,view.near,100);assert.equal(view.position.x,c.state.position.x);assert.equal(view.position.y,1.69);camera.position.copy(cabin.group.localToWorld(view.position.clone()));camera.lookAt(cabin.group.localToWorld(view.target.clone()));camera.updateMatrixWorld(true);const ndc=center.clone().project(camera);assert(Math.abs(ndc.x)<.04&&Math.abs(ndc.y)<.04,`standing window must be centered: ${ndc.toArray()}`);const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(),camera);assert(ray.intersectObject(glass,true).length>0,'standing center ray must pass through glass');}
 cabin.dispose();
});
test('third-person camera remains continuous when the same pose changes cabin mode',async()=>{
 const {make}=await cameras(),cabin=make();
 for(const aspect of[1.6,390/844])for(const pose of[0,.25,.5,.75,1]){let previous;for(const mode of['entering','standing','sitting','piloting','rising','exiting']){const state={mode,pose,position:{x:.74*(1-pose),y:-.31*pose,z:1.26-.18*pose}},view=cabin.cameraPose(state,{firstPerson:false,aspect});if(previous){assert(previous.position.distanceTo(view.position)<1e-9,'mode switch must not teleport the camera');assert(previous.target.distanceTo(view.target)<1e-9);}previous=view;}}
 cabin.dispose();
});
test('portrait pilot camera frames the window from the station rather than displaying its outer silhouette',async()=>{
 const {T,make}=await cameras(),cabin=make(),c=create({aboard:true}),aspect=390/844;cabin.update(0,c.state);cabin.group.updateMatrixWorld(true);const view=cabin.cameraPose(c.state,{firstPerson:false,aspect}),camera=new T.PerspectiveCamera(view.fov,aspect,view.near,100);camera.position.copy(cabin.group.localToWorld(view.position.clone()));camera.lookAt(cabin.group.localToWorld(view.target.clone()));camera.updateMatrixWorld(true);const glass=cabin.dashboard.getObjectByName('Central_transparent_cockpit_glass'),bounds=new T.Box3().setFromObject(glass),left=new T.Vector3(bounds.min.x,(bounds.min.y+bounds.max.y)/2,bounds.min.z).project(camera),right=new T.Vector3(bounds.max.x,(bounds.min.y+bounds.max.y)/2,bounds.min.z).project(camera);assert(right.x-left.x>1.2,'window must occupy at least 60% of the portrait width');const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(0,.9),camera);assert(ray.intersectObject(cabin.dashboard,true).some(hit=>hit.object!==glass),'upper frame should end on existing cabin surfaces');cabin.dispose();
});

test('approach and seat blend keep the camera outside the pilot and the forward sightline clear',async()=>{
 const {T,make}=await cameras(),cabin=make(),c=create(),ray=new T.Raycaster(),body=cabin.rig.body[0];c.enter({autoSeat:true});
 for(let frame=0;frame<48;frame++){if(frame===24)c.stand();c.update(.1);cabin.update(0,c.state,{firstPerson:false,reducedMotion:true});cabin.group.updateMatrixWorld(true);body.skeleton.update();body.computeBoundingBox();const bounds=body.boundingBox.clone().applyMatrix4(body.matrixWorld);
  for(const aspect of[1.6,390/844]){const view=cabin.cameraPose(c.state,{firstPerson:false,aspect}),camera=new T.PerspectiveCamera(view.fov,aspect,view.near,100);camera.position.copy(cabin.group.localToWorld(view.position.clone()));camera.lookAt(cabin.group.localToWorld(view.target.clone()));camera.updateMatrixWorld(true);assert(bounds.distanceToPoint(camera.position)>.20,`camera must not pass through pilot: ${c.state.mode}/${c.state.pose}`);ray.setFromCamera(new T.Vector2(),camera);assert.equal(ray.intersectObject(body,false).length,0,`pilot must not cover the forward sightline: ${c.state.mode}/${c.state.pose}`);}
 }
 cabin.dispose();
});
