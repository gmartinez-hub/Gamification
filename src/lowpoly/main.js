import * as THREE from '../../vendor/three.module.js';
import { encounterModelDirectory, usesMobileAssets, loadModelSet } from './asset-loading.js';
import { loadActorAssets, createAssetShip, createAssetAstronaut, createAssetCompanion, createAssetVisor } from './asset-actors.js';
import { createSectorWorld, loadWorldAssets } from './sector-world.js';
import { createExpedition } from './expedition.js';
import { EVA_CENTER_Y, EVA_RADIUS } from './flight.js';
import { createControls } from './controls.js';
import { getMobileAction } from './mobile-actions.js';
import { createVehicles } from './vehicles.js';
import { createBallistics, assistAim, aimConvergence } from './ballistics.js';
import { createEncounters } from './encounters.js';
import { createBikeActor } from './bike-actor.js';
import { createAlienActor } from './enemy-actors.js';
import { createEnemyShip } from './enemy-ship.js';
import { createShotVisuals } from './shot-visuals.js';
const WEAPON_RANGE = {astronaut:42,bike:42,ship:85};
import { shipPoint, shipCollisionSpheres, shipFrameRadius } from './spatial.js';
import { sweptSphereContact, closestApproach } from './hazards.js';
import { createPresentation, createReflectionEnvironment } from './presentation.js';
import { createEffects } from './effects.js';
import { loadMissionAssets, createMissionAssetTemplates } from './mission-assets.js';
import { createCabinController } from './cabin-controller.js';
import { createWalkableCabin } from './cabin.js';
import { createInteractionArm, poseHeldLeftHand } from './interaction-arm.js';
import { createPresentationClock, createGemSequence } from './presentation-clock.js';
import { createDestruction } from './destruction.js';
import { createExpeditionAudio } from './audio.js';
import { createCheckpointStore, DEFAULT_SETTINGS } from './checkpoint.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileGPU = usesMobileAssets({ coarsePointer: matchMedia('(pointer:coarse)').matches, userAgent: navigator.userAgent, platform: navigator.platform, maxTouchPoints: navigator.maxTouchPoints });
canvas.dataset.assetProfile = mobileGPU ? 'mobile' : 'desktop';
const renderPixelRatio = () => Math.min(devicePixelRatio, 720 / Math.min(innerWidth, innerHeight), 1280 / Math.max(innerWidth, innerHeight));
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobileGPU, powerPreference: 'high-performance' }); }
catch (error) {
  $('loading').classList.add('error');
  $('loading').querySelector('p').textContent = 'No pudimos iniciar el mundo 3D. Probá con WebGL 2 y aceleración gráfica activada.';
  throw error;
}
renderer.setPixelRatio(renderPixelRatio());
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
const scene = new THREE.Scene();
scene.background = null;
const reflection = createReflectionEnvironment(renderer);
scene.environment = reflection.texture; scene.environmentIntensity = .32;
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, .1, 600);
const ambient = new THREE.HemisphereLight(0xd4e5f2, 0x404252, .95); scene.add(ambient);
const cameraFill = new THREE.DirectionalLight(0xc9deef, .45); scene.add(cameraFill, cameraFill.target);
const sun = new THREE.DirectionalLight(0xffe2bb, 3);
sun.position.set(-30, 45, 20); scene.add(sun);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(mobileGPU ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 150 });
sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -.0002; sun.shadow.normalBias = .08;
scene.add(sun.target);
const rim = new THREE.DirectionalLight(0x6bbfcf, 1);
rim.position.set(15, 9, -20); scene.add(rim);
const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
const seed = seedParam ? /^\d+$/.test(seedParam) ? Number(seedParam) : seedParam : 712069;
const mission = createExpedition(seed);
const { state } = mission;
const checkpoint = createCheckpointStore();
const saved = checkpoint.load(seedParam ? { seed: state.seed } : {});
const settings = { ...DEFAULT_SETTINGS, ...saved?.settings };
document.body.dataset.touchLayout = settings.touchLayout;
const momentClock = createPresentationClock(), gemSequence = createGemSequence();
if (saved) mission.restoreCheckpoint(saved);
let actorAssets;
try { actorAssets = await loadActorAssets((done,total) => { $('loading').querySelector('p').textContent = `Preparando modelos y texturas · ${done} / ${total}`; }, { mobile: mobileGPU, only: [...['capsula','habitat','propulsion'].slice(0,state.moduleStage), 'astronauta-armado','robot', ...(settings.firstPerson && !saved ? ['astronauta-brazos-armado'] : [])] }); }
catch(error) { $('loading').classList.add('error'); $('loading').querySelector('p').textContent = 'No se pudo completar la descarga de los modelos. Recargá para volver a intentar.'; throw error; }
const ship = createAssetShip(actorAssets), astronaut = createAssetAstronaut(actorAssets), companion = createAssetCompanion(actorAssets);
scene.add(ship.group, astronaut.group, companion.group, camera);
$('loading').querySelector('p').textContent='Preparando la moto y su piloto…';
const bikeAssets=await loadModelSet([['bike','bike'],['riderClips','bike-rider']],{mobile:mobileGPU,directory:encounterModelDirectory(mobileGPU)});
const bike=createBikeActor(bikeAssets,actorAssets['astronauta-armado']);scene.add(bike.group);
const cabinController = createCabinController({aboard:!!saved&&saved.shipDiscovered!==false});
const cabinRoot = new THREE.Group(); scene.add(cabinRoot);
let cabin = null, visor = actorAssets['astronauta-brazos-armado'] ? createAssetVisor(actorAssets) : null;
if (visor) camera.add(visor.group);
const interactionArm = createInteractionArm(actorAssets); camera.add(interactionArm.group);
let viewLoad = null, viewRetryAt = 0;
const eventLight = new THREE.PointLight(0x7deaff, 0, 26, 2); scene.add(eventLight);
let eventLightUntil = 0;
const presentation = createPresentation(renderer);
const flight = createVehicles();
if (saved) flight.reset({ aboard: saved.shipDiscovered!==false, shipDiscovered:saved.shipDiscovered!==false });
flight.setStage(state.moduleStage);
const ballistics=createBallistics({capacity:48});
const combat={cooldown:0,shot:null,reset(){this.cooldown=0;ballistics.reset();pendingShot=null;},chanceFor(){return 1;}};
const encounters=createEncounters({seed:state.seed,sector:state.sector,completedIds:state.destroyed});
const enemyFiles={alien:'alien',alienShip:'alien-ship'};
const enemyAssets={},enemyLoads=new Map(),enemyRetryAt=new Map();
const enemyActors=new Map();
async function prepareEnemy(kind){
  if(!enemyFiles[kind]||enemyAssets[kind])return !!enemyAssets[kind];
  if(enemyLoads.has(kind))return enemyLoads.get(kind);
  if(performance.now()<(enemyRetryAt.get(kind)||0))return false;
  const load=loadModelSet([[kind,enemyFiles[kind]]],{mobile:mobileGPU,directory:encounterModelDirectory(mobileGPU)})
    .then(records=>{Object.assign(enemyAssets,records);return true;})
    .catch(error=>{enemyRetryAt.set(kind,performance.now()+5000);console.warn(`${kind} asset pending; will retry`,error);return false;})
    .finally(()=>enemyLoads.delete(kind));
  enemyLoads.set(kind,load);return load;
}
function clearEnemies(){for(const actor of enemyActors.values())actor.dispose();enemyActors.clear();}
function syncEnemyActors(dt){
  const live=new Set(encounters.entities.map(e=>e.id));
  for(const[id,actor]of enemyActors)if(!live.has(id)){actor.dispose();enemyActors.delete(id);}
  for(const entity of encounters.entities){
    let actor=enemyActors.get(entity.id);
    if(!actor&&!enemyAssets[entity.kind]){void prepareEnemy(entity.kind);continue;}
    if(!actor){
      actor=entity.kind==='alien'?createAlienActor(enemyAssets.alien):createEnemyShip(enemyAssets.alienShip);enemyActors.set(entity.id,actor);scene.add(actor.group);
      if(entity.kind==='alien')actor.chargeRocks=[actor.clawLeft,actor.clawRight].map(socket=>{const rock=world.createRockProjectile(.28);socket.add(rock);rock.visible=false;return rock;});
    }
    if(!actor)continue;
    actor.group.position.copy(entity.position);
    actor.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),new THREE.Vector3().copy(entity.forward).normalize());
    actor.update(worldTime,entity,{dt,reducedMotion});for(const rock of actor.chargeRocks||[]){rock.visible=entity.charge>.06;rock.scale.setScalar(.28*Math.max(.1,entity.charge));rock.rotation.y=worldTime*3;}actor.group.updateMatrixWorld(true);
  }
}
const world = createSectorWorld(scene, { assetLoader: () => loadWorldAssets({ mobile: mobileGPU }) });
$('loading').querySelector('p').textContent = 'Preparando baliza, minerales y biomas…';
try { await world.loadAssets(); } catch(error) { $('loading').classList.add('error'); $('loading').querySelector('p').textContent = 'No se pudo descargar el escenario. Recargá para volver a intentar.'; throw error; }
let projectileTemplates=null,projectileLoad=null,projectileRetryAt=0,queuedFire=null;
let gemTemplates=null,gemLoad=null,gemRetryAt=0;
let carriedGem=new THREE.Group();carriedGem.name='carried-gem-pending';carriedGem.visible=false;scene.add(carriedGem);
const gemPickupOrigin=new THREE.Vector3(),gemPickupRotation=new THREE.Quaternion();let gemPickupAt=0,collectionPalm=null;
await world.prepareBiome(state.layout);
world.load(state.layout);
const audio = createExpeditionAudio();
let soundEnabled = settings.soundEnabled, soundReady = false;
audio.setEnabled(soundEnabled); audio.setVolumes({ effects: settings.effectsVolume, ambience: settings.ambienceVolume });
let paused = false, inspecting = false, firstPerson = saved ? settings.firstPerson : false, userActionEpoch=0;
let mobileAction = { action: 'none', disabled: true };
let viewBeforeInspect = null;
let flightMenuOpen = false, wasPausedBeforeMenu = false;
const compactHUD = matchMedia('(pointer: coarse), (max-width: 700px)');
let worldTime = 0, time = 0, subtitleUntil = 0, hintUntil = 0, lastSaveAt = 0, lastFrame = performance.now(), toastUntil = 0, damageUntil = 0, invulnerableUntil = 0;
let orbit = flight.actor==='bike'?.615:firstPerson ? 0 : -.9, elevation = flight.actor==='bike'?.19:firstPerson ? 0 : .28, zoom = 1, targetZoom = 1;
let selectedId = null, navigating = false, scanProgress = state.scanProgress || 0, scanning = false;
let health = 100, assemblyUntil = 0, transitStart = 0;
let pendingModule = 0, attachAt = 0, arrivalVeilUntil = 0;
let attachFlashAt = 0, attachJoint = null, cameraLean = 0;
let previousActor = flight.actor, previousPhase = state.phase, hudTimer = 0, frames = 0;
let tutorialUntil = settings.introSeen ? 0 : 9, qualityElapsed = 0, qualityFrames = 0;
let qualityScale = 1;
const direction = new THREE.Vector3(), right = new THREE.Vector3(), forward = new THREE.Vector3();
const cameraTarget = new THREE.Vector3(2, .8, 10), cameraPosition = new THREE.Vector3();
const lookTarget = new THREE.Vector3(), projected = new THREE.Vector3(), temp = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const previousPosition = new THREE.Vector3(), previousQuaternion = new THREE.Quaternion();
const colliderStart = new THREE.Vector3(), colliderEnd = new THREE.Vector3(), relativeVelocity = new THREE.Vector3();
let collisionActor = flight.actor, hazardWarning = null, controlWasLocked = false;
const transitEntry = new THREE.Vector3();
const viewFrustum = new THREE.Frustum(), viewProjection = new THREE.Matrix4(), respawnSphere = new THREE.Sphere();
let actionProtectedFrame = false, slowAudioActive = false, nextStageReady = false;
let interiorView = !!saved&&saved.shipDiscovered!==false, cabinLook = 0, cabinLookPitch = 0, previousCompanionCabin = false;
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), pointerStart = new THREE.Vector2();
const tetherPositions = new Float32Array(25 * 3);
const tetherGeometry = new THREE.BufferGeometry();
tetherGeometry.setAttribute('position', new THREE.BufferAttribute(tetherPositions, 3));
const tether = new THREE.Line(tetherGeometry, new THREE.LineBasicMaterial({ color: 0x9fe5db, transparent: true, opacity: .8 }));
tether.frustumCulled = false; scene.add(tether);
const selection = new THREE.Mesh(new THREE.TorusGeometry(1, .022, 4, 48), new THREE.MeshBasicMaterial({ color: 0xc0efde, transparent: true, opacity: .8, depthWrite: false }));
scene.add(selection);
let shotVisuals={update(){},reset(){},dispose(){}};
async function prepareProjectile(){
  if(projectileTemplates)return true;
  if(projectileLoad)return projectileLoad;
  if(performance.now()<projectileRetryAt)return false;
  projectileLoad=loadMissionAssets({mobile:mobileGPU,only:['projectile']}).then(assets=>{
    projectileTemplates=createMissionAssetTemplates(assets);
    shotVisuals.dispose();shotVisuals=createShotVisuals(scene,projectileTemplates,world);
    return true;
  }).catch(error=>{projectileRetryAt=performance.now()+5000;console.warn('Projectile asset pending; will retry',error);return false;}).finally(()=>{projectileLoad=null;});
  return projectileLoad;
}
async function prepareGem(){
  if(gemTemplates)return true;
  if(gemLoad)return gemLoad;
  if(performance.now()<gemRetryAt)return false;
  gemLoad=loadMissionAssets({mobile:mobileGPU,only:['gem']}).then(assets=>{
    gemTemplates=createMissionAssetTemplates(assets);world.setMissionAssets(gemTemplates);
    const replacement=gemTemplates.createGem();replacement.visible=carriedGem.visible;
    replacement.position.copy(carriedGem.position);replacement.quaternion.copy(carriedGem.quaternion);
    carriedGem.removeFromParent();carriedGem=replacement;scene.add(carriedGem);
    return true;
  }).catch(error=>{gemRetryAt=performance.now()+5000;console.warn('Gem asset pending; will retry',error);return false;}).finally(()=>{gemLoad=null;});
  return gemLoad;
}
let pendingShot=null;
let aimAssistId=null,lastShotAt=-100,shotProtectedUntil=0,lastEnemyWarning=-100;
let shipWasDiscovered=flight.shipDiscovered;
const effects = createEffects(scene);
const destruction = createDestruction(scene);
for(const record of world.targets) destruction.prepare(record);

