# Gravedad Zero — Canonical Contracts V1

This document freezes approved behavior and separates it from values that must be measured or produced.

---

## 1. World and navigation

### GZ-WORLD-001 — Axis convention
**APPROVED**

- X/Z are the primary navigation plane.
- Y is altitude.
- The legacy hard world clamp (`WORLD_MIN/WORLD_MAX`) is forbidden in V2.

### GZ-WORLD-002 — Extensible world
**APPROVED**

- The player may continue travelling without hitting an invisible global wall.
- The world is partitioned into streamable logical cells.
- Narrative content can be finite while traversal remains extensible.

### GZ-WORLD-003 — Logical position
**APPROVED**

Logical position is represented by:

`worldId + cellId + localPosition`

The renderer may rebase/floating-origin around the active area. Simulation retains stable logical coordinates.

### GZ-WORLD-004 — Planet/moon presentation
**APPROVED**

Planets, moons and large celestial bodies are backdrop/macro visual layers unless a later contract explicitly promotes one to a physical POI. They do not become collision destinations merely because the player travels toward them.

### GZ-WORLD-005 — Cell lifecycle
**APPROVED mechanism / MEASURE values**

Cells support at least:

- COLD — data/seed only.
- WARM — preloaded spawn/asset requirements.
- ACTIVE — full nearby gameplay/representation.

Exact cell size, warm radius and active radius are MEASURE values from the perf lab.

### GZ-WORLD-006 — Deterministic procedural generation
**APPROVED**

Within one world instance/sortie:

`hash(worldSeed, cellCoordinates)`

must reproduce the same procedural cell content. Streaming out and back in must not reroll the cell.

### GZ-WORLD-007 — New world instance
**APPROVED**

Entering another world through a portal ends the current world instance. The destination creates a fresh procedural instance/seed. The previous world does not remain remotely simulated after cross-world handoff.

---

## 2. Portal and transit

### GZ-PORTAL-001 — Discovery
**APPROVED**

Portals appear/findable in the procedural world. Once found, the portal remains usable for the rest of that world instance.

### GZ-PORTAL-002 — Destinations
**APPROVED**

Portal interaction offers:

- Hangar.
- Any unlocked world.

No arbitrary locked destination is shown as available.

### GZ-PORTAL-003 — Transit
**APPROVED**

On confirm:

1. Validate destination.
2. Run the Party Check for unresolved/downed companions.
3. If the player chooses Rescue First, cancel transit and keep the current world instance active.
4. If the player chooses Travel Anyway, resolve left-behind companion recovery according to GZ-PORTAL-009.
5. Preserve the currently controlled actor/vehicle and the surviving/present selected setup for the transit presentation.
6. Begin destination preload.
7. Show that real active setup travelling through the ring/tunnel.
8. Perform safe handoff.
9. Restore control to the same actor/vehicle used to enter the portal.
10. Release the old world instance.

The ring sequence is the diegetic loading screen. No silent auto-recall may bypass the Party Check.

### GZ-PORTAL-004 — Failure
**APPROVED**

A failed destination load must return safely to the source portal/world state. It must not corrupt save, inventory or setup.

---

## 3. Inventory and item identity

### GZ-ITEM-001 — Unlock vs unit
**APPROVED**

- Unlock = family/recipe/catalog availability.
- Owned unit = one concrete physical inventory item.
- Presets never duplicate owned units.

### GZ-ITEM-002 — Physical-unit scope
**APPROVED**

Concrete countable units include:

- Ship modules.
- Turrets.
- Beacons.
- Weapons.
- Additional bikes/vehicles.

The permanent recovery bike is a special baseline and is not lost as a normal owned unit.

### GZ-ITEM-003 — Stable item identity
**APPROVED**

The same `itemId` moves across:

`HANGAR_STORED -> ASSIGNED -> DEPLOYED -> REMOTE -> RECOVERED | LOST`

Menu thumbnails, Hangar models and world representations are views of the same item, not copies.

### GZ-ITEM-004 — Inventory domains
**APPROVED**

At minimum:

- Shared Hangar storage.
- Player inventory/loadout.
- Nóma inventory/loadout.
- Ally inventory/loadout.
- Vehicle/module loadouts.
- World deployed-state references.

### GZ-ITEM-005 — Inventory / Hangar presentation
**APPROVED direction / visual QA required**

