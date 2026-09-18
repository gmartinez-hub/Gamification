# Gravedad Zero — Perf Lab and Verification V1

## Reference devices

Required V1 QA references:

- MacBook Air M1 / Safari
- iPhone 16 / Safari / landscape

Safari is the required production QA browser for V1.

## Performance intent

- Desktop: target smooth 60 FPS typical gameplay where practical.
- Mobile: stable gameplay is more important than peak number; 30 FPS is an acceptable lower bound for heavy moments on the reference device.
- Aim/fire/input responsiveness and frame-time consistency take priority over distant HERO quality.

These are experience targets. Exact budgets are measured, not guessed.

## Perf Lab must exist before campaign implementation

The perf lab is a reproducible runtime route/scene using **real optimized assets**, not placeholder cubes only.

It must support seeded stress ramps for:

- player ship composition,
- ally ship,
- Nóma,
- ally,
- bikes,
- beacons,
- turrets,
- hostile aliens,
- hostile ships,
- mothership,
- interactive asteroids,
- decorative instanced asteroids,
- projectiles,
- VFX,
- shadow casters,
- active/warm cells.

## Required telemetry

### Frame
- CPU frame ms
- p50 / p95 / p99
- frames above 16.7 / 22 / 33 ms
- long tasks where available

### Renderer
- draw calls
- triangles
- active materials/program families
- lights
- shadow casters

### Assets
- fetch bytes/time
- decode/preparation time
- texture upload timing where observable
- resident semantic keys
- LOD state

### Simulation
- logical entity count
- represented entity count
- HERO count
- AI/remote update rate
- physics/query time

### Combat
- projectile logical/visible counts
- pooled VFX usage
- engaged/approaching/remote enemy counts
- Threat/Representation Budget

### Streaming
- active/warm/cold cells
- preload time
- unload time
- portal/hangar handoff time

### Run identity
- commit SHA
- manifest hash
- seed
- device/browser
- renderer/backend
- profile/config

## Required sweeps

1. Cell size: 96 / 128 / 160 / 192 / 256 m.
2. Active/preload radius combinations.
3. Entity ramp.
4. 500 / 1000 / 1500+ decorative asteroid instances.
5. Projectile/VFX ramp.
6. Texture residency profiles.
7. Shadow/light budget.
8. World -> Hangar -> World loops.
9. Portal cross-world loops.
10. Death/recovery loops.
11. Sustained iPhone thermal run.
12. Renderer/backend A/B before freeze.

## Verification gates

### PERF-G0 Asset intake
Manifest validates; required LOD/collider/socket artifacts available.

### PERF-G1 Renderer
Chosen Three.js renderer/backend runs benchmark with no blocking visual/context errors.

### PERF-G2 World partition
Multi-cell travel has no hard clamp, unacceptable jitter or state reroll.

### PERF-G3 Remote simulation
Remote actors/deployables continue logically and converge correctly when represented again.

### PERF-G4 Loading boundaries
At least 20 lifecycle loops without monotonic orphaned residency beyond intentional cache.

### PERF-G5 Combat stress
Agreed worst-case combat/boss scenario remains within accepted frame-time behavior on reference devices.

### PERF-G6 Freeze
Only here freeze:
- cell size,
- active/warm radii,
- remote simulation Hz,
- LOD thresholds,
- pool sizes,
- shadow/light budget,
- representation budget.

## Scope protection

If PERF-G5 fails:

1. inspect bottleneck,
2. optimize representation/residency/assets/scheduling,
3. rerun,
4. only reopen product scope by explicit contract decision.

Never silently reduce allies, hordes, second ship, portals, boss, beacons or world traversal.
