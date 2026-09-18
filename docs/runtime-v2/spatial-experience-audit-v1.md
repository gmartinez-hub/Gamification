# Gravedad Zero — Spatial Experience Audit V1

Status: **PROPOSED / evidence-gathering before contract freeze**

Purpose: prevent Cockpit, Hangar, Inventory and Portal implementation from inventing spaces that do not match the canonical models.

## Factual current implementation

### Cockpit
Canonical runtime asset:
`assets/runtime/models/cabina-integrada.glb`

Current runtime code already:
- retains the chosen original dashboard mesh,
- retains `Central_transparent_cockpit_glass`,
- retains `Curved_pilot_cabin_walls_and_ceiling`,
- retains forward roof/gasket pieces,
- adds a pilot seat and human-scale controls,
- supports Pilot/Grip astronaut clips,
- has seat/stand/entry/access anchors.

Important: current code explicitly clips the cabin wrap at a short rear boundary via `clipSourceAtRear(..., .68)` and describes the experience as **"a short approach to the pilot station, not a free-roaming interior."** Movement input deliberately does not create interior navigation.

Therefore the current short/floating feeling may come from runtime composition/clipping as well as missing source geometry. Do **not** create a new cabin shell until raw-vs-runtime evidence is captured.

### Hangar
Canonical runtime asset:
`assets/runtime/closeout-models/orbital-service-bay.glb`

Known semantic nodes:
- `service-long-ship`
- `service-bike`
- `service-crew`

Current `hangar.js` is a loadout/session state machine only. It does not define a walkable spatial experience. V2 is free to define the Hangar spatial contract without inheriting legacy movement assumptions.

---

## Audit Gate SPATIAL-G0 — Raw model evidence

### Cockpit proof
Render the raw `cabina-integrada.glb` with no runtime clipping or synthesized seat from:
1. front
2. rear
3. left
4. right
5. top
6. standing-eye position
7. seated-eye position
8. third-person standing camera

Then render the current runtime composition from the same camera set.

Output must classify missing volume as:
- SOURCE_EXISTS_RUNTIME_HIDES
- SOURCE_NEEDS_EXTENSION
- CAMERA_ONLY
- MATERIAL_ONLY

### Hangar proof
Render `orbital-service-bay.glb` from:
1. front/open face
2. rear
3. left
4. right
5. top
6. crew eye height
7. ship inspection
8. bike inspection

Also export bounds and the world positions/bounds of `service-long-ship`, `service-bike`, `service-crew`.

Do not author a shell until these views are reviewed.

---

## Cockpit proposed contract after audit

Preserve the current seat/stand state machine and Pilot animation.

Preferred control split to validate:
- SEATED: current third-person presentation remains available; optional pilot first-person uses existing arm/cockpit treatment.
- STANDING: third-person close camera and a small bounded local walk zone.
- EXIT: local walk/transition reaches a physical access point, then hands control back to EVA/exterior.

The walk zone is derived from the audited shell geometry; no guessed meter radius and no invisible global clamp.

### Cockpit extension rule
If raw source already contains sufficient wall/ceiling depth, use it before creating geometry.
If source is insufficient, create a **cockpit bay extension**, not a replacement cockpit:
- rear bulkhead/access
- side/roof continuation
- floor/threshold
- support panels/trim
- no duplicate dashboard/control invention unless an exact missing control is approved.

Shared cockpit/hangar material library should be reused.

---

## Hangar proposed spatial layers

### Layer H1 — Canonical service-bay asset
The existing GLB remains the hero centerpiece.

### Layer H2 — Support shell
Only after SPATIAL-G0 proves what is missing:
- floor continuation
- wall/structural panels
- roof/rail continuation
- physical service boundaries
- large orbital aperture/frame

Use repeated/shared modular materials rather than unique hero textures everywhere.

### Layer H3 — Orbital backdrop
Not a loaded gameplay world.

Low-cost visual layer:
- space/stars
- stable planet/moon or orbital body
- distant station/infrastructure silhouettes
- optional subtle destination tint/holographic destination preview

The backdrop must not imply that the previous gameplay world remains resident.

### Layer H4 — Gameplay staging
Use existing semantic service anchors after validation:
- ship bay
- bike bay
- crew/companion zone
- selected-item inspection/focus zone

