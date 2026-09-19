# Gravedad Zero — Ship Composition & Movement Contract V1

Status: **SEMANTIC FREEZE READY — progression/economy extensions deferred; measurement/tuning pending**

## 1. Clean-room rule

Legacy movement/composition code is evidence only. V2 implements these contracts independently.

Useful legacy evidence:
- Old composition validation already required a front module first and allowed repeated middle modules.
- Old front module had its own exposed thrusters in the front-only state, proving that a front-only mobile ship was previously representable.
- Old speed profiles were: astronaut 3.6, ship 8, bike 14 base speed. This **conflicts** with the newly approved semantic hierarchy and is classified as an ANTI_PATTERN for V2 speed ordering.

## 2. Ship composition grammar

### GZ-SHIP-COMP-001 — Front is mandatory
**APPROVED**

Every deployable player/ally ship composition MUST begin with exactly one Front module.

The Front contains the cockpit/pilot station and is therefore a hard system requirement.

Invalid:
- Middle
- Final/Back
- Middle + Final
- any composition without Front

### GZ-SHIP-COMP-002 — Minimum valid ship
**APPROVED**

Minimum deployable ship:

`Front`

A Front-only ship must be a valid mobile/piloted craft.

### GZ-SHIP-COMP-003 — Optional back/final
**APPROVED**

Valid composition families include at least:

- `Front`
- `Front + Final`
- `Front + Middle × N`
- `Front + Middle × N + Final`

where `N >= 1`.

No Final module is required merely to make a ship valid.

### GZ-SHIP-COMP-004 — Repeated middle modules
**APPROVED mechanism / MEASURE practical limit**

Middle modules may repeat.

No hard cap is inferred from the Hangar geometry. A V1 practical cap may be introduced only from:
- performance evidence,
- gameplay/balance evidence,
- save/UI/physics reliability evidence.

Economy may make extreme compositions impractical, but economy is not the only safety mechanism.

### GZ-SHIP-COMP-005 — Hangar does not define ship validity
**APPROVED**

A valid ship is not rejected simply because its full length cannot fit inside the visual core of the Hangar.

The Hangar assembly/staging lane may extend toward the orbital opening; very long valid ships may visibly project outside the main service-bay enclosure.

## 3. Propulsion semantics

### GZ-SHIP-MOVE-001 — Front-only mobility
**APPROVED outcome / IMPLEMENTATION-FREE**

Because Front-only is a valid deployable craft, it MUST have sufficient baseline propulsion/control to:
- launch,
- translate,
- turn,
- brake,
- travel between gameplay locations.

The contract intentionally does not prescribe whether V2 implements this with integrated cruise propulsion, maneuvering-thruster abstraction or another clean solution. Implementation must satisfy the movement/Boost/exhaust contracts without inheriting the legacy mechanism.

### GZ-SHIP-MOVE-002 — Final/Back effect
**SUPERSEDED / RESOLVED**

Final/Back is the propulsion-performance differentiator. See GZ-MOVE-008/009:
- Front + Final is the fastest/most agile standard ship configuration.
- Cargo/heavy compositions with Final are faster than the same cargo composition without Final.
- Exact numeric acceleration/braking values remain BALANCE/MEASURE.

### GZ-SHIP-MOVE-003 — Middle-module movement effect
**SUPERSEDED / RESOLVED**

Any composition with one or more Middle modules enters the cargo/heavy movement class.

For V1, additional Middle count does not create further speed tiers. The benefit of Middle modules is additional surface/capacity for equipment/turrets and other authored module capability.

## 4. Movement hierarchy

### GZ-MOVE-001 — Base top-speed ordering
**APPROVED**

At comparable baseline progression, before the conditional Boosted Bike upgrade:

`Front+Final > Bike > Front > Front+Middle×N+Final > Front+Middle×N > Astronaut`

The conditional late-game Boosted Bike, if it passes geometry/camera validation and is unlocked, becomes the fastest player-controlled vehicle.

Exact values are MEASURE/BALANCE.

### GZ-MOVE-002 — Acceleration/handling
**APPROVED qualitative behavior / MEASURE values**

- Bike has the strongest immediate acceleration response, especially under Boost.
- Front+Final is the most agile standard ship configuration.
- Front-only is less performant than Front+Final.
- Cargo/heavy compositions accelerate/turn more slowly than compact ship configurations.
- Exact braking, turn-rate and acceleration values are BALANCE/MEASURE.

