# Gravedad Zero — Semantic Audit Pass 2

Status: **CORE SEMANTIC FREEZE: PASS**

Audit rule: no scope cut, no legacy-code carryover, no silent inference.

## Scope of Pass 2

Pass 2 rechecked the current canonical pack after resolving:
- astronaut EVA Boost,
- player-death vs living/downed companion equipment,
- player/ally ship destruction with surviving pilot,
- ally Explore/Defend parity,
- portal actor continuity,
- Hangar walk/inventory separation,
- composition-specific movement hierarchy.

## Result

### Blocking product-semantic contradictions
**0**

### Blocking missing contracts
**0** for the currently defined core game loop and vertical-slice systems.

### Deferred feature-level product decisions
**1**, explicitly outside the first implementation tickets until resolved:
1. exact generic speed-upgrade unlock/purchase progression.

Boosted Bike progression is now closed conditionally on geometry validation:
- unlock after the World 3 mothership reveal,
- purchase price **1,500 Energy Cells**,
- cannot be purchased if the Back-derived Bike geometry/camera/rider/collider validation fails.

The remaining generic speed-upgrade rule is not permission to infer; its implementation ticket stays blocked until explicitly approved.

## Reconciliations completed in Pass 2

### SA2-R01 — Death exception made local and explicit
General player-death loss now explicitly excludes equipment physically assigned to living/downed companions that recover to Hangar.

Salvage = 50% of the value actually lost after that exception.

### SA2-R02 — Companion command ownership clarified
Nóma and unlocked ally share the intentionally small high-level command family:
- Explore
- Defend

No ally-only Follow/Tank/Attack menu is introduced.

Actual combat capability is loadout-driven.

### SA2-R03 — EVA Boost closed
Astronaut EVA retains freely holdable Shift/Boost semantics in V1.

Exact speed/FX values remain BALANCE/TUNE.

### SA2-R04 — Ship destruction closed
Destroyed player/ally ship + attached physical equipment are lost.
A surviving pilot remains a character entity in EVA and must recover manually.
No viable recovery route => lost sortie.

## Core semantic-freeze statement

The following domains are now semantically defined without requiring implementation inference:

- campaign/prologue/World 1-2-3 progression,
- world procedural lifecycle and cross-world reset,
- Hangar/setup/inventory physical ownership,
- cockpit boarding/standing/sitting,
- player/ally modular ship grammar,
- mandatory Front,
- repeated Middle×N,
- standard movement classes,
- Ship/Bike/Astronaut Boost existence,
- central PrimaryBoostExhaust behavior,
- Bike failure/stranding,
- ship destruction with surviving pilot,
- ally/Nóma recovery and death interactions,
- player-death salvage priority,
- Explore/Defend command family,
- map/navigation semantics,
- portals/Party Check/actor continuity,
- hordes/spawn representation semantics,
- final mothership boss phases,
- presentation channels for damage/downed/death,
- single Energy Cell economy identity,
- save/browser/mobile-orientation semantics,
- clean-room reconstruction rule.

## Implementation Contract Freeze is NOT yet declared

The remaining gates are evidence and measurement gates, not hidden design questions.

### VERIFY-G1 — Raw spatial asset proof
- cockpit raw vs runtime clipping/depth,
- Hangar multi-angle/bounds/anchor audit,
- Hangar first-person camera path,
- ring aperture/composition,
- Boosted Bike Back-fit geometry,
- mothership sockets/scale/LOD,
- character animation coverage.

### MEASURE-G2 — ScaleProfile table
Measure and approve semantic dimensions / envelopes for:
- astronaut 1.90 m anchor,
- cockpit,
- player modules/compositions,
- alien ship,
- Hangar,
- ring,
- mothership,
- Bike,
- turret/weapon/Nóma/ally/beacon/cell.

### MEASURE-G3 — Performance/tuning
- renderer/backend,
- cell size/radii,
- remote Hz,
- LOD thresholds,
- representation budgets,
- movement numbers,
- per-module turretCapacity,
- Boost FX thresholds,
- prices.

### CODE-G4 — Executable evidence harness
Before runtime V2 feature coding:
- convert semantic scenarios into machine-readable IDs/fixtures where practical,
- create asset measurement scripts independent from gameplay implementation,
- produce repeatable reports committed as evidence,
- do not copy old gameplay modules.

