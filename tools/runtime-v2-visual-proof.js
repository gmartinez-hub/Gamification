import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.mjs';
import { createBikeActor } from '../src/lowpoly/bike-actor.js';

const params=new URLSearchParams(location.search);
const proof=params.get('proof')||'cockpit-cutaway-standing';
const label=document.getElementById('label'),status=document.getElementById('status');

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x070a10);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.01,1000);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;
document.body.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xdcecff,0x202631,2.2));
const sun=new THREE.DirectionalLight(0xffffff,3.0);sun.position.set(8,14,10);sun.castShadow=true;scene.add(sun);
const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
await MeshoptDecoder.ready;

const load=url=>new Promise((resolve,reject)=>loader.load(url,resolve,undefined,reject));
const grid=(size=40,div=40)=>{const g=new THREE.GridHelper(size,div,0x3b5268,0x1a2734);g.material.opacity=.28;g.material.transparent=true;scene.add(g);return g;};
const boxHelper=(obj,color=0x57c8ff)=>{const h=new THREE.BoxHelper(obj,color);scene.add(h);return h;};
const look=(pos,target,fov=55)=>{camera.position.set(...pos);camera.fov=fov;camera.updateProjectionMatrix();camera.lookAt(...target);};
const tag=t=>label.textContent='EVIDENCE-ONLY VISUAL PROOF V2\n'+t;
const setReady=()=>{status.textContent='READY '+proof;document.documentElement.dataset.ready='true';};

function translucent(root,opacity=.20){
 root.traverse(node=>{
  if(!node.isMesh)return;
  const mats=Array.isArray(node.material)?node.material:[node.material];
  const next=mats.map(m=>{const c=m.clone();c.transparent=true;c.opacity=opacity;c.depthWrite=false;return c;});
  node.material=Array.isArray(node.material)?next:next[0];
 });
}

async function addShip({types=['front','middle','final'],center=[0,0,0],scale=2.5,rotationY=0,parent=scene}={}){
 const urls={front:'../assets/runtime/models/capsula.glb',middle:'../assets/runtime/models/habitat.glb',final:'../assets/runtime/models/propulsion.glb'};
 const spacing=4.125,group=new THREE.Group();parent.add(group);
 const mid=(types.length-1)/2;
 for(let i=0;i<types.length;i++){
  const glb=await load(urls[types[i]]),m=glb.scene;
  m.scale.setScalar(scale);m.rotation.x=-Math.PI/2;m.position.z=(i-mid)*spacing;group.add(m);
 }
 group.position.set(...center);group.rotation.y=rotationY;group.updateMatrixWorld(true);return group;
}

async function addModel(url,{position=[0,0,0],scale=1,rotation=[0,0,0],parent=scene}={}){
 const glb=await load(url),m=glb.scene;m.position.set(...position);m.scale.setScalar(scale);m.rotation.set(...rotation);parent.add(m);m.updateMatrixWorld(true);return m;
}

async function cockpit(mode){
 grid(12,24);
 const [cabin,astro]=await Promise.all([load('../assets/runtime/models/cabina-integrada.glb'),load('../assets/runtime/models/astronauta-armado.glb')]);
 cabin.scene.scale.setScalar(1.8);cabin.scene.position.set(0,1.05,0);scene.add(cabin.scene);
 translucent(cabin.scene,.18);

 astro.scene.rotation.y=Math.PI;
 if(mode==='cutaway-seated'){
  const pilot=astro.animations.find(a=>a.name==='Pilot');
  if(pilot){const mixer=new THREE.AnimationMixer(astro.scene);mixer.clipAction(pilot).play();mixer.update(.55);}
  astro.scene.position.set(0,-.31,1.08);
 }else{
  astro.scene.position.set(.74,0,1.26);
 }
 scene.add(astro.scene);
 cabin.scene.updateMatrixWorld(true);astro.scene.updateMatrixWorld(true);boxHelper(astro.scene,0xffd166);

 const clip=new THREE.Mesh(new THREE.PlaneGeometry(4.5,3.2),new THREE.MeshBasicMaterial({color:0xff4057,transparent:true,opacity:.20,side:THREE.DoubleSide,depthWrite:false}));
 clip.position.set(0,1.05,1.224);scene.add(clip);

 if(mode==='cutaway-standing')look([6,2.65,3.0],[.35,1.0,1.0],46);
 if(mode==='cutaway-rear')look([4.0,2.9,6.4],[.35,1.0,1.0],46);
 if(mode==='cutaway-seated')look([4.8,2.15,4.6],[0,.75,.7],48);
 if(mode==='pilot-eye'){
  look([0,1.38,.98],[0,1.18,-2.0],70);
 }
 tag('CP-001 · TRANSPARENT FULL SOURCE SHELL\nYellow = astronaut envelope · Red = historical rear clip plane\nSeated/standing evidence only; no replacement cockpit inferred.');
}

