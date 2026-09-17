import * as THREE from '../../vendor/three.module.js';
import { CABIN_LAYOUT } from './cabin-controller.js';

const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const normalizeName=name=>name.replaceAll('.','');
// Clone the approved astronaut rig without changing shared source meshes or proportions.
function cloneRig(source){
 const clone=source.clone(true),map=new Map(),a=[],b=[];source.traverse(o=>a.push(o));clone.traverse(o=>b.push(o));a.forEach((o,i)=>map.set(o,b[i]));
 for(const original of a)if(original.isSkinnedMesh){const target=map.get(original);target.skeleton=original.skeleton.clone();target.skeleton.bones=original.skeleton.bones.map(bone=>map.get(bone));target.bindMatrix.copy(original.bindMatrix);target.bindMatrixInverse.copy(original.bindMatrixInverse);target.skeleton.pose();}
 clone.getObjectByName('backpack-propulsion')?.removeFromParent();
 clone.position.set(0,0,0);clone.rotation.set(0,0,0);clone.scale.setScalar(1);return clone;
}
function roundedBox(w,h,d,r=.025){
 r=Math.min(r,w/3,h/3,d/3);const s=new THREE.Shape(),x=-w/2,y=-h/2;
 s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
 const g=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:3,curveSegments:8,steps:1});g.translate(0,0,-d/2+r);g.computeVertexNormals();return g;
}
function addMesh(group,name,geometry,material,position,rotation){const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(...position);if(rotation)m.rotation.set(...rotation);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
function armsGeometry(mesh){
 const g=mesh.geometry,indices=g.index,weights=g.attributes.skinWeight,joints=g.attributes.skinIndex;
 if(!indices||!weights||!joints)return null;
 const include=new Uint8Array(g.attributes.position.count);
 for(let i=0;i<include.length;i++){let w=0;for(let j=0;j<4;j++){const bone=mesh.skeleton.bones[joints.getComponent(i,j)];if(/^(upper_arm|forearm|hand|thumb|index|middle|ring|little)/.test(bone?.name||''))w+=weights.getComponent(i,j);}include[i]=w>.55;}
 const kept=[];for(let i=0;i<indices.count;i+=3){const a=indices.getX(i),b=indices.getX(i+1),c=indices.getX(i+2);if(include[a]&&include[b]&&include[c])kept.push(a,b,c);}
 const copy=new THREE.BufferGeometry();for(const[name,attribute]of Object.entries(g.attributes))copy.setAttribute(name,attribute);copy.setIndex(kept);return copy;
}
// Retain source UVs/normals while stopping the existing wrap at the short
// station's rear edge. No new room or dashboard surfaces are synthesized.
function clipSourceAtRear(source,limit){
 const attributes=Object.entries(source.attributes),values=Object.fromEntries(attributes.map(([name])=>[name,[]])),index=source.index;
 const vertex=i=>Object.fromEntries(attributes.map(([name,a])=>[name,Array.from({length:a.itemSize},(_,k)=>a.getComponent(i,k))]));
 const interpolate=(a,b,t)=>Object.fromEntries(attributes.map(([name])=>[name,a[name].map((n,k)=>n+(b[name][k]-n)*t)]));
 const total=index?index.count:source.attributes.position.count;
 for(let i=0;i<total;i+=3){const triangle=[0,1,2].map(k=>vertex(index?index.getX(i+k):i+k));
  // The front side portholes remain open. Keep roof above them, and the short
  // side return only behind the source dashboard's rear edge.
  for(const region of [[{axis:1,sign:-1,bound:-.30}],[{axis:1,sign:1,bound:.30},{axis:1,sign:-1,bound:.10},{axis:2,sign:-1,bound:-.48}]]){let polygon=triangle;
   for(const {axis,sign,bound}of[{axis:2,sign:1,bound:limit},...region]){const clipped=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],va=a.position[axis]*sign,vb=b.position[axis]*sign,insideA=va<=bound,insideB=vb<=bound;if(insideA)clipped.push(a);if(insideA!==insideB)clipped.push(interpolate(a,b,(bound-va)/(vb-va)));}polygon=clipped;}
   for(let j=1;j+1<polygon.length;j++)for(const v of[polygon[0],polygon[j],polygon[j+1]])for(const[name]of attributes)values[name].push(...v[name]);
  }
 }
 const geometry=new THREE.BufferGeometry();for(const[name,attribute]of attributes)geometry.setAttribute(name,new THREE.Float32BufferAttribute(values[name],attribute.itemSize,attribute.normalized));const p=geometry.attributes.position;for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)*(.90+.10*THREE.MathUtils.clamp((p.getZ(i)+.18)/(.68+.18),0,1)));geometry.normalizeNormals();geometry.computeBoundingBox();return geometry;
}
function makePilot(asset){
 if(!asset?.scene)throw new Error('Pilot station requires the approved full astronaut GLB');
 const root=new THREE.Group();root.name='cabin-pilot';const model=cloneRig(asset.scene);model.rotation.y=Math.PI;root.add(model);
 const bones={};model.traverse(o=>{if(o.isBone)bones[normalizeName(o.name)]=o;});root.updateMatrixWorld(true);
 const rest={};for(const [name,bone]of Object.entries(bones))rest[name]={q:bone.quaternion.clone(),p:bone.position.clone()};
 const mixer=new THREE.AnimationMixer(model),pilotClip=asset.animations.find(a=>a.name==='Pilot');if(!pilotClip)throw new Error('Cabin pilot requires Pilot clip');
 mixer.clipAction(pilotClip).play();mixer.setTime(0);model.updateMatrixWorld(true);const seated={};for(const [name,bone]of Object.entries(bones))seated[name]={q:bone.quaternion.clone(),p:bone.position.clone()};mixer.stopAllAction();
 const gripClip=asset.animations.find(a=>a.name==='Grip');if(gripClip){mixer.clipAction(gripClip).play();mixer.setTime(2);for(const[name,bone]of Object.entries(bones))if(/^(thumb|index|middle|ring|little)/.test(name))seated[name].q.copy(bone.quaternion);mixer.stopAllAction();}
 const body=[],arms=[];model.traverse(o=>{if(o.isSkinnedMesh)body.push(o);});
 for(const mesh of body){const geo=armsGeometry(mesh);if(!geo)continue;const fp=new THREE.SkinnedMesh(geo,mesh.material);fp.name='cabin-both-arms-first-person';fp.bind(mesh.skeleton,mesh.bindMatrix);fp.bindMatrixInverse.copy(mesh.bindMatrixInverse);fp.frustumCulled=false;fp.visible=false;mesh.parent.add(fp);arms.push(fp);mesh.frustumCulled=false;}
 const weapon=model.getObjectByName('Nova_Pulse_Gun');if(weapon)weapon.visible=false;
 const axis=new THREE.Vector3(1,0,0),worldQ=new THREE.Quaternion(),delta=new THREE.Quaternion();
 function turn(name,angle,rotationAxis=axis){const bone=bones[name];if(!bone)return;bone.getWorldQuaternion(worldQ);const local=rotationAxis.clone().applyQuaternion(worldQ.invert());delta.setFromAxisAngle(local,angle);bone.quaternion.multiply(delta);bone.updateWorldMatrix(false,true);}
 let time=0;
 return {group:root,model,bones,body,arms,rest,seated,weapon,
  update(dt,state,{firstPerson=false,reducedMotion=false}={}){
   time+=dt;root.position.set(state.position.x,state.position.y,state.position.z);root.rotation.y=state.yaw;
   for(const [name,bone]of Object.entries(bones)){bone.quaternion.copy(rest[name].q).slerp(seated[name].q,state.pose);bone.position.copy(rest[name].p).lerp(seated[name].p,state.pose);}
   root.updateMatrixWorld(true);
   if(state.pose<.98){const gain=(1-state.pose)*Math.min(1,state.speed/1.1),s=Math.sin(state.walkPhase),c=Math.cos(state.walkPhase);
    turn('thighL',s*.29*gain);turn('thighR',-s*.29*gain);turn('shinL',Math.max(0,-s)*.40*gain);turn('shinR',Math.max(0,s)*.40*gain);
    turn('upper_armL',-.12-s*.07*gain);turn('upper_armR',-.12+s*.07*gain);turn('forearmL',-.26);turn('forearmR',-.26);
    // Boots remain flat on stance; lift is small and deliberate under magnetic attachment.
    turn('footL',-.1*c*gain);turn('footR',.1*c*gain);
   }
   if(state.mode==='entering'||state.mode==='exiting'){turn('upper_armR',-.48*Math.sin(state.transition*Math.PI));turn('forearmR',-.45*Math.sin(state.transition*Math.PI));}
   if(!reducedMotion&&state.mode==='piloting')turn('chest',Math.sin(time*.8)*.002);
   for(const mesh of body)mesh.visible=!firstPerson;for(const mesh of arms)mesh.visible=firstPerson;
   root.updateMatrixWorld(true);
  },
  palm(side){const bone=bones['hand'+side];return bone?root.worldToLocal(bone.localToWorld(V(0,.055,0))):V();}
 };
}