### GZ-MOVE-003 — Boost
**APPROVED**

- All valid ship compositions have freely holdable Boost.
- Bike has freely holdable Boost.
- Astronaut EVA retains freely holdable Boost.
- V1 Boost has no heat, cooldown, fuel or Energy Cell drain.
- Ally-controlled vehicles may use their own Boost automatically when needed to continue following/defending a boosted player-controlled vehicle; this adds no new tactical command.

## 5. Speed presentation contract

### GZ-MOVE-FX-001 — Speed must read visually
**APPROVED**

Movement speed differences must be visible/audible, not only numerical.

The feedback stack may use:
- thruster flame length/intensity,
- engine emissive intensity,
- star/particle streak density and length,
- controlled FOV widening,
- camera inertial lag/impulse,
- vehicle lean/body motion,
- engine/wind/energy audio layers,
- restrained screen-space filtering.

The effect scales with normalized speed/boost state.

### GZ-MOVE-FX-002 — No gameplay-obscuring effect
**APPROVED**

Speed feedback must not obscure aim, targets or traversal.

Heavy blur is not a required speed effect. Prefer particles, FOV, exhaust, audio and camera inertia.

### GZ-MOVE-FX-003 — Semantic parity
**APPROVED**

VFX tier/LOD may reduce visual complexity at distance/device pressure, but it must not alter actual vehicle speed or acceleration.

## 6. Speed upgrades

### GZ-MOVE-UPGRADE-001 — Faster-travel upgrade family
**PROPOSED / NOT FROZEN**

A progression upgrade may improve one or more of:
- ship top speed,
- acceleration,
- boost,
- efficiency.

Implementation is primarily configuration/code plus corresponding VFX/audio scaling.

Open economy/progression choice:
- Energy Cells purchase the upgrade,
- Gem/world milestone unlocks a tier and Energy Cells purchase it,
- another explicitly approved rule.

Narrative gems are not assumed to become spendable currency.

## 7. Measurement model

Each controllable actor/vehicle gets a MovementProfile:

```ts
type MovementProfile = {
  semanticKey: string;
  topSpeed: number;
  acceleration: number;
  braking: number;
  turnRate: number;
  boostTopSpeed?: number;
  boostAcceleration?: number;
  massClass?: string;
  speedFxProfile: string;
  provenance: string[];
  status: 'MEASURE' | 'APPROVED' | 'BALANCE';
}
```

Ship MovementProfile may be derived from composition only through explicitly approved rules.

## 8. Semantic tests

- SEM-COMP-001: composition without Front is rejected before launch.
- SEM-COMP-002: Front-only ship can launch, steer, brake and travel.
- SEM-COMP-003: Front + Final is valid.
- SEM-COMP-004: Front + repeated Middle modules is valid.
- SEM-COMP-005: Front + repeated Middle + Final is valid.
- SEM-COMP-006: a long valid ship is not rejected solely because the central Hangar shell cannot fully enclose it.
- SEM-MOVE-001: baseline Ship top speed > Bike top speed > Astronaut top speed.
- SEM-MOVE-002: speed feedback increases perceptibly with normalized speed without obscuring aiming.
- SEM-MOVE-003: changing LOD/VFX tier does not change movement physics.


---

# Decision Update — Movement / Boost / Thruster Semantics

## Approved composition-speed relations

### GZ-MOVE-004 — Front + Final is the fastest ship composition
**APPROVED**

Among player/ally ship compositions, `Front + Final` is the fastest and most agile ship configuration.

It is the mobility-specialist configuration: minimum hull plus dedicated Final/Back propulsion.

### GZ-MOVE-005 — Middle modules trade mobility for weapon surface
**APPROVED**

Adding Middle modules exists primarily to increase usable surface/capacity for turret mounting and other module-provided capability.

A composition containing Middle modules is slower than `Front + Final`.

### GZ-MOVE-006 — Front-only and Bike relative ordering
**APPROVED**

- Front-only is a valid mobile ship.
- Bike is faster than Front-only.
- Front-only remains faster than a Middle-heavy configuration without the mobility benefit of the Final/Back.
- `Front + Final` is faster than Bike.

Therefore the explicitly approved relations are:

`Front+Final > Bike > Front > Front+Middle...`

Resolved ordering: `Front > Front+Middle×N+Final > Front+Middle×N`.