let stageLoad = null, stageRetryAt = 0, stageWaiting = false;
async function prepareNextStage() {
  const next = state.moduleStage + 1;
  if (next > 3) { nextStageReady = true; return; }
  if (nextStageReady || stageLoad || performance.now() < stageRetryAt) return;
  const missing = ['capsula','habitat','propulsion'].slice(0,next).filter(name => !actorAssets[name]);
  const requestSeed = state.seed, requestStage = state.moduleStage;
  stageLoad = (async()=>{
    if (missing.length) { const records=await loadActorAssets(()=>{}, {mobile:mobileGPU,only:missing});Object.assign(actorAssets,records);ship.install(records); }
    await world.prepareBiome(['nereida','vesper','umbra'][next-1]);
    if(requestSeed===state.seed && requestStage===state.moduleStage) nextStageReady=true;
  })();
  try { await stageLoad; }
  catch { stageRetryAt=performance.now()+5000;notify('Preparando el próximo sector. Reintentamos la descarga…',5); }
  finally { stageLoad=null; }
}
async function prepareView(kind) {
  const key=kind==='cabin'?'cabina-integrada':'astronauta-brazos-armado';
  if(performance.now()<viewRetryAt)return false;
  if((kind==='cabin'&&cabin)||(kind!=='cabin'&&visor))return true;
  if(viewLoad){
    try{await viewLoad;}catch{return false;}
    return prepareView(kind);
  }
  viewLoad=(async()=>{
    if(!actorAssets[key])Object.assign(actorAssets,await loadActorAssets(()=>{}, {mobile:mobileGPU,only:[key]}));
    if(kind==='cabin'){cabin=createWalkableCabin(actorAssets);cabinRoot.add(cabin.group);}
    else{visor=createAssetVisor(actorAssets);camera.add(visor.group);}
  })();
  try{await viewLoad;return true;}catch(error){viewRetryAt=performance.now()+5000;notify('No se pudo preparar esta vista. Tocá de nuevo para reintentar.',6);console.warn('View preparation failed',error);return false;}finally{viewLoad=null;}
}
function notify(message, duration = 4) { $('toast').textContent = message; $('toast').classList.add('visible'); toastUntil = time + duration; }
function say(message) { $('companionMessage').textContent=message; $('companionSubtitle').textContent=`NÓMA · ${message}`; $('companionSubtitle').hidden=false; subtitleUntil=time+Math.max(4,Math.min(8,message.length/17)); play('companionHint'); }
function play(id, volume = 1) { if (soundEnabled && !paused) audio.play(id, { volume }); }
function saveProgress() {
  settings.firstPerson = firstPerson; settings.soundEnabled = soundEnabled;
  const ok = checkpoint.save({...state,shipDiscovered:flight.shipDiscovered}, settings);
  if ($('saveStatus')) $('saveStatus').textContent = ok ? `Guardado · ${state.layout.name.split(' · ')[0]}${state.gems ? ` · ${state.gems} gema${state.gems === 1 ? '' : 's'}` : ''}` : 'Guardado no disponible en este navegador';
}
function illuminate(position, color = 0x7deaff, duration = .7) {
  eventLight.position.copy(position); eventLight.color.setHex(color);
  eventLightUntil = time + duration;
}
function blocked() { return paused || inspecting || gemSequence.active || state.phase === 'transit' || time < assemblyUntil || (cabinController.inside && !cabinController.canPilot); }
function protectedAction(){return actionProtectedFrame || time<shotProtectedUntil || scanning || gemSequence.active || time<assemblyUntil || state.phase==='transit';}
function cabinActive(){return cabinController.inside && (interiorView || !cabinController.canPilot) && !forcedExterior();}
function forcedExterior() { return inspecting || time < assemblyUntil || state.phase === 'transit' || state.phase === 'complete'; }
function visorActive() { return firstPerson && !forcedExterior() && (flight.actor!=='ship'||interiorView); }
function validTargets() { return world.targets.filter(target => target.object.visible && state.discovered.includes(target.id) && !state.destroyed.includes(target.id) && !mission.optionalState(target.id)?.destroyed && (target.kind===state.phase || ['hazard','breakable'].includes(target.kind))); }
function correctWeapon(target,actor=flight.actor){return target && (['hazard','breakable','alien','alienShip'].includes(target.kind) || (target.kind==='small'?actor!=='ship':actor==='ship'));}
function pathBlocked(target,origin){
  const segment=new THREE.Vector3().subVectors(target.position,origin),length=segment.length();if(length<.01)return false;segment.divideScalar(length);
  return world.targets.some(other=>{if(other.id===target.id||!other.object.visible)return false;const offset=new THREE.Vector3().subVectors(other.position,origin),t=offset.dot(segment);return t>.2&&t<length-target.radius && offset.addScaledVector(segment,-t).length()<other.radius*.88;});
}
function selectedTarget() { return validTargets().find(target => target.id === selectedId) || null; }
function targetNext() {
  if (blocked() || combat.shot) return;
  const targets = validTargets();
  if (!targets.length) return;
  const index = targets.findIndex(target => target.id === selectedId);
  selectedId = targets[(index + 1) % targets.length].id;
  play('target');
}
function ensureTarget(discovered=[]) {
  if(!combat.shot&&selectedTarget()?.kind!==state.phase){
    const required=validTargets().filter(target=>target.kind===state.phase&&discovered.includes(target.id)).sort((a,b)=>a.position.distanceToSquared(flight.position)-b.position.distanceToSquared(flight.position))[0];
    if(required)selectedId=required.id;
  }
  if (!selectedTarget()) selectedId = validTargets().sort((a,b)=>(a.kind===state.phase?0:1)-(b.kind===state.phase?0:1)||a.position.distanceToSquared(flight.position)-b.position.distanceToSquared(flight.position))[0]?.id||null;
}
function objective() {
  if(!flight.shipDiscovered)return {position:flight.shipPosition,label:'SEÑAL DE TU NAVE',kind:'ship',stop:0};
  if (flight.returning) return { position: flight.dockPosition, label: flight.base==='bike'?'REGRESO · MOTO':'REGRESO · NAVE', stop: 0 };
  if (state.phase==='scan' && (hintUntil>time || flight.position.distanceTo(world.beacon.position)<24)) return {position:world.beacon.position,label:'BALIZA · ESCANEAR',stop:2.5};
  if (state.phase === 'small' || state.phase === 'large') {
    if (state.phase === 'large' && flight.actor !== 'ship') {
      return { position: flight.shipPosition, label: state.phase === 'large' ? 'NAVE · ABORDAR' : 'SALIR COMO ASTRONAUTA', stop: 0 };
    }
    const target = selectedTarget();
    if(target)return{position:target.position,kind:target.kind,label:`${{small:'ASTEROIDE · EVA',large:'NÚCLEO · CAÑÓN',hazard:'ROCA A LA DERIVA',breakable:'ROCA'}[target.kind]} · ${Math.round(target.position.distanceTo(flight.position))} m`,stop:10};
    if(hintUntil>time){const spec=state.layout[state.phase].find(t=>!state.destroyed.includes(t.id));if(spec)return {position:spec.approach||state.layout.regions[spec.region],label:'REGIÓN DE BÚSQUEDA',stop:0};}
  }
  if (state.phase === 'gem') return { position: world.gem.position, label: 'GEMA · RECUPERAR', stop: flight.actor === 'ship' ? 10 : 1.7 };
  return null;
}
function returnToShip() {
  if (blocked() || combat.shot || state.phase === 'complete') return;
  if (flight.returnToShip()) {
    navigating = false; scanning = false; controls.clear();
    say(flight.base==='bike'?'Volvemos a la moto. Recojo el cable al montar.':'Volvemos al acceso de la nave. Recojo el cable al abordar.');
    notify('Regreso asistido · Recogiendo cable');
    play('return');
  }
}
function mountBike(){
  if(blocked()||flight.returning)return;
  if(flight.mountBike()){
    cabinController.reset({aboard:false});interiorView=false;controls.clear();navigating=false;scanning=false;
    say('Moto lista. Tenés impulso y el arma del traje a mano.');play('evaExit');
  }else notify('Acercate a la moto para montar.');
}
async function deploy() {
 if(flight.actor==='bike'&&!blocked()&&!flight.returning){
   if(!await prepareView('visor')||flight.actor!=='bike'||blocked())return;
   flight.deploy();previousActor=flight.actor;controls.clear();navigating=false;scanning=false;say('Cable conectado a la moto. Podés explorar alrededor.');play('evaExit');return;
 }
 const epoch=userActionEpoch,requestSeed=state.seed;
 const allowed=()=>epoch===userActionEpoch&&requestSeed===state.seed&&!paused&&!inspecting&&!combat.shot&&!gemSequence.active&&time>=assemblyUntil&&!['complete','transit'].includes(state.phase)&&flight.actor==='ship';
 if(!allowed())return;
 if(cabinController.inside){
  if(!await prepareView('cabin')||!allowed())return;
  interiorView=true;cabinController.exit();controls.clear();return;
 }
 if(!await prepareView('visor')||!allowed())return;
 if(flight.deploy()){cabinController.reset({aboard:false});interiorView=false;previousActor=flight.actor;navigating=false;scanning=false;controls.clear();say('Cable conectado. Explorá alrededor de la nave.');play('evaExit');}
}

