import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Vector3} from '../vendor/three.module.js';

const source=readFileSync(new URL('../src/lowpoly/main.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('function ensureTarget('),source.indexOf('\nfunction objective()'));
function setup(){
 const targets=[{id:'optional',kind:'breakable',position:new Vector3(0,0,4)},{id:'required',kind:'small',position:new Vector3(0,0,20)}];
 const q={selectedId:'optional',state:{phase:'small'},combat:{shot:null},flight:{position:new Vector3()},validTargets:()=>targets};
 q.selectedTarget=()=>targets.find(t=>t.id===q.selectedId);vm.createContext(q);vm.runInContext(fn,q);return q;
}
test('discovering a mission target brings it into focus instead of leaving an optional rock selected',()=>{
 const q=setup();q.ensureTarget(['required']);assert.equal(q.selectedId,'required');
});
test('ordinary updates preserve manual optional selection and never retarget a shot',()=>{
 const q=setup();q.ensureTarget();assert.equal(q.selectedId,'optional');
 q.combat.shot={id:'optional'};q.ensureTarget(['required']);assert.equal(q.selectedId,'optional');
});
