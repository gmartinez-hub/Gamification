import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {fractureGeometry,createDestruction} from '../src/lowpoly/destruction.js';
import {createEffects} from '../src/lowpoly/effects.js';
test('full real Meshy asteroid retains exterior and closes locally, with depth occlusion',async()=>{
 const bytes=await readFile(new URL('../assets/runtime/models/asteroide-base.glb',import.meta.url)),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
 delete json.images;delete json.textures;delete json.materials;for(const mesh of json.meshes)for(const p of mesh.primitives)delete p.material;
 json.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+length).toString('base64');globalThis.ProgressEvent??=class {constructor(type,data){Object.assign(this,data)}};
 const gltf=await new GLTFLoader().parseAsync(JSON.stringify(json),'');let mesh;gltf.scene.traverse(o=>{if(o.isMesh)mesh=o});
 const source=mesh.geometry,position=source.attributes.position,triangles=(source.index?.count||position.count)/3;assert.equal(triangles,205612);
 const f=fractureGeometry(source),p=f.geometry.attributes.position,id=f.geometry.attributes.fractureId;
 const box=new THREE.Box3().setFromBufferAttribute(position),centre=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length()/2;
 for(let i=0;i<triangles*3;i++){const s=source.index?source.index.getX(i):i;for(let a=0;a<3;a++)assert.equal(p.array[i*3+a],position.array[s*3+a]);}
 for(let i=triangles*3;i<p.count;i+=3){const apex=new THREE.Vector3().fromBufferAttribute(p,i+2);assert(apex.distanceTo(centre)>radius*.2,'cut apex must not create a fan to the global core');assert(apex.distanceTo(f.centroids[id.getX(i)])<1e-5);}
 const scene=new THREE.Scene(),d=createDestruction(scene);d.burst({object:gltf.scene,id:'real',radius:1},0);const material=scene.getObjectByName('fractured-real').material;
 assert.equal(material.depthWrite,true);assert.equal(material.transparent,false);assert.equal(material.alphaHash,true);d.dispose();f.geometry.dispose();
});
test('docking produces short soft sparks without opaque mineral chunks',()=>{
 const scene=new THREE.Scene(),fx=createEffects(scene);fx.burst(new THREE.Vector3(),'attach',0);fx.update(.2);
 const slot=scene.getObjectByName('legacy-atlas-effects').children.find(o=>o.visible);assert(slot);assert.equal(slot.getObjectByName('mineral-fragments').count,0);
 fx.update(.6);assert.equal(slot.visible,false);fx.dispose();
});
test('fracture cut faces use their own matte grain instead of borrowed exterior maps',()=>{
 const scene=new THREE.Scene(),object=new THREE.Group();object.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial()));const d=createDestruction(scene);d.burst({id:'surface',object,radius:1},0);
 const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};scene.getObjectByName('fractured-surface').material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.fractureCutNormals.value.length,24);assert.match(shader.fragmentShader,/normal=normalize\(mix\(normal,normalize\(gzCutNormal\),gzInterior\)\)/);assert.match(shader.fragmentShader,/gzCutGrain/);assert.match(shader.fragmentShader,/metalnessFactor=mix\(metalnessFactor,0\.,gzInterior\)/);assert.match(shader.fragmentShader,/roughnessFactor=mix\(roughnessFactor,\.96,gzInterior\)/);d.dispose();
});
test('collection and gem glow are points, never solid chunks around the actual gem',()=>{
 for(const kind of ['collect','gem']){const scene=new THREE.Scene(),fx=createEffects(scene);fx.burst(new THREE.Vector3(),kind,0);fx.update(.2);const slot=scene.getObjectByName('legacy-atlas-effects').children.find(o=>o.visible);assert.equal(slot.getObjectByName('mineral-fragments').count,0);assert(slot.getObjectByName('impact-dust').material.size<=.04);fx.dispose();}
});