function stopNavigation() {
  if (navigating && flight.actor === 'ship') { orbit = flight.shipYaw; elevation = -flight.shipPitch; }
  navigating = false;
}
function navigate() {
 if(paused||combat.shot)return;
 if(state.phase==='complete'){void resetExpedition();return;}
 if(inspecting)setInspect(false);
 hintUntil=time+14;stopNavigation();
 if(!flight.shipDiscovered){say('Ahí está la señal de nuestra nave. Usá el impulso de la moto para acercarte.');notify('Buscá la nave · La moto tiene boost',4);return;}
 say(state.phase==='scan'?'La señal está cerca del punto de partida. Buscá su pulso cian.':'Marcamos una región de búsqueda. Pilotá hasta allí y explorá con el astronauta.');
 notify('Rumbo orientativo · El movimiento sigue en tus manos',4);
}
function toggleCabin(){
 if(paused||combat.shot||gemSequence.active||flight.actor!=='ship'||time<assemblyUntil)return;
 if(!cabin){const epoch=userActionEpoch,requestSeed=state.seed;void prepareView('cabin').then(ok=>{if(ok&&epoch===userActionEpoch&&requestSeed===state.seed)toggleCabin();});return;}
 interiorView=true;cabinLook=0;cabinLookPitch=0;controls.clear();
 if(cabinController.canPilot){cabinController.stand();say('Estabilizo la nave. Podés levantarte del puesto.');}
 else if(cabinController.canSit){cabinController.sit();play('cabinSeat');}
 else notify('Acercate al asiento para pilotear.');
}
function interact() {
  if(paused||inspecting)return;
  if(cabinController.inside && !cabinController.canPilot && !gemSequence.active){if(cabinController.canSit){cabinController.sit();play('cabinSeat');}return;}
  if (blocked() || flight.returning || combat.shot) return;
  if(!flight.shipDiscovered){notify('Encontrá primero tu nave.');return;}
  if (flight.actor !== 'astronaut') { notify(flight.actor==='bike'?'Bajá de la moto para interactuar.':'Salí de la nave para interactuar.'); return; }
  if (state.phase === 'scan') {
    if (flight.position.distanceTo(world.beacon.position) > 3.8) { notify('Acercate a menos de 4 m de la baliza.'); return; }
    scanning = !scanning; navigating = false;
    say(scanning ? 'Escaneando. Mantenete cerca mientras decodifico la señal.' : 'Escaneo interrumpido.');
    if (scanning) play('scan');
  } else if (state.phase === 'gem') {
    if (flight.position.distanceTo(world.gem.position) > 3) { notify('Acercate a menos de 3 m de la gema.'); return; }
    if(!gemTemplates){void prepareGem();notify('Estabilizando la gema…',3);return;}
    if (mission.collectGem()) {
      encounters.retreat();ballistics.reset();shotVisuals.reset();
      navigating = false;
      if (effects.collect) effects.collect(world.gem.position, ()=>carriedGem.position, worldTime);
      else triggerBurst(new THREE.Vector3().copy(state.layout.gem),'gem');
      illuminate(world.gem.position, 0x75f9e9, 1.4);
      play('gemCollect'); saveProgress();
      gemPickupOrigin.copy(world.gem.position);gemPickupAt=time;carriedGem.visible=true;
      (world.gem.getObjectByName('aether-shard')||world.gem).getWorldQuaternion(gemPickupRotation);
      gemSequence.start();momentClock.moment('gem');play('slowEnter');controls.clear();
      notify('Gema recuperada · Próximo horizonte');
      say('La energía está con nosotros. Te acompaño de vuelta a la nave.');
    }
  }
}
function combatTargets(){
  const targets=world.targets.filter(t=>t.object.visible&&!state.destroyed.includes(t.id)&&!mission.optionalState(t.id)?.destroyed).map(t=>({
    id:t.id,position:t.position,previousPosition:t.previousPosition,radius:t.radius*.9,side:'neutral',blocking:true,
    damageable:['hazard','breakable'].includes(t.kind)||(t.kind===state.phase&&state.discovered.includes(t.id)),
  }));
  for(const e of encounters.entities){
    const quaternion=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,-1),new THREE.Vector3().copy(e.forward));
    for(const [z,y,radius]of e.kind==='alienShip'?[[0,0,6.5],[-7,0,3.8],[7,0,3.8]]:[[0,1.4,1.15]]){
      const offset=new THREE.Vector3(0,y,z).applyQuaternion(quaternion);
      targets.push({id:e.id,position:new THREE.Vector3().copy(e.position).add(offset),previousPosition:new THREE.Vector3().copy(e.previousPosition).add(offset),velocity:new THREE.Vector3().copy(e.velocity),radius,side:'enemy',blocking:false});
    }
  }
  const spheres=flight.actor==='ship'?shipCollisionSpheres(state.moduleStage):[{center:{x:0,y:flight.actor==='bike'?.85:.85,z:0},radius:flight.actor==='bike'?1.15:.65},{center:{x:0,y:1.6,z:0},radius:.36}];
  for(const sphere of spheres){
    const offset=new THREE.Vector3().copy(sphere.center),prior=offset.clone();
    if(flight.actor==='ship'){offset.applyQuaternion(flight.shipQuaternion);prior.applyQuaternion(previousQuaternion);}
    targets.push({id:'player',position:offset.add(flight.position),previousPosition:prior.add(previousPosition),radius:sphere.radius,side:'player',blocking:false,protected:protectedAction()||time<invulnerableUntil});
  }
  return targets;
}
function aimRay(ndc=pointer.set(0,0)){
  camera.updateMatrixWorld();raycaster.setFromCamera(ndc,camera);
  return {origin:raycaster.ray.origin.clone(),direction:raycaster.ray.direction.clone()};
}
function fire(ndc){
  if(blocked()||flight.returning||combat.cooldown>0||pendingShot||state.phase==='complete')return;
  if(!projectileTemplates){
    queuedFire=ndc?.isVector2?ndc.clone():new THREE.Vector2(0,0);
    notify('Preparando el sistema de disparo…',3);
    void prepareProjectile().then(ready=>{const aim=queuedFire;queuedFire=null;if(ready&&aim)fire(aim);});
    return;
  }
  lastShotAt=time;
  pendingShot={actor:flight.actor,ndc:ndc?.isVector2?ndc.clone():null,due:time+(flight.actor==='ship'?.04:.25)};
  combat.cooldown=flight.actor==='ship'?.76:.59;
}
function emitShot(ndc){
  if(blocked()||flight.returning||state.phase==='complete')return;
  const weapon=flight.actor==='ship'?'ship':'astronaut';
  const projectileSpeed=weapon==='ship'?48:28;
  const mount=flight.actor==='ship'?ship.muzzle:flight.actor==='bike'?bike.muzzle:visorActive()&&visor?visor.muzzle:astronaut.muzzle;
  mount.updateWorldMatrix(true,false);const origin=mount.getWorldPosition(new THREE.Vector3());
  const ray=aimRay(ndc?.isVector2?ndc:undefined),bodies=combatTargets();
  const assist=assistAim({...ray,targets:bodies,maxDistance:WEAPON_RANGE[flight.actor]+15,coneAngle:THREE.MathUtils.degToRad(6),strength:.5});
  const assistedBody=assist.targetId&&bodies.find(body=>body.id===assist.targetId&&body.side==='enemy');
  let destination;
  if(assistedBody?.velocity){
    const distance=ray.origin.distanceTo(assistedBody.position),leadTime=Math.min(1.2,distance/projectileSpeed);
    const leadPoint=assistedBody.position.clone().addScaledVector(assistedBody.velocity,leadTime);
    const leadDirection=leadPoint.clone().sub(ray.origin).normalize();
    const blockers=bodies.filter(body=>body.id!==assist.targetId);
    const obstruction=aimConvergence({origin:ray.origin,direction:leadDirection,targets:blockers,maxDistance:distance});
    destination=new THREE.Vector3().copy(obstruction.targetId?obstruction.point:leadPoint);
  }else{
    const convergence=aimConvergence({origin:ray.origin,direction:assist.direction,targets:bodies,maxDistance:WEAPON_RANGE[flight.actor]+camera.position.distanceTo(flight.position)});
    destination=new THREE.Vector3().copy(convergence.point);
  }
  const heading=destination.sub(origin).normalize();
  const shot=ballistics.fire({owner:'player',kind:'energy',origin,direction:heading,speed:projectileSpeed,radius:weapon==='ship'?.24:.13,damage:weapon==='ship'?60:25,maxDistance:WEAPON_RANGE[flight.actor]});
  if(!shot)return;
  shot.weapon=weapon;combat.cooldown=weapon==='ship'?.72:.34;lastShotAt=time;shotProtectedUntil=time+.10;scanning=false;
  if(visorActive()&&flight.actor==='astronaut')visor?.kick();
  illuminate(origin,weapon==='ship'?0xffbd75:0x80e8ff,.18);triggerBurst(origin,weapon==='ship'?'shipMuzzle':'evaMuzzle',{velocity:flight.velocity});play(weapon==='ship'?'shipFire':'evaFire');
}
function triggerBurst(position,kind='scan',options={}){effects.burst(position,kind,worldTime,options);}
async function setView() {
  if (paused || time < assemblyUntil || state.phase === 'transit' || state.phase === 'complete') return;
  const viewActor=flight.actor,kind=viewActor==='ship'?'cabin':'visor',epoch=userActionEpoch,requestSeed=state.seed;
  if(!await prepareView(kind)||flight.actor!==viewActor||epoch!==userActionEpoch||requestSeed!==state.seed||paused||gemSequence.active||time<assemblyUntil||['transit','complete'].includes(state.phase))return;
  const wasInspecting = inspecting;
  if (inspecting) setInspect(false);
  if(flight.actor==='ship'){
    if(!interiorView){interiorView=true;firstPerson=true;}
    else if(firstPerson)firstPerson=false;
    else if(cabinController.canPilot){interiorView=false;firstPerson=false;}
    else firstPerson=true;
  }else firstPerson=wasInspecting||!firstPerson;
  saveProgress();
  if (flight.actor === 'ship') { orbit = flight.shipYaw; elevation = -flight.shipPitch; }
  else if (firstPerson) { orbit = flight.actor==='bike'?flight.shipYaw:astronaut.group.rotation.y; elevation = flight.actor==='bike'?.12:0; }
  cabinLook=0;cabinLookPitch=0;
  notify(cabinActive()?firstPerson?'Cabina · Primera persona':'Cabina · Tercera persona':firstPerson?'Visor · Primera persona':'Vista exterior');
}
function setInspect(value) {
  if (paused || combat.shot || gemSequence.active || state.phase === 'transit') return;
  if (value && !inspecting) { viewBeforeInspect = { orbit, elevation }; orbit = -.9; elevation = .28; }
  else if (!value && viewBeforeInspect) { orbit = viewBeforeInspect.orbit; elevation = viewBeforeInspect.elevation; viewBeforeInspect = null; }
  inspecting = value;if(value)interiorView=false; stopNavigation(); scanning = false; controls.clear();
  if (!value && flight.actor === 'ship') { orbit = flight.shipYaw; elevation = -flight.shipPitch; }
  document.body.classList.toggle('inspecting', value);
  $('inspectButton').setAttribute('aria-pressed', String(value));
  $('inspectButton').textContent = value ? 'Volver a explorar ↙' : 'Inspeccionar nave ↗';
  document.querySelector('.mission-panel').inert = value;
}
function setPaused(value) {
  if(value)userActionEpoch++;
  paused = value; controls.clear();
  $('pauseOverlay').hidden = !value || flightMenuOpen || $('helpDialog').open;
  $('pauseButton').setAttribute('aria-pressed', String(value));
  $('pauseButton').setAttribute('aria-label', value ? 'Continuar' : 'Pausar');
  audio.setPaused(value || document.hidden);
  if (!value && soundEnabled && !document.hidden) void resumeSound();
}
async function toggleSound() {
  soundEnabled = !soundEnabled || !soundReady;
  audio.setEnabled(soundEnabled); saveProgress();
  if(!soundEnabled)soundReady=false;
  updateSoundUI();
  if (soundEnabled) {
    const ready = await resumeSound();
    if (!ready) notify('Tocá ♪ Sonido para reintentar la activación.');
    else {play('ui');notify('Sonido activo');}
  }
}
function updateSoundUI(){
  const active=soundEnabled&&soundReady,label=active?'Silenciar sonido':'Activar sonido';
  for(const id of ['soundButton','mobileSoundInvite']){
    $(id).setAttribute('aria-pressed',String(active));$(id).setAttribute('aria-label',label);
  }
  $('mobileSoundInvite').hidden=false;
  $('mobileSoundInvite').textContent=active?'♪ Activo':'♪ Sonido';
}
async function resumeSound(){
  const ready=await audio.unlock();
  soundReady=ready&&soundEnabled;updateSoundUI();return soundReady;
}
async function resetExpedition() {
  setPaused(true);
  try{await world.prepareBiome('nereida');}catch{notify('No se pudo preparar la expedición. Volvé a intentar.');return;}
  const randomSeed = crypto.getRandomValues(new Uint32Array(1))[0];
  mission.reset(randomSeed); flight.reset(); flight.setStage(1); combat.reset(); world.load(state.layout); ship.setStage(1, false);
  encounters.reset({seed:state.seed,sector:state.sector});clearEnemies();shipWasDiscovered=false;bike.reset();
  momentClock.clearMoments();slowAudioActive=false;gemSequence.reset();carriedGem.visible=false;effects.reset();destruction.reset();ship.reset();astronaut.reset();companion.reset();cabinController.reset({aboard:false});interiorView=false;nextStageReady=false;hintUntil=0;
  shotVisuals.reset();
  paused = false; inspecting = false; firstPerson = false; navigating = false; scanning = false; scanProgress = 0;
  selectedId = null; health = 100; assemblyUntil = 0; pendingModule = 0; arrivalVeilUntil = 0; invulnerableUntil = time + 2; damageUntil = 0;
  previousPhase = state.phase; previousActor = flight.actor; orbit = .615; elevation = .19;companion.group.position.copy(flight.position).add(new THREE.Vector3(1.8,1.6,.7)); targetZoom = 1;
  document.body.classList.remove('inspecting'); document.querySelector('.mission-panel').inert = false;
  $('inspectButton').setAttribute('aria-pressed', 'false'); $('inspectButton').textContent = 'Inspeccionar nave ↗';
  controls.clear(); setPaused(false); updateMissionUI();
  const url = new URL(location.href); url.searchParams.set('seed', state.seed); history.replaceState(null, '', url);
  checkpoint.clear(); saveProgress();
  say('Una señal nueva. Mismo recorrido, otra distribución.'); notify('Nueva expedición preparada');
}
const controls = createControls(canvas, { onAction: interact, onFire: fire, onTarget: targetNext, onView: setView,
  onPause: () => { if (!$('helpDialog').open) setPaused(!paused); }, onReturn: returnToShip, onDeploy: deploy,
  onBike:mountBike, onNavigate: navigate, onCabin: toggleCabin, onInspect: () => setInspect(!inspecting) });
