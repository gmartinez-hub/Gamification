// Run from repository root. Samples the outermost radial shell, not internal obstructions.
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
const b=fs.readFileSync('assets/runtime/models/capsula.glb');const L=b.readUInt32LE(12),d=JSON.parse(b.subarray(20,20+L)),base=28+L,q=d.meshes[0].primitives[0];
function acc(i){const a=d.accessors[i],v=d.bufferViews[a.bufferView],C={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType],n={SCALAR:1,VEC3:3}[a.type];return new C(b.buffer,b.byteOffset+base+(v.byteOffset||0)+(a.byteOffset||0),a.count*n);}
const pos=acc(q.attributes.POSITION),out=new Float32Array(pos.length);for(let i=0;i<pos.length;i+=3){out[i]=pos[i]*2.5;out[i+1]=pos[i+2]*2.5;out[i+2]=-pos[i+1]*2.5-3.5;}
const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(out,3));g.setIndex(new T.BufferAttribute(acc(q.indices),1));g.computeBoundingSphere();const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld();const ray=new T.Raycaster(),rows=[];
for(const z of [-4.8,-4.6,-4.4,-4.2,-4,-3.8,-3.6,-3.4,-3.2,-3,-2.8,-2.6,-2.4,-2.2,-2]){const radii=[];for(let j=0;j<24;j++){const a=j*Math.PI/12;ray.set(new T.Vector3(0,0,z),new T.Vector3(Math.cos(a),Math.sin(a),0));const hits=ray.intersectObject(mesh);const h=hits.at(-1);radii.push(h?+h.distance.toFixed(3):null);}rows.push({z,radii});console.log(z,Math.min(...radii.filter(x=>x)),radii.filter((_,i)=>i%6===0));}
fs.writeFileSync('.superpowers/sdd/2026-09-17-final-expedition/cabin-evidence/capsule-outer-envelope.json',JSON.stringify(rows,null,2));
