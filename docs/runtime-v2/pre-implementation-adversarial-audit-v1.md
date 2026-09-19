# Gravedad Zero — Pre-Implementation Adversarial Audit V1

Status: **OPEN — evidence-first, no scope cuts, no product inference**

Purpose: attack the approved V2 contract before implementation and expose hidden semantic, lifecycle, persistence, camera, performance and asset ambiguities while they are still cheap to resolve.

This audit never authorizes a scope reduction. Every finding must be classified as one of:

- `PASS`
- `SEMANTIC_QUESTION` — explicit product decision required
- `MEASURE` — benchmark/measurement required
- `VERIFY` — visual/runtime proof required
- `THREE_FIX`
- `BLENDER_FIX`
- `BOTH`
- `PRODUCE`
- `BALANCE`

No implementation task may silently convert a `SEMANTIC_QUESTION` into code behavior.

---

## A. State-transition audit

Enumerate and test every state handoff:

- Hangar -> World
- World -> Portal -> World
- World -> Portal -> Hangar
- World -> death/recovery
- Ship -> standing cockpit -> seated pilot -> ship exterior/EVA
- Bike mount/dismount
- Ally/Nóma ACTIVE -> DOWNED -> RESCUED/DEAD
- Vehicle intact -> destroyed -> EVA/manual recovery/sortie loss
- Inventory HANGAR_STORED -> ASSIGNED -> DEPLOYED -> REMOTE -> RECOVERED/LOST

For every transition assert:

1. controlled actor before/after,
2. item ownership before/after,
3. companion state,
4. currency/progression state,
5. save commit boundary,
6. world residency unload/load,
7. representation vs logical-state separation.

### Likely semantic questions to expose, not infer

- Left-behind intact player-owned equipment: **RESOLVED** — portal warns; player may recover manually, request Portal Recall, or Travel Anyway and lose it. Recalled equipment arrives diegetically after a short delay and joins the transit cinematic before handoff.
- Deployed beacons/turrets: **RESOLVED by generic equipment rule** — if intact, player-owned and left behind, they are eligible for the same explicit Portal Recall / manual recovery / Travel Anyway decision.
- Companion base recovery vs companion-owned remote vehicle/equipment remains open unless covered by explicit equipment recall.

---

## B. Save / persistence / crash-safety audit

Mechanically test and specify:

- save version field,
- atomic write strategy,
- migration strategy,
- corrupted save recovery path,
- partial write interruption,
- tab refresh during world,
- tab refresh during portal handoff,
- browser background/suspend/resume,
- browser/OS kill during autosave,
- repeated new-world generation from one persistent campaign state.

### Semantic questions to surface

- One autosave slot or multiple player-visible slots?
- Energy Cell banking boundary: **RESOLVED — Hangar return**.
- Pending Cells on player death before Hangar: **RESOLVED — lost**.
- Pending Cells across world-to-world portal handoff: **RESOLVED — preserved**.
- Automatic repair on Hangar: **RESOLVED — free and immediate**.

---

## C. Economy / progression closure audit

Cross-check every resource sink/source and every permanent unlock:

- Energy Cells,
- narrative gems,
- global movement upgrade,
- Boosted Bike,
- turret purchase/mount/reconfiguration,
- ally revival,
- module purchase,
- recovery salvage,
- asteroid rewards,
- baseline recovery Bike.

Required invariant:
narrative gems are unlock keys and are never spendable currency.

### Questions to expose

- exact ally revival price remains BALANCE unless already defined elsewhere,
- exact module/turret/mount prices remain BALANCE,
- repair economy/mechanic must be explicit if damage persists beyond a sortie.

---

## D. Combat / damage / equipment audit

Verify:

- baseline Front-only shot,
- aiming/firing while Boosting,
- projectile pooling/swept collision,
- alien projectile family,
- large-asteroid collision damage/deflection,
- Bike destruction,
- player ship destruction,
- ally ship destruction,
- companion down/death presentation priority.

### Semantic questions to expose

