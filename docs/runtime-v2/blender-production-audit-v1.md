# Gravedad Zero — Blender / Production Audit V1

Purpose: convert visual ambiguity into exact production tickets before campaign implementation.

Each issue must end as one of:

- **OK**
- **BLENDER_FIX**
- **THREE_FIX**
- **BOTH**

No ticket may be only “make it look better”.

## 1. Hangar / orbital service bay

Review against Hangar Orbit/Inspect camera storyboard.

### Geometry
- Floor/landing/service surface reads as a finished space.
- Walls/structural framing close the bay composition.
- Exit/opening supports launch cinematic.
- Ship/bike/character parking clearances are valid.
- No accidental holes/backface exposure from inspection angles.

### Pivots/anchors
- ship parking root
- bike parking root
- Nóma/ally inspection roots
- item inspection root
- launch direction
- camera orbit focus
- underside inspection focus

### Materials/textures
- Identify every visually unfinished material.
- Avoid adding unique textures where shared tiling/material parameters suffice.
- Validate scale/UV density from inspection distance.

### Three.js responsibilities
- lighting rig
- orbit/zoom/underside/focus
- selected-item HERO promotion
- setup preview
- launch/loading transition

## 2. Ship front/cupola/cockpit

Review against Cockpit and Exterior/Chase storyboard.

### Blender checks
- cupola sightline
- dashboard/seat scale
- copilot/interior spatial relationship
- camera clipping through canopy/body
- muzzle/weapon anchors
- module connection geometry
- exterior silhouette

### Three.js checks
- cockpit camera pose/look limits
- exterior bounds-based chase distance
- logical aim independent from visual sway
- module attach FX
- exposed-thruster-only FX

## 3. Ship middle / propulsion

For every module:

- connection anchors stable
- no z-fighting/intersection at joins
- internal thruster surfaces identifiable so FX can be disabled
- turret-compatible surface metadata can be authored
- module-specific `turretCapacity` proposed and visually validated
- collision proxy simple and stable
- HERO/GAMEPLAY/FAR derivation feasible

No arbitrary total-ship turret cap is authored here.

## 4. Turret

### Asset checks
- yaw pivot
- pitch pivot
- muzzle socket
- base/mount contact area
- scale adaptation does not expose broken underside/geometry
- acceptable silhouette on:
  - ship,
  - bike,
  - Nóma,
  - beacon

The same turret family is reused. Host-specific size is representation; host-specific mount cost is economy.

## 5. Bike

- forward/side turret placement visually viable
- base capacity 2
- upgrade presentation can support up to 4 without breaking silhouette
- rider/camera clipping
- central exhaust anchor
- collision proxy

## 6. Nóma

- visual room for max 2 turret units
- turret placement does not cover core eye/identity
- no new skeletal rig required unless audit proves otherwise
- remote-state visuals remain procedural

## 7. Ally

- pistol grip/aim alignment
- rider posture if bike is shown closely
- no body-mounted turret requirement
- ally ship uses shared modular ship system

## 8. Beacon

- one turret contact/mount region
- radar/light/emissive areas identifiable
- simple collider
- readable at long distance with emissive/marker support

## 9. Mothership

Required before endgame implementation:

- final scale reference against player ship
- `BossCore`
- `GemSocket_*` recesses sized for existing gem model
- `AsteroidLauncher_*`
- engine/thruster anchors
- collision proxy
- LOD0/HERO, LOD1/GAMEPLAY, LOD2/FAR
- no skeletal rig
- no boarding/landing geometry requirement
- no module-by-module destructible hull requirement

## 10. Asteroid/material family

Current approach: reuse generic/base asteroid geometry with multiple runtime material sets.

Audit:

- UV/wrap seams on generic mesh
- crater/neutral coverage
- rust/mineral coverage
- dark/volcanic coverage
- hostile/charged projectile coverage
- each world has enough material variety without requiring new geometry

Generate new textures only when a required visual role is uncovered after this audit.

## 11. Character animation audit

For each gameplay/cinematic event mark:

- EXISTING_CLIP
- PROCEDURAL
- NEW_CLIP_REQUIRED

New clip allowed only when body deformation/gesture matters and cannot be solved by existing clips/IK/steering/camera.

## 12. Deliverable template

```md
### ASSET-ISSUE-###
Asset:
Camera:
Status: OK | BLENDER_FIX | THREE_FIX | BOTH
Observed:
Contract violated:
Exact change:
Runtime dependency:
Acceptance screenshot/view:
```
