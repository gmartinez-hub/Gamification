import { Vector3, Quaternion, MathUtils } from '../../vendor/three.module.js';
const inverse = new Quaternion();
/** Acceleration/vector thrust is world-space; scalar thrust is actor-local forward. */
export function localThrottle(group, { acceleration, maxAcceleration = 1, thrust = 0 } = {}, out = new Vector3()) {
  if (acceleration) out.copy(acceleration).multiplyScalar(1 / Math.max(.001, Number(maxAcceleration) || 1));
  else if (typeof thrust === 'number') out.set(0, 0, -thrust);
  else out.copy(thrust);
  if (![out.x,out.y,out.z].every(Number.isFinite)) out.set(0,0,0);
  if (acceleration || typeof thrust !== 'number') {
    group.getWorldQuaternion(inverse).invert();out.applyQuaternion(inverse);
  }
  if (out.lengthSq() > 1) out.normalize();
  return out;
}
export function frameDelta(time, previous, dt) { return MathUtils.clamp(Number.isFinite(dt) ? dt : previous == null ? 1/60 : time - previous, 0, .1); }
/** Lean only the visual subtree. Navigation/aim and the animation's hand contacts remain intact. */
export function updateBodyMotion(visual, local, time, dt, { reducedMotion = false, aiming = false, strength = .065 } = {}) {
  if (reducedMotion) { visual.rotation.set(0,0,0);visual.position.y=0;return; }
  const gain = aiming ? .28 : 1;
  visual.rotation.x = MathUtils.damp(visual.rotation.x, (local.z*.6-local.y*.4)*strength*gain, 5, dt);
  visual.rotation.z = MathUtils.damp(visual.rotation.z, -local.x*strength*gain, 5, dt);
  visual.position.y = Math.sin(time*1.3)*.007*gain;
}
