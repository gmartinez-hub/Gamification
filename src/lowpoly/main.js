import * as THREE from '../../vendor/three.module.js';
import { createShip, createAstronaut, createCompanion, createCockpit } from './models.js';
import { createSectorWorld } from './sector-world.js';
import { createExpedition, createRandom, aimChance } from './expedition.js';
import { createFlight, EVA_CENTER_Y, EVA_RADIUS } from './flight.js';
import { createControls } from './controls.js';
import { getMobileAction } from './mobile-actions.js';
import { createCombat, WEAPON_RANGE } from './combat.js';
import { shipPoint, shipCollisionSpheres, shipFrameRadius } from './spatial.js';
import { sweptSphereContact, closestApproach } from './hazards.js';
import { createPresentation, createReflectionEnvironment } from './presentation.js';
import { createEffects } from './effects.js';
import { AudioManager } from '../../nave_three_audio_pack_v2_refined/AudioManager.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (error) {
  $('loading').classList.add('error');
  $('loading').querySelector('p').textContent = 'No pudimos iniciar el mundo 3D. Probá con WebGL 2 y aceleración gráfica activada.';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 900 ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = null;
const reflection = createReflectionEnvironment(renderer);
scene.environment = reflection.texture; scene.environmentIntensity = .45;
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .1, 600);
scene.add(new THREE.HemisphereLight(0xc7e7ef, 0x18203a, 1.45));
const sun = new THREE.DirectionalLight(0xffe2bb, 3.8);
sun.position.set(-30, 45, 20); scene.add(sun);
const rim = new THREE.DirectionalLight(0x6bbfcf, 1.25);
rim.position.set(15, 9, -20); scene.add(rim);
const ship = createShip(), astronaut = createAstronaut(), companion = createCompanion();
scene.add(ship.group, astronaut.group, companion.group, camera);
const cockpit = createCockpit(); camera.add(cockpit.group); cockpit.group.visible = false;
const presentation = createPresentation(renderer);
const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
const seed = seedParam ? /^\d+$/.test(seedParam) ? Number(seedParam) : seedParam : 712069;
const mission = createExpedition(seed);
const { state } = mission;
const flight = createFlight();
let shotRandom = createRandom(`${state.seed}:combat`);
const combat = createCombat(() => shotRandom());
const world = createSectorWorld(scene);
world.load(state.layout);
const audio = new AudioManager({ manifestUrl: new URL('../../nave_three_audio_pack_v2_refined/audio_manifest.json', import.meta.url).href });
audio.setMuted(true);
let soundEnabled = false, audioReady = false, audioLoading;
let paused = false, inspecting = false, firstPerson = false;
let mobileAction = { action: 'none', disabled: true };
let flightMenuOpen = false, wasPausedBeforeMenu = false;
const compactHUD = matchMedia('(pointer: coarse), (max-width: 700px)');
let time = 0, lastFrame = performance.now(), toastUntil = 0, damageUntil = 0, invulnerableUntil = 0;
let orbit = -.9, elevation = .28, zoom = 1, targetZoom = 1;
let selectedId = null, navigating = false, scanProgress = 0, scanning = false;
let health = 100, assemblyUntil = 0, transitStart = 0;
let pendingModule = 0, attachAt = 0, arrivalVeilUntil = 0;
let previousActor = flight.actor, previousPhase = state.phase, hudTimer = 0, frames = 0;
const direction = new THREE.Vector3(), right = new THREE.Vector3(), forward = new THREE.Vector3();
const cameraTarget = new THREE.Vector3(2, .8, 10), cameraPosition = new THREE.Vector3();
const lookTarget = new THREE.Vector3(), projected = new THREE.Vector3(), temp = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const previousPosition = new THREE.Vector3(), previousQuaternion = new THREE.Quaternion();
const colliderStart = new THREE.Vector3(), colliderEnd = new THREE.Vector3(), relativeVelocity = new THREE.Vector3();
let collisionActor = flight.actor, hazardWarning = null, controlWasLocked = false;
const transitEntry = new THREE.Vector3();
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), pointerStart = new THREE.Vector2();
const tetherPositions = new Float32Array(25 * 3);
const tetherGeometry = new THREE.BufferGeometry();
tetherGeometry.setAttribute('position', new THREE.BufferAttribute(tetherPositions, 3));
const tether = new THREE.Line(tetherGeometry, new THREE.LineBasicMaterial({ color: 0x9fe5db, transparent: true, opacity: .8 }));
tether.frustumCulled = false; scene.add(tether);
const selection = new THREE.Mesh(new THREE.TorusGeometry(1, .022, 4, 48), new THREE.MeshBasicMaterial({ color: 0xc0efde, transparent: true, opacity: .8, depthWrite: false }));
scene.add(selection);
const projectile = new THREE.Mesh(new THREE.SphereGeometry(.14, 6, 4), new THREE.MeshBasicMaterial({ color: 0xb5fff1, toneMapped: false }));
projectile.visible = false; scene.add(projectile);
const effects = createEffects(scene);

