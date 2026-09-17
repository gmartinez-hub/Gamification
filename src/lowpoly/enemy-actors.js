import * as THREE from '../../vendor/three.module.js';
import { createPropulsion } from './plasma.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const node=(root,name)=>root.getObjectByName(name)||root.getObjectByName(name.replaceAll('.',''));

// Keep the source textures/geometry shared, but every alien owns its bone hierarchy
// and GPU bone texture. A normal Object3D.clone alone would animate all enemies together.
function cloneRig(source){
  const model=source.clone(true),originals=[],copies=[],mapping=new Map();
  source.traverse(o=>originals.push(o));model.traverse(o=>copies.push(o));
  originals.forEach((o,index)=>mapping.set(o,copies[index]));
  for(const original of originals){
    if(!original.isSkinnedMesh)continue;
    const copy=mapping.get(original);copy.skeleton=original.skeleton.clone();
    copy.skeleton.bones=original.skeleton.bones.map(bone=>mapping.get(bone));
    if(copy.skeleton.bones.some(bone=>!bone))throw new Error('Alien skin references bones outside its scene');
    copy.bindMatrix.copy(original.bindMatrix);copy.bindMatrixInverse.copy(original.bindMatrixInverse);
    copy.skeleton.pose();copy.frustumCulled=false;copy.castShadow=true;copy.receiveShadow=true;
  }
  return model;
}

export function createAlienActor(asset){
  if(!asset?.scene)throw new Error('A rigged alien asset is required');
  const group=new THREE.Group();group.name='alien-warrior';group.userData.kind='alien';
  const model=cloneRig(asset.scene);model.rotation.y+=Math.PI;group.add(model);
  const clawLeft=node(model,'claw_socket.L'),clawRight=node(model,'claw_socket.R');
  const sockets=['L','R'].map(side=>node(model,`jet_socket.${side}`));
  if(!clawLeft||!clawRight||sockets.some(socket=>!socket))throw new Error('Alien rig is missing its claw or backpack sockets');
  const mixer=new THREE.AnimationMixer(model),actions={};
  for(const name of ['Idle','Thrust','Aim','Attack','Retreat']){
    const clip=asset.animations?.find(candidate=>candidate.name===name);
    if(!clip)throw new Error(`Alien rig is missing its ${name} animation`);
    actions[name]=mixer.clipAction(clip).play().setEffectiveWeight(name==='Idle'?1:0);
    actions[name].paused=true;
    if(name==='Attack'){actions[name].setLoop(THREE.LoopOnce,1);actions[name].clampWhenFinished=true;}
  }
  mixer.update(0);
  // Blender's bone local +Y points from the measured lower-pack outlet down/back.
  // createPropulsion recovers the base of this hidden cone at the socket origin.
  const sourceGeometry=new THREE.ConeGeometry(.078,1,12),sourceMaterial=new THREE.MeshBasicMaterial();
  const nozzles=sockets.map((socket,index)=>{
    const source=new THREE.Mesh(sourceGeometry,sourceMaterial);source.name=`alien-backpack-${index}-exhaust`;
    source.position.y=.5;source.userData.radius=.078;source.userData.power=0;socket.add(source);return source;
  });
  const exhaust=createPropulsion(group,{gain:.8});
  let disposed=false,previous=null;
  function reset(){
    previous=null;exhaust.reset();
    for(const [name,action] of Object.entries(actions)){action.time=0;action.setEffectiveWeight(name==='Idle'?1:0);}
    mixer.update(0);model.updateWorldMatrix(true,true);
  }
  function update(time,entity={},options={}){
    if(disposed)return;
    const now=Number.isFinite(time)?time:0;
    if(previous!==null&&now<previous)reset();
    const dt=clamp(Number.isFinite(options.dt)?options.dt:previous===null?1/60:now-previous,0,.1);previous=now;
    const phase=entity.animationPhase,thrust=clamp(Number.isFinite(entity.thrust)?entity.thrust:0,0,1);
    const active=entity.phase==='retreat'?'Retreat':phase==='attack'?'Attack':phase==='charge'||phase==='recover'?'Aim':thrust>.12?'Thrust':'Idle';
    const clock=Number.isFinite(entity.animationTime)?Math.max(0,entity.animationTime):now;
    let total=0;
    for(const [name,action] of Object.entries(actions)){
      const weight=THREE.MathUtils.damp(action.getEffectiveWeight(),name===active?1:0,12,dt);
      action.setEffectiveWeight(weight);total+=weight;
      // The encounter emits at attack time zero. Sample the matching authored
      // release pose immediately, then continue through recoil and recovery.
      action.time=name==='Attack'?Math.min(action.getClip().duration-.00001,.46+clock):clock%action.getClip().duration;
    }
    for(const action of Object.values(actions))action.setEffectiveWeight(action.getEffectiveWeight()/Math.max(.00001,total));
    mixer.update(0);group.updateWorldMatrix(true,true);
    for(const source of nozzles)source.userData.power=entity.active===false?0:thrust;
    exhaust.update(now,{dt,thrust,boost:entity.phase==='retreat',reducedMotion:!!options.reducedMotion,velocity:entity.velocity});
    group.userData.animation=active;
  }
  function dispose(){
    if(disposed)return;disposed=true;exhaust.dispose();mixer.stopAllAction();mixer.uncacheRoot(model);
    const skeletons=new Set();model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});
    for(const skeleton of skeletons)skeleton.dispose();
    for(const source of nozzles)source.removeFromParent();sourceGeometry.dispose();sourceMaterial.dispose();group.removeFromParent();
  }
  return {group,clawLeft,clawRight,update,reset,dispose,exhaust};
}
