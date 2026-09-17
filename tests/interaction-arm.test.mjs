import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {Vector3,Quaternion} from '../vendor/three.module.js';
let api;try{api=await import('../src/lowpoly/interaction-arm.js');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
test('left interaction arm uses the real rig, reaches ahead of the camera and owns only its derived resources',async()=>{
 assert.equal(typeof api?.createInteractionArm,'function','interaction arm missing');
 const loader=new GLTFLoader();loader.register(()=>({name:'GeometryOnlyArmTest',loadTexture:()=>Promise.resolve(null)}));
 const b=await readFile(new URL('../assets/runtime/models/astronauta-armado.glb',import.meta.url)),gltf=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const sourceBody=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)sourceBody.push(o);});const sourceSkeleton=sourceBody[0].skeleton;
 const arm=api.createInteractionArm({'astronauta-armado':gltf});assert.equal(arm.group.visible,false);arm.update(1,{interacting:true,reducedMotion:true});assert(arm.group.visible);arm.group.updateMatrixWorld(true);
 const palm=arm.palm.getWorldPosition(new Vector3());assert(palm.z<-.1,'palm must be ahead of FP camera: '+palm.toArray());assert(palm.x<0,'left hand remains left of the view center');assert(Math.abs(palm.y)<-palm.z*Math.tan(Math.PI/5)*.8,'hand must stay inside the actual FP frustum: '+palm.toArray());
 const meshes=[];arm.group.traverse(o=>{if(o.isMesh&&o.visible)meshes.push(o);});assert(meshes.length>0);assert(meshes.every(m=>m.isSkinnedMesh));assert(meshes.every(m=>m.geometry.index.count>1000&&m.geometry.index.count<sourceBody[0].geometry.index.count));assert.notEqual(meshes[0].skeleton,sourceSkeleton);assert.equal(meshes[0].material,sourceBody[0].material);
 const handBone=arm.group.getObjectByName('handL'),handOrigin=handBone.getWorldPosition(new Vector3()),indexBase=arm.group.getObjectByName('index01L').getWorldPosition(new Vector3()),littleBase=arm.group.getObjectByName('little01L').getWorldPosition(new Vector3()),middleBase=arm.group.getObjectByName('middle01L').getWorldPosition(new Vector3());
 const anatomicalNormal=middleBase.clone().sub(handOrigin).cross(indexBase.clone().sub(littleBase)).normalize();assert(anatomicalNormal.dot(new Vector3(0,1,0))>.995,'actual knuckle plane must have left palmar normal upward');assert(indexBase.x<littleBase.x,'left palm-up thumb/index side must point outward left');assert(arm.palm.userData.anatomy.surfaceSamples>5,'contact must be calibrated against real glove skin');
 assert(!arm.group.getObjectByName('backpack-propulsion'));assert(!arm.group.getObjectByName('Nova_Pulse_Gun'));
 const fixed=palm.clone();arm.update(20,{interacting:true,reducedMotion:true});assert(arm.palm.getWorldPosition(new Vector3()).distanceTo(fixed)<1e-6);
 arm.update(20,{interacting:true,reducedMotion:true,aspect:390/844});const portrait=arm.palm.getWorldPosition(new Vector3());assert(Math.abs(portrait.x)<-portrait.z*Math.tan(Math.PI/5)*(390/844)*.85,'portrait hand must fit actual horizontal frustum');
 let geometryDisposals=0,boneDisposals=0,sourceDisposals=0;meshes[0].geometry.addEventListener('dispose',()=>geometryDisposals++);meshes[0].skeleton.computeBoneTexture();meshes[0].skeleton.boneTexture.addEventListener('dispose',()=>boneDisposals++);sourceBody[0].geometry.addEventListener('dispose',()=>sourceDisposals++);
 const {createAssetAstronaut}=await import('../src/lowpoly/asset-actors.js');const actor=createAssetAstronaut({'astronauta-armado':gltf});actor.update(1,{interacting:true,dt:.05});const right=actor.group.getObjectByName('handR').quaternion.clone(),fullPalm=api.poseHeldLeftHand(actor.group);assert(fullPalm.parent===actor.group.getObjectByName('handL'));assert(actor.group.getObjectByName('handR').quaternion.equals(right),'holding gem must not rotate weapon hand');const n=new Vector3(...fullPalm.userData.anatomy.normal).applyQuaternion(fullPalm.parent.getWorldQuaternion(new Quaternion()));assert(n.y>.995);actor.dispose();
 arm.update(21,{interacting:false});assert.equal(arm.group.visible,false);arm.dispose();arm.dispose();assert.equal(geometryDisposals,1);assert.equal(boneDisposals,1);assert.equal(sourceDisposals,0);
});