- Inventory/Build remains a separate fast UI using pre-rendered 256–512px thumbnails.
- Inspect/Configure may promote the selected canonical asset to a focused live 3D preview/inspection view.
- The ambient walkable Hangar is not the inventory warehouse: it stages only the confirmed sortie setup.
- Unlocked/unowned content may appear only as a clearly marked preview/hologram while configuring.
- Menus do not instantiate many live GLBs simultaneously.

---

## 4. Turret contract

### GZ-TURRET-001 — Physical unit
**APPROVED**

A purchased turret is one physical unit. Two purchased turrets = two units. The unit can be moved in Hangar among compatible hosts.

### GZ-TURRET-002 — Compatible hosts
**APPROVED**

Turrets can mount on:

- Player ship.
- Ally ship.
- Player/ally bike.
- Nóma.
- Beacon.

No turret is attached directly to the ally body; the ally uses a pistol as personal weapon.

### GZ-TURRET-003 — Host scaling
**APPROVED**

The same turret family may change **visual representation scale** to fit the host.

### GZ-TURRET-004 — Option A mount economy
**APPROVED**

- The turret unit is purchased once.
- Mounting/reconfiguring it for a host has a host-specific Energy Cell cost.
- Moving it to another host may incur the new host's mount/reconfiguration cost.
- Host-specific stat changes are **not implied** by visual scaling; any such stat rule must be an explicit later balance contract.

### GZ-TURRET-005 — Capacities
**APPROVED mechanism**

- Nóma: maximum 2 turret units.
- Bike: base capacity 2; upgrade path may raise capacity to 4.
- Beacon: maximum 1 turret unit.
- Player/ally ships: capacity is authored per ship module. Total ship capacity is the sum of active module capacities plus physical-surface compatibility. No arbitrary global ship cap is hardcoded.

Exact `turretCapacity` for each existing ship module is PRODUCE/BALANCE and must be authored after Blender/camera review.

---

## 5. Hangar and setup

### GZ-HANGAR-001 — Memory boundary
**APPROVED**

The Hangar is a separate scene and primary memory boundary. Full world + full Hangar + next full world must not be resident simultaneously.

### GZ-HANGAR-002 — Draft setup
**APPROVED**

Hangar setup uses:

`OPEN -> DRAFT/PREVIEW -> CONFIRM | CANCEL`

Only CONFIRM changes the mission setup/persistent inventory assignments.

### GZ-HANGAR-003 — Loadout-driven residency
**APPROVED**

Only selected mission actors/vehicles/equipment are required for mission residency. Not selecting ally/Nóma/bike/ship equipment must allow the runtime to omit those representations/assets where possible.

### GZ-HANGAR-004 — Ally ship
**APPROVED**

Once built, the ally modular ship can accompany the player in any unlocked world and is launched voluntarily from Hangar. It uses the same modular ship system/assets as the player ship.

---

## 6. Companions

### GZ-COMP-001 — Nóma unlock/deploy
**APPROVED**

- Nóma unlock persists permanently after narrative unlock.
- Nóma itself has no deployment fee.
- Accessories equipped on Nóma have normal ownership/cost rules.

### GZ-COMP-002 — Ally availability
**APPROVED**

- Ally unlock persists.
- If ally survives, Hangar recovery has no revive fee.
- If ally dies, revival/reactivation costs Energy Cells before deployment again.

### GZ-COMP-003 — Orders
**APPROVED**

Nóma and the unlocked ally use the same intentionally small high-level command family:

- Explore.
- Defend.

No additional ally-only tactical role menu is introduced.

Changing/activating the order normally requires proximity. When far away during combat, the player may Recall where the actor/system supports recall. Actual combat output comes from the configured physical loadout.

### GZ-COMP-004 — Defend target
**APPROVED**

Defend protects:

- the player, or
- one assigned owned ship/vehicle.

No arbitrary empty-space defend target.

### GZ-COMP-005 — Remote existence
**APPROVED**

Remote companions remain logical entities even when their GLB/animation/VFX representation is unloaded. They can travel, take damage, fight and become downed/dead.

### GZ-COMP-006 — Remote alerts
**APPROVED**

Remote attack/damage/down/death events must produce distinct UI/audio notifications and Tactical Map state.

### GZ-COMP-007 — Downed lifecycle
**APPROVED**

`ACTIVE -> DOWNED/DISABLED -> RESCUED | DEAD`

- During the same sortie, a downed companion remains at its logical world position and can be rescued.
- If rescued, the configured pre-launch setup remains intact and gameplay resumes.
- If the sortie ends while the companion is alive/downed, character and equipment recover to Hangar.
- Ally requires revival payment only if DEAD.
- Nóma never requires character revival payment; his physical equipment follows item-loss rules.

