import fs from 'node:fs';
import path from 'node:path';
import * as THREE from '../vendor/three.module.js';

const ROOT=process.cwd(), OUT=path.join(ROOT,'docs/runtime-v2/evidence');
fs.mkdirSync(OUT,{recursive:true});

function parseGlb(file){
 const b=fs.readFileSync(path.join(ROOT,file));
 const jsonLen=b.readUInt32LE(12);
 const g=JSON.parse(b.subarray(20,20+jsonLen).toString('utf8').replace(/\u0000/g,'').trim());
 const binStart=28+jsonLen;
 return {b,g,binStart};
}
const componentCtor={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const comps={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
function accessor(ctx,index){
 const a=ctx.g.accessors[index],v=ctx.g.bufferViews[a.bufferView],C=componentCtor[a.componentType],n=comps[a.type];
 if(!C)throw new Error('Unsupported component '+a.componentType);
 const offset=ctx.binStart+(v.byteOffset||0)+(a.byteOffset||0);
 return new C(ctx.b.buffer,ctx.b.byteOffset+offset,a.count*n);
}
function meshFromFirstPrimitive(file){
 const ctx=parseGlb(file), meshDef=ctx.g.meshes[0], p=meshDef.primitives[0];
 const pos=accessor(ctx,p.attributes.POSITION), idx=p.indices!==undefined?accessor(ctx,p.indices):null;
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pos),3));
 if(idx)g.setIndex(new THREE.BufferAttribute(idx instanceof Uint32Array?new Uint32Array(idx):new Uint16Array(idx),1));
 g.computeBoundingBox();
 const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 m.updateMatrixWorld(true);
 return m;
}
function rayDistances(mesh,origin,dir){
 const ray=new THREE.Raycaster(origin,dir.clone().normalize(),.005,500);
 return ray.intersectObject(mesh,false).map(h=>h.distance);
}
function first(mesh,origin,dir){
 const d=rayDistances(mesh,origin,dir);
 return d.length?d[0]:null;
}
function round(n){return Number.isFinite(n)?Math.round(n*1000)/1000:null;}
function roundVec(v){return v.map(round);}

// HANGAR evidence uses measured legacy semantic staging only as evidence.
const hangar=meshFromFirstPrimitive('assets/runtime/closeout-models/orbital-service-bay.glb');
hangar.scale.setScalar(18);hangar.position.set(0,-1.2,0);hangar.updateMatrixWorld(true);
const anchors={
 bike:new THREE.Vector3(-.68,.06,-.18).multiplyScalar(18).add(hangar.position),
 crew:new THREE.Vector3(.68,.06,-.18).multiplyScalar(18).add(hangar.position),
 longShip:new THREE.Vector3(0,.16,0).multiplyScalar(18).add(hangar.position)
};
const dirs={
 up:new THREE.Vector3(0,1,0),down:new THREE.Vector3(0,-1,0),
 left:new THREE.Vector3(-1,0,0),right:new THREE.Vector3(1,0,0),
 forward:new THREE.Vector3(0,0,-1),rear:new THREE.Vector3(0,0,1)
};
const anchorRays={};
for(const [name,p] of Object.entries(anchors)){
 anchorRays[name]={position:roundVec(p.toArray())};
 for(const [dn,d] of Object.entries(dirs))anchorRays[name][dn]=round(first(hangar,p,d));
}

