import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise production action bodies without booting WebGL or downloading assets.
// The deferred view promise models the user's network request; collaborators
// record the observable exit/deploy outcome rather than copying guard logic.
const source=readFileSync(new URL('../src/lowpoly/main.js',import.meta.url),'utf8');
const deploy=source.slice(source.indexOf('async function deploy()'),source.indexOf('\nfunction stopNavigation()'));
const pause=source.slice(source.indexOf('function setPaused(value)'),source.indexOf('\nasync function toggleSound()'));
function setup(inside){
 let resolve,exits=0,deployed=0;
 const context={userActionEpoch:0,paused:false,inspecting:false,combat:{shot:null},gemSequence:{active:false},time:5,assemblyUntil:0,state:{phase:'small',seed:712069},
  flight:{actor:'ship',deploy(){deployed++;return true;}},cabinController:{inside,exit(){exits++;},reset(){}},controls:{clear(){}},
  prepareView:()=>new Promise(r=>{resolve=r;}),interiorView:true,previousActor:'ship',navigating:false,scanning:false,say(){},play(){},
  $:()=>({hidden:false,open:false,setAttribute(){}}),flightMenuOpen:false,audio:{setPaused(){}},document:{hidden:false},soundEnabled:false};
 vm.createContext(context);vm.runInContext(deploy+'\n'+pause,context);
 return {context,resolve:result=>resolve(result),actions:()=>exits+deployed};
}
for(const inside of [true,false]){
 const mode=inside?'cabin exit':'EVA deployment';
 test(`${mode}: failed view download leaves actor unchanged`,async()=>{
  const q=setup(inside),pending=q.context.deploy();q.resolve(false);await pending;assert.equal(q.actions(),0);
 });
 test(`${mode}: pause then resume cancels the old pending action`,async()=>{
  const q=setup(inside),pending=q.context.deploy();q.context.setPaused(true);q.context.setPaused(false);q.resolve(true);await pending;assert.equal(q.actions(),0);
 });
 test(`${mode}: a new expedition invalidates the old pending action`,async()=>{
  const q=setup(inside),pending=q.context.deploy();q.context.state.seed=42;q.resolve(true);await pending;assert.equal(q.actions(),0);
 });
 test(`${mode}: successful preparation performs exactly one requested action`,async()=>{
  const q=setup(inside),pending=q.context.deploy();q.resolve(true);await pending;assert.equal(q.actions(),1);
 });
}