---

## 7. Tactical navigation

### GZ-MAP-001 — 2D map
**APPROVED**

Tactical Map is 2D, not a second interactive 3D world.

### GZ-MAP-002 — Visible markers
**APPROVED**

Map may show:

- Player.
- Owned player ship/moto.
- Nóma.
- Ally and ally ship/moto.
- Beacons.
- Turrets.
- Discovered portals.
- POIs discovered by Nóma.

### GZ-MAP-003 — 3D miniatures
**APPROVED presentation direction**

Use pre-rendered miniatures/thumbnails of canonical 3D assets over map markers. Altitude is indicated with +/- metres or chevrons.

### GZ-MAP-004 — Waypoints
**APPROVED**

The player selects existing markers only. No arbitrary empty-space waypoint.

### GZ-MAP-005 — Manual navigation
**APPROVED**

No autopilot. Selected markers provide heading/distance guidance; vehicle control remains manual.

### GZ-MAP-006 — Nóma discovery
**APPROVED**

A POI discovered by Nóma remains visible for the rest of the current sortie/world instance even if Nóma leaves it.

---

## 8. Economy, death and recovery

### GZ-ECO-001 — Currency
**APPROVED**

Energy Cells are the single gameplay currency/resource for:

- resource rewards,
- purchases,
- mount/reconfiguration costs,
- revival,
- death salvage accounting.

### GZ-DEATH-001 — Player death
**APPROVED**

On player death:

- Deployed player-owned physical setup is lost **except** equipment explicitly protected by GZ-DEATH-COMP-001 because it is physically assigned to a living/downed companion that recovers to Hangar.
- Unlocks/recipes/world progression remain.
- Recovery grants 50% of the value of the setup actually lost in the death resolution, in Energy Cells.
- New baseline setup is the permanent recovery bike.

Exact item prices remain balance configuration.

### GZ-RECOVERY-001 — Successful extraction
**APPROVED**

Living/recoverable deployed units return to Hangar. Destroyed units remain lost.

---

## 9. Asteroids, projectiles and physics

### GZ-AST-001 — Asteroid families
**APPROVED**

Use the existing generic/base asteroid GLB family with material/texture variation where geometry variation is not required.

### GZ-AST-002 — Hostile thrown asteroid
**APPROVED**

Alien/mothership-thrown asteroids:

- reuse the generic asteroid family,
- use a distinct hostile visual/material treatment,
- break on the first meaningful collision,
- do not bounce through multiple bodies.

### GZ-AST-003 — Vehicle collision
**APPROVED**

Ship/moto collision with large asteroids causes damage + deflection. It does not create a rigid-body sandbox where vehicles push large asteroids around.

### GZ-PROJ-001 — Alien ship energy projectile
**APPROVED**

Alien ships use the same projectile system/family as the player ship, with different visual size/parameters as configured.

### GZ-PHYS-001 — Selective physics
**APPROVED architecture**

Use robust colliders/world queries for important bodies; projectiles, trails, debris and similar high-count effects must use lightweight pooled/swept logic rather than one full rigid body each.

---

## 10. Spawn and hordes

### GZ-SPAWN-001 — No visible pop-in spawn
**APPROVED**

Enemies may exist logically before representation. They must be prewarmed/promoted and arrive through believable approach/occlusion/portal/carrier/mothership context rather than appearing visibly at close range.

### GZ-HORDE-001 — Telegraph
**APPROVED**

A horde gets a readable pre-engagement warning through radar/companion/beacon/audio/presentation cues.

### GZ-HORDE-002 — Logical horde vs visual budget
**APPROVED**

A horde may contain more logical enemies than full nearby representations. Threat/Representation Budget promotes and demotes visual actors without changing the logical encounter population.

---

## 11. Final boss

### GZ-BOSS-001 — Asset behavior
**APPROVED**

Mothership is a rigid asset:

- no skeletal rig,
- no landing,
- no boarding,
- no complex per-section destruction.

Combat uses movement, sockets, gems/core, projectiles, hordes, hostile ships and VFX.

### GZ-BOSS-002 — Weak points
**APPROVED**

Existing gem model is used as mothership weak points.

### GZ-BOSS-003 — Phase 1: Siege
**APPROVED**

- Mothership protected.
- Asteroid launches + hostile ships/aliens/horde pressure.
- Destroy first gem weak points.
- Gem destruction reduces boss capabilities such as shield/asteroid/reforcement pressure according to balance config.

