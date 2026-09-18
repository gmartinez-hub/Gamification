/** Slow the world and its debris without stretching UI, loading or action timers. */
export function createPresentationClock() {
  let time=0, worldTime=0, moments=[];
  return {
    get time(){return time;}, get worldTime(){return worldTime;},
    moment(kind='impact') { moments.push({start:time,duration:kind==='gem'?1.8:kind==='ship'?1.1:.65,scale:kind==='gem'?.12:.2}); },
    reset(){time=worldTime=0;moments=[];},
    clearMoments(){moments=[];},
    advance(delta,{paused=false,aiming=false,reducedMotion=false}={}) {
      const dt=paused?0:Math.min(.05,Math.max(0,Number.isFinite(delta)?delta:0)); time+=dt;
      moments=moments.filter(m=>time-m.start<m.duration);
      let scale=aiming?.4:1;
      for(const m of moments){const t=(time-m.start)/m.duration;scale=Math.min(scale,m.scale+(1-m.scale)*Math.max(0,(t-.55)/.45));}
      if(reducedMotion)scale=1;
      worldTime+=dt*scale;
      return {dt,worldDt:dt*scale,time,worldTime,scale};
    },
  };
}

/** The cinematic never substitutes a teleport for boarding or skips resource readiness. */
export function createGemSequence() {
 let phase='idle',age=0,skip=false,departure=false;
 const set=next=>{phase=next;age=0;};
 return {
  get phase(){return phase;}, get age(){return age;}, get active(){return phase!=='idle';},
  start({aboard=false}={}){if(phase!=='idle')return false;skip=false;departure=false;set(aboard?'boarding':'suspension');return true;},
  depart(){if(phase!=='ready'||departure)return false;departure=true;return true;},
  skip(){if(phase==='idle')return false;skip=true;return true;},
  reset(){skip=false;departure=false;set('idle');},
  update(dt,{aboard=false,seated=false,ready=false,reducedMotion=false}={}){
   if(!Number.isFinite(dt)||dt<=0||phase==='idle')return null;age+=Math.min(dt,.1);
   const brief=skip||reducedMotion;
   if(phase==='suspension'&&age>=(brief?.15:1.8)){set('returning');return 'return';}
   if(phase==='returning'&&aboard){set('boarding');return 'board';}
   if(phase==='boarding'&&aboard&&seated){set('ready');return 'ready';}
   if(phase==='ready'&&departure){departure=false;set('travel');return 'travel';}
   if(phase==='travel'&&age>=(brief?.5:6)&&ready){set('assembly');return 'arrive';}
   if(phase==='assembly'&&age>=(brief?2.5:3.4)){set('idle');return 'finish';}
   return null;
  }
 };
}
