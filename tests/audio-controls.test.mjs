import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../src/lowpoly/main.js',import.meta.url),'utf8');
const audioFunctions=source.slice(source.indexOf('async function toggleSound()'),source.indexOf('\nasync function resetExpedition()'));
function setup(){
 const elements=new Map();
 const q={soundEnabled:false,soundReady:false,paused:false,notify(){},play(){},saveProgress(){},
  $:id=>{if(!elements.has(id))elements.set(id,{hidden:false,setAttribute(){}});return elements.get(id);},
  audio:{setEnabled(){},unlock:async()=>!q.paused}};
 vm.createContext(q);vm.runInContext(audioFunctions,q);return q;
}
test('a failed audio activation remains visible and can be retried without muting the preference',async()=>{
 const q=setup();q.paused=true;await q.toggleSound();assert(q.soundEnabled);
 assert.equal(q.$('mobileSoundInvite').hidden,false,'failed activation must retain a retry control');
 q.paused=false;await q.toggleSound();assert(q.soundEnabled);assert(q.soundReady);
});
test('the mobile audio action closes the pause menu before attempting playback',async()=>{
 const q=setup();q.paused=true;
 q.closeFlightMenu=()=>{q.paused=false;};q.updateHUD=()=>{};
 const menuAction=source.match(/\$\('mobileSoundButton'\)\.onclick = [^\n]+/)[0];
 vm.runInContext('function fromFlightMenu(action){closeFlightMenu();action();updateHUD();}\n'+menuAction,q);
 await q.$('mobileSoundButton').onclick();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(q.paused,false);assert.equal(q.soundEnabled,true);assert.equal(q.soundReady,true);
});
