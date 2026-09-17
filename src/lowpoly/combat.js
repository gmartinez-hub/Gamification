import { AIM_RANGES as WEAPON_RANGE } from './expedition.js';

// The assisted weapon commits an outcome on trigger, then presents lock / travel / recovery.
// It deliberately does not pretend to be a physical projectile collision simulation.
export { WEAPON_RANGE };

export function createCombat(random = Math.random) {
  let shot = null;
  let cooldown = 0;
  const missesByTarget = new Map();
  const keyFor = (id, actor) => `${actor}:${id}`;
  function chanceFor({ id, actor, chance }) {
    if (!Number.isFinite(chance)) return 0;
    return (missesByTarget.get(keyFor(id, actor)) || 0) >= 2 ? 1 : Math.min(.95, Math.max(.35, chance));
  }
  const stats = { attempts: 0, hits: 0, misses: 0 };
  return {
    stats,
    chanceFor,
    get shot() { return shot; },
    get cooldown() { return cooldown; },
    start({ id, actor, kind, distance, chance, origin }) {
      if (shot || cooldown > 0 || !Number.isFinite(chance) || !Number.isFinite(distance) || distance < 0 || distance > WEAPON_RANGE[actor]) return false;
      if (!((actor === 'astronaut' && kind === 'small') || (actor === 'ship' && kind === 'large'))) return false;
      const assisted = chanceFor({ id, actor, chance }) === 1;
      shot = { id, actor, assisted, elapsed: 0, lockTime: actor === 'ship' ? 1.6 : 1.05,
        travelTime: actor === 'ship' ? .9 : .55, phase: 'lock',
        hit: assisted || random() < chanceFor({ id, actor, chance }), origin: { ...origin } };
      stats.attempts++;
      return true;
    },
    update(dt) {
      cooldown = Math.max(0, cooldown - Math.max(0, dt));
      if (!shot) return null;
      shot.elapsed += Math.max(0, dt);
      shot.phase = shot.elapsed < shot.lockTime ? 'lock' : 'travel';
      if (shot.elapsed < shot.lockTime + shot.travelTime) return null;
      const result = { id: shot.id, actor: shot.actor, hit: shot.hit };
      const key = keyFor(shot.id, shot.actor);
      if (shot.hit) missesByTarget.delete(key);
      else missesByTarget.set(key, (missesByTarget.get(key) || 0) + 1);
      stats[shot.hit ? 'hits' : 'misses']++;
      shot = null;
      cooldown = .4;
      return result;
    },
    reset() { shot = null; cooldown = 0; missesByTarget.clear(); stats.attempts = stats.hits = stats.misses = 0; },
  };
}
