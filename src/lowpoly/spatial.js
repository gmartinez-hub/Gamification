import { Vector3 } from '../../vendor/three.module.js';

// All values are world metres in the unscaled vessel root, facing -Z.
export const SHIP_SCALE = 2.5;
export const COMPANION_SCALE = .7;
export const TETHER_MAX = 26;
export const SHIP_ANCHORS = Object.freeze({
  dock: Object.freeze({ x: 3.3, y: -.85, z: -2.5 }),
  eva: Object.freeze({ x: 4.5, y: -.85, z: -2.5 }),
  tether: Object.freeze({ x: 2.15, y: .05, z: -2.5 }),
  eye: Object.freeze({ x: 0, y: 1.05, z: -4.8 }),
  muzzle: Object.freeze({ x: 0, y: -.4, z: -6.18 }),
});
export function shipPoint(name, position, quaternion, out = new Vector3()) {
  return out.copy(SHIP_ANCHORS[name]).applyQuaternion(quaternion).add(position);
}
const spheres = [
  { stage: 1, center: { x: 0, y: 0, z: -3.5 }, radius: 2.15 },
  { stage: 1, center: { x: 0, y: 0, z: -5.25 }, radius: 1.3 },
  { stage: 2, center: { x: 0, y: 0, z: 1.5 }, radius: 2.45 },
  { stage: 3, center: { x: 0, y: 0, z: 5.8 }, radius: 2.2 },
  { stage: 3, center: { x: -3.5, y: -.45, z: 6.3 }, radius: 1.3 },
  { stage: 3, center: { x: 3.5, y: -.45, z: 6.3 }, radius: 1.3 },
];
export function shipCollisionSpheres(stage = 1) { return spheres.filter(sphere => sphere.stage <= stage); }
export function shipFrameRadius(stage = 1) { return [4.6, 6.5, 8.8][Math.max(0, Math.min(2, stage - 1))]; }
