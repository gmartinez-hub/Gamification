// Reproduce source dimensions, actual rig contacts, and sampled capsule-envelope diagnostics.
// This is an inspection tool; cabin.js is the reproducible runtime geometry builder.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {createWalkableCabin} from '../src/lowpoly/cabin.js';
import {createCabinController, CABIN_LAYOUT} from '../src/lowpoly/cabin-controller.js';
const root=new URL('../',import.meta.url),evidence=new URL('.superpowers/sdd/2026-09-17-final-expedition/cabin-evidence/',root);
const loader=new GLTFLoader();loader.register(()=>({name:'InspectionWithoutTextures',loadTexture:()=>Promise.resolve(null)}));
const assets={},hashes={};for(const name of ['cabina-integrada','astronauta-armado']){const b=await fs.readFile(new URL('assets/runtime/models/'+name+'.glb',root));hashes[name]=createHash('sha256').update(b).digest('hex');assets[name]=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
const envelope=[...JSON.parse(await fs.readFile(new URL('capsule-outer-envelope.json',evidence))),...JSON.parse(await fs.readFile(new URL('capsule-rear-envelope.json',evidence)))].sort((a,b)=>a.z-b.z);
function radius(row,a){const t=(a+Math.PI*2)%(Math.PI*2)/Math.PI*12,i=Math.floor(t),r0=row.radii[i%24],r1=row.radii[(i+1)%24];return r0===null||r1===null?null:r0+(r1-r0)*(t-i);}
function envelopeRadius(p){let i=envelope.findIndex(r=>r.z>=p.z);if(i<=0)return null;const a=Math.atan2(p.y,p.x),r0=radius(envelope[i-1],a),r1=radius(envelope[i],a);return r0===null||r1===null?null:r0+(r1-r0)*(p.z-envelope[i-1].z)/(envelope[i].z-envelope[i-1].z);}
function sampledFit(object,stride=80){object.updateWorldMatrix(true,true);let maxExcess=-Infinity,worst=null,unknown=0,samples=0;object.traverse(mesh=>{if(!mesh.isMesh)return;if(mesh.isSkinnedMesh)mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i+=stride){const p=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld),r=envelopeRadius(p);samples++;if(r===null){unknown++;continue;}const excess=Math.hypot(p.x,p.y)-r;if(excess>maxExcess){maxExcess=excess;worst=p.toArray();}}});return{samples,unknown,maxExcessMetres:maxExcess,worst};}
const cabin=createWalkableCabin(assets),controller=createCabinController({aboard:true});cabin.update(0,controller.state,{reducedMotion:true});cabin.group.updateMatrixWorld(true);
const source=assets['cabina-integrada'].scene.getObjectByName('original-command-deck-opened'),glass=assets['cabina-integrada'].scene.getObjectByName('Central_transparent_cockpit_glass');
function bounds(o){const b=new T.Box3().setFromObject(o);return{min:b.min.toArray(),max:b.max.toArray(),dimensions:b.getSize(new T.Vector3()).toArray()};}
const result={layout:CABIN_LAYOUT,hashes,sourceCompleteAsset:bounds(source),sourceGlass:bounds(glass),scaledCompleteAsset:bounds(cabin.dashboard.getObjectByName('original-command-deck-opened')),retainedWrap:bounds(cabin.dashboard.getObjectByName('retained-cabin-ceiling-and-sides')),contacts:cabin.contacts(),sampledEnvelope:{method:'Every 80th position; radial outermost-hull intersections at 24 angles and sampled Z, linearly interpolated. Diagnostic, not exact watertight containment or collision test.',dashboard:sampledFit(cabin.dashboard),seatedBody:sampledFit(cabin.rig.body[0])}};
result.sampledEnvelope.dashboardParts=cabin.dashboard.children.filter(o=>o.name!=='original-command-deck-opened').map(o=>({name:o.name,...sampledFit(o,1)}));
result.sampledEnvelope.seatDetails=cabin.group.children.filter(o=>o.isMesh||o.name==='cabin-weapon-holster').map(o=>({name:o.name,...sampledFit(o)}));
controller.stand();for(let i=0;i<150;i++)controller.update(1/60);cabin.update(0,controller.state,{reducedMotion:true});result.sampledEnvelope.standingBody=sampledFit(cabin.rig.body[0]);result.standingBody= bounds(cabin.rig.body[0]);
await fs.writeFile(new URL('final-cabin-measurements.json',evidence),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));cabin.dispose();
