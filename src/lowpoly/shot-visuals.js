import { Vector3 } from '../../vendor/three.module.js';
import { createProjectileVisual } from './effects.js';

/** A bounded pool shares imported meshes/maps. No new GLB downloads per shot. */
export function createShotVisuals(scene,templates,world) {
  const slots=[],byId=new Map(),heading=new Vector3();
  function acquire(projectile) {
    const key=projectile.kind==='rock'?'rock':projectile.weapon==='ship'?'ship':'astronaut';
    let slot=slots.find(item=>item.key===key&&item.id===null);
    if(!slot){
      if(slots.length>=48)return null;
      const visual=createProjectileVisual(key==='rock'?{createProjectile:()=>world.createRockProjectile(.32)}:templates,key==='ship'?'ship':'astronaut');
      if(key==='rock'){
        const glow=visual.group.getObjectByName('eva-projectile-glow');if(glow){glow.material.color.setHex(0xffaa6d);glow.scale.setScalar(.55);}
        const trail=visual.group.getObjectByName('projectile-world-trail');trail.material.color.setHex(0xffb67d);trail.material.size=.14;
      }
      scene.add(visual.group);slot={key,id:null,visual};slots.push(slot);
    }
    slot.id=projectile.id;byId.set(projectile.id,slot);return slot;
  }
  function update(projectiles,dt){
    const active=new Set(projectiles.map(p=>p.id));
    for(const [id,slot]of byId)if(!active.has(id)){slot.visual.reset();slot.id=null;byId.delete(id);}
    for(const projectile of projectiles){
      const slot=byId.get(projectile.id)||acquire(projectile);if(!slot)continue;
      heading.copy(projectile.velocity).normalize();slot.visual.update(projectile.position,heading,dt,{intensity:projectile.owner==='enemy'?1.1:1.5});
    }
  }
  function reset(){for(const slot of slots)slot.visual.dispose();slots.length=0;byId.clear();}
  return {update,reset,dispose:reset,get count(){return byId.size;}};
}