async function hangar(mode){
 const h=await load('../assets/runtime/closeout-models/orbital-service-bay.glb');
 h.scene.scale.setScalar(18);h.scene.position.set(0,-1.2,0);scene.add(h.scene);h.scene.updateMatrixWorld(true);

 const anchorFloor=(name)=>{
  const node=h.scene.getObjectByName(name);if(!node)throw new Error('Missing anchor '+name);
  const start=node.getWorldPosition(new THREE.Vector3());
  const ray=new THREE.Raycaster(start.clone().add(new THREE.Vector3(0,.05,0)),new THREE.Vector3(0,-1,0),0,100);
  const hit=ray.intersectObject(h.scene,true).find(x=>x.distance>.1);
  if(!hit)throw new Error('No semantic floor below '+name);
  return {anchor:start,floor:hit.point.clone()};
 };

 const crew=anchorFloor('service-crew'),longShip=anchorFloor('service-long-ship'),bike=anchorFloor('service-bike');

 if(mode==='fp-crew-route'){
  const eye=crew.floor.clone().add(new THREE.Vector3(0,1.70,0));
  const target=longShip.floor.clone().add(new THREE.Vector3(0,1.2,0));
  camera.position.copy(eye);camera.fov=70;camera.updateProjectionMatrix();camera.lookAt(target);
 }
 if(mode==='fp-open-face'){
  const eye=longShip.floor.clone().add(new THREE.Vector3(0,1.70,2.5));
  camera.position.copy(eye);camera.fov=70;camera.updateProjectionMatrix();camera.lookAt(new THREE.Vector3(0,eye.y-1,-28));
 }
 if(mode==='route-overview'){
  const ship=await addShip({types:['front','middle','final'],center:[0,longShip.floor.y+.8,3]});boxHelper(ship,0x69e38a);
  const mat=new THREE.LineBasicMaterial({color:0x66d575});
  const pts=[crew.floor.clone().add(new THREE.Vector3(0,.12,0)),longShip.floor.clone().add(new THREE.Vector3(0,.12,0))];
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),mat));
  look([29,9,30],[0,longShip.floor.y+1,0],52);
 }
 if(mode==='bike-platform'){
  const eye=bike.floor.clone().add(new THREE.Vector3(0,1.70,0));camera.position.copy(eye);camera.fov=68;camera.updateProjectionMatrix();camera.lookAt(new THREE.Vector3(0,eye.y,-12));
 }
 tag('HG-001 · SEMANTIC WALK-DECK PROOF\nFloor is raycast downward from authored service anchors, not from the roof.\nNo third-person fallback inferred.');
}

