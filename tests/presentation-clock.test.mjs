import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationClock,createGemSequence} from '../src/lowpoly/presentation-clock.js';
test('overlapping moments slow only world time and recover after pause and reset',()=>{
 const clock=createPresentationClock();clock.moment('ship');let tick=clock.advance(.05);assert.ok(tick.worldDt<tick.dt);
 clock.moment('gem');const t=clock.time;for(let i=0;i<100;i++)clock.advance(.05,{paused:true});assert.equal(clock.time,t);
 for(let i=0;i<50;i++)tick=clock.advance(.05);assert.equal(tick.scale,1);assert.ok(tick.worldTime<tick.time);
 clock.moment('gem');clock.reset();assert.equal(clock.advance(.05).scale,1);assert.equal(clock.worldTime,.05);
});
test('aiming resumes normal speed and reduced motion does not change action timers',()=>{
 const clock=createPresentationClock();assert.equal(clock.advance(.04,{aiming:true}).worldDt,.016);
 assert.equal(clock.advance(.04).scale,1);clock.moment('gem');assert.equal(clock.advance(.04,{reducedMotion:true}).worldDt,.04);
});
test('skip still physically boards, waits for seating and resources, and emits each arrival once',()=>{
 const seq=createGemSequence();assert.equal(seq.start(),true);assert.equal(seq.start(),false);seq.skip();
 assert.equal(seq.update(.1),null);assert.equal(seq.update(.1),'return');
 for(let i=0;i<100;i++)assert.equal(seq.update(.1),null);
 assert.equal(seq.update(.1,{aboard:true}),'board');assert.equal(seq.update(.1,{aboard:true}),null);
 assert.equal(seq.update(.1,{aboard:true,seated:true}),'travel');
 for(let i=0;i<100;i++)assert.equal(seq.update(.1,{aboard:true,seated:true,ready:false}),null);
 assert.equal(seq.update(.1,{aboard:true,seated:true,ready:true}),'arrive');
 let finish=0;for(let i=0;i<100;i++)if(seq.update(.1,{ready:true})==='finish')finish++;
 assert.equal(finish,1);assert.equal(seq.active,false);
});
