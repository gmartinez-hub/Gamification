import assert from 'node:assert/strict';
import test from 'node:test';
import * as effects from '../src/lowpoly/effects.js';

test('impact atlas advances in top-left row order without wrapping on its final frame', () => {
  assert.equal(typeof effects.atlasFrame, 'function');
  const frame = {};
  const sample = progress => effects.atlasFrame(4, 4, progress, frame);
  assert.equal(sample(0), frame, 'reuse the supplied frame object');
  assert.deepEqual(frame, { frame: 0, x: 0, y: .75, width: .25, height: .25 });
  assert.deepEqual(sample(.26), { frame: 4, x: 0, y: .5, width: .25, height: .25 });
  assert.deepEqual(sample(.999), { frame: 15, x: .75, y: 0, width: .25, height: .25 });
  assert.deepEqual(sample(1), { frame: 15, x: .75, y: 0, width: .25, height: .25 });
});

test('scan strips use horizontal quarters and clamp pre-start or late samples', () => {
  const frame = {};
  assert.deepEqual(effects.atlasFrame(4, 1, -.1, frame), { frame: 0, x: 0, y: 0, width: .25, height: 1 });
  assert.deepEqual(effects.atlasFrame(4, 1, .5, frame), { frame: 2, x: .5, y: 0, width: .25, height: 1 });
  assert.deepEqual(effects.atlasFrame(4, 1, 2, frame), { frame: 3, x: .75, y: 0, width: .25, height: 1 });
});

test('optional atlas effects remain safe without a DOM and dispose their owned billboards', async () => {
  const { Scene, Vector3 } = await import('../vendor/three.module.js');
  const scene = new Scene();
  const fx = effects.createEffects(scene);
  const root = scene.getObjectByName('legacy-atlas-effects');
  assert.equal(root.children.length, 4, 'effect pool remains bounded');
  let disposedTextures = 0, disposedMaterials = 0;
  for (const group of root.children) {
    const sprite=group.children.find(object=>object.isSprite);
    sprite.material.map.addEventListener('dispose', () => disposedTextures++);
    sprite.material.addEventListener('dispose', () => disposedMaterials++);
  }
  assert.equal(fx.burst(new Vector3(), 'gem', 1), true);
  assert.equal(fx.burst(new Vector3(), 'unknown', 1), false);
  assert.equal(fx.burst(new Vector3(NaN,0,0), 'ship', 1), false);
  assert.equal(fx.burst(new Vector3(), 'ship', Infinity), false);
  fx.update(1.1, null);
  assert.ok(root.children.every(group => group.children.filter(object=>object.isSprite).every(sprite=>!sprite.visible)), 'unloaded atlas never displays a solid rectangle');
  fx.update(20, null, { reducedMotion: true });
  fx.dispose(); fx.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(disposedTextures, 4);
  assert.equal(disposedMaterials, 4);
  assert.equal(fx.burst(new Vector3(), 'scan', 21), false);
});


test('milestone effects share a bounded pool and reduced motion suppresses fragments', async () => {
  const {Scene,Vector3,PerspectiveCamera}=await import('../vendor/three.module.js');
  const scene=new Scene(),fx=effects.createEffects(scene),camera=new PerspectiveCamera();
  for(const kind of ['eva','ship','gem','warp','attach'])assert.equal(fx.burst(new Vector3(1,2,3),kind,0),true);
  assert.equal(fx.collect(new Vector3(),new Vector3(2,1,4),0),true);
  assert.equal(fx.collect(new Vector3(),new Vector3(NaN,0,0),0),false);
  fx.update(.6,camera,{reducedMotion:true});
  const root=scene.getObjectByName('legacy-atlas-effects');
  assert.equal(root.children.length,4);
  for(const group of root.children){
    assert.equal(group.getObjectByName('mineral-fragments').visible,false);
    assert.ok(group.getObjectByName('curved-energy-waves').material.opacity<=.1);
  }
  fx.update(.7,camera);
  assert.ok(root.children.every(group=>group.getObjectByName('mineral-fragments').visible));
  fx.update(10,camera);assert.ok(root.children.every(group=>!group.visible));fx.dispose();
});
