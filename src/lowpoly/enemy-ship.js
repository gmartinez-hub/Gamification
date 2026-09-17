import * as THREE from '../../vendor/three.module.js';
import { createPropulsion } from './plasma.js';

// Full original modular hull measured at 12.866750 m (excluding plume/cannon).
export const ENEMY_SHIP_LENGTH = 25.7335000634;
export function createEnemyShip(asset) {
  const group=new THREE.Group();group.name='alien-carrier';
  const visual=new THREE.Group();group.add(visual);
  const model=asset.scene.clone(true),box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const scale=ENEMY_SHIP_LENGTH/size.z;
  model.rotation.y=Math.PI;model.scale.setScalar(scale);
  model.position.copy(center).multiplyScalar(-scale).applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI);
  visual.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  // Orthographic rear overlays locate the two central bells. Surface ray hits
  // put their outlet planes at z=-.343895 and about -.1587 in source space;
  // a .004 outward offset keeps each plume just outside the recessed surface.
  const nozzles=[];
  for(const [index,y,z,radius]of [[0,.2245,-.3479,.029],[1,.112,-.1627,.025]]){
    const source=new THREE.Mesh(new THREE.ConeGeometry(.32,1,16),new THREE.MeshBasicMaterial());
    source.name=`alien-engine-${index}-exhaust`;source.rotation.x=Math.PI/2;
    source.position.set(center.x*scale,(y-center.y)*scale,-(z-center.z)*scale+.5);
    source.userData.radius=radius*scale;source.userData.power=0;visual.add(source);nozzles.push(source);
  }
  // Central forward aperture: source surface ray hits z=.328337 at y=.16.
  // Launch .010 beyond that opening, instead of from the distant claw-tip bounds.
  const muzzle=new THREE.Object3D();muzzle.name='AlienShipMuzzle';muzzle.position.set(center.x*scale,(.16-center.y)*scale,-(.33834-center.z)*scale);visual.add(muzzle);
  const exhaust=createPropulsion(group,{gain:1});
  function update(time,entity,{dt=1/60,reducedMotion=false}={}){
    for(const source of nozzles)source.userData.power=Math.max(.22,Math.min(1,entity.thrust||0));
    visual.rotation.z=reducedMotion?0:Math.sin(time*.65+entity.age*.2)*.035;
    exhaust.update(time,{dt,velocity:entity.velocity,thrust:entity.thrust,boost:entity.phase==='retreat',reducedMotion});
  }
  function dispose(){exhaust.dispose();group.removeFromParent();for(const source of nozzles){source.geometry.dispose();source.material.dispose();}}
  return {group,muzzle,update,reset:()=>exhaust.reset(),dispose,length:ENEMY_SHIP_LENGTH};
}