### GZ-MOVE-007 — Bike acceleration
**APPROVED**

Bike has stronger/faster acceleration response than ship configurations, especially when Boost is engaged.

Ship may retain the highest top speed in `Front+Final`, while Bike remains the sharper short-response vehicle.

## Boost

### GZ-BOOST-001 — Boost on all ship compositions
**APPROVED**

Every valid ship composition has Boost, including:
- Front-only,
- Front + Final,
- Front + Middle × N,
- Front + Middle × N + Final.

Boost is not conditional on having Final/Back.

### GZ-BOOST-002 — Bike Boost
**APPROVED**

Bike has Boost and its acceleration response must feel especially strong.

### GZ-BOOST-003 — Normal thrust vs Boost exhaust
**APPROVED visual behavior**

Normal directional/maneuvering thrust feedback is active during ordinary movement according to the actual thrust vector; it is not a Shift-only effect.

When Boost is engaged:
- a distinct large central/main exhaust effect activates at the exposed rear of the current vehicle/ship,
- its intensity/length/burst is substantially stronger than normal maneuvering exhaust,
- the change is accompanied by speed-presentation FX/audio.

For ships, every valid composition therefore requires a valid **PrimaryBoostExhaust** representation at its exposed rear. The exact Blender socket/runtime VFX solution is PRODUCE and must follow the assembled terminal module rather than assume Final is present.

### GZ-BOOST-004 — Bike nozzle family
**SUPERSEDED / RESOLVED**

Bike keeps the four normal directional/maneuvering nozzles and adds one central PrimaryBoostExhaust used specifically for Shift/Boost. See GZ-BOOST-008.

## Boost presentation

### GZ-BOOST-FX-001 — Shift/Boost presentation state
**APPROVED requirement / TUNE values**

Boost must be perceptible beyond exhaust/audio.

Use a restrained stack such as:
- edge-biased star/particle streaks,
- short FOV expansion,
- camera inertia/impulse,
- subtle edge distortion/contrast/exposure treatment,
- stronger vehicle exhaust/emissive,
- layered boost audio.

Avoid full-screen blur that compromises navigation or aim.

## Remaining movement questions

### GZ-MOVE-OPEN-001 — Front + Middle × N + Final ordering
**RESOLVED**

`Front > Front+Middle×N+Final > Front+Middle×N`.

Final improves the heavy/cargo class but does not make a Middle-equipped ship faster than the compact Front-only craft.

### GZ-MOVE-OPEN-002 — Additional Middle penalty curve
**RESOLVED V1**

No progressive speed-tier penalty by Middle count in V1. One or seven Middles remain in the same cargo/heavy movement class when Back presence is equal.

This does not remove future balance knobs for other properties, but implementation must not invent per-Middle speed decay.

### GZ-MOVE-OPEN-003 — Astronaut Boost
**RESOLVED / APPROVED**

Astronaut EVA retains the same freely holdable Shift/Boost resource semantics as V1 Ship/Bike Boost: no heat, cooldown, fuel or Energy Cell drain.

Exact EVA boost top speed, acceleration response and presentation intensity remain BALANCE/TUNE. No legacy movement constant is copied as canonical.

### GZ-MOVE-OPEN-004 — Boost resource model
**RESOLVED for Ship/Bike**

Ship and Bike Boost are freely holdable in V1 with no heat, cooldown, fuel or Energy Cell drain. See GZ-BOOST-009.

### GZ-MOVE-OPEN-005 — Generic speed upgrade progression
**RESOLVED / SUPERSEDED**

Resolved by GZ-SPEED-UPGRADE-007 through GZ-SPEED-UPGRADE-009:
- one global friendly upgrade,
- +15% base top speed,
- +20% base acceleration,
- 1,000 Energy Cells,
- unlock after second gem / World 3 access,
- additive with moment-to-moment Boost.

### GZ-FIRE-001 — Minimum ship weapon
**APPROVED**

A valid Front-only ship retains a baseline integrated ship shot/weapon equivalent in product capability to the current working ship fire behavior.

This preserves the capability, not the legacy implementation. Mountable turrets are additional equipment, not a prerequisite for the Front craft to fire.

## Middle-module limit clarification

There is **no approved Middle hard cap right now**.

