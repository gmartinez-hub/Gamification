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
**SEMANTIC_QUESTION**

When a natural portal opportunity appears, who can discover/detect it:
- Nóma only,
- Nóma + ally,
- player also independently,
- another rule?

### AS-PORTAL-002 — Natural portal when no companion is deployed
**SEMANTIC_QUESTION**

If the portal finder is not deployed/downed/unavailable, how can the player still discover a natural portal before its window closes?

### AS-PORTAL-003 — Portal notification / map marker
**SEMANTIC_QUESTION**

After detection:
- does it become a Tactical Map marker,
- is distance/direction shown,
- does the marker disappear when the window closes,
- is remaining time/countdown shown?

### AS-PORTAL-004 — Simultaneous natural portals
**SEMANTIC_QUESTION**

Can more than one natural portal opportunity be active at the same time, or maximum one active natural portal per world instance?

### AS-PORTAL-005 — Current-world destination
**SEMANTIC_QUESTION**

May a portal select the current world as destination and intentionally reroll into a fresh instance, or must destination worlds exclude the current world?

### AS-PORTAL-006 — Failed handoff consumption
**SEMANTIC_QUESTION**

If destination preload/handoff fails:
- does a natural portal remain usable/reopen,
- does Portable Portal retain its once-per-sortie use,
- or is the attempt consumed?

### AS-PORTAL-007 — Portal Recall guarantee
**SEMANTIC_QUESTION**

After the player requests Portal Recall for intact equipment, is arrival guaranteed after the diegetic wait, or may the recalled equipment still be attacked/destroyed/fail to arrive?

## B. Portable Portal physical behavior

### AS-PPORTAL-001 — Compatible turret-slot hosts
**SEMANTIC_QUESTION**

Which turret-slot hosts may carry the Portable Portal:
- player ship,
- Bike,
- ally ship,
- ally Bike,
- Nóma,
- Beacon?

Using a turret slot does not itself define compatible hosts.

### AS-PPORTAL-002 — Activation authority
**SEMANTIC_QUESTION**

Who can activate the Portable Portal:
- player only,
- ally/Nóma autonomously or on command,
- remotely from Tactical Map,
- only while player is physically near/controlling its host?

### AS-PPORTAL-003 — Physical deployment form
**SEMANTIC_QUESTION**

On use, does the mounted item:
- remain on the host and project/open a full portal nearby,
- detach/deploy into space as a separate emitter,
- another physical behavior?

### AS-PPORTAL-004 — Once-per-sortie boundary
**SEMANTIC_QUESTION**

Confirm that one sortie means one continuous excursion from Hangar departure until Hangar return, player death or session interruption, even if the player crosses multiple worlds. A Portable Portal used in World 1 would then remain spent in World 2 during the same excursion.

### AS-PPORTAL-005 — Same Party & Equipment Check
**SEMANTIC_QUESTION**

Does Portable Portal use the same Party & Equipment Check + Portal Recall rules as a natural portal?

## C. Campaign / persistence

### AS-PERSIST-001 — Narrative milestone save timing
**SEMANTIC_QUESTION**

When the player earns:
- a narrative gem,
- Nóma rescue/unlock,
- ally rescue/unlock,
- mothership reveal,
- Portable Portal two-transit unlock progress,

are these milestones persisted immediately when earned, or only when the player successfully returns to Hangar?

### AS-CAMPAIGN-001 — First narrative gem source
**SEMANTIC_QUESTION**

What exact gameplay event grants the first narrative gem / World 2 unlock?

### AS-CAMPAIGN-002 — Second narrative gem source
**SEMANTIC_QUESTION**

What exact gameplay event grants the second narrative gem / World 3 unlock?

## D. Companion semantics

### AS-COMP-001 — Can Nóma become DEAD?
**SEMANTIC_QUESTION**

Current generic companion state machine includes DEAD, while Nóma has no character-revival fee. Clarify whether:
- Nóma can only become DOWNED/DISABLED and never permanently DEAD,
- Nóma can become DEAD but auto-recovers,
- another rule.

### AS-COMP-002 — DOWNED -> DEAD transition
**SEMANTIC_QUESTION**

For ally (and Nóma if applicable), what causes a downed companion to become DEAD:
- bleedout timer,
- additional enemy damage,
- both,
- never without a specific event?

### AS-COMP-003 — Order/Recall range
**SEMANTIC_QUESTION**

Are Explore / Defend / Recall commands:
- proximity-only,
- remotely available through Tactical Map,
- mixed (e.g. Explore/Defend proximity, Recall remote)?

### AS-COMP-004 — Portal discovery ownership
**SEMANTIC_QUESTION**

If both Nóma and ally have Explore, does portal discovery belong specifically to Nóma or can the ally discover natural portals too?

## E. Combat / equipment

### AS-COMBAT-001 — Turret targeting mode
**SEMANTIC_QUESTION**

Are mounted turrets:
- autonomous targeting/firing,
- player-aimed/fired,
- host-dependent,
- switchable?

### AS-COMBAT-002 — Bike baseline weapon
**SEMANTIC_QUESTION**

Can a Bike with zero mounted turrets fire any baseline weapon, or is Bike combat entirely dependent on equipped turrets?

### AS-COMBAT-003 — EVA / personal weapon
**SEMANTIC_QUESTION**

Does the player astronaut have a usable personal weapon in EVA/on foot? If yes, is its ammunition unlimited like ship/turret weapons?

### AS-COMBAT-004 — Ally pistol ammunition
**SEMANTIC_QUESTION**

Is the ally pistol unlimited-ammo, finite-ammo, or governed by another resource rule?

### AS-BEACON-001 — Beacon gameplay function
**SEMANTIC_QUESTION**

Beyond carrying one turret / map presence / possible horde warning, what is the Beacon's canonical gameplay function?

### AS-BIKE-001 — Bike turret-capacity upgrade
**SEMANTIC_QUESTION**

The current contract says Bike capacity is base 2 and an upgrade path may raise it to 4. Is the 2->4 upgrade a real V1 feature? If yes, its unlock/purchase semantics still need definition.

## F. Map / camera / boss / economy edge cases

### AS-MAP-001 — Tactical Map pause behavior
**SEMANTIC_QUESTION**

Does opening Tactical Map pause local gameplay/simulation, slow it, or leave the world fully live?

### AS-CAMERA-001 — Seated ship first-person
**SEMANTIC_QUESTION**

Is seated first-person cockpit piloting a required V1 camera mode, or is seated third-person the required mode with FP only optional?

### AS-BOSS-001 — Escape from final boss
**SEMANTIC_QUESTION**

During the final World 3 boss fight:
- can natural/Portable Portal be used to leave,
- are portal opportunities suppressed,
- another rule?

### AS-BOSS-002 — Final boss state after retreat
**SEMANTIC_QUESTION**

If retreat is allowed, when the player returns:
- does boss phase/damage reset,
- persist,
- partially persist?

### AS-ECO-001 — Salvage value basis
**SEMANTIC_QUESTION**

The salvage rate is 50% of value actually LOST. What contributes to item value:
- base purchase price only,
- purchase + installed upgrade value,
- mount/reconfiguration spend,
- another valuation?

### AS-ECO-002 — Permanent baseline Bike salvage
**SEMANTIC_QUESTION**

If the permanent baseline recovery Bike is destroyed during a sortie:
- is the Bike itself excluded from salvage because it is recreated/always available,
- or does its nominal value contribute to salvage while the fallback still returns?

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
