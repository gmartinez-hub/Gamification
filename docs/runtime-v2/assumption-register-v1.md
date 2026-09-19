# Gravedad Zero — Assumption Register / Semantic Questions V1

Status: **OPEN SEMANTIC REVIEW — no inference, no scope cuts**

Purpose: enumerate every remaining product-semantic assumption found after the current contract, campaign, movement, spatial, death/recovery, portal, save and adversarial-audit review.

Rules:
- unanswered items are blockers for Implementation Contract Freeze if implementation would otherwise need to choose a behavior,
- no unanswered item may be silently converted into a default,
- MEASURE / BALANCE / VERIFY / PRODUCE items are not product ambiguity and are listed separately,
- older stale assumptions are superseded by newer approved contracts.

## A. Portal detection / lifecycle

### AS-PORTAL-001 — Who detects natural portals?
**RESOLVED**

Nóma is the primary portal finder, but the player can also independently discover/detect a natural portal. Nóma is not a hard extraction gate.

### AS-PORTAL-002 — Natural portal when no companion is deployed
**RESOLVED**

If Nóma is absent/unavailable/DOWNED:
- player detection remains available,
- ally detection is also available as fallback.

Natural extraction may not become impossible solely because Nóma is unavailable.

### AS-PORTAL-003 — Portal notification / map marker
**RESOLVED**

After detection:
- Tactical Map marker,
- direction guidance,
- distance,
- remaining-window countdown.

When the window expires:
- portal closes,
- marker/direction/distance/countdown disappear completely,
- no expired/history trace remains.

### AS-PORTAL-004 — Simultaneous natural portals
**RESOLVED**

Maximum one active natural portal opportunity per world instance at a time.

### AS-PORTAL-005 — Current-world destination
**RESOLVED**

Current world is excluded. Destinations are Hangar + other unlocked worlds.

### AS-PORTAL-006 — Failed handoff consumption
**RESOLVED**

If destination load/handoff fails:
- natural portal remains/reopens for retry,
- Portable Portal retains its once-per-sortie use,
- only successful handoff consumes/counts the use.

### AS-PORTAL-007 — Portal Recall guarantee
**RESOLVED**

Once Portal Recall is accepted, arrival is guaranteed and protected. Equipment cannot fail/be destroyed during the recall transition; arrival is shown cinematically.

### AS-PPORTAL-001 — Compatible turret-slot hosts
**RESOLVED**

No turret-slot host carries the Portable Portal.

It lives only in the player astronaut inventory.

**NEW CONFLICT TO RESOLVE:** earlier contract said it consumes one turret slot; explicit slot-accounting clarification is still required.

### AS-PPORTAL-002 — Activation authority
**RESOLVED**

Player only. No ally/Nóma autonomous activation and no Tactical Map remote activation.

### AS-PPORTAL-003 — Physical deployment form
**RESOLVED DIRECTION**

Portable Portal manifests a full portal sized to fit the actual traveling setup. Exact appearance/margin is MEASURE/VERIFY.

Still open only if a more specific emitter animation/form is desired later; no host-mounted projection assumption remains.

### AS-PPORTAL-004 — Once-per-sortie boundary
**RESOLVED**

One continuous sortie runs from Hangar departure until Hangar return, player death or session interruption, across any number of world-to-world portal crossings. Portable Portal use does not reset between worlds.

### AS-PPORTAL-005 — Same Party & Equipment Check
**RESOLVED**

Yes. Portable Portal uses the same Party & Equipment Check + Portal Recall + safe-handoff/rollback semantics as natural portal travel.

## C. Campaign / persistence

### AS-PERSIST-001 — Narrative milestone save timing
**RESOLVED**

Narrative gems, Nóma/ally unlocks, mothership reveal and Portable Portal unlock progress persist immediately when earned. They do not wait for Hangar return. Pending Energy Cells remain separate.

### AS-CAMPAIGN-001 — First narrative gem source
**RESOLVED**

World 1: after Nóma rescue and early ship progression, Nóma Explore discovers an anomalous signal / protected gem POI. Completing the hostile guardian/elite encounter grants Gem 1 and unlocks World 2.

### AS-CAMPAIGN-002 — Second narrative gem source
**RESOLVED**

World 2: rescued ally contributes intel about the second gem; that opens a higher-threat carrier/elite/fortified encounter. Completing the encounter grants Gem 2 and unlocks World 3.

## D. Companion semantics

### AS-COMP-001 — Can Nóma become DEAD?
**RESOLVED**