function notify(message, duration = 4) { $('toast').textContent = message; $('toast').classList.add('visible'); toastUntil = time + duration; }
function say(message) { $('companionMessage').textContent = message; }
function play(id, volume = .25) { if (soundEnabled && audioReady && !paused) audio.playOneShot(id, { volume }); }
function blocked() { return paused || inspecting || state.phase === 'transit' || time < assemblyUntil; }
function forcedExterior() { return inspecting || time < assemblyUntil || state.phase === 'transit' || state.phase === 'complete'; }
function visorActive() { return firstPerson && !forcedExterior(); }
function validTargets() { return world.targets.filter(target => target.kind === state.phase && !state.destroyed.includes(target.id)); }
function selectedTarget() { return validTargets().find(target => target.id === selectedId) || null; }
function targetNext() {
  if (blocked() || combat.shot) return;
  const targets = validTargets();
  if (!targets.length) return;
  const index = targets.findIndex(target => target.id === selectedId);
  selectedId = targets[(index + 1) % targets.length].id;
  play('ui_hover_sonar', .12);
}
function ensureTarget() {
  if (!selectedTarget()) selectedId = validTargets().sort((a, b) => a.position.distanceToSquared(flight.position) - b.position.distanceToSquared(flight.position))[0]?.id || null;
}
function objective() {
  if (flight.returning) return { position: flight.dockPosition, label: 'REGRESO · NAVE', stop: 0 };
  if (state.phase === 'scan') return { position: world.beacon.position, label: 'BALIZA · ESCANEAR', stop: 2.5 };
  if (state.phase === 'small' || state.phase === 'large') {
    if ((state.phase === 'large' && flight.actor === 'astronaut') || (state.phase === 'small' && flight.actor === 'ship')) {
      return { position: flight.shipPosition, label: state.phase === 'large' ? 'NAVE · ABORDAR' : 'SALIR COMO ASTRONAUTA', stop: 0 };
    }
    const target = selectedTarget();
    if (target) return { position: target.position, label: `${target.kind === 'small' ? 'ASTEROIDE' : 'NÚCLEO'} · ${Math.round(target.position.distanceTo(flight.position))} m`, stop: target.kind === 'small' ? 10 : 15 };
  }
  if (state.phase === 'gem') return { position: world.gem.position, label: 'GEMA · RECUPERAR', stop: flight.actor === 'ship' ? 10 : 1.7 };
  if (state.phase === 'return') return flight.actor === 'astronaut'
    ? { position: flight.dockPosition, label: 'NAVE · ABORDAR', stop: 0 }
    : { position: world.gate.position, label: 'CORREDOR · SIGUIENTE HORIZONTE', stop: .5 };
  return null;
}
function returnToShip() {
  if (blocked() || combat.shot || state.phase === 'complete') return;
  if (flight.returnToShip()) {
    navigating = false; scanning = false; controls.clear();
    say('Volvemos al acceso de la nave. Recojo el cable al abordar.');
    notify('Regreso asistido · Recogiendo cable');
  }
}
function deploy() {
  if (blocked() || combat.shot || state.phase === 'complete') return;
  if (flight.deploy()) {
    previousActor = flight.actor;
    navigating = false; scanning = false; controls.clear();
    say('Conectados por cable. Podés subir, bajar y explorar alrededor de la nave.');
    play('ui_mission_click', .18);
  }
}
function stopNavigation() {
  if (navigating && flight.actor === 'ship') { orbit = flight.shipYaw; elevation = -flight.shipPitch; }
  navigating = false;
}
function navigate() {
  if (paused || combat.shot) return;
  if (state.phase === 'complete') { resetExpedition(); return; }
  if (inspecting) setInspect(false);
  if (blocked()) return;
  if (navigating) { stopNavigation(); notify('Guía desactivada · Vuelo libre'); return; }
  if (flight.actor === 'astronaut' && (state.phase === 'large' || state.phase === 'return')) { returnToShip(); return; }
  if (flight.actor === 'ship' && (state.phase === 'scan' || state.phase === 'small')) deploy();
  if (state.phase === 'gem' && flight.actor === 'ship' && flight.position.distanceTo(world.gem.position) < 12) deploy();
  navigating = true; scanning = false;
  say('Sigo la ruta. Movete con los controles para recuperar el vuelo libre.');
  play('ui_mission_click', .16);
}
function interact() {
  if (blocked() || flight.returning || combat.shot) return;
  if (flight.actor !== 'astronaut') { notify('Salí de la nave para interactuar.'); return; }
  if (state.phase === 'scan') {
    if (flight.position.distanceTo(world.beacon.position) > 3.8) { notify('Acercate a menos de 4 m de la baliza.'); return; }
    scanning = !scanning; navigating = false; scanProgress = 0;
    say(scanning ? 'Escaneando. Mantenete cerca mientras decodifico la señal.' : 'Escaneo interrumpido.');
  } else if (state.phase === 'gem') {
    if (flight.position.distanceTo(world.gem.position) > 3) { notify('Acercate a menos de 3 m de la gema.'); return; }
    if (mission.collectGem()) {
      navigating = false; triggerBurst(world.gem.position, 'gem');
      play('reward_unlock_sparkle', .3);
      notify('Gema recuperada · Corredor habilitado');
      say('La ruta está abierta. Volvé a abordar; el módulo nos espera en el corredor.');
    }
  }
}
function fire() {
  if (blocked() || flight.returning || combat.shot) return;
  const target = selectedTarget();
  if (!target) { notify('Primero necesitamos un objetivo activo.'); return; }
  const required = target.kind === 'small' ? 'astronaut' : 'ship';
  if (flight.actor !== required) { notify(required === 'ship' ? 'Este núcleo requiere el cañón de la nave. Volvé a abordar.' : 'Los asteroides pequeños requieren el arma del astronauta.'); return; }
  const distance = flight.position.distanceTo(target.position);
  if (distance > WEAPON_RANGE[flight.actor]) { notify('Fuera de alcance. Acercate antes de disparar.'); return; }
  const chance = aimChance({ actor: flight.actor, distance, sector: state.sector, speed: flight.velocity.length() });
  if (combat.start({ id: target.id, actor: flight.actor, kind: target.kind, distance, chance, origin: flight.position.clone().add(new THREE.Vector3(0, .8, -1)) })) {
    if (flight.actor === 'ship') {
      temp.subVectors(target.position, flight.shipPosition).normalize();
      forward.set(0, 0, -1).applyQuaternion(flight.shipQuaternion);
      combat.shot.lockTime = Math.max(1.6, forward.angleTo(temp) / (65 * Math.PI / 180) + 1.05);
    }
    navigating = false; scanning = false; controls.clear();
    play('ui_hover_sonar', .16);
  }
}
function triggerBurst(position, kind = 'scan') { effects.burst(position, kind, time); }
function setView() {
  if (paused || time < assemblyUntil || state.phase === 'transit' || state.phase === 'complete') return;
  if (inspecting) setInspect(false);
  firstPerson = !firstPerson;
  if (flight.actor === 'ship') { orbit = flight.shipYaw; elevation = -flight.shipPitch; }
  else if (firstPerson) { orbit = astronaut.group.rotation.y; elevation = 0; }
  notify(firstPerson ? flight.actor === 'ship' ? 'Vista de cabina · Arrastrá para orientar la nave' : 'Vista de visor · Arrastrá para mirar' : 'Vista exterior');
}
function setInspect(value) {
  if (paused || combat.shot || state.phase === 'transit') return;
  inspecting = value; stopNavigation(); scanning = false; firstPerson = false; controls.clear();
  if (!value && flight.actor === 'ship') { orbit = flight.shipYaw; elevation = -flight.shipPitch; }
  document.body.classList.toggle('inspecting', value);
  $('inspectButton').setAttribute('aria-pressed', String(value));
  $('inspectButton').textContent = value ? 'Volver a explorar ↙' : 'Inspeccionar nave ↗';
  document.querySelector('.mission-panel').inert = value;
}
function setPaused(value) {
  paused = value; controls.clear();
  $('pauseOverlay').hidden = !value || flightMenuOpen || $('helpDialog').open;
  $('pauseButton').setAttribute('aria-pressed', String(value));
  $('pauseButton').setAttribute('aria-label', value ? 'Continuar' : 'Pausar');
  audio.setMuted(!soundEnabled || value);
}
async function toggleSound() {
  soundEnabled = !soundEnabled;
  $('soundButton').setAttribute('aria-pressed', String(soundEnabled));
  $('soundButton').setAttribute('aria-label', soundEnabled ? 'Silenciar sonido' : 'Activar sonido');
  audio.setMuted(!soundEnabled || paused);
  if (!soundEnabled) return;
  try {
    await audio.init(); audioLoading ??= audio.preloadManifest(); await audioLoading; audioReady = true;
    if (soundEnabled && !paused) audio.setEngineState('idle');
  } catch {
    soundEnabled = false; audioLoading = null; audio.setMuted(true);
    $('soundButton').setAttribute('aria-pressed', 'false');
    $('soundButton').setAttribute('aria-label', 'Activar sonido');
    notify('No se pudo cargar el audio. La expedición sigue disponible.');
  }
}
function resetExpedition() {
  const randomSeed = crypto.getRandomValues(new Uint32Array(1))[0];
  mission.reset(randomSeed); flight.reset(); flight.setStage(1); combat.reset(); world.load(state.layout); ship.setStage(1, false);
  shotRandom = createRandom(`${state.seed}:combat`);
  paused = false; inspecting = false; firstPerson = false; navigating = false; scanning = false; scanProgress = 0;
  selectedId = null; health = 100; assemblyUntil = 0; pendingModule = 0; arrivalVeilUntil = 0; invulnerableUntil = time + 2; damageUntil = 0;
  previousPhase = state.phase; previousActor = flight.actor; orbit = -.9; elevation = .28; targetZoom = 1;
  document.body.classList.remove('inspecting'); document.querySelector('.mission-panel').inert = false;
  $('inspectButton').setAttribute('aria-pressed', 'false'); $('inspectButton').textContent = 'Inspeccionar nave ↗';
  controls.clear(); setPaused(false); updateMissionUI();
  const url = new URL(location.href); url.searchParams.set('seed', state.seed); history.replaceState(null, '', url);
  say('Una señal nueva. Mismo recorrido, otra distribución.'); notify('Nueva expedición preparada');
}
const controls = createControls(canvas, { onAction: interact, onFire: fire, onTarget: targetNext, onView: setView,
  onPause: () => { if (!$('helpDialog').open) setPaused(!paused); }, onReturn: returnToShip, onDeploy: deploy,
  onNavigate: navigate, onInspect: () => setInspect(!inspecting) });
