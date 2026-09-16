# V3 Spaceflight and Visual Scale Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or executing-plans. User approved the complete V3 proposal; zero-gravity inertia is the selected baseline.

**Goal:** Deliver the approved V3 with habitable ship scale, inertial flight, predictable moving hazards and a poster-inspired environment on desktop and mobile.

**Architecture:** Shared physical anchors unify geometry, docking, camera and collision. Flight owns movement/orientation; deterministic hazard paths are shared by rendering/collision. A distant sky scene separates celestial scale from the playable world.

**Tech Stack:** Existing vendored Three.js r179, plain ES modules, Node tests, static web serving.

**Spec:** `docs/superpowers/specs/2026-09-16-v3-spaceflight-design.md` (approved proposal copied from output).

## Global Constraints

- Preserve original legacy.html and src/main.js and the three-sector mission loop.
- Keep mobile controls, first person, physical boarding and module growth after corridor.
- Ship length ~6/11/15 m, astronaut ~1.9 m, companion ~0.7 m. Root transforms remain unit scale.
- Zero-gravity inertia with explicit brake; no planetary attraction in this version.
- No external runtime dependencies or merge. Update the existing draft PR. User subsequently authorized publishing this same delivery to Vercel with a mobile-accessible test link, after incorporating existing texture/atlas assets.

## Shared contracts

`spatial.js`: exports `SHIP_SCALE=2.5`, `COMPANION_SCALE=.7`, `TETHER_MAX=26`, `SHIP_ANCHORS` (plain local XYZ), `shipPoint(name,position,quaternion,out)` (Vector3), `shipCollisionSpheres(stage)` array `{center:{x,y,z},radius}`, `shipFrameRadius(stage)`.
Anchors: `dock=(3.3,-.85,-2.5)`, `eva=(4.5,-.85,-2.5)`, `tether=(2.4,.05,-2.5)`, `eye=(0,1.05,-4.8)`, `muzzle=(0,-.4,-6.6)`.

`createFlight()`: existing API retained; `shipQuaternion` (Quaternion), `shipYaw`, `shipPitch`, `thrust` Vector3, `braking` boolean, `arrived` boolean. `update(dt,direction,boost,options={})`, options `{brake=false,navigationTarget=null,arrivalRadius=0,lookYaw=null,lookPitch=null,hold=false}`. Navigation uses a Vector3-compatible goal. `reset({aboard=false}={})`, `setStage(stage)` adjusts collision-based return avoidance. `dockPosition`/`tetherPosition` getters return stable world vectors. Ship remains anchored/orientation frozen during EVA. Orientation independent of velocity; limit angular acceleration/rate, pitch clamp stable horizon. Input direction is world vector. Returning uses safe exterior waypoints around hull before local dock. During aim/scan use brake/hold; do not cancel all momentum on input release. Guided arrival must brake and set arrived only near goal AND low speed. Root can stop cinematic/reset velocities as before.

`createShip()` preserves API, accepts optional update `{moving,boost,thrust,braking}` where moving=0 when coasting; scale only child `ship-visual`. `createAstronaut` poses floating; companion scale child. Add export `createCockpit()` → `{group,update(time,{speed,braking})}` camera-local frame/dashboard at negative Z, no DOM/canvas dependency; root parents to camera, visible only aboard first person.

`createSectorWorld(scene)` adds `{skyScene,skyCamera,updateSky(camera),lighting}`. `sync(state,time,{reducedMotion=false}={})` always advances hazard trajectories; cosmetic reduction alone. `load(layout)` references stable arrays/groups as before. Each hazard record adds `previousPosition` and `velocity` Vector3. `layout.biomeId` explicit; hazards add deterministic `motion:{axis:{x,y,z},amplitude,period,phase}` centered on existing position. `hazards.js` exports `sampleHazard(spec,time,outPosition,outVelocity)`, `sweptSphereHit(a0,a1,b0,b1,radius)` boolean, `closestApproach(relativePosition,relativeVelocity,horizon=2)` → `{time,distance}`. Root owns collision response/alerts. `lighting` plain `{sun,fill,exposure}` numeric colors/exposure. Sky camera translation factor <=.02 to preserve scale; root renders sky then clearDepth then world. Corridor inner radius>=8.

## Tasks

1. Shared spatial anchors and tests (root). Tests ensure rotated anchor follows vessel and hull covers all stages without giant empty collision sphere.
2. Models/cockpit (model agent): failing visible-bounds regression, adjust scale/silhouette, detail panels/collars, floating astronaut and thruster feedback. Test model update transform ownership and stage attachments. Own models.js/tests/models.test.mjs.
3. Inertial flight/inputs (flight agent): failing coast/brake/reversal/navigation/rotation/return tests, implement capped acceleration, weak coast damping, active brake, angular inertia, progressive tether. controls sample adds brake via KeyQ and `[data-move=brake]`. Own flight.js/controls.js/tests/flight.test.mjs.
4. World/hazards (world agent): deterministic safe trajectories, tests swept collision + safety seeds; celestial layer, composed rock formations, biome geometries/palettes and halo materials. Own expedition.js/sector-world.js/hazards.js/tests/expedition.test.mjs/tests/hazards.test.mjs.
5. Integration (root): main camera/control basis from physical heading; anchors/muzzle, guided flight, multi-sphere swept hazard collision and directional warnings. First-person HUD/cockpit, brake button, free-view inspection, scene rendering/lighting. Update index/styles.
6. Verification: Node suite, independent review, complete desktop/mobile loops, coast/brake/first-person pitch/moving hazard tests, screenshots, docs and draft PR.

## Test commands

- `node --test tests/models.test.mjs`
- `node --test tests/flight.test.mjs`
- `node --test tests/expedition.test.mjs tests/hazards.test.mjs`
- `npm test` and `git diff --check`
- Real browser checks against `http://127.0.0.1:8787/`, normal controls and read-only telemetry only.

## Approved delivery addition

User requested a Vercel test URL, complete touch controls, and the best practical visual finish using existing textures and sprite atlases in this same V3. Added optimized derivatives in `assets/runtime/lowpoly-textures`, mapped planets/rock/nebula, and a bounded sprite-effects pool. Publish only after integrated checks; retain the existing branch and draft PR.
