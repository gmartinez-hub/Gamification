// Seeded encounter scheduling and movement. Mesh sockets, effects and mission credit belong to the caller.
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const finiteVector=point=>point && ['x','y','z'].every(axis=>Number.isFinite(point[axis]));
const copy=point=>({x:point.x,y:point.y,z:point.z});
const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const length=point=>Math.hypot(point.x,point.y,point.z);
const distance=(a,b)=>length(subtract(a,b));
const normalize=point=>{const n=length(point);return n>1e-9?{x:point.x/n,y:point.y/n,z:point.z/n}:{x:0,y:0,z:-1};};
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const smooth=value=>{const t=clamp(value,0,1);return t*t*(3-2*t);};
const inBounds=(point,margin=0)=>({x:clamp(point.x,-220+margin,220-margin),y:clamp(point.y,-90+margin,100-margin),z:clamp(point.z,-300+margin,60-margin)});
const CAPS=[{alienShip:1,alien:1},{alienShip:1,alien:2},{alienShip:2,alien:3}];

function randomStream(seed) {
  let state=2166136261;
  for(const character of String(seed)) state=Math.imul(state^character.charCodeAt(0),16777619);
  return ()=>{
    state=(state+0x6d2b79f5)>>>0;
    let value=Math.imul(state^(state>>>15),state|1);
    value^=value+Math.imul(value^(value>>>7),value|61);
    return ((value^(value>>>14))>>>0)/4294967296;
  };
}

function arrivalPoint(player,angle,random,clearance) {
  const range=64+random()*14, height=(random()*2-1)*24;
  for(let attempt=0;attempt<12;attempt++) {
    const a=angle+attempt*Math.PI/6;
    const candidate=inBounds({x:player.x+Math.cos(a)*range,y:player.y+height,z:player.z+Math.sin(a)*range},clearance);
    if(distance(candidate,player)>40+clearance) return candidate;
  }
  // Even at the playable volume's edge there is a distant, deterministic entry point.
  let best={x:0,y:0,z:-120}, reach=0;
  for(const x of [-210,210]) for(const y of [-80,90]) for(const z of [-290,50]) {
    const point=inBounds({x,y,z},clearance), d=distance(point,player);
    if(d>reach) {best=point;reach=d;}
  }
  return best;
}

function orbitPoint(entity,age) {
  const angle=entity.orbitPhase+Math.max(0,age-entity.arrivalDuration)*entity.orbitSpeed;
  return inBounds({x:entity.anchor.x+Math.cos(angle)*entity.orbitRadius,
    y:entity.anchor.y+Math.sin(angle*1.3+entity.orbitPhase)*entity.orbitHeight,
    z:entity.anchor.z+Math.sin(angle)*entity.orbitRadius*.72},entity.clearanceRadius);
}

