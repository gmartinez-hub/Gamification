import * as THREE from '../../vendor/three.module.js';
import { createShip, createAstronaut, createCompanion } from './models.js';
import { createEnvironment } from './environment.js';
import { createProgression } from './progression.js';
import { AudioManager } from '../../nave_three_audio_pack_v2_refined/AudioManager.js';

const $ = (id) => document.getElementById(id);
const canvas = $('scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  $('loading').classList.add('error');
  $('loading').querySelector('p').textContent = 'No pudimos iniciar el mundo 3D. Probá un navegador con WebGL 2 y aceleración gráfica activada.';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = innerWidth >= 700;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080f1e);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 350);
scene.add(new THREE.HemisphereLight(0xc7e7ef, 0x18203a, 2.1));
const sun = new THREE.DirectionalLight(0xffe2bb, 3.5);
sun.position.set(-18, 26, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 22, bottom: -22, near: 1, far: 90 });
sun.shadow.normalBias = 0.08;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x6bbfcf, 1.8);
rim.position.set(15, 9, -20);
scene.add(rim);

const environment = createEnvironment(scene);
const ship = createShip();
const astronaut = createAstronaut();
const companion = createCompanion();
scene.add(ship.group, astronaut.group, companion.group);
const progression = createProgression();
const { state } = progression;
const audio = new AudioManager({ manifestUrl: new URL('../../nave_three_audio_pack_v2_refined/audio_manifest.json', import.meta.url).href });
audio.setMuted(true);
let audioReady = false;
let audioLoading;
let soundEnabled = false;
let started = false;
let paused = false;
let inspecting = false;
let actor = 'astronaut';
let destination = null;
let time = 0;
let lastFrame = performance.now();
let toastUntil = 0;
let assemblyUntil = 0;
let followUntil = 0;
let zoom = 1;
let orbit = 0.6;
let targetOrbit = orbit;
let targetZoom = zoom;
const keys = new Set();
const cameraTarget = new THREE.Vector3(0, 0, 0);
const cameraPosition = new THREE.Vector3();
const worldProjection = new THREE.Vector3();
const direction = new THREE.Vector3();
const right = new THREE.Vector3();
const forward = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8);
const pointer = new THREE.Vector2();
const touchStart = new THREE.Vector2();
const companionTarget = new THREE.Vector3();
const beaconNames = ['A-01 · EL ORIGEN', 'A-02 · EL ENLACE', 'A-03 · EL HORIZONTE'];
const labels = environment.beacons.map((beacon, index) => {
  const element = document.createElement('div');
  element.className = 'beacon-label';
  element.innerHTML = `${beaconNames[index]}<small>${index === 0 ? 'SEÑAL ACTIVA' : 'EN ESPERA'}</small>`;
  $('worldLabels').append(element);
  return element;
});

// Geometry-based destination marker, independent of legacy sprite atlases.
const destinationMarker = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.42, 32), new THREE.MeshBasicMaterial({ color: 0x9de8dc, side: THREE.DoubleSide, transparent: true, opacity: 0.65, depthWrite: false }));
destinationMarker.rotation.x = -Math.PI / 2;
destinationMarker.visible = false;
scene.add(destinationMarker);
const collectionRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 5, 64), new THREE.MeshBasicMaterial({ color: 0xa8ffec, transparent: true, opacity: 0, depthWrite: false }));
collectionRing.rotation.x = Math.PI / 2;
scene.add(collectionRing);
let burstStart = -10;

function resetPositions() {
  ship.group.position.set(0, 1.65, 4);
  ship.group.rotation.set(0, -0.65, 0);
  astronaut.group.position.set(3, 0.8, 5);
  astronaut.group.rotation.set(0, -2.6, 0);
  companion.group.position.set(4.25, 2.8, 5.2);
  companion.group.rotation.y = -2.6;
}
resetPositions();