Nóma never enters a permanent DEAD state. At terminal health he becomes DOWNED/DISABLED and remains recoverable without a character-revival purchase.

### AS-COMP-002 — DOWNED -> DEAD transition
**RESOLVED**

Ally DOWNED -> DEAD only through additional hostile damage while DOWNED. There is no automatic bleedout timer.

### AS-COMP-003 — Order/Recall range
**RESOLVED**

- Explore / Defend can be issued remotely through Tactical Map.
- Tactical Map pauses local gameplay/simulation while open.
- Orders configured there begin executing when the map closes.
- Recall is a transversal action, not a third tactical role.
- Ally may execute the committed order by EVA, Bike or Ship according to the physical setup.
- If the selected compatible vehicle is physically elsewhere, the Ally travels to it, boards it, then executes the task.
- No teleport or remote loadout swap.

### AS-COMP-004 — Portal discovery ownership
**PARTIAL / SEMANTIC_QUESTION**

Nóma remains the primary portal finder.

User direction:
- ally can act as fallback when Nóma is absent/downed,
- ally portal detection may also depend on the currently assigned order.

Still requires explicit rule:
- does ally detect natural portals whenever ordered Explore,
- or only when Nóma is unavailable,
- or both (Explore normally + unconditional fallback when Nóma is unavailable)?

## E. Combat / equipment

### AS-COMBAT-001 — Turret targeting mode
**RESOLVED**

Mounted turrets target/fire autonomously on all approved hosts.

Host assignment and surface adaptation are configured in Hangar and are locked during the sortie. No in-world turret host swap.

### AS-COMBAT-002 — Bike baseline weapon
**RESOLVED**

Bike has no integrated baseline vehicle weapon.

The rider may use the equipped personal Pistol according to the personal-weapon contract. Mounted Bike turrets, when present, remain autonomous.

### AS-COMBAT-003 — EVA / personal weapon
**RESOLVED**

The player astronaut has the Pistol as usable personal equipment after Nóma provides the first player Pistol in World 1.

Pistol ammunition is unlimited.

### AS-COMBAT-004 — Ally pistol ammunition
**RESOLVED**

Ally Pistol ammunition is unlimited.

The Ally does not clone the player's physical Pistol: a separate Pistol unit must be purchased through the same Energy Cell economy used for player/ally physical equipment.

### AS-BEACON-001 — Beacon gameplay function
**RESOLVED**

- player astronaut deploys it manually,
- multiple owned Beacons may be deployed simultaneously,
- each Beacon can host max one actually-owned turret,
- deployed Beacon is always visible on Tactical Map,
- detects enemies, hordes and natural portals,
- no generic POI detection is approved,
- serves as navigation/parking anchor for player ship or Bike,
- no normal-world remote recall: recover physically or via world transition,
- world transition returns intact Beacon directly to inventory; it does not fly to the ring,
- Beacon itself gives no passive protection to parked vehicles,
- protection exists only through a mounted turret's normal defensive fire,
- Beacon-derived sensor markers disappear when the target leaves coverage/resolves,
- destroyed Beacon remains LOST.

### AS-BIKE-001 — Bike turret-capacity upgrade
**RESOLVED / SUPERSEDED**

The old semantic tier "Bike base 2 -> upgrade to 4" is superseded.

There is no approved semantic 2->4 progression tier. A Bike may mount 0, 1, 2, 3 or another physically valid count when:
- the player owns that many compatible physical turret units,
- the verified Bike surfaces/mount geometry support them,
- placements do not violate physical compatibility.

The exact final physical maximum is VERIFY from geometry/surface evidence, not a product tier inferred from legacy tests.

## F. Map / camera / boss / economy edge cases

### AS-MAP-001 — Tactical Map pause behavior
**RESOLVED**

Opening Tactical Map pauses local gameplay/simulation.

Orders configured while paused begin execution after closing the map.

### AS-CAMERA-001 — Seated ship first-person
**SEMANTIC_QUESTION**

Is seated first-person cockpit piloting a required V1 camera mode, or is seated third-person the required mode with FP only optional?

### AS-BOSS-001 — Escape from final boss
**RESOLVED**

Natural / Portable Portal travel remains available during the final World 3 boss encounter.

The player may retreat, return to Hangar/rearm, and later return to continue the boss encounter under the milestone-persistence contract.

### AS-BOSS-002 — Final boss state after retreat
**RESOLVED**

Boss persistence is milestone-based:
- destroyed weak points remain destroyed,
- reached phase remains reached,
- partial HP on a still-live weak point or Core resets to 100% of that current target when the player abandons and later returns.

