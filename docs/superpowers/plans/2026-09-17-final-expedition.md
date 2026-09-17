# Gravedad Zero Final Expedition Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development, behavioral tests before mechanic changes, scoped reviews and a whole-branch review. The user approved implementation and one integrated publication; continue without repeating approval gates.

**Goal:** Ship the complete approved three-sector expedition with new gem/projectile, discoverable moving worlds, epic propulsion, cinematic continuity and a walkable cockpit.
**Architecture:** Keep plain Three.js, the existing pure mission/flight/combat contracts and local assets. Separate cabin locomotion, population trajectories and presentation time into small modules; root owns main.js integration. Independent file ownership permits concurrent implementation; no worker stages/commits another worker's changes.
**Tech Stack:** Vendor Three.js r179 ES modules, GLB/Meshopt, Blender Python for asset adaptations, DOM controls, Web Audio, Node test runner, Playwright real browser QA, current Vercel site.
**Spec:** docs/superpowers/specs/2026-09-17-final-expedition-design.md

## Global constraints

- Preserve 3 EVA objectives per sector and 1/2/3 ship cores, then gem. Optional/hazard kills never count; mandatory objectives never respawn.
- Hazards can be destroyed/dodged; controlled varied continuous trajectories; optional populations respawn gradually off-camera/far from player.
- Temporary action protection includes health, interruption and displacement during aim/fire/scan/gem chain. Free flight retains risk.
- New Aether Shard and Aethercore GLBs; same uniformly scaled projectile for both weapons. No new turret model required.
- Keep current approved character/ship design; source Downloads untouched. Approved local edits: cockpit furnishing/scale/contacts, astronaut clips, gem material mask and functional asset anchors.
- Only cockpit walkable; magnetic boots; ship stabilizes when standing. First/third person inside and outside, both hands pilot, holster tool.
- Robot sounds + brief subtitles. Mobile analog joystick with arrows option; preserve reliable pointer/touch cancellation.
- No permanent corridor. Gem -> physical return -> board/cable -> travel/loading -> ready biome -> module docking; third gem ends complete ship.
- All three biomes, wrapped mineral/tech surfaces, model fidelity, engine/jetpack/companion fire, zero-G explosions and gem, audio and UI are included.
- Preserve approximate 720p agreed rendering; no silent mobile asset/texture/effect downgrade. Measure rather than claiming physical-iPhone performance.
- No paid generation needed. One public release only after integrated QA. Root owns deployment and source merges.

## Task 1: Mission layout, moving populations and persisted progression

**Files:** src/lowpoly/expedition.js, hazards.js, combat.js, checkpoint.js; new populations.js if useful; associated tests.
**Consumes:** existing createExpedition(seed), state.layout, createCombat(), flight actor names astronaut/ship.
**Produces:** backward-compatible mission API plus independent optional rock health/destruction and discovery state; motion sampling keyed stable IDs. Public new signatures documented in report for main/world consumers.

- [ ] Write failing behavioral tests: destroying optional hazard never changes mandatory counts; mandatory destroyed IDs survive restore; last actual destroyed core determines gem position; different seeds distribute discoveries among separated regions; off-camera respawn cannot intersect player exclusion zone.
- [ ] Run targeted node --test and capture expected failures.
- [ ] Implement separated sector routes with vertical depth, accessible 26m EVA excursions from repositioned ship, 3 EVA and 1/2/3 cores; optional role populations with bounded controlled continuous trajectories.
- [ ] Extend combat for optional dangers/breakables without weakening mission weapon roles. Keep RNG and third-valid-shot guarantee; interruption preserves streak.
- [ ] Extend versioned checkpoints with partial scan/objectives, validated IDs and safe restore; retain compatible old saves.
- [ ] Run target tests, self-review and report interfaces. Root integrates consumers.

Example behavior fixture:
```js
const mission = createExpedition(123);
// Call optional-population destruction through its real API.
// Assert mission.state.destroyedSmall remains 0 and phase remains scan.
// Then destroy mission IDs with correct actor and assert exactly one increment per ID.
```

## Task 2: Propulsion, actor inertia and companion

