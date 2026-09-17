import * as THREE from '../../vendor/three.module.js';
import {cloneRig} from './cabin.js';

// Derive the left sleeve/glove from the approved skin. Attributes and materials
// remain shared; this adapter owns the filtered index and cloned skeleton only.
function leftGeometry(mesh){
 const source=mesh.geometry,weights=source.attributes.skinWeight,joints=source.attributes.skinIndex,index=source.index;
 if(!index||!weights||!joints)return null;
 const left=new Uint8Array(source.attributes.position.count);
 for(let i=0;i<left.length;i++){let weight=0;for(let j=0;j<4;j++){const name=mesh.skeleton.bones[joints.getComponent(i,j)]?.name.replaceAll('.','')||'';if(/^(upper_arm|forearm|hand|thumb|index|middle|ring|little)/.test(name)&&name.endsWith('L'))weight+=weights.getComponent(i,j);}left[i]=weight>.55;}
 const keep=[];for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);if(left[a]&&left[b]&&left[c])keep.push(a,b,c);}
 if(!keep.length)return null;const geometry=new THREE.BufferGeometry();for(const[name,attribute]of Object.entries(source.attributes))geometry.setAttribute(name,attribute);geometry.setIndex(keep);return geometry;
}
const contactCache=new WeakMap();
function leftHandContact(root){
 if(contactCache.has(root))return contactCache.get(root);
 root.updateWorldMatrix(true,false);root.updateMatrixWorld(true);
 const hand=root.getObjectByName('handL')||root.getObjectByName('hand.L');if(!hand)throw new Error('Missing anatomical left hand');
 const localPoint=name=>{const bone=root.getObjectByName(name);if(!bone)throw new Error('Missing '+name);return hand.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));};
 const index=localPoint('index01L'),middle=localPoint('middle01L'),little=localPoint('little01L'),ring=localPoint('ring01L');
 // For the anatomical LEFT hand, wrist→fingers × little→index points out
 // of the palm. With palm up and fingers forward, the thumb stays outward (left).
 const across=index.clone().sub(little).normalize(),normal=middle.clone().cross(across).normalize(),forward=across.clone().cross(normal).normalize();
 const sourceFrame=new THREE.Matrix4().makeBasis(across.clone().negate(),normal,forward.clone().negate()),rotation=new THREE.Quaternion().setFromRotationMatrix(sourceFrame).invert();
 const center=index.clone().add(middle).add(ring).add(little).multiplyScalar(.60/4),depths=[];
 root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();const weights=mesh.geometry.attributes.skinWeight,joints=mesh.geometry.attributes.skinIndex;if(!weights||!joints)return;
  for(let i=0;i<weights.count;i++){let influence=0;for(let j=0;j<4;j++)if(mesh.skeleton.bones[joints.getComponent(i,j)]===hand)influence+=weights.getComponent(i,j);if(influence<.45)continue;
   const p=hand.worldToLocal(mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld)).sub(center);if(Math.abs(p.dot(across))<.022&&Math.abs(p.dot(forward))<.024&&Math.abs(p.dot(normal))<.06)depths.push(p.dot(normal));
  }
 });
 if(!depths.length)throw new Error('Could not locate source palm surface');depths.sort((a,b)=>a-b);
 const surfaceDepth=depths[Math.floor((depths.length-1)*.95)],palm=new THREE.Object3D();palm.name='InteractionPalm';palm.position.copy(center).addScaledVector(normal,surfaceDepth+.003);hand.add(palm);
 palm.userData.anatomy={side:'left',normal:normal.toArray(),across:across.toArray(),forward:forward.toArray(),surfaceSamples:depths.length,surfaceDepth};
 const contact={hand,palm,rotation};contactCache.set(root,contact);return contact;
}
/** Call AFTER the full actor's animator during scan/collection/carry. It changes
 * only the anatomical left wrist, leaving the right weapon hand untouched.
 * Returns a surface-calibrated palm anchor; a centered .28m gem needs +.14m
 * along frame-local UP so its base rests on that anchor. */
