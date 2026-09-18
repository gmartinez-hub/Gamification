import * as THREE from '../../vendor/three.module.js';
import { loadModelSet, releaseModelAssets } from './asset-loading.js';

const files={greenAlly:'green-ally',energyCell:'energy-cell',turret:'modular-turret',hangar:'orbital-service-bay'};

export function loadCloseoutAssets(options={}) {
  return loadModelSet(Object.entries(files),{...options,directory:'closeout-models'});
}

export function createCloseoutActors(assets) {
  const allyGroup=assets.greenAlly.scene;allyGroup.name='green-ally';
  const allyMixer=new THREE.AnimationMixer(allyGroup);
  const actions=Object.fromEntries((assets.greenAlly.animations||[]).map(clip=>[clip.name,allyMixer.clipAction(clip)]));
  const play=name=>{for(const action of Object.values(actions))action.fadeOut(.18);actions[name]?.reset().fadeIn(.18).play();};
  play('AllyIdle');
  const turretGroup=assets.turret.scene;turretGroup.name='modular-turret';
  const turret={group:turretGroup,yaw:turretGroup.getObjectByName('turret-yaw')||turretGroup,
    pitch:turretGroup.getObjectByName('turret-pitch')||turretGroup,muzzle:turretGroup.getObjectByName('turret-muzzle')||turretGroup};
  const hangarGroup=assets.hangar.scene;hangarGroup.name='orbital-service-bay';
  const hangar={group:hangarGroup,service:hangarGroup.getObjectByName('service-long-ship')||hangarGroup,
    bike:hangarGroup.getObjectByName('service-bike')||hangarGroup,crew:hangarGroup.getObjectByName('service-crew')||hangarGroup};
  const energyCell=assets.energyCell.scene;energyCell.name='energy-cell';
  let disposed=false;
  return {
    ally:{group:allyGroup,mixer:allyMixer,actions,play,muzzle:allyGroup.getObjectByName('WeaponMuzzle')||allyGroup.getObjectByName('weapon-muzzle')||allyGroup,update(dt){allyMixer.update(dt);}},turret,hangar,energyCell,
    createTurretClone(){const group=turretGroup.clone(true);return {group,yaw:group.getObjectByName('turret-yaw')||group,pitch:group.getObjectByName('turret-pitch')||group,muzzle:group.getObjectByName('turret-muzzle')||group};},
    dispose(){if(disposed)return;disposed=true;allyMixer.stopAllAction();for(const group of [allyGroup,turretGroup,hangarGroup,energyCell])group.removeFromParent();releaseModelAssets(assets);},
  };
}
