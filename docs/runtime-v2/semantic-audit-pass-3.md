# Gravedad Zero — Semantic Reconciliation Pass 3

Status: **WORKING RECONCILIATION — NOT IMPLEMENTATION FREEZE**  
Branch: `docs/gz-runtime-v2-spec`  
Scope rule: **no inference, no silent defaults, no scope cuts**.

This pass reconciles the latest direct product decisions with the canonical FigJam, the Runtime V2 contract pack, the earlier closeout master spec, and the legacy runtime/tests used only as evidence.

## 1. Authority and clean-room rule

Order for this pass:

1. latest explicit user decision,
2. newer approved FigJam canonical contract,
3. Runtime V2 contract pack / semantic tests,
4. earlier closeout master spec,
5. legacy runtime/tests as evidence only.

If two current product rules conflict, the result is a **SEMANTIC_QUESTION**. Implementation may not pick a winner.

The new runtime is a clean-room implementation. We preserve:
- product semantics,
- assets,
- measurements,
- semantic acceptance tests re-authored from the final contract,
- benchmark / visual-proof evidence.

We do **not** migrate gameplay by copying legacy implementation functions or treating legacy code structure as the new architecture.

## 2. Latest approved decisions to carry into the canonical contract

### Hangar / cameras
- Hangar WALK is first-person.
- Hangar Inspect / Build remains a separate orbital / 360° inspection mode.
- Neither mode replaces the established gameplay camera families.

### World 1 / Nereida
- Campaign starts from the baseline Bike after the playable prologue defeat.
- Player rescues Nóma.
- Nóma gives the player the first Pistol.
- The earlier approved ship-reconstruction beat also remains: after Nóma rescue, ship-building / the first ship-piece progression begins.
- Relevant asteroids and hostile enemies can reward Energy Cells.
- Gem 1 is earned through the protected World 1 encounter and unlocks World 2.
- Exact identity / order of Front, Beacon, Turret, Middle and Final inside this progression is still under reconciliation; no implementation may infer it.

### Personal weapons / ally economy
- Player Pistol supplied by Nóma has unlimited ammunition.
- Ally does not clone the player's Pistol; an additional physical Pistol unit is purchased for the ally.
- Ally Bike, Ally Ship, ship modules, turrets and other compatible setup are purchased using the same Energy Cell economy and physical-ownership rules as the player's equivalents.

### Bike availability / weapon semantics
- Baseline Bike remains a permanent fallback and can always be selected for a sortie/farming even if the player has lost the ship.
- Selecting a ship does not by itself imply that the Bike must also deploy.
- Bike has no integrated baseline vehicle weapon.
- An equipped rider Pistol remains usable with the Bike according to the personal-weapon contract.
- Ship Front remains a valid ship and retains its integrated baseline ship shot.

### Turrets / surfaces / Beacon
- A purchased turret is one physical inventory unit.
- Turret representation / mount scale adapts to the compatible host surface.
- Host assignment/reconfiguration occurs in Hangar setup, not during an active sortie.
- Turrets fire autonomously.
- No minimum turret count is required on Ship or Bike.
- The old semantic Bike tier `2 -> 4` is superseded: three Bike-mounted turrets are valid when three compatible physical units are owned and the verified Bike surfaces support them. Exact physical maximum is VERIFY from geometry/surface evidence, not an invented gameplay tier.
- Beacon is a physical inventory deployable configured before launch. A Beacon may be configured with at most one actually-owned turret.
- Deploying the Beacon in-world activates its sensor/navigation role; any preconfigured mounted turret operates autonomously there.
- Beacon without a turret remains a valid sensor/navigation anchor.
- No turret host swap occurs in-world.

### Companion command execution
- Tactical Map pauses local gameplay/simulation while open.
- Orders configured in Tactical Map begin executing when the map closes.
- Ally can Explore / Defend via EVA, Bike or Ship according to the committed physical setup.
- If the commanded compatible vehicle is physically elsewhere, the Ally travels to it, boards it, then executes the task. No teleport.
- Nóma does not use Bike or Ship.

### Hordes / asteroid response
- H4 is approved.
- Not every asteroid triggers enemies.
- Designated mission/high-risk destruction triggers may produce a normal hostile encounter and may escalate to horde pressure according to encounter context.
- Hordes also exist independently through already-approved sources such as carrier, portal, Mothership or WorldDirector events.
- Hordes require telegraph and preserve logical population independently from representation budget.
- Exact thresholds / probabilities / counts remain BALANCE.

### Revisit threat / Heat
- Previously unlocked worlds remain revisitable.
- Base world identity/content is preserved; progression does not replace old content with generic level scaling.
- Campaign progression may enable higher-threat encounter families with correspondingly higher configured rewards.
- Heat is local to one active world instance.
- Heat rises through both elapsed active-world time and relevant player activity.
- Heat never decreases within that world instance.
- Changing to another world starts that destination at its own baseline Heat.
- Heat does not apply an abstract reward multiplier. Higher Heat enables/selects genuinely higher-threat encounters whose own configured rewards are higher.
- Exact Heat rates, thresholds and encounter weights are BALANCE.

### Mobile / postgame
- Gameplay is landscape-only on mobile.
- Portrait shows a rotate-device guard.
- After the ending, free postgame sandbox play remains available across the unlocked worlds and owned systems.
- No NG+, fourth world or additional currency is implied.