---

## Hangar interaction proposal to validate

Two modes:

### WALK
- third-person by default
- physically bounded by visible hangar architecture/railings/bulkheads
- player can approach owned/unlocked setup areas
- no requirement for unrestricted 360-degree first-person roaming in V1

### BUILD / INSPECT
- camera takes controlled ownership
- selected host/item moves or is presented into a focus position
- menus use thumbnails for browsing
- one selected item/host is promoted to live HERO 3D
- configuration uses real item identities; previews never duplicate inventory

Owned items may be physically parked. Unlocked-but-unowned items should not masquerade as owned physical units; presentation method remains to freeze (thumbnail, hologram or catalog preview).

---

## Portal / Hangar spatial relationship — proposed

Preferred continuity to validate:
- Hangar has a visible orbital aperture.
- A fixed base ring can exist outside or beyond the Hangar launch route.
- Hangar departure: staging -> launch shot -> base ring -> transit.
- Return to Hangar: ring emergence -> approach/dock shot -> Hangar establishing shot -> control handoff.
- World portals remain procedural/found in world instances.

Portal diameter is not eyeballed. It is derived from the largest supported travelling setup bounding envelope plus cinematic clearance.

---

## Portal camera rule — proposed

At destination confirmation the runtime may take cinematic camera ownership even if the player approached in first person. This is the loading/memory handoff and must show the selected setup travelling.

After handoff, gameplay camera restores according to the arrival/deployment contract. The exact controlled actor after world-to-world transit remains to freeze.

---

## Inventory spatial rule — proposed

Browsing and physical presentation are separate:
- browse: 2D thumbnails / fast UI
- inspect/configure: selected real 3D asset in Hangar focus zone
- ship module edit: module can be brought forward / exploded / ghosted near compatible mount
- character/companion edit: selected actor moves to or is framed at inspection zone
- parked assets may remain medium/far representation, not all HERO simultaneously

---

## Remaining decisions before APPROVED

1. Cockpit seated: keep current third-person as default and allow first-person toggle, or make first-person primary?
2. Cockpit standing: third-person only, or also first-person walking?
3. In-world boarding: enter standing then sit, or auto-seat?
4. Hangar WALK mode: third-person only for V1?
5. Hangar backdrop: stable base/orbital identity, or destination-dependent physical backdrop?
6. Unlocked-but-unowned inventory: thumbnail only, holographic preview, or temporary inspection model clearly marked as not owned?
7. Is the fixed base ring visible from the Hangar aperture?
8. World-to-world transit arrival: restore the actor/vehicle used to enter the portal, or use a mission-configured primary deployment actor?

No implementation may answer these eight by inference.


---

## Decision update — cockpit / hangar / portal spatial contract

### Closed
- Preserve the existing cockpit seat/stand state machine and animation.
- Exterior boarding enters the cockpit **standing first**; the player then chooses Sit.
- Standing cockpit mode is **third-person** with a small walkable zone derived from visible cabin geometry.
- Preserve the currently working seated third-person presentation. First-person piloting remains compatible with the existing visor/cockpit framing.
- Stable orbital-base identity for Hangar.
- Hangar exterior is a stable orbital backdrop; destination/world is previewed through screens/holograms rather than by loading/changing the physical base environment.
- Inventory/setup uses real 3D focus presentation: selected owned assets may move/rotate in a focus zone; unlocked/unowned content may appear as clearly holographic 3D preview.
- Portal runs a pre-threshold party check. If a companion is downed/unresolved, the player chooses **Rescue First** or **Travel Anyway**.
- If left behind alive/downed: Nóma is recovered/available with no character revive fee; ally returns to base for free. Ally DEAD still uses paid revival.
- Portal transit shows surviving/present mobile setup and hides destination loading. Previous world instance is discarded after safe handoff.

### Evidence required before Blender extension
Cockpit raw-vs-runtime proof and Hangar multi-angle proof remain mandatory. Do not model a replacement shell merely from concept art.

### Still open — do not infer
1. **Hangar walk camera:** latest voice wording is ambiguous between third-person only and allowing first-person walking too.
2. **Arrival control after portal:** restore the same actor/vehicle that entered the portal, or use a setup-defined Primary Deployment Actor.
