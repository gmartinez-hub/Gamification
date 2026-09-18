# Gravedad Zero Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the closed Gravedad Zero specification, including the four canonical assets, modular ship/equipment state, hangar, complete UI, crew behavior, transition, performance recovery, QA evidence, and production deployment.

**Architecture:** Keep simulation and persistence in focused data modules, use Three.js actors as render adapters, and keep the hangar/UI as explicit modes over the existing runtime. Preserve the recovered performance commit and integrate each feature through test-first contracts.

**Tech Stack:** Native ES modules, Three.js r168 vendored locally, Node test runner, Blender 5.2 LTS, GLB/glTF 2.0, Vercel.

**Spec:** `docs/specs/2026-09-17-gravedad-zero-closeout.md` on `docs/gz-closeout-spec`

## Global Constraints

- Preserve D-01 through D-07 and every C/UI/CAM/QA requirement.
- Never modify source `.blend` files; generated artifacts go to `assets/runtime/closeout-models/`.
- Preserve full texture maps and hero models; LOD changes geometry only.
- Keep game rules independent of the selected device profile.
- Use test-first changes and commit each verified stage.
- Do not promote production until smoke tests pass and rollback SHA is recorded.

---

### Task 1: Asset pipeline and provenance

**Files:**
- Create: `scripts/build-closeout-assets.py`
- Create: `assets/runtime/closeout-models/manifest.json`
- Create: `tests/closeout-assets.test.mjs`

**Interfaces:**
- Produces GLBs named `green-ally.glb`, `energy-cell.glb`, `modular-turret.glb`, and `orbital-service-bay.glb` plus a manifest containing source SHA-256, dimensions, triangle counts, materials, textures, rig and clip data.

- [ ] Write `tests/closeout-assets.test.mjs` to require all four manifest entries and shipped files.
- [ ] Run `node --test tests/closeout-assets.test.mjs` and observe missing-manifest failure.
- [ ] Export copies from the four authorized Blender sources with normalized transforms, stable names, packed PBR maps, and non-destructive hierarchy helpers.
- [ ] Re-run the asset test and Blender static inspection.
- [ ] Commit `assets: add canonical closeout models`.

### Task 2: Persistent equipment and presets

**Files:**
- Create: `src/lowpoly/loadout.js`
- Create: `tests/loadout.test.mjs`
- Modify: `src/lowpoly/checkpoint.js`
- Modify: `tests/checkpoint.test.mjs`

**Interfaces:**
- Produces `createLoadoutState()`, `installModule()`, `placeTurret()`, `savePreset()`, `activatePreset()`, and checkpoint schema version 3.

- [ ] Write failing tests for module identity, repeated middle modules, host-local turret transforms, transactional charge spending, and non-duplicating presets.
- [ ] Run the focused tests and confirm failures are feature-absence failures.
- [ ] Implement immutable loadout transitions and checkpoint migration.
- [ ] Re-run focused and full tests.
- [ ] Commit `feat: persist modular expedition loadouts`.

### Task 3: Data-driven ship assembly and turrets

**Files:**
- Create: `src/lowpoly/turrets.js`
- Create: `tests/turrets.test.mjs`
- Modify: `src/lowpoly/asset-actors.js`
- Modify: `src/lowpoly/spatial.js`
- Modify: `src/lowpoly/ballistics.js`

**Interfaces:**
- Consumes loadout composition and placements.
- Produces arbitrary `front + middle* + final` assembly, surface validation, automatic support fire, manual ship salvo, Nóma defense, and bike-synchronized fire.

- [ ] Write failing assembly and turret behavior tests for every C-09 composition and every required host.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement composition-derived transforms, attachment validation, muzzles, and fire policies.
- [ ] Re-run focused and full tests.
- [ ] Commit `feat: assemble modular ship and host turrets`.

### Task 4: Hangar and staged resources

**Files:**
- Create: `src/lowpoly/hangar.js`
- Create: `src/lowpoly/resource-planner.js`
- Create: `tests/hangar.test.mjs`
- Create: `tests/resource-planner.test.mjs`
- Modify: `src/lowpoly/main.js`

