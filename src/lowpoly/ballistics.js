// World-space physical projectiles. Rendering and damage ownership stay with the caller.
// Generous world-space bound prevents finite-but-overflowing inputs from poisoning collision math.
const finiteVector = point => point && ['x','y','z'].every(axis => Number.isFinite(point[axis]) && Math.abs(point[axis])<=1e9);
const copy = point => ({x:point.x,y:point.y,z:point.z});
const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
const dot = (a,b) => a.x*b.x+a.y*b.y+a.z*b.z;
const minus = (a,b) => ({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const length = point => Math.hypot(point.x,point.y,point.z);
const normalize = point => { const n=length(point); return {x:point.x/n,y:point.y/n,z:point.z/n}; };
const lerp = (a,b,t) => ({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const validTarget = target => target && target.active!==false && finiteVector(target.position) && Number.isFinite(target.radius) && target.radius>=0 && target.radius<=1e9;
const canDamage = (owner,target) => target.damageable!==false && !target.protected &&
  (owner==='player' ? ['enemy','neutral'].includes(target.side) : target.side==='player');
// Explicit same-side cover is supported, but the shooter's own body is otherwise ignored.
const blocks = (owner,target) => target.side===owner ? target.blocking===true : target.blocking!==false;

function contactTime(start,end,centerStart,centerEnd,radius) {
  const relative=minus(start,centerStart), travel=minus(minus(end,centerEnd),relative);
  const c=dot(relative,relative)-radius*radius;
  if (c<=0) return 0;
  const a=dot(travel,travel), b=dot(relative,travel), discriminant=b*b-a*c;
  if (a<1e-12 || discriminant<0) return null;
  const t=(-b-Math.sqrt(discriminant))/a;
  return t>=0 && t<=1 ? t : null;
}

/** fire returns its owned projectile or null; the stable array contains only active shots. */
export function createBallistics({capacity=48}={}) {
  capacity=Number.isFinite(capacity) ? clamp(Math.floor(capacity),1,512) : 48;
  const projectiles=[];
  let serial=0;
  function fire({id,owner,kind,origin,direction,speed,radius,damage,maxDistance}={}) {
    if (projectiles.length>=capacity || !['player','enemy'].includes(owner) || !['energy','rock'].includes(kind) ||
        !finiteVector(origin) || !finiteVector(direction) || length(direction)<1e-9 ||
        !Number.isFinite(speed) || speed<=0 || speed>1e9 || !Number.isFinite(radius) || radius<0 || radius>1e9 ||
        !Number.isFinite(damage) || damage<=0 || !Number.isFinite(maxDistance) || maxDistance<=0 || maxDistance>1e9 ||
        (id!=null && projectiles.some(projectile=>projectile.id===id))) return null;
    const heading=normalize(direction);
    const projectile={id:id??`projectile-${++serial}`,owner,kind,position:copy(origin),previousPosition:copy(origin),
      velocity:{x:heading.x*speed,y:heading.y*speed,z:heading.z*speed},speed,radius,damage,maxDistance,distance:0,age:0,active:true};
    projectiles.push(projectile);
    return projectile;
  }
  function update(dt,targets=[]) {
    const hits=[];
    if (!Number.isFinite(dt) || dt<=0) return hits;
    const bodies=Array.isArray(targets) ? targets.filter(validTarget) : [];
    for (const projectile of projectiles) {
      const remaining=Math.max(0,projectile.maxDistance-projectile.distance);
      const travel=Math.min(remaining,projectile.speed*dt), step=travel/projectile.speed;
      const fraction=step/dt;
      Object.assign(projectile.previousPosition,projectile.position);
      const end={x:projectile.position.x+projectile.velocity.x*step,y:projectile.position.y+projectile.velocity.y*step,z:projectile.position.z+projectile.velocity.z*step};
      let first=null, firstTime=Infinity;
      for (const target of bodies) {
        if (!canDamage(projectile.owner,target) && !blocks(projectile.owner,target)) continue;
        const previous=finiteVector(target.previousPosition) ? target.previousPosition : target.position;
        const current=fraction<1 ? lerp(previous,target.position,fraction) : target.position;
        const t=contactTime(projectile.position,end,previous,current,projectile.radius+target.radius);
        if (t!==null && t<firstTime) { first=target; firstTime=t; }
      }
      Object.assign(projectile.position,first ? lerp(projectile.position,end,firstTime) : end);
      projectile.distance+=travel*(first ? firstTime : 1);
      projectile.age+=step*(first ? firstTime : 1);
      if (first) {
        projectile.active=false;
        if (canDamage(projectile.owner,first)) hits.push({projectileId:projectile.id,owner:projectile.owner,kind:projectile.kind,
          targetId:first.id,damage:projectile.damage,position:copy(projectile.position)});
      } else if (travel>=remaining) projectile.active=false;
    }
    for (let index=projectiles.length-1;index>=0;index--) if (!projectiles[index].active) projectiles.splice(index,1);
    return hits;
  }
  function reset() { for (const projectile of projectiles) projectile.active=false; projectiles.length=0; serial=0; }
  return {projectiles,fire,update,reset};
}

/** Soft world-space correction only: this never turns the camera or chooses an occluded target. */
export function assistAim({origin,direction,targets=[],maxDistance=100,coneAngle=Math.PI/36,strength=.25}={}) {
  const heading=finiteVector(direction) && length(direction)>1e-9 ? normalize(direction) : {x:0,y:0,z:-1};
  const unchanged={direction:heading,targetId:null};
  if (!finiteVector(origin) || !Number.isFinite(maxDistance) || maxDistance<=0 ||
      !Number.isFinite(coneAngle) || coneAngle<=0 || !Number.isFinite(strength) || strength<=0) return unchanged;
  const bodies=Array.isArray(targets) ? targets.filter(validTarget) : [];
  let chosen=null, bestAngle=Infinity, bestDistance=Infinity;
  for (const target of bodies) {
    if (!canDamage('player',target)) continue;
    const offset=minus(target.position,origin), distance=length(offset);
    if (distance<=1e-9 || distance-target.radius>maxDistance) continue;
    const toward=normalize(offset), alignment=dot(heading,toward);
    if (alignment<=0) continue;
    const angle=Math.acos(clamp(alignment,-1,1));
    // Assist near a body's visible silhouette, including a large ship, not just its centre pixel.
    const missAngle=Math.max(0,angle-Math.asin(clamp(target.radius/distance,0,1)));
    if (missAngle>coneAngle) continue;
    const targetContact=contactTime(origin,target.position,target.position,target.position,target.radius)??1;
    const occluded=bodies.some(body=>body!==target && blocks('player',body) &&
      (()=>{ const t=contactTime(origin,target.position,body.position,body.position,body.radius); return t!==null && t<targetContact; })());
    if (occluded || missAngle>bestAngle+1e-9 || (Math.abs(missAngle-bestAngle)<1e-9 && distance>=bestDistance)) continue;
    chosen={target,toward}; bestAngle=missAngle; bestDistance=distance;
  }
  if (!chosen) return unchanged;
  const weight=clamp(strength,0,1)*(1-.5*clamp(bestAngle/coneAngle,0,1));
  return {direction:normalize(lerp(heading,chosen.toward,weight)),targetId:chosen.target.id};
}

/** Converge an offset muzzle on what the camera actually sees, then let physical travel test muzzle-side cover. */
export function aimConvergence({origin,direction,targets=[],maxDistance=100}={}) {
  const start=finiteVector(origin)?copy(origin):{x:0,y:0,z:0};
  if(!finiteVector(origin) || !finiteVector(direction) || length(direction)<1e-9 ||
      !Number.isFinite(maxDistance) || maxDistance<=0 || maxDistance>1e9) return {point:start,targetId:null};
  const heading=normalize(direction),end={x:start.x+heading.x*maxDistance,y:start.y+heading.y*maxDistance,z:start.z+heading.z*maxDistance};
  let first=null,firstTime=Infinity;
  for(const target of Array.isArray(targets)?targets:[]) {
    if(!validTarget(target) || (!canDamage('player',target) && !blocks('player',target))) continue;
    const t=contactTime(start,end,target.position,target.position,target.radius);
    if(t!==null && t<firstTime) {first=target;firstTime=t;}
  }
  return {point:first?lerp(start,end,firstTime):end,targetId:first?.id??null};
}
