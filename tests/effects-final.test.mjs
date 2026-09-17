import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import * as effects from '../src/lowpoly/effects.js';
import {createDestruction} from '../src/lowpoly/destruction.js';
test('effect saturation queues milestones without evicting active events; reset clears all',()=>{
 const scene=new THREE.Scene(),fx=effects.createEffects(scene);const root=scene.getObjectByName('legacy-atlas-effects');
 for(let i=0;i<4;i++)fx.burst(new THREE.Vector3(i,0,0),'gem',0);
 fx.update(.1);const positions=root.children.map(g=>g.position.x);
 fx.burst(new THREE.Vector3(40,0,0),'ship',.1);fx.update(.2);assert.deepEqual(root.children.map(g=>g.position.x),positions);
 fx.update(2.1);assert.ok(root.children.some(g=>g.visible&&g.position.x===40));fx.reset();assert.ok(root.children.every(g=>!g.visible));fx.dispose();
});
test('impact particles inherit world velocity and collect follows a moving hand',()=>{
 const scene=new THREE.Scene(),fx=effects.createEffects(scene),root=scene.getObjectByName('legacy-atlas-effects');
 fx.burst(new THREE.Vector3(1,0,0),'ship',0,{velocity:new THREE.Vector3(4,2,0)});fx.update(.5);
 assert.ok(root.children[0].position.distanceTo(new THREE.Vector3(3,1,0))<1e-8);
 let hand=new THREE.Vector3(2,1,0);assert.equal(fx.collect(new THREE.Vector3(),()=>hand,0),true);fx.update(.5);
 const initial=root.children[1].position.x;hand.x=9;fx.update(.6);assert.ok(root.children[1].position.x>initial);
 assert.equal(root.children[0].getObjectByName('curved-energy-waves').count,0);fx.dispose();
});
test('projectile uses supplied shared model and keeps emitted trail in world space',()=>{
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial();let releases=0;
 geometry.addEventListener('dispose',()=>releases++);material.addEventListener('dispose',()=>releases++);
 const templates={createProjectile(actor){const g=new THREE.Group();g.name=actor;g.add(new THREE.Mesh(geometry,material));return g;}};
 const v=effects.createProjectileVisual(templates,'ship');v.update(new THREE.Vector3(),new THREE.Vector3(0,0,-1),.03);
 v.update(new THREE.Vector3(10,0,0),new THREE.Vector3(1,0,0),.03);
 const trail=v.group.getObjectByName('projectile-world-trail');assert.ok(trail.geometry.attributes.position.array[0]<1);
 v.reset();assert.equal(v.group.visible,false);v.dispose();v.dispose();assert.equal(releases,0);geometry.dispose();material.dispose();
});
test('fracture inherits target translation in world space and releases only its own resources',()=>{
 const scene=new THREE.Scene(),body=new THREE.Group(),object=new THREE.Group(),g=new THREE.IcosahedronGeometry(1,1),mat=new THREE.MeshStandardMaterial();
 body.add(new THREE.Mesh(g,mat));object.add(body);object.position.set(7,2,1);object.scale.setScalar(3);object.rotation.y=1;scene.add(object);object.userData.body=body;
 let disposed=0;g.addEventListener('dispose',()=>disposed++);mat.addEventListener('dispose',()=>disposed++);
 const d=createDestruction(scene);const rec={object,id:'a',radius:3,velocity:new THREE.Vector3(2,0,-1)};d.burst(rec,0);d.update(1);
 const mesh=scene.getObjectByName('fractured-a');assert.ok(new THREE.Vector3().setFromMatrixPosition(mesh.matrix).distanceTo(new THREE.Vector3(9,2,0))<1e-8);
 d.reset();assert.equal(scene.getObjectByName('closed-mineral-fractures').children.length,0);d.dispose();d.dispose();assert.equal(disposed,0);g.dispose();mat.dispose();
});
test('transit field disappears immediately and the delta API shares the absolute clock',()=>{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),fx=effects.createEffects(scene);
 fx.burst(new THREE.Vector3(),'eva',0);fx.advance(.3,camera,{travel:.8});assert.equal(scene.getObjectByName('transit-star-drift').visible,true);
 fx.advance(1,camera,{travel:0});assert.equal(scene.getObjectByName('transit-star-drift').visible,false);
 assert.ok(scene.getObjectByName('legacy-atlas-effects').children.every(g=>!g.visible));fx.dispose();
});
test('queued fracture captures the impact transform and does not replay long-expired bursts',()=>{
 const scene=new THREE.Scene(),object=new THREE.Group(),g=new THREE.IcosahedronGeometry(1,0),mat=new THREE.MeshStandardMaterial();object.add(new THREE.Mesh(g,mat));scene.add(object);
 const d=createDestruction(scene);for(let i=0;i<9;i++){object.position.x=i;d.burst({object,id:String(i),radius:1},0);}
 object.position.x=100;d.update(3.7);const delayed=scene.getObjectByName('fractured-8');assert.ok(delayed);assert.equal(delayed.matrix.elements[12],8);
 d.reset();for(let i=0;i<9;i++)d.burst({object,id:String(i),radius:1},0);d.update(20);assert.equal(scene.getObjectByName('closed-mineral-fractures').children.length,0);
 d.dispose();g.dispose();mat.dispose();
});
test('late atlas completion cannot double-dispose already released texture owners',t=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{}});
 t.after(()=>{if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;});
 const callbacks=[],textures=[],counts=[];
 t.mock.method(THREE.TextureLoader.prototype,'load',(url,onLoad)=>{const texture=new THREE.Texture();const index=textures.length;counts[index]=0;texture.addEventListener('dispose',()=>counts[index]++);textures.push(texture);callbacks.push(()=>onLoad(texture));return texture;});
 const fx=effects.createEffects(new THREE.Scene());fx.dispose();callbacks.forEach(fn=>fn());assert.deepEqual(counts,[1,1,1]);
});
test('EVA shot gains a compact luminous flight cue without changing the shared projectile or ship visuals',()=>{
 const geometry=new THREE.BoxGeometry(.08,.08,.24),material=new THREE.MeshStandardMaterial(),templates={createProjectile(){return new THREE.Mesh(geometry,material)}};
 const eva=effects.createProjectileVisual(templates,'astronaut'),ship=effects.createProjectileVisual(templates,'ship');
 const cue=eva.group.getObjectByName('eva-projectile-glow');assert.ok(cue,'EVA needs an additive cue visible around the dark original body');assert.equal(ship.group.getObjectByName('eva-projectile-glow'),undefined);
 eva.update(new THREE.Vector3(1,2,3),new THREE.Vector3(0,0,-1),.016);assert.ok(cue.position.distanceTo(eva.model.position)<1e-8);assert.ok(cue.scale.x>=.18&&cue.scale.x<=.3);assert.equal(eva.model.geometry,geometry);assert.equal(eva.model.material,material);
 assert.ok(eva.group.getObjectByName('projectile-world-trail').material.size>=.06);assert.equal(ship.group.getObjectByName('projectile-world-trail').material.size,.11);
 let disposed=0;cue.material.map.addEventListener('dispose',()=>disposed++);eva.dispose();eva.dispose();assert.equal(disposed,1);ship.dispose();
});
test('EVA muzzle flash never throws mineral chunks or opaque-sized dust across the first-person sightline',()=>{
 const scene=new THREE.Scene(),fx=effects.createEffects(scene);fx.burst(new THREE.Vector3(),'evaMuzzle',0);fx.update(.05);
 const slot=scene.getObjectByName('legacy-atlas-effects').children.find(o=>o.visible);assert.equal(slot.getObjectByName('mineral-fragments').count,0);const dust=slot.getObjectByName('impact-dust');assert.ok(dust.material.size<=.02);
 const p=dust.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(new THREE.Vector3().fromBufferAttribute(p,i).length()<.1);fx.dispose();
});
