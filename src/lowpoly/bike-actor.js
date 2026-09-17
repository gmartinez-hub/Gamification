import * as THREE from '../../vendor/three.module.js';
import { createPropulsion } from './plasma.js';
import { frameDelta, localThrottle, updateBodyMotion } from './actor-motion.js';

// Measurements use the original 461,528-triangle bike at uniform scale 3.
// In actor coordinates the nose is -Z, the ground plane is Y=0, and left is -X.
export const BIKE_ANCHORS = Object.freeze({
  seat: [0, .845, .12], leftGrip: [-.46, 1.17, -.40], rightGrip: [.46, 1.17, -.40],
  leftAnkle: [-.43, .40, -.05], rightAnkle: [.43, .40, -.05],
  leftSole: [-.43, .25, -.12], rightSole: [.43, .25, -.12],
  tether: [0, .96, .43],
  nozzles: [
    { name: 'bike-upper-left', position: [-.525, .885, 1.215], direction: [0, 0, 1], radius: .11 },
    { name: 'bike-upper-right', position: [.525, .885, 1.215], direction: [0, 0, 1], radius: .11 },
    { name: 'bike-lower-left', position: [-.32, .15, 1.365], direction: [0, 0, 1], radius: .065 },
    { name: 'bike-lower-right', position: [.32, .15, 1.365], direction: [0, 0, 1], radius: .065 },
  ],
});

function cloneRig(source) {
  const clone = source.clone(true), map = new Map(), originals = [], copies = [];
  source.traverse(node => originals.push(node)); clone.traverse(node => copies.push(node));
  originals.forEach((node, i) => map.set(node, copies[i]));
  for (const original of originals) if (original.isSkinnedMesh) {
    const target = map.get(original); target.skeleton = original.skeleton.clone();
    target.skeleton.bones = original.skeleton.bones.map(bone => map.get(bone));
    target.bindMatrix.copy(original.bindMatrix); target.bindMatrixInverse.copy(original.bindMatrixInverse);
    target.skeleton.pose(); target.frustumCulled = false;
  }
  // An already-instantiated EVA actor may have attached runtime exhausts to chest.
  clone.getObjectByName('backpack-propulsion')?.removeFromParent();
  clone.position.set(0, 0, 0); clone.rotation.set(0, 0, 0); clone.scale.setScalar(1);
  return clone;
}

function firstPersonArms(mesh) {
  const source = mesh.geometry, weights = source.attributes.skinWeight, joints = source.attributes.skinIndex;
  if (!source.index || !weights || !joints) return null;
  const selected = new Uint8Array(source.attributes.position.count), indices = [];
  for (let i = 0; i < selected.length; i++) {
    let armWeight = 0;
    for (let k = 0; k < 4; k++) {
      const bone = mesh.skeleton.bones[joints.getComponent(i, k)];
      if (/^(upper_arm|forearm|hand|thumb|index|middle|ring|little)/.test(bone?.name || '')) armWeight += weights.getComponent(i, k);
    }
    selected[i] = armWeight > .55;
  }
  for (let i = 0; i < source.index.count; i += 3) {
    const a = source.index.getX(i), b = source.index.getX(i + 1), c = source.index.getX(i + 2);
    if (selected[a] && selected[b] && selected[c]) indices.push(a, b, c);
  }
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) geometry.setAttribute(name, attribute);
  geometry.setIndex(indices);
  const arms = new THREE.SkinnedMesh(geometry, mesh.material); arms.name = 'bike-first-person-arms';
  arms.bind(mesh.skeleton, mesh.bindMatrix); arms.bindMatrixInverse.copy(mesh.bindMatrixInverse);
  arms.frustumCulled = false; arms.visible = false; arms.castShadow = true;
  return arms;
}