V2 must support `Middle × N` structurally. A practical V1 maximum may be introduced only if benchmark/reliability evidence requires it. If introduced, it must be an explicit visible gameplay rule, never a hidden runtime clamp.


---

# Decision Update — Terminal Propulsion / Cargo Speed / Central Boost Exhaust

## Approved ship speed tiers

### GZ-MOVE-008 — Composition tiering
**APPROVED**

Ship speed is determined primarily by whether the composition contains Middle cargo modules and whether it contains Final/Back propulsion.

Approved qualitative ordering:

`Front + Final` = fastest / most agile ship configuration.

`Front` = compact baseline ship; slower than Bike and slower than Front+Final.

`Front + Middle×N` = cargo/weapon-surface configuration; slower than Front.

`Front + Middle×N + Final` = cargo configuration with propulsion support; still a large/slower ship, but faster than the same cargo configuration without Final.

The number of Middle modules does **not** create additional speed tiers by itself for V1. One Middle or seven Middles share the same qualitative movement tier when Back presence is the same.

Exact numeric speeds/acceleration remain BALANCE/MEASURE.

### GZ-MOVE-009 — Middle count and speed
**APPROVED V1 simplification**

For V1:
- `middleCount > 0` determines that the craft is in the cargo/heavy movement class.
- Adding more Middle modules does not progressively reduce top speed.
- Final/Back presence determines whether that cargo/heavy class receives the Back propulsion improvement.

This avoids hidden per-module speed arithmetic and preserves extreme/N-middle compositions.

## Central Boost exhaust requirement

### GZ-BOOST-005 — Central boost exhaust is a required visual/asset semantic
**APPROVED**

Current legacy assets/code expose multiple normal/directional thruster points but do not include the desired central Boost engine cue.

V2 requires a distinct central/main Boost exhaust for:
- Front-only ship,
- terminal Middle when no Final is present,
- Final/Back when present,
- Bike.

This is a required semantic socket/effect, not an optional polish item.

### GZ-BOOST-006 — Terminal module ownership of ship Boost exhaust
**APPROVED**

The central Boost exhaust belongs to the **exposed terminal rear module**:

- `Front` -> Front PrimaryBoostExhaust
- `Front + Middle×N` -> last Middle PrimaryBoostExhaust
- `Front + ... + Final` -> Final PrimaryBoostExhaust

No hidden rescaling/repositioning per shot.

Each module family that can legally be terminal must provide a valid `PrimaryBoostExhaust` anchor and enough visual support for the effect.

### GZ-BOOST-007 — Normal thrust vs Boost
**APPROVED**

Normal movement:
- existing directional/attitude/exposed thrusters respond continuously to actual thrust/maneuvering.

Boost/Shift:
- central/main Boost exhaust activates strongly,
- normal thrusters may remain active according to actual control vector,
- boost presentation stack activates.

The central exhaust is therefore not ordinary movement thrust.

### GZ-BOOST-008 — Bike central Boost exhaust
**APPROVED**

Bike keeps its existing normal four-nozzle family for ordinary movement/attitude feedback and adds one central/main `PrimaryBoostExhaust` used for Boost/Shift.

Exact model treatment is PRODUCE:
- if the raw bike body supports a convincing central outlet, add socket + runtime VFX only;
- if it visually lacks an outlet, create the smallest necessary nozzle/collar/recess support geometry.
Do not remodel the bike broadly for this requirement.

## Boost presentation state

### GZ-BOOST-FX-002 — Clear performative Shift state
**APPROVED**

Boost must create a clearly different presentation state, not only higher speed.

Required direction:
- central exhaust burst/elongation,
- edge-weighted star/particle streaks,
- short controlled FOV increase,
- camera acceleration/inertial pull,
- restrained edge distortion/contrast/exposure treatment,
- dedicated boost transient + loop audio.

The center of the screen and aiming information remain readable.

## Exploration only — not approved

### GZ-BIKE-EXP-001 — Scaled Back module on Bike
**EXPLORATION**

Idea: test whether the Final/Back visual language can be scaled/adapted into a Bike boost module.

This is not part of V1 scope yet. It requires:
- raw model silhouette check,
- mount/contact plausibility,
- first/third-person rider-camera check,
- no conflict with Bike's new central Boost exhaust.

Do not implement without explicit approval.


---

# Decision Update — Ally Parity / Unlimited Boost / Boosted Bike Candidate

## Ally ship parity