$('missionButton').onclick = navigate; $('interactButton').onclick = interact; $('fireButton').onclick = fire;
$('targetButton').onclick = targetNext; $('astronautButton').onclick = deploy; $('shipButton').onclick = returnToShip;
$('viewButton').onclick = setView; $('inspectButton').onclick = () => setInspect(!inspecting);
$('zoomIn').onclick = () => { targetZoom = Math.max(.6, targetZoom - .15); };
$('zoomOut').onclick = () => { targetZoom = Math.min(1.6, targetZoom + .15); };
$('cameraButton').onclick = () => { orbit = 0; elevation = .3; targetZoom = 1; };
$('soundButton').onclick = toggleSound; $('pauseButton').onclick = () => setPaused(!paused); $('resumeButton').onclick = () => setPaused(false);
let wasPausedBeforeHelp = false;
$('helpButton').onclick = () => { wasPausedBeforeHelp = paused; setPaused(true); $('pauseOverlay').hidden = true; $('helpDialog').showModal(); };
$('closeHelp').onclick = () => $('helpDialog').close();
$('helpDialog').onclose = () => setPaused(wasPausedBeforeHelp);
$('restartButton').onclick = () => { wasPausedBeforeHelp = false; $('helpDialog').close(); resetExpedition(); };
function openFlightMenu() {
  if ($('helpDialog').open || flightMenuOpen) return;
  wasPausedBeforeMenu = paused; flightMenuOpen = true;
  setPaused(true); updateHUD(); $('flightMenu').showModal();
}
function finishFlightMenuClose() {
  if (!flightMenuOpen) return;
  flightMenuOpen = false; setPaused(wasPausedBeforeMenu); updateHUD();
}
function closeFlightMenu() {
  $('flightMenu').close(); finishFlightMenuClose();
}
function fromFlightMenu(action) { closeFlightMenu(); action(); updateHUD(); }
$('mobileMenuButton').onclick = openFlightMenu;
$('closeFlightMenu').onclick = closeFlightMenu;
$('flightMenu').addEventListener('close', finishFlightMenuClose);
$('mobileActionButton').onclick = () => {
  if (mobileAction.disabled) return;
  const actions = { navigate, return: returnToShip, deploy, interact, fire, restart: resetExpedition, inspect: () => setInspect(false) };
  actions[mobileAction.action]?.(); updateHUD();
};
$('mobileTargetButton').onclick = () => { targetNext(); updateHUD(); };
$('mobileGuideButton').onclick = () => fromFlightMenu(navigate);
$('mobileReturnButton').onclick = () => fromFlightMenu(returnToShip);
$('mobileDeployButton').onclick = () => fromFlightMenu(deploy);
$('mobileViewButton').onclick = () => fromFlightMenu(setView);
$('mobileQuickViewButton').onclick = () => { setView(); updateHUD(); };
$('mobileInspectButton').onclick = () => fromFlightMenu(() => setInspect(!inspecting));
$('mobileSoundButton').onclick = async () => { await toggleSound(); updateHUD(); };
$('mobileHelpButton').onclick = () => fromFlightMenu(() => $('helpButton').click());
$('mobileRestartButton').onclick = () => fromFlightMenu(resetExpedition);
$('mobileZoomIn').onclick = () => fromFlightMenu(() => $('zoomIn').click());
$('mobileZoomOut').onclick = () => fromFlightMenu(() => $('zoomOut').click());
$('mobileZoomReset').onclick = () => fromFlightMenu(() => $('cameraButton').click());
window.addEventListener('blur', () => { if (!$('helpDialog').open && !flightMenuOpen) setPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
canvas.addEventListener('wheel', event => { event.preventDefault(); if (!paused) targetZoom = THREE.MathUtils.clamp(targetZoom + event.deltaY * .0007, .6, 1.6); }, { passive: false });
canvas.addEventListener('pointerdown', event => pointerStart.set(event.clientX, event.clientY));
canvas.addEventListener('pointerup', event => {
  if (blocked() || combat.shot || pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 6) return;
  pointer.set(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(validTargets().map(target => target.object), true)[0];
  if (hit) { let object = hit.object; while (object && !object.userData.targetId) object = object.parent; if (object) selectedId = object.userData.targetId; }
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 900 ? 1.5 : 2)); renderer.setSize(innerWidth, innerHeight); presentation.resize();
});
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault(); setPaused(true); $('loading').hidden = false; $('loading').style.opacity = '1';
  $('loading').querySelector('p').textContent = 'Se interrumpió la conexión gráfica. Recargá la página para volver a explorar.';
});

