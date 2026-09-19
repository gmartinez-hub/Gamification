import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const OUT_DIR=path.join(ROOT,'docs/runtime-v2/evidence');
fs.mkdirSync(OUT_DIR,{recursive:true});

const ASSETS=[
  {key:'character.player',file:'assets/runtime/models/astronauta-armado.glb',role:'human'},
  {key:'cockpit.integrated',file:'assets/runtime/models/cabina-integrada.glb',role:'cockpit'},
  {key:'ship.front',file:'assets/runtime/models/capsula.glb',role:'ship-module'},
  {key:'ship.middle',file:'assets/runtime/models/habitat.glb',role:'ship-module'},
  {key:'ship.final',file:'assets/runtime/models/propulsion.glb',role:'ship-module'},
  {key:'vehicle.bike',file:'assets/runtime/encounter-models/bike.glb',role:'vehicle'},
  {key:'enemy.alienShip',file:'assets/runtime/encounter-models/alien-ship.glb',role:'enemy-ship'},
  {key:'hangar.serviceBay',file:'assets/runtime/closeout-models/orbital-service-bay.glb',role:'hangar'},
  {key:'weapon.turret',file:'assets/runtime/closeout-models/modular-turret.glb',role:'equipment'},
  {key:'character.ally',file:'assets/runtime/closeout-models/green-ally.glb',role:'human'},
  {key:'companion.noma',file:'assets/runtime/models/robot.glb',role:'companion'},
  {key:'deployable.beacon',file:'assets/runtime/models/baliza.glb',role:'deployable'},
  {key:'resource.energyCell',file:'assets/runtime/closeout-models/energy-cell.glb',role:'resource'},
  {key:'artifact.gem',file:'assets/runtime/mission-models/gema.glb',role:'artifact'}
];

const HUMAN_HEIGHT=1.90;

