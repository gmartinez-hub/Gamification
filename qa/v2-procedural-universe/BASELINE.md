# Gravedad Zero V2 baseline

- Base branch: `main`
- Base commit: `3ff3ec565f04456ee248f217591f0e26c84283b0`
- Captured before V2 gameplay changes: 2026-07-10
- Existing automated evidence: `qa/gravedad-zero-closing-hardening-local-v3/`
- Existing production baseline: `https://gamification-eta.vercel.app`

## Baseline findings

- Three independent world layers can display celestial bodies simultaneously.
- Hero bodies can overlap each other and the gameplay safe zone.
- Integrated bodies are not counted by the procedural depth director.
- Integrated stage affinity does not gate visibility.
- Transparent sphere intersections produce hard clipping artifacts.
- Companion geometry is volumetric, but the front face still reads as a planar decal.
- QA captures screenshots and telemetry but does not fail on composition invariants.
- Handoff and historical packs are included in the static production artifact.

## Baseline technical state

- Runtime entrypoint: `src/main.js` (7,150 lines)
- Build pipeline: none
- Typecheck/tests/CI: none
- Runtime assets: approximately 101 MB
- Last recorded QA: 18 cases, 0 page errors, 0 failed responses, 5 texture warnings

This baseline intentionally references the existing evidence rather than running a new local visual QA pass.
