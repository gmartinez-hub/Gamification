# Low-poly Expedition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Deliver a playable three-sector expedition covering exploration, combat, physical boarding and modular progression on desktop and mobile.

**Architecture:** Pure mission rules and flight simulation feed a Three.js scene. Input and visual sector generation have isolated ownership; main coordinates user-visible actions.

**Tech Stack:** Vendored Three.js r179, ES modules, Node test runner, static Python preview.

**Spec:** `docs/superpowers/specs/2026-09-16-lowpoly-expedition-design.md`

## Global Constraints

- Keep legacy.html and src/main.js unchanged.
- Keep low poly, reuse actor factories, textures and audio; no new package runtime dependency.
- Desktop and mobile controls from the outset.
- Physically return before ship control; hide astronaut and cable only on boarding.
- Module growth occurs at corridor transition, never on gem pickup.
- Do not merge or deploy; update existing draft PR after verification.

### Task 1: Mission and procedural layout
Files: create `src/lowpoly/expedition.js`, `tests/expedition.test.mjs`.
Interfaces: exact expedition contract in spec.
- [x] Write failing tests: scan gates small targets; wrong actor cannot damage; three small activate large; each sector has 1/2/3 large; collecting gem retains module; finishTransit requires transit and grows module; third completes. Assert repeatability and safe distances across seeds.
- [x] Run `node --test tests/expedition.test.mjs`, observe missing module / behavior.
- [x] Implement state methods with phase and role guards, independent seeded PRNG and authored volumes. Geometry-independent positions are plain XYZ objects.
- [x] Run covering test and report.

### Task 2: Flight and controls
Files: create `src/lowpoly/flight.js`, `src/lowpoly/controls.js`, `tests/flight.test.mjs`.
Interfaces: exact flight and controls contracts in spec.
- [x] Write failing tests: vertical translation; maximum tether length; return remains astronaut until physically docked; deploy begins at ship; ship stays still while EVA; reset clears return and velocity.
- [x] Run `node --test tests/flight.test.mjs`.
- [x] Implement damped XYZ flight, cable constraint, physical approach/boarding and inputs. Keyboard WASD/arrows, Space/C up/down, Shift boost, E action, F fire, Tab target, V view, R return, X deploy, G navigate, I inspect, Esc pause. Ignore typing targets, clear inputs on blur, touch release/cancel clears direction.
- [x] Run covering tests and report.

### Task 3: Procedural sector visuals
Files: create `src/lowpoly/sector-world.js`. Replace obsolete first-slice environment/progression helpers after integration; legacy.html and src/main.js remain untouched.
Interfaces: exact sector-world contract in spec.
- [x] Implement scene groups from layout, separate hazardous/clickable/decorative geometry, reusable materials/instancing, beacon scan indicator, gem, transit rings and three biome palettes.
- [x] Verify import and construction using Node scene without texture loader DOM; browser inspection during integration verifies textures and draw.

### Task 4: Playable integration
Files: modify `src/lowpoly/main.js`, `index.html`, `src/lowpoly/styles.css`; create `src/lowpoly/combat.js`, `tests/combat.test.mjs` if needed.
- [x] Integrate state and flight, stable follow camera + visor/cockpit, visible tether, HUD, target selection and assisted shot sequence with visible probability. Require range and actor before valid shot.
- [x] Add action guidance/autonavigation that moves normally (not teleport), scan progress, damage/recovery, sector corridor and assembly animation.
- [x] Responsive touch controls with simultaneous movement/vertical input; camera drag and button actions; pause/help/reset/audio.
- [x] Node tests plus browser full mission, manual flight, camera, pause and responsive verification. Fix observed defects before screenshots.

### Task 5: Review and delivery
Files: README.md, docs/lowpoly-verification.md, docs/lowpoly-assets.md.
- [x] Independent code review with scoped diff, resolve important findings.
- [x] Record actual verification and mobile-device limitation, create actual gameplay screenshot.
- [x] Update draft PR with final scope and evidence; link playable local preview and PR.

## Delivery record

Mission rules, flight, controls, sector presentation and integration are implemented. The first-slice `environment.js`, `progression.js` and their superseded pickup-only tests were removed: keeping immediate-on-pickup growth would contradict the new corridor progression. The old source game remains in `legacy.html` / `src/main.js`. Verification and PR delivery are recorded in `docs/lowpoly-verification.md`.
