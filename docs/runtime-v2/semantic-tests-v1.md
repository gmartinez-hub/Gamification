# Gravedad Zero — Semantic Tests V1

These tests validate meaning before implementation detail. A runtime may be technically functional and still fail if it violates these outcomes.

## World/navigation

| ID | Scenario | Expected |
|---|---|---|
| SEM-WORLD-001 | Player crosses the old x=+220 equivalent | No clamp, stop or velocity cancellation. Adjacent cells continue traversal. |
| SEM-WORLD-002 | Player travels far from origin | No visible precision jitter caused by huge render coordinates; logical position remains stable. |
| SEM-WORLD-003 | Leave and re-enter a streamed cell in same sortie | Procedural content resolves from the same seed; no silent reroll. |
| SEM-WORLD-004 | Travel indefinitely away from narrative POIs | Navigation remains valid; no invisible wall. Backdrop does not become a collision planet. |

## Cross-world portal

| ID | Scenario | Expected |
|---|---|---|
| SEM-PORTAL-001 | Discover portal | It remains available for the current world instance and appears on Tactical Map. |
| SEM-PORTAL-002 | Choose unlocked world | Destination preloads while current selected setup enters ring cinematic. |
| SEM-PORTAL-003 | Successful handoff | Destination is a fresh procedural instance; old world instance is released. |
| SEM-PORTAL-004 | Destination load fails | Player returns safely to source portal; inventory/save remains valid. |
| SEM-PORTAL-005 | Choose Hangar | Same transit contract, destination is Hangar memory boundary. |

## Inventory/item identity

| ID | Scenario | Expected |
|---|---|---|
| SEM-ITEM-001 | Own one turret and save two presets using it | Presets may reference it but cannot deploy two copies simultaneously. |
| SEM-ITEM-002 | Move turret from Nóma to bike | Same itemId; new mount cost may apply; no duplicated unit remains on Nóma. |
| SEM-ITEM-003 | One Habitat module, player + ally ships | Only one ship can own it at a time unless a second physical unit exists. |
| SEM-ITEM-004 | Menu thumbnail vs Hangar model vs deployed model | All represent the same underlying item/state. |
| SEM-ITEM-005 | Unlocked but unowned module | Selectable/purchasable in Hangar, not deployable as if owned. |

## Turrets/capacity

| ID | Scenario | Expected |
|---|---|---|
| SEM-TURRET-001 | Mount one turret on Nóma | Unit visually scales for Nóma, remains same physical item. |
| SEM-TURRET-002 | Try third turret on Nóma | Rejected; max 2. |
| SEM-TURRET-003 | Base bike with 3 turrets | Rejected until capacity upgrade allows >2. |
| SEM-TURRET-004 | Upgraded bike with 4 purchased units | Up to 4 may be assigned if all units exist. |
| SEM-TURRET-005 | Beacon gets second turret | Rejected; max 1. |
| SEM-TURRET-006 | Ship module capacity exceeded | Placement rejected by module capacity/surface contract, not by arbitrary global cap. |

## Companions

| ID | Scenario | Expected |
|---|---|---|
| SEM-COMP-001 | Deploy unlocked Nóma with no accessories | No Nóma deployment fee. |
| SEM-COMP-002 | Nóma far away | Logical state continues without requiring full visual representation. |
| SEM-COMP-003 | Remote Nóma attacked | Damage is real and player receives distinctive alert/map state. |
| SEM-COMP-004 | Issue Explore | Nóma explores until order changes/recall/downed/dead. |
| SEM-COMP-005 | Issue Defend player | Nóma protects player; one active high-level order only. |
| SEM-COMP-006 | Issue Defend assigned ship | Protection target changes to that owned ship/vehicle. |
| SEM-COMP-007 | Companion becomes DOWNED | Remains at logical position and is rescueable during same sortie. |
| SEM-COMP-008 | Rescue downed companion | Companion returns active with pre-launch setup intact. |
| SEM-COMP-009 | End sortie while ally alive/downed | Ally + equipment recover to Hangar, no revive fee. |
| SEM-COMP-010 | Ally DEAD | Unlock remains; revive payment required before next deployment. |
| SEM-COMP-011 | Nóma disabled/dead-like failure | No character revive fee; physical equipment follows item-loss contract. |

## Tactical map

| ID | Scenario | Expected |
|---|---|---|
| SEM-MAP-001 | Open map | 2D map only; no heavy second 3D world. |
| SEM-MAP-002 | Tap empty space | No arbitrary waypoint is created. |
| SEM-MAP-003 | Nóma discovers POI | POI remains marked for current sortie. |
| SEM-MAP-004 | Asset above/below player | Marker conveys altitude with +/- metres/chevrons. |
| SEM-MAP-005 | Select known marker | Heading/distance guidance appears; no autopilot. |

## Death/economy

