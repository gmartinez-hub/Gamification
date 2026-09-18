# Gravedad Zero — Ship Composition & Movement Contract V1

Status: **PARTIAL FREEZE — approved invariants + explicit open decisions**

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
**APPROVED outcome / OPEN implementation semantics**

Because Front-only is a valid deployable craft, it MUST have sufficient baseline propulsion/control to:
- launch,
- translate,
- turn,
- brake,
- travel between gameplay locations.

Open: whether this is authored as Front-integrated main propulsion, maneuvering thrusters promoted to cruise propulsion, or another clean V2 propulsion abstraction.

### GZ-SHIP-MOVE-002 — Final/Back effect
**OPEN**

Need product decision: what does adding Final/Back change?

Possible dimensions:
- top speed,
- acceleration,
- boost,
- braking authority,
- energy efficiency,
- main exhaust visual intensity,
- some combination.

Do not infer from legacy exposed-thruster logic.

### GZ-SHIP-MOVE-003 — Middle-module movement effect
**OPEN**

Need product decision for additional Middle modules:
- no direct speed penalty,
- reduced acceleration/turn only,
- reduced top speed too,
- mass/energy budget model.

The answer must preserve the possibility of intentionally long ships.

## 4. Movement hierarchy

### GZ-MOVE-001 — Base top-speed ordering
**APPROVED**

At comparable baseline progression:

`Ship > Bike > Astronaut`

The ship must be the fastest long-distance player-controlled transport.
The bike remains clearly faster than astronaut EVA/on-foot movement.

Exact values are MEASURE/BALANCE.

### GZ-MOVE-002 — Acceleration/handling
**OPEN**

Top speed hierarchy does not automatically define acceleration, braking or turn rate.

Product decision required for relative feel:
- should Bike accelerate/turn faster than Ship while having lower top speed?
- should long/heavy ships turn/accelerate more slowly than compact ships?

### GZ-MOVE-003 — Boost
**OPEN**

Need to freeze:
- whether astronaut, bike and ship all have boost,
- whether boost consumes a resource/cooldown/heat,
- whether boost hierarchy follows normal top-speed hierarchy.

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

Exact placement of `Front+Middle...+Final` relative to `Front` remains OPEN below.

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
**PARTIAL**

Current Bike evidence has four authored nozzles. V2 requires those normal thrust/directional cues plus one additional central/main effect.

OPEN: confirm whether the new central Bike nozzle is specifically the Boost/main-exhaust cue or a maneuvering-only cue. Do not infer from the phrase "para maniobrar".

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
**OPEN**

Need exact ordering:
- Is `Front + Middle × N + Final` slower than Front-only?
- Or does Final recover enough performance that it sits between Front-only and Front+Final?

This matters for acceleration/top-speed formulas.

### GZ-MOVE-OPEN-002 — Additional Middle penalty curve
**OPEN**

Once more than one Middle is present, does each additional Middle:
- apply the same mobility penalty,
- use diminishing penalty,
- or use mass/energy derived values?

No hard module-count cap is implied.

### GZ-MOVE-OPEN-003 — Astronaut Boost
**OPEN**

Ship and Bike Boost are approved. Whether astronaut EVA also has Boost in V2 is not yet frozen.

### GZ-MOVE-OPEN-004 — Boost resource model
**OPEN**

Need to decide whether Boost is:
- freely held,
- heat-limited,
- cooldown-limited,
- energy-limited.

Do not spend Energy Cells per second unless explicitly approved.

### GZ-MOVE-OPEN-005 — Speed upgrade progression
**OPEN**

A speed/acceleration upgrade family is allowed conceptually, but unlock/purchase semantics remain unresolved.

### GZ-FIRE-OPEN-001 — Minimum ship weapon
**OPEN**

Need confirmation whether Front-only always includes a baseline integrated ship weapon, independently from mountable turrets.

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