function updateFlight(dt, input) {
  if (state.phase === 'transit') { updateTransit(dt); return; }
  direction.set(0, 0, 0);
  if (inspecting || time < assemblyUntil || state.phase === 'complete') { controlWasLocked = true; return; }
  if (controlWasLocked && flight.actor === 'ship') { orbit = flight.shipYaw; elevation = -flight.shipPitch; }
  controlWasLocked = false;
  const manual = input.x || input.y || input.z;
  if ((manual || input.brake) && !combat.shot && !flight.returning) { stopNavigation(); if (manual) scanning = false; }
  if (manual && !combat.shot) {
    if (flight.actor === 'ship') forward.set(0, 0, -1).applyQuaternion(flight.shipQuaternion);
    else { camera.getWorldDirection(forward); if (!visorActive()) forward.y = 0; forward.normalize(); }
    if (forward.lengthSq() < .1) forward.set(0, 0, -1);
    right.crossVectors(forward, up).normalize();
    direction.addScaledVector(right, input.x).addScaledVector(forward, -input.z).addScaledVector(up, input.y);
    if (direction.lengthSq() > 1) direction.normalize();
  }
  const goal = navigating && !flight.returning && !combat.shot ? objective() : null;
  let lookYaw = orbit, lookPitch = -elevation;
  if (combat.shot && selectedTarget() && flight.actor === 'ship') {
    temp.subVectors(selectedTarget().position, flight.shipPosition).normalize();
    lookYaw = Math.atan2(-temp.x, -temp.z); lookPitch = Math.asin(THREE.MathUtils.clamp(temp.y, -1, 1));
    orbit = lookYaw; elevation = -lookPitch;
  }
  flight.update(dt, direction, input.boost && !combat.shot && !scanning, {
    brake: input.brake, hold: !!combat.shot || scanning,
    lookYaw, lookPitch, navigationTarget: goal?.position, arrivalRadius: goal?.stop,
  });
  if (goal && flight.arrived) {
    navigating = false;
    if (flight.actor === 'ship') { orbit = flight.shipYaw; elevation = -flight.shipPitch; }
    say(state.phase === 'gem' && flight.actor === 'ship' ? 'Estamos cerca. Salí de la nave para recoger la gema.' : 'Llegamos. La siguiente acción está lista.');
  }
  if (flight.actor !== previousActor) {
    previousActor = flight.actor; controls.clear(); navigating = false;
    if (flight.actor === 'ship') {
      orbit = flight.shipYaw; elevation = -flight.shipPitch;
      notify('A bordo · Cable recogido'); say(state.phase === 'large' ? 'Cañón disponible. Seleccioná un núcleo y prepará el disparo.' : 'Al mando. Busquemos nuestro siguiente destino.'); play('ship_module_attach', .13);
    }
  }
  if (flight.tension > .9 && navigating && flight.velocity.length() < .25) { navigating = false; notify('Límite del cable · Volvé y acercá la nave'); }
  if (state.phase === 'return' && flight.actor === 'ship' && flight.position.distanceTo(world.gate.position) < 4) {
    if (mission.enterCorridor('ship')) { navigating = false; transitStart = time; transitEntry.copy(flight.shipPosition); firstPerson = false; controls.clear(); play('motion_liftoff', .25); say('Entramos al corredor. Preparando el acople.'); }
  }
}
function updateTransit(dt) {
  const age = time - transitStart;
  temp.copy(state.layout.exit);
  flight.shipPosition.lerpVectors(transitEntry, temp, Math.min(1, age / 5));
  flight.updateHeading(dt, { lookYaw: 0, lookPitch: 0 });
  flight.velocity.set(0, 0, -4.8);
  if (age >= 5) {
    mission.finishTransit(); combat.reset(); selectedId = null; navigating = false; scanning = false; scanProgress = 0;
    if (state.phase === 'complete') {
      flight.velocity.set(0, 0, 0); notify('Tres gemas. Una nave completa. Expedición terminada.', 8); say('Llegamos juntos. Podés inspeccionar la nave o iniciar otra expedición.');
    } else {
      // The next sector begins aboard after crossing its entry corridor.
      world.load(state.layout); flight.reset({ aboard: true }); flight.setStage(state.moduleStage); previousActor = 'ship';
      orbit = -.9; elevation = .28;
      pendingModule = state.moduleStage; attachAt = time + .65; assemblyUntil = time + 3.4; arrivalVeilUntil = time + .6;
      // Reframe on the new sector while the corridor veil is opaque, before revealing the acople.
      cameraTarget.copy(flight.shipPosition).add(new THREE.Vector3(0, .3, 0));
      const fit = Math.max(1, .78 / camera.aspect);
      camera.position.set(Math.sin(orbit) * Math.cos(.48), Math.sin(.48), Math.cos(orbit) * Math.cos(.48)).multiplyScalar((shipFrameRadius(state.moduleStage) * 2.8 + 5) * zoom * fit).add(cameraTarget);
      camera.lookAt(cameraTarget); health = Math.min(100, health + 25);
      notify(state.moduleStage === 2 ? 'HÁBITAT ACOPLADO · Entramos en Vesper' : 'PROPULSIÓN ACOPLADA · Entramos en Umbra', 5);
      say('Nuevo módulo conectado. Salí cuando estés listo para explorar el sector.');
    }
  }
}
function updateScan(dt) {
  if (!scanning) { scanProgress = 0; return; }
  if (flight.actor !== 'astronaut' || flight.returning || flight.position.distanceTo(world.beacon.position) > 3.8 || state.phase !== 'scan') { scanning = false; scanProgress = 0; return; }
  scanProgress = Math.min(1, scanProgress + dt / 2.2);
  if (scanProgress === 1) {
    mission.scan(); scanning = false; play('ui_mission_accept', .25);
    triggerBurst(world.beacon.position, 'scan'); notify('Señal decodificada · Tres asteroides localizados');
    say('Tres objetivos pequeños. Seleccioná uno, acercate y dispará con el astronauta.');
  }
}
function updateCombat(dt) {
  const shot = combat.shot;
  projectile.visible = false;
  if (shot) {
    const target = world.targets.find(item => item.id === shot.id);
    if (target && shot.elapsed >= shot.lockTime) {
      const progress = Math.min(1, (shot.elapsed - shot.lockTime) / shot.travelTime);
      temp.copy(target.position);
      if (!shot.hit) temp.add(new THREE.Vector3(target.radius + 2, 1, 0));
      projectile.position.lerpVectors(new THREE.Vector3().copy(shot.origin), temp, progress);
      projectile.scale.setScalar(shot.actor === 'ship' ? 2.8 : 1);
      projectile.visible = true;
    }
    if (shot.elapsed < shot.lockTime && shot.elapsed + dt >= shot.lockTime) {
      const origin = shot.actor === 'ship' ? shipPoint('muzzle', flight.shipPosition, flight.shipQuaternion) : flight.position.clone().add(new THREE.Vector3(.25, 1.05, 0));
      Object.assign(shot.origin, { x: origin.x, y: origin.y, z: origin.z });
      play('motion_liftoff', .15);
    }
  }
  const result = combat.update(dt);
  if (result) {
    const target = world.targets.find(item => item.id === result.id);
    if (result.hit && mission.hit(result.id, result.actor)) {
      if (target) triggerBurst(target.position, result.actor === 'ship' ? 'ship' : 'eva');
      play('reward_unlock_sparkle', .18); notify(result.actor === 'ship' ? 'Núcleo destruido' : 'Asteroide destruido', 2);
    } else { notify('Disparo fallido · Acercate para mejorar la probabilidad', 3); say('Podemos volver a intentarlo. Acercarnos mejora el disparo.'); }
  }
}
function updateHazards() {
  hazardWarning = null;
  if (inspecting || state.phase === 'transit' || state.phase === 'complete' || time < assemblyUntil) return;
  const spheres = flight.actor === 'ship' ? shipCollisionSpheres(state.moduleStage) : [{ center: { x: 0, y: EVA_CENTER_Y, z: 0 }, radius: EVA_RADIUS }, { center: { x: 0, y: 1.58, z: 0 }, radius: .36 }];
  for (const hazard of world.hazards) {
    for (const sphere of spheres) {
      colliderEnd.copy(sphere.center);
      colliderStart.copy(sphere.center);
      if (flight.actor === 'ship') {
        colliderEnd.applyQuaternion(flight.shipQuaternion);
        colliderStart.applyQuaternion(previousQuaternion);
      }
      colliderEnd.add(flight.position);
      colliderStart.add(previousPosition);
      if (collisionActor !== flight.actor) colliderStart.copy(colliderEnd);
      const radius = hazard.radius + sphere.radius;
      temp.subVectors(hazard.position, colliderEnd);
      relativeVelocity.copy(hazard.velocity).sub(flight.velocity);
      const approach = closestApproach(temp, relativeVelocity, 2.4);
      if (approach.distance < radius + 1.5 && approach.time > .05 && (!hazardWarning || approach.time < hazardWarning.time)) hazardWarning = { time: approach.time, position: hazard.position };
      const contact = sweptSphereContact(colliderStart, colliderEnd, hazard.previousPosition, hazard.position, radius);
      if (!contact) continue;
      flight.applyImpact(contact.normal, contact.depth, hazard.velocity);
      stopNavigation(); scanning = false;
      if (time < invulnerableUntil) break;
      const impact = Math.round(THREE.MathUtils.clamp(12 + relativeVelocity.length() * 2.5, 15, 38));
      health = Math.max(0, health - impact); invulnerableUntil = time + 2; damageUntil = time + .4;
      notify(`Impacto · Integridad ${health}%`, 2);
      if (health === 0) {
        health = 100; invulnerableUntil = time + 12;
        if (flight.actor === 'astronaut') flight.returnToShip();
        else flight.shipPosition.add(new THREE.Vector3(0, 4, 0));
        notify('Rescate de emergencia · Integridad restablecida', 5); say('Te recupero. Conservamos los objetivos completados.');
      }
      break;
    }
  }
}
function updateActors(dt, input) {
  if (pendingModule && time >= attachAt) { ship.setStage(pendingModule, !reducedMotion); pendingModule = 0; play('ship_module_attach', .3); }
  ship.group.position.copy(flight.shipPosition); ship.group.quaternion.copy(flight.shipQuaternion);
  astronaut.group.position.copy(flight.astronautPosition);
  if (flight.actor === 'astronaut') {
    if (combat.shot && selectedTarget()) temp.subVectors(selectedTarget().position, flight.position);
    else if (visorActive()) temp.set(-Math.sin(orbit), 0, -Math.cos(orbit));
    else temp.copy(flight.velocity);
    if (temp.lengthSq() > .05) {
      const heading = Math.atan2(-temp.x, -temp.z);
      astronaut.group.rotation.y += Math.atan2(Math.sin(heading - astronaut.group.rotation.y), Math.cos(heading - astronaut.group.rotation.y)) * Math.min(1, dt * 5);
    }
  }
  const frozen = inspecting || time < assemblyUntil || state.phase === 'complete';
  ship.update(time, { thrust: flight.actor === 'ship' && !frozen ? flight.thrust : 0, braking: !frozen && flight.actor === 'ship' && flight.braking, boost: input.boost });
  astronaut.update(time, { thrust: flight.actor === 'astronaut' && !frozen ? flight.thrust : 0, braking: !frozen && flight.braking, boost: input.boost });
  astronaut.group.visible = flight.actor === 'astronaut' && !visorActive();
  ship.group.visible = !(flight.actor === 'ship' && visorActive());
  cockpit.group.visible = flight.actor === 'ship' && visorActive();
  cockpit.update(time, { speed: flight.velocity.length(), braking: flight.braking });
  temp.copy(flight.position).add(new THREE.Vector3(1.8, 1.8, .5));
  companion.group.position.lerp(temp, 1 - Math.exp(-dt * 4));
  companion.group.rotation.y = flight.actor === 'ship' ? flight.shipYaw : astronaut.group.rotation.y;
  companion.group.visible = !(flight.actor === 'ship' && visorActive());
  companion.update(time, { moving: flight.velocity.length() / 8 });
  tether.visible = flight.actor === 'astronaut';
  if (tether.visible) {
    const a = flight.tetherPosition, b = flight.astronautPosition;
    for (let i = 0; i < 25; i++) {
      const t = i / 24; const slack = Math.sin(t * Math.PI) * (1 - flight.tension) * Math.min(1.2, flight.tetherLength * .08);
      tetherPositions[i * 3] = a.x + (b.x - a.x) * t;
      tetherPositions[i * 3 + 1] = a.y + (b.y + EVA_CENTER_Y - a.y) * t - slack;
      tetherPositions[i * 3 + 2] = a.z + (b.z - a.z) * t + (reducedMotion ? 0 : Math.sin(time * 1.2 + t * 5) * .035 * Math.sin(t * Math.PI));
    }
    tetherGeometry.attributes.position.needsUpdate = true;
    tether.material.color.setHex(flight.tension > .8 ? 0xffad74 : 0x9fe5db);
  }
}
function updateCamera(dt) {
  zoom = THREE.MathUtils.damp(zoom, targetZoom, 6, dt);
  const focusShip = forcedExterior();
  const focus = focusShip ? flight.shipPosition : flight.position;
  const smoothing = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
  cameraTarget.copy(focus).add(new THREE.Vector3(0, flight.actor === 'astronaut' && !focusShip ? .9 : .3, 0));
  if (visorActive()) {
    if (flight.actor === 'ship') {
      shipPoint('eye', flight.shipPosition, flight.shipQuaternion, camera.position);
      camera.quaternion.copy(flight.shipQuaternion);
    } else {
      camera.position.copy(flight.astronautPosition).add(new THREE.Vector3(0, 1.55, 0));
      if (combat.shot && selectedTarget()) lookTarget.copy(selectedTarget().position);
      else lookTarget.copy(camera.position).add(new THREE.Vector3(-Math.sin(orbit) * Math.cos(elevation), -Math.sin(elevation), -Math.cos(orbit) * Math.cos(elevation)).multiplyScalar(20));
      camera.lookAt(lookTarget);
    }
  } else {
    const portrait = Math.max(1, .78 / camera.aspect);
    const distance = (focusShip || flight.actor === 'ship' ? shipFrameRadius(state.moduleStage) * 2.8 + 5 : 18) * zoom * portrait;
    const angle = focusShip ? .42 : flight.actor === 'ship' ? .27 - flight.shipPitch * .45 : elevation;
    const heading = flight.actor === 'ship' && !focusShip ? flight.shipYaw : orbit;
    cameraPosition.set(Math.sin(heading) * Math.cos(angle), Math.sin(angle), Math.cos(heading) * Math.cos(angle)).multiplyScalar(distance).add(cameraTarget);
    camera.position.lerp(cameraPosition, smoothing); camera.lookAt(cameraTarget);
  }
}
function updateMissionUI() {
  const content = {
    scan: ['Todo empieza <br/>con una señal.', 'Encontrá la baliza y escaneala con el astronauta. El cable mantiene tu conexión con la nave.', 'Guiar a la baliza'],
    small: ['Abrir un camino.', 'Destruí tres asteroides con el astronauta. Seleccioná un objetivo y acercate para mejorar el disparo.', 'Acercar al objetivo'],
    large: ['La fuerza <br/>de tu nave.', 'Volvé y abordá para activar el cañón. Los núcleos grandes guardan la energía del sector.', flight.actor === 'astronaut' ? 'Volver y abordar' : 'Acercar al núcleo'],
    gem: ['Una conexión <br/>más.', 'Recuperá la gema con el astronauta. Si está lejos, acercá primero la nave y después salí.', flight.actor === 'ship' && flight.position.distanceTo(world.gem.position) < 12 ? 'Salir y buscar la gema' : 'Guiar hacia la gema'],
    return: ['El siguiente <br/>horizonte.', 'Volvé a la nave y atravesá el corredor. El próximo módulo se acopla al cambiar de sector.', flight.actor === 'astronaut' ? 'Volver y abordar' : 'Entrar al corredor'],
    transit: ['Pieza por pieza.', 'Atravesando el corredor. Preparando la nave para el próximo horizonte.', 'En tránsito…'],
    complete: ['Lo construimos <br/>juntos.', 'Tres sectores recorridos, tres gemas recuperadas. Tu nave está completa.', 'Nueva expedición'],
  }[state.phase];
  $('missionTitle').innerHTML = content[0]; $('missionDescription').textContent = content[1];
  $('missionButton').textContent = navigating ? 'Detener guía · Vuelo libre' : flight.returning ? 'Regresando a la nave…' : content[2] + ' ↗';
  $('missionButton').disabled = paused || flight.returning || state.phase === 'transit' || time < assemblyUntil;
  $('biomeName').textContent = `${String(state.sector + 1).padStart(2, '0')} / ${state.layout.name.toUpperCase()}`;
  $('sectorNumber').textContent = `SECTOR ${String(state.sector + 1).padStart(2, '0')}`;
  $('gemCount').textContent = String(state.gems).padStart(2, '0');
  $('gemIcons').textContent = Array.from({ length: 3 }, (_, i) => i < state.gems ? '◆' : '◇').join(' ');
  $('assemblyPercent').textContent = `${Math.round(state.moduleStage / 3 * 100)}%`; $('assemblyBar').style.width = `${state.moduleStage / 3 * 100}%`;
  document.querySelectorAll('.module-list li').forEach(item => { const active = Number(item.dataset.stage) <= state.moduleStage; item.classList.toggle('unlocked', active); item.querySelector('b').textContent = active ? '✓' : '◇'; });
  const phases = ['scan', 'small', 'large', 'gem', 'return', 'transit', 'complete'];
  document.querySelectorAll('[data-phase]').forEach(item => { item.classList.toggle('active', item.dataset.phase === state.phase); item.classList.toggle('done', phases.indexOf(item.dataset.phase) < phases.indexOf(state.phase)); });
  $('seedReadout').textContent = `RUTA ${state.seed}`;
}
function updateMobileHUD({ distance, actionDistance, chance, done, total }) {
  const assemblyLocked = time < assemblyUntil;
  mobileAction = inspecting && !paused
    ? { action: 'inspect', label: 'Volver a explorar', disabled: false }
    : getMobileAction({ phase: state.phase, actor: flight.actor, navigating, returning: flight.returning,
      scanning, shotActive: !!combat.shot, cooldown: combat.cooldown, blocked: blocked(), assemblyLocked,
      actionDistance, targetDistance: distance, weaponRange: WEAPON_RANGE[flight.actor], chance });
  const titles = {
    scan: 'Escaneá la baliza', small: 'Destruí los asteroides',
    large: flight.actor === 'astronaut' ? 'Volvé a la nave' : 'Despejá los núcleos',
    gem: 'Recuperá la gema', return: flight.actor === 'astronaut' ? 'Volvé a la nave' : 'Atravesá el corredor',
    transit: 'Viajando al próximo sector', complete: 'Expedición completa',
  };
  $('mobileSector').textContent = `${state.layout.name.split(' · ')[0]} · ${String(state.sector + 1).padStart(2, '0')} / 03`;
  $('mobileObjective').textContent = inspecting ? 'Inspección de la nave' : assemblyLocked ? 'Ensamblando tu nave' : titles[state.phase];
  $('mobileProgress').textContent = total && !inspecting ? `${done} / ${total}` : '';
  $('mobileHealth').textContent = `♡ ${health}%`;
  $('mobileHealth').setAttribute('aria-label', `Integridad: ${health}%`);
  $('mobileHealth').classList.toggle('danger', health <= 50);
  $('mobileCable').textContent = flight.actor === 'astronaut' ? `Cable ${Math.round(flight.tetherLength)} / 26 m` : 'A bordo';
  $('mobileCable').classList.toggle('danger', flight.tension > .8);
  $('mobileActionLabel').textContent = mobileAction.label + (mobileAction.action === 'fire' && !mobileAction.disabled ? ` · ${Math.round(chance * 100)}%` : '');
  $('mobileActionButton').disabled = mobileAction.disabled;
  $('mobileActionButton').title = mobileAction.hint || '';
  $('mobileActionButton').dataset.action = mobileAction.action;
  $('mobileTargetButton').hidden = mobileAction.secondary !== 'target';
  $('mobileTargetButton').disabled = blocked() || !!combat.shot;
  const progress = scanning ? scanProgress : combat.shot ? Math.min(1, combat.shot.elapsed / combat.shot.lockTime) : 0;
  $('mobileActionProgress').hidden = !scanning && !combat.shot;
  $('mobileActionProgress').firstElementChild.style.width = `${progress * 100}%`;
  $('mobileActionProgress').setAttribute('aria-valuenow', String(Math.round(progress * 100)));

  // Opening the menu pauses time. Availability reflects the state after closing it.
  const locked = assemblyLocked || state.phase === 'transit';
  const actorLocked = locked || inspecting || !!combat.shot || state.phase === 'complete';
  $('mobileMenuObjective').textContent = $('mobileObjective').textContent;
  $('mobileMenuDescription').textContent = $('missionDescription').textContent;
  $('mobileMenuGems').textContent = `◇ ${state.gems} / 3 gemas`;
  $('mobileMenuAssembly').textContent = `Nave ${Math.round(state.moduleStage / 3 * 100)}%`;
  $('mobileMenuCompanion').textContent = `Nóma · ${$('companionMessage').textContent}`;
  $('mobileGuideButton').textContent = navigating ? 'Detener guía' : state.phase === 'complete' ? 'Nueva expedición' : 'Guiar al objetivo';
  $('mobileGuideButton').disabled = locked || flight.returning || !!combat.shot;
  $('mobileReturnButton').disabled = actorLocked || flight.actor === 'ship' || flight.returning;
  $('mobileDeployButton').disabled = actorLocked || flight.actor === 'astronaut';
  $('mobileViewButton').textContent = visorActive() ? 'Pasar a vista exterior' : flight.actor === 'ship' ? 'Ver desde la cabina' : 'Ver desde el visor';
  $('mobileViewButton').disabled = locked || state.phase === 'complete';
  $('mobileQuickViewLabel').textContent = visorActive() ? 'Exterior' : flight.actor === 'ship' ? 'Cabina' : 'Visor';
  $('mobileQuickViewButton').setAttribute('aria-label', visorActive() ? 'Volver a la vista exterior' : flight.actor === 'ship' ? 'Ver desde la cabina de la nave' : 'Ver desde el visor del astronauta');
  $('mobileQuickViewButton').setAttribute('aria-pressed', String(visorActive()));
  $('mobileQuickViewButton').disabled = paused || locked || state.phase === 'complete';
  $('mobileInspectButton').textContent = inspecting ? 'Volver a explorar' : 'Inspeccionar nave';
  $('mobileInspectButton').disabled = !!combat.shot || locked;
  $('mobileSoundButton').textContent = soundEnabled ? 'Silenciar sonido' : 'Activar sonido';
  $('mobileSoundButton').setAttribute('aria-pressed', String(soundEnabled));
}
function updateHUD() {
  updateMissionUI();
  const target = selectedTarget(), obj = objective();
  const distance = target ? flight.position.distanceTo(target.position) : Infinity;
  const correctWeapon = target && flight.actor === (target.kind === 'small' ? 'astronaut' : 'ship');
  const chance = target ? aimChance({ actor: flight.actor, distance, sector: state.sector, speed: flight.velocity.length() }) : 0;
  $('fireButton').disabled = blocked() || flight.returning || !correctWeapon || distance > WEAPON_RANGE[flight.actor] || !!combat.shot || combat.cooldown > 0;
  $('targetButton').disabled = blocked() || !!combat.shot || !validTargets().length;
  $('astronautButton').disabled = blocked() || flight.actor === 'astronaut' || !!combat.shot || state.phase === 'complete';
  $('shipButton').disabled = blocked() || flight.actor === 'ship' || flight.returning || !!combat.shot || state.phase === 'complete';
  $('astronautButton').setAttribute('aria-pressed', String(flight.actor === 'astronaut')); $('shipButton').setAttribute('aria-pressed', String(flight.actor === 'ship'));
  const actionDistance = state.phase === 'scan' ? flight.position.distanceTo(world.beacon.position) : flight.position.distanceTo(world.gem.position);
  $('interactButton').disabled = blocked() || flight.returning || !!combat.shot || flight.actor !== 'astronaut' || !['scan', 'gem'].includes(state.phase) || actionDistance > (state.phase === 'scan' ? 3.8 : 3);
  $('interactButton').querySelector('span').textContent = state.phase === 'scan' ? scanning ? 'Escaneando…' : 'Escanear' : 'Recoger gema';
  $('scanTrack').firstElementChild.style.width = `${scanning ? scanProgress * 100 : combat.shot ? Math.min(100, combat.shot.elapsed / combat.shot.lockTime * 100) : 0}%`;
  const total = ['small', 'large'].includes(state.phase) ? state.layout[state.phase].length : 0;
  const done = total ? state.layout[state.phase].filter(item => state.destroyed.includes(item.id)).length : 0;
  updateMobileHUD({ distance, actionDistance, chance, done, total });
  $('targetReadout').textContent = combat.shot ? `${combat.shot.phase === 'lock' ? 'ESTABILIZANDO' : 'PROYECTIL EN VUELO'} · ${combat.shot.actor === 'ship' ? 'CAÑÓN' : 'EVA'}` : target ? `${done}/${total} · ${Math.round(distance)} m · ${correctWeapon ? `${Math.round(chance * 100)}% ACIERTO${distance > WEAPON_RANGE[flight.actor] ? ' · FUERA DE ALCANCE' : ''}` : state.phase === 'large' ? 'REQUIERE NAVE' : 'REQUIERE ASTRONAUTA'}` : state.phase === 'scan' ? 'BALIZA → ESCANEO → TRES OBJETIVOS' : state.phase === 'complete' ? `EXPEDICIÓN COMPLETA · ${state.gems} GEMAS` : state.phase === 'return' ? 'GEMA A BORDO → CORREDOR' : 'EXPLORACIÓN EN TRES DIMENSIONES';
  $('healthValue').textContent = `${health}%`; $('healthBar').style.width = `${health}%`;
  $('healthBar').parentElement.parentElement.classList.toggle('danger', health <= 50);
  $('cableTitle').textContent = flight.actor === 'astronaut' ? 'CABLE' : 'PILOTO';
  $('cableValue').textContent = flight.actor === 'astronaut' ? `${Math.round(flight.tetherLength)} / 26 m` : 'A BORDO';
  $('cableBar').style.width = `${flight.actor === 'astronaut' ? flight.tetherLength / 26 * 100 : 100}%`;
  $('cableBar').parentElement.parentElement.classList.toggle('danger', flight.tension > .8);
  $('motionReadout').textContent = flight.braking ? 'ESTABILIZANDO' : flight.thrust.length() > .12 ? 'PROPULSORES' : flight.velocity.length() > .15 ? 'DERIVA' : 'ESTABLE';
  $('brakeButton').classList.toggle('active', flight.braking);
  $('hazardWarning').hidden = !hazardWarning;
  if (hazardWarning) {
    projected.copy(hazardWarning.position).project(camera);
    const arrow = projected.z > 1 ? '↶' : projected.x < -.25 ? '←' : projected.x > .25 ? '→' : projected.y > .25 ? '↑' : '↓';
    $('hazardWarning').textContent = `${arrow} TRAYECTORIA DE IMPACTO · ${hazardWarning.time.toFixed(1)} s`;
  }
  $('flightReadout').textContent = `ALT ${flight.position.y >= 0 ? '+' : ''}${flight.position.y.toFixed(1)} m · ${flight.velocity.length().toFixed(1)} m/s`;
  $('missionHint').textContent = flight.tension > .8 ? 'Cable cerca del límite. Acercá la nave para seguir.' : navigating ? 'Guía activa. WASD o controles táctiles para cancelar.' : 'Soltá para derivar · Mantené Q para estabilizar.';
  $('viewButton').disabled = paused || time < assemblyUntil || state.phase === 'transit' || state.phase === 'complete';
  $('viewButton').textContent = visorActive() ? `Vista: ${flight.actor === 'ship' ? 'cabina' : 'visor'}` : 'Vista: exterior'; $('viewButton').setAttribute('aria-pressed', String(visorActive()));
  document.body.classList.toggle('first-person', visorActive()); document.body.classList.toggle('aiming', !!combat.shot); document.body.classList.toggle('damage', time < damageUntil);
  $('cockpitFrame').hidden = !(visorActive() && flight.actor === 'ship');
  $('lockLabel').textContent = combat.shot ? combat.shot.phase === 'lock' ? 'FIJANDO OBJETIVO' : 'DISPARO' : '';
  const label = $('objectiveLabel');
  label.hidden = !obj || inspecting || visorActive() || state.phase === 'transit';
  if (obj && !label.hidden) {
    projected.copy(obj.position).add(new THREE.Vector3(0, 2, 0)).project(camera);
    const behind = projected.z > 1 || projected.z < -1;
    const rawX = (projected.x + 1) * innerWidth / 2, rawY = (1 - projected.y) * innerHeight / 2;
    const x = THREE.MathUtils.clamp(behind ? innerWidth / 2 : rawX, 90, innerWidth - 90);
    const minY = compactHUD.matches ? innerHeight < 500 ? 85 : 115 : 95;
    const maxY = Math.max(minY + 20, innerHeight - 190);
    const y = THREE.MathUtils.clamp(behind ? (minY + maxY) / 2 : rawY, minY, maxY);
    label.style.left = `${x}px`; label.style.top = `${y}px`;
    label.textContent = `${behind ? '↶ ' : ''}${obj.label}`;
  }
  // Read-only telemetry supports diagnostics without exposing mutation or skip controls.
  canvas.dataset.phase = state.phase; canvas.dataset.actor = flight.actor; canvas.dataset.sector = String(state.sector);
  canvas.dataset.position = `${flight.position.x.toFixed(2)},${flight.position.y.toFixed(2)},${flight.position.z.toFixed(2)}`;
  canvas.dataset.speed = flight.velocity.length().toFixed(3); canvas.dataset.thrust = flight.thrust.length().toFixed(3);
  canvas.dataset.heading = `${flight.shipYaw.toFixed(3)},${flight.shipPitch.toFixed(3)}`;
  canvas.dataset.tether = flight.tetherLength.toFixed(2); canvas.dataset.health = String(health);
}
function handlePhaseChange() {
  if (state.phase === previousPhase) return;
  previousPhase = state.phase; navigating = false; selectedId = null;
  if (state.phase === 'large') { say('Campo despejado. Volvé a la nave: estos núcleos requieren su cañón.'); notify('Núcleos revelados · Volvé y abordá la nave', 5); }
  if (state.phase === 'gem') { say('La gema está libre. Acercá la nave y salí para recuperarla.'); notify('Energía liberada · Gema localizada', 5); }
  updateMissionUI();
}
ship.setStage(1, false); camera.position.set(12, 9, 27); updateMissionUI();
function animate(now) {
  const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now;
  const input = controls.sample();
  if (!paused) {
    time += dt; ensureTarget();
    if (!combat.shot) { orbit -= input.lookX * .005; elevation = THREE.MathUtils.clamp(elevation + input.lookY * .004, -1.1, 1.1); }
    previousPosition.copy(flight.position); previousQuaternion.copy(flight.shipQuaternion); collisionActor = flight.actor;
    updateFlight(dt, input); updateScan(dt); updateCombat(dt); handlePhaseChange(); ensureTarget();
    world.sync(state, time, { reducedMotion }); world.gate.visible = !inspecting; updateHazards(); updateActors(dt, input); updateCamera(dt, input);
    const target = selectedTarget(); selection.visible = !!target && !inspecting;
    if (target) { selection.position.copy(target.position); selection.quaternion.copy(camera.quaternion); selection.scale.setScalar(target.radius * 1.45); }
    effects.update(time, camera, { reducedMotion });
    if (time > toastUntil) $('toast').classList.remove('visible');
    if (audioReady && soundEnabled) {
      const engineState = flight.thrust.length() > .12 ? input.boost ? 'boost' : 'move' : 'idle';
      if (audio.currentEngineState !== engineState) audio.setEngineState(engineState);
    }
  }
  hudTimer += dt;
  if (hudTimer > .1) { updateHUD(); hudTimer = 0; }
  const veil = state.phase === 'transit' && state.sector < 2 ? THREE.MathUtils.clamp((time - transitStart - 4.4) / .6, 0, 1) : THREE.MathUtils.clamp((arrivalVeilUntil - time) / .6, 0, 1);
  $('transitionVeil').style.opacity = String(veil);
  sun.color.setHex(world.lighting.sun); rim.color.setHex(world.lighting.fill);
  renderer.toneMappingExposure = world.lighting.exposure;
  presentation.render(scene, camera, world);
  if (++frames === 2) { $('loading').style.opacity = '0'; setTimeout(() => { $('loading').hidden = true; }, reducedMotion ? 0 : 550); }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