/** Each required destruction is accepted once; accepted waves remain bounded by sector mission count. */
export function createEncounters({seed=712069,sector=0,completedIds=[]}={}) {
  const entities=[],queue=[],seen=new Set();
  let random,time,nextSpawn,serial,withdrawing;
  function reset(options={}) {
    seed=options.seed??seed;
    sector=Number.isFinite(options.sector??sector)?clamp(Math.floor(options.sector??sector),0,2):0;
    random=randomStream(`${seed}:encounters:${sector}`);
    for(const entity of entities) entity.active=false;
    entities.length=0;queue.length=0;seen.clear();time=0;nextSpawn=0;serial=0;withdrawing=false;
    if(Array.isArray(options.completedIds)) for(const id of options.completedIds) {
      if(typeof id==='string' && id && seen.size<4+sector) seen.add(id);
    }
  }
  reset({seed,sector,completedIds});

  function trigger({id,position,playerPosition}={}) {
    if(withdrawing || typeof id!=='string' || !id || seen.has(id) || seen.size>=4+sector ||
        !finiteVector(position) || !finiteVector(playerPosition)) return false;
    seen.add(id);
    const ordinal=seen.size;
    const entry={sourceId:id,position:copy(position),playerPosition:copy(playerPosition),ordinal};
    // The first contact is a flyby. Later waves deploy claws and add a carrier on alternating waves.
    if(ordinal===1 || ordinal%2===1) queue.push({...entry,kind:'alienShip',mode:ordinal===1?'pass':'deploy'});
    if(ordinal>=2) queue.push({...entry,kind:'alien',mode:'deploy'});
    return true;
  }

  function spawn(entry,player,events) {
    const isShip=entry.kind==='alienShip';
    const angle=random()*Math.PI*2+entry.ordinal*2.399963;
    const clearanceRadius=isShip?15:1.5;
    let position=arrivalPoint(player,angle,random,clearanceRadius);
    const carrier=entry.kind==='alien' ? entities.find(entity=>entity.kind==='alienShip'&&entity.phase!=='retreat') : null;
    if(carrier && distance(carrier.position,player)>44) position=copy(carrier.position);
    const maxHealth=isShip?240:100;
    const entity={id:`enemy-${sector+1}-${++serial}`,kind:entry.kind,sourceId:entry.sourceId,mode:entry.mode,carrierId:carrier?.id??null,
      position:copy(position),previousPosition:copy(position),velocity:{x:0,y:0,z:0},forward:normalize(subtract(player,position)),
      radius:isShip?6.5:1.1,clearanceRadius,health:maxHealth,maxHealth,phase:'arrival',age:0,active:true,
      animationPhase:'flight',animationTime:0,charge:0,thrust:1,arrivalProgress:0,
      anchor:{x:clamp(entry.position.x,-166,166),y:clamp(entry.position.y,-58,68),z:clamp(entry.position.z,-256,16)},
      entryPosition:copy(position),arrivalDuration:isShip?3.4:2.8,orbitPhase:random()*Math.PI*2,
      orbitRadius:isShip?34+random()*5:17+random()*4,orbitHeight:isShip?5+random()*3:4+random()*3,
      orbitSpeed:(isShip?.2:.35)*(random()<.5?-1:1),
      lifetime:isShip?(entry.mode==='pass'?19:29):33+sector*3,attackClock:0,attackState:'wait',
      cooldown:.45+random()*.45,burstRemaining:0,escapeTime:0,retreatAge:0,retreatDirection:null};
    entities.push(entity);
    events.push({type:'spawn',id:entity.id,kind:entity.kind,sourceId:entry.sourceId,carrierId:entity.carrierId,
      mode:entity.mode,position:copy(position)});
    events.push({type:'warning',id:entity.id,kind:entity.kind,reason:'arrival',position:copy(position)});
  }

  function beginRetreat(entity) {
    if(entity.phase==='retreat') return;
    entity.phase='retreat';entity.retreatAge=0;entity.charge=0;entity.attackState='wait';entity.burstRemaining=0;
    entity.animationPhase='flight';entity.animationTime=0;
    // Continue away from the encounter rather than aiming toward or chasing the player.
    entity.retreatDirection=normalize(subtract(entity.position,entity.anchor));
  }

  function retreat() {
    withdrawing=true;queue.length=0;
    for(const entity of entities) beginRetreat(entity);
  }

  function fire(entity,player,events) {
    const isShip=entity.kind==='alienShip', direction=normalize(subtract(player,entity.position));
    // Plain snapshots: a later player movement does not redirect a projectile already emitted.
    const origin={x:entity.position.x+direction.x*(entity.radius+.2),
      y:entity.position.y+direction.y*(entity.radius+.2),z:entity.position.z+direction.z*(entity.radius+.2)};
    events.push({type:'fire',id:entity.id,kind:entity.kind,owner:'enemy',projectileKind:isShip?'energy':'rock',
      origin,direction,speed:isShip?20+sector:13+sector,radius:isShip?.24:.22,damage:isShip?12:8,maxDistance:isShip?110:80,
      claw:entity.burstRemaining%2?'left':'right'});
    entity.animationPhase='attack';entity.animationTime=0;
  }

  function updateAttack(entity,dt,player,protectedPlayer,events) {
    const attackRange=entity.kind==='alienShip'?100:65;
    if(protectedPlayer || distance(entity.position,player)>attackRange) {
      entity.attackState='wait';entity.cooldown=.2;entity.attackClock=0;entity.burstRemaining=0;entity.charge=0;
      entity.animationPhase='flight';return;
    }
    entity.animationTime+=dt;
    entity.attackClock+=dt;
    if(entity.attackState==='wait') {
      entity.cooldown-=dt;
      if(entity.cooldown<=0) {
        entity.attackState='charge';entity.attackClock=0;entity.animationPhase='charge';entity.animationTime=0;
        events.push({type:'warning',id:entity.id,kind:entity.kind,reason:'attack',position:copy(entity.position),duration:.9});
      }
    } else if(entity.attackState==='charge') {
      entity.charge=clamp(entity.attackClock/.9,0,1);
      if(entity.attackClock>=.9) {
        entity.attackState='burst';entity.attackClock=0;entity.burstRemaining=entity.kind==='alienShip'?2:3;
        fire(entity,player,events);entity.burstRemaining--;
      }
    } else if(entity.attackState==='burst') {
      entity.charge=0;
      if(entity.attackClock>=.36) {
        entity.attackClock=0;
        if(entity.burstRemaining>0) {fire(entity,player,events);entity.burstRemaining--;}
        else {entity.attackState='recover';entity.animationPhase='recover';entity.animationTime=0;}
      }
    } else if(entity.attackState==='recover' && entity.attackClock>=.7) {
      entity.attackState='wait';entity.cooldown=2.5+random()*1.3-sector*.25;entity.animationPhase='flight';
    }
  }

  function step(dt,player,protectedPlayer,events) {
    time+=dt;
    if(!withdrawing && time>=nextSpawn) {
      const index=queue.findIndex(entry=>entities.filter(entity=>entity.kind===entry.kind).length<CAPS[sector][entry.kind]);
      if(index>=0) {spawn(queue.splice(index,1)[0],player,events);nextSpawn=time+1.15;}
    }
    for(const entity of entities) {
      Object.assign(entity.previousPosition,entity.position);
      entity.age+=dt;
      if(entity.phase!=='retreat') {
        entity.escapeTime=distance(entity.position,player)>145 ? entity.escapeTime+dt : 0;
        if(withdrawing || entity.age>=entity.lifetime || entity.escapeTime>3) beginRetreat(entity);
      }
      if(entity.phase==='retreat') {
        entity.retreatAge+=dt;
        const speed=entity.kind==='alienShip'?24:15;
        Object.assign(entity.position,inBounds({x:entity.position.x+entity.retreatDirection.x*speed*dt,
          y:entity.position.y+entity.retreatDirection.y*speed*dt,z:entity.position.z+entity.retreatDirection.z*speed*dt},entity.clearanceRadius));
        entity.thrust=1;entity.animationTime+=dt;
        if(entity.retreatAge>5 && distance(entity.position,player)>8) {
          entity.active=false;
          events.push({type:'despawn',id:entity.id,kind:entity.kind,position:copy(entity.position),reason:withdrawing?'retreat':'departed'});
        }
      } else {
        const destination=orbitPoint(entity,entity.age);
        entity.arrivalProgress=clamp(entity.age/entity.arrivalDuration,0,1);
        Object.assign(entity.position,entity.phase==='arrival'?lerp(entity.entryPosition,destination,smooth(entity.arrivalProgress)):destination);
        if(entity.arrivalProgress>=1) entity.phase='engaged';
        entity.thrust=entity.phase==='arrival'?1:.45;
        if(entity.phase==='engaged') updateAttack(entity,dt,player,protectedPlayer,events);
      }
      for(const axis of ['x','y','z']) entity.velocity[axis]=(entity.position[axis]-entity.previousPosition[axis])/dt;
      const facing=entity.phase==='retreat'||entity.phase==='arrival' ? entity.velocity : subtract(player,entity.position);
      if(length(facing)>1e-7) Object.assign(entity.forward,normalize(facing));
    }
    for(let index=entities.length-1;index>=0;index--) if(!entities[index].active) entities.splice(index,1);
  }

  function update(dt,options={}) {
    const events=[];
    if(!Number.isFinite(dt) || dt<=0 || !finiteVector(options.playerPosition)) return events;
    if(options.retreat) retreat();
    // Do not unleash accumulated attacks after a suspended/background browser frame.
    const elapsed=Math.min(dt,.25),count=Math.ceil(elapsed/.05),stepTime=elapsed/count;
    const previous=new Map(entities.map(entity=>[entity.id,copy(entity.position)]));
    for(let index=0;index<count;index++) step(stepTime,options.playerPosition,!!options.protected,events);
    // Collision consumers sweep the complete update, not merely its last simulation substep.
    for(const entity of entities) if(previous.has(entity.id)) Object.assign(entity.previousPosition,previous.get(entity.id));
    return events;
  }

  function damage(id,amount) {
    if(!Number.isFinite(amount) || amount<=0) return null;
    const entity=entities.find(candidate=>candidate.id===id);
    if(!entity || !entity.active) return null;
    entity.health=Math.max(0,entity.health-amount);
    const destroyed=entity.health===0;
    if(destroyed) {entity.active=false;entity.phase='destroyed';entities.splice(entities.indexOf(entity),1);}
    return {destroyed,entity};
  }
  return {entities,get pending(){return queue.length>0;},trigger,update,damage,reset,retreat};
}
