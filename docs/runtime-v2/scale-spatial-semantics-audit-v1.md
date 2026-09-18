# Gravedad Zero — Scale & Spatial Semantics Audit V1

Status: **IN PROGRESS — evidence first, exact world dimensions to freeze after measurement**

## Core principle

Raw GLB dimensions are not automatically gameplay/world dimensions.

Several preserved Meshy-derived assets are normalized to a similar largest dimension around ~1.90 m. This is authoring/export scale, not proof of intended fiction scale. V2 therefore separates:

- `authoringBounds` — raw source/model bounds,
- `semanticDimensions` — intended real/game-world dimensions,
- `mountProfile` — host-specific presentation scale where relevant,
- `collisionEnvelope` — gameplay collision representation,
- `cameraEnvelope` — framing/clearance requirements.

No V2 system may infer semantic size directly from a GLB bounding box without a ScaleProfile.

## Canonical human anchor

### GZ-SCALE-001 — Human reference
**APPROVED**

Canonical astronaut standing height: **1.90 m**.

Use this as H = 1.90 m for cross-asset sanity checks.

The current ally source reports ~1.89927 m height, which is useful evidence that the humanoid family is already near the intended human scale.

## Legacy evidence — not automatically canonical

| Asset/behavior | Current evidence | Classification | V2 use |
|---|---:|---|---|
| Astronaut / cabin layout | 1.899 m height reference | MEASURED_REFERENCE | Human anchor ~1.90 m |
| Player modular ship | module root spacing 4.125 m; 3-module composition nominally 12.375 m | MEASURED_REFERENCE | Verify against raw visual bounds before canon |
| Player ship asset scaling | source modules rendered at uniform 2.5 legacy scale | LEGACY_IMPLEMENTATION_ONLY until validated | Do not copy factor blindly |
| Alien ship | current semantic/runtime length 25.7335 m; source comment says 12.86675 m before legacy doubling | MEASURED_REFERENCE + implementation artifact | Preserve only relation 'alien ship > player ship'; exact target to validate |
| Green ally | source manifest 1.53026 × 0.61684 × 1.89927 m | MEASURED_REFERENCE | humanoid scale sanity |
| Modular turret | raw manifest 1.89709 × 0.86977 × 1.15238 m | AUTHORING BOUNDS ONLY | host-specific mount profiles decide world scale |
| Orbital service bay | raw manifest 1.89931 × 1.79081 × 0.86079 m | AUTHORING BOUNDS ONLY | clearly not intended world-space Hangar dimensions |
| Energy cell | raw manifest max dimension ~1.899 m | AUTHORING BOUNDS ONLY | further evidence of source normalization |

The closeout manifest values show why raw Meshy bounds cannot be treated as semantic dimensions: a Hangar, turret, ally and energy cell all land near the same source-scale envelope.

## Approved relative hierarchy

### GZ-SCALE-002 — Size ordering
**APPROVED**

The game must read, at gameplay/cinematic camera distances, as:

`Orbital Hangar >> player/ally modular ship`

`Mothership >> alien ship > player/ally modular ship > bike > humanoid handheld equipment`

The exact ratios are not inferred here.

### GZ-SCALE-003 — Shared modular ship family
**APPROVED**

Player and ally ships use the same module dimensions and assembly rules. Different composition lengths come from installed module count, not arbitrary actor scaling.

### GZ-SCALE-004 — Alien ship
**APPROVED semantic relation / MEASURE exact ratio**

Alien ship must read materially larger than a normal player modular ship.

Current runtime evidence gives ~25.7335 m versus a nominal three-module player composition of ~12.375 m (~2.08×), but this ratio is **evidence**, not frozen until raw-model/camera validation.

### GZ-SCALE-005 — Mothership
**APPROVED semantic relation / PRODUCE exact dimensions**

Mothership must read dramatically larger than the alien ship in establishing and combat shots. Exact dimensions are authored from:
- boss camera composition,
- gem/core readability,
- launcher spacing,
- fleet silhouette,
- performance/LOD feasibility.

### GZ-SCALE-006 — Hangar
**APPROVED semantic relation / MEASURE exact dimensions**

