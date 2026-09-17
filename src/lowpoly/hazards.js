// Pure world-space motion/collision helpers. No renderer, camera or frame-rate state.
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

/** Samples a closed, predictable trajectory. Output objects may be plain XYZ or Vector3. */
export function sampleHazard(spec, time, outPosition, outVelocity) {
  const motion = spec.motion;
  const frequency = motion ? Math.PI * 2 / motion.period : 0;
  const angle = frequency * (Number.isFinite(time) ? time : 0) + (motion?.phase || 0);
  const displacement = motion ? Math.sin(angle) * motion.amplitude : 0;
  const speed = motion ? Math.cos(angle) * motion.amplitude * frequency : 0;
  for (const axis of ['x', 'y', 'z']) {
    outPosition[axis] = spec.position[axis] + (motion?.axis[axis] || 0) * displacement;
    outVelocity[axis] = (motion?.axis[axis] || 0) * speed;
    if (motion?.secondary && motion.type !== 'crossing') {
      const factor = motion.type === 'drift' ? .5 : 1;
      const harmonic = motion.type === 'drift' ? 2 : 1;
      outPosition[axis] += motion.secondary[axis] * Math.cos(angle * harmonic) * motion.amplitude * factor;
      outVelocity[axis] -= motion.secondary[axis] * Math.sin(angle * harmonic) * motion.amplitude * factor * harmonic * frequency;
    }
  }
  return outPosition;
}

/** Both bodies may move. A hit anywhere between the endpoints counts, including contact. */
export function sweptSphereHit(a0, a1, b0, b1, radius) {
  const x = a0.x - b0.x, y = a0.y - b0.y, z = a0.z - b0.z;
  const dx = a1.x - b1.x - x, dy = a1.y - b1.y - y, dz = a1.z - b1.z - z;
  const travelSquared = dx * dx + dy * dy + dz * dz;
  const t = travelSquared > 1e-12 ? clamp(-(x * dx + y * dy + z * dz) / travelSquared, 0, 1) : 0;
  return (x + dx * t) ** 2 + (y + dy * t) ** 2 + (z + dz * t) ** 2 <= radius * radius;
}

/** Closest future separation under the current relative velocity, over a short warning horizon. */
export function closestApproach(relativePosition, relativeVelocity, horizon = 2) {
  const { x, y, z } = relativePosition;
  const vx = relativeVelocity.x, vy = relativeVelocity.y, vz = relativeVelocity.z;
  const speedSquared = vx * vx + vy * vy + vz * vz;
  const time = speedSquared > 1e-12 ? clamp(-(x * vx + y * vy + z * vz) / speedSquared, 0, Math.max(0, horizon)) : 0;
  return { time, distance: Math.hypot(x + vx * time, y + vy * time, z + vz * time) };
}

/** Entry-side contact, so a fast crossing cannot emerge on the far side of a rock. */
export function sweptSphereContact(a0, a1, b0, b1, radius) {
  const x = a0.x - b0.x, y = a0.y - b0.y, z = a0.z - b0.z;
  const ex = a1.x - b1.x, ey = a1.y - b1.y, ez = a1.z - b1.z;
  const dx = ex - x, dy = ey - y, dz = ez - z;
  const a = dx * dx + dy * dy + dz * dz;
  const b = x * dx + y * dy + z * dz;
  const c = x * x + y * y + z * z - radius * radius;
  let t = 0;
  if (c > 0) {
    const discriminant = b * b - a * c;
    if (a < 1e-12 || discriminant < 0) return null;
    t = (-b - Math.sqrt(discriminant)) / a;
    if (t < 0 || t > 1) return null;
  }
  let nx = x + dx * t, ny = y + dy * t, nz = z + dz * t;
  let length = Math.hypot(nx, ny, nz);
  if (length < 1e-8) { nx = -dx; ny = -dy; nz = -dz; length = Math.hypot(nx, ny, nz); }
  if (length < 1e-8) { nx = 1; ny = 0; nz = 0; length = 1; }
  nx /= length; ny /= length; nz /= length;
  return { normal: { x: nx, y: ny, z: nz }, depth: Math.max(0, radius - ex * nx - ey * ny - ez * nz) + .002 };
}
