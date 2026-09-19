# Gravedad Zero — Event Director / Economy / Unlock Map V1

Status: **WORKING CONTRACT — semantic reconciliation, not implementation freeze**

Rule: no unlock, purchase, grant, encounter escalation or reward transition may exist only as incidental UI/code behavior. Every product-significant transition must be represented as an explicit Director event/milestone with a tested outcome.

Clean-room rule: legacy runtime values/functions are evidence only. The new repository re-authors the system from this contract.

## 1. Responsibility split

### WorldDirector
Owns factual world-instance state:
- worldId / seed / logical cells,
- active-world Heat,
- discovered POIs / portal opportunities,
- persistent deployables / logical positions inside the current instance,
- world-specific content eligibility facts.

It does not grant campaign unlocks by itself.

### EventDirector
Consumes explicit facts/events and resolves product-significant outcomes:
- narrative milestones,
- unlock eligibility,
- catalog availability,
- encounter-family eligibility/escalation,
- H4 asteroid-response decisions,
- horde / carrier / incursion eligibility,
- reward event identity,
- postgame event suppression.

EventDirector does not own rendering/LOD and does not directly instantiate HERO assets.

### EncounterSystem
Executes the selected logical encounter and reports:
- started,
- escalated,
- completed / failed / abandoned,
- defeated hostile units,
- reward-source events.

### Threat / Representation Budget
Controls representation only:
- logical population remains intact,
- full/near/far/HERO representation is promoted/demoted according to measured budget,
- performance does not rewrite Director semantics.

### Inventory / Economy
Owns:
- banked Energy Cells,
- sortie-pending Energy Cells,
- physical owned itemIds,
- purchases,
- assignments,
- salvage,
- staged Hangar transaction.

EventDirector may unlock a catalog family or grant a specific narrative item, but does not silently create purchasable physical copies.

## 2. Energy Cell lifecycle

**APPROVED**

Sources:
- relevant asteroid reward events,
- defeated hostile/enemy reward events,
- immediate death-salvage credit under the existing 50% actually-lost-value rule.

Banking:
- asteroid/enemy Cells collected in-world are sortie-pending,
- world-to-world portal transit preserves pending Cells,
- successful Hangar return banks pending Cells,
- player death/session-interruption rule loses pending Cells as already contracted,
- salvage credit is persistent immediately under the death contract.

Spending:
- normal physical purchases/upgrades occur in Hangar staging,
- commit is atomic on intentional Hangar exit under the Hangar transaction contract.

No second spendable currency is introduced.

## 3. Numeric economy status

### Canonically frozen
- Permanent global friendly speed upgrade: **1,000 Energy Cells**, after Gem 2 / World 3 access; +15% base top speed, +20% base acceleration.
- Conditional Boosted Bike: **1,500 Energy Cells**, after World 3 Mothership reveal **and** geometry/camera/collider proof PASS.
- Death salvage: **50%** of the economic value of physical setup actually LOST, using purchase/catalog value + permanent installed upgrades; mount/service history excluded.

### BALANCE — do not guess
- standard turret purchase,
- Beacon purchase,
- standard additional Bike purchase,
- player/ally Pistol purchase after family availability,
- Middle / Final / other physical module purchases where applicable,
- Ally revival,
- Portable Portal purchase,
- any approved host-specific production/adaptation service if that semantic survives final turret reconciliation,
- encounter reward quantities / Heat thresholds / event weights.

### Legacy evidence only — explicitly non-canonical numbers
The old runtime used:
- turret = 3 charge,
- Middle = 6 charge,
- asteroid = 1,
- core = 2,
- enemy = 2,
- enemy ship = 4.

These values are useful only as historical loop evidence. V2 must not inherit them as balance facts.

## 4. Event / unlock matrix

| Director event / milestone | Trigger fact | Persistent outcome / availability | Economy effect | Status |
|---|---|---|---|---|
| CAMPAIGN_STARTED_AFTER_PROLOGUE | defeat/recovery prologue completes | baseline recovery Bike available | none | APPROVED |
| NOMA_RESCUED | World 1 rescue encounter resolved | Nóma persistent companion | none | APPROVED |
| PLAYER_PISTOL_GRANTED | Nóma rescue narrative beat | first player Pistol physical unit granted | ammo unlimited | APPROVED |
| W1_SHIP_BUILD_ACCESS | early post-rescue reconstruction beat | ship-building progression begins | exact first physical piece/order still open | RECOVERY / SEMANTIC_QUESTION |
| W1_EQUIPMENT_FAMILY_UNLOCK_* | exact W1 milestones TBD | Front / Beacon / Turret / Middle / Final become owned or purchasable according to explicit event row | Cells when row says PURCHASE, no cost when row says GRANT | SEMANTIC_QUESTION — must be fully enumerated |
| CELLS_REWARDED | eligible asteroid/enemy reward event resolves | pending Cells increase | reward amount BALANCE | APPROVED mechanism |
| HANGAR_RETURN_BANKED | safe world -> Hangar handoff | pending -> banked; surviving setup recovered/repaired | enables purchase loop | APPROVED |
| GEM_1_EARNED | W1 protected gem encounter completed | World 2 unlocked | Gem not spent | APPROVED |
| ALLY_RESCUED | W2 rescue encounter completed | Ally persistent character | none | APPROVED |
| ALLY_EQUIPMENT_PURCHASE_ENABLED | Ally joined + compatible family is already globally available | additional Ally Pistol/Bike/Ship/modules/turrets may be purchased as separate physical units using same economy | prices BALANCE unless otherwise frozen | APPROVED direction; per-family timing must follow global family unlocks |
| GEM_2_EARNED | W2 gem encounter completed | World 3 unlocked; global movement upgrade becomes purchasable | 1,000 Cells for speed upgrade | APPROVED |
| NATURAL_PORTAL_TRANSIT_COUNT_2 | two successful natural portal transits globally | Portable Portal becomes purchasable | exact price BALANCE | APPROVED |
| MOTHERSHIP_REVEALED | first W3 major reveal | endgame encounter layer + incursions become eligible; Boosted Bike purchase eligibility can open if geometry proof PASS | 1,500 Cells for Boosted Bike | APPROVED |
| HIGHER_CAMPAIGN_THREAT_LAYER | campaign milestone allows additional event families | base world families remain; higher-threat families added | higher-value encounters carry their own configured reward | APPROVED mechanism; family matrix pending |
| WORLD_HEAT_CHANGED | elapsed active-world time + relevant activity | local eligible-event pressure changes monotonically during this world instance | no abstract reward multiplier | APPROVED |
| BOSS_DEFEATED | final W3 core destroyed | free postgame; Mothership incursion family permanently removed from EventDirector eligibility | no new currency/NG+ | APPROVED |
| ALLY_DEAD | Ally transitions DOWNED -> DEAD from further hostile damage | revival required before deployment | revival price BALANCE | APPROVED |

