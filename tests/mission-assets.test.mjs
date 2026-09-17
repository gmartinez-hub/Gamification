import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createMissionAssetTemplates, loadMissionAssets } from '../src/lowpoly/mission-assets.js';

function source(width,height,depth) {
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width,height,depth), new THREE.MeshStandardMaterial());
  scene.add(mesh); return { scene, animations: [] };
}
test('both weapons reuse one projectile geometry with uniform scale and its nose along local negative Z', () => {
  const projectile=source(2,.4,.5), gem=source(.6,2,.4);
  const original=projectile.scene.children[0].geometry;
  const templates=createMissionAssetTemplates({ gem, projectile });
  const eva=templates.createProjectile('astronaut'), ship=templates.createProjectile('ship');
  assert.equal(eva.children[0].children[0].geometry, original);
  assert.equal(ship.children[0].children[0].geometry, original);
  for(const group of [eva,ship]) {
    const size=new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
    assert(size.z>size.x*3 && size.z>size.y*3);
    assert.equal(group.scale.x,group.scale.y); assert.equal(group.scale.y,group.scale.z);
    assert(group.userData.noseAxis.equals(new THREE.Vector3(0,0,-1)));
  }
  assert(ship.scale.x>eva.scale.x);
  assert.equal(projectile.scene.scale.x,1, 'template normalization does not mutate source');
});
test('gem template fits a handheld scale and copies retain source geometry without changing the metal source material', () => {
  const gem=source(.6,2,.4), projectile=source(2,.4,.5);
  const material=gem.scene.children[0].material;
  const templates=createMissionAssetTemplates({gem,projectile});
  const group=templates.createGem();
  const bounds=new THREE.Box3().setFromObject(group);
  assert(bounds.max.y-bounds.min.y>.2 && bounds.max.y-bounds.min.y<.35, 'relic fits the open glove without changing scale on pickup');
  assert.equal(gem.scene.children[0].material, material);
  assert.equal(group.children[0].children[0].geometry,gem.scene.children[0].geometry);
  assert.equal(material.isMeshStandardMaterial,true);
});

test('mission models may be streamed independently without requesting the hidden companion asset', async () => {
  const urls=[];
  const loader={async loadAsync(url){urls.push(url);return source(1,1,1);}};
  const projectile=await loadMissionAssets({only:['projectile'],loader,mobile:true});
  assert.deepEqual(Object.keys(projectile),['projectile']);
  assert.equal(urls.length,1);
  assert.match(urls[0],/mission-models\/proyectil\.glb$/);
  const templates=createMissionAssetTemplates(projectile);
  assert.doesNotThrow(()=>templates.createProjectile('astronaut'));
  assert.throws(()=>templates.createGem(),/gem model is not loaded/i);
});

test('an unknown staged mission model is rejected before network work starts', async () => {
  let calls=0;
  await assert.rejects(loadMissionAssets({only:['unknown'],loader:{async loadAsync(){calls++;}}}),/Unknown mission asset/);
  assert.equal(calls,0);
});
