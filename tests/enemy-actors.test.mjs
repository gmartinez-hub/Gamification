import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.mjs';
import { createAlienActor } from '../src/lowpoly/enemy-actors.js';

let fixture;
async function asset(){
  if(!fixture)fixture=(async()=>{
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    loader.register(()=>({name:'GeometryOnlyAlienTest',loadTexture:()=>Promise.resolve(null)}));
    const b=await readFile(new URL('../assets/runtime/encounter-models/alien.glb',import.meta.url));
    return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
  })();
  return fixture;
}
const skin=root=>{let mesh;root.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});return mesh;};
const point=o=>o.getWorldPosition(new THREE.Vector3());
function advance(actor,entity,start=0,seconds=1){for(let i=0;i<Math.ceil(seconds*60);i++)actor.update(start+i/60,{...entity,animationTime:i/60},{dt:1/60});}

test('aliens preserve original shared surfaces while poses and skeletons remain independent',async()=>{
  const gltf=await asset(),original=skin(gltf.scene),a=createAlienActor(gltf),b=createAlienActor(gltf);
  const originalPose=original.skeleton.bones.map(b=>b.quaternion.toArray());
  assert.equal(skin(a.group).geometry,original.geometry);assert.equal(skin(a.group).material,original.material);
  assert.notEqual(skin(a.group).skeleton,skin(b.group).skeleton);
  for(let i=0;i<original.skeleton.bones.length;i++)assert.notEqual(skin(a.group).skeleton.bones[i],original.skeleton.bones[i]);
  advance(a,{phase:'engaged',animationPhase:'charge',thrust:.45});advance(b,{phase:'engaged',animationPhase:'flight',thrust:0});
  a.group.updateMatrixWorld(true);b.group.updateMatrixWorld(true);
  assert(point(a.clawRight).distanceTo(point(b.clawRight))>.25,'aim must articulate the claw rather than just rotate the actor');
  assert.deepEqual(original.skeleton.bones.map(b=>b.quaternion.toArray()),originalPose,'source rig cannot change when a clone fires');
  assert(point(a.clawRight).x>point(a.clawLeft).x,'anatomical right/left must survive facing-axis conversion');
  a.dispose();b.dispose();
});

test('backpack flames stay on their animated outlets and point down/back after actor orientation',async()=>{
  const a=createAlienActor(await asset()),scene=new THREE.Scene();scene.add(a.group);
  a.group.position.set(5,8,3);a.group.rotation.y=.7;
  advance(a,{phase:'arrival',animationPhase:'flight',thrust:1,velocity:{x:2,y:0,z:-3}});
  assert.equal(a.exhaust.stats.engines,2);assert(a.exhaust.history.activeCount>0);
  const engines=[];a.group.traverse(o=>{if(/^plasma-engine-/.test(o.name))engines.push(o);});
  for(const engine of engines){
    assert(engine.visible);assert(point(engine).distanceTo(point(engine.parent))<1e-6,'flame starts at the rig socket, with no root offset drift');
    const direction=new THREE.Vector3(0,0,1).applyQuaternion(engine.getWorldQuaternion(new THREE.Quaternion()));
    assert(direction.y<-.85,'existing lower backpack outlets exhaust predominantly downward');
  }
  advance(a,{phase:'engaged',animationPhase:'charge',thrust:.45},2);
  for(const engine of engines)assert(point(engine).distanceTo(point(engine.parent))<1e-6);
  a.update(4,{phase:'engaged',animationPhase:'attack',animationTime:0,thrust:0,active:false},{dt:.1});
  assert(engines.every(engine=>!engine.visible));a.dispose();
});

test('encounter attack time zero aligns with the authored claw-release frame',async()=>{
  const gltf=await asset(),actor=createAlienActor(gltf),reference=createAlienActor(gltf);
  const mixer=new THREE.AnimationMixer(reference.group.children[0]);
  const release=mixer.clipAction(gltf.animations.find(clip=>clip.name==='Attack')).play();release.time=.46;mixer.update(0);reference.group.updateMatrixWorld(true);
  for(let frame=0;frame<180;frame++)actor.update(frame/60,{phase:'engaged',animationPhase:'attack',animationTime:0,thrust:0},{dt:1/60});
  assert(point(actor.clawRight).distanceTo(point(reference.clawRight))<1e-6,'projectile birth must sample the release, not the charge-up pose');
  mixer.stopAllAction();mixer.uncacheRoot(reference.group.children[0]);actor.dispose();reference.dispose();
});

test('attack samples the authored release and cleanup frees only actor-owned GPU resources',async()=>{
  const gltf=await asset(),a=createAlienActor(gltf),b=createAlienActor(gltf),owned=skin(a.group),shared=skin(gltf.scene);
  advance(a,{phase:'engaged',animationPhase:'charge',thrust:.45});
  a.update(2,{phase:'engaged',animationPhase:'attack',animationTime:0,thrust:.45},{dt:.1});
  assert.equal(a.group.userData.animation,'Attack');assert(point(a.clawRight).toArray().every(Number.isFinite));
  a.update(2.2,{phase:'retreat',animationPhase:'flight',animationTime:.2,thrust:1},{dt:.1});assert.equal(a.group.userData.animation,'Retreat');
  owned.skeleton.computeBoneTexture();let skeletonDisposals=0,geometryDisposals=0,materialDisposals=0;
  owned.skeleton.boneTexture.addEventListener('dispose',()=>skeletonDisposals++);
  shared.geometry.addEventListener('dispose',()=>geometryDisposals++);shared.material.addEventListener('dispose',()=>materialDisposals++);
  a.dispose();a.dispose();assert.equal(skeletonDisposals,1);assert.equal(geometryDisposals,0);assert.equal(materialDisposals,0);
  advance(b,{phase:'arrival',animationPhase:'flight',thrust:1});assert(point(b.clawRight).toArray().every(Number.isFinite));
  b.reset();assert.equal(b.exhaust.history.activeCount,0);b.dispose();
});
