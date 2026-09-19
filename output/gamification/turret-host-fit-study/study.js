import * as THREE from '/vendor/three.module.js';
import { GLTFLoader } from '/vendor/GLTFLoader.js';

const loader=new GLTFLoader();
const ASSETS={
 ship:'/assets/runtime/models/capsula.glb',
 bike:'/assets/runtime/encounter-models/bike.glb',
 noma:'/assets/runtime/models/robot.glb',
 beacon:'/assets/runtime/models/baliza.glb',
 turret:'/assets/runtime/closeout-models/modular-turret.glb',
 human:'/assets/runtime/models/astronauta-armado.glb',
};
const PROFILES={
 ship:{scale:2.5,rx:-Math.PI/2,ry:0},
 bike:{scale:1,rx:0,ry:0},
 noma:{scale:.36,rx:0,ry:Math.PI},
 beacon:{scale:1,rx:0,ry:0},
};
const load=url=>new Promise((resolve,reject)=>loader.load(url,g=>resolve(g.scene),undefined,reject));
const [turretSource,humanSource,...hosts]=await Promise.all([
 load(ASSETS.turret),load(ASSETS.human),
 ...['ship','bike','noma','beacon'].map(k=>load(ASSETS[k]))
]);
const hostSources=Object.fromEntries(['ship','bike','noma','beacon'].map((k,i)=>[k,hosts[i]]));

function boxOf(o){o.updateMatrixWorld(true);return new THREE.Box3().setFromObject(o)}
function sizeText(v){return `${v.x.toFixed(2)} × ${v.y.toFixed(2)} × ${v.z.toFixed(2)} m`}
function fitCamera(camera,box,aspect){
 const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const radius=Math.max(size.x,size.y,size.z)*.72;
 const fov=THREE.MathUtils.degToRad(camera.fov);
 let dist=radius/Math.tan(fov/2); if(aspect<1)dist*=1.18;
 camera.position.set(center.x+dist*.72,center.y+dist*.43,center.z+dist*.92);
 camera.lookAt(center);camera.near=Math.max(.01,dist/100);camera.far=dist*20;camera.updateProjectionMatrix();
}
function makeHostModel(kind){
 const root=new THREE.Group(),host=hostSources[kind].clone(true),p=PROFILES[kind];
 host.scale.setScalar(p.scale);host.rotation.set(p.rx,p.ry,0);root.add(host);
 host.updateMatrixWorld(true);
 const hb=boxOf(host),hc=hb.getCenter(new THREE.Vector3());
 host.position.sub(hc); host.position.y-=hb.min.y; host.updateMatrixWorld(true);
 return {root,host};
}
function addHuman(root,hostBox){
 const h=humanSource.clone(true);h.rotation.y=Math.PI;root.add(h);h.updateMatrixWorld(true);
 const b=boxOf(h),c=b.getCenter(new THREE.Vector3());h.position.sub(c);h.position.y-=b.min.y;
 const hostSize=hostBox.getSize(new THREE.Vector3());h.position.x=-hostSize.x*.75-1.15;
 h.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
 return h;
}
function mountTurret(root,host,scale){
 const old=root.getObjectByName('study-turret');if(old)old.removeFromParent();
 const t=turretSource.clone(true);t.name='study-turret';t.scale.setScalar(scale);root.add(t);t.updateMatrixWorld(true);
 const hb=boxOf(host),tb=boxOf(t),hc=hb.getCenter(new THREE.Vector3()),tc=tb.getCenter(new THREE.Vector3());
 t.position.x+=hc.x-tc.x;t.position.z+=hc.z-tc.z;t.position.y+=hb.max.y-tb.min.y;
 t.updateMatrixWorld(true);return t;
}
function init(kind){
 const canvas=document.querySelector(`[data-canvas="${kind}"]`);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new THREE.Scene();
 scene.add(new THREE.HemisphereLight(0xcfe4ff,0x20242a,2.2));
 const key=new THREE.DirectionalLight(0xffffff,4.2);key.position.set(4,8,5);scene.add(key);
 const fill=new THREE.DirectionalLight(0x9fc6ff,2);fill.position.set(-6,3,-5);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(16,64),new THREE.MeshStandardMaterial({color:0x141a21,roughness:.92,metalness:0}));
 floor.rotation.x=-Math.PI/2;floor.position.y=-.01;scene.add(floor);
 const {root,host}=makeHostModel(kind);scene.add(root);
 let turret=mountTurret(root,host,1);
 let hb=boxOf(host);const human=addHuman(root,hb);
 root.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
 const camera=new THREE.PerspectiveCamera(42,canvas.clientWidth/canvas.clientHeight,.01,1000);
 const meta=document.querySelector(`[data-meta="${kind}"]`);
 const scaleInput=document.querySelector(`[data-scale="${kind}"]`),readout=document.querySelector(`[data-readout="${kind}"]`);
 function updateMeta(){
   const hs=boxOf(host).getSize(new THREE.Vector3()),ts=boxOf(turret).getSize(new THREE.Vector3());
   meta.textContent=`Host ${sizeText(hs)} · Turret ${sizeText(ts)} · center-top comparison mount`;
 }
 function refit(){
   const whole=new THREE.Box3().setFromObject(root);fitCamera(camera,whole,canvas.clientWidth/canvas.clientHeight);
 }
 updateMeta();refit();
 scaleInput.addEventListener('input',()=>{const s=Number(scaleInput.value);readout.textContent=s.toFixed(2)+'×';turret=mountTurret(root,host,s);updateMeta();refit();});
 let dragging=false,lastX=0;
 canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(!dragging)return;root.rotation.y+=(e.clientX-lastX)*.008;lastX=e.clientX});
 canvas.addEventListener('pointerup',()=>dragging=false);
 const ro=new ResizeObserver(()=>{renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();refit();});ro.observe(canvas);
 function frame(){renderer.render(scene,camera);requestAnimationFrame(frame)}frame();
 return {kind,root,host,get turret(){return turret},renderer,camera};
}
window.studyViews=['ship','bike','noma','beacon'].map(init);
window.studyReady=true;
