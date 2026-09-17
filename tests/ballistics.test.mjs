import test from 'node:test';
import assert from 'node:assert/strict';
import { createBallistics, assistAim, aimConvergence } from '../src/lowpoly/ballistics.js';

const origin = {x:0,y:0,z:0}, forward = {x:0,y:0,z:-1};
const shot = (overrides = {}) => ({owner:'player',kind:'energy',origin,direction:forward,speed:100,radius:.1,damage:25,maxDistance:100,...overrides});
const target = (id, z, overrides = {}) => ({id,position:{x:0,y:0,z},radius:1,side:'enemy',...overrides});
const almost = (actual, wanted) => assert.ok(Math.abs(actual-wanted)<1e-8, `${actual} != ${wanted}`);

test('a fast projectile sweeps its entire travel and stops at the first surface', () => {
  const world = createBallistics();
  const projectile = world.fire(shot({id:'fast'}));
  const hits = world.update(.3,[target('far',-20),target('near',-10)]);
  assert.equal(hits.length,1);
  assert.equal(hits[0].targetId,'near');
  assert.equal(hits[0].projectileId,'fast');
  assert.equal(hits[0].damage,25);
  almost(hits[0].position.z,-8.9);
  assert.equal(projectile.active,false);
  assert.equal(world.projectiles.length,0);
  assert.deepEqual(world.update(.3,[target('near',-10)]),[]);
});

test('a projectile cannot tunnel through a target crossing its path between frames', () => {
  const world = createBallistics(); world.fire(shot());
  const hits = world.update(.2,[target('crossing',-10,{previousPosition:{x:-5,y:0,z:-10},position:{x:5,y:0,z:-10}})]);
  assert.equal(hits[0]?.targetId,'crossing');
});

test('cover absorbs shots before damageable targets independently of input order', () => {
  const world = createBallistics(); world.fire(shot());
  assert.deepEqual(world.update(.3,[target('enemy',-20),target('wall',-8,{side:'neutral',damageable:false})]),[]);
  assert.equal(world.projectiles.length,0);
});

test('same-side bodies are ignored unless explicitly made blocking cover', () => {
  const world = createBallistics(); world.fire(shot());
  assert.equal(world.update(.3,[target('self',-2,{side:'player'}),target('enemy',-20)])[0]?.targetId,'enemy');
  world.fire(shot());
  assert.deepEqual(world.update(.3,[target('friend',-2,{side:'player',blocking:true}),target('enemy',-20)]),[]);
  assert.equal(world.projectiles.length,0);
});

test('enemy shots cannot destroy neutral mission rocks or damage protected players', () => {
  const world = createBallistics();
  world.fire(shot({owner:'enemy',kind:'rock'}));
  assert.deepEqual(world.update(.3,[target('mission',-8,{side:'neutral'}),target('player',-20,{side:'player'})]),[]);
  world.fire(shot({owner:'enemy',kind:'rock'}));
  assert.deepEqual(world.update(.3,[target('player',-20,{side:'player',protected:true})]),[]);
  assert.equal(world.projectiles.length,0);
  world.fire(shot({owner:'enemy',kind:'rock'}));
  const [hit] = world.update(.3,[target('player',-20,{side:'player'})]);
  assert.equal(hit.targetId,'player'); assert.equal(hit.owner,'enemy'); assert.equal(hit.kind,'rock');
});

test('maximum distance expires a projectile without reaching targets beyond its range', () => {
  const world = createBallistics();
  world.fire(shot({maxDistance:5}));
  assert.deepEqual(world.update(10,[target('beyond',-8)]),[]);
  assert.equal(world.projectiles.length,0);
  world.fire(shot({maxDistance:5}));
  assert.equal(world.update(10,[target('surface-in-range',-6)])[0]?.targetId,'surface-in-range');
});

test('shots own their positions and keep a fixed non-homing velocity after firing', () => {
  const world = createBallistics(), muzzle = {x:1,y:2,z:3}, aim = {x:0,y:0,z:-4};
  const projectile = world.fire(shot({origin:muzzle,direction:aim}));
  muzzle.x=99; aim.x=99;
  world.update(.1,[]);
  assert.deepEqual(projectile.previousPosition,{x:1,y:2,z:3});
  assert.deepEqual(projectile.position,{x:1,y:2,z:-7});
  assert.deepEqual(projectile.velocity,{x:0,y:0,z:-100});
  world.update(.1,[target('off-axis',-20,{position:{x:20,y:0,z:-20}})]);
  assert.deepEqual(projectile.velocity,{x:0,y:0,z:-100});
});

test('invalid fire calls cannot poison the bounded pool or evict active shots', () => {
  const world = createBallistics({capacity:2}), storage=world.projectiles;
  for (const bad of [{speed:NaN},{damage:Infinity},{direction:{x:0,y:0,z:0}},{origin:{x:0,y:NaN,z:0}},{radius:-1},{maxDistance:0},{owner:'unknown'}]) {
    assert.equal(world.fire(shot(bad)),null);
  }
  assert.equal(world.projectiles.length,0);
  const one=world.fire(shot({id:'one'}));
  assert.equal(world.fire(shot({id:'one'})),null);
  assert.ok(world.fire(shot({id:'two'})));
  assert.equal(world.fire(shot({id:'three'})),null);
  for (const dt of [NaN,Infinity,-1,undefined]) assert.deepEqual(world.update(dt,[]),[]);
  assert.deepEqual(one.position,origin);
  world.reset();
  assert.equal(world.projectiles,storage); assert.equal(storage.length,0); assert.equal(one.active,false);
  assert.ok(world.fire(shot({id:'one'})));
});

