import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.mjs';
const root=new URL('../assets/runtime/',import.meta.url);
const hash=b=>createHash('sha256').update(b).digest('hex');
const parse=bytes=>{const n=bytes.readUInt32LE(12);return{g:JSON.parse(bytes.subarray(20,20+n)),bin:bytes.subarray(28+n)};};
test('streamed assets preserve every geometry, animation and image byte of the originals',async()=>{
 await MeshoptDecoder.ready;
 const manifest=JSON.parse(readFileSync(new URL('streamed-models/manifest.json',root)));
 for(const model of manifest.models){
  const original=readFileSync(new URL('models/'+model.file,root));assert.equal(hash(original),model.sourceHash);
  const a=parse(original),b=parse(readFileSync(new URL('streamed-models/'+model.file,root)));
  assert.deepEqual(b.g.nodes,a.g.nodes);assert.deepEqual(b.g.meshes,a.g.meshes);assert.deepEqual(b.g.animations,a.g.animations);assert.deepEqual(b.g.skins,a.g.skins);
  const imageViews=new Set((a.g.images||[]).map(i=>i.bufferView));let j=0;
  for(const [i,view]of a.g.bufferViews.entries()){
   if(imageViews.has(i))continue;const ext=b.g.bufferViews[j++].extensions.EXT_meshopt_compression;
   const decoded=new Uint8Array(ext.count*ext.byteStride);
   MeshoptDecoder.decodeGltfBuffer(decoded,ext.count,ext.byteStride,b.bin.subarray(ext.byteOffset,ext.byteOffset+ext.byteLength),ext.mode,ext.filter);
   assert.equal(hash(decoded),hash(a.bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength)));
  }
  for(const [i,image]of(a.g.images||[]).entries()){const v=a.g.bufferViews[image.bufferView];assert.equal(hash(readFileSync(new URL('streamed-models/'+b.g.images[i].uri,root))),hash(a.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength)));}
 }
});
