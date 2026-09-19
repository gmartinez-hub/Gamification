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
| SEM-PORTAL-001 | Natural portal opportunity appears | It is reachable and time-bounded; if missed/ignored it closes and a later procedural opportunity can recur elsewhere. Discovery/notification follows the explicit portal-detection contract. |
| SEM-PORTAL-002 | Choose unlocked world | Party Check resolves first; then destination preloads while surviving/present selected setup enters ring cinematic. |
| SEM-PORTAL-003 | Successful handoff | Destination is a fresh procedural instance; old world instance is released; control returns to the same actor/vehicle used to enter the portal. |
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
| SEM-DEATH-001 | Player dies with 300 Cells of setup actually destroyed and other deployed setup intact | Only destroyed/lost units contribute to salvage; 150 Cells are banked as salvage; intact surviving setup returns; unlocks persist; baseline recovery Bike remains available. |
| SEM-DEATH-002 | Player dies with intact expensive deployed gear and some destroyed gear | Intact gear returns to Hangar; only destroyed gear is LOST and salvage-valued; unlocks remain. |
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


## Ally parity / Boost / presentation

| ID | Scenario | Expected |
|---|---|---|
| SEM-ALLY-SHIP-001 | Player light ship, ally heavy turret ship | Both use same module/movement rules; independent physical loadouts; no item cloning. |
| SEM-ALLY-SHIP-002 | Same physical turret assigned to player and ally | Rejected unless two owned turret units exist. |
| SEM-BOOST-001 | Hold Bike/Ship Boost continuously | Boost remains active without heat/cooldown/Cell drain; allocations remain bounded. |
| SEM-BOOST-002 | Ship terminal module changes | PrimaryBoostExhaust resolves at actual exposed terminal module. |
| SEM-BIKE-EXP-001 | Back-derived Bike concept evaluated | Pass only if rider/camera/collision/silhouette checks all pass or require bounded support geometry; no forced distortion. |
| SEM-PRES-ALLY-001 | Ally damaged/downed/dead | Each state has distinct escalation and remains distinguishable from player/Nóma events. |
| SEM-PRES-PLAYER-001 | Player enters critical then dies | Critical remains readable; death sequence takes priority and disables control before recovery. |


## Bike failure / ally loadout semantics

| ID | Scenario | Expected |
|---|---|---|
| SEM-ALLY-AI-001 | Ally configured with heavy turret ship | Ally uses the actual equipped weapons/turrets; no separate tank-role bonus or extra tactical-role menu is required. |
| SEM-BIKE-FAIL-001 | Bike destroyed, player ship exists in world | Player continues in EVA and must manually recover/board/reach portal; no teleport to ship. |
| SEM-BIKE-FAIL-002 | Bike destroyed, no ship deployed, portal reachable | Player may continue in EVA and attempt emergency return through portal. |
| SEM-BIKE-FAIL-003 | Bike destroyed, no ship deployed, no viable recovery route remains | Sortie is lost and normal death/recovery resolution applies. |
| SEM-BIKE-FAIL-004 | Boosted Bike destroyed | Same stranding/exposure semantics as normal Bike; no hidden special recovery. |


## Ship composition / movement semantics

| ID | Scenario | Expected |
|---|---|---|
| SEM-SHIP-COMP-010 | Try to confirm a ship without Front | Rejected before launch. |
| SEM-SHIP-COMP-011 | Front-only with no mounted turrets | Valid ship; retains baseline integrated ship shot capability. |
| SEM-MOVE-010 | Compare standard V1 traversal classes | Front+Final > Bike > Front > Front+Middle×N+Final > Front+Middle×N > Astronaut, before conditional Boosted Bike. |
| SEM-MOVE-011 | Compare 1 Middle vs 7 Middles with same Back presence | Same qualitative cargo/heavy speed tier; no hidden per-Middle speed decay. |
| SEM-MOVE-012 | Ally follows/defends a player vehicle that Boosts | Ally-controlled vehicle may engage its own Boost as needed to maintain follow/defend behavior; no new command mode is created. |
| SEM-BOOST-010 | Normal movement without Shift | Directional/maneuver thrusters respond; PrimaryBoostExhaust remains off. |
| SEM-BOOST-011 | Shift/Boost engaged | PrimaryBoostExhaust activates on the actual exposed terminal module/Bike center and performative speed state becomes visible. |


## Death priority / ship destruction / astronaut boost

| ID | Scenario | Expected |
|---|---|---|
| SEM-EVA-BOOST-001 | Astronaut presses Shift/Boost in EVA | EVA Boost state activates; exact speed/FX values come from balance/tuning, not legacy constants. |
| SEM-DEATH-COMP-001 | Player dies while living/downed ally carries owned equipment | Ally + carried equipment return to Hangar; that equipment is excluded from lost-setup salvage value. |
| SEM-DEATH-COMP-002 | Player dies while living/downed Nóma carries owned equipment | Nóma + carried equipment return to Hangar; that equipment is excluded from lost-setup salvage value. |
| SEM-DEATH-COMP-003 | Player dies with other deployed setup present | Intact surviving setup returns to Hangar; only actually destroyed/LOST units contribute to the 50% salvage calculation. |
| SEM-SHIP-FAIL-001 | Player ship destroyed, player survives | Ship + attached equipment are lost; player remains EVA and must manually recover. |
| SEM-SHIP-FAIL-002 | Player ship destroyed, no viable recovery route | Sortie is lost; normal death/recovery resolution applies. |
| SEM-SHIP-FAIL-003 | Ally ship destroyed, ally survives | Ship + attached equipment are lost; ally remains a character and can continue/down/be rescued/recovered. |


## Companion command parity

| ID | Scenario | Expected |
|---|---|---|
| SEM-COMP-CMD-001 | Issue Explore to unlocked ally | Ally uses the shared Explore high-level command; no separate ally role menu appears. |
| SEM-COMP-CMD-002 | Issue Defend to ally with heavy turret loadout | Ally defends using actual equipped weapons/turrets; no hidden tank-role multiplier is added. |


## Boosted Bike progression

| ID | Scenario | Expected |
|---|---|---|
| SEM-BIKE-PROG-001 | Before World 3 mothership reveal | Boosted Bike purchase remains locked even if player has 1,500+ Energy Cells. |
| SEM-BIKE-PROG-002 | World 3 mothership reveal unlocked + geometry validation PASS + 1,500 Cells | Boosted Bike purchase is allowed and costs exactly 1,500 Energy Cells at initial balance. |
| SEM-BIKE-PROG-003 | Geometry validation fails | Boosted Bike cannot be purchased merely by having the progression unlock/Cells; feature stays blocked for production correction/review. |