function currentActor() { return actor === 'ship' ? ship.group : astronaut.group; }
function activeBeacon() { return environment.beacons.find((beacon) => beacon.id === state.activeBeacon); }
function distanceToBeacon() {
  const beacon = activeBeacon();
  if (!beacon) return Infinity;
  const position = currentActor().position;
  return Math.hypot(position.x - beacon.position.x, position.z - beacon.position.z);
}
function notify(message, duration = 4) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  toastUntil = time + duration;
}
function setCompanion(message) { $('companionMessage').textContent = message; }
function play(id, volume) {
  if (soundEnabled && audioReady && !paused) audio.playOneShot(id, { volume });
}
async function toggleSound() {
  soundEnabled = !soundEnabled;
  $('soundButton').classList.toggle('sound-on', soundEnabled);
  $('soundButton').setAttribute('aria-pressed', String(soundEnabled));
  $('soundButton').setAttribute('aria-label', soundEnabled ? 'Silenciar sonido' : 'Activar sonido');
  audio.setMuted(!soundEnabled || paused);
  if (!soundEnabled) return;
  try {
    // Unlock Web Audio synchronously within the click, then load the repo's audio pack once.
    await audio.init();
    audioLoading ??= audio.preloadManifest();
    await audioLoading;
    audioReady = true;
    if (soundEnabled && !paused) audio.setEngineState('idle');
  } catch {
    soundEnabled = false;
    audioLoading = null;
    audio.setMuted(true);
    $('soundButton').classList.remove('sound-on');
    $('soundButton').setAttribute('aria-pressed', 'false');
    $('soundButton').setAttribute('aria-label', 'Activar sonido');
    notify('El audio no se pudo cargar. Podés seguir explorando.');
  }
}
function updateMissionUI() {
  $('gemCount').textContent = String(state.gems).padStart(2, '0');
  [...$('gemIcons').children].forEach((element, index) => {
    element.classList.toggle('collected', index < state.gems);
    element.textContent = index < state.gems ? '◆' : '◇';
  });
  $('assemblyPercent').textContent = `${Math.round(state.stage / 3 * 100)}%`;
  $('assemblyBar').style.width = `${state.stage / 3 * 100}%`;
  document.querySelectorAll('.module-list li').forEach((element) => {
    const unlocked = Number(element.dataset.stage) <= state.stage;
    element.classList.toggle('unlocked', unlocked);
    element.querySelector('.module-status').textContent = unlocked ? '✓' : '◇';
  });
  labels.forEach((label, index) => {
    label.classList.toggle('active', index === state.gems);
    label.classList.toggle('done', index < state.gems);
    label.querySelector('small').textContent = index < state.gems ? 'RECUPERADA' : index === state.gems ? 'SEÑAL ACTIVA' : 'EN ESPERA';
    $(`radar-${index}`).setAttribute('class', index < state.gems ? 'done' : index === state.gems ? 'active' : '');
  });
  $('sectorNumber').textContent = `SECTOR ${String(Math.min(3, state.gems + 1)).padStart(2, '0')}`;
  if (!started) return;
  $('missionTitle').innerHTML = ['La primera<br />conexión.', 'Espacio para<br />ir más lejos.', 'El siguiente<br />horizonte.', 'Lista para<br />lo que viene.'][state.gems];
  $('missionDescription').textContent = [
    'Recuperá la gema de la baliza A-01 para acoplar el hábitat a tu cabina.',
    'El hábitat ya es parte de tu nave. La gema de A-02 desbloquea la propulsión.',
    'Tu nave está ensamblada. Recuperá la última gema para activar su núcleo.',
    'Tres gemas, una nave completa. Ahora podés pilotarla y explorar todo el sector.',
  ][state.gems];
  $('missionButton').innerHTML = state.complete ? 'Volver a explorar <span>↻</span>' : `Ir a baliza A-0${state.gems + 1} <span>↗</span>`;
  $('missionHint').textContent = state.complete ? 'Expedición completa · El espacio es tuyo.' : 'O explorá libremente con WASD y clic.';
}
function startMission() {
  started = true;
  document.body.classList.add('playing');
  updateMissionUI();
  setCompanion('Seguí la señal cian. Cuando estés cerca, presioná E para recuperar la gema.');
  play('ui_mission_accept', 0.25);
}
function navigateToBeacon() {
  if (paused) return;
  if (!started) startMission();
  if (state.complete) { resetMission(); return; }
  setInspect(false);
  if (actor !== 'astronaut') selectActor('astronaut');
  const beacon = activeBeacon();
  // Stop beside the physical beacon, inside pickup range.
  destination = beacon.position.clone().add(new THREE.Vector3(1.3, 0, 1.1));
  destination.y = astronaut.group.position.y;
  setCompanion(`Rumbo a A-0${state.gems + 1}. Yo te acompaño; vos recuperás la gema.`);
  followUntil = time + 20;
  play('ui_mission_click', 0.2);
}
function selectActor(next) {
  if (paused) return;
  if (!started) startMission();
  destination = null;
  if (next === actor) return;
  actor = next;
  // The pilot boards remotely; switching back places the astronaut beside the ship.
  if (actor === 'astronaut') {
    astronaut.group.position.copy(ship.group.position).add(new THREE.Vector3(2.7, 0, 0));
    astronaut.group.position.y = 0.8;
    astronaut.group.position.x = THREE.MathUtils.clamp(astronaut.group.position.x, -20, 20);
  }
  astronaut.group.visible = actor === 'astronaut';
  $('astronautButton').classList.toggle('selected', actor === 'astronaut');
  $('shipButton').classList.toggle('selected', actor === 'ship');
  $('astronautButton').setAttribute('aria-pressed', String(actor === 'astronaut'));
  $('shipButton').setAttribute('aria-pressed', String(actor === 'ship'));
  setCompanion(actor === 'ship' ? 'Tenés el mando. Pilotá con WASD o elegí un punto del mapa.' : 'Listo para explorar. Las gemas se recuperan fuera de la nave.');
  setInspect(false);
  play('ui_hover_sonar', 0.16);
}
function collectGem() {
  if (paused || inspecting || !started || actor !== 'astronaut' || distanceToBeacon() > 2.5 || time < assemblyUntil) return;
  const beacon = activeBeacon();
  if (!beacon || !progression.collect(beacon.id)) return;
  destination = null;
  environment.setProgress(state.gems);
  ship.setStage(state.stage, !reducedMotion);
  burstStart = time;
  collectionRing.position.copy(beacon.position);
  play('reward_unlock_sparkle', 0.32);
  if (!state.complete) {
    play('ship_module_attach', 0.28);
    assemblyUntil = time + 3.5;
    notify(state.gems === 1 ? 'HÁBITAT ACOPLADO · Tu nave crece.' : 'PROPULSIÓN ACOPLADA · Un nuevo horizonte.');
  } else {
    assemblyUntil = time + 3.5;
    notify('NÚCLEO ACTIVADO · Expedición completa.', 6);
    play('motion_liftoff', 0.25);
  }
  setCompanion([
    '',
    '¡Primera conexión! Mirá cómo se acopla el hábitat. Ahora, la señal A-02.',
    'Motores conectados. Nos queda una gema para activar el núcleo de la nave.',
    'Lo construimos juntos. Tu nave está lista; el próximo destino lo elegís vos.',
  ][state.gems]);
  updateMissionUI();
}
function resetMission() {
  progression.reset();
  environment.setProgress(0);
  ship.setStage(1, false);
  resetPositions();
  actor = 'astronaut';
  astronaut.group.visible = true;
  destination = null;
  assemblyUntil = 0;
  burstStart = -10;
  keys.clear();
  $('astronautButton').classList.add('selected');
  $('shipButton').classList.remove('selected');
  $('astronautButton').setAttribute('aria-pressed', 'true');
  $('shipButton').setAttribute('aria-pressed', 'false');
  setInspect(false);
  targetZoom = 1;
  targetOrbit = 0.6;
  setCompanion('Una nueva expedición. Volvemos a la primera señal.');
  updateMissionUI();
  notify('Nueva expedición · Cabina preparada.');
}
function setInspect(value) {
  inspecting = value;
  if (value) { destination = null; keys.clear(); }
  document.body.classList.toggle('inspecting', value);
  document.querySelector('.mission-panel').inert = value;
  $('inspectButton').innerHTML = value ? 'Volver al mapa <span>↙</span>' : 'Inspeccionar nave <span>↗</span>';
  $('inspectButton').setAttribute('aria-pressed', String(value));
}
function setPaused(value) {
  paused = value;
  keys.clear();
  $('pauseOverlay').hidden = !value;
  $('pauseButton').setAttribute('aria-pressed', String(value));
  $('pauseButton').setAttribute('aria-label', value ? 'Continuar' : 'Pausar');
  audio.setMuted(!soundEnabled || value);
}
let wasPausedBeforeHelp = false;
$('helpButton').addEventListener('click', () => {
  wasPausedBeforeHelp = paused;
  setPaused(true);
  $('pauseOverlay').hidden = true;
  $('helpDialog').showModal();
});
$('closeHelp').addEventListener('click', () => $('helpDialog').close());
$('helpDialog').addEventListener('close', () => setPaused(wasPausedBeforeHelp));
$('pauseButton').addEventListener('click', () => setPaused(!paused));
$('resumeButton').addEventListener('click', () => setPaused(false));
$('soundButton').addEventListener('click', toggleSound);
$('missionButton').addEventListener('click', navigateToBeacon);
$('interactButton').addEventListener('click', collectGem);
$('astronautButton').addEventListener('click', () => selectActor('astronaut'));
$('shipButton').addEventListener('click', () => selectActor('ship'));
$('inspectButton').addEventListener('click', () => { if (!paused) setInspect(!inspecting); });
$('zoomIn').addEventListener('click', () => { targetZoom = Math.max(0.55, targetZoom - 0.15); });
$('zoomOut').addEventListener('click', () => { targetZoom = Math.min(1.5, targetZoom + 0.15); });
$('cameraButton').addEventListener('click', () => { targetOrbit += Math.PI / 4; });
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  targetZoom = THREE.MathUtils.clamp(targetZoom + event.deltaY * 0.00065, 0.55, 1.5);
}, { passive: false });
canvas.addEventListener('pointerdown', (event) => touchStart.set(event.clientX, event.clientY));
canvas.addEventListener('pointerup', (event) => {
  if (paused || inspecting || time < assemblyUntil || touchStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 8) return;
  if (!started) startMission();
  pointer.set(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2);
  raycaster.setFromCamera(pointer, camera);
  const point = raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3());
  if (!point) return;
  point.x = THREE.MathUtils.clamp(point.x, -20, 20);
  point.z = THREE.MathUtils.clamp(point.z, -18, 18);
  point.y = currentActor().position.y;
  destination = point;
  followUntil = time + 15;
  canvas.focus({ preventScroll: true });
});
const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
window.addEventListener('keydown', (event) => {
  if ($('helpDialog').open) return;
  if (event.code === 'Escape') { event.preventDefault(); setPaused(!paused); return; }
  if (paused || event.ctrlKey || event.metaKey || event.altKey) return;
  if (movementKeys.has(event.code)) {
    event.preventDefault();
    if (!started) startMission();
    if (inspecting) setInspect(false);
    keys.add(event.code);
    destination = null;
  }
  if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); collectGem(); }
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); if (started) setPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && started) setPaused(true); });
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
});
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  setPaused(true);
  $('loading').hidden = false;
  $('loading').style.opacity = '1';
  $('loading').classList.add('error');
  $('loading').querySelector('p').textContent = 'Se interrumpió la conexión gráfica. Recargá la página para volver a explorar.';
});