### GZ-ALLY-SHIP-001 — Same configuration system
**APPROVED**

The ally ship uses the same ship composition grammar, module families, turret compatibility, movement classes and upgrade compatibility as the player ship.

The player configures the ally ship independently.

Therefore:
- player may run a light/agile configuration,
- ally may simultaneously run a heavy/cargo/turret configuration,
- or vice versa.

This does not clone inventory. Physical ownership remains enforced: a module/turret assigned to the ally ship cannot simultaneously exist on the player ship unless a second physical unit is owned.

### GZ-ALLY-SHIP-002 — Same formulas, independent loadout
**APPROVED**

Player and ally ships share the same semantic rules; there is no hidden ally-only ship scale or movement formula.

AI behavior may react to the ally's actual equipped capability, but no ally tactical-role behavior is inferred here.

## Boost resource semantics

### GZ-BOOST-009 — Freely holdable Boost
**APPROVED**

Ship and Bike Boost may be held indefinitely.

V1 Boost has:
- no heat meter,
- no cooldown,
- no per-second Energy Cell consumption,
- no fuel drain.

Its cost is positional/risk/gameplay exposure rather than a hidden resource tax.

Performance/VFX systems must sustain the Boost presentation without unbounded particle/audio allocation.

## Boosted Bike candidate

### GZ-BIKE-EXP-002 — Back-derived Boosted Bike
**CONDITIONAL PRODUCT APPROVAL — VERIFY GEOMETRY**

If the Final/Back visual language can be adapted/scaled to the Bike without breaking silhouette, rider clearance, first-person view, third-person camera, collision envelope or current nozzle layout, it becomes a late-game Boosted Bike variant/upgrade.

If approved after visual/geometry audit:
- it is the fastest player-controlled vehicle in the game,
- it is intentionally difficult/late to unlock,
- it preserves Bike vulnerability/exposure compared with travelling inside a ship,
- it uses the central PrimaryBoostExhaust as its hero propulsion cue.

Initial unlock economy is RESOLVED in GZ-BIKE-PROG-001/002: World 3 mothership reveal gate + 1,500 Energy Cells, conditional on geometry validation.

The geometry audit must classify:
- FIT_OK,
- SUPPORT_GEOMETRY_NEEDED,
- CAMERA_CONFLICT,
- RIDER_CONFLICT,
- SILHOUETTE_FAIL.

Do not force-fit or distort the canonical Back module merely to satisfy this idea.

### GZ-BIKE-OPEN-001 — Stranding consequence
**RESOLVED**

Superseded by GZ-BIKE-FAIL-001..004. Bike/Boosted Bike destruction leaves the player in EVA; recovery is manual through available ship/portal paths, and a sortie with no viable recovery route is lost.


---

# Decision Update — Ally Combat Simplicity / Bike Stranding Failure

## Ally combat behavior

### GZ-ALLY-AI-001 — Shared simple command family
**APPROVED**

Do not add a new ally-only tactical role menu such as Follow / Tank / Attack.

The ally uses the same intentionally small high-level command family already approved for companions:
- Explore,
- Defend.

The ally's combat output emerges from the configured setup:
- same ship/module/turret rules as the player,
- independently configured physical loadout,
- more turrets/equipment naturally means more available firepower.

No hidden Tank/Attack role class is added.

### GZ-ALLY-AI-002 — Loadout-driven firepower
**APPROVED**

The ally uses its actual equipped weapons/turrets under normal combat AI. No hidden damage multiplier or role-class bonus is inferred merely because the ship looks "tank-like".

Exact target selection / firing cadence remains AI implementation/tuning, constrained by the equipped setup and combat rules.

## Bike failure / stranding

### GZ-BIKE-FAIL-001 — Bike destroyed while ship is available
**APPROVED direction**

If the active Bike is destroyed/disabled and a valid player ship exists in the current world instance, the player continues in EVA and must recover/return manually according to normal traversal/boarding/portal rules.

No automatic teleport-to-ship is implied.

### GZ-BIKE-FAIL-002 — Bike destroyed with no ship deployed
**APPROVED**

If the player deployed without a ship and the Bike is destroyed/disabled, the player remains in EVA.

The intended emergency escape is to locate/reach a discovered portal and return to Hangar.

If no viable recovery/portal route remains and no other approved mobile recovery path exists, the sortie is lost and normal player-death/recovery resolution applies.