Hangar must visually contain the largest supported player/ally ship composition with **large operational clearance**, not garage-tight clearance.

It also must stage the exact confirmed sortie setup without scale compression.

Raw `orbital-service-bay.glb` bounds are not used directly as world dimensions; the canonical model is rescaled and/or supported by shell geometry.

## ScaleProfile contract

Every spatially relevant semantic asset key gets a ScaleProfile:

```ts
type ScaleProfile = {
  assetKey: string;
  authoringBounds: { width: number; height: number; length: number };
  authoringUnit?: string;
  semanticDimensions?: { width: number; height: number; length: number };
  referenceAnchor?: string;
  targetRelativeTo?: { assetKey: string; relation: string; ratioRange?: [number, number] };
  mountProfiles?: Record<string, {
    semanticScale?: number;
    maxEnvelope?: { width: number; height: number; length: number };
    clearance?: number;
  }>;
  collisionEnvelopeKey?: string;
  cameraEnvelopeKey?: string;
  provenance: string[];
  status: 'MEASURED' | 'APPROVED' | 'PROPOSED';
};
```

Exact serialization may differ; information content is required.

## Measurement pass

For each priority asset measure in a common world-axis convention:

- raw bounding box,
- visual/body bounding box excluding exhaust/VFX,
- pivot/origin,
- forward/up orientation,
- sockets/anchors,
- collision-relevant envelope,
- camera/inspection envelope,
- intended semantic dimensions,
- scale to H = 1.90 m.

Priority:
1. astronaut
2. cockpit
3. bike
4. player ship front/middle/propulsion
5. player full compositions (1, 2, 3 and N-middle samples)
6. alien ship
7. mothership
8. hangar
9. ring/portal
10. turret
11. handheld weapon
12. Nóma
13. ally
14. beacon
15. energy cell

## Host-specific turret scale

### GZ-SCALE-007 — Turret mount profiles
**APPROVED mechanism**

One turret physical family has host presentation profiles:
- `noma`
- `bike`
- `beacon`
- `ship`

The underlying item identity is unchanged. Each profile defines:
- scale/envelope,
- mount clearance,
- camera readability,
- muzzle/socket placement,
- host-specific mount Energy Cell cost.

Do not derive these profiles from the raw 1.897 m authoring bound.

## Cockpit scale tests

- 1.90 m astronaut standing fits without head/shoulder clipping.
- seated pilot proportions match seat/controls.
- standing walk zone has visible architectural boundaries.
- visor sightline and third-person standing camera remain coherent.
- source-vs-runtime clipping is classified before Blender extension.

## Hangar scale tests

- largest supported ship composition reads small enough to establish Hangar scale.
- sortie setup can stage without overlaps.
- first-person eye height ~human scale makes walls/rails/props believable.
- opening/backdrop preserves the impression of a large orbital service bay.
- boarding route fits real vehicle/cockpit anchors.

## Portal scale tests

- ring aperture is derived from the largest supported travelling setup envelope plus cinematic clearance.
- same semantic scale is used in gameplay approach and transit cinematic.
- no shot secretly rescales the ship to fit the ring.

## Camera validation

Scale is accepted only if both:
1. measured geometry satisfies clearance/collision invariants,
2. canonical gameplay/cinematic cameras preserve intended visual hierarchy.

A mathematically larger mothership that does not read larger on camera fails.

## Semantic acceptance tests

- SEM-SCALE-001: human reference resolves to 1.90 m ± approved import tolerance.
- SEM-SCALE-002: raw source normalization never automatically becomes semantic world size.
- SEM-SCALE-003: alien ship reads larger than the normal player ship across combat cameras.
- SEM-SCALE-004: mothership reads dramatically larger than alien ship across boss establishing/combat cameras.
- SEM-SCALE-005: Hangar stages largest supported player setup with large operational clearance.
- SEM-SCALE-006: turret family retains identity across host scale profiles.
- SEM-SCALE-007: cockpit standing/seated proportions remain plausible for 1.90 m astronaut.
- SEM-SCALE-008: portal never requires hidden per-shot ship rescaling.
