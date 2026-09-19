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


---

# Evidence-backed Production Tickets — Measurement Pass 1

These tickets are created from generated evidence. They do not authorize scope changes.

## ASSET-ISSUE-CP-001 — Cockpit rear depth / standing bay

Asset: `cabina-integrada.glb`  
Camera: seated cockpit + third-person standing cockpit  
Status: **THREE_FIX FIRST / BLENDER CONDITIONAL**

Observed:
- raw source shell provides ~1.901 m rear clearance behind the standing astronaut envelope,
- raw source shell provides ~0.321 m head clearance,
- current legacy rear clipping overlaps the standing astronaut envelope by ~0.619 m.

Contract:
- preserve canonical dashboard/visor,
- preserve existing stand/sit behavior,
- standing mode must have visible bounded space.

Exact change:
1. V2 must first compose the existing shell without the legacy rear clipping behavior.
2. Re-evaluate seated/standing cameras against the complete source shell.
3. Only if visual holes/unfinished rear enclosure remain, produce the smallest rear bulkhead/floor/trim extension required.

Acceptance:
- 1.90 m astronaut standing with no shell clipping,
- seated visor composition remains valid,
- standing camera shows a believable enclosure,
- no replacement cockpit invented.

## ASSET-ISSUE-HG-001 — Service bay first-person staging

Asset: `orbital-service-bay.glb`  
Camera: Hangar first-person WALK  
Status: **THREE_FIX + SUPPORT_GEOMETRY PRODUCE**

Observed:
- measured legacy semantic envelope ~34.188 × 15.494 × 32.235 m,
- Bike/Crew anchors have floor, ceiling and side enclosure,
- both Bike/Crew anchors are open in the forward direction,
- LongShip anchor is open above/laterally and has floor below,
- enclosed first-person samples show ~5.695–13.623 m vertical clearance.

Contract:
- Hangar is an open orbital service bay, not a sealed room,
- ambient WALK shows only confirmed sortie setup,
- long valid ships may extend toward/out of the orbital opening.

Exact change:
1. Preserve existing service-bay hero geometry.
2. Author first-person collision/walk boundaries from actual geometry/support pieces.
3. Add only necessary rails, floor continuation, structural panels, service props and aperture framing.
4. Use stable orbital backdrop outside the open face.
5. Do not close the bay merely to make camera collision easier.

Acceptance:
- first-person path from crew/setup area to boarding vehicle/ship,
- no invisible global boundary,
- open orbital face remains legible,
- standard ship reads comfortably inside the bay,
- extreme long ship may project toward/outside opening without invalidating setup.

## ASSET-ISSUE-PORTAL-001 — Transit aperture / formation

Asset: **no ring GLB in main; procedural legacy reference only**  
Camera: Portal cinematic director  
Status: **THREE/PRODUCE + STORYBOARD VERIFY**

Observed:
- legacy event horizon diameter ~6.8 m,
- player ship cross-section evidence ~4.739 × 4.613 m,
- single-file geometric clearance PASS (~1.031 m horizontal / ~1.093 m vertical per side),
- naive two-ship side-by-side would require ~10.478 m before cinematic margin.

Contract:
- selected surviving setup is visible in transit,
- no hidden per-shot ship rescaling.

Exact change:
1. Storyboard the actual convoy formation before freezing aperture.
2. Validate whether formation is single-file/staggered or requires a larger ring.
3. Produce ring geometry/effects after formation decision; do not infer from the old procedural anomaly.

Acceptance:
- every selected mobile setup element can be shown coherently,
- ship scale remains constant,
- loading handoff remains hidden by cinematic.

## ASSET-ISSUE-BIKE-001 — Back-derived Boosted Bike fit

Asset: Bike + Final/Back visual language  
Camera: Bike FP + TP  
Status: **VERIFY BEFORE PRODUCE**

Observed:
- preliminary bounded fit candidate at Back raw scale ~0.535×,
- candidate add-on envelope ~0.976 × 0.987 × 1.016 m,
- approximate combined Bike length ~3.864–4.0 m depending contact plane.

Still required:
- actual rear contact silhouette,
- rider leg/back clearance,
- FP camera,
- TP camera,
- collision proxy,
- central PrimaryBoostExhaust integration.

Acceptance:
- all six checks pass or require only bounded support geometry,
- no forced distortion of Bike or Back,
- if failed, feature returns for visual/product review rather than being silently approximated.

## ASSET-ISSUE-BOSS-001 — Mothership production

Asset: approved mothership concept; **no GLB in main**  
Camera: Boss/fleet establishing + combat  
Status: **PRODUCE / MEASURE**

Required before implementation:
- create/finalize GLB from approved concept,
- establish semantic dimensions relative to ~25.734 m alien-ship evidence,
- add BossCore,
- GemSocket_*,
- AsteroidLauncher_*,
- engine/thruster anchors,
- collision proxy,
- HERO/GAMEPLAY/FAR LODs.

No exact length is inferred before the model + canonical camera proof.