**Interfaces:**
- Produces a maintenance mode with orbit camera, transactional editing, selected hero resource priority, and safe return to the suspended expedition.

- [ ] Write failing state-preservation, stale-request, preset-switch and resource-ownership tests.
- [ ] Run focused tests and confirm failures.
- [ ] Implement the separate hangar scene and staged planner.
- [ ] Re-run focused and full tests.
- [ ] Commit `feat: add expedition maintenance hangar`.

### Task 5: Complete UI, controls and aim

**Files:**
- Modify: `index.html`
- Modify: `src/lowpoly/styles.css`
- Modify: `src/lowpoly/controls.js`
- Modify: `src/lowpoly/main.js`
- Create: `tests/ui-state.test.mjs`

**Interfaces:**
- Produces UI-01 through UI-11 and CAM-01 through CAM-08 with desktop mouse aim/fire and two-thumb mobile aim/fire.

- [ ] Write failing UI state and control arbitration tests.
- [ ] Run focused tests and confirm failures.
- [ ] Implement menu, hangar, equipment, log/map, HUD, pause/settings/loading/error/final surfaces and context-specific input.
- [ ] Re-run tests and capture desktop/touch screenshots.
- [ ] Commit `feat: complete expedition interface and aim`.

### Task 6: Crew, economy and narrative

**Files:**
- Create: `src/lowpoly/crew.js`
- Create: `tests/crew.test.mjs`
- Modify: `src/lowpoly/expedition.js`
- Modify: `src/lowpoly/encounters.js`
- Modify: `src/lowpoly/main.js`

**Interfaces:**
- Produces charge rewards, Vesper ally recruitment/combat, animated Nóma defense and idempotent narrative events.

- [ ] Write failing tests for charge/gem separation, ally recruitment, movement, weapon use, Nóma defense and reload idempotency.
- [ ] Run focused tests and confirm failures.
- [ ] Implement crew simulation and narrative transitions.
- [ ] Re-run focused and full tests.
- [ ] Commit `feat: add expedition crew and equipment economy`.

### Task 7: Jump anomaly and sector transition

**Files:**
- Create: `src/lowpoly/jump-transition.js`
- Create: `tests/jump-transition.test.mjs`
- Modify: `src/lowpoly/main.js`
- Modify: `src/lowpoly/presentation-clock.js`

**Interfaces:**
- Produces automatic return/boarding after gem recovery, explicit player departure, 3D anomaly, destination readiness, and automatic first module docking.

- [ ] Write failing sequence, double-click and retry tests.
- [ ] Run focused tests and confirm failures.
- [ ] Implement the idempotent transition state machine and anomaly renderer.
- [ ] Re-run focused and full tests.
- [ ] Commit `feat: add controlled anomaly transition`.

### Task 8: Performance recovery and QA

**Files:**
- Modify: `src/lowpoly/main.js`
- Modify: `tests/world-assets.test.mjs`
- Create: `docs/evidence/gz-closeout-validation.md`

**Interfaces:**
- Connects recovered `updateLOD()` hooks with hero/inspection overrides and records QA-01 through QA-12 evidence without claiming unmeasured device FPS.

- [ ] Update the failing world-load contract test to assert three hero sources plus two geometry LOD sources and disposal ownership.
- [ ] Run the focused test.
- [ ] Wire per-frame LOD selection and inspection overrides.
- [ ] Run all Node tests, browser smoke, repeated hangar/sector cycles and capture comparable evidence.
- [ ] Commit `perf: finish recovered screen-space LOD integration`.

### Task 9: Preview and production promotion

**Files:**
- Modify: `docs/evidence/gz-closeout-validation.md`

**Interfaces:**
- Produces a verified preview URL, production URL, deployed SHA and rollback SHA.

- [ ] Confirm clean worktree and full test pass.
- [ ] Deploy preview and run URL smoke tests.
- [ ] Record preview evidence and unresolved physical-device verification separately.
- [ ] Promote the verified SHA to production and smoke `https://gamification-murex.vercel.app/`.
- [ ] Commit evidence and report rollback SHA.
