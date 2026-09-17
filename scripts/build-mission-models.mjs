// Repackage originals losslessly: shared images, unchanged geometry/rig/clips.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire((process.env.GLTF_TOOLS||'/tmp/gz-mobile-assets-toolchain')+'/package.json');
const {MeshoptEncoder,MeshoptDecoder}=require('meshoptimizer');
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const inputs=process.argv.slice(2);
if(inputs.length!==2) throw new Error('Usage: node scripts/build-mission-models.mjs GEM_SOURCE_GLB PROJECTILE_SOURCE_GLB');
const dest=new URL('../assets/runtime/mission-models/',import.meta.url);
await mkdir(new URL('textures/',dest),{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),manifest=[];
for(const [file,source] of [['gema.glb',inputs[0]],['proyectil.glb',inputs[1]]]){
 const bytes=await readFile(source),n=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+n)),bin=bytes.subarray(28+n);
 const imageViews=new Set(),images=[];
 for(const image of g.images||[]){const v=g.bufferViews[image.bufferView],data=bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength),uri='textures/'+hash(data)+(image.mimeType==='image/png'?'.png':'.jpg');await writeFile(new URL(uri,dest),data);imageViews.add(image.bufferView);delete image.bufferView;image.uri=uri;images.push({uri,bytes:data.length});}
 let offset=0,fallbackOffset=0;const parts=[],views=[],indices=new Map();
 g.bufferViews.forEach((view,i)=>{
   if(imageViews.has(i))return;
   const data=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
   const accessor=g.accessors.find(a=>a.bufferView===i),sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
   const isIndex=accessor?.type==='SCALAR'&&[5123,5125].includes(accessor.componentType);
   const stride=isIndex?sizes[accessor.componentType]:(view.byteStride||Math.max(4,(sizes[accessor?.componentType]||4)*(components[accessor?.type]||1)));
   assert.equal(data.length%stride,0); const count=data.length/stride,mode=isIndex?'INDICES':'ATTRIBUTES';
   const encoded=Buffer.from(MeshoptEncoder.encodeGltfBuffer(data,count,stride,mode,0));
   const decoded=new Uint8Array(data.length);MeshoptDecoder.decodeGltfBuffer(decoded,count,stride,encoded,mode,'NONE');assert.deepEqual(Buffer.from(decoded),data,'Compression must be bit-exact');
   const padding=Buffer.alloc((4-encoded.length%4)%4);indices.set(i,views.length);
   views.push({...view,buffer:1,byteOffset:fallbackOffset,extensions:{EXT_meshopt_compression:{buffer:0,byteOffset:offset,byteLength:encoded.length,byteStride:stride,count,mode,filter:'NONE'}}});
   parts.push(encoded,padding);offset+=encoded.length+padding.length;fallbackOffset+=data.length;
 });
 for(const accessor of g.accessors||[]){if(accessor.bufferView!==undefined)accessor.bufferView=indices.get(accessor.bufferView);if(accessor.sparse)for(const kind of ['indices','values'])accessor.sparse[kind].bufferView=indices.get(accessor.sparse[kind].bufferView);}
 g.bufferViews=views;g.buffers=[{byteLength:offset},{byteLength:fallbackOffset,extensions:{EXT_meshopt_compression:{fallback:true}}}];g.extensionsUsed=[...new Set([...(g.extensionsUsed||[]),'EXT_meshopt_compression'])];g.extensionsRequired=[...new Set([...(g.extensionsRequired||[]),'EXT_meshopt_compression'])];const json=Buffer.from(JSON.stringify(g)),jp=Buffer.alloc((4-json.length%4)%4,32),body=Buffer.concat(parts),header=Buffer.alloc(20),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+jp.length+body.length,8);header.writeUInt32LE(json.length+jp.length,12);header.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(body.length);bh.writeUInt32LE(0x004e4942,4);const output=Buffer.concat([header,json,jp,bh,body]);await writeFile(new URL(file,dest),output);manifest.push({file,bytes:output.length,sourceBytes:bytes.length,sourceHash:hash(bytes),sourceName:source.split('/').pop(),images});
}
await writeFile(new URL('manifest.json',dest),JSON.stringify({description:'Original geometry, animation and image bytes; shared external textures. No decimation or resizing.',models:manifest},null,2));
console.log(manifest.map(m=>({file:m.file,geometryMB:(m.bytes/1e6).toFixed(1),originalMB:(m.sourceBytes/1e6).toFixed(1)})));
