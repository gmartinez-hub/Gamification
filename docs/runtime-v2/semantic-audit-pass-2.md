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
**2**, both explicitly outside the first implementation tickets until resolved:
1. exact speed-upgrade unlock/purchase progression,
2. exact Boosted Bike unlock economy.

These are not permission to infer. Their implementation tickets remain blocked until those progression rules are explicitly approved.

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
