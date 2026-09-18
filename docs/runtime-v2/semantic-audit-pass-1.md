# Gravedad Zero — Semantic Audit Pass 1

Status: **PASS 1 COMPLETE — contradictions reconciled, remaining decisions isolated**

Audit rule: no scope cut, no legacy-code carryover, no silent inference.

## Result summary

- Core product semantics: **mostly coherent**
- Contradictions found: **7**
- Contradictions corrected in this pass: **7**
- Missing product decisions that still require explicit resolution: **3**
- VERIFY/MEASURE/PRODUCE items that do not require product inference: **separate below**

## Corrected contradictions / stale definitions

### SA1-C01 — Portal auto-recall vs Party Check
**CORRECTED**

Older transit wording silently auto-recalled/recovered the selected setup.

Canonical behavior now:
- Party Check first,
- Rescue First cancels travel,
- Travel Anyway resolves left-behind companions explicitly,
- surviving/present selected setup enters cinematic,
- same actor/vehicle regains control at destination.

### SA1-C02 — Hangar as inventory warehouse vs sortie reminder
**CORRECTED**

Older wording called Hangar a live 3D configurator/showroom.

Canonical split:
- Inventory/Build UI handles browsing/configuration,
- focused 3D preview is allowed during Build/Inspect,
- ambient walkable Hangar physically stages only the confirmed sortie setup.

### SA1-C03 — Hangar camera still marked OPEN
**CORRECTED**

Canonical intent:
- first-person Hangar walk desired,
- validate against audited service-bay geometry,
- any third-person fallback requires explicit review.

### SA1-C04 — Portal arrival actor still marked OPEN
**CORRECTED**

Canonical behavior:
- cinematic may take camera ownership,
- gameplay control after handoff returns to the same actor/vehicle used to enter the portal.

### SA1-C05 — Generic "Ship > Bike" ordering vs composition-specific rules
**CORRECTED**

Canonical standard ordering:

`Front+Final > Bike > Front > Front+Middle×N+Final > Front+Middle×N > Astronaut`

Conditional Boosted Bike, if geometry-valid and unlocked, becomes fastest player-controlled vehicle.

### SA1-C06 — Stale movement opens
**CORRECTED**

Resolved:
- Final/Back effect,
- Middle movement class,
- per-Middle speed decay for V1,
- Bike central Boost nozzle,
- Ship/Bike Boost resource model,
- Bike stranding consequence.

### SA1-C07 — Campaign/story canon missing from implementation contracts
**CORRECTED**

Added `campaign-progression-contract-v1.md` covering:
- expedition-defeat prologue,
- Bike start,
- Nóma rescue,
- Energy Cell/ship-building loop,
- World 1/2/3 gem progression,
- ally rescue/team build-up,
- mothership reveal,
- revisitable procedural worlds,
- mothership incursions,
- World 3 final boss.

## Product decisions still missing

### SA1-M01 — Astronaut EVA Boost
**RESOLVED**

Astronaut EVA retains Shift/Boost in V2. Exact movement/FX values remain BALANCE/TUNE.

### SA1-M02 — Player death vs companion equipment priority
**RESOLVED — COMPANION RECOVERY PRIORITY**

If player dies while Nóma/ally is living/downed, that companion and the equipment physically assigned to them return to Hangar. That recovered companion equipment is excluded from the player's lost-setup salvage value. Other deployed setup follows normal death loss/salvage.

### SA1-M03 — Ship destruction while pilot survives
**RESOLVED**

Destroyed ship + attached equipment are lost. Surviving player remains EVA and must manually recover through another vehicle/ship/portal route; no viable route means lost sortie. Destroyed ally ship follows the same physical-loss rule while a surviving ally remains a recoverable character entity.

## Deferred product/progression decisions — not blockers for initial vertical slice

### SA1-D01 — Speed upgrade purchase/unlock
Feature family is allowed; exact unlock/purchase semantics remain open.

### SA1-D02 — Boosted Bike unlock economy
Late-game intent is approved conditionally; exact progression gate remains open.

These can remain deferred if the implementation ticket stays out of the initial vertical slice.

## VERIFY — evidence required, no product inference

- Cockpit raw GLB vs current runtime clipping/depth.
- Hangar 8-view raw asset audit + service anchors/bounds.
- First-person Hangar camera feasibility.
- Back-derived Boosted Bike geometry/rider/camera/collider fit.
- Fixed base ring visibility/composition from Hangar aperture.
- Mothership socket/scale/LOD production audit.
- Existing animation coverage per event.

## MEASURE / BALANCE — numbers intentionally not frozen

- cell size / ACTIVE-WARM radii,
- remote simulation Hz,
- renderer/backend winner,
- entity/representation budgets,
- exact movement speeds/acceleration/braking/turn rates,
- Boost FOV/distortion/particle thresholds,
- per-module turretCapacity,
- exact item/mount/revive prices,
- practical V1 maximum for Middle×N only if benchmark proves one is needed,
- semantic dimensions for ship/alien ship/hangar/ring/mothership after ScaleProfile measurement.

## PRODUCE — known work, not semantic ambiguity

- central PrimaryBoostExhaust visual support on terminal Front/Middle/Final and Bike,
- cockpit/hangar support geometry only where raw audit proves missing,
- runtime HERO/GAMEPLAY/FAR/collider derivatives,
- shared cockpit/hangar materials,
- fresh Audio Event Map/prototypes,
- VFX pools/presentation shaders,
- any missing boss/portal support assets.

## Pass 1 closure

SA1-M01..M03 are now resolved and covered by semantic tests.

The remaining work is no longer a hidden product-semantic blocker:
- raw asset/scale/camera evidence,
- measurable performance/balance values,
- production assets/FX/audio,
- deferred progression/economy rules for features not yet entering implementation.

Implementation Contract Freeze still waits for the evidence gates; Core Semantic Freeze may proceed.