async function portal(mode){
 grid(70,35);
 const group=new THREE.Group();scene.add(group);
 const horizon=new THREE.Mesh(new THREE.SphereGeometry(3.4,48,32),new THREE.MeshBasicMaterial({color:0x010108}));
 const ring=new THREE.Mesh(new THREE.TorusGeometry(3.4,.23,20,96),new THREE.MeshBasicMaterial({color:0x8be9ff,transparent:true,opacity:.88,blending:THREE.AdditiveBlending,depthWrite:false}));
 group.add(horizon,ring);

 if(mode==='staggered-full'){
  const playerShip=await addShip({types:['front','middle','final'],center:[-.9,.5,8]});boxHelper(playerShip,0x69e38a);
  const allyShip=await addShip({types:['front','final'],center:[1.0,-.5,17]});boxHelper(allyShip,0x57c8ff);
  await addModel('../assets/runtime/encounter-models/bike.glb',{position:[-1.25,-1.05,24],rotation:[0,Math.PI,0]});
  await addModel('../assets/runtime/encounter-models/bike.glb',{position:[1.3,.9,29],rotation:[0,Math.PI,0]});
  await addModel('../assets/runtime/closeout-models/green-ally.glb',{position:[-.6,-.8,34],scale:1.15,rotation:[0,Math.PI,0]});
  await addModel('../assets/runtime/models/robot.glb',{position:[.75,.55,38],scale:.36,rotation:[0,Math.PI,0]});
  look([16,10,31],[0,0,7],52);
  tag('PORTAL-001 · APPROVED STAGGERED CONVOY · FULL-SETUP STRESS PROOF\nFull semantic scales preserved. Positions are proof candidates only.\nOccupancy/rider state is not frozen by this stress composition.');
  return;
 }

 if(mode==='staggered-aperture'){
  await addShip({types:['front','middle','final'],center:[-.9,.45,7]});
  await addShip({types:['front','final'],center:[1.0,-.45,16]});
  look([9,6,19],[0,0,2],48);
  tag('PORTAL-001 · APPROVED STAGGERED CONVOY · APERTURE PROOF\nNo ship rescaling. Longitudinal separation avoids mandatory simultaneous side-by-side crossing.');
 }
}

async function bike(mode){
 grid(14,28);
 const [bike,riderClips,astronaut,back]=await Promise.all([
  load('../assets/runtime/encounter-models/bike.glb'),
  load('../assets/runtime/encounter-models/bike-rider.glb'),
  load('../assets/runtime/models/astronauta-armado.glb'),
  load('../assets/runtime/models/propulsion.glb')
 ]);
 const actor=createBikeActor({bike,bikeMedium:null,riderClips},astronaut);
 scene.add(actor.group);

 const scaleMap={'embedded-045':.45,'embedded-0535':.535,'embedded-062':.62,'embedded-rear':.535,'embedded-fp':.535,'embedded-tp':.535};
 const scale=scaleMap[mode]??.535;
 actor.update(.5,{mounted:true,firstPerson:mode==='embedded-fp',boost:false,dt:.016});

 const addon=back.scene;addon.rotation.x=-Math.PI/2;addon.scale.setScalar(scale);
 addon.position.set(0,.40,1.56);actor.visual.add(addon);

 const collar=new THREE.Mesh(
  new THREE.CylinderGeometry(.50,.56,.46,28),
  new THREE.MeshStandardMaterial({color:0x293038,metalness:.72,roughness:.34})
 );
 collar.rotation.x=Math.PI/2;collar.position.set(0,.45,1.40);actor.visual.add(collar);

 actor.group.updateMatrixWorld(true);boxHelper(addon,0xffd166);

 if(mode==='embedded-045'||mode==='embedded-0535'||mode==='embedded-062')look([-6,2.35,1.1],[0,.72,.55],49);
 if(mode==='embedded-rear')look([4.3,2.65,5.1],[0,.78,1.0],49);
 if(mode==='embedded-fp'){
  const eye=actor.eye.getWorldPosition(new THREE.Vector3());
  camera.position.copy(eye);camera.fov=70;camera.updateProjectionMatrix();camera.lookAt(eye.clone().add(new THREE.Vector3(0,0,-5)));
 }
 if(mode==='embedded-tp')look([4.6,2.8,6.1],[0,.9,.35],57);
 tag('BIKE-001 · APPROVED ENCASTRADO DIRECTION\nBack scale '+scale.toFixed(3)+'× · bounded collar is proof geometry only.\nFinal scale/placement/collider/nozzle remain VERIFY.');
}

try{
 if(proof.startsWith('cockpit-'))await cockpit(proof.slice(8));
 else if(proof.startsWith('hangar-'))await hangar(proof.slice(7));
 else if(proof.startsWith('portal-'))await portal(proof.slice(7));
 else if(proof.startsWith('bike-'))await bike(proof.slice(5));
 else throw new Error('Unknown proof '+proof);
 setReady();
}catch(e){console.error(e);status.textContent='ERROR '+e.message;label.textContent='PROOF ERROR\n'+e.stack;}

function frame(){renderer.render(scene,camera);requestAnimationFrame(frame)}frame();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