### UI representation
- If a gameplay entity has a canonical 3D model, Tactical Map / inventory / Hangar menus use a derived render/thumbnail of that model rather than replacing it with generic object iconography.
- Functional overlays such as HP, state, order, distance, countdown and selection remain allowed/required for legibility.
- Locked/unknown catalog entries use the approved silhouette state; unlocked-but-unowned items use ghost/holographic preview; owned items use the canonical asset.

## 3. Superseded / stale semantics that must not survive the freeze

The following must be removed or explicitly marked SUPERSEDED in canonical implementation-facing material:

- Portable Portal consumes a turret slot.
- Bike base 2 -> upgrade 4 as a mandatory semantic progression tier.
- Any minimum requirement of two mounted turrets per ship module.
- Any assumption that the Bike has an integrated baseline weapon.
- Any assumption that one physical Pistol can be cloned for player + ally.
- Any portrait-orientation gameplay requirement.
- Any Attack/Tank companion tactical-role system beyond Explore / Defend and transversal Recall.
- Any requirement to change turret host during an active sortie.
- Blueprint / technology-zone / third-currency mechanics not explicitly approved.
- Any implementation rule that deletes logical horde population to satisfy render performance.
- Any performance failure being interpreted as permission to reduce companions, ships, modules, portals, hordes, beacons or camera capability.

## 4. Remaining semantic questions — implementation blockers only

### P3-PRESET-01..03 — Presets
**RESOLVED**

- local save,
- three explicit named slots per ship,
- Player Ship and Ally Ship own independent three-slot sets,
- Save updates selected slot,
- Save As uses an empty slot or explicit Replace Slot 1/2/3,
- no FIFO / silent deletion,
- explicit rename/overwrite,
- presets never clone inventory,
- LOST referenced item leaves preset saved as INCOMPLETE,
- INCOMPLETE preset may be inspected/edited but cannot confirm launch.

### P3-W1-01 — Exact Nereida purchase-unlock order
**PARTIAL**

Approved:
- rescue Nóma,
- Nóma gives player Pistol,
- safely returning to Hangar with Nóma makes Cabina / Front available for assembly,
- subsequent improvements/articles are purchased with Energy Cells once explicitly unlocked by EventDirector,
- protected encounter grants Gem 1.

Still needs exact Director milestone/order for:
- Beacon purchasable,
- Turret purchasable,
- Middle purchasable,
- Final/Back purchasable,
- any other already-approved World-1 improvement/article.

Do not restore the legacy stage order automatically.

### P3-TURRET-01 — Host adaptation / mounting Cell cost
Approved:
- turret purchase is separate from host assignment,
- host/surface determines visual/mount adaptation,
- host cannot change in-world.

Still unresolved after source review:
- whether changing/adapting an already-owned turret to another compatible host in Hangar costs Energy Cells.
- preset activation must never apply any such cost invisibly.

### P3-ENCOUNTER-01 — World/campaign encounter-family matrix
Core system is approved:
- world identity preserved,
- campaign milestones may add higher-threat encounter families,
- Heat selects/escalates pressure,
- H4 asteroid response,
- no generic numerical level scaling.

Still needs content-level contract:
- which encounter families are enabled in Nereida/Vesper/Umbra at base, after World 2 unlock, after Mothership reveal, and in postgame.

Exact counts/weights remain BALANCE after the family matrix is fixed.

### P3-POSTGAME-01 — Mothership incursions after final boss
**RESOLVED**

Free postgame remains approved. After `bossDefeated = true`, Mothership-incursion events cease permanently and are removed from EventDirector eligibility; other approved postgame farming/encounter systems remain available.

## 5. Non-semantic work — do not ask product to guess

Remain MEASURE / VERIFY / PRODUCE / BALANCE:
- final Bike surface capacity,
- ship-module exact turret capacities,
- mount prices if the mount-cost semantic is approved,
- Heat rates/thresholds/weights,
- horde logical/representation counts,
- cell size/radii/remote Hz,
- ScaleProfiles,
- cockpit/Hangar/portal exact geometry and camera proof,
- Mothership production dimensions/sockets/LOD/collider,
- portal exact aperture/formation/timing,
- renderer A/B,
- LOD/pooling/shadow/texture/performance budgets,
- final VFX/audio tuning,
- exact item/revival/Portable Portal prices unless separately frozen.

## 6. Required next pass before implementation freeze

1. Resolve remaining P3-W1-01, P3-TURRET-01 and P3-ENCOUNTER-01.
2. Rewrite stale sections in contracts / assumption register / semantic oracle.
3. Add/update semantic tests for every newly approved rule.
4. Run semantic CI.
5. Re-run final scale/asset/geometry evidence against the final contracts/assets.
6. Run visual proof pass.
7. Run Perf Lab without product-scope cuts.
8. Run adversarial audit.
9. Freeze only when:
   - semantic questions = 0,
   - contradictions = 0,
   - stale executable semantics = 0,
   - implementation inference = 0,
   - scope cuts = 0.


## Pass 3 update — shared turret motion

**APPROVED**

Autonomous turret movement logic is common across Ship, Bike, Nóma and Beacon.

The same authored yaw/pitch/fire/return-to-scan hierarchy and combat state machine should be reused. Host differences are mount/socket/scale/clearance production data, not separate AI or animation families.

Exact host-specific mechanical rotation limits remain VERIFY from real geometry. No non-uniform runtime deformation and no in-world host swap are authorized.
