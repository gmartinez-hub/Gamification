import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const evidence=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/runtime-v2/evidence/asset-measurements-v1.json'),'utf8'));
const profiles=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/runtime-v2/evidence/scale-profiles-draft-v1.json'),'utf8'));
const measured=Object.fromEntries(evidence.measured.map(x=>[x.key,x]));
const checks=[];
const tol=.006;

function check(id,pass,details){checks.push({id,pass:Boolean(pass),details});}
function dimsObjToArr(o){return o?[o.x,o.y,o.z]:null;}
function close(a,b){return Math.abs(a-b)<=tol;}

for(const [key,p] of Object.entries(profiles.profiles)){
 if(!p.authoringBounds)continue;
 const m=measured[key];
 check('RAW_EXISTS:'+key,!!m,m?'measured':'no measured asset');
 if(!m)continue;
 const expected=dimsObjToArr(p.authoringBounds),actual=m.rawBounds?.dimensions;
 const pass=expected&&actual&&expected.every((v,i)=>close(v,actual[i]));
 check('RAW_MATCH:'+key,pass,{expected,actual,tolerance:tol});
}

const astronaut=measured['character.player'];
check('HUMAN_ANCHOR_1_90',Math.abs((astronaut?.rawBounds?.dimensions?.[1]??0)-1.9)<.01,{
 rawHeight:astronaut?.rawBounds?.dimensions?.[1],semanticHeight:profiles.humanAnchorMetres
});

check('RING_EXPLICITLY_UNMEASURED',profiles.profiles['portal.ring']?.assetStatus==='NO_GLB_IN_MAIN',profiles.profiles['portal.ring']);
check('MOTHERSHIP_EXPLICITLY_UNMEASURED',profiles.profiles['boss.mothership']?.assetStatus==='NO_GLB_IN_MAIN',profiles.profiles['boss.mothership']);

for(const key of ['ship.front','ship.middle','ship.final','enemy.alienShip','hangar.serviceBay','cockpit.integrated']){
 const status=profiles.profiles[key]?.status;
 check('NO_FALSE_APPROVAL:'+key,status!=='APPROVED',{status});
}

const failed=checks.filter(x=>!x.pass);
const result={
 schema:'gz-scale-profile-validation-v1',
 generatedAt:new Date().toISOString(),
 pass:failed.length===0,
 checks,
 failedCount:failed.length
};
const OUT=path.join(ROOT,'docs/runtime-v2/evidence');
fs.writeFileSync(path.join(OUT,'scale-profile-validation-v1.json'),JSON.stringify(result,null,2)+'\n');

const rows=checks.map(x=>`| ${x.id} | ${x.pass?'PASS':'FAIL'} | ${typeof x.details==='string'?x.details:JSON.stringify(x.details)} |`).join('\n');
const md=`# ScaleProfile Validation V1

Overall: **${result.pass?'PASS':'FAIL'}**

This validates evidence linkage only. It does not approve semantic dimensions that are still VERIFY / MEASURED_REFERENCE / PRODUCE_MEASURE.

| Check | Result | Evidence |
|---|---|---|
${rows}

Failed checks: **${failed.length}**.
`;
fs.writeFileSync(path.join(OUT,'scale-profile-validation-v1.md'),md);
if(failed.length){console.error(md);process.exitCode=1;}else console.log(md);
