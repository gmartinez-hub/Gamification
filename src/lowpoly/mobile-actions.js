const enabled = (action, label, details = {}) => ({ action, label, disabled: false, ...details });
const waiting = label => ({ action: 'none', label, disabled: true });
const validDistance = value => Number.isFinite(value) && value >= 0;

/** Select the next useful action without exposing the entire control panel. */
export function getMobileAction(snapshot) {
  const {
    phase, actor, navigating = false, returning = false, scanning = false,
    shotActive = false, cooldown = 0, blocked = false, actionDistance = Infinity,
    targetDistance = Infinity, weaponRange = 0, chance, assemblyLocked = false,
  } = snapshot;

  if (assemblyLocked) return waiting('Ensamblando nave…');
  if (phase === 'transit') return waiting('Viajando al próximo sector…');
  if (blocked) return waiting('Controles en pausa');
  if (returning) return waiting('Volviendo a la nave…');
  if (shotActive) return waiting('Apuntando y disparando…');
  if (phase === 'complete') return enabled('restart', 'Nueva expedición');

  const guide = (label, hint) => enabled('navigate', navigating ? 'Detener guía' : label,
    { hint: navigating ? 'Movete para retomar el vuelo' : hint });

  if (phase === 'scan') {
    if (actor === 'ship') return enabled('deploy', 'Salir de la nave');
    if (scanning) return { action: 'interact', label: 'Escaneando…', disabled: true, hint: 'Mantenete cerca de la baliza' };
    if (validDistance(actionDistance) && actionDistance <= 3.8) return enabled('interact', 'Escanear baliza');
    return guide('Guiar a la baliza', 'Acercate para escanear');
  }

  if (phase === 'small' || phase === 'large') {
    const targetAction = validDistance(targetDistance) ? { secondary: 'target' } : {};
    if (phase === 'small' && actor === 'ship') return enabled('deploy', 'Salir de la nave', targetAction);
    if (phase === 'large' && actor !== 'ship') return enabled('return', 'Volver a la nave', { hint: 'El núcleo requiere el cañón', ...targetAction });
    if (!validDistance(targetDistance)) return waiting('Buscando objetivo…');
    const secondary = 'target';
    if (targetDistance > weaponRange || !Number.isFinite(weaponRange) || weaponRange <= 0) {
      return { ...guide('Acercarse al objetivo', 'Fuera de alcance'), secondary };
    }
    const hint = Number.isFinite(chance) ? `${Math.round(Math.max(0, Math.min(1, chance)) * 100)}% de acierto` : 'Objetivo al alcance';
    return {
      action: 'fire', label: cooldown > 0 ? 'Recargando…' : phase === 'large' ? 'Disparar cañón' : 'Disparar',
      disabled: cooldown > 0, secondary, hint,
    };
  }

  if (phase === 'gem') {
    if (actor === 'ship') return guide(actionDistance < 12 ? 'Salir por la gema' : 'Guiar a la gema', 'La recupera el astronauta');
    if (validDistance(actionDistance) && actionDistance <= 3) return enabled('interact', 'Recoger gema');
    return guide('Guiar a la gema', 'Acercate para recogerla');
  }

  if (phase === 'return') {
    if (actor !== 'ship') return enabled('return', 'Volver a la nave');
    return guide('Guiar al corredor', 'El próximo módulo te espera');
  }

  return waiting('Preparando expedición…');
}
