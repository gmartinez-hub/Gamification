# Gravedad Zero V4 Implementation Plan

> **For agentic workers:** Use subagent-driven development for independent visual/audio tasks. User approved all seven recommendations on 2026-09-16. Proceed through implementation and verification without another design gate.

**Goal:** Deliver the complete three-sector web expedition with the approved code-built poster direction, immersive first-person views, integrated repo audio, fair assisted combat and local sector checkpoints.

**Architecture:** Keep existing Three.js factories and pure mission/flight contracts. Add small persistence and audio modules, refine actor/environment factories, and integrate through main.js without rewriting proven touch controls. One published delivery after checks.
**Tech Stack:** Local Three.js ES modules, Web Audio, localStorage, Node tests, real Chromium/WebKit browser verification.
**Spec:** /Users/gabo/Documents/ChatGPT/Marca personal/output/gamification/gravedad-zero-definiciones-proxima-version-2026-09-16.md

## Global constraints
- All three biomes and full existing mission sequence remain in scope.
- New protagonist models only; reuse suitable environment textures, sprites and WAVs.
- Code-built meshes, no Blender. Ship 6.18 / 10.96 / 14.53 m; astronaut about 1.93 m; keep spatial.js anchors and collisions consistent.
- Desktop and mobile, iPhone 16 target; preserve portrait/landscape and touch-release fixes.
- First person default; exterior toggle visible; temporary exterior during module assembly restores chosen view.
- Assisted shot: at most two consecutive misses per valid target and actor; third valid attempt hits. Invalid/out-of-range attempts do not advance streak.
- Checkpoints resume at start of current sector, preserving completed-sector gems/modules, seed and settings. Storage exceptions must never block play.
- No new account, backend, music composition or human voice.
- Existing uncommitted quick-view changes are prior approved work; preserve them.
- Production/publishing already authorized in task history and final scope approval. Never expose credentials.

## Task 1: Actor materials and first-person meshes
Files: src/lowpoly/models.js, optional src/lowpoly/materials.js, tests/models.test.mjs.
Preserve createShip(), createAstronaut(), createCompanion(), createCockpit().
Add createVisorRig() returning {group, update(time,{speed,aiming,interacting,braking,aspect})}; default hidden, camera-local. update must keep central view clear.
UVs for custom hulls; bevel large armor panels; matte paint/metal/rubber/glass distinction, sensible shared geometry and instance use. Refine canopy/longitudinal modules without changing physical anchors.
Use assets/runtime/lowpoly-textures/paint-detail.jpg once root provides it; browser-only guarded loading and safe base materials in Node.
- [ ] Add meaningful mesh contract tests for UV validity and unobstructed camera centre where applicable.
- [ ] Refine actors, cockpit and visor tool.
- [ ] Run model/spatial tests; report mesh counts and integration contract.

## Task 2: World art and postprocessing
Files: src/lowpoly/sector-world.js, src/lowpoly/presentation.js, src/lowpoly/effects.js, tests/effects.test.mjs if behavior changes.
Keep existing world.load/sync/updateSky, lighting, targets, hazards, positions.
Improve composed foreground/midground/background for every biome and ensure first-person forward views contain a planet/landmark. Put decorative formations away from protected travel/interaction volumes.
Use assets/runtime/lowpoly-textures/rock-mineral.jpg once provided; no mismatched old moon-normal. Keep planet maps and existing atlas impacts/scan. Reasonable shadow-ready meshes, controllable bloom and planet light direction.
- [ ] Inspect the approved poster and existing live render.
- [ ] Refine all three sector identities; avoid static plane images replacing playable 3D.
- [ ] Validate existing effects tests and disposable resources.

## Task 3: Sound
Files: new src/lowpoly/audio.js, tests/audio.test.mjs; may read but NOT edit main.js.
Create createExpeditionAudio() -> {unlock(),setEnabled(bool),setPaused(bool),setVolumes({effects,ambience}),play(event,options),update({actor,thrust,boost,braking,biome,firstPerson,time}),dispose()}.
unlock async returns usable status and tolerates individual missing sounds. No automatic browser AudioContext work until gesture. Main owns user settings and calls update.
Logical play events: ui, target, scan, evaExit, return, evaFire, shipFire, smallHit, smallBreak, largeHit, largeBreak, gemReveal, gemCollect, transit, moduleAttach, warning, damage, rescue, complete, companionHint.
Use repo WAVs from all appropriate packs; no remote audio. Engines follow actual thrust, quieter drift, distinguish cockpit/EVA, biome ambience, debounce alerts, safe gain normalization, suspend/resume semantics.
- [ ] Test unlock failure isolation and meaningful voice/loop ownership with a small fake Web Audio boundary.
- [ ] Implement event map, channels and lifecycle.
- [ ] Report exact integration API and sound limits.

## Task 4: Fair combat and checkpoints
Files: src/lowpoly/combat.js, src/lowpoly/checkpoint.js, src/lowpoly/expedition.js, tests/combat.test.mjs, tests/checkpoint.test.mjs.
- [ ] First write tests: two misses then hit for same target; switching target does not transfer streak; invalid shots do not advance; reset clears streak.
- [ ] Implement streak map keyed actor/id; expose assisted result for truthful HUD.
- [ ] Test storage invalid JSON/schema/ranges/unavailable storage, restore of sector 2/3 module/gem counts and complete expeditions.
- [ ] Implement serialize/validate checkpoint with version, seed, sector, complete, settings. Add expedition.restoreCheckpoint(snapshot) rebuilding safe layout with expected gems/moduleStage and phase scan (complete retains full progress).
- [ ] Preserve explicit URL seed isolation. Fresh/restart behavior clears current save appropriately.

## Task 5: Integration, UI and view
Files: src/lowpoly/main.js, index.html, src/lowpoly/styles.css.
- [ ] First-person default with saved preference; add camera visor mesh; update tool only on relevant action. Compose forward camera toward sector route.
- [ ] Integrate audio events at actual release/impact timings and actor transitions, plus pause/page visibility.
- [ ] Restore safe checkpoints at startup; save on sector entry/completion and preference changes; show compact continue notice.
- [ ] Keep one contextual action and existing tactile layout. Brief contextual help from companion, dismissible/respect pauses, clear sound activation and compact volume settings in menu.
- [ ] Enable appropriate directional shadows, balanced exposure, adaptive resolution, no unsupported perf claims.

## Task 6: Asset preparation
Files: assets/runtime/lowpoly-textures/{paint-detail,rock-mineral}.jpg; docs/lowpoly-assets.md.
- [ ] Generate neutral seamless bitmap paint and mineral materials with imagegen (no baked perspective/light, no model sprites).
- [ ] Inspect images; compress to sensible dimensions; retain originals and prompts outside repo under output/gamification.
- [ ] Verify maps appear on actual meshes without obvious seams, overbright repetition or missing resources.

## Task 7: Acceptance and delivery
Files: README.md, docs/lowpoly-verification.md; output screenshots.
- [ ] Run full Node suite after integration.
- [ ] Start/read local server; actual Chromium and WebKit: no runtime errors or missing resources, visible exterior/visor/cabina on portrait/landscape, no held touch controls, audio activation/pausing.
- [ ] Complete all sectors through ordinary input; capture world, cockpit and visor; verify checkpoint reload mid-run and third-sector completion.
- [ ] Review code for regressions and visual output against approved poster. Fix findings; rerun affected checks.
- [ ] Publish final branch and deploy once verified; check exact deployment artifact and no-login public link.
- [ ] Report link, what changed, completed tests, and physical iPhone validation limit honestly.

## Progress
- Plan established; game implementation pending.