// Grid first-person evidence around crew/bike/ship region.
const grid=[];
for(const x of [-12,-8,-4,0,4,8,12])for(const z of [-8,-4,0,4,8]){
 const p=new THREE.Vector3(x,1.7,z);
 const down=first(hangar,p,dirs.down),up=first(hangar,p,dirs.up);
 grid.push({x,z,floorDistance:round(down),ceilingDistance:round(up),verticalClearance:round(down!==null&&up!==null?down+up:null)});
}
const clearances=grid.filter(x=>x.verticalClearance!==null).map(x=>x.verticalClearance);
const hangarSummary={
 semanticEvidenceScale:18,
 bounds:(()=>{const b=new THREE.Box3().setFromObject(hangar);return{min:roundVec(b.min.toArray()),max:roundVec(b.max.toArray()),dimensions:roundVec(b.getSize(new THREE.Vector3()).toArray())};})(),
 anchorRays,
 firstPersonGrid:grid,
 enclosedVerticalClearance:{
   samples:clearances.length,
   min:round(clearances.length?Math.min(...clearances):null),
   max:round(clearances.length?Math.max(...clearances):null)
 },
 note:'Raycasts are legacy staging evidence only. Null means no surface intersected in that direction within 500 m.'
};

// COCKPIT evidence: raw shell + current legacy composition maths.
const astronautRaw={min:[-.488273,0,-.405218],max:[.484296,1.89899,.583191]};
const cabinRaw={min:[-1.02,-.65,-.18],max:[1.02,.65,2.08]};
const dashboardScale=1.8,dashboardY=1.05,stand=[.74,0,1.26],clipRaw=.68;
const pilot={min:astronautRaw.min.map((v,i)=>v+stand[i]),max:astronautRaw.max.map((v,i)=>v+stand[i])};
const shell={min:[cabinRaw.min[0]*dashboardScale,dashboardY+cabinRaw.min[1]*dashboardScale,cabinRaw.min[2]*dashboardScale],
 max:[cabinRaw.max[0]*dashboardScale,dashboardY+cabinRaw.max[1]*dashboardScale,cabinRaw.max[2]*dashboardScale]};
const cockpitSummary={
 astronautHeight:1.89899,
 pilotEnvelope:{min:roundVec(pilot.min),max:roundVec(pilot.max)},
 sourceShellEnvelope:{min:roundVec(shell.min),max:roundVec(shell.max)},
 sourceClearance:{
   positiveX:round(shell.max[0]-pilot.max[0]),
   negativeX:round(pilot.min[0]-shell.min[0]),
   head:round(shell.max[1]-pilot.max[1]),
   rear:round(shell.max[2]-pilot.max[2])
 },
 currentLegacyClip:{
   rearZ:round(clipRaw*dashboardScale),
   pilotOverflowBeyondClip:round(pilot.max[2]-clipRaw*dashboardScale)
 },
 classification:'SOURCE_EXISTS_RUNTIME_HIDES'
};

// RING / ship cross-section evidence.
const shipCross={width:4.739,height:4.613};
const ring={eventHorizonDiameter:6.8,discOuterDiameter:15.6};
const ringSummary={
 shipCrossSectionEvidenceMetres:shipCross,
 legacyEventHorizonDiameter:ring.eventHorizonDiameter,
 perSideClearance:{
   horizontal:round((ring.eventHorizonDiameter-shipCross.width)/2),
   vertical:round((ring.eventHorizonDiameter-shipCross.height)/2)
 },
 singleFileFit:shipCross.width<ring.eventHorizonDiameter&&shipCross.height<ring.eventHorizonDiameter,
 sideBySideFormationRequiredDiameterEvidence:round(shipCross.width*2+1.0),
 note:'Single-file fit is geometric evidence only. Transit formation remains a camera/storyboard decision.'
};