/** Independent rider skeleton and mixer; source geometry/materials remain shared. */
export function createBikeActor({ bike, riderClips }, astronautAsset) {
  if (!bike?.scene || !astronautAsset?.scene) throw new Error('Bike actor requires original bike and astronaut assets');
  const clips = riderClips?.animations || riderClips;
  const clipNames = ['BikeIdle', 'BikeThrust', 'BikeBrake', 'BikeAim'];
  if (!Array.isArray(clips) || clipNames.some(name => !clips.some(clip => clip.name === name))) {
    throw new Error('Bike actor requires all four authored rider clips');
  }
  const group = new THREE.Group(); group.name = 'astronaut-bike'; group.userData.kind = 'bike';
  const visual = new THREE.Group(); visual.name = 'bike-inertia'; group.add(visual);
  const model = bike.scene.clone(true); model.name = 'original-space-bike'; visual.add(model);
  const rider = new THREE.Group(); rider.name = 'bike-rider'; rider.rotation.y = Math.PI; visual.add(rider);
  const human = cloneRig(astronautAsset.scene); rider.add(human); human.updateMatrixWorld(true);
  const body = [], arms = [];
  human.traverse(node => { if (node.isSkinnedMesh) body.push(node); });
  for (const mesh of body) { const partial = firstPersonArms(mesh); if (partial) { mesh.parent.add(partial); arms.push(partial); } }
  const muzzle = human.getObjectByName('WeaponMuzzle'), weapon = human.getObjectByName('Nova_Pulse_Gun');
  const head = human.getObjectByName('head');
  if (!muzzle || !weapon || !head) throw new Error('Bike rider requires the approved weapon, muzzle and head rig');
  const eye = human.getObjectByName('EVA_Eye') || new THREE.Object3D();
  if (!eye.parent) { eye.position.set(0, 1.69, .16); human.add(eye); }
  // Bind the approved eye location to the head before evaluating a riding pose.
  group.updateMatrixWorld(true); head.attach(eye); eye.name = 'BikeEye';
  const tether = new THREE.Object3D(); tether.name = 'BikeCableSocket'; tether.position.set(...BIKE_ANCHORS.tether); visual.add(tether);
  const mixer = new THREE.AnimationMixer(human), actions = {};
  for (const name of clipNames) actions[name] = mixer.clipAction(clips.find(clip => clip.name === name)).play().setEffectiveWeight(name === 'BikeIdle' ? 1 : 0);
  mixer.update(0);
  const jetGeometry = new THREE.ConeGeometry(1, 1, 12), jetMaterial = new THREE.MeshBasicMaterial();
  const sources = BIKE_ANCHORS.nozzles.map(anchor => {
    const mount = new THREE.Group(); mount.position.set(...anchor.position);
    mount.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...anchor.direction)); visual.add(mount);
    const source = new THREE.Mesh(jetGeometry, jetMaterial); source.name = `${anchor.name}-exhaust`;
    source.rotation.x = Math.PI / 2; source.position.z = .5;
    source.userData.radius = anchor.radius; source.userData.power = 0; mount.add(source);
    return source;
  });
  const exhaust = createPropulsion(group, { gain: .9 }), local = new THREE.Vector3();
  let previous = null, disposed = false;
  function reset() {
    previous = null; exhaust.reset(); visual.position.set(0, 0, 0); visual.rotation.set(0, 0, 0);
    for (const [name, action] of Object.entries(actions)) action.setEffectiveWeight(name === 'BikeIdle' ? 1 : 0);
    mixer.setTime(0); weapon.visible = false;
  }
  function update(time = 0, context = {}) {
    if (disposed) return;
    const { mounted = true, firstPerson = false, aiming = false, braking = false, boost = false, reducedMotion = false } = context;
    const dt = frameDelta(time, previous, context.dt); previous = time;
    localThrottle(group, { ...context, maxAcceleration: context.maxAcceleration || 12 }, local);
    const power = mounted ? Math.max(0, -local.z, boost ? .8 : 0) : 0;
    const next = aiming ? 'BikeAim' : braking ? 'BikeBrake' : power > .08 ? 'BikeThrust' : 'BikeIdle';
    let total = 0;
    for (const [name, action] of Object.entries(actions)) {
      const weight = THREE.MathUtils.damp(action.getEffectiveWeight(), name === next ? 1 : 0, 10, dt);
      action.setEffectiveWeight(weight); total += weight;
    }
    for (const action of Object.values(actions)) action.setEffectiveWeight(action.getEffectiveWeight() / Math.max(.0001, total));
    mixer.update(reducedMotion ? 0 : dt);
    rider.visible = mounted;
    for (const mesh of body) mesh.visible = !firstPerson;
    for (const mesh of arms) mesh.visible = firstPerson;
    weapon.visible = mounted && actions.BikeAim.getEffectiveWeight() > .08;
    updateBodyMotion(visual, local, time, dt, { reducedMotion, aiming, strength: .09 });
    for (const source of sources) source.userData.power = power;
    exhaust.update(time, { dt, thrust: power, velocity: context.velocity, boost, reducedMotion });
    group.updateMatrixWorld(true);
  }
  function dispose() {
    if (disposed) return; disposed = true;
    exhaust.dispose(); mixer.stopAllAction(); mixer.uncacheRoot(human);
    const skeletons = new Set(); human.traverse(node => { if (node.isSkinnedMesh) skeletons.add(node.skeleton); });
    for (const skeleton of skeletons) skeleton.dispose();
    for (const mesh of arms) mesh.geometry.dispose();
    jetGeometry.dispose(); jetMaterial.dispose(); group.removeFromParent();
  }
  reset();
  return { group, visual, rider, model, body, arms, muzzle, eye, tether, exhaust, actions, update, reset, dispose };
}