// Compatibility export: the approved scope is now a pilot station, with a short approach only.
export function createWalkableCabin(assets){
 const group=new THREE.Group();group.name='original-cockpit-pilot-station';group.position.copy(CABIN_LAYOUT.origin);
 const ownedGeometry=new Set(),ownedMaterials=new Set();
 const mat=(color,roughness,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness});ownedMaterials.add(m);return m;};
 const ivory=mat(0xaaa99c,.66,.14),graphite=mat(0x242e33,.68,.35),rubber=mat(0x172125,.9),steel=mat(0x7e8584,.35,.8),textile=mat(0x424749,.94),red=mat(0x67302d,.62,.16);
 function mesh(name,geometry,material,pos,rotation){ownedGeometry.add(geometry);return addMesh(group,name,geometry,material,pos,rotation);}
 const box=(name,size,material,pos,rotation)=>mesh(name,roundedBox(...size),material,pos,rotation);
 const cylinder=(name,r1,r2,h,material,pos,rotation)=>mesh(name,new THREE.CylinderGeometry(r1,r2,h,48),material,pos,rotation);
 const source=assets['cabina-integrada']?.scene;if(!source)throw new Error('Pilot station requires the complete chosen cabin asset');
 const original=source.getObjectByName('original-command-deck-opened');if(!original)throw new Error('Missing complete original dashboard mesh');
 const dashboard=new THREE.Group();dashboard.name='complete-chosen-cabin';dashboard.scale.setScalar(CABIN_LAYOUT.dashboardScale);dashboard.position.set(0,1.05,0);group.add(dashboard);
 // Retain every triangle of the selected complete source mesh, including the surrounding walls and consoles.
 dashboard.add(original.clone(true));const glass=source.getObjectByName('Central_transparent_cockpit_glass')||source.getObjectByName('Central transparent cockpit glass');if(glass)dashboard.add(glass.clone(true));
 const existingWrap=source.getObjectByName('Curved_pilot_cabin_walls_and_ceiling');if(existingWrap){const wrap=existingWrap.clone(true);wrap.name='retained-cabin-ceiling-and-sides';wrap.traverse(mesh=>{if(mesh.isMesh){mesh.geometry=clipSourceAtRear(mesh.geometry,.68);ownedGeometry.add(mesh.geometry);}});dashboard.add(wrap);}
 for(const name of ['Forward_roof_closure_seal','Cabin_panel_gasket_-0.12','Cabin_panel_gasket_-0.5']){const seal=source.getObjectByName(name);if(seal){const retained=seal.clone(true);if(name==='Forward_roof_closure_seal'){retained.scale.x=.50;}dashboard.add(retained);}}
 const pilot=makePilot(assets['astronauta-armado']);group.add(pilot.group);for(const arms of pilot.arms)ownedGeometry.add(arms.geometry);
 const z=CABIN_LAYOUT.seat.z;
 box('magnetic-pilot-footplate',[1.72,.045,1.20],graphite,[.22,-.023,.80]);
 cylinder('seat-pedestal',.18,.27,.23,steel,[0,.115,z+.08]);cylinder('seat-height-column',.075,.075,.22,graphite,[0,.325,z+.08]);
 box('seat-shell',[.69,.13,.91],ivory,[0,.43,z+.11]);box('seat-cushion',[.58,.12,.55],textile,[0,.515,z-.035]);
 box('backpack-clearance-seat-back',[.71,.91,.15],ivory,[0,.89,z+.55],[.13,0,0]);box('seat-back-padding',[.59,.77,.11],textile,[0,.91,z+.455],[.13,0,0]);box('seat-headrest',[.42,.25,.12],rubber,[0,1.43,z+.53],[.1,0,0]);
 const folding=[];
 for(const side of[-1,1]){
  box('seat-bolster',[.055,.095,.49],red,[side*.285,.565,z-.01]);box('seat-harness',[.046,.64,.012],rubber,[side*.17,.94,z+.377],[.13,0,side*.08]);box('harness-buckle',[.075,.072,.024],steel,[side*.145,.66,z+.34]);
  cylinder('armrest-support',.024,.024,.37,steel,[side*.37,.69,z+.04]);const arm=box('armrest-padding',[.105,.08,.41],textile,[side*.37,.91,z-.04]);if(side===1)folding.push(arm);
  box('flush-magnetic-boot-plate',[.27,.018,.32],graphite,[side*.15,-.006,z-.42]);for(let i=0;i<6;i++)box('boot-plate-grip',[.235,.004,.011],steel,[side*.15,.005,z-.53+i*.04]);
  // Seat-mounted human-sized contacts keep the hands proportional while the full source consoles stay intact.
  box('pilot-stick-plinth',[.14,.05,.16],graphite,[side*.396,.887,z-.478]);cylinder('pilot-stick-shaft',.017,.020,.13,steel,[side*.396,.995,z-.478]);box('pilot-handgrip',[.046,.14,.052],rubber,[side*.396,1.068,z-.478],[.09,0,0]);box('pilot-thumb-switch',[.017,.016,.01],red,[side*.396,1.141,z-.50]);
 }
 for(let i=0;i<4;i++)box('cushion-stitch',[.50,.005,.008],rubber,[0,.577,z-.21+i*.1]);
 const holster=new THREE.Group();holster.name='cabin-weapon-holster';holster.position.set(-.50,.70,z+.38);group.add(holster);
 if(pilot.weapon){const weapon=pilot.weapon.clone(true);weapon.visible=true;weapon.position.set(0,0,0);weapon.rotation.set(0,0,Math.PI/2);weapon.scale.setScalar(.215);holster.add(weapon);}
 const cradle=new THREE.Mesh(roundedBox(.30,.08,.17),rubber);ownedGeometry.add(cradle.geometry);cradle.name='weapon-lock-cradle';cradle.position.set(0,-.06,.04);holster.add(cradle);
 const fill=new THREE.PointLight(0xcce2e6,.75,5,2);fill.position.set(0,1.85,1.5);group.add(fill);
 const anchors={seat:V(0,.54,z),eye:V(0,1.38,z-.1),entry:V(...Object.values(CABIN_LAYOUT.entry)),exit:V(...Object.values(CABIN_LAYOUT.access)),companion:V(-.85,1.2,1.45),leftGrip:V(-.396,1.068,z-.478),rightGrip:V(.396,1.068,z-.478),leftFoot:V(-.148,.007,z-.42),rightFoot:V(.148,.007,z-.42)};
 for(const[name,pos]of Object.entries(anchors)){const a=new THREE.Object3D();a.name='Cabin'+name[0].toUpperCase()+name.slice(1);a.position.copy(pos);group.add(a);anchors[name]=a;}
 let disposed=false;
 let lastState={mode:'piloting',position:{...CABIN_LAYOUT.seat},pose:1,yaw:0,speed:0,walkPhase:0};
 function cameraPose(state=lastState,{firstPerson=true,aspect=1.6,lookYaw=0,lookPitch=0}={}){
  const p=state.position;
  if(firstPerson){const portrait=aspect<.85,position=V(p.x,p.y+1.69,p.z+(portrait?.34:.06));const direction=V(-Math.sin(lookYaw)*Math.cos(lookPitch),Math.sin(lookPitch)-state.pose*.12,-Math.cos(lookYaw)*Math.cos(lookPitch));return{position,target:position.clone().add(direction),fov:portrait?96:70,near:.018};}
  const portrait=aspect<.85,side=state.mode==='standing'?-1:1,position=portrait?V(side*2.20,2.70,4.70):V(side*1.55,2.10,3.20),target=V(p.x*.4,1.0,.20);return{position,target,fov:portrait?82:61,near:.025};
 }
 return{group,pilot:pilot.group,rig:pilot,anchors,layout:CABIN_LAYOUT,dashboard,
  update(dt,state,{firstPerson=false,reducedMotion=false}={}){lastState=state;group.visible=state.mode!=='eva';pilot.update(dt,state,{firstPerson,reducedMotion});for(const arm of folding){arm.rotation.z=-(1-state.pose)*.80;arm.position.y=.91-(1-state.pose)*.18;}},
  cameraPose,
  contacts(){group.updateMatrixWorld(true);const result={};for(const[side,name]of[['L','leftGrip'],['R','rightGrip']]){const palm=pilot.bones['hand'+side].localToWorld(V(0,.055,0)),target=anchors[name].getWorldPosition(V());result[side]={palm:palm.toArray(),target:target.toArray(),error:palm.distanceTo(target)};}return result;},
  dispose(){if(disposed)return;disposed=true;for(const skeleton of new Set(pilot.body.map(mesh=>mesh.skeleton)))skeleton.dispose();for(const geometry of ownedGeometry)geometry.dispose();for(const material of ownedMaterials)material.dispose();group.removeFromParent();}
 };
}

// Shared only by the owned interaction-arm adapter; the cloned skeleton owns its GPU texture.
export { cloneRig };