### GZ-BOSS-004 — Phase 2: Break the Crown
**APPROVED**

Remaining main gems activate; mothership becomes more aggressive/closer. Full prepared team/setup is relevant. Destroy remaining gem nodes to expose core.

### GZ-BOSS-005 — Phase 3: Core
**APPROVED**

Gems go dark, central core becomes vulnerable, strongest barrage uses existing system families. Destroying the core ends combat.

### GZ-BOSS-006 — Ending
**APPROVED**

Mothership destruction ejects the gem weak points through space as the final visual momentum. No collection step is required; the explosion triggers the ending cinematic/state.

---

## 12. Cameras and controls

### GZ-CAM-001 — Camera set
**APPROVED**

- Astronaut FP.
- Astronaut TP.
- Bike FP.
- Bike TP.
- Ship cockpit.
- Ship exterior/chase.
- Hangar first-person walk (VERIFY against audited geometry).
- Hangar orbit/inspection.
- Cinematic director camera.
- Tactical Map 2D view.
- Boss/fleet establishing cinematic framing as director shots.

### GZ-INPUT-001 — Desktop
**APPROVED**

WASD movement + direct mouse aim/camera + click fire.

### GZ-INPUT-002 — Mobile
**APPROVED**

Landscape touch layout with left movement control and right aim/fire.

### GZ-INPUT-003 — Portrait guard
**APPROVED**

Gameplay does not run interactively in portrait. UI asks the player to rotate the device. The experience must not depend on browser orientation-lock permission.

---

## 13. Motion, filters and VFX

### GZ-MOTION-001 — Parametric motion
**APPROVED**

Asteroids, backdrop planets/clouds, stars/dust, gem, beacon, turret, bikes, ships, mothership and most portal/transit motion are parameterized/procedural transforms, not new skeletal clips.

### GZ-RIG-001 — New clips
**APPROVED rule**

Create new character animation clips only when bodily deformation/gesture cannot be solved acceptably with existing clips, steering, IK, transforms, camera or VFX.

### GZ-FILTER-001 — Presentation state stack
**APPROVED**

Damage, critical, companion alerts, horde, portal, gem, boss and death presentation states use an explicit priority system so full-screen treatments do not stack chaotically.

### GZ-FILTER-002 — Blur
**APPROVED direction**

Blur is not a default damage effect. Favor cheap final-pass vignette/desaturation/exposure/tint/light distortion and camera impulse.

### GZ-VFX-001 — Distance tiers
**APPROVED**

The same logical event may render as HERO / NEAR / MID / FAR based on relevance/distance. Damage/gameplay is unchanged.

---

## 14. Texture and lighting

### GZ-TEX-001 — Runtime tiers
**APPROVED**

- Never upscale a source merely to hit a tier.
- 2K (2048x2048) only where hero/close-up QA proves value.
- 1K (1024x1024) is common gameplay target.
- 512 is allowed for FAR/secondary representations.

### GZ-LIGHT-001 — Lighting budget
**APPROVED**

Use a controlled main/environment lighting model plus limited important local lights. Do not create a costly dynamic point light for every turret/projectile/engine; emissive/VFX represent many distant lights.

---

## 15. Audio

### GZ-AUDIO-001 — Reset
**APPROVED**

Legacy WAVs are reference only. V2 gets a fresh Audio Event Map.

### GZ-AUDIO-002 — Coverage
**APPROVED requirement**

Audio map must cover at least movement/engines, weapons, asteroid hits/breaks, Energy Cell reward, Nóma states, ally states, beacon, turret, portal, Hangar launch/dock, mothership, horde, damage, critical, death and gem events.

Prototype audio may be generated for playtest; prototype status does not imply final shipping approval.

---

## 16. Save and browser support

### GZ-SAVE-001 — Save
**APPROVED V1**

Local autosave only. No account/cloud/cross-device requirement in V1.

### GZ-BROWSER-001 — Production QA
**APPROVED V1**

Safari is the required production QA browser target for now. Reference hardware includes MacBook Air M1 and iPhone 16. Mobile QA uses landscape gameplay.

---

## 17. Performance contracts

### GZ-PERF-001 — No product cap by guess
**APPROVED**

Cell sizes, LOD thresholds, remote simulation rates, pool sizes, shadow budget and representation counts are MEASURE values, not product assumptions.

### GZ-PERF-002 — Renderer selection
**APPROVED process**

