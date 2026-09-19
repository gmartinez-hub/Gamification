import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd(),OUT=path.join(ROOT,'docs/runtime-v2/evidence/portal-size-proof-v1');
fs.mkdirSync(OUT,{recursive:true});
const shots=['portal-large-12','portal-large-14','portal-large-16'];
const server=spawn('python3',['-m','http.server','8787','--bind','127.0.0.1'],{stdio:'ignore',detached:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(1200);
try{
  for(const shot of shots){
    const url='http://127.0.0.1:8787/tools/runtime-v2-visual-proof.html?proof='+encodeURIComponent(shot);
    const out=path.join(OUT,shot+'.png');
    execFileSync('npx',['-y','playwright@1.55.0','screenshot','--browser','chromium','--viewport-size','1280,720','--wait-for-timeout','3500',url,out],{stdio:'inherit'});
  }
  fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify({
    schema:'gz-portal-size-proof-v1',
    generatedAt:new Date().toISOString(),
    candidateEventHorizonDiametersMetres:[12,14,16],
    note:'Measurement sweep only. No candidate is approved by generation alone.'
  },null,2)+'\n');
}finally{try{process.kill(-server.pid)}catch{}}