- friendly fire: **RESOLVED — disabled for the friendly faction**.
- can individual modules/turrets be destroyed independently, or only host-level destruction?
- ammo/energy limits: infinite baseline fire or an authored resource/cooldown system?
- repair/heal behavior during and between sorties.

---

## E. Portal / extraction adversarial audit

Test combinations:

- player in Ship,
- player on Bike,
- player EVA,
- ally present/remote/downed/dead,
- Nóma present/remote/downed,
- player ship remote,
- ally ship remote,
- Bikes remote,
- beacon/turrets deployed,
- destination load fails,
- Party Check -> Rescue First,
- Party Check -> Travel Anyway.

Approved presentation:
- staggered convoy,
- full selected surviving/present setup visibly represented,
- whole portal enlarged,
- no hidden asset scale changes.

Exact portal dimensions remain MEASURE/VERIFY.

---

## F. Camera / control audit

Build a camera/input matrix for:

- astronaut FP/TP,
- Bike FP/TP,
- ship cockpit,
- ship exterior,
- standing cockpit TP,
- Hangar FP,
- Hangar inspect/orbit,
- tactical map,
- cinematics.

Cross-check:

- Shift forward Boost,
- aim/fire during Boost,
- FOV transition,
- camera collision,
- pointer lock,
- mouse regain/loss,
- mobile touch equivalents,
- portrait guard,
- focus/background transitions.

No camera failure authorizes removal of a gameplay mode.

---

## G. Asset / socket / transform audit

For every canonical asset record:

- semantic key,
- source provenance,
- runtime path,
- authored orientation,
- scale profile,
- bounding box,
- sockets/anchors,
- collider proxy,
- LOD status,
- texture tier,
- thumbnail,
- camera issues,
- Blender/Three ownership of required fix.

Specific high-risk assets:
- cockpit,
- service bay,
- Bike + Back,
- modular Front/Middle/Back,
- turret host sockets,
- Nóma sockets,
- beacon socket,
- mothership sockets.

No browser runtime hardcodes raw file paths outside the AssetManager contract.

---

## H. Performance / residency audit

MEASURE, do not guess:

- renderer A/B,
- cell size sweep,
- ACTIVE/WARM radii,
- logical vs represented entities,
- 500/1000/1500+ asteroid stress,
- projectile/VFX pressure,
- texture residency,
- shader compilation/warm-up,
- portal transition peak memory,
- Hangar -> World -> Hangar cycles,
- context/resource disposal,
- long-session memory leak,
- iPhone thermal degradation,
- Safari WebGL/WebGPU support result,
- MacBook Air M1 baseline.

Optimization order:
representation/residency/LOD/pooling/materials/shadows first.
Never cut product scope merely to make a benchmark pass.

---

## I. Browser lifecycle / resilience audit

Verify:

- WebGL/WebGPU context loss/recovery,
- visibilitychange,
- focus/blur,
- pointer-lock loss,
- audio context suspension/resume,
- mobile background/resume,
- orientation change,
- asset decode/load failure,
- failed destination preload,
- storage quota/error handling.

---

## J. Presentation / audio priority audit

Make the presentation-state priority executable:

- player death
- player critical
- ally dead/downed/damaged
- Nóma downed/damaged
- horde warning
- portal transition
- gem event
- boss state
- ordinary damage

State must remain readable through:
UI + audio + camera + VFX.
No gameplay state may depend only on a full-screen effect.

---

## K. Clean-room boundary audit

CI must continue to prove:

- semantic oracle imports no `src/lowpoly`,
- new V2 runtime imports no legacy `src/`,
- old implementation may appear only in evidence/measurement harnesses,
- no Codex task says "reuse/copy function X from legacy",
- behavioral tests assert contract outcomes, not source equivalence.

---

## L. Freeze gate

Implementation Contract Freeze requires:

1. consolidated Spec V1,
2. Semantic Audit Pass 3,
3. contradictions = 0,
4. missing core semantics = 0,
5. implementation inference required = 0,
6. remaining values classified only as MEASURE / BALANCE / PRODUCE / VERIFY,
7. visual proof decisions recorded,
8. executable semantic tests green,
9. clean-room boundary green.

Only after this gate should the new runtime repository/skeleton be created.
