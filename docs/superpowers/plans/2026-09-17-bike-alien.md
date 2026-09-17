# Bike and Alien Encounters Implementation Plan

> **For agentic workers:** Use executing-plans to implement and verify each bounded subsystem. Execution and publication were authorized in the conversation.

**Goal:** Ship bike exploration and physical alien combat in the existing three-sector expedition.

**Architecture:** Keep mission, vehicle state and ballistics independent from render objects. Adapt existing flight physics and imported rigs; share original geometry/textures while pooling enemies and projectiles. Main coordinates the adapters and existing cinematics.

**Tech Stack:** Three.js r179, ES modules, Blender 5.2, GLB + lossless Meshopt, Node test runner, Playwright desktop/touch verification.

**Spec:** ../specs/2026-09-17-bike-alien.md

## Global Constraints

Original Downloads files remain unchanged. Preserve mobile texture/geometry fidelity. One public iteration. No new paid services. Enemy kills do not gate progression. Preserve mandatory asteroid counts and destroyed state after rescue.

## Work packages

- [ ] Assets: `alien_rig_assets` adapts source anatomy and exports animated claw/jet sockets; `bike_rider_assets` exports normalized bike and skeleton-only riding clips plus `bike-actor.js`. Verify pose/contact renders and full source geometry preservation.
- [ ] Simulation: `encounter_ballistics` owns `ballistics.js`, `encounters.js` and their behavioral tests. Swept hits, nonhoming shots, aim occlusion, bounded populations and gem retreat.
- [ ] Vehicles: root parameterizes `flight.js`, adds `vehicles.js` and tests. Start bike, anchor EVA, approach/board real ship, remote gem return via bike, independent integrity, safe sector reset.
- [ ] Render/loading: root packages models losslessly in a separate streamed directory; enemy adapter animates real sockets and shared textured rock projectiles. Bounded pools and disposal across sectors. Lazy download before encounters.
- [ ] Integration: root changes `main.js`, mobile action choice, checkpoint and HUD; free reticle/fire, ship discovery, enemy hits, protected actions, recovery, all original mission transitions.
- [ ] Validation: run existing and new tests, then real browser desktop/touch complete flow. Capture mounted pose, boost flames, claw origin, physical hit/miss, retreat, stage docking and persistent progress. Check console/network and report actual limitations.
- [ ] Publication: commit/push, inspect READY deployment and exact public module hashes, promote to fixed project URL using authorized deployment surface, verify production alias before claiming live.