function updateMovement(dt) {
  direction.set(0, 0, 0);
  if (!started || paused || inspecting || time < assemblyUntil) return 0;
  const controlled = currentActor();
  const x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const z = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
  if (x || z) {
    right.set(Math.cos(orbit), 0, -Math.sin(orbit));
    forward.set(Math.sin(orbit), 0, Math.cos(orbit));
    direction.addScaledVector(right, x).addScaledVector(forward, z).normalize();
    followUntil = time + 5;
  } else if (destination) {
    direction.subVectors(destination, controlled.position);
    direction.y = 0;
    if (direction.length() < 0.12) { destination = null; direction.set(0, 0, 0); }
    else direction.normalize();
  }
  if (!direction.lengthSq()) return 0;
  const boosted = keys.has('ShiftLeft') || keys.has('ShiftRight');
  let step = (actor === 'ship' ? 5 + state.gems * 1.2 : 4.2) * (boosted ? 1.8 : 1) * dt;
  if (destination) step = Math.min(step, controlled.position.distanceTo(destination));
  controlled.position.addScaledVector(direction, step);
  controlled.position.x = THREE.MathUtils.clamp(controlled.position.x, -20, 20);
  controlled.position.z = THREE.MathUtils.clamp(controlled.position.z, -18, 18);
  const targetAngle = Math.atan2(-direction.x, -direction.z);
  controlled.rotation.y += Math.atan2(Math.sin(targetAngle - controlled.rotation.y), Math.cos(targetAngle - controlled.rotation.y)) * Math.min(1, dt * 9);
  return 1;
}
function updateCamera(dt) {
  orbit = THREE.MathUtils.damp(orbit, targetOrbit, 4, dt);
  zoom = THREE.MathUtils.damp(zoom, targetZoom, 5, dt);
  const focusShip = inspecting || time < assemblyUntil;
  const target = focusShip ? ship.group.position : (time < followUntil || innerWidth < 700) ? currentActor().position : new THREE.Vector3(0, 0, 0);
  const desiredTarget = target.clone();
  if (focusShip) desiredTarget.y += 0.3;
  else if (innerWidth < 700) desiredTarget.y += 1;
  cameraTarget.lerp(desiredTarget, reducedMotion ? 1 : 1 - Math.exp(-dt * 2.8));
  const portraitFit = focusShip ? Math.max(1, 0.9 / camera.aspect) : 1;
  const distance = (focusShip ? 11.5 : innerWidth < 700 ? 36 : 40) * zoom * portraitFit;
  const elevation = focusShip ? 0.53 : 0.63;
  cameraPosition.set(Math.sin(orbit) * distance * Math.cos(elevation), Math.sin(elevation) * distance, Math.cos(orbit) * distance * Math.cos(elevation));
  cameraPosition.add(cameraTarget);
  camera.position.lerp(cameraPosition, reducedMotion ? 1 : 1 - Math.exp(-dt * 3));
  camera.lookAt(cameraTarget);
}
function updateHUD() {
  const distance = distanceToBeacon();
  const canCollect = started && !state.complete && actor === 'astronaut' && distance <= 2.5 && time >= assemblyUntil && !inspecting && !paused;
  $('interactButton').disabled = !canCollect;
  $('interactButton').querySelector('span').textContent = state.complete ? 'Expedición completa' : actor === 'ship' ? 'Salí como astronauta para recoger' : canCollect ? 'Recuperar gema' : 'Acercate a la baliza';
  $('radarDistance').textContent = state.complete ? 'COMPLETO' : `A-0${state.gems + 1} · ${Math.round(distance)} m`;
  const position = currentActor().position;
  $('radarPlayer').setAttribute('transform', `translate(${90 + position.x * 4.2},${52 + position.z * 2.85}) rotate(${currentActor().rotation.y * 180 / Math.PI})`);
  environment.beacons.forEach((beacon, index) => {
    worldProjection.copy(beacon.position).add(new THREE.Vector3(0, 2.7, 0)).project(camera);
    const x = (worldProjection.x + 1) * innerWidth / 2;
    const y = (1 - worldProjection.y) * innerHeight / 2;
    labels[index].style.left = `${x}px`;
    labels[index].style.top = `${y}px`;
    labels[index].style.display = worldProjection.z > 1 || worldProjection.z < -1 || x < 15 || x > innerWidth - 15 || y < 90 || y > innerHeight - 165 ? 'none' : '';
  });
}
updateMissionUI();
environment.setProgress(0);
camera.position.set(20, 25, 33);
camera.lookAt(cameraTarget);
let hudTimer = 0;
let renderedFrames = 0;
function animate(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (!paused) {
    time += dt;
    const moving = updateMovement(dt);
    const boost = keys.has('ShiftLeft') || keys.has('ShiftRight');
    environment.update(reducedMotion ? 0 : time);
    ship.update(time, { moving: actor === 'ship' ? moving : 0, boost: actor === 'ship' && boost });
    astronaut.update(time, { moving: actor === 'astronaut' ? moving : 0, boost: actor === 'astronaut' && boost });
    companionTarget.copy(currentActor().position).add(new THREE.Vector3(1.6, actor === 'ship' ? 1.1 : 1.8, 0.3));
    companion.group.position.lerp(companionTarget, 1 - Math.exp(-dt * 3));
    companion.group.rotation.y = currentActor().rotation.y;
    companion.update(time, { moving, boost });
    updateCamera(dt);
    if (soundEnabled && audioReady) {
      const engineState = moving ? boost ? 'boost' : 'move' : 'idle';
      if (audio.currentEngineState !== engineState) audio.setEngineState(engineState);
    }
    const burstAge = time - burstStart;
    collectionRing.visible = burstAge < 1.6;
    if (collectionRing.visible) {
      collectionRing.scale.setScalar(0.5 + burstAge * 4);
      collectionRing.material.opacity = Math.max(0, 1 - burstAge / 1.6);
    }
    destinationMarker.visible = !!destination && !inspecting && time >= assemblyUntil;
    if (destination) { destinationMarker.position.copy(destination); destinationMarker.scale.setScalar(1 + Math.sin(time * 5) * 0.1); }
    if (time > toastUntil) $('toast').classList.remove('visible');
  }
  hudTimer += dt;
  if (hudTimer > 0.08) { updateHUD(); hudTimer = 0; }
  renderer.render(scene, camera);
  renderedFrames += 1;
  if (renderedFrames === 2) {
    $('loading').style.opacity = '0';
    setTimeout(() => { $('loading').hidden = true; }, reducedMotion ? 0 : 650);
  }
  requestAnimationFrame(animate);
}
renderer.render(scene, camera);
requestAnimationFrame(animate);
