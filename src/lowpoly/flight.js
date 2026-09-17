import { Euler, Quaternion, Vector3 } from '../../vendor/three.module.js';
import { TETHER_MAX, shipPoint, shipCollisionSpheres, shipFrameRadius } from './spatial.js';

const NO_INPUT = Object.freeze({ x: 0, y: 0, z: 0 });
const WORLD_MIN = new Vector3(-220, -90, -300), WORLD_MAX = new Vector3(220, 100, 60);
export const EVA_RADIUS = .65, EVA_CENTER_Y = .85;
const EVA_CENTER = new Vector3(0, EVA_CENTER_Y, 0), TETHER_SOFT = 22;
const PROFILES = {
  ship: { speed: 8, boost: 12, acceleration: 3, brake: 6, coast: .10 },
  astronaut: { speed: 3.6, boost: 5.8, acceleration: 4, brake: 7, coast: .16 },
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const approach = (value, target, amount) => value + clamp(target - value, -amount, amount);
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const finiteVector = vector => vector && ['x', 'y', 'z'].every(axis => Number.isFinite(vector[axis]));

/** World-space translation and independent inertial ship heading. Positive pitch looks up. */
export function createFlight({ vehicleProfile = PROFILES.ship, anchors: customAnchors = null,
  collisionSpheres = shipCollisionSpheres, frameRadius = shipFrameRadius, turnRate = 65 } = {}) {
  const profiles = { ...PROFILES, ship: vehicleProfile };
  function vehiclePoint(name, position, quaternion, target) {
    if (!customAnchors) return shipPoint(name, position, quaternion, target);
    return target.copy(customAnchors[name]).applyQuaternion(quaternion).add(position);
  }
  const shipPosition = new Vector3(0, 0, 10), astronautPosition = new Vector3();
  const velocity = new Vector3(), thrust = new Vector3(), shipQuaternion = new Quaternion();
  const dock = new Vector3(), tether = new Vector3(), desiredVelocity = new Vector3();
  const deltaVelocity = new Vector3(), radial = new Vector3(), previousVelocity = new Vector3();
  const local = new Vector3(), center = new Vector3(), inverse = new Quaternion(), orientation = new Euler(0, 0, 0, 'YXZ');
  const input = new Vector3(), navigationDelta = new Vector3();
  const contactNormal = new Vector3(), contactVelocity = new Vector3();
  let actor = 'astronaut', returning = false, braking = false, arrived = false, stage = 1;
  let yaw = 0, pitch = 0, yawRate = 0, pitchRate = 0, yawTarget = 0, pitchTarget = 0;
  let returnPath = [], navigationPath = [], navigationKey = null;
  let hullStage = 0, hullEnvelopes = [];
  const hullQuaternion = new Quaternion();

  function anchors() {
    vehiclePoint('dock', shipPosition, shipQuaternion, dock);
    vehiclePoint('tether', shipPosition, shipQuaternion, tether);
  }
  function toWorld(point) { return point.clone().applyQuaternion(shipQuaternion).add(shipPosition).sub(EVA_CENTER); }
  function withinWorld(point) { return ['x', 'y', 'z'].every(axis => point[axis] >= WORLD_MIN[axis] && point[axis] <= WORLD_MAX[axis]); }

  function hullForEVA() {
    if (hullStage === stage && hullQuaternion.equals(shipQuaternion)) return hullEnvelopes;
    hullStage = stage; hullQuaternion.copy(shipQuaternion);
    const helmetOffset = new Vector3(0, 1.58 - EVA_CENTER_Y, 0).applyQuaternion(shipQuaternion.clone().invert());
    hullEnvelopes = collisionSpheres(stage).flatMap(sphere => [
      { center: new Vector3().copy(sphere.center), radius: sphere.radius + EVA_RADIUS },
      { center: new Vector3().copy(sphere.center).sub(helmetOffset), radius: sphere.radius + .36 },
    ]);
    return hullEnvelopes;
  }

  function limitWorld(position, margin = 0) {
    for (const axis of ['x', 'y', 'z']) {
      const low = WORLD_MIN[axis] + margin, high = WORLD_MAX[axis] - margin;
      if (position[axis] < low) { position[axis] = low; velocity[axis] = Math.max(0, velocity[axis]); }
      else if (position[axis] > high) { position[axis] = high; velocity[axis] = Math.min(0, velocity[axis]); }
    }
  }

  // Navigation uses a small visibility graph around the actual hull, not a line through it.
  // The hull is stationary during EVA, so a path only changes when the destination changes.
  function exteriorPath(destination) {
    inverse.copy(shipQuaternion).invert();
    const start = astronautPosition.clone().add(EVA_CENTER).sub(shipPosition).applyQuaternion(inverse);
    const end = destination.clone().add(EVA_CENTER).sub(shipPosition).applyQuaternion(inverse);
    const spheres = hullForEVA().map(sphere => ({
      center: sphere.center, radius: sphere.radius + .18,
    }));
    const segment = new Vector3(), offset = new Vector3(), closest = new Vector3();
    function visible(a, b) {
      segment.subVectors(b, a);
      const lengthSquared = segment.lengthSq();
      return spheres.every(sphere => {
        const progress = lengthSquared ? clamp(offset.subVectors(sphere.center, a).dot(segment) / lengthSquared, 0, 1) : 0;
        closest.copy(a).addScaledVector(segment, progress);
        const distanceSquared = closest.distanceToSquared(sphere.center);
        if (distanceSquared >= sphere.radius * sphere.radius - 1e-6) return true;
        // Near the surface, permit leaving the extra route clearance without
        // permitting a segment to enter the astronaut's physical hull envelope.
        const physicalRadius = sphere.radius - .18;
        return (progress <= 1e-6 || progress >= 1 - 1e-6) && distanceSquared >= physicalRadius * physicalRadius - 1e-6;
      });
    }
    if (visible(start, end)) return [destination.clone()];
    const low = new Vector3(Infinity, Infinity, Infinity), high = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const sphere of spheres) {
      for (const axis of ['x', 'y', 'z']) {
        low[axis] = Math.min(low[axis], sphere.center[axis] - sphere.radius - .65);
        high[axis] = Math.max(high[axis], sphere.center[axis] + sphere.radius + .65);
      }
    }
    const nodes = [start, end];
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) {
      if (x === 1 && y === 1 && z === 1) continue;
      const point = new Vector3(low.x + (high.x - low.x) * x / 2, low.y + (high.y - low.y) * y / 2, low.z + (high.z - low.z) * z / 2);
      if (withinWorld(toWorld(point)) && visible(point, point)) nodes.push(point);
    }
    const distance = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set();
    distance[0] = 0;
    for (let step = 0; step < nodes.length; step++) {
      let next = -1;
      for (let index = 0; index < nodes.length; index++) if (!visited.has(index) && (next < 0 || distance[index] < distance[next])) next = index;
      if (next < 0 || !Number.isFinite(distance[next]) || next === 1) break;
      visited.add(next);
      for (let index = 1; index < nodes.length; index++) {
        if (visited.has(index) || !visible(nodes[next], nodes[index])) continue;
        const cost = distance[next] + nodes[next].distanceTo(nodes[index]);
        if (cost < distance[index]) { distance[index] = cost; previous[index] = next; }
      }
    }
    if (!Number.isFinite(distance[1])) return [astronautPosition.clone()];
    const path = [];
    for (let index = 1; index > 0; index = previous[index]) path.unshift(toWorld(nodes[index]));
    return path;
  }

  function resolveHull() {
    inverse.copy(shipQuaternion).invert();
    local.copy(astronautPosition).add(EVA_CENTER).sub(shipPosition).applyQuaternion(inverse);
    // Multiple passes resolve overlaps between adjoining module envelopes.
    for (let pass = 0; pass < 3; pass++) for (const sphere of hullForEVA()) {
      center.copy(sphere.center); radial.subVectors(local, center);
      const distance = radial.length(), radius = sphere.radius;
      if (distance >= radius) continue;
      if (distance < 1e-6) radial.set(1, 0, 0); else radial.divideScalar(distance);
      local.copy(center).addScaledVector(radial, radius + .001);
      radial.applyQuaternion(shipQuaternion);
      const inward = velocity.dot(radial);
      if (inward < 0) velocity.addScaledVector(radial, -inward);
    }
    astronautPosition.copy(local).applyQuaternion(shipQuaternion).add(shipPosition).sub(EVA_CENTER);
  }

  function cableForce(dt) {
    anchors(); radial.copy(astronautPosition).add(EVA_CENTER).sub(tether);
    const distance = radial.length();
    if (distance <= TETHER_SOFT) return;
    radial.divideScalar(distance);
    const restoring = Math.max(0, (distance - TETHER_SOFT) * 2 + velocity.dot(radial) * 2.8);
    velocity.addScaledVector(radial, -restoring * dt);
  }
  function limitTether() {
    radial.copy(astronautPosition).add(EVA_CENTER).sub(tether);
    const distance = radial.length();
    if (distance <= TETHER_MAX) return;
    radial.divideScalar(distance);
    astronautPosition.copy(tether).addScaledVector(radial, TETHER_MAX).sub(EVA_CENTER);
    const outward = velocity.dot(radial);
    if (outward > 0) velocity.addScaledVector(radial, -outward);
  }

  function steer(dt, options) {
    if (actor !== 'ship') return;
    if (Number.isFinite(options.lookYaw)) yawTarget = options.lookYaw;
    if (Number.isFinite(options.lookPitch)) pitchTarget = clamp(options.lookPitch, -1.1, 1.1);
    if (finiteVector(options.navigationTarget) && !options.brake && !options.hold) {
      navigationDelta.subVectors(options.navigationTarget, shipPosition);
      if (navigationDelta.lengthSq() > .01) {
        yawTarget = Math.atan2(-navigationDelta.x, -navigationDelta.z);
        pitchTarget = clamp(Math.asin(clamp(navigationDelta.y / navigationDelta.length(), -1, 1)), -1.1, 1.1);
      }
    }
    const maximumRate = turnRate * Math.PI / 180, acceleration = 120 * Math.PI / 180;
    const yawError = angleDifference(yawTarget, yaw), pitchError = pitchTarget - pitch;
    function targetRate(error) { return Math.sign(error) * Math.min(maximumRate, Math.abs(error) * 3, Math.sqrt(2 * acceleration * Math.abs(error)) * .8); }
    yawRate = approach(yawRate, targetRate(yawError), acceleration * dt);
    pitchRate = approach(pitchRate, targetRate(pitchError), acceleration * dt);
    yaw += yawRate * dt; pitch = clamp(pitch + pitchRate * dt, -1.1, 1.1);
    shipQuaternion.setFromEuler(orientation.set(pitch, yaw, 0, 'YXZ'));
  }

  function seek(destination, radius, speed, deceleration) {
    radial.subVectors(destination, flight.position);
    const distance = radial.length(), remaining = Math.max(0, distance - radius);
    const targetSpeed = Math.min(speed, Math.sqrt(2 * deceleration * remaining) * .72, remaining * 2.2);
    desiredVelocity.copy(radial).multiplyScalar(distance > 1e-7 ? targetSpeed / distance : 0);
    return distance <= radius + .14 && velocity.length() < .18;
  }

  function board() {
    anchors(); astronautPosition.copy(dock); velocity.set(0, 0, 0); thrust.set(0, 0, 0);
    actor = 'ship'; returning = false; returnPath = []; navigationPath = []; navigationKey = null;
    yawRate = 0; pitchRate = 0; yawTarget = yaw; pitchTarget = pitch;
  }

  const flight = {
    shipPosition, astronautPosition, velocity, shipQuaternion, thrust,
    get actor() { return actor; },
    get position() { return actor === 'ship' ? shipPosition : astronautPosition; },
    get returning() { return returning; },
    get braking() { return braking; },
    get arrived() { return arrived; },
    get shipYaw() { return yaw; },
    get shipPitch() { return pitch; },
    get angularSpeed() { return Math.hypot(yawRate, pitchRate); },
    get dockPosition() { anchors(); return dock; },
    get tetherPosition() { anchors(); return tether; },
    get tetherLength() { anchors(); return actor === 'astronaut' ? Math.hypot(astronautPosition.x - tether.x, astronautPosition.y + EVA_CENTER_Y - tether.y, astronautPosition.z - tether.z) : 0; },
    get tension() { return clamp((flight.tetherLength - TETHER_SOFT) / (TETHER_MAX - TETHER_SOFT), 0, 1); },
    setStage(nextStage) {
      if (!Number.isInteger(nextStage) || nextStage < 1 || nextStage > 3) throw new RangeError('Ship stage must be 1, 2 or 3.');
      stage = nextStage; navigationKey = null;
      if (returning) returnPath = exteriorPath(flight.dockPosition);
    },
    reset({ aboard = false } = {}) {
      actor = aboard ? 'ship' : 'astronaut'; returning = false; braking = false; arrived = false;
      stage = 1; yaw = 0; pitch = 0; yawRate = 0; pitchRate = 0; yawTarget = 0; pitchTarget = 0;
      shipQuaternion.identity(); shipPosition.set(0, 0, 10); velocity.set(0, 0, 0); thrust.set(0, 0, 0);
      anchors(); vehiclePoint(aboard ? 'dock' : 'eva', shipPosition, shipQuaternion, astronautPosition);
      returnPath = []; navigationPath = []; navigationKey = null;
    },
    deploy() {
      if (actor !== 'ship') return false;
      // A vessel becomes a stationary EVA base, with its pilot exiting through the actual hatch.
      actor = 'astronaut'; returning = false; arrived = false; velocity.set(0, 0, 0); thrust.set(0, 0, 0);
      yawRate = 0; pitchRate = 0; yawTarget = yaw; pitchTarget = pitch;
      vehiclePoint('eva', shipPosition, shipQuaternion, astronautPosition); limitWorld(astronautPosition); resolveHull();
      navigationKey = null; return true;
    },
    /** Transfer an EVA pilot between nearby vehicle anchors without moving the pilot. */
    adoptEVA(position) {
      if (!finiteVector(position)) return false;
      anchors();
      if (new Vector3().copy(position).add(EVA_CENTER).distanceTo(tether) > TETHER_MAX) return false;
      actor = 'astronaut'; astronautPosition.copy(position); returning = false;
      velocity.set(0,0,0); thrust.set(0,0,0); navigationKey = null; returnPath = [];
      limitWorld(astronautPosition); resolveHull(); limitTether();
      return true;
    },
    returnToShip() {
      if (actor !== 'astronaut' || returning) return false;
      returning = true; arrived = false; navigationKey = null;
      returnPath = exteriorPath(flight.dockPosition);
      return true;
    },
    /** Cinematic steering shares the pilot's angular state without advancing translation. */
    updateHeading(dt, options = {}) {
      if (actor !== 'ship' || !Number.isFinite(dt) || dt <= 0) return;
      let remaining = Math.min(dt, .25);
      while (remaining > 1e-8) {
        const step = Math.min(remaining, 1 / 120); remaining -= step;
        steer(step, options);
      }
      anchors(); astronautPosition.copy(dock);
    },
    /** Normal points from obstacle to actor. Health/invulnerability never disables contact physics. */
    applyImpact(normal, depth = 0, obstacleVelocity = NO_INPUT) {
      if (!finiteVector(normal) || !Number.isFinite(depth)) return false;
      contactNormal.copy(normal);
      if (contactNormal.lengthSq() < 1e-12) return false;
      contactNormal.normalize();
      contactVelocity.copy(finiteVector(obstacleVelocity) ? obstacleVelocity : NO_INPUT);
      flight.position.addScaledVector(contactNormal, Math.max(0, depth));
      const incoming = contactVelocity.subVectors(velocity, contactVelocity).dot(contactNormal);
      if (incoming < 0) velocity.addScaledVector(contactNormal, -incoming * 1.15);
      arrived = false;
      if (actor === 'astronaut') {
        anchors(); limitWorld(astronautPosition); resolveHull(); limitTether();
        if (returning) returnPath = exteriorPath(dock);
        navigationKey = null;
      } else {
        limitWorld(shipPosition, frameRadius(stage)); anchors(); astronautPosition.copy(dock);
      }
      return true;
    },
    update(dt, direction = NO_INPUT, boost = false, options = {}) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      input.set(Number.isFinite(direction?.x) ? direction.x : 0, Number.isFinite(direction?.y) ? direction.y : 0, Number.isFinite(direction?.z) ? direction.z : 0);
      if (input.lengthSq() > 1) input.normalize();
      arrived = false;
      const navigation = finiteVector(options.navigationTarget) ? options.navigationTarget : null;
      const arrivalRadius = Number.isFinite(options.arrivalRadius) ? Math.max(0, options.arrivalRadius) : 0;
      if (actor === 'astronaut' && navigation && !returning && (!navigationKey || navigationKey.target.distanceToSquared(navigation) > .25 || navigationKey.radius !== arrivalRadius)) {
        const endpoint = new Vector3().copy(navigation);
        radial.subVectors(astronautPosition, endpoint);
        if (radial.lengthSq() > 1e-8) endpoint.addScaledVector(radial.normalize(), Math.min(arrivalRadius, astronautPosition.distanceTo(endpoint)));
        navigationPath = exteriorPath(endpoint);
        navigationKey = { target: new Vector3().copy(navigation), radius: arrivalRadius };
      } else if (!navigation) navigationKey = null;
      let remaining = Math.min(dt, .25);
      while (remaining > 1e-8) {
        const step = Math.min(remaining, 1 / 120); remaining -= step;
        const profile = profiles[actor];
        steer(step, options); anchors();
        previousVelocity.copy(velocity); thrust.set(0, 0, 0);
        let acceleration = profile.acceleration, powered = true;
        braking = Boolean(options.brake || options.hold);
        if (returning) {
          acceleration = profile.brake; braking = true;
          const target = returnPath[0] || dock;
          if (seek(target, 0, 6, profile.brake)) {
            returnPath.shift();
            if (!returnPath.length) {
              if (astronautPosition.distanceTo(dock) < .2) { board(); return; }
              // An unreachable visibility path must never become a remote boarding shortcut.
              returnPath = exteriorPath(dock);
            }
            seek(returnPath[0], 0, 6, profile.brake);
          }
        } else if (braking) {
          desiredVelocity.set(0, 0, 0); acceleration = profile.brake;
        } else if (navigation) {
          acceleration = profile.brake;
          const waypoint = actor === 'astronaut' && navigationPath.length > 1 ? navigationPath[0] : null;
          if (waypoint) {
            if (seek(waypoint, 0, profile.speed, profile.brake)) navigationPath.shift();
          } else arrived = seek(navigation, arrivalRadius, profile.speed, profile.brake);
          braking = desiredVelocity.lengthSq() < velocity.lengthSq();
          if (arrived) { velocity.set(0, 0, 0); desiredVelocity.set(0, 0, 0); previousVelocity.set(0, 0, 0); }
        } else if (input.lengthSq() > 1e-8) {
          desiredVelocity.copy(input).multiplyScalar(boost ? profile.boost : profile.speed);
          braking = velocity.dot(desiredVelocity) < 0 || desiredVelocity.lengthSq() < velocity.lengthSq();
        } else powered = false;

        if (powered) {
          deltaVelocity.subVectors(desiredVelocity, velocity).clampLength(0, acceleration * step);
          velocity.add(deltaVelocity); thrust.copy(deltaVelocity).divideScalar(step);
          flight.position.addScaledVector(previousVelocity, step * .5).addScaledVector(velocity, step * .5);
        } else {
          const decay = Math.exp(-profile.coast * step);
          flight.position.addScaledVector(velocity, (1 - decay) / profile.coast); velocity.multiplyScalar(decay);
        }
        if (actor === 'astronaut') {
          cableForce(step); limitWorld(astronautPosition); resolveHull(); limitTether();
        } else {
          limitWorld(shipPosition, frameRadius(stage)); anchors(); astronautPosition.copy(dock);
        }
      }
    },
  };
  flight.reset();
  return flight;
}