### AS-ECO-001 — Salvage value basis
**RESOLVED**

50% salvage value is based on the economic value of physical setup actually LOST:
- base purchase/catalog value,
- plus permanent installed upgrade value.

Historical mount/reconfiguration service spend is not part of salvage value.

A narratively granted physical item uses its normal catalog/economic value rather than zero.

### AS-ECO-002 — Permanent baseline Bike salvage
**RESOLVED**

The permanent baseline recovery Bike chassis itself is excluded from salvage when destroyed because the baseline fallback remains available.

Destroyed attached/upgraded physical equipment follows normal loss and salvage rules.

## G. Pass 3 semantic blockers

### P3-PRESET-01 — Preset scope
**SEMANTIC_QUESTION**

Approved:
- maximum three saved preset templates,
- composition + placements,
- presets do not clone physical inventory,
- one confirmed setup is active for the sortie.

Still unresolved:
- player Ship only vs inclusion of Ally Ship / other host assignments,
- whether Ally Ship has independent presets, shares the same three, or has no independent preset system.

### P3-PRESET-02 — Preset references LOST item
**SEMANTIC_QUESTION**

If a saved preset references a physical module/turret later LOST, activation behavior must be explicit. No silent clone/substitution.

### P3-PRESET-03 — Save with all three slots occupied
**SEMANTIC_QUESTION**

Legacy behavior silently dropped the oldest preset. That behavior is not approved for the clean-room runtime. Explicit replacement/overwrite behavior is required.

### P3-W1-01 — Nereida unlock order
**SEMANTIC_QUESTION / RECOVERY FIRST**

Already fixed:
- baseline Bike,
- rescue Nóma,
- Nóma gives the player Pistol,
- ship-building / first ship-piece progression begins,
- Cells fund physical equipment,
- protected encounter grants Gem 1 and unlocks World 2.

Recover before asking product again:
- exact identity/timing of first ship piece, Front, Beacon, Turret, Middle and Final.

Do not restore legacy stage order by inference.

### P3-TURRET-01 — Surface adaptation / mounting cost
**SEMANTIC_QUESTION / RECOVERY FIRST**

Approved:
- one turret = one physical unit,
- host surface determines mount/visual scale,
- reconfiguration occurs only in Hangar,
- no in-world host swap,
- preset activation may not charge invisibly.

Still unresolved after current source reconciliation:
- whether adapting/reassigning an already-owned turret to another compatible host in Hangar costs Energy Cells.

### P3-ENCOUNTER-01 — World/campaign encounter-family matrix
**SEMANTIC_QUESTION**

Approved mechanics:
- base world identity/content persists,
- campaign progression may enable higher-threat encounter families,
- H4 asteroid response,
- Heat rises from time + activity and never decreases in the current world instance,
- Heat resets on world change,
- higher Heat selects genuinely higher-threat encounters with their own higher configured rewards,
- no generic numerical level scaling.

Still define the encounter-family matrix for Nereida/Vesper/Umbra at base, after World 2 unlock, after Mothership reveal and postgame. Counts/weights remain BALANCE.

### P3-POSTGAME-01 — Mothership incursions after final boss
**SEMANTIC_QUESTION**

Free postgame sandbox is approved.

Explicitly define whether Mothership-incursion events cease after `bossDefeated = true`.

## Intentional non-semantic opens — do not ask product to guess

These remain intentionally unresolved until evidence/tuning:
- natural portal recurrence interval, active-window duration and spawn distance,
- Portable Portal Energy Cell price,
- ally revival price,
- module/turret/mount/reconfiguration prices,
- exact ship-module turret capacities,
- cell size / ACTIVE-WARM radii / remote simulation rates,
- exact movement speeds, braking and turn-rate values beyond already-approved percentage rules,
- portal final diameter / formation offsets / cinematic timing,
- Boost VFX/audio exact values,
- Bike Back final scale/placement/collider/nozzle proof,
- cockpit/Hangar remaining visual proof,
- mothership GLB dimensions/sockets/LOD/collider production,
- performance budgets / renderer result / LOD thresholds / pool sizes / thermal limits,
- final audio assets and visual tuning.

## Freeze condition

No Implementation Contract Freeze until every SEMANTIC_QUESTION above is either:
- explicitly answered and converted to APPROVED,
- or explicitly removed from V1 by a product decision (never by implementation inference).


### AS-PPORTAL-006 — Slot accounting conflict
**RESOLVED**

Portable Portal lives in player astronaut inventory and does **not** consume a turret slot. Earlier turret-slot-cost wording is superseded.
