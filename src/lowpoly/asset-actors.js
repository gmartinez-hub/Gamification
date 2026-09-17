import * as THREE from '../../vendor/three.module.js';
import { loadModelSet } from './asset-loading.js';
import { createPropulsion } from './plasma.js';

const names = ['capsula','habitat','propulsion','astronauta-armado','astronauta-brazos-armado','cabina-integrada','robot'];
export async function loadActorAssets(onProgress = () => {}, { mobile = false, stage = 3, only = null } = {}) {
  const records = await loadModelSet((only || names.filter((_, index) => index >= 3 || index < stage)).map(name => [name, name]), { mobile, onProgress });
  for (const gltf of Object.values(records)) gltf.scene.traverse(o => { if (o.isMesh) {
    o.castShadow = true; o.receiveShadow = true;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (m.map) m.map.anisotropy = 8;
      m.envMapIntensity = .8;
    }
  }});
  return records;
}
const metal = new THREE.MeshStandardMaterial({color:0x343d43,metalness:.75,roughness:.35});
const trim = new THREE.MeshStandardMaterial({color:0xbeb7a7,metalness:.45,roughness:.43});
const light = new THREE.MeshStandardMaterial({color:0x7de9eb,emissive:0x36b8da,emissiveIntensity:2,roughness:.3});
function socket(parent,name,position) { const o=new THREE.Object3D();o.name=name;o.position.set(...position);parent.add(o);return o; }
function torus(parent,name,radius,tube,z,material=metal) {
  const m=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,12,64),material);m.name=name;m.position.z=z;parent.add(m);return m;
}
function jet(parent,name,position) {
  const m=new THREE.Mesh(new THREE.ConeGeometry(.32,1,16),new THREE.MeshBasicMaterial());
  m.name=name+'-exhaust';m.position.set(...position);m.position.z+=.5;m.rotation.x=Math.PI/2;parent.add(m);return m;
}
export function createAssetShip(assets) {
  const group=new THREE.Group();group.name='mesh-modular-spacecraft';group.userData.kind='ship';
  const modules=names.slice(0,3).map((name,index)=>{
    const root=new THREE.Group();root.name=['module-cockpit','module-body','module-propulsion'][index];
    root.position.z=[-3.5,.575,4.75][index];root.userData.stage=index+1;
    const model=assets[name]?.scene;if(model){model.rotation.x=-Math.PI/2;model.scale.setScalar(2.5);root.add(model);root.userData.loaded=true;}group.add(root);return root;
  });
  // Mating planes are measured in the source models, then converted Y -> -Z.
  // Short collars hide the two original independent rims without changing their bodies.
  torus(modules[1],'habitat-front-seal',1.54,.11,-2.10);
  torus(modules[1],'habitat-front-lock',1.54,.045,-2.22,trim);
  torus(modules[2],'engine-front-seal',1.82,.13,-2.10);
  torus(modules[2],'engine-front-lock',1.82,.045,-2.24,trim);
  const cannon=new THREE.Mesh(new THREE.CylinderGeometry(.065,.12,.75,24),metal);
  cannon.rotation.x=Math.PI/2;cannon.position.set(0,-.4,-5.8);cannon.name='ship-cannon';group.add(cannon);
  const muzzle=socket(group,'ShipMuzzle',[0,-.4,-6.18]);
  socket(group,'EVADoor',[2.3,-.05,-2.5]);socket(group,'CableSocket',[2.15,.05,-2.5]);
  const podJets=[jet(modules[0],'pod-left',[-1.55,-1.4,1.95]),jet(modules[0],'pod-right',[1.55,-1.4,1.95])];
  for(const source of podJets){const casing=new THREE.Mesh(new THREE.CylinderGeometry(.25,.31,.55,24),metal);casing.rotation.x=Math.PI/2;casing.position.copy(source.position).add(new THREE.Vector3(0,0,-.75));modules[0].add(casing);}
  const mainJets=[];
  for(let i=0;i<6;i++){const angle=i*Math.PI/3;mainJets.push(jet(modules[2],`main-ring-${i}`,[Math.cos(angle)*1.37,Math.sin(angle)*1.37,2.39]));}
  const rcs=[];
  for(const [axis,sign,position] of [['x',1,[-2.2,0,-3.5]],['x',-1,[2.2,0,-3.5]],['y',1,[0,-2.1,-3.5]],['y',-1,[0,2.1,-3.5]],['z',1,[0,-.9,-5.5]]]){
    const mount=new THREE.Group();mount.position.set(...position);mount.scale.setScalar(.23);
    const direction=new THREE.Vector3();direction[axis]=-sign;mount.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);group.add(mount);
    rcs.push({source:jet(mount,`rcs-${axis}-${sign}`,[0,0,0]),axis,sign});
  }
  const exhaust=createPropulsion(group); const inverse=new THREE.Quaternion(),local=new THREE.Vector3();
  const positions=modules.map(m=>m.position.clone()), arrivals=new Map();let last=0,stage=1;
  function setStage(next,animate=true) {
    if(!Number.isInteger(next)||next<1||next>3)throw new RangeError('Invalid ship stage');
    modules.forEach((m,i)=>{
      const arriving=i>=stage&&i<next;m.visible=i<next;
      if(arriving&&animate)arrivals.set(m,{time:last,from:positions[i].clone().add(new THREE.Vector3(i===1?-5:5,2,4)),index:i});
      else if(!animate||!m.visible){arrivals.delete(m);m.position.copy(positions[i]);m.rotation.set(0,0,0);}
    });stage=next;group.userData.stage=next;
  }
  setStage(1,false);
  return {group,setStage,muzzle,modules,
    hasStage(next){return modules.slice(0,next).every(m=>m.userData.loaded);},
    install(records){for(const [name,asset] of Object.entries(records)){const index=names.slice(0,3).indexOf(name);if(index<0||modules[index].userData.loaded)continue;asset.scene.rotation.x=-Math.PI/2;asset.scene.scale.setScalar(2.5);modules[index].add(asset.scene);modules[index].userData.loaded=true;}},
    update(time,{thrust=0,braking=false,boost=false,reducedMotion=false}={}) {
    last=time;
    if(typeof thrust==='number')local.set(0,0,-thrust);else local.copy(thrust).applyQuaternion(inverse.copy(group.quaternion).invert());
    const forward=THREE.MathUtils.clamp(-local.z,0,1);
    for(const source of podJets)source.userData.power=stage<3?forward:0;
    for(const source of mainJets)source.userData.power=stage===3?forward:0;
    for(const {source,axis,sign} of rcs)source.userData.power=Math.max(0,local[axis]*sign);
    exhaust.update(time,{thrust:forward,boost,reducedMotion});
    for(const [m,a] of arrivals){const t=THREE.MathUtils.clamp((time-a.time)/2.2,0,1),e=1-(1-t)**3;
      m.position.lerpVectors(a.from,positions[a.index],e);m.rotation.z=(1-e)*.16;if(t===1)arrivals.delete(m);}
  }};
}
function poseActor(gltf) {
  const mixer=new THREE.AnimationMixer(gltf.scene), actions={},limbs={};
  const movable=track=>{const name=track.name.slice(0,track.name.lastIndexOf('.'));return /^(thigh|shin|foot|toe)/.test(name)||name.endsWith('L');};
  for(const name of ['AimWeapon','RelaxWeapon']) {
    const original=gltf.animations.find(c=>c.name===name);if(!original)throw new Error(`Missing ${name}`);
    const clip=new THREE.AnimationClip(name,original.duration,original.tracks.filter(t=>!movable(t)));
    actions[name]=mixer.clipAction(clip).play();actions[name].setEffectiveWeight(name==='RelaxWeapon'?1:0);
  }
  for(const name of ['EVAIdle','EVAThrust','EVABrake','Scan']) {
    const original=gltf.animations.find(c=>c.name===name);
    const clip=new THREE.AnimationClip(name+'FreeLimbs',original.duration,original.tracks.filter(movable));
    limbs[name]=mixer.clipAction(clip).play().setEffectiveWeight(name==='EVAIdle'?1:0);
  }
  mixer.update(0);let last=0,blend=0;
  return {mixer,update(time,aiming,motion=0,braking=false,interacting=false){const dt=Math.min(.1,Math.max(0,time-last));last=time;
    blend=THREE.MathUtils.damp(blend,aiming?1:0,9,dt);
    actions.AimWeapon.setEffectiveWeight(blend);actions.RelaxWeapon.setEffectiveWeight(1-blend);
    const active=interacting?'Scan':braking?'EVABrake':motion>.1?'EVAThrust':'EVAIdle';
    let sum=0;for(const [name,action] of Object.entries(limbs)){const weight=THREE.MathUtils.damp(action.getEffectiveWeight(),name===active?1:0,6,dt);action.setEffectiveWeight(weight);sum+=weight;}
    for(const action of Object.values(limbs))action.setEffectiveWeight(action.getEffectiveWeight()/Math.max(.0001,sum));
    mixer.update(dt);
  }};
}
export function createAssetAstronaut(assets) {
  const group=new THREE.Group();group.name='rigged-astronaut';group.userData.kind='astronaut';
  const gltf=assets['astronauta-armado'],model=gltf.scene;model.rotation.y=Math.PI;group.add(model);
  const pose=poseActor(gltf),muzzle=model.getObjectByName('WeaponMuzzle');
  const jets=new THREE.Group();jets.position.set(0,1.1,.2);group.add(jets);jet(jets,'eva-left',[-.23,0,0]);jet(jets,'eva-right',[.23,0,0]);
  jets.scale.setScalar(.22);const exhaust=createPropulsion(jets,{gain:.6});
  return {group,muzzle,update(time,{aiming=false,thrust=0,braking=false,interacting=false,reducedMotion=false}={}) {
    const power=typeof thrust==='number'?thrust:thrust.length();
    pose.update(time,aiming,power,braking,interacting);model.position.y=Math.sin(time*1.4)*.009;
    exhaust.update(time,{thrust:power,reducedMotion});
  }};
}
export function createAssetVisor(assets) {
  const group=new THREE.Group();group.name='rigged-eva-view';
  const gltf=assets['astronauta-brazos-armado'],model=gltf.scene;
  const view=new THREE.Group();view.rotation.y=Math.PI;view.position.set(0,-1.69,.16);view.add(model);group.add(view);
  const pose=poseActor(gltf),muzzle=model.getObjectByName('WeaponMuzzle');let recoil=0;
  // Only the inside lower edge of the helmet is visible; nothing crosses the aim point.
  const seal=new THREE.Mesh(new THREE.TorusGeometry(.54,.035,12,80,Math.PI),metal);
  seal.rotation.z=Math.PI;seal.position.set(0,-.06,-.43);seal.scale.set(1.42,1,1);seal.name='visor-lower-seal';group.add(seal);
  return {group,muzzle,kick(){recoil=.045;},update(time,{aiming=false,speed=0,aspect=1.6}={}){
    pose.update(time,aiming);recoil*=.8;view.position.z=.16+recoil;
    view.position.y=-1.69+Math.sin(time*2)*Math.min(.006,speed*.0008);
    view.position.x=aspect<1?-.06:0;
  }};
}
export function createAssetCockpit(assets) {
  const group=new THREE.Group();group.name='enclosed-pilot-cockpit';
  const model=assets['cabina-integrada'].scene;model.position.set(0,-.10,-1.30);group.add(model);
  model.traverse(o=>{if(o.isMesh){o.castShadow=false;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.transparent)m.depthWrite=false;}});
  const fill=new THREE.PointLight(0x9dd9ef,.6,4,2);fill.position.set(0,.2,-.7);group.add(fill);
  return {group,update(time,{speed=0}={}){model.position.y=-.10+Math.sin(time*2.1)*Math.min(.002,speed*.0002);}};
}
export function createAssetCompanion(assets) {
  const group=new THREE.Group();group.name='aether-companion';group.userData.kind='companion';
  const model=assets.robot.scene;model.scale.setScalar(.36);model.rotation.y=Math.PI;group.add(model);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.032,16,12),light);eye.position.set(0,.12,-.29);group.add(eye);
  return {group,update(time,{moving=0}={}){model.position.y=Math.sin(time*1.6)*.04;model.rotation.z=Math.sin(time*.9)*.035;eye.material.emissiveIntensity=1.4+Math.sin(time*2)*.3;}};
}