### GZ-BIKE-FAIL-003 — Boosted Bike uses same risk model
**APPROVED**

The late-game Boosted Bike, if it passes geometry/visual validation and is unlocked, uses the same exposure/stranding semantics as the normal Bike.

Its extreme speed is balanced partly by the fact that it is not a protected ship/base and does not guarantee recovery if lost.

### GZ-BIKE-FAIL-004 — No hidden recovery
**APPROVED**

Do not silently spawn a replacement Bike, warp the player to Hangar, or auto-recover the player merely because the Bike was destroyed.

Any future recovery mechanic must be an explicit product contract.


---

# Decision Update — Player Death Companion Recovery / Ship Destruction

## Player death with living/downed companions

### GZ-DEATH-COMP-001 — Companion equipment recovery overrides general deployed-setup loss for living/downed companions
**APPROVED**

If the player dies while Nóma and/or the ally is still ALIVE or DOWNED:

- the companion character is recovered to Hangar according to existing companion recovery rules,
- the physical equipment currently assigned to that living/downed companion returns with that companion,
- that recovered companion equipment is NOT counted as lost setup for the 50% death-salvage calculation,
- all other deployed player-owned physical setup follows the normal player-death loss/salvage rule.

If the ally is DEAD, normal dead-ally/revival and item-loss rules apply.

This is the explicit priority rule between GZ-DEATH-001 and GZ-COMP-007.

## Ship destruction with surviving pilot

### GZ-SHIP-FAIL-001 — Player ship destroyed
**APPROVED**

If the player ship is destroyed while the player survives:

- the destroyed ship and physical equipment attached to that destroyed ship are lost,
- the player continues in EVA,
- the player may manually recover by reaching another owned vehicle/ship, an available portal, or another explicitly approved recovery route,
- there is no automatic teleport or replacement ship,
- if no viable recovery route remains, the sortie is lost and normal player-death/recovery resolution applies.

### GZ-SHIP-FAIL-002 — Ally ship destroyed
**APPROVED**

If the ally ship is destroyed while the ally survives:

- the destroyed ally ship and equipment attached to that ship are lost,
- the ally continues according to the ally/companion survival state (ACTIVE/DOWNED/DEAD as gameplay resolves),
- a living/downed ally may still be rescued/recovered independently of the destroyed ship,
- no replacement ally ship is spawned automatically.

### GZ-SHIP-FAIL-003 — Destruction is physical loss
**APPROVED**

A destroyed ship is a lost physical setup, even when the pilot survives. Unlocks/recipes remain and the ship can later be rebuilt/reconfigured from owned/reacquired components according to inventory/economy rules.


---

# Balance Decision — Boosted Bike Unlock & Price

### GZ-BIKE-PROG-001 — Boosted Bike unlock gate
**APPROVED INITIAL BALANCE**

The Back-derived Boosted Bike, if it passes geometry/camera/rider/collider validation, unlocks as a late-game purchase after the World 3 mothership reveal/endgame layer is unlocked.

Narrative gems remain progression keys, not spendable currency.

### GZ-BIKE-PROG-002 — Boosted Bike purchase price
**APPROVED INITIAL BALANCE / TUNE LATER**

Purchase price: **1,500 Energy Cells**.

Rationale:
- it is intended to be one of the hardest mobility upgrades to acquire,
- it becomes the fastest player-controlled vehicle,
- it retains the Bike's exposure/stranding risk,
- the number is balance data and may be tuned after economy telemetry without changing the semantic contract.

The unlock gate and physical-fit validation remain prerequisites; paying Cells cannot bypass them.


---

# Decision Update — Boost Kinematics / Combat Continuity

### GZ-BOOST-010 — Boost changes real movement
**APPROVED**

Boost is a real kinematic state, not presentation-only.

While Boost is active:
- top speed increases by **25%** relative to that actor/vehicle's current non-Boost top speed,
- acceleration increases as well,
- the presentation stack intensifies to communicate the state.

Acceleration increase is **+40%** over the resolved non-Boost acceleration. This is approved by GZ-BOOST-021.

### GZ-BOOST-011 — Boost duration/resource semantics
**APPROVED**

Boost may be held indefinitely.

V1 Boost has:
- no heat,
- no cooldown,
- no fuel,
- no per-second Energy Cell drain.

### GZ-BOOST-012 — Combat continuity during Boost
**APPROVED**