| ID | Scenario | Expected |
|---|---|---|
| SEM-DEATH-001 | Deployed setup total value = 300 Cells, player dies | Physical setup lost; recovery grants 150 Cells; unlocks persist; recovery bike remains available. |
| SEM-DEATH-002 | Player dies with unlocked expensive gear | Gear can be repurchased/rebuilt because unlock remains. |
| SEM-DEATH-003 | Successful extraction with living beacon/turret | Unit returns to Hangar. |
| SEM-DEATH-004 | Unit destroyed before extraction | Unit remains lost; unlock persists. |

## Combat/asteroids/hordes

| ID | Scenario | Expected |
|---|---|---|
| SEM-AST-001 | Hostile asteroid hits player/ship/rock | Breaks on first meaningful collision; no multi-bounce sandbox behavior. |
| SEM-AST-002 | Ship collides with large asteroid | Damage + deflection; asteroid is not pushed around as a general rigid body. |
| SEM-SPAWN-001 | Enemy encounter begins | No close-range visible pop-in; arrival is prewarmed/believable. |
| SEM-HORDE-001 | Horde triggers | Telegraph occurs before full engagement. |
| SEM-HORDE-002 | Logical horde > render budget | Encounter population remains; visual representation is promoted/demoted without deleting logical enemies. |

## Boss

| ID | Scenario | Expected |
|---|---|---|
| SEM-BOSS-001 | Start Siege | Core not damageable; gem weak points + existing combat systems drive progression. |
| SEM-BOSS-002 | Destroy early weak point | Corresponding boss pressure/capability decreases per config. |
| SEM-BOSS-003 | Destroy remaining crown gems | Core becomes vulnerable. |
| SEM-BOSS-004 | Destroy core | Combat ends; gems eject; ending begins automatically, no pickup requirement. |

## Loading/memory

| ID | Scenario | Expected |
|---|---|---|
| SEM-LOAD-001 | Hangar -> world | Full Hangar is released after safe world handoff. |
| SEM-LOAD-002 | World -> Hangar | World heavy resources are released under extraction/recovery transition. |
| SEM-LOAD-003 | 20 world/hangar/portal cycles | No monotonic orphaned asset/residency growth beyond known caches. |

## Controls/mobile

| ID | Scenario | Expected |
|---|---|---|
| SEM-INPUT-001 | Desktop | WASD + direct mouse aim/camera + click fire. |
| SEM-INPUT-002 | Mobile portrait | Gameplay blocked with rotate-device UI. |
| SEM-INPUT-003 | Mobile landscape | Left movement + right aim/fire gameplay enabled. |

## Contract rule

A failed semantic test is not a request to simplify the feature. Fix implementation or reopen the exact contract explicitly.


## Cockpit / Hangar / portal spatial semantics

| ID | Scenario | Expected |
|---|---|---|
| SEM-COCKPIT-001 | Board ship from exterior | Player appears standing in cockpit bay first; Sit remains an explicit action. |
| SEM-COCKPIT-002 | Stand from seated pilot state | Existing rise transition is reused; player reaches standing third-person state. |
| SEM-COCKPIT-003 | Move while standing | Movement remains inside visible cockpit-bay architecture; no invisible arbitrary world clamp. |
| SEM-COCKPIT-004 | Raw model contains depth hidden by runtime clipping | Fix runtime composition first; do not author duplicate replacement geometry. |
| SEM-HANGAR-001 | Open Hangar | Stable orbital-base environment; no previous/next gameplay world kept resident as physical backdrop. |
| SEM-HANGAR-002 | Select owned inventory item | Same itemId is presented/focused in 3D; no duplicate ownership created. |
| SEM-HANGAR-003 | Preview unlocked/unowned item | Preview is visually marked holographic/ghost and cannot deploy as owned. |
| SEM-HANGAR-004 | Preview ship module | Module can move/explode/ghost toward compatible connection; inventory changes only on Confirm. |
| SEM-PORTAL-PARTY-001 | Companion downed before portal confirmation | UI warns before threshold and offers Rescue First / Travel Anyway. |
| SEM-PORTAL-PARTY-002 | Choose Rescue First | Cross-world handoff is cancelled; current world instance remains active. |
| SEM-PORTAL-PARTY-003 | Leave alive/downed Nóma | Travel proceeds; Nóma is base-recovered with no character revive fee. |
| SEM-PORTAL-PARTY-004 | Leave alive/downed ally | Travel proceeds; ally returns to base with no revive fee. |
| SEM-PORTAL-PARTY-005 | Ally is DEAD | Travel may proceed; paid revival requirement persists. |


| SEM-HANGAR-005 | Confirm setup contains two bikes | Walkable Hangar physically shows two bikes; count matches setup exactly. |
| SEM-HANGAR-006 | Ally/Nóma not selected for sortie | Character does not appear as an ambient physical reminder in Hangar WALK. |
| SEM-HANGAR-007 | Unlocked but unowned item exists | It does not populate the ambient Hangar; it is available only through Inventory/Build preview. |
| SEM-HANGAR-008 | Player approaches selected ship/vehicle | Boarding action is available and leads into the established boarding/cockpit flow. |
| SEM-HANGAR-009 | First-person Hangar camera | Must be validated against real audited service-bay geometry; no silent third-person substitution. |
