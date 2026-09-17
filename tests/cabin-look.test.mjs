import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Group, PerspectiveCamera, Vector3 } from '../vendor/three.module.js';

const source=readFileSync(new URL('../src/lowpoly/main.js',import.meta.url),'utf8');
const cameraFunction=source.slice(source.indexOf('function updateCamera(dt)'),source.indexOf('\nfunction updateMissionUI()'));
const toggleFunction=source.slice(source.indexOf('function toggleCabin()'),source.indexOf('\nfunction interact()'));

test('standing cabin look is relative to the ship, independent of the exterior pitch',()=>{
 const received=[];
 const context={cabinActive:()=>true,firstPerson:true,cabinLook:0,cabinLookPitch:0,elevation:-.7,
  cabinController:{canPilot:false,state:{yaw:0}},camera:new PerspectiveCamera(),
  cabin:{group:new Group(),cameraPose(state,options){received.push(options);return {position:new Vector3(0,1.69,1.6),target:new Vector3(0,1.2,0),fov:70,near:.018};}}};
 vm.createContext(context);vm.runInContext(cameraFunction,context);
 context.updateCamera(1/60);
 assert.equal(received[0].lookPitch,0,'standing view must not apply the flight pitch twice');
 context.cabinLookPitch=.15;context.updateCamera(1/60);
 assert.equal(received[1].lookPitch,.15,'local vertical look remains usable');
});

test('standing up recenters the cabin view without changing the flight heading',()=>{
 let stood=false;
 const context={paused:false,combat:{shot:null},gemSequence:{active:false},flight:{actor:'ship'},time:5,assemblyUntil:0,
  cabin:{},interiorView:false,cabinLook:1,cabinLookPitch:.4,elevation:-.7,orbit:.9,
  controls:{clear(){}},cabinController:{canPilot:true,stand(){stood=true;}},say(){}};
 vm.createContext(context);vm.runInContext(toggleFunction,context);context.toggleCabin();
 assert(stood);assert.equal(context.cabinLook,0);assert.equal(context.cabinLookPitch,0);
 assert.equal(context.elevation,-.7);assert.equal(context.orbit,.9);
});