Boost does not disable aiming or firing.

Player-controlled actors/vehicles may continue to aim and shoot while Boost is active.

### GZ-BOOST-013 — Propulsion presentation
**APPROVED direction / TUNE values**

Boost presentation includes:
- stronger/more visible fire from active propulsion outlets,
- the existing/required strong PrimaryBoostExhaust cue where the host supports it,
- additional speed-presentation FX.

Exact FX layers, intensities and camera treatment remain TUNE/VERIFY and must preserve aim readability.

### GZ-BOOST-014 — Separate permanent speed-upgrade family exists
**APPROVED / SEMANTICS CLOSED**

There are two distinct concepts:
1. moment-to-moment Boost activated during play,
2. one permanent global friendly speed/acceleration upgrade.

Its scope, stats, unlock gate, price and additive stacking are closed by GZ-SPEED-UPGRADE-007 through GZ-SPEED-UPGRADE-009.

### GZ-BOOST-015 — Friendly-side coverage
**RESOLVED / SUPERSEDED**

Closed by GZ-BOOST-017:
- player astronaut/Bike/Ship,
- ally EVA/Bike/Ship,
- Nóma,
- enemies do not inherit the friendly Boost mechanic.


---

# Decision Update — Boost Coverage / Whole-Ship Calculation / Friendly AI / Input

### GZ-BOOST-016 — Whole-ship Boost calculation
**APPROVED**

Boost is calculated from the actor/vehicle's final current movement profile as a whole.

For modular ships:
- assemble/resolve the ship's current base movement class/profile first,
- then apply the Boost multiplier to that final ship profile,
- do NOT apply +25% independently per module,
- Middle count does not compound Boost.

Approved top-speed formula:

`boostTopSpeed = resolvedBaseTopSpeed × 1.25`

Acceleration increases by **+40%** during Boost, as closed by GZ-BOOST-021.

### GZ-BOOST-017 — Friendly-side actor coverage
**APPROVED**

Boost is available to all player/friendly traversal actors and vehicles:
- player astronaut EVA,
- player Bike,
- player Ship,
- ally EVA/on-foot traversal where propulsion/movement supports it,
- ally Bike,
- ally Ship,
- Nóma traversal.

Hostile/enemy actors do NOT receive the player/friendly Boost mechanic in V1.

This does not prohibit enemies from having their own authored movement behaviors; they simply do not inherit the friendly Boost contract.

### GZ-BOOST-018 — Boost presentation stack
**APPROVED direction / TUNE values**

During Boost:
- active propulsion flames/exhaust length/intensity increases,
- PrimaryBoostExhaust becomes the dominant propulsion cue where supported,
- controlled FOV increase,
- camera acceleration/inertial pull on enter/exit,
- peripheral star/particle streaks,
- dedicated activation transient + sustained loop audio,
- restrained edge distortion/exposure treatment,
- no heavy gameplay-obscuring blur.

Aim/target readability remains mandatory.

### GZ-BOOST-019 — Friendly AI autonomous Boost
**APPROVED**

Existing Explore / Defend behavior may use Boost autonomously without creating a new tactical-command family.

Defend:
- friendly actor/vehicle may Boost to catch up, maintain formation or reposition while defending.

Explore:
- friendly actor may Boost between traversal targets/POIs when appropriate.

Combat:
- friendly actor may Boost to reposition or recover distance while still using normal combat logic.

Nóma follows the same high-level principle where its movement implementation supports Boost.

### GZ-BOOST-020 — Shift input semantics
**APPROVED**

Desktop Shift is an active propulsion command, not only a modifier.

Pressing/holding Shift by itself drives Boost forward according to the controlled actor/vehicle's current facing/orientation, even with no WASD directional input.

Directional input may still steer/modify movement while Boost is active.

Mobile Boost control must preserve the same semantic behavior.

### GZ-SPEED-UPGRADE-002 — Permanent generic speed upgrade scope
**RESOLVED / SUPERSEDED**

Closed by GZ-SPEED-UPGRADE-007 through GZ-SPEED-UPGRADE-009:
- global friendly scope,
- one level,
- +15% base top speed,
- +20% base acceleration,
- 1,000 Energy Cells,
- second gem / World 3 access.


---

# Decision Update — Boost Acceleration / Permanent Global Speed Upgrade

### GZ-BOOST-021 — Boost acceleration multiplier
**APPROVED**