The perf lab compares appropriate Three.js renderer/backend alternatives once at project bootstrap. The chosen production renderer is then frozen before campaign implementation.

### GZ-PERF-003 — Priority
**APPROVED**

Stable input, aim, shooting and frame time take priority over retaining HERO representation for distant/off-focus entities.

---

## 18. Asset-source contract

See [asset-manifest-contract-v1.md](./asset-manifest-contract-v1.md).

---

## 19. Remaining non-semantic work

These are not permission to infer product behavior:

- **MEASURE**: cell size, radii, remote Hz, per-module ship turret capacities, exact perf budgets, final item prices.
- **PRODUCE**: Hangar/cockpit/ship/mothership Blender fixes, asteroid material coverage, LODs, colliders, fresh audio, VFX, any genuinely missing character clips.
- **VERIFY**: semantic tests, perf lab, camera QA, asset audit, memory/leak cycles.


---

## 20. Cockpit / Hangar / Portal spatial experience

### GZ-COCKPIT-001 — Boarding
**APPROVED**

Entering the ship from exterior places the astronaut standing inside the cockpit bay first. The player then explicitly chooses Sit. Reuse the existing seat/stand state machine and animation rather than replacing it.

### GZ-COCKPIT-002 — Standing navigation
**APPROVED**

Standing cockpit mode is third-person and supports a small bounded walkable zone. The walk boundary must come from visible cabin geometry/architecture, not an arbitrary invisible box.

### GZ-COCKPIT-003 — Preserve existing pilot presentation
**APPROVED**

The seated third-person presentation that already works remains valid. First-person piloting may coexist using the canonical visor/cockpit framing.

### GZ-COCKPIT-004 — Depth audit before modeling
**VERIFY / PRODUCE**

Before adding Blender geometry, compare raw `cabina-integrada.glb` against current runtime composition. Current runtime clipping must not be mistaken for missing source geometry.

If source depth is insufficient, create a cockpit-bay **extension** rather than replacing the canonical cockpit/dashboard.

### GZ-HANGAR-005 — Stable base identity
**APPROVED**

Hangar is a stable orbital/base location. It does not physically become the last/next gameplay world.

### GZ-HANGAR-006 — Orbital backdrop
**APPROVED**

Hangar may show a stable orbital backdrop with planet/moon/stars/infrastructure. Destination selection is communicated through screen/holographic preview and color/presentation, not by loading the destination world behind the Hangar.

### GZ-HANGAR-007 — 3D focus inventory
**APPROVED direction / visual QA required**

- Browse via thumbnails/fast UI.
- Selecting an owned item/host may move/frame the canonical 3D asset into a Hangar focus/inspection zone.
- Selected asset can rotate for inspection.
- Unlocked but unowned content may appear as a clearly holographic/ghost 3D preview.
- Ship modules may use exploded/forward preview and ghost/snap assembly before CONFIRM.
- Preview never creates inventory ownership.

### GZ-PORTAL-008 — Party check before cross-world travel
**APPROVED**

Before crossing the portal threshold, show the status of companions relevant to the current sortie. If a companion is downed/unresolved, offer:

- Rescue First
- Travel Anyway

No silent abandonment.

### GZ-PORTAL-009 — Leaving companions behind
**APPROVED**

If Travel Anyway is chosen:
- Nóma left alive/downed is recovered/available through base recovery with no character revive fee.
- Ally left alive/downed returns to base with no revive fee.
- Ally DEAD remains unavailable until paid revival.
- Travel cinematic contains the surviving/present mobile setup.

### GZ-HANGAR-011 — Hangar walk camera
**APPROVED intent / VERIFY implementation**

First-person Hangar WALK is the desired mode. It is a simple pre-departure spatial view of the confirmed sortie setup and a boarding path, not an inventory interaction replacement.

If raw service-bay geometry/camera evidence proves first-person composition invalid, any third-person fallback requires explicit review; implementation may not silently switch modes.

### GZ-PORTAL-010 — Arrival control continuity
**APPROVED**

Cross-world transit restores control to the same actor/vehicle used to enter the portal. The cinematic may take temporary camera ownership, but it does not redefine the player's controlled deployment actor on arrival.


### GZ-HANGAR-008 — Walkable Hangar shows current sortie setup
**APPROVED**

The walkable Hangar is not an inventory warehouse. It physically stages the **currently confirmed mission setup** as a reminder and boarding space.

Examples:
- two selected bikes -> two bikes are present,
- selected ally/Nóma -> that character is present,
- selected turret/ship -> that deployed setup representation is present,
- unselected/unowned inventory does not populate the ambient Hangar.

