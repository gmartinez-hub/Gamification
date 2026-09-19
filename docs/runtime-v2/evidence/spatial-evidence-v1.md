# Spatial Evidence V1

> Measurement/proof layer only. No V2 implementation is prescribed here.

## Cockpit

Classification: **SOURCE_EXISTS_RUNTIME_HIDES**.

- Standing astronaut source-shell rear clearance: **1.901 m**.
- Head clearance inside uncut source shell: **0.321 m**.
- Current legacy rear clip cuts **0.619 m** into the standing astronaut envelope.

This strengthens the conclusion that the shallow/floating cockpit problem is first a runtime-composition problem, with Blender extension conditional on visual QA.

## Hangar

Legacy semantic staging envelope: **34.188 × 15.494 × 32.235 m**.

Anchor ray evidence:

```json
{
  "bike": {
    "position": [
      -12.24,
      -0.12,
      -3.24
    ],
    "up": 5.896,
    "down": 5.755,
    "left": 2.508,
    "right": 26.916,
    "forward": null,
    "rear": 7.618
  },
  "crew": {
    "position": [
      12.24,
      -0.12,
      -3.24
    ],
    "up": 5.817,
    "down": 7.657,
    "left": 26.988,
    "right": 2.436,
    "forward": null,
    "rear": 5.659
  },
  "longShip": {
    "position": [
      0,
      1.68,
      0
    ],
    "up": null,
    "down": 9.46,
    "left": null,
    "right": null,
    "forward": null,
    "rear": null
  }
}
```

First-person grid enclosed-clearance samples: **20**; observed min/max vertical clearance **5.695 / 13.623 m**.

Null ray results mean the authored bay is open in that direction, which is compatible with adding a lightweight support shell/backdrop rather than assuming a closed room.

## Ring

- Legacy event horizon diameter: **6.8 m**.
- Player ship cross-section evidence: **4.739 × 4.613 m**.
- Single-file clearance: **1.031 m** horizontal per side, **1.093 m** vertical per side.
- Single-file geometric fit: **PASS**.
- A simple two-ship side-by-side formation would need roughly **10.478 m** before cinematic margin; this is evidence, not an approved formation.

## Back-derived Boosted Bike

Preliminary bounding-envelope classification: **BOUNDS_PLAUSIBLE_VISUAL_VERIFY_REQUIRED**.

- Candidate Back raw scale: **0.535×**.
- Candidate add-on envelope: **0.976 × 0.987 × 1.016 m**.
- Approx combined length: **3.864 m**.

Still mandatory before approval:
- rider leg/back clearance
- actual contact silhouette
- first-person rear visibility
- third-person camera
- collision proxy
- central boost nozzle integration

## Next proof

- Render/inspect cockpit shell without legacy rear clipping.
- Produce Hangar first-person camera storyboard against actual service-bay geometry.
- Pick a portal transit formation and verify aperture visually.
- Do the Back/Bike visual overlay/model fit.