## 5. Farming loop as a first-class progression contract

World 1 and later worlds must permit repeated loops:

`Hangar -> launch -> farm / encounter -> portal -> Hangar -> bank -> buy/configure -> launch again`

Consequences:
- campaign progression may not assume the player remains continuously in one world until Gem acquisition,
- returning to Hangar is not a failure/reset of campaign milestones,
- pending Cells become spendable only after safe Hangar return,
- EventDirector eligibility is derived from persistent campaign milestones plus the new world instance, not from a linear stage counter,
- the player may repeat farming loops before choosing to pursue the next narrative Gem encounter,
- exact required grind is BALANCE; campaign completion must not depend on hidden mandatory repetition.

## 6. H4 event routing

**APPROVED**

An asteroid destruction can emit an explicit event such as:
`ASTEROID_DESTROYED { triggerClass, worldId, heat, campaignMilestones }`.

EventDirector may resolve:
- no hostile response,
- normal hostile encounter,
- horde escalation when an eligible high-risk/mission trigger and current event context allow it.

Independent horde sources remain valid:
- carrier,
- portal/event source,
- Mothership,
- other explicitly authored WorldDirector/EventDirector families.

Not every asteroid is a hostile trigger.
Horde telegraph is mandatory.

## 7. Revisit / Heat routing

**APPROVED mechanism**

Eligible event families derive conceptually from:

`worldId + campaignMilestones + worldHeat + seed + eventCooldown/state`

Rules:
- each world retains its base identity/families,
- campaign milestones add families rather than generic numerical level-scaling the old ones,
- Heat rises from elapsed active-world time + relevant activity,
- Heat never decreases during that world instance,
- entering another world starts that destination at its own baseline,
- higher Heat selects/enables genuinely higher-threat events,
- those events have their own larger configured rewards,
- Heat itself does not multiply Cells by an abstract percentage.

Exact Heat rates/thresholds/weights are BALANCE.

## 8. Preset persistence proposal — pending explicit approval

Because save is local and there is a maximum of three ship presets, the recommended clean-room behavior is:
- three explicit named local slots per ship,
- Save creates/updates the selected slot,
- Save As may choose an empty slot,
- when all three are occupied, saving a new preset requires explicit Replace Slot 1/2/3,
- no rolling "latest three" FIFO,
- no silent deletion,
- overwrite is explicit and local,
- inactive slots remain logical data + derived thumbnails; only selected ship is promoted to live HERO 3D,
- if a referenced physical item is LOST, retain the preset as INCOMPLETE instead of deleting it; it cannot confirm a launch until repaired/replaced/edited.

Still open:
- whether Player Ship and Ally Ship each own independent three-slot sets, or another explicitly approved relation.

## 9. Turret / Beacon measurement gate

Raw evidence:
- Beacon canonical raw envelope: **1.279 × 1.898 × 1.020 m** (X/Y/Z).
- Modular Turret canonical raw envelope: **1.897 × 1.152 × 0.870 m** (X/Y/Z).
- Turret asset: one mesh, 179,546 triangles, no armature, no clips.
- Beacon asset: 124,940 triangles.

At raw 1:1, turret X envelope is **148.3%** of Beacon X envelope.

A uniform turret scale that only fits the full Beacon X/Z bounding envelope has an upper bound:
`min(1.279/1.897, 1.020/0.870) = 0.674`.

At 0.674 uniform scale, the turret envelope is approximately:
- X **1.279 m**,
- Y **0.777 m**,
- Z **0.586 m**.

If simply stacked above the full Beacon envelope, combined height is approximately **2.675 m**.

This is **not** a mount proof: the actual Beacon top mounting surface/socket is smaller/unknown until mesh/surface audit. Therefore:
- no non-uniform runtime deformation is approved,
- no runtime host swap is approved,
- exact Beacon turret scale/socket remains VERIFY,
- autonomous yaw/pitch requires a production hierarchy. The current turret GLB is one mesh, so Blender/source preparation must separate or author stable base/yaw/pitch/barrel pivots if articulated tracking is required.

## 10. Remaining semantic blockers

1. Exact World 1 physical-item unlock/grant/purchase order for Front / Beacon / Turret / Middle / Final.
2. Preset ownership relation between Player Ship and Ally Ship.
3. Explicit preset-slot recommendation approval.
4. Final turret inventory model after Beacon/Bike/Nóma/Ship scale proofs: generic purchased turret with fixed authored host assignment vs host-specific purchasable unit family.
5. Encounter-family matrix per world/campaign layer. Counts/weights remain BALANCE after families are frozen.