function readGlbJson(file){
  const b=fs.readFileSync(file);
  if(b.readUInt32LE(0)!==0x46546c67) throw new Error('Not GLB: '+file);
  let off=12, json=null;
  while(off+8<=b.length){
    const len=b.readUInt32LE(off), type=b.readUInt32LE(off+4); off+=8;
    if(type===0x4e4f534a) json=JSON.parse(b.subarray(off,off+len).toString('utf8').replace(/\u0000/g,'').trim());
    off+=len;
  }
  if(!json) throw new Error('Missing JSON chunk: '+file);
  return {json,bytes:b.length};
}
function ident(){return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];}
function mul(a,b){
 const o=new Array(16).fill(0);
 for(let c=0;c<4;c++) for(let r=0;r<4;r++) for(let k=0;k<4;k++) o[c*4+r]+=a[k*4+r]*b[c*4+k];
 return o;
}
function trs(n){
 if(n.matrix) return n.matrix.slice();
 const t=n.translation||[0,0,0], s=n.scale||[1,1,1], q=n.rotation||[0,0,0,1];
 const [x,y,z,w]=q, x2=x+x,y2=y+y,z2=z+z, xx=x*x2,xy=x*y2,xz=x*z2, yy=y*y2,yz=y*z2,zz=z*z2, wx=w*x2,wy=w*y2,wz=w*z2;
 return [
  (1-(yy+zz))*s[0],(xy+wz)*s[0],(xz-wy)*s[0],0,
  (xy-wz)*s[1],(1-(xx+zz))*s[1],(yz+wx)*s[1],0,
  (xz+wy)*s[2],(yz-wx)*s[2],(1-(xx+yy))*s[2],0,
  t[0],t[1],t[2],1
 ];
}
function point(m,p){
 const [x,y,z]=p;
 return [m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14]];
}
function emptyBounds(){return {min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};}
function addPoint(b,p){for(let i=0;i<3;i++){b.min[i]=Math.min(b.min[i],p[i]);b.max[i]=Math.max(b.max[i],p[i]);}}
function addBounds(a,b){for(let i=0;i<3;i++){a.min[i]=Math.min(a.min[i],b.min[i]);a.max[i]=Math.max(a.max[i],b.max[i]);}}
function finiteBounds(b){return b.min.every(Number.isFinite)&&b.max.every(Number.isFinite);}
function finish(b){
 if(!finiteBounds(b)) return null;
 const dimensions=b.max.map((v,i)=>v-b.min[i]);
 const center=b.max.map((v,i)=>(v+b.min[i])/2);
 return {min:b.min,max:b.max,dimensions,center,longestAxis:['x','y','z'][dimensions.indexOf(Math.max(...dimensions))],longestDimension:Math.max(...dimensions)};
}
function primitiveBounds(g,p,m){
 const acc=g.accessors?.[p.attributes?.POSITION];
 if(!acc?.min||!acc?.max) return null;
 const b=emptyBounds();
 for(const x of [acc.min[0],acc.max[0]]) for(const y of [acc.min[1],acc.max[1]]) for(const z of [acc.min[2],acc.max[2]]) addPoint(b,point(m,[x,y,z]));
 return b;
}
function inspectAsset(spec){
 const abs=path.join(ROOT,spec.file);
 const {json:g,bytes}=readGlbJson(abs);
 const parents=new Map();
 (g.nodes||[]).forEach((n,i)=>(n.children||[]).forEach(ch=>parents.set(ch,i)));
 const roots=g.scenes?.[g.scene||0]?.nodes || (g.nodes||[]).map((_,i)=>i).filter(i=>!parents.has(i));
 const worlds=new Array((g.nodes||[]).length);
 const overall=emptyBounds(), perNode=[];
 let triangles=0, primitives=0;
 function walk(i,parent){
   const n=g.nodes[i]||{}, world=mul(parent,trs(n)); worlds[i]=world;
   let nb=emptyBounds(), has=false;
   if(n.mesh!==undefined){
    const mesh=g.meshes?.[n.mesh];
    for(const p of mesh?.primitives||[]){
      const pb=primitiveBounds(g,p,world); if(pb){addBounds(nb,pb);addBounds(overall,pb);has=true;}
      let count;
      if(p.indices!==undefined) count=g.accessors?.[p.indices]?.count;
      else count=g.accessors?.[p.attributes?.POSITION]?.count;
      if(Number.isFinite(count)){
        if((p.mode??4)===4) triangles+=Math.floor(count/3);
        else if((p.mode??4)===5 || (p.mode??4)===6) triangles+=Math.max(0,count-2);
      }
      primitives++;
    }
   }
   perNode.push({index:i,name:n.name||null,translation:[world[12],world[13],world[14]],mesh:n.mesh??null,directMeshBounds:has?finish(nb):null});
   for(const ch of n.children||[]) walk(ch,world);
 }
 roots.forEach(i=>walk(i,ident()));
 const raw=finish(overall);
 const named=perNode.filter(n=>n.name).filter(n=>/weapon|muzzle|head|hand|eye|glass|wall|ceiling|cockpit|service|bike|crew|turret|seat|door|port|nozzle|engine|thruster|mount|socket/i.test(n.name));
 return {key:spec.key,role:spec.role,file:spec.file,bytes,triangles,primitives,rawBounds:raw,namedNodes:named};
}

const measured=ASSETS.map(inspectAsset);
const byKey=Object.fromEntries(measured.map(x=>[x.key,x]));

