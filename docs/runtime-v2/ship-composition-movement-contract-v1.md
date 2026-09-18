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