$('missionButton').onclick = navigate; $('interactButton').onclick = interact; $('fireButton').onclick = fire;
$('targetButton').onclick = targetNext; $('astronautButton').onclick = deploy; $('shipButton').onclick = returnToShip;
$('bikeButton').onclick=mountBike;$('mobileBikeButton').onclick=()=>fromFlightMenu(mountBike);$('mobileRideButton').onclick=mountBike;$('mobileDismountButton').onclick=deploy;$('mobileFreeFireButton').onclick=()=>fire();
$('cabinButton').onclick=toggleCabin; $('mobileCabinButton').onclick=toggleCabin;
$('cinematicSkip').onclick=()=>gemSequence.skip();
$('touchLayout').value=settings.touchLayout; $('touchLayout').onchange=()=>{controls.clear();settings.touchLayout=$('touchLayout').value;document.body.dataset.touchLayout=settings.touchLayout;saveProgress();};
$('viewButton').onclick = setView; $('inspectButton').onclick = () => setInspect(!inspecting);
$('zoomIn').onclick = () => { targetZoom = Math.max(.6, targetZoom - .15); };
$('zoomOut').onclick = () => { targetZoom = Math.min(1.6, targetZoom + .15); };
$('cameraButton').onclick = () => { orbit = 0; elevation = .3; targetZoom = 1; };
$('soundButton').onclick = toggleSound; $('pauseButton').onclick = () => setPaused(!paused); $('resumeButton').onclick = () => setPaused(false);
$('mobileSoundInvite').onclick = toggleSound;
$('settingsButton').onclick = openFlightMenu;
for (const [id, key] of [['effectsVolume', 'effectsVolume'], ['ambienceVolume', 'ambienceVolume']]) {
  $(id).value = settings[key];
  $(id).addEventListener('input', () => {
    settings[key] = Number($(id).value);
    audio.setVolumes({ effects: settings.effectsVolume, ambience: settings.ambienceVolume }); saveProgress();
  });
}
const unlockSound = event => {
  if(event.target?.closest?.('#soundButton, #mobileSoundInvite, #mobileSoundButton'))return;
  if(soundEnabled&&!paused)void resumeSound();
};
document.addEventListener('pointerdown', unlockSound, { capture: true, passive: true });
document.addEventListener('keydown', unlockSound, { capture: true });
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
  const actions = { bike:mountBike, cabin:toggleCabin, navigate, return: returnToShip, deploy, interact, fire, restart: resetExpedition, inspect: () => setInspect(false) };
  actions[mobileAction.action]?.(); updateHUD();
};
$('mobileTargetButton').onclick = () => { targetNext(); updateHUD(); };
$('mobileGuideButton').onclick = () => fromFlightMenu(navigate);
$('mobileReturnButton').onclick = () => fromFlightMenu(returnToShip);
$('mobileDeployButton').onclick = () => fromFlightMenu(deploy);
$('mobileViewButton').onclick = () => fromFlightMenu(setView);
$('mobileQuickViewButton').onclick = () => { setView(); updateHUD(); };
$('mobileInspectButton').onclick = () => fromFlightMenu(() => setInspect(!inspecting));
$('mobileSoundButton').onclick = () => fromFlightMenu(toggleSound);
$('mobileHelpButton').onclick = () => fromFlightMenu(() => $('helpButton').click());
$('mobileRestartButton').onclick = () => fromFlightMenu(resetExpedition);
$('mobileZoomIn').onclick = () => fromFlightMenu(() => $('zoomIn').click());
$('mobileZoomOut').onclick = () => fromFlightMenu(() => $('zoomOut').click());
$('mobileZoomReset').onclick = () => fromFlightMenu(() => $('cameraButton').click());
window.addEventListener('blur', () => { if (!$('helpDialog').open && !flightMenuOpen) setPaused(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
window.addEventListener('pagehide', saveProgress);
canvas.addEventListener('wheel', event => { event.preventDefault(); if (!paused) targetZoom = THREE.MathUtils.clamp(targetZoom + event.deltaY * .0007, .6, 1.6); }, { passive: false });
canvas.addEventListener('pointerdown', event => pointerStart.set(event.clientX, event.clientY));
canvas.addEventListener('pointerup', event => {
  if(blocked()||event.button!==0||pointerStart.distanceTo(new THREE.Vector2(event.clientX,event.clientY))>6)return;
  if(event.pointerType==='touch')return;
  fire();
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(renderPixelRatio() * qualityScale); renderer.setSize(innerWidth, innerHeight); presentation.resize();
});
let graphicsRecoveryActive = false, graphicsReloadStarted = false;
function reloadGraphics() {
  if (graphicsReloadStarted) return;
  graphicsReloadStarted = true; location.reload();
}
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  if (graphicsRecoveryActive) return;
  graphicsRecoveryActive = true; setPaused(true);
  // Recovery must also remain reachable above a top-layer help/menu dialog.
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  const panel=$('loading');panel.hidden=false;panel.style.opacity='1';panel.classList.add('graphics-recovery');
  saveProgress();
  panel.querySelector('p').textContent='Recuperando la conexión gráfica… Tu progreso se conserva.';
  const retry=document.createElement('button');retry.textContent='Recargar expedición';retry.onclick=reloadGraphics;panel.append(retry);
});
canvas.addEventListener('webglcontextrestored',()=>{if(graphicsRecoveryActive)reloadGraphics();});


function updateFlight(dt, input) {
  if(state.phase==='transit'){updateTransit(dt);return;}
  direction.set(0,0,0);
  if(inspecting||time<assemblyUntil||state.phase==='complete'){controlWasLocked=true;return;}
  if(controlWasLocked&&flight.actor==='ship'){orbit=flight.shipYaw;elevation=-flight.shipPitch;}controlWasLocked=false;
  const interiorHold=cabinController.inside&&(!cabinController.canPilot||!cabin);
  const manual=input.x||input.y||input.z;
  if(manual&&!combat.shot&&!flight.returning&&!gemSequence.active&&!interiorHold){scanning=false;
    if(flight.actor!=='astronaut')forward.set(0,0,-1).applyQuaternion(flight.vehicleQuaternion);
    else{camera.getWorldDirection(forward);if(!visorActive())forward.y=0;forward.normalize();}
    if(forward.lengthSq()<.1)forward.set(0,0,-1);right.crossVectors(forward,up).normalize();
    direction.addScaledVector(right,input.x).addScaledVector(forward,-input.z).addScaledVector(up,input.y);if(direction.lengthSq()>1)direction.normalize();
  }
  let lookYaw=interiorHold?flight.shipYaw:orbit,lookPitch=interiorHold?flight.shipPitch:-elevation;
  if(combat.shot&&selectedTarget()&&flight.actor==='ship'){
    temp.subVectors(selectedTarget().position,flight.shipPosition).normalize();lookYaw=Math.atan2(-temp.x,-temp.z);lookPitch=Math.asin(THREE.MathUtils.clamp(temp.y,-1,1));orbit=lookYaw;elevation=-lookPitch;
  }
  flight.update(dt,direction,input.boost&&!combat.shot&&!scanning&&!gemSequence.active,{
    brake:input.brake||interiorHold,hold:!!combat.shot||scanning||interiorHold||(gemSequence.active&&!flight.returning),lookYaw,lookPitch,
  });
  cabinController.update(dt,{x:input.x,z:input.z,lookYaw:cabinLook,shipSpeed:flight.velocity.length(),shipAngularSpeed:flight.angularSpeed});
  if(cabinController.consumeExit()){
    flight.deploy();interiorView=false;navigating=false;scanning=false;controls.clear();void prepareView('visor');say('Cable conectado. Tenés vuelo libre alrededor de la nave.');play('evaExit');
  }
  if(flight.actor!==previousActor){
    previousActor=flight.actor;controls.clear();navigating=false;
    if(flight.actor==='ship'){
      orbit=flight.shipYaw;elevation=-flight.shipPitch;cabinLook=0;cabinLookPitch=0;interiorView=true;
      cabinController.enter({autoSeat:true});void prepareView('cabin');
      notify('A bordo · Cable recogido');say('Al puesto de mando.');play('return',.65);
    }
  }
}
function updateTransit(dt){
 const age=gemSequence.age;
 const travelDirection=new THREE.Vector3(0,0,-1).applyQuaternion(flight.shipQuaternion);
 flight.shipPosition.copy(transitEntry).addScaledVector(travelDirection,Math.min(age,6)*8);
 flight.velocity.copy(travelDirection).multiplyScalar(8);flight.thrust.copy(travelDirection).multiplyScalar(3);
}
function updateCinematic(dt){
 const event=gemSequence.update(dt,{aboard:flight.actor==='ship',seated:!!cabin&&cabinController.canPilot,ready:nextStageReady,reducedMotion});
 if(event==='return'){flight.returnToShip({automatic:true});scanning=false;controls.clear();play('return');}
 if(event==='travel'&&mission.enterCorridor('ship')){
  transitStart=time;transitEntry.copy(flight.shipPosition);controls.clear();play('transit');triggerBurst(flight.shipPosition,'warp');say('Siguiente horizonte. Preparando el viaje.');saveProgress();
 }
 if(event==='arrive'){
  mission.finishTransit();combat.reset();selectedId=null;navigating=false;scanning=false;scanProgress=0;
  shotVisuals.reset();clearEnemies();encounters.reset({seed:state.seed,sector:state.sector});effects.reset();destruction.reset();ship.reset();astronaut.reset();companion.reset();
  flight.velocity.set(0,0,0);flight.thrust.set(0,0,0);
  if(state.phase==='complete'){
   notify('Tres gemas. Una nave completa. Expedición terminada.',8);say('Lo logramos juntos.');play('complete');triggerBurst(flight.shipPosition,'attach');
  }else{
   world.load(state.layout);flight.reset({aboard:true});flight.setStage(state.moduleStage);flight.parkBike();cabinController.reset({aboard:true});previousActor='ship';interiorView=true;cabinLook=0;cabinLookPitch=0;
   orbit=-.9;elevation=.28;pendingModule=state.moduleStage;attachAt=time+.65;assemblyUntil=time+3.4;arrivalVeilUntil=time+.6;
   cameraTarget.copy(flight.shipPosition).add(new THREE.Vector3(0,.3,0));
   const fit=Math.max(1,.78/camera.aspect);
   camera.position.set(Math.sin(orbit)*Math.cos(.48),Math.sin(.48),Math.cos(orbit)*Math.cos(.48)).multiplyScalar((shipFrameRadius(state.moduleStage)*2.8+5)*zoom*fit).add(cameraTarget);camera.lookAt(cameraTarget);
   flight.health.ship=Math.min(100,flight.health.ship+25);health=flight.integrity;notify(state.moduleStage===2?'HÁBITAT ACOPLADO · Vesper':'PROPULSIÓN ACOPLADA · Umbra',5);say('Nuevo módulo. Otro sector para descubrir.');
  }
  nextStageReady=false;saveProgress();
 }
 if(event==='finish'){interiorView=firstPerson;orbit=flight.shipYaw;elevation=-flight.shipPitch;controls.clear();saveProgress();}
 const waiting=gemSequence.phase==='travel'&&gemSequence.age>=5.5&&!nextStageReady;
 if(!graphicsRecoveryActive){
  if(waiting){stageWaiting=true;$('loading').hidden=false;$('loading').style.opacity='1';$('loading').querySelector('p').textContent='Preparando el próximo horizonte…';}
  else if(stageWaiting){stageWaiting=false;$('loading').hidden=true;}
 }
 $('cinematicSkip').hidden=!gemSequence.active;document.body.classList.toggle('cinematic',gemSequence.active);
}
function updateScan(dt) {
  if (!scanning) return;
  if (flight.actor !== 'astronaut' || flight.returning || flight.position.distanceTo(world.beacon.position) > 3.8 || state.phase !== 'scan') { scanning = false; return; }
  scanProgress = Math.min(1, scanProgress + dt / 2.2);mission.setScanProgress(scanProgress);
  if(time-lastSaveAt>1){saveProgress();lastSaveAt=time;}
  if (scanProgress === 1) {
    mission.scan(); scanning = false; play('scan');saveProgress();
    triggerBurst(world.beacon.position, 'scan'); notify('Señal decodificada · Tres regiones para explorar');
    say('La baliza señala tres regiones. Acercá la nave y exploremos cada una.');
  }
}
function damagePlayer(amount,position){
  if(protectedAction()||time<invulnerableUntil)return;
  const down=flight.damage(amount);health=flight.integrity;invulnerableUntil=time+.65;damageUntil=time+.4;
  play('damage');triggerBurst(new THREE.Vector3().copy(position),'impact',{velocity:flight.velocity});
  if(down){
    flight.recover();health=flight.integrity;invulnerableUntil=time+10;
    combat.reset();shotVisuals.reset();encounters.retreat();clearEnemies();
    // Retreating enemies may leave; new required kills may start fresh encounters.
    encounters.reset({seed:state.seed,sector:state.sector,completedIds:state.destroyed});
    cabinController.reset({aboard:flight.actor==='ship'});interiorView=flight.actor==='ship';previousActor=flight.actor;
    orbit=flight.shipYaw;elevation=-flight.shipPitch;controls.clear();scanning=false;
    notify('Recuperación de emergencia · Tu progreso se conserva',5);say('Te recupero. El camino que despejamos sigue abierto.');play('rescue');saveProgress();
  }
}
function updateCombat(dt,worldDt){
  combat.cooldown=Math.max(0,combat.cooldown-dt);
  if(pendingShot&&time>=pendingShot.due){const queued=pendingShot;pendingShot=null;if(queued.actor===flight.actor)emitShot(queued.ndc);}
  if(enemyAssets.alienShip){
    const center=flight.position.clone().add(new THREE.Vector3(0,flight.actor==='astronaut'?1:flight.actor==='bike'?1.2:0,0));
    const events=encounters.update(worldDt,{playerPosition:center,protected:scanning||gemSequence.active||time<invulnerableUntil||time<assemblyUntil,retreat:gemSequence.active||state.phase==='complete'});
    syncEnemyActors(worldDt);
    for(const event of events){
      if(event.type==='warning'&&event.reason==='arrival'&&time-lastEnemyWarning>4){lastEnemyWarning=time;say(event.kind==='alienShip'?'Contacto en movimiento. Podés enfrentarlo o dejarlo atrás.':'Cuidado: se aproxima otro visitante.');play('warning');}
      if(event.type!=='fire')continue;
      const actor=enemyActors.get(event.id),mount=event.kind==='alien'?event.claw==='left'?actor?.clawLeft:actor?.clawRight:actor?.muzzle;
      const origin=mount?mount.getWorldPosition(new THREE.Vector3()):new THREE.Vector3().copy(event.origin);
      const direction=center.clone().sub(origin).normalize();
      const shot=ballistics.fire({...event, id:undefined,kind:event.projectileKind,origin,direction});
      if(shot){shot.weapon=event.kind==='alienShip'?'ship':'rock';triggerBurst(origin,event.kind==='alienShip'?'shipMuzzle':'evaMuzzle');play(event.kind==='alienShip'?'shipFire':'evaFire',.35);}
    }
  }
  const shots=new Map(ballistics.projectiles.map(p=>[p.id,p]));
  const hits=ballistics.update(worldDt,combatTargets());
  for(const hit of hits){
    if(hit.targetId==='player'){damagePlayer(hit.damage,hit.position);continue;}
    if(hit.owner!=='player')continue;
    const enemy=encounters.damage(hit.targetId,hit.damage);
    if(enemy){
      const point=new THREE.Vector3().copy(hit.position);triggerBurst(point,enemy.destroyed?(enemy.entity.kind==='alienShip'?'ship':'eva'):'impact',{velocity:enemy.entity.velocity});
      play(enemy.destroyed?'largeBreak':'smallBreak',.65);illuminate(point,0xff9977,enemy.destroyed?.9:.2);
      if(enemy.destroyed){momentClock.moment('impact');notify(enemy.entity.kind==='alienShip'?'Nave hostil destruida':'Amenaza neutralizada',2);}
      continue;
    }
    const target=world.targets.find(t=>t.id===hit.targetId),weapon=shots.get(hit.projectileId)?.weapon||'astronaut';
    if(!target)continue;
    if(!correctWeapon(target,weapon)){triggerBurst(new THREE.Vector3().copy(hit.position),'impact');notify(target.kind==='large'?'El núcleo resiste. Necesitás el cañón de la nave.':'Usá el arma del traje para este asteroide.',2);continue;}
    const optional=mission.optionalState(target.id);let destroyed=false;
    if(optional){destroyed=!!mission.damageOptional(target.id,weapon,worldTime)?.destroyed;}
    else destroyed=mission.hit(target.id,weapon,target.position);
    if(destroyed){
      destruction.burst(target,worldTime,{velocity:target.velocity});triggerBurst(target.position,weapon==='ship'?'ship':'eva',{velocity:target.velocity});momentClock.moment(weapon==='ship'?'ship':'impact');
      illuminate(target.position,weapon==='ship'?0xffbb78:0x7deaff,weapon==='ship'?1:.45);play(weapon==='ship'?'largeBreak':'smallBreak');
      if(!optional&&encounters.trigger({id:target.id,position:target.position,playerPosition:flight.position}))void prepareEnemy('alienShip');
      notify(optional?'Roca despejada':weapon==='ship'?'Núcleo destruido':'Asteroide fragmentado',2);saveProgress();
    }else{triggerBurst(new THREE.Vector3().copy(hit.position),'impact',{velocity:target.velocity});play('smallBreak',.5);}
  }
  shotVisuals.update(ballistics.projectiles,worldDt);
}
function updateHazards() {
  hazardWarning = null;
  if (inspecting || protectedAction() || state.phase === 'complete') return;
  const spheres = flight.actor === 'ship' ? shipCollisionSpheres(state.moduleStage) : [{ center: { x: 0, y: EVA_CENTER_Y, z: 0 }, radius: EVA_RADIUS }, { center: { x: 0, y: 1.58, z: 0 }, radius: .36 }];
  for (const hazard of world.hazards) {
    if(!hazard.object.visible||mission.optionalState(hazard.id)?.destroyed)continue;
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
      damagePlayer(impact,colliderEnd);
      break;
    }
  }
  if(flight.actor==='bike'||flight.actor==='astronaut'&&flight.base==='bike'){
    for(const sphere of shipCollisionSpheres(state.moduleStage)){
      const center=new THREE.Vector3().copy(sphere.center).applyQuaternion(flight.shipQuaternion).add(flight.shipPosition);
      const offset=flight.position.clone().add(new THREE.Vector3(0,.85,0)).sub(center),distance=offset.length(),radius=sphere.radius+(flight.actor==='bike'?1.15:EVA_RADIUS);
      if(distance<radius){if(distance<.001)offset.set(1,0,0);else offset.divideScalar(distance);flight.applyImpact(offset,radius-distance);}
    }
  }

  for(const rock of world.targets){
    if(rock.kind==='hazard'||!rock.object.visible||state.destroyed.includes(rock.id)||mission.optionalState(rock.id)?.destroyed)continue;
    const center=flight.position.clone().add(new THREE.Vector3(0,flight.actor==='astronaut'?EVA_CENTER_Y:0,0));
    const radius=rock.radius+(flight.actor==='astronaut'?EVA_RADIUS:shipFrameRadius(state.moduleStage)*.45);
    const offset=center.sub(rock.position),distance=offset.length();
    if(distance<radius&&distance>.001)flight.applyImpact(offset.divideScalar(distance),Math.min(.12,radius-distance),rock.velocity);
  }
}