Inventory browsing/configuration remains a separate UI/build mode.

### GZ-HANGAR-009 — Boarding purpose
**APPROVED**

The core interaction of Hangar WALK is:
1. review the physical sortie setup,
2. approach the chosen vehicle/ship,
3. board it using the existing boarding/cockpit flow,
4. depart.

No requirement exists for physically manipulating every inventory item while walking.

### GZ-HANGAR-010 — Walk camera evidence rule
**APPROVED intent / VERIFY implementation**

First-person Hangar walking is desired if the audited service-bay geometry supports a coherent camera path and visible enclosure/support shell. If raw model/camera evidence proves first-person composition invalid, third-person may be used only as an explicit verified fallback; implementation must not silently switch camera mode.


---

## 21. Death-priority and ship-destruction resolution

### GZ-DEATH-COMP-001 — Player death + living/downed companion equipment
**APPROVED**

On player death, equipment physically assigned to living/downed Nóma or ally returns with that companion to Hangar and is excluded from the player's lost-setup salvage value.

All other deployed player-owned physical setup follows GZ-DEATH-001.

### GZ-SHIP-FAIL-001 — Player ship destruction with surviving pilot
**APPROVED**

Destroyed ship/equipment is lost. Surviving pilot remains in EVA and must manually recover through another available vehicle/ship/portal route. If no viable route exists, the sortie is lost.

### GZ-SHIP-FAIL-002 — Ally ship destruction with surviving ally
**APPROVED**

Destroyed ally ship/equipment is lost. The surviving ally remains a character entity and may continue/become downed/be rescued/recovered under normal companion rules. No replacement ship appears automatically.


---

## 22. Portal convoy presentation

### GZ-PORTAL-011 — Staggered convoy formation
**APPROVED**

Portal transit uses a **staggered convoy** presentation rather than mandatory single-file or side-by-side formation.

Requirements:
- all surviving/present selected setup elements keep their real semantic scale,
- actors/vehicles may be separated longitudinally and laterally for cinematic readability,
- no hidden per-shot rescaling,
- the controlled actor/vehicle entering the portal remains semantically the controlled actor and is restored after handoff,
- shot angle may vary while convoy language remains staggered.

Exact offsets, timing, camera path and ring aperture margin remain PRODUCE/VERIFY from the visual proof.

The staggered formation does not require every element to cross the aperture at the exact same instant.


### GZ-PORTAL-012 — Full-setup hero visibility
**APPROVED**

The main portal transit cinematic must clearly present the **full surviving/present selected setup**, not only the two ships.

Depending on the confirmed sortie setup, that can include:
- player ship,
- ally ship,
- player Bike,
- ally Bike,
- player astronaut when independently present,
- ally character when independently present,
- Nóma,
- other selected mobile/deployed setup elements that logically travel through the handoff.

The cinematic director may stagger these elements longitudinally/laterally and vary shot angle, but may not hide most of the setup merely to preserve the old ring size.

### GZ-PORTAL-013 — Enlarge the whole portal
**APPROVED DIRECTION / MEASURE exact dimensions**

The V2 portal is intentionally larger than the current legacy procedural reference.

The enlargement applies to the **whole portal presentation**:
- usable aperture/event horizon,
- ring structure,
- halo/disc/effects,
- visual presence/scale in the world.

Do not enlarge only the empty opening while leaving an undersized visual ring.

Exact dimensions are MEASURE/VERIFY from the approved staggered full-setup cinematic and largest supported travelling setup envelope.

Constraints:
- no hidden asset rescaling,
- full selected setup must remain readable,
- portal must feel materially larger/more monumental than the legacy 6.8 m event-horizon reference,
- exact diameter is not frozen until visual proof establishes adequate cinematic margin.


---

## 23. Banking, repair and friendly-fire semantics

### GZ-ECO-002 — Energy Cell banking boundary
**APPROVED DIRECTION / one failure case still open**

Energy Cells collected during a sortie are **not permanently banked on pickup**.

The approved banking boundary is **return to Hangar**.

Until Hangar return, newly collected Cells are sortie-pending rather than persistent banked currency.

Still requires explicit confirmation:
- what happens to pending Cells when the player dies before a successful Hangar return,
- whether a world-to-world portal handoff preserves pending Cells as part of the same excursion.

Do not infer either case.

### GZ-REPAIR-001 — Automatic Hangar repair
**APPROVED DIRECTION / cost semantics still open**