## Next recommended work

1. Build/run **Scale & Asset Measurement Harness** against the legacy assets as evidence only.
2. Generate cockpit/Hangar/ring visual proof renders and measurements.
3. Produce the first PASS/FAIL ScaleProfile report.
4. Reconcile any geometry/camera failures into Blender/Three production tickets.
5. Only then declare **Implementation Contract Freeze** and bootstrap the clean runtime repository.

## Freeze protection

Any failed VERIFY/MEASURE gate must result in:
- a measured technical fix,
- a Blender/Three asset ticket,
- a tuning/config update,
- or an explicitly reopened product contract.

It must never silently remove a capability or shrink scope.


---

## Evidence Gate Progress — Measurement Pass 1

### G1 — Scale & Asset Measurement Harness
**PASS**

Automated clean-room harness now:
- measures raw GLB bounds/triangles/named anchors,
- extracts explicitly labeled legacy semantic-scale evidence,
- generates spatial evidence for cockpit/Hangar/ring/Boosted Bike,
- validates the ScaleProfile draft against measured raw evidence,
- commits generated reports through CI.

Generated:
- `evidence/asset-measurements-v1.{json,md}`
- `evidence/spatial-evidence-v1.{json,md}`
- `evidence/scale-profile-validation-v1.{json,md}`
- `evidence/scale-profiles-draft-v1.json`

ScaleProfile evidence linkage: **PASS / 0 failed checks**.

### G2 — Cockpit / Hangar / Ring proof
**PARTIAL PASS — geometry evidence complete; visual camera proof remains**

Cockpit:
- `SOURCE_EXISTS_RUNTIME_HIDES` supported numerically,
- 1.901 m rear source-shell clearance,
- 0.321 m head clearance,
- current clip overlaps standing astronaut envelope by 0.619 m.

Hangar:
- measured reference envelope ≈ 34.188 × 15.494 × 32.235 m,
- bike/crew anchors have floor/ceiling/side enclosure and open-forward rays,
- long-ship service anchor is intentionally open laterally/above,
- first-person grid yielded 20 enclosed samples with 5.695–13.623 m vertical clearance.

Ring:
- 6.8 m legacy event-horizon aperture fits a ~4.739 × 4.613 m player-ship cross-section in single-file formation,
- ~1.031 / 1.093 m per-side clearance,
- naive two-ship side-by-side needs ~10.478 m before cinematic margin.

Boosted Bike:
- preliminary Back envelope fit is geometrically plausible,
- candidate raw scale ≈ 0.535×,
- add-on envelope ≈ 0.976 × 0.987 × 1.016 m,
- visual/rider/camera/collider/nozzle proof still mandatory.

### Remaining before Implementation Contract Freeze

1. Actual visual projection/render proof for cockpit shell without legacy clip.
2. Hangar first-person camera storyboard against measured geometry.
3. Portal transit formation visual decision + aperture verification.
4. Back/Bike visual fit with rider/cameras.
5. Mothership asset production/measurement.
6. Convert failures, if any, into exact Blender/Three tickets.

No scope is reduced by these gates.


---

## Executable semantic oracle — PASS

Clean-room executable contract tests now run independently from legacy gameplay code.

CI result: **13 / 13 PASS**.

Current machine-enforced semantics:
- mandatory Front + valid Front-only craft,
- extensible Middle×N grammar,
- no extra movement tier from Middle count,
- approved base movement hierarchy,
- freely holdable Boost for astronaut/Bike/Ship,
- physical-item no-clone assignment invariant,
- player-death living/downed companion equipment priority,
- dead companion does not receive that recovery exception,
- destroyed ship -> surviving pilot EVA/manual recovery,
- no viable vehicle recovery route -> lost sortie,
- portal Party Check for unresolved/downed companions,
- portal restores the same actor/vehicle after handoff,
- Boosted Bike requires World 3 reveal + geometry PASS + 1,500 Cells.

CI also fails if the semantic oracle imports `src/lowpoly`.

These tests are contract evidence only; V2 production code must satisfy them without importing the oracle as runtime implementation.