test('aim assistance bends a little toward a nearby visible target without mutating the input', () => {
  const direction={...forward};
  const aim=assistAim({origin,direction,targets:[target('enemy',-20,{position:{x:1,y:0,z:-20}})],coneAngle:.1,strength:.3});
  assert.equal(aim.targetId,'enemy');
  assert.ok(aim.direction.x>0 && aim.direction.x<.03);
  almost(Math.hypot(...Object.values(aim.direction)),1);
  assert.deepEqual(direction,forward);
});

test('aim assistance rejects targets behind cover, outside the cone, protected or friendly', () => {
  const enemy=target('enemy',-20,{position:{x:1,y:0,z:-20}});
  for (const targets of [[enemy,target('wall',-10,{side:'neutral',damageable:false,radius:3})],
    [target('outside',-20,{position:{x:15,y:0,z:-20}})], [target('behind',20)],
    [target('protected',-20,{protected:true})], [target('friendly',-20,{side:'player'})]]) {
    const aim=assistAim({origin,direction:forward,targets,coneAngle:.1});
    assert.equal(aim.targetId,null); assert.deepEqual(aim.direction,forward);
  }
});

test('aim assistance prefers the visible near body and never selects non-damageable geometry', () => {
  const aim=assistAim({origin,direction:forward,targets:[target('far',-20),target('near',-8)]});
  assert.equal(aim.targetId,'near');
  const untouched=assistAim({origin,direction:forward,targets:[target('decor',-8,{damageable:false,blocking:false})]});
  assert.equal(untouched.targetId,null);
});

test('finite but overflowing magnitudes cannot introduce invalid projectile coordinates', () => {
  const world=createBallistics();
  assert.equal(world.fire(shot({origin:{x:1e308,y:1e308,z:1e308},direction:{x:1,y:1,z:1},maxDistance:1e308})),null);
  assert.equal(world.fire(shot({direction:{x:1e308,y:1e308,z:1e308}})),null);
  assert.equal(world.projectiles.length,0);
});

test('camera convergence chooses the first sphere surface rather than a point far behind a close target', () => {
  const result=aimConvergence({origin:{x:0,y:2,z:5},direction:forward,targets:[target('far',-30,{position:{x:0,y:2,z:-30}}),target('near',-10,{position:{x:0,y:2,z:-10}})],maxDistance:100});
  assert.equal(result.targetId,'near');almost(result.point.x,0);almost(result.point.y,2);almost(result.point.z,-9);
  const muzzle={x:1.5,y:1,z:0},world=createBallistics();
  world.fire(shot({origin:muzzle,direction:{x:result.point.x-muzzle.x,y:result.point.y-muzzle.y,z:result.point.z-muzzle.z}}));
  assert.equal(world.update(.3,[target('near',-10,{position:{x:0,y:2,z:-10}})])[0]?.targetId,'near','an offset muzzle must hit the object the camera points at');
});

test('camera convergence includes opaque cover and explicit friendly cover but ignores the shooter', () => {
  const result=aimConvergence({origin,direction:forward,maxDistance:100,targets:[
    target('shooter',-2,{side:'player'}),target('enemy',-20),target('wall',-8,{side:'neutral',damageable:false})]});
  assert.equal(result.targetId,'wall');almost(result.point.x,0);almost(result.point.y,0);almost(result.point.z,-7);
  assert.equal(aimConvergence({origin,direction:forward,targets:[target('friend',-4,{side:'player',blocking:true})]}).targetId,'friend');
});

test('camera convergence falls back to the ray range when only nonblocking scenery or out-of-range bodies are present', () => {
  const result=aimConvergence({origin,direction:{x:0,y:0,z:-5},maxDistance:12,targets:[
    target('scenery',-4,{side:'neutral',damageable:false,blocking:false}),target('far',-20),target('behind',4)]});
  assert.equal(result.targetId,null);assert.deepEqual(result.point,{x:0,y:0,z:-12});
});

test('camera convergence does not grant a route through cover between muzzle and target', () => {
  const enemy=target('enemy',-20,{position:{x:0,y:2,z:-20}});
  const wall=target('low-wall',-6,{position:{x:2,y:.8,z:-6},radius:.9,side:'neutral',damageable:false});
  const result=aimConvergence({origin:{x:0,y:2,z:0},direction:forward,maxDistance:40,targets:[enemy,wall]});
  assert.equal(result.targetId,'enemy');
  const muzzle={x:3,y:.5,z:0},world=createBallistics();
  world.fire(shot({origin:muzzle,direction:{x:result.point.x-muzzle.x,y:result.point.y-muzzle.y,z:result.point.z-muzzle.z}}));
  assert.deepEqual(world.update(.4,[enemy,wall]),[]);assert.equal(world.projectiles.length,0);
});