**Files:** src/lowpoly/asset-actors.js, plasma.js, spatial.js, new thruster-anchors.js/actor-motion.js if useful; associated tests. Do not edit main.js or cabin modules.
**Consumes:** real actor GLBs and existing update(time,{thrust,braking,boost,...}); new optional dt/velocity/acceleration values are backward compatible.
**Produces:** ship/astronaut/companion factories with stage-aware surface emitters and documented update context; companion semantic states for root events.

- [ ] Inspect actual source geometry and axes. Establish measured nozzle table per stage, including eight final exposed nozzles; tether/door/muzzle match actual surfaces.
- [ ] Write failing tests for hidden nozzle suppression, direction-specific thrust, particles retaining world position when actor turns, normalized throttle and reset/disposal.
- [ ] Implement volume/turbulence/core/filaments/light/particles and world-space emission history. Support RCS, main acceleration, boost, braking and coast-down.
- [ ] Add acceleration-driven body lean and damped visual idle independent of navigation orientation. Jetpack anchors follow backpack/bone, preserve hand grip.
- [ ] Add companion local emitters, inertial following/orientation, reactions without covering aim. Do not require new rig for rigid-body behavior.
- [ ] Preserve/update existing factory contracts and report all fields root should pass. Tests and scoped visual inspection before declaring done.

## Task 3: Walkable cockpit and pilot asset/controller

**Files:** new src/lowpoly/cabin.js, cabin-controller.js; tools/build-final-cabin.py or equivalent reproducible source; assets/runtime final cabin/animation assets; tests/cabin.test.mjs. Do not edit asset-actors.js/main.js/controls.js.
**Consumes:** current cabin and full astronaut GLB rig; ship local coordinates; root supplies ship pose, input and view mode.
**Produces:** createCabinController() with state mode and transitions for enter/sit/stand/exit, update(dt,input); createWalkableCabin(assets) with group, pilot, camera/contact anchors and update; report exact integration.

- [ ] Read existing cabin geometry/source and astronaut bones/clips. Fit 1.899m actor inside current capsule envelope, preserve exterior design and dashboard material.
- [ ] Build detailed seat, clear circulation/access, walls/floor/colliders and hand/foot contact anchors. Prepare two hands and Pilot, walk, sit/stand/reach poses; holster tool.
- [ ] Write failing tests for seat->brake->standing, movement bounded to interior, console/seat obstruction, sit and EVA access. Test actual controller, not source strings.
- [ ] Implement local navigation with magnetic boots, stable third-person interior camera constraints and first-person anchors. No habitat/engine rooms.
- [ ] Produce reusable asset/artifact with an inspection render/viewer; preserve Downloads. Verify posture contacts and clipping in Three.js.
- [ ] Document root integration of stabilization and interior actor visibility, plus exact exports.

## Task 4: New gem/projectile, staged resources and audio

**Files:** root owns asset-loading.js; new mission-assets.js; assets/runtime/mission-models and matching images; tools asset preparation; audio.js.
**Consumes:** Downloads Aether Shard and Aethercore Torpedo; existing GLTF/Meshopt and WAVs.
**Produces:** loadMissionAssets(), reusable gem/projectile templates with orientation/scale/material handling; shared resources disposed safely; audio events for moments/interior.

- [ ] Inspect source GLB axis/materials, import without simplification. Gem metal stays opaque while crystal gets selective optical treatment; use mask/material separation.
- [ ] Test sharing/release/failure with real resource ownership where practical; no duplicated downloads or retained parser buffers.
- [ ] Prepare separate external images/shared texture cache; limit decode/audio concurrency. Make lifecycle release account for reference owners.
- [ ] Preserve initial playable fidelity; preload phase/view resources before reveal, world textures ready before stage switch. Expose progress and recoverable failures.
- [ ] Reuse slow-motion/zero-G sounds and event map. Subtitles are readable without sound.

## Task 5: World geometry, biomes, atmosphere and discovery presentation

**Files:** sector-world.js, materials.js, presentation.js if necessary, world-specific helper; tests/world-assets.test.mjs.
**Consumes:** Task1 layout/population trajectories; Task4 new gem template; existing selected surface maps.
**Produces:** backward-compatible world.load/sync/updateSky plus prepare-ready lifecycle, role-aware objects, moving atmosphere and appropriate hit/discovery references.

