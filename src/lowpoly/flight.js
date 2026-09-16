import { Vector3 } from '../../vendor/three.module.js';

const MAX_TETHER = 26;
const DOCK_DISTANCE = 0.2;
const NO_INPUT = Object.freeze({ x: 0, y: 0, z: 0 });
const WORLD_MIN = new Vector3(-50, -22, -90);
const WORLD_MAX = new Vector3(50, 22, 35);

/** XYZ flight owns translation only; visual heading and camera remain independent. */
export function createFlight() {
  const shipPosition = new Vector3(0, 0, 10);
  const astronautPosition = new Vector3(2, 0, 10);
  const velocity = new Vector3();
  const desiredVelocity = new Vector3();
  const velocityDifference = new Vector3();
  const radial = new Vector3();
  const dock = new Vector3();
  let actor = 'astronaut';
  let returning = false;

  function dockPosition() {
    dock.copy(shipPosition);
    dock.x += shipPosition.x + 2 <= WORLD_MAX.x ? 2 : -2;
    return dock;
  }

  function limitWorld(position) {
    for (const axis of ['x', 'y', 'z']) {
      if (position[axis] <= WORLD_MIN[axis]) {
        position[axis] = WORLD_MIN[axis];
        velocity[axis] = Math.max(0, velocity[axis]);
      } else if (position[axis] >= WORLD_MAX[axis]) {
        position[axis] = WORLD_MAX[axis];
        velocity[axis] = Math.min(0, velocity[axis]);
      }
    }
  }

  function limitTether() {
    radial.subVectors(astronautPosition, shipPosition);
    const distance = radial.length();
    if (distance < MAX_TETHER) return;
    radial.divideScalar(distance);
    astronautPosition.copy(shipPosition).addScaledVector(radial, MAX_TETHER);
    // Preserve motion along the cable's sphere, remove only outward momentum.
    const outwardSpeed = velocity.dot(radial);
    if (outwardSpeed > 0) velocity.addScaledVector(radial, -outwardSpeed);
  }

  function board() {
    astronautPosition.copy(dockPosition());
    velocity.set(0, 0, 0);
    actor = 'ship';
    returning = false;
  }

  const flight = {
    shipPosition,
    astronautPosition,
    velocity,
    get actor() { return actor; },
    get position() { return actor === 'ship' ? shipPosition : astronautPosition; },
    get returning() { return returning; },
    get tetherLength() { return actor === 'astronaut' ? astronautPosition.distanceTo(shipPosition) : 0; },
    get tension() { return Math.max(0, Math.min(1, (flight.tetherLength - MAX_TETHER * 0.75) / (MAX_TETHER * 0.25))); },
    reset() {
      actor = 'astronaut';
      returning = false;
      shipPosition.set(0, 0, 10);
      astronautPosition.set(2, 0, 10);
      velocity.set(0, 0, 0);
    },
    deploy() {
      if (actor !== 'ship') return false;
      astronautPosition.copy(dockPosition());
      velocity.set(0, 0, 0);
      actor = 'astronaut';
      returning = false;
      return true;
    },
    returnToShip() {
      if (actor !== 'astronaut' || returning) return false;
      returning = true;
      velocity.set(0, 0, 0);
      return true;
    },
    update(dt, direction = NO_INPUT, boost = false) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      // A restored browser tab cannot advance an entire unattended journey.
      let remaining = Math.min(dt, 0.25);
      const inputX = Number.isFinite(direction.x) ? direction.x : 0;
      const inputY = Number.isFinite(direction.y) ? direction.y : 0;
      const inputZ = Number.isFinite(direction.z) ? direction.z : 0;
      while (remaining > 1e-8) {
        const step = Math.min(remaining, 1 / 60);
        remaining -= step;
        if (returning) {
          radial.subVectors(dockPosition(), astronautPosition);
          const distance = radial.length();
          if (distance <= DOCK_DISTANCE) {
            board();
            // Do not reinterpret held EVA input as piloting on this same frame.
            return;
          }
          velocity.copy(radial).multiplyScalar(Math.min(9, distance / step) / distance);
          astronautPosition.addScaledVector(velocity, step);
          if (astronautPosition.distanceTo(dockPosition()) <= DOCK_DISTANCE) {
            board();
            return;
          }
        } else {
          const speed = actor === 'ship' ? (boost ? 14 : 8) : (boost ? 9 : 5.6);
          desiredVelocity.set(inputX, inputY, inputZ);
          if (desiredVelocity.lengthSq() > 1) desiredVelocity.normalize();
          desiredVelocity.multiplyScalar(speed);
          const damping = desiredVelocity.lengthSq() > 0 ? 6 : 7;
          const decay = Math.exp(-damping * step);
          velocityDifference.subVectors(velocity, desiredVelocity);
          // Integrate exponential damping analytically to keep mobile and desktop travel equal.
          flight.position.addScaledVector(desiredVelocity, step)
            .addScaledVector(velocityDifference, (1 - decay) / damping);
          velocity.copy(desiredVelocity).addScaledVector(velocityDifference, decay);
          if (velocity.lengthSq() < 1e-8) velocity.set(0, 0, 0);
          limitWorld(flight.position);
          if (actor === 'astronaut') limitTether();
          else astronautPosition.copy(dockPosition());
        }
      }
    },
  };
  return flight;
}
