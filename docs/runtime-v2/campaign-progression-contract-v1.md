# Gravedad Zero — Campaign / Progression Contract V1

Status: **APPROVED CANON — implementation-independent**

## Clean-room rule

This document describes narrative/gameplay outcomes only. V2 does not inherit legacy stage code, automatic gem transitions or historical progression hacks.

## Prologue

### GZ-CAMPAIGN-001 — Expedition defeat prologue
**APPROVED**

The prologue/tutorial presents the stronger/tuned expedition state:
- player has Ship + Nóma + Bike,
- expedition travels,
- Nóma advances,
- hostile ambush occurs,
- player loses / ship is destroyed / expedition is defeated,
- transition to Hangar establishes the actual campaign start.

The prologue may initially be cinematic and become playable later; V1 implementation mode is a production decision, not permission to change the story outcome.

## World 1 / actual game start

### GZ-CAMPAIGN-010 — Start state
**APPROVED**

Actual campaign starts with the Bike as the player's available transport baseline.

### GZ-CAMPAIGN-011 — Rescue Nóma
**APPROVED**

Player travels by Bike to find/rescue Nóma from hostile aliens.

### GZ-CAMPAIGN-012 — First ship piece
**APPROVED**

After returning with Nóma, Nóma reveals/provides the first ship piece / access to the ship-building progression.

### GZ-CAMPAIGN-013 — Energy Cell loop
**APPROVED**

Destroying relevant asteroids yields Energy Cells. Player returns to Hangar and uses Cells to acquire/install ship improvements/modules under the physical-inventory rules.

### GZ-CAMPAIGN-014 — First gem
**APPROVED**

Player goes out, fights hostile forces and earns the first narrative gem. The first gem unlocks World 2.

## World 2

### GZ-CAMPAIGN-020 — Nóma exploration discovers ally
**APPROVED**

Player may send Nóma to Explore. Nóma can discover the friendly green humanoid ally under hostile attack.

### GZ-CAMPAIGN-021 — Ally rescue/join
**APPROVED**

Player rescues/retrieves the ally; ally becomes a persistent unlocked character.

### GZ-CAMPAIGN-022 — Team build-up
**APPROVED**

Between World 2 and World 3 the player may build/configure:
- player ship,
- ally ship using the same modular system,
- player Bike,
- ally Bike,
- turrets,
- ally pistol,
- Nóma equipment,
- other already-approved deployables.

Physical ownership/no-cloning rules apply.

### GZ-CAMPAIGN-023 — Second gem
**APPROVED**

The second narrative gem unlocks World 3.

## World 3 / endgame

### GZ-CAMPAIGN-030 — Mothership reveal
**APPROVED**

World 3 contains the first major reveal of the giant biomechanical mothership and unlocks the endgame layer.

### GZ-CAMPAIGN-031 — Revisit/farm loop
**APPROVED**

After World 3 unlock, previously unlocked worlds remain revisitable for procedural sorties, farming, loadout building and preparation.

World physical layout is not persistent between sorties; campaign/unlocks/inventory are persistent.

### GZ-CAMPAIGN-032 — Global mothership incursions
**APPROVED**

After its World 3 reveal, the mothership may appear as an incursion in other unlocked worlds.

Incursion behavior:
- attacks / pressures / damages the player and setup,
- may force resource spending/recovery,
- eventually leaves,
- is NOT permanently killable outside the final World 3 boss encounter.

### GZ-CAMPAIGN-033 — Final boss location
**APPROVED**

The final mothership kill occurs only in World 3 at the highest intended enemy/threat density.

Boss phases are governed by GZ-BOSS-003..006.

### GZ-CAMPAIGN-034 — Game closure
**APPROVED**

Destroying the mothership core resolves the final encounter and triggers the ending sequence. No final gem collection task is inserted after the core kill.

## Gems

### GZ-CAMPAIGN-040 — Narrative unlocks, not spendable currency
**APPROVED**

Narrative gems unlock world/progression milestones.

Energy Cells remain the single spendable gameplay currency/resource unless a later explicit contract changes this.

## Semantic tests

- SEM-CAMPAIGN-001: actual campaign start can launch with Bike before player ship ownership.
- SEM-CAMPAIGN-002: rescuing Nóma precedes normal ship-building progression.
- SEM-CAMPAIGN-003: first gem unlocks World 2; second gem unlocks World 3.
- SEM-CAMPAIGN-004: ally cannot be persistently deployed before ally rescue/join.
- SEM-CAMPAIGN-005: ally ship uses the same modular system and physical inventory rules as player ship.
- SEM-CAMPAIGN-006: World 3 mothership reveal enables incursions in unlocked worlds.
- SEM-CAMPAIGN-007: mothership incursion outside World 3 cannot resolve permanent boss death.
- SEM-CAMPAIGN-008: final boss kill only occurs in World 3.
- SEM-CAMPAIGN-009: gems are not consumed as normal purchase currency.


---

## Gem acquisition encounter details

### GZ-CAMPAIGN-015 — World 1 first-gem encounter
**APPROVED**

After Nóma has been rescued and normal ship-building/improvement progression has begun:

1. Nóma Explore discovers an anomalous signal / gem-related POI in World 1.
2. The player travels to the discovered location.
3. The POI is protected by hostile aliens/ships using already-approved combat families.
4. The player defeats the primary guardian/elite encounter.
5. The first narrative gem is earned.
6. World 2 unlocks.

The first gem is therefore not granted merely for finding the signal; the protected encounter must be completed.

Exact enemy composition, density, POI art and reward timing are BALANCE/PRODUCE/TUNE.


### GZ-CAMPAIGN-024 — World 2 second-gem encounter
**APPROVED DIRECTION**

After the ally is rescued and joins persistently:

1. the ally contributes information/intel about the location or route of the second gem,
2. that intel opens a higher-threat objective involving a carrier/elite/fortified hostile encounter,
3. the player prepares/builds the team using World 2 progression,
4. the player intercepts/completes the hostile encounter,
5. the second narrative gem is earned,
6. World 3 unlocks.

This combines:
- ally narrative knowledge,
- a difficult carrier/elite combat escalation,
- team/loadout preparation before World 3.

Exact carrier/fortress art, enemy composition, encounter density and mission dressing remain PRODUCE/BALANCE/TUNE.