export function poseHeldLeftHand(root,{frame=root}={}){
 const contact=leftHandContact(root),world=frame.getWorldQuaternion(new THREE.Quaternion()).multiply(contact.rotation),parent=contact.hand.parent.getWorldQuaternion(new THREE.Quaternion());
 contact.hand.quaternion.copy(parent.invert().multiply(world));contact.hand.updateWorldMatrix(false,true);return contact.palm;
}
export function createInteractionArm(assets){
 const source=assets['astronauta-armado'];if(!source?.scene)throw new Error('Interaction arm requires the approved full astronaut');
 const clip=source.animations.find(a=>a.name==='Scan');if(!clip)throw new Error('Interaction arm requires Scan clip');
 const group=new THREE.Group();group.name='first-person-left-interaction-arm';group.visible=false;
 const model=cloneRig(source.scene);model.rotation.y=Math.PI;model.position.set(0,-1.69,.16);group.add(model);
 const ownedGeometry=new Set(),ownedSkeletons=new Set(),sourceMeshes=[];model.traverse(o=>{if(o.isMesh)sourceMeshes.push(o);});
 for(const mesh of sourceMeshes){if(mesh.isSkinnedMesh){ownedSkeletons.add(mesh.skeleton);const geometry=leftGeometry(mesh);if(geometry){ownedGeometry.add(geometry);const arm=new THREE.SkinnedMesh(geometry,mesh.material);arm.name='approved-left-sleeve-and-glove';arm.position.copy(mesh.position);arm.quaternion.copy(mesh.quaternion);arm.scale.copy(mesh.scale);arm.bind(mesh.skeleton,mesh.bindMatrix);arm.bindMatrixInverse.copy(mesh.bindMatrixInverse);arm.frustumCulled=false;mesh.parent.add(arm);}}mesh.removeFromParent();}
 model.getObjectByName('Nova_Pulse_Gun')?.removeFromParent();
 const mixer=new THREE.AnimationMixer(model);mixer.clipAction(clip).play();mixer.setTime(Math.min(.8,clip.duration));let disposed=false;
 const {hand,palm,rotation:flatHand}=leftHandContact(group);
 const scanPose=[];model.traverse(bone=>{if(bone.isBone)scanPose.push({bone,q:bone.quaternion.clone(),p:bone.position.clone()});});
 const shoulder=model.getObjectByName('upper_armL'),elbow=model.getObjectByName('forearmL');
 const point=()=>new THREE.Vector3(),s=point(),e=point(),w=point(),target=point(),direction=point(),down=point(),elbowTarget=point(),offset=point();
 const parentQ=new THREE.Quaternion(),boneQ=new THREE.Quaternion(),delta=new THREE.Quaternion(),handQ=new THREE.Quaternion();
 function rotateToward(bone,child,target){const origin=bone.getWorldPosition(point()),a=child.getWorldPosition(point()).sub(origin).normalize(),b=target.clone().sub(origin).normalize();delta.setFromUnitVectors(a,b);bone.getWorldQuaternion(boneQ);bone.parent.getWorldQuaternion(parentQ);bone.quaternion.copy(parentQ.invert().multiply(delta).multiply(boneQ));bone.updateWorldMatrix(false,true);}
 function reach(aspect,breathe){
  group.updateWorldMatrix(true,true);shoulder.getWorldPosition(s);elbow.getWorldPosition(e);hand.getWorldPosition(w);
  const upper=s.distanceTo(e),lower=e.distanceTo(w);group.getWorldQuaternion(handQ);handQ.multiply(flatHand);
  target.set(aspect<.85?-.075:-.28,-.17+breathe,-.46);group.localToWorld(target);offset.copy(palm.position).applyQuaternion(handQ);target.sub(offset);
  direction.subVectors(target,s);const distance=THREE.MathUtils.clamp(direction.length(),Math.abs(upper-lower)+.001,upper+lower-.001);direction.normalize();target.copy(s).addScaledVector(direction,distance);
  down.set(0,-1,0).applyQuaternion(group.getWorldQuaternion(new THREE.Quaternion()));down.addScaledVector(direction,-down.dot(direction)).normalize();
  const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));elbowTarget.copy(s).addScaledVector(direction,along).addScaledVector(down,height);
  rotateToward(shoulder,elbow,elbowTarget);rotateToward(elbow,hand,target);hand.parent.getWorldQuaternion(parentQ);hand.quaternion.copy(parentQ.invert().multiply(handQ));hand.updateWorldMatrix(false,true);
 }
 function update(time=0,{interacting=false,reducedMotion=false,aspect=1.6}={}){
  if(disposed)return;group.visible=!!interacting;
  // Keep the approved Scan pose, adapting only shoulder/elbow/wrist reach to
  // this camera. Bone lengths and the original glove/sleeve are unchanged.
  for(const{bone,q,p}of scanPose){bone.quaternion.copy(q);bone.position.copy(p);}
  const breathe=reducedMotion?0:Math.sin((Number.isFinite(time)?time:0)*1.2)*.006;reach(aspect,breathe);group.updateWorldMatrix(true,true);
 }
 update(0);
 return{group,palm,update,dispose(){if(disposed)return;disposed=true;group.removeFromParent();mixer.stopAllAction();mixer.uncacheRoot(model);for(const geometry of ownedGeometry)geometry.dispose();for(const skeleton of ownedSkeletons)skeleton.dispose();}};
}
