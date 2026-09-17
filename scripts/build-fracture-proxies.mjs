// Offline geometry ONLY for moving debris. Visible asteroids keep their original surfaces.
// Requires @gltf-transform/core/functions/extensions@4.5.0 and meshoptimizer@1.2.0
// in GLTF_TOOLS (default /tmp/gz-mobile-assets-toolchain).
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require=createRequire((process.env.GLTF_TOOLS||'/tmp/gz-mobile-assets-toolchain')+'/package.json');
const {NodeIO}=require('@gltf-transform/core');
const {ALL_EXTENSIONS}=require('@gltf-transform/extensions');
const {weld,simplify,normals,prune}=require('@gltf-transform/functions');
const {MeshoptSimplifier}=require('meshoptimizer');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);await MeshoptSimplifier.ready;
const base=new URL('../assets/runtime/',import.meta.url);await mkdir(new URL('fracture-proxies/',base),{recursive:true});
for(const name of ['asteroide-base','asteroide-marron']){
 const doc=await io.read(new URL('models/'+name+'.glb',base).pathname);let triangles=0;
 for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){triangles+=(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3;p.setMaterial(null);if(name==='asteroide-base')p.setAttribute('NORMAL',null);}
 await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:12000/triangles,error:.015}));
 if(name==='asteroide-base')await doc.transform(normals());
 await doc.transform(prune());await io.write(new URL('fracture-proxies/'+name+'.glb',base).pathname,doc);
}