function dimsAfterLegacyShipRotationScale(raw,scale=2.5){
 if(!raw) return null;
 const [x,y,z]=raw.dimensions;
 return {dimensions:[x*scale,z*scale,y*scale],note:'Evidence only: legacy ship module rotation X=-90deg and scale=2.5'};
}
const derived={
 humanAnchorMetres:HUMAN_HEIGHT,
 astronaut:{
   rawHeight:byKey['character.player']?.rawBounds?.dimensions?.[1]??null,
   scaleToCanonicalHeight:byKey['character.player']?.rawBounds?.dimensions?.[1]?HUMAN_HEIGHT/byKey['character.player'].rawBounds.dimensions[1]:null
 },
 playerShipLegacyEvidence:{
   front:dimsAfterLegacyShipRotationScale(byKey['ship.front']?.rawBounds),
   middle:dimsAfterLegacyShipRotationScale(byKey['ship.middle']?.rawBounds),
   final:dimsAfterLegacyShipRotationScale(byKey['ship.final']?.rawBounds),
   legacyCompositionSpacingMetres:4.125,
   nominalThreeModuleLengthMetres:12.375,
   warning:'These are legacy measured references, NOT V2 semantic dimensions.'
 },
 alienShipLegacyEvidence:{
   runtimeDeclaredLengthMetres:25.7335000634,
   sourceCommentLengthMetres:12.866750,
   warning:'Declared legacy runtime length is evidence only.'
 },
 authoringNormalizationCheck:{
   allyLongest:byKey['character.ally']?.rawBounds?.longestDimension??null,
   turretLongest:byKey['weapon.turret']?.rawBounds?.longestDimension??null,
   hangarLongest:byKey['hangar.serviceBay']?.rawBounds?.longestDimension??null,
   energyCellLongest:byKey['resource.energyCell']?.rawBounds?.longestDimension??null
 },
 missingRuntimeAssets:[
   {key:'portal.ring',status:'NO_GLB_FOUND_IN_MAIN'},
   {key:'boss.mothership',status:'NO_GLB_FOUND_IN_MAIN'}
 ]
};

function roundDeep(v){
 if(typeof v==='number') return Math.round(v*1e6)/1e6;
 if(Array.isArray(v)) return v.map(roundDeep);
 if(v&&typeof v==='object') return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,roundDeep(x)]));
 return v;
}
const report=roundDeep({
 schema:'gz-scale-measurement-v1',
 generatedAt:new Date().toISOString(),
 sourceBranch:process.env.GITHUB_REF_NAME||'local',
 note:'Raw authoring bounds + explicitly labeled legacy evidence. No gameplay code copied into V2.',
 measured,
 derived
});
fs.writeFileSync(path.join(OUT_DIR,'asset-measurements-v1.json'),JSON.stringify(report,null,2)+'\n');

const fmt=n=>Number.isFinite(n)?n.toFixed(3):'—';
const rows=measured.map(a=>{
 const d=a.rawBounds?.dimensions||[];
 return `| ${a.key} | ${fmt(d[0])} | ${fmt(d[1])} | ${fmt(d[2])} | ${fmt(a.rawBounds?.longestDimension)} | ${a.triangles.toLocaleString()} |`;
}).join('\n');
const md=`# Asset Measurement Evidence V1

> Raw GLB authoring measurements from the legacy repository. These are evidence, **not automatic V2 world dimensions**.

Canonical human anchor for V2: **1.90 m**.

| Asset | Raw X | Raw Y | Raw Z | Longest | Triangles |
|---|---:|---:|---:|---:|---:|
${rows}

## Key evidence

- Astronaut raw Y height: **${fmt(derived.astronaut.rawHeight)}**; scale-to-1.90 factor: **${fmt(derived.astronaut.scaleToCanonicalHeight)}**.
- Legacy player-ship composition spacing: **4.125 m/module**; three-module nominal length: **12.375 m**. Evidence only.
- Legacy alien-ship declared runtime length: **25.734 m**. Evidence only.
- No portal-ring GLB was found in main.
- No mothership GLB was found in main.
- Closeout/raw assets must not be interpreted as world scale merely from GLB bounds.

## Next

1. Approve ScaleProfiles, not raw bounds.
2. Run cockpit raw-vs-runtime envelope proof.
3. Define Hangar semantic dimensions from largest supported ship composition and first-person clearance.
4. Define ring aperture from largest travelling setup.
5. Produce/measure mothership asset when available.
`;
fs.writeFileSync(path.join(OUT_DIR,'asset-measurements-v1.md'),md);
console.log(md);
