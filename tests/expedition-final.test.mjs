import test from 'node:test';
import assert from 'node:assert/strict';
import {createExpedition} from '../src/lowpoly/expedition.js';
import {createCombat} from '../src/lowpoly/combat.js';
import {createCheckpointStore} from '../src/lowpoly/checkpoint.js';
import {sampleHazard} from '../src/lowpoly/hazards.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
test('optional destruction never awards objectives; respawn is gradual, distant and off-camera',()=>{
 const m=createExpedition(123), specs=[...m.state.layout.hazards,...m.state.layout.breakables];
 for(const s of specs) { for(let i=0;i<10;i++) m.damageOptional(s.id,'ship',0); }
 assert.equal(m.state.destroyed.length,0); assert.equal(m.state.phase,'scan');
 const p=specs[0].position;
 assert.deepEqual(m.updatePopulations(100,{playerPosition:p,isVisible:()=>true}),[]);
 const spawned=m.updatePopulations(100,{playerPosition:p,isVisible:()=>false});
 assert.equal(spawned.length,1);
 const s=specs.find(s=>s.id===spawned[0]); assert.ok(dist(s.position,p)>45+s.radius+8);
 assert.equal(m.updatePopulations(100,{playerPosition:p,isVisible:()=>false}).length,0);
});
test('separated discoveries require ship travel and EVA remains tether-accessible',()=>{
 for(let seed=0;seed<30;seed++) { const m=createExpedition(seed), l=m.state.layout;
  assert.equal(m.discover({x:0,y:0,z:10}).includes(l.small[2].id),false);
  for(const t of l.small) assert.ok(dist(t.position,t.approach)<20);
  assert.ok(dist(l.small[0].position,l.small[2].position)>100);
  assert.ok(l.large.every(t=>dist(t.position,{x:0,y:0,z:10})>70));
 }
});
test('partial saves preserve IDs and last actual core location in arbitrary kill order',()=>{
 let raw; const store=createCheckpointStore({setItem(k,v){raw=v},getItem(){return raw}});
 const m=createExpedition(42); m.restoreCheckpoint({seed:42,sector:2,complete:false,gemRecovered:false});m.scan();
 m.hit(m.state.layout.small[0].id,'astronaut');store.save(m.state,{});
 const n=createExpedition();assert.equal(n.restoreCheckpoint(store.load()),true);assert.equal(n.state.destroyed.length,1);assert.equal(n.state.phase,'small');
 for(const t of n.state.layout.small)n.hit(t.id,'astronaut');
 const [a,b,c]=n.state.layout.large; n.hit(c.id,'ship');n.hit(a.id,'ship');
 const actual={};sampleHazard(b,13.7,actual,{});n.hit(b.id,'ship',actual);assert.deepEqual(n.state.layout.gem,actual);
 store.save(n.state,{});m.restoreCheckpoint(store.load());assert.equal(m.state.phase,'gem');assert.deepEqual(m.state.layout.gem,actual);
});
test('interrupted assisted shots retain assistance and optional targets accept both weapons',()=>{
 const c=createCombat(()=>1),shot={id:'x',actor:'astronaut',kind:'hazard',distance:4,chance:.5,origin:{x:0,y:0,z:0}};
 for(let i=0;i<2;i++){assert.equal(c.start(shot),true);assert.equal(c.update(4).hit,false);c.update(1)}
 c.start(shot); assert.equal(c.update(.2,{blocked:true}).interrupted,true); c.update(1);
 assert.equal(c.chanceFor(shot),1);c.start(shot);assert.equal(c.update(4).hit,true);assert.equal(c.stats.misses,2);
});
test('all motion families are continuous and sampled velocities match displacement',()=>{
 const m=createExpedition(9);const families=new Set();
 for(const s of [...m.state.layout.small,...m.state.layout.hazards,...m.state.layout.breakables]) {
  families.add(s.motion.type);const a={},b={},v={};sampleHazard(s,11,a,v);sampleHazard(s,11.0001,b,{});
  assert.ok(Math.hypot(...['x','y','z'].map(k=>(b[k]-a[k])/ .0001-v[k]))<.001);
 } assert.ok(families.size>=3);
});
test('scan fraction round trips; forged or out-of-order objective IDs never award progress',()=>{
 let raw;const store=createCheckpointStore({setItem(k,v){raw=v},getItem(){return raw}});const m=createExpedition(5);
 m.setScanProgress(.6);store.save(m.state,{});const n=createExpedition(6);n.restoreCheckpoint(store.load());
 assert.equal(n.state.phase,'scan');assert.equal(n.state.scanProgress,.6);
 const saved=store.load();saved.destroyed=['unknown',n.state.layout.large[0].id];saved.discovered=['unknown'];
 n.restoreCheckpoint(saved);assert.deepEqual(n.state.destroyed,[]);assert.deepEqual(n.state.discovered,[]);assert.equal(n.state.phase,'scan');
 saved.lastCorePosition={x:NaN,y:0,z:0};assert.equal(n.restoreCheckpoint(saved),false);
});
test('legacy version one checkpoints migrate without inventing combat progress',()=>{
 const store=createCheckpointStore({getItem(){return JSON.stringify({version:1,seed:2,sector:1,complete:false,gemRecovered:false})}});
 const m=createExpedition();assert.equal(m.restoreCheckpoint(store.load()),true);assert.equal(m.state.phase,'scan');assert.equal(m.state.gems,1);
});
test('blocked acquisition and invalid actors never spend RNG or assistance',()=>{
 let rolls=0;const c=createCombat(()=>{rolls++;return 0});const s={id:'x',actor:'astronaut',kind:'breakable',distance:1,chance:.5};
 assert.equal(c.start({...s,blocked:true}),false);assert.equal(c.start({...s,discovered:false}),false);
 assert.equal(c.start({...s,actor:'toString'}),false);assert.equal(rolls,0);
});
test('saved gem position must belong to the last destroyed core envelope',()=>{
 const m=createExpedition(123);m.restoreCheckpoint({seed:123,sector:2,gemRecovered:false,complete:false});m.scan();
 for(const t of m.state.layout.small)m.hit(t.id,'astronaut');
 const [a,b,c]=m.state.layout.large;for(const t of [c,a,b]){const p={};sampleHazard(t,17.3,p,{});m.hit(t.id,'ship',p);}
 const actual={...m.state.layout.gem};
 const save={version:2,seed:123,sector:2,gemRecovered:false,complete:false,scanned:true,destroyed:[...m.state.destroyed],lastCorePosition:actual};
 const n=createExpedition();assert.equal(n.restoreCheckpoint(save),true);assert.deepEqual(n.state.layout.gem,actual);
 for(const invalid of [{x:9999,y:9999,z:9999},a.position]){
  assert.equal(n.restoreCheckpoint({...save,lastCorePosition:invalid}),true);
  assert.equal(n.state.phase,'gem');assert.deepEqual(n.state.layout.gem,b.position);
 }
});
test('population envelopes never overlap; decoration stays outside the traversable volume',()=>{
 for(let seed=0;seed<100;seed++)for(let sector=0;sector<3;sector++){
  const m=createExpedition(seed);m.restoreCheckpoint({seed,sector,gemRecovered:false,complete:false});const l=m.state.layout;
  const specs=[...l.hazards,...l.breakables,...l.decoration];
  const envelope=s=>s.radius+s.motion.amplitude*1.5;
  for(let i=0;i<specs.length;i++)for(let j=0;j<i;j++) assert.ok(dist(specs[i].position,specs[j].position)>envelope(specs[i])+envelope(specs[j]),`${seed}/${sector}: ${specs[i].id} overlaps ${specs[j].id}`);
  for(const s of specs)for(const t of [...l.small,...l.large])assert.ok(dist(s.position,t.position)>envelope(s)+envelope(t)+4);
  for(const d of l.decoration)assert.ok(Math.abs(d.position.x)-envelope(d)>220,'decoration outside x±220 traversable bound');
 }
});
test('motion calibration preserves saved layouts while hazards gain bounded speed and varied planes',async()=>{
 const {createHash}=await import('node:crypto');const layouts=[];
 for(const seed of [0,42,620,712069])for(let sector=0;sector<3;sector++){
  const m=createExpedition(seed);m.restoreCheckpoint({seed,sector,complete:false,gemRecovered:false});const l=m.state.layout;
  layouts.push(JSON.parse(JSON.stringify(l,(key,value)=>key==='motion'?{amplitude:value.amplitude,phase:value.phase,type:value.type}:value)));
  for(const spec of [...l.small,...l.large,...l.hazards,...l.breakables,...l.decoration]){
   const {axis,secondary,amplitude,period}=spec.motion,speed=amplitude*2*Math.PI/period;
   assert.ok(Math.abs(Math.hypot(...Object.values(axis))-1)<1e-8);assert.ok(Math.abs(Math.hypot(...Object.values(secondary))-1)<1e-8);
   assert.ok(Math.abs(axis.x*secondary.x+axis.y*secondary.y+axis.z*secondary.z)<1e-8);
   if(spec.role==='hazard')assert.ok(speed>=1.44&&speed<=1.56,'hazard base speed increases ~20% without spikes');
   else assert.ok(speed>=1.175&&speed<=1.325,'nonhazards keep approximately their existing translation speed');
   for(let i=0;i<80;i++){const p={},v={};sampleHazard(spec,period*i/80,p,v);assert.ok(dist(p,spec.position)<=amplitude*1.5+1e-8);assert.ok(Math.hypot(v.x,v.y,v.z)<=speed*Math.SQRT2+1e-8);}
  }
  assert.ok(new Set(l.hazards.map(s=>JSON.stringify(s.motion.axis))).size>3,'hazards must not all share a plane');
 }
 assert.equal(createHash('sha256').update(JSON.stringify(layouts)).digest('hex'),'b7dc407aef0ff0904889d457bfd39a8e191af1dbe17d54d9e2444f7aef3c4428','centres, routes, phases, sizes and populations remain byte-identical to pre-calibration layouts');
});