Moment-to-moment Boost increases acceleration by **40%** over the actor/vehicle's current non-Boost acceleration.

Approved Boost kinematics:
- top speed: +25%
- acceleration: +40%

Boost still remains freely holdable and combat-compatible.

### GZ-SPEED-UPGRADE-003 — Global permanent upgrade stat package
**APPROVED**

The one-time permanent global friendly movement upgrade uses the P2 package:

- base top speed: **+15%**
- base acceleration: **+20%**
- scope: player + friendly traversal actors/vehicles
- tiers: exactly 1

This permanent upgrade is separate from moment-to-moment Boost.

### GZ-SPEED-UPGRADE-004 — Top-speed stacking with Boost
**APPROVED — ADDITIVE**

When the permanent global upgrade is owned and Boost is active, top-speed percentages add against the original resolved base top speed.

Example:
- base = 100
- permanent upgrade = +15
- Boost = +25
- final boosted top speed = **140**

Formula:

`finalTopSpeed = resolvedBaseTopSpeed × (1 + 0.15 + 0.25)`

Do not multiply 1.15 × 1.25 for top speed.

### GZ-SPEED-UPGRADE-005 — Remaining progression values
**RESOLVED / SUPERSEDED**

Closed by GZ-SPEED-UPGRADE-007:
- unlock after second gem / World 3 access,
- price 1,000 Energy Cells.

### GZ-SPEED-UPGRADE-006 — Acceleration stacking with permanent upgrade
**RESOLVED / SUPERSEDED**

Closed by GZ-SPEED-UPGRADE-008:
- additive stacking,
- +20% permanent + +40% Boost,
- final acceleration = 160% of resolved base.


---

# Decision Update — Permanent Global Speed Upgrade Finalization

### GZ-SPEED-UPGRADE-007 — Unlock gate and price
**APPROVED**

The one-time permanent global friendly movement upgrade:

- unlocks after the **second narrative gem / access to World 3**,
- costs **1,000 Energy Cells**,
- applies globally to player + friendly traversal actors/vehicles,
- remains a single upgrade level.

Narrative gems are progression keys and are not spent.

### GZ-SPEED-UPGRADE-008 — Acceleration stacking with Boost
**APPROVED — ADDITIVE**

Permanent acceleration upgrade:
- +20% base acceleration

Moment-to-moment Boost:
- +40% acceleration

When both are active, percentages add against the original resolved base acceleration.

Formula:

`finalAcceleration = resolvedBaseAcceleration × (1 + 0.20 + 0.40)`

Therefore:
- base acceleration 100%
- permanent upgrade -> 120%
- permanent upgrade + Boost -> **160%**

Do not multiply 1.20 × 1.40.

### GZ-SPEED-UPGRADE-009 — Final combined movement package
**APPROVED**

Permanent global upgrade:
- +15% top speed
- +20% acceleration
- one level
- 1,000 Energy Cells
- unlock after second gem / World 3 access

Moment-to-moment Boost:
- +25% top speed
- +40% acceleration
- freely holdable
- no heat/cooldown/fuel/Cell drain
- aim/fire remain available

Combined permanent + Boost:
- top speed = **140% of resolved base**
- acceleration = **160% of resolved base**

For modular ships, both calculations apply once to the resolved whole-ship movement profile; they do not compound per module.


---

# Decision Update — Boosted Bike Integration Direction

### GZ-BIKE-PROD-001 — Back integration style
**APPROVED DIRECTION**

The Back-derived Boosted Bike uses an **embedded / encastrado** integration direction.

The Back-derived propulsion form should visually enter and belong to the Bike's rear body rather than read as a remote/separate towed module.

Production may add the smallest necessary:
- collar,
- mount,
- recess,
- structural support,
- fairing/transition geometry,

to make the connection physically credible.

Do not broadly remodel the Bike or distort the Back silhouette beyond what is required for a convincing embedded connection.

### GZ-BIKE-PROD-002 — Scale remains visual VERIFY
**VERIFY**

The current ~0.535× Back candidate remains an evidence seed, not a frozen semantic scale.

Before production freeze, compare bounded candidate scales/placements around the approved embedded direction and verify:
- rider clearance,
- silhouette,
- FP/TP cameras,
- collision envelope,
- PrimaryBoostExhaust placement.

Do not infer that 0.535× is final merely because the integration direction is approved.
