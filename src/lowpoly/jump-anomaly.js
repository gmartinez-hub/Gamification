import * as THREE from '../../vendor/three.module.js';

export function createJumpAnomaly() {
  const group=new THREE.Group();group.name='jump-anomaly';group.visible=false;
  const horizon=new THREE.Mesh(new THREE.SphereGeometry(3.4,48,32),new THREE.MeshBasicMaterial({color:0x010108}));
  horizon.name='jump-event-horizon';group.add(horizon);
  const discMaterial=new THREE.MeshBasicMaterial({color:0x84ecff,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false});
  const disc=new THREE.Mesh(new THREE.RingGeometry(3.7,7.8,96,5),discMaterial);disc.name='jump-accretion-disc';disc.rotation.x=1.24;group.add(disc);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(4.15,.22,16,96),new THREE.MeshBasicMaterial({color:0xa78cff,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false}));
  halo.name='jump-lensing-halo';halo.rotation.x=Math.PI/2;group.add(halo);
  const light=new THREE.PointLight(0x89ddff,4,34,2);light.position.z=2;group.add(light);
  let disposed=false;
  return {group,setActive(value){group.visible=!!value;},update(time,dt,{reducedMotion=false}={}){
    if(!group.visible||reducedMotion)return;
    group.rotation.z+=Math.min(.05,Math.max(0,dt))*.22;disc.rotation.z=-time*.32;halo.rotation.z=time*.13;
    discMaterial.opacity=.58+Math.sin(time*2.3)*.12;
  },dispose(){if(disposed)return;disposed=true;group.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});group.removeFromParent();}};
}
