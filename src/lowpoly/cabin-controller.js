// A short approach to the pilot station, not a free-roaming interior.
export const CABIN_LAYOUT = Object.freeze({
 origin:Object.freeze({x:0,y:-.90,z:-3.20}),
 seat:Object.freeze({x:0,y:-.31,z:1.08}),
 stand:Object.freeze({x:.74,y:0,z:1.26}),
 entry:Object.freeze({x:.86,y:0,z:1.43}),
 access:Object.freeze({x:.96,y:0,z:1.58}),
 height:1.899,dashboardScale:1.80,
});
const copy=p=>({...p}),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createCabinController({aboard=false}={}){
 const state={mode:aboard?'piloting':'eva',position:copy(CABIN_LAYOUT.seat),yaw:0,speed:0,pose:aboard?1:0,transition:0,walkPhase:0,door:0};
 let elapsed=0,from=copy(state.position),exited=false,autoSeat=false,wantsExit=false;
 function change(mode){state.mode=mode;elapsed=0;state.transition=0;from=copy(state.position);state.speed=0;}
 function move(to,t,dt){const s=t*t*(3-2*t),old=copy(state.position);for(const k of['x','y','z'])state.position[k]=from[k]+(to[k]-from[k])*s;state.speed=Math.hypot(state.position.x-old.x,state.position.z-old.z)/Math.max(dt,.001);state.walkPhase+=state.speed*dt*5.8;}
 const api={state,
  get inside(){return state.mode!=='eva';},get canPilot(){return state.mode==='piloting';},
  get needsStabilization(){return !['eva','piloting'].includes(state.mode);},
  get canSit(){return state.mode==='standing';},get canExit(){return ['standing','piloting'].includes(state.mode);},
  enter({autoSeat:next=false}={}){if(state.mode!=='eva')return false;state.position=copy(CABIN_LAYOUT.entry);state.pose=0;state.yaw=0;autoSeat=next;wantsExit=false;change('entering');return true;},
  stand(){if(state.mode!=='piloting')return false;wantsExit=false;change('stabilizing');return true;},
  sit(){if(!api.canSit)return false;state.yaw=0;change('sitting');return true;},
  exit(){if(!api.canExit)return false;wantsExit=true;change(state.mode==='piloting'?'stabilizing':'exiting');return true;},
  consumeExit(){const value=exited;exited=false;return value;},
  reset({aboard:next=true}={}){state.position=copy(CABIN_LAYOUT.seat);state.pose=next?1:0;state.yaw=0;state.door=0;autoSeat=false;wantsExit=false;exited=false;change(next?'piloting':'eva');},
  update(dt,input={}){
   if(!Number.isFinite(dt)||dt<=0||input.paused)return state;dt=Math.min(dt,.1);elapsed+=dt;state.speed=0;
   if(state.mode==='stabilizing'){
    const speed=Number.isFinite(input.shipSpeed)?Math.abs(input.shipSpeed):0,angular=Number.isFinite(input.shipAngularSpeed)?Math.abs(input.shipAngularSpeed):0;
    if(speed<.08&&angular<.025)change('rising');
   }else if(state.mode==='rising'){
    const t=clamp(elapsed/1.15,0,1);state.transition=t;state.pose=1-t;move(CABIN_LAYOUT.stand,t,dt);
    if(t===1){state.position=copy(CABIN_LAYOUT.stand);state.pose=0;change(wantsExit?'exiting':'standing');}
   }else if(state.mode==='sitting'){
    const t=clamp(elapsed/1.15,0,1);state.transition=t;state.pose=t;move(CABIN_LAYOUT.seat,t,dt);if(t===1){state.pose=1;change('piloting');}
   }else if(state.mode==='entering'||state.mode==='exiting'){
    const entering=state.mode==='entering',t=clamp(elapsed/.65,0,1);state.transition=t;state.pose=0;move(entering?CABIN_LAYOUT.stand:CABIN_LAYOUT.access,t,dt);
    if(t===1){change(entering?'standing':'eva');if(entering&&autoSeat){autoSeat=false;api.sit();}else if(!entering){exited=true;wantsExit=false;}}
   }
   // Movement inputs deliberately do not create an interior navigation mode.
   return state;
  }
 };return api;
}
