import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createCloseoutActors, loadCloseoutAssets } from '../src/lowpoly/closeout-assets.js';

test('closeout models load only from their staged runtime directory', async () => {
  const urls=[];const loader={async loadAsync(url){urls.push(url);const scene=new THREE.Group();scene.name=url;return {scene,animations:[]};}};
  const assets=await loadCloseoutAssets({loader,mobile:true});
  assert.deepEqual(Object.keys(assets),['greenAlly','energyCell','turret','hangar']);
  assert.equal(urls.length,4);assert.ok(urls.every(url=>url.includes('/closeout-models/')));
});

test('closeout actor factory exposes real turret pivots, hangar service anchors and crew animation state', () => {
  const model=name=>{const scene=new THREE.Group();scene.name=name;scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));return {scene,animations:[]};};
  const assets={greenAlly:model('ally'),energyCell:model('cell'),turret:model('turret'),hangar:model('hangar')};
  assets.turret.scene.add(Object.assign(new THREE.Group(),{name:'turret-yaw'}));
  assets.turret.scene.add(Object.assign(new THREE.Group(),{name:'turret-muzzle'}));
  assets.hangar.scene.add(Object.assign(new THREE.Group(),{name:'service-long-ship'}));
  const actors=createCloseoutActors(assets);
  assert.equal(actors.turret.group.name,'modular-turret');assert.ok(actors.turret.muzzle);
  assert.ok(actors.hangar.service);assert.equal(actors.ally.group.name,'green-ally');
  assert.doesNotThrow(()=>actors.dispose());
});
