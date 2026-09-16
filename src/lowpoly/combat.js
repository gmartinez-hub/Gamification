import { AIM_RANGES as WEAPON_RANGE } from './expedition.js';

// The assisted weapon commits an outcome on trigger, then presents lock / travel / recovery.
// It deliberately does not pretend to be a physical projectile collision simulation.
export { WEAPON_RANGE };

export function createCombat(random = Math.random) {
  let shot = null;
  let cooldown = 0;
  const stats = { attempts: 0, hits: 0, misses: 0 };
  return {
    stats,
    get shot() { return shot; },
    get cooldown() { return cooldown; },
    start({ id, actor, kind, distance, chance, origin }) {
      if (shot || cooldown > 0 || !Number.isFinite(chance) || !Number.isFinite(distance) || distance < 0 || distance > WEAPON_RANGE[actor]) return false;
      if (!((actor === 'astronaut' && kind === 'small') || (actor === 'ship' && kind === 'large'))) return false;
      shot = { id, actor, elapsed: 0, lockTime: actor === 'ship' ? 1.6 : 1.05,
        travelTime: actor === 'ship' ? .9 : .55, phase: 'lock',
        hit: random() < Math.min(.95, Math.max(.35, chance)), origin: { ...origin } };
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
      stats[shot.hit ? 'hits' : 'misses']++;
      shot = null;
      cooldown = .4;
      return result;
    },
    reset() { shot = null; cooldown = 0; stats.attempts = stats.hits = stats.misses = 0; },
  };
}
