import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.mjs';
import { createBikeActor } from '../src/lowpoly/bike-actor.js';

const params=new URLSearchParams(location.search);
const proof=params.get('proof')||'cockpit-side';
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
const tag=t=>label.textContent='EVIDENCE-ONLY VISUAL PROOF\n'+t;
const setReady=()=>{status.textContent='READY '+proof;document.documentElement.dataset.ready='true';};

async function addShip({types=['front','middle','final'],center=[0,0,0],scale=2.5}={}){
 const urls={front:'../assets/runtime/models/capsula.glb',middle:'../assets/runtime/models/habitat.glb',final:'../assets/runtime/models/propulsion.glb'};
 const spacing=4.125,group=new THREE.Group();scene.add(group);
 const mid=(types.length-1)/2;
 for(let i=0;i<types.length;i++){
  const glb=await load(urls[types[i]]),m=glb.scene;
  m.scale.setScalar(scale);m.rotation.x=-Math.PI/2;m.position.z=(i-mid)*spacing;group.add(m);
 }
 group.position.set(...center);group.updateMatrixWorld(true);return group;
}

async function cockpit(mode){
 grid(12,24);
 const [cabin,astro]=await Promise.all([load('../assets/runtime/models/cabina-integrada.glb'),load('../assets/runtime/models/astronauta-armado.glb')]);
 cabin.scene.scale.setScalar(1.8);cabin.scene.position.set(0,1.05,0);scene.add(cabin.scene);
 astro.scene.rotation.y=Math.PI;astro.scene.position.set(.74,0,1.26);scene.add(astro.scene);
 cabin.scene.updateMatrixWorld(true);astro.scene.updateMatrixWorld(true);boxHelper(astro.scene,0xffd166);
 const clip=new THREE.Mesh(new THREE.PlaneGeometry(4.5,3.2),new THREE.MeshBasicMaterial({color:0xff4057,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));
 clip.position.set(0,1.05,1.224);scene.add(clip);
 if(mode==='side')look([6,2.7,2.5],[0.4,1.1,1.0],48);
 if(mode==='rear')look([4.2,3.0,6.5],[0.3,1.1,1.1],48);
 if(mode==='top')look([.3,8,1.0],[.3,1.0,1.0],45);
 if(mode==='standing')look([-.2,1.69,3.2],[.4,1.35,.2],62);
 tag('CP-001 · FULL SOURCE SHELL\nYellow = astronaut envelope · Red = historical rear clip plane\nNo V2 geometry decision inferred.');
}

async function hangar(mode){
 const h=await load('../assets/runtime/closeout-models/orbital-service-bay.glb');
 h.scene.scale.setScalar(18);h.scene.position.set(0,-1.2,0);scene.add(h.scene);h.scene.updateMatrixWorld(true);
 const floorAt=(x,z)=>{
  const ray=new THREE.Raycaster(new THREE.Vector3(x,20,z),new THREE.Vector3(0,-1,0),0,100);
  const hit=ray.intersectObject(h.scene,true)[0];return hit?.point.y??null;
 };
 if(mode==='front')look([0,4,-42],[0,-1,0],48);
 if(mode==='rear')look([0,4,42],[0,-1,0],48);
 if(mode==='left')look([-44,3,0],[0,-1,0],48);
 if(mode==='right')look([44,3,0],[0,-1,0],48);
 if(mode==='fp-a'||mode==='fp-b'){
  const p=mode==='fp-a'?[-8,-4]:[8,-4],fy=floorAt(p[0],p[1]);
  if(fy===null)throw new Error('No floor ray hit for '+mode);
  look([p[0],fy+1.7,p[1]],[0,fy+1.3,5],70);
 }
 if(mode==='ship'){
  const ship=await addShip({types:['front','middle','final'],center:[0,-4.8,2]});boxHelper(ship,0x69e38a);
  look([28,10,32],[0,-3,2],52);
 }
 tag('HG-001 · SERVICE-BAY RAW GEOMETRY\n18× legacy semantic staging used as measured reference only.\nFP cameras snap to actual downward ray-hit floor.');
}

async function portal(mode){
 grid(24,24);
 const group=new THREE.Group();scene.add(group);
 const horizon=new THREE.Mesh(new THREE.SphereGeometry(3.4,48,32),new THREE.MeshBasicMaterial({color:0x010108}));
 const disc=new THREE.Mesh(new THREE.RingGeometry(3.7,7.8,96,5),new THREE.MeshBasicMaterial({color:0x84ecff,transparent:true,opacity:.52,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));
 disc.rotation.x=Math.PI/2;
 const halo=new THREE.Mesh(new THREE.TorusGeometry(4.15,.22,16,96),new THREE.MeshBasicMaterial({color:0xa78cff,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false}));
 group.add(horizon,disc,halo);
 const ships=[];
 if(mode==='single'){ships.push(await addShip({types:['front','middle','final'],center:[0,0,8]}));}
 if(mode==='staggered'){
  ships.push(await addShip({types:['front','middle','final'],center:[-1.2,.6,8]}));
  ships.push(await addShip({types:['front','final'],center:[1.2,-.6,15]}));
 }
 if(mode==='side'){
  ships.push(await addShip({types:['front','middle','final'],center:[-3,0,9]}));
  ships.push(await addShip({types:['front','final'],center:[3,0,9]}));
 }
 ships.forEach(s=>boxHelper(s,0x69e38a));
 look([14,9,24],[0,0,2],52);
 tag('PORTAL-001 · CANDIDATE '+mode.toUpperCase()+'\nLegacy 6.8 m event horizon / 15.6 m visual disc.\nCandidate only — no formation selected.');
}

async function bike(mode){
 grid(12,24);
 const [bike,riderClips,astronaut,back]=await Promise.all([
  load('../assets/runtime/encounter-models/bike.glb'),
  load('../assets/runtime/encounter-models/bike-rider.glb'),
  load('../assets/runtime/models/astronauta-armado.glb'),
  load('../assets/runtime/models/propulsion.glb')
 ]);
 const actor=createBikeActor({bike,bikeMedium:null,riderClips},astronaut);
 scene.add(actor.group);actor.update(.5,{mounted:true,firstPerson:false,boost:false,dt:.016});
 const addon=back.scene;addon.rotation.x=-Math.PI/2;addon.scale.setScalar(.535);addon.position.set(0,.38,1.86);actor.visual.add(addon);actor.group.updateMatrixWorld(true);
 boxHelper(addon,0xffd166);
 if(mode==='left')look([-6,2.4,1.2],[0,.7,.5],50);
 if(mode==='rear')look([4.5,2.8,5.5],[0,.8,1.0],50);
 if(mode==='top')look([0,8,.8],[0,.5,.8],45);
 if(mode==='rider')look([-3,2.1,2.8],[0,1.0,.5],48);
 if(mode==='fp'){
  const eye=actor.eye.getWorldPosition(new THREE.Vector3());camera.position.copy(eye);camera.position.y+=.02;camera.lookAt(eye.clone().add(new THREE.Vector3(0,0,-5)));camera.fov=70;camera.updateProjectionMatrix();
 }
 if(mode==='tp')look([5,3.0,7],[0,.9,.3],58);
 tag('BIKE-001 · BACK CANDIDATE 0.535×\nYellow = candidate Back envelope/object.\nLegacy rider pose used as evidence only; no V2 implementation dependency.');
}

try{
 if(proof.startsWith('cockpit-'))await cockpit(proof.split('-')[1]);
 else if(proof.startsWith('hangar-'))await hangar(proof.slice(7));
 else if(proof.startsWith('portal-'))await portal(proof.split('-')[1]);
 else if(proof.startsWith('bike-'))await bike(proof.split('-')[1]);
 else throw new Error('Unknown proof '+proof);
 setReady();
}catch(e){console.error(e);status.textContent='ERROR '+e.message;label.textContent='PROOF ERROR\n'+e.stack;}

function frame(){renderer.render(scene,camera);requestAnimationFrame(frame)}frame();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