- [ ] Use seven approved rock surfaces with role independent of appearance; vary scale/orientation/composition/silhouette and remove dominant ugly generic formations.
- [ ] Apply mineral/tech triplanar maps to source without UV, preserve brown source UV. Reuse geometries/materials; do not instantiate 205k triangles indiscriminately for 218 ambient objects.
- [ ] Compose Nereida/Vesper/Umbra foreground/mid/far layers; retain useful mapped planets, adjust angular scale/anillos and readable Vesper illumination.
- [ ] Move dust and rock populations, keep objects discoverable in nearby windows. No global object labels as spoilers.
- [ ] Gate/corridor hidden during exploration; transition visuals belong to cinematics. Dispose replaced worlds without freeing shared assets.
- [ ] Test deterministic transforms, preparation/disposal and late async results; real browser previews across three worlds.

## Task 6: Combat VFX, zero-G time and cinematic chain

**Files:** effects.js, destruction.js; new presentation-clock.js/cinematics.js; root main.js integration.
**Consumes:** mission events, new models, actor hand/muzzle/door anchors, staged-world readiness.
**Produces:** time-scale envelope restored after interruption, layered shot/impact/gem/acople effects, skippable presentation with idempotent mission transitions.

- [ ] Write failing tests: overlapping slow moments restore normal clock; pause/reset does not leave slow state; skip cannot duplicate gem/module or bypass load readiness.
- [ ] Add flash/fissure/debris inherited velocity/dust/residue, no dangerous debris; pooled slots cannot evict required events blindly.
- [ ] Gem from last real core, hand follows animated target, stronger suspension, physical return then board then automatic travel. Cable reels and disappears.
- [ ] Stage transition coordinates load/camera/sound/biome/acople; third gem ends complete ship. Do not retain manual gate traversal.
- [ ] Preserve hit/miss semantics and aim/scan protection through resolution frame; main updates action times separately from presentation and input.

## Task 7: Inputs, HUD, recovery and full runtime integration

**Files:** root main.js, index.html, styles.css, controls.js, mobile-actions.js; integration tests and browser QA.
**Consumes:** exact interfaces reported by Tasks1–6.
**Produces:** complete game including interior mode, discoverable world, actions and settings.

- [ ] Implement analog joystick with pointer capture/multitouch cancellation; arrows remain selectable. Keep altitude/brake/visor, clear mode-specific control hints.
- [ ] Wire visible short subtitle queue and companion event state. Keep HUD small; contexts discover rather than guide all targets.
- [ ] Integrate body/propulsion world vectors and interior pose/camera, ship stabilization on stand, first/third-person preference.
- [ ] Add protection query spanning aim/fire/scan/gem chain and prevent both damage and interruption, including last frame.
- [ ] Persist partial progress and settings; restart/restore/pause/context loss recover safely. Guard old checkpoint versions.
- [ ] One meaningful integrated browser traversal through all stages with new assets/controls, plus partial reload/blocked shot/optional hazards.

## Task 8: Review, visual polish and one publication

**Files:** docs/qa/2026-09-17-final-expedition.md, runtime fixes scoped by findings; screenshots/videos in output/gamification/final-expedition-qa.

- [ ] Run npm test after integration, inspect actual all-stage gameplay and camera modes in desktop/mobile sizes.
- [ ] Compare actual clips against atlas: every engine, jetpack, hand/weapon, pilot, cabin walk, rocks/biomes, explosion, new gem, return and acople.
- [ ] Exercise cold/warm load, slow/failing resources, context restoration, rotate/background touch cleanup and complete/restart.
- [ ] Measure CPU/frame/load/transition resource counts; report actual device scope, no unmeasured 60FPS claim.
- [ ] Independent scope/code review; resolve material defects and review affected fixes.
- [ ] Commit completed changes, push approved feature state and deploy once through established project. Verify exact public artifact/link, then user-facing completion with evidence and limitations.

## Ownership and acceptance

Root integrates and commits. Independent Tasks1,2,3 may run together because file ownership is disjoint; Task4 is root local work. Task5 waits for Task1's layout contract; Task6 waits for anchors/assets; Task7 consumes all. Scope completion is the full inventory in the spec, not task count.
