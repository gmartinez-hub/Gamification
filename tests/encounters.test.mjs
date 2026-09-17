import test from 'node:test';
import assert from 'node:assert/strict';
import { createEncounters } from '../src/lowpoly/encounters.js';

const player={x:0,y:0,z:-100};
const mission=(id,position=player)=>({id,position,playerPosition:player});
const tick=(world,seconds,options={})=>{
  const events=[];
  for (let index=0;index<Math.ceil(seconds/.05);index++) events.push(...world.update(.05,{playerPosition:player,...options}));
  return events;
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('one destroyed mission rock queues one encounter and repeated callbacks cannot duplicate it', () => {
  const world=createEncounters({seed:'arrival',sector:0});
  assert.equal(world.trigger(mission('small-1')),true);
  assert.equal(world.trigger(mission('small-1')),false);
  const events=tick(world,3);
  assert.equal(events.filter(event=>event.type==='spawn'&&event.kind==='alienShip').length,1);
  assert.equal(events.filter(event=>event.type==='fire').length,0,'the ship must arrive and telegraph before it shoots');
  assert.equal(world.entities.length,1);
});

test('queued encounters expose pending work so their models can load only after the activating explosion', () => {
  const world=createEncounters({seed:'lazy-models',sector:0});
  assert.equal(world.pending,false);
  assert.equal(world.trigger(mission('activation-rock')),true);
  assert.equal(world.pending,true);
  world.update(.1,{playerPosition:player});
  assert.equal(world.pending,false);
  world.reset();
  assert.equal(world.pending,false);
});

test('sector caps include arrivals and queued waves release gradually as slots clear', () => {
  for (const [sector,shipCap,alienCap,missionCount] of [[0,1,1,4],[1,1,2,5],[2,2,3,6]]) {
    const world=createEncounters({seed:`caps-${sector}`,sector});
    for (let index=0;index<missionCount;index++) assert.equal(world.trigger(mission(`mission-${index}`)),true);
    assert.equal(world.trigger(mission('overflow')),false);
    let spawned=0,lastSpawn=-Infinity,maxShips=0,maxAliens=0;
    for (let frame=0;frame<1600;frame++) {
      for (const event of world.update(.05,{playerPosition:player})) if (event.type==='spawn') {
        spawned++;
        assert.ok(frame*.05-lastSpawn>=.9,'spawns should be staggered rather than a same-frame pileup');
        lastSpawn=frame*.05;
      }
      const ships=world.entities.filter(entity=>entity.kind==='alienShip').length;
      const aliens=world.entities.filter(entity=>entity.kind==='alien').length;
      assert.ok(ships<=shipCap && aliens<=alienCap);
      maxShips=Math.max(maxShips,ships); maxAliens=Math.max(maxAliens,aliens);
    }
    assert.ok(spawned>=missionCount,'every accepted destruction must eventually deliver its encounter');
    assert.equal(maxShips,shipCap); assert.equal(maxAliens,alienCap);
  }
});

test('arrivals stay in playable bounds and never materialize in contact with the player', () => {
  for (const edge of [player,{x:218,y:98,z:58},{x:-218,y:-88,z:-298}]) {
    const world=createEncounters({seed:'edges',sector:2});
    for (let index=0;index<6;index++) world.trigger({id:`mission-${index}`,position:edge,playerPosition:edge});
    let spawns=0;
    for (let frame=0;frame<600;frame++) {
      for (const event of world.update(.05,{playerPosition:edge})) if (event.type==='spawn') {
        spawns++;
        assert.ok(distance(event.position,edge)>40);
      }
      for (const entity of world.entities) {
        assert.ok(entity.position.x>=-220 && entity.position.x<=220);
        assert.ok(entity.position.y>=-90 && entity.position.y<=100);
        assert.ok(entity.position.z>=-300 && entity.position.z<=60);
      }
    }
    assert.ok(spawns>0);
  }
});

test('each burst warns before firing and produces straight projectile snapshots for ship and claws', () => {
  const world=createEncounters({seed:'weapons',sector:2});
  world.trigger(mission('one')); world.trigger(mission('two'));
  const warnings=new Map(), shots=[];
  for (let frame=0;frame<600;frame++) {
    for (const event of world.update(.05,{playerPosition:player})) {
      if (event.type==='warning'&&event.reason==='attack') warnings.set(event.id,frame*.05);
      if (event.type==='fire') {
        assert.ok(frame*.05-(warnings.get(event.id)??Infinity)>=.75);
        assert.ok(Math.abs(Math.hypot(event.direction.x,event.direction.y,event.direction.z)-1)<1e-8);
        assert.ok(event.damage>0 && event.radius>0 && event.maxDistance>0);
        const toward={x:player.x-event.origin.x,y:player.y-event.origin.y,z:player.z-event.origin.z};
        assert.ok((toward.x*event.direction.x+toward.y*event.direction.y+toward.z*event.direction.z)/Math.hypot(toward.x,toward.y,toward.z)>.97);
        shots.push({event,copy:structuredClone(event)});
      }
    }
  }
  assert.ok(shots.some(({event})=>event.kind==='alien'&&event.projectileKind==='rock'&&event.speed>=12&&event.speed<=16));
  assert.ok(shots.some(({event})=>event.kind==='alienShip'&&event.projectileKind==='energy'&&event.speed>=18&&event.speed<=24));
  tick(world,2,{playerPosition:{x:100,y:40,z:-220}});
  for (const {event,copy} of shots) assert.deepEqual(event,copy,'emitted shots cannot home or change when entities move');
});

test('protection suppresses firing and requires a fresh telegraph after it ends', () => {
  const world=createEncounters({seed:'protected'}); world.trigger(mission('one'));
  assert.equal(tick(world,8,{protected:true}).filter(event=>event.type==='fire').length,0);
  assert.equal(tick(world,.7).filter(event=>event.type==='fire').length,0);
  assert.ok(tick(world,12).some(event=>event.type==='fire'));
});

test('gem withdrawal clears pending arrivals and never fires during retreat', () => {
  const world=createEncounters({seed:'withdrawal',sector:2});
  for (let index=0;index<6;index++) world.trigger(mission(`mission-${index}`));
  tick(world,6);
  assert.ok(world.entities.length>0);
  world.retreat();
  assert.equal(world.trigger(mission('late')),false);
  const events=tick(world,18);
  assert.equal(events.some(event=>event.type==='fire'||event.type==='spawn'),false);
  assert.equal(world.entities.length,0);
  assert.ok(events.some(event=>event.type==='despawn'&&event.reason==='retreat'));
});

test('retreat passed in update cancels a queued attack before the next shot', () => {
  const world=createEncounters({seed:11}); world.trigger(mission('one')); tick(world,6);
  const events=world.update(.1,{playerPosition:player,retreat:true});
  assert.equal(events.some(event=>event.type==='fire'),false);
  assert.ok(world.entities.every(entity=>entity.phase==='retreat'));
});

test('damage destroys each enemy exactly once and never grants mission progression', () => {
  const world=createEncounters({seed:'damage',sector:2});
  world.trigger(mission('one'));world.trigger(mission('two'));tick(world,2);
  const ship=world.entities.find(entity=>entity.kind==='alienShip');
  assert.ok(ship);
  assert.equal(world.damage(ship.id,60).destroyed,false);
  assert.equal(ship.health,180);
  world.damage(ship.id,60);world.damage(ship.id,60);
  const killed=world.damage(ship.id,60);
  assert.equal(killed.destroyed,true);assert.equal(killed.entity,ship);assert.equal(ship.health,0);assert.equal(ship.active,false);
  assert.equal(world.damage(ship.id,60),null);
  assert.equal('missionCredit' in killed,false);
  tick(world,2);
  const alien=world.entities.find(entity=>entity.kind==='alien');
  assert.ok(alien);
  for (let hit=0;hit<3;hit++) assert.equal(world.damage(alien.id,25).destroyed,false);
  assert.equal(world.damage(alien.id,25).destroyed,true);
});

test('escaping allows enemies to depart without teleporting near the player', () => {
  const world=createEncounters({seed:'escape',sector:2});world.trigger(mission('one'));tick(world,5);
  const escaped={x:200,y:85,z:-285};
  const events=tick(world,18,{playerPosition:escaped});
  assert.equal(world.entities.length,0);
  for (const event of events.filter(event=>event.type==='despawn')) assert.ok(distance(event.position,escaped)>8);
});

test('seeded arrivals and flight are repeatable and frame cadence does not multiply salvos', () => {
  const a=createEncounters({seed:'fixed',sector:2}),b=createEncounters({seed:'fixed',sector:2});
  for (const world of [a,b]) {world.trigger(mission('one'));world.trigger(mission('two'));}
  const first=tick(a,10),second=tick(b,10);
  assert.deepEqual(first,second);assert.deepEqual(a.entities,b.entities);
  const coarse=createEncounters({seed:'fixed',sector:2});coarse.trigger(mission('one'));coarse.trigger(mission('two'));
  const coarseEvents=[];
  for(let index=0;index<50;index++) coarseEvents.push(...coarse.update(.2,{playerPosition:player}));
  assert.ok(Math.abs(first.filter(e=>e.type==='fire').length-coarseEvents.filter(e=>e.type==='fire').length)<=2);
});

test('invalid inputs are inert and reset removes old health, queue and destruction IDs', () => {
  const world=createEncounters({seed:'reset',sector:2}),entities=world.entities;
  assert.equal(world.trigger({id:'bad',position:{x:NaN,y:0,z:0},playerPosition:player}),false);
  assert.equal(world.trigger({id:'',position:player,playerPosition:player}),false);
  world.trigger(mission('one'));tick(world,1);
  const entity=world.entities[0],before=structuredClone(entity);
  for(const amount of [NaN,Infinity,-1,0]) assert.equal(world.damage(entity.id,amount),null);
  for(const dt of [NaN,Infinity,-1]) assert.deepEqual(world.update(dt,{playerPosition:player}),[]);
  assert.deepEqual(entity,before);
  world.reset({seed:'new',sector:0});
  assert.equal(world.entities,entities);assert.equal(entities.length,0);assert.equal(entity.active,false);
  assert.equal(world.trigger(mission('one')),true);
});

test('a resumed sector remembers completed mission encounters without spawning them again', () => {
  const world=createEncounters({seed:'resume',sector:0,completedIds:['small-1','small-2','small-3']});
  assert.deepEqual(tick(world,2),[]);
  assert.equal(world.trigger(mission('small-1')),false);
  assert.equal(world.trigger(mission('core-1')),true);
  assert.equal(world.trigger(mission('duplicate-extra')),false,'the restored three destructions count toward the sector budget');
  const arrivals=tick(world,2).filter(event=>event.type==='spawn');
  assert.ok(arrivals.some(event=>event.kind==='alien'),'the fourth encounter is a deployment, not the first flyby');
  world.reset({seed:'resume',sector:1,completedIds:['small-1','small-2','small-3','core-1']});
  assert.equal(world.trigger(mission('core-1')),false);
  assert.equal(world.trigger(mission('core-2')),true);
  assert.equal(world.trigger(mission('extra')),false);
});

test('large enemy ships enter and fly with clearance for their visible 26 metre hull', () => {
  const edge={x:218,y:98,z:58};
  const world=createEncounters({seed:'ship-clearance',sector:2});
  for(let index=0;index<6;index++) world.trigger({id:`mission-${index}`,position:edge,playerPosition:edge});
  for(let frame=0;frame<450;frame++) {
    const events=world.update(.05,{playerPosition:edge});
    for(const event of events.filter(event=>event.type==='spawn'&&event.kind==='alienShip')) assert.ok(distance(event.position,edge)>55);
    for(const entity of world.entities.filter(entity=>entity.kind==='alienShip')) {
      assert.ok(entity.position.x>=-205 && entity.position.x<=205);
      assert.ok(entity.position.y>=-75 && entity.position.y<=85);
      assert.ok(entity.position.z>=-285 && entity.position.z<=45);
    }
  }
});