// BOOSTED BIKE preliminary bounding-envelope test.
const bike={width:1.395,height:1.299,length:3.0,rearZ:1.5};
const finalRaw={x:1.824724,y:1.89893,z:1.845239};
// Treat final module after ship orientation; scale candidate so its width ~= 70% bike width.
const targetWidth=bike.width*.70, candidateScale=targetWidth/finalRaw.x;
const backAddon={width:finalRaw.x*candidateScale,height:finalRaw.z*candidateScale,length:finalRaw.y*candidateScale};
const boostedBikeSummary={
 bike,
 candidate:{
   scaleFromRawFinal:round(candidateScale),
   addonDimensions:roundVec([backAddon.width,backAddon.height,backAddon.length]),
   resultingApproxLength:round(bike.length+backAddon.length*.85),
   widthRatioToBike:round(backAddon.width/bike.width),
   heightRatioToBike:round(backAddon.height/bike.height)
 },
 classification:'BOUNDS_PLAUSIBLE_VISUAL_VERIFY_REQUIRED',
 blockersStillToCheck:['rider leg/back clearance','actual contact silhouette','first-person rear visibility','third-person camera','collision proxy','central boost nozzle integration'],
 note:'This is an envelope fit test only; it does not approve the Back-derived Bike geometry.'
};

const report={
 schema:'gz-spatial-evidence-v1',
 generatedAt:new Date().toISOString(),
 hangar:hangarSummary,cockpit:cockpitSummary,ring:ringSummary,boostedBike:boostedBikeSummary
};
fs.writeFileSync(path.join(OUT,'spatial-evidence-v1.json'),JSON.stringify(report,null,2)+'\n');

const md=`# Spatial Evidence V1

> Measurement/proof layer only. No V2 implementation is prescribed here.

## Cockpit

Classification: **${cockpitSummary.classification}**.

- Standing astronaut source-shell rear clearance: **${cockpitSummary.sourceClearance.rear} m**.
- Head clearance inside uncut source shell: **${cockpitSummary.sourceClearance.head} m**.
- Current legacy rear clip cuts **${cockpitSummary.currentLegacyClip.pilotOverflowBeyondClip} m** into the standing astronaut envelope.

This strengthens the conclusion that the shallow/floating cockpit problem is first a runtime-composition problem, with Blender extension conditional on visual QA.

## Hangar

Legacy semantic staging envelope: **${hangarSummary.bounds.dimensions.join(' × ')} m**.

Anchor ray evidence:

\`\`\`json
${JSON.stringify(hangarSummary.anchorRays,null,2)}
\`\`\`

First-person grid enclosed-clearance samples: **${hangarSummary.enclosedVerticalClearance.samples}**; observed min/max vertical clearance **${hangarSummary.enclosedVerticalClearance.min ?? '—'} / ${hangarSummary.enclosedVerticalClearance.max ?? '—'} m**.

Null ray results mean the authored bay is open in that direction, which is compatible with adding a lightweight support shell/backdrop rather than assuming a closed room.

## Ring

- Legacy event horizon diameter: **6.8 m**.
- Player ship cross-section evidence: **4.739 × 4.613 m**.
- Single-file clearance: **${ringSummary.perSideClearance.horizontal} m** horizontal per side, **${ringSummary.perSideClearance.vertical} m** vertical per side.
- Single-file geometric fit: **${ringSummary.singleFileFit?'PASS':'FAIL'}**.
- A simple two-ship side-by-side formation would need roughly **${ringSummary.sideBySideFormationRequiredDiameterEvidence} m** before cinematic margin; this is evidence, not an approved formation.

## Back-derived Boosted Bike

Preliminary bounding-envelope classification: **${boostedBikeSummary.classification}**.

- Candidate Back raw scale: **${boostedBikeSummary.candidate.scaleFromRawFinal}×**.
- Candidate add-on envelope: **${boostedBikeSummary.candidate.addonDimensions.join(' × ')} m**.
- Approx combined length: **${boostedBikeSummary.candidate.resultingApproxLength} m**.

Still mandatory before approval:
${boostedBikeSummary.blockersStillToCheck.map(x=>'- '+x).join('\n')}

## Next proof

- Render/inspect cockpit shell without legacy rear clipping.
- Produce Hangar first-person camera storyboard against actual service-bay geometry.
- Pick a portal transit formation and verify aperture visually.
- Do the Back/Bike visual overlay/model fit.
`;
fs.writeFileSync(path.join(OUT,'spatial-evidence-v1.md'),md);
console.log(md);