A surviving damaged vehicle/ship is automatically repaired when it returns to Hangar.

Still requires explicit confirmation:
- whether that repair is free,
- whether any repair delay/resource exists.

Do not infer cost merely from automatic behavior.

### GZ-COMBAT-FF-001 — No friendly fire
**APPROVED**

Player/friendly attacks do not damage the friendly faction.

Protected friendly targets include:
- ally character,
- Nóma,
- allied/player-owned ships,
- allied/player-owned Bikes,
- friendly deployables/equipment such as beacons/turrets when logically friendly.

Enemy attacks may still damage those targets according to normal combat rules.


### GZ-PORTAL-014 — Left-behind equipment recall
**APPROVED**

If intact player-owned deployed equipment would otherwise be left behind when crossing a portal, the portal must surface that fact before handoff.

The player may:
- return/recover it manually,
- request **Portal Recall** for the intact owned equipment,
- or choose **Travel Anyway** and abandon it.

Portal Recall behavior:
- the player explicitly asks the portal to bring the equipment to the transit point,
- the equipment is not treated as instantly present at button press,
- after a short diegetic wait/arrival presentation, the recalled equipment appears at/near the portal,
- recalled equipment joins the surviving/present setup shown in the transit cinematic,
- only after that arrival may the portal complete the cross-world/hangar handoff with that equipment preserved.

Exact recall delay, arrival VFX, pathing/teleport presentation and ordering are **TUNE/VERIFY**, not semantic assumptions.

If the player chooses Travel Anyway, the left-behind equipment is lost when the source world is discarded.

### GZ-ECO-003 — Pending Energy Cells on death and world-to-world travel
**APPROVED**

Energy Cells collected during a sortie remain **pending** until Hangar return.

- Player death before Hangar return loses all pending Cells from that excursion.
- World-to-world portal travel preserves the pending Cell balance.
- Pending Cells continue across successive worlds.
- Returning to Hangar banks the full surviving pending balance into persistent currency.

Previously banked Cells are not part of this pending-loss rule.

### GZ-REPAIR-002 — Free instant Hangar repair
**APPROVED**

Any surviving damaged ship/vehicle that returns to Hangar is repaired automatically:
- free,
- immediate,
- no Energy Cell cost,
- no repair timer,
- no separate repair resource.

Destroyed vehicles/items remain governed by destruction/loss rules and are not resurrected by Hangar repair.


---

## 24. Host-level destruction, infinite ammo, companion recovery and death salvage

### GZ-DAMAGE-001 — Host-level equipment loss
**APPROVED**

Ship modules, mounted turrets and other attached equipment are not independently destroyed as separate gameplay units while the host vehicle remains alive.

They are lost with the vehicle when the vehicle itself is destroyed.

This applies to the host-level destruction model for:
- player ship modules,
- ally ship modules,
- mounted turrets,
- attached vehicle equipment.

This rule does not prevent temporary VFX/status feedback on attachments; it prevents independent permanent destruction/loss semantics unless a later explicit contract adds them.

### GZ-WEAPON-001 — Infinite ammunition
**APPROVED**

Baseline ship weapons and turret weapons have unlimited ammunition/energy supply for firing.

Weapon cadence may still be controlled by authored fire rate/cooldown/reload animation timing where relevant, but there is no consumable ammo inventory or finite weapon-energy resource in V1.

### GZ-COMP-008 — Companion recovery includes intact vehicle/setup
**APPROVED**

When a living/downed companion is left behind and the existing base-recovery rule returns that companion, the companion returns with the intact vehicle/equipment physically associated with their surviving setup.

This follows the same high-level preservation logic as the player:
- intact surviving setup may be recovered,
- destroyed units remain lost,
- no duplicated physical items are created.

If the companion's vehicle/equipment was destroyed before recovery, the destroyed-unit loss rule still applies.

### GZ-DEATH-002 — Salvage banks immediately after death resolution
**APPROVED**

On player death:
- pending sortie Energy Cells are lost,
- salvage is calculated as 50% of the value of the setup actually lost after companion recovery exceptions,
- that salvage amount is credited directly to persistent banked Energy Cells as part of death recovery,
- salvage does not remain pending and does not require a later successful Hangar return.

Previously banked Cells remain preserved.


---

## 25. Character recovery and player death state

### GZ-CHAR-RECOVERY-001 — Free full character recovery at Hangar
**APPROVED**

