# Gravedad Zero — Party / Damage / Death Presentation Contract V1

Status: **PARTIAL FREEZE — required states approved, exact visual tuning remains TUNE**

## Principle

Critical gameplay states must be perceptible through a coordinated presentation layer:

`event -> UI marker -> screen treatment -> audio -> camera response -> world/VFX cue`

No state is allowed to rely on only one channel.

The Presentation State Stack resolves overlapping full-screen treatments by priority and duration; low-priority states cannot permanently overwrite higher-priority danger/death states.

## Required event families

### GZ-PRES-001 — Ally damaged
**APPROVED requirement**

When ally takes meaningful damage, player receives:
- distinct ally-channel UI alert,
- directional/world marker when meaningful,
- restrained screen-edge pulse/treatment,
- audio cue.

This must remain distinguishable from player damage and Nóma damage.

### GZ-PRES-002 — Ally DOWNED
**APPROVED requirement**

DOWNED escalation must be stronger than ordinary damage:
- persistent map/world marker,
- clear DOWNED label/state,
- stronger ally-channel screen pulse/interference,
- alert audio,
- rescue affordance.

It remains active until rescued, recovered by sortie resolution, or DEAD.

### GZ-PRES-003 — Ally DEAD
**APPROVED requirement**

Death receives a unique one-shot escalation:
- unmistakable ally death notification,
- stronger but brief presentation treatment,
- world/map marker state transition,
- audio sting,
- no false implication that the player also died.

Paid revival semantics remain separate from presentation.

### GZ-PRES-004 — Nóma damaged/downed
**APPROVED requirement**

Nóma uses a distinct companion channel rather than ally styling:
- remote damage pulse/interference,
- tactical/map alert,
- DOWNED escalation,
- rescue state.

Nóma character recovery/revival rules remain unchanged.

### GZ-PRES-005 — Player critical
**APPROVED requirement**

Critical player state uses a sustained but readable treatment:
- restrained desaturation/vignette/pulse/system-stress cue,
- health/status emphasis,
- audio layer,
- never blocks aim.

### GZ-PRES-006 — Player death
**APPROVED**

Death presentation sequence:

1. brief impact/micro-freeze,
2. signal/system loss treatment,
3. controlled desaturation/darkening,
4. loss-of-control confirmation,
5. black/recovery transition,
6. recovery/death-resolution UI.

Exact milliseconds, shader values and audio assets are TUNE/PRODUCE.

## Presentation channels

Required semantic channels:

- PLAYER_DAMAGE
- PLAYER_CRITICAL
- PLAYER_DEATH
- ALLY_DAMAGE
- ALLY_DOWNED
- ALLY_DEATH
- NOMA_DAMAGE
- NOMA_DOWNED
- HOURDE_WARNING
- PORTAL
- GEM
- BOSS

Exact palette/effect values are presentation tuning; channels must remain perceptually distinguishable.

## Performance contract

- Prefer one composited post-processing/final-pass state stack over separate full-screen render passes per event.
- Do not allocate unbounded particles/audio sources during repeated damage.
- Distance/VFX tier may simplify world effects but cannot suppress the UI/state notification.
- Heavy blur is not required for any damage/death state.

## Semantic tests

- SEM-PRES-001: ally damage cannot be mistaken for player damage.
- SEM-PRES-002: ally DOWNED persists as a rescueable alert until state resolves.
- SEM-PRES-003: ally DEAD is perceptually distinct from DOWNED.
- SEM-PRES-004: Nóma remote emergency is distinguishable from ally emergency.
- SEM-PRES-005: player critical treatment leaves aim/target readable.
- SEM-PRES-006: player death prevents further control before recovery transition.
- SEM-PRES-007: repeated low-level alerts cannot override active player-death presentation.