function updateActors(dt, input) {
  if (pendingModule && time >= attachAt) { attachJoint = ship.group.getObjectByName(pendingModule === 2 ? 'habitat-front-seal' : 'engine-front-seal'); ship.setStage(pendingModule, !reducedMotion); pendingModule = 0; attachFlashAt = time + (reducedMotion ? .01 : 2.2); }
  ship.group.position.copy(flight.shipPosition); ship.group.quaternion.copy(flight.shipQuaternion);
  astronaut.group.position.copy(flight.astronautPosition);
  bike.group.position.copy(flight.bikePosition);bike.group.quaternion.copy(flight.bikeQuaternion);
  bike.group.visible=state.phase!=='transit'&&!cabinActive();
  bike.update(worldTime,{dt,velocity:flight.actor==='bike'?flight.velocity:new THREE.Vector3(),acceleration:flight.actor==='bike'?flight.thrust:new THREE.Vector3(),boost:input.boost,braking:flight.braking,aiming:time-lastShotAt<1.5||!!aimAssistId,mounted:flight.actor==='bike',firstPerson:visorActive(),reducedMotion});
  if (flight.actor === 'astronaut') {
    if (combat.shot && selectedTarget()) temp.subVectors(selectedTarget().position, flight.position);
    else temp.set(-Math.sin(orbit), 0, -Math.cos(orbit));
    if (temp.lengthSq() > .05) {
      const heading = Math.atan2(-temp.x, -temp.z);
      astronaut.group.rotation.y += Math.atan2(Math.sin(heading - astronaut.group.rotation.y), Math.cos(heading - astronaut.group.rotation.y)) * Math.min(1, dt * (time-lastShotAt<1.5||aimAssistId?12:5));
    }
  }
  const frozen=inspecting||time<assemblyUntil||state.phase==='complete';
  const shipForce=flight.actor==='ship'&&!frozen?flight.thrust:temp.set(0,0,0);
  ship.group.visible=!cabinActive();
  ship.update(worldTime,{dt,acceleration:shipForce,maxAcceleration:flight.braking?6:3,velocity:flight.actor==='ship'?flight.velocity:new THREE.Vector3(),braking:flight.actor==='ship'&&flight.braking,boost:input.boost||state.phase==='transit',reducedMotion});
  if(attachJoint&&time>=attachFlashAt){attachJoint.updateWorldMatrix(true,false);const point=attachJoint.getWorldPosition(new THREE.Vector3());triggerBurst(point,'attach');illuminate(point,0x9deee6,1.3);play('moduleAttach');attachJoint=null;}
  astronaut.group.visible=flight.actor==='astronaut'&&!visorActive();
  const carrying=['suspension','returning'].includes(gemSequence.phase)&&flight.actor==='astronaut';
  astronaut.update(worldTime,{dt,aiming:time-lastShotAt<1.5||!!aimAssistId,interacting:scanning||carrying,acceleration:flight.actor==='astronaut'&&!frozen?flight.thrust:new THREE.Vector3(),maxAcceleration:flight.braking?7:4,velocity:flight.actor==='astronaut'?flight.velocity:new THREE.Vector3(),braking:!frozen&&flight.braking,boost:input.boost,reducedMotion});
  collectionPalm=carrying?poseHeldLeftHand(astronaut.group):null;
  cabinRoot.position.copy(flight.shipPosition);cabinRoot.quaternion.copy(flight.shipQuaternion);
  if(cabin){cabin.update(dt,cabinController.state,{firstPerson:visorActive(),reducedMotion});cabin.group.visible=cabinActive();cabinRoot.updateMatrixWorld(true);}
  if(visor){visor.group.visible=flight.actor==='astronaut'&&visorActive();visor.update(worldTime,{speed:reducedMotion?0:flight.velocity.length(),aiming:time-lastShotAt<1.5||!!aimAssistId,interacting:scanning||gemSequence.phase==='suspension',braking:flight.braking,aspect:camera.aspect});}
  let companionState=gemSequence.active?'travel':scanning?'scan':hazardWarning?'danger':state.phase==='gem'?'gem':'idle';
  const robotInside=flight.actor==='ship';
  if(robotInside!==previousCompanionCabin){companion.reset();previousCompanionCabin=robotInside;}
  companion.group.visible=!robotInside||cabinActive();
  if(robotInside&&cabin){
    cabin.anchors.companion.getWorldPosition(temp);companion.group.position.copy(temp);companion.group.quaternion.copy(flight.shipQuaternion);
    companion.update(worldTime,{dt,state:'cabin',moving:0,reducedMotion});
  }else{
    temp.set(1.8,1.6,.7).applyQuaternion(flight.actor==='bike'?flight.bikeQuaternion:astronaut.group.quaternion).add(flight.position);
    companion.update(worldTime,{dt,targetPosition:temp,targetVelocity:flight.velocity,targetQuaternion:flight.actor==='bike'?flight.bikeQuaternion:astronaut.group.quaternion,state:companionState,reducedMotion});
  }
  tether.visible = flight.actor === 'astronaut';
  if (tether.visible) {
    const a = (flight.base==='bike'?bike.tether:ship.tether).getWorldPosition(new THREE.Vector3()), b = flight.astronautPosition;
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
  if(cabinActive()&&cabin){
    const pose=cabin.cameraPose(cabinController.state,{firstPerson,aspect:camera.aspect,lookYaw:cabinController.canPilot?0:cabinLook-cabinController.state.yaw,lookPitch:cabinController.canPilot?0:cabinLookPitch});
    camera.position.copy(cabin.group.localToWorld(pose.position.clone()));camera.lookAt(cabin.group.localToWorld(pose.target.clone()));camera.fov=pose.fov;camera.near=pose.near;camera.updateProjectionMatrix();return;
  }
  const baseFov = visorActive() ? flight.actor==='bike'?(camera.aspect<1?94:84):flight.actor === 'ship' ? 57 : 72 : 52;
  const pulse = reducedMotion ? 0 : Math.sin(Math.min(1, Math.max(0, eventLightUntil-time)/1.4)*Math.PI)*1.5;
  const warp = !reducedMotion && state.phase === 'transit' ? Math.sin(Math.min(1,(time-transitStart)/5)*Math.PI)*12 : 0;
  const driftFov = reducedMotion || combat.shot || scanning ? 0 : Math.min(1.8,flight.velocity.length()*.12);
  const fov = THREE.MathUtils.damp(camera.fov,baseFov + warp + driftFov - pulse,7,dt);
  if(camera.fov !== fov) { camera.fov = fov; camera.near = .025; camera.updateProjectionMatrix(); }
  zoom = THREE.MathUtils.damp(zoom, targetZoom, 6, dt);
  const focusShip = forcedExterior();
  const focus = focusShip ? flight.shipPosition : flight.position;
  const smoothing = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
  cameraTarget.copy(focus).add(new THREE.Vector3(0, !focusShip && flight.actor==='bike' ? 1.25 : flight.actor === 'astronaut' && !focusShip ? .9 : .3, 0));
  if (visorActive()) {
    if (flight.actor === 'ship') {
      shipPoint('eye', flight.shipPosition, flight.shipQuaternion, camera.position);
      camera.quaternion.copy(flight.shipQuaternion);
    } else {
      if(flight.actor==='bike'){bike.eye.updateWorldMatrix(true,false);bike.eye.getWorldPosition(camera.position);camera.position.add(new THREE.Vector3(0,0,.12).applyQuaternion(flight.bikeQuaternion));}
      else camera.position.copy(flight.astronautPosition).add(new THREE.Vector3(0, 1.69, 0));
      if (combat.shot && selectedTarget()) lookTarget.copy(selectedTarget().position);
      else lookTarget.copy(camera.position).add(new THREE.Vector3(-Math.sin(orbit) * Math.cos(elevation), -Math.sin(elevation), -Math.cos(orbit) * Math.cos(elevation)).multiplyScalar(20));
      camera.lookAt(lookTarget);
    }
  } else {
    const portrait = Math.max(1, .78 / camera.aspect);
    const distance = (focusShip || flight.actor === 'ship' ? shipFrameRadius(state.moduleStage) * 2.8 + 5 : flight.actor==='bike'?6.5:7.5) * zoom * portrait;
    const angle = focusShip ? .42 : flight.actor === 'ship' ? .27 - flight.shipPitch * .45 : elevation;
    const revealOrbit = !reducedMotion && time < assemblyUntil ? Math.sin(Math.max(0,3.4-(assemblyUntil-time))/3.4*Math.PI)*.28 : 0;
    const heading = (flight.actor === 'ship' && !focusShip ? flight.shipYaw : orbit) + revealOrbit;
    cameraPosition.set(Math.sin(heading) * Math.cos(angle), Math.sin(angle), Math.cos(heading) * Math.cos(angle)).multiplyScalar(distance).add(cameraTarget);
    if(!focusShip){
      const aimDirection=new THREE.Vector3(-Math.sin(orbit)*Math.cos(elevation),-Math.sin(elevation),-Math.cos(orbit)*Math.cos(elevation));
      const shoulder=new THREE.Vector3().crossVectors(aimDirection,up).normalize().multiplyScalar(flight.actor==='ship'?1.1:.5);
      cameraPosition.copy(cameraTarget).addScaledVector(aimDirection,-distance).addScaledVector(up,flight.actor==='ship'?3:1.2).add(shoulder);
      camera.position.lerp(cameraPosition,smoothing);camera.lookAt(lookTarget.copy(camera.position).addScaledVector(aimDirection,30));
    }else{camera.position.lerp(cameraPosition,smoothing);camera.lookAt(cameraTarget);}
  }
  const leanTarget = reducedMotion || combat.shot || scanning || forcedExterior() ? 0 : THREE.MathUtils.clamp(-flight.thrust.x*.004,-.012,.012);
  cameraLean = THREE.MathUtils.damp(cameraLean,leanTarget,4,dt); camera.rotateZ(cameraLean);
}
function updateMissionUI() {
  const content = !flight.shipDiscovered ? ['Una nave <br/>por encontrar.','Nóma detecta nuestra nave cerca de aquí. Explorá con la moto; usá el impulso para cubrir distancia.','Buscar la nave'] : {
    scan: ['Todo empieza <br/>con una señal.', 'Buscá el pulso de la baliza y bajá para escanear. Podés explorar con la moto o tu nave.', 'Consultar rumbo'],
    small: ['Abrir un camino.', 'Explorá las regiones y buscá el brillo cian. Podés disparar desde la moto o con el traje. No estamos solos en este sector.', 'Consultar región'],
    large: ['La fuerza <br/>de tu nave.', 'Buscá el brillo dorado de los núcleos. Volvé a bordo y abrí paso con el cañón.', 'Consultar región'],
    gem: ['Una conexión <br/>más.', 'Recuperá la gema con el astronauta. Si está lejos, acercá primero la nave y después salí.', 'Ubicar la gema'],
    return: ['El siguiente <br/>horizonte.', 'La gema viaja con vos. Volvemos a bordo hacia el siguiente horizonte.', 'Regreso en curso…'],
    transit: ['Pieza por pieza.', 'Rumbo al próximo sector. Preparando el acople de tu nave.', 'En tránsito…'],
    complete: ['Lo construimos <br/>juntos.', 'Tres sectores recorridos, tres gemas recuperadas. Tu nave está completa.', 'Nueva expedición'],
  }[state.phase];
  $('missionTitle').innerHTML = content[0]; $('missionDescription').textContent = content[1];
  $('missionButton').textContent=gemSequence.active?'Próximo horizonte…':content[2]+' ↗';
  $('missionButton').disabled = paused || gemSequence.active || flight.returning || state.phase === 'transit' || time < assemblyUntil;
  $('biomeName').textContent = `${String(state.sector + 1).padStart(2, '0')} / ${state.layout.name.toUpperCase()}`;
  $('sectorNumber').textContent = `SECTOR ${String(state.sector + 1).padStart(2, '0')}`;
  $('sectorName').textContent = state.layout.name.split(' · ')[0].toUpperCase();
  $('cockpitFrame').firstElementChild.textContent = `${state.layout.name.split(' · ')[0].toUpperCase()} / CONTROL DE VUELO`;
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
      cabinMode:cabinController.inside&&!cabinController.canPilot?cabinController.state.mode:null, canSit:cabinController.canSit, sequence:gemSequence.active,targetKind:selectedTarget()?.kind,
      shipDiscovered:flight.shipDiscovered,canBoardShip:flight.canBoardShip,base:flight.base,freeAim:true,
      actionDistance, targetDistance: distance, weaponRange: WEAPON_RANGE[flight.actor], chance });
  const titles = {
    scan: 'Escaneá la baliza', small: 'Asteroides EVA · pulso cian',
    large: flight.actor === 'astronaut' ? 'Volvé a la nave' : 'Despejá los núcleos',
    gem: 'Recuperá la gema', return: 'Gema recuperada · De vuelta a la nave',
    transit: 'Viajando al próximo sector', complete: 'Expedición completa',
  };
  $('mobileSector').textContent = `${state.layout.name.split(' · ')[0]} · ${String(state.sector + 1).padStart(2, '0')} / 03`;
  $('mobileObjective').textContent = !flight.shipDiscovered?'Encontrá tu nave':cabinActive()&&!cabinController.canPilot?'Puesto de mando':inspecting ? 'Inspección de la nave' : assemblyLocked ? 'Ensamblando tu nave' : titles[state.phase];
  $('mobileProgress').textContent = total && !inspecting ? `${done} / ${total}` : '';
  $('mobileHealth').textContent = `♡ ${health}%`;
  $('mobileHealth').setAttribute('aria-label', `Integridad: ${health}%`);
  $('mobileHealth').classList.toggle('danger', health <= 50);
  $('mobileCable').textContent = flight.actor === 'astronaut' ? `Cable ${Math.round(flight.tetherLength)} / 26 m` : flight.actor==='bike'?'Moto · Boost disponible':'A bordo';
  $('mobileCable').classList.toggle('danger', flight.tension > .8);
  $('mobileActionLabel').textContent = mobileAction.label;
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
  $('mobileGuideButton').textContent=state.phase==='complete'?'Nueva expedición':'Consultar rumbo';
  $('mobileGuideButton').disabled = locked || flight.returning || !!combat.shot;
  $('mobileReturnButton').disabled = actorLocked || flight.actor === 'ship' || flight.returning;
  $('mobileDeployButton').disabled = actorLocked || flight.actor === 'astronaut';
  $('mobileViewButton').textContent = visorActive() ? 'Pasar a vista exterior' : flight.actor === 'ship' ? 'Ver desde la cabina' : 'Ver desde el visor';
  $('mobileViewButton').disabled = locked || state.phase === 'complete';
  $('mobileQuickViewLabel').textContent = cabinActive()?(firstPerson?'Piloto 3D':cabinController.canPilot?'Exterior':'Primera'):visorActive()?'Exterior':flight.actor==='ship'?'Cabina':'Visor';
  $('mobileQuickViewButton').setAttribute('aria-label', visorActive() ? 'Volver a la vista exterior' : flight.actor === 'ship' ? 'Ver desde la cabina de la nave' : 'Ver desde el visor del astronauta');
  $('mobileQuickViewButton').setAttribute('aria-pressed', String(visorActive()));
  $('mobileQuickViewButton').disabled = paused || locked || state.phase === 'complete';
  $('mobileInspectButton').textContent = inspecting ? 'Volver a explorar' : 'Inspeccionar nave';
  $('mobileInspectButton').disabled = !!combat.shot || gemSequence.active || locked;
  $('mobileSoundButton').textContent = soundEnabled&&soundReady ? 'Silenciar sonido' : 'Activar sonido';
  $('mobileSoundButton').setAttribute('aria-pressed', String(soundEnabled&&soundReady));
}
function updateHUD() {
  updateMissionUI();
  const target = selectedTarget(), obj = objective();
  const distance = target ? flight.position.distanceTo(target.position) : Infinity;
  const weaponReady=correctWeapon(target);
  health=flight.integrity;
  const chance=1;
  $('fireButton').disabled = blocked() || flight.returning || combat.cooldown > 0;
  $('targetButton').disabled = blocked() || !!combat.shot || !validTargets().length;
  $('astronautButton').disabled = paused || gemSequence.active || inspecting || flight.actor === 'astronaut' || !!combat.shot || state.phase === 'complete';
  $('shipButton').disabled = blocked() || flight.actor === 'ship' || flight.returning || !!combat.shot || state.phase === 'complete';
  $('astronautButton').setAttribute('aria-pressed', String(flight.actor === 'astronaut')); $('shipButton').setAttribute('aria-pressed', String(flight.actor === 'ship'));
  const actionDistance = state.phase === 'scan' ? flight.position.distanceTo(world.beacon.position) : flight.position.distanceTo(world.gem.position);
  $('interactButton').disabled = blocked() || flight.returning || !!combat.shot || flight.actor !== 'astronaut' || !['scan', 'gem'].includes(state.phase) || actionDistance > (state.phase === 'scan' ? 3.8 : 3);
  $('interactButton').querySelector('span').textContent = state.phase === 'scan' ? scanning ? 'Escaneando…' : 'Escanear' : 'Recoger gema';
  $('scanTrack').firstElementChild.style.width = `${scanning ? scanProgress * 100 : combat.shot ? Math.min(100, combat.shot.elapsed / combat.shot.lockTime * 100) : 0}%`;
  const total = ['small', 'large'].includes(state.phase) ? state.layout[state.phase].length : 0;
  const done = total ? state.layout[state.phase].filter(item => state.destroyed.includes(item.id)).length : 0;
  updateMobileHUD({ distance, actionDistance, chance, done, total });
  $('targetReadout').textContent = combat.cooldown>0?'RECARGANDO':aimAssistId?'BLANCO EN MIRA · DISPARO LIBRE':flight.actor==='bike'?'MOTO · F PARA DISPARAR · SHIFT IMPULSO':'MIRA LIBRE · ARRASTRÁ PARA ORIENTAR';
  $('healthValue').textContent = `${health}%`; $('healthBar').style.width = `${health}%`;
  $('healthBar').parentElement.parentElement.classList.toggle('danger', health <= 50);
  $('cableTitle').textContent = flight.actor === 'astronaut' ? 'CABLE' : flight.actor==='bike'?'MOTO':'PILOTO';
  $('cableValue').textContent = flight.actor === 'astronaut' ? `${Math.round(flight.tetherLength)} / 26 m` : flight.actor==='bike'?'MONTADO':'A BORDO';
  $('cableBar').style.width = `${flight.actor === 'astronaut' ? flight.tetherLength / 26 * 100 : 100}%`;
  $('cableBar').parentElement.parentElement.classList.toggle('danger', flight.tension > .8);
  $('motionReadout').textContent = flight.braking ? 'ESTABILIZANDO' : flight.thrust.length() > .12 ? 'PROPULSORES' : flight.velocity.length() > .15 ? 'DERIVA' : 'ESTABLE';
  $('brakeButton').classList.toggle('active', flight.braking);
  $('hazardWarning').hidden = !hazardWarning;
  if (hazardWarning) {
    play('warning');
    projected.copy(hazardWarning.position).project(camera);
    const arrow = projected.z > 1 ? '↶' : projected.x < -.25 ? '←' : projected.x > .25 ? '→' : projected.y > .25 ? '↑' : '↓';
    $('hazardWarning').textContent = `${arrow} TRAYECTORIA DE IMPACTO · ${hazardWarning.time.toFixed(1)} s`;
  }
  $('flightReadout').textContent = `ALT ${flight.position.y >= 0 ? '+' : ''}${flight.position.y.toFixed(1)} m · ${flight.velocity.length().toFixed(1)} m/s`;
  $('missionHint').textContent=flight.tension>.8?'Cable cerca del límite. Abordá y acercá la nave.':'Explorá las regiones · Acercate para descubrir objetivos.';
  $('viewButton').disabled = paused || time < assemblyUntil || state.phase === 'transit' || state.phase === 'complete';
  $('viewButton').textContent = cabinActive()?`Vista: cabina ${firstPerson?'1ª':'3ª'}`:visorActive()?'Vista: visor':'Vista: exterior'; $('viewButton').setAttribute('aria-pressed', String(visorActive()));
  document.body.classList.toggle('free-aim',!blocked()&&!flight.returning&&state.phase!=='complete');
  document.body.classList.toggle('first-person', visorActive()); document.body.classList.toggle('aiming', !!combat.shot); document.body.classList.toggle('damage', time < damageUntil);
  $('cockpitFrame').hidden = !(visorActive() && flight.actor === 'ship');
  const aimEnemy=encounters.entities.find(e=>e.id===aimAssistId);
  $('lockLabel').textContent=aimEnemy?`${aimEnemy.kind==='alienShip'?'NAVE HOSTIL':'VISITANTE'} · ${Math.ceil(aimEnemy.health/aimEnemy.maxHealth*100)}%`:aimAssistId?'BLANCO EN MIRA':'';
  $('reticle').classList.toggle('has-target',!!aimAssistId);
  $('bikeButton').disabled=blocked()||flight.returning||!flight.canMountBike;
  $('mobileBikeButton').disabled=gemSequence.active||!flight.canMountBike;
  $('mobileRideButton').hidden=flight.actor==='bike'||!flight.canMountBike;
  $('mobileRideButton').disabled=blocked()||flight.returning;
  $('mobileDismountButton').hidden=flight.actor!=='bike'||mobileAction.action==='deploy';$('mobileDismountButton').disabled=blocked()||flight.returning;
  $('mobileFreeFireButton').hidden=gemSequence.active||state.phase==='complete';$('mobileFreeFireButton').disabled=blocked()||flight.returning||combat.cooldown>0;
  const label = $('objectiveLabel');
  label.hidden = !obj || inspecting || !!combat.shot || ['transit', 'complete'].includes(state.phase);
  label.dataset.kind=obj?.kind||'';
  if (obj && !label.hidden) {
    projected.copy(obj.position).add(new THREE.Vector3(0, 2, 0)).project(camera);
    const behind = projected.z > 1 || projected.z < -1;
    const rawX = (projected.x + 1) * innerWidth / 2, rawY = (1 - projected.y) * innerHeight / 2;
    temp.copy(obj.position).sub(camera.position).applyQuaternion(camera.quaternion.clone().invert());
    const minY = compactHUD.matches ? innerHeight < 500 ? 85 : 140 : 115;
    const maxY = Math.max(minY + 20, innerHeight - 190);
    const y = THREE.MathUtils.clamp(behind ? (minY + maxY) / 2 : rawY, minY, maxY);
    const outside = behind || Math.abs(projected.x) > .9 || Math.abs(projected.y) > .85;
    const arrow = behind ? temp.x < 0 ? '← ' : '→ ' : outside ? projected.x < -.9 ? '← ' : projected.x > .9 ? '→ ' : projected.y > 0 ? '↑ ' : '↓ ' : '◇ ';
    label.textContent = `${arrow}${obj.label}${['scan', 'gem'].includes(state.phase) ? ` · ${Math.round(flight.position.distanceTo(obj.position))} m` : ''}`;
    const inset=Math.min(innerWidth/2,label.offsetWidth/2+12);
    const x=THREE.MathUtils.clamp(behind?temp.x<0?inset:innerWidth-inset:rawX,inset,innerWidth-inset);
    label.style.left = `${x}px`; label.style.top = `${y}px`;
  }
  const inside=cabinController.inside&&!forcedExterior();
  for(const id of ['cabinButton','mobileCabinButton']){$(id).hidden=!inside;$(id).textContent=cabinController.canPilot?'Pararse':'Sentarse';$(id).disabled=paused||gemSequence.active||(!cabinController.canPilot&&!cabinController.canSit);}
  document.body.classList.toggle('in-cabin',inside&&!cabinController.canPilot);
  canvas.dataset.cabin=cabinController.state.mode;canvas.dataset.discovered=String(state.discovered.length);
  canvas.dataset.sequence=gemSequence.phase;canvas.dataset.destroyed=String(state.destroyed.length);
  // Read-only telemetry supports diagnostics without exposing mutation or skip controls.
  canvas.dataset.phase = state.phase; canvas.dataset.actor = flight.actor; canvas.dataset.sector = String(state.sector);
  canvas.dataset.position = `${flight.position.x.toFixed(2)},${flight.position.y.toFixed(2)},${flight.position.z.toFixed(2)}`;
  canvas.dataset.speed = flight.velocity.length().toFixed(3); canvas.dataset.thrust = flight.thrust.length().toFixed(3);
  canvas.dataset.heading = `${flight.shipYaw.toFixed(3)},${flight.shipPitch.toFixed(3)}`;
  canvas.dataset.tether = flight.tetherLength.toFixed(2); canvas.dataset.health = String(health);
  canvas.dataset.view = cabinActive()?(firstPerson?'cabina-primera':'cabina-tercera'):visorActive()?'visor':'exterior';
  canvas.dataset.quality = qualityScale.toFixed(2);
  canvas.dataset.enemies=String(encounters.entities.length);canvas.dataset.projectiles=String(ballistics.projectiles.length);canvas.dataset.shipDiscovered=String(flight.shipDiscovered);
  canvas.dataset.models = 'bike-encounters-originals-v1'; canvas.dataset.triangles = String(renderer.info.render.triangles);
  canvas.dataset.navigating = String(navigating); canvas.dataset.scanning = String(scanning);
  canvas.dataset.shot = ballistics.projectiles.some(p=>p.owner==='player')?'flight':''; canvas.dataset.ready = 'true';
}
function handlePhaseChange() {
  if (state.phase === previousPhase) return;
  previousPhase = state.phase; navigating = false; selectedId = null;
  if (state.phase === 'large') { void prepareGem();say('Campo despejado. Volvé a la nave: estos núcleos requieren su cañón.'); notify('Paso despejado · Volvé a la nave',5); }
  if (state.phase === 'gem') { say('La gema está libre. Acercá la nave y salí para recuperarla.'); notify('Energía liberada · Gema localizada', 5); play('gemReveal'); triggerBurst(new THREE.Vector3().copy(state.layout.gem),'gem'); }
  updateMissionUI();
}
ship.setStage(state.moduleStage, false); companion.group.position.copy(flight.position).add(new THREE.Vector3(1.8,1.6,.7));camera.position.set(12, 9, 27); updateMissionUI();
updateSoundUI();
saveProgress();
if (saved) notify(saved.complete ? 'Tu expedición está completa · Podés inspeccionar la nave' : `Continuamos en ${state.layout.name.split(' · ')[0]} · Progreso recuperado`, 6);
else {notify('Arrastrá para orientar · Shift / ⟫ activa el boost',6);say('Moto lista. Busquemos nuestra nave.');}
if(saved&&flight.shipDiscovered){void prepareView('cabin');void prepareProjectile();}
if(['large','gem','return','transit','complete'].includes(state.phase))void prepareGem();
if(state.phase==='return')gemSequence.start({aboard:true});
function animate(now) {
  const realDelta = Math.max(0, (now - lastFrame) / 1000);
  lastFrame=now;
  const tick=momentClock.advance(realDelta,{paused,aiming:!!combat.shot,reducedMotion});
  const dt=tick.dt,worldDt=tick.worldDt;time=tick.time;worldTime=tick.worldTime;
  const input=controls.sample();
  if(!paused){
    actionProtectedFrame=scanning||gemSequence.active;
    if(encounters.pending)void prepareEnemy('alienShip');
    if(flight.shipDiscovered&&!shipWasDiscovered){shipWasDiscovered=true;void prepareProjectile();say('Encontramos la nave. Podés abordarla o seguir con la moto.');notify('Nave localizada · Ya podés elegir vehículo',5);saveProgress();}
    if(['gem','return','transit'].includes(state.phase)||gemSequence.active)void prepareNextStage();
    if(!cabin&&!viewLoad&&(state.phase==='small'||flight.actor==='ship'||['returning','boarding'].includes(gemSequence.phase)))void prepareView('cabin');
    if(!combat.shot&&!gemSequence.active){
      if(cabinController.inside&&!cabinController.canPilot){
        cabinLook-=input.lookX*.005;
        cabinLookPitch=THREE.MathUtils.clamp(cabinLookPitch-input.lookY*.004,-1.1,1.1);
      }else{
        orbit-=input.lookX*.005;
        elevation=THREE.MathUtils.clamp(elevation+input.lookY*.004,-1.1,1.1);
      }
    }
    world.sync(state,worldTime,{reducedMotion,scanning,optionalState:mission.optionalState});
    if(flight.shipDiscovered&&!gemSequence.active&&!inspecting){const found=mission.discover(flight.position,38);if(found.length){
      ensureTarget(found);saveProgress();
      if(!combat.shot){
        const required=world.targets.some(target=>found.includes(target.id)&&target.kind===state.phase);
        if(required)say(state.phase==='small'?'Ahí está el brillo cian. Ese asteroide se alcanza con el arma del traje.':'Un núcleo de brillo dorado. Para romperlo necesitamos el cañón de la nave.');
      }
    }}
    ensureTarget();
    previousPosition.copy(flight.position);previousQuaternion.copy(flight.shipQuaternion);collisionActor=flight.actor;
    updateFlight(worldDt,input);updateScan(dt);updateCombat(dt,worldDt);handlePhaseChange();ensureTarget();updateCinematic(dt);
    updateHazards();updateActors(worldDt,input);updateCamera(dt,input);
    const aim=aimRay();aimAssistId=assistAim({...aim,targets:combatTargets(),maxDistance:WEAPON_RANGE[flight.actor],coneAngle:THREE.MathUtils.degToRad(4),strength:.32}).targetId;
    carriedGem.visible=['suspension','returning'].includes(gemSequence.phase)&&flight.actor==='astronaut';
    interactionArm.update(worldTime,{interacting:flight.actor==='astronaut'&&visorActive()&&(scanning||carriedGem.visible),reducedMotion,aspect:camera.aspect});
    if(carriedGem.visible){
      const frame=visorActive()?camera:astronaut.group,rotation=frame.getWorldQuaternion(new THREE.Quaternion());
      const palm=(visorActive()?interactionArm.palm:collectionPalm).getWorldPosition(new THREE.Vector3());
      const center=palm.add(new THREE.Vector3(0,.14,0).applyQuaternion(rotation));
      const p=THREE.MathUtils.smoothstep(Math.min(1,(time-gemPickupAt)/1.35),0,1);
      carriedGem.position.lerpVectors(gemPickupOrigin,center,p);carriedGem.quaternion.slerpQuaternions(gemPickupRotation,rotation,p);
    }
    world.gate.visible=false;
    const awaitingView=flight.actor==='ship'&&interiorView&&!cabin;
    if(!graphicsRecoveryActive){
      if(awaitingView){$('loading').hidden=false;$('loading').style.opacity='1';$('loading').querySelector('p').textContent='Preparando el puesto de mando…';$('loading').dataset.view='waiting';}
      else if($('loading').dataset.view==='waiting'&&!stageWaiting){$('loading').hidden=true;delete $('loading').dataset.view;}
    }
    camera.updateMatrixWorld();viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);viewFrustum.setFromProjectionMatrix(viewProjection);
    mission.updatePopulations(worldTime,{playerPosition:flight.position,isVisible:(p,r)=>{respawnSphere.center.copy(p);respawnSphere.radius=r;return viewFrustum.intersectsSphere(respawnSphere);}});
    const target=selectedTarget();selection.visible=!!target&&!inspecting&&!gemSequence.active&&!cabinActive();
    if(target){selection.position.copy(target.position);selection.quaternion.copy(camera.quaternion);selection.scale.setScalar(target.radius*1.2);selection.material.color.setHex(target.kind==='small'?0x65e9e1:target.kind==='large'?0xffbd66:target.kind==='hazard'?0xef886c:0xa3afb8);}
    effects.update(worldTime,camera,{reducedMotion,travel:state.phase==='transit'?Math.min(1,gemSequence.age/1.2):0,velocity:flight.velocity});
    if(time>toastUntil)$('toast').classList.remove('visible');if(time>subtitleUntil)$('companionSubtitle').hidden=true;
    const soundActive=!paused&&!inspecting&&state.phase!=='complete';
    audio.update({actor:flight.actor==='bike'?'ship':flight.actor,thrust:soundActive?flight.thrust.length()/(flight.actor==='ship'?3:flight.actor==='bike'?9:4):0,boost:soundActive&&(input.boost||state.phase==='transit'),braking:soundActive&&flight.braking,biome:state.layout.biomeId,firstPerson:visorActive(),time,aiming:!!combat.shot||scanning,relic:state.phase==='gem'});
    if(tick.scale<.99&&!slowAudioActive){play('slowEnter');slowAudioActive=true;}else if(tick.scale>=.99&&slowAudioActive){play('slowExit');slowAudioActive=false;}
    if(!settings.introSeen&&time>tutorialUntil){settings.introSeen=true;saveProgress();}
  }
  hudTimer += dt;
  if (hudTimer > .1) { updateHUD(); hudTimer = 0; }
  const veil = state.phase === 'transit' ? THREE.MathUtils.clamp((gemSequence.age - 5.3) / .6, 0, 1) : THREE.MathUtils.clamp((arrivalVeilUntil - time) / .6, 0, 1);
  $('transitionVeil').style.opacity = String(veil);
  sun.color.setHex(world.lighting.sun); rim.color.setHex(world.lighting.fill);
  ambient.intensity = state.layout.biomeId === 'vesper' ? 1.35 : 1.05;
  cameraFill.position.copy(camera.position); cameraFill.target.position.copy(flight.position).add(new THREE.Vector3(0,1,0));
  sun.target.position.copy(flight.position); sun.position.copy(flight.position).add(new THREE.Vector3(-30, 45, 20));
  renderer.shadowMap.needsUpdate = frames % (mobileGPU ? 2 : 1) === 0;
  eventLight.intensity = reducedMotion ? 0 : Math.max(0, eventLightUntil - time) * 26;
  renderer.toneMappingExposure = world.lighting.exposure;
  destruction.update(worldTime);
  presentation.setBloom(.16 + (reducedMotion ? 0 : Math.min(.13, Math.max(0,eventLightUntil-time)*.09)) + (state.phase === 'transit' && !reducedMotion ? .07 : 0));
  presentation.render(scene, camera, world);
  if (!paused && realDelta > 0 && realDelta < .25 && frames > 120) {
    qualityElapsed += realDelta; qualityFrames++;
    if (qualityElapsed >= 4) {
      const rate = qualityFrames / qualityElapsed;
      canvas.dataset.fps = rate.toFixed(1);
      const next = 1; // Preserve the agreed resolution; optimize loading, not image sharpness.
      if (next !== qualityScale) {
        qualityScale = next;
        renderer.setPixelRatio(renderPixelRatio() * qualityScale);
        renderer.setSize(innerWidth, innerHeight); presentation.resize();
      }
      qualityElapsed = qualityFrames = 0;
    }
  }
  if (++frames === 2 && !stageWaiting && !graphicsRecoveryActive) { $('loading').style.opacity = '0'; setTimeout(() => { if(!graphicsRecoveryActive&&!stageWaiting&&$('loading').dataset.view!=='waiting')$('loading').hidden = true; }, reducedMotion ? 0 : 550); }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