Any surviving player/companion character returning to Hangar is restored to full health automatically:
- free,
- immediate,
- no Energy Cell cost,
- no healing timer,
- no separate healing resource.

This applies to:
- player,
- ally,
- Nóma.

It does not resurrect a DEAD ally; ally revival remains governed by the paid revival rule.

### GZ-PLAYER-DEATH-003 — No player DOWNED state
**APPROVED**

The player does not enter a recoverable DOWNED state.

When player health reaches the terminal threshold, the player transitions directly into death resolution.

The companion DOWNED lifecycle remains unchanged and must not be copied onto the player.

### GZ-BIKE-RECOVERY-OPEN — Permanent Bike semantic clarification
**SEMANTIC_QUESTION**

The user stated: "la moto la tenes siempre".

Do not infer whether this means:
A. only the permanent baseline recovery Bike is always available while additional owned Bikes remain destructible/lossy,
or
B. every player Bike is non-lossy/permanently available.

This must be explicitly resolved before changing existing Bike destruction/loss semantics.

### GZ-PORTAL-CHECK-OPEN — Party + equipment check UI grouping
**SEMANTIC_QUESTION**

The semantic logic is already separate:
- companion unresolved/downed state,
- intact owned equipment left behind.

The UI/presentation may be:
A. one unified "Party & Equipment Check",
B. two sequential checks,
C. one contextual panel with separate sections.

No grouping is frozen yet.


---

## 26. Permanent baseline Bike and unified portal review UI

### GZ-BIKE-RECOVERY-001 — Permanent baseline recovery Bike
**APPROVED**

The player always has access to one **baseline recovery Bike** for future sorties.

Semantics:
- the baseline recovery Bike is a permanent fallback and cannot be permanently removed from the player's campaign,
- if the currently deployed Bike is destroyed, that deployed unit/setup may be lost according to normal destruction rules,
- attached upgrades/equipment on the destroyed deployed Bike follow normal loss semantics,
- destruction of a non-baseline/additional/Boosted Bike does not make that special unit permanent,
- after death/recovery or return to Hangar, the player still has the baseline Bike available for the next sortie.

This preserves the earlier rule that the permanent recovery Bike is a special baseline rather than a normal duplicable inventory unit.

### GZ-PORTAL-015 — Unified Party & Equipment Check
**APPROVED**

Before portal handoff, unresolved party state and left-behind intact owned equipment are presented in a **single contextual review panel** with separate semantic sections.

Required structure:

- **Party**
  - ally/Nóma status,
  - unresolved/downed state,
  - Rescue First / Travel Anyway consequences.

- **Equipment**
  - intact owned vehicles/deployables/equipment that would otherwise be left behind,
  - Portal Recall / Recover Manually / Travel Anyway consequences.

The panel unifies decision visibility, not the underlying rules.

Party recovery semantics and equipment recall semantics remain distinct and must not be collapsed into one generic ownership rule.

Travel is allowed only after required explicit choices are resolved and any requested Portal Recall arrivals have completed.


---

## 27. Session interruption, player death return, and dead-ally intact setup recovery

### GZ-SESSION-001 — Closing/reloading during a sortie returns to Hangar
**APPROVED**

If the game/session is closed, refreshed, suspended beyond recoverability, or reopened while the player is in an active world sortie, the runtime does **not** resume that exact sortie instance.

On next valid resume:
- return the player to Hangar,
- preserve only persistent/banked campaign state,
- discard the active world instance,
- discard pending sortie Energy Cells,
- do not restore the exact world position/seed/runtime state.

This is intentionally different from a normal world-to-world portal handoff, where pending Cells remain part of the same continuing excursion.

Exact crash-detection and save-journal implementation remain architecture details, but the product outcome above is fixed.

### GZ-DEATH-004 — Player death returns directly to Hangar
**APPROVED**

Player death flow:
1. resolve death/loss rules,
2. lose pending sortie Cells,
3. calculate and bank salvage,
4. show a short recovery/death presentation,
5. return directly to Hangar.

There is no intermediate recovery world/location in V1.

### GZ-COMP-009 — Dead ally returns intact surviving equipment to Hangar
**APPROVED**

If the ally character becomes DEAD:
- the ally character requires paid revival before redeployment,
- any ally-owned/assigned equipment or vehicle that is still intact is recovered automatically to Hangar,
- destroyed ally vehicle/equipment remains lost,
- no physical item is duplicated,
- intact equipment recovery does not revive the ally character.

This recovery is automatic and does not require Portal Recall merely because the ally died.
